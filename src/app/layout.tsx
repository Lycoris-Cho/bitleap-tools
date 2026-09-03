import type { Metadata } from 'next'
import './globals.css'

import CopyToast from '@/components/CopyToast'
import SiteHeader from '@/components/SiteHeader'

import { Analytics } from '@vercel/analytics/next'

export const metadata: Metadata = {
    title: 'BitLeap – Tiny tools',
    description:
        'A collection of fast, privacy-first online utilities.',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="zh-CN" suppressHydrationWarning>
            <body className="min-h-screen bg-app-bg text-app-text antialiased">
                <CopyToast />

                <div className="flex min-h-screen flex-col">
                    <SiteHeader />

                    <main className="flex-1 pt-16 bg-app-bg">
                        {children}
                    </main>
                </div>

                <Analytics />
            </body>
        </html>
    )
}