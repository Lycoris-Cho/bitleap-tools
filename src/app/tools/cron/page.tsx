'use client'

import { useState } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

type Period = 'minute' | 'hour' | 'day' | 'week' | 'month'

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'minute', label: '每分钟' },
  { value: 'hour', label: '每小时' },
  { value: 'day', label: '每天' },
  { value: 'week', label: '每周' },
  { value: 'month', label: '每月' },
]

const WEEK_OPTIONS = [
  { value: 0, label: '周日' },
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
]

export default function CronPage() {
  const [period, setPeriod] = useState<Period>('day')
  const [minute, setMinute] = useState(0)
  const [hour, setHour] = useState(2)
  const [weekday, setWeekday] = useState(1)
  const [copied, setCopied] = useState(false)

  const buildCron = (): string => {
    switch (period) {
      case 'minute': return '* * * * *'
      case 'hour': return `${minute} * * * *`
      case 'day': return `${minute} ${hour} * * *`
      case 'week': return `${minute} ${hour} * * ${weekday}`
      case 'month': return `${minute} ${hour} 1 * *`
      default: return '* * * * *'
    }
  }

  const humanize = (): string => {
    switch (period) {
      case 'minute': return '每分钟执行一次'
      case 'hour': return `每小时第 ${minute} 分钟执行`
      case 'day': return `每天 ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} 执行`
      case 'week': return `每周${WEEK_OPTIONS.find(w => w.value === weekday)?.label} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} 执行`
      case 'month': return `每月 1 号 ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} 执行`
      default: return ''
    }
  }

  const cron = buildCron()
  const description = humanize()

  const copy = async () => {
    await navigator.clipboard.writeText(cron)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const reset = () => {
    setPeriod('day')
    setMinute(0)
    setHour(2)
    setWeekday(1)
    setCopied(false)
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Cron 表达式生成器</h1>
        <p className="text-app-muted text-sm">可视化生成定时任务表达式，适用于 Linux Crontab、GitHub Actions 等场景</p>
      </div>

      {/* 周期选择 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">执行周期</label>
        <div className="flex flex-wrap gap-3">
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                period === p.value
                  ? 'bg-violet-500 text-white shadow-sm shadow-violet-500/20'
                  : 'bg-app-bg border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 时间配置 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-8">
        {/* 分钟 */}
        <div className="md:col-span-2">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-700 font-medium">分钟</span>
            <span className="font-mono text-violet-600 font-semibold">{String(minute).padStart(2, '0')}</span>
          </div>
          <input
            type="range"
            min={0}
            max={59}
            value={minute}
            onChange={(e) => setMinute(Number(e.target.value))}
            className="w-full accent-violet-500"
          />
        </div>

        {/* 小时 */}
        {period !== 'minute' && (
          <div className="md:col-span-2">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-700 font-medium">小时</span>
              <span className="font-mono text-violet-600 font-semibold">{String(hour).padStart(2, '0')}</span>
            </div>
            <input
              type="range"
              min={0}
              max={23}
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
              className="w-full accent-violet-500"
            />
          </div>
        )}

        {/* 星期 */}
        {period === 'week' && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-3">星期</label>
            <div className="flex flex-wrap gap-2">
              {WEEK_OPTIONS.map((w) => (
                <button
                  key={w.value}
                  onClick={() => setWeekday(w.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    weekday === w.value
                      ? 'bg-violet-500 text-white shadow-sm shadow-violet-500/20'
                      : 'bg-app-bg border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 操作栏 */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={copy}
          className="px-6 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-xl hover:bg-blue-600 active:scale-95 transition-all"
        >
          {copied ? '✓ 已复制' : '📋 复制 Cron 表达式'}
        </button>
        <button
          onClick={reset}
          className="px-5 py-2.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-xl text-sm font-medium hover:bg-orange-100 active:scale-95 transition-all"
        >
          重置
        </button>
      </div>

      {/* 结果展示 */}
      <div className="mb-6 space-y-3">
        <label className="block text-sm font-medium text-gray-700">Cron 表达式（Linux Crontab）</label>
        <div className="p-5 bg-gray-900 border border-app-border rounded-xl overflow-auto">
          <pre className="text-sm font-mono text-emerald-300 break-all">{cron}</pre>
        </div>
        <div className="flex items-start gap-2 text-sm">
          <span className="text-gray-500 shrink-0">含义：</span>
          <span className="text-gray-800 font-medium">{description}</span>
        </div>
      </div>

      {/* 说明卡片 */}
      <div className="mt-10 p-4 bg-gray-50 border border-app-border rounded-xl">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">使用说明</h3>
        <ul className="text-xs text-app-muted space-y-1.5 leading-relaxed">
          <li>• 生成的是 Linux Crontab 标准 5 字段格式：<code className="font-mono bg-white px-1 rounded">分 时 日 月 星期</code></li>
          <li>• 适用于服务器定时任务、GitHub Actions、Vercel Crons 等场景</li>
          <li>• 每月模式固定为每月 1 号执行，如需其他日期可手动修改表达式</li>
          <li>• 所有操作在浏览器本地完成</li>
        </ul>
      </div>

      <FooterNote />
    </div>
  )
}