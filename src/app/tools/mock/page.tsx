'use client'
import { useState } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

export default function MockServerPage() {
  const [method, setMethod] = useState('GET')
  const [path, setPath] = useState('/api/demo')
  const [statusCode, setStatusCode] = useState(200)
  const [delay, setDelay] = useState(0)
  const [responseBody, setResponseBody] = useState<string>(
    JSON.stringify({ code: 0, data: {}, msg: 'success' }, null, 2)
  )
  const [errorMsg, setErrorMsg] = useState('')
  const [copied, setCopied] = useState(false)

  const formatJson = () => {
    setErrorMsg('')
    try {
      const parsed = JSON.parse(responseBody)
      setResponseBody(JSON.stringify(parsed, null, 2))
      setErrorMsg('✅ 格式化成功')
      setTimeout(() => setErrorMsg(''), 2000)
    } catch {
      setErrorMsg('❌ JSON 格式错误，请检查语法')
    }
  }

  const validateJson = () => {
    setErrorMsg('')
    try {
      JSON.parse(responseBody)
      setErrorMsg('✅ JSON 格式合法')
      setTimeout(() => setErrorMsg(''), 2000)
    } catch {
      setErrorMsg('❌ JSON 格式错误')
    }
  }

  const copyCodeSnippet = async () => {
    const snippet = `// Mock 配置\n// ${method} ${path}\n// status: ${statusCode}, delay: ${delay}ms\nconst mockResponse = ${responseBody}`
    await navigator.clipboard.writeText(snippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Mock 接口生成</h1>
        <p className="text-app-muted text-sm">可视化编写 mock 接口，生成 JSON 模拟响应，复制到项目，全部在本地浏览器运行</p>
      </div>

      <div className="grid md:grid-cols-2 gap-10">
        {/* 左：配置区 */}
        <div className="space-y-5">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">请求方法</label>
            <div className="relative">
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full appearance-none bg-app-bg border border-gray-300 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 hover:bg-gray-50 cursor-pointer"
              >
                <option>GET</option>
                <option>POST</option>
                <option>PUT</option>
                <option>DELETE</option>
                <option>PATCH</option>
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">▼</div>
            </div>
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">接口路径 Path</label>
            <input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              placeholder="/api/example"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">HTTP 状态码</label>
              <input
                type="number"
                value={statusCode}
                onChange={(e) => setStatusCode(Number(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">模拟延迟 (ms)</label>
              <input
                type="number"
                value={delay}
                onChange={(e) => setDelay(Number(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={formatJson}
              className="px-4 py-2.5 bg-violet-500 text-white text-sm font-medium rounded-lg hover:bg-violet-600 active:scale-95 transition-all shadow-sm shadow-violet-500/20"
            >
              格式化 JSON
            </button>
            <button
              onClick={validateJson}
              className="px-4 py-2.5 bg-gray-100 text-gray-700 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 active:scale-95 transition-all"
            >
              校验 JSON
            </button>
            <button
              onClick={copyCodeSnippet}
              className="px-4 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 active:scale-95 transition-all"
            >
              {copied ? '✓ 已复制' : '📋 复制片段'}
            </button>
          </div>

          {errorMsg && (
            <div className={`text-sm font-medium ${errorMsg.startsWith('✅') ? 'text-emerald-600' : 'text-red-500'}`}>
              {errorMsg}
            </div>
          )}
        </div>

        {/* 右：JSON 编辑区 */}
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700">Response JSON</label>
          <textarea
            value={responseBody}
            onChange={(e) => setResponseBody(e.target.value)}
            className="w-full h-96 px-4 py-3 border border-app-border bg-gray-900 text-emerald-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
            spellCheck={false}
          />
        </div>
      </div>

      {/* 说明卡片 */}
      <div className="mt-10 p-4 bg-gray-50 border border-app-border rounded-xl">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">使用说明</h3>
        <ul className="text-xs text-app-muted space-y-1.5 leading-relaxed">
          <li>• 配置请求方法、路径、状态码和延迟，编写 JSON 响应体</li>
          <li>• 点击「格式化 JSON」自动美化缩进，点击「校验 JSON」检查语法</li>
          <li>• 点击「复制片段」将 Mock 配置导出为代码片段，可直接粘贴到项目中</li>
          <li>• 所有操作在浏览器本地完成，数据不会上传到任何服务器</li>
        </ul>
      </div>

      <FooterNote />
    </div>
  )
}