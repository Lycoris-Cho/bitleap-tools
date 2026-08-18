'use client'

import { useState, useMemo } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
export default function ColorPage() {
  const [hex, setHex] = useState('#3B82F6') // 默认蓝色

  // 解析 HEX → RGB
  function hexToRgb(hex: string) {
    const h = hex.replace('#', '')
    const n = parseInt(h, 16)
    return {
      r: (n >> 16) & 255,
      g: (n >> 8) & 255,
      b: n & 255,
    }
  }

  // RGB → HEX
  function rgbToHex(r: number, g: number, b: number) {
    return (
      '#' +
      [r, g, b]
        .map((x) => x.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase()
    )
  }

  // RGB → HSL
  function rgbToHsl(r: number, g: number, b: number) {
    r /= 255
    g /= 255
    b /= 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0)
          break
        case g:
          h = (b - r) / d + 2
          break
        case b:
          h = (r - g) / d + 4
          break
      }
      h /= 6
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    }
  }

  const rgb = useMemo(() => hexToRgb(hex), [hex])
  const hsl = useMemo(() => rgbToHsl(rgb.r, rgb.g, rgb.b), [rgb])

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      {/* 标题 */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          颜色转换
        </h1>
        <p className="text-app-muted">
          HEX、RGB、HSL 颜色互转，支持颜色选择器
        </p>
      </div>

      {/* 颜色预览 */}
      <div
        className="w-full h-32 rounded-2xl border border-app-border mb-8"
        style={{ backgroundColor: hex }}
      />

      {/* 颜色选择器 */}
      <div className="flex items-center gap-6 mb-8">
        <input
          type="color"
          value={hex}
          onChange={(e) => setHex(e.target.value)}
          className="w-16 h-16 p-0 border-0 bg-transparent cursor-pointer"
        />
        <div className="text-sm text-gray-500">
          点击色块选择颜色
        </div>
      </div>

      {/* 颜色值展示 */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">HEX</label>
          <input
            value={hex}
            onChange={(e) => setHex(e.target.value)}
            placeholder="#3B82F6"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">RGB</label>
          <input
            value={`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`}
            readOnly
            className="w-full px-4 py-3 bg-gray-50 border border-app-border rounded-xl font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">HSL</label>
          <input
            value={`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`}
            readOnly
            className="w-full px-4 py-3 bg-gray-50 border border-app-border rounded-xl font-mono text-sm"
          />
        </div>
      </div>

      {/* SEO 文案 */}
      <section className="mt-16 pt-10 border-t border-app-border">
        <h2 className="text-lg font-semibold mb-3">使用说明</h2>
        <ul className="text-sm text-app-muted space-y-2 leading-relaxed">
          <li>• 支持 HEX、RGB、HSL 三种颜色格式互转</li>
          <li>• 可直接使用颜色选择器，或手动输入 HEX 值</li>
          <li>• 适用于前端开发、UI 设计、配色参考</li>
          <li>• 所有计算均在浏览器本地完成</li>
        </ul>
      </section>
    </div>
  )
}