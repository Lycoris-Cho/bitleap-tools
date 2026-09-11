"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type CopyKey = "value" | "css" | "tailwind" | "report" | null
type PreviewMode = "paper" | "dark" | "poster" | "transparent"
type ShadowLayer = {
  id: string
  name: string
  x: number
  y: number
  blur: number
  color: string
  alpha: number
}

type Preset = {
  id: string
  name: string
  desc: string
  layers: ShadowLayer[]
  previewMode: PreviewMode
  textColor: string
}

const PRESETS: Preset[] = [
  {
    id: "soft",
    name: "柔和投影",
    desc: "适合标题和卡片中的大字号文字。",
    previewMode: "paper",
    textColor: "#22231f",
    layers: [
      makeLayer("主阴影", 0, 8, 20, "#000000", 0.18),
      makeLayer("近距离", 0, 2, 4, "#000000", 0.1),
    ],
  },
  {
    id: "editorial",
    name: "杂志压印",
    desc: "低调、浅层、偏印刷质感。",
    previewMode: "paper",
    textColor: "#2a2924",
    layers: [
      makeLayer("亮边", 1, 1, 0, "#ffffff", 0.82),
      makeLayer("暗边", -1, -1, 0, "#000000", 0.1),
    ],
  },
  {
    id: "neon",
    name: "霓虹发光",
    desc: "深色背景上的发光标题。",
    previewMode: "dark",
    textColor: "#f7fff7",
    layers: [
      makeLayer("核心光", 0, 0, 6, "#8bffb0", 0.9),
      makeLayer("外发光", 0, 0, 18, "#5fe08a", 0.62),
      makeLayer("远光晕", 0, 0, 36, "#61a5ff", 0.38),
    ],
  },
  {
    id: "retro",
    name: "复古 3D",
    desc: "多层硬阴影，适合海报字。",
    previewMode: "poster",
    textColor: "#fff3cf",
    layers: [
      makeLayer("1px", 1, 1, 0, "#965744", 1),
      makeLayer("2px", 2, 2, 0, "#965744", 1),
      makeLayer("3px", 3, 3, 0, "#965744", 1),
      makeLayer("远投影", 9, 11, 0, "#22231f", 0.32),
    ],
  },
  {
    id: "long",
    name: "长投影",
    desc: "适合徽章、封面和活动视觉。",
    previewMode: "poster",
    textColor: "#f8f1df",
    layers: [
      makeLayer("step 1", 2, 2, 0, "#52685d", 0.72),
      makeLayer("step 2", 4, 4, 0, "#52685d", 0.62),
      makeLayer("step 3", 6, 6, 0, "#52685d", 0.52),
      makeLayer("step 4", 8, 8, 0, "#52685d", 0.42),
      makeLayer("step 5", 10, 10, 0, "#52685d", 0.32),
    ],
  },
  {
    id: "subtle-glow",
    name: "轻微光晕",
    desc: "适合按钮标题、Hero 文字和深色 UI。",
    previewMode: "dark",
    textColor: "#ffffff",
    layers: [
      makeLayer("柔光", 0, 0, 12, "#ffffff", 0.24),
      makeLayer("底影", 0, 12, 30, "#000000", 0.38),
    ],
  },
]

function makeLayer(name: string, x: number, y: number, blur: number, color: string, alpha: number): ShadowLayer {
  return {
    id: `${name}-${x}-${y}-${blur}-${color}-${alpha}`,
    name,
    x,
    y,
    blur,
    color,
    alpha,
  }
}

function freshLayer(name = "新阴影"): ShadowLayer {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return {
    id,
    name,
    x: 2,
    y: 3,
    blur: 8,
    color: "#000000",
    alpha: 0.24,
  }
}

function formatNumber(value: number, digits = 0) {
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: digits,
  }).format(value)
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "")
  const full = normalized.length === 3 ? normalized.split("").map((item) => item + item).join("") : normalized
  const number = Number.parseInt(full, 16)

  if (!Number.isFinite(number) || full.length !== 6) {
    return {
      r: 0,
      g: 0,
      b: 0,
    }
  }

  return {
    r: (number >> 16) & 255,
    g: (number >> 8) & 255,
    b: number & 255,
  }
}

function rgba(color: string, alpha: number) {
  const rgb = hexToRgb(color)
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Number(alpha.toFixed(2))})`
}

function buildShadow(layers: ShadowLayer[]) {
  if (!layers.length) return "none"

  return layers
    .map((layer) => `${layer.x}px ${layer.y}px ${layer.blur}px ${rgba(layer.color, layer.alpha)}`)
    .join(",\n  ")
}

function escapeTailwindValue(value: string) {
  return value
    .replace(/\s+/g, "_")
    .replace(/,/g, ",")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
}

function previewBackgroundStyle(mode: PreviewMode) {
  if (mode === "dark") {
    return {
      backgroundColor: "#151714",
      backgroundImage: "radial-gradient(circle at 26% 12%, rgba(143,182,155,.18), transparent 34%)",
      backgroundSize: "auto",
    }
  }

  if (mode === "poster") {
    return {
      backgroundColor: "#52685d",
      backgroundImage: "linear-gradient(135deg, #52685d 0%, #b28d48 46%, #965744 100%)",
      backgroundSize: "auto",
    }
  }

  if (mode === "transparent") {
    return {
      backgroundColor: "#f4f1e9",
      backgroundImage: "linear-gradient(45deg, rgba(0,0,0,.045) 25%, transparent 25%), linear-gradient(-45deg, rgba(0,0,0,.045) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(0,0,0,.045) 75%), linear-gradient(-45deg, transparent 75%, rgba(0,0,0,.045) 75%)",
      backgroundSize: "24px 24px",
      backgroundPosition: "0 0, 0 12px, 12px -12px, -12px 0",
    }
  }

  return {
    backgroundColor: "#f4f1e9",
    backgroundImage: "radial-gradient(circle at 82% 10%, rgba(178,141,72,.12), transparent 32%)",
    backgroundSize: "auto",
  }
}

function downloadText(content: string, filename: string) {
  if (!content) return

  const blob = new Blob([content], {
    type: "text/plain;charset=utf-8",
  })
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
      <div className="mb-2 flex justify-between text-[8px] text-black/28">
        <span>{label}</span>
        <span className="shadow-num font-mono text-[#52685d]">{formatNumber(value, step < 1 ? 2 : 0)}{unit}</span>
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
      <div className={`shadow-num mt-3 break-all font-mono text-[13px] font-semibold ${toneClass}`}>{value}</div>
    </div>
  )
}

export default function TextShadowGen() {
  const [text, setText] = useState("预览文字 Text-Shadow")
  const [layers, setLayers] = useState<ShadowLayer[]>(PRESETS[0].layers)
  const [activeLayerId, setActiveLayerId] = useState(PRESETS[0].layers[0].id)
  const [previewMode, setPreviewMode] = useState<PreviewMode>("paper")
  const [fontSize, setFontSize] = useState(56)
  const [fontWeight, setFontWeight] = useState(800)
  const [letterSpacing, setLetterSpacing] = useState(-3)
  const [textColor, setTextColor] = useState("#22231f")
  const [copied, setCopied] = useState<CopyKey>(null)

  const pageRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const activeLayer = layers.find((layer) => layer.id === activeLayerId) ?? layers[0]
  const shadowValue = useMemo(() => buildShadow(layers), [layers])
  const cssBlock = useMemo(
    () =>
      [
        ".text-shadow-preview {",
        `  color: ${textColor};`,
        `  font-size: ${fontSize}px;`,
        `  font-weight: ${fontWeight};`,
        `  letter-spacing: ${letterSpacing}px;`,
        `  text-shadow: ${shadowValue};`,
        "}",
      ].join("\n"),
    [fontSize, fontWeight, letterSpacing, shadowValue, textColor],
  )
  const tailwindValue = useMemo(() => `className="text-[${fontSize}px] font-[${fontWeight}] tracking-[${letterSpacing}px] [text-shadow:${escapeTailwindValue(shadowValue.replace(/\n/g, ""))}]"`, [fontSize, fontWeight, letterSpacing, shadowValue])
  const report = useMemo(
    () =>
      [
        "BitLeap Text Shadow Studio",
        "",
        `文本：${text}`,
        `层数：${layers.length}`,
        `字体大小：${fontSize}px`,
        `字重：${fontWeight}`,
        `字距：${letterSpacing}px`,
        `文字颜色：${textColor}`,
        "",
        "text-shadow:",
        shadowValue,
        "",
        "CSS:",
        cssBlock,
        "",
        "Tailwind arbitrary:",
        tailwindValue,
      ].join("\n"),
    [cssBlock, fontSize, fontWeight, layers.length, letterSpacing, shadowValue, tailwindValue, text, textColor],
  )

  useEffect(() => {
    if (!pageRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      gsap.from(".shadow-intro", {
        y: 22,
        opacity: 0,
        duration: 0.78,
        stagger: 0.055,
        ease: "power3.out",
      })

      gsap.to(".shadow-orbit-a", {
        rotation: 360,
        duration: 70,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })

      gsap.to(".shadow-orbit-b", {
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
      { opacity: 0.68, scale: 0.985 },
      {
        opacity: 1,
        scale: 1,
        duration: 0.24,
        ease: "power2.out",
        overwrite: true,
      },
    )
  }, [shadowValue, fontSize, fontWeight, letterSpacing, textColor, previewMode])

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
    const next = freshLayer(`阴影 ${layers.length + 1}`)
    setLayers((current) => [...current, next])
    setActiveLayerId(next.id)
  }

  const duplicateLayer = () => {
    if (!activeLayer) return

    const next = {
      ...activeLayer,
      id: freshLayer().id,
      name: `${activeLayer.name} copy`,
    }

    setLayers((current) => [...current, next])
    setActiveLayerId(next.id)
  }

  const removeLayer = (id: string) => {
    setLayers((current) => {
      const next = current.filter((layer) => layer.id !== id)
      if (!next.length) {
        const fallback = freshLayer("默认阴影")
        setActiveLayerId(fallback.id)
        return [fallback]
      }

      if (id === activeLayerId) {
        setActiveLayerId(next[0].id)
      }

      return next
    })
  }

  const moveLayer = (id: string, direction: -1 | 1) => {
    setLayers((current) => {
      const index = current.findIndex((layer) => layer.id === id)
      const target = index + direction

      if (index < 0 || target < 0 || target >= current.length) return current

      const next = [...current]
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)

      return next
    })
  }

  const applyPreset = (preset: Preset) => {
    const nextLayers = preset.layers.map((layer, index) => ({
      ...layer,
      id: `${preset.id}-${index}-${layer.name}`,
    }))

    setLayers(nextLayers)
    setActiveLayerId(nextLayers[0].id)
    setPreviewMode(preset.previewMode)
    setTextColor(preset.textColor)
  }

  const copy = async (value: string, key: CopyKey) => {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {}
  }

  const reset = () => {
    const preset = PRESETS[0]
    setText("预览文字 Text-Shadow")
    setFontSize(56)
    setFontWeight(800)
    setLetterSpacing(-3)
    applyPreset(preset)
    setCopied(null)
  }

  return (
    <div ref={pageRef} className="min-h-screen overflow-hidden bg-[#efede6] text-[#22231f] selection:bg-[#22231f] selection:text-white">
      <style>{`
        .shadow-scroll::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }

        .shadow-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .shadow-scroll::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(34,35,31,.13);
        }

        .shadow-dark-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,.14);
        }

        .shadow-grid {
          background-image:
            linear-gradient(rgba(34,35,31,.032) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,35,31,.032) 1px, transparent 1px);
          background-size: 30px 30px;
        }

        .shadow-num {
          font-variant-numeric: tabular-nums lining-nums;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_9%,rgba(178,151,91,.10),transparent_27%),radial-gradient(circle_at_8%_88%,rgba(73,107,91,.08),transparent_31%)]" />
        <div className="shadow-orbit-a absolute right-[-20vw] top-[-24vw] h-[58vw] w-[58vw] rounded-full border border-black/[.04]">
          <span className="absolute left-[15%] top-[43%] h-2 w-2 rounded-full bg-[#b28d48]/38" />
        </div>
        <div className="shadow-orbit-b absolute bottom-[-26vw] left-[-19vw] h-[53vw] w-[53vw] rounded-full border border-black/[.032]">
          <span className="absolute right-[14%] top-[31%] h-1.5 w-1.5 rounded-full bg-[#52685d]/35" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1580px] px-5 pb-10 pt-6 sm:px-8">
        <div className="shadow-intro">
          <Breadcrumb />
        </div>

        <header className="shadow-intro mt-8 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/27">TEXT SHADOW STUDIO</div>
            <h1 className="mt-4 max-w-[900px] text-[clamp(48px,6.35vw,90px)] font-semibold leading-[1.03] tracking-[-.055em]">
              给文字，
              <br />
              加一点空气感。
            </h1>
          </div>

          <div>
            <p className="max-w-[560px] text-[11px] leading-6 text-black/40">
              可视化生成 CSS text-shadow，支持多层阴影、透明度、预设、实时预览、Tailwind arbitrary value 和完整 CSS 导出。
            </p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[8px] text-black/25">
              <span>{layers.length} LAYERS</span>
              <span>CSS TEXT-SHADOW</span>
              <span>TAILWIND VALUE</span>
              <span>LOCAL ONLY</span>
            </div>
          </div>
        </header>

        <section className="shadow-intro mt-7 grid gap-7 xl:grid-cols-[.66fr_1.34fr]">
          <aside className="min-w-0">
            <div className="rounded-[28px] border border-black/[.075] bg-white/24 p-5">
              <div className="text-[8px] font-semibold tracking-[.14em] text-black/24">PRESETS</div>
              <h2 className="mt-3 text-[clamp(30px,3.5vw,46px)] font-semibold leading-none tracking-[-.045em]">快速风格。</h2>

              <div className="shadow-scroll mt-6 grid max-h-[360px] gap-2 overflow-auto pr-1 sm:grid-cols-2">
                {PRESETS.map((preset) => (
                  <button key={preset.id} type="button" onClick={() => applyPreset(preset)} className="rounded-[20px] border border-black/[.08] bg-white/22 p-4 text-left transition hover:bg-white/48">
                    <div className="font-mono text-[8px] font-semibold text-black/24">{preset.id.toUpperCase()}</div>
                    <div className="mt-2 text-[14px] font-semibold tracking-[-.03em] text-black/70">{preset.name}</div>
                    <p className="mt-2 text-[8px] leading-4 text-black/30">{preset.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-[24px] border border-black/[.075] bg-white/24">
              <div className="border-b border-black/[.06] px-5 py-4">
                <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">SHADOW PROFILE</div>
                <p className="mt-2 text-[9px] leading-5 text-black/35">多层 text-shadow 会按顺序叠加。硬边阴影适合复古 3D，模糊阴影适合发光和柔和投影。</p>
              </div>

              <div className="grid grid-cols-2 gap-px bg-black/[.06]">
                <StatBox label="LAYERS" value={formatNumber(layers.length)} tone="green" />
                <StatBox label="FONT SIZE" value={`${fontSize}px`} />
                <StatBox label="WEIGHT" value={String(fontWeight)} />
                <StatBox label="LETTER" value={`${letterSpacing}px`} />
                <StatBox label="COLOR" value={textColor} tone="gold" />
                <StatBox label="MODE" value={previewMode.toUpperCase()} />
              </div>
            </div>

            <div className="mt-4 rounded-[24px] border border-black/[.075] bg-white/24 p-5">
              <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">QUICK ACTIONS</div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={addLayer} className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white">新增阴影层</button>
                <button type="button" onClick={duplicateLayer} disabled={!activeLayer} className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 transition hover:bg-white/40 disabled:opacity-30">复制当前层</button>
                <button type="button" onClick={reset} className="rounded-full px-4 py-3 text-[9px] font-semibold text-[#965744] transition hover:bg-[#965744]/8">重置</button>
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="grid gap-px overflow-hidden rounded-[30px] border border-black/[.08] bg-black/[.08] lg:grid-cols-[.92fr_1.08fr]">
              <div className="bg-[#f4f1e9]">
                <div className="flex h-12 items-center justify-between border-b border-black/[.065] px-5">
                  <span className="text-[8px] font-semibold tracking-[.13em] text-black/26">CONTROLS</span>
                  <span className="text-[8px] text-black/22">{activeLayer?.name ?? "NO LAYER"}</span>
                </div>

                <div className="shadow-scroll h-[640px] overflow-auto p-5 sm:p-6">
                  <div className="space-y-6">
                    <label>
                      <span className="mb-2 block text-[8px] font-semibold tracking-[.12em] text-black/24">PREVIEW TEXT</span>
                      <input value={text} onChange={(event) => setText(event.target.value)} spellCheck={false} className="w-full rounded-full border border-black/[.08] bg-white/35 px-4 py-3 text-[10px] text-black/68 outline-none transition focus:border-black/25" />
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <label>
                        <span className="mb-2 block text-[8px] text-black/24">文字颜色</span>
                        <input type="color" value={textColor} onChange={(event) => setTextColor(event.target.value)} className="h-12 w-full cursor-pointer rounded-[16px] border border-black/[.08] bg-transparent p-1" />
                      </label>

                      <div>
                        <span className="mb-2 block text-[8px] text-black/24">背景</span>
                        <div className="flex flex-wrap gap-1.5">
                          {(["paper", "dark", "poster", "transparent"] as PreviewMode[]).map((mode) => (
                            <button key={mode} type="button" onClick={() => setPreviewMode(mode)} className={`rounded-full px-3 py-2 font-mono text-[8px] font-semibold transition ${previewMode === mode ? "bg-[#52685d] text-white" : "text-black/32 hover:bg-white/45 hover:text-black"}`}>{mode}</button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <Slider label="字号" value={fontSize} min={18} max={140} unit="px" onChange={setFontSize} />
                      <Slider label="字重" value={fontWeight} min={100} max={900} step={100} unit="" onChange={setFontWeight} />
                      <Slider label="字距" value={letterSpacing} min={-8} max={12} unit="px" onChange={setLetterSpacing} />
                    </div>

                    <div>
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="text-[8px] font-semibold tracking-[.12em] text-black/24">LAYERS</div>
                        <span className="text-[8px] text-black/24">点击选择要编辑的层</span>
                      </div>

                      <div className="space-y-2">
                        {layers.map((layer, index) => (
                          <button key={layer.id} type="button" onClick={() => setActiveLayerId(layer.id)} className={`w-full rounded-[18px] border p-4 text-left transition ${activeLayerId === layer.id ? "border-[#22231f]/15 bg-[#22231f] text-white" : "border-black/[.08] bg-white/22 hover:bg-white/48"}`}>
                            <div className="flex items-center justify-between gap-3">
                              <span className={`font-mono text-[8px] ${activeLayerId === layer.id ? "text-white/26" : "text-black/24"}`}>#{index + 1}</span>
                              <span className={`text-[8px] ${activeLayerId === layer.id ? "text-white/30" : "text-black/28"}`}>{layer.x}px {layer.y}px {layer.blur}px · {Math.round(layer.alpha * 100)}%</span>
                            </div>
                            <div className={`mt-2 text-[13px] font-semibold ${activeLayerId === layer.id ? "text-white" : "text-black/67"}`}>{layer.name}</div>
                            <div className="mt-3 h-2 rounded-full" style={{ background: rgba(layer.color, layer.alpha) }} />
                          </button>
                        ))}
                      </div>
                    </div>

                    {activeLayer && (
                      <div className="rounded-[22px] border border-black/[.075] bg-white/24 p-5">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div className="text-[8px] font-semibold tracking-[.12em] text-black/24">ACTIVE LAYER</div>
                          <div className="flex gap-1.5">
                            <button type="button" onClick={() => moveLayer(activeLayer.id, -1)} className="rounded-full border border-black/[.08] px-3 py-1.5 text-[8px] text-black/34">上移</button>
                            <button type="button" onClick={() => moveLayer(activeLayer.id, 1)} className="rounded-full border border-black/[.08] px-3 py-1.5 text-[8px] text-black/34">下移</button>
                            <button type="button" onClick={() => removeLayer(activeLayer.id)} className="rounded-full px-3 py-1.5 text-[8px] text-[#965744]">删除</button>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <label>
                            <span className="mb-2 block text-[8px] text-black/24">层名称</span>
                            <input value={activeLayer.name} onChange={(event) => updateLayer(activeLayer.id, { name: event.target.value })} className="w-full rounded-full border border-black/[.08] bg-white/35 px-4 py-3 text-[10px] outline-none" />
                          </label>

                          <div className="grid gap-4 sm:grid-cols-3">
                            <Slider label="X 偏移" value={activeLayer.x} min={-80} max={80} unit="px" onChange={(value) => updateLayer(activeLayer.id, { x: value })} />
                            <Slider label="Y 偏移" value={activeLayer.y} min={-80} max={80} unit="px" onChange={(value) => updateLayer(activeLayer.id, { y: value })} />
                            <Slider label="模糊" value={activeLayer.blur} min={0} max={100} unit="px" onChange={(value) => updateLayer(activeLayer.id, { blur: value })} />
                          </div>

                          <div className="grid gap-4 sm:grid-cols-[90px_1fr] sm:items-end">
                            <label>
                              <span className="mb-2 block text-[8px] text-black/24">颜色</span>
                              <input type="color" value={activeLayer.color} onChange={(event) => updateLayer(activeLayer.id, { color: event.target.value })} className="h-12 w-full cursor-pointer rounded-[16px] border border-black/[.08] bg-transparent p-1" />
                            </label>
                            <Slider label="透明度" value={activeLayer.alpha} min={0} max={1} step={0.01} unit="" onChange={(value) => updateLayer(activeLayer.id, { alpha: clamp(value, 0, 1) })} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-[#151714]">
                <div className="flex h-12 items-center justify-between border-b border-white/[.065] px-5">
                  <span className="text-[8px] font-semibold tracking-[.13em] text-white/27">LIVE PREVIEW</span>
                  <span className="text-[8px] text-white/18">{shadowValue === "none" ? "NONE" : "READY"}</span>
                </div>

                <div className="p-4 sm:p-5">
                  <div ref={previewRef} className="grid min-h-[388px] place-items-center overflow-hidden rounded-[26px] border border-white/[.065] p-8 text-center" style={previewBackgroundStyle(previewMode)}>
                    <p style={{ color: textColor, fontSize, fontWeight, letterSpacing, textShadow: shadowValue }} className="max-w-full break-words leading-[1.04] tracking-[-.05em]">
                      {text || "Text Shadow"}
                    </p>
                  </div>

                  <div className="mt-4 space-y-3">
                    {[
                      { label: "text-shadow value", value: shadowValue, key: "value" as CopyKey },
                      { label: "CSS block", value: cssBlock, key: "css" as CopyKey },
                      { label: "Tailwind arbitrary", value: tailwindValue, key: "tailwind" as CopyKey },
                    ].map((item) => (
                      <div key={item.label} className="group rounded-[20px] border border-white/[.065] bg-white/[.035] p-4">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-[8px] font-semibold tracking-[.12em] text-white/24">{item.label}</span>
                          <button type="button" onClick={() => copy(item.value, item.key)} className="text-[8px] font-semibold text-white/25 transition hover:text-white">{copied === item.key ? "✓ COPIED" : "COPY"}</button>
                        </div>
                        <pre className="shadow-dark-scroll max-h-[144px] overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-5 text-[#cbd8cd]">{item.value}</pre>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="shadow-intro mt-12 grid gap-9 border-t border-black/10 pt-8 lg:grid-cols-[.55fr_1.45fr]">
          <div>
            <div className="text-[9px] font-semibold tracking-[.14em] text-black/25">REPORT</div>
            <h2 className="mt-3 text-[clamp(30px,4vw,46px)] font-semibold leading-[1.06] tracking-[-.045em]">
              阴影参数，
              <br />
              一起导出。
            </h2>
            <p className="mt-5 max-w-[380px] text-[9px] leading-5 text-black/34">
              输出包含完整 CSS、text-shadow value 和 Tailwind arbitrary 写法，方便复制到组件、样式表或设计记录里。
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" onClick={() => copy(report, "report")} className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white">{copied === "report" ? "✓ 已复制报告" : "复制报告"}</button>
              <button type="button" onClick={() => downloadText(report, "bitleap-text-shadow-report.txt")} className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 transition hover:bg-white/40">导出报告</button>
            </div>
          </div>

          <div className="overflow-hidden rounded-[25px] border border-black/[.08] bg-[#171916]">
            <div className="flex items-center justify-between border-b border-white/[.07] px-5 py-3">
              <span className="text-[8px] tracking-[.13em] text-white/25">CSS PROFILE</span>
              <span className="text-[8px] text-white/17">LOCAL GENERATOR</span>
            </div>
            <pre className="shadow-dark-scroll max-h-[390px] overflow-auto whitespace-pre-wrap break-words p-5 font-mono text-[11px] leading-7 text-[#c7d3c7] sm:p-6">{report}</pre>
          </div>
        </section>

        <section className="shadow-intro mt-12 grid gap-8 border-t border-black/10 pt-7 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">MULTI LAYER</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">text-shadow 支持逗号分隔的多层阴影。多个硬阴影可以做 3D 字，多个模糊阴影可以做发光。</p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">ALPHA FIX</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">颜色选择器只保存 6 位 Hex，透明度单独控制，最终输出 rgba，避免 8 位 Hex 在 input color 中失效。</p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">DESIGN NOTE</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">阴影越强越容易降低可读性。正文建议使用轻阴影，海报标题才适合长投影和高亮发光。</p>
          </div>
        </section>

        <div className="mt-12 border-t border-black/[.08] pt-5">
          <FooterNote />
        </div>
      </div>
    </div>
  )
}
