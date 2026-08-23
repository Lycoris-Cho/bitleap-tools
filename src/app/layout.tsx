import type { Metadata } from "next";
import "./globals.css";
import Link from 'next/link'
import CopyToast from '@/components/CopyToast'
import { Analytics } from '@vercel/analytics/next'

export const metadata: Metadata = {
  title: "BitLeap – Tiny tools",
  description: "A collection of fast, privacy-first online utilities.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className="min-h-screen flex flex-col bg-app-bg text-app-text antialiased">
        <CopyToast />
        <div className="flex-1 flex flex-col">
          <header className="font-['myFont',sans-serif] fixed top-0 left-0 right-0 h-16 border-b border-app-border bg-app-bg/90 backdrop-blur-sm flex items-center px-4 sm:px-6 lg:px-10 z-50">
            <div className="w-full flex justify-between items-center">
              {/* 左侧 Logo */}
              <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
                <span className="font-bold text-xl sm:text-2xl text-app-text group-hover:opacity-80 transition">
                  BitLeap
                </span>
                <span className="hidden sm:inline font-light text-sm sm:text-lg text-app-muted">
                  - Tiny tools, Big leap
                </span>
              </Link>

              {/* 右侧导航 */}
              <nav className="flex items-center gap-4 sm:gap-6 text-sm">
                <Link href="/" className="text-app-muted hover:text-app-text transition">
                  首页
                </Link>
                <Link href="/about" className="text-app-muted hover:text-app-text transition">
                  关于
                </Link>
              </nav>
            </div>
          </header>

          <main className="flex-1 pt-16 bg-app-bg">
            {children}
            <Analytics /> 
          </main>
        </div>
      </body>
    </html>
  )
}