'use client'
import { useState, useMemo } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

export default function BorderRadiusGen(){
  const [tl,setTl]=useState(12)
  const [tr,setTr]=useState(12)
  const [br,setBr]=useState(12)
  const [bl,setBl]=useState(12)
  const [copied,setCopied]=useState(false)

  const css = useMemo(()=>`border-radius: ${tl}px ${tr}px ${br}px ${bl}px;`,[tl,tr,br,bl])
  
  const copy = async ()=>{
    await navigator.clipboard.writeText(css)
    setCopied(true)
    setTimeout(()=>setCopied(false),1500)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-10">
      <Breadcrumb />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-app-text mb-2">边框圆角生成器</h1>
        <p className="text-app-muted text-sm">四角独立调节圆角，实时预览并复制 CSS</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        <div className="space-y-5">
          {[
            { label: '左上', value: tl, setter: setTl },
            { label: '右上', value: tr, setter: setTr },
            { label: '右下', value: br, setter: setBr },
            { label: '左下', value: bl, setter: setBl },
          ].map((s)=>(
            <div key={s.label}>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-gray-700">{s.label}</span>
                <span className="font-mono text-violet-600 font-semibold">{s.value}px</span>
              </div>
              <input type="range" min={0} max={100} value={s.value} onChange={e=>s.setter(Number(e.target.value))} className="w-full accent-violet-500"/>
            </div>
          ))}
          <div className="mt-6 space-y-3">
            <label className="text-sm font-medium text-gray-700 block">CSS 代码</label>
            <div className="p-4 rounded-xl border border-app-border bg-gray-900 font-mono text-sm text-emerald-300 break-all">{css}</div>
            <button onClick={copy} className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 active:scale-95 transition-all">
              {copied ? '✓ 已复制' : '📋 复制 CSS'}
            </button>
          </div>
        </div>
        <div className="flex justify-center items-center">
          <div
            className="shadow-lg"
            style={{width:200,height:200,background:'linear-gradient(135deg,#8b5cf6,#ec4899)',borderRadius:`${tl}px ${tr}px ${br}px ${bl}px`}}
          />
        </div>
      </div>
      <FooterNote />
    </div>
  )
}