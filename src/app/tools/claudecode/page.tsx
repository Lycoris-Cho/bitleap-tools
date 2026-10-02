"use client"


import { useCallback, useEffect, useRef, useState } from "react"
import { gsap } from "gsap"
import { Download } from "lucide-react"
import { getFontEmbedCSS, toPng } from "html-to-image"
import { Breadcrumb } from "@/components/breadcrumb"
import { POSTER_OVERLAY, POSTER_SHELL, POSTER_SURFACE } from "@/components/PosterShell"

const FIGURE_SRC = "/image/ClaudeCode.png"

const COPY = {
  eyebrow: "ANTHROPOMORPHISM", // 品类小字
  series: "002", // 系列号
  mastheadLeft: "CLAUDE", // 巨型字：头部左侧
  mastheadRight: "CODE", // 巨型字：头部右侧
  latin: "ANTHROPIC · CLAUDECODE",
  kana: "クラウドコード",
  headline: "把重复交给我", // 底部中文主张
  slogan: "写你想写的，剩下的我来跑。",
  version: "V1",
  side: "在终端里等你",
  mascot: "看我治不治你就完了",
  credit: "BitLeap 海报合成",
  edge: "CLAUDECODE · ANTHRO 002 · 印刷套准 K 1 2 3 4 · ",
}

const META: [string, string][] = [
  ["RUNTIME", "CLAUDECODE-CLI"],
  ["SERIES", "ANTHRO / 002"],
  ["RENDER", "2026.09"],
]

/* --------------------------------------------------------------------------
   2. 设计 token —— 全部来自立绘采样
   -------------------------------------------------------------------------- */
const C = {
  paper: "#FBF5EE", // 纸白（立绘衣服色）→ 底色
  paper2: "#F4E7D8", // 纸的第二层
  sand: "#E5CDC4", // 立绘灰粉褐 → 中间调
  taupe: "#C8AAA4", // 立绘灰粉
  clay: "#C75837", // 立绘深赭 → 次强调
  coral: "#E97849", // 立绘珊瑚橙 → 唯一强调色
  ink: "#2A211F", // 深暖褐 → 文字
  ink2: "#473635", // 次深
  deep: "#251B1A", // 最深（头发）
  inkSoft: "rgba(42,33,31, 0.74)",
  inkFaint: "rgba(42,33,31, 0.44)",
  inkGhost: "rgba(42,33,31, 0.13)",
  line: "rgba(42,33,31, 0.18)",
  lineSoft: "rgba(42,33,31, 0.09)",
  coralSoft: "rgba(233,120,73, 0.55)",
  coralFaint: "rgba(233,120,73, 0.22)",
}

/* --------------------------------------------------------------------------
   3. 装饰元素：确定性伪随机（SSR / CSR 一致，不会有 hydration 警告）
   -------------------------------------------------------------------------- */
function pseudo(i: number, salt: number) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

/** 人物周围的四角星（和 About 页同一个形状：内凹边的四角星，各自带渐变）
    坐标是相对"立绘的框"的百分比 —— 挂在立绘容器里，
    所以任何视口比例下都稳定地绕在人物周围，不会因为窗口变窄而飘到脸上。
    位置全部避开面部与所有文字块。 */
const STARS = [
  { left: 33.5, top: 7.0, size: 17, o: 0.92, dur: 2.6, delay: 0.0, pair: 0 },
  { left: 31.2, top: 19.5, size: 12, o: 0.72, dur: 3.1, delay: 0.9, pair: 2 },
  { left: 66.8, top: 5.5, size: 14, o: 0.8, dur: 2.9, delay: 0.5, pair: 1 },
  { left: 69.0, top: 17.0, size: 20, o: 0.95, dur: 2.4, delay: 1.4, pair: 3 },
  { left: 25.0, top: 33.0, size: 13, o: 0.78, dur: 2.8, delay: 1.1, pair: 2 },
  { left: 76.2, top: 31.0, size: 11, o: 0.7, dur: 3.2, delay: 0.3, pair: 0 },
  { left: 21.0, top: 45.5, size: 16, o: 0.86, dur: 2.5, delay: 1.7, pair: 4 },
  { left: 79.4, top: 43.0, size: 13, o: 0.76, dur: 2.9, delay: 0.8, pair: 1 },
  { left: 15.2, top: 57.5, size: 11, o: 0.66, dur: 3.3, delay: 2.0, pair: 3 },
  { left: 85.4, top: 55.5, size: 17, o: 0.88, dur: 2.6, delay: 1.2, pair: 2 },
  { left: 11.4, top: 69.0, size: 12, o: 0.7, dur: 3.0, delay: 2.3, pair: 0 },
  { left: 89.2, top: 67.0, size: 14, o: 0.8, dur: 2.7, delay: 0.6, pair: 4 },
  { left: 7.2, top: 79.5, size: 10, o: 0.6, dur: 3.4, delay: 1.9, pair: 1 },
  { left: 92.6, top: 77.0, size: 12, o: 0.72, dur: 3.0, delay: 2.5, pair: 3 },
  { left: 36.4, top: 2.8, size: 11, o: 0.66, dur: 2.8, delay: 1.6, pair: 0 },
  { left: 63.2, top: 2.0, size: 13, o: 0.78, dur: 2.5, delay: 0.4, pair: 2 },
]

/** Claude 官方标志（24×24 单路径，矢量取自 simple-icons，CC0）。
    之前这里是按星芒特征几何构造的近似，现在换成了真标。 */
const CLAUDE_PATH =
  "m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z"

/** 四角星的路径（24×24 视图盒），SVG 里靠 transform 摆放和缩放 */
const STAR_PATH =
  "M12 0C12.7 6.7 17.3 11.3 24 12C17.3 12.7 12.7 17.3 12 24C11.3 17.3 6.7 12.7 0 12C6.7 11.3 11.3 6.7 12 0Z"

/** 右侧的"星尾"图案：从左上往右下、由大到小的一串四角星。
    刻意排成一条有秩序的斜线（不是散点），用来撑住右侧的留白。 */
const CLUSTER_STARS = [
  { x: 2, y: 0, scale: 1.5, o: 0.5, tone: C.coral },
  { x: 32, y: 24, scale: 1.12, o: 0.42, tone: C.clay },
  { x: 54, y: 50, scale: 0.84, o: 0.36, tone: C.coral },
  { x: 70, y: 74, scale: 0.62, o: 0.3, tone: C.taupe },
  { x: 82, y: 96, scale: 0.46, o: 0.26, tone: C.clay },
  { x: 90, y: 116, scale: 0.32, o: 0.22, tone: C.coral },
]

/** 四角星的渐变对：全部取自立绘采样出来的色阶 */
const STAR_PAIRS: [string, string][] = [
  [C.coral, C.paper],
  [C.clay, C.sand],
  [C.coral, C.taupe],
  [C.sand, C.paper],
  [C.clay, C.coral],
]

/** 底部的条码块：宽度序列固定，做印刷品的收尾质感 */
const BARS = Array.from({ length: 34 }, (_, i) => ({
  w: (1 + Math.round(pseudo(i, 9) * 3)).toFixed(0),
  h: (14 + pseudo(i, 11) * 30).toFixed(0),
  tone: i % 9 === 0 ? C.coral : i % 4 === 0 ? C.clay : C.ink,
}))

/** 印章外圈的一圈刻度 */
const STAMP_TICKS = Array.from({ length: 36 }, (_, i) => i * 10)

/* --------------------------------------------------------------------------
   4. 页面
   -------------------------------------------------------------------------- */
export default function ClaudeCodePosterPage() {
  const posterRef = useRef<HTMLDivElement>(null)
  const figureRef = useRef<HTMLDivElement>(null)
  const washRef = useRef<HTMLDivElement>(null)
  const dashesRef = useRef<HTMLDivElement>(null)
  const haloRef = useRef<HTMLDivElement>(null)
  const fontCssRef = useRef("")
  const introRef = useRef<gsap.core.Timeline | null>(null)
  const loopsRef = useRef<gsap.core.Tween[]>([])
  const quickRef = useRef<Record<string, (v: number) => void>>({})
  const [exporting, setExporting] = useState(false)
  const [tip, setTip] = useState("")

  /* ---------------- 入场 + 常驻动效 ----------------
     统一用 fromTo 写死首尾值：from() 会把元素"当前值"当终点，
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
      // 印刷顺序：先纸 → 再渐变底色 → 印版轮 → 光 → 人 → 最后字自上而下
      tl.fromTo(".p-bg", { opacity: 0 }, { opacity: 1, duration: 1 }, 0)
        .fromTo(".p-wash", { opacity: 0, scale: 1.1 }, { opacity: 1, scale: 1, duration: 1.9 }, 0.05)
        .fromTo(".p-dashes", { opacity: 0, scale: 0.88 }, { opacity: 1, scale: 1, duration: 2, ease: "power2.out" }, 0.35)
        .fromTo(".p-halo", { opacity: 0, scale: 0.86 }, { opacity: 1, scale: 1, duration: 1.8, ease: "power2.out" }, 0.5)
        // 残影比主体早一点、淡一点地先浮出来，主体再压上去
        .fromTo(".p-ghost", { opacity: 0, scale: 1.06 }, { opacity: 1, scale: 1, duration: 2.2, ease: "power2.out" }, 0.3)
        // 人物连同它的珊瑚色版一起"对位"：从右侧偏进来再落到正位
        .fromTo(".p-figure", { opacity: 0, x: 26 }, { opacity: 1, x: 0, duration: 1.9, ease: "power2.out" }, 0.62)
        .fromTo(".p-rule-top", { scaleX: 0 }, { scaleX: 1, duration: 1.1, transformOrigin: "left center" }, 0.95)
        // 两行字都从左往右擦除（CODE 现在叠在 CLOUD 下面，方向必须一致）
        .fromTo(".p-wipe-l", { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 1.1, ease: "power4.out" }, 1.0)
        .fromTo(".p-wipe-r", { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 1.1, ease: "power4.out" }, 1.2)
        // 套印的珊瑚色版：滑进对位（错位 → 对齐）
        .fromTo(".p-plate-l", { x: 40, opacity: 0 }, { x: 11, opacity: 0.5, duration: 1.3, ease: "power3.out" }, 1.3)
        .fromTo(".p-plate-r", { x: 40, opacity: 0 }, { x: -9, opacity: 0.9, duration: 1.3, ease: "power3.out" }, 1.5)
        // 星尾图案：只动 opacity —— path 上带着 transform 属性（摆放+缩放），
        // 再让 GSAP 去动 scale 会把那个 transform 覆盖掉，星星会跳到原点
        .fromTo(".p-cluster path", { opacity: 0 }, { opacity: (i: number) => CLUSTER_STARS[i % CLUSTER_STARS.length]?.o ?? 0.3, duration: 0.7, ease: "power2.out", stagger: 0.07 }, 1.3)
        .fromTo(".p-eyebrow", { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.7 }, 1.4)
        .fromTo(".p-latin", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.8 }, 1.5)
        .fromTo(".p-headline", { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.95 }, 1.6)
        .fromTo(".p-slogan", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.8 }, 1.78)
        .fromTo(".p-kana", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.7 }, 1.88)
        // 右侧竖排书脊：从上往下长出来
        .fromTo(".p-spine", { opacity: 0, y: -26 }, { opacity: 0.4, y: 0, duration: 1.2, ease: "power3.out" }, 1.5)
        .fromTo(".p-meta-row", { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08 }, 1.85)
        .fromTo(".p-bar", { scaleY: 0, transformOrigin: "bottom center" }, { scaleY: 1, duration: 0.7, stagger: { each: 0.012 } }, 1.7)
        .fromTo(".p-rule-bottom", { scaleX: 0 }, { scaleX: 1, duration: 1, transformOrigin: "left center" }, 1.55)
        // 印章：从大一点砸下来，带一点回弹与旋转
        .fromTo(".p-stamp", { opacity: 0, scale: 1.55, rotation: -14 }, { opacity: 1, scale: 1, rotation: -5.5, duration: 0.7, ease: "back.out(2.4)" }, 1.8)
        .fromTo(".p-stamp-ring", { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.8)" }, 1.95)
        // 四角星：一颗颗弹出来
        .fromTo(".p-star", { opacity: 0, scale: 0.2, rotation: -50 }, { opacity: (i: number) => STARS[i]?.o ?? 0.8, scale: 1, rotation: 0, duration: 0.85, ease: "back.out(2.2)", stagger: 0.06 }, 1.35)
        // 官方标志位：星芒从中心炸开，每根光线依次弹出，外圈同时扩散一圈
        .fromTo(".p-burst", { opacity: 0, scale: 0.3, rotation: -110 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.9, ease: "back.out(2)" }, 1.95)
        .fromTo(".p-burst-ping", { scale: 0.7, opacity: 0.6 }, { scale: 1.5, opacity: 0, duration: 1.6, ease: "power1.out" }, 2.05)
        .fromTo(".p-mascot-tag", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, ease: "back.out(1.9)" }, 2.3)
        .fromTo(".p-frame", { opacity: 0 }, { opacity: 1, duration: 1 }, 1.7)
        .fromTo(".p-credit", { opacity: 0 }, { opacity: 1, duration: 0.8 }, 2.3)
      introRef.current = tl
    }

    /* 常驻循环：和 DeepSeek 版不重样 ——
       没有环形刻度自转、没有频谱条，改成"纸张在呼吸 + 色版轻微游移 + 印章微颤 + 星星闪烁" */
    const push = (t: gsap.core.Tween) => loopsRef.current.push(t)
    // 虚线圆缓慢自转（虚线的旋转才看得出来，实心圆转是看不见的）
    push(gsap.to(".p-dashes-spin", { rotation: 360, duration: 96, repeat: -1, ease: "none", transformOrigin: "50% 50%" }))
    push(gsap.to(".p-halo", { opacity: 0.78, scale: 1.045, duration: 6.4, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 2.2 }))
    push(gsap.to(".p-figure-inner", { y: -8, duration: 8.5, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 2.4 }))
    // 残影轻轻浮动 + 呼吸（比主体慢，双重曝光才有纵深）
    push(gsap.to(".p-ghost img", { y: -14, duration: 12.5, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 2.6 }))
    push(gsap.to(".p-ghost", { opacity: 0.82, duration: 7.8, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3 }))
    // 色版游移：珊瑚色版微微偏离又回来，就是"套印在动"
    push(gsap.to(".p-plate-l", { x: 15, duration: 5.6, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 2.6 }))
    push(gsap.to(".p-plate-r", { x: -15, duration: 6.8, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3 }))
    // 纸张的暖色渐变缓慢漂移
    push(gsap.to(".p-wash-inner", { x: 18, y: -12, duration: 13, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 2.4 }))
    // 印章轻微颤动（像压在纸上没压实）
    push(gsap.to(".p-stamp", { rotation: -7.2, duration: 4.2, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 2.8 }))
    // 条码像油墨未干一样轻微起伏
    push(gsap.to(".p-bar", { scaleY: 0.72, duration: 2.1, repeat: -1, yoyo: true, ease: "sine.inOut", stagger: { each: 0.045, from: "random" }, delay: 2.4 }))
    // 四角星各自"呼吸式"闪烁：每颗周期不同，不会齐刷刷一起亮
    posterRef.current.querySelectorAll<HTMLElement>(".p-star").forEach((el, i) => {
      const s = STARS[i]
      if (!s) return
      push(
        gsap.to(el, {
          opacity: s.o * 0.16,
          scale: 0.52,
          rotation: i % 2 ? 34 : -34,
          duration: s.dur * 0.85,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: 2 + s.delay,
        })
      )
    })
    // 星尾图案也轻轻呼吸（同样只动 opacity，避免覆盖 path 上的 transform）
    // 两条星尾共 12 个 path，用取模索引才不会漏掉第二条
    posterRef.current.querySelectorAll<HTMLElement>(".p-cluster path").forEach((el, i) => {
      const s = CLUSTER_STARS[i % CLUSTER_STARS.length]
      if (!s) return
      push(gsap.to(el, { opacity: s.o * 0.3, duration: 2.6 + (i % 3) * 0.7, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 2 + (i % 4) * 0.35 }))
    })
    // 官方标志位：星芒缓慢自转（12 折对称，转起来看得见）+ 光线波浪式明暗 + 外圈扩散
    push(gsap.to(".p-burst", { rotation: 360, duration: 72, repeat: -1, ease: "none", delay: 3 }))
    push(gsap.to(".p-burst", { scale: 1.07, duration: 2.8, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 3.4 }))
    push(gsap.fromTo(".p-burst-ping", { scale: 0.72, opacity: 0.5 }, { scale: 1.5, opacity: 0, duration: 3, repeat: -1, ease: "power1.out", repeatDelay: 1.3, delay: 3, transformOrigin: "50% 50%" }))
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

  /* ---------------- 鼠标视差：纸 / 圆 / 人 / 色版 分层位移 ---------------- */
  useEffect(() => {
    const figure = figureRef.current
    const wash = washRef.current
    const dashes = dashesRef.current
    const halo = haloRef.current
    if (!figure || !wash || !dashes || !halo) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    quickRef.current = {
      fx: gsap.quickTo(figure, "x", { duration: 1.1, ease: "power3" }),
      dx: gsap.quickTo(dashes, "x", { duration: 1.8, ease: "power3" }),
      dy: gsap.quickTo(dashes, "y", { duration: 1.8, ease: "power3" }),
      wx: gsap.quickTo(wash, "x", { duration: 1.6, ease: "power3" }),
      hx: gsap.quickTo(halo, "x", { duration: 1.4, ease: "power3" }),
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
    q.fx?.(px * -14) // 人和它的色版一起走
    q.dx?.(px * 24) // 虚线圆反向，做出层次
    q.dy?.(py * 16)
    q.wx?.(px * -20)
    q.hx?.(px * 12)
  }

  const onPointerLeave = () => {
    const q = quickRef.current
    q.fx?.(0)
    q.dx?.(0)
    q.dy?.(0)
    q.wx?.(0)
    q.hx?.(0)
  }

  /* ---------------- 导出海报（2 倍图） ---------------- */
  const exportPng = async () => {
    const poster = posterRef.current
    if (!poster || exporting) return
    setExporting(true)
    setTip("正在合成…")
    gsap.set([figureRef.current, washRef.current, dashesRef.current, haloRef.current], { x: 0, y: 0 })
    // 残影的浮动与呼吸也归位，避免把动画中途的姿态带进成图
    gsap.set(poster.querySelector(".p-ghost"), { opacity: 1 })
    gsap.set(poster.querySelector(".p-ghost img"), { y: 0 })
    // 把入场时间轴直接推到终态。
    // 否则刚打开页面（或标签页被浏览器节流导致动画没跑完）就点导出时，
    // 文字还停在 opacity: 0，成图会整片缺字 —— 实测过，不是猜测。
    introRef.current?.progress(1)
    // 背景改成纯渐变之后没有噪点纹理要藏了：渐变、四角星、印章都是设计的一部分，全部保留在成图里
    try {
      if (!fontCssRef.current) fontCssRef.current = await getFontEmbedCSS(poster)
      // 像素比按宽度封顶，视口越大越压，保证栅格化压力可控
      const ratio = Math.min(2, 2600 / Math.max(1, poster.getBoundingClientRect().width))
      const dataUrl = await toPng(poster, {
        pixelRatio: ratio,
        cacheBust: true,
        backgroundColor: C.paper,
        fontEmbedCSS: fontCssRef.current,
      })
      const a = document.createElement("a")
      a.href = dataUrl
      a.download = `claudecode-poster-${Date.now()}.png`
      a.click()
      setTip("已保存 2 倍高清图")
    } catch (err) {
      // 不静默吞掉，控制台留痕方便排查
      console.error("[claudecode-poster] 导出失败:", err)
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
      className={`${POSTER_SHELL} relative overflow-hidden bg-[#FBF5EE] text-[#2A211F] selection:bg-[#E97849]/35`}
    >
      {/* ============================ 海报本体（导出对象） ============================ */}
      <section ref={posterRef} className={POSTER_SURFACE}>
        {/* 纸底 */}
        {/* 纸底：多层暖色渐变 —— 不用任何网点/颗粒，全靠渐变堆出纸的层次 */}
        <div className="p-bg absolute inset-0 bg-[linear-gradient(152deg,#FFFCF7_0%,#FDF4E9_18%,#FAE9D8_38%,#F6DFCC_56%,#F2D6C6_72%,#EFCFC4_86%,#EBC8BE_100%)]" />

        {/* 暖色 wash：珊瑚在上左、灰褐在下右、人物身后一块白 —— 全部是柔和的径向渐变 */}
        <div ref={washRef} className="p-wash pointer-events-none absolute inset-0">
          <div className="p-wash-inner absolute inset-0">
            <div
              className="absolute -left-[26%] top-[-28%] h-[92%] w-[76%] opacity-80"
              style={{ background: `radial-gradient(closest-side, rgba(233,120,73,.30), rgba(233,120,73,.11) 46%, transparent 76%)` }}
            />
            <div
              className="absolute bottom-[-30%] right-[-22%] h-[88%] w-[68%] opacity-75"
              style={{ background: `radial-gradient(closest-side, rgba(200,170,164,.52), rgba(200,170,164,.18) 48%, transparent 78%)` }}
            />
            <div
              className="absolute left-[30%] top-[16%] h-[66%] w-[48%] opacity-70"
              style={{ background: `radial-gradient(closest-side, rgba(255,255,255,.96), rgba(255,250,244,.46) 44%, transparent 78%)` }}
            />
            <div
              className="absolute bottom-[-14%] left-[14%] h-[48%] w-[42%] opacity-60"
              style={{ background: `radial-gradient(closest-side, rgba(199,88,55,.20), transparent 76%)` }}
            />
          </div>
        </div>

        {/* 暖调暗角：把视线收进画面中央（也是渐变，不是网点） */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(122% 78% at 50% 42%, transparent 44%, rgba(120,86,70,.13) 100%)` }}
        />

        {/* 虚线圆：人物背后的"印版轮"，靠虚线看得出缓慢自转 */}
        <div
          ref={dashesRef}
          className="p-dashes pointer-events-none absolute left-1/2 top-[-16%] h-[104%] w-[62%] -translate-x-1/2"
        >
          <div className="p-dashes-spin absolute inset-0">
            <svg viewBox="0 0 600 600" className="h-full w-full" fill="none">
              <circle cx="300" cy="300" r="288" stroke={C.coralSoft} strokeWidth="1.4" strokeDasharray="2 16" />
              <circle cx="300" cy="300" r="238" stroke={C.line} strokeWidth="1" />
              <circle cx="300" cy="300" r="192" stroke={C.lineSoft} strokeWidth="1" strokeDasharray="1 9" />
            </svg>
          </div>
        </div>

        {/* 人物背后的柔光：把立绘从纸面上"托"起来 */}
        <div
          ref={haloRef}
          className="p-halo pointer-events-none absolute left-1/2 top-[8%] h-[88%] w-[54%] -translate-x-1/2"
          style={{ background: `radial-gradient(closest-side, rgba(255,255,255,.92) 0%, rgba(255,246,238,.62) 42%, transparent 78%)` }}
        />

        {/* 人物残影：同一张立绘放大、半透明，压在主体后面（DeepSeek 版同款手法）。
            这张是浅奶油底，所以用 multiply 混合：立绘上的浅色（衣服）几乎消失，
            深色（头发与轮廓）留下一层很淡的墨痕 —— 双重曝光。

            位置放在主体【右侧】：左边被巨大的 CLAUDE/CODE 压着，虚影在那儿根本看不见；
            高度收到 124%、顶部留 1%，所以整张脸都留在画面里，不会被顶出去。
            只往左、往下淡出，右侧完整保留。 */}
        <div className="p-ghost pointer-events-none absolute inset-0">
          <div className="absolute right-[-2%] top-[11%] h-[114%] opacity-25 mix-blend-multiply">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={FIGURE_SRC} alt="" aria-hidden className="h-full w-auto max-w-none object-contain" />
          </div>
          {/* 溶解遮罩：往左、往下化进纸色，右侧不动 */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(270deg, transparent 46%, rgba(251,245,238,.5) 72%, ${C.paper} 92%), linear-gradient(0deg, ${C.paper} 2%, rgba(251,245,238,.55) 16%, transparent 36%)`,
            }}
          />
        </div>

        {/* 内框 + 顶部套准记号。放在残影【之后】、人物【之前】：
            这样它在残影的溶解遮罩之上，而人物又盖住画框的底边 ——
            否则那根 1px 框线会从人物的脚上横过去（和底部细线是同一个毛病）。 */}
        <div className="p-frame pointer-events-none absolute inset-[3.2%]">
          <div className="absolute inset-0 border" style={{ borderColor: C.lineSoft }} />
          {/* 裁切角标：印刷校样的裁切记号，四角各一个 L */}
          <span className="absolute -left-3.5 -top-3.5 h-3.5 w-3.5 border-l border-t" style={{ borderColor: C.ink2, opacity: 0.5 }} />
          <span className="absolute -right-3.5 -top-3.5 h-3.5 w-3.5 border-r border-t" style={{ borderColor: C.ink2, opacity: 0.5 }} />
          <span className="absolute -bottom-3.5 -left-3.5 h-3.5 w-3.5 border-b border-l" style={{ borderColor: C.ink2, opacity: 0.5 }} />
          <span className="absolute -bottom-3.5 -right-3.5 h-3.5 w-3.5 border-b border-r" style={{ borderColor: C.ink2, opacity: 0.5 }} />
          <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
            <svg viewBox="0 0 22 22" className="h-[13px] w-[13px]" fill="none" stroke={C.coral} strokeWidth="1.2">
              <circle cx="11" cy="11" r="7" />
              <path d="M11 0v22M0 11h22" strokeOpacity=".55" />
            </svg>
          </span>
          <span className="p-credit absolute bottom-[-1px] right-0 translate-y-full pt-2 font-mono text-[9px] tracking-[.28em]" style={{ color: C.inkFaint }}>
            {COPY.credit}
          </span>
        </div>

        {/* 立绘：居中、脚落在画面底边上（之前设了 -6% 出血，脚被切掉了）。
            两层 drop-shadow 就是两块色版 —— 珊瑚色版往右下偏、深墨色版往左上偏，
            形成"套印错位"的印刷出身。头顶留出 8%，让巨大字有干净的字带。 */}
        <div ref={figureRef} className="p-figure pointer-events-none absolute inset-0">
          <div className="p-figure-inner absolute bottom-0 left-1/2 h-[74%] -translate-x-1/2 sm:h-[92%]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={FIGURE_SRC}
              alt="ClaudeCode 娘化立绘"
              className="h-full w-auto max-w-none object-contain"
              style={{
                filter: `drop-shadow(7px 3px 0 ${C.coralSoft}) drop-shadow(-4px -2px 0 rgba(42,33,31,.13)) drop-shadow(0 26px 34px rgba(74,50,38,.26))`,
              }}
            />

            {/* 四角星：挂在立绘的框里，所以任何视口比例下都稳定绕在人物周围，
                位置全部避开面部与文字块。形状与 About 页同一套（内凹边的四角星）。 */}
            <div className="absolute inset-0">
              {STARS.map((s, i) => {
                const [c1, c2] = STAR_PAIRS[s.pair] ?? STAR_PAIRS[0]
                return (
                  <span
                    key={i}
                    className="p-star absolute"
                    style={{ left: `${s.left}%`, top: `${s.top}%`, width: `${s.size}px`, height: `${s.size}px`, opacity: s.o }}
                  >
                    <svg viewBox="0 0 24 24" className="h-full w-full">
                      <defs>
                        <linearGradient id={`cc-star-${i}`} x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={c1} />
                          <stop offset="100%" stopColor={c2} />
                        </linearGradient>
                      </defs>
                      <path
                        d="M12 0C12.7 6.7 17.3 11.3 24 12C17.3 12.7 12.7 17.3 12 24C11.3 17.3 6.7 12.7 0 12C6.7 11.3 11.3 6.7 12 0Z"
                        fill={`url(#cc-star-${i})`}
                      />
                    </svg>
                  </span>
                )
              })}
            </div>
            {/* 官方标志位：挂在立绘坐标系里，所以永远稳定待在头部的右侧
                （立绘里头部内容只占 x 37.5%~62.5%，放在 65% 之后一定不会压到脸）。
                之前放在底部扉页带上，落在裙摆的浅色区域，看不清。
                小屏上立绘几乎占满宽度，"头的右侧"正好被右侧规格表占用，故小屏隐藏。 */}
            <div className="absolute left-[65%] top-[7.5%] hidden flex-col items-start gap-2.5 sm:flex">
              <div className="p-burstmark relative h-[clamp(52px,6vw,88px)] w-[clamp(52px,6vw,88px)]">
                <span className="p-burst-ping absolute inset-0 rounded-full border" style={{ borderColor: C.coral }} />
                <svg viewBox="0 0 24 24" className="p-burst h-full w-full" aria-hidden>
                  <path d={CLAUDE_PATH} fill={C.coral} />
                </svg>
              </div>
              <span
                className="p-mascot-tag whitespace-nowrap rounded-full border px-2.5 py-1 text-[9px] tracking-[.16em]"
                style={{ borderColor: C.line, color: C.inkSoft, background: "rgba(251,245,238,.66)", transform: "rotate(-3deg)" }}
              >
                {COPY.mascot}
              </span>
            </div>
          </div>
        </div>

        {/* 顶部一行：品类小字 + 编号，坐在通栏横线上方，给画面一条"上边缘"。
            z-10 是必要的：CLOUD 的珊瑚色版在它之后声明，不加层级的会盖住这行小字（实测压了 164×9px）。 */}
        <div className="p-eyebrow absolute inset-x-[3.4%] top-[2.6%] z-10 flex items-baseline justify-between gap-4">
          <span className="flex items-baseline gap-3">
            <span className="text-[10px] font-medium tracking-[.46em]" style={{ color: C.inkSoft }}>
              {COPY.eyebrow}
            </span>
            <span className="p-latin text-[9px] tracking-[.3em]" style={{ color: C.inkFaint }}>
              {COPY.latin}
            </span>
          </span>
          <span className="font-mono text-[9px] tracking-[.22em]" style={{ color: C.inkFaint }}>
            NO.002-K
          </span>
        </div>
        <div className="p-rule-top absolute inset-x-[3.4%] top-[7.2%] h-px" style={{ background: C.line }} />

        {/* 左侧字块：CLOUD 在上、CODE 叠在它下面，作为一整块竖排标题。
            两行都左对齐、都从左往右擦除。
            擦除元素留了上下 padding —— clipPath 是按边框盒裁的，
            没有 padding 会把字形的上下切掉（之前用 overflow-hidden 就是这么切的）。 */}
        <div className="pointer-events-none absolute left-[3.4%] top-[9.4%] select-none">
          <div className="relative">
            <span
              aria-hidden
              className="p-plate-l absolute left-0 top-0 text-[clamp(44px,11.5vw,224px)] font-black leading-[.95] tracking-[-.05em]"
              style={{ color: C.coral }}
            >
              {COPY.mastheadLeft}
            </span>
            {/* 字号必须放在带 padding 的这一层：em 按元素自身字号解析，
                字号写在内层的话 px-[0.09em] 只有 1.4px，兜不住负字距溢出的字形 */}
            <span className="p-wipe-l block -mx-[0.12em] -my-[0.22em] px-[0.12em] py-[0.22em] text-[clamp(44px,11.5vw,224px)] font-black leading-[.95] tracking-[-.05em]">
              <span className="block" style={{ color: C.ink }}>
                {COPY.mastheadLeft}
              </span>
            </span>
          </div>

          {/* CODE 用珊瑚色实字 + 左后一块墨色版：和 CLOUD 的墨字形成双色套印。
              原来那块"纯色卡片 + 挖空字"去掉了 —— 压在字下显得闷。 */}
          <div className="relative">
            <span
              aria-hidden
              className="p-plate-r absolute left-0 top-0 text-[clamp(44px,11.5vw,224px)] font-black leading-[.95] tracking-[-.05em]"
              style={{ color: C.ink }}
            >
              {COPY.mastheadRight}
            </span>
            <span className="p-wipe-r block -mx-[0.12em] -my-[0.22em] px-[0.12em] py-[0.22em] text-[clamp(44px,11.5vw,224px)] font-black leading-[.95] tracking-[-.05em]">
              <span className="block" style={{ color: C.coral }}>
                {COPY.mastheadRight}
              </span>
            </span>
          </div>

          {/* 字块下的细线：开头一段实心珊瑚色块，是版式的"起点"记号；
              规格表已经挪到右侧栏 —— 留在左边会撞上底部主张（实测过重叠）。 */}
          <span className="mt-[0.24em] flex items-end">
            <span className="h-[3px] w-[16%] shrink-0" style={{ background: C.coral }} />
            <span className="h-px flex-1" style={{ background: C.ink2, opacity: 0.34 }} />
          </span>
        </div>

        {/* 右上：星尾图案 —— 落在虚影的脸旁边，几颗星压着脸不挡视线 */}
        <div className="absolute right-[3.4%] top-[8%] flex flex-col items-end">
          {/* 星尾：由大到小的一串四角星，排成一条斜线 */}
          <svg viewBox="0 0 120 130" className="p-cluster h-[clamp(64px,7.6vw,112px)] w-auto" aria-hidden>
            {CLUSTER_STARS.map((s, i) => (
              <path
                key={i}
                d={STAR_PATH}
                fill={s.tone}
                opacity={s.o}
                transform={`translate(${s.x} ${s.y}) scale(${s.scale})`}
              />
            ))}
          </svg>
        </div>

        {/* 左下：第二条星尾（水平镜像）—— 补住左侧中段的留白，同时给这边也加一层动效 */}
        <div className="absolute left-[4.4%] top-[60.5%] flex flex-col items-start">
          <svg viewBox="0 0 120 130" className="p-cluster h-[clamp(44px,5.2vw,78px)] w-auto" style={{ transform: "scaleX(-1)" }} aria-hidden>
            {CLUSTER_STARS.map((s, i) => (
              <path
                key={i}
                d={STAR_PATH}
                fill={s.tone}
                opacity={s.o}
                transform={`translate(${s.x} ${s.y}) scale(${s.scale})`}
              />
            ))}
          </svg>
        </div>

        {/* 右侧中段：字织 + 系列印章 + 版本块。
            整块往内收到 7%、上移到 30%，一是给虚影的脸让位，
            二是给右边的竖排大标题留出独立的竖条。 */}
        <div className="absolute right-[7%] top-[30%] flex flex-col items-end gap-4">

          {/* 规格表（右对齐）：从左侧栏挪过来的。
              做成"点线引导"的目录式排法，并加一条珊瑚竖条把整组框住 —— 比三行裸字更有版式结构。 */}
          <div className="flex items-stretch gap-3">
            <span className="w-[3px] shrink-0" style={{ background: C.coral }} />
            <div className="flex flex-col gap-2.5">
              {META.map(([k, v], i) => (
                <span key={k} className="p-meta-row flex w-[132px] items-baseline gap-2 sm:w-[178px]">
                  <span className="font-mono text-[10px]" style={{ color: C.coral }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[9px] tracking-[.24em]" style={{ color: C.inkFaint }}>
                    {k}
                  </span>
                  {/* 点线引导：把键和值连起来 */}
                  <span
                    className="mx-0.5 h-px min-w-[10px] flex-1 self-center"
                    style={{ backgroundImage: `radial-gradient(${C.inkGhost} 1px, transparent 1px)`, backgroundSize: "4px 1px" }}
                  />
                  <span className="font-mono text-[11px]" style={{ color: C.inkSoft }}>
                    {v}
                  </span>
                </span>
              ))}
            </div>
          </div>
          <div className="p-stamp relative grid h-[clamp(58px,6.4vw,90px)] w-[clamp(58px,6.4vw,90px)] place-items-center rounded-full border-2" style={{ borderColor: C.clay, transform: "rotate(-5.5deg)" }}>
            <div className="p-stamp-ring absolute inset-0">
              <svg viewBox="0 0 100 100" className="h-full w-full" fill="none">
                {STAMP_TICKS.map((a) => (
                  <line
                    key={a}
                    x1="50"
                    y1="4"
                    x2="50"
                    y2="9"
                    stroke={C.clay}
                    strokeWidth="1.4"
                    strokeOpacity=".55"
                    transform={`rotate(${a} 50 50)`}
                  />
                ))}
              </svg>
            </div>
            <span className="font-mono text-[clamp(15px,1.7vw,24px)] font-bold leading-none" style={{ color: C.clay }}>
              {COPY.series}
            </span>
            <span className="mt-1 text-[7.5px] tracking-[.2em]" style={{ color: C.clay }}>
              ANTHRO
            </span>
          </div>

          <div
            className="grid h-[clamp(34px,3.9vw,54px)] w-[clamp(34px,3.9vw,54px)] place-items-center text-[clamp(12px,1.4vw,19px)] font-black leading-none"
            style={{ background: C.coral, color: C.paper }}
          >
            {COPY.version}
          </div>

        </div>

        {/* 右边缘竖排大标题：把右边当作书脊用 —— 右侧最有分量的一块，
            和左侧堆叠的 CLOUD / CODE 形成"左字块 / 右书脊"的平衡。
            必须收在画框（inset 3.2%）以内，所以放在 3.6%。
            小屏上字号被 clamp 到最小值、而画布很窄，它占比反而变大并压到右侧文字，故小屏隐藏。 */}
        <div className="pointer-events-none absolute right-[3.6%] top-[30%] hidden select-none sm:block">
          <span
            className="p-spine block whitespace-nowrap text-[clamp(13px,1.5vw,23px)] font-black tracking-[.4em]"
            style={{ writingMode: "vertical-rl", color: C.ink2, opacity: 0.4 }}
          >
            CLAUDECODE
          </span>
        </div>

        {/* ================= 底部扉页带 ================= */}
        <div className="absolute inset-x-[3.4%] bottom-[6%]">
          {/* 这条细线原来是一整根通栏，且左 34% 是实心黑；它落在画面 50% 高度上，
              正好从人物腰部横穿过去，看着就是一根多余的黑色横线。
              现在断成两段，中间给人物让开。手机上人物几乎占满宽度、任何横线都会穿身，
              所以小屏干脆不画。 */}
          <div className="p-rule-bottom relative hidden h-[2px] w-full sm:block">
            <span
              className="absolute left-0 top-0 h-full w-[29%]"
              style={{ background: `linear-gradient(90deg, ${C.ink} 0%, ${C.ink} 62%, ${C.coral} 62%, ${C.coral} 100%)` }}
            />
            <span
              className="absolute right-0 top-0 h-full w-[29%]"
              style={{ background: `linear-gradient(90deg, ${C.coral} 0%, ${C.line} 16%, ${C.line} 100%)` }}
            />
          </div>

          <div className="mt-6 flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
            {/* 左下：中文主张改回横排。
                之前是竖排，那条竖列会一直向上伸到 y≈362，正好和左侧栏的规格表撞在一起（实测有重叠）。
                横排只占 40px 高，把竖向空间让出来；字宽也只到 22%，人物从 34% 才开始，不会压到裙摆。 */}
            <div className="max-w-[46%]">
              <h2
                className="p-headline font-['myFont',sans-serif] text-[clamp(19px,3.1vw,52px)] font-medium leading-[1.06] tracking-[.04em]"
                style={{ color: C.ink }}
              >
                {COPY.headline}
              </h2>
              <p className="p-slogan mt-2.5 font-['myFont',sans-serif] text-[clamp(10px,1.05vw,14px)] leading-6" style={{ color: C.inkSoft }}>
                {COPY.slogan}
              </p>
            </div>

            {/* 右下：条码块 + 编号 */}
            <div className="flex flex-col items-start gap-3 sm:items-end">
              <div className="p-barcode flex h-10 items-end gap-[3px]">
                {BARS.map((b, i) => (
                  <span
                    key={i}
                    className="p-bar block"
                    style={{ width: `${b.w}px`, height: `${b.h}px`, background: b.tone, opacity: 0.7 }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[8.5px] tracking-[.24em]" style={{ color: C.inkFaint }}>
                  {COPY.side}
                </span>
                <span className="font-mono text-[8.5px] tracking-[.14em]" style={{ color: C.inkSoft }}>
                  NO.002-K
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 右页边的竖排微缩字：既是文字，也是一条竖向的"纹样" */}
        <div className="p-edge pointer-events-none absolute bottom-[26%] right-[1.6%] text-[7.5px] tracking-[.34em]" style={{ writingMode: "vertical-rl", color: C.inkFaint }}>
          {COPY.edge}
        </div>

      </section>

      {/* ============================ 页面浮层（不参与导出） ============================ */}
      <div className={POSTER_OVERLAY}>
        <div className="pointer-events-auto">
          <Breadcrumb variant="light" />
        </div>
        <div className="pointer-events-auto flex items-center gap-3">
          {tip && <span className="text-[11px]" style={{ color: C.inkSoft }}>{tip}</span>}
          <button
            type="button"
            onClick={exportPng}
            disabled={exporting}
            className="flex items-center gap-2 rounded-full border border-[#2A211F]/20 bg-white/70 px-4 py-2 text-[11.5px] text-[#2A211F]/75 backdrop-blur transition-colors hover:border-[#E97849] hover:text-[#2A211F] disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            {exporting ? "合成中…" : "保存海报"}
          </button>
        </div>
      </div>
    </div>
  )
}
