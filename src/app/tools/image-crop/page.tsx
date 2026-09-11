"use client"

import type { ChangeEvent, DragEvent } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type FitMode = "cover" | "contain" | "stretch"
type ExportFormat = "png" | "jpeg" | "webp"
type RatioKey = "free" | "original" | "1:1" | "4:3" | "3:4" | "16:9" | "9:16" | "3:2" | "2:3"
type PreviewFit = "contain" | "actual"
type CopyKey = "css" | "report" | "size" | null

type ImageInfo = {
  name: string
  size: number
  type: string
  width: number
  height: number
}

type Preset = {
  name: string
  desc: string
  width: number
  height: number
  ratio: RatioKey
  fitMode: FitMode
  focusX: number
  focusY: number
}

const RATIO_OPTIONS: Array<{ key: RatioKey; label: string; value: number | null }> = [
  { key: "free", label: "自由", value: null },
  { key: "original", label: "原图", value: null },
  { key: "1:1", label: "1:1", value: 1 },
  { key: "4:3", label: "4:3", value: 4 / 3 },
  { key: "3:4", label: "3:4", value: 3 / 4 },
  { key: "16:9", label: "16:9", value: 16 / 9 },
  { key: "9:16", label: "9:16", value: 9 / 16 },
  { key: "3:2", label: "3:2", value: 3 / 2 },
  { key: "2:3", label: "2:3", value: 2 / 3 },
]

const PRESETS: Preset[] = [
  { name: "方形头像", desc: "社交头像和图标封面。", width: 1024, height: 1024, ratio: "1:1", fitMode: "cover", focusX: 50, focusY: 42 },
  { name: "文章封面", desc: "常用横向封面比例。", width: 1200, height: 675, ratio: "16:9", fitMode: "cover", focusX: 50, focusY: 50 },
  { name: "小红书竖图", desc: "竖向内容卡片比例。", width: 1080, height: 1440, ratio: "3:4", fitMode: "cover", focusX: 50, focusY: 50 },
  { name: "手机故事", desc: "Story / Reels 竖屏比例。", width: 1080, height: 1920, ratio: "9:16", fitMode: "cover", focusX: 50, focusY: 50 },
  { name: "完整留白", desc: "不裁切，按目标尺寸留白。", width: 1200, height: 900, ratio: "4:3", fitMode: "contain", focusX: 50, focusY: 50 },
]

const SAMPLE_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 900">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#efe2c1"/>
      <stop offset="45%" stop-color="#9eb49d"/>
      <stop offset="100%" stop-color="#273d38"/>
    </linearGradient>
    <radialGradient id="sun" cx="25%" cy="22%" r="30%">
      <stop offset="0%" stop-color="#fff7bf"/>
      <stop offset="100%" stop-color="#fff7bf" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1400" height="900" fill="url(#bg)"/>
  <rect width="1400" height="900" fill="url(#sun)"/>
  <circle cx="320" cy="205" r="95" fill="#f5c06e" opacity=".85"/>
  <path d="M0 630 C210 520 390 540 550 620 C760 725 930 520 1400 610 L1400 900 L0 900 Z" fill="#31463f" opacity=".88"/>
  <path d="M0 710 C280 640 505 690 680 735 C920 798 1110 672 1400 724 L1400 900 L0 900 Z" fill="#1f302c" opacity=".78"/>
  <g fill="#fff7dc" opacity=".28">
    <circle cx="880" cy="205" r="9"/>
    <circle cx="990" cy="260" r="5"/>
    <circle cx="1160" cy="178" r="7"/>
  </g>
  <text x="80" y="808" fill="#fff5df" font-family="ui-sans-serif, system-ui" font-size="48" font-weight="700" letter-spacing="-2">BitLeap Crop Preview</text>
</svg>`)

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value)
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("图片读取失败"))
    image.src = url
  })
}

function mimeFromFormat(format: ExportFormat) {
  if (format === "jpeg") return "image/jpeg"
  if (format === "webp") return "image/webp"
  return "image/png"
}

function extensionFromFormat(format: ExportFormat) {
  if (format === "jpeg") return "jpg"
  return format
}

function fileBaseName(name: string) {
  const clean = name.replace(/\.[^.]+$/, "")
  return clean || "image"
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

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2)

  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}

function drawCrop({
  canvas,
  image,
  width,
  height,
  fitMode,
  zoom,
  focusX,
  focusY,
  backgroundColor,
  radius,
  exportScale,
}: {
  canvas: HTMLCanvasElement
  image: HTMLImageElement
  width: number
  height: number
  fitMode: FitMode
  zoom: number
  focusX: number
  focusY: number
  backgroundColor: string
  radius: number
  exportScale: number
}) {
  const ctx = canvas.getContext("2d")
  if (!ctx) return

  const targetW = Math.max(1, Math.round(width * exportScale))
  const targetH = Math.max(1, Math.round(height * exportScale))
  const sourceW = image.naturalWidth || image.width
  const sourceH = image.naturalHeight || image.height

  canvas.width = targetW
  canvas.height = targetH

  ctx.clearRect(0, 0, targetW, targetH)
  ctx.fillStyle = backgroundColor
  ctx.fillRect(0, 0, targetW, targetH)

  if (radius > 0) {
    ctx.save()
    roundedRect(ctx, 0, 0, targetW, targetH, radius * exportScale)
    ctx.clip()
  }

  if (fitMode === "stretch") {
    ctx.drawImage(image, 0, 0, targetW, targetH)
  } else {
    const baseScale = fitMode === "cover" ? Math.max(targetW / sourceW, targetH / sourceH) : Math.min(targetW / sourceW, targetH / sourceH)
    const finalScale = baseScale * (fitMode === "cover" ? zoom : 1)
    const drawW = sourceW * finalScale
    const drawH = sourceH * finalScale
    const extraX = Math.max(0, drawW - targetW)
    const extraY = Math.max(0, drawH - targetH)
    const emptyX = Math.max(0, targetW - drawW)
    const emptyY = Math.max(0, targetH - drawH)
    const x = fitMode === "cover" ? -extraX * (focusX / 100) : emptyX * (focusX / 100)
    const y = fitMode === "cover" ? -extraY * (focusY / 100) : emptyY * (focusY / 100)

    ctx.drawImage(image, x, y, drawW, drawH)
  }

  if (radius > 0) {
    ctx.restore()
  }
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
        <span className="crop-num font-mono font-semibold text-[#52685d]">{Number.isInteger(value) ? value : value.toFixed(2)}{unit}</span>
      </div>
      <div className="flex items-center gap-3">
        <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="min-w-0 flex-1 accent-[#52685d]" />
        <input type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(clamp(Number(event.target.value) || 0, min, max))} className="w-20 rounded-full border border-black/[.08] bg-white/40 px-3 py-2 font-mono text-[9px] outline-none" />
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
    <button type="button" onClick={onClick} aria-pressed={active} className={`rounded-full border px-3.5 py-2 text-[8px] font-semibold transition ${active ? "border-[#52685d]/20 bg-[#52685d] text-white" : "border-black/[.085] text-black/34 hover:bg-white/45 hover:text-black"}`}>
      {label}
    </button>
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
  const toneClass = tone === "green" ? "text-[#52685d]" : tone === "gold" ? "text-[#9b7542]" : tone === "rose" ? "text-[#965744]" : "text-black/61"

  return (
    <div className="bg-[#f3f0e8]/92 p-4">
      <div className="text-[7px] font-semibold tracking-[.12em] text-black/23">{label}</div>
      <div className={`crop-num mt-3 break-all font-mono text-[13px] font-semibold ${toneClass}`}>{value}</div>
    </div>
  )
}

export default function ImageCrop() {
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null)
  const [width, setWidth] = useState(1200)
  const [height, setHeight] = useState(900)
  const [ratioKey, setRatioKey] = useState<RatioKey>("original")
  const [fitMode, setFitMode] = useState<FitMode>("cover")
  const [zoom, setZoom] = useState(1)
  const [focusX, setFocusX] = useState(50)
  const [focusY, setFocusY] = useState(50)
  const [radius, setRadius] = useState(0)
  const [backgroundColor, setBackgroundColor] = useState("#f4f1e9")
  const [exportScale, setExportScale] = useState(1)
  const [exportFormat, setExportFormat] = useState<ExportFormat>("png")
  const [quality, setQuality] = useState(0.92)
  const [previewFit, setPreviewFit] = useState<PreviewFit>("contain")
  const [useSample, setUseSample] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [copied, setCopied] = useState<CopyKey>(null)
  const [error, setError] = useState("")
  const [renderTick, setRenderTick] = useState(0)

  const fileRef = useRef<HTMLInputElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const objectUrlRef = useRef("")
  const pageRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const outputSize = useMemo(() => ({ w: Math.round(width * exportScale), h: Math.round(height * exportScale) }), [exportScale, height, width])
  const ratioLabel = useMemo(() => `${width}:${height}`, [height, width])
  const cssCode = useMemo(
    () =>
      [
        `.cropped-image {`,
        `  width: ${width}px;`,
        `  aspect-ratio: ${width} / ${height};`,
        `  object-fit: ${fitMode === "stretch" ? "fill" : fitMode};`,
        `  object-position: ${focusX}% ${focusY}%;`,
        `  border-radius: ${radius}px;`,
        `}`,
      ].join("\n"),
    [fitMode, focusX, focusY, height, radius, width],
  )

  const report = useMemo(
    () =>
      [
        "BitLeap Image Crop Studio",
        "",
        `图片：${imageInfo ? `${imageInfo.name} · ${imageInfo.width}×${imageInfo.height} · ${formatBytes(imageInfo.size)}` : useSample ? "内置样张" : "未上传"}`,
        `目标尺寸：${width}×${height}px`,
        `导出像素：${outputSize.w}×${outputSize.h}px`,
        `比例：${ratioKey} (${ratioLabel})`,
        `模式：${fitMode}`,
        `焦点：${focusX}% ${focusY}%`,
        `缩放：${zoom.toFixed(2)}x`,
        `圆角：${radius}px`,
        `背景：${backgroundColor}`,
        `格式：${exportFormat.toUpperCase()} · quality ${quality.toFixed(2)}`,
        "",
        cssCode,
      ].join("\n"),
    [backgroundColor, cssCode, exportFormat, fitMode, focusX, focusY, height, imageInfo, outputSize.h, outputSize.w, quality, radius, ratioKey, ratioLabel, useSample, width, zoom],
  )

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  useEffect(() => {
    const initSample = async () => {
      if (imageRef.current) return

      try {
        const image = await loadImage(SAMPLE_IMAGE)
        imageRef.current = image
        setImageInfo({
          name: "BitLeap sample.svg",
          size: SAMPLE_IMAGE.length,
          type: "image/svg+xml",
          width: image.naturalWidth || image.width,
          height: image.naturalHeight || image.height,
        })
        setRenderTick((value) => value + 1)
      } catch {}
    }

    initSample()
  }, [])

  useEffect(() => {
    const canvas = previewCanvasRef.current
    const image = imageRef.current

    if (!canvas || !image) return

    try {
      drawCrop({
        canvas,
        image,
        width,
        height,
        fitMode,
        zoom,
        focusX,
        focusY,
        backgroundColor,
        radius,
        exportScale,
      })
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "画布渲染失败")
    }
  }, [backgroundColor, exportScale, fitMode, focusX, focusY, height, radius, renderTick, width, zoom])

  useEffect(() => {
    if (!pageRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      gsap.from(".crop-intro", {
        opacity: 0,
        y: 18,
        duration: 0.72,
        stagger: 0.055,
        ease: "power3.out",
      })

      gsap.to(".crop-orbit", {
        rotation: 360,
        duration: 96,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })
    }, pageRef)

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (!previewRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    gsap.fromTo(
      previewRef.current,
      { opacity: 0.76, scale: 0.995 },
      {
        opacity: 1,
        scale: 1,
        duration: 0.2,
        ease: "power2.out",
        overwrite: true,
      },
    )
  }, [backgroundColor, exportScale, fitMode, focusX, focusY, height, radius, renderTick, width, zoom])

  const applyRatio = (key: RatioKey, currentWidth = width, currentHeight = height) => {
    setRatioKey(key)

    if (key === "free") return

    const option = RATIO_OPTIONS.find((item) => item.key === key)
    let ratio = option?.value ?? null

    if (key === "original") {
      const img = imageRef.current
      if (img) ratio = (img.naturalWidth || img.width) / Math.max(1, img.naturalHeight || img.height)
    }

    if (!ratio) return
    setHeight(Math.max(1, Math.round(currentWidth / ratio)))

    if (currentHeight > 0 && currentWidth <= 1) {
      setWidth(Math.max(1, Math.round(currentHeight * ratio)))
    }
  }

  const changeWidth = (next: number) => {
    const value = clamp(Math.round(next), 1, 8000)
    setWidth(value)

    if (ratioKey !== "free") {
      const option = RATIO_OPTIONS.find((item) => item.key === ratioKey)
      let ratio = option?.value ?? null
      const img = imageRef.current
      if (ratioKey === "original" && img) ratio = (img.naturalWidth || img.width) / Math.max(1, img.naturalHeight || img.height)
      if (ratio) setHeight(Math.max(1, Math.round(value / ratio)))
    }
  }

  const changeHeight = (next: number) => {
    const value = clamp(Math.round(next), 1, 8000)
    setHeight(value)

    if (ratioKey !== "free") {
      const option = RATIO_OPTIONS.find((item) => item.key === ratioKey)
      let ratio = option?.value ?? null
      const img = imageRef.current
      if (ratioKey === "original" && img) ratio = (img.naturalWidth || img.width) / Math.max(1, img.naturalHeight || img.height)
      if (ratio) setWidth(Math.max(1, Math.round(value * ratio)))
    }
  }

  const handleLoadedFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件")
      return
    }

    const url = URL.createObjectURL(file)

    try {
      const image = await loadImage(url)

      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = url
      imageRef.current = image

      const naturalWidth = image.naturalWidth || image.width
      const naturalHeight = image.naturalHeight || image.height

      setImageInfo({
        name: file.name,
        size: file.size,
        type: file.type,
        width: naturalWidth,
        height: naturalHeight,
      })
      setUseSample(false)
      setWidth(naturalWidth)
      setHeight(naturalHeight)
      setRatioKey("original")
      setZoom(1)
      setFocusX(50)
      setFocusY(50)
      setError("")
      setRenderTick((value) => value + 1)

      if (fileRef.current) fileRef.current.value = ""
    } catch (err) {
      URL.revokeObjectURL(url)
      setError(err instanceof Error ? err.message : "图片读取失败")
    }
  }

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) handleLoadedFile(file)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)

    const file = event.dataTransfer.files?.[0]
    if (file) handleLoadedFile(file)
  }

  const applyPreset = (preset: Preset) => {
    setWidth(preset.width)
    setHeight(preset.height)
    setRatioKey(preset.ratio)
    setFitMode(preset.fitMode)
    setFocusX(preset.focusX)
    setFocusY(preset.focusY)
    setZoom(1)
  }

  const resetToOriginal = () => {
    const img = imageRef.current
    if (!img) return

    setWidth(img.naturalWidth || img.width)
    setHeight(img.naturalHeight || img.height)
    setRatioKey("original")
    setFitMode("cover")
    setZoom(1)
    setFocusX(50)
    setFocusY(50)
    setRadius(0)
    setExportScale(1)
    setExportFormat("png")
    setQuality(0.92)
  }

  const download = () => {
    const canvas = previewCanvasRef.current
    if (!canvas) return

    canvas.toBlob(
      (blob) => {
        if (!blob) return

        const url = URL.createObjectURL(blob)
        const anchor = document.createElement("a")
        anchor.href = url
        anchor.download = `${fileBaseName(imageInfo?.name ?? "image")}-crop-${outputSize.w}x${outputSize.h}.${extensionFromFormat(exportFormat)}`
        anchor.click()
        window.setTimeout(() => URL.revokeObjectURL(url), 500)
      },
      mimeFromFormat(exportFormat),
      exportFormat === "png" ? undefined : quality,
    )
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
    <div ref={pageRef} className="min-h-screen overflow-hidden bg-[#f0eee8] text-[#22231f] selection:bg-[#22231f] selection:text-white">
      <style>{`
        .crop-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
        .crop-scroll::-webkit-scrollbar-track { background: transparent; }
        .crop-scroll::-webkit-scrollbar-thumb { background: rgba(34,35,31,.13); border-radius: 999px; }
        .crop-dark-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.13); }
        .crop-num { font-variant-numeric: tabular-nums lining-nums; }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(178,141,72,.08),transparent_25%),radial-gradient(circle_at_7%_91%,rgba(82,104,93,.08),transparent_29%)]" />
        <div className="crop-orbit absolute right-[-18vw] top-[-22vw] h-[56vw] w-[56vw] rounded-full border border-black/[.035]">
          <span className="absolute left-[18%] top-[44%] h-2 w-2 rounded-full bg-[#52685d]/30" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1600px] px-5 pb-10 pt-6 sm:px-8">
        <div className="crop-intro">
          <Breadcrumb />
        </div>

        <header className="crop-intro mt-8 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.75fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/25">IMAGE CROP STUDIO</div>
            <h1 className="mt-4 text-[clamp(48px,6.2vw,88px)] font-semibold leading-[1.02] tracking-[-.055em]">
              裁一张图，
              <br />
              刚好合适。
            </h1>
          </div>

          <div>
            <p className="max-w-[560px] text-[11px] leading-6 text-black/40">
              浏览器本地裁剪与缩放图片。支持目标尺寸、常用比例、cover / contain / stretch、焦点位置、圆角、导出倍率和 PNG / JPG / WEBP。
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button key={preset.name} type="button" onClick={() => applyPreset(preset)} className="rounded-full border border-black/[.08] px-3.5 py-2 text-[8px] font-semibold text-black/34 transition hover:bg-white/50 hover:text-black">{preset.name}</button>
              ))}
            </div>
          </div>
        </header>

        <section className="crop-intro mt-7 grid gap-7 xl:grid-cols-[.68fr_1.32fr]">
          <aside className="min-w-0 space-y-4">
            <div className="rounded-[28px] border border-black/[.075] bg-white/24 p-5">
              <div className="text-[8px] font-semibold tracking-[.14em] text-black/24">SOURCE IMAGE</div>
              <div onDragOver={(event) => event.preventDefault()} onDragEnter={() => setIsDragging(true)} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop} className={`mt-4 rounded-[22px] border border-dashed p-5 text-center transition ${isDragging ? "border-[#52685d] bg-[#52685d]/8" : "border-black/[.13] bg-white/20"}`}>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
                <button type="button" onClick={() => fileRef.current?.click()} className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white transition hover:scale-[1.01] active:scale-[.98]">选择图片</button>
                <p className="mt-3 text-[9px] leading-5 text-black/32">也可以拖拽图片到这里；处理只在浏览器本地完成。</p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-[20px] bg-black/[.06]">
                <StatBox label="IMAGE" value={imageInfo?.name ?? "未上传"} tone={imageInfo ? "green" : "ink"} />
                <StatBox label="FILE SIZE" value={imageInfo ? formatBytes(imageInfo.size) : "—"} />
                <StatBox label="ORIGINAL" value={imageInfo ? `${formatNumber(imageInfo.width)}×${formatNumber(imageInfo.height)}` : "—"} />
                <StatBox label="OUTPUT" value={`${formatNumber(outputSize.w)}×${formatNumber(outputSize.h)}`} tone="gold" />
              </div>
            </div>

            <div className="rounded-[24px] border border-black/[.075] bg-white/24 p-5">
              <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">CROP PRESETS</div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {PRESETS.map((preset) => (
                  <button key={preset.name} type="button" onClick={() => applyPreset(preset)} className="rounded-[18px] border border-black/[.08] bg-white/22 p-4 text-left transition hover:bg-white/48">
                    <div className="text-[13px] font-semibold text-black/68">{preset.name}</div>
                    <p className="mt-2 text-[8px] leading-4 text-black/30">{preset.desc}</p>
                    <div className="crop-num mt-2 font-mono text-[8px] text-black/24">{preset.width}×{preset.height}</div>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="rounded-[20px] border border-[#965744]/15 bg-[#965744]/8 p-4 text-[9px] leading-5 text-[#965744]">{error}</div>
            )}
          </aside>

          <div className="min-w-0">
            <div className="grid gap-px overflow-hidden rounded-[32px] border border-black/[.08] bg-black/[.08] lg:grid-cols-[.92fr_1.08fr]">
              <div className="bg-[#f4f1e9]">
                <div className="flex h-12 items-center justify-between border-b border-black/[.065] px-5">
                  <span className="text-[8px] font-semibold tracking-[.13em] text-black/26">CROP CONTROLS</span>
                  <span className="crop-num text-[8px] text-black/22">{width}×{height}</span>
                </div>

                <div className="crop-scroll h-[720px] overflow-auto p-5 sm:p-6">
                  <div className="space-y-6">
                    <div>
                      <div className="mb-2 text-[8px] font-semibold tracking-[.12em] text-black/24">RATIO</div>
                      <div className="flex flex-wrap gap-2">
                        {RATIO_OPTIONS.map((item) => (
                          <button key={item.key} type="button" onClick={() => applyRatio(item.key)} className={`rounded-full px-3.5 py-2 text-[8px] font-semibold transition ${ratioKey === item.key ? "bg-[#22231f] text-white" : "border border-black/[.08] text-black/34 hover:bg-white/50 hover:text-black"}`}>{item.label}</button>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Slider label="宽度" value={width} min={1} max={8000} unit="px" onChange={changeWidth} />
                      <Slider label="高度" value={height} min={1} max={8000} unit="px" onChange={changeHeight} />
                    </div>

                    <div>
                      <div className="mb-2 text-[8px] font-semibold tracking-[.12em] text-black/24">FIT MODE</div>
                      <div className="flex flex-wrap gap-2">
                        <TogglePill active={fitMode === "cover"} label="cover 裁切填满" onClick={() => setFitMode("cover")} />
                        <TogglePill active={fitMode === "contain"} label="contain 完整留白" onClick={() => setFitMode("contain")} />
                        <TogglePill active={fitMode === "stretch"} label="stretch 拉伸" onClick={() => setFitMode("stretch")} />
                      </div>
                    </div>

                    {fitMode === "cover" && (
                      <Slider label="缩放" value={zoom} min={1} max={3} step={0.01} unit="x" onChange={setZoom} />
                    )}

                    <div className="rounded-[22px] border border-black/[.075] bg-white/24 p-5">
                      <div className="mb-4 text-[8px] font-semibold tracking-[.12em] text-black/24">FOCUS POINT</div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Slider label="横向焦点" value={focusX} min={0} max={100} unit="%" onChange={setFocusX} />
                        <Slider label="纵向焦点" value={focusY} min={0} max={100} unit="%" onChange={setFocusY} />
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-1.5">
                        {[
                          ["左上", 0, 0],
                          ["上中", 50, 0],
                          ["右上", 100, 0],
                          ["左中", 0, 50],
                          ["居中", 50, 50],
                          ["右中", 100, 50],
                          ["左下", 0, 100],
                          ["下中", 50, 100],
                          ["右下", 100, 100],
                        ].map(([label, x, y]) => (
                          <button key={String(label)} type="button" onClick={() => { setFocusX(Number(x)); setFocusY(Number(y)) }} className="rounded-[14px] bg-white/28 px-3 py-3 text-[8px] font-semibold text-black/33 transition hover:bg-white/55">{label}</button>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Slider label="圆角" value={radius} min={0} max={260} unit="px" onChange={setRadius} />
                      <label>
                        <span className="mb-2 block text-[8px] text-black/24">背景色</span>
                        <input type="color" value={backgroundColor} onChange={(event) => setBackgroundColor(event.target.value)} className="h-12 w-full cursor-pointer rounded-[16px] border border-black/[.08] bg-transparent p-1" />
                      </label>
                    </div>

                    <div className="rounded-[22px] border border-black/[.075] bg-white/24 p-5">
                      <div className="mb-4 text-[8px] font-semibold tracking-[.12em] text-black/24">EXPORT</div>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <label>
                          <span className="mb-2 block text-[8px] text-black/24">格式</span>
                          <select value={exportFormat} onChange={(event) => setExportFormat(event.target.value as ExportFormat)} className="w-full rounded-full border border-black/[.08] bg-white/35 px-4 py-3 font-mono text-[10px] outline-none">
                            <option value="png">PNG</option>
                            <option value="jpeg">JPG</option>
                            <option value="webp">WEBP</option>
                          </select>
                        </label>
                        <Slider label="倍率" value={exportScale} min={0.5} max={4} step={0.5} unit="x" onChange={setExportScale} />
                        <Slider label="质量" value={quality} min={0.1} max={1} step={0.01} unit="" onChange={setQuality} />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={resetToOriginal} className="rounded-full px-4 py-3 text-[9px] font-semibold text-[#965744] transition hover:bg-[#965744]/8">恢复原图尺寸</button>
                      <button type="button" onClick={() => copy(`${width}×${height}`, "size")} className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 transition hover:bg-white/40">{copied === "size" ? "✓ 尺寸" : "复制尺寸"}</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#151714]">
                <div className="flex h-12 items-center justify-between border-b border-white/[.065] px-5">
                  <span className="text-[8px] font-semibold tracking-[.13em] text-white/27">LIVE CANVAS</span>
                  <span className="crop-num text-[8px] text-[#8fb69b]">{outputSize.w}×{outputSize.h}</span>
                </div>

                <div className="p-4 sm:p-5">
                  <div ref={previewRef} className="crop-dark-scroll grid h-[530px] place-items-center overflow-auto rounded-[26px] border border-white/[.065] bg-white/[.035] p-4">
                    <canvas ref={previewCanvasRef} className={previewFit === "contain" ? "max-h-full max-w-full rounded-[14px]" : "rounded-[14px]"} />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={download} className="rounded-full bg-white px-5 py-3 text-[9px] font-semibold text-[#151714] transition">下载图片</button>
                    <button type="button" onClick={() => setPreviewFit((value) => (value === "contain" ? "actual" : "contain"))} className="rounded-full border border-white/[.08] px-4 py-3 text-[9px] font-semibold text-white/33 transition hover:bg-white hover:text-[#151714]">{previewFit === "contain" ? "实际尺寸" : "适应预览"}</button>
                    <button type="button" onClick={() => copy(cssCode, "css")} className="rounded-full border border-white/[.08] px-4 py-3 text-[9px] font-semibold text-white/33 transition hover:bg-white hover:text-[#151714]">{copied === "css" ? "✓ CSS" : "复制 CSS"}</button>
                    <button type="button" onClick={() => { setUseSample(true); setRenderTick((value) => value + 1) }} className="rounded-full px-4 py-3 text-[9px] font-semibold text-[#d7bd86] transition hover:bg-[#d7bd86]/8">使用样张</button>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <div className="rounded-[20px] border border-white/[.065] bg-white/[.035] p-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-[8px] font-semibold tracking-[.12em] text-white/24">CSS object-fit reference</span>
                        <button type="button" onClick={() => copy(cssCode, "css")} className="text-[8px] font-semibold text-white/25 transition hover:text-white">{copied === "css" ? "✓ COPIED" : "COPY"}</button>
                      </div>
                      <pre className="crop-dark-scroll max-h-[132px] overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-5 text-[#cbd8cd]">{cssCode}</pre>
                    </div>

                    <div className="rounded-[20px] border border-white/[.065] bg-white/[.035] p-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-[8px] font-semibold tracking-[.12em] text-white/24">Report</span>
                        <button type="button" onClick={() => copy(report, "report")} className="text-[8px] font-semibold text-white/25 transition hover:text-white">{copied === "report" ? "✓ COPIED" : "COPY"}</button>
                      </div>
                      <pre className="crop-dark-scroll max-h-[162px] overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-5 text-[#cbd8cd]">{report}</pre>
                    </div>
                  </div>

                  <button type="button" onClick={() => downloadText(report, "bitleap-image-crop-report.txt")} className="mt-4 rounded-full border border-white/[.08] px-4 py-3 text-[9px] font-semibold text-white/33 transition hover:bg-white hover:text-[#151714]">导出报告</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="crop-intro mt-12 grid gap-8 border-t border-black/10 pt-7 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">LOCAL CANVAS</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">图片通过浏览器本地读取并绘制到 canvas，不上传服务器。导出时直接从当前画布生成文件。</p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">FOCUS CROP</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">Cover 裁切时可以调焦点位置，避免头像、主体或关键内容被默认居中裁掉。</p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">EXPORT SCALE</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">导出倍率会改变最终像素。大图或 4x 导出会占用更多内存，移动端建议适度使用。</p>
          </div>
        </section>

        <div className="mt-12 border-t border-black/[.08] pt-5">
          <FooterNote />
        </div>
      </div>
    </div>
  )
}
