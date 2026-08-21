'use client'
import { useState, useMemo } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

export default function CssFilterPage() {
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [blur, setBlur] = useState(0)
  const [grayscale, setGrayscale] = useState(0)
  const [hueRotate, setHueRotate] = useState(0)
  const [saturate, setSaturate] = useState(100)
  const [sepia, setSepia] = useState(0)
  const [copied, setCopied] = useState(false)

  const filterCode = useMemo(() => {
    return `filter: brightness(${brightness}%) contrast(${contrast}%) blur(${blur}px) grayscale(${grayscale}%) hue-rotate(${hueRotate}deg) saturate(${saturate}%) sepia(${sepia}%);`
  }, [brightness, contrast, blur, grayscale, hueRotate, saturate, sepia])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(filterCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleReset = () => {
    setBrightness(100)
    setContrast(100)
    setBlur(0)
    setGrayscale(0)
    setHueRotate(0)
    setSaturate(100)
    setSepia(0)
    setCopied(false)
  }

  const sliders = [
    { label: '亮度', value: brightness, set: setBrightness, min: 0, max: 200, unit: '%' },
    { label: '对比度', value: contrast, set: setContrast, min: 0, max: 200, unit: '%' },
    { label: '模糊', value: blur, set: setBlur, min: 0, max: 20, unit: 'px' },
    { label: '灰度', value: grayscale, set: setGrayscale, min: 0, max: 100, unit: '%' },
    { label: '色相旋转', value: hueRotate, set: setHueRotate, min: 0, max: 360, unit: '°' },
    { label: '饱和度', value: saturate, set: setSaturate, min: 0, max: 300, unit: '%' },
    { label: '深褐色', value: sepia, set: setSepia, min: 0, max: 100, unit: '%' },
  ]

  const filterStyle = `brightness(${brightness}%) contrast(${contrast}%) blur(${blur}px) grayscale(${grayscale}%) hue-rotate(${hueRotate}deg) saturate(${saturate}%) sepia(${sepia}%)`

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">CSS Filter 滤镜生成器</h1>
        <p className="text-app-muted text-sm">调节各项滤镜参数，实时预览，复制 CSS 代码</p>
      </div>

      <div className="grid md:grid-cols-2 gap-10">
        {/* 控制区 */}
        <div className="space-y-5">
          {sliders.map((s) => (
            <div key={s.label}>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-gray-700">{s.label}</span>
                <span className="font-mono text-violet-600 font-semibold">{s.value}{s.unit}</span>
              </div>
              <div className="flex gap-3 items-center">
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  value={s.value}
                  onChange={(e) => s.set(Number(e.target.value))}
                  className="flex-1 accent-violet-500"
                />
                <input
                  type="number"
                  min={s.min}
                  max={s.max}
                  value={s.value}
                  onChange={(e) => s.set(Number(e.target.value))}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
            </div>
          ))}

          <div className="flex gap-3 pt-3">
            <button
              onClick={handleReset}
              className="px-4 py-2.5 bg-orange-50 text-orange-600 border border-orange-200 text-sm font-medium rounded-lg hover:bg-orange-100 active:scale-95 transition-all"
            >
              重置
            </button>
            <button
              onClick={handleCopy}
              className="px-4 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 active:scale-95 transition-all"
            >
              {copied ? '✓ 已复制' : '📋 复制 CSS'}
            </button>
          </div>
        </div>

        {/* 预览区 */}
        <div>
          <div className="mb-2 text-sm font-medium text-gray-700">预览效果</div>
          <div
            className="w-full h-72 rounded-xl bg-cover bg-center flex items-center justify-center text-white text-xl font-bold shadow-sm"
            style={{
              backgroundImage: 'url(https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80)',
              filter: filterStyle,
            }}
          >
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">CSS 代码</span>
            </div>
            <div className="p-4 border border-app-border bg-gray-900 rounded-xl overflow-auto">
              <code className="font-mono text-sm text-emerald-300 break-all">{filterCode}</code>
            </div>
          </div>
        </div>
      </div>

      {/* 说明卡片 */}
      <div className="mt-10 p-4 bg-gray-50 border border-app-border rounded-xl">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">使用说明</h3>
        <ul className="text-xs text-app-muted space-y-1.5 leading-relaxed">
          <li>• 拖动滑块或直接在输入框中输入数值来调整滤镜参数</li>
          <li>• 滤镜组合顺序会影响最终效果，复制的 CSS 已按标准顺序排列</li>
          <li>• 适用于图片、卡片、背景等任意 HTML 元素</li>
          <li>• 点击「重置」恢复默认无滤镜状态</li>
        </ul>
      </div>

      <FooterNote />
    </div>
  )
}