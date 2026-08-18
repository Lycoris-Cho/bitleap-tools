'use client'
import { useState } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
export default function EscapeToolPage() {
  const [input, setInput] = useState(`<div>hello "world"</div>`)
  const [output, setOutput] = useState('')

  const htmlEscape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
  const htmlUnescape = (s: string) =>
    s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'")
  const jsEscape = (s: string) => JSON.stringify(s).slice(1, -1)
  const jsUnescape = (s: string) => {
    try {
      return JSON.parse(`"${s}"`)
    } catch {
      return '解析失败'
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <Breadcrumb />
      <h1 className="text-2xl font-bold mb-2">字符串转义工具</h1>
      <p className="text-gray-500 mb-6">HTML / JS 字符串转义、反转义</p>

      <textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        className="w-full h-40 border rounded-lg p-3 font-mono mb-4"
        placeholder="输入待处理文本"
      />

      <div className="grid gap-3">
        {[
          { label: 'HTML 转义', value: htmlEscape(input) },
          { label: 'HTML 反转义', value: htmlUnescape(input) },
          { label: 'JS字符串转义', value: jsEscape(input) },
          { label: 'JS字符串反转义', value: jsUnescape(input) },
        ].map(item => (
          <div key={item.label} className="border rounded-lg p-4 flex justify-between items-center">
            <div className="flex-1 mr-4">
              <div className="text-sm text-gray-500">{item.label}</div>
              <div className="font-mono mt-1 break-all">{item.value}</div>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(item.value)}
              className="px-3 py-1.5 border rounded text-sm hover:bg-gray-100"
            >
              复制
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
