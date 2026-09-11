"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type CopyKey = "input" | "output" | "operation" | "report" | OperationId | null
type OperationId =
  | "htmlEscape"
  | "htmlUnescape"
  | "jsEscape"
  | "jsUnescape"
  | "jsonStringify"
  | "jsonParseString"
  | "urlEncode"
  | "urlDecode"
  | "urlComponentEncode"
  | "urlComponentDecode"
  | "cssEscape"
  | "regexEscape"
  | "unicodeEscape"
  | "unicodeUnescape"
  | "base64Encode"
  | "base64Decode"
  | "csvEscape"
  | "sqlEscape"

type Operation = {
  id: OperationId
  label: string
  category: string
  desc: string
  transform: (input: string) => TransformResult
}

type TransformResult = {
  value: string
  error: string
  warning?: string
}

const SAMPLE = `<div class="card">hello "world" & 你好</div>
path: C:\Users\demo\file.txt
url: https://bitleap.dev/search?q=a b&lang=zh`

const OPERATIONS: Operation[] = [
  {
    id: "htmlEscape",
    label: "HTML 转义",
    category: "HTML",
    desc: "把 &, <, >, 引号转成 HTML entity，适合展示用户输入。",
    transform: (input) => ok(htmlEscape(input)),
  },
  {
    id: "htmlUnescape",
    label: "HTML 反转义",
    category: "HTML",
    desc: "把常见命名实体、十进制实体和十六进制实体还原。",
    transform: (input) => ok(htmlUnescape(input)),
  },
  {
    id: "jsEscape",
    label: "JS 字符串转义",
    category: "JavaScript",
    desc: "输出可放进 JS 双引号字符串里的内容。",
    transform: (input) => ok(jsEscape(input)),
  },
  {
    id: "jsUnescape",
    label: "JS 字符串反转义",
    category: "JavaScript",
    desc: "把 \\n、\\t、\\uXXXX、\\\" 等 JS 转义序列还原。",
    transform: (input) => jsUnescape(input),
  },
  {
    id: "jsonStringify",
    label: "JSON 字符串化",
    category: "JSON",
    desc: "把输入包装成合法 JSON string，包含外层双引号。",
    transform: (input) => ok(JSON.stringify(input)),
  },
  {
    id: "jsonParseString",
    label: "JSON 字符串解析",
    category: "JSON",
    desc: "解析完整 JSON string，例如 \"hello\\nworld\"。",
    transform: (input) => parseJsonString(input),
  },
  {
    id: "urlEncode",
    label: "URL 编码",
    category: "URL",
    desc: "使用 encodeURI，保留 : / ? & = 等 URL 结构字符。",
    transform: (input) => safeEncode(input, encodeURI),
  },
  {
    id: "urlDecode",
    label: "URL 解码",
    category: "URL",
    desc: "使用 decodeURI，还原 URL 中的转义字符。",
    transform: (input) => safeDecode(input, decodeURI),
  },
  {
    id: "urlComponentEncode",
    label: "URL 参数编码",
    category: "URL",
    desc: "使用 encodeURIComponent，适合 query 参数值。",
    transform: (input) => safeEncode(input, encodeURIComponent),
  },
  {
    id: "urlComponentDecode",
    label: "URL 参数解码",
    category: "URL",
    desc: "使用 decodeURIComponent，并把 + 当作空格处理。",
    transform: (input) => safeDecode(input.replace(/\+/g, " "), decodeURIComponent),
  },
  {
    id: "cssEscape",
    label: "CSS 字符串转义",
    category: "CSS",
    desc: "转义反斜杠、引号、换行和控制字符，适合 CSS content。",
    transform: (input) => ok(cssStringEscape(input)),
  },
  {
    id: "regexEscape",
    label: "正则特殊字符转义",
    category: "Regex",
    desc: "把 .*+?^${}()|[]\\ 等正则元字符转成字面量。",
    transform: (input) => ok(regexEscape(input)),
  },
  {
    id: "unicodeEscape",
    label: "Unicode 转义",
    category: "Unicode",
    desc: "把非 ASCII 字符转成 \\uXXXX 或 \\u{XXXXX}。",
    transform: (input) => ok(unicodeEscape(input)),
  },
  {
    id: "unicodeUnescape",
    label: "Unicode 反转义",
    category: "Unicode",
    desc: "还原 \\u4F60、\\u{1F600}、\\x41 等转义序列。",
    transform: (input) => unicodeUnescape(input),
  },
  {
    id: "base64Encode",
    label: "Base64 编码",
    category: "Base64",
    desc: "按 UTF-8 编码后转 Base64。",
    transform: (input) => base64Encode(input),
  },
  {
    id: "base64Decode",
    label: "Base64 解码",
    category: "Base64",
    desc: "把 Base64 / URL-safe Base64 按 UTF-8 解码为文本。",
    transform: (input) => base64Decode(input),
  },
  {
    id: "csvEscape",
    label: "CSV 单元格转义",
    category: "Data",
    desc: "把文本转成 CSV 单元格安全格式。",
    transform: (input) => ok(csvEscape(input)),
  },
  {
    id: "sqlEscape",
    label: "SQL 字符串转义",
    category: "Data",
    desc: "把单引号加倍，输出 SQL 字符串字面量。",
    transform: (input) => ok(`'${input.replace(/'/g, "''")}'`, "仅用于普通字符串字面量。生产环境请优先使用参数化查询。"),
  },
]

const QUICK_INPUTS = [
  {
    label: "HTML",
    value: `<button onclick="alert('x')">Save & Close</button>`,
  },
  {
    label: "JS",
    value: `hello
"world" \\ tab\tend`,
  },
  {
    label: "URL",
    value: "https://bitleap.dev/search?q=hello world&lang=zh-CN",
  },
  {
    label: "Unicode",
    value: "你好，BitLeap 🚀",
  },
  {
    label: "Regex",
    value: "a+b*(test)?.[demo]",
  },
  {
    label: "CSV",
    value: 'hello, "world"\nnew line',
  },
]

function ok(value: string, warning = ""): TransformResult {
  return {
    value,
    error: "",
    warning,
  }
}

function fail(message: string): TransformResult {
  return {
    value: "",
    error: message,
  }
}

function formatNumber(value: number) {
  const sign = value < 0 ? "-" : ""
  const raw = String(Math.abs(value))
  const [integer, decimal] = raw.split(".")
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return `${sign}${grouped}${decimal ? `.${decimal}` : ""}`
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).length
}

function htmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00A0",
  copy: "©",
  reg: "®",
  trade: "™",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
}

function htmlUnescape(value: string) {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]+);/g, (entity, body: string) => {
    if (body[0] === "#") {
      const isHex = body[1]?.toLowerCase() === "x"
      const raw = isHex ? body.slice(2) : body.slice(1)
      const codePoint = Number.parseInt(raw, isHex ? 16 : 10)

      if (!Number.isFinite(codePoint)) return entity

      try {
        return String.fromCodePoint(codePoint)
      } catch {
        return entity
      }
    }

    return HTML_ENTITIES[body] ?? entity
  })
}

function jsEscape(value: string) {
  return JSON.stringify(value).slice(1, -1)
}

function jsUnescape(value: string): TransformResult {
  try {
    const wrapped = `"${value.replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r")}"`
    const parsed = JSON.parse(wrapped)

    return ok(String(parsed))
  } catch {
    return fail("JS 字符串反转义失败：请检查反斜杠、引号或 Unicode 转义序列。")
  }
}

function parseJsonString(value: string): TransformResult {
  try {
    const parsed = JSON.parse(value)

    if (typeof parsed !== "string") {
      return fail("输入必须是完整 JSON string，例如 \"hello\"。")
    }

    return ok(parsed)
  } catch {
    return fail("JSON string 解析失败：请输入完整 JSON 字符串，例如 \"hello\"。")
  }
}

function safeEncode(value: string, encoder: (value: string) => string): TransformResult {
  try {
    return ok(encoder(value))
  } catch {
    return fail("编码失败：输入中包含当前编码器无法处理的字符。")
  }
}

function safeDecode(value: string, decoder: (value: string) => string): TransformResult {
  try {
    return ok(decoder(value))
  } catch {
    return fail("解码失败：存在不完整或非法的转义片段。")
  }
}

function cssStringEscape(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\A ")
    .replace(/\r/g, "")
    .replace(/\f/g, "\\C ")
    .replace(/\t/g, "\\9 ")
}

function regexEscape(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function unicodeEscape(value: string) {
  return Array.from(value)
    .map((char) => {
      const codePoint = char.codePointAt(0) ?? 0

      if (codePoint >= 0x20 && codePoint <= 0x7e) return char
      if (codePoint <= 0xffff) return `\\u${codePoint.toString(16).padStart(4, "0").toUpperCase()}`
      return `\\u{${codePoint.toString(16).toUpperCase()}}`
    })
    .join("")
}

function unicodeUnescape(value: string): TransformResult {
  try {
    const output = value
      .replace(/\\u\{([0-9a-fA-F]+)\}/g, (match, hex: string) => {
        const codePoint = Number.parseInt(hex, 16)
        try {
          return String.fromCodePoint(codePoint)
        } catch {
          return match
        }
      })
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)))
      .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)))

    return ok(output)
  } catch {
    return fail("Unicode 反转义失败：请检查 \\uXXXX、\\u{XXXXX} 或 \\xXX 格式。")
  }
}

function base64Encode(value: string): TransformResult {
  try {
    const bytes = new TextEncoder().encode(value)
    let binary = ""
    const chunkSize = 0x8000

    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
    }

    return ok(btoa(binary))
  } catch {
    return fail("Base64 编码失败：当前输入无法按 UTF-8 转换。")
  }
}

function normalizeBase64(value: string) {
  const cleaned = value.trim().replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/")
  if (!cleaned) return ""
  if (/[^A-Za-z0-9+/=]/.test(cleaned)) return ""
  if (/=/.test(cleaned.slice(0, -2))) return ""
  if (cleaned.length % 4 === 1) return ""
  return cleaned.padEnd(Math.ceil(cleaned.length / 4) * 4, "=")
}

function base64Decode(value: string): TransformResult {
  const normalized = normalizeBase64(value)

  if (!normalized) {
    return fail("Base64 解码失败：请输入合法的 Base64 字符串。")
  }

  try {
    const binary = atob(normalized)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return ok(new TextDecoder().decode(bytes))
  } catch {
    return fail("Base64 解码失败：请输入合法的 Base64 字符串。")
  }
}

function csvEscape(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }

  return value
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

function StatBox({
  label,
  value,
  tone = "ink",
}: {
  label: string
  value: string
  tone?: "ink" | "green" | "gold" | "rose"
}) {
  const toneClass = tone === "green" ? "text-[#52685d]" : tone === "gold" ? "text-[#9b7542]" : tone === "rose" ? "text-[#965744]" : "text-black/61"

  return (
    <div className="bg-[#f3f0e8]/92 p-4">
      <div className="text-[7px] font-semibold tracking-[.12em] text-black/23">{label}</div>
      <div className={`escape-num mt-3 break-all font-mono text-[13px] font-semibold ${toneClass}`}>{value}</div>
    </div>
  )
}

function ResultBlock({
  label,
  value,
  active,
  error,
  onClick,
  onCopy,
  copied,
}: {
  label: string
  value: string
  active: boolean
  error: string
  onClick: () => void
  onCopy: () => void
  copied: boolean
}) {
  return (
    <article className={`group rounded-[22px] border p-4 transition ${active ? "border-[#22231f]/20 bg-[#22231f] text-white" : "border-black/[.075] bg-white/24 hover:bg-white/45"}`}>
      <button type="button" onClick={onClick} className="block w-full text-left">
        <div className="flex items-center justify-between gap-3">
          <span className={`text-[8px] font-semibold tracking-[.13em] ${active ? "text-white/28" : "text-black/24"}`}>{label}</span>
          <span className={`text-[8px] ${error ? "text-[#d49a88]" : active ? "text-[#8fb69b]" : "text-[#52685d]"}`}>{error ? "ERROR" : "READY"}</span>
        </div>
        <pre className={`mt-3 max-h-[122px] overflow-auto whitespace-pre-wrap break-all rounded-[16px] p-3 font-mono text-[10px] leading-5 ${active ? "bg-white/[.055] text-[#cbd8cd]" : "bg-[#151714] text-[#cbd8cd]"}`}>{error || value || "（空）"}</pre>
      </button>
      <div className="mt-3 flex justify-end">
        <button type="button" onClick={onCopy} disabled={!value || Boolean(error)} className={`rounded-full px-3 py-2 text-[8px] font-semibold transition disabled:opacity-25 ${active ? "border border-white/[.08] text-white/30 hover:bg-white hover:text-[#151714]" : "border border-black/[.08] text-black/31 hover:bg-[#22231f] hover:text-white"}`}>{copied ? "✓ COPIED" : "COPY"}</button>
      </div>
    </article>
  )
}

export default function EscapeToolPage() {
  const [input, setInput] = useState(SAMPLE)
  const [activeOperationId, setActiveOperationId] = useState<OperationId>("htmlEscape")
  const [copied, setCopied] = useState<CopyKey>(null)
  const [category, setCategory] = useState("全部")

  const pageRef = useRef<HTMLDivElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  const categories = useMemo(() => ["全部", ...Array.from(new Set(OPERATIONS.map((operation) => operation.category)))], [])
  const visibleOperations = useMemo(() => OPERATIONS.filter((operation) => category === "全部" || operation.category === category), [category])
  const activeOperation = useMemo(() => OPERATIONS.find((operation) => operation.id === activeOperationId) ?? OPERATIONS[0], [activeOperationId])
  const results = useMemo(
    () =>
      OPERATIONS.map((operation) => ({
        operation,
        result: operation.transform(input),
      })),
    [input],
  )
  const activeResult = useMemo(() => activeOperation.transform(input), [activeOperation, input])
  const allOutput = useMemo(
    () =>
      results
        .map(({ operation, result }) => {
          const body = result.error ? `ERROR: ${result.error}` : result.value
          return `# ${operation.label}\n${body}`
        })
        .join("\n\n"),
    [results],
  )
  const report = useMemo(
    () =>
      [
        "BitLeap String Escape Studio",
        "",
        `当前操作：${activeOperation.label}`,
        `分类：${activeOperation.category}`,
        `说明：${activeOperation.desc}`,
        "",
        "输入：",
        input || "（空）",
        "",
        "输出：",
        activeResult.error ? `ERROR: ${activeResult.error}` : activeResult.value || "（空）",
        activeResult.warning ? `\n提示：${activeResult.warning}` : "",
        "",
        "全部结果：",
        allOutput,
      ].join("\n"),
    [activeOperation, activeResult, allOutput, input],
  )

  const stats = useMemo(
    () => ({
      inputChars: input.length,
      inputBytes: byteLength(input),
      outputChars: activeResult.value.length,
      outputBytes: byteLength(activeResult.value),
      operations: OPERATIONS.length,
      categories: categories.length - 1,
    }),
    [activeResult.value, categories.length, input],
  )

  useEffect(() => {
    if (!pageRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      gsap.from(".escape-intro", {
        y: 22,
        opacity: 0,
        duration: 0.78,
        stagger: 0.055,
        ease: "power3.out",
      })

      gsap.to(".escape-orbit-a", {
        rotation: 360,
        duration: 70,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })

      gsap.to(".escape-orbit-b", {
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
    if (!outputRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

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
  }, [activeOperationId, activeResult.value, activeResult.error])

  const copy = async (value: string, key: CopyKey) => {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {}
  }

  const clearAll = () => {
    setInput("")
    setCopied(null)
  }

  const swapOutputToInput = () => {
    if (activeResult.error) return
    setInput(activeResult.value)
  }

  return (
    <div ref={pageRef} className="min-h-screen overflow-hidden bg-[#efede6] text-[#22231f] selection:bg-[#22231f] selection:text-white">
      <style>{`
        .escape-scroll::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }

        .escape-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .escape-scroll::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(34,35,31,.13);
        }

        .escape-dark-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,.14);
        }

        .escape-grid {
          background-image:
            linear-gradient(rgba(34,35,31,.032) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,35,31,.032) 1px, transparent 1px);
          background-size: 30px 30px;
        }

        .escape-num {
          font-variant-numeric: tabular-nums lining-nums;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_9%,rgba(178,151,91,.10),transparent_27%),radial-gradient(circle_at_8%_88%,rgba(73,107,91,.08),transparent_31%)]" />
        <div className="escape-orbit-a absolute right-[-20vw] top-[-24vw] h-[58vw] w-[58vw] rounded-full border border-black/[.04]">
          <span className="absolute left-[15%] top-[43%] h-2 w-2 rounded-full bg-[#b28d48]/38" />
        </div>
        <div className="escape-orbit-b absolute bottom-[-26vw] left-[-19vw] h-[53vw] w-[53vw] rounded-full border border-black/[.032]">
          <span className="absolute right-[14%] top-[31%] h-1.5 w-1.5 rounded-full bg-[#52685d]/35" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1580px] px-5 pb-10 pt-6 sm:px-8">
        <div className="escape-intro">
          <Breadcrumb />
        </div>

        <header className="escape-intro mt-8 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/27">STRING ESCAPE STUDIO</div>
            <h1 className="mt-4 max-w-[900px] text-[clamp(48px,6.35vw,90px)] font-semibold leading-[1.03] tracking-[-.055em]">
              把字符串，
              <br />
              放进正确语境。
            </h1>
          </div>

          <div>
            <p className="max-w-[560px] text-[11px] leading-6 text-black/40">
              HTML、JavaScript、JSON、URL、CSS、Regex、Unicode、Base64、CSV、SQL 常用转义与反转义。实时处理，本地完成，适合调试复制、模板拼接和数据清洗。
            </p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[8px] text-black/25">
              <span>{OPERATIONS.length} OPERATIONS</span>
              <span>{stats.categories} CATEGORIES</span>
              <span>LIVE TRANSFORM</span>
              <span>LOCAL ONLY</span>
            </div>
          </div>
        </header>

        <section className="escape-intro mt-7 grid gap-7 xl:grid-cols-[.66fr_1.34fr]">
          <aside className="min-w-0">
            <div className="rounded-[28px] border border-black/[.075] bg-white/24 p-5">
              <div className="text-[8px] font-semibold tracking-[.14em] text-black/24">OPERATIONS</div>
              <h2 className="mt-3 text-[clamp(30px,3.5vw,46px)] font-semibold leading-none tracking-[-.045em]">选择转换。</h2>

              <div className="mt-6 flex flex-wrap gap-1.5">
                {categories.map((item) => (
                  <button key={item} type="button" onClick={() => setCategory(item)} className={`rounded-full px-3.5 py-2 text-[8px] font-semibold transition ${category === item ? "bg-[#22231f] text-white" : "text-black/32 hover:bg-white/45 hover:text-black"}`}>{item}</button>
                ))}
              </div>

              <div className="escape-scroll mt-5 max-h-[430px] space-y-2 overflow-auto pr-1">
                {visibleOperations.map((operation) => (
                  <button key={operation.id} type="button" onClick={() => setActiveOperationId(operation.id)} className={`w-full rounded-[20px] border p-4 text-left transition ${activeOperationId === operation.id ? "border-[#22231f]/15 bg-[#22231f] text-white" : "border-black/[.08] bg-white/22 hover:bg-white/48"}`}>
                    <div className="flex items-center justify-between gap-3">
                      <span className={`font-mono text-[8px] font-semibold ${activeOperationId === operation.id ? "text-white/32" : "text-black/25"}`}>{operation.category}</span>
                      <span className={`text-[8px] ${activeOperationId === operation.id ? "text-white/24" : "text-black/23"}`}>{operation.id}</span>
                    </div>
                    <div className={`mt-2 text-[14px] font-semibold tracking-[-.03em] ${activeOperationId === operation.id ? "text-white" : "text-black/70"}`}>{operation.label}</div>
                    <p className={`mt-2 text-[8px] leading-4 ${activeOperationId === operation.id ? "text-white/32" : "text-black/30"}`}>{operation.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-[24px] border border-black/[.075] bg-white/24">
              <div className="border-b border-black/[.06] px-5 py-4">
                <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">TEXT PROFILE</div>
                <p className="mt-2 text-[9px] leading-5 text-black/35">{activeResult.error ? "当前转换失败，请检查输入格式。" : activeOperation.desc}</p>
              </div>

              <div className="grid grid-cols-2 gap-px bg-black/[.06]">
                <StatBox label="INPUT CHARS" value={formatNumber(stats.inputChars)} />
                <StatBox label="INPUT BYTES" value={formatNumber(stats.inputBytes)} />
                <StatBox label="OUTPUT CHARS" value={formatNumber(stats.outputChars)} tone="green" />
                <StatBox label="OUTPUT BYTES" value={formatNumber(stats.outputBytes)} tone="green" />
              </div>

              {(activeResult.error || activeResult.warning) && (
                <div className="border-t border-black/[.06] px-5 py-4">
                  <div className={`text-[8px] font-semibold tracking-[.12em] ${activeResult.error ? "text-[#965744]" : "text-[#9b7542]"}`}>{activeResult.error ? "ERROR" : "NOTE"}</div>
                  <p className={`mt-2 break-words text-[9px] leading-5 ${activeResult.error ? "text-[#965744]" : "text-[#9b7542]"}`}>{activeResult.error || activeResult.warning}</p>
                </div>
              )}
            </div>

            <div className="mt-4 rounded-[24px] border border-black/[.075] bg-white/24 p-5">
              <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">SAMPLES</div>
              <div className="mt-4 flex flex-wrap gap-2">
                {QUICK_INPUTS.map((item) => (
                  <button key={item.label} type="button" onClick={() => setInput(item.value)} className="rounded-full border border-black/[.085] px-3.5 py-2 text-[8px] font-semibold text-black/35 transition hover:bg-white/45 hover:text-black">{item.label}</button>
                ))}
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="flex flex-col gap-4 border-b border-black/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-[8px] font-semibold tracking-[.14em] text-black/23">WORKBENCH</div>
                <h2 className="mt-2 text-[clamp(31px,4vw,48px)] font-semibold leading-none tracking-[-.045em]">{activeOperation.label}</h2>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => copy(activeResult.value, "output")} disabled={!activeResult.value || Boolean(activeResult.error)} className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white transition hover:scale-[1.01] active:scale-[.98] disabled:opacity-30">{copied === "output" ? "✓ 已复制" : "复制结果"}</button>
                <button type="button" onClick={swapOutputToInput} disabled={!activeResult.value || Boolean(activeResult.error)} className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 transition hover:bg-white/40 disabled:opacity-30">结果转输入</button>
              </div>
            </div>

            <div className="mt-5 grid gap-px overflow-hidden rounded-[30px] border border-black/[.08] bg-black/[.08] lg:grid-cols-[.92fr_1.08fr]">
              <div className="bg-[#f4f1e9]">
                <div className="flex h-12 items-center justify-between border-b border-black/[.065] px-5">
                  <span className="text-[8px] font-semibold tracking-[.13em] text-black/26">INPUT</span>
                  <span className="escape-num font-mono text-[8px] text-black/22">{formatNumber(stats.inputChars)} chars</span>
                </div>

                <textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} className="escape-scroll block h-[520px] w-full resize-none bg-transparent p-5 font-mono text-[11px] leading-6 text-[#292b26] outline-none placeholder:text-black/16 sm:p-6" placeholder="输入待处理文本..." />

                <div className="flex flex-wrap items-center gap-2 border-t border-black/[.06] px-5 py-4">
                  <button type="button" onClick={() => copy(input, "input")} disabled={!input} className="rounded-full border border-black/[.085] px-3.5 py-2.5 text-[8px] font-semibold text-black/35 transition hover:bg-white/45 disabled:opacity-30">{copied === "input" ? "✓ 已复制输入" : "复制输入"}</button>
                  <button type="button" onClick={clearAll} className="rounded-full px-3.5 py-2.5 text-[8px] font-semibold text-[#965744] transition hover:bg-[#965744]/8">清空</button>
                </div>
              </div>

              <div ref={outputRef} className="bg-[#151714]">
                <div className="flex h-12 items-center justify-between border-b border-white/[.065] px-5">
                  <span className="text-[8px] font-semibold tracking-[.13em] text-white/27">ACTIVE OUTPUT</span>
                  <span className={`text-[8px] ${activeResult.error ? "text-[#d49a88]" : "text-[#8fb69b]"}`}>{activeResult.error ? "ERROR" : "READY"}</span>
                </div>

                <pre className="escape-dark-scroll h-[520px] overflow-auto whitespace-pre-wrap break-all p-5 font-mono text-[11px] leading-6 text-[#cbd8cd] sm:p-6">{activeResult.error || activeResult.value || "（空）"}</pre>

                <div className="flex flex-wrap items-center gap-2 border-t border-white/[.06] px-5 py-4">
                  <button type="button" onClick={() => copy(activeResult.value, "operation")} disabled={!activeResult.value || Boolean(activeResult.error)} className="rounded-full bg-white px-4 py-2.5 text-[8px] font-semibold text-[#151714] transition disabled:opacity-30">{copied === "operation" ? "✓ COPIED" : "COPY"}</button>
                  <span className="text-[8px] text-white/18">{activeOperation.desc}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="escape-intro mt-12 grid gap-7 border-t border-black/10 pt-8 lg:grid-cols-[.56fr_1.44fr]">
          <div>
            <div className="text-[9px] font-semibold tracking-[.14em] text-black/25">ALL RESULTS</div>
            <h2 className="mt-3 text-[clamp(30px,4vw,46px)] font-semibold leading-[1.06] tracking-[-.045em]">
              同一段文本，
              <br />
              多种语境。
            </h2>
            <p className="mt-5 max-w-[390px] text-[9px] leading-5 text-black/34">
              下方会同时显示所有转换结果。点击任意结果卡片可设为主输出，适合快速比较 HTML、JS、URL、Regex 等不同转义规则。
            </p>
          </div>

          <div className="escape-scroll max-h-[560px] overflow-auto pr-1">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {results.map(({ operation, result }) => (
                <ResultBlock key={operation.id} label={operation.label} value={result.value} active={operation.id === activeOperationId} error={result.error} onClick={() => setActiveOperationId(operation.id)} onCopy={() => copy(result.value, operation.id)} copied={copied === operation.id} />
              ))}
            </div>
          </div>
        </section>

        <section className="escape-intro mt-12 grid gap-9 border-t border-black/10 pt-8 lg:grid-cols-[.55fr_1.45fr]">
          <div>
            <div className="text-[9px] font-semibold tracking-[.14em] text-black/25">REPORT</div>
            <h2 className="mt-3 text-[clamp(30px,4vw,46px)] font-semibold leading-[1.06] tracking-[-.045em]">
              输入、输出，
              <br />
              一起保存。
            </h2>
            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" onClick={() => copy(report, "report")} className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white">{copied === "report" ? "✓ 已复制报告" : "复制报告"}</button>
              <button type="button" onClick={() => downloadText(report, "bitleap-string-escape-report.txt")} className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 transition hover:bg-white/40">导出报告</button>
            </div>
          </div>

          <div className="overflow-hidden rounded-[25px] border border-black/[.08] bg-[#171916]">
            <div className="flex items-center justify-between border-b border-white/[.07] px-5 py-3">
              <span className="text-[8px] tracking-[.13em] text-white/25">ESCAPE PROFILE</span>
              <span className="text-[8px] text-white/17">LOCAL TRANSFORM</span>
            </div>
            <pre className="escape-dark-scroll max-h-[390px] overflow-auto whitespace-pre-wrap break-words p-5 font-mono text-[11px] leading-7 text-[#c7d3c7] sm:p-6">{report}</pre>
          </div>
        </section>

        <section className="escape-intro mt-12 grid gap-8 border-t border-black/10 pt-7 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">HTML ORDER</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">HTML 转义会先处理 &，反转义会支持命名实体和数字实体，避免 &amp;lt; 这类嵌套内容被错误提前还原。</p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">CONTEXT MATTERS</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">HTML、JS、URL、CSS、Regex 的“安全字符”并不相同。复制前先确认字符串最终会放进哪个语境。</p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">SQL NOTE</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">SQL 字符串转义只适合展示普通字面量。真实数据库写入请优先使用参数化查询，不要拼接用户输入。</p>
          </div>
        </section>

        <div className="mt-12 border-t border-black/[.08] pt-5">
          <FooterNote />
        </div>
      </div>
    </div>
  )
}
