'use client'
import { useState } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

export default function RegexTestPage() {
  const [pattern, setPattern] = useState('\\d+')
  const [flags, setFlags] = useState('g')
  const [text, setText] = useState('abc123def456')
  const [result, setResult] = useState<string[]>([])
  const [err, setErr] = useState('')
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  const run = () => {
    setErr('')
    setCopiedIdx(null)
    try {
      const reg = new RegExp(pattern, flags)
      const matches: string[] = []
      let m: RegExpExecArray | null

      if (flags.includes('g')) {
        while ((m = reg.exec(text)) !== null) {
          matches.push(m[0])
          // 防止零宽断言无限循环
          if (reg.lastIndex === m.index) reg.lastIndex++
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

  const copy = async (val: string, idx: number) => {
    await navigator.clipboard.writeText(val)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 1500)
  }

  const copyAll = async () => {
    if (result.length === 0) return
    await navigator.clipboard.writeText(result.join('\n'))
    setCopiedIdx(-1)
    setTimeout(() => setCopiedIdx(null), 1500)
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">正则测试器</h1>
        <p className="text-app-muted text-sm">输入正则与测试文本，实时查看匹配结果</p>
      </div>

      {/* 正则 + 标志 + 执行 */}
      <div className="flex gap-3 mb-6 flex-wrap items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">正则表达式</label>
          <input
            value={pattern}
            onChange={e => setPattern(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            placeholder="\d+"
          />
        </div>
        <div className="w-28 shrink-0">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">标志</label>
          <input
            value={flags}
            onChange={e => setFlags(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            placeholder="g"
          />
        </div>
        <button
          onClick={run}
          className="px-6 py-2.5 bg-violet-500 text-white rounded-xl text-sm font-medium hover:bg-violet-600 active:scale-95 transition-all shadow-sm shadow-violet-500/20 shrink-0"
        >
          执行匹配
        </button>
      </div>

      {/* 测试文本 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">待测试文本</label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          className="w-full h-32 px-4 py-3 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
        />
      </div>

      {/* 错误提示 */}
      {err && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-mono">
          ❌ {err}
        </div>
      )}

      {/* 匹配结果 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            匹配结果 {result.length > 0 && `(${result.length})`}
          </span>
          {result.length > 1 && (
            <button
              onClick={copyAll}
              className="px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 active:scale-95 transition-all"
            >
              {copiedIdx === -1 ? '✓ 已复制全部' : '📋 复制全部'}
            </button>
          )}
        </div>
        {result.length === 0 ? (
          <div className="text-sm text-app-muted py-8 text-center border-2 border-dashed border-gray-200 rounded-xl">
            无匹配
          </div>
        ) : (
          <div className="space-y-2">
            {result.map((r, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-4 py-3 border border-app-border rounded-xl bg-app-bg hover:border-violet-200 transition-all group">
                <span className="font-mono text-sm text-gray-800 break-all">{r}</span>
                <button
                  onClick={() => copy(r, i)}
                  className="shrink-0 px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 active:scale-95 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                >
                  {copiedIdx === i ? '✓' : '📋'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <FooterNote />
    </div>
  )
}