'use client'
import { useState, useMemo } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

export default function CssUnitConvertPage() {
  const [baseFontSize, setBaseFontSize] = useState(16)
  const [pxVal, setPxVal] = useState<number | ''>('')
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null)

  const result = useMemo(() => {
    if (pxVal === '' || isNaN(Number(pxVal))) return null
    const px = Number(pxVal)
    const rem = px / baseFontSize
    const em = px / baseFontSize
    const vw = px / 19.2
    return { px, rem, em, vw }
  }, [pxVal, baseFontSize])

  const handleCopy = async (label: string, val: string) => {
    await navigator.clipboard.writeText(val)
    setCopiedLabel(label)
    setTimeout(() => setCopiedLabel(null), 1500)
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">CSS 单位换算</h1>
        <p className="text-app-muted text-sm">px / rem / em / vw 互相换算，自定义基准字号</p>
      </div>

      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">基准字号 (px)</label>
            <input
              type="number"
              value={baseFontSize}
              onChange={e => setBaseFontSize(Number(e.target.value))}
              min={1}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">PX 值</label>
            <input
              type="number"
              value={pxVal}
              onChange={e => {
                const v = e.target.value
                setPxVal(v === '' ? '' : Number(v))
              }}
              placeholder="输入 px 数值"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
        </div>

        {result && (
          <div className="space-y-3">
            {[
              ['px', `${result.px}px`],
              ['rem', `${result.rem.toFixed(4)}rem`],
              ['em', `${result.em.toFixed(4)}em`],
              ['vw (基于 1920 视口)', `${result.vw.toFixed(4)}vw`],
            ].map(([label, val]) => (
              <div key={label} className="border border-app-border rounded-xl p-4 flex justify-between items-center bg-app-bg">
                <div className="flex-1 mr-4">
                  <div className="text-sm text-app-muted">{label}</div>
                  <div className="font-mono mt-1 text-gray-800">{val}</div>
                </div>
                <button
                  onClick={() => handleCopy(label, val)}
                  className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 active:scale-95 transition-all shrink-0"
                >
                  {copiedLabel === label ? '✓ 已复制' : '📋 复制'}
                </button>
              </div>
            ))}
          </div>
        )}

        {pxVal !== '' && !result && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            请输入有效的 px 数值
          </div>
        )}
      </div>

      {/* 说明卡片 */}
      <div className="mt-10 p-4 bg-gray-50 border border-app-border rounded-xl">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">使用说明</h3>
        <ul className="text-xs text-app-muted space-y-1.5 leading-relaxed">
          <li>• rem 和 em 均基于基准字号计算（默认 16px = 1rem）</li>
          <li>• vw 基于 1920px 视口宽度换算（即 1vw = 19.2px）</li>
          <li>• 点击「复制」即可将对应单位的值粘贴到 CSS 中使用</li>
          <li>• 基准字号修改后所有结果实时更新</li>
        </ul>
      </div>

      <FooterNote />
    </div>
  )
}