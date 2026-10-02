'use client'

import Image from 'next/image'
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/* =========================================================
   图片墙说明
   ---------------------------------------------------------
   GALLERY 里每条对应图片墙的一张图，只渲染 src 已填写的条目，
   所以「只有一张图」也不会留下空格子。

   加图：把图片放进 public/image/about/，照着下面复制一条，
        把 src 换成 '/image/about/文件名.jpg' 即可。
   比例：图片用 object-cover 填充，想让整张图完整显示，
        就让 className 里的 aspect-[…] 等于图片本身的比例。
   槽位清单见 public/image/about/README.md
   ========================================================= */

const skills = ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'GSAP']

const facts = [
    { label: '名字', value: 'Lycoris / リコリス' },
    { label: '身份', value: 'Frontend Developer' },
    { label: '专注', value: '前端开发 · 界面细节 · 交互动效' },
    { label: '喜欢', value: '二次元 · 界面美学 ·《紫罗兰永恒花园》' },
    { label: '在做', value: 'BitLeap —— 一个「前端 × 日常」的小实验室' },
    { label: '状态', value: '开放合作 · 欢迎来聊' },
]

const interests = [
    { text: '二次元', emoji: '🌸' },
    { text: '动画', emoji: '🎬' },
    { text: '界面美学', emoji: '🎨' },
    { text: '配色', emoji: '🖌️' },
    { text: '微动效', emoji: '✨' },
    { text: '紫色', emoji: '💜' },
    { text: '樱花', emoji: '🌷' },
    { text: '《紫罗兰永恒花园》', emoji: '📖' },
    { text: '细节控', emoji: '🔍' },
    { text: '安静地迭代', emoji: '🌙' },
]

const contacts = [
    {
        label: 'Email',
        value: '1756204616@qq.com',
        href: 'mailto:1756204616@qq.com',
        emoji: '✉️',
    },
    {
        label: 'WeChat',
        value: 'fxy98942698338',
        href: '#',
        emoji: '💬',
    },
    {
        label: 'QQ',
        value: '1756204616',
        href: '#',
        emoji: '🐧',
    },
    {
        label: 'Phone',
        value: '15085948691',
        href: 'tel:15085948691',
        emoji: '📱',
    },
]

/* 图片墙：只放已经有的图，src 留空的条目直接不渲染 */
const GALLERY = [
    {
        id: 'A1',
        src: '/image/about/deepseek-flash-v4.png',
        alt: 'DeepSeek 娘 · 宽幅主图',
        className: 'col-span-2 md:col-span-4 aspect-[2600/1381]',
        sizes: '100vw',
    },
    // 以后再加图，照抄上面一条改 id / src / alt 和 aspect 就行，
    // 例如：
    // {
    //     id: 'A2',
    //     src: '/image/about/gallery-01.jpg',
    //     alt: '切片 01',
    //     className: 'col-span-1 md:col-span-2 aspect-square',
    //     sizes: '(max-width: 768px) 50vw, 25vw',
    // },
]

/* 四角星：渐变取页面极光的紫 / 粉 / 蓝 */
const SPARKLE_TONES = [
    ['#c4b5fd', '#f9a8d4'], // 紫 → 粉
    ['#f9a8d4', '#7dd3fc'], // 粉 → 蓝
    ['#7dd3fc', '#c4b5fd'], // 蓝 → 紫
    ['#ffffff', '#ddd6fe'], // 白 → 淡紫
]

/* 掉落星：延迟取负值，让星星一进页面就已经铺在天空里 */
const sparkles = Array.from({ length: 16 }, (_, i) => {
    const duration = 17 + (i % 6) * 2.4

    return {
        left: 2 + ((i * 6.4 + (i % 3) * 7.5) % 96),
        // 每五颗里挑一颗放大，当视觉焦点
        size: i % 5 === 0 ? 22 + (i % 3) * 5 : 9 + (i % 4) * 3.2,
        duration,
        delay: -duration * ((i % 8) / 8),
        sway: 22 + (i % 5) * 12,
        swayDuration: 3.4 + (i % 4) * 0.9,
        twinkle: 1.3 + (i % 5) * 0.32,
        opacity: 0.45 + (i % 3) * 0.18,
        tone: i % SPARKLE_TONES.length,
    }
})

/* 星光 */
const stars = [
    { left: 8, top: 16, size: 3, delay: 0 },
    { left: 22, top: 62, size: 2, delay: 0.7 },
    { left: 34, top: 28, size: 4, delay: 1.4 },
    { left: 46, top: 74, size: 2, delay: 0.3 },
    { left: 58, top: 12, size: 3, delay: 1.9 },
    { left: 68, top: 46, size: 2, delay: 1.1 },
    { left: 79, top: 82, size: 3, delay: 0.5 },
    { left: 88, top: 32, size: 2, delay: 2.3 },
    { left: 94, top: 66, size: 3, delay: 1.6 },
    { left: 14, top: 88, size: 2, delay: 2.7 },
]

/* =========================================================
   Icons
   ========================================================= */

function ArrowUpRightIcon() {
    return (
        <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            aria-hidden="true"
        >
            <path d="M7 17 17 7" />
            <path d="M7 7h10v10" />
        </svg>
    )
}

function ArrowDownIcon() {
    return (
        <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            aria-hidden="true"
        >
            <path d="M12 5v14" />
            <path d="m6 13 6 6 6-6" />
        </svg>
    )
}

function StarIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className={className}
            aria-hidden="true"
        >
            <path d="M12 2.6l2.5 6.4 6.6.4-5.1 4.2 1.7 6.4L12 16.4 6.3 20l1.7-6.4L2.9 9.4l6.6-.4L12 2.6Z" />
        </svg>
    )
}

function ShareIcon() {
    return (
        <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.7}
            aria-hidden="true"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m4.24-10.586a2.25 2.25 0 1 0 0 2.186m0-2.186A2.25 2.25 0 0 1 20.25 9a2.25 2.25 0 0 1-.283 1.093m0-2.186L9.75 12m10.217 4.907L9.75 12m0-4.907 10.217-5.314"
            />
        </svg>
    )
}

/* 漫画网点 */
function Halftone({ className = '' }: { className?: string }) {
    return (
        <div
            className={`pointer-events-none [background-image:radial-gradient(rgba(139,92,246,.34)_1.3px,transparent_1.3px)] [background-size:12px_12px] ${className}`}
        />
    )
}

/* 环形文字徽章 */
function CircleBadge() {
    return (
        <div className="relative h-24 w-24 sm:h-32 sm:w-32">
            <div className="about-badge-spin h-full w-full">
                <svg viewBox="0 0 200 200" className="h-full w-full">
                    <defs>
                        <path
                            id="about-badge-path"
                            d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0"
                        />
                    </defs>

                    <circle
                        cx="100"
                        cy="100"
                        r="96"
                        className="fill-white/85 stroke-zinc-900/[0.85]"
                        strokeWidth="3"
                    />

                    <text className="fill-violet-500 text-[13px] tracking-[0.32em]">
                        <textPath href="#about-badge-path" startOffset="0">
                            LYCORIS · FRONTEND · UI · MOTION ·
                        </textPath>
                    </text>
                </svg>
            </div>

            <span className="absolute inset-0 flex items-center justify-center text-[11px] tracking-[0.2em] text-violet-500">
                <StarIcon className="h-4 w-4" />
            </span>
        </div>
    )
}

/* =========================================================
   图片墙
   ========================================================= */

function ImageSlot({
    src,
    alt,
    className = '',
    sizes = '(max-width: 768px) 50vw, 25vw',
}: {
    src: string
    alt: string
    className?: string
    sizes?: string
}) {
    return (
        <div
            className={`relative overflow-hidden rounded-[22px] border-2 border-zinc-900/[0.85] bg-white shadow-[6px_6px_0_0_#e9d5ff] transition duration-500 group-hover:-translate-y-1.5 group-hover:shadow-[8px_10px_0_0_#ddd6fe] ${className}`}
        >
            <Image
                src={src}
                alt={alt}
                fill
                sizes={sizes}
                className="object-cover transition duration-[900ms] group-hover:scale-[1.04]"
            />
        </div>
    )
}

/* =========================================================
   小件
   ========================================================= */

function SectionHead({
    kana,
    title,
    note,
    aside,
    tone = 'light',
}: {
    kana: string
    title: string
    note?: string
    aside?: ReactNode
    tone?: 'light' | 'dark'
}) {
    const dark = tone === 'dark'

    return (
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
                <div className="flex items-center gap-2">
                    <StarIcon
                        className={`h-3 w-3 ${dark ? 'text-violet-300' : 'text-violet-400'}`}
                    />
                    <span
                        className={`text-[10px] tracking-[0.3em] ${dark ? 'text-violet-300' : 'text-violet-500'}`}
                    >
                        {kana}
                    </span>
                </div>

                <h2
                    className={`mt-2 text-[clamp(1.9rem,4vw,3rem)] font-semibold tracking-[-0.04em] ${dark ? 'text-white' : 'text-zinc-950'}`}
                >
                    {title}
                </h2>
            </div>

            {aside ??
                (note ? (
                    <p
                        className={`max-w-[52ch] text-xs leading-6 md:text-right ${dark ? 'text-white/55' : 'text-zinc-500'}`}
                    >
                        {note}
                    </p>
                ) : null)}
        </div>
    )
}

/* 全宽区块 */
function Band({
    id,
    className = '',
    children,
}: {
    id?: string
    className?: string
    children: ReactNode
}) {
    return (
        <section id={id} className={`relative w-full overflow-hidden ${className}`}>
            <div className="mx-auto w-full max-w-[1680px] px-6 py-16 sm:px-8 lg:px-12 lg:py-24">
                {children}
            </div>
        </section>
    )
}

/* =========================================================
   Page
   ========================================================= */

export default function AboutPage() {
    const rootRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger)

        const reduceMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ).matches

        if (reduceMotion || !rootRef.current) return

        const ctx = gsap.context(() => {
            /* ---------- 首屏 ---------- */
            const intro = gsap.timeline({
                defaults: { ease: 'power4.out' },
            })

            intro
                .from('.about-kicker', {
                    y: 16,
                    opacity: 0,
                    duration: 0.45,
                })
                .from(
                    '.about-name-line',
                    {
                        y: 70,
                        opacity: 0,
                        rotate: 1.2,
                        duration: 0.85,
                        stagger: 0.09,
                    },
                    '-=0.2',
                )
                .from(
                    '.about-bubble',
                    { y: 22, opacity: 0, scale: 0.97, duration: 0.5 },
                    '-=0.45',
                )
                .from(
                    '.about-skill',
                    {
                        y: 14,
                        opacity: 0,
                        scale: 0.96,
                        duration: 0.34,
                        stagger: 0.05,
                    },
                    '-=0.3',
                )
                .from(
                    '.about-avatar',
                    { y: 18, opacity: 0, scale: 0.9, duration: 0.5 },
                    '-=0.4',
                )
                .from(
                    '.about-portrait',
                    { x: 90, opacity: 0, scale: 0.97, duration: 1.1 },
                    '-=0.9',
                )
                .from(
                    '.about-badge',
                    { scale: 0.5, opacity: 0, rotate: -60, duration: 0.7 },
                    '-=0.7',
                )
                .from(
                    '.about-ghost',
                    { x: 80, opacity: 0, duration: 1 },
                    '-=1',
                )

            /* ---------- 区块进场 ---------- */
            gsap.utils
                .toArray<HTMLElement>('.about-reveal')
                .forEach((element) => {
                    const tween = gsap.fromTo(
                        element,
                        { y: 34, opacity: 0 },
                        {
                            y: 0,
                            opacity: 1,
                            duration: 0.75,
                            ease: 'power3.out',
                            paused: true,
                        },
                    )

                    ScrollTrigger.create({
                        trigger: element,
                        start: 'top 90%',
                        animation: tween,
                        toggleActions: 'play none none reverse',
                    })
                })

            /* ---------- 背景极光 ---------- */
            gsap.to('.about-aurora-a', {
                x: 120,
                y: 60,
                scale: 1.15,
                duration: 18,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
            })

            gsap.to('.about-aurora-b', {
                x: -110,
                y: 80,
                scale: 0.9,
                duration: 22,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
            })

            gsap.to('.about-aurora-c', {
                x: 90,
                y: -70,
                scale: 1.2,
                duration: 26,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
            })

            /* ---------- 星光闪烁 ---------- */
            gsap.to('.about-twinkle', {
                opacity: 0.15,
                scale: 0.6,
                duration: 1.8,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
                stagger: { each: 0.28, from: 'random' },
            })

            /* ---------- 星星 / 徽章 ---------- */
            gsap.to('.about-spark', {
                opacity: 0.3,
                scale: 0.8,
                duration: 1.7,
                repeat: -1,
                yoyo: true,
                stagger: 0.45,
                ease: 'sine.inOut',
            })

            gsap.to('.about-badge-spin', {
                rotate: 360,
                duration: 26,
                repeat: -1,
                ease: 'none',
            })

            /* ---------- 角色浮动 ---------- */
            gsap.to('.about-portrait', {
                y: -14,
                duration: 5.5,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
            })

            gsap.to('.about-ghost', {
                xPercent: -4,
                duration: 12,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
            })

            /* ---------- 滚动视差 ---------- */
            gsap.to('.about-portrait-scroll', {
                y: -90,
                ease: 'none',
                scrollTrigger: {
                    trigger: '.about-hero',
                    start: 'top top',
                    end: 'bottom top',
                    scrub: 0.7,
                },
            })

            gsap.to('.about-hero-copy', {
                y: 50,
                opacity: 0.35,
                ease: 'none',
                scrollTrigger: {
                    trigger: '.about-hero',
                    start: 'top top',
                    end: 'bottom top',
                    scrub: 0.7,
                },
            })
        }, rootRef)

        requestAnimationFrame(() => ScrollTrigger.refresh())

        const handleLoad = () => ScrollTrigger.refresh()
        window.addEventListener('load', handleLoad)

        return () => {
            window.removeEventListener('load', handleLoad)
            ctx.revert()
        }
    }, [])

    /* 鼠标视差 */
    useEffect(() => {
        const reduceMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ).matches

        if (
            reduceMotion ||
            !window.matchMedia('(hover: hover) and (pointer: fine)').matches
        ) {
            return
        }

        const portraitX = gsap.quickTo('.about-portrait-mouse', 'x', {
            duration: 0.9,
            ease: 'power3',
        })
        const portraitY = gsap.quickTo('.about-portrait-mouse', 'y', {
            duration: 0.9,
            ease: 'power3',
        })
        const auroraX = gsap.quickTo('.about-aurora-a', 'xPercent', {
            duration: 1.6,
            ease: 'power3',
        })

        const handleMove = (event: MouseEvent) => {
            const nx = event.clientX / window.innerWidth - 0.5
            const ny = event.clientY / window.innerHeight - 0.5

            portraitX(nx * 30)
            portraitY(ny * 20)
            auroraX(nx * 4)
        }

        window.addEventListener('mousemove', handleMove)

        return () => window.removeEventListener('mousemove', handleMove)
    }, [])

    const handleShare = async () => {
        const url = window.location.href
        const text = '这是 Lycoris 的个人主页 ✨'

        if (navigator.share) {
            try {
                await navigator.share({ title: 'Lycoris', text, url })
            } catch {}
            return
        }

        try {
            await navigator.clipboard.writeText(`${text}\n${url}`)
        } catch {}
    }

    return (
        <div
            ref={rootRef}
            className="font-['myFont',sans-serif] relative min-h-[calc(100vh-4rem)] overflow-hidden text-zinc-950"
        >
            {/* ================= 背景 ================= */}
            <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
                {/* 底色渐变 */}
                <div className="absolute inset-0 bg-[linear-gradient(165deg,#f4efff_0%,#fdeef7_28%,#f3f7ff_58%,#f6f0ff_80%,#fdf1f8_100%)]" />

                {/* 极光色块 */}
                <div className="about-aurora-a absolute -left-[12%] top-[4%] h-[46rem] w-[46rem] rounded-full bg-violet-300/45 blur-[130px]" />
                <div className="about-aurora-b absolute right-[-14%] top-[18%] h-[44rem] w-[44rem] rounded-full bg-pink-200/55 blur-[140px]" />
                <div className="about-aurora-c absolute bottom-[-16%] left-[24%] h-[42rem] w-[42rem] rounded-full bg-sky-200/45 blur-[140px]" />

                {/* 网点 + 星光 */}
                <Halftone className="absolute inset-0 opacity-[0.22]" />

                <div className="absolute inset-0">
                    {stars.map((star, index) => (
                        <span
                            key={index}
                            className="about-twinkle absolute rounded-full bg-violet-400/60"
                            style={{
                                left: `${star.left}%`,
                                top: `${star.top}%`,
                                width: `${star.size}px`,
                                height: `${star.size}px`,
                                animationDelay: `${star.delay}s`,
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* ================= 掉落四角星（整页） ================= */}
            <div className="pointer-events-none fixed inset-0 z-0 hidden overflow-hidden md:block">
                {sparkles.map((sparkle, index) => {
                    const [from, to] = SPARKLE_TONES[sparkle.tone]
                    const gradientId = `about-sparkle-${index}`

                    return (
                        <span
                            key={index}
                            className="absolute top-0"
                            style={
                                {
                                    left: `${sparkle.left}%`,
                                    '--star-sway': `${sparkle.sway}px`,
                                    animation: `star-fall ${sparkle.duration}s linear infinite`,
                                    animationDelay: `${sparkle.delay}s`,
                                } as CSSProperties
                            }
                        >
                            <span
                                className="block"
                                style={{
                                    animation: `star-sway ${sparkle.swayDuration}s ease-in-out infinite alternate`,
                                    animationDelay: `${-(index % 5) * 0.6}s`,
                                }}
                            >
                                <svg
                                    width={sparkle.size}
                                    height={sparkle.size}
                                    viewBox="0 0 24 24"
                                    className="block"
                                    aria-hidden="true"
                                    style={{
                                        opacity: sparkle.opacity,
                                        animation: `star-twinkle ${sparkle.twinkle}s ease-in-out infinite alternate`,
                                        animationDelay: `${-(index % 6) * 0.35}s`,
                                    }}
                                >
                                    <defs>
                                        <linearGradient
                                            id={gradientId}
                                            x1="0"
                                            y1="0"
                                            x2="1"
                                            y2="1"
                                        >
                                            <stop
                                                offset="0%"
                                                stopColor={from}
                                            />
                                            <stop
                                                offset="100%"
                                                stopColor={to}
                                            />
                                        </linearGradient>
                                    </defs>

                                    <path
                                        d="M12 0C12.7 6.7 17.3 11.3 24 12C17.3 12.7 12.7 17.3 12 24C11.3 17.3 6.7 12.7 0 12C6.7 11.3 11.3 6.7 12 0Z"
                                        fill={`url(#${gradientId})`}
                                    />
                                </svg>
                            </span>
                        </span>
                    )
                })}
            </div>

            {/* ================= 首屏 ================= */}
            <section className="about-hero relative z-10 flex min-h-[calc(100svh-4rem)] w-full flex-col justify-center overflow-hidden">
                {/* 巨型幽灵字 */}
                <div className="about-ghost pointer-events-none absolute bottom-[6%] right-[1%] z-0 select-none text-[clamp(5rem,19vw,19rem)] font-black leading-[0.8] tracking-[-0.05em] text-violet-400/20">
                    リコリス
                </div>

                <div className="about-hero-copy relative z-10 mx-auto w-full max-w-[1680px] px-6 pb-10 pt-14 sm:px-8 lg:px-12 lg:py-24">
                    <div className="max-w-[44rem]">
                        <div className="about-kicker flex flex-wrap items-center gap-3">
                            <span className="flex items-center gap-2 rounded-full border-2 border-zinc-900/[0.85] bg-white/80 px-3.5 py-1.5 text-[11px] tracking-[0.32em] text-violet-500 shadow-[3px_3px_0_0_#e9d5ff] backdrop-blur">
                                <StarIcon className="h-3 w-3" />
                                リコリス
                            </span>

                            <span className="inline-flex items-center gap-2 rounded-full border-2 border-emerald-300/70 bg-white/80 px-3 py-1.5 text-[10px] font-medium text-emerald-700 backdrop-blur">
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                </span>
                                Available for work
                            </span>
                        </div>

                        {/* 头像 */}
                        <div className="about-avatar relative mt-8 inline-block">
                            <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-zinc-900/[0.85] bg-white shadow-[5px_5px_0_0_#e9d5ff] sm:h-28 sm:w-28">
                                <Image
                                    src="/image/head2.jpg"
                                    alt="Lycoris"
                                    fill
                                    sizes="112px"
                                    className="object-cover"
                                    priority
                                />
                            </div>

                            <span className="absolute -bottom-2 -right-6 rotate-[-8deg] whitespace-nowrap rounded-full border-2 border-zinc-900/[0.85] bg-violet-100 px-3 py-1 text-[10px] font-medium text-violet-700">
                                ★ Frontend
                            </span>
                        </div>

                        <div className="mt-8">
                            <div className="overflow-hidden pb-1">
                                <div className="about-name-line text-[clamp(3.4rem,10.5vw,9.5rem)] font-black leading-[0.82] tracking-[-0.06em] text-zinc-950">
                                    Lycoris
                                </div>
                            </div>

                            <div className="mt-2 overflow-hidden pb-1">
                                <div className="about-name-line bg-[linear-gradient(100deg,#7c3aed_0%,#ec4899_38%,#7c3aed_70%,#0ea5e9_100%)] bg-[length:220%_auto] bg-clip-text text-[clamp(1.6rem,4.4vw,3.4rem)] font-medium leading-[1.05] tracking-[-0.04em] text-transparent [animation:shimmer_9s_linear_infinite]">
                                    Frontend Developer
                                </div>
                            </div>

                            <div className="mt-1 overflow-hidden pb-2">
                                <div className="about-name-line text-[clamp(1.4rem,3.6vw,2.8rem)] font-medium leading-[1.1] tracking-[-0.035em] text-zinc-800">
                                    &amp; CSS Enthusiast
                                </div>
                            </div>
                        </div>

                        {/* 一言 */}
                        <div className="about-bubble relative mt-9 max-w-[38rem] rounded-[24px] border-2 border-zinc-900/[0.85] bg-white/80 px-6 py-5 shadow-[5px_5px_0_0_#e9d5ff] backdrop-blur">
                            <p className="text-sm leading-7 text-zinc-700 sm:text-base">
                                Craft beautiful interfaces with code &amp;
                                imagination.
                            </p>
                            <p className="mt-1 text-sm leading-7 text-zinc-500 sm:text-base">
                                喜欢把「能用」再往前推一点，推到「顺手」。
                            </p>

                            <span className="absolute -bottom-[9px] left-10 h-3.5 w-3.5 rotate-45 border-b-2 border-r-2 border-zinc-900/[0.85] bg-white" />
                        </div>

                        <div className="mt-8 flex flex-wrap items-center gap-2">
                            {skills.map((skill) => (
                                <span
                                    key={skill}
                                    className="about-skill rounded-full border border-zinc-900/[0.14] bg-white/70 px-3.5 py-1.5 text-[11px] font-medium text-zinc-600 backdrop-blur"
                                >
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 角色：小屏在文档流里，大屏铺满右侧并越过首屏下沿 */}
                <div className="about-portrait-scroll relative z-[1] h-[56vh] min-h-[360px] w-full lg:pointer-events-none lg:absolute lg:right-0 lg:top-0 lg:h-[120%] lg:w-[60%]">
                    {/* 光晕 */}
                    <div className="pointer-events-none absolute left-1/2 top-1/2 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/50 blur-[90px]" />

                    <div className="about-portrait-mouse relative h-full w-full">
                        <div className="about-portrait relative h-full w-full">
                            <Image
                                src="/image/kp5.png"
                                alt="Lycoris Character — 薇尔莉特"
                                fill
                                sizes="(max-width: 1024px) 100vw, 60vw"
                                className="object-contain object-bottom lg:object-bottom-right"
                                priority
                            />
                        </div>
                    </div>
                </div>

                {/* 竖排日文装饰 */}
                <div className="pointer-events-none absolute left-5 top-1/2 z-10 hidden -translate-y-1/2 [writing-mode:vertical-rl] text-[11px] tracking-[0.42em] text-violet-400/75 lg:block">
                    リコリス・フロントエンドエンジニア
                </div>

                {/* 环形徽章：压在角色身上 */}
                <div className="about-badge pointer-events-none absolute bottom-[16%] right-6 z-20 hidden lg:block lg:right-[8%]">
                    <CircleBadge />
                </div>

                {/* 滚动提示 */}
                <div className="absolute bottom-8 left-1/2 z-20 hidden -translate-x-1/2 items-center gap-2 text-[10px] tracking-[0.24em] text-violet-500 lg:flex">
                    <span className="animate-bounce">
                        <ArrowDownIcon />
                    </span>
                    SCROLL
                </div>
            </section>

            {/* ================= 基本情報 ================= */}
            <Band
                id="profile"
                className="about-reveal z-10 border-y-2 border-zinc-900/[0.85] bg-white/60 backdrop-blur-xl"
            >
                <SectionHead
                    kana="プロフィール"
                    title="基本情報"
                    note="一点点关于我：在做什么、喜欢什么、正在打磨什么。"
                />

                <div className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,.9fr)]">
                    <div className="rounded-[26px] border-2 border-zinc-900/[0.85] bg-white/85 px-6 py-5 shadow-[7px_7px_0_0_#e9d5ff] sm:px-8 sm:py-7">
                        {facts.map((item) => (
                            <div
                                key={item.label}
                                className="flex items-baseline gap-4 border-b border-dashed border-black/[0.12] py-4 last:border-b-0 sm:gap-6"
                            >
                                <span className="w-14 shrink-0 text-[10px] tracking-[0.2em] text-violet-500">
                                    {item.label}
                                </span>
                                <span className="text-sm leading-6 text-zinc-700 sm:text-[15px]">
                                    {item.value}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="relative overflow-hidden rounded-[26px] border-2 border-zinc-900/[0.85] bg-[linear-gradient(150deg,#fdf5ff,#f3f0ff_55%,#fdf2f8)] px-6 py-7 shadow-[7px_7px_0_0_#e9d5ff] sm:px-8">
                        <Halftone className="absolute -bottom-10 -right-10 h-44 w-44 rounded-full opacity-70" />

                        <div className="relative">
                            <div className="flex items-center gap-2 text-[10px] tracking-[0.28em] text-violet-500">
                                <StarIcon className="h-3 w-3" />
                                じこしょうかい
                            </div>

                            <p className="mt-5 text-sm leading-7 text-zinc-600">
                                白天写界面，晚上继续调那些没人会注意的细节 ——
                                圆角、间距、hover 的那 200ms。
                            </p>

                            <p className="mt-3 text-sm leading-7 text-zinc-500">
                                喜欢二次元、干净的界面和克制的动效。
                                如果一张页面能让人多看两秒，那这两秒就是值得的。
                            </p>

                            <div className="mt-7 flex items-center gap-2 border-t border-dashed border-black/[0.12] pt-4 text-[11px] text-zinc-500">
                                <StarIcon className="h-3 w-3 text-pink-300" />
                                <span>Lycoris / リコリス</span>
                            </div>
                        </div>
                    </div>
                </div>
            </Band>

            {/* ================= すきなもの ================= */}
            <Band
                id="likes"
                className="about-reveal z-10 border-b-2 border-zinc-900/[0.85] bg-[linear-gradient(115deg,#f6f0ff_0%,#fdeaf6_45%,#eef6ff_100%)]"
            >
                <SectionHead
                    kana="すきなもの"
                    title="喜欢的东西"
                    note="凑近看，都是一些很小、很具体的东西。"
                />

                <div className="mt-10 flex flex-wrap gap-3 sm:gap-4">
                    {interests.map((item, index) => (
                        <span
                            key={item.text}
                            className="inline-flex items-center gap-2 rounded-full border-2 border-zinc-900/[0.85] bg-white/85 px-4 py-3 text-sm text-zinc-700 shadow-[4px_4px_0_0_#e9d5ff] backdrop-blur transition duration-300 hover:-translate-y-1.5 hover:shadow-[6px_7px_0_0_#ddd6fe] sm:text-[15px]"
                            style={{
                                transform: `rotate(${index % 2 === 0 ? -1.3 : 1.3}deg)`,
                            }}
                        >
                            <span className="text-base leading-none">
                                {item.emoji}
                            </span>
                            {item.text}
                        </span>
                    ))}
                </div>
            </Band>

            {/* ================= ギャラリー ================= */}
            <Band
                id="gallery"
                className="about-reveal z-10 border-b-2 border-zinc-900/[0.85] bg-white/45 backdrop-blur-xl"
            >
                <SectionHead kana="ギャラリー" title="图片墙" />

                <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4 lg:gap-6">
                    {GALLERY.map((item) => (
                        <div key={item.id} className={`group ${item.className}`}>
                            <ImageSlot
                                src={item.src}
                                alt={item.alt}
                                sizes={item.sizes}
                                className="h-full"
                            />
                        </div>
                    ))}
                </div>
            </Band>

            {/* ================= つながる ================= */}
            <Band
                id="contact"
                className="about-reveal z-10 bg-[linear-gradient(160deg,#251a3f_0%,#3a2160_45%,#1f1a3d_100%)]"
            >
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -left-20 -top-24 h-96 w-96 rounded-full bg-violet-500/25 blur-[120px]" />
                    <div className="absolute -bottom-32 right-0 h-[26rem] w-[26rem] rounded-full bg-pink-500/15 blur-[130px]" />
                    <Halftone className="absolute inset-0 opacity-[0.18]" />
                </div>

                <div className="relative">
                    <SectionHead
                        kana="つながる"
                        title="找我聊天"
                        tone="dark"
                        aside={
                            <button
                                type="button"
                                onClick={handleShare}
                                className="group inline-flex h-11 items-center gap-2 rounded-full border-2 border-white/80 bg-white px-5 text-xs font-medium text-zinc-900 shadow-[4px_4px_0_0_rgba(255,255,255,.25)] transition hover:-translate-y-0.5"
                            >
                                <ShareIcon />
                                分享这个主页
                            </button>
                        }
                    />

                    <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {contacts.map((item) => (
                            <a
                                key={item.label}
                                href={item.href}
                                className="group flex min-w-0 items-center justify-between gap-3 rounded-[22px] border-2 border-zinc-900/[0.85] bg-white px-5 py-4 shadow-[5px_5px_0_0_rgba(233,213,255,.35)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[7px_8px_0_0_rgba(221,214,254,.55)]"
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    <span className="text-lg leading-none">
                                        {item.emoji}
                                    </span>
                                    <div className="min-w-0">
                                        <div className="text-[9px] uppercase tracking-[0.18em] text-violet-500">
                                            {item.label}
                                        </div>
                                        <div className="mt-1.5 truncate text-sm font-semibold text-zinc-800">
                                            {item.value}
                                        </div>
                                    </div>
                                </div>

                                <span className="shrink-0 text-zinc-400 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-violet-500">
                                    <ArrowUpRightIcon />
                                </span>
                            </a>
                        ))}
                    </div>

                    <div className="mt-14 flex flex-col gap-3 border-t-2 border-dashed border-white/15 pt-6 text-[11px] text-white/45 sm:flex-row sm:items-center sm:justify-between">
                        <span className="flex items-center gap-2">
                            <StarIcon className="h-3 w-3 text-violet-300" />
                            Lycoris / リコリス / Personal page
                        </span>
                        <span>小さなことを、丁寧に。</span>
                    </div>
                </div>
            </Band>
        </div>
    )
}
