'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

const FONT_SIZE = 16
const FADE = 0.08

export default function CodeRainPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dropsRef = useRef<number[]>([])
  const frameRef = useRef<number>(0)

  const [speed, setSpeed] = useState(60)
  const [color, setColor] = useState('#13b074')
  const [running, setRunning] = useState(false)

  const initDrops = (cols: number) => {
    dropsRef.current = Array.from({ length: cols }, () => Math.random() * -100)
  }

  const start = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    initDrops(Math.floor(canvas.width / FONT_SIZE))

    let last = performance.now()
    const step = 1000 / speed

    const loop = (now: number) => {
      frameRef.current = requestAnimationFrame(loop)

      if (now - last < step) return
      last = now

      ctx.fillStyle = `rgba(2, 6, 8, ${FADE})`
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = color
      ctx.font = `${FONT_SIZE}px monospace`

      for (let i = 0; i < dropsRef.current.length; i++) {
        const char = String.fromCharCode(0x30a0 + Math.random() * 96)
        const x = i * FONT_SIZE
        const y = dropsRef.current[i] * FONT_SIZE

        if (Math.random() > 0.98) ctx.fillStyle = '#c9ffe3'
        else ctx.fillStyle = color

        ctx.fillText(char, x, y)

        if (y > canvas.height && Math.random() > 0.975) {
          dropsRef.current[i] = 0
        }
        dropsRef.current[i]++
      }
    }

    frameRef.current = requestAnimationFrame(loop)
    setRunning(true)
  }

  const stop = () => {
    cancelAnimationFrame(frameRef.current)
    setRunning(false)
  }

  useEffect(() => {
    const saved = localStorage.getItem('bitleap:code-rain')
    if (saved) {
      const { speed: s, color: c } = JSON.parse(saved)
      if (s) setSpeed(s)
      if (c) setColor(c)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('bitleap:code-rain', JSON.stringify({ speed, color }))
  }, [speed, color])

  useEffect(() => {
    return () => cancelAnimationFrame(frameRef.current)
  }, [])

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* Canvas 铺满 */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-0"
      />

      {/* 控制面板 — 启动后淡出隐藏 */}
      <div
        className={`relative z-10 max-w-xl mx-auto py-16 px-6 transition-all duration-500 ${running
            ? 'opacity-0 pointer-events-none translate-y-4'
            : 'opacity-100 pointer-events-auto translate-y-0'
          }`}
      >
        <Breadcrumb />
        <h1 className="text-3xl font-bold mt-6 mb-2">代码雨屏保</h1>
        <p className="text-app-muted mb-8">
          黑客帝国经典效果，纯 Canvas 渲染。按 F11 全屏更沉浸。
        </p>

        {/* 配置 */}
        <div className="space-y-4 mb-8 p-4 bg-app-bg/10 backdrop-blur rounded-xl">
          <div>
            <label className="text-sm text-gray-300 block mb-2">
              速度：{speed} fps
            </label>
            <input
              type="range"
              min={20}
              max={120}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-full"
              disabled={running}
            />
          </div>

          <div>
            <label className="text-sm text-gray-300 block mb-2">颜色</label>
            <div className="flex gap-2">
              {['#13b074', '#0ea5e9', '#a855f7', '#f97316'].map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 ${color === c ? 'border-white' : 'border-transparent'
                    }`}
                  style={{ backgroundColor: c }}
                  disabled={running}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 按钮 */}
        <div className="space-y-3">
          {!running ? (
            <button
              onClick={start}
              className="w-full py-3 bg-app-bg text-black rounded-xl hover:bg-gray-200 transition font-semibold"
            >
              启动代码雨
            </button>
          ) : (
            <button
              onClick={stop}
              className="w-full py-3 bg-app-bg/20 text-white rounded-xl hover:bg-app-bg/30 transition"
            >
              停止
            </button>
          )}
        </div>

        <div className="mt-10 text-xs text-gray-500 leading-relaxed">
          <p>· 纯前端 Canvas，无任何网络请求</p>
          <p>· 配置自动保存在本地</p>
          <p>· 按 Esc 或点击停止按钮结束</p>
        </div>
      </div>

      {/* ✅ 运行中：右下角悬浮停止按钮 */}
      {running && (
        <button
          onClick={stop}
          className="fixed bottom-6 right-6 z-20 px-4 py-2 bg-app-bg/10 hover:bg-app-bg/20 backdrop-blur text-white text-sm rounded-xl transition-all active:scale-95"
        >
          停止
        </button>
      )}
      <FooterNote />
    </div>
  )
}