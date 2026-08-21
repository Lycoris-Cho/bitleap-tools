'use client'
import { useState, useMemo } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

// ========== LCS 行级 Diff 算法 ==========
function lcsDiff(a: string[], b: string[]) {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])

  const result: { a?: string; b?: string; type: 'same' | 'del' | 'add' }[] = []
  let i = m, j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.unshift({ a: a[i - 1], b: b[j - 1], type: 'same' })
      i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ b: b[j - 1], type: 'add' })
      j--
    } else {
      result.unshift({ a: a[i - 1], type: 'del' })
      i--
    }
  }
  return result
}

// ========== 字符级 Diff ==========
function charDiff(oldStr: string, newStr: string) {
  let start = 0, endA = oldStr.length - 1, endB = newStr.length - 1
  while (start <= endA && start <= endB && oldStr[start] === newStr[start]) start++
  while (endA >= start && endB >= start && oldStr[endA] === newStr[endB]) { endA--; endB-- }
  return {
    prefix: oldStr.slice(0, start),
    removed: start <= endA ? oldStr.slice(start, endA + 1) : '',
    added: start <= endB ? newStr.slice(start, endB + 1) : '',
    suffix: oldStr.slice(endA + 1),
  }
}

export default function TextCompare() {
  const [text1, setText1] = useState('')
  const [text2, setText2] = useState('')
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false)
  const [charLevel, setCharLevel] = useState(false)

  const stats = useMemo(() => {
    const linesA = text1.split(/\r?\n/)
    const linesB = text2.split(/\r?\n/)
    return { linesA: linesA.length, linesB: linesB.length }
  }, [text1, text2])

  const diff = useMemo(() => {
    let a = text1.split(/\r?\n/)
    let b = text2.split(/\r?\n/)
    if (ignoreWhitespace) {
      a = a.map(l => l.trim())
      b = b.map(l => l.trim())
    }
    return lcsDiff(a, b)
  }, [text1, text2, ignoreWhitespace])

  const addedCount = diff.filter(d => d.type === 'add').length
  const deletedCount = diff.filter(d => d.type === 'del').length
  const sameCount = diff.filter(d => d.type === 'same').length
  const isIdentical = addedCount === 0 && deletedCount === 0 && text1 === text2

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Breadcrumb />
      <h1 className="text-2xl font-bold text-app-text mb-1">文本比对查重</h1>
      <p className="text-app-muted text-sm mb-6">对比两段文本，高亮新增、删除行</p>

      {/* 选项 */}
      <div className="flex flex-wrap gap-4 mb-4 p-4 bg-app-card border border-app-border rounded-xl">
        <label className="flex items-center gap-2 text-sm text-app-text cursor-pointer">
          <input type="checkbox" checked={ignoreWhitespace} onChange={e => setIgnoreWhitespace(e.target.checked)} className="rounded border-gray-300" />
          忽略首尾空白
        </label>
        <label className="flex items-center gap-2 text-sm text-app-text cursor-pointer">
          <input type="checkbox" checked={charLevel} onChange={e => setCharLevel(e.target.checked)} className="rounded border-gray-300" />
          行内字符级高亮
        </label>
      </div>

      {/* 输入区 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-app-text block mb-2">
            文本 A（旧）· {stats.linesA} 行
          </label>
          <textarea
            value={text1}
            onChange={e => setText1(e.target.value)}
            className="w-full h-64 p-3 rounded-xl border border-app-border bg-app-bg text-app-text text-sm focus:outline-none focus:border-violet-400 resize-none"
            placeholder="粘贴原始文本……"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-app-text block mb-2">
            文本 B（新）· {stats.linesB} 行
          </label>
          <textarea
            value={text2}
            onChange={e => setText2(e.target.value)}
            className="w-full h-64 p-3 rounded-xl border border-app-border bg-app-bg text-app-text text-sm focus:outline-none focus:border-violet-400 resize-none"
            placeholder="粘贴修改后的文本……"
          />
        </div>
      </div>

      {/* 统计摘要 */}
      <div className="mt-6 flex flex-wrap gap-4 text-xs">
        <span className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600">
          {isIdentical ? '✅ 文本完全相同' : `共 ${sameCount} 行相同`}
        </span>
        {deletedCount > 0 && (
          <span className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600">
            {deletedCount} 行删除
          </span>
        )}
        {addedCount > 0 && (
          <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600">
            {addedCount} 行新增
          </span>
        )}
      </div>

      {/* 比对结果 */}
      <div className="mt-4">
        <h3 className="text-sm font-medium text-app-text mb-2">比对结果</h3>
        <div className="rounded-xl border border-app-border bg-app-bg p-3 font-mono text-sm max-h-96 overflow-auto">
          {diff.length === 0 ? (
            <div className="text-app-muted text-center py-8">输入文本后查看比对结果</div>
          ) : isIdentical ? (
            <div className="text-app-muted text-center py-8">两段文本完全一致，无差异</div>
          ) : (
            diff.map((item, idx) => {

              // ===== 删除行 =====
              if (item.type === 'del') {
                if (charLevel && item.a && item.b === undefined) {
                  const nextAdd = diff[idx + 1]
                  if (nextAdd && nextAdd.type === 'add' && nextAdd.b) {
                    const { prefix, removed, added: addedText, suffix } = charDiff(item.a, nextAdd.b)
                    return (
                      <div key={idx} className="flex">
                        <span className="w-6 shrink-0 text-red-400 select-none">-</span>
                        <span className="bg-red-500/10 text-red-600 dark:text-red-400 flex-1 font-mono break-all">
                          {prefix}
                          <span className="bg-red-500/30 rounded px-0.5">{removed}</span>
                          {suffix}
                        </span>
                      </div>
                    )
                  }
                }
                return (
                  <div key={idx} className="flex">
                    <span className="w-6 shrink-0 text-red-400 select-none">-</span>
                    <span className="bg-red-500/10 text-red-600 dark:text-red-400 flex-1 break-all">{item.a}</span>
                  </div>
                )
              }

              // ===== 新增行 =====
              if (item.type === 'add') {
                const prevDel = diff[idx - 1]
                if (charLevel && prevDel && prevDel.type === 'del' && prevDel.a) {
                  const { prefix, added: addedText, suffix } = charDiff(prevDel.a, item.b || '')
                  return (
                    <div key={idx} className="flex">
                      <span className="w-6 shrink-0 text-emerald-400 select-none">+</span>
                      <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex-1 font-mono break-all">
                        {prefix}
                        <span className="bg-emerald-500/30 rounded px-0.5">{addedText}</span>
                        {suffix}
                      </span>
                    </div>
                  )
                }
                return (
                  <div key={idx} className="flex">
                    <span className="w-6 shrink-0 text-emerald-400 select-none">+</span>
                    <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex-1 break-all">{item.b}</span>
                  </div>
                )
              }

              // ===== 相同行 =====
              return (
                <div key={idx} className="flex">
                  <span className="w-6 shrink-0 text-gray-300 select-none"> </span>
                  <span className="text-app-text flex-1 break-all">{item.a}</span>
                </div>
              )
            })
          )}
        </div>
      </div>
      <FooterNote />
    </div>
  )
}