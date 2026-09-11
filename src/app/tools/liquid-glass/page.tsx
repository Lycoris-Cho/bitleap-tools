"use client"

import { CSSProperties, useMemo, useState } from "react"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type GlassPreset = {
  id: string
  label: string
  hint: string
  blur: number
  saturation: number
  surfaceAlpha: number
  borderAlpha: number
  thickness: number
  radius: number
  shadow: number
}

type BackdropPreset = {
  id: string
  label: string
  background: string
  foreground: string
  muted: string
}

const GLASS_PRESETS: GlassPreset[] = [
  {
    id: "air",
    label: "轻盈",
    hint: "适合浮层与小卡片",
    blur: 14,
    saturation: 150,
    surfaceAlpha: 0.16,
    borderAlpha: 0.42,
    thickness: 0.34,
    radius: 26,
    shadow: 0.18,
  },
  {
    id: "clear",
    label: "清透",
    hint: "背景纹理保留更多",
    blur: 10,
    saturation: 185,
    surfaceAlpha: 0.12,
    borderAlpha: 0.52,
    thickness: 0.22,
    radius: 24,
    shadow: 0.14,
  },
  {
    id: "soft",
    label: "柔雾",
    hint: "更温和的乳白玻璃",
    blur: 24,
    saturation: 135,
    surfaceAlpha: 0.24,
    borderAlpha: 0.34,
    thickness: 0.48,
    radius: 30,
    shadow: 0.2,
  },
  {
    id: "deep",
    label: "深邃",
    hint: "适合深色背景",
    blur: 30,
    saturation: 210,
    surfaceAlpha: 0.09,
    borderAlpha: 0.28,
    thickness: 0.58,
    radius: 32,
    shadow: 0.34,
  },
]

const BACKDROPS: BackdropPreset[] = [
  {
    id: "pearl",
    label: "珍珠",
    background:
      "radial-gradient(80% 90% at 18% 18%, rgba(170,199,255,.98) 0%, rgba(170,199,255,0) 56%), radial-gradient(80% 100% at 82% 82%, rgba(245,183,209,.95) 0%, rgba(245,183,209,0) 58%), linear-gradient(135deg,#efe8ff 0%,#c9e7ff 52%,#f6dbe8 100%)",
    foreground: "#15161a",
    muted: "rgba(21,22,26,.52)",
  },
  {
    id: "sea",
    label: "海雾",
    background:
      "radial-gradient(90% 100% at 12% 8%, rgba(191,235,236,.9) 0%, rgba(191,235,236,0) 54%), radial-gradient(85% 100% at 86% 88%, rgba(90,133,179,.72) 0%, rgba(90,133,179,0) 56%), linear-gradient(145deg,#d9f1eb 0%,#9cc5d8 54%,#5c7897 100%)",
    foreground: "#101820",
    muted: "rgba(16,24,32,.5)",
  },
  {
    id: "orchid",
    label: "兰雾",
    background:
      "radial-gradient(90% 100% at 18% 18%, rgba(239,203,236,.96) 0%, rgba(239,203,236,0) 52%), radial-gradient(90% 100% at 84% 80%, rgba(119,109,180,.76) 0%, rgba(119,109,180,0) 55%), linear-gradient(145deg,#f1d8e9 0%,#b9b6df 50%,#6e6d9b 100%)",
    foreground: "#18151d",
    muted: "rgba(24,21,29,.5)",
  },
  {
    id: "graphite",
    label: "石墨",
    background:
      "radial-gradient(80% 90% at 18% 18%, rgba(118,138,165,.74) 0%, rgba(118,138,165,0) 54%), radial-gradient(80% 90% at 80% 82%, rgba(59,72,89,.88) 0%, rgba(59,72,89,0) 58%), linear-gradient(145deg,#4e5a69 0%,#29323d 54%,#161b22 100%)",
    foreground: "#f5f7fa",
    muted: "rgba(245,247,250,.58)",
  },
]

const DEFAULTS = {
  blur: 18,
  saturation: 180,
  surfaceAlpha: 0.18,
  borderAlpha: 0.38,
  thickness: 0.42,
  radius: 28,
  shadow: 0.22,
  darkGlass: false,
  highlight: true,
}

function formatNumber(value: number, digits = 2) {
  return Number(value.toFixed(digits))
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit = "",
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (value: number) => void
}) {
  const progress = ((value - min) / (max - min)) * 100

  return (
    <label className="block">
      <div className="mb-3 flex items-end justify-between gap-4">
        <span className="text-[12px] font-medium text-[#252522]">{label}</span>
        <span className="font-mono text-[11px] tabular-nums text-black/42">
          {formatNumber(value, step < 1 ? 2 : 0)}
          {unit}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="glass-slider h-1.5 w-full cursor-pointer appearance-none rounded-full bg-black/[0.07]"
        style={{ "--slider-progress": `${progress}%` } as CSSProperties}
      />
    </label>
  )
}

export default function LiquidGlassPage() {
  const [blur, setBlur] = useState(DEFAULTS.blur)
  const [saturation, setSaturation] = useState(DEFAULTS.saturation)
  const [surfaceAlpha, setSurfaceAlpha] = useState(DEFAULTS.surfaceAlpha)
  const [borderAlpha, setBorderAlpha] = useState(DEFAULTS.borderAlpha)
  const [thickness, setThickness] = useState(DEFAULTS.thickness)
  const [radius, setRadius] = useState(DEFAULTS.radius)
  const [shadow, setShadow] = useState(DEFAULTS.shadow)
  const [darkGlass, setDarkGlass] = useState(DEFAULTS.darkGlass)
  const [highlight, setHighlight] = useState(DEFAULTS.highlight)
  const [backdropId, setBackdropId] = useState("pearl")
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const backdrop = useMemo(
    () => BACKDROPS.find((item) => item.id === backdropId) ?? BACKDROPS[0],
    [backdropId],
  )

  const glassBackground = darkGlass
    ? `color-mix(in oklab, black ${Math.round(surfaceAlpha * 100)}%, transparent)`
    : `color-mix(in oklab, white ${Math.round(surfaceAlpha * 100)}%, transparent)`

  const glassText = darkGlass ? "#ffffff" : backdrop.foreground

  const cssOutput = useMemo(
    () => `.liquid-glass {
  position: relative;
  overflow: hidden;
  color: ${darkGlass ? "#ffffff" : "#17181b"};
  background: ${glassBackground};
  backdrop-filter: blur(${blur}px) saturate(${saturation}%);
  -webkit-backdrop-filter: blur(${blur}px) saturate(${saturation}%);
  border: 1px solid rgba(255, 255, 255, ${formatNumber(borderAlpha, 2)});
  border-radius: ${radius}px;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,${formatNumber(0.34 + thickness * 0.28, 3)}),
    inset 0 -18px 38px rgba(255,255,255,${formatNumber(thickness * 0.12, 3)}),
    0 28px 70px rgba(16,24,40,${formatNumber(shadow, 2)});
}

.liquid-glass::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background:
    linear-gradient(
      135deg,
      rgba(255,255,255,${highlight ? formatNumber(0.18 + thickness * 0.28, 3) : 0}) 0%,
      rgba(255,255,255,0) 42%
    );
}

@media (prefers-reduced-transparency: reduce) {
  .liquid-glass {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    background: ${darkGlass ? "#202226" : "#eef0f3"};
  }
}`,
    [
      blur,
      saturation,
      surfaceAlpha,
      borderAlpha,
      thickness,
      radius,
      shadow,
      darkGlass,
      highlight,
      glassBackground,
    ],
  )

  const cardStyle = {
    "--glass-radius": `${radius}px`,
    "--glass-background": glassBackground,
    "--glass-blur": `${blur}px`,
    "--glass-saturation": `${saturation}%`,
    "--glass-border-alpha": borderAlpha,
    "--glass-top-highlight": 0.34 + thickness * 0.28,
    "--glass-bottom-highlight": thickness * 0.12,
    "--glass-shadow": shadow,
    "--glass-highlight-alpha": highlight ? 0.18 + thickness * 0.28 : 0,
    "--glass-text": glassText,
  } as CSSProperties

  const applyPreset = (preset: GlassPreset) => {
    setBlur(preset.blur)
    setSaturation(preset.saturation)
    setSurfaceAlpha(preset.surfaceAlpha)
    setBorderAlpha(preset.borderAlpha)
    setThickness(preset.thickness)
    setRadius(preset.radius)
    setShadow(preset.shadow)
    setActivePreset(preset.id)
  }

  const reset = () => {
    setBlur(DEFAULTS.blur)
    setSaturation(DEFAULTS.saturation)
    setSurfaceAlpha(DEFAULTS.surfaceAlpha)
    setBorderAlpha(DEFAULTS.borderAlpha)
    setThickness(DEFAULTS.thickness)
    setRadius(DEFAULTS.radius)
    setShadow(DEFAULTS.shadow)
    setDarkGlass(DEFAULTS.darkGlass)
    setHighlight(DEFAULTS.highlight)
    setBackdropId("pearl")
    setActivePreset(null)
  }

  const copyCss = async () => {
    try {
      await navigator.clipboard.writeText(cssOutput)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f3f1ec] text-[#171714]">
      <style>{`
        .glass-slider {
          background:
            linear-gradient(
              90deg,
              #242421 0%,
              #242421 var(--slider-progress),
              rgba(0,0,0,.07) var(--slider-progress),
              rgba(0,0,0,.07) 100%
            );
        }

        .glass-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 15px;
          height: 15px;
          border-radius: 999px;
          background: #f8f7f3;
          border: 1px solid rgba(0,0,0,.18);
          box-shadow: 0 2px 7px rgba(0,0,0,.10);
        }

        .glass-slider::-moz-range-thumb {
          width: 15px;
          height: 15px;
          border-radius: 999px;
          background: #f8f7f3;
          border: 1px solid rgba(0,0,0,.18);
          box-shadow: 0 2px 7px rgba(0,0,0,.10);
        }

        .liquid-preview-card {
          position: relative;
          overflow: hidden;
          border-radius: var(--glass-radius);
          color: var(--glass-text);
          background: var(--glass-background);
          backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturation));
          -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturation));
          border: 1px solid rgba(255,255,255,var(--glass-border-alpha));
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,var(--glass-top-highlight)),
            inset 0 -18px 38px rgba(255,255,255,var(--glass-bottom-highlight)),
            0 28px 70px rgba(16,24,40,var(--glass-shadow));
        }

        .liquid-preview-card::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: inherit;
          background:
            linear-gradient(
              135deg,
              rgba(255,255,255,var(--glass-highlight-alpha)) 0%,
              rgba(255,255,255,0) 42%
            );
        }

        .preview-grid {
          background-image:
            linear-gradient(rgba(255,255,255,.11) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.11) 1px, transparent 1px);
          background-size: 36px 36px;
          mask-image: linear-gradient(to bottom, black, transparent 86%);
        }

        @media (prefers-reduced-transparency: reduce) {
          .liquid-preview-card {
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
          }
        }
      `}</style>

      <div className="mx-auto max-w-[1480px] px-4 py-7 sm:px-6 lg:px-8">
        <Breadcrumb />

        <header className="mt-6 flex flex-col gap-5 border-b border-black/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[10px] font-medium tracking-[0.18em] text-black/28">CSS 工具 / 视觉实验</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] sm:text-[42px]">
              Liquid Glass
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-black/42">
              用更克制的方式调试玻璃层次。选择质感、背景和细节参数，实时得到可直接使用的 CSS。
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={reset}
              className="border border-black/10 bg-white/40 px-4 py-2.5 text-xs font-medium text-black/48 transition hover:bg-white hover:text-black"
            >
              恢复默认
            </button>
            <button
              type="button"
              onClick={copyCss}
              className="bg-[#1d1d1a] px-4 py-2.5 text-xs font-medium text-white transition hover:bg-black"
            >
              {copied ? "已复制 CSS" : "复制 CSS"}
            </button>
          </div>
        </header>

        <div className="mt-5 grid gap-5 xl:grid-cols-[330px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <section className="border border-black/10 bg-[#faf9f5] p-4">
              <div className="mb-4">
                <div className="text-[10px] font-medium tracking-[0.15em] text-black/28">质感预设</div>
                <div className="mt-1 text-sm font-semibold">先选择一个方向</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {GLASS_PRESETS.map((preset) => {
                  const active = activePreset === preset.id
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className={`min-h-[88px] border p-3 text-left transition ${active ? "border-black bg-[#20201d] text-white" : "border-black/8 bg-white/40 hover:border-black/18 hover:bg-white"}`}
                    >
                      <div className="text-xs font-semibold">{preset.label}</div>
                      <div className={`mt-2 text-[10px] leading-4 ${active ? "text-white/48" : "text-black/32"}`}>
                        {preset.hint}
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="border border-black/10 bg-[#faf9f5] p-4">
              <div className="mb-5">
                <div className="text-[10px] font-medium tracking-[0.15em] text-black/28">细节参数</div>
                <div className="mt-1 text-sm font-semibold">玻璃层次</div>
              </div>

              <div className="space-y-6">
                <Slider label="模糊" value={blur} min={0} max={40} step={1} unit="px" onChange={(value) => { setBlur(value); setActivePreset(null) }} />
                <Slider label="饱和度" value={saturation} min={80} max={280} step={5} unit="%" onChange={(value) => { setSaturation(value); setActivePreset(null) }} />
                <Slider label="表面透明度" value={surfaceAlpha} min={0.04} max={0.34} step={0.01} onChange={(value) => { setSurfaceAlpha(value); setActivePreset(null) }} />
                <Slider label="边缘高光" value={borderAlpha} min={0} max={0.8} step={0.01} onChange={(value) => { setBorderAlpha(value); setActivePreset(null) }} />
                <Slider label="玻璃厚度" value={thickness} min={0} max={1} step={0.01} onChange={(value) => { setThickness(value); setActivePreset(null) }} />
                <Slider label="圆角" value={radius} min={8} max={48} step={1} unit="px" onChange={(value) => { setRadius(value); setActivePreset(null) }} />
                <Slider label="阴影" value={shadow} min={0} max={0.5} step={0.01} onChange={(value) => { setShadow(value); setActivePreset(null) }} />
              </div>
            </section>

            <section className="border border-black/10 bg-[#faf9f5] p-4">
              <div className="text-[10px] font-medium tracking-[0.15em] text-black/28">材质选项</div>

              <div className="mt-4 divide-y divide-black/[0.07]">
                <label className="flex cursor-pointer items-center justify-between gap-4 py-3 first:pt-0">
                  <div>
                    <div className="text-xs font-medium">深色玻璃</div>
                    <div className="mt-1 text-[10px] text-black/30">将表面改为深色透明材质</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={darkGlass}
                    onChange={(event) => setDarkGlass(event.target.checked)}
                    className="h-4 w-4 accent-[#20201d]"
                  />
                </label>

                <label className="flex cursor-pointer items-center justify-between gap-4 py-3 last:pb-0">
                  <div>
                    <div className="text-xs font-medium">斜向高光</div>
                    <div className="mt-1 text-[10px] text-black/30">增加轻微的表面反射</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={highlight}
                    onChange={(event) => setHighlight(event.target.checked)}
                    className="h-4 w-4 accent-[#20201d]"
                  />
                </label>
              </div>
            </section>
          </aside>

          <div className="min-w-0 space-y-4">
            <section className="overflow-hidden border border-black/10 bg-[#faf9f5]">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 px-4 py-3">
                <div>
                  <div className="text-[10px] font-medium tracking-[0.15em] text-black/28">实时预览</div>
                  <div className="mt-1 text-sm font-semibold">换一个背景，看玻璃真正的层次</div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {BACKDROPS.map((item) => {
                    const active = item.id === backdropId
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setBackdropId(item.id)}
                        className={`flex items-center gap-2 border px-3 py-2 text-[10px] font-medium transition ${active ? "border-black bg-[#20201d] text-white" : "border-black/8 bg-white/45 text-black/44 hover:border-black/18"}`}
                      >
                        <span
                          className="h-3 w-3 rounded-full border border-white/30 shadow-sm"
                          style={{ background: item.background }}
                        />
                        {item.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div
                className="relative flex min-h-[650px] items-center justify-center overflow-hidden p-5 sm:p-8 lg:min-h-[720px]"
                style={{ background: backdrop.background }}
              >
                <div className="preview-grid pointer-events-none absolute inset-0 opacity-45" />

                <div className="pointer-events-none absolute left-[8%] top-[13%] h-28 w-28 rounded-full border border-white/18 bg-white/10 backdrop-blur-[2px]" />
                <div className="pointer-events-none absolute bottom-[12%] right-[9%] h-40 w-40 rounded-full border border-white/12 bg-black/[0.05]" />
                <div className="pointer-events-none absolute right-[18%] top-[18%] text-[clamp(58px,8vw,126px)] font-semibold tracking-[-0.08em] text-white/14">
                  26
                </div>

                <div
                  className="liquid-preview-card relative z-10 w-full max-w-[520px] px-7 py-7 sm:px-8 sm:py-8"
                  style={cardStyle}
                >
                  <div className="relative z-10">
                    <div className="flex items-start justify-between gap-5">
                      <div>
                        <div className="text-[10px] font-semibold tracking-[0.18em] opacity-45">BITLEAP / GLASS</div>
                        <div className="mt-3 text-[28px] font-semibold tracking-[-0.045em] sm:text-[34px]">Liquid surface</div>
                      </div>

                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-current/10 bg-white/10">
                        <svg viewBox="0 0 24 24" className="h-4 w-4 opacity-60" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M7 17 17 7M9 7h8v8" />
                        </svg>
                      </div>
                    </div>

                    <p className="mt-5 max-w-[350px] text-[13px] leading-6 opacity-52">
                      一层安静的玻璃。背景仍然可见，但信息始终保持在前面。
                    </p>

                    <div className="mt-9 grid grid-cols-3 gap-2">
                      {[
                        ["BLUR", `${blur}px`],
                        ["SAT", `${saturation}%`],
                        ["ALPHA", formatNumber(surfaceAlpha, 2)],
                      ].map(([label, value]) => (
                        <div key={label} className="border-t border-current/12 pt-3">
                          <div className="text-[9px] tracking-[0.14em] opacity-35">{label}</div>
                          <div className="mt-1 font-mono text-[11px] opacity-68">{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div
                  className="pointer-events-none absolute bottom-5 left-5 text-[10px] tracking-[0.12em]"
                  style={{ color: backdrop.muted }}
                >
                  BACKDROP / {backdrop.label.toUpperCase()}
                </div>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div className="min-w-0 border border-black/10 bg-[#20201d] text-[#e9eadf]">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                  <div>
                    <div className="text-[10px] font-medium tracking-[0.15em] text-white/30">CSS OUTPUT</div>
                    <div className="mt-1 text-xs text-white/58">可直接复制到项目中</div>
                  </div>
                  <button
                    type="button"
                    onClick={copyCss}
                    className="border border-white/12 px-3 py-2 text-[10px] font-medium text-white/62 transition hover:bg-white hover:text-black"
                  >
                    {copied ? "已复制" : "复制"}
                  </button>
                </div>

                <pre className="max-h-[360px] overflow-auto p-4 text-[11px] leading-5 text-[#cddcae]">
                  <code>{cssOutput}</code>
                </pre>
              </div>

              <div className="border border-black/10 bg-[#e7e4dc] p-4">
                <div className="text-[10px] font-medium tracking-[0.15em] text-black/28">说明</div>
                <div className="mt-4 space-y-4 text-[11px] leading-5 text-black/45">
                  <p>使用 backdrop-filter、color-mix 与多层 inset shadow 构建玻璃质感。</p>
                  <p>如果浏览器启用了“减少透明度”，CSS 会自动降级成不透明背景。</p>
                  <p>真正的玻璃效果取决于玻璃后方是否有足够的颜色、纹理和明暗变化。</p>
                </div>

                <div className="mt-7 border-t border-black/10 pt-4">
                  <div className="text-[10px] text-black/28">推荐</div>
                  <div className="mt-2 text-xs font-medium">不要把所有元素都做成玻璃。</div>
                  <p className="mt-2 text-[10px] leading-5 text-black/34">把它留给导航、浮层和少量重点组件，质感会更干净。</p>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="mt-8 border-t border-black/10 pt-5">
          <FooterNote />
        </div>
      </div>
    </main>
  )
}
