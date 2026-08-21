'use client'

import { useState } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

type UUIDItem = {
  id: string
  value: string
}

export default function UuidPage() {
  const [list, setList] = useState<UUIDItem[]>([])
  const [copied, setCopied] = useState<string | null>(null)

  const generate = (count: number, mode: 'append' | 'replace' = 'replace') => {
    const newItems: UUIDItem[] = []
    for (let i = 0; i < count; i++) {
      newItems.push({
        id: crypto.randomUUID(),
        value: crypto.randomUUID(),
      })
    }
    if (mode === 'replace') {
      setList(newItems)
    } else {
      setList((prev) => [...prev, ...newItems])
    }
    setCopied(null)
  }

  const remove = (id: string) => {
    setList((prev) => prev.filter((item) => item.id !== id))
  }

  const clear = () => {
    setList([])
    setCopied(null)
  }

  const copy = async (value: string, key?: string) => {
    await navigator.clipboard.writeText(value)
    if (key) {
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    }
  }

  const copyAll = async () => {
    if (list.length === 0) return
    await navigator.clipboard.writeText(list.map((i) => i.value).join('\n'))
    setCopied('all')
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">UUID 生成器</h1>
        <p className="text-app-muted text-sm">生成通用唯一标识符（UUID v4），适用于列表 ID、配置标识等场景</p>
      </div>

      {/* 操作区 */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button onClick={() => generate(1)} className="px-5 py-2.5 rounded-xl bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 active:scale-95 transition-all shadow-sm shadow-violet-500/20">
          生成 1 个
        </button>
        <button onClick={() => generate(5)} className="px-5 py-2.5 rounded-xl bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 active:scale-95 transition-all shadow-sm shadow-violet-500/20">
          生成 5 个
        </button>
        <button onClick={() => generate(10)} className="px-5 py-2.5 rounded-xl bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 active:scale-95 transition-all shadow-sm shadow-violet-500/20">
          生成 10 个
        </button>
        <button onClick={() => generate(20)} className="px-5 py-2.5 rounded-xl bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 active:scale-95 transition-all shadow-sm shadow-violet-500/20">
          生成 20 个
        </button>
        <button onClick={() => generate(10, 'append')} className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 active:scale-95 transition-all">
          ＋ 追加 10 个
        </button>
      </div>

      {/* 批量操作 */}
      {list.length > 0 && (
        <div className="flex gap-3 mb-6">
          <button onClick={copyAll} className="px-5 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 active:scale-95 transition-all">
            {copied === 'all' ? '✓ 已复制全部' : '📋 复制全部'}
          </button>
          <button onClick={clear} className="px-5 py-2.5 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 text-sm font-medium hover:bg-orange-100 active:scale-95 transition-all">
            清空
          </button>
        </div>
      )}

      {/* 空状态 */}
      {list.length === 0 && (
        <div className="text-center text-app-muted text-sm py-20 border-2 border-dashed border-gray-200 rounded-2xl">
          暂无 UUID，点击上方按钮生成
        </div>
      )}

      {/* 列表 */}
      <div className="space-y-3">
        {list.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-4 px-5 py-4 bg-app-bg border border-app-border rounded-xl hover:border-violet-200 transition-all"
          >
            <span className="font-mono text-sm break-all text-gray-800">
              {item.value}
            </span>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => copy(item.value, item.id)}
                className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 active:scale-95 transition-all"
              >
                {copied === item.id ? '✓ 已复制' : '📋 复制'}
              </button>
              <button
                onClick={() => remove(item.id)}
                className="px-4 py-2 rounded-lg bg-orange-50 text-orange-600 border border-orange-200 text-sm font-medium hover:bg-orange-100 active:scale-95 transition-all"
              >
                删除
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 说明卡片 */}
      <div className="mt-10 p-4 bg-gray-50 border border-app-border rounded-xl">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">说明</h3>
        <ul className="text-xs text-app-muted space-y-1.5 leading-relaxed">
          <li>• 基于浏览器原生 <code className="font-mono bg-white px-1 rounded">crypto.randomUUID()</code> 生成 UUID v4，碰撞概率极低</li>
          <li>• 适合作为前端列表 key、配置标识、临时 ID 使用</li>
          <li>• 不建议用于加密令牌、数据库主键或需要排序的场景</li>
        </ul>
      </div>

      <FooterNote />
    </div>
  )
}