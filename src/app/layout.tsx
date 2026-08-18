import type { Metadata } from "next";
import "./globals.css";
import Link from 'next/link'
import CopyToast from '@/components/CopyToast'

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
                <div className="font-bold text-2xl flex items-center gap-3 text-app-text">
                  BitLeap
                  <span className="font-light text-2xl">- Tiny tools, Big leap</span>
                </div>
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
            </main>
          </div>
      </body>
    </html>
  )
}