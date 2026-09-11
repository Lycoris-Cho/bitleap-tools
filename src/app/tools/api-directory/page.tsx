"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import { apiList } from "./data"
import ApiCard from "./components/ApiCard"
import FooterNote from "@/components/FooterNote"

type SortMode = "recommended" | "name" | "auth" | "cors"
type FilterValue = "全部" | string

const STORAGE_KEY = "bitleap-api-directory-porcelain-v6"

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] || 0) + 1
    return acc
  }, {})
}

function normalize(value: string) {
  return value.trim().toLowerCase()
}

function scoreApi(api: (typeof apiList)[number]) {
  let score = 0
  if (api.auth === "No") score += 4
  if (api.cors === "Yes") score += 4
  if (api.commercial === "Yes") score += 2
  if (api.commercial === "Unknown") score += 1
  return score
}

function apiStatus(api: (typeof apiList)[number]) {
  if (api.auth === "No" && api.cors === "Yes") return "前端直连"
  if (api.auth !== "No" && api.cors === "Yes") return "需密钥"
  if (api.cors !== "Yes") return "建议代理"
  return "需评估"
}

function statusTone(label: string) {
  if (label === "前端直连") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (label === "需密钥") return "border-stone-300 bg-stone-100 text-stone-700"
  if (label === "建议代理") return "border-stone-200 bg-stone-50 text-stone-500"
  return "border-zinc-200 bg-zinc-50 text-zinc-700"
}

export default function ApiDirectoryPage() {
  const pageRef = useRef<HTMLDivElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  const [category, setCategory] = useState<FilterValue>("全部")
  const [search, setSearch] = useState("")
  const [authFilter, setAuthFilter] = useState<FilterValue>("全部")
  const [corsFilter, setCorsFilter] = useState<FilterValue>("全部")
  const [commercialFilter, setCommercialFilter] = useState<FilterValue>("全部")
  const [sortMode, setSortMode] = useState<SortMode>("recommended")
  const [favorites, setFavorites] = useState<string[]>([])
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [compact, setCompact] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  const categories = useMemo(() => ["全部", ...unique(apiList.map((api) => api.category))], [])
  const authOptions = useMemo(() => ["全部", ...unique(apiList.map((api) => api.auth))], [])
  const corsOptions = useMemo(() => ["全部", ...unique(apiList.map((api) => api.cors))], [])
  const commercialOptions = useMemo(() => ["全部", ...unique(apiList.map((api) => api.commercial))], [])
  const categoryCounts = useMemo(() => countBy(apiList.map((api) => api.category)), [])

  const filtered = useMemo(() => {
    const keyword = normalize(search)

    return apiList
      .filter((api) => {
        const content = normalize(`${api.name} ${api.desc} ${api.category} ${api.auth} ${api.cors} ${api.commercial}`)
        const matchSearch = !keyword || content.includes(keyword)
        const matchCategory = category === "全部" || api.category === category
        const matchAuth = authFilter === "全部" || api.auth === authFilter
        const matchCors = corsFilter === "全部" || api.cors === corsFilter
        const matchCommercial = commercialFilter === "全部" || api.commercial === commercialFilter
        const matchFavorite = !onlyFavorites || favorites.includes(api.slug)
        return matchSearch && matchCategory && matchAuth && matchCors && matchCommercial && matchFavorite
      })
      .sort((a, b) => {
        if (sortMode === "name") return a.name.localeCompare(b.name)
        if (sortMode === "auth") return a.auth.localeCompare(b.auth) || a.name.localeCompare(b.name)
        if (sortMode === "cors") return a.cors.localeCompare(b.cors) || a.name.localeCompare(b.name)
        return scoreApi(b) - scoreApi(a) || a.name.localeCompare(b.name)
      })
  }, [authFilter, category, commercialFilter, corsFilter, favorites, onlyFavorites, search, sortMode])

  const stats = useMemo(() => {
    const frontReady = apiList.filter((api) => api.auth === "No" && api.cors === "Yes").length
    const noAuth = apiList.filter((api) => api.auth === "No").length
    const corsYes = apiList.filter((api) => api.cors === "Yes").length
    return {
      total: apiList.length,
      frontReady,
      noAuth,
      corsYes,
      categories: categories.length - 1,
    }
  }, [categories.length])

  const activeFilters = useMemo(
    () =>
      [
        category !== "全部" ? `分类 ${category}` : "",
        authFilter !== "全部" ? `Auth ${authFilter}` : "",
        corsFilter !== "全部" ? `CORS ${corsFilter}` : "",
        commercialFilter !== "全部" ? `商用 ${commercialFilter}` : "",
        onlyFavorites ? "仅收藏" : "",
        search.trim() ? `搜索 ${search.trim()}` : "",
      ].filter(Boolean),
    [authFilter, category, commercialFilter, corsFilter, onlyFavorites, search],
  )

  const categoryRows = useMemo(
    () =>
      Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8),
    [categoryCounts],
  )

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (!saved) return
      const parsed = JSON.parse(saved) as { favorites?: string[]; sortMode?: SortMode; compact?: boolean }
      if (Array.isArray(parsed.favorites)) setFavorites(parsed.favorites.filter((slug) => apiList.some((api) => api.slug === slug)))
      if (parsed.sortMode === "recommended" || parsed.sortMode === "name" || parsed.sortMode === "auth" || parsed.sortMode === "cors") setSortMode(parsed.sortMode)
      if (typeof parsed.compact === "boolean") setCompact(parsed.compact)
    } catch {
      // Keep default state.
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ favorites, sortMode, compact }))
    } catch {}
  }, [compact, favorites, hydrated, sortMode])

  useEffect(() => {
    if (!pageRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      gsap.from(".api-porcelain-enter", { y: 16, opacity: 0, duration: 0.62, stagger: 0.045, ease: "power3.out" })
      gsap.to(".api-porcelain-orb", { y: -16, x: 10, duration: 7, repeat: -1, yoyo: true, ease: "sine.inOut" })
      gsap.to(".api-porcelain-line", { scaleX: 1.08, opacity: 0.74, duration: 3.8, repeat: -1, yoyo: true, ease: "sine.inOut", transformOrigin: "0 50%" })
    }, pageRef)

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (!resultRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    gsap.fromTo(resultRef.current.querySelectorAll(".api-result-card"), { y: 10, opacity: 0.58 }, { y: 0, opacity: 1, duration: 0.26, stagger: 0.015, ease: "power2.out", overwrite: true })
  }, [authFilter, category, commercialFilter, compact, corsFilter, filtered.length, onlyFavorites, search, sortMode])

  const toggleFavorite = (slug: string) => {
    setFavorites((current) => (current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]))
  }

  const clearFilters = () => {
    setCategory("全部")
    setSearch("")
    setAuthFilter("全部")
    setCorsFilter("全部")
    setCommercialFilter("全部")
    setOnlyFavorites(false)
    setSortMode("recommended")
  }

  return (
    <div ref={pageRef} className="relative min-h-screen overflow-hidden bg-[#f4f1ea] text-[#1f211c]">
      <style>{`
        .api-porcelain-scroll::-webkit-scrollbar { width:5px; height:5px; }
        .api-porcelain-scroll::-webkit-scrollbar-track { background:transparent; }
        .api-porcelain-scroll::-webkit-scrollbar-thumb { background:rgba(71,85,105,.22); border-radius:999px; }
        .api-porcelain-num { font-variant-numeric:tabular-nums lining-nums; }
      `}</style>

      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(255,255,255,.96),transparent_30%),radial-gradient(circle_at_82%_12%,rgba(127,145,132,.20),transparent_33%),radial-gradient(circle_at_58%_90%,rgba(220,210,190,.34),transparent_34%),linear-gradient(180deg,#fffdf8_0%,#f4f1ea_54%,#ebe5d8_100%)]" />
      <div className="api-porcelain-orb pointer-events-none fixed -right-32 top-20 h-[520px] w-[520px] rounded-full bg-[#8fa596]/24 blur-[130px]" />
      <div className="api-porcelain-orb pointer-events-none fixed -left-36 bottom-12 h-[430px] w-[430px] rounded-full bg-[#d6c9ae]/36 blur-[125px]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(31,33,28,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(31,33,28,.035)_1px,transparent_1px)] bg-[size:56px_56px]" />

      <main className="relative z-10">
        <section className="min-h-[calc(100dvh-4rem)] px-5 py-6 sm:px-8 lg:px-10">
          <div className="api-porcelain-enter inline-flex max-w-max">
            <Breadcrumb />
          </div>

          <div className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-[1720px] flex-col justify-center py-10">
            <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_520px] xl:items-end">
              <div>
                <div className="api-porcelain-enter text-[9px] font-semibold uppercase tracking-[0.3em] text-[#989c91]">PUBLIC API ARCHIVE</div>
                <h1 className="api-porcelain-enter mt-5 max-w-[1120px] text-[clamp(52px,7.2vw,118px)] font-semibold leading-[0.94] tracking-[-0.07em] text-[#1f211c]">
                  常用公开 API，
                  <br />
                  克制全屏索引。
                </h1>
                <p className="api-porcelain-enter mt-7 max-w-[760px] text-[13px] leading-7 text-[#74786d]">
                  浅色瓷感、低饱和绿色、石墨文字。保留搜索、分类、认证、CORS、商用、排序和收藏，让公开接口目录更像一个安静但专业的资料馆。
                </p>
              </div>

              <div className="api-porcelain-enter grid grid-cols-2 gap-3">
                <HeroMetric label="Total APIs" value={String(stats.total)} hint="收录接口" />
                <HeroMetric label="Front Ready" value={String(stats.frontReady)} hint="No Auth + CORS" />
                <HeroMetric label="No Auth" value={String(stats.noAuth)} hint="无需认证" />
                <HeroMetric label="CORS Yes" value={String(stats.corsYes)} hint="前端可请求" />
              </div>
            </div>

            <div className="api-porcelain-enter mt-10 grid gap-3 rounded-[34px] border border-[#dedfd6]/80 bg-white/64 p-3 shadow-[0_40px_120px_-92px_rgba(31,33,28,.45)] backdrop-blur-2xl xl:grid-cols-[minmax(0,1fr)_190px_150px_120px]">
              <label className="relative block">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#989c91]">Search</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索 API 名称、描述、分类、Auth、CORS..." className="h-14 w-full rounded-[24px] border border-[#dedfd6] bg-[#f8f6f0]/78 py-4 pl-[78px] pr-4 text-sm text-[#30332c] outline-none transition placeholder:text-[#b6b9ae] focus:border-[#7f9b8c] focus:bg-white" />
              </label>

              <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className="h-14 rounded-[24px] border border-[#dedfd6] bg-[#f8f6f0]/78 px-4 text-xs font-semibold text-[#55594f] outline-none transition focus:border-[#7f9b8c] focus:bg-white">
                <option value="recommended">推荐优先</option>
                <option value="name">名称排序</option>
                <option value="auth">认证排序</option>
                <option value="cors">CORS 排序</option>
              </select>

              <button type="button" onClick={() => setOnlyFavorites(!onlyFavorites)} className={`h-14 rounded-[24px] border px-4 text-xs font-semibold transition ${onlyFavorites ? "border-[#5f7f70] bg-[#5f7f70] text-[#f8f5ee]" : "border-[#dedfd6] bg-[#f8f6f0]/78 text-[#74786d] hover:border-[#c6c8bd] hover:bg-white hover:text-[#1f211c]"}`}>
                收藏 {favorites.length}
              </button>

              <a href="#api-results" className="grid h-14 place-items-center rounded-[24px] bg-[#1f211c] px-4 text-xs font-semibold text-[#f8f5ee] transition hover:-translate-y-0.5 hover:bg-[#30332c]">
                查看结果
              </a>
            </div>
          </div>
        </section>

        <section id="api-results" className="border-t border-[#dedfd6]/80 px-5 py-6 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-[1720px]">
            <div className="api-porcelain-enter sticky top-4 z-30 rounded-[30px] border border-[#dedfd6]/80 bg-white/62 p-3 shadow-[0_24px_90px_-74px_rgba(31,33,28,.28)] backdrop-blur-2xl">
              <div className="grid gap-3 2xl:grid-cols-[minmax(0,1fr)_520px]">
                <div className="api-porcelain-scroll flex gap-2 overflow-x-auto pb-1">
                  {categories.map((item) => (
                    <button key={item} type="button" onClick={() => setCategory(item)} className={`shrink-0 rounded-full border px-4 py-2.5 text-[11px] font-semibold transition ${category === item ? "border-slate-950 bg-[#1f211c] text-[#f8f5ee]" : "border-[#dedfd6] bg-white/62 text-[#74786d] hover:border-[#9bb4a6] hover:bg-white hover:text-[#1f211c]"}`}>
                      {item}
                      {item !== "全部" && <span className="api-porcelain-num ml-1 opacity-55">{categoryCounts[item] || 0}</span>}
                    </button>
                  ))}
                </div>

                <div className="grid gap-2 sm:grid-cols-4">
                  <FilterSelect label="Auth" value={authFilter} options={authOptions} onChange={setAuthFilter} />
                  <FilterSelect label="CORS" value={corsFilter} options={corsOptions} onChange={setCorsFilter} />
                  <FilterSelect label="Commercial" value={commercialFilter} options={commercialOptions} onChange={setCommercialFilter} />
                  <button type="button" onClick={() => setCompact(!compact)} className={`rounded-2xl border px-3 py-3 text-[10px] font-semibold transition ${compact ? "border-[#5f7f70] bg-[#5f7f70] text-[#f8f5ee]" : "border-[#dedfd6] bg-white/62 text-[#74786d] hover:border-[#9bb4a6] hover:bg-white hover:text-[#1f211c]"}`}>
                    {compact ? "紧凑" : "卡片"}
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#dedfd6]/70 pt-3">
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#74786d]">
                  <span className="api-porcelain-num rounded-full border border-[#dedfd6] bg-[#f8f6f0] px-3 py-1.5 text-[#44483f]">{filtered.length} / {apiList.length}</span>
                  {activeFilters.length ? activeFilters.slice(0, 5).map((item) => (
                    <span key={item} className="rounded-full border border-[#dedfd6] bg-white px-3 py-1.5">{item}</span>
                  )) : <span>未启用筛选</span>}
                </div>
                <button type="button" onClick={clearFilters} className="rounded-full border border-[#dedfd6] bg-white px-4 py-2 text-[10px] font-semibold text-[#74786d] transition hover:border-[#c6c8bd] hover:text-[#1f211c]">
                  重置筛选
                </button>
              </div>
            </div>

            <div className="api-porcelain-enter mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {categoryRows.map(([name, count]) => (
                <button key={name} type="button" onClick={() => setCategory(name)} className="group overflow-hidden rounded-[26px] border border-[#dedfd6]/80 bg-white/62 p-4 text-left shadow-[0_22px_80px_-74px_rgba(31,33,28,.28)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[#9bb4a6] hover:bg-white">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-semibold tracking-[-0.03em] text-[#30332c] group-hover:text-[#1f211c]">{name}</span>
                    <span className="api-porcelain-num rounded-full bg-[#f8f6f0] px-2.5 py-1 font-mono text-[10px] text-[#989c91]">{count}</span>
                  </div>
                  <div className="mt-4 h-1 overflow-hidden rounded-full bg-[#dedfd6]/80">
                    <div className="api-porcelain-line h-full rounded-full bg-[#5f7f70]" style={{ width: `${Math.max(8, (count / Math.max(1, stats.total)) * 100)}%` }} />
                  </div>
                </button>
              ))}
            </div>

            <section ref={resultRef} className="mt-6">
              {filtered.length > 0 ? (
                <div className={compact ? "grid grid-cols-1 gap-3" : "grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3"}>
                  {filtered.map((api, index) => {
                    const label = apiStatus(api)
                    return (
                      <div key={api.slug} className="api-result-card">
                        <ApiCard api={api} index={index} favorite={favorites.includes(api.slug)} compact={compact} statusLabel={label} statusClassName={statusTone(label)} score={scoreApi(api)} onToggleFavorite={toggleFavorite} />
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="grid min-h-[420px] place-items-center rounded-[34px] border border-dashed border-[#c6c8bd] bg-white/54 p-8 text-center backdrop-blur-xl">
                  <div>
                    <div className="mx-auto mb-7 h-px w-24 bg-[#c6c8bd]" />
                    <h2 className="text-[clamp(34px,4vw,64px)] font-semibold leading-none tracking-[-0.06em] text-[#1f211c]">没有匹配结果</h2>
                    <p className="mx-auto mt-5 max-w-[390px] text-xs leading-6 text-[#74786d]">减少筛选条件，或搜索 API 名称、描述、分类、Auth、CORS。</p>
                    <button type="button" onClick={clearFilters} className="mt-7 rounded-full bg-[#1f211c] px-5 py-3 text-xs font-semibold text-[#f8f5ee] transition hover:-translate-y-0.5 hover:bg-[#30332c]">
                      清空筛选
                    </button>
                  </div>
                </div>
              )}
            </section>

            <section className="api-porcelain-enter mt-8 grid gap-4 lg:grid-cols-3">
              <InfoBlock title="接入优先级" text="纯前端工具优先选择 Auth: No 且 CORS: Yes 的接口。需要密钥的 API 更适合通过服务端代理接入。" />
              <InfoBlock title="数据责任" text="接口可用性、速率限制、数据准确性由原提供方负责。正式使用前仍应查看对应 Terms of Service。" />
              <InfoBlock title="本地维护" text="收藏、筛选和排序保存在本地浏览器，刷新后仍可延续自己的 API 选择习惯。" />
            </section>

            <div className="api-porcelain-enter mt-10 border-t border-[#dedfd6]/80 pt-5 [&_*]:!text-[#74786d]">
              <FooterNote />
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function HeroMetric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-[26px] border border-[#dedfd6]/80 bg-white/62 p-5 shadow-[0_26px_90px_-76px_rgba(15,23,42,.42)] backdrop-blur-xl">
      <div className="text-[8px] font-semibold uppercase tracking-[0.2em] text-[#989c91]">{label}</div>
      <div className="api-porcelain-num mt-4 font-mono text-4xl font-semibold tracking-[-0.08em] text-[#1f211c]">{value}</div>
      <div className="mt-1 text-[10px] text-[#74786d]">{hint}</div>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-2xl border border-[#dedfd6] bg-white/62 px-3 text-[10px] font-semibold text-[#55594f] outline-none transition focus:border-[#7f9b8c]">
        {options.map((item) => (
          <option key={item} value={item}>{label}: {item}</option>
        ))}
      </select>
    </label>
  )
}

function InfoBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[28px] border border-[#dedfd6]/80 bg-white/52 p-5 shadow-[0_20px_80px_-74px_rgba(15,23,42,.36)] backdrop-blur-xl">
      <div className="api-porcelain-line mb-4 h-px w-20 bg-[#5f7f70]/50" />
      <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#989c91]">{title}</div>
      <p className="mt-3 text-[11px] leading-6 text-[#74786d]">{text}</p>
    </div>
  )
}
