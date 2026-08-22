'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { tools } from './tools'
import ExternalLinkModal from '@/components/ExternalLinkModal'

export default function HomePage() {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [booted, setBooted] = useState(false)
  const [pendingLink, setPendingLink] = useState<{ href: string; title: string } | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('')
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    setBooted(true)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        document.getElementById('search-input')?.focus()
      }
      if (e.key === 'Escape' && searchKeyword) {
        setSearchKeyword('')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [searchKeyword])

  const filteredTools = useMemo(() => {
    if (!searchKeyword.trim()) return tools
    const kw = searchKeyword.toLowerCase().trim()
    return tools.filter((tool) =>
      tool.title.toLowerCase().includes(kw) ||
      tool.description.toLowerCase().includes(kw) ||
      tool.category.toLowerCase().includes(kw)
    )
  }, [searchKeyword])

  const categories = useMemo(() => {
    return Array.from(new Set(filteredTools.map((tool) => tool.category)))
  }, [filteredTools])

  // ===== 滚动监听：IntersectionObserver + scroll 兜底 + 底部检测 =====
  useEffect(() => {
    if (categories.length === 0) return

    const container = mainRef.current
    const offset = 140

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible.length > 0) {
          setActiveCategory(visible[0].target.id)
        }
      },
      {
        root: container,
        rootMargin: `-${offset}px 0px -80% 0px`,
        threshold: [0, 0.1, 0.25, 0.5, 1],
      }
    )

    const elements = categories
      .map(id => document.getElementById(id))
      .filter(Boolean) as HTMLElement[]

    elements.forEach(el => observer.observe(el))

    // 兜底：scroll 事件 + 底部检测
    const handleScroll = () => {
      const scrollTop = container?.scrollTop ?? 0
      const scrollHeight = container?.scrollHeight ?? 0
      const clientHeight = container?.clientHeight ?? 0

      // ★ 滚到最底部 → 强制高亮最后一个分类
      if (scrollTop + clientHeight >= scrollHeight - 10) {
        setActiveCategory(categories[categories.length - 1])
        return
      }

      for (const id of categories) {
        const el = document.getElementById(id)
        if (!el) continue
        const top = el.offsetTop - offset
        const bottom = top + el.offsetHeight
        if (scrollTop >= top && scrollTop < bottom) {
          setActiveCategory(id)
          break
        }
      }
    }

    const scrollTarget = container || window
    scrollTarget.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // 初始化

    return () => {
      observer.disconnect()
      scrollTarget.removeEventListener('scroll', handleScroll)
    }
  }, [categories])

  const handleExternalClick = (tool: (typeof tools)[0]) => {
    setPendingLink({ href: tool.href, title: tool.title })
  }

  const confirmExternal = () => {
    if (pendingLink) {
      window.open(pendingLink.href, '_blank', 'noopener,noreferrer')
      setPendingLink(null)
    }
  }

  return (
    <div className="bg-app-bg">
      {/* ===== 左侧固定导航 ===== */}
      <aside className="fixed top-16 left-0 z-40 w-56 h-[calc(100vh-4rem)] border-r border-app-border bg-app-sidebar hidden md:flex flex-col pt-6">
        <div
          style={{
            animationName: booted ? 'fadeInLeft' : undefined,
            animationDuration: booted ? '0.5s' : undefined,
            animationTimingFunction: booted ? 'cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
            animationFillMode: booted ? 'backwards' : undefined,
          }}
          className="px-5 py-4 mx-4 mt-3 bg-app-bg backdrop-blur-xl border border-white/60 rounded-[100px] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]"
        >
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold tracking-tight text-app-text">BitLeap</h1>
            <svg
              className={`w-8 h-8 text-app-text fill-app-text transition-all duration-500 ${booted ? 'animate-[spin_3s_linear_infinite]' : 'animate-[spin_0.6s_ease-out]'}`}
              viewBox="0 0 24 24"
            >
              <path fillRule="evenodd" clipRule="evenodd" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path fillRule="evenodd" clipRule="evenodd" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
          {categories.map((category, index) => {
            const isActive = activeCategory === category
            return (
              <a
                key={category}
                href={`#${category}`}
                style={{
                  animationName: booted ? 'fadeInLeft' : undefined,
                  animationDuration: booted ? '0.35s' : undefined,
                  animationTimingFunction: booted ? 'cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
                  animationFillMode: booted ? 'backwards' : undefined,
                  animationDelay: booted ? `${120 + index * 25}ms` : undefined,
                }}
                className={`block px-3 py-2 rounded-xl text-sm transition ${
                  isActive
                    ? 'bg-violet-50 text-violet-600 font-semibold shadow-sm'
                    : 'text-gray-700 hover:bg-app-bg hover:shadow-sm'
                }`}
              >
                {category}
              </a>
            )
          })}
        </nav>

        <div className="px-6 py-4 border-t border-app-border text-xs text-app-muted">
          更多工具正在开发中 →
        </div>
      </aside>

      {/* ===== 右侧内容区 ===== */}
      <main ref={mainRef} className="fixed top-16 left-56 right-0 h-[calc(100vh-4rem)] overflow-y-auto hidden md:block">
        <div className="w-full px-6 py-8">
          {/* ===== Hero + 搜索 ===== */}
          <div
            style={{
              animationName: booted ? 'fadeInUp' : undefined,
              animationDuration: booted ? '0.5s' : undefined,
              animationTimingFunction: booted ? 'cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
              animationFillMode: booted ? 'backwards' : undefined,
            }}
            className="mb-8"
          >
            <div className="mb-5">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-app-text mb-1.5">
                <span className="bg-gradient-to-r from-violet-500 to-sky-400 bg-clip-text text-transparent">
                  Bit工具箱
                </span>
                ，一键直达
              </h2>
              <p className="text-sm text-gray-500">
                {tools.length}+ 款纯前端工具 · 零上传 · 本地运行 · 开箱即用
              </p>
              <p className="text-xs text-gray-300">
                本站收录部分外部工具链接，跳转后请注意甄别，谨慎提交敏感信息
              </p>
            </div>

            <div className="relative max-w-xl">
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
                <button onClick={() => setSearchKeyword('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  ✕
                </button>
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
              {categories.map((category, catIndex) => (
                <section key={category} id={category}>
                  <h2
                    style={{
                      animationName: booted ? 'fadeInLeft' : undefined,
                      animationDuration: booted ? '0.4s' : undefined,
                      animationTimingFunction: booted ? 'cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
                      animationFillMode: booted ? 'backwards' : undefined,
                      animationDelay: booted ? `${catIndex * 60}ms` : undefined,
                    }}
                    className="text-xl font-semibold tracking-tight mb-4 pb-2 border-b border-app-border"
                  >
                    {category}
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
                    {filteredTools
                      .filter((tool) => tool.category === category)
                      .map((tool, index) => {
                        const isExternal = (tool as any).target === '_blank'
                        return isExternal ? (
                          <button
                            key={tool.id}
                            onClick={() => handleExternalClick(tool)}
                            style={{
                              animationName: booted ? 'fadeInUp' : undefined,
                              animationDuration: booted ? '0.45s' : undefined,
                              animationTimingFunction: booted ? 'cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
                              animationFillMode: booted ? 'backwards' : undefined,
                              animationDelay: booted ? `${catIndex * 60 + index * 35 + 80}ms` : undefined,
                            }}
                            className="group relative block w-full text-left p-4 bg-app-bg border border-app-border/80 rounded-2xl hover:border-violet-200 hover:shadow-[0_4px_24px_rgba(139,92,246,0.08)] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden cursor-pointer"
                          >
                            <ExternalBadge />
                            <CardInner tool={tool} />
                          </button>
                        ) : (
                          <a
                            key={tool.id}
                            href={tool.href}
                            style={{
                              animationName: booted ? 'fadeInUp' : undefined,
                              animationDuration: booted ? '0.45s' : undefined,
                              animationTimingFunction: booted ? 'cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
                              animationFillMode: booted ? 'backwards' : undefined,
                              animationDelay: booted ? `${catIndex * 60 + index * 35 + 80}ms` : undefined,
                            }}
                            className="group relative block p-4 bg-app-bg border border-app-border/80 rounded-2xl hover:border-violet-200 hover:shadow-[0_4px_24px_rgba(139,92,246,0.08)] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
                          >
                            <CardInner tool={tool} />
                          </a>
                        )
                      })}
                  </div>
                </section>
              ))}
            </div>
          )}

          <div className="mt-16 text-center text-sm text-app-muted space-y-2">
            {searchKeyword.trim() ? (
              <p>搜索到 {filteredTools.length} 款工具</p>
            ) : (
              <p>目前 BitLeap 共有 {tools.length} 款工具</p>
            )}
            <p>更多工具正在开发中</p>
          </div>
        </div>
      </main>

      {/* ===== 移动端 ===== */}
      <div className="md:hidden px-4 py-16">
        <div
          style={{
            animationName: booted ? 'fadeInUp' : undefined,
            animationDuration: booted ? '0.5s' : undefined,
            animationTimingFunction: booted ? 'cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
            animationFillMode: booted ? 'backwards' : undefined,
          }}
          className="mb-10"
        >
          <div className="mb-4">
            <h2 className="text-xl font-bold tracking-tight text-app-text mb-1">
              <span className="bg-gradient-to-r from-violet-500 to-sky-400 bg-clip-text text-transparent">
                Bit工具箱
              </span>
            </h2>
            <p className="text-xs text-gray-500">
              {tools.length}+ 款纯前端工具 · 零上传 · 本地运行
            </p>
            <p className="text-xs text-gray-300">
              本站收录部分外部工具链接，跳转后请注意甄别，谨慎提交敏感信息
            </p>
          </div>

          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="搜索工具"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-app-border bg-app-bg focus:outline-none focus:ring-2 focus:ring-violet-200"
            />
            {searchKeyword && (
              <button onClick={() => setSearchKeyword('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                ✕
              </button>
            )}
          </div>
        </div>

        {filteredTools.length === 0 ? (
          <div className="py-16 text-center text-app-muted">
            <p>没有找到匹配工具</p>
          </div>
        ) : (
          <div className="space-y-12">
            {categories.map((category, catIndex) => (
              <section key={category} id={category}>
                <h2
                  style={{
                    animationName: booted ? 'fadeInLeft' : undefined,
                    animationDuration: booted ? '0.4s' : undefined,
                    animationTimingFunction: booted ? 'cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
                    animationFillMode: booted ? 'backwards' : undefined,
                    animationDelay: booted ? `${catIndex * 50}ms` : undefined,
                  }}
                  className="text-xl font-semibold tracking-tight mb-4 pb-2 border-b border-app-border"
                >
                  {category}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredTools
                    .filter((tool) => tool.category === category)
                    .map((tool, index) => {
                      const isExternal = (tool as any).target === '_blank'
                      return isExternal ? (
                        <button
                          key={tool.id}
                          onClick={() => handleExternalClick(tool)}
                          style={{
                            animationName: booted ? 'fadeInUp' : undefined,
                            animationDuration: booted ? '0.4s' : undefined,
                            animationTimingFunction: booted ? 'cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
                            animationFillMode: booted ? 'backwards' : undefined,
                            animationDelay: booted ? `${catIndex * 50 + index * 30 + 60}ms` : undefined,
                          }}
                          className="group w-full text-left block p-2.5 bg-app-bg border border-app-border rounded-xl hover:border-gray-300 hover:shadow-sm transition"
                        >
                          <div className="text-xl mb-2">{tool.icon}</div>
                          <h3 className="font-semibold text-base mb-1 group-hover:text-black">
                            {tool.title}
                          </h3>
                          <p className="text-xs text-gray-500 leading-snug">
                            {tool.description}
                          </p>
                        </button>
                      ) : (
                        <a
                          key={tool.id}
                          href={tool.href}
                          style={{
                            animationName: booted ? 'fadeInUp' : undefined,
                            animationDuration: booted ? '0.4s' : undefined,
                            animationTimingFunction: booted ? 'cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
                            animationFillMode: booted ? 'backwards' : undefined,
                            animationDelay: booted ? `${catIndex * 50 + index * 30 + 60}ms` : undefined,
                          }}
                          className="group block p-2.5 bg-app-bg border border-app-border rounded-xl hover:border-gray-300 hover:shadow-sm transition"
                        >
                          <div className="text-xl mb-2">{tool.icon}</div>
                          <h3 className="font-semibold text-base mb-1 group-hover:text-black">
                            {tool.title}
                          </h3>
                          <p className="text-xs text-gray-500 leading-snug">
                            {tool.description}
                          </p>
                        </a>
                      )
                    })}
                </div>
              </section>
            ))}
          </div>
        )}

        <div className="mt-16 text-center text-sm text-app-muted space-y-2">
          {searchKeyword.trim() ? (
            <p>搜索到 {filteredTools.length} 款工具</p>
          ) : (
            <p>目前 BitLeap 共有 {tools.length} 款工具</p>
          )}
          <p>更多工具正在开发中 →</p>
        </div>
      </div>

      {/* Modal */}
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

/* 卡片内部 JSX */
function CardInner({ tool }: { tool: (typeof tools)[0] }) {
  return (
    <>
      <div className="absolute -top-8 -left-8 w-24 h-24 rounded-full bg-violet-100/50 blur-2xl group-hover:bg-violet-200/60 group-hover:scale-125 transition-all duration-500 pointer-events-none" />
      <div className="absolute -bottom-8 -right-8 w-20 h-20 rounded-full bg-sky-50/60 blur-2xl group-hover:bg-sky-100/70 group-hover:scale-125 transition-all duration-500 pointer-events-none" />
      <span className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-violet-500 group-hover:w-12 transition-all duration-300 rounded-full" />
      <div className="relative text-2xl mb-2.5 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-1 origin-left">
        {tool.icon}
      </div>
      <h3 className="relative font-semibold text-sm text-app-text mb-1.5 inline-block">
        <span className="bg-[length:0%_1px] bg-no-repeat bg-left-bottom bg-gradient-to-r from-violet-500 to-violet-500 group-hover:bg-[length:100%_1px] transition-all duration-300">
          {tool.title}
        </span>
      </h3>
      <p className="relative text-xs text-gray-500 leading-relaxed line-clamp-2 mt-1">
        {tool.description}
      </p>
    </>
  )
}

/* 外链角标 */
function ExternalBadge() {
  return (
    <span className="absolute top-2.5 right-2.5 z-10 text-[10px] px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
      外链 ↗
    </span>
  )
}