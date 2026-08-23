'use client'

import { useState, useMemo } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

export default function ColorPage() {
  const [hex, setHex] = useState('#3B82F6')
  const [alpha, setAlpha] = useState(1)          // 新增：透明度 0~1
  const [copied, setCopied] = useState<string | null>(null)

  function hexToRgb(hex: string) {
    const h = hex.replace('#', '')
    if (h.length !== 6) return { r: 0, g: 0, b: 0 }
    const n = parseInt(h, 16)
    return {
      r: (n >> 16) & 255,
      g: (n >> 8) & 255,
      b: n & 255,
    }
  }

  function rgbToHex(r: number, g: number, b: number) {
    return (
      '#' +
      [r, g, b]
        .map((x) => x.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase()
    )
  }

  function rgbToHsl(r: number, g: number, b: number) {
    r /= 255; g /= 255; b /= 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0, s = 0
    const l = (max + min) / 2
    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break
        case g: h = (b - r) / d + 2; break
        case b: h = (r - g) / d + 4; break
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

  const rgbStr = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
  const rgbaStr = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
  const hslStr = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`
  const hslaStr = `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${alpha})`

  // HEX 带 alpha → #RRGGBBAA
  const hexAlpha = useMemo(() => {
    const a = Math.round(alpha * 255).toString(16).padStart(2, '0').toUpperCase()
    return hex + a
  }, [hex, alpha])

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  const reset = () => {
    setHex('#3B82F6')
    setAlpha(1)
    setCopied(null)
  }

  const resultRows = [
    { label: 'HEX', value: hexAlpha, copyKey: 'hex' },
    { label: 'RGB', value: alpha === 1 ? rgbStr : rgbaStr, copyKey: 'rgb' },
    { label: 'HSL', value: alpha === 1 ? hslStr : hslaStr, copyKey: 'hsl' },
  ]

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">颜色转换</h1>
        <p className="text-app-muted text-sm">HEX、RGB、HSL 颜色互转，支持颜色选择器与透明度调节</p>
      </div>

      {/* 颜色预览（带透明度网格背景） */}
      <div className="relative w-full h-32 rounded-2xl border border-app-border mb-6 shadow-sm overflow-hidden">
        {/* 棋盘格背景，表示透明 */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
            backgroundSize: '12px 12px',
            backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px',
          }}
        />
        {/* 颜色层 */}
        <div
          className="absolute inset-0"
          style={{ backgroundColor: hex, opacity: alpha }}
        />
      </div>

      {/* 颜色选择器 + 透明度滑块 + 重置 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <input
            type="color"
            value={hex}
            onChange={(e) => setHex(e.target.value)}
            className="w-14 h-14 p-0 border-0 bg-transparent cursor-pointer rounded-lg shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <span className="text-sm text-app-muted shrink-0">透明度</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={alpha}
                onChange={(e) => setAlpha(Number(e.target.value))}
                className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, transparent, ${hex})`,
                }}
              />
              <span className="text-xs font-mono text-gray-500 w-10 text-right shrink-0">
                {Math.round(alpha * 100)}%
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={reset}
          className="px-5 py-2.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-xl text-sm font-medium hover:bg-orange-100 active:scale-95 transition-all shrink-0"
        >
          重置
        </button>
      </div>

      {/* 三行结果卡片 */}
      <div className="space-y-3">
        {resultRows.map((row) => (
          <div
            key={row.copyKey}
            className="flex items-center gap-3 px-4 py-3 bg-app-bg border border-app-border rounded-xl hover:border-violet-200 transition-all"
          >
            <span className="text-sm font-semibold text-gray-500 w-10 shrink-0">
              {row.label}
            </span>
            <span className="flex-1 font-mono text-sm text-gray-800 break-all select-all">
              {row.value}
            </span>
            <button
              onClick={() => copy(row.value, row.copyKey)}
              className="shrink-0 px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 active:scale-95 transition-all"
            >
              {copied === row.copyKey ? '✓ 已复制' : '📋 复制'}
            </button>
          </div>
        ))}
      </div>

      {/* 说明卡片 */}
      <div className="mt-10 p-4 bg-gray-50 border border-app-border rounded-xl">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">使用说明</h3>
        <ul className="text-xs text-app-muted space-y-1.5 leading-relaxed">
          <li>• 支持 HEX、RGB、HSL 三种颜色格式实时互转</li>
          <li>• 点击左侧色块可打开系统颜色选择器</li>
          <li>• 拖动"透明度"滑块可调节 Alpha 通道，实时生成 RGBA / HSLA / #RRGGBBAA</li>
          <li>• 所有计算均在浏览器本地完成</li>
          <li>• 点击每行右侧按钮可复制对应颜色值</li>
        </ul>
      </div>

      <FooterNote />
    </div>
  )
}