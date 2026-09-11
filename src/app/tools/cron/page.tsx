"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type Period = "minute" | "hour" | "day" | "week" | "month" | "custom"
type CopyKey = "cron" | "github" | "vercel" | "quartz" | "line" | "report" | null
type ZoneMode = "local" | "utc"

type ParseFieldResult = {
  ok: boolean
  error: string
  values: Set<number>
  wildcard: boolean
  normalized: string
}

type ParseResult = {
  ok: boolean
  error: string
  fields: ParseFieldResult[]
}

const PERIOD_OPTIONS: Array<{ value: Period; label: string; desc: string }> = [
  { value: "minute", label: "每分钟", desc: "持续运行，高频任务" },
  { value: "hour", label: "每小时", desc: "每小时固定分钟" },
  { value: "day", label: "每天", desc: "每天固定时间" },
  { value: "week", label: "每周", desc: "每周指定星期" },
  { value: "month", label: "每月", desc: "每月指定日期" },
  { value: "custom", label: "自定义", desc: "手写 Cron 表达式" },
]

const WEEK_OPTIONS = [
  { value: 0, label: "周日", short: "SUN" },
  { value: 1, label: "周一", short: "MON" },
  { value: 2, label: "周二", short: "TUE" },
  { value: 3, label: "周三", short: "WED" },
  { value: 4, label: "周四", short: "THU" },
  { value: 5, label: "周五", short: "FRI" },
  { value: 6, label: "周六", short: "SAT" },
]

const MONTH_OPTIONS = [
  { value: "*", label: "每月" },
  { value: "1", label: "1月" },
  { value: "2", label: "2月" },
  { value: "3", label: "3月" },
  { value: "4", label: "4月" },
  { value: "5", label: "5月" },
  { value: "6", label: "6月" },
  { value: "7", label: "7月" },
  { value: "8", label: "8月" },
  { value: "9", label: "9月" },
  { value: "10", label: "10月" },
  { value: "11", label: "11月" },
  { value: "12", label: "12月" },
]

const PRESETS = [
  { label: "每天凌晨 2 点", cron: "0 2 * * *" },
  { label: "每 5 分钟", cron: "*/5 * * * *" },
  { label: "工作日 9 点", cron: "0 9 * * 1-5" },
  { label: "每周一 10 点", cron: "0 10 * * 1" },
  { label: "每月 1 号", cron: "0 0 1 * *" },
  { label: "每年 1 月 1 日", cron: "0 0 1 1 *" },
]

const FIELD_META = [
  { label: "分", range: "0-59" },
  { label: "时", range: "0-23" },
  { label: "日", range: "1-31" },
  { label: "月", range: "1-12" },
  { label: "星期", range: "0-7" },
]

const MONTH_ALIASES: Record<string, number> = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12,
}

const WEEK_ALIASES: Record<string, number> = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
}

function pad(value: number) {
  return String(value).padStart(2, "0")
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value)
}

function normalizeNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.floor(value)))
}

function weekdayLabel(value: number) {
  return WEEK_OPTIONS.find((item) => item.value === value)?.label ?? `周${value}`
}

function normalizeCronExpression(value: string) {
  return value.trim().replace(/\s+/g, " ")
}

function aliasToNumber(token: string, aliases?: Record<string, number>) {
  const upper = token.toUpperCase()
  if (aliases && upper in aliases) return aliases[upper]
  if (!/^\d+$/.test(token)) return null
  return Number(token)
}

function parseField(source: string, min: number, max: number, aliases?: Record<string, number>, isWeekday = false): ParseFieldResult {
  const text = source.trim().toUpperCase()

  if (!text) {
    return { ok: false, error: "字段为空", values: new Set(), wildcard: false, normalized: source }
  }

  const values = new Set<number>()
  const parts = text.split(",")

  for (const part of parts) {
    if (!part) {
      return { ok: false, error: `字段 "${source}" 包含空片段`, values, wildcard: false, normalized: source }
    }

    const [rangePart, stepPart] = part.split("/")

    if (part.split("/").length > 2) {
      return { ok: false, error: `字段 "${source}" 的步进写法无效`, values, wildcard: false, normalized: source }
    }

    const step = stepPart === undefined ? 1 : Number(stepPart)

    if (!Number.isInteger(step) || step <= 0) {
      return { ok: false, error: `字段 "${source}" 的步进必须是正整数`, values, wildcard: false, normalized: source }
    }

    let start = min
    let end = max

    if (rangePart === "*") {
      start = min
      end = max
    } else if (rangePart.includes("-")) {
      const [left, right] = rangePart.split("-")
      const leftNumber = aliasToNumber(left, aliases)
      const rightNumber = aliasToNumber(right, aliases)

      if (leftNumber === null || rightNumber === null) {
        return { ok: false, error: `字段 "${source}" 的范围无法识别`, values, wildcard: false, normalized: source }
      }

      start = leftNumber
      end = rightNumber
    } else {
      const number = aliasToNumber(rangePart, aliases)

      if (number === null) {
        return { ok: false, error: `字段 "${source}" 包含无法识别的值`, values, wildcard: false, normalized: source }
      }

      start = number
      end = number
    }

    if (isWeekday) {
      if (start === 7) start = 0
      if (end === 7) end = 0
    }

    if (start < min || start > max || end < min || end > max) {
      return { ok: false, error: `字段 "${source}" 超出范围 ${min}-${max}`, values, wildcard: false, normalized: source }
    }

    if (start > end && !(isWeekday && start > end)) {
      return { ok: false, error: `字段 "${source}" 的范围起点不能大于终点`, values, wildcard: false, normalized: source }
    }

    if (isWeekday && start > end) {
      for (let value = start; value <= max; value += step) values.add(value === 7 ? 0 : value)
      for (let value = min; value <= end; value += step) values.add(value === 7 ? 0 : value)
    } else {
      for (let value = start; value <= end; value += step) values.add(value === 7 && isWeekday ? 0 : value)
    }
  }

  const fullSize = max - min + 1
  const wildcard = text === "*" || values.size >= fullSize

  return { ok: true, error: "", values, wildcard, normalized: text }
}

function parseCron(cron: string): ParseResult {
  const normalized = normalizeCronExpression(cron)
  const parts = normalized.split(" ")

  if (parts.length !== 5) {
    return { ok: false, error: `Linux Crontab 需要 5 个字段，目前是 ${parts.length} 个`, fields: [] }
  }

  const fields = [
    parseField(parts[0], 0, 59),
    parseField(parts[1], 0, 23),
    parseField(parts[2], 1, 31),
    parseField(parts[3], 1, 12, MONTH_ALIASES),
    parseField(parts[4], 0, 7, WEEK_ALIASES, true),
  ]

  const bad = fields.find((field) => !field.ok)

  if (bad) {
    return { ok: false, error: bad.error, fields }
  }

  return { ok: true, error: "", fields }
}

function dateMatches(date: Date, parsed: ParseResult, zone: ZoneMode) {
  if (!parsed.ok || parsed.fields.length !== 5) return false

  const minute = zone === "utc" ? date.getUTCMinutes() : date.getMinutes()
  const hour = zone === "utc" ? date.getUTCHours() : date.getHours()
  const dom = zone === "utc" ? date.getUTCDate() : date.getDate()
  const month = (zone === "utc" ? date.getUTCMonth() : date.getMonth()) + 1
  const dow = zone === "utc" ? date.getUTCDay() : date.getDay()

  const [minuteField, hourField, domField, monthField, dowField] = parsed.fields

  if (!minuteField.values.has(minute)) return false
  if (!hourField.values.has(hour)) return false
  if (!monthField.values.has(month)) return false

  const domMatch = domField.values.has(dom)
  const dowMatch = dowField.values.has(dow)

  if (domField.wildcard && dowField.wildcard) return true
  if (domField.wildcard) return dowMatch
  if (dowField.wildcard) return domMatch

  return domMatch || dowMatch
}

function getNextRuns(cron: string, now: Date, zone: ZoneMode, count = 5) {
  const parsed = parseCron(cron)

  if (!parsed.ok) return []

  const runs: Date[] = []
  const cursor = new Date(now.getTime())
  cursor.setSeconds(0, 0)
  cursor.setMinutes(cursor.getMinutes() + 1)

  const maxChecks = 60 * 24 * 370 * 3

  for (let checked = 0; checked < maxChecks && runs.length < count; checked++) {
    if (dateMatches(cursor, parsed, zone)) {
      runs.push(new Date(cursor.getTime()))
    }

    cursor.setMinutes(cursor.getMinutes() + 1)
  }

  return runs
}

function buildCron(period: Period, minute: number, hour: number, weekday: number, monthDay: number, month: string, custom: string) {
  if (period === "minute") return "* * * * *"
  if (period === "hour") return `${minute} * * * *`
  if (period === "day") return `${minute} ${hour} * ${month} *`
  if (period === "week") return `${minute} ${hour} * ${month} ${weekday}`
  if (period === "month") return `${minute} ${hour} ${monthDay} ${month} *`
  return normalizeCronExpression(custom)
}

function humanize(period: Period, minute: number, hour: number, weekday: number, monthDay: number, month: string, cron: string) {
  const time = `${pad(hour)}:${pad(minute)}`
  const monthText = month === "*" ? "" : `${month} 月 `

  if (period === "minute") return "每分钟执行一次。"
  if (period === "hour") return `每小时第 ${minute} 分钟执行一次。`
  if (period === "day") return `${month === "*" ? "每天" : `每年 ${month} 月的每天`} ${time} 执行。`
  if (period === "week") return `${monthText}每${weekdayLabel(weekday)} ${time} 执行。`
  if (period === "month") return `${monthText}每月 ${monthDay} 号 ${time} 执行。`
  return `自定义表达式：${cron}`
}

function formatRun(date: Date, zone: ZoneMode) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: zone === "utc" ? "UTC" : undefined,
  }).format(date)
}

function relativeRun(date: Date, now: Date) {
  const diff = date.getTime() - now.getTime()
  const abs = Math.abs(diff)

  if (abs < 60000) return "不到 1 分钟后"

  const units = [
    { label: "天", ms: 86400000 },
    { label: "小时", ms: 3600000 },
    { label: "分钟", ms: 60000 },
  ]

  const unit = units.find((item) => abs >= item.ms) ?? units[2]
  const amount = Math.floor(abs / unit.ms)

  return diff >= 0 ? `${amount} ${unit.label}后` : `${amount} ${unit.label}前`
}

function cronFieldExplain(field: string, index: number) {
  if (field === "*") return "任意"
  if (field.startsWith("*/")) return `每 ${field.slice(2)} 个单位`
  if (field.includes(",")) return "多个指定值"
  if (field.includes("-")) return "范围"
  return FIELD_META[index]?.label === "星期" && /^\d+$/.test(field) ? weekdayLabel(Number(field) === 7 ? 0 : Number(field)) : field
}

function downloadText(content: string, filename: string) {
  if (!content) return

  const blob = new Blob([content], {
    type: "text/plain;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 500)
}

function MetricCard({ label, value, note, tone = "ink" }: { label: string; value: string; note: string; tone?: "ink" | "green" | "gold" | "rose" }) {
  const toneClass = tone === "green" ? "text-[#52685d]" : tone === "gold" ? "text-[#9b7542]" : tone === "rose" ? "text-[#965744]" : "text-black/62"

  return (
    <article className="rounded-[24px] border border-black/[.075] bg-white/24 p-5">
      <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">{label}</div>
      <div className={`cron-num mt-4 break-all font-mono text-[19px] font-semibold tracking-[-.045em] ${toneClass}`}>{value}</div>
      <p className="mt-3 text-[8px] leading-5 text-black/30">{note}</p>
    </article>
  )
}

export default function CronPage() {
  const [period, setPeriod] = useState<Period>("day")
  const [minute, setMinute] = useState(0)
  const [hour, setHour] = useState(2)
  const [weekday, setWeekday] = useState(1)
  const [monthDay, setMonthDay] = useState(1)
  const [month, setMonth] = useState("*")
  const [customCron, setCustomCron] = useState("0 2 * * *")
  const [command, setCommand] = useState("npm run task")
  const [zone, setZone] = useState<ZoneMode>("local")
  const [now, setNow] = useState<Date | null>(null)
  const [copied, setCopied] = useState<CopyKey>(null)

  const pageRef = useRef<HTMLDivElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const update = () => setNow(new Date())
    update()
    const timer = window.setInterval(update, 30000)
    return () => window.clearInterval(timer)
  }, [])

  const cron = useMemo(() => buildCron(period, minute, hour, weekday, monthDay, month, customCron), [customCron, hour, minute, month, monthDay, period, weekday])
  const parsed = useMemo(() => parseCron(cron), [cron])
  const description = useMemo(() => humanize(period, minute, hour, weekday, monthDay, month, cron), [cron, hour, minute, month, monthDay, period, weekday])
  const nextRuns = useMemo(() => (now && parsed.ok ? getNextRuns(cron, now, zone, 5) : []), [cron, now, parsed.ok, zone])
  const expressionParts = normalizeCronExpression(cron).split(" ")

  const githubYaml = useMemo(() => `on:\n  schedule:\n    - cron: '${cron}'`, [cron])
  const vercelJson = useMemo(() => JSON.stringify({ crons: [{ path: "/api/cron", schedule: cron }] }, null, 2), [cron])
  const quartz = useMemo(() => `0 ${cron}`, [cron])
  const cronLine = useMemo(() => `${cron} ${command}`.trim(), [command, cron])
  const report = useMemo(
    () =>
      [
        "BitLeap Cron Studio",
        "",
        `表达式：${cron}`,
        `说明：${description}`,
        `时区：${zone === "utc" ? "UTC" : "Local"}`,
        `校验：${parsed.ok ? "有效" : parsed.error}`,
        "",
        "字段：",
        expressionParts.length === 5
          ? expressionParts.map((part, index) => `${FIELD_META[index].label}(${FIELD_META[index].range})：${part}`).join("\n")
          : "字段数量不正确",
        "",
        "接下来 5 次：",
        now && nextRuns.length
          ? nextRuns.map((date) => `${formatRun(date, zone)} · ${relativeRun(date, now)}`).join("\n")
          : "暂无预览",
        "",
        "Linux crontab line:",
        cronLine,
        "",
        "GitHub Actions:",
        githubYaml,
        "",
        "Vercel crons:",
        vercelJson,
      ].join("\n"),
    [cron, cronLine, description, expressionParts, githubYaml, nextRuns, now, parsed, vercelJson, zone],
  )

  useEffect(() => {
    if (!pageRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      gsap.from(".cron-intro", {
        y: 22,
        opacity: 0,
        duration: 0.78,
        stagger: 0.055,
        ease: "power3.out",
      })

      gsap.to(".cron-orbit-a", {
        rotation: 360,
        duration: 70,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })

      gsap.to(".cron-orbit-b", {
        rotation: -360,
        duration: 106,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })
    }, pageRef)

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (!resultRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    gsap.fromTo(
      resultRef.current,
      { opacity: 0.66, y: 6 },
      {
        opacity: 1,
        y: 0,
        duration: 0.24,
        ease: "power2.out",
        overwrite: true,
      },
    )
  }, [cron, parsed.ok, zone])

  const copy = async (value: string, key: CopyKey) => {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {}
  }

  const applyPreset = (value: string) => {
    setCustomCron(value)
    setPeriod("custom")
  }

  const reset = () => {
    setPeriod("day")
    setMinute(0)
    setHour(2)
    setWeekday(1)
    setMonthDay(1)
    setMonth("*")
    setCustomCron("0 2 * * *")
    setCommand("npm run task")
    setCopied(null)
  }

  return (
    <div ref={pageRef} className="min-h-screen overflow-hidden bg-[#efede6] text-[#22231f] selection:bg-[#22231f] selection:text-white">
      <style>{`
        .cron-scroll::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }

        .cron-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .cron-scroll::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(34,35,31,.13);
        }

        .cron-dark-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,.14);
        }

        .cron-grid {
          background-image:
            linear-gradient(rgba(34,35,31,.032) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,35,31,.032) 1px, transparent 1px);
          background-size: 30px 30px;
        }

        .cron-num {
          font-variant-numeric: tabular-nums lining-nums;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_9%,rgba(178,151,91,.10),transparent_27%),radial-gradient(circle_at_8%_88%,rgba(73,107,91,.08),transparent_31%)]" />
        <div className="cron-orbit-a absolute right-[-20vw] top-[-24vw] h-[58vw] w-[58vw] rounded-full border border-black/[.04]">
          <span className="absolute left-[15%] top-[43%] h-2 w-2 rounded-full bg-[#b28d48]/38" />
        </div>
        <div className="cron-orbit-b absolute bottom-[-26vw] left-[-19vw] h-[53vw] w-[53vw] rounded-full border border-black/[.032]">
          <span className="absolute right-[14%] top-[31%] h-1.5 w-1.5 rounded-full bg-[#52685d]/35" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1580px] px-5 pb-10 pt-6 sm:px-8">
        <div className="cron-intro">
          <Breadcrumb />
        </div>

        <header className="cron-intro mt-8 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/27">CRON STUDIO</div>
            <h1 className="mt-4 max-w-[900px] text-[clamp(48px,6.35vw,90px)] font-semibold leading-[1.03] tracking-[-.055em]">
              把定时任务，
              <br />
              排进时间表。
            </h1>
          </div>

          <div>
            <p className="max-w-[560px] text-[11px] leading-6 text-black/40">
              可视化生成 Linux 5 字段 Cron 表达式，支持自定义解析、字段校验、下一次执行预览，以及 GitHub Actions / Vercel / Quartz 常用格式输出。
            </p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[8px] text-black/25">
              <span>5-FIELD CRONTAB</span>
              <span>NEXT RUNS</span>
              <span>GITHUB / VERCEL</span>
              <span>LOCAL ONLY</span>
            </div>
          </div>
        </header>

        <section className="cron-intro mt-7 grid gap-7 xl:grid-cols-[.68fr_1.32fr]">
          <aside className="min-w-0">
            <div className="rounded-[28px] border border-black/[.075] bg-white/24 p-5">
              <div className="text-[8px] font-semibold tracking-[.14em] text-black/24">SCHEDULE BUILDER</div>
              <h2 className="mt-3 text-[clamp(30px,3.5vw,46px)] font-semibold leading-none tracking-[-.045em]">生成规则。</h2>

              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {PERIOD_OPTIONS.map((item) => (
                  <button key={item.value} type="button" onClick={() => setPeriod(item.value)} className={`rounded-[20px] border p-4 text-left transition ${period === item.value ? "border-[#22231f]/15 bg-[#22231f] text-white" : "border-black/[.08] bg-white/22 hover:bg-white/48"}`}>
                    <div className={`text-[13px] font-semibold tracking-[-.03em] ${period === item.value ? "text-white" : "text-black/70"}`}>{item.label}</div>
                    <p className={`mt-2 text-[8px] leading-4 ${period === item.value ? "text-white/33" : "text-black/30"}`}>{item.desc}</p>
                  </button>
                ))}
              </div>

              <div className="mt-6 space-y-5 border-t border-black/[.065] pt-5">
                {period === "custom" ? (
                  <label>
                    <span className="mb-2 block text-[8px] font-semibold tracking-[.12em] text-black/24">CUSTOM CRON</span>
                    <input value={customCron} onChange={(event) => setCustomCron(event.target.value)} spellCheck={false} className="w-full rounded-full border border-black/[.08] bg-white/35 px-4 py-3 font-mono text-[10px] text-black/68 outline-none transition focus:border-black/25" placeholder="*/5 * * * *" />
                  </label>
                ) : (
                  <>
                    <div>
                      <div className="mb-2 flex justify-between text-[8px] text-black/28">
                        <span>分钟</span>
                        <span className="cron-num font-mono text-[#52685d]">{pad(minute)}</span>
                      </div>
                      <input type="range" min={0} max={59} value={minute} onChange={(event) => setMinute(Number(event.target.value))} disabled={period === "minute"} className="w-full accent-[#52685d] disabled:opacity-25" />
                    </div>

                    {period !== "minute" && (
                      <div>
                        <div className="mb-2 flex justify-between text-[8px] text-black/28">
                          <span>小时</span>
                          <span className="cron-num font-mono text-[#52685d]">{pad(hour)}</span>
                        </div>
                        <input type="range" min={0} max={23} value={hour} onChange={(event) => setHour(Number(event.target.value))} className="w-full accent-[#52685d]" />
                      </div>
                    )}

                    {period === "month" && (
                      <label>
                        <span className="mb-2 block text-[8px] text-black/24">日期</span>
                        <input type="number" min={1} max={31} value={monthDay} onChange={(event) => setMonthDay(normalizeNumber(Number(event.target.value) || 1, 1, 31))} className="w-full rounded-full border border-black/[.08] bg-white/35 px-4 py-3 font-mono text-[10px] outline-none" />
                      </label>
                    )}

                    {period === "week" && (
                      <div>
                        <div className="mb-2 text-[8px] font-semibold tracking-[.12em] text-black/24">WEEKDAY</div>
                        <div className="flex flex-wrap gap-1.5">
                          {WEEK_OPTIONS.map((item) => (
                            <button key={item.value} type="button" onClick={() => setWeekday(item.value)} className={`rounded-full px-3.5 py-2 text-[8px] font-semibold transition ${weekday === item.value ? "bg-[#52685d] text-white" : "text-black/32 hover:bg-white/45 hover:text-black"}`}>{item.label}</button>
                          ))}
                        </div>
                      </div>
                    )}

                    {(period === "day" || period === "week" || period === "month") && (
                      <div>
                        <div className="mb-2 text-[8px] font-semibold tracking-[.12em] text-black/24">MONTH FILTER</div>
                        <div className="flex max-h-[104px] flex-wrap gap-1.5 overflow-auto pr-1">
                          {MONTH_OPTIONS.map((item) => (
                            <button key={item.value} type="button" onClick={() => setMonth(item.value)} className={`rounded-full px-3 py-2 text-[8px] font-semibold transition ${month === item.value ? "bg-[#22231f] text-white" : "text-black/32 hover:bg-white/45 hover:text-black"}`}>{item.label}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                <label>
                  <span className="mb-2 block text-[8px] font-semibold tracking-[.12em] text-black/24">COMMAND / PATH</span>
                  <input value={command} onChange={(event) => setCommand(event.target.value)} spellCheck={false} className="w-full rounded-full border border-black/[.08] bg-white/35 px-4 py-3 font-mono text-[10px] text-black/68 outline-none transition focus:border-black/25" placeholder="npm run task" />
                </label>

                <div className="flex flex-wrap gap-2">
                  {(["local", "utc"] as ZoneMode[]).map((item) => (
                    <button key={item} type="button" onClick={() => setZone(item)} className={`rounded-full px-3.5 py-2.5 font-mono text-[8px] font-semibold transition ${zone === item ? "bg-[#52685d] text-white" : "text-black/32 hover:bg-white/45 hover:text-black"}`}>{item.toUpperCase()}</button>
                  ))}

                  <button type="button" onClick={reset} className="rounded-full px-3.5 py-2.5 text-[8px] font-semibold text-[#965744] transition hover:bg-[#965744]/8">重置</button>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[24px] border border-black/[.075] bg-white/24 p-5">
              <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">PRESETS</div>
              <div className="mt-4 flex flex-wrap gap-2">
                {PRESETS.map((item) => (
                  <button key={item.cron} type="button" onClick={() => applyPreset(item.cron)} className="rounded-full border border-black/[.085] px-3.5 py-2 text-[8px] font-semibold text-black/35 transition hover:bg-white/45 hover:text-black">{item.label}</button>
                ))}
              </div>
            </div>
          </aside>

          <div ref={resultRef} className="min-w-0">
            <div className="flex flex-col gap-4 border-b border-black/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-[8px] font-semibold tracking-[.14em] text-black/23">CRON OUTPUT</div>
                <h2 className="mt-2 text-[clamp(31px,4vw,48px)] font-semibold leading-none tracking-[-.045em]">{parsed.ok ? "表达式有效。" : "需要检查。"}</h2>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => copy(cron, "cron")} disabled={!parsed.ok} className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white transition hover:scale-[1.01] active:scale-[.98] disabled:opacity-30">{copied === "cron" ? "✓ 已复制" : "复制 Cron"}</button>
                <button type="button" onClick={() => downloadText(report, "bitleap-cron-report.txt")} disabled={!parsed.ok} className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 transition hover:bg-white/40 disabled:opacity-30">导出报告</button>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-[30px] border border-black/[.08] bg-[#151714]">
              <div className="flex h-12 items-center justify-between border-b border-white/[.065] px-5">
                <span className="text-[8px] font-semibold tracking-[.13em] text-white/27">LINUX CRONTAB</span>
                <span className={`text-[8px] ${parsed.ok ? "text-[#8fb69b]" : "text-[#d49a88]"}`}>{parsed.ok ? "VALID" : "INVALID"}</span>
              </div>

              <div className="px-5 py-6 sm:px-6">
                <div className="break-all font-mono text-[clamp(26px,4.7vw,64px)] font-semibold leading-none tracking-[-.06em] text-[#cbd8cd]">{cron || "—"}</div>
                <p className="mt-4 text-[10px] leading-6 text-white/34">{parsed.ok ? description : parsed.error}</p>
              </div>

              <div className="grid gap-px bg-white/[.07] sm:grid-cols-5">
                {FIELD_META.map((item, index) => {
                  const part = expressionParts[index] ?? "—"

                  return (
                    <div key={item.label} className="bg-[#151714] p-4">
                      <div className="text-[7px] font-semibold tracking-[.12em] text-white/19">{item.label} · {item.range}</div>
                      <div className="cron-num mt-3 break-all font-mono text-[14px] font-semibold text-white/70">{part}</div>
                      <div className="mt-2 text-[8px] text-white/20">{cronFieldExplain(part, index)}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="MODE" value={period === "custom" ? "CUSTOM" : period.toUpperCase()} note="当前生成模式。" tone="ink" />
              <MetricCard label="STATEMENTS" value={parsed.ok ? "5 FIELDS" : "INVALID"} note="Linux crontab 标准字段数量。" tone={parsed.ok ? "green" : "rose"} />
              <MetricCard label="ZONE PREVIEW" value={zone.toUpperCase()} note="下一次执行预览使用的时区。" tone="gold" />
              <MetricCard label="NEXT RUNS" value={parsed.ok ? formatNumber(nextRuns.length) : "0"} note="向后扫描得到的执行时间。" tone="green" />
            </div>

            <div className="mt-5 grid gap-px overflow-hidden rounded-[28px] border border-black/[.075] bg-black/[.07] lg:grid-cols-[.82fr_1.18fr]">
              <div className="bg-[#f4f1e9]">
                <div className="border-b border-black/[.065] px-5 py-4">
                  <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">NEXT RUN PREVIEW</div>
                  <p className="mt-2 text-[8px] leading-5 text-black/31">预览在浏览器本地按分钟扫描生成，复杂表达式可能只显示可找到的前几次。</p>
                </div>

                <div className="divide-y divide-black/[.055]">
                  {now && nextRuns.length ? (
                    nextRuns.map((date, index) => (
                      <div key={date.toISOString()} className="grid gap-2 px-5 py-4 sm:grid-cols-[54px_1fr_auto] sm:items-center">
                        <div className="cron-num font-mono text-[8px] text-black/22">#{String(index + 1).padStart(2, "0")}</div>
                        <div className="cron-num font-mono text-[12px] font-semibold text-black/62">{formatRun(date, zone)}</div>
                        <div className="text-[8px] text-black/27">{relativeRun(date, now)}</div>
                      </div>
                    ))
                  ) : (
                    <div className="px-5 py-10 text-center text-[9px] text-black/27">{parsed.ok ? "客户端时钟准备中…" : parsed.error}</div>
                  )}
                </div>
              </div>

              <div className="bg-[#151714]">
                <div className="flex h-12 items-center justify-between border-b border-white/[.065] px-5">
                  <span className="text-[8px] font-semibold tracking-[.13em] text-white/27">EXPORT FORMATS</span>
                  <button type="button" onClick={() => copy(report, "report")} disabled={!parsed.ok} className="text-[8px] font-semibold text-white/27 transition hover:text-white disabled:opacity-20">{copied === "report" ? "✓ COPIED" : "COPY REPORT"}</button>
                </div>

                <div className="cron-dark-scroll max-h-[444px] overflow-auto">
                  {[
                    { label: "Crontab line", value: cronLine, key: "line" as CopyKey },
                    { label: "GitHub Actions", value: githubYaml, key: "github" as CopyKey },
                    { label: "Vercel crons", value: vercelJson, key: "vercel" as CopyKey },
                    { label: "Quartz-like 6 fields", value: quartz, key: "quartz" as CopyKey },
                  ].map((item) => (
                    <div key={item.label} className="group border-b border-white/[.055] px-5 py-4 last:border-b-0">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-[8px] font-semibold tracking-[.12em] text-white/24">{item.label}</span>
                        <button type="button" onClick={() => copy(item.value, item.key)} disabled={!parsed.ok} className="text-[8px] font-semibold text-white/24 opacity-100 transition hover:text-white disabled:opacity-20 sm:opacity-0 sm:group-hover:opacity-100">{copied === item.key ? "✓" : "COPY"}</button>
                      </div>
                      <pre className="whitespace-pre-wrap break-all font-mono text-[10px] leading-5 text-[#cbd8cd]">{item.value}</pre>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="cron-intro mt-12 grid gap-8 border-t border-black/10 pt-7 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">5 FIELDS</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">这里生成的是 Linux Crontab 常见 5 字段格式：分、时、日、月、星期。Quartz 通常还会多一个“秒”字段。</p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">DAY MATCHING</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">当“日”和“星期”都不是星号时，很多 crontab 会按“任一匹配”执行。不同平台可能略有差异，部署前需要确认平台文档。</p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">UTC NOTE</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">GitHub Actions 的 schedule 使用 UTC。页面提供 UTC 预览，方便把本地时间换算到 CI 定时任务。</p>
          </div>
        </section>

        <div className="mt-12 border-t border-black/[.08] pt-5">
          <FooterNote />
        </div>
      </div>
    </div>
  )
}
