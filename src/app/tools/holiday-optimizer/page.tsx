"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type Country = {
  countryCode: string
  name: string
}

type Holiday = {
  date: string
  localName: string
  name: string
  countryCode: string
  global: boolean
  counties: string[] | null
  types: string[]
}

type ApiLongWeekend = {
  startDate: string
  endDate: string
  dayCount: number
  needBridgeDay: boolean
}

type LeavePlan = {
  id: string
  start: string
  end: string
  totalDays: number
  leaveDays: string[]
  holidays: Holiday[]
  efficiency: number
  score: number
}

const API = "https://date.nager.at/api/v3"
const CURRENT_YEAR = 2026
const WEEK = ["日", "一", "二", "三", "四", "五", "六"]

const FALLBACK_COUNTRIES: Country[] = [
  { countryCode: "JP", name: "Japan" },
  { countryCode: "US", name: "United States" },
  { countryCode: "GB", name: "United Kingdom" },
  { countryCode: "DE", name: "Germany" },
  { countryCode: "FR", name: "France" },
  { countryCode: "IT", name: "Italy" },
  { countryCode: "ES", name: "Spain" },
  { countryCode: "NL", name: "Netherlands" },
  { countryCode: "AT", name: "Austria" },
  { countryCode: "CA", name: "Canada" },
  { countryCode: "AU", name: "Australia" },
  { countryCode: "KR", name: "South Korea" },
  { countryCode: "SG", name: "Singapore" },
]

function dateMs(iso: string) {
  return Date.parse(`${iso}T00:00:00Z`)
}

function isoFromMs(ms: number) {
  return new Date(ms).toISOString().slice(0, 10)
}

function addDays(iso: string, days: number) {
  return isoFromMs(dateMs(iso) + days * 86400000)
}

function daysInclusive(start: string, end: string) {
  return Math.floor((dateMs(end) - dateMs(start)) / 86400000) + 1
}

function isWeekend(iso: string) {
  const day = new Date(`${iso}T00:00:00Z`).getUTCDay()
  return day === 0 || day === 6
}

function shortDate(iso: string) {
  const [, month, day] = iso.split("-")
  return `${Number(month)}月${Number(day)}日`
}

function weekday(iso: string) {
  const day = new Date(`${iso}T00:00:00Z`).getUTCDay()
  return `周${WEEK[day]}`
}

function monthDay(iso: string) {
  const [, month, day] = iso.split("-")
  return `${Number(month)}/${Number(day)}`
}

function rangeDates(start: string, end: string) {
  const out: string[] = []
  let current = start
  while (dateMs(current) <= dateMs(end)) {
    out.push(current)
    current = addDays(current, 1)
  }
  return out
}

function overlapRatio(a: LeavePlan, b: LeavePlan) {
  const start = Math.max(dateMs(a.start), dateMs(b.start))
  const end = Math.min(dateMs(a.end), dateMs(b.end))
  if (end < start) return 0
  const overlap = Math.floor((end - start) / 86400000) + 1
  return overlap / Math.min(a.totalDays, b.totalDays)
}

function buildLeavePlans(year: number, holidays: Holiday[], leaveBudget: number) {
  const holidaySet = new Set(holidays.map((item) => item.date))
  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`
  const candidates: LeavePlan[] = []

  for (let startOffset = 0; startOffset < 365 + (new Date(Date.UTC(year, 1, 29)).getUTCMonth() === 1 ? 1 : 0); startOffset += 1) {
    const start = addDays(yearStart, startOffset)
    if (dateMs(start) > dateMs(yearEnd)) break

    for (let length = 3; length <= 18; length += 1) {
      const end = addDays(start, length - 1)
      if (dateMs(end) > dateMs(yearEnd)) break

      const dates = rangeDates(start, end)
      const leaveDays = dates.filter((date) => !isWeekend(date) && !holidaySet.has(date))
      if (leaveDays.length > leaveBudget) continue

      const holidayItems = holidays.filter((holiday) => dateMs(holiday.date) >= dateMs(start) && dateMs(holiday.date) <= dateMs(end))
      const hasNaturalOff = dates.some((date) => isWeekend(date) || holidaySet.has(date))
      if (!hasNaturalOff) continue

      const efficiency = length / Math.max(0.5, leaveDays.length)
      const touchesHoliday = holidayItems.length > 0
      const score =
        length * 12 +
        efficiency * 5 +
        holidayItems.length * 6 -
        leaveDays.length * 1.5 +
        (touchesHoliday ? 8 : 0)

      candidates.push({
        id: `${start}-${end}`,
        start,
        end,
        totalDays: length,
        leaveDays,
        holidays: holidayItems,
        efficiency,
        score,
      })
    }
  }

  candidates.sort((a, b) => b.score - a.score || b.totalDays - a.totalDays || a.leaveDays.length - b.leaveDays.length)

  const selected: LeavePlan[] = []
  for (const candidate of candidates) {
    if (selected.every((item) => overlapRatio(item, candidate) < 0.48)) {
      selected.push(candidate)
    }
    if (selected.length >= 8) break
  }

  return selected
}

function countryLabel(country: Country) {
  try {
    const displayNames = new Intl.DisplayNames(["zh-CN"], { type: "region" })
    return displayNames.of(country.countryCode) || country.name
  } catch {
    return country.name
  }
}

function typeLabel(type: string) {
  const map: Record<string, string> = {
    Public: "公众假日",
    Bank: "银行假日",
    School: "学校假日",
    Authorities: "政府机关",
    Optional: "可选假日",
    Observance: "纪念日",
  }
  return map[type] || type
}

function monthDates(year: number, month: number) {
  const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return Array.from({ length: count }, (_, index) => `${year}-${String(month + 1).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`)
}

function exportIcs(filename: string, rows: { date: string; title: string }[]) {
  const content = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BitLeap//Holiday Optimizer//ZH-CN",
    "CALSCALE:GREGORIAN",
    ...rows.flatMap((row, index) => [
      "BEGIN:VEVENT",
      `UID:${row.date}-${index}@bitleap`,
      `DTSTART;VALUE=DATE:${row.date.replaceAll("-", "")}`,
      `DTEND;VALUE=DATE:${addDays(row.date, 1).replaceAll("-", "")}`,
      `SUMMARY:${row.title}`,
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ].join("\r\n")

  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 500)
}

function DayDot({
  date,
  holiday,
  selected,
  leave,
}: {
  date: string
  holiday?: Holiday
  selected: boolean
  leave: boolean
}) {
  const weekend = isWeekend(date)
  let className = "h-3.5 w-3.5 rounded-[4px] border transition sm:h-4 sm:w-4"
  if (leave) className += " border-[#b75e43] bg-[#d87658]"
  else if (holiday) className += " border-[#617665] bg-[#738b76]"
  else if (selected) className += " border-[#d1a650] bg-[#e8c66f]"
  else if (weekend) className += " border-black/[.05] bg-black/[.07]"
  else className += " border-black/[.04] bg-white/35"

  return <span className={className} title={holiday ? `${date} ${holiday.localName}` : date} />
}

export default function HolidayOptimizerPage() {
  const [countries, setCountries] = useState<Country[]>(FALLBACK_COUNTRIES)
  const [countryCode, setCountryCode] = useState("CN")
  const [year, setYear] = useState(CURRENT_YEAR)
  const [leaveBudget, setLeaveBudget] = useState(3)
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [apiWeekends, setApiWeekends] = useState<ApiLongWeekend[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [showRegional, setShowRegional] = useState(false)

  const pageRef = useRef<HTMLElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const numberRef = useRef<HTMLSpanElement>(null)

  const selectedCountry = countries.find((item) => item.countryCode === countryCode)

  const filteredHolidays = useMemo(
    () => holidays.filter((holiday) => showRegional || holiday.global),
    [holidays, showRegional],
  )

  const plans = useMemo(
    () => buildLeavePlans(year, filteredHolidays, leaveBudget),
    [year, filteredHolidays, leaveBudget],
  )

  const selectedPlan = plans[selectedIndex] || plans[0] || null

  const holidayMap = useMemo(
    () => new Map(filteredHolidays.map((holiday) => [holiday.date, holiday])),
    [filteredHolidays],
  )

  const selectedDates = useMemo(
    () => new Set(selectedPlan ? rangeDates(selectedPlan.start, selectedPlan.end) : []),
    [selectedPlan],
  )

  const leaveDates = useMemo(
    () => new Set(selectedPlan?.leaveDays || []),
    [selectedPlan],
  )

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced || !pageRef.current) return

    const ctx = gsap.context(() => {
      gsap.from(".holiday-intro", {
        y: 24,
        opacity: 0,
        duration: 0.85,
        stagger: 0.07,
        ease: "power3.out",
      })
      gsap.to(".holiday-sun", {
        rotation: 360,
        duration: 80,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })
      gsap.to(".holiday-float", {
        y: -12,
        x: 10,
        duration: 7,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      })
    }, pageRef)

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    let alive = true
    async function loadCountries() {
      try {
        const response = await fetch(`${API}/AvailableCountries`)
        if (!response.ok) throw new Error("countries")
        const data: Country[] = await response.json()
        if (!alive || !data.length) return
        setCountries(data)
        if (!data.some((country) => country.countryCode === countryCode)) {
          const fallback = data.find((country) => country.countryCode === "CN") || data[0]
          setCountryCode(fallback.countryCode)
        }
      } catch {
        // Keep fallback country list.
      }
    }
    loadCountries()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    async function loadHolidays() {
      setLoading(true)
      setError("")
      try {
        const [holidayResponse, weekendResponse] = await Promise.all([
          fetch(`${API}/PublicHolidays/${year}/${countryCode}`),
          fetch(`${API}/LongWeekend/${year}/${countryCode}`),
        ])

        if (!holidayResponse.ok) throw new Error("holidays")
        const holidayData: Holiday[] = await holidayResponse.json()
        const weekendData: ApiLongWeekend[] = weekendResponse.ok ? await weekendResponse.json() : []

        if (!alive) return
        setHolidays(holidayData)
        setApiWeekends(weekendData)
        setSelectedIndex(0)
      } catch {
        if (!alive) return
        setHolidays([])
        setApiWeekends([])
        setError("这个国家 / 年份暂时没有返回假日数据，请换一个年份或稍后重试。")
      } finally {
        if (alive) setLoading(false)
      }
    }

    loadHolidays()
    return () => {
      alive = false
    }
  }, [countryCode, year])

  useEffect(() => {
    if (selectedIndex >= plans.length) setSelectedIndex(0)
  }, [plans.length, selectedIndex])

  useEffect(() => {
    if (!selectedPlan || !resultRef.current) return
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced) return

    const ctx = gsap.context(() => {
      gsap.fromTo(".holiday-result-copy", { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.58, stagger: 0.055, ease: "power3.out" })
      gsap.fromTo(".holiday-day-dot", { scale: 0.35, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.36, stagger: 0.018, ease: "back.out(1.8)" })

      if (numberRef.current) {
        const counter = { value: 0 }
        gsap.to(counter, {
          value: selectedPlan.totalDays,
          duration: 0.65,
          ease: "power3.out",
          onUpdate: () => {
            if (numberRef.current) numberRef.current.textContent = String(Math.round(counter.value))
          },
        })
      }
    }, resultRef)

    return () => ctx.revert()
  }, [selectedPlan?.id])

  const exportPlan = () => {
    if (!selectedPlan) return
    const rows = [
      ...selectedPlan.leaveDays.map((date) => ({ date, title: "建议请假 · BitLeap 拼假方案" })),
      ...selectedPlan.holidays.map((holiday) => ({ date: holiday.date, title: `公众假日 · ${holiday.localName}` })),
    ]
    exportIcs(`leave-plan-${countryCode}-${year}.ics`, rows)
  }

  const exportAllHolidays = () => {
    exportIcs(
      `public-holidays-${countryCode}-${year}.ics`,
      filteredHolidays.map((holiday) => ({ date: holiday.date, title: holiday.localName || holiday.name })),
    )
  }

  return (
    <main ref={pageRef} className="min-h-screen overflow-hidden bg-[#f1ecdf] text-[#23221d]">
      <style>{`
        .holiday-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
        .holiday-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,.14); }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="holiday-sun absolute right-[-13vw] top-[-17vw] h-[48vw] w-[48vw] rounded-full border border-[#c1944e]/14">
          <span className="absolute left-[17%] top-[20%] h-3 w-3 rounded-full bg-[#d8a852]/42" />
          <span className="absolute bottom-[19%] right-[20%] h-2 w-2 rounded-full bg-[#738775]/38" />
        </div>
        <div className="holiday-float absolute bottom-[-16vw] left-[-10vw] h-[33vw] w-[33vw] rounded-full bg-[#cbd3c2]/24 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1540px] px-4 pb-8 pt-6 sm:px-7 lg:px-9">
        <div className="holiday-intro">
          <Breadcrumb />
        </div>

        <section className="pt-12 sm:pt-16">
          <div className="grid gap-10 lg:grid-cols-[1fr_.85fr] lg:items-end">
            <div>
              <div className="holiday-intro text-[10px] font-semibold tracking-[.2em] text-black/27">LIFE / HOLIDAY OPTIMIZER</div>
              <h1 className="holiday-intro mt-5 max-w-[850px] text-[clamp(50px,7vw,104px)] font-semibold leading-[.91] tracking-[-.07em]">
                把 <span className="text-[#a95740]">{leaveBudget}</span> 天年假，
                <br />
                拉成更长的休息。
              </h1>
            </div>

            <div className="holiday-intro border-t border-black/12 pt-5">
              <p className="max-w-lg text-[12px] leading-6 text-black/42">
                先读取各国公众假日，再把周末和年假放在一起计算。目标不是“查节日”，而是找到一年里最值得请假的那几段。
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-[1.3fr_.7fr_.8fr]">
                <label>
                  <span className="block text-[9px] font-medium tracking-[.11em] text-black/28">国家 / 地区</span>
                  <select value={countryCode} onChange={(event) => setCountryCode(event.target.value)} className="mt-2 w-full border-b border-black/13 bg-transparent pb-2 text-sm font-semibold outline-none">
                    {countries
                      .slice()
                      .sort((a, b) => countryLabel(a).localeCompare(countryLabel(b), "zh-CN"))
                      .map((country) => (
                        <option key={country.countryCode} value={country.countryCode}>
                          {countryLabel(country)} · {country.countryCode}
                        </option>
                      ))}
                  </select>
                </label>

                <label>
                  <span className="block text-[9px] font-medium tracking-[.11em] text-black/28">年份</span>
                  <select value={year} onChange={(event) => setYear(Number(event.target.value))} className="mt-2 w-full border-b border-black/13 bg-transparent pb-2 text-sm font-semibold outline-none">
                    {Array.from({ length: 9 }, (_, index) => CURRENT_YEAR - 2 + index).map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </label>

                <label>
                  <span className="block text-[9px] font-medium tracking-[.11em] text-black/28">可用年假</span>
                  <select value={leaveBudget} onChange={(event) => setLeaveBudget(Number(event.target.value))} className="mt-2 w-full border-b border-black/13 bg-transparent pb-2 text-sm font-semibold outline-none">
                    {Array.from({ length: 11 }, (_, index) => index).map((value) => <option key={value} value={value}>{value} 天</option>)}
                  </select>
                </label>
              </div>

              <label className="mt-4 flex cursor-pointer items-center gap-2 text-[9px] text-black/31">
                <input type="checkbox" checked={showRegional} onChange={(event) => setShowRegional(event.target.checked)} className="h-3.5 w-3.5 accent-[#23221d]" />
                包含 API 返回的地区性假日
              </label>
            </div>
          </div>
        </section>

        {error && <div className="mt-8 border-l-2 border-[#b46049] pl-3 text-[10px] leading-5 text-[#94533f]">{error}</div>}

        <section ref={resultRef} className="mt-16 border-t border-black/12 pt-7">
          {loading ? (
            <div className="flex min-h-[390px] items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-7 w-7 animate-spin rounded-full border border-black/10 border-t-black/50" />
                <div className="mt-4 text-[10px] tracking-[.12em] text-black/30">正在计算全年可休窗口…</div>
              </div>
            </div>
          ) : selectedPlan ? (
            <>
              <div className="grid gap-9 lg:grid-cols-[.78fr_1.22fr] lg:items-center">
                <div>
                  <div className="holiday-result-copy text-[9px] font-semibold tracking-[.15em] text-black/27">BEST WINDOW / 方案 {selectedIndex + 1}</div>

                  <div className="holiday-result-copy mt-3 flex items-end gap-3">
                    <span ref={numberRef} className="text-[clamp(82px,13vw,180px)] font-semibold leading-[.78] tracking-[-.085em]">{selectedPlan.totalDays}</span>
                    <span className="pb-2 text-xl font-semibold sm:pb-4 sm:text-3xl">天连续休息</span>
                  </div>

                  <div className="holiday-result-copy mt-8 flex flex-wrap gap-x-6 gap-y-3">
                    <div><span className="block text-[9px] text-black/27">需要请假</span><b className="mt-1 block text-lg">{selectedPlan.leaveDays.length} 天</b></div>
                    <div><span className="block text-[9px] text-black/27">休假倍率</span><b className="mt-1 block text-lg">{selectedPlan.leaveDays.length ? `${selectedPlan.efficiency.toFixed(1)}×` : "无需请假"}</b></div>
                    <div><span className="block text-[9px] text-black/27">时间</span><b className="mt-1 block text-sm">{shortDate(selectedPlan.start)} — {shortDate(selectedPlan.end)}</b></div>
                  </div>

                  <div className="holiday-result-copy mt-8 flex flex-wrap gap-2">
                    <button type="button" onClick={exportPlan} className="rounded-full bg-[#23221d] px-5 py-3 text-[10px] font-semibold text-white">加入我的日历</button>
                    <button type="button" onClick={exportAllHolidays} className="rounded-full border border-black/12 px-5 py-3 text-[10px] font-semibold">导出全年假日</button>
                  </div>
                </div>

                <div>
                  <div className="holiday-result-copy flex items-center justify-between gap-4 border-b border-black/10 pb-3">
                    <div>
                      <div className="text-[9px] text-black/25">这段假期怎么组成</div>
                      <div className="mt-1 text-sm font-semibold">{shortDate(selectedPlan.start)} {weekday(selectedPlan.start)} → {shortDate(selectedPlan.end)} {weekday(selectedPlan.end)}</div>
                    </div>
                    <div className="text-right text-[9px] leading-4 text-black/28">
                      绿色 = 公众假日
                      <br />
                      红色 = 建议请假
                    </div>
                  </div>

                  <div className="holiday-scroll mt-5 flex gap-2 overflow-x-auto pb-2">
                    {rangeDates(selectedPlan.start, selectedPlan.end).map((date) => {
                      const holiday = holidayMap.get(date)
                      const leave = leaveDates.has(date)
                      const weekend = isWeekend(date)
                      return (
                        <div key={date} className="holiday-day-dot min-w-[68px] flex-1 border-r border-black/[.07] pr-2 last:border-0">
                          <div className="text-[9px] text-black/27">{weekday(date)}</div>
                          <div className="mt-1 text-2xl font-semibold tracking-[-.04em]">{Number(date.slice(-2))}</div>
                          <div className="mt-3 min-h-8 text-[8px] leading-4">
                            {leave ? <span className="font-semibold text-[#a95740]">请假</span> : holiday ? <span className="font-semibold text-[#58705d]">{holiday.localName}</span> : weekend ? <span className="text-black/26">周末</span> : <span className="text-black/18">工作日</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {selectedPlan.leaveDays.length > 0 && (
                    <div className="holiday-result-copy mt-5 border-t border-black/10 pt-4">
                      <span className="text-[9px] text-black/27">建议请假：</span>
                      <span className="ml-2 text-[10px] font-medium text-[#98503d]">{selectedPlan.leaveDays.map((date) => `${monthDay(date)} ${weekday(date)}`).join(" · ")}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-12">
                <div className="flex items-end justify-between gap-4">
                  <div><div className="text-[9px] font-semibold tracking-[.15em] text-black/27">ALTERNATIVES</div><h2 className="mt-1 text-xl font-semibold tracking-[-.035em]">还有这些值得请。</h2></div>
                  <div className="text-[9px] text-black/25">按连续天数、用假效率和公众假日组合评分</div>
                </div>

                <div className="holiday-scroll mt-5 flex gap-2 overflow-x-auto pb-2">
                  {plans.map((plan, index) => (
                    <button key={plan.id} type="button" onClick={() => setSelectedIndex(index)} className={`min-w-[190px] rounded-[22px] border p-4 text-left transition ${selectedIndex === index ? "border-[#23221d] bg-[#23221d] text-white" : "border-black/[.08] bg-white/25 hover:bg-white/52"}`}>
                      <div className={`text-[8px] ${selectedIndex === index ? "text-white/38" : "text-black/27"}`}>方案 {String(index + 1).padStart(2, "0")}</div>
                      <div className="mt-3 flex items-end gap-1"><b className="text-3xl tracking-[-.055em]">{plan.totalDays}</b><span className="pb-1 text-[10px]">天</span></div>
                      <div className={`mt-3 text-[9px] ${selectedIndex === index ? "text-white/48" : "text-black/35"}`}>请 {plan.leaveDays.length} 天 · {shortDate(plan.start)} 起</div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex min-h-[340px] items-center justify-center text-center">
              <div>
                <div className="text-2xl font-semibold">没有找到适合当前年假额度的方案</div>
                <p className="mt-3 text-xs text-black/35">可以增加可用年假天数，或者包含地区性假日后再试。</p>
              </div>
            </div>
          )}
        </section>

        {!loading && holidays.length > 0 && (
          <section className="mt-16 border-t border-black/12 pt-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-[9px] font-semibold tracking-[.15em] text-black/27">YEAR AT A GLANCE</div>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-.04em]">{countryLabel(selectedCountry || { countryCode, name: countryCode })} · {year} 全年休息地图</h2>
              </div>
              <div className="flex flex-wrap gap-4 text-[9px] text-black/30">
                <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-[3px] bg-[#738b76]" />公众假日</span>
                <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-[3px] bg-[#d87658]" />当前方案请假</span>
                <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-[3px] bg-[#e8c66f]" />连续休息区间</span>
              </div>
            </div>

            <div className="mt-7 space-y-3">
              {Array.from({ length: 12 }, (_, month) => (
                <div key={month} className="grid grid-cols-[42px_1fr] items-center gap-3 sm:grid-cols-[58px_1fr]">
                  <div className="text-[10px] font-semibold text-black/38">{month + 1} 月</div>
                  <div className="holiday-scroll flex gap-1 overflow-x-auto">
                    {monthDates(year, month).map((date) => (
                      <DayDot
                        key={date}
                        date={date}
                        holiday={holidayMap.get(date)}
                        selected={selectedDates.has(date)}
                        leave={leaveDates.has(date)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {!loading && filteredHolidays.length > 0 && (
          <section className="mt-16 border-t border-black/12 pt-7">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
              <div>
                <div className="text-[9px] font-semibold tracking-[.15em] text-black/27">PUBLIC HOLIDAYS</div>
                <h2 className="mt-1 text-xl font-semibold tracking-[-.035em]">{filteredHolidays.length} 个 API 假日</h2>

                <div className="mt-5 divide-y divide-black/[.075]">
                  {filteredHolidays.map((holiday) => (
                    <div key={`${holiday.date}-${holiday.localName}`} className="grid grid-cols-[78px_1fr_auto] gap-3 py-3">
                      <div><b className="text-xs">{monthDay(holiday.date)}</b><span className="ml-1 text-[9px] text-black/27">{weekday(holiday.date)}</span></div>
                      <div><div className="text-xs font-medium">{holiday.localName}</div><div className="mt-1 text-[9px] text-black/29">{holiday.name}</div></div>
                      <div className="text-right text-[8px] text-black/24">{holiday.types.map(typeLabel).join(" · ")}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:border-l lg:border-black/10 lg:pl-8">
                <div className="text-[9px] font-semibold tracking-[.15em] text-black/27">NAGER.DATE LONG WEEKENDS</div>
                <h2 className="mt-1 text-xl font-semibold tracking-[-.035em]">API 自带长周末参考</h2>
                <p className="mt-3 text-[10px] leading-5 text-black/34">这里展示 Nager.Date 自身返回的 LongWeekend 数据；上面的“拼假方案”则是 BitLeap 额外根据你的年假额度重新计算。</p>

                <div className="mt-5 space-y-2">
                  {apiWeekends.slice(0, 10).map((item, index) => (
                    <div key={`${item.startDate}-${index}`} className="flex items-center justify-between rounded-2xl bg-white/28 px-4 py-3">
                      <div><b className="text-xs">{shortDate(item.startDate)} — {shortDate(item.endDate)}</b><div className="mt-1 text-[9px] text-black/30">{item.needBridgeDay ? "需要桥接工作日" : "无需额外桥接"}</div></div>
                      <div className="text-right"><b className="text-lg">{item.dayCount}</b><span className="ml-1 text-[9px] text-black/30">天</span></div>
                    </div>
                  ))}
                  {!apiWeekends.length && <div className="py-8 text-center text-[10px] text-black/28">API 没有返回额外长周末数据</div>}
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="mt-14 border-t border-black/10 pt-5 text-[9px] leading-5 text-black/25">
          假日数据来自 Nager.Date。不同国家对地区性假日、补班、调休和实际休假制度的定义可能不同；本工具按“周六、周日休息”的常见工作周计算，请假建议用于规划参考。
        </div>

        <div className="mt-5 border-t border-black/[.07] pt-5">
          <FooterNote />
        </div>
      </div>
    </main>
  )
}
