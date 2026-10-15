'use client'

/*
 * 曲目列表 —— 歌单详情 / 艺人热门单曲 / 专辑曲目共用。
 *
 * 抽出来的理由很实际：这三处的行长得一模一样（序号、封面、歌名、歌手·专辑、时长、
 * 正在播的那首高亮），而"哪首在播"的判断、点击选曲的时机、懒加载封面的写法都要一致。
 * 三份各写一遍的结果必然是三个地方慢慢长得不一样。
 */

import type { PlaylistTrack } from '../types'
import { formatDurationMs } from '../utils'
import { IconPlay } from './icons'

interface TrackListProps {
    tracks: PlaylistTrack[]
    /** 正在播的那首的 id：给它红字 + 红点 */
    currentTrackId?: string | null
    /** 点某一首：下标是**本列表内**的下标（调用方自己换算到队列里） */
    onPick: (index: number) => void
    /** 序号从几开始数（歌单分页加载后接着数） */
    startIndex?: number
}

export default function TrackList({ tracks, currentTrackId, onPick, startIndex = 0 }: TrackListProps) {
    return (
        <ul className="space-y-0.5">
            {tracks.map((track, index) => {
                const active = Boolean(currentTrackId) && currentTrackId === track.id
                const order = startIndex + index + 1
                return (
                    <li key={`${track.id}-${index}`}>
                        <button
                            type="button"
                            onClick={() => onPick(index)}
                            title={`${track.name} - ${track.artist}`}
                            className={`group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-all duration-200 ${
                                active
                                    ? 'bg-[#ec4141]/15 ring-1 ring-inset ring-[#ec4141]/35'
                                    : 'hover:translate-x-[2px] hover:bg-white/[0.06]'
                            }`}
                        >
                            {/* 序号位：悬浮时换成播放图标 */}
                            <span className="relative flex w-6 shrink-0 items-center justify-center">
                                <span className={`font-mono text-[11px] group-hover:opacity-0 ${active ? 'text-[#ff9d9d]' : 'text-white/25'}`}>
                                    {String(order).padStart(2, '0')}
                                </span>
                                <IconPlay className="absolute h-3 w-3 text-white/80 opacity-0 transition group-hover:opacity-100" />
                            </span>

                            {track.cover ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={track.cover}
                                    alt=""
                                    loading="lazy"
                                    decoding="async"
                                    className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-white/10"
                                />
                            ) : (
                                <span className="h-9 w-9 shrink-0 rounded-lg bg-white/[0.06] ring-1 ring-white/10" />
                            )}

                            <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-2">
                                    {active && (
                                        <span
                                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#ec4141]"
                                            style={{ animation: 'wy-pulse 1.6s ease-in-out infinite' }}
                                        />
                                    )}
                                    <span className={`truncate text-[13px] ${active ? 'font-semibold text-[#ff9a9a]' : 'text-white/85'}`}>
                                        {track.name}
                                    </span>
                                </span>
                                <span className="mt-0.5 block truncate text-[11px] text-white/35">
                                    {track.artist}
                                    {track.album ? ` · ${track.album}` : ''}
                                </span>
                            </span>

                            <span className="shrink-0 font-mono text-[11px] text-white/30">{formatDurationMs(track.duration)}</span>
                        </button>
                    </li>
                )
            })}
        </ul>
    )
}
