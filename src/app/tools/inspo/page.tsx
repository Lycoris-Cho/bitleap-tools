'use client'

import { useState } from 'react'
import Link from 'next/link'
import { inspoList } from './data'
import InspoCard from './components/InspoCard'
import { Breadcrumb } from '@/components/breadcrumb'
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
    <div className="max-w-6xl mx-auto py-12 px-4">
      <Breadcrumb />
      <h1 className="text-3xl font-bold mb-2">前端灵感开发</h1>
      <p className="text-app-muted mb-8">
        带着前端视角去拆解站点，而不是单纯收藏
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
        placeholder="搜索站点..."
        className="w-full mb-8 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
      />

      {/* 列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((site) => (
          <InspoCard key={site.slug} site={site} />
        ))}
      </div>

      {/* 说明 */}
      <section className="mt-16 pt-10 border-t text-sm text-app-muted">
        <p>
          本页仅收录公开可访问的站点，所有内容版权归原作者所有，
          仅作前端学习与拆解参考，请勿直接复制商业使用。
        </p>
      </section>
    </div>
  )
}