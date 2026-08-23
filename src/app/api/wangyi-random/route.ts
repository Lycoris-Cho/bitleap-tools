export async function GET(request: Request) {
    try {
      const res = await fetch('https://node.api.xfabe.com/api/wangyi/randomMusic?type=json')
      const data = await res.json()
      return Response.json(data)
    } catch {
      return Response.json({ code: -1, msg: '上游接口请求失败' }, { status: 502 })
    }
  }
  