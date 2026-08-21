'use client'

import { useState } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

export default function GlowBackgroundPage() {
    const [color1, setColor1] = useState('#fe7cbd')
    const [color2, setColor2] = useState('#2d3af0')
    const [angle, setAngle] = useState(-45)
    const [blur, setBlur] = useState(20)
    const [offsetY, setOffsetY] = useState(20)
    const [scale, setScale] = useState(95)
    const [opacity, setOpacity] = useState(70)
    const [radius, setRadius] = useState(15)

    const gradient = `linear-gradient(${angle}deg, ${color1}, ${color2})`

    return (
        <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
            <Breadcrumb />
            {/* 标题 */}
            <div className="mb-10">
                <h1 className="text-3xl font-bold tracking-tight mb-2">
                    渐变光晕背景
                </h1>
                <p className="text-app-muted text-sm">
                    点击颜色打开系统色盘，自由选色
                </p>
            </div>

            {/* 预览 */}
            <div className="rounded-2xl border border-app-border bg-gray-50 p-10 mb-10 overflow-hidden">
                <div
                    className="relative w-full h-60"
                    style={{ borderRadius: `${radius}px` }}
                >
                    {/* 光晕 */}
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: gradient,
                            filter: `blur(${blur}px)`,
                            transform: `translate3d(0, ${offsetY}px, 0) scale(${scale / 100})`,
                            opacity: opacity / 100,
                            borderRadius: `${radius}px`,
                            zIndex: 0,
                        }}
                    />

                    {/* 卡片 */}
                    <div
                        className="relative h-full flex items-center justify-center text-gray-800 font-medium"
                        style={{
                            backgroundColor: '#ffffff',
                            borderRadius: `${radius}px`,
                            zIndex: 1,
                        }}
                    >
                        内容区域
                    </div>
                </div>
            </div>

            {/* 颜色选择 */}
            <div className="grid grid-cols-2 gap-6 mb-10">
                {[
                    { label: '颜色 1', value: color1, onChange: setColor1 },
                    { label: '颜色 2', value: color2, onChange: setColor2 },
                ].map((c) => (
                    <div key={c.label}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {c.label}
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                value={c.value}
                                onChange={(e) => c.onChange(e.target.value)}
                                className="w-12 h-12 p-0 border-0 bg-transparent cursor-pointer rounded-lg shrink-0"
                            />
                            <input
                                value={c.value}
                                onChange={(e) => c.onChange(e.target.value)}
                                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* 参数控制 */}
            <div className="space-y-5 mb-12">
                {/* 角度 */}
                <div>
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-700 font-medium">角度</span>
                        <span className="font-mono text-violet-600 font-semibold">{angle}°</span>
                    </div>
                    <input
                        type="range"
                        min={-180}
                        max={180}
                        value={angle}
                        onChange={(e) => setAngle(Number(e.target.value))}
                        className="w-full accent-violet-500"
                    />
                </div>

                {/* 模糊 */}
                <div>
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-700 font-medium">模糊</span>
                        <span className="font-mono text-violet-600 font-semibold">{blur}px</span>
                    </div>
                    <input
                        type="range"
                        min={0}
                        max={60}
                        value={blur}
                        onChange={(e) => setBlur(Number(e.target.value))}
                        className="w-full accent-violet-500"
                    />
                </div>

                {/* 偏移 Y */}
                <div>
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-700 font-medium">偏移 Y</span>
                        <span className="font-mono text-violet-600 font-semibold">{offsetY}px</span>
                    </div>
                    <input
                        type="range"
                        min={0}
                        max={60}
                        value={offsetY}
                        onChange={(e) => setOffsetY(Number(e.target.value))}
                        className="w-full accent-violet-500"
                    />
                </div>

                {/* 缩放 */}
                <div>
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-700 font-medium">缩放</span>
                        <span className="font-mono text-violet-600 font-semibold">{scale}%</span>
                    </div>
                    <input
                        type="range"
                        min={80}
                        max={120}
                        value={scale}
                        onChange={(e) => setScale(Number(e.target.value))}
                        className="w-full accent-violet-500"
                    />
                </div>

                {/* 透明度 */}
                <div>
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-700 font-medium">透明度</span>
                        <span className="font-mono text-violet-600 font-semibold">{opacity}%</span>
                    </div>
                    <input
                        type="range"
                        min={0}
                        max={100}
                        value={opacity}
                        onChange={(e) => setOpacity(Number(e.target.value))}
                        className="w-full accent-violet-500"
                    />
                </div>

                {/* 圆角 */}
                <div>
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-700 font-medium">圆角</span>
                        <span className="font-mono text-violet-600 font-semibold">{radius}px</span>
                    </div>
                    <input
                        type="range"
                        min={0}
                        max={40}
                        value={radius}
                        onChange={(e) => setRadius(Number(e.target.value))}
                        className="w-full accent-violet-500"
                    />
                </div>
            </div>

            {/* CSS 输出 */}
            <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">CSS 代码</label>
                <div className="p-5 bg-gray-900 border border-app-border rounded-xl overflow-auto">
                    <pre className="text-sm font-mono text-emerald-300 whitespace-pre-wrap break-all">{`.card {
  position: relative;
  border-radius: ${radius}px;
  background: #ffffff;
  overflow: hidden;
}

.card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: ${gradient};
  transform: translate3d(0, ${offsetY}px, 0) scale(${scale / 100});
  filter: blur(${blur}px);
  opacity: ${opacity / 100};
  border-radius: inherit;
  z-index: -1;
}`}</pre>
                </div>
                <button
                    onClick={() =>
                        navigator.clipboard.writeText(`.card {
  position: relative;
  border-radius: ${radius}px;
  background: #ffffff;
  overflow: hidden;
}

.card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: ${gradient};
  transform: translate3d(0, ${offsetY}px, 0) scale(${scale / 100});
  filter: blur(${blur}px);
  opacity: ${opacity / 100};
  border-radius: inherit;
  z-index: -1;
}`)
                    }
                    className="px-6 py-3 bg-violet-500 text-white rounded-xl hover:bg-violet-600 active:scale-95 transition-all font-medium shadow-sm shadow-violet-500/20"
                >
                    复制 CSS
                </button>
            </div>
            <FooterNote />
        </div>
    )
}