import { inspoList, type InspoSite } from '../data'
import { notFound } from 'next/navigation'
import FooterNote from '@/components/FooterNote'

// ✅ 和 InspoCard 完全一致的配色映射
const tagStyles: Record<string, string> = {
  '动效重': 'text-amber-700 bg-amber-50 border-amber-200',
  '极简': 'text-blue-700 bg-blue-50 border-blue-200',
  '高对比': 'text-violet-700 bg-violet-50 border-violet-200',
  '暗黑': 'text-gray-800 bg-gray-100 border-gray-300',
  '复古': 'text-rose-700 bg-rose-50 border-rose-200',
  '玻璃拟态': 'text-cyan-700 bg-cyan-50 border-cyan-200',
  '粗野主义': 'text-orange-700 bg-orange-50 border-orange-200',
  'UI': 'text-blue-700 bg-blue-50 border-blue-200',
  '可商用': 'text-emerald-700 bg-emerald-50 border-emerald-200',
}

function getTagClass(tag: string) {
  return (
    tagStyles[tag] ??
    'text-app-muted bg-gray-50 border-app-border'
  )
}

export default async function InspoDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const site: InspoSite | undefined = inspoList.find(
    (s) => s.slug === slug
  )

  if (!site) {
    notFound()
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      {/* 标题区 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          {site.name}
        </h1>
        <p className="text-app-muted leading-relaxed">
          {site.desc}
        </p>
      </div>

      {/* ✅ 彩色标签（和 Card 一致） */}
      <div className="flex flex-wrap gap-2 mb-10">
        {site.tags.map((tag) => (
          <span
            key={tag}
            className={`text-[12px] font-medium px-3 py-1 rounded-lg border ${getTagClass(tag)}`}
          >
            {tag}
          </span>
        ))}
        {/* ✅ 分类标签：永远灰色（元数据） */}
        <span className="text-[12px] font-medium px-3 py-1 rounded-lg border text-app-muted bg-gray-50 border-app-border">
          {site.category}
        </span>
      </div>

      {/* 信息区 */}
      <section className="space-y-8 mb-12">
        {/* 官网 */}
        <div>
          <div className="text-sm font-medium text-app-text mb-2">
            官方网站
          </div>
          <a
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
          >
            访问网站
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

        {/* 适合学什么 */}
        <div>
          <div className="text-sm font-medium text-app-text mb-2">
            适合学什么
          </div>
          <code className="block text-sm bg-gray-50 border border-app-border rounded-xl px-4 py-3 font-mono break-all">
            {site.learn}
          </code>
        </div>

        {/* 拆解提示 */}
        <div>
          <div className="text-sm font-medium text-app-text mb-2">
            拆解提示
          </div>
          <pre className="bg-gray-900 text-gray-100 rounded-xl p-5 overflow-auto text-sm leading-relaxed font-mono">
{`// 打开 DevTools → Elements → Animations
// 1. 找到关键 @keyframes
// 2. 对比 cubic-bezier 曲线
// 3. 尝试用 clamp() 复刻字号
// 4. 用 Container Query 重构布局`}
          </pre>
        </div>

        {/* 使用建议 */}
        {site.note && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
            💡 {site.note}
          </div>
        )}
      </section>

      {/* 免责 */}
      <div className="text-sm text-gray-500 border-t pt-6">
        所有站点版权归原作者所有，仅作前端学习参考。
      </div>
      <FooterNote />
    </div>
  )
}