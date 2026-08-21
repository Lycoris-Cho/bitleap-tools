'use client'

import { useState, useMemo, useEffect } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

export default function TimestampPage() {
  const [input, setInput] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  // 页面加载时自动填入当前时间戳（仅客户端，不会 hydration mismatch）
  useEffect(() => {
    const now = new Date()
    setInput(Math.floor(now.getTime() / 1000).toString())
  }, [])

  // 自动识别：秒 or 毫秒
  function detectTimestampType(value: string): 'seconds' | 'milliseconds' | null {
    const num = Number(value.trim())
    if (isNaN(num)) return null
    if (num >= 1e12) return 'milliseconds'
    if (num >= 1e9) return 'seconds'
    return null
  }

  // useMemo 实时计算，不用点按钮
  const { result, error } = useMemo(() => {
    const trimmed = input.trim()
    if (!trimmed) {
      return { result: null, error: '' }
    }

    // 尝试时间戳解析
    const timestampType = detectTimestampType(trimmed)
    if (timestampType) {
      const num = Number(trimmed)
      const ms = timestampType === 'seconds' ? num * 1000 : num
      const date = new Date(ms)
      if (isNaN(date.getTime())) {
        return { result: null, error: '无效的时间戳' }
      }
      return {
        result: {
          seconds: Math.floor(ms / 1000),
          milliseconds: ms,
          readable: date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          }),
        },
        error: '',
      }
    }

    // 尝试时间字符串解析
    const date = new Date(trimmed)
    if (!isNaN(date.getTime())) {
      const ms = date.getTime()
      return {
        result: {
          seconds: Math.floor(ms / 1000),
          milliseconds: ms,
          readable: date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          }),
        },
        error: '',
      }
    }

    return { result: null, error: '无法识别输入，请输入时间戳或时间字符串（如 1700000000 或 2023-11-14 22:13:20）' }
  }, [input])

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  const fillNow = () => {
    const now = new Date()
    setInput(now.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).replace(/\//g, '-'))
  }

  const resultRows = result ? [
    { label: '可读时间', value: result.readable!, copyKey: 'readable' },
    { label: '秒（10 位）', value: String(result.seconds), copyKey: 'seconds' },
    { label: '毫秒（13 位）', value: String(result.milliseconds), copyKey: 'milliseconds' },
  ] : []

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">时间戳转换</h1>
        <p className="text-app-muted text-sm">Unix 时间戳与可读时间的双向转换，支持秒 / 毫秒自动识别</p>
      </div>

      {/* 输入区 */}
      <div className="space-y-4">
        <div className="flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入时间戳（1700000000）或时间（2023-11-14 22:13:20）"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
          <button
            onClick={fillNow}
            className="shrink-0 px-5 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 active:scale-95 transition-all"
          >
            填入当前时间
          </button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-mono">
            ❌ {error}
          </div>
        )}

        {/* 结果展示 */}
        {result && (
          <div className="space-y-3 mt-6">
            {resultRows.map(row => (
              <div
                key={row.copyKey}
                className="flex items-center justify-between p-4 bg-app-bg border border-app-border rounded-xl hover:border-violet-200 transition-all"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    {row.label}
                  </div>
                  <div className="font-mono text-sm text-gray-800 break-all">{row.value}</div>
                </div>
                <button
                  onClick={() => copy(row.value, row.copyKey)}
                  className="shrink-0 ml-4 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 active:scale-95 transition-all"
                >
                  {copied === row.copyKey ? '✓ 已复制' : '📋 复制'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 说明卡片 */}
      <div className="mt-10 p-4 bg-gray-50 border border-app-border rounded-xl">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">使用说明</h3>
        <ul className="text-xs text-app-muted space-y-1.5 leading-relaxed">
          <li>• 自动识别 10 位（秒）或 13 位（毫秒）时间戳，实时转换</li>
          <li>• 支持常见时间字符串格式，如 <code className="font-mono bg-white px-1 rounded">2023-11-14 22:13:20</code></li>
          <li>• 所有计算均在浏览器本地完成，不发送任何数据</li>
        </ul>
      </div>

      <FooterNote />
    </div>
  )
}