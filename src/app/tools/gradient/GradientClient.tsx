'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { gsap } from 'gsap'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Dice5,
  Minus,
  Plus,
  RotateCcw,
  Sparkles,
  WandSparkles,
} from 'lucide-react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

type GradientType = 'linear' | 'radial'
type RadialShape = 'circle' | 'ellipse'

type ColorStop = {
  id: string
  value: string
  position: number
}

type PresetGradient = {
  name: string
  colors: string[]
  angle?: number
  type?: GradientType
  shape?: RadialShape
}

const DIRECTIONS = [
  { label: '↑', hint: '向上', angle: 0 },
  { label: '↗', hint: '右上', angle: 45 },
  { label: '→', hint: '向右', angle: 90 },
  { label: '↘', hint: '右下', angle: 135 },
  { label: '↓', hint: '向下', angle: 180 },
  { label: '↙', hint: '左下', angle: 225 },
  { label: '←', hint: '向左', angle: 270 },
  { label: '↖', hint: '左上', angle: 315 },
]

const PRESET_GRADIENTS: PresetGradient[] = [
  { name: '紫霞', colors: ['#667EEA', '#764BA2'], angle: 90 },
  { name: '极光', colors: ['#22D3EE', '#A78BFA', '#D9F99D'], angle: 120 },
  { name: '樱花', colors: ['#F9A8D4', '#FBCFE8', '#DDD6FE'], angle: 135 },
  { name: '冰川', colors: ['#DBEAFE', '#BFDBFE', '#A5F3FC'], angle: 120 },
  { name: '薄荷', colors: ['#A7F3D0', '#67E8F9'], angle: 90 },
  { name: '日落', colors: ['#FDBA74', '#FB7185', '#C084FC'], angle: 120 },
  { name: '星河', colors: ['#0F172A', '#312E81', '#581C87'], angle: 145 },
  { name: '玫瑰雾', colors: ['#FFF1F2', '#FECDD3', '#F9A8D4'], angle: 135 },
  { name: '晨曦', colors: ['#FEF3C7', '#FED7AA', '#FBCFE8'], angle: 110 },
  { name: '深海', colors: ['#082F49', '#0E7490', '#22D3EE'], angle: 135 },
  { name: '霓虹', colors: ['#22D3EE', '#8B5CF6', '#EC4899'], angle: 100 },
  { name: '雾紫', colors: ['#F5F3FF', '#DDD6FE', '#C4B5FD'], angle: 90 },
]

function makeStops(values: string[]): ColorStop[] {
  const count = Math.max(values.length - 1, 1)

  return values.map((value, index) => ({
    id: crypto.randomUUID(),
    value,
    position: Math.round((index / count) * 100),
  }))
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function hslToHex(h: number, s: number, l: number) {
  s /= 100
  l /= 100

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2

  let r = 0
  let g = 0
  let b = 0

  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]

  const toHex = (channel: number) =>
    Math.round((channel + m) * 255)
      .toString(16)
      .padStart(2, '0')

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

function createHarmoniousColors(count: number) {
  const baseHue = Math.floor(Math.random() * 360)
  const mode = Math.floor(Math.random() * 3)

  return Array.from({ length: count }, (_, index) => {
    const hue =
      mode === 0
        ? (baseHue + index * 18) % 360
        : mode === 1
          ? (baseHue + index * 45) % 360
          : (baseHue + index * 120) % 360

    const saturation = 64 + Math.floor(Math.random() * 18)
    const lightness =
      count <= 2
        ? 52 + index * 14
        : 48 + Math.round((index / Math.max(count - 1, 1)) * 28)

    return hslToHex(hue, saturation, clamp(lightness, 42, 82))
  })
}

export default function GradientClient() {
  const rootRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const searchParams = useSearchParams()

  const [colors, setColors] = useState<ColorStop[]>([
    { id: 'default-1', value: '#3B82F6', position: 0 },
    { id: 'default-2', value: '#8B5CF6', position: 100 },
  ])
  const [angle, setAngle] = useState(90)
  const [type, setType] = useState<GradientType>('linear')
  const [shape, setShape] = useState<RadialShape>('circle')
  const [copied, setCopied] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const colorsParam = searchParams.get('colors')
    const angleParam = searchParams.get('angle')
    const typeParam = searchParams.get('type')
    const shapeParam = searchParams.get('shape')

    let restoredColors: ColorStop[] | null = null
    let restoredAngle: number | null = null
    let restoredType: GradientType | null = null
    let restoredShape: RadialShape | null = null

    if (colorsParam) {
      const values = colorsParam
        .split(',')
        .map((color) => color.trim())
        .filter(Boolean)

      if (values.length >= 2) {
        restoredColors = makeStops(values)
      }

      if (angleParam && Number.isFinite(Number(angleParam))) {
        restoredAngle = Number(angleParam)
      }

      if (typeParam === 'linear' || typeParam === 'radial') {
        restoredType = typeParam
      }

      if (shapeParam === 'circle' || shapeParam === 'ellipse') {
        restoredShape = shapeParam
      }
    }

    if (!restoredColors) {
      const saved = localStorage.getItem('bitleap-gradient')

      if (saved) {
        try {
          const parsed = JSON.parse(saved) as {
            colors?: string[]
            stops?: ColorStop[]
            angle?: number
            type?: GradientType
            shape?: RadialShape
          }

          if (Array.isArray(parsed.stops) && parsed.stops.length >= 2) {
            restoredColors = parsed.stops.map((stop) => ({
              id: crypto.randomUUID(),
              value: stop.value,
              position: clamp(Number(stop.position) || 0, 0, 100),
            }))
          } else if (Array.isArray(parsed.colors) && parsed.colors.length >= 2) {
            restoredColors = makeStops(parsed.colors)
          }

          if (typeof parsed.angle === 'number') restoredAngle = parsed.angle
          if (parsed.type === 'linear' || parsed.type === 'radial') restoredType = parsed.type
          if (parsed.shape === 'circle' || parsed.shape === 'ellipse') restoredShape = parsed.shape
        } catch {
          // ignore invalid local data
        }
      }
    }

    setColors((current) => restoredColors ?? current)
    setAngle((current) => restoredAngle ?? current)
    setType((current) => restoredType ?? current)
    setShape((current) => restoredShape ?? current)
    setHydrated(true)
  }, [searchParams])

  useEffect(() => {
    if (!hydrated) return

    localStorage.setItem(
      'bitleap-gradient',
      JSON.stringify({
        stops: colors.map(({ value, position }) => ({ value, position })),
        angle,
        type,
        shape,
      }),
    )
  }, [colors, angle, type, shape, hydrated])

  useEffect(() => {
    if (!rootRef.current) return

    const ctx = gsap.context(() => {
      gsap.timeline({ defaults: { ease: 'power4.out' } })
        .from('.gradient-kicker', { y: 16, opacity: 0, duration: 0.42 })
        .from('.gradient-title', { y: 44, opacity: 0, duration: 0.7 }, '-=0.18')
        .from('.gradient-copy', { y: 22, opacity: 0, duration: 0.5 }, '-=0.34')
        .from('.gradient-preview-shell', { scale: 0.94, y: 28, opacity: 0, duration: 0.72 }, '-=0.42')
        .from('.gradient-panel', { x: 30, opacity: 0, duration: 0.6 }, '-=0.5')
    }, rootRef)

    return () => ctx.revert()
  }, [])

  const orderedColors = useMemo(
    () => [...colors].sort((a, b) => a.position - b.position),
    [colors],
  )

  const stopsText = useMemo(
    () => orderedColors.map((color) => `${color.value} ${color.position}%`).join(', '),
    [orderedColors],
  )

  const previewStyle = useMemo(() => {
    if (type === 'linear') {
      return `linear-gradient(${angle}deg, ${stopsText})`
    }

    return `radial-gradient(${shape} at center, ${stopsText})`
  }, [angle, shape, stopsText, type])

  const cssCode = `background: ${previewStyle};`

  const animatePreview = useCallback(() => {
    if (!previewRef.current) return

    gsap.fromTo(
      previewRef.current,
      { scale: 0.985, rotate: -0.35 },
      { scale: 1, rotate: 0, duration: 0.42, ease: 'power3.out', overwrite: true },
    )
  }, [])

  function updateColors(next: ColorStop[]) {
    setColors(next)
    requestAnimationFrame(animatePreview)
  }

  function addColor() {
    const index = colors.length
    const previous = orderedColors[index - 1]
    const nextPosition = previous ? clamp(previous.position + 15, 0, 100) : 50

    updateColors([
      ...colors,
      {
        id: crypto.randomUUID(),
        value: createHarmoniousColors(1)[0],
        position: nextPosition,
      },
    ])
  }

  function removeColor(id: string) {
    if (colors.length <= 2) return
    updateColors(colors.filter((color) => color.id !== id))
  }

  function updateColor(id: string, patch: Partial<ColorStop>) {
    updateColors(
      colors.map((color) =>
        color.id === id
          ? {
              ...color,
              ...patch,
              position:
                patch.position === undefined
                  ? color.position
                  : clamp(patch.position, 0, 100),
            }
          : color,
      ),
    )
  }

  function moveColor(id: string, direction: -1 | 1) {
    const currentIndex = colors.findIndex((color) => color.id === id)
    const targetIndex = currentIndex + direction

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= colors.length) return

    const next = [...colors]
    const [item] = next.splice(currentIndex, 1)
    next.splice(targetIndex, 0, item)
    updateColors(next)
  }

  function randomizeAll() {
    const values = createHarmoniousColors(colors.length)
    const next = makeStops(values)

    updateColors(next)
    setAngle(Math.floor(Math.random() * 8) * 45)
  }

  function resetGradient() {
    updateColors([
      { id: crypto.randomUUID(), value: '#3B82F6', position: 0 },
      { id: crypto.randomUUID(), value: '#8B5CF6', position: 100 },
    ])
    setAngle(90)
    setType('linear')
    setShape('circle')
  }

  function loadPreset(preset: PresetGradient) {
    updateColors(makeStops(preset.colors))
    setAngle(preset.angle ?? 90)
    setType(preset.type ?? 'linear')
    setShape(preset.shape ?? 'circle')
  }

  async function copy() {
    await navigator.clipboard.writeText(cssCode)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  const controlButton = (active: boolean) =>
    `rounded-xl border px-3 py-2 text-xs font-medium transition ${
      active
        ? 'border-zinc-950 bg-zinc-950 text-white'
        : 'border-black/[0.07] bg-white text-zinc-500 hover:border-violet-200 hover:text-violet-600'
    }`

  return (
    <div ref={rootRef} className="relative min-h-screen overflow-hidden bg-[#f7f7fa] text-zinc-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_5%,rgba(237,233,254,.75),transparent_25%),radial-gradient(circle_at_92%_10%,rgba(224,242,254,.7),transparent_27%),radial-gradient(circle_at_50%_82%,rgba(253,242,248,.52),transparent_34%)]" />

      <div className="relative mx-auto w-full max-w-[1540px] px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <Breadcrumb />

        <header className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="gradient-kicker inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-violet-600">
              <Sparkles className="h-3.5 w-3.5" />
              Gradient Studio
            </div>

            <h1 className="gradient-title mt-4 text-3xl font-semibold tracking-[-0.055em] sm:text-4xl">
              渐变色生成器
            </h1>

            <p className="gradient-copy mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              多色节点、自由角度、线性与径向渐变。实时预览、自动保存，一键复制生产可用 CSS。
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={randomizeAll}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-black/[0.06] bg-white/75 px-4 text-[11px] font-medium text-zinc-600 backdrop-blur transition hover:border-violet-200 hover:text-violet-600"
            >
              <Dice5 className="h-4 w-4" />
              和谐随机
            </button>

            <button
              type="button"
              onClick={resetGradient}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-black/[0.06] bg-white/75 px-4 text-[11px] font-medium text-zinc-600 backdrop-blur transition hover:bg-white"
            >
              <RotateCcw className="h-4 w-4" />
              重置
            </button>
          </div>
        </header>

        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_420px]">
          <section className="gradient-preview-shell min-w-0 xl:sticky xl:top-20 xl:self-start">
            <div className="overflow-hidden rounded-[30px] border border-black/[0.055] bg-white/70 p-3 shadow-[0_30px_90px_-62px_rgba(67,56,202,.28)] backdrop-blur-xl">
              <div
                ref={previewRef}
                className="relative min-h-[480px] overflow-hidden rounded-[24px] sm:min-h-[560px]"
                style={{ background: previewStyle }}
              >
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(125deg,rgba(255,255,255,.22),transparent_30%,transparent_68%,rgba(255,255,255,.12))]" />

                <div className="absolute left-4 top-4 rounded-full bg-black/18 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-white backdrop-blur-md">
                  Live preview
                </div>

                <div className="absolute right-4 top-4 rounded-full bg-white/20 px-3 py-1.5 font-mono text-[9px] text-white backdrop-blur-md">
                  {type === 'linear' ? `${angle}°` : shape}
                </div>

                <div className="absolute bottom-4 left-4 right-4">
                  <div className="rounded-[18px] border border-white/18 bg-black/16 p-4 text-white backdrop-blur-xl">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-[9px] uppercase tracking-[0.16em] text-white/55">Gradient recipe</div>
                        <div className="mt-1 text-sm font-medium">
                          {colors.length} 个颜色节点 · {type === 'linear' ? '线性渐变' : '径向渐变'}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={copy}
                        className="inline-flex h-9 items-center gap-2 rounded-full bg-white px-3.5 text-[10px] font-semibold text-zinc-900 transition hover:scale-[1.02]"
                      >
                        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? '已复制' : '复制 CSS'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-[22px] border border-black/[0.055] bg-[#111113] shadow-[0_26px_70px_-54px_rgba(0,0,0,.45)]">
              <div className="flex h-10 items-center justify-between border-b border-white/[0.07] px-4">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                  <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.12em] text-white/28">css</span>
                </div>

                <button
                  type="button"
                  onClick={copy}
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] text-white/45 transition hover:bg-white/[0.06] hover:text-white"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? '已复制' : '复制'}
                </button>
              </div>

              <pre className="overflow-x-auto p-4 font-mono text-[11px] leading-6 text-emerald-300">
                <code>{cssCode}</code>
              </pre>
            </div>
          </section>

          <aside className="gradient-panel space-y-4">
            <section className="rounded-[24px] border border-black/[0.055] bg-white/82 p-4 shadow-[0_22px_70px_-56px_rgba(67,56,202,.22)] backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[9px] uppercase tracking-[0.17em] text-zinc-300">01 / Presets</div>
                  <h2 className="mt-1 text-sm font-semibold text-zinc-800">快速预设</h2>
                </div>
                <WandSparkles className="h-4 w-4 text-violet-400" />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {PRESET_GRADIENTS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => loadPreset(preset)}
                    className="group text-left"
                  >
                    <div
                      className="h-14 rounded-[14px] border border-black/[0.05] transition duration-300 group-hover:-translate-y-0.5 group-hover:scale-[1.02]"
                      style={{
                        background: `linear-gradient(${preset.angle ?? 90}deg, ${preset.colors.join(', ')})`,
                      }}
                    />
                    <div className="mt-1.5 truncate text-[9px] font-medium text-zinc-400 group-hover:text-zinc-700">
                      {preset.name}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-[24px] border border-black/[0.055] bg-white/82 p-4 shadow-[0_22px_70px_-56px_rgba(67,56,202,.18)] backdrop-blur-xl">
              <div className="text-[9px] uppercase tracking-[0.17em] text-zinc-300">02 / Type</div>
              <h2 className="mt-1 text-sm font-semibold text-zinc-800">渐变方式</h2>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setType('linear')} className={controlButton(type === 'linear')}>
                  线性渐变
                </button>
                <button type="button" onClick={() => setType('radial')} className={controlButton(type === 'radial')}>
                  径向渐变
                </button>
              </div>

              {type === 'linear' ? (
                <div className="mt-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400">角度</span>
                    <div className="flex items-center gap-1 rounded-lg border border-black/[0.06] bg-zinc-50 px-2">
                      <input
                        type="number"
                        min={0}
                        max={360}
                        value={angle}
                        onChange={(event) => setAngle(clamp(Number(event.target.value), 0, 360))}
                        className="h-8 w-12 bg-transparent text-right font-mono text-[11px] text-zinc-600 outline-none"
                      />
                      <span className="text-[10px] text-zinc-300">°</span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={angle}
                    onChange={(event) => setAngle(Number(event.target.value))}
                    className="mt-3 w-full accent-violet-500"
                  />

                  <div className="mt-3 grid grid-cols-8 gap-1.5">
                    {DIRECTIONS.map((direction) => (
                      <button
                        key={direction.angle}
                        type="button"
                        title={direction.hint}
                        onClick={() => setAngle(direction.angle)}
                        className={`flex h-9 items-center justify-center rounded-lg border text-sm transition ${
                          angle === direction.angle
                            ? 'border-violet-300 bg-violet-50 text-violet-700'
                            : 'border-black/[0.055] bg-zinc-50 text-zinc-400 hover:bg-white hover:text-zinc-700'
                        }`}
                      >
                        {direction.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-5">
                  <span className="text-[10px] text-zinc-400">形状</span>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {(['circle', 'ellipse'] as RadialShape[]).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setShape(item)}
                        className={controlButton(shape === item)}
                      >
                        {item === 'circle' ? '圆形' : '椭圆'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-[24px] border border-black/[0.055] bg-white/82 p-4 shadow-[0_22px_70px_-56px_rgba(67,56,202,.18)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[9px] uppercase tracking-[0.17em] text-zinc-300">03 / Stops</div>
                  <h2 className="mt-1 text-sm font-semibold text-zinc-800">颜色节点</h2>
                </div>

                <span className="rounded-full bg-zinc-50 px-2.5 py-1 font-mono text-[9px] text-zinc-400">
                  {colors.length} stops
                </span>
              </div>

              <div className="mt-4 space-y-2">
                {colors.map((color, index) => (
                  <div
                    key={color.id}
                    className="group rounded-[16px] border border-black/[0.055] bg-[#fafafa] p-2.5 transition hover:border-violet-100 hover:bg-white"
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="color"
                        value={color.value}
                        onChange={(event) => updateColor(color.id, { value: event.target.value.toUpperCase() })}
                        className="h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-xl border-0 bg-transparent p-0"
                      />

                      <input
                        value={color.value}
                        onChange={(event) => updateColor(color.id, { value: event.target.value })}
                        className="h-10 min-w-0 flex-1 rounded-xl border border-black/[0.06] bg-white px-3 font-mono text-[11px] uppercase text-zinc-600 outline-none focus:border-violet-200 focus:ring-4 focus:ring-violet-100/60"
                      />

                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => moveColor(color.id, -1)}
                          disabled={index === 0}
                          className="flex h-8 w-7 items-center justify-center rounded-l-lg border border-black/[0.055] bg-white text-zinc-300 transition hover:text-zinc-700 disabled:opacity-25"
                          aria-label="上移颜色"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveColor(color.id, 1)}
                          disabled={index === colors.length - 1}
                          className="-ml-px flex h-8 w-7 items-center justify-center rounded-r-lg border border-black/[0.055] bg-white text-zinc-300 transition hover:text-zinc-700 disabled:opacity-25"
                          aria-label="下移颜色"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeColor(color.id)}
                        disabled={colors.length <= 2}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-300 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-25"
                        aria-label="删除颜色"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={color.position}
                        onChange={(event) =>
                          updateColor(color.id, {
                            position: Number(event.target.value),
                          })
                        }
                        className="min-w-0 flex-1 accent-violet-500"
                      />
                      <div className="w-12 text-right font-mono text-[9px] text-zinc-400">
                        {color.position}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addColor}
                className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-black/[0.1] bg-zinc-50 text-[11px] font-medium text-zinc-400 transition hover:border-violet-200 hover:bg-violet-50/50 hover:text-violet-600"
              >
                <Plus className="h-4 w-4" />
                添加颜色节点
              </button>
            </section>
          </aside>
        </div>

        <section className="mt-10 grid gap-3 md:grid-cols-3">
          <div className="rounded-[20px] border border-black/[0.055] bg-white/68 p-4 backdrop-blur">
            <div className="text-[9px] uppercase tracking-[0.18em] text-zinc-300">Stops</div>
            <div className="mt-2 text-sm font-semibold text-zinc-700">自由节点</div>
            <p className="mt-1 text-[11px] leading-5 text-zinc-400">每个颜色都可以单独控制位置与顺序。</p>
          </div>

          <div className="rounded-[20px] border border-black/[0.055] bg-white/68 p-4 backdrop-blur">
            <div className="text-[9px] uppercase tracking-[0.18em] text-zinc-300">Random</div>
            <div className="mt-2 text-sm font-semibold text-zinc-700">和谐随机</div>
            <p className="mt-1 text-[11px] leading-5 text-zinc-400">不再纯随机 RGB，生成更容易使用的配色。</p>
          </div>

          <div className="rounded-[20px] border border-black/[0.055] bg-white/68 p-4 backdrop-blur">
            <div className="text-[9px] uppercase tracking-[0.18em] text-zinc-300">Local</div>
            <div className="mt-2 text-sm font-semibold text-zinc-700">本地保存</div>
            <p className="mt-1 text-[11px] leading-5 text-zinc-400">刷新页面后会自动恢复上一次编辑状态。</p>
          </div>
        </section>

        <div className="mt-8">
          <FooterNote />
        </div>
      </div>
    </div>
  )
}
