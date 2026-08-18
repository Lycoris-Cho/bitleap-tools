'use client'

import { useState, useMemo } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
export default function CounterPage() {
  const [text, setText] = useState('')

  const stats = useMemo(() => {
    const content = text

    // 字符数（含空格、换行）
    const charCount = content.length

    // 行数
    const lineCount =
      content === '' ? 0 : content.split('\n').length

    // ✅ 修正后的字数统计
    // 中文：每个汉字 = 1 字
    // 英文/数字：按单词统计
    const wordCount = (() => {
      if (!content.trim()) return 0

      // 匹配所有中文字符
      const chineseChars =
        content.match(/[\p{Script=Han}]/gu) || []

      // 非中文部分按“词”统计（英文、数字等）
      const otherWords = content
        .replace(/[\p{Script=Han}]/gu, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean)

      return chineseChars.length + otherWords.length
    })()

    // 阅读时长（中文按 300 字/分钟）
    const readingTime = Math.max(
      1,
      Math.ceil(wordCount / 300)
    )

    return {
      charCount,
      wordCount,
      lineCount,
      readingTime,
    }
  }, [text])

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      {/* 标题 */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          字数统计
        </h1>
        <p className="text-app-muted">
          实时统计字符数、字数、行数与阅读时长
        </p>
      </div>

      {/* 输入区 */}
      <div className="space-y-6">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="粘贴或输入需要统计的文本..."
          className="w-full h-64 p-4 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none"
        />

        {/* 统计结果 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-5 bg-gray-50 border border-app-border rounded-xl text-center">
            <div className="text-2xl font-bold">
              {stats.charCount}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              字符数
            </div>
          </div>

          <div className="p-5 bg-gray-50 border border-app-border rounded-xl text-center">
            <div className="text-2xl font-bold">
              {stats.wordCount}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              字数
            </div>
          </div>

          <div className="p-5 bg-gray-50 border border-app-border rounded-xl text-center">
            <div className="text-2xl font-bold">
              {stats.lineCount}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              行数
            </div>
          </div>

          <div className="p-5 bg-gray-50 border border-app-border rounded-xl text-center">
            <div className="text-2xl font-bold">
              {stats.readingTime}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              阅读分钟
            </div>
          </div>
        </div>

        {/* 清空按钮 */}
        <div className="flex justify-end">
          <button
            onClick={() => setText('')}
            className="px-6 py-3 bg-gray-100 text-gray-800 rounded-xl hover:bg-gray-200 transition font-medium"
          >
            清空
          </button>
        </div>
      </div>

      {/* SEO 文案 */}
      <section className="mt-16 pt-10 border-t border-app-border">
        <h2 className="text-lg font-semibold mb-3">使用说明</h2>
        <ul className="text-sm text-app-muted space-y-2 leading-relaxed">
          <li>• 实时统计，无需点击按钮</li>
          <li>• 中文按“字”统计，英文按“单词”统计，符合国内使用习惯</li>
          <li>• 阅读时长按中文 300 字/分钟估算</li>
          <li>• 所有计算均在浏览器本地完成，不保存任何文本</li>
        </ul>
      </section>
    </div>
  )
}