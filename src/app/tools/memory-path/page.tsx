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

    const [title, setTitle] = useState('我们的沿途')
    const [ending, setEnding] = useState('有些故事停在这里，但走过的路不会消失。')
    const [memories, setMemories] = useState<Memory[]>(starterMemories)
    const [hydrated, setHydrated] = useState(false)
    const [saveState, setSaveState] = useState<'idle' | 'saved' | 'failed'>('idle')
    const [editorOpen, setEditorOpen] = useState(false)

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
            // 保持默认示例
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

    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger)
        if (!rootRef.current) return

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const ctx = gsap.context(() => {
            if (reduceMotion) return

            gsap.timeline({ defaults: { ease: 'power4.out' } })
                .from('.memory-kicker', { y: 12, opacity: 0, duration: 0.4 })
                .from('.memory-title-line', { y: 48, opacity: 0, rotate: 0.8, duration: 0.7, stagger: 0.07 }, '-=0.18')
                .from('.memory-hero-copy', { y: 18, opacity: 0, duration: 0.46, stagger: 0.06 }, '-=0.34')

            gsap.utils.toArray<HTMLElement>('.section-reveal').forEach((el) => {
                const tween = gsap.fromTo(el, { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.66, ease: 'power3.out', paused: true })
                ScrollTrigger.create({ trigger: el, start: 'top 92%', animation: tween, toggleActions: 'play none none reverse' })
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

        if (!story || !track || !path || !maskRect) return

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

        const ctx = gsap.context(() => {
            const SVG_HEIGHT = 3000
            const VIEWPORT_HEAD = 0.78

            const syncLineToViewport = () => {
                if (reduceMotion) {
                    maskRect.setAttribute('height', String(SVG_HEIGHT))
                    return
                }

                const rect = track.getBoundingClientRect()
                const anchorY = window.innerHeight * VIEWPORT_HEAD

                // 关键：不再使用 story 整段高度，也不再依赖路径长度。
                // 直接拿“当前视口 78% 高度的位置”映射到真正承载 SVG 的 track。
                // 所以用户看到哪一段回忆，线头就会跟到那一段附近。
                const localY = anchorY - rect.top
                const progress = gsap.utils.clamp(0, 1, localY / Math.max(rect.height, 1))

                maskRect.setAttribute('height', String(SVG_HEIGHT * progress))
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

                    gsap.fromTo(
                        element,
                        {
                            y: 46,
                            x: direction * 14,
                            rotate: direction * 0.8,
                            scale: 0.97,
                            opacity: 0,
                        },
                        {
                            y: 0,
                            x: 0,
                            rotate: 0,
                            scale: 1,
                            opacity: 1,
                            ease: 'power3.out',
                            scrollTrigger: {
                                trigger: element,
                                start: 'top 92%',
                                end: 'top 72%',
                                scrub: 0.16,
                                invalidateOnRefresh: true,
                            },
                        },
                    )
                })

                gsap.fromTo(
                    '.memory-ending',
                    { y: 34, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        scrollTrigger: {
                            trigger: '.memory-ending',
                            start: 'top 92%',
                            end: 'top 74%',
                            scrub: 0.18,
                            invalidateOnRefresh: true,
                        },
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
        <div ref={rootRef} className="relative min-h-screen overflow-hidden bg-[#fbfafc] text-zinc-950">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(221,214,254,.40),transparent_28%),radial-gradient(circle_at_86%_18%,rgba(224,242,254,.46),transparent_26%),radial-gradient(circle_at_52%_54%,rgba(253,242,248,.55),transparent_32%),linear-gradient(180deg,#fbfafc_0%,#faf9fc_44%,#f8f8fb_100%)]" />
            <div className="pointer-events-none absolute -left-24 top-[14%] h-[420px] w-[420px] rounded-full bg-violet-100/35 blur-[150px]" />
            <div className="pointer-events-none absolute -right-28 top-[36%] h-[420px] w-[420px] rounded-full bg-sky-100/35 blur-[160px]" />
            <div className="pointer-events-none absolute left-[38%] top-[62%] h-[360px] w-[360px] rounded-full bg-rose-100/25 blur-[150px]" />

            <div className="relative mx-auto w-full max-w-[1480px] px-4 pb-20 pt-7 sm:px-5 lg:px-6 xl:px-8">
                <section className="relative overflow-hidden rounded-[34px] border border-white/80 bg-white/88 px-6 py-9 shadow-[0_34px_90px_-68px_rgba(76,29,149,.22)] backdrop-blur-[18px] sm:px-8 sm:py-11 lg:px-10 lg:py-12">
                    <div className="pointer-events-none absolute -right-14 -top-20 h-72 w-72 rounded-full border border-violet-100/80 bg-violet-50/30" />
                    <div className="pointer-events-none absolute right-20 top-16 h-32 w-32 rounded-full border border-sky-100/80 bg-sky-50/25" />
                    <div className="pointer-events-none absolute -bottom-28 left-[34%] h-56 w-56 rounded-full bg-rose-50/70 blur-[55px]" />

                    <div className="memory-kicker inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50/70 px-3 py-1.5 text-[10px] font-medium text-violet-600">
                        <Icon type="spark" />
                        心迹 / Memory Path
                    </div>

                    <div className="mt-8 max-w-[1050px]">
                        <div className="overflow-visible pb-[0.12em] pt-[0.04em]"><h1 className="memory-title-line text-[clamp(4.25rem,10vw,8.8rem)] font-black leading-[0.94] tracking-[-0.055em] text-zinc-950">沿途</h1></div>
                        <div className="mt-2 overflow-visible pb-[0.08em]"><p className="memory-title-line text-[clamp(1.6rem,4vw,3.7rem)] font-medium leading-[1.14] tracking-[-0.045em] text-violet-500">把散落的回忆，</p></div>
                        <div className="overflow-visible pb-[0.08em]"><p className="memory-title-line text-[clamp(1.6rem,4vw,3.7rem)] font-medium leading-[1.14] tracking-[-0.045em] text-zinc-900">连成一条走过的路。</p></div>
                    </div>

                    <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                        <div>
                            <p className="memory-hero-copy max-w-[58ch] text-sm leading-7 text-zinc-500 sm:text-[15px]">写下日期、照片与一句话。向下滚动时，那条线会一点点经过每段记忆；往回滚，它也会跟着退回去。</p>
                            <p className="memory-hero-copy mt-2 max-w-[58ch] text-xs leading-6 text-zinc-400">内容只保存在当前浏览器。图片会在本地压缩后保存，不上传服务器。</p>
                        </div>
                        <div className="memory-hero-copy flex flex-wrap items-center gap-2">
                            <button type="button" onClick={() => setEditorOpen(true)} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-black/[0.07] bg-white px-5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:text-violet-600">
                                <Icon type="spark" />
                                编辑沿途
                            </button>
                            <button type="button" onClick={() => storyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-zinc-950 px-5 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-violet-600">
                                开始回忆
                                <Icon type="down" />
                            </button>
                        </div>
                    </div>
                </section>

                <section ref={storyRef} className="relative mt-12 scroll-mt-24 pb-20 sm:mt-16">
                    <div className="mx-auto max-w-[1100px]">
                        <div className="section-reveal mb-14 text-center sm:mb-20">
                            <div className="text-[9px] uppercase tracking-[0.26em] text-zinc-300">Memory journey</div>
                            <h2 className="mt-3 text-[clamp(2.5rem,6vw,5.4rem)] font-semibold tracking-[-0.06em] text-zinc-950">{title || '未命名的沿途'}</h2>
                            <div className="mx-auto mt-5 h-px w-20 bg-gradient-to-r from-transparent via-violet-300 to-transparent" />
                        </div>

                        <div ref={pathTrackRef} className="relative">
                            <svg className="pointer-events-none absolute left-1/2 top-0 h-full w-full -translate-x-1/2 overflow-visible" viewBox="0 0 1000 3000" preserveAspectRatio="none" aria-hidden="true">
                                <defs>
                                    <linearGradient id="memoryPathGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.9" />
                                        <stop offset="46%" stopColor="#a78bfa" stopOpacity="0.82" />
                                        <stop offset="78%" stopColor="#c084fc" stopOpacity="0.62" />
                                        <stop offset="100%" stopColor="#e9d5ff" stopOpacity="0.22" />
                                    </linearGradient>

                                    <mask id="memoryPathRevealMask" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="3000">
                                        <rect x="0" y="0" width="1000" height="3000" fill="black" />
                                        <rect ref={maskRectRef} x="0" y="0" width="1000" height="0" fill="white" />
                                    </mask>
                                </defs>

                                {/* 很淡的完整轨迹，告诉用户“路”在哪里，但不会抢视觉。 */}
                                <path
                                    d="M500 0 C500 160 310 190 318 410 C326 640 700 620 694 890 C688 1120 350 1080 374 1390 C396 1690 740 1630 716 1940 C692 2230 360 2190 398 2500 C425 2710 540 2770 500 3000"
                                    fill="none"
                                    stroke="#ddd6fe"
                                    strokeOpacity="0.12"
                                    strokeWidth="1.5"
                                    vectorEffect="non-scaling-stroke"
                                    strokeLinecap="round"
                                />

                                {/* 真正随滚动出现的主线。用垂直 mask 揭示，不会再因为曲线弯折而落后。 */}
                                <path
                                    ref={pathRef}
                                    d="M500 0 C500 160 310 190 318 410 C326 640 700 620 694 890 C688 1120 350 1080 374 1390 C396 1690 740 1630 716 1940 C692 2230 360 2190 398 2500 C425 2710 540 2770 500 3000"
                                    fill="none"
                                    stroke="url(#memoryPathGradient)"
                                    strokeWidth="3.4"
                                    vectorEffect="non-scaling-stroke"
                                    strokeLinecap="round"
                                    mask="url(#memoryPathRevealMask)"
                                />
                            </svg>

                            <div className="relative space-y-28 sm:space-y-36 lg:space-y-44">
                                {orderedMemories.map((memory, index) => {
                                    const isLeft = index % 2 === 0
                                    return (
                                        <article key={memory.id} className={`memory-reveal relative grid min-h-[360px] items-center gap-7 md:grid-cols-2 md:gap-14 ${isLeft ? '' : 'md:[&>*:first-child]:order-2'}`}>
                                            <div className={isLeft ? 'md:pr-8' : 'md:pl-8'}>
                                                <div className="relative overflow-hidden rounded-[28px] border border-black/[0.06] bg-white shadow-[0_30px_70px_-58px_rgba(15,23,42,.35)]">
                                                    {memory.image ? (
                                                        <div className="relative aspect-[4/3] bg-zinc-100">
                                                            <Image src={memory.image} alt={memory.title || '回忆照片'} fill unoptimized sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                                                        </div>
                                                    ) : (
                                                        <div className="flex aspect-[4/3] items-center justify-center bg-[radial-gradient(circle_at_35%_30%,rgba(196,181,253,.35),transparent_32%),radial-gradient(circle_at_75%_68%,rgba(186,230,253,.45),transparent_30%),linear-gradient(135deg,#fafafa,#f5f3ff)]">
                                                            <div className="text-center"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-black/[0.05] bg-white/70 text-zinc-300"><Icon type="image" /></div><div className="mt-3 text-[9px] uppercase tracking-[0.2em] text-zinc-300">Memory image</div></div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className={isLeft ? 'md:pl-8' : 'md:pr-8'}>
                                                <div className="relative">
                                                    <span className="absolute -left-7 top-1 hidden h-3.5 w-3.5 rounded-full border-[3px] border-[#fbfafc] bg-violet-400 shadow-[0_0_0_1px_rgba(139,92,246,.2)] md:block" />
                                                    <div className="font-mono text-[10px] tracking-[0.16em] text-violet-400">{formatDate(memory.date)}</div>
                                                    <h3 className="mt-3 text-2xl font-semibold tracking-[-0.045em] text-zinc-950 sm:text-3xl">{memory.title || '这一段还没有标题'}</h3>
                                                    <p className="mt-4 max-w-[38ch] whitespace-pre-wrap text-sm leading-7 text-zinc-500 sm:text-[15px]">{memory.text || '这一段回忆还没有写下什么。'}</p>
                                                    <div className="mt-6 flex items-center gap-3"><span className="h-px w-10 bg-violet-200" /><span className="text-[9px] uppercase tracking-[0.18em] text-zinc-300">Memory {String(index + 1).padStart(2, '0')}</span></div>
                                                </div>
                                            </div>
                                        </article>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="memory-ending mx-auto mt-36 max-w-2xl text-center sm:mt-44">
                            <div className="mx-auto flex w-fit flex-col items-center"><span className="h-10 w-px bg-gradient-to-b from-violet-300 to-violet-200/30" /><span className="mt-1 h-1.5 w-1.5 rounded-full bg-violet-300" /><span className="mt-3 h-1 w-1 rounded-full bg-violet-200" /><span className="mt-3 h-0.5 w-0.5 rounded-full bg-violet-100" /></div>
                            <div className="mt-10 text-[9px] uppercase tracking-[0.26em] text-zinc-300">End of this path</div>
                            <p className="mt-4 whitespace-pre-wrap text-[clamp(1.65rem,4vw,3.4rem)] font-medium leading-[1.16] tracking-[-0.05em] text-zinc-900">{ending || '故事暂时停在这里。'}</p>
                            <p className="mt-6 text-xs leading-6 text-zinc-400">往回滚，线也会陪你重新走一遍。</p>
                        </div>
                    </div>
                </section>

                <button
                    type="button"
                    onClick={() => setEditorOpen(true)}
                    className="fixed bottom-5 right-5 z-40 inline-flex h-12 items-center gap-2 rounded-full border border-white/80 bg-zinc-950 px-4 text-xs font-semibold text-white shadow-[0_18px_50px_-20px_rgba(15,23,42,.55)] transition hover:-translate-y-0.5 hover:bg-violet-600 sm:bottom-7 sm:right-7"
                >
                    <Icon type="spark" />
                    编辑沿途
                    <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-[9px] text-white/65">{memories.length}</span>
                </button>

                {editorOpen && (
                    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-zinc-950/20 p-0 backdrop-blur-[10px] sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label="编辑沿途">
                        <button type="button" aria-label="关闭编辑器" onClick={() => setEditorOpen(false)} className="absolute inset-0 cursor-default" />

                        <div className="relative flex h-[92dvh] w-full max-w-[1120px] flex-col overflow-hidden rounded-t-[30px] border border-white/80 bg-[#fbfafc]/96 shadow-[0_32px_100px_-30px_rgba(30,20,60,.35)] sm:h-[86dvh] sm:rounded-[30px]">
                            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-black/[0.06] bg-white/82 px-4 py-4 backdrop-blur-xl sm:px-6">
                                <div className="min-w-0">
                                    <div className="text-[9px] uppercase tracking-[0.24em] text-violet-400">Memory editor</div>
                                    <div className="mt-1 flex items-center gap-3">
                                        <h2 className="truncate text-xl font-semibold tracking-[-0.04em] text-zinc-950 sm:text-2xl">编辑沿途</h2>
                                        <span className="hidden rounded-full bg-violet-50 px-2.5 py-1 font-mono text-[9px] text-violet-500 sm:inline-flex">{memories.length} memories</span>
                                    </div>
                                </div>

                                <div className="flex shrink-0 items-center gap-2">
                                    <span className="hidden text-[10px] text-zinc-400 md:inline">
                                        {saveState === 'saved' ? '已自动保存' : saveState === 'failed' ? '保存失败' : '编辑后自动保存'}
                                    </span>
                                    <button type="button" onClick={resetAll} className="inline-flex h-9 items-center gap-2 rounded-full border border-black/[0.06] bg-white px-3 text-[10px] text-zinc-500 transition hover:text-zinc-900">
                                        <Icon type="reset" />
                                        重置
                                    </button>
                                    <button type="button" onClick={() => setEditorOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-zinc-950 text-lg font-light leading-none text-white transition hover:bg-violet-600" aria-label="完成并关闭">
                                        ×
                                    </button>
                                </div>
                            </div>

                            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                                <div className="mx-auto grid w-full max-w-[1060px] gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:grid-cols-[300px_minmax(0,1fr)]">
                                    <aside className="h-fit rounded-[24px] border border-black/[0.06] bg-white/88 p-4 shadow-[0_20px_60px_-50px_rgba(76,29,149,.25)] lg:sticky lg:top-5">
                                        <div className="text-[9px] uppercase tracking-[0.22em] text-zinc-300">Story settings</div>
                                        <h3 className="mt-2 text-lg font-semibold tracking-[-0.035em] text-zinc-900">这段路叫什么？</h3>

                                        <label className="mt-5 block">
                                            <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-zinc-400">Story title</span>
                                            <input value={title} onChange={(e) => { setTitle(e.target.value); setSaveState('idle') }} className="h-11 w-full rounded-[14px] border border-black/[0.06] bg-[#fafafa] px-3 text-sm font-semibold text-zinc-800 outline-none transition focus:border-violet-300 focus:bg-white" />
                                        </label>

                                        <label className="mt-4 block">
                                            <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-zinc-400">Ending</span>
                                            <textarea value={ending} onChange={(e) => { setEnding(e.target.value); setSaveState('idle') }} rows={5} className="w-full resize-none rounded-[14px] border border-black/[0.06] bg-[#fafafa] px-3 py-3 text-xs leading-6 text-zinc-700 outline-none transition focus:border-violet-300 focus:bg-white" />
                                        </label>

                                        <div className="mt-4 rounded-[16px] bg-violet-50/70 px-3 py-3 text-[10px] leading-5 text-violet-600">
                                            照片会先在浏览器本地压缩，再保存到当前浏览器，不上传服务器。
                                        </div>
                                    </aside>

                                    <div className="min-w-0">
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <div>
                                                <div className="text-[9px] uppercase tracking-[0.22em] text-zinc-300">Memories</div>
                                                <div className="mt-1 text-sm font-semibold text-zinc-800">沿途的每一个节点</div>
                                            </div>
                                            <button type="button" onClick={addMemory} className="inline-flex h-9 items-center gap-2 rounded-full bg-violet-600 px-3.5 text-[10px] font-semibold text-white shadow-[0_12px_30px_-18px_rgba(124,58,237,.7)] transition hover:-translate-y-0.5 hover:bg-violet-700">
                                                <Icon type="plus" />
                                                添加回忆
                                            </button>
                                        </div>

                                        <div className="space-y-3">
                                            {memories.map((memory, index) => (
                                                <MemoryEditorCard
                                                    key={memory.id}
                                                    memory={memory}
                                                    index={index}
                                                    canDelete={memories.length > 1}
                                                    onChange={updateMemory}
                                                    onRemove={removeMemory}
                                                    onImage={handleImage}
                                                />
                                            ))}
                                        </div>

                                        <button type="button" onClick={addMemory} className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-[20px] border border-dashed border-violet-200 bg-violet-50/35 text-xs font-semibold text-violet-600 transition hover:border-violet-300 hover:bg-violet-50">
                                            <Icon type="plus" />
                                            再添加一段回忆
                                        </button>

                                        <div className="h-5" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-black/[0.06] bg-white/88 px-4 py-3 backdrop-blur-xl sm:px-6">
                                <div className="text-[10px] text-zinc-400">
                                    {saveState === 'saved' ? '所有修改已保存到浏览器' : saveState === 'failed' ? '保存失败，可能是图片过大' : '正在等待自动保存…'}
                                </div>

                                <button type="button" onClick={() => setEditorOpen(false)} className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-5 text-xs font-semibold text-white transition hover:bg-violet-600">
                                    完成编辑
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <footer className="section-reveal mt-10 flex flex-col gap-3 border-t border-black/[0.06] pt-5 text-[10px] text-zinc-300 sm:flex-row sm:items-center sm:justify-between"><span>BitLeap / 心迹 / 沿途</span><span>Memories stay local in your browser.</span></footer>
            </div>
        </div>
    )
}
