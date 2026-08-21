'use client'
import { useState } from 'react'
import { format } from 'sql-formatter'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

export default function SqlFormatPage() {
  const [input, setInput] = useState('select id,name from user where age>10')
  const [output, setOutput] = useState('')
  const [err, setErr] = useState('')
  const [activeMode, setActiveMode] = useState<'format' | 'minify'>('format')
  const [copied, setCopied] = useState(false)

  const doFormat = () => {
    setActiveMode('format')
    setErr('')
    try {
      const res = format(input, { language: 'mysql' })
      setOutput(res)
    } catch (e: any) {
      setErr(String(e))
    }
  }
  const doMinify = () => {
    setActiveMode('minify')
    setErr('')
    try {
      const res = format(input, { language: 'mysql' })
      setOutput(res.replace(/\s+/g, ' ').trim())
    } catch (e: any) {
      setErr(String(e))
    }
  }

  const copyOutput = async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      <h1 className="text-3xl font-bold tracking-tight mb-2">SQL 格式化压缩</h1>
      <p className="text-app-muted text-sm mb-6">SQL 美化排版 / 压缩一行</p>

      <div className="flex gap-3 mb-4 flex-wrap">
        <button
          onClick={doFormat}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeMode === 'format'
              ? 'bg-violet-500 text-white shadow-sm shadow-violet-500/20'
              : 'bg-app-bg border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          格式化美化
        </button>
        <button
          onClick={doMinify}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeMode === 'minify'
              ? 'bg-violet-500 text-white shadow-sm shadow-violet-500/20'
              : 'bg-app-bg border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          压缩为一行
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4 items-start">
        {/* 左列 */}
        <div>
          <div className="mb-2 text-sm font-medium text-gray-700">SQL 输入</div>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            className="w-full h-80 border border-gray-300 rounded-xl p-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
          />
        </div>

        {/* 右列 */}
        <div>
          <div className="mb-2 text-sm font-medium text-gray-700">输出</div>
          <textarea
            readOnly
            value={output}
            className="w-full h-80 border border-gray-300 rounded-xl p-4 font-mono text-sm bg-gray-900 text-emerald-300 resize-none"
          />
          <button
            onClick={copyOutput}
            disabled={!output}
            className="mt-3 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {copied ? '✓ 已复制' : '📋 复制输出'}
          </button>
        </div>
      </div>

      {err && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-mono">
          ❌ {err}
        </div>
      )}

      <FooterNote />
    </div>
  )
}