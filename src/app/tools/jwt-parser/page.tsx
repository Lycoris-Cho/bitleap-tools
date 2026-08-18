'use client'
import { useState, useMemo } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
function safeParseJwt(token:string){
  try{
    const parts = token.split('.')
    if(parts.length!==3) return null
    const decode = (s:string)=>JSON.parse(atob(s.replace(/-/g,'+').replace(/_/g,'/')))
    const header = decode(parts[0])
    const payload = decode(parts[1])
    return {header,payload,signature:parts[2]}
  }catch{
    return null
  }
}

export default function JwtParser(){
  const [token,setToken]=useState('')
  const result = useMemo(()=>safeParseJwt(token),[token])

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Breadcrumb />
      <h1 className="text-2xl font-bold text-app-text mb-1">JWT 解析器</h1>
      <p className="text-app-muted text-sm mb-6">解析Header、Payload，注意：不能校验签名合法性</p>
      <div>
        <label className="text-sm font-medium text-app-text block mb-2">粘贴JWT Token</label>
        <textarea
          value={token} onChange={e=>setToken(e.target.value)}
          className="w-full h-32 p-3 rounded-xl border border-app-border bg-app-bg text-app-text text-sm font-mono focus:outline-none focus:border-violet-400"
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
        />
      </div>
      {!result && token && <p className="mt-3 text-red-500 text-sm">JWT格式错误，请检查输入</p>}
      {result && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-semibold text-app-text mb-2">Header</h3>
            <pre className="p-3 rounded-xl border border-app-border bg-app-bg text-app-text text-sm overflow-auto max-h-72">{JSON.stringify(result.header,null,2)}</pre>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-app-text mb-2">Payload</h3>
            <pre className="p-3 rounded-xl border border-app-border bg-app-bg text-app-text text-sm overflow-auto max-h-72">{JSON.stringify(result.payload,null,2)}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
