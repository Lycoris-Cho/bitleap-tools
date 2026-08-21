'use client'

import { useState } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

export default function JsonPage() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  function formatJson() {
    try {
      const parsed = JSON.parse(input)
      setOutput(JSON.stringify(parsed, null, 2))
      setError('')
    } catch (e: any) {
      setError(e.message || 'JSON 解析失败')
      setOutput('')
    }
  }

  function minifyJson() {
    try {
      const parsed = JSON.parse(input)
      setOutput(JSON.stringify(parsed))
      setError('')
    } catch (e: any) {
      setError(e.message || 'JSON 解析失败')
      setOutput('')
    }
  }

  function clearAll() {
    setInput('')
    setOutput('')
    setError('')
    setCopied(false)
  }

  async function copyOutput() {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">JSON 格式化</h1>
        <p className="text-app-muted text-sm">美化、压缩、校验 JSON，所有操作在浏览器本地完成</p>
      </div>

      {/* 输入区 */}
      <div className="space-y-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='例如：{"name":"BitLeap","version":"1.0"}'
          className="w-full h-40 p-4 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
        />

        {/* 按钮区 */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={formatJson}
            className="px-6 py-3 bg-violet-500 text-white rounded-xl text-sm font-medium hover:bg-violet-600 active:scale-95 transition-all shadow-sm shadow-violet-500/20"
          >
            格式化
          </button>
          <button
            onClick={minifyJson}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 active:scale-95 transition-all"
          >
            压缩
          </button>
          <button
            onClick={clearAll}
            className="px-6 py-3 bg-orange-50 text-orange-600 border border-orange-200 rounded-xl text-sm font-medium hover:bg-orange-100 active:scale-95 transition-all"
          >
            清空
          </button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-mono">
            ❌ {error}
          </div>
        )}

        {/* 结果展示 */}
        {output && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">格式化结果</span>
              <button
                onClick={copyOutput}
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
          <li>• 支持 JSON 美化（格式化）与压缩，一键复制结果</li>
          <li>• 自动校验 JSON 语法，错误位置清晰提示</li>
          <li>• 不发送任何数据到服务器，完全本地运行</li>
          <li>• 适合 API 调试、配置文件查看</li>
        </ul>
      </div>

      <FooterNote />
    </div>
  )
}