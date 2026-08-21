'use client'

import { useState, useRef } from 'react'
import { buttonPresets, type ButtonPreset } from './presets'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

export default function ButtonAnimations() {
  const [selected, setSelected] = useState<ButtonPreset | null>(null)
  const [copied, setCopied] = useState(false)

  // ripple
  const [rippleMap, setRippleMap] = useState<Record<string, React.CSSProperties>>({})
  // magnetic
  const [magneticMap, setMagneticMap] = useState<Record<string, React.CSSProperties>>({})
  const magneticRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleRipple = (id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget
    const rect = btn.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = e.clientX - rect.left - size / 2
    const y = e.clientY - rect.top - size / 2
    setRippleMap((prev) => ({
      ...prev,
      [id]: { width: size, height: size, left: x, top: y },
    }))
    setTimeout(() => {
      setRippleMap((prev) => ({ ...prev, [id]: {} }))
    }, 600)
  }

  const handleMagneticMove = (id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    const el = magneticRefs.current[id]
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    setMagneticMap((prev) => ({
      ...prev,
      [id]: { transform: `translate(${x * 0.15}px, ${y * 0.15}px)` },
    }))
  }

  const handleMagneticLeave = (id: string) => {
    setMagneticMap((prev) => ({
      ...prev,
      [id]: { transform: 'translate(0,0)' },
    }))
  }

  const categories = [...new Set(buttonPresets.map((p) => p.category))]

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50/50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
        <Breadcrumb />
          <h1 className="text-2xl font-bold text-app-text mb-2">按钮动画预览库</h1>
          <p className="text-sm text-app-muted">点击卡片查看 HTML / CSS 源码，全部本地预览</p>
        </div>

        {/* 注入全部按钮动画样式 */}
        <style dangerouslySetInnerHTML={{ __html: buttonPresets.map((item) => item.css).join('\n') }} />

        {categories.map((cat) => (
          <div key={cat} className="mb-10">
            <h2 className="text-xs font-bold uppercase tracking-wider text-app-muted mb-4">{cat}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {buttonPresets
                .filter((p) => p.category === cat)
                .map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelected(item)}
                    className="group cursor-pointer bg-app-bg/80 backdrop-blur-xl border border-app-border/60 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[160px] hover:border-violet-400/60 hover:shadow-lg transition-all"
                  >
                    {/* ===== 按钮渲染区 ===== */}
                    {item.id === 'ripple' ? (
                      <button
                        className={item.previewClass}
                        onClick={(ev) => {
                          ev.stopPropagation()
                          handleRipple(item.id, ev)
                        }}
                      >
                        {rippleMap[item.id]?.width && (
                          <span className="ripple" style={rippleMap[item.id]} />
                        )}
                        Click Me
                      </button>
                    ) : item.id === 'magnetic' ? (
                      <div
                        onClick={(ev) => ev.stopPropagation()}
                        dangerouslySetInnerHTML={{ __html: item.html }}
                      />
                    ) : (
                      /* 普通按钮 */
                      <button
                        className={item.previewClass}
                        onClick={(ev) => ev.stopPropagation()}
                      >
                        {item.name}
                      </button>
                    )}

                    <div className="mt-4 text-center">
                      <div className="text-sm font-medium text-app-text">{item.name}</div>
                      <div className="text-xs text-app-muted mt-1">{item.description}</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}

        {/* Modal 弹窗 */}
        {selected && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          >
            <div
              className="bg-app-bg/95 backdrop-blur-2xl border border-app-border rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-app-border bg-app-bg/90">
                <div>
                  <h3 className="text-lg font-bold text-app-text">{selected.name}</h3>
                  <p className="text-xs text-app-muted">{selected.description}</p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors text-app-text"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* HTML */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-app-muted">HTML</span>
                  </div>
                  <pre className="bg-gray-900 p-4 rounded-xl text-sm font-mono text-sky-300 overflow-x-auto">
{selected.html}
                  </pre>
                </div>

                {/* CSS */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-app-muted">CSS</span>
                    <button
                      onClick={() => copy(selected.css)}
                      className="px-3 py-1.5 text-xs bg-app-bg/10 text-white rounded-lg hover:bg-app-bg/20 active:scale-95 transition-all"
                    >
                      {copied ? '✓ 已复制' : '复制 CSS'}
                    </button>
                  </div>
                  <pre className="bg-gray-900 p-4 rounded-xl text-sm font-mono text-emerald-300 overflow-x-auto">
{selected.css}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

<FooterNote />
      </div>
    </div>
  )
}