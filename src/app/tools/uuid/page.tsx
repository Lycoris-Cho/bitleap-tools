'use client'

import { useState } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
type UUIDItem = {
  id: string
  value: string
}

export default function UuidPage() {
  const [list, setList] = useState<UUIDItem[]>([])

  const generate = (count: number) => {
    const newItems: UUIDItem[] = []
    for (let i = 0; i < count; i++) {
      newItems.push({
        id: crypto.randomUUID(),
        value: crypto.randomUUID(),
      })
    }
    setList((prev) => [...prev, ...newItems])
  }

  const remove = (id: string) => {
    setList((prev) => prev.filter((item) => item.id !== id))
  }

  const clear = () => setList([])

  const copy = (value: string) => {
    navigator.clipboard.writeText(value)
  }

  const copyAll = () => {
    navigator.clipboard.writeText(list.map((i) => i.value).join('\n'))
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      {/* 标题 */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          UUID 生成器
        </h1>
        <p className="text-app-muted">
          生成通用唯一标识符（UUID v4），适用于列表 ID、配置标识等场景
        </p>
      </div>

      {/* 操作区 */}
      <div className="flex flex-wrap gap-4 mb-8">
        <button
          onClick={() => generate(1)}
          className="px-5 py-3 rounded-xl bg-black text-white text-sm font-medium hover:bg-gray-800 transition"
        >
          生成 1 个
        </button>
        <button
          onClick={() => generate(5)}
          className="px-5 py-3 rounded-xl border border-gray-300 text-sm font-medium hover:bg-gray-50 transition"
        >
          生成 5 个
        </button>
        <button
          onClick={() => generate(10)}
          className="px-5 py-3 rounded-xl border border-gray-300 text-sm font-medium hover:bg-gray-50 transition"
        >
          生成 10 个
        </button>
        <button
          onClick={() => generate(20)}
          className="px-5 py-3 rounded-xl border border-gray-300 text-sm font-medium hover:bg-gray-50 transition"
        >
          生成 20 个
        </button>
      </div>

      {/* 批量操作 */}
      {list.length > 0 && (
        <div className="flex gap-4 mb-8">
          <button
            onClick={copyAll}
            className="px-5 py-3 rounded-xl border-none text-sm font-medium text-white bg-violet-500 shadow-[0_2px_8px_rgba(139,92,246,0.3)] hover:bg-violet-600 hover:shadow-[0_4px_14px_rgba(139,92,246,0.45)] active:scale-95 transition-all duration-200"
          >
            复制全部
          </button>
          <button
            onClick={clear}
            className="px-5 py-3 rounded-xl text-red-600 border border-red-200 text-sm font-medium hover:bg-red-50 transition"
          >
            清空
          </button>
        </div>
      )}

      {/* 空状态 */}
      {list.length === 0 && (
        <div className="text-center text-gray-500 text-sm py-20 border border-dashed rounded-2xl">
          暂无 UUID，点击上方按钮生成
        </div>
      )}

      {/* 列表 */}
      <div className="space-y-4">
        {list.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-4 px-5 py-4 bg-gray-50 border border-app-border rounded-xl"
          >
            <span className="font-mono text-sm break-all text-gray-700">
              {item.value}
            </span>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => copy(item.value)}
                className="px-4 py-2 rounded-xl border-none text-sm text-white bg-violet-500 shadow-[0_2px_8px_rgba(139,92,246,0.3)] hover:bg-violet-600 hover:shadow-[0_4px_14px_rgba(139,92,246,0.45)] active:scale-95 transition-all duration-200"
              >
                复制
              </button>
              <button
                onClick={() => remove(item.id)}
                className="px-4 py-2 rounded-xl text-red-600 border border-red-200 text-sm hover:bg-red-50 transition"
              >
                删除
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 说明 */}
      <div className="mt-12 text-sm text-gray-500 leading-relaxed">
        <p className="mb-2">
          <strong>UUID v4</strong> 基于浏览器原生
          <code className="mx-1 px-1.5 py-0.5 bg-gray-100 rounded text-xs">
            crypto.randomUUID()
          </code>
          生成，碰撞概率极低，适合作为前端列表、配置、临时标识使用。
        </p>
        <p>
          不建议用于加密令牌、数据库主键或需要排序的场景。
        </p>
      </div>
    </div>
  )
}