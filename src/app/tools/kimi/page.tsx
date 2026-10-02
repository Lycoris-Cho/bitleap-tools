"use client"

/* ==========================================================================
   Kimi K3 娘 · 娘化人物海报（系列第五张 · 第二版）
   --------------------------------------------------------------------------
   第一版被指出"和 ChatGPT 那张太像"——确实是我的问题：GPT / Z.ai / Kimi 三张
   一直在复用同一套骨架（一侧 logo + 大标题、另一侧台词 + 正文 + 小注、文案下面再压
   一条强调线），只换了配色。这一版把结构整个换掉：

     · 轴对称「月轮」构图：一轮正圆月亮居中，人物站在月前
     · 文字分列左右两侧（不再是一侧一块），全部避开中间的人物与月轮
     · 标题不放在版面上，而是沿月轮排成环形（SVG textPath）
     · 全部取消"文案下面的强调线/荧光笔"这类装置
     · 月盘是正圆（aspect-square，任何窗口都不会变成椭圆），并在圆内向外发散放射光线

   前四张踩过的坑依旧逐条避开：PosterShell 尺寸契约、文字不碰头（实测重叠面积）、
   脚不裁、虚影侧偏且更大更高、虚影用 CSS mask 溶解、背景用人物主色、不用
   styled-jsx、不用 backdrop-blur、导出前推终态、装饰确定性。

   素材：public/image/kimi.png（透明底立绘，1568×2752）
   官方图标：Kimi 官方 logo（取自 simple-icons）
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
const FIGURE_SRC = "/image/kimi.png"

const KIMI_PATH =
    "M21.765.351C22.998.351 24 1.353 24 2.586S22.998 4.82 21.765 4.82h-1.974c-.15 0-.26-.12-.26-.26V2.586A2.237 2.237 0 0 1 21.765.35M9.41 13.388l8.447-8.377c.16-.16.07-.471-.14-.471h-4.55s-.1.02-.14.06l-9.099 9.029c-.14.14-.35.02-.35-.21V4.81c0-.15-.1-.27-.221-.27H.22c-.12 0-.22.12-.22.27v18.57c0 .15.1.27.22.27h3.137c.12 0 .22-.12.22-.27v-3.79c0-.08.03-.16.08-.21l2.826-2.796c.07-.07.16-.08.241-.03l7.546 5.551a8.9 8.9 0 0 0 4.018 1.493c.12.01.23-.11.23-.27V19.76c0-.14-.08-.25-.19-.26a5.8 5.8 0 0 1-2.355-.942l-6.533-4.73c-.14-.09-.15-.32-.03-.441"

const COPY = {
    title: "Kimi",
    badge: "K3",
    ring: "KIMI K3 · MOONSHOT · ANTHRO 005 · 月之暗面 · ",
    sub: "月之暗面 · Moonshot",
    watermark: "月",
    eyebrow: "ANTHROPOMORPHISM",
    series: "005",
    statement: "把长文读完，把问题想透。",
    copy: "上下文很长，它记得住；问题很绕，它能一层层拆开。",
    quote: "月亮的背面没有光，但那里也有东西在转。",
    notes: ["读得长", "想得深", "记得住"],
    kana: "キミ",
    credit: "BitLeap 海报合成",
}

const META: [string, string][] = [
    ["MODEL", "KIMI K3 / 娘"],
    ["SERIES", "ANTHRO / 005"],
    ["RENDER", "2026.10"],
]

/* --------------------------------------------------------------------------
   2. 设计 token —— 底色取立绘深靛紫那一半，文字取它的薰衣草与近白
   -------------------------------------------------------------------------- */
const C = {
    night: "#100C20",
    indigo: "#1E1738",
    indigo2: "#2A234A",
    indigo3: "#342C59",
    violet: "#3B3466",
    violet2: "#4A4074",
    lav: "#D9C9E5",
    lav2: "#C8B8D8",
    paper: "#FBF5F8",
    moon: "#F6EBF4",
    lavSoft: "rgba(217,201,229, 0.74)",
    lavFaint: "rgba(217,201,229, 0.46)",
    line: "rgba(217,201,229, 0.20)",
    lineSoft: "rgba(217,201,229, 0.10)",
    accent: "#A78BFA",
    accentFaint: "rgba(167,139,250, 0.38)",
}

/* --------------------------------------------------------------------------
   3. 装饰（全部确定性生成，SSR / CSR 一致）
   -------------------------------------------------------------------------- */

/** 四角星路径（24×24） */
const STAR_PATH =
    "M12 0C12.7 6.7 17.3 11.3 24 12C17.3 12.7 12.7 17.3 12 24C11.3 17.3 6.7 12.7 0 12C6.7 11.3 11.3 6.7 12 0Z"

/** 虚影的溶解遮罩：用 CSS mask（背景是渐变，盖纯色会露色块） */
const GHOST_MASK = [
    "linear-gradient(180deg, #000 0%, #000 52%, rgba(0,0,0,0.45) 66%, transparent 78%)",
    "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.4) 10%, #000 28%, #000 72%, rgba(0,0,0,0.4) 90%, transparent 100%)",
].join(", ")

/** 月圆内的放射光线：24 条，长短与浓度都不同 —— 这就是"发散"的效果 */
const RAYS = Array.from({ length: 24 }, (_, i) => {
    const seed = Math.sin(i * 12.9898) * 43758.5453
    const r = seed - Math.floor(seed)
    const seed2 = Math.sin(i * 7.233) * 18273.14
    const r2 = seed2 - Math.floor(seed2)
    const angle = (360 / 24) * i
    const rad = (angle * Math.PI) / 180
    const inner = 46 + r * 34
    const outer = 132 + r2 * 78
    // 关键：cos/sin 在服务端(Node)与客户端(Chrome)可能差 1 ULP，
    // 直接把浮点写进 SVG 属性会导致 hydration 报错。这里一律先格式化成固定精度字符串。
    const fmt = (v: number) => v.toFixed(2)
    return {
        x1: fmt(200 + inner * Math.cos(rad)),
        y1: fmt(200 + inner * Math.sin(rad)),
        x2: fmt(200 + outer * Math.cos(rad)),
        y2: fmt(200 + outer * Math.sin(rad)),
        opacityStr: (0.22 + r * 0.5).toFixed(3),
        opacityNum: 0.22 + r * 0.5,
        width: r2 > 0.72 ? 1.6 : 0.9,
    }
})

/** 月相点：沿月轮排一圈，从左到右依次亮起 */
const PHASES = Array.from({ length: 14 }, (_, i) => {
    const angle = -206 + (232 / 13) * i // 从左上绕到底部
    const rad = (angle * Math.PI) / 180
    const r = 72 // 月盘外缘再往外一点
    // 同 RAYS：位置由 cos/sin 算出，必须固定精度再进 style，
    // 否则服务端与客户端的浮点尾数不同会触发 hydration mismatch。
    return {
        left: `${(50 + r * Math.cos(rad)).toFixed(3)}%`,
        top: `${(50 + r * Math.sin(rad)).toFixed(3)}%`,
        clip: `inset(0 ${((1 - i / 13) * 100).toFixed(2)}% 0 0)`,
        lit: i <= 9,
    }
})

/* --------------------------------------------------------------------------
   4. 页面
   -------------------------------------------------------------------------- */
export default function KimiPosterPage() {
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
            // 夜 → 月轮 → 放射光由内向外抽出 → 文字环 → 涟漪 → 水印 → 虚影 → 人 → 两侧文字
            tl.fromTo(".p-bg", { opacity: 0 }, { opacity: 1, duration: 1.1 }, 0)
                .fromTo(".p-moon-disc", { opacity: 0, scale: 0.82 }, { opacity: 1, scale: 1, duration: 2.1, ease: "power2.out" }, 0.1)
                .fromTo(".p-ray", { scaleY: 0, transformOrigin: "center bottom", opacity: 0 }, { scaleY: 1, opacity: (i: number) => RAYS[i]?.opacityNum ?? 0.4, duration: 0.9, stagger: { each: 0.022, from: "start" }, ease: "power2.out" }, 0.5)
                .fromTo(".p-ring-text", { opacity: 0 }, { opacity: 0.9, duration: 1.6 }, 1.1)
                .fromTo(".p-orbit", { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 1.6, ease: "power2.out", stagger: 0.18 }, 0.8)
                .fromTo(".p-ripple", { scale: 0.72, opacity: 0 }, { scale: 1, opacity: 0.5, duration: 1.9, ease: "power2.out", stagger: 0.28 }, 0.9)
                .fromTo(".p-watermark", { opacity: 0, scale: 1.05 }, { opacity: 1, scale: 1, duration: 2.2, ease: "power2.out" }, 0.6)
                .fromTo(".p-glow", { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 1.7, ease: "power2.out" }, 0.9)
                .fromTo(".p-ghost", { opacity: 0, scale: 1.06 }, { opacity: 1, scale: 1, duration: 2.1, ease: "power2.out" }, 1.0)
                .fromTo(".p-figure", { opacity: 0, yPercent: 4 }, { opacity: 1, yPercent: 0, duration: 1.9, ease: "power2.out" }, 1.25)
                // 顶部一行
                .fromTo(".p-eyebrow", { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.6 }, 1.35)
                .fromTo(".p-rule", { scaleX: 0 }, { scaleX: 1, duration: 0.9, stagger: 0.14, ease: "power3.out", transformOrigin: "center center" }, 1.2)
                // 两侧文字：左列从左侧滑入、右列从右侧滑入（对称入场）
                .fromTo(".p-left", { opacity: 0, x: -26 }, { opacity: 1, x: 0, duration: 0.8, stagger: 0.12 }, 1.55)
                .fromTo(".p-right", { opacity: 0, x: 26 }, { opacity: 1, x: 0, duration: 0.8, stagger: 0.12 }, 1.7)
                .fromTo(".p-note", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08 }, 2.1)
                // 月相点沿月轮依次亮起
                .fromTo(".p-phase", { opacity: 0, scale: 0.4 }, { opacity: (i: number) => (PHASES[i]?.lit ? 1 : 0.42), scale: 1, duration: 0.45, ease: "back.out(2)", stagger: 0.075 }, 1.9)
                // 官方标 + 徽章
                .fromTo(".p-mark-box", { opacity: 0, scale: 0.5, rotation: -18 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.75, ease: "back.out(2)" }, 2.0)
                .fromTo(".p-mark-k", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6 }, 2.25)
                .fromTo(".p-badge", { opacity: 0, scale: 0.4, rotation: -14 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.65, ease: "back.out(2.4)" }, 2.3)
                .fromTo(".p-spark", { opacity: 0, scale: 0.2, rotation: -50 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.8, ease: "back.out(2.2)", stagger: 0.09 }, 1.9)
                .fromTo(".p-kana", { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.7 }, 2.45)
                .fromTo(".p-credit", { opacity: 0 }, { opacity: 1, duration: 0.8 }, 2.55)
                .fromTo(".p-edge", { opacity: 0 }, { opacity: 1, duration: 1 }, 2.3)

            // 编号计数器：直接写 DOM（用 state 会每帧重渲染；箭头函数里也不能用 this.targets()）
            const od = { v: 0 }
            tl.to(od, {
                v: 5,
                duration: 1,
                ease: "power2.out",
                onUpdate: () => {
                    if (odometerRef.current) odometerRef.current.textContent = String(Math.round(od.v)).padStart(3, "0")
                },
            }, 2.1)
            introRef.current = tl
        }

        /* 常驻循环：放射光呼吸 + 月盘呼吸 + 文字环极缓自转 + 涟漪扩散 + 人物浮空 + 月相脉动 */
        const push = (t: gsap.core.Tween) => loopsRef.current.push(t)
        push(gsap.to(".p-moon-disc", { opacity: 0.84, scale: 1.04, duration: 6.6, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3 }))
        push(gsap.to(".p-ray", { scaleY: 0.72, duration: 2.6, repeat: -1, yoyo: true, ease: "sine.inOut", stagger: { each: 0.07, from: "random" }, delay: 3.2 }))
        push(gsap.to(".p-ring-spin", { rotation: 360, duration: 150, repeat: -1, ease: "none", transformOrigin: "50% 50%", delay: 3 }))
        push(gsap.fromTo(".p-ripple", { scale: 0.86, opacity: 0.4 }, { scale: 1.12, opacity: 0, duration: 3.8, repeat: -1, ease: "power1.out", repeatDelay: 1.2, delay: 3.4, transformOrigin: "50% 50%" }))
        push(gsap.to(".p-glow", { opacity: 0.76, scale: 1.05, duration: 5.6, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3.4 }))
        push(gsap.to(".p-figure-inner", { y: -8, duration: 8.6, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3.6 }))
        push(gsap.to(".p-ghost img", { y: -5, duration: 12.5, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3.8 }))
        push(gsap.to(".p-ghost", { opacity: 0.66, duration: 7.8, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 4 }))
        push(gsap.to(".p-watermark", { y: -20, duration: 24, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 4.2 }))
        push(gsap.to(".p-phase", { opacity: 0.3, duration: 1.3, repeat: -1, yoyo: true, ease: "sine.inOut", stagger: { each: 0.11, from: "start" }, delay: 3.6 }))
        posterRef.current.querySelectorAll<HTMLElement>(".p-spark").forEach((el, i) => {
            push(gsap.to(el, { opacity: 0.15, scale: 0.55, rotation: i % 2 ? 30 : -30, duration: 2.6 + (i % 3) * 0.6, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3.4 + i * 0.3 }))
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
        q.fx?.(px * -12)
        q.gx?.(px * -24) // 虚影走得比主体多，纵深就出来了
        q.lx?.(px * 10)
        q.ly?.(py * 8)
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
        gsap.set(".p-ray", { scaleY: 1 })
        gsap.set(".p-ripple", { opacity: 0.5 })
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
                backgroundColor: C.night,
                fontEmbedCSS: fontCssRef.current,
            })
            const a = document.createElement("a")
            a.href = dataUrl
            a.download = `kimi-k3-poster-${Date.now()}.png`
            a.click()
            setTip("已保存 2 倍高清图")
        } catch (err) {
            console.error("[kimi-poster] 导出失败:", err)
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
            className={`${POSTER_SHELL} overflow-hidden bg-[#100C20] text-[#D9C9E5] selection:bg-[#A78BFA]/30`}
        >
            {/* ============================ 海报本体（导出对象） ============================ */}
            <section ref={posterRef} className={POSTER_SURFACE}>
                {/* 底色：取立绘深靛紫那一半做渐变 */}
                <div className="p-bg absolute inset-0 bg-[linear-gradient(162deg,#100C20_0%,#161128_16%,#1B1430_32%,#221A3E_48%,#2A234A_64%,#342C59_80%,#3E3566_92%,#4A4074_100%)]" />

                {/* ============ 月轮：正圆（aspect-square，任何窗口都不会变椭圆）============ */}
                <div className="pointer-events-none absolute left-1/2 top-[47%] h-[74%] -translate-x-1/2 -translate-y-1/2 aspect-square">
                    {/* 月盘本体 */}
                    <div
                        className="p-moon-disc absolute inset-0 rounded-full"
                        style={{ background: `radial-gradient(closest-side, rgba(246,235,244,0.94) 0%, rgba(217,201,229,0.56) 46%, rgba(167,139,250,0.20) 76%, transparent 100%)` }}
                    />
                    {/* 圆内放射光线：由内向外抽出，长短浓度各异 —— 就是"发散" */}
                    <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full" aria-hidden>
                        {RAYS.map((ray, i) => (
                            <line
                                key={i}
                                className="p-ray"
                                x1={ray.x1}
                                y1={ray.y1}
                                x2={ray.x2}
                                y2={ray.y2}
                                stroke={C.moon}
                                strokeWidth={ray.width}
                                strokeLinecap="round"
                                opacity={ray.opacityStr}
                            />
                        ))}
                    </svg>
                    {/* 轨道环（虚线，缓慢自转） */}
                    <div className="p-orbit absolute inset-[-9%] rounded-full border" style={{ borderColor: C.line }} />
                    <div className="p-orbit absolute inset-[-22%] rounded-full border-2" style={{ borderColor: C.accentFaint, borderStyle: "dashed" }} />
                    {/* 涟漪：两圈错相扩散 */}
                    <span className="p-ripple absolute inset-[-9%] rounded-full border" style={{ borderColor: C.lavFaint }} />
                    <span className="p-ripple absolute inset-[-22%] rounded-full border" style={{ borderColor: C.line }} />
                </div>

                {/* 月轮外圈的文字环：标题不放在版面上，而是绕着月亮排一圈 */}
                <div className="pointer-events-none absolute left-1/2 top-[47%] h-[96%] -translate-x-1/2 -translate-y-1/2 aspect-square">
                    <div className="p-ring-spin absolute inset-0">
                        <svg viewBox="0 0 400 400" className="h-full w-full" fill="none">
                            <defs>
                                <path id="kimi-ring-path" d="M200,200 m-172,0 a172,172 0 1,1 344,0 a172,172 0 1,1 -344,0" />
                            </defs>
                            <text className="p-ring-text" style={{ fontSize: 15, letterSpacing: "0.34em", fill: C.lavFaint }}>
                                <textPath href="#kimi-ring-path" startOffset="0">
                                    {COPY.ring.repeat(2)}
                                </textPath>
                            </text>
                        </svg>
                    </div>
                </div>

                {/* 月相点：沿月轮排一圈，依次亮起 */}
                <div className="pointer-events-none absolute left-1/2 top-[47%] h-[74%] -translate-x-1/2 -translate-y-1/2 aspect-square">
                    {PHASES.map((p, i) => (
                        <span
                            key={i}
                            className="p-phase absolute h-[13px] w-[13px] -translate-x-1/2 -translate-y-1/2 rounded-full border"
                            style={{
                                left: p.left,
                                top: p.top,
                                borderColor: C.lavFaint,
                                background: C.moon,
                                clipPath: p.clip,
                            }}
                        />
                    ))}
                </div>

                {/* 人物背后的一点提亮 */}
                <div ref={glowRef} className="p-glow pointer-events-none absolute inset-0">
                    <div
                        className="absolute left-1/2 top-[34%] h-[56%] w-[40%] -translate-x-1/2"
                        style={{ background: `radial-gradient(closest-side, rgba(255,255,255,0.22), rgba(167,139,250,0.10) 46%, transparent 78%)` }}
                    />
                </div>

                {/* 暗角 */}
                <div
                    className="pointer-events-none absolute inset-0"
                    style={{ background: `radial-gradient(120% 78% at 50% 46%, transparent 40%, rgba(8,6,16,0.62) 100%)` }}
                />

                {/* 巨型水印：一个「月」字压在底图 */}
                <div className="p-watermark pointer-events-none absolute left-1/2 top-[30%] -translate-x-1/2 select-none">
                    <span className="block text-[clamp(180px,34vw,640px)] font-black leading-[.8]" style={{ color: "rgba(217,201,229,0.05)" }}>
                        {COPY.watermark}
                    </span>
                </div>

                {/* 人物虚影：偏人物右侧、比主体更大更高。深紫底上不需要混合模式，
                    半透明的薰衣草形体本身就是"月色回声"。溶解用 CSS mask。 */}
                <div ref={ghostRef} className="p-ghost pointer-events-none absolute inset-0">
                    <div
                        className="absolute left-[57%] top-[10%] h-[115%] -translate-x-1/2 opacity-20"
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

                {/* 立绘：居中站在月前，脚落在底边上 */}
                <div ref={figureRef} className="p-figure pointer-events-none absolute inset-0">
                    <div className="p-figure-inner absolute bottom-0 left-1/2 h-[86%] -translate-x-1/2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={FIGURE_SRC}
                            alt="Kimi K3 娘化立绘"
                            className="h-full w-auto max-w-none object-contain"
                            style={{
                                filter:
                                    "drop-shadow(0 0 24px rgba(246,235,244,0.32)) drop-shadow(0 0 58px rgba(167,139,250,0.22)) drop-shadow(0 16px 40px rgba(0,0,0,0.6))",
                            }}
                        />
                    </div>
                </div>

                {/* 版心周围的小星芒 */}
                <div className="pointer-events-none absolute inset-0">
                    {[
                        { left: 22.0, top: 15.0, size: 14, tone: C.accent },
                        { left: 78.5, top: 15.0, size: 14, tone: C.accent },
                        { left: 8.0, top: 62.0, size: 12, tone: C.lavFaint },
                        { left: 92.0, top: 62.0, size: 12, tone: C.lavFaint },
                    ].map((s, i) => (
                        <span key={i} className="p-spark absolute" style={{ left: `${s.left}%`, top: `${s.top}%`, width: `${s.size}px`, height: `${s.size}px` }}>
                            <svg viewBox="0 0 24 24" className="h-full w-full">
                                <path d={STAR_PATH} fill={s.tone} />
                            </svg>
                        </span>
                    ))}
                </div>

                {/* ================= 顶部：品类 + 编号 + 两条对称细线 ================= */}
                <div className="p-eyebrow absolute inset-x-[3.5%] top-[3.2%] flex items-center gap-4">
                    <span className="p-rule block h-px flex-1" style={{ background: C.line }} />
                    <span className="text-[10px] font-medium tracking-[.46em]" style={{ color: C.lavSoft }}>
                        {COPY.eyebrow}
                    </span>
                    <span className="font-mono text-[10px]" style={{ color: C.accent }}>
                        <span ref={odometerRef}>{COPY.series}</span>
                    </span>
                    <span className="p-rule block h-px flex-1" style={{ background: C.line }} />
                </div>

                {/* ================= 左列（x ≤ 29%，避开月轮与人物） ================= */}
                <div className="absolute bottom-[16%] left-[3.5%] w-[25%] select-none">
                    <p className="p-left text-right text-[clamp(16px,1.75vw,30px)] font-medium leading-[1.4] tracking-[-.01em]" style={{ color: C.paper }}>
                        {COPY.statement}
                    </p>
                    <p className="p-left mt-6 text-right text-[clamp(11px,1.02vw,15px)] leading-7" style={{ color: C.lavSoft }}>
                        {COPY.copy}
                    </p>
                    <p className="p-left mt-5 border-t pt-4 text-right text-[11px] leading-6 italic" style={{ borderColor: C.lineSoft, color: C.lavFaint }}>
                        {COPY.quote}
                    </p>
                </div>

                {/* ================= 右列（x ≥ 71%，与左列对称） ================= */}
                <div className="absolute bottom-[16%] right-[3.5%] w-[25%] select-none">
                    <div className="flex items-center gap-2.5">
                        <span className="p-mark-box grid h-[clamp(34px,3.6vw,56px)] w-[clamp(34px,3.6vw,56px)] shrink-0 place-items-center rounded-full" style={{ background: C.moon }}>
                            <svg viewBox="0 0 24 24" className="h-[58%] w-[58%]" aria-hidden>
                                <path className="p-mark-k" d={KIMI_PATH} fill={C.night} />
                            </svg>
                        </span>
                        <span className="text-[clamp(26px,3vw,52px)] leading-none" style={{ color: C.paper, fontWeight: 300 }}>
                            {COPY.title}
                        </span>
                        <span
                            className="p-badge grid h-[clamp(24px,2.6vw,40px)] shrink-0 place-items-center rounded-[12px] px-2.5 text-[clamp(12px,1.2vw,18px)] font-semibold leading-none"
                            style={{ background: C.accent, color: C.night }}
                        >
                            {COPY.badge}
                        </span>
                    </div>
                    <p className="mt-4 text-[11px] tracking-[.26em]" style={{ color: C.lavSoft }}>
                        {COPY.sub}
                    </p>
                    <div className="p-right mt-6 flex flex-col gap-2">
                        {META.map(([k, v]) => (
                            <span key={k} className="p-note flex items-baseline gap-2.5">
                                <span className="text-[9px] tracking-[.24em]" style={{ color: C.lavFaint }}>
                                    {k}
                                </span>
                                <span className="font-mono text-[11px]" style={{ color: C.lavSoft }}>
                                    {v}
                                </span>
                            </span>
                        ))}
                    </div>
                    <div className="p-right mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-[10.5px] tracking-[.16em]" style={{ color: C.lavSoft }}>
                        {COPY.notes.map((n, i) => (
                            <span key={n} className="flex items-center gap-3">
                                {i > 0 && <span className="h-[4px] w-[4px] rotate-45" style={{ background: C.accent }} />}
                                {n}
                            </span>
                        ))}
                    </div>
                </div>

                {/* ================= 底部：居中页脚（月轮下方） ================= */}
                <div className="absolute inset-x-0 bottom-[4.5%] flex flex-col items-center gap-2.5">
                    <span className="p-rule block h-px w-[26%]" style={{ background: C.line }} />
                    <span className="p-kana text-[10px] tracking-[.3em]" style={{ color: C.lavSoft }}>
                        {COPY.kana}
                    </span>
                    <span className="p-credit font-mono text-[9px] tracking-[.26em]" style={{ color: C.lavFaint }}>
                        {COPY.credit}
                    </span>
                </div>

                {/* 左右页边：竖排微缩字（对称） */}
                <div className="p-edge pointer-events-none absolute bottom-[22%] left-[1.4%] hidden sm:block">
                    <span className="text-[7.5px] tracking-[.34em]" style={{ writingMode: "vertical-rl", color: C.lavFaint }}>
                        {COPY.title} {COPY.badge} · ANTHRO 005 · ·
                    </span>
                </div>
                <div className="p-edge pointer-events-none absolute right-[1.4%] top-[22%] hidden sm:block">
                    <span className="text-[7.5px] tracking-[.34em]" style={{ writingMode: "vertical-rl", color: C.lavFaint }}>
                        MOONSHOT · 月之暗面 · 2026.10 · ·
                    </span>
                </div>
            </section>

            {/* ============================ 页面浮层（不参与导出） ============================ */}
            <div className={POSTER_OVERLAY}>
                <div className="pointer-events-auto">
                    <Breadcrumb variant="dark" />
                </div>
                <div className="pointer-events-auto flex items-center gap-3">
                    {tip && <span className="text-[11px]" style={{ color: C.lavSoft }}>{tip}</span>}
                    <button
                        type="button"
                        onClick={exportPng}
                        disabled={exporting}
                        className="flex items-center gap-2 rounded-full border px-4 py-2 text-[11.5px] transition-colors disabled:opacity-50"
                        style={{ borderColor: C.line, background: "rgba(217,201,229,0.10)", color: C.lav }}
                    >
                        <Download className="h-3.5 w-3.5" />
                        {exporting ? "合成中…" : "保存海报"}
                    </button>
                </div>
            </div>
        </div>
    )
}
