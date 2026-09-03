'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  Check,
  Code2,
  Copy,
  Moon,
  Search,
  Sparkles,
  Sun,
  WandSparkles,
} from 'lucide-react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

type Loader = {
  id: string
  name: string
  group: '圆环' | '点阵' | '条形' | '特殊'
  css: string
}

type PreviewTheme = 'light' | 'dark'

const LOADERS: Loader[] = [
  {
    id: 'ring',
    name: '经典圆环',
    group: '圆环',
    css: `.bl-ring{width:42px;height:42px;border-radius:50%;border:4px solid #e5e7eb;border-top-color:#8b5cf6;animation:bl-spin .8s linear infinite}@keyframes bl-spin{to{transform:rotate(360deg)}}`,
  },
  {
    id: 'dual-ring',
    name: '双环反向',
    group: '圆环',
    css: `.bl-dual{position:relative;width:42px;height:42px}.bl-dual::before,.bl-dual::after{content:'';position:absolute;inset:0;border-radius:50%;border:3px solid transparent}.bl-dual::before{border-top-color:#8b5cf6;animation:bl-spin .9s linear infinite}.bl-dual::after{border-bottom-color:#ec4899;animation:bl-spin-rev 1.3s linear infinite}@keyframes bl-spin-rev{to{transform:rotate(-360deg)}}@keyframes bl-spin{to{transform:rotate(360deg)}}`,
  },
  {
    id: 'conic',
    name: 'Conic 渐变环',
    group: '圆环',
    css: `.bl-conic{width:42px;height:42px;border-radius:50%;background:conic-gradient(#8b5cf6,#ec4899,#22d3ee,#8b5cf6);animation:bl-spin 1.2s linear infinite;position:relative}.bl-conic::after{content:'';position:absolute;inset:4px;border-radius:50%;background:#fff}@keyframes bl-spin{to{transform:rotate(360deg)}}`,
  },
  {
    id: 'dots',
    name: '三点脉冲',
    group: '点阵',
    css: `.bl-dots{display:flex;gap:6px}.bl-dots i{width:9px;height:9px;border-radius:50%;background:#8b5cf6;animation:bl-fade 1.4s ease-in-out infinite both}.bl-dots i:nth-child(2){animation-delay:.2s}.bl-dots i:nth-child(3){animation-delay:.4s}@keyframes bl-fade{0%,80%,100%{transform:scale(0);opacity:.4}40%{transform:scale(1);opacity:1}}`,
  },
  {
    id: 'bounce-chain',
    name: '弹跳点链',
    group: '点阵',
    css: `.bl-chain{display:flex;gap:5px}.bl-chain i{width:9px;height:9px;border-radius:50%;background:#8b5cf6;animation:bl-bounce .6s ease-in-out infinite}.bl-chain i:nth-child(2){animation-delay:.1s;background:#a855f7}.bl-chain i:nth-child(3){animation-delay:.2s;background:#c026d3}.bl-chain i:nth-child(4){animation-delay:.3s;background:#db2777}@keyframes bl-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}`,
  },
  {
    id: 'signal',
    name: '信号柱',
    group: '条形',
    css: `.bl-bars{display:flex;gap:3px;align-items:flex-end;height:32px}.bl-bars i{width:5px;background:#8b5cf6;border-radius:2px;animation:bl-bar .9s ease-in-out infinite}.bl-bars i:nth-child(1){height:40%;animation-delay:0s}.bl-bars i:nth-child(2){height:70%;animation-delay:.15s}.bl-bars i:nth-child(3){height:100%;animation-delay:.3s}.bl-bars i:nth-child(4){height:60%;animation-delay:.45s}.bl-bars i:nth-child(5){height:30%;animation-delay:.6s}@keyframes bl-bar{0%,100%{transform:scaleY(.4)}50%{transform:scaleY(1)}}`,
  },
  {
    id: 'orbit',
    name: '轨道双星',
    group: '特殊',
    css: `.bl-orbit{position:relative;width:42px;height:42px}.bl-orbit::before{content:'';position:absolute;inset:0;border-radius:50%;border:2px solid #e5e7eb}.bl-orbit i{position:absolute;top:50%;left:50%;width:8px;height:8px;margin:-4px;border-radius:50%;background:#8b5cf6;transform-origin:4px 0;animation:bl-orbit 1.4s linear infinite}.bl-orbit i:nth-child(2){background:#ec4899;animation-duration:2s;animation-direction:reverse}@keyframes bl-orbit{to{transform:rotate(360deg)}}`,
  },
  {
    id: 'blob',
    name: '液态圆角',
    group: '特殊',
    css: `.bl-blob{width:38px;height:38px;background:linear-gradient(135deg,#8b5cf6,#ec4899);animation:bl-morph 3s ease-in-out infinite}@keyframes bl-morph{0%,100%{border-radius:42% 58% 63% 37%/41% 44% 56% 59%}50%{border-radius:58% 42% 37% 63%/59% 56% 44% 41%}}`,
  },
  {
    id: 'dna',
    name: 'DNA 螺旋',
    group: '点阵',
    css: `.bl-dna{display:flex;gap:4px;align-items:center}.bl-dna i{width:7px;height:7px;border-radius:50%;background:#8b5cf6;animation:bl-dna 1s ease-in-out infinite}.bl-dna i:nth-child(odd){background:#ec4899}.bl-dna i:nth-child(1){animation-delay:0s}.bl-dna i:nth-child(2){animation-delay:.1s}.bl-dna i:nth-child(3){animation-delay:.2s}.bl-dna i:nth-child(4){animation-delay:.3s}.bl-dna i:nth-child(5){animation-delay:.4s}@keyframes bl-dna{0%,100%{transform:translateY(-6px)}50%{transform:translateY(6px)}}`,
  },
  {
    id: 'hourglass',
    name: '沙漏翻转',
    group: '特殊',
    css: `.bl-hour{width:0;height:0;border-left:14px solid transparent;border-right:14px solid transparent;border-top:22px solid #8b5cf6;animation:bl-flip 1.6s ease-in-out infinite}@keyframes bl-flip{0%,100%{transform:rotate(0)}50%{transform:rotate(180deg)}}`,
  },
  {
    id: 'ellipsis',
    name: '打字省略号',
    group: '特殊',
    css: `.bl-elli{position:relative;width:42px;height:14px}.bl-elli i{position:absolute;top:0;width:6px;height:6px;border-radius:50%;background:#8b5cf6;animation:bl-elli 1.4s infinite}.bl-elli i:nth-child(1){left:4px;animation-delay:0s}.bl-elli i:nth-child(2){left:18px;animation-delay:.2s}.bl-elli i:nth-child(3){left:32px;animation-delay:.4s}@keyframes bl-elli{0%,80%,100%{opacity:.3;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}`,
  },
  {
    id: 'shimmer',
    name: '骨架微光',
    group: '特殊',
    css: `.bl-skeleton{width:120px;height:14px;border-radius:7px;background:#e5e7eb;position:relative;overflow:hidden}.bl-skeleton::after{content:'';position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);animation:bl-shimmer 1.4s infinite}@keyframes bl-shimmer{100%{transform:translateX(100%)}}`,
  },
  {
    id: 'wave-dots',
    name: '点阵波浪',
    group: '点阵',
    css: `.bl-wave{display:flex;gap:5px;align-items:flex-end;height:28px}.bl-wave i{width:8px;height:8px;border-radius:50%;background:#8b5cf6;animation:bl-wave .9s ease-in-out infinite}.bl-wave i:nth-child(1){animation-delay:0s}.bl-wave i:nth-child(2){animation-delay:.15s}.bl-wave i:nth-child(3){animation-delay:.3s}.bl-wave i:nth-child(4){animation-delay:.45s}.bl-wave i:nth-child(5){animation-delay:.6s}@keyframes bl-wave{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}`,
  },
  {
    id: 'breathe',
    name: '呼吸灯',
    group: '点阵',
    css: `.bl-bre{width:20px;height:20px;border-radius:50%;background:#22c55e;animation:bl-bre 2s ease-in-out infinite}@keyframes bl-bre{0%,100%{opacity:1;transform:scale(1);box-shadow:0 0 0 0 rgba(34,197,94,.5)}50%{opacity:.5;transform:scale(.85);box-shadow:0 0 0 10px rgba(34,197,94,0)}}`,
  },
  {
    id: 'chase',
    name: '双点追逐',
    group: '点阵',
    css: `.bl-chase{position:relative;width:36px;height:36px}.bl-chase i{position:absolute;top:50%;left:50%;width:8px;height:8px;margin:-4px;border-radius:50%;animation:bl-chase 1.6s ease-in-out infinite}.bl-chase i:first-child{background:#8b5cf6}.bl-chase i:last-child{background:#ec4899;animation-delay:-.8s}@keyframes bl-chase{0%{transform:rotate(0) translate(14px) rotate(0)}100%{transform:rotate(360deg) translate(14px) rotate(-360deg)}}`,
  },
  {
    id: 'progress',
    name: '进度条',
    group: '条形',
    css: `.bl-prog{width:120px;height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden}.bl-prog i{display:block;height:100%;width:40%;background:#8b5cf6;border-radius:3px;animation:bl-prog 1.5s ease-in-out infinite}@keyframes bl-prog{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}`,
  },
  {
    id: 'stripe',
    name: '条纹滚动',
    group: '条形',
    css: `.bl-str{width:120px;height:10px;border-radius:5px;overflow:hidden;position:relative}.bl-str::after{content:'';position:absolute;top:0;left:0;width:200%;height:100%;background:repeating-linear-gradient(45deg,#e5e7eb 0 6px,transparent 6px 12px);animation:bl-str 1.8s linear infinite}@keyframes bl-str{to{transform:translateX(-50%)}}`,
  },
  {
    id: 'ripple',
    name: '水波纹',
    group: '特殊',
    css: `.bl-rip{position:relative;width:42px;height:42px}.bl-rip i{position:absolute;inset:0;border-radius:50%;border:2px solid #8b5cf6;animation:bl-rip 2.4s cubic-bezier(.4,0,.6,1) infinite}.bl-rip i:nth-child(2){animation-delay:.8s}.bl-rip i:nth-child(3){animation-delay:1.6s}@keyframes bl-rip{0%{transform:scale(.2);opacity:.8}100%{transform:scale(1.6);opacity:0}}`,
  },
  {
    id: 'cross-spin',
    name: '旋转十字',
    group: '特殊',
    css: `.bl-crs{position:relative;width:36px;height:36px;animation:bl-spin 2s linear infinite}.bl-crs::before,.bl-crs::after{content:'';position:absolute;top:50%;left:50%;width:28px;height:4px;background:#8b5cf6;transform:translate(-50%,-50%)}.bl-crs::after{transform:translate(-50%,-50%) rotate(90deg)}@keyframes bl-spin{to{transform:rotate(360deg)}}`,
  },
  {
    id: 'flip-card',
    name: '翻牌',
    group: '特殊',
    css: `.bl-flip{width:32px;height:32px;background:#8b5cf6;animation:bl-flip 1.6s ease-in-out infinite}@keyframes bl-flip{0%{transform:perspective(120px) rotateX(0) rotateY(0)}50%{transform:perspective(120px) rotateX(-180deg) rotateY(0)}100%{transform:perspective(120px) rotateX(-180deg) rotateY(-180deg)}}`,
  },
  {
    id: 'heartbeat',
    name: '心跳',
    group: '特殊',
    css: `.bl-hb{width:32px;height:32px;background:#ef4444;transform:rotate(45deg);animation:bl-hb 1.2s ease-in-out infinite;position:relative}.bl-hb::before,.bl-hb::after{content:'';position:absolute;width:32px;height:32px;border-radius:50%;background:#ef4444}.bl-hb::before{top:-16px;left:0}.bl-hb::after{top:0;left:-16px}@keyframes bl-hb{0%,100%{transform:rotate(45deg) scale(1)}14%{transform:rotate(45deg) scale(1.2)}28%{transform:rotate(45deg) scale(1)}}`,
  },
  {
    id: 'triangle',
    name: '旋转三角',
    group: '特殊',
    css: `.bl-tri{width:0;height:0;border-left:18px solid transparent;border-right:18px solid transparent;border-bottom:30px solid #8b5cf6;animation:bl-spin 2s linear infinite}@keyframes bl-spin{to{transform:rotate(360deg)}}`,
  },
  {
    id: 'spin-square',
    name: '旋转方块',
    group: '特殊',
    css: `.bl-sq{width:32px;height:32px;background:#8b5cf6;animation:bl-sq 1.2s ease-in-out infinite}@keyframes bl-sq{0%{transform:rotate(0) scale(1)}50%{transform:rotate(180deg) scale(.6)}100%{transform:rotate(360deg) scale(1)}}`,
  },
  {
    id: 'dashed-ring',
    name: '虚线圆环',
    group: '圆环',
    css: `.bl-dash{width:38px;height:38px;border-radius:50%;border:3px dashed #8b5cf6;animation:bl-spin 1.5s linear infinite}@keyframes bl-spin{to{transform:rotate(360deg)}}`,
  },
  {
    id: 'spiral-orbit',
    name: '螺旋穿梭',
    group: '圆环',
    css: `.bl-spiral{position:relative;width:42px;height:42px}.bl-spiral i{position:absolute;top:50%;left:50%;width:8px;height:8px;border-radius:50%;background:#8b5cf6;transform-origin:center;animation:bl-spiral 2s linear infinite}.bl-spiral i:nth-child(2){background:#ec4899;animation-delay:-0.5s}.bl-spiral i:nth-child(3){background:#22d3ee;animation-delay:-1s}@keyframes bl-spiral{0%{transform:rotate(0deg) translate(14px) scale(0.6)}50%{transform:rotate(180deg) translate(6px) scale(1.1)}100%{transform:rotate(360deg) translate(14px) scale(0.6)}}`,
  },
  {
    id: 'clock',
    name: '时钟指针',
    group: '圆环',
    css: `.bl-clock{position:relative;width:42px;height:42px;border-radius:50%;border:2px solid #e5e7eb}.bl-clock::before{content:"";position:absolute;width:2px;height:14px;background:#8b5cf6;left:50%;bottom:50%;transform-origin:bottom center;transform:translateX(-50%);animation:bl-clock 6s linear infinite}.bl-clock::after{content:"";position:absolute;width:2px;height:10px;background:#ec4899;left:50%;bottom:50%;transform-origin:bottom center;transform:translateX(-50%);animation:bl-clock 1.2s linear infinite}@keyframes bl-clock{to{transform:translateX(-50%) rotate(360deg)}}`,
  },
  {
    id: 'radar-scan',
    name: '雷达扫描',
    group: '特殊',
    css: `.bl-radar{position:relative;width:44px;height:44px;border-radius:50%;background:conic-gradient(from 0deg,#8b5cf6,transparent 60deg,transparent);animation:bl-radar 2s linear infinite}.bl-radar::after{content:"";position:absolute;inset:3px;border-radius:50%;background:#fff}@keyframes bl-radar{to{transform:rotate(-360deg)}}`,
  },
  {
    id: 'elastic-ring',
    name: '弹性圆环',
    group: '圆环',
    css: `.bl-elastic-ring{width:42px;height:42px;border-radius:50%;border:3px solid #8b5cf6;animation:bl-elastic 1.2s ease-in-out infinite}@keyframes bl-elastic{0%,100%{transform:scale(1)}50%{transform:scale(0.7)}}`,
  },
  {
    id: 'particle-burst',
    name: '粒子扩散',
    group: '点阵',
    css: `.bl-particle{position:relative;width:42px;height:42px}.bl-particle i{position:absolute;width:7px;height:7px;border-radius:50%;background:#8b5cf6;top:50%;left:50%;animation:bl-particle 1.4s ease-out infinite}.bl-particle i:nth-child(1){--angle:0deg}.bl-particle i:nth-child(2){--angle:45deg}.bl-particle i:nth-child(3){--angle:90deg}.bl-particle i:nth-child(4){--angle:135deg}.bl-particle i:nth-child(5){--angle:180deg}.bl-particle i:nth-child(6){--angle:225deg}.bl-particle i:nth-child(7){--angle:270deg}.bl-particle i:nth-child(8){--angle:315deg}@keyframes bl-particle{0%{transform:translate(-50%,-50%) rotate(var(--angle)) translateX(0);opacity:1}100%{transform:translate(-50%,-50%) rotate(var(--angle)) translateX(14px);opacity:0}}`,
  },
  {
    id: 'slide-square',
    name: '方块游走',
    group: '条形',
    css: `.bl-slide-sq{display:flex;gap:4px}.bl-slide-sq i{width:10px;height:10px;background:#8b5cf6;animation:bl-slide-sq 1s ease-in-out infinite alternate}.bl-slide-sq i:nth-child(1){animation-delay:0s}.bl-slide-sq i:nth-child(2){animation-delay:.15s}.bl-slide-sq i:nth-child(3){animation-delay:.3s}@keyframes bl-slide-sq{0%{transform:translateY(-8px)}100%{transform:translateY(8px)}}`,
  },
  {
    id: 'pulse-ring-layer',
    name: '多层脉冲环',
    group: '圆环',
    css: `.bl-pulse-layer{position:relative;width:42px;height:42px}.bl-pulse-layer i{position:absolute;inset:0;border-radius:50%;border:2px solid #8b5cf6;animation:bl-pulse-layer 2s ease-out infinite}.bl-pulse-layer i:nth-child(2){animation-delay:-0.7s}.bl-pulse-layer i:nth-child(3){animation-delay:-1.4s}@keyframes bl-pulse-layer{0%{transform:scale(0.3);opacity:1}100%{transform:scale(1.4);opacity:0}}`,
  },
  {
    id: 'gear',
    name: '星星旋转',
    group: '特殊',
    css: `.bl-gear{width:36px;height:36px;background:#8b5cf6;clip-path:polygon(50% 0,61% 38%,100% 38%,68% 62%,79% 100%,50% 76%,21% 100%,32% 62%,0 38%,39% 38%);animation:bl-spin 2s linear infinite}@keyframes bl-spin{to{transform:rotate(360deg)}}`,
  },
  {
    id: 'l10-slice',
    name: '切片旋转环',
    group: '圆环',
    css: `.bl-l10{width:50px;aspect-ratio:1;border-radius:50%;color:#854f1d;display:grid;background:conic-gradient(from 90deg at 4px 4px,#0000 90deg,currentColor 0) -4px -4px/calc(50% + 2px) calc(50% + 2px),radial-gradient(farthest-side,currentColor 6px,#0000 7px calc(100% - 6px),currentColor calc(100% - 5px)) no-repeat;animation:bl-l10 2s infinite linear;position:relative}.bl-l10:before{content:"";border-radius:inherit;background:inherit;transform:rotate(45deg)}@keyframes bl-l10{to{transform:rotate(.5turn)}}`,
  },
  {
    id: 'l22-quad',
    name: '四色旋转',
    group: '特殊',
    css: `.bl-l22{width:50px;aspect-ratio:1;display:grid;border-radius:50%;background:conic-gradient(#25b09b 25%,#f03355 0 50%,#514b82 0 75%,#ffa516 0);animation:bl-l22 2s infinite linear}.bl-l22::before,.bl-l22::after{content:"";grid-area:1/1;margin:15%;border-radius:50%;background:inherit;animation:inherit}.bl-l22::after{margin:25%;animation-duration:3s}@keyframes bl-l22{100%{transform:rotate(1turn)}}`,
  },
  {
    id: 'l30-dot-ring',
    name: '点阵圆环',
    group: '圆环',
    css: `.bl-l30{--R:30px;width:calc(2*var(--R));aspect-ratio:1;border-radius:50%;display:grid;-webkit-mask:linear-gradient(#000 0 0);animation:bl-l30 2s infinite linear}.bl-l30::before,.bl-l30::after{content:"";grid-area:1/1;width:50%;background:radial-gradient(farthest-side,#514b82 96%,#0000) calc(var(--R) + 0.866*var(--R) - var(--R)) calc(var(--R) - 0.5*var(--R) - var(--R)),radial-gradient(farthest-side,#514b82 96%,#0000) calc(var(--R) + 0.866*var(--R) - var(--R)) calc(var(--R) - 0.5*var(--R) - var(--R)),radial-gradient(farthest-side,#eee 96%,#0000) calc(var(--R) + 0.5*var(--R) - var(--R)) calc(var(--R) - 0.866*var(--R) - var(--R)),radial-gradient(farthest-side,#514b82 96%,#0000) 0 calc(-1*var(--R)),radial-gradient(farthest-side,#eee 96%,#0000) calc(var(--R) - 0.5*var(--R) - var(--R)) calc(var(--R) - 0.866*var(--R) - var(--R)),radial-gradient(farthest-side,#514b82 96%,#0000) calc(var(--R) - 0.866*var(--R) - var(--R)) calc(var(--R) - 0.5*var(--R) - var(--R)),radial-gradient(farthest-side,#eee 96%,#0000) calc(-1*var(--R)) 0,radial-gradient(farthest-side,#514b82 96%,#0000) calc(var(--R) - 0.866*var(--R) - var(--R)) calc(var(--R) + 0.5*var(--R) - var(--R));background-size:calc(2*var(--R)) calc(2*var(--R));background-repeat:no-repeat}.bl-l30::after{transform:rotate(180deg);transform-origin:right}@keyframes bl-l30{100%{transform:rotate(-1turn)}}`,
  },
  {
    id: 'l19-cross',
    name: '齿轮',
    group: '特殊',
    css: `.bl-l19{width:50px;aspect-ratio:1;display:grid;color:#854f1d;background:radial-gradient(farthest-side,currentColor calc(100% - 6px),#0000 calc(100% - 5px) 0);-webkit-mask:radial-gradient(farthest-side,#0000 calc(100% - 13px),#000 calc(100% - 12px));border-radius:50%;animation:bl-l19 2s infinite linear}.bl-l19::before,.bl-l19::after{content:"";grid-area:1/1;background:linear-gradient(currentColor 0 0) center,linear-gradient(currentColor 0 0) center;background-size:100% 10px,10px 100%;background-repeat:no-repeat}.bl-l19::after{transform:rotate(45deg)}@keyframes bl-l19{100%{transform:rotate(1turn)}}`,
  },
]

const GROUPS = ['全部', '圆环', '点阵', '条形', '特殊'] as const

const PREVIEW_HTML: Record<string, string> = {
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
  'l10-slice': '<div class="bl-l10"></div>',
  'l22-quad': '<div class="bl-l22"></div>',
  'l30-dot-ring': '<div class="bl-l30"></div>',
  'l19-cross': '<div class="bl-l19"></div>',
}

function Preview({
  loader,
  theme,
}: {
  loader: Loader
  theme: PreviewTheme
}) {
  return (
    <div
      className={`relative flex h-32 items-center justify-center overflow-hidden rounded-[18px] border transition ${
        theme === 'dark'
          ? 'border-white/[0.06] bg-[#111113]'
          : 'border-black/[0.055] bg-[#f8f8fa]'
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-0 opacity-[0.055] ${
          theme === 'dark' ? 'invert' : ''
        }`}
        style={{
          backgroundImage:
            'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />
      <style>{loader.css}</style>
      <div
        className="relative z-10"
        dangerouslySetInnerHTML={{ __html: PREVIEW_HTML[loader.id] || '' }}
      />
    </div>
  )
}

export default function CssLoaders() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [group, setGroup] = useState<(typeof GROUPS)[number]>('全部')
  const [query, setQuery] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [previewTheme, setPreviewTheme] = useState<PreviewTheme>('light')

  const list = useMemo(() => {
    const keyword = query.trim().toLowerCase()

    return LOADERS.filter((loader) => {
      const matchesGroup = group === '全部' || loader.group === group
      const matchesQuery =
        !keyword ||
        loader.name.toLowerCase().includes(keyword) ||
        loader.id.toLowerCase().includes(keyword) ||
        loader.group.toLowerCase().includes(keyword)

      return matchesGroup && matchesQuery
    })
  }, [group, query])

  const counts = useMemo(() => {
    return GROUPS.reduce<Record<string, number>>((acc, current) => {
      acc[current] =
        current === '全部'
          ? LOADERS.length
          : LOADERS.filter((loader) => loader.group === current).length
      return acc
    }, {})
  }, [])

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    if (!rootRef.current) return

    const ctx = gsap.context(() => {
      gsap.timeline({ defaults: { ease: 'power4.out' } })
        .from('.loader-kicker', { y: 16, opacity: 0, duration: 0.42 })
        .from('.loader-title', { y: 44, opacity: 0, duration: 0.7 }, '-=0.18')
        .from('.loader-copy', { y: 22, opacity: 0, duration: 0.5 }, '-=0.32')
        .from('.loader-toolbar', { y: 18, opacity: 0, duration: 0.48 }, '-=0.3')
        .from('.loader-hero-art', { scale: 0.9, rotate: 4, opacity: 0, duration: 0.8 }, '-=0.62')

      gsap.to('.loader-ring-a', {
        rotate: 360,
        repeat: -1,
        duration: 16,
        ease: 'none',
      })

      gsap.to('.loader-ring-b', {
        rotate: -360,
        repeat: -1,
        duration: 22,
        ease: 'none',
      })
    }, rootRef)

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    const cards = gsap.utils.toArray<HTMLElement>('.loader-card')

    gsap.killTweensOf(cards)
    gsap.set(cards, { autoAlpha: 1, y: 0, scale: 1, clearProps: 'transform' })

    gsap.fromTo(
      cards,
      { y: 38, autoAlpha: 0, scale: 0.965 },
      {
        y: 0,
        autoAlpha: 1,
        scale: 1,
        duration: 0.5,
        stagger: 0.035,
        ease: 'power3.out',
        clearProps: 'transform',
      },
    )
  }, [group, query])

  async function copyText(value: string, key: string) {
    await navigator.clipboard.writeText(value)
    setCopied(key)
    window.setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div ref={rootRef} className="relative min-h-screen overflow-hidden bg-[#f7f7fa] text-zinc-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_4%,rgba(237,233,254,.72),transparent_26%),radial-gradient(circle_at_92%_9%,rgba(224,242,254,.68),transparent_28%),radial-gradient(circle_at_52%_78%,rgba(253,242,248,.50),transparent_34%)]" />

      <div className="relative mx-auto w-full max-w-[1540px] px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <Breadcrumb />

        <section className="mt-5 grid min-h-[340px] items-center gap-8 rounded-[30px] border border-black/[0.055] bg-white/72 px-5 py-8 shadow-[0_30px_90px_-68px_rgba(67,56,202,.24)] backdrop-blur-xl md:px-8 lg:grid-cols-[1.08fr_.92fr] lg:px-10">
          <div>
            <div className="loader-kicker inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-violet-600">
              <Sparkles className="h-3.5 w-3.5" />
              CSS Motion Library
            </div>

            <h1 className="loader-title mt-4 text-4xl font-semibold leading-[0.95] tracking-[-0.06em] sm:text-5xl lg:text-6xl">
              找一个好看的
              <br />
              <span className="text-violet-500">加载动画。</span>
            </h1>

            <p className="loader-copy mt-5 max-w-xl text-sm leading-7 text-zinc-500">
              纯 CSS、零依赖、实时预览。筛选喜欢的 Loader，复制 HTML + CSS 就能直接放进项目。
            </p>

            <div className="loader-toolbar mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-300" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索加载动画…"
                  className="h-11 w-full rounded-full border border-black/[0.06] bg-white/80 pl-10 pr-4 text-sm text-zinc-700 outline-none transition placeholder:text-zinc-300 focus:border-violet-200 focus:ring-4 focus:ring-violet-100/65"
                />
              </div>

              <button
                type="button"
                onClick={() => setPreviewTheme((current) => (current === 'light' ? 'dark' : 'light'))}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-black/[0.06] bg-white/80 px-4 text-[11px] font-medium text-zinc-600 transition hover:bg-white"
              >
                {previewTheme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                {previewTheme === 'light' ? '深色预览' : '浅色预览'}
              </button>
            </div>
          </div>

          <div className="loader-hero-art relative mx-auto h-[260px] w-full max-w-[460px]">
            <div className="absolute left-[10%] top-[10%] h-[70%] w-[70%] rotate-6 rounded-[38%_62%_56%_44%/48%_36%_64%_52%] bg-[#d9c8ff]" />
            <div className="absolute bottom-[7%] left-[0%] h-[55%] w-[68%] -rotate-12 rounded-[58%_42%_36%_64%/58%_40%_60%_42%] bg-[#a8efff] mix-blend-multiply" />
            <div className="absolute right-[2%] top-[18%] h-[55%] w-[56%] rotate-12 rounded-[38%_62%_70%_30%/61%_34%_66%_39%] bg-[#dfff91] mix-blend-multiply" />

            <div className="loader-ring-a absolute left-1/2 top-1/2 h-[76%] w-[76%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/12">
              <span className="absolute left-1/2 top-[-5px] h-2.5 w-2.5 rounded-full bg-zinc-950" />
            </div>

            <div className="loader-ring-b absolute left-1/2 top-1/2 h-[52%] w-[52%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-black/12">
              <span className="absolute bottom-[9%] right-[5%] h-2 w-2 rounded-full bg-violet-500" />
            </div>

            <div className="absolute left-1/2 top-1/2 flex h-[118px] w-[118px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-[34px] bg-zinc-950 text-white shadow-[0_30px_70px_-28px_rgba(0,0,0,.45)]">
              <WandSparkles className="h-6 w-6 text-[#dfff91]" />
              <span className="mt-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/45">37 presets</span>
              <span className="mt-0.5 text-lg font-semibold">Loader Lab</span>
            </div>
          </div>
        </section>

        <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {GROUPS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setGroup(item)}
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[11px] font-medium transition ${
                  group === item
                    ? 'border-zinc-950 bg-zinc-950 text-white'
                    : 'border-black/[0.06] bg-white/76 text-zinc-500 hover:border-violet-200 hover:text-violet-600'
                }`}
              >
                {item}
                <span
                  className={`font-mono text-[9px] ${
                    group === item ? 'text-white/45' : 'text-zinc-300'
                  }`}
                >
                  {counts[item]}
                </span>
              </button>
            ))}
          </div>

          <div className="text-[10px] text-zinc-400">
            当前显示 <span className="font-mono text-zinc-600">{list.length}</span> 个 Loader
          </div>
        </div>

        {list.length > 0 ? (
          <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {list.map((loader) => {
              const html = PREVIEW_HTML[loader.id] || ''

              return (
                <article
                  key={loader.id}
                  className="loader-card group rounded-[24px] border border-black/[0.055] bg-white/86 p-4 shadow-[0_20px_60px_-48px_rgba(24,24,27,.22)] backdrop-blur-xl transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1.5 hover:border-violet-200/70 hover:shadow-[0_30px_80px_-46px_rgba(109,40,217,.24)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[9px] uppercase tracking-[0.16em] text-zinc-300">{loader.group}</div>
                      <h3 className="mt-1 text-sm font-semibold text-zinc-800">{loader.name}</h3>
                    </div>

                    <span className="rounded-full bg-zinc-50 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-zinc-300">
                      CSS
                    </span>
                  </div>

                  <div className="mt-4">
                    <Preview loader={loader} theme={previewTheme} />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => copyText(loader.css, `css-${loader.id}`)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-950 text-[10px] font-semibold text-white transition hover:bg-violet-600"
                    >
                      {copied === `css-${loader.id}` ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied === `css-${loader.id}` ? '已复制' : '复制 CSS'}
                    </button>

                    <button
                      type="button"
                      onClick={() => copyText(html, `html-${loader.id}`)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-black/[0.06] bg-zinc-50 text-[10px] font-semibold text-zinc-500 transition hover:bg-violet-50 hover:text-violet-600"
                    >
                      {copied === `html-${loader.id}` ? <Check className="h-3.5 w-3.5" /> : <Code2 className="h-3.5 w-3.5" />}
                      {copied === `html-${loader.id}` ? '已复制' : '复制 HTML'}
                    </button>
                  </div>
                </article>
              )
            })}
          </section>
        ) : (
          <div className="mt-6 rounded-[24px] border border-dashed border-black/[0.08] bg-white/60 px-6 py-16 text-center backdrop-blur">
            <div className="text-sm font-medium text-zinc-500">没有找到匹配的 Loader</div>
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setGroup('全部')
              }}
              className="mt-3 text-xs font-medium text-violet-600 hover:text-violet-800"
            >
              清空筛选
            </button>
          </div>
        )}

        <section className="mt-12 grid gap-3 md:grid-cols-3">
          <div className="rounded-[20px] border border-black/[0.055] bg-white/68 p-4 backdrop-blur">
            <div className="text-[9px] uppercase tracking-[0.18em] text-zinc-300">Pure CSS</div>
            <div className="mt-2 text-sm font-semibold text-zinc-700">零依赖</div>
            <p className="mt-1 text-[11px] leading-5 text-zinc-400">无需 JavaScript、图片或第三方动画库。</p>
          </div>

          <div className="rounded-[20px] border border-black/[0.055] bg-white/68 p-4 backdrop-blur">
            <div className="text-[9px] uppercase tracking-[0.18em] text-zinc-300">Preview</div>
            <div className="mt-2 text-sm font-semibold text-zinc-700">实时预览</div>
            <p className="mt-1 text-[11px] leading-5 text-zinc-400">支持浅色 / 深色背景快速检查动画效果。</p>
          </div>

          <div className="rounded-[20px] border border-black/[0.055] bg-white/68 p-4 backdrop-blur">
            <div className="text-[9px] uppercase tracking-[0.18em] text-zinc-300">Copy</div>
            <div className="mt-2 text-sm font-semibold text-zinc-700">CSS + HTML</div>
            <p className="mt-1 text-[11px] leading-5 text-zinc-400">结构和样式分开复制，更适合直接接入项目。</p>
          </div>
        </section>

        <div className="mt-8">
          <FooterNote />
        </div>
      </div>
    </div>
  )
}
