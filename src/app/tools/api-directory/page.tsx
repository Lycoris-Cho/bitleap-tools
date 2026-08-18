'use client'

import { useState } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import Link from 'next/link'
import { apiList } from './data'
import ApiCard from './components/ApiCard'

export default function ApiDirectoryPage() {
  const [category, setCategory] = useState('全部')
  const [search, setSearch] = useState('')

  const categories = [
    '全部',
    ...Array.from(new Set(apiList.map((a) => a.category))),
  ]

  const filtered = apiList.filter((a) => {
    const matchCategory =
      category === '全部' || a.category === category
    const matchSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.desc.toLowerCase().includes(search.toLowerCase())
    return matchCategory && matchSearch
  })

  return (
    
    <div className="max-w-6xl mx-auto py-12 px-4">
      <Breadcrumb />
      <h1 className="text-3xl font-bold mb-2">常用公开 API</h1>
      <p className="text-app-muted mb-8">
        前端可直连的免费 API 索引（仅收录公开接口）
      </p>

      {/* 分类 */}
      <div className="flex flex-wrap gap-4 mb-6">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-4 py-2 rounded-xl border text-sm transition ${
              category === c
                ? 'bg-black text-white'
                : 'bg-app-bg text-gray-800 hover:bg-gray-50'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* 搜索 */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="搜索 API..."
        className="w-full mb-8 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
      />

      {/* 列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((api) => (
          <ApiCard key={api.slug} api={api} />
        ))}
      </div>

      {/* 免责 */}
      <section className="mt-16 pt-10 border-t text-sm text-app-muted">
        <p>
          本页仅收录各 API 提供方公开发布的接口信息与官方文档链接，
          所有数据以原提供方 Terms of Service 为准。
        </p>
      </section>
    </div>
  )
}