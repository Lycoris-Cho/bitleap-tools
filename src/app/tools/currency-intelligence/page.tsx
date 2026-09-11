"use client"

import { CSSProperties, useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type Currency = {
  iso_code: string
  iso_numeric: string | null
  name: string
  symbol: string | null
  start_date: string | null
  end_date: string | null
}

type RateRow = {
  date: string
  base: string
  quote: string
  rate: number
}

type Period = "30D" | "90D" | "1Y" | "5Y"

const API = "https://api.frankfurter.dev/v2"

const PERIOD_DAYS: Record<Period, number> = {
  "30D": 30,
  "90D": 90,
  "1Y": 365,
  "5Y": 365 * 5,
}

const COMMON_CODES = ["CNY", "USD", "EUR", "JPY", "GBP", "HKD", "KRW", "SGD", "AUD", "CAD", "CHF"]

const COMMON_ZH: Record<string, string> = {
  CNY: "人民币",
  USD: "美元",
  EUR: "欧元",
  JPY: "日元",
  GBP: "英镑",
  HKD: "港币",
  KRW: "韩元",
  SGD: "新加坡元",
  AUD: "澳元",
  CAD: "加拿大元",
  CHF: "瑞士法郎",
  NZD: "新西兰元",
  THB: "泰铢",
  MYR: "马来西亚林吉特",
  INR: "印度卢比",
  IDR: "印尼盾",
  PHP: "菲律宾比索",
  SEK: "瑞典克朗",
  NOK: "挪威克朗",
  DKK: "丹麦克朗",
  PLN: "波兰兹罗提",
  CZK: "捷克克朗",
  HUF: "匈牙利福林",
  TRY: "土耳其里拉",
  MXN: "墨西哥比索",
  BRL: "巴西雷亚尔",
  ZAR: "南非兰特",
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function startDateFor(period: Period) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - PERIOD_DAYS[period])
  return isoDate(date)
}

function formatNumber(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits,
  }).format(value)
}

function formatMoney(value: number, code: string, symbol?: string | null) {
  if (!Number.isFinite(value)) return "—"
  const digits = Math.abs(value) >= 1000 ? 0 : Math.abs(value) >= 100 ? 1 : 2
  return `${symbol || ""}${formatNumber(value, digits)}${symbol ? "" : ` ${code}`}`
}

function currencyLabel(currency?: Currency) {
  if (!currency) return ""
  return COMMON_ZH[currency.iso_code] || currency.name || currency.iso_code
}

function chartPoints(rows: RateRow[]) {
  if (!rows.length) return { line: "", area: "", min: 0, max: 0 }
  const values = rows.map((row) => row.rate)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const spread = Math.max(0.0000001, max - min)
  const points = rows.map((row, index) => {
    const x = rows.length === 1 ? 50 : 4 + (index / (rows.length - 1)) * 92
    const y = 80 - ((row.rate - min) / spread) * 60
    return { x, y }
  })
  const line = points.map((point) => `${point.x},${point.y}`).join(" ")
  const area = `${points[0].x},92 ${line} ${points[points.length - 1].x},92`
  return { line, area, min, max }
}

function daysAgoLabel(date: string) {
  const target = Date.parse(`${date}T00:00:00Z`)
  const now = Date.now()
  const days = Math.max(0, Math.floor((now - target) / 86400000))
  if (days <= 1) return "最新工作日"
  return `${days} 天前`
}

function downloadCsv(base: string, quote: string, rows: RateRow[]) {
  const lines = ["date,base,quote,rate", ...rows.map((row) => `${row.date},${row.base},${row.quote},${row.rate}`)]
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `${base}-${quote}-rates.csv`
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 500)
}

export default function CurrencyIntelligencePage() {
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [base, setBase] = useState("CNY")
  const [quote, setQuote] = useState("JPY")
  const [amount, setAmount] = useState(10000)
  const [rate, setRate] = useState<RateRow | null>(null)
  const [history, setHistory] = useState<RateRow[]>([])
  const [period, setPeriod] = useState<Period>("90D")
  const [spreadFee, setSpreadFee] = useState(1.2)
  const [fixedFee, setFixedFee] = useState(0)
  const [quickRates, setQuickRates] = useState<RateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error, setError] = useState("")
  const [animatedResult, setAnimatedResult] = useState(0)

  const pageRef = useRef<HTMLElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<SVGPolylineElement>(null)
  const swapRef = useRef<HTMLButtonElement>(null)
  const animationValueRef = useRef({ value: 0 })

  const baseCurrency = useMemo(() => currencies.find((item) => item.iso_code === base), [currencies, base])
  const quoteCurrency = useMemo(() => currencies.find((item) => item.iso_code === quote), [currencies, quote])

  const converted = amount * (rate?.rate || 0)
  const feeAdjusted = Math.max(0, amount - fixedFee) * (1 - spreadFee / 100) * (rate?.rate || 0)
  const feeCost = Math.max(0, converted - feeAdjusted)

  const stats = useMemo(() => {
    if (!history.length) return null
    const values = history.map((row) => row.rate)
    const current = values[values.length - 1]
    const first = values[0]
    const average = values.reduce((sum, value) => sum + value, 0) / values.length
    const min = Math.min(...values)
    const max = Math.max(...values)
    const change = first ? ((current - first) / first) * 100 : 0
    const percentile = max === min ? 50 : ((current - min) / (max - min)) * 100
    return { current, first, average, min, max, change, percentile }
  }, [history])

  const chart = useMemo(() => chartPoints(history), [history])

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced || !pageRef.current) return
    const ctx = gsap.context(() => {
      gsap.from(".fx-intro", {
        y: 22,
        opacity: 0,
        duration: 0.85,
        stagger: 0.07,
        ease: "power3.out",
      })
      gsap.to(".fx-orbit-a", {
        rotation: 360,
        duration: 46,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })
      gsap.to(".fx-orbit-b", {
        rotation: -360,
        duration: 68,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })
    }, pageRef)
    return () => ctx.revert()
  }, [])

  useEffect(() => {
    let alive = true
    async function loadCurrencies() {
      try {
        const response = await fetch(`${API}/currencies`)
        if (!response.ok) throw new Error("currency")
        const data: Currency[] = await response.json()
        if (alive) setCurrencies(data.filter((item) => item.iso_code))
      } catch {
        if (alive) {
          setCurrencies(
            COMMON_CODES.map((code) => ({
              iso_code: code,
              iso_numeric: null,
              name: COMMON_ZH[code] || code,
              symbol: code === "CNY" ? "¥" : code === "USD" ? "$" : code === "EUR" ? "€" : code === "JPY" ? "¥" : null,
              start_date: null,
              end_date: null,
            })),
          )
        }
      }
    }
    loadCurrencies()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    async function loadRateAndBoard() {
      setLoading(true)
      setError("")
      try {
        const boardQuotes = COMMON_CODES.filter((code) => code !== base).slice(0, 9).join(",")
        const [pairResponse, boardResponse] = await Promise.all([
          fetch(`${API}/rate/${base}/${quote}`),
          fetch(`${API}/rates?base=${base}&quotes=${boardQuotes}`),
        ])
        if (!pairResponse.ok) throw new Error("pair")
        const pairData: RateRow = await pairResponse.json()
        const boardData: RateRow[] = boardResponse.ok ? await boardResponse.json() : []
        if (!alive) return
        setRate(pairData)
        setQuickRates(boardData.filter((row) => row.quote !== base))
      } catch {
        if (alive) setError("暂时无法获取最新汇率，请稍后重试。")
      } finally {
        if (alive) setLoading(false)
      }
    }
    loadRateAndBoard()
    return () => {
      alive = false
    }
  }, [base, quote])

  useEffect(() => {
    let alive = true
    async function loadHistory() {
      setHistoryLoading(true)
      try {
        const from = startDateFor(period)
        const group = period === "5Y" ? "&group=week" : ""
        const response = await fetch(`${API}/rates?base=${base}&quotes=${quote}&from=${from}${group}`)
        if (!response.ok) throw new Error("history")
        const data: RateRow[] = await response.json()
        const rows = data.filter((row) => row.quote === quote && row.base === base).sort((a, b) => a.date.localeCompare(b.date))
        if (alive) setHistory(rows)
      } catch {
        if (alive) setHistory([])
      } finally {
        if (alive) setHistoryLoading(false)
      }
    }
    loadHistory()
    return () => {
      alive = false
    }
  }, [base, quote, period])

  useEffect(() => {
    const target = converted
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced) {
      setAnimatedResult(target)
      animationValueRef.current.value = target
      return
    }
    gsap.killTweensOf(animationValueRef.current)
    gsap.to(animationValueRef.current, {
      value: target,
      duration: 0.7,
      ease: "power3.out",
      onUpdate: () => setAnimatedResult(animationValueRef.current.value),
    })
  }, [converted])

  useEffect(() => {
    if (!chartRef.current || !history.length) return
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced) return
    const length = chartRef.current.getTotalLength()
    gsap.fromTo(
      chartRef.current,
      { strokeDasharray: length, strokeDashoffset: length },
      { strokeDashoffset: 0, duration: 1.15, ease: "power2.inOut" },
    )
    gsap.fromTo(".fx-stat", { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.045, ease: "power2.out" })
  }, [history])

  const swap = () => {
    const nextBase = quote
    const nextQuote = base
    if (swapRef.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.fromTo(swapRef.current, { rotation: 0 }, { rotation: 180, duration: 0.48, ease: "power3.inOut" })
      if (resultRef.current) {
        gsap.fromTo(resultRef.current, { y: 8, opacity: 0.45 }, { y: 0, opacity: 1, duration: 0.45, ease: "power2.out" })
      }
    }
    setBase(nextBase)
    setQuote(nextQuote)
  }

  const makeCurrencyOptions = (exclude: string) =>
    currencies
      .filter((currency) => currency.iso_code !== exclude)
      .sort((a, b) => {
        const ai = COMMON_CODES.indexOf(a.iso_code)
        const bi = COMMON_CODES.indexOf(b.iso_code)
        if (ai >= 0 && bi < 0) return -1
        if (bi >= 0 && ai < 0) return 1
        if (ai >= 0 && bi >= 0) return ai - bi
        return a.iso_code.localeCompare(b.iso_code)
      })

  return (
    <main ref={pageRef} className="min-h-screen overflow-hidden bg-[#11120f] text-[#f2f0e7]">
      <style>{`
        .fx-range { accent-color: #e8dcae; }
        .fx-scroll::-webkit-scrollbar { height: 4px; width: 4px; }
        .fx-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.15); }
        .fx-number { font-variant-numeric: tabular-nums lining-nums; }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_18%,rgba(211,194,137,.12),transparent_29%),radial-gradient(circle_at_12%_82%,rgba(117,150,133,.09),transparent_32%)]" />
        <div className="fx-orbit-a absolute right-[-12vw] top-[-16vw] h-[52vw] w-[52vw] rounded-full border border-white/[0.055]">
          <span className="absolute left-[11%] top-1/2 h-2 w-2 rounded-full bg-[#e5d69e]/55 shadow-[0_0_30px_rgba(229,214,158,.4)]" />
        </div>
        <div className="fx-orbit-b absolute bottom-[-22vw] left-[-14vw] h-[46vw] w-[46vw] rounded-full border border-white/[0.04]">
          <span className="absolute right-[16%] top-[25%] h-1.5 w-1.5 rounded-full bg-[#91ad9c]/60" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1540px] px-4 pb-8 pt-6 sm:px-7 lg:px-9">
        <div className="fx-intro flex items-center justify-between gap-4">
          <Breadcrumb />
          <div className="hidden items-center gap-2 text-[9px] tracking-[.12em] text-white/28 sm:flex">
            <span className={`h-1.5 w-1.5 rounded-full ${error ? "bg-[#bb7767]" : "bg-[#809a83]"}`} />
            FRANKFURTER V2 · CENTRAL BANK DATA
          </div>
        </div>

        <section className="mt-9 min-h-[560px]">
          <div className="fx-intro flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="text-[10px] font-medium tracking-[.18em] text-white/28">汇率观测台</div>
              <h1 className="mt-2 text-[clamp(29px,4vw,48px)] font-semibold tracking-[-.05em]">汇率换算器-汇率的上下文。</h1>
            </div>
            <div className="max-w-sm text-right text-[10px] leading-5 text-white/28">
              参考汇率来自多家中央银行。适合旅行预算、跨币种估算和历史观察，不用于高频交易报价。
            </div>
          </div>

          <div className="mt-[8vh] lg:mt-[11vh]">
            <div className="fx-intro grid items-end gap-4 lg:grid-cols-[minmax(0,1fr)_72px_minmax(0,1fr)]">
              <div className="border-b border-white/12 pb-4">
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    value={amount}
                    onChange={(event) => setAmount(Math.max(0, Number(event.target.value) || 0))}
                    className="fx-number min-w-0 flex-1 bg-transparent text-[clamp(48px,8vw,104px)] font-medium leading-none tracking-[-.075em] outline-none"
                    aria-label="换算金额"
                  />
                  <select
                    value={base}
                    onChange={(event) => setBase(event.target.value)}
                    className="bg-[#11120f] text-lg font-semibold outline-none sm:text-2xl"
                    aria-label="基础货币"
                  >
                    {makeCurrencyOptions(quote).map((currency) => (
                      <option key={currency.iso_code} value={currency.iso_code}>{currency.iso_code}</option>
                    ))}
                  </select>
                </div>
                <div className="mt-4 flex items-center justify-between text-[10px] text-white/28">
                  <span>{currencyLabel(baseCurrency)}</span>
                  <span>{baseCurrency?.symbol ? `符号 ${baseCurrency.symbol}` : "BASE CURRENCY"}</span>
                </div>
              </div>

              <button
                ref={swapRef}
                type="button"
                onClick={swap}
                className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/12 text-white/48 transition hover:border-white/30 hover:text-white lg:mb-5"
                aria-label="交换货币"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M7 7h11m0 0-3-3m3 3-3 3M17 17H6m0 0 3 3m-3-3 3-3" />
                </svg>
              </button>

              <div ref={resultRef} className="border-b border-white/12 pb-4">
                <div className="flex items-center gap-3">
                  <div className="fx-number min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(48px,8vw,104px)] font-medium leading-none tracking-[-.075em]">
                    {loading ? "…" : formatNumber(animatedResult, Math.abs(animatedResult) < 100 ? 2 : 0)}
                  </div>
                  <select
                    value={quote}
                    onChange={(event) => setQuote(event.target.value)}
                    className="bg-[#11120f] text-lg font-semibold outline-none sm:text-2xl"
                    aria-label="目标货币"
                  >
                    {makeCurrencyOptions(base).map((currency) => (
                      <option key={currency.iso_code} value={currency.iso_code}>{currency.iso_code}</option>
                    ))}
                  </select>
                </div>
                <div className="mt-4 flex items-center justify-between text-[10px] text-white/28">
                  <span>{currencyLabel(quoteCurrency)}</span>
                  <span>{rate ? `1 ${base} = ${formatNumber(rate.rate, 6)} ${quote}` : "正在获取参考汇率"}</span>
                </div>
              </div>
            </div>

            {error && <div className="mt-4 text-[10px] text-[#d58a77]">{error}</div>}
          </div>
        </section>

        <section className="fx-intro border-t border-white/10 pt-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[10px] font-medium tracking-[.16em] text-white/28">历史位置</div>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <h2 className="text-2xl font-semibold tracking-[-.04em]">{base} / {quote}</h2>
                <span className={`text-xs font-medium ${stats && stats.change >= 0 ? "text-[#91b19b]" : "text-[#d08a77]"}`}>
                  {stats ? `${stats.change >= 0 ? "+" : ""}${stats.change.toFixed(2)}%` : "—"}
                </span>
                <span className="text-[9px] text-white/24">{rate ? `${rate.date} · ${daysAgoLabel(rate.date)}` : ""}</span>
              </div>
            </div>

            <div className="flex gap-1">
              {(Object.keys(PERIOD_DAYS) as Period[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPeriod(item)}
                  className={`rounded-full px-3 py-2 text-[9px] font-medium transition ${period === item ? "bg-[#f0eee5] text-[#171814]" : "text-white/30 hover:bg-white/[.06] hover:text-white/65"}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="relative mt-5 h-[330px] sm:h-[410px]">
            {historyLoading && <div className="absolute inset-0 z-10 flex items-center justify-center text-[10px] tracking-[.12em] text-white/28">正在读取历史汇率…</div>}
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
              <defs>
                <linearGradient id="fxArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d9c98d" stopOpacity=".16" />
                  <stop offset="100%" stopColor="#d9c98d" stopOpacity="0" />
                </linearGradient>
              </defs>
              <line x1="4" x2="96" y1="20" y2="20" stroke="rgba(255,255,255,.055)" strokeWidth=".25" />
              <line x1="4" x2="96" y1="50" y2="50" stroke="rgba(255,255,255,.055)" strokeWidth=".25" />
              <line x1="4" x2="96" y1="80" y2="80" stroke="rgba(255,255,255,.055)" strokeWidth=".25" />
              {chart.area && <polygon points={chart.area} fill="url(#fxArea)" />}
              {chart.line && <polyline ref={chartRef} points={chart.line} fill="none" stroke="#e3d59f" strokeWidth=".7" vectorEffect="non-scaling-stroke" />}
            </svg>

            {history.length > 1 && (
              <>
                <div className="absolute bottom-2 left-[4%] text-[9px] text-white/22">{history[0].date}</div>
                <div className="absolute bottom-2 right-[4%] text-[9px] text-white/22">{history[history.length - 1].date}</div>
                <div className="absolute right-[4%] top-[15%] text-[9px] text-white/22">高 {formatNumber(chart.max, 5)}</div>
                <div className="absolute bottom-[17%] right-[4%] text-[9px] text-white/22">低 {formatNumber(chart.min, 5)}</div>
              </>
            )}
          </div>

          <div className="grid gap-px overflow-hidden rounded-2xl bg-white/[.07] sm:grid-cols-4">
            {[
              ["当前", stats ? formatNumber(stats.current, 6) : "—"],
              ["区间平均", stats ? formatNumber(stats.average, 6) : "—"],
              ["区间位置", stats ? `${Math.round(stats.percentile)}%` : "—"],
              ["波动区间", stats ? `${formatNumber(stats.min, 5)} — ${formatNumber(stats.max, 5)}` : "—"],
            ].map(([label, value]) => (
              <div key={label} className="fx-stat bg-[#151612] px-4 py-4">
                <div className="text-[9px] text-white/25">{label}</div>
                <div className="fx-number mt-2 text-sm font-semibold text-white/72">{value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 border-t border-white/10 pt-7">
          <div className="grid gap-9 lg:grid-cols-[1.15fr_.85fr]">
            <div>
              <div className="text-[10px] font-medium tracking-[.16em] text-white/28">实际换汇成本</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-.04em]">别只看牌价。</h2>
              <p className="mt-3 max-w-lg text-[10px] leading-5 text-white/28">银行卡、支付平台和兑换点通常会加入汇差或固定手续费。这里把“参考汇率”和“实际到账”拆开。</p>

              <div className="mt-7 grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <div className="flex items-center justify-between text-[10px] text-white/36"><span>汇差 / 加价</span><span className="fx-number">{spreadFee.toFixed(1)}%</span></div>
                  <input className="fx-range mt-3 w-full" type="range" min="0" max="8" step=".1" value={spreadFee} onChange={(event) => setSpreadFee(Number(event.target.value))} />
                </label>
                <label className="block">
                  <div className="flex items-center justify-between text-[10px] text-white/36"><span>固定手续费（{base}）</span><span className="fx-number">{formatNumber(fixedFee, 2)}</span></div>
                  <input className="fx-range mt-3 w-full" type="range" min="0" max={Math.max(100, amount * .05)} step="1" value={fixedFee} onChange={(event) => setFixedFee(Number(event.target.value))} />
                </label>
              </div>
            </div>

            <div className="rounded-[26px] border border-white/[.08] bg-white/[.035] p-5 sm:p-6">
              <div className="text-[9px] tracking-[.13em] text-white/24">ESTIMATED RECEIPT</div>
              <div className="fx-number mt-4 text-[clamp(34px,5vw,58px)] font-medium tracking-[-.06em]">
                {formatMoney(feeAdjusted, quote, quoteCurrency?.symbol)}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/8 pt-4">
                <div><div className="text-[9px] text-white/23">理论换算</div><div className="fx-number mt-1 text-xs text-white/58">{formatMoney(converted, quote, quoteCurrency?.symbol)}</div></div>
                <div><div className="text-[9px] text-white/23">成本差额</div><div className="fx-number mt-1 text-xs text-[#d69a82]">-{formatMoney(feeCost, quote, quoteCurrency?.symbol)}</div></div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12 border-t border-white/10 pt-7">
          <div className="flex items-end justify-between gap-4">
            <div><div className="text-[10px] font-medium tracking-[.16em] text-white/28">多币种视野</div><h2 className="mt-2 text-xl font-semibold tracking-[-.035em]">1 {base} 今天能换多少。</h2></div>
            <button type="button" onClick={() => downloadCsv(base, quote, history)} disabled={!history.length} className="rounded-full border border-white/10 px-4 py-2 text-[9px] text-white/36 transition hover:text-white disabled:opacity-30">导出历史 CSV</button>
          </div>

          <div className="fx-scroll mt-5 flex gap-2 overflow-x-auto pb-2">
            {quickRates.map((row) => {
              const currency = currencies.find((item) => item.iso_code === row.quote)
              return (
                <button key={row.quote} type="button" onClick={() => setQuote(row.quote)} className={`min-w-[155px] rounded-2xl border p-4 text-left transition ${quote === row.quote ? "border-[#d7ca9b]/38 bg-[#d7ca9b]/[.07]" : "border-white/[.07] bg-white/[.025] hover:border-white/15"}`}>
                  <div className="flex items-center justify-between"><b className="text-xs">{row.quote}</b><span className="text-[9px] text-white/20">{currencyLabel(currency)}</span></div>
                  <div className="fx-number mt-5 text-lg font-semibold">{formatNumber(row.rate, row.rate < 10 ? 4 : 2)}</div>
                  <div className="mt-1 text-[9px] text-white/23">{row.date}</div>
                </button>
              )
            })}
          </div>
        </section>

        <div className="mt-12 border-t border-white/10 pt-5 text-[9px] leading-5 text-white/22">
          数据来自 Frankfurter v2。其公开 API 无需 API Key；默认汇率会综合多个中央银行来源。参考汇率不等同于银行、信用卡或现金兑换点的最终成交价。
        </div>

        <div className="mt-5 border-t border-white/[.06] pt-5">
          <FooterNote />
        </div>
      </div>
    </main>
  )
}
