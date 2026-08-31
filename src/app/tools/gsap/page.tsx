"use client";

import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import FooterNote from '@/components/FooterNote'
import Link from 'next/link'

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import {
    ArrowDown,
    ArrowRight,
    ArrowUpRight,
    BookOpen,
    Check,
    ChevronRight,
    CirclePlay,
    Code2,
    Copy,
    Gauge,
    Layers3,
    MousePointer2,
    Pause,
    Play,
    RefreshCcw,
    RotateCcw,
    Sparkles,
    WandSparkles,
    Zap,
} from "lucide-react";

const easeOptions = [
    "power1.out",
    "power2.out",
    "power3.out",
    "power4.out",
    "back.out(1.7)",
    "elastic.out(1, 0.3)",
    "bounce.out",
    "expo.out",
];

const apiCards = [
    {
        number: "01",
        method: "gsap.to()",
        title: "去到目标",
        description: "从元素当前状态动画到你指定的目标状态。",
        color: "bg-[#e7ff9c]",
        code: `gsap.to(".box", {
  x: 240,
  rotation: 360,
  duration: 1,
  ease: "power3.out"
});`,
    },
    {
        number: "02",
        method: "gsap.from()",
        title: "从这里来",
        description: "特别适合页面入场、文字揭示、卡片滚入等效果。",
        color: "bg-[#d9c8ff]",
        code: `gsap.from(".title", {
  y: 80,
  opacity: 0,
  duration: 1,
  ease: "power4.out"
});`,
    },
    {
        number: "03",
        method: "timeline()",
        title: "编排节奏",
        description: "把多个 Tween 组合起来，制作完整的动画叙事。",
        color: "bg-[#a8efff]",
        code: `const tl = gsap.timeline();

tl.to(".box", { x: 200 })
  .to(".box", { rotation: 180 })
  .to(".box", { scale: 1.2 });`,
    },
    {
        number: "04",
        method: "ScrollTrigger",
        title: "滚动控制",
        description: "把页面滚动位置直接变成动画的时间轴。",
        color: "bg-[#ffc9ad]",
        code: `gsap.to(".box", {
  x: 400,
  scrollTrigger: {
    trigger: ".box",
    start: "top 80%",
    end: "bottom 30%",
    scrub: 1
  }
});`,
    },
];

const pluginCards = [
    {
        name: "ScrollTrigger",
        label: "滚动动画",
        color: "bg-[#e7ff9c]",
        description: "Trigger、Scrub、Pin、Snap，让滚动成为动画控制器。",
    },
    {
        name: "Flip",
        label: "布局切换",
        color: "bg-[#d9c8ff]",
        description: "处理 DOM 布局变化，让复杂布局切换依然自然顺滑。",
    },
    {
        name: "Draggable",
        label: "拖拽交互",
        color: "bg-[#a8efff]",
        description: "快速构建可拖动元素、滑块以及丰富的指针交互。",
    },
    {
        name: "SplitText",
        label: "文字动画",
        color: "bg-[#ffc9ad]",
        description: "将文字按字符、单词或行拆分，制作高级排版动画。",
    },
    {
        name: "MotionPath",
        label: "路径动画",
        color: "bg-[#fff0a8]",
        description: "让元素沿着 SVG Path 或指定路径精准移动。",
    },
    {
        name: "MorphSVG",
        label: "SVG 变形",
        color: "bg-[#ffcadf]",
        description: "在不同 SVG Path 之间制作流畅的形态变换。",
    },
];

export default function GSAPToolPage() {
    const rootRef = useRef<HTMLDivElement>(null);

    const demoBoxRef = useRef<HTMLDivElement>(null);
    const demoTimelineRef = useRef<gsap.core.Timeline | null>(null);

    const horizontalRef = useRef<HTMLElement>(null);
    const horizontalTrackRef = useRef<HTMLDivElement>(null);

    const [duration, setDuration] = useState(1);
    const [distance, setDistance] = useState(180);
    const [rotation, setRotation] = useState(360);
    const [ease, setEase] = useState("power3.out");
    const [playing, setPlaying] = useState(false);

    const demoCode = useMemo(
        () => `gsap.to(".demo-box", {
  x: ${distance},
  rotation: ${rotation},
  duration: ${duration},
  ease: "${ease}"
});`,
        [distance, rotation, duration, ease]
    );

    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger);

        if (!rootRef.current) return;

        const ctx = gsap.context(() => {
            /**
             * HERO INTRO
             */
            const intro = gsap.timeline({
                defaults: {
                    ease: "power4.out",
                },
            });

            intro
                .from(".hero-pill", {
                    y: 20,
                    opacity: 0,
                    duration: 0.5,
                })
                .from(
                    ".hero-word",
                    {
                        yPercent: 130,
                        rotate: 4,
                        duration: 1,
                        stagger: 0.08,
                    },
                    "-=0.15"
                )
                .from(
                    ".hero-copy",
                    {
                        y: 30,
                        opacity: 0,
                        duration: 0.7,
                    },
                    "-=0.5"
                )
                .from(
                    ".hero-action",
                    {
                        y: 20,
                        opacity: 0,
                        duration: 0.55,
                        stagger: 0.08,
                    },
                    "-=0.45"
                )
                .from(
                    ".hero-art",
                    {
                        scale: 0.82,
                        rotate: 8,
                        opacity: 0,
                        duration: 1,
                    },
                    "-=0.8"
                );

            /**
             * HERO FLOATING
             */
            gsap.to(".float-a", {
                y: -18,
                rotation: -5,
                repeat: -1,
                yoyo: true,
                duration: 2.6,
                ease: "sine.inOut",
            });

            gsap.to(".float-b", {
                y: 16,
                x: 8,
                repeat: -1,
                yoyo: true,
                duration: 3.1,
                ease: "sine.inOut",
            });

            gsap.to(".float-c", {
                y: -12,
                x: -8,
                repeat: -1,
                yoyo: true,
                duration: 2.8,
                ease: "sine.inOut",
            });

            gsap.to(".hero-ring", {
                rotation: 360,
                repeat: -1,
                duration: 24,
                ease: "none",
            });

            /**
             * HERO PARALLAX
             */
            gsap.to(".hero-art", {
                yPercent: 25,
                rotate: -5,
                ease: "none",

                scrollTrigger: {
                    trigger: ".hero-section",
                    start: "top top",
                    end: "bottom top",
                    scrub: 1,
                },
            });

            gsap.to(".hero-content", {
                yPercent: 18,
                opacity: 0.12,
                ease: "none",

                scrollTrigger: {
                    trigger: ".hero-section",
                    start: "top top",
                    end: "bottom 20%",
                    scrub: 1,
                },
            });

            /**
             * MARQUEE
             */
            gsap.to(".marquee-track", {
                xPercent: -18,
                ease: "none",

                scrollTrigger: {
                    trigger: ".marquee-section",
                    start: "top bottom",
                    end: "bottom top",
                    scrub: 1,
                },
            });

            /**
             * COMMON REVEAL
             */
            gsap.utils.toArray<HTMLElement>(".reveal").forEach((element) => {
                gsap.from(element, {
                    y: 70,
                    opacity: 0,
                    duration: 1,
                    ease: "power4.out",

                    scrollTrigger: {
                        trigger: element,
                        start: "top 87%",
                        toggleActions: "play none none reverse",
                    },
                });
            });

            /**
             * CARD REVEAL
             */
            gsap.utils
                .toArray<HTMLElement>(".reveal-card")
                .forEach((element, index) => {
                    gsap.from(element, {
                        y: 100,
                        rotate: index % 2 === 0 ? -3 : 3,
                        opacity: 0,
                        duration: 0.9,
                        ease: "power3.out",

                        scrollTrigger: {
                            trigger: element,
                            start: "top 90%",
                            toggleActions: "play none none reverse",
                        },
                    });
                });

            /**
             * SCROLL STORY
             */
            const storyTimeline = gsap.timeline({
                scrollTrigger: {
                    trigger: ".scroll-story",
                    start: "top top",
                    end: "+=2600",
                    pin: ".scroll-pin",
                    scrub: 1,
                    anticipatePin: 1,
                },
            });

            storyTimeline
                .to(".scroll-shape", {
                    xPercent: 42,
                    yPercent: -15,
                    rotate: 90,
                    scale: 1.12,
                    duration: 1,
                })
                .to(
                    ".scroll-ring",
                    {
                        rotate: 180,
                        scale: 1.18,
                        duration: 1,
                    },
                    "<"
                )
                .to(
                    ".step-1",
                    {
                        opacity: 0.12,
                        y: -30,
                        duration: 0.45,
                    },
                    "<0.15"
                )
                .fromTo(
                    ".step-2",
                    {
                        opacity: 0.12,
                        y: 60,
                    },
                    {
                        opacity: 1,
                        y: 0,
                        duration: 0.6,
                    },
                    "<0.05"
                )
                .to(".scroll-shape", {
                    xPercent: -25,
                    yPercent: 28,
                    rotate: 180,
                    scale: 1,
                    borderRadius: "22% 78% 61% 39% / 63% 30% 70% 37%",
                    duration: 1,
                })
                .to(
                    ".scroll-ring",
                    {
                        rotate: 360,
                        scale: 0.82,
                        duration: 1,
                    },
                    "<"
                )
                .to(
                    ".step-2",
                    {
                        opacity: 0.12,
                        y: -30,
                        duration: 0.45,
                    },
                    "<0.15"
                )
                .fromTo(
                    ".step-3",
                    {
                        opacity: 0.12,
                        y: 60,
                    },
                    {
                        opacity: 1,
                        y: 0,
                        duration: 0.6,
                    },
                    "<0.05"
                )
                .to(".scroll-shape", {
                    xPercent: 12,
                    yPercent: -8,
                    rotate: 295,
                    scale: 0.82,
                    borderRadius: "65% 35% 30% 70% / 38% 68% 32% 62%",
                    duration: 1,
                })
                .to(
                    ".scroll-ring",
                    {
                        rotate: 540,
                        scale: 1.28,
                        duration: 1,
                    },
                    "<"
                );

            /**
             * HORIZONTAL SCROLL
             */
            const horizontalSection = horizontalRef.current;
            const horizontalTrack = horizontalTrackRef.current;

            if (horizontalSection && horizontalTrack) {
                const getDistance = () =>
                    Math.max(
                        0,
                        horizontalTrack.scrollWidth - horizontalSection.clientWidth
                    );

                gsap.to(horizontalTrack, {
                    x: () => -getDistance(),
                    ease: "none",

                    scrollTrigger: {
                        trigger: horizontalSection,
                        start: "top top",
                        end: () => `+=${getDistance() + window.innerHeight * 0.7}`,
                        pin: true,
                        scrub: 0.8,
                        invalidateOnRefresh: true,
                    },
                });
            }

            /**
             * PLUGIN CARDS
             */
            gsap.utils
                .toArray<HTMLElement>(".plugin-card")
                .forEach((element, index) => {
                    gsap.from(element, {
                        y: 70,
                        opacity: 0,
                        rotate: index % 2 === 0 ? -2 : 2,
                        duration: 0.8,
                        ease: "power3.out",

                        scrollTrigger: {
                            trigger: element,
                            start: "top 90%",
                        },
                    });
                });
        }, rootRef);

        ScrollTrigger.refresh();

        return () => {
            ctx.revert();
        };
    }, []);

    useEffect(() => {
        return () => {
            demoTimelineRef.current?.kill();
        };
    }, []);

    const playDemo = () => {
        if (!demoBoxRef.current) return;

        demoTimelineRef.current?.kill();

        gsap.set(demoBoxRef.current, {
            x: 0,
            rotation: 0,
            scale: 1,
        });

        setPlaying(true);

        demoTimelineRef.current = gsap.timeline({
            onComplete: () => {
                setPlaying(false);
            },
        });

        demoTimelineRef.current.to(demoBoxRef.current, {
            x: distance,
            rotation,
            duration,
            ease,
        });
    };

    const pauseDemo = () => {
        const timeline = demoTimelineRef.current;

        if (!timeline) return;

        if (timeline.paused()) {
            timeline.resume();
            setPlaying(true);
            return;
        }

        timeline.pause();
        setPlaying(false);
    };

    const resetDemo = () => {
        demoTimelineRef.current?.kill();

        setPlaying(false);

        if (!demoBoxRef.current) return;

        gsap.to(demoBoxRef.current, {
            x: 0,
            rotation: 0,
            scale: 1,
            duration: 0.5,
            ease: "power3.out",
        });
    };

    return (
        <div
            ref={rootRef}
            className="min-h-screen overflow-x-hidden bg-[#f7f7f3] text-[#11120f]"
        >
            {/* =====================================================
          NAV
      ===================================================== */}
            <header className="relative z-50 border-b border-black/[0.06] bg-[#f7f7f3]/85 backdrop-blur-xl">
                <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 md:px-8 lg:px-10">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#11120f]">
                            <Zap className="h-4 w-4 text-[#b5ff67]" />
                        </div>

                        <div>
                            <div className="text-sm font-black tracking-[-0.03em]">
                                GSAP Motion Lab
                            </div>

                            <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-black/30">
                                Frontend animation
                            </div>
                        </div>
                    </Link>

                    <div className="flex items-center gap-2">
                        <a
                            href="https://gsap.com/docs/v3/"
                            target="_blank"
                            rel="noreferrer"
                            className="hidden items-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-black/50 transition hover:bg-black/[0.05] hover:text-black sm:flex"
                        >
                            <BookOpen className="h-4 w-4" />
                            Docs
                        </a>

                        <a
                            href="https://gsap.com/"
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 rounded-full bg-[#11120f] px-4 py-2 text-xs font-black text-white transition hover:scale-[1.03]"
                        >
                            GSAP 官网
                            <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                    </div>
                </div>
            </header>

            <main>
                {/* =====================================================
            HERO
        ===================================================== */}
                <section className="hero-section relative min-h-[calc(100vh-64px)] overflow-hidden">
                    <div className="pointer-events-none absolute inset-0">
                        <div className="absolute -left-[180px] -top-[180px] h-[560px] w-[560px] rounded-full bg-[#dfff91]/45 blur-[90px]" />

                        <div className="absolute -right-[160px] top-[60px] h-[520px] w-[520px] rounded-full bg-[#d8c5ff]/45 blur-[100px]" />

                        <div className="absolute bottom-[-220px] left-[38%] h-[500px] w-[500px] rounded-full bg-[#a8efff]/35 blur-[100px]" />
                    </div>

                    <div className="relative mx-auto grid min-h-[calc(100vh-64px)] max-w-[1440px] items-center gap-12 px-5 py-16 md:px-8 lg:grid-cols-[1.08fr_.92fr] lg:px-10">
                        <div className="hero-content relative z-10">
                            <div className="hero-pill mb-7 flex flex-wrap gap-2">
                                {["GSAP 3", "Next.js", "TypeScript", "ScrollTrigger"].map(
                                    (item) => (
                                        <span
                                            key={item}
                                            className="rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-black/45 shadow-sm backdrop-blur"
                                        >
                                            {item}
                                        </span>
                                    )
                                )}
                            </div>

                            <div className="overflow-hidden pb-3">
                                <h1 className="hero-word text-[16vw] font-black leading-[0.78] tracking-[-0.085em] sm:text-[92px] lg:text-[116px] xl:text-[132px]">
                                    Motion
                                </h1>
                            </div>

                            <div className="overflow-hidden pb-3">
                                <h1 className="hero-word ml-[8vw] text-[16vw] font-black leading-[0.78] tracking-[-0.085em] sm:ml-12 sm:text-[92px] lg:text-[116px] xl:text-[132px]">
                                    follows
                                </h1>
                            </div>

                            <div className="overflow-hidden pb-5">
                                <h1 className="hero-word flex items-center gap-4 text-[16vw] font-black leading-[0.78] tracking-[-0.085em] sm:text-[92px] lg:text-[116px] xl:text-[132px]">
                                    scroll

                                    <span className="flex h-[0.62em] w-[0.62em] shrink-0 items-center justify-center rounded-full bg-[#aaff57]">
                                        <ArrowDown className="h-[0.28em] w-[0.28em]" />
                                    </span>
                                </h1>
                            </div>

                            <p className="hero-copy mt-7 max-w-xl text-sm font-medium leading-7 text-black/45 md:text-base md:leading-8">
                                GSAP 不只是让一个 div 动起来。Tween 控制动作，Timeline
                                编排节奏，ScrollTrigger
                                则可以直接把用户滚动转化成动画进度。
                            </p>

                            <div className="mt-8 flex flex-wrap gap-3">
                                <a
                                    href="#scroll-demo"
                                    className="hero-action group flex items-center gap-2 rounded-full bg-[#11120f] px-5 py-3 text-sm font-black text-white transition hover:scale-[1.03]"
                                >
                                    <CirclePlay className="h-4 w-4" />

                                    看 ScrollTrigger

                                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                </a>

                                <a
                                    href="#playground"
                                    className="hero-action flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-5 py-3 text-sm font-black transition hover:bg-white"
                                >
                                    Playground

                                    <ArrowRight className="h-4 w-4" />
                                </a>
                            </div>
                        </div>

                        {/* HERO ART */}
                        <div className="hero-art relative mx-auto h-[400px] w-full max-w-[570px] sm:h-[500px]">
                            <div className="absolute left-[8%] top-[7%] h-[74%] w-[75%] rotate-[9deg] rounded-[42%_58%_63%_37%/42%_44%_56%_58%] bg-[#d8c5ff]" />

                            <div className="absolute bottom-[8%] left-0 h-[57%] w-[72%] -rotate-[12deg] rounded-[52%_48%_35%_65%/53%_38%_62%_47%] bg-[#a8efff] mix-blend-multiply" />

                            <div className="absolute right-0 top-[16%] h-[60%] w-[58%] rotate-[14deg] rounded-[31%_69%_56%_44%/60%_30%_70%_40%] bg-[#dfff89] mix-blend-multiply" />

                            <div className="hero-ring absolute left-1/2 top-1/2 h-[270px] w-[270px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/20 sm:h-[340px] sm:w-[340px]">
                                <span className="absolute left-1/2 top-[-7px] h-3.5 w-3.5 rounded-full bg-[#11120f]" />
                            </div>

                            <div className="absolute left-1/2 top-1/2 flex h-[155px] w-[155px] -translate-x-1/2 -translate-y-1/2 -rotate-6 items-center justify-center rounded-[42px] bg-[#11120f] shadow-[0_35px_80px_rgba(0,0,0,.25)] sm:h-[190px] sm:w-[190px]">
                                <span className="text-[46px] font-black tracking-[-0.09em] text-[#adff5c] sm:text-[58px]">
                                    GSAP
                                </span>
                            </div>

                            <div className="float-a absolute left-0 top-[16%] -rotate-6 rounded-2xl border border-black/[0.08] bg-white/90 px-4 py-3 shadow-xl backdrop-blur">
                                <div className="text-[8px] font-black tracking-[0.18em] text-black/30">
                                    SCROLLTRIGGER
                                </div>

                                <div className="mt-1 font-mono text-sm font-black">scrub: 1</div>
                            </div>

                            <div className="float-b absolute bottom-[13%] right-0 rotate-5 rounded-2xl border border-black/[0.08] bg-white px-4 py-3 shadow-xl">
                                <div className="flex items-center gap-2 text-sm font-black">
                                    <Gauge className="h-4 w-4" />
                                    60 FPS
                                </div>
                            </div>

                            <div className="float-c absolute right-[5%] top-[7%] rounded-full bg-[#11120f] px-4 py-2 font-mono text-[11px] font-bold text-white shadow-xl">
                                timeline()
                            </div>
                        </div>
                    </div>
                </section>

                {/* =====================================================
            MARQUEE
        ===================================================== */}
                <section className="marquee-section overflow-hidden border-y border-black/[0.06] bg-white py-7">
                    <div className="marquee-track flex w-max items-center gap-8 whitespace-nowrap px-5">
                        {[
                            "TWEEN",
                            "TIMELINE",
                            "SCROLLTRIGGER",
                            "EASING",
                            "PIN",
                            "SCRUB",
                            "SVG",
                            "MOTION",
                            "TWEEN",
                            "TIMELINE",
                            "SCROLLTRIGGER",
                            "EASING",
                        ].map((item, index) => (
                            <div key={`${item}-${index}`} className="flex items-center gap-8">
                                <span className="text-4xl font-black tracking-[-0.05em] text-black/[0.12] md:text-6xl">
                                    {item}
                                </span>

                                <span className="h-3 w-3 rounded-full bg-[#aaff57]" />
                            </div>
                        ))}
                    </div>
                </section>

                {/* =====================================================
            INTRO
        ===================================================== */}
                <section className="px-5 py-28 md:px-8 lg:py-36">
                    <div className="mx-auto max-w-[1280px]">
                        <div className="reveal grid gap-10 lg:grid-cols-[.7fr_1.3fr]">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-black/35">
                                    01 / What is GSAP
                                </div>
                            </div>

                            <div>
                                <h2 className="max-w-5xl text-4xl font-black leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
                                    它更像一套
                                    <span className="mx-3 inline-block -rotate-2 rounded-[20px] bg-[#dfff91] px-4 py-2">
                                        motion engine
                                    </span>
                                    ，而不只是一个动画函数。
                                </h2>

                                <div className="mt-10 grid gap-6 md:grid-cols-2">
                                    <p className="text-sm font-medium leading-7 text-black/45">
                                        GSAP 使用 Tween 描述一个动画，用 Timeline
                                        管理多个动画的播放关系，再通过插件扩展滚动、SVG、文字、拖拽和路径动画等能力。
                                    </p>

                                    <p className="text-sm font-medium leading-7 text-black/45">
                                        对于产品官网、品牌站、创意交互、复杂页面过渡和数据可视化场景，
                                        GSAP 可以提供比普通 CSS transition 更精确的时间控制能力。
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* =====================================================
            SCROLL STORY
        ===================================================== */}
                <section
                    id="scroll-demo"
                    className="scroll-story relative bg-[#11120f] text-white"
                >
                    <div className="scroll-pin relative min-h-screen overflow-hidden">
                        <div
                            className="pointer-events-none absolute inset-0 opacity-[0.07]"
                            style={{
                                backgroundImage:
                                    "linear-gradient(rgba(255,255,255,.45) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.45) 1px, transparent 1px)",
                                backgroundSize: "64px 64px",
                            }}
                        />

                        <div className="pointer-events-none absolute -left-[150px] top-[30%] h-[420px] w-[420px] rounded-full bg-[#7ce7ff]/10 blur-[120px]" />

                        <div className="pointer-events-none absolute -right-[130px] top-[10%] h-[450px] w-[450px] rounded-full bg-[#b8ff68]/10 blur-[120px]" />

                        <div className="relative mx-auto grid min-h-screen max-w-[1440px] items-center gap-14 px-5 py-20 md:px-8 lg:grid-cols-[.9fr_1.1fr] lg:px-10">
                            <div>
                                <div className="mb-5 flex items-center gap-2 text-[10px] font-black tracking-[0.2em] text-[#aaff61]">
                                    <span className="h-2 w-2 rounded-full bg-[#aaff61] shadow-[0_0_18px_#aaff61]" />
                                    SCROLLTRIGGER LIVE
                                </div>

                                <h2 className="max-w-xl text-5xl font-black leading-[0.9] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
                                    这一屏，
                                    <br />
                                    就是
                                    <br />
                                    ScrollTrigger。
                                </h2>

                                <div className="mt-12 max-w-lg space-y-9">
                                    <div className="step-1">
                                        <div className="text-[9px] font-black tracking-[0.2em] text-[#8ee9ff]">
                                            01 / TRIGGER
                                        </div>

                                        <h3 className="mt-2 text-2xl font-black tracking-[-0.03em]">
                                            元素进入视口，
                                            <br />
                                            故事开始。
                                        </h3>

                                        <p className="mt-2 text-sm leading-6 text-white/40">
                                            trigger 决定触发对象，start 和 end
                                            定义动画作用在哪一段滚动区间。
                                        </p>
                                    </div>

                                    <div className="step-2 opacity-[0.12]">
                                        <div className="text-[9px] font-black tracking-[0.2em] text-[#c8afff]">
                                            02 / SCRUB
                                        </div>

                                        <h3 className="mt-2 text-2xl font-black tracking-[-0.03em]">
                                            滚多少，
                                            <br />
                                            动画走多少。
                                        </h3>

                                        <p className="mt-2 text-sm leading-6 text-white/40">
                                            scrub 会把 Tween 或 Timeline
                                            的进度和用户当前滚动位置绑定起来。
                                        </p>
                                    </div>

                                    <div className="step-3 opacity-[0.12]">
                                        <div className="text-[9px] font-black tracking-[0.2em] text-[#baff68]">
                                            03 / PIN
                                        </div>

                                        <h3 className="mt-2 text-2xl font-black tracking-[-0.03em]">
                                            页面在滚，
                                            <br />
                                            场景不走。
                                        </h3>

                                        <p className="mt-2 text-sm leading-6 text-white/40">
                                            pin
                                            会把指定区域临时固定，让内部动画继续随着滚动进度变化。
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="relative mx-auto h-[430px] w-full max-w-[620px] sm:h-[520px]">
                                <div className="scroll-ring absolute left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/20 sm:h-[430px] sm:w-[430px]">
                                    <span className="absolute left-1/2 top-[-7px] h-3.5 w-3.5 rounded-full bg-[#aaff61] shadow-[0_0_28px_#aaff61]" />
                                </div>

                                <div className="scroll-shape absolute left-[16%] top-[14%] h-[68%] w-[67%] -rotate-12 rounded-[58%_42%_66%_34%/40%_62%_38%_60%] bg-gradient-to-br from-[#c3a7ff] via-[#8deaff] to-[#b8ff68]" />

                                <div className="absolute left-1/2 top-1/2 flex h-36 w-36 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-2xl sm:h-40 sm:w-40">
                                    <div className="text-center">
                                        <div className="text-[8px] font-black tracking-[0.2em] text-black/30">
                                            SCROLL
                                        </div>

                                        <div className="mt-1 text-3xl font-black tracking-[-0.06em] sm:text-4xl">
                                            → TIME
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 text-[9px] font-black tracking-[0.18em] text-white/25">
                            KEEP SCROLLING
                            <ArrowDown className="h-3 w-3" />
                        </div>
                    </div>
                </section>

                {/* =====================================================
            HORIZONTAL CORE API
        ===================================================== */}
                <section
                    ref={horizontalRef}
                    className="relative min-h-screen overflow-hidden bg-[#f7f7f3]"
                >
                    <div className="absolute left-5 top-6 z-20 md:left-8 md:top-8">
                        <div className="text-[9px] font-black tracking-[0.2em] text-black/30">
                            CORE API / HORIZONTAL
                        </div>

                        <p className="mt-1 text-xs font-bold text-black/40">继续向下滚动 →</p>
                    </div>

                    <div
                        ref={horizontalTrackRef}
                        className="flex h-screen w-max items-center gap-5 px-[5vw] pt-12"
                    >
                        <article className="flex h-[66vh] w-[84vw] max-w-[900px] shrink-0 flex-col justify-end rounded-[46px] bg-[#11120f] p-8 text-white sm:p-10">
                            <div className="text-[9px] font-black tracking-[0.2em] text-[#baff6c]">
                                GSAP CORE
                            </div>

                            <h2 className="mt-5 text-[clamp(60px,8vw,110px)] font-black leading-[0.8] tracking-[-0.075em]">
                                Four
                                <br />
                                simple
                                <br />
                                pieces.
                            </h2>
                        </article>

                        {apiCards.map((item) => (
                            <article
                                key={item.method}
                                className={`${item.color} flex h-[66vh] w-[78vw] max-w-[700px] shrink-0 flex-col justify-between rounded-[46px] p-8 sm:p-10`}
                            >
                                <div className="flex items-start justify-between">
                                    <Code2 className="h-7 w-7" />

                                    <span className="font-mono text-xs font-black text-black/30">
                                        {item.number}
                                    </span>
                                </div>

                                <div>
                                    <div className="font-mono text-sm font-black text-black/40">
                                        {item.method}
                                    </div>

                                    <h3 className="mt-4 text-5xl font-black tracking-[-0.06em] sm:text-6xl">
                                        {item.title}
                                    </h3>

                                    <p className="mt-5 max-w-md text-sm font-medium leading-6 text-black/45">
                                        {item.description}
                                    </p>

                                    <div className="mt-8 rounded-[24px] bg-black/[0.06] p-5">
                                        <pre className="overflow-x-auto font-mono text-xs leading-6 text-black/60">
                                            <code>{item.code}</code>
                                        </pre>
                                    </div>
                                </div>
                            </article>
                        ))}

                        <article className="flex h-[66vh] w-[65vw] max-w-[620px] shrink-0 items-center justify-center rounded-[46px] border border-black/10 bg-white p-8">
                            <div className="text-center">
                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#aaff57]">
                                    <ArrowDown className="h-5 w-5" />
                                </div>

                                <h3 className="mt-7 text-4xl font-black tracking-[-0.055em]">
                                    Keep
                                    <br />
                                    exploring.
                                </h3>
                            </div>
                        </article>
                    </div>
                </section>

                {/* =====================================================
            PLAYGROUND
        ===================================================== */}
                <section
                    id="playground"
                    className="relative overflow-hidden bg-white px-5 py-28 md:px-8 lg:py-36"
                >
                    <div className="pointer-events-none absolute left-[-200px] top-[20%] h-[500px] w-[500px] rounded-full bg-[#dfff91]/30 blur-[110px]" />

                    <div className="pointer-events-none absolute right-[-200px] top-[10%] h-[500px] w-[500px] rounded-full bg-[#d8c5ff]/30 blur-[110px]" />

                    <div className="relative mx-auto max-w-[1280px]">
                        <div className="reveal mb-14">
                            <div className="mb-4 text-[9px] font-black tracking-[0.2em] text-black/30">
                                INTERACTIVE PLAYGROUND
                            </div>

                            <h2 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
                                别只看代码，
                                <br />
                                <span className="inline-block rotate-[-1deg] rounded-[20px] bg-[#e7ff9c] px-4 py-2">
                                    直接让它动。
                                </span>
                            </h2>

                            <p className="mt-6 max-w-xl text-sm font-medium leading-7 text-black/45">
                                修改 Tween 参数，然后执行真正的 GSAP 动画。你可以直接感受
                                duration、distance、rotation 和 ease 带来的区别。
                            </p>
                        </div>

                        <div className="reveal-card grid overflow-hidden rounded-[34px] border border-black/[0.08] bg-[#fafaf7] shadow-[0_30px_100px_rgba(0,0,0,.07)] lg:grid-cols-[.82fr_1.18fr]">
                            {/* controls */}
                            <div className="border-b border-black/[0.07] p-6 lg:border-b-0 lg:border-r md:p-8">
                                <div className="mb-8 flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-black">Animation controls</div>

                                        <div className="mt-1 text-xs font-medium text-black/35">
                                            修改参数并运行 Tween
                                        </div>
                                    </div>

                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#aaff57]">
                                        <WandSparkles className="h-4 w-4" />
                                    </div>
                                </div>

                                <div className="space-y-7">
                                    <Control label="Duration" value={`${duration.toFixed(1)}s`}>
                                        <input
                                            type="range"
                                            min={0.2}
                                            max={3}
                                            step={0.1}
                                            value={duration}
                                            onChange={(event) =>
                                                setDuration(Number(event.target.value))
                                            }
                                            className="w-full accent-black"
                                        />
                                    </Control>

                                    <Control label="Distance" value={`${distance}px`}>
                                        <input
                                            type="range"
                                            min={30}
                                            max={200}
                                            step={10}
                                            value={distance}
                                            onChange={(event) =>
                                                setDistance(Number(event.target.value))
                                            }
                                            className="w-full accent-black"
                                        />
                                    </Control>

                                    <Control label="Rotation" value={`${rotation}°`}>
                                        <input
                                            type="range"
                                            min={0}
                                            max={720}
                                            step={45}
                                            value={rotation}
                                            onChange={(event) =>
                                                setRotation(Number(event.target.value))
                                            }
                                            className="w-full accent-black"
                                        />
                                    </Control>

                                    <div>
                                        <div className="mb-3 flex items-center justify-between">
                                            <span className="text-xs font-black text-black/55">
                                                Easing
                                            </span>

                                            <span className="rounded-full bg-[#e7ff9c] px-2.5 py-1 font-mono text-[10px] font-black">
                                                {ease}
                                            </span>
                                        </div>

                                        <select
                                            value={ease}
                                            onChange={(event) => setEase(event.target.value)}
                                            className="h-11 w-full rounded-xl border border-black/[0.08] bg-white px-3 text-sm font-bold outline-none transition focus:border-black/30"
                                        >
                                            {easeOptions.map((item) => (
                                                <option key={item} value={item}>
                                                    {item}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-[1fr_auto_auto] gap-2 pt-2">
                                        <button
                                            onClick={playDemo}
                                            className="flex h-11 items-center justify-center gap-2 rounded-full bg-[#11120f] px-4 text-sm font-black text-white transition hover:scale-[1.02]"
                                        >
                                            <Play className="h-4 w-4 fill-current" />
                                            Run animation
                                        </button>

                                        <button
                                            onClick={pauseDemo}
                                            aria-label="暂停动画"
                                            className="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white transition hover:bg-black/[0.04]"
                                        >
                                            <Pause className="h-4 w-4" />
                                        </button>

                                        <button
                                            onClick={resetDemo}
                                            aria-label="重置动画"
                                            className="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white transition hover:bg-black/[0.04]"
                                        >
                                            <RotateCcw className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* canvas */}
                            <div className="flex min-h-[560px] flex-col">
                                <div className="relative flex flex-1 items-center overflow-hidden bg-[#f0f0eb] px-8 sm:px-12">
                                    <div
                                        className="pointer-events-none absolute inset-0 opacity-[0.08]"
                                        style={{
                                            backgroundImage:
                                                "linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)",
                                            backgroundSize: "32px 32px",
                                        }}
                                    />

                                    <div className="absolute left-6 top-5 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-black/30">
                                        <span
                                            className={`h-2 w-2 rounded-full ${playing
                                                    ? "bg-[#83db33] shadow-[0_0_12px_#83db33]"
                                                    : "bg-black/15"
                                                }`}
                                        />
                                        Animation canvas
                                    </div>

                                    <div
                                        ref={demoBoxRef}
                                        className="demo-box relative z-10 flex h-24 w-24 items-center justify-center rounded-[28px] bg-[#11120f] shadow-[0_20px_55px_rgba(0,0,0,.18)]"
                                    >
                                        <Sparkles className="h-8 w-8 text-[#aaff57]" />
                                    </div>
                                </div>

                                <div className="border-t border-black/[0.07] bg-white p-4">
                                    <CodeBlock>{demoCode}</CodeBlock>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* =====================================================
            NEXT JS
        ===================================================== */}
                <section className="bg-[#f7f7f3] px-5 py-28 md:px-8 lg:py-36">
                    <div className="mx-auto max-w-[1280px]">
                        <div className="reveal grid gap-10 lg:grid-cols-[.7fr_1.3fr]">
                            <div>
                                <div className="text-[9px] font-black tracking-[0.2em] text-black/30">
                                    NEXT.JS + TYPESCRIPT
                                </div>
                            </div>

                            <div>
                                <h2 className="text-5xl font-black leading-[0.95] tracking-[-0.06em] sm:text-6xl">
                                    在 Next.js 里，
                                    <br />
                                    动画也要
                                    <span className="ml-3 inline-block rounded-[18px] bg-[#d9c8ff] px-4 py-2">
                                        正确清理
                                    </span>
                                    。
                                </h2>
                            </div>
                        </div>

                        <div className="mt-16 grid gap-5 lg:grid-cols-2">
                            <div className="reveal-card">
                                <CodePanel
                                    number="01"
                                    label="安装"
                                    color="bg-[#e7ff9c]"
                                    code={`npm install gsap`}
                                    language="bash"
                                />
                            </div>

                            <div className="reveal-card">
                                <CodePanel
                                    number="02"
                                    label="基础 Client Component"
                                    color="bg-[#d9c8ff]"
                                    code={`"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export default function Demo() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".card", {
        y: 60,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out"
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={root}>
      <div className="card">
        Hello GSAP
      </div>
    </div>
  );
}`}
                                />
                            </div>

                            <div className="reveal-card lg:col-span-2">
                                <CodePanel
                                    number="03"
                                    label="ScrollTrigger"
                                    color="bg-[#a8efff]"
                                    code={`"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function ScrollDemo() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.to(".box", {
        x: 400,
        rotation: 180,

        scrollTrigger: {
          trigger: ".section",

          start: "top top",

          end: "+=1500",

          scrub: 1,

          pin: true
        }
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      className="section"
    >
      <div className="box" />
    </section>
  );
}`}
                                />
                            </div>
                        </div>

                        <div className="mt-6 grid gap-4 md:grid-cols-3">
                            <Tip
                                icon={<Code2 className="h-4 w-4" />}
                                title="use client"
                                description="涉及 DOM 的动画组件应该运行在客户端。"
                            />

                            <Tip
                                icon={<RefreshCcw className="h-4 w-4" />}
                                title="context + revert"
                                description="组件卸载时及时清理 Tween、Timeline 和 ScrollTrigger。"
                            />

                            <Tip
                                icon={<Layers3 className="h-4 w-4" />}
                                title="registerPlugin"
                                description="使用 ScrollTrigger 前记得显式注册插件。"
                            />
                        </div>
                    </div>
                </section>

                {/* =====================================================
            PLUGINS
        ===================================================== */}
                <section className="overflow-hidden bg-white px-5 py-28 md:px-8 lg:py-36">
                    <div className="mx-auto max-w-[1280px]">
                        <div className="reveal">
                            <div className="text-[9px] font-black tracking-[0.2em] text-black/30">
                                PLUGIN ECOSYSTEM
                            </div>

                            <h2 className="mt-4 max-w-5xl text-5xl font-black leading-[0.92] tracking-[-0.065em] sm:text-6xl lg:text-7xl">
                                Core 只是开始，
                                <br />
                                后面的东西才
                                <span className="ml-3 inline-block rotate-2 rounded-[20px] bg-[#ffc9ad] px-4 py-2">
                                    有意思
                                </span>
                                。
                            </h2>
                        </div>

                        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {pluginCards.map((plugin, index) => (
                                <article
                                    key={plugin.name}
                                    className={`plugin-card ${plugin.color} group min-h-[260px] rounded-[34px] p-7 ${index === 1 ? "lg:translate-y-12" : ""
                                        } ${index === 4 ? "lg:translate-y-8" : ""}`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/70">
                                            {index === 0 ? (
                                                <ArrowDown className="h-4 w-4" />
                                            ) : index === 1 ? (
                                                <Layers3 className="h-4 w-4" />
                                            ) : index === 2 ? (
                                                <MousePointer2 className="h-4 w-4" />
                                            ) : (
                                                <Sparkles className="h-4 w-4" />
                                            )}
                                        </div>

                                        <ArrowUpRight className="h-4 w-4 opacity-25 transition group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:opacity-80" />
                                    </div>

                                    <div className="mt-16">
                                        <div className="font-mono text-xs font-black text-black/35">
                                            {plugin.label}
                                        </div>

                                        <h3 className="mt-2 text-3xl font-black tracking-[-0.05em]">
                                            {plugin.name}
                                        </h3>

                                        <p className="mt-3 text-sm font-medium leading-6 text-black/45">
                                            {plugin.description}
                                        </p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                {/* =====================================================
            CTA
        ===================================================== */}
                <section className="bg-white px-5 pb-10 pt-20 md:px-8">
                    <div className="mx-auto max-w-[1360px]">
                        <div className="reveal relative overflow-hidden rounded-[46px] bg-[#11120f] px-7 py-14 text-white sm:px-10 md:py-20 lg:px-16">
                            <div className="pointer-events-none absolute -right-[130px] -top-[170px] h-[480px] w-[480px] rounded-full bg-[#b7ff68]/20 blur-[100px]" />

                            <div className="pointer-events-none absolute bottom-[-220px] left-[35%] h-[420px] w-[420px] rounded-full bg-[#b8a1ff]/15 blur-[110px]" />

                            <div className="relative">
                                <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#aaff57] px-3 py-1.5 text-[9px] font-black tracking-[0.15em] text-black">
                                    <Zap className="h-3.5 w-3.5" />
                                    READY TO ANIMATE
                                </div>

                                <h2 className="max-w-5xl text-5xl font-black leading-[0.9] tracking-[-0.065em] sm:text-6xl lg:text-8xl">
                                    Make the web
                                    <br />
                                    feel
                                    <span className="ml-4 text-[#aaff57]">alive.</span>
                                </h2>

                                <p className="mt-7 max-w-xl text-sm font-medium leading-7 text-white/40">
                                    从 gsap.to() 开始，再逐步掌握 Timeline、ScrollTrigger
                                    和完整插件生态。
                                </p>

                                <div className="mt-9 flex flex-wrap gap-3">
                                    <a
                                        href="https://gsap.com/"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-2 rounded-full bg-[#aaff57] px-5 py-3 text-sm font-black text-black transition hover:scale-[1.03]"
                                    >
                                        前往 GSAP
                                        <ArrowUpRight className="h-4 w-4" />
                                    </a>

                                    <a
                                        href="https://gsap.com/docs/v3/"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-black text-white/70 transition hover:bg-white/10 hover:text-white"
                                    >
                                        <BookOpen className="h-4 w-4" />
                                        Documentation
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="bg-white">
                <div className="mx-auto flex max-w-[1360px] flex-col justify-between gap-3 px-5 py-7 text-[10px] font-bold uppercase tracking-[0.12em] text-black/25 md:flex-row md:px-8">
                    <span>GSAP Motion Lab</span>

                    <span>Next.js · TypeScript · Tailwind CSS · ScrollTrigger</span>
                </div>
                <div className="mx-auto max-w-[1360px] px-5 pb-8 pt-4 md:px-8">
                    <FooterNote />
                </div>
            </footer>
        </div>
    );
}

/* ============================================================
   CONTROL
============================================================ */

function Control({
    label,
    value,
    children,
}: {
    label: string;
    value: string;
    children: ReactNode;
}) {
    return (
        <div>
            <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-black text-black/55">{label}</span>

                <span className="rounded-full bg-[#e7ff9c] px-2.5 py-1 font-mono text-[10px] font-black">
                    {value}
                </span>
            </div>

            {children}
        </div>
    );
}

/* ============================================================
   CODE BLOCK
============================================================ */

function CodeBlock({
    children,
    language = "ts",
}: {
    children: string;
    language?: string;
}) {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(children);

            setCopied(true);

            window.setTimeout(() => {
                setCopied(false);
            }, 1400);
        } catch {
            setCopied(false);
        }
    };

    return (
        <div className="overflow-hidden rounded-[22px] border border-black/[0.07] bg-[#11120f]">
            <div className="flex h-11 items-center justify-between border-b border-white/[0.08] px-4">
                <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />

                    <span className="ml-2 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-white/30">
                        {language}
                    </span>
                </div>

                <button
                    type="button"
                    onClick={copy}
                    className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-bold text-white/40 transition hover:bg-white/[0.07] hover:text-white"
                >
                    {copied ? (
                        <>
                            <Check className="h-3.5 w-3.5 text-[#aaff57]" />
                            已复制
                        </>
                    ) : (
                        <>
                            <Copy className="h-3.5 w-3.5" />
                            复制
                        </>
                    )}
                </button>
            </div>

            <pre className="overflow-x-auto p-5 font-mono text-[12px] leading-6 text-white/65">
                <code>{children}</code>
            </pre>
        </div>
    );
}

/* ============================================================
   CODE PANEL
============================================================ */

function CodePanel({
    number,
    label,
    color,
    code,
    language = "ts",
}: {
    number: string;
    label: string;
    color: string;
    code: string;
    language?: string;
}) {
    return (
        <div className="h-full rounded-[30px] border border-black/[0.07] bg-white p-4 shadow-[0_20px_60px_rgba(0,0,0,.04)]">
            <div className="mb-4 flex items-center gap-3 px-1">
                <span
                    className={`${color} flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-black`}
                >
                    {number}
                </span>

                <div className="text-sm font-black">{label}</div>
            </div>

            <CodeBlock language={language}>{code}</CodeBlock>
        </div>
    );
}

/* ============================================================
   TIP
============================================================ */

function Tip({
    icon,
    title,
    description,
}: {
    icon: ReactNode;
    title: string;
    description: string;
}) {
    return (
        <div className="rounded-[26px] border border-black/[0.07] bg-white p-5">
            <div className="mb-5 flex h-9 w-9 items-center justify-center rounded-full bg-[#e7ff9c]">
                {icon}
            </div>

            <div className="text-sm font-black">{title}</div>

            <p className="mt-2 text-xs font-medium leading-6 text-black/40">
                {description}
            </p>
        </div>
    );
}