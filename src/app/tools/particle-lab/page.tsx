'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Copy, Download, Expand, Pause, Play, Sparkles, X } from 'lucide-react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'
import {
  DEFAULT_OPTIONS,
  EFFECTS,
  PALETTES,
  buildEffectHtml,
  type EffectCategory,
  type EffectDef,
  type EffectOptions,
} from './effects'

type FilterId = 'all' | EffectCategory

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'particle', label: '粒子' },
  { id: 'background', label: '背景' },
]

const CATEGORY_LABEL: Record<EffectCategory, string> = {
  particle: '粒子',
  background: '背景',
}

/** 下载：效果的唯一真源就是一份 HTML 字符串，这里直接落盘 */
function downloadHtml(filename: string, html: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * 预览用的 iframe。
 *
 * srcDoc 只在「换效果」时重算：改配色 / 速度走 postMessage 通知到 iframe 内部，
 * 这样既不会每次调参都重挂载 iframe（会闪），也保证预览和下载的是同一份代码。
 */
function EffectFrame({
  def,
  options,
  paused,
  className = '',
}: {
  def: EffectDef
  options: EffectOptions
  paused: boolean
  className?: string
}) {
  const ref = useRef<HTMLIFrameElement>(null)
  const [loaded, setLoaded] = useState(false)
  const srcDoc = useMemo(() => buildEffectHtml(def.id), [def.id])

  const send = useCallback((message: unknown) => {
    ref.current?.contentWindow?.postMessage(message, '*')
  }, [])

  // 必须等 iframe 内的脚本跑完（load）再发消息，否则监听器还没挂上
  useEffect(() => {
    if (!loaded) return
    send({ type: paused ? 'fx:pause' : 'fx:resume' })
  }, [loaded, paused, send])

  useEffect(() => {
    if (!loaded) return
    send({ type: 'fx:options', options })
  }, [loaded, options, send])

  return (
    <iframe
      ref={ref}
      srcDoc={srcDoc}
      title={`${def.name} 效果预览`}
      sandbox="allow-scripts"
      onLoad={() => setLoaded(true)}
      className={className}
    />
  )
}

function PalettePills({
  value,
  onChange,
}: {
  value: number
  onChange: (index: number) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PALETTES.map((palette, index) => (
        <button
          key={palette.name}
          type="button"
          onClick={() => onChange(index)}
          aria-pressed={value === index}
          title={palette.name}
          className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] transition ${
            value === index
              ? 'border-white/40 bg-white/10 text-white'
              : 'border-white/10 text-white/45 hover:border-white/25 hover:text-white/80'
          }`}
        >
          <span
            className="h-3 w-3 rounded-full"
            style={{ background: `linear-gradient(135deg, ${palette.colors[0]}, ${palette.colors[1]})` }}
          />
          {palette.name}
        </button>
      ))}
    </div>
  )
}

export default function ParticleLab() {
  const [options, setOptions] = useState<EffectOptions>(DEFAULT_OPTIONS)
  const [filter, setFilter] = useState<FilterId>('all')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [paused, setPaused] = useState(false)
  const [copied, setCopied] = useState(false)
  const [mountedIds, setMountedIds] = useState<string[]>([])
  const [visibleIds, setVisibleIds] = useState<string[]>([])

  const patch = useCallback((next: Partial<EffectOptions>) => {
    setOptions((current) => ({ ...current, ...next }))
  }, [])

  const shown = useMemo(
    () => (filter === 'all' ? EFFECTS : EFFECTS.filter((item) => item.category === filter)),
    [filter],
  )

  const active = useMemo(() => EFFECTS.find((item) => item.id === activeId) ?? null, [activeId])

  /* 只挂载看得见的卡片，并把滚出视口的预览暂停掉：
     十几个 canvas/WebGL 同时跑没有任何必要。 */
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-fx-id]'))
    if (!elements.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.getAttribute('data-fx-id')
          if (!id) return
          if (entry.isIntersecting) {
            setMountedIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
            setVisibleIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
          } else {
            setVisibleIds((prev) => prev.filter((item) => item !== id))
          }
        })
      },
      { rootMargin: '180px' },
    )

    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [shown])

  useEffect(() => {
    if (!active) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])

  const openInTab = (def: EffectDef) => {
    const url = URL.createObjectURL(new Blob([buildEffectHtml(def.id, options)], { type: 'text/html;charset=utf-8' }))
    window.open(url, '_blank', 'noopener')
    window.setTimeout(() => URL.revokeObjectURL(url), 20000)
  }

  const copyCode = async (def: EffectDef) => {
    try {
      await navigator.clipboard.writeText(buildEffectHtml(def.id, options))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      /* 剪贴板不可用时忽略，用户还可以下载 */
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#08080c] text-white/90">
      {/* 背景：两层极淡的光晕，避免整页死黑 */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 50% at 12% 0%, rgba(88,226,192,.10), transparent 60%), radial-gradient(50% 45% at 88% 8%, rgba(176,110,243,.12), transparent 62%)',
        }}
      />

      <div className="relative mx-auto w-full max-w-[1540px] px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <Breadcrumb variant="dark" />

        <header className="mt-8 border-b border-white/10 pb-8">
          <div className="text-[11px] font-semibold uppercase tracking-[.24em] text-white/35">
            PARTICLE &amp; BACKGROUND LAB
          </div>
          <h1 className="mt-4 text-[clamp(32px,5.4vw,64px)] font-bold leading-[1.06] tracking-[-.045em]">
            粒子与背景特效库
          </h1>
          <p className="mt-5 max-w-[62ch] text-sm leading-7 text-white/45">
            {EFFECTS.length} 个纯前端动效，全部是 Canvas / WebGL 实时算出来的，没有 GIF、没有视频、没有依赖。
            挑一个喜欢的，直接下载成单文件 HTML 拿去用；下面的配色、速度、密度对所有预览同时生效。
          </p>

          <div className="mt-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <PalettePills value={options.palette} onChange={(palette) => patch({ palette })} />

            <div className="flex flex-wrap items-center gap-5">
              <label className="flex items-center gap-3 text-[11px] text-white/40">
                速度
                <input
                  type="range"
                  min={0.2}
                  max={2.5}
                  step={0.05}
                  value={options.speed}
                  onChange={(event) => patch({ speed: Number(event.target.value) })}
                  className="w-28 accent-[#58e2c0]"
                />
                <span className="w-9 font-mono text-white/70">{options.speed.toFixed(2)}</span>
              </label>

              <label className="flex items-center gap-3 text-[11px] text-white/40">
                密度
                <input
                  type="range"
                  min={0.3}
                  max={2}
                  step={0.05}
                  value={options.density}
                  onChange={(event) => patch({ density: Number(event.target.value) })}
                  className="w-28 accent-[#58e2c0]"
                />
                <span className="w-9 font-mono text-white/70">{options.density.toFixed(2)}</span>
              </label>

              <button
                type="button"
                onClick={() => setPaused((value) => !value)}
                className="inline-flex items-center gap-2 rounded-full border border-white/12 px-4 py-2 text-xs text-white/70 transition hover:border-white/30 hover:text-white"
              >
                {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                {paused ? '继续预览' : '暂停预览'}
              </button>
            </div>
          </div>
        </header>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {FILTERS.map((item) => {
            const count = item.id === 'all' ? EFFECTS.length : EFFECTS.filter((fx) => fx.category === item.id).length
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                aria-pressed={filter === item.id}
                className={`rounded-full border px-4 py-1.5 text-xs transition ${
                  filter === item.id
                    ? 'border-white/40 bg-white/10 text-white'
                    : 'border-white/10 text-white/45 hover:border-white/25 hover:text-white/80'
                }`}
              >
                {item.label}
                <span className="ml-1.5 font-mono text-[10px] text-white/30">{count}</span>
              </button>
            )
          })}
          <span className="ml-1 text-[11px] text-white/25">把鼠标移到预览上，效果会跟着动</span>
        </div>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((def) => {
            const isMounted = mountedIds.includes(def.id)
            const isPlaying = !paused && visibleIds.includes(def.id)
            return (
              <article
                key={def.id}
                data-fx-id={def.id}
                className="group flex flex-col overflow-hidden rounded-[24px] border border-white/[.08] bg-white/[.02] transition hover:border-white/20"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#05070a]">
                  {isMounted ? (
                    <EffectFrame
                      def={def}
                      options={options}
                      paused={!isPlaying}
                      className="absolute inset-0 h-full w-full border-0"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Sparkles className="h-5 w-5 text-white/15" />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setActiveId(def.id)}
                    aria-label={`放大查看 ${def.name}`}
                    className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white/70 opacity-0 backdrop-blur transition group-hover:opacity-100 hover:text-white"
                  >
                    <Expand className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold tracking-[-.01em]">{def.name}</h2>
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/35">
                      {CATEGORY_LABEL[def.category]}
                    </span>
                  </div>
                  <p className="mt-2 flex-1 text-[11.5px] leading-6 text-white/40">{def.desc}</p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {def.tags.map((tag) => (
                      <span key={tag} className="rounded-md bg-white/[.05] px-1.5 py-0.5 font-mono text-[10px] text-white/35">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => downloadHtml(`bitleap-${def.id}.html`, buildEffectHtml(def.id, options))}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-white/[.09] px-3 py-2 text-[11px] text-white/85 transition hover:bg-white/[.16]"
                    >
                      <Download className="h-3.5 w-3.5" />
                      下载 HTML
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveId(def.id)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/12 px-3 py-2 text-[11px] text-white/60 transition hover:border-white/30 hover:text-white"
                    >
                      查看
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </section>

        <section className="mt-12 grid gap-6 border-t border-white/10 pt-7 md:grid-cols-3">
          <div>
            <div className="text-[11px] font-semibold tracking-[.11em] text-white/30">单文件交付</div>
            <p className="mt-2 text-[11.5px] leading-6 text-white/35">
              下载到的就是一个 .html，双击就能开，没有 CDN、没有构建、没有依赖，配色和参数已经按你调好的写进去了。
            </p>
          </div>
          <div>
            <div className="text-[11px] font-semibold tracking-[.11em] text-white/30">实时计算</div>
            <p className="mt-2 text-[11.5px] leading-6 text-white/35">
              Canvas 2D 与 WebGL 片元着色器实时渲染，尺寸变化自动适配，页面不可见时自动暂停，系统开了「减少动态效果」时只画一帧。
            </p>
          </div>
          <div>
            <div className="text-[11px] font-semibold tracking-[.11em] text-white/30">怎么接进项目</div>
            <p className="mt-2 text-[11.5px] leading-6 text-white/35">
              把 canvas 放到自己想放的容器里、去掉样式里的 fixed 定位即可；背景类效果适合做首屏，粒子类适合做点缀。
            </p>
          </div>
        </section>

        <FooterNote />
      </div>

      {active && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6"
          onClick={() => setActiveId(null)}
        >
          <div
            role="dialog"
            aria-label={`${active.name} 放大预览`}
            className="flex max-h-[92vh] w-full max-w-[1080px] flex-col overflow-hidden rounded-[26px] border border-white/10 bg-[#0b0b11]"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-4 border-b border-white/8 px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold tracking-[-.02em]">{active.name}</h2>
                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/35">
                    {CATEGORY_LABEL[active.category]}
                  </span>
                </div>
                <p className="mt-1.5 text-[11.5px] leading-6 text-white/40">{active.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveId(null)}
                aria-label="关闭"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="relative aspect-[16/9] w-full bg-black">
              <EffectFrame
                def={active}
                options={options}
                paused={paused}
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>

            <div className="flex flex-col gap-4 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <PalettePills value={options.palette} onChange={(palette) => patch({ palette })} />
                <div className="flex flex-wrap items-center gap-4">
                  {active.controls.includes('speed') && (
                    <label className="flex items-center gap-2 text-[11px] text-white/40">
                      速度
                      <input
                        type="range"
                        min={0.2}
                        max={2.5}
                        step={0.05}
                        value={options.speed}
                        onChange={(event) => patch({ speed: Number(event.target.value) })}
                        className="w-24 accent-[#58e2c0]"
                      />
                    </label>
                  )}
                  {active.controls.includes('density') && (
                    <label className="flex items-center gap-2 text-[11px] text-white/40">
                      密度
                      <input
                        type="range"
                        min={0.3}
                        max={2}
                        step={0.05}
                        value={options.density}
                        onChange={(event) => patch({ density: Number(event.target.value) })}
                        className="w-24 accent-[#58e2c0]"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadHtml(`bitleap-${active.id}.html`, buildEffectHtml(active.id, options))}
                  className="inline-flex items-center gap-2 rounded-full bg-[#58e2c0] px-5 py-2.5 text-xs font-semibold text-[#04120e] transition hover:bg-[#6ff0d0]"
                >
                  <Download className="h-3.5 w-3.5" />
                  下载单文件 HTML
                </button>
                <button
                  type="button"
                  onClick={() => copyCode(active)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/12 px-4 py-2.5 text-xs text-white/70 transition hover:border-white/30 hover:text-white"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? '已复制' : '复制代码'}
                </button>
                <button
                  type="button"
                  onClick={() => openInTab(active)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/12 px-4 py-2.5 text-xs text-white/70 transition hover:border-white/30 hover:text-white"
                >
                  <Expand className="h-3.5 w-3.5" />
                  新窗口全屏
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
