'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

type Letter = {
    to: string
    message: string
    signature: string
}

const STORAGE_KEY = 'bitleap-paper-plane-v1'

function PlaneIcon({ className = '' }: { className?: string }) {
    return (
        <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
            <path
                d="M6 29.5 57 8 39 56l-9.5-18.5L6 29.5Z"
                fill="currentColor"
            />
            <path
                d="M29.5 37.5 57 8 22.5 31.8"
                stroke="white"
                strokeOpacity=".92"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
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

function SendIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4" aria-hidden="true">
            <path d="M4 5.5 20 12 4 18.5l3-6.5-3-6.5Z" />
            <path d="M7 12h8" />
        </svg>
    )
}

function RotateIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" aria-hidden="true">
            <path d="M4 4v6h6" />
            <path d="M20 20v-6h-6" />
            <path d="M5.6 15A7 7 0 0 0 18 17.5" />
            <path d="M18.4 9A7 7 0 0 0 6 6.5" />
        </svg>
    )
}

export default function PaperPlanePage() {
    const rootRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<HTMLDivElement>(null)
    const planeRef = useRef<HTMLDivElement>(null)
    const pathRef = useRef<SVGPathElement>(null)
    const letterRef = useRef<HTMLDivElement>(null)

    const [letter, setLetter] = useState<Letter>({
        to: '那个人',
        message: '有些话没有机会说出口，那就让它飞远一点吧。',
        signature: 'Lycoris',
    })
    const [sent, setSent] = useState(false)
    const [hydrated, setHydrated] = useState(false)

    useEffect(() => {
        try {
            const saved = window.localStorage.getItem(STORAGE_KEY)
            if (saved) {
                const parsed = JSON.parse(saved) as Partial<Letter>
                setLetter((current) => ({ ...current, ...parsed }))
            }
        } catch {
            // keep defaults
        } finally {
            setHydrated(true)
        }
    }, [])

    useEffect(() => {
        if (!hydrated) return
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(letter))
        } catch {}
    }, [letter, hydrated])

    const messageLength = useMemo(() => letter.message.trim().length, [letter.message])

    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger, MotionPathPlugin)

        if (!rootRef.current) return

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

        const ctx = gsap.context(() => {
            if (reduceMotion) return

            gsap.timeline({ defaults: { ease: 'power4.out' } })
                .from('.plane-kicker', { y: 14, opacity: 0, duration: 0.4 })
                .from('.plane-title-line', { y: 42, opacity: 0, rotate: 0.6, duration: 0.68, stagger: 0.08 }, '-=0.18')
                .from('.plane-copy', { y: 18, opacity: 0, duration: 0.42, stagger: 0.06 }, '-=0.36')

            gsap.utils.toArray<HTMLElement>('.plane-reveal').forEach((el) => {
                gsap.fromTo(
                    el,
                    { y: 32, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        duration: 0.66,
                        ease: 'power3.out',
                        scrollTrigger: {
                            trigger: el,
                            start: 'top 92%',
                            toggleActions: 'play none none reverse',
                        },
                    },
                )
            })
        }, rootRef)

        return () => ctx.revert()
    }, [])

    const playSendAnimation = () => {
        const scene = sceneRef.current
        const plane = planeRef.current
        const path = pathRef.current
        const letterEl = letterRef.current

        if (!scene || !plane || !path || !letterEl) return

        gsap.killTweensOf([plane, letterEl])

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

        if (reduceMotion) {
            setSent(true)
            return
        }

        setSent(false)

        const tl = gsap.timeline()

        tl.set(plane, {
            opacity: 0,
            scale: 0.7,
            xPercent: -50,
            yPercent: -50,
            rotate: -8,
        })
            .to(letterEl, {
                scaleY: 0.12,
                scaleX: 0.9,
                rotateX: 68,
                transformOrigin: '50% 100%',
                duration: 0.38,
                ease: 'power3.inOut',
            })
            .to(letterEl, {
                opacity: 0,
                y: 18,
                duration: 0.18,
                ease: 'power2.in',
            }, '-=0.08')
            .set(plane, {
                opacity: 1,
                scale: 0.8,
            })
            .to(plane, {
                scale: 1,
                duration: 0.28,
                ease: 'back.out(1.8)',
            })
            .to(plane, {
                duration: 3.2,
                ease: 'power1.inOut',
                motionPath: {
                    path,
                    align: path,
                    alignOrigin: [0.5, 0.5],
                    autoRotate: 18,
                },
            })
            .to(plane, {
                opacity: 0,
                scale: 0.45,
                filter: 'blur(3px)',
                duration: 0.5,
                ease: 'power2.in',
            }, '-=0.5')
            .call(() => setSent(true))
            .set(letterEl, {
                opacity: 1,
                scaleX: 1,
                scaleY: 1,
                rotateX: 0,
                y: 0,
            })
    }

    const reset = () => {
        setSent(false)
        setLetter({
            to: '那个人',
            message: '有些话没有机会说出口，那就让它飞远一点吧。',
            signature: 'Lycoris',
        })
        try {
            window.localStorage.removeItem(STORAGE_KEY)
        } catch {}
    }

    return (
        <div ref={rootRef} className="relative min-h-screen overflow-hidden bg-[#fbfafc] text-zinc-950">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(221,214,254,.42),transparent_26%),radial-gradient(circle_at_88%_16%,rgba(224,242,254,.46),transparent_26%),radial-gradient(circle_at_50%_62%,rgba(253,242,248,.60),transparent_32%),linear-gradient(180deg,#fbfafc_0%,#faf9fd_44%,#f8f8fb_100%)]" />
            <div className="pointer-events-none absolute -left-24 top-[20%] h-[380px] w-[380px] rounded-full bg-violet-100/30 blur-[145px]" />
            <div className="pointer-events-none absolute -right-24 top-[45%] h-[420px] w-[420px] rounded-full bg-sky-100/30 blur-[155px]" />

            <main className="relative mx-auto w-full max-w-[1480px] px-4 pb-20 pt-7 sm:px-5 lg:px-6 xl:px-8">
                <section className="relative overflow-hidden rounded-[34px] border border-white/80 bg-white/88 px-6 py-9 shadow-[0_34px_90px_-68px_rgba(76,29,149,.22)] backdrop-blur-[18px] sm:px-8 sm:py-11 lg:px-10 lg:py-12">
                    <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full border border-violet-100/80 bg-violet-50/25" />
                    <div className="pointer-events-none absolute right-24 top-20 h-36 w-36 rounded-full border border-sky-100/70 bg-sky-50/20" />
                    <div className="pointer-events-none absolute -bottom-24 left-[38%] h-48 w-48 rounded-full bg-rose-50/60 blur-[55px]" />

                    <div className="plane-kicker inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50/70 px-3 py-1.5 text-[10px] font-medium text-violet-600">
                        <SparkIcon />
                        心迹 / Paper Plane
                    </div>

                    <div className="mt-8 max-w-[1020px]">
                        <div className="overflow-visible pb-[0.12em] pt-[0.03em]">
                            <h1 className="plane-title-line text-[clamp(4.1rem,9.5vw,8.5rem)] font-black leading-[0.95] tracking-[-0.06em]">
                                纸飞机
                            </h1>
                        </div>
                        <div className="mt-2 overflow-visible pb-[0.08em]">
                            <p className="plane-title-line text-[clamp(1.6rem,4vw,3.6rem)] font-medium leading-[1.15] tracking-[-0.045em] text-violet-500">
                                没能送到的话，
                            </p>
                        </div>
                        <div className="overflow-visible pb-[0.08em]">
                            <p className="plane-title-line text-[clamp(1.6rem,4vw,3.6rem)] font-medium leading-[1.15] tracking-[-0.045em]">
                                就让它飞远一点。
                            </p>
                        </div>
                    </div>

                    <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="plane-copy max-w-[58ch] text-sm leading-7 text-zinc-500 sm:text-[15px]">
                                写下一句没有说出口的话。点击发送后，它会折成一架纸飞机，沿着风的轨迹慢慢飞远。
                            </p>
                            <p className="plane-copy mt-2 text-xs leading-6 text-zinc-400">
                                内容只保存在当前浏览器，不上传服务器。
                            </p>
                        </div>

                        <div className="plane-copy flex items-center gap-2">
                            <button
                                type="button"
                                onClick={reset}
                                className="inline-flex h-11 items-center gap-2 rounded-full border border-black/[0.06] bg-white px-4 text-xs font-medium text-zinc-500 transition hover:text-zinc-900"
                            >
                                <RotateIcon />
                                重置
                            </button>

                            <button
                                type="button"
                                onClick={() => sceneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                                className="inline-flex h-11 items-center gap-2 rounded-full bg-zinc-950 px-5 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-violet-600"
                            >
                                写一句话
                                <SendIcon />
                            </button>
                        </div>
                    </div>
                </section>

                <section className="plane-reveal mt-8 grid gap-5 xl:grid-cols-[minmax(0,.78fr)_minmax(0,1.22fr)]">
                    <div className="rounded-[30px] border border-black/[0.06] bg-white/88 p-5 shadow-[0_24px_70px_-58px_rgba(76,29,149,.22)] backdrop-blur-md sm:p-6">
                        <div className="text-[9px] uppercase tracking-[0.24em] text-zinc-300">Write something</div>
                        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.045em]">写下它</h2>

                        <label className="mt-6 block">
                            <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-zinc-400">To</span>
                            <input
                                value={letter.to}
                                onChange={(e) => setLetter((current) => ({ ...current, to: e.target.value }))}
                                placeholder="写给谁？"
                                className="h-11 w-full rounded-[14px] border border-black/[0.06] bg-[#fafafa] px-3 text-sm text-zinc-800 outline-none transition focus:border-violet-300 focus:bg-white"
                            />
                        </label>

                        <label className="mt-4 block">
                            <span className="mb-1.5 flex items-center justify-between text-[9px] uppercase tracking-[0.18em] text-zinc-400">
                                <span>Message</span>
                                <span className="font-mono tracking-normal text-zinc-300">{messageLength}/180</span>
                            </span>
                            <textarea
                                value={letter.message}
                                onChange={(e) => setLetter((current) => ({ ...current, message: e.target.value.slice(0, 180) }))}
                                placeholder="把那句话留在这里。"
                                rows={7}
                                className="w-full resize-none rounded-[16px] border border-black/[0.06] bg-[#fafafa] px-3 py-3 text-sm leading-7 text-zinc-700 outline-none transition placeholder:text-zinc-300 focus:border-violet-300 focus:bg-white"
                            />
                        </label>

                        <label className="mt-4 block">
                            <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-zinc-400">From</span>
                            <input
                                value={letter.signature}
                                onChange={(e) => setLetter((current) => ({ ...current, signature: e.target.value }))}
                                placeholder="留下名字，也可以不写"
                                className="h-11 w-full rounded-[14px] border border-black/[0.06] bg-[#fafafa] px-3 text-sm text-zinc-800 outline-none transition focus:border-violet-300 focus:bg-white"
                            />
                        </label>

                        <button
                            type="button"
                            disabled={!letter.message.trim()}
                            onClick={playSendAnimation}
                            className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-zinc-950 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-35"
                        >
                            <SendIcon />
                            让它飞走
                        </button>
                    </div>

                    <div
                        ref={sceneRef}
                        className="relative min-h-[600px] overflow-hidden rounded-[30px] border border-white/80 bg-[radial-gradient(circle_at_38%_24%,rgba(255,255,255,.92),transparent_28%),radial-gradient(circle_at_76%_68%,rgba(224,242,254,.62),transparent_34%),linear-gradient(145deg,#faf7ff,#f9fbff_48%,#fff9fc)] shadow-[0_28px_80px_-60px_rgba(76,29,149,.22)] sm:min-h-[680px]"
                    >
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/55 to-transparent" />
                        <div className="pointer-events-none absolute left-[10%] top-[14%] h-24 w-24 rounded-full border border-violet-100/80" />
                        <div className="pointer-events-none absolute right-[10%] top-[20%] h-36 w-36 rounded-full border border-sky-100/70" />

                        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1000 700" preserveAspectRatio="none" aria-hidden="true">
                            <defs>
                                <linearGradient id="flightPathGradient" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#c4b5fd" stopOpacity=".25" />
                                    <stop offset="50%" stopColor="#a78bfa" stopOpacity=".42" />
                                    <stop offset="100%" stopColor="#bae6fd" stopOpacity=".08" />
                                </linearGradient>
                            </defs>
                            <path
                                ref={pathRef}
                                d="M160 535 C250 500 265 385 360 385 C470 385 490 520 600 440 C690 375 650 220 760 205 C830 195 880 235 930 140"
                                fill="none"
                                stroke="url(#flightPathGradient)"
                                strokeWidth="2"
                                strokeDasharray="6 10"
                                vectorEffect="non-scaling-stroke"
                                strokeLinecap="round"
                            />
                        </svg>

                        <div
                            ref={letterRef}
                            className="absolute bottom-[9%] left-[7%] z-10 w-[min(82%,420px)] origin-bottom rounded-[24px] border border-black/[0.06] bg-white/92 p-5 shadow-[0_28px_70px_-50px_rgba(32,23,55,.28)] backdrop-blur-md sm:p-6"
                            style={{ transformStyle: 'preserve-3d' }}
                        >
                            <div className="text-[9px] uppercase tracking-[0.22em] text-violet-400">
                                To / {letter.to || '未命名的人'}
                            </div>

                            <p className="mt-5 whitespace-pre-wrap text-[15px] leading-8 text-zinc-700">
                                {letter.message || '把那句话留在这里。'}
                            </p>

                            <div className="mt-7 flex items-center justify-between border-t border-black/[0.06] pt-4">
                                <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-300">
                                    unsent letter
                                </span>
                                <span className="text-xs text-zinc-500">
                                    {letter.signature || '匿名'}
                                </span>
                            </div>
                        </div>

                        <div
                            ref={planeRef}
                            className="absolute left-0 top-0 z-20 h-16 w-16 text-violet-500 opacity-0 drop-shadow-[0_18px_24px_rgba(124,58,237,.18)] sm:h-[72px] sm:w-[72px]"
                        >
                            <PlaneIcon className="h-full w-full" />
                        </div>

                        <div className="pointer-events-none absolute right-[7%] top-[9%] max-w-[230px] text-right">
                            <div className="text-[9px] uppercase tracking-[0.24em] text-zinc-300">Wind direction</div>
                            <p className="mt-2 text-xs leading-6 text-zinc-400">
                                有些话不需要抵达，飞走本身就是答案。
                            </p>
                        </div>

                        {sent && (
                            <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/30 backdrop-blur-[3px]">
                                <div className="max-w-[360px] px-6 text-center">
                                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-violet-100 bg-white/80 text-violet-500 shadow-sm">
                                        <PlaneIcon className="h-7 w-7" />
                                    </div>
                                    <div className="mt-5 text-[9px] uppercase tracking-[0.26em] text-violet-400">Sent away</div>
                                    <h3 className="mt-3 text-2xl font-semibold tracking-[-0.045em] text-zinc-950">
                                        它已经飞远了。
                                    </h3>
                                    <p className="mt-3 text-sm leading-7 text-zinc-500">
                                        没关系，不是所有话都一定要被听见。
                                    </p>

                                    <button
                                        type="button"
                                        onClick={() => setSent(false)}
                                        className="mt-5 inline-flex h-10 items-center justify-center rounded-full border border-black/[0.06] bg-white px-4 text-xs font-medium text-zinc-600 transition hover:text-violet-600"
                                    >
                                        再写一封
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                <section className="plane-reveal mx-auto mt-16 max-w-[920px] rounded-[28px] border border-white/80 bg-white/72 px-6 py-8 text-center backdrop-blur-md sm:px-10">
                    <div className="text-[9px] uppercase tracking-[0.24em] text-zinc-300">A small ritual</div>
                    <p className="mx-auto mt-4 max-w-[46ch] text-[clamp(1.35rem,3vw,2.4rem)] font-medium leading-[1.35] tracking-[-0.04em] text-zinc-800">
                        有些话写下来，不是为了让谁看见，
                        <span className="text-violet-500">只是为了让自己终于可以放下。</span>
                    </p>
                </section>
            </main>
        </div>
    )
}
