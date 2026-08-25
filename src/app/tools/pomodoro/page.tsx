'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

type Task = {
  id: string
  title: string
  done: boolean
  poms: number
}

type Mode = 'focus' | 'short' | 'long'

const MODE_CONFIG: Record<Mode, { label: string; minutes: number; color: string }> = {
  focus: { label: '专注', minutes: 25, color: '#22c55e' },
  short: { label: '短休息', minutes: 5, color: '#22c55e' },
  long:  { label: '长休息', minutes: 15, color: '#22c55e' },
}

const STORAGE_KEY = 'bitleap-pomodoro'

export default function PomodoroPage() {
  const [focusMin, setFocusMin] = useState(25)
  const [shortMin, setShortMin] = useState(5)
  const [longMin, setLongMin] = useState(15)
  const [autoStart, setAutoStart] = useState(false)

  const [mode, setMode] = useState<Mode>('focus')
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [completedPoms, setCompletedPoms] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerEndFiredRef = useRef(false)

  const [tasks, setTasks] = useState<Task[]>([])
  const [input, setInput] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const [streak, setStreak] = useState(0)
  const [todayPoms, setTodayPoms] = useState(0)
  const [error, setError] = useState('')

  // ========== 持久化加载 ==========
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    try {
      const d = JSON.parse(raw)
      if (d.tasks) setTasks(d.tasks)
      if (d.completedPoms !== undefined) setCompletedPoms(d.completedPoms)
      if (d.todayPoms !== undefined) setTodayPoms(d.todayPoms)
      if (d.streak !== undefined) setStreak(d.streak)
      if (d.focusMin) setFocusMin(d.focusMin)
      if (d.shortMin) setShortMin(d.shortMin)
      if (d.longMin) setLongMin(d.longMin)
      if (d.autoStart !== undefined) setAutoStart(d.autoStart)
    } catch {
      setError('加载本地数据失败，已重置为默认值')
    }
  }, [])

  // ========== 持久化保存 ==========
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        tasks, completedPoms, todayPoms, streak, focusMin, shortMin, longMin, autoStart,
      }))
    } catch {
      setError('保存失败，localStorage 可能已满')
    }
  }, [tasks, completedPoms, todayPoms, streak, focusMin, shortMin, longMin, autoStart])

  // ========== 铃声 + 移动端音频解锁 ==========
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAzMzP/AA==')
  }, [])

  // 安全判断：是否支持 Notification
  const hasNotification = typeof window !== 'undefined' && 'Notification' in window

  const playSound = useCallback((isFocusEnd: boolean) => {
    audioRef.current?.play().catch(() => {})
    if (hasNotification && Notification.permission === 'granted') {
      try {
        new Notification('BitLeap 番茄钟', {
          body: isFocusEnd ? '专注结束！休息一下吧 ☕' : '休息结束！开始专注吧 🚀',
          icon: '/favicon.ico',
        })
      } catch {}
    }
  }, [hasNotification])

  const getTotalSeconds = useCallback((m: Mode) => {
    const map: Record<Mode, number> = { focus: focusMin, short: shortMin, long: longMin }
    return map[m] * 60
  }, [focusMin, shortMin, longMin])

  useEffect(() => {
    if (!running) {
      setSecondsLeft(getTotalSeconds(mode))
      timerEndFiredRef.current = false
    }
  }, [focusMin, shortMin, longMin, mode, running, getTotalSeconds])

  const switchMode = useCallback((m: Mode) => {
    setMode(m)
    setSecondsLeft(getTotalSeconds(m))
    setRunning(false)
    timerEndFiredRef.current = false
  }, [getTotalSeconds])

  // tick：只做倒计时递减
  const tick = useCallback(() => {
    setSecondsLeft(prev => {
      if (prev <= 1) {
        return 0
      }
      return prev - 1
    })
  }, [])

  // 计时结束逻辑
  useEffect(() => {
    if (secondsLeft !== 0 || !running) {
      timerEndFiredRef.current = false
      return
    }
    if (timerEndFiredRef.current) return
    timerEndFiredRef.current = true

    setRunning(false)

    if (mode === 'focus') {
      playSound(true)
      setCompletedPoms(p => p + 1)
      setTodayPoms(p => p + 1)
      const next = completedPoms + 1
      if (next % 4 === 0) {
        switchMode('long')
      } else {
        switchMode('short')
      }
    } else {
      playSound(false)
      if (autoStart) {
        switchMode('focus')
        setRunning(true)
      } else {
        switchMode('focus')
      }
    }
  }, [secondsLeft, running, mode, completedPoms, autoStart, switchMode, playSound])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(tick, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, tick])

  // ✅ 修复：核心点击函数，增加 Notification 安全判断，避免移动端报错中断
  const toggleTimer = () => {
    // 第一次点击：同时解锁移动端音频（必须在用户交互同步上下文）
    if (!running) {
      audioRef.current?.play().then(() => {
        audioRef.current?.pause()
        audioRef.current && (audioRef.current.currentTime = 0)
      }).catch(() => {})

      // 安全请求通知权限
      if (hasNotification && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {})
      }
    }

    setRunning(r => !r)
  }

  const skip = () => {
    setRunning(false)
    timerEndFiredRef.current = false
    if (mode === 'focus') {
      const next = completedPoms + 1
      if (next % 4 === 0) switchMode('long')
      else switchMode('short')
    } else {
      switchMode('focus')
    }
  }

  const reset = () => {
    setRunning(false)
    timerEndFiredRef.current = false
    setSecondsLeft(getTotalSeconds(mode))
  }

  const addTask = () => {
    const t = input.trim()
    if (!t) {
      setError('任务内容不能为空')
      return
    }
    setError('')
    setTasks(prev => [...prev, { id: Math.random().toString(36).slice(2, 9), title: t, done: false, poms: 0 }])
    setInput('')
  }

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const addPomToTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, poms: t.poms + 1 } : t))
  }

  const [dragId, setDragId] = useState<string | null>(null)
  const onDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id)
    e.dataTransfer.effectAllowed = 'move'
  }
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }
  const onDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!dragId || dragId === targetId) return
    setTasks(prev => {
      const from = prev.findIndex(t => t.id === dragId)
      const to = prev.findIndex(t => t.id === targetId)
      if (from < 0 || to < 0) return prev
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
    setDragId(null)
  }

  const timeDisplay = useMemo(() => {
    const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
    const ss = String(secondsLeft % 60).padStart(2, '0')
    return `${mm}:${ss}`
  }, [secondsLeft])

  const progress = useMemo(() => {
    const total = getTotalSeconds(mode)
    return 1 - secondsLeft / total
  }, [secondsLeft, mode, getTotalSeconds])

  const circumference = 2 * Math.PI * 120
  const strokeDashoffset = circumference * (1 - progress)

  const activeTasks = tasks.filter(t => !t.done)
  const doneTasks = tasks.filter(t => t.done)

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      setError('复制失败')
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-10 touch-manipulation">
      <Breadcrumb />

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2 text-gray-900">番茄时钟 & 任务看板</h1>
        <p className="text-app-muted text-sm">番茄计时 + 任务管理 + 统计打卡，纯本地运行，数据不丢失</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-mono">
          ❌ {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">

        {/* ===== 左侧：计时器 ===== */}
        <div className="space-y-4">
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
            {(Object.entries(MODE_CONFIG) as [Mode, typeof MODE_CONFIG[Mode]][]).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => { setRunning(false); switchMode(key) }}
                className={`flex-1 py-2.5 text-xs font-medium rounded-lg transition-all ${
                  mode === key
                    ? 'bg-white shadow-sm text-emerald-600'
                    : 'text-gray-500'
                }`}
              >
                {cfg.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col items-center py-6">
            <div className="relative w-[260px] h-[260px]">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 260 260">
                <circle cx="130" cy="130" r="120" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                <circle
                  cx="130" cy="130" r="120" fill="none"
                  stroke={MODE_CONFIG[mode].color}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold tabular-nums text-gray-900">{timeDisplay}</span>
                <span className="text-xs text-gray-500 mt-2">{MODE_CONFIG[mode].label}</span>
              </div>
            </div>

            {/* ✅ 修复：加大按钮高度，保证移动端点击热区 ≥ 44px */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={toggleTimer}
                className="px-6 py-3 bg-violet-500 text-white text-sm font-medium rounded-xl hover:bg-violet-600 active:scale-95 transition-all shadow-lg shadow-violet-500/25 min-h-[44px]"
              >
                {running ? '暂停' : '开始'}
              </button>
              <button
                onClick={skip}
                className="px-4 py-3 text-sm border border-app-border rounded-xl text-gray-800 hover:bg-gray-50 transition-colors min-h-[44px]"
              >
                ⏭ 跳过
              </button>
              <button
                onClick={reset}
                className="px-4 py-3 text-sm border border-app-border rounded-xl text-gray-800 hover:bg-gray-50 transition-colors min-h-[44px]"
              >
                ↺ 重置
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: '🍅', value: todayPoms, label: '今日' },
              { icon: '🔥', value: streak, label: '连续天数' },
              { icon: '✨', value: completedPoms, label: '累计番茄' },
            ].map((item, i) => (
              <div key={i} className="p-3 bg-white rounded-xl border border-app-border text-center">
                <div className="text-xl">{item.icon}</div>
                <div className="text-lg font-bold text-gray-900">{item.value}</div>
                <div className="text-[10px] text-gray-400">{item.label}</div>
              </div>
            ))}
          </div>

          <details className="p-3 bg-white rounded-xl border border-app-border">
            <summary className="text-xs font-medium text-gray-700 cursor-pointer py-1">⚙️ 设置</summary>
            <div className="mt-3 space-y-2">
              {([
                ['专注', focusMin, setFocusMin],
                ['短休', shortMin, setShortMin],
                ['长休', longMin, setLongMin],
              ] as [string, number, (n: number) => void][]).map(([label, val, setter]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">{label}（分钟）</span>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={val}
                    onChange={e => setter(Number(e.target.value))}
                    className="w-16 px-2 py-1.5 text-xs border border-app-border rounded-lg bg-white text-gray-900"
                  />
                </div>
              ))}
              <label className="flex items-center justify-between cursor-pointer py-1">
                <span className="text-xs text-gray-600">休息结束自动开始专注</span>
                <input
                  type="checkbox"
                  checked={autoStart}
                  onChange={e => setAutoStart(e.target.checked)}
                  className="rounded w-4 h-4"
                />
              </label>
            </div>
          </details>
        </div>

        {/* ===== 右侧：任务 ===== */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTask()}
              placeholder="添加新任务，回车确认..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 text-gray-900 bg-white placeholder-gray-400 min-h-[44px]"
            />
            <button
              onClick={addTask}
              className="px-4 py-3 bg-violet-500 text-white text-sm font-medium rounded-xl hover:bg-violet-600 transition-colors min-h-[44px]"
            >
              添加
            </button>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">进行中 ({activeTasks.length})</h3>
            <div className="space-y-2">
              {activeTasks.map(t => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={e => onDragStart(e, t.id)}
                  onDragOver={onDragOver}
                  onDrop={e => onDrop(e, t.id)}
                  className="flex items-center justify-between p-4 bg-white border border-app-border rounded-xl hover:border-emerald-200 transition-all group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={t.done}
                      onChange={() => toggleTask(t.id)}
                      className="rounded flex-shrink-0 w-4 h-4"
                    />
                    <span className="text-sm text-gray-900 truncate">{t.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <span className="text-xs text-emerald-600 font-medium">🍅 {t.poms}</span>
                    <button
                      onClick={() => addPomToTask(t.id)}
                      className="text-xs px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      +1
                    </button>
                    <button
                      onClick={() => copy(t.title, t.id)}
                      className="text-xs px-2 py-1 bg-blue-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      {copied === t.id ? '✓' : '📋'}
                    </button>
                    <button
                      onClick={() => deleteTask(t.id)}
                      className="text-xs text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              {activeTasks.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">暂无任务，添加一个开始专注吧</p>
              )}
            </div>
          </div>

          {doneTasks.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">已完成 ({doneTasks.length})</h3>
              <div className="space-y-2">
                {doneTasks.map(t => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-4 bg-gray-100 border border-gray-200 rounded-xl"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={t.done}
                        onChange={() => toggleTask(t.id)}
                        className="rounded flex-shrink-0 w-4 h-4"
                      />
                      <span className="text-sm line-through text-gray-500 truncate">{t.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <span className="text-xs text-emerald-500 font-medium">🍅 {t.poms}</span>
                      <button
                        onClick={() => copy(t.title, `done-${t.id}`)}
                        className="text-xs px-2 py-1 bg-blue-500 text-white rounded-lg"
                      >
                        {copied === `done-${t.id}` ? '✓' : '📋'}
                      </button>
                      <button
                        onClick={() => deleteTask(t.id)}
                        className="text-xs text-gray-400 hover:text-red-500"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-10 p-4 bg-gray-50 border border-app-border rounded-xl">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">使用说明</h3>
        <ul className="text-xs text-app-muted space-y-1.5 leading-relaxed">
          <li>• 点击模式切换「专注 / 短休息 / 长休息」，时间自动重置</li>
          <li>• 每完成 4 个番茄自动进入长休息，其余进入短休息</li>
          <li>• 任务支持拖拽排序，点击 +1 为该任务绑定一个番茄</li>
          <li>• 所有数据保存在浏览器本地，关闭页面不会丢失</li>
          <li>• 首次点击开始时浏览器会请求通知权限，用于计时结束提醒</li>
        </ul>
      </div>

      <FooterNote />
    </div>
  )
}
