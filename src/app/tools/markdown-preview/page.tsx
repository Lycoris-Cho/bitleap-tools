'use client'
import { useState, useEffect } from 'react'
import { marked } from 'marked'
import { Breadcrumb } from '@/components/breadcrumb'
export default function MarkdownPreviewPage() {
  const [md, setMd] = useState(`# Hello Markdown
- 列表项A
- 列表项B

\`\`\`js
const a = 1
\`\`\`
`)
  const [html, setHtml] = useState('')

  useEffect(() => {
    setHtml(marked.parse(md) as string)
  }, [md])

  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <Breadcrumb />
      <h1 className="text-2xl font-bold mb-2">Markdown预览</h1>
      <p className="text-gray-500 mb-6">Markdown实时渲染预览，复制HTML</p>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <div className="mb-1 font-medium">Markdown</div>
          <textarea
            value={md}
            onChange={e => setMd(e.target.value)}
            className="w-full h-96 border border-gray-300 rounded-xl p-3 font-mono text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-black/20"
          />
        </div>
        <div>
          <div className="mb-1 font-medium">预览</div>
          <div
            className="w-full h-96 border border-gray-300 rounded-xl p-3 overflow-auto prose max-w-none bg-app-bg"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
      <button
        className="mt-4 px-4 py-2 bg-black text-white rounded-lg transition-all duration-200 hover:bg-gray-800 active:bg-gray-700"
        onClick={() => navigator.clipboard.writeText(html)}
      >
        复制HTML输出
      </button>
    </div>
  )
}
