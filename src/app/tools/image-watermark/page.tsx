"use client"

import type { ChangeEvent, DragEvent } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type WatermarkMode = "text" | "logo"
type WatermarkPos = "top-left" | "top-center" | "top-right" | "middle-left" | "center" | "middle-right" | "bottom-left" | "bottom-center" | "bottom-right"
type PreviewFit = "contain" | "actual"
type ExportFormat = "png" | "jpeg" | "webp"
type CopyKey = "report" | "css" | "canvas" | null
type BlendMode = "source-over" | "multiply" | "screen" | "overlay" | "soft-light"

type FontFamily = "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif" | "Georgia, serif" | "ui-monospace, SFMono-Regular, Menlo, monospace" | "Arial, sans-serif" | '"Microsoft YaHei", "PingFang SC", sans-serif' | 'SimHei, "Microsoft YaHei", sans-serif'

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
  mode: WatermarkMode
  tileMode: boolean
  position: WatermarkPos
  text: string
  fontSize: number
  opacity: number
  rotate: number
  color: string
  strokeEnabled: boolean
  backgroundEnabled: boolean
  blendMode: BlendMode
  tileGapX: number
  tileGapY: number
}

const POSITION_OPTIONS: Array<{ value: WatermarkPos; label: string }> = [
  { value: "top-left", label: "左上" },
  { value: "top-center", label: "上中" },
  { value: "top-right", label: "右上" },
  { value: "middle-left", label: "左中" },
  { value: "center", label: "居中" },
  { value: "middle-right", label: "右中" },
  { value: "bottom-left", label: "左下" },
  { value: "bottom-center", label: "下中" },
  { value: "bottom-right", label: "右下" },
]

const FONT_OPTIONS: Array<{ value: FontFamily; label: string }> = [
  { value: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif", label: "System Sans" },
  { value: "Georgia, serif", label: "Serif" },
  { value: "ui-monospace, SFMono-Regular, Menlo, monospace", label: "Monospace" },
  { value: "Arial, sans-serif", label: "Arial" },
  { value: '"Microsoft YaHei", "PingFang SC", sans-serif', label: "微软雅黑 / 苹方" },
  { value: 'SimHei, "Microsoft YaHei", sans-serif', label: "黑体" },
]

const PRESETS: Preset[] = [
  {
    name: "角落签名",
    desc: "低透明度右下角署名，适合作品图。",
    mode: "text",
    tileMode: false,
    position: "bottom-right",
    text: "© BitLeap",
    fontSize: 28,
    opacity: 0.42,
    rotate: 0,
    color: "#ffffff",
    strokeEnabled: true,
    backgroundEnabled: true,
    blendMode: "source-over",
    tileGapX: 260,
    tileGapY: 180,
  },
  {
    name: "全图防盗",
    desc: "斜向平铺水印，适合样张和版权保护。",
    mode: "text",
    tileMode: true,
    position: "center",
    text: "CONFIDENTIAL",
    fontSize: 40,
    opacity: 0.18,
    rotate: -24,
    color: "#ffffff",
    strokeEnabled: true,
    backgroundEnabled: false,
    blendMode: "overlay",
    tileGapX: 300,
    tileGapY: 180,
  },
  {
    name: "暗色压印",
    desc: "黑色半透明水印，适合亮图。",
    mode: "text",
    tileMode: false,
    position: "bottom-center",
    text: "Sample Preview",
    fontSize: 34,
    opacity: 0.36,
    rotate: 0,
    color: "#000000",
    strokeEnabled: false,
    backgroundEnabled: false,
    blendMode: "multiply",
    tileGapX: 260,
    tileGapY: 180,
  },
  {
    name: "海报标题",
    desc: "大字号中心水印，适合封面样张。",
    mode: "text",
    tileMode: false,
    position: "center",
    text: "PREVIEW",
    fontSize: 72,
    opacity: 0.28,
    rotate: -12,
    color: "#ffffff",
    strokeEnabled: true,
    backgroundEnabled: false,
    blendMode: "source-over",
    tileGapX: 320,
    tileGapY: 220,
  },
]

const SAMPLE_HINTS = [
  "© BitLeap",
  "CONFIDENTIAL",
  "Sample Preview",
  "仅供预览",
  "DO NOT COPY",
  "内部资料",
]

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

function fileBaseName(name: string) {
  const clean = name.replace(/\.[^.]+$/, "")
  return clean || "image"
}

function mimeFromFormat(format: ExportFormat) {
  if (format === "jpeg") return "image/jpeg"
  if (format === "webp") return "image/webp"
  return "image/png"
}

function extensionFromFormat(format: ExportFormat) {
  if (format === "jpeg") return "jpg"
  if (format === "webp") return "webp"
  return "png"
}

function rgba(hex: string, alpha: number) {
  const normalized = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.slice(1) : "000000"
  const value = Number.parseInt(normalized, 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255

  return `rgba(${r}, ${g}, ${b}, ${Number(alpha.toFixed(3))})`
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("图片加载失败"))
    image.src = url
  })
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

function getBoxPosition(position: WatermarkPos, canvasWidth: number, canvasHeight: number, boxWidth: number, boxHeight: number, margin: number) {
  const left = margin
  const centerX = (canvasWidth - boxWidth) / 2
  const right = canvasWidth - boxWidth - margin
  const top = margin
  const centerY = (canvasHeight - boxHeight) / 2
  const bottom = canvasHeight - boxHeight - margin

  switch (position) {
    case "top-left":
      return { x: left, y: top }
    case "top-center":
      return { x: centerX, y: top }
    case "top-right":
      return { x: right, y: top }
    case "middle-left":
      return { x: left, y: centerY }
    case "center":
      return { x: centerX, y: centerY }
    case "middle-right":
      return { x: right, y: centerY }
    case "bottom-left":
      return { x: left, y: bottom }
    case "bottom-center":
      return { x: centerX, y: bottom }
    case "bottom-right":
      return { x: right, y: bottom }
  }
}

function drawPlaceholder(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")
  if (!ctx) return

  canvas.width = 1200
  canvas.height = 760

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
  gradient.addColorStop(0, "#f4f1e9")
  gradient.addColorStop(0.55, "#e6e0d3")
  gradient.addColorStop(1, "#d9d0bf")

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = "rgba(34, 35, 31, .07)"
  for (let y = 0; y < canvas.height; y += 38) {
    ctx.fillRect(0, y, canvas.width, 1)
  }
  for (let x = 0; x < canvas.width; x += 38) {
    ctx.fillRect(x, 0, 1, canvas.height)
  }

  ctx.fillStyle = "rgba(34, 35, 31, .62)"
  ctx.font = "700 42px ui-sans-serif, system-ui, sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText("Upload an image to preview watermark", canvas.width / 2, canvas.height / 2)
}

function drawTextWatermark({
  ctx,
  canvasWidth,
  canvasHeight,
  text,
  fontSize,
  fontFamily,
  fontWeight,
  color,
  opacity,
  rotate,
  tileMode,
  tileGapX,
  tileGapY,
  margin,
  position,
  strokeEnabled,
  strokeColor,
  strokeWidth,
  backgroundEnabled,
  backgroundColor,
  backgroundOpacity,
  backgroundPadding,
  blendMode,
  scale,
}: {
  ctx: CanvasRenderingContext2D
  canvasWidth: number
  canvasHeight: number
  text: string
  fontSize: number
  fontFamily: FontFamily
  fontWeight: number
  color: string
  opacity: number
  rotate: number
  tileMode: boolean
  tileGapX: number
  tileGapY: number
  margin: number
  position: WatermarkPos
  strokeEnabled: boolean
  strokeColor: string
  strokeWidth: number
  backgroundEnabled: boolean
  backgroundColor: string
  backgroundOpacity: number
  backgroundPadding: number
  blendMode: BlendMode
  scale: number
}) {
  const lines = (text || "Watermark").split(/\r?\n/)
  const realFontSize = fontSize * scale
  const lineHeight = realFontSize * 1.22
  const pad = backgroundPadding * scale
  const realStrokeWidth = strokeWidth * scale

  ctx.save()
  ctx.font = `${fontWeight} ${realFontSize}px ${fontFamily}`
  ctx.textBaseline = "top"
  ctx.textAlign = "center"

  const widths = lines.map((line) => ctx.measureText(line || " ").width)
  const textWidth = Math.max(1, ...widths)
  const textHeight = Math.max(lineHeight, lines.length * lineHeight)
  const boxWidth = textWidth + pad * 2
  const boxHeight = textHeight + pad * 2

  const drawAtCenter = (centerX: number, centerY: number) => {
    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.rotate((rotate * Math.PI) / 180)
    ctx.globalAlpha = opacity
    ctx.globalCompositeOperation = blendMode

    if (backgroundEnabled) {
      ctx.fillStyle = rgba(backgroundColor, backgroundOpacity)
      roundedRect(ctx, -boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, Math.max(8, realFontSize * 0.24))
      ctx.fill()
    }

    lines.forEach((line, index) => {
      const y = -textHeight / 2 + index * lineHeight
      if (strokeEnabled && realStrokeWidth > 0) {
        ctx.lineWidth = realStrokeWidth
        ctx.lineJoin = "round"
        ctx.strokeStyle = strokeColor
        ctx.strokeText(line || " ", 0, y)
      }

      ctx.fillStyle = color
      ctx.fillText(line || " ", 0, y)
    })

    ctx.restore()
  }

  if (tileMode) {
    const gapX = Math.max(60, tileGapX * scale)
    const gapY = Math.max(60, tileGapY * scale)
    const startX = -canvasWidth
    const endX = canvasWidth * 2
    const startY = -canvasHeight
    const endY = canvasHeight * 2

    for (let y = startY; y <= endY; y += gapY) {
      for (let x = startX; x <= endX; x += gapX) {
        drawAtCenter(x, y)
      }
    }
  } else {
    const point = getBoxPosition(position, canvasWidth, canvasHeight, boxWidth, boxHeight, margin * scale)
    drawAtCenter(point.x + boxWidth / 2, point.y + boxHeight / 2)
  }

  ctx.restore()
}

function drawLogoWatermark({
  ctx,
  canvasWidth,
  canvasHeight,
  logo,
  logoSize,
  opacity,
  rotate,
  tileMode,
  tileGapX,
  tileGapY,
  margin,
  position,
  blendMode,
  scale,
}: {
  ctx: CanvasRenderingContext2D
  canvasWidth: number
  canvasHeight: number
  logo: HTMLImageElement
  logoSize: number
  opacity: number
  rotate: number
  tileMode: boolean
  tileGapX: number
  tileGapY: number
  margin: number
  position: WatermarkPos
  blendMode: BlendMode
  scale: number
}) {
  const width = canvasWidth * (logoSize / 100)
  const height = width * ((logo.naturalHeight || logo.height) / Math.max(1, logo.naturalWidth || logo.width))

  const drawAtCenter = (centerX: number, centerY: number) => {
    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.rotate((rotate * Math.PI) / 180)
    ctx.globalAlpha = opacity
    ctx.globalCompositeOperation = blendMode
    ctx.drawImage(logo, -width / 2, -height / 2, width, height)
    ctx.restore()
  }

  if (tileMode) {
    const gapX = Math.max(width * 1.5, tileGapX * scale)
    const gapY = Math.max(height * 1.5, tileGapY * scale)

    for (let y = -canvasHeight; y <= canvasHeight * 2; y += gapY) {
      for (let x = -canvasWidth; x <= canvasWidth * 2; x += gapX) {
        drawAtCenter(x, y)
      }
    }
  } else {
    const point = getBoxPosition(position, canvasWidth, canvasHeight, width, height, margin * scale)
    drawAtCenter(point.x + width / 2, point.y + height / 2)
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
      <div className="mb-2 flex justify-between text-[8px] text-black/28">
        <span>{label}</span>
        <span className="wm-num font-mono text-[#52685d]">{value.toFixed(step < 1 ? 2 : 0)}{unit}</span>
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
      <div className={`wm-num mt-3 break-all font-mono text-[13px] font-semibold ${toneClass}`}>{value}</div>
    </div>
  )
}

export default function ImageWatermarkPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const imageUrlRef = useRef("")
  const logoUrlRef = useRef("")
  const imageRef = useRef<HTMLImageElement | null>(null)
  const logoRef = useRef<HTMLImageElement | null>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null)
  const [logoInfo, setLogoInfo] = useState<ImageInfo | null>(null)
  const [watermarkMode, setWatermarkMode] = useState<WatermarkMode>("text")
  const [text, setText] = useState("水印文字")
  const [fontSize, setFontSize] = useState(34)
  const [fontWeight, setFontWeight] = useState(700)
  const [opacity, setOpacity] = useState(0.42)
  const [position, setPosition] = useState<WatermarkPos>("bottom-right")
  const [fontFamily, setFontFamily] = useState<FontFamily>("ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif")
  const [color, setColor] = useState("#ffffff")
  const [rotate, setRotate] = useState(-12)
  const [tileMode, setTileMode] = useState(false)
  const [tileGapX, setTileGapX] = useState(280)
  const [tileGapY, setTileGapY] = useState(180)
  const [margin, setMargin] = useState(36)
  const [strokeEnabled, setStrokeEnabled] = useState(true)
  const [strokeColor, setStrokeColor] = useState("#000000")
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [backgroundEnabled, setBackgroundEnabled] = useState(false)
  const [backgroundColor, setBackgroundColor] = useState("#000000")
  const [backgroundOpacity, setBackgroundOpacity] = useState(0.28)
  const [backgroundPadding, setBackgroundPadding] = useState(14)
  const [blendMode, setBlendMode] = useState<BlendMode>("source-over")
  const [logoSize, setLogoSize] = useState(18)
  const [exportScale, setExportScale] = useState(1)
  const [exportFormat, setExportFormat] = useState<ExportFormat>("png")
  const [quality, setQuality] = useState(0.92)
  const [previewFit, setPreviewFit] = useState<PreviewFit>("contain")
  const [isDragging, setIsDragging] = useState(false)
  const [renderError, setRenderError] = useState("")
  const [copied, setCopied] = useState<CopyKey>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [renderTick, setRenderTick] = useState(0)

  const cssSnippet = useMemo(
    () =>
      [
        "/* Canvas watermark settings */",
        `watermark-mode: ${watermarkMode};`,
        `position: ${position};`,
        `opacity: ${opacity.toFixed(2)};`,
        `rotation: ${rotate}deg;`,
        `tile-mode: ${tileMode ? "on" : "off"};`,
        watermarkMode === "text"
          ? `font: ${fontWeight} ${fontSize}px ${fontFamily};`
          : `logo-size: ${logoSize}% of image width;`,
      ].join("\n"),
    [fontFamily, fontSize, fontWeight, logoSize, opacity, position, rotate, tileMode, watermarkMode],
  )

  const report = useMemo(
    () =>
      [
        "BitLeap Image Watermark Studio",
        "",
        `图片：${imageInfo ? `${imageInfo.name} · ${imageInfo.width}×${imageInfo.height} · ${formatBytes(imageInfo.size)}` : "未上传"}`,
        `Logo：${logoInfo ? `${logoInfo.name} · ${logoInfo.width}×${logoInfo.height}` : "未上传"}`,
        `模式：${watermarkMode === "text" ? "文字水印" : "图片水印"}`,
        `水印文字：${text}`,
        `位置：${position}`,
        `平铺：${tileMode ? "是" : "否"}`,
        `旋转：${rotate}°`,
        `透明度：${opacity.toFixed(2)}`,
        `混合模式：${blendMode}`,
        `导出：${exportFormat.toUpperCase()} · ${exportScale}x · quality ${quality.toFixed(2)}`,
        `画布：${canvasSize.width ? `${canvasSize.width}×${canvasSize.height}` : "未渲染"}`,
        "",
        cssSnippet,
      ].join("\n"),
    [blendMode, canvasSize.height, canvasSize.width, cssSnippet, exportFormat, exportScale, imageInfo, logoInfo, opacity, position, quality, rotate, text, tileMode, watermarkMode],
  )

  useEffect(() => {
    return () => {
      if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current)
      if (logoUrlRef.current) URL.revokeObjectURL(logoUrlRef.current)
    }
  }, [])

  useEffect(() => {
    if (!pageRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      gsap.from(".wm-intro", {
        y: 22,
        opacity: 0,
        duration: 0.78,
        stagger: 0.055,
        ease: "power3.out",
      })

      gsap.to(".wm-orbit-a", {
        rotation: 360,
        duration: 70,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })

      gsap.to(".wm-orbit-b", {
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
    if (!previewRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    gsap.fromTo(
      previewRef.current,
      { opacity: 0.7, scale: 0.992 },
      {
        opacity: 1,
        scale: 1,
        duration: 0.24,
        ease: "power2.out",
        overwrite: true,
      },
    )
  }, [watermarkMode, text, fontSize, opacity, position, color, rotate, tileMode, tileGapX, tileGapY, margin, strokeEnabled, strokeColor, strokeWidth, backgroundEnabled, backgroundColor, backgroundOpacity, backgroundPadding, blendMode, logoSize, exportScale, renderTick])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    setRenderError("")

    const source = imageRef.current
    if (!source) {
      drawPlaceholder(canvas)
      setCanvasSize({ width: canvas.width, height: canvas.height })
      return
    }

    try {
      const scale = exportScale
      const width = Math.max(1, Math.round((source.naturalWidth || source.width) * scale))
      const height = Math.max(1, Math.round((source.naturalHeight || source.height) * scale))

      canvas.width = width
      canvas.height = height

      ctx.clearRect(0, 0, width, height)
      ctx.drawImage(source, 0, 0, width, height)

      if (watermarkMode === "logo") {
        const logo = logoRef.current
        if (!logo) {
          setCanvasSize({ width, height })
          return
        }

        drawLogoWatermark({
          ctx,
          canvasWidth: width,
          canvasHeight: height,
          logo,
          logoSize,
          opacity,
          rotate,
          tileMode,
          tileGapX,
          tileGapY,
          margin,
          position,
          blendMode,
          scale,
        })
      } else {
        drawTextWatermark({
          ctx,
          canvasWidth: width,
          canvasHeight: height,
          text,
          fontSize,
          fontFamily,
          fontWeight,
          color,
          opacity,
          rotate,
          tileMode,
          tileGapX,
          tileGapY,
          margin,
          position,
          strokeEnabled,
          strokeColor,
          strokeWidth,
          backgroundEnabled,
          backgroundColor,
          backgroundOpacity,
          backgroundPadding,
          blendMode,
          scale,
        })
      }

      setCanvasSize({ width, height })
    } catch (error) {
      setRenderError(error instanceof Error ? error.message : "画布渲染失败")
    }
  }, [backgroundColor, backgroundEnabled, backgroundOpacity, backgroundPadding, blendMode, color, exportScale, fontFamily, fontSize, fontWeight, logoSize, margin, opacity, position, rotate, strokeColor, strokeEnabled, strokeWidth, text, tileGapX, tileGapY, tileMode, watermarkMode, renderTick])

  const loadMainImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setRenderError("请选择图片文件")
      return
    }

    const url = URL.createObjectURL(file)

    try {
      const image = await loadImage(url)

      if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current)
      imageUrlRef.current = url
      imageRef.current = image

      setImageInfo({
        name: file.name,
        size: file.size,
        type: file.type,
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
      })
      setRenderError("")
      setRenderTick((value) => value + 1)

      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error) {
      URL.revokeObjectURL(url)
      setRenderError(error instanceof Error ? error.message : "图片读取失败")
    }
  }

  const loadLogoImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setRenderError("请选择图片文件")
      return
    }

    const url = URL.createObjectURL(file)

    try {
      const image = await loadImage(url)

      if (logoUrlRef.current) URL.revokeObjectURL(logoUrlRef.current)
      logoUrlRef.current = url
      logoRef.current = image

      setLogoInfo({
        name: file.name,
        size: file.size,
        type: file.type,
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
      })
      setWatermarkMode("logo")
      setRenderError("")
      setRenderTick((value) => value + 1)

      if (logoInputRef.current) {
        logoInputRef.current.value = ""
      }
    } catch (error) {
      URL.revokeObjectURL(url)
      setRenderError(error instanceof Error ? error.message : "Logo 读取失败")
    }
  }

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) loadMainImage(file)
  }

  const handleLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) loadLogoImage(file)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)

    const file = event.dataTransfer.files?.[0]
    if (file) loadMainImage(file)
  }

  const download = () => {
    const canvas = canvasRef.current
    if (!canvas || !imageInfo) return

    canvas.toBlob(
      (blob) => {
        if (!blob) return

        const url = URL.createObjectURL(blob)
        const anchor = document.createElement("a")
        anchor.href = url
        anchor.download = `${fileBaseName(imageInfo.name)}-watermark.${extensionFromFormat(exportFormat)}`
        anchor.click()
        window.setTimeout(() => URL.revokeObjectURL(url), 500)
      },
      mimeFromFormat(exportFormat),
      exportFormat === "png" ? undefined : quality,
    )
  }

  const copyCanvas = async () => {
    const canvas = canvasRef.current
    if (!canvas || !imageInfo || typeof ClipboardItem === "undefined") return

    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"))
      if (!blob) return
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
      setCopied("canvas")
      window.setTimeout(() => setCopied(null), 1200)
    } catch {
      setRenderError("浏览器未允许复制图片到剪贴板")
    }
  }

  const copy = async (value: string, key: CopyKey) => {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {}
  }

  const resetAll = () => {
    if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current)
    if (logoUrlRef.current) URL.revokeObjectURL(logoUrlRef.current)

    imageUrlRef.current = ""
    logoUrlRef.current = ""
    imageRef.current = null
    logoRef.current = null

    setImageInfo(null)
    setLogoInfo(null)
    setText("水印文字")
    setFontSize(34)
    setFontWeight(700)
    setOpacity(0.42)
    setPosition("bottom-right")
    setFontFamily("ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif")
    setColor("#ffffff")
    setRotate(-12)
    setTileMode(false)
    setTileGapX(280)
    setTileGapY(180)
    setMargin(36)
    setStrokeEnabled(true)
    setStrokeColor("#000000")
    setStrokeWidth(2)
    setBackgroundEnabled(false)
    setBackgroundColor("#000000")
    setBackgroundOpacity(0.28)
    setBackgroundPadding(14)
    setBlendMode("source-over")
    setLogoSize(18)
    setExportScale(1)
    setExportFormat("png")
    setQuality(0.92)
    setPreviewFit("contain")
    setCopied(null)
    setRenderError("")
    setRenderTick((value) => value + 1)

    if (fileInputRef.current) fileInputRef.current.value = ""
    if (logoInputRef.current) logoInputRef.current.value = ""
  }

  const applyPreset = (preset: Preset) => {
    setWatermarkMode(preset.mode)
    setTileMode(preset.tileMode)
    setPosition(preset.position)
    setText(preset.text)
    setFontSize(preset.fontSize)
    setOpacity(preset.opacity)
    setRotate(preset.rotate)
    setColor(preset.color)
    setStrokeEnabled(preset.strokeEnabled)
    setBackgroundEnabled(preset.backgroundEnabled)
    setBlendMode(preset.blendMode)
    setTileGapX(preset.tileGapX)
    setTileGapY(preset.tileGapY)
  }

  return (
    <div ref={pageRef} className="min-h-screen overflow-hidden bg-[#efede6] text-[#22231f] selection:bg-[#22231f] selection:text-white">
      <style>{`
        .wm-scroll::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }

        .wm-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .wm-scroll::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(34,35,31,.13);
        }

        .wm-dark-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,.14);
        }

        .wm-grid {
          background-image:
            linear-gradient(rgba(34,35,31,.032) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,35,31,.032) 1px, transparent 1px);
          background-size: 30px 30px;
        }

        .wm-num {
          font-variant-numeric: tabular-nums lining-nums;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_9%,rgba(178,151,91,.10),transparent_27%),radial-gradient(circle_at_8%_88%,rgba(73,107,91,.08),transparent_31%)]" />
        <div className="wm-orbit-a absolute right-[-20vw] top-[-24vw] h-[58vw] w-[58vw] rounded-full border border-black/[.04]">
          <span className="absolute left-[15%] top-[43%] h-2 w-2 rounded-full bg-[#b28d48]/38" />
        </div>
        <div className="wm-orbit-b absolute bottom-[-26vw] left-[-19vw] h-[53vw] w-[53vw] rounded-full border border-black/[.032]">
          <span className="absolute right-[14%] top-[31%] h-1.5 w-1.5 rounded-full bg-[#52685d]/35" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1580px] px-5 pb-10 pt-6 sm:px-8">
        <div className="wm-intro">
          <Breadcrumb />
        </div>

        <header className="wm-intro mt-8 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/27">IMAGE WATERMARK STUDIO</div>
            <h1 className="mt-4 max-w-[930px] text-[clamp(48px,6.35vw,90px)] font-semibold leading-[1.03] tracking-[-.055em]">
              给图片，
              <br />
              留下你的标记。
            </h1>
          </div>

          <div>
            <p className="max-w-[560px] text-[11px] leading-6 text-black/40">
              浏览器本地给图片添加文字或 Logo 水印，支持单点定位、全图平铺、描边、背景底片、混合模式、导出格式和高清倍率。
            </p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[8px] text-black/25">
              <span>LOCAL CANVAS</span>
              <span>TEXT / LOGO</span>
              <span>TILE MODE</span>
              <span>PNG / JPG / WEBP</span>
            </div>
          </div>
        </header>

        <section className="wm-intro mt-7 grid gap-7 xl:grid-cols-[.66fr_1.34fr]">
          <aside className="min-w-0">
            <div className="rounded-[28px] border border-black/[.075] bg-white/24 p-5">
              <div className="text-[8px] font-semibold tracking-[.14em] text-black/24">SOURCE IMAGE</div>
              <h2 className="mt-3 text-[clamp(30px,3.5vw,46px)] font-semibold leading-none tracking-[-.045em]">导入图片。</h2>

              <div onDragOver={(event) => event.preventDefault()} onDragEnter={() => setIsDragging(true)} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop} className={`mt-6 rounded-[24px] border border-dashed p-5 text-center transition ${isDragging ? "border-[#52685d] bg-[#52685d]/8" : "border-black/[.14] bg-white/20"}`}>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white transition hover:scale-[1.01] active:scale-[.98]">
                  选择图片
                </button>
                <p className="mt-3 text-[9px] leading-5 text-black/32">也可以把图片拖到这里。图片只在当前浏览器处理。</p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-[20px] bg-black/[.06]">
                <StatBox label="IMAGE" value={imageInfo?.name ?? "未上传"} tone={imageInfo ? "green" : "ink"} />
                <StatBox label="SIZE" value={imageInfo ? formatBytes(imageInfo.size) : "—"} />
                <StatBox label="NATURAL" value={imageInfo ? `${formatNumber(imageInfo.width)}×${formatNumber(imageInfo.height)}` : "—"} />
                <StatBox label="CANVAS" value={canvasSize.width ? `${formatNumber(canvasSize.width)}×${formatNumber(canvasSize.height)}` : "—"} tone="gold" />
              </div>
            </div>

            <div className="mt-4 rounded-[24px] border border-black/[.075] bg-white/24 p-5">
              <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">PRESETS</div>
              <div className="wm-scroll mt-4 grid max-h-[300px] gap-2 overflow-auto pr-1 sm:grid-cols-2">
                {PRESETS.map((preset) => (
                  <button key={preset.name} type="button" onClick={() => applyPreset(preset)} className="rounded-[20px] border border-black/[.08] bg-white/22 p-4 text-left transition hover:bg-white/48">
                    <div className="font-mono text-[8px] font-semibold text-black/24">{preset.mode.toUpperCase()}</div>
                    <div className="mt-2 text-[14px] font-semibold tracking-[-.03em] text-black/70">{preset.name}</div>
                    <p className="mt-2 text-[8px] leading-4 text-black/30">{preset.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-[24px] border border-black/[.075] bg-white/24 p-5">
              <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">TEXT SAMPLES</div>
              <div className="mt-4 flex flex-wrap gap-2">
                {SAMPLE_HINTS.map((item) => (
                  <button key={item} type="button" onClick={() => { setText(item); setWatermarkMode("text") }} className="rounded-full border border-black/[.085] px-3.5 py-2 text-[8px] font-semibold text-black/35 transition hover:bg-white/45 hover:text-black">{item}</button>
                ))}
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="grid gap-px overflow-hidden rounded-[30px] border border-black/[.08] bg-black/[.08] lg:grid-cols-[.9fr_1.1fr]">
              <div className="bg-[#f4f1e9]">
                <div className="flex h-12 items-center justify-between border-b border-black/[.065] px-5">
                  <span className="text-[8px] font-semibold tracking-[.13em] text-black/26">WATERMARK CONTROLS</span>
                  <span className="text-[8px] text-black/22">{watermarkMode.toUpperCase()}</span>
                </div>

                <div className="wm-scroll h-[742px] overflow-auto p-5 sm:p-6">
                  <div className="space-y-6">
                    <div>
                      <div className="mb-2 text-[8px] font-semibold tracking-[.12em] text-black/24">MODE</div>
                      <div className="flex flex-wrap gap-2">
                        <TogglePill active={watermarkMode === "text"} label="文字水印" onClick={() => setWatermarkMode("text")} />
                        <TogglePill active={watermarkMode === "logo"} label="Logo 图片" onClick={() => setWatermarkMode("logo")} />
                        <TogglePill active={tileMode} label="平铺重复" onClick={() => setTileMode((value) => !value)} />
                      </div>
                    </div>

                    {watermarkMode === "text" ? (
                      <>
                        <label>
                          <span className="mb-2 block text-[8px] font-semibold tracking-[.12em] text-black/24">WATERMARK TEXT</span>
                          <textarea value={text} onChange={(event) => setText(event.target.value)} spellCheck={false} className="wm-scroll block h-24 w-full resize-none rounded-[20px] border border-black/[.08] bg-white/35 px-4 py-3 font-mono text-[10px] leading-5 text-black/68 outline-none transition focus:border-black/25" placeholder="输入水印文字，支持多行" />
                        </label>

                        <div className="grid gap-4 sm:grid-cols-3">
                          <Slider label="字号" value={fontSize} min={10} max={180} unit="px" onChange={setFontSize} />
                          <Slider label="字重" value={fontWeight} min={100} max={900} step={100} unit="" onChange={setFontWeight} />
                          <Slider label="透明度" value={opacity} min={0.02} max={1} step={0.01} unit="" onChange={setOpacity} />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <label>
                            <span className="mb-2 block text-[8px] text-black/24">字体</span>
                            <select value={fontFamily} onChange={(event) => setFontFamily(event.target.value as FontFamily)} className="w-full rounded-full border border-black/[.08] bg-white/35 px-4 py-3 text-[10px] outline-none">
                              {FONT_OPTIONS.map((font) => (
                                <option key={font.label} value={font.value}>{font.label}</option>
                              ))}
                            </select>
                          </label>

                          <label>
                            <span className="mb-2 block text-[8px] text-black/24">文字颜色</span>
                            <input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-12 w-full cursor-pointer rounded-[16px] border border-black/[.08] bg-transparent p-1" />
                          </label>
                        </div>

                        <div className="rounded-[22px] border border-black/[.075] bg-white/24 p-5">
                          <div className="mb-3 flex flex-wrap gap-2">
                            <TogglePill active={strokeEnabled} label="描边" onClick={() => setStrokeEnabled((value) => !value)} />
                            <TogglePill active={backgroundEnabled} label="背景底片" onClick={() => setBackgroundEnabled((value) => !value)} />
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <label>
                              <span className="mb-2 block text-[8px] text-black/24">描边颜色</span>
                              <input type="color" value={strokeColor} onChange={(event) => setStrokeColor(event.target.value)} disabled={!strokeEnabled} className="h-12 w-full cursor-pointer rounded-[16px] border border-black/[.08] bg-transparent p-1 disabled:opacity-30" />
                            </label>
                            <Slider label="描边宽度" value={strokeWidth} min={0} max={14} unit="px" onChange={setStrokeWidth} />
                          </div>

                          <div className="mt-4 grid gap-4 sm:grid-cols-3">
                            <label>
                              <span className="mb-2 block text-[8px] text-black/24">底片颜色</span>
                              <input type="color" value={backgroundColor} onChange={(event) => setBackgroundColor(event.target.value)} disabled={!backgroundEnabled} className="h-12 w-full cursor-pointer rounded-[16px] border border-black/[.08] bg-transparent p-1 disabled:opacity-30" />
                            </label>
                            <Slider label="底片透明" value={backgroundOpacity} min={0} max={1} step={0.01} unit="" onChange={setBackgroundOpacity} />
                            <Slider label="底片留白" value={backgroundPadding} min={0} max={60} unit="px" onChange={setBackgroundPadding} />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-[22px] border border-black/[.075] bg-white/24 p-5">
                        <div className="text-[8px] font-semibold tracking-[.12em] text-black/24">LOGO WATERMARK</div>
                        <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                        <button type="button" onClick={() => logoInputRef.current?.click()} className="mt-4 rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white">选择 Logo 图片</button>
                        <p className="mt-3 text-[9px] leading-5 text-black/34">{logoInfo ? `${logoInfo.name} · ${logoInfo.width}×${logoInfo.height}` : "未选择 Logo 时不会绘制图片水印。"}</p>
                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                          <Slider label="Logo 宽度" value={logoSize} min={3} max={60} unit="%" onChange={setLogoSize} />
                          <Slider label="透明度" value={opacity} min={0.02} max={1} step={0.01} unit="" onChange={setOpacity} />
                        </div>
                      </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-3">
                      <Slider label="旋转角度" value={rotate} min={-90} max={90} unit="°" onChange={setRotate} />
                      <Slider label="边距" value={margin} min={0} max={200} unit="px" onChange={setMargin} />
                      <label>
                        <span className="mb-2 block text-[8px] text-black/24">混合模式</span>
                        <select value={blendMode} onChange={(event) => setBlendMode(event.target.value as BlendMode)} className="w-full rounded-full border border-black/[.08] bg-white/35 px-4 py-3 text-[10px] outline-none">
                          <option value="source-over">normal</option>
                          <option value="multiply">multiply</option>
                          <option value="screen">screen</option>
                          <option value="overlay">overlay</option>
                          <option value="soft-light">soft-light</option>
                        </select>
                      </label>
                    </div>

                    {tileMode ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Slider label="横向间距" value={tileGapX} min={80} max={720} unit="px" onChange={setTileGapX} />
                        <Slider label="纵向间距" value={tileGapY} min={60} max={520} unit="px" onChange={setTileGapY} />
                      </div>
                    ) : (
                      <div>
                        <div className="mb-2 text-[8px] font-semibold tracking-[.12em] text-black/24">POSITION</div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {POSITION_OPTIONS.map((item) => (
                            <button key={item.value} type="button" onClick={() => setPosition(item.value)} className={`rounded-[14px] px-3 py-3 text-[8px] font-semibold transition ${position === item.value ? "bg-[#52685d] text-white" : "bg-white/22 text-black/33 hover:bg-white/50"}`}>{item.label}</button>
                          ))}
                        </div>
                      </div>
                    )}

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
                        <Slider label="导出倍率" value={exportScale} min={0.5} max={3} step={0.5} unit="x" onChange={setExportScale} />
                        <Slider label="质量" value={quality} min={0.1} max={1} step={0.01} unit="" onChange={setQuality} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#151714]">
                <div className="flex h-12 items-center justify-between border-b border-white/[.065] px-5">
                  <span className="text-[8px] font-semibold tracking-[.13em] text-white/27">LIVE CANVAS</span>
                  <span className={`text-[8px] ${renderError ? "text-[#d49a88]" : imageInfo ? "text-[#8fb69b]" : "text-white/18"}`}>{renderError ? "ERROR" : imageInfo ? "READY" : "WAITING"}</span>
                </div>

                <div ref={previewRef} className="p-4 sm:p-5">
                  <div className="wm-dark-scroll grid h-[540px] place-items-center overflow-auto rounded-[26px] border border-white/[.065] bg-white/[.035] p-4">
                    <canvas ref={canvasRef} className={previewFit === "contain" ? "max-h-full max-w-full rounded-[14px]" : "rounded-[14px]"} />
                  </div>

                  {renderError && (
                    <div className="mt-4 rounded-[18px] border border-[#d49a88]/14 bg-[#d49a88]/8 p-4 text-[9px] leading-5 text-[#d49a88]/72">{renderError}</div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={download} disabled={!imageInfo} className="rounded-full bg-white px-5 py-3 text-[9px] font-semibold text-[#151714] transition disabled:opacity-30">下载图片</button>
                    <button type="button" onClick={copyCanvas} disabled={!imageInfo || typeof ClipboardItem === "undefined"} className="rounded-full border border-white/[.08] px-4 py-3 text-[9px] font-semibold text-white/33 transition hover:bg-white hover:text-[#151714] disabled:opacity-25">{copied === "canvas" ? "✓ 已复制图片" : "复制 PNG"}</button>
                    <button type="button" onClick={() => setPreviewFit((value) => (value === "contain" ? "actual" : "contain"))} className="rounded-full border border-white/[.08] px-4 py-3 text-[9px] font-semibold text-white/33 transition hover:bg-white hover:text-[#151714]">{previewFit === "contain" ? "实际尺寸" : "适应预览"}</button>
                    <button type="button" onClick={resetAll} className="rounded-full px-4 py-3 text-[9px] font-semibold text-[#d49a88] transition hover:bg-[#d49a88]/8">重置</button>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {[
                      { label: "Watermark settings", value: cssSnippet, key: "css" as CopyKey },
                      { label: "Report", value: report, key: "report" as CopyKey },
                    ].map((item) => (
                      <div key={item.label} className="group rounded-[20px] border border-white/[.065] bg-white/[.035] p-4">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-[8px] font-semibold tracking-[.12em] text-white/24">{item.label}</span>
                          <button type="button" onClick={() => copy(item.value, item.key)} className="text-[8px] font-semibold text-white/25 transition hover:text-white">{copied === item.key ? "✓ COPIED" : "COPY"}</button>
                        </div>
                        <pre className="wm-dark-scroll max-h-[132px] overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-5 text-[#cbd8cd]">{item.value}</pre>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="wm-intro mt-12 grid gap-8 border-t border-black/10 pt-7 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">LOCAL ONLY</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">图片通过浏览器 File API 读取并绘制到 canvas，不上传服务器。下载时直接从当前画布导出。</p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">TEXT / LOGO</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">文字水印支持多行、描边和背景底片；Logo 水印支持单点和全图平铺，适合品牌标记。</p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">EXPORT SCALE</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">导出倍率会改变画布实际像素。2x / 3x 适合高清导出，但大图会消耗更多内存。</p>
          </div>
        </section>

        <div className="mt-12 border-t border-black/[.08] pt-5">
          <FooterNote />
        </div>
      </div>
    </div>
  )
}
