'use client'

/*
 * 艺人页 —— 搜到艺人之后进来：头部（头像/名字/别名/作品数）+ 两个页签（单曲 / 专辑）。
 *
 * 单曲用 /api/artist/<id> 的 hotSongs（热门单曲，一次给足，不用分页）；
 * 专辑用 /api/artist/albums/<id>，点进去看专辑曲目。
 * 两边的曲目都是 PlaylistTrack 形状，所以"播放/加入队列"直接复用歌单那套逻辑，一行都不用另写。
 */

import { useCallback, useEffect, useState } from 'react'
import type { PlaylistTrack } from '../types'
import { formatPlayCount, NETEASE_ARTIST_URL } from '../utils'
import { IconAlert, IconArrowLeft, IconExternal, IconPlay, IconPlus, IconRetry, IconSpinner } from './icons'
import TrackList from './TrackList'

export interface ArtistInfo {
    id: string
    name: string
    cover: string
    description: string
    musicSize: number
    albumSize: number
}

export interface ArtistAlbum {
    id: string
    name: string
    cover: string
    publishTime: number
    trackCount: number
}

interface ArtistPanelProps {
    artistId: string
    /** 从搜索里点进来时的名字：详情还没到时先把它显示出来，别让标题空着 */
    fallbackName?: string
    busy?: boolean
    onBack: () => void
    onOpenAlbum: (albumId: string) => void
    onPlayTracks: (tracks: PlaylistTrack[], index?: number) => void
    onAppendTracks: (tracks: PlaylistTrack[]) => void
    currentTrackId: string | null
}

const ALBUM_PAGE_SIZE = 30

export default function ArtistPanel({
    artistId,
    fallbackName,
    busy = false,
    onBack,
    onOpenAlbum,
    onPlayTracks,
    onAppendTracks,
    currentTrackId,
}: ArtistPanelProps) {
    const [tab, setTab] = useState<'songs' | 'albums'>('songs')
    const [artist, setArtist] = useState<ArtistInfo | null>(null)
    const [tracks, setTracks] = useState<PlaylistTrack[]>([])
    const [albums, setAlbums] = useState<ArtistAlbum[]>([])
    const [albumsLoaded, setAlbumsLoaded] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    /**
     * "专辑还在加载"是**派生**出来的，不是自己 setState 记的。
     * 之前把 loading 写进 effect 的依赖里，结果它一置为 loading，effect 就重跑、清理掉当次请求的"还活着"标记，
     * 响应回来被丢掉、loading 也再没人清 —— 专辑页就永远停在骨架屏上（看着像"图片加载不出来"）。
     */
    const albumsLoading = tab === 'albums' && !albumsLoaded

    /* 详情与热门单曲。第一句就是 await：从 effect 里发起也不会同步 setState */
    const fetchArtist = useCallback(async (targetId: string): Promise<{ error: string } | { artist: ArtistInfo; tracks: PlaylistTrack[] }> => {
        try {
            const res = await fetch(`/api/wangyi-artist?type=detail&id=${encodeURIComponent(targetId)}`, { cache: 'no-store' })
            const data = await res.json()
            if (data?.code !== 200) return { error: String(data?.msg ?? '艺人信息加载失败') }
            return {
                artist: data.data?.artist as ArtistInfo,
                tracks: (data.data?.tracks ?? []) as PlaylistTrack[],
            }
        } catch {
            return { error: '艺人信息加载失败，请检查网络' }
        }
    }, [])

    useEffect(() => {
        let alive = true
        void (async () => {
            const page = await fetchArtist(artistId)
            if (!alive) return
            setLoading(false)
            if ('error' in page) {
                setError(page.error)
                return
            }
            setArtist(page.artist)
            setTracks(page.tracks)
        })()
        return () => {
            alive = false
        }
    }, [artistId, fetchArtist])

    /* 专辑列表：切到那个页签才去拉，省一次请求。setState 全在 await 之后（也满足 lint 的"别在 effect 里同步改状态"） */
    useEffect(() => {
        if (tab !== 'albums' || albumsLoaded) return
        void (async () => {
            try {
                const res = await fetch(
                    `/api/wangyi-artist?type=albums&id=${encodeURIComponent(artistId)}&limit=${ALBUM_PAGE_SIZE}`,
                    { cache: 'no-store' }
                )
                const data = await res.json()
                if (data?.code === 200) setAlbums((data.data?.albums ?? []) as ArtistAlbum[])
            } catch {
                /* 拉不到就落在空态，不影响单曲那一页 */
            } finally {
                // 无论成败都要收尾：否则骨架屏会一直转下去
                setAlbumsLoaded(true)
            }
        })()
    }, [tab, albumsLoaded, artistId])

    const displayName = artist?.name ?? fallbackName ?? '艺人'

    return (
        <div className="flex w-full flex-col gap-5 pb-2">
            <button
                type="button"
                onClick={onBack}
                className="inline-flex h-8 w-fit items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.06] px-3 text-[12px] text-white/70 transition hover:bg-white/12 hover:text-white"
            >
                <IconArrowLeft className="h-3.5 w-3.5" />
                返回
            </button>

            {error ? (
                <div className="flex flex-col items-start gap-3 rounded-2xl border border-red-500/25 bg-red-500/[0.08] px-5 py-5">
                    <p className="flex items-center gap-2 text-[13px] text-red-200/85">
                        <IconAlert className="h-4 w-4 shrink-0" />
                        {error}
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            setError('')
                            setLoading(true)
                            void (async () => {
                                const page = await fetchArtist(artistId)
                                setLoading(false)
                                if ('error' in page) {
                                    setError(page.error)
                                    return
                                }
                                setArtist(page.artist)
                                setTracks(page.tracks)
                            })()
                        }}
                        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 text-[12px] text-white/75 transition hover:bg-white/12 hover:text-white"
                    >
                        <IconRetry className="h-3.5 w-3.5" />
                        重试
                    </button>
                </div>
            ) : (
                <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-7">
                    {artist?.cover || loading ? (
                        artist?.cover ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={artist.cover}
                                alt={displayName}
                                className="h-[120px] w-[120px] shrink-0 rounded-full object-cover shadow-[0_24px_60px_-30px_rgba(0,0,0,1)] ring-1 ring-white/12 sm:h-[160px] sm:w-[160px]"
                            />
                        ) : (
                            <div className="h-[120px] w-[120px] shrink-0 animate-pulse rounded-full bg-white/[0.05] sm:h-[160px] sm:w-[160px]" />
                        )
                    ) : (
                        <div className="flex h-[120px] w-[120px] shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[32px] font-bold text-white/40 ring-1 ring-white/10 sm:h-[160px] sm:w-[160px]">
                            {displayName.slice(0, 1)}
                        </div>
                    )}

                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-white/30">艺人</p>
                        <h1 className="mt-1.5 line-clamp-2 text-[22px] font-bold leading-tight tracking-tight text-white sm:text-[30px]">
                            {displayName}
                        </h1>
                        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-white/45">
                            {String(artist?.musicSize ?? 0) !== '0' && <span>单曲 {formatPlayCount(artist?.musicSize ?? 0)}</span>}
                            <span className="text-white/20">·</span>
                            <span>专辑 {artist?.albumSize ?? 0}</span>
                        </p>
                        {artist?.description && (
                            <p className="mt-2.5 line-clamp-2 max-w-[720px] text-[12px] leading-relaxed text-white/35">
                                {artist.description}
                            </p>
                        )}

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() => onPlayTracks(tracks, 0)}
                                disabled={tracks.length === 0 || busy}
                                className="inline-flex h-9 items-center gap-2 rounded-full bg-[#ec4141] px-4 text-[12.5px] font-medium text-white shadow-[0_14px_34px_-16px_rgba(236,65,65,1)] transition hover:bg-[#d73535] disabled:opacity-45"
                            >
                                {busy ? <IconSpinner className="h-3.5 w-3.5" /> : <IconPlay className="h-3.5 w-3.5" />}
                                {busy ? '准备中…' : '播放热门单曲'}
                            </button>
                            <button
                                type="button"
                                onClick={() => onAppendTracks(tracks)}
                                disabled={tracks.length === 0}
                                className="inline-flex h-9 items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 text-[12.5px] text-white/80 transition hover:bg-white/14 hover:text-white disabled:opacity-45"
                            >
                                <IconPlus className="h-3.5 w-3.5" />
                                加入队列
                            </button>
                            <a
                                href={`${NETEASE_ARTIST_URL}${artistId}`}
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

            {!error && (
                <section>
                    {/* 页签：与其他地方的分段控件同一套样式 */}
                    <div className="mb-3 flex w-fit rounded-xl border border-white/10 bg-white/[0.05] p-1">
                        {(
                            [
                                { id: 'songs' as const, label: `热门单曲${tracks.length ? ` ${tracks.length}` : ''}` },
                                { id: 'albums' as const, label: `专辑${artist?.albumSize ? ` ${artist.albumSize}` : ''}` },
                            ]
                        ).map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => setTab(item.id)}
                                aria-pressed={tab === item.id}
                                className={`rounded-lg px-3.5 py-1.5 text-[12px] transition ${
                                    tab === item.id ? 'bg-[#ec4141] text-white shadow' : 'text-white/55 hover:text-white/85'
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    {tab === 'songs' ? (
                        loading ? (
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
                                这位艺人暂时没有可展示的单曲
                            </p>
                        ) : (
                            <TrackList tracks={tracks} currentTrackId={currentTrackId} onPick={(index) => onPlayTracks(tracks, index)} />
                        )
                    ) : albumsLoading ? (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
                            {Array.from({ length: 10 }).map((_, i) => (
                                <div key={i} className="animate-pulse">
                                    <div className="aspect-square rounded-2xl bg-white/[0.05]" />
                                    <div className="mt-2.5 h-3 w-4/5 rounded bg-white/[0.05]" />
                                </div>
                            ))}
                        </div>
                    ) : albums.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-6">
                            <p className="text-[12px] text-white/40">没有取到专辑列表</p>
                            <button
                                type="button"
                                onClick={() => setAlbumsLoaded(false)}
                                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 text-[12px] text-white/75 transition hover:bg-white/12 hover:text-white"
                            >
                                <IconRetry className="h-3.5 w-3.5" />
                                重试
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
                            {albums.map((album, index) => (
                                <div
                                    key={album.id}
                                    className="group"
                                    style={{ animation: 'wy-rise .32s ease-out both', animationDelay: `${Math.min(index * 24, 320)}ms` }}
                                >
                                    <div className="relative overflow-hidden rounded-2xl ring-1 ring-white/[0.08] transition duration-300 hover:ring-white/25">
                                        <span className="relative block aspect-square">
                                            <span className="absolute inset-0 bg-white/[0.04]" aria-hidden="true" />
                                            {album.cover && (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={album.cover}
                                                    alt={album.name}
                                                    loading="lazy"
                                                    decoding="async"
                                                    className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.05]"
                                                />
                                            )}
                                            <span className="pointer-events-none absolute bottom-2 right-2 z-20 rounded-full bg-black/55 px-1.5 py-0.5 font-mono text-[10px] text-white/85 backdrop-blur-sm">
                                                {album.trackCount} 首
                                            </span>
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => onOpenAlbum(album.id)}
                                            aria-label={`打开专辑 ${album.name}`}
                                            className="absolute inset-0 z-10"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => onOpenAlbum(album.id)}
                                        className="mt-2.5 line-clamp-2 block w-full text-left text-[12.5px] leading-snug text-white/80 transition hover:text-white"
                                    >
                                        {album.name}
                                    </button>
                                    <p className="mt-1 font-mono text-[10.5px] text-white/30">
                                        {album.publishTime ? new Date(album.publishTime).getFullYear() : ''}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}
        </div>
    )
}
