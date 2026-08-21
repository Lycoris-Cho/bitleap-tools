'use client'

import { useState } from 'react'
import { inspoList } from './data'
import InspoCard from './components/InspoCard'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

export default function InspoDirectoryPage() {
  const [category, setCategory] = useState('全部')
  const [search, setSearch] = useState('')

  const categories = [
    '全部',
    ...Array.from(new Set(inspoList.map((s) => s.category))),
  ]

  const filtered = inspoList.filter((site) => {
    const matchCategory =
      category === '全部' || site.category === category
    const matchSearch =
      site.name.toLowerCase().includes(search.toLowerCase()) ||
      site.desc.toLowerCase().includes(search.toLowerCase())
    return matchCategory && matchSearch
  })

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">前端灵感开发</h1>
        <p className="text-app-muted text-sm">带着前端视角去拆解站点，而不是单纯收藏</p>
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
          placeholder="搜索站点名称或描述..."
          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
      </div>

      {/* 结果计数 */}
      <div className="mb-4 text-sm text-app-muted">
        共 {filtered.length} 个站点
      </div>

      {/* 列表 */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((site) => (
            <InspoCard key={site.slug} site={site} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-app-muted text-sm border-2 border-dashed border-gray-200 rounded-2xl">
          没有找到匹配的站点，试试其他关键词或分类
        </div>
      )}

      {/* 说明卡片 */}
      <div className="mt-10 p-4 bg-gray-50 border border-app-border rounded-xl">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">免责声明</h3>
        <p className="text-xs text-app-muted leading-relaxed">
          本页仅收录公开可访问的站点，所有内容版权归原作者所有，
          仅作前端学习与拆解参考，请勿直接复制商业使用。
        </p>
      </div>

      <FooterNote />
    </div>
  )
}