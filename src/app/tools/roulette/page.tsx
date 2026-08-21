'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

type Option = { id: string; text: string; color: string }

const PALETTE = [
  '#8b5cf6', '#ec4899', '#22d3ee', '#f59e0b',
  '#22c55e', '#6366f1', '#ef4444', '#14b8a6',
  '#a855f7', '#0ea5e9', '#f97316', '#84cc16',
]

let idCounter = 0
const nextId = () => `opt-${idCounter++}`

export default function Roulette() {
  const [options, setOptions] = useState<Option[]>([
    { id: nextId(), text: '选项 1', color: PALETTE[0] },
    { id: nextId(), text: '选项 2', color: PALETTE[1] },
    { id: nextId(), text: '选项 3', color: PALETTE[2] },
    { id: nextId(), text: '选项 4', color: PALETTE[3] },
  ])
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [winner, setWinner] = useState<Option | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const updateOption = (id: string, text: string) => {
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, text } : o)))
  }

  const removeOption = (id: string) => {
    setOptions((prev) => prev.filter((o) => o.id !== id))
    setWinner(null)
  }

  const addOption = () => {
    if (options.length >= 24) return
    const newOpt: Option = {
      id: nextId(),
      text: `选项 ${options.length + 1}`,
      color: PALETTE[options.length % PALETTE.length],
    }
    setOptions((prev) => [...prev, newOpt])
    setTimeout(() => {
      const idx = options.length
      inputRefs.current[idx]?.focus()
      inputRefs.current[idx]?.select()
    }, 0)
  }

  /**
   * 重要改动：drawWheel不再接收rot，画布永远绘制0度；旋转交给DOM transform
   */
  const drawWheel = useCallback((ctx: CanvasRenderingContext2D, opts: Option[]) => {
    const cx = 150
    const cy = 150
    const radius = 140
    const total = opts.length
    if (total === 0) return
    const arc = (2 * Math.PI) / total

    ctx.clearRect(0, 0, 300, 300)
    ctx.save()
    ctx.translate(cx, cy)

    opts.forEach((opt, i) => {
      const startAngle = i * arc - Math.PI / 2
      const endAngle = startAngle + arc

      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, radius, startAngle, endAngle)
      ctx.closePath()
      ctx.fillStyle = opt.color
      ctx.fill()

      ctx.save()
      ctx.rotate(startAngle + arc / 2)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 13px sans-serif'
      ctx.shadowColor = 'rgba(0,0,0,0.3)'
      ctx.shadowBlur = 4
      const label = opt.text.length > 10 ? opt.text.slice(0, 10) + '…' : opt.text
      ctx.fillText(label, radius - 12, 4)
      ctx.restore()
    })

    ctx.restore()

    ctx.beginPath()
    ctx.arc(cx, cy, 18, 0, 2 * Math.PI)
    ctx.fillStyle = '#1e293b'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(cx, cy, 10, 0, 2 * Math.PI)
    ctx.fillStyle = '#8b5cf6'
    ctx.fill()
  }, [])

  // ✅ 修复：options变化就重绘转盘，添加/删除选项立刻刷新画面
  useEffect(() => {
    if (!canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (ctx) drawWheel(ctx, options)
  }, [options, drawWheel])

  // 旋转动画只靠DOM transition，不再用requestAnimationFrame绘制canvas！
  const spin = () => {
    const validOpts = options.filter((o) => o.text.trim())
    if (validOpts.length < 2) return
    setSpinning(true)
    setWinner(null)

    const total = validOpts.length
    const arcDeg = 360 / total
    // ✅ 修复：落点强制落在扇区中间，避开分割边界
    const winnerIdx = Math.floor(Math.random() * total)
    // 目标角度：让指针指向该扇区中心点，+随机多圈
    const targetAngleOffset = winnerIdx * arcDeg + arcDeg / 2
    const extraSpins = 6 + Math.floor(Math.random() * 3)

    const currentMod = ((rotation % 360) + 360) % 360
    let delta = 360 - targetAngleOffset - currentMod
    delta = ((delta % 360) + 360) % 360
    const targetRotation = rotation + extraSpins * 360 + delta

    setRotation(targetRotation)

    const duration = 4000 + Math.random() * 1000
    setTimeout(() => {
      setSpinning(false)
      setWinner(validOpts[winnerIdx])
    }, duration)
  }

  return (
    <div className="max-w-4xl mx-auto px-5 py-10 sm:px-8">
      <Breadcrumb />
      {/* 顶部说明 */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-app-text mb-2">随机决定转盘</h1>
        <p className="text-sm text-app-muted">编辑选项，点击转盘开始，让命运帮你做决定 ✨</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧：选项编辑区 */}
        <div className="bg-app-card border border-app-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-semibold text-app-muted uppercase tracking-wider">
              选项列表
            </label>
            <span className="text-xs text-app-muted">{options.length}/24</span>
          </div>

          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {options.map((opt, i) => (
              <div key={opt.id} className="flex items-center gap-2 group">
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0"
                  style={{ backgroundColor: opt.color }}
                />
                <input
                  ref={(el) => { inputRefs.current[i] = el }}
                  value={opt.text}
                  onChange={(e) => updateOption(opt.id, e.target.value)}
                  placeholder={`选项 ${i + 1}`}
                  disabled={spinning}
                  className="flex-1 px-3 py-2 bg-app-bg border border-app-border rounded-xl text-sm text-app-text focus:outline-none focus:border-violet-300 transition disabled:opacity-50"
                />
                <button
                  onClick={() => removeOption(opt.id)}
                  disabled={spinning || options.length <= 2}
                  className="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg text-app-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addOption}
            disabled={options.length >= 24 || spinning}
            className="mt-3 w-full py-2.5 border-2 border-dashed border-app-border rounded-xl text-xs font-semibold text-app-muted hover:border-violet-300 hover:text-violet-500 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            添加选项
          </button>

          {options.filter((o) => o.text.trim()).length < 2 && (
            <p className="text-xs text-amber-500 mt-2">至少需要 2 个非空选项才能旋转</p>
          )}
        </div>

        {/* 右侧：转盘区 */}
        <div className="bg-app-card border border-app-border rounded-2xl p-5 flex flex-col items-center">
          {/* 指针 */}
          <div className="relative mb-2">
            <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[20px] border-l-transparent border-r-transparent border-t-app-text mx-auto" />
          </div>

          <div className="relative">
            <canvas
              ref={canvasRef}
              width={300}
              height={300}
              className="rounded-full"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: spinning ? 'transform 4s cubic-bezier(.17,.67,.12,.99)' : 'none',
              }}
            />
            <div className="absolute -top-6 -left-6 w-20 h-20 rounded-full bg-violet-100/40 dark:bg-violet-500/10 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-6 -right-6 w-16 h-16 rounded-full bg-sky-50/50 dark:bg-violet-500/5 blur-2xl pointer-events-none" />
          </div>

          <button
            onClick={spin}
            disabled={spinning || options.filter((o) => o.text.trim()).length < 2}
            className={`mt-6 px-8 py-3 rounded-xl text-sm font-bold transition-all ${
              spinning
                ? 'bg-app-bg text-app-muted cursor-not-allowed'
                : 'bg-gradient-to-r from-violet-500 to-pink-500 text-white hover:scale-105 active:scale-95 shadow-lg shadow-violet-500/25'
            }`}
          >
            {spinning ? '🎯 转动中…' : '🎯 开始旋转'}
          </button>

          {winner && !spinning && (
            <div className="mt-4 text-center">
              <p className="text-xs text-app-muted mb-1">🎉 结果是</p>
              <p className="text-xl font-black text-app-text">{winner.text}</p>
            </div>
          )}
        </div>
      </div>
      <FooterNote />
    </div>
  )
}
