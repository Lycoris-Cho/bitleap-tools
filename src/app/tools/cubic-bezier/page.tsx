"use client"

import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type Point = { x: number; y: number }
type DragPoint = "p1" | "p2" | null
type PreviewMode = "single" | "stagger" | "compare"
type CopyKey = "css" | "tailwind" | "waapi" | "gsap" | "tokens" | "report" | null
type EasePreset = {
  name: string
  tag: string
  p1: Point
  p2: Point
  desc: string
}

const STORAGE_KEY = "bitleap-easing-gsap-lab-v2"

const PRESETS: EasePreset[] = [
  { name: "ease", tag: "CSS", p1: { x: 0.25, y: 0.1 }, p2: { x: 0.25, y: 1 }, desc: "浏览器默认 ease，前段很快，后段慢慢停。" },
  { name: "ease-in", tag: "CSS", p1: { x: 0.42, y: 0 }, p2: { x: 1, y: 1 }, desc: "慢启动，适合离场或下沉。" },
  { name: "ease-out", tag: "CSS", p1: { x: 0, y: 0 }, p2: { x: 0.58, y: 1 }, desc: "快进入、柔和停止，最常用的 UI 入场。" },
  { name: "ease-in-out", tag: "CSS", p1: { x: 0.42, y: 0 }, p2: { x: 0.58, y: 1 }, desc: "两端都柔和，适合页面段落切换。" },
  { name: "gsap snap", tag: "GSAP-ish", p1: { x: 0.16, y: 1 }, p2: { x: 0.3, y: 1 }, desc: "接近 expo.out 的利落感，用于按钮和面板入场。" },
  { name: "gentle back", tag: "UI", p1: { x: 0.18, y: 0.89 }, p2: { x: 0.32, y: 1.28 }, desc: "略微越界回弹，适合强调元素。" },
  { name: "soft pop", tag: "UI", p1: { x: 0.2, y: 1.25 }, p2: { x: 0.38, y: 1 }, desc: "快速弹出但不夸张，适合 toast、badge。" },
  { name: "smooth page", tag: "Layout", p1: { x: 0.76, y: 0 }, p2: { x: 0.24, y: 1 }, desc: "大面积布局切换，更有镜头感。" },
  { name: "linear", tag: "Base", p1: { x: 0, y: 0 }, p2: { x: 1, y: 1 }, desc: "无缓动，适合对照和匀速滚动。" },
]

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function round(value: number, digits = 3) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function fmt(value: number, digits = 3) {
  const rounded = round(value, digits)
  return Object.is(rounded, -0) ? "0" : String(rounded)
}

function cubicBezier(t: number, p1: number, p2: number) {
  const inv = 1 - t
  return 3 * inv * inv * t * p1 + 3 * inv * t * t * p2 + t * t * t
}

function cubicBezierDerivative(t: number, p1: number, p2: number) {
  const inv = 1 - t
  return 3 * inv * inv * p1 + 6 * inv * t * (p2 - p1) + 3 * t * t * (1 - p2)
}

function solveYForX(x: number, p1: Point, p2: Point) {
  let t = clamp(x, 0, 1)

  for (let i = 0; i < 8; i += 1) {
    const currentX = cubicBezier(t, p1.x, p2.x) - x
    const dx = cubicBezierDerivative(t, p1.x, p2.x)
    if (Math.abs(currentX) < 0.00001 || Math.abs(dx) < 0.00001) break
    t = clamp(t - currentX / dx, 0, 1)
  }

  return cubicBezier(t, p1.y, p2.y)
}

function curvePath(size: number, p1: Point, p2: Point) {
  const start = `${0},${size}`
  const c1 = `${p1.x * size},${(1 - p1.y) * size}`
  const c2 = `${p2.x * size},${(1 - p2.y) * size}`
  const end = `${size},${0}`
  return `M ${start} C ${c1} ${c2} ${end}`
}

function samplePath(size: number, p1: Point, p2: Point) {
  const points = Array.from({ length: 72 }, (_, index) => {
    const x = index / 71
    const y = solveYForX(x, p1, p2)
    return `${x * size},${(1 - y) * size}`
  })

  return `M ${points.join(" L ")}`
}

function codeValue(p1: Point, p2: Point) {
  return `cubic-bezier(${fmt(p1.x)}, ${fmt(p1.y)}, ${fmt(p2.x)}, ${fmt(p2.y)})`
}

function cssSnippet(ease: string, duration: number) {
  return [
    ".motion-target {",
    `  transition-duration: ${duration}ms;`,
    `  transition-timing-function: ${ease};`,
    "}",
  ].join("\n")
}

function tailwindSnippet(ease: string, duration: number) {
  return `className="duration-[${duration}ms] [transition-timing-function:${ease.replaceAll(" ", "_")}]"` 
}

function waapiSnippet(ease: string, duration: number, distance: number) {
  return [
    "element.animate(",
    "  [",
    "    { transform: 'translateX(0) scale(0.96)', opacity: 0.65 },",
    `    { transform: 'translateX(${distance}px) scale(1)', opacity: 1 },`,
    "  ],",
    "  {",
    `    duration: ${duration},`,
    `    easing: '${ease}',`,
    "    fill: 'both',",
    "  },",
    ")",
  ].join("\n")
}

function gsapSnippet(p1: Point, p2: Point, duration: number, distance: number) {
  const path = `M0,0 C${fmt(p1.x)},${fmt(p1.y)} ${fmt(p2.x)},${fmt(p2.y)} 1,1`
  return [
    "// 可配合 GSAP CustomEase 使用：",
    "// gsap.registerPlugin(CustomEase)",
    `// CustomEase.create("bitleapEase", "${path}")`,
    "",
    "gsap.to('.motion-target', {",
    `  x: ${distance},`,
    `  duration: ${fmt(duration / 1000, 2)},`,
    "  ease: 'bitleapEase',",
    "})",
  ].join("\n")
}

function tokenSnippet(ease: string) {
  return [
    ":root {",
    `  --ease-bitleap: ${ease};`,
    "}",
    "",
    "export const easings = {",
    `  bitleap: '${ease}',`,
    "} as const",
  ].join("\n")
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

function getStats(p1: Point, p2: Point) {
  const samples = Array.from({ length: 101 }, (_, index) => {
    const x = index / 100
    return solveYForX(x, p1, p2)
  })
  const midpoint = solveYForX(0.5, p1, p2)
  const max = Math.max(...samples)
  const min = Math.min(...samples)
  const velocities = samples.slice(1).map((value, index) => Math.abs(value - samples[index]))
  const peakVelocity = Math.max(...velocities) * 100
  const overshoot = Math.max(0, max - 1, -min)

  return {
    midpoint,
    min,
    max,
    peakVelocity,
    overshoot,
  }
}

function ButtonPill({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`rounded-full px-3.5 py-2 text-[8px] font-bold uppercase tracking-[.12em] transition ${active ? "bg-[#0ae448] text-[#0e100f]" : "border border-white/[.1] text-white/42 hover:bg-white/[.07] hover:text-white"}`}>
      {label}
    </button>
  )
}

function ControlSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[8px] font-bold uppercase tracking-[.13em] text-white/28">{label}</span>
        <span className="font-mono text-[10px] text-[#0ae448]">{fmt(value, 2)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-[#0ae448]" />
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
    <article className="border-t border-white/[.08] py-4 first:border-t-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[8px] font-bold uppercase tracking-[.16em] text-white/22">{label}</span>
        <button type="button" onClick={onCopy} className="text-[8px] font-bold uppercase tracking-[.12em] text-white/28 transition hover:text-[#0ae448]">{copied ? "Copied" : "Copy"}</button>
      </div>
      <pre className="ease-scroll max-h-52 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-5 text-[#d7ffe2]">{value}</pre>
    </article>
  )
}

function StatBox({
  label,
  value,
  tone = "green",
}: {
  label: string
  value: string
  tone?: "green" | "yellow" | "white"
}) {
  const toneClass = tone === "yellow" ? "text-[#fffce1]" : tone === "white" ? "text-white/78" : "text-[#0ae448]"

  return (
    <div className="rounded-[22px] border border-white/[.08] bg-white/[.045] p-4">
      <div className="text-[8px] font-bold uppercase tracking-[.15em] text-white/24">{label}</div>
      <div className={`ease-num mt-3 truncate font-mono text-[15px] font-bold ${toneClass}`}>{value}</div>
    </div>
  )
}

export default function EasingGenerator() {
  const canvasRef = useRef<HTMLDivElement>(null)
  const previewTrackRef = useRef<HTMLDivElement>(null)
  const runnerRef = useRef<HTMLDivElement>(null)
  const ghostRef = useRef<HTMLDivElement>(null)
  const staggerRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)

  const [p1, setP1] = useState<Point>({ x: 0.16, y: 1 })
  const [p2, setP2] = useState<Point>({ x: 0.3, y: 1 })
  const [dragging, setDragging] = useState<DragPoint>(null)
  const [duration, setDuration] = useState(900)
  const [distance, setDistance] = useState(280)
  const [resolvedDistance, setResolvedDistance] = useState(280)
  const [fitPreview, setFitPreview] = useState(true)
  const [previewMode, setPreviewMode] = useState<PreviewMode>("single")
  const [copied, setCopied] = useState<CopyKey>(null)
  const [hydrated, setHydrated] = useState(false)

  const ease = useMemo(() => codeValue(p1, p2), [p1, p2])
  const stats = useMemo(() => getStats(p1, p2), [p1, p2])
  const activePreset = useMemo(() => PRESETS.find((preset) => Math.abs(preset.p1.x - p1.x) < 0.001 && Math.abs(preset.p1.y - p1.y) < 0.001 && Math.abs(preset.p2.x - p2.x) < 0.001 && Math.abs(preset.p2.y - p2.y) < 0.001), [p1, p2])
  const css = useMemo(() => cssSnippet(ease, duration), [duration, ease])
  const tailwind = useMemo(() => tailwindSnippet(ease, duration), [duration, ease])
  const waapi = useMemo(() => waapiSnippet(ease, duration, resolvedDistance), [duration, ease, resolvedDistance])
  const gsapCode = useMemo(() => gsapSnippet(p1, p2, duration, resolvedDistance), [duration, p1, p2, resolvedDistance])
  const tokens = useMemo(() => tokenSnippet(ease), [ease])
  const report = useMemo(
    () =>
      [
        "BitLeap Easing Lab",
        "",
        `Ease: ${ease}`,
        `Duration: ${duration}ms`,
        `Distance: ${resolvedDistance}px`,
        `Preview: ${previewMode}`,
        `Preset: ${activePreset?.name ?? "custom"}`,
        "",
        "Stats:",
        `Midpoint: ${fmt(stats.midpoint)}`,
        `Peak velocity: ${fmt(stats.peakVelocity)}`,
        `Overshoot: ${fmt(stats.overshoot)}`,
        "",
        "CSS:",
        css,
        "",
        "Tailwind:",
        tailwind,
        "",
        "WAAPI:",
        waapi,
        "",
        "GSAP:",
        gsapCode,
      ].join("\n"),
    [activePreset?.name, css, distance, duration, ease, gsapCode, previewMode, stats.midpoint, stats.overshoot, stats.peakVelocity, tailwind, waapi],
  )

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as {
          p1?: Point
          p2?: Point
          duration?: number
          distance?: number
          fitPreview?: boolean
          previewMode?: PreviewMode
        }
        if (parsed.p1) setP1({ x: clamp(parsed.p1.x, 0, 1), y: clamp(parsed.p1.y, -0.8, 1.8) })
        if (parsed.p2) setP2({ x: clamp(parsed.p2.x, 0, 1), y: clamp(parsed.p2.y, -0.8, 1.8) })
        if (typeof parsed.duration === "number") setDuration(clamp(parsed.duration, 120, 3000))
        if (typeof parsed.distance === "number") setDistance(clamp(parsed.distance, 80, 620))
        if (typeof parsed.fitPreview === "boolean") setFitPreview(parsed.fitPreview)
        if (parsed.previewMode === "single" || parsed.previewMode === "stagger" || parsed.previewMode === "compare") setPreviewMode(parsed.previewMode)
      }
    } catch {
      // Keep defaults.
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ p1, p2, duration, distance, fitPreview, previewMode }))
      } catch {}
    }, 160)

    return () => window.clearTimeout(timer)
  }, [distance, duration, fitPreview, hydrated, p1, p2, previewMode])

  useEffect(() => {
    if (!pageRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      gsap.from(".ease-intro", { opacity: 0, y: 22, duration: 0.82, stagger: 0.055, ease: "power3.out" })
      gsap.to(".ease-orbit-a", { rotate: 360, duration: 90, repeat: -1, ease: "none", transformOrigin: "50% 50%" })
      gsap.to(".ease-orbit-b", { rotate: -360, duration: 128, repeat: -1, ease: "none", transformOrigin: "50% 50%" })
      gsap.to(".ease-dot", { y: -8, opacity: 0.8, duration: 2.5, repeat: -1, yoyo: true, stagger: { each: 0.11, from: "random" }, ease: "sine.inOut" })
    }, pageRef)

    return () => ctx.revert()
  }, [])

  const setPoint = (key: DragPoint, point: Point) => {
    if (!key) return
    const next = {
      x: clamp(point.x, 0, 1),
      y: clamp(point.y, -0.8, 1.8),
    }

    if (key === "p1") setP1(next)
    if (key === "p2") setP2(next)
  }

  const getPointFromPointer = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    const target = event.currentTarget
    const rect = target.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = 1 - (event.clientY - rect.top) / rect.height
    return { x, y }
  }, [])

  const onPointerDown = (key: DragPoint, event: ReactPointerEvent<SVGCircleElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(key)
  }

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragging) return
    setPoint(dragging, getPointFromPointer(event))
  }

  const onPointerUp = () => {
    setDragging(null)
  }

  const applyPreset = (preset: EasePreset) => {
    setP1(preset.p1)
    setP2(preset.p2)
    requestAnimationFrame(() => play())
  }

  const measureTravelDistance = () => {
    const track = previewTrackRef.current
    const runner = runnerRef.current
    const firstStagger = staggerRef.current?.querySelector<HTMLElement>(".stagger-item")
    const target = previewMode === "stagger" ? firstStagger : runner

    if (!track || !target) return distance

    const available = track.clientWidth - target.offsetWidth
    const next = Math.max(0, Math.floor(available))
    return fitPreview ? next : Math.min(distance, next)
  }

  const play = () => {
    const runner = runnerRef.current
    const ghost = ghostRef.current
    const stagger = staggerRef.current
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    timelineRef.current?.kill()
    gsap.killTweensOf([runner, ghost])
    if (stagger) gsap.killTweensOf(stagger.querySelectorAll(".stagger-item"))

    if ((previewMode !== "stagger" && !runner) || reducedMotion) return

    const travelDistance = measureTravelDistance()
    setResolvedDistance(travelDistance)

    gsap.set([runner, ghost].filter(Boolean), { x: 0, opacity: 1, scale: 1, rotate: 0, clearProps: "filter" })
    if (stagger) gsap.set(stagger.querySelectorAll(".stagger-item"), { x: 0, opacity: 0.46, scale: 0.94, rotate: 0 })

    const timeline = gsap.timeline()
    timelineRef.current = timeline

    if (previewMode === "compare" && ghost) {
      timeline.to(ghost, { x: travelDistance, duration: duration / 1000, ease: "none" }, 0)
    }

    if (previewMode === "stagger" && stagger) {
      const items = gsap.utils.toArray<HTMLElement>(".stagger-item", stagger)
      items.forEach((item, index) => {
        const localDriver = { t: 0 }
        timeline.to(
          localDriver,
          {
            t: 1,
            duration: duration / 1000,
            ease: "none",
            onStart: () => {
              item.style.opacity = "0.54"
            },
            onUpdate: () => {
              const progress = solveYForX(localDriver.t, p1, p2)
              item.style.transform = `translateX(${progress * travelDistance}px) scale(${0.94 + progress * 0.08})`
              item.style.opacity = String(0.5 + progress * 0.5)
            },
          },
          index * 0.075,
        )
      })
      return
    }

    const driver = { t: 0 }
    timeline.to(
      driver,
      {
        t: 1,
        duration: duration / 1000,
        ease: "none",
        onUpdate: () => {
          const progress = solveYForX(driver.t, p1, p2)
          runner.style.transform = `translateX(${progress * travelDistance}px) scale(${0.94 + progress * 0.07})`
          runner.style.opacity = String(0.62 + progress * 0.38)
          runner.style.filter = `drop-shadow(0 0 ${10 + progress * 28}px rgba(10,228,72,.22))`
        },
      },
      0,
    )
  }

  useEffect(() => {
    const timer = window.setTimeout(() => play(), 80)
    return () => window.clearTimeout(timer)
  }, [duration, distance, fitPreview, previewMode, p1, p2])

  useEffect(() => {
    const track = previewTrackRef.current
    if (!track) return

    const observer = new ResizeObserver(() => {
      window.setTimeout(() => play(), 40)
    })
    observer.observe(track)

    return () => observer.disconnect()
  }, [fitPreview, previewMode])

  const copy = async (value: string, key: CopyKey) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {}
  }

  const reset = () => {
    setP1({ x: 0.16, y: 1 })
    setP2({ x: 0.3, y: 1 })
    setDuration(900)
    setDistance(280)
    setResolvedDistance(280)
    setFitPreview(true)
    setPreviewMode("single")
    requestAnimationFrame(() => play())
  }

  const canvasSize = 420
  const p1Screen = { x: p1.x * canvasSize, y: (1 - p1.y) * canvasSize }
  const p2Screen = { x: p2.x * canvasSize, y: (1 - p2.y) * canvasSize }
  const midpoint = { x: canvasSize * 0.5, y: (1 - stats.midpoint) * canvasSize }

  return (
    <div ref={pageRef} className="relative min-h-screen overflow-hidden bg-[#0e100f] text-white selection:bg-[#0ae448] selection:text-[#0e100f]">
      <style>{`
        .ease-num { font-variant-numeric: tabular-nums lining-nums; }
        .ease-scroll::-webkit-scrollbar { width:5px; height:5px; }
        .ease-scroll::-webkit-scrollbar-track { background:transparent; }
        .ease-scroll::-webkit-scrollbar-thumb { background:rgba(10,228,72,.28); border-radius:999px; }
        .ease-grid { background-image:linear-gradient(rgba(255,255,255,.052) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.052) 1px,transparent 1px); background-size:36px 36px; }
      `}</style>

      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(10,228,72,.16),transparent_26%),radial-gradient(circle_at_86%_16%,rgba(255,252,225,.10),transparent_28%),radial-gradient(circle_at_20%_82%,rgba(255,135,31,.08),transparent_30%)]" />
        <div className="ease-grid absolute inset-0 opacity-70" />
        <div className="ease-orbit-a absolute right-[-16vw] top-[-20vw] h-[52vw] w-[52vw] rounded-full border border-[#0ae448]/10">
          <span className="absolute left-[18%] top-[45%] h-2 w-2 rounded-full bg-[#0ae448]" />
        </div>
        <div className="ease-orbit-b absolute bottom-[-18vw] left-[-14vw] h-[40vw] w-[40vw] rounded-full border border-white/[.055]" />
        {Array.from({ length: 16 }).map((_, index) => (
          <span key={index} className="ease-dot absolute h-1 w-1 rounded-full bg-[#0ae448]/60" style={{ left: `${6 + ((index * 19) % 88)}%`, top: `${10 + ((index * 31) % 78)}%`, opacity: 0.18 + (index % 5) * 0.05 }} />
        ))}
      </div>

      <div className="relative z-10 mx-auto max-w-[1680px] px-5 pb-10 pt-6 sm:px-8">
        <div className="ease-intro [&_*]:!text-white/56">
          <Breadcrumb />
        </div>

        <header className="ease-intro mt-8 grid gap-7 border-b border-white/[.09] pb-8 lg:grid-cols-[1fr_.76fr] lg:items-end">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-[.24em] text-[#0ae448]">GSAP STYLE EASING LAB</div>
            <h1 className="mt-4 max-w-[980px] text-[clamp(54px,7vw,118px)] font-black leading-[.84] tracking-[-.075em]">
              Curves with
              <br />
              personality.
            </h1>
          </div>

          <div>
            <p className="max-w-[610px] text-[12px] leading-7 text-white/43">
              拖拽控制点生成 cubic-bezier，用黑绿高对比、巨大字体、动态曲线和更准确的 motion preview 来呈现；预览目标现在会自动贴合轨道宽度滑到最右端。
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {(["single", "stagger", "compare"] as PreviewMode[]).map((mode) => (
                <ButtonPill key={mode} active={previewMode === mode} label={mode} onClick={() => setPreviewMode(mode)} />
              ))}
            </div>
          </div>
        </header>

        <section className="ease-intro mt-7 grid gap-5 xl:grid-cols-[minmax(0,1fr)_370px]">
          <main className="min-w-0 overflow-hidden rounded-[38px] border border-white/[.09] bg-[#111412]/88 shadow-[0_42px_140px_-74px_rgba(0,0,0,.9)] backdrop-blur-xl">
            <div className="grid gap-px bg-white/[.075] lg:grid-cols-[minmax(420px,.9fr)_1fr]">
              <div className="bg-[#111412] p-5 sm:p-7">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[8px] font-bold uppercase tracking-[.16em] text-white/24">Curve Editor</div>
                    <div className="mt-2 font-mono text-[10px] text-[#0ae448]">{ease}</div>
                  </div>
                  <button type="button" onClick={play} className="rounded-full bg-[#0ae448] px-4 py-3 text-[9px] font-bold uppercase tracking-[.12em] text-[#0e100f] transition hover:-translate-y-0.5 hover:bg-[#7cff95]">Play</button>
                </div>

                <div ref={canvasRef} className="relative mx-auto aspect-square max-w-[560px] rounded-[34px] border border-white/[.08] bg-[#0b0d0c] p-4">
                  <svg viewBox={`0 0 ${canvasSize} ${canvasSize}`} className="h-full w-full touch-none overflow-visible" onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
                    <defs>
                      <linearGradient id="easeCurveGradient" x1="0" y1="1" x2="1" y2="0">
                        <stop offset="0%" stopColor="#0ae448" />
                        <stop offset="50%" stopColor="#fffce1" />
                        <stop offset="100%" stopColor="#ff8709" />
                      </linearGradient>
                      <filter id="easeGlow">
                        <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {Array.from({ length: 11 }).map((_, index) => {
                      const pos = (index / 10) * canvasSize
                      return (
                        <g key={index} opacity={index === 0 || index === 10 ? 0.32 : 0.13}>
                          <line x1={pos} y1={0} x2={pos} y2={canvasSize} stroke="white" strokeWidth="1" />
                          <line x1={0} y1={pos} x2={canvasSize} y2={pos} stroke="white" strokeWidth="1" />
                        </g>
                      )
                    })}

                    <line x1={0} y1={canvasSize} x2={canvasSize} y2={0} stroke="rgba(255,255,255,.24)" strokeWidth="1" strokeDasharray="5 7" />
                    <line x1={0} y1={canvasSize} x2={p1Screen.x} y2={p1Screen.y} stroke="rgba(10,228,72,.45)" strokeWidth="1.5" strokeDasharray="7 8" />
                    <line x1={canvasSize} y1={0} x2={p2Screen.x} y2={p2Screen.y} stroke="rgba(255,135,9,.45)" strokeWidth="1.5" strokeDasharray="7 8" />

                    <path d={samplePath(canvasSize, p1, p2)} fill="none" stroke="rgba(10,228,72,.14)" strokeWidth="18" strokeLinecap="round" />
                    <path d={curvePath(canvasSize, p1, p2)} fill="none" stroke="url(#easeCurveGradient)" strokeWidth="5" strokeLinecap="round" filter="url(#easeGlow)" />
                    <circle cx={midpoint.x} cy={midpoint.y} r="5" fill="#fffce1" opacity="0.92" />

                    <circle cx={p1Screen.x} cy={p1Screen.y} r={15} fill="#0ae448" stroke="#d7ffe2" strokeWidth="2" className="cursor-grab active:cursor-grabbing" onPointerDown={(event) => onPointerDown("p1", event)} />
                    <circle cx={p2Screen.x} cy={p2Screen.y} r={15} fill="#ff8709" stroke="#fffce1" strokeWidth="2" className="cursor-grab active:cursor-grabbing" onPointerDown={(event) => onPointerDown("p2", event)} />

                    <text x="0" y={canvasSize + 28} fill="rgba(255,255,255,.34)" fontSize="12" fontFamily="monospace">0</text>
                    <text x={canvasSize - 8} y={canvasSize + 28} fill="rgba(255,255,255,.34)" fontSize="12" fontFamily="monospace">1</text>
                    <text x={p1Screen.x + 18} y={p1Screen.y - 14} fill="#0ae448" fontSize="11" fontFamily="monospace">P1</text>
                    <text x={p2Screen.x + 18} y={p2Screen.y - 14} fill="#ff8709" fontSize="11" fontFamily="monospace">P2</text>
                  </svg>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <StatBox label="Midpoint" value={fmt(stats.midpoint)} />
                  <StatBox label="Peak Speed" value={fmt(stats.peakVelocity)} tone="yellow" />
                  <StatBox label="Overshoot" value={fmt(stats.overshoot)} tone={stats.overshoot > 0 ? "yellow" : "white"} />
                </div>
              </div>

              <div className="bg-[#171a18] p-5 sm:p-7">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[8px] font-bold uppercase tracking-[.16em] text-white/24">Motion Preview</div>
                    <p className="mt-2 text-[9px] leading-4 text-white/31">用同一条曲线驱动位移、透明度和缩放，方便判断真实 UI 体感。</p>
                  </div>
                  <span className="rounded-full border border-white/[.08] px-3 py-2 font-mono text-[8px] text-white/30">{duration}ms</span>
                </div>

                <div className="relative h-[350px] overflow-hidden rounded-[30px] border border-white/[.08] bg-[#0e100f] p-6">
                  <div className="absolute inset-0 ease-grid opacity-55" />
                  <div className="pointer-events-none absolute left-6 right-6 top-[calc(50%+2px)] flex items-center justify-between font-mono text-[7px] uppercase tracking-[.12em] text-white/20">
                    <span>start</span>
                    <span>{resolvedDistance}px</span>
                    <span>end</span>
                  </div>
                  <div ref={previewTrackRef} className="absolute left-6 right-6 top-[calc(50%-24px)] h-16">
                    <div className="absolute left-0 right-0 top-1/2 h-px bg-white/[.13]" />
                    <div className="absolute left-0 top-[calc(50%-6px)] h-3 w-px bg-[#0ae448]/50" />
                    <div className="absolute right-0 top-[calc(50%-6px)] h-3 w-px bg-[#ff8709]/50" />
                    {previewMode === "compare" && <div ref={ghostRef} className="absolute left-0 top-[calc(50%-18px)] h-9 w-9 rounded-xl border border-white/[.12] bg-white/[.16]" />}
                    {previewMode !== "stagger" && (
                      <div ref={runnerRef} className="absolute left-0 top-[calc(50%-22px)] z-10 grid h-11 w-24 place-items-center rounded-2xl bg-[#0ae448] font-mono text-[10px] font-black text-[#0e100f] shadow-[0_0_46px_rgba(10,228,72,.26)]">
                        TARGET
                      </div>
                    )}
                  </div>
                  {previewMode === "stagger" && (
                    <div ref={staggerRef} className="absolute left-6 right-6 top-16 z-10 space-y-4">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <div key={index} className="stagger-item h-11 w-20 rounded-2xl border border-[#0ae448]/20 bg-[#0ae448] shadow-[0_0_42px_rgba(10,228,72,.20)]" />
                      ))}
                    </div>
                  )}
                  <div className="pointer-events-none absolute bottom-5 left-6 right-6 grid grid-cols-3 gap-2">
                    {[
                      ["curve", ease],
                      ["travel", fitPreview ? "auto-fit" : `${distance}px`],
                      ["mode", previewMode],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl border border-white/[.07] bg-white/[.035] p-3">
                        <div className="text-[7px] font-bold uppercase tracking-[.14em] text-white/20">{label}</div>
                        <div className="mt-1 truncate font-mono text-[9px] text-[#d7ffe2]/70">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 grid gap-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-white/[.08] bg-white/[.035] p-3">
                    <div>
                      <div className="text-[8px] font-bold uppercase tracking-[.14em] text-white/24">Preview travel</div>
                      <div className="mt-1 text-[9px] text-white/31">{fitPreview ? "自动计算轨道宽度，目标滑到最右端。" : "使用自定义距离，但不会超出轨道。"}</div>
                    </div>
                    <div className="flex gap-2">
                      <ButtonPill active={fitPreview} label="Auto fit" onClick={() => setFitPreview(true)} />
                      <ButtonPill active={!fitPreview} label="Custom" onClick={() => setFitPreview(false)} />
                    </div>
                  </div>
                  <ControlSlider label="Duration" value={duration} min={120} max={3000} step={20} onChange={setDuration} />
                  {!fitPreview && <ControlSlider label="Distance" value={distance} min={80} max={620} step={10} onChange={setDistance} />}
                  <div className="grid grid-cols-2 gap-4">
                    <ControlSlider label="P1 X" value={p1.x} min={0} max={1} step={0.01} onChange={(x) => setP1((current) => ({ ...current, x }))} />
                    <ControlSlider label="P1 Y" value={p1.y} min={-0.8} max={1.8} step={0.01} onChange={(y) => setP1((current) => ({ ...current, y }))} />
                    <ControlSlider label="P2 X" value={p2.x} min={0} max={1} step={0.01} onChange={(x) => setP2((current) => ({ ...current, x }))} />
                    <ControlSlider label="P2 Y" value={p2.y} min={-0.8} max={1.8} step={0.01} onChange={(y) => setP2((current) => ({ ...current, y }))} />
                  </div>
                </div>
              </div>
            </div>
          </main>

          <aside className="min-w-0">
            <div className="sticky top-6 overflow-hidden rounded-[34px] border border-white/[.09] bg-[#111412]/90 shadow-[0_32px_110px_-70px_rgba(0,0,0,.9)] backdrop-blur-xl">
              <div className="border-b border-white/[.08] px-5 py-4">
                <div className="text-[8px] font-bold uppercase tracking-[.16em] text-white/24">Export Stack</div>
                <div className="mt-2 text-[11px] leading-5 text-white/38">{activePreset?.desc ?? "自定义曲线，适合继续微调。"}</div>
              </div>
              <div className="ease-scroll max-h-[720px] overflow-auto px-5">
                <OutputBlock label="CSS" value={css} copied={copied === "css"} onCopy={() => copy(css, "css")} />
                <OutputBlock label="Tailwind" value={tailwind} copied={copied === "tailwind"} onCopy={() => copy(tailwind, "tailwind")} />
                <OutputBlock label="WAAPI" value={waapi} copied={copied === "waapi"} onCopy={() => copy(waapi, "waapi")} />
                <OutputBlock label="GSAP CustomEase" value={gsapCode} copied={copied === "gsap"} onCopy={() => copy(gsapCode, "gsap")} />
                <OutputBlock label="Tokens" value={tokens} copied={copied === "tokens"} onCopy={() => copy(tokens, "tokens")} />
              </div>
              <div className="border-t border-white/[.08] p-5">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={reset} className="rounded-full border border-white/[.09] px-4 py-3 text-[9px] font-bold uppercase tracking-[.1em] text-white/34 transition hover:bg-white/[.07] hover:text-white">Reset</button>
                  <button type="button" onClick={() => copy(report, "report")} className="rounded-full bg-[#0ae448] px-4 py-3 text-[9px] font-bold uppercase tracking-[.1em] text-[#0e100f]">{copied === "report" ? "Copied" : "Copy Report"}</button>
                  <button type="button" onClick={() => downloadText(report, "bitleap-easing-report.txt")} className="rounded-full border border-white/[.09] px-4 py-3 text-[9px] font-bold uppercase tracking-[.1em] text-white/34 transition hover:bg-white/[.07] hover:text-white">Export</button>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="ease-intro mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          {PRESETS.map((preset) => {
            const selected = activePreset?.name === preset.name
            const miniPath = curvePath(84, preset.p1, preset.p2)

            return (
              <button key={preset.name} type="button" onClick={() => applyPreset(preset)} className={`group rounded-[26px] border p-4 text-left transition ${selected ? "border-[#0ae448]/40 bg-[#0ae448] text-[#0e100f]" : "border-white/[.09] bg-white/[.04] text-white hover:-translate-y-1 hover:bg-white/[.07]"}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className={`text-[8px] font-bold uppercase tracking-[.16em] ${selected ? "text-[#0e100f]/55" : "text-[#0ae448]"}`}>{preset.tag}</span>
                  <svg viewBox="0 0 84 84" className="h-12 w-12 overflow-visible">
                    <path d="M 0,84 L 84,0" stroke={selected ? "rgba(14,16,15,.24)" : "rgba(255,255,255,.16)"} strokeWidth="1" strokeDasharray="3 4" />
                    <path d={miniPath} fill="none" stroke={selected ? "#0e100f" : "#0ae448"} strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="mt-5 text-[20px] font-black leading-none tracking-[-.04em]">{preset.name}</div>
                <p className={`mt-3 text-[9px] leading-5 ${selected ? "text-[#0e100f]/58" : "text-white/33"}`}>{preset.desc}</p>
              </button>
            )
          })}
        </section>

        <section className="ease-intro mt-12 grid gap-8 border-t border-white/[.09] pt-7 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-bold uppercase tracking-[.13em] text-white/24">Drag the curve</div>
            <p className="mt-2 text-[9px] leading-5 text-white/34">SVG 控制点支持鼠标和触控拖拽，X 被限制在 0–1，Y 允许轻微越界来制作 back / pop 效果。</p>
          </div>
          <div>
            <div className="text-[8px] font-bold uppercase tracking-[.13em] text-white/24">Preview modes</div>
            <p className="mt-2 text-[9px] leading-5 text-white/34">Single 看单个目标，Stagger 看序列节奏，Compare 用线性运动对照当前曲线。</p>
          </div>
          <div>
            <div className="text-[8px] font-bold uppercase tracking-[.13em] text-white/24">Copy ready</div>
            <p className="mt-2 text-[9px] leading-5 text-white/34">同时输出 CSS、Tailwind、WAAPI、设计 Token 和 GSAP CustomEase 注释片段。</p>
          </div>
        </section>

        <div className="mt-12 border-t border-white/[.08] pt-5 [&_*]:!text-white/38">
          <FooterNote />
        </div>
      </div>
    </div>
  )
}
