'use client'

import Image from 'next/image'
import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const skills = ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'GSAP']

const profileNotes = [
    {
        index: '01',
        label: 'FOCUS',
        title: 'Frontend / UI / Motion',
        copy: '专注前端开发、页面细节与交互动效。',
    },
    {
        index: '02',
        label: 'LIKE',
        title: 'Anime / Design / Violet',
        copy: '喜欢二次元、界面美学，以及《紫罗兰永恒花园》。',
    },
    {
        index: '03',
        label: 'BUILDING',
        title: 'BitLeap',
        copy: '持续打磨一个纯粹的「前端 × 日常」工具实验室。',
    },
]

const contacts = [
    {
        label: 'Email',
        value: '1756204616@qq.com',
        href: 'mailto:1756204616@qq.com',
    },
    {
        label: 'WeChat',
        value: 'fxy98942698338',
        href: '#',
    },
    {
        label: 'QQ',
        value: '1756204616',
        href: '#',
    },
    {
        label: 'Phone',
        value: '15085948691',
        href: 'tel:15085948691',
    },
]

const sakuraPetals = Array.from({ length: 9 }, (_, i) => ({
    left: 52 + ((i * 9 + (i % 3) * 5) % 42),
    size: 8 + (i % 4) * 2,
    delay: i * 1.45,
    duration: 12 + (i % 5) * 2.2,
}))

function ArrowUpRightIcon() {
    return (
        <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            aria-hidden="true"
        >
            <path d="M7 17 17 7" />
            <path d="M7 7h10v10" />
        </svg>
    )
}

function SparkIcon() {
    return (
        <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
        >
            <path d="M12 3l1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z" />
            <path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14Z" />
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
            strokeWidth={1.6}
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

export default function AboutPage() {
    const rootRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger)

        const reduceMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ).matches

        if (reduceMotion || !rootRef.current) return

        const ctx = gsap.context(() => {
            const intro = gsap.timeline({
                defaults: {
                    ease: 'power4.out',
                },
            })

            intro
                .from('.about-kicker', {
                    y: 14,
                    opacity: 0,
                    duration: 0.42,
                })
                .from(
                    '.about-name-line',
                    {
                        y: 56,
                        opacity: 0,
                        rotate: 1.1,
                        duration: 0.72,
                        stagger: 0.08,
                    },
                    '-=0.18',
                )
                .from(
                    '.about-role',
                    {
                        y: 24,
                        opacity: 0,
                        duration: 0.5,
                    },
                    '-=0.38',
                )
                .from(
                    '.about-copy',
                    {
                        y: 18,
                        opacity: 0,
                        duration: 0.48,
                        stagger: 0.06,
                    },
                    '-=0.34',
                )
                .from(
                    '.about-skill',
                    {
                        y: 14,
                        opacity: 0,
                        scale: 0.96,
                        duration: 0.34,
                        stagger: 0.045,
                    },
                    '-=0.26',
                )
                .from(
                    '.about-portrait',
                    {
                        x: 72,
                        opacity: 0,
                        scale: 0.985,
                        duration: 0.95,
                    },
                    '-=0.78',
                )
                .from(
                    '.about-avatar',
                    {
                        y: 16,
                        opacity: 0,
                        scale: 0.94,
                        duration: 0.45,
                    },
                    '-=0.6',
                )

            gsap.utils
                .toArray<HTMLElement>('.about-reveal')
                .forEach((element) => {
                    const tween = gsap.fromTo(
                        element,
                        {
                            y: 30,
                            opacity: 0,
                        },
                        {
                            y: 0,
                            opacity: 1,
                            duration: 0.68,
                            ease: 'power3.out',
                            paused: true,
                        },
                    )

                    ScrollTrigger.create({
                        trigger: element,
                        start: 'top 92%',
                        animation: tween,
                        toggleActions: 'play none none reverse',
                    })
                })

            gsap.to('.about-orb-a', {
                x: 34,
                y: 22,
                duration: 16,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
            })

            gsap.to('.about-orb-b', {
                x: -26,
                y: -30,
                duration: 20,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
            })

            gsap.to('.about-portrait', {
                y: -8,
                duration: 5.5,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
            })
        }, rootRef)

        requestAnimationFrame(() => ScrollTrigger.refresh())

        return () => ctx.revert()
    }, [])

    const handleShare = async () => {
        const url = window.location.href
        const text = '来看看 Lycoris 的 BitLeap —— 小工具，大跨越 ✨'

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'BitLeap',
                    text,
                    url,
                })
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
            className="font-['myFont',sans-serif] relative min-h-[calc(100vh-4rem)] overflow-hidden bg-[#f7f7f5] text-zinc-950"
        >
            <div className="about-orb-a pointer-events-none absolute left-[8%] top-[12%] h-[280px] w-[280px] rounded-full bg-violet-100/55 blur-[110px]" />
            <div className="about-orb-b pointer-events-none absolute bottom-[8%] right-[6%] h-[340px] w-[340px] rounded-full bg-sky-100/40 blur-[120px]" />

            <div className="mx-auto w-full max-w-[1480px] px-4 pb-16 pt-7 sm:px-5 lg:px-6 xl:px-8">
                {/* HERO */}
                <section className="relative overflow-hidden rounded-[34px] border border-black/[0.06] bg-white shadow-[0_36px_100px_-76px_rgba(15,23,42,.28)]">
                    <div className="grid min-h-[620px] lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,.92fr)]">
                        {/* 文案区 */}
                        <div className="relative z-10 flex flex-col justify-between px-6 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10">
                            <div>
                                <div className="about-kicker flex flex-wrap items-center gap-3">
                                    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1.5 text-[10px] font-medium text-emerald-700">
                                        <span className="relative flex h-2 w-2">
                                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                                        </span>
                                        Available for work
                                    </span>

                                    <span className="text-[9px] uppercase tracking-[0.24em] text-zinc-300">
                                        About / Lycoris
                                    </span>
                                </div>

                                <div className="about-avatar relative mt-8 h-24 w-24 overflow-hidden rounded-full border border-black/[0.07] bg-white shadow-[0_22px_48px_-30px_rgba(0,0,0,.32)] sm:h-28 sm:w-28">
                                    <Image
                                        src="/image/head2.jpg"
                                        alt="Lycoris"
                                        fill
                                        sizes="112px"
                                        className="object-cover"
                                        priority
                                    />
                                </div>

                                <div className="mt-7">
                                    <div className="overflow-hidden pb-1">
                                        <div className="about-name-line text-[clamp(4.4rem,10vw,9.4rem)] font-black leading-[0.82] tracking-[-0.075em] text-zinc-950">
                                            Lycoris
                                        </div>
                                    </div>

                                    <div className="mt-2 overflow-hidden pb-1">
                                        <div className="about-name-line text-[clamp(2rem,5vw,4.3rem)] font-medium leading-[0.95] tracking-[-0.055em] text-violet-500">
                                            Frontend Developer
                                        </div>
                                    </div>

                                    <div className="mt-1 overflow-hidden pb-2">
                                        <div className="about-name-line text-[clamp(1.8rem,4.6vw,4rem)] font-medium leading-[0.98] tracking-[-0.05em] text-zinc-950">
                                            & CSS Enthusiast
                                        </div>
                                    </div>
                                </div>

                                <div className="about-role mt-6 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-zinc-400">
                                    <SparkIcon />
                                    Craft beautiful interfaces
                                </div>

                                <p className="about-copy mt-4 max-w-[52ch] text-sm leading-7 text-zinc-500 sm:text-[15px]">
                                    Craft beautiful interfaces with code & imagination.
                                </p>

                                <p className="about-copy mt-2 max-w-[54ch] text-sm leading-7 text-zinc-500 sm:text-[15px]">
                                    BitLeap 工具站开发者 —— 一个纯粹的「前端 × 日常」工具实验室。
                                </p>
                            </div>

                            <div className="mt-9">
                                <div className="flex flex-wrap gap-2">
                                    {skills.map((skill) => (
                                        <span
                                            key={skill}
                                            className="about-skill rounded-full border border-black/[0.06] bg-[#fafafa] px-3 py-1.5 text-[11px] font-medium text-zinc-600 sm:px-4 sm:text-xs"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>

                                <div className="mt-7 flex items-center gap-3 border-t border-black/[0.06] pt-5 text-[10px] uppercase tracking-[0.18em] text-zinc-300">
                                    <span>Personal lab</span>
                                    <span className="h-1 w-1 rounded-full bg-violet-300" />
                                    <span>BitLeap</span>
                                </div>
                            </div>
                        </div>

                        {/* 人物主视觉 */}
                        <div className="relative min-h-[430px] overflow-hidden border-t border-black/[0.05] bg-[linear-gradient(180deg,#f7f3ff_0%,#fdfcff_48%,#f7fbff_100%)] lg:min-h-full lg:border-l lg:border-t-0">
                            <div className="pointer-events-none absolute inset-0 opacity-80">
                                <div className="absolute left-[12%] top-[14%] h-44 w-44 rounded-full border border-violet-200/35" />
                                <div className="absolute right-[8%] top-[9%] h-28 w-28 rounded-full border border-sky-200/40" />
                                <div className="absolute bottom-[10%] left-[16%] h-px w-[42%] bg-gradient-to-r from-transparent via-violet-300/50 to-transparent" />
                            </div>

                            <div className="absolute left-6 top-6 z-10 text-[9px] uppercase tracking-[0.24em] text-zinc-400 lg:left-8 lg:top-8">
                                Violet mood / 2026
                            </div>

                            <div className="about-portrait absolute inset-x-0 bottom-0 top-9">
                                <Image
                                    src="/image/kp5.png"
                                    alt="Lycoris Character"
                                    fill
                                    sizes="(max-width: 1024px) 100vw, 48vw"
                                    className="object-contain object-bottom-right"
                                    priority
                                />
                            </div>

                            <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-24 bg-gradient-to-r from-white to-transparent lg:block" />

                            <div className="pointer-events-none absolute inset-0 hidden overflow-hidden md:block">
                                {sakuraPetals.map((petal, index) => (
                                    <span
                                        key={index}
                                        className="absolute opacity-45"
                                        style={{
                                            left: `${petal.left}%`,
                                            top: '-24px',
                                            width: `${petal.size}px`,
                                            height: `${petal.size * 0.72}px`,
                                            background:
                                                'linear-gradient(135deg, #fce7f3, #fbcfe8)',
                                            borderRadius: '50% 50% 50% 0',
                                            transform: 'rotate(-45deg)',
                                            animation: `sakura-fall ${petal.duration}s linear infinite`,
                                            animationDelay: `${petal.delay}s`,
                                            boxShadow:
                                                '0 0 7px rgba(244, 114, 182, .18)',
                                        }}
                                    />
                                ))}
                            </div>

                            <div className="absolute bottom-7 right-7 z-10 hidden text-right sm:block">
                                <div className="text-[9px] uppercase tracking-[0.22em] text-zinc-400">
                                    Frontend / Motion / UI
                                </div>
                                <div className="mt-2 text-xs text-zinc-500">
                                    Build small things carefully.
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ABOUT NOTES */}
                <section className="about-reveal mt-16">
                    <div className="flex flex-col gap-4 border-b border-black/[0.07] pb-5 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <div className="text-[9px] uppercase tracking-[0.24em] text-zinc-300">
                                A little about me
                            </div>
                            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-zinc-950 sm:text-4xl">
                                Notes, not cards.
                            </h2>
                        </div>

                        <p className="max-w-[46ch] text-xs leading-6 text-zinc-400 sm:text-right">
                            少一点组件感，多一点像个人杂志一样的阅读节奏。
                        </p>
                    </div>

                    <div className="divide-y divide-black/[0.07]">
                        {profileNotes.map((item) => (
                            <div
                                key={item.index}
                                className="group grid gap-4 py-7 sm:grid-cols-[80px_160px_minmax(0,1fr)] sm:items-start sm:gap-6"
                            >
                                <div className="font-mono text-[11px] text-zinc-300">
                                    {item.index}
                                </div>

                                <div>
                                    <div className="text-[9px] uppercase tracking-[0.2em] text-violet-500">
                                        {item.label}
                                    </div>
                                    <div className="mt-2 text-sm font-semibold text-zinc-900">
                                        {item.title}
                                    </div>
                                </div>

                                <p className="max-w-2xl text-sm leading-7 text-zinc-500">
                                    {item.copy}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* CONTACT */}
                <section className="about-reveal mt-16 rounded-[30px] border border-black/[0.06] bg-white px-5 py-6 shadow-[0_28px_80px_-66px_rgba(15,23,42,.24)] sm:px-7 sm:py-7">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <div className="text-[9px] uppercase tracking-[0.24em] text-zinc-300">
                                Get in touch
                            </div>
                            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-zinc-950">
                                Say hello.
                            </h2>
                        </div>

                        <button
                            type="button"
                            onClick={handleShare}
                            className="group inline-flex h-10 items-center gap-2 self-start rounded-full border border-black/[0.07] bg-[#fafafa] px-4 text-xs font-medium text-zinc-600 transition hover:-translate-y-0.5 hover:text-zinc-950 sm:self-auto"
                        >
                            <ShareIcon />
                            分享 BitLeap
                        </button>
                    </div>

                    <div className="mt-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        {contacts.map((item) => (
                            <a
                                key={item.label}
                                href={item.href}
                                className="group flex min-w-0 items-center justify-between gap-3 rounded-[18px] border border-black/[0.055] bg-[#fafafa] px-4 py-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_28px_-24px_rgba(0,0,0,.24)]"
                            >
                                <div className="min-w-0">
                                    <div className="text-[9px] uppercase tracking-[0.18em] text-zinc-400">
                                        {item.label}
                                    </div>
                                    <div className="mt-1 truncate text-sm font-semibold text-zinc-800">
                                        {item.value}
                                    </div>
                                </div>

                                <span className="shrink-0 text-zinc-300 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-zinc-700">
                                    <ArrowUpRightIcon />
                                </span>
                            </a>
                        ))}
                    </div>
                </section>

                <div className="about-reveal mt-7 flex flex-col gap-3 border-t border-black/[0.06] pt-5 text-[10px] text-zinc-300 sm:flex-row sm:items-center sm:justify-between">
                    <span>BitLeap / Lycoris / Personal page</span>
                    <span>Small tools · careful details · quiet iteration</span>
                </div>
            </div>
        </div>
    )
}
