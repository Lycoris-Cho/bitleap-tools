'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'

type LoveCard = {
    id: string
    text: string
}

const STORAGE_KEY = 'bitleap-love-cards-fullscreen-v2'

const defaultCards: LoveCard[] = [
    { id: '1', text: '今天也要好好吃饭。' },
    { id: '2', text: '想把所有温柔都留给你。' },
    { id: '3', text: '晚安，记得盖好被子。' },
    { id: '4', text: '路上看到一只小猫，第一反应是想发给你。' },
    { id: '5', text: '你不用一直很厉害，累了就休息。' },
    { id: '6', text: '今天的风很舒服，突然有点想你。' },
    { id: '7', text: '到家记得告诉我一声。' },
    { id: '8', text: '下次一起去看海吧。' },
    { id: '9', text: '别熬太晚，我会担心。' },
    { id: '10', text: '分享欲是最高级的浪漫。' },
    { id: '11', text: '好想和你一起过很多个普通的日子。' },
    { id: '12', text: '你出现之后，日常也变得有一点闪闪发光。' },
    { id: '13', text: '今天也很喜欢你。' },
    { id: '14', text: '看到好看的晚霞会想到你。' },
    { id: '15', text: '希望你每次回头，我都还在。' },
    { id: '16', text: '有空的话，一起散散步吧。' },
    { id: '17', text: '你负责开心，剩下的慢慢来。' },
    { id: '18', text: '想和你浪费很多很多时间。' },
    { id: '19', text: '天气冷了，要记得多穿一点。' },
    { id: '20', text: '今天也要顺顺利利。' },
    { id: '21', text: '累的时候就靠一会儿。' },
    { id: '22', text: '别总是把难过藏起来。' },
    { id: '23', text: '希望你每天都有好消息。' },
    { id: '24', text: '想把今天发生的小事都讲给你听。' },
    { id: '25', text: '你已经做得很好了。' },
    { id: '26', text: '慢一点也没有关系。' },
    { id: '27', text: '记得喝水，也记得开心。' },
    { id: '28', text: '想见你的时候，连风都像在催我。' },
    { id: '29', text: '希望普通的日子里一直有你。' },
    { id: '30', text: '今天也想把好运分给你。' },
]

const cardTones = [
    'bg-[linear-gradient(145deg,rgba(255,255,255,.96),rgba(245,243,255,.92))]',
    'bg-[linear-gradient(145deg,rgba(255,255,255,.96),rgba(240,249,255,.92))]',
    'bg-[linear-gradient(145deg,rgba(255,255,255,.96),rgba(253,242,248,.90))]',
    'bg-[linear-gradient(145deg,rgba(255,255,255,.96),rgba(236,253,245,.90))]',
    'bg-[linear-gradient(145deg,rgba(255,255,255,.96),rgba(255,251,235,.90))]',
    'bg-[linear-gradient(145deg,rgba(255,255,255,.96),rgba(254,242,242,.90))]',
    'bg-[linear-gradient(145deg,rgba(255,255,255,.96),rgba(238,242,255,.92))]',
    'bg-[linear-gradient(145deg,rgba(255,255,255,.96),rgba(240,253,250,.90))]',
]

function createId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
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

function getEntrance(index: number) {
    if (typeof window === 'undefined') {
        return { x: 0, y: 0, rotate: 0 }
    }

    const width = window.innerWidth
    const height = window.innerHeight
    const side = index % 4

    if (side === 0) {
        return {
            x: -width * 1.25,
            y: gsap.utils.random(-height * 0.55, height * 0.55),
            rotate: gsap.utils.random(-18, -9),
        }
    }

    if (side === 1) {
        return {
            x: width * 1.25,
            y: gsap.utils.random(-height * 0.55, height * 0.55),
            rotate: gsap.utils.random(9, 18),
        }
    }

    if (side === 2) {
        return {
            x: gsap.utils.random(-width * 0.65, width * 0.65),
            y: -height * 1.1,
            rotate: gsap.utils.random(-14, 14),
        }
    }

    return {
        x: gsap.utils.random(-width * 0.65, width * 0.65),
        y: height * 1.1,
        rotate: gsap.utils.random(-14, 14),
    }
}

function escapeHtml(value: string) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;')
}

export default function LoveCardsFullscreenPage() {
    const rootRef = useRef<HTMLDivElement>(null)
    const stageRef = useRef<HTMLDivElement>(null)

    const [title, setTitle] = useState('想对你说')
    const [subtitle, setSubtitle] = useState('一些没什么大不了，但很想让你知道的小事。')
    const [cards, setCards] = useState<LoveCard[]>(defaultCards)
    const [editorOpen, setEditorOpen] = useState(false)
    const [hydrated, setHydrated] = useState(false)

    const cardCountLabel = useMemo(() => `${cards.length} CARDS`, [cards.length])

    useEffect(() => {
        try {
            const saved = window.localStorage.getItem(STORAGE_KEY)
            if (saved) {
                const parsed = JSON.parse(saved) as {
                    title?: string
                    subtitle?: string
                    cards?: LoveCard[]
                }

                if (parsed.title) setTitle(parsed.title)
                if (parsed.subtitle) setSubtitle(parsed.subtitle)
                if (Array.isArray(parsed.cards) && parsed.cards.length) setCards(parsed.cards)
            }
        } catch {
            // 保持默认数据
        } finally {
            setHydrated(true)
        }
    }, [])

    useEffect(() => {
        if (!hydrated) return

        const timer = window.setTimeout(() => {
            try {
                window.localStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify({ title, subtitle, cards }),
                )
            } catch {}
        }, 220)

        return () => window.clearTimeout(timer)
    }, [title, subtitle, cards, hydrated])

    useEffect(() => {
        if (!editorOpen) return

        const old = document.body.style.overflow
        document.body.style.overflow = 'hidden'

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setEditorOpen(false)
        }

        window.addEventListener('keydown', onKeyDown)

        return () => {
            document.body.style.overflow = old
            window.removeEventListener('keydown', onKeyDown)
        }
    }, [editorOpen])

    const replay = () => {
        if (!stageRef.current) return

        const elements = gsap.utils.toArray<HTMLElement>('.love-card', stageRef.current)
        gsap.killTweensOf(elements)

        elements.forEach((card, index) => {
            const from = getEntrance(index)
            const targetRotate = Number(card.dataset.rotate || 0)

            gsap.fromTo(
                card,
                {
                    x: from.x,
                    y: from.y,
                    rotate: from.rotate,
                    scale: 0.68,
                    opacity: 0,
                },
                {
                    x: 0,
                    y: 0,
                    rotate: targetRotate,
                    scale: 1,
                    opacity: 1,
                    duration: 0.98,
                    delay: Math.min(index * 0.026, 0.7),
                    ease: 'back.out(1.3)',
                },
            )
        })
    }

    useEffect(() => {
        const frame = requestAnimationFrame(() => replay())
        return () => cancelAnimationFrame(frame)
         
    }, [cards.length])

    const updateCard = (id: string, text: string) => {
        setCards((current) =>
            current.map((item) => (item.id === id ? { ...item, text } : item)),
        )
    }

    const addCard = () => {
        setCards((current) => [
            ...current,
            {
                id: createId(),
                text: '写下一句你想留下的话。',
            },
        ])
    }

    const removeCard = (id: string) => {
        setCards((current) =>
            current.length <= 1 ? current : current.filter((item) => item.id !== id),
        )
    }

    const resetAll = () => {
        setTitle('想对你说')
        setSubtitle('一些没什么大不了，但很想让你知道的小事。')
        setCards(defaultCards)

        try {
            window.localStorage.removeItem(STORAGE_KEY)
        } catch {}

        requestAnimationFrame(() => replay())
    }

    const exportHtml = () => {
        const safeTitle = escapeHtml(title || '想对你说')
        const safeSubtitle = escapeHtml(subtitle || '')

        const exportedCards = cards
            .map((card, index) => {
                const rotate = ((index % 9) - 4) * 0.55
                return `<article class="card tone-${index % 8}" data-index="${index}" style="--r:${rotate}deg">${escapeHtml(card.text || '...')}</article>`
            })
            .join('\n')

        const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${safeTitle}</title>
<style>
*{box-sizing:border-box}
html,body{margin:0;width:100%;min-height:100%;font-family:Inter,"PingFang SC","Microsoft YaHei",system-ui,sans-serif}
body{
overflow-x:hidden;
color:#18181b;
background:
radial-gradient(circle at 10% 12%,rgba(253,226,243,.82),transparent 26%),
radial-gradient(circle at 88% 14%,rgba(219,234,254,.82),transparent 28%),
radial-gradient(circle at 52% 88%,rgba(237,233,254,.82),transparent 34%),
radial-gradient(circle at 28% 72%,rgba(209,250,229,.42),transparent 24%),
linear-gradient(180deg,#fffafe 0%,#f7f9ff 52%,#faf9fd 100%);
}
.wrap{min-height:100vh;padding:24px}
.head{display:flex;justify-content:space-between;gap:24px;align-items:end;margin-bottom:18px}
.kicker{font-size:9px;letter-spacing:.22em;text-transform:uppercase;color:#8b5cf6;margin-bottom:6px}
h1{margin:0;font-size:clamp(32px,5vw,64px);letter-spacing:-.06em;line-height:.98}
.sub{margin:8px 0 0;color:#71717a;font-size:13px;line-height:1.7}
.tip{font-size:9px;color:#a1a1aa;letter-spacing:.14em;text-transform:uppercase}
.stage{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:13px}
.card{
min-height:118px;
padding:18px;
border-radius:22px;
border:1px solid rgba(24,24,27,.055);
box-shadow:0 24px 64px -50px rgba(68,45,110,.34);
display:flex;
align-items:flex-end;
font-size:13px;
line-height:1.7;
letter-spacing:-.01em;
transform:rotate(var(--r));
opacity:0;
}
.tone-0{background:linear-gradient(145deg,rgba(255,255,255,.96),rgba(245,243,255,.92))}
.tone-1{background:linear-gradient(145deg,rgba(255,255,255,.96),rgba(240,249,255,.92))}
.tone-2{background:linear-gradient(145deg,rgba(255,255,255,.96),rgba(253,242,248,.90))}
.tone-3{background:linear-gradient(145deg,rgba(255,255,255,.96),rgba(236,253,245,.90))}
.tone-4{background:linear-gradient(145deg,rgba(255,255,255,.96),rgba(255,251,235,.90))}
.tone-5{background:linear-gradient(145deg,rgba(255,255,255,.96),rgba(254,242,242,.90))}
.tone-6{background:linear-gradient(145deg,rgba(255,255,255,.96),rgba(238,242,255,.92))}
.tone-7{background:linear-gradient(145deg,rgba(255,255,255,.96),rgba(240,253,250,.90))}
@media(max-width:1280px){.stage{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media(max-width:980px){.stage{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:720px){.wrap{padding:16px}.head{align-items:start;flex-direction:column}.stage{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.card{min-height:105px;border-radius:18px;padding:15px}}
@media(max-width:460px){.stage{grid-template-columns:1fr}.card{min-height:92px}}
</style>
</head>
<body>
<main class="wrap">
<header class="head">
<div>
<div class="kicker">Memory Cards</div>
<h1>${safeTitle}</h1>
<p class="sub">${safeSubtitle}</p>
</div>
<div class="tip">Click anywhere to replay</div>
</header>
<section class="stage">${exportedCards}</section>
</main>
<script>
const cards=[...document.querySelectorAll('.card')];
function rnd(min,max){return Math.random()*(max-min)+min}
function entrance(index){
 const side=index%4;
 const w=innerWidth;
 const h=innerHeight;
 if(side===0)return[-w*1.25,rnd(-h*.55,h*.55),rnd(-18,-9)];
 if(side===1)return[w*1.25,rnd(-h*.55,h*.55),rnd(9,18)];
 if(side===2)return[rnd(-w*.65,w*.65),-h*1.1,rnd(-14,14)];
 return[rnd(-w*.65,w*.65),h*1.1,rnd(-14,14)];
}
function play(){
 cards.forEach((card,index)=>{
   card.getAnimations().forEach(a=>a.cancel());
   const [x,y,r]=entrance(index);
   const targetR=card.style.getPropertyValue('--r')||'0deg';
   card.animate([
     {transform:\`translate(\${x}px,\${y}px) rotate(\${r}deg) scale(.68)\`,opacity:0},
     {transform:\`translate(0,0) rotate(\${targetR}) scale(1)\`,opacity:1}
   ],{
     duration:980,
     delay:Math.min(index*26,700),
     easing:'cubic-bezier(.16,1,.3,1)',
     fill:'forwards'
   });
 });
}
addEventListener('load',play);
addEventListener('click',play);
</script>
</body>
</html>`

        const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${title.trim() || 'love-cards'}.html`
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
    }

    return (
        <div ref={rootRef} className="relative min-h-screen overflow-hidden bg-[#faf9fd] text-zinc-950">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(253,226,243,.78),transparent_25%),radial-gradient(circle_at_90%_12%,rgba(219,234,254,.80),transparent_27%),radial-gradient(circle_at_52%_90%,rgba(237,233,254,.78),transparent_32%),radial-gradient(circle_at_28%_72%,rgba(209,250,229,.38),transparent_24%),linear-gradient(180deg,#fffafe_0%,#f7f9ff_52%,#faf9fd_100%)]" />
            <div className="pointer-events-none absolute -left-28 top-[20%] h-[420px] w-[420px] rounded-full bg-rose-100/28 blur-[145px]" />
            <div className="pointer-events-none absolute -right-28 top-[30%] h-[460px] w-[460px] rounded-full bg-sky-100/32 blur-[155px]" />
            <div className="pointer-events-none absolute left-[42%] bottom-[-120px] h-[420px] w-[420px] rounded-full bg-violet-100/28 blur-[150px]" />

            <main className="relative min-h-screen w-full">
                <header className="relative z-20 flex flex-col gap-4 px-5 pb-4 pt-5 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8 xl:px-10">
                    <div>
                        <div className="inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.23em] text-violet-500">
                            <SparkIcon />
                            心迹 / Memory Cards
                        </div>

                        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <h1 className="text-3xl font-semibold tracking-[-0.055em] sm:text-4xl">
                                小情话卡片
                            </h1>
                            <span className="text-xs text-zinc-400">
                                从屏幕四方聚拢的碎碎念
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="mr-1 hidden font-mono text-[9px] tracking-[0.16em] text-zinc-300 sm:block">
                            {cardCountLabel}
                        </span>

                        <button
                            type="button"
                            onClick={replay}
                            className="inline-flex h-10 items-center gap-2 rounded-full border border-black/[0.06] bg-white/72 px-4 text-[10px] font-medium text-zinc-600 shadow-sm backdrop-blur-md transition hover:border-violet-200 hover:text-violet-600"
                        >
                            <RefreshIcon />
                            再播放一次
                        </button>

                        <button
                            type="button"
                            onClick={() => setEditorOpen(true)}
                            className="inline-flex h-10 items-center gap-2 rounded-full border border-violet-100 bg-violet-50/78 px-4 text-[10px] font-semibold text-violet-600 backdrop-blur-md transition hover:bg-violet-100"
                        >
                            <PlusIcon />
                            编辑卡片
                        </button>

                        <button
                            type="button"
                            onClick={exportHtml}
                            className="inline-flex h-10 items-center gap-2 rounded-full bg-zinc-950 px-4 text-[10px] font-semibold text-white shadow-[0_14px_30px_-20px_rgba(24,24,27,.6)] transition hover:-translate-y-0.5 hover:bg-violet-600"
                        >
                            <DownloadIcon />
                            导出 HTML
                        </button>
                    </div>
                </header>

                <section className="relative z-10 border-y border-black/[0.045] bg-white/18 px-4 py-5 backdrop-blur-[5px] sm:px-5 lg:px-6 xl:px-8">
                    <div className="mb-5 flex flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <div className="text-[9px] uppercase tracking-[0.22em] text-zinc-300">
                                Your little words
                            </div>
                            <h2 className="mt-1.5 text-2xl font-semibold tracking-[-0.045em] text-zinc-950">
                                {title || '想对你说'}
                            </h2>
                            <p className="mt-1.5 max-w-[60ch] text-xs leading-6 text-zinc-400">
                                {subtitle || '一些没什么大不了，但很想让你知道的小事。'}
                            </p>
                        </div>

                        <p className="text-[10px] text-zinc-300">
                            卡片会从整个屏幕之外飞进来。
                        </p>
                    </div>

                    <div
                        ref={stageRef}
                        className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                    >
                        {cards.map((card, index) => {
                            const rotate = ((index % 9) - 4) * 0.55
                            const tone = cardTones[index % cardTones.length]

                            return (
                                <article
                                    key={card.id}
                                    data-rotate={rotate}
                                    className={`love-card relative flex min-h-[116px] items-end overflow-hidden rounded-[22px] border border-black/[0.05] p-4 text-[13px] leading-6 text-zinc-700 opacity-0 shadow-[0_24px_64px_-50px_rgba(68,45,110,.34)] backdrop-blur-md sm:p-5 ${tone}`}
                                    style={{ transform: `rotate(${rotate}deg)` }}
                                >
                                    <span className="absolute right-4 top-4 font-mono text-[8px] tracking-[0.16em] text-zinc-300">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <p className="relative max-w-[30ch]">{card.text || '...'}</p>
                                </article>
                            )
                        })}
                    </div>
                </section>

                <footer className="relative z-20 flex flex-col gap-2 px-5 py-4 text-[9px] uppercase tracking-[0.18em] text-zinc-300 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8 xl:px-10">
                    <span>BitLeap / 心迹</span>
                    <span>Exported HTML works standalone.</span>
                </footer>
            </main>

            {editorOpen && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center bg-zinc-950/18 p-0 backdrop-blur-[10px] sm:items-center sm:p-5">
                    <button
                        type="button"
                        aria-label="关闭编辑器"
                        onClick={() => setEditorOpen(false)}
                        className="absolute inset-0"
                    />

                    <div className="relative flex h-[92dvh] w-full max-w-[980px] flex-col overflow-hidden rounded-t-[30px] border border-white/80 bg-[#fbfafc]/97 shadow-[0_30px_100px_-28px_rgba(30,20,60,.38)] sm:h-[84dvh] sm:rounded-[30px]">
                        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-black/[0.06] bg-white/80 px-4 py-4 backdrop-blur-xl sm:px-6">
                            <div>
                                <div className="text-[9px] uppercase tracking-[0.22em] text-violet-400">
                                    Editor
                                </div>
                                <h3 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-zinc-950">
                                    编辑小卡片
                                </h3>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={resetAll}
                                    className="inline-flex h-9 items-center gap-2 rounded-full border border-black/[0.06] bg-white px-3 text-[10px] text-zinc-500 transition hover:text-violet-600"
                                >
                                    <RefreshIcon />
                                    重置
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setEditorOpen(false)}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-zinc-950 text-lg font-light text-white transition hover:bg-violet-600"
                                    aria-label="关闭"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="block">
                                    <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-zinc-400">
                                        Title
                                    </span>
                                    <input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="h-11 w-full rounded-[13px] border border-black/[0.06] bg-white px-3 text-sm font-medium text-zinc-800 outline-none transition focus:border-violet-300"
                                    />
                                </label>

                                <label className="block">
                                    <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-zinc-400">
                                        Subtitle
                                    </span>
                                    <input
                                        value={subtitle}
                                        onChange={(e) => setSubtitle(e.target.value)}
                                        className="h-11 w-full rounded-[13px] border border-black/[0.06] bg-white px-3 text-sm text-zinc-700 outline-none transition focus:border-violet-300"
                                    />
                                </label>
                            </div>

                            <div className="mt-6 flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-300">
                                        Cards
                                    </div>
                                    <div className="mt-1 text-xs text-zinc-500">
                                        建议 20～36 张，全屏效果会更丰富。
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={addCard}
                                    className="inline-flex h-9 items-center gap-2 rounded-full bg-violet-600 px-3.5 text-[10px] font-semibold text-white transition hover:bg-violet-700"
                                >
                                    <PlusIcon />
                                    添加卡片
                                </button>
                            </div>

                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                                {cards.map((card, index) => (
                                    <div
                                        key={card.id}
                                        className="rounded-[18px] border border-black/[0.055] bg-white p-3.5 shadow-[0_18px_48px_-42px_rgba(68,45,110,.28)]"
                                    >
                                        <div className="mb-2 flex items-center justify-between gap-3">
                                            <span className="font-mono text-[9px] text-zinc-300">
                                                {String(index + 1).padStart(2, '0')}
                                            </span>

                                            <button
                                                type="button"
                                                disabled={cards.length <= 1}
                                                onClick={() => removeCard(card.id)}
                                                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-zinc-300 transition hover:bg-zinc-50 hover:text-zinc-700 disabled:opacity-20"
                                                aria-label="删除卡片"
                                            >
                                                <TrashIcon />
                                            </button>
                                        </div>

                                        <textarea
                                            rows={3}
                                            value={card.text}
                                            onChange={(e) => updateCard(card.id, e.target.value)}
                                            className="w-full resize-none rounded-[12px] border border-black/[0.05] bg-[#fafafa] px-3 py-2.5 text-xs leading-6 text-zinc-700 outline-none transition focus:border-violet-300 focus:bg-white"
                                        />
                                    </div>
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={addCard}
                                className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-[16px] border border-dashed border-violet-200 bg-violet-50/40 text-xs font-semibold text-violet-600 transition hover:bg-violet-50"
                            >
                                <PlusIcon />
                                再添加一张
                            </button>
                        </div>

                        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-black/[0.06] bg-white/82 px-4 py-3 sm:px-6">
                            <span className="text-[10px] text-zinc-400">
                                修改会自动保存在当前浏览器
                            </span>

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
            )}
        </div>
    )
}
