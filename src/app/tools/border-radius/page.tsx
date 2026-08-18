'use client'
import { useState, useMemo } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'

export default function BorderRadiusGen(){
  const [tl,setTl]=useState(12)
  const [tr,setTr]=useState(12)
  const [br,setBr]=useState(12)
  const [bl,setBl]=useState(12)

  const css = useMemo(()=>`border-radius: ${tl}px ${tr}px ${br}px ${bl}px;`,[tl,tr,br,bl])
  const copy = async ()=>await navigator.clipboard.writeText(css)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumb />
      <h1 className="text-2xl font-bold text-app-text mb-1">边框圆角生成器</h1>
      <p className="text-app-muted text-sm mb-6">四角独立调节圆角，复制CSS</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-app-text">左上 {tl}px</label>
            <input type="range" min={0} max={100} value={tl} onChange={e=>setTl(Number(e.target.value))} className="w-full"/>
          </div>
          <div>
            <label className="text-sm text-app-text">右上 {tr}px</label>
            <input type="range" min={0} max={100} value={tr} onChange={e=>setTr(Number(e.target.value))} className="w-full"/>
          </div>
          <div>
            <label className="text-sm text-app-text">右下 {br}px</label>
            <input type="range" min={0} max={100} value={br} onChange={e=>setBr(Number(e.target.value))} className="w-full"/>
          </div>
          <div>
            <label className="text-sm text-app-text">左下 {bl}px</label>
            <input type="range" min={0} max={100} value={bl} onChange={e=>setBl(Number(e.target.value))} className="w-full"/>
          </div>
          <div className="mt-4">
            <label className="text-sm text-app-text block mb-1">CSS代码</label>
            <div className="p-3 rounded-xl border border-app-border bg-app-bg font-mono text-sm text-app-text">{css}</div>
            <button onClick={copy} className="mt-2 px-3 py-2 bg-violet-500 text-white rounded-xl text-sm">复制CSS</button>
          </div>
        </div>
        <div className="flex justify-center items-center">
          <div
            style={{width:200,height:200,background:'linear-gradient(135deg,#8b5cf6,#ec4899)',borderRadius:`${tl}px ${tr}px ${br}px ${bl}px`}}
          />
        </div>
      </div>
    </div>
  )
}
