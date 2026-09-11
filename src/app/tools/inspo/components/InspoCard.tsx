"use client"

import Link from "next/link"
import type { MouseEvent } from "react"
import type { InspoSite } from "../data"

const tagStyles: Record<string, string> = {
  "动效重": "border-amber-200 bg-amber-50 text-amber-700",
  "极简": "border-[#bfd3c7] bg-[#eef6f1] text-[#4f685c]",
  "高对比": "border-zinc-200 bg-zinc-50 text-zinc-700",
  "暗黑": "border-stone-300 bg-stone-100 text-stone-700",
  "复古": "border-[#d6d0bf] bg-[#f5f0e6] text-[#76674e]",
  "玻璃拟态": "border-[#bfd3c7] bg-[#eef6f1] text-[#4f685c]",
  "粗野主义": "border-orange-200 bg-orange-50 text-orange-700",
  "UI": "border-[#bfd3c7] bg-[#eef6f1] text-[#4f685c]",
  "可商用": "border-emerald-200 bg-emerald-50 text-emerald-700",
}

function getTagClass(tag: string) {
  return tagStyles[tag] ?? "border-stone-200 bg-stone-50 text-stone-500"
}

export default function InspoCard({
  site,
  index = 0,
  favorite = false,
  compact = false,
  toneLabel = "视觉参考",
  score = 0,
  onToggleFavorite,
}: {
  site: InspoSite
  index?: number
  favorite?: boolean
  compact?: boolean
  toneLabel?: string
  score?: number
  onToggleFavorite?: (slug: string) => void
}) {
  const maxTags = compact ? 3 : 4
  const visibleTags = site.tags.slice(0, maxTags)
  const hiddenTagsCount = Math.max(0, site.tags.length - maxTags)
  const scoreWidth = `${Math.min(100, Math.max(12, (score / 10) * 100))}%`

  const handleFavorite = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    onToggleFavorite?.(site.slug)
  }

  if (compact) {
    return (
      <Link href={`/tools/inspo/${site.slug}`} className="group grid gap-4 rounded-[24px] border border-[#dedfd6]/90 bg-white/68 p-4 shadow-[0_22px_82px_-72px_rgba(31,33,28,.38)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[#9bb4a6] hover:bg-white sm:grid-cols-[64px_minmax(0,1fr)_auto] sm:items-center">
        <div className="inspo-num font-mono text-[11px] text-[#989c91]">{String(index + 1).padStart(2, "0")}</div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-semibold tracking-[-0.04em] text-[#1f211c]">{site.name}</h3>
            <span className="rounded-full border border-[#bfd3c7] bg-[#eef6f1] px-2.5 py-1 text-[9px] font-semibold text-[#4f685c]">{toneLabel}</span>
            <span className="rounded-full border border-[#dedfd6] bg-[#f8f6f0] px-2.5 py-1 text-[9px] font-semibold text-[#74786d]">{site.category}</span>
          </div>
          <p className="mt-1 line-clamp-1 text-xs leading-5 text-[#74786d]">{site.desc}</p>
        </div>
        <div className="flex items-center gap-2 sm:justify-end">
          <button type="button" onClick={handleFavorite} className={`grid h-9 w-9 place-items-center rounded-full border text-sm transition ${favorite ? "border-[#5f7f70] bg-[#5f7f70] text-[#f8f5ee]" : "border-[#dedfd6] bg-white text-[#b6b9ae] hover:border-[#9bb4a6] hover:text-[#4f685c]"}`} aria-label={favorite ? "取消收藏" : "收藏站点"}>
            ★
          </button>
          <span className="rounded-full border border-[#dedfd6] bg-white px-3 py-2 text-[10px] font-semibold text-[#74786d] transition group-hover:border-[#9bb4a6] group-hover:text-[#4f685c]">拆解 →</span>
        </div>
      </Link>
    )
  }

  return (
    <Link href={`/tools/inspo/${site.slug}`} className="group relative block h-full overflow-hidden rounded-[30px] border border-[#dedfd6]/90 bg-white/68 p-5 shadow-[0_28px_96px_-78px_rgba(31,33,28,.42)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-[#9bb4a6] hover:bg-white hover:shadow-[0_34px_120px_-80px_rgba(95,127,112,.24)]">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#8fa596]/16 blur-3xl transition group-hover:bg-[#8fa596]/26" />
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />

      <div className="relative z-10 flex h-full flex-col">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="inspo-num mb-3 font-mono text-[10px] text-[#989c91]">{String(index + 1).padStart(2, "0")}</div>
            <h3 className="line-clamp-2 text-2xl font-semibold leading-[1.02] tracking-[-0.055em] text-[#1f211c]">{site.name}</h3>
          </div>

          <button type="button" onClick={handleFavorite} className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border text-sm transition ${favorite ? "border-[#5f7f70] bg-[#5f7f70] text-[#f8f5ee]" : "border-[#dedfd6] bg-white/72 text-[#b6b9ae] hover:border-[#9bb4a6] hover:text-[#4f685c]"}`} aria-label={favorite ? "取消收藏" : "收藏站点"}>
            ★
          </button>
        </div>

        <p className="line-clamp-3 min-h-[72px] text-sm leading-6 text-[#74786d]">{site.desc}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full border border-[#bfd3c7] bg-[#eef6f1] px-3 py-1.5 text-[10px] font-semibold text-[#4f685c]">{toneLabel}</span>
          <span className="rounded-full border border-[#dedfd6] bg-[#f8f6f0] px-3 py-1.5 text-[10px] font-semibold text-[#74786d]">{site.category}</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {visibleTags.map((item) => (
            <span key={item} className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${getTagClass(item)}`}>
              {item}
            </span>
          ))}
          {hiddenTagsCount > 0 && (
            <span className="rounded-full border border-[#dedfd6] bg-[#f8f6f0] px-2.5 py-1 text-[10px] font-semibold text-[#74786d]">+{hiddenTagsCount}</span>
          )}
        </div>

        <div className="mt-5 rounded-[22px] border border-[#dedfd6]/90 bg-[#f8f6f0]/70 p-4">
          <div className="text-[8px] font-semibold uppercase tracking-[0.16em] text-[#989c91]">适合学</div>
          <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-[#55594f]">{site.learn}</p>
        </div>

        <div className="mt-auto pt-6">
          <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-t border-[#dedfd6] pt-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-[8px] font-semibold uppercase tracking-[0.16em] text-[#989c91]">
                <span>Inspiration value</span>
                <span className="inspo-num">{score}/10</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#dedfd6]">
                <div className="h-full rounded-full bg-[#5f7f70] transition-all duration-500" style={{ width: scoreWidth }} />
              </div>
            </div>

            <span className="rounded-full border border-[#dedfd6] bg-white px-3 py-2 text-[10px] font-semibold text-[#74786d] transition group-hover:border-[#9bb4a6] group-hover:text-[#4f685c]">查看拆解 →</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
