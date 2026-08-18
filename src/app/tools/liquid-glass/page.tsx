'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Breadcrumb } from '@/components/breadcrumb'
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
            : 'color-mix(in oklab, white 22%, transparent)'
        };
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
        <div className="max-w-4xl mx-auto py-16 px-6">
            <Breadcrumb />
            <h1 className="text-3xl font-bold mt-6 mb-2">Liquid Glass 卡片实验室</h1>
            <p className="text-app-muted mb-8">
                iOS 26 毛玻璃效果编辑器
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* 控制区 */}
                <div className="space-y-6">
                    {[
                        { label: '模糊 Blur', value: blur, setter: setBlur, min: 0, max: 40, step: 1, unit: 'px' },
                        { label: '饱和度 Saturate', value: sat, setter: setSat, min: 100, max: 300, step: 5, unit: '%' },
                        { label: '边缘高光 Border α', value: borderAlpha, setter: setBorderAlpha, min: 0, max: 1, step: 0.05, unit: '' },
                        { label: '玻璃厚度 Thickness', value: thickness, setter: setThickness, min: 0, max: 1, step: 0.05, unit: '' },
                    ].map((s) => (
                        <div key={s.label}>
                            <div className="flex justify-between text-sm text-app-muted mb-2">
                                <span>{s.label}</span>
                                <span>{s.value}{s.unit}</span>
                            </div>
                            <input
                                type="range"
                                min={s.min}
                                max={s.max}
                                step={s.step}
                                value={s.value}
                                onChange={(e) => s.setter(Number(e.target.value))}
                                className="w-full"
                            />
                        </div>
                    ))}

                    <label className="flex items-center gap-3 text-sm text-app-muted">
                        <input type="checkbox" checked={dark} onChange={(e) => setDark(e.target.checked)} />
                        暗色背景模式
                    </label>
                </div>

                {/* 预览区 */}
                <div className="flex flex-col items-center justify-center">
                    {/* 给 glass-stage 内部加一层包裹，设置 padding，让卡片四周留出空隙 */}
                    <div className="glass-stage w-full h-72 rounded-3xl flex items-center justify-center p-8">
                        {/* 新增外层容器，上下左右留出安全边距，防止圆角重叠 */}
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
            <div className="mt-10">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">CSS 输出</span>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(cssOutput)
                            setCopied(true)
                            setTimeout(() => setCopied(false), 1500)
                        }}
                        className="text-sm px-3 py-1.5 bg-black text-white rounded-lg hover:bg-gray-800 transition"
                    >
                        {copied ? '已复制' : '复制'}
                    </button>
                </div>
                <pre className="bg-gray-900 text-gray-100 text-sm rounded-xl p-4 overflow-x-auto">
                    <code>{cssOutput}</code>
                </pre>
            </div>

            <div className="mt-8 text-xs text-app-muted leading-relaxed">
                <p>· 使用 backdrop-filter + color-mix(in oklab)</p>
                <p>· 含 prefers-reduced-transparency 降级</p>
                <p>· 所有参数在客户端计算，无 SSR 冲突</p>
            </div>
        </div>
    )
}