'use client'

import { useState } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import { apiList } from './data'
import ApiCard from './components/ApiCard'
import FooterNote from '@/components/FooterNote'

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
    <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">常用公开 API</h1>
        <p className="text-app-muted text-sm">前端可直连的免费 API 索引（仅收录公开接口）</p>
      </div>

      {/* 分类 */}
      <div className="flex flex-wrap gap-3 mb-6">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              category === c
                ? 'bg-violet-500 text-white shadow-sm shadow-violet-500/20'
                : 'bg-app-bg border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* 搜索 */}
      <div className="mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索 API 名称或描述..."
          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
      </div>

      {/* 结果计数 */}
      <div className="mb-4 text-sm text-app-muted">
        共 {filtered.length} 个 API
      </div>

      {/* 列表 */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((api) => (
            <ApiCard key={api.slug} api={api} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-app-muted text-sm border-2 border-dashed border-gray-200 rounded-2xl">
          没有找到匹配的 API，试试其他关键词或分类
        </div>
      )}

      {/* 免责说明卡片 */}
      <div className="mt-10 p-4 bg-gray-50 border border-app-border rounded-xl">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">免责声明</h3>
        <p className="text-xs text-app-muted leading-relaxed">
          本页仅收录各 API 提供方公开发布的接口信息与官方文档链接，
          所有数据以原提供方 Terms of Service 为准。
          接口可用性、速率限制、数据准确性等均由原提供方负责。
        </p>
      </div>

      <FooterNote />
    </div>
  )
}