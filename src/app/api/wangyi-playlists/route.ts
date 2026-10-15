/*
 * 歌单发现：推荐歌单 / 分类歌单 / 分类目录，三个上游合成一个入口。
 *
 * 用哪些上游、为什么是这些（都实测过）：
 *   /api/personalized/playlist —— 网易云的"推荐歌单"，匿名可访问、每天换一批，
 *                                 这就是"每日推荐歌单"能免登录拿到的形态；
 *   /api/playlist/list         —— 按分类取歌单，可翻页（order=hot 按热度）；
 *   /api/playlist/catalogue    —— 70 个分类名（"全部"由客户端自己加）。
 * 老的 /api/top/playlist 与 /api/playlist/track/all 已经 404，所以不走它们。
 *
 * 三条都免登录。需要 cookie 的那些（每日推荐**歌曲**、我喜欢的音乐、个人歌单）这期不做，
 * 上游地址集中在这个文件与 wangyi-playlist/route.ts 里，日后要换或要加登录态都只动这两处。
 *
 * 返回统一成 { code, data }，data.items 一律是同一套 PlaylistBrief 字段，
 * 客户端不必关心某个歌单是从推荐来的还是从分类来的。
 */

const NETEASE_HEADERS = {
    Referer: 'https://music.163.com/',
    'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
}

const UPSTREAM_RECOMMEND = 'https://music.163.com/api/personalized/playlist'
const UPSTREAM_BY_CATEGORY = 'https://music.163.com/api/playlist/list'
const UPSTREAM_CATALOGUE = 'https://music.163.com/api/playlist/catalogue'

interface PlaylistBrief {
    id: string
    name: string
    cover: string
    playCount: number
    trackCount: number
    /** 推荐歌单才有的推荐语 */
    copywriter?: string
}

/** 上游字段名换过好几轮（picUrl / coverImgUrl），这里一次收口 */
function toBrief(raw: Record<string, unknown>, withCopywriter = false): PlaylistBrief {
    const playCount = Number(raw.playCount ?? raw.playcount ?? 0) || 0
    const trackCount = Number(raw.trackCount ?? raw.trackNumber ?? 0) || 0
    return {
        id: String(raw.id ?? ''),
        name: String(raw.name ?? '未命名歌单'),
        cover: String(raw.picUrl ?? raw.coverImgUrl ?? raw.cover ?? ''),
        playCount,
        trackCount,
        ...(withCopywriter && raw.copywriter ? { copywriter: String(raw.copywriter) } : {}),
    }
}

const clampInt = (value: string | null, fallback: number, min: number, max: number) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return fallback
    return Math.min(Math.max(Math.trunc(parsed), min), max)
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') ?? 'recommend'

    try {
        /* 分类目录：给发现页那排分类胶囊用 */
        if (type === 'catalogue') {
            const res = await fetch(UPSTREAM_CATALOGUE, { headers: NETEASE_HEADERS, cache: 'no-store' })
            const data = await res.json()
            const tags = Array.isArray(data?.sub) ? data.sub.map((item: { name?: string }) => String(item?.name ?? '')).filter(Boolean) : []
            return Response.json({ code: 200, data: { tags } })
        }

        /* 分类歌单：可按热度翻页 */
        if (type === 'category') {
            const cat = (searchParams.get('cat') || '全部').trim() || '全部'
            const limit = clampInt(searchParams.get('limit'), 30, 1, 100)
            const offset = clampInt(searchParams.get('offset'), 0, 0, 5000)
            const url = `${UPSTREAM_BY_CATEGORY}?order=hot&cat=${encodeURIComponent(cat)}&limit=${limit}&offset=${offset}`
            const res = await fetch(url, { headers: NETEASE_HEADERS, cache: 'no-store' })
            const data = await res.json()
            const items = Array.isArray(data?.playlists) ? data.playlists.map((p: Record<string, unknown>) => toBrief(p)) : []
            const total = Number(data?.total ?? 0) || 0
            return Response.json({
                code: 200,
                data: { items, total, offset, limit, cat, hasMore: Boolean(data?.more) || offset + items.length < total },
            })
        }

        /* 默认：推荐歌单（每天更新） */
        const limit = clampInt(searchParams.get('limit'), 12, 1, 50)
        const res = await fetch(`${UPSTREAM_RECOMMEND}?limit=${limit}`, { headers: NETEASE_HEADERS, cache: 'no-store' })
        const data = await res.json()
        const items = Array.isArray(data?.result) ? data.result.map((p: Record<string, unknown>) => toBrief(p, true)) : []
        return Response.json({ code: 200, data: { items } })
    } catch {
        return Response.json({ code: -1, msg: '歌单接口请求失败，请稍后再试' }, { status: 502 })
    }
}
