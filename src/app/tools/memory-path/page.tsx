'use client'

import Image from 'next/image'
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

type Memory = {
    id: string
    date: string
    title: string
    text: string
    image?: string
}

const STORAGE_KEY = 'bitleap-memory-path-v1'

const starterMemories: Memory[] = [
    {
        id: 'memory-1',
        date: '2023-06-17',
        title: '第一次认真认识你',
        text: '那天其实没有发生什么特别的事。后来才知道，有些普通的瞬间，会被记很久。',
    },
    {
        id: 'memory-2',
        date: '2023-09-02',
        title: '夏天快结束的时候',
        text: '我们说了很多没什么意义的话，却在很久以后，成了最舍不得删掉的聊天记录。',
    },
    {
        id: 'memory-3',
        date: '2024-04-16',
        title: '后来',
        text: '如果再懂你一点，我们就不会分开了吧。',
    },
]

function createId() {
    return `memory-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function formatDate(value: string) {
    if (!value) return '未写日期'
    return value.replace(/-/g, '.')
}

async function compressImage(file: File): Promise<string> {
    const objectUrl = URL.createObjectURL(file)

    try {
        const img = document.createElement('img')
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve()
            img.onerror = () => reject(new Error('图片读取失败'))
            img.src = objectUrl
        })

        const maxSide = 1600
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(img.width * scale))
        canvas.height = Math.max(1, Math.round(img.height * scale))

        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('无法创建画布')

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        return canvas.toDataURL('image/jpeg', 0.82)
    } finally {
        URL.revokeObjectURL(objectUrl)
    }
}

function Icon({ type }: { type: 'plus' | 'trash' | 'image' | 'down' | 'reset' | 'spark' }) {
    if (type === 'plus') {
        return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4"><path d="M12 5v14M5 12h14" /></svg>
    }
    if (type === 'trash') {
        return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></svg>
    }
    if (type === 'image') {
        return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m21 15-4.5-4.5L6 20" /></svg>
    }
    if (type === 'down') {
        return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4"><path d="M12 5v14m-6-6 6 6 6-6" /></svg>
    }
    if (type === 'reset') {
        return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4"><path d="M4 4v6h6M20 20v-6h-6M5.6 15A7 7 0 0 0 18 17.5M18.4 9A7 7 0 0 0 6 6.5" /></svg>
    }
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4"><path d="M12 3l1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z" /><path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14Z" /></svg>
}

function MemoryEditorCard({
    memory,
    index,
    canDelete,
    onChange,
    onRemove,
    onImage,
}: {
    memory: Memory
    index: number
    canDelete: boolean
    onChange: (id: string, patch: Partial<Memory>) => void
    onRemove: (id: string) => void
    onImage: (id: string, event: ChangeEvent<HTMLInputElement>) => void
}) {
    return (
        <div className="rounded-[24px] border border-black/[0.06] bg-white/92 p-4 shadow-[0_18px_50px_-42px_rgba(76,29,149,.16)] backdrop-blur-sm sm:p-5">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-zinc-300">{String(index + 1).padStart(2, '0')}</span>
                    <span className="text-xs font-semibold text-zinc-800">一段回忆</span>
                </div>
                <button type="button" onClick={() => onRemove(memory.id)} disabled={!canDelete} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/[0.05] bg-zinc-50 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-25" aria-label="删除这段回忆">
                    <Icon type="trash" />
                </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
                <label className="block">
                    <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-zinc-400">Date</span>
                    <input type="date" value={memory.date} onChange={(e) => onChange(memory.id, { date: e.target.value })} className="h-10 w-full rounded-[12px] border border-black/[0.06] bg-[#fafafa] px-3 text-xs text-zinc-700 outline-none transition focus:border-violet-300 focus:bg-white" />
                </label>
                <label className="block">
                    <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-zinc-400">Title</span>
                    <input value={memory.title} onChange={(e) => onChange(memory.id, { title: e.target.value })} placeholder="这一段回忆叫什么？" className="h-10 w-full rounded-[12px] border border-black/[0.06] bg-[#fafafa] px-3 text-xs text-zinc-700 outline-none transition placeholder:text-zinc-300 focus:border-violet-300 focus:bg-white" />
                </label>
            </div>

            <label className="mt-3 block">
                <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-zinc-400">Memory</span>
                <textarea value={memory.text} onChange={(e) => onChange(memory.id, { text: e.target.value })} placeholder="写下一句你还记得的话。" rows={4} className="w-full resize-none rounded-[14px] border border-black/[0.06] bg-[#fafafa] px-3 py-3 text-xs leading-6 text-zinc-700 outline-none transition placeholder:text-zinc-300 focus:border-violet-300 focus:bg-white" />
            </label>

            <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-black/[0.06] bg-[#fafafa] px-3 py-2 text-[10px] font-medium text-zinc-500 transition hover:bg-white hover:text-zinc-800">
                    <Icon type="image" />
                    {memory.image ? '更换照片' : '添加照片'}
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => onImage(memory.id, event)} />
                </label>
                {memory.image && <button type="button" onClick={() => onChange(memory.id, { image: undefined })} className="rounded-full px-3 py-2 text-[10px] text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-700">移除照片</button>}
            </div>
        </div>
    )
}

export default function MemoryPathPage() {
    const rootRef = useRef<HTMLDivElement>(null)
    const storyRef = useRef<HTMLElement>(null)
    const pathTrackRef = useRef<HTMLDivElement>(null)
    const pathRef = useRef<SVGPathElement>(null)
    const maskRectRef = useRef<SVGRectElement>(null)
    const journeyProgressRef = useRef<HTMLDivElement>(null)

    const [title, setTitle] = useState('我们的沿途')
    const [ending, setEnding] = useState('有些故事停在这里，但走过的路不会消失。')
    const [memories, setMemories] = useState<Memory[]>(starterMemories)
    const [hydrated, setHydrated] = useState(false)
    const [saveState, setSaveState] = useState<'idle' | 'saved' | 'failed'>('idle')
    const [editorOpen, setEditorOpen] = useState(false)
    const [activeMemory, setActiveMemory] = useState(0)

    useEffect(() => {
        try {
            const saved = window.localStorage.getItem(STORAGE_KEY)
            if (saved) {
                const parsed = JSON.parse(saved) as { title?: string; ending?: string; memories?: Memory[] }
                if (parsed.title) setTitle(parsed.title)
                if (parsed.ending) setEnding(parsed.ending)
                if (Array.isArray(parsed.memories) && parsed.memories.length) setMemories(parsed.memories)
            }
        } catch {
            // Keep defaults when local data is unavailable.
        } finally {
            setHydrated(true)
        }
    }, [])

    useEffect(() => {
        if (!hydrated) return
        const timer = window.setTimeout(() => {
            try {
                window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ title, ending, memories }))
                setSaveState('saved')
            } catch {
                setSaveState('failed')
            }
        }, 280)
        return () => window.clearTimeout(timer)
    }, [title, ending, memories, hydrated])

    useEffect(() => {
        if (!editorOpen) return
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setEditorOpen(false)
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => {
            document.body.style.overflow = previousOverflow
            window.removeEventListener('keydown', handleKeyDown)
            requestAnimationFrame(() => ScrollTrigger.refresh())
        }
    }, [editorOpen])

    const orderedMemories = useMemo(() => memories, [memories])
    const storyLayoutKey = useMemo(
        () => `${memories.length}:${memories.map((memory) => (memory.image ? '1' : '0')).join('')}`,
        [memories],
    )

    const palette = useMemo(() => {
        const palettes = [
            ['rgba(129,140,248,.16)', 'rgba(244,114,182,.10)', 'rgba(125,211,252,.12)'],
            ['rgba(251,191,36,.10)', 'rgba(251,113,133,.10)', 'rgba(167,139,250,.13)'],
            ['rgba(96,165,250,.12)', 'rgba(45,212,191,.08)', 'rgba(196,181,253,.13)'],
            ['rgba(244,114,182,.10)', 'rgba(216,180,254,.14)', 'rgba(253,186,116,.08)'],
        ]
        return palettes[activeMemory % palettes.length]
    }, [activeMemory])

    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger)
        if (!rootRef.current) return

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const ctx = gsap.context(() => {
            if (reduceMotion) return

            const intro = gsap.timeline({ defaults: { ease: 'power4.out' } })
            intro
                .from('.journey-kicker', { y: 14, opacity: 0, duration: 0.48 })
                .from('.journey-title-line', { y: 72, opacity: 0, rotate: 0.9, duration: 0.92, stagger: 0.08 }, '-=0.2')
                .from('.journey-copy', { y: 18, opacity: 0, duration: 0.56, stagger: 0.06 }, '-=0.44')
                .from('.journey-orbit', { scale: 0.88, opacity: 0, duration: 1.0 }, '-=0.8')

            gsap.utils.toArray<HTMLElement>('.section-reveal').forEach((el) => {
                gsap.fromTo(
                    el,
                    { y: 30, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        duration: 0.76,
                        ease: 'power3.out',
                        scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none reverse' },
                    },
                )
            })

            gsap.to('.journey-dust-a', {
                yPercent: -24,
                xPercent: 8,
                ease: 'none',
                scrollTrigger: { trigger: rootRef.current, start: 'top top', end: 'bottom bottom', scrub: 1.2 },
            })
            gsap.to('.journey-dust-b', {
                yPercent: 18,
                xPercent: -10,
                ease: 'none',
                scrollTrigger: { trigger: rootRef.current, start: 'top top', end: 'bottom bottom', scrub: 1.5 },
            })
        }, rootRef)

        return () => ctx.revert()
    }, [])

    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger)

        const story = storyRef.current
        const track = pathTrackRef.current
        const path = pathRef.current
        const maskRect = maskRectRef.current
        const progressBar = journeyProgressRef.current
        if (!story || !track || !path || !maskRect) return

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const ctx = gsap.context(() => {
            const SVG_HEIGHT = 3600
            const VIEWPORT_HEAD = 0.64

            const syncLineToViewport = () => {
                if (reduceMotion) {
                    maskRect.setAttribute('height', String(SVG_HEIGHT))
                    if (progressBar) progressBar.style.transform = 'scaleX(1)'
                    return
                }

                const rect = track.getBoundingClientRect()
                const anchorY = window.innerHeight * VIEWPORT_HEAD
                const localY = anchorY - rect.top
                const progress = gsap.utils.clamp(0, 1, localY / Math.max(rect.height, 1))
                maskRect.setAttribute('height', String(SVG_HEIGHT * progress))
                if (progressBar) progressBar.style.transform = `scaleX(${progress})`
            }

            syncLineToViewport()

            if (!reduceMotion) {
                ScrollTrigger.create({
                    trigger: track,
                    start: 'top bottom',
                    end: 'bottom top',
                    invalidateOnRefresh: true,
                    onUpdate: syncLineToViewport,
                    onRefresh: syncLineToViewport,
                })

                gsap.utils.toArray<HTMLElement>('.memory-reveal').forEach((element, index) => {
                    const direction = index % 2 === 0 ? -1 : 1

                    ScrollTrigger.create({
                        trigger: element,
                        start: 'top 62%',
                        end: 'bottom 38%',
                        onEnter: () => setActiveMemory(index),
                        onEnterBack: () => setActiveMemory(index),
                    })

                    gsap.fromTo(
                        element,
                        { y: 58, x: direction * 22, rotate: direction * 0.9, scale: 0.965, opacity: 0 },
                        {
                            y: 0,
                            x: 0,
                            rotate: 0,
                            scale: 1,
                            opacity: 1,
                            ease: 'power3.out',
                            scrollTrigger: {
                                trigger: element,
                                start: 'top 91%',
                                end: 'top 69%',
                                scrub: 0.22,
                                invalidateOnRefresh: true,
                            },
                        },
                    )

                    const photo = element.querySelector('.memory-photo-shell')
                    if (photo) {
                        gsap.fromTo(
                            photo,
                            { yPercent: 4 },
                            {
                                yPercent: -4,
                                ease: 'none',
                                scrollTrigger: { trigger: element, start: 'top bottom', end: 'bottom top', scrub: 1.1 },
                            },
                        )
                    }
                })

                gsap.fromTo(
                    '.memory-ending',
                    { y: 42, opacity: 0, scale: 0.98 },
                    {
                        y: 0,
                        opacity: 1,
                        scale: 1,
                        scrollTrigger: { trigger: '.memory-ending', start: 'top 90%', end: 'top 68%', scrub: 0.2 },
                    },
                )
            }

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    ScrollTrigger.refresh()
                    syncLineToViewport()
                })
            })
        }, story)

        const refresh = () => ScrollTrigger.refresh()
        window.addEventListener('resize', refresh)

        return () => {
            window.removeEventListener('resize', refresh)
            ctx.revert()
        }
    }, [storyLayoutKey])

    const updateMemory = (id: string, patch: Partial<Memory>) => {
        setMemories((current) => current.map((memory) => (memory.id === id ? { ...memory, ...patch } : memory)))
        setSaveState('idle')
    }

    const addMemory = () => {
        setMemories((current) => [...current, { id: createId(), date: '', title: '', text: '' }])
        setSaveState('idle')
    }

    const removeMemory = (id: string) => {
        setMemories((current) => (current.length <= 1 ? current : current.filter((memory) => memory.id !== id)))
        setSaveState('idle')
    }

    const handleImage = async (id: string, event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return
        try {
            const dataUrl = await compressImage(file)
            updateMemory(id, { image: dataUrl })
        } catch {
            setSaveState('failed')
        } finally {
            event.target.value = ''
        }
    }

    const resetAll = () => {
        setTitle('我们的沿途')
        setEnding('有些故事停在这里，但走过的路不会消失。')
        setMemories(starterMemories)
        setSaveState('idle')
        try { window.localStorage.removeItem(STORAGE_KEY) } catch {}
    }

    return (
        <div
            ref={rootRef}
            className="relative min-h-screen overflow-hidden bg-[#f8f6f3] text-[#28272b] selection:bg-violet-200/70 selection:text-violet-950"
            style={{
                '--ambient-a': palette[0],
                '--ambient-b': palette[1],
                '--ambient-c': palette[2],
            } as React.CSSProperties}
        >
            <style jsx global>{`
                html { scroll-behavior: smooth; }
                body { background: #f8f6f3; }
                .journey-grain {
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.82' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.18'/%3E%3C/svg%3E");
                    mix-blend-mode: multiply;
                }
                .journey-ambient-a { background: var(--ambient-a); }
                .journey-ambient-b { background: var(--ambient-b); }
                .journey-ambient-c { background: var(--ambient-c); }
                .journey-shimmer { animation: journeyShimmer 12s linear infinite; }
                .journey-float { animation: journeyFloat 7s ease-in-out infinite; }
                .journey-float-slow { animation: journeyFloat 11s ease-in-out infinite reverse; }
                @keyframes journeyShimmer { to { stroke-dashoffset: -120; } }
                @keyframes journeyFloat { 0%,100% { transform: translate3d(0,0,0); } 50% { transform: translate3d(0,-10px,0); } }
                @media (prefers-reduced-motion: reduce) {
                    .journey-shimmer, .journey-float, .journey-float-slow { animation: none !important; }
                }
            `}</style>

            {/* Atmospheric canvas */}
            <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(180deg,#faf8f5_0%,#f9f7f5_22%,#f8f6f5_56%,#f6f4f2_100%)]" />
                <div className="journey-ambient-a absolute -left-28 top-[3%] h-[540px] w-[540px] rounded-full blur-[145px] transition-colors duration-1000" />
                <div className="journey-ambient-b absolute -right-32 top-[28%] h-[520px] w-[520px] rounded-full blur-[150px] transition-colors duration-1000" />
                <div className="journey-ambient-c absolute left-[28%] top-[63%] h-[600px] w-[600px] rounded-full blur-[170px] transition-colors duration-1000" />
                <div className="journey-dust-a absolute left-[8%] top-[22%] h-1.5 w-1.5 rounded-full bg-violet-300/40 shadow-[90px_140px_0_rgba(196,181,253,.28),220px_40px_0_rgba(147,197,253,.24),410px_240px_0_rgba(251,207,232,.30),720px_120px_0_rgba(196,181,253,.20)]" />
                <div className="journey-dust-b absolute right-[13%] top-[48%] h-1 w-1 rounded-full bg-rose-300/40 shadow-[-180px_130px_0_rgba(196,181,253,.22),-420px_10px_0_rgba(125,211,252,.20),-680px_190px_0_rgba(251,207,232,.26)]" />
                <div className="journey-grain absolute inset-0 opacity-[0.055]" />
                <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-white/70 to-transparent" />
            </div>

            {/* Reading progress */}
            <div className="fixed inset-x-0 top-0 z-50 h-[2px] bg-black/[0.025]">
                <div ref={journeyProgressRef} className="h-full origin-left scale-x-0 bg-gradient-to-r from-violet-400 via-fuchsia-300 to-sky-300 shadow-[0_0_18px_rgba(167,139,250,.38)]" />
            </div>

            <div className="relative z-10 mx-auto w-full max-w-[1500px] px-4 pb-20 pt-5 sm:px-6 lg:px-9 xl:px-12">
                {/* Hero */}
                <section className="relative min-h-[92vh] overflow-hidden rounded-[38px] border border-white/80 bg-white/48 px-6 py-8 shadow-[0_50px_120px_-92px_rgba(50,36,90,.42)] backdrop-blur-[26px] sm:px-9 sm:py-10 lg:px-14 lg:py-12">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_20%,rgba(255,255,255,.88),transparent_24%),radial-gradient(circle_at_20%_84%,rgba(237,233,254,.42),transparent_30%)]" />
                    <div className="journey-orbit journey-float-slow pointer-events-none absolute -right-28 -top-36 h-[470px] w-[470px] rounded-full border border-violet-200/45" />
                    <div className="journey-orbit journey-float pointer-events-none absolute right-8 top-20 h-64 w-64 rounded-full border border-sky-200/45" />
                    <div className="journey-orbit pointer-events-none absolute -bottom-24 left-[36%] h-72 w-72 rounded-full border border-rose-200/35" />

                    <div className="relative flex min-h-[76vh] flex-col justify-between">
                        <div className="flex items-start justify-between gap-5">
                            <div className="journey-kicker inline-flex items-center gap-2 rounded-full border border-violet-200/65 bg-white/65 px-3.5 py-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-violet-500 shadow-[0_8px_30px_-20px_rgba(124,58,237,.35)] backdrop-blur-xl">
                                <Icon type="spark" />
                                Memory Path · 私人记忆档案
                            </div>
                            <div className="hidden text-right sm:block">
                                <div className="font-mono text-[9px] uppercase tracking-[0.24em] text-zinc-300">A quiet record</div>
                                <div className="mt-1 text-[11px] text-zinc-400">从第一次相遇，到后来。</div>
                            </div>
                        </div>

                        <div className="my-auto grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_330px] lg:gap-16">
                            <div className="pt-16 lg:pt-8">
                                <div className="overflow-visible pb-[0.14em]">
                                    <h1 className="journey-title-line font-serif text-[clamp(5.4rem,13vw,12.5rem)] font-medium leading-[0.76] tracking-[-0.075em] text-[#27252a]">沿途</h1>
                                </div>
                                <div className="mt-8 max-w-[760px]">
                                    <p className="journey-title-line font-serif text-[clamp(1.75rem,4vw,4.3rem)] leading-[1.06] tracking-[-0.045em] text-violet-500/90">有些人走远了，</p>
                                    <p className="journey-title-line mt-1 font-serif text-[clamp(1.75rem,4vw,4.3rem)] leading-[1.06] tracking-[-0.045em] text-zinc-800">但那段路还记得。</p>
                                </div>
                            </div>

                            <div className="journey-copy relative mb-1 border-l border-violet-200/70 pl-5 lg:mb-4 lg:pl-7">
                                <div className="absolute -left-[3px] top-0 h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_0_6px_rgba(167,139,250,.10)]" />
                                <div className="font-mono text-[9px] uppercase tracking-[0.24em] text-violet-400">About this path</div>
                                <p className="mt-4 text-sm leading-7 text-zinc-500 sm:text-[15px]">把照片、日期和那些没舍得忘掉的话放在这里。往下走时，线会一点点经过它们，像把散落的片段重新串回一段完整的路。</p>
                                <p className="mt-4 font-serif text-lg italic leading-7 text-zinc-600">“后来才明白，真正留下来的，常常不是大事，而是当时没有在意的一个瞬间。”</p>
                            </div>
                        </div>

                        <div className="journey-copy flex flex-col gap-5 border-t border-black/[0.055] pt-6 sm:flex-row sm:items-end sm:justify-between">
                            <div className="flex items-center gap-4">
                                <button type="button" onClick={() => storyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="group inline-flex h-12 items-center gap-3 rounded-full bg-[#28262c] px-5 text-xs font-semibold text-white shadow-[0_18px_40px_-24px_rgba(31,28,36,.5)] transition duration-300 hover:-translate-y-0.5 hover:bg-violet-600">
                                    开始往回走
                                    <span className="transition group-hover:translate-y-0.5"><Icon type="down" /></span>
                                </button>
                                <button type="button" onClick={() => setEditorOpen(true)} className="inline-flex h-12 items-center gap-2 rounded-full border border-black/[0.07] bg-white/72 px-5 text-xs font-semibold text-zinc-600 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-violet-200 hover:text-violet-600">
                                    <Icon type="spark" />
                                    编辑沿途
                                </button>
                            </div>
                            <div className="text-[10px] leading-5 text-zinc-400">
                                <div>{memories.length} 段记忆</div>
                                <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-300">stored only in this browser</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Story */}
                <section ref={storyRef} className="relative mt-24 scroll-mt-10 pb-24 sm:mt-32">
                    <div className="mx-auto max-w-[1180px]">
                        <div className="section-reveal mb-24 text-center sm:mb-32">
                            <div className="mx-auto mb-7 flex w-fit items-center gap-3">
                                <span className="h-px w-8 bg-violet-200" />
                                <span className="font-mono text-[9px] uppercase tracking-[0.30em] text-zinc-400">Memory journey</span>
                                <span className="h-px w-8 bg-violet-200" />
                            </div>
                            <h2 className="font-serif text-[clamp(3rem,7vw,6.7rem)] font-medium tracking-[-0.055em] text-[#29272d]">{title || '未命名的沿途'}</h2>
                            <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-zinc-400">不是为了回到过去，只是想让那些真实发生过的时刻，有一个不会被消息列表淹没的地方。</p>
                        </div>

                        <div ref={pathTrackRef} className="relative">
                            <svg className="pointer-events-none absolute left-1/2 top-0 h-full w-full -translate-x-1/2 overflow-visible" viewBox="0 0 1000 3600" preserveAspectRatio="none" aria-hidden="true">
                                <defs>
                                    <linearGradient id="memoryPathGradientV2" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.88" />
                                        <stop offset="38%" stopColor="#a78bfa" stopOpacity="0.78" />
                                        <stop offset="72%" stopColor="#c084fc" stopOpacity="0.58" />
                                        <stop offset="100%" stopColor="#bae6fd" stopOpacity="0.18" />
                                    </linearGradient>
                                    <mask id="memoryPathRevealMaskV2" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="3600">
                                        <rect x="0" y="0" width="1000" height="3600" fill="black" />
                                        <rect ref={maskRectRef} x="0" y="0" width="1000" height="0" fill="white" />
                                    </mask>
                                    <filter id="memoryPathGlowV2" x="-50%" y="-20%" width="200%" height="140%">
                                        <feGaussianBlur stdDeviation="5" result="blur" />
                                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                                    </filter>
                                </defs>

                                <path d="M500 0 C500 190 285 250 322 520 C360 790 740 760 698 1080 C660 1370 318 1320 366 1680 C410 2010 760 1950 714 2310 C678 2640 350 2600 404 2960 C438 3200 560 3300 500 3600" fill="none" stroke="#c4b5fd" strokeOpacity="0.10" strokeWidth="1.35" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
                                <path d="M500 0 C500 190 285 250 322 520 C360 790 740 760 698 1080 C660 1370 318 1320 366 1680 C410 2010 760 1950 714 2310 C678 2640 350 2600 404 2960 C438 3200 560 3300 500 3600" fill="none" stroke="url(#memoryPathGradientV2)" strokeOpacity="0.16" strokeWidth="12" vectorEffect="non-scaling-stroke" strokeLinecap="round" mask="url(#memoryPathRevealMaskV2)" filter="url(#memoryPathGlowV2)" />
                                <path ref={pathRef} d="M500 0 C500 190 285 250 322 520 C360 790 740 760 698 1080 C660 1370 318 1320 366 1680 C410 2010 760 1950 714 2310 C678 2640 350 2600 404 2960 C438 3200 560 3300 500 3600" fill="none" stroke="url(#memoryPathGradientV2)" strokeWidth="2.3" vectorEffect="non-scaling-stroke" strokeLinecap="round" mask="url(#memoryPathRevealMaskV2)" />
                                <path className="journey-shimmer" d="M500 0 C500 190 285 250 322 520 C360 790 740 760 698 1080 C660 1370 318 1320 366 1680 C410 2010 760 1950 714 2310 C678 2640 350 2600 404 2960 C438 3200 560 3300 500 3600" fill="none" stroke="rgba(255,255,255,.72)" strokeWidth="1" strokeDasharray="3 22" strokeDashoffset="0" vectorEffect="non-scaling-stroke" mask="url(#memoryPathRevealMaskV2)" />
                            </svg>

                            <div className="relative space-y-36 sm:space-y-44 lg:space-y-56">
                                {orderedMemories.map((memory, index) => {
                                    const isLeft = index % 2 === 0
                                    const hasImage = Boolean(memory.image)
                                    return (
                                        <article key={memory.id} className={`memory-reveal relative grid min-h-[500px] items-center gap-10 md:grid-cols-2 md:gap-16 ${isLeft ? '' : 'md:[&>*:first-child]:order-2'}`}>
                                            <div className={isLeft ? 'md:pr-10' : 'md:pl-10'}>
                                                <div className={`memory-photo-shell relative mx-auto max-w-[520px] ${isLeft ? 'md:rotate-[-1.5deg]' : 'md:rotate-[1.5deg]'}`}>
                                                    <div className="absolute -inset-4 rounded-[38px] bg-white/45 blur-2xl" />
                                                    <div className="relative overflow-hidden rounded-[30px] border border-white/90 bg-white/82 p-2.5 shadow-[0_42px_95px_-60px_rgba(42,31,65,.48)] backdrop-blur-xl sm:p-3">
                                                        {hasImage ? (
                                                            <div className="relative aspect-[4/3] overflow-hidden rounded-[23px] bg-zinc-100">
                                                                <Image src={memory.image!} alt={memory.title || '回忆照片'} fill unoptimized sizes="(max-width: 768px) 100vw, 50vw" className="scale-[1.015] object-cover" />
                                                                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.04),transparent_40%,rgba(31,25,42,.18))]" />
                                                                <div className="absolute inset-0 ring-1 ring-inset ring-white/20" />
                                                            </div>
                                                        ) : (
                                                            <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[23px] bg-[radial-gradient(circle_at_28%_30%,rgba(196,181,253,.50),transparent_30%),radial-gradient(circle_at_78%_70%,rgba(186,230,253,.56),transparent_32%),linear-gradient(145deg,#fcfbfb,#f3f0f7)]">
                                                                <div className="absolute left-[14%] top-[18%] h-28 w-28 rounded-full bg-white/35 blur-2xl" />
                                                                <div className="relative text-center">
                                                                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/80 bg-white/58 text-violet-300 shadow-sm backdrop-blur-xl"><Icon type="image" /></div>
                                                                    <div className="mt-4 font-serif text-base italic text-zinc-400">这里还缺一张当时的照片。</div>
                                                                    <div className="mt-2 font-mono text-[8px] uppercase tracking-[0.24em] text-zinc-300">a frame waiting to be remembered</div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className="flex items-center justify-between px-2 pb-1 pt-3">
                                                            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-300">Frame {String(index + 1).padStart(2, '0')}</span>
                                                            <span className="font-serif text-xs italic text-zinc-400">留在沿途的一帧</span>
                                                        </div>
                                                    </div>
                                                    <span className={`absolute -bottom-4 ${isLeft ? '-right-3' : '-left-3'} h-12 w-20 rotate-[-8deg] bg-[#eee5d7]/58 shadow-sm backdrop-blur-sm`} />
                                                </div>
                                            </div>

                                            <div className={isLeft ? 'md:pl-12' : 'md:pr-12'}>
                                                <div className="relative max-w-[470px]">
                                                    <div className={`absolute top-1 hidden md:block ${isLeft ? '-left-[56px]' : '-right-[56px]'}`}>
                                                        <span className="block h-4 w-4 rounded-full border-[4px] border-[#f8f6f3] bg-violet-400 shadow-[0_0_0_1px_rgba(139,92,246,.2),0_0_24px_rgba(139,92,246,.22)]" />
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="rounded-full border border-violet-100 bg-white/62 px-3 py-1.5 font-mono text-[9px] tracking-[0.16em] text-violet-500 backdrop-blur-lg">{formatDate(memory.date)}</span>
                                                        <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-300">Memory {String(index + 1).padStart(2, '0')}</span>
                                                    </div>
                                                    <h3 className="mt-6 font-serif text-[clamp(2rem,4vw,3.45rem)] font-medium leading-[1.04] tracking-[-0.045em] text-[#2d2a31]">{memory.title || '这一段还没有标题'}</h3>
                                                    <div className="mt-6 flex gap-4">
                                                        <span className="mt-1 font-serif text-4xl leading-none text-violet-200">“</span>
                                                        <p className="max-w-[38ch] whitespace-pre-wrap text-[15px] leading-8 text-zinc-500 sm:text-base">{memory.text || '这一段回忆还没有写下什么。'}</p>
                                                    </div>
                                                    <div className="mt-8 flex items-center gap-3">
                                                        <span className="h-px w-12 bg-gradient-to-r from-violet-300 to-transparent" />
                                                        <span className="font-serif text-xs italic text-zinc-300">我们确实走到过这里。</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </article>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="memory-ending mx-auto mt-48 max-w-3xl text-center sm:mt-60">
                            <div className="mx-auto flex w-fit flex-col items-center">
                                <span className="h-16 w-px bg-gradient-to-b from-violet-300 via-violet-200 to-transparent" />
                                <span className="mt-1 h-2 w-2 rounded-full bg-violet-300 shadow-[0_0_0_8px_rgba(196,181,253,.10),0_0_24px_rgba(167,139,250,.20)]" />
                            </div>
                            <div className="mt-12 font-mono text-[9px] uppercase tracking-[0.32em] text-zinc-300">For everything we passed through</div>
                            <p className="mt-7 whitespace-pre-wrap font-serif text-[clamp(2rem,5vw,4.8rem)] font-medium leading-[1.08] tracking-[-0.05em] text-[#2f2b33]">{ending || '故事暂时停在这里。'}</p>
                            <p className="mx-auto mt-8 max-w-md text-sm leading-7 text-zinc-400">有些路不会再走第二遍，所以才值得被好好记住。往回滚，它也会陪你重新走一遍。</p>
                            <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="mt-10 inline-flex h-11 items-center gap-2 rounded-full border border-black/[0.07] bg-white/65 px-5 text-xs font-semibold text-zinc-500 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-violet-200 hover:text-violet-600">
                                回到开始
                                <span className="rotate-180"><Icon type="down" /></span>
                            </button>
                        </div>
                    </div>
                </section>

                {/* Active chapter indicator */}
                {!editorOpen && memories.length > 0 && (
                    <div className="pointer-events-none fixed bottom-7 left-7 z-40 hidden items-center gap-3 rounded-full border border-white/80 bg-white/62 px-3 py-2 shadow-[0_14px_44px_-28px_rgba(40,30,65,.4)] backdrop-blur-xl lg:flex">
                        <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-violet-500 px-2 font-mono text-[9px] text-white">{String(activeMemory + 1).padStart(2, '0')}</span>
                        <div className="max-w-[220px] pr-2">
                            <div className="truncate text-[10px] font-semibold text-zinc-600">{orderedMemories[activeMemory]?.title || '这一段回忆'}</div>
                            <div className="mt-0.5 font-mono text-[8px] tracking-[0.12em] text-zinc-300">{formatDate(orderedMemories[activeMemory]?.date || '')}</div>
                        </div>
                    </div>
                )}

                <button type="button" onClick={() => setEditorOpen(true)} className="fixed bottom-5 right-5 z-40 inline-flex h-12 items-center gap-2 rounded-full border border-white/80 bg-[#28262c] px-4 text-xs font-semibold text-white shadow-[0_18px_50px_-20px_rgba(15,23,42,.46)] transition hover:-translate-y-0.5 hover:bg-violet-600 sm:bottom-7 sm:right-7">
                    <Icon type="spark" />
                    编辑沿途
                    <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-[9px] text-white/65">{memories.length}</span>
                </button>

                {/* Editor */}
                {editorOpen && (
                    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#242129]/25 p-0 backdrop-blur-[14px] sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label="编辑沿途">
                        <button type="button" aria-label="关闭编辑器" onClick={() => setEditorOpen(false)} className="absolute inset-0 cursor-default" />
                        <div className="relative flex h-[92dvh] w-full max-w-[1120px] flex-col overflow-hidden rounded-t-[30px] border border-white/80 bg-[#fbfafc]/97 shadow-[0_32px_100px_-30px_rgba(30,20,60,.38)] sm:h-[86dvh] sm:rounded-[30px]">
                            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-black/[0.06] bg-white/82 px-4 py-4 backdrop-blur-xl sm:px-6">
                                <div className="min-w-0">
                                    <div className="font-mono text-[9px] uppercase tracking-[0.24em] text-violet-400">Memory editor</div>
                                    <div className="mt-1 flex items-center gap-3">
                                        <h2 className="truncate font-serif text-xl font-semibold tracking-[-0.035em] text-zinc-950 sm:text-2xl">把想留下的写下来</h2>
                                        <span className="hidden rounded-full bg-violet-50 px-2.5 py-1 font-mono text-[9px] text-violet-500 sm:inline-flex">{memories.length} memories</span>
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <span className="hidden text-[10px] text-zinc-400 md:inline">{saveState === 'saved' ? '已自动保存' : saveState === 'failed' ? '保存失败' : '编辑后自动保存'}</span>
                                    <button type="button" onClick={resetAll} className="inline-flex h-9 items-center gap-2 rounded-full border border-black/[0.06] bg-white px-3 text-[10px] text-zinc-500 transition hover:text-zinc-900"><Icon type="reset" />重置</button>
                                    <button type="button" onClick={() => setEditorOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-zinc-950 text-lg font-light leading-none text-white transition hover:bg-violet-600" aria-label="完成并关闭">×</button>
                                </div>
                            </div>

                            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                                <div className="mx-auto grid w-full max-w-[1060px] gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:grid-cols-[300px_minmax(0,1fr)]">
                                    <aside className="h-fit rounded-[24px] border border-black/[0.06] bg-white/88 p-4 shadow-[0_20px_60px_-50px_rgba(76,29,149,.25)] lg:sticky lg:top-5">
                                        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-zinc-300">Story settings</div>
                                        <h3 className="mt-2 font-serif text-lg font-semibold tracking-[-0.025em] text-zinc-900">这段路叫什么？</h3>
                                        <label className="mt-5 block">
                                            <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-zinc-400">Story title</span>
                                            <input value={title} onChange={(e) => { setTitle(e.target.value); setSaveState('idle') }} className="h-11 w-full rounded-[14px] border border-black/[0.06] bg-[#fafafa] px-3 text-sm font-semibold text-zinc-800 outline-none transition focus:border-violet-300 focus:bg-white" />
                                        </label>
                                        <label className="mt-4 block">
                                            <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-zinc-400">Ending</span>
                                            <textarea value={ending} onChange={(e) => { setEnding(e.target.value); setSaveState('idle') }} rows={5} className="w-full resize-none rounded-[14px] border border-black/[0.06] bg-[#fafafa] px-3 py-3 text-xs leading-6 text-zinc-700 outline-none transition focus:border-violet-300 focus:bg-white" />
                                        </label>
                                        <div className="mt-4 rounded-[16px] bg-violet-50/70 px-3 py-3 text-[10px] leading-5 text-violet-600">照片会先在浏览器本地压缩，再保存到当前浏览器，不上传服务器。</div>
                                    </aside>

                                    <div className="min-w-0">
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <div><div className="font-mono text-[9px] uppercase tracking-[0.22em] text-zinc-300">Memories</div><div className="mt-1 text-sm font-semibold text-zinc-800">沿途的每一个节点</div></div>
                                            <button type="button" onClick={addMemory} className="inline-flex h-9 items-center gap-2 rounded-full bg-violet-600 px-3.5 text-[10px] font-semibold text-white shadow-[0_12px_30px_-18px_rgba(124,58,237,.7)] transition hover:-translate-y-0.5 hover:bg-violet-700"><Icon type="plus" />添加回忆</button>
                                        </div>
                                        <div className="space-y-3">
                                            {memories.map((memory, index) => (
                                                <MemoryEditorCard key={memory.id} memory={memory} index={index} canDelete={memories.length > 1} onChange={updateMemory} onRemove={removeMemory} onImage={handleImage} />
                                            ))}
                                        </div>
                                        <button type="button" onClick={addMemory} className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-[20px] border border-dashed border-violet-200 bg-violet-50/35 text-xs font-semibold text-violet-600 transition hover:border-violet-300 hover:bg-violet-50"><Icon type="plus" />再添加一段回忆</button>
                                        <div className="h-5" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-black/[0.06] bg-white/88 px-4 py-3 backdrop-blur-xl sm:px-6">
                                <div className="text-[10px] text-zinc-400">{saveState === 'saved' ? '所有修改已保存到浏览器' : saveState === 'failed' ? '保存失败，可能是图片过大' : '正在等待自动保存…'}</div>
                                <button type="button" onClick={() => setEditorOpen(false)} className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-5 text-xs font-semibold text-white transition hover:bg-violet-600">完成编辑</button>
                            </div>
                        </div>
                    </div>
                )}

                <footer className="section-reveal mt-12 flex flex-col gap-3 border-t border-black/[0.055] pt-6 text-[9px] uppercase tracking-[0.16em] text-zinc-300 sm:flex-row sm:items-center sm:justify-between"><span>BitLeap / 心迹 / 沿途</span><span>Some roads are worth remembering.</span></footer>
            </div>
        </div>
    )
}
