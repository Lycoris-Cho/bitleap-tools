"use client"

import type { CSSProperties } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type CopyKey = "css" | "value" | "tailwind" | "vars" | "report" | null
type StageMode = "paper" | "grid" | "dark" | "checker"
type PreviewShape = "card" | "button" | "modal" | "tile"
type ShadowKind = "outer" | "inner" | "glow" | "neumorph"

type ShadowLayer = {
  id: string
  name: string
  x: number
  y: number
  blur: number
  spread: number
  color: string
  opacity: number
  inset: boolean
  enabled: boolean
}

type ShadowPreset = {
  name: string
  desc: string
  kind: ShadowKind
  layers: ShadowLayer[]
  shape?: PreviewShape
  stage?: StageMode
}

const DEFAULT_LAYER: ShadowLayer = {
  id: "layer-soft-1",
  name: "Soft drop",
  x: 0,
  y: 24,
  blur: 56,
  spread: -18,
  color: "#000000",
  opacity: 18,
  inset: false,
  enabled: true,
}

const PRESETS: ShadowPreset[] = [
  {
    name: "Soft Card",
    desc: "轻量产品卡片阴影。",
    kind: "outer",
    shape: "card",
    stage: "paper",
    layers: [
      { id: "soft-1", name: "Ambient", x: 0, y: 24, blur: 64, spread: -24, color: "#000000", opacity: 14, inset: false, enabled: true },
      { id: "soft-2", name: "Contact", x: 0, y: 8, blur: 20, spread: -12, color: "#000000", opacity: 10, inset: false, enabled: true },
    ],
  },
  {
    name: "Floating",
    desc: "更明显的悬浮层级。",
    kind: "outer",
    shape: "modal",
    stage: "paper",
    layers: [
      { id: "floating-1", name: "Depth", x: 0, y: 42, blur: 92, spread: -34, color: "#1f302a", opacity: 22, inset: false, enabled: true },
      { id: "floating-2", name: "Edge", x: 0, y: 16, blur: 34, spread: -18, color: "#000000", opacity: 14, inset: false, enabled: true },
    ],
  },
  {
    name: "Inner Panel",
    desc: "内凹输入框 / 面板效果。",
    kind: "inner",
    shape: "card",
    stage: "paper",
    layers: [
      { id: "inner-1", name: "Inset dark", x: 0, y: 3, blur: 12, spread: 0, color: "#000000", opacity: 18, inset: true, enabled: true },
      { id: "inner-2", name: "Inset light", x: 0, y: -2, blur: 10, spread: 0, color: "#ffffff", opacity: 80, inset: true, enabled: true },
    ],
  },
  {
    name: "Sage Glow",
    desc: "适合 CTA 和高亮按钮。",
    kind: "glow",
    shape: "button",
    stage: "dark",
    layers: [
      { id: "glow-1", name: "Glow", x: 0, y: 0, blur: 48, spread: 0, color: "#6FA27E", opacity: 45, inset: false, enabled: true },
      { id: "glow-2", name: "Lift", x: 0, y: 18, blur: 36, spread: -20, color: "#000000", opacity: 38, inset: false, enabled: true },
    ],
  },
  {
    name: "Neumorph",
    desc: "双向浅浮雕阴影。",
    kind: "neumorph",
    shape: "tile",
    stage: "paper",
    layers: [
      { id: "neo-1", name: "Dark edge", x: 14, y: 14, blur: 30, spread: 0, color: "#b7b1a5", opacity: 62, inset: false, enabled: true },
      { id: "neo-2", name: "Light edge", x: -14, y: -14, blur: 30, spread: 0, color: "#ffffff", opacity: 90, inset: false, enabled: true },
    ],
  },
  {
    name: "Sharp Editorial",
    desc: "更硬朗的视觉标记。",
    kind: "outer",
    shape: "tile",
    stage: "grid",
    layers: [
      { id: "sharp-1", name: "Hard shadow", x: 14, y: 14, blur: 0, spread: 0, color: "#22231F", opacity: 100, inset: false, enabled: true },
    ],
  },
]

function safeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value)
}

function normalizeHex(value: string) {
  const raw = value.trim()
  const hex = raw.startsWith("#") ? raw.slice(1) : raw

  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    return `#${hex.split("").map((char) => char + char).join("").toUpperCase()}`
  }

  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    return `#${hex.toUpperCase()}`
  }

  return "#000000"
}

function hexToRgb(value: string) {
  const hex = normalizeHex(value).slice(1)
  const n = Number.parseInt(hex, 16)

  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  }
}

function rgbaFromLayer(layer: ShadowLayer) {
  const { r, g, b } = hexToRgb(layer.color)
  return `rgba(${r}, ${g}, ${b}, ${(layer.opacity / 100).toFixed(2).replace(/0$/, "").replace(/\.0$/, "")})`
}

function layerToCss(layer: ShadowLayer) {
  return `${layer.inset ? "inset " : ""}${layer.x}px ${layer.y}px ${layer.blur}px ${layer.spread}px ${rgbaFromLayer(layer)}`
}

function shadowValue(layers: ShadowLayer[]) {
  const enabled = layers.filter((layer) => layer.enabled)
  if (!enabled.length) return "none"
  return enabled.map(layerToCss).join(",\n  ")
}

function cssBlock(layers: ShadowLayer[], radius: number) {
  return [
    ".shadow-card {",
    `  border-radius: ${radius}px;`,
    `  box-shadow: ${shadowValue(layers)};`,
    "}",
  ].join("\n")
}

function cssVars(layers: ShadowLayer[], radius: number) {
  return [
    ":root {",
    `  --shadow-card-radius: ${radius}px;`,
    `  --shadow-card: ${shadowValue(layers).replace(/\n\s*/g, " ")};`,
    "}",
    "",
    ".card {",
    "  border-radius: var(--shadow-card-radius);",
    "  box-shadow: var(--shadow-card);",
    "}",
  ].join("\n")
}

function tailwindShadow(layers: ShadowLayer[]) {
  const value = shadowValue(layers)
  if (value === "none") return `className="shadow-none"`
  return `className="shadow-[${value.replace(/\s+/g, "_")}]"` 
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

function stageStyle(mode: StageMode): CSSProperties {
  if (mode === "dark") {
    return {
      backgroundColor: "#111310",
      backgroundImage: "radial-gradient(circle at 50% 44%, rgba(111,142,123,.20), transparent 32%)",
      backgroundSize: "auto",
      backgroundPosition: "center",
    }
  }

  if (mode === "grid") {
    return {
      backgroundColor: "#ebe7dd",
      backgroundImage: "linear-gradient(rgba(34,35,31,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(34,35,31,.06) 1px, transparent 1px)",
      backgroundSize: "28px 28px",
      backgroundPosition: "center",
    }
  }

  if (mode === "checker") {
    return {
      backgroundColor: "#f4f1e9",
      backgroundImage: "linear-gradient(45deg, rgba(0,0,0,.07) 25%, transparent 25%), linear-gradient(-45deg, rgba(0,0,0,.07) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(0,0,0,.07) 75%), linear-gradient(-45deg, transparent 75%, rgba(0,0,0,.07) 75%)",
      backgroundSize: "18px 18px",
      backgroundPosition: "0 0, 0 9px, 9px -9px, -9px 0",
    }
  }

  return {
    backgroundColor: "#ebe7dd",
    backgroundImage: "radial-gradient(circle at 50% 35%, rgba(255,255,255,.68), transparent 36%)",
    backgroundSize: "auto",
    backgroundPosition: "center",
  }
}

function shapeStyle(shape: PreviewShape, radius: number): CSSProperties {
  if (shape === "button") {
    return {
      width: 220,
      height: 74,
      borderRadius: 999,
    }
  }

  if (shape === "modal") {
    return {
      width: 310,
      height: 220,
      borderRadius: radius,
    }
  }

  if (shape === "tile") {
    return {
      width: 180,
      height: 180,
      borderRadius: radius,
    }
  }

  return {
    width: 260,
    height: 170,
    borderRadius: radius,
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
    <div className="border-b border-black/[.07] py-4 last:border-b-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[9px] font-semibold text-black/52">{label}</span>
        <span className="shadow-num font-mono text-[10px] font-semibold text-[#52685d]">{value}{unit}</span>
      </div>
      <div className="flex items-center gap-3">
        <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="min-w-0 flex-1 accent-[#52685d]" />
        <input type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(clamp(Number(event.target.value) || 0, min, max))} className="w-20 border-b border-black/15 bg-transparent px-1 py-1.5 text-right font-mono text-[9px] outline-none focus:border-black/50" />
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
      <pre className="shadow-dark-scroll max-h-44 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-5 text-[#cbd8cd]">{value}</pre>
    </article>
  )
}

function LayerMini({
  layer,
  active,
  onClick,
  onToggle,
  onRemove,
}: {
  layer: ShadowLayer
  active: boolean
  onClick: () => void
  onToggle: () => void
  onRemove: () => void
}) {
  return (
    <article className={`rounded-[20px] border p-4 transition ${active ? "border-[#22231f]/15 bg-[#22231f] text-white" : "border-black/[.08] bg-white/24 hover:bg-white/50"}`}>
      <button type="button" onClick={onClick} className="block w-full text-left">
        <div className={`text-[8px] font-semibold tracking-[.13em] ${active ? "text-white/30" : "text-black/24"}`}>{layer.inset ? "INSET" : "OUTER"} · {layer.enabled ? "ON" : "OFF"}</div>
        <div className={`mt-2 text-[13px] font-semibold tracking-[-.03em] ${active ? "text-white" : "text-black/68"}`}>{layer.name}</div>
        <div className={`shadow-num mt-2 font-mono text-[8px] ${active ? "text-white/35" : "text-black/28"}`}>{layer.x}px {layer.y}px {layer.blur}px {layer.spread}px</div>
      </button>

      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onToggle} className={`rounded-full px-3 py-1.5 text-[8px] font-semibold transition ${active ? "bg-white/10 text-white/50 hover:text-white" : "bg-black/[.04] text-black/28 hover:text-black"}`}>{layer.enabled ? "禁用" : "启用"}</button>
        <button type="button" onClick={onRemove} className={`rounded-full px-3 py-1.5 text-[8px] font-semibold transition ${active ? "bg-white/10 text-[#ffb2a4]" : "bg-[#965744]/8 text-[#965744]"}`}>删除</button>
      </div>
    </article>
  )
}

export default function BoxShadowPage() {
  const [layers, setLayers] = useState<ShadowLayer[]>(PRESETS[0].layers)
  const [activeLayerId, setActiveLayerId] = useState(PRESETS[0].layers[0].id)
  const [stageMode, setStageMode] = useState<StageMode>("paper")
  const [shape, setShape] = useState<PreviewShape>("card")
  const [radius, setRadius] = useState(28)
  const [surfaceColor, setSurfaceColor] = useState("#FFFFFF")
  const [copied, setCopied] = useState<CopyKey>(null)

  const pageRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const activeLayer = useMemo(() => layers.find((layer) => layer.id === activeLayerId) ?? layers[0], [activeLayerId, layers])
  const shadow = useMemo(() => shadowValue(layers), [layers])
  const css = useMemo(() => cssBlock(layers, radius), [layers, radius])
  const vars = useMemo(() => cssVars(layers, radius), [layers, radius])
  const tailwind = useMemo(() => tailwindShadow(layers), [layers])
  const enabledCount = useMemo(() => layers.filter((layer) => layer.enabled).length, [layers])
  const report = useMemo(
    () =>
      [
        "BitLeap Box Shadow Studio",
        "",
        `Layers: ${layers.length}`,
        `Enabled: ${enabledCount}`,
        `Shape: ${shape}`,
        `Stage: ${stageMode}`,
        `Radius: ${radius}px`,
        `Surface: ${surfaceColor}`,
        "",
        "box-shadow:",
        shadow,
        "",
        "CSS:",
        css,
        "",
        "Tailwind:",
        tailwind,
      ].join("\n"),
    [css, enabledCount, layers.length, radius, shadow, shape, stageMode, surfaceColor, tailwind],
  )

  useEffect(() => {
    if (!pageRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      gsap.from(".shadow-intro", {
        opacity: 0,
        y: 18,
        duration: 0.72,
        stagger: 0.055,
        ease: "power3.out",
      })

      gsap.to(".shadow-orbit", {
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
        duration: 0.2,
        ease: "power2.out",
        overwrite: true,
      },
    )
  }, [shadow, shape, radius, stageMode, surfaceColor])

  const updateLayer = (id: string, patch: Partial<ShadowLayer>) => {
    setLayers((current) =>
      current.map((layer) =>
        layer.id === id
          ? {
              ...layer,
              ...patch,
            }
          : layer,
      ),
    )
  }

  const addLayer = () => {
    const layer: ShadowLayer = {
      ...DEFAULT_LAYER,
      id: safeId(),
      name: `Layer ${layers.length + 1}`,
      y: 18,
      blur: 36,
      spread: -12,
      opacity: 16,
    }

    setLayers((current) => [...current, layer])
    setActiveLayerId(layer.id)
  }

  const duplicateLayer = () => {
    if (!activeLayer) return

    const layer = {
      ...activeLayer,
      id: safeId(),
      name: `${activeLayer.name} Copy`,
    }

    setLayers((current) => [...current, layer])
    setActiveLayerId(layer.id)
  }

  const removeLayer = (id: string) => {
    setLayers((current) => {
      if (current.length <= 1) return current
      const next = current.filter((layer) => layer.id !== id)
      if (!next.find((layer) => layer.id === activeLayerId)) setActiveLayerId(next[0].id)
      return next
    })
  }

  const moveLayer = (direction: -1 | 1) => {
    if (!activeLayer) return

    setLayers((current) => {
      const index = current.findIndex((layer) => layer.id === activeLayer.id)
      const nextIndex = index + direction
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current

      const next = [...current]
      const [item] = next.splice(index, 1)
      next.splice(nextIndex, 0, item)
      return next
    })
  }

  const applyPreset = (preset: ShadowPreset) => {
    const nextLayers = preset.layers.map((layer) => ({ ...layer, id: `${preset.name}-${layer.id}` }))
    setLayers(nextLayers)
    setActiveLayerId(nextLayers[0].id)
    setShape(preset.shape ?? "card")
    setStageMode(preset.stage ?? "paper")
    setRadius(preset.shape === "button" ? 999 : preset.shape === "tile" ? 34 : 28)
    setSurfaceColor(preset.kind === "neumorph" ? "#F0EEE8" : "#FFFFFF")
  }

  const reset = () => {
    const nextLayers = PRESETS[0].layers.map((layer) => ({ ...layer }))
    setLayers(nextLayers)
    setActiveLayerId(nextLayers[0].id)
    setStageMode("paper")
    setShape("card")
    setRadius(28)
    setSurfaceColor("#FFFFFF")
    setCopied(null)
  }

  const copy = async (value: string, key: CopyKey) => {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {}
  }

  return (
    <div ref={pageRef} className="min-h-screen overflow-hidden bg-[#f0eee8] text-[#22231f] selection:bg-[#22231f] selection:text-white">
      <style>{`
        .shadow-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
        .shadow-scroll::-webkit-scrollbar-track { background: transparent; }
        .shadow-scroll::-webkit-scrollbar-thumb { background: rgba(34,35,31,.13); border-radius: 999px; }
        .shadow-dark-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.13); }
        .shadow-num { font-variant-numeric: tabular-nums lining-nums; }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_84%_10%,rgba(178,141,72,.08),transparent_25%),radial-gradient(circle_at_8%_88%,rgba(82,104,93,.08),transparent_29%)]" />
        <div className="shadow-orbit absolute right-[-18vw] top-[-22vw] h-[56vw] w-[56vw] rounded-full border border-black/[.035]">
          <span className="absolute left-[18%] top-[44%] h-2 w-2 rounded-full bg-[#52685d]/30" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1660px] px-5 pb-10 pt-6 sm:px-8">
        <div className="shadow-intro">
          <Breadcrumb />
        </div>

        <header className="shadow-intro mt-8 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.76fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/25">BOX SHADOW STUDIO</div>
            <h1 className="mt-4 text-[clamp(48px,6.2vw,88px)] font-semibold leading-[1.02] tracking-[-.055em]">
              阴影不是一层，
              <br />
              是空间感。
            </h1>
          </div>

          <div>
            <p className="max-w-[580px] text-[11px] leading-6 text-black/40">
              从单层 box-shadow 升级到多层阴影编辑器。可以叠加柔和投影、接触阴影、内阴影和光晕，并输出 CSS、变量和 Tailwind arbitrary value。
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button key={preset.name} type="button" onClick={() => applyPreset(preset)} className="rounded-full border border-black/[.08] px-3.5 py-2 text-[8px] font-semibold text-black/34 transition hover:bg-white/50 hover:text-black">{preset.name}</button>
              ))}
            </div>
          </div>
        </header>

        <section className="shadow-intro mt-7 grid gap-5 xl:grid-cols-[320px_1fr_360px]">
          <aside className="min-w-0 space-y-4">
            <div className="rounded-[30px] border border-black/[.075] bg-white/24 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[8px] font-semibold tracking-[.14em] text-black/24">LAYERS</div>
                  <p className="mt-2 text-[8px] leading-4 text-black/30">{formatNumber(enabledCount)} / {formatNumber(layers.length)} 层启用</p>
                </div>
                <button type="button" onClick={addLayer} className="rounded-full bg-[#22231f] px-4 py-3 text-[9px] font-semibold text-white">添加</button>
              </div>

              <div className="shadow-scroll mt-5 max-h-[560px] space-y-3 overflow-auto pr-1">
                {layers.map((layer) => (
                  <LayerMini key={layer.id} layer={layer} active={activeLayer?.id === layer.id} onClick={() => setActiveLayerId(layer.id)} onToggle={() => updateLayer(layer.id, { enabled: !layer.enabled })} onRemove={() => removeLayer(layer.id)} />
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => moveLayer(-1)} className="rounded-full border border-black/[.08] px-3.5 py-2 text-[8px] font-semibold text-black/34 transition hover:bg-white/50">上移</button>
                <button type="button" onClick={() => moveLayer(1)} className="rounded-full border border-black/[.08] px-3.5 py-2 text-[8px] font-semibold text-black/34 transition hover:bg-white/50">下移</button>
                <button type="button" onClick={duplicateLayer} className="rounded-full border border-black/[.08] px-3.5 py-2 text-[8px] font-semibold text-black/34 transition hover:bg-white/50">复制层</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[22px] border border-black/[.075] bg-black/[.06]">
              <div className="bg-[#f3f0e8]/92 p-4">
                <div className="text-[7px] font-semibold tracking-[.12em] text-black/23">LAYERS</div>
                <div className="shadow-num mt-3 font-mono text-[13px] font-semibold text-[#52685d]">{layers.length}</div>
              </div>
              <div className="bg-[#f3f0e8]/92 p-4">
                <div className="text-[7px] font-semibold tracking-[.12em] text-black/23">ENABLED</div>
                <div className="shadow-num mt-3 font-mono text-[13px] font-semibold text-[#9b7542]">{enabledCount}</div>
              </div>
              <div className="bg-[#f3f0e8]/92 p-4">
                <div className="text-[7px] font-semibold tracking-[.12em] text-black/23">SHAPE</div>
                <div className="mt-3 font-mono text-[13px] font-semibold text-black/61">{shape}</div>
              </div>
              <div className="bg-[#f3f0e8]/92 p-4">
                <div className="text-[7px] font-semibold tracking-[.12em] text-black/23">RADIUS</div>
                <div className="shadow-num mt-3 font-mono text-[13px] font-semibold text-black/61">{radius}px</div>
              </div>
            </div>
          </aside>

          <main className="min-w-0">
            <div className="overflow-hidden rounded-[32px] border border-black/[.08] bg-[#151714]">
              <div className="flex flex-col gap-3 border-b border-white/[.065] px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-[8px] font-semibold tracking-[.13em] text-white/24">LIVE SHADOW STAGE</div>
                  <p className="mt-2 text-[8px] text-white/28">预览真实 box-shadow 叠加效果。</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(["paper", "grid", "dark", "checker"] as StageMode[]).map((mode) => (
                    <button key={mode} type="button" onClick={() => setStageMode(mode)} className={`rounded-full px-3 py-2 font-mono text-[8px] font-semibold transition ${stageMode === mode ? "bg-white text-[#151714]" : "border border-white/[.08] text-white/28 hover:bg-white/[.06]"}`}>{mode.toUpperCase()}</button>
                  ))}
                </div>
              </div>

              <div className="p-5 sm:p-7">
                <div ref={previewRef} className="grid h-[560px] place-items-center overflow-hidden rounded-[28px] border border-white/[.06] p-8" style={stageStyle(stageMode)}>
                  <div className="relative grid place-items-center" style={{ width: 420, maxWidth: "100%", height: 320 }}>
                    <div className="absolute h-px w-full bg-black/[.07]" />
                    <div className="absolute h-full w-px bg-black/[.07]" />

                    <div
                      className="relative grid place-items-center border border-black/[.055]"
                      style={{
                        ...shapeStyle(shape, radius),
                        backgroundColor: surfaceColor,
                        boxShadow: shadow,
                      }}
                    >
                      {shape === "button" ? (
                        <span className="text-[11px] font-semibold tracking-[-.01em] text-black/62">Primary Action</span>
                      ) : shape === "modal" ? (
                        <div className="w-full px-7 text-left">
                          <div className="h-2 w-20 rounded-full bg-[#52685d]/60" />
                          <div className="mt-6 text-[28px] font-semibold leading-none tracking-[-.05em] text-black/72">Modal</div>
                          <div className="mt-4 h-2 w-32 rounded-full bg-black/10" />
                          <div className="mt-2 h-2 w-44 rounded-full bg-black/10" />
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="font-mono text-[10px] font-semibold text-black/28">BOX SHADOW</div>
                          <div className="mt-3 text-[24px] font-semibold tracking-[-.045em] text-black/70">Layered</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-px overflow-hidden rounded-[22px] border border-white/[.06] bg-white/[.06] md:grid-cols-4">
                  {[
                    ["VALUE", shadow === "none" ? "none" : `${shadow.split(",").length} shadows`],
                    ["X / Y", activeLayer ? `${activeLayer.x}px / ${activeLayer.y}px` : "—"],
                    ["BLUR", activeLayer ? `${activeLayer.blur}px` : "—"],
                    ["OPACITY", activeLayer ? `${activeLayer.opacity}%` : "—"],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-[#151714] p-4">
                      <div className="text-[7px] font-semibold tracking-[.12em] text-white/18">{label}</div>
                      <div className="shadow-num mt-2 font-mono text-[10px] font-semibold text-[#cbd8cd]">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {activeLayer && (
              <div className="mt-5 border-y border-black/[.09] bg-white/18">
                <div className="grid lg:grid-cols-3">
                  <div className="border-b border-black/[.07] p-5 lg:border-b-0 lg:border-r">
                    <div className="mb-2 text-[8px] font-semibold tracking-[.13em] text-black/24">POSITION</div>
                    <Slider label="X 偏移" value={activeLayer.x} min={-160} max={160} unit="px" onChange={(x) => updateLayer(activeLayer.id, { x })} />
                    <Slider label="Y 偏移" value={activeLayer.y} min={-160} max={160} unit="px" onChange={(y) => updateLayer(activeLayer.id, { y })} />
                    <Slider label="扩散" value={activeLayer.spread} min={-120} max={120} unit="px" onChange={(spread) => updateLayer(activeLayer.id, { spread })} />
                  </div>

                  <div className="border-b border-black/[.07] p-5 lg:border-b-0 lg:border-r">
                    <div className="mb-2 text-[8px] font-semibold tracking-[.13em] text-black/24">SOFTNESS</div>
                    <Slider label="模糊" value={activeLayer.blur} min={0} max={240} unit="px" onChange={(blur) => updateLayer(activeLayer.id, { blur })} />
                    <Slider label="不透明度" value={activeLayer.opacity} min={0} max={100} unit="%" onChange={(opacity) => updateLayer(activeLayer.id, { opacity })} />
                    <div className="border-b border-black/[.07] py-4 last:border-b-0">
                      <div className="mb-3 text-[9px] font-semibold text-black/52">颜色</div>
                      <div className="flex items-center gap-3">
                        <input type="color" value={normalizeHex(activeLayer.color)} onChange={(event) => updateLayer(activeLayer.id, { color: event.target.value })} className="h-11 w-12 shrink-0 cursor-pointer rounded-[14px] border border-black/[.08] bg-transparent p-1" />
                        <input value={activeLayer.color} onChange={(event) => updateLayer(activeLayer.id, { color: event.target.value })} className="min-w-0 flex-1 border-b border-black/15 bg-transparent px-1 py-2 font-mono text-[10px] outline-none focus:border-black/50" />
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="mb-4 text-[8px] font-semibold tracking-[.13em] text-black/24">SURFACE</div>
                    <div className="flex flex-wrap gap-2">
                      <TogglePill active={activeLayer.inset} label="Inset 内阴影" onClick={() => updateLayer(activeLayer.id, { inset: !activeLayer.inset })} />
                      <TogglePill active={activeLayer.enabled} label={activeLayer.enabled ? "当前层启用" : "当前层禁用"} onClick={() => updateLayer(activeLayer.id, { enabled: !activeLayer.enabled })} />
                    </div>

                    <div className="mt-5 grid gap-4">
                      <label>
                        <span className="mb-2 block text-[8px] font-semibold tracking-[.12em] text-black/24">Layer name</span>
                        <input value={activeLayer.name} onChange={(event) => updateLayer(activeLayer.id, { name: event.target.value })} className="w-full rounded-full border border-black/[.08] bg-white/35 px-4 py-3 text-[10px] outline-none" />
                      </label>

                      <label>
                        <span className="mb-2 block text-[8px] font-semibold tracking-[.12em] text-black/24">Surface color</span>
                        <input type="color" value={surfaceColor} onChange={(event) => setSurfaceColor(event.target.value)} className="h-12 w-full cursor-pointer rounded-[16px] border border-black/[.08] bg-transparent p-1" />
                      </label>

                      <Slider label="圆角" value={radius} min={0} max={80} unit="px" onChange={setRadius} />

                      <div>
                        <div className="mb-2 text-[8px] font-semibold tracking-[.12em] text-black/24">形状</div>
                        <div className="flex flex-wrap gap-2">
                          {(["card", "button", "modal", "tile"] as PreviewShape[]).map((item) => (
                            <TogglePill key={item} active={shape === item} label={item} onClick={() => setShape(item)} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>

          <aside className="min-w-0">
            <div className="sticky top-6 overflow-hidden rounded-[28px] border border-black/[.08] bg-[#151714]">
              <div className="border-b border-white/[.06] px-5 py-4">
                <div className="text-[8px] font-semibold tracking-[.13em] text-white/22">OUTPUT</div>
              </div>

              <div className="shadow-dark-scroll max-h-[790px] overflow-auto px-5">
                <OutputBlock label="BOX-SHADOW VALUE" value={shadow} copied={copied === "value"} onCopy={() => copy(shadow, "value")} />
                <OutputBlock label="CSS BLOCK" value={css} copied={copied === "css"} onCopy={() => copy(css, "css")} />
                <OutputBlock label="CSS VARIABLES" value={vars} copied={copied === "vars"} onCopy={() => copy(vars, "vars")} />
                <OutputBlock label="TAILWIND" value={tailwind} copied={copied === "tailwind"} onCopy={() => copy(tailwind, "tailwind")} />
              </div>

              <div className="border-t border-white/[.06] p-5">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={reset} className="rounded-full px-4 py-3 text-[9px] font-semibold text-[#d49a88] transition hover:bg-[#d49a88]/8">重置</button>
                  <button type="button" onClick={() => copy(report, "report")} className="rounded-full border border-white/[.08] px-4 py-3 text-[9px] font-semibold text-white/33 transition hover:bg-white hover:text-[#151714]">{copied === "report" ? "✓ 报告" : "复制报告"}</button>
                  <button type="button" onClick={() => downloadText(report, "bitleap-box-shadow-report.txt")} className="rounded-full border border-white/[.08] px-4 py-3 text-[9px] font-semibold text-white/33 transition hover:bg-white hover:text-[#151714]">导出</button>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="shadow-intro mt-12 grid gap-8 border-t border-black/10 pt-7 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">LAYERED SHADOW</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">真实 UI 里常用多层阴影：一层负责环境光，一层负责接触阴影，比单层更自然。</p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">INSET / GLOW</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">同一个编辑器可处理外阴影、内阴影、光晕和硬阴影，适合按钮、卡片、弹窗和特殊视觉元素。</p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">CSS READY</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">输出包含原始 box-shadow、完整 CSS、CSS 变量和 Tailwind arbitrary value，便于直接粘进项目。</p>
          </div>
        </section>

        <div className="mt-12 border-t border-black/[.08] pt-5">
          <FooterNote />
        </div>
      </div>
    </div>
  )
}
