'use client'

import { useState, useEffect } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

export default function MarkdownPreviewPage() {
  const [md, setMd] = useState(`# Hello Markdown
- 列表项A
- 列表项B

\`\`\`js
const a = 1
\`\`\`
`)
  const [html, setHtml] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const rawHtml = marked.parse(md) as string
    const cleanHtml = DOMPurify.sanitize(rawHtml)
    setHtml(cleanHtml)
  }, [md])

  const copyHtml = async () => {
    await navigator.clipboard.writeText(html)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Markdown 预览</h1>
        <p className="text-app-muted text-sm">Markdown 实时渲染预览，支持代码高亮，一键复制 HTML</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* 左侧编辑 */}
        <div>
          <div className="mb-2 text-sm font-medium text-gray-700">Markdown 输入</div>
          <textarea
            value={md}
            onChange={e => setMd(e.target.value)}
            className="w-full h-96 border border-gray-300 rounded-xl p-4 font-mono text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
            placeholder="输入 Markdown..."
          />
        </div>

        {/* 右侧预览 */}
        <div>
          <div className="mb-2 text-sm font-medium text-gray-700">实时预览</div>
          <div
            className="w-full h-96 border border-gray-300 rounded-xl p-4 overflow-auto prose max-w-none bg-app-bg"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>

      {/* 操作区 */}
      <div className="flex gap-3 mt-4">
        <button
          onClick={copyHtml}
          className="px-5 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 active:scale-95 transition-all"
        >
          {copied ? '✓ 已复制 HTML' : '📋 复制 HTML 输出'}
        </button>
        <button
          onClick={() => { setMd(''); setCopied(false) }}
          className="px-5 py-2.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-xl text-sm font-medium hover:bg-orange-100 active:scale-95 transition-all"
        >
          清空
        </button>
      </div>

      <FooterNote />
    </div>
  )
}