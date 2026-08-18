'use client'
import { useState } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
export default function RegexTestPage() {
  const [pattern, setPattern] = useState('\\d+')
  const [flags, setFlags] = useState('g')
  const [text, setText] = useState('abc123def456')
  const [result, setResult] = useState<string[]>([])
  const [err, setErr] = useState('')

  const run = () => {
    setErr('')
    try {
      const reg = new RegExp(pattern, flags)
      const matches: string[] = []
      let m: RegExpExecArray | null
      if (flags.includes('g')) {
        while ((m = reg.exec(text)) !== null) {
          matches.push(m[0])
        }
      } else {
        m = reg.exec(text)
        if (m) matches.push(m[0])
      }
      setResult(matches)
    } catch (e: any) {
      setErr(e.message)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <Breadcrumb />
      <h1 className="text-2xl font-bold mb-2">正则测试器</h1>
      <p className="text-gray-500 mb-6">输入正则与测试文本，查看匹配结果</p>

      <div className="flex gap-3 mb-4 flex-wrap items-end">
        <div>
          <label className="text-sm text-gray-600">正则表达式</label>
          <input
            value={pattern}
            onChange={e => setPattern(e.target.value)}
            className="border border-gray-300 rounded-xl p-2 font-mono w-64 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-black/20"
            placeholder="\\d+"
          />
        </div>
        <div>
          <label className="text-sm text-gray-600">标志(gim)</label>
          <input
            value={flags}
            onChange={e => setFlags(e.target.value)}
            className="border border-gray-300 rounded-xl p-2 font-mono w-20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-black/20"
          />
        </div>
        <button onClick={run} className="px-4 py-2 bg-black text-white rounded-lg transition-all duration-200 hover:bg-gray-800 active:bg-gray-700">
          执行匹配
        </button>
      </div>

      <div className="mb-4">
        <label className="block text-sm mb-1 text-gray-600">待测试文本</label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          className="w-full h-32 border border-gray-300 rounded-xl p-3 font-mono transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-black/20"
        />
      </div>

      {err && <div className="text-red-500 mb-3">{err}</div>}

      <div>
        <div className="font-medium mb-2">匹配结果 {result.length > 0 && `(${result.length})`}</div>
        {result.length === 0 ? (
          <div className="text-gray-400">无匹配</div>
        ) : (
          <div className="space-y-2">
            {result.map((r, i) => (
              <div key={i} className="font-mono border border-gray-200 rounded-xl p-3 bg-app-bg">{r}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
