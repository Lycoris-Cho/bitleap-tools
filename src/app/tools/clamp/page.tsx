"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type PropertyType = "font-size" | "gap" | "padding" | "border-radius"
type CopyKind = "value" | "declaration" | null

type Preset = {
  name: string
  minSize: number
  maxSize: number
  minWidth: number
  maxWidth: number
}

const PRESETS: Preset[] = [
  { name: "Body", minSize: 15, maxSize: 18, minWidth: 375, maxWidth: 1280 },
  { name: "Heading", minSize: 36, maxSize: 72, minWidth: 375, maxWidth: 1440 },
  { name: "Hero", minSize: 52, maxSize: 112, minWidth: 375, maxWidth: 1600 },
  { name: "Spacing", minSize: 16, maxSize: 48, minWidth: 375, maxWidth: 1440 },
]

const PROPERTY_OPTIONS: Array<{
  value: PropertyType
  label: string
  hint: string
}> = [
  { value: "font-size", label: "字号", hint: "font-size" },
  { value: "gap", label: "间距", hint: "gap" },
  { value: "padding", label: "内边距", hint: "padding" },
  { value: "border-radius", label: "圆角", hint: "border-radius" },
]

function round(value: number, digits = 4) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function formatNumber(value: number, digits = 4) {
  const rounded = round(value, digits)
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}

function computeFluid(
  minSize: number,
  maxSize: number,
  minWidth: number,
  maxWidth: number,
) {
  const widthRange = maxWidth - minWidth
  const sizeRange = maxSize - minSize

  if (
    !Number.isFinite(minSize) ||
    !Number.isFinite(maxSize) ||
    !Number.isFinite(minWidth) ||
    !Number.isFinite(maxWidth)
  ) {
    return { valid: false as const, error: "请输入有效数字。" }
  }

  if (minSize < 0 || maxSize < 0) {
    return { valid: false as const, error: "尺寸不能为负数。" }
  }

  if (maxSize <= minSize) {
    return {
      valid: false as const,
      error: "最大尺寸必须大于最小尺寸。",
    }
  }

  if (maxWidth <= minWidth) {
    return {
      valid: false as const,
      error: "最大视口必须大于最小视口。",
    }
  }

  const slope = (sizeRange / widthRange) * 100
  const intercept = minSize - (slope * minWidth) / 100
  const preferred = `${formatNumber(intercept)}px + ${formatNumber(slope)}vw`
  const clampValue = `clamp(${formatNumber(minSize)}px, ${preferred}, ${formatNumber(maxSize)}px)`

  return {
    valid: true as const,
    slope,
    intercept,
    preferred,
    clampValue,
  }
}

function getFluidValue(
  viewport: number,
  minSize: number,
  maxSize: number,
  minWidth: number,
  maxWidth: number,
) {
  if (viewport <= minWidth) return minSize
  if (viewport >= maxWidth) return maxSize

  const ratio = (viewport - minWidth) / (maxWidth - minWidth)
  return minSize + (maxSize - minSize) * ratio
}

function RangeField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}) {
  return (
    <div className="border-b border-black/[.075] py-4">
      <div className="mb-3 flex items-center justify-between gap-4">
        <span className="text-[9px] font-semibold tracking-[.08em] text-black/36">
          {label}
        </span>
        <div className="flex items-baseline gap-1">
          <input
            type="number"
            value={value}
            onChange={(event) => onChange(Number(event.target.value))}
            className="clamp-num w-16 bg-transparent text-right font-mono text-[11px] font-semibold outline-none"
          />
          <span className="text-[8px] text-black/26">px</span>
        </div>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        value={Math.max(min, Math.min(max, value))}
        onChange={(event) => onChange(Number(event.target.value))}
        className="clamp-range block w-full"
      />
    </div>
  )
}

export default function ClampPage() {
  const [minSize, setMinSize] = useState(16)
  const [maxSize, setMaxSize] = useState(32)
  const [minWidth, setMinWidth] = useState(375)
  const [maxWidth, setMaxWidth] = useState(1280)
  const [property, setProperty] = useState<PropertyType>("font-size")
  const [viewport, setViewport] = useState<number | null>(null)
  const [simulatedWidth, setSimulatedWidth] = useState(768)
  const [followViewport, setFollowViewport] = useState(true)
  const [copied, setCopied] = useState<CopyKind>(null)

  const pageRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<SVGSVGElement>(null)

  const formula = useMemo(
    () => computeFluid(minSize, maxSize, minWidth, maxWidth),
    [minSize, maxSize, minWidth, maxWidth],
  )

  const previewWidth = followViewport
    ? viewport ?? simulatedWidth
    : simulatedWidth

  const currentValue = useMemo(
    () =>
      formula.valid
        ? getFluidValue(
            previewWidth,
            minSize,
            maxSize,
            minWidth,
            maxWidth,
          )
        : 0,
    [
      formula.valid,
      previewWidth,
      minSize,
      maxSize,
      minWidth,
      maxWidth,
    ],
  )

  const declaration = formula.valid
    ? `${property}: ${formula.clampValue};`
    : ""

  useEffect(() => {
    const update = () => {
      const width = window.innerWidth
      setViewport(width)
      if (followViewport) setSimulatedWidth(width)
    }

    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [followViewport])

  useEffect(() => {
    if (
      !pageRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    const ctx = gsap.context(() => {
      gsap.from(".clamp-intro", {
        y: 22,
        opacity: 0,
        duration: 0.82,
        stagger: 0.06,
        ease: "power3.out",
      })

      gsap.to(".clamp-orbit-a", {
        rotation: 360,
        duration: 62,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })

      gsap.to(".clamp-orbit-b", {
        rotation: -360,
        duration: 92,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })
    }, pageRef)

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (
      !formula.valid ||
      !chartRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    const line = chartRef.current.querySelector<SVGPathElement>(".clamp-line")
    if (!line) return

    const length = line.getTotalLength()

    gsap.fromTo(
      line,
      {
        strokeDasharray: length,
        strokeDashoffset: length,
      },
      {
        strokeDashoffset: 0,
        duration: 0.72,
        ease: "power2.inOut",
      },
    )

    gsap.fromTo(
      ".clamp-value",
      { y: 8, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.32,
        ease: "power2.out",
        overwrite: true,
      },
    )
  }, [
    formula.valid,
    minSize,
    maxSize,
    minWidth,
    maxWidth,
    previewWidth,
  ])

  const copy = async (value: string, kind: CopyKind) => {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setCopied(kind)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {}
  }

  const applyPreset = (preset: Preset) => {
    setMinSize(preset.minSize)
    setMaxSize(preset.maxSize)
    setMinWidth(preset.minWidth)
    setMaxWidth(preset.maxWidth)

    if (preset.name === "Spacing") setProperty("gap")
    else setProperty("font-size")
  }

  const reset = () => {
    setMinSize(16)
    setMaxSize(32)
    setMinWidth(375)
    setMaxWidth(1280)
    setProperty("font-size")
    setFollowViewport(true)
  }

  const previewStyle = formula.valid
    ? property === "font-size"
      ? { fontSize: formula.clampValue }
      : property === "gap"
        ? { gap: formula.clampValue }
        : property === "padding"
          ? { padding: formula.clampValue }
          : { borderRadius: formula.clampValue }
    : {}

  const graph = useMemo(() => {
    const x1 = 80
    const x2 = 920
    const yBottom = 330
    const yTop = 90

    const viewportSpan = Math.max(1, maxWidth - minWidth)
    const valueSpan = Math.max(1e-9, maxSize - minSize)

    const toX = (width: number) =>
      x1 + ((width - minWidth) / viewportSpan) * (x2 - x1)

    const toY = (value: number) =>
      yBottom - ((value - minSize) / valueSpan) * (yBottom - yTop)

    const currentWidth = Math.max(
      minWidth,
      Math.min(maxWidth, previewWidth),
    )
    const current = getFluidValue(
      currentWidth,
      minSize,
      maxSize,
      minWidth,
      maxWidth,
    )

    return {
      path: `M ${x1} ${yBottom} L ${x2} ${yTop}`,
      x1,
      x2,
      yBottom,
      yTop,
      currentX: toX(currentWidth),
      currentY: toY(current),
    }
  }, [
    minWidth,
    maxWidth,
    minSize,
    maxSize,
    previewWidth,
  ])

  return (
    <div
      ref={pageRef}
      className="min-h-screen overflow-hidden bg-[#efede6] text-[#22231f] selection:bg-[#22231f] selection:text-white"
    >
      <style>{`
        .clamp-num { font-variant-numeric: tabular-nums lining-nums; }
        .clamp-range { appearance: none; height: 2px; border-radius: 999px; background: rgba(34,35,31,.14); }
        .clamp-range::-webkit-slider-thumb { appearance: none; width: 14px; height: 14px; border-radius: 999px; background: #22231f; cursor: pointer; }
        .clamp-range::-moz-range-thumb { width: 14px; height: 14px; border: 0; border-radius: 999px; background: #22231f; cursor: pointer; }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_12%,rgba(178,151,91,.10),transparent_27%),radial-gradient(circle_at_9%_88%,rgba(73,107,91,.08),transparent_31%)]" />
        <div className="clamp-orbit-a absolute right-[-20vw] top-[-24vw] h-[58vw] w-[58vw] rounded-full border border-black/[.04]">
          <span className="absolute left-[15%] top-[43%] h-2 w-2 rounded-full bg-[#b28d48]/38" />
        </div>
        <div className="clamp-orbit-b absolute bottom-[-26vw] left-[-19vw] h-[53vw] w-[53vw] rounded-full border border-black/[.032]">
          <span className="absolute right-[14%] top-[31%] h-1.5 w-1.5 rounded-full bg-[#52685d]/35" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1500px] px-5 pb-10 pt-6 sm:px-8">
        <div className="clamp-intro flex items-center justify-between gap-4">
          <Breadcrumb />
          <div className="hidden text-[9px] tracking-[.14em] text-black/25 sm:block">
            FLUID CSS LAB · CLAMP()
          </div>
        </div>

        <header className="clamp-intro mt-11 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/27">
              CSS CLAMP CALCULATOR
            </div>
            <h1 className="mt-4 max-w-[900px] text-[clamp(48px,6.8vw,96px)] font-semibold leading-[.9] tracking-[-.073em]">
              两个断点，
              <br />
              一条流体曲线。
            </h1>
          </div>

          <p className="max-w-[520px] text-[11px] leading-6 text-black/39">
            根据最小 / 最大尺寸和视口宽度，生成标准的线性 `clamp()`。适合字号、间距、内边距和圆角，不需要手写媒体查询。
          </p>
        </header>

        <section className="clamp-intro mt-7 flex flex-col gap-5 border-b border-black/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyPreset(preset)}
                className="rounded-full border border-black/[.085] bg-white/22 px-4 py-2.5 text-[9px] font-semibold text-black/40 transition hover:bg-white/50 hover:text-black"
              >
                {preset.name}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={reset}
            className="self-start text-[9px] font-semibold text-black/29 transition hover:text-black lg:self-auto"
          >
            恢复默认
          </button>
        </section>

        <section className="clamp-intro mt-8 grid gap-10 lg:grid-cols-[.72fr_1.28fr]">
          <div>
            <div className="text-[9px] font-semibold tracking-[.14em] text-black/25">
              PARAMETERS
            </div>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-.05em]">
              定义两端。
            </h2>

            <div className="mt-6 grid gap-x-7 sm:grid-cols-2 lg:grid-cols-1">
              <RangeField
                label="最小尺寸"
                value={minSize}
                min={0}
                max={96}
                onChange={setMinSize}
              />
              <RangeField
                label="最大尺寸"
                value={maxSize}
                min={1}
                max={180}
                onChange={setMaxSize}
              />
              <RangeField
                label="最小视口"
                value={minWidth}
                min={280}
                max={900}
                onChange={setMinWidth}
              />
              <RangeField
                label="最大视口"
                value={maxWidth}
                min={640}
                max={2200}
                onChange={setMaxWidth}
              />
            </div>

            <div className="mt-7">
              <div className="text-[9px] font-semibold tracking-[.11em] text-black/25">
                PROPERTY
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {PROPERTY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setProperty(option.value)}
                    className={`rounded-full px-3.5 py-2 text-[9px] font-semibold transition ${
                      property === option.value
                        ? "bg-[#22231f] text-white"
                        : "border border-black/[.085] text-black/38 hover:bg-white/35"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            {formula.valid ? (
              <>
                <div className="rounded-[28px] border border-black/[.075] bg-white/28 p-5 sm:p-7">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">
                        GENERATED VALUE
                      </div>
                      <div className="clamp-value clamp-num mt-3 max-w-[900px] break-all font-mono text-[clamp(18px,2.7vw,32px)] font-medium leading-[1.25] tracking-[-.035em]">
                        {formula.clampValue}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => copy(formula.clampValue, "value")}
                      className="shrink-0 rounded-full bg-[#22231f] px-4 py-2.5 text-[9px] font-semibold text-white"
                    >
                      {copied === "value" ? "✓ 已复制" : "复制值"}
                    </button>
                  </div>

                  <div className="mt-6 grid gap-px overflow-hidden rounded-[18px] bg-black/[.07] sm:grid-cols-3">
                    <div className="bg-[#f3f1ea] p-4">
                      <div className="text-[8px] text-black/24">SLOPE</div>
                      <b className="clamp-num mt-2 block font-mono text-sm">
                        {formatNumber(formula.slope)}vw
                      </b>
                    </div>
                    <div className="bg-[#f3f1ea] p-4">
                      <div className="text-[8px] text-black/24">INTERCEPT</div>
                      <b className="clamp-num mt-2 block font-mono text-sm">
                        {formatNumber(formula.intercept)}px
                      </b>
                    </div>
                    <div className="bg-[#f3f1ea] p-4">
                      <div className="text-[8px] text-black/24">
                        CURRENT VALUE
                      </div>
                      <b className="clamp-value clamp-num mt-2 block font-mono text-sm">
                        {formatNumber(currentValue, 2)}px
                      </b>
                    </div>
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-[28px] border border-black/[.075] bg-[#f7f5ef]">
                  <div className="flex items-center justify-between border-b border-black/[.065] px-5 py-3">
                    <span className="text-[8px] tracking-[.13em] text-black/24">
                      FLUID CURVE
                    </span>
                    <span className="text-[8px] text-black/23">
                      {minWidth}px → {maxWidth}px
                    </span>
                  </div>

                  <svg
                    ref={chartRef}
                    viewBox="0 0 1000 400"
                    className="block h-[330px] w-full"
                  >
                    {[90, 150, 210, 270, 330].map((y) => (
                      <line
                        key={y}
                        x1="80"
                        x2="920"
                        y1={y}
                        y2={y}
                        stroke="rgba(34,35,31,.065)"
                      />
                    ))}

                    <path
                      className="clamp-line"
                      d={graph.path}
                      fill="none"
                      stroke="#52685d"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />

                    <circle
                      cx={graph.currentX}
                      cy={graph.currentY}
                      r="8"
                      fill="#efede6"
                      stroke="#22231f"
                      strokeWidth="3"
                    />
                    <circle
                      cx={graph.currentX}
                      cy={graph.currentY}
                      r="3"
                      fill="#22231f"
                    />

                    <text
                      x={graph.x1}
                      y="365"
                      fontSize="11"
                      fill="rgba(34,35,31,.34)"
                    >
                      {minWidth}px
                    </text>
                    <text
                      x={graph.x2}
                      y="365"
                      textAnchor="end"
                      fontSize="11"
                      fill="rgba(34,35,31,.34)"
                    >
                      {maxWidth}px
                    </text>
                    <text
                      x={graph.x1}
                      y={graph.yBottom - 12}
                      fontSize="11"
                      fill="rgba(34,35,31,.34)"
                    >
                      {minSize}px
                    </text>
                    <text
                      x={graph.x2}
                      y={graph.yTop - 12}
                      textAnchor="end"
                      fontSize="11"
                      fill="rgba(34,35,31,.34)"
                    >
                      {maxSize}px
                    </text>
                  </svg>
                </div>
              </>
            ) : (
              <div className="rounded-[28px] border border-[#985844]/20 bg-[#985844]/[.035] p-6 text-[10px] leading-5 text-[#89503e]">
                {formula.error}
              </div>
            )}
          </div>
        </section>

        {formula.valid && (
          <section className="clamp-intro mt-12 border-t border-black/10 pt-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-[9px] font-semibold tracking-[.14em] text-black/25">
                  RESPONSIVE PREVIEW
                </div>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-.05em]">
                  在不同宽度里看它。
                </h2>
              </div>

              <label className="flex items-center gap-2 text-[9px] text-black/34">
                <input
                  type="checkbox"
                  checked={followViewport}
                  onChange={(event) => {
                    setFollowViewport(event.target.checked)
                    if (event.target.checked && viewport) {
                      setSimulatedWidth(viewport)
                    }
                  }}
                  className="accent-[#22231f]"
                />
                跟随当前浏览器
              </label>
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between gap-4 text-[9px] text-black/30">
                <span>预览宽度</span>
                <span className="clamp-num font-mono font-semibold text-black/47">
                  {Math.round(previewWidth)}px
                </span>
              </div>

              <input
                type="range"
                min={280}
                max={1920}
                value={Math.max(280, Math.min(1920, simulatedWidth))}
                disabled={followViewport}
                onChange={(event) => setSimulatedWidth(Number(event.target.value))}
                className="clamp-range block w-full disabled:opacity-30"
              />
            </div>

            <div className="mt-5 overflow-hidden rounded-[30px] border border-black/[.075] bg-white/28 p-4 sm:p-6">
              <div
                className="mx-auto overflow-hidden border border-black/[.075] bg-[#f8f6f0] transition-[width] duration-300"
                style={{
                  width: `${Math.min(100, Math.max(26, (previewWidth / 1920) * 100))}%`,
                  minWidth: "250px",
                  maxWidth: "100%",
                  ...(property === "border-radius" ? previewStyle : {}),
                }}
              >
                <div
                  className="flex min-h-[280px] flex-col justify-center"
                  style={{
                    ...(property === "padding" ? previewStyle : {}),
                  }}
                >
                  <div
                    className="grid sm:grid-cols-2"
                    style={{
                      ...(property === "gap" ? previewStyle : { gap: "24px" }),
                    }}
                  >
                    <div>
                      <div className="text-[8px] font-semibold tracking-[.14em] text-black/25">
                        BITLEAP / FLUID TYPE
                      </div>
                      <div
                        className="mt-4 font-semibold leading-[.92] tracking-[-.065em]"
                        style={{
                          ...(property === "font-size"
                            ? previewStyle
                            : { fontSize: "48px" }),
                        }}
                      >
                        Scale without
                        <br />
                        breakpoints.
                      </div>
                    </div>

                    <p className="self-end text-[10px] leading-5 text-black/36">
                      当前模拟视口 {Math.round(previewWidth)}px，对应计算值约{" "}
                      {formatNumber(currentValue, 2)}px。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {formula.valid && (
          <section className="clamp-intro mt-12 grid gap-9 border-t border-black/10 pt-7 lg:grid-cols-[.58fr_1.42fr]">
            <div>
              <div className="text-[9px] font-semibold tracking-[.14em] text-black/25">
                CSS OUTPUT
              </div>
              <h2 className="mt-2 text-[clamp(30px,4vw,48px)] font-semibold leading-[.98] tracking-[-.055em]">
                复制，
                <br />
                直接使用。
              </h2>

              <button
                type="button"
                onClick={() => copy(declaration, "declaration")}
                className="mt-6 rounded-full bg-[#22231f] px-5 py-3 text-[10px] font-semibold text-white"
              >
                {copied === "declaration"
                  ? "✓ 已复制声明"
                  : "复制 CSS 声明"}
              </button>
            </div>

            <div className="overflow-hidden rounded-[25px] border border-black/[.08] bg-[#171916]">
              <div className="flex items-center justify-between border-b border-white/[.07] px-5 py-3">
                <span className="text-[8px] tracking-[.13em] text-white/28">
                  CSS
                </span>
                <span className="text-[8px] text-white/20">
                  LINEAR INTERPOLATION
                </span>
              </div>

              <pre className="overflow-x-auto p-5 font-mono text-[11px] leading-6 text-[#cad5ca] sm:p-6">
{`.fluid {
  ${declaration}
}`}
              </pre>
            </div>
          </section>
        )}

        <section className="clamp-intro mt-12 grid gap-7 border-t border-black/10 pt-6 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              MIN
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              小于最小视口时固定使用最小尺寸，不继续缩小。
            </p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              FLUID
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              两个视口之间使用 `px + vw` 线性插值，浏览器原生计算。
            </p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              MAX
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              超过最大视口后固定使用最大尺寸，避免无限放大。
            </p>
          </div>
        </section>

        <div className="mt-12 border-t border-black/[.08] pt-5">
          <FooterNote />
        </div>
      </div>
    </div>
  )
}
