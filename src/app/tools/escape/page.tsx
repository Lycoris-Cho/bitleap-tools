'use client'
import { useState } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

export default function EscapeToolPage() {
  const [input, setInput] = useState(`<div>hello "world"</div>`)
  const [copied, setCopied] = useState<string | null>(null)

  // ===== HTML 转义（& 最先）=====
  const htmlEscape = (s: string) =>
    s.replace(/&/g, '&amp;')
     .replace(/</g, '&lt;')
     .replace(/>/g, '&gt;')
     .replace(/"/g, '&quot;')
     .replace(/'/g, '&#039;')

  // ===== HTML 反转义（&amp; 放最后，顺序正确 + SSR/CSR 一致）=====
  const htmlUnescape = (s: string) =>
    s.replace(/&#039;/g, "'")
     .replace(/&quot;/g, '"')
     .replace(/&gt;/g, '>')
     .replace(/&lt;/g, '<')
     .replace(/&amp;/g, '&')

  // ===== JS 转义 =====
  const jsEscape = (s: string) => JSON.stringify(s).slice(1, -1)

  // ===== JS 反转义 =====
  const jsUnescape = (s: string) => {
    try {
      return JSON.parse(`"${s.replace(/"/g, '\\"')}"`)
    } catch {
      return ''
    }
  }

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 1500)
  }

  const clearAll = () => {
    setInput('')
    setCopied(null)
  }

  const operations = [
    { label: 'HTML 转义', value: htmlEscape(input) },
    { label: 'HTML 反转义', value: htmlUnescape(input) },
    { label: 'JS 字符串转义', value: jsEscape(input) },
    { label: 'JS 字符串反转义', value: jsUnescape(input) },
  ]

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">字符串转义工具</h1>
        <p className="text-app-muted text-sm">HTML / JS 字符串转义与反转义，本地实时处理</p>
      </div>

      {/* 输入区 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">输入文本</label>
          <button
            onClick={clearAll}
            className="text-xs text-orange-600 hover:text-orange-700 font-medium"
          >
            清空
          </button>
        </div>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          className="w-full h-40 border border-gray-300 rounded-xl p-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
          placeholder="输入待处理文本..."
        />
      </div>

      {/* 结果卡片 */}
      <div className="grid gap-4">
        {operations.map(item => (
          <div key={item.label} className="border border-app-border rounded-xl p-4 bg-app-bg hover:border-violet-200 transition-all group">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  {item.label}
                </div>
                <div className="font-mono text-sm text-gray-800 break-all">
                  {item.value || <span className="text-gray-400 italic">（空）</span>}
                </div>
              </div>
              <button
                onClick={() => copy(item.value, item.label)}
                disabled={!item.value}
                className="shrink-0 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {copied === item.label ? '✓ 已复制' : '📋 复制'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 说明 */}
      <div className="mt-10 p-4 bg-gray-50 border border-app-border rounded-xl">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">使用说明</h3>
        <ul className="text-xs text-app-muted space-y-1.5 leading-relaxed">
          <li>• <strong>HTML 转义</strong>：将 &lt; &gt; &quot; 等字符转为 HTML 实体，防止 XSS</li>
          <li>• <strong>HTML 反转义</strong>：将 HTML 实体还原为原始字符</li>
          <li>• <strong>JS 字符串转义</strong>：将字符串转为可在 JS 中安全使用的转义格式（如 \n \t \"）</li>
          <li>• <strong>JS 字符串反转义</strong>：将转义后的字符串还原（需输入合法的 JS 转义序列）</li>
        </ul>
      </div>

      <FooterNote />
    </div>
  )
}