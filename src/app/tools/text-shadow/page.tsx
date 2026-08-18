'use client'
import { useState, useMemo } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
export default function TextShadowGen(){
  const [x,setX]=useState(2)
  const [y,setY]=useState(3)
  const [blur,setBlur]=useState(6)
  const [color,setColor]=useState('#00000066')
  const [text,setText]=useState('预览文字 Text-Shadow')

  const css = useMemo(()=>`text-shadow: ${x}px ${y}px ${blur}px ${color};`,[x,y,blur,color])
  const copy = async ()=>await navigator.clipboard.writeText(css)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumb />
      <h1 className="text-2xl font-bold text-app-text mb-1">文字阴影生成器</h1>
      <p className="text-app-muted text-sm mb-6">可视化调试 text-shadow，一键复制CSS</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-3">
          <div>
            <label className="text-sm text-app-text">X偏移 {x}px</label>
            <input type="range" min={-20} max={20} value={x} onChange={e=>setX(Number(e.target.value))} className="w-full"/>
          </div>
          <div>
            <label className="text-sm text-app-text">Y偏移 {y}px</label>
            <input type="range" min={-20} max={20} value={y} onChange={e=>setY(Number(e.target.value))} className="w-full"/>
          </div>
          <div>
            <label className="text-sm text-app-text">模糊半径 {blur}px</label>
            <input type="range" min={0} max={30} value={blur} onChange={e=>setBlur(Number(e.target.value))} className="w-full"/>
          </div>
          <div>
            <label className="text-sm text-app-text block mb-1">阴影颜色</label>
            <input type="color" value={color} onChange={e=>setColor(e.target.value)}/>
          </div>
          <div>
            <label className="text-sm text-app-text block mb-1">预览文本</label>
            <input value={text} onChange={e=>setText(e.target.value)} className="w-full p-2 rounded-xl border border-app-border bg-app-bg text-app-text"/>
          </div>
          <div>
            <label className="text-sm text-app-text block mb-1">CSS</label>
            <div className="p-3 rounded-xl border border-app-border bg-app-bg font-mono text-sm text-app-text">{css}</div>
            <button onClick={copy} className="mt-2 px-3 py-2 bg-violet-500 text-white rounded-xl text-sm">复制CSS</button>
          </div>
        </div>
        <div className="flex items-center justify-center bg-app-card rounded-xl border border-app-border min-h-64">
          <p style={{fontSize:36,textShadow:`${x}px ${y}px ${blur}px ${color}`}} className="text-app-text font-bold">{text}</p>
        </div>
      </div>
    </div>
  )
}
