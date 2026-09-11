"use client"

import { useEffect, useRef, type ReactNode } from "react"
import Lenis from "lenis"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import Link from 'next/link'

const FEATURED = [
  {
    id: "builder",
    number: "01",
    eyebrow: "BUILD",
    title: "前端页面生成器",
    line1: "拖拽页面。",
    line2: "拿走真实代码。",
    body: "把页面搭建从“演示玩具”变成可以继续开发的工作流。拖拽组织页面结构，并导出 HTML / React 代码。",
    href: "/tools/page-builder",
    accent: "#a996ff",
  },
  {
    id: "enhance",
    number: "02",
    eyebrow: "LOCAL AI",
    title: "图片高清修复",
    line1: "AI 超分。",
    line2: "留在浏览器里。",
    body: "本地处理图片清晰度，不必先把素材交给陌生服务器。适合旧图、截图和日常素材的快速增强。",
    href: "/tools/image-enhance",
    accent: "#7bb7ff",
  },
  {
    id: "data",
    number: "03",
    eyebrow: "VISUALIZE",
    title: "ECharts 图表生成",
    line1: "粘贴数据。",
    line2: "让它自己说话。",
    body: "粘贴数据以后，用可视化方式配置图表。适合临时分析、汇报草稿和快速验证数据表达。",
    href: "/tools/data-visualizer",
    accent: "#79d6c3",
  },
  {
    id: "har",
    number: "04",
    eyebrow: "DEBUG",
    title: "HAR 抓包解析器",
    line1: "一次抓包。",
    line2: "把请求看清楚。",
    body: "上传 HAR 文件，集中查看请求与响应。比在一长串网络记录里来回翻找更适合排查接口问题。",
    href: "/tools/har-viewer",
    accent: "#ffab75",
  },
  {
    id: "world",
    number: "05",
    eyebrow: "EXPLORE",
    title: "世界数据观测",
    line1: "不只看数字。",
    line2: "看它怎么变化。",
    body: "把国家数据放进长期时间轴里比较。人口、经济与发展指标不再只是某一年的孤立数字。",
    href: "/tools/world-lens",
    accent: "#d8bb78",
  },
  {
    id: "space",
    number: "06",
    eyebrow: "OBSERVE",
    title: "NASA 天文",
    line1: "把 NASA 的天空，",
    line2: "放进一块仪表。",
    body: "读取 NASA 官方 API，把每日宇宙图像、近地天体与空间天气整理成可以直接探索的观测体验。",
    href: "/tools/space-monitor",
    accent: "#8ea6ff",
  },
  {
    id: "gsap",
    number: "07",
    eyebrow: "MOTION",
    title: "GSAP 动画实验室",
    line1: "不是看参数。",
    line2: "是直接看运动。",
    body: "把缓动、时间线、交互和滚动动画放进同一个 Playground。调参数、看结果，再把动画思路带回项目。",
    href: "/tools/gsap",
    accent: "#9ce0ad",
  },
  {
    id: "shot",
    number: "08",
    eyebrow: "PRESENT",
    title: "截图美化",
    line1: "一张截图。",
    line2: "直接变成作品。",
    body: "把普通截图放进更适合分享的画布里，调整背景、留白、圆角和构图，不需要再打开大型设计软件。",
    href: "/tools/screenshot-beautifier",
    accent: "#f2a3c6",
  },
  {
    id: "currency",
    number: "09",
    eyebrow: "COMPARE",
    title: "汇率计算",
    line1: "不只换算。",
    line2: "也看趋势和成本。",
    body: "结合实时汇率、历史走势和手续费模拟，把一次简单换算变成更完整的换汇判断。",
    href: "/tools/currency-intelligence",
    accent: "#d8c375",
  },
  {
    id: "qr",
    number: "10",
    eyebrow: "CREATE",
    title: "QR Studio",
    line1: "一个二维码。",
    line2: "也值得认真设计。",
    body: "实时生成 URL、文本和 WiFi 二维码，控制颜色、容错、留白与导出尺寸，把一个简单生成器做成可直接交付的设计工具。",
    href: "/tools",
    accent: "#f0a7d1",
  },
  {
    id: "subnet",
    number: "11",
    eyebrow: "NETWORK",
    title: "IP 子网计算器",
    line1: "一个 CIDR。",
    line2: "把整个网段看清。",
    body: "实时计算网络地址、广播地址、可用主机范围与二进制结构，并把 IP 在网段中的位置直接可视化。",
    href: "/tools",
    accent: "#86c9bb",
  },
  {
    id: "holiday",
    number: "12",
    eyebrow: "PLAN",
    title: "节假日拼假",
    line1: "少请几天。",
    line2: "把休息拉得更长。",
    body: "结合公共节假日和 BitLeap 的拼假算法，在给定年假预算下寻找更长的连续休息窗口，并给出具体请假日期。",
    href: "/tools/holiday-optimizer",
    accent: "#efb278",
  },
]

const MORE_TOOLS = [
  ["GSAP 动画实验室", "/tools/gsap"],
  ["汇率计算", "/tools/currency-intelligence"],
  ["今天想请假？", "/tools/holiday-optimizer"],
  ["截图美化", "/tools/screenshot-beautifier"],
  ["图片配色提取器", "/tools/color-extractor"],
  ["时序花园", "/tools/GardenTime"],
]

function Arrow() {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
      <path d="M4 10h11M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Spark() {
  return (
    <svg viewBox="0 0 44 44" className="h-[.6em] w-[.6em] translate-y-[.05em]" fill="none" aria-hidden="true">
      <path d="M22 0c.9 12.8 8.2 20.1 22 22-13.8 1.9-21.1 9.2-22 22C20.8 31.2 13.5 23.9 0 22 13.5 20.1 20.8 12.8 22 0Z" fill="currentColor" />
    </svg>
  )
}

function WindowShell({
  title,
  accent,
  children,
  className = "",
}: {
  title: string
  accent: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`overflow-hidden rounded-[26px] border border-white/[.09] bg-[#121216]/88 shadow-[0_30px_100px_rgba(0,0,0,.28)] backdrop-blur-xl ${className}`}>
      <div className="flex h-12 items-center justify-between border-b border-white/[.07] px-4">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-white/15" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/15" />
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
        </div>
        <span className="text-[8px] font-semibold tracking-[.14em] text-white/24">{title}</span>
        <span className="text-[8px] text-white/14">BITLEAP</span>
      </div>
      {children}
    </div>
  )
}

function HeroMockup() {
  return (
    <div className="hero-device-wrap relative h-[590px] w-full max-w-[650px]">
      <div className="hero-device-glow absolute inset-[12%] rounded-full bg-[radial-gradient(circle_at_50%_45%,rgba(91,88,255,.56),rgba(168,83,185,.3)_38%,transparent_70%)] blur-[54px]" />

      <div className="hero-device-inner absolute left-1/2 top-1/2 w-[88%] -translate-x-1/2 -translate-y-1/2 rotate-[7deg]">
        <WindowShell title="TOOLS / HOME" accent="#a89aff">
          <div className="min-h-[480px] bg-[radial-gradient(circle_at_75%_15%,rgba(113,92,255,.15),transparent_28%),#0d0d11] p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-black tracking-[-.04em] text-white">BitLeap</span>
              <span className="rounded-full border border-white/[.08] px-3 py-1.5 text-[8px] text-white/28">100 TOOLS</span>
            </div>

            <div className="mt-8 text-[clamp(28px,4vw,48px)] font-semibold leading-[1.02] tracking-[-.045em] text-white">What do you<br />need right now?</div>

            <div className="mt-7 flex items-center gap-3 rounded-full border border-white/[.08] bg-white/[.05] px-4 py-3">
              <span className="h-2 w-2 rounded-full bg-[#a89aff]" />
              <span className="text-[9px] text-white/25">搜索一个工具…</span>
              <span className="ml-auto text-[8px] text-white/16">⌘ K</span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              {[
                ["World Lens", "DATA", "#d5b875"],
                ["AI Enhance", "LOCAL AI", "#7fb6ff"],
                ["Page Builder", "BUILD", "#ae9aff"],
                ["HAR Viewer", "DEBUG", "#efa172"],
                ["NASA", "SPACE", "#8f9fff"],
                ["GSAP Lab", "MOTION", "#82cfae"],
              ].map(([name, meta, color]) => (
                <div key={name} className="rounded-[17px] border border-white/[.065] bg-white/[.035] p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[7px] font-semibold tracking-[.11em] text-white/20">{meta}</span>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                  </div>
                  <div className="mt-7 text-[10px] font-semibold text-white/62">{name}</div>
                </div>
              ))}
            </div>
          </div>
        </WindowShell>
      </div>

      <div className="hero-float hero-float-a absolute right-[-2%] top-[18%] hidden w-[180px] rotate-[-4deg] rounded-[18px] border border-white/[.12] bg-white/[.08] p-4 shadow-2xl backdrop-blur-xl sm:block">
        <span className="text-[7px] tracking-[.12em] text-white/30">LOCAL AI</span>
        <div className="mt-3 text-xs font-semibold text-white">Image Enhance</div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[78%] rounded-full bg-[#82afff]" /></div>
      </div>

      <div className="hero-float hero-float-b absolute bottom-[13%] left-[-4%] hidden w-[184px] rotate-[5deg] rounded-[18px] border border-white/[.12] bg-white/[.08] p-4 shadow-2xl backdrop-blur-xl sm:block">
        <span className="text-[7px] tracking-[.12em] text-white/30">WORLD LENS</span>
        <div className="mt-3 flex h-16 items-end gap-1.5">
          {[26, 42, 34, 55, 48, 72, 65, 86].map((height, index) => (
            <span key={index} className="flex-1 rounded-t-sm bg-[#cdb26f]/70" style={{ height: `${height}%` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function BuilderVisual() {
  return (
    <WindowShell title="PAGE BUILDER" accent="#a996ff" className="w-full">
      <div className="grid min-h-[410px] grid-cols-[105px_1fr_120px] bg-[#0d0d11]">
        <div className="border-r border-white/[.07] p-3">
          <span className="text-[7px] text-white/20">BLOCKS</span>
          <div className="mt-4 space-y-2">
            {["Hero", "Text", "Image", "CTA", "Grid"].map((item) => (
              <div key={item} className="rounded-[9px] border border-white/[.06] bg-white/[.035] px-2.5 py-2 text-[8px] text-white/38">{item}</div>
            ))}
          </div>
        </div>
        <div className="p-4">
          <div className="h-full rounded-[15px] bg-[#ece9e0] p-5 text-[#22231f]">
            <div className="flex items-center justify-between"><b className="text-[9px]">Studio</b><span className="rounded-full bg-[#22231f] px-2 py-1 text-[6px] text-white">OPEN</span></div>
            <div className="mt-12 text-[34px] font-semibold leading-[1.02] tracking-[-.045em]">Build less.<br />Ship more.</div>
            <div className="mt-5 h-1 w-20 bg-[#9b8bed]" />
            <div className="mt-4 max-w-[210px] text-[7px] leading-4 text-black/38">Drag sections, edit content and export a real React page.</div>
          </div>
        </div>
        <div className="border-l border-white/[.07] p-3">
          <span className="text-[7px] text-white/20">EXPORT</span>
          <div className="mt-4 rounded-[10px] bg-white/[.04] p-2.5 font-mono text-[6px] leading-4 text-[#b4cbb8]">&lt;section&gt;<br />&nbsp;className=<br />&nbsp;"hero"<br />&lt;/section&gt;</div>
        </div>
      </div>
    </WindowShell>
  )
}

function EnhanceVisual() {
  return (
    <WindowShell title="LOCAL AI / IMAGE ENHANCE" accent="#7bb7ff" className="w-full">
      <div className="relative min-h-[410px] overflow-hidden bg-[#0c0d11] p-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(77,135,235,.22),transparent_32%)]" />
        <div className="relative mx-auto mt-4 h-[310px] max-w-[560px] overflow-hidden rounded-[20px] border border-white/[.08]">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#334357,#9cb1c7_45%,#44556b)]" />
          <div className="absolute inset-y-0 left-0 w-1/2 backdrop-blur-[5px]">
            <div className="absolute left-4 top-4 rounded-full bg-black/35 px-2.5 py-1 text-[7px] text-white/60">BEFORE</div>
          </div>
          <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_45%_35%,rgba(255,255,255,.24),transparent_24%)]">
            <div className="absolute right-4 top-4 rounded-full bg-black/35 px-2.5 py-1 text-[7px] text-white/60">AFTER</div>
          </div>
          <div className="absolute bottom-0 left-1/2 top-0 w-px bg-white/70 shadow-[0_0_18px_rgba(255,255,255,.55)]" />
          <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/50 bg-black/25 backdrop-blur-md" />
        </div>
        <div className="relative mt-4 flex justify-between text-[7px] text-white/24"><span>2× UPSCALE</span><span>LOCAL PROCESSING · 78%</span></div>
      </div>
    </WindowShell>
  )
}

function DataVisual() {
  return (
    <WindowShell title="DATA VISUALIZER / ECHARTS" accent="#79d6c3" className="w-full">
      <div className="min-h-[410px] bg-[#0d0f10] p-5">
        <div className="grid grid-cols-3 gap-2">
          {[["Revenue", "¥ 2.48M"], ["Growth", "+18.6%"], ["Orders", "8,421"]].map(([label, value]) => (
            <div key={label} className="rounded-[13px] border border-white/[.06] bg-white/[.035] p-3">
              <span className="text-[6px] text-white/20">{label}</span>
              <div className="mt-2 text-sm font-semibold text-white/72">{value}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-[1.35fr_.65fr] gap-3">
          <div className="rounded-[15px] border border-white/[.06] bg-white/[.025] p-4">
            <span className="text-[7px] text-white/20">TREND</span>
            <svg viewBox="0 0 420 180" className="mt-2 h-[190px] w-full">
              {[35, 75, 115, 155].map((y) => <line key={y} x1="0" x2="420" y1={y} y2={y} stroke="rgba(255,255,255,.05)" />)}
              <path d="M0 148 C55 138 64 91 112 102 C164 114 171 64 220 73 C273 83 286 36 330 49 C365 58 382 24 420 31" fill="none" stroke="#79d6c3" strokeWidth="3" strokeLinecap="round" />
              <path d="M0 148 C55 138 64 91 112 102 C164 114 171 64 220 73 C273 83 286 36 330 49 C365 58 382 24 420 31 L420 180 L0 180 Z" fill="url(#area)" opacity=".15" />
              <defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#79d6c3" /><stop offset="1" stopColor="#79d6c3" stopOpacity="0" /></linearGradient></defs>
            </svg>
          </div>
          <div className="rounded-[15px] border border-white/[.06] bg-white/[.025] p-4">
            <span className="text-[7px] text-white/20">SHARE</span>
            <div className="mt-10 grid place-items-center">
              <div className="grid h-[120px] w-[120px] place-items-center rounded-full border-[18px] border-[#79d6c3]/75 border-r-[#bca673]/50 border-b-[#7b8caa]/45"><span className="text-lg font-semibold text-white/70">62%</span></div>
            </div>
          </div>
        </div>
      </div>
    </WindowShell>
  )
}

function HarVisual() {
  return (
    <WindowShell title="HAR VIEWER" accent="#ffab75" className="w-full">
      <div className="min-h-[410px] bg-[#0c0d10]">
        <div className="grid grid-cols-[1.1fr_.9fr]">
          <div className="border-r border-white/[.06] p-4">
            <div className="grid grid-cols-[52px_1fr_48px] border-b border-white/[.06] pb-2 text-[6px] tracking-[.08em] text-white/17"><span>STATUS</span><span>REQUEST</span><span>TIME</span></div>
            <div className="mt-1">
              {[
                ["200", "/api/user/profile", "84ms"],
                ["200", "/v2/tools/list", "126ms"],
                ["304", "/assets/app.css", "21ms"],
                ["200", "/api/world/data", "482ms"],
                ["404", "/api/avatar/42", "92ms"],
                ["200", "/api/metrics", "218ms"],
                ["204", "/api/ping", "42ms"],
              ].map(([status, request, time]) => (
                <div key={request} className="grid grid-cols-[52px_1fr_48px] border-b border-white/[.045] py-3 font-mono text-[7px]">
                  <span className={status === "404" ? "text-[#ef8a72]" : "text-[#85b897]"}>{status}</span>
                  <span className="truncate text-white/42">{request}</span>
                  <span className="text-right text-white/20">{time}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4">
            <span className="text-[7px] tracking-[.12em] text-white/18">TIMING</span>
            <div className="mt-6 space-y-4">
              {[["DNS", 18, "#7f96af"], ["Connect", 34, "#a995ff"], ["SSL", 27, "#d0ad72"], ["TTFB", 76, "#ffab75"], ["Download", 45, "#79c4a2"]].map(([name, width, color]) => (
                <div key={name as string}>
                  <div className="mb-1.5 flex justify-between text-[6px] text-white/20"><span>{name}</span><span>{width}ms</span></div>
                  <div className="h-1 rounded-full bg-white/[.05]"><div className="h-full rounded-full" style={{ width: `${width}%`, background: color as string }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </WindowShell>
  )
}

function WorldVisual() {
  return (
    <WindowShell title="WORLD LENS" accent="#d8bb78" className="w-full">
      <div className="relative min-h-[410px] overflow-hidden bg-[#ece9df] p-5 text-[#22231f]">
        <span className="text-[7px] tracking-[.13em] text-black/24">GDP PER CAPITA · 2000—2025</span>
        <div className="absolute right-5 top-4 text-[72px] font-semibold tracking-[-.08em] text-black/[.035]">2025</div>
        <svg viewBox="0 0 560 240" className="mt-12 h-[230px] w-full">
          {[35, 85, 135, 185, 235].map((y) => <line key={y} x1="0" x2="560" y1={y} y2={y} stroke="rgba(34,35,31,.07)" />)}
          <path d="M0 192 C75 182 120 164 165 153 C218 140 247 101 297 99 C350 98 379 69 425 55 C472 42 512 31 560 23" fill="none" stroke="#31594e" strokeWidth="3" />
          <path d="M0 130 C78 129 125 125 180 122 C244 118 296 117 351 114 C420 111 486 109 560 106" fill="none" stroke="#ba5e43" strokeWidth="2.4" />
          <path d="M0 97 C90 95 172 94 240 92 C312 91 401 90 560 89" fill="none" stroke="#b38a39" strokeWidth="2.4" />
        </svg>
        <div className="mt-2 flex items-center gap-5 text-[7px] text-black/30"><span>● 中国</span><span>● 日本</span><span>● 美国</span></div>
      </div>
    </WindowShell>
  )
}

function SpaceVisual() {
  return (
    <WindowShell title="NASA / SPACE MONITOR" accent="#8ea6ff" className="w-full">
      <div className="relative min-h-[410px] overflow-hidden bg-[#08090d]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_54%_46%,rgba(77,102,156,.22),transparent_27%),radial-gradient(circle_at_78%_18%,rgba(106,72,153,.15),transparent_22%)]" />
        <div className="absolute left-1/2 top-1/2 h-[155px] w-[155px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_35%_30%,#94a8bc,#324a61_30%,#15232d_60%,#0a0d11_76%)] shadow-[0_0_90px_rgba(96,135,174,.22)]">
          <div className="absolute left-1/2 top-1/2 h-[180%] w-[180%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[.055]" />
          <div className="absolute left-1/2 top-1/2 h-[280%] w-[280%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[.035]" />
        </div>
        {([
          ["18%", "22%", false],
          ["76%", "26%", true],
          ["22%", "70%", false],
          ["84%", "68%", false],
          ["66%", "82%", true],
          ["35%", "15%", false],
        ] satisfies Array<[string, string, boolean]>).map(([left, top, danger], index) => (
          <div key={index} className={`absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border ${danger ? "border-[#ff826d]/50 bg-[#ff826d]/20 shadow-[0_0_24px_rgba(255,130,109,.28)]" : "border-white/30 bg-white/5"}`} style={{ left, top }}>
            <span className={`absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full ${danger ? "bg-[#ff826d]" : "bg-white/70"}`} />
          </div>
        ))}
        <div className="absolute left-5 top-5 text-[7px] tracking-[.12em] text-white/20">NEAR EARTH OBJECT FIELD</div>
        <div className="absolute bottom-5 left-5 right-5 flex justify-between text-[7px] text-white/18"><span>24H · LIVE DATA</span><span>● POTENTIALLY HAZARDOUS</span></div>
      </div>
    </WindowShell>
  )
}

function GsapVisual() {
  return (
    <WindowShell title="GSAP / MOTION LAB" accent="#9ce0ad" className="w-full">
      <div className="relative min-h-[410px] overflow-hidden bg-[#0b0d0b] p-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_28%,rgba(97,200,128,.15),transparent_28%),radial-gradient(circle_at_18%_78%,rgba(109,92,225,.13),transparent_26%)]" />
        <div className="relative grid min-h-[360px] grid-cols-[.72fr_1.28fr] gap-3">
          <div className="rounded-[16px] border border-white/[.06] bg-white/[.035] p-4">
            <span className="text-[7px] tracking-[.13em] text-white/20">TIMELINE</span>
            <div className="mt-5 space-y-3">
              {[
                ["intro", "0.00", 78],
                ["title", "0.18", 64],
                ["cards", "0.42", 88],
                ["cta", "0.86", 46],
              ].map(([name, time, width], index) => (
                <div key={name as string}>
                  <div className="mb-1.5 flex items-center justify-between text-[6px] text-white/22">
                    <span>{name}</span><span>{time}s</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[.055]">
                    <div className="motion-bar h-full rounded-full bg-[#9ce0ad]/75" style={{ width: `${width}%`, transformOrigin: "left center" }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 rounded-[12px] border border-white/[.055] bg-black/25 p-3 font-mono text-[6px] leading-4 text-[#bdd6c2]">gsap.timeline()<br />.from(".hero", &#123; y: 48 &#125;)<br />.to(".card", &#123; scale: 1 &#125;)</div>
          </div>

          <div className="relative overflow-hidden rounded-[16px] border border-white/[.06] bg-[#121511]">
            <div className="absolute left-4 top-4 text-[7px] tracking-[.13em] text-white/18">PLAYGROUND</div>
            <div className="absolute left-1/2 top-1/2 h-[210px] w-[210px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[.045]" />
            <div className="motion-orb absolute left-[24%] top-[54%] h-14 w-14 rounded-[18px] bg-[#9ce0ad] shadow-[0_0_45px_rgba(156,224,173,.24)]" />
            <div className="motion-orb absolute left-[50%] top-[34%] h-11 w-11 rotate-45 bg-[#a996ff]/90 shadow-[0_0_40px_rgba(169,150,255,.22)]" />
            <div className="motion-orb absolute right-[18%] top-[58%] h-9 w-20 rounded-full bg-[#d8c375]/85" />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-full border border-white/[.055] bg-white/[.03] px-3 py-2 text-[6px] text-white/24"><span>POWER3.OUT</span><span>1.20s</span><span>REPEAT 0</span></div>
          </div>
        </div>
      </div>
    </WindowShell>
  )
}

function ScreenshotVisual() {
  return (
    <WindowShell title="SCREENSHOT BEAUTIFIER" accent="#f2a3c6" className="w-full">
      <div className="relative min-h-[410px] overflow-hidden bg-[#111015] p-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_42%,rgba(242,163,198,.18),transparent_27%),radial-gradient(circle_at_73%_66%,rgba(141,127,255,.18),transparent_28%)]" />
        <div className="relative mx-auto flex min-h-[360px] max-w-[620px] items-center justify-center rounded-[22px] border border-white/[.07] bg-[linear-gradient(135deg,#f5a6ca,#9a8cff_54%,#6b7fe2)] p-8">
          <div className="shot-card w-[82%] overflow-hidden rounded-[16px] bg-[#f5f2ea] shadow-[0_28px_70px_rgba(0,0,0,.25)]">
            <div className="flex h-9 items-center gap-1.5 border-b border-black/[.07] px-3">
              <span className="h-1.5 w-1.5 rounded-full bg-black/15" />
              <span className="h-1.5 w-1.5 rounded-full bg-black/15" />
              <span className="h-1.5 w-1.5 rounded-full bg-black/15" />
            </div>
            <div className="p-5 text-[#23231f]">
              <div className="text-[7px] tracking-[.13em] text-black/24">BITLEAP / CAPTURE</div>
              <div className="mt-4 text-[28px] font-semibold leading-[1.03] tracking-[-.04em]">Make screenshots<br />worth sharing.</div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {[1, 2, 3].map((item) => <div key={item} className="h-16 rounded-[9px] bg-black/[.055]" />)}
              </div>
            </div>
          </div>
          <div className="shot-chip absolute bottom-5 left-5 rounded-full bg-black/28 px-3 py-2 text-[6px] text-white/64 backdrop-blur-md">RADIUS 24</div>
          <div className="shot-chip absolute right-5 top-5 rounded-full bg-white/16 px-3 py-2 text-[6px] text-white/72 backdrop-blur-md">SHADOW SOFT</div>
        </div>
      </div>
    </WindowShell>
  )
}

function CurrencyVisual() {
  return (
    <WindowShell title="CURRENCY INTELLIGENCE" accent="#d8c375" className="w-full">
      <div className="relative min-h-[410px] overflow-hidden bg-[#0c0d0b] p-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_26%,rgba(216,195,117,.13),transparent_28%),radial-gradient(circle_at_20%_80%,rgba(91,125,104,.12),transparent_25%)]" />
        <div className="relative">
          <div className="flex items-end justify-between border-b border-white/[.07] pb-5">
            <div>
              <div className="text-[7px] tracking-[.13em] text-white/20">CONVERT</div>
              <div className="mt-2 text-[40px] font-semibold tracking-[-.06em] text-white">10,000 <span className="text-[14px] text-white/28">CNY</span></div>
            </div>
            <div className="text-right"><div className="text-[7px] text-white/18">RECEIVE</div><div className="mt-2 text-[28px] font-semibold text-[#d8c375]">1,402.18 USD</div></div>
          </div>

          <div className="mt-5 grid grid-cols-[1.35fr_.65fr] gap-3">
            <div className="rounded-[15px] border border-white/[.06] bg-white/[.025] p-4">
              <div className="flex items-center justify-between text-[7px] text-white/20"><span>90 DAY TREND</span><span>+2.41%</span></div>
              <svg viewBox="0 0 420 180" className="mt-3 h-[190px] w-full">
                {[35, 75, 115, 155].map((y) => <line key={y} x1="0" x2="420" y1={y} y2={y} stroke="rgba(255,255,255,.05)" />)}
                <path className="currency-line" d="M0 142 C44 151 71 126 108 130 C147 134 178 92 220 100 C262 108 289 71 326 79 C363 86 385 51 420 43" fill="none" stroke="#d8c375" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
            <div className="rounded-[15px] border border-white/[.06] bg-white/[.025] p-4">
              <div className="text-[7px] text-white/20">COST SIMULATION</div>
              <div className="mt-7 space-y-5">
                {[["Spread", "0.35%"], ["Fee", "$4.20"], ["Loss", "$9.11"]].map(([label, value]) => <div key={label} className="border-b border-white/[.055] pb-3"><div className="text-[6px] text-white/18">{label}</div><div className="mt-1 text-[12px] font-semibold text-white/64">{value}</div></div>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </WindowShell>
  )
}

function QrVisual() {
  return (
    <WindowShell title="QR STUDIO" accent="#f0a7d1" className="w-full">
      <div className="relative min-h-[410px] overflow-hidden bg-[#101014] p-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_24%,rgba(240,167,209,.18),transparent_27%),radial-gradient(circle_at_76%_75%,rgba(139,125,255,.18),transparent_28%)]" />
        <div className="relative grid min-h-[360px] grid-cols-[.72fr_1.28fr] gap-3">
          <div className="rounded-[16px] border border-white/[.06] bg-white/[.035] p-4">
            <span className="text-[7px] tracking-[.13em] text-white/20">CONTENT</span>
            <div className="mt-5 rounded-[12px] border border-white/[.06] bg-black/20 p-3 font-mono text-[7px] leading-5 text-white/42">https://<br />bitleap.app</div>
            <div className="mt-5 space-y-3">
              {[["ECC", "H"], ["SIZE", "512"], ["MARGIN", "2"]].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between border-b border-white/[.055] pb-2 text-[7px]">
                  <span className="text-white/20">{label}</span>
                  <span className="font-mono text-white/55">{value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative grid place-items-center overflow-hidden rounded-[16px] border border-white/[.06] bg-[#f2efe7]">
            <div className="qr-pulse absolute h-[260px] w-[260px] rounded-full bg-[#f0a7d1]/20 blur-[46px]" />
            <div className="qr-demo relative grid h-[210px] w-[210px] grid-cols-9 gap-[3px] rounded-[18px] bg-white p-5 shadow-[0_28px_70px_rgba(0,0,0,.18)]">
              {Array.from({ length: 81 }).map((_, index) => {
                const on = [0,1,2,3,4,9,13,18,22,27,28,29,30,31,36,40,44,45,49,53,54,55,56,57,58,63,67,72,73,74,75,76,80,7,8,16,17,24,25,32,33,41,42,50,51,60,61,68,69,77,78].includes(index)
                return <span key={index} className={`rounded-[1px] ${on ? "bg-[#1b1b1e]" : "bg-transparent"}`} />
              })}
            </div>
          </div>
        </div>
      </div>
    </WindowShell>
  )
}

function SubnetVisual() {
  return (
    <WindowShell title="IP / CIDR INSPECTOR" accent="#86c9bb" className="w-full">
      <div className="relative min-h-[410px] overflow-hidden bg-[#0c0e0d] p-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(134,201,187,.13),transparent_29%)]" />
        <div className="relative">
          <div className="flex items-end justify-between border-b border-white/[.07] pb-5">
            <div>
              <span className="text-[7px] tracking-[.13em] text-white/18">ADDRESS</span>
              <div className="mt-2 font-mono text-[34px] font-semibold tracking-[-.05em] text-white">192.168.1.10<span className="text-[#86c9bb]">/24</span></div>
            </div>
            <div className="text-right text-[7px] text-white/20">PRIVATE<br />RFC 1918</div>
          </div>
          <div className="mt-8">
            <div className="relative h-14">
              <div className="absolute left-0 right-0 top-5 h-px bg-white/[.12]" />
              <div className="subnet-marker absolute left-[42%] top-[12px] h-4 w-4 -translate-x-1/2 rounded-full border-4 border-[#0c0e0d] bg-[#86c9bb] shadow-[0_0_28px_rgba(134,201,187,.38)]" />
              <span className="absolute bottom-0 left-0 font-mono text-[7px] text-white/25">192.168.1.0</span>
              <span className="absolute bottom-0 right-0 font-mono text-[7px] text-white/25">192.168.1.255</span>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-4 gap-px overflow-hidden rounded-[14px] bg-white/[.06]">
            {[["MASK","255.255.255.0"],["HOSTS","254"],["NET BITS","24"],["HOST BITS","8"]].map(([label, value]) => (
              <div key={label} className="bg-white/[.025] p-3">
                <div className="text-[6px] text-white/18">{label}</div>
                <div className="mt-2 break-all font-mono text-[8px] font-semibold text-white/58">{value}</div>
              </div>
            ))}
          </div>
          <div className="mt-7 overflow-hidden rounded-[12px] border border-white/[.055] bg-black/20 p-3 font-mono text-[7px] tracking-[.05em] text-white/33">
            <span className="text-[#86c9bb]">11000000 10101000 00000001</span> <span className="text-[#d7b77a]">00001010</span>
          </div>
        </div>
      </div>
    </WindowShell>
  )
}

function HolidayVisual() {
  return (
    <WindowShell title="HOLIDAY OPTIMIZER" accent="#efb278" className="w-full">
      <div className="relative min-h-[410px] overflow-hidden bg-[#ece7dc] p-5 text-[#25251f]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(239,178,120,.24),transparent_27%),radial-gradient(circle_at_15%_84%,rgba(115,145,126,.12),transparent_26%)]" />
        <div className="relative">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[7px] tracking-[.13em] text-black/24">BEST LEAVE PLAN</div>
              <div className="mt-2 text-[54px] font-semibold tracking-[-.07em]">9 天</div>
            </div>
            <div className="text-right"><div className="text-[7px] text-black/24">USE</div><div className="mt-1 text-[18px] font-semibold text-[#a45f46]">3 天年假</div></div>
          </div>
          <div className="mt-7 flex gap-1.5">
            {Array.from({ length: 14 }).map((_, index) => {
              const leave = [5,6,7].includes(index)
              const holiday = [2,3,4,8,9].includes(index)
              return (
                <div key={index} className="flex-1">
                  <div className={`holiday-day h-20 rounded-[9px] border ${leave ? "border-[#a45f46]/20 bg-[#a45f46]/12" : holiday ? "border-[#6d8979]/20 bg-[#6d8979]/12" : "border-black/[.06] bg-white/35"}`} />
                  <div className="mt-1 text-center text-[6px] text-black/24">{index + 1}</div>
                </div>
              )
            })}
          </div>
          <div className="mt-7 grid grid-cols-3 gap-px overflow-hidden rounded-[14px] bg-black/[.07]">
            {[["CONTINUOUS","9 DAYS"],["LEAVE","3 DAYS"],["EFFICIENCY","3.0×"]].map(([label, value]) => (
              <div key={label} className="bg-[#f3eee4] p-4">
                <div className="text-[6px] text-black/22">{label}</div>
                <div className="mt-2 text-[13px] font-semibold">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </WindowShell>
  )
}

function FeatureVisual({ id }: { id: string }) {
  if (id === "builder") return <BuilderVisual />
  if (id === "enhance") return <EnhanceVisual />
  if (id === "data") return <DataVisual />
  if (id === "har") return <HarVisual />
  if (id === "world") return <WorldVisual />
  if (id === "space") return <SpaceVisual />
  if (id === "gsap") return <GsapVisual />
  if (id === "shot") return <ScreenshotVisual />
  if (id === "currency") return <CurrencyVisual />
  if (id === "qr") return <QrVisual />
  if (id === "subnet") return <SubnetVisual />
  return <HolidayVisual />
}

export default function BitLeapIntroFlowtyV2() {
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!rootRef.current) return

    gsap.registerPlugin(ScrollTrigger)

    const lenis = new Lenis({
      lerp: 0.075,
      smoothWheel: true,
      wheelMultiplier: 0.9,
      anchors: true,
    })

    lenis.on("scroll", ScrollTrigger.update)

    const raf = (time: number) => {
      lenis.raf(time * 1000)
    }

    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia()
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

      gsap.from(".flow-hero-reveal", {
        y: reduced ? 0 : 34,
        opacity: 0,
        duration: reduced ? 0.01 : 1.05,
        stagger: reduced ? 0 : 0.08,
        ease: "power3.out",
      })

      gsap.from(".hero-line", {
        yPercent: reduced ? 0 : 118,
        rotationX: reduced ? 0 : -18,
        opacity: 0,
        duration: reduced ? 0.01 : 1.15,
        stagger: reduced ? 0 : 0.1,
        delay: reduced ? 0 : 0.08,
        ease: "power4.out",
        transformOrigin: "50% 100%",
      })

      if (!reduced) {
        gsap.from(".hero-device-wrap", {
          y: 55,
          rotation: -2,
          opacity: 0,
          duration: 1.25,
          delay: 0.2,
          ease: "power3.out",
        })

        gsap.to(".hero-device-inner", {
          y: -13,
          duration: 4.8,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        })

        gsap.to(".hero-device-glow", {
          scale: 1.12,
          opacity: 0.72,
          duration: 4.4,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        })

        gsap.to(".hero-float-a", {
          y: -17,
          rotation: -1.5,
          duration: 4.1,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        })

        gsap.to(".hero-float-b", {
          y: 15,
          rotation: 2,
          duration: 5.2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        })

        gsap.to(".hero-aurora-a", {
          xPercent: 16,
          yPercent: 10,
          scale: 1.18,
          rotation: 22,
          duration: 9,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        })

        gsap.to(".hero-aurora-b", {
          xPercent: -18,
          yPercent: -8,
          scale: 1.22,
          rotation: -18,
          duration: 11,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        })

        gsap.to(".hero-spark", {
          opacity: (index) => index % 2 === 0 ? 0.18 : 0.9,
          scale: (index) => index % 2 === 0 ? 1.8 : 0.55,
          duration: (index) => 1.7 + index * 0.45,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          stagger: 0.25,
        })
      }

      mm.add("(min-width: 769px)", () => {
        if (reduced) return

        gsap.to(".hero-copy-parallax", {
          yPercent: 21,
          opacity: 0.15,
          ease: "none",
          scrollTrigger: {
            trigger: ".flow-hero",
            start: "top top",
            end: "bottom top",
            scrub: 1.1,
          },
        })

        gsap.to(".hero-device-wrap", {
          yPercent: -14,
          scale: 0.94,
          ease: "none",
          scrollTrigger: {
            trigger: ".flow-hero",
            start: "top top",
            end: "bottom top",
            scrub: 1.05,
          },
        })

        const pointerCleanups: Array<() => void> = []

        gsap.utils.toArray<HTMLElement>(".feature-section").forEach((section, index) => {
          const copy = section.querySelector(".feature-copy")
          const visual = section.querySelector(".feature-visual")
          const lines = section.querySelectorAll(".feature-line")
          const beam = section.querySelector(".feature-beam")
          const glow = section.querySelector(".feature-glow")
          const ghostNumber = section.querySelector(".feature-ghost-number")

          if (copy) {
            gsap.fromTo(
              copy,
              { y: 80, opacity: 0.14 },
              {
                y: 0,
                opacity: 1,
                ease: "none",
                scrollTrigger: {
                  trigger: section,
                  start: "top 92%",
                  end: "top 48%",
                  scrub: 0.9,
                },
              },
            )
          }

          if (lines.length) {
            gsap.from(lines, {
              yPercent: 112,
              rotationX: -16,
              opacity: 0,
              duration: 0.9,
              stagger: 0.09,
              ease: "power4.out",
              scrollTrigger: {
                trigger: section,
                start: "top 64%",
                once: true,
              },
            })
          }

          if (glow) {
            gsap.to(glow, {
              scale: 1.28,
              opacity: 0.9,
              duration: 3.6 + (index % 3) * 0.45,
              repeat: -1,
              yoyo: true,
              ease: "sine.inOut",
            })
          }

          if (ghostNumber) {
            gsap.fromTo(
              ghostNumber,
              { xPercent: index % 2 === 0 ? 15 : -15, rotation: index % 2 === 0 ? 4 : -4 },
              {
                xPercent: index % 2 === 0 ? -10 : 10,
                rotation: 0,
                ease: "none",
                scrollTrigger: {
                  trigger: section,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: 1.2,
                },
              },
            )
          }

          if (visual) {
            gsap.set(visual, {
              transformPerspective: 1200,
              transformOrigin: "50% 50%",
            })

            gsap.fromTo(
              visual,
              {
                y: 128,
                scale: 0.84,
                rotationX: 7,
                rotationY: index % 2 === 0 ? -6 : 6,
                rotationZ: index % 2 === 0 ? 2.8 : -2.8,
                opacity: 0.08,
                clipPath: "inset(10% 8% 10% 8% round 42px)",
                filter: "blur(10px)",
              },
              {
                y: 0,
                scale: 1,
                rotationX: 0,
                rotationY: 0,
                rotationZ: 0,
                opacity: 1,
                clipPath: "inset(0% 0% 0% 0% round 0px)",
                filter: "blur(0px)",
                ease: "none",
                scrollTrigger: {
                  trigger: section,
                  start: "top 98%",
                  end: "top 42%",
                  scrub: 1.05,
                },
              },
            )

            const rotateXTo = gsap.quickTo(visual, "rotationX", { duration: 0.55, ease: "power3.out" })
            const rotateYTo = gsap.quickTo(visual, "rotationY", { duration: 0.55, ease: "power3.out" })
            const xTo = gsap.quickTo(visual, "x", { duration: 0.55, ease: "power3.out" })
            const yTo = gsap.quickTo(visual, "y", { duration: 0.55, ease: "power3.out" })

            const onMove = (event: PointerEvent) => {
              if (event.pointerType === "touch") return
              const rect = section.getBoundingClientRect()
              const px = (event.clientX - rect.left) / rect.width - 0.5
              const py = (event.clientY - rect.top) / rect.height - 0.5
              rotateYTo(px * 4.2)
              rotateXTo(py * -3.4)
              xTo(px * 12)
              yTo(py * 9)
            }

            const onLeave = () => {
              rotateXTo(0)
              rotateYTo(0)
              xTo(0)
              yTo(0)
            }

            section.addEventListener("pointermove", onMove)
            section.addEventListener("pointerleave", onLeave)

            pointerCleanups.push(() => {
              section.removeEventListener("pointermove", onMove)
              section.removeEventListener("pointerleave", onLeave)
            })

            if (beam) {
              gsap.fromTo(
                beam,
                { xPercent: -110, opacity: 0 },
                {
                  xPercent: 520,
                  opacity: 0.9,
                  duration: 1.35,
                  ease: "power2.inOut",
                  scrollTrigger: {
                    trigger: section,
                    start: "top 58%",
                    once: true,
                  },
                },
              )
            }

            gsap.from(section.querySelectorAll(".motion-bar"), {
              scaleX: 0,
              transformOrigin: "left center",
              stagger: 0.08,
              duration: 0.7,
              ease: "power3.out",
              scrollTrigger: {
                trigger: section,
                start: "top 62%",
                once: true,
              },
            })

            gsap.to(section.querySelectorAll(".motion-orb"), {
              y: (orbIndex) => (orbIndex % 2 === 0 ? -16 : 14),
              x: (orbIndex) => (orbIndex - 1) * 8,
              rotation: (orbIndex) => (orbIndex % 2 === 0 ? 14 : -12),
              duration: (orbIndex) => 2.9 + orbIndex * 0.45,
              repeat: -1,
              yoyo: true,
              ease: "sine.inOut",
            })

            gsap.to(section.querySelectorAll(".shot-card"), {
              y: -10,
              rotation: -1.2,
              duration: 3.8,
              repeat: -1,
              yoyo: true,
              ease: "sine.inOut",
            })

            gsap.to(section.querySelectorAll(".shot-chip"), {
              y: (chipIndex) => chipIndex % 2 === 0 ? -8 : 8,
              duration: (chipIndex) => 3.2 + chipIndex * 0.4,
              repeat: -1,
              yoyo: true,
              ease: "sine.inOut",
            })

            const currencyLine = section.querySelector<SVGPathElement>(".currency-line")
            if (currencyLine) {
              const lineLength = currencyLine.getTotalLength()
              gsap.fromTo(
                currencyLine,
                { strokeDasharray: lineLength, strokeDashoffset: lineLength },
                {
                  strokeDashoffset: 0,
                  duration: 1.1,
                  ease: "power2.inOut",
                  scrollTrigger: {
                    trigger: section,
                    start: "top 64%",
                    once: true,
                  },
                },
              )
            }

            gsap.to(section.querySelectorAll(".qr-demo"), {
              rotation: 1.8,
              scale: 1.025,
              duration: 3.8,
              repeat: -1,
              yoyo: true,
              ease: "sine.inOut",
            })

            gsap.to(section.querySelectorAll(".qr-pulse"), {
              scale: 1.24,
              opacity: 0.45,
              duration: 2.8,
              repeat: -1,
              yoyo: true,
              ease: "sine.inOut",
            })

            gsap.to(section.querySelectorAll(".subnet-marker"), {
              x: 22,
              duration: 2.8,
              repeat: -1,
              yoyo: true,
              ease: "sine.inOut",
            })

            gsap.from(section.querySelectorAll(".holiday-day"), {
              y: 12,
              scaleY: 0.68,
              opacity: 0,
              stagger: 0.035,
              duration: 0.55,
              ease: "back.out(1.7)",
              scrollTrigger: {
                trigger: section,
                start: "top 60%",
                once: true,
              },
            })
          }
        })

        gsap.to(".manifest-copy", {
          yPercent: -22,
          ease: "none",
          scrollTrigger: {
            trigger: ".manifest-section",
            start: "top bottom",
            end: "bottom top",
            scrub: 1,
          },
        })

        gsap.to(".more-track", {
          xPercent: -27,
          ease: "none",
          scrollTrigger: {
            trigger: ".more-section",
            start: "top bottom",
            end: "bottom top",
            scrub: 1.2,
          },
        })

        return () => {
          pointerCleanups.forEach((cleanup) => cleanup())
        }
      })

      mm.add("(max-width: 768px)", () => {
        gsap.utils.toArray<HTMLElement>(".feature-section").forEach((section) => {
          gsap.from(section.querySelectorAll(".mobile-reveal"), {
            y: reduced ? 0 : 28,
            opacity: 0,
            duration: reduced ? 0.01 : 0.7,
            stagger: 0.07,
            ease: "power3.out",
            scrollTrigger: {
              trigger: section,
              start: "top 82%",
              once: true,
            },
          })
        })
      })

      gsap.utils.toArray<HTMLElement>(".simple-reveal").forEach((item) => {
        gsap.from(item, {
          y: reduced ? 0 : 34,
          opacity: 0,
          duration: reduced ? 0.01 : 0.85,
          ease: "power3.out",
          scrollTrigger: {
            trigger: item,
            start: "top 82%",
            once: true,
          },
        })
      })

      ScrollTrigger.refresh()

      return () => mm.revert()
    }, rootRef)

    return () => {
      ctx.revert()
      gsap.ticker.remove(raf)
      lenis.destroy()
    }
  }, [])

  return (
    <main ref={rootRef} className="overflow-hidden bg-[#08080b] text-[#f1f0ed] selection:bg-white selection:text-black">
      <style>{`
        html.lenis, html.lenis body { height: auto; }
        .lenis.lenis-smooth { scroll-behavior: auto !important; }
        .lenis.lenis-stopped { overflow: hidden; }
        .lenis.lenis-smooth iframe { pointer-events: none; }
        .flow-noise {
          background-image:
            radial-gradient(circle at 1px 1px, rgba(255,255,255,.055) 1px, transparent 0);
          background-size: 4px 4px;
          mask-image: linear-gradient(to bottom, black, transparent 85%);
        }
        .flow-outline {
          -webkit-text-stroke: 1px rgba(241,240,237,.26);
          color: transparent;
        }
        .flow-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .flow-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,.13); }
        .cn-display {
          line-height: 1.08 !important;
          letter-spacing: -.045em !important;
          text-wrap: balance;
        }
        .cn-display-relaxed {
          line-height: 1.12 !important;
          letter-spacing: -.038em !important;
          text-wrap: balance;
        }
        .cn-lines {
          display: flex;
          flex-direction: column;
          gap: .10em;
        }
        .flow-body {
          font-size: 11px;
          line-height: 1.9;
          letter-spacing: .008em;
          text-wrap: pretty;
        }
        .feature-line-wrap {
          display: block;
          overflow: hidden;
          padding-bottom: .06em;
        }
        .feature-line,
        .hero-line {
          display: block;
          transform-origin: 50% 100%;
          will-change: transform, opacity;
        }
        .feature-visual {
          position: relative;
          transform-style: preserve-3d;
        }
        .feature-visual::after {
          content: "";
          position: absolute;
          inset: -1px;
          pointer-events: none;
          border-radius: 30px;
          background: linear-gradient(112deg, transparent 34%, rgba(255,255,255,.14) 49%, transparent 63%);
          transform: translateX(-135%);
          opacity: 0;
          mix-blend-mode: screen;
        }
        @media (min-width: 640px) {
          .flow-body { font-size: 12px; }
        }
      `}</style>

      <section className="flow-hero relative min-h-[100svh] overflow-hidden">
        <div className="absolute inset-0 bg-[#08080b]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_73%_55%,rgba(81,72,205,.29),transparent_31%),radial-gradient(circle_at_62%_88%,rgba(157,76,160,.24),transparent_27%),radial-gradient(circle_at_42%_100%,rgba(57,67,155,.22),transparent_30%)]" />
        <div className="flow-noise pointer-events-none absolute inset-0 opacity-[.14]" />
        <div className="hero-aurora hero-aurora-a pointer-events-none absolute left-[48%] top-[9%] h-[48vw] w-[48vw] rounded-full bg-[#6d60ff]/14 blur-[95px]" />
        <div className="hero-aurora hero-aurora-b pointer-events-none absolute bottom-[-18%] right-[3%] h-[42vw] w-[42vw] rounded-full bg-[#c44aa6]/12 blur-[110px]" />
        <div className="hero-spark pointer-events-none absolute left-[8%] top-[24%] h-1.5 w-1.5 rounded-full bg-white/70 shadow-[0_0_18px_rgba(255,255,255,.75)]" />
        <div className="hero-spark pointer-events-none absolute right-[13%] top-[20%] h-1 w-1 rounded-full bg-[#b5abff] shadow-[0_0_20px_rgba(181,171,255,.8)]" />
        <div className="hero-spark pointer-events-none absolute bottom-[18%] left-[43%] h-1 w-1 rounded-full bg-[#e8a5d7] shadow-[0_0_20px_rgba(232,165,215,.75)]" />

        <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-[1580px] flex-col px-5 pb-5 pt-5 sm:px-8 lg:px-10">
          <nav className="flow-hero-reveal flex h-12 items-center justify-between">
            <Link href="/" className="text-[15px] font-black tracking-[-.05em]">BitLeap</Link>

            <div className="hidden items-center gap-8 md:flex">
              <a href="#experience" className="text-[9px] font-semibold text-white/36 transition hover:text-white">Experience</a>
              <a href="#tools" className="text-[9px] font-semibold text-white/36 transition hover:text-white">Tools</a>
              <a href="#about" className="text-[9px] font-semibold text-white/36 transition hover:text-white">About</a>
            </div>

            <Link href="/" className="rounded-full border border-white/15 bg-white px-4 py-2.5 text-[9px] font-semibold text-[#0b0b0d] transition hover:scale-[1.02]">打开工具库</Link>
          </nav>

          <div className="grid flex-1 items-center gap-5 pb-7 pt-8 lg:grid-cols-[.94fr_1.06fr]">
            <div className="hero-copy-parallax relative z-20 lg:-mt-8">
              <div className="flow-hero-reveal text-[9px] font-semibold tracking-[.24em] text-white/24">100 TOOLS · ONE QUIET PLACE</div>

              <h1 className="cn-display cn-lines mt-6 max-w-[860px] text-[clamp(56px,8vw,122px)] font-medium">
                <span className="overflow-hidden pb-[.04em]"><span className="hero-line">别让小工具</span></span>
                <span className="overflow-hidden pb-[.04em]">
                  <span className="hero-line flex items-center gap-[.12em]">
                    <span>打断你的思路</span>
                    <span className="inline-flex shrink-0 text-[#aaa1ff]"><Spark /></span>
                  </span>
                </span>
              </h1>

              <div className="flow-hero-reveal mt-8 grid max-w-[620px] gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
                <div>
                  <p className="flow-body max-w-[500px] text-white/45">转换、生成、分析、调试、设计。BitLeap 把散落的小任务收进一个更安静、更直接的工具站。</p>
                  <div className="mt-5 flex items-center gap-3">
                    <Link href="/" className="inline-flex items-center gap-4 rounded-full bg-white px-5 py-3 text-[9px] font-semibold text-black transition hover:gap-5"><span>开始使用</span><Arrow /></Link>
                    <a href="#experience" className="grid h-10 w-10 place-items-center rounded-full border border-white/13 text-white/38 transition hover:border-white/25 hover:text-white">↓</a>
                  </div>
                </div>
                <span className="hidden pb-1 text-[8px] leading-4 text-white/18 sm:block">NO INSTALL<br />NO LEARNING CURVE</span>
              </div>
            </div>

            <div className="relative z-10 flex items-center justify-center lg:justify-end">
              <HeroMockup />
            </div>
          </div>

          <div className="flow-hero-reveal mx-auto flex w-full max-w-[900px] items-center gap-3 rounded-full border border-white/[.11] bg-white/[.07] p-1.5 pl-5 shadow-[0_14px_55px_rgba(0,0,0,.22)] backdrop-blur-xl">
            <span className="hidden flex-1 text-[8px] tracking-[.08em] text-white/24 sm:block">JSON · AI · DATA · CSS · MEDIA · DAILY</span>
            <div className="flex items-center gap-2 rounded-full bg-white/[.08] px-4 py-2.5 text-[8px] text-white/38"><span className="h-1.5 w-1.5 rounded-full bg-[#a89aff]" />100 个工具入口</div>
            <Link href="/" className="ml-auto inline-flex items-center gap-3 rounded-full bg-white px-5 py-2.5 text-[9px] font-semibold text-black"><span>Explore</span><Arrow /></Link>
          </div>
        </div>
      </section>

      <section id="experience" className="relative min-h-[110svh] overflow-hidden bg-[#08080b] px-5 py-28 sm:px-8 lg:px-10 lg:py-40">
        <div className="absolute inset-x-0 bottom-0 h-[70%] bg-[radial-gradient(ellipse_at_50%_100%,rgba(88,76,203,.28),transparent_54%),radial-gradient(ellipse_at_75%_100%,rgba(164,73,157,.20),transparent_45%)]" />
        <div className="simple-reveal relative z-10 mx-auto max-w-[1260px] text-center">
          <div className="text-[9px] font-semibold tracking-[.22em] text-white/20">A TOOLBOX THAT STAYS OUT OF THE WAY</div>
          <h2 className="cn-display cn-lines mx-auto mt-7 max-w-[1100px] text-[clamp(46px,6.7vw,100px)] font-medium">
            <span>一个安静的工具站，</span>
            <span>为每天那些小而真实的任务。</span>
          </h2>
          <p className="flow-body mx-auto mt-8 max-w-[620px] text-white/40">打开。输入。调整。复制或导出。真正需要被设计的，不只是结果，也是你抵达结果之前那几步。</p>
        </div>

        <div className="simple-reveal relative z-10 mx-auto mt-20 grid max-w-[1180px] gap-4 lg:grid-cols-2">
          <div className="rounded-[30px] border border-white/[.08] bg-white/[.035] p-7 lg:min-h-[390px]">
            <div className="text-[8px] font-semibold tracking-[.17em] text-white/20">01 / LESS FRICTION</div>
            <div className="cn-display-relaxed cn-lines mt-8 text-[clamp(32px,4.1vw,56px)] font-medium">
              <span>打开就用。</span>
              <span>结果不藏起来。</span>
            </div>
            <p className="flow-body mt-6 max-w-[450px] text-white/38">高频工具不需要 onboarding，也不需要一堆确认按钮。BitLeap 更偏向实时预览、即时反馈和直接导出。</p>
            <div className="mt-12 flex gap-2">
              {["INPUT", "LIVE", "COPY", "DONE"].map((item, index) => <span key={item} className={`rounded-full px-3 py-2 text-[7px] font-semibold ${index === 3 ? "bg-white text-black" : "border border-white/[.08] text-white/26"}`}>{item}</span>)}
            </div>
          </div>

          <div className="rounded-[30px] border border-white/[.08] bg-white/[.035] p-7 lg:min-h-[390px]">
            <div className="text-[8px] font-semibold tracking-[.17em] text-white/20">02 / LOCAL WHEN POSSIBLE</div>
            <div className="cn-display-relaxed cn-lines mt-8 text-[clamp(32px,4.1vw,56px)] font-medium">
              <span>能在本地完成，</span>
              <span>就少绕一圈。</span>
            </div>
            <p className="flow-body mt-6 max-w-[450px] text-white/38">图片、编码、Hash、RSA、格式转换等任务，能留在浏览器里的就尽量留在浏览器里。少一点等待，也少一点不必要的数据流动。</p>
            <div className="mt-12 h-px bg-white/[.07]" />
            <div className="mt-4 flex justify-between text-[7px] text-white/20"><span>BROWSER</span><span>PROCESS</span><span>RESULT</span></div>
          </div>
        </div>
      </section>

      <section id="tools" className="bg-[#08080b]">
        <div className="mx-auto max-w-[1580px] border-t border-white/[.07] px-5 py-24 sm:px-8 lg:px-10 lg:py-32">
          <div className="simple-reveal grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div>
              <div className="text-[9px] font-semibold tracking-[.22em] text-white/20">SELECTED TOOLS</div>
              <h2 className="cn-display cn-lines mt-6 text-[clamp(46px,6.1vw,88px)] font-medium">
                <span>不是把 100 个</span>
                <span>名字全贴出来。</span>
              </h2>
            </div>
            <p className="flow-body max-w-[570px] text-white/39 lg:justify-self-end">先看几个更能代表 BitLeap 上限的工具：页面搭建、本地 AI、数据可视化、网络调试、全球数据、NASA、动效实验、截图设计、汇率分析、二维码设计、子网分析和拼假规划。</p>
          </div>
        </div>

        {FEATURED.map((tool, index) => (
          <section key={tool.id} className="feature-section relative min-h-[105svh] overflow-hidden border-t border-white/[.065] px-5 py-24 sm:px-8 lg:px-10 lg:py-28">
            <div className="absolute inset-0" style={{ background: `radial-gradient(circle at ${index % 2 === 0 ? "78% 50%" : "22% 50%"}, ${tool.accent}20, transparent 31%)` }} />
            <div className="feature-glow pointer-events-none absolute h-[36vw] w-[36vw] rounded-full blur-[100px]" style={{ left: index % 2 === 0 ? "63%" : "3%", top: "30%", background: `${tool.accent}16` }} />
            <div className="feature-ghost-number pointer-events-none absolute right-[2%] top-[3%] font-mono text-[clamp(120px,23vw,330px)] font-semibold leading-none tracking-[-.08em] text-white/[.018]">{tool.number}</div>
            <div className={`relative mx-auto grid min-h-[78svh] max-w-[1480px] items-center gap-14 lg:grid-cols-2 ${index % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}>
              <div className="feature-copy mobile-reveal">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[8px] text-white/17">{tool.number}</span>
                  <span className="h-px w-10 bg-white/12" />
                  <span className="text-[8px] font-semibold tracking-[.17em]" style={{ color: `${tool.accent}aa` }}>{tool.eyebrow}</span>
                </div>
                <div className="mt-8 text-[11px] font-semibold text-white/38">{tool.title}</div>
                <h3 className="cn-display mt-5 max-w-[690px] text-[clamp(42px,5.6vw,82px)] font-medium">
                  <span className="feature-line-wrap"><span className="feature-line">{tool.line1}</span></span>
                  <span className="feature-line-wrap mt-[.06em]"><span className="feature-line">{tool.line2}</span></span>
                </h3>
                <p className="flow-body mt-7 max-w-[520px] text-white/39">{tool.body}</p>
                <a href={tool.href} className="mt-8 inline-flex items-center gap-4 rounded-full border border-white/[.11] bg-white/[.04] px-5 py-3 text-[9px] font-semibold text-white/62 transition hover:gap-5 hover:bg-white hover:text-black"><span>打开 {tool.title}</span><Arrow /></a>
              </div>

              <div className="feature-visual mobile-reveal">
                <div className="feature-beam pointer-events-none absolute inset-y-[-8%] left-[-32%] z-20 w-[26%] rotate-[11deg] bg-gradient-to-r from-transparent via-white/[.10] to-transparent blur-[8px]" />
                <FeatureVisual id={tool.id} />
              </div>
            </div>
          </section>
        ))}
      </section>

      <section id="about" className="manifest-section relative min-h-[105svh] overflow-hidden bg-[#ededeb] px-5 py-28 text-[#151613] sm:px-8 lg:px-10 lg:py-40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(108,98,232,.13),transparent_27%),radial-gradient(circle_at_25%_92%,rgba(158,85,156,.11),transparent_25%)]" />
        <div className="manifest-copy simple-reveal relative mx-auto max-w-[1320px]">
          <div className="text-center text-[9px] font-semibold tracking-[.22em] text-black/24">SMALL TOOLS · SERIOUSLY MADE</div>
          <h2 className="cn-display cn-lines mx-auto mt-7 max-w-[1180px] text-center text-[clamp(52px,7.8vw,116px)] font-medium">
            <span>工具可以很小</span>
            <span>体验不用将就</span>
          </h2>
          <p className="flow-body mx-auto mt-8 max-w-[640px] text-center text-black/45">BitLeap 不想成为另一个“功能很多但每个都差不多”的工具集合。一个工具只解决一类问题，但把输入、反馈、预览和导出都认真做完。</p>

          <div className="mx-auto mt-16 grid max-w-[980px] gap-px overflow-hidden rounded-[28px] bg-black/[.08] sm:grid-cols-3">
            <div className="bg-[#f5f3ef] p-6 text-center"><span className="text-[8px] tracking-[.12em] text-black/24">TOOL ENTRIES</span><div className="mt-4 text-[52px] font-medium tracking-[-.07em]">100</div><p className="mt-2 text-[8px] text-black/30">覆盖开发、媒体、CSS、数据、生活与创作。</p></div>
            <div className="bg-[#f5f3ef] p-6 text-center"><span className="text-[8px] tracking-[.12em] text-black/24">FEEDBACK</span><div className="mt-4 text-[52px] font-medium tracking-[-.07em]">LIVE</div><p className="mt-2 text-[8px] text-black/30">尽量让结果随着输入和参数立即发生。</p></div>
            <div className="bg-[#f5f3ef] p-6 text-center"><span className="text-[8px] tracking-[.12em] text-black/24">PHILOSOPHY</span><div className="mt-4 text-[52px] font-medium tracking-[-.07em]">LESS</div><p className="mt-2 text-[8px] text-black/30">少一点噪音，把注意力还给正在做的事。</p></div>
          </div>
        </div>
      </section>

      <section className="more-section relative overflow-hidden bg-[#7065dc] py-24 text-white lg:py-32">
        <div className="simple-reveal mx-auto max-w-[1480px] px-5 sm:px-8 lg:px-10">
          <div className="grid gap-6 lg:grid-cols-[.7fr_1.3fr] lg:items-end">
            <h2 className="cn-display-relaxed cn-lines text-[clamp(40px,5.2vw,70px)] font-medium">
              <span>还有更多，</span>
              <span>但不必一次看完。</span>
            </h2>
            <p className="flow-body max-w-[520px] text-white/55 lg:justify-self-end">工具站应该在需要的时候出现，而不是要求你记住所有功能。下面只是其中一小部分。</p>
          </div>
        </div>

        <div className="more-track mt-16 flex w-max gap-4 pl-[8vw] will-change-transform lg:mt-20">
          {[...MORE_TOOLS, ...MORE_TOOLS].map(([title, href], index) => (
            <a key={`${title}-${index}`} href={href} className="group flex h-[220px] w-[290px] shrink-0 flex-col justify-between rounded-[26px] border border-white/18 bg-white/[.07] p-5 backdrop-blur-sm transition hover:bg-white hover:text-[#191919] sm:h-[260px] sm:w-[340px]">
              <div className="flex items-center justify-between"><span className="text-[8px] tracking-[.13em] opacity-40">BITLEAP</span><Arrow /></div>
              <div><div className="text-[clamp(22px,2.7vw,36px)] font-medium leading-[.95] tracking-[-.055em]">{title}</div><div className="mt-3 text-[8px] opacity-40">OPEN TOOL →</div></div>
            </a>
          ))}
        </div>
      </section>

      <section className="relative min-h-[95svh] overflow-hidden bg-[#08080b] px-5 py-24 sm:px-8 lg:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(91,78,205,.38),transparent_48%),radial-gradient(ellipse_at_70%_95%,rgba(167,75,158,.25),transparent_39%)]" />
        <div className="simple-reveal relative z-10 mx-auto flex min-h-[72svh] max-w-[1320px] flex-col items-center justify-center text-center">
          <div className="text-[9px] font-semibold tracking-[.22em] text-white/20">BITLEAP · OPEN WHEN NEEDED</div>
          <h2 className="cn-display mt-7 flex max-w-[1160px] flex-col items-center gap-[.12em] text-[clamp(54px,7.9vw,120px)] font-medium">
            <span className="block">找到工具。</span>
            <span className="flex items-center justify-center gap-[.16em]">
              <span>把事情做完</span>
              <span className="inline-flex shrink-0 text-[#aaa1ff]"><Spark /></span>
            </span>
          </h2>
          <p className="flow-body mt-8 max-w-[540px] text-white/38">不用安装一套新的工作方式。需要的时候打开，结束的时候离开。</p>
          <Link href="/" className="mt-9 inline-flex items-center gap-5 rounded-full bg-white px-7 py-4 text-[10px] font-semibold text-black transition hover:gap-6"><span>探索全部工具</span><Arrow /></Link>
        </div>

        <footer className="relative z-10 mx-auto flex max-w-[1480px] flex-col gap-4 border-t border-white/[.07] pt-5 text-[8px] text-white/18 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[11px] font-black tracking-[-.04em] text-white/60">BitLeap</span>
          <span>100 TOOLS · MADE FOR THE SMALL THINGS</span>
          <div className="flex gap-5"><Link href="/" className="hover:text-white/50">Home</Link><Link href="/" className="hover:text-white/50">Tools</Link></div>
        </footer>
      </section>
    </main>
  )
}
