'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
export default function EasingGenerator() {
  const [p1x, setP1X] = useState(0.42)
  const [p1y, setP1Y] = useState(0)
  const [p2x, setP2X] = useState(0.58)
  const [p2y, setP2Y] = useState(1)
  const [dragging, setDragging] = useState<null | 'p1' | 'p2'>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  const presets = [
    { label: 'ease', v: [0.42, 0, 0.58, 1] },
    { label: 'ease-in', v: [0.42, 0, 1, 1] },
    { label: 'ease-out', v: [0, 0, 0.58, 1] },
    { label: 'ease-in-out', v: [0.42, 0, 0.58, 1] },
    { label: 'linear', v: [0, 0, 1, 1] },
    { label: 'ease-out-back', v: [0.175, 0.885, 0.32, 1.275] },
  ]

  const code = `cubic-bezier(${p1x}, ${p1y}, ${p2x}, ${p2y})`

  const copyCode = async () => {
    await navigator.clipboard.writeText(code)
  }

  // 用多段线段模拟渐变曲线
  const drawGradientCurve = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    p1x: number,
    p1y: number,
    p2x: number,
    p2y: number
  ) => {
    const steps = 40
    for (let i = 0; i < steps; i++) {
      const t1 = i / steps
      const t2 = (i + 1) / steps
      const x1 = cubicX(t1, p1x, p2x) * w
      const y1 = (1 - cubicY(t1, p1y, p2y)) * h
      const x2 = cubicX(t2, p1x, p2x) * w
      const y2 = (1 - cubicY(t2, p1y, p2y)) * h

      const r = Math.round(139 + (236 - 139) * (i / steps))
      const g = Math.round(92 + (72 - 92) * (i / steps))
      const b = Math.round(246 + (153 - 246) * (i / steps))

      ctx.strokeStyle = `rgb(${r},${g},${b})`
      ctx.lineWidth = 3.5
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    }
  }

  const cubicX = (t: number, p1x: number, p2x: number) =>
    t * t * t + 3 * t * t * (1 - t) * p1x + 3 * t * (1 - t) * (1 - t) * p2x

  const cubicY = (t: number, p1y: number, p2y: number) =>
    t * t * t + 3 * t * t * (1 - t) * p1y + 3 * t * (1 - t) * (1 - t) * p2y

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)

    // 背景网格
    ctx.strokeStyle = 'rgba(100,116,139,0.1)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 10; i++) {
      const pos = (w / 10) * i
      ctx.beginPath()
      ctx.moveTo(pos, 0)
      ctx.lineTo(pos, h)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, (h / 10) * i)
      ctx.lineTo(w, (h / 10) * i)
      ctx.stroke()
    }

    // 对角线（参考线）
    ctx.strokeStyle = 'rgba(100,116,139,0.25)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(0, h)
    ctx.lineTo(w, 0)
    ctx.stroke()
    ctx.setLineDash([])

    // 坐标轴
    ctx.strokeStyle = 'rgba(100,116,139,0.4)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(0, h)
    ctx.lineTo(w, h)
    ctx.moveTo(w, 0)
    ctx.lineTo(w, h)
    ctx.stroke()

    // 渐变曲线
    drawGradientCurve(ctx, w, h, p1x, p1y, p2x, p2y)

    // 控制点连线（淡紫色虚线）
    ctx.strokeStyle = 'rgba(139,92,246,0.35)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([5, 4])
    ctx.beginPath()
    ctx.moveTo(0, h)
    ctx.lineTo(p1x * w, (1 - p1y) * h)
    ctx.moveTo(w, 0)
    ctx.lineTo(p2x * w, (1 - p2y) * h)
    ctx.stroke()
    ctx.setLineDash([])

    // 控制点圆点（紫粉渐变）
    const drawGradientPoint = (px: number, py: number) => {
      const cx = px * w
      const cy = (1 - py) * h
      const grad = ctx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, 9)
      grad.addColorStop(0, '#c4b5fd')
      grad.addColorStop(1, '#8b5cf6')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(cx, cy, 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(139,92,246,0.4)'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
    drawGradientPoint(p1x, p1y)
    drawGradientPoint(p2x, p2y)
  }, [p1x, p1y, p2x, p2y])

  const applyPreset = (arr: number[]) => {
    setP1X(arr[0])
    setP1Y(arr[1])
    setP2X(arr[2])
    setP2Y(arr[3])
  }

  const triggerAnimate = () => {
    const box = boxRef.current
    if (!box) return
    const parent = box.parentElement
    if (!parent) return

    const maxDistance = parent.clientWidth - box.offsetWidth

    box.style.transition = 'none'
    box.style.transform = 'translateX(0)'
    void box.offsetWidth

    requestAnimationFrame(() => {
      box.style.transition = `transform 1.2s ${code}`
      requestAnimationFrame(() => {
        box.style.transform = `translateX(${maxDistance}px)`
      })
    })
  }

  const getPosFromEvent = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = 1 - (e.clientY - rect.top) / rect.height
    return { x, y }
  }, [])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getPosFromEvent(e)
    if (!pos) return
    const canvas = canvasRef.current!
    const w = canvas.width
    const h = canvas.height

    const p1Dist = Math.hypot(pos.x * w - p1x * w, (1 - pos.y) * h - (1 - p1y) * h)
    const p2Dist = Math.hypot(pos.x * w - p2x * w, (1 - pos.y) * h - (1 - p2y) * h)

    if (p1Dist < 12) setDragging('p1')
    else if (p2Dist < 12) setDragging('p2')
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging) return
    const pos = getPosFromEvent(e)
    if (!pos) return
    const clamp = (v: number) => Math.max(-0.5, Math.min(1.5, v))
    if (dragging === 'p1') {
      setP1X(clamp(pos.x))
      setP1Y(clamp(pos.y))
    } else {
      setP2X(clamp(pos.x))
      setP2Y(clamp(pos.y))
    }
  }

  const handleMouseUp = () => setDragging(null)

  return (
    <div className="max-w-6xl mx-auto px-5 py-10 sm:px-8">
      <Breadcrumb />
      {/* 顶部说明 */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-app-text mb-2">Easing 缓动曲线生成器</h1>
        <p className="text-sm text-app-muted">拖拽控制点或调节滑块，可视化 cubic-bezier，预览动画，复制 CSS</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8 items-start">
        {/* 左侧：Canvas + 代码 + 动画（竖排） */}
        <div className="flex flex-col items-center gap-5">
          {/* Canvas */}
          <canvas
            ref={canvasRef}
            width={340}
            height={340}
            className="border border-app-border rounded-2xl bg-app-bg cursor-grab active:cursor-grabbing shadow-sm"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />

          {/* CSS 代码 */}
          <div className="w-[340px]">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-app-muted uppercase tracking-wider">CSS 代码</label>
              <button
                onClick={copyCode}
                className="px-2.5 py-1 rounded-lg bg-app-bg border border-app-border text-xs text-app-text hover:border-violet-300 transition"
              >
                📋 复制
              </button>
            </div>
            <div className="p-3 rounded-xl border border-app-border bg-app-bg font-mono text-sm text-app-text text-center">
              {code}
            </div>
          </div>

          {/* 动画预览 */}
          <div className="w-[340px]">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-app-muted uppercase tracking-wider">动画预览</label>
              <button
                onClick={triggerAnimate}
                className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-violet-500 to-pink-500 text-white text-xs font-semibold hover:scale-105 active:scale-95 transition-all shadow-sm"
              >
                ▶ 播放
              </button>
            </div>
            <div className="relative h-12 rounded-xl border border-app-border bg-app-bg overflow-hidden">
              <div
                ref={boxRef}
                className="absolute left-0 top-1 bottom-1 w-8 rounded-lg"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}
              />
            </div>
          </div>
        </div>

        {/* 右侧：预设 + 滑块 */}
        <div className="bg-app-card border border-app-border rounded-2xl p-6">
          {/* 预设 */}
          <div className="mb-6">
            <label className="text-xs font-semibold text-app-muted uppercase tracking-wider block mb-3">预设</label>
            <div className="flex flex-wrap gap-2">
              {presets.map((item) => (
                <button
                  key={item.label}
                  onClick={() => applyPreset(item.v)}
                  className="px-3 py-1.5 rounded-xl border border-app-border text-xs font-medium text-app-text hover:border-violet-300 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 分割线 */}
          <div className="h-px bg-app-border mb-6" />

          {/* 滑块 */}
          <div className="space-y-5">
            <label className="text-xs font-semibold text-app-muted uppercase tracking-wider block">控制点</label>
            {[
              { label: 'P1 X', val: p1x, set: setP1X, color: 'from-violet-500 to-violet-400' },
              { label: 'P1 Y', val: p1y, set: setP1Y, color: 'from-violet-500 to-fuchsia-500' },
              { label: 'P2 X', val: p2x, set: setP2X, color: 'from-fuchsia-500 to-pink-500' },
              { label: 'P2 Y', val: p2y, set: setP2Y, color: 'from-pink-500 to-pink-400' },
            ].map((s) => (
              <div key={s.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-app-text">{s.label}</label>
                  <span className="text-xs font-mono text-app-muted bg-app-bg px-2 py-0.5 rounded-lg border border-app-border">
                    {s.val.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="-0.5"
                  max="1.5"
                  step="0.01"
                  value={s.val}
                  onChange={(e) => s.set(Number(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, transparent, transparent ${(s.val + 0.5) / 2 * 100}%, rgba(139,92,246,0.15) ${(s.val + 0.5) / 2 * 100}%)`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-app-muted mt-12">BitLeap · 纯前端 · 所见即所得</p>
    </div>
  )
}