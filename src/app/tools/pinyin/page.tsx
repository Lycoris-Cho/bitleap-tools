'use client'
import { useState, useMemo } from 'react'
import { pinyin } from 'pinyin-pro'
import { Breadcrumb } from '@/components/breadcrumb'
export default function PinyinPage(){
  const [input,setInput]=useState('你好世界')
  const [mode,setMode]=useState<'tone'|'noTone'|'first'>('tone')

  const output = useMemo(()=>{
    if(mode==='tone') return pinyin(input,{toneType:'symbol'})
    if(mode==='noTone') return pinyin(input,{toneType:'none'})
    return pinyin(input,{pattern:'first'})
  },[input,mode])

  const copy = async ()=>await navigator.clipboard.writeText(output)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumb />
      <h1 className="text-2xl font-bold text-app-text mb-1">汉字转拼音</h1>
      <p className="text-app-muted text-sm mb-6">支持带声调、无声调、首字母提取</p>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-app-text block mb-2">输入汉字</label>
          <textarea
            value={input} onChange={e=>setInput(e.target.value)}
            className="w-full h-40 p-3 rounded-xl border border-app-border bg-app-bg text-app-text text-sm focus:outline-none focus:border-violet-400"
          />
        </div>
        <div className="flex gap-3">
          {(['tone','noTone','first'] as const).map(m=>(
            <label key={m} className="flex items-center gap-1 text-sm text-app-text">
              <input type="radio" checked={mode===m} onChange={()=>setMode(m)} name="pmode"/>
              {m==='tone'?'带声调':m==='noTone'?'无声调':'首字母'}
            </label>
          ))}
        </div>
        <div>
          <label className="text-sm font-medium text-app-text block mb-2">输出拼音</label>
          <div className="p-3 rounded-xl border border-app-border bg-app-bg text-app-text font-mono text-sm min-h-20">{output}</div>
        </div>
        <button onClick={copy} className="px-4 py-2 bg-violet-500 text-white rounded-xl text-sm">复制结果</button>
      </div>
    </div>
  )
}
