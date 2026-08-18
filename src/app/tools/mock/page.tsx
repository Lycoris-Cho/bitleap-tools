'use client'
import { useState } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
export default function MockServerPage() {
  const [method, setMethod] = useState('GET')
  const [path, setPath] = useState('/api/demo')
  const [statusCode, setStatusCode] = useState(200)
  const [delay, setDelay] = useState(0)
  const [responseBody, setResponseBody] = useState<string>(JSON.stringify({ code: 0, data: {}, msg: 'success' }, null, 2))
  const [errorMsg, setErrorMsg] = useState('')

  const formatJson = () => {
    setErrorMsg('')
    try {
      const parsed = JSON.parse(responseBody)
      setResponseBody(JSON.stringify(parsed, null, 2))
    } catch (e) {
      setErrorMsg('JSON格式错误，请检查语法')
    }
  }

  const validateJson = () => {
    setErrorMsg('')
    try {
      JSON.parse(responseBody)
      setErrorMsg('✅ JSON格式合法')
    } catch (e) {
      setErrorMsg('❌ JSON格式错误')
    }
  }

  const copyCodeSnippet = async () => {
    const snippet = `// Mock配置
// ${method} ${path}
// status: ${statusCode}, delay: ${delay}ms
const mockResponse = ${responseBody}
`
    await navigator.clipboard.writeText(snippet)
    alert('已复制到剪贴板')
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <Breadcrumb />
      <h1 className="text-2xl font-bold mb-1">Mock 接口生成</h1>
      <p className="text-gray-500 mb-8">可视化编写 mock 接口，生成 JSON 模拟响应，复制到项目，全部在本地浏览器运行</p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* 配置区 */}
        <div className="space-y-4">
          <div>
            <label className="block mb-1.5 font-medium">请求方法</label>
            <div className="relative">
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full appearance-none bg-app-bg border border-gray-300 rounded-xl p-3 pr-10 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/20 cursor-pointer"
              >
                <option>GET</option>
                <option>POST</option>
                <option>PUT</option>
                <option>DELETE</option>
                <option>PATCH</option>
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">▼</div>
            </div>
          </div>

          <div>
            <label className="block mb-1.5 font-medium">接口路径 Path</label>
            <input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              className="w-full border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-black/20"
              placeholder="/api/example"
            />
          </div>

          <div>
            <label className="block mb-1.5 font-medium">HTTP 状态码</label>
            <input
              type="number"
              value={statusCode}
              onChange={(e) => setStatusCode(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-black/20"
            />
          </div>

          <div>
            <label className="block mb-1.5 font-medium">模拟延迟(ms)</label>
            <input
              type="number"
              value={delay}
              onChange={(e) => setDelay(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-black/20"
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button onClick={formatJson} className="px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-all">格式化JSON</button>
            <button onClick={validateJson} className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-100 transition-all">校验JSON</button>
            <button onClick={copyCodeSnippet} className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-100 transition-all">复制片段</button>
          </div>
          {errorMsg && (
            <div className={`text-sm ${errorMsg.startsWith('✅') ? 'text-emerald-600' : 'text-red-500'}`}>{errorMsg}</div>
          )}
        </div>

        {/* JSON编辑区 */}
        <div>
          <label className="block mb-1.5 font-medium">Response JSON</label>
          <textarea
            value={responseBody}
            onChange={(e) => setResponseBody(e.target.value)}
            className="w-full h-96 border border-gray-300 rounded-xl p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-black/20 resize-none"
          />
        </div>
      </div>
    </div>
  )
}
