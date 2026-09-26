/**
 * 网易云歌曲搜索
 * 上游参数名是 search（不是 keywords），limit 上限实测可用到 100
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const keywords = (searchParams.get('keywords') || '').trim()
    if (!keywords) {
        return Response.json({ code: -1, msg: '缺少keywords参数' }, { status: 400 })
    }

    const rawLimit = Number(searchParams.get('limit'))
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), 100) : 30

    try {
        const upstream = await fetch(
            `https://node.api.xfabe.com/api/wangyi/search?type=json&limit=${limit}&search=${encodeURIComponent(keywords)}`,
            { cache: 'no-store' }
        )
        const data = await upstream.json()
        return Response.json(data)
    } catch {
        return Response.json({ code: -1, msg: '上游接口请求失败' }, { status: 502 })
    }
}
