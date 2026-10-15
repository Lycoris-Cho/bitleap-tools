'use client'

/*
 * 歌词同步校准控件 —— 舞台上那个「同步 ±Xms」。
 *
 * 为什么要有它：播放时钟（lyrics/clock.ts）已经把 <audio>.currentTime 的台阶抹平了，
 * 剩下唯一修不掉的误差是**输出延迟**（蓝牙耳机 150~300ms、外接声卡几十毫秒）。
 * 浏览器不告诉页面这个数，只能让耳朵定。少数歌的逐字时间轴本身就偏，也靠它补。
 *
 * 于是这个控件要解决三件事：
 *   ① 调得准 —— 20ms 一档的按钮负责"一下一下拧"，长按会加速，滑条负责"一次跳到附近"；
 *   ② 随时能调 —— 以前这组按钮在手机上被 `hidden sm:flex` 藏掉了，而蓝牙延迟恰恰主要在手机上，
 *      现在换成收起来的面板：小屏也放得下，还不占底栏；
 *   ③ 记得住 —— 具体值由页面按"设备默认 + 本曲单独记住"管理（见 page.tsx），
 *      这里只负责显示它，并给出"清除本曲校准"的入口。
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
    LYRIC_OFFSET_LIMIT,
    LYRIC_OFFSET_NUDGE,
    clampLyricOffset,
    describeLyricOffset,
    formatLyricOffset,
    stepLyricOffset,
} from '../lyrics/offset'
import { IconClose, IconSync } from './icons'

interface SyncControlProps {
    /** 当前偏移（秒），正数 = 歌词提前 */
    offset: number
    onChange: (offset: number) => void
    /** 本曲是否已单独记住过一个偏移值 */
    songTuned?: boolean
    /** 清除"只属于这首歌"的记录，回到全局默认 */
    onClearSongTune?: () => void
    onOpenChange?: (open: boolean) => void
}

/** 长按连发：先等这么久，再按下面的节奏连走 */
const HOLD_DELAY = 420
const HOLD_INTERVAL = 90

export default function SyncControl({ offset, onChange, songTuned, onClearSongTune, onOpenChange }: SyncControlProps) {
    const [open, setOpen] = useState(false)
    const [dragging, setDragging] = useState(false)

    const rootRef = useRef<HTMLDivElement>(null)
    const trackRef = useRef<HTMLDivElement>(null)
    /** 长按连发 / 连续拖动要读实时值：回调里不能拿渲染那一刻的闭包 */
    const offsetRef = useRef(offset)
    const openChangeRef = useRef(onOpenChange)
    const holdRef = useRef<{
        timer: ReturnType<typeof setTimeout> | null
        interval: ReturnType<typeof setInterval> | null
        ticks: number
    }>({ timer: null, interval: null, ticks: 0 })

    useEffect(() => {
        offsetRef.current = offset
    }, [offset])
    useEffect(() => {
        openChangeRef.current = onOpenChange
    })

    const stopHold = useCallback(() => {
        const hold = holdRef.current
        if (hold.timer) clearTimeout(hold.timer)
        if (hold.interval) clearInterval(hold.interval)
        hold.timer = null
        hold.interval = null
        hold.ticks = 0
    }, [])

    useEffect(() => {
        openChangeRef.current?.(open)
        if (!open) stopHold()
    }, [open, stopHold])

    /* 抬手就停：指针在按钮外面松开也要停住，否则连发会一直跑 */
    useEffect(() => {
        window.addEventListener('pointerup', stopHold)
        window.addEventListener('pointercancel', stopHold)
        window.addEventListener('blur', stopHold)
        return () => {
            window.removeEventListener('pointerup', stopHold)
            window.removeEventListener('pointercancel', stopHold)
            window.removeEventListener('blur', stopHold)
        }
    }, [stopHold])

    /* 关掉：点面板外面、按 Esc。Esc 在舞台那边会被这个开关拦下来（见 onOpenChange） */
    useEffect(() => {
        if (!open) return
        const onPointerDown = (event: PointerEvent) => {
            const target = event.target as Node | null
            if (target && rootRef.current?.contains(target)) return
            setOpen(false)
        }
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return
            // 面板开着时这一次 Esc 只关面板：舞台那边也会读到"面板开着"而放它过去（见 LyricsStage）
            event.stopPropagation()
            setOpen(false)
        }
        document.addEventListener('pointerdown', onPointerDown)
        window.addEventListener('keydown', onKeyDown, true)
        return () => {
            document.removeEventListener('pointerdown', onPointerDown)
            window.removeEventListener('keydown', onKeyDown, true)
        }
    }, [open])

    /** 拖动中：指针松开在轨道外面时也要停下（指针捕获只管轨道自己的事件） */
    useEffect(() => {
        if (!dragging) return
        const stop = () => setDragging(false)
        window.addEventListener('pointerup', stop)
        window.addEventListener('pointercancel', stop)
        return () => {
            window.removeEventListener('pointerup', stop)
            window.removeEventListener('pointercancel', stop)
        }
    }, [dragging])

    useEffect(() => () => stopHold(), [stopHold])

    const nudge = useCallback(
        (direction: 1 | -1, step = LYRIC_OFFSET_NUDGE) => {
            onChange(stepLyricOffset(offsetRef.current, direction * step))
        },
        [onChange]
    )

    /*
     * 指针按下就走长按连发，键盘（Enter / 空格）走 click —— 同一次操作只该生效一次，
     * 所以 pointerdown 记一个时间戳，紧跟着的那次 click 拿它判断"这一步已经走过了"。
     * 用时间戳而不是标志位：手指按下后移开、click 根本没触发时，标志位会一直卡着，
     * 下一次键盘操作就被吃掉一次。
     */
    const lastPointerNudgeRef = useRef(0)

    /* 长按连发：按住越久步子越大 —— 前几档细调，后面快速拉到位 */
    const startHold = (direction: 1 | -1) => {
        stopHold()
        nudge(direction)
        const hold = holdRef.current
        hold.timer = setTimeout(() => {
            hold.interval = setInterval(() => {
                hold.ticks += 1
                const step = hold.ticks < 8 ? LYRIC_OFFSET_NUDGE : hold.ticks < 20 ? 0.05 : hold.ticks < 40 ? 0.1 : 0.2
                nudge(direction, step)
            }, HOLD_INTERVAL)
        }, HOLD_DELAY)
    }

    const valueFromClientX = (clientX: number) => {
        const track = trackRef.current
        if (!track) return offsetRef.current
        const rect = track.getBoundingClientRect()
        const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / Math.max(1, rect.width)))
        return clampLyricOffset((ratio * 2 - 1) * LYRIC_OFFSET_LIMIT)
    }

    const pct = ((clampLyricOffset(offset) / LYRIC_OFFSET_LIMIT + 1) / 2) * 100
    const tuned = offset !== 0

    return (
        <div ref={rootRef} className="relative shrink-0">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                aria-label={`歌词同步校准，当前${describeLyricOffset(offset)}`}
                title="歌词同步校准（蓝牙耳机的延迟在这里补）"
                className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 transition ${
                    open
                        ? 'border-white/25 bg-white/18 text-white'
                        : tuned
                          ? 'border-[#ec4141]/45 bg-[#ec4141]/15 text-white hover:bg-[#ec4141]/25'
                          : 'border-white/12 bg-white/[0.08] text-white/70 hover:bg-white/15 hover:text-white'
                }`}
            >
                <IconSync className="h-3.5 w-3.5" />
                <span className="hidden text-[11px] text-white/60 sm:inline">同步</span>
                <span className={`font-mono text-[11px] ${tuned ? 'text-[#ffb3b3]' : 'text-white/70'}`}>
                    {formatLyricOffset(offset)}
                </span>
            </button>

            {open && (
                <div
                    role="dialog"
                    aria-label="歌词同步校准"
                    className="absolute bottom-full right-0 z-30 mb-3 w-[19rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-white/12 bg-[#121215]/95 p-4 shadow-[0_24px_60px_-24px_rgba(0,0,0,.9)] backdrop-blur-xl"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-[13px] font-medium text-white/90">歌词同步校准</p>
                            <p className="mt-1 font-mono text-[11px] text-white/45">{describeLyricOffset(offset)}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            aria-label="收起校准面板"
                            className="flex h-6 w-6 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
                        >
                            <IconClose className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    {/* 双极滑条：中点是 0，往右 = 歌词提前 */}
                    <div className="mt-3 flex items-center gap-2">
                        <span className="w-8 shrink-0 text-right font-mono text-[10px] text-white/35">延后</span>
                        <div
                            ref={trackRef}
                            role="slider"
                            tabIndex={0}
                            aria-label="歌词同步偏移"
                            aria-valuemin={-LYRIC_OFFSET_LIMIT * 1000}
                            aria-valuemax={LYRIC_OFFSET_LIMIT * 1000}
                            aria-valuenow={Math.round(offset * 1000)}
                            aria-valuetext={describeLyricOffset(offset)}
                            onPointerDown={(event) => {
                                event.currentTarget.setPointerCapture(event.pointerId)
                                setDragging(true)
                                onChange(valueFromClientX(event.clientX))
                            }}
                            onPointerMove={(event) => {
                                if (dragging) onChange(valueFromClientX(event.clientX))
                            }}
                            onKeyDown={(event) => {
                                if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
                                    event.preventDefault()
                                    nudge(-1)
                                } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
                                    event.preventDefault()
                                    nudge(1)
                                } else if (event.key === 'Home') {
                                    event.preventDefault()
                                    onChange(-LYRIC_OFFSET_LIMIT)
                                } else if (event.key === 'End') {
                                    event.preventDefault()
                                    onChange(LYRIC_OFFSET_LIMIT)
                                }
                            }}
                            className="group relative h-6 flex-1 cursor-pointer touch-none select-none outline-none"
                        >
                            <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/15" />
                            <div
                                className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/75"
                                style={{ left: `${Math.min(50, pct)}%`, right: `${Math.max(50, pct)}%` }}
                            />
                            <div className="absolute left-1/2 top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-white/40" />
                            <div
                                className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,.5)] ${
                                    dragging ? 'scale-110' : ''
                                }`}
                                style={{ left: `${pct}%` }}
                            />
                        </div>
                        <span className="w-8 shrink-0 font-mono text-[10px] text-white/35">提前</span>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                        <button
                            type="button"
                            onPointerDown={() => {
                                lastPointerNudgeRef.current = Date.now()
                                startHold(-1)
                            }}
                            onClick={() => {
                                if (Date.now() - lastPointerNudgeRef.current < 600) return
                                nudge(-1)
                            }}
                            aria-label="歌词延后 20 毫秒，按住加速"
                            className="flex h-9 flex-1 items-center justify-center gap-1 rounded-xl border border-white/12 bg-white/[0.06] text-[12px] text-white/80 transition hover:bg-white/14 hover:text-white active:scale-[0.98]"
                        >
                            − 延后
                        </button>
                        <button
                            type="button"
                            onClick={() => onChange(0)}
                            disabled={!tuned}
                            aria-label="偏移归零"
                            className="h-9 shrink-0 rounded-xl px-3 text-[12px] text-white/55 transition hover:bg-white/10 hover:text-white disabled:opacity-35 disabled:hover:bg-transparent"
                        >
                            归零
                        </button>
                        <button
                            type="button"
                            onPointerDown={() => {
                                lastPointerNudgeRef.current = Date.now()
                                startHold(1)
                            }}
                            onClick={() => {
                                if (Date.now() - lastPointerNudgeRef.current < 600) return
                                nudge(1)
                            }}
                            aria-label="歌词提前 20 毫秒，按住加速"
                            className="flex h-9 flex-1 items-center justify-center gap-1 rounded-xl border border-white/12 bg-white/[0.06] text-[12px] text-white/80 transition hover:bg-white/14 hover:text-white active:scale-[0.98]"
                        >
                            提前 +
                        </button>
                    </div>

                    <p className="mt-3 text-[11px] leading-relaxed text-white/40">
                        词比声音慢 → 点「提前」；词比声音快 → 点「延后」。按住不放可以快拉，舞台里也能用{' '}
                        <kbd className="rounded bg-white/10 px-1 font-mono text-[10px] text-white/60">[</kbd>{' '}
                        <kbd className="rounded bg-white/10 px-1 font-mono text-[10px] text-white/60">]</kbd> 微调。
                    </p>

                    {songTuned && onClearSongTune && (
                        <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                            <span className="text-[11px] text-white/40">本曲单独记住过一次</span>
                            <button
                                type="button"
                                onClick={onClearSongTune}
                                className="shrink-0 rounded-lg border border-white/12 px-2 py-1 text-[11px] text-white/70 transition hover:bg-white/10 hover:text-white"
                            >
                                清除本曲校准
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
