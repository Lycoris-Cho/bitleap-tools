'use client'
import { useState } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

// ===== 统一归一化 → 单词数组 =====
const toWords = (s: string) =>
  s.trim()
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_.]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

const toCamel = (s: string) =>
  toWords(s).map((w, i) =>
    i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()
  ).join('')

const toPascal = (s: string) =>
  toWords(s).map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join('')

const toSnake = (s: string) =>
  toWords(s).map(w => w.toLowerCase()).join('_')

const toKebab = (s: string) =>
  toWords(s).map(w => w.toLowerCase()).join('-')

const toConstant = (s: string) =>
  toWords(s).map(w => w.toUpperCase()).join('_')

export default function CaseConvertPage() {
  const [input, setInput] = useState('helloWorld')
  const [copied, setCopied] = useState<string | null>(null)

  const list = [
    { label: '小驼峰', sub: 'camelCase', value: toCamel(input) },
    { label: '大驼峰', sub: 'PascalCase', value: toPascal(input) },
    { label: '下划线', sub: 'snake_case', value: toSnake(input) },
    { label: '短横线', sub: 'kebab-case', value: toKebab(input) },
    { label: '常量', sub: 'CONSTANT_CASE', value: toConstant(input) },
  ]

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 1500)
  }

  const clearInput = () => {
    setInput('')
    setCopied(null)
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">变量命名转换</h1>
        <p className="text-app-muted text-sm">驼峰、大驼峰、下划线、短横线、常量格式互相转换</p>
      </div>

      {/* 输入区 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">输入文本</label>
          <button
            onClick={clearInput}
            className="text-xs text-orange-600 hover:text-orange-700 font-medium"
          >
            清空
          </button>
        </div>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          className="w-full border border-gray-300 rounded-xl p-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 transition-all"
          placeholder="hello_world / helloWorld / HelloWorld / hello-world / hello.world"
        />
      </div>

      {/* 结果卡片 */}
      <div className="space-y-3">
        {list.map(item => (
          <div
            key={item.label}
            className="border border-app-border rounded-xl p-4 flex items-center justify-between bg-app-bg hover:border-violet-200 transition-all group"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {item.label}
                </span>
                <span className="text-xs text-app-muted font-mono">
                  {item.sub}
                </span>
              </div>
              <div className="font-mono text-base text-gray-800 break-all">
                {item.value || <span className="text-gray-400 italic text-sm">（空）</span>}
              </div>
            </div>
            <button
              onClick={() => copy(item.value, item.label)}
              disabled={!item.value}
              className="shrink-0 ml-4 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {copied === item.label ? '✓ 已复制' : '📋 复制'}
            </button>
          </div>
        ))}
      </div>

      {/* 说明 */}
      <div className="mt-10 p-4 bg-gray-50 border border-app-border rounded-xl">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">支持的输入格式</h3>
        <div className="flex flex-wrap gap-2 text-xs text-app-muted">
          {['camelCase', 'PascalCase', 'snake_case', 'kebab-case', 'CONSTANT_CASE', 'dot.notation'].map(f => (
            <span key={f} className="px-2 py-1 bg-white border border-app-border rounded-lg font-mono">{f}</span>
          ))}
        </div>
      </div>

      <FooterNote/>
    </div>
  )
}