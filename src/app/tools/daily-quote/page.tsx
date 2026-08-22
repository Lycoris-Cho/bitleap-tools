"use client"

import { useState, useEffect, useCallback } from "react"
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
  color: string
}

const CATEGORIES: Category[] = [
  { id: "a", label: "动画", color: "bg-pink-50 text-pink-600 border-pink-200" },
  { id: "b", label: "漫画", color: "bg-rose-50 text-rose-600 border-rose-200" },
  { id: "c", label: "游戏", color: "bg-violet-50 text-violet-600 border-violet-200" },
  { id: "d", label: "文学", color: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  { id: "e", label: "原创", color: "bg-amber-50 text-amber-600 border-amber-200" },
  { id: "f", label: "网络", color: "bg-sky-50 text-sky-600 border-sky-200" },
  { id: "h", label: "影视", color: "bg-indigo-50 text-indigo-600 border-indigo-200" },
  { id: "i", label: "诗词", color: "bg-teal-50 text-teal-600 border-teal-200" },
  { id: "j", label: "网易云", color: "bg-red-50 text-red-600 border-red-200" },
  { id: "k", label: "哲学", color: "bg-purple-50 text-purple-600 border-purple-200" },
]

const TYPE_LABEL: Record<string, string> = {
  a: "动画", b: "漫画", c: "游戏", d: "文学", e: "原创", f: "网络",
  h: "影视", i: "诗词", j: "网易云", k: "哲学", l: "抖机灵",
}

const FALLBACK_QUOTES: Quote[] = [
  { hitokoto: "愿你今日有光，有风，有方向。", from: "bitleap", from_who: null, type: "e" },
  { hitokoto: "代码是写给人看的，顺便让机器能运行。", from: "佚名", from_who: null, type: "e" },
  { hitokoto: "世界上只有一种真正的英雄主义，就是认清了生活的真相后还依然热爱它。", from: "米开朗基罗", from_who: "罗曼·罗兰", type: "k" },
  { hitokoto: "不要着急，最好的总会在最不经意的时候出现。", from: "麦田里的守望者", from_who: null, type: "d" },
  { hitokoto: "愿你出走半生，归来仍是少年。", from: "定风波", from_who: null, type: "i" },
]

type Favorite = Quote & { savedAt: string }

export default function DailyQuotePage() {
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [fade, setFade] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(false)
  const [activeCats, setActiveCats] = useState<string[]>(["d", "e", "f", "i"])
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [showFav, setShowFav] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem("daily-quote-favs")
      if (raw) setFavorites(JSON.parse(raw))
    } catch {}
  }, [])

  const saveFavs = (list: Favorite[]) => {
    setFavorites(list)
    localStorage.setItem("daily-quote-favs", JSON.stringify(list))
  }

  const fetchQuote = useCallback(async (cats: string[] = activeCats) => {
    setFade(false)
    setLoading(true)
    setError(false)
    try {
      const params = cats.length > 0 ? cats.map(c => `c=${c}`).join("&") : ""
      const res = await fetch(`https://v1.hitokoto.cn/?${params}&min_length=8&max_length=50`)
      if (!res.ok) throw new Error("API 返回异常")
      const data = await res.json()
      setQuote(data)
    } catch {
      setError(true)
      const fallback = FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)]
      setQuote(fallback)
    } finally {
      setLoading(false)
      setTimeout(() => setFade(true), 300)
    }
  }, [activeCats])

  useEffect(() => {
    fetchQuote()
  }, [fetchQuote])

  const toggleCat = (catId: string) => {
    const next = activeCats.includes(catId)
      ? activeCats.filter(c => c !== catId)
      : [...activeCats, catId]
    setActiveCats(next)
    fetchQuote(next)
  }

  const handleCopy = async () => {
    if (!quote) return
    const text = `"${quote.hitokoto}" —— ${quote.from}${quote.from_who ? ` ${quote.from_who}` : ""}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleFavorite = () => {
    if (!quote) return
    const exists = favorites.some(f => f.hitokoto === quote.hitokoto)
    if (exists) {
      const next = favorites.filter(f => f.hitokoto !== quote.hitokoto)
      saveFavs(next)
    } else {
      saveFavs([{ ...quote, savedAt: new Date().toISOString() }, ...favorites])
    }
  }

  const isFavorited = quote ? favorites.some(f => f.hitokoto === quote.hitokoto) : false

  const removeFav = (hitokoto: string) => {
    saveFavs(favorites.filter(f => f.hitokoto !== hitokoto))
  }

  return (
    <div className="relative min-h-screen bg-white">
      {/* 全屏淡蓝细线网格 */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, #e8f0fe 1px, transparent 1px),
            linear-gradient(to bottom, #e8f0fe 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* 页面内容 */}
      <div className="relative z-10 mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-10">
        <Breadcrumb />

        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-gray-900">今日文案</h1>
          <p className="text-sm text-gray-500">随机文案 · 每日温暖 · 来自一言 API</p>
          <p className="text-sm text-gray-500">愿你在枯燥的日子里，也能找到属于自己的那句温柔</p>
        </div>

        {/* 主卡片 */}
        <div className="relative mx-auto max-w-2xl rounded-2xl bg-white/85 backdrop-blur-sm border border-gray-200 p-10 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
          <span className="absolute -top-5 -left-3 text-6xl text-violet-200 select-none font-serif leading-none">"</span>
          <span className="absolute -bottom-9 -right-3 text-6xl text-violet-200 select-none font-serif leading-none rotate-180">"</span>

          <div className="flex min-h-[220px] items-center justify-center">
            {loading && fade ? (
              <div className="flex flex-col items-center justify-center">
                <div className="h-7 w-7 animate-spin rounded-full border-4 border-violet-200 border-t-violet-500"></div>
                <p className="mt-3 text-sm text-gray-400">正在寻找一句好话…</p>
              </div>
            ) : quote ? (
              <div className={`text-center transition-opacity duration-300 ${fade ? "opacity-100" : "opacity-0"}`}>
                <p className="text-xl leading-loose text-gray-800 font-medium">
                  {quote.hitokoto}
                </p>
                {(quote.from || quote.from_who) && (
                  <p className="mt-5 text-right text-sm text-gray-400 italic">
                    —— {quote.from_who ? `${quote.from_who} · ` : ""}{quote.from}
                  </p>
                )}
                <div className="mt-4">
                  <span className="inline-block rounded-full bg-gray-50 px-3 py-1 text-xs text-gray-400 border border-gray-200">
                    {TYPE_LABEL[quote.type] || "随机"}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* 分类选择 —— 关键修复 */}
        <div className="mt-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400 text-center">选择分类</p>
          <div className="flex flex-wrap justify-center gap-2">
            {CATEGORIES.map(cat => {
              const isActive = activeCats.includes(cat.id)
              return (
                <button
                  key={cat.id}
                  onClick={() => toggleCat(cat.id)}
                  className={`
                    rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-150
                    border-2
                    ${isActive
                      ? `${cat.color}`
                      : "bg-white/80 text-gray-400 border-transparent hover:bg-white hover:border-gray-200"
                    }
                  `}
                >
                  {cat.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* 操作栏 */}
        <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={() => fetchQuote()}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-violet-600 active:scale-95"
          >
            🔄 换一句
          </button>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-600 active:scale-95"
          >
            {copied ? "✓ 已复制" : "📋 复制"}
          </button>
          <button
            onClick={handleFavorite}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition active:scale-95 ${
              isFavorited
                ? "bg-red-50 text-red-500 hover:bg-red-100"
                : "bg-white/80 text-gray-600 hover:bg-white border border-gray-200"
            }`}
          >
            {isFavorited ? "♥ 已收藏" : "♡ 收藏"}
          </button>
          <button
            onClick={() => setShowFav(!showFav)}
            className="inline-flex items-center gap-2 rounded-xl bg-white/80 px-5 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-white border border-gray-200 active:scale-95"
          >
            📚 收藏 {favorites.length > 0 && `(${favorites.length})`}
          </button>
        </div>

        {/* 收藏列表 */}
        {showFav && (
          <div className="mt-4 mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white/90 backdrop-blur-sm p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">我的收藏</h3>
            {favorites.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">还没有收藏任何句子，点 ❤ 收藏你喜欢的文案吧</p>
            ) : (
              <ul className="space-y-3">
                {favorites.map((fav, idx) => (
                  <li key={idx} className="group flex items-start gap-3 rounded-xl bg-gray-50 p-3 border border-gray-100">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800">"{fav.hitokoto}"</p>
                      <p className="mt-1 text-xs text-gray-400 italic">
                        —— {fav.from_who ? `${fav.from_who} · ` : ""}{fav.from}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFav(fav.hitokoto)}
                      className="shrink-0 rounded-lg p-1.5 text-gray-300 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {error && (
          <p className="mt-4 text-center text-xs text-amber-500">
            ⚠ 一言接口暂不可用，已显示本地兜底文案
          </p>
        )}

        {/* 说明 */}
        <div className="mt-10 mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white/70 backdrop-blur-sm p-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">关于</h3>
          <ul className="space-y-1.5 text-xs leading-relaxed text-gray-500">
            <li>• 文案数据来自 <a href="https://hitokoto.cn" target="_blank" rel="noopener noreferrer" className="text-violet-500 underline">一言 API</a>，公益免费，无需注册</li>
            <li>• 点击分类胶囊可筛选文案类型，至少保留一个分类</li>
            <li>• 收藏的句子保存在浏览器本地（localStorage），不会上传到任何服务器</li>
            <li>• 接口不可用时自动显示内置兜底文案，不影响使用</li>
          </ul>
        </div>

        <FooterNote />
      </div>
    </div>
  )
}