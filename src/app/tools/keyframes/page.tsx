'use client'

import { useMemo, useRef, useState } from 'react'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

type KeyframeItem = {
  id: string
  percent: number
  cssText: string
}

type TimingPreset = {
  label: string
  value: string
}

const TIMING_PRESETS: TimingPreset[] = [
  { label: 'Ease', value: 'ease' },
  { label: 'Ease Out', value: 'cubic-bezier(0.22, 1, 0.36, 1)' },
  { label: 'Ease In Out', value: 'cubic-bezier(0.65, 0, 0.35, 1)' },
  { label: 'Linear', value: 'linear' },
]

const QUICK_PRESETS = [
  {
    name: 'Fade Up',
    duration: 0.7,
    timing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    frames: [
      { percent: 0, cssText: 'transform: translateY(18px); opacity: 0;' },
      { percent: 100, cssText: 'transform: translateY(0); opacity: 1;' },
    ],
  },
  {
    name: 'Scale In',
    duration: 0.55,
    timing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    frames: [
      { percent: 0, cssText: 'transform: scale(0.86); opacity: 0;' },
      { percent: 100, cssText: 'transform: scale(1); opacity: 1;' },
    ],
  },
  {
    name: 'Soft Bounce',
    duration: 0.75,
    timing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    frames: [
      { percent: 0, cssText: 'transform: translateY(0) scale(1);' },
      { percent: 55, cssText: 'transform: translateY(-16px) scale(1.03);' },
      { percent: 100, cssText: 'transform: translateY(0) scale(1);' },
    ],
  },
  {
    name: 'Rotate In',
    duration: 0.7,
    timing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    frames: [
      { percent: 0, cssText: 'transform: rotate(-10deg) scale(0.92); opacity: 0;' },
      { percent: 100, cssText: 'transform: rotate(0deg) scale(1); opacity: 1;' },
    ],
  },
]

function makeId() {
  return crypto.randomUUID()
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
}

function sanitizeAnimationName(value: string) {
  const cleaned = value
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9_-]/g, '')

  if (!cleaned) return 'demoAnim'
  if (/^[0-9]/.test(cleaned)) return `anim-${cleaned}`

  return cleaned
}

export default function KeyframesPage() {
  const previewRef = useRef<HTMLDivElement>(null)

  const [animName, setAnimName] = useState('demoAnim')
  const [duration, setDuration] = useState(1)
  const [timing, setTiming] = useState('cubic-bezier(0.22, 1, 0.36, 1)')
  const [iteration, setIteration] = useState<'infinite' | '1'>('infinite')
  const [direction, setDirection] = useState<'normal' | 'alternate'>('normal')
  const [keyframes, setKeyframes] = useState<KeyframeItem[]>([
    {
      id: 'default-1',
      percent: 0,
      cssText: 'transform: translateX(0); opacity: 1;',
    },
    {
      id: 'default-2',
      percent: 100,
      cssText: 'transform: translateX(120px); opacity: 0;',
    },
  ])
  const [isPlaying, setIsPlaying] = useState(true)
  const [copiedKey, setCopiedKey] = useState('')

  const safeAnimName = useMemo(
    () => sanitizeAnimationName(animName),
    [animName],
  )

  const orderedKeyframes = useMemo(
    () => [...keyframes].sort((a, b) => a.percent - b.percent),
    [keyframes],
  )

  const keyframesCss = useMemo(() => {
    const lines = [`@keyframes ${safeAnimName} {`]

    orderedKeyframes.forEach((frame) => {
      lines.push(`  ${frame.percent}% {`)
      lines.push(`    ${frame.cssText.trim()}`)
      lines.push('  }')
    })

    lines.push('}')

    return lines.join('\n')
  }, [orderedKeyframes, safeAnimName])

  const animationDeclaration = useMemo(
    () =>
      `animation: ${safeAnimName} ${duration}s ${timing} ${iteration} ${direction};`,
    [direction, duration, iteration, safeAnimName, timing],
  )

  const cssCode = `${keyframesCss}\n\n.preview-element {\n  ${animationDeclaration}\n}`

  function restartPreview() {
    const element = previewRef.current
    if (!element) return

    element.style.animation = 'none'
    void element.offsetWidth
    element.style.animation = ''
    setIsPlaying(true)
  }

  function addKeyframe() {
    const used = new Set(keyframes.map((frame) => frame.percent))
    let nextPercent = 50

    if (used.has(50)) {
      nextPercent = 10
      while (used.has(nextPercent) && nextPercent < 100) {
        nextPercent += 10
      }
    }

    setKeyframes((current) => [
      ...current,
      {
        id: makeId(),
        percent: clampPercent(nextPercent),
        cssText: 'transform: translateY(0); opacity: 1;',
      },
    ])
  }

  function removeKeyframe(id: string) {
    if (keyframes.length <= 2) return

    setKeyframes((current) =>
      current.filter((frame) => frame.id !== id),
    )
  }

  function updateItem(
    id: string,
    field: 'percent' | 'cssText',
    value: string,
  ) {
    setKeyframes((current) =>
      current.map((frame) => {
        if (frame.id !== id) return frame

        if (field === 'percent') {
          return {
            ...frame,
            percent: clampPercent(Number(value)),
          }
        }

        return {
          ...frame,
          cssText: value,
        }
      }),
    )
  }

  function moveKeyframe(id: string, directionValue: -1 | 1) {
    const sorted = [...orderedKeyframes]
    const index = sorted.findIndex((frame) => frame.id === id)
    const targetIndex = index + directionValue

    if (index < 0 || targetIndex < 0 || targetIndex >= sorted.length) {
      return
    }

    const [item] = sorted.splice(index, 1)
    sorted.splice(targetIndex, 0, item)

    setKeyframes(sorted)
  }

  function loadPreset(preset: (typeof QUICK_PRESETS)[number]) {
    setAnimName(
      preset.name
        .replace(/\s+/g, '')
        .replace(/^./, (char) => char.toLowerCase()),
    )
    setDuration(preset.duration)
    setTiming(preset.timing)
    setIteration('infinite')
    setDirection('normal')
    setKeyframes(
      preset.frames.map((frame) => ({
        id: makeId(),
        ...frame,
      })),
    )

    requestAnimationFrame(restartPreview)
  }

  function resetAll() {
    setAnimName('demoAnim')
    setDuration(1)
    setTiming('cubic-bezier(0.22, 1, 0.36, 1)')
    setIteration('infinite')
    setDirection('normal')
    setKeyframes([
      {
        id: makeId(),
        percent: 0,
        cssText: 'transform: translateX(0); opacity: 1;',
      },
      {
        id: makeId(),
        percent: 100,
        cssText: 'transform: translateX(120px); opacity: 0;',
      },
    ])
    setIsPlaying(true)

    requestAnimationFrame(restartPreview)
  }

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text)
    setCopiedKey(key)
    window.setTimeout(() => setCopiedKey(''), 1500)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f7f7fa] text-zinc-950">
      <style>{keyframesCss}</style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_6%_5%,rgba(237,233,254,.66),transparent_24%),radial-gradient(circle_at_94%_8%,rgba(224,242,254,.62),transparent_25%),radial-gradient(circle_at_55%_80%,rgba(253,242,248,.45),transparent_34%)]" />

      <div className="relative mx-auto w-full max-w-[1480px] px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <Breadcrumb />

        <div className="mt-5 flex flex-col gap-4 border-b border-black/[0.055] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-violet-500">
              CSS Motion Tool
            </div>

            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
              Keyframes 动画生成
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              编辑关键帧、时长和缓动，实时预览并生成可以直接使用的 @keyframes CSS。
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_480px]">
          <main className="min-w-0 space-y-5">
            <section className="rounded-[26px] border border-black/[0.055] bg-white/82 p-4 shadow-[0_24px_80px_-60px_rgba(67,56,202,.2)] backdrop-blur-xl sm:p-5">
              <div className="flex flex-col gap-4 border-b border-black/[0.045] pb-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-[9px] uppercase tracking-[0.17em] text-zinc-300">
                    01 / Animation
                  </div>
                  <h2 className="mt-1 text-sm font-semibold text-zinc-800">
                    基础设置
                  </h2>
                </div>

                <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:max-w-3xl lg:grid-cols-4">
                  <label className="block">
                    <span className="mb-1.5 block text-[10px] text-zinc-400">
                      动画名称
                    </span>
                    <input
                      value={animName}
                      onChange={(event) => setAnimName(event.target.value)}
                      className="h-10 w-full rounded-xl border border-black/[0.06] bg-zinc-50 px-3 font-mono text-[11px] text-zinc-700 outline-none focus:border-violet-200 focus:bg-white focus:ring-4 focus:ring-violet-100/55"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-[10px] text-zinc-400">
                      时长
                    </span>
                    <div className="flex h-10 items-center rounded-xl border border-black/[0.06] bg-zinc-50 px-3">
                      <input
                        type="number"
                        min={0.1}
                        step={0.1}
                        value={duration}
                        onChange={(event) =>
                          setDuration(
                            Math.max(0.1, Number(event.target.value) || 0.1),
                          )
                        }
                        className="min-w-0 flex-1 bg-transparent font-mono text-[11px] text-zinc-700 outline-none"
                      />
                      <span className="text-[10px] text-zinc-300">s</span>
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-[10px] text-zinc-400">
                      循环
                    </span>
                    <select
                      value={iteration}
                      onChange={(event) =>
                        setIteration(event.target.value as 'infinite' | '1')
                      }
                      className="h-10 w-full rounded-xl border border-black/[0.06] bg-zinc-50 px-3 text-[11px] text-zinc-600 outline-none focus:border-violet-200"
                    >
                      <option value="infinite">Infinite</option>
                      <option value="1">Once</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-[10px] text-zinc-400">
                      方向
                    </span>
                    <select
                      value={direction}
                      onChange={(event) =>
                        setDirection(
                          event.target.value as 'normal' | 'alternate',
                        )
                      }
                      className="h-10 w-full rounded-xl border border-black/[0.06] bg-zinc-50 px-3 text-[11px] text-zinc-600 outline-none focus:border-violet-200"
                    >
                      <option value="normal">Normal</option>
                      <option value="alternate">Alternate</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="mt-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-[10px] text-zinc-400">缓动曲线</div>
                    <div className="mt-1 font-mono text-[10px] text-zinc-300">
                      {timing}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {TIMING_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setTiming(preset.value)}
                        className={`rounded-full border px-3 py-2 text-[10px] font-medium transition ${
                          timing === preset.value
                            ? 'border-zinc-950 bg-zinc-950 text-white'
                            : 'border-black/[0.06] bg-zinc-50 text-zinc-500 hover:border-violet-200 hover:text-violet-600'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <input
                  value={timing}
                  onChange={(event) => setTiming(event.target.value)}
                  className="mt-3 h-10 w-full rounded-xl border border-black/[0.06] bg-zinc-50 px-3 font-mono text-[11px] text-zinc-600 outline-none focus:border-violet-200 focus:bg-white focus:ring-4 focus:ring-violet-100/55"
                />
              </div>
            </section>

            <section className="rounded-[26px] border border-black/[0.055] bg-white/82 p-4 shadow-[0_24px_80px_-60px_rgba(67,56,202,.18)] backdrop-blur-xl sm:p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[9px] uppercase tracking-[0.17em] text-zinc-300">
                    02 / Timeline
                  </div>
                  <h2 className="mt-1 text-sm font-semibold text-zinc-800">
                    关键帧
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={addKeyframe}
                  className="inline-flex h-9 items-center gap-2 rounded-full bg-zinc-950 px-3.5 text-[10px] font-semibold text-white transition hover:bg-violet-600"
                >
                  <Plus className="h-3.5 w-3.5" />
                  添加关键帧
                </button>
              </div>

              <div className="mt-5">
                <div className="relative mb-6 h-8">
                  <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-zinc-200" />

                  {orderedKeyframes.map((frame) => (
                    <button
                      key={frame.id}
                      type="button"
                      title={`${frame.percent}%`}
                      className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-violet-500 shadow-[0_0_0_1px_rgba(139,92,246,.2)]"
                      style={{ left: `${frame.percent}%` }}
                    />
                  ))}
                </div>

                <div className="space-y-3">
                  {orderedKeyframes.map((frame, index) => (
                    <div
                      key={frame.id}
                      className="rounded-[18px] border border-black/[0.055] bg-[#fafafa] p-3 transition hover:border-violet-100 hover:bg-white"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                        <div className="flex shrink-0 items-center gap-2 sm:w-[122px]">
                          <div className="flex h-9 items-center rounded-xl border border-black/[0.06] bg-white px-2.5">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={frame.percent}
                              onChange={(event) =>
                                updateItem(
                                  frame.id,
                                  'percent',
                                  event.target.value,
                                )
                              }
                              className="w-10 bg-transparent text-right font-mono text-[11px] text-zinc-700 outline-none"
                            />
                            <span className="ml-1 text-[10px] text-zinc-300">
                              %
                            </span>
                          </div>

                          <div className="flex">
                            <button
                              type="button"
                              onClick={() => moveKeyframe(frame.id, -1)}
                              disabled={index === 0}
                              className="flex h-8 w-7 items-center justify-center rounded-l-lg border border-black/[0.055] bg-white text-zinc-300 transition hover:text-zinc-700 disabled:opacity-25"
                              aria-label="上移关键帧"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => moveKeyframe(frame.id, 1)}
                              disabled={
                                index === orderedKeyframes.length - 1
                              }
                              className="-ml-px flex h-8 w-7 items-center justify-center rounded-r-lg border border-black/[0.055] bg-white text-zinc-300 transition hover:text-zinc-700 disabled:opacity-25"
                              aria-label="下移关键帧"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <textarea
                          value={frame.cssText}
                          onChange={(event) =>
                            updateItem(
                              frame.id,
                              'cssText',
                              event.target.value,
                            )
                          }
                          placeholder="transform: translateY(0); opacity: 1;"
                          className="min-h-[84px] min-w-0 flex-1 resize-y rounded-xl border border-black/[0.06] bg-white px-3 py-2.5 font-mono text-[11px] leading-5 text-zinc-600 outline-none focus:border-violet-200 focus:ring-4 focus:ring-violet-100/55"
                        />

                        <button
                          type="button"
                          onClick={() => removeKeyframe(frame.id)}
                          disabled={keyframes.length <= 2}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-zinc-300 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-25"
                          aria-label="删除关键帧"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-[26px] border border-black/[0.055] bg-white/82 p-4 backdrop-blur-xl sm:p-5">
              <div className="text-[9px] uppercase tracking-[0.17em] text-zinc-300">
                03 / Presets
              </div>
              <h2 className="mt-1 text-sm font-semibold text-zinc-800">
                快速模板
              </h2>

              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {QUICK_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => loadPreset(preset)}
                    className="rounded-[16px] border border-black/[0.055] bg-zinc-50 p-3 text-left transition hover:-translate-y-0.5 hover:border-violet-200 hover:bg-white"
                  >
                    <div className="text-xs font-semibold text-zinc-700">
                      {preset.name}
                    </div>
                    <div className="mt-1 font-mono text-[9px] text-zinc-300">
                      {preset.frames.length} frames · {preset.duration}s
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </main>

          <aside className="space-y-5 xl:sticky xl:top-20 xl:self-start">
            <section className="rounded-[26px] border border-black/[0.055] bg-white/82 p-4 shadow-[0_26px_80px_-58px_rgba(67,56,202,.24)] backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[9px] uppercase tracking-[0.17em] text-zinc-300">
                    Live Preview
                  </div>
                  <h2 className="mt-1 text-sm font-semibold text-zinc-800">
                    实时预览
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPlaying((current) => !current)}
                  className="inline-flex h-9 items-center gap-2 rounded-full border border-black/[0.06] bg-zinc-50 px-3 text-[10px] font-medium text-zinc-500 transition hover:bg-white hover:text-zinc-800"
                >
                  {isPlaying ? (
                    <Pause className="h-3.5 w-3.5" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  {isPlaying ? '暂停' : '播放'}
                </button>
              </div>

              <div className="relative mt-4 flex h-[330px] items-center justify-center overflow-hidden rounded-[20px] border border-black/[0.055] bg-[#f8f8fa]">
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.045]"
                  style={{
                    backgroundImage:
                      'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}
                />

                <div
                  ref={previewRef}
                  className="relative h-20 w-20 rounded-[22px] bg-gradient-to-br from-violet-500 to-fuchsia-400 shadow-[0_20px_50px_-22px_rgba(139,92,246,.5)]"
                  style={{
                    animationName: safeAnimName,
                    animationDuration: `${duration}s`,
                    animationTimingFunction: timing,
                    animationIterationCount: iteration,
                    animationDirection: direction,
                    animationPlayState: isPlaying
                      ? 'running'
                      : 'paused',
                  }}
                />
              </div>

              {safeAnimName !== animName.trim() && (
                <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[10px] leading-5 text-amber-700">
                  动画名称已自动转换为合法 CSS 标识：
                  <span className="ml-1 font-mono">{safeAnimName}</span>
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-[24px] border border-black/[0.055] bg-[#111113] shadow-[0_26px_70px_-54px_rgba(0,0,0,.42)]">
              <div className="flex h-11 items-center justify-between border-b border-white/[0.07] px-4">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                  <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.12em] text-white/28">
                    css
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => copy(cssCode, 'all-css')}
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] text-white/45 transition hover:bg-white/[0.06] hover:text-white"
                >
                  {copiedKey === 'all-css' ? (
                    <Check className="h-3.5 w-3.5 text-emerald-300" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copiedKey === 'all-css' ? '已复制' : '复制 CSS'}
                </button>
              </div>

              <pre className="max-h-[370px] overflow-auto p-4 font-mono text-[11px] leading-6 text-emerald-300">
                <code>{cssCode}</code>
              </pre>
            </section>
          </aside>
        </div>

        <section className="mt-10 grid gap-3 md:grid-cols-3">
          <div className="rounded-[20px] border border-black/[0.055] bg-white/68 p-4 backdrop-blur">
            <div className="text-[9px] uppercase tracking-[0.18em] text-zinc-300">
              Timeline
            </div>
            <div className="mt-2 text-sm font-semibold text-zinc-700">
              可视时间轴
            </div>
            <p className="mt-1 text-[11px] leading-5 text-zinc-400">
              所有关键帧会按百分比排序，并同步显示在时间轴上。
            </p>
          </div>

          <div className="rounded-[20px] border border-black/[0.055] bg-white/68 p-4 backdrop-blur">
            <div className="text-[9px] uppercase tracking-[0.18em] text-zinc-300">
              Timing
            </div>
            <div className="mt-2 text-sm font-semibold text-zinc-700">
              缓动控制
            </div>
            <p className="mt-1 text-[11px] leading-5 text-zinc-400">
              内置常用 easing，也支持直接填写 cubic-bezier。
            </p>
          </div>

          <div className="rounded-[20px] border border-black/[0.055] bg-white/68 p-4 backdrop-blur">
            <div className="text-[9px] uppercase tracking-[0.18em] text-zinc-300">
              Export
            </div>
            <div className="mt-2 text-sm font-semibold text-zinc-700">
              即时导出
            </div>
            <p className="mt-1 text-[11px] leading-5 text-zinc-400">
              直接复制完整 @keyframes 和 animation 声明。
            </p>
          </div>
        </section>

        <div className="mt-8">
          <FooterNote />
        </div>
      </div>
    </div>
  )
}
