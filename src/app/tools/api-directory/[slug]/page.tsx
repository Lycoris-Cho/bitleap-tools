import { apiList } from '../data'
import { notFound } from 'next/navigation'

/** 和 ApiCard 一致的标签颜色映射 */
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
  return (
    tagStyles[key] ??
    'text-app-muted bg-gray-50 border-app-border'
  )
}

export default async function ApiDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const api = apiList.find((a) => a.slug === slug)

  if (!api) {
    notFound()
  }

  const tags = [
    `Auth: ${api.auth}`,
    `CORS: ${api.cors}`,
    `商用: ${api.commercial}`,
  ]

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      {/* 标题区 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          {api.name}
        </h1>
        <p className="text-app-muted leading-relaxed">
          {api.desc}
        </p>
      </div>

      {/* 彩色标签 */}
      <div className="flex flex-wrap gap-2 mb-10">
        {tags.map((tag) => (
          <span
            key={tag}
            className={`text-[12px] font-medium px-3 py-1 rounded-lg border ${getTagClass(
              tag
            )}`}
          >
            {tag}
          </span>
        ))}
        <span className="text-[12px] font-medium px-3 py-1 rounded-lg border text-app-muted bg-gray-50 border-app-border">
          {api.category}
        </span>
      </div>

      {/* 信息区 */}
      <section className="space-y-8 mb-12">
        {/* 官方文档 */}
        <div>
          <div className="text-sm font-medium text-app-text mb-2">
            官方文档
          </div>
          <a
            href={api.docs}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
          >
            查看官方文档
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 13v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h6"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 3h6v6M10 14L21 3"
              />
            </svg>
          </a>
        </div>

        {/* Base URL */}
        <div>
          <div className="text-sm font-medium text-app-text mb-2">
            Base URL
          </div>
          <code className="block text-sm bg-gray-50 border border-app-border rounded-xl px-4 py-3 font-mono break-all">
            {api.baseUrl}
          </code>
        </div>

        {/* 示例请求 */}
        <div>
          <div className="text-sm font-medium text-app-text mb-2">
            示例请求
          </div>
          <pre className="bg-gray-900 text-gray-100 rounded-xl p-5 overflow-auto text-sm leading-relaxed font-mono">
{api.example}
          </pre>
        </div>

        {/* 备注 */}
        {api.note && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
            💡 {api.note}
          </div>
        )}
      </section>

      {/* 免责 */}
      <div className="text-sm text-gray-500 border-t pt-6">
        所有使用限制请以原提供方 Terms of Service 为准。
      </div>
    </div>
  )
}