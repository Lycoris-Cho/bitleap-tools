"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type CopyKey =
  | "characters"
  | "words"
  | "lines"
  | "reading"
  | "report"
  | null

type ReadingSpeed = "slow" | "normal" | "fast"
type TargetKey = "none" | "x" | "weibo" | "xiaohongshu" | "custom"

const SAMPLE = `BitLeap 是一个纯前端工具站。

Tiny tools, Big leap.
每一个小工具，都应该快速、安静、可靠。

适合统计中文稿件、英文段落、产品文案、接口说明和文章草稿。`

const WRITING_TARGETS: Record<
  Exclude<TargetKey, "custom">,
  { label: string; limit: number | null }
> = {
  none: { label: "不限", limit: null },
  x: { label: "X / Twitter", limit: 280 },
  weibo: { label: "微博", limit: 2000 },
  xiaohongshu: { label: "小红书", limit: 1000 },
}

const READING_SPEEDS: Record<
  ReadingSpeed,
  {
    label: string
    cjkPerMinute: number
    latinPerMinute: number
  }
> = {
  slow: {
    label: "慢速阅读",
    cjkPerMinute: 300,
    latinPerMinute: 180,
  },
  normal: {
    label: "普通阅读",
    cjkPerMinute: 450,
    latinPerMinute: 220,
  },
  fast: {
    label: "快速浏览",
    cjkPerMinute: 650,
    latinPerMinute: 300,
  },
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value)
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).length
}

function humanBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function countGraphemes(value: string) {
  const segmenter =
    typeof Intl !== "undefined" &&
    "Segmenter" in Intl
      ? new Intl.Segmenter("zh-CN", {
          granularity: "grapheme",
        })
      : null

  if (!segmenter) return Array.from(value).length

  return Array.from(segmenter.segment(value)).length
}

function getLatinWords(value: string) {
  const withoutHan = value.replace(/[\p{Script=Han}]/gu, " ")
  return (
    withoutHan.match(/[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu) ?? []
  )
}

function countParagraphs(value: string) {
  if (!value.trim()) return 0
  return value
    .trim()
    .split(/\n\s*\n+/)
    .map((item) => item.trim())
    .filter(Boolean).length
}

function countSentences(value: string) {
  if (!value.trim()) return 0

  const normalized = value
    .replace(/\r/g, "\n")
    .replace(/([。！？!?；;]+)(?=\s|$)/g, "$1\n")

  return normalized
    .split(/\n+/)
    .flatMap((line) =>
      line
        .split(/(?<=[。！？!?；;])\s*/)
        .map((item) => item.trim()),
    )
    .filter(Boolean).length
}

function getTopKeywords(value: string) {
  const cjkWords = value.match(/[\p{Script=Han}]{2,}/gu) ?? []
  const latinWords = getLatinWords(value).filter((word) => word.length > 2)
  const all = [...cjkWords, ...latinWords].map((word) =>
    word.toLocaleLowerCase(),
  )

  const map = new Map<string, number>()

  for (const word of all) {
    map.set(word, (map.get(word) ?? 0) + 1)
  }

  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
}

function downloadText(content: string) {
  const blob = new Blob([content], {
    type: "text/plain;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = "bitleap-text-stats.txt"
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 500)
}

function MetricCard({
  label,
  value,
  note,
  accent,
  onCopy,
  copied,
}: {
  label: string
  value: string
  note: string
  accent: "ink" | "green" | "gold" | "rose"
  onCopy: () => void
  copied: boolean
}) {
  const accentClass = {
    ink: "text-[#22231f]",
    green: "text-[#52685d]",
    gold: "text-[#9b7542]",
    rose: "text-[#965744]",
  }[accent]

  return (
    <article className="group relative overflow-hidden rounded-[24px] border border-black/[.075] bg-white/24 p-5 transition duration-300 hover:bg-white/42">
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-black/[.025] blur-xl transition duration-300 group-hover:scale-125" />

      <div className="relative z-10">
        <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">
          {label}
        </div>

        <div
          className={`counter-num mt-4 text-[clamp(32px,4vw,54px)] font-semibold leading-none tracking-[-.055em] ${accentClass}`}
        >
          {value}
        </div>

        <div className="mt-3 text-[9px] leading-5 text-black/30">
          {note}
        </div>

        <button
          type="button"
          onClick={onCopy}
          className="mt-5 rounded-full border border-black/[.085] px-3 py-2 text-[8px] font-semibold text-black/31 opacity-100 transition hover:bg-[#22231f] hover:text-white sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
        >
          {copied ? "✓ 已复制" : "复制数值"}
        </button>
      </div>
    </article>
  )
}

export default function CounterPage() {
  const [text, setText] = useState(SAMPLE)
  const [copied, setCopied] = useState<CopyKey>(null)
  const [readingSpeed, setReadingSpeed] =
    useState<ReadingSpeed>("normal")
  const [target, setTarget] = useState<TargetKey>("none")
  const [customLimit, setCustomLimit] = useState(500)

  const pageRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const statRef = useRef<HTMLDivElement>(null)

  const stats = useMemo(() => {
    const content = text
    const cjkCharacters =
      content.match(/[\p{Script=Han}]/gu)?.length ?? 0
    const latinWords = getLatinWords(content)
    const whitespace =
      content.match(/\s/gu)?.length ?? 0
    const punctuation =
      content.match(/[^\p{L}\p{N}\s]/gu)?.length ?? 0
    const characters = countGraphemes(content)
    const charactersNoSpace = countGraphemes(
      content.replace(/\s/gu, ""),
    )
    const lines = content === "" ? 0 : content.split(/\r?\n/).length
    const words = cjkCharacters + latinWords.length
    const paragraphs = countParagraphs(content)
    const sentences = countSentences(content)
    const bytes = byteLength(content)

    const speed = READING_SPEEDS[readingSpeed]
    const readingMinutes =
      cjkCharacters / speed.cjkPerMinute +
      latinWords.length / speed.latinPerMinute

    const readingSeconds =
      words === 0
        ? 0
        : Math.max(10, Math.round(readingMinutes * 60))

    const speakingSeconds =
      words === 0
        ? 0
        : Math.max(
            10,
            Math.round(
              (cjkCharacters / 260 + latinWords.length / 150) * 60,
            ),
          )

    return {
      characters,
      charactersNoSpace,
      cjkCharacters,
      latinWords: latinWords.length,
      words,
      lines,
      paragraphs,
      sentences,
      whitespace,
      punctuation,
      bytes,
      readingSeconds,
      speakingSeconds,
    }
  }, [text, readingSpeed])

  const readingText = useMemo(() => {
    if (stats.readingSeconds === 0) return "0 秒"
    if (stats.readingSeconds < 60) return `${stats.readingSeconds} 秒`

    const minutes = Math.floor(stats.readingSeconds / 60)
    const seconds = stats.readingSeconds % 60

    if (seconds === 0) return `${minutes} 分钟`
    return `${minutes} 分 ${seconds} 秒`
  }, [stats.readingSeconds])

  const speakingText = useMemo(() => {
    if (stats.speakingSeconds === 0) return "0 秒"
    if (stats.speakingSeconds < 60) return `${stats.speakingSeconds} 秒`

    const minutes = Math.floor(stats.speakingSeconds / 60)
    const seconds = stats.speakingSeconds % 60
    return seconds === 0 ? `${minutes} 分钟` : `${minutes} 分 ${seconds} 秒`
  }, [stats.speakingSeconds])

  const activeLimit = useMemo(() => {
    if (target === "custom") return Math.max(1, customLimit)
    return WRITING_TARGETS[target].limit
  }, [target, customLimit])

  const targetProgress = useMemo(() => {
    if (!activeLimit) return null
    return Math.min(100, (stats.characters / activeLimit) * 100)
  }, [activeLimit, stats.characters])

  const targetRemaining = activeLimit
    ? activeLimit - stats.characters
    : null

  const avgSentenceLength =
    stats.sentences > 0
      ? Math.round((stats.words / stats.sentences) * 10) / 10
      : 0

  const density = useMemo(() => {
    if (stats.characters === 0) return 0
    return Math.round((stats.charactersNoSpace / stats.characters) * 100)
  }, [stats.characters, stats.charactersNoSpace])

  const topKeywords = useMemo(
    () => getTopKeywords(text),
    [text],
  )

  const report = useMemo(() => {
    return [
      "BitLeap 字数统计报告",
      "",
      `字符数：${stats.characters}`,
      `字符数（不含空白）：${stats.charactersNoSpace}`,
      `混合字数：${stats.words}`,
      `中文字符：${stats.cjkCharacters}`,
      `英文 / 数字词：${stats.latinWords}`,
      `行数：${stats.lines}`,
      `段落数：${stats.paragraphs}`,
      `句子数：${stats.sentences}`,
      `标点数：${stats.punctuation}`,
      `空白字符：${stats.whitespace}`,
      `UTF-8 体积：${humanBytes(stats.bytes)}`,
      `预计阅读：${readingText}`,
      `预计朗读：${speakingText}`,
      `平均句长：${avgSentenceLength}`,
      "",
      "关键词：",
      topKeywords.length
        ? topKeywords
            .map(([word, count]) => `${word} × ${count}`)
            .join("\n")
        : "暂无",
    ].join("\n")
  }, [stats, readingText, speakingText, avgSentenceLength, topKeywords])

  useEffect(() => {
    if (
      !pageRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    const ctx = gsap.context(() => {
      gsap.from(".counter-intro", {
        y: 22,
        opacity: 0,
        duration: 0.78,
        stagger: 0.055,
        ease: "power3.out",
      })

      gsap.to(".counter-orbit-a", {
        rotation: 360,
        duration: 68,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })

      gsap.to(".counter-orbit-b", {
        rotation: -360,
        duration: 104,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })
    }, pageRef)

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (
      !statRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    gsap.fromTo(
      statRef.current,
      {
        opacity: 0.72,
        y: 4,
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.24,
        ease: "power2.out",
        overwrite: true,
      },
    )
  }, [stats.characters, stats.words, stats.lines, readingText])

  const copy = async (
    value: string,
    key: CopyKey,
  ) => {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {}
  }

  const paste = async () => {
    try {
      const value = await navigator.clipboard.readText()
      if (value) setText(value)
    } catch {}
  }

  const clearAll = () => {
    setText("")
    setCopied(null)
    textareaRef.current?.focus()
  }

  return (
    <div
      ref={pageRef}
      className="min-h-screen overflow-hidden bg-[#efede6] text-[#22231f] selection:bg-[#22231f] selection:text-white"
    >
      <style>{`
        .counter-scroll::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }

        .counter-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .counter-scroll::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(34,35,31,.13);
        }

        .counter-dark-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,.14);
        }

        .counter-num {
          font-variant-numeric: tabular-nums lining-nums;
        }

        .counter-grid {
          background-image:
            linear-gradient(rgba(34,35,31,.032) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,35,31,.032) 1px, transparent 1px);
          background-size: 30px 30px;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_9%,rgba(178,151,91,.10),transparent_27%),radial-gradient(circle_at_8%_88%,rgba(73,107,91,.08),transparent_31%)]" />

        <div className="counter-orbit-a absolute right-[-20vw] top-[-24vw] h-[58vw] w-[58vw] rounded-full border border-black/[.04]">
          <span className="absolute left-[15%] top-[43%] h-2 w-2 rounded-full bg-[#b28d48]/38" />
        </div>

        <div className="counter-orbit-b absolute bottom-[-26vw] left-[-19vw] h-[53vw] w-[53vw] rounded-full border border-black/[.032]">
          <span className="absolute right-[14%] top-[31%] h-1.5 w-1.5 rounded-full bg-[#52685d]/35" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1500px] px-5 pb-10 pt-6 sm:px-8">
        <div className="counter-intro">
          <Breadcrumb />
        </div>

        <header className="counter-intro mt-8 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/27">
              TEXT COUNTER STUDIO
            </div>

            <h1 className="mt-4 max-w-[860px] text-[clamp(48px,6.35vw,90px)] font-semibold leading-[1.03] tracking-[-.055em]">
              把文字，
              <br />
              数得更明白。
            </h1>
          </div>

          <div>
            <p className="max-w-[540px] text-[11px] leading-6 text-black/40">
              实时统计中文、英文和混合文本。除了字符、字数和行数，也会计算段落、句子、标点、空白、UTF-8 体积、阅读与朗读时长，并支持常见文案长度目标。
            </p>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[8px] text-black/25">
              <span>LOCAL ONLY</span>
              <span>MIXED CJK / LATIN</span>
              <span>LIVE STATS</span>
              <span>UTF-8 SIZE</span>
            </div>
          </div>
        </header>

        <section className="counter-intro mt-7 grid gap-8 lg:grid-cols-[.9fr_1.1fr]">
          <div className="min-w-0">
            <div className="flex flex-col gap-4 border-b border-black/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-[8px] font-semibold tracking-[.13em] text-black/25">
                  TEXT INPUT
                </div>
                <p className="mt-2 text-[9px] text-black/31">
                  输入或粘贴需要统计的文本。
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setText(SAMPLE)}
                  className="rounded-full border border-black/[.085] px-3.5 py-2.5 text-[8px] font-semibold text-black/35 transition hover:bg-white/45 hover:text-black"
                >
                  示例
                </button>

                <button
                  type="button"
                  onClick={paste}
                  className="rounded-full border border-black/[.085] px-3.5 py-2.5 text-[8px] font-semibold text-black/35 transition hover:bg-white/45 hover:text-black"
                >
                  粘贴
                </button>

                <button
                  type="button"
                  onClick={clearAll}
                  className="rounded-full px-3.5 py-2.5 text-[8px] font-semibold text-[#965744] transition hover:bg-[#965744]/8"
                >
                  清空
                </button>
              </div>
            </div>

            <textarea
              ref={textareaRef}
              value={text}
              onChange={(event) => setText(event.target.value)}
              spellCheck={false}
              placeholder="粘贴或输入需要统计的文本..."
              className="counter-scroll mt-5 block h-[570px] w-full resize-none bg-transparent font-mono text-[12px] leading-7 text-[#292b26] outline-none placeholder:text-black/16"
            />
          </div>

          <div ref={statRef} className="min-w-0">
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard
                label="CHARACTERS"
                value={formatNumber(stats.characters)}
                note="按可见字符统计，尽量兼容 emoji 和组合字符。"
                accent="ink"
                onCopy={() =>
                  copy(String(stats.characters), "characters")
                }
                copied={copied === "characters"}
              />

              <MetricCard
                label="MIXED WORDS"
                value={formatNumber(stats.words)}
                note="中文按字，英文和数字按词，适合中英混排文本。"
                accent="green"
                onCopy={() =>
                  copy(String(stats.words), "words")
                }
                copied={copied === "words"}
              />

              <MetricCard
                label="LINES"
                value={formatNumber(stats.lines)}
                note="按换行符统计。空文本显示为 0 行。"
                accent="gold"
                onCopy={() =>
                  copy(String(stats.lines), "lines")
                }
                copied={copied === "lines"}
              />

              <MetricCard
                label="READING"
                value={readingText}
                note={`${READING_SPEEDS[readingSpeed].label}估算，可在下方切换速度。`}
                accent="rose"
                onCopy={() => copy(readingText, "reading")}
                copied={copied === "reading"}
              />
            </div>

            <div className="counter-grid mt-4 overflow-hidden rounded-[26px] border border-black/[.075] bg-white/22">
              <div className="flex items-center justify-between border-b border-black/[.06] px-5 py-4">
                <span className="text-[8px] font-semibold tracking-[.13em] text-black/24">
                  DETAIL METRICS
                </span>

                <span className="counter-num font-mono text-[8px] text-black/22">
                  {humanBytes(stats.bytes)}
                </span>
              </div>

              <div className="grid gap-px bg-black/[.06] sm:grid-cols-2">
                {[
                  ["不含空白字符", formatNumber(stats.charactersNoSpace)],
                  ["中文字符", formatNumber(stats.cjkCharacters)],
                  ["英文 / 数字词", formatNumber(stats.latinWords)],
                  ["段落数", formatNumber(stats.paragraphs)],
                  ["句子数", formatNumber(stats.sentences)],
                  ["标点符号", formatNumber(stats.punctuation)],
                  ["空白字符", formatNumber(stats.whitespace)],
                  ["文本密度", `${density}%`],
                  ["平均句长", `${avgSentenceLength}`],
                  ["预计朗读", speakingText],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="bg-[#f3f0e8]/92 p-4"
                  >
                    <div className="text-[8px] text-black/25">
                      {label}
                    </div>

                    <div className="counter-num mt-2 font-mono text-[13px] font-semibold text-black/61">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 rounded-[24px] border border-black/[.075] bg-white/24 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">
                  READING SPEED
                </div>

                <div className="mt-1 text-[8px] text-black/25">
                  中文 / 英文分别估算
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {(["slow", "normal", "fast"] as ReadingSpeed[]).map(
                  (speed) => (
                    <button
                      key={speed}
                      type="button"
                      onClick={() => setReadingSpeed(speed)}
                      className={`rounded-full px-3.5 py-2 text-[8px] font-semibold transition ${
                        readingSpeed === speed
                          ? "bg-[#22231f] text-white"
                          : "text-black/32 hover:bg-white/45 hover:text-black"
                      }`}
                    >
                      {READING_SPEEDS[speed].label}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className="mt-4 rounded-[24px] border border-black/[.075] bg-white/24 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">
                    WRITING TARGET
                  </div>
                  <div className="mt-1 text-[8px] text-black/25">
                    给文案设置一个长度目标
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {(["none", "x", "weibo", "xiaohongshu", "custom"] as TargetKey[]).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setTarget(value)}
                      className={`rounded-full px-3 py-2 text-[8px] font-semibold transition ${
                        target === value
                          ? "bg-[#52685d] text-white"
                          : "text-black/31 hover:bg-white/45 hover:text-black"
                      }`}
                    >
                      {value === "custom" ? "自定义" : WRITING_TARGETS[value].label}
                    </button>
                  ))}
                </div>
              </div>

              {target === "custom" && (
                <div className="mt-4 flex items-center gap-3 border-t border-black/[.06] pt-4">
                  <span className="text-[8px] text-black/28">字符上限</span>
                  <input
                    type="number"
                    min={1}
                    value={customLimit}
                    onChange={(event) => setCustomLimit(Math.max(1, Number(event.target.value) || 1))}
                    className="w-28 rounded-full border border-black/[.08] bg-white/45 px-3 py-2 font-mono text-[9px] outline-none"
                  />
                </div>
              )}

              {activeLimit && targetProgress !== null && (
                <div className="mt-4 border-t border-black/[.06] pt-4">
                  <div className="mb-2 flex items-center justify-between gap-3 text-[8px]">
                    <span className="text-black/27">
                      {stats.characters} / {activeLimit}
                    </span>
                    <span className={targetRemaining !== null && targetRemaining < 0 ? "font-semibold text-[#965744]" : "text-black/32"}>
                      {targetRemaining !== null && targetRemaining < 0
                        ? `超出 ${Math.abs(targetRemaining)} 字符`
                        : `剩余 ${targetRemaining ?? 0} 字符`}
                    </span>
                  </div>

                  <div className="h-1 overflow-hidden rounded-full bg-black/[.06]">
                    <div
                      className={`h-full rounded-full transition-[width] duration-300 ${
                        targetRemaining !== null && targetRemaining < 0
                          ? "bg-[#965744]"
                          : "bg-[#52685d]"
                      }`}
                      style={{ width: `${targetProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="counter-intro mt-12 grid gap-9 border-t border-black/10 pt-8 lg:grid-cols-[.55fr_1.45fr]">
          <div>
            <div className="text-[9px] font-semibold tracking-[.14em] text-black/25">
              REPORT
            </div>

            <h2 className="mt-3 text-[clamp(30px,4vw,46px)] font-semibold leading-[1.06] tracking-[-.045em]">
              不只看数字，
              <br />
              也能带走报告。
            </h2>

            <p className="mt-5 max-w-[360px] text-[9px] leading-5 text-black/34">
              适合文案统计、论文草稿、产品说明、社媒文本长度检查和接口文档整理。
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => copy(report, "report")}
                disabled={!text}
                className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white transition hover:scale-[1.01] active:scale-[.98] disabled:opacity-30"
              >
                {copied === "report"
                  ? "✓ 已复制报告"
                  : "复制报告"}
              </button>

              <button
                type="button"
                onClick={() => downloadText(report)}
                disabled={!text}
                className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 transition hover:bg-white/40 disabled:opacity-30"
              >
                导出 TXT
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-[25px] border border-black/[.08] bg-[#171916]">
            <div className="flex items-center justify-between border-b border-white/[.07] px-5 py-3">
              <span className="text-[8px] tracking-[.13em] text-white/25">
                TEXT PROFILE
              </span>

              <span className="text-[8px] text-white/17">
                LOCAL ANALYSIS
              </span>
            </div>

            <div className="counter-dark-scroll max-h-[390px] overflow-auto p-5 sm:p-6">
              <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-7 text-[#c7d3c7]">
                {text ? report : "等待输入…"}
              </pre>
            </div>
          </div>
        </section>

        <section className="counter-intro mt-12 grid gap-8 border-t border-black/10 pt-7 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              MIXED COUNT
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              中文按单个汉字统计，英文和数字按词统计，更适合中英混排内容。
            </p>
          </div>

          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              READING TIME
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              阅读时长按中文字符和英文单词分别估算，并可切换慢速、普通和快速阅读。
            </p>
          </div>

          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              LOCAL ONLY
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              统计直接在浏览器完成，不会上传文本，也不会保存你的输入内容。
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
