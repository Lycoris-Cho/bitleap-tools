'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { clipPresets, generateClipPath, type Point } from './presets'
import { Breadcrumb } from '@/components/breadcrumb'
export default function ClipPathGenerator() {
  const [activeId, setActiveId] = useState('triangle')
  const [points, setPoints] = useState<Point[]>(() =>
    clipPresets.find(p => p.id === 'triangle')!.points.map(p => ({ ...p }))
  )
  const [fillRule, setFillRule] = useState<'nonzero' | 'evenodd'>('nonzero')
  const [copied, setCopied] = useState(false)

  const dragIndexRef = useRef<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const rafRef = useRef<number | null>(null)
  const dragPosRef = useRef<{ x: number; y: number } | null>(null)

  const previewSize = 360

  const activePreset = clipPresets.find(p => p.id === activeId)!
  const clipPathCss = generateClipPath(activeId, points, fillRule)
  const fullCss = `clip-path: ${clipPathCss};\n-webkit-clip-path: ${clipPathCss};`

  const fullCssRef = useRef(fullCss)
  fullCssRef.current = fullCss

  const copy = async () => {
    await navigator.clipboard.writeText(fullCss)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const selectPreset = (id: string) => {
    setActiveId(id)
    const preset = clipPresets.find(p => p.id === id)!
    setPoints(preset.points.map(p => ({ ...p })))
    dragIndexRef.current = null
    dragPosRef.current = null
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }

  const getSvgPos = useCallback((clientX: number, clientY: number): Point => {
    if (!svgRef.current) return { x: 0, y: 0 }
    const svgRect = svgRef.current.getBoundingClientRect()
    let localX = ((clientX - svgRect.left) / previewSize) * 100
    let localY = ((clientY - svgRect.top) / previewSize) * 100
    localX = Math.max(0, Math.min(100, localX))
    localY = Math.max(0, Math.min(100, localY))
    return { x: localX, y: localY }
  }, [])

  const applyDrag = useCallback(() => {
    const idx = dragIndexRef.current
    if (idx === null || dragPosRef.current === null) return
    const pos = dragPosRef.current
    setPoints(prev => {
      const arr = [...prev]
      arr[idx] = { ...pos }
      return arr
    })
    rafRef.current = requestAnimationFrame(applyDrag)
  }, [])

  useEffect(() => {
    const globalUp = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      dragPosRef.current = null
      dragIndexRef.current = null
    }
    window.addEventListener('pointerup', globalUp)
    window.addEventListener('pointercancel', globalUp)
    return () => {
      window.removeEventListener('pointerup', globalUp)
      window.removeEventListener('pointercancel', globalUp)
    }
  }, [])

  const safeRemovePoint = (index: number) => {
    if (points.length <= 3) return
    setPoints(prev => prev.filter((_, i) => i !== index))
    if (dragIndexRef.current === index) dragIndexRef.current = null
  }

  const onPointerDownPoint = (index: number) => (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragIndexRef.current = index
    dragPosRef.current = getSvgPos(e.clientX, e.clientY)
    ;(e.target as SVGCircleElement).setPointerCapture(e.pointerId)
    rafRef.current = requestAnimationFrame(applyDrag)
  }

  const onDoubleClickPoint = (index: number) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (dragIndexRef.current !== null) return
    safeRemovePoint(index)
  }

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (dragIndexRef.current === null) return
    dragPosRef.current = getSvgPos(e.clientX, e.clientY)
  }, [getSvgPos])

  const onPointerUpSvg = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    dragPosRef.current = null
    dragIndexRef.current = null
  }

  const onPointerCancelSvg = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    dragPosRef.current = null
    dragIndexRef.current = null
  }

  const addPoint = () => {
    // 空白点击添加点的逻辑（可选保留）
  }

  const addPointAtCenter = () => {
    setPoints(prev => [...prev, { x: 50, y: 50 }])
  }

  return (
    <div className="flex w-full h-[calc(100vh-4rem)] overflow-hidden bg-gray-50/50">
      {/* 左侧：形状选择 */}
      <div className="w-48 shrink-0 h-full overflow-y-auto border-r border-app-border/60 bg-app-bg/80 backdrop-blur-xl p-3 space-y-1">
        <div className="px-3 py-2 mb-2">
          <h2 className="text-xs font-bold text-app-muted uppercase tracking-wider">预设形状</h2>
        </div>
        {clipPresets.map(p => (
          <button
            key={p.id}
            onClick={() => selectPreset(p.id)}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2.5 ${
              activeId === p.id
                ? 'bg-gray-900 text-white shadow-md'
                : 'text-app-muted hover:bg-gray-100'
            }`}
          >
            <span className={`text-base ${activeId === p.id ? 'text-white' : 'text-app-muted'}`}>
              {p.icon}
            </span>
            {p.name}
          </button>
        ))}

        <div className="px-3 py-2 mt-4 mb-2">
          <h2 className="text-xs font-bold text-app-muted uppercase tracking-wider">填充规则</h2>
        </div>
        <div className="px-3 space-y-2">
          {(['nonzero', 'evenodd'] as const).map(rule => (
            <label key={rule} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="fillRule"
                checked={fillRule === rule}
                onChange={() => setFillRule(rule)}
                className="w-3.5 h-3.5 accent-gray-900"
              />
              <span className="text-xs text-app-muted font-mono">{rule}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 右侧：预览 + 代码 */}
      <div className="flex-1 h-full overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
          <Breadcrumb />
            <h1 className="text-2xl font-black text-app-text mb-1">Clip Path 形状生成器</h1>
            <p className="text-sm text-gray-500">
              {activePreset.description} · 拖拽顶点调整，双击顶点删除，点击画布空白添加顶点
            </p>
          </div>

          <div className="bg-app-bg/80 backdrop-blur-xl border border-app-border/60 rounded-2xl p-6 mb-4">
            {/* 容器高度 440px */}
            <div
              className="relative flex items-center justify-center bg-gray-50 rounded-xl overflow-hidden"
              style={{ height: '440px' }}
            >
              {/* 右上角加号按钮 */}
              <button
                onClick={addPointAtCenter}
                className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-lg bg-app-bg/80 hover:bg-app-bg border border-app-border shadow-sm text-app-text text-lg font-bold transition-all active:scale-95"
                title="添加控制点"
              >
                +
              </button>

              {/* 预览色块 */}
              <div
                className="absolute"
                style={{
                  width: previewSize,
                  height: previewSize,
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: 'linear-gradient(135deg,#8b5cf6,#ec4899,#f59e0b)',
                  clipPath: clipPathCss,
                  WebkitClipPath: clipPathCss,
                }}
              />

              <svg
                ref={svgRef}
                className="absolute"
                style={{
                  width: previewSize,
                  height: previewSize,
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
                viewBox="0 0 100 100"
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUpSvg}
                onPointerCancel={onPointerCancelSvg}
                onClick={addPoint}
              >
                {points.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={2}
                    fill="#6366f1"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    className="cursor-grab active:cursor-grabbing"
                    onPointerDown={onPointerDownPoint(i)}
                    onDoubleClick={onDoubleClickPoint(i)}
                  />
                ))}
              </svg>
            </div>
            <p className="text-xs text-app-muted text-center mt-3">
              双击控制点删除 · 至少保留3个顶点
            </p>
          </div>

          {/* CSS输出 */}
          <div className="bg-gray-900 rounded-2xl p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-app-muted uppercase tracking-wider">CSS 代码</span>
              <button
                onClick={copy}
                className="px-3 py-1.5 text-xs bg-app-bg/10 text-white rounded-lg hover:bg-app-bg/20 active:scale-95 transition-all"
              >
                {copied ? '✓ 已复制' : '复制代码'}
              </button>
            </div>
            <pre className="text-sm font-mono text-emerald-300 leading-relaxed whitespace-pre-wrap break-all">
{fullCss}
            </pre>
          </div>

          {/* 坐标面板 */}
          <div className="bg-app-bg/80 backdrop-blur-xl border border-app-border/60 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
              <h3 className="text-xs font-bold text-app-muted uppercase tracking-wider">顶点坐标</h3>
            </div>
            <div className="max-h-40 overflow-y-auto">
              {points.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 px-5 py-2 border-b border-gray-50 last:border-0 text-xs font-mono"
                >
                  <span className="text-app-muted w-6">#{i}</span>
                  <span className="text-gray-700">x: {p.x.toFixed(1)}%</span>
                  <span className="text-gray-700">y: {p.y.toFixed(1)}%</span>
                  <button
                    onClick={() => safeRemovePoint(i)}
                    className="ml-auto text-red-400 hover:text-red-600 text-xs"
                    disabled={points.length <= 3}
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-app-muted mt-6">
            BitLeap · 本地计算 · 隐私优先
          </p>
        </div>
      </div>
    </div>
  )
}