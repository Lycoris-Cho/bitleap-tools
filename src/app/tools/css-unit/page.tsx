"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type Unit = "px" | "rem" | "em" | "vw" | "vh" | "vmin" | "vmax" | "%" | "pt"
type CopyKey = "value" | "css" | "tailwind" | "scale" | "clamp" | "report" | string | null
type PreviewMode = "type" | "box" | "spacing"
type ScalePreset = "4pt" | "8pt" | "type" | "custom"

type ConverterSettings = {
  rootFont: number
  parentFont: number
  viewportWidth: number
  viewportHeight: number
  containerWidth: number
  precision: number
}

type ClampSettings = {
  minPx: number
  maxPx: number
  minViewport: number
  maxViewport: number
}

type UnitResult = {
  unit: Unit
  label: string
  value: number
  display: string
  note: string
}

const DEFAULT_SETTINGS: ConverterSettings = {
  rootFont: 16,
  parentFont: 16,
  viewportWidth: 1440,
  viewportHeight: 900,
  containerWidth: 1200,
  precision: 4,
}

const DEFAULT_CLAMP: ClampSettings = {
  minPx: 16,
  maxPx: 32,
  minViewport: 375,
  maxViewport: 1440,
}

const UNIT_META: Record<Unit, { label: string; note: string }> = {
  px: { label: "PX", note: "绝对像素值，常用于边框、图标和固定间距。" },
  rem: { label: "REM", note: "基于根字号 root font-size，适合全站字号与间距。" },
  em: { label: "EM", note: "基于父级或当前元素字号，适合组件内部相对缩放。" },
  vw: { label: "VW", note: "基于视口宽度，1vw = viewport width / 100。" },
  vh: { label: "VH", note: "基于视口高度，1vh = viewport height / 100。" },
  vmin: { label: "VMIN", note: "基于视口较短边，适合横竖屏自适应。" },
  vmax: { label: "VMAX", note: "基于视口较长边，适合大屏视觉尺度。" },
  "%": { label: "%", note: "基于容器宽度，适合局部布局比例。" },
  pt: { label: "PT", note: "排版点数，1pt ≈ 1.333px，常见于设计稿换算。" },
}

const QUICK_VALUES = [4, 8, 12, 14, 16, 18, 20, 24, 32, 40, 48, 64, 80, 96, 120, 160]

const PRESETS = [
  {
    name: "网页默认",
    desc: "16px 根字号，1440px 桌面视口。",
    settings: DEFAULT_SETTINGS,
  },
  {
    name: "移动设计稿",
    desc: "375px 宽度，用于移动端 vw 换算。",
    settings: { ...DEFAULT_SETTINGS, viewportWidth: 375, viewportHeight: 812, containerWidth: 343 },
  },
  {
    name: "桌面设计稿",
    desc: "1920px 视口，常用于大屏稿。",
    settings: { ...DEFAULT_SETTINGS, viewportWidth: 1920, viewportHeight: 1080, containerWidth: 1200 },
  },
  {
    name: "大字号系统",
    desc: "18px 根字号，更适合可读性优先页面。",
    settings: { ...DEFAULT_SETTINGS, rootFont: 18, parentFont: 18 },
  },
]

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function round(value: number, precision: number) {
  const factor = 10 ** precision
  return Math.round(value * factor) / factor
}

function trimNumber(value: number, precision: number) {
  const rounded = round(value, precision)
  if (Object.is(rounded, -0)) return "0"
  return String(rounded)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value)
}

function toPx(value: number, unit: Unit, settings: ConverterSettings) {
  if (unit === "px") return value
  if (unit === "rem") return value * settings.rootFont
  if (unit === "em") return value * settings.parentFont
  if (unit === "vw") return (value / 100) * settings.viewportWidth
  if (unit === "vh") return (value / 100) * settings.viewportHeight
  if (unit === "vmin") return (value / 100) * Math.min(settings.viewportWidth, settings.viewportHeight)
  if (unit === "vmax") return (value / 100) * Math.max(settings.viewportWidth, settings.viewportHeight)
  if (unit === "%") return (value / 100) * settings.containerWidth
  return value * (96 / 72)
}

function fromPx(px: number, unit: Unit, settings: ConverterSettings) {
  if (unit === "px") return px
  if (unit === "rem") return px / settings.rootFont
  if (unit === "em") return px / settings.parentFont
  if (unit === "vw") return (px / settings.viewportWidth) * 100
  if (unit === "vh") return (px / settings.viewportHeight) * 100
  if (unit === "vmin") return (px / Math.min(settings.viewportWidth, settings.viewportHeight)) * 100
  if (unit === "vmax") return (px / Math.max(settings.viewportWidth, settings.viewportHeight)) * 100
  if (unit === "%") return (px / settings.containerWidth) * 100
  return px * (72 / 96)
}

function displayValue(value: number, unit: Unit, precision: number) {
  return `${trimNumber(value, precision)}${unit}`
}

function buildResults(px: number, settings: ConverterSettings): UnitResult[] {
  return (Object.keys(UNIT_META) as Unit[]).map((unit) => {
    const value = fromPx(px, unit, settings)

    return {
      unit,
      label: UNIT_META[unit].label,
      value,
      display: displayValue(value, unit, settings.precision),
      note: UNIT_META[unit].note,
    }
  })
}

function buildClamp({ minPx, maxPx, minViewport, maxViewport }: ClampSettings, rootFont: number, precision: number) {
  const slope = (maxPx - minPx) / (maxViewport - minViewport)
  const vw = slope * 100
  const intercept = minPx - slope * minViewport
  const minRem = minPx / rootFont
  const maxRem = maxPx / rootFont
  const preferred = `${trimNumber(intercept / rootFont, precision)}rem + ${trimNumber(vw, precision)}vw`

  return `clamp(${trimNumber(minRem, precision)}rem, ${preferred}, ${trimNumber(maxRem, precision)}rem)`
}

function scaleValues(preset: ScalePreset, customBase: number) {
  if (preset === "4pt") return [4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 64, 80]
  if (preset === "8pt") return [8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 120, 160]
  if (preset === "type") return [12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72, 96]
  return Array.from({ length: 12 }, (_, index) => customBase * (index + 1))
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

function safeNumber(value: string, fallback: number, min: number, max: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return clamp(parsed, min, max)
}

function SettingInput({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  unit: string
  onChange: (value: number) => void
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[8px] font-semibold tracking-[.12em] text-black/24">{label}</span>
      <div className="flex items-center rounded-full border border-black/[.08] bg-white/35 px-4 py-2.5">
        <input value={value} min={min} max={max} type="number" onChange={(event) => onChange(safeNumber(event.target.value, value, min, max))} className="min-w-0 flex-1 bg-transparent font-mono text-[10px] text-black/68 outline-none" />
        <span className="text-[8px] text-black/27">{unit}</span>
      </div>
    </label>
  )
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
        <span className="unit-num font-mono font-semibold text-[#52685d]">{trimNumber(value, 2)}{unit}</span>
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
      <div className={`unit-num mt-3 break-all font-mono text-[13px] font-semibold ${toneClass}`}>{value}</div>
    </div>
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
      <pre className="unit-dark-scroll max-h-44 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-5 text-[#cbd8cd]">{value}</pre>
    </article>
  )
}

export default function CssUnitConvertPage() {
  const [settings, setSettings] = useState<ConverterSettings>(DEFAULT_SETTINGS)
  const [sourceUnit, setSourceUnit] = useState<Unit>("px")
  const [sourceValue, setSourceValue] = useState("24")
  const [previewMode, setPreviewMode] = useState<PreviewMode>("type")
  const [scalePreset, setScalePreset] = useState<ScalePreset>("8pt")
  const [customScaleBase, setCustomScaleBase] = useState(6)
  const [clampSettings, setClampSettings] = useState<ClampSettings>(DEFAULT_CLAMP)
  const [copied, setCopied] = useState<CopyKey>(null)
  const [error, setError] = useState("")

  const pageRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const numericValue = Number(sourceValue)
  const isValid = sourceValue.trim() !== "" && Number.isFinite(numericValue)
  const sourcePx = useMemo(() => (isValid ? toPx(numericValue, sourceUnit, settings) : 0), [isValid, numericValue, settings, sourceUnit])
  const results = useMemo(() => (isValid ? buildResults(sourcePx, settings) : []), [isValid, settings, sourcePx])
  const primaryResult = useMemo(() => results.find((item) => item.unit === "rem")?.display ?? "—", [results])
  const scale = useMemo(() => scaleValues(scalePreset, customScaleBase), [customScaleBase, scalePreset])
  const clampCode = useMemo(() => buildClamp(clampSettings, settings.rootFont, settings.precision), [clampSettings, settings.precision, settings.rootFont])
  const cssVars = useMemo(
    () =>
      [
        ":root {",
        `  --root-font-size: ${settings.rootFont}px;`,
        `  --space-current: ${displayValue(sourcePx, "px", settings.precision)};`,
        `  --space-current-rem: ${displayValue(fromPx(sourcePx, "rem", settings), "rem", settings.precision)};`,
        `  --fluid-current: ${clampCode};`,
        "}",
      ].join("\n"),
    [clampCode, settings, sourcePx],
  )
  const tailwindValue = useMemo(() => {
    const rem = displayValue(fromPx(sourcePx, "rem", settings), "rem", settings.precision)
    const px = displayValue(sourcePx, "px", settings.precision)
    return `className="text-[${rem}] p-[${px}]"`
  }, [settings, sourcePx])

  const scaleText = useMemo(
    () =>
      scale
        .map((px) => {
          const rem = fromPx(px, "rem", settings)
          const vw = fromPx(px, "vw", settings)
          return `${String(px).padStart(4, " ")}px  =  ${displayValue(rem, "rem", settings.precision).padEnd(10, " ")}  =  ${displayValue(vw, "vw", settings.precision)}`
        })
        .join("\n"),
    [scale, settings],
  )

  const report = useMemo(
    () =>
      [
        "BitLeap CSS Unit Studio",
        "",
        `Input: ${sourceValue || "—"}${sourceUnit}`,
        `Root font-size: ${settings.rootFont}px`,
        `Parent font-size: ${settings.parentFont}px`,
        `Viewport: ${settings.viewportWidth}×${settings.viewportHeight}px`,
        `Container width: ${settings.containerWidth}px`,
        `Precision: ${settings.precision}`,
        "",
        "Conversions:",
        ...results.map((item) => `${item.label}: ${item.display}`),
        "",
        "Fluid clamp:",
        clampCode,
        "",
        "CSS variables:",
        cssVars,
        "",
        "Tailwind:",
        tailwindValue,
      ].join("\n"),
    [clampCode, cssVars, results, settings, sourceUnit, sourceValue, tailwindValue],
  )

  useEffect(() => {
    if (!pageRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      gsap.from(".unit-intro", {
        opacity: 0,
        y: 18,
        duration: 0.72,
        stagger: 0.055,
        ease: "power3.out",
      })

      gsap.to(".unit-orbit", {
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
  }, [previewMode, sourcePx, settings.rootFont])

  const patchSettings = (patch: Partial<ConverterSettings>) => {
    setSettings((current) => ({
      ...current,
      ...patch,
    }))
  }

  const patchClamp = (patch: Partial<ClampSettings>) => {
    setClampSettings((current) => ({
      ...current,
      ...patch,
    }))
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

  const setQuickValue = (px: number) => {
    setSourceUnit("px")
    setSourceValue(String(px))
  }

  const reset = () => {
    setSettings(DEFAULT_SETTINGS)
    setClampSettings(DEFAULT_CLAMP)
    setSourceUnit("px")
    setSourceValue("24")
    setPreviewMode("type")
    setScalePreset("8pt")
    setCustomScaleBase(6)
    setCopied(null)
    setError("")
  }

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setSettings(preset.settings)
  }

  return (
    <div ref={pageRef} className="min-h-screen overflow-hidden bg-[#f0eee8] text-[#22231f] selection:bg-[#22231f] selection:text-white">
      <style>{`
        .unit-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
        .unit-scroll::-webkit-scrollbar-track { background: transparent; }
        .unit-scroll::-webkit-scrollbar-thumb { background: rgba(34,35,31,.13); border-radius: 999px; }
        .unit-dark-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.13); }
        .unit-num { font-variant-numeric: tabular-nums lining-nums; }
        .unit-ruler {
          background-image:
            linear-gradient(90deg, rgba(34,35,31,.16) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,35,31,.06) 1px, transparent 1px);
          background-size: 80px 100%, 16px 100%;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_84%_10%,rgba(178,141,72,.08),transparent_25%),radial-gradient(circle_at_8%_88%,rgba(82,104,93,.08),transparent_29%)]" />
        <div className="unit-orbit absolute right-[-18vw] top-[-22vw] h-[56vw] w-[56vw] rounded-full border border-black/[.035]">
          <span className="absolute left-[18%] top-[44%] h-2 w-2 rounded-full bg-[#52685d]/30" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1600px] px-5 pb-10 pt-6 sm:px-8">
        <div className="unit-intro">
          <Breadcrumb />
        </div>

        <header className="unit-intro mt-8 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.76fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/25">CSS UNIT STUDIO</div>
            <h1 className="mt-4 text-[clamp(48px,6.2vw,88px)] font-semibold leading-[1.02] tracking-[-.055em]">
              单位换算，
              <br />
              顺便看尺度。
            </h1>
          </div>

          <div>
            <p className="max-w-[580px] text-[11px] leading-6 text-black/40">
              不只做 px / rem / em / vw 换算，也把 viewport、容器宽度、字体基准、fluid clamp、比例尺和 Tailwind 输出放到同一个工作台。
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button key={preset.name} type="button" onClick={() => applyPreset(preset)} className="rounded-full border border-black/[.08] px-3.5 py-2 text-[8px] font-semibold text-black/34 transition hover:bg-white/50 hover:text-black">{preset.name}</button>
              ))}
            </div>
          </div>
        </header>

        <section className="unit-intro mt-7">
          <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
            <aside className="min-w-0 space-y-4">
              <div className="rounded-[30px] border border-black/[.075] bg-white/24 p-5">
                <div className="text-[8px] font-semibold tracking-[.14em] text-black/24">INPUT</div>

                <div className="mt-5 grid grid-cols-[1fr_120px] gap-3">
                  <input value={sourceValue} onChange={(event) => setSourceValue(event.target.value)} inputMode="decimal" className="min-w-0 rounded-[22px] border border-black/[.08] bg-white/40 px-5 py-5 font-mono text-[32px] leading-none tracking-[-.05em] text-black/72 outline-none focus:border-black/20" placeholder="24" />
                  <select value={sourceUnit} onChange={(event) => setSourceUnit(event.target.value as Unit)} className="rounded-[22px] border border-black/[.08] bg-white/40 px-4 py-4 font-mono text-[12px] font-semibold text-black/62 outline-none">
                    {(Object.keys(UNIT_META) as Unit[]).map((unit) => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>

                {!isValid && (
                  <p className="mt-3 rounded-[16px] border border-[#965744]/15 bg-[#965744]/8 px-4 py-3 text-[9px] leading-5 text-[#965744]">请输入有效数字。</p>
                )}

                <div className="mt-4 grid grid-cols-4 gap-1.5">
                  {QUICK_VALUES.map((value) => (
                    <button key={value} type="button" onClick={() => setQuickValue(value)} className="rounded-[14px] bg-white/32 px-2 py-2.5 font-mono text-[8px] font-semibold text-black/34 transition hover:bg-white/60">{value}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[22px] border border-black/[.075] bg-black/[.06]">
                <StatBox label="PX" value={isValid ? displayValue(sourcePx, "px", settings.precision) : "—"} tone="green" />
                <StatBox label="REM" value={primaryResult} tone="gold" />
                <StatBox label="ROOT" value={`${settings.rootFont}px`} />
                <StatBox label="VIEWPORT" value={`${settings.viewportWidth}px`} />
              </div>

              <div className="rounded-[24px] border border-black/[.075] bg-white/24 p-5">
                <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">CONTEXT</div>
                <div className="mt-5 grid gap-4">
                  <SettingInput label="Root font-size" value={settings.rootFont} min={1} max={64} unit="px" onChange={(rootFont) => patchSettings({ rootFont })} />
                  <SettingInput label="Parent font-size" value={settings.parentFont} min={1} max={96} unit="px" onChange={(parentFont) => patchSettings({ parentFont })} />
                  <SettingInput label="Viewport width" value={settings.viewportWidth} min={240} max={7680} unit="px" onChange={(viewportWidth) => patchSettings({ viewportWidth })} />
                  <SettingInput label="Viewport height" value={settings.viewportHeight} min={240} max={4320} unit="px" onChange={(viewportHeight) => patchSettings({ viewportHeight })} />
                  <SettingInput label="Container width" value={settings.containerWidth} min={1} max={7680} unit="px" onChange={(containerWidth) => patchSettings({ containerWidth })} />
                  <Slider label="小数精度" value={settings.precision} min={0} max={6} unit="" onChange={(precision) => patchSettings({ precision })} />
                </div>
              </div>
            </aside>

            <div className="min-w-0">
              <div className="grid gap-px overflow-hidden rounded-[32px] border border-black/[.08] bg-black/[.08] lg:grid-cols-[.92fr_1.08fr]">
                <div className="bg-[#f4f1e9]">
                  <div className="flex h-12 items-center justify-between border-b border-black/[.065] px-5">
                    <span className="text-[8px] font-semibold tracking-[.13em] text-black/26">CONVERSIONS</span>
                    <span className="unit-num text-[8px] text-black/22">{isValid ? `${trimNumber(sourcePx, settings.precision)}px base` : "invalid"}</span>
                  </div>

                  <div className="unit-scroll h-[760px] overflow-auto p-5 sm:p-6">
                    <div className="grid gap-3 md:grid-cols-2">
                      {results.map((item) => (
                        <article key={item.unit} className="group rounded-[22px] border border-black/[.075] bg-white/24 p-4 transition hover:bg-white/45">
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div>
                              <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">{item.label}</div>
                              <code className="unit-num mt-2 block break-all font-mono text-[18px] font-semibold tracking-[-.035em] text-black/70">{item.display}</code>
                            </div>
                            <button type="button" onClick={() => copy(item.display, item.unit)} className="rounded-full border border-black/[.08] px-3 py-2 text-[8px] font-semibold text-black/30 transition hover:bg-[#22231f] hover:text-white">{copied === item.unit ? "✓" : "COPY"}</button>
                          </div>
                          <p className="text-[8px] leading-4 text-black/29">{item.note}</p>
                        </article>
                      ))}
                    </div>

                    <div className="mt-5 rounded-[24px] border border-black/[.075] bg-white/24 p-5">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">VISUAL PREVIEW</div>
                          <p className="mt-2 text-[8px] text-black/29">同一个数值在文字、方块、间距里的视觉参考。</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <TogglePill active={previewMode === "type"} label="文字" onClick={() => setPreviewMode("type")} />
                          <TogglePill active={previewMode === "box"} label="尺寸" onClick={() => setPreviewMode("box")} />
                          <TogglePill active={previewMode === "spacing"} label="间距" onClick={() => setPreviewMode("spacing")} />
                        </div>
                      </div>

                      <div ref={previewRef} className="unit-ruler overflow-hidden rounded-[22px] border border-black/[.07] bg-[#ebe7dd] p-6">
                        {previewMode === "type" && (
                          <div>
                            <div className="text-[8px] font-semibold tracking-[.12em] text-black/24">font-size: {displayValue(sourcePx, "px", settings.precision)}</div>
                            <p className="mt-4 max-w-[700px] font-semibold leading-[1.08] tracking-[-.055em] text-black/74" style={{ fontSize: clamp(sourcePx, 8, 120) }}>BitLeap Typography Preview</p>
                          </div>
                        )}

                        {previewMode === "box" && (
                          <div className="flex min-h-[220px] items-center justify-center">
                            <div className="grid place-items-center rounded-[24px] bg-[#52685d] text-white shadow-[0_22px_60px_rgba(82,104,93,.22)]" style={{ width: clamp(sourcePx, 4, 360), height: clamp(sourcePx, 4, 360) }}>
                              <span className="font-mono text-[10px]">{trimNumber(sourcePx, settings.precision)}px</span>
                            </div>
                          </div>
                        )}

                        {previewMode === "spacing" && (
                          <div className="space-y-4">
                            {[1, 2, 3].map((item) => (
                              <div key={item} className="rounded-[18px] bg-white/55 p-3">
                                <div className="h-10 rounded-[14px] bg-[#52685d]/75" style={{ marginLeft: clamp(sourcePx, 0, 240) }} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 rounded-[24px] border border-black/[.075] bg-white/24 p-5">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">SCALE TABLE</div>
                          <p className="mt-2 text-[8px] text-black/29">常用 spacing / type scale 快速换算。</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(["4pt", "8pt", "type", "custom"] as ScalePreset[]).map((item) => (
                            <TogglePill key={item} active={scalePreset === item} label={item} onClick={() => setScalePreset(item)} />
                          ))}
                        </div>
                      </div>

                      {scalePreset === "custom" && (
                        <div className="mb-4 max-w-xs">
                          <Slider label="自定义步进" value={customScaleBase} min={1} max={40} unit="px" onChange={setCustomScaleBase} />
                        </div>
                      )}

                      <div className="grid gap-2 md:grid-cols-3">
                        {scale.map((px) => (
                          <button key={px} type="button" onClick={() => setQuickValue(px)} className="rounded-[16px] border border-black/[.07] bg-white/25 p-3 text-left transition hover:bg-white/55">
                            <div className="unit-num font-mono text-[12px] font-semibold text-black/62">{px}px</div>
                            <div className="unit-num mt-1 font-mono text-[8px] text-black/30">{displayValue(fromPx(px, "rem", settings), "rem", settings.precision)}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#151714]">
                  <div className="flex h-12 items-center justify-between border-b border-white/[.065] px-5">
                    <span className="text-[8px] font-semibold tracking-[.13em] text-white/27">OUTPUT</span>
                    <span className="text-[8px] text-[#8fb69b]">CSS READY</span>
                  </div>

                  <div className="unit-dark-scroll h-[760px] overflow-auto p-4 sm:p-5">
                    <div className="space-y-4">
                      <OutputBlock label="CSS Variables" value={cssVars} copied={copied === "css"} onCopy={() => copy(cssVars, "css")} />
                      <OutputBlock label="Tailwind Arbitrary" value={tailwindValue} copied={copied === "tailwind"} onCopy={() => copy(tailwindValue, "tailwind")} />
                      <OutputBlock label="Scale Table" value={scaleText} copied={copied === "scale"} onCopy={() => copy(scaleText, "scale")} />

                      <article className="rounded-[20px] border border-white/[.065] bg-white/[.035] p-4">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <span className="text-[8px] font-semibold tracking-[.13em] text-white/24">Fluid clamp()</span>
                          <button type="button" onClick={() => copy(clampCode, "clamp")} className="text-[8px] font-semibold text-white/26 transition hover:text-white">{copied === "clamp" ? "✓ COPIED" : "COPY"}</button>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <Slider label="Min px" value={clampSettings.minPx} min={1} max={160} unit="px" onChange={(minPx) => patchClamp({ minPx })} />
                          <Slider label="Max px" value={clampSettings.maxPx} min={1} max={240} unit="px" onChange={(maxPx) => patchClamp({ maxPx })} />
                          <Slider label="Min viewport" value={clampSettings.minViewport} min={240} max={1440} step={5} unit="px" onChange={(minViewport) => patchClamp({ minViewport })} />
                          <Slider label="Max viewport" value={clampSettings.maxViewport} min={320} max={2560} step={10} unit="px" onChange={(maxViewport) => patchClamp({ maxViewport })} />
                        </div>

                        <pre className="unit-dark-scroll mt-4 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-[16px] bg-black/20 p-4 font-mono text-[10px] leading-5 text-[#cbd8cd]">{clampCode}</pre>
                      </article>

                      <OutputBlock label="Report" value={report} copied={copied === "report"} onCopy={() => copy(report, "report")} />

                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={reset} className="rounded-full px-4 py-3 text-[9px] font-semibold text-[#d49a88] transition hover:bg-[#d49a88]/8">重置</button>
                        <button type="button" onClick={() => downloadText(report, "bitleap-css-unit-report.txt")} className="rounded-full border border-white/[.08] px-4 py-3 text-[9px] font-semibold text-white/33 transition hover:bg-white hover:text-[#151714]">导出报告</button>
                      </div>

                      {error && (
                        <div className="rounded-[18px] border border-[#d49a88]/15 bg-[#d49a88]/8 p-4 text-[9px] leading-5 text-[#d49a88]">{error}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="unit-intro mt-12 grid gap-8 border-t border-black/10 pt-7 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">CONTEXT AWARE</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">rem、em、vw、vh、vmin、vmax 和百分比都需要上下文，这版把字号、视口和容器宽度全部显式放出来。</p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">FLUID CLAMP</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">内置 clamp 生成器，可以快速把最小 / 最大字号或间距转换为响应式 CSS。</p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">DESIGN SCALE</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">4pt、8pt、字体尺度和自定义步进可以直接生成 px / rem / vw 对照表。</p>
          </div>
        </section>

        <div className="mt-12 border-t border-black/[.08] pt-5">
          <FooterNote />
        </div>
      </div>
    </div>
  )
}
