"use client"

/* ==========================================================================
   ChatGPT 娘 · 娘化人物海报（系列第三张 · 重做版）
   --------------------------------------------------------------------------
   六张各有自己的结构：
     DeepSeek：巨型横带压字 + 深靛蓝赛博
     ClaudeCode：堆叠字块 + 印刷套准
     ChatGPT（这一张）：斜轴「阶梯排版」
     Z.ai：表格化的规格说明书
     Kimi：轴对称「月轮」+ 环形文字
     Grok：竖排大标题 + 横向信息带

   重做思路 —— 原来那版是"产品页式左右分栏"（左排版 + 右徽章 + 底部页脚），
   和 Z.ai 那版的气质太近，所以整个换掉，改成一条贯穿全图的斜轴：
     · 全图共享一条 9° 下斜的斜轴：斜向色带、巨型花瓣标描边、阶梯排版的缩进，
       三个装置对齐同一个角度。动感从"几何关系"里来，而不是把文字斜过来 ——
       倾斜的文字牺牲可读性，这一版所有文字一律保持水平。
     · 标题是阶梯的第一级，往下每级依次右缩，每级左侧的编号 + 竖线连成阶梯的立面。
     · 去掉"文字下面压一条线"这类装置（用户明确不喜欢）：原来标题下的荧光笔条没了，
       改成"Chat"墨黑 + "GPT"藕紫的双色标题。
     · 巨型水印字换成一枚出血的巨型花瓣标"描边"—— 这块图形的角色和别的海报的
       巨型水印字类似（当背景锚点），但它是线不是面，压在阶梯文字下面不会打架。
     · 拉长的四角星与"运行刻度"保留，位置全部让开文字与人物（实测过的坐标）。
     · 招牌打字机动效保留：它本来就是靠文字工作的角色。

   配色取自立绘采样：近白 #FBF7F9 为主，淡紫灰 #D5C9D9 / #C7BAD5 / #A59AB8 做层次。

   强调色换了四轮（绿 → 藕玫瑰 → 亮玫粉 → 淡蓝），用户四次都觉得不好看。
   第五次不再换颜色，改结构 —— 因为前四次的病根不在色相：
   人物是近白的、底也是近白的，画面里"谁都不比谁暗"，这种底上任何强调色都会被摊平。
   （旁证：用户夸过的 Kimi 与 Grok 都是"深底 + 亮人物"，浅底这几张恰恰都不满意。）

   所以这一版把"明度对比"引进来：右下角一整块深墨楔形 #1B1822，
   边界是一条 41° 的斜切线（clip-path polygon，三个百分比顶点），
   淡紫白的立绘跨在边界上 —— 白底那边靠线稿读，墨底那边她的亮部自己发光。
   底色同时从淡紫改成中性冷白：淡紫底会把淡紫人物吃掉，也是糊的一部分原因。

   强调色随之定为藕紫 #8A76A8（立绘自己的淡紫加深而来）：
   选"中调"是因为它要同时出现在白底与墨底两处，中调在两边都有 3.5:1 左右，
   一支色通吃两个区域。小字再分两档 —— 白底用 #5F4B7A（7.6:1），墨底用 #C9B8E0（9:1）。

   前五张踩过的坑逐条避开：PosterShell 尺寸契约、文字不碰头（实测坐标）、脚不裁、
   虚影侧偏且更大更高、虚影用 CSS mask 溶解、背景用人物主色、不用 styled-jsx、
   不用 backdrop-blur、导出前把入场时间轴推到终态、装饰确定性、
   三角函数算出的值先固定精度再进 JSX（否则 hydration 报错）。

   这一版新补两条：
     · 花瓣标的"揭开"用 clip-path 擦除，不用 stroke-dashoffset 描边动画：
       这条路径有 6 个花瓣 + 多个内孔共十余条子路径，pathLength 归一化之后
       dash 动画在每个子路径上进度不一致，画出来是断的。clip-path 擦除必然完整。
     · 入场动画的"隐藏初态"写在 JS 里（gsap.set）而不是 JSX 内联样式：
       内联 hidden 在 prefers-reduced-motion 下没人来恢复，元素会永久消失。

   素材：public/image/ChatGPT.png（透明底立绘，1696×2496）
   官方图标：OpenAI 花瓣标（矢量路径取自 simple-icons v9，CC0）
   ========================================================================== */

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react"
import { gsap } from "gsap"
import { Download } from "lucide-react"
import { getFontEmbedCSS, toPng } from "html-to-image"
import { Breadcrumb } from "@/components/breadcrumb"
import { POSTER_OVERLAY, POSTER_SHELL, POSTER_SURFACE } from "@/components/PosterShell"

/* --------------------------------------------------------------------------
   1. 素材与文案（改字只改这一段）
   -------------------------------------------------------------------------- */
const FIGURE_SRC = "/image/ChatGPT.png"

/** OpenAI 官方花瓣标（24×24 单路径，取自 simple-icons v9） */
const OPENAI_PATH =
    "M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"

const COPY = {
    titleA: "Chat", // 标题前段：墨黑
    titleB: "GPT", // 标题后段：藕紫（替代原来那条荧光笔，不再用"下划线"装置）
    latin: "OPENAI · CHATGPT",
    eyebrow: "ANTHROPOMORPHISM",
    series: "003",
    statement: "把难的事，拆成一句一句。",
    copy: "你问，它答。它不困，也不烦，更不会嫌你问得笨。",
    notes: ["有问必答", "不困不烦", "随时都在"],
    quote: "每次都会认真回答，哪怕你只是随口一问。",
    quoteBy: "—— 它自己说的",
    kana: "チャットジーピーティー",
    axis: "BASELINE",
    credit: "BitLeap 海报合成",
}

/** 阶梯的五级：序号在这里，渲染顺序 = 版面自上而下 */
const STEPS = [
    { num: "01", rule: "clamp(10px,1.4vh,18px)" },
    { num: "02", rule: "clamp(40px,12vh,150px)" },
    { num: "03", rule: "clamp(18px,3.4vh,40px)" },
    { num: "04", rule: "clamp(16px,3vh,36px)" },
    { num: "05", rule: "clamp(10px,1.4vh,18px)" },
]

const META: [string, string][] = [
    ["MODEL", "CHATGPT / 娘"],
    ["SERIES", "ANTHRO / 003"],
    ["RENDER", "2026.10"],
]

/* --------------------------------------------------------------------------
   2. 设计 token —— 主色来自立绘采样，brand 是唯一的外来强调色
   -------------------------------------------------------------------------- */
const C = {
    paper: "#FDFDFE", // 中性近白（原来是淡紫底；淡紫底是"糊"的主因，这次去掉）
    lav: "#E4DAE6",
    lav2: "#D5C9D9",
    lav3: "#C7BAD5",
    plum: "#A59AB8", // 立绘深紫灰 → 次级文字
    ink: "#202123", // ChatGPT 正文黑 → 主文字
    ink2: "#353740",
    gray: "#5B5B6B",
    // 深墨：右下那块楔形的颜色，也是整张海报的"锚"。
    // 取自立绘最深的线条色再压暗，带一点紫，不至于死黑。
    deep: "#1B1822",
    deep2: "#2A2434",
    // 强调色：藕紫（立绘自己的淡紫加深而来）。
    // 选"中调"而不是更亮/更暗，是因为它要同时出现在白底和深墨上：
    // 中调在两边都有 3.5:1 左右，一支色通吃两个区域，画面才不会花。
    // 小字分两档：白底用 mauveDeep（7.6:1），墨底用 mauveLight（9:1）。
    mauve: "#8A76A8", // 中调：花瓣标描边、标题后半、基准点、刻度、菱形
    mauveDeep: "#5F4B7A", // 白底小字与编号
    mauveLight: "#C9B8E0", // 墨底小字（竖排假名、页边字、署名）
    mauveSoft: "rgba(138,118,168, 0.20)",
    mauveFaint: "rgba(138,118,168, 0.34)",
    line: "rgba(32,33,35, 0.14)",
    lineSoft: "rgba(32,33,35, 0.08)",
    inkSoft: "rgba(32,33,35, 0.72)",
    inkFaint: "rgba(32,33,35, 0.58)",
}

/* --------------------------------------------------------------------------
   3. 装饰（位置全部写死，SSR / CSR 一致）
   -------------------------------------------------------------------------- */

/** 版心旁的小星芒：只落在"文字与人物之外"的空档（左栏 ≤46%、人物 51%~85%），
    这几个坐标都是按这三块区域核对过的，不会再压到文字上 */
const SPARKS = [
    { left: 48.6, top: 22.0, size: 14, o: 0.78, dur: 2.6, delay: 0.2, tone: C.mauve },
    { left: 49.4, top: 58.0, size: 11, o: 0.62, dur: 3.1, delay: 1.4, tone: C.lav3 },
    { left: 91.2, top: 6.2, size: 13, o: 0.7, dur: 2.8, delay: 0.7, tone: C.lav3 },
    { left: 93.4, top: 54.0, size: 15, o: 0.74, dur: 2.4, delay: 1.9, tone: C.mauveLight }, // 落在墨区
    { left: 24.5, top: 80.5, size: 12, o: 0.6, dur: 3.2, delay: 2.3, tone: C.lav3 },
    { left: 62.0, top: 83.0, size: 10, o: 0.55, dur: 2.9, delay: 1.1, tone: C.mauveLight }, // 落在墨区
    { left: 86.5, top: 79.5, size: 12, o: 0.64, dur: 2.7, delay: 0.5, tone: C.mauveLight }, // 落在墨区
    { left: 41.0, top: 6.4, size: 11, o: 0.6, dur: 3.0, delay: 1.7, tone: C.mauve },
]

/** 虚影的溶解遮罩：用 CSS mask 而不是盖一层纸色 ——
    背景是渐变，盖纸色会在深色区露出白块。纵向那层的 58%~80% 正好压在海报底边上
    （容器高宽与海报成比例，任何窗口下都对得上）。 */
const GHOST_MASK = [
    "linear-gradient(180deg, #000 0%, #000 58%, rgba(0,0,0,0.45) 70%, transparent 80%)",
    "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.4) 12%, #000 30%, #000 70%, rgba(0,0,0,0.4) 88%, transparent 100%)",
].join(", ")

/** 四角星路径（24×24） */
const STAR_PATH =
    "M12 0C12.7 6.7 17.3 11.3 24 12C17.3 12.7 12.7 17.3 12 24C11.3 17.3 6.7 12.7 0 12C6.7 11.3 11.3 6.7 12 0Z"

/** 斜轴的角度：色带、花瓣标、阶梯缩进三处共用，全图只有一个斜度 */
const AXIS_DEG = 9

/** 基准线上的刻度：每 5 格一根高刻度，位置写死 */
const TICKS = Array.from({ length: 26 }, (_, i) => ({ tall: i % 5 === 0 }))

/** 打字机文本：逐字包一层 span，由 GSAP 按序点亮 */
function TypeText({ text }: { text: string }) {
    return (
        <>
            {Array.from(text).map((ch, i) => (
                <span key={i} className="p-ch" style={{ display: "inline" }}>
                    {ch === " " ? "\u00A0" : ch}
                </span>
            ))}
        </>
    )
}

/* --------------------------------------------------------------------------
   4. 页面
   -------------------------------------------------------------------------- */
export default function GptPosterPage() {
    const posterRef = useRef<HTMLElement>(null)
    const figureRef = useRef<HTMLDivElement>(null)
    const ghostRef = useRef<HTMLDivElement>(null)
    const glowRef = useRef<HTMLDivElement>(null)
    const fontCssRef = useRef("")
    const introRef = useRef<gsap.core.Timeline | null>(null)
    const loopsRef = useRef<gsap.core.Tween[]>([])
    const quickRef = useRef<Record<string, (v: number) => void>>({})
    const [exporting, setExporting] = useState(false)
    const [tip, setTip] = useState("")

    /* ---------------- 入场 + 常驻动效 ----------------
       统一用 fromTo 写死首尾：from() 会把"当前值"当终点，dev 二次挂载时
       残留的行内样式会让动画变成 0→0，画面直接卡住。 */
    const play = useCallback(() => {
        const poster = posterRef.current
        if (!poster) return
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

        introRef.current?.kill()
        introRef.current = null
        loopsRef.current.forEach((t) => t.kill())
        loopsRef.current = []

        if (!reduced) {
            // 花瓣标的隐藏初态写在 JS 里（不写 JSX 内联）：见文件头注释
            gsap.set(".p-flower-svg", { clipPath: "inset(100% 0% 0% 0%)", WebkitClipPath: "inset(100% 0% 0% 0%)" })

            const tl = gsap.timeline({ defaults: { ease: "power3.out" } })
            // 场景顺序：底 → 几何（斜轴色带 + 花瓣标）→ 光 → 虚影 → 人 → 排版 → 页脚 → 星星
            tl.fromTo(".p-bg", { opacity: 0 }, { opacity: 1, duration: 0.9 }, 0)
                .fromTo(".p-flower-svg", { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.7, ease: "power2.out" }, 0.15)
                // 深墨从右边推进来（三点数一致，GSAP 能插值 clip-path polygon）
                .fromTo(".p-wedge", { clipPath: "polygon(100% 100%, 100% 22%, 100% 100%)" }, { clipPath: "polygon(50% 100%, 100% 22%, 100% 100%)", duration: 1.3, ease: "power3.inOut" }, 0.25)
                .fromTo(".p-glow", { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 1.7, ease: "power2.out" }, 0.4)
                .fromTo(".p-ghost", { opacity: 0, scale: 1.06 }, { opacity: 1, scale: 1, duration: 1.9, ease: "power2.out" }, 0.55)
                .fromTo(".p-figure", { opacity: 0, yPercent: 5 }, { opacity: 1, yPercent: 0, duration: 1.7 }, 0.75)
                // 顶栏与基准线：先给画面定出上下两条边
                .fromTo(".p-eyebrow", { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.6 }, 0.95)
                .fromTo(".p-rule-top", { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.9, ease: "power3.out" }, 0.95)
                .fromTo(".p-axis-rule", { scaleX: 0 }, { scaleX: 1, duration: 1, ease: "power3.out", transformOrigin: "left center" }, 1.05)
                .fromTo(".p-tick", { opacity: 0, scaleY: 0.2 }, { opacity: (i: number) => (TICKS[i]?.tall ? 0.62 : 0.4), scaleY: 1, duration: 0.4, stagger: 0.022, transformOrigin: "bottom center" }, 1.3)
                .fromTo(".p-axis-label", { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.6 }, 1.45)
                // 阶梯：每一级从左侧推进来，立面竖线随后长起来
                .fromTo(".p-step", { opacity: 0, x: -26 }, { opacity: 1, x: 0, duration: 0.8, stagger: 0.15 }, 1.15)
                .fromTo(".p-step-rule", { scaleY: 0 }, { scaleY: 1, duration: 0.6, ease: "power3.out", stagger: 0.15, transformOrigin: "top center" }, 1.3)
                .fromTo(".p-step-num", { opacity: 0 }, { opacity: 1, duration: 0.5, stagger: 0.15 }, 1.35)
                // 台词一字一字打出来
                .fromTo(".p-statement .p-ch", { opacity: 0 }, { opacity: 1, duration: 0.01, stagger: 0.055, ease: "none" }, 1.85)
                .fromTo(".p-caret", { opacity: 0 }, { opacity: 1, duration: 0.2 }, 1.85)
                .fromTo(".p-notes > span", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.1 }, 2.4)
                // 引言（全篇唯一的衬线）
                .fromTo(".p-quote-mark", { opacity: 0, scale: 0.5, y: 10 }, { opacity: 0.55, scale: 1, y: 0, duration: 0.7, ease: "back.out(2)" }, 2.5)
                .fromTo(".p-quote-line", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.75 }, 2.6)
                .fromTo(".p-quote-by", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6 }, 2.85)
                // 右上：花瓣标 + 外圈扩散 + 假名
                .fromTo(".p-mark-box", { opacity: 0, scale: 0.55, rotation: -40 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.85, ease: "back.out(2)" }, 1.4)
                .fromTo(".p-ripple", { scale: 0.7, opacity: 0.7 }, { scale: 1.4, opacity: 0, duration: 1.5, ease: "power1.out" }, 1.6)
                .fromTo(".p-kana", { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.8 }, 1.85)
                // 页脚与页边
                .fromTo(".p-rule-bottom", { scaleX: 0 }, { scaleX: 1, duration: 0.9, transformOrigin: "left center" }, 2.2)
                .fromTo(".p-meta-row", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08 }, 2.3)
                .fromTo(".p-credit", { opacity: 0 }, { opacity: 1, duration: 0.8 }, 2.6)
                .fromTo(".p-edge", { opacity: 0 }, { opacity: 1, duration: 1.1 }, 2.5)
                .fromTo(".p-spark", { opacity: 0, scale: 0.2, rotation: -50 }, { opacity: (i: number) => SPARKS[i]?.o ?? 0.7, scale: 1, rotation: 0, duration: 0.8, ease: "back.out(2.2)", stagger: 0.07 }, 1.5)
            introRef.current = tl
        }

        /* 常驻循环：柔光呼吸 + 人物浮空 + 虚影漂移 + 花瓣标呼吸 + 外圈扩散 + 刻度跳动 + 星星闪烁 */
        const push = (t: gsap.core.Tween) => loopsRef.current.push(t)
        push(gsap.to(".p-glow", { opacity: 0.8, scale: 1.05, duration: 5.6, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3 }))
        push(gsap.to(".p-figure-inner", { y: -9, duration: 8, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3.2 }))
        push(gsap.to(".p-ghost img", { y: -8, duration: 13, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3.4 }))
        push(gsap.to(".p-ghost", { opacity: 0.78, duration: 8.2, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3.6 }))
        // 花瓣标描边自己不转（旋转留给别的海报），只做极慢的呼吸
        push(gsap.to(".p-flower-svg", { opacity: 0.7, scale: 1.035, duration: 9.5, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3.2 }))
        // 深墨极慢地左右呼吸，画面才不像一张静止的图
        push(gsap.to(".p-wedge", { x: 16, duration: 24, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 4 }))
        // 语音模式式的外圈：一圈一圈扩散
        push(gsap.fromTo(".p-ripple", { scale: 0.84, opacity: 0.5 }, { scale: 1.42, opacity: 0, duration: 3.2, repeat: -1, ease: "power1.out", repeatDelay: 1.1, delay: 3.6, transformOrigin: "50% 50%" }))
        push(gsap.to(".p-mark-flower", { scale: 1.07, duration: 2.7, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3.4 }))
        // 规格行的绿色编号依次亮一下，像仪表在读数
        push(gsap.to(".p-meta-num", { opacity: 0.22, duration: 1.15, repeat: -1, yoyo: true, ease: "sine.inOut", stagger: { each: 0.3, from: "start" }, delay: 3.8 }))
        // 基准线刻度逐格跳一下，像在"运行中"
        push(gsap.to(".p-tick", { opacity: 0.14, scaleY: 0.55, duration: 0.95, repeat: -1, yoyo: true, ease: "sine.inOut", stagger: { each: 0.075, from: "start" }, delay: 3.6, transformOrigin: "bottom center" }))
        // 台阶编号依次亮
        push(gsap.to(".p-step-num", { opacity: 0.25, duration: 1.4, repeat: -1, yoyo: true, ease: "sine.inOut", stagger: { each: 0.22, from: "start" }, delay: 3.9 }))
        // 版心旁的小星芒
        poster.querySelectorAll<HTMLElement>(".p-spark").forEach((el, i) => {
            const s = SPARKS[i]
            if (!s) return
            push(gsap.to(el, { opacity: s.o * 0.2, scale: 0.55, rotation: i % 2 ? 30 : -30, duration: s.dur, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3 + s.delay }))
        })
    }, [])

    useEffect(() => {
        play()
        return () => {
            introRef.current?.kill()
            introRef.current = null
            loopsRef.current.forEach((t) => t.kill())
            loopsRef.current = []
        }
    }, [play])

    /* ---------------- 鼠标视差 ---------------- */
    useEffect(() => {
        const figure = figureRef.current
        const ghost = ghostRef.current
        const glow = glowRef.current
        if (!figure || !ghost || !glow) return
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

        quickRef.current = {
            fx: gsap.quickTo(figure, "x", { duration: 1.1, ease: "power3" }),
            gx: gsap.quickTo(ghost, "x", { duration: 1.6, ease: "power3" }),
            lx: gsap.quickTo(glow, "x", { duration: 1.4, ease: "power3" }),
            ly: gsap.quickTo(glow, "y", { duration: 1.4, ease: "power3" }),
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
    }

    const onPointerLeave = () => {
        const q = quickRef.current
        q.fx?.(0)
        q.gx?.(0)
        q.lx?.(0)
        q.ly?.(0)
    }

    /* ---------------- 导出海报（2 倍图） ----------------
       高度由 PosterShell 保证：海报正好一屏，导出高度 = 当前显示器高度。 */
    const exportPng = async () => {
        const poster = posterRef.current
        if (!poster || exporting) return
        setExporting(true)
        setTip("正在合成…")
        gsap.set([figureRef.current, ghostRef.current, glowRef.current], { x: 0, y: 0 })
        gsap.set(ghostRef.current, { opacity: 1 })
        gsap.set(poster.querySelector(".p-ghost img"), { y: 0 })
        // 入场时间轴推到终态：否则动画没跑完就点导出，文字还停在 opacity 0，成图会缺内容
        introRef.current?.progress(1)
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
            a.download = `chatgpt-poster-${Date.now()}.png`
            a.click()
            setTip("已保存 2 倍高清图")
        } catch (err) {
            console.error("[chatgpt-poster] 导出失败:", err)
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
            className={`${POSTER_SHELL} overflow-hidden bg-[#FDFDFE] text-[#202123] selection:bg-[#8A76A8]/30`}
        >

            {/* ============================ 海报本体（导出对象） ============================ */}
            <section ref={posterRef} className={POSTER_SURFACE}>
                {/* 底色：近白 → 淡紫的柔和渐变（立绘主色），全靠渐变堆层次，不用网点 */}
                <div className="p-bg absolute inset-0 bg-[linear-gradient(168deg,#FDFDFE_0%,#F8F8FB_18%,#F3F3F7_36%,#EEEEF3_54%,#E9E9EF_72%,#E4E4EB_88%,#DFDFE7_100%)]" />

                {/* 斜轴装置之一：出血在左上角的巨型花瓣标「描边」。
                    它是线不是面 —— 压在阶梯文字下面不会打架，替代了原来那行巨型水印字。
                    外层的 9° 旋转用内联 transform，内层只负责裁切动画，两者互不干扰。 */}
                <div
                    className="p-flower pointer-events-none absolute left-[-15%] top-[-18%] aspect-square h-[88%] opacity-[0.42]"
                    style={{ transform: `rotate(${AXIS_DEG}deg)` }}
                >
                    <svg viewBox="0 0 24 24" className="p-flower-svg h-full w-full" fill="none" aria-hidden>
                        <path d={OPENAI_PATH} stroke={C.mauve} strokeWidth={0.08} strokeLinejoin="round" />
                    </svg>
                </div>

                {/* 整张海报的"价值锚"：右下角一整块深墨楔形。
                    用 clip-path polygon 画而不是旋转一个方块 —— 三个顶点都是百分比，
                    任何窗口都严格对齐；入场只动第一个顶点的 x（100% → 50%），
                    深墨就像从右边推过来。

                    它存在的理由：人物是近白的，浅底上"谁都不比谁暗"，
                    这种底上换什么强调色都是糊的。让她跨在这条 41° 的边界上 ——
                    白底那边靠线稿读，墨底那边她的亮部自己发光。

                    维护注意：墨区覆盖到的元素一律用浅色（假名 / 页边字 / 署名 / 三个星芒），
                    页脚那条细线用渐变跨过去。改颜色时别漏。 */}
                <div
                    className="p-wedge pointer-events-none absolute inset-0"
                    style={{
                        clipPath: "polygon(50% 100%, 100% 22%, 100% 100%)",
                        background: `linear-gradient(150deg, ${C.deep2} 0%, ${C.deep} 46%, #14111A 100%)`,
                    }}
                />

                {/* 角色背后的"AI 光"：藕紫 + 一团提亮的白（墨底上那团白就是她的辉光） */}
                <div ref={glowRef} className="p-glow pointer-events-none absolute inset-0">
                    <div
                        className="absolute left-[70%] top-[20%] h-[70%] w-[46%] -translate-x-1/2"
                        style={{ background: `radial-gradient(closest-side, ${C.mauveSoft} 0%, rgba(206,190,230,0.26) 42%, transparent 76%)` }}
                    />
                    <div
                        className="absolute left-[66%] top-[36%] h-[50%] w-[30%]"
                        style={{ background: `radial-gradient(closest-side, rgba(255,255,255,0.5), rgba(255,255,255,0.22) 46%, transparent 78%)` }}
                    />
                </div>

                {/* 冷调暗角 */}
                <div
                    className="pointer-events-none absolute inset-0"
                    style={{ background: `radial-gradient(124% 80% at 50% 44%, transparent 46%, rgba(74,60,88,0.10) 100%)` }}
                />

                {/* 人物虚影：放大、半透明、multiply 混合 —— 立绘近白，白衣服几乎消失、
                    淡紫的线条留下一层很淡的印痕。比主体更大更高，并且偏在主体左侧。 */}
                <div ref={ghostRef} className="p-ghost pointer-events-none absolute inset-0">
                    <div
                        className="absolute left-[50%] top-[9%] h-[113%] -translate-x-1/2 opacity-25 mix-blend-multiply"
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

                {/* 立绘：靠右，脚落在画面底边上（不裁脚） */}
                <div ref={figureRef} className="p-figure pointer-events-none absolute inset-0">
                    <div className="p-figure-inner absolute bottom-0 left-[68%] h-[88%] -translate-x-1/2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={FIGURE_SRC}
                            alt="ChatGPT 娘化立绘"
                            className="h-full w-auto max-w-none object-contain"
                            style={{ filter: `drop-shadow(0 12px 34px rgba(20,17,26,0.30)) drop-shadow(0 0 60px rgba(206,190,230,0.30))` }}
                        />
                    </div>
                </div>

                {/* ================= 顶部一行：品类小字 + 编号，给画面一条上边缘 ================= */}
                <div className="p-eyebrow absolute inset-x-[3.4%] top-[3%] z-10 flex items-baseline justify-between gap-4">
                    <span className="flex items-baseline gap-3">
                        <span className="text-[10px] font-medium tracking-[.46em]" style={{ color: C.inkSoft }}>
                            {COPY.eyebrow}
                        </span>
                        <span className="font-mono text-[10px]" style={{ color: C.mauveDeep }}>
                            {COPY.series}
                        </span>
                    </span>
                    <span className="font-mono text-[9px] tracking-[.22em]" style={{ color: C.inkFaint }}>
                        NO.003-K
                    </span>
                </div>

                {/* ================= 斜轴装置之三：阶梯排版 =================
                    五级依次右缩，每级左侧的"编号 + 竖线"连成阶梯的立面。
                    整块是普通文档流（不是绝对定位），所以引言永远紧贴在阶梯下面，
                    任何窗口尺寸下都不会漏出一段空白。 */}
                <div className="p-steps absolute left-[6%] top-[17.5%] z-10 flex w-[46%] flex-col gap-[clamp(14px,2.2vh,28px)]">
                    {/* 01 拉丁名 */}
                    <div className="p-step" style={{ marginLeft: 0 }}>
                        <StepFace num={STEPS[0].num} rule={STEPS[0].rule}>
                            <span className="p-latin-step block text-[9.5px] tracking-[.52em]" style={{ color: C.inkFaint }}>
                                {COPY.latin}
                            </span>
                        </StepFace>
                    </div>

                    {/* 02 标题：Chat 墨黑 + GPT 藕紫 */}
                    <div className="p-step" style={{ marginLeft: "5.5%" }}>
                        <StepFace num={STEPS[1].num} rule={STEPS[1].rule}>
                            <span className="block whitespace-nowrap text-[clamp(38px,9.2vw,190px)] font-black leading-[.88] tracking-[-.05em]">
                                <span style={{ color: C.ink }}>{COPY.titleA}</span>
                                <span style={{ color: C.mauve }}>{COPY.titleB}</span>
                            </span>
                        </StepFace>
                    </div>

                    {/* 03 招牌动效：台词一个字一个字打出来 */}
                    <div className="p-step" style={{ marginLeft: "11%" }}>
                        <StepFace num={STEPS[2].num} rule={STEPS[2].rule}>
                            <p className="p-statement flex items-baseline text-[clamp(16px,1.9vw,32px)] font-medium leading-[1.3] tracking-[-.01em]" style={{ color: C.ink2 }}>
                                <TypeText text={COPY.statement} />
                                <span className="p-caret gpt-caret ml-1 inline-block h-[1em] w-[3px] translate-y-[3px]" style={{ background: C.mauveDeep }} />
                            </p>
                        </StepFace>
                    </div>

                    {/* 04 正文 */}
                    <div className="p-step" style={{ marginLeft: "16.5%" }}>
                        <StepFace num={STEPS[3].num} rule={STEPS[3].rule}>
                            <p className="max-w-[30ch] text-[clamp(11px,1.02vw,15px)] leading-[1.75]" style={{ color: C.gray }}>
                                {COPY.copy}
                            </p>
                        </StepFace>
                    </div>

                    {/* 05 小注一行 */}
                    <div className="p-step" style={{ marginLeft: "22%" }}>
                        <StepFace num={STEPS[4].num} rule={STEPS[4].rule}>
                            <div className="p-notes flex flex-wrap items-center gap-x-3.5 gap-y-2 text-[10.5px] tracking-[.18em]" style={{ color: C.inkSoft }}>
                                {COPY.notes.map((n, i) => (
                                    <span key={n} className="flex items-center gap-3.5">
                                        {i > 0 && <span className="h-[6px] w-[6px] rotate-45" style={{ background: C.mauve, opacity: 0.75 }} />}
                                        {n}
                                    </span>
                                ))}
                            </div>
                        </StepFace>
                    </div>

                    {/* 阶梯之后：全篇唯一的衬线引言，跟着阶梯走，不留空段 */}
                    <div className="p-quote ml-[22%] mt-[clamp(10px,1.6vh,26px)] max-w-[27ch]">
                        <span className="p-quote-mark block font-serif text-[clamp(26px,3vw,50px)] leading-[.55]" style={{ color: C.mauve, opacity: 0.55 }}>
                            &ldquo;
                        </span>
                        <p className="p-quote-line mt-3 font-serif text-[clamp(14px,1.42vw,24px)] font-medium leading-[1.6] tracking-[-.01em]" style={{ color: C.ink2 }}>
                            {COPY.quote}
                        </p>
                        <p className="p-quote-by mt-3 text-[10.5px] tracking-[.2em]" style={{ color: C.gray }}>
                            {COPY.quoteBy}
                        </p>
                    </div>
                </div>

                {/* ================= 左下：基准线（一条贯穿左半版的量尺，从人物身前收住） =================
                    只画到 x=47.4% —— 再往右就是立绘，线穿过去会变成"人物腰上有一条黑线"。 */}
                <div className="p-axis absolute bottom-[13.5%] left-[3.4%] w-[44%] z-10">
                    <div className="flex items-center gap-2.5">
                        <span className="h-[7px] w-[7px] shrink-0" style={{ background: C.mauve }} />
                        <span className="p-axis-label font-mono text-[8.5px] tracking-[.3em]" style={{ color: C.inkFaint }}>
                            {COPY.axis} · 003
                        </span>
                        <span className="p-axis-rule block h-px flex-1 origin-left" style={{ background: `linear-gradient(90deg, ${C.line}, rgba(32,33,35,0.04))` }} />
                    </div>
                    <div className="mt-[6px] flex items-end gap-[clamp(4px,0.42vw,7px)]">
                        {TICKS.map((t, i) => (
                            <span
                                key={i}
                                className="p-tick block w-px"
                                style={{
                                    height: t.tall ? "clamp(7px,0.95vh,10px)" : "clamp(3px,0.42vh,5px)",
                                    background: t.tall ? C.mauve : C.lav3,
                                    opacity: t.tall ? 0.62 : 0.4,
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* ================= 右上：官方花瓣标 + 扩散外圈 + 竖排假名 ================= */}
                <div className="absolute right-[3.4%] top-[20%] z-10 flex flex-col items-end gap-4">
                    <div
                        className="p-mark-box relative grid h-[clamp(54px,6.2vw,100px)] w-[clamp(54px,6.2vw,100px)] place-items-center rounded-full border"
                        style={{ borderColor: C.mauveFaint, background: "rgba(255,255,255,0.86)" }}
                    >
                        <span className="p-ripple absolute inset-[-6%] rounded-full border" style={{ borderColor: C.mauveFaint }} />
                        <svg viewBox="0 0 24 24" className="p-mark-flower h-[54%] w-[54%]" fill={C.ink} aria-hidden>
                            <path d={OPENAI_PATH} />
                        </svg>
                    </div>
                    <span className="p-kana text-[10px] tracking-[.26em]" style={{ writingMode: "vertical-rl", color: C.mauveLight }}>
                        {COPY.kana}
                    </span>
                </div>

                {/* ================= 页脚 ================= */}
                <div className="absolute inset-x-[3.4%] bottom-[3.5%] z-10">
                    <span className="p-rule-bottom block h-px w-full origin-left" style={{ background: `linear-gradient(90deg, ${C.line} 0%, ${C.line} 46%, rgba(201,184,224,0.34) 56%, rgba(201,184,224,0.20) 100%)` }} />
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div className="flex flex-wrap gap-x-7 gap-y-2">
                            {META.map(([k, v], i) => (
                                <span key={k} className="p-meta-row flex items-baseline gap-2">
                                    <span className="p-meta-num font-mono text-[9px]" style={{ color: C.mauveDeep }}>
                                        {String(i + 1).padStart(2, "0")}
                                    </span>
                                    <span className="text-[9px] tracking-[.24em]" style={{ color: C.inkFaint }}>
                                        {k}
                                    </span>
                                    <span className="font-mono text-[11px]" style={{ color: C.inkSoft }}>
                                        {v}
                                    </span>
                                </span>
                            ))}
                        </div>
                        <span className="p-credit font-mono text-[9px] tracking-[.26em]" style={{ color: C.mauveLight }}>
                            {COPY.credit}
                        </span>
                    </div>
                </div>

                {/* 顶部中间：把品类小字与编号连起来的一条渐隐细线 */}
                <span className="p-rule-top absolute left-[50%] top-[4.6%] h-px w-[20%] origin-center -translate-x-1/2" style={{ background: `linear-gradient(90deg, transparent, ${C.line}, transparent)` }} />

                {/* 右页边：微缩字，兼作一条竖向纹样（文字本身就是纹样） */}
                <div className="p-edge pointer-events-none absolute bottom-[12%] right-[1.6%] z-10 hidden sm:block">
                    <span className="text-[11px] tracking-[.34em]" style={{ writingMode: "vertical-rl", color: C.mauveLight }}>
                        {`${COPY.titleA}${COPY.titleB} · ANTHRO ${COPY.series} · 2026.10 · `}
                    </span>
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
                    {tip && <span className="text-[11px]" style={{ color: C.gray }}>{tip}</span>}
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

/* --------------------------------------------------------------------------
   5. 阶梯的"立面"：编号 + 竖线 + 内容
   -------------------------------------------------------------------------- */
function StepFace({ num, rule, children }: { num: string; rule: string; children: React.ReactNode }) {
    return (
        <div className="flex items-start gap-[clamp(8px,0.9vw,16px)]">
            <span className="flex shrink-0 flex-col items-center gap-[5px]">
                <span className="p-step-num font-mono text-[8px] leading-none" style={{ color: C.mauveFaint }}>
                    {num}
                </span>
                <span className="p-step-rule w-px origin-top" style={{ height: rule, background: C.line }} />
            </span>
            <div className="min-w-0">{children}</div>
        </div>
    )
}
