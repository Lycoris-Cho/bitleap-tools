'use client'

import Image from 'next/image'
import {
    ChangeEvent,
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
} from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

type Memory = {
    id: string
    date: string
    title: string
    text: string
    image?: string
}

type Point = { x: number; y: number }

const STORAGE_KEY = 'bitleap-memory-path-v1'

/* 每段回忆一个色调：节点、日期、引号、背景光晕都跟着它走 */
const ACCENTS = [
    { hex: '#8b5cf6', soft: 'rgba(139,92,246,.18)' },
    { hex: '#ec4899', soft: 'rgba(236,72,153,.15)' },
    { hex: '#38bdf8', soft: 'rgba(56,189,248,.17)' },
    { hex: '#6366f1', soft: 'rgba(99,102,241,.17)' },
    { hex: '#14b8a6', soft: 'rgba(20,184,166,.15)' },
]

function accentOf(index: number) {
    const length = ACCENTS.length
    return ACCENTS[((index % length) + length) % length]
}

const round1 = (value: number) => Math.round(value * 10) / 10

/* 量节点位置要在浏览器绘制前完成（useLayoutEffect），但服务端没有 layout，
   useLayoutEffect 会在 SSR 时报警告，所以按环境选一个 */
const useIsomorphicLayoutEffect =
    typeof window === 'undefined' ? useEffect : useLayoutEffect

/*
 * 把节点串成一条路。
 * 每一段的两个控制点都朝着同一侧偏移 amp，于是这一段向那侧鼓起；
 * 相邻段左右交替，整条线就在节点之间来回摆动 —— 关键是它精确穿过每一个节点，
 * 所以路上每一个驿站都真的落在路上。
 */
function buildRoad(nodes: Point[], bow: number, extend = 0): string {
    if (!nodes.length) return ''

    const list: Point[] = [
        { x: nodes[0].x, y: nodes[0].y - extend },
        ...nodes,
        { x: nodes[nodes.length - 1].x, y: nodes[nodes.length - 1].y + extend },
    ]

    let d = `M ${round1(list[0].x)} ${round1(list[0].y)}`

    for (let i = 0; i < list.length - 1; i += 1) {
        const a = list[i]
        const b = list[i + 1]
        // 摆动幅度跟着段高走：段短就摆得小，避免出现横向拉平的尖角
        const amp = Math.min(bow, Math.abs(b.y - a.y) * 0.5) * (i % 2 === 0 ? 1 : -1)
        const dy = (b.y - a.y) * 0.4

        d += ` C ${round1(a.x + amp)} ${round1(a.y + dy)} ${round1(b.x + amp)} ${round1(b.y - dy)} ${round1(b.x)} ${round1(b.y)}`
    }

    return d
}

/* 元素相对某个祖先的排版坐标（走 offsetParent 链，绕开 GSAP 的 transform） */
function offsetWithin(element: HTMLElement, ancestor: HTMLElement) {
    let x = 0
    let y = 0
    let current: HTMLElement | null = element

    while (current && current !== ancestor) {
        x += current.offsetLeft
        y += current.offsetTop
        current = current.offsetParent as HTMLElement | null
    }

    return { x, y }
}

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

type IconType =
    | 'plus'
    | 'trash'
    | 'image'
    | 'down'
    | 'up'
    | 'reset'
    | 'spark'
    | 'route'

function Icon({ type }: { type: IconType }) {
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
    if (type === 'up') {
        return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4"><path d="M12 19V5m-6 6 6-6 6 6" /></svg>
    }
    if (type === 'reset') {
        return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4"><path d="M4 4v6h6M20 20v-6h-6M5.6 15A7 7 0 0 0 18 17.5M18.4 9A7 7 0 0 0 6 6.5" /></svg>
    }
    if (type === 'route') {
        return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4"><circle cx="6" cy="19" r="2.4" /><circle cx="18" cy="5" r="2.4" /><path d="M9.5 17.6h4.2a3.6 3.6 0 0 0 0-7.2h-3.4a3.6 3.6 0 0 1 0-7.2h3.3" /></svg>
    }
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4"><path d="M12 3l1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z" /><path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14Z" /></svg>
}

/* 首屏的路线缩影：和正文同一条生成规则，只是缩小了 */
function RoutePreview({ count }: { count: number }) {
    const total = Math.max(2, Math.min(count, 10))
    const nodes = useMemo(
        () =>
            Array.from({ length: total }, (_, index) => ({
                x: 16 + (index / (total - 1)) * 168,
                y: index % 2 === 0 ? 30 : 18,
            })),
        [total],
    )
    const d = useMemo(() => buildRoad(nodes, 13, 12), [nodes])

    return (
        <div className="journey-route-preview pointer-events-none flex items-center gap-4">
            <svg viewBox="0 0 200 48" className="h-12 w-[200px] overflow-visible" aria-hidden="true">
                <path d={d} fill="none" stroke="rgba(139,92,246,.20)" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="2 7" />
                <path d={d} fill="none" stroke="rgba(139,92,246,.34)" strokeWidth="0.9" strokeLinecap="round" />
                {nodes.map((node, index) => (
                    <circle
                        key={index}
                        cx={node.x}
                        cy={node.y}
                        r={index === 0 ? 3.2 : 2.4}
                        fill={index === 0 ? '#8b5cf6' : '#fff'}
                        stroke="rgba(139,92,246,.55)"
                        strokeWidth="1.2"
                    />
                ))}
            </svg>
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-300">
                {total} stations
            </div>
        </div>
    )
}

function MemoryEditorCard({
    memory,
    index,
    total,
    canDelete,
    onChange,
    onRemove,
    onImage,
    onMove,
}: {
    memory: Memory
    index: number
    total: number
    canDelete: boolean
    onChange: (id: string, patch: Partial<Memory>) => void
    onRemove: (id: string) => void
    onImage: (id: string, event: ChangeEvent<HTMLInputElement>) => void
    onMove: (index: number, direction: -1 | 1) => void
}) {
    const accent = accentOf(index)

    return (
        <div className="rounded-[24px] border border-black/[0.06] bg-white/92 p-4 shadow-[0_18px_50px_-42px_rgba(76,29,149,.16)] backdrop-blur-sm sm:p-5">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: accent.hex, boxShadow: `0 0 0 4px ${accent.soft}` }} />
                    <span className="font-mono text-[10px] text-zinc-300">{String(index + 1).padStart(2, '0')}</span>
                    <span className="text-xs font-semibold text-zinc-800">一段回忆</span>
                </div>

                <div className="flex items-center gap-1">
                    <button type="button" onClick={() => onMove(index, -1)} disabled={index === 0} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/[0.05] bg-zinc-50 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-25" aria-label="往前挪一段">
                        <Icon type="up" />
                    </button>
                    <button type="button" onClick={() => onMove(index, 1)} disabled={index === total - 1} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/[0.05] bg-zinc-50 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-25" aria-label="往后挪一段">
                        <Icon type="down" />
                    </button>
                    <button type="button" onClick={() => onRemove(memory.id)} disabled={!canDelete} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/[0.05] bg-zinc-50 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-25" aria-label="删除这段回忆">
                        <Icon type="trash" />
                    </button>
                </div>
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
    const trackRef = useRef<HTMLDivElement>(null)
    const pathRef = useRef<SVGPathElement>(null)
    const maskRectRef = useRef<SVGRectElement>(null)
    const tipRef = useRef<SVGGElement>(null)
    const journeyProgressRef = useRef<HTMLDivElement>(null)

    const [title, setTitle] = useState('我们的沿途')
    const [ending, setEnding] = useState('有些故事停在这里，但走过的路不会消失。')
    const [memories, setMemories] = useState<Memory[]>(starterMemories)
    const [hydrated, setHydrated] = useState(false)
    const [saveState, setSaveState] = useState<'idle' | 'saved' | 'failed'>('idle')
    const [editorOpen, setEditorOpen] = useState(false)
    const [activeIndex, setActiveIndex] = useState(0)
    const [road, setRoad] = useState<{ w: number; h: number; d: string } | null>(null)

    const accent = accentOf(activeIndex)

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

    /* 内容变了就重新量一次节点位置 */
    const roadKey = useMemo(
        () => `${memories.length}:${memories.map((memory) => [memory.title.length, memory.text.length, memory.image ? 1 : 0].join('')).join('|')}`,
        [memories],
    )

    const measureRoad = useCallback(() => {
        const track = trackRef.current
        if (!track) return

        const w = track.offsetWidth
        const h = track.offsetHeight
        if (!w || !h) return

        const nodes: Point[] = []

        track.querySelectorAll<HTMLElement>('[data-memory-node]').forEach((node) => {
            // 该断点下节点是隐藏的（手机上），跳过
            if (!node.offsetWidth && !node.offsetHeight) return
            const { x, y } = offsetWithin(node, track)
            nodes.push({ x: x + node.offsetWidth / 2, y: y + node.offsetHeight / 2 })
        })

        if (!nodes.length) {
            // 没有可用的节点时退化成一条居中的直线，路还是连着的那条
            setRoad({ w, h, d: buildRoad([{ x: w / 2, y: h / 2 }], 0, h / 2) })
            return
        }

        setRoad({ w, h, d: buildRoad(nodes, Math.min(w * 0.14, 160), h * 0.06) })
    }, [])

    useIsomorphicLayoutEffect(() => {
        measureRoad()

        const track = trackRef.current
        if (!track) return

        let lastW = track.offsetWidth
        let lastH = track.offsetHeight

        const observer = new ResizeObserver((entries) => {
            const box = entries[0]?.contentRect
            if (!box) return
            // 只在尺寸真的变了时才重算，避免 refresh ↔ resize 互相触发
            if (Math.abs(box.width - lastW) < 1 && Math.abs(box.height - lastH) < 1) return
            lastW = box.width
            lastH = box.height
            measureRoad()
            requestAnimationFrame(() => ScrollTrigger.refresh())
        })

        observer.observe(track)
        window.addEventListener('resize', measureRoad)

        // 字体和图片会改变高度，就位后再量一次
        document.fonts?.ready.then(() => measureRoad()).catch(() => {})

        return () => {
            observer.disconnect()
            window.removeEventListener('resize', measureRoad)
        }
    }, [measureRoad, roadKey])

    /* 首屏进场 */
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
                .from('.journey-orbit', { scale: 0.88, opacity: 0, duration: 1 }, '-=0.8')
                .from('.journey-route-preview', { opacity: 0, x: -14, duration: 0.7 }, '-=0.9')
                .from('.journey-route-preview circle', { scale: 0, transformOrigin: 'center', duration: 0.4, stagger: 0.07 }, '-=0.5')

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

    /* 路：随滚动被一点点画出来，笔尖跟着走 */
    useEffect(() => {
        const track = trackRef.current
        const maskRect = maskRectRef.current
        const path = pathRef.current
        const tip = tipRef.current
        const progressBar = journeyProgressRef.current
        if (!track || !maskRect || !path || !tip || !road) return

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const extend = road.h * 0.06

        const sync = () => {
            const rect = track.getBoundingClientRect()
            const anchorY = window.innerHeight * 0.62
            const progress = gsap.utils.clamp(0, 1, (anchorY - rect.top) / Math.max(rect.height, 1))
            const cut = road.h * progress

            maskRect.setAttribute('height', String(Math.max(0, cut + extend)))
            if (progressBar) progressBar.style.transform = `scaleX(${progress})`

            if (reduceMotion) {
                tip.style.opacity = '0'
                return
            }

            // 笔尖落在曲线与“当前水平线”的交点上（曲线在 y 方向单调，二分即可）
            let low = 0
            let high = path.getTotalLength()
            for (let i = 0; i < 14; i += 1) {
                const mid = (low + high) / 2
                if (path.getPointAtLength(mid).y < cut) low = mid
                else high = mid
            }
            const point = path.getPointAtLength(low)
            tip.setAttribute('transform', `translate(${round1(point.x)} ${round1(point.y)})`)
            tip.style.opacity = progress > 0.004 && progress < 0.999 ? '1' : '0'
        }

        sync()

        if (reduceMotion) {
            maskRect.setAttribute('height', String(road.h + extend))
            maskRect.setAttribute('width', '0')
            if (progressBar) progressBar.style.transform = 'scaleX(1)'
            return
        }

        const trigger = ScrollTrigger.create({
            trigger: track,
            start: 'top bottom',
            end: 'bottom top',
            invalidateOnRefresh: true,
            onUpdate: sync,
            onRefresh: sync,
        })

        requestAnimationFrame(() => {
            ScrollTrigger.refresh()
            sync()
        })

        return () => trigger.kill()
    }, [road])

    /* 每一段的进场：卡片淡入、照片显影、文字从遮罩后面升起来 */
    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger)

        const story = storyRef.current
        if (!story) return

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

        const ctx = gsap.context(() => {
            if (reduceMotion) return

            gsap.utils.toArray<HTMLElement>('.memory-reveal').forEach((element, index) => {
                gsap.fromTo(
                    element,
                    { opacity: 0 },
                    {
                        opacity: 1,
                        duration: 0.6,
                        ease: 'power2.out',
                        scrollTrigger: { trigger: element, start: 'top 88%', toggleActions: 'play none none none' },
                    },
                )

                ScrollTrigger.create({
                    trigger: element,
                    start: 'top 62%',
                    end: 'bottom 38%',
                    onEnter: () => setActiveIndex(index),
                    onEnterBack: () => setActiveIndex(index),
                })

                // 文字从遮罩下升起来
                gsap.from(element.querySelectorAll('.memory-line'), {
                    yPercent: 118,
                    duration: 0.9,
                    ease: 'power3.out',
                    stagger: 0.08,
                    scrollTrigger: { trigger: element, start: 'top 82%', toggleActions: 'play none none none' },
                })

                // 照片显影：从模糊、发白、略微放大，慢慢变清楚
                const photo = element.querySelector('.memory-photo')
                if (photo) {
                    gsap.fromTo(
                        photo,
                        { filter: 'blur(14px) saturate(.5) brightness(1.12)', scale: 1.07 },
                        {
                            filter: 'blur(0px) saturate(1) brightness(1)',
                            scale: 1,
                            ease: 'power2.out',
                            scrollTrigger: { trigger: element, start: 'top 86%', end: 'top 48%', scrub: 0.6 },
                        },
                    )
                }

                // 照片轻微视差
                const shell = element.querySelector('.memory-photo-shell')
                if (shell) {
                    gsap.fromTo(
                        shell,
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
        }, story)

        requestAnimationFrame(() => ScrollTrigger.refresh())

        return () => ctx.revert()
    }, [roadKey])

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

    const moveMemory = (index: number, direction: -1 | 1) => {
        setMemories((current) => {
            const target = index + direction
            if (target < 0 || target >= current.length) return current
            const next = [...current]
            ;[next[index], next[target]] = [next[target], next[index]]
            return next
        })
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
            style={{ '--accent': accent.hex, '--accent-soft': accent.soft } as CSSProperties}
        >
            <style jsx global>{`
                html { scroll-behavior: smooth; }
                body { background: #f8f6f3; }
                .journey-grain {
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.82' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.18'/%3E%3C/svg%3E");
                    mix-blend-mode: multiply;
                }
                .journey-ambient-a { background: var(--accent-soft); }
                .journey-ambient-c { background: var(--accent-soft); }
                .journey-shimmer { animation: journeyShimmer 12s linear infinite; }
                .journey-float { animation: journeyFloat 7s ease-in-out infinite; }
                .journey-float-slow { animation: journeyFloat 11s ease-in-out infinite reverse; }

                /* 路上的驿站：未到达是空心、当前在跳、走过的填实 */
                .journey-node {
                    border-radius: 999px;
                    border: 1.5px solid var(--node-accent);
                    background: #fff;
                    opacity: .3;
                    transition: opacity .45s ease, background-color .45s ease, box-shadow .45s ease;
                }
                .journey-node[data-state='past'] {
                    background: var(--node-accent);
                    opacity: .75;
                }
                .journey-node[data-state='active'] {
                    background: var(--node-accent);
                    opacity: 1;
                    box-shadow: 0 0 0 5px var(--node-soft), 0 0 26px var(--node-soft);
                    animation: journeyNodePulse 2.8s ease-in-out infinite;
                }

                @keyframes journeyShimmer { to { stroke-dashoffset: -120; } }
                @keyframes journeyFloat { 0%,100% { transform: translate3d(0,0,0); } 50% { transform: translate3d(0,-10px,0); } }
                @keyframes journeyNodePulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.22); }
                }

                @media (prefers-reduced-motion: reduce) {
                    .journey-shimmer, .journey-float, .journey-float-slow, .journey-node { animation: none !important; }
                }
            `}</style>

            {/* Atmospheric canvas */}
            <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(180deg,#faf8f5_0%,#f9f7f5_22%,#f8f6f5_56%,#f6f4f2_100%)]" />
                <div className="journey-ambient-a absolute -left-28 top-[3%] h-[540px] w-[540px] rounded-full blur-[145px] transition-[background-color] duration-1000" />
                <div className="journey-ambient-b absolute -right-32 top-[28%] h-[520px] w-[520px] rounded-full bg-[rgba(251,207,232,.14)] blur-[150px]" />
                <div className="journey-ambient-c absolute left-[28%] top-[63%] h-[600px] w-[600px] rounded-full blur-[170px] transition-[background-color] duration-1000" />
                <div className="journey-dust-a absolute left-[8%] top-[22%] h-1.5 w-1.5 rounded-full bg-violet-300/40 shadow-[90px_140px_0_rgba(196,181,253,.28),220px_40px_0_rgba(147,197,253,.24),410px_240px_0_rgba(251,207,232,.30),720px_120px_0_rgba(196,181,253,.20)]" />
                <div className="journey-dust-b absolute right-[13%] top-[48%] h-1 w-1 rounded-full bg-rose-300/40 shadow-[-180px_130px_0_rgba(196,181,253,.22),-420px_10px_0_rgba(125,211,252,.20),-680px_190px_0_rgba(251,207,232,.26)]" />
                <div className="journey-grain absolute inset-0 opacity-[0.055]" />
                <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-white/70 to-transparent" />
            </div>

            {/* Reading progress */}
            <div className="fixed inset-x-0 top-0 z-50 h-[2px] bg-black/[0.025]">
                {/* 注意：进度用内联 transform 推进，这里不能再用 scale-x-0 ——
                    Tailwind v4 的 scale-* 是独立的 scale 属性，会和 transform 相乘，把进度条压成 0 宽 */}
                <div ref={journeyProgressRef} style={{ transform: 'scaleX(0)' }} className="h-full origin-left bg-[linear-gradient(90deg,var(--accent),rgba(186,230,253,.85))] shadow-[0_0_18px_var(--accent-soft)]" />
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
                                <Icon type="route" />
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

                            <div className="relative">
                                <RoutePreview count={memories.length} />

                                <div className="journey-copy relative mt-8 border-l border-violet-200/70 pl-5 lg:pl-7">
                                    <div className="absolute -left-[3px] top-0 h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_0_6px_rgba(167,139,250,.10)]" />
                                    <div className="font-mono text-[9px] uppercase tracking-[0.24em] text-violet-400">About this path</div>
                                    <p className="mt-4 text-sm leading-7 text-zinc-500 sm:text-[15px]">把照片、日期和那些没舍得忘掉的话放在这里。往下走时，线会一点点经过它们，像把散落的片段重新串回一段完整的路。</p>
                                    <p className="mt-4 font-serif text-lg italic leading-7 text-zinc-600">“后来才明白，真正留下来的，常常不是大事，而是当时没有在意的一个瞬间。”</p>
                                </div>
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
                <section ref={storyRef} className="relative mt-16 scroll-mt-10 pb-16 sm:mt-24">
                    <div className="mx-auto max-w-[1180px]">
                        <div className="section-reveal mb-14 text-center sm:mb-20">
                            <div className="mx-auto mb-7 flex w-fit items-center gap-3">
                                <span className="h-px w-8 bg-violet-200" />
                                <span className="font-mono text-[9px] uppercase tracking-[0.30em] text-zinc-400">Memory journey</span>
                                <span className="h-px w-8 bg-violet-200" />
                            </div>
                            <h2 className="font-serif text-[clamp(3rem,7vw,6.7rem)] font-medium tracking-[-0.055em] text-[#29272d]">{title || '未命名的沿途'}</h2>
                            <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-zinc-400">不是为了回到过去，只是想让那些真实发生过的时刻，有一个不会被消息列表淹没的地方。</p>
                        </div>

                        <div ref={trackRef} className="relative">
                            <svg
                                className={`pointer-events-none absolute left-0 top-0 overflow-visible ${road ? 'opacity-100' : 'opacity-0'}`}
                                width={road?.w ?? 1000}
                                height={road?.h ?? 1000}
                                viewBox={`0 0 ${road?.w ?? 1000} ${road?.h ?? 1000}`}
                                preserveAspectRatio="none"
                                aria-hidden="true"
                            >
                                <defs>
                                    <linearGradient id="memoryRoadGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.85" />
                                        <stop offset="42%" stopColor="#a78bfa" stopOpacity="0.72" />
                                        <stop offset="74%" stopColor="#c084fc" stopOpacity="0.52" />
                                        <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.16" />
                                    </linearGradient>

                                    {/* 遮罩：白色部分就是“已经画出来的路” */}
                                    <mask id="memoryRoadMask" maskUnits="userSpaceOnUse" x={-(road?.w ?? 1000) * 0.3} y={-(road?.h ?? 1000) * 0.1} width={(road?.w ?? 1000) * 1.6} height={(road?.h ?? 1000) * 1.3}>
                                        <rect x={-(road?.w ?? 1000) * 0.3} y={-(road?.h ?? 1000) * 0.1} width={(road?.w ?? 1000) * 1.6} height={(road?.h ?? 1000) * 1.3} fill="black" />
                                        <rect ref={maskRectRef} x={-(road?.w ?? 1000) * 0.3} y={-(road?.h ?? 1000) * 0.06} width={(road?.w ?? 1000) * 1.6} height="0" fill="white" />
                                    </mask>

                                    <radialGradient id="memoryRoadTipGlow">
                                        <stop offset="0%" stopColor="rgba(255,255,255,.95)" />
                                        <stop offset="45%" stopColor="rgba(196,181,253,.42)" />
                                        <stop offset="100%" stopColor="rgba(196,181,253,0)" />
                                    </radialGradient>

                                    <filter id="memoryRoadGlow" x="-50%" y="-20%" width="200%" height="140%">
                                        <feGaussianBlur stdDeviation="5" result="blur" />
                                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                                    </filter>
                                </defs>

                                {/* 还没走到的路：淡淡地先摊在那里 */}
                                {road && <path d={road.d} fill="none" stroke="#c4b5fd" strokeOpacity="0.12" strokeWidth="1.35" strokeLinecap="round" />}

                                {road && (
                                    <>
                                        <path d={road.d} fill="none" stroke="url(#memoryRoadGradient)" strokeOpacity="0.16" strokeWidth="12" strokeLinecap="round" mask="url(#memoryRoadMask)" filter="url(#memoryRoadGlow)" />
                                        <path ref={pathRef} d={road.d} fill="none" stroke="url(#memoryRoadGradient)" strokeWidth="2.3" strokeLinecap="round" mask="url(#memoryRoadMask)" />
                                        <path className="journey-shimmer" d={road.d} fill="none" stroke="rgba(255,255,255,.72)" strokeWidth="1" strokeDasharray="3 22" strokeDashoffset="0" mask="url(#memoryRoadMask)" />

                                        {/* 笔尖：路就画到这里 */}
                                        <g ref={tipRef} className="transition-opacity duration-300" style={{ opacity: 0 }}>
                                            <circle r="13" fill="url(#memoryRoadTipGlow)" />
                                            <circle r="4.6" fill="rgba(255,255,255,.72)" />
                                            <circle r="2.4" fill={accent.hex} />
                                        </g>
                                    </>
                                )}
                            </svg>

                            <div className="relative space-y-24 sm:space-y-32 lg:space-y-40">
                                {memories.map((memory, index) => {
                                    const isLeft = index % 2 === 0
                                    const hasImage = Boolean(memory.image)
                                    const itemAccent = accentOf(index)
                                    const nodeState = index < activeIndex ? 'past' : index === activeIndex ? 'active' : 'future'

                                    return (
                                        <article key={memory.id} className="memory-reveal relative grid min-h-[420px] items-center gap-8 sm:min-h-[460px] md:grid-cols-2 md:gap-14">
                                            {/* 驿站：位置固定不动，路会精确穿过它 */}
                                            <span
                                                data-memory-node
                                                data-state={nodeState}
                                                className="journey-node pointer-events-none absolute hidden h-4 w-4 md:block"
                                                style={{ left: 'calc(50% - 8px)', top: 'calc(50% - 8px)', '--node-accent': itemAccent.hex, '--node-soft': itemAccent.soft } as CSSProperties}
                                            />

                                            <div className={isLeft ? 'md:pr-10' : 'md:pl-10'}>
                                                <div className={`memory-photo-shell relative mx-auto max-w-[520px] ${isLeft ? 'md:rotate-[-1.5deg]' : 'md:rotate-[1.5deg]'}`}>
                                                    <div className="absolute -inset-4 rounded-[38px] blur-2xl transition-colors duration-700" style={{ background: itemAccent.soft }} />
                                                    <div className="relative overflow-hidden rounded-[30px] border border-white/90 bg-white/82 p-2.5 shadow-[0_42px_95px_-60px_rgba(42,31,65,.48)] backdrop-blur-xl sm:p-3">
                                                        {hasImage ? (
                                                            <div className="relative aspect-[4/3] overflow-hidden rounded-[23px] bg-zinc-100">
                                                                <Image src={memory.image!} alt={memory.title || '回忆照片'} fill unoptimized sizes="(max-width: 768px) 100vw, 50vw" className="memory-photo object-cover" />
                                                                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.04),transparent_40%,rgba(31,25,42,.18))]" />
                                                                <div className="absolute inset-0 ring-1 ring-inset ring-white/20" />
                                                            </div>
                                                        ) : (
                                                            <div className="memory-photo relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[23px] bg-[radial-gradient(circle_at_28%_30%,rgba(196,181,253,.50),transparent_30%),radial-gradient(circle_at_78%_70%,rgba(186,230,253,.56),transparent_32%),linear-gradient(145deg,#fcfbfb,#f3f0f7)]">
                                                                <div className="absolute left-[14%] top-[18%] h-28 w-28 rounded-full bg-white/35 blur-2xl" />
                                                                <div className="relative text-center">
                                                                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/80 bg-white/58 text-violet-300 shadow-sm backdrop-blur-xl"><Icon type="image" /></div>
                                                                    <div className="mt-4 font-serif text-base italic text-zinc-400">这里还缺一张当时的照片。</div>
                                                                    <div className="mt-2 font-mono text-[8px] uppercase tracking-[0.24em] text-zinc-300">a frame waiting to be remembered</div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className="flex items-center justify-between px-2 pb-1 pt-3">
                                                            <span className="font-mono text-[9px] uppercase tracking-[0.18em]" style={{ color: itemAccent.hex, opacity: 0.62 }}>Frame {String(index + 1).padStart(2, '0')}</span>
                                                            <span className="font-serif text-xs italic text-zinc-400">留在沿途的一帧</span>
                                                        </div>
                                                    </div>
                                                    <span className={`absolute -bottom-4 ${isLeft ? '-right-3' : '-left-3'} h-12 w-20 rotate-[-8deg] bg-[#eee5d7]/58 shadow-sm backdrop-blur-sm`} />
                                                </div>
                                            </div>

                                            <div className={isLeft ? 'md:pl-12' : 'md:pr-12'}>
                                                <div className="relative max-w-[470px]">
                                                    <div className="overflow-hidden pb-[0.1em]">
                                                        <div className="memory-line flex items-center gap-3">
                                                            <span className="rounded-full border bg-white/62 px-3 py-1.5 font-mono text-[9px] tracking-[0.16em] backdrop-blur-lg" style={{ borderColor: itemAccent.soft, color: itemAccent.hex }}>{formatDate(memory.date)}</span>
                                                            <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-300">Memory {String(index + 1).padStart(2, '0')}</span>
                                                        </div>
                                                    </div>

                                                    <div className="mt-6 overflow-hidden pb-[0.14em]">
                                                        <h3 className="memory-line font-serif text-[clamp(2rem,4vw,3.45rem)] font-medium leading-[1.12] tracking-[-0.045em] text-[#2d2a31]">{memory.title || '这一段还没有标题'}</h3>
                                                    </div>

                                                    <div className="mt-6 overflow-hidden">
                                                        <div className="memory-line flex gap-4">
                                                            <span className="mt-1 font-serif text-4xl leading-none" style={{ color: itemAccent.hex, opacity: 0.35 }}>“</span>
                                                            <p className="max-w-[38ch] whitespace-pre-wrap text-[15px] leading-8 text-zinc-500 sm:text-base">{memory.text || '这一段回忆还没有写下什么。'}</p>
                                                        </div>
                                                    </div>

                                                    <div className="mt-8 flex items-center gap-3">
                                                        <span className="h-px w-12" style={{ background: `linear-gradient(90deg, ${itemAccent.hex}, transparent)` }} />
                                                        <span className="font-serif text-xs italic text-zinc-300">我们确实走到过这里。</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </article>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="memory-ending mx-auto mt-28 max-w-3xl text-center sm:mt-40">
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
                        <span className="flex h-7 min-w-7 items-center justify-center rounded-full px-2 font-mono text-[9px] text-white transition-colors duration-700" style={{ background: accent.hex }}>{String(activeIndex + 1).padStart(2, '0')}</span>
                        <div className="max-w-[220px] pr-2">
                            <div className="truncate text-[10px] font-semibold text-zinc-600">{memories[activeIndex]?.title || '这一段回忆'}</div>
                            <div className="mt-0.5 font-mono text-[8px] tracking-[0.12em] text-zinc-300">{formatDate(memories[activeIndex]?.date || '')}</div>
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
                                        <div className="mt-3 rounded-[16px] bg-zinc-50 px-3 py-3 text-[10px] leading-5 text-zinc-500">顺序就是路上的先后。可以用每张卡片右上角的箭头把某一段往前或往后挪。</div>
                                    </aside>

                                    <div className="min-w-0">
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <div><div className="font-mono text-[9px] uppercase tracking-[0.22em] text-zinc-300">Memories</div><div className="mt-1 text-sm font-semibold text-zinc-800">沿途的每一个节点</div></div>
                                            <button type="button" onClick={addMemory} className="inline-flex h-9 items-center gap-2 rounded-full bg-violet-600 px-3.5 text-[10px] font-semibold text-white shadow-[0_12px_30px_-18px_rgba(124,58,237,.7)] transition hover:-translate-y-0.5 hover:bg-violet-700"><Icon type="plus" />添加回忆</button>
                                        </div>
                                        <div className="space-y-3">
                                            {memories.map((memory, index) => (
                                                <MemoryEditorCard key={memory.id} memory={memory} index={index} total={memories.length} canDelete={memories.length > 1} onChange={updateMemory} onRemove={removeMemory} onImage={handleImage} onMove={moveMemory} />
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
