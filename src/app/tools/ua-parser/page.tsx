"use client"

import type { ChangeEvent, ReactNode } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type DeviceType = "Desktop" | "Mobile" | "Tablet" | "Bot" | "TV" | "Console" | "Unknown"
type CopyKey = "json" | "snippet" | "report" | "ua" | null

type UaResult = {
  browser: string
  browserVersion: string
  engine: string
  engineVersion: string
  os: string
  osVersion: string
  device: DeviceType
  vendor: string
  model: string
  architecture: string
  isMobile: boolean
  isTablet: boolean
  isBot: boolean
  isWebView: boolean
  isTouchLikely: boolean
  confidence: number
  warnings: string[]
  tokens: Array<{ label: string; value: string }>
}

type HistoryItem = {
  id: string
  label: string
  ua: string
  browser: string
  os: string
  device: DeviceType
  time: string
}

const STORAGE_KEY = "bitleap-ua-parser-studio-v2"
const MAX_HISTORY = 8

const SAMPLE_UA = [
  {
    label: "Chrome macOS",
    value:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  },
  {
    label: "Safari iPhone",
    value:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  },
  {
    label: "Edge Windows",
    value:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0",
  },
  {
    label: "Android WebView",
    value:
      "Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP1A.240505.004; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/125.0.6422.165 Mobile Safari/537.36",
  },
  {
    label: "Googlebot",
    value:
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  },
]

const BROWSER_RULES: Array<{ name: string; regex: RegExp; versionGroup?: number }> = [
  { name: "Microsoft Edge", regex: /\bEdgA?\/([\d.]+)/ },
  { name: "Opera", regex: /\b(?:OPR|Opera)\/([\d.]+)/ },
  { name: "Samsung Internet", regex: /\bSamsungBrowser\/([\d.]+)/ },
  { name: "Firefox iOS", regex: /\bFxiOS\/([\d.]+)/ },
  { name: "Chrome iOS", regex: /\bCriOS\/([\d.]+)/ },
  { name: "Firefox", regex: /\bFirefox\/([\d.]+)/ },
  { name: "QQ Browser", regex: /\bMQQBrowser\/([\d.]+)/ },
  { name: "UC Browser", regex: /\bUCBrowser\/([\d.]+)/ },
  { name: "WeChat WebView", regex: /\bMicroMessenger\/([\d.]+)/ },
  { name: "Chrome", regex: /\bChrome\/([\d.]+)/ },
  { name: "Safari", regex: /\bVersion\/([\d.]+).*Safari\// },
  { name: "Internet Explorer", regex: /\bMSIE\s([\d.]+)|\bTrident\/.*rv:([\d.]+)/, versionGroup: 1 },
]

const BOT_RULES = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /slurp/i,
  /bingpreview/i,
  /duckduckbot/i,
  /baiduspider/i,
  /yandex/i,
  /semrush/i,
  /ahrefs/i,
]

function cleanVersion(value = "") {
  return value.replace(/_/g, ".")
}

function pickVersion(match: RegExpMatchArray | null, fallback = "") {
  if (!match) return fallback
  return match[1] || match[2] || fallback
}

function versionMajor(version: string) {
  const major = Number(version.split(".")[0])
  return Number.isFinite(major) ? major : null
}

function parseBrowser(ua: string) {
  for (const rule of BROWSER_RULES) {
    const match = ua.match(rule.regex)
    if (!match) continue
    const version = rule.versionGroup ? match[rule.versionGroup] || match[2] || "" : pickVersion(match)
    return { browser: rule.name, browserVersion: cleanVersion(version) }
  }
  return { browser: "Unknown", browserVersion: "" }
}

function parseEngine(ua: string) {
  const appleWebkit = ua.match(/AppleWebKit\/([\d.]+)/)
  const gecko = ua.match(/Gecko\/([\d.]+)/)
  const blink = ua.match(/Chrome\/([\d.]+)/)
  const trident = ua.match(/Trident\/([\d.]+)/)

  if (trident) return { engine: "Trident", engineVersion: trident[1] }
  if (blink && !/Version\/[\d.]+.*Safari/.test(ua)) return { engine: "Blink", engineVersion: blink[1] }
  if (appleWebkit) return { engine: "WebKit", engineVersion: appleWebkit[1] }
  if (gecko && /Firefox\//.test(ua)) return { engine: "Gecko", engineVersion: gecko[1] }
  return { engine: "Unknown", engineVersion: "" }
}

function parseOS(ua: string) {
  const windows = ua.match(/Windows NT ([\d.]+)/)
  if (windows) {
    const map: Record<string, string> = {
      "10.0": "10 / 11",
      "6.3": "8.1",
      "6.2": "8",
      "6.1": "7",
      "6.0": "Vista",
      "5.1": "XP",
    }
    return { os: "Windows", osVersion: map[windows[1]] || windows[1] }
  }

  const android = ua.match(/Android\s([\d.]+)/)
  if (android) return { os: "Android", osVersion: cleanVersion(android[1]) }

  const ios = ua.match(/(?:iPhone|iPad|iPod).*OS\s([\d_]+)/)
  if (ios) return { os: "iOS", osVersion: cleanVersion(ios[1]) }

  const mac = ua.match(/Mac OS X\s([\d_.]+)/)
  if (mac) return { os: "macOS", osVersion: cleanVersion(mac[1]) }

  const chromeOS = ua.match(/CrOS\s[^ ]+\s([\d.]+)/)
  if (chromeOS) return { os: "ChromeOS", osVersion: chromeOS[1] }

  if (/Linux/i.test(ua)) return { os: "Linux", osVersion: "" }
  return { os: "Unknown", osVersion: "" }
}

function parseDevice(ua: string, os: string) {
  const isBot = BOT_RULES.some((rule) => rule.test(ua))
  const isTablet = /iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))
  const isMobile = /Mobi|iPhone|iPod|Android.*Mobile|Windows Phone|IEMobile|Opera Mini/i.test(ua)
  const isTV = /SmartTV|AppleTV|GoogleTV|HbbTV|NetCast|Tizen TV|Web0S|WebOS.TV/i.test(ua)
  const isConsole = /PlayStation|Xbox|Nintendo/i.test(ua)
  const isWebView = /\bwv\b|Version\/4\.0 Chrome\/|; wv\)/i.test(ua) || (/MicroMessenger|FBAN|FBAV|Instagram/i.test(ua) && /Mobile|Android|iPhone/i.test(ua))
  const androidModel = ua.match(/Android [^;]+;\s?([^;)]+?)(?:\sBuild|;|\))/)
  const iosModel = ua.match(/\((iPhone|iPad|iPod);/)
  const vendor = /SamsungBrowser/i.test(ua) ? "Samsung" : /Huawei|HUAWEI/i.test(ua) ? "Huawei" : /Pixel/i.test(ua) ? "Google" : /iPhone|iPad|Macintosh/i.test(ua) ? "Apple" : /Windows/i.test(ua) ? "Microsoft" : "Unknown"

  let device: DeviceType = "Desktop"
  if (isBot) device = "Bot"
  else if (isTV) device = "TV"
  else if (isConsole) device = "Console"
  else if (isTablet) device = "Tablet"
  else if (isMobile) device = "Mobile"
  else if (os === "Unknown") device = "Unknown"

  return {
    device,
    vendor,
    model: cleanVersion(iosModel?.[1] || androidModel?.[1]?.trim() || ""),
    isMobile: isMobile || isTablet,
    isTablet,
    isBot,
    isWebView,
    isTouchLikely: isMobile || isTablet || /Touch/i.test(ua),
  }
}

function parseArchitecture(ua: string) {
  if (/arm64|aarch64/i.test(ua)) return "ARM64"
  if (/armv7|arm/i.test(ua)) return "ARM"
  if (/WOW64|Win64|x64|x86_64|amd64/i.test(ua)) return "x64"
  if (/i686|i386|x86/i.test(ua)) return "x86"
  return "Unknown"
}

function tokenizeUA(ua: string) {
  const tokens: Array<{ label: string; value: string }> = []
  const first = ua.match(/^([^\s]+)\s?/)
  if (first) tokens.push({ label: "Product", value: first[1] })

  const comments = [...ua.matchAll(/\(([^)]+)\)/g)].map((item) => item[1])
  comments.forEach((comment, index) => tokens.push({ label: `Comment ${index + 1}`, value: comment }))

  const products = [...ua.matchAll(/([A-Za-z][A-Za-z0-9._-]+)\/([\w.]+)/g)]
  products.forEach((item) => tokens.push({ label: item[1], value: item[2] }))

  return tokens.slice(0, 18)
}

function parseUA(ua: string): UaResult {
  const source = ua.trim()
  const { browser, browserVersion } = parseBrowser(source)
  const { engine, engineVersion } = parseEngine(source)
  const { os, osVersion } = parseOS(source)
  const deviceInfo = parseDevice(source, os)
  const architecture = parseArchitecture(source)
  const warnings: string[] = []

  if (!source) warnings.push("UA 为空。")
  if (browser === "Unknown") warnings.push("未识别到明确浏览器标识，可能是自定义客户端或爬虫。")
  if (deviceInfo.isWebView) warnings.push("检测到 WebView / App 内置浏览器特征，部分浏览器信息可能由宿主 App 修改。")
  if (/Chrome\//.test(source) && /Safari\//.test(source) && browser === "Safari") warnings.push("UA 同时包含 Chrome/Safari 片段，请确认是否为伪装 UA。")
  if (deviceInfo.isBot) warnings.push("检测到爬虫 / Bot 特征。")

  const confidenceParts = [
    browser === "Unknown" ? 0 : 25,
    os === "Unknown" ? 0 : 22,
    deviceInfo.device === "Unknown" ? 0 : 18,
    engine === "Unknown" ? 0 : 15,
    browserVersion ? 10 : 0,
    warnings.length ? Math.max(0, 10 - warnings.length * 3) : 10,
  ]
  const confidence = confidenceParts.reduce((sum, item) => sum + item, 0)

  return {
    browser,
    browserVersion,
    engine,
    engineVersion,
    os,
    osVersion,
    device: deviceInfo.device,
    vendor: deviceInfo.vendor,
    model: deviceInfo.model,
    architecture,
    isMobile: deviceInfo.isMobile,
    isTablet: deviceInfo.isTablet,
    isBot: deviceInfo.isBot,
    isWebView: deviceInfo.isWebView,
    isTouchLikely: deviceInfo.isTouchLikely,
    confidence,
    warnings,
    tokens: tokenizeUA(source),
  }
}

function resultLabel(result: UaResult | null) {
  if (!result) return "等待解析"
  const pieces = [result.browser, result.browserVersion && versionMajor(result.browserVersion) ? versionMajor(result.browserVersion) : "", "·", result.os, result.osVersion]
  return pieces.filter(Boolean).join(" ")
}

function buildReport(ua: string, result: UaResult | null) {
  if (!result) return "No User-Agent parsed."

  return [
    "BitLeap UA Parser Report",
    "",
    "Raw User-Agent:",
    ua.trim(),
    "",
    "Summary:",
    `${result.browser} ${result.browserVersion}`,
    `${result.os} ${result.osVersion}`,
    `${result.device} · ${result.vendor} · ${result.architecture}`,
    "",
    "Flags:",
    `Mobile: ${result.isMobile}`,
    `Tablet: ${result.isTablet}`,
    `Bot: ${result.isBot}`,
    `WebView: ${result.isWebView}`,
    `Touch likely: ${result.isTouchLikely}`,
    "",
    "JSON:",
    JSON.stringify(result, null, 2),
  ].join("\n")
}

function buildSnippet(result: UaResult | null) {
  if (!result) return ""

  return [
    "const client = {",
    `  browser: '${result.browser}',`,
    `  browserVersion: '${result.browserVersion}',`,
    `  engine: '${result.engine}',`,
    `  os: '${result.os}',`,
    `  osVersion: '${result.osVersion}',`,
    `  device: '${result.device}',`,
    `  isMobile: ${result.isMobile},`,
    `  isTablet: ${result.isTablet},`,
    `  isBot: ${result.isBot},`,
    `  isWebView: ${result.isWebView},`,
    "}",
  ].join("\n")
}

function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 500)
}

function Badge({
  children,
  tone = "default",
}: {
  children: ReactNode
  tone?: "default" | "green" | "amber" | "rose" | "sky"
}) {
  const toneClass =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : tone === "rose"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : tone === "sky"
            ? "border-sky-200 bg-sky-50 text-sky-700"
            : "border-black/[0.08] bg-white/60 text-zinc-600"

  return <span className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-semibold ${toneClass}`}>{children}</span>
}

function PillButton({
  active,
  children,
  onClick,
}: {
  active?: boolean
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} className={`rounded-full border px-3.5 py-2 text-[10px] font-semibold transition ${active ? "border-zinc-950 bg-zinc-950 text-white" : "border-black/[0.08] bg-white/55 text-zinc-500 hover:border-zinc-300 hover:bg-white hover:text-zinc-950"}`}>
      {children}
    </button>
  )
}

function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string
  value: string
  hint?: string
  tone?: "default" | "green" | "amber" | "rose"
}) {
  const toneClass = tone === "green" ? "text-emerald-700" : tone === "amber" ? "text-amber-700" : tone === "rose" ? "text-rose-700" : "text-zinc-950"

  return (
    <div className="rounded-[22px] border border-black/[0.06] bg-white/62 p-4 shadow-[0_18px_55px_-48px_rgba(35,28,18,.36)]">
      <div className="text-[8px] font-semibold uppercase tracking-[0.18em] text-zinc-400">{label}</div>
      <div className={`ua-num mt-3 truncate font-mono text-lg font-semibold tracking-[-0.03em] ${toneClass}`}>{value || "—"}</div>
      {hint && <div className="mt-1 text-[10px] leading-4 text-zinc-400">{hint}</div>}
    </div>
  )
}

function OutputPanel({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string
  value: string
  copied: boolean
  onCopy: () => void
}) {
  return (
    <article className="border-t border-white/[0.08] py-4 first:border-t-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[8px] font-semibold uppercase tracking-[0.18em] text-white/28">{label}</span>
        <button type="button" onClick={onCopy} className="rounded-full border border-white/[0.1] px-3 py-1.5 text-[9px] font-semibold text-white/45 transition hover:bg-white/[0.08] hover:text-white">{copied ? "已复制" : "复制"}</button>
      </div>
      <pre className="ua-scroll max-h-64 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-5 text-emerald-100/82">{value || "等待解析"}</pre>
    </article>
  )
}

export default function UAParserPage() {
  const pageRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [uaText, setUaText] = useState("")
  const [result, setResult] = useState<UaResult | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [autoParse, setAutoParse] = useState(true)
  const [copied, setCopied] = useState<CopyKey>(null)
  const [message, setMessage] = useState("")

  const jsonOutput = useMemo(() => (result ? JSON.stringify(result, null, 2) : ""), [result])
  const snippet = useMemo(() => buildSnippet(result), [result])
  const report = useMemo(() => buildReport(uaText, result), [result, uaText])
  const parsedSummary = useMemo(() => resultLabel(result), [result])
  const confidenceTone = result && result.confidence >= 78 ? "green" : result && result.confidence >= 52 ? "amber" : "rose"

  const saveHistory = useCallback((ua: string, parsed: UaResult) => {
    const item: HistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: `${parsed.browser} · ${parsed.os}`,
      ua,
      browser: parsed.browser,
      os: parsed.os,
      device: parsed.device,
      time: new Date().toISOString(),
    }

    setHistory((current) => {
      const next = [item, ...current.filter((entry) => entry.ua !== ua)].slice(0, MAX_HISTORY)
      try {
        window.localStorage.setItem(`${STORAGE_KEY}:history`, JSON.stringify(next))
      } catch {}
      return next
    })
  }, [])

  const handleParse = useCallback(
    (save = true) => {
      const trimmed = uaText.trim()
      if (!trimmed) {
        setResult(null)
        setMessage("请先粘贴 User-Agent 字符串。")
        return
      }

      const parsed = parseUA(trimmed)
      setResult(parsed)
      setMessage(parsed.warnings[0] ?? "解析完成。")
      if (save) saveHistory(trimmed, parsed)
    },
    [saveHistory, uaText],
  )

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(`${STORAGE_KEY}:last`)
      const savedAuto = window.localStorage.getItem(`${STORAGE_KEY}:auto`)
      const savedHistory = window.localStorage.getItem(`${STORAGE_KEY}:history`)
      if (saved) setUaText(saved)
      if (savedAuto === "0") setAutoParse(false)
      if (savedHistory) setHistory(JSON.parse(savedHistory) as HistoryItem[])
    } catch {}
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(`${STORAGE_KEY}:last`, uaText)
      window.localStorage.setItem(`${STORAGE_KEY}:auto`, autoParse ? "1" : "0")
    } catch {}
  }, [autoParse, uaText])

  useEffect(() => {
    if (!autoParse || !uaText.trim()) return

    const timer = window.setTimeout(() => {
      const parsed = parseUA(uaText)
      setResult(parsed)
      setMessage(parsed.warnings[0] ?? "已自动解析。")
    }, 220)

    return () => window.clearTimeout(timer)
  }, [autoParse, uaText])

  useEffect(() => {
    if (!pageRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      gsap.from(".ua-enter", { opacity: 0, y: 16, duration: 0.62, stagger: 0.055, ease: "power3.out" })
      gsap.to(".ua-orb", { y: -10, x: 8, duration: 6.2, repeat: -1, yoyo: true, ease: "sine.inOut" })
      gsap.to(".ua-scan", { xPercent: 130, duration: 4.6, repeat: -1, ease: "sine.inOut" })
    }, pageRef)

    return () => ctx.revert()
  }, [])

  const fillCurrentUA = () => {
    const current = navigator.userAgent
    setUaText(current)
    requestAnimationFrame(() => {
      const parsed = parseUA(current)
      setResult(parsed)
      saveHistory(current, parsed)
    })
  }

  const copyText = async (value: string, key: CopyKey, success: string) => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      setMessage(success)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {
      setMessage("复制失败，浏览器可能未授权剪贴板。")
    }
  }

  const onImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      setUaText(String(reader.result || ""))
      setMessage("已导入文本文件。")
    }
    reader.readAsText(file)
    event.target.value = ""
  }

  const clearAll = () => {
    setUaText("")
    setResult(null)
    setMessage("")
    textareaRef.current?.focus()
  }

  return (
    <div ref={pageRef} className="relative min-h-[calc(100dvh-4rem)] overflow-hidden bg-[#f5f0e8] text-[#211a14]">
      <style>{`
        .ua-scroll::-webkit-scrollbar { width:5px; height:5px; }
        .ua-scroll::-webkit-scrollbar-track { background:transparent; }
        .ua-scroll::-webkit-scrollbar-thumb { background:rgba(33,26,20,.18); border-radius:999px; }
        .ua-num { font-variant-numeric:tabular-nums lining-nums; }
      `}</style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(255,255,255,.78),transparent_28%),radial-gradient(circle_at_84%_13%,rgba(221,206,176,.58),transparent_31%),linear-gradient(180deg,#fbf7ef_0%,#f5f0e8_55%,#eee4d4_100%)]" />
      <div className="ua-orb pointer-events-none absolute -right-32 top-24 h-[460px] w-[460px] rounded-full bg-[#d7c5a4]/24 blur-[120px]" />
      <div className="ua-orb pointer-events-none absolute -left-28 bottom-10 h-[380px] w-[380px] rounded-full bg-white/46 blur-[110px]" />

      <main className="relative z-10 mx-auto max-w-[1580px] px-5 py-6 sm:px-8 lg:px-10">
        <div className="ua-enter inline-flex max-w-max">
          <Breadcrumb />
        </div>

        <header className="ua-enter mt-8 grid gap-8 border-b border-black/[0.07] pb-8 lg:grid-cols-[minmax(0,1fr)_470px] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.24em] text-black/32">Local User-Agent Inspector</div>
            <h1 className="mt-4 max-w-[980px] text-[clamp(42px,6.2vw,92px)] font-semibold leading-[1.03] tracking-[-0.045em]">
              User-Agent 解析，
              <br />
              看清浏览器环境。
            </h1>
          </div>
          <div>
            <p className="max-w-[520px] text-[12px] leading-7 text-black/45">
              粘贴 UA 字符串即可本地解析浏览器、版本、系统、设备、渲染引擎、WebView 和 Bot 特征。适合排查兼容性、日志分析和前端埋点调试。
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge tone={autoParse ? "green" : "default"}>{autoParse ? "自动解析开启" : "手动解析"}</Badge>
              <Badge>{result ? `${result.confidence}% confidence` : "等待输入"}</Badge>
            </div>
          </div>
        </header>

        {message && (
          <div className={`ua-enter mt-5 rounded-[22px] border px-4 py-3 text-sm ${result?.warnings.length ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            {message}
          </div>
        )}

        <section className="mt-6 grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)_360px]">
          <aside className="ua-enter space-y-5">
            <div className="rounded-[34px] border border-black/[0.06] bg-white/44 p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/34">Input</div>
                <PillButton active={autoParse} onClick={() => setAutoParse(!autoParse)}>{autoParse ? "Auto" : "Manual"}</PillButton>
              </div>

              <textarea
                ref={textareaRef}
                value={uaText}
                onChange={(event) => setUaText(event.target.value)}
                spellCheck={false}
                className="ua-scroll h-56 w-full resize-none rounded-[24px] border border-black/[0.08] bg-white/62 p-4 font-mono text-[12px] leading-6 text-zinc-700 outline-none transition placeholder:text-zinc-300 focus:border-zinc-900"
                placeholder="粘贴 User-Agent 字符串..."
              />

              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => handleParse(true)} className="rounded-full bg-zinc-950 px-4 py-3 text-[10px] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-zinc-800">解析 UA</button>
                <button type="button" onClick={fillCurrentUA} className="rounded-full border border-black/[0.08] bg-white/60 px-4 py-3 text-[10px] font-semibold text-zinc-600 transition hover:bg-white">当前浏览器</button>
                <label className="cursor-pointer rounded-full border border-black/[0.08] bg-white/45 px-4 py-3 text-[10px] font-semibold text-zinc-500 transition hover:bg-white">
                  导入 TXT
                  <input type="file" accept=".txt,text/plain" onChange={onImport} className="hidden" />
                </label>
                <button type="button" onClick={clearAll} className="rounded-full border border-orange-200 bg-orange-50/70 px-4 py-3 text-[10px] font-semibold text-orange-700 transition hover:bg-orange-100">清空</button>
              </div>
            </div>

            <div className="rounded-[34px] border border-black/[0.06] bg-white/44 p-5 backdrop-blur-xl">
              <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/34">Samples</div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {SAMPLE_UA.map((sample) => (
                  <button key={sample.label} type="button" onClick={() => setUaText(sample.value)} className="rounded-[18px] border border-black/[0.06] bg-white/48 px-3 py-3 text-left transition hover:-translate-y-0.5 hover:bg-white">
                    <div className="text-sm font-semibold">{sample.label}</div>
                    <div className="mt-1 line-clamp-2 font-mono text-[9px] leading-4 text-black/34">{sample.value}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[30px] border border-black/[0.06] bg-white/38 p-5 text-[11px] leading-6 text-black/42">
              <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-black/30">说明</div>
              User-Agent 可以被浏览器、代理或 App 修改，因此它适合做兼容性判断和日志辅助，不建议作为安全校验的唯一依据。
            </div>
          </aside>

          <section className="ua-enter min-w-0 overflow-hidden rounded-[40px] border border-black/[0.06] bg-white/38 p-3 shadow-[0_35px_120px_-72px_rgba(45,35,22,.45)] backdrop-blur-xl">
            <div className="overflow-hidden rounded-[32px] border border-black/[0.055] bg-[#14120f]">
              <div className="relative border-b border-white/[0.08] px-5 py-4">
                <div className="ua-scan pointer-events-none absolute inset-y-0 left-[-35%] w-1/3 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.08),transparent)] opacity-50" />
                <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[8px] font-semibold uppercase tracking-[0.18em] text-white/24">Parsed Summary</div>
                    <div className="mt-2 truncate font-mono text-[12px] text-emerald-100/82">{parsedSummary}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result?.isBot && <Badge tone="rose">Bot</Badge>}
                    {result?.isWebView && <Badge tone="amber">WebView</Badge>}
                    {result?.isMobile && <Badge tone="sky">Mobile</Badge>}
                  </div>
                </div>
              </div>

              <div className="grid gap-px bg-white/[0.07] lg:grid-cols-[minmax(0,1fr)_310px]">
                <div className="bg-[#14120f] p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <StatCard label="浏览器" value={result ? `${result.browser} ${result.browserVersion}` : "—"} hint={result ? result.engine : "等待解析"} tone={result?.browser === "Unknown" ? "rose" : "default"} />
                    <StatCard label="操作系统" value={result ? `${result.os} ${result.osVersion}` : "—"} hint={result ? result.architecture : "等待解析"} />
                    <StatCard label="设备类型" value={result?.device ?? "—"} hint={result ? `${result.vendor}${result.model ? ` · ${result.model}` : ""}` : "等待解析"} />
                    <StatCard label="可信度" value={result ? `${result.confidence}%` : "—"} hint={result?.warnings[0] ?? "解析覆盖度"} tone={confidenceTone} />
                  </div>

                  <div className="mt-4 rounded-[26px] border border-white/[0.08] bg-white/[0.045] p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="text-[8px] font-semibold uppercase tracking-[0.18em] text-white/24">Flags</div>
                      <button type="button" disabled={!uaText.trim()} onClick={() => void copyText(uaText, "ua", "UA 已复制。")} className="rounded-full border border-white/[0.1] px-3 py-1.5 text-[9px] font-semibold text-white/45 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-30">{copied === "ua" ? "已复制 UA" : "复制 UA"}</button>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      {[
                        ["Mobile", result?.isMobile],
                        ["Tablet", result?.isTablet],
                        ["Bot", result?.isBot],
                        ["WebView", result?.isWebView],
                        ["Touch likely", result?.isTouchLikely],
                        ["Known engine", result ? result.engine !== "Unknown" : false],
                      ].map(([label, active]) => (
                        <div key={String(label)} className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.035] px-3 py-3 text-[11px] text-white/52">
                          <span>{label}</span>
                          <span className={`h-2 w-2 rounded-full ${active ? "bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,.45)]" : "bg-white/16"}`} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 rounded-[26px] border border-white/[0.08] bg-white/[0.045] p-4">
                    <div className="text-[8px] font-semibold uppercase tracking-[0.18em] text-white/24">UA Tokens</div>
                    <div className="ua-scroll mt-4 max-h-[270px] overflow-auto">
                      {result ? (
                        <div className="grid gap-2">
                          {result.tokens.map((token, index) => (
                            <div key={`${token.label}-${index}`} className="grid gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3 sm:grid-cols-[120px_1fr]">
                              <div className="font-mono text-[10px] text-white/28">{token.label}</div>
                              <div className="break-all font-mono text-[10px] leading-5 text-emerald-100/72">{token.value}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4 text-sm text-white/35">等待解析 UA 字符串。</div>
                      )}
                    </div>
                  </div>
                </div>

                <aside className="bg-[#191713] p-4">
                  <OutputPanel label="JSON Result" value={jsonOutput} copied={copied === "json"} onCopy={() => void copyText(jsonOutput, "json", "结果 JSON 已复制。")} />
                  <OutputPanel label="JS Snippet" value={snippet} copied={copied === "snippet"} onCopy={() => void copyText(snippet, "snippet", "JS 片段已复制。")} />
                  <div className="border-t border-white/[0.08] py-4">
                    <div className="mb-3 text-[8px] font-semibold uppercase tracking-[0.18em] text-white/28">Warnings</div>
                    {result?.warnings.length ? (
                      <div className="space-y-2">
                        {result.warnings.map((warning) => (
                          <div key={warning} className="rounded-2xl border border-amber-300/15 bg-amber-200/8 p-3 text-[11px] leading-5 text-amber-100/78">{warning}</div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3 text-[11px] text-white/35">暂无明显风险提示。</div>
                    )}
                  </div>
                </aside>
              </div>
            </div>
          </section>

          <aside className="ua-enter space-y-5">
            <div className="rounded-[34px] border border-black/[0.06] bg-white/44 p-5 backdrop-blur-xl">
              <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/34">Actions</div>
              <div className="mt-5 grid gap-3">
                <button type="button" disabled={!result} onClick={() => void copyText(jsonOutput, "json", "结果 JSON 已复制。")} className="h-12 rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-35">复制结果 JSON</button>
                <button type="button" disabled={!result} onClick={() => void copyText(report, "report", "解析报告已复制。")} className="h-12 rounded-full border border-black/[0.08] bg-white/64 px-5 text-sm font-semibold text-zinc-700 transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-35">复制解析报告</button>
                <button type="button" disabled={!result} onClick={() => downloadText(report, "ua-parser-report.txt")} className="h-12 rounded-full border border-black/[0.08] bg-white/40 px-5 text-sm font-semibold text-zinc-500 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35">下载报告 TXT</button>
              </div>
            </div>

            <div className="rounded-[34px] border border-black/[0.06] bg-white/44 p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/34">History</div>
                <button type="button" onClick={() => { setHistory([]); window.localStorage.removeItem(`${STORAGE_KEY}:history`) }} className="text-[10px] font-semibold text-zinc-400 transition hover:text-rose-600">清空</button>
              </div>
              {history.length ? (
                <div className="space-y-2">
                  {history.map((item) => (
                    <button key={item.id} type="button" onClick={() => setUaText(item.ua)} className="w-full rounded-[18px] border border-black/[0.06] bg-white/50 p-3 text-left transition hover:-translate-y-0.5 hover:bg-white">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-semibold">{item.label}</span>
                        <span className="text-[9px] text-zinc-400">{item.device}</span>
                      </div>
                      <div className="mt-1 line-clamp-2 font-mono text-[9px] leading-4 text-black/34">{item.ua}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-[18px] border border-black/[0.06] bg-white/42 p-4 text-[11px] leading-5 text-black/38">点击解析后，会保留最近 {MAX_HISTORY} 条记录。</div>
              )}
            </div>

            <div className="[&_*]:!text-black/38">
              <FooterNote />
            </div>
          </aside>
        </section>
      </main>
    </div>
  )
}
