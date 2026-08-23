export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return Response.json({ code: -1, msg: '缺少id参数' }, { status: 400 })
    }
  
    try {
      const upstream = await fetch(
        `https://node.api.xfabe.com/api/wangyi/music?type=json&id=${encodeURIComponent(id)}`
      )
      const data = await upstream.json()
      return Response.json(data)
    } catch (e) {
      return Response.json({ code: -1, msg: '上游接口请求失败' }, { status: 502 })
    }
  }
  