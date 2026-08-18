'use client'

import { useState, useCallback } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
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
  const [copyTip, setCopyTip] = useState('')

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

  // 已移除 stretch，Grid 和 Flex 共用同一组
  const justifyOptions = ['start', 'center', 'end'] as const
  const alignOptions = ['start', 'center', 'end'] as const

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(css)
      setCopyTip('✅ 已复制到剪贴板')
      setTimeout(() => setCopyTip(''), 2000)
    } catch (err) {
      setCopyTip('❌ 复制失败，请手动复制')
      setTimeout(() => setCopyTip(''), 2000)
    }
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
      {/* 标题 */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Flex / Grid 可视化
        </h1>
        <p className="text-app-muted">
          调试响应式布局，生成可直接使用的 CSS
        </p>
      </div>

      {/* 模式切换 */}
      <div className="flex gap-4 mb-8">
        {(['flex', 'grid'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => handleModeChange(m)}
            className={`px-5 py-3 rounded-xl border text-sm font-medium transition ${
              mode === m
                ? 'bg-black text-white border-black'
                : 'bg-app-bg text-gray-800 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {m === 'flex' ? 'Flex 布局' : 'Grid 布局'}
          </button>
        ))}
      </div>

      {/* 控制区 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        {/* 子项数量 */}
        <div>
          <label className="block text-sm font-medium mb-2">
            子项数量
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCount(Math.max(1, count - 1))}
              className="w-10 h-10 rounded-xl border text-lg"
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
              className="w-20 px-4 py-3 border rounded-xl text-center font-mono"
            />
            <button
              onClick={() => setCount(Math.min(24, count + 1))}
              className="w-10 h-10 rounded-xl border text-lg"
            >
              +
            </button>
          </div>
        </div>

        {/* Gap */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Gap</span>
            <span className="font-mono">{gap}px</span>
          </div>
          <input
            type="range"
            min={0}
            max={64}
            value={gap}
            onChange={handleGapChange}
            className="w-full"
          />
        </div>

        {/* Grid 最小列宽 */}
        {mode === 'grid' && (
          <div className="md:col-span-2">
            <div className="flex justify-between text-sm mb-2">
              <span>最小列宽（响应式核心）</span>
              <span className="font-mono">{minColWidth}px</span>
            </div>
            <input
              type="range"
              min={120}
              max={320}
              value={minColWidth}
              onChange={handleMinWidthChange}
              className="w-full"
            />
          </div>
        )}

        {/* Justify */}
        <div>
          <label className="block text-sm font-medium mb-2">
            {mode === 'flex' ? 'Justify-content' : 'Justify-items'}
          </label>
          <div className="flex flex-wrap gap-2">
            {justifyOptions.map((v) => (
              <button
                key={v}
                onClick={() => setJustify(v)}
                className={`px-4 py-2 rounded-xl border text-sm transition ${
                  justify === v
                    ? 'bg-black text-white border-black shadow-md'
                    : 'bg-app-bg text-gray-800 border-gray-300'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Align-items */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Align-items
          </label>
          <div className="flex flex-wrap gap-2">
            {alignOptions.map((v) => (
              <button
                key={v}
                onClick={() => setAlign(v)}
                className={`px-4 py-2 rounded-xl border text-sm transition ${
                  align === v
                    ? 'bg-black text-white border-black shadow-lg ring-2 ring-gray-300'
                    : 'bg-app-bg text-gray-800 border-gray-300 hover:border-gray-400'
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
        <label className="block text-sm font-medium mb-2">
          视口宽度
        </label>
        <div className="flex gap-4 flex-wrap">
          {(Object.keys(VIEWPORT) as Viewport[]).map((k) => (
            <button
              key={k}
              onClick={() => setViewport(k)}
              className={`px-5 py-3 rounded-xl border text-sm font-medium transition ${
                viewport === k
                  ? 'bg-black text-white border-black'
                  : 'bg-app-bg text-gray-800 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {VIEWPORT[k].label}（{VIEWPORT[k].width}px）
            </button>
          ))}
        </div>
      </div>

      {/* 预览区域 */}
      <div className="mb-10">
        <p className="text-xs text-gray-500 mb-5 ">
          当前预览容器宽度：{containerWidth}px
        </p>

        <div
          className="mx-auto border rounded-2xl bg-gray-50 p-6 overflow-x-auto transition-all"
          style={{ width: containerWidth }}
        >
          <div style={mode === 'flex' ? flexStyle : gridStyle}>
            {renderItems().map((i) => (
              <div
                key={i}
                className="w-20 h-24 rounded-xl bg-app-bg border transition-colors hover:bg-gray-100"
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
      </div>

      {/* CSS 代码区域 */}
      <div className="space-y-4">
        <label className="block text-sm font-medium">CSS 代码</label>
        <div className="p-5 bg-gray-50 border rounded-xl">
          <pre className="text-sm font-mono whitespace-pre-wrap break-all">
            {css}
          </pre>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleCopy}
            className="px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
          >
            复制 CSS
          </button>
          {copyTip && (
            <span className="text-sm text-green-600 font-medium">{copyTip}</span>
          )}
        </div>
      </div>
    </div>
  )
}
