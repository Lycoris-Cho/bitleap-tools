"use client"

/* ==========================================================================
   Z.ai 娘 · 娘化人物海报（系列第四张 · 第二版）
   --------------------------------------------------------------------------
   第一版有两处硬伤，这一版针对性重做：
     1) 背景没按人物主色走 —— 立绘是深色角色（深石墨紫灰约占 40%），
        第一版却拿它的近白做了浅底。现在整条渐变取立绘最主要的色阶：
        #0E0C12 → #16141B → #1B1820 → #221E28 → #2A2530 → #332D38 → #3C3544。
     2) 标题压住了人物头部 —— 现在人物在左、所有文字在右（x ≥ 36%），
        人物头部固定在 x 15%~23%，中间留 13% 空档，永不相碰。
   另外把排版语言换掉（原来和 ChatGPT 那张太像）：
   这一张走「蓝图 / 规格表」—— 宽字距技术型字标、贯穿全宽的表格线、
   图纸标注式尺寸线，而不是粗黑字加荧光笔。

   素材：public/image/Z.ai.png（透明底立绘，1632×2752）
   官方图标：Z.ai 官方 logo 几何（圆角方形 + Z 平行四边形），取自官方 logo.svg
   ========================================================================== */

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react"
import { gsap } from "gsap"
import { Download } from "lucide-react"
import { getFontEmbedCSS, toPng } from "html-to-image"
import { Breadcrumb } from "@/components/breadcrumb"
import { POSTER_OVERLAY, POSTER_SHELL, POSTER_SURFACE } from "@/components/PosterShell"

/* --------------------------------------------------------------------------
   1. 素材与文案
   -------------------------------------------------------------------------- */
const FIGURE_SRC = "/image/Z.ai.png"

/** Z.ai 官方 logo：圆角方形 + Z 平行四边形（30×30 视图盒） */
const ZAI_SQUARE =
    "M24.51,28.51H5.49c-2.21,0-4-1.79-4-4V5.49c0-2.21,1.79-4,4-4h19.03c2.21,0,4,1.79,4,4v19.03C28.51,26.72,26.72,28.51,24.51,28.51z"
const ZAI_Z = "24.3,7.1 13.14,22.91 5.7,22.91 16.86,7.1"

const COPY = {
    title: "Z.ai",
    sub: "智谱 GLM",
    watermark: "GLM",
    eyebrow: "ANTHROPOMORPHISM",
    series: "004",
    statement: "把复杂的问题，拆开算清楚。",
    copy: "参数、上下文、推理步数——它不猜，它算。",
    notes: ["算得清", "答得准", "一直在"],
    dimLabel: "1632 × 2752", // 图纸标注：直接标立绘的画幅尺寸
    kana: "ジーエーアイ",
    credit: "BitLeap 海报合成",
}

const META: [string, string][] = [
    ["MODEL", "GLM / 娘"],
    ["SERIES", "ANTHRO / 004"],
    ["RENDER", "2026.10"],
]

/** 底栏宽表格：横向铺满、行间细线分隔（规格表的样子） */
const TABLE: [string, string, string][] = [
    ["01", "画幅", "1632 × 2752"],
    ["02", "主色", "GRAPHITE 40%"],
    ["03", "强调", "CYAN"],
]

/* --------------------------------------------------------------------------
   2. 设计 token —— 底色与文字全部取自立绘采样：深石墨系为底、近白为字
   -------------------------------------------------------------------------- */
const C = {
    inkDeep: "#0E0C12", // 比立绘最深再压一档 → 渐变起点与导出底色
    ink: "#16141B", // 立绘最深色
    ink2: "#1E1A23",
    graphite: "#27232C", // 立绘石墨
    graphite2: "#302A36",
    slate: "#3A3342", // 立绘灰
    slate2: "#494656",
    paper: "#FAF4F7", // 立绘近白 → 主文字
    paperSoft: "rgba(250,244,247, 0.66)",
    paperFaint: "rgba(250,244,247, 0.42)",
    line: "rgba(250,244,247, 0.20)",
    lineSoft: "rgba(250,244,247, 0.10)",
    accent: "#2ED3DF", // 冷青：唯一强调色（与前三张的蓝/珊瑚/绿都不同）
    accentFaint: "rgba(46,211,223, 0.32)",
}

/* --------------------------------------------------------------------------
   3. 装饰（位置写死，SSR / CSR 一致）
   -------------------------------------------------------------------------- */
const STAR_PATH =
    "M12 0C12.7 6.7 17.3 11.3 24 12C17.3 12.7 12.7 17.3 12 24C11.3 17.3 6.7 12.7 0 12C6.7 11.3 11.3 6.7 12 0Z"

/** 蓝图十字标：图纸上的对位记号 */
const CROSSES = [
    { left: 35.5, top: 20.0, size: 13 },
    { left: 96.2, top: 44.0, size: 11 },
    { left: 35.5, top: 68.0, size: 12 },
    { left: 62.0, top: 6.2, size: 10 },
]

/** 底部波形条：一排高低不等的竖条做出数据感 */
const BARS = [38, 62, 47, 78, 55, 90, 66, 100, 72, 84, 58, 44]

/** 虚影的溶解遮罩：CSS mask（背景是渐变，盖纯色会露色块） */
const GHOST_MASK = [
    "linear-gradient(180deg, #000 0%, #000 54%, rgba(0,0,0,0.45) 68%, transparent 79%)",
    "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.4) 12%, #000 30%, #000 70%, rgba(0,0,0,0.4) 88%, transparent 100%)",
].join(", ")

/* --------------------------------------------------------------------------
   4. 页面
   -------------------------------------------------------------------------- */
export default function ZaiPosterPage() {
    const posterRef = useRef<HTMLElement>(null)
    const figureRef = useRef<HTMLDivElement>(null)
    const ghostRef = useRef<HTMLDivElement>(null)
    const glowRef = useRef<HTMLDivElement>(null)
    const odometerRef = useRef<HTMLSpanElement>(null)
    const dimRef = useRef<HTMLSpanElement>(null)
    const fontCssRef = useRef("")
    const introRef = useRef<gsap.core.Timeline | null>(null)
    const loopsRef = useRef<gsap.core.Tween[]>([])
    const quickRef = useRef<Record<string, (v: number) => void>>({})
    const [exporting, setExporting] = useState(false)
    const [tip, setTip] = useState("")

    /* ---------------- 入场 + 常驻动效 ----------------
       一律 fromTo 写死首尾：from() 会把"当前值"当终点，dev 二次挂载时
       残留的行内样式会让动画变成 0→0，画面直接卡住。 */
    const play = useCallback(() => {
        if (!posterRef.current) return
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

        introRef.current?.kill()
        introRef.current = null
        loopsRef.current.forEach((t) => t.kill())
        loopsRef.current = []

        if (!reduced) {
            const tl = gsap.timeline({ defaults: { ease: "power3.out" } })
            tl.fromTo(".p-bg", { opacity: 0 }, { opacity: 1, duration: 1 }, 0)
                .fromTo(".p-glow", { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 1.7, ease: "power2.out" }, 0.1)
                .fromTo(".p-watermark", { opacity: 0, x: 44 }, { opacity: 1, x: 0, duration: 2, ease: "power2.out" }, 0.2)
                // 深底上人物是深色，虚影改用 screen 做成"光的回声"
                .fromTo(".p-ghost", { opacity: 0, scale: 1.07 }, { opacity: 1, scale: 1, duration: 2.1, ease: "power2.out" }, 0.3)
                .fromTo(".p-figure", { opacity: 0, xPercent: -5 }, { opacity: 1, xPercent: 0, duration: 1.8, ease: "power2.out" }, 0.55)
                // 图纸语言：先画线，再落字
                .fromTo(".p-rule", { scaleX: 0 }, { scaleX: 1, duration: 0.8, stagger: 0.1, ease: "power3.out", transformOrigin: "left center" }, 0.9)
                .fromTo(".p-rule-v", { scaleY: 0 }, { scaleY: 1, duration: 0.9, stagger: 0.12, ease: "power3.out", transformOrigin: "top center" }, 0.95)
                .fromTo(".p-cross", { opacity: 0, scale: 0.3, rotation: -40 }, { opacity: 0.5, scale: 1, rotation: 0, duration: 0.7, ease: "back.out(2)", stagger: 0.08 }, 1.2)
                // 官方标 + 技术型字标
                .fromTo(".p-mark-box", { opacity: 0, scale: 0.55, rotation: -14 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.7, ease: "back.out(2)" }, 1.15)
                .fromTo(".p-mark-z", { opacity: 0, scale: 0.3, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(2.4)" }, 1.4)
                .fromTo(".p-title", { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.95, ease: "power4.out" }, 1.3)
                .fromTo(".p-sub", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6 }, 1.55)
                .fromTo(".p-eyebrow", { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.6 }, 1.05)
                // 台词 / 正文 / 小注
                .fromTo(".p-statement", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.85 }, 1.7)
                .fromTo(".p-statement-mark", { scaleX: 0 }, { scaleX: 1, duration: 0.55, ease: "power3.out", transformOrigin: "left center" }, 2.0)
                .fromTo(".p-copy", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7 }, 1.95)
                .fromTo(".p-notes > span", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.09 }, 2.15)
                // 底栏表格逐行落位 + 波形条长出来
                .fromTo(".p-table-row", { opacity: 0, x: -18 }, { opacity: 1, x: 0, duration: 0.55, stagger: 0.1 }, 1.9)
                .fromTo(".p-bar", { scaleY: 0, transformOrigin: "bottom center" }, { scaleY: 1, duration: 0.6, stagger: 0.04, ease: "power2.out" }, 1.7)
                .fromTo(".p-spark", { opacity: 0, scale: 0.2, rotation: -50 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.8, ease: "back.out(2.2)", stagger: 0.09 }, 1.5)
                // 图纸标注：尺寸线先画，数字再"量"出来
                .fromTo(".p-dim-line", { scaleY: 0 }, { scaleY: 1, duration: 0.8, ease: "power3.out", transformOrigin: "top center" }, 1.6)
                .fromTo(".p-dim-cap", { scaleX: 0 }, { scaleX: 1, duration: 0.3, ease: "power2.out", transformOrigin: "center", stagger: 0.12 }, 2.3)
                .fromTo(".p-dim-label", { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.6 }, 2.5)
                .fromTo(".p-kana", { opacity: 0, y: -14 }, { opacity: 1, y: 0, duration: 0.7 }, 2.55)
                .fromTo(".p-credit", { opacity: 0 }, { opacity: 1, duration: 0.8 }, 2.6)
                .fromTo(".p-edge", { opacity: 0 }, { opacity: 1, duration: 1 }, 2.3)

            // 两个数字用"计数器"滚上去。注意直接写 DOM：用 React state 会每帧重渲染；
            // 而箭头函数里也不能用 this.targets()（模块作用域下 this 是 undefined，会直接抛错）。
            const od = { v: 0 }
            const dim = { v: 0 }
            tl.to(od, {
                v: 4,
                duration: 1.1,
                ease: "power2.out",
                onUpdate: () => {
                    if (odometerRef.current) odometerRef.current.textContent = String(Math.round(od.v)).padStart(3, "0")
                },
            }, 2.0)
            tl.to(dim, {
                v: 1632,
                duration: 1,
                ease: "power2.out",
                onUpdate: () => {
                    if (dimRef.current) dimRef.current.textContent = `${Math.round(dim.v)} × 2752`
                },
            }, 2.4)
            introRef.current = tl
        }

        /* 常驻循环：光呼吸 + 人物浮空 + 虚影漂移 + 波形条跳动 + 强调点脉动 + 十字慢转 */
        const push = (t: gsap.core.Tween) => loopsRef.current.push(t)
        push(gsap.to(".p-glow", { opacity: 0.76, scale: 1.06, duration: 5.2, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 2.8 }))
        push(gsap.to(".p-figure-inner", { y: -8, duration: 8.2, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3 }))
        push(gsap.to(".p-ghost img", { y: -5, duration: 12, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3.2 }))
        push(gsap.to(".p-ghost", { opacity: 0.7, duration: 7.6, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3.4 }))
        push(gsap.to(".p-watermark", { x: 36, duration: 22, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3.6 }))
        push(gsap.to(".p-bar", { scaleY: 0.45, duration: 1.35, repeat: -1, yoyo: true, ease: "sine.inOut", stagger: { each: 0.07, from: "random" }, delay: 3.2, transformOrigin: "bottom center" }))
        push(gsap.to(".p-accent-dot", { scale: 1.6, opacity: 0.55, duration: 1.7, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3.2 }))
        push(gsap.fromTo(".p-accent-ring", { scale: 0.86, opacity: 0.45 }, { scale: 1.22, opacity: 0, duration: 3.4, repeat: -1, ease: "power1.out", repeatDelay: 1.2, delay: 3.4, transformOrigin: "50% 50%" }))
        push(gsap.to(".p-dim-cap", { scaleX: 0.6, duration: 1.6, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3.8 }))
        posterRef.current.querySelectorAll<HTMLElement>(".p-cross").forEach((el, i) => {
            push(gsap.to(el, { rotation: i % 2 ? 90 : -90, duration: 26 + i * 5, repeat: -1, ease: "none", delay: 3 }))
        })
        posterRef.current.querySelectorAll<HTMLElement>(".p-spark").forEach((el, i) => {
            push(gsap.to(el, { opacity: 0.15, scale: 0.55, rotation: i % 2 ? 30 : -30, duration: 2.6 + (i % 3) * 0.6, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3 + i * 0.3 }))
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
        q.fx?.(px * -14)
        q.gx?.(px * -26) // 虚影走得比主体多，纵深就出来了
        q.lx?.(px * 12)
        q.ly?.(py * 9)
    }

    const onPointerLeave = () => {
        const q = quickRef.current
        q.fx?.(0)
        q.gx?.(0)
        q.lx?.(0)
        q.ly?.(0)
    }

    /* ---------------- 导出海报（2 倍图） ----------------
       高度由 PosterShell 保证：海报正好一屏 ⇒ 导出高度 = 当前显示器高度。 */
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
        if (odometerRef.current) odometerRef.current.textContent = COPY.series
        if (dimRef.current) dimRef.current.textContent = COPY.dimLabel
        try {
            if (!fontCssRef.current) fontCssRef.current = await getFontEmbedCSS(poster)
            const rect = poster.getBoundingClientRect()
            const ratio = Math.min(2, 2600 / Math.max(1, rect.width))
            const dataUrl = await toPng(poster, {
                pixelRatio: ratio,
                cacheBust: true,
                backgroundColor: C.inkDeep,
                fontEmbedCSS: fontCssRef.current,
            })
            const a = document.createElement("a")
            a.href = dataUrl
            a.download = `zai-poster-${Date.now()}.png`
            a.click()
            setTip("已保存 2 倍高清图")
        } catch (err) {
            console.error("[zai-poster] 导出失败:", err)
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
            className={`${POSTER_SHELL} overflow-hidden bg-[#0E0C12] text-[#FAF4F7] selection:bg-[#2ED3DF]/30`}
        >
            {/* ============================ 海报本体（导出对象） ============================ */}
            <section ref={posterRef} className={POSTER_SURFACE}>
                {/* 底色：完全取自立绘最主要的深石墨色阶 */}
                <div className="p-bg absolute inset-0 bg-[linear-gradient(158deg,#0E0C12_0%,#16141B_16%,#1B1820_32%,#221E28_48%,#2A2530_64%,#332D38_80%,#3C3544_92%,#443D4C_100%)]" />

                {/* 人物背后的冷青光：暗底上是它在托住深色人物 */}
                <div ref={glowRef} className="p-glow pointer-events-none absolute inset-0">
                    <div
                        className="absolute left-[-4%] top-[10%] h-[86%] w-[52%]"
                        style={{ background: `radial-gradient(closest-side, rgba(46,211,223,0.26) 0%, rgba(46,211,223,0.10) 42%, transparent 76%)` }}
                    />
                    <div
                        className="absolute left-1/2 top-[24%] h-[62%] w-[40%] -translate-x-1/2"
                        style={{ background: `radial-gradient(closest-side, rgba(255,255,255,0.16), rgba(255,255,255,0.06) 46%, transparent 78%)` }}
                    />
                </div>

                {/* 暗角 */}
                <div
                    className="pointer-events-none absolute inset-0"
                    style={{ background: `radial-gradient(124% 80% at 40% 46%, transparent 42%, rgba(6,5,9,0.55) 100%)` }}
                />

                {/* 巨型水印：型号 GLM，压在右侧底图 */}
                <div className="p-watermark pointer-events-none absolute right-[-3%] top-[10%] select-none">
                    <span
                        className="block whitespace-nowrap text-[clamp(110px,20vw,380px)] font-black leading-[.82] tracking-[-.06em]"
                        style={{ color: "rgba(250,244,247,0.055)" }}
                    >
                        {COPY.watermark}
                    </span>
                </div>

                {/* 人物虚影：比主体更大更高、整体右移。深底上正片叠底会看不见，
                    所以用 screen —— 立绘里的浅色部分化成"光的回声"。
                    溶解用 CSS mask（背景是渐变，盖纯色会露色块）。 */}
                <div ref={ghostRef} className="p-ghost pointer-events-none absolute inset-0">
                    <div
                        className="absolute left-[56%] top-[10%] h-[114%] -translate-x-1/2 opacity-30 mix-blend-screen"
                        style={
                            {
                                WebkitMaskImage: GHOST_MASK,
                                maskImage: GHOST_MASK,
                                WebkitMaskComposite: "source-in",
                                maskComposite: "intersect",
                            } as CSSProperties
                        }
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={FIGURE_SRC} alt="" aria-hidden className="h-full w-auto max-w-none object-contain" />
                    </div>
                </div>

                {/* 立绘：靠左，脚落在底边上；暗底靠三层边缘光托起来 */}
                <div ref={figureRef} className="p-figure pointer-events-none absolute inset-0">
                    <div className="p-figure-inner absolute bottom-0 right-[4%] h-[88%]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={FIGURE_SRC}
                            alt="Z.ai 娘化立绘"
                            className="h-full w-auto max-w-none object-contain"
                            style={{
                                filter:
                                    "drop-shadow(0 0 22px rgba(46,211,223,0.30)) drop-shadow(0 0 60px rgba(46,211,223,0.16)) drop-shadow(0 16px 40px rgba(0,0,0,0.6))",
                            }}
                        />
                    </div>
                </div>

                {/* ================= 图纸层：规则线 / 十字标 / 尺寸标注 ================= */}

                {/* 竖分栏线：把左侧人物区与右侧文字区切开 */}
                <span className="p-rule-v absolute left-[62%] top-[6.5%] h-[80%] w-px" style={{ background: C.lineSoft }} />
                {/* 顶部与中部的横线 */}
                <span className="p-rule absolute left-[3.5%] top-[6.5%] h-px w-[93%]" style={{ background: C.line }} />
                <span className="p-rule absolute left-[3.5%] top-[63%] h-px w-[93%]" style={{ background: C.lineSoft }} />

                {/* 蓝图十字标 */}
                <div className="pointer-events-none absolute inset-0">
                    {CROSSES.map((c, i) => (
                        <span key={i} className="p-cross absolute" style={{ left: `${c.left}%`, top: `${c.top}%`, width: `${c.size}px`, height: `${c.size}px` }}>
                            <svg viewBox="0 0 20 20" className="h-full w-full" fill="none" stroke={C.paperFaint} strokeWidth="1">
                                <path d="M10 1v18M1 10h18" />
                                <circle cx="10" cy="10" r="4.2" />
                            </svg>
                        </span>
                    ))}
                </div>

                {/* 版心周围的小星芒 */}
                <div className="pointer-events-none absolute inset-0">
                    {[
                        { left: 36.2, top: 13.0, size: 14, tone: C.accent },
                        { left: 96.0, top: 30.0, size: 12, tone: C.paperFaint },
                        { left: 36.2, top: 55.0, size: 15, tone: C.accent },
                        { left: 74.0, top: 86.0, size: 11, tone: C.paperFaint },
                    ].map((s, i) => (
                        <span key={i} className="p-spark absolute" style={{ left: `${s.left}%`, top: `${s.top}%`, width: `${s.size}px`, height: `${s.size}px` }}>
                            <svg viewBox="0 0 24 24" className="h-full w-full">
                                <path d={STAR_PATH} fill={s.tone} />
                            </svg>
                        </span>
                    ))}
                </div>

                {/* 图纸尺寸标注：贴着人物右侧画一条尺寸线，标出画幅 */}
                <div className="pointer-events-none absolute left-[65%] top-[16%] flex flex-col items-center">
                    <span className="p-dim-cap block h-[1.5px] w-[14px]" style={{ background: C.accentFaint }} />
                    <span className="p-dim-line my-1 block h-[190px] w-px" style={{ background: C.accentFaint }} />
                    <span className="p-dim-cap block h-[1.5px] w-[14px]" style={{ background: C.accentFaint }} />
                    <span ref={dimRef} className="p-dim-label mt-2 whitespace-nowrap font-mono text-[9px] tracking-[.14em]" style={{ color: C.accent }}>
                        {COPY.dimLabel}
                    </span>
                </div>

                {/* ================= 顶部一行：品类 + 编号 ================= */}
                <div className="p-eyebrow absolute inset-x-[3.5%] top-[3%] flex items-baseline justify-between gap-4">
                    <span className="flex items-baseline gap-3">
                        <span className="text-[10px] font-medium tracking-[.46em]" style={{ color: C.paperSoft }}>
                            {COPY.eyebrow}
                        </span>
                        <span className="h-px w-10" style={{ background: C.accent }} />
                    </span>
                    <span className="font-mono text-[9px] tracking-[.22em]" style={{ color: C.paperFaint }}>
                        <span ref={odometerRef}>{COPY.series}</span> / NO.004-K
                    </span>
                </div>

                {/* ================= 右栏上段：官方标 + 技术型字标 ================= */}
                <div className="absolute left-[3.5%] top-[9.5%] select-none">
                    <div className="flex items-end gap-4">
                        <span className="p-mark-box relative grid h-[clamp(42px,4.8vw,76px)] w-[clamp(42px,4.8vw,76px)] shrink-0 place-items-center">
                            <span className="p-accent-ring absolute inset-0 rounded-[26%] border" style={{ borderColor: C.accentFaint }} />
                            <svg viewBox="0 0 30 30" className="h-full w-full" aria-hidden>
                                <path d={ZAI_SQUARE} fill={C.paper} />
                                <polygon className="p-mark-z" points={ZAI_Z} fill={C.inkDeep} />
                            </svg>
                        </span>
                        {/* 字标：宽字距技术型排版（刻意不同于 ChatGPT 那张的粗黑字 + 荧光笔） */}
                        <span className="p-title block text-[clamp(40px,7vw,142px)] font-medium leading-[.92] tracking-[.02em]" style={{ color: C.paper }}>
                            {COPY.title}
                        </span>
                        <span className="p-sub mb-2 text-[11px] tracking-[.3em]" style={{ color: C.paperSoft }}>
                            {COPY.sub}
                        </span>
                    </div>
                    <span className="p-rule mt-5 block h-px w-[42%]" style={{ background: C.lineSoft }} />
                </div>

                {/* 右栏中段：台词 + 正文 + 小注（全部 x ≥ 36%，绝不碰头） */}
                <div className="absolute left-[3.5%] top-[28%] max-w-[30%] select-none">
                    <p className="p-statement text-[clamp(15px,1.9vw,32px)] font-medium leading-[1.35] tracking-[-.02em]" style={{ color: C.paper }}>
                        {COPY.statement}
                        <span className="p-statement-mark mt-3 block h-[3px] w-[34%]" style={{ background: C.accent }} />
                    </p>
                    <p className="p-copy mt-5 max-w-[24ch] text-[clamp(11px,1.02vw,15px)] leading-7" style={{ color: C.paperSoft }}>
                        {COPY.copy}
                    </p>
                    <div className="p-notes mt-6 flex flex-wrap items-center gap-x-3.5 gap-y-2 text-[10.5px] tracking-[.16em]" style={{ color: C.paperSoft }}>
                        {COPY.notes.map((n, i) => (
                            <span key={n} className="flex items-center gap-3.5">
                                {i > 0 && <span className="h-[5px] w-[5px]" style={{ background: C.accent }} />}
                                {n}
                            </span>
                        ))}
                    </div>
                </div>

                {/* 右栏下段：波形条 + 强调点 */}
                <div className="absolute left-[3.5%] top-[56%] flex items-end gap-[6px]">
                    {BARS.map((h, i) => (
                        <span
                            key={i}
                            className="p-bar block w-[3px]"
                            style={{ height: `${h * 0.5}px`, background: i % 4 === 0 ? C.accent : C.slate2, opacity: i % 4 === 0 ? 0.9 : 0.6 }}
                        />
                    ))}
                    <span className="p-accent-dot mb-1 ml-2 h-[8px] w-[8px] rounded-full" style={{ background: C.accent }} />
                    <span className="mb-1.5 ml-2 font-mono text-[9px] tracking-[.18em]" style={{ color: C.paperFaint }}>
                        INFERENCE
                    </span>
                </div>

                {/* ================= 底栏：宽表格 ================= */}
                <div className="absolute bottom-[6.5%] left-[3.5%] right-[35%]">
                    <span className="p-rule mb-4 block h-px w-full" style={{ background: C.line }} />
                    <div className="flex">
                        <div className="flex-1">
                            {TABLE.map(([no, k, v]) => (
                                <span key={no} className="p-table-row flex items-center gap-5 border-b py-2.5" style={{ borderColor: C.lineSoft }}>
                                    <span className="font-mono text-[9px]" style={{ color: C.accent }}>
                                        {no}
                                    </span>
                                    <span className="w-[5.5em] text-[10px] tracking-[.24em]" style={{ color: C.paperFaint }}>
                                        {k}
                                    </span>
                                    <span className="flex-1 text-[11px] tracking-[.1em]" style={{ color: C.paperSoft }}>
                                        {v}
                                    </span>
                                </span>
                            ))}
                            <span className="p-table-row flex items-center gap-5 py-2.5">
                                <span className="font-mono text-[9px]" style={{ color: C.accent }}>
                                    04
                                </span>
                                <span className="w-[5.5em] text-[10px] tracking-[.24em]" style={{ color: C.paperFaint }}>
                                    {COPY.kana}
                                </span>
                                <span className="flex-1 text-[11px] tracking-[.1em]" style={{ color: C.paperSoft }}>
                                    {COPY.credit}
                                </span>
                            </span>
                        </div>
                        {/* 右侧：三行技术信息，与左侧表格并置成两栏规格表 */}
                        <div className="hidden flex-col items-end justify-end gap-1.5 pl-6 sm:flex">
                            {META.map(([k, v]) => (
                                <span key={k} className="flex items-baseline gap-2.5">
                                    <span className="text-[9px] tracking-[.24em]" style={{ color: C.paperFaint }}>
                                        {k}
                                    </span>
                                    <span className="font-mono text-[11px]" style={{ color: C.paperSoft }}>
                                        {v}
                                    </span>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 左页边：竖排微缩字 */}
                <div className="p-edge pointer-events-none absolute bottom-[7%] left-[1.4%] hidden sm:block">
                    <span className="text-[7.5px] tracking-[.34em]" style={{ writingMode: "vertical-rl", color: C.paperFaint }}>
                        {COPY.title} · ANTHRO 004 · {COPY.watermark} · ·
                    </span>
                </div>
            </section>

            {/* ============================ 页面浮层（不参与导出） ============================ */}
            <div className={POSTER_OVERLAY}>
                <div className="pointer-events-auto">
                    <Breadcrumb variant="dark" />
                </div>
                <div className="pointer-events-auto flex items-center gap-3">
                    {tip && <span className="text-[11px]" style={{ color: C.paperSoft }}>{tip}</span>}
                    <button
                        type="button"
                        onClick={exportPng}
                        disabled={exporting}
                        className="flex items-center gap-2 rounded-full border px-4 py-2 text-[11.5px] transition-colors disabled:opacity-50"
                        style={{ borderColor: C.line, background: "rgba(250,244,247,0.10)", color: C.paper }}
                    >
                        <Download className="h-3.5 w-3.5" />
                        {exporting ? "合成中…" : "保存海报"}
                    </button>
                </div>
            </div>
        </div>
    )
}
