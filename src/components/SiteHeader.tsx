"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const navItems = [
  {
    href: "/",
    label: "工具站",
  },
  {
    href: "/community",
    label: "BL社区",
  },
  {
    href: "/aboutBit",
    label: "关于BitLeap",
  },
  {
    href: "/about",
    label: "关于我",
  },
]

function GearIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className="h-full w-full"
      aria-hidden="true"
    >
      <path
        d="M27.5 4.5 28.7 9a16 16 0 0 1 3.9 1.6l4-2.3 3.1 3.1-2.3 4a16 16 0 0 1 1.6 3.9l4.5 1.2v4.4L39 26.1a16 16 0 0 1-1.6 3.9l2.3 4-3.1 3.1-4-2.3a16 16 0 0 1-3.9 1.6l-1.2 4.5h-4.4l-1.2-4.5a16 16 0 0 1-3.9-1.6l-4 2.3-3.1-3.1 2.3-4a16 16 0 0 1-1.6-3.9L7 24.9v-4.4l4.5-1.2a16 16 0 0 1 1.6-3.9l-2.3-4 3.1-3.1 4 2.3A16 16 0 0 1 21.8 9L23 4.5h4.5Z"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinejoin="round"
      />

      <circle
        cx="25.25"
        cy="22.7"
        r="6.2"
        stroke="currentColor"
        strokeWidth="1.45"
      />

      <circle cx="25.25" cy="22.7" r="1.6" fill="currentColor" />
    </svg>
  )
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <span className="relative block h-4 w-4">
      <span
        className={`absolute left-0 top-[3px] h-[1.5px] w-4 rounded-full bg-current transition-all duration-300 ${
          open ? "translate-y-[5px] rotate-45" : ""
        }`}
      />
      <span
        className={`absolute left-0 top-[8px] h-[1.5px] w-4 rounded-full bg-current transition-all duration-300 ${
          open ? "opacity-0" : ""
        }`}
      />
      <span
        className={`absolute left-0 top-[13px] h-[1.5px] w-4 rounded-full bg-current transition-all duration-300 ${
          open ? "-translate-y-[5px] -rotate-45" : ""
        }`}
      />
    </span>
  )
}

export default function SiteHeader() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/"
    }

    return pathname === href || pathname.startsWith(`${href}/`)
  }

  // 路由切换后自动关闭移动端菜单
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // 菜单打开时锁定页面滚动
  useEffect(() => {
    if (!mobileOpen) return

    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previous
    }
  }, [mobileOpen])

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-black/[0.06] bg-[#f7f7f5]/95 backdrop-blur-xl">
        {/* 顶部品牌渐变线 */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/50 to-transparent" />

        <div className="mx-auto flex h-full w-full items-center justify-between px-4 sm:px-6 lg:px-8 xl:px-10">
          {/* 左侧品牌 */}
          <Link
            href="/"
            className="group flex min-w-0 shrink-0 items-center gap-2.5 sm:gap-3"
          >
            {/* Gear */}
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[12px] border border-black/[0.07] bg-white text-zinc-900 shadow-[0_8px_22px_-16px_rgba(0,0,0,.35)] transition duration-300 group-hover:-translate-y-0.5">
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-sky-50" />

              <span className="relative z-10 h-[21px] w-[21px] animate-[spin_5s_linear_infinite] motion-reduce:animate-none">
                <GearIcon />
              </span>

              <span className="absolute right-[5px] top-[5px] z-20 h-1.5 w-1.5 rounded-full bg-violet-500 ring-2 ring-white" />
            </span>

            {/* Logo */}
            <div className="flex min-w-0 items-baseline gap-2.5">
              <span className="whitespace-nowrap font-['myFont',sans-serif] text-[20px] font-bold tracking-[-0.045em] text-zinc-950 sm:text-[22px]">
                BitLeap
              </span>

              <span className="hidden whitespace-nowrap text-[10px] font-medium tracking-[-0.01em] text-zinc-400 lg:inline">
                Tiny tools, Big leap
              </span>
            </div>
          </Link>

          {/* 桌面导航 */}
          <nav className="hidden items-center gap-1 rounded-full border border-black/[0.06] bg-white p-1 shadow-[0_8px_24px_-18px_rgba(0,0,0,.28)] md:flex">
            {navItems.map((item) => {
              const active = isActive(item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    active
                      ? "relative flex h-8 items-center justify-center whitespace-nowrap rounded-full bg-zinc-950 px-4 text-xs font-medium text-white shadow-sm transition-all duration-300"
                      : "relative flex h-8 items-center justify-center whitespace-nowrap rounded-full px-4 text-xs font-medium text-zinc-500 transition-all duration-300 hover:bg-zinc-100 hover:text-zinc-950"
                  }
                >
                  {item.label}

                  {active && (
                    <span className="absolute right-[7px] top-[6px] h-1 w-1 rounded-full bg-violet-400" />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* 移动端菜单按钮 */}
          <button
            type="button"
            aria-label={mobileOpen ? "关闭菜单" : "打开菜单"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((value) => !value)}
            className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] border transition-all duration-300 md:hidden ${
              mobileOpen
                ? "border-zinc-900 bg-zinc-950 text-white shadow-lg"
                : "border-black/[0.07] bg-white text-zinc-900 shadow-[0_8px_22px_-16px_rgba(0,0,0,.35)]"
            }`}
          >
            <MenuIcon open={mobileOpen} />

            {!mobileOpen && (
              <span className="absolute right-[6px] top-[6px] h-1.5 w-1.5 rounded-full bg-violet-500" />
            )}
          </button>
        </div>
      </header>

      {/* 移动端菜单 */}
      <div
        className={`fixed inset-0 z-40 transition-all duration-300 md:hidden ${
          mobileOpen
            ? "pointer-events-auto visible opacity-100"
            : "pointer-events-none invisible opacity-0"
        }`}
      >
        {/* 遮罩 */}
        <button
          type="button"
          aria-label="关闭菜单"
          onClick={() => setMobileOpen(false)}
          className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
        />

        {/* 菜单面板 */}
        <div
          className={`absolute left-3 right-3 top-[72px] overflow-hidden rounded-[24px] border border-black/[0.07] bg-[#fafaf8]/95 p-2 shadow-[0_24px_70px_-24px_rgba(0,0,0,.32)] backdrop-blur-2xl transition-all duration-300 ${
            mobileOpen
              ? "translate-y-0 scale-100 opacity-100"
              : "-translate-y-2 scale-[0.98] opacity-0"
          }`}
        >
          <div className="grid gap-1">
            {navItems.map((item, index) => {
              const active = isActive(item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative flex min-h-14 items-center justify-between rounded-[17px] px-4 transition-all duration-300 ${
                    active
                      ? "bg-zinc-950 text-white shadow-sm"
                      : "text-zinc-700 hover:bg-black/[0.04] hover:text-zinc-950"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[9px] ${
                        active
                          ? "bg-white/10 text-white/65"
                          : "bg-zinc-100 text-zinc-400"
                      }`}
                    >
                      0{index + 1}
                    </span>

                    <span className="whitespace-nowrap text-[14px] font-medium">
                      {item.label}
                    </span>
                  </div>

                  <span
                    className={`text-lg transition-transform duration-300 group-hover:translate-x-0.5 ${
                      active ? "text-violet-300" : "text-zinc-300"
                    }`}
                  >
                    →
                  </span>

                  {active && (
                    <span className="absolute right-4 top-3 h-1.5 w-1.5 rounded-full bg-violet-400" />
                  )}
                </Link>
              )
            })}
          </div>

          <div className="mx-4 my-2 h-px bg-black/[0.06]" />

          <div className="flex items-center justify-between px-4 pb-3 pt-1">
            <span className="text-[9px] font-medium tracking-[0.12em] text-zinc-400">
              BITLEAP
            </span>

            <span className="text-[9px] text-zinc-300">
              Tiny tools, Big leap
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
