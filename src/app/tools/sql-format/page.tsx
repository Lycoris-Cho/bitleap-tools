'use client'
import { useState } from 'react'
import { format } from 'sql-formatter'
import { Breadcrumb } from '@/components/breadcrumb'
export default function SqlFormatPage() {
  const [input, setInput] = useState('select id,name from user where age>10')
  const [output, setOutput] = useState('')
  const [err, setErr] = useState('')
  // 新增状态：记录当前选中操作
  const [activeMode, setActiveMode] = useState<'format' | 'minify'>('format')

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

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <Breadcrumb />
      <h1 className="text-2xl font-bold mb-2">SQL格式化压缩</h1>
      <p className="text-gray-500 mb-4">SQL美化排版 / 压缩一行</p>
      <div className="flex gap-3 mb-4 flex-wrap">
        <button
          onClick={doFormat}
          className={`px-4 py-2 rounded-lg transition-all duration-200 ${
            activeMode === 'format'
              ? 'bg-black text-white hover:bg-gray-800 active:bg-gray-700'
              : 'border border-gray-300 hover:bg-gray-100 active:bg-gray-200'
          }`}
        >
          格式化美化
        </button>
        <button
          onClick={doMinify}
          className={`px-4 py-2 rounded-lg transition-all duration-200 ${
            activeMode === 'minify'
              ? 'bg-black text-white hover:bg-gray-800 active:bg-gray-700'
              : 'border border-gray-300 hover:bg-gray-100 active:bg-gray-200'
          }`}
        >
          压缩为一行
        </button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <div className="mb-1 font-medium">SQL输入</div>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            className="w-full h-80 border border-gray-300 rounded-xl p-3 font-mono text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-black/20"
          />
        </div>
        <div>
          <div className="mb-1 font-medium">输出</div>
          <textarea readOnly value={output} className="w-full h-80 border border-gray-300 rounded-xl p-3 font-mono text-sm bg-gray-50" />
        </div>
      </div>
      {err && <div className="mt-2 text-red-500">{err}</div>}
      <button onClick={() => navigator.clipboard.writeText(output)} className="mt-3 px-3 py-1.5 border border-gray-300 rounded-md transition-all duration-200 hover:bg-gray-100 active:bg-gray-200">
        复制输出
      </button>
    </div>
  )
}
