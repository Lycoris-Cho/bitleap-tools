'use client'
import { useState, useMemo } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
export default function CssTransformPage() {
  const [translateX, setTranslateX] = useState(0)
  const [translateY, setTranslateY] = useState(0)
  const [rotate, setRotate] = useState(0)
  const [scaleX, setScaleX] = useState(1)
  const [scaleY, setScaleY] = useState(1)
  const [skewX, setSkewX] = useState(0)
  const [skewY, setSkewY] = useState(0)

  const transformCode = useMemo(() => {
    return `transform: translate(${translateX}px, ${translateY}px) rotate(${rotate}deg) scale(${scaleX}, ${scaleY}) skew(${skewX}deg, ${skewY}deg);`
  }, [translateX, translateY, rotate, scaleX, scaleY, skewX, skewY])

  const handleReset = () => {
    setTranslateX(0)
    setTranslateY(0)
    setRotate(0)
    setScaleX(1)
    setScaleY(1)
    setSkewX(0)
    setSkewY(0)
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <Breadcrumb />
      <h1 className="text-2xl font-bold mb-2">Transform变换工具</h1>
      <p className="text-gray-500 mb-6">旋转、缩放、倾斜、位移可视化调试，复制transform代码</p>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          {[
            { label: 'translateX (px)', value: translateX, set: setTranslateX, min:-200, max:200 },
            { label: 'translateY (px)', value: translateY, set: setTranslateY, min:-200, max:200 },
            { label: 'rotate (deg)', value: rotate, set: setRotate, min:-180, max:180 },
            { label: 'scaleX', value: scaleX, set: setScaleX, min:0, max:2, step:0.01 },
            { label: 'scaleY', value: scaleY, set: setScaleY, min:0, max:2, step:0.01 },
            { label: 'skewX (deg)', value: skewX, set: setSkewX, min:-45, max:45 },
            { label: 'skewY (deg)', value: skewY, set: setSkewY, min:-45, max:45 },
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
                  step={(item as any).step || 1}
                  value={item.value}
                  onChange={e => item.set(Number(e.target.value))}
                  className="flex-1 h-2 rounded-lg accent-black"
                />
                <input
                  type="number"
                  min={item.min}
                  max={item.max}
                  step={(item as any).step || 1}
                  value={item.value}
                  onChange={e => item.set(Number(e.target.value))}
                  className="w-24 border border-gray-300 rounded-xl p-1.5 font-mono text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-black/20"
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
              onClick={() => navigator.clipboard.writeText(transformCode)}
              className="px-4 py-2 bg-black text-white rounded-lg transition-all duration-200 hover:bg-gray-800 active:bg-gray-700"
            >
              复制CSS
            </button>
          </div>
        </div>

        <div>
          <div className="mb-2 font-medium">预览效果</div>
          <div className="w-full h-72 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
            <div
              className="w-28 h-28 bg-[#3b82f6] rounded-xl text-white flex items-center justify-center"
              style={{ transform: `translate(${translateX}px, ${translateY}px) rotate(${rotate}deg) scale(${scaleX}, ${scaleY}) skew(${skewX}deg, ${skewY}deg)` }}
            >
              元素
            </div>
          </div>
          <div className="mt-4 border border-gray-200 rounded-xl p-3 bg-gray-50">
            <code className="font-mono text-sm break-all">{transformCode}</code>
          </div>
        </div>
      </div>
    </div>
  )
}
