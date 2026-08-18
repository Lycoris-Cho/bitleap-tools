'use client'

import { useState } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'

export default function Base64Page() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')

  function encode() {
    try {
      setError('')
      const encoded = btoa(encodeURIComponent(input))
      setOutput(encoded)
    } catch {
      setError('编码失败：输入内容可能包含不支持的字符')
    }
  }

  function decode() {
    try {
      setError('')
      const decoded = decodeURIComponent(atob(input))
      setOutput(decoded)
    } catch {
      setError('解码失败：不是合法的 Base64 字符串')
    }
  }

  function clearAll() {
    setInput('')
    setOutput('')
    setError('')
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Base64 编解码
        </h1>
        <p className="text-app-muted">
          文本与 Base64 互转，支持中文与 UTF-8 字符
        </p>
      </div>

      <div className="space-y-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入文本或 Base64 字符串..."
          className="w-full h-40 p-4 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none"
        />

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

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-mono">
            {error}
          </div>
        )}

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

      <section className="mt-16 pt-10 border-t border-app-border">
        <h2 className="text-lg font-semibold mb-3">使用说明</h2>
        <ul className="text-sm text-app-muted space-y-2 leading-relaxed">
          <li>• 支持文本编码为 Base64，以及 Base64 解码为文本</li>
          <li>• 完全兼容 UTF-8，支持中文、Emoji 等特殊字符</li>
          <li>• 常用于数据传输、图片内嵌、配置加密等场景</li>
          <li>• 所有计算均在浏览器本地完成，不发送任何数据</li>
        </ul>
      </section>
    </div>
  )
}