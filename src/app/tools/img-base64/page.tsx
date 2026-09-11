"use client"

import type { ChangeEvent, DragEvent, ReactNode } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type OutputMode = "dataUrl" | "raw" | "html" | "css" | "markdown" | "json"
type CopyKey = OutputMode | "report" | null

type ImageInfo = {
  name: string
  type: string
  size: number
  width: number
  height: number
}

const MAX_SIZE = 8 * 1024 * 1024

const OUTPUT_TABS: Array<{ key: OutputMode; label: string }> = [
  { key: "dataUrl", label: "Data URL" },
  { key: "raw", label: "Raw" },
  { key: "html", label: "HTML" },
  { key: "css", label: "CSS" },
  { key: "markdown", label: "Markdown" },
  { key: "json", label: "JSON" },
]

function formatSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0%"
  return `${value.toFixed(1)}%`
}

function safeFilename(name: string) {
  return (name.replace(/\.[^.]+$/, "").trim() || "image").replace(/[^\w\u4e00-\u9fa5-]+/g, "-").replace(/-+/g, "-")
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("图片读取失败，请确认文件没有损坏。"))
    image.src = url
  })
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ""))
    reader.onerror = () => reject(new Error("读取文件失败，请重新选择图片。"))
    reader.readAsDataURL(file)
  })
}

function downloadText(content: string, filename: string) {
  if (!content) return

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 500)
}

function buildOutputs(dataUrl: string, info: ImageInfo | null) {
  const raw = dataUrl.includes(",") ? dataUrl.split(",").slice(1).join(",") : dataUrl
  const alt = info?.name ? safeFilename(info.name) : "image"

  return {
    dataUrl,
    raw,
    html: `<img src="${dataUrl}" alt="${alt}" />`,
    css: `.image-inline {\n  background-image: url("${dataUrl}");\n  background-size: contain;\n  background-repeat: no-repeat;\n  background-position: center;\n}`,
    markdown: `![${alt}](${dataUrl})`,
    json: JSON.stringify(
      {
        filename: info?.name || "",
        mimeType: info?.type || "",
        width: info?.width || 0,
        height: info?.height || 0,
        originalSize: info?.size || 0,
        dataUrl,
      },
      null,
      2,
    ),
  }
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M12 15V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M5 20h14" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="8" y="8" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M12 3v12m-5-5 5 5 5-5M5 21h14" />
    </svg>
  )
}

function PillButton({
  active,
  children,
  onClick,
  disabled,
}: {
  active?: boolean
  children: ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} aria-pressed={active} className={`rounded-full border px-3.5 py-2 text-[10px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-35 ${active ? "border-[#20251d] bg-[#20251d] text-[#f6efe3]" : "border-black/[0.08] bg-white/58 text-stone-500 hover:border-stone-300 hover:bg-white hover:text-stone-950"}`}>
      {children}
    </button>
  )
}

function StatChip({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: string
  tone?: "default" | "good" | "warn"
}) {
  const toneClass = tone === "good" ? "text-[#3e7257]" : tone === "warn" ? "text-[#a46c24]" : "text-[#221d18]"

  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white/60 px-4 py-3">
      <div className="text-[8px] font-semibold uppercase tracking-[0.16em] text-black/25">{label}</div>
      <div className={`b64-num mt-1.5 truncate font-mono text-[13px] font-semibold ${toneClass}`}>{value}</div>
    </div>
  )
}

function reportText(info: ImageInfo | null, dataUrl: string, rawLength: number, base64Bytes: number, growth: number) {
  return [
    "BitLeap Image Base64 Report",
    "",
    `File: ${info?.name ?? "—"}`,
    `MIME: ${info?.type ?? "—"}`,
    `Dimension: ${info ? `${info.width}×${info.height}` : "—"}`,
    `Original size: ${info ? formatSize(info.size) : "—"}`,
    `Data URL size: ${dataUrl ? formatSize(base64Bytes) : "—"}`,
    `Growth: ${dataUrl ? formatPercent(growth) : "—"}`,
    `Raw Base64 length: ${rawLength}`,
  ].join("\n")
}

export default function ImgToBase64() {
  const pageRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const previewUrlRef = useRef<string | null>(null)

  const [previewUrl, setPreviewUrl] = useState("")
  const [dataUrl, setDataUrl] = useState("")
  const [info, setInfo] = useState<ImageInfo | null>(null)
  const [outputMode, setOutputMode] = useState<OutputMode>("dataUrl")
  const [copied, setCopied] = useState<CopyKey>(null)
  const [message, setMessage] = useState("")
  const [dragging, setDragging] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [wrapOutput, setWrapOutput] = useState(true)

  const outputs = useMemo(() => buildOutputs(dataUrl, info), [dataUrl, info])
  const activeOutput = outputs[outputMode]
  const rawLength = outputs.raw.length
  const base64Bytes = dataUrl ? new Blob([dataUrl]).size : 0
  const growth = info && base64Bytes ? ((base64Bytes - info.size) / info.size) * 100 : 0
  const ratio = info ? info.width / Math.max(1, info.height) : 1
  const isLargeOutput = base64Bytes > 1024 * 1024
  const report = useMemo(() => reportText(info, dataUrl, rawLength, base64Bytes, growth), [base64Bytes, dataUrl, growth, info, rawLength])

  const revokePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
  }, [])

  const processFile = useCallback(
    async (file: File) => {
      setMessage("")
      setCopied(null)

      if (!file.type.startsWith("image/")) {
        setMessage("请选择图片文件。")
        return
      }

      if (file.size > MAX_SIZE) {
        setMessage(`图片不能超过 ${formatSize(MAX_SIZE)}。Base64 会让文本体积明显变大。`)
        return
      }

      setProcessing(true)
      revokePreview()

      const objectUrl = URL.createObjectURL(file)
      previewUrlRef.current = objectUrl
      setPreviewUrl(objectUrl)

      try {
        const [image, encoded] = await Promise.all([loadImage(objectUrl), readAsDataUrl(file)])
        setInfo({
          name: file.name,
          type: file.type || "image/*",
          size: file.size,
          width: image.naturalWidth,
          height: image.naturalHeight,
        })
        setDataUrl(encoded)
        setOutputMode("dataUrl")
        setMessage("图片已转换为 Data URL。")
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "图片转换失败。")
        setDataUrl("")
        setInfo(null)
      } finally {
        setProcessing(false)
      }
    },
    [revokePreview],
  )

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) void processFile(file)
    event.target.value = ""
  }

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) void processFile(file)
  }

  const copy = async (value: string, key: CopyKey, success = "已复制到剪贴板。") => {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      setMessage(success)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {
      setMessage("复制失败，浏览器可能未授权剪贴板。")
    }
  }

  const clear = () => {
    revokePreview()
    setPreviewUrl("")
    setDataUrl("")
    setInfo(null)
    setOutputMode("dataUrl")
    setCopied(null)
    setMessage("")
    setProcessing(false)
    if (inputRef.current) inputRef.current.value = ""
  }

  useEffect(() => {
    return () => revokePreview()
  }, [revokePreview])

  useEffect(() => {
    if (!pageRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      gsap.from(".b64-enter", { y: 14, opacity: 0, duration: 0.58, stagger: 0.045, ease: "power3.out" })
      gsap.to(".b64-orb", { y: -10, x: 8, duration: 6, repeat: -1, yoyo: true, ease: "sine.inOut" })
      gsap.to(".b64-line", { scaleX: 1.08, opacity: 0.72, duration: 3.4, repeat: -1, yoyo: true, ease: "sine.inOut", transformOrigin: "0 50%" })
    }, pageRef)

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (!dataUrl || !pageRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    gsap.fromTo(".b64-result-enter", { opacity: 0.72, y: 8 }, { opacity: 1, y: 0, duration: 0.32, ease: "power2.out", overwrite: true })
  }, [dataUrl, outputMode])

  return (
    <div ref={pageRef} className="relative min-h-[calc(100dvh-4rem)] overflow-hidden bg-[#efe9dd] text-[#1f1a14]">
      <style>{`
        .b64-scroll::-webkit-scrollbar { width:5px; height:5px; }
        .b64-scroll::-webkit-scrollbar-track { background:transparent; }
        .b64-scroll::-webkit-scrollbar-thumb { background:rgba(31,26,20,.18); border-radius:999px; }
        .b64-dark-scroll::-webkit-scrollbar { width:5px; height:5px; }
        .b64-dark-scroll::-webkit-scrollbar-track { background:transparent; }
        .b64-dark-scroll::-webkit-scrollbar-thumb { background:rgba(255,255,255,.16); border-radius:999px; }
        .b64-num { font-variant-numeric:tabular-nums lining-nums; }
        .b64-checker { background-color:#fbf8f1; background-image:linear-gradient(45deg,rgba(31,26,20,.055) 25%,transparent 25%),linear-gradient(-45deg,rgba(31,26,20,.055) 25%,transparent 25%),linear-gradient(45deg,transparent 75%,rgba(31,26,20,.055) 75%),linear-gradient(-45deg,transparent 75%,rgba(31,26,20,.055) 75%); background-size:18px 18px; background-position:0 0,0 9px,9px -9px,-9px 0px; }
      `}</style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(255,255,255,.82),transparent_28%),radial-gradient(circle_at_82%_16%,rgba(65,88,72,.14),transparent_32%),radial-gradient(circle_at_22%_88%,rgba(211,180,122,.22),transparent_28%),linear-gradient(180deg,#fbf8ef_0%,#efe9dd_58%,#e6dac7_100%)]" />
      <div className="b64-orb pointer-events-none absolute -right-32 top-24 h-[480px] w-[480px] rounded-full bg-[#314338]/10 blur-[120px]" />
      <div className="b64-orb pointer-events-none absolute -left-28 bottom-10 h-[380px] w-[380px] rounded-full bg-white/48 blur-[110px]" />

      <main className="relative z-10 mx-auto max-w-[1440px] px-5 py-6 sm:px-8 lg:px-10">
        <div className="b64-enter inline-flex max-w-max">
          <Breadcrumb />
        </div>

        <header className="b64-enter mt-7 grid gap-6 border-b border-black/[0.07] pb-7 lg:grid-cols-[minmax(0,1fr)_460px] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.24em] text-black/32">Local Image Base64 Studio</div>
            <h1 className="mt-3 max-w-[900px] text-[clamp(36px,5.4vw,78px)] font-semibold leading-[1.04] tracking-[-0.045em]">
              图片转 Base64，
              <br />
              输出更干净。
            </h1>
          </div>
          <p className="max-w-[520px] text-[12px] leading-7 text-black/45">
            重新调整为单一工作台布局：上传、预览、统计和输出都收进一个完整面板，避免左右三块过散、右侧代码区过高的问题。
          </p>
        </header>

        {message && (
          <div className="b64-enter mt-5 rounded-2xl border border-[#314338]/15 bg-white/50 px-4 py-3 text-sm text-[#314338] backdrop-blur-xl">
            {message}
          </div>
        )}

        <section className="b64-enter mt-6 overflow-hidden rounded-[42px] border border-black/[0.06] bg-white/44 p-3 shadow-[0_35px_120px_-72px_rgba(45,35,22,.45)] backdrop-blur-xl">
          <div className="overflow-hidden rounded-[34px] border border-black/[0.055] bg-[#f7f2e8]">
            <div className="grid gap-px bg-black/[0.06] xl:grid-cols-[minmax(0,1.04fr)_minmax(420px,.96fr)]">
              <section className="bg-[#fbf8f1] p-4 sm:p-5 lg:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[8px] font-semibold uppercase tracking-[0.18em] text-black/28">Preview</div>
                    <div className="mt-1 max-w-[520px] truncate text-sm font-semibold tracking-[-0.03em] text-[#211a14]">{info?.name || "等待选择图片"}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-[#20251d] px-4 text-xs font-semibold text-[#f8f1e6] transition hover:-translate-y-0.5 hover:bg-[#30382b]">
                      <UploadIcon />
                      {previewUrl ? "更换图片" : "选择图片"}
                      <input ref={inputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
                    </label>
                    <button type="button" onClick={clear} disabled={!previewUrl} className="h-10 rounded-full border border-orange-200 bg-orange-50/72 px-4 text-xs font-semibold text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-35">清空</button>
                  </div>
                </div>

                <label
                  onDragOver={(event) => {
                    event.preventDefault()
                    setDragging(true)
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  className={`b64-checker relative grid min-h-[560px] cursor-pointer place-items-center overflow-hidden rounded-[30px] border border-dashed p-5 transition ${
                    dragging ? "border-[#314338] bg-white" : "border-black/[0.11] hover:border-black/25"
                  }`}
                >
                  {!previewUrl && (
                    <div className="text-center">
                      <div className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] bg-[#20251d] text-[#f8f1e6] shadow-[0_24px_70px_-40px_rgba(32,37,29,.55)]">
                        <UploadIcon />
                      </div>
                      <h2 className="mt-6 text-[clamp(30px,4.4vw,58px)] font-semibold leading-[0.98] tracking-[-0.06em]">拖入图片</h2>
                      <p className="mx-auto mt-4 max-w-[360px] text-xs leading-6 text-black/40">支持 PNG / JPG / WebP / GIF / SVG 等图片文件，最大 {formatSize(MAX_SIZE)}。</p>
                    </div>
                  )}

                  {previewUrl && (
                    <div className="b64-result-enter w-full">
                      <div className="mx-auto max-w-[780px]">
                        <div className="relative grid min-h-[420px] place-items-center overflow-hidden rounded-[28px] border border-black/[0.06] bg-white/62 p-5 shadow-[0_32px_100px_-64px_rgba(25,20,15,.48)]">
                          <img src={previewUrl} alt="图片预览" className="max-h-[460px] max-w-full rounded-[22px] object-contain" />
                          {processing && (
                            <div className="absolute inset-0 grid place-items-center bg-white/58 backdrop-blur-sm">
                              <span className="rounded-full bg-[#20251d] px-4 py-2 text-xs font-semibold text-[#f8f1e6]">正在转换…</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 grid gap-2 sm:grid-cols-4">
                          <StatChip label="原图" value={info ? formatSize(info.size) : "—"} />
                          <StatChip label="尺寸" value={info ? `${info.width}×${info.height}` : "—"} />
                          <StatChip label="Data URL" value={dataUrl ? formatSize(base64Bytes) : "—"} tone={isLargeOutput ? "warn" : "default"} />
                          <StatChip label="膨胀" value={dataUrl ? formatPercent(growth) : "—"} tone={growth > 45 ? "warn" : "good"} />
                        </div>
                      </div>
                    </div>
                  )}
                </label>
              </section>

              <section className="bg-[#171812] p-4 text-white sm:p-5 lg:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[8px] font-semibold uppercase tracking-[0.18em] text-white/25">Output</div>
                    <div className="mt-1 font-mono text-[11px] text-emerald-100/62">{dataUrl ? `${rawLength} chars · ${info?.type || "image/*"}` : "等待转换结果"}</div>
                  </div>
                  <PillButton active={wrapOutput} onClick={() => setWrapOutput(!wrapOutput)}>{wrapOutput ? "自动换行" : "横向滚动"}</PillButton>
                </div>

                <div className="mb-4 flex flex-wrap gap-2">
                  {OUTPUT_TABS.map((tab) => (
                    <button key={tab.key} type="button" disabled={!dataUrl} onClick={() => setOutputMode(tab.key)} className={`rounded-full border px-3.5 py-2 text-[10px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-30 ${outputMode === tab.key ? "border-white bg-white text-[#171812]" : "border-white/[0.1] text-white/42 hover:bg-white/[0.07] hover:text-white"}`}>
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#0f100c]">
                  <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
                    <span className="text-[8px] font-semibold uppercase tracking-[0.18em] text-white/28">{OUTPUT_TABS.find((tab) => tab.key === outputMode)?.label}</span>
                    <button type="button" disabled={!activeOutput} onClick={() => void copy(activeOutput, outputMode)} className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] px-3 py-1.5 text-[9px] font-semibold text-white/45 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-30">
                      <CopyIcon />
                      {copied === outputMode ? "已复制" : "复制"}
                    </button>
                  </div>
                  <textarea readOnly value={activeOutput || ""} onClick={(event) => event.currentTarget.select()} className={`b64-dark-scroll h-[486px] w-full resize-none bg-transparent p-5 font-mono text-[11px] leading-5 text-emerald-100/78 outline-none placeholder:text-white/18 ${wrapOutput ? "whitespace-pre-wrap" : "whitespace-pre"}`} placeholder="转换后将在这里显示可复制内容…" />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <button type="button" disabled={!dataUrl} onClick={() => void copy(activeOutput, outputMode)} className="h-11 rounded-full bg-white px-4 text-xs font-semibold text-[#171812] transition hover:-translate-y-0.5 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-35">复制当前输出</button>
                  <button type="button" disabled={!dataUrl} onClick={() => downloadText(activeOutput, `${info ? safeFilename(info.name) : "image"}-${outputMode}.txt`)} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/[0.1] px-4 text-xs font-semibold text-white/52 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-35">
                    <DownloadIcon />
                    下载输出
                  </button>
                  <button type="button" disabled={!dataUrl} onClick={() => void copy(report, "report", "转换报告已复制。")} className="h-11 rounded-full border border-white/[0.1] px-4 text-xs font-semibold text-white/52 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-35">{copied === "report" ? "已复制报告" : "复制报告"}</button>
                </div>

                <div className="mt-5 rounded-[24px] border border-white/[0.08] bg-white/[0.045] p-4 text-[11px] leading-6 text-white/34">
                  <div className="mb-2 text-[8px] font-semibold uppercase tracking-[0.18em] text-white/22">Note</div>
                  Base64 更适合小图标、占位图、邮件模板和少量内联资源。大图内联会增加文档体积，也不利于浏览器缓存复用。
                </div>
              </section>
            </div>
          </div>
        </section>

        <section className="b64-enter mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-[26px] border border-black/[0.06] bg-white/38 p-5 backdrop-blur-xl">
            <div className="b64-line h-px w-16 bg-black/18" />
            <div className="mt-4 text-[9px] font-semibold uppercase tracking-[0.16em] text-black/25">Data URL</div>
            <p className="mt-2 text-[10px] leading-5 text-black/36">带有 MIME 前缀，适合直接放进 img src、CSS url 或 JSON 配置。</p>
          </div>
          <div className="rounded-[26px] border border-black/[0.06] bg-white/38 p-5 backdrop-blur-xl">
            <div className="b64-line h-px w-16 bg-black/18" />
            <div className="mt-4 text-[9px] font-semibold uppercase tracking-[0.16em] text-black/25">Raw Base64</div>
            <p className="mt-2 text-[10px] leading-5 text-black/36">只保留逗号后的编码正文，适合接口字段、数据库字段或后端处理。</p>
          </div>
          <div className="rounded-[26px] border border-black/[0.06] bg-white/38 p-5 backdrop-blur-xl">
            <div className="b64-line h-px w-16 bg-black/18" />
            <div className="mt-4 text-[9px] font-semibold uppercase tracking-[0.16em] text-black/25">Local only</div>
            <p className="mt-2 text-[10px] leading-5 text-black/36">读取、预览和转换都在当前浏览器完成，不会上传图片。</p>
          </div>
        </section>

        <div className="mt-10 border-t border-black/[0.08] pt-5 [&_*]:!text-black/38">
          <FooterNote />
        </div>
      </main>
    </div>
  )
}
