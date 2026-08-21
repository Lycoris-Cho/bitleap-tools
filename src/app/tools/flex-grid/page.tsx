'use client'

import { useState, useCallback } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

type Mode = 'flex' | 'grid'
type Viewport = 'sm' | 'md' | 'lg'

const VIEWPORT = {
  sm: { label: '手机', width: 375 },
  md: { label: '平板', width: 768 },
  lg: { label: '桌面', width: 900 },
}

export default function FlexGridPage() {
  const [mode, setMode] = useState<Mode>('grid')
  const [justify, setJustify] = useState('center')
  const [align, setAlign] = useState('center')
  const [gap, setGap] = useState(16)
  const [count, setCount] = useState(6)
  const [minColWidth, setMinColWidth] = useState(180)
  const [viewport, setViewport] = useState<Viewport>('lg')
  const [copied, setCopied] = useState(false)

  const handleModeChange = useCallback((newMode: Mode) => {
    setMode(newMode)
    setJustify('center')
    setAlign('center')
  }, [])

  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10)
    if (isNaN(val)) return
    const safeVal = Math.max(1, Math.min(24, val))
    setCount(safeVal)
  }

  const handleGapChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setGap(Number(e.target.value))
  }, [])

  const handleMinWidthChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMinColWidth(Number(e.target.value))
  }, [])

  const justifyOptions = ['start', 'center', 'end'] as const
  const alignOptions = ['start', 'center', 'end'] as const

  const handleCopy = async () => {
    await navigator.clipboard.writeText(css)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const currentWidth = VIEWPORT[viewport].width
  const containerWidth = Math.min(currentWidth, 900)

  const renderItems = () => {
    return Array.from({ length: count }, (_, i) => i + 1)
  }

  const flexStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: justify,
    alignItems: align,
    gap: `${gap}px`,
    flexWrap: 'wrap',
    minWidth: '100%',
    minHeight: '140px',
  }

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fit, minmax(${minColWidth}px, 1fr))`,
    justifyItems: justify,
    alignItems: align,
    gap: `${gap}px`,
    minHeight: '140px',
  }

  let rawCss = ''
  if (mode === 'flex') {
    rawCss = `display: flex;
justify-content: ${justify};
align-items: ${align};
gap: ${gap}px;
flex-wrap: wrap;`
  } else {
    rawCss = `display: grid;
grid-template-columns: repeat(auto-fit, minmax(${minColWidth}px, 1fr));
justify-items: ${justify};
align-items: ${align};
gap: ${gap}px;`
  }
  const css = rawCss.trimEnd()

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Flex / Grid 可视化</h1>
        <p className="text-app-muted text-sm">调试响应式布局，生成可直接使用的 CSS</p>
      </div>

      {/* 模式切换 */}
      <div className="flex gap-3 mb-8">
        {(['flex', 'grid'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => handleModeChange(m)}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              mode === m
                ? 'bg-violet-500 text-white shadow-sm shadow-violet-500/20'
                : 'bg-app-bg border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {m === 'flex' ? 'Flex 布局' : 'Grid 布局'}
          </button>
        ))}
      </div>

      {/* 控制区 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 mb-10">
        {/* 子项数量 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">子项数量</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCount(Math.max(1, count - 1))}
              className="w-10 h-10 rounded-xl border border-gray-300 text-lg font-medium text-gray-700 hover:bg-gray-100 active:scale-95 transition-all"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              max={24}
              value={count}
              onChange={handleCountChange}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp') setCount(Math.min(24, count + 1))
                if (e.key === 'ArrowDown') setCount(Math.max(1, count - 1))
              }}
              className="w-20 px-3 py-2.5 border border-gray-300 rounded-xl text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            <button
              onClick={() => setCount(Math.min(24, count + 1))}
              className="w-10 h-10 rounded-xl border border-gray-300 text-lg font-medium text-gray-700 hover:bg-gray-100 active:scale-95 transition-all"
            >
              +
            </button>
          </div>
        </div>

        {/* Gap */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-700 font-medium">Gap</span>
            <span className="font-mono text-violet-600 font-semibold">{gap}px</span>
          </div>
          <input
            type="range"
            min={0}
            max={64}
            value={gap}
            onChange={handleGapChange}
            className="w-full accent-violet-500"
          />
        </div>

        {/* Grid 最小列宽 */}
        {mode === 'grid' && (
          <div className="md:col-span-2">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-700 font-medium">最小列宽（响应式核心）</span>
              <span className="font-mono text-violet-600 font-semibold">{minColWidth}px</span>
            </div>
            <input
              type="range"
              min={120}
              max={320}
              value={minColWidth}
              onChange={handleMinWidthChange}
              className="w-full accent-violet-500"
            />
          </div>
        )}

        {/* Justify */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {mode === 'flex' ? 'Justify-content' : 'Justify-items'}
          </label>
          <div className="flex flex-wrap gap-2">
            {justifyOptions.map((v) => (
              <button
                key={v}
                onClick={() => setJustify(v)}
                className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                  justify === v
                    ? 'bg-violet-500 text-white border-violet-500 shadow-sm shadow-violet-500/20'
                    : 'bg-app-bg border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Align */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Align-items</label>
          <div className="flex flex-wrap gap-2">
            {alignOptions.map((v) => (
              <button
                key={v}
                onClick={() => setAlign(v)}
                className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                  align === v
                    ? 'bg-violet-500 text-white border-violet-500 shadow-sm shadow-violet-500/20'
                    : 'bg-app-bg border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 视口切换 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">视口宽度</label>
        <div className="flex gap-3 flex-wrap">
          {(Object.keys(VIEWPORT) as Viewport[]).map((k) => (
            <button
              key={k}
              onClick={() => setViewport(k)}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                viewport === k
                  ? 'bg-violet-500 text-white shadow-sm shadow-violet-500/20'
                  : 'bg-app-bg border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {VIEWPORT[k].label}（{VIEWPORT[k].width}px）
            </button>
          ))}
        </div>
      </div>

      {/* 预览区域 */}
      <div className="mb-10">
        <p className="text-xs text-app-muted mb-3">
          当前预览容器宽度：{containerWidth}px
        </p>
        <div
          className="mx-auto border border-app-border rounded-2xl bg-gray-50 p-6 overflow-x-auto transition-all"
          style={{ width: containerWidth }}
        >
          <div style={mode === 'flex' ? flexStyle : gridStyle}>
            {renderItems().map((i) => (
              <div
                key={i}
                className="w-20 h-24 rounded-xl bg-violet-100 border border-violet-200 transition-colors hover:bg-violet-200"
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
      </div>

      {/* CSS 代码 */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">CSS 代码</label>
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 active:scale-95 transition-all"
          >
            {copied ? '✓ 已复制' : '📋 复制 CSS'}
          </button>
        </div>
        <div className="p-5 bg-gray-900 border border-app-border rounded-xl overflow-auto">
          <pre className="text-sm font-mono text-emerald-300 whitespace-pre-wrap break-all">
{css}
          </pre>
        </div>
      </div>

      {/* 说明卡片 */}
      <div className="mt-10 p-4 bg-gray-50 border border-app-border rounded-xl">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">使用说明</h3>
        <ul className="text-xs text-app-muted space-y-1.5 leading-relaxed">
          <li>• Flex 模式使用 <code className="font-mono bg-white px-1 rounded">flex-wrap</code> 实现自动换行</li>
          <li>• Grid 模式使用 <code className="font-mono bg-white px-1 rounded">auto-fit + minmax()</code> 实现响应式列</li>
          <li>• 切换视口宽度可预览不同屏幕尺寸下的布局效果</li>
          <li>• 点击「复制 CSS」即可将生成的样式粘贴到项目中使用</li>
        </ul>
      </div>

      <FooterNote />
    </div>
  )
}