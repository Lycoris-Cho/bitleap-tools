'use client'
import { useState, useMemo } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
export default function CssFilterPage() {
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [blur, setBlur] = useState(0)
  const [grayscale, setGrayscale] = useState(0)
  const [hueRotate, setHueRotate] = useState(0)
  const [saturate, setSaturate] = useState(100)
  const [sepia, setSepia] = useState(0)

  const filterCode = useMemo(() => {
    return `filter: brightness(${brightness}%) contrast(${contrast}%) blur(${blur}px) grayscale(${grayscale}%) hue-rotate(${hueRotate}deg) saturate(${saturate}%) sepia(${sepia}%);`
  }, [brightness, contrast, blur, grayscale, hueRotate, saturate, sepia])

  const handleReset = () => {
    setBrightness(100)
    setContrast(100)
    setBlur(0)
    setGrayscale(0)
    setHueRotate(0)
    setSaturate(100)
    setSepia(0)
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <Breadcrumb />
      <h1 className="text-2xl font-bold mb-2">CSS Filter滤镜生成器</h1>
      <p className="text-gray-500 mb-6">调节各项滤镜参数，实时预览，复制CSS代码</p>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          {[
            { label: '亮度 brightness (%)', value: brightness, set: setBrightness, min:0, max:200 },
            { label: '对比度 contrast (%)', value: contrast, set: setContrast, min:0, max:200 },
            { label: '模糊 blur (px)', value: blur, set: setBlur, min:0, max:20 },
            { label: '灰度 grayscale (%)', value: grayscale, set: setGrayscale, min:0, max:100 },
            { label: '色相旋转 hue-rotate (deg)', value: hueRotate, set: setHueRotate, min:0, max:360 },
            { label: '饱和度 saturate (%)', value: saturate, set: setSaturate, min:0, max:300 },
            { label: '深褐色 sepia (%)', value: sepia, set: setSepia, min:0, max:100 },
          ].map((item, idx) => (
            <div key={idx}>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium">{item.label}</label>
                <span className="font-mono text-sm">{item.value}</span>
              </div>
              <div className="flex gap-3 items-center">
                <input
                  type="range"
                  min={item.min}
                  max={item.max}
                  value={item.value}
                  onChange={e => item.set(Number(e.target.value))}
                  className="flex-1 h-2 rounded-lg accent-black"
                />
                <input
                  type="number"
                  min={item.min}
                  max={item.max}
                  value={item.value}
                  onChange={e => item.set(Number(e.target.value))}
                  className="w-20 border border-gray-300 rounded-xl p-1.5 font-mono text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-black/20"
                />
              </div>
            </div>
          ))}

          <div className="flex gap-3 pt-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 border border-gray-300 rounded-lg transition-all duration-200 hover:bg-gray-100 active:bg-gray-200"
            >
              重置
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(filterCode)}
              className="px-4 py-2 bg-black text-white rounded-lg transition-all duration-200 hover:bg-gray-800 active:bg-gray-700"
            >
              复制CSS
            </button>
          </div>
        </div>

        <div>
          <div className="mb-2 font-medium">预览效果</div>
          <div
            className="w-full h-72 rounded-xl bg-[#6366f1] flex items-center justify-center text-white text-xl"
            style={{
              filter: `brightness(${brightness}%) contrast(${contrast}%) blur(${blur}px) grayscale(${grayscale}%) hue-rotate(${hueRotate}deg) saturate(${saturate}%) sepia(${sepia}%)`
            }}
          >
            预览区块
          </div>
          <div className="mt-4 border border-gray-200 rounded-xl p-3 bg-gray-50">
            <code className="font-mono text-sm break-all">{filterCode}</code>
          </div>
        </div>
      </div>
    </div>
  )
}
