export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return Response.json({ code: -1, msg: '缺少id参数' }, { status: 400 })
    try {
      const res = await fetch(`https://node.api.xfabe.com/api/wangyi/lyrics?type=json&id=${encodeURIComponent(id)}`)
      const data = await res.json()
      return Response.json(data)
    } catch {
      return Response.json({ code: -1, msg: '上游接口请求失败' }, { status: 502 })
    }
  }
  