'use client'

import { useEffect, useRef, type RefObject } from 'react'
import { IconMusic } from './icons'
import type { LyricLine } from '../types'

interface LyricPanelProps {
    lyrics: LyricLine[]
    loading: boolean
    activeIndex: number
    /** 是否正在播放（用于安排"提前滚动"） */
    playing: boolean
    /** 读取音频真实进度，用于精确定时 */
    audioRef?: RefObject<HTMLAudioElement | null>
    onSeek: (time: number) => void
    /** 布局发生变化（小屏在封面/歌词之间切换）时改变的值，用来触发重新定位 */
    layoutKey?: string
}

/** 上下渐隐：套在滚动容器外层，滚动时无需每帧重算遮罩 */
const FADE_MASK = 'linear-gradient(to bottom, transparent 0%, #000 15%, #000 85%, transparent 100%)'
/** 当前句停在歌词框高度的百分比位置（< 50% 即偏上） */
const ACTIVE_LINE_RATIO = 0.4
/** 用户手动滚动后，多久自动回到当前句 */
const RESUME_DELAY = 2500
/**
 * 提前量：在下一句到来前这么多毫秒开始滚。
 * 动画时长略短于提前量，保证"滑到位"不晚于"换句高亮"——
 * 早 20ms 看不出来，晚了就会出现"先亮后滑"。
 */
const SCROLL_LEAD = 220
/** 滚动动画时长 */
const SCROLL_DURATION = 200
/**
 * 底部留白比例。
 * 顶部刻意不留白：歌曲开头几句就该贴着框顶往下排（和主流播放器一致），
 * 唱到第几句时列表自然滚上来，当前句到达焦点位置后才开始跟随。
 * 底部留白 ≥ (1 - ACTIVE_LINE_RATIO) 才能保证最后几句也滚得到焦点位置。
 */
const BOTTOM_PADDING_RATIO = 0.6

/**
 * 校正底部留白（只有底部一个占位块）。
 * 不能把留白加在滚动内容容器上 —— 那样"暂无歌词"/加载骨架也会被顶到下面去。
 * 另外：小屏下歌词面板初始是 display:none（clientHeight 为 0），
 * ResizeObserver 不一定会在切换显示时补算，所以每次定位前都校正一次。
 */
function applyPadding(container: HTMLElement | null, bottom: HTMLElement | null) {
    if (!container || !bottom) return
    const pad = Math.round(container.clientHeight * BOTTOM_PADDING_RATIO)
    if (pad <= 0) return
    if (bottom.style.height !== `${pad}px`) bottom.style.height = `${pad}px`
}

/**
 * 歌词面板：
 * - 高亮：只改颜色/字号，不改行高（行高固定），切换时不会整列重排
 * - 当前句停在框高 40% 处；用户滑走后 2.5 秒自动滚回当前句
 * - 滚动用「绝对目标位置 + rAF 缓动」，不用原生 smooth 滚动
 */
export default function LyricPanel({ lyrics, loading, activeIndex, playing, audioRef, onSeek, layoutKey }: LyricPanelProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    /** 底部留白占位块（只在有歌词时渲染） */
    const bottomPadRef = useRef<HTMLDivElement>(null)
    const activeIndexRef = useRef(activeIndex)
    /** 是否正在执行我们自己的滚动动画（用于区分用户滚动） */
    const animatingRef = useRef(false)
    /** 动画的 rAF id，重新定位前先取消 */
    const rafRef = useRef(0)
    /** 用户接管滚动后的静默期截止时间 */
    const holdUntilRef = useRef(0)
    /** 用户停止滚动后自动归位的定时器 */
    const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    /** 首次定位直接跳位，不做缓动 */
    const firstPositionRef = useRef(true)
    /** 供定时器/事件调用最新定位逻辑，避免闭包过期 */
    const centerOnRef = useRef<(index: number) => void>(() => {})

    useEffect(() => {
        activeIndexRef.current = activeIndex
    }, [activeIndex])

    /* 布局切换（小屏封面↔歌词）或尺寸变化后：校正留白并重新定位当前句 */
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const syncAndCenter = () => {
            applyPadding(container, bottomPadRef.current)
            centerOnRef.current(activeIndexRef.current)
        }

        syncAndCenter()
        const resizeObserver = new ResizeObserver(syncAndCenter)
        resizeObserver.observe(container)

        return () => resizeObserver.disconnect()
    }, [layoutKey, lyrics.length])

    /* 定位到某一句：先校正留白，算绝对目标位置后做 rAF 缓动 */
    const centerOn = (index: number) => {
        const container = containerRef.current
        if (!container || index < 0) return
        // 面板还没显示（小屏封面视图）时不定位，否则会白消耗"首次直接跳位"的机会
        if (container.clientHeight <= 0) return
        applyPadding(container, bottomPadRef.current)

        const line = container.querySelector<HTMLElement>(`[data-lyric-index="${index}"]`)
        if (!line) return

        cancelAnimationFrame(rafRef.current)
        animatingRef.current = false

        const maxScroll = container.scrollHeight - container.clientHeight
        const target = Math.max(
            0,
            Math.min(line.offsetTop + line.offsetHeight / 2 - container.clientHeight * ACTIVE_LINE_RATIO, maxScroll)
        )

        const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        if (firstPositionRef.current || reduceMotion) {
            firstPositionRef.current = false
            container.scrollTop = target
            return
        }

        // 定长缓动（easeOutCubic）：时长固定才好和"提前量"对齐，
        // 这样"滑到位"和"高亮切换"能落在同一时刻。
        const from = container.scrollTop
        const delta = target - from
        const startedAt = performance.now()
        let lastSet = from
        animatingRef.current = true

        const step = () => {
            // 位置被外部改动（用户拖走了）→ 停手，交给用户
            if (Math.abs(container.scrollTop - lastSet) > 2) {
                animatingRef.current = false
                return
            }
            const t = Math.min(1, (performance.now() - startedAt) / SCROLL_DURATION)
            const eased = 1 - Math.pow(1 - t, 3)
            lastSet = from + delta * eased
            container.scrollTop = lastSet
            if (t < 1) rafRef.current = requestAnimationFrame(step)
            else animatingRef.current = false
        }
        rafRef.current = requestAnimationFrame(step)
    }

    useEffect(() => {
        centerOnRef.current = centerOn
    })

    /* 当前句变化 → 立刻滚动（拖动进度、暂停等场景的兜底；播放中通常已被下面的提前量提前滚到位） */
    useEffect(() => {
        if (activeIndex < 0) return
        if (Date.now() < holdUntilRef.current) return
        centerOnRef.current(activeIndex)
    }, [activeIndex])

    /* 严格同步：在下一句到来前 SCROLL_DURATION 毫秒开始滚，
       滚完的那一刻正好是高亮切换的时刻，两者严格对齐。 */
    useEffect(() => {
        if (activeIndex < 0 || !playing) return
        const next = lyrics[activeIndex + 1]
        const audio = audioRef?.current
        if (!next || !audio) return

        // 用音频真实进度定时（比 state 里的 currentTime 精确），并换算掉倍速影响
        const rate = audio.playbackRate || 1
        const delay = ((next.time - audio.currentTime) / rate) * 1000 - SCROLL_LEAD
        if (delay <= 0 || delay > 6000) return

        const timer = setTimeout(() => {
            if (Date.now() < holdUntilRef.current) return
            centerOnRef.current(activeIndex + 1)
        }, delay)
        return () => clearTimeout(timer)
    }, [activeIndex, playing, lyrics, audioRef])

    /* 用户滚动 → 静默 2.5 秒后自动滚回当前句 */
    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        const onScroll = () => {
            if (animatingRef.current) return
            holdUntilRef.current = Date.now() + RESUME_DELAY
            if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
            resumeTimerRef.current = setTimeout(() => {
                centerOnRef.current(activeIndexRef.current)
            }, RESUME_DELAY)
        }
        container.addEventListener('scroll', onScroll, { passive: true })
        return () => {
            container.removeEventListener('scroll', onScroll)
            if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
            cancelAnimationFrame(rafRef.current)
        }
    }, [])

    return (
        <div
            // 小屏要有确定高度，否则歌词会把容器撑开、内部就不滚动了；桌面端由外层 flex-1 约束
            className="h-[44vh] min-h-[220px] w-full md:h-auto md:min-h-0 md:flex-1"
            style={{ maskImage: FADE_MASK, WebkitMaskImage: FADE_MASK }}
        >
            {/* relative 必须有：歌词行的 offsetTop 要以这个滚动容器为基准 */}
            <div ref={containerRef} className="scrollbar-hidden relative h-full overflow-y-auto pr-2">
                {loading ? (
                    <div className="space-y-4 pt-1">
                        {[46, 72, 58, 80, 40, 64].map((width, i) => (
                            <div
                                key={i}
                                className="h-3.5 animate-pulse rounded-full bg-white/8"
                                style={{ width: `${width}%`, animationDelay: `${i * 120}ms` }}
                            />
                        ))}
                    </div>
                ) : lyrics.length > 0 ? (
                    <>
                        {/* 顶部不留白：开头几句贴着框顶排（和主流播放器一致）。底部留白保证最后几句也能滚到焦点位置。 */}
                        {lyrics.map((line, i) => {
                            const active = i === activeIndex
                            return (
                                <p
                                    key={`${line.time}-${i}`}
                                    data-lyric-index={i}
                                    onClick={() => onSeek(line.time)}
                                    title="点击跳转到这一句"
                                    aria-current={active ? 'true' : undefined}
                                    // 行高固定：当前行只放大内部文字，不会把后面的行推走（避免整列重排）
                                    className="flex min-h-[42px] cursor-pointer select-none items-center text-left"
                                >
                                    {/*
                                      高亮不要用 transition：一旦页面不在前台渲染，过渡会卡在起始值上，
                                      看起来就像"根本没有高亮"。这里直接瞬时切换，任何情况下都立刻可见。
                                    */}
                                    <span
                                        className={`whitespace-pre-wrap leading-[1.75] tracking-[-0.01em] ${
                                            active
                                                ? 'text-[18px] font-medium text-white'
                                                : 'text-[15px] text-white/45 hover:text-white/75'
                                        }`}
                                    >
                                        {line.text}
                                    </span>
                                </p>
                            )
                        })}
                        <div ref={bottomPadRef} aria-hidden className="h-[26vh] md:h-32" />
                    </>
                ) : (
                    // 无歌词：小屏在本面板内居中；桌面端由外层在整个歌词区域居中（见 page.tsx）
                    <div
                        className="flex h-full flex-col items-center justify-center text-center md:hidden"
                        style={{ animation: 'wy-fade .3s ease-out' }}
                    >
                        <IconMusic className="h-7 w-7 text-white/20" />
                        <p className="mt-3 text-sm text-white/45">暂无歌词</p>
                        <p className="mt-1 text-xs text-white/25">纯音乐，或该歌曲暂未提供歌词</p>
                    </div>
                )}
            </div>
        </div>
    )
}
