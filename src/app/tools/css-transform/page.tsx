'use client'
import { useState, useMemo } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

export default function CssTransformPage() {
  const [translateX, setTranslateX] = useState(0)
  const [translateY, setTranslateY] = useState(0)
  const [rotate, setRotate] = useState(0)
  const [scaleX, setScaleX] = useState(1)
  const [scaleY, setScaleY] = useState(1)
  const [skewX, setSkewX] = useState(0)
  const [skewY, setSkewY] = useState(0)
  const [copied, setCopied] = useState(false)

  const transformCode = useMemo(() => {
    return `transform: translate(${translateX}px, ${translateY}px) rotate(${rotate}deg) scale(${scaleX}, ${scaleY}) skew(${skewX}deg, ${skewY}deg);`
  }, [translateX, translateY, rotate, scaleX, scaleY, skewX, skewY])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(transformCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleReset = () => {
    setTranslateX(0)
    setTranslateY(0)
    setRotate(0)
    setScaleX(1)
    setScaleY(1)
    setSkewX(0)
    setSkewY(0)
    setCopied(false)
  }

  const sliders = [
    { label: 'translateX', value: translateX, set: setTranslateX, min: -200, max: 200, step: 1, unit: 'px' },
    { label: 'translateY', value: translateY, set: setTranslateY, min: -200, max: 200, step: 1, unit: 'px' },
    { label: 'rotate', value: rotate, set: setRotate, min: -180, max: 180, step: 1, unit: '°' },
    { label: 'scaleX', value: scaleX, set: setScaleX, min: 0, max: 2, step: 0.01, unit: '' },
    { label: 'scaleY', value: scaleY, set: setScaleY, min: 0, max: 2, step: 0.01, unit: '' },
    { label: 'skewX', value: skewX, set: setSkewX, min: -45, max: 45, step: 1, unit: '°' },
    { label: 'skewY', value: skewY, set: setSkewY, min: -45, max: 45, step: 1, unit: '°' },
  ]

  const transformStyle = `translate(${translateX}px, ${translateY}px) rotate(${rotate}deg) scale(${scaleX}, ${scaleY}) skew(${skewX}deg, ${skewY}deg)`

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Transform 变换工具</h1>
        <p className="text-app-muted text-sm">旋转、缩放、倾斜、位移可视化调试，复制 transform 代码</p>
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
                  step={s.step}
                  value={s.value}
                  onChange={(e) => s.set(Number(e.target.value))}
                  className="flex-1 accent-violet-500"
                />
                <input
                  type="number"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={s.value}
                  onChange={(e) => s.set(Number(e.target.value))}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
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
          <div className="w-full h-72 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden">
            <div
              className="w-28 h-28 bg-violet-500 rounded-xl text-white flex items-center justify-center text-sm font-medium shadow-sm"
              style={{ transform: transformStyle }}
            >
              元素
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">CSS 代码</span>
            </div>
            <div className="p-4 border border-app-border bg-gray-900 rounded-xl overflow-auto">
              <code className="font-mono text-sm text-emerald-300 break-all">{transformCode}</code>
            </div>
          </div>
        </div>
      </div>

      {/* 说明卡片 */}
      <div className="mt-10 p-4 bg-gray-50 border border-app-border rounded-xl">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">使用说明</h3>
        <ul className="text-xs text-app-muted space-y-1.5 leading-relaxed">
          <li>• 拖动滑块或直接在输入框中输入数值来调整变换参数</li>
          <li>• 预览区虚线框为原始位置参考，蓝色方块为变换后位置</li>
          <li>• scale 支持小数（如 0.5 = 缩小一半），skew 控制倾斜角度</li>
          <li>• 点击「重置」恢复默认无变换状态</li>
        </ul>
      </div>

      <FooterNote />
    </div>
  )
}