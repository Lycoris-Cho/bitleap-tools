"use client"

import type { ChangeEvent, ReactNode } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
type BodyMode = "json" | "text"
type CodeTab = "fetch" | "msw" | "next" | "express" | "curl"
type ToastTone = "success" | "error" | "info"
type SimStatus = "idle" | "loading" | "done"

type HeaderRow = {
  id: string
  key: string
  value: string
  enabled: boolean
}

type Preset = {
  label: string
  method: HttpMethod
  path: string
  statusCode: number
  delay: number
  body: string
  headers: HeaderRow[]
}

const STORAGE_KEY = "bitleap-mock-server-studio-v2"

const METHOD_META: Record<HttpMethod, { tone: string; chip: string }> = {
  GET: { tone: "text-emerald-700 bg-emerald-50 border-emerald-200", chip: "bg-emerald-500" },
  POST: { tone: "text-sky-700 bg-sky-50 border-sky-200", chip: "bg-sky-500" },
  PUT: { tone: "text-amber-700 bg-amber-50 border-amber-200", chip: "bg-amber-500" },
  PATCH: { tone: "text-violet-700 bg-violet-50 border-violet-200", chip: "bg-violet-500" },
  DELETE: { tone: "text-rose-700 bg-rose-50 border-rose-200", chip: "bg-rose-500" },
}

const DEFAULT_HEADERS: HeaderRow[] = [
  { id: "content-type", key: "Content-Type", value: "application/json; charset=utf-8", enabled: true },
  { id: "cache", key: "Cache-Control", value: "no-store", enabled: true },
]

const PRESETS: Preset[] = [
  {
    label: "成功响应",
    method: "GET",
    path: "/api/user/profile",
    statusCode: 200,
    delay: 260,
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(
      {
        code: 0,
        msg: "success",
        data: {
          id: 10001,
          name: "BitLeap",
          role: "designer",
          active: true,
        },
      },
      null,
      2,
    ),
  },
  {
    label: "分页列表",
    method: "GET",
    path: "/api/orders?page=1&pageSize=10",
    statusCode: 200,
    delay: 420,
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(
      {
        code: 0,
        msg: "success",
        data: {
          page: 1,
          pageSize: 10,
          total: 128,
          list: [
            { id: "ORD-2026-001", amount: 129.9, status: "paid" },
            { id: "ORD-2026-002", amount: 68, status: "pending" },
          ],
        },
      },
      null,
      2,
    ),
  },
  {
    label: "登录失败",
    method: "POST",
    path: "/api/auth/login",
    statusCode: 401,
    delay: 300,
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(
      {
        code: 40101,
        msg: "用户名或密码错误",
        data: null,
      },
      null,
      2,
    ),
  },
  {
    label: "服务异常",
    method: "GET",
    path: "/api/report/summary",
    statusCode: 500,
    delay: 800,
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(
      {
        code: 50000,
        msg: "internal server error",
        traceId: "mock-trace-9c7a2",
      },
      null,
      2,
    ),
  },
]

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function cloneHeaders(headers: HeaderRow[]) {
  return headers.map((item) => ({ ...item, id: createId() }))
}

function normalizePath(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return "/api/demo"
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`
}

function safeParseJson(value: string) {
  try {
    return {
      ok: true as const,
      value: JSON.parse(value),
      error: "",
    }
  } catch (error) {
    return {
      ok: false as const,
      value: null,
      error: error instanceof Error ? error.message : "JSON 格式错误",
    }
  }
}

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2)
}

function minifyJson(value: string) {
  const parsed = safeParseJson(value)
  if (!parsed.ok) return value
  return JSON.stringify(parsed.value)
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function responseSize(body: string) {
  if (typeof Blob === "undefined") return body.length
  return new Blob([body]).size
}

function statusTone(statusCode: number) {
  if (statusCode >= 200 && statusCode < 300) return "text-emerald-700 bg-emerald-50 border-emerald-200"
  if (statusCode >= 300 && statusCode < 400) return "text-sky-700 bg-sky-50 border-sky-200"
  if (statusCode >= 400 && statusCode < 500) return "text-amber-700 bg-amber-50 border-amber-200"
  return "text-rose-700 bg-rose-50 border-rose-200"
}

function describeJson(value: string, bodyMode: BodyMode) {
  if (bodyMode === "text") return { valid: true, label: "TEXT", keys: "—", depth: "—" }

  const parsed = safeParseJson(value)
  if (!parsed.ok) return { valid: false, label: "INVALID", keys: "—", depth: "—" }

  const root = parsed.value
  const keyCount = root && typeof root === "object" && !Array.isArray(root) ? Object.keys(root as Record<string, unknown>).length : Array.isArray(root) ? root.length : 1

  const calcDepth = (item: unknown, level = 0): number => {
    if (!item || typeof item !== "object" || level > 12) return level
    const values = Array.isArray(item) ? item : Object.values(item as Record<string, unknown>)
    if (!values.length) return level + 1
    return Math.max(...values.map((child) => calcDepth(child, level + 1)))
  }

  return {
    valid: true,
    label: Array.isArray(root) ? "ARRAY" : root && typeof root === "object" ? "OBJECT" : "VALUE",
    keys: String(keyCount),
    depth: String(calcDepth(root)),
  }
}

function stringifyHeaderObject(headers: HeaderRow[]) {
  const enabled = headers.filter((item) => item.enabled && item.key.trim())
  if (!enabled.length) return "{}"

  return `{\n${enabled.map((item) => `  "${item.key.trim()}": "${item.value.replaceAll('"', '\\"')}"`).join(",\n")}\n}`
}

function generatedFetch(method: HttpMethod, path: string, statusCode: number, delay: number, body: string, bodyMode: BodyMode, headers: HeaderRow[]) {
  const normalized = normalizePath(path)
  const payload = bodyMode === "json" && safeParseJson(body).ok ? formatJson(safeParseJson(body).value) : JSON.stringify(body)
  return [
    `// ${method} ${normalized} · ${statusCode} · ${delay}ms`,
    "export async function mockRequest() {",
    `  await new Promise((resolve) => setTimeout(resolve, ${delay}))`,
    "",
    "  return new Response(",
    `    JSON.stringify(${payload}),`,
    "    {",
    `      status: ${statusCode},`,
    `      headers: ${stringifyHeaderObject(headers).replace(/\n/g, "\n      ")},`,
    "    },",
    "  )",
    "}",
  ].join("\n")
}

function generatedMsw(method: HttpMethod, path: string, statusCode: number, delay: number, body: string, bodyMode: BodyMode) {
  const mswMethod = method.toLowerCase()
  const normalized = normalizePath(path).split("?")[0]
  const payload = bodyMode === "json" && safeParseJson(body).ok ? formatJson(safeParseJson(body).value) : JSON.stringify(body)
  return [
    "import { http, HttpResponse, delay } from 'msw'",
    "",
    "export const handlers = [",
    `  http.${mswMethod}('${normalized}', async () => {`,
    `    await delay(${delay})`,
    `    return HttpResponse.json(${payload}, { status: ${statusCode} })`,
    "  }),",
    "]",
  ].join("\n")
}

function generatedNext(method: HttpMethod, statusCode: number, delay: number, body: string, bodyMode: BodyMode) {
  const payload = bodyMode === "json" && safeParseJson(body).ok ? formatJson(safeParseJson(body).value) : JSON.stringify(body)
  return [
    "import { NextResponse } from 'next/server'",
    "",
    `export async function ${method}() {`,
    `  await new Promise((resolve) => setTimeout(resolve, ${delay}))`,
    "",
    `  return NextResponse.json(${payload}, { status: ${statusCode} })`,
    "}",
  ].join("\n")
}

function generatedExpress(method: HttpMethod, path: string, statusCode: number, delay: number, body: string, bodyMode: BodyMode) {
  const normalized = normalizePath(path).split("?")[0]
  const payload = bodyMode === "json" && safeParseJson(body).ok ? formatJson(safeParseJson(body).value) : JSON.stringify(body)
  return [
    `app.${method.toLowerCase()}('${normalized}', async (req, res) => {`,
    `  await new Promise((resolve) => setTimeout(resolve, ${delay}))`,
    `  res.status(${statusCode}).json(${payload})`,
    "})",
  ].join("\n")
}

function generatedCurl(method: HttpMethod, path: string, statusCode: number, delay: number, body: string) {
  return [
    `# Expected: ${statusCode} after ${delay}ms`,
    `curl -X ${method} "http://localhost:3000${normalizePath(path)}" \\`,
    '  -H "Content-Type: application/json" \\',
    `  --data '${body.replaceAll("'", "'\\''")}'`,
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

function MethodBadge({ method }: { method: HttpMethod }) {
  return <span className={`rounded-full border px-3 py-1.5 text-[10px] font-bold ${METHOD_META[method].tone}`}>{method}</span>
}

function PillButton({
  active,
  children,
  onClick,
}: {
  active?: boolean
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} className={`rounded-full border px-3.5 py-2 text-[10px] font-semibold transition ${active ? "border-zinc-950 bg-zinc-950 text-white" : "border-black/[0.08] bg-white/55 text-zinc-500 hover:border-zinc-300 hover:bg-white hover:text-zinc-950"}`}>
      {children}
    </button>
  )
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-[22px] border border-black/[0.06] bg-white/62 p-4 shadow-[0_18px_55px_-48px_rgba(35,28,18,.36)]">
      <div className="text-[8px] font-semibold uppercase tracking-[0.18em] text-zinc-400">{label}</div>
      <div className="mock-num mt-3 truncate font-mono text-lg font-semibold tracking-[-0.03em] text-zinc-950">{value}</div>
      {hint && <div className="mt-1 text-[10px] leading-4 text-zinc-400">{hint}</div>}
    </div>
  )
}

function CodePanel({
  value,
  onCopy,
  copied,
}: {
  value: string
  onCopy: () => void
  copied: boolean
}) {
  return (
    <div className="overflow-hidden rounded-[26px] border border-black/[0.06] bg-[#11100e] shadow-[0_24px_85px_-62px_rgba(20,14,8,.7)]">
      <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
        <span className="text-[8px] font-semibold uppercase tracking-[0.18em] text-white/28">Generated snippet</span>
        <button type="button" onClick={onCopy} className="rounded-full border border-white/[0.1] px-3 py-1.5 text-[9px] font-semibold text-white/45 transition hover:bg-white/[0.08] hover:text-white">
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      <pre className="mock-scroll max-h-[470px] overflow-auto whitespace-pre-wrap break-all p-4 font-mono text-[11px] leading-5 text-emerald-100/82">{value}</pre>
    </div>
  )
}

export default function MockServerPage() {
  const pageRef = useRef<HTMLDivElement>(null)
  const responseRef = useRef<HTMLTextAreaElement>(null)
  const simTimerRef = useRef<number | null>(null)

  const [method, setMethod] = useState<HttpMethod>("GET")
  const [path, setPath] = useState("/api/demo")
  const [statusCode, setStatusCode] = useState(200)
  const [delay, setDelay] = useState(240)
  const [bodyMode, setBodyMode] = useState<BodyMode>("json")
  const [responseBody, setResponseBody] = useState(formatJson({ code: 0, data: {}, msg: "success" }))
  const [headers, setHeaders] = useState<HeaderRow[]>(cloneHeaders(DEFAULT_HEADERS))
  const [codeTab, setCodeTab] = useState<CodeTab>("fetch")
  const [toast, setToast] = useState<{ text: string; tone: ToastTone } | null>(null)
  const [copied, setCopied] = useState(false)
  const [simStatus, setSimStatus] = useState<SimStatus>("idle")
  const [simTime, setSimTime] = useState<number | null>(null)
  const [hydrated, setHydrated] = useState(false)

  const jsonMeta = useMemo(() => describeJson(responseBody, bodyMode), [bodyMode, responseBody])
  const normalizedPath = useMemo(() => normalizePath(path), [path])
  const size = useMemo(() => responseSize(responseBody), [responseBody])
  const enabledHeaders = useMemo(() => headers.filter((item) => item.enabled && item.key.trim()), [headers])
  const isValid = bodyMode === "text" || jsonMeta.valid

  const generated = useMemo(() => {
    if (codeTab === "msw") return generatedMsw(method, normalizedPath, statusCode, delay, responseBody, bodyMode)
    if (codeTab === "next") return generatedNext(method, statusCode, delay, responseBody, bodyMode)
    if (codeTab === "express") return generatedExpress(method, normalizedPath, statusCode, delay, responseBody, bodyMode)
    if (codeTab === "curl") return generatedCurl(method, normalizedPath, statusCode, delay, responseBody)
    return generatedFetch(method, normalizedPath, statusCode, delay, responseBody, bodyMode, headers)
  }, [bodyMode, codeTab, delay, headers, method, normalizedPath, responseBody, statusCode])

  const mockConfig = useMemo(
    () =>
      formatJson({
        method,
        path: normalizedPath,
        status: statusCode,
        delay,
        bodyMode,
        headers: enabledHeaders.reduce<Record<string, string>>((acc, row) => {
          acc[row.key] = row.value
          return acc
        }, {}),
        body: bodyMode === "json" && safeParseJson(responseBody).ok ? safeParseJson(responseBody).value : responseBody,
      }),
    [bodyMode, delay, enabledHeaders, method, normalizedPath, responseBody, statusCode],
  )

  const showToast = useCallback((text: string, tone: ToastTone = "info") => {
    setToast({ text, tone })
    window.setTimeout(() => setToast(null), 1800)
  }, [])

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as {
          method?: HttpMethod
          path?: string
          statusCode?: number
          delay?: number
          bodyMode?: BodyMode
          responseBody?: string
          headers?: HeaderRow[]
          codeTab?: CodeTab
        }

        if (parsed.method && ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(parsed.method)) setMethod(parsed.method)
        if (typeof parsed.path === "string") setPath(parsed.path)
        if (typeof parsed.statusCode === "number") setStatusCode(parsed.statusCode)
        if (typeof parsed.delay === "number") setDelay(parsed.delay)
        if (parsed.bodyMode === "json" || parsed.bodyMode === "text") setBodyMode(parsed.bodyMode)
        if (typeof parsed.responseBody === "string") setResponseBody(parsed.responseBody)
        if (Array.isArray(parsed.headers) && parsed.headers.length) setHeaders(parsed.headers)
        if (parsed.codeTab && ["fetch", "msw", "next", "express", "curl"].includes(parsed.codeTab)) setCodeTab(parsed.codeTab)
      }
    } catch {
      // Keep default state.
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ method, path, statusCode, delay, bodyMode, responseBody, headers, codeTab }))
      } catch {}
    }, 220)

    return () => window.clearTimeout(timer)
  }, [bodyMode, codeTab, delay, headers, hydrated, method, path, responseBody, statusCode])

  useEffect(() => {
    if (!pageRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      gsap.from(".mock-enter", { opacity: 0, y: 16, duration: 0.62, stagger: 0.055, ease: "power3.out" })
      gsap.to(".mock-orb", { y: -10, x: 8, duration: 6.2, repeat: -1, yoyo: true, ease: "sine.inOut" })
      gsap.to(".mock-scan", { xPercent: 130, duration: 4.6, repeat: -1, ease: "sine.inOut" })
    }, pageRef)

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    return () => {
      if (simTimerRef.current) window.clearTimeout(simTimerRef.current)
    }
  }, [])

  const updateHeader = (id: string, patch: Partial<HeaderRow>) => {
    setHeaders((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  const addHeader = () => {
    setHeaders((current) => [...current, { id: createId(), key: "X-Mock-Source", value: "BitLeap", enabled: true }])
  }

  const removeHeader = (id: string) => {
    setHeaders((current) => current.filter((row) => row.id !== id))
  }

  const formatBody = () => {
    if (bodyMode === "text") {
      showToast("当前是文本模式，无需格式化。", "info")
      return
    }

    const parsed = safeParseJson(responseBody)
    if (!parsed.ok) {
      showToast(`JSON 格式错误：${parsed.error}`, "error")
      return
    }

    setResponseBody(formatJson(parsed.value))
    showToast("JSON 已格式化。", "success")
  }

  const minifyBody = () => {
    if (bodyMode === "text") return
    const parsed = safeParseJson(responseBody)
    if (!parsed.ok) {
      showToast("JSON 格式错误，无法压缩。", "error")
      return
    }
    setResponseBody(minifyJson(responseBody))
    showToast("JSON 已压缩成单行。", "success")
  }

  const validateBody = () => {
    if (bodyMode === "text") {
      showToast("文本模式无需 JSON 校验。", "info")
      return
    }

    const parsed = safeParseJson(responseBody)
    showToast(parsed.ok ? "JSON 格式合法。" : `JSON 格式错误：${parsed.error}`, parsed.ok ? "success" : "error")
  }

  const copyText = async (value: string, successText: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      showToast(successText, "success")
      window.setTimeout(() => setCopied(false), 1300)
    } catch {
      showToast("复制失败，浏览器可能未授权剪贴板。", "error")
    }
  }

  const applyPreset = (preset: Preset) => {
    setMethod(preset.method)
    setPath(preset.path)
    setStatusCode(preset.statusCode)
    setDelay(preset.delay)
    setBodyMode("json")
    setResponseBody(preset.body)
    setHeaders(cloneHeaders(preset.headers))
    showToast(`已应用「${preset.label}」。`, "success")
    requestAnimationFrame(() => responseRef.current?.focus())
  }

  const simulateRequest = () => {
    if (!isValid) {
      showToast("响应体不是合法 JSON，无法模拟。", "error")
      return
    }

    if (simTimerRef.current) window.clearTimeout(simTimerRef.current)

    setSimStatus("loading")
    setSimTime(null)
    const startedAt = performance.now()
    const timerDelay = Math.max(80, delay)
    simTimerRef.current = window.setTimeout(() => {
      setSimTime(Math.round(performance.now() - startedAt))
      setSimStatus("done")
    }, timerDelay)
  }

  const resetAll = () => {
    setMethod("GET")
    setPath("/api/demo")
    setStatusCode(200)
    setDelay(240)
    setBodyMode("json")
    setResponseBody(formatJson({ code: 0, data: {}, msg: "success" }))
    setHeaders(cloneHeaders(DEFAULT_HEADERS))
    setCodeTab("fetch")
    setSimStatus("idle")
    setSimTime(null)
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {}
    showToast("已重置 Mock 配置。", "info")
  }

  const onImportConfig = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0]
    if (!nextFile) return

    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result || "")
      const parsed = safeParseJson(text)
      if (!parsed.ok || !parsed.value || typeof parsed.value !== "object") {
        showToast("配置文件不是合法 JSON。", "error")
        return
      }

      const config = parsed.value as {
        method?: HttpMethod
        path?: string
        status?: number
        delay?: number
        bodyMode?: BodyMode
        headers?: Record<string, string>
        body?: unknown
      }

      if (config.method && ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(config.method)) setMethod(config.method)
      if (typeof config.path === "string") setPath(config.path)
      if (typeof config.status === "number") setStatusCode(config.status)
      if (typeof config.delay === "number") setDelay(config.delay)
      if (config.bodyMode === "text") setBodyMode("text")
      else setBodyMode("json")
      if (config.bodyMode === "text" && typeof config.body === "string") setResponseBody(config.body)
      else setResponseBody(formatJson(config.body ?? { code: 0, data: {}, msg: "success" }))

      if (config.headers && typeof config.headers === "object") {
        setHeaders(
          Object.entries(config.headers).map(([key, value]) => ({
            id: createId(),
            key,
            value: String(value),
            enabled: true,
          })),
        )
      }
      showToast("配置已导入。", "success")
    }
    reader.readAsText(nextFile)
    event.target.value = ""
  }

  return (
    <div ref={pageRef} className="relative min-h-[calc(100dvh-4rem)] overflow-hidden bg-[#f5f0e8] text-[#211a14]">
      <style>{`
        .mock-scroll::-webkit-scrollbar { width:5px; height:5px; }
        .mock-scroll::-webkit-scrollbar-track { background:transparent; }
        .mock-scroll::-webkit-scrollbar-thumb { background:rgba(33,26,20,.18); border-radius:999px; }
        .mock-num { font-variant-numeric:tabular-nums lining-nums; }
      `}</style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(255,255,255,.78),transparent_28%),radial-gradient(circle_at_84%_13%,rgba(221,206,176,.58),transparent_31%),linear-gradient(180deg,#fbf7ef_0%,#f5f0e8_55%,#eee4d4_100%)]" />
      <div className="mock-orb pointer-events-none absolute -right-32 top-24 h-[460px] w-[460px] rounded-full bg-[#d7c5a4]/24 blur-[120px]" />
      <div className="mock-orb pointer-events-none absolute -left-28 bottom-10 h-[380px] w-[380px] rounded-full bg-white/46 blur-[110px]" />

      <main className="relative z-10 mx-auto max-w-[1580px] px-5 py-6 sm:px-8 lg:px-10">
        <div className="mock-enter inline-flex max-w-max">
          <Breadcrumb />
        </div>

        <header className="mock-enter mt-8 grid gap-8 border-b border-black/[0.07] pb-8 lg:grid-cols-[minmax(0,1fr)_480px] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.24em] text-black/32">Local Mock Endpoint Studio</div>
            <h1 className="mt-4 max-w-[980px] text-[clamp(42px,6.2vw,92px)] font-semibold leading-[1.02] tracking-[-0.045em]">
              Mock 接口，
              <br />
              直接生成可用代码。
            </h1>
          </div>
          <p className="max-w-[520px] text-[12px] leading-7 text-black/45">
            配置请求方法、路径、状态码、延迟、响应头和响应体。实时校验 JSON，并生成 Fetch、MSW、Next Route Handler、Express 和 cURL 片段。
          </p>
        </header>

        {toast && (
          <div className={`mock-enter mt-5 rounded-[22px] border px-4 py-3 text-sm ${
            toast.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : toast.tone === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-amber-200 bg-amber-50 text-amber-700"
          }`}>
            {toast.text}
          </div>
        )}

        <section className="mt-6 grid gap-5 xl:grid-cols-[350px_minmax(0,1fr)_360px]">
          <aside className="mock-enter space-y-5">
            <div className="rounded-[34px] border border-black/[0.06] bg-white/44 p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/34">Endpoint</div>
                <MethodBadge method={method} />
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-400">请求方法</span>
                  <select value={method} onChange={(event) => setMethod(event.target.value as HttpMethod)} className="h-12 w-full rounded-2xl border border-black/[0.08] bg-white/62 px-4 text-sm font-semibold outline-none transition focus:border-zinc-900">
                    {(["GET", "POST", "PUT", "PATCH", "DELETE"] as HttpMethod[]).map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-400">接口路径</span>
                  <input value={path} onChange={(event) => setPath(event.target.value)} onBlur={() => setPath(normalizePath(path))} className="h-12 w-full rounded-2xl border border-black/[0.08] bg-white/62 px-4 font-mono text-sm outline-none transition focus:border-zinc-900" placeholder="/api/example" />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-400">状态码</span>
                    <input type="number" value={statusCode} min={100} max={599} onChange={(event) => setStatusCode(Math.max(100, Math.min(599, Number(event.target.value) || 200)))} className="h-12 w-full rounded-2xl border border-black/[0.08] bg-white/62 px-4 font-mono text-sm outline-none transition focus:border-zinc-900" />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-400">延迟 ms</span>
                    <input type="number" value={delay} min={0} max={120000} onChange={(event) => setDelay(Math.max(0, Number(event.target.value) || 0))} className="h-12 w-full rounded-2xl border border-black/[0.08] bg-white/62 px-4 font-mono text-sm outline-none transition focus:border-zinc-900" />
                  </label>
                </div>
              </div>
            </div>

            <div className="rounded-[34px] border border-black/[0.06] bg-white/44 p-5 backdrop-blur-xl">
              <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/34">Presets</div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {PRESETS.map((preset) => (
                  <button key={preset.label} type="button" onClick={() => applyPreset(preset)} className="rounded-[18px] border border-black/[0.06] bg-white/48 px-3 py-3 text-left transition hover:-translate-y-0.5 hover:bg-white">
                    <div className="text-sm font-semibold">{preset.label}</div>
                    <div className="mt-1 font-mono text-[10px] text-black/34">{preset.method} · {preset.statusCode}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[34px] border border-black/[0.06] bg-white/44 p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/34">Headers</div>
                <button type="button" onClick={addHeader} className="rounded-full border border-black/[0.08] bg-white/54 px-3 py-1.5 text-[10px] font-semibold text-zinc-500 transition hover:bg-white hover:text-zinc-950">添加</button>
              </div>

              <div className="space-y-3">
                {headers.map((header) => (
                  <div key={header.id} className="grid grid-cols-[auto_1fr_auto] gap-2">
                    <input type="checkbox" checked={header.enabled} onChange={(event) => updateHeader(header.id, { enabled: event.target.checked })} className="mt-3 accent-zinc-950" aria-label="启用响应头" />
                    <div className="grid gap-2">
                      <input value={header.key} onChange={(event) => updateHeader(header.id, { key: event.target.value })} className="h-9 rounded-xl border border-black/[0.07] bg-white/60 px-3 font-mono text-[11px] outline-none focus:border-zinc-900" placeholder="Header" />
                      <input value={header.value} onChange={(event) => updateHeader(header.id, { value: event.target.value })} className="h-9 rounded-xl border border-black/[0.07] bg-white/60 px-3 font-mono text-[11px] outline-none focus:border-zinc-900" placeholder="Value" />
                    </div>
                    <button type="button" onClick={() => removeHeader(header.id)} className="mt-1 h-8 w-8 rounded-full text-zinc-300 transition hover:bg-white hover:text-rose-600" aria-label="删除响应头">×</button>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <section className="mock-enter min-w-0 overflow-hidden rounded-[40px] border border-black/[0.06] bg-white/38 p-3 shadow-[0_35px_120px_-72px_rgba(45,35,22,.45)] backdrop-blur-xl">
            <div className="overflow-hidden rounded-[32px] border border-black/[0.055] bg-[#14120f]">
              <div className="relative border-b border-white/[0.08] px-5 py-4">
                <div className="mock-scan pointer-events-none absolute inset-y-0 left-[-35%] w-1/3 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.08),transparent)] opacity-50" />
                <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <MethodBadge method={method} />
                    <div className="mock-scroll min-w-0 overflow-x-auto rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-2 font-mono text-[11px] text-white/68">{normalizedPath}</div>
                  </div>
                  <div className={`rounded-full border px-3 py-1.5 text-[10px] font-bold ${statusTone(statusCode)}`}>{statusCode}</div>
                </div>
              </div>

              <div className="grid gap-px bg-white/[0.07] lg:grid-cols-[minmax(0,1fr)_270px]">
                <div className="bg-[#14120f] p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <PillButton active={bodyMode === "json"} onClick={() => setBodyMode("json")}>JSON</PillButton>
                      <PillButton active={bodyMode === "text"} onClick={() => setBodyMode("text")}>Text</PillButton>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={formatBody} className="rounded-full border border-white/[0.1] px-3 py-2 text-[10px] font-semibold text-white/45 transition hover:bg-white/[0.08] hover:text-white">格式化</button>
                      <button type="button" onClick={minifyBody} className="rounded-full border border-white/[0.1] px-3 py-2 text-[10px] font-semibold text-white/45 transition hover:bg-white/[0.08] hover:text-white">压缩</button>
                      <button type="button" onClick={validateBody} className="rounded-full bg-white px-3 py-2 text-[10px] font-semibold text-zinc-950 transition hover:bg-emerald-100">校验</button>
                    </div>
                  </div>

                  <textarea
                    ref={responseRef}
                    value={responseBody}
                    onChange={(event) => setResponseBody(event.target.value)}
                    spellCheck={false}
                    className={`mock-scroll h-[580px] w-full resize-none rounded-[24px] border bg-[#0e0d0b] p-4 font-mono text-[12px] leading-6 outline-none transition ${
                      isValid ? "border-white/[0.08] text-emerald-100/82 focus:border-emerald-300/40" : "border-rose-400/40 text-rose-100 focus:border-rose-300"
                    }`}
                  />
                </div>

                <aside className="bg-[#191713] p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Stat label="类型" value={jsonMeta.label} hint={isValid ? "响应体状态" : "语法错误"} />
                    <Stat label="大小" value={formatBytes(size)} hint="UTF-8 Blob" />
                    <Stat label="键 / 项" value={jsonMeta.keys} hint="Root entries" />
                    <Stat label="深度" value={jsonMeta.depth} hint="Nested depth" />
                  </div>

                  <button type="button" onClick={simulateRequest} className="mt-4 h-12 w-full rounded-full bg-white px-5 text-sm font-semibold text-zinc-950 transition hover:-translate-y-0.5 hover:bg-emerald-100">
                    {simStatus === "loading" ? "请求中..." : "模拟请求"}
                  </button>

                  <div className="mt-4 rounded-[24px] border border-white/[0.08] bg-white/[0.045] p-4">
                    <div className="text-[8px] font-semibold uppercase tracking-[0.18em] text-white/24">Simulation</div>
                    <div className="mt-4 space-y-3 text-[11px] text-white/45">
                      <div className="flex justify-between gap-3"><span>状态</span><span className="font-mono">{simStatus}</span></div>
                      <div className="flex justify-between gap-3"><span>耗时</span><span className="font-mono">{simTime === null ? "—" : `${simTime}ms`}</span></div>
                      <div className="flex justify-between gap-3"><span>响应码</span><span className="font-mono">{statusCode}</span></div>
                      <div className="flex justify-between gap-3"><span>响应头</span><span className="font-mono">{enabledHeaders.length}</span></div>
                    </div>
                  </div>

                  {!isValid && (
                    <div className="mt-4 rounded-[22px] border border-rose-300/20 bg-rose-400/10 p-4 text-[11px] leading-5 text-rose-100/80">
                      JSON 格式不合法，生成片段前建议先校验并修复。文本模式可以跳过 JSON 校验。
                    </div>
                  )}
                </aside>
              </div>
            </div>
          </section>

          <aside className="mock-enter space-y-5">
            <div className="rounded-[34px] border border-black/[0.06] bg-white/44 p-5 backdrop-blur-xl">
              <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/34">Code Target</div>
              <div className="mt-4 flex flex-wrap gap-2">
                {(["fetch", "msw", "next", "express", "curl"] as CodeTab[]).map((tab) => (
                  <PillButton key={tab} active={codeTab === tab} onClick={() => setCodeTab(tab)}>
                    {tab === "next" ? "Next" : tab.toUpperCase()}
                  </PillButton>
                ))}
              </div>
            </div>

            <CodePanel value={generated} copied={copied} onCopy={() => void copyText(generated, "代码片段已复制。")} />

            <div className="rounded-[34px] border border-black/[0.06] bg-white/46 p-5 backdrop-blur-xl">
              <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/34">Actions</div>
              <div className="mt-5 grid gap-3">
                <button type="button" onClick={() => void copyText(mockConfig, "Mock 配置已复制。")} className="h-12 rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-zinc-800">
                  复制完整配置
                </button>
                <button type="button" onClick={() => downloadText(mockConfig, "mock-endpoint.config.json", "application/json;charset=utf-8")} className="h-12 rounded-full border border-black/[0.08] bg-white/64 px-5 text-sm font-semibold text-zinc-700 transition hover:-translate-y-0.5 hover:bg-white">
                  下载配置 JSON
                </button>
                <label className="grid h-12 cursor-pointer place-items-center rounded-full border border-black/[0.08] bg-white/40 px-5 text-sm font-semibold text-zinc-500 transition hover:bg-white">
                  导入配置 JSON
                  <input type="file" accept="application/json,.json" className="hidden" onChange={onImportConfig} />
                </label>
                <button type="button" onClick={resetAll} className="h-12 rounded-full border border-orange-200 bg-orange-50/70 px-5 text-sm font-semibold text-orange-700 transition hover:bg-orange-100">
                  重置
                </button>
              </div>
            </div>

            <div className="rounded-[30px] border border-black/[0.06] bg-white/38 p-5 text-[11px] leading-6 text-black/42">
              <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-black/30">说明</div>
              这是前端 Mock 配置生成器，不会真正开启本地端口。它适合快速生成响应体、接口片段、MSW handler 或 Next.js route mock。
            </div>

            <div className="[&_*]:!text-black/38">
              <FooterNote />
            </div>
          </aside>
        </section>
      </main>
    </div>
  )
}
