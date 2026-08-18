'use client'

import { useState } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
export default function TimestampPage() {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<{
    seconds?: number
    milliseconds?: number
    readable?: string
  } | null>(null)
  const [error, setError] = useState('')

  // 判断是秒还是毫秒
  function detectTimestampType(value: string): 'seconds' | 'milliseconds' | null {
    const num = Number(value.trim())
    if (isNaN(num)) return null
    if (num >= 1e12) return 'milliseconds' // 13 位
    if (num >= 1e9) return 'seconds'        // 10 位
    return null
  }

  function convert() {
    setError('')
    setResult(null)

    const trimmed = input.trim()
    if (!trimmed) {
      setError('请输入时间戳或时间字符串')
      return
    }

    // 尝试解析为时间戳
    const timestampType = detectTimestampType(trimmed)
    if (timestampType) {
      const num = Number(trimmed)
      const ms = timestampType === 'seconds' ? num * 1000 : num
      const date = new Date(ms)

      if (isNaN(date.getTime())) {
        setError('无效的时间戳')
        return
      }

      setResult({
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
      })
      return
    }

    // 尝试解析为时间字符串
    const date = new Date(trimmed)
    if (!isNaN(date.getTime())) {
      const ms = date.getTime()
      setResult({
        seconds: Math.floor(ms / 1000),
        milliseconds: ms,
        readable: date.toLocaleString('zh-CN'),
      })
      return
    }

    setError('无法识别输入，请输入时间戳或时间字符串（如 1700000000 或 2023-11-14 22:13:20）')
  }

  function fillNow() {
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
    setError('')
    setResult(null)
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      {/* 标题 */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          时间戳转换
        </h1>
        <p className="text-app-muted">
          Unix 时间戳与可读时间的双向转换，支持秒 / 毫秒自动识别
        </p>
      </div>

      {/* 输入区 */}
      <div className="space-y-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入时间戳（1700000000）或时间（2023-11-14 22:13:20）"
          className="w-full h-32 p-4 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
        />

        {/* 按钮区 */}
        <div className="flex flex-wrap gap-4">
          <button
            onClick={convert}
            className="px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition font-medium"
          >
            转换
          </button>
          <button
            onClick={fillNow}
            className="px-6 py-3 bg-gray-100 text-gray-800 rounded-xl hover:bg-gray-200 transition font-medium"
          >
            填入当前时间
          </button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* 结果展示 */}
        {result && (
          <div className="space-y-4 mt-6">
            <div className="p-5 bg-gray-50 border border-app-border rounded-xl">
              <div className="text-sm text-gray-500 mb-1">可读时间</div>
              <div className="font-mono text-lg break-all">{result.readable}</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 bg-gray-50 border border-app-border rounded-xl">
                <div className="text-sm text-gray-500 mb-1">秒（10 位）</div>
                <div className="font-mono text-lg break-all">{result.seconds}</div>
              </div>
              <div className="p-5 bg-gray-50 border border-app-border rounded-xl">
                <div className="text-sm text-gray-500 mb-1">毫秒（13 位）</div>
                <div className="font-mono text-lg break-all">{result.milliseconds}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SEO 文案 */}
      <section className="mt-16 pt-10 border-t border-app-border">
        <h2 className="text-lg font-semibold mb-3">使用说明</h2>
        <ul className="text-sm text-app-muted space-y-2 leading-relaxed">
          <li>• 支持 Unix 时间戳（秒 / 毫秒）与可读时间的双向转换</li>
          <li>• 自动识别 10 位（秒）或 13 位（毫秒）时间戳</li>
          <li>• 支持常见时间格式，如 2023-11-14 22:13:20</li>
          <li>• 所有计算均在浏览器本地完成，不发送任何数据到服务器</li>
        </ul>
      </section>
    </div>
  )
}