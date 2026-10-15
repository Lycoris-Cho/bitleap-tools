'use client'

/*
 * 歌单详情 —— 主区里的第二屏：头部（封面/名称/简介/操作）+ 曲目列表。
 *
 * 曲目是**分页**来的：歌单上千首也有，一次全拿上游会限流、URL 也会长到离谱，
 * 所以默认先要 100 首，滚到底再要下一页，按钮显示"已加载 100/125"。
 *
 * 播放入口有三条，都归到 page.tsx 的两个动作上：
 *   「播放全部」→ onPlayAll(tracks)      替换队列并从第一首开始
 *   点某一行     → onPlayAll(tracks, i)   替换队列并从这一首开始（和网易云一致）
 *   「加入队列」→ onAppend(tracks)        追加到现有队列末尾
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PlaylistHeader, PlaylistTrack } from '../types'
import { formatPlayCount, NETEASE_PLAYLIST_URL, PLAYLIST_TRACKS_PAGE_SIZE } from '../utils'
import { IconAlert, IconArrowLeft, IconExternal, IconPlay, IconPlus, IconRetry, IconSpinner } from './icons'
import TrackList from './TrackList'

interface PlaylistDetailProps {
    playlistId: string
    /** 从「卡片上的悬浮播放钮」进来时为 true：第一页加载完就自动开播 */
    autoPlay?: boolean
    /** 正在解析直链（播放前必须先拿到直链）：按钮上给一个"准备中" */
    busy?: boolean
    onBack: () => void
    onPlayAll: (tracks: PlaylistTrack[], index?: number) => void
    /** 自动开播那一路：与「播放全部」分开，因为卡片进来时用户还没看过这张歌单，要跳回播放视图 */
    onAutoPlay: (tracks: PlaylistTrack[]) => void
    onAppend: (tracks: PlaylistTrack[]) => void
    /** 当前正在播的曲目 id：列表里给它一个"在播"标记 */
    currentTrackId: string | null
}

interface PlaylistPage {
    header: PlaylistHeader
    tracks: PlaylistTrack[]
    total: number
    hasMore: boolean
}

export default function PlaylistDetail({
    playlistId,
    autoPlay = false,
    busy = false,
    onBack,
    onPlayAll,
    onAutoPlay,
    onAppend,
    currentTrackId,
}: PlaylistDetailProps) {
    const [header, setHeader] = useState<PlaylistHeader | null>(null)
    const [tracks, setTracks] = useState<PlaylistTrack[]>([])
    const [total, setTotal] = useState(0)
    const [hasMore, setHasMore] = useState(false)
    const [loading, setLoading] = useState(true)
    const [moreLoading, setMoreLoading] = useState(false)
    const [error, setError] = useState('')

    /** 自动开播只做一次 */
    const autoPlayedRef = useRef(false)

    /*
     * 取一页曲目。
     * 第一句就是 await —— 从 effect 里发起时不会同步 setState（那会触发级联渲染），
     * 于是"进入歌单就开始加载"这件事不需要在 effect 里先抢着把 loading 置真：
     * 组件是按歌单 id 重新挂载的（父级给了 key），初始 loading 本来就是 true。
     */
    const fetchPage = useCallback(async (targetId: string, offset: number): Promise<PlaylistPage | { error: string }> => {
        try {
            const url = `/api/wangyi-playlist?id=${encodeURIComponent(targetId)}&limit=${PLAYLIST_TRACKS_PAGE_SIZE}&offset=${offset}`
            const res = await fetch(url, { cache: 'no-store' })
            const data = await res.json()
            if (data?.code !== 200) return { error: String(data?.msg ?? '歌单加载失败') }
            return {
                header: data.data?.playlist as PlaylistHeader,
                tracks: (data.data?.tracks ?? []) as PlaylistTrack[],
                total: Number(data.data?.total ?? 0) || 0,
                hasMore: Boolean(data.data?.hasMore),
            }
        } catch {
            return { error: '歌单加载失败，请检查网络' }
        }
    }, [])

    useEffect(() => {
        let alive = true
        void (async () => {
            const page = await fetchPage(playlistId, 0)
            if (!alive) return
            setLoading(false)
            if ('error' in page) {
                setError(page.error)
                return
            }
            setHeader(page.header)
            setTracks(page.tracks)
            setTotal(page.total)
            setHasMore(page.hasMore)
        })()
        return () => {
            alive = false
        }
    }, [playlistId, fetchPage])

    /* 卡片上那个悬浮播放钮进来的：第一页到手就开播，不必再点一次 */
    useEffect(() => {
        if (!autoPlay || autoPlayedRef.current || tracks.length === 0) return
        autoPlayedRef.current = true
        onAutoPlay(tracks)
    }, [autoPlay, tracks, onAutoPlay])

    /** 加载更多：追加一页 */
    const loadMore = async () => {
        setMoreLoading(true)
        const page = await fetchPage(playlistId, tracks.length)
        setMoreLoading(false)
        if ('error' in page) {
            setError(page.error)
            return
        }
        setTracks((prev) => [...prev, ...page.tracks])
        setTotal(page.total)
        setHasMore(page.hasMore)
    }

    /** 失败的两种入路（首屏 / 加载更多）共用：清空后重来 */
    const retry = async () => {
        setError('')
        setLoading(true)
        const page = await fetchPage(playlistId, 0)
        setLoading(false)
        if ('error' in page) {
            setError(page.error)
            return
        }
        setHeader(page.header)
        setTracks(page.tracks)
        setTotal(page.total)
        setHasMore(page.hasMore)
    }

    /* Esc 返回。抽屉/舞台开着时不抢：那一下 Esc 属于它们 */
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return
            const target = event.target as HTMLElement | null
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
            if (document.querySelector('[role="dialog"]')) return
            onBack()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onBack])

    const trackCountLabel = total > 0 ? `${tracks.length}/${total}` : `${tracks.length}`

    return (
        <div className="flex w-full flex-col gap-5 pb-2">
            <button
                type="button"
                onClick={onBack}
                className="inline-flex h-8 w-fit items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.06] px-3 text-[12px] text-white/70 transition hover:bg-white/12 hover:text-white"
            >
                <IconArrowLeft className="h-3.5 w-3.5" />
                发现
            </button>

            {/* ── 头部 ── */}
            {error ? (
                <div className="flex flex-col items-start gap-3 rounded-2xl border border-red-500/25 bg-red-500/[0.08] px-5 py-5">
                    <p className="flex items-center gap-2 text-[13px] text-red-200/85">
                        <IconAlert className="h-4 w-4 shrink-0" />
                        {error}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => void retry()}
                            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 text-[12px] text-white/75 transition hover:bg-white/12 hover:text-white"
                        >
                            <IconRetry className="h-3.5 w-3.5" />
                            重试
                        </button>
                        <button
                            type="button"
                            onClick={onBack}
                            className="h-8 rounded-full px-3 text-[12px] text-white/50 transition hover:text-white"
                        >
                            返回发现
                        </button>
                    </div>
                </div>
            ) : (
                <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-7">
                    {header?.cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={header.cover}
                            alt={header.name}
                            className="h-[132px] w-[132px] shrink-0 rounded-2xl object-cover shadow-[0_24px_60px_-30px_rgba(0,0,0,1)] ring-1 ring-white/10 sm:h-[180px] sm:w-[180px]"
                        />
                    ) : (
                        <div className="h-[132px] w-[132px] shrink-0 animate-pulse rounded-2xl bg-white/[0.05] sm:h-[180px] sm:w-[180px]" />
                    )}

                    <div className="min-w-0 flex-1">
                        {loading && !header ? (
                            <div className="animate-pulse space-y-3">
                                <div className="h-7 w-2/3 rounded bg-white/[0.06]" />
                                <div className="h-3 w-1/3 rounded bg-white/[0.05]" />
                                <div className="h-3 w-full rounded bg-white/[0.04]" />
                            </div>
                        ) : (
                            <>
                                <p className="text-[11px] uppercase tracking-[0.18em] text-white/30">歌单</p>
                                <h1 className="mt-1.5 line-clamp-2 text-[22px] font-bold leading-tight tracking-tight text-white sm:text-[30px]">
                                    {header?.name ?? '歌单'}
                                </h1>
                                <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-white/45">
                                    {header?.creator && <span className="text-white/60">{header.creator}</span>}
                                    {header && header.creator && <span className="text-white/20">·</span>}
                                    <span>播放 {formatPlayCount(header?.playCount ?? 0)}</span>
                                    <span className="text-white/20">·</span>
                                    <span>{trackCountLabel} 首</span>
                                    {moreLoading && <IconSpinner className="h-3 w-3" />}
                                </p>
                                {header?.description && (
                                    <p className="mt-2.5 line-clamp-2 max-w-[720px] text-[12px] leading-relaxed text-white/35">
                                        {header.description}
                                    </p>
                                )}
                            </>
                        )}

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() => onPlayAll(tracks, 0)}
                                disabled={tracks.length === 0 || busy}
                                className="inline-flex h-9 items-center gap-2 rounded-full bg-[#ec4141] px-4 text-[12.5px] font-medium text-white shadow-[0_14px_34px_-16px_rgba(236,65,65,1)] transition hover:bg-[#d73535] disabled:opacity-45"
                            >
                                {busy ? <IconSpinner className="h-3.5 w-3.5" /> : <IconPlay className="h-3.5 w-3.5" />}
                                {busy ? '准备中…' : '播放全部'}
                            </button>
                            <button
                                type="button"
                                onClick={() => onAppend(tracks)}
                                disabled={tracks.length === 0}
                                className="inline-flex h-9 items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 text-[12.5px] text-white/80 transition hover:bg-white/14 hover:text-white disabled:opacity-45"
                            >
                                <IconPlus className="h-3.5 w-3.5" />
                                加入队列
                            </button>
                            <a
                                href={`${NETEASE_PLAYLIST_URL}${playlistId}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[12px] text-white/45 transition hover:bg-white/[0.07] hover:text-white"
                            >
                                <IconExternal className="h-3.5 w-3.5" />
                                网易云查看
                            </a>
                        </div>
                    </div>
                </header>
            )}

            {/* ── 曲目 ── */}
            {!error && (
                <section>
                    {loading && tracks.length === 0 ? (
                        <ul className="space-y-1">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <li key={i} className="flex items-center gap-3 px-2.5 py-2">
                                    <div className="h-3 w-4 animate-pulse rounded bg-white/[0.06]" />
                                    <div className="h-9 w-9 animate-pulse rounded-lg bg-white/[0.05]" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 w-2/5 animate-pulse rounded bg-white/[0.06]" />
                                        <div className="h-2.5 w-1/4 animate-pulse rounded bg-white/[0.04]" />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : tracks.length === 0 ? (
                        <p className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-6 text-center text-[12px] text-white/40">
                            这个歌单暂时没有可展示的曲目
                        </p>
                    ) : (
                        <>
                            <TrackList
                                tracks={tracks}
                                currentTrackId={currentTrackId}
                                onPick={(index) => onPlayAll(tracks, index)}
                            />

                            {hasMore && (
                                <div className="mt-5 flex justify-center">
                                    <button
                                        type="button"
                                        onClick={() => void loadMore()}
                                        disabled={moreLoading}
                                        className="inline-flex h-9 items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-5 text-[12px] text-white/70 transition hover:bg-white/12 hover:text-white disabled:opacity-50"
                                    >
                                        {moreLoading && <IconSpinner className="h-3.5 w-3.5" />}
                                        {moreLoading ? '加载中' : `加载更多（已 ${tracks.length}/${total}）`}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </section>
            )}
        </div>
    )
}
