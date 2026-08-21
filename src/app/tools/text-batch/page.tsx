'use client'
import { useState } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

export default function TextBatch() {
  // ===== 公共 =====
  const [stats, setStats] = useState('')

  // ===== 区域一：文本去重 =====
  const [dedupInput, setDedupInput] = useState('')
  const [dedupOutput, setDedupOutput] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(true)
  const [keepEmptyLines, setKeepEmptyLines] = useState(false)

  // ===== 区域二：批量处理 =====
  const [batchInput, setBatchInput] = useState('')
  const [batchOutput, setBatchOutput] = useState('')
  // 批量替换
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  // 前缀后缀
  const [prefix, setPrefix] = useState('')
  const [suffix, setSuffix] = useState('')
  // 行号
  const [lineNumFormat, setLineNumFormat] = useState('{n}. ')

  // ==================== 文本去重逻辑 ====================
  const handleDedup = () => {
    const rawLines = dedupInput.split(/\r?\n/)
    const seen = new Set<string>()
    const result: string[] = []
    let emptyCount = 0

    for (const line of rawLines) {
      if (line.trim() === '') {
        if (keepEmptyLines) result.push(line)
        else emptyCount++
        continue
      }
      const key = caseSensitive ? line : line.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        result.push(line)
      }
    }

    const originalNonEmpty = rawLines.filter(l => l.trim() !== '').length
    const duplicatesRemoved = originalNonEmpty - result.filter(l => l.trim() !== '').length

    setDedupOutput(result.join('\n'))
    setStats(`原始 ${rawLines.length} 行 → 处理后 ${result.length} 行` +
      (duplicatesRemoved > 0 ? `（去除 ${duplicatesRemoved} 个重复）` : '') +
      (emptyCount > 0 && !keepEmptyLines ? `（跳过 ${emptyCount} 个空行）` : ''))
  }

  const removeEmpty = () => {
    const rawLines = dedupInput.split(/\r?\n/)
    const result = rawLines.filter(l => l.trim() !== '')
    setDedupOutput(result.join('\n'))
    setStats(`已删除空行，剩余 ${result.length} 行`)
  }

  const trimAll = () => {
    const result = dedupInput.split(/\r?\n/).map(l => l.trim())
    setDedupOutput(result.join('\n'))
    setStats('已去除每行首尾空格')
  }

  // ==================== 批量处理逻辑 ====================
  // 批量替换
  const batchReplace = () => {
    if (!findText) return
    const result = batchInput.split(/\r?\n/).map(line =>
      line.split(findText).join(replaceText)
    )
    setBatchOutput(result.join('\n'))
    setStats(`已将 "${findText}" 替换为 "${replaceText}"`)
  }

  // 批量前缀
  const addPrefix = () => {
    if (!prefix) return
    const result = batchInput.split(/\r?\n/).map(line => prefix + line)
    setBatchOutput(result.join('\n'))
    setStats(`已添加前缀 "${prefix}"`)
  }

  // 批量后缀
  const addSuffix = () => {
    if (!suffix) return
    const result = batchInput.split(/\r?\n/).map(line => line + suffix)
    setBatchOutput(result.join('\n'))
    setStats(`已添加后缀 "${suffix}"`)
  }

  // 批量行号
  const addLineNumbers = () => {
    const result = batchInput.split(/\r?\n/).map((line, i) => {
      const num = String(i + 1)
      return lineNumFormat.replace('{n}', num) + line
    })
    setBatchOutput(result.join('\n'))
    setStats(`已添加行号，格式 "${lineNumFormat}"`)
  }

  // 全部大写/小写
  const batchUpper = () => { setBatchOutput(batchInput.toUpperCase()); setStats('已转为大写') }
  const batchLower = () => { setBatchOutput(batchInput.toLowerCase()); setStats('已转为小写') }

  // 复制
  const copy = async (text: string, label: string) => {
    if (!text) return
    await navigator.clipboard.writeText(text)
    setStats(`${label}已复制到剪贴板`)
  }

  // 清空
  const clearDedup = () => { setDedupInput(''); setDedupOutput(''); setStats('') }
  const clearBatch = () => { setBatchInput(''); setBatchOutput(''); setStats('') }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
      <Breadcrumb />
      <div>
        <h1 className="text-2xl font-bold text-app-text mb-1">文本去重 & 批量处理</h1>
        <p className="text-app-muted text-sm">行去重、清理空行、批量查找替换、前缀后缀、行号编号，所有操作本地完成</p>
      </div>

      {/* ==================== 区域一：文本去重 ==================== */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-app-text">文本去重</h2>
          <span className="text-xs text-app-muted bg-app-card px-2 py-1 rounded-lg">去重 · 清理</span>
        </div>

        {/* 选项 */}
        <div className="flex flex-wrap gap-4 p-4 bg-app-card border border-app-border rounded-xl">
          <label className="flex items-center gap-2 text-sm text-app-text cursor-pointer">
            <input type="checkbox" checked={caseSensitive} onChange={e => setCaseSensitive(e.target.checked)} className="rounded border-gray-300" />
            区分大小写
          </label>
          <label className="flex items-center gap-2 text-sm text-app-text cursor-pointer">
            <input type="checkbox" checked={keepEmptyLines} onChange={e => setKeepEmptyLines(e.target.checked)} className="rounded border-gray-300" />
            保留空行
          </label>
        </div>

        {/* 输入输出 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-app-text block mb-2">输入文本</label>
            <textarea
              value={dedupInput}
              onChange={e => setDedupInput(e.target.value)}
              className="w-full h-64 p-3 rounded-xl border border-app-border bg-app-bg text-app-text text-sm focus:outline-none focus:border-violet-400 resize-none"
              placeholder="粘贴多行文本……"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-app-text">去重结果</label>
              {stats && <span className="text-xs text-app-muted">{stats}</span>}
            </div>
            <textarea
              readOnly
              value={dedupOutput}
              className="w-full h-64 p-3 rounded-xl border border-app-border bg-app-bg text-app-text text-sm resize-none"
            />
          </div>
        </div>

        {/* 按钮区 */}
        <div className="flex flex-wrap gap-2">
          <button onClick={handleDedup} className="px-4 py-2 bg-violet-500 text-white rounded-xl text-sm font-medium hover:bg-violet-600 active:scale-95 transition">
            行去重
          </button>
          <button onClick={removeEmpty} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 active:scale-95 transition">
            删除空行
          </button>
          <button onClick={trimAll} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 active:scale-95 transition">
            每行去首尾空格
          </button>
          <button onClick={() => copy(dedupOutput, '去重结果')} className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 active:scale-95 transition">
            复制结果
          </button>
          <button onClick={clearDedup} className="px-4 py-2 bg-orange-50 text-orange-600 border border-orange-200 rounded-xl text-sm font-medium hover:bg-orange-100 active:scale-95 transition">
            清空
          </button>
        </div>
      </section>

      {/* ==================== 区域二：批量处理 ==================== */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-app-text">批量处理</h2>
          <span className="text-xs text-app-muted bg-app-card px-2 py-1 rounded-lg">替换 · 前缀 · 行号</span>
        </div>

        {/* 批量操作参数 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 查找替换 */}
          <div className="p-3 bg-app-card border border-app-border rounded-xl space-y-2">
            <div className="text-xs font-medium text-app-text">批量查找替换</div>
            <input value={findText} onChange={e => setFindText(e.target.value)} placeholder="查找内容" className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-bg text-sm focus:outline-none focus:border-violet-400" />
            <input value={replaceText} onChange={e => setReplaceText(e.target.value)} placeholder="替换为" className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-bg text-sm focus:outline-none focus:border-violet-400" />
            <button onClick={batchReplace} className="w-full px-3 py-2 bg-violet-500 text-white rounded-lg text-sm font-medium hover:bg-violet-600 transition">
              执行替换
            </button>
          </div>

          {/* 前缀后缀 */}
          <div className="p-3 bg-app-card border border-app-border rounded-xl space-y-2">
            <div className="text-xs font-medium text-app-text">添加前缀 / 后缀</div>
            <input value={prefix} onChange={e => setPrefix(e.target.value)} placeholder="前缀（如 tool-）" className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-bg text-sm focus:outline-none focus:border-violet-400" />
            <input value={suffix} onChange={e => setSuffix(e.target.value)} placeholder="后缀（如 .css）" className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-bg text-sm focus:outline-none focus:border-violet-400" />
            <div className="flex gap-2">
              <button onClick={addPrefix} className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition">加前缀</button>
              <button onClick={addSuffix} className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition">加后缀</button>
            </div>
          </div>

          {/* 行号 */}
          <div className="p-3 bg-app-card border border-app-border rounded-xl space-y-2">
            <div className="text-xs font-medium text-app-text">添加行号</div>
            <input value={lineNumFormat} onChange={e => setLineNumFormat(e.target.value)} placeholder="{n}. " className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-bg text-sm focus:outline-none focus:border-violet-400" />
            <p className="text-xs text-app-muted">用 <code className="text-violet-500">{'{n}'}</code> 代表序号</p>
            <button onClick={addLineNumbers} className="w-full px-3 py-2 bg-violet-500 text-white rounded-lg text-sm font-medium hover:bg-violet-600 transition">
              添加行号
            </button>
          </div>

          {/* 快速转换 */}
          <div className="p-3 bg-app-card border border-app-border rounded-xl space-y-2">
            <div className="text-xs font-medium text-app-text">快速转换</div>
            <button onClick={batchUpper} className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition">全部大写</button>
            <button onClick={batchLower} className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition">全部小写</button>
          </div>
        </div>

        {/* 输入输出 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-app-text block mb-2">输入文本</label>
            <textarea
              value={batchInput}
              onChange={e => setBatchInput(e.target.value)}
              className="w-full h-64 p-3 rounded-xl border border-app-border bg-app-bg text-app-text text-sm focus:outline-none focus:border-violet-400 resize-none"
              placeholder="粘贴需要批量处理的文本……"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-app-text">处理结果</label>
              {stats && <span className="text-xs text-app-muted">{stats}</span>}
            </div>
            <textarea
              readOnly
              value={batchOutput}
              className="w-full h-64 p-3 rounded-xl border border-app-border bg-app-bg text-app-text text-sm resize-none"
            />
          </div>
        </div>

        {/* 按钮区 */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => copy(batchOutput, '批量处理结果')} className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 active:scale-95 transition">
            复制结果
          </button>
          <button onClick={clearBatch} className="px-4 py-2 bg-orange-50 text-orange-600 border border-orange-200 rounded-xl text-sm font-medium hover:bg-orange-100 active:scale-95 transition">
            清空
          </button>
        </div>
      </section>
      <FooterNote />
    </div>
  )
}