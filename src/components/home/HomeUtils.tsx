"use client"

/*
 * 首页的「小工具行为层」：收藏、最近打开、分类滚动高亮、外链二次确认。
 *
 * 和 HomeSearch 一样是零 props 的客户端小岛，所有数据都从已经渲染好的卡片 DOM 上读，
 * 因此 116 张卡片本身仍然是服务器渲染的静态 HTML —— 这也保证了在没有 JS 的情况下
 * 卡片依然是原生链接，点得动。
 *
 * 收藏用的星标是 <span>（不是 <button>），避免出现按钮嵌在 <a> 里的非法结构；
 * 没有 JS 时点星标会顺带进入该工具，属于可接受的降级，而不是一个死区。
 */

import { useCallback, useEffect, useState } from "react"

type MiniTool = { id: string; title: string; href: string; svg: string }

const FAV_KEY = "bl.home.fav"
const RECENT_KEY = "bl.home.recent"

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* 忽略 */
  }
}

function cardOf(id: string): MiniTool | null {
  const el = document.querySelector<HTMLElement>(
    `.tool-card-shell[data-id="${CSS.escape(id)}"]`,
  )
  if (!el) return null
  const link = el.querySelector<HTMLAnchorElement>("a[href]")
  return {
    id,
    title: el.dataset.title || id,
    href: link?.getAttribute("href") || "",
    svg: el.querySelector("svg")?.outerHTML || "",
  }
}

export default function HomeUtils() {
  const [favorites, setFavorites] = useState<string[]>([])
  const [recent, setRecent] = useState<string[]>([])
  const [pending, setPending] = useState<MiniTool | null>(null)
  const [ready, setReady] = useState(false)

  const paint = useCallback((ids: string[]) => {
    document.querySelectorAll<HTMLElement>("[data-fav]").forEach((el) => {
      const on = ids.includes(el.dataset.fav || "")
      el.classList.toggle("is-fav", on)
      el.setAttribute("aria-pressed", on ? "true" : "false")
    })
  }, [])

  useEffect(() => {
    const favs = read<string[]>(FAV_KEY, [])
    setFavorites(favs)
    setRecent(read<string[]>(RECENT_KEY, []))
    paint(favs)
    setReady(true)

    /* 点击任意卡片都记一笔「最近打开」 */
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement

      const favEl = target.closest<HTMLElement>("[data-fav]")
      if (favEl) {
        /* 星标：拦下跳转，只切收藏 */
        e.preventDefault()
        e.stopPropagation()
        const id = favEl.dataset.fav || ""
        setFavorites((prev) => {
          const next = prev.includes(id)
            ? prev.filter((x) => x !== id)
            : [id, ...prev]
          write(FAV_KEY, next)
          paint(next)
          return next
        })
        return
      }

      const ext = target.closest<HTMLAnchorElement>("a[data-ext]")
      if (ext) {
        e.preventDefault()
        const id = ext.closest<HTMLElement>(".tool-card-shell")?.dataset.id || ""
        const tool = cardOf(id)
        if (tool) setPending(tool)
        return
      }

      const link = target.closest<HTMLAnchorElement>("a[href^='/tools/']")
      if (link) {
        const id = link.closest<HTMLElement>(".tool-card-shell")?.dataset.id
        if (id) {
          const next = [id, ...read<string[]>(RECENT_KEY, []).filter((x) => x !== id)].slice(0, 10)
          write(RECENT_KEY, next)
          setRecent(next)
        }
      }
    }

    const onOpened = (e: Event) => {
      const id = (e as CustomEvent<string>).detail
      if (!id) return
      const next = [id, ...read<string[]>(RECENT_KEY, []).filter((x) => x !== id)].slice(0, 10)
      write(RECENT_KEY, next)
      setRecent(next)
    }

    document.addEventListener("click", onClick, true)
    window.addEventListener("bl:opened", onOpened)
    return () => {
      document.removeEventListener("click", onClick, true)
      window.removeEventListener("bl:opened", onOpened)
    }
  }, [paint])

  /* 分类滚动高亮：驱动侧栏与分类条的当前项 */
  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-cat-section]"),
    )
    if (!sections.length) return
    const spy = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const index = sections.indexOf(entry.target as HTMLElement)
          document.querySelectorAll("[data-cat-link]").forEach((el) => {
            el.classList.toggle(
              "is-current",
              Number((el as HTMLElement).dataset.catLink) === index,
            )
          })
        }
      },
      { rootMargin: "-72px 0px -68% 0px", threshold: 0 },
    )
    sections.forEach((s) => spy.observe(s))
    return () => spy.disconnect()
  }, [])

  const items: MiniTool[] = (() => {
    if (!ready) return []
    const favs = favorites.map(cardOf).filter(Boolean) as MiniTool[]
    const recs = recent
      .filter((id) => !favorites.includes(id))
      .map(cardOf)
      .filter(Boolean) as MiniTool[]
    return [...favs.slice(0, 8), ...recs.slice(0, 6)]
  })()

  const hasFav = favorites.length > 0

  return (
    <>
      {ready && items.length > 0 && (
        <section className="mt-4">
          <div className="mb-2.5 flex items-baseline justify-between px-1">
            <div className="text-[13px] font-semibold tracking-[-0.02em]">
              {hasFav ? "常用与最近" : "最近打开"}
            </div>
            <div className="text-[11px] text-zinc-400">
              点卡片右下角 ★ 收藏，常用工具会固定在这里
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1.5 [scrollbar-width:none]">
            {items.map((tool) => (
              <a
                key={tool.id}
                href={tool.href}
                className="flex shrink-0 items-center gap-2.5 rounded-2xl border border-black/[0.07] bg-white px-3 py-2.5 text-zinc-900 shadow-[0_18px_44px_-40px_rgba(0,0,0,.4)] transition hover:-translate-y-0.5 hover:border-violet-200 [&>span>svg]:h-4 [&>span>svg]:w-4"
              >
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600"
                  dangerouslySetInnerHTML={{ __html: tool.svg }}
                />
                <b className="whitespace-nowrap text-[12.5px] font-medium">
                  {tool.title}
                </b>
              </a>
            ))}
          </div>
        </section>
      )}

      {pending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm"
          onClick={() => setPending(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-black/[0.08] bg-white p-6 shadow-[0_40px_90px_-40px_rgba(0,0,0,.5)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-400">
              External
            </div>
            <div className="mt-2 text-lg font-semibold tracking-[-0.03em]">
              即将离开 BitLeap
            </div>
            <p className="mt-2 text-[13px] leading-6 text-zinc-500">
              「{pending.title}」是一个外部站点，将在新标签页打开。
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPending(null)}
                className="rounded-full border border-black/[0.08] px-4 py-2 text-[13px] text-zinc-500 transition hover:bg-zinc-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  window.open(pending.href, "_blank", "noopener,noreferrer")
                  setPending(null)
                }}
                className="rounded-full bg-zinc-950 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-zinc-800"
              >
                继续访问
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
