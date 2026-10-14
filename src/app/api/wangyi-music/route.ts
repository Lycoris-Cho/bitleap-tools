/*
 * 歌曲解析：ID → 播放直链 + 歌曲信息。
 *
 * 上游 node.api.xfabe.com 的 music 接口会整体挂掉（实测所有歌都返回
 * `{"code":400,"msg":"此歌曲为空"}`，而它的搜索/歌词接口还活着），所以这里做一条兜底链：
 *   ① xfabe            —— 原上游，正常时优先，返回的信息最全；
 *   ② 网易云官方外链   —— https://music.163.com/song/media/outer/url?id=X.mp3，第一方、免费歌可用；
 *   ③ 两个 meting 镜像 —— 能解出官方外链解不出的歌（付费/版权歌）。
 * 直链拿不到时再单独补一次歌曲信息（官方 song/detail），这样即便 ③ 只给了直链，
 * 歌名/歌手/封面/时长也不缺。返回结构与 xfabe 保持一致，客户端无需改动。
 */

const XFABE = 'https://node.api.xfabe.com/api/wangyi/music?type=json'
const NETEASE_OUTER = 'https://music.163.com/song/media/outer/url?id='
const NETEASE_DETAIL = 'https://music.163.com/api/song/detail?ids='
/**
 * 按可靠性排序的 meting 镜像。
 * 实测 qijieya 给的是整首（十几 MB），injiahow 常常只给 30~45 秒的试听片段（480KB 上下），
 * 所以 qijieya 在前。镜像具体给哪个由下面的"整首校验"兜底，顺序只是省一次请求。
 */
const METING_MIRRORS = ['https://api.qijieya.cn/meting/?type=url&id=', 'https://api.injahow.cn/meting/?type=url&id=']

/**
 * 整首校验的下限码率（字节/秒）。
 * 网易云给受限歌曲的试听片段约 30 秒 / 480KB（≈16KB/s，即 128kbps），
 * 而整首按 306 秒算约 4.8MB。这里用 4KB/s（32kbps）当门槛：
 * 比它小的必然是试听片段，宁可报"不可用"也不能把 30 秒片段当成整首播出去。
 */
const MIN_BYTES_PER_SECOND = 4000

const NETEASE_HEADERS = {
    Referer: 'https://music.163.com/',
    'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
}

interface SongInfo {
    id: string
    name?: string
    artistsname?: string
    album?: string
    picurl?: string
    duration?: number
    pay?: string
    url?: string
}

/**
 * 取一次重定向的目标地址。
 * 用 manual 只拿响应头里的 Location，不去跟随、也不碰响应体
 * （跟随重定向会把 mp3 的响应体拖进来，明显拖慢甚至卡住这条接口）。
 */
async function resolveRedirect(url: string, headers?: HeadersInit): Promise<string> {
    const res = await fetch(url, { redirect: 'manual', headers })
    return res.headers.get('location') ?? ''
}

/** 量文件大小：先试 HEAD，不行再用 Range 读 Content-Range 的总长。量不到返回 0。 */
async function measureBytes(url: string): Promise<number> {
    try {
        const res = await fetch(url, { method: 'HEAD' })
        const length = Number(res.headers.get('content-length') ?? 0)
        if (length > 0) return length
    } catch {
        /* 换 Range */
    }

    try {
        const res = await fetch(url, { headers: { Range: 'bytes=0-0' } })
        const total = Number((res.headers.get('content-range') ?? '').split('/')[1] ?? 0)
        return Number.isFinite(total) ? total : 0
    } catch {
        return 0
    }
}

const looksPlayable = (url: string) =>
    Boolean(url) && /\.(mp3|m4a|flac|aac|mp4)(\?|$)/i.test(url) && !/\/404/.test(url)

const toHttps = (url: string) => url.replace(/^http:\/\//i, 'https://')

/**
 * 找直链。顺序：官方外链 → 各镜像。
 * 官方外链只对免费歌有效（受限歌曲会 302 到 /404），但它给的一定是整首，取到即可用；
 * 镜像要先过"整首校验"，片段一律丢弃。都没有则空串（交给界面报版权/付费限制）。
 */
async function resolvePlayUrl(id: string, durationMs: number): Promise<string> {
    try {
        const url = await resolveRedirect(`${NETEASE_OUTER}${encodeURIComponent(id)}.mp3`, NETEASE_HEADERS)
        if (looksPlayable(url)) return toHttps(url)
    } catch {
        /* 继续试镜像 */
    }

    const durationSec = durationMs > 0 ? durationMs / 1000 : 0
    for (const mirror of METING_MIRRORS) {
        try {
            const url = await resolveRedirect(`${mirror}${encodeURIComponent(id)}`)
            if (!looksPlayable(url)) continue
            const direct = toHttps(url)
            const bytes = await measureBytes(direct)
            // 量不到大小就当可用；量到了就必须够整首，否则是试听片段。
            if (bytes === 0 || durationSec === 0 || bytes >= durationSec * MIN_BYTES_PER_SECOND) return direct
        } catch {
            /* 换下一个镜像 */
        }
    }

    return ''
}

/** 官方 song/detail：拿到歌名/歌手/专辑/封面/时长（毫秒）。 */
async function fetchSongInfo(id: string): Promise<SongInfo | null> {
    try {
        const res = await fetch(`${NETEASE_DETAIL}${encodeURIComponent(`[${id}]`)}`, {
            headers: NETEASE_HEADERS,
            cache: 'no-store',
        })
        const data = await res.json()
        const song = data?.songs?.[0]
        if (!song) return null
        return {
            id,
            name: String(song.name ?? ''),
            artistsname: (song.artists ?? []).map((a: { name?: string }) => a?.name).filter(Boolean).join(','),
            album: String(song.album?.name ?? ''),
            picurl: String(song.album?.picUrl ?? ''),
            duration: Number(song.duration ?? 0) || 0,
            pay: '',
        }
    } catch {
        return null
    }
}

async function fetchFromXfabe(id: string): Promise<SongInfo | null> {
    const res = await fetch(`${XFABE}&id=${encodeURIComponent(id)}`, { cache: 'no-store' })
    const data = await res.json()
    if (data?.code === 200 && data.data && typeof data.data === 'object') return data.data as SongInfo
    return null
}

/** 兜底：先取官方信息（时长要用来判整首/片段），再据此找直链。 */
async function fetchFromFallback(id: string): Promise<SongInfo | null> {
    const info = await fetchSongInfo(id)
    if (!info) return null
    const url = await resolvePlayUrl(id, info.duration ?? 0)
    return { ...info, url }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
        return Response.json({ code: -1, msg: '缺少id参数' }, { status: 400 })
    }

    try {
        const primary = await fetchFromXfabe(id)
        if (primary?.url) return Response.json({ code: 200, data: primary })
    } catch {
        /* 上游挂了，走兜底 */
    }

    try {
        const fallback = await fetchFromFallback(id)
        if (fallback) return Response.json({ code: 200, data: fallback })
    } catch {
        /* 落到下面统一报错 */
    }

    return Response.json({ code: -1, msg: '解析失败，请稍后再试' }, { status: 502 })
}
