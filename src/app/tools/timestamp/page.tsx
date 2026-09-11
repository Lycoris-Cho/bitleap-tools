"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type InputKind =
  | "seconds"
  | "milliseconds"
  | "date"
  | "invalid"
  | "empty"

type ZoneMode = "local" | "utc"
type CopyKey =
  | "seconds"
  | "milliseconds"
  | "iso"
  | "readable"
  | null

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value)
}

function detectKind(value: string): InputKind {
  const trimmed = value.trim()
  if (!trimmed) return "empty"

  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    const numeric = Number(trimmed)
    if (!Number.isFinite(numeric)) return "invalid"
    if (Math.abs(numeric) >= 1e11) return "milliseconds"
    return "seconds"
  }

  return "date"
}

function parseDateInput(value: string) {
  const trimmed = value.trim()
  const kind = detectKind(trimmed)

  if (kind === "empty") {
    return {
      kind,
      date: null as Date | null,
      error: "",
    }
  }

  if (kind === "seconds" || kind === "milliseconds") {
    const numeric = Number(trimmed)
    const ms =
      kind === "seconds"
        ? numeric * 1000
        : numeric
    const date = new Date(ms)

    return {
      kind:
        Number.isNaN(date.getTime())
          ? ("invalid" as const)
          : kind,
      date:
        Number.isNaN(date.getTime())
          ? null
          : date,
      error: Number.isNaN(date.getTime())
        ? "时间戳超出可解析范围。"
        : "",
    }
  }

  const normalized = trimmed
    .replace(
      /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/,
      "$1-$2-$3T$4:$5:$6.$7",
    )
    .replace(/\.$/, "")

  const date = new Date(normalized)

  return {
    kind:
      Number.isNaN(date.getTime())
        ? ("invalid" as const)
        : ("date" as const),
    date:
      Number.isNaN(date.getTime())
        ? null
        : date,
    error: Number.isNaN(date.getTime())
      ? "无法识别输入。建议使用 Unix 时间戳、ISO 8601，或 YYYY-MM-DD HH:mm:ss。"
      : "",
  }
}

function formatReadable(
  date: Date,
  zone: ZoneMode,
) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone:
      zone === "utc" ? "UTC" : undefined,
  }).format(date)
}

function relativeTime(date: Date, nowMs: number) {
  const diff = date.getTime() - nowMs
  const abs = Math.abs(diff)

  if (abs < 1000) return "就是现在"

  const units: Array<{
    label: string
    ms: number
  }> = [
    { label: "年", ms: 365.2425 * 86400000 },
    { label: "天", ms: 86400000 },
    { label: "小时", ms: 3600000 },
    { label: "分钟", ms: 60000 },
    { label: "秒", ms: 1000 },
  ]

  const unit =
    units.find((item) => abs >= item.ms) ??
    units[units.length - 1]

  const amount = Math.floor(abs / unit.ms)

  return diff > 0
    ? `${amount} ${unit.label}后`
    : `${amount} ${unit.label}前`
}

function downloadText(content: string) {
  const blob = new Blob([content], {
    type: "text/plain;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = "bitleap-time.txt"
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 500)
}

export default function TimestampPage() {
  const [input, setInput] = useState("")
  const [zone, setZone] =
    useState<ZoneMode>("local")
  const [copied, setCopied] =
    useState<CopyKey>(null)
  const [nowMs, setNowMs] = useState(0)

  const pageRef = useRef<HTMLDivElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const update = () => setNowMs(Date.now())
    update()

    const timer = window.setInterval(
      update,
      1000,
    )

    return () =>
      window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!input && nowMs) {
      setInput(
        Math.floor(nowMs / 1000).toString(),
      )
    }
  }, [input, nowMs])

  const parsed = useMemo(
    () => parseDateInput(input),
    [input],
  )

  const result = useMemo(() => {
    if (!parsed.date) return null

    const ms = parsed.date.getTime()

    return {
      seconds: Math.floor(ms / 1000),
      milliseconds: ms,
      readable: formatReadable(
        parsed.date,
        zone,
      ),
      iso: parsed.date.toISOString(),
      utc: parsed.date.toUTCString(),
      timezone:
        zone === "utc"
          ? "UTC"
          : Intl.DateTimeFormat()
              .resolvedOptions().timeZone ||
            "Local",
      relative:
        nowMs > 0
          ? relativeTime(parsed.date, nowMs)
          : "—",
    }
  }, [nowMs, parsed.date, zone])

  useEffect(() => {
    if (
      !pageRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    const ctx = gsap.context(() => {
      gsap.from(".time-intro", {
        y: 22,
        opacity: 0,
        duration: 0.78,
        stagger: 0.055,
        ease: "power3.out",
      })

      gsap.to(".time-orbit-a", {
        rotation: 360,
        duration: 70,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })

      gsap.to(".time-orbit-b", {
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
    if (
      !resultRef.current ||
      !result ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    gsap.fromTo(
      resultRef.current,
      { opacity: 0.66, y: 5 },
      {
        opacity: 1,
        y: 0,
        duration: 0.24,
        ease: "power2.out",
        overwrite: true,
      },
    )
  }, [result?.milliseconds, zone])

  const copy = async (
    value: string,
    key: CopyKey,
  ) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      window.setTimeout(
        () => setCopied(null),
        1200,
      )
    } catch {}
  }

  const fillNowTimestamp = () => {
    setInput(
      Math.floor(Date.now() / 1000).toString(),
    )
  }

  const fillNowDate = () => {
    const date = new Date()
    const pad = (value: number) =>
      String(value).padStart(2, "0")

    setInput(
      `${date.getFullYear()}-${pad(
        date.getMonth() + 1,
      )}-${pad(date.getDate())} ${pad(
        date.getHours(),
      )}:${pad(date.getMinutes())}:${pad(
        date.getSeconds(),
      )}`,
    )
  }

  const report = result
    ? [
        "BitLeap Timestamp Studio",
        "",
        `输入类型：${parsed.kind}`,
        `显示时区：${result.timezone}`,
        `秒：${result.seconds}`,
        `毫秒：${result.milliseconds}`,
        `本地/指定显示：${result.readable}`,
        `ISO 8601：${result.iso}`,
        `UTC：${result.utc}`,
        `相对现在：${result.relative}`,
      ].join("\n")
    : ""

  return (
    <div
      ref={pageRef}
      className="min-h-screen overflow-hidden bg-[#efede6] text-[#22231f] selection:bg-[#22231f] selection:text-white"
    >
      <style>{`
        .time-num {
          font-variant-numeric: tabular-nums lining-nums;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_9%,rgba(178,151,91,.10),transparent_27%),radial-gradient(circle_at_8%_88%,rgba(73,107,91,.08),transparent_31%)]" />
        <div className="time-orbit-a absolute right-[-20vw] top-[-24vw] h-[58vw] w-[58vw] rounded-full border border-black/[.04]">
          <span className="absolute left-[15%] top-[43%] h-2 w-2 rounded-full bg-[#b28d48]/38" />
        </div>
        <div className="time-orbit-b absolute bottom-[-26vw] left-[-19vw] h-[53vw] w-[53vw] rounded-full border border-black/[.032]">
          <span className="absolute right-[14%] top-[31%] h-1.5 w-1.5 rounded-full bg-[#52685d]/35" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1480px] px-5 pb-10 pt-6 sm:px-8">
        <div className="time-intro">
          <Breadcrumb />
        </div>

        <header className="time-intro mt-8 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/27">
              TIMESTAMP STUDIO
            </div>

            <h1 className="mt-4 max-w-[880px] text-[clamp(48px,6.35vw,90px)] font-semibold leading-[1.03] tracking-[-.055em]">
              同一刻，
              <br />
              换一种时间表达。
            </h1>
          </div>

          <div>
            <p className="max-w-[560px] text-[11px] leading-6 text-black/40">
              Unix 秒、毫秒、ISO 8601 和常见日期字符串实时互转，并显示 UTC、本地时间、相对时间与当前时区。
            </p>
          </div>
        </header>

        <section className="time-intro mt-7">
          <div className="flex flex-col gap-4 border-b border-black/10 pb-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0 flex-1">
              <label className="mb-2 block text-[8px] font-semibold tracking-[.13em] text-black/25">
                TIME INPUT
              </label>
              <input
                value={input}
                onChange={(event) =>
                  setInput(event.target.value)
                }
                spellCheck={false}
                placeholder="1700000000 / 1700000000000 / 2026-09-09 12:00:00 / ISO"
                className="w-full border-b border-black/12 bg-transparent py-4 font-mono text-[clamp(16px,2vw,23px)] tracking-[-.03em] text-black/68 outline-none transition focus:border-black/35"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={fillNowTimestamp}
                className="rounded-full border border-black/[.085] px-4 py-2.5 text-[8px] font-semibold text-black/35 transition hover:bg-white/45"
              >
                当前秒时间戳
              </button>

              <button
                type="button"
                onClick={fillNowDate}
                className="rounded-full border border-black/[.085] px-4 py-2.5 text-[8px] font-semibold text-black/35 transition hover:bg-white/45"
              >
                当前可读时间
              </button>

              {(["local", "utc"] as ZoneMode[]).map(
                (value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setZone(value)}
                    className={`rounded-full px-3.5 py-2.5 font-mono text-[8px] font-semibold transition ${
                      zone === value
                        ? "bg-[#52685d] text-white"
                        : "text-black/32 hover:bg-white/45"
                    }`}
                  >
                    {value === "local"
                      ? "LOCAL"
                      : "UTC"}
                  </button>
                ),
              )}
            </div>
          </div>

          {parsed.error && (
            <div className="mt-4 rounded-[20px] border border-[#965744]/18 bg-[#965744]/7 p-4">
              <div className="text-[8px] font-semibold tracking-[.12em] text-[#965744]">
                PARSE ERROR
              </div>
              <p className="mt-2 text-[9px] leading-5 text-[#965744]">
                {parsed.error}
              </p>
            </div>
          )}
        </section>

        <section
          ref={resultRef}
          className="time-intro mt-8"
        >
          {result ? (
            <>
              <div className="grid gap-px overflow-hidden rounded-[28px] bg-black/[.07] sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["INPUT TYPE", parsed.kind.toUpperCase()],
                  ["TIMEZONE", result.timezone],
                  ["RELATIVE", result.relative],
                  ["NOW", nowMs ? new Date(nowMs).toLocaleTimeString("zh-CN", { hour12: false }) : "—"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="bg-[#f3f0e8]/92 p-5"
                  >
                    <div className="text-[7px] font-semibold tracking-[.12em] text-black/23">
                      {label}
                    </div>
                    <div className="time-num mt-3 break-all font-mono text-[12px] font-semibold text-black/61">
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 overflow-hidden rounded-[30px] border border-black/[.08] bg-[#151714]">
                {[
                  {
                    label: "READABLE",
                    value: result.readable,
                    key: "readable" as CopyKey,
                  },
                  {
                    label: "UNIX SECONDS",
                    value: String(result.seconds),
                    key: "seconds" as CopyKey,
                  },
                  {
                    label: "UNIX MILLISECONDS",
                    value: String(result.milliseconds),
                    key: "milliseconds" as CopyKey,
                  },
                  {
                    label: "ISO 8601",
                    value: result.iso,
                    key: "iso" as CopyKey,
                  },
                  {
                    label: "UTC STRING",
                    value: result.utc,
                    key: null,
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="group grid gap-3 border-b border-white/[.055] px-5 py-5 last:border-b-0 sm:grid-cols-[150px_1fr_auto] sm:items-center"
                  >
                    <div className="text-[8px] font-semibold tracking-[.13em] text-white/22">
                      {row.label}
                    </div>

                    <div className="time-num min-w-0 break-all font-mono text-[11px] leading-5 text-[#cbd8cd]">
                      {row.value}
                    </div>

                    {row.key && (
                      <button
                        type="button"
                        onClick={() =>
                          copy(
                            row.value,
                            row.key,
                          )
                        }
                        className="w-fit rounded-full border border-white/[.08] px-3 py-2 text-[8px] font-semibold text-white/31 transition hover:bg-white hover:text-[#151714]"
                      >
                        {copied === row.key
                          ? "✓"
                          : "COPY"}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    downloadText(report)
                  }
                  className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38"
                >
                  导出时间信息
                </button>
              </div>
            </>
          ) : (
            <div className="grid min-h-[330px] place-items-center rounded-[30px] border border-black/[.075] bg-white/22 px-6 text-center">
              <p className="text-[9px] text-black/26">
                输入时间戳或日期后查看转换结果。
              </p>
            </div>
          )}
        </section>

        <section className="time-intro mt-12 grid gap-8 border-t border-black/10 pt-7 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              AUTO DETECT
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              数字输入会自动判断秒或毫秒；日期文本则交给浏览器 Date 解析，并明确显示识别结果。
            </p>
          </div>

          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              LOCAL / UTC
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              可以在本地时区和 UTC 之间切换显示，ISO 8601 结果始终保持标准 UTC 表达。
            </p>
          </div>

          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              LIVE CLOCK
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              页面会更新当前时间，因此“几分钟前 / 几小时后”等相对时间也会随时间自动变化。
            </p>
          </div>
        </section>

        <div className="mt-12 border-t border-black/[.08] pt-5">
          <FooterNote />
        </div>
      </div>
    </div>
  )
}
