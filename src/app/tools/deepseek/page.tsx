"use client"

/* ==========================================================================
   DeepSeek-Flash-V4 · 娘化人物海报
   --------------------------------------------------------------------------
   设计参考（深色电影感 Key Visual 的通用做法）：
     · 电影海报 / 游戏主视觉：深底 + 角色边缘光（rim light）+ 体积辉光
     · 日本动画 BD 封面：竖排标题、极细分割线、字距拉开的拉丁小字、对位记号
     · 瑞士国际主义版式：严格网格、超大字号与极小字号并置、克制的留白
     · 赛博朋克海报：环形刻度、半调网点、暗角 + 颗粒
   配色不是凭空挑的：直接从立绘上采样出色阶（见下方 C 的注释），
   再叠加一个 DeepSeek 品牌蓝 #4D6BFE 作为唯一强调色，保证画面和人物同一套颜色。
   素材：public/image/deepseek.png（透明底立绘，1152×2080）
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from "react"
import { gsap } from "gsap"
import { Download } from "lucide-react"
import { getFontEmbedCSS, toPng } from "html-to-image"
import { Breadcrumb } from "@/components/breadcrumb"
import { POSTER_OVERLAY, POSTER_SHELL, POSTER_SURFACE } from "@/components/PosterShell"

/* --------------------------------------------------------------------------
   1. 素材与文案（改文字只改这一段）
   -------------------------------------------------------------------------- */
const FIGURE_SRC = "/image/deepseek.png"

const COPY = {
  eyebrow: "ANTHROPOMORPHISM",
  series: "SERIES 001",
  mark: "DEEPSEEK", // 巨型字带用的英文
  kanaName: "ディープシーク ・ フラッシュ", // 片假名（替代重复的英文）
  mascot: "吃白饭的大肥鱼", // 吉祥物小标签
  latin: "DEEPSEEK",
  headline: "FLASH",
  version: "V4",
  kana: "ディープシーク ・ フラッシュ",
  slogan: "快于光 · 深于思",
  side: "以光速抵达",
  credit: "BitLeap 海报合成",
}

const META: [string, string][] = [
  ["MODEL", "DEEPSEEK-FLASH-V4"],
  ["SERIES", "ANTHRO / 001"],
  ["RENDER", "2026.09"],
]

/* --------------------------------------------------------------------------
   2. 设计 token
   ink/navy/steel/peri/mauve/paper 这一串是直接从立绘采样得到的色阶
   （极深 #121125 / 主色 #3C3E6A / 中深 #5F699D / 中亮 #8290BA / 藕荷 #C5BCD2 / 近白 #F7F0F5）
   所以背景、辉光、文字都落在人物自己的颜色体系里；brand 是唯一的外来强调色。
   -------------------------------------------------------------------------- */
const C = {
  ink: "#08091A", // 底色
  deep: "#141634", // 次深
  navy: "#3C3E6A", // 人物主色 → 背景主调
  steel: "#5F699D", // 人物中深色 → 次级辉光
  peri: "#8290BA", // 人物中亮色 → 边缘光
  mauve: "#C5BCD2", // 人物自带藕荷 → 点缀色
  paper: "#F7F0F5", // 近白 → 文字
  brand: "#4D6BFE", // DeepSeek 蓝 → 唯一强调色
  paperSoft: "rgba(247,240,245, 0.72)",
  paperFaint: "rgba(247,240,245, 0.42)",
  paperGhost: "rgba(247,240,245, 0.16)",
  line: "rgba(197,188,210, 0.24)",
  lineSoft: "rgba(197,188,210, 0.12)",
}

/* --------------------------------------------------------------------------
   3. 装饰元素：确定性伪随机（SSR / CSR 一致，不会有 hydration 警告）
   -------------------------------------------------------------------------- */
function pseudo(i: number, salt: number) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

/** 星尘：只落在留白与人物轮廓外围，不压文字
    注意：所有数值都在这里格式化成固定精度字符串再交给 style。
    直接塞浮点会给 SSR 与客户端带来精度差异（服务端会舍入成 56.1819%，
    客户端是全精度 56.1819322562078%），从而触发 hydration mismatch 报错。 */
const DUST = Array.from({ length: 26 }, (_, i) => {
  const size = 1 + pseudo(i, 3) * 2.2
  const opacity = 0.14 + pseudo(i, 4) * 0.5
  return {
    left: (2 + pseudo(i, 1) * 96).toFixed(3),
    top: (4 + pseudo(i, 2) * 92).toFixed(3),
    sizePx: size.toFixed(2),
    glowPx: (size * 3.4).toFixed(2),
    opacity: opacity.toFixed(3),   // style 用（固定精度字符串）
    opacityNum: opacity,           // 动画用（数值）
    drift: 12 + pseudo(i, 6) * 30,
    delay: pseudo(i, 7) * 4,
    duration: 5 + pseudo(i, 5) * 8,
    tone: i % 7 === 0 ? C.mauve : i % 3 === 0 ? C.peri : C.paper,
  }
})

/** 人物周边的渐变星星：位置绕开面部，颜色全部取自立绘色阶的衍生色对 */
const SPARK_STARS = [
  { left: 70.2, top: 7.5, size: 18, o: 0.9, dur: 2.4, delay: 0.0, pair: 0 },
  { left: 74.5, top: 13.8, size: 11, o: 0.7, dur: 2.9, delay: 0.7, pair: 2 },
  { left: 66.4, top: 15.5, size: 14, o: 0.8, dur: 2.2, delay: 1.3, pair: 1 },
  { left: 64.0, top: 28.5, size: 20, o: 0.95, dur: 2.6, delay: 0.4, pair: 3 },
  { left: 67.2, top: 42.0, size: 12, o: 0.75, dur: 3.1, delay: 1.8, pair: 0 },
  { left: 63.2, top: 56.5, size: 16, o: 0.85, dur: 2.3, delay: 0.9, pair: 2 },
  { left: 68.4, top: 70.5, size: 13, o: 0.7, dur: 2.8, delay: 2.2, pair: 1 },
  { left: 65.0, top: 85.0, size: 19, o: 0.9, dur: 2.5, delay: 1.1, pair: 4 },
  { left: 99.2, top: 19.0, size: 15, o: 0.8, dur: 2.7, delay: 0.2, pair: 1 },
  { left: 100.4, top: 38.5, size: 10, o: 0.65, dur: 3.2, delay: 1.6, pair: 3 },
  { left: 98.6, top: 61.0, size: 17, o: 0.85, dur: 2.4, delay: 0.6, pair: 0 },
  { left: 99.6, top: 79.5, size: 12, o: 0.7, dur: 2.9, delay: 2.0, pair: 2 },
  { left: 71.8, top: 92.0, size: 14, o: 0.8, dur: 2.6, delay: 1.4, pair: 3 },
  { left: 78.6, top: 95.6, size: 18, o: 0.9, dur: 2.2, delay: 0.3, pair: 1 },
  { left: 88.2, top: 96.2, size: 11, o: 0.7, dur: 3.0, delay: 1.9, pair: 4 },
  { left: 94.2, top: 16.2, size: 13, o: 0.75, dur: 2.7, delay: 1.0, pair: 2 },
]

/** 渐变对：全部是立绘自家色阶的组合（钢蓝 / 藕荷 / 中亮 / 近白 + 品牌蓝） */
const SPARK_PAIRS: [string, string][] = [
  [C.peri, C.paper],
  [C.mauve, C.peri],
  [C.brand, C.mauve],
  [C.steel, C.paper],
  [C.navy, C.peri],
]

/** 调皮小点缀：爱心 / 星星，只落在留白处，不压文字 */
const CUTIES = [
  { left: 47.6, top: 68.0, glyph: "♡", size: 16, tone: C.mauve, delay: 0.3 },
  { left: 56.4, top: 79.5, glyph: "♡", size: 12, tone: C.brand, delay: 1.2 },
  { left: 92.2, top: 83.0, glyph: "♡", size: 14, tone: C.mauve, delay: 0.8 },
  { left: 43.4, top: 81.5, glyph: "♡", size: 11, tone: C.mauve, delay: 2.0 },
]

/** 底部频谱条：高度序列固定，做 HUD 质感（同样先格式化，避免 hydration 报错） */
const RULER = Array.from({ length: 48 }, (_, i) => ({
  h: (5 + pseudo(i, 9) * 26).toFixed(2),
  tone: i % 11 === 0 ? C.mauve : i % 5 === 0 ? C.brand : C.peri,
}))


/** 左边缘的竖排微缩文字（BD 封面常见的页边标注） */
const EDGE_TEXT = "DEEPSEEK · FLASH-V4 · ANTHRO 001 · "

/* --------------------------------------------------------------------------
   4. 页面
   -------------------------------------------------------------------------- */
export default function DeepSeekPosterPage() {
  const posterRef = useRef<HTMLDivElement>(null)
  const figureRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const fontCssRef = useRef("")
  const introRef = useRef<gsap.core.Timeline | null>(null)
  const loopsRef = useRef<gsap.core.Tween[]>([])
  const quickRef = useRef<Record<string, (v: number) => void>>({})
  const [exporting, setExporting] = useState(false)
  const [tip, setTip] = useState("")

  /* ---------------- 入场 + 常驻动效 ----------------
     入场统一用 fromTo 写死首尾值：from() 会把元素"当前值"当终点，
     dev 下二次挂载残留的行内样式会让动画变成 0→0，画面直接卡住。 */
  const play = useCallback(() => {
    if (!posterRef.current) return
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    introRef.current?.kill()
    introRef.current = null
    loopsRef.current.forEach((t) => t.kill())
    loopsRef.current = []

    if (!reduced) {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } })
      // 先铺景 → 再光 → 再人 → 最后文字自上而下逐层落位
      tl.fromTo(".p-bg", { opacity: 0 }, { opacity: 1, duration: 1.2 }, 0)
        .fromTo(".p-mesh", { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: 1.8 }, 0.05)
        .fromTo(".p-ghost", { opacity: 0, scale: 1.05 }, { opacity: 1, scale: 1, duration: 2.1, ease: "power2.out" }, 0.15)
        .fromTo(".p-grid", { opacity: 0 }, { opacity: 1, duration: 1.3 }, 0.2)
        .fromTo(".p-ring", { opacity: 0, scale: 0.86, rotation: -18 }, { opacity: 1, scale: 1, rotation: 0, duration: 1.9, ease: "power2.out" }, 0.45)
        .fromTo(".p-glow", { opacity: 0, scale: 0.82 }, { opacity: 1, scale: 1, duration: 1.8, ease: "power2.out" }, 0.55)
        .fromTo(".p-figure", { opacity: 0, yPercent: 7 }, { opacity: 1, yPercent: 0, duration: 1.8 }, 0.7)
        .fromTo(".p-dust", { opacity: 0 }, { opacity: (i: number) => DUST[i]?.opacityNum ?? 0.3, duration: 1.2, stagger: { each: 0.015, from: "random" } }, 0.95)
        .fromTo(".p-rule-top", { scaleX: 0 }, { scaleX: 1, duration: 1, transformOrigin: "left center" }, 0.9)
        .fromTo(".p-eyebrow", { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.7 }, 1.0)
        .fromTo(".p-band-back", { opacity: 0, xPercent: -3 }, { opacity: 1, xPercent: 0, duration: 2, ease: "power2.out" }, 1.05)
        .fromTo(".p-band", { opacity: 0, xPercent: 3 }, { opacity: 1, xPercent: 0, duration: 2, ease: "power2.out" }, 1.0)
        .fromTo(".p-glyph", { yPercent: 112 }, { yPercent: 0, duration: 1.15, ease: "power4.out", stagger: 0.11 }, 1.15)
        .fromTo(".p-hscan", { opacity: 0 }, { opacity: 0.9, duration: 0.8 }, 1.5)
        .fromTo(".p-rev", { opacity: 0, y: 14, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "back.out(1.8)" }, 1.15)
        .fromTo(".p-latin", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8 }, 1.3)
        .fromTo(".p-headline", { opacity: 0, y: 58, skewX: 8 }, { opacity: 1, y: 0, skewX: 0, duration: 1.1, ease: "power4.out" }, 1.35)
        .fromTo(".p-version", { opacity: 0, scale: 0.55 }, { opacity: 1, scale: 1, duration: 0.65, ease: "back.out(2.2)" }, 1.55)
        .fromTo(".p-slogan", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.75 }, 1.62)
        .fromTo(".p-kana", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.7 }, 1.7)
        .fromTo(".p-meta-row", { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08 }, 1.8)
        .fromTo(".p-side", { opacity: 0, y: -14 }, { opacity: 1, y: 0, duration: 0.8 }, 1.5)
        .fromTo(".p-edge", { opacity: 0 }, { opacity: 1, duration: 1.3 }, 1.25)
        .fromTo(".p-ruler span", { scaleY: 0, transformOrigin: "bottom center" }, { scaleY: 1, duration: 0.7, stagger: { each: 0.011 } }, 1.5)
        .fromTo(".p-frame", { opacity: 0 }, { opacity: 1, duration: 1 }, 1.4)
        .fromTo(".p-star", { opacity: 0, scale: 0.2, rotation: -40 }, { opacity: (i: number) => SPARK_STARS[i]?.o ?? 0.8, scale: 1, rotation: 0, duration: 0.9, ease: "back.out(2.2)", stagger: 0.07 }, 1.45)
        .fromTo(".p-cutie", { opacity: 0, scale: 0.3 }, { opacity: 0.85, scale: 1, duration: 0.7, ease: "back.out(2.6)", stagger: 0.12 }, 1.6)
        .fromTo(".p-mascot", { opacity: 0, y: 22, scale: 0.86 }, { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: "back.out(1.7)" }, 2.0)
        .fromTo(".p-credit", { opacity: 0 }, { opacity: 1, duration: 0.8 }, 2.4)
      introRef.current = tl
    }

    /* 常驻循环：双环反向缓慢自转 / 辉光呼吸 / 人物轻浮 / 星尘闪烁（没有横扫光线） */
    const push = (t: gsap.core.Tween) => loopsRef.current.push(t)
    push(gsap.to(".p-ring-spin", { rotation: 360, duration: 120, repeat: -1, ease: "none", transformOrigin: "50% 50%" }))
    push(gsap.to(".p-glow", { opacity: 0.8, scale: 1.05, duration: 5.2, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 2.2 }))
    push(gsap.to(".p-figure-inner", { y: -9, duration: 8, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 2.4 }))
    push(gsap.to(".p-ghost img", { y: -12, duration: 12, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 2.6 }))
    push(gsap.to(".p-mesh", { x: 16, duration: 11, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 2.4 }))
    push(gsap.to(".p-band", { x: -14, duration: 14, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 2.6 }))
    // 残影呼吸（很轻，只做"活着"的感觉）
    push(gsap.to(".p-ghost", { opacity: 0.84, duration: 7.5, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 2.8 }))
    // 沿地平线滑过的高光：只在这条线上跑，不是全屏扫光
    push(gsap.fromTo(".p-hscan", { xPercent: -120 }, { xPercent: 340, duration: 5.6, repeat: -1, ease: "power1.inOut", repeatDelay: 1.8, delay: 2.4 }))
    // 频谱条像电平表一样持续轻微跳动
    push(gsap.to(".p-ruler span", { scaleY: 0.5, duration: 1.5, repeat: -1, yoyo: true, ease: "sine.inOut", stagger: { each: 0.055, from: "random" }, delay: 2.2 }))
    // 环内两层 ping：向外扩散淡出
    push(gsap.fromTo(".p-ping", { scale: 0.52, opacity: 0.5 }, { scale: 1.04, opacity: 0, duration: 3.6, repeat: -1, ease: "power1.out", repeatDelay: 1.1, delay: 2.2, transformOrigin: "50% 50%" }))
    push(gsap.fromTo(".p-ping-2", { scale: 0.6, opacity: 0.42 }, { scale: 1.06, opacity: 0, duration: 4.4, repeat: -1, ease: "power1.out", repeatDelay: 2.4, delay: 3.4, transformOrigin: "50% 50%" }))
    // 人物周边的渐变星：各自不同周期地"呼吸式"闪烁
    posterRef.current.querySelectorAll<HTMLElement>(".p-star").forEach((el, i) => {
      const sp = SPARK_STARS[i]
      if (!sp) return
      push(gsap.to(el, {
        opacity: sp.o * 0.25,
        scale: 0.68,
        rotation: i % 2 ? 22 : -22,
        duration: sp.dur,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: 2 + sp.delay,
      }))
    })
    // 吉祥物上下浮动 + 小点缀闪烁
    push(gsap.to(".p-mascot-bob", { y: -7, duration: 2.8, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 2.6 }))
    posterRef.current.querySelectorAll<HTMLElement>(".p-cutie").forEach((el, i) => {
      const d = CUTIES[i]?.delay ?? 0
      push(gsap.to(el, { opacity: 0.28, scale: 0.82, rotation: i % 2 ? 14 : -14, duration: 1.9 + d, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 2.2 + d }))
    })
    // 反白条与版本方块轻微呼吸，避免画面完全静止
    push(gsap.to(".p-rev", { y: -3, duration: 3.4, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 2.6 }))
    posterRef.current.querySelectorAll<HTMLElement>(".p-dust").forEach((el, i) => {
      const d = DUST[i]
      if (!d) return
      push(
        gsap.to(el, {
          y: -d.drift,
          x: (pseudo(i, 31) - 0.5) * 16,
          opacity: d.opacityNum * 0.22,
          duration: d.duration,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: 2 + d.delay,
        })
      )
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

  /* ---------------- 鼠标视差：景 / 环 / 人 / 字 分层位移 ---------------- */
  useEffect(() => {
    const figure = figureRef.current
    const glow = glowRef.current
    const ring = ringRef.current
    if (!figure || !glow || !ring) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    quickRef.current = {
      fx: gsap.quickTo(figure, "x", { duration: 1, ease: "power3" }),
      fy: gsap.quickTo(figure, "yPercent", { duration: 1, ease: "power3" }),
      gx: gsap.quickTo(glow, "x", { duration: 1.5, ease: "power3" }),
      rx: gsap.quickTo(ring, "x", { duration: 1.7, ease: "power3" }),
      ry: gsap.quickTo(ring, "y", { duration: 1.7, ease: "power3" }),
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
    q.fy?.(py * -2.2)
    q.gx?.(px * 18)
    q.rx?.(px * -26)
    q.ry?.(py * -16)
  }

  const onPointerLeave = () => {
    const q = quickRef.current
    q.fx?.(0)
    q.fy?.(0)
    q.gx?.(0)
    q.rx?.(0)
    q.ry?.(0)
  }

  /* ---------------- 导出海报（2 倍图） ---------------- */
  const exportPng = async () => {
    const poster = posterRef.current
    if (!poster || exporting) return
    setExporting(true)
    setTip("正在合成…")
    gsap.set([figureRef.current, glowRef.current, ringRef.current], { x: 0, y: 0 })
    // 入场时间轴推到终态：动画没跑完就点导出时，文字还停在 opacity 0，成图会缺内容
    introRef.current?.progress(1)
    gsap.set(figureRef.current, { yPercent: 0 })
    // 导出前隐藏纯装饰层（星尘 / 频谱条）：成品更干净，同时让 foreignObject 少 70+ 个节点。
    // 否则 600 万像素 + 嵌入几 MB 字体时，浏览器栅格化会静默丢掉一部分内容。
    const decor = Array.from(poster.querySelectorAll<HTMLElement>(".p-dust, .p-ruler"))
    decor.forEach((el) => (el.style.visibility = "hidden"))
    try {
      if (!fontCssRef.current) fontCssRef.current = await getFontEmbedCSS(poster)
      // 像素比按宽度封顶，视口越大越压，保证栅格化压力可控
      const ratio = Math.min(2, 2600 / Math.max(1, poster.getBoundingClientRect().width))
      const dataUrl = await toPng(poster, {
        pixelRatio: ratio,
        cacheBust: true,
        backgroundColor: C.ink,
        fontEmbedCSS: fontCssRef.current,
      })
      const a = document.createElement("a")
      a.href = dataUrl
      a.download = `deepseek-flash-v4-poster-${Date.now()}.png`
      a.click()
      setTip("已保存 2 倍高清图")
    } catch (err) {
      // 不静默吞掉，控制台留痕方便排查
      console.error("[deepseek-poster] 导出失败:", err)
      setTip("导出失败，可直接截图保存")
    } finally {
      decor.forEach((el) => (el.style.visibility = ""))
      setExporting(false)
      window.setTimeout(() => setTip(""), 3600)
    }
  }

  /* -------------------------------------------------------------------------- */
  return (
    <div
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={`${POSTER_SHELL} relative overflow-hidden bg-[#08091A] text-[#F7F0F5] selection:bg-[#4D6BFE]/40`}
    >
      {/* ============================ 海报本体（导出对象） ============================ */}
      <section ref={posterRef} className={POSTER_SURFACE}>
        {/* 底色：人物同色系的深靛蓝渐变 */}
        <div
          className="p-bg absolute inset-0"
          style={{
            background: `linear-gradient(168deg, #14163A 0%, ${C.deep} 34%, #2A2456 70%, #0C0C20 100%)`,
          }}
        />
        {/* 色彩网格：人物主色 / 中深色 / 藕荷，各铺一块，画面不塌成死黑 */}
        <div className="p-mesh pointer-events-none absolute inset-0">
          <div
            className="absolute -left-[10%] top-[-16%] h-[78%] w-[54%] rounded-full opacity-75"
            style={{ background: `radial-gradient(closest-side, ${C.navy}, transparent 74%)` }}
          />
          <div
            className="absolute bottom-[-22%] left-[6%] h-[58%] w-[42%] rounded-full opacity-60"
            style={{ background: `radial-gradient(closest-side, ${C.mauve}, transparent 76%)` }}
          />
          <div
            className="absolute right-[-8%] top-[2%] h-[86%] w-[52%] rounded-full opacity-80"
            style={{ background: `radial-gradient(closest-side, ${C.steel}, transparent 74%)` }}
          />
        </div>

        {/* 人物残影：同一张立绘放大、半透明、去饱和后压在主体后面，
            填住中段留白，同时把左中右三块串成一体（动画海报常用手法） */}
        <div className="p-ghost pointer-events-none absolute inset-0">
          <div className="absolute left-[27%] top-[10%] h-[160%] opacity-[.20]">
            {/* 不加任何滤镜：就是原图本身 + 半透明 */}
            <div className="relative h-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={FIGURE_SRC} alt="" aria-hidden className="h-full w-auto max-w-none object-contain" />
            </div>
          </div>
          {/* 残影的溶解遮罩：往左、往下化进底色，不跟文字与主体抢 */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(96deg, #08091A 4%, rgba(8,9,26, 0.72) 26%, rgba(8,9,26, 0.18) 48%, transparent 68%), linear-gradient(0deg, #08091A 2%, rgba(8,9,26, 0.35) 22%, transparent 46%)",
            }}
          />
        </div>

        {/* 竖向结构线：只留三分之一处三根，比密密麻麻的网格更有版式感 */}
        <div
          className="p-grid pointer-events-none absolute inset-0 opacity-[.55]"
          style={{
            backgroundImage: `linear-gradient(90deg, ${C.line} 0 1px, transparent 1px), linear-gradient(90deg, ${C.line} 0 1px, transparent 1px), linear-gradient(90deg, ${C.line} 0 1px, transparent 1px)`,
            backgroundSize: "100% 100%",
            backgroundPosition: "33.33% 0, 66.66% 0, 100% 0",
          }}
        />

        {/* 半调网点：印刷质感 */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[.28]"
          style={{
            backgroundImage: `radial-gradient(${C.paperGhost} 1.1px, transparent 1.2px)`,
            backgroundSize: "22px 22px",
          }}
        />

        {/* 环形刻度：人物头部后方的"轨道/量规"，极缓自转 */}
        <div
          ref={ringRef}
          className="pointer-events-none absolute left-[52%] top-[-24%] h-[88%] w-[52%]"
        >
          <div className="p-ring p-ring-spin absolute inset-0">
            <svg viewBox="0 0 600 600" className="h-full w-full" fill="none">
              <circle cx="300" cy="300" r="286" stroke="rgba(247,240,245, 0.14)" strokeWidth="1" />
              <circle cx="300" cy="300" r="286" stroke="rgba(247,240,245, 0.30)" strokeWidth="7" strokeDasharray="1.5 26" />
              <circle cx="300" cy="300" r="232" stroke="rgba(77,107,254, 0.42)" strokeWidth="1.2" />
              <circle cx="300" cy="300" r="176" stroke="rgba(197,188,210, 0.26)" strokeWidth="1" strokeDasharray="1 11" />
              <circle cx="300" cy="300" r="120" stroke="rgba(130,144,186, 0.34)" strokeWidth="1" />
            </svg>
          </div>
        </div>

        {/* 巨型汉字色带：整幅横向铺满、左右略微出血，人物压在它前面形成层次。
            两遍错位叠印（品牌蓝 + 浅灰）做出"套印"的力度，这是整张海报的主视觉 */}
        <div className="p-band pointer-events-none absolute left-[-1%] top-[25%] select-none whitespace-nowrap">
          <div className="relative text-[clamp(100px,19.6vw,312px)] font-black tracking-[-.035em]">
            <span aria-hidden className="p-band-back absolute left-[-11px] top-[11px]" style={{ color: `rgba(77,107,254, 0.26)` }}>
              {COPY.mark}
            </span>
            {/* 每个字母单独包一层 overflow 遮罩，入场时逐字从下往上顶出来 */}
            <span className="relative flex leading-[.86]">
              {COPY.mark.split("").map((ch, i) => (
                <span key={i} className="inline-block overflow-hidden leading-[1.04]">
                  <span className="p-glyph inline-block" style={{ color: `rgba(197,188,210, 0.32)` }}>
                    {ch}
                  </span>
                </span>
              ))}
            </span>
          </div>
        </div>

        {/* 环内 ping：两层向外扩散并淡出，做出"雷达/轨道"的活性 */}
        <div className="p-ping pointer-events-none absolute left-[52%] top-[-24%] h-[88%] w-[52%]">
          <div className="absolute inset-[14%] rounded-full border" style={{ borderColor: `rgba(247,240,245, 0.30)` }} />
        </div>
        <div className="p-ping-2 pointer-events-none absolute left-[52%] top-[-24%] h-[88%] w-[52%]">
          <div className="absolute inset-[26%] rounded-full border" style={{ borderColor: `rgba(77,107,254, 0.42)` }} />
        </div>

        {/* 人物背后的体积辉光：收紧成一束"打光"，人物质感靠它立住 */}
        <div
          ref={glowRef}
          className="p-glow pointer-events-none absolute right-[-2%] top-[-4%] h-[104%] w-[56%]"
          style={{
            background: `radial-gradient(closest-side, rgba(160,175,225, 0.62) 0%, rgba(95,105,157, 0.34) 40%, rgba(77,107,254, 0.16) 62%, transparent 78%)`,
          }}
        />

        {/* 地平线光带：给人物一个"站位"，同时提供一条有分量的横向结构（只走右 60%，不碰文字列）*/}
        <div
          className="p-horizon pointer-events-none absolute inset-x-0 top-[62%] h-px"
          style={{
            background: `linear-gradient(90deg, transparent 0%, transparent 40%, rgba(197,188,210, 0.30) 52%, rgba(247,240,245, 0.72) 74%, rgba(197,188,210, 0.30) 92%, transparent 100%)`,
          }}
        />
        <div
          className="p-hscan pointer-events-none absolute left-[38%] top-[62%] h-px w-[16%] opacity-90"
          style={{ background: `linear-gradient(90deg, transparent 0%, rgba(247,240,245, 0.85) 50%, transparent 100%)` }}
        />
        <div
          className="p-horizon pointer-events-none absolute inset-x-0 top-[62%] h-[18%] -translate-y-1/2"
          style={{
            background: `radial-gradient(46% 50% at 76% 50%, rgba(130,144,186, 0.34) 0%, transparent 72%)`,
          }}
        />

        {/* 右侧立绘：底边出血，靠两层 drop-shadow 打边缘光 */}
        <div ref={figureRef} className="p-figure pointer-events-none absolute inset-0">
          <div className="p-figure-inner absolute bottom-[-9.5%] right-[-2%] h-[109%]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={FIGURE_SRC}
              alt="DeepSeek-Flash-V4 娘化立绘"
              className="h-full w-auto max-w-none object-contain"
              style={{
                filter:
                  "drop-shadow(0 0 14px rgba(170,185,230, 0.50)) drop-shadow(0 0 46px rgba(77,107,254, 0.28))",
              }}
            />
          </div>
          {/* 底部渐隐，让人物落进深底 */}
          <div
            className="absolute inset-x-0 bottom-0 h-[22%]"
            style={{ background: `linear-gradient(180deg, transparent 0%, rgba(10,10,28, 0.72) 58%, ${C.ink} 100%)` }}
          />
        </div>

        {/* 星尘 */}
        <div className="pointer-events-none absolute inset-0">
          {DUST.map((d, i) => (
            <span
              key={i}
              className="p-dust absolute rounded-full"
              style={{
                left: `${d.left}%`,
                top: `${d.top}%`,
                width: `${d.sizePx}px`,
                height: `${d.sizePx}px`,
                opacity: d.opacity,
                background: d.tone,
                boxShadow: `0 0 ${d.glowPx}px ${d.tone}`,
              }}
            />
          ))}
        </div>

        {/* 调皮小点缀：爱心与星星 */}
        <div className="pointer-events-none absolute inset-0">
          {CUTIES.map((c, i) => (
            <span
              key={i}
              className="p-cutie absolute select-none leading-none"
              style={{ left: `${c.left}%`, top: `${c.top}%`, fontSize: c.size, color: c.tone }}
            >
              {c.glyph}
            </span>
          ))}
        </div>

        {/* 吉祥物：吃白饭的大肥鱼（蹲在留白处吐泡泡） */}
        <div className="p-mascot pointer-events-none absolute bottom-[17%] left-[49%] w-[clamp(72px,7.2vw,112px)]">
          <div className="p-mascot-bob">
            <svg viewBox="0 0 24 24" className="w-full" aria-hidden style={{ color: C.paper, filter: `drop-shadow(0 0 18px rgba(77,107,254, 0.55))` }} fill="currentColor">
              <path d="M23.748 4.651c-.254-.124-.364.113-.512.233-.051.04-.094.09-.137.137-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.155-.708-.311-.955-.65-.172-.24-.219-.509-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.094.172.187.129.323-.082.28-.18.553-.266.833-.055.179-.137.218-.328.14a5.5 5.5 0 0 1-1.737-1.179c-.857-.828-1.631-1.743-2.597-2.46a12 12 0 0 0-.689-.47c-.985-.957.13-1.743.387-1.836.27-.098.094-.433-.778-.428-.872.003-1.67.295-2.687.685a3 3 0 0 1-.465.136 9.6 9.6 0 0 0-2.883-.101c-1.885.21-3.39 1.1-4.497 2.622C.082 8.776-.231 10.854.152 13.02c.403 2.284 1.568 4.175 3.36 5.653 1.857 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.132-.284 4.994-1.86.47.234.962.328 1.78.398.629.058 1.235-.031 1.705-.129.735-.155.684-.836.418-.961-2.155-1.004-1.682-.595-2.112-.926 1.095-1.295 2.768-3.598 3.284-6.733.05-.346.115-.834.108-1.114-.004-.171.035-.238.23-.257a4.2 4.2 0 0 0 1.545-.475c1.397-.763 1.96-2.016 2.093-3.517.02-.23-.004-.467-.247-.588M11.58 18.168c-2.088-1.642-3.101-2.183-3.52-2.16-.39.024-.32.472-.234.763.09.288.207.487.371.74.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.168-1.361-.801-2.5-1.86-3.301-3.306-.775-1.393-1.225-2.888-1.299-4.482-.02-.385.094-.522.477-.592a4.7 4.7 0 0 1 1.53-.038c2.131.311 3.946 1.264 5.467 2.774.868.86 1.525 1.887 2.202 2.89.72 1.066 1.494 2.082 2.48 2.915.348.291.626.513.892.677-.802.09-2.14.109-3.055-.615zm1.001-6.44a.306.306 0 0 1 .415-.287.3.3 0 0 1 .113.074.3.3 0 0 1 .086.214c0 .17-.136.307-.308.307a.303.303 0 0 1-.306-.307m3.11 1.596c-.2.081-.4.151-.591.16a1.25 1.25 0 0 1-.798-.254c-.274-.23-.47-.358-.551-.758a1.7 1.7 0 0 1 .015-.588c.07-.327-.007-.537-.238-.727-.188-.156-.426-.199-.689-.199a.6.6 0 0 1-.254-.078.253.253 0 0 1-.114-.358 1 1 0 0 1 .192-.21c.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.392.451.462.576.685.915.176.264.336.536.446.848.066.194-.02.353-.25.45" />
            </svg>
          </div>
          <div className="p-mascot-tag mt-1 flex justify-center">
            <span
              className="rounded-full border px-2.5 py-1 text-[10px] tracking-[.12em]"
              style={{ borderColor: C.line, color: C.paperSoft, background: `rgba(10,10,28, 0.6)`, transform: "rotate(-3deg)" }}
            >
              {COPY.mascot}
            </span>
          </div>
        </div>

        {/* 人物周边的渐变星星：四角星用 SVG 路径 + 渐变填充（文字符号上不了渐变），
            位置贴着人物轮廓绕一圈，微微闪烁 */}
        <div className="pointer-events-none absolute inset-0">
          {SPARK_STARS.map((sp, i) => {
            const [c1, c2] = SPARK_PAIRS[sp.pair] ?? SPARK_PAIRS[0]
            return (
              <span
                key={i}
                className="p-star absolute"
                style={{
                  left: `${sp.left}%`,
                  top: `${sp.top}%`,
                  width: `${sp.size}px`,
                  height: `${sp.size}px`,
                  opacity: sp.o,
                }}
              >
                <svg viewBox="0 0 24 24" className="h-full w-full">
                  <defs>
                    <linearGradient id={`star-grad-${i}`} x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={c1} />
                      <stop offset="100%" stopColor={c2} />
                    </linearGradient>
                  </defs>
                  <path
                    d="M12 0c.9 6.6 4.5 10.2 12 12-7.5 1.8-11.1 5.4-12 12-.9-6.6-4.5-10.2-12-12C7.5 10.2 11.1 6.6 12 0Z"
                    fill={`url(#star-grad-${i})`}
                  />
                </svg>
              </span>
            )
          })}
        </div>

        {/* ---------------- 字体主导版式 ---------------- */}

        {/* 顶部一行：企划代号 · 反白品牌条 · 版本号 */}
        <div className="absolute inset-x-0 top-[7.5%] flex items-center gap-[2.5%] pl-[5.5%] pr-[5%]">
          <div className="p-eyebrow flex shrink-0 items-center gap-3">
            <span className="p-rule-top h-px w-10" style={{ background: C.mauve }} />
            <span className="text-[10px] font-medium tracking-[.42em]" style={{ color: C.paperSoft }}>
              {COPY.eyebrow}
            </span>
          </div>
          {/* 反白条：品牌蓝实底 + 底色文字挖空，版式里最"响"的小元素 */}
          <div className="p-rev flex shrink-0 items-center gap-3 px-4 py-2" style={{ background: C.brand, transform: "rotate(-1.6deg)" }}>
            <span className="text-[9px] font-semibold tracking-[.34em]" style={{ color: C.ink }}>
              DEEPSEEK FLASH-V4
            </span>
            <span className="h-3 w-px" style={{ background: `rgba(8,9,26, 0.45)` }} />
            <span className="text-[9px] font-semibold tracking-[.34em]" style={{ color: C.ink }}>
              ANTHRO 001
            </span>
          </div>
          <div
            className="p-version ml-auto grid h-[clamp(38px,4.4vw,62px)] w-[clamp(38px,4.4vw,62px)] shrink-0 place-items-center border text-[clamp(14px,1.6vw,22px)] font-black leading-none"
            style={{ borderColor: C.line, color: C.paper }}
          >
            {COPY.version}
          </div>
        </div>

        {/* 底部大字组：FLASH 特大号 + 版本方块 + 拉丁字 + 标语 + 编号式技术信息 */}
        <div className="absolute inset-x-0 bottom-[5.5%] pl-[5.5%] pr-[4%]">
          {/* 第 1 行：FLASH 特大号 + 版本方块 */}
          <div className="p-headline flex items-end gap-4">
            <span className="text-[clamp(70px,11.4vw,176px)] font-black leading-[.78] tracking-[-.055em]" style={{ color: C.paper }}>
              {COPY.headline}
            </span>
            <span
              className="p-version mb-2 grid place-items-center font-black leading-none"
              style={{ width: "clamp(42px,5.2vw,80px)", height: "clamp(42px,5.2vw,80px)", fontSize: "clamp(15px,1.9vw,28px)", background: C.brand, color: C.paper }}
            >
              {COPY.version}
            </span>
          </div>

          {/* 第 2 行：拉丁字 + 细线 */}
          <div className="p-latin mt-6 flex items-center gap-4">
            <span className="shrink-0 text-[clamp(10px,1.05vw,14px)] font-medium tracking-[.42em]" style={{ color: C.paperSoft }}>
              {COPY.kanaName}
            </span>
            <span className="h-px w-[26%] shrink-0" style={{ background: `linear-gradient(90deg, ${C.line}, transparent)` }} />
          </div>

          {/* 第 3 行：标语独立一行 */}
          <p className="p-slogan mt-4 font-['myFont',sans-serif] text-[clamp(14px,1.5vw,21px)] tracking-[.06em]" style={{ color: C.paper }}>
            {COPY.slogan}
          </p>

          {/* 第 4 行：编号式技术信息 */}
          <div className="mt-6 flex flex-wrap items-baseline gap-x-8 gap-y-2">
            {META.map(([k, v], i) => (
              <span key={k} className="p-meta-row flex items-baseline gap-2.5">
                <span className="font-mono text-[9px]" style={{ color: C.brand }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[9px] tracking-[.3em]" style={{ color: C.paperFaint }}>
                  {k}
                </span>
                <span className="font-mono text-[11px] tracking-[.14em]" style={{ color: C.paperSoft }}>
                  {v}
                </span>
              </span>
            ))}
          </div>
        </div>
        {/* 顶部频谱条：HUD 质感 */}
        <div className="p-ruler pointer-events-none absolute top-[3.6%] left-[6.5%] right-[6.5%]">
          <div className="flex h-7 items-end justify-between gap-[4px]">
            {RULER.map((b, i) => (
              <span key={i} style={{ width: "2px", height: `${b.h}px`, background: b.tone, opacity: 0.34 }} />
            ))}
          </div>
          <div className="mt-1.5 h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${C.line}, transparent)` }} />
        </div>

        {/* 页边竖排微缩字 */}
        <div
          className="p-edge pointer-events-none absolute bottom-[5%] left-[1.8%] text-[7.5px] tracking-[.34em]"
          style={{ writingMode: "vertical-rl", color: C.paperFaint }}
        >
          {EDGE_TEXT.repeat(1)}
        </div>

        {/* 内框 + 四角对位记号 */}
        <div className="p-frame pointer-events-none absolute inset-[3.2%]">
          <div className="absolute inset-0 border" style={{ borderColor: C.lineSoft }} />
          <div className="absolute inset-x-0 top-0 h-px" style={{ background: C.line }} />
          {["left-0 top-0", "right-0 top-0", "left-0 bottom-0", "right-0 bottom-0"].map((pos) => (
            <span key={pos} className={`absolute ${pos} h-2.5 w-2.5`}>
              <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2" style={{ background: C.line }} />
              <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2" style={{ background: C.line }} />
            </span>
          ))}
          <span
            className="p-credit absolute bottom-[-1px] right-0 translate-y-full pt-2 font-mono text-[9px] tracking-[.28em]"
            style={{ color: C.paperFaint }}
          >
            {COPY.credit}
          </span>
        </div>

        {/* 暗角 + 顶部压暗：把视线收进画面中央 */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 78% at 62% 46%, transparent 34%, rgba(6,6,18, 0.52) 100%), linear-gradient(180deg, rgba(6,6,18, 0.45) 0%, transparent 22%)",
          }}
        />
      </section>

      {/* ============================ 页面浮层（不参与导出） ============================ */}
      <div className={POSTER_OVERLAY}>
        <div className="pointer-events-auto">
          <Breadcrumb variant="dark" />
        </div>
        <div className="pointer-events-auto flex items-center gap-3">
          {tip && <span className="text-[11px] text-[#8290BA]">{tip}</span>}
          <button
            type="button"
            onClick={exportPng}
            disabled={exporting}
            className="flex items-center gap-2 rounded-full border border-[#C5BCD2]/25 bg-white/[.06] px-4 py-2 text-[11.5px] text-[#F7F0F5]/75 transition-colors hover:border-[#C5BCD2]/50 hover:text-[#F7F0F5] disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            {exporting ? "合成中…" : "保存海报"}
          </button>
        </div>
      </div>
    </div>
  )
}
