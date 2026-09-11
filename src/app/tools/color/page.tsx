"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type ColorValue = {
  r: number
  g: number
  b: number
  a: number
}

type CopyKey = "hex" | "hexa" | "rgb" | "hsl" | "hsv" | "cmyk" | "css" | "tailwind" | "report" | string | null
type HarmonyMode = "complementary" | "analogous" | "triadic" | "split" | "mono"
type PreviewMode = "card" | "text" | "ui"
type ChannelMode = "rgb" | "hsl" | "hsv"

type ParsedColor = {
  color: ColorValue
  ok: boolean
  message: string
}

type Preset = {
  name: string
  value: ColorValue
  desc: string
}

const DEFAULT_COLOR: ColorValue = {
  r: 59,
  g: 130,
  b: 246,
  a: 1,
}

const PRESETS: Preset[] = [
  { name: "Bit Blue", value: { r: 59, g: 130, b: 246, a: 1 }, desc: "明亮科技蓝" },
  { name: "Ink", value: { r: 34, g: 35, b: 31, a: 1 }, desc: "正文墨色" },
  { name: "Sage", value: { r: 82, g: 104, b: 93, a: 1 }, desc: "温和灰绿" },
  { name: "Amber", value: { r: 178, g: 141, b: 72, a: 1 }, desc: "暖金点缀" },
  { name: "Rose Clay", value: { r: 150, g: 87, b: 68, a: 1 }, desc: "陶土玫瑰" },
  { name: "Lilac", value: { r: 154, g: 128, b: 255, a: 1 }, desc: "柔和紫调" },
]

const SAMPLE_GRADIENTS = [
  ["#22231F", "#52685D"],
  ["#3B82F6", "#9A80FF"],
  ["#B28D48", "#965744"],
  ["#F4F1E9", "#52685D"],
]

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function round(value: number, digits = 0) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function padHex(value: number) {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0").toUpperCase()
}

function alphaHex(alpha: number) {
  return padHex(clamp(alpha, 0, 1) * 255)
}

function rgbToHex({ r, g, b }: ColorValue) {
  return `#${padHex(r)}${padHex(g)}${padHex(b)}`
}

function colorToHexa(color: ColorValue) {
  return `${rgbToHex(color)}${alphaHex(color.a)}`
}

function colorToRgb(color: ColorValue) {
  return `rgb(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)})`
}

function colorToRgba(color: ColorValue) {
  return `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${round(color.a, 3)})`
}

function rgbToHsl({ r, g, b }: ColorValue) {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0)
        break
      case gn:
        h = (bn - rn) / d + 2
        break
      case bn:
        h = (rn - gn) / d + 4
        break
    }

    h /= 6
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

function hslToRgb(h: number, s: number, l: number, alpha = 1): ColorValue {
  const hn = (((h % 360) + 360) % 360) / 360
  const sn = clamp(s, 0, 100) / 100
  const ln = clamp(l, 0, 100) / 100

  if (sn === 0) {
    const value = Math.round(ln * 255)
    return { r: value, g: value, b: value, a: alpha }
  }

  const hueToRgb = (p: number, q: number, t: number) => {
    let next = t
    if (next < 0) next += 1
    if (next > 1) next -= 1
    if (next < 1 / 6) return p + (q - p) * 6 * next
    if (next < 1 / 2) return q
    if (next < 2 / 3) return p + (q - p) * (2 / 3 - next) * 6
    return p
  }

  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn
  const p = 2 * ln - q

  return {
    r: Math.round(hueToRgb(p, q, hn + 1 / 3) * 255),
    g: Math.round(hueToRgb(p, q, hn) * 255),
    b: Math.round(hueToRgb(p, q, hn - 1 / 3) * 255),
    a: alpha,
  }
}

function rgbToHsv({ r, g, b }: ColorValue) {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  let h = 0

  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h *= 60
    if (h < 0) h += 360
  }

  return {
    h: Math.round(h),
    s: Math.round((max === 0 ? 0 : d / max) * 100),
    v: Math.round(max * 100),
  }
}

function hsvToRgb(h: number, s: number, v: number, alpha = 1): ColorValue {
  const hn = (((h % 360) + 360) % 360) / 60
  const sn = clamp(s, 0, 100) / 100
  const vn = clamp(v, 0, 100) / 100
  const c = vn * sn
  const x = c * (1 - Math.abs((hn % 2) - 1))
  const m = vn - c

  let r = 0
  let g = 0
  let b = 0

  if (hn >= 0 && hn < 1) {
    r = c
    g = x
  } else if (hn >= 1 && hn < 2) {
    r = x
    g = c
  } else if (hn >= 2 && hn < 3) {
    g = c
    b = x
  } else if (hn >= 3 && hn < 4) {
    g = x
    b = c
  } else if (hn >= 4 && hn < 5) {
    r = x
    b = c
  } else {
    r = c
    b = x
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
    a: alpha,
  }
}

function rgbToCmyk({ r, g, b }: ColorValue) {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const k = 1 - Math.max(rn, gn, bn)

  if (k === 1) {
    return { c: 0, m: 0, y: 0, k: 100 }
  }

  return {
    c: Math.round(((1 - rn - k) / (1 - k)) * 100),
    m: Math.round(((1 - gn - k) / (1 - k)) * 100),
    y: Math.round(((1 - bn - k) / (1 - k)) * 100),
    k: Math.round(k * 100),
  }
}

function relativeLuminance({ r, g, b }: ColorValue) {
  const channel = (value: number) => {
    const normalized = value / 255
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
  }

  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrastRatio(a: ColorValue, b: ColorValue) {
  const l1 = relativeLuminance(a)
  const l2 = relativeLuminance(b)
  const light = Math.max(l1, l2)
  const dark = Math.min(l1, l2)

  return (light + 0.05) / (dark + 0.05)
}

function readableTextColor(color: ColorValue) {
  const white = contrastRatio(color, { r: 255, g: 255, b: 255, a: 1 })
  const black = contrastRatio(color, { r: 0, g: 0, b: 0, a: 1 })
  return white >= black ? "#FFFFFF" : "#111111"
}

function colorToCss(color: ColorValue) {
  return color.a >= 0.999 ? rgbToHex(color) : colorToRgba(color)
}

function parseNumbers(value: string) {
  return value
    .split(/[\s,\/]+/)
    .map((item) => item.trim().replace("%", ""))
    .filter(Boolean)
    .map(Number)
}

function parseColor(input: string, fallbackAlpha: number): ParsedColor {
  const value = input.trim()
  if (!value) {
    return {
      ok: false,
      message: "请输入颜色值。",
      color: DEFAULT_COLOR,
    }
  }

  const hex = value.match(/^#?([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/)
  if (hex) {
    const raw = hex[1]
    if (raw.length === 3 || raw.length === 4) {
      const r = Number.parseInt(raw[0] + raw[0], 16)
      const g = Number.parseInt(raw[1] + raw[1], 16)
      const b = Number.parseInt(raw[2] + raw[2], 16)
      const a = raw.length === 4 ? Number.parseInt(raw[3] + raw[3], 16) / 255 : fallbackAlpha
      return { ok: true, message: "", color: { r, g, b, a: round(a, 3) } }
    }

    const r = Number.parseInt(raw.slice(0, 2), 16)
    const g = Number.parseInt(raw.slice(2, 4), 16)
    const b = Number.parseInt(raw.slice(4, 6), 16)
    const a = raw.length === 8 ? Number.parseInt(raw.slice(6, 8), 16) / 255 : fallbackAlpha
    return { ok: true, message: "", color: { r, g, b, a: round(a, 3) } }
  }

  const rgb = value.match(/^rgba?\((.*)\)$/i)
  if (rgb) {
    const parts = parseNumbers(rgb[1])
    if (parts.length >= 3) {
      return {
        ok: true,
        message: "",
        color: {
          r: clamp(Math.round(parts[0]), 0, 255),
          g: clamp(Math.round(parts[1]), 0, 255),
          b: clamp(Math.round(parts[2]), 0, 255),
          a: clamp(parts[3] ?? fallbackAlpha, 0, 1),
        },
      }
    }
  }

  const hsl = value.match(/^hsla?\((.*)\)$/i)
  if (hsl) {
    const parts = parseNumbers(hsl[1])
    if (parts.length >= 3) {
      const alpha = clamp(parts[3] ?? fallbackAlpha, 0, 1)
      return { ok: true, message: "", color: hslToRgb(parts[0], parts[1], parts[2], alpha) }
    }
  }

  return {
    ok: false,
    message: "暂未识别该颜色格式。支持 HEX、RGB(A)、HSL(A)。",
    color: DEFAULT_COLOR,
  }
}

function harmonyColors(color: ColorValue, mode: HarmonyMode) {
  const hsl = rgbToHsl(color)
  const alpha = color.a
  const withHue = (h: number, s = hsl.s, l = hsl.l) => hslToRgb(h, s, l, alpha)

  if (mode === "complementary") return [color, withHue(hsl.h + 180)]
  if (mode === "analogous") return [withHue(hsl.h - 30), color, withHue(hsl.h + 30)]
  if (mode === "triadic") return [color, withHue(hsl.h + 120), withHue(hsl.h + 240)]
  if (mode === "split") return [color, withHue(hsl.h + 150), withHue(hsl.h + 210)]

  return [hslToRgb(hsl.h, hsl.s, clamp(hsl.l - 26, 0, 100), alpha), hslToRgb(hsl.h, hsl.s, clamp(hsl.l - 12, 0, 100), alpha), color, hslToRgb(hsl.h, hsl.s, clamp(hsl.l + 12, 0, 100), alpha), hslToRgb(hsl.h, hsl.s, clamp(hsl.l + 26, 0, 100), alpha)]
}

function generateScale(color: ColorValue) {
  const hsl = rgbToHsl(color)
  const stops = [96, 90, 80, 68, 56, 46, 36, 28, 20, 14]
  return stops.map((lightness, index) => ({
    label: String((index + 1) * 100),
    color: hslToRgb(hsl.h, hsl.s, lightness, color.a),
  }))
}

function copyTextFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 500)
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
        <span className="color-num font-mono font-semibold text-[#52685d]">{Number.isInteger(value) ? value : value.toFixed(2)}{unit}</span>
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

function OutputRow({
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
    <div className="group rounded-[18px] border border-black/[.075] bg-white/24 p-4 transition hover:bg-white/45">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[8px] font-semibold tracking-[.13em] text-black/24">{label}</span>
        <button type="button" onClick={onCopy} className="text-[8px] font-semibold text-black/28 transition hover:text-black">{copied ? "✓ COPIED" : "COPY"}</button>
      </div>
      <code className="block break-all font-mono text-[11px] leading-5 text-black/68">{value}</code>
    </div>
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
      <div className={`color-num mt-3 break-all font-mono text-[13px] font-semibold ${toneClass}`}>{value}</div>
    </div>
  )
}

export default function ColorPage() {
  const [color, setColor] = useState<ColorValue>(DEFAULT_COLOR)
  const [input, setInput] = useState("#3B82F6")
  const [channelMode, setChannelMode] = useState<ChannelMode>("rgb")
  const [harmonyMode, setHarmonyMode] = useState<HarmonyMode>("complementary")
  const [previewMode, setPreviewMode] = useState<PreviewMode>("card")
  const [copied, setCopied] = useState<CopyKey>(null)
  const [error, setError] = useState("")
  const [history, setHistory] = useState<ColorValue[]>([])

  const pageRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const hsl = useMemo(() => rgbToHsl(color), [color])
  const hsv = useMemo(() => rgbToHsv(color), [color])
  const cmyk = useMemo(() => rgbToCmyk(color), [color])
  const hex = useMemo(() => rgbToHex(color), [color])
  const hexa = useMemo(() => colorToHexa(color), [color])
  const rgb = useMemo(() => colorToRgb(color), [color])
  const rgba = useMemo(() => colorToRgba(color), [color])
  const hslText = useMemo(() => `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`, [hsl])
  const hsla = useMemo(() => `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${round(color.a, 3)})`, [color.a, hsl])
  const hsvText = useMemo(() => `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`, [hsv])
  const cmykText = useMemo(() => `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`, [cmyk])
  const cssValue = useMemo(() => colorToCss(color), [color])
  const textColor = useMemo(() => readableTextColor(color), [color])
  const contrastWhite = useMemo(() => contrastRatio(color, { r: 255, g: 255, b: 255, a: 1 }), [color])
  const contrastBlack = useMemo(() => contrastRatio(color, { r: 0, g: 0, b: 0, a: 1 }), [color])
  const scale = useMemo(() => generateScale(color), [color])
  const harmonies = useMemo(() => harmonyColors(color, harmonyMode), [color, harmonyMode])
  const cssVars = useMemo(
    () =>
      [
        ":root {",
        `  --color-brand: ${cssValue};`,
        `  --color-brand-rgb: ${Math.round(color.r)} ${Math.round(color.g)} ${Math.round(color.b)};`,
        `  --color-brand-alpha: ${round(color.a, 3)};`,
        "}",
      ].join("\n"),
    [color, cssValue],
  )
  const tailwind = useMemo(() => `className="bg-[${hexa}] text-[${textColor}]"`, [hexa, textColor])
  const report = useMemo(
    () =>
      [
        "BitLeap Color Studio",
        "",
        `HEX: ${hex}`,
        `HEX Alpha: ${hexa}`,
        `RGB: ${rgb}`,
        `RGBA: ${rgba}`,
        `HSL: ${hslText}`,
        `HSLA: ${hsla}`,
        `HSV: ${hsvText}`,
        `CMYK: ${cmykText}`,
        `Alpha: ${round(color.a, 3)}`,
        `Readable text: ${textColor}`,
        `Contrast with white: ${contrastWhite.toFixed(2)}:1`,
        `Contrast with black: ${contrastBlack.toFixed(2)}:1`,
        "",
        cssVars,
        "",
        tailwind,
      ].join("\n"),
    [cmykText, color.a, contrastBlack, contrastWhite, cssVars, hex, hexa, hslText, hsla, hsvText, rgb, rgba, tailwind, textColor],
  )

  useEffect(() => {
    if (!pageRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      gsap.from(".color-intro", {
        opacity: 0,
        y: 18,
        duration: 0.72,
        stagger: 0.055,
        ease: "power3.out",
      })

      gsap.to(".color-orbit", {
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
      { opacity: 0.78, scale: 0.995 },
      {
        opacity: 1,
        scale: 1,
        duration: 0.22,
        ease: "power2.out",
        overwrite: true,
      },
    )
  }, [color, previewMode])

  const updateColor = (next: ColorValue, nextInput = rgbToHex(next)) => {
    const normalized = {
      r: clamp(Math.round(next.r), 0, 255),
      g: clamp(Math.round(next.g), 0, 255),
      b: clamp(Math.round(next.b), 0, 255),
      a: clamp(next.a, 0, 1),
    }

    setColor(normalized)
    setInput(nextInput)
    setError("")
  }

  const commitHistory = (value: ColorValue) => {
    setHistory((current) => {
      const next = [value, ...current.filter((item) => colorToHexa(item) !== colorToHexa(value))]
      return next.slice(0, 12)
    })
  }

  const parseInput = () => {
    const parsed = parseColor(input, color.a)
    if (!parsed.ok) {
      setError(parsed.message)
      return
    }

    updateColor(parsed.color, input.trim())
    commitHistory(parsed.color)
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

  const reset = () => {
    updateColor(DEFAULT_COLOR, "#3B82F6")
    setChannelMode("rgb")
    setHarmonyMode("complementary")
    setPreviewMode("card")
    setCopied(null)
    setError("")
  }

  const patchRgb = (key: "r" | "g" | "b", value: number) => {
    updateColor({
      ...color,
      [key]: value,
    })
  }

  const patchAlpha = (value: number) => {
    updateColor(
      {
        ...color,
        a: value,
      },
      input,
    )
  }

  const patchHsl = (key: "h" | "s" | "l", value: number) => {
    const next = {
      ...hsl,
      [key]: value,
    }
    updateColor(hslToRgb(next.h, next.s, next.l, color.a))
  }

  const patchHsv = (key: "h" | "s" | "v", value: number) => {
    const next = {
      ...hsv,
      [key]: value,
    }
    updateColor(hsvToRgb(next.h, next.s, next.v, color.a))
  }

  return (
    <div ref={pageRef} className="min-h-screen overflow-hidden bg-[#f0eee8] text-[#22231f] selection:bg-[#22231f] selection:text-white">
      <style>{`
        .color-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
        .color-scroll::-webkit-scrollbar-track { background: transparent; }
        .color-scroll::-webkit-scrollbar-thumb { background: rgba(34,35,31,.13); border-radius: 999px; }
        .color-dark-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.13); }
        .color-num { font-variant-numeric: tabular-nums lining-nums; }
        .color-checker {
          background-color: #f4f1e9;
          background-image:
            linear-gradient(45deg, rgba(0,0,0,.08) 25%, transparent 25%),
            linear-gradient(-45deg, rgba(0,0,0,.08) 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, rgba(0,0,0,.08) 75%),
            linear-gradient(-45deg, transparent 75%, rgba(0,0,0,.08) 75%);
          background-size: 18px 18px;
          background-position: 0 0, 0 9px, 9px -9px, -9px 0px;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(178,141,72,.08),transparent_25%),radial-gradient(circle_at_7%_91%,rgba(82,104,93,.08),transparent_29%)]" />
        <div className="color-orbit absolute right-[-18vw] top-[-22vw] h-[56vw] w-[56vw] rounded-full border border-black/[.035]">
          <span className="absolute left-[18%] top-[44%] h-2 w-2 rounded-full" style={{ backgroundColor: cssValue }} />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1600px] px-5 pb-10 pt-6 sm:px-8">
        <div className="color-intro">
          <Breadcrumb />
        </div>

        <header className="color-intro mt-8 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.75fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/25">COLOR STUDIO</div>
            <h1 className="mt-4 text-[clamp(48px,6.2vw,88px)] font-semibold leading-[1.02] tracking-[-.055em]">
              颜色转换，
              <br />
              顺手做成色板。
            </h1>
          </div>

          <div>
            <p className="max-w-[560px] text-[11px] leading-6 text-black/40">
              HEX、RGB、HSL、HSV、CMYK 与 Alpha 实时互转，同时生成 CSS 变量、Tailwind arbitrary value、色阶、配色关系和对比度参考。
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button key={preset.name} type="button" onClick={() => { updateColor(preset.value, rgbToHex(preset.value)); commitHistory(color) }} className="rounded-full border border-black/[.08] px-3.5 py-2 text-[8px] font-semibold text-black/34 transition hover:bg-white/50 hover:text-black">{preset.name}</button>
              ))}
            </div>
          </div>
        </header>

        <section className="color-intro mt-7 grid gap-7 xl:grid-cols-[.68fr_1.32fr]">
          <aside className="min-w-0 space-y-4">
            <div className="overflow-hidden rounded-[28px] border border-black/[.075] bg-white/24">
              <div className="color-checker h-56">
                <div className="h-full w-full" style={{ backgroundColor: rgbToHex(color), opacity: color.a }} />
              </div>

              <div className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input type="color" value={hex} onChange={(event) => updateColor({ ...color, ...parseColor(event.target.value, color.a).color }, event.target.value)} className="h-12 w-16 shrink-0 cursor-pointer rounded-[16px] border border-black/[.08] bg-transparent p-1" />
                  <div className="min-w-0 flex-1">
                    <div className="flex gap-2">
                      <input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") parseInput() }} spellCheck={false} className="min-w-0 flex-1 rounded-full border border-black/[.08] bg-white/40 px-4 py-3 font-mono text-[10px] outline-none" placeholder="#3B82F6 / rgba(...) / hsl(...)" />
                      <button type="button" onClick={parseInput} className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white">解析</button>
                    </div>
                    {error && <p className="mt-2 text-[8px] leading-4 text-[#965744]">{error}</p>}
                  </div>
                </div>

                <div className="mt-5">
                  <Slider label="Alpha" value={color.a} min={0} max={1} step={0.01} unit="" onChange={patchAlpha} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[20px] border border-black/[.075] bg-black/[.06]">
              <StatBox label="HEX" value={hex} tone="green" />
              <StatBox label="ALPHA" value={`${Math.round(color.a * 100)}%`} />
              <StatBox label="TEXT" value={textColor} tone="gold" />
              <StatBox label="WHITE / BLACK" value={`${contrastWhite.toFixed(2)} / ${contrastBlack.toFixed(2)}`} />
            </div>

            <div className="rounded-[24px] border border-black/[.075] bg-white/24 p-5">
              <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">HISTORY</div>
              <div className="mt-4 grid grid-cols-6 gap-2">
                {[color, ...history].slice(0, 12).map((item, index) => (
                  <button key={`${colorToHexa(item)}-${index}`} type="button" onClick={() => updateColor(item, colorToHexa(item))} className="color-checker h-10 rounded-[14px] border border-black/[.08]">
                    <span className="block h-full w-full rounded-[13px]" style={{ backgroundColor: rgbToHex(item), opacity: item.a }} />
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="grid gap-px overflow-hidden rounded-[32px] border border-black/[.08] bg-black/[.08] lg:grid-cols-[.92fr_1.08fr]">
              <div className="bg-[#f4f1e9]">
                <div className="flex h-12 items-center justify-between border-b border-black/[.065] px-5">
                  <span className="text-[8px] font-semibold tracking-[.13em] text-black/26">CHANNEL CONTROLS</span>
                  <span className="text-[8px] text-black/22">{channelMode.toUpperCase()}</span>
                </div>

                <div className="color-scroll h-[750px] overflow-auto p-5 sm:p-6">
                  <div className="space-y-6">
                    <div className="flex flex-wrap gap-2">
                      <TogglePill active={channelMode === "rgb"} label="RGB" onClick={() => setChannelMode("rgb")} />
                      <TogglePill active={channelMode === "hsl"} label="HSL" onClick={() => setChannelMode("hsl")} />
                      <TogglePill active={channelMode === "hsv"} label="HSV" onClick={() => setChannelMode("hsv")} />
                    </div>

                    {channelMode === "rgb" && (
                      <div className="grid gap-5">
                        <Slider label="Red" value={color.r} min={0} max={255} unit="" onChange={(value) => patchRgb("r", value)} />
                        <Slider label="Green" value={color.g} min={0} max={255} unit="" onChange={(value) => patchRgb("g", value)} />
                        <Slider label="Blue" value={color.b} min={0} max={255} unit="" onChange={(value) => patchRgb("b", value)} />
                      </div>
                    )}

                    {channelMode === "hsl" && (
                      <div className="grid gap-5">
                        <Slider label="Hue" value={hsl.h} min={0} max={360} unit="°" onChange={(value) => patchHsl("h", value)} />
                        <Slider label="Saturation" value={hsl.s} min={0} max={100} unit="%" onChange={(value) => patchHsl("s", value)} />
                        <Slider label="Lightness" value={hsl.l} min={0} max={100} unit="%" onChange={(value) => patchHsl("l", value)} />
                      </div>
                    )}

                    {channelMode === "hsv" && (
                      <div className="grid gap-5">
                        <Slider label="Hue" value={hsv.h} min={0} max={360} unit="°" onChange={(value) => patchHsv("h", value)} />
                        <Slider label="Saturation" value={hsv.s} min={0} max={100} unit="%" onChange={(value) => patchHsv("s", value)} />
                        <Slider label="Value" value={hsv.v} min={0} max={100} unit="%" onChange={(value) => patchHsv("v", value)} />
                      </div>
                    )}

                    <div className="rounded-[22px] border border-black/[.075] bg-white/24 p-5">
                      <div className="mb-4 text-[8px] font-semibold tracking-[.12em] text-black/24">HARMONY</div>
                      <div className="flex flex-wrap gap-2">
                        {([
                          ["complementary", "互补"],
                          ["analogous", "邻近"],
                          ["triadic", "三分"],
                          ["split", "分裂互补"],
                          ["mono", "单色阶"],
                        ] as Array<[HarmonyMode, string]>).map(([mode, label]) => (
                          <TogglePill key={mode} active={harmonyMode === mode} label={label} onClick={() => setHarmonyMode(mode)} />
                        ))}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {harmonies.map((item, index) => (
                          <button key={`${colorToHexa(item)}-${index}`} type="button" onClick={() => updateColor(item, colorToHexa(item))} className="overflow-hidden rounded-[16px] border border-black/[.08] bg-white/28 text-left">
                            <div className="h-16" style={{ backgroundColor: rgbToHex(item), opacity: item.a }} />
                            <div className="p-3 font-mono text-[8px] text-black/46">{colorToHexa(item)}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-black/[.075] bg-white/24 p-5">
                      <div className="mb-4 text-[8px] font-semibold tracking-[.12em] text-black/24">SCALE</div>
                      <div className="grid grid-cols-2 gap-2">
                        {scale.map((item) => (
                          <button key={item.label} type="button" onClick={() => updateColor(item.color, colorToHexa(item.color))} className="flex items-center overflow-hidden rounded-[14px] border border-black/[.08] bg-white/28 text-left">
                            <span className="h-10 w-12 shrink-0" style={{ backgroundColor: rgbToHex(item.color), opacity: item.color.a }} />
                            <span className="px-3 font-mono text-[8px] text-black/42">{item.label} · {rgbToHex(item.color)}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={reset} className="rounded-full px-4 py-3 text-[9px] font-semibold text-[#965744] transition hover:bg-[#965744]/8">重置</button>
                      <button type="button" onClick={() => copyTextFile(report, "bitleap-color-report.txt")} className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 transition hover:bg-white/40">导出报告</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#151714]">
                <div className="flex h-12 items-center justify-between border-b border-white/[.065] px-5">
                  <span className="text-[8px] font-semibold tracking-[.13em] text-white/27">PREVIEW & OUTPUT</span>
                  <span className="text-[8px] text-[#8fb69b]">{hexa}</span>
                </div>

                <div className="p-4 sm:p-5">
                  <div ref={previewRef} className="overflow-hidden rounded-[26px] border border-white/[.065]">
                    {previewMode === "card" && (
                      <div className="color-checker h-[330px]">
                        <div className="grid h-full place-items-center p-8" style={{ backgroundColor: rgbToHex(color), opacity: color.a }}>
                          <div className="max-w-[320px] text-center" style={{ color: textColor }}>
                            <div className="font-mono text-[11px] font-semibold">{hexa}</div>
                            <div className="mt-4 text-[42px] font-semibold leading-none tracking-[-.055em]">Color</div>
                            <p className="mt-4 text-[10px] leading-5 opacity-70">Preview card with automatic readable text color.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {previewMode === "text" && (
                      <div className="bg-[#f4f1e9] p-8">
                        <h3 className="text-[42px] font-semibold leading-none tracking-[-.055em]" style={{ color: cssValue }}>标题颜色预览</h3>
                        <p className="mt-5 max-w-[460px] text-[13px] leading-7 text-white/70" style={{ color: cssValue }}>这是一段用于查看文字颜色、透明度和视觉重量的示例文本。Alpha 越低，文字越需要更稳定的背景。</p>
                      </div>
                    )}

                    {previewMode === "ui" && (
                      <div className="bg-[#f4f1e9] p-8">
                        <div className="rounded-[26px] border border-black/[.08] bg-white/65 p-6 shadow-2xl shadow-black/5">
                          <div className="h-2 w-24 rounded-full" style={{ backgroundColor: cssValue }} />
                          <h3 className="mt-5 text-[30px] font-semibold leading-none tracking-[-.05em] text-black/75">Interface Accent</h3>
                          <p className="mt-3 text-[10px] leading-5 text-black/35">按钮、标签、图标和高亮色预览。</p>
                          <button type="button" className="mt-5 rounded-full px-5 py-3 text-[9px] font-semibold" style={{ backgroundColor: cssValue, color: textColor }}>Primary action</button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <TogglePill active={previewMode === "card"} label="色卡" onClick={() => setPreviewMode("card")} />
                    <TogglePill active={previewMode === "text"} label="文字" onClick={() => setPreviewMode("text")} />
                    <TogglePill active={previewMode === "ui"} label="界面" onClick={() => setPreviewMode("ui")} />
                  </div>

                  <div className="mt-4 grid gap-3">
                    {[
                      { label: "HEX", value: hex, key: "hex" as CopyKey },
                      { label: "HEX Alpha", value: hexa, key: "hexa" as CopyKey },
                      { label: "RGB / RGBA", value: color.a >= 0.999 ? rgb : rgba, key: "rgb" as CopyKey },
                      { label: "HSL / HSLA", value: color.a >= 0.999 ? hslText : hsla, key: "hsl" as CopyKey },
                      { label: "HSV", value: hsvText, key: "hsv" as CopyKey },
                      { label: "CMYK", value: cmykText, key: "cmyk" as CopyKey },
                    ].map((item) => (
                      <div key={item.label} className="rounded-[18px] border border-white/[.065] bg-white/[.035] p-4">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-[8px] font-semibold tracking-[.12em] text-white/24">{item.label}</span>
                          <button type="button" onClick={() => copy(item.value, item.key)} className="text-[8px] font-semibold text-white/25 transition hover:text-white">{copied === item.key ? "✓ COPIED" : "COPY"}</button>
                        </div>
                        <code className="block break-all font-mono text-[10px] leading-5 text-[#cbd8cd]">{item.value}</code>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-3">
                    <OutputRow label="CSS Variables" value={cssVars} copied={copied === "css"} onCopy={() => copy(cssVars, "css")} />
                    <OutputRow label="Tailwind Arbitrary" value={tailwind} copied={copied === "tailwind"} onCopy={() => copy(tailwind, "tailwind")} />
                    <OutputRow label="Report" value={report} copied={copied === "report"} onCopy={() => copy(report, "report")} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="color-intro mt-12 grid gap-9 border-t border-black/10 pt-8 lg:grid-cols-[.55fr_1.45fr]">
          <div>
            <div className="text-[9px] font-semibold tracking-[.14em] text-black/25">GRADIENT PAIRS</div>
            <h2 className="mt-3 text-[clamp(30px,4vw,46px)] font-semibold leading-[1.06] tracking-[-.045em]">
              颜色不是孤立的。
            </h2>
            <p className="mt-5 max-w-[390px] text-[9px] leading-5 text-black/34">
              下面是当前颜色参与的几组渐变预览，适合快速判断它和深色、浅色、暖色或冷色的搭配关系。
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {SAMPLE_GRADIENTS.map(([from, to], index) => (
              <button key={`${from}-${to}`} type="button" onClick={() => updateColor(parseColor(index % 2 === 0 ? from : to, 1).color, index % 2 === 0 ? from : to)} className="h-44 overflow-hidden rounded-[24px] border border-black/[.08] text-left shadow-xl shadow-black/5" style={{ backgroundColor: from, backgroundImage: `linear-gradient(135deg, ${from}, ${cssValue}, ${to})`, backgroundSize: "auto", backgroundPosition: "center" }}>
                <div className="flex h-full flex-col justify-between p-5 text-white">
                  <div className="font-mono text-[9px] opacity-55">{from} → {hexa} → {to}</div>
                  <div className="text-[30px] font-semibold tracking-[-.05em]">Gradient {index + 1}</div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="color-intro mt-12 grid gap-8 border-t border-black/10 pt-7 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">FORMAT PARSER</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">输入框支持 #RGB、#RGBA、#RRGGBB、#RRGGBBAA、rgb()、rgba()、hsl() 和 hsla()。</p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">ALPHA SAFE</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">颜色选择器只处理 6 位 HEX，透明度单独管理，避免 input[type=color] 不兼容 8 位 HEX。</p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">LOCAL ONLY</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">所有转换、色阶和报告都在浏览器本地计算，不依赖外部接口。</p>
          </div>
        </section>

        <div className="mt-12 border-t border-black/[.08] pt-5">
          <FooterNote />
        </div>
      </div>
    </div>
  )
}
