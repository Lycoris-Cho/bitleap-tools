"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type CopyKey = "transform" | "css" | "tailwind" | "matrix" | "report" | null
type OriginPreset = "top-left" | "top" | "top-right" | "left" | "center" | "right" | "bottom-left" | "bottom" | "bottom-right"
type StageMode = "grid" | "dark" | "plain"
type ItemShape = "square" | "card" | "pill"

type TransformState = {
  translateX: number
  translateY: number
  rotate: number
  scaleX: number
  scaleY: number
  skewX: number
  skewY: number
  perspective: number
  rotateX: number
  rotateY: number
  originX: number
  originY: number
}

const DEFAULTS: TransformState = {
  translateX: 0,
  translateY: 0,
  rotate: 0,
  scaleX: 1,
  scaleY: 1,
  skewX: 0,
  skewY: 0,
  perspective: 800,
  rotateX: 0,
  rotateY: 0,
  originX: 50,
  originY: 50,
}

const ORIGIN_PRESETS: Array<{ id: OriginPreset; label: string; x: number; y: number }> = [
  { id: "top-left", label: "左上", x: 0, y: 0 },
  { id: "top", label: "上中", x: 50, y: 0 },
  { id: "top-right", label: "右上", x: 100, y: 0 },
  { id: "left", label: "左中", x: 0, y: 50 },
  { id: "center", label: "中心", x: 50, y: 50 },
  { id: "right", label: "右中", x: 100, y: 50 },
  { id: "bottom-left", label: "左下", x: 0, y: 100 },
  { id: "bottom", label: "下中", x: 50, y: 100 },
  { id: "bottom-right", label: "右下", x: 100, y: 100 },
]

const PRESETS: Array<{ name: string; desc: string; values: Partial<TransformState>; shape?: ItemShape }> = [
  {
    name: "轻微抬升",
    desc: "适合 hover 卡片。",
    values: { translateY: -10, scaleX: 1.03, scaleY: 1.03 },
    shape: "card",
  },
  {
    name: "海报倾斜",
    desc: "轻旋转 + skew。",
    values: { rotate: -8, skewX: -6, scaleX: 1.04, scaleY: 1.04 },
    shape: "card",
  },
  {
    name: "透视卡片",
    desc: "加入 rotateX / rotateY。",
    values: { perspective: 700, rotateX: 14, rotateY: -18, scaleX: 1.02, scaleY: 1.02 },
    shape: "card",
  },
  {
    name: "侧滑标签",
    desc: "横向位移和轻缩放。",
    values: { translateX: 34, scaleX: 1.08, scaleY: 1.08 },
    shape: "pill",
  },
  {
    name: "中心缩放",
    desc: "从中心放大。",
    values: { scaleX: 1.28, scaleY: 1.28 },
    shape: "square",
  },
]

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function formatNumber(value: number, digits = 2) {
  return Number.isInteger(value) ? String(value) : value.toFixed(digits)
}

function transformString(state: TransformState) {
  const parts = [
    `translate(${state.translateX}px, ${state.translateY}px)`,
    `rotate(${state.rotate}deg)`,
    `scale(${formatNumber(state.scaleX)}, ${formatNumber(state.scaleY)})`,
    `skew(${state.skewX}deg, ${state.skewY}deg)`,
    `rotateX(${state.rotateX}deg)`,
    `rotateY(${state.rotateY}deg)`,
  ]

  return parts.join(" ")
}

function cssBlock(state: TransformState) {
  return [
    ".element {",
    `  transform: ${transformString(state)};`,
    `  transform-origin: ${state.originX}% ${state.originY}%;`,
    `  transform-style: preserve-3d;`,
    "}",
    "",
    ".scene {",
    `  perspective: ${state.perspective}px;`,
    "}",
  ].join("\n")
}

function tailwindValue(state: TransformState) {
  return `className="[transform:${transformString(state).replace(/\s+/g, "_")}] [transform-origin:${state.originX}%_${state.originY}%]"`
}

function approximateMatrix(state: TransformState) {
  const rad = (state.rotate * Math.PI) / 180
  const skewX = Math.tan((state.skewX * Math.PI) / 180)
  const skewY = Math.tan((state.skewY * Math.PI) / 180)

  const cos = Math.cos(rad)
  const sin = Math.sin(rad)

  const a = state.scaleX * (cos - sin * skewY)
  const b = state.scaleX * (sin + cos * skewY)
  const c = state.scaleY * (cos * skewX - sin)
  const d = state.scaleY * (sin * skewX + cos)

  return `matrix(${[a, b, c, d, state.translateX, state.translateY].map((value) => value.toFixed(4)).join(", ")})`
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

function stageStyle(mode: StageMode) {
  if (mode === "dark") {
    return {
      backgroundColor: "#111310",
      backgroundImage: "radial-gradient(circle at 50% 42%, rgba(111,142,123,.16), transparent 30%)",
      backgroundSize: "auto",
      backgroundPosition: "center",
    }
  }

  if (mode === "plain") {
    return {
      backgroundColor: "#e9e5dc",
      backgroundImage: "none",
      backgroundSize: "auto",
      backgroundPosition: "center",
    }
  }

  return {
    backgroundColor: "#e9e5dc",
    backgroundImage:
      "linear-gradient(rgba(34,35,31,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(34,35,31,.055) 1px, transparent 1px)",
    backgroundSize: "28px 28px",
    backgroundPosition: "center",
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
        <span className="transform-num font-mono text-[10px] font-semibold text-[#52685d]">{formatNumber(value)}{unit}</span>
      </div>
      <div className="flex items-center gap-3">
        <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="min-w-0 flex-1 accent-[#52685d]" />
        <input type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(clamp(Number(event.target.value) || 0, min, max))} className="w-20 border-b border-black/15 bg-transparent px-1 py-1.5 text-right font-mono text-[9px] outline-none focus:border-black/50" />
      </div>
    </div>
  )
}

function CopyBlock({
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
      <pre className="transform-dark-scroll max-h-40 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-5 text-[#cbd8cd]">{value}</pre>
    </article>
  )
}

export default function CssTransformPage() {
  const [state, setState] = useState<TransformState>(DEFAULTS)
  const [shape, setShape] = useState<ItemShape>("card")
  const [stageMode, setStageMode] = useState<StageMode>("grid")
  const [showGhost, setShowGhost] = useState(true)
  const [copied, setCopied] = useState<CopyKey>(null)

  const pageRef = useRef<HTMLDivElement>(null)
  const objectRef = useRef<HTMLDivElement>(null)

  const transform = useMemo(() => transformString(state), [state])
  const css = useMemo(() => cssBlock(state), [state])
  const tailwind = useMemo(() => tailwindValue(state), [state])
  const matrix = useMemo(() => approximateMatrix(state), [state])

  const report = useMemo(
    () =>
      [
        "BitLeap Transform Lab",
        "",
        `Transform: ${transform}`,
        `Transform origin: ${state.originX}% ${state.originY}%`,
        `Perspective: ${state.perspective}px`,
        `Shape: ${shape}`,
        "",
        "CSS:",
        css,
        "",
        "Approximate 2D matrix:",
        matrix,
        "",
        "Tailwind:",
        tailwind,
      ].join("\n"),
    [css, matrix, shape, state.originX, state.originY, state.perspective, tailwind, transform],
  )

  const objectSize = useMemo(() => {
    if (shape === "square") return { width: 142, height: 142, radius: 26 }
    if (shape === "pill") return { width: 210, height: 74, radius: 999 }
    return { width: 220, height: 150, radius: 28 }
  }, [shape])

  const transformStyle = useMemo(
    () => ({
      transform,
      transformOrigin: `${state.originX}% ${state.originY}%`,
      transformStyle: "preserve-3d" as const,
    }),
    [state.originX, state.originY, transform],
  )

  useEffect(() => {
    if (!pageRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      gsap.from(".transform-intro", {
        opacity: 0,
        y: 18,
        duration: 0.7,
        stagger: 0.05,
        ease: "power3.out",
      })

      gsap.to(".transform-orbit", {
        rotation: 360,
        duration: 92,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })
    }, pageRef)

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (!objectRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    gsap.fromTo(
      objectRef.current,
      { opacity: 0.74 },
      {
        opacity: 1,
        duration: 0.18,
        overwrite: true,
      },
    )
  }, [transform, shape])

  const patch = (next: Partial<TransformState>) => {
    setState((current) => ({ ...current, ...next }))
  }

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setState({ ...DEFAULTS, ...preset.values })
    if (preset.shape) setShape(preset.shape)
  }

  const reset = () => {
    setState(DEFAULTS)
    setShape("card")
    setStageMode("grid")
    setShowGhost(true)
    setCopied(null)
  }

  const copy = async (value: string, key: CopyKey) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {}
  }

  return (
    <div ref={pageRef} className="min-h-screen overflow-hidden bg-[#f0eee8] text-[#22231f] selection:bg-[#22231f] selection:text-white">
      <style>{`
        .transform-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
        .transform-scroll::-webkit-scrollbar-track { background: transparent; }
        .transform-scroll::-webkit-scrollbar-thumb { background: rgba(34,35,31,.13); border-radius: 999px; }
        .transform-dark-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.13); }
        .transform-num { font-variant-numeric: tabular-nums lining-nums; }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_83%_8%,rgba(178,141,72,.08),transparent_24%),radial-gradient(circle_at_8%_89%,rgba(82,104,93,.08),transparent_28%)]" />
        <div className="transform-orbit absolute right-[-17vw] top-[-21vw] h-[54vw] w-[54vw] rounded-full border border-black/[.035]">
          <span className="absolute left-[18%] top-[44%] h-2 w-2 rounded-full bg-[#52685d]/30" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1600px] px-5 pb-10 pt-6 sm:px-8">
        <div className="transform-intro">
          <Breadcrumb />
        </div>

        <header className="transform-intro mt-8 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/25">TRANSFORM LAB</div>
            <h1 className="mt-4 text-[clamp(48px,6.15vw,88px)] font-semibold leading-[1.02] tracking-[-.055em]">
              Transform，
              <br />
              在画布里调。
            </h1>
          </div>

          <div>
            <p className="max-w-[560px] text-[11px] leading-6 text-black/40">
              这次改成“舞台 + 控制轨 + 输出栏”的布局，不再是左右两块卡片。支持 2D / 3D 变换、transform-origin、透视、预设与代码输出。
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button key={preset.name} type="button" onClick={() => applyPreset(preset)} className="rounded-full border border-black/[.08] px-3.5 py-2 text-[8px] font-semibold text-black/34 transition hover:bg-white/50 hover:text-black">
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        </header>

        <section className="transform-intro mt-7">
          <div className="grid gap-5 xl:grid-cols-[1fr_290px]">
            <div className="min-w-0">
              <div className="overflow-hidden rounded-[32px] border border-black/[.08] bg-[#151714]">
                <div className="flex flex-col gap-3 border-b border-white/[.065] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    {(["grid", "dark", "plain"] as StageMode[]).map((mode) => (
                      <button key={mode} type="button" onClick={() => setStageMode(mode)} className={`rounded-full px-3 py-2 font-mono text-[8px] font-semibold transition ${stageMode === mode ? "bg-white text-[#151714]" : "border border-white/[.08] text-white/28 hover:bg-white/[.06]"}`}>
                        {mode.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(["square", "card", "pill"] as ItemShape[]).map((item) => (
                      <button key={item} type="button" onClick={() => setShape(item)} className={`rounded-full px-3 py-2 text-[8px] font-semibold transition ${shape === item ? "bg-[#52685d] text-white" : "border border-white/[.08] text-white/28 hover:bg-white/[.06]"}`}>
                        {item}
                      </button>
                    ))}
                    <button type="button" onClick={() => setShowGhost((value) => !value)} className={`rounded-full px-3 py-2 text-[8px] font-semibold transition ${showGhost ? "bg-[#b28d48] text-white" : "border border-white/[.08] text-white/28"}`}>
                      原位参考
                    </button>
                  </div>
                </div>

                <div className="transform-dark-scroll overflow-auto p-5 sm:p-7">
                  <div className="mx-auto max-w-[1020px]">
                    <div className="mb-3 flex items-center justify-between gap-3 text-[8px] text-white/18">
                      <span>LIVE TRANSFORM STAGE</span>
                      <span className="transform-num font-mono">{state.perspective}px perspective</span>
                    </div>

                    <div className="relative grid h-[560px] place-items-center overflow-hidden rounded-[28px] border border-white/[.06] p-8" style={stageStyle(stageMode)}>
                      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-black/[.08]" />
                      <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-black/[.08]" />

                      <div className="relative" style={{ perspective: `${state.perspective}px` }}>
                        {showGhost && (
                          <div
                            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border border-dashed border-black/15 bg-transparent"
                            style={{
                              width: objectSize.width,
                              height: objectSize.height,
                              borderRadius: objectSize.radius,
                            }}
                          />
                        )}

                        <div
                          ref={objectRef}
                          style={{
                            width: objectSize.width,
                            height: objectSize.height,
                            borderRadius: objectSize.radius,
                            ...transformStyle,
                          }}
                          className="relative grid place-items-center bg-[#52685d] text-white shadow-[0_28px_70px_rgba(31,48,42,.22)]"
                        >
                          <div className="text-center">
                            <div className="font-mono text-[10px] font-semibold text-white/55">TRANSFORM</div>
                            <div className="mt-2 text-[22px] font-semibold tracking-[-.04em]">元素</div>
                          </div>

                          <div
                            className="absolute h-3 w-3 rounded-full border-2 border-white bg-[#b28d48] shadow-lg"
                            style={{
                              left: `${state.originX}%`,
                              top: `${state.originY}%`,
                              transform: "translate(-50%, -50%)",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-px border-t border-white/[.06] bg-white/[.06] sm:grid-cols-4">
                  {[
                    ["TRANSLATE", `${state.translateX}, ${state.translateY}`],
                    ["ROTATE", `${state.rotate}°`],
                    ["SCALE", `${formatNumber(state.scaleX)} × ${formatNumber(state.scaleY)}`],
                    ["ORIGIN", `${state.originX}% ${state.originY}%`],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-[#151714] p-4">
                      <div className="text-[7px] font-semibold tracking-[.12em] text-white/18">{label}</div>
                      <div className="transform-num mt-2 font-mono text-[10px] font-semibold text-[#cbd8cd]">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 border-y border-black/[.09] bg-white/18">
                <div className="grid lg:grid-cols-3">
                  <div className="border-b border-black/[.07] p-5 lg:border-b-0 lg:border-r">
                    <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">POSITION</div>
                    <Slider label="translateX" value={state.translateX} min={-320} max={320} unit="px" onChange={(translateX) => patch({ translateX })} />
                    <Slider label="translateY" value={state.translateY} min={-320} max={320} unit="px" onChange={(translateY) => patch({ translateY })} />
                    <Slider label="rotate" value={state.rotate} min={-180} max={180} unit="°" onChange={(rotate) => patch({ rotate })} />
                  </div>

                  <div className="border-b border-black/[.07] p-5 lg:border-b-0 lg:border-r">
                    <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">SHAPE</div>
                    <Slider label="scaleX" value={state.scaleX} min={0.1} max={3} step={0.01} unit="" onChange={(scaleX) => patch({ scaleX })} />
                    <Slider label="scaleY" value={state.scaleY} min={0.1} max={3} step={0.01} unit="" onChange={(scaleY) => patch({ scaleY })} />
                    <Slider label="skewX" value={state.skewX} min={-60} max={60} unit="°" onChange={(skewX) => patch({ skewX })} />
                    <Slider label="skewY" value={state.skewY} min={-60} max={60} unit="°" onChange={(skewY) => patch({ skewY })} />
                  </div>

                  <div className="p-5">
                    <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">3D / ORIGIN</div>
                    <Slider label="perspective" value={state.perspective} min={200} max={2000} step={50} unit="px" onChange={(perspective) => patch({ perspective })} />
                    <Slider label="rotateX" value={state.rotateX} min={-75} max={75} unit="°" onChange={(rotateX) => patch({ rotateX })} />
                    <Slider label="rotateY" value={state.rotateY} min={-75} max={75} unit="°" onChange={(rotateY) => patch({ rotateY })} />

                    <div className="mt-4">
                      <div className="mb-2 text-[8px] font-semibold tracking-[.12em] text-black/24">TRANSFORM ORIGIN</div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {ORIGIN_PRESETS.map((origin) => (
                          <button key={origin.id} type="button" onClick={() => patch({ originX: origin.x, originY: origin.y })} className={`rounded-[13px] px-2 py-2.5 text-[8px] font-semibold transition ${state.originX === origin.x && state.originY === origin.y ? "bg-[#22231f] text-white" : "bg-white/30 text-black/32 hover:bg-white/60"}`}>
                            {origin.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <aside className="min-w-0">
              <div className="sticky top-6 overflow-hidden rounded-[28px] border border-black/[.08] bg-[#151714]">
                <div className="border-b border-white/[.06] px-5 py-4">
                  <div className="text-[8px] font-semibold tracking-[.13em] text-white/22">OUTPUT</div>
                </div>

                <div className="transform-dark-scroll max-h-[790px] overflow-auto px-5">
                  <CopyBlock label="TRANSFORM" value={`transform: ${transform};`} copied={copied === "transform"} onCopy={() => copy(`transform: ${transform};`, "transform")} />
                  <CopyBlock label="CSS BLOCK" value={css} copied={copied === "css"} onCopy={() => copy(css, "css")} />
                  <CopyBlock label="2D MATRIX" value={matrix} copied={copied === "matrix"} onCopy={() => copy(matrix, "matrix")} />
                  <CopyBlock label="TAILWIND" value={tailwind} copied={copied === "tailwind"} onCopy={() => copy(tailwind, "tailwind")} />
                </div>

                <div className="border-t border-white/[.06] p-5">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={reset} className="rounded-full px-4 py-3 text-[9px] font-semibold text-[#d49a88] transition hover:bg-[#d49a88]/8">重置</button>
                    <button type="button" onClick={() => copy(report, "report")} className="rounded-full border border-white/[.08] px-4 py-3 text-[9px] font-semibold text-white/33 transition hover:bg-white hover:text-[#151714]">{copied === "report" ? "✓ 报告" : "复制报告"}</button>
                    <button type="button" onClick={() => downloadText(report, "bitleap-transform-report.txt")} className="rounded-full border border-white/[.08] px-4 py-3 text-[9px] font-semibold text-white/33 transition hover:bg-white hover:text-[#151714]">导出</button>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="transform-intro mt-12 grid gap-8 border-t border-black/10 pt-7 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">ORIGIN VISIBLE</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">金色锚点就是 transform-origin，可以直接看旋转和缩放围绕哪里发生。</p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">2D + 3D</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">在原有 translate / rotate / scale / skew 基础上加入 perspective、rotateX 和 rotateY。</p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">ORDER MATTERS</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">CSS transform 函数按书写顺序组合执行。当前输出顺序固定，方便结果稳定复现。</p>
          </div>
        </section>

        <div className="mt-12 border-t border-black/[.08] pt-5">
          <FooterNote />
        </div>
      </div>
    </div>
  )
}
