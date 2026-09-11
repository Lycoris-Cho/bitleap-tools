"use client"

import type { ChangeEvent, ReactNode } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type HarHeader = {
  name: string
  value: string
}

type HarEntry = {
  id: string
  url: string
  path: string
  host: string
  method: string
  status: number
  statusText: string
  mimeType: string
  size: number
  transferSize: number
  time: number
  startedDateTime: string
  requestHeaders: HarHeader[]
  responseHeaders: HarHeader[]
  queryString: HarHeader[]
  cookies: HarHeader[]
  requestBody?: string
  responseBody?: string
  responseEncoding?: string
  blocked: number
  dns: number
  connect: number
  ssl: number
  send: number
  wait: number
  receive: number
}

type RawHarEntry = {
  startedDateTime?: string
  time?: number
  timings?: Partial<Record<"blocked" | "dns" | "connect" | "ssl" | "send" | "wait" | "receive", number>>
  request?: {
    method?: string
    url?: string
    headers?: HarHeader[]
    queryString?: HarHeader[]
    cookies?: HarHeader[]
    postData?: {
      mimeType?: string
      text?: string
    }
  }
  response?: {
    status?: number
    statusText?: string
    headers?: HarHeader[]
    cookies?: HarHeader[]
    bodySize?: number
    headersSize?: number
    content?: {
      size?: number
      compression?: number
      mimeType?: string
      text?: string
      encoding?: string
    }
  }
}

type HarFile = {
  log?: {
    version?: string
    creator?: { name?: string; version?: string }
    browser?: { name?: string; version?: string }
    entries?: RawHarEntry[]
  }
}

type SortKey = "time" | "size" | "status" | "method" | "url"
type BodyTab = "summary" | "headers" | "payload" | "response"
type FilterGroup = "all" | "xhr" | "document" | "image" | "css" | "js" | "font" | "other"
type ToastTone = "success" | "error" | "info"

const MAX_FILE_SIZE = 60 * 1024 * 1024
const STORAGE_KEY = "bitleap-har-viewer-studio-v2"

function formatSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function formatTime(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return "—"
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(2)} s`
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0%"
  return `${value.toFixed(1)}%`
}

function safeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function normalizeHeaders(headers?: HarHeader[]) {
  return Array.isArray(headers)
    ? headers
        .filter((item) => item && typeof item.name === "string")
        .map((item) => ({ name: item.name, value: String(item.value ?? "") }))
    : []
}

function getHostAndPath(url: string) {
  try {
    const parsed = new URL(url)
    return {
      host: parsed.host,
      path: `${parsed.pathname}${parsed.search}`,
    }
  } catch {
    const slash = url.indexOf("/", 8)
    return {
      host: slash > -1 ? url.slice(0, slash) : url,
      path: slash > -1 ? url.slice(slash) : url,
    }
  }
}

function classifyEntry(entry: HarEntry): FilterGroup {
  const mime = entry.mimeType.toLowerCase()
  const path = entry.path.toLowerCase()

  if (mime.includes("json") || mime.includes("xml") || mime.includes("graphql") || entry.requestHeaders.some((header) => header.name.toLowerCase() === "x-requested-with")) return "xhr"
  if (mime.includes("html")) return "document"
  if (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/.test(path)) return "image"
  if (mime.includes("css") || /\.css(\?|$)/.test(path)) return "css"
  if (mime.includes("javascript") || mime.includes("ecmascript") || /\.m?js(\?|$)/.test(path)) return "js"
  if (mime.includes("font") || /\.(woff2?|ttf|otf|eot)(\?|$)/.test(path)) return "font"
  return "other"
}

function statusTone(status: number) {
  if (status >= 200 && status < 300) return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (status >= 300 && status < 400) return "border-sky-200 bg-sky-50 text-sky-700"
  if (status >= 400 && status < 500) return "border-amber-200 bg-amber-50 text-amber-700"
  if (status >= 500) return "border-rose-200 bg-rose-50 text-rose-700"
  return "border-zinc-200 bg-zinc-50 text-zinc-600"
}

function methodTone(method: string) {
  const upper = method.toUpperCase()
  if (upper === "GET") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (upper === "POST") return "border-violet-200 bg-violet-50 text-violet-700"
  if (upper === "PUT") return "border-amber-200 bg-amber-50 text-amber-700"
  if (upper === "PATCH") return "border-orange-200 bg-orange-50 text-orange-700"
  if (upper === "DELETE") return "border-rose-200 bg-rose-50 text-rose-700"
  return "border-zinc-200 bg-zinc-50 text-zinc-600"
}

function contentTypeTone(type: FilterGroup) {
  if (type === "xhr") return "text-violet-700 bg-violet-50 border-violet-200"
  if (type === "document") return "text-sky-700 bg-sky-50 border-sky-200"
  if (type === "image") return "text-pink-700 bg-pink-50 border-pink-200"
  if (type === "css") return "text-amber-700 bg-amber-50 border-amber-200"
  if (type === "js") return "text-emerald-700 bg-emerald-50 border-emerald-200"
  if (type === "font") return "text-indigo-700 bg-indigo-50 border-indigo-200"
  return "text-zinc-600 bg-zinc-50 border-zinc-200"
}

function parseHar(rawText: string) {
  const json = JSON.parse(rawText) as HarFile
  const entries = json.log?.entries

  if (!Array.isArray(entries)) {
    throw new Error("不是有效的 HAR 文件：缺少 log.entries。")
  }

  return {
    meta: {
      version: json.log?.version ?? "unknown",
      creator: [json.log?.creator?.name, json.log?.creator?.version].filter(Boolean).join(" ") || "unknown",
      browser: [json.log?.browser?.name, json.log?.browser?.version].filter(Boolean).join(" ") || "unknown",
    },
    entries: entries.map((item, index): HarEntry => {
      const url = item.request?.url ?? ""
      const info = getHostAndPath(url)
      const responseSize = safeNumber(item.response?.content?.size)
      const bodySize = safeNumber(item.response?.bodySize)
      const headersSize = safeNumber(item.response?.headersSize)
      const transferSize = Math.max(0, bodySize + headersSize)

      return {
        id: `${index}-${url}`,
        url,
        path: info.path,
        host: info.host,
        method: item.request?.method ?? "GET",
        status: safeNumber(item.response?.status),
        statusText: item.response?.statusText ?? "",
        mimeType: item.response?.content?.mimeType ?? item.request?.postData?.mimeType ?? "",
        size: responseSize || bodySize || transferSize,
        transferSize,
        time: safeNumber(item.time),
        startedDateTime: item.startedDateTime ?? "",
        requestHeaders: normalizeHeaders(item.request?.headers),
        responseHeaders: normalizeHeaders(item.response?.headers),
        queryString: normalizeHeaders(item.request?.queryString),
        cookies: [...normalizeHeaders(item.request?.cookies), ...normalizeHeaders(item.response?.cookies)],
        requestBody: item.request?.postData?.text,
        responseBody: item.response?.content?.text,
        responseEncoding: item.response?.content?.encoding,
        blocked: safeNumber(item.timings?.blocked),
        dns: safeNumber(item.timings?.dns),
        connect: safeNumber(item.timings?.connect),
        ssl: safeNumber(item.timings?.ssl),
        send: safeNumber(item.timings?.send),
        wait: safeNumber(item.timings?.wait),
        receive: safeNumber(item.timings?.receive),
      }
    }),
  }
}

function getWaterfallWidth(entry: HarEntry, maxTime: number) {
  if (!maxTime) return 0
  return Math.max(2, Math.min(100, (entry.time / maxTime) * 100))
}

function tryFormatBody(body = "", mimeType = "") {
  const trimmed = body.trim()
  if (!trimmed) return ""

  if (mimeType.includes("json") || trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.stringify(JSON.parse(trimmed), null, 2)
    } catch {
      return body
    }
  }

  return body
}

function buildReport(entries: HarEntry[], filtered: HarEntry[]) {
  const totalTime = entries.reduce((sum, entry) => sum + entry.time, 0)
  const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0)
  const errors = entries.filter((entry) => entry.status >= 400)
  const slowest = [...entries].sort((a, b) => b.time - a.time).slice(0, 8)
  const largest = [...entries].sort((a, b) => b.size - a.size).slice(0, 8)

  return [
    "BitLeap HAR Viewer Report",
    "",
    `Total requests: ${entries.length}`,
    `Filtered requests: ${filtered.length}`,
    `Total time: ${formatTime(totalTime)}`,
    `Total size: ${formatSize(totalSize)}`,
    `Errors: ${errors.length}`,
    "",
    "Slowest:",
    ...slowest.map((entry) => `- ${formatTime(entry.time)} ${entry.method} ${entry.status} ${entry.url}`),
    "",
    "Largest:",
    ...largest.map((entry) => `- ${formatSize(entry.size)} ${entry.method} ${entry.status} ${entry.url}`),
  ].join("\n")
}

function downloadText(content: string, filename: string, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 500)
}

function copyToClipboard(value: string) {
  return navigator.clipboard.writeText(value)
}

function Pill({
  active,
  children,
  onClick,
}: {
  active?: boolean
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`rounded-full border px-3.5 py-2 text-[10px] font-semibold transition ${active ? "border-zinc-950 bg-zinc-950 text-white" : "border-black/[0.08] bg-white/55 text-zinc-500 hover:border-zinc-300 hover:bg-white hover:text-zinc-950"}`}>
      {children}
    </button>
  )
}

function Badge({
  children,
  tone = "default",
}: {
  children: ReactNode
  tone?: "default" | "method" | "status" | "type"
}) {
  const base = tone === "default" ? "border-black/[0.08] bg-white/60 text-zinc-600" : ""
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${base}`}>{children}</span>
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
  tone?: "default" | "good" | "warn" | "bad"
}) {
  const toneClass = tone === "good" ? "text-emerald-700" : tone === "warn" ? "text-amber-700" : tone === "bad" ? "text-rose-700" : "text-zinc-950"

  return (
    <div className="rounded-[22px] border border-black/[0.06] bg-white/62 p-4 shadow-[0_18px_55px_-48px_rgba(35,28,18,.36)]">
      <div className="text-[8px] font-semibold uppercase tracking-[0.18em] text-zinc-400">{label}</div>
      <div className={`har-num mt-3 truncate font-mono text-lg font-semibold tracking-[-0.03em] ${toneClass}`}>{value}</div>
      {hint && <div className="mt-1 text-[10px] leading-4 text-zinc-400">{hint}</div>}
    </div>
  )
}

function HeaderList({ items }: { items: HarHeader[] }) {
  if (!items.length) {
    return <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4 text-[11px] text-white/35">暂无数据。</div>
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={`${item.name}-${index}`} className="grid gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3 md:grid-cols-[180px_1fr]">
          <div className="break-all font-mono text-[10px] text-violet-200/72">{item.name}</div>
          <div className="break-all font-mono text-[10px] leading-5 text-emerald-100/72">{item.value}</div>
        </div>
      ))}
    </div>
  )
}

export default function HarViewerPage() {
  const pageRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [entries, setEntries] = useState<HarEntry[]>([])
  const [meta, setMeta] = useState<{ version: string; creator: string; browser: string } | null>(null)
  const [fileName, setFileName] = useState("")
  const [rawText, setRawText] = useState("")
  const [error, setError] = useState("")
  const [filterUrl, setFilterUrl] = useState("")
  const [methodFilter, setMethodFilter] = useState("ALL")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [typeFilter, setTypeFilter] = useState<FilterGroup>("all")
  const [sortKey, setSortKey] = useState<SortKey>("time")
  const [selected, setSelected] = useState<HarEntry | null>(null)
  const [bodyTab, setBodyTab] = useState<BodyTab>("summary")
  const [toast, setToast] = useState<{ text: string; tone: ToastTone } | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const filtered = useMemo(() => {
    const query = filterUrl.trim().toLowerCase()

    return entries
      .filter((entry) => {
        const matchesUrl = !query || entry.url.toLowerCase().includes(query) || entry.host.toLowerCase().includes(query) || entry.method.toLowerCase().includes(query)
        const matchesMethod = methodFilter === "ALL" || entry.method.toUpperCase() === methodFilter
        const matchesStatus =
          statusFilter === "ALL" ||
          (statusFilter === "2XX" && entry.status >= 200 && entry.status < 300) ||
          (statusFilter === "3XX" && entry.status >= 300 && entry.status < 400) ||
          (statusFilter === "4XX" && entry.status >= 400 && entry.status < 500) ||
          (statusFilter === "5XX" && entry.status >= 500)
        const matchesType = typeFilter === "all" || classifyEntry(entry) === typeFilter
        return matchesUrl && matchesMethod && matchesStatus && matchesType
      })
      .sort((a, b) => {
        if (sortKey === "time") return b.time - a.time
        if (sortKey === "size") return b.size - a.size
        if (sortKey === "status") return b.status - a.status
        if (sortKey === "method") return a.method.localeCompare(b.method)
        return a.url.localeCompare(b.url)
      })
  }, [entries, filterUrl, methodFilter, sortKey, statusFilter, typeFilter])

  const summary = useMemo(() => {
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0)
    const totalTime = entries.reduce((sum, entry) => sum + entry.time, 0)
    const errors = entries.filter((entry) => entry.status >= 400).length
    const slowest = entries.reduce<HarEntry | null>((max, entry) => (!max || entry.time > max.time ? entry : max), null)
    const largest = entries.reduce<HarEntry | null>((max, entry) => (!max || entry.size > max.size ? entry : max), null)
    const hosts = new Set(entries.map((entry) => entry.host).filter(Boolean))
    const cacheHits = entries.filter((entry) => entry.status === 304 || entry.responseHeaders.some((header) => header.name.toLowerCase() === "age")).length

    return {
      totalSize,
      totalTime,
      errors,
      slowest,
      largest,
      hosts: hosts.size,
      cacheHits,
    }
  }, [entries])

  const methods = useMemo(() => ["ALL", ...Array.from(new Set(entries.map((entry) => entry.method.toUpperCase()))).sort()], [entries])
  const maxTime = useMemo(() => Math.max(1, ...filtered.map((entry) => entry.time)), [filtered])
  const report = useMemo(() => buildReport(entries, filtered), [entries, filtered])

  const showToast = useCallback((text: string, tone: ToastTone = "info") => {
    setToast({ text, tone })
    window.setTimeout(() => setToast(null), 1800)
  }, [])

  const readHarFile = useCallback(
    async (file: File) => {
      setError("")
      setSelected(null)
      setDragActive(false)

      if (!file.name.toLowerCase().endsWith(".har") && file.type && !file.type.includes("json")) {
        setError("请选择 .har 文件。")
        return
      }

      if (file.size > MAX_FILE_SIZE) {
        setError(`文件不能超过 ${formatSize(MAX_FILE_SIZE)}。`)
        return
      }

      try {
        const text = await file.text()
        const parsed = parseHar(text)
        setRawText(text)
        setFileName(file.name)
        setMeta(parsed.meta)
        setEntries(parsed.entries)
        setFilterUrl("")
        setMethodFilter("ALL")
        setStatusFilter("ALL")
        setTypeFilter("all")
        setSortKey("time")
        showToast(`已解析 ${parsed.entries.length} 条请求。`, "success")
      } catch (err) {
        const message = err instanceof Error ? err.message : "解析失败。"
        setError(message)
        showToast(message, "error")
      }
    },
    [showToast],
  )

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    void readHarFile(file)
    event.target.value = ""
  }

  const importRawText = () => {
    try {
      const parsed = parseHar(rawText)
      setMeta(parsed.meta)
      setEntries(parsed.entries)
      setSelected(null)
      showToast(`已从文本解析 ${parsed.entries.length} 条请求。`, "success")
    } catch (err) {
      const message = err instanceof Error ? err.message : "解析失败。"
      setError(message)
      showToast(message, "error")
    }
  }

  const clearAll = () => {
    setEntries([])
    setMeta(null)
    setFileName("")
    setRawText("")
    setError("")
    setFilterUrl("")
    setSelected(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  const copyReport = async () => {
    try {
      await copyToClipboard(report)
      showToast("分析报告已复制。", "success")
    } catch {
      showToast("复制失败，浏览器可能未授权剪贴板。", "error")
    }
  }

  const exportCsv = () => {
    const header = ["method", "status", "time_ms", "size", "mime", "host", "url"]
    const rows = filtered.map((entry) => [entry.method, entry.status, entry.time, entry.size, entry.mimeType, entry.host, entry.url])
    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            const value = String(cell ?? "")
            return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
          })
          .join(","),
      )
      .join("\n")

    downloadText(csv, "har-requests.csv", "text/csv;charset=utf-8")
  }

  useEffect(() => {
    try {
      const savedQuery = window.localStorage.getItem(`${STORAGE_KEY}:query`)
      if (savedQuery) setFilterUrl(savedQuery)
    } catch {}
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(`${STORAGE_KEY}:query`, filterUrl)
    } catch {}
  }, [filterUrl])

  useEffect(() => {
    if (!pageRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      gsap.from(".har-enter", { y: 16, opacity: 0, duration: 0.62, stagger: 0.055, ease: "power3.out" })
      gsap.to(".har-orb", { y: -12, x: 8, duration: 6.4, repeat: -1, yoyo: true, ease: "sine.inOut" })
      gsap.to(".har-scan", { xPercent: 130, duration: 4.8, repeat: -1, ease: "sine.inOut" })
    }, pageRef)

    return () => ctx.revert()
  }, [])

  return (
    <div ref={pageRef} className="relative min-h-[calc(100dvh-4rem)] overflow-hidden bg-[#f5f0e8] text-[#211a14]">
      <style>{`
        .har-scroll::-webkit-scrollbar { width:5px; height:5px; }
        .har-scroll::-webkit-scrollbar-track { background:transparent; }
        .har-scroll::-webkit-scrollbar-thumb { background:rgba(33,26,20,.18); border-radius:999px; }
        .har-dark-scroll::-webkit-scrollbar { width:5px; height:5px; }
        .har-dark-scroll::-webkit-scrollbar-track { background:transparent; }
        .har-dark-scroll::-webkit-scrollbar-thumb { background:rgba(255,255,255,.16); border-radius:999px; }
        .har-num { font-variant-numeric:tabular-nums lining-nums; }
      `}</style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(255,255,255,.78),transparent_28%),radial-gradient(circle_at_84%_13%,rgba(221,206,176,.58),transparent_31%),linear-gradient(180deg,#fbf7ef_0%,#f5f0e8_55%,#eee4d4_100%)]" />
      <div className="har-orb pointer-events-none absolute -right-32 top-24 h-[460px] w-[460px] rounded-full bg-[#d7c5a4]/24 blur-[120px]" />
      <div className="har-orb pointer-events-none absolute -left-28 bottom-10 h-[380px] w-[380px] rounded-full bg-white/46 blur-[110px]" />

      <main className="relative z-10 mx-auto max-w-[1600px] px-5 py-6 sm:px-8 lg:px-10">
        <div className="har-enter inline-flex max-w-max">
          <Breadcrumb />
        </div>

        <header className="har-enter mt-8 grid gap-8 border-b border-black/[0.07] pb-8 lg:grid-cols-[minmax(0,1fr)_500px] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.24em] text-black/32">Local HAR Network Inspector</div>
            <h1 className="mt-4 max-w-[980px] text-[clamp(42px,6.2vw,92px)] font-semibold leading-[1.03] tracking-[-0.045em]">
              HAR 抓包解析，
              <br />
              请求瀑布一眼看清。
            </h1>
          </div>
          <p className="max-w-[520px] text-[12px] leading-7 text-black/45">
            上传浏览器 HAR 文件，在本地分析请求列表、响应头、Body、耗时瀑布、体积分布和错误请求。适合排查接口、首屏资源与性能瓶颈。
          </p>
        </header>

        {toast && (
          <div className={`har-enter mt-5 rounded-[22px] border px-4 py-3 text-sm ${
            toast.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : toast.tone === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-amber-200 bg-amber-50 text-amber-700"
          }`}>
            {toast.text}
          </div>
        )}

        {error && (
          <div className="har-enter mt-5 rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <section className="mt-6 grid gap-5 xl:grid-cols-[350px_minmax(0,1fr)_360px]">
          <aside className="har-enter space-y-5">
            <label
              onDragOver={(event) => {
                event.preventDefault()
                setDragActive(true)
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(event) => {
                event.preventDefault()
                const file = event.dataTransfer.files?.[0]
                if (file) void readHarFile(file)
              }}
              className={`group block cursor-pointer overflow-hidden rounded-[34px] border border-dashed p-5 transition ${
                dragActive ? "border-zinc-900 bg-white/76" : "border-black/[0.12] bg-white/44 hover:border-black/25 hover:bg-white/58"
              }`}
            >
              <input ref={inputRef} type="file" accept=".har,application/json" onChange={handleFileChange} className="hidden" />
              <div className="rounded-[26px] border border-black/[0.05] bg-white/54 p-5 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-zinc-950 text-xl text-white transition group-hover:-translate-y-0.5">HAR</div>
                <div className="mt-5 text-lg font-semibold tracking-[-0.04em]">{fileName ? "重新选择 HAR" : "拖拽或点击上传"}</div>
                <p className="mx-auto mt-2 max-w-[240px] text-xs leading-5 text-black/38">支持 Chrome / Edge / Safari DevTools 导出的 .har 文件，最大 {formatSize(MAX_FILE_SIZE)}</p>
              </div>
              {fileName && (
                <div className="mt-4 rounded-[24px] border border-black/[0.05] bg-white/46 p-4">
                  <div className="truncate text-sm font-semibold">{fileName}</div>
                  <div className="mt-2 font-mono text-[11px] text-black/40">{entries.length} requests · {meta?.creator}</div>
                </div>
              )}
            </label>

            <div className="rounded-[34px] border border-black/[0.06] bg-white/44 p-5 backdrop-blur-xl">
              <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/34">Filters</div>
              <div className="mt-4">
                <input value={filterUrl} onChange={(event) => setFilterUrl(event.target.value)} placeholder="过滤 URL / host / method…" className="h-12 w-full rounded-2xl border border-black/[0.08] bg-white/62 px-4 font-mono text-sm outline-none transition placeholder:text-zinc-300 focus:border-zinc-900" />
              </div>

              <div className="mt-4">
                <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-400">Method</div>
                <div className="flex flex-wrap gap-2">
                  {methods.map((method) => (
                    <Pill key={method} active={methodFilter === method} onClick={() => setMethodFilter(method)}>{method}</Pill>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-400">Status</div>
                <div className="flex flex-wrap gap-2">
                  {["ALL", "2XX", "3XX", "4XX", "5XX"].map((status) => (
                    <Pill key={status} active={statusFilter === status} onClick={() => setStatusFilter(status)}>{status}</Pill>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-400">Type</div>
                <div className="flex flex-wrap gap-2">
                  {(["all", "xhr", "document", "image", "css", "js", "font", "other"] as FilterGroup[]).map((type) => (
                    <Pill key={type} active={typeFilter === type} onClick={() => setTypeFilter(type)}>{type}</Pill>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[34px] border border-black/[0.06] bg-white/44 p-5 backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/34">Raw HAR Text</div>
                <button type="button" onClick={importRawText} className="rounded-full border border-black/[0.08] bg-white/60 px-3 py-1.5 text-[10px] font-semibold text-zinc-600 transition hover:bg-white">解析文本</button>
              </div>
              <textarea value={rawText} onChange={(event) => setRawText(event.target.value)} className="har-scroll h-44 w-full resize-none rounded-[20px] border border-black/[0.08] bg-white/58 p-3 font-mono text-[10px] leading-5 text-zinc-600 outline-none focus:border-zinc-900" placeholder="也可以直接粘贴 HAR JSON 文本…" />
            </div>
          </aside>

          <section className="har-enter min-w-0 overflow-hidden rounded-[40px] border border-black/[0.06] bg-white/38 p-3 shadow-[0_35px_120px_-72px_rgba(45,35,22,.45)] backdrop-blur-xl">
            <div className="overflow-hidden rounded-[32px] border border-black/[0.055] bg-[#14120f]">
              <div className="relative border-b border-white/[0.08] px-5 py-4">
                <div className="har-scan pointer-events-none absolute inset-y-0 left-[-35%] w-1/3 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.08),transparent)] opacity-50" />
                <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[8px] font-semibold uppercase tracking-[0.18em] text-white/24">Request Waterfall</div>
                    <div className="mt-2 font-mono text-[12px] text-emerald-100/82">{filtered.length} / {entries.length} requests</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(["time", "size", "status", "method", "url"] as SortKey[]).map((key) => (
                      <button key={key} type="button" onClick={() => setSortKey(key)} className={`rounded-full border px-3 py-1.5 text-[9px] font-semibold uppercase transition ${sortKey === key ? "border-white bg-white text-zinc-950" : "border-white/[0.1] text-white/38 hover:bg-white/[0.08] hover:text-white"}`}>{key}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="har-dark-scroll max-h-[720px] overflow-auto">
                {filtered.length === 0 ? (
                  <div className="grid min-h-[540px] place-items-center p-8 text-center">
                    <div>
                      <div className="mx-auto mb-7 h-px w-24 bg-white/18" />
                      <h2 className="text-[clamp(32px,5vw,72px)] font-semibold leading-[0.9] tracking-[-0.07em] text-white">等待 HAR</h2>
                      <p className="mx-auto mt-5 max-w-[420px] text-xs leading-6 text-white/38">{entries.length ? "当前筛选没有匹配请求。" : "上传或粘贴 HAR 文件后，会在这里显示请求瀑布列表。"}</p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.065]">
                    {filtered.map((entry) => {
                      const type = classifyEntry(entry)

                      return (
                        <button key={entry.id} type="button" onClick={() => { setSelected(entry); setBodyTab("summary") }} className={`grid w-full gap-3 px-4 py-3 text-left transition hover:bg-white/[0.045] lg:grid-cols-[76px_76px_minmax(0,1fr)_120px_98px] ${selected?.id === entry.id ? "bg-white/[0.06]" : ""}`}>
                          <div className="flex items-center">
                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${methodTone(entry.method)}`}>{entry.method}</span>
                          </div>
                          <div className="flex items-center">
                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusTone(entry.status)}`}>{entry.status || "—"}</span>
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-mono text-[11px] text-white/75">{entry.path || entry.url}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${contentTypeTone(type)}`}>{type}</span>
                              <span className="truncate font-mono text-[9px] text-white/27">{entry.host}</span>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.07]">
                              <div className="h-full rounded-full bg-emerald-300/80" style={{ width: `${getWaterfallWidth(entry, maxTime)}%` }} />
                            </div>
                          </div>
                          <div className="grid content-center gap-1 text-right font-mono text-[10px] text-white/42">
                            <span>{formatTime(entry.time)}</span>
                            <span>{formatSize(entry.size)}</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>

          <aside className="har-enter space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="请求数" value={String(entries.length)} hint={`筛选 ${filtered.length}`} />
              <StatCard label="总大小" value={formatSize(summary.totalSize)} hint="Content size" />
              <StatCard label="总耗时" value={formatTime(summary.totalTime)} hint="Sum time" />
              <StatCard label="错误数" value={String(summary.errors)} hint="4xx / 5xx" tone={summary.errors ? "bad" : "good"} />
              <StatCard label="域名数" value={String(summary.hosts)} hint="Unique hosts" />
              <StatCard label="缓存命中" value={String(summary.cacheHits)} hint={formatPercent(entries.length ? (summary.cacheHits / entries.length) * 100 : 0)} />
            </div>

            <div className="rounded-[34px] border border-black/[0.06] bg-white/44 p-5 backdrop-blur-xl">
              <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/34">Actions</div>
              <div className="mt-5 grid gap-3">
                <button type="button" disabled={!entries.length} onClick={copyReport} className="h-12 rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-35">复制分析报告</button>
                <button type="button" disabled={!filtered.length} onClick={exportCsv} className="h-12 rounded-full border border-black/[0.08] bg-white/64 px-5 text-sm font-semibold text-zinc-700 transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-35">导出当前列表 CSV</button>
                <button type="button" disabled={!entries.length} onClick={() => downloadText(report, "har-analysis-report.txt")} className="h-12 rounded-full border border-black/[0.08] bg-white/40 px-5 text-sm font-semibold text-zinc-500 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35">下载 TXT 报告</button>
                <button type="button" onClick={clearAll} className="h-12 rounded-full border border-orange-200 bg-orange-50/70 px-5 text-sm font-semibold text-orange-700 transition hover:bg-orange-100">重置</button>
              </div>
            </div>

            <div className="rounded-[34px] border border-black/[0.06] bg-white/44 p-5 backdrop-blur-xl">
              <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/34">Highlights</div>
              <div className="mt-4 space-y-3">
                <div className="rounded-[20px] border border-black/[0.06] bg-white/48 p-4">
                  <div className="text-[10px] text-black/36">最慢请求</div>
                  <div className="mt-2 break-all font-mono text-[10px] leading-5 text-black/60">{summary.slowest ? `${formatTime(summary.slowest.time)} · ${summary.slowest.path}` : "—"}</div>
                </div>
                <div className="rounded-[20px] border border-black/[0.06] bg-white/48 p-4">
                  <div className="text-[10px] text-black/36">最大资源</div>
                  <div className="mt-2 break-all font-mono text-[10px] leading-5 text-black/60">{summary.largest ? `${formatSize(summary.largest.size)} · ${summary.largest.path}` : "—"}</div>
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-black/[0.06] bg-white/38 p-5 text-[11px] leading-6 text-black/42">
              <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-black/30">说明</div>
              在 Chrome DevTools Network 面板右键可导出 HAR。文件只在当前浏览器解析，不会上传服务器。
            </div>

            <div className="[&_*]:!text-black/38">
              <FooterNote />
            </div>
          </aside>
        </section>
      </main>

      {selected && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/28 p-0 backdrop-blur-[10px] sm:items-center sm:p-5" onClick={() => setSelected(null)}>
          <div className="har-dark-scroll relative flex max-h-[90dvh] w-full max-w-[1120px] flex-col overflow-hidden rounded-t-[32px] border border-white/[0.14] bg-[#14120f] shadow-[0_30px_110px_-38px_rgba(0,0,0,.76)] sm:rounded-[32px]" onClick={(event) => event.stopPropagation()}>
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/[0.08] p-5">
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${methodTone(selected.method)}`}>{selected.method}</span>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusTone(selected.status)}`}>{selected.status}</span>
                  <span className="rounded-full border border-white/[0.1] px-2.5 py-1 font-mono text-[10px] text-white/38">{formatTime(selected.time)} · {formatSize(selected.size)}</span>
                </div>
                <div className="break-all font-mono text-xs leading-5 text-white/64">{selected.url}</div>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-zinc-950 transition hover:bg-emerald-100" aria-label="关闭详情">×</button>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2 border-b border-white/[0.08] px-5 py-3">
              {(["summary", "headers", "payload", "response"] as BodyTab[]).map((tab) => (
                <button key={tab} type="button" onClick={() => setBodyTab(tab)} className={`rounded-full border px-3.5 py-2 text-[10px] font-semibold transition ${bodyTab === tab ? "border-white bg-white text-zinc-950" : "border-white/[0.1] text-white/42 hover:bg-white/[0.08] hover:text-white"}`}>{tab}</button>
              ))}
            </div>

            <div className="har-dark-scroll min-h-0 flex-1 overflow-auto p-5">
              {bodyTab === "summary" && (
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    ["Host", selected.host],
                    ["Path", selected.path],
                    ["MIME", selected.mimeType || "—"],
                    ["Started", selected.startedDateTime || "—"],
                    ["Blocked", formatTime(selected.blocked)],
                    ["DNS", formatTime(selected.dns)],
                    ["Connect", formatTime(selected.connect)],
                    ["SSL", formatTime(selected.ssl)],
                    ["Send", formatTime(selected.send)],
                    ["Wait", formatTime(selected.wait)],
                    ["Receive", formatTime(selected.receive)],
                    ["Transfer", formatSize(selected.transferSize)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[22px] border border-white/[0.08] bg-white/[0.045] p-4">
                      <div className="text-[8px] font-semibold uppercase tracking-[0.18em] text-white/24">{label}</div>
                      <div className="mt-3 break-all font-mono text-[11px] leading-5 text-emerald-100/76">{value}</div>
                    </div>
                  ))}
                </div>
              )}

              {bodyTab === "headers" && (
                <div className="grid gap-5 lg:grid-cols-2">
                  <section>
                    <h3 className="mb-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/28">请求头</h3>
                    <HeaderList items={selected.requestHeaders} />
                  </section>
                  <section>
                    <h3 className="mb-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/28">响应头</h3>
                    <HeaderList items={selected.responseHeaders} />
                  </section>
                  <section>
                    <h3 className="mb-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/28">Query String</h3>
                    <HeaderList items={selected.queryString} />
                  </section>
                  <section>
                    <h3 className="mb-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/28">Cookies</h3>
                    <HeaderList items={selected.cookies} />
                  </section>
                </div>
              )}

              {bodyTab === "payload" && (
                <pre className="har-dark-scroll max-h-[64dvh] overflow-auto whitespace-pre-wrap break-all rounded-[24px] border border-white/[0.08] bg-[#0c0b09] p-4 font-mono text-[11px] leading-5 text-emerald-100/78">
                  {tryFormatBody(selected.requestBody || "暂无请求体。", selected.mimeType)}
                </pre>
              )}

              {bodyTab === "response" && (
                <pre className="har-dark-scroll max-h-[64dvh] overflow-auto whitespace-pre-wrap break-all rounded-[24px] border border-white/[0.08] bg-[#0c0b09] p-4 font-mono text-[11px] leading-5 text-emerald-100/78">
                  {selected.responseEncoding === "base64" ? "响应体为 base64 编码内容，已保留在 HAR 中但不直接展开预览。" : tryFormatBody(selected.responseBody || "暂无响应体。", selected.mimeType)}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
