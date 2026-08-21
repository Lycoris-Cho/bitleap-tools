'use client'

import { useState, useMemo } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

export default function CounterPage() {
  const [text, setText] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const stats = useMemo(() => {
    const content = text

    const charCount = content.length

    const lineCount =
      content === '' ? 0 : content.split('\n').length

    const wordCount = (() => {
      if (!content.trim()) return 0
      const chineseChars = content.match(/[\p{Script=Han}]/gu) || []
      const nonChinese = content
        .replace(/[\p{Script=Han}]/gu, ' ')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
      return chineseChars.length + nonChinese.length
    })()

    const readingTime = Math.max(
      1,
      Math.ceil(wordCount / 300)
    )

    return { charCount, wordCount, lineCount, readingTime }
  }, [text])

  const copy = async (value: string, key: string) => {
    await navigator.clipboard.writeText(value)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  const clearAll = () => {
    setText('')
    setCopied(null)
  }

  const statRows = [
    { label: '字符数', value: String(stats.charCount), copyKey: 'char' },
    { label: '字数', value: String(stats.wordCount), copyKey: 'word' },
    { label: '行数', value: String(stats.lineCount), copyKey: 'line' },
    { label: '阅读分钟', value: String(stats.readingTime), copyKey: 'reading' },
  ]

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">字数统计</h1>
        <p className="text-app-muted text-sm">实时统计字符数、字数、行数与阅读时长</p>
      </div>

      {/* 输入区 */}
      <div className="space-y-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="粘贴或输入需要统计的文本..."
          className="w-full h-64 p-4 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
        />

        {/* 统计结果 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statRows.map(row => (
            <div
              key={row.copyKey}
              className="p-5 bg-app-bg border border-app-border rounded-xl text-center hover:border-violet-200 transition-all group"
            >
              <div className="text-3xl font-black text-gray-800 mb-1">
                {row.value}
              </div>
              <div className="text-xs text-gray-500 mb-3">{row.label}</div>
              <button
                onClick={() => copy(row.value, row.copyKey)}
                className="px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 active:scale-95 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
              >
                {copied === row.copyKey ? '✓ 已复制' : '📋 复制'}
              </button>
            </div>
          ))}
        </div>

        {/* 清空 */}
        <div className="flex justify-end">
          <button
            onClick={clearAll}
            className="px-5 py-2.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-xl text-sm font-medium hover:bg-orange-100 active:scale-95 transition-all"
          >
            清空
          </button>
        </div>
      </div>

      {/* 说明卡片 */}
      <div className="mt-10 p-4 bg-gray-50 border border-app-border rounded-xl">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">使用说明</h3>
        <ul className="text-xs text-app-muted space-y-1.5 leading-relaxed">
          <li>• 实时统计，无需点击按钮，输入即出结果</li>
          <li>• 中文按「字」统计，英文按「单词」统计，符合国内使用习惯</li>
          <li>• 阅读时长按中文 300 字/分钟估算</li>
          <li>• 所有计算均在浏览器本地完成，不保存任何文本</li>
        </ul>
      </div>

      <FooterNote />
    </div>
  )
}