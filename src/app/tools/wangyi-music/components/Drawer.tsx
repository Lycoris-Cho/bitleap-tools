'use client'

import { useEffect, type ReactNode } from 'react'
import { IconClose } from './icons'

interface DrawerProps {
    title: string
    subtitle?: string
    onClose: () => void
    children: ReactNode
}

/** 右侧抽屉，移动端为全宽面板 */
export default function Drawer({ title, subtitle, onClose, children }: DrawerProps) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    return (
        <div className="fixed inset-0 z-50">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
                style={{ animation: 'wy-fade .2s ease-out' }}
                onClick={onClose}
            />
            <aside
                className="absolute right-0 top-0 flex h-full w-full max-w-[420px] flex-col border-l border-white/10 bg-[#0b0b10]/96 shadow-[-30px_0_80px_-40px_rgba(0,0,0,.9)] backdrop-blur-2xl"
                style={{ animation: 'wy-slide-in .26s cubic-bezier(.22,.8,.28,1)' }}
                role="dialog"
                aria-label={title}
            >
                <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/8 px-5 py-4">
                    <div className="min-w-0">
                        <h2 className="truncate text-sm font-semibold text-white/90">{title}</h2>
                        {subtitle && <p className="mt-0.5 truncate text-[11px] text-white/40">{subtitle}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="关闭面板"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/12 hover:text-white"
                    >
                        <IconClose className="h-4 w-4" />
                    </button>
                </header>

                <div className="flex min-h-0 flex-1 flex-col">{children}</div>
            </aside>
        </div>
    )
}
