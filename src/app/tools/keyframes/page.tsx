'use client'
import { useState, useMemo, useRef, useEffect } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

type KeyframeItem = {
  percent: number
  cssText: string
}

export default function KeyframesPage() {
  const [animName, setAnimName] = useState('demoAnim')
  const [duration, setDuration] = useState(1)
  const [keyframes, setKeyframes] = useState<KeyframeItem[]>([
    { percent: 0, cssText: 'transform: translateX(0); opacity:1;' },
    { percent: 100, cssText: 'transform: translateX(120px); opacity:0;' }
  ])
  const [isPlaying, setIsPlaying] = useState(true)
  const [copied, setCopied] = useState(false)
  const styleRef = useRef<HTMLStyleElement | null>(null)

  // ✅ 用 useEffect 注入 style，避免每次 render 重建导致动画重置
  const genKeyframesCss = useMemo(() => {
    const lines: string[] = []
    lines.push(`@keyframes ${animName} {`)
    ;[...keyframes].sort((a, b) => a.percent - b.percent).forEach(k => {
      lines.push(`  ${k.percent}% { ${k.cssText} }`)
    })
    lines.push(`}`)
    return lines.join('\n')
  }, [animName, keyframes])

  useEffect(() => {
    const style = document.createElement('style')
    style.innerHTML = genKeyframesCss
    document.head.appendChild(style)
    styleRef.current = style
    return () => {
      if (styleRef.current) document.head.removeChild(styleRef.current)
    }
  }, [genKeyframesCss])

  const cssCode = useMemo(() => {
    const lines: string[] = []
    lines.push(`@keyframes ${animName} {`)
    ;[...keyframes].sort((a, b) => a.percent - b.percent).forEach(k => {
      lines.push(`  ${k.percent}% { ${k.cssText} }`)
    })
    lines.push(`}`)
    lines.push('')
    lines.push(`animation: ${animName} ${duration}s infinite;`)
    return lines.join('\n')
  }, [animName, duration, keyframes])

  const addKeyframe = () => {
    const next = [...keyframes, { percent: 50, cssText: '' }]
    next.sort((a, b) => a.percent - b.percent)
    setKeyframes(next)
  }

  const removeIdx = (idx: number) => {
    if (keyframes.length <= 1) return // 至少留 1 个
    const next = [...keyframes]
    next.splice(idx, 1)
    setKeyframes(next)
  }

  const updateItem = (idx: number, field: 'percent' | 'cssText', val: string) => {
    const next = [...keyframes]
    if (field === 'percent') next[idx].percent = Number(val)
    else next[idx].cssText = val
    setKeyframes(next)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(cssCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Keyframes 动画生成</h1>
        <p className="text-app-muted text-sm">可视化编辑关键帧，输出完整 @keyframes CSS 代码，支持实时预览</p>
      </div>

      <div className="grid md:grid-cols-2 gap-10">
        {/* 左：控制区 */}
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">动画名称</label>
              <input
                value={animName}
                onChange={e => setAnimName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">动画时长 (s)</label>
              <input
                type="number"
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                step={0.1}
                min={0.1}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-gray-700">关键帧列表</span>
              <button
                onClick={addKeyframe}
                className="px-3 py-2 bg-violet-500 text-white text-sm font-medium rounded-lg hover:bg-violet-600 active:scale-95 transition-all"
              >
                + 添加关键帧
              </button>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {keyframes.map((k, idx) => (
                <div key={idx} className="border border-app-border rounded-xl p-3 bg-app-bg">
                  <div className="flex gap-3 items-center mb-2">
                    <label className="text-sm text-gray-600">百分比</label>
                    <input
                      type="number"
                      value={k.percent}
                      onChange={e => updateItem(idx, 'percent', e.target.value)}
                      className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                    <span className="text-sm text-gray-500">%</span>
                    <button
                      onClick={() => removeIdx(idx)}
                      disabled={keyframes.length <= 1}
                      className="ml-auto px-3 py-1.5 border border-gray-300 rounded-lg text-sm transition-all hover:bg-gray-100 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      删除
                    </button>
                  </div>
                  <textarea
                    value={k.cssText}
                    onChange={e => updateItem(idx, 'cssText', e.target.value)}
                    placeholder="例如：transform: translateX(100px); opacity: 0;"
                    className="w-full h-20 px-3 py-2 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleCopy}
            className="px-4 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 active:scale-95 transition-all"
          >
            {copied ? '✓ 已复制' : '📋 复制全部 CSS'}
          </button>
        </div>

        {/* 右：预览 + 代码 */}
        <div className="space-y-6">
          {/* 动画预览 */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">动画预览</span>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-100 active:scale-95 transition-all"
              >
                {isPlaying ? '⏸ 暂停' : '▶ 播放'}
              </button>
            </div>
            <div className="w-full h-56 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden">
              <div
                className="w-20 h-20 bg-violet-500 rounded-xl shadow-sm"
                style={{
                  animationName: animName,
                  animationDuration: `${duration}s`,
                  animationIterationCount: 'infinite',
                  animationPlayState: isPlaying ? 'running' : 'paused'
                }}
              />
            </div>
          </div>

          {/* 生成代码 */}
          <div>
            <span className="text-sm font-medium text-gray-700 block mb-2">生成代码</span>
            <textarea
              readOnly
              value={cssCode}
              className="w-full h-64 px-4 py-3 border border-app-border bg-gray-900 text-emerald-300 rounded-xl font-mono text-sm resize-none"
            />
          </div>
        </div>
      </div>

      {/* 说明卡片 */}
      <div className="mt-10 p-4 bg-gray-50 border border-app-border rounded-xl">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">使用说明</h3>
        <ul className="text-xs text-app-muted space-y-1.5 leading-relaxed">
          <li>• 设置动画名称和时长，添加关键帧并填写对应百分比的 CSS 属性</li>
          <li>• 关键帧按百分比自动排序，至少保留 1 个关键帧</li>
          <li>• 预览区实时播放动画，可暂停查看当前状态</li>
          <li>• 复制全部 CSS 后粘贴到项目中即可使用</li>
        </ul>
      </div>

      <FooterNote />
    </div>
  )
}