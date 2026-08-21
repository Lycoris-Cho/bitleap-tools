'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

type ColorStop = {
  id: string
  value: string
}

type GradientType = 'linear' | 'radial'
type RadialShape = 'circle' | 'ellipse'

const DIRECTIONS = [
  { label: '↑ 向上', angle: 0 },
  { label: '↓ 向下', angle: 180 },
  { label:'← 向左', angle: 270 },
  { label: '→ 向右', angle: 90 },
  { label: '↘ 右下', angle: 135 },
]

const PRESET_GRADIENTS = [
  { name: '星空蓝', colors: ['#0f0c29', '#302b63', '#24243e'] },
  { name: '日落橙', colors: ['#ff9a44', '#fc6076'] },
  { name: '薄荷绿', colors: ['#43e97b', '#38f9d7'] },
  { name: '樱花粉', colors: ['#f77062', '#fe5196'] },
  { name: '极光紫', colors: ['#667eea', '#764ba2'] },
  { name: '暖阳金', colors: ['#f6d365', '#fda085'] },
  { name: '海洋蓝', colors: ['#2193b0', '#6dd5ed'] },
  { name: '玫瑰金', colors: ['#ffecd2', '#fcb69f'] },
]

function randomHex(): string {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
}

export default function GradientClient() {
  const [colors, setColors] = useState<ColorStop[]>([
    { id: 'default-1', value: '#3B82F6' },
    { id: 'default-2', value: '#8B5CF6' },
  ])
  const [angle, setAngle] = useState<number>(90)
  const [type, setType] = useState<GradientType>('linear')
  const [shape, setShape] = useState<RadialShape>('circle')
  const [copied, setCopied] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  const searchParams = useSearchParams()

  useEffect(() => {
    const colorsParam = searchParams.get('colors')
    let restoredColors: ColorStop[] | null = null
    let restoredAngle: number | null = null
    let restoredType: GradientType | null = null
    let restoredShape: RadialShape | null = null

    if (colorsParam) {
      restoredColors = decodeURIComponent(colorsParam)
        .split(',')
        .map(c => ({ id: crypto.randomUUID(), value: c }))
      const a = searchParams.get('angle')
      if (a) restoredAngle = Number(a)
    }

    if (!restoredColors) {
      const saved = localStorage.getItem('bitleap-gradient')
      if (saved) {
        try {
          const p = JSON.parse(saved)
          if (p.colors?.length) {
            restoredColors = p.colors.map((c: string) => ({ id: crypto.randomUUID(), value: c }))
          }
          if (p.angle !== undefined) restoredAngle = p.angle
          if (p.type === 'linear' || p.type === 'radial') restoredType = p.type
          if (p.shape === 'circle' || p.shape === 'ellipse') restoredShape = p.shape
        } catch { /* ignore */ }
      }
    }

    setColors(prev => restoredColors ?? prev)
    setAngle(prev => restoredAngle ?? prev)
    setType(prev => restoredType ?? prev)
    setShape(prev => restoredShape ?? prev)
    setHydrated(true)
  }, [searchParams])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem('bitleap-gradient', JSON.stringify({
      colors: colors.map(c => c.value),
      angle,
      type,
      shape,
    }))
  }, [colors, angle, type, shape, hydrated])

  function addColor() {
    setColors([...colors, { id: crypto.randomUUID(), value: randomHex() }])
  }

  function removeColor(id: string) {
    if (colors.length <= 2) return
    setColors(colors.filter((c) => c.id !== id))
  }

  function updateColor(id: string, value: string) {
    setColors(colors.map((c) => (c.id === id ? { ...c, value } : c)))
  }

  function randomizeAll() {
    const count = colors.length
    setColors(Array.from({ length: count }, () => ({ id: crypto.randomUUID(), value: randomHex() })))
    setAngle(Math.floor(Math.random() * 360))
  }

  function loadPreset(presetColors: string[]) {
    setColors(presetColors.map(c => ({ id: crypto.randomUUID(), value: c })))
  }

  const cssCode =
    type === 'linear'
      ? `background: linear-gradient(${angle}deg, ${colors.map((c) => c.value).join(', ')});`
      : `background: radial-gradient(${shape}, ${colors.map((c) => c.value).join(', ')});`

  const previewStyle =
    type === 'linear'
      ? `linear-gradient(${angle}deg, ${colors.map((c) => c.value).join(', ')})`
      : `radial-gradient(${shape}, ${colors.map((c) => c.value).join(', ')})`

  const copy = async () => {
    await navigator.clipboard.writeText(cssCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">渐变色生成器</h1>
        <p className="text-app-muted">多色渐变生成，支持线性渐变与中心渐变 · 数据自动保存到本地</p>
      </div>

      {/* 预览区 */}
      <div
        className="w-full h-48 rounded-2xl border border-app-border mb-8 shadow-sm"
        style={{ background: previewStyle }}
      />

      {/* 快速预设 */}
      <div className="mb-8">
        <label className="block text-sm font-medium mb-3 text-gray-700">快速预设</label>
        <div className="flex flex-wrap gap-2">
          {PRESET_GRADIENTS.map(p => (
            <button
              key={p.name}
              onClick={() => loadPreset(p.colors)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-app-border bg-app-bg hover:shadow-sm transition group"
            >
              <span
                className="w-5 h-5 rounded-lg border border-app-border shrink-0"
                style={{ background: `linear-gradient(135deg, ${p.colors.join(', ')})` }}
              />
              <span className="text-xs text-app-muted group-hover:text-app-text">{p.name}</span>
            </button>
          ))}
          <button
            onClick={randomizeAll}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-gray-300 bg-app-bg text-gray-500 hover:text-gray-800 hover:border-gray-400 transition text-xs"
          >
            🎲 随机
          </button>
        </div>
      </div>

      {/* 渐变类型 */}
      <div className="mb-8">
        <label className="block text-sm font-medium mb-2 text-gray-700">渐变类型</label>
        <div className="flex gap-4">
          <button
            onClick={() => setType('linear')}
            className={`px-5 py-3 rounded-xl border text-sm font-medium transition ${
              type === 'linear'
                ? 'bg-violet-500 text-white border-violet-500'
                : 'bg-app-bg text-gray-800 border-gray-300 hover:bg-gray-50'
            }`}
          >
            线性渐变
          </button>
          <button
            onClick={() => setType('radial')}
            className={`px-5 py-3 rounded-xl border text-sm font-medium transition ${
              type === 'radial'
                ? 'bg-violet-500 text-white border-violet-500'
                : 'bg-app-bg text-gray-800 border-gray-300 hover:bg-gray-50'
            }`}
          >
            中心渐变
          </button>
        </div>
      </div>

      {/* 角度（线性） */}
      {type === 'linear' && (
        <div className="mb-8">
          <label className="block text-sm font-medium mb-2 text-gray-700">角度：{angle}°</label>
          <input
            type="range"
            min={0}
            max={360}
            value={angle}
            onChange={(e) => setAngle(Number(e.target.value))}
            className="w-full accent-violet-500"
          />
          <div className="flex flex-wrap gap-3 mt-4">
            {DIRECTIONS.map((d) => (
              <button
                key={d.label}
                onClick={() => setAngle(d.angle)}
                className={`px-5 py-3 rounded-xl border text-sm font-medium transition ${
                  angle === d.angle
                    ? 'bg-violet-500 text-white border-violet-500'
                    : 'bg-app-bg text-gray-800 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 形状（径向） */}
      {type === 'radial' && (
        <div className="mb-8">
          <label className="block text-sm font-medium mb-2 text-gray-700">形状</label>
          <div className="flex gap-4">
            {(['circle', 'ellipse'] as RadialShape[]).map((s) => (
              <button
                key={s}
                onClick={() => setShape(s)}
                className={`px-5 py-3 rounded-xl border text-sm font-medium transition ${
                  shape === s
                    ? 'bg-violet-500 text-white border-violet-500'
                    : 'bg-app-bg text-gray-800 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {s === 'circle' ? '圆形' : '椭圆'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 颜色节点 */}
      <div className="space-y-3 mb-8">
        <label className="block text-sm font-medium text-gray-700">颜色节点</label>
        {colors.map((color, i) => (
          <div key={color.id} className="flex items-center gap-3">
            <span className="text-xs text-app-muted w-5 shrink-0">#{i + 1}</span>
            <input
              type="color"
              value={color.value}
              onChange={(e) => updateColor(color.id, e.target.value)}
              className="w-12 h-12 p-0 border-0 bg-transparent cursor-pointer rounded-lg shrink-0"
            />
            <input
              value={color.value}
              onChange={(e) => updateColor(color.id, e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            <button
              onClick={() => removeColor(color.id)}
              disabled={colors.length <= 2}
              className="px-3 py-3 text-red-500 hover:bg-red-50 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition text-sm shrink-0"
            >
              删除
            </button>
          </div>
        ))}
        <button
          onClick={addColor}
          className="w-full px-6 py-3 border border-dashed border-gray-300 rounded-xl text-gray-500 hover:text-gray-800 hover:border-gray-400 hover:bg-gray-50 transition text-sm"
        >
          + 添加颜色
        </button>
      </div>

      {/* CSS 输出 */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">CSS 代码</label>
        <div className="p-5 bg-gray-900 rounded-xl overflow-x-auto">
          <pre className="text-sm font-mono text-emerald-300 whitespace-pre-wrap break-all">
{`  ${cssCode}`}
          </pre>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={copy}
            className="px-6 py-3 bg-violet-500 text-white rounded-xl hover:bg-violet-600 active:scale-95 transition-all font-medium text-sm"
          >
            {copied ? '✓ 已复制到剪贴板' : '复制 CSS'}
          </button>
        </div>
      </div>

      <FooterNote />
    </div>
  )
}