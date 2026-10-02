"use client"

/* ==========================================================================
   BitLeap · 站娘海报（系列第七张）
   --------------------------------------------------------------------------
   前六张：DeepSeek 横带 / ClaudeCode 堆叠字块 / ChatGPT 斜轴阶梯 /
           Z.ai 规格说明书 / Kimi 月轮 / Grok 竖排标题 —— 都在讲"某个 AI 的性格"。
   这一张的角色是站子自己，所以它要讲的是"这个工具站长什么样"：
   配色、渐变、网格、圆角、状态点、分类胶囊全部引用首页，不另找强调色。

   === 为什么是"近白 + 底部深靛色带" ===
   ChatGPT 那张的注释里记了一条硬教训：立绘是近白的、底也是近白的，
   画面里"谁都不比谁暗"，这种底上换什么强调色都会被摊平。
   BitLeap 的立绘同样是白+periwinkle，正踩在同一个坑上。
   所以这一版把"明度对比"引进来：底部一条深靛色带（取立绘最深的紫再压暗），
   顶边是一条从 80% 斜到 90% 的切线（clip-path polygon，四点百分比）。
   立绘站在带上 —— 浅色那截靠线稿读，落在带子上的脚踝和小腿自己发光。
   色带同时是"仪表区"：基线刻度 + 分类索引 + 规格行都印在上面，
   覆盖到的元素一律浅色（维护时改色别漏）。

   === 字号用 min(vw, vh) 而不是纯 vw ===
   海报高度是一屏（100svh），宽度是窗口宽度 —— 两者比例随窗口变。
   前六张的字号只用 vw，于是窗口一矮（比如 1512×700），字相对就变大，
   左侧文案列会顶进底部色带。这一版改成 min(vw, vh)：取宽高里更紧的那个来定字号。
   立绘的高度也用 min(86vh, 54vw) 双约束 —— 窗口再高，她也不会长到压住左边的字。

   === background-clip:text 必须给降部留位置（用户反馈修的一处） ===
   "big leap." 的 g / p 有降部，而 bg-clip-text 的背景只画在元素的背景盒里：
   盒子之外的字形没有背景可裁 → 直接透明看不见，表现就是"文字底部被遮住"。
   首页那行同款文字早就加了 pb-[0.26em] pr-[0.06em] 给降部让位，这一版照抄。
   主字 BitLeap 的 p 同理，line-height 不能压到 0.88，留了 0.94 + pb。

   === 其余踩过的坑，逐条沿用 ===
    · PosterShell 尺寸契约（-mt-16 / h-[100svh] / pt-16）：导出高度 = 显示器高度。
    · 脚不裁：立绘 bottom-0，脚正好落在画面底边。
    · 所有内容都在页头（h-16）之下 —— 用 top-[max(4.2rem, x%)] 保证：
      纯百分比在矮窗口上会跑到页头底下，变成"导出图里有、屏幕上没有"。
    · 虚影比主体更大更高、偏在主体另一侧，CSS mask 两层取交集溶解，multiply 混合。
    · 不用 styled-jsx（dev 重编译 hydration 报错），keyframes 要进 globals.css；
      这一张没新增 keyframes —— 呼吸的绿点用 Tailwind 自带的 animate-ping，
      流光 / 读数 / 光圈自转全部由 GSAP 常驻 tween 完成。
      唯一一处 SVG 文字用 textLength + lengthAdjust 撑满整圈，
      不手写长度：凑字符必然在收口处留缝或者挤成一团。
    · 不用 backdrop-blur。导出前把入场时间轴推进终态。装饰位置写死，不用随机数。
    · 动画只加在"没有 CSS transform"的元素上，或者让外层专门负责定位：
      光圈的三圈环靠 inset 百分比画圆、外层那个 div 才拿 translate(-50%,-50%)，
      这样 GSAP 转环的时候不会把居中位移覆盖掉（和 love-cards 那次的坑同源）。
    · 按反馈删掉过两处：自上而下的扫光（横穿画面的动效太抢戏）、
      文案区右侧那条竖分栏线（加了光圈之后它正好从环里穿过去，成了噪音）。

   素材：public/image/BitLeap-l.png（透明底立绘，1696×2560）
   ========================================================================== */

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react"
import { gsap } from "gsap"
import { Download } from "lucide-react"
import { getFontEmbedCSS, toPng } from "html-to-image"
import { Breadcrumb } from "@/components/breadcrumb"
import { POSTER_OVERLAY, POSTER_SHELL, POSTER_SURFACE } from "@/components/PosterShell"
import { tools } from "@/app/tools"

/* --------------------------------------------------------------------------
   1. 素材与文案（改字只改这一段）
   -------------------------------------------------------------------------- */
const FIGURE_SRC = "/image/BitLeap-l.png"

/** 站子的真实数字：直接读工具表 —— 海报上写的就是站点实际有多少件，不手写 */
const TOOL_COUNT = tools.length
const CATEGORIES = Array.from(new Set(tools.map((tool) => tool.category)))
const CATEGORY_COUNT = CATEGORIES.length

const COPY = {
    wordmark: "BitLeap", // 站点主字，和首页 h1 同一套字距
    line1: "Tiny tools,", // 首页那两行副标，原样搬过来
    line2: "big leap.",
    eyebrow: "LOCAL-FIRST UTILITY LAB",
    latin: "BITLEAP · 工具站",
    series: "007",
    statement: "小工具，大跳跃。",
    copy: "把每天都会用到的小事做成一枚随手可用的工具——本地运行、不用注册、打开就能用。",
    notes: ["本地优先", "无需注册", "打开即用"],
    indexLabel: "INDEX",
    kana: "ビットリープ",
    edgeText: "BITLEAP · ANTHRO 007 · LOCAL-FIRST UTILITY LAB · 2026.10 · ",
    credit: "BitLeap 海报合成",
}

/** 色带上的规格行；TOOLS 那一格由 GSAP 做读数动画（odometer） */
const META: [string, string][] = [
    ["TOOLS", String(TOOL_COUNT).padStart(2, "0")],
    ["CATEGORIES", String(CATEGORY_COUNT).padStart(2, "0")],
    ["SERIES", "ANTHRO / 007"],
]

/* --------------------------------------------------------------------------
   2. 设计 token —— 全部取自立绘采样
   -------------------------------------------------------------------------- */
const C = {
    // 立绘的高光是暖白 #FCF8F7、淡紫 #F6EAF6 / #E7DAF5 → 纸面就用这两个色调
    paper: "#FCFAFE", // 近白微紫：渐变起点，也是导出底色
    lilac: "#E7DAF5",
    lilac2: "#C5BAE7",
    // 立绘的裙：采样里占比最高的两支靛紫 → 全篇唯一的强调色系
    peri: "#6967C5",
    periDeep: "#4B4A9E",
    corn: "#7787D8",
    // 正文取立绘最深的线条色再压暗，带紫，不用死黑
    ink: "#1F1C38",
    ink2: "#332F55",
    gray: "#6C6785",
    // 底部色带：比立绘最深再压一档
    night: "#161331",
    night2: "#241E48",
    inkSoft: "rgba(31,28,56,0.72)",
    inkFaint: "rgba(31,28,56,0.56)",
    line: "rgba(31,28,56,0.14)",
    lineSoft: "rgba(31,28,56,0.09)",
    periSoft: "rgba(105,103,197,0.20)",
    onNight: "#C9BEE8", // 色带上的小字（对 #161331 约 9:1）
    onNightSoft: "rgba(201,190,232,0.66)",
    onNightLine: "rgba(201,190,232,0.22)",
    live: "#10B981", // 首页那颗"在线"绿点，原样引用
}

/** 首页 "big leap." 上的品牌渐变：violet → fuchsia → sky，全站唯一的渐变 */
const SITE_GRADIENT = "linear-gradient(90deg, #8B5CF6 0%, #E879F9 50%, #38BDF8 100%)"
/** 两端淡出版，给外框或细线用（首页页头那条渐变线的做法） */
const SITE_GRADIENT_FADE =
    "linear-gradient(90deg, rgba(139,92,246,0) 0%, #8B5CF6 20%, #E879F9 50%, #38BDF8 80%, rgba(56,189,248,0) 100%)"

/** 页头高度：所有顶部元素的硬下限，保证不钻到固定页头底下 */
const BELOW_HEADER = "max(4.2rem,2.4%)"

/** 底部色带：四点百分比，顶边从 80% 斜到 90%。入场只动纵向那四个数 */
const BAND_CLIP = "polygon(0% 100%, 0% 80%, 48% 86%, 100% 90%, 100% 100%)"
const BAND_CLIP_FROM = "polygon(0% 100%, 0% 100%, 48% 100%, 100% 100%, 100% 100%)"

/** 首页那张 34px 的浅网格 */
const GRID_BG: CSSProperties = {
    backgroundImage:
        "linear-gradient(to right, rgba(31,28,56,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(31,28,56,0.07) 1px, transparent 1px)",
    backgroundSize: "34px 34px",
}

/** 虚影的溶解遮罩：两层取交集，纵向管底边溶解、横向管左右淡出 */
const GHOST_MASK = [
    "linear-gradient(180deg, #000 0%, #000 54%, rgba(0,0,0,0.42) 68%, transparent 80%)",
    "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.4) 12%, #000 30%, #000 70%, rgba(0,0,0,0.4) 88%, transparent 100%)",
].join(", ")

/** 四角星路径（24×24） */
const STAR_PATH = "M12 0C12.7 6.7 17.3 11.3 24 12C17.3 12.7 12.7 17.3 12 24C11.3 17.3 6.7 12.7 0 12C6.7 11.3 11.3 6.7 12 0Z"

/** 光圈上环绕的一圈字。只重复 2 遍（按反馈"文字少一点、间距大一点"）——
    字少了以后，fitRingText() 会把多出来的长度全部摊进字距，整圈依然刚好绕满，
    但读起来是"字与字之间拉开"的印章感，而不是一圈密密麻麻的小字。 */
const RING_PHRASE = "BITLEAP · LOCAL-FIRST UTILITY LAB · TINY TOOLS, BIG LEAP · ANTHRO 007 · "
const RING_TEXT = RING_PHRASE.repeat(2)
/** 环绕字的圆周半径（SVG 用户单位，viewBox 200×200 里半径 88）。
    周长不写在这里 —— fitRingText() 运行时用 path.getTotalLength() 现量。 */
const RING_RADIUS_UU = 88

/** 版心周围的小星芒：避开文案列（≤51.4%）、立绘（≥59%）、以及那条竖分栏线 */
const SPARKS = [
    { left: 54.6, top: 26.0, size: 14, o: 0.78, dur: 2.6, delay: 0.2, tone: C.peri },
    { left: 56.4, top: 61.0, size: 11, o: 0.6, dur: 3.1, delay: 1.4, tone: C.lilac2 },
    { left: 96.2, top: 18.5, size: 13, o: 0.7, dur: 2.8, delay: 0.7, tone: C.lilac2 },
    { left: 97.0, top: 55.0, size: 15, o: 0.62, dur: 2.4, delay: 1.9, tone: C.peri },
    { left: 21.0, top: 9.6, size: 11, o: 0.6, dur: 3.0, delay: 1.7, tone: C.peri },
    { left: 38.5, top: 92.0, size: 12, o: 0.62, dur: 2.9, delay: 1.1, tone: C.onNight },
    { left: 63.0, top: 94.0, size: 10, o: 0.55, dur: 3.2, delay: 2.3, tone: C.onNight },
    { left: 90.0, top: 92.5, size: 12, o: 0.6, dur: 2.7, delay: 0.5, tone: C.onNight },
]

/** 色带上的刻度：每 5 格一根长刻度，位置写死 */
const TICKS = Array.from({ length: 30 }, (_, i) => ({ tall: i % 5 === 0 }))

/* --------------------------------------------------------------------------
   2b. 立绘的几何 —— 光圈要靠这几个数算出来，不能凭感觉写百分比
   --------------------------------------------------------------------------
   立绘是 bottom-0 + right-[9%] 定位的，高度又被 min(vh, vw) 卡着，
   所以"她心的位置"随窗口宽高比在变：宽窗口下在 73%，窄高窗口下会掉到 75%+。
   光圈圆心如果写死成 left-[73%]，窄窗口上就会整整偏出去十几个百分点
   （实测 1100×900 偏 11%，900×1000 偏 20% —— 光环看着就不在她背后了）。
   所以下面这几个常数和 calc 一起，把圆心钉在立绘自身的不透明像素中心上，
   任何窗口都自动对齐。改立绘的定位时，这几个数要一起改。 */
const FIGURE_RIGHT = 9 // 立绘右边缘距海报右边（%）
const FIGURE_H = "min(86vh,54vw)" // 立绘高度，和 JSX 里的 h-[...] 必须一致
const FIGURE_ASPECT = 0.6625 // 立绘宽高比 1696 / 2560
const INK_CX = 0.5035 // 立绘盒左边缘 → 墨迹中心，占宽的比例（横向定位用）
/** 光圈直径 = 立绘高的多少倍；文字圈的半径由此反推 */
const HALO_SIZE_FACTOR = 0.96
/** 环绕文字那一圈的半径（相对立绘高）。文字圈 = 外圈 × RING_RADIUS_UU/100，
    所以它的半径直接决定圆心能放多高 —— 见下面的 HALO_TOP。 */
const HALO_TEXT_R = (RING_RADIUS_UU / 100) * 0.5 * HALO_SIZE_FACTOR

/** 光圈圆心：横向 = 立绘墨迹中心，纵向按"文字圈要塞进纸面"反推。
    · 横向那 1.4%：圆的最低点原本正好落在她两只脚踝中间（她脚踝在 x 1057~1122，
      墨迹中心 1103 正在里面），会让整圈在正下方缺一小段。把圆心往右让 1.4%，
      最低点就从脚踝右侧过，整圈才真的连得起来。1.4% 相对光圈半径只有 3%，看不出来。
    · 纵向不用她腰的位置，而是"色带顶边（x≈73% 处约 87.9%）退掉文字圈半径再留 2% 余量"：
      立绘几乎和可见高度一样高，圆心若钉在她腰上（57%），下半圈必然进靛色带里被吃掉，
      上半圈又会顶到她头后面 —— 实测约 30~40% 的字看不见，这才是"文字只有部分"的真正原因。
      抬到 49% 之后，整圈落在纸面上：顶部高于她头顶、底部高于色带。 */
const HALO_LEFT = `calc(${100 - FIGURE_RIGHT + 1.4}% - ${(INK_CX * FIGURE_ASPECT).toFixed(4)} * ${FIGURE_H})`
const HALO_TOP = `calc(86% - ${HALO_TEXT_R.toFixed(4)} * ${FIGURE_H})`
/** 光圈直径 = 立绘高的 0.96 倍；最内圈半径仍有立绘半宽（约 240px）之上，能露出来 */
const HALO_SIZE = `calc(${HALO_SIZE_FACTOR} * ${FIGURE_H})`

/* --------------------------------------------------------------------------
   3. 页面
   -------------------------------------------------------------------------- */
export default function BitLeapPosterPage() {
    const posterRef = useRef<HTMLElement>(null)
    const figureRef = useRef<HTMLDivElement>(null)
    const ghostRef = useRef<HTMLDivElement>(null)
    const glowRef = useRef<HTMLDivElement>(null)
    const haloRef = useRef<HTMLDivElement>(null)
    const odometerRef = useRef<HTMLSpanElement>(null)
    const ringPathRef = useRef<SVGPathElement>(null)
    const ringTextRef = useRef<SVGTextPathElement>(null)
    const fontCssRef = useRef("")
    const introRef = useRef<gsap.core.Timeline | null>(null)
    const loopsRef = useRef<gsap.core.Tween[]>([])
    const quickRef = useRef<Record<string, (v: number) => void>>({})
    const [exporting, setExporting] = useState(false)
    const [tip, setTip] = useState("")

    /* ---------------- 把环绕文字撑满整整一圈 ----------------
       圆周长（SVG 用户单位）减去当前文字长度，就是还差多少；
       字距与总长是线性的，把差值平均摊到每个字符上，迭代几轮即收敛。
       之所以要实测而不是写死：字体栈落到哪台机器上会换（Segoe UI / SF / Roboto），
       大写字母平均宽度差 3~5%，写死的字距在别人机器上不是叠字就是留缺口。 */
    const fitRingText = useCallback(() => {
        const path = ringPathRef.current
        const text = ringTextRef.current
        if (!path || !text) return
        const chars = (text.textContent || "").length
        if (!chars) return
        // 目标留 1 个单位不收口：正好撑到 100% 时，末尾会有 1~2 个字越过路径末端，
        // 而 textPath 不会绕回起点接上，那几个字直接不画，收口处就是个小缺口。
        // 留 1 个单位（约 4px）当成接缝，看不见，也不会丢字。
        const circumference = path.getTotalLength() - 1
        for (let i = 0; i < 5; i += 1) {
            // 首轮用当前字距量一下，之后按差值微调；差值小于半个单位就不再动
            const diff = circumference - text.getComputedTextLength()
            if (Math.abs(diff) < 0.5) return
            const current = parseFloat(window.getComputedStyle(text).letterSpacing) || 0
            text.style.letterSpacing = `${current + diff / chars}px`
        }
    }, [])

    /* ---------------- 入场 + 常驻动效 ----------------
       统一用 fromTo 写死首尾：from() 会把"当前值"当终点，
       dev 二次挂载时残留的行内样式会让动画变成 0→0，画面直接卡住。 */
    const play = useCallback(() => {
        const poster = posterRef.current
        if (!poster) return
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

        introRef.current?.kill()
        introRef.current = null
        loopsRef.current.forEach((t) => t.kill())
        loopsRef.current = []

        if (!reduced) {
            const tl = gsap.timeline({ defaults: { ease: "power3.out" } })
            // 场景顺序：底 → 网格 → 柔光 → 外框 → 色带 → 光 → 虚影 → 人 → 分栏线 → 排版 → 仪表 → 星
            tl.fromTo(".p-bg", { opacity: 0 }, { opacity: 1, duration: 0.9 }, 0)
                .fromTo(".p-grid", { opacity: 0 }, { opacity: 1, duration: 1.1 }, 0.1)
                .fromTo(".p-orb", { opacity: 0, scale: 0.86 }, { opacity: 1, scale: 1, duration: 1.6, stagger: 0.12 }, 0.15)
                // 外框从上往下"落"下来
                .fromTo(".p-frame", { clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.25, ease: "power2.inOut" }, 0.25)
                // 深靛色带从底边升起来（五个顶点数一致，GSAP 能插值 clip-path polygon）
                .fromTo(".p-band", { clipPath: BAND_CLIP_FROM }, { clipPath: BAND_CLIP, duration: 1.35, ease: "power3.inOut" }, 0.35)
                .fromTo(".p-glow", { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 1.7 }, 0.5)
                .fromTo(".p-ghost", { opacity: 0, scale: 1.05 }, { opacity: 1, scale: 1, duration: 1.9 }, 0.65)
                // 光圈：从内往外一圈圈张开
                .fromTo(".p-halo-bloom", { opacity: 0, scale: 0.72 }, { opacity: 1, scale: 1, duration: 1.6, ease: "power2.out" }, 0.55)
                .fromTo(".p-halo-ring", { opacity: 0, scale: 0.74 }, { opacity: 1, scale: 1, duration: 1.3, ease: "power2.out", stagger: 0.13, transformOrigin: "50% 50%" }, 0.65)
                .fromTo(".p-halo-text", { opacity: 0 }, { opacity: 1, duration: 1.5 }, 1.15)
                .fromTo(".p-figure", { opacity: 0, yPercent: 5 }, { opacity: 1, yPercent: 0, duration: 1.7 }, 0.85)
                // 顶栏
                .fromTo(".p-eyebrow", { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.6 }, 1.05)
                .fromTo(".p-live", { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: "back.out(2)" }, 1.15)
                // 品牌块：渐变细线先划出来，再一级一级落下来
                .fromTo(".p-gradient-rule", { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.95, ease: "power3.out", transformOrigin: "left center" }, 1.1)
                .fromTo(".p-latin", { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.6 }, 1.2)
                .fromTo(".p-wordmark", { opacity: 0, y: 34 }, { opacity: 1, y: 0, duration: 0.95 }, 1.25)
                .fromTo(".p-line1", { opacity: 0, x: -18 }, { opacity: 1, x: 0, duration: 0.75 }, 1.5)
                .fromTo(".p-line2", { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.85 }, 1.6)
                .fromTo(".p-statement", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.7 }, 1.85)
                .fromTo(".p-copy", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7 }, 2.0)
                .fromTo(".p-notes > span", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.1 }, 2.2)
                // 右页边与假名
                .fromTo(".p-kana", { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.8 }, 1.75)
                .fromTo(".p-edge", { opacity: 0 }, { opacity: 1, duration: 1.1 }, 2.25)
                // 色带上的仪表：刻度 → 索引胶囊 → 规格行 → 署名
                .fromTo(".p-band-rule", { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: "power3.out", transformOrigin: "left center" }, 1.15)
                .fromTo(".p-tick", { opacity: 0, scaleY: 0.2 }, { opacity: (i: number) => (TICKS[i]?.tall ? 0.55 : 0.32), scaleY: 1, duration: 0.4, stagger: 0.016, transformOrigin: "bottom center" }, 1.25)
                .fromTo(".p-index-label", { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.6 }, 2.05)
                .fromTo(".p-pill", { opacity: 0, y: 10, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.42, stagger: 0.045 }, 2.15)
                .fromTo(".p-meta-row", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.55, stagger: 0.09 }, 2.35)
                .fromTo(".p-credit", { opacity: 0 }, { opacity: 1, duration: 0.8 }, 2.6)
                .fromTo(".p-spark", { opacity: 0, scale: 0.2, rotation: -50 }, { opacity: (i: number) => SPARKS[i]?.o ?? 0.7, scale: 1, rotation: 0, duration: 0.8, ease: "back.out(2.2)", stagger: 0.07 }, 1.7)
                // 读数：TOOLS 那一格从 0 滚到实际数量
                .fromTo(
                    { v: 0 },
                    { v: 0 },
                    {
                        v: TOOL_COUNT,
                        duration: 1.2,
                        ease: "power2.out",
                        onUpdate() {
                            const el = odometerRef.current
                            if (el) el.textContent = String(Math.round(this.targets()[0].v)).padStart(2, "0")
                        },
                    },
                    2.0,
                )
            introRef.current = tl
        }

        /* 常驻循环：柔光呼吸 + 人物浮空 + 虚影漂移 + 柔光团游走 + 色带呼吸
           + 刻度跳动 + 星芒闪烁 + 渐变流光 + 一道缓慢的扫光 */
        const push = (t: gsap.core.Tween) => loopsRef.current.push(t)
        push(gsap.to(".p-glow", { opacity: 0.78, scale: 1.05, duration: 5.8, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3 }))
        push(gsap.to(".p-figure-inner", { y: -9, duration: 8, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3.2 }))
        push(gsap.to(".p-ghost img", { y: -8, duration: 13, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3.4 }))
        push(gsap.to(".p-ghost", { opacity: 0.76, duration: 8.4, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3.6 }))
        push(gsap.to(".p-orb-a", { x: 30, y: 20, duration: 16, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3 }))
        push(gsap.to(".p-orb-b", { x: -26, y: 32, duration: 20, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3 }))
        // 色带极慢地呼吸一下，画面才不像一张静止的图
        push(gsap.to(".p-band-inner", { x: 14, duration: 26, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 4 }))
        // 刻度逐格跳，像仪表在读数
        push(gsap.to(".p-tick", { opacity: 0.1, scaleY: 0.55, duration: 0.95, repeat: -1, yoyo: true, ease: "sine.inOut", stagger: { each: 0.07, from: "start" }, delay: 3.6, transformOrigin: "bottom center" }))
        // 品牌渐变细线：高光缓缓流过（拉长背景再平移背景位置）
        push(gsap.fromTo(".p-gradient-rule", { backgroundPosition: "0% 0%" }, { backgroundPosition: "100% 0%", duration: 5.5, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3.2 }))
        push(gsap.fromTo(".p-frame-rule", { backgroundPosition: "0% 0%" }, { backgroundPosition: "100% 0%", duration: 7.5, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3.4 }))
        // 光圈：外圈虚线极慢转（有刻度才看得出在转）、中圈轻微缩放、内圈明暗呼吸、柔光团同步呼吸
        push(gsap.to(".p-halo-dashed", { rotation: 360, duration: 140, repeat: -1, ease: "none", delay: 3.2, transformOrigin: "50% 50%" }))
        push(gsap.to(".p-halo-ring", { scale: 1.028, duration: 7.4, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3.4, transformOrigin: "50% 50%" }))
        push(gsap.to(".p-halo-bloom", { opacity: 0.74, scale: 1.06, duration: 6.6, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3 }))
        // 环绕字反向慢转：和虚线环一正一反，读起来像一圈在自转的刻度盘（190s 太慢，看不出在动）
        push(gsap.to(".p-halo-text", { rotation: -360, duration: 110, repeat: -1, ease: "none", delay: 3.6, transformOrigin: "50% 50%" }))
        poster.querySelectorAll<HTMLElement>(".p-spark").forEach((el, i) => {
            const s = SPARKS[i]
            if (!s) return
            push(gsap.to(el, { opacity: s.o * 0.2, scale: 0.55, rotation: i % 2 ? 30 : -30, duration: s.dur, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3 + s.delay }))
        })
    }, [])

    useEffect(() => {
        // 环绕文字先撑满一圈再入场：字体尺寸变了要重算
        fitRingText()
        const fonts = (document as Document & { fonts?: FontFaceSet }).fonts
        fonts?.ready.then(() => fitRingText()).catch(() => {})

        play()
        return () => {
            introRef.current?.kill()
            introRef.current = null
            loopsRef.current.forEach((t) => t.kill())
            loopsRef.current = []
        }
    }, [play, fitRingText])

    /* ---------------- 鼠标视差 ---------------- */
    useEffect(() => {
        const figure = figureRef.current
        const ghost = ghostRef.current
        const glow = glowRef.current
        const halo = haloRef.current
        if (!figure || !ghost || !glow || !halo) return
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

        quickRef.current = {
            fx: gsap.quickTo(figure, "x", { duration: 1.1, ease: "power3" }),
            gx: gsap.quickTo(ghost, "x", { duration: 1.6, ease: "power3" }),
            lx: gsap.quickTo(glow, "x", { duration: 1.4, ease: "power3" }),
            ly: gsap.quickTo(glow, "y", { duration: 1.4, ease: "power3" }),
            hx: gsap.quickTo(halo, "x", { duration: 1.25, ease: "power3" }),
            hy: gsap.quickTo(halo, "y", { duration: 1.25, ease: "power3" }),
        }
        return () => {
            quickRef.current = {}
        }
    }, [])

    const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.pointerType !== "mouse") return
        const rect = e.currentTarget.getBoundingClientRect()
        const px = (e.clientX - rect.left) / rect.width - 0.5
        const py = (e.clientY - rect.top) / rect.height - 0.5
        const q = quickRef.current
        q.fx?.(px * -16)
        q.gx?.(px * -30) // 虚影走得比主体多，纵深就出来了
        q.lx?.(px * 14)
        q.ly?.(py * 10)
        q.hx?.(px * 8) // 光圈比主体慢，像挂在她身后更远的地方
        q.hy?.(py * 6)
    }

    const onPointerLeave = () => {
        const q = quickRef.current
        q.fx?.(0)
        q.gx?.(0)
        q.lx?.(0)
        q.ly?.(0)
        q.hx?.(0)
        q.hy?.(0)
    }

    /* ---------------- 导出海报（2 倍图） ----------------
       高度由 PosterShell 保证：海报正好一屏，导出高度 = 当前显示器高度。 */
    const exportPng = async () => {
        const poster = posterRef.current
        if (!poster || exporting) return
        setExporting(true)
        setTip("正在合成…")
        gsap.set([figureRef.current, ghostRef.current, glowRef.current, haloRef.current], { x: 0, y: 0 })
        gsap.set(ghostRef.current, { opacity: 1 })
        gsap.set(poster.querySelector(".p-ghost img"), { y: 0 })
        // 入场时间轴推到终态：否则动画没跑完就点导出，文字还停在 opacity 0，成图会缺内容
        introRef.current?.progress(1)
        if (odometerRef.current) odometerRef.current.textContent = String(TOOL_COUNT).padStart(2, "0")
        try {
            if (!fontCssRef.current) fontCssRef.current = await getFontEmbedCSS(poster)
            const rect = poster.getBoundingClientRect()
            const ratio = Math.min(2, 2600 / Math.max(1, rect.width))
            const dataUrl = await toPng(poster, {
                pixelRatio: ratio,
                cacheBust: true,
                backgroundColor: C.paper,
                fontEmbedCSS: fontCssRef.current,
            })
            const a = document.createElement("a")
            a.href = dataUrl
            a.download = `bitleap-poster-${Date.now()}.png`
            a.click()
            setTip("已保存 2 倍高清图")
        } catch (err) {
            console.error("[bitleap-poster] 导出失败:", err)
            setTip("导出失败，可直接截图保存")
        } finally {
            setExporting(false)
            window.setTimeout(() => setTip(""), 3600)
        }
    }

    /* -------------------------------------------------------------------------- */
    return (
        <div
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
            className={`${POSTER_SHELL} overflow-hidden bg-[#FCFAFE] text-[#1F1C38] selection:bg-[#6967C5]/30`}
        >
            {/* ============================ 海报本体（导出对象） ============================ */}
            <section ref={posterRef} className={POSTER_SURFACE}>
                {/* 底色：近白 → 淡紫。立绘的高光与裙色之间的那段明度，全靠渐变堆层次 */}
                <div className="p-bg absolute inset-0 bg-[linear-gradient(166deg,#FCFAFE_0%,#F8F5FD_20%,#F4F0FB_40%,#EFEAF9_60%,#EAE4F6_80%,#E5DEF3_100%)]" />

                {/* 首页那张 34px 浅网格 —— 一眼认出是同一个站 */}
                <div className="p-grid pointer-events-none absolute inset-0" style={GRID_BG} />

                {/* 首页 Hero 里那两团柔光，换成站子自己的紫/蓝 */}
                <div className="p-orb p-orb-a pointer-events-none absolute -left-[14%] -top-[26%] h-[52%] w-[46%] rounded-full" style={{ background: `radial-gradient(closest-side, ${C.periSoft} 0%, rgba(139,92,246,0.12) 46%, transparent 78%)` }} />
                <div className="p-orb p-orb-b pointer-events-none absolute -right-[12%] top-[6%] h-[54%] w-[42%] rounded-full" style={{ background: `radial-gradient(closest-side, rgba(56,189,248,0.16) 0%, rgba(56,189,248,0.08) 48%, transparent 80%)` }} />

                {/* 人物背后的光圈：三圈同心环 + 一层柔光 + 一圈环绕文字。
                    圆心与直径都是量出来的（见上面 2b 那几个常数），关键三条：
                    ① 文字圈必须整圈落在纸面上 —— 抬高圆心的理由写在上面，
                       这是"环绕字只有部分"的真正原因，不是字距没撑满。
                    ② 最内圈的半径要大于她剪影的半宽（最宽处约 240px），
                       否则整圈藏在裙子后面等于没画。这里三圈半径约 278 / 335 / 389。
                    ③ 直径用 min(vh, vw) 跟着立绘一起缩，任何窗口下比例都不跑。
                    它画在色带【之前】：圆的下半部分被靛色带接住，
                    读起来是"立在她身后的地面之后"，比在暗色带上留一条淡紫线干净。
                    结构上分两层：外层只负责定位（left/top + translate(-50%,-50%)），
                    里面的环用 inset 百分比画圆 —— 环上没有任何 CSS transform，
                    GSAP 转环时不会把居中位移覆盖掉（与 love-cards 那次的坑同源）。
                    aspect-square 保证是正圆：百分比的宽高在非方形海报上会画成椭圆。
                    柔光是"中心白、外圈紫"：白心整块被她身体挡住，露出来的那圈是紫的 ——
                    近白立绘在近白纸上本来没有对比，这圈紫刚好把她托出来。 */}
                <div ref={haloRef} className="p-halo pointer-events-none absolute inset-0">
                    <div
                        className="absolute aspect-square -translate-x-1/2 -translate-y-1/2"
                        style={{ left: HALO_LEFT, top: HALO_TOP, height: HALO_SIZE }}
                    >
                        <span
                            className="p-halo-bloom absolute inset-[6%] rounded-full"
                            style={{ background: `radial-gradient(closest-side, rgba(255,255,255,0.70) 0%, rgba(255,255,255,0.40) 30%, rgba(178,168,236,0.46) 56%, rgba(105,103,197,0.20) 78%, rgba(105,103,197,0) 94%)` }}
                        />
                        <span className="p-halo-ring absolute inset-[14.3%] rounded-full border" style={{ borderColor: "rgba(105,103,197,0.34)" }} />
                        <span className="p-halo-ring absolute inset-[7%] rounded-full border" style={{ borderColor: "rgba(105,103,197,0.24)" }} />
                        <span className="p-halo-ring p-halo-dashed absolute inset-0 rounded-full border border-dashed" style={{ borderColor: "rgba(105,103,197,0.18)" }} />

                        {/* 环绕的文字：贴在中间圈与外圈之间，反向慢转。
                            ① 半径 88（viewBox 半宽 100）：留出 12 个单位，字形的上缘
                               刚好不会被 SVG 视口裁掉。
                            ② 字距由 fitRingText() 在运行时实测后写死绝对值：
                               圆周长 − 当前文字长度 = 还差多少，平均摊到每个字符上。
                               所以"文字少一点"和"间距大一点"是同一件事 ——
                               少重复一遍，多出来的长度会自动变成字距。
                               不手算、也不靠 textLength：各平台大写字母宽度差 3~5%，
                               手算在别的机器上必然叠字或留缝；Chromium 在 textPath 上
                               又会忽略 textLength（实测过），两边都靠不住。
                            ③ 绝对不要给 startOffset 设非零值！textPath 不会从路径末端
                               绕回起点 —— 超出末端的字是直接不画的。之前设了 79%（本意是
                               把收口的缝藏到正下方），结果整圈只剩 21% 的长度可用，
                               288 个字只画出来 40 个，这就是"环绕字只有一部分"的真正原因。
                               注意这个坑很阴：getComputedTextLength() 依然报"长度=周长 100%"，
                               因为那量的是文字自身的步进，跟"画出来多少"是两回事。
                               验证要看 getStartPositionOfChar() 的落点是否绕满一圈。 */}
                        <svg viewBox="0 0 200 200" className="p-halo-text absolute inset-0 h-full w-full" aria-hidden>
                            <defs>
                                <linearGradient id="bl-ring-text" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor="#8B5CF6" />
                                    <stop offset="50%" stopColor="#E879F9" />
                                    <stop offset="100%" stopColor="#38BDF8" />
                                </linearGradient>
                                <path ref={ringPathRef} id="bl-ring-path" d={`M100,100 m-${RING_RADIUS_UU},0 a${RING_RADIUS_UU},${RING_RADIUS_UU} 0 1,1 ${RING_RADIUS_UU * 2},0 a${RING_RADIUS_UU},${RING_RADIUS_UU} 0 1,1 ${-RING_RADIUS_UU * 2},0`} />
                            </defs>
                            <text fontSize="3" style={{ fontWeight: 500, letterSpacing: "0.15em" }} fill="url(#bl-ring-text)">
                                <textPath ref={ringTextRef} href="#bl-ring-path">
                                    {RING_TEXT}
                                </textPath>
                            </text>
                        </svg>
                    </div>
                </div>

                {/* 整张海报的"价值锚"：底部深靛色带。
                    理由见文件头 —— 近白立绘 + 近白底 = 谁都不比谁暗，必须引进明度对比。
                    顶边用四个百分比顶点画斜切线，入场只动纵向四个数（升起）。
                    维护注意：色带覆盖到的元素一律用浅色（刻度 / 胶囊 / 规格行 / 星芒）。 */}
                <div className="p-band pointer-events-none absolute inset-0" style={{ clipPath: BAND_CLIP }}>
                    <div className="p-band-inner absolute inset-[-6%]" style={{ background: `linear-gradient(168deg, ${C.night2} 0%, ${C.night} 52%, #100E25 100%)` }} />
                </div>

                {/* 角色背后的光：紫 + 一团提亮的白（色带上那截就是她的辉光） */}
                <div ref={glowRef} className="p-glow pointer-events-none absolute inset-0">
                    <div className="absolute left-[74%] top-[24%] h-[64%] w-[42%] -translate-x-1/2" style={{ background: `radial-gradient(closest-side, ${C.periSoft} 0%, rgba(206,190,230,0.24) 44%, transparent 78%)` }} />
                    {/* 提亮那团刻意压到 0.32：立绘本身是近白的，背光太白会把她和纸面糊在一起 */}
                    <div className="absolute left-[76%] top-[42%] h-[44%] w-[26%]" style={{ background: `radial-gradient(closest-side, rgba(255,255,255,0.32), rgba(255,255,255,0.14) 48%, transparent 80%)` }} />
                </div>

                {/* 冷调暗角 */}
                <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(126% 82% at 46% 42%, transparent 48%, rgba(58,46,92,0.10) 100%)` }} />

                {/* 人物虚影：放大、半透明、multiply —— 立绘近白，白衣几乎消失、
                    靛紫的裙与线条留下一层很淡的印痕。比主体更大更高，且偏在主体左侧。 */}
                <div ref={ghostRef} className="p-ghost pointer-events-none absolute inset-0">
                    <div
                        className="absolute left-[32%] top-[5%] h-[min(114vh,64vw)] -translate-x-1/2 opacity-[0.22] mix-blend-multiply"
                        style={
                            {
                                WebkitMaskImage: GHOST_MASK,
                                maskImage: GHOST_MASK,
                                // 两层遮罩取交集：纵向管底边溶解、横向管左右淡出
                                WebkitMaskComposite: "source-in",
                                maskComposite: "intersect",
                            } as CSSProperties
                        }
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={FIGURE_SRC} alt="" aria-hidden className="h-full w-auto max-w-none object-contain" />
                    </div>
                </div>

                {/* 立绘：靠右，脚落在画面底边上（不裁脚）。
                    right / 高度都取自上面的常数 —— 光圈圆心就是用这两个数算出来的，
                    这里改一个值、光圈就会跟着走。 */}
                <div ref={figureRef} className="p-figure pointer-events-none absolute inset-0">
                    <div className="p-figure-inner absolute bottom-0 h-[min(86vh,54vw)]" style={{ right: `${FIGURE_RIGHT}%` }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={FIGURE_SRC}
                            alt="BitLeap 站娘立绘"
                            className="h-full w-auto max-w-none object-contain"
                            style={{ filter: `drop-shadow(0 12px 34px rgba(22,19,49,0.30)) drop-shadow(0 0 60px rgba(160,150,230,0.34))` }}
                        />
                    </div>
                </div>

                {/* 扫光：已按反馈删除 —— 从上往下扫的那条横带太抢戏 */}

                {/* 外框：引用首页卡片那套非对称圆角。顶边压在页头之下，所以用 max() 兜住 */}
                <div
                    className="p-frame pointer-events-none absolute bottom-[2.4%] left-[2.4%] right-[2.4%] z-[5] rounded-[36px_16px_36px_36px] border"
                    style={{ top: BELOW_HEADER, borderColor: C.lineSoft }}
                />
                {/* 外框顶边那一条走品牌渐变（首页页头那条线同款），细到只当高光 */}
                <div
                    className="p-frame-rule pointer-events-none absolute left-[2.4%] right-[2.4%] z-[5] h-[2px] rounded-full"
                    style={{ top: BELOW_HEADER, background: SITE_GRADIENT_FADE, backgroundSize: "220% 100%" }}
                />

                {/* 版面"脊柱"：已删除 —— 光圈加进来之后，那条竖线正好从环里穿过去，
                    成了多余的噪音。现在结构由外框 + 渐变线 + 基线刻度承担。 */}

                {/* ================= 顶部一行：站点状态 + 品类 + 编号 ================= */}
                <div className="p-eyebrow absolute inset-x-[3.4%] top-[max(4.2rem,9%)] z-10 flex items-baseline justify-between gap-4">
                    <span className="flex items-baseline gap-3">
                        <span className="p-live relative flex h-2 w-2 shrink-0 self-center">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-40" style={{ background: C.live }} />
                            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: C.live }} />
                        </span>
                        <span className="text-[10px] font-medium tracking-[.46em]" style={{ color: C.inkSoft }}>
                            {COPY.eyebrow}
                        </span>
                        <span className="font-mono text-[10px]" style={{ color: C.periDeep }}>
                            {COPY.series}
                        </span>
                    </span>
                    <span className="font-mono text-[9px] tracking-[.22em]" style={{ color: C.inkFaint }}>
                        NO.007-K
                    </span>
                </div>

                {/* ================= 左栏：品牌块 =================
                    整块是普通文档流（一个绝对定位的 flex 列），所以任何窗口下
                    内部都不会互相压住；也正因为如此，字号必须用 min(vw, vh)，
                    否则矮窗口下整列会顶进底部色带（见文件头）。 */}
                <div className="p-col absolute left-[3.4%] top-[17.5%] z-10 flex w-[48%] flex-col gap-[clamp(9px,min(1vw,1.75vh),20px)]">
                    {/* 品牌渐变细线：全站唯一的渐变，出现在这里当"起手式" */}
                    <span
                        className="p-gradient-rule block h-[3px] w-[46%] origin-left rounded-full"
                        style={{ background: SITE_GRADIENT, backgroundSize: "220% 100%" }}
                    />

                    <span className="p-latin block text-[9.5px] tracking-[.52em]" style={{ color: C.inkFaint }}>
                        {COPY.latin}
                    </span>

                    {/* 主字：p 有降部，line-height 不能压到 0.88，留 0.94 + pb */}
                    <span
                        className="p-wordmark block pb-[0.08em] font-medium leading-[0.94] tracking-[-.085em]"
                        style={{ fontSize: "clamp(42px,min(9.8vw,16.8vh),182px)", color: C.ink }}
                    >
                        {COPY.wordmark}
                    </span>

                    {/* 副标两行：和首页 h1 下面那两行完全一样的处理 */}
                    <span className="p-line1 flex items-center gap-3 pl-[6%]">
                        <span className="h-px w-12 shrink-0 sm:w-20" style={{ background: C.line }} />
                        <span
                            className="block whitespace-nowrap text-[clamp(13px,min(1.45vw,2.5vh),25px)] font-medium leading-[1.2] tracking-[-.05em]"
                            style={{ color: C.ink2 }}
                        >
                            {COPY.line1}
                        </span>
                    </span>

                    {/* bg-clip-text 只画在背景盒里：g / p 的降部必须靠 pb + pr 让开，否则底部被切掉 */}
                    <span
                        className="p-line2 block w-fit overflow-visible bg-gradient-to-r from-violet-500 via-fuchsia-400 to-sky-400 bg-clip-text pb-[0.26em] pr-[0.06em] font-medium leading-[1.2] tracking-[-.055em] text-transparent"
                        style={{ fontSize: "clamp(28px,min(6.3vw,10.6vh),116px)" }}
                    >
                        {COPY.line2}
                    </span>

                    <p
                        className="p-statement mt-[.2em] max-w-[22ch] font-medium leading-[1.45] tracking-[-.01em]"
                        style={{ fontSize: "clamp(14px,min(1.45vw,2.5vh),25px)", color: C.ink }}
                    >
                        {COPY.statement}
                    </p>

                    <p
                        className="p-copy max-w-[34ch] leading-[1.75]"
                        style={{ fontSize: "clamp(11px,min(0.9vw,1.5vh),14.5px)", color: C.gray }}
                    >
                        {COPY.copy}
                    </p>

                    <div className="p-notes flex flex-wrap items-center gap-x-3.5 gap-y-2 text-[10.5px] tracking-[.18em]" style={{ color: C.inkSoft }}>
                        {COPY.notes.map((n, i) => (
                            <span key={n} className="flex items-center gap-3.5">
                                {i > 0 && <span className="h-[6px] w-[6px] rotate-45" style={{ background: C.peri, opacity: 0.75 }} />}
                                {n}
                            </span>
                        ))}
                    </div>
                </div>

                {/* ================= 右上：竖排假名 ================= */}
                <span className="p-kana absolute right-[2.4%] top-[max(4.2rem,11%)] z-10 text-[10px] tracking-[.26em]" style={{ writingMode: "vertical-rl", color: C.peri }}>
                    {COPY.kana}
                </span>

                {/* 右页边：微缩字，兼作一条竖向纹样（文字本身就是纹样） */}
                <div className="p-edge pointer-events-none absolute bottom-[16%] right-[1.6%] z-10 hidden sm:block">
                    <span className="text-[11px] tracking-[.34em]" style={{ writingMode: "vertical-rl", color: C.peri }}>
                        {COPY.edgeText}
                    </span>
                </div>

                {/* ================= 色带上的仪表区 =================
                    三段都收在色带里（色带顶边是斜的，所以刻度的右端只到 x=34%，
                    那里色带顶边已经降到 84.4%，不会被甩到纸面上）。 */}
                <div className="absolute bottom-[13%] left-[3.4%] z-10 w-[31%]">
                    <div className="flex items-center gap-2.5">
                        <span className="h-[7px] w-[7px] shrink-0 rotate-45" style={{ background: C.peri }} />
                        <span className="font-mono text-[8.5px] tracking-[.3em]" style={{ color: C.onNightSoft }}>
                            BASELINE · 007
                        </span>
                        <span className="p-band-rule block h-px flex-1 origin-left" style={{ background: `linear-gradient(90deg, ${C.onNightLine}, rgba(201,190,232,0.04))` }} />
                    </div>
                    <div className="mt-[6px] flex items-end gap-[clamp(4px,0.4vw,7px)]">
                        {TICKS.map((t, i) => (
                            <span
                                key={i}
                                className="p-tick block w-px"
                                style={{
                                    height: t.tall ? "clamp(7px,0.95vh,10px)" : "clamp(3px,0.42vh,5px)",
                                    background: t.tall ? C.peri : C.lilac2,
                                    opacity: t.tall ? 0.55 : 0.32,
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* 分类索引：直接把工具站的分类胶囊印在色带上（数据取自 tools.ts） */}
                <div className="absolute bottom-[8.4%] left-[3.4%] right-[3.4%] z-10 flex flex-wrap items-center gap-2">
                    <span className="p-index-label mr-1 text-[9px] tracking-[.3em]" style={{ color: C.onNightSoft }}>
                        {COPY.indexLabel}
                    </span>
                    {CATEGORIES.map((name) => (
                        <span
                            key={name}
                            className="p-pill rounded-full border px-3 py-[5px] text-[10px] tracking-[.14em]"
                            style={{ borderColor: C.onNightLine, color: C.onNightSoft, background: "rgba(201,190,232,0.07)" }}
                        >
                            {name}
                        </span>
                    ))}
                </div>

                {/* ================= 页脚（在色带里，所以全部用浅色） ================= */}
                <div className="absolute inset-x-[3.4%] bottom-[3.6%] z-10">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div className="flex flex-wrap gap-x-7 gap-y-2">
                            {META.map(([k, v], i) => (
                                <span key={k} className="p-meta-row flex items-baseline gap-2">
                                    <span className="font-mono text-[9px]" style={{ color: C.onNightSoft }}>
                                        {String(i + 1).padStart(2, "0")}
                                    </span>
                                    <span className="text-[9px] tracking-[.24em]" style={{ color: C.onNightSoft }}>
                                        {k}
                                    </span>
                                    <span className="font-mono text-[11px]" style={{ color: C.onNight }}>
                                        {i === 0 ? <span ref={odometerRef}>{v}</span> : v}
                                    </span>
                                </span>
                            ))}
                        </div>
                        <span className="p-credit font-mono text-[9px] tracking-[.26em]" style={{ color: C.onNightSoft }}>
                            {COPY.credit}
                        </span>
                    </div>
                </div>

                {/* 版心周围的小星芒 */}
                <div className="pointer-events-none absolute inset-0 z-10">
                    {SPARKS.map((s, i) => (
                        <span
                            key={i}
                            className="p-spark absolute"
                            style={{ left: `${s.left}%`, top: `${s.top}%`, width: `${s.size}px`, height: `${s.size}px`, opacity: s.o }}
                        >
                            <svg viewBox="0 0 24 24" className="h-full w-full">
                                <path d={STAR_PATH} fill={s.tone} />
                            </svg>
                        </span>
                    ))}
                </div>
            </section>

            {/* ============================ 页面浮层（不参与导出） ============================ */}
            <div className={POSTER_OVERLAY}>
                <div className="pointer-events-auto">
                    <Breadcrumb variant="light" />
                </div>
                <div className="pointer-events-auto flex items-center gap-3">
                    {tip && (
                        <span className="text-[11px]" style={{ color: C.gray }}>
                            {tip}
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={exportPng}
                        disabled={exporting}
                        className="flex items-center gap-2 rounded-full border px-4 py-2 text-[11.5px] transition-colors disabled:opacity-50"
                        style={{ borderColor: C.line, background: "rgba(255,255,255,0.88)", color: C.inkSoft }}
                    >
                        <Download className="h-3.5 w-3.5" />
                        {exporting ? "合成中…" : "保存海报"}
                    </button>
                </div>
            </div>
        </div>
    )
}
