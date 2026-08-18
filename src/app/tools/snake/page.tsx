'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Breadcrumb } from '@/components/breadcrumb'
const GRID = 20
const CELL = 20
const SPEED = 120 // ms

type Vec = { x: number; y: number }

export default function SnakePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reqRef = useRef<number>(0)
  const lastRef = useRef<number>(0)

  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const [status, setStatus] = useState<'idle' | 'playing' | 'over'>('idle')

  const snakeRef = useRef<Vec[]>([{ x: 10, y: 10 }])
  const dirRef = useRef<Vec>({ x: 1, y: 0 })
  const foodRef = useRef<Vec>({ x: 15, y: 15 })

  const randomFood = () => {
    let p: Vec
    do {
      p = {
        x: Math.floor(Math.random() * GRID),
        y: Math.floor(Math.random() * GRID),
      }
    } while (snakeRef.current.some(s => s.x === p.x && s.y === p.y))
    foodRef.current = p
  }

  const reset = () => {
    snakeRef.current = [{ x: 10, y: 10 }]
    dirRef.current = { x: 1, y: 0 }
    randomFood()
    setScore(0)
    setStatus('playing')
  }

  useEffect(() => {
    const b = Number(localStorage.getItem('bitleap:snake:best') || 0)
    setBest(b)
  }, [])

  useEffect(() => {
    if (status !== 'playing') return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const loop = (now: number) => {
      if (now - lastRef.current < SPEED) {
        reqRef.current = requestAnimationFrame(loop)
        return
      }
      lastRef.current = now

      const snake = snakeRef.current
      const dir = dirRef.current
      const head = {
        x: (snake[0].x + dir.x + GRID) % GRID,
        y: (snake[0].y + dir.y + GRID) % GRID,
      }

      // 撞自己
      if (snake.some(s => s.x === head.x && s.y === head.y)) {
        setStatus('over')
        const nextBest = Math.max(score, best)
        setBest(nextBest)
        localStorage.setItem('bitleap:snake:best', String(nextBest))
        return
      }

      snake.unshift(head)

      // 吃食物
      if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
        setScore(s => s + 1)
        randomFood()
      } else {
        snake.pop()
      }

      // 绘制
      ctx.fillStyle = '#f8fafc'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // 网格
      ctx.strokeStyle = '#e2e8f0'
      ctx.lineWidth = 0.5
      for (let i = 0; i <= GRID; i++) {
        ctx.beginPath()
        ctx.moveTo(i * CELL, 0)
        ctx.lineTo(i * CELL, canvas.height)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(0, i * CELL)
        ctx.lineTo(canvas.width, i * CELL)
        ctx.stroke()
      }

      // 食物
      ctx.fillStyle = '#f87171'
      ctx.beginPath()
      ctx.arc(
        foodRef.current.x * CELL + CELL / 2,
        foodRef.current.y * CELL + CELL / 2,
        CELL / 2 - 2,
        0,
        Math.PI * 2
      )
      ctx.fill()

      // 蛇
      snake.forEach((s, i) => {
        ctx.fillStyle = i === 0 ? '#1e293b' : '#475569'
        ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2)
      })

      reqRef.current = requestAnimationFrame(loop)
    }

    reqRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(reqRef.current)
  }, [status, score, best])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (status !== 'playing') return
      const d = dirRef.current
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          if (d.y !== 1) dirRef.current = { x: 0, y: -1 }
          break
        case 'ArrowDown':
        case 's':
          if (d.y !== -1) dirRef.current = { x: 0, y: 1 }
          break
        case 'ArrowLeft':
        case 'a':
          if (d.x !== 1) dirRef.current = { x: -1, y: 0 }
          break
        case 'ArrowRight':
        case 'd':
          if (d.x !== -1) dirRef.current = { x: 1, y: 0 }
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [status])

  return (
    <div className="max-w-xl mx-auto py-16 px-6">
      <Breadcrumb />
      <h1 className="text-3xl font-bold mt-6 mb-2">贪吃蛇</h1>
      <p className="text-app-muted mb-6">
        方向键 / WASD 控制，纯前端运行，最高分本地保存。
      </p>

      <div className="flex items-center justify-between mb-4">
        <div className="text-sm">
          当前：<span className="font-semibold">{score}</span>
        </div>
        <div className="text-sm text-gray-500">
          最高：<span className="font-semibold">{best}</span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={GRID * CELL}
        height={GRID * CELL}
        className="border border-app-border rounded-xl bg-slate-50 mx-auto block"
      />

      {status === 'idle' && (
        <button
          onClick={reset}
          className="mt-6 w-full py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition"
        >
          开始游戏
        </button>
      )}

      {status === 'over' && (
        <div className="mt-6 space-y-3">
          <div className="text-center text-lg font-semibold">
            游戏结束
          </div>
          <button
            onClick={reset}
            className="w-full py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition"
          >
            再来一局
          </button>
        </div>
      )}

      <div className="mt-10 text-xs text-app-muted leading-relaxed">
        <p>· 纯 Canvas 渲染，60fps 稳定帧率</p>
        <p>· 穿墙模式（从边缘穿越）</p>
        <p>· 最高分保存在本地浏览器</p>
        <p>· 无任何网络请求</p>
      </div>
    </div>
  )
}