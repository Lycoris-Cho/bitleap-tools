'use client'

import { useRouter } from 'next/navigation'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

type Palette = {
  name: string
  colors: string[]
}

type Gradient = {
  name: string
  colors: string[]
  angle?: number
}

/* =======================
   品牌配色（10 套）
   ======================= */
const PALETTES: Palette[] = [
  {
    name: 'Tailwind Blue',
    colors: ['#1E40AF', '#3B82F6', '#60A5FA', '#93C5FD'],
  },
  {
    name: 'Apple Gray',
    colors: ['#1F2937', '#4B5563', '#9CA3AF', '#E5E7EB'],
  },
  {
    name: 'Vercel',
    colors: ['#000000', '#666666', '#FFFFFF', '#F5F5F5'],
  },
  {
    name: 'GitHub',
    colors: ['#24292e', '#586069', '#6f42c1', '#d73a49'],
  },
  {
    name: 'Google',
    colors: ['#4285F4', '#EA4335', '#FBBC05', '#34A853'],
  },
  {
    name: 'Notion',
    colors: ['#37352F', '#4A4A4A', '#D4D4D4', '#F7F6F3'],
  },
  {
    name: 'Stripe',
    colors: ['#635BFF', '#8C85FF', '#B8B3FF', '#ECEBFF'],
  },
  {
    name: 'Linear',
    colors: ['#0D0D0D', '#1A1A1A', '#2A2A2A', '#3A3A3A'],
  },
  {
    name: 'Twitter',
    colors: ['#1DA1F2', '#71C9F8', '#A8E6FF', '#E8F8FF'],
  },
  {
    name: 'WeChat',
    colors: ['#07C160', '#10D16B', '#6FEA9E', '#D4FBE8'],
  },
  {
    name: 'Netflix',
    colors: ['#E50914', '#B81D24', '#F40612', '#831010'],
  },
  {
    name: 'Spotify',
    colors: ['#1DB954', '#1ED760', '#2EBD59', '#169C46'],
  },
  {
    name: 'Discord',
    colors: ['#5865F2', '#7289DA', '#99AAB5', '#2C2F33'],
  },
  {
    name: 'Figma',
    colors: ['#F24E1E', '#FF7262', '#A259FF', '#1ABCFE'],
  },
  {
    name: 'YouTube',
    colors: ['#FF0000', '#CC0000', '#FF4D4D', '#282828'],
  },
  {
    name: 'TikTok',
    colors: ['#000000', '#00F2EA', '#FF0050', '#FFFFFF'],
  },
  {
    name: 'Airbnb',
    colors: ['#FF5A5F', '#FC642D', '#484848', '#767676'],
  },
  {
    name: 'Uber',
    colors: ['#000000', '#FFFFFF', '#C4C4C4', '#F3F3F3'],
  },
  {
    name: 'Instagram',
    colors: ['#F58529', '#DD2A7B', '#8134AF', '#515BD4'],
  },
  {
    name: 'Framer',
    colors: ['#0055FF', '#1479FF', '#4D9FFF', '#E8F0FF'],
  },
]

/* =======================
   渐变色（18 套）
   ======================= */
const GRADIENTS: Gradient[] = [
  { name: '紫蓝渐变', colors: ['#3B82F6', '#8B5CF6'], angle: 90 },
  { name: '粉橙渐变', colors: ['#EC4899', '#F97316'], angle: 45 },
  { name: '青绿渐变', colors: ['#06B6D4', '#10B981'], angle: 135 },
  { name: '日落', colors: ['#F59E0B', '#EF4444', '#8B5CF6'], angle: 120 },
  { name: '极光', colors: ['#00C9FF', '#92FEA4'], angle: 90 },
  { name: '深海', colors: ['#0F2027', '#203A43', '#2C5364'], angle: 135 },
  { name: '暮光', colors: ['#4B1248', '#F0C27B'], angle: 90 },
  { name: '赛博朋克', colors: ['#00F5FF', '#9D00FF'], angle: 60 },
  { name: '霓虹', colors: ['#FF0080', '#FF8C00', '#40E0D0'], angle: 100 },
  { name: '星空', colors: ['#000428', '#004E92'], angle: 180 },
  { name: '火焰', colors: ['#FF0000', '#FFA500', '#FFFF00'], angle: 45 },
  { name: '奶油', colors: ['#FFF5E1', '#FFE4C4'], angle: 45 },
  { name: '薰衣草', colors: ['#E6E6FA', '#D8BFD8'], angle: 135 },
  { name: '薄荷', colors: ['#98FF98', '#00FF7F'], angle: 90 },
  { name: '雾霾蓝', colors: ['#B0C4DE', '#778899'], angle: 120 },
  { name: '彩虹渐变', colors: ['#FF0000','#FF7F00','#FFFF00','#00FF00','#0000FF','#4B0082','#9400D3'], angle: 90 },
  { name: '糖果', colors: ['#FF9A9E', '#FAD0C4', '#A1C4FD'], angle: 120 },
  { name: '金属', colors: ['#8E9EAB', '#EEF2F3'], angle: 45 },
  { name: '玫瑰金', colors: ['#FFECF2', '#FCB9AA', '#F78CA0'], angle: 135 },
  { name: '极简灰', colors: ['#F5F7FA', '#C3CFE2'], angle: 90 },
  { name: '琥珀', colors: ['#FFB75E', '#ED8F03'], angle: 45 },
  { name: '孔雀', colors: ['#0BA360', '#3CD3AD'], angle: 120 },
  { name: '暗夜紫', colors: ['#1A0033', '#4B0082', '#8A2BE2'], angle: 160 },
  { name: '冰河', colors: ['#E0EAFC', '#CFDEF3'], angle: 90 },
  { name: '番茄', colors: ['#FF416C', '#FF4B2B'], angle: 60 },
  { name: '森林', colors: ['#134E5E', '#71B280'], angle: 135 },
  { name: '紫霞', colors: ['#667EEA', '#764BA2'], angle: 90 },
  { name: '蜜桃', colors: ['#FFD194', '#70E1F5'], angle: 110 },
  { name: '火山', colors: ['#F12711', '#F5AF19'], angle: 45 },
  { name: '银河', colors: ['#0F0C29', '#302B63', '#24243E'], angle: 180 },
]

export default function ColorPalettePage() {
  const router = useRouter()

  /* ✅ 正确编码颜色，避免 # 被截断 */
  function applyGradient(g: Gradient) {
    const colorsParam = g.colors
      .map((c) => encodeURIComponent(c))
      .join(',')
    const params = new URLSearchParams({
      colors: colorsParam,
      angle: String(g.angle ?? 90),
    })
    router.push(`/tools/gradient?${params.toString()}`)
  }

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      {/* 标题 */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          常用配色推荐
        </h1>
        <p className="text-app-muted">
          精选品牌配色与渐变色，点击即可使用
        </p>
      </div>

      {/* 品牌配色 */}
      <section className="mb-16">
        <h2 className="text-xl font-semibold mb-6">品牌配色</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {PALETTES.map((p) => (
            <div
              key={p.name}
              className="p-6 border border-app-border rounded-2xl space-y-4"
            >
              <div className="font-medium">{p.name}</div>
              <div className="flex h-10 rounded-xl overflow-hidden">
                {p.colors.map((c) => (
                  <div
                    key={c}
                    className="flex-1"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <button
                onClick={() =>
                  navigator.clipboard.writeText(p.colors.join(', '))
                }
                className="w-full px-4 py-2 text-sm border border-gray-300 rounded-xl hover:bg-gray-50 transition"
              >
                复制色值
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 渐变色推荐 */}
      <section>
        <h2 className="text-xl font-semibold mb-6">渐变色推荐</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {GRADIENTS.map((g) => (
            <div
              key={g.name}
              className="p-6 border border-app-border rounded-2xl space-y-4"
            >
              <div className="font-medium">{g.name}</div>
              <div
                className="h-20 rounded-xl"
                style={{
                  background: `linear-gradient(${g.angle ?? 90}deg, ${g.colors.join(
                    ', '
                  )})`,
                }}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => applyGradient(g)}
                  className="flex-1 px-4 py-2 text-sm bg-black text-white rounded-xl hover:bg-gray-800 transition"
                >
                  查看此渐变
                </button>
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(
                      `background: linear-gradient(${g.angle ?? 90}deg, ${g.colors.join(
                        ', '
                      )});`
                    )
                  }
                  className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-xl hover:bg-gray-50 transition"
                >
                  复制 CSS
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SEO 文案 */}
      <section className="mt-16 pt-10 border-t border-app-border">
        <h2 className="text-lg font-semibold mb-3">使用说明</h2>
        <ul className="text-sm text-app-muted space-y-2 leading-relaxed">
          <li>• 品牌配色适合 UI、图表、Logo 设计</li>
          <li>• 渐变色适合背景、按钮、卡片、Banner</li>
          <li>• 点击“使用此渐变”将自动跳转到渐变生成器</li>
          <li>• 所有配色均为 Web 安全色，可直接用于生产</li>
        </ul>
      </section>
      <FooterNote />
    </div>
  )
}