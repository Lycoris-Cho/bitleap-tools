'use client'

import { useState } from 'react'
import { IconMusic, IconTrash } from './icons'
import { formatDurationMs } from '../utils'
import type { MusicResult, PlayMode } from '../types'

interface QueuePanelProps {
    songs: MusicResult[]
    currentIndex: number
    isPlaying: boolean
    mode: PlayMode
    onModeChange: (mode: PlayMode) => void
    onPick: (index: number) => void
    onRemove: (index: number) => void
    onClear: () => void
}

const MODES: { value: PlayMode; label: string }[] = [
    { value: 'list', label: '列表循环' },
    { value: 'single', label: '单曲循环' },
    { value: 'shuffle', label: '随机播放' },
]

function Thumb({ src, alt }: { src: string; alt: string }) {
    const [failed, setFailed] = useState(false)
    if (!src || failed) {
        return (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                <IconMusic className="h-4 w-4 text-white/30" />
            </span>
        )
    }
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            draggable={false}
            onError={() => setFailed(true)}
            className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-white/10"
        />
    )
}

/** 正在播放的三条律动柱，暂停时冻结 */
function Equalizer({ playing }: { playing: boolean }) {
    return (
        <span className="flex h-3.5 w-3.5 shrink-0 items-end justify-center gap-[2px]" aria-hidden="true">
            {[0, 1, 2].map((i) => (
                <span
                    key={i}
                    className="w-[2px] flex-1 rounded-full bg-[#ec4141]"
                    style={{
                        height: '40%',
                        animation: `wy-eq .9s ease-in-out ${i * 0.16}s infinite`,
                        animationPlayState: playing ? 'running' : 'paused',
                    }}
                />
            ))}
        </span>
    )
}

export default function QueuePanel({
    songs,
    currentIndex,
    isPlaying,
    mode,
    onModeChange,
    onPick,
    onRemove,
    onClear,
}: QueuePanelProps) {
    const [confirmingClear, setConfirmingClear] = useState(false)

    return (
        <>
            <div className="shrink-0 border-b border-white/8 px-5 py-3">
                <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
                    {MODES.map((item) => (
                        <button
                            key={item.value}
                            onClick={() => onModeChange(item.value)}
                            className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition ${
                                mode === item.value ? 'bg-[#ec4141] text-white shadow' : 'text-white/50 hover:text-white/80'
                            }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-3 py-3">
                {songs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <IconMusic className="h-9 w-9 text-white/15" />
                        <p className="mt-3 text-sm text-white/40">播放列表还是空的</p>
                        <p className="mt-1 text-xs text-white/25">搜索歌曲或点击「每日推荐」开始</p>
                    </div>
                ) : (
                    <ul className="space-y-1">
                        {songs.map((song, index) => {
                            const active = index === currentIndex
                            return (
                                <li
                                    key={`${song.id}-${index}`}
                                    // 逐行淡入，避免整列一次性闪出来
                                    style={{ animation: 'wy-rise .28s ease-out both', animationDelay: `${Math.min(index * 22, 240)}ms` }}
                                >
                                    <div
                                        className={`group flex items-center gap-3 rounded-xl px-2.5 py-2 transition-all duration-200 ${
                                            active ? 'bg-[#ec4141]/15 ring-1 ring-inset ring-[#ec4141]/35' : 'hover:translate-x-[2px] hover:bg-white/6'
                                        }`}
                                    >
                                        <button
                                            onClick={() => onPick(index)}
                                            className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                            aria-label={`播放 ${song.name}`}
                                        >
                                            <span className="relative">
                                                <Thumb src={song.cover} alt={song.name} />
                                                {active && (
                                                    <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/55">
                                                        <Equalizer playing={isPlaying} />
                                                    </span>
                                                )}
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className={`block truncate text-sm ${active ? 'font-semibold text-[#ff9a9a]' : 'text-white/90'}`}>
                                                    {song.name}
                                                </span>
                                                <span className="mt-0.5 block truncate text-[11px] text-white/40">
                                                    {song.artist}
                                                </span>
                                            </span>
                                        </button>

                                        <span className="shrink-0 font-mono text-[11px] text-white/30">
                                            {formatDurationMs(song.duration)}
                                        </span>
                                        <button
                                            onClick={() => onRemove(index)}
                                            aria-label={`从列表移除 ${song.name}`}
                                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/25 opacity-0 transition hover:bg-white/10 hover:text-red-300 focus-visible:opacity-100 group-hover:opacity-100"
                                        >
                                            <IconTrash className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </div>

            {songs.length > 0 && (
                <div className="shrink-0 border-t border-white/8 px-5 py-3">
                    {confirmingClear ? (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    onClear()
                                    setConfirmingClear(false)
                                }}
                                className="flex-1 rounded-xl bg-red-500/85 px-3 py-2 text-xs font-medium text-white transition hover:bg-red-500"
                            >
                                确认清空 {songs.length} 首
                            </button>
                            <button
                                onClick={() => setConfirmingClear(false)}
                                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60 transition hover:bg-white/10"
                            >
                                取消
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setConfirmingClear(true)}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/50 transition hover:bg-white/10 hover:text-white/80"
                        >
                            清空播放列表
                        </button>
                    )}
                </div>
            )}
        </>
    )
}
