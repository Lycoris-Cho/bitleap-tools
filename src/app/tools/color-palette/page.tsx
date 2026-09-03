"use client";

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  ArrowUpRight,
  Check,
  Copy,
  Search,
  Sparkles,
  SwatchBook,
  WandSparkles,
} from 'lucide-react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

type Palette = {
  name: string
  colors: string[]
}

type Gradient = {
  name: string
  colors: string[]
  angle?: number
}

type ViewMode = 'all' | 'palette' | 'gradient'

const PALETTES: Palette[] = [
  // ─────────────────────────
  // 蓝 / 紫系
  // ─────────────────────────
  {
    name: 'Tailwind Blue',
    colors: ['#1D4ED8', '#3B82F6', '#93C5FD', '#EFF6FF'],
  },
  {
    name: 'Stripe',
    colors: ['#635BFF', '#7A73FF', '#A5A0FF', '#F0EFFF'],
  },
  {
    name: 'Discord',
    colors: ['#5865F2', '#7983F5', '#B5BAFF', '#EEF0FF'],
  },
  {
    name: 'Framer',
    colors: ['#0055FF', '#3B7CFF', '#93B4FF', '#EEF4FF'],
  },
  {
    name: 'Linear',
    colors: ['#5E6AD2', '#8A91E8', '#C8CBF5', '#F3F3FC'],
  },
  {
    name: 'Raycast',
    colors: ['#FF6363', '#8F5BFF', '#4F7CFF', '#EFF2FF'],
  },
  {
    name: 'Arc',
    colors: ['#7C5CFF', '#B45EFF', '#FF70B5', '#FFF0F8'],
  },
  {
    name: 'Perplexity',
    colors: ['#1FB8CD', '#5CD4E4', '#A8ECF3', '#F0FCFD'],
  },

  // ─────────────────────────
  // 青 / 绿系
  // ─────────────────────────
  {
    name: 'Spotify',
    colors: ['#1DB954', '#46D878', '#A5EDBD', '#EEFBF2'],
  },
  {
    name: 'WeChat',
    colors: ['#07C160', '#48D98A', '#A5EDC3', '#EEFBF4'],
  },
  {
    name: 'Notion Mint',
    colors: ['#0F766E', '#2DD4BF', '#99F6E4', '#F0FDFA'],
  },
  {
    name: 'Vercel Mint',
    colors: ['#111111', '#3ECF8E', '#A7F3D0', '#F0FDF4'],
  },
  {
    name: 'Supabase',
    colors: ['#3ECF8E', '#65D9A5', '#B7F3D8', '#F2FCF7'],
  },
  {
    name: 'Shopify',
    colors: ['#008060', '#4BBF9F', '#A8E2D2', '#F1FBF8'],
  },
  {
    name: 'Duolingo',
    colors: ['#58CC02', '#89E219', '#C8F59D', '#F5FDEB'],
  },
  {
    name: 'GitHub Green',
    colors: ['#238636', '#3FB950', '#7EE787', '#F0FFF4'],
  },

  // ─────────────────────────
  // 粉 / 红系
  // ─────────────────────────
  {
    name: 'Airbnb',
    colors: ['#FF385C', '#FF6B81', '#FFB0BC', '#FFF1F3'],
  },
  {
    name: 'Instagram',
    colors: ['#833AB4', '#C13584', '#E1306C', '#FCAF45'],
  },
  {
    name: 'Dribbble',
    colors: ['#EA4C89', '#F278A5', '#F8B4CE', '#FFF1F6'],
  },
  {
    name: 'Pinterest',
    colors: ['#E60023', '#F04459', '#F6A7B2', '#FFF1F3'],
  },
  {
    name: 'Netflix',
    colors: ['#B20710', '#E50914', '#F35B62', '#FFF0F1'],
  },
  {
    name: 'YouTube',
    colors: ['#FF0000', '#FF5252', '#FFAAAA', '#FFF1F1'],
  },
  {
    name: 'Threads',
    colors: ['#101010', '#7B61FF', '#D66EFD', '#FAECFF'],
  },
  {
    name: 'Pink Studio',
    colors: ['#BE185D', '#EC4899', '#F9A8D4', '#FDF2F8'],
  },

  // ─────────────────────────
  // 橙 / 黄系
  // ─────────────────────────
  {
    name: 'Figma',
    colors: ['#F24E1E', '#FF7262', '#A259FF', '#1ABCFE'],
  },
  {
    name: 'Orange Studio',
    colors: ['#EA580C', '#F97316', '#FDBA74', '#FFF7ED'],
  },
  {
    name: 'Amazon',
    colors: ['#131921', '#FF9900', '#FFC266', '#FFF5E6'],
  },
  {
    name: 'SoundCloud',
    colors: ['#FF5500', '#FF7A33', '#FFB48F', '#FFF2EC'],
  },
  {
    name: 'Lemon',
    colors: ['#A16207', '#EAB308', '#FDE047', '#FEFCE8'],
  },
  {
    name: 'Warm Editorial',
    colors: ['#9A3412', '#EA580C', '#FDBA74', '#FFF4E8'],
  },

  // ─────────────────────────
  // 黑白 / 中性色
  // ─────────────────────────
  {
    name: 'Apple',
    colors: ['#111111', '#4A4A4A', '#A3A3A3', '#F5F5F7'],
  },
  {
    name: 'Vercel',
    colors: ['#000000', '#404040', '#A3A3A3', '#FAFAFA'],
  },
  {
    name: 'Notion',
    colors: ['#191919', '#5A5852', '#C8C5BE', '#F7F6F3'],
  },
  {
    name: 'GitHub',
    colors: ['#0D1117', '#30363D', '#8B949E', '#F0F6FC'],
  },
  {
    name: 'Graphite',
    colors: ['#18181B', '#52525B', '#A1A1AA', '#F4F4F5'],
  },
  {
    name: 'Warm Gray',
    colors: ['#292524', '#78716C', '#D6D3D1', '#FAFAF9'],
  },

  // ─────────────────────────
  // 更适合你网站审美的设计系
  // ─────────────────────────
  {
    name: 'Lavender Mist',
    colors: ['#6D5BD0', '#9B8CE8', '#D8D1F4', '#F6F3FC'],
  },
  {
    name: 'Misty Blue',
    colors: ['#2563EB', '#60A5FA', '#BFDBFE', '#EFF6FF'],
  },
  {
    name: 'Sakura',
    colors: ['#DB7093', '#F3A6BD', '#FAD7E2', '#FFF4F7'],
  },
  {
    name: 'Aqua Glass',
    colors: ['#0891B2', '#22D3EE', '#A5F3FC', '#ECFEFF'],
  },
  {
    name: 'Violet Night',
    colors: ['#312E81', '#6366F1', '#A5B4FC', '#EEF2FF'],
  },
  {
    name: 'Mint Cloud',
    colors: ['#047857', '#34D399', '#A7F3D0', '#ECFDF5'],
  },
  {
    name: 'Peach Cloud',
    colors: ['#C2410C', '#FB923C', '#FED7AA', '#FFF7ED'],
  },
  {
    name: 'Rose Fog',
    colors: ['#BE123C', '#FB7185', '#FECDD3', '#FFF1F2'],
  },
  {
    name: 'Cyber',
    colors: ['#09090B', '#8B5CF6', '#22D3EE', '#D9F99D'],
  },
  {
    name: 'Aurora',
    colors: ['#6366F1', '#A855F7', '#22D3EE', '#A7F3D0'],
  },
]

const GRADIENTS: Gradient[] = [
  { name: '紫蓝渐变', colors: ['#3B82F6', '#8B5CF6'], angle: 90 },
  { name: '粉橙渐变', colors: ['#EC4899', '#F97316'], angle: 45 },
  { name: '青绿渐变', colors: ['#06B6D4', '#10B981'], angle: 135 },
  { name: '日落', colors: ['#F59E0B', '#EF4444', '#8B5CF6'], angle: 120 },
  { name: '极光', colors: ['#00C9FF', '#92FEA4'], angle: 90 },
  { name: '深海', colors: ['#0F2027', '#203A43', '#2C5364'], angle: 135 },
  { name: '暮光', colors: ['#4B1248', '#F0C27B'], angle: 90 },
  { name: '赛博朋克', colors: ['#00F5FF', '#9D00FF'], angle: 60 },
  { name: '霓虹', colors: ['#FF0080', '#FF8C00', '#40E0D0'], angle: 100 },
  { name: '星空', colors: ['#000428', '#004E92'], angle: 180 },
  { name: '火焰', colors: ['#FF0000', '#FFA500', '#FFFF00'], angle: 45 },
  { name: '奶油', colors: ['#FFF5E1', '#FFE4C4'], angle: 45 },
  { name: '薰衣草', colors: ['#E6E6FA', '#D8BFD8'], angle: 135 },
  { name: '薄荷', colors: ['#98FF98', '#00FF7F'], angle: 90 },
  { name: '雾霾蓝', colors: ['#B0C4DE', '#778899'], angle: 120 },
  { name: '彩虹渐变', colors: ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'], angle: 90 },
  { name: '糖果', colors: ['#FF9A9E', '#FAD0C4', '#A1C4FD'], angle: 120 },
  { name: '金属', colors: ['#8E9EAB', '#EEF2F3'], angle: 45 },
  { name: '玫瑰金', colors: ['#FFECF2', '#FCB9AA', '#F78CA0'], angle: 135 },
  { name: '极简灰', colors: ['#F5F7FA', '#C3CFE2'], angle: 90 },
  { name: '琥珀', colors: ['#FFB75E', '#ED8F03'], angle: 45 },
  { name: '孔雀', colors: ['#0BA360', '#3CD3AD'], angle: 120 },
  { name: '暗夜紫', colors: ['#1A0033', '#4B0082', '#8A2BE2'], angle: 160 },
  { name: '冰河', colors: ['#E0EAFC', '#CFDEF3'], angle: 90 },
  { name: '番茄', colors: ['#FF416C', '#FF4B2B'], angle: 60 },
  { name: '森林', colors: ['#134E5E', '#71B280'], angle: 135 },
  { name: '紫霞', colors: ['#667EEA', '#764BA2'], angle: 90 },
  { name: '蜜桃', colors: ['#FFD194', '#70E1F5'], angle: 110 },
  { name: '火山', colors: ['#F12711', '#F5AF19'], angle: 45 },
  { name: '银河', colors: ['#0F0C29', '#302B63', '#24243E'], angle: 180 },
]

function gradientCss(gradient: Gradient) {
  return `linear-gradient(${gradient.angle ?? 90}deg, ${gradient.colors.join(', ')})`
}

export default function ColorPalettePage() {
  const router = useRouter()
  const rootRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [copiedKey, setCopiedKey] = useState('')

  const filteredPalettes = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return PALETTES
    return PALETTES.filter((palette) => palette.name.toLowerCase().includes(keyword))
  }, [query])

  const filteredGradients = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return GRADIENTS
    return GRADIENTS.filter((gradient) => gradient.name.toLowerCase().includes(keyword))
  }, [query])

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    if (!rootRef.current) return

    const ctx = gsap.context(() => {
      const hero = gsap.timeline({ defaults: { ease: 'power4.out' } })

      hero
        .fromTo('.palette-kicker', { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.42 })
        .fromTo('.palette-title', { y: 46, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.72 }, '-=0.18')
        .fromTo('.palette-copy', { y: 22, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5 }, '-=0.34')
        .fromTo('.palette-toolbar', { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.46 }, '-=0.26')
        .fromTo(
          '.palette-hero-art',
          { scale: 0.9, rotate: 3, autoAlpha: 0 },
          { scale: 1, rotate: 0, autoAlpha: 1, duration: 0.78 },
          '-=0.62',
        )

      gsap.to('.hero-orbit-a', {
        rotate: 360,
        repeat: -1,
        duration: 18,
        ease: 'none',
      })

      gsap.to('.hero-orbit-b', {
        rotate: -360,
        repeat: -1,
        duration: 26,
        ease: 'none',
      })

      gsap.to('.hero-core', {
        y: -8,
        rotate: 2,
        repeat: -1,
        yoyo: true,
        duration: 2.6,
        ease: 'sine.inOut',
      })

      gsap.utils.toArray<HTMLElement>('.section-head').forEach((head) => {
        gsap.fromTo(
          head,
          { y: 28, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.62,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: head,
              start: 'top 92%',
              toggleActions: 'play none none reverse',
            },
          },
        )
      })

      gsap.utils.toArray<HTMLElement>('.info-card').forEach((card, index) => {
        gsap.fromTo(
          card,
          { y: 28, autoAlpha: 0, scale: 0.97 },
          {
            y: 0,
            autoAlpha: 1,
            scale: 1,
            duration: 0.55,
            delay: index * 0.04,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: card,
              start: 'top 94%',
              toggleActions: 'play none none reverse',
            },
          },
        )
      })

      requestAnimationFrame(() => ScrollTrigger.refresh())
    }, rootRef)

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (!rootRef.current) return

    const frame = requestAnimationFrame(() => {
      const cards = gsap.utils.toArray<HTMLElement>('.palette-card')

      // 关键：筛选 / 搜索后先明确恢复可见，避免旧 ScrollTrigger 或 Strict Mode
      // 把新渲染出来的卡片留在 opacity: 0。
      gsap.killTweensOf(cards)
      gsap.set(cards, {
        autoAlpha: 1,
        y: 0,
        rotateX: 0,
        rotateY: 0,
        scale: 1,
        clearProps: 'transform',
      })

      gsap.fromTo(
        cards,
        {
          y: 34,
          autoAlpha: 0,
          scale: 0.965,
        },
        {
          y: 0,
          autoAlpha: 1,
          scale: 1,
          stagger: {
            each: 0.035,
            from: 'start',
          },
          duration: 0.52,
          ease: 'power3.out',
          clearProps: 'transform',
        },
      )

      ScrollTrigger.refresh()
    })

    return () => cancelAnimationFrame(frame)
  }, [viewMode, query])


  function applyGradient(gradient: Gradient) {
    const params = new URLSearchParams({
      colors: gradient.colors.join(','),
      angle: String(gradient.angle ?? 90),
    })

    router.push(`/tools/gradient?${params.toString()}`)
  }

  async function copyText(key: string, value: string) {
    await navigator.clipboard.writeText(value)
    setCopiedKey(key)
    window.setTimeout(() => setCopiedKey(''), 1400)
  }

  const showPalettes = viewMode === 'all' || viewMode === 'palette'
  const showGradients = viewMode === 'all' || viewMode === 'gradient'

  return (
    <div ref={rootRef} className="relative min-h-screen overflow-hidden bg-[#f7f7fa] text-zinc-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_7%_4%,rgba(237,233,254,.74),transparent_25%),radial-gradient(circle_at_92%_10%,rgba(224,242,254,.72),transparent_28%),radial-gradient(circle_at_50%_68%,rgba(253,242,248,.52),transparent_34%)]" />

      <div className="relative mx-auto w-full max-w-[1540px] px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <Breadcrumb />

        <section className="relative mt-5 grid min-h-[360px] items-center gap-8 overflow-hidden rounded-[32px] border border-black/[0.055] bg-white/72 px-5 py-8 shadow-[0_30px_90px_-68px_rgba(67,56,202,.28)] backdrop-blur-xl md:px-8 lg:grid-cols-[1.05fr_.95fr] lg:px-10">
          <div className="relative z-10">
            <div className="palette-kicker inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-violet-600">
              <Sparkles className="h-3.5 w-3.5" />
              Color Inspiration Library
            </div>

            <h1 className="palette-title mt-5 max-w-3xl text-4xl font-semibold leading-[0.95] tracking-[-0.065em] sm:text-5xl lg:text-6xl">
              让配色选择，
              <br />
              <span className="text-violet-500">少一点犹豫。</span>
            </h1>

            <p className="palette-copy mt-5 max-w-xl text-sm leading-7 text-zinc-500">
              品牌配色、常用渐变、CSS 一键复制与渐变生成器联动。挑颜色这件事，尽量快一点，也漂亮一点。
            </p>

            <div className="palette-toolbar mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-300" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索品牌或渐变…"
                  className="h-11 w-full rounded-full border border-black/[0.06] bg-white/80 pl-10 pr-4 text-sm text-zinc-700 outline-none transition placeholder:text-zinc-300 focus:border-violet-200 focus:ring-4 focus:ring-violet-100/70"
                />
              </div>

              <div className="flex rounded-full border border-black/[0.06] bg-white/75 p-1">
                {[
                  ['all', '全部'],
                  ['palette', '品牌'],
                  ['gradient', '渐变'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setViewMode(value as ViewMode)}
                    className={`rounded-full px-4 py-2 text-[11px] font-medium transition ${
                      viewMode === value
                        ? 'bg-zinc-950 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="palette-hero-art relative mx-auto h-[300px] w-full max-w-[520px]">
            <div className="absolute left-[8%] top-[9%] h-[72%] w-[72%] rotate-6 rounded-[34%_66%_58%_42%/46%_34%_66%_54%] bg-[#d9c8ff]" />
            <div className="absolute bottom-[5%] left-[-1%] h-[58%] w-[72%] -rotate-[11deg] rounded-[58%_42%_36%_64%/58%_40%_60%_42%] bg-[#a8efff] mix-blend-multiply" />
            <div className="absolute right-[0%] top-[18%] h-[57%] w-[58%] rotate-12 rounded-[38%_62%_70%_30%/61%_34%_66%_39%] bg-[#dfff91] mix-blend-multiply" />

            <div className="hero-orbit-a absolute left-1/2 top-1/2 h-[78%] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/10">
              <span className="absolute left-1/2 top-[-5px] h-2.5 w-2.5 rounded-full bg-zinc-950" />
            </div>

            <div className="hero-orbit-b absolute left-1/2 top-1/2 h-[53%] w-[53%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-black/10">
              <span className="absolute bottom-[9%] right-[5%] h-2 w-2 rounded-full bg-violet-500" />
            </div>

            <div className="hero-core absolute left-1/2 top-1/2 flex h-[126px] w-[126px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-[36px] bg-zinc-950 text-white shadow-[0_30px_70px_-28px_rgba(0,0,0,.45)]">
              <SwatchBook className="h-6 w-6 text-[#dfff91]" />
              <span className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">Palette</span>
              <span className="mt-0.5 text-xl font-semibold tracking-[-0.04em]">Studio</span>
            </div>
          </div>
        </section>

        {showPalettes && (
          <section className="palette-section mt-10">
            <div className="section-head mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-[9px] uppercase tracking-[0.18em] text-zinc-300">01 / Brand palettes</div>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-zinc-900">品牌配色</h2>
              </div>
              <div className="text-[10px] text-zinc-400">{filteredPalettes.length} 组配色</div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {filteredPalettes.map((palette) => (
                <article
                  key={palette.name}
                  className="palette-card group overflow-hidden rounded-[24px] border border-black/[0.055] bg-white/88 p-4 shadow-[0_20px_60px_-48px_rgba(24,24,27,.24)] backdrop-blur-xl transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1.5 hover:border-violet-200/70 hover:shadow-[0_30px_80px_-46px_rgba(109,40,217,.26)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-800">{palette.name}</h3>
                      <div className="mt-1 text-[9px] uppercase tracking-[0.14em] text-zinc-300">Brand palette</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyText(`palette-${palette.name}`, palette.colors.join(', '))}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.06] bg-zinc-50 text-zinc-400 transition hover:bg-violet-50 hover:text-violet-600"
                      aria-label={`复制 ${palette.name} 色值`}
                    >
                      {copiedKey === `palette-${palette.name}` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>

                  <div className="mt-4 flex h-24 overflow-hidden rounded-[16px]">
                    {palette.colors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => copyText(`color-${palette.name}-${color}`, color)}
                        className="group/color relative flex-1 transition-[flex] duration-300 hover:flex-[1.45]"
                        style={{ backgroundColor: color }}
                        aria-label={`复制 ${color}`}
                      >
                        <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-2 py-1 font-mono text-[8px] text-white opacity-0 backdrop-blur transition group-hover/color:opacity-100">
                          {copiedKey === `color-${palette.name}-${color}` ? 'COPIED' : color}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {palette.colors.map((color) => (
                      <span key={color} className="rounded-full bg-zinc-50 px-2 py-1 font-mono text-[9px] text-zinc-400">
                        {color}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {showGradients && (
          <section className="palette-section mt-14">
            <div className="section-head mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-[9px] uppercase tracking-[0.18em] text-zinc-300">02 / Gradient library</div>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-zinc-900">渐变色推荐</h2>
              </div>
              <div className="text-[10px] text-zinc-400">{filteredGradients.length} 组渐变</div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredGradients.map((gradient) => {
                const css = gradientCss(gradient)

                return (
                  <article
                    key={gradient.name}
                    className="palette-card group overflow-hidden rounded-[26px] border border-black/[0.055] bg-white/88 p-4 shadow-[0_20px_60px_-48px_rgba(24,24,27,.24)] backdrop-blur-xl transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1.5 hover:border-violet-200/70 hover:shadow-[0_30px_80px_-46px_rgba(109,40,217,.26)]"
                  >
                    <div
                      className="relative h-44 overflow-hidden rounded-[19px]"
                      style={{ background: css }}
                    >
                      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,.22),transparent_32%,transparent_72%,rgba(255,255,255,.12))]" />
                      <div className="absolute left-3 top-3 rounded-full bg-black/20 px-2.5 py-1 font-mono text-[9px] text-white backdrop-blur-md">
                        {gradient.angle ?? 90}°
                      </div>
                      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
                        <div>
                          <div className="text-lg font-semibold tracking-[-0.03em] text-white drop-shadow">{gradient.name}</div>
                          <div className="mt-1 font-mono text-[9px] text-white/70">{gradient.colors.join(' → ')}</div>
                        </div>
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-zinc-900 opacity-0 shadow-sm transition duration-300 group-hover:translate-x-0 group-hover:opacity-100">
                          <ArrowUpRight className="h-4 w-4" />
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                      <button
                        type="button"
                        onClick={() => applyGradient(gradient)}
                        className="flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 text-[11px] font-semibold text-white transition hover:bg-violet-600"
                      >
                        <WandSparkles className="h-3.5 w-3.5" />
                        打开渐变生成器
                      </button>

                      <button
                        type="button"
                        onClick={() => copyText(`gradient-${gradient.name}`, `background: ${css};`)}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/[0.06] bg-zinc-50 text-zinc-500 transition hover:bg-violet-50 hover:text-violet-600"
                        aria-label={`复制 ${gradient.name} CSS`}
                      >
                        {copiedKey === `gradient-${gradient.name}` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )}

        {(showPalettes && filteredPalettes.length === 0) || (showGradients && filteredGradients.length === 0) ? (
          <div className="mt-10 rounded-[24px] border border-dashed border-black/[0.08] bg-white/60 px-6 py-14 text-center backdrop-blur">
            <div className="text-sm font-medium text-zinc-500">没有找到匹配的配色</div>
            <button
              type="button"
              onClick={() => setQuery('')}
              className="mt-3 text-xs font-medium text-violet-600 hover:text-violet-800"
            >
              清空搜索
            </button>
          </div>
        ) : null}

        <section className="mt-14 grid gap-3 md:grid-cols-3">
          <div className="info-card rounded-[20px] border border-black/[0.055] bg-white/68 p-4 backdrop-blur">
            <div className="text-[9px] uppercase tracking-[0.18em] text-zinc-300">Brand</div>
            <div className="mt-2 text-sm font-semibold text-zinc-700">品牌配色</div>
            <p className="mt-1 text-[11px] leading-5 text-zinc-400">适合 UI、图表、Logo 与品牌视觉参考。</p>
          </div>

          <div className="info-card rounded-[20px] border border-black/[0.055] bg-white/68 p-4 backdrop-blur">
            <div className="text-[9px] uppercase tracking-[0.18em] text-zinc-300">Gradient</div>
            <div className="mt-2 text-sm font-semibold text-zinc-700">渐变推荐</div>
            <p className="mt-1 text-[11px] leading-5 text-zinc-400">适合背景、按钮、Banner 与视觉氛围。</p>
          </div>

          <div className="info-card rounded-[20px] border border-black/[0.055] bg-white/68 p-4 backdrop-blur">
            <div className="text-[9px] uppercase tracking-[0.18em] text-zinc-300">Workflow</div>
            <div className="mt-2 text-sm font-semibold text-zinc-700">一键使用</div>
            <p className="mt-1 text-[11px] leading-5 text-zinc-400">点击色块复制色值，渐变可直接送入生成器。</p>
          </div>
        </section>

        <div className="mt-8">
          <FooterNote />
        </div>
      </div>
    </div>
  )
}
