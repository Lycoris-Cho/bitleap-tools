"use client"

import type { ChangeEvent, DragEvent } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type ExportFormat = "png" | "jpeg" | "webp"
type PreviewMode = "split" | "before" | "after" | "side"
type CopyKey = "settings" | "report" | "css" | null
type EnhancePresetId = "clean" | "portrait" | "product" | "scan" | "pixel" | "soft"

type ImageMeta = {
  name: string
  type: string
  size: number
  width: number
  height: number
}

type OutputMeta = {
  width: number
  height: number
  bytes: number
  mime: string
  filename: string
}

type EnhanceSettings = {
  scale: number
  sharpen: number
  contrast: number
  brightness: number
  saturation: number
  denoise: number
  maxSide: number
  background: string
  flattenTransparent: boolean
  exportFormat: ExportFormat
  quality: number
}

type EnhancePreset = {
  id: EnhancePresetId
  name: string
  desc: string
  settings: Partial<EnhanceSettings>
}

const DEFAULT_SETTINGS: EnhanceSettings = {
  scale: 2,
  sharpen: 1.35,
  contrast: 1.08,
  brightness: 1,
  saturation: 1.02,
  denoise: 0.14,
  maxSide: 3200,
  background: "#FFFFFF",
  flattenTransparent: false,
  exportFormat: "png",
  quality: 0.9,
}

const SAMPLE_IMAGE = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="480" viewBox="0 0 720 480">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#f4f1e9"/>
      <stop offset="1" stop-color="#d9dfd4"/>
    </linearGradient>
    <filter id="blur">
      <feGaussianBlur stdDeviation="0.65"/>
    </filter>
  </defs>
  <rect width="720" height="480" fill="url(#bg)"/>
  <circle cx="565" cy="105" r="88" fill="#b28d48" opacity=".18"/>
  <circle cx="148" cy="340" r="110" fill="#52685d" opacity=".18"/>
  <g filter="url(#blur)">
    <rect x="164" y="92" width="392" height="270" rx="38" fill="#fff" opacity=".86"/>
    <rect x="198" y="134" width="188" height="14" rx="7" fill="#52685d" opacity=".62"/>
    <rect x="198" y="171" width="300" height="10" rx="5" fill="#22231f" opacity=".17"/>
    <rect x="198" y="196" width="252" height="10" rx="5" fill="#22231f" opacity=".12"/>
    <rect x="198" y="240" width="116" height="86" rx="22" fill="#52685d" opacity=".76"/>
    <rect x="338" y="240" width="160" height="86" rx="22" fill="#b28d48" opacity=".52"/>
  </g>
  <g opacity=".18">
    <path d="M0 420 C130 380 220 462 350 420 S570 356 720 404" fill="none" stroke="#22231f" stroke-width="3"/>
    <path d="M0 438 C150 398 244 474 380 438 S595 378 720 422" fill="none" stroke="#22231f" stroke-width="2"/>
  </g>
  <text x="360" y="405" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="26" font-weight="700" fill="#22231f" opacity=".45">BitLeap Enhance Sample</text>
</svg>
`)}`

const PRESETS: EnhancePreset[] = [
  {
    id: "clean",
    name: "Clean Upscale",
    desc: "通用高清增强，适合多数网页图片。",
    settings: { scale: 2, sharpen: 1.35, contrast: 1.08, brightness: 1, saturation: 1.02, denoise: 0.14 },
  },
  {
    id: "portrait",
    name: "Portrait Soft",
    desc: "降低锐化，避免人像边缘过硬。",
    settings: { scale: 2, sharpen: 0.72, contrast: 1.04, brightness: 1.02, saturation: 1.04, denoise: 0.24 },
  },
  {
    id: "product",
    name: "Product Crisp",
    desc: "商品图、UI 截图、图标更清晰。",
    settings: { scale: 2, sharpen: 1.85, contrast: 1.14, brightness: 1.01, saturation: 1.08, denoise: 0.08 },
  },
  {
    id: "scan",
    name: "Scan Restore",
    desc: "扫描件 / 文档图增强对比和边缘。",
    settings: { scale: 1.5, sharpen: 1.65, contrast: 1.28, brightness: 1.03, saturation: 0.92, denoise: 0.1 },
  },
  {
    id: "pixel",
    name: "Pixel Gentle",
    desc: "低清小图轻修复，避免过度锐化。",
    settings: { scale: 3, sharpen: 0.95, contrast: 1.06, brightness: 1, saturation: 1, denoise: 0.32 },
  },
  {
    id: "soft",
    name: "Soft Light",
    desc: "柔和提亮，适合封面和氛围图。",
    settings: { scale: 2, sharpen: 0.86, contrast: 1.02, brightness: 1.06, saturation: 1.08, denoise: 0.18 },
  },
]

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value)
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

function mimeForFormat(format: ExportFormat) {
  if (format === "jpeg") return "image/jpeg"
  if (format === "webp") return "image/webp"
  return "image/png"
}

function extForFormat(format: ExportFormat) {
  if (format === "jpeg") return "jpg"
  return format
}

function baseName(name: string) {
  return name.replace(/\.[^.]+$/, "") || "image"
}

function safeFileName(name: string) {
  return name.replace(/[^\w\u4e00-\u9fa5.-]+/g, "-").replace(/-+/g, "-")
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.decoding = "async"
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("图片加载失败"))
    img.src = src
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error("当前浏览器不支持该导出格式"))
      },
      mime,
      quality,
    )
  })
}

function clampByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function adjustSaturation(r: number, g: number, b: number, saturation: number) {
  const luma = r * 0.2126 + g * 0.7152 + b * 0.0722
  return {
    r: luma + (r - luma) * saturation,
    g: luma + (g - luma) * saturation,
    b: luma + (b - luma) * saturation,
  }
}

function enhancePixels(imageData: ImageData, settings: EnhanceSettings) {
  const { width, height, data } = imageData
  const denoised = new Uint8ClampedArray(data.length)
  const output = new Uint8ClampedArray(data.length)
  const denoise = clamp(settings.denoise, 0, 1)
  const sharpen = clamp(settings.sharpen, 0, 4)
  const contrast = clamp(settings.contrast, 0.5, 2.2)
  const brightness = clamp(settings.brightness, 0.5, 1.8)
  const saturation = clamp(settings.saturation, 0, 2.2)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4
      let ar = 0
      let ag = 0
      let ab = 0
      let aa = 0
      let count = 0

      for (let oy = -1; oy <= 1; oy += 1) {
        for (let ox = -1; ox <= 1; ox += 1) {
          const sx = clamp(x + ox, 0, width - 1)
          const sy = clamp(y + oy, 0, height - 1)
          const si = (sy * width + sx) * 4
          ar += data[si]
          ag += data[si + 1]
          ab += data[si + 2]
          aa += data[si + 3]
          count += 1
        }
      }

      denoised[idx] = data[idx] * (1 - denoise) + (ar / count) * denoise
      denoised[idx + 1] = data[idx + 1] * (1 - denoise) + (ag / count) * denoise
      denoised[idx + 2] = data[idx + 2] * (1 - denoise) + (ab / count) * denoise
      denoised[idx + 3] = data[idx + 3] * (1 - denoise) + (aa / count) * denoise
    }
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4
      let ar = 0
      let ag = 0
      let ab = 0
      let count = 0

      for (let oy = -1; oy <= 1; oy += 1) {
        for (let ox = -1; ox <= 1; ox += 1) {
          const sx = clamp(x + ox, 0, width - 1)
          const sy = clamp(y + oy, 0, height - 1)
          const si = (sy * width + sx) * 4
          ar += denoised[si]
          ag += denoised[si + 1]
          ab += denoised[si + 2]
          count += 1
        }
      }

      const centerR = denoised[idx]
      const centerG = denoised[idx + 1]
      const centerB = denoised[idx + 2]

      let r = centerR + sharpen * (centerR - ar / count)
      let g = centerG + sharpen * (centerG - ag / count)
      let b = centerB + sharpen * (centerB - ab / count)

      r = ((r - 128) * contrast + 128) * brightness
      g = ((g - 128) * contrast + 128) * brightness
      b = ((b - 128) * contrast + 128) * brightness

      const sat = adjustSaturation(r, g, b, saturation)

      output[idx] = clampByte(sat.r)
      output[idx + 1] = clampByte(sat.g)
      output[idx + 2] = clampByte(sat.b)
      output[idx + 3] = denoised[idx + 3]
    }
  }

  return new ImageData(output, width, height)
}

function outputSize(width: number, height: number, scale: number, maxSide: number) {
  const rawW = Math.max(1, Math.round(width * scale))
  const rawH = Math.max(1, Math.round(height * scale))
  const longest = Math.max(rawW, rawH)

  if (longest <= maxSide) return { width: rawW, height: rawH, appliedScale: scale }

  const ratio = maxSide / longest
  return {
    width: Math.max(1, Math.round(rawW * ratio)),
    height: Math.max(1, Math.round(rawH * ratio)),
    appliedScale: scale * ratio,
  }
}

function drawOriginal(canvas: HTMLCanvasElement, image: HTMLImageElement) {
  const maxSide = 1400
  const ratio = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight))
  canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio))
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
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
        <span className="enhance-num font-mono font-semibold text-[#52685d]">{value.toFixed(step < 1 ? 2 : 0)}{unit}</span>
      </div>
      <div className="flex items-center gap-3">
        <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="min-w-0 flex-1 accent-[#52685d]" />
        <input type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(clamp(Number(event.target.value) || 0, min, max))} className="w-20 rounded-full border border-black/[.08] bg-white/35 px-3 py-2 text-right font-mono text-[9px] outline-none" />
      </div>
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
    <button type="button" onClick={onClick} aria-pressed={active} className={`rounded-full border px-3.5 py-2 text-[8px] font-semibold transition ${active ? "border-[#52685d]/20 bg-[#52685d] text-white" : "border-black/[.085] text-black/34 hover:bg-white/50 hover:text-black"}`}>
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
    <article className="border-t border-white/[.07] py-4 first:border-t-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[8px] font-semibold tracking-[.14em] text-white/22">{label}</span>
        <button type="button" onClick={onCopy} className="text-[8px] font-semibold text-white/28 transition hover:text-white">{copied ? "✓ COPIED" : "COPY"}</button>
      </div>
      <pre className="enhance-dark-scroll max-h-44 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-5 text-[#cbd8cd]">{value}</pre>
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
  const color = tone === "green" ? "text-[#52685d]" : tone === "gold" ? "text-[#9b7542]" : tone === "rose" ? "text-[#965744]" : "text-black/61"

  return (
    <div className="bg-[#f3f0e8]/92 p-4">
      <div className="text-[7px] font-semibold tracking-[.12em] text-black/23">{label}</div>
      <div className={`enhance-num mt-3 break-all font-mono text-[12px] font-semibold ${color}`}>{value}</div>
    </div>
  )
}

export default function ImageEnhance() {
  const [sourceUrl, setSourceUrl] = useState("")
  const [sourceMeta, setSourceMeta] = useState<ImageMeta | null>(null)
  const [settings, setSettings] = useState<EnhanceSettings>(DEFAULT_SETTINGS)
  const [previewMode, setPreviewMode] = useState<PreviewMode>("split")
  const [split, setSplit] = useState(52)
  const [processing, setProcessing] = useState(false)
  const [status, setStatus] = useState("上传图片或使用样张开始。")
  const [outputUrl, setOutputUrl] = useState("")
  const [outputMeta, setOutputMeta] = useState<OutputMeta | null>(null)
  const [copied, setCopied] = useState<CopyKey>(null)
  const [dragActive, setDragActive] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const originCanvasRef = useRef<HTMLCanvasElement>(null)
  const outputCanvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const sourceObjectUrlRef = useRef("")
  const outputObjectUrlRef = useRef("")
  const pageRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const sourceSize = useMemo(() => {
    if (!sourceMeta) return "—"
    return `${formatNumber(sourceMeta.width)} × ${formatNumber(sourceMeta.height)}`
  }, [sourceMeta])

  const projectedSize = useMemo(() => {
    if (!sourceMeta) return "—"
    const size = outputSize(sourceMeta.width, sourceMeta.height, settings.scale, settings.maxSide)
    return `${formatNumber(size.width)} × ${formatNumber(size.height)}`
  }, [settings.maxSide, settings.scale, sourceMeta])

  const settingsText = useMemo(
    () =>
      [
        `scale: ${settings.scale}x`,
        `sharpen: ${settings.sharpen.toFixed(2)}`,
        `denoise: ${settings.denoise.toFixed(2)}`,
        `contrast: ${settings.contrast.toFixed(2)}`,
        `brightness: ${settings.brightness.toFixed(2)}`,
        `saturation: ${settings.saturation.toFixed(2)}`,
        `max side: ${settings.maxSide}px`,
        `format: ${settings.exportFormat}`,
        `quality: ${settings.quality.toFixed(2)}`,
        `flatten transparent: ${settings.flattenTransparent}`,
      ].join("\n"),
    [settings],
  )

  const cssSnippet = useMemo(
    () =>
      [
        ".enhanced-image {",
        "  image-rendering: auto;",
        "  object-fit: contain;",
        "  max-width: 100%;",
        `  background: ${settings.flattenTransparent ? settings.background : "transparent"};`,
        "}",
      ].join("\n"),
    [settings.background, settings.flattenTransparent],
  )

  const report = useMemo(
    () =>
      [
        "BitLeap Image Enhance Studio",
        "",
        `Source: ${sourceMeta?.name ?? "—"}`,
        `Source size: ${sourceSize}`,
        `Output size: ${outputMeta ? `${outputMeta.width} × ${outputMeta.height}` : projectedSize}`,
        `Output file: ${outputMeta ? `${outputMeta.filename} · ${formatBytes(outputMeta.bytes)}` : "—"}`,
        "",
        "Settings:",
        settingsText,
      ].join("\n"),
    [outputMeta, projectedSize, settingsText, sourceMeta?.name, sourceSize],
  )

  useEffect(() => {
    if (!pageRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      gsap.from(".enhance-intro", {
        opacity: 0,
        y: 18,
        duration: 0.72,
        stagger: 0.055,
        ease: "power3.out",
      })

      gsap.to(".enhance-orbit", {
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
    gsap.fromTo(previewRef.current, { opacity: 0.78, scale: 0.996 }, { opacity: 1, scale: 1, duration: 0.22, ease: "power2.out", overwrite: true })
  }, [outputUrl, previewMode, split])

  useEffect(() => {
    return () => {
      if (sourceObjectUrlRef.current) URL.revokeObjectURL(sourceObjectUrlRef.current)
      if (outputObjectUrlRef.current) URL.revokeObjectURL(outputObjectUrlRef.current)
    }
  }, [])

  useEffect(() => {
    if (!sourceUrl) return

    let cancelled = false
    setStatus("正在读取图片…")
    setOutputUrl("")
    setOutputMeta(null)

    loadImage(sourceUrl)
      .then((image) => {
        if (cancelled) return
        imageRef.current = image
        const meta: ImageMeta = {
          name: sourceMeta?.name ?? "sample-enhance.svg",
          type: sourceMeta?.type ?? "image/svg+xml",
          size: sourceMeta?.size ?? 0,
          width: image.naturalWidth,
          height: image.naturalHeight,
        }
        setSourceMeta(meta)
        if (originCanvasRef.current) drawOriginal(originCanvasRef.current, image)
        setStatus("图片已载入，可以执行增强。")
      })
      .catch((error: Error) => {
        if (cancelled) return
        setStatus(error.message)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceUrl])

  const patchSettings = (patch: Partial<EnhanceSettings>) => {
    setSettings((current) => ({ ...current, ...patch }))
    setOutputUrl("")
    setOutputMeta(null)
  }

  const setImageFromFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setStatus("请选择图片文件。")
      return
    }

    if (sourceObjectUrlRef.current) URL.revokeObjectURL(sourceObjectUrlRef.current)

    const url = URL.createObjectURL(file)
    sourceObjectUrlRef.current = url
    setSourceMeta({
      name: file.name,
      type: file.type || "image",
      size: file.size,
      width: 0,
      height: 0,
    })
    setSourceUrl(url)
  }

  const handleSelectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setImageFromFile(file)
    event.target.value = ""
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragActive(false)
    const file = event.dataTransfer.files?.[0]
    if (file) setImageFromFile(file)
  }

  const useSample = () => {
    if (sourceObjectUrlRef.current) {
      URL.revokeObjectURL(sourceObjectUrlRef.current)
      sourceObjectUrlRef.current = ""
    }

    setSourceMeta({
      name: "sample-enhance.svg",
      type: "image/svg+xml",
      size: SAMPLE_IMAGE.length,
      width: 0,
      height: 0,
    })
    setSourceUrl(SAMPLE_IMAGE)
  }

  const runEnhance = useCallback(async () => {
    const image = imageRef.current
    const canvas = outputCanvasRef.current

    if (!image || !canvas) {
      setStatus("请先上传图片。")
      return
    }

    setProcessing(true)
    setStatus("正在放大并增强像素…")

    await new Promise((resolve) => window.requestAnimationFrame(resolve))

    try {
      const ctx = canvas.getContext("2d", { willReadFrequently: true })
      if (!ctx) throw new Error("无法创建 Canvas 上下文")

      const target = outputSize(image.naturalWidth, image.naturalHeight, settings.scale, settings.maxSide)
      canvas.width = target.width
      canvas.height = target.height
      ctx.clearRect(0, 0, target.width, target.height)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = "high"

      if (settings.flattenTransparent || settings.exportFormat === "jpeg") {
        ctx.fillStyle = settings.background
        ctx.fillRect(0, 0, target.width, target.height)
      }

      ctx.drawImage(image, 0, 0, target.width, target.height)

      const imageData = ctx.getImageData(0, 0, target.width, target.height)
      const next = enhancePixels(imageData, settings)
      ctx.putImageData(next, 0, 0)

      const mime = mimeForFormat(settings.exportFormat)
      const blob = await canvasToBlob(canvas, mime, settings.exportFormat === "png" ? 1 : settings.quality)

      if (outputObjectUrlRef.current) URL.revokeObjectURL(outputObjectUrlRef.current)
      const url = URL.createObjectURL(blob)
      outputObjectUrlRef.current = url

      const filename = `${safeFileName(baseName(sourceMeta?.name ?? "enhanced"))}-enhanced.${extForFormat(settings.exportFormat)}`
      setOutputUrl(url)
      setOutputMeta({
        width: target.width,
        height: target.height,
        bytes: blob.size,
        mime,
        filename,
      })
      setStatus(`增强完成：${formatNumber(target.width)} × ${formatNumber(target.height)} · ${formatBytes(blob.size)}`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "处理失败")
    } finally {
      setProcessing(false)
    }
  }, [settings, sourceMeta?.name])

  const download = () => {
    if (!outputUrl || !outputMeta) {
      void runEnhance()
      return
    }

    const anchor = document.createElement("a")
    anchor.href = outputUrl
    anchor.download = outputMeta.filename
    anchor.click()
  }

  const copy = async (text: string, key: CopyKey) => {
    if (!text) return

    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {
      setStatus("复制失败，请手动复制。")
    }
  }

  const applyPreset = (preset: EnhancePreset) => {
    patchSettings(preset.settings)
  }

  const reset = () => {
    setSettings(DEFAULT_SETTINGS)
    setPreviewMode("split")
    setSplit(52)
    setOutputUrl("")
    setOutputMeta(null)
    setCopied(null)
    setStatus(sourceUrl ? "已重置参数，可以重新增强。" : "上传图片或使用样张开始。")
  }

  return (
    <div ref={pageRef} className="min-h-screen overflow-hidden bg-[#f0eee8] text-[#22231f] selection:bg-[#22231f] selection:text-white">
      <style>{`
        .enhance-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
        .enhance-scroll::-webkit-scrollbar-track { background: transparent; }
        .enhance-scroll::-webkit-scrollbar-thumb { background: rgba(34,35,31,.13); border-radius: 999px; }
        .enhance-dark-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.13); }
        .enhance-num { font-variant-numeric: tabular-nums lining-nums; }
        .enhance-checker {
          background-color: #f4f1e9;
          background-image:
            linear-gradient(45deg, rgba(0,0,0,.055) 25%, transparent 25%),
            linear-gradient(-45deg, rgba(0,0,0,.055) 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, rgba(0,0,0,.055) 75%),
            linear-gradient(-45deg, transparent 75%, rgba(0,0,0,.055) 75%);
          background-size: 18px 18px;
          background-position: 0 0, 0 9px, 9px -9px, -9px 0;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_84%_10%,rgba(178,141,72,.08),transparent_25%),radial-gradient(circle_at_8%_88%,rgba(82,104,93,.08),transparent_29%)]" />
        <div className="enhance-orbit absolute right-[-18vw] top-[-22vw] h-[56vw] w-[56vw] rounded-full border border-black/[.035]">
          <span className="absolute left-[18%] top-[44%] h-2 w-2 rounded-full bg-[#52685d]/30" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1680px] px-5 pb-10 pt-6 sm:px-8">
        <div className="enhance-intro">
          <Breadcrumb />
        </div>

        <header className="enhance-intro mt-8 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/25">IMAGE ENHANCE STUDIO</div>
            <h1 className="mt-4 text-[clamp(48px,6.2vw,90px)] font-semibold leading-[1.01] tracking-[-.06em]">
              高清增强，
              <br />
              先看细节。
            </h1>
          </div>

          <div>
            <p className="max-w-[590px] text-[11px] leading-6 text-black/40">
              浏览器本地处理图片，不上传服务器。通过高质量缩放、轻量降噪、USM 锐化、亮度 / 对比度 / 饱和度调整，生成适合网页使用的增强图。
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button key={preset.id} type="button" onClick={() => applyPreset(preset)} className="rounded-full border border-black/[.08] px-3.5 py-2 text-[8px] font-semibold text-black/34 transition hover:bg-white/50 hover:text-black">
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        </header>

        <section className="enhance-intro mt-7 grid gap-5 xl:grid-cols-[340px_1fr_340px]">
          <aside className="min-w-0 space-y-4">
            <div className="rounded-[30px] border border-black/[.075] bg-white/24 p-5">
              <div className="text-[8px] font-semibold tracking-[.14em] text-black/24">SOURCE</div>

              <input ref={fileRef} type="file" accept="image/*" onChange={handleSelectFile} className="hidden" />

              <div
                onDragOver={(event) => {
                  event.preventDefault()
                  setDragActive(true)
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                className={`mt-5 rounded-[26px] border border-dashed p-5 text-center transition ${dragActive ? "border-[#52685d] bg-[#52685d]/8" : "border-black/[.12] bg-white/22"}`}
              >
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#22231f] text-[18px] text-white">↥</div>
                <p className="mt-4 text-[12px] font-semibold tracking-[-.02em] text-black/65">拖入图片或选择文件</p>
                <p className="mt-2 text-[8px] leading-4 text-black/30">JPG / PNG / WebP / GIF 静态帧 / SVG 等浏览器可解码图片。</p>
                <div className="mt-4 flex justify-center gap-2">
                  <button type="button" onClick={() => fileRef.current?.click()} className="rounded-full bg-[#22231f] px-4 py-3 text-[9px] font-semibold text-white">选择图片</button>
                  <button type="button" onClick={useSample} className="rounded-full border border-black/[.08] px-4 py-3 text-[9px] font-semibold text-black/36 transition hover:bg-white/50">使用样张</button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[22px] border border-black/[.075] bg-black/[.06]">
              <StatBox label="SOURCE" value={sourceSize} tone="green" />
              <StatBox label="PROJECTED" value={projectedSize} tone="gold" />
              <StatBox label="FILE" value={sourceMeta ? formatBytes(sourceMeta.size) : "—"} />
              <StatBox label="OUTPUT" value={outputMeta ? formatBytes(outputMeta.bytes) : "—"} tone={outputMeta ? "rose" : "ink"} />
            </div>

            <div className="rounded-[24px] border border-black/[.075] bg-white/24 p-5">
              <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">PRESETS</div>
              <div className="mt-4 grid gap-2">
                {PRESETS.map((preset) => (
                  <button key={preset.id} type="button" onClick={() => applyPreset(preset)} className="rounded-[18px] border border-black/[.08] bg-white/22 p-4 text-left transition hover:bg-white/50">
                    <div className="text-[12px] font-semibold tracking-[-.03em] text-black/70">{preset.name}</div>
                    <p className="mt-2 text-[8px] leading-4 text-black/31">{preset.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <main className="min-w-0 overflow-hidden rounded-[34px] border border-black/[.08] bg-[#151714]">
            <div className="flex flex-col gap-3 border-b border-white/[.065] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[8px] font-semibold tracking-[.14em] text-white/24">DETAIL PREVIEW</div>
                <p className="mt-2 text-[8px] text-white/28">{status}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {(["split", "before", "after", "side"] as PreviewMode[]).map((mode) => (
                  <button key={mode} type="button" onClick={() => setPreviewMode(mode)} className={`rounded-full px-3 py-2 text-[8px] font-semibold transition ${previewMode === mode ? "bg-white text-[#151714]" : "border border-white/[.08] text-white/28 hover:bg-white/[.06]"}`}>
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 sm:p-7">
              <div ref={previewRef} className="enhance-checker grid min-h-[620px] place-items-center overflow-hidden rounded-[30px] border border-white/[.06] p-4">
                {sourceUrl ? (
                  <div className="w-full">
                    {previewMode === "side" ? (
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="overflow-hidden rounded-[24px] border border-black/[.08] bg-white/35 p-3">
                          <div className="mb-2 text-[8px] font-semibold tracking-[.13em] text-black/28">BEFORE</div>
                          <img src={sourceUrl} alt="原图预览" className="mx-auto max-h-[520px] max-w-full object-contain" />
                        </div>
                        <div className="overflow-hidden rounded-[24px] border border-black/[.08] bg-white/35 p-3">
                          <div className="mb-2 text-[8px] font-semibold tracking-[.13em] text-black/28">AFTER</div>
                          {outputUrl ? <img src={outputUrl} alt="增强结果预览" className="mx-auto max-h-[520px] max-w-full object-contain" /> : <div className="grid h-[360px] place-items-center text-[10px] text-black/30">执行增强后显示结果</div>}
                        </div>
                      </div>
                    ) : previewMode === "before" ? (
                      <img src={sourceUrl} alt="原图预览" className="mx-auto max-h-[580px] max-w-full object-contain" />
                    ) : previewMode === "after" ? (
                      outputUrl ? <img src={outputUrl} alt="增强结果预览" className="mx-auto max-h-[580px] max-w-full object-contain" /> : <div className="grid h-[460px] place-items-center text-[10px] text-black/30">执行增强后显示结果</div>
                    ) : (
                      <div className="mx-auto max-w-[920px]">
                        <div className="relative overflow-hidden rounded-[26px] border border-black/[.08] bg-white/40">
                          <img src={sourceUrl} alt="原图预览" className="block max-h-[580px] w-full object-contain opacity-90" />
                          {outputUrl && (
                            <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}>
                              <img src={outputUrl} alt="增强结果预览" className="block h-full w-full object-contain" />
                            </div>
                          )}
                          <div className="pointer-events-none absolute inset-y-0 bg-white/80" style={{ left: `${split}%`, width: 1 }} />
                          <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-[#22231f] px-3 py-1.5 text-[7px] font-semibold text-white">AFTER</div>
                          <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-white px-3 py-1.5 text-[7px] font-semibold text-black/50">BEFORE</div>
                        </div>
                        <input type="range" min={0} max={100} value={split} onChange={(event) => setSplit(Number(event.target.value))} className="mt-4 w-full accent-[#52685d]" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#22231f] text-2xl text-white">✦</div>
                    <p className="mt-5 text-[14px] font-semibold tracking-[-.03em] text-black/64">等待图片</p>
                    <p className="mt-2 text-[9px] text-black/31">上传后在这里查看原图与增强结果。</p>
                  </div>
                )}
              </div>

              <div className="mt-5 grid gap-px overflow-hidden rounded-[22px] border border-white/[.06] bg-white/[.06] md:grid-cols-4">
                {[
                  ["SCALE", `${settings.scale}x`],
                  ["SHARPEN", settings.sharpen.toFixed(2)],
                  ["DENOISE", settings.denoise.toFixed(2)],
                  ["FORMAT", settings.exportFormat.toUpperCase()],
                ].map(([label, value]) => (
                  <div key={label} className="bg-[#151714] p-4">
                    <div className="text-[7px] font-semibold tracking-[.12em] text-white/18">{label}</div>
                    <div className="enhance-num mt-2 font-mono text-[10px] font-semibold text-[#cbd8cd]">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </main>

          <aside className="min-w-0 space-y-4">
            <div className="rounded-[30px] border border-black/[.075] bg-white/24 p-5">
              <div className="text-[8px] font-semibold tracking-[.14em] text-black/24">ENHANCE</div>

              <div className="mt-5 space-y-5">
                <div>
                  <div className="mb-2 text-[8px] font-semibold tracking-[.12em] text-black/24">放大倍数</div>
                  <div className="flex flex-wrap gap-2">
                    {[1, 1.5, 2, 3, 4].map((item) => (
                      <Toggle key={item} active={settings.scale === item} label={`${item}x`} onClick={() => patchSettings({ scale: item })} />
                    ))}
                  </div>
                </div>

                <Slider label="锐化强度" value={settings.sharpen} min={0} max={4} step={0.05} unit="" onChange={(sharpen) => patchSettings({ sharpen })} />
                <Slider label="轻量降噪" value={settings.denoise} min={0} max={0.8} step={0.02} unit="" onChange={(denoise) => patchSettings({ denoise })} />
                <Slider label="对比度" value={settings.contrast} min={0.5} max={2} step={0.02} unit="" onChange={(contrast) => patchSettings({ contrast })} />
                <Slider label="亮度" value={settings.brightness} min={0.5} max={1.8} step={0.02} unit="" onChange={(brightness) => patchSettings({ brightness })} />
                <Slider label="饱和度" value={settings.saturation} min={0} max={2} step={0.02} unit="" onChange={(saturation) => patchSettings({ saturation })} />
                <Slider label="最大输出边" value={settings.maxSide} min={512} max={6000} step={128} unit="px" onChange={(maxSide) => patchSettings({ maxSide })} />
              </div>
            </div>

            <div className="rounded-[24px] border border-black/[.075] bg-white/24 p-5">
              <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">EXPORT</div>

              <div className="mt-5 space-y-5">
                <div className="flex flex-wrap gap-2">
                  {(["png", "jpeg", "webp"] as ExportFormat[]).map((format) => (
                    <Toggle key={format} active={settings.exportFormat === format} label={format.toUpperCase()} onClick={() => patchSettings({ exportFormat: format })} />
                  ))}
                </div>

                {settings.exportFormat !== "png" && <Slider label="输出质量" value={settings.quality} min={0.1} max={1} step={0.02} unit="" onChange={(quality) => patchSettings({ quality })} />}

                <div>
                  <div className="mb-2 text-[8px] font-semibold tracking-[.12em] text-black/24">背景铺底</div>
                  <div className="flex items-center gap-3">
                    <input type="color" value={settings.background} onChange={(event) => patchSettings({ background: event.target.value })} className="h-11 w-12 cursor-pointer rounded-[14px] border border-black/[.08] bg-transparent p-1" />
                    <Toggle active={settings.flattenTransparent || settings.exportFormat === "jpeg"} label={settings.exportFormat === "jpeg" ? "JPEG 自动铺底" : "铺底透明区域"} onClick={() => patchSettings({ flattenTransparent: !settings.flattenTransparent })} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={runEnhance} disabled={!sourceUrl || processing} className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white transition hover:scale-[1.01] active:scale-[.98] disabled:opacity-35">{processing ? "处理中…" : "执行增强"}</button>
                  <button type="button" onClick={download} disabled={!sourceUrl || processing} className="rounded-full border border-black/[.08] px-4 py-3 text-[9px] font-semibold text-black/36 transition hover:bg-white/50 disabled:opacity-35">{outputUrl ? "下载结果" : "增强并下载"}</button>
                  <button type="button" onClick={reset} className="rounded-full px-4 py-3 text-[9px] font-semibold text-[#965744] transition hover:bg-[#965744]/8">重置</button>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-[24px] border border-black/[.075] bg-[#151714]">
              <div className="border-b border-white/[.06] px-5 py-4">
                <div className="text-[8px] font-semibold tracking-[.13em] text-white/22">OUTPUT</div>
              </div>

              <div className="px-5">
                <OutputBlock label="SETTINGS" value={settingsText} copied={copied === "settings"} onCopy={() => copy(settingsText, "settings")} />
                <OutputBlock label="CSS NOTE" value={cssSnippet} copied={copied === "css"} onCopy={() => copy(cssSnippet, "css")} />
                <OutputBlock label="REPORT" value={report} copied={copied === "report"} onCopy={() => copy(report, "report")} />
              </div>

              <div className="border-t border-white/[.06] p-5">
                <button type="button" onClick={() => downloadText(report, "bitleap-image-enhance-report.txt")} className="rounded-full border border-white/[.08] px-4 py-3 text-[9px] font-semibold text-white/33 transition hover:bg-white hover:text-[#151714]">导出报告</button>
              </div>
            </div>
          </aside>
        </section>

        <section className="enhance-intro mt-12 grid gap-8 border-t border-black/10 pt-7 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">LOCAL CANVAS</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">所有处理都在当前浏览器 Canvas 中完成，不上传图片；大图会受浏览器内存和 Canvas 尺寸限制影响。</p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">USM SHARPEN</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">增强算法使用高质量缩放、轻量降噪和 unsharp mask，不等同于云端 AI 超分，但更适合纯前端工具。</p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">EXPORT READY</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">支持 PNG、JPEG、WebP 输出；JPEG 会自动使用背景色铺底透明区域。</p>
          </div>
        </section>

        <div className="mt-12 border-t border-black/[.08] pt-5">
          <FooterNote />
        </div>

        <canvas ref={originCanvasRef} className="hidden" />
        <canvas ref={outputCanvasRef} className="hidden" />
      </div>
    </div>
  )
}
