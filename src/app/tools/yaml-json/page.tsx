"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { dump, load } from "js-yaml"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type Mode = "json2yaml" | "yaml2json"
type CopyKey = "output" | "report" | null
type SortMode = "preserve" | "asc"

const JSON_SAMPLE = `{
  "name": "BitLeap",
  "version": 2,
  "features": ["fast", "local", "private"],
  "enabled": true,
  "meta": {
    "author": "demo",
    "year": 2026
  }
}`

const YAML_SAMPLE = `name: BitLeap
version: 2
features:
  - fast
  - local
  - private
enabled: true
meta:
  author: demo
  year: 2026`

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value)
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).length
}

function humanBytes(value: number) {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(2)} MB`
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep)

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort((a, b) => a.localeCompare(b, "zh-CN"))
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortDeep(
          (value as Record<string, unknown>)[key],
        )
        return acc
      }, {})
  }

  return value
}

function detectRootType(value: unknown) {
  if (Array.isArray(value)) return "Array"
  if (value === null) return "Null"
  if (typeof value === "object") return "Object"
  return typeof value
}

function countNodes(value: unknown): number {
  if (Array.isArray(value)) {
    return 1 + value.reduce<number>((sum, item) => sum + countNodes(item), 0)
  }

  if (value && typeof value === "object") {
    return (
      1 +
      Object.values(value as Record<string, unknown>).reduce<number>(
        (sum, item) => sum + countNodes(item),
        0,
      )
    )
  }

  return 1
}

function parseInput(
  mode: Mode,
  input: string,
  sortMode: SortMode,
  indent: number,
) {
  if (!input.trim()) {
    return {
      output: "",
      error: "",
      parsed: null as unknown,
    }
  }

  try {
    const parsed =
      mode === "json2yaml"
        ? JSON.parse(input)
        : load(input, { json: false })

    const data =
      sortMode === "asc" ? sortDeep(parsed) : parsed

    const output =
      mode === "json2yaml"
        ? dump(data, {
            noRefs: true,
            indent,
            lineWidth: -1,
            sortKeys: false,
          })
        : JSON.stringify(data, null, indent)

    return {
      output,
      error: "",
      parsed: data,
      
    }
  } catch (error) {
    return {
      output: "",
      error:
        error instanceof Error
          ? error.message
          : "解析失败",
      parsed: null as unknown,
      
    }
  }
}

function downloadText(
  content: string,
  filename: string,
) {
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

export default function YamlJsonPage() {
  const [mode, setMode] = useState<Mode>("json2yaml")
  const [input, setInput] = useState(JSON_SAMPLE)
  const [indent, setIndent] = useState(2)
  const [sortMode, setSortMode] =
    useState<SortMode>("preserve")
  const [copied, setCopied] =
    useState<CopyKey>(null)
  const [clientDuration, setClientDuration] =
    useState<number | null>(null)

  const pageRef = useRef<HTMLDivElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  const result = useMemo(
    () =>
      parseInput(
        mode,
        input,
        sortMode,
        indent,
      ),
    [indent, input, mode, sortMode],
  )

  const stats = useMemo(
    () => ({
      inputChars: input.length,
      inputBytes: byteLength(input),
      outputChars: result.output.length,
      outputBytes: byteLength(result.output),
      rootType:
        result.error || !input.trim()
          ? "—"
          : detectRootType(result.parsed),
      nodes:
        result.error || !input.trim()
          ? 0
          : countNodes(result.parsed),
    }),
    [input, result],
  )

  useEffect(() => {
    if (!input.trim()) {
      setClientDuration(null)
      return
    }

    const started = performance.now()

    parseInput(
      mode,
      input,
      sortMode,
      indent,
    )

    setClientDuration(
      performance.now() - started,
    )
  }, [indent, input, mode, sortMode])

  const report = useMemo(
    () =>
      [
        "BitLeap YAML ↔ JSON Studio",
        "",
        `方向：${mode === "json2yaml" ? "JSON → YAML" : "YAML → JSON"}`,
        `缩进：${indent}`,
        `排序：${sortMode === "asc" ? "按键名" : "保持原顺序"}`,
        `根类型：${stats.rootType}`,
        `节点数：${stats.nodes}`,
        "",
        result.output || "暂无输出",
      ].join("\n"),
    [indent, mode, result.output, sortMode, stats],
  )

  useEffect(() => {
    if (
      !pageRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    const ctx = gsap.context(() => {
      gsap.from(".yaml-intro", {
        y: 22,
        opacity: 0,
        duration: 0.78,
        stagger: 0.055,
        ease: "power3.out",
      })

      gsap.to(".yaml-orbit-a", {
        rotation: 360,
        duration: 70,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })

      gsap.to(".yaml-orbit-b", {
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
      !outputRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    gsap.fromTo(
      outputRef.current,
      { opacity: 0.64, y: 5 },
      {
        opacity: 1,
        y: 0,
        duration: 0.24,
        ease: "power2.out",
        overwrite: true,
      },
    )
  }, [result.output, result.error])

  const switchMode = (nextMode: Mode) => {
    if (nextMode === mode) return

    setMode(nextMode)

    if (result.output) {
      setInput(result.output)
      return
    }

    setInput(
      nextMode === "json2yaml"
        ? JSON_SAMPLE
        : YAML_SAMPLE,
    )
  }

  const copy = async (
    value: string,
    key: CopyKey,
  ) => {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      window.setTimeout(
        () => setCopied(null),
        1200,
      )
    } catch {}
  }

  const paste = async () => {
    try {
      const value =
        await navigator.clipboard.readText()
      if (value) setInput(value)
    } catch {}
  }

  return (
    <div
      ref={pageRef}
      className="min-h-screen overflow-hidden bg-[#efede6] text-[#22231f] selection:bg-[#22231f] selection:text-white"
    >
      <style>{`
        .yaml-scroll::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }

        .yaml-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .yaml-scroll::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(34,35,31,.13);
        }

        .yaml-dark-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,.14);
        }

        .yaml-num {
          font-variant-numeric: tabular-nums lining-nums;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_9%,rgba(178,151,91,.10),transparent_27%),radial-gradient(circle_at_8%_88%,rgba(73,107,91,.08),transparent_31%)]" />
        <div className="yaml-orbit-a absolute right-[-20vw] top-[-24vw] h-[58vw] w-[58vw] rounded-full border border-black/[.04]">
          <span className="absolute left-[15%] top-[43%] h-2 w-2 rounded-full bg-[#b28d48]/38" />
        </div>
        <div className="yaml-orbit-b absolute bottom-[-26vw] left-[-19vw] h-[53vw] w-[53vw] rounded-full border border-black/[.032]">
          <span className="absolute right-[14%] top-[31%] h-1.5 w-1.5 rounded-full bg-[#52685d]/35" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1580px] px-5 pb-10 pt-6 sm:px-8">
        <div className="yaml-intro">
          <Breadcrumb />
        </div>

        <header className="yaml-intro mt-8 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/27">
              YAML ↔ JSON STUDIO
            </div>

            <h1 className="mt-4 max-w-[900px] text-[clamp(48px,6.35vw,90px)] font-semibold leading-[1.03] tracking-[-.055em]">
              结构不变，
              <br />
              换一种表达。
            </h1>
          </div>

          <div>
            <p className="max-w-[560px] text-[11px] leading-6 text-black/40">
              JSON 与 YAML 双向实时转换，带格式校验、缩进控制、键名排序、统计和导出。所有数据只在当前浏览器中处理。
            </p>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[8px] text-black/25">
              <span>JS-YAML</span>
              <span>LIVE CONVERT</span>
              <span>LOCAL ONLY</span>
              <span>
                {mode === "json2yaml"
                  ? "JSON → YAML"
                  : "YAML → JSON"}
              </span>
            </div>
          </div>
        </header>

        <section className="yaml-intro mt-6 flex flex-col gap-4 border-b border-black/10 pb-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {(["json2yaml", "yaml2json"] as Mode[]).map(
              (value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    switchMode(value)
                  }
                  className={`rounded-full px-4 py-2.5 text-[9px] font-semibold transition ${
                    mode === value
                      ? "bg-[#22231f] text-white"
                      : "text-black/34 hover:bg-white/45 hover:text-black"
                  }`}
                >
                  {value === "json2yaml"
                    ? "JSON → YAML"
                    : "YAML → JSON"}
                </button>
              ),
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {[2, 4].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setIndent(value)}
                className={`rounded-full border px-3.5 py-2 text-[8px] font-semibold transition ${
                  indent === value
                    ? "border-[#52685d]/20 bg-[#52685d] text-white"
                    : "border-black/[.08] text-black/31 hover:bg-white/45"
                }`}
              >
                {value} spaces
              </button>
            ))}

            <button
              type="button"
              onClick={() =>
                setSortMode((value) =>
                  value === "asc"
                    ? "preserve"
                    : "asc",
                )
              }
              className={`rounded-full border px-3.5 py-2 text-[8px] font-semibold transition ${
                sortMode === "asc"
                  ? "border-[#52685d]/20 bg-[#52685d] text-white"
                  : "border-black/[.08] text-black/31 hover:bg-white/45"
              }`}
            >
              键名排序
            </button>
          </div>
        </section>

        <section className="yaml-intro mt-7 grid gap-7 xl:grid-cols-[.72fr_1.28fr]">
          <aside className="min-w-0">
            <div className="overflow-hidden rounded-[26px] border border-black/[.075] bg-white/24">
              <div className="border-b border-black/[.06] px-5 py-4">
                <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">
                  STRUCTURE PROFILE
                </div>
                <p className="mt-2 text-[9px] leading-5 text-black/35">
                  {result.error
                    ? "解析失败，请检查当前输入格式。"
                    : input.trim()
                      ? "结构有效，转换结果已实时更新。"
                      : "等待输入内容。"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-px bg-black/[.06]">
                {[
                  ["根类型", stats.rootType],
                  ["节点数", formatNumber(stats.nodes)],
                  ["输入字符", formatNumber(stats.inputChars)],
                  ["输出字符", formatNumber(stats.outputChars)],
                  ["输入体积", humanBytes(stats.inputBytes)],
                  ["输出体积", humanBytes(stats.outputBytes)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="bg-[#f3f0e8]/92 p-4"
                  >
                    <div className="text-[8px] text-black/24">
                      {label}
                    </div>
                    <div className="yaml-num mt-2 break-all font-mono text-[13px] font-semibold text-black/61">
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              {result.error && (
                <div className="border-t border-black/[.06] px-5 py-4">
                  <div className="text-[8px] font-semibold tracking-[.12em] text-[#965744]">
                    PARSE ERROR
                  </div>
                  <p className="mt-2 break-words font-mono text-[9px] leading-5 text-[#965744]">
                    {result.error}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 rounded-[24px] border border-black/[.075] bg-white/24 p-5">
              <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">
                QUICK ACTIONS
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setInput(
                      mode === "json2yaml"
                        ? JSON_SAMPLE
                        : YAML_SAMPLE,
                    )
                  }
                  className="rounded-full border border-black/[.085] px-4 py-2.5 text-[8px] font-semibold text-black/35 transition hover:bg-white/45"
                >
                  示例
                </button>

                <button
                  type="button"
                  onClick={paste}
                  className="rounded-full border border-black/[.085] px-4 py-2.5 text-[8px] font-semibold text-black/35 transition hover:bg-white/45"
                >
                  粘贴
                </button>

                <button
                  type="button"
                  onClick={() => setInput("")}
                  className="rounded-full px-4 py-2.5 text-[8px] font-semibold text-[#965744] transition hover:bg-[#965744]/8"
                >
                  清空
                </button>
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="grid gap-px overflow-hidden rounded-[30px] border border-black/[.075] bg-black/[.07] lg:grid-cols-2">
              <div className="min-w-0 bg-[#f4f1e9]">
                <div className="flex h-12 items-center justify-between border-b border-black/[.065] px-5">
                  <span className="text-[8px] font-semibold tracking-[.13em] text-black/26">
                    {mode === "json2yaml"
                      ? "JSON INPUT"
                      : "YAML INPUT"}
                  </span>
                  <span className="yaml-num font-mono text-[8px] text-black/22">
                    {formatNumber(stats.inputChars)} chars
                  </span>
                </div>

                <textarea
                  value={input}
                  onChange={(event) =>
                    setInput(event.target.value)
                  }
                  spellCheck={false}
                  className="yaml-scroll block h-[570px] w-full resize-none bg-transparent p-5 font-mono text-[11px] leading-6 text-[#292b26] outline-none placeholder:text-black/16 sm:p-6"
                  placeholder={
                    mode === "json2yaml"
                      ? "粘贴 JSON…"
                      : "粘贴 YAML…"
                  }
                />
              </div>

              <div
                ref={outputRef}
                className="min-w-0 bg-[#151714]"
              >
                <div className="flex h-12 items-center justify-between border-b border-white/[.065] px-5">
                  <span className="text-[8px] font-semibold tracking-[.13em] text-white/27">
                    {mode === "json2yaml"
                      ? "YAML OUTPUT"
                      : "JSON OUTPUT"}
                  </span>
                  <span className="text-[8px] text-white/18">
                    {result.error
                      ? "INVALID"
                      : "LIVE"}
                  </span>
                </div>

                <pre className="yaml-dark-scroll h-[570px] overflow-auto whitespace-pre-wrap break-words p-5 font-mono text-[10px] leading-6 text-[#cbd8cd] sm:p-6">
                  {result.error
                    ? result.error
                    : result.output ||
                      "输出会显示在这里。"}
                </pre>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-[8px] text-black/25">
                {clientDuration !== null
                  ? `${clientDuration.toFixed(2)}ms`
                  : "live conversion"}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    copy(
                      result.output,
                      "output",
                    )
                  }
                  disabled={!result.output}
                  className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white transition disabled:opacity-30"
                >
                  {copied === "output"
                    ? "✓ 已复制"
                    : "复制输出"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!result.output) return
                    setInput(result.output)
                    setMode((current) =>
                      current === "json2yaml"
                        ? "yaml2json"
                        : "json2yaml",
                    )
                  }}
                  disabled={!result.output}
                  className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 transition hover:bg-white/40 disabled:opacity-30"
                >
                  结果 → 反向输入
                </button>

                <button
                  type="button"
                  onClick={() =>
                    downloadText(
                      result.output,
                      mode === "json2yaml"
                        ? "bitleap.yaml"
                        : "bitleap.json",
                    )
                  }
                  disabled={!result.output}
                  className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 transition hover:bg-white/40 disabled:opacity-30"
                >
                  导出
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="yaml-intro mt-12 grid gap-9 border-t border-black/10 pt-8 lg:grid-cols-[.55fr_1.45fr]">
          <div>
            <div className="text-[9px] font-semibold tracking-[.14em] text-black/25">
              REPORT
            </div>
            <h2 className="mt-3 text-[clamp(30px,4vw,46px)] font-semibold leading-[1.06] tracking-[-.045em]">
              转换记录，
              <br />
              顺手带走。
            </h2>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  copy(report, "report")
                }
                disabled={!result.output}
                className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white disabled:opacity-30"
              >
                {copied === "report"
                  ? "✓ 已复制报告"
                  : "复制报告"}
              </button>

              <button
                type="button"
                onClick={() =>
                  downloadText(
                    report,
                    "bitleap-yaml-json-report.txt",
                  )
                }
                disabled={!result.output}
                className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 disabled:opacity-30"
              >
                导出报告
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-[25px] border border-black/[.08] bg-[#171916]">
            <div className="border-b border-white/[.07] px-5 py-3 text-[8px] tracking-[.13em] text-white/25">
              STRUCTURE REPORT
            </div>

            <pre className="yaml-dark-scroll max-h-[390px] overflow-auto whitespace-pre-wrap break-words p-5 font-mono text-[11px] leading-7 text-[#c7d3c7] sm:p-6">
              {result.output
                ? report
                : "等待输入…"}
            </pre>
          </div>
        </section>

        <div className="mt-12 border-t border-black/[.08] pt-5">
          <FooterNote />
        </div>
      </div>
    </div>
  )
}
