/*
 * 歌词接口。
 *
 * 第一优先走网易云官方 /api/song/lyric/v1：它在有逐字歌词的歌上会返回 `yrc`
 * （`[行起,行长](字起,字长,0)字…`），Folia 的 classic「流光」之所以能"逐字点亮"就靠它。
 * 官方接口拿不到（或该歌没有逐字歌词）时再退回 node.api.xfabe.com 的整行 LRC。
 *
 * 返回统一成 { code, lrc, yrc, tlyric }：
 *   lrc    —— 整行歌词，给左侧滚动列表与兜底舞台用；
 *   yrc    —— 逐字歌词，可能为空字符串；
 *   tlyric —— 逐行译文，可能为空字符串。
 */

const NETEASE_LYRIC_V1 =
    'https://music.163.com/api/song/lyric/v1?lv=-1&kv=-1&tv=-1&yv=-1&ytv=-1&yrv=-1&cp=false'
const XFABE_LYRIC = 'https://node.api.xfabe.com/api/wangyi/lyrics?type=json'

const NETEASE_HEADERS = {
    Referer: 'https://music.163.com/',
    'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
}

async function fetchFromNetease(id: string) {
    const res = await fetch(`${NETEASE_LYRIC_V1}&id=${encodeURIComponent(id)}`, {
        headers: NETEASE_HEADERS,
        cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json()
    const lrc = data?.lrc?.lyric ?? ''
    const yrc = data?.yrc?.lyric ?? ''
    const tlyric = data?.tlyric?.lyric ?? ''
    if (!lrc && !yrc) return null
    return { lrc, yrc, tlyric }
}

async function fetchFromXfabe(id: string) {
    const res = await fetch(`${XFABE_LYRIC}&id=${encodeURIComponent(id)}`)
    if (!res.ok) return null
    const data = await res.json()
    const lrc = data?.data?.lyric ?? ''
    if (!lrc) return null
    return { lrc, yrc: '', tlyric: '' }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return Response.json({ code: -1, msg: '缺少id参数' }, { status: 400 })

    try {
        const result = (await fetchFromNetease(id)) ?? (await fetchFromXfabe(id))
        if (!result) return Response.json({ code: -1, msg: '该歌曲暂无歌词' }, { status: 404 })
        return Response.json({ code: 200, ...result })
    } catch {
        // 官方接口抛错时再试一次兜底源，两边都不行才报失败。
        try {
            const result = await fetchFromXfabe(id)
            if (result) return Response.json({ code: 200, ...result })
        } catch {
            /* 落到下面统一报错 */
        }
        return Response.json({ code: -1, msg: '歌词接口请求失败' }, { status: 502 })
    }
}
