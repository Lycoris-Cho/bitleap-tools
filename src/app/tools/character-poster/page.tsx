"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
} from "react"
import { gsap } from "gsap"

type Petal = {
  id: string
  left: string
  top: string
  size: string
  rotate: string
  delay: string
  duration: string
  driftX: string
  driftY: string
  opacity: string
}

type Dot = {
  id: string
  left: string
  top: string
  size: string
  opacity: string
}

type HeroSpark = {
  id: string
  left: string
  top: string
  size: string
  rotate: string
  delay: string
  duration: string
  opacity: string
}

type TonePreset = {
  id: string
  name: string
  description: string
  bgStart: string
  bgMid: string
  bgEnd: string
  ink: string
  muted: string
  accent: string
  accentSoft: string
  secondary: string
  line: string
  sparkleColor: string
}

type EditableConfig = {
  universe: string
  topCode: string
  topMeta: string
  mark: string
  largeCode: string
  codeLabel: string
  mainTitle: string
  localName: string
  bottomHeading: string
  microLineA: string
  microLineB: string
  tagA: string
  tagB: string
  rightMeta: string
  rightCode: string
  verticalLineA: string
  verticalLineB: string
  quoteTitle: string
  quoteSource: string
  quoteLineA: string
  quoteLineB: string
  smallNumber: string
  bottomCode: string
  sideWords: string[]
  imagePosition: string
  bgStart: string
  bgMid: string
  bgEnd: string
  ink: string
  muted: string
  accent: string
  accentSoft: string
  secondary: string
  line: string
  sparkleColor: string
}

const PETAL_COUNT = 16
const DOT_COUNT = 86
const STORAGE_KEY = "bitleap-anime-editorial-yae-miko-v14-sparkle-motion-config"

const DEFAULT_IMAGE_SRC = "/assets/bitleap-zero-two-reference.jpg"

const TONE_PRESETS: TonePreset[] = [
  {
    id: "sakura",
    name: "神樱粉白",
    description: "接近参考图的浅粉编辑感",
    bgStart: "#fff8f7",
    bgMid: "#f8eeee",
    bgEnd: "#fbf7f7",
    ink: "#2a2028",
    muted: "#7d6473",
    accent: "#dd77a0",
    accentSoft: "#f3c5d5",
    secondary: "#b7a7c8",
    line: "rgba(94, 71, 88, .24)",
    sparkleColor: "#9d7cf3",
  },
  {
    id: "electro",
    name: "雷樱紫",
    description: "更偏原神八重神子的紫粉气质",
    bgStart: "#fbf7ff",
    bgMid: "#f2eafa",
    bgEnd: "#fff6fb",
    ink: "#2b2232",
    muted: "#76637f",
    accent: "#b06bd6",
    accentSoft: "#e9c9f5",
    secondary: "#ef93bd",
    line: "rgba(92, 64, 110, .24)",
    sparkleColor: "#a98bff",
  },
  {
    id: "shrine",
    name: "鸣神朱印",
    description: "神社、朱印、樱色纸张",
    bgStart: "#fff8f0",
    bgMid: "#f8ece7",
    bgEnd: "#fff6f8",
    ink: "#33232a",
    muted: "#85676b",
    accent: "#c8657f",
    accentSoft: "#f1c2cc",
    secondary: "#d7a65a",
    line: "rgba(111, 73, 72, .24)",
    sparkleColor: "#c78cf0",
  },
  {
    id: "moon",
    name: "月白淡金",
    description: "更安静、留白更多的淡金色调",
    bgStart: "#fffdf6",
    bgMid: "#f6f0e6",
    bgEnd: "#fbf7ef",
    ink: "#29251e",
    muted: "#766f61",
    accent: "#c8a45a",
    accentSoft: "#efe1b8",
    secondary: "#e7b6cd",
    line: "rgba(95, 79, 48, .22)",
    sparkleColor: "#b9a4ff",
  },
]

const COLOR_SWATCHES = [
  "#dd77a0",
  "#ef93bd",
  "#b06bd6",
  "#c8657f",
  "#d7a65a",
  "#f0d589",
  "#7e8bd6",
  "#7c99c8",
  "#78a58a",
  "#8fa66e",
  "#2a2028",
  "#76637f",
]

const HERO_STAR_LAYOUT = [
  { left: 8, top: 18, scale: 0.78 },
  { left: 16, top: 74, scale: 0.66 },
  { left: 30, top: 12, scale: 0.58 },
  { left: 39, top: 58, scale: 0.56 },
  { left: 56, top: 20, scale: 0.64 },
  { left: 69, top: 32, scale: 0.9 },
  { left: 79, top: 16, scale: 0.6 },
  { left: 86, top: 52, scale: 0.74 },
  { left: 75, top: 80, scale: 0.86 },
  { left: 92, top: 72, scale: 0.68 },
]

const DEFAULT_CONFIG: EditableConfig = {
  universe: "GENSHIN IMPACT",
  topCode: "八重",
  topMeta: "Grand Narukami Shrine",
  mark: "MIKO",
  largeCode: "八重",
  codeLabel: "NARUKAMI",
  mainTitle: "YAE MIKO",
  localName: "八重神子",
  bottomHeading: "鳴神大社・\n宮司八重神子",
  microLineA: "The shrine remembers.",
  microLineB: "The fox smiles softly.",
  tagA: "MIKO",
  tagB: "INAZUMA",
  rightMeta: "NARUKAMI SHRINE",
  rightCode: "八重",
  verticalLineA: "神子さまの余裕",
  verticalLineB: "桜影に微笑む",
  quoteTitle: "YAE MIKO",
  quoteSource: "GENSHIN IMPACT",
  quoteLineA: "Under the sacred sakura,",
  quoteLineB: "the fox leaves a whisper.",
  smallNumber: "02",
  bottomCode: "FOX 八重",
  sideWords: ["ELECTRO", "SHRINE", "KITSUNE", "SAKURA"],
  imagePosition: "50% 48%",
  ...TONE_PRESETS[0],
  sparkleColor: TONE_PRESETS[0].sparkleColor,
}

function hashText(value: string) {
  let hash = 2166136261
  for (const char of value) {
    hash ^= char.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function ratio(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453123
  return value - Math.floor(value)
}

function fixed(value: number, digits = 3) {
  return Number.isFinite(value) ? value.toFixed(digits) : "0"
}

function pct(value: number, digits = 3) {
  return `${fixed(value, digits)}%`
}

function px(value: number, digits = 3) {
  return `${fixed(value, digits)}px`
}

function sec(value: number, digits = 3) {
  return `${fixed(value, digits)}s`
}

function deg(value: number, digits = 3) {
  return `${fixed(value, digits)}deg`
}

function makePetals(seedText: string): Petal[] {
  const base = hashText(`editorial-petals-${seedText}`)
  const columns = 3
  const rows = Math.ceil(PETAL_COUNT / columns)

  return Array.from({ length: PETAL_COUNT }, (_, index) => {
    const seed = base + index * 67
    const duration = 7.6 + ratio(seed + 6) * 8.4
    const column = index % columns
    const row = Math.floor(index / columns)
    const leftBase = 12 + (column / Math.max(1, columns - 1)) * 76
    const topBase = 10 + (row / Math.max(1, rows - 1)) * 78
    const left = Math.min(96, Math.max(4, leftBase + (-10 + ratio(seed + 1) * 20)))
    const top = Math.min(95, Math.max(5, topBase + (-8 + ratio(seed + 2) * 16)))

    return {
      id: `petal-${index}-${seed}`,
      left: pct(left),
      top: pct(top),
      size: px(8 + ratio(seed + 3) * 10),
      rotate: deg(-12 + ratio(seed + 4) * 24),
      delay: sec(-ratio(seed + 5) * duration),
      duration: sec(duration),
      driftX: px(-20 + ratio(seed + 7) * 40),
      driftY: px(-16 + ratio(seed + 8) * 32),
      opacity: fixed(0.09 + ratio(seed + 9) * 0.2, 4),
    }
  })
}

function makeHeroStars(seedText: string): HeroSpark[] {
  const base = hashText(`editorial-hero-stars-${seedText}`)
  return HERO_STAR_LAYOUT.map((item, index) => {
    const seed = base + index * 79
    const duration = 5.8 + ratio(seed + 1) * 4.8
    return {
      id: `hero-star-${index}-${seed}`,
      left: pct(Math.min(96, Math.max(4, item.left + (-1.8 + ratio(seed + 2) * 3.6)))),
      top: pct(Math.min(95, Math.max(4, item.top + (-1.6 + ratio(seed + 3) * 3.2)))),
      size: px(10 + item.scale * 11 + ratio(seed + 4) * 4),
      rotate: deg(-6 + ratio(seed + 5) * 12),
      delay: sec(-ratio(seed + 6) * duration),
      duration: sec(duration),
      opacity: fixed(0.1 + item.scale * 0.14 + ratio(seed + 7) * 0.08, 4),
    }
  })
}

function makeDots(seedText: string): Dot[] {
  const base = hashText(`editorial-dots-${seedText}`)
  return Array.from({ length: DOT_COUNT }, (_, index) => {
    const seed = base + index * 43
    return {
      id: `dot-${index}-${seed}`,
      left: pct(2 + ratio(seed + 1) * 96),
      top: pct(2 + ratio(seed + 2) * 96),
      size: px(0.8 + ratio(seed + 3) * 2.2),
      opacity: fixed(0.05 + ratio(seed + 4) * 0.16, 4),
    }
  })
}

function splitLines(value: string) {
  return value.split(/\n+/).map((line) => line.trim()).filter(Boolean)
}

function sanitizeConfig(value: unknown): EditableConfig {
  if (!value || typeof value !== "object") return DEFAULT_CONFIG
  const record = value as Partial<EditableConfig>
  return {
    ...DEFAULT_CONFIG,
    ...record,
    sparkleColor: typeof record.sparkleColor === "string" ? record.sparkleColor : DEFAULT_CONFIG.sparkleColor,
    sideWords: Array.isArray(record.sideWords) ? record.sideWords.slice(0, 8) : DEFAULT_CONFIG.sideWords,
  }
}

function Barcode() {
  const bars = [2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 1, 1, 4, 2, 1, 3, 1, 2, 4, 1, 2, 1, 3]
  return (
    <div className="flex h-4 items-end gap-[2px]">
      {bars.map((width, index) => (
        <span
          key={`${width}-${index}`}
          className="block h-full"
          style={{ width, background: "color-mix(in srgb, var(--ink) 76%, transparent)" }}
        />
      ))}
    </div>
  )
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-2xl border border-[color:var(--line)] bg-white/72 px-4 text-sm text-[color:var(--ink)] outline-none transition placeholder:text-[color:var(--muted)]/50 focus:border-[color:var(--accent)]"
      />
    </label>
  )
}

function TextArea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
        {label}
      </span>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-none rounded-2xl border border-[color:var(--line)] bg-white/72 px-4 py-3 text-sm leading-6 text-[color:var(--ink)] outline-none transition placeholder:text-[color:var(--muted)]/50 focus:border-[color:var(--accent)]"
      />
    </label>
  )
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
        {label}
      </span>
      <div className="flex h-11 items-center gap-3 rounded-2xl border border-[color:var(--line)] bg-white/72 px-3">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-7 w-9 cursor-pointer rounded-lg border-0 bg-transparent p-0"
        />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm text-[color:var(--ink)] outline-none"
        />
      </div>
    </label>
  )
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    if (!src.startsWith("blob:") && !src.startsWith("data:")) {
      image.crossOrigin = "anonymous"
    }
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("image load failed"))
    image.src = src
  })
}

function drawCoverImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const imageRatio = image.naturalWidth / image.naturalHeight
  const boxRatio = width / height
  let sourceWidth = image.naturalWidth
  let sourceHeight = image.naturalHeight
  let sourceX = 0
  let sourceY = 0

  if (imageRatio > boxRatio) {
    sourceWidth = image.naturalHeight * boxRatio
    sourceX = (image.naturalWidth - sourceWidth) / 2
  } else {
    sourceHeight = image.naturalWidth / boxRatio
    sourceY = (image.naturalHeight - sourceHeight) / 2
  }

  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height)
}

function drawSpacedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number,
  align: "left" | "center" | "right" = "left",
) {
  const chars = Array.from(text)
  const widths = chars.map((char) => context.measureText(char).width)
  const total = widths.reduce((sum, width) => sum + width, 0) + Math.max(0, chars.length - 1) * spacing
  let cursor = align === "center" ? x - total / 2 : align === "right" ? x - total : x

  chars.forEach((char, index) => {
    context.fillText(char, cursor, y)
    cursor += widths[index] + spacing
  })
}

function safeFileName(value: string) {
  const clean = value.trim().replace(/[\\/:*?"<>|]+/g, "-")
  return clean || "anime-editorial-poster"
}

function parseCssNumber(value: string) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function parsePercent(value: string, total: number) {
  return (parseCssNumber(value) / 100) * total
}

function alphaColor(color: string, alpha: number) {
  if (color.startsWith("#")) {
    const hex = color.replace("#", "")
    const normalized = hex.length === 3
      ? hex.split("").map((char) => `${char}${char}`).join("")
      : hex.padEnd(6, "0").slice(0, 6)
    const red = Number.parseInt(normalized.slice(0, 2), 16)
    const green = Number.parseInt(normalized.slice(2, 4), 16)
    const blue = Number.parseInt(normalized.slice(4, 6), 16)
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`
  }

  if (color.startsWith("rgb(")) {
    return color.replace("rgb(", "rgba(").replace(")", `, ${alpha})`)
  }

  return color
}

function drawCanvasLine(
  context: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  opacity = 1,
  lineWidth = 1,
) {
  context.save()
  context.globalAlpha = opacity
  context.strokeStyle = color
  context.lineWidth = lineWidth
  context.beginPath()
  context.moveTo(x1, y1)
  context.lineTo(x2, y2)
  context.stroke()
  context.restore()
}

function drawCircleImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  centerX: number,
  centerY: number,
  radius: number,
) {
  context.save()
  context.beginPath()
  context.arc(centerX, centerY, radius, 0, Math.PI * 2)
  context.clip()
  drawCoverImage(context, image, centerX - radius, centerY - radius, radius * 2, radius * 2)
  context.fillStyle = "rgba(255, 236, 244, 0.12)"
  context.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2)
  context.restore()
}

function drawImagePanel(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  borderColor: string,
  opacity = 0.55,
) {
  context.save()
  context.globalAlpha = opacity
  context.fillStyle = "rgba(255,255,255,.32)"
  context.fillRect(x, y, width, height)
  context.beginPath()
  context.rect(x, y, width, height)
  context.clip()
  drawCoverImage(context, image, x, y, width, height)
  context.fillStyle = "rgba(230, 130, 170, 0.14)"
  context.fillRect(x, y, width, height)
  context.restore()

  drawCanvasLine(context, x, y, x + width, y, borderColor, 0.7)
  drawCanvasLine(context, x, y + height, x + width, y + height, borderColor, 0.7)
  drawCanvasLine(context, x, y, x, y + height, borderColor, 0.45)
  drawCanvasLine(context, x + width, y, x + width, y + height, borderColor, 0.45)
}

function drawSparkleShape(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rotation: number,
  color: string,
  opacity: number,
) {
  context.save()
  context.translate(x, y)
  context.rotate((rotation * Math.PI) / 180)
  context.globalAlpha = opacity

  const radius = size / 2
  const inner = radius * 0.42

  const glow = context.createRadialGradient(0, 0, 0, 0, 0, radius * 1.35)
  glow.addColorStop(0, alphaColor("#ffffff", 0.26))
  glow.addColorStop(0.34, alphaColor(color, 0.16))
  glow.addColorStop(1, "rgba(255,255,255,0)")
  context.fillStyle = glow
  context.beginPath()
  context.arc(0, 0, radius * 1.35, 0, Math.PI * 2)
  context.fill()

  context.beginPath()
  context.moveTo(0, -radius)
  context.bezierCurveTo(inner * 0.52, -inner * 0.5, inner * 0.5, -inner * 0.52, radius, 0)
  context.bezierCurveTo(inner * 0.5, inner * 0.52, inner * 0.52, inner * 0.5, 0, radius)
  context.bezierCurveTo(-inner * 0.52, inner * 0.5, -inner * 0.5, inner * 0.52, -radius, 0)
  context.bezierCurveTo(-inner * 0.5, -inner * 0.52, -inner * 0.52, -inner * 0.5, 0, -radius)
  context.closePath()
  context.fillStyle = alphaColor(color, 0.9)
  context.fill()

  context.restore()
}

function drawPetalShape(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: number,
  color: string,
  opacity: number,
) {
  drawSparkleShape(context, x, y, Math.max(width, height), rotation, color, opacity)
}

function drawHeroSpark(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rotation: number,
  color: string,
  opacity: number,
) {
  drawSparkleShape(context, x, y, size, rotation, color, opacity)
}

function drawBarcodeCanvas(context: CanvasRenderingContext2D, x: number, y: number, color: string) {
  const bars = [2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 1, 1, 4, 2, 1, 3, 1, 2, 4, 1, 2, 1, 3]
  let cursor = x
  context.save()
  context.fillStyle = alphaColor(color, 0.76)
  bars.forEach((width) => {
    context.fillRect(cursor, y, width * 2, 18)
    cursor += width * 2 + 3
  })
  context.restore()
}

function drawVerticalText(
  context: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  lineGap: number,
  charGap: number,
  color: string,
) {
  context.save()
  context.fillStyle = color
  context.textAlign = "center"
  context.textBaseline = "top"
  context.font = "18px sans-serif"

  lines.forEach((line, lineIndex) => {
    Array.from(line).forEach((char, charIndex) => {
      context.fillText(char, x + lineIndex * lineGap, y + charIndex * charGap)
    })
  })

  context.restore()
}

function drawEditorialText(
  context: CanvasRenderingContext2D,
  config: EditableConfig,
  sideWords: string[],
  width: number,
  height: number,
) {
  context.textBaseline = "top"
  context.textAlign = "left"

  context.fillStyle = config.ink
  context.font = "16px sans-serif"
  drawSpacedText(context, config.universe, 44, 32, 1.6)
  drawBarcodeCanvas(context, 44, 76, config.ink)
  context.font = "12px sans-serif"
  context.fillStyle = alphaColor(config.muted, 0.76)
  drawSpacedText(context, `${config.topCode}   ${config.topMeta}`, 44, 104, 1.8)
  context.fillStyle = config.accent
  context.font = "13px sans-serif"
  drawSpacedText(context, config.mark, 44, 134, 2.4)

  context.fillStyle = alphaColor(config.accent, 0.72)
  context.font = "142px sans-serif"
  context.fillText(config.largeCode, 42, 262)

  context.fillStyle = config.ink
  context.font = "34px sans-serif"
  drawSpacedText(context, config.codeLabel, 48, 414, 1.2)

  context.font = "62px sans-serif"
  drawSpacedText(context, config.mainTitle, 48, 462, 0.3)

  context.fillStyle = config.muted
  context.font = "17px sans-serif"
  drawSpacedText(context, config.localName, 52, 540, 3)

  context.fillStyle = config.ink
  context.font = "26px sans-serif"
  splitLines(config.bottomHeading).forEach((line, index) => {
    context.fillText(line, 48, height - 250 + index * 39)
  })

  context.fillStyle = alphaColor(config.muted, 0.8)
  context.font = "13px sans-serif"
  context.fillText(config.microLineA, 48, height - 134)
  context.fillText(config.microLineB, 48, height - 108)
  drawSpacedText(context, `${config.tagA}    ${config.tagB}`, 48, height - 70, 2.4)

  context.fillStyle = config.ink
  context.font = "38px sans-serif"
  drawSpacedText(context, config.quoteTitle, width - 360, height - 250, 3)
  context.fillStyle = config.muted
  context.font = "12px sans-serif"
  drawSpacedText(context, config.quoteSource, width - 325, height - 198, 3)
  context.font = "14px sans-serif"
  context.fillText(`“${config.quoteLineA}”`, width - 345, height - 146)
  context.fillText(config.quoteLineB, width - 345, height - 118)

  context.fillStyle = alphaColor(config.accent, 0.72)
  context.font = "66px sans-serif"
  context.fillText(config.smallNumber, width * 0.31, height * 0.64)

  context.fillStyle = alphaColor(config.muted, 0.48)
  context.font = "10px sans-serif"
  sideWords.forEach((word, index) => context.fillText(word, 52, height * 0.18 + index * 22))
  context.fillText(config.bottomCode, width * 0.62, height - 48)

  drawVerticalText(context, [config.verticalLineA, config.verticalLineB], width - 210, height * 0.28, 34, 24, alphaColor(config.muted, 0.74))
}

function downloadCanvas(canvas: HTMLCanvasElement, fileName: string) {
  return new Promise<void>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("canvas export failed"))
        return
      }

      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      resolve()
    }, "image/png")
  })
}

export default function AnimeEditorialYaeMikoPage() {
  const rootRef = useRef<HTMLElement>(null)
  const posterRef = useRef<HTMLDivElement>(null)
  const objectUrlRef = useRef<string | null>(null)

  const [mounted, setMounted] = useState(false)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [config, setConfig] = useState<EditableConfig>(DEFAULT_CONFIG)
  const [uploadedSrc, setUploadedSrc] = useState<string | null>(null)
  const [fileName, setFileName] = useState("")
  const [downloadHint, setDownloadHint] = useState("")

  const imageSrc = uploadedSrc ?? DEFAULT_IMAGE_SRC
  const petals = useMemo(() => makePetals(config.mainTitle), [config.mainTitle])
  const heroStars = useMemo(() => makeHeroStars(config.mainTitle), [config.mainTitle])
  const dots = useMemo(() => makeDots(config.mainTitle), [config.mainTitle])
  const bottomHeadingLines = useMemo(() => splitLines(config.bottomHeading), [config.bottomHeading])
  const sideWords = useMemo(() => config.sideWords.filter(Boolean).slice(0, 8), [config.sideWords])

  const setField = useCallback((key: keyof EditableConfig, value: string | string[]) => {
    setConfig((current) => ({
      ...current,
      [key]: value,
    }))
  }, [])

  const applyTone = useCallback((tone: TonePreset) => {
    setConfig((current) => ({
      ...current,
      bgStart: tone.bgStart,
      bgMid: tone.bgMid,
      bgEnd: tone.bgEnd,
      ink: tone.ink,
      muted: tone.muted,
      accent: tone.accent,
      accentSoft: tone.accentSoft,
      secondary: tone.secondary,
      line: tone.line,
      sparkleColor: tone.sparkleColor,
    }))
  }, [])

  const handleImageChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    const nextUrl = URL.createObjectURL(file)
    objectUrlRef.current = nextUrl
    setUploadedSrc(nextUrl)
    setFileName(file.name)
  }, [])

  const clearImage = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    setUploadedSrc(null)
    setFileName("")
  }, [])

  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_CONFIG)
  }, [])

  const copyConfig = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(config, null, 2))
      setDownloadHint("配置已复制")
    } catch {
      setDownloadHint("复制失败")
    }
  }, [config])

  const downloadPoster = useCallback(async () => {
    setDownloadHint("正在生成完整海报…")

    try {
      const image = await loadImage(imageSrc)
      const canvas = document.createElement("canvas")
      const scale = 2
      const width = 1600
      const height = 900
      canvas.width = width * scale
      canvas.height = height * scale

      const context = canvas.getContext("2d")
      if (!context) {
        setDownloadHint("生成失败")
        return
      }

      context.scale(scale, scale)
      context.clearRect(0, 0, width, height)

      const bg = context.createLinearGradient(0, 0, width, height)
      bg.addColorStop(0, config.bgStart)
      bg.addColorStop(0.58, config.bgMid)
      bg.addColorStop(1, config.bgEnd)
      context.fillStyle = bg
      context.fillRect(0, 0, width, height)

      context.save()
      const glowA = context.createRadialGradient(width * 0.48, height * 0.38, 20, width * 0.48, height * 0.38, 560)
      glowA.addColorStop(0, "rgba(255,255,255,.78)")
      glowA.addColorStop(0.56, alphaColor(config.accentSoft, 0.18))
      glowA.addColorStop(1, "rgba(255,255,255,0)")
      context.fillStyle = glowA
      context.fillRect(0, 0, width, height)

      const glowB = context.createRadialGradient(width * 0.84, height * 0.76, 20, width * 0.84, height * 0.76, 500)
      glowB.addColorStop(0, alphaColor(config.secondary, 0.22))
      glowB.addColorStop(0.55, alphaColor(config.secondary, 0.08))
      glowB.addColorStop(1, "rgba(255,255,255,0)")
      context.fillStyle = glowB
      context.fillRect(0, 0, width, height)
      context.restore()

      context.save()
      context.globalAlpha = 0.18
      context.strokeStyle = config.line
      context.lineWidth = 1
      for (let x = 0; x <= width; x += 84) {
        context.beginPath()
        context.moveTo(x, 0)
        context.lineTo(x, height)
        context.stroke()
      }
      for (let y = 0; y <= height; y += 84) {
        context.beginPath()
        context.moveTo(0, y)
        context.lineTo(width, y)
        context.stroke()
      }
      context.restore()

      heroStars.forEach((star) => {
        drawHeroSpark(
          context,
          parsePercent(star.left, width),
          parsePercent(star.top, height),
          parseCssNumber(star.size),
          parseCssNumber(star.rotate),
          config.sparkleColor,
          Number(star.opacity) * 0.7,
        )
      })

      dots.forEach((dot) => {
        context.save()
        context.globalAlpha = Number(dot.opacity)
        context.fillStyle = config.muted
        const size = Math.max(1, parseCssNumber(dot.size) * 1.2)
        context.beginPath()
        context.arc(parsePercent(dot.left, width), parsePercent(dot.top, height), size, 0, Math.PI * 2)
        context.fill()
        context.restore()
      })

      petals.forEach((petal) => {
        drawPetalShape(
          context,
          parsePercent(petal.left, width),
          parsePercent(petal.top, height),
          parseCssNumber(petal.size) * 1.1,
          parseCssNumber(petal.size) * 0.7,
          parseCssNumber(petal.rotate),
          config.sparkleColor,
          Number(petal.opacity) * 0.68,
        )
      })

      ;[
        [42, 26, 360, 26, 0.95],
        [width - 390, 54, width - 74, 54, 0.75],
        [width * 0.49, 0, width * 0.49, height, 0.42],
        [width * 0.73, 0, width * 0.73, height, 0.52],
        [width * 0.2, height * 0.24, width * 0.86, height * 0.24, 0.44],
        [width * 0.25, height * 0.52, width * 0.76, height * 0.52, 0.42],
        [width * 0.44, height * 0.76, width * 0.56, height * 0.76, 0.7],
      ].forEach(([x1, y1, x2, y2, alpha]) => {
        drawCanvasLine(context, x1, y1, x2, y2, config.line, alpha)
      })

      context.save()
      context.globalAlpha = 0.34
      context.strokeStyle = config.accent
      context.lineWidth = 1
      context.beginPath()
      context.ellipse(width * 0.5, height * 0.46, 410, 360, 0.18, 0, Math.PI * 2)
      context.stroke()
      context.beginPath()
      context.ellipse(width * 0.53, height * 0.44, 305, 250, -0.24, 0, Math.PI * 2)
      context.stroke()
      context.restore()

      const circleSize = 640
      const centerX = width * 0.5
      const centerY = height * 0.46

      context.save()
      context.globalAlpha = 0.24
      context.fillStyle = config.accent
      context.beginPath()
      context.arc(width * 0.31, height * 0.44, 130, 0, Math.PI * 2)
      context.fill()
      context.restore()

      drawCircleImage(context, image, centerX, centerY, circleSize / 2)

      context.save()
      context.strokeStyle = config.line
      context.lineWidth = 1.2
      context.beginPath()
      context.arc(centerX, centerY, circleSize / 2, 0, Math.PI * 2)
      context.stroke()
      context.restore()

      drawImagePanel(context, image, width * 0.205, height * 0.18, width * 0.15, height * 0.22, config.line, 0.58)
      drawImagePanel(context, image, width * 0.765, height * 0.085, width * 0.16, height * 0.105, config.line, 0.62)

      context.save()
      context.fillStyle = alphaColor(config.muted, 0.42)
      for (let row = 0; row < 6; row += 1) {
        for (let col = 0; col < 8; col += 1) {
          context.beginPath()
          context.arc(width * 0.22 + col * 13, height * 0.38 + row * 13, 2, 0, Math.PI * 2)
          context.fill()
        }
      }

      for (let index = 0; index < 22; index += 1) {
        context.fillRect(width * 0.41 + index * 8, height * 0.69 + 20 - ((index * 7) % 18), 3, 6 + ((index * 7) % 18))
      }
      context.restore()

      drawEditorialText(context, config, sideWords, width, height)

      await downloadCanvas(canvas, `${safeFileName(config.mainTitle)}-poster.png`)
      setDownloadHint("图片已生成")
    } catch {
      setDownloadHint("图片生成失败，确认图片已加载后再试")
    }
  }, [config, dots, heroStars, imageSrc, petals, sideWords])

  useEffect(() => {
    setMounted(true)
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved) setConfig(sanitizeConfig(JSON.parse(saved)))
    } catch {
      // Ignore invalid saved config.
    }

    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  useEffect(() => {
    if (!mounted) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    } catch {
      // Ignore storage failure.
    }
  }, [config, mounted])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const compactMotion = window.matchMedia("(max-width: 760px), (max-height: 760px), (pointer: coarse)").matches
    if (reduceMotion) return

    const ctx = gsap.context(() => {
      gsap.set(".intro-line", { scaleX: 0, transformOrigin: "left center" })
      gsap.set(".intro-fade", { autoAlpha: 0, y: 16, filter: "blur(8px)" })
      gsap.set(".hero-disc", { scale: 0.92, autoAlpha: 0, filter: "blur(10px)" })
      gsap.set(".hero-art", { scale: 1.035, autoAlpha: 0 })
      gsap.set(".detail-block", { autoAlpha: 0, y: 10 })
      gsap.set(".corner-tick", { autoAlpha: 0 })
      gsap.set(".orbit", { autoAlpha: 0, scale: 0.88, rotate: -10 })
      gsap.set(".editor-button", { autoAlpha: 0, y: -8 })

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } })

      tl.to(".hero-disc", { autoAlpha: 1, scale: 1, filter: "blur(0px)", duration: 1.05 }, 0.12)
        .to(".hero-art", { autoAlpha: 1, scale: 1, duration: 1.1 }, 0.2)
        .to(".intro-line", { scaleX: 1, duration: 0.9, stagger: 0.08 }, 0.22)
        .to(".intro-fade", { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.72, stagger: 0.05 }, 0.32)
        .to(".detail-block", { autoAlpha: 1, y: 0, duration: 0.72, stagger: 0.06 }, 0.55)
        .to(".corner-tick", { autoAlpha: 0.65, duration: 0.6, stagger: 0.03 }, 0.65)
        .to(".orbit", { autoAlpha: 0.42, scale: 1, rotate: 0, duration: 1.15, stagger: 0.08 }, 0.7)
        .to(".editor-button", { autoAlpha: 1, y: 0, duration: 0.6 }, 0.9)

      if (!compactMotion) {
        gsap.to(".orbit-a", {
          rotate: 360,
          duration: 34,
          repeat: -1,
          ease: "none",
          transformOrigin: "50% 50%",
        })

        gsap.to(".orbit-b", {
          rotate: -360,
          duration: 42,
          repeat: -1,
          ease: "none",
          transformOrigin: "50% 50%",
        })

        gsap.to(".hero-art", {
          yPercent: -0.8,
          xPercent: 0.4,
          duration: 6.8,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        })

        gsap.to(".micro-shift-left", {
          x: -5,
          duration: 4.8,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        })

        gsap.to(".micro-shift-right", {
          x: 5,
          duration: 5.3,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        })
      }
    }, root)

    return () => ctx.revert()
  }, [])

  const themeVars = {
    "--bg-start": config.bgStart,
    "--bg-mid": config.bgMid,
    "--bg-end": config.bgEnd,
    "--ink": config.ink,
    "--muted": config.muted,
    "--accent": config.accent,
    "--accent-soft": config.accentSoft,
    "--secondary": config.secondary,
    "--line": config.line,
    "--sparkle": config.sparkleColor,
  } as CSSProperties & Record<string, string>

  return (
    <main
      ref={rootRef}
      style={themeVars}
      className="poster-root relative min-h-[calc(100dvh-4rem)] overflow-hidden bg-[color:var(--bg-mid)] text-[color:var(--ink)]"
    >
      <style>{`
        .editorial-grid {
          background-image:
            linear-gradient(color-mix(in srgb, var(--ink) 8%, transparent) 1px, transparent 1px),
            linear-gradient(90deg, color-mix(in srgb, var(--ink) 8%, transparent) 1px, transparent 1px);
          background-size: 84px 84px;
          mask-image: linear-gradient(to bottom, rgba(0,0,0,.86), rgba(0,0,0,.38));
        }

        .hero-disc {
          aspect-ratio: 1 / 1;
          border-radius: 9999px;
          clip-path: circle(50% at 50% 50%);
        }

        .hero-disc > img {
          height: 100%;
          width: 100%;
          object-fit: cover;
        }

        .editor-scroll {
          scrollbar-gutter: stable;
        }

        .image-soften {
          filter:
            saturate(.82)
            contrast(.92)
            brightness(1.08)
            sepia(.06)
            hue-rotate(-6deg);
        }

        .dust-dot {
          animation: dust-blink calc(4.8s + var(--dot-twinkle, 0s)) ease-in-out infinite alternate;
          will-change: opacity, transform;
          background: color-mix(in srgb, var(--sparkle) 42%, var(--muted)) !important;
        }

        .hero-spark,
        .petal {
          position: absolute;
          background: transparent;
          transform-origin: 50% 50%;
          isolation: isolate;
          opacity: var(--sparkle-opacity);
          will-change: transform, opacity, filter;
        }

        .hero-spark svg,
        .petal svg {
          display: block;
          height: 100%;
          width: 100%;
          filter: drop-shadow(0 0 5px color-mix(in srgb, var(--sparkle) 10%, transparent));
        }

        .hero-spark {
          animation:
            hero-star-float var(--hero-duration) ease-in-out infinite both,
            hero-star-twinkle calc(var(--hero-duration) * .62) ease-in-out infinite alternate;
          animation-delay: var(--hero-delay), calc(var(--hero-delay) * .42);
          --sparkle-opacity: var(--hero-opacity);
        }

        .petal {
          animation:
            petal-float var(--petal-duration) ease-in-out infinite both,
            star-twinkle calc(var(--petal-duration) * .76) ease-in-out infinite alternate;
          animation-delay: var(--petal-delay), calc(var(--petal-delay) * .58);
          --sparkle-opacity: var(--petal-opacity);
        }

        @keyframes dust-blink {
          0% {
            opacity: calc(.48 * var(--dot-opacity));
            transform: scale(.86);
          }
          100% {
            opacity: var(--dot-opacity);
            transform: scale(1.14);
          }
        }

        @keyframes hero-star-float {
          0%, 100% {
            transform: translate3d(0, 0, 0) rotate(var(--hero-rotate)) scale(.94);
            opacity: var(--hero-opacity);
          }
          36% {
            transform: translate3d(5px, -7px, 0) rotate(calc(var(--hero-rotate) + 7deg)) scale(1.08);
            opacity: calc(var(--hero-opacity) * .94);
          }
          68% {
            transform: translate3d(-4px, 5px, 0) rotate(calc(var(--hero-rotate) - 5deg)) scale(1.02);
            opacity: calc(var(--hero-opacity) * .82);
          }
        }

        @keyframes hero-star-twinkle {
          0% {
            filter: saturate(.92) brightness(.94);
          }
          100% {
            filter: saturate(1.22) brightness(1.32);
          }
        }

        @keyframes petal-float {
          0%, 100% {
            transform:
              translate3d(0, 0, 0)
              rotate(var(--petal-rotate))
              scale(.94);
            opacity: var(--petal-opacity);
          }
          38% {
            transform:
              translate3d(calc(var(--petal-x) * .82), calc(var(--petal-y) * .82), 0)
              rotate(calc(var(--petal-rotate) + 8deg))
              scale(1.07);
            opacity: calc(var(--petal-opacity) * .96);
          }
          72% {
            transform:
              translate3d(calc(var(--petal-x) * -.45), calc(var(--petal-y) * .55), 0)
              rotate(calc(var(--petal-rotate) - 6deg))
              scale(.99);
            opacity: calc(var(--petal-opacity) * .78);
          }
        }

        @keyframes star-twinkle {
          0% {
            filter: saturate(.92) brightness(.92);
          }
          100% {
            filter: saturate(1.18) brightness(1.24);
          }
        }

        @media (max-width: 1180px), (max-height: 880px) {
          .poster-root {
            height: calc(100dvh - 4rem) !important;
            min-height: calc(100dvh - 4rem) !important;
            overflow: hidden !important;
          }

          .poster-wrap {
            height: 100% !important;
            min-height: 0 !important;
            overflow: hidden !important;
            padding: 14px 18px 72px !important;
          }

          .poster-stage {
            height: 100% !important;
            min-height: 0 !important;
            overflow: hidden !important;
          }

          .editor-button {
            position: absolute !important;
            right: 14px !important;
            top: auto !important;
            bottom: 12px !important;
            z-index: 70 !important;
            gap: 8px !important;
          }

          .editor-button button {
            padding: 9px 13px !important;
            font-size: 11px !important;
            letter-spacing: .07em !important;
            white-space: nowrap !important;
          }

          .hero-disc {
            left: 50% !important;
            top: 7.5% !important;
            width: min(34vw, 470px, 55vh) !important;
            height: auto !important;
            transform: translateX(-50%) !important;
          }

          .hero-disc img {
            object-position: var(--mobile-image-position, 50% 42%) !important;
          }

          .top-info-block {
            left: 5% !important;
            top: 5.5% !important;
            width: min(28vw, 330px) !important;
            min-width: 0 !important;
            transform: scale(.86);
            transform-origin: top left;
          }

          .main-title-block {
            left: 5.6% !important;
            top: 27% !important;
            width: min(36vw, 520px) !important;
            max-width: min(36vw, 520px) !important;
            isolation: isolate;
          }

          .main-title-block .large-code {
            position: absolute !important;
            left: -6px !important;
            top: -88px !important;
            z-index: -1 !important;
            max-width: 100% !important;
            font-size: clamp(54px, 8.4vw, 124px) !important;
            line-height: 1.02 !important;
            letter-spacing: -0.012em !important;
            opacity: .28 !important;
            pointer-events: none !important;
          }

          .main-title-block .code-label {
            margin-top: 0 !important;
            max-width: 100% !important;
            font-size: clamp(16px, 2.2vw, 31px) !important;
            line-height: 1.24 !important;
            letter-spacing: .01em !important;
          }

          .main-title-block .title-line {
            margin-top: 14px !important;
            max-width: 100% !important;
            font-size: clamp(34px, 4.4vw, 72px) !important;
            line-height: 1.08 !important;
            letter-spacing: -0.01em !important;
          }

          .main-title-block .local-name {
            margin-top: 12px !important;
            font-size: clamp(10px, 1.1vw, 13px) !important;
            line-height: 1.55 !important;
            letter-spacing: .2em !important;
          }

          .bottom-info-block {
            display: block !important;
            left: 5.6% !important;
            top: 70% !important;
            bottom: auto !important;
            width: min(31vw, 390px) !important;
            min-width: 0 !important;
            transform: scale(.78);
            transform-origin: top left;
          }

          .bottom-info-block .bottom-heading {
            font-size: clamp(15px, 1.7vw, 22px) !important;
            line-height: 1.55 !important;
            letter-spacing: .026em !important;
          }

          .quote-block {
            display: block !important;
            right: 9% !important;
            top: 65% !important;
            bottom: auto !important;
            width: min(24vw, 340px) !important;
            min-width: 0 !important;
            transform: scale(.86);
            transform-origin: top center;
          }

          .quote-block .quote-title {
            font-size: clamp(23px, 2.4vw, 42px) !important;
            line-height: 1.14 !important;
            letter-spacing: .09em !important;
          }

          .quote-block .quote-body {
            margin-top: 14px !important;
            font-size: 9px !important;
            line-height: 1.85 !important;
            letter-spacing: .1em !important;
          }

          .micro-shift-left {
            display: block !important;
            left: 28% !important;
            top: 18% !important;
            width: min(14vw, 210px) !important;
            height: min(10vw, 140px) !important;
            opacity: .55 !important;
          }

          .micro-shift-right {
            display: block !important;
            right: 4% !important;
            top: 6.5% !important;
            width: min(16vw, 260px) !important;
            height: min(8.5vw, 125px) !important;
            opacity: .72 !important;
          }

          .vertical-copy {
            display: block !important;
            right: 4.2% !important;
            top: 31% !important;
            transform: scale(.82);
            transform-origin: top right;
          }

          .dense-only {
            opacity: .58 !important;
          }

          .mobile-caption {
            display: none !important;
          }
        }

        @media (max-width: 760px), (max-height: 660px) {
          .hero-spark:nth-of-type(3n),
          .petal:nth-of-type(4n) {
            opacity: .08 !important;
          }

          .poster-wrap {
            padding: 12px 14px 70px !important;
          }

          .hero-disc {
            left: 50% !important;
            top: 9% !important;
            width: min(52vw, 310px, 38vh) !important;
          }

          .top-info-block {
            left: 5% !important;
            top: 4% !important;
            width: 45% !important;
            transform: scale(.72);
          }

          .main-title-block {
            left: 5% !important;
            top: 43% !important;
            width: 90% !important;
            max-width: 90% !important;
          }

          .main-title-block .large-code {
            display: none !important;
          }

          .main-title-block .code-label {
            font-size: clamp(14px, 4.2vw, 21px) !important;
            line-height: 1.3 !important;
          }

          .main-title-block .title-line {
            margin-top: 9px !important;
            font-size: clamp(28px, 9.2vw, 48px) !important;
            line-height: 1.12 !important;
            letter-spacing: -0.01em !important;
          }

          .main-title-block .local-name {
            margin-top: 8px !important;
            font-size: 10px !important;
            letter-spacing: .18em !important;
          }

          .bottom-info-block {
            left: 5% !important;
            top: 68% !important;
            width: 44% !important;
            transform: scale(.62);
          }

          .quote-block {
            right: 4% !important;
            top: 68% !important;
            width: 45% !important;
            transform: scale(.62);
          }

          .quote-block .quote-title {
            font-size: 17px !important;
            letter-spacing: .06em !important;
          }

          .bottom-info-block .mt-5,
          .quote-block .quote-body,
          .vertical-copy,
          .dense-only {
            display: none !important;
          }

          .micro-shift-left {
            left: 9% !important;
            top: 22% !important;
            width: 25vw !important;
            height: 14vw !important;
            opacity: .34 !important;
          }

          .micro-shift-right {
            right: 5% !important;
            top: 6% !important;
            width: 24vw !important;
            height: 13vw !important;
            opacity: .58 !important;
          }

          .petal {
            animation-duration: calc(var(--petal-duration) * .86) !important;
          }

          .hero-spark {
            transform: scale(.92);
          }
        }

        @media (max-width: 460px), (max-height: 540px) {
          .hero-disc {
            top: 8% !important;
            width: min(50vw, 200px, 30vh) !important;
          }

          .top-info-block {
            width: 58% !important;
            transform: scale(.62);
          }

          .main-title-block {
            top: 39% !important;
            left: 6% !important;
            width: 88% !important;
          }

          .main-title-block .code-label {
            font-size: 13px !important;
          }

          .main-title-block .title-line {
            font-size: clamp(25px, 9.5vw, 38px) !important;
            line-height: 1.13 !important;
          }

          .bottom-info-block {
            top: 61% !important;
            transform: scale(.52);
          }

          .quote-block {
            top: 64% !important;
            transform: scale(.52);
          }

          .bottom-info-block .mt-3,
          .bottom-info-block .mt-5,
          .quote-block .mt-1,
          .quote-block .quote-body {
            display: none !important;
          }
        }

        @media (max-height: 620px) and (orientation: landscape) {
          .poster-wrap {
            padding: 10px 16px 56px !important;
          }

          .hero-disc {
            left: 50% !important;
            top: 4% !important;
            width: min(30vw, 360px, 58vh) !important;
          }

          .top-info-block {
            left: 3.2% !important;
            top: 5% !important;
            width: 27% !important;
            transform: scale(.64);
          }

          .main-title-block {
            left: 3.2% !important;
            top: 29% !important;
            width: 35% !important;
            max-width: 35% !important;
          }

          .main-title-block .large-code {
            display: none !important;
          }

          .main-title-block .code-label {
            max-width: 100% !important;
            font-size: clamp(15px, 4.8vh, 23px) !important;
            line-height: 1.22 !important;
          }

          .main-title-block .title-line {
            max-width: 100% !important;
            margin-top: 8px !important;
            font-size: clamp(34px, 11vh, 58px) !important;
            line-height: 1.05 !important;
          }

          .bottom-info-block {
            left: 3.2% !important;
            top: 68% !important;
            width: 27% !important;
            transform: scale(.56);
          }

          .quote-block {
            right: 4% !important;
            top: 63% !important;
            width: 24% !important;
            transform: scale(.6);
          }

          .micro-shift-right {
            display: block !important;
            right: 3% !important;
            top: 7% !important;
            width: min(15vw, 220px) !important;
            height: min(8vw, 105px) !important;
            opacity: .7 !important;
          }

          .micro-shift-left {
            display: block !important;
            left: 29% !important;
            top: 15% !important;
            width: min(12vw, 165px) !important;
            height: min(8vw, 105px) !important;
            opacity: .42 !important;
          }

          .vertical-copy,
          .bottom-info-block .mt-5,
          .quote-block .quote-body,
          .dense-only {
            display: none !important;
          }

          .editor-button {
            bottom: 8px !important;
            right: 10px !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .petal,
          .hero-spark,
          .dust-dot {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_48%_38%,rgba(255,255,255,.94),transparent_36%),radial-gradient(circle_at_15%_22%,color-mix(in_srgb,var(--accent-soft)_40%,transparent),transparent_28%),radial-gradient(circle_at_84%_76%,color-mix(in_srgb,var(--secondary)_24%,transparent),transparent_30%),linear-gradient(135deg,var(--bg-start)_0%,var(--bg-mid)_58%,var(--bg-end)_100%)]" />
      <div className="editorial-grid pointer-events-none absolute inset-0 opacity-70" />

      {heroStars.map((star) => (
        <span
          key={star.id}
          className="hero-spark pointer-events-none absolute z-[2] block"
          style={
            {
              left: star.left,
              top: star.top,
              width: star.size,
              height: star.size,
              "--hero-delay": star.delay,
              "--hero-duration": star.duration,
              "--hero-opacity": star.opacity,
              "--hero-rotate": star.rotate,
            } as CSSProperties & Record<string, string>
          }
        >
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <path
              d="M50 0C59 33 67 41 100 50C67 59 59 67 50 100C41 67 33 59 0 50C33 41 41 33 50 0Z"
              fill="var(--sparkle)"
            />
          </svg>
        </span>
      ))}

      {dots.map((dot) => (
        <span
          key={dot.id}
          className="dust-dot pointer-events-none absolute rounded-full"
          style={{
            left: dot.left,
            top: dot.top,
            width: dot.size,
            height: dot.size,
            opacity: dot.opacity,
            background: "var(--muted)",
            "--dot-opacity": dot.opacity,
            "--dot-twinkle": `${Number(dot.opacity) * 8}s`,
          } as CSSProperties & Record<string, string> }
        />
      ))}

      {petals.map((petal) => (
        <span
          key={petal.id}
          className="petal pointer-events-none absolute z-[3] block"
          style={
            {
              left: petal.left,
              top: petal.top,
              width: petal.size,
              height: petal.size,
              "--petal-delay": petal.delay,
              "--petal-duration": petal.duration,
              "--petal-x": petal.driftX,
              "--petal-y": petal.driftY,
              "--petal-opacity": petal.opacity,
              "--petal-rotate": petal.rotate,
            } as CSSProperties & Record<string, string>
          }
        >
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <path
              d="M50 0C59 33 67 41 100 50C67 59 59 67 50 100C41 67 33 59 0 50C33 41 41 33 50 0Z"
              fill="var(--sparkle)"
            />
          </svg>
        </span>
      ))}

      <div className="editor-button absolute right-5 top-5 z-50 flex items-center gap-2 sm:right-8 sm:top-7">
        <button
          type="button"
          onClick={downloadPoster}
          className="rounded-full border border-[color:var(--line)] bg-white/72 px-4 py-2.5 text-xs font-semibold tracking-[0.12em] text-[color:var(--muted)] shadow-[0_16px_50px_rgba(80,50,70,.1)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white"
        >
          下载图片
        </button>
        <button
          type="button"
          onClick={() => setIsEditorOpen(true)}
          className="rounded-full border border-[color:var(--line)] bg-[color:var(--ink)] px-4 py-2.5 text-xs font-semibold tracking-[0.16em] text-white shadow-[0_16px_50px_rgba(80,50,70,.12)] backdrop-blur-xl transition hover:-translate-y-0.5"
        >
          编辑海报
        </button>
      </div>

      <div
        ref={posterRef}
        className="poster-wrap relative mx-auto min-h-[calc(100dvh-4rem)] w-full max-w-[1800px] overflow-hidden px-[clamp(16px,2vw,38px)] py-[clamp(18px,2vw,34px)]"
        style={{ "--mobile-image-position": config.imagePosition } as CSSProperties & Record<string, string>}
      >
        <div className="corner-tick absolute left-[2.6%] top-[1.8%] h-px w-[22%] bg-[color:var(--line)]" />
        <div className="corner-tick absolute right-[1.8%] top-[4.2%] h-px w-[16%] bg-[color:var(--line)] opacity-70" />
        <div className="corner-tick absolute bottom-[4.6%] right-[2.8%] h-px w-[20%] bg-[color:var(--line)]" />
        <div className="corner-tick absolute bottom-[8%] left-[2.6%] h-px w-[18%] bg-[color:var(--line)] opacity-70" />

        <section className="poster-stage relative min-h-[calc(100dvh-4rem-52px)]">
          <div className="top-info-block detail-block absolute left-[1.2%] top-[1.4%] z-20 w-[24%] min-w-[220px]">
            <div className="intro-line h-px w-full bg-[color:var(--line)]" />
            <div className="mt-3 text-[clamp(10px,.9vw,14px)] tracking-[0.12em] text-[color:var(--ink)]">
              {config.universe}
            </div>
            <div className="mt-2 flex items-center gap-3">
              <Barcode />
            </div>
            <div className="mt-2 flex gap-6 text-[9px] uppercase tracking-[0.26em] text-[color:var(--muted)]/70">
              <span>{config.topCode}</span>
              <span>{config.topMeta}</span>
            </div>
            <div className="mt-3 text-[10px] tracking-[0.18em] text-[color:var(--accent)]">{config.mark}</div>
          </div>

          <div className="main-title-block detail-block absolute left-[1.1%] top-[31%] z-20">
            <div className="large-code text-[clamp(68px,10vw,170px)] leading-[.98] tracking-[-0.035em] text-[color:var(--accent)]/75">
              {config.largeCode}
            </div>
            <div className="code-label mt-2 text-[clamp(18px,2vw,34px)] uppercase leading-[1.12] tracking-[0.02em] text-[color:var(--ink)]">
              {config.codeLabel}
            </div>
            <div className="title-line mt-2 text-[clamp(28px,4vw,66px)] uppercase leading-[1.08] tracking-[-0.025em] text-[color:var(--ink)]">
              {config.mainTitle}
            </div>
            <div className="local-name mt-3 text-[10px] leading-5 tracking-[0.28em] text-[color:var(--muted)]">{config.localName}</div>
            <div className="intro-line mt-5 h-px w-28 bg-[color:var(--line)]" />
          </div>

          <div className="bottom-info-block detail-block absolute bottom-[9%] left-[1.2%] z-20 w-[24%] min-w-[250px]">
            <div className="intro-line mb-6 h-px w-full bg-[color:var(--line)]" />
            <div className="bottom-heading text-[clamp(15px,1.3vw,22px)] font-semibold leading-[1.55] tracking-[0.045em] text-[color:var(--ink)]">
              {bottomHeadingLines.map((line) => (
                <span key={line}>
                  {line}
                  <br />
                </span>
              ))}
            </div>
            <div className="mt-3 text-[10px] tracking-[0.22em] text-[color:var(--muted)]">
              {config.universe}
            </div>
            <div className="mt-5 max-w-[220px] text-[8px] uppercase leading-5 tracking-[0.22em] text-[color:var(--muted)]/78">
              {config.microLineA}
              <br />
              {config.microLineB}
            </div>
            <div className="mt-5 flex items-center gap-5 text-[8px] tracking-[0.24em] text-[color:var(--muted)]">
              <span>{config.tagA}</span>
              <span>{config.tagB}</span>
            </div>
          </div>

          <div className="detail-block absolute right-[2%] top-[2%] z-20 flex items-center gap-3 text-[8px] uppercase tracking-[0.5em] text-[color:var(--muted)]/70">
            <span>{config.rightMeta}</span>
            <span>{config.rightCode}</span>
          </div>

          <div className="detail-block absolute right-[1%] top-[8%] z-20 text-right">
            <div className="flex items-center justify-end gap-3 text-[10px] tracking-[0.18em] text-[color:var(--muted)]">
              <span className="text-lg">+</span>
              <span className="text-[12px] font-semibold">{config.rightCode}</span>
            </div>
            <div className="mt-1 text-[7px] uppercase tracking-[0.2em] text-[color:var(--muted)]/64">
              {config.mainTitle.toLowerCase()}
            </div>
          </div>

          <div className="vertical-copy detail-block absolute right-[6.6%] top-[28%] z-20">
            <div className="writing-vertical text-[10px] leading-7 tracking-[0.2em] text-[color:var(--muted)]/76">
              {config.verticalLineA}
              <br />
              {config.verticalLineB}
            </div>
          </div>

          <div className="quote-block detail-block absolute bottom-[16%] right-[4.5%] z-20 w-[17%] min-w-[190px] text-center">
            <div className="quote-title text-[clamp(22px,2.5vw,40px)] uppercase leading-[1.16] tracking-[0.12em] text-[color:var(--ink)]">
              {config.quoteTitle}
            </div>
            <div className="mt-1 text-[8px] uppercase tracking-[0.34em] text-[color:var(--muted)]">
              {config.quoteSource}
            </div>
            <div className="quote-body mt-5 text-[9px] leading-6 tracking-[0.12em] text-[color:var(--muted)]/82">
              “{config.quoteLineA}”
              <br />
              {config.quoteLineB}
            </div>
            <div className="intro-line mx-auto mt-5 h-px w-[72%] bg-[color:var(--line)]" />
          </div>

          <div className="hero-disc absolute left-1/2 top-[7%] z-10 w-[min(44vw,74vh)] -translate-x-1/2 overflow-hidden border border-[color:var(--line)] bg-[color:var(--accent-soft)]/25 shadow-[0_34px_110px_rgba(119,77,100,.12)]">
            <img
              src={imageSrc}
              alt={`${config.mainTitle} editorial visual`}
              className="hero-art image-soften h-full w-full object-cover"
              style={{ objectPosition: config.imagePosition }}
            />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,color-mix(in_srgb,var(--accent-soft)_22%,transparent),transparent_28%,transparent_76%,color-mix(in_srgb,var(--secondary)_16%,transparent))]" />
          </div>

          <div className="orbit orbit-a pointer-events-none absolute left-[23%] top-[2%] z-0 h-[90%] w-[58%] rounded-[50%] border border-[color:var(--muted)]/22" />
          <div className="orbit orbit-b pointer-events-none absolute left-[31%] top-[11%] z-0 h-[69%] w-[43%] rounded-[50%] border border-[color:var(--accent)]/28" />

          <div className="micro-shift-left detail-block absolute left-[20.2%] top-[19%] z-30 h-[18%] w-[13%] overflow-hidden border border-white/55 bg-[color:var(--accent)]/20 shadow-[0_18px_60px_rgba(138,77,102,.12)]">
            <img
              src={imageSrc}
              alt=""
              aria-hidden="true"
              className="image-soften h-full w-full object-cover opacity-55 mix-blend-multiply"
              style={{ objectPosition: "38% 34%" }}
            />
          </div>

          <div className="micro-shift-right detail-block absolute right-[4.7%] top-[8.5%] z-30 h-[10%] w-[14%] overflow-hidden border border-white/55 bg-[color:var(--accent)]/16 shadow-[0_18px_60px_rgba(138,77,102,.08)]">
            <img
              src={imageSrc}
              alt=""
              aria-hidden="true"
              className="image-soften h-full w-full object-cover opacity-55"
              style={{ objectPosition: "70% 12%" }}
            />
          </div>

          <div className="dense-only detail-block absolute left-[29%] top-[60%] z-20">
            <div className="text-[clamp(34px,4vw,70px)] tracking-[-0.04em] text-[color:var(--accent)]/75">
              {config.smallNumber}
            </div>
          </div>

          <div className="dense-only detail-block absolute left-[28.2%] top-[56%] z-20 h-[35%] w-px bg-[color:var(--line)]" />
          <div className="dense-only detail-block absolute left-[49.7%] top-[0%] z-20 h-[100%] w-px bg-[color:var(--line)] opacity-50" />
          <div className="dense-only detail-block absolute right-[25%] top-[0%] z-20 h-[100%] w-px bg-[color:var(--line)] opacity-70" />
          <div className="dense-only detail-block absolute left-[20%] top-[24%] z-20 h-px w-[64%] bg-[color:var(--line)] opacity-45" />

          <div className="dense-only detail-block absolute left-[21%] top-[14%] z-20 h-12 w-px bg-[color:var(--line)]" />
          <div className="dense-only detail-block absolute left-[18%] top-[22%] z-20 h-px w-24 bg-[color:var(--accent)]/64" />
          <div className="dense-only detail-block absolute right-[16%] top-[12%] z-20 h-px w-20 bg-[color:var(--line)]" />
          <div className="dense-only detail-block absolute right-[8%] bottom-[10%] z-20 text-[36px] font-light text-[color:var(--muted)]/75">+</div>

          <div className="dense-only detail-block absolute left-[31.5%] top-[65.5%] z-20 h-20 w-px bg-[color:var(--line)]" />
          <div className="dense-only detail-block absolute left-[41%] top-[69%] z-20 flex items-end gap-1">
            {Array.from({ length: 22 }, (_, index) => (
              <span
                key={`mini-bar-${index}`}
                className="block"
                style={{
                  width: 2,
                  height: `${6 + ((index * 7) % 13)}px`,
                  background: "color-mix(in srgb, var(--ink) 42%, transparent)",
                }}
              />
            ))}
          </div>

          <div className="dense-only detail-block absolute right-[20.5%] bottom-[7.5%] z-20 h-14 w-px bg-[color:var(--line)]" />

          <div className="dense-only detail-block absolute left-[22%] top-[38%] z-20 grid grid-cols-8 gap-[4px] opacity-35">
            {Array.from({ length: 48 }, (_, index) => (
              <span
                key={`matrix-dot-${index}`}
                className="h-[2px] w-[2px] rounded-full"
                style={{ background: "var(--muted)" }}
              />
            ))}
          </div>

          <div className="dense-only detail-block absolute right-[15.5%] top-[47%] z-20 h-[18%] w-[24%] rounded-[50%] border border-[color:var(--accent)]/18" />
          <div className="dense-only detail-block absolute right-[19%] top-[43%] z-20 h-[26%] w-[30%] rounded-[50%] border border-[color:var(--muted)]/12" />

          <div className="dense-only detail-block absolute left-[24%] top-[49%] z-20 h-px w-[52%] bg-[color:var(--accent)]/20" />
          <div className="dense-only detail-block absolute left-[45%] bottom-[9%] z-20 h-px w-[12%] bg-[color:var(--line)]" />

          <div className="detail-block absolute left-[2%] top-[17%] z-20 text-[7px] uppercase leading-5 tracking-[0.3em] text-[color:var(--muted)]/42">
            {sideWords.map((word) => (
              <span key={word}>
                {word}
                <br />
              </span>
            ))}
          </div>

          <div className="detail-block absolute left-[63%] bottom-[4%] z-20 text-[7px] uppercase tracking-[0.28em] text-[color:var(--muted)]/45">
            {config.bottomCode}
          </div>
        </section>
      </div>

      {isEditorOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(42,32,40,.34)] px-3 py-3 backdrop-blur-sm sm:px-4 sm:py-6">
          <div className="max-h-[calc(100dvh-24px)] w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/60 bg-[color:var(--bg-start)]/95 shadow-[0_34px_120px_rgba(42,32,40,.25)] sm:max-h-[90dvh] sm:rounded-[32px]">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-[color:var(--line)] bg-[color:var(--bg-start)]/92 px-4 py-4 backdrop-blur-xl sm:px-6 sm:py-5">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--accent)]">
                  Poster Editor
                </div>
                <h2 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-[color:var(--ink)] sm:text-2xl">
                  自定义图片、文案与色调
                </h2>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={downloadPoster}
                  className="rounded-full bg-[color:var(--ink)] px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5"
                >
                  下载图片
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="rounded-full border border-[color:var(--line)] bg-white/68 px-4 py-2 text-sm font-medium text-[color:var(--ink)] transition hover:bg-white"
                >
                  关闭
                </button>
              </div>
            </div>

            <div className="editor-scroll grid max-h-[calc(100dvh-108px)] gap-0 overflow-y-auto lg:grid-cols-[320px_1fr] sm:max-h-[calc(90dvh-86px)]">
              <aside className="border-b border-[color:var(--line)] p-6 lg:border-b-0 lg:border-r">
                <div className="rounded-[24px] border border-[color:var(--line)] bg-white/58 p-3">
                  <div className="aspect-[4/3] overflow-hidden rounded-[18px] bg-[color:var(--accent-soft)]/30">
                    <img
                      src={imageSrc}
                      alt="当前海报图片预览"
                      className="h-full w-full object-cover"
                      style={{ objectPosition: config.imagePosition }}
                    />
                  </div>
                  <div className="mt-3 text-xs leading-5 text-[color:var(--muted)]">
                    {fileName || "当前使用 public/assets/bitleap-zero-two-reference.jpg"}
                  </div>
                </div>

                <label className="mt-5 block cursor-pointer rounded-2xl border border-dashed border-[color:var(--accent)]/55 bg-white/52 px-4 py-4 text-center text-sm font-medium text-[color:var(--ink)] transition hover:bg-white/80">
                  上传图片
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="sr-only"
                  />
                </label>

                <button
                  type="button"
                  onClick={clearImage}
                  className="mt-3 w-full rounded-2xl border border-[color:var(--line)] bg-white/60 px-4 py-3 text-sm font-medium text-[color:var(--muted)] transition hover:bg-white"
                >
                  恢复默认图片
                </button>

                <TextInput
                  label="图片焦点"
                  value={config.imagePosition}
                  onChange={(value) => setField("imagePosition", value)}
                  placeholder="50% 48%"
                />

                <div className="mt-6">
                  <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                    色调预设
                  </div>
                  <div className="grid gap-2">
                    {TONE_PRESETS.map((tone) => (
                      <button
                        key={tone.id}
                        type="button"
                        onClick={() => applyTone(tone)}
                        className="rounded-2xl border border-[color:var(--line)] bg-white/54 p-3 text-left transition hover:bg-white"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-4 w-4 rounded-full"
                            style={{ background: tone.accent }}
                          />
                          <span className="text-sm font-semibold text-[color:var(--ink)]">{tone.name}</span>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">{tone.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                    色卡选择
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {COLOR_SWATCHES.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => {
                          setField("accent", color)
                          setField("accentSoft", color)
                        }}
                        className="h-9 rounded-xl border border-white/70 shadow-[inset_0_0_0_1px_rgba(0,0,0,.06)] transition hover:scale-105"
                        style={{ background: color }}
                        aria-label={`选择色卡 ${color}`}
                      />
                    ))}
                  </div>
                  <p className="mt-3 text-xs leading-5 text-[color:var(--muted)]">
                    色卡会快速替换强调色；星芒颜色可以在下方单独设置，不需要跟随主强调色。
                  </p>
                </div>
              </aside>

              <div className="space-y-7 p-6">
                <section>
                  <h3 className="mb-4 text-sm font-semibold tracking-[0.08em] text-[color:var(--ink)]">
                    主视觉文字
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextInput label="作品 / 系列" value={config.universe} onChange={(value) => setField("universe", value)} />
                    <TextInput label="主标题" value={config.mainTitle} onChange={(value) => setField("mainTitle", value)} />
                    <TextInput label="大编号 / 大字" value={config.largeCode} onChange={(value) => setField("largeCode", value)} />
                    <TextInput label="编号下方标题" value={config.codeLabel} onChange={(value) => setField("codeLabel", value)} />
                    <TextInput label="本地化名称" value={config.localName} onChange={(value) => setField("localName", value)} />
                    <TextInput label="小编号" value={config.smallNumber} onChange={(value) => setField("smallNumber", value)} />
                    <TextInput label="左上代码" value={config.topCode} onChange={(value) => setField("topCode", value)} />
                    <TextInput label="左上说明" value={config.topMeta} onChange={(value) => setField("topMeta", value)} />
                  </div>
                </section>

                <section>
                  <h3 className="mb-4 text-sm font-semibold tracking-[0.08em] text-[color:var(--ink)]">
                    叙事文案
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextArea label="左下标题，换行显示" value={config.bottomHeading} onChange={(value) => setField("bottomHeading", value)} rows={3} />
                    <TextArea label="侧边关键词，每行一个" value={sideWords.join("\n")} onChange={(value) => setField("sideWords", splitLines(value))} rows={4} />
                    <TextInput label="英文短句 1" value={config.microLineA} onChange={(value) => setField("microLineA", value)} />
                    <TextInput label="英文短句 2" value={config.microLineB} onChange={(value) => setField("microLineB", value)} />
                    <TextInput label="右侧竖排 1" value={config.verticalLineA} onChange={(value) => setField("verticalLineA", value)} />
                    <TextInput label="右侧竖排 2" value={config.verticalLineB} onChange={(value) => setField("verticalLineB", value)} />
                    <TextInput label="右下标题" value={config.quoteTitle} onChange={(value) => setField("quoteTitle", value)} />
                    <TextInput label="右下来源" value={config.quoteSource} onChange={(value) => setField("quoteSource", value)} />
                    <TextInput label="引用句 1" value={config.quoteLineA} onChange={(value) => setField("quoteLineA", value)} />
                    <TextInput label="引用句 2" value={config.quoteLineB} onChange={(value) => setField("quoteLineB", value)} />
                  </div>
                </section>

                <section>
                  <h3 className="mb-4 text-sm font-semibold tracking-[0.08em] text-[color:var(--ink)]">
                    细节标签
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <TextInput label="标记" value={config.mark} onChange={(value) => setField("mark", value)} />
                    <TextInput label="标签 A" value={config.tagA} onChange={(value) => setField("tagA", value)} />
                    <TextInput label="标签 B" value={config.tagB} onChange={(value) => setField("tagB", value)} />
                    <TextInput label="右上说明" value={config.rightMeta} onChange={(value) => setField("rightMeta", value)} />
                    <TextInput label="右上代码" value={config.rightCode} onChange={(value) => setField("rightCode", value)} />
                    <TextInput label="底部代码" value={config.bottomCode} onChange={(value) => setField("bottomCode", value)} />
                  </div>
                </section>

                <section>
                  <h3 className="mb-4 text-sm font-semibold tracking-[0.08em] text-[color:var(--ink)]">
                    自定义颜色
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <ColorInput label="背景起色" value={config.bgStart} onChange={(value) => setField("bgStart", value)} />
                    <ColorInput label="背景中色" value={config.bgMid} onChange={(value) => setField("bgMid", value)} />
                    <ColorInput label="背景尾色" value={config.bgEnd} onChange={(value) => setField("bgEnd", value)} />
                    <ColorInput label="文字主色" value={config.ink} onChange={(value) => setField("ink", value)} />
                    <ColorInput label="辅助文字" value={config.muted} onChange={(value) => setField("muted", value)} />
                    <ColorInput label="强调色" value={config.accent} onChange={(value) => setField("accent", value)} />
                    <ColorInput label="柔和强调" value={config.accentSoft} onChange={(value) => setField("accentSoft", value)} />
                    <ColorInput label="第二强调" value={config.secondary} onChange={(value) => setField("secondary", value)} />
                    <ColorInput label="星芒颜色" value={config.sparkleColor} onChange={(value) => setField("sparkleColor", value)} />
                    <ColorInput label="线条颜色" value={config.line.startsWith("#") ? config.line : config.muted} onChange={(value) => setField("line", value)} />
                  </div>
                </section>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--line)] pt-5">
                  <div className="min-h-5 text-xs text-[color:var(--muted)]">{downloadHint}</div>
                  <div className="flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={resetConfig}
                    className="rounded-full border border-[color:var(--line)] bg-white/58 px-5 py-3 text-sm font-medium text-[color:var(--muted)] transition hover:bg-white"
                  >
                    恢复默认文案
                  </button>
                  <button
                    type="button"
                    onClick={copyConfig}
                    className="rounded-full border border-[color:var(--line)] bg-white/58 px-5 py-3 text-sm font-medium text-[color:var(--ink)] transition hover:bg-white"
                  >
                    复制配置 JSON
                  </button>
                  <button
                    type="button"
                    onClick={downloadPoster}
                    className="rounded-full border border-[color:var(--line)] bg-white/58 px-5 py-3 text-sm font-medium text-[color:var(--ink)] transition hover:bg-white"
                  >
                    下载图片
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditorOpen(false)}
                    className="rounded-full bg-[color:var(--ink)] px-5 py-3 text-sm font-semibold tracking-[0.08em] text-white transition hover:-translate-y-0.5"
                  >
                    应用到画面
                  </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
