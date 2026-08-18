'use client'

import { useState } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
export default function JsonPage() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')

  // 格式化
  function formatJson() {
    try {
      const parsed = JSON.parse(input)
      setOutput(JSON.stringify(parsed, null, 2))
      setError('')
    } catch (e: any) {
      setError('❌ ' + e.message)
      setOutput('')
    }
  }

  // 压缩
  function minifyJson() {
    try {
      const parsed = JSON.parse(input)
      setOutput(JSON.stringify(parsed))
      setError('')
    } catch (e: any) {
      setError('❌ ' + e.message)
      setOutput('')
    }
  }

  // 清空
  function clearAll() {
    setInput('')
    setOutput('')
    setError('')
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      {/* 标题 */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          JSON 格式化
        </h1>
        <p className="text-app-muted">
          美化、压缩、校验 JSON，所有操作在浏览器本地完成
        </p>
      </div>

      {/* 输入区 */}
      <div className="space-y-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='例如：{"name":"BitLeap","version":"1.0"}'
          className="w-full h-40 p-4 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none"
        />

        {/* 按钮区 */}
        <div className="flex flex-wrap gap-4">
          <button
            onClick={formatJson}
            className="px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition font-medium"
          >
            格式化
          </button>
          <button
            onClick={minifyJson}
            className="px-6 py-3 bg-gray-100 text-gray-800 rounded-xl hover:bg-gray-200 transition font-medium"
          >
            压缩
          </button>
          <button
            onClick={clearAll}
            className="px-6 py-3 bg-gray-100 text-gray-800 rounded-xl hover:bg-gray-200 transition font-medium"
          >
            清空
          </button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-mono">
            {error}
          </div>
        )}

        {/* 结果展示 */}
        {output && (
          <div className="mt-6">
            <div className="text-sm text-gray-500 mb-2">格式化结果</div>
            <pre className="p-5 bg-gray-50 border border-app-border rounded-xl overflow-auto text-sm font-mono whitespace-pre-wrap break-all">
              {output}
            </pre>
          </div>
        )}
      </div>

      {/* SEO 文案 */}
      <section className="mt-16 pt-10 border-t border-app-border">
        <h2 className="text-lg font-semibold mb-3">使用说明</h2>
        <ul className="text-sm text-app-muted space-y-2 leading-relaxed">
          <li>• 支持 JSON 美化（格式化）与压缩</li>
          <li>• 自动校验 JSON 语法，错误位置清晰提示</li>
          <li>• 不发送任何数据到服务器，完全本地运行</li>
          <li>• 适合 API 调试、配置文件查看</li>
        </ul>
      </section>
    </div>
  )
}