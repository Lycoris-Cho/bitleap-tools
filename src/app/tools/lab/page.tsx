"use client"

import type { ChangeEvent } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type LabTemplate = "js" | "dom" | "canvas" | "wasm" | "webgpu" | "onnx"
type ConsoleLevel = "log" | "info" | "warn" | "error" | "result" | "system"
type CopyKey = "code" | "logs" | "report" | null
type RunStatus = "idle" | "running" | "done" | "error"
type EditorSize = "compact" | "comfortable" | "tall"

type LogEntry = {
  id: string
  level: ConsoleLevel
  text: string
  time: string
}

type TemplateMeta = {
  label: string
  short: string
  description: string
  code: string
}

const STORAGE_KEY = "bitleap-browser-lab-code-v2"
const SETTINGS_KEY = "bitleap-browser-lab-settings-v2"

const TEMPLATES: Record<LabTemplate, TemplateMeta> = {
  js: {
    label: "JavaScript",
    short: "JS",
    description: "同步 / 异步 console、数据处理、浏览器 API 快速试验。",
    code: `// JavaScript 浏览器实验台
console.log("Hello BitLeap Lab")

const arr = [1, 2, 3, 4, 5]
console.table(arr.map((x) => ({ value: x, square: x * x })))

await new Promise((resolve) => setTimeout(resolve, 240))
console.info("async log captured")
return arr.reduce((sum, item) => sum + item, 0)
`,
  },
  dom: {
    label: "DOM",
    short: "DOM",
    description: "在隔离 iframe 中创建 DOM，不污染当前页面。",
    code: `// DOM 实验模板
document.body.style.margin = "0"
document.body.innerHTML = \`
  <main style="min-height:100vh;display:grid;place-items:center;background:#f4f1e9;color:#22231f;font-family:system-ui">
    <section style="padding:28px;border:1px solid rgba(0,0,0,.1);border-radius:24px;background:white">
      <h1 style="margin:0 0 8px;font-size:34px;letter-spacing:-.06em">DOM Sandbox</h1>
      <p style="margin:0;color:rgba(0,0,0,.48)">Rendered inside an isolated iframe.</p>
    </section>
  </main>
\`

console.log("body children:", document.body.children.length)
`,
  },
  canvas: {
    label: "Canvas",
    short: "CANVAS",
    description: "用于 2D 绘制、图像处理、粒子草稿。",
    code: `// Canvas 实验模板
const canvas = document.createElement("canvas")
canvas.width = 720
canvas.height = 360
document.body.style.margin = "0"
document.body.style.display = "grid"
document.body.style.placeItems = "center"
document.body.style.minHeight = "100vh"
document.body.style.background = "#151714"
document.body.appendChild(canvas)

const ctx = canvas.getContext("2d")
ctx.fillStyle = "#f4f1e9"
ctx.fillRect(0, 0, canvas.width, canvas.height)

for (let i = 0; i < 24; i++) {
  ctx.beginPath()
  ctx.arc(80 + i * 24, 180 + Math.sin(i * 0.65) * 62, 10 + (i % 5) * 3, 0, Math.PI * 2)
  ctx.fillStyle = i % 2 ? "#52685d" : "#b28d48"
  ctx.fill()
}

console.log("canvas ready", canvas.width, canvas.height)
`,
  },
  wasm: {
    label: "WebAssembly",
    short: "WASM",
    description: "检测 WASM 能力，并预留实例化模板。",
    code: `// WebAssembly 实验模板
console.log("WebAssembly supported:", typeof WebAssembly !== "undefined")

// 一个最小 WASM 模块字节：空 module，仅用于 validate 示例
const emptyModule = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00])
console.log("valid wasm module:", WebAssembly.validate(emptyModule))

// 真实项目中可以 fetch / compile 你的 .wasm 文件后调用导出函数
`,
  },
  webgpu: {
    label: "WebGPU",
    short: "GPU",
    description: "检测 navigator.gpu，适合写 GPU compute / render 草稿。",
    code: `// WebGPU 实验模板
const supported = "gpu" in navigator
console.log("WebGPU supported:", supported)

if (supported) {
  const adapter = await navigator.gpu.requestAdapter()
  console.log("adapter:", adapter ? "available" : "not available")
  if (adapter) {
    const device = await adapter.requestDevice()
    console.log("device ready:", Boolean(device))
  }
} else {
  console.warn("当前浏览器或环境未开放 WebGPU")
}
`,
  },
  onnx: {
    label: "ONNX Runtime",
    short: "ONNX",
    description: "不内置 onnxruntime-web 依赖，保留接入模板和环境检测。",
    code: `// ONNX Runtime Web 实验模板
// 本页面不默认引入 onnxruntime-web，避免增加站点依赖体积
console.log("onnxruntime global:", typeof window.ort)

// 接入项目依赖后，可按需添加：
// import * as ort from "onnxruntime-web"
// const session = await ort.InferenceSession.create("/model.onnx")
// const results = await session.run(feeds)

console.warn("请在项目中安装并接入 onnxruntime-web 后再运行真实推理")
`,
  },
}

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function nowLabel() {
  const date = new Date()
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`
}

function safeStringify(value: unknown) {
  if (typeof value === "string") return value
  if (typeof value === "undefined") return "undefined"
  if (typeof value === "function") return `[Function ${value.name || "anonymous"}]`

  try {
    return JSON.stringify(
      value,
      (_key, item) => {
        if (typeof item === "function") return `[Function ${item.name || "anonymous"}]`
        if (item instanceof Error) return { name: item.name, message: item.message, stack: item.stack }
        return item
      },
      2,
    )
  } catch {
    return String(value)
  }
}

function buildRunnerHtml(code: string, runId: string, captureMs: number) {
  const payload = JSON.stringify(code)
  const id = JSON.stringify(runId)

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  html, body { min-height: 100%; }
  body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
</style>
</head>
<body>
<script>
(() => {
  const RUN_ID = ${id};
  const USER_CODE = ${payload};
  const CAPTURE_MS = ${captureMs};

  const safe = (value, seen = new WeakSet()) => {
    if (typeof value === "string") return value;
    if (typeof value === "undefined") return "undefined";
    if (typeof value === "function") return "[Function " + (value.name || "anonymous") + "]";
    if (value instanceof Error) return value.name + ": " + value.message;
    if (value instanceof HTMLElement) return "<" + value.tagName.toLowerCase() + ">";
    try {
      return JSON.stringify(value, (_key, item) => {
        if (typeof item === "function") return "[Function " + (item.name || "anonymous") + "]";
        if (item instanceof Error) return { name: item.name, message: item.message, stack: item.stack };
        if (item instanceof HTMLElement) return "<" + item.tagName.toLowerCase() + ">";
        if (item && typeof item === "object") {
          if (seen.has(item)) return "[Circular]";
          seen.add(item);
        }
        return item;
      }, 2);
    } catch (error) {
      return String(value);
    }
  };

  const send = (level, args) => {
    parent.postMessage({
      source: "bitleap-browser-lab",
      runId: RUN_ID,
      type: "log",
      level,
      args: Array.from(args).map((item) => safe(item))
    }, "*");
  };

  ["log", "info", "warn", "error"].forEach((level) => {
    const original = console[level].bind(console);
    console[level] = (...args) => {
      send(level, args);
      original(...args);
    };
  });

  console.table = (...args) => send("log", args);

  window.addEventListener("error", (event) => {
    send("error", [event.message]);
  });

  window.addEventListener("unhandledrejection", (event) => {
    send("error", [event.reason]);
  });

  const finish = (status, result) => {
    parent.postMessage({
      source: "bitleap-browser-lab",
      runId: RUN_ID,
      type: "done",
      status,
      result: safe(result)
    }, "*");
  };

  (async () => {
    try {
      const fn = new Function('"use strict"; return (async () => {\\n' + USER_CODE + '\\n})()');
      const result = await fn();
      if (typeof result !== "undefined") send("result", [result]);
      setTimeout(() => finish("done", result), CAPTURE_MS);
    } catch (error) {
      send("error", [error]);
      setTimeout(() => finish("error", error), 80);
    }
  })();
})();
</script>
</body>
</html>`
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

function copyLines(logs: LogEntry[]) {
  return logs.map((log) => `[${log.time}] ${log.level.toUpperCase()} ${log.text}`).join("\n")
}

function levelClass(level: ConsoleLevel) {
  if (level === "error") return "text-[#ffb2a4]"
  if (level === "warn") return "text-[#f2c779]"
  if (level === "info") return "text-[#9fb8ff]"
  if (level === "result") return "text-[#9ce3af]"
  if (level === "system") return "text-white/36"
  return "text-[#cbd8cd]"
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit: string
  onChange: (value: number) => void
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[8px]">
        <span className="text-black/30">{label}</span>
        <span className="lab-num font-mono font-semibold text-[#52685d]">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-[#52685d]" />
    </div>
  )
}

function TogglePill({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`rounded-full border px-3.5 py-2 text-[8px] font-semibold transition ${active ? "border-[#52685d]/20 bg-[#52685d] text-white" : "border-black/[.085] text-black/34 hover:bg-white/45 hover:text-black"}`}>
      {label}
    </button>
  )
}

function OutputBlock({
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
    <article className="rounded-[20px] border border-white/[.065] bg-white/[.035] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[8px] font-semibold tracking-[.13em] text-white/24">{label}</span>
        <button type="button" onClick={onCopy} className="text-[8px] font-semibold text-white/26 transition hover:text-white">{copied ? "✓ COPIED" : "COPY"}</button>
      </div>
      <pre className="lab-dark-scroll max-h-44 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-5 text-[#cbd8cd]">{value}</pre>
    </article>
  )
}

export default function LabPage() {
  const [activeTemplate, setActiveTemplate] = useState<LabTemplate>("js")
  const [code, setCode] = useState(TEMPLATES.js.code)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [runStatus, setRunStatus] = useState<RunStatus>("idle")
  const [copied, setCopied] = useState<CopyKey>(null)
  const [autoClear, setAutoClear] = useState(true)
  const [captureMs, setCaptureMs] = useState(600)
  const [fontSize, setFontSize] = useState(13)
  const [editorSize, setEditorSize] = useState<EditorSize>("comfortable")
  const [previewVisible, setPreviewVisible] = useState(true)
  const [runCount, setRunCount] = useState(0)
  const [lastDuration, setLastDuration] = useState<number | null>(null)
  const [runnerHtml, setRunnerHtml] = useState("")
  const [runId, setRunId] = useState("")
  const [loaded, setLoaded] = useState(false)

  const pageRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const runStartedRef = useRef(0)

  const activeMeta = TEMPLATES[activeTemplate]
  const editorHeight = editorSize === "compact" ? "h-[360px]" : editorSize === "tall" ? "h-[680px]" : "h-[520px]"
  const logText = useMemo(() => copyLines(logs), [logs])
  const report = useMemo(
    () =>
      [
        "BitLeap Browser Lab Studio",
        "",
        `Template: ${activeTemplate}`,
        `Status: ${runStatus}`,
        `Runs: ${runCount}`,
        `Last duration: ${lastDuration === null ? "—" : `${lastDuration}ms`}`,
        `Capture async logs: ${captureMs}ms`,
        "",
        "Code:",
        code,
        "",
        "Logs:",
        logText || "No logs",
      ].join("\n"),
    [activeTemplate, captureMs, code, lastDuration, logText, runCount, runStatus],
  )

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      const settings = localStorage.getItem(SETTINGS_KEY)

      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && typeof parsed.code === "string" && parsed.template in TEMPLATES) {
          setCode(parsed.code)
          setActiveTemplate(parsed.template)
        }
      }

      if (settings) {
        const parsed = JSON.parse(settings)
        if (parsed && typeof parsed === "object") {
          if (typeof parsed.autoClear === "boolean") setAutoClear(parsed.autoClear)
          if (typeof parsed.captureMs === "number") setCaptureMs(parsed.captureMs)
          if (typeof parsed.fontSize === "number") setFontSize(parsed.fontSize)
          if (["compact", "comfortable", "tall"].includes(parsed.editorSize)) setEditorSize(parsed.editorSize)
          if (typeof parsed.previewVisible === "boolean") setPreviewVisible(parsed.previewVisible)
        }
      }
    } catch {}

    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ template: activeTemplate, code }))
    } catch {}
  }, [activeTemplate, code, loaded])

  useEffect(() => {
    if (!loaded) return

    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({
          autoClear,
          captureMs,
          fontSize,
          editorSize,
          previewVisible,
        }),
      )
    } catch {}
  }, [autoClear, captureMs, editorSize, fontSize, loaded, previewVisible])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as {
        source?: string
        runId?: string
        type?: "log" | "done"
        level?: ConsoleLevel
        args?: string[]
        status?: RunStatus
      }

      if (!data || data.source !== "bitleap-browser-lab" || data.runId !== runId) return

      if (data.type === "log") {
        const text = (data.args ?? []).map(safeStringify).join(" ")
        setLogs((current) => [
          ...current,
          {
            id: uid(),
            level: data.level ?? "log",
            text,
            time: nowLabel(),
          },
        ])
      }

      if (data.type === "done") {
        const duration = Math.max(0, Math.round(performance.now() - runStartedRef.current))
        setLastDuration(duration)
        setIsRunning(false)
        setRunStatus(data.status === "error" ? "error" : "done")
        setLogs((current) => [
          ...current,
          {
            id: uid(),
            level: "system",
            text: `run finished in ${duration}ms`,
            time: nowLabel(),
          },
        ])
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [runId])

  useEffect(() => {
    if (!pageRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      gsap.from(".lab-intro", {
        opacity: 0,
        y: 18,
        duration: 0.72,
        stagger: 0.055,
        ease: "power3.out",
      })

      gsap.to(".lab-orbit", {
        rotation: 360,
        duration: 96,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })
    }, pageRef)

    return () => ctx.revert()
  }, [])

  const switchTemplate = (template: LabTemplate) => {
    setActiveTemplate(template)
    setCode(TEMPLATES[template].code)
    setLogs([])
    setRunStatus("idle")
    setLastDuration(null)
  }

  const runCode = () => {
    if (isRunning) return

    const id = uid()
    if (autoClear) setLogs([])
    setRunId(id)
    setIsRunning(true)
    setRunStatus("running")
    setRunCount((value) => value + 1)
    runStartedRef.current = performance.now()
    setRunnerHtml(buildRunnerHtml(code, id, captureMs))
  }

  const stopRun = () => {
    setRunnerHtml("")
    setIsRunning(false)
    setRunStatus("idle")
    setLogs((current) => [
      ...current,
      {
        id: uid(),
        level: "system",
        text: "runner iframe removed",
        time: nowLabel(),
      },
    ])
  }

  const clearOutput = () => {
    setLogs([])
    setLastDuration(null)
    setRunStatus("idle")
  }

  const copy = async (value: string, key: CopyKey) => {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {
      setLogs((current) => [
        ...current,
        {
          id: uid(),
          level: "error",
          text: "复制失败，请手动复制。",
          time: nowLabel(),
        },
      ])
    }
  }

  const handleImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      setCode(String(reader.result ?? ""))
      setActiveTemplate("js")
      setRunStatus("idle")
    }
    reader.readAsText(file)
    event.target.value = ""
  }

  const insertSnippet = (snippet: string) => {
    const editor = editorRef.current
    if (!editor) {
      setCode((current) => `${current}\n${snippet}`)
      return
    }

    const start = editor.selectionStart
    const end = editor.selectionEnd
    const next = `${code.slice(0, start)}${snippet}${code.slice(end)}`
    setCode(next)

    window.requestAnimationFrame(() => {
      editor.focus()
      editor.selectionStart = start + snippet.length
      editor.selectionEnd = start + snippet.length
    })
  }

  return (
    <div ref={pageRef} className="min-h-screen overflow-hidden bg-[#f0eee8] text-[#22231f] selection:bg-[#22231f] selection:text-white">
      <style>{`
        .lab-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
        .lab-scroll::-webkit-scrollbar-track { background: transparent; }
        .lab-scroll::-webkit-scrollbar-thumb { background: rgba(34,35,31,.13); border-radius: 999px; }
        .lab-dark-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.13); }
        .lab-num { font-variant-numeric: tabular-nums lining-nums; }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_84%_10%,rgba(178,141,72,.08),transparent_25%),radial-gradient(circle_at_8%_88%,rgba(82,104,93,.08),transparent_29%)]" />
        <div className="lab-orbit absolute right-[-18vw] top-[-22vw] h-[56vw] w-[56vw] rounded-full border border-black/[.035]">
          <span className="absolute left-[18%] top-[44%] h-2 w-2 rounded-full bg-[#52685d]/30" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1680px] px-5 pb-10 pt-6 sm:px-8">
        <div className="lab-intro">
          <Breadcrumb />
        </div>

        <header className="lab-intro mt-8 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.75fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/25">BROWSER LAB STUDIO</div>
            <h1 className="mt-4 text-[clamp(48px,6.2vw,88px)] font-semibold leading-[1.02] tracking-[-.055em]">
              前端实验，
              <br />
              放进隔离舱。
            </h1>
          </div>

          <div>
            <p className="max-w-[580px] text-[11px] leading-6 text-black/40">
              浏览器本地代码实验台。相较直接 eval，这版使用 sandbox iframe 运行用户代码，并捕获同步与短时异步 console 输出，适合 JS、DOM、Canvas、WASM、WebGPU 和 ONNX 接入草稿。
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {(Object.keys(TEMPLATES) as LabTemplate[]).map((template) => (
                <button key={template} type="button" onClick={() => switchTemplate(template)} className={`rounded-full px-3.5 py-2 text-[8px] font-semibold transition ${activeTemplate === template ? "bg-[#22231f] text-white" : "border border-black/[.08] text-black/34 hover:bg-white/50 hover:text-black"}`}>
                  {TEMPLATES[template].short}
                </button>
              ))}
            </div>
          </div>
        </header>

        <section className="lab-intro mt-7">
          <div className="grid gap-5 2xl:grid-cols-[1fr_360px]">
            <div className="min-w-0 overflow-hidden rounded-[32px] border border-black/[.08] bg-[#151714]">
              <div className="flex flex-col gap-4 border-b border-white/[.065] px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <div className="text-[8px] font-semibold tracking-[.13em] text-white/24">{activeMeta.label.toUpperCase()}</div>
                  <p className="mt-2 text-[9px] leading-5 text-white/34">{activeMeta.description}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={runCode} disabled={isRunning} className="rounded-full bg-white px-5 py-3 text-[9px] font-semibold text-[#151714] transition hover:scale-[1.01] active:scale-[.98] disabled:opacity-30">{isRunning ? "运行中..." : "运行"}</button>
                  <button type="button" onClick={stopRun} disabled={!isRunning && !runnerHtml} className="rounded-full border border-white/[.08] px-4 py-3 text-[9px] font-semibold text-white/33 transition hover:bg-white hover:text-[#151714] disabled:opacity-25">停止</button>
                  <button type="button" onClick={clearOutput} className="rounded-full border border-white/[.08] px-4 py-3 text-[9px] font-semibold text-white/33 transition hover:bg-white hover:text-[#151714]">清空</button>
                </div>
              </div>

              <div className="grid gap-px bg-white/[.06] xl:grid-cols-[1fr_.85fr]">
                <main className="min-w-0 bg-[#f4f1e9]">
                  <div className="flex h-12 items-center justify-between border-b border-black/[.065] px-5">
                    <span className="text-[8px] font-semibold tracking-[.13em] text-black/26">EDITOR</span>
                    <span className="lab-num font-mono text-[8px] text-black/24">{code.split(/\r?\n/).length} lines</span>
                  </div>

                  <div className="p-4 sm:p-5">
                    <textarea ref={editorRef} value={code} onChange={(event) => setCode(event.target.value)} spellCheck={false} className={`lab-scroll block w-full resize-none rounded-[24px] border border-black/[.075] bg-white/35 p-5 font-mono leading-6 text-black/72 outline-none transition focus:border-black/20 ${editorHeight}`} style={{ fontSize }} />

                    <div className="mt-4 flex flex-wrap gap-2">
                      {[
                        ["console.log()", `console.log("value:", value)\n`],
                        ["await delay", `await new Promise((resolve) => setTimeout(resolve, 300))\nconsole.log("done")\n`],
                        ["try/catch", `try {\n  // code\n} catch (error) {\n  console.error(error)\n}\n`],
                        ["measure", `const t = performance.now()\n// code\nconsole.log("cost", Math.round(performance.now() - t), "ms")\n`],
                      ].map(([label, snippet]) => (
                        <button key={label} type="button" onClick={() => insertSnippet(snippet)} className="rounded-full border border-black/[.08] px-3.5 py-2 text-[8px] font-semibold text-black/34 transition hover:bg-white/50 hover:text-black">{label}</button>
                      ))}
                    </div>
                  </div>
                </main>

                <aside className="min-w-0 bg-[#151714]">
                  <div className="flex h-12 items-center justify-between border-b border-white/[.065] px-5">
                    <span className="text-[8px] font-semibold tracking-[.13em] text-white/27">CONSOLE</span>
                    <span className={`text-[8px] ${runStatus === "error" ? "text-[#ffb2a4]" : runStatus === "running" ? "text-[#f2c779]" : "text-[#8fb69b]"}`}>{runStatus.toUpperCase()}</span>
                  </div>

                  <div className="lab-dark-scroll h-[520px] overflow-auto p-5 font-mono text-[10px] leading-6">
                    {logs.length ? (
                      logs.map((log) => (
                        <div key={log.id} className="mb-2 grid grid-cols-[70px_54px_1fr] gap-2">
                          <span className="text-white/18">{log.time}</span>
                          <span className={levelClass(log.level)}>{log.level}</span>
                          <span className={`whitespace-pre-wrap break-all ${levelClass(log.level)}`}>{log.text}</span>
                        </div>
                      ))
                    ) : (
                      <div className="grid h-full place-items-center text-center text-white/20">
                        <div>
                          <div className="text-[28px]">▻</div>
                          <p className="mt-3 text-[10px]">运行代码后在这里查看输出。</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-px border-t border-white/[.06] bg-white/[.06]">
                    {[
                      ["RUNS", String(runCount)],
                      ["LOGS", String(logs.length)],
                      ["DURATION", lastDuration === null ? "—" : `${lastDuration}ms`],
                    ].map(([label, value]) => (
                      <div key={label} className="bg-[#151714] p-4">
                        <div className="text-[7px] font-semibold tracking-[.12em] text-white/18">{label}</div>
                        <div className="lab-num mt-2 font-mono text-[10px] font-semibold text-[#cbd8cd]">{value}</div>
                      </div>
                    ))}
                  </div>
                </aside>
              </div>

              {previewVisible && (
                <div className="border-t border-white/[.06] bg-[#151714] p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-[8px] font-semibold tracking-[.13em] text-white/24">SANDBOX PREVIEW</span>
                    <span className="text-[8px] text-white/18">iframe · allow-scripts</span>
                  </div>
                  <iframe key={runId || "idle"} title="Browser Lab Sandbox" sandbox="allow-scripts" srcDoc={runnerHtml || "<!doctype html><html><body style='margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f1e9;color:rgba(0,0,0,.35);font-family:system-ui'>Run code to render preview</body></html>"} className="h-[300px] w-full rounded-[24px] border border-white/[.065] bg-[#f4f1e9]" />
                </div>
              )}
            </div>

            <aside className="min-w-0 space-y-4">
              <div className="rounded-[28px] border border-black/[.075] bg-white/24 p-5">
                <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">SETTINGS</div>

                <div className="mt-5 space-y-5">
                  <div>
                    <div className="mb-2 text-[8px] font-semibold tracking-[.12em] text-black/24">EDITOR HEIGHT</div>
                    <div className="flex flex-wrap gap-2">
                      <TogglePill active={editorSize === "compact"} label="紧凑" onClick={() => setEditorSize("compact")} />
                      <TogglePill active={editorSize === "comfortable"} label="舒适" onClick={() => setEditorSize("comfortable")} />
                      <TogglePill active={editorSize === "tall"} label="高编辑区" onClick={() => setEditorSize("tall")} />
                    </div>
                  </div>

                  <Slider label="字体大小" value={fontSize} min={11} max={18} unit="px" onChange={setFontSize} />
                  <Slider label="异步日志捕获" value={captureMs} min={0} max={3000} step={100} unit="ms" onChange={setCaptureMs} />

                  <div className="flex flex-wrap gap-2">
                    <TogglePill active={autoClear} label="运行前清空" onClick={() => setAutoClear((value) => !value)} />
                    <TogglePill active={previewVisible} label="显示 iframe" onClick={() => setPreviewVisible((value) => !value)} />
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-black/[.075] bg-white/24 p-5">
                <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">TEMPLATES</div>
                <div className="mt-4 grid gap-2">
                  {(Object.keys(TEMPLATES) as LabTemplate[]).map((template) => (
                    <button key={template} type="button" onClick={() => switchTemplate(template)} className={`rounded-[18px] border p-4 text-left transition ${activeTemplate === template ? "border-[#22231f]/15 bg-[#22231f] text-white" : "border-black/[.08] bg-white/22 hover:bg-white/48"}`}>
                      <div className={`font-mono text-[8px] font-semibold ${activeTemplate === template ? "text-white/35" : "text-black/25"}`}>{TEMPLATES[template].short}</div>
                      <div className={`mt-2 text-[13px] font-semibold ${activeTemplate === template ? "text-white" : "text-black/70"}`}>{TEMPLATES[template].label}</div>
                      <p className={`mt-2 text-[8px] leading-4 ${activeTemplate === template ? "text-white/35" : "text-black/30"}`}>{TEMPLATES[template].description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-black/[.075] bg-white/24 p-5">
                <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">FILES</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => copy(code, "code")} className="rounded-full bg-[#22231f] px-4 py-3 text-[9px] font-semibold text-white">{copied === "code" ? "✓ 代码" : "复制代码"}</button>
                  <button type="button" onClick={() => downloadText(code, "bitleap-lab-snippet.js")} className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 transition hover:bg-white/40">导出代码</button>
                  <label className="cursor-pointer rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 transition hover:bg-white/40">
                    导入代码
                    <input type="file" accept=".js,.mjs,.txt,text/javascript,text/plain" onChange={handleImport} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="rounded-[24px] border border-black/[.075] bg-white/24 p-5">
                <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">SAFETY NOTE</div>
                <p className="mt-3 text-[9px] leading-5 text-black/34">
                  代码在 sandbox iframe 中运行，不使用 allow-same-origin，不能直接访问父页面。不要运行不可信代码；无限循环仍可能卡住浏览器主线程。
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section className="lab-intro mt-12 grid gap-9 border-t border-black/10 pt-8 xl:grid-cols-[.62fr_1.38fr]">
          <div>
            <div className="text-[9px] font-semibold tracking-[.14em] text-black/25">EXPORT</div>
            <h2 className="mt-3 text-[clamp(30px,4vw,46px)] font-semibold leading-[1.06] tracking-[-.045em]">
              试验过程，
              <br />
              可以留下。
            </h2>
            <p className="mt-5 max-w-[410px] text-[9px] leading-5 text-black/34">报告包含当前模板、代码、日志、运行次数、耗时与异步捕获设置，适合保存实验记录或贴进 issue。</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <OutputBlock label="LOGS" value={logText || "No logs"} copied={copied === "logs"} onCopy={() => copy(logText, "logs")} />
            <OutputBlock label="REPORT" value={report} copied={copied === "report"} onCopy={() => copy(report, "report")} />
            <div className="lg:col-span-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => copy(report, "report")} className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white">{copied === "report" ? "✓ 已复制报告" : "复制报告"}</button>
              <button type="button" onClick={() => downloadText(report, "bitleap-browser-lab-report.txt")} className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 transition hover:bg-white/40">导出报告</button>
            </div>
          </div>
        </section>

        <section className="lab-intro mt-12 grid gap-8 border-t border-black/10 pt-7 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">SANDBOX RUNNER</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">不在 React 页面上下文直接 eval，而是把代码放进独立 iframe 运行并用 postMessage 回传日志。</p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">ASYNC CONSOLE</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">可设置异步日志捕获窗口，短延迟 Promise、setTimeout 输出也能进入内置 Console。</p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">LOCAL DRAFT</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">当前代码和设置会保存到 localStorage，刷新页面后可以继续上一次草稿。</p>
          </div>
        </section>

        <div className="mt-12 border-t border-black/[.08] pt-5">
          <FooterNote />
        </div>
      </div>
    </div>
  )
}
