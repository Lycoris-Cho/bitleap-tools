"use client"

import { useState, useMemo, useEffect } from 'react'
import { tools } from './tools'
import { icons } from 'lucide-react'
import ExternalLinkModal from '@/components/ExternalLinkModal'

/* 热门搜索标签 */
const HOT_TAGS = ['CSS', '图片压缩', '配色', '解码', 'JSON', '二维码']

/* 分类 emoji */
const CATEGORY_EMOJI: Record<string, string> = {
  '文本工具': '📝',
  '开发辅助': '🛠️',
  'CSS 工具': '🎨',
  '媒体工具': '🖼️',
  '测试工具': '🧪',
  '灵感与API': '💡',
  '趣味工具': '🎮',
  '前端实验': '🔬',
  '日常工具': '📅',
  '资源导航': '🗂️',
}

/* 随机色板池 */
const ICON_COLORS = [
  { bg: 'bg-emerald-50', text: 'text-emerald-500' },
  { bg: 'bg-violet-50',  text: 'text-violet-500' },
  { bg: 'bg-pink-50',    text: 'text-pink-500' },
  { bg: 'bg-sky-50',     text: 'text-sky-500' },
  { bg: 'bg-orange-50',  text: 'text-orange-500' },
  { bg: 'bg-rose-50',    text: 'text-rose-500' },
  { bg: 'bg-cyan-50',    text: 'text-cyan-500' },
  { bg: 'bg-teal-50',    text: 'text-teal-500' },
  { bg: 'bg-indigo-50',  text: 'text-indigo-500' },
  { bg: 'bg-amber-50',   text: 'text-amber-500' },
  { bg: 'bg-lime-50',    text: 'text-lime-500' },
  { bg: 'bg-fuchsia-50', text: 'text-fuchsia-500' },
]

/* 用 id 做 seed 取稳定随机色 */
function getColorFromId(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return ICON_COLORS[Math.abs(hash) % ICON_COLORS.length]
}

export default function HomePage() {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [booted, setBooted] = useState(false)
  const [pendingLink, setPendingLink] = useState<{ href: string; title: string } | null>(null)

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

  const handleExternalClick = (tool: (typeof tools)[0]) => {
    setPendingLink({ href: tool.href, title: tool.title })
  }

  const confirmExternal = () => {
    if (pendingLink) {
      window.open(pendingLink.href, '_blank', 'noopener,noreferrer')
      setPendingLink(null)
    }
  }

  const handleTagClick = (tag: string) => {
    setSearchKeyword(tag)
    document.getElementById('search-input')?.focus()
  }

  const scrollToTools = () => {
    const el = document.getElementById('tools-start')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
            <h1 className="text-lg font-bold tracking-tight text-app-text">工具目录</h1>
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
          {categories.map((category, index) => (
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
              className="block px-3 py-2 rounded-xl text-sm text-gray-700 hover:bg-app-bg hover:shadow-sm transition"
            >
              {CATEGORY_EMOJI[category] ?? '🔧'} {category}
            </a>
          ))}
        </nav>

        <div className="px-6 py-4 border-t border-app-border text-xs text-app-muted">
          更多工具正在开发中 →
        </div>
      </aside>

      {/* ===== 右侧内容区 ===== */}
      <main className="fixed top-16 left-56 right-0 h-[calc(100vh-4rem)] overflow-y-auto hidden md:block">
        <div className="w-full px-6 py-8">

          {/* ============ Hero 区 ============ */}
          <section
            style={{
              animationName: booted ? 'fadeInUp' : undefined,
              animationDuration: booted ? '0.6s' : undefined,
              animationTimingFunction: booted ? 'cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
              animationFillMode: booted ? 'backwards' : undefined,
            }}
            className="relative overflow-hidden rounded-3xl border border-app-border bg-app-bg mb-10"
          >
            <div className="pointer-events-none absolute -top-20 -left-10 w-72 h-72 rounded-full bg-violet-300/30 blur-3xl animate-pulse" />
            <div className="pointer-events-none absolute top-10 right-0 w-64 h-64 rounded-full bg-sky-300/25 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="pointer-events-none absolute -bottom-16 left-1/3 w-56 h-56 rounded-full bg-pink-300/20 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

            <div
              className="pointer-events-none absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  'linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }}
            />

            <div className="relative px-10 py-14">
              <h1 className="text-5xl font-extrabold tracking-tight mb-3">
                <span className="bg-gradient-to-r from-violet-600 via-sky-500 to-cyan-400 bg-clip-text text-transparent">
                  BitLeap
                </span>
              </h1>
              <p className="text-xl font-medium text-app-text/80 mb-2">
                Tiny tools, big leap.
              </p>
              <p className="text-sm text-app-muted mb-8 max-w-md">
                精选小工具集合，所有计算均在浏览器本地完成，开箱即用，安全高效。
              </p>

              <div className="flex items-center gap-3 max-w-2xl mb-5">
                <div className="relative flex-1">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    id="search-input"
                    type="text"
                    placeholder="搜索工具… 名称 / 描述 / 分类"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="w-full pl-4 pr-4 py-3 rounded-xl border border-app-border bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition text-sm"
                  />
                  {searchKeyword && (
                    <button onClick={() => setSearchKeyword('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      ✕
                    </button>
                  )}
                </div>
                <button
                  onClick={scrollToTools}
                  className="shrink-0 px-6 py-3 rounded-xl bg-black text-white text-sm font-medium hover:bg-gray-800 active:scale-[0.98] transition-all shadow-lg shadow-black/10"
                >
                  全部工具
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-app-muted">热门：</span>
                {HOT_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleTagClick(tag)}
                    className="px-3 py-1 rounded-full text-xs border border-app-border bg-white/50 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-600 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ============ 工具列表 ============ */}
          <div id="tools-start">
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
                      {CATEGORY_EMOJI[category] ?? '🔧'} {category}
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
          </div>

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
        <section
          style={{
            animationName: booted ? 'fadeInUp' : undefined,
            animationDuration: booted ? '0.5s' : undefined,
            animationTimingFunction: booted ? 'cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
            animationFillMode: booted ? 'backwards' : undefined,
          }}
          className="relative overflow-hidden rounded-2xl border border-app-border bg-app-bg mb-8"
        >
          <div className="pointer-events-none absolute -top-10 -left-10 w-40 h-40 rounded-full bg-violet-300/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-8 right-0 w-36 h-36 rounded-full bg-sky-300/25 blur-3xl" />

          <div className="relative px-6 py-10 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight mb-2">
              <span className="bg-gradient-to-r from-violet-600 via-sky-500 to-cyan-400 bg-clip-text text-transparent">
                BitLeap
              </span>
            </h1>
            <p className="text-base font-medium text-app-text/80 mb-1">Tiny tools, big leap.</p>
            <p className="text-xs text-app-muted mb-6">精选小工具，本地运行，安全高效</p>

            <div className="relative mb-4">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                id="search-input-mobile"
                type="text"
                placeholder="搜索工具"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-app-border bg-white/70 focus:outline-none focus:ring-2 focus:ring-violet-200 text-sm"
              />
              {searchKeyword && (
                <button onClick={() => setSearchKeyword('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 flex-wrap">
              {HOT_TAGS.slice(0, 4).map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className="px-2.5 py-1 rounded-full text-xs border border-app-border bg-white/50 hover:bg-violet-50 hover:text-violet-600 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </section>

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
                  {CATEGORY_EMOJI[category] ?? '🔧'} {category}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredTools
                    .filter((tool) => tool.category === category)
                    .map((tool, index) => {
                      const isExternal = (tool as any).target === '_blank'
                      const colors = getColorFromId(tool.id)
                      const Icon = icons[tool.icon as keyof typeof icons]

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
                          <div className="mb-2">
                            <div className={`w-9 h-9 rounded-lg ${colors.bg} flex items-center justify-center`}>
                              {Icon && <Icon className={`w-5 h-5 ${colors.text}`} />}
                            </div>
                          </div>
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
                          <div className="mb-2">
                            <div className={`w-9 h-9 rounded-lg ${colors.bg} flex items-center justify-center`}>
                              {Icon && <Icon className={`w-5 h-5 ${colors.text}`} />}
                            </div>
                          </div>
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

/* ===== 卡片内部 ===== */
function CardInner({ tool }: { tool: (typeof tools)[0] }) {
  const Icon = icons[tool.icon as keyof typeof icons]
  const colors = getColorFromId(tool.id)

  if (!Icon) return null

  return (
    <>
      <div className={`absolute -top-8 -left-8 w-24 h-24 rounded-full blur-2xl group-hover:scale-125 transition-all duration-500 pointer-events-none opacity-50 group-hover:opacity-60 ${colors.bg}`} />
      <div className={`absolute -bottom-8 -right-8 w-20 h-20 rounded-full blur-2xl group-hover:scale-125 transition-all duration-500 pointer-events-none opacity-50 group-hover:opacity-60 ${colors.bg}`} />
      <span className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-violet-500 group-hover:w-12 transition-all duration-300 rounded-full" />
      <div className="relative mb-2.5 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-1 origin-left">
        <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${colors.text}`} />
        </div>
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

function ExternalBadge() {
  return (
    <span className="absolute top-2.5 right-2.5 z-10 text-[10px] px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
      外链 ↗
    </span>
  )
}