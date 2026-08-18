import Link from 'next/link'
import type { InspoSite } from '../data'

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

export default function InspoCard({ site }: { site: InspoSite }) {
  const MAX_TAGS = 3
  const visibleTags = site.tags.slice(0, MAX_TAGS)
  const hiddenTagsCount = site.tags.length - MAX_TAGS

  return (
    <Link
      href={`/tools/inspo/${site.slug}`}
      className="group relative flex flex-col justify-between rounded-2xl bg-app-bg p-6 border border-app-border transition-transform duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-100 hover:bg-gray-50"

    >
      {/* ===== Header：标题 + 分类 ===== */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <h3 className="text-lg font-semibold text-app-text group-hover:text-black transition-colors">
          {site.name}
        </h3>
        {/* ✅ 分类：极简文字，无背景，无边框 */}
        <span className="shrink-0 text-[11px] font-medium uppercase tracking-widest text-gray-500 px-2 py-1 rounded-full bg-gray-100 pt-0">
          {site.category}
        </span>
      </div>

      {/* ===== Body：描述 ===== */}
      <p className="text-sm text-gray-500 line-clamp-2 mb-6 flex-grow leading-relaxed">
        {site.desc}
      </p>

      {/* ===== Footer：标签 + 学习建议 ===== */}
      <div className="space-y-4">
        {/* 标签区域：轻量胶囊 */}
        <div className="flex flex-wrap items-center gap-2">
          {visibleTags.map((tag) => (
            <span
              key={tag}
              className={`text-[12px] font-medium px-2 py-1 rounded-lg border ${getTagClass(tag)}`}
            >
              {tag}
            </span>
          ))}
          {hiddenTagsCount > 0 && (
            <span className="text-[12px] font-medium px-2.5 py-1 rounded-full bg-gray-50 text-app-muted border border-app-border">
              +{hiddenTagsCount}
            </span>
          )}
        </div>

        {/* 学习建议：弱化的文字 */}
        <div className="text-xs text-app-muted truncate">
          <span className="font-medium text-gray-500">适合学：</span>
          {site.learn}
        </div>
      </div>

      {/* ✅ 极简 Hover 光效（可选，增加高级感） */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-gray-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </Link>
  )
}