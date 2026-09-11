"use client"

import type { CSSProperties } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"

type LoveCard = {
  id: string
  text: string
}

type Accent = "rose" | "violet" | "sky" | "sage" | "amber" | "peach"
type SceneMode = "float" | "orbit" | "quiet"
type CopyState = "html" | "json" | null

type CardLayout = {
  left: number
  top: number
  width: number
  minHeight: number
  rotate: number
  depth: number
  accent: Accent
  featured: boolean
  tape: "top" | "corner" | "pin" | "none"
  delay: number
}

const STORAGE_KEY = "bitleap-love-cards-fullscreen-flow-v5"

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

const accentMap: Record<Accent, { dot: string; glow: string; ink: string; wash: string }> = {
  rose: { dot: "#ef9eb6", glow: "rgba(239,158,182,.28)", ink: "#6f3f52", wash: "rgba(255,244,248,.94)" },
  violet: { dot: "#a78bfa", glow: "rgba(167,139,250,.26)", ink: "#4d3f75", wash: "rgba(247,244,255,.94)" },
  sky: { dot: "#83c5e6", glow: "rgba(131,197,230,.25)", ink: "#355f76", wash: "rgba(243,250,255,.94)" },
  sage: { dot: "#8fb79c", glow: "rgba(143,183,156,.25)", ink: "#405b48", wash: "rgba(245,252,247,.94)" },
  amber: { dot: "#d8b168", glow: "rgba(216,177,104,.25)", ink: "#755b2c", wash: "rgba(255,250,239,.94)" },
  peach: { dot: "#efaa88", glow: "rgba(239,170,136,.24)", ink: "#704937", wash: "rgba(255,247,241,.94)" },
}

const sceneLayouts: CardLayout[] = [
  { left: 6, top: 16, width: 18, minHeight: 124, rotate: -6.2, depth: 0.78, accent: "rose", featured: true, tape: "corner", delay: 0.05 },
  { left: 25, top: 9, width: 12, minHeight: 90, rotate: 4.8, depth: 0.34, accent: "sky", featured: false, tape: "none", delay: 0.22 },
  { left: 39, top: 13, width: 15, minHeight: 108, rotate: -2.7, depth: 0.52, accent: "sage", featured: false, tape: "top", delay: 0.16 },
  { left: 58, top: 7, width: 19, minHeight: 132, rotate: 5.4, depth: 0.84, accent: "violet", featured: true, tape: "pin", delay: 0.08 },
  { left: 79, top: 17, width: 15, minHeight: 104, rotate: -5.1, depth: 0.46, accent: "amber", featured: false, tape: "corner", delay: 0.28 },

  { left: 3, top: 36, width: 13, minHeight: 94, rotate: 4.1, depth: 0.3, accent: "peach", featured: false, tape: "none", delay: 0.35 },
  { left: 20, top: 31, width: 18, minHeight: 128, rotate: -3.6, depth: 0.72, accent: "rose", featured: true, tape: "top", delay: 0.12 },
  { left: 41, top: 33, width: 12, minHeight: 86, rotate: 6.6, depth: 0.28, accent: "sky", featured: false, tape: "pin", delay: 0.46 },
  { left: 56, top: 28, width: 15, minHeight: 112, rotate: -1.9, depth: 0.55, accent: "violet", featured: false, tape: "none", delay: 0.24 },
  { left: 75, top: 34, width: 20, minHeight: 134, rotate: 3.2, depth: 0.8, accent: "sage", featured: true, tape: "corner", delay: 0.1 },

  { left: 7, top: 58, width: 18, minHeight: 126, rotate: -3.9, depth: 0.66, accent: "sky", featured: true, tape: "pin", delay: 0.18 },
  { left: 28, top: 55, width: 12, minHeight: 88, rotate: 5.5, depth: 0.25, accent: "amber", featured: false, tape: "none", delay: 0.54 },
  { left: 43, top: 55, width: 16, minHeight: 112, rotate: -5.8, depth: 0.5, accent: "rose", featured: false, tape: "top", delay: 0.3 },
  { left: 63, top: 56, width: 15, minHeight: 96, rotate: 4.6, depth: 0.36, accent: "peach", featured: false, tape: "none", delay: 0.58 },
  { left: 81, top: 57, width: 13, minHeight: 100, rotate: -4.4, depth: 0.42, accent: "violet", featured: false, tape: "pin", delay: 0.42 },

  { left: 14, top: 77, width: 15, minHeight: 102, rotate: 4.8, depth: 0.38, accent: "amber", featured: false, tape: "corner", delay: 0.62 },
  { left: 33, top: 74, width: 18, minHeight: 126, rotate: -2.8, depth: 0.7, accent: "rose", featured: true, tape: "none", delay: 0.26 },
  { left: 55, top: 76, width: 12, minHeight: 88, rotate: 6.4, depth: 0.24, accent: "sky", featured: false, tape: "top", delay: 0.68 },
  { left: 70, top: 73, width: 18, minHeight: 120, rotate: -5.2, depth: 0.62, accent: "sage", featured: true, tape: "corner", delay: 0.33 },

  { left: 16, top: 21, width: 10, minHeight: 82, rotate: 7.5, depth: 0.18, accent: "violet", featured: false, tape: "none", delay: 0.72 },
  { left: 34, top: 23, width: 10, minHeight: 84, rotate: -7.1, depth: 0.2, accent: "amber", featured: false, tape: "pin", delay: 0.76 },
  { left: 51, top: 20, width: 10, minHeight: 82, rotate: 7.0, depth: 0.19, accent: "rose", featured: false, tape: "none", delay: 0.78 },
  { left: 69, top: 20, width: 10, minHeight: 84, rotate: -6.8, depth: 0.2, accent: "sky", featured: false, tape: "top", delay: 0.8 },
  { left: 17, top: 47, width: 10, minHeight: 82, rotate: -7.2, depth: 0.18, accent: "sage", featured: false, tape: "none", delay: 0.82 },
  { left: 33, top: 45, width: 11, minHeight: 86, rotate: 6.8, depth: 0.22, accent: "violet", featured: false, tape: "corner", delay: 0.84 },
  { left: 60, top: 44, width: 10, minHeight: 82, rotate: 6.2, depth: 0.18, accent: "amber", featured: false, tape: "none", delay: 0.86 },
  { left: 89, top: 44, width: 10, minHeight: 82, rotate: -6.7, depth: 0.18, accent: "rose", featured: false, tape: "top", delay: 0.88 },
  { left: 38, top: 84, width: 10, minHeight: 82, rotate: -5.7, depth: 0.19, accent: "sky", featured: false, tape: "none", delay: 0.9 },
  { left: 52, top: 86, width: 11, minHeight: 86, rotate: 5.9, depth: 0.22, accent: "sage", featured: false, tape: "pin", delay: 0.92 },
  { left: 66, top: 83, width: 10, minHeight: 82, rotate: -6.3, depth: 0.19, accent: "peach", featured: false, tape: "none", delay: 0.94 },
]

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
      top: clamp(50 + Math.sin(radians) * ring * 0.72 - base.minHeight / 18, 7, 84),
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function exportStandaloneHtml(title: string, subtitle: string, cards: LoveCard[], mode: SceneMode) {
  const safeTitle = escapeHtml(title || "想对你说")
  const safeSubtitle = escapeHtml(subtitle || "")
  const cardMarkup = cards
    .map((card, index) => {
      const layout = getCardLayout(index, mode)
      const accent = accentMap[layout.accent]
      return `<article class="card ${layout.featured ? "featured" : ""}" style="--left:${layout.left}%;--top:${layout.top}%;--width:${layout.width}%;--min-h:${layout.minHeight}px;--r:${layout.rotate}deg;--dot:${accent.dot};--glow:${accent.glow};--ink:${accent.ink};--wash:${accent.wash};--depth:${layout.depth}"><span class="dot"></span><span class="num">${String(index + 1).padStart(2, "0")}</span><p>${escapeHtml(card.text || "...")}</p></article>`
    })
    .join("\n")

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${safeTitle}</title>
<style>
*{box-sizing:border-box}
html,body{margin:0;width:100%;height:100%;overflow:hidden;font-family:Inter,"PingFang SC","Microsoft YaHei",system-ui,sans-serif;color:#18181b}
body{background:radial-gradient(circle at 10% 10%,rgba(253,226,243,.72),transparent 24%),radial-gradient(circle at 88% 12%,rgba(219,234,254,.72),transparent 27%),radial-gradient(circle at 52% 90%,rgba(237,233,254,.68),transparent 32%),linear-gradient(180deg,#fffaf7 0%,#f7f8fc 52%,#faf8f6 100%)}
.wrap{position:relative;width:100vw;height:100vh;overflow:hidden}
.head{position:absolute;left:32px;top:28px;z-index:40;max-width:520px}
.kicker{font-size:9px;letter-spacing:.24em;text-transform:uppercase;color:#9f7aea}
h1{margin:10px 0 0;font-size:clamp(36px,4.8vw,76px);letter-spacing:-.07em;line-height:.94}
.sub{margin:10px 0 0;max-width:52ch;font-size:12px;line-height:1.8;color:#858089}
.card{position:absolute;left:var(--left);top:var(--top);width:var(--width);min-height:var(--min-h);padding:18px;border-radius:24px;background:linear-gradient(145deg,rgba(255,255,255,.98),var(--wash));border:1px solid rgba(24,24,27,.055);box-shadow:0 28px 74px -50px rgba(67,49,88,.42),0 1px 0 rgba(255,255,255,.86) inset;transform:translate(-50%,-50%) rotate(var(--r));opacity:0;display:flex;align-items:flex-end;color:var(--ink);overflow:hidden}
.card:before{content:"";position:absolute;right:-36px;top:-36px;width:120px;height:120px;background:var(--glow);filter:blur(26px);border-radius:50%}
.card p{position:relative;z-index:1;margin:0;max-width:29ch;font-size:13px;line-height:1.75;letter-spacing:-.01em}
.card.featured p{font-size:16px;font-weight:600}
.num{position:absolute;right:16px;top:14px;font:8px ui-monospace,monospace;letter-spacing:.16em;color:rgba(82,80,88,.28)}
.dot{position:absolute;left:16px;top:17px;width:6px;height:6px;border-radius:50%;background:var(--dot)}
@keyframes drift{0%,100%{translate:0 0}50%{translate:calc(var(--depth) * 8px) calc(var(--depth) * -12px)}}
.card.ready{animation:drift calc(5.8s + var(--depth) * 3s) ease-in-out infinite}
@media(max-width:900px){.card{width:clamp(142px,42vw,200px)}.card:nth-of-type(n+15){display:none}.head{left:18px;right:18px;top:20px}.sub{font-size:11px}}
</style>
</head>
<body>
<main class="wrap">
<header class="head"><div class="kicker">Little Words</div><h1>${safeTitle}</h1><p class="sub">${safeSubtitle}</p></header>
${cardMarkup}
</main>
<script>
const cards=[...document.querySelectorAll('.card')];
function play(){
 const cx=innerWidth/2,cy=innerHeight/2;
 cards.forEach((card,index)=>{
  card.getAnimations().forEach(a=>a.cancel());
  card.classList.remove('ready');
  const rect=card.getBoundingClientRect();
  const x=cx-(rect.left+rect.width/2), y=cy-(rect.top+rect.height/2);
  card.animate([{transform:'translate(calc(-50% + '+x+'px),calc(-50% + '+y+'px)) rotate('+(((index%11)-5)*2.5)+'deg) scale(.42)',opacity:0,filter:'blur(10px)'},{transform:'translate(-50%,-50%) rotate(var(--r)) scale(1)',opacity:1,filter:'blur(0)'}],{duration:950+Number(card.style.getPropertyValue('--depth'))*420,delay:Math.min(index*28,760),easing:'cubic-bezier(.16,1,.3,1)',fill:'forwards'}).onfinish=()=>card.classList.add('ready');
 });
}
addEventListener('load',play);addEventListener('click',play);
</script>
</body>
</html>`
}

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

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" aria-hidden="true">
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

function Pills({
  mode,
  setMode,
}: {
  mode: SceneMode
  setMode: (mode: SceneMode) => void
}) {
  const items: Array<{ key: SceneMode; label: string }> = [
    { key: "float", label: "散落" },
    { key: "orbit", label: "环绕" },
    { key: "quiet", label: "安静" },
  ]

  return (
    <div className="flex rounded-full border border-black/[0.055] bg-white/56 p-1 shadow-sm backdrop-blur-xl">
      {items.map((item) => (
        <button key={item.key} type="button" onClick={() => setMode(item.key)} className={`h-8 rounded-full px-3 text-[9px] font-semibold transition ${mode === item.key ? "bg-zinc-950 text-white" : "text-zinc-400 hover:bg-white hover:text-zinc-700"}`}>
          {item.label}
        </button>
      ))}
    </div>
  )
}

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

  const selectedCard = useMemo(() => cards.find((card) => card.id === selectedId) ?? null, [cards, selectedId])
  const cardCountLabel = useMemo(() => `${cards.length} CARDS`, [cards.length])
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
    if (!stageRef.current) return

    const shells = gsap.utils.toArray<HTMLElement>(".love-card-shell", stageRef.current)
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    activeTweenRef.current?.kill()
    gsap.killTweensOf(shells)
    gsap.killTweensOf(".love-card-float")
    gsap.killTweensOf(".love-card-parallax")

    if (reducedMotion) {
      gsap.set(shells, { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1, filter: "blur(0px)" })
      return
    }

    const ordered = [...shells].sort((a, b) => Number(a.dataset.delay || 0) - Number(b.dataset.delay || 0))
    const timeline = gsap.timeline({
      onComplete: () => startIdleMotion(),
    })
    activeTweenRef.current = timeline

    timeline.set(shells, { pointerEvents: "none", opacity: 0 }, 0)
    timeline.fromTo(".love-title-block", { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.72, ease: "power3.out" }, 0.08)
    timeline.fromTo(".love-footer-signature", { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power2.out" }, 0.32)
    timeline.fromTo(".love-control-bar", { y: -10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.58, ease: "power2.out" }, 0.18)

    ordered.forEach((shell, index) => {
      const sourceIndex = Number(shell.dataset.index || index)
      const from = getEntrance(shell, sourceIndex, sceneMode)
      const depth = Number(shell.dataset.depth || 0.4)
      const delay = Number(shell.dataset.delay || 0)

      timeline.fromTo(
        shell,
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

    timeline.to(shells, { pointerEvents: "auto", duration: 0 }, ">-0.05")
  }

  function startIdleMotion() {
    if (!stageRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const floats = gsap.utils.toArray<HTMLElement>(".love-card-float", stageRef.current)
    floats.forEach((element, index) => {
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
  }, [cards.length, sceneMode])

  useEffect(() => {
    const root = rootRef.current
    const stage = stageRef.current
    if (!root || !stage || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      gsap.to(".love-orbit-a", { rotate: 360, duration: 88, repeat: -1, ease: "none", transformOrigin: "50% 50%" })
      gsap.to(".love-orbit-b", { rotate: -360, duration: 128, repeat: -1, ease: "none", transformOrigin: "50% 50%" })
      gsap.to(".love-spark", { y: -9, opacity: 0.62, scale: 1.35, duration: 3, stagger: { each: 0.13, from: "random" }, repeat: -1, yoyo: true, ease: "sine.inOut" })
      gsap.to(".love-hero-line", { scaleX: 1.18, opacity: 0.68, duration: 3.8, repeat: -1, yoyo: true, ease: "sine.inOut", transformOrigin: "50% 50%" })
      gsap.to(".love-soft-field", { scale: 1.05, duration: 8, repeat: -1, yoyo: true, ease: "sine.inOut" })
    }, root)

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const parallaxItems = gsap.utils.toArray<HTMLElement>(".love-card-parallax", stage)
    const fieldA = stage.querySelector<HTMLElement>(".love-field-a")
    const fieldB = stage.querySelector<HTMLElement>(".love-field-b")
    const itemQuick = parallaxItems.map((item) => ({
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
    gsap.fromTo(".love-focus-card", { y: 18, scale: 0.96, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.38, ease: "power3.out" })
  }, [selectedCard])

  const updateCard = (id: string, text: string) => {
    setCards((current) => current.map((item) => (item.id === id ? { ...item, text } : item)))
  }

  const addCard = () => {
    setCards((current) => [...current, { id: createId(), text: "写下一句你想留下的话。" }])
  }

  const removeCard = (id: string) => {
    setCards((current) => (current.length <= 1 ? current : current.filter((item) => item.id !== id)))
  }

  const resetAll = () => {
    setTitle("想对你说")
    setSubtitle("一些没什么大不了，但很想让你知道的小事。")
    setCards(defaultCards)
    setSceneMode("float")
    setSelectedId(null)

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
    <div ref={rootRef} className="relative h-[calc(100dvh-4rem)] min-h-[620px] overflow-hidden bg-[#f7f4f0] text-zinc-950 selection:bg-rose-200/70">
      <style>{`
        .love-card-shell { position:absolute; left:var(--left); top:var(--top); width:var(--width); min-height:var(--min-h); transform-origin:50% 50%; transform:translate(-50%,-50%); }
        .love-card-settle { transform:rotate(var(--r)); transform-origin:50% 50%; }
        .love-card-visual { box-shadow:0 28px 74px -50px rgba(67,49,88,.42),0 1px 0 rgba(255,255,255,.86) inset; transition:transform .42s cubic-bezier(.16,1,.3,1),box-shadow .42s ease,border-color .42s ease,filter .42s ease; }
        .love-card-shell:hover { z-index:90 !important; }
        .love-card-shell:hover .love-card-visual { transform:translateY(-7px) scale(1.028); box-shadow:0 42px 105px -44px rgba(65,45,96,.48),0 1px 0 rgba(255,255,255,.9) inset; border-color:rgba(139,92,246,.14); filter:saturate(1.04); }
        .love-paper-noise { background-image:radial-gradient(rgba(70,55,95,.07) .55px,transparent .55px); background-size:8px 8px; }
        .love-tape { background:linear-gradient(90deg,rgba(255,255,255,.34),rgba(249,225,211,.75),rgba(255,255,255,.3)); box-shadow:0 1px 0 rgba(255,255,255,.68) inset; }
        .love-vignette { background:radial-gradient(circle at center,transparent 43%,rgba(116,91,90,.065) 100%); }
        .love-scroll::-webkit-scrollbar { width:5px; height:5px; }
        .love-scroll::-webkit-scrollbar-track { background:transparent; }
        .love-scroll::-webkit-scrollbar-thumb { background:rgba(24,24,27,.14); border-radius:999px; }
        @media (max-width:1180px) {
          .love-card-shell { width:calc(var(--width) * 1.12); }
          .love-card-shell:nth-of-type(n+23) { display:none; }
        }
        @media (max-width:767px) {
          .love-card-shell { width:clamp(138px,42vw,196px); min-height:88px; }
          .love-card-shell:nth-of-type(n+13) { display:none; }
          .love-card-shell:nth-of-type(1){left:10%!important;top:27%!important}
          .love-card-shell:nth-of-type(2){left:68%!important;top:20%!important}
          .love-card-shell:nth-of-type(3){left:27%!important;top:38%!important}
          .love-card-shell:nth-of-type(4){left:73%!important;top:38%!important}
          .love-card-shell:nth-of-type(5){left:15%!important;top:53%!important}
          .love-card-shell:nth-of-type(6){left:66%!important;top:54%!important}
          .love-card-shell:nth-of-type(7){left:28%!important;top:68%!important}
          .love-card-shell:nth-of-type(8){left:73%!important;top:70%!important}
          .love-card-shell:nth-of-type(9){left:15%!important;top:82%!important}
          .love-card-shell:nth-of-type(10){left:63%!important;top:84%!important}
          .love-card-shell:nth-of-type(n+11){display:none}
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(253,226,243,.72),transparent_24%),radial-gradient(circle_at_88%_12%,rgba(219,234,254,.72),transparent_27%),radial-gradient(circle_at_52%_90%,rgba(237,233,254,.68),transparent_32%),radial-gradient(circle_at_28%_72%,rgba(209,250,229,.32),transparent_24%),linear-gradient(180deg,#fffaf7_0%,#f7f8fc_52%,#faf8f6_100%)]" />
      <div className="love-vignette pointer-events-none absolute inset-0" />

      <main className="relative h-full w-full">
        <header className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-start justify-between gap-4 px-5 pt-5 sm:px-7 sm:pt-6 lg:px-9">
          <div className="love-title-block pointer-events-auto max-w-[520px]">
            <div className="inline-flex items-center gap-2 text-[8px] uppercase tracking-[0.24em] text-violet-500/75">
              <SparkIcon />
              心迹 / Little Words
            </div>
            <h1 className="mt-2 text-[clamp(34px,4.2vw,72px)] font-semibold leading-[.94] tracking-[-0.065em]">{title || "想对你说"}</h1>
            <p className="mt-2 max-w-[52ch] text-[10px] leading-5 text-zinc-400 sm:text-[11px]">{subtitle || "一些没什么大不了，但很想让你知道的小事。"}</p>
          </div>

          <div className="love-control-bar pointer-events-auto flex flex-wrap items-center justify-end gap-2">
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

        <section ref={stageRef} className="absolute inset-0 overflow-hidden">
          <div className="love-soft-field love-field-a pointer-events-none absolute -left-24 top-[18%] h-[420px] w-[420px] rounded-full bg-rose-200/18 blur-[110px]" />
          <div className="love-soft-field love-field-b pointer-events-none absolute -right-28 top-[28%] h-[500px] w-[500px] rounded-full bg-sky-200/16 blur-[125px]" />
          <div className="love-soft-field pointer-events-none absolute bottom-[-160px] left-[38%] h-[500px] w-[500px] rounded-full bg-violet-200/12 blur-[130px]" />

          <div className="love-orbit-a pointer-events-none absolute left-[14%] top-[18%] h-[260px] w-[260px] rounded-full border border-rose-300/12">
            <span className="absolute left-[18%] top-[2%] h-1.5 w-1.5 rounded-full bg-rose-300/70" />
          </div>
          <div className="love-orbit-b pointer-events-none absolute bottom-[10%] right-[10%] h-[340px] w-[340px] rounded-full border border-violet-300/10">
            <span className="absolute right-[9%] top-[30%] h-1.5 w-1.5 rounded-full bg-violet-300/70" />
          </div>

          {Array.from({ length: 22 }).map((_, index) => (
            <span key={index} className="love-spark pointer-events-none absolute h-1 w-1 rounded-full bg-violet-300/50" style={{ left: `${5 + ((index * 17) % 90)}%`, top: `${11 + ((index * 29) % 78)}%`, opacity: 0.16 + (index % 5) * 0.06 }} />
          ))}

          <div className="pointer-events-none absolute left-1/2 top-1/2 z-[5] hidden -translate-x-1/2 -translate-y-1/2 text-center xl:block">
            <div className="love-hero-line mx-auto h-px w-20 bg-zinc-300/50" />
            <div className="mt-3 text-[8px] uppercase tracking-[0.28em] text-zinc-300">scattered around you</div>
          </div>

          {cards.map((card, index) => {
            const layout = getCardLayout(index, sceneMode)
            const accent = accentMap[layout.accent]
            const style = {
              "--left": `${layout.left}%`,
              "--top": `${layout.top}%`,
              "--width": `${layout.width}%`,
              "--min-h": `${layout.minHeight}px`,
              "--r": `${layout.rotate}deg`,
              zIndex: Math.round(10 + layout.depth * 24),
            } as CSSProperties

            return (
              <div key={card.id} className="love-card-shell opacity-0" data-index={index} data-depth={layout.depth} data-delay={layout.delay} style={style}>
                <div className="love-card-settle">
                  <div className="love-card-parallax" data-depth={layout.depth}>
                    <div className="love-card-float" data-depth={layout.depth}>
                      <article role="button" tabIndex={0} onClick={() => setSelectedId(card.id)} onKeyDown={(event) => { if (event.key === "Enter") setSelectedId(card.id) }} className="love-card-visual relative flex min-h-[var(--min-h)] cursor-pointer items-end overflow-hidden rounded-[24px] border border-black/[0.05] bg-[linear-gradient(145deg,rgba(255,255,255,.98),var(--wash))] p-4 text-[12px] leading-5 backdrop-blur-md outline-none transition focus-visible:ring-2 focus-visible:ring-violet-300" style={{ "--wash": accent.wash, color: accent.ink } as CSSProperties}>
                        <div className="love-paper-noise pointer-events-none absolute inset-0 opacity-[.18]" />
                        <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl" style={{ backgroundColor: accent.glow }} />
                        {layout.tape !== "none" && (
                          <span className={`love-tape pointer-events-none absolute h-5 w-14 rounded-sm opacity-70 ${layout.tape === "top" ? "left-1/2 top-[-6px] -translate-x-1/2 rotate-[-2deg]" : layout.tape === "pin" ? "left-4 top-4 h-2.5 w-2.5 rounded-full bg-current/20" : "left-3 top-[-4px] rotate-[-16deg]"}`} />
                        )}
                        <span className="absolute right-4 top-3 font-mono text-[7px] tracking-[0.16em] text-zinc-300">{String(index + 1).padStart(2, "0")}</span>
                        <span className="absolute left-4 top-4 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent.dot }} />
                        {layout.featured && <span className="pointer-events-none absolute bottom-1 right-3 text-[62px] font-serif leading-none text-zinc-900/[.025]">“</span>}
                        <p className={`relative z-10 max-w-[29ch] tracking-[-0.012em] ${layout.featured ? "text-[14px] font-medium leading-6" : ""}`}>{card.text || "..."}</p>
                      </article>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </section>

        <footer className="love-footer-signature pointer-events-none absolute inset-x-0 bottom-0 z-40 flex items-center justify-between px-5 pb-4 text-[8px] uppercase tracking-[0.18em] text-zinc-300 sm:px-7 lg:px-9">
          <span>BitLeap / 心迹</span>
          <span className="hidden sm:inline">Center burst · slow drift · parallax</span>
        </footer>
      </main>

      {selectedCard && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-zinc-950/18 p-5 backdrop-blur-[12px]">
          <button type="button" aria-label="关闭预览" onClick={() => setSelectedId(null)} className="absolute inset-0" />
          <div className="love-focus-card relative w-full max-w-[520px] overflow-hidden rounded-[34px] border border-white/80 bg-white/88 p-8 shadow-[0_30px_100px_-34px_rgba(40,22,70,.42)]">
            <button type="button" onClick={() => setSelectedId(null)} aria-label="关闭" className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-zinc-950 text-white transition hover:bg-violet-600">
              <CloseIcon />
            </button>
            <div className="text-[8px] uppercase tracking-[0.24em] text-violet-400">Selected little word</div>
            <p className="mt-8 text-[clamp(28px,4vw,46px)] font-semibold leading-[1.16] tracking-[-0.055em] text-zinc-900">{selectedCard.text}</p>
          </div>
        </div>
      )}

      {editorOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-zinc-950/20 p-0 backdrop-blur-[12px] sm:items-center sm:p-5">
          <button type="button" aria-label="关闭编辑器" onClick={() => setEditorOpen(false)} className="absolute inset-0" />

          <div className="relative flex h-[92dvh] w-full max-w-[1040px] flex-col overflow-hidden rounded-t-[30px] border border-white/80 bg-[#fbfafc]/97 shadow-[0_30px_100px_-28px_rgba(30,20,60,.38)] sm:h-[84dvh] sm:rounded-[30px]">
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-black/[0.06] bg-white/80 px-4 py-4 backdrop-blur-xl sm:px-6">
              <div>
                <div className="text-[9px] uppercase tracking-[0.22em] text-violet-400">Editor</div>
                <h3 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-zinc-950">编辑小卡片</h3>
              </div>

              <div className="flex items-center gap-2">
                <button type="button" onClick={() => copyText(exportJson, "json")} className="hidden h-9 items-center gap-2 rounded-full border border-black/[0.06] bg-white px-3 text-[10px] text-zinc-500 transition hover:text-violet-600 sm:inline-flex">
                  {copied === "json" ? "已复制 JSON" : "复制 JSON"}
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

            <div className="love-scroll min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-zinc-400">Title</span>
                  <input value={title} onChange={(event) => setTitle(event.target.value)} className="h-11 w-full rounded-[13px] border border-black/[0.06] bg-white px-3 text-sm font-medium text-zinc-800 outline-none transition focus:border-violet-300" />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-zinc-400">Subtitle</span>
                  <input value={subtitle} onChange={(event) => setSubtitle(event.target.value)} className="h-11 w-full rounded-[13px] border border-black/[0.06] bg-white px-3 text-sm text-zinc-700 outline-none transition focus:border-violet-300" />
                </label>
              </div>

              <div className="mt-6 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-300">Cards</div>
                  <div className="mt-1 text-xs text-zinc-500">桌面建议 20～30 张。小屏会自动隐藏一部分，保持全屏画面干净。</div>
                </div>

                <button type="button" onClick={addCard} className="inline-flex h-9 items-center gap-2 rounded-full bg-violet-600 px-3.5 text-[10px] font-semibold text-white transition hover:bg-violet-700">
                  <PlusIcon />
                  添加卡片
                </button>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {cards.map((card, index) => (
                  <div key={card.id} className="rounded-[18px] border border-black/[0.055] bg-white p-3.5 shadow-[0_18px_48px_-42px_rgba(68,45,110,.28)]">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="font-mono text-[9px] text-zinc-300">{String(index + 1).padStart(2, "0")}</span>
                      <button type="button" disabled={cards.length <= 1} onClick={() => removeCard(card.id)} className="inline-flex h-7 w-7 items-center justify-center rounded-full text-zinc-300 transition hover:bg-zinc-50 hover:text-zinc-700 disabled:opacity-20" aria-label="删除卡片">
                        <TrashIcon />
                      </button>
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
                <button type="button" onClick={() => { setEditorOpen(false); requestAnimationFrame(() => replay()) }} className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-5 text-xs font-semibold text-white transition hover:bg-violet-600">
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
