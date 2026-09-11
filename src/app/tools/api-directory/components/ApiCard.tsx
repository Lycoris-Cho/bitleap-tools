"use client"

import Link from "next/link"
import type { MouseEvent } from "react"
import type { ApiEntry } from "../data"

const tagStyles: Record<string, string> = {
  "Auth: No": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Auth: ApiKey": "border-stone-300 bg-stone-100 text-stone-700",
  "Auth: OAuth": "border-stone-300 bg-stone-100 text-stone-700",
  "CORS: Yes": "border-[#bfd3c7] bg-[#eef6f1] text-[#4f685c]",
  "CORS: No": "border-stone-200 bg-stone-50 text-stone-500",
  "CORS: Unknown": "border-stone-200 bg-stone-50 text-stone-500",
  "商用: Yes": "border-[#d6d0bf] bg-[#f5f0e6] text-[#76674e]",
  "商用: No": "border-stone-200 bg-stone-50 text-stone-500",
  "商用: Unknown": "border-stone-200 bg-stone-50 text-stone-500",
}

function getTagClass(key: string) {
  return tagStyles[key] ?? "border-stone-200 bg-stone-50 text-stone-500"
}

export default function ApiCard({
  api,
  index = 0,
  favorite = false,
  compact = false,
  statusLabel = "需评估",
  statusClassName = "border-zinc-200 bg-zinc-50 text-zinc-700",
  score = 0,
  onToggleFavorite,
}: {
  api: ApiEntry
  index?: number
  favorite?: boolean
  compact?: boolean
  statusLabel?: string
  statusClassName?: string
  score?: number
  onToggleFavorite?: (slug: string) => void
}) {
  const tags = [`Auth: ${api.auth}`, `CORS: ${api.cors}`, `商用: ${api.commercial}`]
  const scoreWidth = `${Math.min(100, Math.max(12, (score / 10) * 100))}%`

  const handleFavorite = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    onToggleFavorite?.(api.slug)
  }

  if (compact) {
    return (
      <Link href={`/tools/api-directory/${api.slug}`} className="group grid gap-4 rounded-[24px] border border-[#dedfd6]/80 bg-white/64 p-4 shadow-[0_22px_82px_-72px_rgba(31,33,28,.30)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[#9bb4a6] hover:bg-white sm:grid-cols-[64px_minmax(0,1fr)_auto] sm:items-center">
        <div className="api-porcelain-num font-mono text-[11px] text-[#989c91]">{String(index + 1).padStart(2, "0")}</div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-lg font-semibold tracking-[-0.04em] text-[#1f211c]">{api.name}</h2>
            <span className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold ${statusClassName}`}>{statusLabel}</span>
            <span className="rounded-full border border-[#dedfd6] bg-[#f8f6f0] px-2.5 py-1 text-[9px] font-semibold text-[#74786d]">{api.category}</span>
          </div>
          <p className="mt-1 line-clamp-1 text-xs leading-5 text-[#74786d]">{api.desc}</p>
        </div>
        <div className="flex items-center gap-2 sm:justify-end">
          <button type="button" onClick={handleFavorite} className={`grid h-9 w-9 place-items-center rounded-full border text-sm transition ${favorite ? "border-[#5f7f70] bg-[#5f7f70] text-[#f8f5ee]" : "border-[#dedfd6] bg-white text-[#b7baaf] hover:border-[#9bb4a6] hover:text-[#4f685c]"}`} aria-label={favorite ? "取消收藏" : "收藏 API"}>
            ★
          </button>
          <span className="rounded-full border border-[#dedfd6] bg-white px-3 py-2 text-[10px] font-semibold text-[#74786d] transition group-hover:border-[#9bb4a6] group-hover:text-[#4f685c]">详情 →</span>
        </div>
      </Link>
    )
  }

  return (
    <Link href={`/tools/api-directory/${api.slug}`} className="group relative block h-full overflow-hidden rounded-[30px] border border-[#dedfd6]/80 bg-white/64 p-5 shadow-[0_28px_96px_-78px_rgba(31,33,28,.34)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-[#9bb4a6] hover:bg-white hover:shadow-[0_34px_120px_-80px_rgba(95,127,112,.22)]">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#8fa596]/16 blur-3xl transition group-hover:bg-[#8fa596]/26" />
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />

      <div className="relative z-10 flex h-full flex-col">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="api-porcelain-num mb-3 font-mono text-[10px] text-[#989c91]">{String(index + 1).padStart(2, "0")}</div>
            <h2 className="line-clamp-2 text-2xl font-semibold leading-[1.02] tracking-[-0.055em] text-[#1f211c]">{api.name}</h2>
          </div>

          <button type="button" onClick={handleFavorite} className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border text-sm transition ${favorite ? "border-[#5f7f70] bg-[#5f7f70] text-[#f8f5ee]" : "border-[#dedfd6] bg-white/72 text-[#b7baaf] hover:border-[#9bb4a6] hover:text-[#4f685c]"}`} aria-label={favorite ? "取消收藏" : "收藏 API"}>
            ★
          </button>
        </div>

        <p className="line-clamp-3 min-h-[72px] text-sm leading-6 text-[#74786d]">{api.desc}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold ${statusClassName}`}>{statusLabel}</span>
          <span className="rounded-full border border-[#dedfd6] bg-[#f8f6f0] px-3 py-1.5 text-[10px] font-semibold text-[#74786d]">{api.category}</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag} className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${getTagClass(tag)}`}>
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-auto pt-6">
          <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-t border-[#dedfd6] pt-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-[8px] font-semibold uppercase tracking-[0.16em] text-[#989c91]">
                <span>Frontend readiness</span>
                <span className="api-porcelain-num">{score}/10</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#dedfd6]/80">
                <div className="h-full rounded-full bg-[#5f7f70] transition-all duration-500" style={{ width: scoreWidth }} />
              </div>
            </div>

            <span className="rounded-full border border-[#dedfd6] bg-white px-3 py-2 text-[10px] font-semibold text-[#74786d] transition group-hover:border-[#9bb4a6] group-hover:text-[#4f685c]">详情 →</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
