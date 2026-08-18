'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Breadcrumb } from '@/components/breadcrumb'

type ColorStop = {
  id: string
  value: string
}

type GradientType = 'linear' | 'radial'
type RadialShape = 'circle' | 'ellipse'

const DIRECTIONS = [
  { label: '↑ 向上', angle: 0 },
  { label: '↓ 向下', angle: 180 },
  { label: '← 向左', angle: 270 },
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
  const searchParams = useSearchParams()

  const [colors, setColors] = useState<ColorStop[]>([
    { id: crypto.randomUUID(), value: '#3B82F6' },
    { id: crypto.randomUUID(), value: '#8B5CF6' },
  ])
  const [angle, setAngle] = useState(90)
  const [type, setType] = useState<GradientType>('linear')
  const [shape, setShape] = useState<RadialShape>('circle')
  const [copied, setCopied] = useState<boolean | null>(false)

  const initialized = useRef(false)

  // URL 参数初始化
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const colorsParam = searchParams.get('colors')
    const angleParam = searchParams.get('angle')

    if (colorsParam) {
      const colorsArray = decodeURIComponent(colorsParam)
        .split(',')
        .map((c) => ({ id: crypto.randomUUID(), value: c }))
      setColors(colorsArray)
    }
    if (angleParam) {
      setAngle(Number(angleParam))
    }
  }, [searchParams])

  // localStorage 读取（加 window 守卫）
  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem('bitleap-gradient')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.colors) setColors(parsed.colors.map((c: string) => ({ id: crypto.randomUUID(), value: c })))
        if (parsed.angle !== undefined) setAngle(parsed.angle)
        if (parsed.type) setType(parsed.type)
        if (parsed.shape) setShape(parsed.shape)
      } catch { /* ignore */ }
    }
  }, [])

  // localStorage 写入（加 window 守卫）
  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('bitleap-gradient', JSON.stringify({
      colors: colors.map(c => c.value),
      angle,
      type,
      shape,
    }))
  }, [colors, angle, type, shape])

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
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">渐变色生成器</h1>
        <p className="text-app-muted">多色渐变生成，支持线性渐变与中心渐变 · 数据自动保存到本地</p>
      </div>

      <div
        className="w-full h-48 rounded-2xl border border-app-border mb-8 shadow-sm"
        style={{ background: previewStyle }}
      />

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

      <div className="mb-8">
        <label className="block text-sm font-medium mb-2 text-gray-700">渐变类型</label>
        <div className="flex gap-4">
          <button
            onClick={() => setType('linear')}
            className={`px-5 py-3 rounded-xl border text-sm font-medium transition ${
              type === 'linear'
                ? 'bg-black text-white border-black'
                : 'bg-app-bg text-gray-800 border-gray-300 hover:bg-gray-50'
            }`}
          >
            线性渐变
          </button>
          <button
            onClick={() => setType('radial')}
            className={`px-5 py-3 rounded-xl border text-sm font-medium transition ${
              type === 'radial'
                ? 'bg-black text-white border-black'
                : 'bg-app-bg text-gray-800 border-gray-300 hover:bg-gray-50'
            }`}
          >
            中心渐变
          </button>
        </div>
      </div>

      {type === 'linear' && (
        <div className="mb-8">
          <label className="block text-sm font-medium mb-2 text-gray-700">角度：{angle}°</label>
          <input
            type="range"
            min={0}
            max={360}
            value={angle}
            onChange={(e) => setAngle(Number(e.target.value))}
            className="w-full accent-gray-900"
          />
          <div className="flex flex-wrap gap-3 mt-4">
            {DIRECTIONS.map((d) => (
              <button
                key={d.label}
                onClick={() => setAngle(d.angle)}
                className={`px-5 py-3 rounded-xl border text-sm font-medium transition ${
                  angle === d.angle
                    ? 'bg-black text-white border-black'
                    : 'bg-app-bg text-gray-800 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}

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
                    ? 'bg-black text-white border-black'
                    : 'bg-app-bg text-gray-800 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {s === 'circle' ? '圆形' : '椭圆'}
              </button>
            ))}
          </div>
        </div>
      )}

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
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
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

      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">CSS 代码</label>
        <div className="p-5 bg-gray-900 rounded-xl overflow-x-auto">
          <pre className="text-sm font-mono text-emerald-300 whitespace-pre-wrap break-all">
{`  ${cssCode}`}
          </pre>
        </div>
        <div className="flex gap-3">
          <button
            onClick={copy}
            className="px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 active:scale-95 transition-all font-medium text-sm"
          >
            {copied ? '✓ 已复制到剪贴板' : '复制 CSS'}
          </button>
          <button
            onClick={() => {
              const url = `${window.location.origin}${window.location.pathname}?colors=${encodeURIComponent(colors.map(c => c.value).join(','))}&angle=${angle}`
              navigator.clipboard.writeText(url)
              alert('分享链接已复制！')
            }}
            className="px-6 py-3 bg-app-bg text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 active:scale-95 transition-all font-medium text-sm"
          >
            复制分享链接
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-app-muted mt-10">
        BitLeap · 本地计算 · 隐私优先
      </p>
    </div>
  )
}