'use client'

import { useState } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
export default function BoxShadowPage() {
  const [x, setX] = useState(0)
  const [y, setY] = useState(20)
  const [blur, setBlur] = useState(40)
  const [spread, setSpread] = useState(0)
  const [opacity, setOpacity] = useState(15)
  const [color, setColor] = useState('#000000')
  const [inset, setInset] = useState(false)

  const rgba = `${color}${Math.round(opacity * 2.55)
    .toString(16)
    .padStart(2, '0')}`

  const shadow = `${inset ? 'inset ' : ''}${x}px ${y}px ${blur}px ${spread}px ${rgba}`

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <Breadcrumb />
      {/* 标题 */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Box Shadow 生成器
        </h1>
        <p className="text-app-muted">
          可视化生成 CSS 盒阴影，支持实时预览与复制
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* 预览区 */}
        <div className="flex items-center justify-center rounded-2xl border border-app-border bg-gray-50 p-10">
          <div
            className="w-40 h-40 rounded-2xl bg-app-bg"
            style={{ boxShadow: shadow }}
          />
        </div>

        {/* 控制区 */}
        <div className="space-y-6">
          {[
            { label: 'X 偏移', value: x, set: setX, min: -100, max: 100 },
            { label: 'Y 偏移', value: y, set: setY, min: -100, max: 100 },
            { label: '模糊', value: blur, set: setBlur, min: 0, max: 200 },
            { label: '扩散', value: spread, set: setSpread, min: -100, max: 100 },
          ].map((s) => (
            <div key={s.label}>
              <div className="flex justify-between text-sm mb-2">
                <span>{s.label}</span>
                <span className="font-mono">{s.value}px</span>
              </div>
              <input
                type="range"
                min={s.min}
                max={s.max}
                value={s.value}
                onChange={(e) => s.set(Number(e.target.value))}
                className="w-full"
              />
            </div>
          ))}

          {/* 不透明度 */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>不透明度</span>
              <span className="font-mono">{opacity}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* 颜色 */}
          <div>
            <label className="block text-sm font-medium mb-2">颜色</label>
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-14 h-14 p-0 border-0 bg-transparent cursor-pointer"
              />
              <input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-mono text-sm"
              />
            </div>
          </div>

          {/* 内阴影 */}
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={inset}
              onChange={(e) => setInset(e.target.checked)}
              className="w-5 h-5"
            />
            <span className="text-sm">内阴影（inset）</span>
          </label>
        </div>
      </div>

      {/* CSS 输出 */}
      <div className="mt-12 space-y-4">
        <label className="block text-sm font-medium">CSS 代码</label>
        <div className="p-5 bg-gray-50 border border-app-border rounded-xl">
          <pre className="text-sm font-mono whitespace-pre-wrap break-all">
{`box-shadow: ${shadow};`}
          </pre>
        </div>
        <button
          onClick={() =>
            navigator.clipboard.writeText(`box-shadow: ${shadow};`)
          }
          className="px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition font-medium"
        >
          复制 CSS
        </button>
      </div>

      {/* SEO 文案 */}
      <section className="mt-16 pt-10 border-t border-app-border">
        <h2 className="text-lg font-semibold mb-3">使用说明</h2>
        <ul className="text-sm text-app-muted space-y-2 leading-relaxed">
          <li>• 拖动滑块实时调整阴影参数</li>
          <li>• 支持外阴影与内阴影（inset）</li>
          <li>• 生成的 CSS 代码可直接用于生产</li>
          <li>• 适合按钮、卡片、弹窗等 UI 元素</li>
        </ul>
      </section>
    </div>
  )
}