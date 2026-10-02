"use client"

/* ==========================================================================
   Grok 娘 · 娘化人物海报（系列第六张）
   --------------------------------------------------------------------------
   六张各有自己的结构，这一张刻意再换一套：
     DeepSeek：巨型横带压字 + 深靛蓝赛博
     ClaudeCode：堆叠字块 + 印刷套准
     ChatGPT：产品页式左右分栏
     Z.ai：表格化的规格说明书
     Kimi：轴对称「月轮」+ 环形文字
     Grok（这一张）：竖排大标题 + 横向信息带 —— 标题不在版面上横排，而是竖在右侧
       书脊位置；文字按"带"分层排列（每一层由一条细线分隔），而不是一栏段落。

   配色取自立绘采样：深梅红炭灰 #261B27 / #372B36 / #453744 / #44343C / #2C222C（约 60%）、
   深绯红 #490A24（2.6%）、奶油肤色 #F9DAB6（2%）。
   底色用它的主色（深梅炭灰），强调色取那个绯红并提到可用的亮度。

   前五张踩过的坑逐条避开：PosterShell 尺寸契约、文字不碰头（实测）、脚不裁、
   虚影侧偏且更大更高、虚影 CSS mask 溶解、背景用人物主色、不用 styled-jsx、
   不用 backdrop-blur、导出前推终态、装饰确定性、图标名先验证，
   以及这一轮新补的一条：三角函数算出的值必须先固定精度再进 JSX（否则 hydration 报错）。

   素材：public/image/Grok.png（透明底立绘，1568×2752）
   图标：X 标（xAI 官方矢量，取自 simple-icons；x.ai / grok.com 在本机连不通，拿不到 Grok 自己的标）
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
const FIGURE_SRC = "/image/Grok.png"

/** X 标（xAI 官方矢量，24×24 单路径） */
const X_PATH =
    "M14.234 10.162L22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299l-.929-1.329L3.076 1.56h3.182l5.965 8.532l.929 1.329l7.754 11.09h-3.182z"

const COPY = {
    title: "Grok",
    sub: "xAI · 格罗克",
    watermark: "X",
    eyebrow: "ANTHROPOMORPHISM",
    series: "006",
    statement: "不带滤镜，直接回答。",
    copy: "该说的都说，不该绕的不绕——有观点，也认账。",
    notes: ["直给", "不绕", "有观点"],
    kana: "グロック",
    credit: "BitLeap 海报合成",
}

const META: [string, string][] = [
    ["MODEL", "GROK / 娘"],
    ["SERIES", "ANTHRO / 006"],
    ["RENDER", "2026.10"],
]

/* --------------------------------------------------------------------------
   2. 设计 token —— 底色取立绘主色（深梅炭灰），强调取它的深绯红
   -------------------------------------------------------------------------- */
const C = {
    soot: "#120B12", // 比立绘最深再压一档 → 渐变起点与导出底色
    plum: "#1B131A",
    plum2: "#261B27", // 立绘出现最多的颜色
    plum3: "#2C222C",
    plum4: "#372B36",
    mauve: "#453744",
    mauve2: "#584548",
    cream: "#F9DAB6", // 立绘奶油肤色 → 主文字
    paper: "#FBF3EA",
    creamSoft: "rgba(249,218,182, 0.72)",
    creamFaint: "rgba(249,218,182, 0.44)",
    line: "rgba(249,218,182, 0.20)",
    lineSoft: "rgba(249,218,182, 0.10)",
    accent: "#E23E57", // 深绯红 #490A24 提到可用亮度 → 唯一强调色
    accentFaint: "rgba(226,62,87, 0.36)",
    accentSoft: "rgba(226,62,87, 0.14)",
}

/* --------------------------------------------------------------------------
   3. 装饰（位置写死，SSR / CSR 一致；凡是三角函数算出的值一律先固定精度）
   -------------------------------------------------------------------------- */
const STAR_PATH =
    "M12 0C12.7 6.7 17.3 11.3 24 12C17.3 12.7 12.7 17.3 12 24C11.3 17.3 6.7 12.7 0 12C6.7 11.3 11.3 6.7 12 0Z"

/** 横带上的刻度：每一层带子左端的一小段实色 */
const BAND_TICKS = [24, 52, 76, 91] // 四条带子的纵向位置（%），刻度就落在这些线上

/** 虚影的溶解遮罩：CSS mask（背景是渐变，盖纯色会露色块） */
const GHOST_MASK = [
    "linear-gradient(180deg, #000 0%, #000 52%, rgba(0,0,0,0.45) 66%, transparent 78%)",
    "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.4) 10%, #000 28%, #000 72%, rgba(0,0,0,0.4) 90%, transparent 100%)",
].join(", ")

/* --------------------------------------------------------------------------
   4. 页面
   -------------------------------------------------------------------------- */
export default function GrokPosterPage() {
    const posterRef = useRef<HTMLElement>(null)
    const figureRef = useRef<HTMLDivElement>(null)
    const ghostRef = useRef<HTMLDivElement>(null)
    const glowRef = useRef<HTMLDivElement>(null)
    const odometerRef = useRef<HTMLSpanElement>(null)
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
            // 夜 → 光 → 水印 → 虚影 → 人 → 带子（线先画、字再落）→ 竖排标题
            tl.fromTo(".p-bg", { opacity: 0 }, { opacity: 1, duration: 1.1 }, 0)
                .fromTo(".p-glow", { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 1.7, ease: "power2.out" }, 0.1)
                .fromTo(".p-watermark", { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: 2.2, ease: "power2.out" }, 0.2)
                .fromTo(".p-ghost", { opacity: 0, scale: 1.06 }, { opacity: 1, scale: 1, duration: 2.1, ease: "power2.out" }, 0.35)
                .fromTo(".p-figure", { opacity: 0, xPercent: -5 }, { opacity: 1, xPercent: 0, duration: 1.8, ease: "power2.out" }, 0.6)
                // 带子：一条条从右往左画出来（这张的版式语言）
                .fromTo(".p-band-rule", { scaleX: 0 }, { scaleX: 1, duration: 0.85, stagger: 0.16, ease: "power3.out", transformOrigin: "right center" }, 0.95)
                .fromTo(".p-band-tick", { scaleX: 0 }, { scaleX: 1, duration: 0.4, ease: "power3.out", stagger: 0.16, transformOrigin: "left center" }, 1.15)
                .fromTo(".p-eyebrow", { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.6 }, 1.15)
                // 每一带的内容：从右往左滑入（和线的方向一致）
                .fromTo(".p-row-a > *", { opacity: 0, x: 22 }, { opacity: 1, x: 0, duration: 0.6, stagger: 0.08 }, 1.35)
                .fromTo(".p-row-b > *", { opacity: 0, x: 22 }, { opacity: 1, x: 0, duration: 0.6, stagger: 0.08 }, 1.75)
                .fromTo(".p-row-c > *", { opacity: 0, x: 22 }, { opacity: 1, x: 0, duration: 0.6, stagger: 0.08 }, 2.15)
                // 右上：X 标 + 竖排大标题（逐字从上往下落）
                .fromTo(".p-mark-box", { opacity: 0, scale: 0.5, rotation: -18 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.7, ease: "back.out(2)" }, 1.2)
                .fromTo(".p-mark-x", { opacity: 0, scale: 0.4, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.55, ease: "back.out(2.4)" }, 1.45)
                .fromTo(".p-title-v span", { opacity: 0, y: -22 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.12, ease: "power3.out" }, 1.35)
                .fromTo(".p-sub-v", { opacity: 0, y: -14 }, { opacity: 1, y: 0, duration: 0.7 }, 1.95)
                .fromTo(".p-spark", { opacity: 0, scale: 0.2, rotation: -50 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.8, ease: "back.out(2.2)", stagger: 0.09 }, 1.6)
                .fromTo(".p-kana", { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.7 }, 2.5)
                .fromTo(".p-credit", { opacity: 0 }, { opacity: 1, duration: 0.8 }, 2.6)
                .fromTo(".p-edge", { opacity: 0 }, { opacity: 1, duration: 1 }, 2.4)

            // 编号计数器：直接写 DOM（用 state 会每帧重渲染；箭头函数里也不能用 this.targets()）
            const od = { v: 0 }
            tl.to(od, {
                v: 6,
                duration: 1,
                ease: "power2.out",
                onUpdate: () => {
                    if (odometerRef.current) odometerRef.current.textContent = String(Math.round(od.v)).padStart(3, "0")
                },
            }, 2.1)
            introRef.current = tl
        }

        /* 常驻循环：光呼吸 + 人物浮空 + 虚影漂移 + 强调点脉动 + 带子刻度脉动 */
        const push = (t: gsap.core.Tween) => loopsRef.current.push(t)
        push(gsap.to(".p-glow", { opacity: 0.76, scale: 1.05, duration: 5.4, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3 }))
        push(gsap.to(".p-figure-inner", { y: -8, duration: 8.4, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3.2 }))
        push(gsap.to(".p-ghost img", { y: -5, duration: 12.5, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3.4 }))
        push(gsap.to(".p-ghost", { opacity: 0.68, duration: 7.8, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3.6 }))
        push(gsap.to(".p-watermark", { scale: 1.06, duration: 20, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3.8 }))
        push(gsap.to(".p-band-tick", { opacity: 0.35, duration: 1.4, repeat: -1, yoyo: true, ease: "sine.inOut", stagger: { each: 0.16, from: "start" }, delay: 3.4 }))
        push(gsap.to(".p-accent-dot", { scale: 1.6, opacity: 0.5, duration: 1.7, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3.4 }))
        push(gsap.fromTo(".p-accent-ring", { scale: 0.86, opacity: 0.45 }, { scale: 1.22, opacity: 0, duration: 3.4, repeat: -1, ease: "power1.out", repeatDelay: 1.2, delay: 3.6, transformOrigin: "50% 50%" }))
        posterRef.current.querySelectorAll<HTMLElement>(".p-spark").forEach((el, i) => {
            push(gsap.to(el, { opacity: 0.15, scale: 0.55, rotation: i % 2 ? 30 : -30, duration: 2.6 + (i % 3) * 0.6, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3.2 + i * 0.3 }))
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
        // 入场时间轴推到终态：否则动画没跑完就导出，文字还停在 opacity 0，成图会缺内容
        introRef.current?.progress(1)
        if (odometerRef.current) odometerRef.current.textContent = COPY.series
        try {
            if (!fontCssRef.current) fontCssRef.current = await getFontEmbedCSS(poster)
            const rect = poster.getBoundingClientRect()
            const ratio = Math.min(2, 2600 / Math.max(1, rect.width))
            const dataUrl = await toPng(poster, {
                pixelRatio: ratio,
                cacheBust: true,
                backgroundColor: C.soot,
                fontEmbedCSS: fontCssRef.current,
            })
            const a = document.createElement("a")
            a.href = dataUrl
            a.download = `grok-poster-${Date.now()}.png`
            a.click()
            setTip("已保存 2 倍高清图")
        } catch (err) {
            console.error("[grok-poster] 导出失败:", err)
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
            className={`${POSTER_SHELL} overflow-hidden bg-[#120B12] text-[#F9DAB6] selection:bg-[#E23E57]/30`}
        >
            {/* ============================ 海报本体（导出对象） ============================ */}
            <section ref={posterRef} className={POSTER_SURFACE}>
                {/* 底色：取立绘主色（深梅炭灰）做渐变 */}
                <div className="p-bg absolute inset-0 bg-[linear-gradient(156deg,#120B12_0%,#1B131A_18%,#221823_36%,#2C222C_54%,#372B36_72%,#453744_88%,#584548_100%)]" />

                {/* 人物背后的光：绯红 + 一点奶油提亮 */}
                <div ref={glowRef} className="p-glow pointer-events-none absolute inset-0">
                    <div
                        className="absolute left-[-6%] top-[12%] h-[84%] w-[50%]"
                        style={{ background: `radial-gradient(closest-side, rgba(226,62,87,0.22) 0%, rgba(226,62,87,0.08) 44%, transparent 76%)` }}
                    />
                    <div
                        className="absolute left-[6%] top-[30%] h-[54%] w-[38%]"
                        style={{ background: `radial-gradient(closest-side, rgba(249,218,182,0.16), rgba(249,218,182,0.05) 46%, transparent 78%)` }}
                    />
                </div>

                {/* 暗角 */}
                <div
                    className="pointer-events-none absolute inset-0"
                    style={{ background: `radial-gradient(124% 80% at 32% 46%, transparent 40%, rgba(8,4,8,0.62) 100%)` }}
                />

                {/* 巨型水印：X（品牌字，压在右侧底图） */}
                <div className="p-watermark pointer-events-none absolute right-[6%] top-[16%] select-none">
                    <span className="block text-[clamp(200px,42vw,760px)] font-black leading-[.8]" style={{ color: "rgba(249,218,182,0.045)" }}>
                        {COPY.watermark}
                    </span>
                </div>

                {/* 人物虚影：偏人物右侧、比主体更大更高。深底上用半透明奶油形体做"回声"。 */}
                <div ref={ghostRef} className="p-ghost pointer-events-none absolute inset-0">
                    <div
                        className="absolute left-[46%] top-[10%] h-[115%] -translate-x-1/2 opacity-20"
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

                {/* 立绘：靠左、脚落在底边上；深底靠绯红与奶油两层边缘光托起来 */}
                <div ref={figureRef} className="p-figure pointer-events-none absolute inset-0">
                    <div className="p-figure-inner absolute bottom-0 left-[4%] h-[86%]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={FIGURE_SRC}
                            alt="Grok 娘化立绘"
                            className="h-full w-auto max-w-none object-contain"
                            style={{
                                filter:
                                    "drop-shadow(0 0 24px rgba(249,218,182,0.28)) drop-shadow(0 0 58px rgba(226,62,87,0.26)) drop-shadow(0 16px 40px rgba(0,0,0,0.62))",
                            }}
                        />
                    </div>
                </div>

                {/* 版心周围的小星芒 */}
                <div className="pointer-events-none absolute inset-0">
                    {[
                        { left: 34.5, top: 14.0, size: 14, tone: C.accent },
                        { left: 96.0, top: 68.0, size: 12, tone: C.creamFaint },
                        { left: 36.5, top: 62.5, size: 13, tone: C.accent },
                        { left: 66.0, top: 92.0, size: 11, tone: C.creamFaint },
                    ].map((s, i) => (
                        <span key={i} className="p-spark absolute" style={{ left: `${s.left}%`, top: `${s.top}%`, width: `${s.size}px`, height: `${s.size}px` }}>
                            <svg viewBox="0 0 24 24" className="h-full w-full">
                                <path d={STAR_PATH} fill={s.tone} />
                            </svg>
                        </span>
                    ))}
                </div>

                {/* ================= 顶部：品类 + 编号 ================= */}
                <div className="p-eyebrow absolute inset-x-[3.5%] top-[3.2%] flex items-baseline justify-between gap-4">
                    <span className="flex items-baseline gap-3">
                        <span className="text-[10px] font-medium tracking-[.46em]" style={{ color: C.creamSoft }}>
                            {COPY.eyebrow}
                        </span>
                        <span className="h-px w-10" style={{ background: C.accent }} />
                    </span>
                    <span className="font-mono text-[9px] tracking-[.22em]" style={{ color: C.creamFaint }}>
                        <span ref={odometerRef}>{COPY.series}</span> / NO.006-K
                    </span>
                </div>

                {/* ================= 右侧：竖排大标题（书脊位）+ X 标 ================= */}
                <div className="absolute right-[3.2%] top-[9%] flex flex-col items-center gap-5">
                    <span className="p-mark-box relative grid h-[clamp(38px,4.4vw,68px)] w-[clamp(38px,4.4vw,68px)] shrink-0 place-items-center rounded-full" style={{ background: C.cream }}>
                        <span className="p-accent-ring absolute inset-0 rounded-full border" style={{ borderColor: C.accent }} />
                        <svg viewBox="0 0 24 24" className="h-[52%] w-[52%]" aria-hidden>
                            <path className="p-mark-x" d={X_PATH} fill={C.soot} />
                        </svg>
                    </span>
                    {/* 竖排大字：这一张的标题不横排，竖在右侧书脊位置 */}
                    <span className="p-title-v select-none text-[clamp(44px,7.6vw,164px)] font-black leading-[.9]" style={{ writingMode: "vertical-rl", color: C.paper }}>
                        {Array.from(COPY.title).map((ch, i) => (
                            <span key={i} className="inline-block">
                                {ch}
                            </span>
                        ))}
                    </span>
                    <span className="p-sub-v select-none text-[10px] tracking-[.34em]" style={{ writingMode: "vertical-rl", color: C.creamSoft }}>
                        {COPY.sub}
                    </span>
                </div>

                {/* ================= 三条横向信息带（线与刻度） ================= */}
                <span className="p-band-rule absolute left-[34%] right-[13.5%] top-[24%] h-px" style={{ background: C.line }} />
                <span className="p-band-rule absolute left-[34%] right-[13.5%] top-[52%] h-px" style={{ background: C.line }} />
                <span className="p-band-rule absolute left-[34%] right-[13.5%] top-[76%] h-px" style={{ background: C.line }} />

                {/* 带子左端的刻度：每条带子一个实色小段（位置写死，不用 vh —— 海报里任何 vh 都会跟窗口走） */}
                {BAND_TICKS.map((top) => (
                    <span
                        key={top}
                        className="p-band-tick block h-[3px] w-[22px] origin-left"
                        style={{ position: "absolute", left: "34%", top: `${top}%`, background: C.accent, opacity: 0.9 }}
                    />
                ))}

                {/* ---- 带 A：X 标读法 + 主张 ---- */}
                <div className="p-row-a absolute left-[34%] top-[11%] flex max-w-[50%] flex-col gap-4 select-none">
                    <span className="flex items-center gap-3">
                        <span className="text-[9px] tracking-[.3em]" style={{ color: C.accent }}>
                            01 / STANCE
                        </span>
                        <span className="h-px flex-1" style={{ background: C.lineSoft }} />
                    </span>
                    <p className="text-[clamp(17px,2.1vw,36px)] font-medium leading-[1.3] tracking-[-.02em]" style={{ color: C.paper }}>
                        {COPY.statement}
                    </p>
                </div>

                {/* ---- 带 B：正文 + 小注 ---- */}
                <div className="p-row-b absolute left-[34%] top-[31%] flex max-w-[46%] flex-col gap-5 select-none">
                    <span className="flex items-center gap-3">
                        <span className="text-[9px] tracking-[.3em]" style={{ color: C.accent }}>
                            02 / VOICE
                        </span>
                        <span className="h-px flex-1" style={{ background: C.lineSoft }} />
                    </span>
                    <p className="max-w-[30ch] text-[clamp(11.5px,1.15vw,17px)] leading-8" style={{ color: C.creamSoft }}>
                        {COPY.copy}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10.5px] tracking-[.16em]" style={{ color: C.creamSoft }}>
                        {COPY.notes.map((n, i) => (
                            <span key={n} className="flex items-center gap-3.5">
                                {i > 0 && <span className="h-[4px] w-[4px]" style={{ background: C.accent }} />}
                                {n}
                            </span>
                        ))}
                    </div>
                </div>

                {/* ---- 带 C：三栏规格 ---- */}
                <div className="p-row-c absolute left-[34%] top-[60%] flex max-w-[50%] flex-col gap-5 select-none">
                    <span className="flex items-center gap-3">
                        <span className="text-[9px] tracking-[.3em]" style={{ color: C.accent }}>
                            03 / SPEC
                        </span>
                        <span className="h-px flex-1" style={{ background: C.lineSoft }} />
                    </span>
                    <div className="flex flex-wrap gap-x-10 gap-y-4">
                        {META.map(([k, v]) => (
                            <span key={k} className="flex flex-col gap-1.5">
                                <span className="text-[9px] tracking-[.26em]" style={{ color: C.creamFaint }}>
                                    {k}
                                </span>
                                <span className="font-mono text-[12px]" style={{ color: C.creamSoft }}>
                                    {v}
                                </span>
                            </span>
                        ))}
                    </div>
                </div>

                {/* ================= 底部：横带 + 页脚 ================= */}
                <span className="p-band-rule absolute bottom-[9%] left-[3.5%] right-[3.5%] h-px" style={{ background: C.line }} />
                <div className="absolute bottom-[5%] left-[3.5%] flex items-baseline gap-4">
                    <span className="p-accent-dot block h-[7px] w-[7px] rounded-full" style={{ background: C.accent }} />
                    <span className="text-[10px] tracking-[.28em]" style={{ color: C.paper }}>
                        {COPY.title}
                    </span>
                    <span className="text-[10px] tracking-[.26em]" style={{ color: C.creamFaint }}>
                        {COPY.kana}
                    </span>
                    <span className="p-credit font-mono text-[9px] tracking-[.26em]" style={{ color: C.creamFaint }}>
                        {COPY.credit}
                    </span>
                </div>
                <span className="p-edge pointer-events-none absolute bottom-[5%] right-[3.5%] hidden text-[7.5px] tracking-[.34em] sm:block" style={{ color: C.creamFaint }}>
                    XAI · GROK · ANTHRO 006 · 2026.10
                </span>
            </section>

            {/* ============================ 页面浮层（不参与导出） ============================ */}
            <div className={POSTER_OVERLAY}>
                <div className="pointer-events-auto">
                    <Breadcrumb variant="dark" />
                </div>
                <div className="pointer-events-auto flex items-center gap-3">
                    {tip && <span className="text-[11px]" style={{ color: C.creamSoft }}>{tip}</span>}
                    <button
                        type="button"
                        onClick={exportPng}
                        disabled={exporting}
                        className="flex items-center gap-2 rounded-full border px-4 py-2 text-[11.5px] transition-colors disabled:opacity-50"
                        style={{ borderColor: C.line, background: "rgba(249,218,182,0.10)", color: C.cream }}
                    >
                        <Download className="h-3.5 w-3.5" />
                        {exporting ? "合成中…" : "保存海报"}
                    </button>
                </div>
            </div>
        </div>
    )
}
