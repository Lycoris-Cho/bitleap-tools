"use client"

/*
 * 首页搜索。
 *
 * 首页现在是服务器组件，116 张卡片和它们的图标都只存在于 HTML 里、不进客户端包。
 * 这个组件因此刻意做成「零 props、只读 DOM」：卡片上的 data-* 属性既当索引也当
 * 数据源，搜索/过滤/下拉全部基于已有的 DOM 节点完成，不重新渲染列表。
 * 这样即使 JS 还没到，卡片也是原生 <a>，点击照样能跳转。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { KeyboardEvent as ReactKeyboardEvent } from "react"

type CardInfo = {
  el: HTMLElement
  id: string
  title: string
  desc: string
  cat: string
  py: string
  abbr: string
  search: string
  svg: string
}

type Hit = { card: CardInfo; kind: string }

const HISTORY_KEY = "bl.home.history"
const CLICKS_KEY = "bl.home.clicks"

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
    /* 隐私模式下写不进去，忽略 */
  }
}

export default function HomeSearch() {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [hits, setHits] = useState<Hit[]>([])
  const [history, setHistory] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement | null>(null)
  const cardsRef = useRef<CardInfo[]>([])

  /* 把服务器渲染出来的卡片读成索引；DOM 变化时（刷新/前进后退）重新收集 */
  const collect = useCallback(() => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>(".tool-card-shell"),
    )
    cardsRef.current = nodes.map((el) => ({
      el,
      id: el.dataset.id || "",
      title: el.dataset.title || "",
      desc: el.dataset.desc || "",
      cat: el.dataset.cat || "",
      py: (el.dataset.py || "").toLowerCase(),
      abbr: (el.dataset.abbr || "").toLowerCase(),
      search: (el.dataset.search || "").toLowerCase(),
      svg: el.querySelector("svg")?.outerHTML || "",
    }))
  }, [])

  useEffect(() => {
    collect()
    setHistory(read<string[]>(HISTORY_KEY, []))
  }, [collect])

  const search = useCallback((raw: string): Hit[] => {
    const terms = raw.toLowerCase().trim().split(/\s+/).filter(Boolean)
    if (!terms.length) return []
    const out: { card: CardInfo; score: number; kind: string }[] = []

    for (const card of cardsRef.current) {
      let score = 0
      let ok = true
      for (const term of terms) {
        const inTitle = card.title.toLowerCase().includes(term)
        const abbrHit = card.abbr.startsWith(term)
        const pyHit = card.py.startsWith(term)
        const pyAny = card.py.includes(term)
        const idHit = card.id.toLowerCase().includes(term)
        const any = card.search.includes(term)
        if (!inTitle && !abbrHit && !pyHit && !pyAny && !idHit && !any) {
          ok = false
          break
        }
        score +=
          (inTitle ? 100 : 0) +
          (abbrHit ? 88 : 0) +
          (pyHit ? 80 : 0) +
          (pyAny ? 60 : 0) +
          (idHit ? 50 : 0) +
          (any ? 30 : 0)
      }
      if (!ok) continue

      const key = terms[0]
      const kind = card.title.toLowerCase().includes(key)
        ? ""
        : card.abbr.startsWith(key)
          ? "首字母"
          : card.py.includes(key)
            ? "拼音"
            : card.id.toLowerCase().includes(key)
              ? "英文名"
              : "相关"
      out.push({ card, score, kind })
    }

    out.sort((a, b) => b.score - a.score)
    return out.map((h) => ({ card: h.card, kind: h.kind }))
  }, [])

  /* 过滤：只切 data 属性 + hidden，不重建节点，所以极快 */
  const applyFilter = useCallback(
    (matched: Set<HTMLElement> | null) => {
      const sections = Array.from(
        document.querySelectorAll<HTMLElement>("[data-cat-section]"),
      )
      for (const section of sections) {
        let visibleInSection = 0
        section
          .querySelectorAll<HTMLElement>(".tool-card-shell")
          .forEach((card) => {
            const show = !matched || matched.has(card)
            card.hidden = !show
            card.style.display = show ? "" : "none"
            if (show) visibleInSection++
          })
        section.hidden = visibleInSection === 0
      }
      const empty = document.getElementById("home-empty")
      if (empty) empty.hidden = !(matched && matched.size === 0)
      const head = document.getElementById("home-result-head")
      if (head) head.hidden = !matched
    },
    [],
  )

  const runSearch = useCallback(
    (raw: string) => {
      const found = raw.trim() ? search(raw) : []
      setHits(found)
      setActive(found.length ? 0 : -1)
      applyFilter(raw.trim() ? new Set(found.map((h) => h.card.el)) : null)
      return found
    },
    [applyFilter, search],
  )

  /* 下拉面板里的热门：按真实点击次数排序 */
  const hot = useMemo(() => {
    if (!open || query.trim()) return []
    const clicks = read<Record<string, number>>(CLICKS_KEY, {})
    const ranked = Object.keys(clicks)
      .sort((a, b) => clicks[b] - clicks[a])
      .slice(0, 6)
      .map((id) => cardsRef.current.find((c) => c.id === id)?.title)
      .filter(Boolean) as string[]
    return ranked.length
      ? ranked
      : cardsRef.current.slice(0, 6).map((c) => c.title)
  }, [open, query, hits])

  const remember = useCallback((term: string) => {
    if (!term.trim()) return
    const next = [term, ...read<string[]>(HISTORY_KEY, []).filter((t) => t !== term)].slice(0, 6)
    write(HISTORY_KEY, next)
    setHistory(next)
  }, [])

  const openCard = useCallback(
    (card: CardInfo) => {
      const clicks = read<Record<string, number>>(CLICKS_KEY, {})
      clicks[card.id] = (clicks[card.id] || 0) + 1
      write(CLICKS_KEY, clicks)
      window.dispatchEvent(new CustomEvent("bl:opened", { detail: card.id }))
      const link = card.el.querySelector<HTMLAnchorElement>("a[href]")
      if (link) link.click()
      else window.location.href = "/tools/" + card.id
    },
    [],
  )

  const highlight = (text: string) => {
    const term = query.trim()
    if (!term) return text
    const i = text.toLowerCase().indexOf(term.toLowerCase())
    if (i < 0) return text
    return (
      <>
        {text.slice(0, i)}
        <mark>{text.slice(i, i + term.length)}</mark>
        {text.slice(i + term.length)}
      </>
    )
  }

  const randomTool = () => {
    const list = cardsRef.current
    if (!list.length) return
    openCard(list[Math.floor(Math.random() * list.length)])
  }

  /* 快捷键：Ctrl/⌘K 聚焦；Esc 清空 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        inputRef.current?.focus()
        if (!query) setOpen(true)
      }
      if (e.key === "Escape") {
        if (query) {
          setQuery("")
          runSearch("")
        } else setOpen(false)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [query, runSearch])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".home-search")) setOpen(false)
    }
    document.addEventListener("click", onDoc)
    return () => document.removeEventListener("click", onDoc)
  }, [])

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!hits.length) return
      e.preventDefault()
      setActive((i) =>
        e.key === "ArrowDown"
          ? (i + 1) % hits.length
          : (i - 1 + hits.length) % hits.length,
      )
    } else if (e.key === "Enter") {
      const term = query.trim()
      if (active >= 0 && hits[active]) {
        e.preventDefault()
        remember(term)
        openCard(hits[active].card)
      } else if (term) {
        const found = runSearch(term)
        if (found.length) {
          e.preventDefault()
          remember(term)
          openCard(found[0].card)
        }
      }
    }
  }

  const showResults = open && !!query.trim()
  const showSuggest = open && !query.trim()

  return (
    <div className="home-search mt-2 max-w-3xl">
      <div className="group relative rounded-[24px_10px_24px_24px] border border-black/[0.08] bg-white/92 p-2 shadow-[0_24px_70px_-42px_rgba(15,23,42,.35)] backdrop-blur-xl transition duration-300 focus-within:border-violet-200 focus-within:shadow-[0_28px_80px_-40px_rgba(124,58,237,.24)]">
        <div className="flex items-center">
          <div className="ml-3 text-zinc-400">
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
          </div>

          <input
            id="search-input"
            ref={inputRef}
            type="text"
            placeholder="搜索工具、功能或分类… 支持拼音，如 zhengze、ewm"
            value={query}
            onChange={(e) => {
              const v = e.target.value
              setQuery(v)
              runSearch(v)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            autoComplete="off"
            spellCheck={false}
            className="h-11 min-w-0 flex-1 bg-transparent px-4 text-sm text-zinc-900 outline-none placeholder:text-zinc-300 sm:text-base"
          />

          {query.trim() && (
            <span className="mr-2 shrink-0 text-[11px] text-zinc-400">
              {hits.length} 个结果
            </span>
          )}

          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("")
                runSearch("")
                inputRef.current?.focus()
              }}
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

        {(showResults || showSuggest) && (
          <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 max-h-[min(60vh,420px)] overflow-y-auto rounded-[20px] border border-black/[0.08] bg-white shadow-[0_34px_80px_-46px_rgba(15,23,42,.5)]">
            {showResults && hits.length > 0 && (
              <>
                <div className="px-4 pb-1.5 pt-3 text-[10px] uppercase tracking-[0.2em] text-zinc-400">
                  结果 {hits.length} · ↑↓ 选择，回车打开
                </div>
                {hits.slice(0, 8).map((hit, i) => (
                  <div
                    key={hit.card.id}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => {
                      remember(query.trim())
                      openCard(hit.card)
                    }}
                    className={`mx-1.5 flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 ${
                      i === active ? "bg-[#f6f4ff]" : ""
                    }`}
                  >
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-zinc-100 text-zinc-600 [&>svg]:h-4 [&>svg]:w-4"
                      dangerouslySetInnerHTML={{ __html: hit.card.svg }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-zinc-900">
                        {highlight(hit.card.title)}
                      </span>
                      <span className="block truncate text-[11px] text-zinc-400">
                        {highlight(hit.card.desc)}
                      </span>
                    </span>
                    {hit.kind && (
                      <span className="shrink-0 rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] text-violet-600">
                        {hit.kind}
                      </span>
                    )}
                  </div>
                ))}
              </>
            )}

            {showResults && hits.length === 0 && (
              <div className="px-4 py-4 text-[13px] text-zinc-500">
                没有匹配的工具，换个关键词试试。
              </div>
            )}

            {showSuggest && (
              <>
                {history.length > 0 && (
                  <>
                    <div className="px-4 pb-1.5 pt-3 text-[10px] uppercase tracking-[0.2em] text-zinc-400">
                      搜索历史
                    </div>
                    <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                      {history.map((term) => (
                        <button
                          key={term}
                          type="button"
                          onClick={() => {
                            setQuery(term)
                            runSearch(term)
                          }}
                          className="rounded-full border border-black/[0.07] bg-white px-3 py-1.5 text-[12px] text-zinc-500 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-600"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <div className="px-4 pb-1.5 pt-3 text-[10px] uppercase tracking-[0.2em] text-zinc-400">
                  {history.length ? "热门" : "试试这些"}
                </div>
                <div className="flex flex-wrap gap-1.5 px-4 pb-4">
                  {hot.map((title) => (
                    <button
                      key={title}
                      type="button"
                      onClick={() => {
                        setQuery(title)
                        runSearch(title)
                      }}
                      className="rounded-full border border-black/[0.07] bg-white px-3 py-1.5 text-[12px] text-zinc-500 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-600"
                    >
                      {title}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[11px] uppercase tracking-[0.2em] text-zinc-400">
          热门
        </span>
        {["CSS", "图片压缩", "配色", "JSON", "二维码", "正则"].map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => {
              setQuery(tag)
              runSearch(tag)
              setOpen(true)
            }}
            className="rounded-full border border-black/[0.06] bg-white/75 px-3 py-1.5 text-[12px] text-zinc-500 transition duration-300 hover:-translate-y-0.5 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-600"
          >
            {tag}
          </button>
        ))}
        <button
          type="button"
          onClick={randomTool}
          title="随机打开一个工具"
          className="ml-auto rounded-full border border-black/[0.06] bg-white/75 px-3 py-1.5 text-[12px] text-zinc-500 transition duration-300 hover:-translate-y-0.5 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-600"
        >
          🎲 随机来一个
        </button>
      </div>
    </div>
  )
}
