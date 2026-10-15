/*
 * 歌单详情 + 曲目列表。
 *
 * 为什么是两步（实测出来的结论）：
 *   /api/v6/playlist/detail?id= 会给出歌单头部信息，以及**全部**曲目的 id（trackIds），
 *   但只带前 10 首的元数据（这是上游的限制，老的 /api/playlist/track/all 已经 404，
 *   所以"一次拿全部曲目"这条路走不通）。
 *   于是：detail 拿 id 清单 → 按 offset/limit 切片 → /api/song/detail?ids=[...] 分批补元数据。
 *   song/detail 正是 wangyi-music 路由里已经在用的兜底接口，形状稳定，
 *   而且它给的 album.picUrl 就是曲目封面（不用再逐个去解析直链取封面）。
 *
 * 分页是为了长歌单：一张 1000 首的歌单如果一次全要，单是 URL 就会装箱式拼到几千字符，
 * 上游也容易限流。客户端默认一次 100 首，滚到底再要下一页。
 */

const NETEASE_HEADERS = {
    Referer: 'https://music.163.com/',
    'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
}

const UPSTREAM_DETAIL = 'https://music.163.com/api/v6/playlist/detail?id='
const UPSTREAM_SONG_DETAIL = 'https://music.163.com/api/song/detail?ids='

/** song/detail 一次能收的 id 个数：再多 URL 就长了，且没必要 */
const ID_BATCH_SIZE = 100
/** 单个请求最多给多少首曲目 */
const MAX_PAGE_SIZE = 200

interface PlaylistHeader {
    id: string
    name: string
    cover: string
    description: string
    creator: string
    playCount: number
    trackCount: number
}

interface PlaylistTrack {
    id: string
    name: string
    artist: string
    album: string
    cover: string
    /** 毫秒 */
    duration: number
}

const clampInt = (value: string | null, fallback: number, min: number, max: number) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return fallback
    return Math.min(Math.max(Math.trunc(parsed), min), max)
}

/** 一批 id 的元数据；返回 id→曲目 的映射，顺序对齐交给调用方 */
async function fetchTrackBatch(ids: string[]): Promise<Map<string, PlaylistTrack>> {
    const out = new Map<string, PlaylistTrack>()
    const chunks: string[][] = []
    for (let i = 0; i < ids.length; i += ID_BATCH_SIZE) chunks.push(ids.slice(i, i + ID_BATCH_SIZE))

    const results = await Promise.all(
        chunks.map(async (chunk) => {
            try {
                const query = encodeURIComponent(`[${chunk.join(',')}]`)
                const res = await fetch(`${UPSTREAM_SONG_DETAIL}${query}`, { headers: NETEASE_HEADERS, cache: 'no-store' })
                const data = await res.json()
                return Array.isArray(data?.songs) ? (data.songs as Record<string, unknown>[]) : []
            } catch {
                // 一批挂了不该让整页失败：这一批的曲目就缺元数据，界面上显示成"未知曲目"
                return []
            }
        })
    )

    for (const song of results.flat()) {
        const id = String(song.id ?? '')
        if (!id) continue
        const artists = Array.isArray(song.artists) ? (song.artists as { name?: string }[]) : []
        const album = (song.album ?? {}) as { name?: string; picUrl?: string }
        out.set(id, {
            id,
            name: String(song.name ?? '未知曲目'),
            artist: artists.map((a) => a?.name).filter(Boolean).join(',') || '未知歌手',
            album: String(album.name ?? ''),
            cover: String(album.picUrl ?? ''),
            duration: Number(song.duration ?? 0) || 0,
        })
    }
    return out
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const id = (searchParams.get('id') || '').trim()
    if (!id) {
        return Response.json({ code: -1, msg: '缺少id参数' }, { status: 400 })
    }

    const limit = clampInt(searchParams.get('limit'), 100, 1, MAX_PAGE_SIZE)
    const offset = clampInt(searchParams.get('offset'), 0, 0, 100000)

    try {
        const res = await fetch(`${UPSTREAM_DETAIL}${encodeURIComponent(id)}`, { headers: NETEASE_HEADERS, cache: 'no-store' })
        const data = await res.json()
        const raw = data?.playlist
        if (!raw) {
            return Response.json({ code: -1, msg: '歌单不存在或已下架' }, { status: 404 })
        }

        const creator = (raw.creator ?? {}) as { nickname?: string }
        const header: PlaylistHeader = {
            id: String(raw.id ?? id),
            name: String(raw.name ?? '未命名歌单'),
            cover: String(raw.coverImgUrl ?? raw.picUrl ?? ''),
            description: String(raw.description ?? ''),
            creator: String(creator.nickname ?? ''),
            playCount: Number(raw.playCount ?? 0) || 0,
            trackCount: Number(raw.trackCount ?? 0) || 0,
        }

        const trackIds: string[] = Array.isArray(raw.trackIds)
            ? (raw.trackIds as { id?: unknown }[]).map((entry) => String(entry?.id ?? '')).filter(Boolean)
            : []
        const total = trackIds.length || header.trackCount
        const pageIds = trackIds.slice(offset, offset + limit)

        /* 上游给的前 10 首元数据（raw.tracks）也当兜底用：song/detail 万一某批失败，
           至少这 10 首还有名字，不至于整页都是"未知曲目"。 */
        const fallbackTracks = new Map<string, PlaylistTrack>()
        if (Array.isArray(raw.tracks)) {
            for (const song of raw.tracks as Record<string, unknown>[]) {
                const songId = String(song.id ?? '')
                if (!songId) continue
                const artists = Array.isArray(song.ar) ? (song.ar as { name?: string }[]) : []
                const album = (song.al ?? {}) as { name?: string; picUrl?: string }
                fallbackTracks.set(songId, {
                    id: songId,
                    name: String(song.name ?? '未知曲目'),
                    artist: artists.map((a) => a?.name).filter(Boolean).join(',') || '未知歌手',
                    album: String(album.name ?? ''),
                    cover: String(album.picUrl ?? ''),
                    duration: Number(song.dt ?? 0) || 0,
                })
            }
        }

        const fetched = await fetchTrackBatch(pageIds)
        // 顺序以 trackIds 为准：song/detail 不保证按请求顺序返回
        const tracks: PlaylistTrack[] = pageIds.map(
            (trackId) =>
                fetched.get(trackId) ??
                fallbackTracks.get(trackId) ?? {
                    id: trackId,
                    name: '未知曲目',
                    artist: '未知歌手',
                    album: '',
                    cover: '',
                    duration: 0,
                }
        )

        return Response.json({
            code: 200,
            data: {
                playlist: header,
                tracks,
                total,
                offset,
                limit,
                hasMore: offset + pageIds.length < total,
            },
        })
    } catch {
        return Response.json({ code: -1, msg: '歌单接口请求失败，请稍后再试' }, { status: 502 })
    }
}
