"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type Quote = {
  hitokoto: string
  from: string
  from_who: string | null
  type: string
}

type Category = {
  id: string
  label: string
  accent: string
  dot: string
}

type Favorite = Quote & { savedAt: string }

type IconName = "refresh" | "copy" | "heart" | "book" | "close" | "spark" | "check"

const CATEGORIES: Category[] = [
  { id: "a", label: "动画", accent: "border-rose-200 bg-rose-50/85 text-rose-600", dot: "bg-rose-400" },
  { id: "b", label: "漫画", accent: "border-pink-200 bg-pink-50/85 text-pink-600", dot: "bg-pink-400" },
  { id: "c", label: "游戏", accent: "border-violet-200 bg-violet-50/85 text-violet-600", dot: "bg-violet-400" },
  { id: "d", label: "文学", accent: "border-emerald-200 bg-emerald-50/85 text-emerald-700", dot: "bg-emerald-400" },
  { id: "e", label: "原创", accent: "border-amber-200 bg-amber-50/85 text-amber-700", dot: "bg-amber-400" },
  { id: "f", label: "网络", accent: "border-sky-200 bg-sky-50/85 text-sky-700", dot: "bg-sky-400" },
  { id: "h", label: "影视", accent: "border-indigo-200 bg-indigo-50/85 text-indigo-600", dot: "bg-indigo-400" },
  { id: "i", label: "诗词", accent: "border-teal-200 bg-teal-50/85 text-teal-700", dot: "bg-teal-400" },
  { id: "j", label: "网易云", accent: "border-red-200 bg-red-50/85 text-red-600", dot: "bg-red-400" },
  { id: "k", label: "哲学", accent: "border-purple-200 bg-purple-50/85 text-purple-700", dot: "bg-purple-400" },
]

const TYPE_LABEL: Record<string, string> = {
  a: "动画",
  b: "漫画",
  c: "游戏",
  d: "文学",
  e: "原创",
  f: "网络",
  h: "影视",
  i: "诗词",
  j: "网易云",
  k: "哲学",
  l: "抖机灵",
}

const TYPE_TONE: Record<string, { wash: string; glow: string; ink: string }> = {
  a: { wash: "from-rose-50 via-white to-violet-50", glow: "bg-rose-200/45", ink: "text-rose-500" },
  b: { wash: "from-pink-50 via-white to-rose-50", glow: "bg-pink-200/45", ink: "text-pink-500" },
  c: { wash: "from-violet-50 via-white to-indigo-50", glow: "bg-violet-200/45", ink: "text-violet-500" },
  d: { wash: "from-emerald-50 via-white to-teal-50", glow: "bg-emerald-200/40", ink: "text-emerald-600" },
  e: { wash: "from-amber-50 via-white to-orange-50", glow: "bg-amber-200/45", ink: "text-amber-600" },
  f: { wash: "from-sky-50 via-white to-cyan-50", glow: "bg-sky-200/45", ink: "text-sky-600" },
  h: { wash: "from-indigo-50 via-white to-sky-50", glow: "bg-indigo-200/45", ink: "text-indigo-500" },
  i: { wash: "from-teal-50 via-white to-emerald-50", glow: "bg-teal-200/45", ink: "text-teal-600" },
  j: { wash: "from-red-50 via-white to-orange-50", glow: "bg-red-200/40", ink: "text-red-500" },
  k: { wash: "from-purple-50 via-white to-violet-50", glow: "bg-purple-200/45", ink: "text-purple-600" },
}

const FALLBACK_QUOTES: Quote[] = [
  { hitokoto: "愿你今日有光，有风，有方向。", from: "bitleap", from_who: null, type: "e" },
  { hitokoto: "代码是写给人看的，顺便让机器能运行。", from: "佚名", from_who: null, type: "e" },
  { hitokoto: "世界上只有一种真正的英雄主义，就是认清了生活的真相后还依然热爱它。", from: "米开朗基罗", from_who: "罗曼·罗兰", type: "k" },
  { hitokoto: "不要着急，最好的总会在最不经意的时候出现。", from: "麦田里的守望者", from_who: null, type: "d" },
  { hitokoto: "愿你出走半生，归来仍是少年。", from: "定风波", from_who: null, type: "i" },
]

function Icon({ name, filled = false, className = "h-4 w-4" }: { name: IconName; filled?: boolean; className?: string }) {
  if (name === "refresh") {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}><path d="M20 11a8 8 0 1 0-2.34 5.66"/><path d="M20 4v7h-7"/></svg>
  }
  if (name === "copy") {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>
  }
  if (name === "heart") {
    return <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" className={className}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"/></svg>
  }
  if (name === "book") {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5A2.5 2.5 0 0 1 20 21.5v-16Z"/></svg>
  }
  if (name === "close") {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}><path d="m6 6 12 12M18 6 6 18"/></svg>
  }
  if (name === "check") {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}><path d="m5 12 4 4L19 6"/></svg>
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}><path d="M12 3l1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z"/><path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14Z"/></svg>
}

function quoteSignature(quote: Quote) {
  return `${quote.hitokoto}@@${quote.from}@@${quote.from_who ?? ""}`
}

export default function DailyQuotePage() {
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(false)
  const [activeCats, setActiveCats] = useState<string[]>(["d", "e", "f", "i"])
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [showFav, setShowFav] = useState(false)
  const [today, setToday] = useState("")
  const requestRef = useRef<AbortController | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem("daily-quote-favs")
      if (raw) setFavorites(JSON.parse(raw))
    } catch {}

    const formatter = new Intl.DateTimeFormat("zh-CN", {
      month: "long",
      day: "numeric",
      weekday: "long",
    })
    setToday(formatter.format(new Date()))
  }, [])

  const saveFavs = useCallback((list: Favorite[]) => {
    setFavorites(list)
    try {
      localStorage.setItem("daily-quote-favs", JSON.stringify(list))
    } catch {}
  }, [])

  const fetchQuote = useCallback(async (cats: string[] = activeCats) => {
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller

    setVisible(false)
    setLoading(true)
    setError(false)

    try {
      const params = cats.length > 0 ? cats.map((c) => `c=${c}`).join("&") : ""
      const res = await fetch(`https://v1.hitokoto.cn/?${params}&min_length=8&max_length=50`, {
        signal: controller.signal,
        cache: "no-store",
      })
      if (!res.ok) throw new Error("API 返回异常")
      const data = (await res.json()) as Quote
      setQuote(data)
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return
      setError(true)
      const fallback = FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)]
      setQuote(fallback)
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
        window.setTimeout(() => setVisible(true), 90)
      }
    }
  }, [activeCats])

  useEffect(() => {
    fetchQuote()
    return () => requestRef.current?.abort()
  }, [fetchQuote])

  const toggleCat = (catId: string) => {
    const alreadyActive = activeCats.includes(catId)
    if (alreadyActive && activeCats.length === 1) return

    const next = alreadyActive
      ? activeCats.filter((c) => c !== catId)
      : [...activeCats, catId]

    setActiveCats(next)
    fetchQuote(next)
  }

  const handleCopy = async () => {
    if (!quote) return
    const text = `“${quote.hitokoto}”\n—— ${quote.from_who ? `${quote.from_who} · ` : ""}${quote.from}`

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {}
  }

  const handleFavorite = () => {
    if (!quote) return
    const signature = quoteSignature(quote)
    const exists = favorites.some((fav) => quoteSignature(fav) === signature)

    if (exists) {
      saveFavs(favorites.filter((fav) => quoteSignature(fav) !== signature))
    } else {
      saveFavs([{ ...quote, savedAt: new Date().toISOString() }, ...favorites])
    }
  }

  const removeFav = (target: Favorite) => {
    const signature = quoteSignature(target)
    saveFavs(favorites.filter((fav) => quoteSignature(fav) !== signature))
  }

  const isFavorited = quote
    ? favorites.some((fav) => quoteSignature(fav) === quoteSignature(quote))
    : false

  const tone = useMemo(() => TYPE_TONE[quote?.type ?? ""] ?? TYPE_TONE.d, [quote?.type])

  return (
    <div className={`relative min-h-screen overflow-hidden bg-gradient-to-br ${tone.wash} text-zinc-950 transition-colors duration-1000`}>
      <div className="pointer-events-none fixed inset-0 opacity-[0.36] [background-image:linear-gradient(rgba(100,116,139,.055)_1px,transparent_1px),linear-gradient(90deg,rgba(100,116,139,.055)_1px,transparent_1px)] [background-size:56px_56px]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(255,255,255,.92),transparent_34%),linear-gradient(180deg,rgba(255,255,255,.34),rgba(255,255,255,.72))]" />
      <div className={`pointer-events-none fixed -left-32 top-[12%] h-[430px] w-[430px] rounded-full ${tone.glow} blur-[150px] transition-colors duration-1000`} />
      <div className="pointer-events-none fixed -right-36 top-[30%] h-[520px] w-[520px] rounded-full bg-sky-100/45 blur-[170px]" />
      <div className="pointer-events-none fixed bottom-[-160px] left-[32%] h-[460px] w-[460px] rounded-full bg-violet-100/35 blur-[160px]" />

      <div className="relative z-10 mx-auto w-full max-w-[1180px] px-4 pb-16 pt-6 sm:px-6 sm:pt-8 lg:px-8">
        <Breadcrumb />

        <header className="mx-auto mt-7 max-w-4xl text-center sm:mt-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/70 px-3.5 py-2 text-[10px] font-medium tracking-[0.18em] text-zinc-500 shadow-[0_10px_36px_-24px_rgba(15,23,42,.22)] backdrop-blur-xl">
            <Icon name="spark" className={`h-3.5 w-3.5 ${tone.ink}`} />
            ONE SENTENCE · TODAY
          </div>

          <div className="mt-7 flex items-end justify-center gap-3 sm:gap-5">
            <span className="font-serif text-[clamp(3.4rem,8vw,6.8rem)] font-medium leading-none tracking-[-0.075em] text-zinc-950">今日</span>
            <span className={`mb-[0.08em] font-serif text-[clamp(3.4rem,8vw,6.8rem)] font-medium leading-none tracking-[-0.075em] ${tone.ink} transition-colors duration-700`}>一句</span>
          </div>

          <div className="mx-auto mt-5 flex max-w-2xl flex-col items-center gap-2">
            <p className="text-sm leading-7 text-zinc-500 sm:text-[15px]">在一天真正开始之前，留一句话给自己。</p>
            <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.16em] text-zinc-400">
              <span className="h-px w-7 bg-zinc-300" />
              <span>{today || "今日"}</span>
              <span className="h-px w-7 bg-zinc-300" />
            </div>
          </div>
        </header>

        <main className="mx-auto mt-10 max-w-[900px] sm:mt-12">
          <section className="relative overflow-hidden rounded-[34px] border border-white/90 bg-white/70 shadow-[0_45px_120px_-74px_rgba(15,23,42,.42)] backdrop-blur-[24px] sm:rounded-[42px]">
            <div className={`absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-transparent via-current to-transparent ${tone.ink} opacity-35`} />
            <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full border border-white/80 bg-white/30" />
            <div className="pointer-events-none absolute -right-20 bottom-[-110px] h-72 w-72 rounded-full border border-white/80 bg-white/24" />

            <div className="relative px-6 py-7 sm:px-9 sm:py-9">
              <div className="flex items-center justify-between gap-4 border-b border-black/[0.055] pb-5">
                <div className="flex items-center gap-3">
                  <span className={`h-2 w-2 rounded-full ${CATEGORIES.find((cat) => cat.id === quote?.type)?.dot ?? "bg-violet-400"} shadow-[0_0_0_5px_rgba(255,255,255,.75)]`} />
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.24em] text-zinc-400">Daily note</div>
                    <div className="mt-0.5 text-xs font-medium text-zinc-700">{quote ? TYPE_LABEL[quote.type] || "随机" : "正在寻找"}</div>
                  </div>
                </div>

                <div className="font-mono text-[9px] tracking-[0.16em] text-zinc-300">
                  {quote ? `${String(quote.hitokoto.length).padStart(2, "0")} CHARS` : "···"}
                </div>
              </div>

              <div className="relative flex min-h-[340px] items-center justify-center py-10 sm:min-h-[390px] sm:py-14">
                <div className={`pointer-events-none absolute left-2 top-5 select-none font-serif text-[8.5rem] leading-none ${tone.ink} opacity-[0.09] sm:left-6 sm:text-[11rem]`}>“</div>
                <div className={`pointer-events-none absolute bottom-[-22px] right-2 rotate-180 select-none font-serif text-[8.5rem] leading-none ${tone.ink} opacity-[0.07] sm:right-6 sm:text-[11rem]`}>“</div>

                {loading ? (
                  <div className="w-full max-w-[620px] animate-pulse px-2 text-center">
                    <div className="mx-auto h-3 w-[72%] rounded-full bg-zinc-100" />
                    <div className="mx-auto mt-4 h-3 w-[88%] rounded-full bg-zinc-100" />
                    <div className="mx-auto mt-4 h-3 w-[58%] rounded-full bg-zinc-100" />
                    <div className="mx-auto mt-9 h-2.5 w-28 rounded-full bg-zinc-100" />
                    <p className="mt-5 text-[10px] tracking-[0.12em] text-zinc-300">正在寻找一句刚刚好的话</p>
                  </div>
                ) : quote ? (
                  <div className={`w-full max-w-[700px] px-2 text-center transition-all duration-500 ${visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}>
                    <p className="font-serif text-[clamp(1.65rem,4.1vw,3.15rem)] font-medium leading-[1.72] tracking-[-0.035em] text-zinc-900 sm:leading-[1.62]">
                      {quote.hitokoto}
                    </p>

                    {(quote.from || quote.from_who) && (
                      <div className="mt-9 flex items-center justify-center gap-4">
                        <span className="h-px w-9 bg-zinc-200" />
                        <p className="text-xs tracking-[0.05em] text-zinc-400">
                          {quote.from_who ? `${quote.from_who} · ` : ""}{quote.from}
                        </p>
                        <span className="h-px w-9 bg-zinc-200" />
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 border-t border-black/[0.055] pt-5 sm:grid-cols-[1fr_auto] sm:items-center">
                <p className="text-[10px] leading-5 text-zinc-400">
                  {error ? "一言接口暂时不可用，当前显示本地备用文案。" : "来自一言 · 每次刷新都可能遇见不同的句子。"}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => fetchQuote()} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-full bg-zinc-950 px-4 text-[11px] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-50">
                    <Icon name="refresh" className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                    换一句
                  </button>

                  <button type="button" onClick={handleCopy} disabled={!quote} className="inline-flex h-10 items-center gap-2 rounded-full border border-black/[0.07] bg-white/78 px-4 text-[11px] font-semibold text-zinc-600 transition hover:-translate-y-0.5 hover:bg-white hover:text-zinc-950 disabled:opacity-40">
                    <Icon name={copied ? "check" : "copy"} className="h-3.5 w-3.5" />
                    {copied ? "已复制" : "复制"}
                  </button>

                  <button type="button" onClick={handleFavorite} disabled={!quote} className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[11px] font-semibold transition hover:-translate-y-0.5 disabled:opacity-40 ${isFavorited ? "border-rose-200 bg-rose-50/90 text-rose-500" : "border-black/[0.07] bg-white/78 text-zinc-600 hover:bg-white hover:text-zinc-950"}`}>
                    <Icon name="heart" filled={isFavorited} className="h-3.5 w-3.5" />
                    {isFavorited ? "已收藏" : "收藏"}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-5 rounded-[28px] border border-white/90 bg-white/58 p-5 shadow-[0_26px_80px_-64px_rgba(15,23,42,.32)] backdrop-blur-xl sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-[240px]">
                <div className="text-[9px] uppercase tracking-[0.24em] text-zinc-400">Mood filter</div>
                <h2 className="mt-1.5 text-base font-semibold tracking-[-0.035em] text-zinc-900">今天想读哪一种？</h2>
                <p className="mt-1.5 text-[10px] leading-5 text-zinc-400">可多选，至少会保留一个分类。</p>
              </div>

              <div className="flex flex-1 flex-wrap justify-start gap-2 sm:justify-end">
                {CATEGORIES.map((cat) => {
                  const isActive = activeCats.includes(cat.id)
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCat(cat.id)}
                      aria-pressed={isActive}
                      className={`group inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[10px] font-medium transition-all duration-200 ${
                        isActive
                          ? `${cat.accent} shadow-[0_8px_22px_-16px_rgba(15,23,42,.25)]`
                          : "border-black/[0.055] bg-white/58 text-zinc-400 hover:-translate-y-0.5 hover:border-black/[0.09] hover:bg-white hover:text-zinc-700"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full transition ${isActive ? cat.dot : "bg-zinc-300 group-hover:bg-zinc-400"}`} />
                      {cat.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          <section className="mt-5 overflow-hidden rounded-[28px] border border-white/90 bg-white/58 shadow-[0_26px_80px_-64px_rgba(15,23,42,.32)] backdrop-blur-xl">
            <button type="button" onClick={() => setShowFav((value) => !value)} className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition hover:bg-white/45 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-black/[0.055] bg-white/75 text-zinc-500">
                  <Icon name="book" className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-[0.22em] text-zinc-400">Collected lines</div>
                  <div className="mt-1 text-sm font-semibold text-zinc-800">我的收藏 <span className="ml-1 font-mono text-[10px] font-normal text-zinc-400">{favorites.length}</span></div>
                </div>
              </div>

              <div className={`flex h-8 w-8 items-center justify-center rounded-full border border-black/[0.055] bg-white/70 text-zinc-400 transition-transform duration-300 ${showFav ? "rotate-45" : ""}`}>
                <span className="text-lg font-light">+</span>
              </div>
            </button>

            <div className={`grid transition-[grid-template-rows] duration-500 ease-out ${showFav ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
              <div className="overflow-hidden">
                <div className="border-t border-black/[0.05] px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
                  {favorites.length === 0 ? (
                    <div className="py-10 text-center">
                      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-black/[0.055] bg-white/70 text-zinc-300"><Icon name="heart" className="h-4 w-4" /></div>
                      <p className="mt-3 text-xs text-zinc-400">还没有收藏。遇到喜欢的句子，就把它留下来。</p>
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {favorites.map((fav, index) => (
                        <article key={`${quoteSignature(fav)}-${index}`} className="group relative rounded-[20px] border border-black/[0.055] bg-white/72 p-4 transition hover:-translate-y-0.5 hover:border-black/[0.09] hover:bg-white hover:shadow-[0_18px_45px_-35px_rgba(15,23,42,.3)]">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="mb-2 text-[9px] uppercase tracking-[0.16em] text-zinc-300">{TYPE_LABEL[fav.type] || "随机"}</div>
                              <p className="font-serif text-[15px] leading-7 text-zinc-700">“{fav.hitokoto}”</p>
                              <p className="mt-3 text-[10px] text-zinc-400">—— {fav.from_who ? `${fav.from_who} · ` : ""}{fav.from}</p>
                            </div>
                            <button type="button" onClick={() => removeFav(fav)} aria-label="删除收藏" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-300 opacity-70 transition hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100">
                              <Icon name="close" className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-5 rounded-[24px] border border-black/[0.045] bg-white/40 px-5 py-4 backdrop-blur-md sm:px-6">
            <div className="flex flex-col gap-3 text-[10px] leading-5 text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
              <p>文案来自一言 API；接口不可用时会自动切换到本地备用文案。</p>
              <p>收藏仅保存在当前浏览器，不上传服务器。</p>
            </div>
          </section>
        </main>

        {copied && (
          <div className="pointer-events-none fixed bottom-7 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/90 bg-zinc-950/92 px-4 py-2 text-[11px] font-medium text-white shadow-[0_16px_45px_-18px_rgba(15,23,42,.5)] backdrop-blur-xl">
            已复制到剪贴板
          </div>
        )}

        <div className="mt-10">
          <FooterNote />
        </div>
      </div>
    </div>
  )
}
