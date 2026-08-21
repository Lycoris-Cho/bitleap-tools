'use client'
import { useState, useMemo } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

export default function TextShadowGen(){
  const [x,setX]=useState(2)
  const [y,setY]=useState(3)
  const [blur,setBlur]=useState(6)
  const [color,setColor]=useState('#00000066')
  const [text,setText]=useState('预览文字 Text-Shadow')
  const [copied,setCopied]=useState(false)

  const css = useMemo(()=>`text-shadow: ${x}px ${y}px ${blur}px ${color};`,[x,y,blur,color])
  
  const copy = async ()=>{
    await navigator.clipboard.writeText(css)
    setCopied(true)
    setTimeout(()=>setCopied(false),1500)
  }

  const sliders = [
    { label: 'X 偏移', value: x, setter: setX, min: -20, max: 20, unit: 'px' },
    { label: 'Y 偏移', value: y, setter: setY, min: -20, max: 20, unit: 'px' },
    { label: '模糊半径', value: blur, setter: setBlur, min: 0, max: 30, unit: 'px' },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-10">
      <Breadcrumb />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-app-text mb-2">文字阴影生成器</h1>
        <p className="text-app-muted text-sm">可视化调试 text-shadow，一键复制 CSS</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-5">
          {sliders.map((s)=>(
            <div key={s.label}>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-gray-700">{s.label}</span>
                <span className="font-mono text-violet-600 font-semibold">{s.value}{s.unit}</span>
              </div>
              <input type="range" min={s.min} max={s.max} value={s.value} onChange={e=>s.setter(Number(e.target.value))} className="w-full accent-violet-500"/>
            </div>
          ))}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">阴影颜色</label>
            <input type="color" value={color} onChange={e=>setColor(e.target.value)} className="w-12 h-12 p-0 border-0 bg-transparent cursor-pointer rounded-lg"/>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">预览文本</label>
            <input value={text} onChange={e=>setText(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 bg-app-bg text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"/>
          </div>
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 block">CSS</label>
            <div className="p-4 rounded-xl border border-app-border bg-gray-900 font-mono text-sm text-emerald-300 break-all">{css}</div>
            <button onClick={copy} className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 active:scale-95 transition-all">
              {copied ? '✓ 已复制' : '📋 复制 CSS'}
            </button>
          </div>
        </div>
        <div className="flex items-center justify-center bg-gray-50 rounded-2xl border border-app-border min-h-64">
          <p style={{fontSize:36,textShadow:`${x}px ${y}px ${blur}px ${color}`}} className="text-app-text font-bold">{text}</p>
        </div>
      </div>
      <FooterNote />
    </div>
  )
}