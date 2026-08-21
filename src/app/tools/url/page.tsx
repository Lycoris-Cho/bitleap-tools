'use client'

import { useState } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

export default function UrlPage() {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<'encode' | 'decode'>('encode')
  const [copied, setCopied] = useState(false)

  // 实时编码
  const encoded = (() => {
    if (mode !== 'encode' || !input) return ''
    try {
      return encodeURIComponent(input)
    } catch {
      return ''
    }
  })()

  // 实时解码
  const decoded = (() => {
    if (mode !== 'decode' || !input) return ''
    try {
      return decodeURIComponent(input)
    } catch {
      return ''
    }
  })()

  const output = mode === 'encode' ? encoded : decoded

  const hasError = (() => {
    if (!input) return false
    if (mode === 'encode') return !encoded
    return !decoded
  })()

  const errorMessage = mode === 'encode'
    ? '编码失败，请检查输入'
    : '解码失败：不是合法的 URL 编码字符串'

  const copy = async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const clearAll = () => {
    setInput('')
    setCopied(false)
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">URL 编解码</h1>
        <p className="text-app-muted text-sm">对 URL 参数进行编码与解码，支持中文与特殊字符，实时转换</p>
      </div>

      {/* 模式切换 */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={() => setMode('encode')}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            mode === 'encode'
              ? 'bg-violet-500 text-white shadow-sm shadow-violet-500/20'
              : 'bg-app-bg border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          编码
        </button>
        <button
          onClick={() => setMode('decode')}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            mode === 'decode'
              ? 'bg-violet-500 text-white shadow-sm shadow-violet-500/20'
              : 'bg-app-bg border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          解码
        </button>
        <button
          onClick={clearAll}
          className="px-5 py-2.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-xl text-sm font-medium hover:bg-orange-100 active:scale-95 transition-all"
        >
          清空
        </button>
      </div>

      {/* 输入区 */}
      <div className="space-y-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === 'encode' ? '输入待编码的文本或 URL...' : '输入 %E4%BD%A0 等编码字符串...'}
          className="w-full h-40 p-4 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
        />

        {/* 错误提示 */}
        {hasError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-mono">
            ❌ {errorMessage}
          </div>
        )}

        {/* 结果展示 */}
        {output && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                {mode === 'encode' ? '编码结果' : '解码结果'}
              </span>
              <button
                onClick={copy}
                className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 active:scale-95 transition-all"
              >
                {copied ? '✓ 已复制' : '📋 复制结果'}
              </button>
            </div>
            <pre className="p-5 bg-gray-900 text-emerald-300 border border-app-border rounded-xl overflow-auto text-sm font-mono whitespace-pre-wrap break-all max-h-96">
{output}
            </pre>
          </div>
        )}
      </div>

      {/* 说明卡片 */}
      <div className="mt-10 p-4 bg-gray-50 border border-app-border rounded-xl">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">使用说明</h3>
        <ul className="text-xs text-app-muted space-y-1.5 leading-relaxed">
          <li>• 编码：将中文、空格、特殊字符转换为 <code className="font-mono bg-white px-1 rounded">%XX</code> URL 安全格式</li>
          <li>• 解码：将 <code className="font-mono bg-white px-1 rounded">%E4%BD%A0</code> 还原为原始字符</li>
          <li>• 常用于 URL 参数构造、表单调试、API 请求拼接</li>
          <li>• 所有计算均在浏览器本地完成，不发送任何数据</li>
        </ul>
      </div>

      <FooterNote />
    </div>
  )
}