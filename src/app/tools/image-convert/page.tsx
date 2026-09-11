"use client"

import type { CSSProperties, ChangeEvent, DragEvent } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type OutputFormat = "jpeg" | "png" | "webp" | "avif"
type ResizeMode = "original" | "scale" | "max" | "custom"
type CopyKey = "report" | "snippet" | "settings" | string | null
type QueueStatus = "ready" | "converted" | "error" | "processing"
type PreviewMode = "before" | "after" | "compare"

type ImageItem = {
  id: string
  name: string
  size: number
  type: string
  src: string
  width: number
  height: number
  status: QueueStatus
  outputUrl?: string
  outputBytes?: number
  outputType?: string
  outputName?: string
  error?: string
  sourceKind: "file" | "sample"
}

type ConvertSettings = {
  format: OutputFormat
  quality: number
  resizeMode: ResizeMode
  scale: number
  maxWidth: number
  maxHeight: number
  customWidth: number
  customHeight: number
  keepRatio: boolean
  matteColor: string
  matteEnabled: boolean
}

const DEFAULT_SETTINGS: ConvertSettings = {
  format: "webp",
  quality: 0.82,
  resizeMode: "original",
  scale: 100,
  maxWidth: 1920,
  maxHeight: 1080,
  customWidth: 1200,
  customHeight: 800,
  keepRatio: true,
  matteColor: "#F4F1E9",
  matteEnabled: false,
}

const FORMAT_META: Record<OutputFormat, { label: string; ext: string; mime: string; note: string }> = {
  jpeg: { label: "JPEG", ext: "jpg", mime: "image/jpeg", note: "体积小，适合照片；不保留透明通道。" },
  png: { label: "PNG", ext: "png", mime: "image/png", note: "无损，适合截图、UI、透明图。" },
  webp: { label: "WebP", ext: "webp", mime: "image/webp", note: "现代网页常用，体积和质量平衡较好。" },
  avif: { label: "AVIF", ext: "avif", mime: "image/avif", note: "压缩率高，但导出依赖浏览器支持。" },
}

const PRESETS: Array<{ name: string; desc: string; settings: Partial<ConvertSettings> }> = [
  { name: "网页 WebP", desc: "保留原尺寸，质量 82%。", settings: { format: "webp", quality: 0.82, resizeMode: "original", matteEnabled: false } },
  { name: "社交 JPG", desc: "限制 1600×1600，白底。", settings: { format: "jpeg", quality: 0.88, resizeMode: "max", maxWidth: 1600, maxHeight: 1600, matteEnabled: true, matteColor: "#FFFFFF" } },
  { name: "轻量 AVIF", desc: "1080p 内，适合高压缩导出。", settings: { format: "avif", quality: 0.72, resizeMode: "max", maxWidth: 1920, maxHeight: 1080, matteEnabled: false } },
  { name: "透明 PNG", desc: "无损透明导出。", settings: { format: "png", resizeMode: "original", matteEnabled: false } },
  { name: "封面裁前稿", desc: "统一 1200 宽，保持比例。", settings: { format: "webp", quality: 0.86, resizeMode: "custom", customWidth: 1200, customHeight: 800, keepRatio: true } },
]

const SAMPLE_SRC =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 900">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#efe2c1"/>
      <stop offset="42%" stop-color="#9eb49d"/>
      <stop offset="100%" stop-color="#1f302a"/>
    </linearGradient>
    <radialGradient id="sun" cx="24%" cy="22%" r="30%">
      <stop offset="0%" stop-color="#fff6ba"/>
      <stop offset="100%" stop-color="#fff6ba" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1400" height="900" fill="url(#bg)"/>
  <rect width="1400" height="900" fill="url(#sun)"/>
  <circle cx="330" cy="210" r="94" fill="#F4C46F" opacity=".88"/>
  <path d="M0 610 C240 510 396 548 562 625 C760 716 920 530 1400 610 L1400 900 L0 900 Z" fill="#30463D" opacity=".84"/>
  <path d="M0 718 C280 632 520 690 700 736 C920 795 1120 676 1400 730 L1400 900 L0 900 Z" fill="#182A25" opacity=".74"/>
  <text x="80" y="805" fill="#fff5df" font-family="ui-sans-serif, system-ui" font-size="54" font-weight="700" letter-spacing="-2">BitLeap Image Convert</text>
</svg>`)

function safeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(Math.round(value))
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function fileBaseName(name: string) {
  const base = name.replace(/\.[^.]+$/, "").trim()
  return base || "image"
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("图片读取失败，可能是浏览器不支持该格式。"))
    image.src = src
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality?: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, quality))
}

function getTargetSize(item: ImageItem, settings: ConvertSettings) {
  const sourceW = Math.max(1, item.width)
  const sourceH = Math.max(1, item.height)

  if (settings.resizeMode === "scale") {
    const scale = clamp(settings.scale, 1, 400) / 100
    return { w: Math.max(1, Math.round(sourceW * scale)), h: Math.max(1, Math.round(sourceH * scale)) }
  }

  if (settings.resizeMode === "max") {
    const ratio = Math.min(1, settings.maxWidth / sourceW, settings.maxHeight / sourceH)
    return { w: Math.max(1, Math.round(sourceW * ratio)), h: Math.max(1, Math.round(sourceH * ratio)) }
  }

  if (settings.resizeMode === "custom") {
    const w = Math.max(1, Math.round(settings.customWidth))
    if (settings.keepRatio) return { w, h: Math.max(1, Math.round(w * (sourceH / sourceW))) }
    return { w, h: Math.max(1, Math.round(settings.customHeight)) }
  }

  return { w: sourceW, h: sourceH }
}

function exportName(item: ImageItem, settings: ConvertSettings) {
  const size = getTargetSize(item, settings)
  return `${fileBaseName(item.name)}-${size.w}x${size.h}.${FORMAT_META[settings.format].ext}`
}

function drawConvertedImage(canvas: HTMLCanvasElement, image: HTMLImageElement, target: { w: number; h: number }, settings: ConvertSettings) {
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas 初始化失败。")

  canvas.width = target.w
  canvas.height = target.h
  ctx.clearRect(0, 0, target.w, target.h)

  if (settings.format === "jpeg" || settings.matteEnabled) {
    ctx.fillStyle = settings.matteColor
    ctx.fillRect(0, 0, target.w, target.h)
  }

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(image, 0, 0, target.w, target.h)
}

function downloadUrl(url: string, filename: string) {
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
}

function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  downloadUrl(url, filename)
  window.setTimeout(() => URL.revokeObjectURL(url), 500)
}

function stageStyle(): CSSProperties {
  return {
    backgroundColor: "#F4F1E9",
    backgroundImage:
      "linear-gradient(45deg, rgba(0,0,0,.065) 25%, transparent 25%), linear-gradient(-45deg, rgba(0,0,0,.065) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(0,0,0,.065) 75%), linear-gradient(-45deg, transparent 75%, rgba(0,0,0,.065) 75%)",
    backgroundSize: "20px 20px",
    backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0",
  }
}

function outputSnippet(item: ImageItem | null, settings: ConvertSettings) {
  if (!item) return ""
  const size = getTargetSize(item, settings)
  const name = item.outputName ?? exportName(item, settings)
  const type = FORMAT_META[settings.format].mime

  return [
    "<picture>",
    `  <source srcSet=\"/images/${name}\" type=\"${type}\" />`,
    `  <img src=\"/images/${name}\" width=\"${size.w}\" height=\"${size.h}\" alt=\"\" loading=\"lazy\" decoding=\"async\" />`,
    "</picture>",
  ].join("\n")
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
        <span className="convert-num font-mono font-semibold text-[#52685D]">{Number.isInteger(value) ? value : value.toFixed(2)}{unit}</span>
      </div>
      <div className="flex items-center gap-3">
        <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="min-w-0 flex-1 accent-[#52685D]" />
        <input type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(clamp(Number(event.target.value) || 0, min, max))} className="w-20 rounded-full border border-black/[.08] bg-white/35 px-3 py-2 text-right font-mono text-[9px] outline-none" />
      </div>
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
    <button type="button" onClick={onClick} aria-pressed={active} className={`rounded-full border px-3.5 py-2 text-[8px] font-semibold transition ${active ? "border-[#52685D]/20 bg-[#52685D] text-white" : "border-black/[.085] text-black/34 hover:bg-white/45 hover:text-black"}`}>
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
      <pre className="convert-dark-scroll max-h-44 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-5 text-[#CBD8CD]">{value}</pre>
    </article>
  )
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
  const toneClass = tone === "green" ? "text-[#52685D]" : tone === "gold" ? "text-[#9B7542]" : tone === "rose" ? "text-[#965744]" : "text-black/61"

  return (
    <div className="bg-[#F3F0E8]/92 p-4">
      <div className="text-[7px] font-semibold tracking-[.12em] text-black/23">{label}</div>
      <div className={`convert-num mt-3 break-all font-mono text-[13px] font-semibold ${toneClass}`}>{value}</div>
    </div>
  )
}

function QueueCard({
  item,
  active,
  settings,
  onSelect,
  onRemove,
}: {
  item: ImageItem
  active: boolean
  settings: ConvertSettings
  onSelect: () => void
  onRemove: () => void
}) {
  const target = getTargetSize(item, settings)

  return (
    <article className={`grid grid-cols-[54px_1fr_auto] items-center gap-3 rounded-[18px] border p-3 transition ${active ? "border-[#22231F]/15 bg-[#22231F] text-white" : "border-black/[.08] bg-white/24 hover:bg-white/50"}`}>
      <button type="button" onClick={onSelect} className="overflow-hidden rounded-[14px] border border-current/10 bg-black/5">
        <img src={item.src} alt="" className="h-12 w-12 object-cover" />
      </button>
      <button type="button" onClick={onSelect} className="min-w-0 text-left">
        <div className="truncate text-[10px] font-semibold">{item.name}</div>
        <div className={`convert-num mt-1 truncate font-mono text-[8px] ${active ? "text-white/36" : "text-black/30"}`}>{item.width}×{item.height} → {target.w}×{target.h}</div>
        <div className={`mt-1 text-[7px] ${active ? "text-white/28" : item.status === "error" ? "text-[#965744]" : "text-black/24"}`}>{item.status}</div>
      </button>
      <button type="button" onClick={onRemove} className={`rounded-full px-2.5 py-1.5 text-[8px] font-semibold ${active ? "bg-white/10 text-[#FFB2A4]" : "bg-[#965744]/8 text-[#965744]"}`}>删</button>
    </article>
  )
}

export default function ImageConvertPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const itemsRef = useRef<ImageItem[]>([])

  const [items, setItems] = useState<ImageItem[]>([])
  const [activeId, setActiveId] = useState("")
  const [settings, setSettings] = useState<ConvertSettings>(DEFAULT_SETTINGS)
  const [isDragging, setIsDragging] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [copied, setCopied] = useState<CopyKey>(null)
  const [error, setError] = useState("")
  const [previewMode, setPreviewMode] = useState<PreviewMode>("before")

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => {
        if (item.sourceKind === "file") URL.revokeObjectURL(item.src)
        if (item.outputUrl) URL.revokeObjectURL(item.outputUrl)
      })
    }
  }, [])

  useEffect(() => {
    if (!pageRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      gsap.from(".convert-intro", { opacity: 0, y: 18, duration: 0.72, stagger: 0.055, ease: "power3.out" })
      gsap.to(".convert-orbit", { rotation: 360, duration: 96, repeat: -1, ease: "none", transformOrigin: "50% 50%" })
    }, pageRef)

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (!previewRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    gsap.fromTo(previewRef.current, { opacity: 0.78, scale: 0.995 }, { opacity: 1, scale: 1, duration: 0.2, ease: "power2.out", overwrite: true })
  }, [activeId, previewMode, settings.format])

  const activeItem = useMemo(() => items.find((item) => item.id === activeId) ?? items[0] ?? null, [activeId, items])
  const targetSize = useMemo(() => (activeItem ? getTargetSize(activeItem, settings) : null), [activeItem, settings])
  const convertedCount = useMemo(() => items.filter((item) => item.status === "converted").length, [items])
  const totalInputBytes = useMemo(() => items.reduce((sum, item) => sum + item.size, 0), [items])
  const totalOutputBytes = useMemo(() => items.reduce((sum, item) => sum + (item.outputBytes ?? 0), 0), [items])
  const snippet = useMemo(() => outputSnippet(activeItem, settings), [activeItem, settings])
  const settingsText = useMemo(
    () =>
      [
        `format: ${FORMAT_META[settings.format].label}`,
        `quality: ${settings.quality}`,
        `resize: ${settings.resizeMode}`,
        `matte: ${settings.format === "jpeg" || settings.matteEnabled ? settings.matteColor : "transparent"}`,
      ].join("\n"),
    [settings],
  )
  const report = useMemo(
    () =>
      [
        "BitLeap Image Convert Studio",
        "",
        `Files: ${items.length}`,
        `Converted: ${convertedCount}`,
        `Input bytes: ${formatBytes(totalInputBytes)}`,
        `Output bytes: ${totalOutputBytes ? formatBytes(totalOutputBytes) : "—"}`,
        "",
        "Settings:",
        settingsText,
        "",
        "Active:",
        activeItem ? `${activeItem.name} · ${activeItem.width}×${activeItem.height}${targetSize ? ` → ${targetSize.w}×${targetSize.h}` : ""}` : "—",
        "",
        "Snippet:",
        snippet || "—",
      ].join("\n"),
    [activeItem, convertedCount, items.length, settingsText, snippet, targetSize, totalInputBytes, totalOutputBytes],
  )

  const invalidateOutputs = () => {
    setItems((current) =>
      current.map((item) => {
        if (item.outputUrl) URL.revokeObjectURL(item.outputUrl)
        return {
          ...item,
          status: item.status === "error" ? "error" : "ready",
          outputUrl: undefined,
          outputBytes: undefined,
          outputType: undefined,
          outputName: undefined,
        }
      }),
    )
  }

  const patchSettings = (patch: Partial<ConvertSettings>) => {
    setSettings((current) => ({ ...current, ...patch }))
    invalidateOutputs()
  }

  const addFiles = async (files: File[]) => {
    const imageFiles = files.filter((file) => file.type.startsWith("image/"))
    if (!imageFiles.length) {
      setError("请选择图片文件。")
      return
    }

    const nextItems: ImageItem[] = []

    for (const file of imageFiles) {
      const url = URL.createObjectURL(file)

      try {
        const image = await loadImage(url)
        nextItems.push({
          id: safeId(),
          name: file.name,
          size: file.size,
          type: file.type,
          src: url,
          width: image.naturalWidth || image.width,
          height: image.naturalHeight || image.height,
          status: "ready",
          sourceKind: "file",
        })
      } catch (err) {
        URL.revokeObjectURL(url)
        setError(err instanceof Error ? err.message : "图片读取失败。")
      }
    }

    if (!nextItems.length) return

    setItems((current) => [...current, ...nextItems])
    setActiveId((current) => current || nextItems[0].id)
    setError("")
  }

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (files.length) addFiles(files)
    event.target.value = ""
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    const files = Array.from(event.dataTransfer.files ?? [])
    if (files.length) addFiles(files)
  }

  const addSample = async () => {
    try {
      const image = await loadImage(SAMPLE_SRC)
      const item: ImageItem = {
        id: safeId(),
        name: "bitleap-sample.svg",
        size: SAMPLE_SRC.length,
        type: "image/svg+xml",
        src: SAMPLE_SRC,
        width: image.naturalWidth || image.width || 1400,
        height: image.naturalHeight || image.height || 900,
        status: "ready",
        sourceKind: "sample",
      }
      setItems((current) => [item, ...current])
      setActiveId(item.id)
      setError("")
    } catch {
      setError("样张加载失败。")
    }
  }

  const removeItem = (id: string) => {
    setItems((current) => {
      const target = current.find((item) => item.id === id)
      if (target?.sourceKind === "file") URL.revokeObjectURL(target.src)
      if (target?.outputUrl) URL.revokeObjectURL(target.outputUrl)
      const next = current.filter((item) => item.id !== id)
      if (activeId === id) setActiveId(next[0]?.id ?? "")
      return next
    })
  }

  const clearAll = () => {
    items.forEach((item) => {
      if (item.sourceKind === "file") URL.revokeObjectURL(item.src)
      if (item.outputUrl) URL.revokeObjectURL(item.outputUrl)
    })
    setItems([])
    setActiveId("")
    setError("")
  }

  const convertOne = async (item: ImageItem) => {
    const canvas = canvasRef.current
    if (!canvas) throw new Error("Canvas 不可用。")

    setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, status: "processing", error: "" } : entry)))

    try {
      const image = await loadImage(item.src)
      const target = getTargetSize(item, settings)
      drawConvertedImage(canvas, image, target, settings)

      const meta = FORMAT_META[settings.format]
      const blob = await canvasToBlob(canvas, meta.mime, settings.format === "png" ? undefined : settings.quality)

      if (!blob) throw new Error("浏览器未能生成该格式。")
      if (settings.format !== "png" && blob.type && blob.type !== meta.mime) throw new Error(`${meta.label} 导出未被当前浏览器支持。`)

      const outputUrl = URL.createObjectURL(blob)
      const nextItem: ImageItem = {
        ...item,
        status: "converted",
        outputUrl,
        outputBytes: blob.size,
        outputType: blob.type || meta.mime,
        outputName: exportName(item, settings),
        error: "",
      }

      setItems((current) =>
        current.map((entry) => {
          if (entry.id !== item.id) return entry
          if (entry.outputUrl) URL.revokeObjectURL(entry.outputUrl)
          return nextItem
        }),
      )

      return nextItem
    } catch (err) {
      const message = err instanceof Error ? err.message : "转换失败。"
      setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, status: "error", error: message } : entry)))
      throw err
    }
  }

  const convertActive = async () => {
    if (!activeItem || isConverting) return
    setIsConverting(true)
    setError("")

    try {
      const converted = await convertOne(activeItem)
      setActiveId(converted.id)
      setPreviewMode("after")
    } catch (err) {
      setError(err instanceof Error ? err.message : "转换失败。")
    } finally {
      setIsConverting(false)
    }
  }

  const convertAll = async () => {
    if (!items.length || isConverting) return
    setIsConverting(true)
    setError("")

    for (const item of items) {
      try {
        await convertOne(item)
      } catch (err) {
        setError(err instanceof Error ? err.message : "部分图片转换失败。")
      }
    }

    setPreviewMode("after")
    setIsConverting(false)
  }

  const downloadActive = () => {
    if (!activeItem?.outputUrl) return
    downloadUrl(activeItem.outputUrl, activeItem.outputName ?? exportName(activeItem, settings))
  }

  const downloadAll = () => {
    const converted = items.filter((item) => item.outputUrl)
    converted.forEach((item, index) => {
      window.setTimeout(() => downloadUrl(item.outputUrl as string, item.outputName ?? exportName(item, settings)), index * 150)
    })
  }

  const copy = async (value: string, key: CopyKey) => {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {
      setError("复制失败，请手动复制。")
    }
  }

  return (
    <div ref={pageRef} className="min-h-screen overflow-hidden bg-[#F0EEE8] text-[#22231F] selection:bg-[#22231F] selection:text-white">
      <style>{`
        .convert-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
        .convert-scroll::-webkit-scrollbar-track { background: transparent; }
        .convert-scroll::-webkit-scrollbar-thumb { background: rgba(34,35,31,.13); border-radius: 999px; }
        .convert-dark-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.13); }
        .convert-num { font-variant-numeric: tabular-nums lining-nums; }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_84%_10%,rgba(178,141,72,.08),transparent_25%),radial-gradient(circle_at_8%_90%,rgba(82,104,93,.08),transparent_30%)]" />
        <div className="convert-orbit absolute right-[-18vw] top-[-22vw] h-[56vw] w-[56vw] rounded-full border border-black/[.035]">
          <span className="absolute left-[18%] top-[44%] h-2 w-2 rounded-full bg-[#52685D]/30" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1680px] px-5 pb-12 pt-6 sm:px-8">
        <div className="convert-intro">
          <Breadcrumb />
        </div>

        <header className="convert-intro mt-8 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.74fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/25">IMAGE CONVERT STUDIO</div>
            <h1 className="mt-4 text-[clamp(48px,6.2vw,88px)] font-semibold leading-[1.01] tracking-[-.058em]">
              图片转换，
              <br />
              不只是换后缀。
            </h1>
          </div>

          <div>
            <p className="max-w-[590px] text-[11px] leading-6 text-black/40">
              浏览器本地批量转换 JPG、PNG、WebP、AVIF。支持质量、尺寸、透明背景铺底、批量队列、转换前后预览、HTML picture 片段和转换报告。
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button key={preset.name} type="button" onClick={() => patchSettings(preset.settings)} className="rounded-full border border-black/[.08] px-3.5 py-2 text-[8px] font-semibold text-black/34 transition hover:bg-white/50 hover:text-black">{preset.name}</button>
              ))}
            </div>
          </div>
        </header>

        <section className="convert-intro mt-7 grid gap-5 xl:grid-cols-[330px_1fr_360px]">
          <aside className="min-w-0 space-y-4">
            <div className="rounded-[30px] border border-black/[.075] bg-white/24 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[8px] font-semibold tracking-[.14em] text-black/24">SOURCE QUEUE</div>
                  <p className="mt-2 text-[8px] leading-4 text-black/30">支持多图上传和拖拽。</p>
                </div>
                <button type="button" onClick={() => fileRef.current?.click()} className="rounded-full bg-[#22231F] px-4 py-3 text-[9px] font-semibold text-white">选择</button>
              </div>

              <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />

              <div onDragOver={(event) => event.preventDefault()} onDragEnter={() => setIsDragging(true)} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop} className={`mt-5 rounded-[24px] border border-dashed p-6 text-center transition ${isDragging ? "border-[#52685D] bg-[#52685D]/8" : "border-black/[.13] bg-white/20"}`}>
                <div className="text-[30px]">⇣</div>
                <p className="mt-2 text-[9px] leading-5 text-black/34">拖入图片，或点击选择文件。</p>
                <div className="mt-4 flex justify-center gap-2">
                  <button type="button" onClick={() => fileRef.current?.click()} className="rounded-full border border-black/[.08] px-4 py-2.5 text-[8px] font-semibold text-black/40 hover:bg-white/50">上传图片</button>
                  <button type="button" onClick={addSample} className="rounded-full border border-black/[.08] px-4 py-2.5 text-[8px] font-semibold text-black/40 hover:bg-white/50">加载样张</button>
                </div>
              </div>

              <div className="convert-scroll mt-5 max-h-[420px] space-y-3 overflow-auto pr-1">
                {items.length ? (
                  items.map((item) => (
                    <QueueCard key={item.id} item={item} active={activeItem?.id === item.id} settings={settings} onSelect={() => setActiveId(item.id)} onRemove={() => removeItem(item.id)} />
                  ))
                ) : (
                  <div className="rounded-[20px] border border-black/[.075] bg-white/24 p-5 text-[9px] leading-5 text-black/32">还没有图片。可以先加载样张体验转换流程。</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[22px] border border-black/[.075] bg-black/[.06]">
              <StatBox label="FILES" value={String(items.length)} tone="green" />
              <StatBox label="DONE" value={String(convertedCount)} tone="gold" />
              <StatBox label="INPUT" value={formatBytes(totalInputBytes)} />
              <StatBox label="OUTPUT" value={totalOutputBytes ? formatBytes(totalOutputBytes) : "—"} />
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={convertAll} disabled={!items.length || isConverting} className="rounded-full bg-[#22231F] px-5 py-3 text-[9px] font-semibold text-white transition disabled:opacity-35">全部转换</button>
              <button type="button" onClick={downloadAll} disabled={!convertedCount} className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 transition hover:bg-white/40 disabled:opacity-30">下载全部</button>
              <button type="button" onClick={clearAll} disabled={!items.length} className="rounded-full px-4 py-3 text-[9px] font-semibold text-[#965744] transition hover:bg-[#965744]/8 disabled:opacity-30">清空</button>
            </div>

            {error && <div className="rounded-[20px] border border-[#965744]/15 bg-[#965744]/8 p-4 text-[9px] leading-5 text-[#965744]">{error}</div>}
          </aside>

          <main className="min-w-0 overflow-hidden rounded-[32px] border border-black/[.08] bg-[#151714]">
            <div className="flex flex-col gap-3 border-b border-white/[.065] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[8px] font-semibold tracking-[.13em] text-white/24">PREVIEW STAGE</div>
                <p className="mt-2 text-[8px] text-white/27">查看原图与转换结果。</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <TogglePill active={previewMode === "before"} label="原图" onClick={() => setPreviewMode("before")} />
                <TogglePill active={previewMode === "after"} label="转换后" onClick={() => setPreviewMode("after")} />
                <TogglePill active={previewMode === "compare"} label="对照" onClick={() => setPreviewMode("compare")} />
              </div>
            </div>

            <div className="p-5 sm:p-7">
              <div ref={previewRef} className="convert-dark-scroll grid h-[620px] place-items-center overflow-auto rounded-[30px] border border-white/[.06] p-5" style={stageStyle()}>
                {activeItem ? (
                  previewMode === "compare" ? (
                    <div className="grid w-full max-w-[900px] gap-4 md:grid-cols-2">
                      <figure className="rounded-[24px] border border-black/[.08] bg-white/62 p-4">
                        <figcaption className="mb-3 text-[8px] font-semibold tracking-[.13em] text-black/28">BEFORE · {activeItem.width}×{activeItem.height}</figcaption>
                        <img src={activeItem.src} alt={activeItem.name} className="max-h-[430px] w-full object-contain" />
                      </figure>
                      <figure className="rounded-[24px] border border-black/[.08] bg-white/62 p-4">
                        <figcaption className="mb-3 text-[8px] font-semibold tracking-[.13em] text-black/28">AFTER · {targetSize ? `${targetSize.w}×${targetSize.h}` : "—"}</figcaption>
                        {activeItem.outputUrl ? <img src={activeItem.outputUrl} alt={`${activeItem.name} converted`} className="max-h-[430px] w-full object-contain" /> : <div className="grid h-[320px] place-items-center rounded-[20px] border border-dashed border-black/10 text-[9px] text-black/34">先转换当前图片</div>}
                      </figure>
                    </div>
                  ) : (
                    <figure className="w-full max-w-[900px] rounded-[28px] border border-black/[.08] bg-white/62 p-5 text-center">
                      <figcaption className="mb-4 flex flex-wrap items-center justify-between gap-3 text-left">
                        <span className="truncate text-[10px] font-semibold text-black/62">{previewMode === "after" ? activeItem.outputName ?? exportName(activeItem, settings) : activeItem.name}</span>
                        <span className="convert-num font-mono text-[8px] text-black/32">{previewMode === "after" && targetSize ? `${targetSize.w}×${targetSize.h}` : `${activeItem.width}×${activeItem.height}`}</span>
                      </figcaption>
                      {previewMode === "after" && activeItem.outputUrl ? (
                        <img src={activeItem.outputUrl} alt={`${activeItem.name} converted`} className="mx-auto max-h-[500px] max-w-full object-contain" />
                      ) : previewMode === "after" ? (
                        <div className="grid h-[390px] place-items-center rounded-[22px] border border-dashed border-black/10 text-[9px] text-black/34">转换后预览会显示在这里。</div>
                      ) : (
                        <img src={activeItem.src} alt={activeItem.name} className="mx-auto max-h-[500px] max-w-full object-contain" />
                      )}
                    </figure>
                  )
                ) : (
                  <div className="text-center text-black/34">
                    <div className="text-[42px]">IMG</div>
                    <p className="mt-3 text-[10px]">上传图片后开始转换。</p>
                  </div>
                )}
              </div>

              <div className="mt-5 grid gap-px overflow-hidden rounded-[22px] border border-white/[.06] bg-white/[.06] md:grid-cols-4">
                {[
                  ["FORMAT", FORMAT_META[settings.format].label],
                  ["QUALITY", settings.format === "png" ? "lossless" : `${Math.round(settings.quality * 100)}%`],
                  ["TARGET", targetSize ? `${formatNumber(targetSize.w)}×${formatNumber(targetSize.h)}` : "—"],
                  ["ACTIVE", activeItem ? activeItem.status : "—"],
                ].map(([label, value]) => (
                  <div key={label} className="bg-[#151714] p-4">
                    <div className="text-[7px] font-semibold tracking-[.12em] text-white/18">{label}</div>
                    <div className="convert-num mt-2 truncate font-mono text-[10px] font-semibold text-[#CBD8CD]">{value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={convertActive} disabled={!activeItem || isConverting} className="rounded-full bg-white px-5 py-3 text-[9px] font-semibold text-[#151714] transition hover:scale-[1.01] disabled:opacity-30">{isConverting ? "转换中..." : "转换当前"}</button>
                <button type="button" onClick={downloadActive} disabled={!activeItem?.outputUrl} className="rounded-full border border-white/[.08] px-4 py-3 text-[9px] font-semibold text-white/33 transition hover:bg-white hover:text-[#151714] disabled:opacity-25">下载当前</button>
              </div>
            </div>
          </main>

          <aside className="min-w-0 space-y-4">
            <div className="rounded-[28px] border border-black/[.075] bg-white/24 p-5">
              <div className="text-[8px] font-semibold tracking-[.14em] text-black/24">EXPORT SETTINGS</div>

              <div className="mt-5 space-y-6">
                <div>
                  <div className="mb-2 text-[8px] font-semibold tracking-[.12em] text-black/24">FORMAT</div>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(FORMAT_META) as OutputFormat[]).map((format) => (
                      <button key={format} type="button" onClick={() => patchSettings({ format })} className={`rounded-[16px] border p-3 text-left transition ${settings.format === format ? "border-[#22231F]/15 bg-[#22231F] text-white" : "border-black/[.08] bg-white/24 hover:bg-white/55"}`}>
                        <div className={`font-mono text-[10px] font-semibold ${settings.format === format ? "text-white" : "text-black/64"}`}>{FORMAT_META[format].label}</div>
                        <p className={`mt-2 text-[7px] leading-4 ${settings.format === format ? "text-white/34" : "text-black/28"}`}>{FORMAT_META[format].note}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {settings.format !== "png" && <Slider label="质量" value={settings.quality} min={0.1} max={1} step={0.01} unit="" onChange={(quality) => patchSettings({ quality })} />}

                <div>
                  <div className="mb-2 text-[8px] font-semibold tracking-[.12em] text-black/24">RESIZE</div>
                  <div className="flex flex-wrap gap-2">
                    <TogglePill active={settings.resizeMode === "original"} label="原尺寸" onClick={() => patchSettings({ resizeMode: "original" })} />
                    <TogglePill active={settings.resizeMode === "scale"} label="比例" onClick={() => patchSettings({ resizeMode: "scale" })} />
                    <TogglePill active={settings.resizeMode === "max"} label="最大边界" onClick={() => patchSettings({ resizeMode: "max" })} />
                    <TogglePill active={settings.resizeMode === "custom"} label="自定义" onClick={() => patchSettings({ resizeMode: "custom" })} />
                  </div>
                </div>

                {settings.resizeMode === "scale" && <Slider label="缩放比例" value={settings.scale} min={1} max={400} unit="%" onChange={(scale) => patchSettings({ scale })} />}

                {settings.resizeMode === "max" && (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                    <Slider label="Max width" value={settings.maxWidth} min={128} max={8000} step={16} unit="px" onChange={(maxWidth) => patchSettings({ maxWidth })} />
                    <Slider label="Max height" value={settings.maxHeight} min={128} max={8000} step={16} unit="px" onChange={(maxHeight) => patchSettings({ maxHeight })} />
                  </div>
                )}

                {settings.resizeMode === "custom" && (
                  <div className="grid gap-4">
                    <div className="flex flex-wrap gap-2">
                      <TogglePill active={settings.keepRatio} label="保持比例" onClick={() => patchSettings({ keepRatio: !settings.keepRatio })} />
                    </div>
                    <Slider label="Width" value={settings.customWidth} min={1} max={8000} step={8} unit="px" onChange={(customWidth) => patchSettings({ customWidth })} />
                    {!settings.keepRatio && <Slider label="Height" value={settings.customHeight} min={1} max={8000} step={8} unit="px" onChange={(customHeight) => patchSettings({ customHeight })} />}
                  </div>
                )}

                <div className="rounded-[22px] border border-black/[.075] bg-white/24 p-4">
                  <div className="mb-4 text-[8px] font-semibold tracking-[.12em] text-black/24">MATTE BACKGROUND</div>
                  <div className="flex flex-wrap gap-2">
                    <TogglePill active={settings.matteEnabled || settings.format === "jpeg"} label={settings.format === "jpeg" ? "JPEG 必须铺底" : "启用铺底"} onClick={() => patchSettings({ matteEnabled: !settings.matteEnabled })} />
                  </div>
                  <input type="color" value={settings.matteColor} onChange={(event) => patchSettings({ matteColor: event.target.value })} className="mt-4 h-12 w-full cursor-pointer rounded-[16px] border border-black/[.08] bg-transparent p-1" />
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-[28px] border border-black/[.08] bg-[#151714]">
              <div className="border-b border-white/[.06] px-5 py-4">
                <div className="text-[8px] font-semibold tracking-[.13em] text-white/22">OUTPUT</div>
              </div>
              <div className="convert-dark-scroll max-h-[560px] overflow-auto p-5">
                <div className="space-y-4">
                  <OutputBlock label="HTML picture" value={snippet || "上传或选择图片后生成。"} copied={copied === "snippet"} onCopy={() => copy(snippet, "snippet")} />
                  <OutputBlock label="Settings" value={settingsText} copied={copied === "settings"} onCopy={() => copy(settingsText, "settings")} />
                  <OutputBlock label="Report" value={report} copied={copied === "report"} onCopy={() => copy(report, "report")} />
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => copy(report, "report")} className="rounded-full bg-white px-4 py-3 text-[9px] font-semibold text-[#151714]">{copied === "report" ? "✓ 报告" : "复制报告"}</button>
                    <button type="button" onClick={() => downloadText(report, "bitleap-image-convert-report.txt")} className="rounded-full border border-white/[.08] px-4 py-3 text-[9px] font-semibold text-white/33 transition hover:bg-white hover:text-[#151714]">导出报告</button>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="convert-intro mt-12 grid gap-8 border-t border-black/10 pt-7 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">LOCAL CANVAS</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">图片通过 objectURL 本地读取，再由 canvas 编码导出。不会上传服务器。</p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">BATCH READY</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">可以一次加入多张图片，统一格式、质量和尺寸策略后批量转换。</p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">FORMAT LIMIT</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">AVIF / WebP 导出取决于浏览器的 canvas 编码能力；不支持时会显示错误。</p>
          </div>
        </section>

        <div className="mt-12 border-t border-black/[.08] pt-5">
          <FooterNote />
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
