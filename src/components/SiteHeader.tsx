'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
    {
        href: '/',
        label: '工具站',
    },
    {
        href: '/community',
        label: 'BL社区',
    },
    {
        href: '/about',
        label: '关于我',
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

            <circle
                cx="25.25"
                cy="22.7"
                r="1.6"
                fill="currentColor"
            />
        </svg>
    )
}

export default function SiteHeader() {
    const pathname = usePathname()

    const isActive = (href: string) => {
        if (href === '/') {
            return pathname === '/'
        }

        return pathname.startsWith(href)
    }

    return (
        <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-black/[0.06] bg-[#f7f7f5]">
            {/* 顶部非常轻的品牌渐变线 */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/50 to-transparent" />

            <div className="mx-auto flex h-full w-full items-center justify-between px-4 sm:px-6 lg:px-8 xl:px-10">
                {/* 左侧品牌 */}
                <Link
                    href="/"
                    className="group flex min-w-0 items-center gap-3"
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
                        <span className="font-['myFont',sans-serif] text-[20px] font-bold tracking-[-0.045em] text-zinc-950 sm:text-[22px]">
                            BitLeap
                        </span>

                        <span className="hidden text-[10px] font-medium tracking-[-0.01em] text-zinc-400 md:inline">
                            Tiny tools, Big leap
                        </span>
                    </div>
                </Link>

                {/* 右侧导航 */}
                <nav className="flex items-center gap-1 rounded-full border border-black/[0.06] bg-white p-1 shadow-[0_8px_24px_-18px_rgba(0,0,0,.28)]">
                    {navItems.map((item) => {
                        const active = isActive(item.href)

                        const navClassName = active
                            ? 'relative flex h-8 items-center justify-center rounded-full bg-zinc-950 px-3 text-[11px] font-medium text-white shadow-sm transition-all duration-300 sm:px-4 sm:text-xs'
                            : 'relative flex h-8 items-center justify-center rounded-full px-3 text-[11px] font-medium text-zinc-500 transition-all duration-300 hover:bg-zinc-100 hover:text-zinc-950 sm:px-4 sm:text-xs'

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={navClassName}
                            >
                                {item.label}

                                {active && (
                                    <span className="absolute right-[7px] top-[6px] h-1 w-1 rounded-full bg-violet-400" />
                                )}
                            </Link>
                        )
                    })}
                </nav>
            </div>
        </header>
    )
}