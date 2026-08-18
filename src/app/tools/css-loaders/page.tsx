'use client'

import { useState } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
type Loader = {
  id: string
  name: string
  group: '圆环' | '点阵' | '条形' | '特殊'
  css: string
}

const LOADERS: Loader[] = [
  // ===== 原有 12 个 =====
  {
    id: 'ring',
    name: '经典圆环',
    group: '圆环',
    css: `.bl-ring{
  width:42px;height:42px;border-radius:50%;
  border:4px solid rgb(var(--ring-track));
  border-top-color:rgb(var(--ring-main));
  animation:bl-spin .8s linear infinite;
}
@keyframes bl-spin{to{transform:rotate(360deg)}}`,
  },
  {
    id: 'dual-ring',
    name: '双环反向',
    group: '圆环',
    css: `.bl-dual{position:relative;width:42px;height:42px}
.bl-dual::before,.bl-dual::after{content:'';position:absolute;inset:0;border-radius:50%;border:3px solid transparent}
.bl-dual::before{border-top-color:#8b5cf6;animation:bl-spin .9s linear infinite}
.bl-dual::after{border-bottom-color:#ec4899;animation:bl-spin-rev 1.3s linear infinite}
@keyframes bl-spin-rev{to{transform:rotate(-360deg)}}`,
  },
  {
    id: 'conic',
    name: 'Conic 渐变环',
    group: '圆环',
    css: `.bl-conic{width:42px;height:42px;border-radius:50%;
  background:conic-gradient(#8b5cf6,#ec4899,#22d3ee,#8b5cf6);
  animation:bl-spin 1.2s linear infinite;position:relative}
.bl-conic::after{content:'';position:absolute;inset:4px;border-radius:50%;background:rgb(var(--ring-bg))}`,
  },
  {
    id: 'dots',
    name: '三点脉冲',
    group: '点阵',
    css: `.bl-dots{display:flex;gap:6px}
.bl-dots i{width:9px;height:9px;border-radius:50%;background:rgb(var(--ring-main));
  animation:bl-fade 1.4s ease-in-out infinite both}
.bl-dots i:nth-child(2){animation-delay:.2s}
.bl-dots i:nth-child(3){animation-delay:.4s}
@keyframes bl-fade{0%,80%,100%{transform:scale(0);opacity:.4}40%{transform:scale(1);opacity:1}}`,
  },
  {
    id: 'bounce-chain',
    name: '弹跳点链',
    group: '点阵',
    css: `.bl-chain{display:flex;gap:5px}
.bl-chain i{width:9px;height:9px;border-radius:50%;background:#8b5cf6;animation:bl-bounce .6s ease-in-out infinite}
.bl-chain i:nth-child(2){animation-delay:.1s;background:#a855f7}
.bl-chain i:nth-child(3){animation-delay:.2s;background:#c026d3}
.bl-chain i:nth-child(4){animation-delay:.3s;background:#db2777}
@keyframes bl-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}`,
  },
  {
    id: 'signal',
    name: '信号柱',
    group: '条形',
    css: `.bl-bars{display:flex;gap:3px;align-items:flex-end;height:32px}
.bl-bars i{width:5px;background:rgb(var(--ring-main));border-radius:2px;animation:bl-bar .9s ease-in-out infinite}
.bl-bars i:nth-child(1){height:40%;animation-delay:0s}
.bl-bars i:nth-child(2){height:70%;animation-delay:.15s}
.bl-bars i:nth-child(3){height:100%;animation-delay:.3s}
.bl-bars i:nth-child(4){height:60%;animation-delay:.45s}
.bl-bars i:nth-child(5){height:30%;animation-delay:.6s}
@keyframes bl-bar{0%,100%{transform:scaleY(.4)}50%{transform:scaleY(1)}}`,
  },
  {
    id: 'orbit',
    name: '轨道双星',
    group: '特殊',
    css: `.bl-orbit{position:relative;width:42px;height:42px}
.bl-orbit::before{content:'';position:absolute;inset:0;border-radius:50%;border:2px solid rgb(var(--ring-track))}
.bl-orbit i{position:absolute;top:50%;left:50%;width:8px;height:8px;margin:-4px;border-radius:50%;background:#8b5cf6;transform-origin:4px 0;animation:bl-orbit 1.4s linear infinite}
.bl-orbit i:nth-child(2){background:#ec4899;animation-duration:2s;animation-direction:reverse}
@keyframes bl-orbit{to{transform:rotate(360deg)}}`,
  },
  {
    id: 'blob',
    name: '液态圆角',
    group: '特殊',
    css: `.bl-blob{width:38px;height:38px;background:linear-gradient(135deg,#8b5cf6,#ec4899);
  animation:bl-morph 3s ease-in-out infinite}
@keyframes bl-morph{0%,100%{border-radius:42% 58% 63% 37%/41% 44% 56% 59%}
50%{border-radius:58% 42% 37% 63%/59% 56% 44% 41%}}`,
  },
  {
    id: 'dna',
    name: 'DNA 螺旋',
    group: '点阵',
    css: `.bl-dna{display:flex;gap:4px;align-items:center}
.bl-dna i{width:7px;height:7px;border-radius:50%;background:#8b5cf6;animation:bl-dna 1s ease-in-out infinite}
.bl-dna i:nth-child(odd){background:#ec4899}
.bl-dna i:nth-child(1){animation-delay:0s}
.bl-dna i:nth-child(2){animation-delay:.1s}
.bl-dna i:nth-child(3){animation-delay:.2s}
.bl-dna i:nth-child(4){animation-delay:.3s}
.bl-dna i:nth-child(5){animation-delay:.4s}
@keyframes bl-dna{0%,100%{transform:translateY(-6px)}50%{transform:translateY(6px)}}`,
  },
  {
    id: 'hourglass',
    name: '沙漏翻转',
    group: '特殊',
    css: `.bl-hour{width:0;height:0;border-left:14px solid transparent;border-right:14px solid transparent;
  border-top:22px solid rgb(var(--ring-main));animation:bl-flip 1.6s ease-in-out infinite}
@keyframes bl-flip{0%,100%{transform:rotate(0)}50%{transform:rotate(180deg)}}`,
  },
  {
    id: 'ellipsis',
    name: '打字省略号',
    group: '特殊',
    css: `.bl-elli{position:relative;width:42px;height:14px}
.bl-elli i{position:absolute;top:0;width:6px;height:6px;border-radius:50%;background:rgb(var(--ring-main));animation:bl-elli 1.4s infinite}
.bl-elli i:nth-child(1){left:4px;animation-delay:0s}
.bl-elli i:nth-child(2){left:18px;animation-delay:.2s}
.bl-elli i:nth-child(3){left:32px;animation-delay:.4s}
@keyframes bl-elli{0%,80%,100%{opacity:.3;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}`,
  },
  {
    id: 'shimmer',
    name: '骨架微光',
    group: '特殊',
    css: `.bl-skeleton{width:120px;height:14px;border-radius:7px;background:rgb(var(--ring-track));position:relative;overflow:hidden}
.bl-skeleton::after{content:'';position:absolute;inset:0;transform:translateX(-100%);
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);animation:bl-shimmer 1.4s infinite}
@keyframes bl-shimmer{100%{transform:translateX(100%)}}`,
  },

  // ===== 原有新增12个 =====
  {
    id: 'wave-dots',
    name: '点阵波浪',
    group: '点阵',
    css: `.bl-wave{display:flex;gap:5px;align-items:flex-end;height:28px}
.bl-wave i{width:8px;height:8px;border-radius:50%;background:rgb(var(--ring-main));animation:bl-wave .9s ease-in-out infinite}
.bl-wave i:nth-child(1){animation-delay:0s}
.bl-wave i:nth-child(2){animation-delay:.15s}
.bl-wave i:nth-child(3){animation-delay:.3s}
.bl-wave i:nth-child(4){animation-delay:.45s}
.bl-wave i:nth-child(5){animation-delay:.6s}
@keyframes bl-wave{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}`,
  },
  {
    id: 'breathe',
    name: '呼吸灯',
    group: '点阵',
    css: `.bl-bre{width:20px;height:20px;border-radius:50%;background:#22c55e;animation:bl-bre 2s ease-in-out infinite}
@keyframes bl-bre{0%,100%{opacity:1;transform:scale(1);box-shadow:0 0 0 0 rgba(34,197,94,.5)}50%{opacity:.5;transform:scale(.85);box-shadow:0 0 0 10px rgba(34,197,94,0)}}`,
  },
  {
    id: 'chase',
    name: '双点追逐',
    group: '点阵',
    css: `.bl-chase{position:relative;width:36px;height:36px}
.bl-chase i{position:absolute;top:50%;left:50%;width:8px;height:8px;margin:-4px;border-radius:50%;animation:bl-chase 1.6s ease-in-out infinite}
.bl-chase i:first-child{background:#8b5cf6}
.bl-chase i:last-child{background:#ec4899;animation-delay:-.8s}
@keyframes bl-chase{0%{transform:rotate(0) translate(14px) rotate(0)}100%{transform:rotate(360deg) translate(14px) rotate(-360deg)}}`,
  },
  {
    id: 'progress',
    name: '进度条',
    group: '条形',
    css: `.bl-prog{width:120px;height:6px;background:rgb(var(--ring-track));border-radius:3px;overflow:hidden}
.bl-prog i{display:block;height:100%;width:40%;background:rgb(var(--ring-main));border-radius:3px;animation:bl-prog 1.5s ease-in-out infinite}
@keyframes bl-prog{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}`,
  },
  {
    id: 'stripe',
    name: '条纹滚动',
    group: '条形',
    css: `.bl-str{width:120px;height:10px;border-radius:5px;overflow:hidden;position:relative}
.bl-str::after{content:'';position:absolute;top:0;left:0;width:200%;height:100%;
  background:repeating-linear-gradient(45deg,rgb(var(--ring-track)) 0 6px,transparent 6px 12px);
  animation:bl-str 1.8s linear infinite}
@keyframes bl-str{to{transform:translateX(-50%)}}`,
  },
  {
    id: 'ripple',
    name: '水波纹',
    group: '特殊',
    css: `.bl-rip{position:relative;width:42px;height:42px}
.bl-rip i{position:absolute;inset:0;border-radius:50%;border:2px solid rgb(var(--ring-main));animation:bl-rip 2.4s cubic-bezier(.4,0,.6,1) infinite}
.bl-rip i:nth-child(2){animation-delay:.8s}
.bl-rip i:nth-child(3){animation-delay:1.6s}
@keyframes bl-rip{0%{transform:scale(.2);opacity:.8}100%{transform:scale(1.6);opacity:0}}`,
  },
  {
    id: 'cross-spin',
    name: '旋转十字',
    group: '特殊',
    css: `.bl-crs{position:relative;width:36px;height:36px;animation:bl-spin 2s linear infinite}
.bl-crs::before,.bl-crs::after{content:'';position:absolute;top:50%;left:50%;width:28px;height:4px;background:rgb(var(--ring-main));transform:translate(-50%,-50%)}
.bl-crs::after{transform:translate(-50%,-50%) rotate(90deg)}`,
  },
  {
    id: 'flip-card',
    name: '翻牌',
    group: '特殊',
    css: `.bl-flip{width:32px;height:32px;background:rgb(var(--ring-main));animation:bl-flip 1.6s ease-in-out infinite}
@keyframes bl-flip{0%{transform:perspective(120px) rotateX(0) rotateY(0)}50%{transform:perspective(120px) rotateX(-180deg) rotateY(0)}100%{transform:perspective(120px) rotateX(-180deg) rotateY(-180deg)}}`,
  },
  {
    id: 'heartbeat',
    name: '心跳',
    group: '特殊',
    css: `.bl-hb{width:32px;height:32px;background:#ef4444;transform:rotate(45deg);animation:bl-hb 1.2s ease-in-out infinite;position:relative}
.bl-hb::before,.bl-hb::after{content:'';position:absolute;width:32px;height:32px;border-radius:50%;background:#ef4444}
.bl-hb::before{top:-16px;left:0}
.bl-hb::after{top:0;left:-16px}
@keyframes bl-hb{0%,100%{transform:rotate(45deg) scale(1)}14%{transform:rotate(45deg) scale(1.2)}28%{transform:rotate(45deg) scale(1)}}`,
  },
  {
    id: 'triangle',
    name: '旋转三角',
    group: '特殊',
    css: `.bl-tri{width:0;height:0;border-left:18px solid transparent;border-right:18px solid transparent;border-bottom:30px solid rgb(var(--ring-main));animation:bl-spin 2s linear infinite}`,
  },
  {
    id: 'spin-square',
    name: '旋转方块',
    group: '特殊',
    css: `.bl-sq{width:32px;height:32px;background:rgb(var(--ring-main));animation:bl-sq 1.2s ease-in-out infinite}
@keyframes bl-sq{0%{transform:rotate(0) scale(1)}50%{transform:rotate(180deg) scale(.6)}100%{transform:rotate(360deg) scale(1)}}`,
  },
  {
    id: 'dashed-ring',
    name: '虚线圆环',
    group: '圆环',
    css: `.bl-dash{width:38px;height:38px;border-radius:50%;border:3px dashed rgb(var(--ring-main));animation:bl-spin 1.5s linear infinite}`,
  },

  // ===== 本次新增8个 =====
  {
    id: 'spiral-orbit',
    name: '螺旋穿梭',
    group: '圆环',
    css: `.bl-spiral{position:relative;width:42px;height:42px}
.bl-spiral i{position:absolute;top:50%;left:50%;width:8px;height:8px;border-radius:50%;background:#8b5cf6;transform-origin:center;animation:bl-spiral 2s linear infinite}
.bl-spiral i:nth-child(2){background:#ec4899;animation-delay:-0.5s}
.bl-spiral i:nth-child(3){background:#22d3ee;animation-delay:-1s}
@keyframes bl-spiral{0%{transform:rotate(0deg) translate(14px) scale(0.6)}50%{transform:rotate(180deg) translate(6px) scale(1.1)}100%{transform:rotate(360deg) translate(14px) scale(0.6)}}`,
  },
  {
    id: 'clock',
    name: '时钟指针',
    group: '圆环',
    css: `.bl-clock{position:relative;width:42px;height:42px;border-radius:50%;border:2px solid rgb(var(--ring-track))}
.bl-clock::before{content:"";position:absolute;width:2px;height:14px;background:rgb(var(--ring-main));left:50%;bottom:50%;transform-origin:bottom center;transform:translateX(-50%);animation:bl-clock 6s linear infinite}
.bl-clock::after{content:"";position:absolute;width:2px;height:10px;background:#ec4899;left:50%;bottom:50%;transform-origin:bottom center;transform:translateX(-50%);animation:bl-clock 1.2s linear infinite}
@keyframes bl-clock{to{transform:translateX(-50%) rotate(360deg)}}`,
  },
  {
    id: 'radar-scan',
    name: '雷达扫描',
    group: '特殊',
    css: `.bl-radar{
  position:relative;
  width:44px;height:44px;
  border-radius:50%;
  background:conic-gradient(from 0deg,rgb(var(--ring-main)),transparent 60deg,transparent);
  animation:bl-spin 2s linear infinite;
}
.bl-radar::after{
  content:"";
  position:absolute;
  inset:3px;
  border-radius:50%;
  background:rgb(var(--ring-bg));
}
@keyframes bl-spin{to{transform:rotate(-360deg)}}`,
  },

  {
    id: 'elastic-ring',
    name: '弹性圆环',
    group: '圆环',
    css: `.bl-elastic-ring{width:42px;height:42px;border-radius:50%;border:3px solid rgb(var(--ring-main));animation:bl-elastic 1.2s ease-in-out infinite}
@keyframes bl-elastic{0%,100%{transform:scale(1)}50%{transform:scale(0.7)}}`,
  },
  {
    id: 'particle-burst',
    name: '粒子扩散',
    group: '点阵',
    css: `.bl-particle{position:relative;width:42px;height:42px}
.bl-particle i{position:absolute;width:7px;height:7px;border-radius:50%;background:rgb(var(--ring-main));top:50%;left:50%;animation:bl-particle 1.4s ease-out infinite}
.bl-particle i:nth-child(1){--angle:0deg}
.bl-particle i:nth-child(2){--angle:45deg}
.bl-particle i:nth-child(3){--angle:90deg}
.bl-particle i:nth-child(4){--angle:135deg}
.bl-particle i:nth-child(5){--angle:180deg}
.bl-particle i:nth-child(6){--angle:225deg}
.bl-particle i:nth-child(7){--angle:270deg}
.bl-particle i:nth-child(8){--angle:315deg}
@keyframes bl-particle{0%{transform:translate(-50%,-50%) rotate(var(--angle)) translateX(0);opacity:1}100%{transform:translate(-50%,-50%) rotate(var(--angle)) translateX(14px);opacity:0}}`,
  },
  {
    id: 'slide-square',
    name: '方块游走',
    group: '条形',
    css: `.bl-slide-sq{display:flex;gap:4px}
.bl-slide-sq i{width:10px;height:10px;background:rgb(var(--ring-main));animation:bl-slide-sq 1s ease-in-out infinite alternate}
.bl-slide-sq i:nth-child(1){animation-delay:0s}
.bl-slide-sq i:nth-child(2){animation-delay:.15s}
.bl-slide-sq i:nth-child(3){animation-delay:.3s}
@keyframes bl-slide-sq{0%{transform:translateY(-8px)}100%{transform:translateY(8px)}}`,
  },
  {
    id: 'pulse-ring-layer',
    name: '多层脉冲环',
    group: '圆环',
    css: `.bl-pulse-layer{position:relative;width:42px;height:42px}
.bl-pulse-layer i{position:absolute;inset:0;border-radius:50%;border:2px solid rgb(var(--ring-main));animation:bl-pulse-layer 2s ease-out infinite}
.bl-pulse-layer i:nth-child(2){animation-delay:-0.7s}
.bl-pulse-layer i:nth-child(3){animation-delay:-1.4s}
@keyframes bl-pulse-layer{0%{transform:scale(0.3);opacity:1}100%{transform:scale(1.4);opacity:0}}`,
  },
  {
    id: 'gear',
    name: '星星旋转',
    group: '特殊',
    css: `.bl-gear{width:36px;height:36px;background:rgb(var(--ring-main));clip-path:polygon(50% 0,61%38%,100%38%,68%62%,79%100%,50%76%,21%100%,32%62%,0 38%,39%38%);animation:bl-spin 2s linear infinite}`,
  },
]

const GROUPS = ['全部', '圆环', '点阵', '条形', '特殊'] as const

function Preview({ loader }: { loader: Loader }) {
  const html: Record<string, string> = {
    ring: '<div class="bl-ring"></div>',
    'dual-ring': '<div class="bl-dual"></div>',
    conic: '<div class="bl-conic"></div>',
    dots: '<div class="bl-dots"><i></i><i></i><i></i></div>',
    'bounce-chain': '<div class="bl-chain"><i></i><i></i><i></i><i></i></div>',
    signal: '<div class="bl-bars"><i></i><i></i><i></i><i></i><i></i></div>',
    orbit: '<div class="bl-orbit"><i></i><i></i></div>',
    blob: '<div class="bl-blob"></div>',
    dna: '<div class="bl-dna"><i></i><i></i><i></i><i></i><i></i></div>',
    hourglass: '<div class="bl-hour"></div>',
    ellipsis: '<div class="bl-elli"><i></i><i></i><i></i></div>',
    shimmer: '<div class="bl-skeleton"></div>',
    'wave-dots': '<div class="bl-wave"><i></i><i></i><i></i><i></i><i></i></div>',
    breathe: '<div class="bl-bre"></div>',
    chase: '<div class="bl-chase"><i></i><i></i></div>',
    progress: '<div class="bl-prog"><i></i></div>',
    stripe: '<div class="bl-str"></div>',
    ripple: '<div class="bl-rip"><i></i><i></i><i></i></div>',
    'cross-spin': '<div class="bl-crs"></div>',
    'flip-card': '<div class="bl-flip"></div>',
    heartbeat: '<div class="bl-hb"></div>',
    triangle: '<div class="bl-tri"></div>',
    'spin-square': '<div class="bl-sq"></div>',
    'dashed-ring': '<div class="bl-dash"></div>',
    'spiral-orbit': '<div class="bl-spiral"><i></i><i></i><i></i></div>',
    clock: '<div class="bl-clock"></div>',
    'radar-scan': '<div class="bl-radar"></div>',
    'elastic-ring': '<div class="bl-elastic-ring"></div>',
    'particle-burst': '<div class="bl-particle"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>',
    'slide-square': '<div class="bl-slide-sq"><i></i><i></i><i></i></div>',
    'pulse-ring-layer': '<div class="bl-pulse-layer"><i></i><i></i><i></i></div>',
    gear: '<div class="bl-gear"></div>',
  }
  return (
    <div
      className="flex items-center justify-center h-20 [&_*]:!text-app-text"
      style={{
        color: 'rgb(var(--ring-main))',
        ['--ring-main' as any]: 'var(--text)',
        ['--ring-track' as any]: 'var(--border)',
        ['--ring-bg' as any]: 'var(--bg-card)',
      }}
    >
      <style>{loader.css}</style>
      <div dangerouslySetInnerHTML={{ __html: html[loader.id] }} />
    </div>
  )
}

export default function CssLoaders() {
  const [group, setGroup] = useState<(typeof GROUPS)[number]>('全部')
  const [copied, setCopied] = useState<string | null>(null)

  const list = LOADERS.filter((l) => group === '全部' || l.group === group)

  const copy = async (css: string, id: string) => {
    await navigator.clipboard.writeText(css)
    setCopied(id)
    setTimeout(() => setCopied(null), 1200)
  }

  return (
    <div className="max-w-6xl mx-auto px-5 py-10 sm:px-8">
      <Breadcrumb />
      <div className="mb-8">
        <h1 className="text-3xl font-black text-app-text mb-2">CSS 加载动画库</h1>
        <p className="text-sm text-app-muted">32 个纯 CSS Loader，零 JS、零图片，点击复制完整 CSS 粘到项目即用。</p>
      </div>

      {/* 分组筛选 */}
      <div className="flex gap-2 flex-wrap mb-8">
        {GROUPS.map((g) => (
          <button
            key={g}
            onClick={() => setGroup(g)}
            className={`px-3.5 py-1.5 rounded-full text-sm border transition ${group === g
                ? 'bg-app-text text-app-bg border-app-text'
                : 'bg-app-card border-app-border text-app-muted hover:text-app-text'
              }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* 卡片网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((loader) => (
          <div
            key={loader.id}
            className="group relative bg-app-card border border-app-border rounded-2xl p-5 overflow-hidden hover:border-violet-200 dark:hover:border-violet-500/40 hover:shadow-[0_4px_24px_rgba(139,92,246,0.08)] dark:hover:shadow-[0_4_24px_rgba(139,92,246,0.15)] hover:-translate-y-0.5 transition-all duration-300"
          >
            {/* 光斑 */}
            <div className="absolute -top-8 -left-8 w-24 h-24 rounded-full bg-violet-100/50 dark:bg-violet-500/10 blur-2xl group-hover:bg-violet-200/60 dark:group-hover:bg-violet-500/20 group-hover:scale-125 transition-all duration-500 pointer-events-none" />
            <div className="absolute -bottom-8 -right-8 w-20 h-20 rounded-full bg-sky-50/60 dark:bg-violet-500/5 blur-2xl group-hover:bg-sky-100/70 dark:group-hover:bg-violet-500/10 group-hover:scale-125 transition-all duration-500 pointer-events-none" />

            <div className="relative">
              <span className="text-[11px] uppercase tracking-wider text-app-muted">{loader.group}</span>
              <h3 className="text-sm font-semibold text-app-text mb-3">{loader.name}</h3>

              <Preview loader={loader} />

              <button
                onClick={() => copy(loader.css, loader.id)}
                className="mt-4 w-full py-2 rounded-xl text-xs bg-app-bg border border-app-border text-app-text hover:border-violet-300 transition"
              >
                {copied === loader.id ? '✓ 已复制 CSS' : '📋 复制 CSS'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-app-muted mt-12">BitLeap · 纯前端 · 复制即用</p>
    </div>
  )
}
