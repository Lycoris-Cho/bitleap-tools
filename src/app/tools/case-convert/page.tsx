'use client'
import { useState } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
const toCamel = (s: string) => s.replace(/[-_](.)/g, (_, c) => c.toUpperCase())
const toPascal = (s: string) => {
  const cam = toCamel(s)
  return cam.charAt(0).toUpperCase() + cam.slice(1)
}
const toSnake = (s: string) => s.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`).replace(/^_/, '')
const toKebab = (s: string) => s.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`).replace(/^-/, '')

export default function CaseConvertPage() {
  const [input, setInput] = useState('helloWorld')

  const list = [
    { label: '小驼峰 camelCase', value: toCamel(input) },
    { label: '大驼峰 PascalCase', value: toPascal(input) },
    { label: '下划线 snake_case', value: toSnake(input) },
    { label: '短横线 kebab‑case', value: toKebab(input) },
  ]

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <Breadcrumb />
      <h1 className="text-2xl font-bold mb-2">变量命名转换</h1>
      <p className="text-gray-500 mb-6">驼峰、大驼峰、下划线、短横线互相转换</p>

      <div className="mb-6">
        <label className="block mb-2 font-medium">输入文本</label>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          className="w-full border border-gray-300 rounded-xl p-3 font-mono transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-black/20"
          placeholder="hello_world / helloWorld / HelloWorld / hello‑world"
        />
      </div>

      <div className="space-y-3">
        {list.map(item => (
          <div key={item.label} className="border border-gray-200 rounded-xl p-4 flex items-center justify-between bg-app-bg">
            <div>
              <div className="text-sm text-gray-500">{item.label}</div>
              <div className="font-mono mt-1 text-lg">{item.value}</div>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(item.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm transition-all duration-200 hover:bg-gray-100 active:bg-gray-200"
            >
              复制
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
