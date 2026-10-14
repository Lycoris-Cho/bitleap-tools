'use client'

/*
 * 全屏歌词舞台 —— 用 Folia（AGPL-3.0）classic「流光」模式的行为重放逐词动画。
 *
 * 见 ./lyrics 下的实现：
 *   parse.ts        —— 逐词歌词解析（YRC 优先，LRC 摊开兜底）与布局分词
 *   timing.ts       —— 每行的时长分档与逐词时刻
 *   GlowWord.tsx    —— 单个词的 waiting / active / passed 三态动画
 *   ClassicLyrics.tsx —— 整句在场、换句运镜、按时刻逐词点亮
 *
 * 这里只做三件事：
 *   ① 把播放进度灌进一个 MotionValue（逐词动画是"订阅时间"，不是"每帧重渲染"）；
 *   ② 由进度推出"当前唱到第几行"，换行时才重渲染；
 *   ③ 舞台外框：底色、歌名、进度条与控制按钮。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMotionValue } from 'framer-motion'
import type { StageLine } from '../lyrics/types'
import { buildStageTheme } from '../lyrics/theme'
import ClassicLyrics from '../lyrics/ClassicLyrics'
import { formatTime } from '../utils'
import { IconClose, IconNext, IconPause, IconPlay, IconPrev } from './icons'

type Props = {
    /** 逐词歌词（含间奏占位行），已按行排好序 */
    lines: StageLine[]
    playing: boolean
    getTime: () => number
    colors: [string, string] | null
    songName: string
    artist: string
    duration: number
    onSeek: (time: number) => void
    onToggle: () => void
    onPrev: () => void
    onNext: () => void
    onClose: () => void
}

/** 二分：最后一个 startTime <= t 的行下标，没有则 -1 */
function findLineIndex(lines: StageLine[], time: number) {
    let left = 0
    let right = lines.length - 1
    let answer = -1
    while (left <= right) {
        const mid = (left + right) >> 1
        if (lines[mid].startTime <= time) {
            answer = mid
            left = mid + 1
        } else {
            right = mid - 1
        }
    }
    return answer
}

/** 揭示范畴结束后到下一行开始之间的空档，让 activeLine 落空（交给字幕层的"上一句"兜底） */
function resolveActiveIndex(lines: StageLine[], time: number) {
    const index = findLineIndex(lines, time)
    if (index < 0) return -1
    const line = lines[index]
    const renderEnd = line.renderHints?.renderEndTime ?? line.endTime
    return time > renderEnd ? -1 : index
}

function IconExpand({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={className}>
            <path d="M4 9V4h5M20 15v5h-5M15 4h5v5M9 20H4v-5" />
        </svg>
    )
}

const EMPTY_LINES: StageLine[] = []

export default function LyricsStage({
    lines = EMPTY_LINES,
    playing,
    getTime,
    colors,
    songName,
    artist,
    duration,
    onSeek,
    onToggle,
    onPrev,
    onNext,
    onClose,
}: Props) {
    const rootRef = useRef<HTMLDivElement>(null)
    const seekRef = useRef<HTMLDivElement>(null)
    const draggingRef = useRef(false)
    const getTimeRef = useRef(getTime)
    const playingRef = useRef(playing)

    const currentTime = useMotionValue(0)
    const [activeIndex, setActiveIndex] = useState(-1)
    const [chrome, setChrome] = useState(true)
    const [pos, setPos] = useState(0)
    const [isFs, setIsFs] = useState(false)

    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        getTimeRef.current = getTime
        playingRef.current = playing
    })

    const theme = useMemo(() => buildStageTheme({ coverColors: colors }), [colors])
    const hasLyrics = lines.length > 0

    /* 时间轴：把进度写进 MotionValue；换行才 setState。
       逐词动画订阅的是 MotionValue，所以这里不需要 60fps 的 React 渲染。
       两条驱动并存：rAF 跟帧对齐、够顺；interval 兜底 —— 浏览器暂停 rAF 的情形不止"页面被隐藏"
       （被遮挡、面板没在合成时 rAF 也会停），只按 document.hidden 判断会在那种情况下整条时间轴冻住，
       所以这条定时器无条件跑，两条同时写同一个 MotionValue 是幂等的。 */
    useEffect(() => {
        let lastIndex = Number.NaN
        const tick = () => {
            const t = getTimeRef.current()
            currentTime.set(t)
            const index = resolveActiveIndex(lines, t)
            if (index !== lastIndex) {
                lastIndex = index
                setActiveIndex(index)
            }
        }
        let raf = 0
        const frame = () => {
            raf = requestAnimationFrame(frame)
            tick()
        }
        raf = requestAnimationFrame(frame)
        const timer = setInterval(tick, 50)
        return () => {
            cancelAnimationFrame(raf)
            clearInterval(timer)
        }
    }, [lines, currentTime])

    /* 进度条用的粗粒度时钟 */
    useEffect(() => {
        const tick = () => {
            if (!draggingRef.current) setPos(getTimeRef.current())
        }
        tick()
        const timer = setInterval(tick, 200)
        return () => clearInterval(timer)
    }, [])

    useEffect(() => () => {
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }, [])

    /* 打开时锁页面滚动；Esc 退出 */
    useEffect(() => {
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
                else onClose()
            }
        }
        const onFs = () => setIsFs(Boolean(document.fullscreenElement))
        window.addEventListener('keydown', onKey)
        document.addEventListener('fullscreenchange', onFs)
        return () => {
            document.body.style.overflow = prev
            window.removeEventListener('keydown', onKey)
            document.removeEventListener('fullscreenchange', onFs)
        }
    }, [onClose])

    const armHide = useCallback(() => {
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
        hideTimerRef.current = setTimeout(() => setChrome(false), 3500)
    }, [])
    const wake = useCallback(() => {
        setChrome(true)
        armHide()
    }, [armHide])

    useEffect(() => {
        if (!playing) return
        armHide()
        return () => {
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
        }
    }, [playing, armHide])

    const toggleFullscreen = () => {
        const el = rootRef.current
        if (!el) return
        if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
        else void el.requestFullscreen?.().catch(() => {})
    }

    const seekFromEvent = (clientX: number) => {
        const el = seekRef.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)))
        const target = ratio * (duration || 0)
        setPos(target)
        onSeek(target)
    }

    const progress = duration > 0 ? Math.max(0, Math.min(1, pos / duration)) : 0
    const chromeVisible = chrome || !playing

    return (
        <div
            ref={rootRef}
            onMouseMove={wake}
            onTouchStart={wake}
            data-line={activeIndex}
            className="fixed inset-0 z-[70] select-none overflow-hidden"
            style={{ background: theme.backgroundColor, animation: 'fls-in .5s ease-out' }}
            role="dialog"
            aria-label="全屏歌词"
        >
            <style>{'@keyframes fls-in { from { opacity: 0 } to { opacity: 1 } }'}</style>

            {/* 歌词本体：整句在场，按时刻逐词点亮 */}
            {hasLyrics && (
                <ClassicLyrics lines={lines} currentLineIndex={activeIndex} currentTime={currentTime} theme={theme} />
            )}

            {/* 无歌词：纯音乐或该曲暂无歌词 */}
            {!hasLyrics && (
                <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
                    <p className="text-[13px]" style={{ color: 'rgba(255,255,255,.4)' }}>
                        纯音乐，或该歌曲暂未提供歌词
                    </p>
                </div>
            )}

            {/* 左上角常驻：歌名 / 歌手 */}
            <div className="absolute left-5 top-5 z-20 max-w-[52vw] sm:left-7 sm:top-6">
                <h2 className="truncate text-[15px] font-semibold text-white/95 sm:text-[17px]">{songName}</h2>
                <p className="mt-1 truncate text-[12px] text-white/50">{artist}</p>
            </div>

            {/* 右上角按钮：跟着 chrome 一起淡出 */}
            <div
                className={`absolute right-5 top-5 z-20 flex shrink-0 items-center gap-2 transition-opacity duration-500 sm:right-7 sm:top-6 ${
                    chromeVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
            >
                <button
                    type="button"
                    onClick={toggleFullscreen}
                    aria-label={isFs ? '退出全屏' : '进入全屏'}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/80 backdrop-blur transition hover:bg-white/20 hover:text-white"
                >
                    <IconExpand className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    onClick={() => {
                        if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
                        onClose()
                    }}
                    aria-label="关闭歌词"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/80 backdrop-blur transition hover:bg-white/20 hover:text-white"
                >
                    <IconClose className="h-4 w-4" />
                </button>
            </div>

            {/* 底栏 */}
            <div
                className={`absolute inset-x-0 bottom-0 z-20 px-4 pt-10 transition-opacity duration-500 sm:px-7 ${
                    chromeVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
                style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}
            >
                <div
                    ref={seekRef}
                    onPointerDown={(e) => {
                        draggingRef.current = true
                        e.currentTarget.setPointerCapture(e.pointerId)
                        seekFromEvent(e.clientX)
                    }}
                    onPointerMove={(e) => {
                        if (draggingRef.current) seekFromEvent(e.clientX)
                    }}
                    onPointerUp={(e) => {
                        draggingRef.current = false
                        e.currentTarget.releasePointerCapture(e.pointerId)
                    }}
                    className="group flex h-8 cursor-pointer items-center sm:h-5"
                    role="slider"
                    aria-label="播放进度"
                    aria-valuemin={0}
                    aria-valuemax={Math.round(duration)}
                    aria-valuenow={Math.round(pos)}
                >
                    <div className="relative h-1 w-full rounded-full bg-white/20">
                        <div className="absolute inset-y-0 left-0 rounded-full bg-white/85" style={{ width: `${progress * 100}%` }} />
                        <div
                            className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-white opacity-0 transition group-hover:opacity-100"
                            style={{ left: `calc(${progress * 100}% - 5px)` }}
                        />
                    </div>
                </div>

                <div className="mt-3 flex items-center gap-3">
                    <span className="w-11 shrink-0 font-mono text-[11px] text-white/75">{formatTime(pos)}</span>

                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={onPrev}
                            aria-label="上一首"
                            className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
                        >
                            <IconPrev className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={onToggle}
                            aria-label={playing ? '暂停' : '播放'}
                            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black transition hover:scale-105"
                        >
                            {playing ? <IconPause className="h-5 w-5" /> : <IconPlay className="ml-0.5 h-5 w-5" />}
                        </button>
                        <button
                            type="button"
                            onClick={onNext}
                            aria-label="下一首"
                            className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
                        >
                            <IconNext className="h-4 w-4" />
                        </button>
                    </div>

                    <span className="ml-auto w-11 shrink-0 text-right font-mono text-[11px] text-white/75">
                        {formatTime(duration || 0)}
                    </span>
                </div>
            </div>
        </div>
    )
}
