'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  Check,
  Code2,
  Copy,
  MousePointer2,
  Search,
  Sparkles,
  X,
} from 'lucide-react'
import { buttonPresets, type ButtonPreset } from './presets'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

export default function ButtonAnimations() {
  const rootRef = useRef<HTMLDivElement>(null)
  const magneticRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const [selected, setSelected] = useState<ButtonPreset | null>(null)
  const [copiedKey, setCopiedKey] = useState('')
  const [category, setCategory] = useState('全部')
  const [query, setQuery] = useState('')
  const [rippleMap, setRippleMap] = useState<Record<string, React.CSSProperties>>({})
  const [magneticMap, setMagneticMap] = useState<Record<string, React.CSSProperties>>({})

  const categories = useMemo(
    () => ['全部', ...new Set(buttonPresets.map((preset) => preset.category))],
    [],
  )

  const list = useMemo(() => {
    const keyword = query.trim().toLowerCase()

    return buttonPresets.filter((preset) => {
      const matchesCategory = category === '全部' || preset.category === category
      const matchesQuery =
        !keyword ||
        preset.name.toLowerCase().includes(keyword) ||
        preset.description.toLowerCase().includes(keyword) ||
        preset.category.toLowerCase().includes(keyword)

      return matchesCategory && matchesQuery
    })
  }, [category, query])

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    if (!rootRef.current) return

    const ctx = gsap.context(() => {
      gsap.timeline({ defaults: { ease: 'power4.out' } })
        .from('.button-kicker', { y: 16, opacity: 0, duration: 0.42 })
        .from('.button-title', { y: 44, opacity: 0, duration: 0.72 }, '-=0.18')
        .from('.button-copy', { y: 22, opacity: 0, duration: 0.5 }, '-=0.34')
        .from('.button-toolbar', { y: 18, opacity: 0, duration: 0.46 }, '-=0.28')
        .from('.button-hero-art', { scale: 0.9, rotate: 3, opacity: 0, duration: 0.76 }, '-=0.6')

      gsap.to('.button-orbit-a', {
        rotate: 360,
        repeat: -1,
        duration: 18,
        ease: 'none',
      })

      gsap.to('.button-orbit-b', {
        rotate: -360,
        repeat: -1,
        duration: 25,
        ease: 'none',
      })
    }, rootRef)

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    const cards = gsap.utils.toArray<HTMLElement>('.button-card')

    gsap.killTweensOf(cards)
    gsap.set(cards, { autoAlpha: 1, y: 0, scale: 1, clearProps: 'transform' })

    gsap.fromTo(
      cards,
      { y: 38, autoAlpha: 0, scale: 0.965 },
      {
        y: 0,
        autoAlpha: 1,
        scale: 1,
        duration: 0.5,
        stagger: 0.04,
        ease: 'power3.out',
        clearProps: 'transform',
      },
    )
  }, [category, query])

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text)
    setCopiedKey(key)
    window.setTimeout(() => setCopiedKey(''), 1500)
  }

  function handleRipple(id: string, event: React.MouseEvent<HTMLButtonElement>) {
    const button = event.currentTarget
    const rect = button.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = event.clientX - rect.left - size / 2
    const y = event.clientY - rect.top - size / 2

    setRippleMap((current) => ({
      ...current,
      [id]: { width: size, height: size, left: x, top: y },
    }))

    window.setTimeout(() => {
      setRippleMap((current) => ({ ...current, [id]: {} }))
    }, 620)
  }

  function handleMagneticMove(id: string, event: React.MouseEvent<HTMLButtonElement>) {
    const element = magneticRefs.current[id]
    if (!element) return

    const rect = element.getBoundingClientRect()
    const x = event.clientX - rect.left - rect.width / 2
    const y = event.clientY - rect.top - rect.height / 2

    setMagneticMap((current) => ({
      ...current,
      [id]: {
        transform: `translate(${x * 0.14}px, ${y * 0.14}px)`,
      },
    }))
  }

  function handleMagneticLeave(id: string) {
    setMagneticMap((current) => ({
      ...current,
      [id]: { transform: 'translate(0, 0)' },
    }))
  }

  return (
    <div ref={rootRef} className="relative min-h-screen overflow-hidden bg-[#f7f7fa] text-zinc-950">
      <style dangerouslySetInnerHTML={{ __html: buttonPresets.map((item) => item.css).join('\n') }} />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_4%,rgba(237,233,254,.72),transparent_26%),radial-gradient(circle_at_92%_9%,rgba(224,242,254,.68),transparent_28%),radial-gradient(circle_at_50%_78%,rgba(253,242,248,.5),transparent_34%)]" />

      <div className="relative mx-auto w-full max-w-[1540px] px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <Breadcrumb />

        <section className="mt-5 grid min-h-[340px] items-center gap-8 rounded-[30px] border border-black/[0.055] bg-white/72 px-5 py-8 shadow-[0_30px_90px_-68px_rgba(67,56,202,.24)] backdrop-blur-xl md:px-8 lg:grid-cols-[1.05fr_.95fr] lg:px-10">
          <div>
            <div className="button-kicker inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-violet-600">
              <Sparkles className="h-3.5 w-3.5" />
              Button Motion Library
            </div>

            <h1 className="button-title mt-4 text-4xl font-semibold leading-[0.95] tracking-[-0.06em] sm:text-5xl lg:text-6xl">
              按钮不只是
              <br />
              <span className="text-violet-500">变个颜色。</span>
            </h1>

            <p className="button-copy mt-5 max-w-xl text-sm leading-7 text-zinc-500">
              我把原来偏夸张、偏旧式的效果删减了一轮，只保留更适合现代 UI 的 hover、点击、边框、发光与磁吸交互。
            </p>

            <div className="button-toolbar mt-7 relative max-w-xl">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-300" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索按钮效果…"
                className="h-11 w-full rounded-full border border-black/[0.06] bg-white/80 pl-10 pr-4 text-sm text-zinc-700 outline-none transition placeholder:text-zinc-300 focus:border-violet-200 focus:ring-4 focus:ring-violet-100/65"
              />
            </div>
          </div>

          <div className="button-hero-art relative mx-auto h-[260px] w-full max-w-[470px]">
            <div className="absolute left-[8%] top-[9%] h-[72%] w-[72%] rotate-6 rounded-[38%_62%_56%_44%/48%_36%_64%_52%] bg-[#d9c8ff]" />
            <div className="absolute bottom-[7%] left-[0%] h-[55%] w-[68%] -rotate-12 rounded-[58%_42%_36%_64%/58%_40%_60%_42%] bg-[#a8efff] mix-blend-multiply" />
            <div className="absolute right-[2%] top-[18%] h-[55%] w-[56%] rotate-12 rounded-[38%_62%_70%_30%/61%_34%_66%_39%] bg-[#dfff91] mix-blend-multiply" />

            <div className="button-orbit-a absolute left-1/2 top-1/2 h-[76%] w-[76%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/12">
              <span className="absolute left-1/2 top-[-5px] h-2.5 w-2.5 rounded-full bg-zinc-950" />
            </div>

            <div className="button-orbit-b absolute left-1/2 top-1/2 h-[52%] w-[52%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-black/12">
              <span className="absolute bottom-[9%] right-[5%] h-2 w-2 rounded-full bg-violet-500" />
            </div>

            <div className="absolute left-1/2 top-1/2 flex h-[124px] w-[124px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-[36px] bg-zinc-950 text-white shadow-[0_30px_70px_-28px_rgba(0,0,0,.45)]">
              <MousePointer2 className="h-6 w-6 text-[#dfff91]" />
              <span className="mt-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/45">Curated</span>
              <span className="mt-0.5 text-lg font-semibold">Button Lab</span>
            </div>
          </div>
        </section>

        <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {categories.map((item) => {
              const count =
                item === '全部'
                  ? buttonPresets.length
                  : buttonPresets.filter((preset) => preset.category === item).length

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[11px] font-medium transition ${
                    category === item
                      ? 'border-zinc-950 bg-zinc-950 text-white'
                      : 'border-black/[0.06] bg-white/76 text-zinc-500 hover:border-violet-200 hover:text-violet-600'
                  }`}
                >
                  {item}
                  <span className={`font-mono text-[9px] ${category === item ? 'text-white/45' : 'text-zinc-300'}`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="text-[10px] text-zinc-400">
            当前显示 <span className="font-mono text-zinc-600">{list.length}</span> 个效果
          </div>
        </div>

        {list.length > 0 ? (
          <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {list.map((item) => (
              <article
                key={item.id}
                onClick={() => setSelected(item)}
                className="button-card group cursor-pointer rounded-[24px] border border-black/[0.055] bg-white/86 p-4 shadow-[0_20px_60px_-48px_rgba(24,24,27,.22)] backdrop-blur-xl transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1.5 hover:border-violet-200/70 hover:shadow-[0_30px_80px_-46px_rgba(109,40,217,.24)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.16em] text-zinc-300">{item.category}</div>
                    <h3 className="mt-1 text-sm font-semibold text-zinc-800">{item.name}</h3>
                  </div>

                  <span className="rounded-full bg-zinc-50 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-zinc-300">
                    {item.interaction ?? 'hover'}
                  </span>
                </div>

                <div className="mt-4 flex h-36 items-center justify-center overflow-hidden rounded-[18px] border border-black/[0.055] bg-[#f8f8fa] px-4">
                  {item.id === 'ripple' ? (
                    <button
                      className={item.previewClass}
                      onClick={(event) => {
                        event.stopPropagation()
                        handleRipple(item.id, event)
                      }}
                    >
                      {rippleMap[item.id]?.width && (
                        <span className="ripple" style={rippleMap[item.id]} />
                      )}
                      Click Me
                    </button>
                  ) : item.id === 'magnetic' ? (
                    <button
                      ref={(element) => {
                        magneticRefs.current[item.id] = element
                      }}
                      className={item.previewClass}
                      style={magneticMap[item.id]}
                      onMouseMove={(event) => handleMagneticMove(item.id, event)}
                      onMouseLeave={() => handleMagneticLeave(item.id)}
                      onClick={(event) => event.stopPropagation()}
                    >
                      Magnetic
                    </button>
                  ) : (
                    <div
                      onClick={(event) => event.stopPropagation()}
                      dangerouslySetInnerHTML={{ __html: item.html }}
                    />
                  )}
                </div>

                <p className="mt-3 min-h-10 text-[11px] leading-5 text-zinc-400">
                  {item.description}
                </p>

                <div className="mt-3 flex items-center justify-between border-t border-black/[0.045] pt-3">
                  <span className="text-[9px] uppercase tracking-[0.14em] text-zinc-300">
                    点击查看源码
                  </span>
                  <Code2 className="h-4 w-4 text-zinc-300 transition group-hover:text-violet-500" />
                </div>
              </article>
            ))}
          </section>
        ) : (
          <div className="mt-6 rounded-[24px] border border-dashed border-black/[0.08] bg-white/60 px-6 py-16 text-center backdrop-blur">
            <div className="text-sm font-medium text-zinc-500">没有找到匹配的按钮动画</div>
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setCategory('全部')
              }}
              className="mt-3 text-xs font-medium text-violet-600 hover:text-violet-800"
            >
              清空筛选
            </button>
          </div>
        )}

        <section className="mt-12 grid gap-3 md:grid-cols-3">
          <div className="rounded-[20px] border border-black/[0.055] bg-white/68 p-4 backdrop-blur">
            <div className="text-[9px] uppercase tracking-[0.18em] text-zinc-300">Curated</div>
            <div className="mt-2 text-sm font-semibold text-zinc-700">去掉廉价感</div>
            <p className="mt-1 text-[11px] leading-5 text-zinc-400">删除抖动、闪屏等高干扰效果，保留更适合现代 UI 的反馈。</p>
          </div>

          <div className="rounded-[20px] border border-black/[0.055] bg-white/68 p-4 backdrop-blur">
            <div className="text-[9px] uppercase tracking-[0.18em] text-zinc-300">Interaction</div>
            <div className="mt-2 text-sm font-semibold text-zinc-700">真实交互</div>
            <p className="mt-1 text-[11px] leading-5 text-zinc-400">Ripple 与 Magnetic 不是假预览，页面里可以直接操作。</p>
          </div>

          <div className="rounded-[20px] border border-black/[0.055] bg-white/68 p-4 backdrop-blur">
            <div className="text-[9px] uppercase tracking-[0.18em] text-zinc-300">Source</div>
            <div className="mt-2 text-sm font-semibold text-zinc-700">HTML + CSS</div>
            <p className="mt-1 text-[11px] leading-5 text-zinc-400">弹窗内分别复制结构和样式，接入项目更直接。</p>
          </div>
        </section>

        <div className="mt-8">
          <FooterNote />
        </div>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4 backdrop-blur-md"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[88vh] w-full max-w-4xl overflow-hidden rounded-[28px] border border-white/60 bg-white/95 shadow-[0_35px_100px_-45px_rgba(0,0,0,.5)] backdrop-blur-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-black/[0.055] px-5 py-4 sm:px-6">
              <div>
                <div className="text-[9px] uppercase tracking-[0.16em] text-violet-500">{selected.category}</div>
                <h3 className="mt-1 text-lg font-semibold tracking-[-0.025em] text-zinc-900">{selected.name}</h3>
                <p className="mt-1 text-xs text-zinc-400">{selected.description}</p>
              </div>

              <button
                type="button"
                onClick={() => setSelected(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.055] bg-zinc-50 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                aria-label="关闭"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[calc(88vh-92px)] overflow-y-auto p-5 sm:p-6">
              <div className="grid gap-4 lg:grid-cols-2">
                <SourceBlock
                  label="HTML"
                  language="html"
                  text={selected.html}
                  copied={copiedKey === `modal-html-${selected.id}`}
                  onCopy={() => copy(selected.html, `modal-html-${selected.id}`)}
                />

                <SourceBlock
                  label="CSS"
                  language="css"
                  text={selected.css}
                  copied={copiedKey === `modal-css-${selected.id}`}
                  onCopy={() => copy(selected.css, `modal-css-${selected.id}`)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SourceBlock({
  label,
  language,
  text,
  copied,
  onCopy,
}: {
  label: string
  language: string
  text: string
  copied: boolean
  onCopy: () => void
}) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-black/[0.055] bg-[#111113]">
      <div className="flex h-11 items-center justify-between border-b border-white/[0.07] px-4">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.12em] text-white/28">
            {language}
          </span>
        </div>

        <button
          type="button"
          onClick={onCopy}
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] text-white/45 transition hover:bg-white/[0.06] hover:text-white"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? '已复制' : `复制 ${label}`}
        </button>
      </div>

      <pre className="max-h-[440px] overflow-auto p-4 font-mono text-[11px] leading-6 text-white/64">
        <code>{text}</code>
      </pre>
    </div>
  )
}
