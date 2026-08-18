'use client'

import Link from 'next/link'
import type { ApiEntry } from '../data'

const tagStyles: Record<string, string> = {
  'Auth: No': 'text-emerald-700 bg-emerald-50 border-emerald-200',
  'Auth: ApiKey': 'text-amber-700 bg-amber-50 border-amber-200',
  'Auth: OAuth': 'text-amber-700 bg-amber-50 border-amber-200',
  'CORS: Yes': 'text-blue-700 bg-blue-50 border-blue-200',
  'CORS: No': 'text-app-muted bg-gray-50 border-app-border',
  'CORS: Unknown': 'text-app-muted bg-gray-50 border-app-border',
  '商用: Yes': 'text-violet-700 bg-violet-50 border-violet-200',
  '商用: No': 'text-app-muted bg-gray-50 border-app-border',
  '商用: Unknown': 'text-app-muted bg-gray-50 border-app-border',
}

function getTagClass(key: string) {
  return tagStyles[key] ?? 'text-app-muted bg-gray-50 border-app-border'
}

export default function ApiCard({ api }: { api: ApiEntry }) {
  return (
    <Link
      href={`/tools/api-directory/${api.slug}`}
      className="
        group
        block
        rounded-2xl
        border border-app-border
        bg-app-bg
        p-6
        transition
        hover:border-gray-300
        hover:shadow-lg
        hover:-translate-y-0.5
      "
      suppressHydrationWarning
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <h2 className="text-base font-semibold text-app-text group-hover:text-black">
          {api.name}
        </h2>
        <span className="shrink-0 text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
          {api.category}
        </span>
      </div>

      <p className="text-sm text-app-muted mb-5">
        {api.desc}
      </p>

      <div className="flex flex-wrap gap-2">
        {[
          `Auth: ${api.auth}`,
          `CORS: ${api.cors}`,
          `商用: ${api.commercial}`,
        ].map((tag) => (
          <span
            key={tag}
            className={`text-[11px] font-medium px-2 py-0.5 rounded border ${getTagClass(
              tag
            )}`}
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-5 text-sm font-medium text-app-muted group-hover:text-black transition">
        查看详情 →
      </div>
    </Link>
  )
}