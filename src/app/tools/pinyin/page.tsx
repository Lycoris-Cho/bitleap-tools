"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { pinyin } from "pinyin-pro"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type Mode = "tone" | "noTone" | "first"
type Separator = "space" | "hyphen" | "none"
type LetterCase = "lower" | "upper"
type CopyState = "result" | "all" | null

const EXAMPLES = [
  "你好世界",
  "春风又绿江南岸",
  "BitLeap 工具站",
  "重庆火锅很好吃",
]

const MODES: Array<{
  value: Mode
  label: string
  example: string
}> = [
  { value: "tone", label: "带声调", example: "nǐ hǎo" },
  { value: "noTone", label: "无声调", example: "ni hao" },
  { value: "first", label: "首字母", example: "n h" },
]

function countChinese(value: string) {
  return value.match(/[\u3400-\u4dbf\u4e00-\u9fff]/g)?.length ?? 0
}

function applySeparator(value: string, separator: Separator) {
  const normalized = value.trim().replace(/\s+/g, " ")

  if (separator === "hyphen") return normalized.replace(/ /g, "-")
  if (separator === "none") return normalized.replace(/ /g, "")
  return normalized
}

function applyCase(value: string, letterCase: LetterCase) {
  return letterCase === "upper"
    ? value.toLocaleUpperCase()
    : value.toLocaleLowerCase()
}

function downloadText(content: string) {
  const blob = new Blob([content], {
    type: "text/plain;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = "bitleap-pinyin.txt"
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 500)
}

export default function PinyinPage() {
  const [input, setInput] = useState("你好世界")
  const [mode, setMode] = useState<Mode>("tone")
  const [separator, setSeparator] = useState<Separator>("space")
  const [letterCase, setLetterCase] = useState<LetterCase>("lower")
  const [copied, setCopied] = useState<CopyState>(null)

  const pageRef = useRef<HTMLDivElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const rawOutput = useMemo(() => {
    if (!input.trim()) return ""

    try {
      if (mode === "tone") {
        return pinyin(input, {
          toneType: "symbol",
        })
      }

      if (mode === "noTone") {
        return pinyin(input, {
          toneType: "none",
        })
      }

      return pinyin(input, {
        pattern: "first",
      })
    } catch {
      return ""
    }
  }, [input, mode])

  const output = useMemo(() => {
    const separated = applySeparator(rawOutput, separator)
    return applyCase(separated, letterCase)
  }, [rawOutput, separator, letterCase])

  const stats = useMemo(
    () => ({
      chinese: countChinese(input),
      inputChars: input.length,
      outputChars: output.length,
      syllables: rawOutput.trim()
        ? rawOutput.trim().split(/\s+/).filter(Boolean).length
        : 0,
    }),
    [input, output, rawOutput],
  )

  const allFormats = useMemo(() => {
    if (!input.trim()) return ""

    try {
      const tone = pinyin(input, { toneType: "symbol" })
      const noTone = pinyin(input, { toneType: "none" })
      const first = pinyin(input, { pattern: "first" })

      return [
        `原文：${input}`,
        `带声调：${tone}`,
        `无声调：${noTone}`,
        `首字母：${first}`,
      ].join("\n")
    } catch {
      return ""
    }
  }, [input])

  useEffect(() => {
    if (
      !pageRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    const ctx = gsap.context(() => {
      gsap.from(".pinyin-intro", {
        y: 22,
        opacity: 0,
        duration: 0.8,
        stagger: 0.06,
        ease: "power3.out",
      })

      gsap.to(".pinyin-orbit-a", {
        rotation: 360,
        duration: 66,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })

      gsap.to(".pinyin-orbit-b", {
        rotation: -360,
        duration: 98,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })
    }, pageRef)

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (
      !outputRef.current ||
      !output ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    gsap.fromTo(
      outputRef.current,
      {
        y: 8,
        opacity: 0.45,
        scale: 0.992,
      },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.3,
        ease: "power2.out",
        overwrite: true,
      },
    )
  }, [output])

  const copy = async (
    value: string,
    kind: CopyState,
  ) => {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setCopied(kind)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {}
  }

  const clear = () => {
    setInput("")
    setCopied(null)
    textareaRef.current?.focus()
  }

  return (
    <div
      ref={pageRef}
      className="min-h-screen overflow-hidden bg-[#efede6] text-[#22231f] selection:bg-[#22231f] selection:text-white"
    >
      <style>{`
        .pinyin-scroll::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }

        .pinyin-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .pinyin-scroll::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(34,35,31,.13);
        }

        .pinyin-grid {
          background-image:
            linear-gradient(rgba(34,35,31,.034) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,35,31,.034) 1px, transparent 1px);
          background-size: 30px 30px;
        }

        .pinyin-num {
          font-variant-numeric: tabular-nums lining-nums;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_81%_10%,rgba(178,151,91,.10),transparent_27%),radial-gradient(circle_at_8%_88%,rgba(73,107,91,.08),transparent_31%)]" />

        <div className="pinyin-orbit-a absolute right-[-20vw] top-[-24vw] h-[58vw] w-[58vw] rounded-full border border-black/[.04]">
          <span className="absolute left-[15%] top-[43%] h-2 w-2 rounded-full bg-[#b28d48]/38" />
        </div>

        <div className="pinyin-orbit-b absolute bottom-[-26vw] left-[-19vw] h-[53vw] w-[53vw] rounded-full border border-black/[.032]">
          <span className="absolute right-[14%] top-[31%] h-1.5 w-1.5 rounded-full bg-[#52685d]/35" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1480px] px-5 pb-10 pt-6 sm:px-8">
        <div className="pinyin-intro">
          <Breadcrumb />
        </div>

        <header className="pinyin-intro mt-8 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/27">
              PINYIN STUDIO
            </div>

            <h1 className="mt-4 max-w-[850px] text-[clamp(48px,6.4vw,90px)] font-semibold leading-[1.04] tracking-[-.052em]">
              汉字留下，
              <br />
              读音展开。
            </h1>
          </div>

          <div>
            <p className="max-w-[520px] text-[11px] leading-6 text-black/40">
              汉字实时转换为拼音。支持声调符号、无声调、首字母，以及大小写和分隔方式调整。
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setInput(example)}
                  className="rounded-full border border-black/[.085] px-3 py-2 text-[8px] text-black/33 transition hover:bg-white/45 hover:text-black"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </header>

        <section className="pinyin-intro mt-7 flex flex-col gap-5 border-b border-black/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1">
            {MODES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setMode(item.value)}
                className={`rounded-full px-4 py-2.5 text-[9px] font-semibold transition ${
                  mode === item.value
                    ? "bg-[#22231f] text-white"
                    : "text-black/35 hover:bg-white/40 hover:text-black"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(["space", "hyphen", "none"] as Separator[]).map(
              (value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSeparator(value)}
                  className={`rounded-full border px-3.5 py-2 text-[8px] font-semibold transition ${
                    separator === value
                      ? "border-[#52685d]/20 bg-[#52685d] text-white"
                      : "border-black/[.08] text-black/32 hover:bg-white/40"
                  }`}
                >
                  {value === "space"
                    ? "空格分隔"
                    : value === "hyphen"
                      ? "短横线"
                      : "不分隔"}
                </button>
              ),
            )}

            <span className="hidden h-7 w-px bg-black/10 sm:block" />

            {(["lower", "upper"] as LetterCase[]).map(
              (value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLetterCase(value)}
                  className={`rounded-full px-3 py-2 font-mono text-[8px] font-semibold transition ${
                    letterCase === value
                      ? "bg-[#a37358] text-white"
                      : "text-black/31 hover:bg-white/40 hover:text-black"
                  }`}
                >
                  {value === "lower" ? "abc" : "ABC"}
                </button>
              ),
            )}
          </div>
        </section>

        <section className="pinyin-intro mt-7 grid gap-7 lg:grid-cols-[.82fr_1.18fr]">
          <div className="min-w-0">
            <div className="flex h-11 items-center justify-between border-b border-black/[.07]">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#52685d]" />
                <span className="text-[8px] font-semibold tracking-[.13em] text-black/25">
                  CHINESE INPUT
                </span>
              </div>

              <button
                type="button"
                onClick={clear}
                className="text-[8px] font-semibold text-[#985947] transition hover:text-[#713f32]"
              >
                清空
              </button>
            </div>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              spellCheck={false}
              placeholder="输入汉字、短句或一段中文…"
              className="pinyin-scroll mt-5 block h-[390px] w-full resize-none bg-transparent text-[clamp(28px,4vw,52px)] font-medium leading-[1.45] tracking-[-.035em] outline-none placeholder:text-black/14"
            />

            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-black/[.07] pt-4 text-[8px] text-black/25">
              <span>{stats.chinese} 个汉字</span>
              <span>{stats.inputChars} 字符</span>
              <span>{stats.syllables} 个读音单元</span>
            </div>
          </div>

          <div className="pinyin-grid relative min-h-[510px] overflow-hidden rounded-[30px] border border-black/[.075] bg-white/25 p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[8px] font-semibold tracking-[.14em] text-black/23">
                  PINYIN OUTPUT
                </div>
                <div className="mt-1 text-[8px] text-black/23">
                  {MODES.find((item) => item.value === mode)?.example}
                </div>
              </div>

              <span className="pinyin-num font-mono text-[8px] text-black/22">
                {stats.outputChars} chars
              </span>
            </div>

            <div
              ref={outputRef}
              className="pinyin-scroll mt-12 max-h-[310px] overflow-auto break-words font-['myFont',sans-serif] text-[clamp(38px,6vw,82px)] font-semibold leading-[1.28] tracking-[-.045em] text-[#2b302b]"
            >
              {output || (
                <span className="text-black/13">
                  Pinyin will appear here.
                </span>
              )}
            </div>

            <div className="absolute bottom-6 left-6 right-6 flex flex-wrap items-center justify-between gap-3 border-t border-black/[.07] pt-4 sm:bottom-8 sm:left-8 sm:right-8">
              <span className="text-[8px] text-black/24">
                实时转换 · 本地完成
              </span>

              <button
                type="button"
                onClick={() => copy(output, "result")}
                disabled={!output}
                className="rounded-full bg-[#22231f] px-4 py-2.5 text-[9px] font-semibold text-white transition hover:scale-[1.02] active:scale-[.98] disabled:opacity-25"
              >
                {copied === "result" ? "✓ 已复制" : "复制结果"}
              </button>
            </div>
          </div>
        </section>

        <section className="pinyin-intro mt-8 grid gap-9 border-t border-black/10 pt-7 lg:grid-cols-[.55fr_1.45fr]">
          <div>
            <div className="text-[9px] font-semibold tracking-[.14em] text-black/25">
              ALL FORMATS
            </div>

            <h2 className="mt-3 text-[clamp(30px,4vw,46px)] font-semibold leading-[1.06] tracking-[-.045em]">
              一次输入，
              <br />
              三种结果。
            </h2>

            <p className="mt-5 max-w-[350px] text-[9px] leading-5 text-black/34">
              不想来回切换模式时，可以直接复制当前文本的全部常用拼音形式。
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => copy(allFormats, "all")}
                disabled={!allFormats}
                className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white disabled:opacity-30"
              >
                {copied === "all" ? "✓ 已复制全部" : "复制全部格式"}
              </button>

              <button
                type="button"
                onClick={() => downloadText(allFormats)}
                disabled={!allFormats}
                className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 transition hover:bg-white/40 disabled:opacity-30"
              >
                导出 TXT
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-[25px] border border-black/[.075] bg-[#171916]">
            <div className="flex items-center justify-between border-b border-white/[.07] px-5 py-3">
              <span className="text-[8px] tracking-[.13em] text-white/25">
                COMPLETE OUTPUT
              </span>

              <span className="text-[8px] text-white/17">
                PINYIN-PRO
              </span>
            </div>

            <div className="pinyin-scroll max-h-[340px] overflow-auto p-5 sm:p-6">
              <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-7 text-[#c7d3c7]">
                {allFormats || "等待输入…"}
              </pre>
            </div>
          </div>
        </section>

        <section className="pinyin-intro mt-12 grid gap-8 border-t border-black/10 pt-7 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              TONES
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              带声调模式直接输出声调符号，更适合阅读、学习和标注中文读音。
            </p>
          </div>

          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              FORMAT
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              可选择空格、短横线或连续输出，并提供大小写切换，方便用于 slug、标签或数据处理。
            </p>
          </div>

          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              LOCAL
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              拼音转换直接在当前浏览器完成，不需要网络请求，也不会上传输入内容。
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
