import type { ComponentType } from "react"
import * as Lucide from "lucide-react"
import { pinyin } from "pinyin-pro"

import { tools } from "./tools"
import { CharacterFigure } from "@/components/CharacterBackdrop"
import HomeSearch from "@/components/home/HomeSearch"
import HomeUtils from "@/components/home/HomeUtils"

/*
 * 首页 = 服务器组件。
 *
 * 之前整页是 "use client"，于是 116 张卡片、全部 lucide 图标（整包 1250 个）和
 * gsap + ScrollTrigger 都要下载到浏览器再水合；国内移动网络下这就表现为
 * 「页面出来了、但点工具没反应」。现在：
 *   - 卡片、图标全部在服务器渲染成 HTML，客户端包里一个图标都没有；
 *   - 入场/滚动动画改用纯 CSS（@keyframes + animation-timeline: view()），不再需要 gsap；
 *   - 只有搜索和「收藏/最近/滚动高亮/外链确认」两个小岛是客户端组件，
 *     而且它们是零 props、只读 DOM 的，卡片本身依然是原生 <a>，没 JS 也点得动。
 */

const CATEGORY_EMOJI: Record<string, string> = {
  文本工具: "📝",
  开发辅助: "🛠️",
  "CSS 工具": "🎨",
  媒体工具: "🖼️",
  测试工具: "🧪",
  "灵感与API": "💡",
  趣味工具: "🎮",
  前端实验: "🔬",
  日常工具: "📅",
  资源导航: "🗂️",
  心迹: "♥️",
}

/* 收敛到 4 个品牌色，和 Community 页面统一 */
const ICON_COLORS = [
  { bg: "bg-violet-50", text: "text-violet-500", glow: "bg-violet-300/25" },
  { bg: "bg-sky-50", text: "text-sky-500", glow: "bg-sky-300/25" },
  { bg: "bg-orange-50", text: "text-orange-500", glow: "bg-orange-300/25" },
  { bg: "bg-emerald-50", text: "text-emerald-500", glow: "bg-emerald-300/25" },
]

function colorFromId(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return ICON_COLORS[Math.abs(hash) % ICON_COLORS.length]
}

/* 常见别名 / 英文名：让 "qr"、"regex"、"yasuotu" 这类输入也能搜到 */
const ALIAS: Record<string, string> = {
  qrcode: "qr erweima 扫码",
  regex: "regex zhengze 正则",
  "regex-test": "regex test 正则",
  "image-compress": "yasuotu compress 压图 瘦身",
  "image-crop": "caijian crop 裁剪 剪裁",
  "image-enhance": "xiutu enhance 修图 增强",
  "image-watermark": "shuiyin watermark 加水印",
  "img-base64": "base64 图片转码",
  "image-to-ico": "ico favicon 图标",
  "fish-screen": "moyu 摸鱼 假装 更新",
  snake: "snake tanchishe 蛇",
  "code-rain": "matrix 黑客 数字雨",
  json: "json geshihua 格式化",
  timestamp: "unix shijianchuo 时间",
  rongtu: "rongtu hetu 合成 人物 抠图",
  weiguang: "weiguang dongtai bizhi 动态 壁纸",
  "character-poster": "haibao poster 海报",
  "liquid-glass": "boli glass maoboli 毛玻璃",
  "fake-data": "mock jiashuju 假数据",
  pomodoro: "fanqiezhong 番茄 专注",
  "image-exif": "exif 参数 相机",
  "image-convert": "zhuanhuan convert 格式",
  "text-batch": "piliang batch 批量",
  "text-compare": "duibi compare 对比",
  "case-convert": "daxiao case 大小写",
  "sql-format": "sql geshihua 格式化",
  "cubic-bezier": "beisaier 缓动 曲线",
  "clamp": "liuti clamp 流体 字号",
}

type Indexed = {
  full: string
  abbr: string
  search: string
}

/* 拼音索引在服务器上算一次（页面是静态预渲染的，浏览器里零成本） */
const INDEX = new Map<string, Indexed>()
for (const tool of tools) {
  const full = pinyin(tool.title, { toneType: "none", type: "array" }).join("")
  const abbr = pinyin(tool.title, {
    pattern: "first",
    toneType: "none",
    type: "array",
  }).join("")
  const descPy = pinyin(tool.description, {
    toneType: "none",
    type: "array",
  }).join("")
  const alias = ALIAS[tool.id] ?? ""
  const flatId = tool.id.replace(/[-_]/g, " ")
  INDEX.set(tool.id, {
    full,
    abbr,
    search: [
      tool.title,
      tool.description,
      tool.category,
      flatId,
      tool.id.replace(/[-_]/g, ""),
      full,
      abbr,
      descPy,
      alias,
    ]
      .join(" ")
      .toLowerCase(),
  })
}

const CATEGORIES = Array.from(new Set(tools.map((t) => t.category)))

function ToolIcon({ name, className }: { name: string; className?: string }) {
  const set = Lucide as unknown as Record<
    string,
    ComponentType<{ className?: string }>
  >
  const Icon = set[name] ?? Lucide.Square
  return <Icon className={className} />
}

function ToolCard({ tool, index }: { tool: (typeof tools)[number]; index: number }) {
  const colors = colorFromId(tool.id)
  const isExternal = tool.target === "_blank"
  const idx = INDEX.get(tool.id)!

  return (
    <div
      className="tool-card-shell flex min-h-[108px]"
      data-id={tool.id}
      data-title={tool.title}
      data-desc={tool.description}
      data-cat={tool.category}
      data-py={idx.full}
      data-abbr={idx.abbr}
      data-search={idx.search}
    >
      <a
        href={tool.href}
        {...(isExternal ? { "data-ext": "1" } : {})}
        className="group relative flex min-h-full w-full flex-col overflow-hidden rounded-[24px] border border-black/[0.07] bg-white p-2.5 text-inherit shadow-[0_18px_55px_-45px_rgba(15,23,42,.28)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_70px_-42px_rgba(15,23,42,.34)]"
      >
        {isExternal && (
          <span className="absolute right-3 top-3 z-10 rounded-full border border-violet-100 bg-violet-50 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-violet-500 opacity-0 transition duration-300 group-hover:opacity-100">
            External ↗
          </span>
        )}

        <div
          className={`pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full ${colors.glow} blur-[55px] transition duration-500 group-hover:scale-125`}
        />
        <div
          className={`pointer-events-none absolute -bottom-16 -left-14 h-36 w-36 rounded-full ${colors.glow} opacity-0 blur-[55px] transition duration-500 group-hover:opacity-80`}
        />

        <div className="relative flex items-start justify-between gap-4">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl ${colors.bg} transition duration-300 group-hover:rotate-[-4deg] group-hover:scale-110`}
          >
            <ToolIcon name={tool.icon} className={`h-4 w-4 ${colors.text}`} />
          </div>

          <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-300">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>

        <div className="relative mt-auto pt-2">
          <h3 className="text-[14px] font-semibold tracking-[-0.025em] text-zinc-900">
            {tool.title}
          </h3>

          <p className="mt-1.5 line-clamp-2 text-[11px] leading-[1.5] text-zinc-500">
            {tool.description}
          </p>

          <div className="mt-2 flex items-center justify-between border-t border-black/[0.06] pt-3">
            <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-400">
              {tool.category}
            </span>

            <span className="flex items-center gap-2">
              <span
                className="card-fav"
                data-fav={tool.id}
                title="收藏"
                aria-pressed="false"
              >
                ★
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-black/[0.07] bg-white text-zinc-500 transition duration-300 group-hover:rotate-[-8deg] group-hover:bg-black group-hover:text-white">
                <Lucide.ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </span>
          </div>
        </div>
      </a>
    </div>
  )
}

export default function HomePage() {
  const stats = [
    { value: String(tools.length).padStart(2, "0"), label: "Tools" },
    { value: String(CATEGORIES.length).padStart(2, "0"), label: "Categories" },
    { value: "0", label: "上传 · 全部本地" },
  ]

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#f7f7f5] text-[#151515]">
      {/* 背景氛围 */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="home-orb-a absolute -left-[18rem] -top-[18rem] h-[44rem] w-[44rem] rounded-full bg-violet-200/30 blur-[150px]" />
        <div className="home-orb-b absolute -right-[18rem] top-[12%] h-[42rem] w-[42rem] rounded-full bg-sky-200/28 blur-[150px]" />
        <div className="absolute bottom-[-18rem] left-[30%] h-[38rem] w-[38rem] rounded-full bg-orange-100/50 blur-[150px]" />
      </div>

      {/*
        站娘 · 整页半透明底纹。
        固定在视口上（跟内容滚动无关），z-20 —— 在正文（main z-10）之上、
        侧边栏（z-40）与弹窗（z-50）之下：这样她才是「铺满整个工具页的那层人影」。
        立绘本体与四角星共用 CharacterFigure，改浓淡只需要动那一处。
      */}
      <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden">
        <div className="home-figure absolute bottom-0 right-[-3%] h-[54%] aspect-[1696/2560] sm:h-[66%] lg:h-[76%]">
          <div className="home-figure-float relative h-full w-full">
            <CharacterFigure
              tone="violet"
              sizes="(max-width: 640px) 78vw, (max-width: 1024px) 50vw, 34vw"
            />
          </div>
        </div>
      </div>

      {/* 桌面端侧边栏 */}
      <aside className="fixed bottom-0 left-0 top-16 z-40 hidden w-56 border-r border-black/[0.06] bg-[#f7f7f5]/86 backdrop-blur-xl md:flex md:flex-col">
        <div className="px-5 pb-5 pt-7">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-400">
                BitLeap / Index
              </div>
              <div className="mt-2 text-xl font-medium tracking-[-0.04em]">
                工具目录
              </div>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.07] bg-white text-xs text-zinc-500 shadow-sm">
              {tools.length}
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {CATEGORIES.map((category, index) => (
            <a
              key={category}
              href={`#${category}`}
              data-cat-link={index}
              className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-zinc-500 transition duration-300 hover:bg-white hover:text-zinc-950 hover:shadow-[0_14px_35px_-28px_rgba(0,0,0,.35)]"
            >
              <span className="w-5 text-[10px] tabular-nums text-zinc-400 transition group-hover:text-zinc-500">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="cat-dot h-1.5 w-1.5 rounded-full bg-zinc-200 transition group-hover:bg-violet-500" />
              <span className="truncate">{category}</span>
              <span className="ml-auto text-[10px] text-zinc-400">
                {tools.filter((t) => t.category === category).length}
              </span>
            </a>
          ))}
        </nav>

        <div className="border-t border-black/[0.06] px-5 py-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-400">
            Built for daily use
          </div>
          <p className="mt-2 text-xs leading-5 text-zinc-400">
            Tiny tools, big leap.
          </p>
        </div>
      </aside>

      {/* 主内容 */}
      <main className="relative z-10 px-1.5 pb-20 pt-[1.8rem] sm:px-2 md:ml-56 lg:px-2">
        <div className="w-full max-w-none">
          {/* HERO */}
          <section className="relative overflow-hidden rounded-[36px_16px_36px_36px] border border-black/[0.06] bg-white px-5 py-4 shadow-[0_36px_110px_-72px_rgba(20,20,30,.28)] sm:px-6 sm:py-4 lg:px-8 lg:py-4">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -right-36 -top-44 h-[36rem] w-[36rem] rounded-full bg-violet-100 blur-[95px]" />
              <div className="absolute -bottom-52 left-[18%] h-[32rem] w-[32rem] rounded-full bg-sky-100/80 blur-[105px]" />
              <div className="absolute bottom-[7%] right-[7%] h-[17rem] w-[17rem] rounded-full bg-orange-100 blur-[78px]" />

              <div className="home-orbit absolute -right-24 -top-28 h-[460px] w-[460px] rounded-full border border-violet-500/10">
                <span className="absolute left-[14%] top-[15%] h-2.5 w-2.5 rounded-full bg-violet-500" />
              </div>

              <div className="absolute inset-0 opacity-[0.025] [background-image:linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] [background-size:34px_34px]" />
            </div>

            <div className="relative flex flex-col">
              <div className="home-kicker flex items-center justify-between gap-6">
                <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.28em] text-zinc-400">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  Local-first utility lab
                </div>

                <div className="hidden items-center gap-5 text-[10px] uppercase tracking-[0.18em] text-zinc-400 sm:flex">
                  <span>{tools.length} tools</span>
                  <span>{CATEGORIES.length} categories</span>
                </div>
              </div>

              <div className="mt-3 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end lg:gap-9">
                <div className="flex flex-col justify-between">
                  <div>
                    <div className="overflow-visible pb-1 pt-0.5">
                      <h1
                        style={{ animationDelay: "0.05s" }}
                        className="home-title-line text-[clamp(2.65rem,5.05vw,5.15rem)] font-medium leading-[1.12] tracking-[-0.085em] text-zinc-950">
                        BitLeap
                      </h1>
                    </div>

                    <div className="mt-2 flex items-center gap-3 pl-[7%]">
                      <span className="h-px w-12 bg-zinc-300 sm:w-20" />
                      <div className="overflow-visible py-0.5">
                        <div
                          style={{ animationDelay: "0.13s" }}
                          className="home-title-line text-[clamp(1.05rem,1.75vw,1.7rem)] font-medium leading-[1.2] tracking-[-0.05em] text-zinc-900"
                        >
                          Tiny tools,
                        </div>
                      </div>
                    </div>

                    <div className="overflow-visible pl-[1.5%] pt-0.5 pb-0">
                      <div
                        style={{ animationDelay: "0.21s" }}
                        className="home-title-line block w-fit overflow-visible pb-[0.26em] pr-[0.06em] bg-gradient-to-r from-violet-500 via-fuchsia-400 to-sky-400 bg-clip-text text-[clamp(2.35rem,4.25vw,4.25rem)] font-medium leading-[1.2] tracking-[-0.055em] text-transparent">
                        big leap.
                      </div>
                    </div>

                    <p className="home-copy -mt-1 max-w-xl text-[13px] leading-6 text-zinc-500 sm:text-[15px]">
                      一组真正为了日常使用而做的小工具。
                      <br className="hidden sm:block" />
                      尽量本地运行、无需注册、打开就能用。
                    </p>
                  </div>

                  <HomeSearch />
                </div>

                {/* Hero 右侧数据与入口 */}
                <div className="border-l border-black/[0.07] pl-0 lg:pl-6">
                  <div className="text-[10px] uppercase tracking-[0.24em] text-zinc-400">
                    Utility index
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-2 lg:grid-cols-1">
                    {stats.map((stat) => (
                      <div
                        key={stat.label}
                        className="home-stat border-t border-black/[0.07] pt-2.5"
                      >
                        <div className="text-2xl font-medium tracking-[-0.05em]">
                          {stat.value}
                        </div>
                        <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  <a
                    href="#tools-start"
                    className="home-stat group mt-3 flex h-10 w-fit items-center gap-6 rounded-full bg-[#171717] py-2 pl-5 pr-2 text-sm font-medium text-white shadow-[0_18px_40px_-22px_rgba(0,0,0,.55)]"
                  >
                    浏览全部工具
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-black transition-transform duration-300 group-hover:translate-x-1">
                      <Lucide.ArrowRight className="h-4 w-4" />
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* 常用 / 最近（有记录时才出现） */}
          <HomeUtils />

          {/* 工具列表 */}
          <div id="tools-start" className="scroll-mt-20 pt-5">
            <div
              id="home-empty"
              hidden
              className="section-reveal relative overflow-hidden rounded-[42px_14px_42px_42px] border border-black/[0.06] bg-white px-7 py-16 text-center shadow-[0_28px_90px_-70px_rgba(0,0,0,.3)]"
            >
              <div className="text-[10px] uppercase tracking-[0.24em] text-zinc-400">
                Search / 00
              </div>
              <h2 className="mt-5 text-4xl font-medium tracking-[-0.05em]">
                没有找到匹配的工具
              </h2>
              <p className="mt-3 text-sm text-zinc-400">
                换一个关键词试试看，比如「压缩」「二维码」「渐变」。
              </p>
            </div>

            <div className="space-y-16">
              {CATEGORIES.map((category, catIndex) => {
                const categoryTools = tools.filter((t) => t.category === category)
                return (
                  <section
                    key={category}
                    id={category}
                    data-cat-section={catIndex}
                    className="scroll-mt-24"
                  >
                    <div className="section-reveal mb-7 flex flex-col gap-5 border-b border-black/[0.07] pb-6 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.24em] text-zinc-400">
                          <span className="text-violet-500">
                            {String(catIndex + 1).padStart(2, "0")}
                          </span>
                          <span>/</span>
                          <span>Tool collection</span>
                        </div>

                        <h2 className="mt-3 text-3xl font-medium tracking-[-0.05em] sm:text-4xl">
                          {category}
                        </h2>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-zinc-400">
                        <span>{CATEGORY_EMOJI[category] ?? "🔧"}</span>
                        <span>{categoryTools.length} tools</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                      {categoryTools.map((tool, index) => (
                        <ToolCard key={tool.id} tool={tool} index={index} />
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>
          </div>

          {/* 底部 CTA */}
          <section className="section-reveal relative mt-28 overflow-hidden rounded-[48px_18px_48px_48px] bg-[#171717] px-7 py-12 text-white sm:px-10 sm:py-16 lg:px-14 lg:py-20">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -right-28 -top-28 h-96 w-96 rounded-full bg-violet-500/20 blur-[95px]" />
              <div className="absolute bottom-[-150px] left-[20%] h-80 w-80 rounded-full bg-sky-500/10 blur-[95px]" />
              <div className="absolute right-[10%] top-[12%] h-52 w-52 rounded-full border border-white/[0.07]" />
            </div>

            <div className="relative flex flex-col gap-12 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">
                  BitLeap / Keep building
                </div>

                <h2 className="mt-14 max-w-4xl text-4xl font-medium leading-[0.96] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
                  More tiny tools,
                  <br />
                  <span className="text-zinc-500">one useful leap at a time.</span>
                </h2>

                <p className="mt-7 max-w-xl text-sm leading-7 text-zinc-400">
                  目前 BitLeap 已收录 {tools.length} 款工具，覆盖 {CATEGORIES.length} 个分类。
                  更多真正有用的小功能，还会继续往这里放。
                </p>
              </div>

              <a
                href="/community"
                className="group flex w-fit items-center gap-7 rounded-full bg-white py-2 pl-5 pr-2 text-sm font-medium text-black"
              >
                去 Community
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white transition-transform duration-300 group-hover:translate-x-1">
                  <Lucide.ArrowUpRight className="h-4 w-4" />
                </span>
              </a>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
