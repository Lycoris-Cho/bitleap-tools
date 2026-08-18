'use client'

import { useState } from 'react'
import { generateData, FIELD_OPTIONS } from './generator'
import { Breadcrumb } from '@/components/breadcrumb'
export default function FakeData() {
  const [seed, setSeed] = useState('bitleap')
  const [count, setCount] = useState(10)
  const [selectedFields, setSelectedFields] = useState<string[]>(['姓名', '邮箱', '手机号'])
  const [results, setResults] = useState<Record<string, string>[]>([])
  const [copied, setCopied] = useState<string | null>(null)

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1200)
  }

  const toggleField = (key: string) => {
    setSelectedFields(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const generate = () => {
    const data = generateData({ seed, count })
    setResults(data)
  }

  const exportJson = () => {
    const filtered = results.map(row => {
      const r: Record<string, string> = {}
      selectedFields.forEach(k => { r[k] = row[k] })
      return r
    })
    copy(JSON.stringify(filtered, null, 2), 'json')
  }

  const exportCsv = () => {
    const headers = selectedFields.join(',')
    const rows = results.map(row =>
      selectedFields.map(k => `"${row[k]?.replace(/"/g, '""') ?? ''}"`).join(',')
    )
    copy(`${headers}\n${rows.join('\n')}`, 'csv')
  }

  const exportSql = () => {
    const headers = selectedFields.map(k => `\`${k}\``).join(', ')
    const rows = results.map(row =>
      `(${selectedFields.map(k => `'${row[k]?.replace(/'/g, "\\'") ?? ''}'`).join(', ')})`
    )
    const sql = `INSERT INTO users (${headers}) VALUES\n${rows.join(',\n')};`
    copy(sql, 'sql')
  }

  return (
    <div className="flex w-full h-[calc(100vh-4rem)] overflow-hidden bg-gray-50/50">
      {/* 左侧配置 */}
      <div className="w-56 shrink-0 h-full overflow-y-auto border-r border-app-border/60 bg-app-bg/80 backdrop-blur-xl p-4 space-y-5">
        <div>
          <h2 className="text-xs font-bold text-app-muted uppercase tracking-wider mb-2">种子（Seed）</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={seed}
              onChange={e => setSeed(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-app-border rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <button
              onClick={() => setSeed(Math.random().toString(36).slice(2, 8))}
              className="px-2.5 py-2 text-xs bg-gray-100 text-app-muted rounded-xl hover:bg-gray-200 transition"
            >
              随机
            </button>
          </div>
          <p className="text-xs text-app-muted mt-1.5">相同种子 = 相同数据，可复现</p>
        </div>

        <div>
          <h2 className="text-xs font-bold text-app-muted uppercase tracking-wider mb-2">字段选择</h2>
          <div className="space-y-1.5">
            {FIELD_OPTIONS.map(f => (
              <label key={f.key} className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedFields.includes(f.key)}
                  onChange={() => toggleField(f.key)}
                  className="w-4 h-4 rounded border-gray-300 text-app-text focus:ring-gray-900"
                />
                <span className="text-sm text-gray-700 group-hover:text-app-text transition">{f.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xs font-bold text-app-muted uppercase tracking-wider mb-2">生成数量</h2>
          <select
            value={count}
            onChange={e => setCount(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-app-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            {[1, 5, 10, 20, 50, 100].map(n => (
              <option key={n} value={n}>{n} 条</option>
            ))}
          </select>
        </div>

        <button
          onClick={generate}
          className="w-full py-3 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 active:scale-95 transition-all"
        >
          生成数据
        </button>
      </div>

      {/* 右侧结果 */}
      <div className="flex-1 h-full overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">
        <Breadcrumb />
          <div className="mb-6">
            <h1 className="text-2xl font-black text-app-text mb-1">数据生成器</h1>
            <p className="text-sm text-gray-500">带种子的假数据生成器，相同种子 = 相同结果，可复现、可分享</p>
          </div>

          {results.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-app-muted text-sm">
              左侧配置好后点击「生成数据」
            </div>
          ) : (
            <>
              {/* 表格 */}
              <div className="bg-app-bg/80 backdrop-blur-xl border border-app-border/60 rounded-2xl overflow-hidden mb-4">
                <div className="overflow-x-auto table-scroll">
                  <table className="w-full text-sm min-w-[600px]">
                    {/* 表头 */}
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        {selectedFields.map(k => (
                          <th key={k} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    {/* 表体 */}
                    <tbody>
                      {results.map((row, i) => (
                        <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition">
                          {selectedFields.map(k => (
                            <td key={k} className="px-4 py-2.5 text-gray-800 font-mono text-xs whitespace-nowrap truncate max-w-[160px]" title={row[k]}>
                              {row[k]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 只在这个页面生效的滚动条样式 */}
              <style>{`
  .table-scroll::-webkit-scrollbar {
    height: 8px;
  }
  .table-scroll::-webkit-scrollbar-track {
    background: transparent;
  }
  .table-scroll::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 9999px;
  }
  .table-scroll::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
  }
  .table-scroll {
    scrollbar-width: thin;
    scrollbar-color: #d1d5db transparent;
  }
`}</style>

              {/* 导出 */}
              <div className="flex gap-2 flex-wrap">
                <button onClick={exportJson} className="px-4 py-2 text-xs bg-app-bg border border-app-border rounded-lg hover:bg-gray-50 transition">
                  {copied === 'json' ? '✓ 已复制' : '📋 复制 JSON'}
                </button>
                <button onClick={exportCsv} className="px-4 py-2 text-xs bg-app-bg border border-app-border rounded-lg hover:bg-gray-50 transition">
                  {copied === 'csv' ? '✓ 已复制' : '📋 复制 CSV'}
                </button>
                <button onClick={exportSql} className="px-4 py-2 text-xs bg-app-bg border border-app-border rounded-lg hover:bg-gray-50 transition">
                  {copied === 'sql' ? '✓ 已复制' : '📋 复制 SQL INSERT'}
                </button>
              </div>
            </>
          )}

          <p className="text-center text-xs text-app-muted mt-10">
            BitLeap · 本地计算 · 隐私优先
          </p>
        </div>
      </div>
    </div>
  )
}