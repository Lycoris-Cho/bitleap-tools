'use client'

import { useRef, useState } from 'react'

interface SliderProps {
    value: number
    max: number
    /** 已缓冲长度，单位与 value 一致 */
    buffered?: number
    ariaLabel: string
    /** 悬浮/拖动气泡文案 */
    format?: (value: number) => string
    onScrub: (value: number) => void
    onScrubEnd?: (value: number) => void
    accent?: string
    className?: string
}

/**
 * 进度 / 音量通用滑条：支持点击、拖动（指针捕获）、键盘方向键微调
 */
export default function Slider({
    value,
    max,
    buffered,
    ariaLabel,
    format,
    onScrub,
    onScrubEnd,
    accent = '#ec4141',
    className = '',
}: SliderProps) {
    const trackRef = useRef<HTMLDivElement>(null)
    const [dragging, setDragging] = useState(false)
    const [hoverRatio, setHoverRatio] = useState<number | null>(null)

    const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
    const bufferRatio = max > 0 && buffered ? Math.min(1, Math.max(0, buffered / max)) : 0

    const valueFromClientX = (clientX: number) => {
        const track = trackRef.current
        if (!track || max <= 0) return 0
        const rect = track.getBoundingClientRect()
        return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * max
    }

    const ratioFromClientX = (clientX: number) => {
        const track = trackRef.current
        if (!track) return 0
        const rect = track.getBoundingClientRect()
        return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    }

    return (
        <div className={`group relative flex items-center ${className}`}>
            {hoverRatio !== null && format && (
                <div
                    className="pointer-events-none absolute -top-7 z-20 -translate-x-1/2 rounded-md border border-white/15 bg-black/85 px-1.5 py-0.5 font-mono text-[10px] text-white/90 backdrop-blur"
                    style={{ left: `${hoverRatio * 100}%` }}
                >
                    {format(hoverRatio * max)}
                </div>
            )}

            <div
                ref={trackRef}
                role="slider"
                tabIndex={0}
                aria-label={ariaLabel}
                aria-valuemin={0}
                aria-valuemax={Math.round(max)}
                aria-valuenow={Math.round(value)}
                className="relative flex h-5 w-full cursor-pointer touch-none items-center outline-none"
                onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId)
                    setDragging(true)
                    onScrub(valueFromClientX(e.clientX))
                }}
                onPointerMove={(e) => {
                    setHoverRatio(ratioFromClientX(e.clientX))
                    if (dragging) onScrub(valueFromClientX(e.clientX))
                }}
                onPointerUp={(e) => {
                    if (!dragging) return
                    e.currentTarget.releasePointerCapture(e.pointerId)
                    setDragging(false)
                    onScrubEnd?.(valueFromClientX(e.clientX))
                }}
                onPointerCancel={() => setDragging(false)}
                onPointerLeave={() => setHoverRatio(null)}
                onKeyDown={(e) => {
                    if (max <= 0) return
                    const step = max / 20
                    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                        e.preventDefault()
                        onScrub(Math.min(max, value + step))
                    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                        e.preventDefault()
                        onScrub(Math.max(0, value - step))
                    }
                }}
            >
                <div
                    className={`relative w-full overflow-hidden rounded-full bg-white/12 transition-all duration-200 ${
                        dragging ? 'h-2' : 'h-1.5 group-hover:h-2'
                    }`}
                >
                    {bufferRatio > 0 && (
                        <div className="absolute inset-y-0 left-0 bg-white/18" style={{ width: `${bufferRatio * 100}%` }} />
                    )}
                    <div
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{ width: `${ratio * 100}%`, background: `linear-gradient(90deg, ${accent}b0, ${accent})` }}
                    />
                </div>

                <div
                    className={`pointer-events-none absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,.5)] transition-all ${
                        dragging ? 'scale-110 opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                    style={{ left: `calc(${ratio * 100}% - 6px)` }}
                />
            </div>
        </div>
    )
}
