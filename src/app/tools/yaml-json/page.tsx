'use client'
import { useState } from 'react'
import { dump, load } from 'js-yaml'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

export default function YamlJsonPage() {
  const [mode, setMode] = useState<'json2yaml' | 'yaml2json'>('json2yaml')
  const [input, setInput] = useState('{\n  "name": "demo",\n  "age": 18\n}')
  const [output, setOutput] = useState('')
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState(false)

  const handleConvert = () => {
    setErr('')
    try {
      if (mode === 'json2yaml') {
        const obj = JSON.parse(input)
        setOutput(dump(obj, { noRefs: true }))
      } else {
        const obj = load(input)
        setOutput(JSON.stringify(obj, null, 2))
      }
    } catch (e: any) {
      setErr(e.message || '解析失败')
    }
  }

  const copy = async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const clearAll = () => {
    setInput('')
    setOutput('')
    setErr('')
    setCopied(false)
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">YAML ↔ JSON 互转</h1>
        <p className="text-app-muted text-sm">本地格式化、校验、双向转换，数据不出浏览器</p>
      </div>

      {/* 模式切换 */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <button
          onClick={() => setMode('json2yaml')}
          className={`px-5 py-2.5 rounded-xl border text-sm font-medium transition-all ${mode === 'json2yaml' ? 'bg-violet-500 text-white border-violet-500' : 'bg-app-bg border-gray-300 text-gray-700 hover:bg-gray-50'}`}
        >
          JSON → YAML
        </button>
        <button
          onClick={() => setMode('yaml2json')}
          className={`px-5 py-2.5 rounded-xl border text-sm font-medium transition-all ${mode === 'yaml2json' ? 'bg-violet-500 text-white border-violet-500' : 'bg-app-bg border-gray-300 text-gray-700 hover:bg-gray-50'}`}
        >
          YAML → JSON
        </button>
        <button
          onClick={handleConvert}
          className="px-5 py-2.5 bg-violet-500 text-white rounded-xl text-sm font-medium hover:bg-violet-600 active:scale-95 transition-all"
        >
          转换
        </button>
      </div>

      {/* 输入输出 */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <div className="mb-2 text-sm font-medium text-gray-700">输入</div>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            className="w-full h-80 border border-gray-300 rounded-xl p-4 font-mono text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
            placeholder={mode === 'json2yaml' ? '粘贴 JSON...' : '粘贴 YAML...'}
          />
        </div>
        <div>
          <div className="mb-2 text-sm font-medium text-gray-700">输出</div>
          <textarea
            readOnly
            value={output}
            className="w-full h-80 border border-gray-300 rounded-xl p-4 font-mono text-sm bg-gray-50 transition-all duration-200 resize-none"
          />
        </div>
      </div>

      {/* 错误提示 */}
      {err && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-mono">
          ❌ {err}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-3 mt-4">
        <button
          onClick={copy}
          disabled={!output}
          className="px-5 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {copied ? '✓ 已复制' : '📋 复制输出'}
        </button>
        <button
          onClick={clearAll}
          className="px-5 py-2.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-xl text-sm font-medium hover:bg-orange-100 active:scale-95 transition-all"
        >
          清空
        </button>
      </div>

      <FooterNote />
    </div>
  )
}