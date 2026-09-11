"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { inspoList } from "./data"
import InspoCard from "./components/InspoCard"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type FilterValue = "全部" | string
type SortMode = "recommended" | "name" | "category" | "tags"
type ViewMode = "gallery" | "compact"

const STORAGE_KEY = "bitleap-inspo-directory-porcelain-v2"

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

function scoreSite(site: (typeof inspoList)[number]) {
  let score = 4
  if (site.tags.includes("可商用")) score += 2
  if (site.tags.includes("UI")) score += 2
  if (site.tags.includes("极简")) score += 2
  if (site.tags.includes("动效重")) score += 1
  if (site.learn.length > 12) score += 1
  return Math.min(10, score)
}

function siteTone(site: (typeof inspoList)[number]) {
  if (site.tags.includes("极简")) return "极简拆解"
  if (site.tags.includes("动效重")) return "动效参考"
  if (site.tags.includes("UI")) return "界面灵感"
  if (site.tags.includes("暗黑")) return "暗色研究"
  return "视觉参考"
}

export default function InspoDirectoryPage() {
  const pageRef = useRef<HTMLDivElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  const [category, setCategory] = useState<FilterValue>("全部")
  const [tag, setTag] = useState<FilterValue>("全部")
  const [search, setSearch] = useState("")
  const [sortMode, setSortMode] = useState<SortMode>("recommended")
  const [viewMode, setViewMode] = useState<ViewMode>("gallery")
  const [favorites, setFavorites] = useState<string[]>([])
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  const categories = useMemo(() => ["全部", ...unique(inspoList.map((site) => site.category))], [])
  const tags = useMemo(() => ["全部", ...unique(inspoList.flatMap((site) => site.tags))], [])
  const categoryCounts = useMemo(() => countBy(inspoList.map((site) => site.category)), [])
  const tagCounts = useMemo(() => countBy(inspoList.flatMap((site) => site.tags)), [])

  const filtered = useMemo(() => {
    const keyword = normalize(search)

    return inspoList
      .filter((site) => {
        const content = normalize(`${site.name} ${site.desc} ${site.category} ${site.learn} ${site.tags.join(" ")}`)
        const matchCategory = category === "全部" || site.category === category
        const matchTag = tag === "全部" || site.tags.includes(tag)
        const matchSearch = !keyword || content.includes(keyword)
        const matchFavorite = !onlyFavorites || favorites.includes(site.slug)
        return matchCategory && matchTag && matchSearch && matchFavorite
      })
      .sort((a, b) => {
        if (sortMode === "name") return a.name.localeCompare(b.name)
        if (sortMode === "category") return a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
        if (sortMode === "tags") return b.tags.length - a.tags.length || a.name.localeCompare(b.name)
        return scoreSite(b) - scoreSite(a) || a.name.localeCompare(b.name)
      })
  }, [category, favorites, onlyFavorites, search, sortMode, tag])

  const stats = useMemo(() => {
    const minimal = inspoList.filter((site) => site.tags.includes("极简")).length
    const motion = inspoList.filter((site) => site.tags.includes("动效重")).length
    const ui = inspoList.filter((site) => site.tags.includes("UI")).length
    return {
      total: inspoList.length,
      categories: categories.length - 1,
      tags: tags.length - 1,
      minimal,
      motion,
      ui,
    }
  }, [categories.length, tags.length])

  const activeFilters = useMemo(
    () =>
      [
        category !== "全部" ? `分类 ${category}` : "",
        tag !== "全部" ? `标签 ${tag}` : "",
        onlyFavorites ? "仅收藏" : "",
        search.trim() ? `搜索 ${search.trim()}` : "",
      ].filter(Boolean),
    [category, onlyFavorites, search, tag],
  )

  const topTags = useMemo(
    () =>
      Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8),
    [tagCounts],
  )

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (!saved) return
      const parsed = JSON.parse(saved) as { favorites?: string[]; sortMode?: SortMode; viewMode?: ViewMode }
      if (Array.isArray(parsed.favorites)) setFavorites(parsed.favorites.filter((slug) => inspoList.some((site) => site.slug === slug)))
      if (parsed.sortMode === "recommended" || parsed.sortMode === "name" || parsed.sortMode === "category" || parsed.sortMode === "tags") setSortMode(parsed.sortMode)
      if (parsed.viewMode === "gallery" || parsed.viewMode === "compact") setViewMode(parsed.viewMode)
    } catch {
      // Keep defaults.
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ favorites, sortMode, viewMode }))
    } catch {}
  }, [favorites, hydrated, sortMode, viewMode])

  useEffect(() => {
    if (!pageRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      gsap.from(".inspo-enter", { y: 16, opacity: 0, duration: 0.62, stagger: 0.045, ease: "power3.out" })
      gsap.to(".inspo-orb", { y: -16, x: 10, duration: 7, repeat: -1, yoyo: true, ease: "sine.inOut" })
      gsap.to(".inspo-line", { scaleX: 1.08, opacity: 0.74, duration: 3.8, repeat: -1, yoyo: true, ease: "sine.inOut", transformOrigin: "0 50%" })
    }, pageRef)

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (!resultRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    gsap.fromTo(resultRef.current.querySelectorAll(".inspo-result-card"), { y: 10, opacity: 0.58 }, { y: 0, opacity: 1, duration: 0.26, stagger: 0.015, ease: "power2.out", overwrite: true })
  }, [category, filtered.length, onlyFavorites, search, sortMode, tag, viewMode])

  const toggleFavorite = (slug: string) => {
    setFavorites((current) => (current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]))
  }

  const clearFilters = () => {
    setCategory("全部")
    setTag("全部")
    setSearch("")
    setOnlyFavorites(false)
    setSortMode("recommended")
  }

  return (
    <div ref={pageRef} className="relative min-h-screen overflow-hidden bg-[#f4f1ea] text-[#1f211c]">
      <style>{`
        .inspo-scroll::-webkit-scrollbar { width:5px; height:5px; }
        .inspo-scroll::-webkit-scrollbar-track { background:transparent; }
        .inspo-scroll::-webkit-scrollbar-thumb { background:rgba(31,33,28,.2); border-radius:999px; }
        .inspo-num { font-variant-numeric:tabular-nums lining-nums; }
      `}</style>

      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(255,255,255,.96),transparent_30%),radial-gradient(circle_at_82%_12%,rgba(127,145,132,.2),transparent_33%),radial-gradient(circle_at_58%_90%,rgba(220,210,190,.34),transparent_34%),linear-gradient(180deg,#fffdf8_0%,#f4f1ea_54%,#ebe5d8_100%)]" />
      <div className="inspo-orb pointer-events-none fixed -right-32 top-20 h-[520px] w-[520px] rounded-full bg-[#8fa596]/24 blur-[130px]" />
      <div className="inspo-orb pointer-events-none fixed -left-36 bottom-12 h-[430px] w-[430px] rounded-full bg-[#d6c9ae]/36 blur-[125px]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(31,33,28,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(31,33,28,.035)_1px,transparent_1px)] bg-[size:56px_56px]" />

      <main className="relative z-10">
        <section className="min-h-[calc(100dvh-4rem)] px-5 py-6 sm:px-8 lg:px-10">
          <div className="inspo-enter inline-flex max-w-max">
            <Breadcrumb />
          </div>

          <div className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-[1720px] flex-col justify-center py-10">
            <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_520px] xl:items-end">
              <div>
                <div className="inspo-enter text-[9px] font-semibold uppercase tracking-[0.3em] text-[#989c91]">FRONTEND INSPO ARCHIVE</div>
                <h1 className="inspo-enter mt-5 max-w-[1120px] text-[clamp(52px,7.2vw,118px)] font-semibold leading-[0.94] tracking-[-0.07em] text-[#1f211c]">
                  前端灵感开发，
                  <br />
                  拆解而不是收藏。
                </h1>
                <p className="inspo-enter mt-7 max-w-[760px] text-[13px] leading-7 text-[#74786d]">
                  按照上面的浅色瓷感风格重做：全屏排版、低饱和绿色、石墨文字。保留分类、标签、搜索、收藏和学习建议，把灵感站点整理成一个安静专业的前端拆解资料馆。
                </p>
              </div>

              <div className="inspo-enter grid grid-cols-2 gap-3">
                <HeroMetric label="Sites" value={String(stats.total)} hint="收录站点" />
                <HeroMetric label="Categories" value={String(stats.categories)} hint="灵感分类" />
                <HeroMetric label="UI" value={String(stats.ui)} hint="界面参考" />
                <HeroMetric label="Motion" value={String(stats.motion)} hint="动效参考" />
              </div>
            </div>

            <div className="inspo-enter mt-10 grid gap-3 rounded-[34px] border border-[#dedfd6]/90 bg-white/64 p-3 shadow-[0_40px_120px_-92px_rgba(31,33,28,.45)] backdrop-blur-2xl xl:grid-cols-[minmax(0,1fr)_190px_150px_120px]">
              <label className="relative block">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#989c91]">Search</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索站点、描述、标签、学习方向..." className="h-14 w-full rounded-[24px] border border-[#dedfd6] bg-[#f8f6f0]/78 py-4 pl-[78px] pr-4 text-sm text-[#30332c] outline-none transition placeholder:text-[#b6b9ae] focus:border-[#7f9b8c] focus:bg-white" />
              </label>

              <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className="h-14 rounded-[24px] border border-[#dedfd6] bg-[#f8f6f0]/78 px-4 text-xs font-semibold text-[#55594f] outline-none transition focus:border-[#7f9b8c] focus:bg-white">
                <option value="recommended">推荐优先</option>
                <option value="name">名称排序</option>
                <option value="category">分类排序</option>
                <option value="tags">标签数量</option>
              </select>

              <button type="button" onClick={() => setOnlyFavorites(!onlyFavorites)} className={`h-14 rounded-[24px] border px-4 text-xs font-semibold transition ${onlyFavorites ? "border-[#5f7f70] bg-[#5f7f70] text-[#f8f5ee]" : "border-[#dedfd6] bg-[#f8f6f0]/78 text-[#74786d] hover:border-[#9bb4a6] hover:bg-white hover:text-[#1f211c]"}`}>
                收藏 {favorites.length}
              </button>

              <a href="#inspo-results" className="grid h-14 place-items-center rounded-[24px] bg-[#1f211c] px-4 text-xs font-semibold text-[#f8f5ee] transition hover:-translate-y-0.5 hover:bg-[#30332c]">
                查看结果
              </a>
            </div>
          </div>
        </section>

        <section id="inspo-results" className="border-t border-[#dedfd6]/90 px-5 py-6 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-[1720px]">
            <div className="inspo-enter sticky top-4 z-30 rounded-[30px] border border-[#dedfd6]/90 bg-white/68 p-3 shadow-[0_24px_90px_-74px_rgba(31,33,28,.28)] backdrop-blur-2xl">
              <div className="grid gap-3 2xl:grid-cols-[minmax(0,1fr)_520px]">
                <div className="inspo-scroll flex gap-2 overflow-x-auto pb-1">
                  {categories.map((item) => (
                    <button key={item} type="button" onClick={() => setCategory(item)} className={`shrink-0 rounded-full border px-4 py-2.5 text-[11px] font-semibold transition ${category === item ? "border-[#1f211c] bg-[#1f211c] text-[#f8f5ee]" : "border-[#dedfd6] bg-white/62 text-[#74786d] hover:border-[#9bb4a6] hover:bg-white hover:text-[#1f211c]"}`}>
                      {item}
                      {item !== "全部" && <span className="inspo-num ml-1 opacity-55">{categoryCounts[item] || 0}</span>}
                    </button>
                  ))}
                </div>

                <div className="grid gap-2 sm:grid-cols-4">
                  <FilterSelect label="标签" value={tag} options={tags} onChange={setTag} />
                  <button type="button" onClick={() => setViewMode(viewMode === "gallery" ? "compact" : "gallery")} className={`rounded-2xl border px-3 py-3 text-[10px] font-semibold transition ${viewMode === "compact" ? "border-[#5f7f70] bg-[#5f7f70] text-[#f8f5ee]" : "border-[#dedfd6] bg-white/62 text-[#74786d] hover:border-[#9bb4a6] hover:bg-white hover:text-[#1f211c]"}`}>
                    {viewMode === "compact" ? "紧凑" : "画廊"}
                  </button>
                  <button type="button" onClick={() => setOnlyFavorites(!onlyFavorites)} className={`rounded-2xl border px-3 py-3 text-[10px] font-semibold transition ${onlyFavorites ? "border-[#5f7f70] bg-[#5f7f70] text-[#f8f5ee]" : "border-[#dedfd6] bg-white/62 text-[#74786d] hover:border-[#9bb4a6] hover:bg-white hover:text-[#1f211c]"}`}>
                    收藏 {favorites.length}
                  </button>
                  <button type="button" onClick={clearFilters} className="rounded-2xl border border-[#dedfd6] bg-white/62 px-3 py-3 text-[10px] font-semibold text-[#74786d] transition hover:border-[#9bb4a6] hover:bg-white hover:text-[#1f211c]">
                    重置
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#dedfd6]/80 pt-3">
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#74786d]">
                  <span className="inspo-num rounded-full border border-[#dedfd6] bg-[#f8f6f0] px-3 py-1.5 text-[#44483f]">{filtered.length} / {inspoList.length}</span>
                  {activeFilters.length ? activeFilters.slice(0, 5).map((item) => (
                    <span key={item} className="rounded-full border border-[#dedfd6] bg-white px-3 py-1.5">{item}</span>
                  )) : <span>未启用筛选</span>}
                </div>
              </div>
            </div>

            <div className="inspo-enter mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {topTags.map(([name, count]) => (
                <button key={name} type="button" onClick={() => setTag(name)} className="group overflow-hidden rounded-[26px] border border-[#dedfd6]/90 bg-white/62 p-4 text-left shadow-[0_22px_80px_-74px_rgba(31,33,28,.28)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[#9bb4a6] hover:bg-white">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-semibold tracking-[-0.03em] text-[#30332c] group-hover:text-[#1f211c]">{name}</span>
                    <span className="inspo-num rounded-full bg-[#f8f6f0] px-2.5 py-1 font-mono text-[10px] text-[#989c91]">{count}</span>
                  </div>
                  <div className="mt-4 h-1 overflow-hidden rounded-full bg-[#dedfd6]">
                    <div className="inspo-line h-full rounded-full bg-[#5f7f70]" style={{ width: `${Math.max(8, (count / Math.max(1, stats.total)) * 100)}%` }} />
                  </div>
                </button>
              ))}
            </div>

            <section ref={resultRef} className="mt-6">
              {filtered.length > 0 ? (
                <div className={viewMode === "compact" ? "grid grid-cols-1 gap-3" : "grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3"}>
                  {filtered.map((site, index) => (
                    <div key={site.slug} className="inspo-result-card">
                      <InspoCard site={site} index={index} favorite={favorites.includes(site.slug)} compact={viewMode === "compact"} toneLabel={siteTone(site)} score={scoreSite(site)} onToggleFavorite={toggleFavorite} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid min-h-[420px] place-items-center rounded-[34px] border border-dashed border-[#c6c8bd] bg-white/58 p-8 text-center backdrop-blur-xl">
                  <div>
                    <div className="mx-auto mb-7 h-px w-24 bg-[#c6c8bd]" />
                    <h2 className="text-[clamp(34px,4vw,64px)] font-semibold leading-none tracking-[-0.06em] text-[#1f211c]">没有匹配结果</h2>
                    <p className="mx-auto mt-5 max-w-[390px] text-xs leading-6 text-[#74786d]">减少筛选条件，或搜索站点名称、描述、标签和学习方向。</p>
                    <button type="button" onClick={clearFilters} className="mt-7 rounded-full bg-[#1f211c] px-5 py-3 text-xs font-semibold text-[#f8f5ee] transition hover:-translate-y-0.5 hover:bg-[#30332c]">
                      清空筛选
                    </button>
                  </div>
                </div>
              )}
            </section>

            <section className="inspo-enter mt-8 grid gap-4 lg:grid-cols-3">
              <InfoBlock title="拆解视角" text="不只是收藏站点，而是记录它适合学习的版式、动效、配色、组件组织和前端实现思路。" />
              <InfoBlock title="原创边界" text="灵感站点只作为学习参考，实际项目中应重新设计结构、文案和交互，避免直接复制商业使用。" />
              <InfoBlock title="本地维护" text="收藏、筛选和排序保存在本地浏览器，方便持续维护自己的前端灵感资料馆。" />
            </section>

            <div className="inspo-enter mt-10 border-t border-[#dedfd6]/90 pt-5 [&_*]:!text-[#74786d]">
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
    <div className="rounded-[26px] border border-[#dedfd6]/90 bg-white/62 p-5 shadow-[0_26px_90px_-76px_rgba(31,33,28,.42)] backdrop-blur-xl">
      <div className="text-[8px] font-semibold uppercase tracking-[0.2em] text-[#989c91]">{label}</div>
      <div className="inspo-num mt-4 font-mono text-4xl font-semibold tracking-[-0.08em] text-[#1f211c]">{value}</div>
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
    <label className="block sm:col-span-1">
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
    <div className="rounded-[28px] border border-[#dedfd6]/90 bg-white/52 p-5 shadow-[0_20px_80px_-74px_rgba(31,33,28,.36)] backdrop-blur-xl">
      <div className="inspo-line mb-4 h-px w-20 bg-[#5f7f70]/50" />
      <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#989c91]">{title}</div>
      <p className="mt-3 text-[11px] leading-6 text-[#74786d]">{text}</p>
    </div>
  )
}
