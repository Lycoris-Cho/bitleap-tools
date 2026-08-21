'use client'

import { useEffect, useRef, useState } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

export default function LiquidGlassPage() {
    const [blur, setBlur] = useState(18)
    const [sat, setSat] = useState(180)
    const [borderAlpha, setBorderAlpha] = useState(0.35)
    const [thickness, setThickness] = useState(0.5)
    const [dark, setDark] = useState(false)
    const [copied, setCopied] = useState(false)
    const styleRef = useRef<HTMLStyleElement | null>(null)

    const glassClass = 'liquid-glass-card'

    useEffect(() => {
        const style = document.createElement('style')
        style.innerHTML = `
      .glass-stage {
        background:
          radial-gradient(120% 120% at 20% 10%, #6366f1 0%, transparent 40%),
          radial-gradient(120% 120% at 80% 90%, #ec4899 0%, transparent 40%),
          linear-gradient(135deg, #0ea5e9, #8b5cf6);
      }

      .${glassClass} {
        --glass-blur: ${blur}px;
        --glass-sat: ${sat}%;
        --glass-border: ${borderAlpha};
        --glass-thickness: ${thickness};

        position: relative;
        width: 320px;
        height: 200px;
        border-radius: 28px;
        padding: 24px;
        color: ${dark ? '#fff' : '#0f172a'};
        background: ${dark
                ? 'color-mix(in oklab, white 8%, transparent)'
                : 'color-mix(in oklab, white 22%, transparent)'};
        backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-sat));
        -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-sat));
        border: 1px solid rgba(255,255,255,var(--glass-border));
        box-shadow:
          inset 0 1px 1px rgba(255,255,255,0.5),
          inset 0 -10px 30px rgba(255,255,255,calc(var(--glass-thickness) * 0.15)),
          0 30px 60px rgba(0,0,0,0.25);
        overflow: hidden;
      }

      .${glassClass}::before {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: linear-gradient(135deg, rgba(255,255,255,0.4), rgba(255,255,255,0) 40%);
        opacity: var(--glass-thickness);
        pointer-events: none;
      }

      @media (prefers-reduced-transparency: reduce) {
        .${glassClass} {
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
          background: ${dark ? '#1e293b' : '#e2e8f0'};
        }
      }
    `
        document.head.appendChild(style)
        styleRef.current = style
        return () => {
            if (styleRef.current) document.head.removeChild(styleRef.current)
        }
    }, [blur, sat, borderAlpha, thickness, dark])

    const cssOutput = `.liquid-glass {
  background: ${dark
            ? 'color-mix(in oklab, white 8%, transparent)'
            : 'color-mix(in oklab, white 22%, transparent)'};
  backdrop-filter: blur(${blur}px) saturate(${sat}%);
  -webkit-backdrop-filter: blur(${blur}px) saturate(${sat}%);
  border: 1px solid rgba(255,255,255,${borderAlpha});
  border-radius: 28px;
  box-shadow:
    inset 0 1px 1px rgba(255,255,255,0.5),
    inset 0 -10px 30px rgba(255,255,255,${(thickness * 0.15).toFixed(3)}),
    0 30px 60px rgba(0,0,0,0.25);
}

@media (prefers-reduced-transparency: reduce) {
  .liquid-glass {
    backdrop-filter: none;
    background: ${dark ? '#1e293b' : '#e2e8f0'};
  }
}`

    return (
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
            <Breadcrumb />
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight mb-2">Liquid Glass 卡片实验室</h1>
                <p className="text-app-muted text-sm">iOS 26 毛玻璃效果编辑器</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* 控制区 */}
                <div className="space-y-5">
                    {[
                        { label: '模糊 Blur', value: blur, setter: setBlur, min: 0, max: 40, step: 1, unit: 'px' },
                        { label: '饱和度 Saturate', value: sat, setter: setSat, min: 100, max: 300, step: 5, unit: '%' },
                        { label: '边缘高光 Border α', value: borderAlpha, setter: setBorderAlpha, min: 0, max: 1, step: 0.05, unit: '' },
                        { label: '玻璃厚度 Thickness', value: thickness, setter: setThickness, min: 0, max: 1, step: 0.05, unit: '' },
                    ].map((s) => (
                        <div key={s.label}>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-700 font-medium">{s.label}</span>
                                <span className="font-mono text-violet-600 font-semibold">{s.value}{s.unit}</span>
                            </div>
                            <input
                                type="range"
                                min={s.min}
                                max={s.max}
                                step={s.step}
                                value={s.value}
                                onChange={(e) => s.setter(Number(e.target.value))}
                                className="w-full accent-violet-500"
                            />
                        </div>
                    ))}

                    <label className="flex items-center gap-3 text-sm text-app-muted cursor-pointer">
                        <input
                            type="checkbox"
                            checked={dark}
                            onChange={(e) => setDark(e.target.checked)}
                            className="w-4 h-4 accent-violet-500"
                        />
                        暗色背景模式
                    </label>
                </div>

                {/* 预览区 */}
                <div className="flex flex-col items-center justify-center">
                    <div className="glass-stage w-full h-72 rounded-3xl flex items-center justify-center p-8">
                        <div className="w-full h-full flex items-center justify-center px-4 py-6">
                            <div className={glassClass}>
                                <div className="text-sm opacity-70">Liquid Glass</div>
                                <div className="text-xl font-semibold mt-1">BitLeap</div>
                                <div className="text-xs opacity-60 mt-3">
                                    backdrop-filter · color-mix · @property ready
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 输出 */}
            <div className="mt-10 space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">CSS 输出</span>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(cssOutput)
                            setCopied(true)
                            setTimeout(() => setCopied(false), 1500)
                        }}
                        className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 active:scale-95 transition-all"
                    >
                        {copied ? '✓ 已复制' : '📋 复制'}
                    </button>
                </div>
                <pre className="bg-gray-900 text-emerald-300 text-sm rounded-xl p-4 overflow-x-auto border border-app-border">
                    <code>{cssOutput}</code>
                </pre>
            </div>

            {/* 说明卡片 */}
            <div className="mt-10 p-4 bg-gray-50 border border-app-border rounded-xl">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">使用说明</h3>
                <ul className="text-xs text-app-muted space-y-1.5 leading-relaxed">
                    <li>• 使用 <code className="font-mono bg-white px-1 rounded">backdrop-filter</code> + <code className="font-mono bg-white px-1 rounded">color-mix(in oklab)</code> 实现液态玻璃</li>
                    <li>• 含 <code className="font-mono bg-white px-1 rounded">prefers-reduced-transparency</code> 无障碍降级</li>
                    <li>• 所有参数在客户端计算，无 SSR 冲突</li>
                    <li>• 复制 CSS 后直接粘贴到项目中，给容器添加 <code className="font-mono bg-white px-1 rounded">.liquid-glass</code> 类名即可</li>
                </ul>
            </div>

            <FooterNote />
        </div>
    )
}