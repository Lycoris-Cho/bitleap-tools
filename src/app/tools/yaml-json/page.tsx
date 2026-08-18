'use client'
import { useState } from 'react'
import { dump, load } from 'js-yaml'
import { Breadcrumb } from '@/components/breadcrumb'
export default function YamlJsonPage() {
  const [mode, setMode] = useState<'json2yaml' | 'yaml2json'>('json2yaml')
  const [input, setInput] = useState('{\n  "name": "demo",\n  "age": 18\n}')
  const [output, setOutput] = useState('')
  const [err, setErr] = useState('')

  const handleConvert = () => {
    setErr('')
    try {
      if (mode === 'json2yaml') {
        const obj = JSON.parse(input)
        setOutput(dump(obj))
      } else {
        const obj = load(input)
        setOutput(JSON.stringify(obj, null, 2))
      }
    } catch (e: any) {
      setErr(e.message)
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <Breadcrumb />
      <h1 className="text-2xl font-bold mb-2">YAML ↔ JSON互转</h1>
      <p className="text-gray-500 mb-4">格式化、校验，本地转换</p>

      <div className="flex gap-3 mb-4 flex-wrap">
        <button
          onClick={() => setMode('json2yaml')}
          className={`px-4 py-2 rounded-lg border transition-all duration-200 ${mode === 'json2yaml' ? 'bg-black text-white hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100'}`}
        >
          JSON → YAML
        </button>
        <button
          onClick={() => setMode('yaml2json')}
          className={`px-4 py-2 rounded-lg border transition-all duration-200 ${mode === 'yaml2json' ? 'bg-black text-white hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100'}`}
        >
          YAML → JSON
        </button>
        <button onClick={handleConvert} className="px-4 py-2 bg-black text-white rounded-lg transition-all duration-200 hover:bg-gray-800 active:bg-gray-700">
          转换
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <div className="mb-1 font-medium">输入</div>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            className="w-full h-80 border border-gray-300 rounded-xl p-3 font-mono text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-black/20"
          />
        </div>
        <div>
          <div className="mb-1 font-medium">输出</div>
          <textarea readOnly value={output} className="w-full h-80 border border-gray-300 rounded-xl p-3 font-mono text-sm bg-gray-50 transition-all duration-200" />
        </div>
      </div>
      {err && <div className="mt-3 text-red-500">{err}</div>}
      <button
        className="mt-3 px-4 py-3 text-xs font-medium rounded-lg text-white bg-violet-500 border-none shadow-[0_2px_8px_rgba(139,92,246,0.3)] hover:bg-violet-600 hover:shadow-[0_4px_14px_rgba(139,92,246,0.45)] active:scale-95 transition-all duration-200"
        onClick={() => navigator.clipboard.writeText(output)}
      >
        复制输出
      </button>
    </div>
  )
}
