'use client'

import { useEffect, useRef, useState } from 'react'
import { IconMusic, IconSearch, IconSpinner } from './icons'
import { formatDurationMs, getCachedCover, requestCover } from '../utils'
import type { SearchSong } from '../types'

interface SearchPanelProps {
    query: string
    onQueryChange: (value: string) => void
    onSearch: () => void
    loading: boolean
    error: string
    results: SearchSong[]
    total: number
    resolvingId: string | null
    currentSongId: string | null
    onPick: (song: SearchSong) => void
}

/**
 * 搜索结果里的封面：上游搜索接口不带封面地址，
 * 所以按 id 单独取（并发与缓存都在 utils 里控制）。
 *
 * 取图时机：首屏若干行直接取，其余等滚到可见范围再取。
 * 不能只依赖 IntersectionObserver —— 页面不在前台渲染时它不会回调，
 * 那样封面就永远不会出现。
 */
const EAGER_ROWS = 12

function RowCover({ id, index }: { id: string; index: number }) {
    const [cover, setCover] = useState<string | undefined>(() => getCachedCover(id))
    const [loaded, setLoaded] = useState(false)
    const holderRef = useRef<HTMLSpanElement>(null)

    useEffect(() => {
        if (cover !== undefined) return
        const el = holderRef.current

        const load = () => {
            void requestCover(id).then((url) => setCover(url ?? ''))
        }

        if (index < EAGER_ROWS || !el) {
            load()
            return
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries.some((entry) => entry.isIntersecting)) return
                observer.disconnect()
                load()
            },
            { rootMargin: '160px' }
        )
        observer.observe(el)
        return () => observer.disconnect()
    }, [id, index, cover])

    return (
        <span
            ref={holderRef}
            className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white/[0.06] ring-1 ring-inset ring-white/[0.08]"
        >
            {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={cover}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    onLoad={() => setLoaded(true)}
                    className={`h-full w-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                />
            ) : (
                <IconMusic className="h-4 w-4 text-white/20" />
            )}
        </span>
    )
}

export default function SearchPanel({
    query,
    onQueryChange,
    onSearch,
    loading,
    error,
    results,
    total,
    resolvingId,
    currentSongId,
    onPick,
}: SearchPanelProps) {
    return (
        <>
            <div className="shrink-0 border-b border-white/8 px-5 py-3">
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                        <input
                            value={query}
                            onChange={(e) => onQueryChange(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                            placeholder="搜索歌曲 / 歌手 / 专辑"
                            autoFocus
                            className="w-full rounded-xl border border-white/10 bg-white/6 py-2.5 pl-9 pr-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-[#ec4141]/60 focus:bg-white/8"
                        />
                    </div>
                    <button
                        onClick={onSearch}
                        disabled={loading || !query.trim()}
                        className="shrink-0 rounded-xl bg-[#ec4141] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#d73535] active:scale-[.97] disabled:opacity-40"
                    >
                        搜索
                    </button>
                </div>
                {!loading && results.length > 0 && (
                    <p className="mt-2 text-[11px] text-white/35">
                        匹配 {total} 首，展示前 {results.length} 首
                    </p>
                )}
            </div>

            <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-3 py-3">
                {loading ? (
                    <div className="space-y-2">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3 rounded-xl bg-white/4 px-3 py-2.5">
                                <div className="h-9 w-9 shrink-0 animate-pulse rounded-md bg-white/8" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 animate-pulse rounded-full bg-white/8" style={{ width: `${45 + ((i * 11) % 40)}%` }} />
                                    <div className="h-2.5 w-1/3 animate-pulse rounded-full bg-white/6" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-3 text-xs text-red-200">{error}</p>
                ) : results.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <IconMusic className="h-9 w-9 text-white/15" />
                        <p className="mt-3 text-sm text-white/40">输入关键词开始搜索</p>
                        <p className="mt-1 text-xs text-white/25">例如：周杰伦、海阔天空、范特西</p>
                    </div>
                ) : (
                    <ul className="space-y-1">
                        {results.map((song, index) => {
                            const active = song.id === currentSongId
                            const resolving = resolvingId === song.id
                            return (
                                <li
                                    key={`${song.id}-${index}`}
                                    // 逐行淡入，避免一次性"啪"地出现
                                    style={{ animation: 'wy-rise .28s ease-out both', animationDelay: `${Math.min(index * 22, 260)}ms` }}
                                >
                                    <button
                                        onClick={() => onPick(song)}
                                        disabled={resolvingId !== null}
                                        className={`group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-all duration-200 disabled:opacity-60 ${
                                            active
                                                ? 'bg-[#ec4141]/15 ring-1 ring-inset ring-[#ec4141]/35'
                                                : 'hover:bg-white/6 hover:translate-x-[2px]'
                                        }`}
                                    >
                                        <span className="relative">
                                            <RowCover id={song.id} index={index} />
                                            {resolving && (
                                                <span className="absolute inset-0 flex items-center justify-center rounded-md bg-black/60">
                                                    <IconSpinner className="h-3.5 w-3.5 text-[#ec4141]" />
                                                </span>
                                            )}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className={`block truncate text-sm ${active ? 'font-semibold text-[#ff9a9a]' : 'text-white/90'}`}>
                                                {song.name}
                                            </span>
                                            <span className="mt-0.5 block truncate text-[11px] text-white/40">
                                                {song.artist}
                                                {song.album ? ` · ${song.album}` : ''}
                                            </span>
                                        </span>
                                        <span className="shrink-0 font-mono text-[11px] text-white/30">
                                            {formatDurationMs(song.duration)}
                                        </span>
                                    </button>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </div>
        </>
    )
}
