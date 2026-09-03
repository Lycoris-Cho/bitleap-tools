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

const STORAGE_KEY = 'bitleap-paper-plane-v4'

function PlaneIcon({ className = '' }: { className?: string }) {
    return (
        <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
            <path d="M7 29.5 57 8 39.2 55.5 29.8 37.7 7 29.5Z" fill="currentColor" />
            <path d="M29.8 37.7 57 8 22.7 31.9" stroke="white" strokeOpacity=".96" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
            <path d="m29.8 37.7 8.8 3.2" stroke="white" strokeOpacity=".55" strokeWidth="1.4" strokeLinecap="round" />
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
            <path d="M4 4v6h6M20 20v-6h-6" />
            <path d="M5.6 15A7 7 0 0 0 18 17.5M18.4 9A7 7 0 0 0 6 6.5" />
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

export default function PaperPlanePage() {
    const rootRef = useRef<HTMLDivElement>(null)
    const planeRef = useRef<HTMLDivElement>(null)
    const pathRef = useRef<SVGPathElement>(null)
    const letterPreviewRef = useRef<HTMLDivElement>(null)
    const timelineRef = useRef<gsap.core.Timeline | null>(null)

    const [letter, setLetter] = useState<Letter>({
        to: '那个人',
        message: '有些话没有机会说出口，那就让它飞远一点吧。',
        signature: 'Lycoris',
    })
    const [sent, setSent] = useState(false)
    const [sending, setSending] = useState(false)
    const [hydrated, setHydrated] = useState(false)

    const messageLength = useMemo(() => letter.message.trim().length, [letter.message])

    useEffect(() => {
        gsap.registerPlugin(MotionPathPlugin, ScrollTrigger)

        try {
            const saved = window.localStorage.getItem(STORAGE_KEY)
            if (saved) {
                const parsed = JSON.parse(saved) as Partial<Letter>
                setLetter((current) => ({ ...current, ...parsed }))
            }
        } catch {
            // 保持默认内容
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

    useEffect(() => {
        if (!rootRef.current) return

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const ctx = gsap.context(() => {
            if (reduceMotion) return

            gsap.timeline({ defaults: { ease: 'power4.out' } })
                .from('.plane-topbar', { y: -14, opacity: 0, duration: 0.45 })
                .from('.plane-editor', { x: -24, opacity: 0, duration: 0.58 }, '-=0.18')
                .from('.plane-stage', { x: 24, opacity: 0, duration: 0.58 }, '-=0.5')
                .from('.plane-note', { y: 16, opacity: 0, duration: 0.4, stagger: 0.06 }, '-=0.28')
        }, rootRef)

        return () => ctx.revert()
    }, [])

    const resetVisuals = () => {
        timelineRef.current?.kill()
        timelineRef.current = null

        if (planeRef.current) {
            gsap.killTweensOf(planeRef.current)
            gsap.set(planeRef.current, { clearProps: 'all' })
            gsap.set(planeRef.current, {
                opacity: 0,
                x: 0,
                y: 0,
                xPercent: -50,
                yPercent: -50,
                rotate: 0,
                scale: 1,
                force3D: false,
            })
        }

        if (letterPreviewRef.current) {
            gsap.killTweensOf(letterPreviewRef.current)
            gsap.set(letterPreviewRef.current, { clearProps: 'transform,opacity' })
            gsap.set(letterPreviewRef.current, { opacity: 1 })
        }
    }

    const writeAgain = () => {
        resetVisuals()
        setSending(false)
        setSent(false)
    }

    const send = () => {
        const plane = planeRef.current
        const path = pathRef.current
        const letterEl = letterPreviewRef.current

        if (!plane || !path || !letterEl || sending || !letter.message.trim()) return

        resetVisuals()
        setSent(false)
        setSending(true)

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (reduceMotion) {
            setSending(false)
            setSent(true)
            return
        }

        const tl = gsap.timeline({
            onComplete: () => {
                setSending(false)
                setSent(true)
            },
        })

        timelineRef.current = tl

        tl.to(letterEl, {
            rotateX: 64,
            scaleY: 0.2,
            scaleX: 0.94,
            transformOrigin: '50% 100%',
            duration: 0.32,
            ease: 'power3.inOut',
            force3D: false,
        })
            .to(letterEl, {
                opacity: 0,
                y: 12,
                duration: 0.16,
                ease: 'power2.in',
                force3D: false,
            }, '-=0.05')
            .set(plane, {
                opacity: 1,
                scale: 1,
                force3D: false,
            })
            .to(plane, {
                duration: 3.05,
                ease: 'power1.inOut',
                force3D: false,
                motionPath: {
                    path,
                    align: path,
                    alignOrigin: [0.5, 0.5],
                    autoRotate: 10,
                },
            })
            .to(plane, {
                opacity: 0,
                duration: 0.32,
                ease: 'power2.in',
                force3D: false,
            }, '-=0.22')
            .set(letterEl, {
                opacity: 1,
                y: 0,
                rotateX: 0,
                scaleX: 1,
                scaleY: 1,
                force3D: false,
            })
    }

    const resetAll = () => {
        writeAgain()
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
        <div ref={rootRef} className="relative min-h-screen overflow-hidden bg-[#f8f7fb] text-zinc-950">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_12%,rgba(237,233,254,.68),transparent_24%),radial-gradient(circle_at_90%_12%,rgba(224,242,254,.68),transparent_26%),radial-gradient(circle_at_56%_92%,rgba(252,231,243,.52),transparent_28%),linear-gradient(180deg,#faf9fd_0%,#f8f8fb_52%,#faf9fb_100%)]" />
            <div className="pointer-events-none absolute -left-28 top-[28%] h-[420px] w-[420px] rounded-full bg-violet-100/30 blur-[155px]" />
            <div className="pointer-events-none absolute -right-28 top-[38%] h-[460px] w-[460px] rounded-full bg-sky-100/28 blur-[165px]" />

            <main className="relative mx-auto w-full max-w-[1540px] px-4 py-5 sm:px-5 lg:px-6 xl:px-8">
                <div className="plane-topbar mb-4 flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-violet-100 bg-white/78 text-violet-500 shadow-sm">
                            <PlaneIcon className="h-4.5 w-4.5" />
                        </span>

                        <div>
                            <div className="flex items-baseline gap-2.5">
                                <h1 className="text-xl font-semibold tracking-[-0.045em] text-zinc-950 sm:text-2xl">纸飞机</h1>
                                <span className="text-[10px] uppercase tracking-[0.2em] text-violet-400">Paper Plane</span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-zinc-400">没能送到的话，就让它飞远一点。</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="hidden text-[10px] text-zinc-400 sm:block">仅保存在当前浏览器</span>
                        <button
                            type="button"
                            onClick={resetAll}
                            className="inline-flex h-9 items-center gap-2 rounded-full border border-black/[0.06] bg-white/75 px-3 text-[10px] text-zinc-500 shadow-sm transition hover:border-violet-200 hover:text-violet-600"
                        >
                            <RotateIcon />
                            重置
                        </button>
                    </div>
                </div>

                <section className="overflow-hidden rounded-[30px] border border-white/85 bg-white/70 shadow-[0_34px_100px_-72px_rgba(72,52,112,.34)] backdrop-blur-[22px]">
                    <div className="grid min-h-[calc(100vh-8.2rem)] lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[390px_minmax(0,1fr)]">
                        <aside className="plane-editor relative z-20 border-b border-black/[0.055] bg-white/68 p-5 lg:border-b-0 lg:border-r lg:p-6">
                            <div className="mx-auto max-w-[420px]">
                                <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.22em] text-violet-400">
                                    <SparkIcon />
                                    Write something
                                </div>

                                <h2 className="mt-3 text-[26px] font-semibold leading-tight tracking-[-0.05em] text-zinc-950">
                                    写下那句
                                    <span className="text-violet-500">没说出口的话。</span>
                                </h2>

                                <p className="mt-2 text-xs leading-6 text-zinc-400">
                                    不用解释，也不用真的发给谁。
                                </p>

                                <label className="mt-6 block">
                                    <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-zinc-400">To</span>
                                    <input
                                        value={letter.to}
                                        onChange={(e) => setLetter((current) => ({ ...current, to: e.target.value }))}
                                        placeholder="写给谁？"
                                        className="h-11 w-full rounded-[13px] border border-black/[0.055] bg-[#fafafa]/90 px-3 text-sm text-zinc-800 outline-none transition focus:border-violet-300 focus:bg-white"
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
                                        rows={8}
                                        className="w-full resize-none rounded-[15px] border border-black/[0.055] bg-[#fafafa]/90 px-3 py-3 text-sm leading-7 text-zinc-700 outline-none transition placeholder:text-zinc-300 focus:border-violet-300 focus:bg-white"
                                    />
                                </label>

                                <label className="mt-4 block">
                                    <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-zinc-400">From</span>
                                    <input
                                        value={letter.signature}
                                        onChange={(e) => setLetter((current) => ({ ...current, signature: e.target.value }))}
                                        placeholder="名字，也可以留空"
                                        className="h-11 w-full rounded-[13px] border border-black/[0.055] bg-[#fafafa]/90 px-3 text-sm text-zinc-800 outline-none transition focus:border-violet-300 focus:bg-white"
                                    />
                                </label>

                                <button
                                    type="button"
                                    onClick={send}
                                    disabled={!letter.message.trim() || sending}
                                    className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-zinc-950 text-sm font-semibold text-white shadow-[0_16px_34px_-22px_rgba(24,24,27,.6)] transition hover:-translate-y-0.5 hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-35"
                                >
                                    <SendIcon />
                                    {sending ? '正在飞远…' : '让它飞走'}
                                </button>

                                <div className="plane-note mt-4 flex items-start gap-2.5 rounded-[15px] border border-violet-100/70 bg-violet-50/45 px-3.5 py-3">
                                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-300" />
                                    <p className="text-[10px] leading-5 text-violet-500">
                                        这是一场只属于你的短暂仪式。文字不会上传服务器。
                                    </p>
                                </div>
                            </div>
                        </aside>

                        <div className="plane-stage relative min-h-[600px] overflow-hidden bg-[radial-gradient(circle_at_28%_20%,rgba(255,255,255,.98),transparent_22%),radial-gradient(circle_at_82%_26%,rgba(224,242,254,.56),transparent_30%),radial-gradient(circle_at_60%_78%,rgba(243,232,255,.50),transparent_34%),linear-gradient(145deg,#fbf9ff_0%,#f9fbff_48%,#fff9fc_100%)]">
                            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/60 to-transparent" />

                            <div className="pointer-events-none absolute left-[7%] top-[8%] h-28 w-28 rounded-full border border-violet-100/70" />
                            <div className="pointer-events-none absolute right-[8%] top-[15%] h-40 w-40 rounded-full border border-sky-100/75" />
                            <div className="pointer-events-none absolute right-[20%] bottom-[8%] h-36 w-36 rounded-full bg-rose-50/65 blur-[44px]" />

                            <div className="absolute left-[6%] top-[7%] z-10 max-w-[290px]">
                                <div className="text-[9px] uppercase tracking-[0.24em] text-zinc-300">A small ritual</div>
                                <p className="mt-2 text-[13px] leading-6 text-zinc-400">
                                    写下来，然后看着它离开。<br className="hidden sm:block" />
                                    有时候，这样就够了。
                                </p>
                            </div>

                            <div className="absolute right-[6%] top-[7%] z-10 text-right">
                                <div className="text-[9px] uppercase tracking-[0.24em] text-zinc-300">Wind / 01</div>
                                <div className="mt-2 inline-flex items-center gap-2 text-[10px] text-zinc-400">
                                    <span className="h-px w-8 bg-gradient-to-r from-violet-200 to-sky-200" />
                                    east · light
                                </div>
                            </div>

                            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1000 700" preserveAspectRatio="none" aria-hidden="true">
                                <defs>
                                    <linearGradient id="flightPathV4" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#c4b5fd" stopOpacity=".16" />
                                        <stop offset="48%" stopColor="#a78bfa" stopOpacity=".32" />
                                        <stop offset="100%" stopColor="#bae6fd" stopOpacity=".06" />
                                    </linearGradient>
                                </defs>

                                <path
                                    ref={pathRef}
                                    d="M165 535 C260 500 280 390 370 392 C480 395 500 510 610 438 C705 375 680 230 780 206 C850 190 898 225 942 142"
                                    fill="none"
                                    stroke="url(#flightPathV4)"
                                    strokeWidth="1.7"
                                    strokeDasharray="5 11"
                                    vectorEffect="non-scaling-stroke"
                                    strokeLinecap="round"
                                />
                            </svg>

                            <div
                                ref={letterPreviewRef}
                                className="absolute bottom-[8%] left-[7%] z-10 w-[min(82%,430px)] origin-bottom rounded-[23px] border border-black/[0.05] bg-white/88 p-5 shadow-[0_28px_68px_-52px_rgba(50,34,80,.30)] backdrop-blur-md sm:p-6"
                                style={{ transformStyle: 'preserve-3d' }}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-[9px] uppercase tracking-[0.22em] text-violet-400">
                                        To / {letter.to || '未命名的人'}
                                    </div>
                                    <span className="h-1.5 w-1.5 rounded-full bg-violet-300" />
                                </div>

                                <p className="mt-5 whitespace-pre-wrap text-[15px] leading-8 text-zinc-700">
                                    {letter.message || '把那句话留在这里。'}
                                </p>

                                <div className="mt-7 flex items-center justify-between border-t border-black/[0.055] pt-4">
                                    <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-300">unsent letter</span>
                                    <span className="text-xs text-zinc-500">{letter.signature || '匿名'}</span>
                                </div>
                            </div>

                            <div
                                ref={planeRef}
                                className="absolute left-0 top-0 z-20 h-[54px] w-[54px] text-violet-500 opacity-0 sm:h-[60px] sm:w-[60px]"
                                style={{
                                    willChange: 'transform, opacity',
                                    backfaceVisibility: 'hidden',
                                    transformStyle: 'flat',
                                }}
                            >
                                <PlaneIcon className="h-full w-full" />
                            </div>

                            {sent && (
                                <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/42 backdrop-blur-[5px]">
                                    <div className="max-w-[400px] px-6 text-center">
                                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-violet-100 bg-white/90 text-violet-500 shadow-[0_16px_44px_-28px_rgba(124,58,237,.32)]">
                                            <PlaneIcon className="h-7 w-7" />
                                        </div>
                                        <div className="mt-5 text-[9px] uppercase tracking-[0.26em] text-violet-400">Sent away</div>
                                        <h3 className="mt-3 text-2xl font-semibold tracking-[-0.045em] text-zinc-950">它已经飞远了。</h3>
                                        <p className="mt-3 text-sm leading-7 text-zinc-500">
                                            没关系，不是所有话都一定要被听见。
                                        </p>
                                        <button
                                            type="button"
                                            onClick={writeAgain}
                                            className="mt-5 inline-flex h-10 items-center justify-center rounded-full border border-black/[0.06] bg-white px-4 text-xs font-medium text-zinc-600 transition hover:border-violet-200 hover:text-violet-600"
                                        >
                                            再写一句
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="pointer-events-none absolute bottom-5 right-6 text-[9px] uppercase tracking-[0.22em] text-zinc-300">
                                BitLeap · 心迹
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    )
}
