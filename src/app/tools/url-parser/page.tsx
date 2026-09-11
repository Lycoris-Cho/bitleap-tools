"use client"

import type { ChangeEvent } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { statusCodes, suspiciousParams } from "./data"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type TabId = "parse" | "codec" | "status" | "builder"
type CopyKey = "url" | "query" | "json" | "curl" | "fetch" | "report" | "codec" | "builder" | string | null
type CodecMode = "component" | "uri" | "plus"
type RiskLevel = "info" | "warn" | "danger"
type BuilderRow = { id: string; key: string; value: string; enabled: boolean }
type StatusItem = { code: number | string; name: string; category: string; description: string; commonCause: string }
type ParsedParam = { id: string; index: number; key: string; rawKey: string; value: string; rawValue: string; decoded: string; warnings: RiskWarning[]; duplicateCount: number }
type RiskWarning = { level: RiskLevel; label: string; detail: string }
type ParsedUrl = {
  normalizedInput: string
  href: string
  origin: string
  protocol: string
  host: string
  hostname: string
  port: string
  username: string
  hasPassword: boolean
  pathname: string
  hash: string
  params: ParsedParam[]
  warnings: RiskWarning[]
  segments: string[]
}

const STATUS_CODES = statusCodes as StatusItem[]
const SUSPICIOUS_PARAMS = suspiciousParams as Record<string, string>

const SAMPLE_URLS = [
  "https://api.example.com/v1/search?q=BitLeap%20Tools&page=2&debug=true",
  "https://shop.example.com/checkout?sku=pro-plan&coupon=SUMMER&redirect=https%3A%2F%2Fexample.com%2Fthanks",
  "https://example.com/login?user=admin&token=abc123&next=%2Fdashboard#section",
]

const DEFAULT_ROWS: BuilderRow[] = [
  { id: "row-1", key: "q", value: "BitLeap Tools", enabled: true },
  { id: "row-2", key: "page", value: "1", enabled: true },
  { id: "row-3", key: "utm_source", value: "site", enabled: false },
]

function safeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value.replace(/\+/g, "%20"))
  } catch {
    return value
  }
}

function normalizeInput(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ""
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function isLikelyUrlValue(value: string) {
  const decoded = safeDecode(value)
  return /^https?:\/\//i.test(decoded) || /^\/\//.test(decoded)
}

function isBase64ish(value: string) {
  const compact = value.replace(/=+$/, "")
  return compact.length >= 24 && /^[a-zA-Z0-9+/_-]+$/.test(compact)
}

function buildWarningsForParam(key: string, decoded: string, rawValue: string): RiskWarning[] {
  const lowerKey = key.toLowerCase()
  const warnings: RiskWarning[] = []
  const configured = SUSPICIOUS_PARAMS[lowerKey]

  if (configured) {
    warnings.push({ level: "warn", label: "敏感参数", detail: configured })
  }

  if (/(token|secret|password|passwd|pwd|auth|session|jwt|key|credential)/i.test(lowerKey)) {
    warnings.push({ level: "danger", label: "凭据风险", detail: "URL 中的凭据可能出现在日志、Referer 或浏览器历史记录中。" })
  }

  if (/(redirect|return|next|url|callback|continue|target)/i.test(lowerKey) && isLikelyUrlValue(decoded || rawValue)) {
    warnings.push({ level: "warn", label: "跳转参数", detail: "该参数像跳转目标，接入时建议校验白名单。" })
  }

  if (/<script|javascript:|onerror=|onload=/i.test(decoded)) {
    warnings.push({ level: "danger", label: "脚本片段", detail: "参数中包含脚本或事件处理片段，展示到页面前需要转义。" })
  }

  if (decoded.length > 512) {
    warnings.push({ level: "info", label: "长参数", detail: "参数值较长，可能是序列化数据、追踪字段或编码后的 payload。" })
  }

  if (isBase64ish(decoded)) {
    warnings.push({ level: "info", label: "疑似编码串", detail: "值看起来像 Base64 / Base64URL，可进一步解码确认内容。" })
  }

  if (!key) {
    warnings.push({ level: "warn", label: "空键名", detail: "该查询项没有键名，部分服务端解析器会忽略它。" })
  }

  if (!decoded) {
    warnings.push({ level: "info", label: "空值", detail: "该参数值为空，确认接口是否把空值与缺失参数区分处理。" })
  }

  return warnings
}

function parseRawParams(query: string) {
  if (!query) return []
  const raw = query.startsWith("?") ? query.slice(1) : query
  if (!raw) return []

  const pieces = raw.split("&")
  const keyCounts = pieces.reduce<Record<string, number>>((acc, piece) => {
    const eqIndex = piece.indexOf("=")
    const rawKey = eqIndex >= 0 ? piece.slice(0, eqIndex) : piece
    const key = safeDecode(rawKey)
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  return pieces.map((piece, index) => {
    const eqIndex = piece.indexOf("=")
    const rawKey = eqIndex >= 0 ? piece.slice(0, eqIndex) : piece
    const rawValue = eqIndex >= 0 ? piece.slice(eqIndex + 1) : ""
    const key = safeDecode(rawKey)
    const decoded = safeDecode(rawValue)
    const duplicateCount = keyCounts[key] ?? 1
    const warnings = buildWarningsForParam(key, decoded, rawValue)

    if (duplicateCount > 1) {
      warnings.push({ level: "info", label: "重复键", detail: `同名参数出现 ${duplicateCount} 次，后端解析策略可能不同。` })
    }

    return {
      id: `${index}-${rawKey}`,
      index,
      key,
      rawKey,
      value: rawValue,
      rawValue,
      decoded,
      warnings,
      duplicateCount,
    }
  })
}

function parseUrl(input: string): { parsed: ParsedUrl | null; error: string } {
  const normalizedInput = normalizeInput(input)
  if (!normalizedInput) return { parsed: null, error: "请输入 URL。" }

  try {
    const url = new URL(normalizedInput)
    const params = parseRawParams(url.search)
    const warnings: RiskWarning[] = []

    if (url.username || url.password) {
      warnings.push({ level: "danger", label: "URL 凭据", detail: "URL 中包含 username 或 password，建议移除并改用 Header / Cookie。" })
    }

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      warnings.push({ level: "warn", label: "非常规协议", detail: "该 URL 不是 HTTP(S)，复制到请求代码前需要确认使用场景。" })
    }

    if (url.protocol === "http:") {
      warnings.push({ level: "warn", label: "非 HTTPS", detail: "HTTP 明文传输不适合承载登录态、token 或用户隐私数据。" })
    }

    if (params.some((param) => param.warnings.some((warning) => warning.level === "danger"))) {
      warnings.push({ level: "danger", label: "高风险参数", detail: "查询参数中疑似包含凭据或脚本片段。" })
    }

    return {
      parsed: {
        normalizedInput,
        href: url.href,
        origin: url.origin,
        protocol: url.protocol.replace(":", ""),
        host: url.host,
        hostname: url.hostname,
        port: url.port,
        username: url.username,
        hasPassword: Boolean(url.password),
        pathname: url.pathname,
        hash: url.hash,
        params,
        warnings,
        segments: url.pathname.split("/").filter(Boolean),
      },
      error: "",
    }
  } catch {
    return { parsed: null, error: "URL 无法解析，请检查协议、域名或特殊字符。" }
  }
}

function paramsToObject(params: ParsedParam[]) {
  return params.reduce<Record<string, string | string[]>>((acc, param) => {
    const key = param.key || `(empty-${param.index})`
    const value = param.decoded
    const current = acc[key]

    if (Array.isArray(current)) {
      current.push(value)
    } else if (typeof current === "string") {
      acc[key] = [current, value]
    } else {
      acc[key] = value
    }

    return acc
  }, {})
}

function paramsToQuery(params: ParsedParam[]) {
  return params.map((param) => `${encodeURIComponent(param.key)}=${encodeURIComponent(param.decoded)}`).join("&")
}

function curlSnippet(parsed: ParsedUrl | null) {
  if (!parsed) return ""
  return `curl '${parsed.href.replace(/'/g, "'\\''")}'`
}

function fetchSnippet(parsed: ParsedUrl | null) {
  if (!parsed) return ""
  return [
    `const response = await fetch("${parsed.href}", {`,
    "  method: \"GET\",",
    "  headers: {",
    "    \"Accept\": \"application/json\",",
    "  },",
    "})",
    "",
    "const data = await response.json()",
  ].join("\n")
}

function buildCodec(input: string, mode: CodecMode) {
  if (!input) {
    return {
      encoded: "",
      decoded: "",
      plusDecoded: "",
      error: "",
    }
  }

  const encoded = mode === "uri" ? encodeURI(input) : mode === "plus" ? encodeURIComponent(input).replace(/%20/g, "+") : encodeURIComponent(input)
  let decoded = ""
  let plusDecoded = ""
  let error = ""

  try {
    decoded = decodeURIComponent(input)
  } catch {
    error = "decodeURIComponent 解码失败：输入可能包含不完整的百分号编码。"
  }

  try {
    plusDecoded = decodeURIComponent(input.replace(/\+/g, "%20"))
  } catch {
    if (!error) error = "Plus 解码失败：输入可能包含不完整的百分号编码。"
  }

  return { encoded, decoded, plusDecoded, error }
}

function buildUrl(base: string, rows: BuilderRow[], hash: string) {
  const normalized = normalizeInput(base || "https://example.com")
  try {
    const url = new URL(normalized)
    url.search = ""
    rows.filter((row) => row.enabled && row.key.trim()).forEach((row) => url.searchParams.append(row.key, row.value))
    url.hash = hash.trim().replace(/^#/, "")
    return url.href
  } catch {
    return ""
  }
}

function statusTone(category: string) {
  if (category === "成功") return "border-[#6FA27E]/25 bg-[#6FA27E]/9 text-[#C9E9D0]"
  if (category === "重定向") return "border-[#7AA3FF]/25 bg-[#7AA3FF]/9 text-[#C8D6FF]"
  if (category === "客户端错误") return "border-[#F0BE65]/28 bg-[#F0BE65]/10 text-[#F4D391]"
  if (category === "服务端错误") return "border-[#D98B79]/25 bg-[#D98B79]/10 text-[#FFB9AA]"
  return "border-white/[.08] bg-white/[.035] text-white/60"
}

function warningTone(level: RiskLevel) {
  if (level === "danger") return "border-[#D98B79]/25 bg-[#D98B79]/12 text-[#FFB9AA]"
  if (level === "warn") return "border-[#F0BE65]/25 bg-[#F0BE65]/12 text-[#F4D391]"
  return "border-[#7AA3FF]/22 bg-[#7AA3FF]/10 text-[#C8D6FF]"
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

function StatBox({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: string
  tone?: "default" | "green" | "gold" | "rose"
}) {
  const color = tone === "green" ? "text-[#8FE6AE]" : tone === "gold" ? "text-[#F3C872]" : tone === "rose" ? "text-[#FFB9AA]" : "text-white/72"

  return (
    <div className="rounded-[20px] border border-white/[.075] bg-white/[.035] p-4">
      <div className="text-[7px] font-semibold tracking-[.15em] text-white/21">{label}</div>
      <div className={`url-num mt-3 truncate font-mono text-[13px] font-semibold ${color}`}>{value}</div>
    </div>
  )
}

function Toggle({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`rounded-full border px-3.5 py-2 text-[8px] font-semibold transition ${active ? "border-[#52685D]/20 bg-[#52685D] text-white" : "border-black/[.085] text-black/34 hover:bg-white/45 hover:text-black"}`}>
      {label}
    </button>
  )
}

function DarkCopyBlock({
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
    <article className="border-t border-white/[.07] py-4 first:border-t-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[8px] font-semibold tracking-[.14em] text-white/22">{label}</span>
        <button type="button" onClick={onCopy} className="text-[8px] font-semibold text-white/28 transition hover:text-white">{copied ? "✓ COPIED" : "COPY"}</button>
      </div>
      <pre className="url-dark-scroll max-h-44 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-5 text-[#CBD8CD]">{value || "—"}</pre>
    </article>
  )
}

export default function UrlParser() {
  const [activeTab, setActiveTab] = useState<TabId>("parse")
  const [input, setInput] = useState(SAMPLE_URLS[0])
  const [parseError, setParseError] = useState("")
  const [manualParsed, setManualParsed] = useState<ParsedUrl | null>(null)
  const [codecInput, setCodecInput] = useState("name=BitLeap%20Tools&redirect=https%3A%2F%2Fexample.com")
  const [codecMode, setCodecMode] = useState<CodecMode>("component")
  const [statusFilter, setStatusFilter] = useState("全部")
  const [statusSearch, setStatusSearch] = useState("")
  const [builderBase, setBuilderBase] = useState("https://api.example.com/search")
  const [builderHash, setBuilderHash] = useState("")
  const [builderRows, setBuilderRows] = useState<BuilderRow[]>(DEFAULT_ROWS)
  const [copied, setCopied] = useState<CopyKey>(null)

  const pageRef = useRef<HTMLDivElement>(null)
  const parsed = useMemo(() => {
    const result = parseUrl(input)
    return result.parsed
  }, [input])
  const activeParsed = manualParsed ?? parsed
  const codec = useMemo(() => buildCodec(codecInput, codecMode), [codecInput, codecMode])
  const queryJson = useMemo(() => (activeParsed ? JSON.stringify(paramsToObject(activeParsed.params), null, 2) : ""), [activeParsed])
  const rebuiltQuery = useMemo(() => (activeParsed ? paramsToQuery(activeParsed.params) : ""), [activeParsed])
  const curl = useMemo(() => curlSnippet(activeParsed), [activeParsed])
  const fetchCode = useMemo(() => fetchSnippet(activeParsed), [activeParsed])
  const builderUrl = useMemo(() => buildUrl(builderBase, builderRows, builderHash), [builderBase, builderHash, builderRows])
  const statusCategories = useMemo(() => ["全部", ...Array.from(new Set(STATUS_CODES.map((item) => item.category)))], [])
  const filteredStatuses = useMemo(() => {
    const keyword = statusSearch.trim().toLowerCase()
    return STATUS_CODES.filter((item) => {
      const categoryMatch = statusFilter === "全部" || item.category === statusFilter
      const text = `${item.code} ${item.name} ${item.category} ${item.description} ${item.commonCause}`.toLowerCase()
      return categoryMatch && (!keyword || text.includes(keyword))
    })
  }, [statusFilter, statusSearch])

  const allWarnings = useMemo(() => {
    if (!activeParsed) return []
    return [...activeParsed.warnings, ...activeParsed.params.flatMap((param) => param.warnings)]
  }, [activeParsed])

  const report = useMemo(
    () =>
      [
        "BitLeap URL Intelligence Studio",
        "",
        `URL: ${activeParsed?.href ?? "—"}`,
        `Protocol: ${activeParsed?.protocol ?? "—"}`,
        `Host: ${activeParsed?.host ?? "—"}`,
        `Path: ${activeParsed?.pathname ?? "—"}`,
        `Hash: ${activeParsed?.hash || "—"}`,
        `Params: ${activeParsed?.params.length ?? 0}`,
        `Warnings: ${allWarnings.length}`,
        "",
        "Query JSON:",
        queryJson || "—",
        "",
        "cURL:",
        curl || "—",
        "",
        "Fetch:",
        fetchCode || "—",
      ].join("\n"),
    [activeParsed, allWarnings.length, curl, fetchCode, queryJson],
  )

  useEffect(() => {
    if (!pageRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      gsap.from(".url-intro", {
        opacity: 0,
        y: 18,
        duration: 0.72,
        stagger: 0.055,
        ease: "power3.out",
      })

      gsap.to(".url-orbit", {
        rotation: 360,
        duration: 96,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })
    }, pageRef)

    return () => ctx.revert()
  }, [])

  const parseNow = () => {
    const result = parseUrl(input)
    setManualParsed(result.parsed)
    setParseError(result.error)
  }

  const copy = async (text: string, key: CopyKey) => {
    if (!text) return

    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {}
  }

  const resetParser = () => {
    setInput(SAMPLE_URLS[0])
    setManualParsed(null)
    setParseError("")
    setCopied(null)
  }

  const importRowsFromParsed = () => {
    if (!activeParsed) return
    setBuilderBase(`${activeParsed.origin}${activeParsed.pathname}`)
    setBuilderHash(activeParsed.hash)
    setBuilderRows(
      activeParsed.params.map((param) => ({
        id: safeId(),
        key: param.key,
        value: param.decoded,
        enabled: true,
      })),
    )
    setActiveTab("builder")
  }

  const patchRow = (id: string, patch: Partial<BuilderRow>) => {
    setBuilderRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  const removeRow = (id: string) => {
    setBuilderRows((current) => (current.length <= 1 ? current : current.filter((row) => row.id !== id)))
  }

  const addRow = () => {
    setBuilderRows((current) => [...current, { id: safeId(), key: "", value: "", enabled: true }])
  }

  const loadBuilderToParser = () => {
    if (!builderUrl) return
    setInput(builderUrl)
    setManualParsed(parseUrl(builderUrl).parsed)
    setActiveTab("parse")
  }

  const handleStatusImport = (event: ChangeEvent<HTMLInputElement>) => {
    setStatusSearch(event.target.value)
  }

  return (
    <div ref={pageRef} className="min-h-screen overflow-hidden bg-[#F0EEE8] text-[#22231F] selection:bg-[#22231F] selection:text-white">
      <style>{`
        .url-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
        .url-scroll::-webkit-scrollbar-track { background: transparent; }
        .url-scroll::-webkit-scrollbar-thumb { background: rgba(34,35,31,.13); border-radius: 999px; }
        .url-dark-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.14); border-radius: 999px; }
        .url-num { font-variant-numeric: tabular-nums lining-nums; }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_84%_10%,rgba(178,141,72,.08),transparent_25%),radial-gradient(circle_at_8%_88%,rgba(82,104,93,.08),transparent_29%)]" />
        <div className="url-orbit absolute right-[-18vw] top-[-22vw] h-[56vw] w-[56vw] rounded-full border border-black/[.035]">
          <span className="absolute left-[18%] top-[44%] h-2 w-2 rounded-full bg-[#52685D]/30" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1680px] px-5 pb-10 pt-6 sm:px-8">
        <div className="url-intro">
          <Breadcrumb />
        </div>

        <header className="url-intro mt-8 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.74fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/25">URL INTELLIGENCE STUDIO</div>
            <h1 className="mt-4 text-[clamp(48px,6.2vw,88px)] font-semibold leading-[1.01] tracking-[-.058em]">
              拆开 URL，
              <br />
              看清每个信号。
            </h1>
          </div>

          <div>
            <p className="max-w-[590px] text-[11px] leading-6 text-black/40">
              把 URL 参数解析、编解码、请求片段导出、Query Builder 和 HTTP 状态码速查合成一个轻量工作台。所有处理都在浏览器本地完成。
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {SAMPLE_URLS.map((sample, index) => (
                <button key={sample} type="button" onClick={() => { setInput(sample); setManualParsed(parseUrl(sample).parsed); setActiveTab("parse") }} className="rounded-full border border-black/[.08] px-3.5 py-2 text-[8px] font-semibold text-black/34 transition hover:bg-white/50 hover:text-black">
                  SAMPLE {index + 1}
                </button>
              ))}
            </div>
          </div>
        </header>

        <section className="url-intro mt-7 grid gap-5 xl:grid-cols-[250px_1fr]">
          <aside className="min-w-0">
            <div className="sticky top-6 overflow-hidden rounded-[30px] border border-black/[.08] bg-[#151714]">
              <div className="border-b border-white/[.06] px-5 py-4">
                <div className="text-[8px] font-semibold tracking-[.14em] text-white/22">WORKSPACE</div>
              </div>

              <div className="p-3">
                {[
                  { id: "parse", label: "URL Inspector", desc: "拆解与风险提示" },
                  { id: "codec", label: "Codec Bench", desc: "Encode / Decode" },
                  { id: "builder", label: "Query Builder", desc: "组装请求 URL" },
                  { id: "status", label: "Status Atlas", desc: "状态码速查" },
                ].map((item) => (
                  <button key={item.id} type="button" onClick={() => setActiveTab(item.id as TabId)} className={`mb-2 block w-full rounded-[20px] border p-4 text-left transition ${activeTab === item.id ? "border-white/[.12] bg-white text-[#151714]" : "border-white/[.06] bg-white/[.03] text-white/48 hover:bg-white/[.07] hover:text-white"}`}>
                    <div className="text-[11px] font-semibold tracking-[-.02em]">{item.label}</div>
                    <div className={`mt-1 text-[8px] ${activeTab === item.id ? "text-black/36" : "text-white/24"}`}>{item.desc}</div>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-px border-t border-white/[.06] bg-white/[.06]">
                <StatBox label="PARAMS" value={String(activeParsed?.params.length ?? 0)} tone="green" />
                <StatBox label="WARNINGS" value={String(allWarnings.length)} tone={allWarnings.some((item) => item.level === "danger") ? "rose" : "gold"} />
                <StatBox label="STATUS" value={String(STATUS_CODES.length)} />
                <StatBox label="HASH" value={activeParsed?.hash ? "yes" : "no"} />
              </div>
            </div>
          </aside>

          <main className="min-w-0">
            {activeTab === "parse" && (
              <div className="grid gap-5">
                <section className="overflow-hidden rounded-[34px] border border-black/[.08] bg-[#151714]">
                  <div className="border-b border-white/[.06] px-5 py-4">
                    <div className="text-[8px] font-semibold tracking-[.13em] text-white/22">URL COMMAND LINE</div>
                  </div>
                  <div className="p-5">
                    <div className="flex flex-col gap-3 lg:flex-row">
                      <input value={input} onChange={(event) => { setInput(event.target.value); setManualParsed(null); setParseError("") }} onKeyDown={(event) => event.key === "Enter" && parseNow()} placeholder="https://example.com/path?name=value" className="min-w-0 flex-1 rounded-[24px] border border-white/[.08] bg-white/[.04] px-5 py-4 font-mono text-[12px] text-white outline-none transition placeholder:text-white/18 focus:border-[#8FB69B]/40" />
                      <div className="flex gap-2">
                        <button type="button" onClick={parseNow} className="rounded-full bg-white px-5 py-3 text-[9px] font-semibold text-[#151714] transition hover:scale-[1.01] active:scale-[.98]">解析</button>
                        <button type="button" onClick={resetParser} className="rounded-full border border-white/[.08] px-4 py-3 text-[9px] font-semibold text-white/32 transition hover:bg-white hover:text-[#151714]">重置</button>
                      </div>
                    </div>

                    {parseError && (
                      <div className="mt-4 rounded-[20px] border border-[#D98B79]/20 bg-[#D98B79]/10 p-4 text-[9px] leading-5 text-[#FFB9AA]">{parseError}</div>
                    )}
                  </div>
                </section>

                {activeParsed && (
                  <div className="grid gap-5 2xl:grid-cols-[1fr_360px]">
                    <section className="min-w-0 overflow-hidden rounded-[34px] border border-black/[.08] bg-[#F4F1E9]">
                      <div className="grid gap-px bg-black/[.07] md:grid-cols-4">
                        <div className="bg-[#F4F1E9] p-5">
                          <div className="text-[8px] font-semibold tracking-[.14em] text-black/24">PROTOCOL</div>
                          <div className="url-num mt-3 font-mono text-[16px] font-semibold text-[#52685D]">{activeParsed.protocol}</div>
                        </div>
                        <div className="bg-[#F4F1E9] p-5">
                          <div className="text-[8px] font-semibold tracking-[.14em] text-black/24">HOST</div>
                          <div className="url-num mt-3 truncate font-mono text-[16px] font-semibold text-black/70">{activeParsed.host}</div>
                        </div>
                        <div className="bg-[#F4F1E9] p-5">
                          <div className="text-[8px] font-semibold tracking-[.14em] text-black/24">PATH SEGMENTS</div>
                          <div className="url-num mt-3 font-mono text-[16px] font-semibold text-[#9B7542]">{activeParsed.segments.length}</div>
                        </div>
                        <div className="bg-[#F4F1E9] p-5">
                          <div className="text-[8px] font-semibold tracking-[.14em] text-black/24">PARAMS</div>
                          <div className="url-num mt-3 font-mono text-[16px] font-semibold text-[#965744]">{activeParsed.params.length}</div>
                        </div>
                      </div>

                      <div className="p-5 sm:p-6">
                        <div className="rounded-[28px] border border-black/[.075] bg-white/25 p-5">
                          <div className="mb-4 text-[8px] font-semibold tracking-[.14em] text-black/24">ROUTE MAP</div>
                          <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
                            <span className="rounded-full bg-[#22231F] px-3 py-2 text-white">{activeParsed.protocol}://</span>
                            <span className="rounded-full border border-black/[.08] bg-white/38 px-3 py-2 text-black/62">{activeParsed.hostname}</span>
                            {activeParsed.port && <span className="rounded-full border border-black/[.08] bg-white/38 px-3 py-2 text-black/62">:{activeParsed.port}</span>}
                            {activeParsed.segments.map((segment, index) => (
                              <span key={`${segment}-${index}`} className="rounded-full border border-black/[.08] bg-white/38 px-3 py-2 text-black/42">/{safeDecode(segment)}</span>
                            ))}
                            {activeParsed.hash && <span className="rounded-full border border-[#52685D]/15 bg-[#52685D]/10 px-3 py-2 text-[#52685D]">{activeParsed.hash}</span>}
                          </div>
                        </div>

                        <div className="mt-5 overflow-hidden rounded-[28px] border border-black/[.075] bg-white/25">
                          <div className="flex items-center justify-between border-b border-black/[.07] px-5 py-4">
                            <div>
                              <div className="text-[8px] font-semibold tracking-[.14em] text-black/24">QUERY PARAMETERS</div>
                              <p className="mt-1 text-[8px] text-black/28">保留 raw value，并显示已解码值。</p>
                            </div>
                            <button type="button" onClick={importRowsFromParsed} className="rounded-full border border-black/[.08] px-3.5 py-2 text-[8px] font-semibold text-black/34 transition hover:bg-[#22231F] hover:text-white">导入 Builder</button>
                          </div>

                          {activeParsed.params.length ? (
                            <div className="url-scroll max-h-[520px] overflow-auto">
                              {activeParsed.params.map((param) => (
                                <article key={param.id} className="grid gap-3 border-b border-black/[.06] px-5 py-4 last:border-b-0 xl:grid-cols-[180px_1fr_auto]">
                                  <div className="min-w-0">
                                    <div className="url-num font-mono text-[8px] text-black/24">#{param.index + 1}</div>
                                    <code className="mt-1 block truncate font-mono text-[12px] font-semibold text-[#52685D]">{param.key || "(empty key)"}</code>
                                  </div>
                                  <div className="min-w-0">
                                    <code className="block break-all font-mono text-[11px] leading-5 text-black/67">{param.decoded || "(空)"}</code>
                                    {param.rawValue !== param.decoded && <code className="mt-2 block break-all font-mono text-[8px] leading-4 text-black/28">raw: {param.rawValue || "(empty)"}</code>}
                                    {param.warnings.length > 0 && (
                                      <div className="mt-3 flex flex-wrap gap-2">
                                        {param.warnings.map((warning, index) => (
                                          <span key={`${warning.label}-${index}`} title={warning.detail} className={`rounded-full border px-2.5 py-1 text-[7px] font-semibold ${warningTone(warning.level)}`}>{warning.label}</span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <button type="button" onClick={() => copy(param.decoded, `param-${param.index}`)} className="h-fit rounded-full border border-black/[.08] px-3 py-2 text-[8px] font-semibold text-black/31 transition hover:bg-[#22231F] hover:text-white">{copied === `param-${param.index}` ? "✓" : "COPY"}</button>
                                </article>
                              ))}
                            </div>
                          ) : (
                            <div className="grid h-44 place-items-center text-center text-[10px] text-black/28">没有查询参数</div>
                          )}
                        </div>

                        {allWarnings.length > 0 && (
                          <div className="mt-5 rounded-[28px] border border-[#965744]/12 bg-[#965744]/7 p-5">
                            <div className="mb-3 text-[8px] font-semibold tracking-[.14em] text-[#965744]">RISK NOTES</div>
                            <div className="grid gap-2 md:grid-cols-2">
                              {allWarnings.slice(0, 8).map((warning, index) => (
                                <div key={`${warning.label}-${index}`} className={`rounded-[18px] border p-4 ${warningTone(warning.level)}`}>
                                  <div className="text-[10px] font-semibold">{warning.label}</div>
                                  <p className="mt-2 text-[8px] leading-4 opacity-75">{warning.detail}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </section>

                    <aside className="min-w-0 overflow-hidden rounded-[30px] border border-black/[.08] bg-[#151714]">
                      <div className="border-b border-white/[.06] px-5 py-4">
                        <div className="text-[8px] font-semibold tracking-[.14em] text-white/22">EXPORT</div>
                      </div>
                      <div className="url-dark-scroll max-h-[760px] overflow-auto px-5">
                        <DarkCopyBlock label="FULL URL" value={activeParsed.href} copied={copied === "url"} onCopy={() => copy(activeParsed.href, "url")} />
                        <DarkCopyBlock label="QUERY STRING" value={rebuiltQuery} copied={copied === "query"} onCopy={() => copy(rebuiltQuery, "query")} />
                        <DarkCopyBlock label="PARAMS JSON" value={queryJson} copied={copied === "json"} onCopy={() => copy(queryJson, "json")} />
                        <DarkCopyBlock label="cURL" value={curl} copied={copied === "curl"} onCopy={() => copy(curl, "curl")} />
                        <DarkCopyBlock label="Fetch" value={fetchCode} copied={copied === "fetch"} onCopy={() => copy(fetchCode, "fetch")} />
                      </div>
                      <div className="border-t border-white/[.06] p-5">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => copy(report, "report")} className="rounded-full border border-white/[.08] px-4 py-3 text-[9px] font-semibold text-white/34 transition hover:bg-white hover:text-[#151714]">{copied === "report" ? "✓ 报告" : "复制报告"}</button>
                          <button type="button" onClick={() => downloadText(report, "bitleap-url-report.txt")} className="rounded-full border border-white/[.08] px-4 py-3 text-[9px] font-semibold text-white/34 transition hover:bg-white hover:text-[#151714]">导出</button>
                        </div>
                      </div>
                    </aside>
                  </div>
                )}
              </div>
            )}

            {activeTab === "codec" && (
              <section className="overflow-hidden rounded-[34px] border border-black/[.08] bg-[#F4F1E9]">
                <div className="grid gap-px bg-black/[.07] lg:grid-cols-2">
                  <div className="bg-[#F4F1E9] p-5 sm:p-6">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-[8px] font-semibold tracking-[.14em] text-black/24">CODEC INPUT</div>
                        <p className="mt-2 text-[8px] text-black/30">快速比较 encodeURI、encodeURIComponent 与 + 空格规则。</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Toggle active={codecMode === "component"} label="component" onClick={() => setCodecMode("component")} />
                        <Toggle active={codecMode === "uri"} label="URI" onClick={() => setCodecMode("uri")} />
                        <Toggle active={codecMode === "plus"} label="plus" onClick={() => setCodecMode("plus")} />
                      </div>
                    </div>
                    <textarea value={codecInput} onChange={(event) => setCodecInput(event.target.value)} placeholder="输入要编码或解码的文本..." className="url-scroll h-[420px] w-full resize-none rounded-[28px] border border-black/[.08] bg-white/35 p-5 font-mono text-[12px] leading-6 text-black/70 outline-none focus:border-black/20" />
                    {codec.error && <div className="mt-4 rounded-[20px] border border-[#D98B79]/15 bg-[#D98B79]/8 p-4 text-[9px] leading-5 text-[#965744]">{codec.error}</div>}
                  </div>

                  <div className="bg-[#151714] p-5 sm:p-6">
                    <div className="mb-4 text-[8px] font-semibold tracking-[.14em] text-white/22">RESULTS</div>
                    <div className="url-dark-scroll max-h-[540px] overflow-auto rounded-[28px] border border-white/[.07] px-5">
                      <DarkCopyBlock label="ENCODED" value={codec.encoded} copied={copied === "codec-encoded"} onCopy={() => copy(codec.encoded, "codec-encoded")} />
                      <DarkCopyBlock label="DECODED" value={codec.decoded} copied={copied === "codec-decoded"} onCopy={() => copy(codec.decoded, "codec-decoded")} />
                      <DarkCopyBlock label="PLUS DECODED" value={codec.plusDecoded} copied={copied === "codec-plus"} onCopy={() => copy(codec.plusDecoded, "codec-plus")} />
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeTab === "builder" && (
              <section className="grid gap-5 2xl:grid-cols-[1fr_360px]">
                <div className="overflow-hidden rounded-[34px] border border-black/[.08] bg-[#F4F1E9]">
                  <div className="border-b border-black/[.07] px-5 py-4">
                    <div className="text-[8px] font-semibold tracking-[.14em] text-black/24">QUERY BUILDER</div>
                  </div>
                  <div className="p-5 sm:p-6">
                    <div className="grid gap-4 lg:grid-cols-[1fr_180px]">
                      <label>
                        <span className="mb-2 block text-[8px] font-semibold tracking-[.12em] text-black/24">BASE URL</span>
                        <input value={builderBase} onChange={(event) => setBuilderBase(event.target.value)} className="w-full rounded-full border border-black/[.08] bg-white/35 px-4 py-3 font-mono text-[10px] text-black/68 outline-none" />
                      </label>
                      <label>
                        <span className="mb-2 block text-[8px] font-semibold tracking-[.12em] text-black/24">HASH</span>
                        <input value={builderHash} onChange={(event) => setBuilderHash(event.target.value)} placeholder="#section" className="w-full rounded-full border border-black/[.08] bg-white/35 px-4 py-3 font-mono text-[10px] text-black/68 outline-none" />
                      </label>
                    </div>

                    <div className="mt-5 overflow-hidden rounded-[28px] border border-black/[.075] bg-white/25">
                      <div className="flex items-center justify-between border-b border-black/[.07] px-5 py-4">
                        <div className="text-[8px] font-semibold tracking-[.14em] text-black/24">PARAM ROWS</div>
                        <button type="button" onClick={addRow} className="rounded-full bg-[#22231F] px-3.5 py-2 text-[8px] font-semibold text-white">添加参数</button>
                      </div>
                      <div className="url-scroll max-h-[520px] overflow-auto">
                        {builderRows.map((row, index) => (
                          <div key={row.id} className="grid gap-3 border-b border-black/[.06] px-5 py-4 last:border-b-0 lg:grid-cols-[42px_1fr_1fr_auto] lg:items-center">
                            <button type="button" onClick={() => patchRow(row.id, { enabled: !row.enabled })} className={`h-8 w-8 rounded-full border text-[8px] font-semibold ${row.enabled ? "border-[#52685D]/20 bg-[#52685D] text-white" : "border-black/[.08] text-black/24"}`}>{index + 1}</button>
                            <input value={row.key} onChange={(event) => patchRow(row.id, { key: event.target.value })} placeholder="key" className="rounded-full border border-black/[.08] bg-white/35 px-4 py-3 font-mono text-[10px] outline-none" />
                            <input value={row.value} onChange={(event) => patchRow(row.id, { value: event.target.value })} placeholder="value" className="rounded-full border border-black/[.08] bg-white/35 px-4 py-3 font-mono text-[10px] outline-none" />
                            <button type="button" onClick={() => removeRow(row.id)} className="rounded-full border border-[#965744]/12 px-3 py-2 text-[8px] font-semibold text-[#965744]">删除</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <aside className="overflow-hidden rounded-[30px] border border-black/[.08] bg-[#151714]">
                  <div className="border-b border-white/[.06] px-5 py-4">
                    <div className="text-[8px] font-semibold tracking-[.14em] text-white/22">BUILT URL</div>
                  </div>
                  <div className="px-5">
                    <DarkCopyBlock label="URL" value={builderUrl} copied={copied === "builder"} onCopy={() => copy(builderUrl, "builder")} />
                  </div>
                  <div className="border-t border-white/[.06] p-5">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={loadBuilderToParser} className="rounded-full bg-white px-4 py-3 text-[9px] font-semibold text-[#151714]">送去解析</button>
                      <button type="button" onClick={() => downloadText(builderUrl, "bitleap-built-url.txt")} className="rounded-full border border-white/[.08] px-4 py-3 text-[9px] font-semibold text-white/34 hover:bg-white hover:text-[#151714]">导出</button>
                    </div>
                  </div>
                </aside>
              </section>
            )}

            {activeTab === "status" && (
              <section className="overflow-hidden rounded-[34px] border border-black/[.08] bg-[#151714]">
                <div className="border-b border-white/[.06] p-5">
                  <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                    <input value={statusSearch} onChange={handleStatusImport} placeholder="搜索 404 / redirect / 缓存 / 权限..." className="w-full rounded-full border border-white/[.08] bg-white/[.04] px-5 py-3 font-mono text-[11px] text-white outline-none placeholder:text-white/18" />
                    <div className="flex flex-wrap gap-2">
                      {statusCategories.map((category) => (
                        <button key={category} type="button" onClick={() => setStatusFilter(category)} className={`rounded-full px-3.5 py-2 text-[8px] font-semibold transition ${statusFilter === category ? "bg-white text-[#151714]" : "border border-white/[.08] text-white/28 hover:bg-white/[.06]"}`}>{category}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="url-dark-scroll max-h-[820px] overflow-auto p-5 sm:p-6">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {filteredStatuses.map((item) => (
                      <article key={`${item.code}-${item.name}`} className={`rounded-[24px] border p-5 ${statusTone(item.category)}`}>
                        <div className="mb-5 flex items-start justify-between gap-3">
                          <div className="url-num font-mono text-[28px] font-semibold tracking-[-.05em]">{item.code}</div>
                          <span className="rounded-full border border-current/15 px-2.5 py-1 text-[7px] font-semibold opacity-70">{item.category}</span>
                        </div>
                        <h3 className="text-[15px] font-semibold tracking-[-.03em]">{item.name}</h3>
                        <p className="mt-3 text-[8px] leading-5 opacity-70">{item.description}</p>
                        <p className="mt-3 text-[8px] leading-5 opacity-54">常见：{item.commonCause}</p>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </main>
        </section>

        <section className="url-intro mt-12 grid gap-8 border-t border-black/10 pt-7 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-semibold tracking-[.12em] text-black/25">RAW + DECODED</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">参数表同时保留 raw value 和 decoded value，方便排查二次编码、空格加号和特殊字符问题。</p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.12em] text-black/25">RISK NOTES</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">风险提示只做本地静态标记，用于提醒 token、redirect、脚本片段等常见 URL 参数问题。</p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.12em] text-black/25">HTTP ATLAS</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">状态码速查仍复用项目本地 data 数据，支持分类筛选和关键词搜索。</p>
          </div>
        </section>

        <div className="mt-12 border-t border-black/[.08] pt-5">
          <FooterNote />
        </div>
      </div>
    </div>
  )
}
