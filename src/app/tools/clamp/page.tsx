'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Breadcrumb } from '@/components/breadcrumb'
export default function ClampPage() {
  const [minSize, setMinSize] = useState(16)
  const [maxSize, setMaxSize] = useState(32)
  const [minWidth, setMinWidth] = useState(375)
  const [maxWidth, setMaxWidth] = useState(1280)
  const [viewport, setViewport] = useState<number | null>(null)

  const styleRef = useRef<HTMLStyleElement | null>(null)

  // ✅ 视口宽度（客户端-only，根治 hydration 报错）
  useEffect(() => {
    const update = () => setViewport(window.innerWidth)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const preferred = (minSize + maxSize) / 2
  const clampValue = `clamp(${minSize}px, ${preferred}px + (${maxSize}px - ${minSize}px) * ((100vw - ${minWidth}px) / (${maxWidth}px - ${minWidth}px)), ${maxSize}px)`

  // ✅ 客户端动态注入样式（SSR 安全）
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

  return (
    <div className="max-w-3xl mx-auto py-16 px-6">
      <Breadcrumb />
      <h1 className="text-3xl font-bold mt-6 mb-2">clamp() 流体计算器</h1>
      <p className="text-app-muted mb-8">
        计算流体字号 / 间距，告别媒体查询。
      </p>

      {/* 参数面板 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
        {[
          { label: '最小尺寸 (px)', value: minSize, setter: setMinSize, min: 8, max: 64 },
          { label: '最大尺寸 (px)', value: maxSize, setter: setMaxSize, min: 16, max: 128 },
          { label: '最小视口 (px)', value: minWidth, setter: setMinWidth, min: 320, max: 768 },
          { label: '最大视口 (px)', value: maxWidth, setter: setMaxWidth, min: 768, max: 1920 },
        ].map((item) => (
          <div key={item.label}>
            <label className="text-sm text-app-muted block mb-2">
              {item.label}：{item.value}
            </label>
            <input
              type="range"
              min={item.min}
              max={item.max}
              value={item.value}
              onChange={(e) => item.setter(Number(e.target.value))}
              className="w-full"
            />
          </div>
        ))}
      </div>

      {/* 输出 */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">CSS 输出</span>
          <button
            onClick={() => navigator.clipboard.writeText(`font-size: ${clampValue};`)}
            className="text-sm px-3 py-1.5 bg-black text-white rounded-lg hover:bg-gray-800 transition"
          >
            复制
          </button>
        </div>
        <code className="block bg-gray-100 px-4 py-3 rounded-xl text-sm break-all">
          {clampValue}
        </code>
      </div>

      {/* 预览 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">实时预览</span>
          <span className="text-xs text-app-muted">
            当前视口：{viewport ?? '—'}px
          </span>
        </div>
        <div className="bg-gray-50 border border-app-border rounded-xl p-6">
          <p className="clamp-demo font-bold">
            这是一段流体排版文字，随视口宽度平滑缩放。
          </p>
          <p className="text-sm text-gray-500 mt-4">
            最小：{minSize}px / 最大：{maxSize}px / 视口：{minWidth}px → {maxWidth}px
          </p>
        </div>
      </div>

      {/* 原理说明 */}
      <div className="mt-10 text-xs text-app-muted leading-relaxed">
        <p>· clamp() 会在 min 和 max 之间自动插值</p>
        <p>· 中间值 = 基于视口宽度的线性函数</p>
        <p>· 浏览器原生支持，无需媒体查询</p>
        <p>· 适合字号、间距、容器宽度等流体值</p>
      </div>
    </div>
  )
}