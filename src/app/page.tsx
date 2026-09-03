"use client"

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { icons } from "lucide-react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

import { tools } from "./tools"
import ExternalLinkModal from "@/components/ExternalLinkModal"

/* 热门搜索标签 */
const HOT_TAGS = ["CSS", "图片压缩", "配色", "解码", "JSON", "二维码"]

/* 分类 emoji：保留，但在新版中降低存在感 */
const CATEGORY_EMOJI: Record<string, string> = {
  文本工具: "📝",
  开发辅助: "🛠️",
  "CSS 工具": "🎨",
  媒体工具: "🖼️",
  测试工具: "🧪",
  "灵感与API": "💡",
  趣味工具: "🎮",
  前端实验: "🔬",
  日常工具: "📅",
  资源导航: "🗂️",
  心迹: "♥️",
}

/* 收敛到 4 个品牌色，和 Community 页面统一 */
const ICON_COLORS = [
  {
    bg: "bg-violet-50",
    text: "text-violet-500",
    glow: "bg-violet-300/25",
    border: "group-hover:border-violet-200",
  },
  {
    bg: "bg-sky-50",
    text: "text-sky-500",
    glow: "bg-sky-300/25",
    border: "group-hover:border-sky-200",
  },
  {
    bg: "bg-orange-50",
    text: "text-orange-500",
    glow: "bg-orange-300/25",
    border: "group-hover:border-orange-200",
  },
  {
    bg: "bg-emerald-50",
    text: "text-emerald-500",
    glow: "bg-emerald-300/25",
    border: "group-hover:border-emerald-200",
  },
]

function getColorFromId(id: string) {
  let hash = 0

  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }

  return ICON_COLORS[Math.abs(hash) % ICON_COLORS.length]
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.4-3.4" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  )
}

function ArrowUpRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M7 17 17 7" />
      <path d="M7 7h10v10" />
    </svg>
  )
}

export default function HomePage() {
  const rootRef = useRef<HTMLDivElement>(null)

  const [searchKeyword, setSearchKeyword] = useState("")
  const [pendingLink, setPendingLink] = useState<{
    href: string
    title: string
  } | null>(null)

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        document.getElementById("search-input")?.focus()
      }

      if (event.key === "Escape" && searchKeyword) {
        setSearchKeyword("")
      }
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [searchKeyword])

  const filteredTools = useMemo(() => {
    if (!searchKeyword.trim()) return tools

    const keyword = searchKeyword.toLowerCase().trim()

    return tools.filter(
      (tool) =>
        tool.title.toLowerCase().includes(keyword) ||
        tool.description.toLowerCase().includes(keyword) ||
        tool.category.toLowerCase().includes(keyword),
    )
  }, [searchKeyword])

  const categories = useMemo(
    () => Array.from(new Set(filteredTools.map((tool) => tool.category))),
    [filteredTools],
  )

  const allCategories = useMemo(
    () => Array.from(new Set(tools.map((tool) => tool.category))),
    [],
  )

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches

    if (reduceMotion) return

    const ctx = gsap.context(() => {
      const intro = gsap.timeline({
        defaults: {
          ease: "power4.out",
        },
      })

      intro
        .from(".home-kicker", {
          y: 12,
          opacity: 0,
          duration: 0.42,
        })
        .from(
          ".home-title-line",
          {
            y: 48,
            opacity: 0,
            rotate: 1.2,
            duration: 0.78,
            stagger: 0.07,
          },
          "-=0.15",
        )
        .from(
          ".home-copy",
          {
            y: 18,
            opacity: 0,
            duration: 0.48,
          },
          "-=0.38",
        )
        .from(
          ".home-search",
          {
            y: 20,
            opacity: 0,
            scale: 0.985,
            duration: 0.55,
          },
          "-=0.34",
        )
        .from(
          ".home-stat",
          {
            y: 16,
            opacity: 0,
            duration: 0.45,
            stagger: 0.055,
          },
          "-=0.32",
        )

      gsap.to(".home-orb-a", {
        x: 44,
        y: 28,
        duration: 15,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      })

      gsap.to(".home-orb-b", {
        x: -40,
        y: 48,
        duration: 19,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      })

      gsap.to(".home-orbit", {
        rotate: 360,
        duration: 42,
        repeat: -1,
        ease: "none",
      })
    }, rootRef)

    requestAnimationFrame(() => ScrollTrigger.refresh())

    return () => ctx.revert()
  }, [])

  // 分类标题 / CTA 的滚动动画。
  // 只在分类结构发生变化时重建，不会影响 Hero 和搜索框。
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches

    if (reduceMotion || !rootRef.current) return

    const ctx = gsap.context(() => {
      gsap.utils
        .toArray<HTMLElement>(".section-reveal")
        .forEach((element) => {
          const tween = gsap.fromTo(
            element,
            {
              y: 48,
              opacity: 0,
            },
            {
              y: 0,
              opacity: 1,
              duration: 0.72,
              ease: "power4.out",
              paused: true,
            },
          )

          ScrollTrigger.create({
            trigger: element,
            start: "top 94%",
            animation: tween,
            toggleActions: "play none none reverse",
          })
        })
    }, rootRef)

    requestAnimationFrame(() => ScrollTrigger.refresh())

    return () => ctx.revert()
  }, [categories.join("|")])

  // 工具卡片动画：统一由 ScrollTrigger 管理。
  // 搜索不会绕开 ScrollTrigger，因此上下滚动都会有进入/退出动画。
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches

    if (reduceMotion || !rootRef.current) return

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>(".tool-card-shell")

      cards.forEach((card, index) => {
        const direction = index % 2 === 0 ? -1 : 1

        const tween = gsap.fromTo(
          card,
          {
            y: 56,
            x: direction * 14,
            rotate: direction * 1,
            scale: 0.96,
            opacity: 0,
          },
          {
            y: 0,
            x: 0,
            rotate: 0,
            scale: 1,
            opacity: 1,
            duration: searchKeyword ? 0.5 : 0.72,
            ease: searchKeyword ? "back.out(1.25)" : "power4.out",
            paused: true,
          },
        )

        ScrollTrigger.create({
          trigger: card,
          start: "top 92%",
          animation: tween,
          toggleActions: "play none none reverse",
        })
      })
    }, rootRef)

    requestAnimationFrame(() => ScrollTrigger.refresh())

    return () => ctx.revert()
  }, [searchKeyword, filteredTools.length])

  const handleExternalClick = (tool: (typeof tools)[0]) => {
    setPendingLink({
      href: tool.href,
      title: tool.title,
    })
  }

  const confirmExternal = () => {
    if (!pendingLink) return

    window.open(pendingLink.href, "_blank", "noopener,noreferrer")
    setPendingLink(null)
  }

  const handleTagClick = (tag: string) => {
    setSearchKeyword(tag)
    document.getElementById("search-input")?.focus()
  }

  const scrollToTools = () => {
    document.getElementById("tools-start")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  }

  return (
    <div
      ref={rootRef}
      className="relative min-h-screen overflow-x-hidden bg-[#f7f7f5] text-[#151515]"
    >
      {/* 背景氛围 */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="home-orb-a absolute -left-[18rem] -top-[18rem] h-[44rem] w-[44rem] rounded-full bg-violet-200/30 blur-[150px]" />
        <div className="home-orb-b absolute -right-[18rem] top-[12%] h-[42rem] w-[42rem] rounded-full bg-sky-200/28 blur-[150px]" />
        <div className="absolute bottom-[-18rem] left-[30%] h-[38rem] w-[38rem] rounded-full bg-orange-100/50 blur-[150px]" />
      </div>

      {/* 桌面端侧边栏 */}
      <aside className="fixed bottom-0 left-0 top-16 z-40 hidden w-56 border-r border-black/[0.06] bg-[#f7f7f5]/86 backdrop-blur-xl md:flex md:flex-col">
        <div className="px-5 pb-5 pt-7">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[9px] uppercase tracking-[0.25em] text-zinc-400">
                BitLeap / Index
              </div>
              <div className="mt-2 text-xl font-medium tracking-[-0.04em]">
                工具目录
              </div>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.07] bg-white text-xs text-zinc-500 shadow-sm">
              {tools.length}
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {allCategories.map((category, index) => (
            <a
              key={category}
              href={`#${category}`}
              className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-zinc-500 transition duration-300 hover:bg-white hover:text-zinc-950 hover:shadow-[0_14px_35px_-28px_rgba(0,0,0,.35)]"
            >
              <span className="w-5 text-[9px] tabular-nums text-zinc-300 transition group-hover:text-zinc-500">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-200 transition group-hover:bg-violet-500" />
              <span className="truncate">{category}</span>
            </a>
          ))}
        </nav>

        <div className="border-t border-black/[0.06] px-5 py-5">
          <div className="text-[9px] uppercase tracking-[0.22em] text-zinc-300">
            Built for daily use
          </div>
          <p className="mt-2 text-xs leading-5 text-zinc-400">
            Tiny tools, big leap.
          </p>
        </div>
      </aside>

      {/* 主内容 */}
      <main className="relative z-10 px-1.5 pb-20 pt-[1.8rem] sm:px-2 md:ml-56 lg:px-2">
        <div className="w-full max-w-none">
          {/* HERO */}
          <section className="relative overflow-hidden rounded-[36px_16px_36px_36px] border border-black/[0.06] bg-white px-5 py-4 shadow-[0_36px_110px_-72px_rgba(20,20,30,.28)] sm:px-6 sm:py-4 lg:px-8 lg:py-4">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -right-36 -top-44 h-[36rem] w-[36rem] rounded-full bg-violet-100 blur-[95px]" />
              <div className="absolute -bottom-52 left-[18%] h-[32rem] w-[32rem] rounded-full bg-sky-100/80 blur-[105px]" />
              <div className="absolute bottom-[7%] right-[7%] h-[17rem] w-[17rem] rounded-full bg-orange-100 blur-[78px]" />

              <div className="home-orbit absolute -right-24 -top-28 h-[460px] w-[460px] rounded-full border border-violet-500/10">
                <span className="absolute left-[14%] top-[15%] h-2.5 w-2.5 rounded-full bg-violet-500" />
              </div>

              <div className="absolute inset-0 opacity-[0.025] [background-image:linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] [background-size:34px_34px]" />
            </div>

            <div className="relative flex flex-col">
              <div className="home-kicker flex items-center justify-between gap-6">
                <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.28em] text-zinc-400">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  Local-first utility lab
                </div>

                <div className="hidden items-center gap-5 text-[9px] uppercase tracking-[0.18em] text-zinc-300 sm:flex">
                  <span>{tools.length} tools</span>
                  <span>{allCategories.length} categories</span>
                </div>
              </div>

              <div className="mt-3 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end lg:gap-9">
                <div className="flex flex-col justify-between">
                  <div>
                    <div className="overflow-visible pb-1 pt-0.5">
                      <h1 className="home-title-line text-[clamp(2.65rem,5.05vw,5.15rem)] font-medium leading-[1.12] tracking-[-0.085em] text-zinc-950">
                        BitLeap
                      </h1>
                    </div>

                    <div className="mt-2 flex items-center gap-3 pl-[7%]">
                      <span className="h-px w-12 bg-zinc-300 sm:w-20" />
                      <div className="overflow-visible py-0.5">
                        <div className="home-title-line text-[clamp(1.05rem,1.75vw,1.7rem)] font-medium leading-[1.2] tracking-[-0.05em] text-zinc-900">
                          Tiny tools,
                        </div>
                      </div>
                    </div>

                    <div className="overflow-visible pl-[1.5%] pt-0.5 pb-0">
                      <div className="home-title-line block w-fit overflow-visible pb-[0.26em] pr-[0.06em] bg-gradient-to-r from-violet-500 via-fuchsia-400 to-sky-400 bg-clip-text text-[clamp(2.35rem,4.25vw,4.25rem)] font-medium leading-[1.2] tracking-[-0.055em] text-transparent">
                        big leap.
                      </div>
                    </div>

                    <p className="home-copy -mt-1 max-w-xl text-[12px] leading-5 text-zinc-500 sm:text-[15px]">
                      一组真正为了日常使用而做的小工具。
                      <br className="hidden sm:block" />
                      尽量本地运行、无需注册、打开就能用。
                    </p>
                  </div>

                  {/* 搜索主入口 */}
                  <div className="home-search mt-2 max-w-3xl">
                    <div className="group relative rounded-[24px_10px_24px_24px] border border-black/[0.08] bg-white/92 p-2 shadow-[0_24px_70px_-42px_rgba(15,23,42,.35)] backdrop-blur-xl transition duration-300 focus-within:border-violet-200 focus-within:shadow-[0_28px_80px_-40px_rgba(124,58,237,.24)]">
                      <div className="flex items-center">
                        <div className="ml-3 text-zinc-400">
                          <SearchIcon />
                        </div>

                        <input
                          id="search-input"
                          type="text"
                          placeholder="搜索工具、功能或分类…"
                          value={searchKeyword}
                          onChange={(event) =>
                            setSearchKeyword(event.target.value)
                          }
                          className="h-11 min-w-0 flex-1 bg-transparent px-4 text-sm text-zinc-900 outline-none placeholder:text-zinc-300 sm:text-base"
                        />

                        {searchKeyword ? (
                          <button
                            type="button"
                            onClick={() => setSearchKeyword("")}
                            className="mr-2 flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-sm text-zinc-400 transition hover:bg-black hover:text-white"
                            aria-label="清空搜索"
                          >
                            ×
                          </button>
                        ) : (
                          <div className="mr-2 hidden rounded-lg border border-black/[0.07] bg-zinc-50 px-2.5 py-1.5 text-[10px] text-zinc-400 sm:block">
                            Ctrl / ⌘ K
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="mr-1 text-[10px] uppercase tracking-[0.2em] text-zinc-300">
                        Popular
                      </span>

                      {HOT_TAGS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleTagClick(tag)}
                          className="rounded-full border border-black/[0.06] bg-white/75 px-3 py-1.5 text-[11px] text-zinc-500 transition duration-300 hover:-translate-y-0.5 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-600"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Hero 右侧数据与入口 */}
                <div className="border-l border-black/[0.07] pl-0 lg:pl-6">
                  <div className="text-[9px] uppercase tracking-[0.24em] text-zinc-400">
                    Utility index
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-2 lg:grid-cols-1">
                    <div className="home-stat border-t border-black/[0.07] pt-2.5">
                      <div className="text-2xl font-medium tracking-[-0.05em]">
                        {String(tools.length).padStart(2, "0")}
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                        Tools
                      </div>
                    </div>

                    <div className="home-stat border-t border-black/[0.07] pt-2.5">
                      <div className="text-2xl font-medium tracking-[-0.05em]">
                        {String(allCategories.length).padStart(2, "0")}
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                        Categories
                      </div>
                    </div>

                    <div className="home-stat border-t border-black/[0.07] pt-2.5">
                      <div className="text-2xl font-medium tracking-[-0.05em]">
                        100%
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                        Browser first
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={scrollToTools}
                    className="home-stat group mt-3 flex h-10 items-center gap-6 rounded-full bg-[#171717] py-2 pl-5 pr-2 text-sm font-medium text-white shadow-[0_18px_40px_-22px_rgba(0,0,0,.55)]"
                  >
                    浏览全部工具
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-black transition-transform duration-300 group-hover:translate-x-1">
                      <ArrowIcon />
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* 工具列表 */}
          <div id="tools-start" className="scroll-mt-20 pt-5">
            {filteredTools.length === 0 ? (
              <div className="section-reveal relative overflow-hidden rounded-[42px_14px_42px_42px] border border-black/[0.06] bg-white px-7 py-16 text-center shadow-[0_28px_90px_-70px_rgba(0,0,0,.3)]">
                <div className="text-[10px] uppercase tracking-[0.24em] text-zinc-300">
                  Search / 00
                </div>
                <h2 className="mt-5 text-4xl font-medium tracking-[-0.05em]">
                  没有找到匹配的工具
                </h2>
                <p className="mt-3 text-sm text-zinc-400">
                  换一个关键词试试看。
                </p>
              </div>
            ) : (
              <div className="space-y-16">
                {categories.map((category, catIndex) => {
                  const categoryTools = filteredTools.filter(
                    (tool) => tool.category === category,
                  )

                  return (
                    <section
                      key={category}
                      id={category}
                      className="scroll-mt-24"
                    >
                      <div className="section-reveal mb-7 flex flex-col gap-5 border-b border-black/[0.07] pb-6 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                          <div className="flex items-center gap-3 text-[9px] uppercase tracking-[0.24em] text-zinc-400">
                            <span className="text-violet-500">
                              {String(catIndex + 1).padStart(2, "0")}
                            </span>
                            <span>/</span>
                            <span>Tool collection</span>
                          </div>

                          <h2 className="mt-3 text-3xl font-medium tracking-[-0.05em] sm:text-4xl">
                            {category}
                          </h2>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-zinc-400">
                          <span>{CATEGORY_EMOJI[category] ?? "🔧"}</span>
                          <span>{categoryTools.length} tools</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                        {categoryTools.map((tool, index) => {
                          const isExternal =
                            (tool as any).target === "_blank"

                          return (
                            <div
                              key={tool.id}
                              className="tool-card-shell flex min-h-[108px]"
                            >
                              {isExternal ? (
                                <button
                                  type="button"
                                  onClick={() => handleExternalClick(tool)}
                                  className="group relative flex min-h-full w-full flex-col overflow-hidden rounded-[24px] border border-black/[0.07] bg-white p-2.5 text-left shadow-[0_18px_55px_-45px_rgba(15,23,42,.28)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_70px_-42px_rgba(15,23,42,.34)]"
                                >
                                  <ExternalBadge />
                                  <CardInner tool={tool} index={index} />
                                </button>
                              ) : (
                                <a
                                  href={tool.href}
                                  className="group relative flex min-h-full w-full flex-col overflow-hidden rounded-[24px] border border-black/[0.07] bg-white p-2.5 text-inherit shadow-[0_18px_55px_-45px_rgba(15,23,42,.28)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_70px_-42px_rgba(15,23,42,.34)]"
                                >
                                  <CardInner tool={tool} index={index} />
                                </a>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </section>
                  )
                })}
              </div>
            )}
          </div>

          {/* 底部 CTA */}
          <section className="section-reveal relative mt-28 overflow-hidden rounded-[48px_18px_48px_48px] bg-[#171717] px-7 py-12 text-white sm:px-10 sm:py-16 lg:px-14 lg:py-20">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -right-28 -top-28 h-96 w-96 rounded-full bg-violet-500/20 blur-[95px]" />
              <div className="absolute bottom-[-150px] left-[20%] h-80 w-80 rounded-full bg-sky-500/10 blur-[95px]" />
              <div className="absolute right-[10%] top-[12%] h-52 w-52 rounded-full border border-white/[0.07]" />
            </div>

            <div className="relative flex flex-col gap-12 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-[9px] uppercase tracking-[0.28em] text-zinc-600">
                  BitLeap / Keep building
                </div>

                <h2 className="mt-14 max-w-4xl text-4xl font-medium leading-[0.96] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
                  More tiny tools,
                  <br />
                  <span className="text-zinc-500">one useful leap at a time.</span>
                </h2>

                <p className="mt-7 max-w-xl text-sm leading-7 text-zinc-500">
                  {searchKeyword.trim()
                    ? `当前搜索到 ${filteredTools.length} 款工具。`
                    : `目前 BitLeap 已收录 ${tools.length} 款工具。`}
                  更多真正有用的小功能，还会继续往这里放。
                </p>
              </div>

              <a
                href="/community"
                className="group flex h-13 w-fit items-center gap-7 rounded-full bg-white py-2 pl-5 pr-2 text-sm font-medium text-black"
              >
                去 Community
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white transition-transform duration-300 group-hover:translate-x-1">
                  <ArrowUpRightIcon />
                </span>
              </a>
            </div>
          </section>
        </div>
      </main>

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

/* 工具卡片内部 */
function CardInner({
  tool,
  index,
}: {
  tool: (typeof tools)[0]
  index: number
}) {
  const Icon = icons[tool.icon as keyof typeof icons]
  const colors = getColorFromId(tool.id)

  if (!Icon) return null

  return (
    <>
      <div
        className={`pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full ${colors.glow} blur-[55px] transition duration-500 group-hover:scale-125`}
      />
      <div
        className={`pointer-events-none absolute -bottom-16 -left-14 h-36 w-36 rounded-full ${colors.glow} opacity-0 blur-[55px] transition duration-500 group-hover:opacity-80`}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${colors.bg} transition duration-300 group-hover:rotate-[-4deg] group-hover:scale-110`}
        >
          <Icon className={`h-4 w-4 ${colors.text}`} />
        </div>

        <span className="text-[9px] uppercase tracking-[0.18em] text-zinc-300">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      <div className="relative mt-auto pt-2">
        <h3 className="text-[14px] font-semibold tracking-[-0.025em] text-zinc-900">
          {tool.title}
        </h3>

        <p className="mt-1.5 line-clamp-2 text-[10px] leading-[1.5] text-zinc-500">
          {tool.description}
        </p>

        <div className="mt-2 flex items-center justify-between border-t border-black/[0.06] pt-3">
          <span className="text-[9px] uppercase tracking-[0.18em] text-zinc-300">
            {tool.category}
          </span>

          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-black/[0.07] bg-white text-zinc-500 transition duration-300 group-hover:rotate-[-8deg] group-hover:bg-black group-hover:text-white">
            <ArrowUpRightIcon />
          </span>
        </div>
      </div>
    </>
  )
}

function ExternalBadge() {
  return (
    <span className="absolute right-3 top-3 z-10 rounded-full border border-violet-100 bg-violet-50 px-2 py-1 text-[9px] font-medium uppercase tracking-[0.12em] text-violet-500 opacity-0 transition duration-300 group-hover:opacity-100">
      External ↗
    </span>
  )
}
