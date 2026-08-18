'use client'
import { useState, useMemo } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
function diffText(a:string,b:string){
  const linesA = a.split('\n')
  const linesB = b.split('\n')
  const max = Math.max(linesA.length, linesB.length)
  const result:{a?:string,b?:string,type:'same'|'del'|'add'}[]=[]
  for(let i=0;i<max;i++){
    const la = linesA[i]
    const lb = linesB[i]
    if(la === lb){
      result.push({a:la,b:lb,type:'same'})
    }else{
      if(la!==undefined) result.push({a:la,type:'del'})
      if(lb!==undefined) result.push({b:lb,type:'add'})
    }
  }
  return result
}

export default function TextCompare(){
  const [text1,setText1]=useState('')
  const [text2,setText2]=useState('')
  const diff = useMemo(()=>diffText(text1,text2),[text1,text2])

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Breadcrumb />
      <h1 className="text-2xl font-bold text-app-text mb-1">文本比对查重</h1>
      <p className="text-app-muted text-sm mb-6">对比两段文本，高亮新增、删除行</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-app-text block mb-2">文本A（旧）</label>
          <textarea
            value={text1} onChange={e=>setText1(e.target.value)}
            className="w-full h-64 p-3 rounded-xl border border-app-border bg-app-bg text-app-text text-sm focus:outline-none focus:border-violet-400"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-app-text block mb-2">文本B（新）</label>
          <textarea
            value={text2} onChange={e=>setText2(e.target.value)}
            className="w-full h-64 p-3 rounded-xl border border-app-border bg-app-bg text-app-text text-sm focus:outline-none focus:border-violet-400"
          />
        </div>
      </div>
      <div className="mt-6">
        <h3 className="text-sm font-medium text-app-text mb-2">比对结果</h3>
        <div className="rounded-xl border border-app-border bg-app-bg p-3 font-mono text-sm max-h-96 overflow-auto">
          {diff.map((item,idx)=>{
            if(item.type==='del') return <div key={idx} className="bg-red-500/10 text-red-600 dark:text-red-400">{item.a}</div>
            if(item.type==='add') return <div key={idx} className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">{item.b}</div>
            return <div key={idx} className="text-app-text">{item.a}</div>
          })}
        </div>
      </div>
    </div>
  )
}
