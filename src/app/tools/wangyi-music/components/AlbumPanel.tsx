'use client'

/*
 * 专辑页 —— 艺人页里点一张专辑进来：封面 + 专辑名/歌手/发行/公司 + 曲目表。
 *
 * 曲目来自 /api/v1/album/<id>（老路径 /api/album/<id> 上游会拒），一次给全，不用分页。
 * 与歌单详情一样，曲目是 PlaylistTrack 形状，"播放全部 / 加入队列 / 点某首从它开始"
 * 都复用同一套逻辑。
 */

import { useCallback, useEffect, useState } from 'react'
import type { PlaylistTrack } from '../types'
import { NETEASE_ALBUM_URL } from '../utils'
import { IconAlert, IconArrowLeft, IconExternal, IconPlay, IconPlus, IconRetry, IconSpinner } from './icons'
import TrackList from './TrackList'

export interface AlbumInfo {
    id: string
    name: string
    cover: string
    artist: string
    publishTime: number
    company: string
    trackCount: number
}

interface AlbumPanelProps {
    albumId: string
    busy?: boolean
    onBack: () => void
    onPlayAll: (tracks: PlaylistTrack[], index?: number) => void
    onAppend: (tracks: PlaylistTrack[]) => void
    currentTrackId: string | null
}

export default function AlbumPanel({ albumId, busy = false, onBack, onPlayAll, onAppend, currentTrackId }: AlbumPanelProps) {
    const [album, setAlbum] = useState<AlbumInfo | null>(null)
    const [tracks, setTracks] = useState<PlaylistTrack[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const fetchAlbum = useCallback(async (targetId: string): Promise<{ error: string } | { album: AlbumInfo; tracks: PlaylistTrack[] }> => {
        try {
            const res = await fetch(`/api/wangyi-artist?type=album&id=${encodeURIComponent(targetId)}`, { cache: 'no-store' })
            const data = await res.json()
            if (data?.code !== 200) return { error: String(data?.msg ?? '专辑加载失败') }
            return { album: data.data?.album as AlbumInfo, tracks: (data.data?.tracks ?? []) as PlaylistTrack[] }
        } catch {
            return { error: '专辑加载失败，请检查网络' }
        }
    }, [])

    useEffect(() => {
        let alive = true
        void (async () => {
            const page = await fetchAlbum(albumId)
            if (!alive) return
            setLoading(false)
            if ('error' in page) {
                setError(page.error)
                return
            }
            setAlbum(page.album)
            setTracks(page.tracks)
        })()
        return () => {
            alive = false
        }
    }, [albumId, fetchAlbum])

    const year = album?.publishTime ? new Date(album.publishTime).getFullYear() : null

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
                                const page = await fetchAlbum(albumId)
                                setLoading(false)
                                if ('error' in page) {
                                    setError(page.error)
                                    return
                                }
                                setAlbum(page.album)
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
                    {album?.cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={album.cover}
                            alt={album.name}
                            className="h-[132px] w-[132px] shrink-0 rounded-2xl object-cover shadow-[0_24px_60px_-30px_rgba(0,0,0,1)] ring-1 ring-white/10 sm:h-[180px] sm:w-[180px]"
                        />
                    ) : (
                        <div className="h-[132px] w-[132px] shrink-0 animate-pulse rounded-2xl bg-white/[0.05] sm:h-[180px] sm:w-[180px]" />
                    )}

                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-white/30">专辑</p>
                        <h1 className="mt-1.5 line-clamp-2 text-[22px] font-bold leading-tight tracking-tight text-white sm:text-[30px]">
                            {album?.name ?? '专辑'}
                        </h1>
                        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-white/45">
                            {album?.artist && <span className="text-white/60">{album.artist}</span>}
                            {year && <span className="text-white/20">·</span>}
                            {year && <span>{year}</span>}
                            <span className="text-white/20">·</span>
                            <span>{album?.trackCount ?? tracks.length} 首</span>
                            {album?.company && (
                                <>
                                    <span className="text-white/20">·</span>
                                    <span className="truncate">{album.company}</span>
                                </>
                            )}
                        </p>

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
                                href={`${NETEASE_ALBUM_URL}${albumId}`}
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
                    {loading ? (
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
                            这张专辑暂时没有可展示的曲目
                        </p>
                    ) : (
                        <TrackList tracks={tracks} currentTrackId={currentTrackId} onPick={(index) => onPlayAll(tracks, index)} />
                    )}
                </section>
            )}
        </div>
    )
}
