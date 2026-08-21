'use client'

import { useState } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

export default function BoxShadowPage() {
  const [x, setX] = useState(0)
  const [y, setY] = useState(20)
  const [blur, setBlur] = useState(40)
  const [spread, setSpread] = useState(0)
  const [opacity, setOpacity] = useState(15)
  const [color, setColor] = useState('#000000')
  const [inset, setInset] = useState(false)
  const [copied, setCopied] = useState(false)

  const alpha = Math.round(opacity * 2.55)
    .toString(16)
    .padStart(2, '0')
  const rgba = `${color}${alpha}`

  const shadow = `${inset ? 'inset ' : ''}${x}px ${y}px ${blur}px ${spread}px ${rgba}`
  const cssCode = `box-shadow: ${shadow};`

  const copy = async () => {
    await navigator.clipboard.writeText(cssCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const reset = () => {
    setX(0)
    setY(20)
    setBlur(40)
    setSpread(0)
    setOpacity(15)
    setColor('#000000')
    setInset(false)
    setCopied(false)
  }

  const sliders = [
    { label: 'X 偏移', value: x, set: setX, min: -100, max: 100 },
    { label: 'Y 偏移', value: y, set: setY, min: -100, max: 100 },
    { label: '模糊', value: blur, set: setBlur, min: 0, max: 200 },
    { label: '扩散', value: spread, set: setSpread, min: -100, max: 100 },
  ]

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Box Shadow 生成器</h1>
        <p className="text-app-muted text-sm">可视化生成 CSS 盒阴影，支持实时预览与复制</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* 预览区 */}
        <div className="flex items-center justify-center rounded-2xl border border-app-border bg-gray-50 p-10 min-h-[280px]">
          <div
            className="w-40 h-40 rounded-2xl bg-white"
            style={{ boxShadow: shadow }}
          />
        </div>

        {/* 控制区 */}
        <div className="space-y-5">
          {sliders.map((s) => (
            <div key={s.label}>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-700 font-medium">{s.label}</span>
                <span className="font-mono text-violet-600 font-semibold">{s.value}px</span>
              </div>
              <input
                type="range"
                min={s.min}
                max={s.max}
                value={s.value}
                onChange={(e) => s.set(Number(e.target.value))}
                className="w-full accent-violet-500"
              />
            </div>
          ))}

          {/* 不透明度 */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-700 font-medium">不透明度</span>
              <span className="font-mono text-violet-600 font-semibold">{opacity}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-full accent-violet-500"
            />
          </div>

          {/* 颜色 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">颜色</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-12 h-12 p-0 border-0 bg-transparent cursor-pointer rounded-lg shrink-0"
              />
              <input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
          </div>

          {/* 内阴影 */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={inset}
              onChange={(e) => setInset(e.target.checked)}
              className="w-4 h-4 accent-violet-500"
            />
            <span className="text-sm text-gray-700">内阴影（inset）</span>
          </label>
        </div>
      </div>

      {/* CSS 输出 */}
      <div className="mt-10 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">CSS 代码</label>
          <div className="flex gap-2">
            <button
              onClick={copy}
              className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 active:scale-95 transition-all"
            >
              {copied ? '✓ 已复制' : '📋 复制 CSS'}
            </button>
            <button
              onClick={reset}
              className="px-4 py-2 bg-orange-50 text-orange-600 border border-orange-200 text-sm font-medium rounded-lg hover:bg-orange-100 active:scale-95 transition-all"
            >
              重置
            </button>
          </div>
        </div>
        <div className="p-5 bg-gray-900 border border-app-border rounded-xl overflow-auto">
          <pre className="text-sm font-mono text-emerald-300 whitespace-pre-wrap break-all">
{`box-shadow: ${shadow};`}
          </pre>
        </div>
      </div>

      {/* 说明卡片 */}
      <div className="mt-10 p-4 bg-gray-50 border border-app-border rounded-xl">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">使用说明</h3>
        <ul className="text-xs text-app-muted space-y-1.5 leading-relaxed">
          <li>• 拖动滑块实时调整阴影参数，预览区同步更新</li>
          <li>• 支持外阴影与内阴影（inset）模式切换</li>
          <li>• 不透明度 0–100%，自动转换为 16 进制 alpha 通道</li>
          <li>• 生成的 CSS 代码可直接用于按钮、卡片、弹窗等 UI 元素</li>
        </ul>
      </div>

      <FooterNote />
    </div>
  )
}