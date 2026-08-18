'use client'

import { useState } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
export default function UrlPage() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')

  // 编码
  function encode() {
    try {
      setError('')
      const encoded = encodeURIComponent(input)
      setOutput(encoded)
    } catch {
      setError('编码失败，请检查输入')
    }
  }

  // 解码
  function decode() {
    try {
      setError('')
      const decoded = decodeURIComponent(input)
      setOutput(decoded)
    } catch {
      setError('解码失败：不是合法的 URL 编码字符串')
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
          URL 编解码
        </h1>
        <p className="text-app-muted">
          对 URL 参数进行编码与解码，支持中文与特殊字符
        </p>
      </div>

      {/* 输入区 */}
      <div className="space-y-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入 URL 或编码后的字符串，例如：?q=比特跃动"
          className="w-full h-40 p-4 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none"
        />

        {/* 按钮区 */}
        <div className="flex flex-wrap gap-4">
          <button
            onClick={encode}
            className="px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition font-medium"
          >
            编码
          </button>
          <button
            onClick={decode}
            className="px-6 py-3 bg-gray-100 text-gray-800 rounded-xl hover:bg-gray-200 transition font-medium"
          >
            解码
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
            <div className="text-sm text-gray-500 mb-2">结果</div>
            <div className="p-5 bg-gray-50 border border-app-border rounded-xl">
              <pre className="text-sm font-mono whitespace-pre-wrap break-all">
                {output}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* SEO 文案 */}
      <section className="mt-16 pt-10 border-t border-app-border">
        <h2 className="text-lg font-semibold mb-3">使用说明</h2>
        <ul className="text-sm text-app-muted space-y-2 leading-relaxed">
          <li>• 编码：将中文、空格、特殊字符转换为 URL 安全格式</li>
          <li>• 解码：将 %E4%BD%A0 还原为原始字符</li>
          <li>• 常用于 URL 参数、表单提交、API 调试</li>
          <li>• 所有计算均在浏览器本地完成，不发送任何数据</li>
        </ul>
      </section>
    </div>
  )
}