"use client"

import type { CSSProperties } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"

/* ==========================================================================
   数据
   ========================================================================== */

type LoveCard = {
  id: string
  text: string
}

type Accent = "rose" | "violet" | "sky" | "sage" | "amber" | "peach"
type SceneMode = "float" | "orbit" | "quiet"
type CopyState = "html" | "json" | "sentence" | null
type TapeStyle = "top" | "corner" | "pin" | "none"

type CardLayout = {
  left: number
  top: number
  width: number
  /** 卡片最小高度 = 宽度的百分之多少。配合容器查询，缩放到任意视口都等比。 */
  ar: number
  rotate: number
  depth: number
  accent: Accent
  featured: boolean
  tape: TapeStyle
  delay: number
}

const STORAGE_KEY = "bitleap-love-cards-fullscreen-flow-v6"

const defaultCards: LoveCard[] = [
  { id: "1", text: "今天也要好好吃饭。" },
  { id: "2", text: "想把所有温柔都留给你。" },
  { id: "3", text: "晚安，记得盖好被子。" },
  { id: "4", text: "路上看到一只小猫，第一反应是想发给你。" },
  { id: "5", text: "你不用一直很厉害，累了就休息。" },
  { id: "6", text: "今天的风很舒服，突然有点想你。" },
  { id: "7", text: "到家记得告诉我一声。" },
  { id: "8", text: "下次一起去看海吧。" },
  { id: "9", text: "别熬太晚，我会担心。" },
  { id: "10", text: "分享欲是最高级的浪漫。" },
  { id: "11", text: "好想和你一起过很多个普通的日子。" },
  { id: "12", text: "你出现之后，日常也变得有一点闪闪发光。" },
  { id: "13", text: "今天也很喜欢你。" },
  { id: "14", text: "看到好看的晚霞会想到你。" },
  { id: "15", text: "希望你每次回头，我都还在。" },
  { id: "16", text: "有空的话，一起散散步吧。" },
  { id: "17", text: "你负责开心，剩下的慢慢来。" },
  { id: "18", text: "想和你浪费很多很多时间。" },
  { id: "19", text: "天气冷了，要记得多穿一点。" },
  { id: "20", text: "今天也要顺顺利利。" },
  { id: "21", text: "累的时候就靠一会儿。" },
  { id: "22", text: "别总是把难过藏起来。" },
  { id: "23", text: "希望你每天都有好消息。" },
  { id: "24", text: "想把今天发生的小事都讲给你听。" },
  { id: "25", text: "你已经做得很好了。" },
  { id: "26", text: "慢一点也没有关系。" },
  { id: "27", text: "记得喝水，也记得开心。" },
  { id: "28", text: "想见你的时候，连风都像在催我。" },
  { id: "29", text: "希望普通的日子里一直有你。" },
  { id: "30", text: "今天也想把好运分给你。" },
]

/** 只保留「点色 + 墨色」两个色值，其余（描边 / 辉光 / 纸面渐变）全部由 color-mix 派生，改一处全场景跟着变 */
const accentMap: Record<Accent, { dot: string; ink: string }> = {
  rose: { dot: "#ef9eb6", ink: "#6f3f52" },
  violet: { dot: "#a78bfa", ink: "#4d3f75" },
  sky: { dot: "#83c5e6", ink: "#355f76" },
  sage: { dot: "#8fb79c", ink: "#405b48" },
  amber: { dot: "#d8b168", ink: "#755b2c" },
  peach: { dot: "#efaa88", ink: "#704937" },
}

const sceneLayouts: CardLayout[] = [
  { left: 6, top: 16, width: 18, ar: 46, rotate: -6.2, depth: 0.78, accent: "rose", featured: true, tape: "corner", delay: 0.05 },
  { left: 25, top: 9, width: 12, ar: 50, rotate: 4.8, depth: 0.34, accent: "sky", featured: false, tape: "none", delay: 0.22 },
  { left: 39, top: 13, width: 15, ar: 48, rotate: -2.7, depth: 0.52, accent: "sage", featured: false, tape: "top", delay: 0.16 },
  { left: 58, top: 7, width: 19, ar: 46, rotate: 5.4, depth: 0.84, accent: "violet", featured: true, tape: "pin", delay: 0.08 },
  { left: 79, top: 17, width: 15, ar: 46, rotate: -5.1, depth: 0.46, accent: "amber", featured: false, tape: "corner", delay: 0.28 },

  { left: 3, top: 36, width: 13, ar: 48, rotate: 4.1, depth: 0.3, accent: "peach", featured: false, tape: "none", delay: 0.35 },
  { left: 20, top: 31, width: 18, ar: 47, rotate: -3.6, depth: 0.72, accent: "rose", featured: true, tape: "top", delay: 0.12 },
  { left: 41, top: 33, width: 12, ar: 47, rotate: 6.6, depth: 0.28, accent: "sky", featured: false, tape: "pin", delay: 0.46 },
  { left: 56, top: 28, width: 15, ar: 49, rotate: -1.9, depth: 0.55, accent: "violet", featured: false, tape: "none", delay: 0.24 },
  { left: 75, top: 34, width: 20, ar: 44, rotate: 3.2, depth: 0.8, accent: "sage", featured: true, tape: "corner", delay: 0.1 },

  { left: 7, top: 58, width: 18, ar: 46, rotate: -3.9, depth: 0.66, accent: "sky", featured: true, tape: "pin", delay: 0.18 },
  { left: 28, top: 55, width: 12, ar: 49, rotate: 5.5, depth: 0.25, accent: "amber", featured: false, tape: "none", delay: 0.54 },
  { left: 43, top: 55, width: 16, ar: 46, rotate: -5.8, depth: 0.5, accent: "rose", featured: false, tape: "top", delay: 0.3 },
  { left: 63, top: 56, width: 15, ar: 42, rotate: 4.6, depth: 0.36, accent: "peach", featured: false, tape: "none", delay: 0.58 },
  { left: 81, top: 57, width: 13, ar: 51, rotate: -4.4, depth: 0.42, accent: "violet", featured: false, tape: "pin", delay: 0.42 },

  { left: 14, top: 77, width: 15, ar: 45, rotate: 4.8, depth: 0.38, accent: "amber", featured: false, tape: "corner", delay: 0.62 },
  { left: 33, top: 74, width: 18, ar: 46, rotate: -2.8, depth: 0.7, accent: "rose", featured: true, tape: "none", delay: 0.26 },
  { left: 55, top: 76, width: 12, ar: 49, rotate: 6.4, depth: 0.24, accent: "sky", featured: false, tape: "top", delay: 0.68 },
  { left: 70, top: 73, width: 18, ar: 44, rotate: -5.2, depth: 0.62, accent: "sage", featured: true, tape: "corner", delay: 0.33 },

  { left: 16, top: 21, width: 10, ar: 54, rotate: 7.5, depth: 0.18, accent: "violet", featured: false, tape: "none", delay: 0.72 },
  { left: 34, top: 23, width: 10, ar: 56, rotate: -7.1, depth: 0.2, accent: "amber", featured: false, tape: "pin", delay: 0.76 },
  { left: 51, top: 20, width: 10, ar: 54, rotate: 7, depth: 0.19, accent: "rose", featured: false, tape: "none", delay: 0.78 },
  { left: 69, top: 20, width: 10, ar: 56, rotate: -6.8, depth: 0.2, accent: "sky", featured: false, tape: "top", delay: 0.8 },
  { left: 17, top: 47, width: 10, ar: 54, rotate: -7.2, depth: 0.18, accent: "sage", featured: false, tape: "none", delay: 0.82 },
  { left: 33, top: 45, width: 11, ar: 52, rotate: 6.8, depth: 0.22, accent: "violet", featured: false, tape: "corner", delay: 0.84 },
  { left: 60, top: 44, width: 10, ar: 54, rotate: 6.2, depth: 0.18, accent: "amber", featured: false, tape: "none", delay: 0.86 },
  { left: 89, top: 44, width: 10, ar: 54, rotate: -6.7, depth: 0.18, accent: "rose", featured: false, tape: "top", delay: 0.88 },
  { left: 38, top: 84, width: 10, ar: 54, rotate: -5.7, depth: 0.19, accent: "sky", featured: false, tape: "none", delay: 0.9 },
  { left: 52, top: 86, width: 11, ar: 52, rotate: 5.9, depth: 0.22, accent: "sage", featured: false, tape: "pin", delay: 0.92 },
  { left: 66, top: 83, width: 10, ar: 54, rotate: -6.3, depth: 0.19, accent: "peach", featured: false, tape: "none", delay: 0.94 },
]

/* ==========================================================================
   场景样式（页面与导出的单页 HTML 共用这一份，所见即所得）
   ========================================================================== */

const SCENE_CSS = `
.lc-scene{
  position:relative;overflow:hidden;background:#f7f4f0;
  /* 字体栈写在这里而不是各写一份：页面（Tailwind 默认栈）与导出的单页必须量到同一套字体，
     否则同一个标题、同一句情话在预览和导出里会断在不同的字上 */
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue","Noto Sans","PingFang SC","Hiragino Sans GB","Microsoft YaHei",Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji";
  -webkit-font-smoothing:antialiased;
}
.lc-bg{position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 10% 10%,rgba(253,226,243,.72),transparent 24%),radial-gradient(circle at 88% 12%,rgba(219,234,254,.72),transparent 27%),radial-gradient(circle at 52% 90%,rgba(237,233,254,.68),transparent 32%),radial-gradient(circle at 28% 72%,rgba(209,250,229,.32),transparent 24%),linear-gradient(180deg,#fffaf7 0%,#f7f8fc 52%,#faf8f6 100%)}
.lc-vignette{position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 50% 50%,transparent 44%,rgba(116,91,90,.07) 100%)}
/* 全场景细颗粒：把 30 张卡片的边缘揉进同一张纸上 */
.lc-grain{position:absolute;inset:0;pointer-events:none;opacity:.05;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E");background-size:160px 160px}

.lc-stage{position:absolute;inset:0;overflow:hidden}
.lc-frame{position:relative;height:100%;width:min(100%,1720px);margin:0 auto}

/* ---- 背景装饰 ---- */
.lc-field{position:absolute;border-radius:9999px;pointer-events:none;filter:blur(110px)}
.lc-field-b{filter:blur(125px)}
.lc-field-c{filter:blur(130px)}
.lc-orbit{position:absolute;border-radius:9999px;border:1px solid rgba(244,164,196,.14);pointer-events:none}
.lc-orbit-b{border-color:rgba(196,181,253,.12)}
.lc-orbit span{position:absolute;height:6px;width:6px;border-radius:9999px;background:rgba(244,164,196,.75)}
.lc-orbit-a span{left:18%;top:2%}
.lc-orbit-b span{right:9%;top:30%;background:rgba(196,181,253,.75)}
.lc-spark{position:absolute;pointer-events:none}
.lc-spark-dot{height:3px;width:3px;border-radius:9999px;background:rgba(167,139,250,.6)}
.lc-spark-heart{font-size:10px;line-height:1;color:rgba(239,158,182,.7)}
/* 导出的单页没有 GSAP，用 CSS 补上同一套环境动画 */
@keyframes lc-spin{to{transform:rotate(360deg)}}
@keyframes lc-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
@keyframes lc-twinkle{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
.lc-idle .lc-orbit-a{animation:lc-spin 88s linear infinite}
.lc-idle .lc-orbit-b{animation:lc-spin 128s linear infinite reverse}
.lc-idle .lc-field{animation:lc-breathe 8s ease-in-out infinite}
.lc-spark-idle{animation:lc-twinkle 5.4s ease-in-out infinite;animation-delay:calc(var(--i,0) * .17s)}

/* ---- 页头 / 页脚 ---- */
.lc-head{position:absolute;left:0;right:0;top:0;z-index:40;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:20px 20px 0;pointer-events:none}
.lc-titleblock{position:relative;max-width:520px;pointer-events:auto}
/* 标题永远压在卡片之上（页头 z-40 > 卡片）。加一层柔和的白纱，
   卡片边线从字下穿过时会被晕开，看起来是刻意的叠压而不是排版事故 */
.lc-titleblock::before{content:"";position:absolute;inset:-44px -70px -34px -56px;z-index:-1;pointer-events:none;background:radial-gradient(115% 120% at 22% 32%,rgba(255,252,250,.94),rgba(255,252,250,.66) 44%,rgba(255,252,250,0) 78%)}
.lc-controls{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:8px;min-width:0;pointer-events:auto}
.lc-kicker{display:inline-flex;align-items:center;gap:8px;font-size:8px;line-height:1;text-transform:uppercase;letter-spacing:.24em;color:rgba(139,92,246,.75)}
.lc-kicker svg{height:16px;width:16px}
.lc-h1{margin:8px 0 0;font-size:clamp(34px,4.2vw,72px);font-weight:600;line-height:.94;letter-spacing:-.065em;color:#09090b}
.lc-sub{margin:8px 0 0;max-width:52ch;font-size:10px;line-height:20px;color:#a1a1aa}
.lc-foot{position:absolute;left:0;right:0;bottom:0;z-index:40;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 20px 16px;font-size:8px;line-height:1.5;text-transform:uppercase;letter-spacing:.18em;color:#d4d4d8;pointer-events:none}
@media (min-width:640px){
  .lc-head{padding-left:28px;padding-right:28px;padding-top:24px}
  .lc-sub{font-size:11px}
  .lc-foot{padding-left:28px;padding-right:28px}
}
@media (min-width:1024px){
  .lc-head{padding-left:36px;padding-right:36px}
  .lc-foot{padding-left:36px;padding-right:36px}
}

/* ---- 卡片 ---- */
.lc-layer{position:absolute;inset:0;overflow:hidden}
/* 卡片必须独占一层：下面的断点用 nth-child 决定「显示几张」，
   一旦这层里混进别的兄弟节点，计数就会整体错位、把卡片全隐藏掉 */
.lc-cards{position:absolute;inset:0}
.lc-card{
  /* 位置/尺寸只从内联的 --left/--top/--width 派生一次，
     之后所有断点都改 --lx/--ty/--w（内联的自定义属性会盖掉样式表，所以不能直接写它们） */
  --lx:var(--left);--ty:var(--top);--w:var(--width);
  position:absolute;top:var(--ty);width:var(--w);z-index:var(--z);
  transform:translate(-50%,-50%);transform-origin:50% 50%;
  container-type:inline-size;
  /* 夹住左右：任何布局模式、任何屏宽下，卡片都不会被视口切掉文字 */
  left:clamp(calc(var(--w) / 2 + 1.2%),var(--lx),calc(100% - var(--w) / 2 - 1.2%));
}
.lc-entrance,.lc-settle,.lc-parallax,.lc-float{display:block;transform-origin:50% 50%}
.lc-settle{transform:rotate(var(--r))}
.lc-anim .lc-entrance{opacity:0}

.lc-face{
  --pad:clamp(11px,5.2cqi,19px);
  /* 字号跟着卡片自己的宽度走：窄卡不挤，宽卡不空。featured 用 calc 乘上去，不能写 em（em 会按继承的 16px 算，把 clamp 顶掉） */
  --fs:clamp(11.5px,6.2cqi,15px);
  position:relative;display:flex;flex-direction:column;align-items:flex-start;justify-content:flex-end;
  min-height:calc(var(--ar) * 1cqi);padding:var(--pad);
  border-radius:clamp(15px,6.4cqi,23px);
  border:1px solid color-mix(in srgb,var(--dot) 26%,transparent);
  background:linear-gradient(152deg,#ffffff 6%,color-mix(in srgb,var(--dot) 7%,#fff) 58%,color-mix(in srgb,var(--dot) 16%,#fff));
  color:var(--ink);overflow:hidden;cursor:pointer;
  box-shadow:0 26px 62px -46px rgba(67,49,88,.42),0 1px 0 rgba(255,255,255,.9) inset;
  transition:transform .42s cubic-bezier(.16,1,.3,1),box-shadow .42s ease,border-color .42s ease;
}
.lc-card:hover,.lc-card:focus-within{z-index:90}
.lc-card:hover .lc-face,.lc-card:focus-within .lc-face{
  transform:translateY(-8px) scale(1.03);
  border-color:color-mix(in srgb,var(--dot) 62%,transparent);
  box-shadow:0 40px 92px -40px rgba(65,45,96,.42),0 1px 0 rgba(255,255,255,.95) inset;
}
.lc-card:focus{outline:none}
.lc-face:focus-visible{outline:2px solid color-mix(in srgb,var(--dot) 70%,transparent);outline-offset:3px}

.lc-paper{position:absolute;inset:0;pointer-events:none;opacity:.5;background-image:radial-gradient(rgba(70,55,95,.32) .5px,transparent .5px);background-size:4px 4px}
.lc-blob{position:absolute;right:-16cqi;top:-16cqi;height:44cqi;width:44cqi;border-radius:9999px;pointer-events:none;background:color-mix(in srgb,var(--dot) 30%,transparent);filter:blur(clamp(14px,10cqi,32px))}
.lc-tape{position:absolute;pointer-events:none;border-radius:2px;opacity:.85;box-shadow:0 1px 0 rgba(255,255,255,.7) inset;background:linear-gradient(90deg,rgba(255,255,255,.4),color-mix(in srgb,var(--dot) 36%,#fff),rgba(255,255,255,.36))}
.lc-tape-top{left:50%;top:-1.8cqi;height:4.2cqi;width:32cqi;transform:translateX(-50%) rotate(-2deg)}
.lc-tape-corner{left:-3cqi;top:-1.6cqi;height:4.2cqi;width:22cqi;transform:rotate(-16deg)}
.lc-tape-pin{left:var(--pad);top:var(--pad);height:clamp(6px,2.6cqi,10px);width:clamp(6px,2.6cqi,10px);border-radius:9999px;background:color-mix(in srgb,var(--dot) 62%,#fff);box-shadow:0 0 0 clamp(2px,1cqi,4px) color-mix(in srgb,var(--dot) 16%,transparent)}
.lc-dotmark{position:absolute;left:var(--pad);top:var(--pad);height:clamp(4px,1.9cqi,7px);width:clamp(4px,1.9cqi,7px);border-radius:9999px;background:var(--dot);box-shadow:0 0 0 clamp(2px,1cqi,4px) color-mix(in srgb,var(--dot) 14%,transparent)}
.lc-num{position:absolute;right:var(--pad);top:calc(var(--pad) - 1px);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:clamp(7px,2.5cqi,9px);letter-spacing:.16em;color:rgba(82,80,88,.3)}
.lc-rule{flex:none;margin-bottom:.8em;height:2px;width:clamp(14px,9cqi,30px);border-radius:2px;background:var(--dot);opacity:.55}
.lc-text{position:relative;z-index:1;margin:0;max-width:32ch;font-size:var(--fs);line-height:1.72;letter-spacing:-.012em;text-wrap:pretty}
.lc-featured .lc-text{font-size:calc(var(--fs) * 1.13);font-weight:600;line-height:1.66}

/* ---- 分档：屏幕越窄，卡片越少越大；分档用 --lx/--ty/--w 覆盖，夹子依然生效 ---- */
@media (max-width:1279px){
  .lc-cards > .lc-card{--w:calc(var(--width) * 1.26)}
  .lc-cards > .lc-card:nth-child(n+23){display:none}
}
@media (max-width:1023px){
  .lc-cards > .lc-card{--w:calc(var(--width) * 1.62)}
  .lc-cards > .lc-card:nth-child(n+17){display:none}
}
@media (max-width:767px){
  /* 窄屏：标题块和控件竖排，避免挤成两行把卡片区域顶掉 */
  .lc-head{flex-direction:column;align-items:stretch;gap:10px;padding:16px 20px 0}
  .lc-h1{font-size:clamp(30px,9vw,46px)}
  .lc-sub{display:none}
  .lc-controls{justify-content:flex-start;gap:6px}
  .lc-cards > .lc-card{--w:min(38vw,30vh)}
  .lc-cards > .lc-card:nth-child(n+11){display:none}
  .lc-cards > .lc-card:nth-child(1){--lx:28%;--ty:28%}
  .lc-cards > .lc-card:nth-child(2){--lx:72%;--ty:27%}
  .lc-cards > .lc-card:nth-child(3){--lx:27%;--ty:42%}
  .lc-cards > .lc-card:nth-child(4){--lx:73%;--ty:43%}
  .lc-cards > .lc-card:nth-child(5){--lx:29%;--ty:56%}
  .lc-cards > .lc-card:nth-child(6){--lx:71%;--ty:57%}
  .lc-cards > .lc-card:nth-child(7){--lx:27%;--ty:70%}
  .lc-cards > .lc-card:nth-child(8){--lx:73%;--ty:71%}
  .lc-cards > .lc-card:nth-child(9){--lx:29%;--ty:84%}
  .lc-cards > .lc-card:nth-child(10){--lx:71%;--ty:84%}
  .lc-field{display:none}
}
/* 横屏手机：标题会吃掉大半高度，改成 3 列 2 行、缩小标题 */
@media (max-width:767px) and (max-height:540px){
  .lc-cards > .lc-card{--w:min(30vw,38vh)}
  .lc-cards > .lc-card:nth-child(n+7){display:none}
  .lc-cards > .lc-card:nth-child(1){--lx:20%;--ty:46%}
  .lc-cards > .lc-card:nth-child(2){--lx:50%;--ty:45%}
  .lc-cards > .lc-card:nth-child(3){--lx:80%;--ty:47%}
  .lc-cards > .lc-card:nth-child(4){--lx:22%;--ty:80%}
  .lc-cards > .lc-card:nth-child(5){--lx:50%;--ty:79%}
  .lc-cards > .lc-card:nth-child(6){--lx:78%;--ty:81%}
  .lc-head{padding-top:14px}
  .lc-h1{font-size:clamp(22px,5.4vh,34px)}
  .lc-sub{display:none}
}
`

const PAGE_CSS = `
.lc-scroll::-webkit-scrollbar{width:5px;height:5px}
.lc-scroll::-webkit-scrollbar-track{background:transparent}
.lc-scroll::-webkit-scrollbar-thumb{background:rgba(24,24,27,.14);border-radius:999px}
`

/* ==========================================================================
   布局计算
   ========================================================================== */

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function getCardLayout(index: number, mode: SceneMode): CardLayout {
  const base = sceneLayouts[index % sceneLayouts.length]
  const cycle = Math.floor(index / sceneLayouts.length)
  const orbitOffset = mode === "orbit" ? (index * 137.5) % 360 : 0
  const quietOffset = mode === "quiet" ? cycle * 0.8 : 0

  if (mode === "orbit") {
    const radians = (orbitOffset * Math.PI) / 180
    const ring = index % 3 === 0 ? 31 : index % 3 === 1 ? 38 : 44
    return {
      ...base,
      left: clamp(50 + Math.cos(radians) * ring - base.width / 2, 2, 91),
      top: clamp(50 + Math.sin(radians) * ring * 0.72 - base.ar * 0.13, 8, 82),
      rotate: base.rotate + Math.sin(radians) * 4.2,
      featured: index % 5 === 0,
      delay: Math.min(index * 0.026, 0.72),
    }
  }

  return {
    ...base,
    left: clamp(base.left + (cycle % 2 ? 1.8 : -0.6) + quietOffset, 2, 91),
    top: clamp(base.top + (cycle % 3) * 1.1, 7, 84),
    rotate: mode === "quiet" ? base.rotate * 0.42 : base.rotate + (cycle % 2 ? 0.6 : 0),
    featured: mode === "quiet" ? base.featured && index < 20 : base.featured && index < 30,
  }
}

function getEntrance(element: HTMLElement, index: number, mode: SceneMode) {
  const rect = element.getBoundingClientRect()
  const centerX = window.innerWidth / 2
  const centerY = window.innerHeight / 2
  const cardX = rect.left + rect.width / 2
  const cardY = rect.top + rect.height / 2

  if (mode === "orbit") {
    const angle = ((index * 47) % 360) * (Math.PI / 180)
    return {
      x: Math.cos(angle) * window.innerWidth * 0.34,
      y: Math.sin(angle) * window.innerHeight * 0.28,
      rotate: ((index % 9) - 4) * 5,
    }
  }

  if (index % 8 === 0) {
    const side = index % 4
    if (side === 0) return { x: -window.innerWidth * 0.68, y: (index % 5 - 2) * 42, rotate: -18 }
    if (side === 1) return { x: window.innerWidth * 0.68, y: (index % 5 - 2) * 42, rotate: 18 }
    if (side === 2) return { x: (index % 5 - 2) * 46, y: -window.innerHeight * 0.68, rotate: -14 }
    return { x: (index % 5 - 2) * 46, y: window.innerHeight * 0.68, rotate: 14 }
  }

  return {
    x: centerX - cardX,
    y: centerY - cardY,
    rotate: ((index % 11) - 5) * 2.4,
  }
}

function cardVars(layout: CardLayout) {
  return `--left:${layout.left}%;--top:${layout.top}%;--width:${layout.width}%;--ar:${layout.ar};--r:${layout.rotate}deg;--z:${Math.round(10 + layout.depth * 24)};--dot:${accentMap[layout.accent].dot};--ink:${accentMap[layout.accent].ink}`
}

/* ==========================================================================
   背景装饰（同一份数据渲染出页面元素和导出字符串，两边不会走样）
   ========================================================================== */

const DECOR_FIELDS: Array<{ className: string; style: CSSProperties }> = [
  { className: "lc-field lc-field-a", style: { left: "-8%", top: "16%", height: 420, width: 420, background: "rgba(253,214,231,.5)" } },
  { className: "lc-field lc-field-b", style: { right: "-9%", top: "26%", height: 500, width: 500, background: "rgba(198,228,247,.42)" } },
  { className: "lc-field lc-field-c", style: { bottom: "-18%", left: "38%", height: 520, width: 520, background: "rgba(226,222,252,.36)" } },
  { className: "lc-orbit lc-orbit-a", style: { left: "14%", top: "18%", height: 260, width: 260 } },
  { className: "lc-orbit lc-orbit-b", style: { right: "10%", bottom: "10%", height: 340, width: 340 } },
]

const SPARKS = Array.from({ length: 22 }, (_, index) => ({
  heart: index % 7 === 3,
  left: `${5 + ((index * 17) % 90)}%`,
  top: `${11 + ((index * 29) % 78)}%`,
  opacity: 0.16 + (index % 5) * 0.06,
  delay: index,
}))

function styleToCss(style: CSSProperties) {
  return Object.entries(style)
    .map(([key, value]) => `${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}:${typeof value === "number" ? `${value}px` : value}`)
    .join(";")
}

function decorationsMarkup() {
  const fields = DECOR_FIELDS.map(
    (item) => `<div class="${item.className}" style="${styleToCss(item.style)}">${item.className.includes("orbit") ? "<span></span>" : ""}</div>`,
  ).join("")
  const sparks = SPARKS.map(
    (spark) =>
      `<span class="lc-spark lc-spark-idle ${spark.heart ? "lc-spark-heart" : "lc-spark-dot"}" style="left:${spark.left};top:${spark.top};opacity:${spark.opacity.toFixed(2)};--i:${spark.delay}">${spark.heart ? "&#9829;" : ""}</span>`,
  ).join("")

  return `${fields}${sparks}`
}

/* ==========================================================================
   导出为单页 HTML
   ========================================================================== */

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

/**
 * 导出的卡片结构与页面 JSX 必须逐字对应（同 class、同层级）——两边共用 SCENE_CSS。
 * 改动卡片结构时，这里和 cards.map 里的 JSX 要一起改。
 */
function cardMarkup(card: LoveCard, index: number, mode: SceneMode) {
  const layout = getCardLayout(index, mode)
  const tape = layout.tape === "none" ? "" : `<span class="lc-tape lc-tape-${layout.tape}"></span>`
  const dot = layout.tape === "pin" ? "" : `<span class="lc-dotmark"></span>`
  const rule = layout.featured ? `<span class="lc-rule"></span>` : ""

  return `<div class="lc-card" style="${cardVars(layout)}"><div class="lc-entrance"><div class="lc-settle"><div class="lc-parallax"><div class="lc-float"><article class="lc-face${layout.featured ? " lc-featured" : ""}"><span class="lc-paper"></span><span class="lc-blob"></span>${tape}${dot}<span class="lc-num">${String(index + 1).padStart(2, "0")}</span>${rule}<p class="lc-text">${escapeHtml(card.text || "...")}</p></article></div></div></div></div></div>`
}

function exportStandaloneHtml(title: string, subtitle: string, cards: LoveCard[], mode: SceneMode) {
  const safeTitle = escapeHtml(title || "想对你说")
  const safeSubtitle = escapeHtml(subtitle || "")
  const cardsHtml = cards.map((card, index) => cardMarkup(card, index, mode)).join("\n")

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${safeTitle}</title>
<script>document.documentElement.classList.add("lc-anim","lc-idle")</script>
<style>
*{box-sizing:border-box}
html,body{margin:0;width:100%;height:100%;overflow:hidden;color:#18181b}
.lc-scene{height:100%;width:100%}
${SCENE_CSS}
</style>
</head>
<body>
<div class="lc-scene">
<div class="lc-bg"></div>
<div class="lc-vignette"></div>
<div class="lc-stage">
<div class="lc-frame">
<header class="lc-head"><div class="lc-titleblock"><div class="lc-kicker">心迹 / Little Words</div><h1 class="lc-h1">${safeTitle}</h1><p class="lc-sub">${safeSubtitle}</p></div></header>
<div class="lc-layer">
${decorationsMarkup()}
<div class="lc-cards">
${cardsHtml}
</div>
</div>
<footer class="lc-foot"><span>BitLeap / 心迹</span><span>点击任意处重播</span></footer>
</div>
</div>
<div class="lc-grain"></div>
</div>
<script>
(function () {
  var cards = [].slice.call(document.querySelectorAll('.lc-card'));
  function entrance(card) { return card.querySelector('.lc-entrance'); }
  function play() {
    var cx = innerWidth / 2, cy = innerHeight / 2;
    cards.forEach(function (card, index) {
      var el = entrance(card);
      if (!el) return;
      el.getAnimations().forEach(function (a) { a.cancel(); });
      var rect = card.getBoundingClientRect();
      var x = cx - (rect.left + rect.width / 2);
      var y = cy - (rect.top + rect.height / 2);
      if (index % 8 === 0) {
        var side = index % 4;
        if (side === 0) { x = -innerWidth * 0.68; y = (index % 5 - 2) * 42; }
        else if (side === 1) { x = innerWidth * 0.68; y = (index % 5 - 2) * 42; }
        else if (side === 2) { x = (index % 5 - 2) * 46; y = -innerHeight * 0.68; }
        else { x = (index % 5 - 2) * 46; y = innerHeight * 0.68; }
      }
      var anim = el.animate([
        { transform: 'translate(' + x + 'px,' + y + 'px) rotate(' + (((index % 11) - 5) * 2.5) + 'deg) scale(.4)', opacity: 0, filter: 'blur(10px)' },
        { transform: 'translate(0,0) rotate(0deg) scale(1)', opacity: 1, filter: 'blur(0px)' }
      ], { duration: 900 + index * 10, delay: Math.min(index * 30, 780), easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' });
      // 播完把 hold 住的样式还回去，避免 30 个卡片各留一个合成层
      anim.onfinish = function () { el.style.opacity = '1'; anim.cancel(); };
    });
  }
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    cards.forEach(function (card) { var el = entrance(card); if (el) el.style.opacity = '1'; });
  } else if (document.readyState === 'complete') {
    // load 已经过去了（从缓存打开等），别等下一次 load 才显示内容
    play();
  } else {
    addEventListener('load', play);
  }
  addEventListener('click', play);
})();
</script>
</body>
</html>`
}

/* ==========================================================================
   图标
   ========================================================================== */

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4" aria-hidden="true">
      <path d="M4 4v6h6M20 20v-6h-6" />
      <path d="M5.5 15.2A7 7 0 0 0 18 17.5M18.5 8.8A7 7 0 0 0 6 6.5" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4" aria-hidden="true">
      <path d="M12 3v12m-5-5 5 5 5-5M5 21h14" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" aria-hidden="true">
      <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13" />
    </svg>
  )
}

function ShuffleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4" aria-hidden="true">
      <path d="M4 7h4l8 10h4M4 17h4l2.4-3M20 7h-4l-1.6 2M18 4l3 3-3 3M18 14l3 3-3 3" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2.4" />
      <path d="M15 5.5A2.5 2.5 0 0 0 12.5 3h-6A3.5 3.5 0 0 0 3 6.5v6A2.5 2.5 0 0 0 5.5 15" />
    </svg>
  )
}

function ArrowIcon({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4" aria-hidden="true">
      <path d={dir === "prev" ? "M14.5 5.5 8 12l6.5 6.5" : "M9.5 5.5 16 12l-6.5 6.5"} />
    </svg>
  )
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M12 3l1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z" />
      <path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14Z" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

/* ==========================================================================
   子组件
   ========================================================================== */

function Pills({ mode, setMode }: { mode: SceneMode; setMode: (mode: SceneMode) => void }) {
  const items: Array<{ key: SceneMode; label: string }> = [
    { key: "float", label: "散落" },
    { key: "orbit", label: "环绕" },
    { key: "quiet", label: "安静" },
  ]

  return (
    <div className="flex rounded-full border border-black/[0.055] bg-white/56 p-1 shadow-sm backdrop-blur-xl">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          aria-pressed={mode === item.key}
          onClick={() => setMode(item.key)}
          className={`h-8 rounded-full px-3 text-[9px] font-semibold transition ${mode === item.key ? "bg-zinc-950 text-white" : "text-zinc-400 hover:bg-white hover:text-zinc-700"}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-zinc-400">{label}</span>
      {children}
    </label>
  )
}

/* ==========================================================================
   页面
   ========================================================================== */

export default function LoveCardsFullscreenPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const activeTweenRef = useRef<gsap.core.Timeline | null>(null)

  const [title, setTitle] = useState("想对你说")
  const [subtitle, setSubtitle] = useState("一些没什么大不了，但很想让你知道的小事。")
  const [cards, setCards] = useState<LoveCard[]>(defaultCards)
  const [editorOpen, setEditorOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [sceneMode, setSceneMode] = useState<SceneMode>("float")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [copied, setCopied] = useState<CopyState>(null)
  const [replaySignal, setReplaySignal] = useState(0)

  const selectedIndex = useMemo(() => cards.findIndex((card) => card.id === selectedId), [cards, selectedId])
  const selectedCard = selectedIndex >= 0 ? cards[selectedIndex] : null
  const focusAccent = useMemo(
    () => (selectedIndex >= 0 ? accentMap[getCardLayout(selectedIndex, sceneMode).accent] : null),
    [selectedIndex, sceneMode],
  )
  const cardCountLabel = useMemo(() => `${cards.length} 张`, [cards.length])
  const exportJson = useMemo(() => JSON.stringify({ title, subtitle, sceneMode, cards }, null, 2), [cards, sceneMode, subtitle, title])

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as {
          title?: string
          subtitle?: string
          cards?: LoveCard[]
          sceneMode?: SceneMode
        }
        if (parsed.title) setTitle(parsed.title)
        if (parsed.subtitle) setSubtitle(parsed.subtitle)
        if (Array.isArray(parsed.cards) && parsed.cards.length) setCards(parsed.cards)
        if (parsed.sceneMode === "float" || parsed.sceneMode === "orbit" || parsed.sceneMode === "quiet") setSceneMode(parsed.sceneMode)
      }
    } catch {
      // Keep default data.
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return

    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ title, subtitle, cards, sceneMode }))
      } catch {}
    }, 240)

    return () => window.clearTimeout(timer)
  }, [cards, hydrated, sceneMode, subtitle, title])

  useEffect(() => {
    if (!editorOpen && !selectedCard) return

    const old = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setEditorOpen(false)
        setSelectedId(null)
      }
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      document.body.style.overflow = old
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [editorOpen, selectedCard])

  const replay = () => {
    const stage = stageRef.current
    if (!stage) return

    const layers = gsap.utils.toArray<HTMLElement>(".lc-entrance", stage)
    const floats = gsap.utils.toArray<HTMLElement>(".lc-float", stage)
    const parallax = gsap.utils.toArray<HTMLElement>(".lc-parallax", stage)
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    activeTweenRef.current?.kill()
    gsap.killTweensOf(layers)
    gsap.killTweensOf(floats)
    gsap.killTweensOf(parallax)

    if (reducedMotion) {
      // 直接把内联值写死；不能用 clearProps，否则会退回 .lc-anim 的 opacity:0
      gsap.set(layers, { opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 })
      return
    }

    const ordered = [...layers].sort((a, b) => Number(a.dataset.delay || 0) - Number(b.dataset.delay || 0))
    const timeline = gsap.timeline({
      onComplete: () => {
        // 入场结束后把 blur 从内联样式上摘掉，省下 30 个合成层
        gsap.set(layers, { clearProps: "filter" })
        startIdleMotion()
      },
    })
    activeTweenRef.current = timeline

    timeline.set(layers, { pointerEvents: "none", opacity: 0 }, 0)
    timeline.fromTo(".lc-titleblock", { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.72, ease: "power3.out" }, 0.08)
    timeline.fromTo(".lc-foot", { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power2.out" }, 0.32)
    timeline.fromTo(".lc-controls", { y: -10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.58, ease: "power2.out" }, 0.18)

    ordered.forEach((layer, index) => {
      const sourceIndex = Number(layer.dataset.index ?? index)
      const from = getEntrance(layer, sourceIndex, sceneMode)
      const depth = Number(layer.dataset.depth || 0.4)
      const delay = Number(layer.dataset.delay || 0)

      timeline.fromTo(
        layer,
        {
          x: from.x,
          y: from.y,
          rotate: from.rotate,
          scale: 0.26 + depth * 0.2,
          opacity: 0,
          filter: "blur(11px)",
        },
        {
          x: 0,
          y: 0,
          rotate: 0,
          scale: 1,
          opacity: 1,
          filter: "blur(0px)",
          duration: 0.78 + depth * 0.55,
          ease: depth > 0.58 ? "expo.out" : "power4.out",
        },
        0.18 + delay,
      )
    })

    timeline.to(layers, { pointerEvents: "auto", duration: 0 }, ">-0.05")
  }

  function startIdleMotion() {
    const stage = stageRef.current
    if (!stage || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    gsap.utils.toArray<HTMLElement>(".lc-float", stage).forEach((element, index) => {
      const depth = Number(element.dataset.depth || 0.4)
      const sign = index % 2 === 0 ? -1 : 1
      gsap.to(element, {
        y: sign * (3 + depth * 8),
        x: sign * (1 + depth * 3),
        rotate: sign * (0.14 + depth * 0.45),
        duration: 5.4 + (index % 8) * 0.52 + depth * 1.8,
        delay: (index % 9) * 0.09,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      })
    })
  }

  useEffect(() => {
    const frame = requestAnimationFrame(() => replay())
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards.length, sceneMode, replaySignal])

  useEffect(() => {
    const root = rootRef.current
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      gsap.to(".lc-orbit-a", { rotate: 360, duration: 88, repeat: -1, ease: "none", transformOrigin: "50% 50%" })
      gsap.to(".lc-orbit-b", { rotate: -360, duration: 128, repeat: -1, ease: "none", transformOrigin: "50% 50%" })
      gsap.to(".lc-spark", { y: -9, opacity: 0.62, scale: 1.35, duration: 3, stagger: { each: 0.13, from: "random" }, repeat: -1, yoyo: true, ease: "sine.inOut" })
      gsap.to(".lc-hero-line", { scaleX: 1.18, opacity: 0.68, duration: 3.8, repeat: -1, yoyo: true, ease: "sine.inOut", transformOrigin: "50% 50%" })
      gsap.to(".lc-field", { scale: 1.05, duration: 8, repeat: -1, yoyo: true, ease: "sine.inOut" })
    }, root)

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const items = gsap.utils.toArray<HTMLElement>(".lc-parallax", stage)
    const fieldA = stage.querySelector<HTMLElement>(".lc-field-a")
    const fieldB = stage.querySelector<HTMLElement>(".lc-field-b")
    const itemQuick = items.map((item) => ({
      depth: Number(item.dataset.depth || 0.4),
      x: gsap.quickTo(item, "x", { duration: 0.9, ease: "power3.out" }),
      y: gsap.quickTo(item, "y", { duration: 0.9, ease: "power3.out" }),
    }))
    const fieldAX = fieldA ? gsap.quickTo(fieldA, "x", { duration: 1.1, ease: "power3.out" }) : null
    const fieldAY = fieldA ? gsap.quickTo(fieldA, "y", { duration: 1.1, ease: "power3.out" }) : null
    const fieldBX = fieldB ? gsap.quickTo(fieldB, "x", { duration: 1.35, ease: "power3.out" }) : null
    const fieldBY = fieldB ? gsap.quickTo(fieldB, "y", { duration: 1.35, ease: "power3.out" }) : null

    const onPointerMove = (event: PointerEvent) => {
      const nx = event.clientX / window.innerWidth - 0.5
      const ny = event.clientY / window.innerHeight - 0.5

      itemQuick.forEach(({ depth, x, y }) => {
        x(nx * depth * 16)
        y(ny * depth * 12)
      })
      fieldAX?.(nx * -18)
      fieldAY?.(ny * -12)
      fieldBX?.(nx * 22)
      fieldBY?.(ny * 16)
    }

    const onLeave = () => {
      itemQuick.forEach(({ x, y }) => {
        x(0)
        y(0)
      })
      fieldAX?.(0)
      fieldAY?.(0)
      fieldBX?.(0)
      fieldBY?.(0)
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true })
    window.addEventListener("blur", onLeave)
    document.addEventListener("mouseleave", onLeave)

    return () => {
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("blur", onLeave)
      document.removeEventListener("mouseleave", onLeave)
    }
  }, [cards.length, sceneMode])

  useEffect(() => {
    if (!selectedCard || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    gsap.fromTo(".lc-focus-card", { y: 18, scale: 0.96, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.38, ease: "power3.out" })
  }, [selectedCard])

  useEffect(() => {
    if (!selectedCard) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
      event.preventDefault()
      const delta = event.key === "ArrowLeft" ? -1 : 1
      setSelectedId((current) => {
        const at = cards.findIndex((card) => card.id === current)
        if (at < 0) return current
        return cards[(at + delta + cards.length) % cards.length].id
      })
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [selectedCard, cards])

  const stepCard = (delta: number) => {
    if (selectedIndex < 0 || cards.length === 0) return
    const next = (selectedIndex + delta + cards.length) % cards.length
    setSelectedId(cards[next].id)
  }

  const updateCard = (id: string, text: string) => {
    setCards((current) => current.map((item) => (item.id === id ? { ...item, text } : item)))
  }

  const addCard = () => {
    setCards((current) => [...current, { id: createId(), text: "写下一句你想留下的话。" }])
  }

  const removeCard = (id: string) => {
    setCards((current) => (current.length <= 1 ? current : current.filter((item) => item.id !== id)))
  }

  const shuffleCards = () => {
    setCards((current) => {
      const next = [...current]
      for (let i = next.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[next[i], next[j]] = [next[j], next[i]]
      }
      return next
    })
    setReplaySignal((value) => value + 1)
  }

  const resetAll = () => {
    setTitle("想对你说")
    setSubtitle("一些没什么大不了，但很想让你知道的小事。")
    setCards(defaultCards)
    setSceneMode("float")
    setSelectedId(null)
    setReplaySignal((value) => value + 1)

    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {}

    requestAnimationFrame(() => replay())
  }

  const copyText = async (value: string, key: CopyState) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {}
  }

  const exportHtml = () => {
    const html = exportStandaloneHtml(title, subtitle, cards, sceneMode)
    const blob = new Blob([html], { type: "text/html;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${title.trim() || "little-words"}.html`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 500)
  }

  return (
    <div ref={rootRef} className="lc-scene lc-anim h-[calc(100dvh-4rem)] min-h-[600px] w-full text-zinc-950 selection:bg-rose-200/70">
      <style>{SCENE_CSS}</style>
      <style>{PAGE_CSS}</style>

      <div className="lc-bg" />
      <div className="lc-vignette" />

      <div className="lc-stage">
        <div className="lc-frame">
          <header className="lc-head">
            <div className="lc-titleblock">
              <div className="lc-kicker">
                <SparkIcon />
                心迹 / Little Words
              </div>
              <h1 className="lc-h1">{title || "想对你说"}</h1>
              <p className="lc-sub">{subtitle || "一些没什么大不了，但很想让你知道的小事。"}</p>
            </div>

            <div className="lc-controls">
              <span className="mr-1 hidden font-mono text-[8px] tracking-[0.16em] text-zinc-300 lg:block">{cardCountLabel}</span>
              <Pills mode={sceneMode} setMode={setSceneMode} />
              <button type="button" onClick={replay} className="inline-flex h-9 items-center gap-2 rounded-full border border-black/[0.06] bg-white/70 px-3.5 text-[9px] font-medium text-zinc-600 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-violet-200 hover:text-violet-600">
                <RefreshIcon />
                再播放
              </button>
              <button type="button" onClick={() => setEditorOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-full border border-violet-100 bg-violet-50/80 px-3.5 text-[9px] font-semibold text-violet-600 backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-violet-100">
                <PlusIcon />
                编辑
              </button>
              <button type="button" onClick={exportHtml} className="hidden h-9 items-center gap-2 rounded-full bg-zinc-950 px-3.5 text-[9px] font-semibold text-white shadow-[0_14px_30px_-20px_rgba(24,24,27,.6)] transition hover:-translate-y-0.5 hover:bg-violet-600 sm:inline-flex">
                <DownloadIcon />
                导出
              </button>
            </div>
          </header>

          <div ref={stageRef} className="lc-layer">
            {DECOR_FIELDS.map((item) => (
              <div key={item.className} className={item.className} style={item.style}>
                {item.className.includes("orbit") && <span />}
              </div>
            ))}

            {SPARKS.map((spark, index) => (
              <span
                key={index}
                className={`lc-spark ${spark.heart ? "lc-spark-heart" : "lc-spark-dot"}`}
                style={{ left: spark.left, top: spark.top, opacity: spark.opacity }}
              >
                {spark.heart ? "♥" : ""}
              </span>
            ))}

            <div className="pointer-events-none absolute left-1/2 top-1/2 z-[5] hidden -translate-x-1/2 -translate-y-1/2 text-center xl:block">
              <div className="lc-hero-line mx-auto h-px w-20 bg-zinc-300/50" />
              <div className="mt-3 text-[8px] uppercase tracking-[0.28em] text-zinc-300">scattered around you</div>
            </div>

            <div className="lc-cards">
              {cards.map((card, index) => {
                const layout = getCardLayout(index, sceneMode)
                const accent = accentMap[layout.accent]

                return (
                  <div
                    key={card.id}
                    className="lc-card"
                    style={
                      {
                        "--left": `${layout.left}%`,
                        "--top": `${layout.top}%`,
                        "--width": `${layout.width}%`,
                        "--ar": layout.ar,
                        "--r": `${layout.rotate}deg`,
                        "--z": Math.round(10 + layout.depth * 24),
                        "--dot": accent.dot,
                        "--ink": accent.ink,
                      } as CSSProperties
                    }
                  >
                    <div className="lc-entrance" data-index={index} data-depth={layout.depth} data-delay={layout.delay}>
                      <div className="lc-settle">
                        <div className="lc-parallax" data-depth={layout.depth}>
                          <div className="lc-float" data-depth={layout.depth}>
                            <article
                              role="button"
                              tabIndex={0}
                              aria-label={`第 ${index + 1} 张：${card.text}`}
                              onClick={() => setSelectedId(card.id)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") setSelectedId(card.id)
                              }}
                              className={`lc-face${layout.featured ? " lc-featured" : ""}`}
                            >
                              <span className="lc-paper" />
                              <span className="lc-blob" />
                              {layout.tape !== "none" && <span className={`lc-tape lc-tape-${layout.tape}`} />}
                              {layout.tape !== "pin" && <span className="lc-dotmark" />}
                              <span className="lc-num">{String(index + 1).padStart(2, "0")}</span>
                              {layout.featured && <span className="lc-rule" />}
                              <p className="lc-text">{card.text || "..."}</p>
                            </article>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <footer className="lc-foot">
            <span>BitLeap / 心迹</span>
            <span className="hidden sm:inline">Center burst · slow drift · parallax</span>
          </footer>
        </div>
      </div>

      <div className="lc-grain" />

      {selectedCard && focusAccent && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-zinc-950/18 p-5 backdrop-blur-[12px]" role="dialog" aria-modal="true" aria-label="查看这张小卡片">
          <button type="button" aria-label="关闭预览" onClick={() => setSelectedId(null)} className="absolute inset-0" />

          <div
            className="lc-focus-card relative w-full max-w-[560px] overflow-hidden rounded-[30px] border border-white/80 bg-white/92 p-8 shadow-[0_30px_100px_-34px_rgba(40,22,70,.42)] sm:p-10"
            style={{ "--dot": focusAccent.dot, "--ink": focusAccent.ink } as CSSProperties}
          >
            <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full opacity-70" style={{ background: "color-mix(in srgb, var(--dot) 26%, transparent)", filter: "blur(46px)" }} />

            <div className="relative flex items-center justify-between gap-4">
              <div className="inline-flex items-center gap-2 text-[8px] uppercase tracking-[0.24em] text-zinc-400">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--dot)" }} />
                第 {selectedIndex + 1} / {cards.length} 句
              </div>
              <button type="button" onClick={() => setSelectedId(null)} aria-label="关闭" className="grid h-9 w-9 place-items-center rounded-full bg-zinc-950 text-white transition hover:bg-violet-600">
                <CloseIcon />
              </button>
            </div>

            <p className="relative mt-8 text-[clamp(26px,3.6vw,42px)] font-semibold leading-[1.22] tracking-[-0.05em] text-zinc-900">{selectedCard.text}</p>

            <div className="relative mt-9 flex items-center justify-between gap-3 border-t border-black/[0.06] pt-5">
              <button type="button" aria-live="polite" onClick={() => copyText(selectedCard.text, "sentence")} className="inline-flex h-9 items-center gap-2 rounded-full border border-black/[0.06] bg-white px-3.5 text-[10px] text-zinc-500 transition hover:text-violet-600">
                <CopyIcon />
                {copied === "sentence" ? "已复制" : "复制这句"}
              </button>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => stepCard(-1)} aria-label="上一句" className="grid h-9 w-9 place-items-center rounded-full border border-black/[0.06] bg-white text-zinc-500 transition hover:border-violet-200 hover:text-violet-600">
                  <ArrowIcon dir="prev" />
                </button>
                <button type="button" onClick={() => stepCard(1)} aria-label="下一句" className="grid h-9 w-9 place-items-center rounded-full border border-black/[0.06] bg-white text-zinc-500 transition hover:border-violet-200 hover:text-violet-600">
                  <ArrowIcon dir="next" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editorOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-zinc-950/20 p-0 backdrop-blur-[12px] sm:items-center sm:p-5">
          <button type="button" aria-label="关闭编辑器" onClick={() => setEditorOpen(false)} className="absolute inset-0" />

          <div className="relative flex h-[92dvh] w-full max-w-[1040px] flex-col overflow-hidden rounded-t-[30px] border border-white/80 bg-[#fbfafc]/97 shadow-[0_30px_100px_-28px_rgba(30,20,60,.38)] sm:h-[84dvh] sm:rounded-[30px]" role="dialog" aria-modal="true" aria-label="编辑小卡片">
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-black/[0.06] bg-white/80 px-4 py-4 backdrop-blur-xl sm:px-6">
              <div>
                <div className="text-[9px] uppercase tracking-[0.22em] text-violet-400">Editor</div>
                <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-zinc-950">编辑小卡片</h2>
              </div>

              <div className="flex items-center gap-2">
                <button type="button" aria-live="polite" onClick={() => copyText(exportJson, "json")} className="hidden h-9 items-center gap-2 rounded-full border border-black/[0.06] bg-white px-3 text-[10px] text-zinc-500 transition hover:text-violet-600 sm:inline-flex">
                  <CopyIcon />
                  {copied === "json" ? "已复制 JSON" : "复制 JSON"}
                </button>
                <button type="button" onClick={shuffleCards} className="inline-flex h-9 items-center gap-2 rounded-full border border-black/[0.06] bg-white px-3 text-[10px] text-zinc-500 transition hover:text-violet-600">
                  <ShuffleIcon />
                  打乱
                </button>
                <button type="button" onClick={resetAll} className="inline-flex h-9 items-center gap-2 rounded-full border border-black/[0.06] bg-white px-3 text-[10px] text-zinc-500 transition hover:text-violet-600">
                  <RefreshIcon />
                  重置
                </button>
                <button type="button" onClick={() => setEditorOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-zinc-950 text-white transition hover:bg-violet-600" aria-label="关闭">
                  <CloseIcon />
                </button>
              </div>
            </div>

            <div className="lc-scroll min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Title">
                  <input value={title} onChange={(event) => setTitle(event.target.value)} className="h-11 w-full rounded-[13px] border border-black/[0.06] bg-white px-3 text-sm font-medium text-zinc-800 outline-none transition focus:border-violet-300" />
                </Field>

                <Field label="Subtitle">
                  <input value={subtitle} onChange={(event) => setSubtitle(event.target.value)} className="h-11 w-full rounded-[13px] border border-black/[0.06] bg-white px-3 text-sm text-zinc-700 outline-none transition focus:border-violet-300" />
                </Field>
              </div>

              <div className="mt-6 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-300">Cards</div>
                  <div className="mt-1 text-xs text-zinc-500">桌面建议 20～30 张。屏幕变窄时卡片会自动变少变大，保持画面干净。</div>
                </div>

                <button type="button" onClick={addCard} className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full bg-violet-600 px-3.5 text-[10px] font-semibold text-white transition hover:bg-violet-700">
                  <PlusIcon />
                  添加卡片
                </button>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {cards.map((card, index) => (
                  <div key={card.id} className="rounded-[18px] border border-black/[0.055] bg-white p-3.5 shadow-[0_18px_48px_-42px_rgba(68,45,110,.28)]">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="font-mono text-[9px] text-zinc-300">{String(index + 1).padStart(2, "0")}</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-[9px] text-zinc-300">{card.text.length}</span>
                        <button type="button" disabled={cards.length <= 1} onClick={() => removeCard(card.id)} className="inline-flex h-7 w-7 items-center justify-center rounded-full text-zinc-300 transition hover:bg-zinc-50 hover:text-zinc-700 disabled:opacity-20" aria-label={`删除第 ${index + 1} 张卡片`}>
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                    <textarea rows={3} value={card.text} onChange={(event) => updateCard(card.id, event.target.value)} className="w-full resize-none rounded-[12px] border border-black/[0.05] bg-[#fafafa] px-3 py-2.5 text-xs leading-6 text-zinc-700 outline-none transition focus:border-violet-300 focus:bg-white" />
                  </div>
                ))}
              </div>

              <button type="button" onClick={addCard} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-[16px] border border-dashed border-violet-200 bg-violet-50/40 text-xs font-semibold text-violet-600 transition hover:bg-violet-50">
                <PlusIcon />
                再添加一张
              </button>
            </div>

            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-black/[0.06] bg-white/82 px-4 py-3 sm:px-6">
              <span className="text-[10px] text-zinc-400">修改会自动保存在当前浏览器</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => copyText(exportStandaloneHtml(title, subtitle, cards, sceneMode), "html")} className="hidden h-10 items-center justify-center rounded-full border border-black/[0.06] bg-white px-4 text-xs font-semibold text-zinc-500 transition hover:text-violet-600 sm:inline-flex">
                  {copied === "html" ? "已复制 HTML" : "复制 HTML"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditorOpen(false)
                    requestAnimationFrame(() => replay())
                  }}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-5 text-xs font-semibold text-white transition hover:bg-violet-600"
                >
                  完成编辑
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
