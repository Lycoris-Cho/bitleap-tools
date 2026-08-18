'use client'

import Link from 'next/link'
import { useCurrentTool } from '@/app/lib/use-current-tool'

export function Breadcrumb() {
  const tool = useCurrentTool()

  return (
    <nav className="flex items-center gap-2 mb-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-app-muted hover:text-violet-600 transition"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
        </svg>
        工具站
      </Link>

      <span className="text-app-muted text-sm">/</span>

      <span className="text-sm font-medium text-gray-900">
        {tool?.title || '工具'}
      </span>
    </nav>
  )
}