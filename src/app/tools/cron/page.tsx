'use client'

import { useState } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
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

  const buildCron = (): string => {
    switch (period) {
      case 'minute':
        return '* * * * *'
      case 'hour':
        return `${minute} * * * *`
      case 'day':
        return `${minute} ${hour} * * *`
      case 'week':
        return `${minute} ${hour} * * ${weekday}`
      case 'month':
        return `${minute} ${hour} 1 * *`
      default:
        return '* * * * *'
    }
  }

  const humanize = (): string => {
    switch (period) {
      case 'minute':
        return '每分钟执行一次'
      case 'hour':
        return `每小时第 ${minute} 分钟执行`
      case 'day':
        return `每天 ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} 执行`
      case 'week':
        return `每周${WEEK_OPTIONS.find(w => w.value === weekday)?.label} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} 执行`
      case 'month':
        return `每月 1 号 ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} 执行`
      default:
        return ''
    }
  }

  const cron = buildCron()
  const description = humanize()

  const copy = () => {
    navigator.clipboard.writeText(cron)
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      {/* 标题 */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          ⏰ Cron 表达式生成器
        </h1>
        <p className="text-app-muted">
          可视化生成定时任务表达式，适用于 Linux Crontab、GitHub Actions 等场景
        </p>
      </div>

      {/* 周期选择 */}
      <div className="mb-8">
        <label className="block text-sm font-medium mb-3">
          执行周期
        </label>
        <div className="flex flex-wrap gap-3">
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-5 py-3 rounded-xl border text-sm font-medium transition ${
                period === p.value
                  ? 'bg-black text-white border-black'
                  : 'bg-app-bg text-gray-800 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 时间配置 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* 分钟 */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>分钟</span>
            <span className="font-mono">{String(minute).padStart(2, '0')}</span>
          </div>
          <input
            type="range"
            min={0}
            max={59}
            value={minute}
            onChange={(e) => setMinute(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* 小时（仅在 hour / day / week / month 可用） */}
        {period !== 'minute' && (
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>小时</span>
              <span className="font-mono">{String(hour).padStart(2, '0')}</span>
            </div>
            <input
              type="range"
              min={0}
              max={23}
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
              className="w-full"
            />
          </div>
        )}

        {/* 星期（仅在 week 可用） */}
        {period === 'week' && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-3">
              星期
            </label>
            <div className="flex flex-wrap gap-3">
              {WEEK_OPTIONS.map((w) => (
                <button
                  key={w.value}
                  onClick={() => setWeekday(w.value)}
                  className={`px-4 py-2 rounded-xl border text-sm transition ${
                    weekday === w.value
                      ? 'bg-black text-white border-black'
                      : 'bg-app-bg text-gray-800 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 结果展示 */}
      <div className="mb-10 space-y-4">
        <label className="block text-sm font-medium">
          Cron 表达式（Linux Crontab）
        </label>
        <div className="p-5 bg-gray-50 border border-app-border rounded-xl">
          <pre className="text-sm font-mono break-all">{cron}</pre>
        </div>

        <div className="text-sm text-gray-700">
          <strong>含义：</strong>
          {description}
        </div>

        <button
          onClick={copy}
          className="px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition font-medium"
        >
          复制 Cron 表达式
        </button>
      </div>

      {/* 说明 */}
      <div className="text-sm text-gray-500 leading-relaxed">
        <p className="mb-2">
          当前生成的是 <strong>Linux Crontab 标准 5 字段格式</strong>，
          适用于服务器定时任务、GitHub Actions、Vercel Crons 等场景。
        </p>
        <p>
          格式：<code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">
            分 时 日 月 星期
          </code>
        </p>
      </div>
    </div>
  )
}