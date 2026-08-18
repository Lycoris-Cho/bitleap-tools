'use client'
import { useState, useMemo } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
type KeyframeItem = {
  percent: number
  cssText: string
}

export default function KeyframesPage() {
  const [animName, setAnimName] = useState('demoAnim')
  const [duration, setDuration] = useState(1)
  const [keyframes, setKeyframes] = useState<KeyframeItem[]>([
    { percent:0, cssText:'transform: translateX(0); opacity:1;' },
    { percent:100, cssText:'transform: translateX(120px); opacity:0;' }
  ])
  const [isPlaying, setIsPlaying] = useState(true)

  const addKeyframe = () => {
    setKeyframes([...keyframes, { percent:50, cssText:'' }])
  }

  const removeIdx = (idx:number) => {
    const next = [...keyframes]
    next.splice(idx,1)
    setKeyframes(next)
  }

  const updateItem = (idx:number, field:'percent'|'cssText', val:string) => {
    const next = [...keyframes]
    if(field === 'percent') next[idx].percent = Number(val)
    else next[idx].cssText = val
    setKeyframes(next)
  }

  const genCss = () => {
    const lines: string[] = []
    lines.push(`@keyframes ${animName} {`)
    ;[...keyframes].sort((a,b)=>a.percent-b.percent).forEach(k => {
      lines.push(`  ${k.percent}% { ${k.cssText} }`)
    })
    lines.push(`}`)
    lines.push('')
    lines.push(`animation: ${animName} ${duration}s infinite;`)
    return lines.join('\n')
  }

  // 提取仅@keyframes部分，用于style标签注入预览
  const genKeyframesCss = useMemo(() => {
    const lines: string[] = []
    lines.push(`@keyframes ${animName} {`)
    ;[...keyframes].sort((a,b)=>a.percent-b.percent).forEach(k => {
      lines.push(`  ${k.percent}% { ${k.cssText} }`)
    })
    lines.push(`}`)
    return lines.join('\n')
  }, [animName, duration, keyframes])

  const cssCode = genCss()

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <Breadcrumb />
      <h1 className="text-2xl font-bold mb-2">Keyframes动画生成</h1>
      <p className="text-gray-500 mb-6">可视化编辑关键帧，输出完整 @keyframes CSS代码，支持实时预览</p>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 font-medium">动画名称</label>
              <input
                value={animName}
                onChange={e=>setAnimName(e.target.value)}
                className="w-full border border-gray-300 rounded-xl p-3 font-mono transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-black/20"
              />
            </div>
            <div>
              <label className="block mb-1.5 font-medium">动画时长(s)</label>
              <input
                type="number"
                value={duration}
                onChange={e=>setDuration(Number(e.target.value))}
                step={0.1}
                className="w-full border border-gray-300 rounded-xl p-3 font-mono transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-black/20"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="font-medium">关键帧列表</div>
              <button
                onClick={addKeyframe}
                className="px-3 py-1.5 bg-black text-white rounded-md text-sm transition-all duration-200 hover:bg-gray-800"
              >
                + 添加关键帧
              </button>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {keyframes.map((k, idx) => (
                <div key={idx} className="border border-gray-200 rounded-xl p-3 bg-app-bg">
                  <div className="flex gap-3 items-center mb-2">
                    <label className="text-sm">百分比</label>
                    <input
                      type="number"
                      value={k.percent}
                      onChange={e=>updateItem(idx,'percent',e.target.value)}
                      className="w-16 border border-gray-300 rounded-xl p-1.5 font-mono text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-black/20"
                    />
                    <span>%</span>
                    <button
                      onClick={()=>removeIdx(idx)}
                      className="ml-auto px-2 py-1 border border-gray-300 rounded-md text-sm transition-all duration-200 hover:bg-gray-100"
                    >
                      删除
                    </button>
                  </div>
                  <textarea
                    value={k.cssText}
                    onChange={e=>updateItem(idx,'cssText',e.target.value)}
                    placeholder="例如：transform:translateX(100px); opacity:0;"
                    className="w-full h-20 border border-gray-300 rounded-xl p-2 font-mono text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-black/20"
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={()=>navigator.clipboard.writeText(cssCode)}
            className="px-4 py-2 bg-black text-white rounded-lg transition-all duration-200 hover:bg-gray-800 active:bg-gray-700"
          >
            复制全部CSS
          </button>
        </div>

        <div className="space-y-6">
          {/* 动画预览区域 */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="font-medium">动画预览</div>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm transition-all duration-200 hover:bg-gray-100"
              >
                {isPlaying ? '暂停' : '播放'}
              </button>
            </div>
            <div className="w-full h-56 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden relative">
              <style dangerouslySetInnerHTML={{ __html: genKeyframesCss }} />
              <div
                className="w-20 h-20 bg-blue-500 rounded-xl"
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
            <div className="mb-2 font-medium">生成代码</div>
            <textarea
              readOnly
              value={cssCode}
              className="w-full h-64 border border-gray-300 rounded-xl p-3 font-mono text-sm bg-gray-50 transition-all duration-200"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
