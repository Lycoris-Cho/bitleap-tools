"use client"

import Link from "next/link"
import { useCurrentTool } from "@/app/lib/use-current-tool"

function HomeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path
        d="M3.75 10.75 12 3.9l8.25 6.85v8.1a1.4 1.4 0 0 1-1.4 1.4H5.15a1.4 1.4 0 0 1-1.4-1.4v-8.1Z"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.3 20.25v-5.9h5.4v5.9"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className="h-3 w-3"
      aria-hidden="true"
    >
      <path
        d="m7.5 4.5 5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

interface BreadcrumbProps {
  /**
   * light：浅色页面上的白色药丸（默认，保持原有观感）
   * dark：深色全屏页面上的毛玻璃药丸，避免出现突兀的白条
   */
  variant?: "light" | "dark"
}

export function Breadcrumb({ variant = "light" }: BreadcrumbProps) {
  const tool = useCurrentTool()
  const title = tool?.title || "工具"
  const dark = variant === "dark"

  return (
    <nav
      aria-label="面包屑导航"
      className="mb-6 inline-flex max-w-full items-center"
    >
      <div
        className={`group flex max-w-full items-center gap-1 rounded-full border px-2 py-1.5 backdrop-blur-xl backdrop-saturate-150 transition duration-300 ${
          dark
            ? "border-transparent bg-transparent text-white/60 hover:bg-white/[0.06]"
            : "border-black/[0.07] bg-white/[0.76] text-zinc-700 shadow-[0_8px_28px_-18px_rgba(0,0,0,.28)] hover:bg-white/[0.9] hover:shadow-[0_10px_30px_-18px_rgba(0,0,0,.34)]"
        }`}
      >
        <Link
          href="/"
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium transition-colors sm:text-xs ${
            dark
              ? "text-white/50 hover:bg-white/10 hover:text-white"
              : "text-zinc-500 hover:bg-black/[0.045] hover:text-zinc-950"
          }`}
        >
          <HomeIcon />
          <span>工具站</span>
        </Link>

        <span
          className={`flex shrink-0 items-center justify-center px-0.5 ${
            dark ? "text-white/20" : "text-zinc-300"
          }`}
        >
          <ChevronIcon />
        </span>

        <span
          aria-current="page"
          title={title}
          className={`min-w-0 truncate rounded-full px-2 py-1 text-[11px] font-semibold tracking-[-0.01em] sm:max-w-[260px] sm:text-xs md:max-w-[360px] ${
            dark ? "text-white/85" : "text-zinc-900"
          }`}
        >
          {title}
        </span>
      </div>
    </nav>
  )
}
