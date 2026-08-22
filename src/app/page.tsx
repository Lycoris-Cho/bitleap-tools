'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { tools } from './tools'
import ExternalLinkModal from '@/components/ExternalLinkModal'

export default function HomePage() {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [booted, setBooted] = useState(false)
  const [pendingLink, setPendingLink] = useState<{ href: string; title: string } | null>(null)
  const [activeCategory, setActiveCategory] = useState('')
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map())
  const mainScrollRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    setBooted(true)
    // 获取桌面端滚动容器
    mainScrollRef.current = document.querySelector('main')
  }, [])

  // 滚动观察分类高亮，修复最后一项不高亮问题
  useEffect(() => {
    if (!booted || searchKeyword.trim()) return

    const categoryList = Array.from(sectionRefs.current.keys())
    const lastCategory = categoryList.at(-1)

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveCategory(entry.target.id)
            break
          }
        }
      },
      // 修改rootMargin：底部减少裁切，让最后一个区块更容易触发
      { rootMargin: '-15% 0px -40% 0px' }
    )

    sectionRefs.current.forEach(el => observer.observe(el))

    // 兜底：滚动到底部，强制激活最后一个分类
    const handleScroll = () => {
      const scrollEl = mainScrollRef.current
      if (!scrollEl || !lastCategory) return
      const { scrollTop, scrollHeight, clientHeight } = scrollEl
      // 距离底部小于80px，判定已经滑到底部
      if (scrollHeight - scrollTop - clientHeight < 80) {
        setActiveCategory(lastCategory)
      }
    }

    mainScrollRef.current?.addEventListener('scroll', handleScroll)

    return () => {
      observer.disconnect()
      mainScrollRef.current?.removeEventListener('scroll', handleScroll)
    }
  }, [booted, searchKeyword])

  // 快捷键 Ctrl+K / ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        document.getElementById('search-input')?.focus()
      }
      if (e.key === 'Escape' && searchKeyword) {
        e.preventDefault()
        setSearchKeyword('')
        document.getElementById('search-input')?.blur()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [searchKeyword])

  const filteredTools = useMemo(() => {
    if (!searchKeyword.trim()) return tools
    const kw = searchKeyword.toLowerCase().trim()
    return tools.filter(t =>
      t.title.toLowerCase().includes(kw) ||
      t.description.toLowerCase().includes(kw) ||
      t.category.toLowerCase().includes(kw)
    )
  }, [searchKeyword])

  const categories = useMemo(() => Array.from(new Set(filteredTools.map(t => t.category))), [filteredTools])

  const handleExternalClick = (tool: (typeof tools)[0]) => {
    setPendingLink({ href: tool.href, title: tool.title })
  }

  const confirmExternal = () => {
    if (pendingLink) {
      window.open(pendingLink.href, '_blank', 'noopener,noreferrer')
      setPendingLink(null)
    }
  }

  // 工具卡片，固定高度 h‑36，保证所有卡片盒子高度完全一致
  const renderToolCard = (tool: (typeof tools)[0], isMobile = false) => {
    const isExternal = (tool as any).target === '_blank'
    const baseCls = isMobile
      ? 'group w-full text-left block p-3 bg-app-bg border border-app-border rounded-xl hover:border-gray-300 transition touch-manipulation h-36'
      : 'group relative block w-full text-left p-4 bg-app-bg border border-app-border/80 rounded-2xl hover:border-violet-200 hover:shadow-[0_4px_24px_rgba(139,92,246,0.08)] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden touch-manipulation h-36'

    const content = (
      <>
        <div className="absolute -top-8 -left-8 w-24 h-24 rounded-full bg-violet-100/50 blur-2xl group-hover:bg-violet-200/60 group-hover:scale-125 transition-all duration-500 pointer-events-none" />
        <div className="absolute -bottom-8 -right-8 w-20 h-20 rounded-full bg-sky-50/60 blur-2xl group-hover:bg-sky-100/70 group-hover:scale-125 transition-all duration-500 pointer-events-none" />
        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-violet-500 group-hover:w-12 transition-all duration-300 rounded-full" />
        {!isMobile && isExternal && (
          <span className="absolute top-2.5 right-2.5 z-10 text-[10px] px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">外链 ↗</span>
        )}
        <div className="relative text-2xl mb-2.5 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-1 origin-left">{tool.icon}</div>
        <h3 className="relative font-semibold text-sm text-app-text mb-1.5">
          <span className="bg-[length:0%_1px] bg-no-repeat bg-left-bottom bg-gradient-to-r from-violet-500 to-violet-500 group-hover:bg-[length:100%_1px] transition-all duration-300">
            {tool.title}
          </span>
        </h3>
        <p className="relative text-xs text-gray-500 leading-relaxed line-clamp-2 mt-1">{tool.description}</p>
      </>
    )

    if (isExternal) {
      return (
        <button type="button" onClick={() => handleExternalClick(tool)} className={baseCls}>
          {content}
        </button>
      )
    }
    return (
      <a href={tool.href} className={baseCls}>
        {content}
      </a>
    )
  }

  return (
    <div className="bg-app-bg">
      {/* 桌面端侧边栏 */}
      <aside className="fixed top-16 left-0 z-40 w-56 h-[calc(100vh-4rem)] border-r border-app-border bg-app-sidebar hidden md:flex flex-col pt-6">
        <div className="sticky top-6 z-10 px-5 py-4 mx-4 mt-3 bg-app-bg backdrop-blur-xl border border-white/60 rounded-[100px] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold tracking-tight text-app-text">BitLeap</h1>
            <svg className="w-8 h-8 text-app-text fill-app-text" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path fillRule="evenodd" clipRule="evenodd" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </div>

        {!searchKeyword.trim() && (
          <nav className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
            {categories.map(category => (
              <a
                key={category}
                href={`#${category}`}
                className={`block px-3 py-2 rounded-xl text-sm transition ${
                  activeCategory === category
                    ? 'bg-violet-100 text-violet-700 font-medium'
                    : 'text-gray-700 hover:bg-app-bg hover:shadow-sm'
                }`}
              >
                {category}
              </a>
            ))}
          </nav>
        )}

        <div className="px-6 py-4 border-t border-app-border text-xs text-app-muted">更多工具正在开发中 →</div>
      </aside>

      {/* 桌面主内容区 */}
      <main className="fixed top-16 left-56 right-0 h-[calc(100vh-4rem)] overflow-y-auto hidden md:block">
        <div className="w-full px-6 py-8">
          <div className="mb-8">
            <div className="mb-5">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-app-text mb-1.5">
                <span className="bg-gradient-to-r from-violet-500 to-sky-400 bg-clip-text text-transparent">Bit工具箱</span>，一键直达
              </h2>
              <p className="text-sm text-gray-500">
                {tools.length}+ 款纯前端工具 · 零上传 · 本地运行 · 开箱即用
              </p>
              <p className="text-xs text-gray-300">本站收录部分外部工具链接，跳转后请注意甄别，谨慎提交敏感信息</p>
            </div>

            <div className="relative max-w-xl">
              <label htmlFor="search-input" className="sr-only">搜索工具</label>
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                id="search-input"
                type="text"
                placeholder="搜索工具… 名称 / 描述 / 分类"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-app-border bg-app-bg focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition shadow-sm"
              />
              {searchKeyword && (
                <button onClick={() => setSearchKeyword('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>
              )}
            </div>
          </div>

          {filteredTools.length === 0 ? (
            <div className="py-20 text-center text-app-muted">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-lg">没有找到匹配的工具</p>
              <p className="text-sm mt-1">试试其他关键词</p>
            </div>
          ) : (
            <div className="space-y-8">
              {categories.map(category => (
                <section
                  key={category}
                  id={category}
                  ref={(el) => {
                    if (el) sectionRefs.current.set(category, el)
                    else sectionRefs.current.delete(category)
                  }}
                >
                  <h2 className="text-xl font-semibold tracking-tight mb-4 pb-2 border-b border-app-border">{category}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
                    {filteredTools.filter(t => t.category === category).map(tool => (
                      <div key={tool.id}>{renderToolCard(tool)}</div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          <div className="mt-16 text-center text-sm text-app-muted space-y-2 min-h-[180px]">
            {searchKeyword.trim() ? (
              <p>搜索到 {filteredTools.length} 款工具</p>
            ) : (
              <p>目前 BitLeap 共有 {tools.length} 款工具</p>
            )}
            <p>更多工具正在开发中</p>
          </div>
        </div>
      </main>

      {/* 移动端 */}
      <div className="md:hidden px-4 py-16">
        <div className="mb-10">
          <div className="mb-4">
            <h2 className="text-xl font-bold tracking-tight text-app-text mb-1">
              <span className="bg-gradient-to-r from-violet-500 to-sky-400 bg-clip-text text-transparent">Bit工具箱</span>
            </h2>
            <p className="text-xs text-gray-500">{tools.length}+ 款纯前端工具 · 零上传 · 本地运行</p>
            <p className="text-xs text-gray-300">本站收录部分外部工具链接，跳转后请注意甄别，谨慎提交敏感信息</p>
          </div>

          <div className="relative">
            <label htmlFor="search-input-mobile" className="sr-only">搜索工具</label>
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              id="search-input-mobile"
              type="text"
              placeholder="搜索工具"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-app-border bg-app-bg focus:outline-none focus:ring-2 focus:ring-violet-200"
            />
            {searchKeyword && (
              <button onClick={() => setSearchKeyword('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">✕</button>
            )}
          </div>
        </div>

        {filteredTools.length === 0 ? (
          <div className="py-16 text-center text-app-muted"><p>没有找到匹配工具</p></div>
        ) : (
          <div className="space-y-12">
            {categories.map(category => (
              <section key={category} id={category}>
                <h2 className="text-xl font-semibold tracking-tight mb-4 pb-2 border-b border-app-border">{category}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredTools.filter(t => t.category === category).map(tool => (
                    <div key={tool.id}>{renderToolCard(tool, true)}</div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <div className="mt-16 text-center text-sm text-app-muted space-y-2 min-h-[140px]">
          {searchKeyword.trim() ? (
            <p>搜索到 {filteredTools.length} 款工具</p>
          ) : (
            <p>目前 BitLeap 共有 {tools.length} 款工具</p>
          )}
          <p>更多工具正在开发中 →</p>
        </div>
      </div>

      {pendingLink && (
        <ExternalLinkModal
          href={pendingLink.href}
          title={pendingLink.title}
          onConfirm={confirmExternal}
          onCancel={() => setPendingLink(null)}
        />
      )}
    </div>
  )
}
