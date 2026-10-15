/*
 * 艺人：搜索 / 详情（含热门单曲）/ 专辑列表 / 专辑曲目，四合一。
 *
 * 全部是网易云那套老 `/api/*` 接口（免登录、免 cookie），实测可用：
 *   /api/search/get?s=&type=100    —— 按名字搜艺人（type=100 就是艺人）
 *   /api/artist/<id>               —— 艺人信息 + hotSongs（热门单曲，一次给足）
 *   /api/artist/albums/<id>        —— 艺人专辑列表，可翻页
 *   /api/v1/album/<id>             —— 专辑信息 + 曲目
 *
 * 两个坑：
 *   ① 专辑曲目**必须走 /api/v1/album/**。老路径 /api/album/<id> 会返回 code -462（上游拒绝）；
 *   ② 这批接口的字段名不统一：artist 详情里是 artists/album/duration（老样子），
 *      搜索与专辑曲目里是 ar/al/dt（新样子）。所以下面两个映射函数都留着，按来源挑。
 *
 * 返回的曲目统一成 PlaylistTrack 的形状，客户端就能直接复用歌单那套播放与队列逻辑。
 */

const NETEASE_HEADERS = {
    Referer: 'https://music.163.com/',
    'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
}

const UPSTREAM_SEARCH = 'https://music.163.com/api/search/get'
const UPSTREAM_ARTIST = 'https://music.163.com/api/artist/'
const UPSTREAM_ARTIST_ALBUMS = 'https://music.163.com/api/artist/albums/'
const UPSTREAM_ALBUM = 'https://music.163.com/api/v1/album/'

interface Track {
    id: string
    name: string
    artist: string
    album: string
    cover: string
    duration: number
}

const clampInt = (value: string | null, fallback: number, min: number, max: number) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return fallback
    return Math.min(Math.max(Math.trunc(parsed), min), max)
}

/** 老样式：artists[{name}] + album{name,picUrl} + duration */
function mapLegacyTrack(raw: Record<string, unknown>): Track | null {
    const id = String(raw.id ?? '')
    if (!id) return null
    const artists = Array.isArray(raw.artists) ? (raw.artists as { name?: string }[]) : []
    const album = (raw.album ?? {}) as { name?: string; picUrl?: string }
    return {
        id,
        name: String(raw.name ?? '未知曲目'),
        artist: artists.map((a) => a?.name).filter(Boolean).join(',') || '未知歌手',
        album: String(album.name ?? ''),
        cover: String(album.picUrl ?? ''),
        duration: Number(raw.duration ?? 0) || 0,
    }
}

/** 新样式：ar[{name}] + al{name,picUrl} + dt */
function mapModernTrack(raw: Record<string, unknown>): Track | null {
    const id = String(raw.id ?? '')
    if (!id) return null
    const artists = Array.isArray(raw.ar) ? (raw.ar as { name?: string }[]) : []
    const album = (raw.al ?? {}) as { name?: string; picUrl?: string }
    return {
        id,
        name: String(raw.name ?? '未知曲目'),
        artist: artists.map((a) => a?.name).filter(Boolean).join(',') || '未知歌手',
        album: String(album.name ?? ''),
        cover: String(album.picUrl ?? ''),
        duration: Number(raw.dt ?? 0) || 0,
    }
}

const json = (body: unknown, status = 200) => Response.json(body, { status })

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') ?? 'search'

    try {
        /* 按名字搜艺人 */
        if (type === 'search') {
            const q = (searchParams.get('q') || '').trim()
            if (!q) return json({ code: -1, msg: '缺少q参数' }, 400)
            const limit = clampInt(searchParams.get('limit'), 6, 1, 20)
            const url = `${UPSTREAM_SEARCH}?s=${encodeURIComponent(q)}&type=100&limit=${limit}`
            const res = await fetch(url, { headers: NETEASE_HEADERS, cache: 'no-store' })
            const data = await res.json()
            const list = Array.isArray(data?.result?.artists) ? (data.result.artists as Record<string, unknown>[]) : []
            const artists = list.map((raw) => ({
                id: String(raw.id ?? ''),
                name: String(raw.name ?? '未知艺人'),
                cover: String(raw.picUrl ?? ''),
                alias: Array.isArray(raw.alias) ? (raw.alias as string[]).filter(Boolean).join(' / ') : '',
                musicSize: Number(raw.musicSize ?? 0) || 0,
                albumSize: Number(raw.albumSize ?? 0) || 0,
            })).filter((a) => a.id)
            return json({ code: 200, data: { artists } })
        }

        const id = (searchParams.get('id') || '').trim()
        if (!id) return json({ code: -1, msg: '缺少id参数' }, 400)

        /* 艺人信息 + 热门单曲 */
        if (type === 'detail') {
            const res = await fetch(`${UPSTREAM_ARTIST}${encodeURIComponent(id)}`, { headers: NETEASE_HEADERS, cache: 'no-store' })
            const data = await res.json()
            const raw = data?.artist
            if (!raw) return json({ code: -1, msg: '艺人不存在' }, 404)
            const songs = Array.isArray(data?.hotSongs)
                ? (data.hotSongs as Record<string, unknown>[]).map(mapLegacyTrack).filter((t): t is Track => Boolean(t))
                : []
            return json({
                code: 200,
                data: {
                    artist: {
                        id: String(raw.id ?? id),
                        name: String(raw.name ?? '未知艺人'),
                        cover: String(raw.picUrl ?? ''),
                        description: String(raw.briefDesc ?? ''),
                        musicSize: Number(raw.musicSize ?? 0) || 0,
                        albumSize: Number(raw.albumSize ?? 0) || 0,
                    },
                    tracks: songs,
                },
            })
        }

        /* 艺人专辑列表 */
        if (type === 'albums') {
            const limit = clampInt(searchParams.get('limit'), 30, 1, 100)
            const offset = clampInt(searchParams.get('offset'), 0, 0, 5000)
            const url = `${UPSTREAM_ARTIST_ALBUMS}${encodeURIComponent(id)}?limit=${limit}&offset=${offset}`
            const res = await fetch(url, { headers: NETEASE_HEADERS, cache: 'no-store' })
            const data = await res.json()
            const list = Array.isArray(data?.hotAlbums) ? (data.hotAlbums as Record<string, unknown>[]) : []
            const albums = list.map((raw) => ({
                id: String(raw.id ?? ''),
                name: String(raw.name ?? '未命名专辑'),
                cover: String(raw.picUrl ?? ''),
                publishTime: Number(raw.publishTime ?? 0) || 0,
                trackCount: Number(raw.size ?? 0) || 0,
            })).filter((a) => a.id)
            return json({
                code: 200,
                data: { albums, offset, limit, hasMore: Boolean(data?.more) || albums.length >= limit },
            })
        }

        /* 专辑信息 + 曲目 */
        if (type === 'album') {
            const res = await fetch(`${UPSTREAM_ALBUM}${encodeURIComponent(id)}`, { headers: NETEASE_HEADERS, cache: 'no-store' })
            const data = await res.json()
            const raw = data?.album
            if (!raw || Number(data?.code) !== 200) return json({ code: -1, msg: '专辑不存在或已下架' }, 404)
            const artists = Array.isArray(raw.artists) ? (raw.artists as { name?: string }[]) : []
            const tracks = Array.isArray(data?.songs)
                ? (data.songs as Record<string, unknown>[]).map(mapModernTrack).filter((t): t is Track => Boolean(t))
                : []
            return json({
                code: 200,
                data: {
                    album: {
                        id: String(raw.id ?? id),
                        name: String(raw.name ?? '未命名专辑'),
                        cover: String(raw.picUrl ?? ''),
                        artist: artists.map((a) => a?.name).filter(Boolean).join(',') || '未知歌手',
                        publishTime: Number(raw.publishTime ?? 0) || 0,
                        company: String(raw.company ?? ''),
                        trackCount: Number(raw.size ?? tracks.length) || tracks.length,
                    },
                    tracks,
                },
            })
        }

        return json({ code: -1, msg: '未知的 type' }, 400)
    } catch {
        return json({ code: -1, msg: '艺人接口请求失败，请稍后再试' }, 502)
    }
}
