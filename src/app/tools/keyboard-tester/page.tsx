'use client'

import { useState, useEffect, useCallback } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
type KeyInfo = {
  key: string
  code: string
  keyCode: number
  shift: boolean
  ctrl: boolean
  alt: boolean
  meta: boolean
}

const INITIAL: KeyInfo = {
  key: '—',
  code: '—',
  keyCode: 0,
  shift: false,
  ctrl: false,
  alt: false,
  meta: false,
}

export default function KeyboardTester() {
  const [info, setInfo] = useState<KeyInfo>(INITIAL)
  const [history, setHistory] = useState<KeyInfo[]>([])
  const [listening, setListening] = useState(true)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    e.preventDefault()
    const entry: KeyInfo = {
      key: e.key === ' ' ? 'Space' : e.key,
      code: e.code,
      keyCode: e.keyCode || 0,
      shift: e.shiftKey,
      ctrl: e.ctrlKey,
      alt: e.altKey,
      meta: e.metaKey,
    }
    setInfo(entry)
    setHistory((prev) => [entry, ...prev].slice(0, 8))
  }, [])

  useEffect(() => {
    if (listening) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [listening, handleKeyDown])

  const reset = () => {
    setInfo(INITIAL)
    setHistory([])
  }

  const copyAll = async () => {
    const text = `key: ${info.key}\ncode: ${info.code}\nkeyCode: ${info.keyCode}\nshift: ${info.shift}\nctrl: ${info.ctrl}\nalt: ${info.alt}\nmeta: ${info.meta}`
    await navigator.clipboard.writeText(text)
  }

  const isEmpty = info.key === '—'

  return (
    <div className="max-w-3xl mx-auto px-5 py-10 sm:px-8">
      <Breadcrumb />
      {/* 顶部说明 */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-app-text mb-2">键盘按键测试</h1>
        <p className="text-sm text-app-muted">点击下方区域，按下任意键查看详细信息。适合调试快捷键、游戏按键、表单输入。</p>
      </div>

      {/* 主显示区 */}
      <div
        tabIndex={0}
        className="relative group bg-app-card border-2 border-dashed border-app-border rounded-2xl p-10 mb-6 text-center transition-all duration-200 focus:outline-none focus:border-violet-400 focus:bg-violet-50/30 dark:focus:bg-violet-500/5"
      >
        {/* 光斑 */}
        <div className="absolute -top-6 -left-6 w-20 h-20 rounded-full bg-violet-100/40 dark:bg-violet-500/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-6 -right-6 w-16 h-16 rounded-full bg-sky-50/50 dark:bg-violet-500/5 blur-2xl pointer-events-none" />

        <div className="relative">
          {/* 大号 key 显示 */}
          <div className="mb-2">
            <span className="text-5xl sm:text-6xl font-black text-app-text font-mono tracking-tight">
              {info.key === '—' ? '?' : info.key.length > 8 ? info.key.slice(0, 8) + '…' : info.key}
            </span>
          </div>
          <p className="text-xs text-app-muted mb-6">
            {listening ? '正在监听 — 按任意键' : '已暂停'}
          </p>

          {/* 信息网格 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <InfoCard label="key" value={info.key} />
            <InfoCard label="code" value={info.code} />
            <InfoCard label="keyCode" value={String(info.keyCode)} />
            <InfoCard label="which" value={String(info.keyCode)} />
          </div>

          {/* 修饰键 */}
          <div className="flex justify-center gap-2 mt-4 flex-wrap">
            <ModBadge label="Shift" active={info.shift} />
            <ModBadge label="Ctrl" active={info.ctrl} />
            <ModBadge label="Alt" active={info.alt} />
            <ModBadge label="Meta" active={info.meta} />
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2 flex-wrap mb-8">
        <button
          onClick={() => setListening(!listening)}
          className={`px-4 py-2 rounded-xl text-xs font-semibold border transition ${
            listening
              ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
          }`}
        >
          {listening ? '⏸ 暂停监听' : '▶ 恢复监听'}
        </button>
        <button
          onClick={copyAll}
          disabled={isEmpty}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-app-bg border border-app-border text-app-text hover:border-violet-300 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          📋 复制信息
        </button>
        <button
          onClick={reset}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-app-bg border border-app-border text-app-muted hover:text-red-500 transition"
        >
          清空
        </button>
      </div>

      {/* 历史记录 */}
      {history.length > 0 && (
        <div className="bg-app-card border border-app-border rounded-2xl p-5 overflow-hidden">
          <h3 className="text-xs font-semibold text-app-muted uppercase tracking-wider mb-3">最近按键</h3>
          <div className="flex gap-2 flex-wrap">
            {history.map((h, i) => (
              <div
                key={i}
                className="px-3 py-2 bg-app-bg border border-app-border rounded-xl text-xs font-mono text-app-text"
                title={`${h.code} (${h.keyCode})`}
              >
                <span className="font-bold">{h.key}</span>
                <span className="text-app-muted ml-1.5">{h.code}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-center text-xs text-app-muted mt-12">BitLeap · 纯前端 · 按键数据不上传</p>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-app-bg border border-app-border rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-wider text-app-muted mb-1">{label}</div>
      <div className="text-sm font-mono text-app-text truncate">{value}</div>
    </div>
  )
}

function ModBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
        active
          ? 'bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/30'
          : 'bg-app-bg text-app-muted border-app-border'
      }`}
    >
      {label}
    </span>
  )
}