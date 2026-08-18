'use client'
import { useState } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
export default function TextBatch() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')

  const handleDedup = () => {
    const lines = input.split('\n')
    const set = new Set(lines.map(l => l.trim()))
    setOutput([...set].join('\n'))
  }
  const removeEmpty = () => {
    const res = input.split('\n').filter(l => l.trim() !== '').join('\n')
    setOutput(res)
  }
  const trimAll = () => {
    const res = input.split('\n').map(l => l.trim()).join('\n')
    setOutput(res)
  }
  const toUpper = () => setOutput(input.toUpperCase())
  const toLower = () => setOutput(input.toLowerCase())
  const sortAsc = () => {
    const arr = input.split('\n')
    arr.sort((a,b)=>a.localeCompare(b))
    setOutput(arr.join('\n'))
  }
  const shuffle = () => {
    const arr = input.split('\n')
    for(let i=arr.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [arr[i],arr[j]]=[arr[j],arr[i]]
    }
    setOutput(arr.join('\n'))
  }
  const copy = async ()=>{
    await navigator.clipboard.writeText(output)
  }
  const clear = ()=>{setInput('');setOutput('')}

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Breadcrumb />
      <h1 className="text-2xl font-bold text-app-text mb-1">文本去重 & 批量处理</h1>
      <p className="text-app-muted text-sm mb-6">行去重、清理空行、批量文本转换</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-app-text block mb-2">输入文本</label>
          <textarea
            value={input}
            onChange={e=>setInput(e.target.value)}
            className="w-full h-80 p-3 rounded-xl border border-app-border bg-app-bg text-app-text text-sm focus:outline-none focus:border-violet-400"
            placeholder="粘贴多行文本……"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-app-text block mb-2">处理结果</label>
          <textarea
            readOnly
            value={output}
            className="w-full h-80 p-3 rounded-xl border border-app-border bg-app-bg text-app-text text-sm"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        <button onClick={handleDedup} className="px-3 py-2 bg-violet-500 text-white rounded-xl text-sm">行去重</button>
        <button onClick={removeEmpty} className="px-3 py-2 bg-app-card border border-app-border rounded-xl text-sm text-app-text">删除空行</button>
        <button onClick={trimAll} className="px-3 py-2 bg-app-card border border-app-border rounded-xl text-sm text-app-text">每行去首尾空格</button>
        <button onClick={toUpper} className="px-3 py-2 bg-app-card border border-app-border rounded-xl text-sm text-app-text">全部大写</button>
        <button onClick={toLower} className="px-3 py-2 bg-app-card border border-app-border rounded-xl text-sm text-app-text">全部小写</button>
        <button onClick={sortAsc} className="px-3 py-2 bg-app-card border border-app-border rounded-xl text-sm text-app-text">字典排序</button>
        <button onClick={shuffle} className="px-3 py-2 bg-app-card border border-app-border rounded-xl text-sm text-app-text">随机打乱</button>
        <button onClick={copy} className="px-3 py-2 bg-blue-500 text-white rounded-xl text-sm">复制结果</button>
        <button onClick={clear} className="px-3 py-2 bg-orange-500 text-white rounded-xl text-sm">清空</button>
      </div>
    </div>
  )
}
