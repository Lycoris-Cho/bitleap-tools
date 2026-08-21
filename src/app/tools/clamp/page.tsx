'use client'

import { useEffect, useRef, useState } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

export default function ClampPage() {
  const [minSize, setMinSize] = useState(16)
  const [maxSize, setMaxSize] = useState(32)
  const [minWidth, setMinWidth] = useState(375)
  const [maxWidth, setMaxWidth] = useState(1280)
  const [viewport, setViewport] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  const styleRef = useRef<HTMLStyleElement | null>(null)

  useEffect(() => {
    const update = () => setViewport(window.innerWidth)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const preferred = (minSize + maxSize) / 2
  const clampValue = `clamp(${minSize}px, ${preferred}px + (${maxSize}px - ${minSize}px) * ((100vw - ${minWidth}px) / (${maxWidth}px - ${minWidth}px)), ${maxSize}px)`

  useEffect(() => {
    const style = document.createElement('style')
    style.innerHTML = `
      .clamp-demo {
        font-size: ${clampValue};
        line-height: 1.5;
      }
    `
    document.head.appendChild(style)
    styleRef.current = style

    return () => {
      if (styleRef.current) {
        document.head.removeChild(styleRef.current)
      }
    }
  }, [clampValue])

  const copy = async () => {
    await navigator.clipboard.writeText(`font-size: ${clampValue};`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">clamp() 流体计算器</h1>
        <p className="text-app-muted text-sm">计算流体字号 / 间距，告别媒体查询</p>
      </div>

      {/* 参数面板 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 mb-10">
        {[
          { label: '最小尺寸 (px)', value: minSize, setter: setMinSize, min: 8, max: 64 },
          { label: '最大尺寸 (px)', value: maxSize, setter: setMaxSize, min: 16, max: 128 },
          { label: '最小视口 (px)', value: minWidth, setter: setMinWidth, min: 320, max: 768 },
          { label: '最大视口 (px)', value: maxWidth, setter: setMaxWidth, min: 768, max: 1920 },
        ].map((item) => (
          <div key={item.label}>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-700 font-medium">{item.label}</span>
              <span className="font-mono text-violet-600 font-semibold">{item.value}</span>
            </div>
            <input
              type="range"
              min={item.min}
              max={item.max}
              value={item.value}
              onChange={(e) => item.setter(Number(e.target.value))}
              className="w-full accent-violet-500"
            />
          </div>
        ))}
      </div>

      {/* 输出 */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">CSS 输出</span>
          <button
            onClick={copy}
            className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 active:scale-95 transition-all"
          >
            {copied ? '✓ 已复制' : '📋 复制'}
          </button>
        </div>
        <code className="block bg-gray-900 text-emerald-300 px-4 py-3 rounded-xl text-sm break-all font-mono">
          {clampValue}
        </code>
      </div>

      {/* 预览 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">实时预览</span>
          <span className="text-xs text-app-muted">
            当前视口：{viewport ?? '—'}px
          </span>
        </div>
        <div className="bg-gray-50 border border-app-border rounded-xl p-6">
          <p className="clamp-demo font-bold text-gray-800">
            这是一段流体排版文字，随视口宽度平滑缩放。
          </p>
          <p className="text-sm text-app-muted mt-4">
            最小：{minSize}px / 最大：{maxSize}px / 视口：{minWidth}px → {maxWidth}px
          </p>
        </div>
      </div>

      {/* 原理说明 */}
      <div className="mt-10 p-4 bg-gray-50 border border-app-border rounded-xl">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">使用说明</h3>
        <ul className="text-xs text-app-muted space-y-1.5 leading-relaxed">
          <li>• <code className="font-mono bg-white px-1 rounded">clamp()</code> 会在 min 和 max 之间自动插值</li>
          <li>• 中间值 = 基于视口宽度的线性函数，无需媒体查询</li>
          <li>• 浏览器原生支持，适合字号、间距、容器宽度等流体值</li>
          <li>• 调整滑块实时更新公式，复制后直接用于 CSS</li>
        </ul>
      </div>

      <FooterNote />
    </div>
  )
}