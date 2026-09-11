"use client"

import type { ReactNode } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { format } from "sql-formatter"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type Mode = "format" | "minify"
type Dialect = "mysql" | "postgresql" | "sqlite" | "bigquery" | "tsql" | "plsql" | "spark"
type KeywordCase = "preserve" | "upper" | "lower"
type CopyKey = "output" | "report" | null

type FormatResult = {
  output: string
  error: string
  duration: number
}

const SAMPLE_SQL = `select u.id,u.name,u.email,count(o.id) as order_count
from user u
left join orders o on o.user_id=u.id
where u.age>10 and u.status='active'
group by u.id,u.name,u.email
having count(o.id)>2
order by order_count desc;`

const DIALECTS: Array<{
  value: Dialect
  label: string
}> = [
  { value: "mysql", label: "MySQL" },
  { value: "postgresql", label: "PostgreSQL" },
  { value: "sqlite", label: "SQLite" },
  { value: "bigquery", label: "BigQuery" },
  { value: "tsql", label: "T-SQL" },
  { value: "plsql", label: "PL/SQL" },
  { value: "spark", label: "Spark" },
]

const KEYWORDS = new Set([
  "select",
  "from",
  "where",
  "join",
  "left",
  "right",
  "inner",
  "outer",
  "full",
  "on",
  "and",
  "or",
  "group",
  "by",
  "order",
  "having",
  "limit",
  "offset",
  "insert",
  "into",
  "values",
  "update",
  "set",
  "delete",
  "create",
  "table",
  "alter",
  "drop",
  "case",
  "when",
  "then",
  "else",
  "end",
  "as",
  "distinct",
  "union",
  "all",
  "with",
  "returning",
  "over",
  "partition",
])

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

function countLines(value: string) {
  if (!value) return 0
  return value.split(/\r?\n/).length
}

function countStatements(value: string) {
  const withoutComments = value
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--.*$/gm, "")

  let statements = 0
  let inSingle = false
  let inDouble = false
  let inBacktick = false

  for (let index = 0; index < withoutComments.length; index++) {
    const char = withoutComments[index]
    const previous = withoutComments[index - 1]

    if (char === "'" && !inDouble && !inBacktick && previous !== "\\") {
      inSingle = !inSingle
    } else if (char === '"' && !inSingle && !inBacktick && previous !== "\\") {
      inDouble = !inDouble
    } else if (char === "`" && !inSingle && !inDouble) {
      inBacktick = !inBacktick
    } else if (char === ";" && !inSingle && !inDouble && !inBacktick) {
      statements++
    }
  }

  if (withoutComments.trim() && !withoutComments.trim().endsWith(";")) {
    statements++
  }

  return statements
}

function minifySqlSafely(sql: string, stripComments: boolean) {
  let output = ""
  let pendingSpace = false
  let quote: "'" | '"' | "`" | null = null
  let lineComment = false
  let blockComment = false

  const appendSpace = () => {
    if (!output || output.endsWith(" ")) return
    pendingSpace = true
  }

  for (let index = 0; index < sql.length; index++) {
    const char = sql[index]
    const next = sql[index + 1]
    const previous = sql[index - 1]

    if (lineComment) {
      if (char === "\n") {
        lineComment = false
        if (!stripComments) appendSpace()
      } else if (!stripComments) {
        output += char
      }
      continue
    }

    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false
        if (!stripComments) output += "*/"
        index++
        appendSpace()
      } else if (!stripComments) {
        output += char
      }
      continue
    }

    if (quote) {
      output += char

      if (char === quote && previous !== "\\") {
        if (quote === "'" && next === "'") {
          output += next
          index++
        } else {
          quote = null
        }
      }

      continue
    }

    if (char === "-" && next === "-") {
      if (!stripComments) {
        if (pendingSpace) {
          output += " "
          pendingSpace = false
        }
        output += "--"
      }
      lineComment = true
      index++
      continue
    }

    if (char === "/" && next === "*") {
      if (!stripComments) {
        if (pendingSpace) {
          output += " "
          pendingSpace = false
        }
        output += "/*"
      }
      blockComment = true
      index++
      continue
    }

    if (char === "'" || char === '"' || char === "`") {
      if (pendingSpace) {
        output += " "
        pendingSpace = false
      }
      quote = char
      output += char
      continue
    }

    if (/\s/.test(char)) {
      appendSpace()
      continue
    }

    if (pendingSpace) {
      const noSpaceBefore = ",.;)".includes(char)
      const noSpaceAfter = "(".includes(output[output.length - 1] ?? "")
      if (!noSpaceBefore && !noSpaceAfter) output += " "
      pendingSpace = false
    }

    output += char
  }

  return output.trim()
}

function runFormatter(
  input: string,
  mode: Mode,
  dialect: Dialect,
  keywordCase: KeywordCase,
  tabWidth: number,
  linesBetweenQueries: number,
  stripComments: boolean,
): FormatResult {
  if (!input.trim()) {
    return {
      output: "",
      error: "",
      duration: 0,
    }
  }

  const started = performance.now()

  try {
    if (mode === "minify") {
      return {
        output: minifySqlSafely(input, stripComments),
        error: "",
        duration: performance.now() - started,
      }
    }

    const output = format(input, {
      language: dialect,
      keywordCase,
      tabWidth,
      linesBetweenQueries,
    } as any)

    return {
      output,
      error: "",
      duration: performance.now() - started,
    }
  } catch (error) {
    return {
      output: "",
      error:
        error instanceof Error
          ? error.message
          : String(error),
      duration: performance.now() - started,
    }
  }
}

function HighlightedSql({ value }: { value: string }) {
  const nodes: ReactNode[] = []
  const tokenPattern =
    /(--.*?$|\/\*[\s\S]*?\*\/|'(?:''|[^'])*'|"(?:\\"|[^"])*"|`[^`]*`|\b\d+(?:\.\d+)?\b|\b[a-z_][a-z0-9_]*\b)/gim

  let cursor = 0
  let match: RegExpExecArray | null

  while ((match = tokenPattern.exec(value)) !== null) {
    if (match.index > cursor) {
      nodes.push(
        <span key={`plain-${cursor}`} className="text-white/48">
          {value.slice(cursor, match.index)}
        </span>,
      )
    }

    const token = match[0]
    const lower = token.toLowerCase()
    let className = "text-white/54"

    if (token.startsWith("--") || token.startsWith("/*")) {
      className = "text-white/22"
    } else if (
      token.startsWith("'") ||
      token.startsWith('"') ||
      token.startsWith("`")
    ) {
      className = "text-[#d1b875]"
    } else if (/^\d/.test(token)) {
      className = "text-[#9eb6dc]"
    } else if (KEYWORDS.has(lower)) {
      className = "text-[#9ac7a7]"
    }

    nodes.push(
      <span key={`token-${match.index}`} className={className}>
        {token}
      </span>,
    )

    cursor = match.index + token.length
  }

  if (cursor < value.length) {
    nodes.push(
      <span key="tail" className="text-white/48">
        {value.slice(cursor)}
      </span>,
    )
  }

  return <>{nodes}</>
}

export default function SqlFormatPage() {
  const [input, setInput] = useState(SAMPLE_SQL)
  const [mode, setMode] = useState<Mode>("format")
  const [dialect, setDialect] = useState<Dialect>("mysql")
  const [keywordCase, setKeywordCase] = useState<KeywordCase>("upper")
  const [tabWidth, setTabWidth] = useState(2)
  const [linesBetweenQueries, setLinesBetweenQueries] = useState(1)
  const [stripComments, setStripComments] = useState(false)
  const [copied, setCopied] = useState<CopyKey>(null)

  const pageRef = useRef<HTMLDivElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  const result = useMemo(
    () =>
      runFormatter(
        input,
        mode,
        dialect,
        keywordCase,
        tabWidth,
        linesBetweenQueries,
        stripComments,
      ),
    [
      dialect,
      input,
      keywordCase,
      linesBetweenQueries,
      mode,
      stripComments,
      tabWidth,
    ],
  )

  const stats = useMemo(
    () => ({
      inputChars: input.length,
      inputLines: countLines(input),
      inputBytes: byteLength(input),
      outputChars: result.output.length,
      outputLines: countLines(result.output),
      statements: countStatements(input),
      compression:
        input.length && result.output.length
          ? Math.round((result.output.length / input.length) * 100)
          : 0,
    }),
    [input, result.output],
  )

  const report = useMemo(
    () =>
      [
        "BitLeap SQL Studio",
        "",
        `模式：${mode === "format" ? "格式化" : "压缩"}`,
        `方言：${dialect}`,
        `关键字：${keywordCase}`,
        `输入字符：${stats.inputChars}`,
        `输出字符：${stats.outputChars}`,
        `语句数量：${stats.statements}`,
        "",
        result.output || "暂无输出",
      ].join("\n"),
    [dialect, keywordCase, mode, result.output, stats],
  )

  useEffect(() => {
    if (
      !pageRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    const ctx = gsap.context(() => {
      gsap.from(".sql-intro", {
        y: 22,
        opacity: 0,
        duration: 0.78,
        stagger: 0.055,
        ease: "power3.out",
      })

      gsap.to(".sql-orbit-a", {
        rotation: 360,
        duration: 70,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })

      gsap.to(".sql-orbit-b", {
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
      { opacity: 0.62, y: 5 },
      {
        opacity: 1,
        y: 0,
        duration: 0.24,
        ease: "power2.out",
        overwrite: true,
      },
    )
  }, [result.output, result.error, mode])

  const copy = async (value: string, key: CopyKey) => {
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
      if (value) setInput(value)
    } catch {}
  }

  const download = (content: string, filename: string) => {
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

  return (
    <div ref={pageRef} className="min-h-screen overflow-hidden bg-[#efede6] text-[#22231f] selection:bg-[#22231f] selection:text-white">
      <style>{`
        .sql-scroll::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }

        .sql-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .sql-scroll::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(34,35,31,.13);
        }

        .sql-dark-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,.14);
        }

        .sql-grid {
          background-image:
            linear-gradient(rgba(34,35,31,.032) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,35,31,.032) 1px, transparent 1px);
          background-size: 30px 30px;
        }

        .sql-num {
          font-variant-numeric: tabular-nums lining-nums;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_9%,rgba(178,151,91,.10),transparent_27%),radial-gradient(circle_at_8%_88%,rgba(73,107,91,.08),transparent_31%)]" />
        <div className="sql-orbit-a absolute right-[-20vw] top-[-24vw] h-[58vw] w-[58vw] rounded-full border border-black/[.04]">
          <span className="absolute left-[15%] top-[43%] h-2 w-2 rounded-full bg-[#b28d48]/38" />
        </div>
        <div className="sql-orbit-b absolute bottom-[-26vw] left-[-19vw] h-[53vw] w-[53vw] rounded-full border border-black/[.032]">
          <span className="absolute right-[14%] top-[31%] h-1.5 w-1.5 rounded-full bg-[#52685d]/35" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1580px] px-5 pb-10 pt-6 sm:px-8">
        <div className="sql-intro">
          <Breadcrumb />
        </div>

        <header className="sql-intro mt-8 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/27">
              SQL STUDIO
            </div>
            <h1 className="mt-4 max-w-[900px] text-[clamp(48px,6.35vw,90px)] font-semibold leading-[1.03] tracking-[-.055em]">
              把查询，
              <br />
              排成秩序。
            </h1>
          </div>

          <div>
            <p className="max-w-[560px] text-[11px] leading-6 text-black/40">
              格式化、压缩和检查 SQL 文本。支持多种 SQL 方言、关键字大小写、缩进宽度和安全压缩，适合调试查询、整理日志和提交前清理。
            </p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[8px] text-black/25">
              <span>SQL-FORMATTER</span>
              <span>LOCAL ONLY</span>
              <span>{dialect.toUpperCase()}</span>
              <span>{mode === "format" ? "BEAUTIFY" : "MINIFY"}</span>
            </div>
          </div>
        </header>

        <section className="sql-intro mt-6 flex flex-col gap-4 border-b border-black/10 pb-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {(["format", "minify"] as Mode[]).map((value) => (
              <button key={value} type="button" onClick={() => setMode(value)} className={`rounded-full px-4 py-2.5 text-[9px] font-semibold transition ${mode === value ? "bg-[#22231f] text-white" : "text-black/34 hover:bg-white/45 hover:text-black"}`}>
                {value === "format" ? "格式化美化" : "压缩为一行"}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {DIALECTS.map((item) => (
              <button key={item.value} type="button" onClick={() => setDialect(item.value)} className={`rounded-full border px-3.5 py-2 text-[8px] font-semibold transition ${dialect === item.value ? "border-[#52685d]/20 bg-[#52685d] text-white" : "border-black/[.08] text-black/31 hover:bg-white/45"}`}>
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <section className="sql-intro mt-7 grid gap-7 xl:grid-cols-[.72fr_1.28fr]">
          <aside className="min-w-0">
            <div className="rounded-[28px] border border-black/[.075] bg-white/24 p-5">
              <div className="text-[8px] font-semibold tracking-[.14em] text-black/24">
                OPTIONS
              </div>
              <h2 className="mt-3 text-[clamp(30px,3.5vw,46px)] font-semibold leading-none tracking-[-.045em]">
                输出规则。
              </h2>

              <div className="mt-6 space-y-5">
                <div>
                  <div className="mb-2 text-[8px] font-semibold tracking-[.12em] text-black/24">
                    KEYWORD CASE
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(["preserve", "upper", "lower"] as KeywordCase[]).map((value) => (
                      <button key={value} type="button" onClick={() => setKeywordCase(value)} disabled={mode === "minify"} className={`rounded-full px-3.5 py-2 font-mono text-[8px] font-semibold transition disabled:opacity-25 ${keywordCase === value ? "bg-[#22231f] text-white" : "text-black/32 hover:bg-white/45 hover:text-black"}`}>
                        {value}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label>
                    <span className="mb-2 block text-[8px] text-black/24">
                      缩进宽度
                    </span>
                    <input type="number" min={2} max={8} value={tabWidth} onChange={(event) => setTabWidth(Math.max(2, Math.min(8, Number(event.target.value) || 2)))} disabled={mode === "minify"} className="w-full rounded-full border border-black/[.08] bg-white/35 px-4 py-3 font-mono text-[10px] outline-none disabled:opacity-30" />
                  </label>

                  <label>
                    <span className="mb-2 block text-[8px] text-black/24">
                      语句间隔
                    </span>
                    <input type="number" min={0} max={3} value={linesBetweenQueries} onChange={(event) => setLinesBetweenQueries(Math.max(0, Math.min(3, Number(event.target.value) || 0)))} disabled={mode === "minify"} className="w-full rounded-full border border-black/[.08] bg-white/35 px-4 py-3 font-mono text-[10px] outline-none disabled:opacity-30" />
                  </label>
                </div>

                <button type="button" onClick={() => setStripComments((value) => !value)} className={`rounded-full border px-3.5 py-2 text-[8px] font-semibold transition ${stripComments ? "border-[#52685d]/20 bg-[#52685d] text-white" : "border-black/[.085] text-black/34 hover:bg-white/45 hover:text-black"}`}>
                  压缩时删除注释
                </button>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-[24px] border border-black/[.075] bg-white/24">
              <div className="border-b border-black/[.06] px-5 py-4">
                <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">
                  SQL PROFILE
                </div>
                <p className="mt-2 text-[9px] leading-5 text-black/35">
                  {result.error ? "格式化失败，请检查 SQL 语法或方言。" : mode === "format" ? "已生成可读格式化结果。" : "已安全压缩空白，尽量保留字符串内容。"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-px bg-black/[.06]">
                {[
                  ["输入行数", formatNumber(stats.inputLines)],
                  ["输出行数", formatNumber(stats.outputLines)],
                  ["语句数量", formatNumber(stats.statements)],
                  ["输入体积", humanBytes(stats.inputBytes)],
                  ["输出字符", formatNumber(stats.outputChars)],
                  ["耗时", result.duration ? `${result.duration.toFixed(1)}ms` : "—"],
                ].map(([label, value]) => (
                  <div key={label} className="bg-[#f3f0e8]/92 p-4">
                    <div className="text-[8px] text-black/24">{label}</div>
                    <div className="sql-num mt-2 break-all font-mono text-[13px] font-semibold text-black/61">{value}</div>
                  </div>
                ))}
              </div>

              {result.error && (
                <div className="border-t border-black/[.06] px-5 py-4">
                  <div className="text-[8px] font-semibold tracking-[.12em] text-[#965744]">
                    FORMAT ERROR
                  </div>
                  <p className="mt-2 break-words font-mono text-[9px] leading-5 text-[#965744]">
                    {result.error}
                  </p>
                </div>
              )}
            </div>
          </aside>

          <div className="min-w-0">
            <div className="flex flex-col gap-4 border-b border-black/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-[8px] font-semibold tracking-[.14em] text-black/23">
                  WORKSPACE
                </div>
                <h2 className="mt-2 text-[clamp(31px,4vw,48px)] font-semibold leading-none tracking-[-.045em]">
                  左边写，右边看。
                </h2>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setInput(SAMPLE_SQL)} className="rounded-full border border-black/[.085] px-4 py-2.5 text-[9px] font-semibold text-black/36 transition hover:bg-white/45 hover:text-black">
                  示例
                </button>
                <button type="button" onClick={paste} className="rounded-full border border-black/[.085] px-4 py-2.5 text-[9px] font-semibold text-black/36 transition hover:bg-white/45 hover:text-black">
                  粘贴
                </button>
                <button type="button" onClick={() => setInput("")} className="rounded-full px-4 py-2.5 text-[9px] font-semibold text-[#965744] transition hover:bg-[#965744]/8">
                  清空
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-px overflow-hidden rounded-[30px] border border-black/[.075] bg-black/[.07] lg:grid-cols-2">
              <div className="min-w-0 bg-[#f4f1e9]">
                <div className="flex h-12 items-center justify-between border-b border-black/[.065] px-5">
                  <span className="text-[8px] font-semibold tracking-[.13em] text-black/26">SQL INPUT</span>
                  <span className="sql-num font-mono text-[8px] text-black/22">{formatNumber(stats.inputChars)} chars</span>
                </div>
                <textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} placeholder="粘贴 SQL 查询……" className="sql-scroll block h-[520px] w-full resize-none bg-transparent p-5 font-mono text-[11px] leading-6 text-[#292b26] outline-none placeholder:text-black/16 sm:p-6" />
              </div>

              <div ref={outputRef} className="min-w-0 bg-[#151714]">
                <div className="flex h-12 items-center justify-between border-b border-white/[.065] px-5">
                  <span className="text-[8px] font-semibold tracking-[.13em] text-white/27">SQL OUTPUT</span>
                  <span className="sql-num font-mono text-[8px] text-white/18">{mode === "format" ? "FORMATTED" : "MINIFIED"}</span>
                </div>
                <pre className="sql-dark-scroll h-[520px] overflow-auto whitespace-pre-wrap break-words p-5 font-mono text-[11px] leading-6 sm:p-6">
                  {result.output ? <HighlightedSql value={result.output} /> : <span className="text-white/18">输出会显示在这里。</span>}
                </pre>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-[8px] text-black/25">
                <span>{mode === "minify" ? `${stats.compression}% length` : `${stats.outputLines} output lines`}</span>
                <span>{dialect}</span>
                <span>{result.error ? "invalid" : "ready"}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => copy(result.output, "output")} disabled={!result.output} className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white transition hover:scale-[1.01] active:scale-[.98] disabled:opacity-30">
                  {copied === "output" ? "✓ 已复制" : "复制输出"}
                </button>
                <button type="button" onClick={() => setInput(result.output)} disabled={!result.output} className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 transition hover:bg-white/40 disabled:opacity-30">
                  结果 → 输入
                </button>
                <button type="button" onClick={() => download(result.output, "bitleap.sql")} disabled={!result.output} className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 transition hover:bg-white/40 disabled:opacity-30">
                  导出 SQL
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="sql-intro mt-12 grid gap-9 border-t border-black/10 pt-8 lg:grid-cols-[.55fr_1.45fr]">
          <div>
            <div className="text-[9px] font-semibold tracking-[.14em] text-black/25">REPORT</div>
            <h2 className="mt-3 text-[clamp(30px,4vw,46px)] font-semibold leading-[1.06] tracking-[-.045em]">
              格式化记录，
              <br />
              一起带走。
            </h2>
            <p className="mt-5 max-w-[360px] text-[9px] leading-5 text-black/34">
              适合整理 SQL 日志、接口调试结果、数据库迁移片段和代码审查中的查询语句。
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" onClick={() => copy(report, "report")} disabled={!result.output} className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white transition hover:scale-[1.01] active:scale-[.98] disabled:opacity-30">
                {copied === "report" ? "✓ 已复制报告" : "复制报告"}
              </button>
              <button type="button" onClick={() => download(report, "bitleap-sql-report.txt")} disabled={!result.output} className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 transition hover:bg-white/40 disabled:opacity-30">
                导出报告
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-[25px] border border-black/[.08] bg-[#171916]">
            <div className="flex items-center justify-between border-b border-white/[.07] px-5 py-3">
              <span className="text-[8px] tracking-[.13em] text-white/25">SQL PROFILE</span>
              <span className="text-[8px] text-white/17">LOCAL FORMAT</span>
            </div>
            <pre className="sql-dark-scroll max-h-[390px] overflow-auto whitespace-pre-wrap break-words p-5 font-mono text-[11px] leading-7 text-[#c7d3c7] sm:p-6">
              {result.output ? report : "等待输入…"}
            </pre>
          </div>
        </section>

        <section className="sql-intro mt-12 grid gap-8 border-t border-black/10 pt-7 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">DIALECT</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              支持常见 SQL 方言切换，减少 MySQL、PostgreSQL、BigQuery 等语法格式差异带来的误判。
            </p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">SAFE MINIFY</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              压缩模式不会简单全局替换空白，字符串内部内容会尽量保持原样，避免破坏 SQL 字面量。
            </p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">LOCAL ONLY</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              格式化和压缩都在浏览器中完成，不需要上传查询内容，适合处理敏感调试语句。
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
