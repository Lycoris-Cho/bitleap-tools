'use client'
import { useState, useMemo } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
export default function CssUnitConvertPage() {
  const [baseFontSize, setBaseFontSize] = useState(16)
  const [pxVal, setPxVal] = useState<number>('' as any)

  const result = useMemo(() => {
    if (isNaN(Number(pxVal)) || String(pxVal) === '') return null
    const px = Number(pxVal)
    const rem = px / baseFontSize
    const em = px / baseFontSize
    // 假设视口宽度1920px做vw换算
    const vw = px / 19.2
    return { px, rem, em, vw }
  }, [pxVal, baseFontSize])

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <Breadcrumb />
      <h1 className="text-2xl font-bold mb-2">CSS单位换算</h1>
      <p className="text-gray-500 mb-6">px / rem / em / vw 互相换算，自定义基准字号</p>

      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1.5 font-medium">基准字号 (px)</label>
            <input
              type="number"
              value={baseFontSize}
              onChange={e => setBaseFontSize(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-xl p-3 font-mono transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-black/20"
            />
          </div>
          <div>
            <label className="block mb-1.5 font-medium">PX 值</label>
            <input
              type="number"
              value={pxVal}
              onChange={e => setPxVal(Number(e.target.value))}
              placeholder="输入px数值"
              className="w-full border border-gray-300 rounded-xl p-3 font-mono transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-black/20"
            />
          </div>
        </div>

        {result && (
          <div className="space-y-3">
            {[
              ['px', `${result.px}px`],
              ['rem', `${result.rem.toFixed(4)}rem`],
              ['em', `${result.em.toFixed(4)}em`],
              ['vw (基于1920视口)', `${result.vw.toFixed(4)}vw`],
            ].map(([label, val]) => (
              <div key={label} className="border border-gray-200 rounded-xl p-4 flex justify-between items-center bg-app-bg">
                <div className="flex-1 mr-4">
                  <div className="text-sm text-gray-500">{label}</div>
                  <div className="font-mono mt-1">{val}</div>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(val)}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-sm transition-all duration-200 hover:bg-gray-100 active:bg-gray-200"
                >
                  复制
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
