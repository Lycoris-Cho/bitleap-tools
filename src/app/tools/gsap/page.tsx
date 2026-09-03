"use client";

import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import FooterNote from "@/components/FooterNote";

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
        description: "从元素当前状态精确动画到目标状态。",
        color: "bg-[#dfff84]",
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
        description: "适合页面入场、文字揭示、卡片进入与章节过渡。",
        color: "bg-[#d7c4ff]",
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
        description: "把多个 Tween 组合成真正有节奏的动画叙事。",
        color: "bg-[#9feaff]",
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
        color: "bg-[#ffc7a8]",
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
        color: "bg-[#dfff84]",
        description: "Trigger、Scrub、Pin、Snap，让滚动成为动画控制器。",
    },
    {
        name: "Flip",
        label: "布局切换",
        color: "bg-[#d7c4ff]",
        description: "布局变化也能保持流畅、连续和自然。",
    },
    {
        name: "Draggable",
        label: "拖拽交互",
        color: "bg-[#9feaff]",
        description: "构建拖拽、滑块、轨道和指针交互。",
    },
    {
        name: "SplitText",
        label: "文字动画",
        color: "bg-[#ffc7a8]",
        description: "按字符、单词、行制作更细腻的文字动画。",
    },
    {
        name: "MotionPath",
        label: "路径动画",
        color: "bg-[#fff0a0]",
        description: "沿 SVG Path 精准移动，适合轨迹与叙事。",
    },
    {
        name: "MorphSVG",
        label: "SVG 变形",
        color: "bg-[#ffc6dd]",
        description: "在不同 SVG Path 之间进行形态变化。",
    },
];

const marqueeItems = [
    "TWEEN",
    "TIMELINE",
    "SCROLLTRIGGER",
    "PIN",
    "SCRUB",
    "EASING",
    "MOTION",
    "SVG",
    "INTERACTION",
    "TWEEN",
    "TIMELINE",
    "SCROLLTRIGGER",
];

export default function GSAPToolPage() {
    const rootRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);

    const heroRef = useRef<HTMLElement>(null);
    const manifestoRef = useRef<HTMLElement>(null);
    const storyRef = useRef<HTMLElement>(null);
    const horizontalRef = useRef<HTMLElement>(null);
    const horizontalTrackRef = useRef<HTMLDivElement>(null);

    const demoBoxRef = useRef<HTMLDivElement>(null);
    const demoTimelineRef = useRef<gsap.core.Timeline | null>(null);

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

        const reduceMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;

        const ctx = gsap.context(() => {
            if (reduceMotion) return;

            if (progressRef.current) {
                gsap.set(progressRef.current, {
                    scaleX: 0,
                    transformOrigin: "0% 50%",
                });

                gsap.to(progressRef.current, {
                    scaleX: 1,
                    ease: "none",
                    scrollTrigger: {
                        trigger: rootRef.current,
                        start: "top top",
                        end: "bottom bottom",
                        scrub: 0.12,
                    },
                });
            }

            /**
             * HERO
             */
            const heroTl = gsap.timeline({
                defaults: { ease: "power4.out" },
            });

            heroTl
                .from(".hero-kicker", {
                    y: 16,
                    opacity: 0,
                    duration: 0.45,
                })
                .from(
                    ".hero-title-word",
                    {
                        y: 80,
                        opacity: 0,
                        rotate: 2,
                        duration: 0.85,
                        stagger: 0.08,
                    },
                    "-=0.12"
                )
                .from(
                    ".hero-copy",
                    {
                        y: 28,
                        opacity: 0,
                        filter: "blur(8px)",
                        duration: 0.6,
                    },
                    "-=0.36"
                )
                .from(
                    ".hero-action",
                    {
                        y: 20,
                        opacity: 0,
                        scale: 0.95,
                        duration: 0.45,
                        stagger: 0.06,
                    },
                    "-=0.35"
                )
                .from(
                    ".hero-stage",
                    {
                        scale: 0.86,
                        opacity: 0,
                        rotate: 4,
                        duration: 1,
                    },
                    "-=0.8"
                )
                .from(
                    ".hero-float",
                    {
                        y: 30,
                        opacity: 0,
                        scale: 0.88,
                        duration: 0.5,
                        stagger: 0.08,
                    },
                    "-=0.6"
                );

            gsap.to(".hero-ring-a", {
                rotate: 360,
                repeat: -1,
                duration: 18,
                ease: "none",
            });

            gsap.to(".hero-ring-b", {
                rotate: -360,
                repeat: -1,
                duration: 27,
                ease: "none",
            });

            gsap.to(".hero-core", {
                scale: 1.04,
                rotate: 5,
                repeat: -1,
                yoyo: true,
                duration: 2.5,
                ease: "sine.inOut",
            });

            gsap.to(".hero-float-a", {
                y: -16,
                rotate: -3,
                repeat: -1,
                yoyo: true,
                duration: 2.8,
                ease: "sine.inOut",
            });

            gsap.to(".hero-float-b", {
                y: 13,
                x: 7,
                rotate: 2,
                repeat: -1,
                yoyo: true,
                duration: 3.2,
                ease: "sine.inOut",
            });

            gsap.to(".hero-float-c", {
                y: -10,
                x: -6,
                repeat: -1,
                yoyo: true,
                duration: 2.4,
                ease: "sine.inOut",
            });

            if (heroRef.current) {
                const hero = heroRef.current;

                const moveA = gsap.quickTo(".hero-depth-a", "x", {
                    duration: 0.8,
                    ease: "power3.out",
                });
                const moveAY = gsap.quickTo(".hero-depth-a", "y", {
                    duration: 0.8,
                    ease: "power3.out",
                });
                const moveB = gsap.quickTo(".hero-depth-b", "x", {
                    duration: 1,
                    ease: "power3.out",
                });
                const moveBY = gsap.quickTo(".hero-depth-b", "y", {
                    duration: 1,
                    ease: "power3.out",
                });

                const pointer = (event: PointerEvent) => {
                    const rect = hero.getBoundingClientRect();
                    const px = (event.clientX - rect.left) / rect.width - 0.5;
                    const py = (event.clientY - rect.top) / rect.height - 0.5;

                    moveA(px * 32);
                    moveAY(py * 24);
                    moveB(px * -20);
                    moveBY(py * -16);
                };

                hero.addEventListener("pointermove", pointer);

                (hero as HTMLElement & { __cleanup?: () => void }).__cleanup =
                    () => hero.removeEventListener("pointermove", pointer);

                gsap.to(".hero-content", {
                    yPercent: 12,
                    opacity: 0.15,
                    filter: "blur(8px)",
                    ease: "none",
                    scrollTrigger: {
                        trigger: hero,
                        start: "top top",
                        end: "bottom 18%",
                        scrub: 0.7,
                    },
                });

                gsap.to(".hero-stage", {
                    yPercent: 10,
                    ease: "none",
                    scrollTrigger: {
                        trigger: hero,
                        start: "top top",
                        end: "bottom top",
                        scrub: 1,
                        invalidateOnRefresh: true,
                    },
                });
            }

            /**
             * MARQUEE
             */
            gsap.to(".marquee-track", {
                xPercent: -28,
                ease: "none",
                scrollTrigger: {
                    trigger: ".marquee-section",
                    start: "top bottom",
                    end: "bottom top",
                    scrub: 0.45,
                },
            });

            /**
             * MANIFESTO — every word moves
             */
            if (manifestoRef.current) {
                const words =
                    gsap.utils.toArray<HTMLElement>(".manifesto-word");

                words.forEach((word, index) => {
                    gsap.fromTo(
                        word,
                        {
                            xPercent: index % 2 === 0 ? -35 : 35,
                            opacity: 0.08,
                            rotate: index % 2 === 0 ? -2 : 2,
                        },
                        {
                            xPercent: 0,
                            opacity: 1,
                            rotate: 0,
                            ease: "none",
                            scrollTrigger: {
                                trigger: word,
                                start: "top 92%",
                                end: "top 42%",
                                scrub: 0.65,
                            },
                        }
                    );
                });

                gsap.to(".manifesto-orbit", {
                    rotate: 220,
                    scale: 1.15,
                    ease: "none",
                    scrollTrigger: {
                        trigger: manifestoRef.current,
                        start: "top bottom",
                        end: "bottom top",
                        scrub: 0.8,
                    },
                });
            }

            /**
             * GENERIC SECTION MOTION
             */
            gsap.utils
                .toArray<HTMLElement>(".motion-section")
                .forEach((section) => {
                    section
                        .querySelectorAll<HTMLElement>(".motion-label")
                        .forEach((element) => {
                            gsap.from(element, {
                                x: -28,
                                opacity: 0,
                                letterSpacing: "0.32em",
                                duration: 0.62,
                                ease: "power3.out",
                                scrollTrigger: {
                                    trigger: element,
                                    start: "top 90%",
                                    toggleActions:
                                        "play none none reverse",
                                },
                            });
                        });

                    section
                        .querySelectorAll<HTMLElement>(".motion-title")
                        .forEach((element) => {
                            gsap.from(element, {
                                y: 54,
                                opacity: 0,
                                rotate: 1.5,
                                filter: "blur(8px)",
                                duration: 0.8,
                                ease: "power4.out",
                                scrollTrigger: {
                                    trigger: element,
                                    start: "top 88%",
                                    toggleActions:
                                        "play none none reverse",
                                },
                            });
                        });

                    section
                        .querySelectorAll<HTMLElement>(".motion-copy")
                        .forEach((element) => {
                            gsap.from(element, {
                                y: 30,
                                opacity: 0,
                                filter: "blur(6px)",
                                duration: 0.68,
                                ease: "power3.out",
                                scrollTrigger: {
                                    trigger: element,
                                    start: "top 92%",
                                    toggleActions:
                                        "play none none reverse",
                                },
                            });
                        });

                    section
                        .querySelectorAll<HTMLElement>(".motion-card")
                        .forEach((element, index) => {
                            gsap.from(element, {
                                y: 84,
                                rotateX: 10,
                                rotateZ: index % 2 === 0 ? -2 : 2,
                                scale: 0.92,
                                opacity: 0,
                                transformPerspective: 1100,
                                duration: 0.82,
                                ease: "back.out(1.18)",
                                scrollTrigger: {
                                    trigger: element,
                                    start: "top 92%",
                                    toggleActions:
                                        "play none none reverse",
                                },
                            });
                        });

                    section
                        .querySelectorAll<HTMLElement>(".motion-code")
                        .forEach((element) => {
                            gsap.from(element, {
                                x: 48,
                                opacity: 0,
                                clipPath: "inset(0 0 0 18%)",
                                duration: 0.78,
                                ease: "power3.out",
                                scrollTrigger: {
                                    trigger: element,
                                    start: "top 90%",
                                    toggleActions:
                                        "play none none reverse",
                                },
                            });
                        });
                });

            /**
             * CINEMATIC STORY
             */
            if (storyRef.current) {
                const storyTl = gsap.timeline({
                    scrollTrigger: {
                        trigger: storyRef.current,
                        start: "top top",
                        end: "+=3400",
                        pin: ".story-pin",
                        scrub: 0.65,
                        anticipatePin: 1,
                    },
                });

                storyTl
                    .to(".story-blob", {
                        xPercent: 42,
                        yPercent: -17,
                        rotate: 96,
                        scale: 1.17,
                        borderRadius:
                            "30% 70% 58% 42% / 56% 32% 68% 44%",
                        duration: 1,
                    })
                    .to(
                        ".story-ring",
                        {
                            rotate: 190,
                            scale: 1.2,
                            duration: 1,
                        },
                        "<"
                    )
                    .to(
                        ".story-step-1",
                        {
                            y: -34,
                            opacity: 0.08,
                            filter: "blur(7px)",
                            duration: 0.5,
                        },
                        "<0.08"
                    )
                    .fromTo(
                        ".story-step-2",
                        {
                            y: 64,
                            opacity: 0.08,
                            filter: "blur(7px)",
                        },
                        {
                            y: 0,
                            opacity: 1,
                            filter: "blur(0px)",
                            duration: 0.62,
                        },
                        "<"
                    )
                    .to(".story-blob", {
                        xPercent: -28,
                        yPercent: 30,
                        rotate: 188,
                        scale: 0.98,
                        borderRadius:
                            "72% 28% 36% 64% / 38% 72% 28% 62%",
                        duration: 1,
                    })
                    .to(
                        ".story-ring",
                        {
                            rotate: 375,
                            scale: 0.84,
                            duration: 1,
                        },
                        "<"
                    )
                    .to(
                        ".story-step-2",
                        {
                            y: -34,
                            opacity: 0.08,
                            filter: "blur(7px)",
                            duration: 0.5,
                        },
                        "<0.08"
                    )
                    .fromTo(
                        ".story-step-3",
                        {
                            y: 64,
                            opacity: 0.08,
                            filter: "blur(7px)",
                        },
                        {
                            y: 0,
                            opacity: 1,
                            filter: "blur(0px)",
                            duration: 0.62,
                        },
                        "<"
                    )
                    .to(
                        ".story-blob",
                        {
                            xPercent: 11,
                            yPercent: -9,
                            rotate: 304,
                            scale: 0.84,
                            borderRadius:
                                "66% 34% 30% 70% / 40% 68% 32% 60%",
                            duration: 1,
                        },
                        "<0.08"
                    )
                    .to(
                        ".story-ring",
                        {
                            rotate: 560,
                            scale: 1.28,
                            duration: 1,
                        },
                        "<"
                    );
            }

            /**
             * HORIZONTAL API
             */
            if (horizontalRef.current && horizontalTrackRef.current) {
                const section = horizontalRef.current;
                const track = horizontalTrackRef.current;

                const getDistance = () =>
                    Math.max(0, track.scrollWidth - section.clientWidth);

                const horizontalTween = gsap.to(track, {
                    x: () => -getDistance(),
                    ease: "none",
                    scrollTrigger: {
                        trigger: section,
                        start: "top top",
                        end: () =>
                            `+=${getDistance() + window.innerHeight}`,
                        pin: true,
                        scrub: 0.55,
                        invalidateOnRefresh: true,
                    },
                });

                gsap.utils
                    .toArray<HTMLElement>(".api-panel")
                    .forEach((panel) => {
                        gsap.fromTo(
                            panel,
                            {
                                rotateY: 14,
                                scale: 0.9,
                                opacity: 0.7,
                                transformPerspective: 1200,
                            },
                            {
                                rotateY: -7,
                                scale: 1,
                                opacity: 1,
                                ease: "none",
                                scrollTrigger: {
                                    trigger: panel,
                                    containerAnimation: horizontalTween,
                                    start: "left 94%",
                                    end: "right 18%",
                                    scrub: true,
                                },
                            }
                        );
                    });
            }

            /**
             * CODE CARDS — cinematic reveal + inner parallax + hover tilt
             */
            const codeCards = gsap.utils.toArray<HTMLElement>(".code-panel");

            codeCards.forEach((card, index) => {
                const direction = index % 2 === 0 ? -1 : 1;
                const shell = card.querySelector<HTMLElement>(".code-shell");
                const meta = card.querySelector<HTMLElement>(".code-meta");
                const scan = card.querySelector<HTMLElement>(".code-scan");
                const glow = card.querySelector<HTMLElement>(".code-glow");

                const tl = gsap.timeline({
                    scrollTrigger: {
                        trigger: card,
                        start: "top 92%",
                        toggleActions: "play none none reverse",
                    },
                });

                tl.fromTo(
                    card,
                    {
                        y: 110,
                        x: direction * 36,
                        rotateX: 14,
                        rotateY: direction * 8,
                        rotateZ: direction * 1.6,
                        scale: 0.88,
                        opacity: 0,
                        transformPerspective: 1200,
                        transformOrigin: "50% 100%",
                    },
                    {
                        y: 0,
                        x: 0,
                        rotateX: 0,
                        rotateY: 0,
                        rotateZ: 0,
                        scale: 1,
                        opacity: 1,
                        duration: 0.92,
                        ease: "power4.out",
                    }
                );

                if (meta) {
                    tl.from(
                        meta,
                        {
                            y: 18,
                            opacity: 0,
                            duration: 0.42,
                            ease: "power3.out",
                        },
                        "-=0.5"
                    );
                }

                if (shell) {
                    tl.fromTo(
                        shell,
                        {
                            y: 54,
                            opacity: 0,
                            clipPath: "inset(14% 6% 14% 6% round 24px)",
                        },
                        {
                            y: 0,
                            opacity: 1,
                            clipPath: "inset(0% 0% 0% 0% round 22px)",
                            duration: 0.72,
                            ease: "power4.out",
                        },
                        "-=0.34"
                    );
                }

                if (scan) {
                    gsap.fromTo(
                        scan,
                        { yPercent: -140, opacity: 0 },
                        {
                            yPercent: 760,
                            opacity: 0.28,
                            duration: 2.3,
                            repeat: -1,
                            repeatDelay: 1.8 + index * 0.35,
                            ease: "none",
                        }
                    );
                }

                if (glow) {
                    gsap.to(glow, {
                        xPercent: index % 2 === 0 ? 20 : -20,
                        yPercent: index % 2 === 0 ? -12 : 12,
                        scale: 1.18,
                        repeat: -1,
                        yoyo: true,
                        duration: 4 + index * 0.35,
                        ease: "sine.inOut",
                    });
                }

                // subtle pointer tilt — desktop pointer only
                const rotateXTo = gsap.quickTo(card, "rotateX", {
                    duration: 0.45,
                    ease: "power3.out",
                });
                const rotateYTo = gsap.quickTo(card, "rotateY", {
                    duration: 0.45,
                    ease: "power3.out",
                });
                const scaleTo = gsap.quickTo(card, "scale", {
                    duration: 0.35,
                    ease: "power3.out",
                });

                const onMove = (event: PointerEvent) => {
                    if (window.matchMedia("(pointer: coarse)").matches) return;

                    const rect = card.getBoundingClientRect();
                    const px = (event.clientX - rect.left) / rect.width - 0.5;
                    const py = (event.clientY - rect.top) / rect.height - 0.5;

                    rotateYTo(px * 5.5);
                    rotateXTo(py * -5);
                    scaleTo(1.012);

                    if (shell) {
                        gsap.to(shell, {
                            x: px * 8,
                            y: py * 7,
                            duration: 0.45,
                            ease: "power3.out",
                            overwrite: "auto",
                        });
                    }
                };

                const onLeave = () => {
                    rotateXTo(0);
                    rotateYTo(0);
                    scaleTo(1);

                    if (shell) {
                        gsap.to(shell, {
                            x: 0,
                            y: 0,
                            duration: 0.55,
                            ease: "power3.out",
                            overwrite: "auto",
                        });
                    }
                };

                card.addEventListener("pointermove", onMove);
                card.addEventListener("pointerleave", onLeave);

                (
                    card as HTMLElement & {
                        __codeCleanup?: () => void;
                    }
                ).__codeCleanup = () => {
                    card.removeEventListener("pointermove", onMove);
                    card.removeEventListener("pointerleave", onLeave);
                };
            });

            /**
             * PLUGIN GRID
             */
            gsap.utils
                .toArray<HTMLElement>(".plugin-card")
                .forEach((card, index) => {
                    gsap.to(card, {
                        y: index % 2 === 0 ? -18 : 18,
                        ease: "none",
                        scrollTrigger: {
                            trigger: card,
                            start: "top bottom",
                            end: "bottom top",
                            scrub: 1,
                        },
                    });
                });

            /**
             * CTA
             */
            gsap.from(".cta-line", {
                y: 70,
                opacity: 0,
                rotate: 2,
                stagger: 0.08,
                duration: 0.75,
                ease: "power4.out",
                scrollTrigger: {
                    trigger: ".cta-panel",
                    start: "top 84%",
                    toggleActions: "play none none reverse",
                },
            });

            ScrollTrigger.refresh();
        }, rootRef);

        return () => {
            const hero = heroRef.current as
                | (HTMLElement & { __cleanup?: () => void })
                | null;
            hero?.__cleanup?.();

            gsap.utils
                .toArray<HTMLElement>(".code-panel")
                .forEach((card) => {
                    (
                        card as HTMLElement & {
                            __codeCleanup?: () => void;
                        }
                    ).__codeCleanup?.();
                });

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
            onComplete: () => setPlaying(false),
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
            className="min-h-screen overflow-x-hidden bg-[#f3f3ee] text-[#11120f]"
        >
            <div className="pointer-events-none fixed left-0 top-16 z-[90] h-[2px] w-full bg-black/[0.04]">
                <div
                    ref={progressRef}
                    className="h-full w-full origin-left bg-[#aaff57]"
                />
            </div>

            <main>
                {/* HERO */}
                <section
                    ref={heroRef}
                    className="relative min-h-[calc(100vh-4rem)] overflow-hidden border-b border-black/[0.07] bg-[#f1f1eb]"
                >
                    <div className="pointer-events-none absolute inset-0">
                        <div className="hero-depth-a absolute -left-[220px] -top-[240px] h-[640px] w-[640px] rounded-full bg-[#dfff84]/42 blur-[120px]" />
                        <div className="hero-depth-b absolute -right-[190px] top-[3%] h-[610px] w-[610px] rounded-full bg-[#d7c4ff]/50 blur-[120px]" />
                        <div className="absolute bottom-[-300px] left-[34%] h-[650px] w-[650px] rounded-full bg-[#9feaff]/34 blur-[125px]" />

                        <div
                            className="absolute inset-0 opacity-[0.055]"
                            style={{
                                backgroundImage:
                                    "linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)",
                                backgroundSize: "48px 48px",
                            }}
                        />
                    </div>

                    <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-[1540px] gap-8 px-5 py-8 md:px-8 lg:grid-cols-[1.05fr_.95fr] lg:px-10">
                        <div className="hero-content flex min-w-0 flex-col justify-between py-4 lg:py-8">
                            <div className="hero-kicker flex flex-wrap items-center justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center gap-2 rounded-full bg-[#11120f] px-3.5 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-white">
                                        <span className="h-1.5 w-1.5 rounded-full bg-[#aaff57] shadow-[0_0_14px_#aaff57]" />
                                        GSAP Motion Lab
                                    </span>
                                    <span className="rounded-full border border-black/10 bg-white/65 px-3.5 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-black/40 backdrop-blur">
                                        Kinetic Studio
                                    </span>
                                </div>

                                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-black/28">
                                    001—∞
                                </span>
                            </div>

                            <div className="my-8 lg:my-4">
                                <h1 className="hero-title-word block text-[clamp(4.6rem,10.6vw,10rem)] font-black leading-[0.88] tracking-[-0.085em] text-[#11120f]">
                                    MOTION
                                </h1>

                                <div className="mt-1 flex items-end gap-4 sm:gap-6">
                                    <h1 className="hero-title-word block text-[clamp(4.6rem,10.6vw,10rem)] font-black leading-[0.88] tracking-[-0.085em] text-transparent [-webkit-text-stroke:2px_#11120f]">
                                        FEELS
                                    </h1>

                                    <div className="mb-[0.22em] flex-1 border-b border-black/15 pb-3">
                                        <div className="max-w-[320px] text-[10px] font-black uppercase leading-5 tracking-[0.14em] text-black/34">
                                            Code makes it move.
                                            <br />
                                            Rhythm makes it memorable.
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-1 flex items-center gap-5">
                                    <h1 className="hero-title-word block text-[clamp(4.6rem,10.6vw,10rem)] font-black leading-[0.88] tracking-[-0.085em] text-[#11120f]">
                                        ALIVE.
                                    </h1>

                                    <div className="hidden h-[84px] w-[84px] shrink-0 items-center justify-center rounded-full bg-[#aaff57] sm:flex">
                                        <ArrowDown className="h-5 w-5" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid max-w-[760px] gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
                                <p className="hero-copy max-w-xl text-sm font-medium leading-7 text-black/46 md:text-[15px]">
                                    Tween 控制动作，Timeline 编排节奏，ScrollTrigger
                                    把滚动变成时间。这个页面不是在“介绍 GSAP”，而是在用
                                    GSAP 本身说话。
                                </p>

                                <div className="flex flex-wrap gap-2">
                                    <a
                                        href="#scroll-story"
                                        className="hero-action group inline-flex h-11 items-center gap-2 rounded-full bg-[#11120f] px-5 text-xs font-black text-white transition hover:-translate-y-0.5"
                                    >
                                        <CirclePlay className="h-4 w-4" />
                                        看滚动叙事
                                        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                    </a>

                                    <a
                                        href="#playground"
                                        className="hero-action inline-flex h-11 items-center gap-2 rounded-full border border-black/10 bg-white/70 px-5 text-xs font-black backdrop-blur transition hover:-translate-y-0.5"
                                    >
                                        Playground
                                        <ArrowRight className="h-4 w-4" />
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div className="hero-stage relative mx-auto h-[430px] w-full max-w-[650px] self-center sm:h-[540px] lg:h-[650px]">
                            <div className="hero-depth-b absolute left-[8%] top-[9%] h-[73%] w-[72%] rotate-[8deg] rounded-[34%_66%_58%_42%/46%_34%_66%_54%] bg-[#d7c4ff]" />
                            <div className="hero-depth-a absolute bottom-[5%] left-[-1%] h-[62%] w-[77%] -rotate-[12deg] rounded-[58%_42%_36%_64%/58%_40%_60%_42%] bg-[#9feaff] mix-blend-multiply" />
                            <div className="absolute right-[-2%] top-[17%] h-[61%] w-[61%] rotate-[13deg] rounded-[38%_62%_70%_30%/61%_34%_66%_39%] bg-[#dfff84] mix-blend-multiply" />

                            <div className="hero-ring-a absolute left-1/2 top-1/2 h-[74%] w-[74%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/18">
                                <span className="absolute left-1/2 top-[-6px] h-3 w-3 rounded-full bg-[#11120f]" />
                                <span className="absolute bottom-[12%] right-[2%] h-2.5 w-2.5 rounded-full bg-[#aaff57]" />
                            </div>

                            <div className="hero-ring-b absolute left-1/2 top-1/2 h-[50%] w-[50%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-black/18">
                                <span className="absolute left-[15%] top-[2%] h-2 w-2 rounded-full bg-black/70" />
                            </div>

                            <div className="hero-core absolute left-1/2 top-1/2 flex h-[175px] w-[175px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[48px] bg-[#11120f] shadow-[0_45px_100px_-38px_rgba(0,0,0,.65)] sm:h-[215px] sm:w-[215px]">
                                <div className="text-center">
                                    <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/25">
                                        Motion engine
                                    </div>
                                    <div className="mt-2 text-[52px] font-black tracking-[-0.09em] text-[#aaff57] sm:text-[66px]">
                                        GSAP
                                    </div>
                                </div>
                            </div>

                            <div className="hero-float hero-float-a absolute left-[0%] top-[13%] -rotate-5 rounded-2xl border border-black/[0.08] bg-white/90 px-4 py-3 shadow-[0_24px_60px_-30px_rgba(0,0,0,.38)] backdrop-blur-xl">
                                <div className="font-mono text-[9px] font-black uppercase tracking-[0.16em] text-black/30">
                                    ScrollTrigger
                                </div>
                                <div className="mt-1 font-mono text-sm font-black">
                                    scrub: 0.55
                                </div>
                            </div>

                            <div className="hero-float hero-float-b absolute bottom-[13%] right-[0%] rotate-4 rounded-2xl border border-black/[0.08] bg-[#11120f] px-4 py-3 text-white shadow-[0_24px_60px_-30px_rgba(0,0,0,.52)]">
                                <div className="flex items-center gap-2 text-sm font-black">
                                    <Gauge className="h-4 w-4 text-[#aaff57]" />
                                    60 FPS
                                </div>
                                <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-white/35">
                                    motion budget
                                </div>
                            </div>

                            <div className="hero-float hero-float-c absolute right-[3%] top-[6%] rounded-full bg-[#aaff57] px-4 py-2 font-mono text-[10px] font-black text-black shadow-xl">
                                timeline()
                            </div>

                            <div className="absolute bottom-[4%] left-[7%] font-mono text-[9px] uppercase tracking-[0.18em] text-black/28">
                                x: 240 · rotate: 360 · ease: power4.out
                            </div>
                        </div>
                    </div>
                </section>

                {/* MARQUEE */}
                <section className="marquee-section overflow-hidden border-y border-white/10 bg-[#11120f] py-6 text-white">
                    <div className="marquee-track flex w-max items-center gap-8 whitespace-nowrap px-5">
                        {marqueeItems.map((item, index) => (
                            <div
                                key={`${item}-${index}`}
                                className="flex items-center gap-8"
                            >
                                <span className="text-4xl font-black tracking-[-0.05em] text-white/[0.16] md:text-6xl">
                                    {item}
                                </span>
                                <span className="h-3 w-3 rounded-full bg-[#aaff57] shadow-[0_0_20px_#aaff57]" />
                            </div>
                        ))}
                    </div>
                </section>

                {/* MANIFESTO */}
                <section
                    ref={manifestoRef}
                    className="relative overflow-hidden bg-[#f3f3ee] px-5 py-24 md:px-8 lg:py-36"
                >
                    <div className="manifesto-orbit pointer-events-none absolute right-[-160px] top-[8%] h-[480px] w-[480px] rounded-full border border-black/[0.08]">
                        <span className="absolute left-[13%] top-[8%] h-3 w-3 rounded-full bg-[#aaff57]" />
                    </div>

                    <div className="mx-auto max-w-[1380px]">
                        <div className="mb-8 text-[9px] font-black uppercase tracking-[0.2em] text-black/30">
                            01 / Motion manifesto
                        </div>

                        <div className="space-y-1">
                            {[
                                "EVERY",
                                "WORD",
                                "EVERY",
                                "CARD",
                                "EVERY",
                                "SCROLL",
                                "HAS",
                                "A RHYTHM.",
                            ].map((word, index) => (
                                <div
                                    key={`${word}-${index}`}
                                    className={`manifesto-word text-[clamp(3.8rem,9vw,9.2rem)] font-black leading-[0.82] tracking-[-0.075em] ${
                                        index === 1 || index === 5
                                            ? "ml-[8vw] text-transparent [-webkit-text-stroke:2px_#11120f]"
                                            : ""
                                    } ${
                                        index === 7
                                            ? "inline-block rounded-[24px] bg-[#dfff84] px-4 py-2"
                                            : ""
                                    }`}
                                >
                                    {word}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CINEMATIC STORY */}
                <section
                    id="scroll-story"
                    ref={storyRef}
                    className="relative bg-[#11120f] text-white"
                >
                    <div className="story-pin relative min-h-screen overflow-hidden">
                        <div
                            className="pointer-events-none absolute inset-0 opacity-[0.07]"
                            style={{
                                backgroundImage:
                                    "linear-gradient(rgba(255,255,255,.45) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.45) 1px, transparent 1px)",
                                backgroundSize: "64px 64px",
                            }}
                        />

                        <div className="absolute -left-[150px] top-[30%] h-[420px] w-[420px] rounded-full bg-[#7ce7ff]/10 blur-[120px]" />
                        <div className="absolute -right-[130px] top-[10%] h-[450px] w-[450px] rounded-full bg-[#b8ff68]/10 blur-[120px]" />

                        <div className="relative mx-auto grid min-h-screen max-w-[1440px] items-center gap-14 px-5 py-20 md:px-8 lg:grid-cols-[.86fr_1.14fr] lg:px-10">
                            <div>
                                <div className="mb-5 flex items-center gap-2 text-[10px] font-black tracking-[0.2em] text-[#aaff61]">
                                    <span className="h-2 w-2 rounded-full bg-[#aaff61] shadow-[0_0_18px_#aaff61]" />
                                    SCROLLTRIGGER LIVE
                                </div>

                                <h2 className="max-w-xl text-5xl font-black leading-[0.9] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
                                    Scroll is
                                    <br />
                                    not distance.
                                    <br />
                                    It is time.
                                </h2>

                                <div className="mt-12 max-w-lg space-y-10">
                                    <div className="story-step-1">
                                        <div className="text-[9px] font-black tracking-[0.2em] text-[#8ee9ff]">
                                            01 / TRIGGER
                                        </div>
                                        <h3 className="mt-2 text-2xl font-black tracking-[-0.03em]">
                                            元素进入视口，
                                            <br />
                                            故事开始。
                                        </h3>
                                        <p className="mt-2 text-sm leading-6 text-white/40">
                                            trigger、start、end
                                            决定一段滚动动画从哪里发生、在哪里结束。
                                        </p>
                                    </div>

                                    <div className="story-step-2 opacity-[0.08]">
                                        <div className="text-[9px] font-black tracking-[0.2em] text-[#c8afff]">
                                            02 / SCRUB
                                        </div>
                                        <h3 className="mt-2 text-2xl font-black tracking-[-0.03em]">
                                            滚多少，
                                            <br />
                                            动画走多少。
                                        </h3>
                                        <p className="mt-2 text-sm leading-6 text-white/40">
                                            scrub 把 Timeline
                                            的进度和当前滚动位置绑定起来。
                                        </p>
                                    </div>

                                    <div className="story-step-3 opacity-[0.08]">
                                        <div className="text-[9px] font-black tracking-[0.2em] text-[#baff68]">
                                            03 / PIN
                                        </div>
                                        <h3 className="mt-2 text-2xl font-black tracking-[-0.03em]">
                                            页面在滚，
                                            <br />
                                            场景不走。
                                        </h3>
                                        <p className="mt-2 text-sm leading-6 text-white/40">
                                            pin 把一个视觉场景固定下来，让内部叙事继续前进。
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="relative mx-auto h-[440px] w-full max-w-[650px] sm:h-[540px]">
                                <div className="story-ring absolute left-1/2 top-1/2 h-[330px] w-[330px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/20 sm:h-[450px] sm:w-[450px]">
                                    <span className="absolute left-1/2 top-[-7px] h-3.5 w-3.5 rounded-full bg-[#aaff61] shadow-[0_0_28px_#aaff61]" />
                                </div>

                                <div className="story-blob absolute left-[16%] top-[14%] h-[68%] w-[67%] -rotate-12 rounded-[58%_42%_66%_34%/40%_62%_38%_60%] bg-gradient-to-br from-[#c3a7ff] via-[#8deaff] to-[#b8ff68]" />

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

                {/* HORIZONTAL API */}
                <section
                    ref={horizontalRef}
                    className="relative min-h-screen overflow-hidden bg-[#f3f3ee]"
                >
                    <div className="absolute left-5 top-6 z-20 md:left-8 md:top-8">
                        <div className="text-[9px] font-black tracking-[0.2em] text-black/30">
                            02 / CORE API
                        </div>
                        <p className="mt-1 text-xs font-bold text-black/40">
                            继续向下滚动 →
                        </p>
                    </div>

                    <div
                        ref={horizontalTrackRef}
                        className="flex h-screen w-max items-center gap-5 px-[5vw] pt-12"
                    >
                        <article className="api-panel flex h-[68vh] w-[84vw] max-w-[900px] shrink-0 flex-col justify-end rounded-[48px] bg-[#11120f] p-8 text-white shadow-[0_40px_100px_-55px_rgba(0,0,0,.45)] sm:p-10">
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
                                className={`api-panel ${item.color} flex h-[68vh] w-[78vw] max-w-[700px] shrink-0 flex-col justify-between rounded-[48px] p-8 shadow-[0_40px_100px_-58px_rgba(0,0,0,.24)] sm:p-10`}
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

                        <article className="api-panel flex h-[68vh] w-[65vw] max-w-[620px] shrink-0 items-center justify-center rounded-[48px] border border-black/10 bg-white p-8">
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

                {/* PLAYGROUND */}
                <section
                    id="playground"
                    className="motion-section relative overflow-hidden bg-white px-5 py-28 md:px-8 lg:py-36"
                >
                    <div className="pointer-events-none absolute left-[-200px] top-[20%] h-[500px] w-[500px] rounded-full bg-[#dfff91]/30 blur-[110px]" />
                    <div className="pointer-events-none absolute right-[-200px] top-[10%] h-[500px] w-[500px] rounded-full bg-[#d8c5ff]/30 blur-[110px]" />

                    <div className="relative mx-auto max-w-[1280px]">
                        <div className="mb-14">
                            <div className="motion-label mb-4 text-[9px] font-black tracking-[0.2em] text-black/30">
                                03 / INTERACTIVE PLAYGROUND
                            </div>

                            <h2 className="motion-title max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
                                别只看代码，
                                <br />
                                <span className="inline-block rotate-[-1deg] rounded-[20px] bg-[#e7ff9c] px-4 py-2">
                                    让它动起来
                                </span>
                            </h2>

                            <p className="motion-copy mt-6 max-w-xl text-sm font-medium leading-7 text-black/45">
                                修改 Tween 参数，然后执行真正的 GSAP 动画。你可以直接感受
                                duration、distance、rotation 和 ease 的差异。
                            </p>
                        </div>

                        <div className="motion-card grid overflow-hidden rounded-[36px] border border-black/[0.08] bg-[#fafaf7] shadow-[0_30px_100px_rgba(0,0,0,.07)] lg:grid-cols-[.82fr_1.18fr]">
                            <div className="border-b border-black/[0.07] p-6 lg:border-b-0 lg:border-r md:p-8">
                                <div className="mb-8 flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-black">
                                            Animation controls
                                        </div>
                                        <div className="mt-1 text-xs font-medium text-black/35">
                                            修改参数并运行 Tween
                                        </div>
                                    </div>

                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#aaff57]">
                                        <WandSparkles className="h-4 w-4" />
                                    </div>
                                </div>

                                <div className="space-y-7">
                                    <Control
                                        label="Duration"
                                        value={`${duration.toFixed(1)}s`}
                                    >
                                        <input
                                            type="range"
                                            min={0.2}
                                            max={3}
                                            step={0.1}
                                            value={duration}
                                            onChange={(event) =>
                                                setDuration(
                                                    Number(event.target.value)
                                                )
                                            }
                                            className="w-full accent-black"
                                        />
                                    </Control>

                                    <Control
                                        label="Distance"
                                        value={`${distance}px`}
                                    >
                                        <input
                                            type="range"
                                            min={30}
                                            max={200}
                                            step={10}
                                            value={distance}
                                            onChange={(event) =>
                                                setDistance(
                                                    Number(event.target.value)
                                                )
                                            }
                                            className="w-full accent-black"
                                        />
                                    </Control>

                                    <Control
                                        label="Rotation"
                                        value={`${rotation}°`}
                                    >
                                        <input
                                            type="range"
                                            min={0}
                                            max={720}
                                            step={45}
                                            value={rotation}
                                            onChange={(event) =>
                                                setRotation(
                                                    Number(event.target.value)
                                                )
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
                                            onChange={(event) =>
                                                setEase(event.target.value)
                                            }
                                            className="h-11 w-full rounded-xl border border-black/[0.08] bg-white px-3 text-sm font-bold outline-none transition focus:border-black/30"
                                        >
                                            {easeOptions.map((item) => (
                                                <option
                                                    key={item}
                                                    value={item}
                                                >
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
                                            className={`h-2 w-2 rounded-full ${
                                                playing
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

                {/* NEXTJS */}
                <section className="motion-section relative overflow-hidden bg-[#f3f3ee] px-5 py-28 md:px-8 lg:py-40">
                    <div className="mx-auto max-w-[1280px]">
                        <div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr]">
                            <div>
                                <div className="motion-label text-[9px] font-black tracking-[0.2em] text-black/30">
                                    04 / NEXT.JS + TYPESCRIPT
                                </div>
                            </div>

                            <div>
                                <h2 className="motion-title text-5xl font-black leading-[0.95] tracking-[-0.06em] sm:text-6xl">
                                    在 Next.js 里，
                                    <br />
                                    动画也要
                                    <span className="ml-3 inline-block rounded-[18px] bg-[#d7c4ff] px-4 py-2">
                                        正确清理
                                    </span>
                                    。
                                </h2>
                            </div>
                        </div>

                        <div className="pointer-events-none absolute -left-[180px] top-[28%] h-[460px] w-[460px] rounded-full bg-[#dfff84]/18 blur-[110px]" />
                        <div className="pointer-events-none absolute -right-[160px] top-[18%] h-[480px] w-[480px] rounded-full bg-[#d7c4ff]/18 blur-[120px]" />

                        <div className="relative mt-16 grid items-start gap-5 lg:grid-cols-12">
                            <div className="lg:col-span-4">
                                <CodePanel
                                    number="01"
                                    label="安装"
                                    color="bg-[#dfff84]"
                                    code={`npm install gsap`}
                                    language="bash"
                                    variant="compact"
                                />
                            </div>

                            <div className="lg:col-span-8">
                                <CodePanel
                                    number="02"
                                    label="基础 Client Component"
                                    color="bg-[#d7c4ff]"
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

  return <div ref={root}><div className="card">Hello GSAP</div></div>;
}`}
                                />
                            </div>

                            <div className="lg:col-span-12">
                                <CodePanel
                                    number="03"
                                    label="ScrollTrigger"
                                    color="bg-[#9feaff]"
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
    <section ref={root} className="section">
      <div className="box" />
    </section>
  );
}`}
                                    variant="wide"
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

                {/* PLUGINS */}
                <section className="motion-section overflow-hidden bg-white px-5 py-28 md:px-8 lg:py-36">
                    <div className="mx-auto max-w-[1280px]">
                        <div>
                            <div className="motion-label text-[9px] font-black tracking-[0.2em] text-black/30">
                                05 / PLUGIN ECOSYSTEM
                            </div>

                            <h2 className="motion-title mt-4 max-w-5xl text-5xl font-black leading-[0.92] tracking-[-0.065em] sm:text-6xl lg:text-7xl">
                                Core 只是开始，
                                <br />
                                后面的东西才
                                <span className="ml-3 inline-block rotate-2 rounded-[20px] bg-[#ffc7a8] px-4 py-2">
                                    有意思
                                </span>
                                。
                            </h2>
                        </div>

                        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {pluginCards.map((plugin, index) => (
                                <article
                                    key={plugin.name}
                                    className={`motion-card plugin-card ${plugin.color} group min-h-[270px] rounded-[34px] p-7 ${
                                        index === 1
                                            ? "lg:translate-y-12"
                                            : ""
                                    } ${
                                        index === 4
                                            ? "lg:translate-y-8"
                                            : ""
                                    }`}
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

                {/* CTA */}
                <section className="motion-section bg-white px-5 pb-10 pt-20 md:px-8">
                    <div className="mx-auto max-w-[1360px]">
                        <div className="cta-panel relative overflow-hidden rounded-[48px] bg-[#11120f] px-7 py-14 text-white shadow-[0_45px_110px_-55px_rgba(0,0,0,.55)] sm:px-10 md:py-20 lg:px-16">
                            <div className="pointer-events-none absolute -right-[130px] -top-[170px] h-[480px] w-[480px] rounded-full bg-[#b7ff68]/20 blur-[100px]" />
                            <div className="pointer-events-none absolute bottom-[-220px] left-[35%] h-[420px] w-[420px] rounded-full bg-[#b8a1ff]/15 blur-[110px]" />

                            <div className="relative">
                                <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#aaff57] px-3 py-1.5 text-[9px] font-black tracking-[0.15em] text-black">
                                    <Zap className="h-3.5 w-3.5" />
                                    READY TO ANIMATE
                                </div>

                                <h2 className="cta-line max-w-5xl text-5xl font-black leading-[0.9] tracking-[-0.065em] sm:text-6xl lg:text-8xl">
                                    Make the web
                                </h2>
                                <h2 className="cta-line max-w-5xl text-5xl font-black leading-[0.9] tracking-[-0.065em] sm:text-6xl lg:text-8xl">
                                    feel <span className="text-[#aaff57]">alive.</span>
                                </h2>

                                <p className="motion-copy mt-7 max-w-xl text-sm font-medium leading-7 text-white/40">
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
            window.setTimeout(() => setCopied(false), 1400);
        } catch {
            setCopied(false);
        }
    };

    return (
        <div className="code-shell motion-code relative overflow-hidden rounded-[22px] border border-black/[0.07] bg-[#11120f] shadow-[0_28px_70px_-42px_rgba(0,0,0,.72)]">
            <div className="code-scan pointer-events-none absolute left-0 top-0 z-20 h-[14%] w-full bg-gradient-to-b from-transparent via-[#aaff57]/14 to-transparent blur-[1px]" />
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

            <pre className="overflow-x-auto p-4 font-mono text-[11px] leading-6 text-white/65">
                <code>{children}</code>
            </pre>
        </div>
    );
}

function CodePanel({
    number,
    label,
    color,
    code,
    language = "tsx",
    variant = "default",
}: {
    number: string;
    label: string;
    color: string;
    code: string;
    language?: string;
    variant?: "default" | "compact" | "wide";
}) {
    const isCompact = variant === "compact";
    const isWide = variant === "wide";

    return (
        <article
            className={`code-panel ${color} group relative isolate overflow-hidden rounded-[34px] border border-black/[0.055] ${
                isCompact ? "min-h-[290px] p-6 sm:p-7" : "p-6 sm:p-7"
            } ${isWide ? "lg:grid lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-7" : ""}`}
        >
            <div className="code-glow pointer-events-none absolute -right-[18%] -top-[35%] -z-10 h-[320px] w-[320px] rounded-full bg-white/34 blur-[60px]" />
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(115deg,rgba(255,255,255,.18),transparent_42%,rgba(255,255,255,.08))]" />

            <div
                className={`code-meta flex ${
                    isWide
                        ? "mb-7 flex-row items-start justify-between lg:mb-0 lg:flex-col"
                        : "mb-6 items-center justify-between"
                }`}
            >
                <div>
                    <div className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-black/28">
                        {number}
                    </div>
                    {isWide && (
                        <div className="mt-7 hidden lg:block">
                            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-black/25">
                                Production pattern
                            </div>
                            <div className="mt-3 text-4xl font-black leading-[0.92] tracking-[-0.055em]">
                                Scroll
                                <br />
                                becomes
                                <br />
                                time.
                            </div>
                        </div>
                    )}
                </div>

                <span className="rounded-full border border-black/[0.06] bg-white/40 px-3 py-1.5 text-[10px] font-black text-black/48 backdrop-blur">
                    {label}
                </span>
            </div>

            <div className={isCompact ? "mt-12" : ""}>
                <CodeBlock language={language}>{code}</CodeBlock>
            </div>

            {isCompact && (
                <div className="mt-6 flex items-center justify-between border-t border-black/[0.08] pt-4">
                    <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-black/28">
                        package manager
                    </span>
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#11120f] text-white transition-transform duration-300 group-hover:rotate-12 group-hover:scale-105">
                        <ArrowRight className="h-4 w-4" />
                    </span>
                </div>
            )}
        </article>
    );
}


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
        <div className="motion-card group rounded-[22px] border border-black/[0.07] bg-white p-5 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_-36px_rgba(0,0,0,.32)]">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e7ff9c]">
                {icon}
            </div>

            <h3 className="mt-4 text-sm font-black">{title}</h3>
            <p className="mt-2 text-xs font-medium leading-6 text-black/40">
                {description}
            </p>
        </div>
    );
}
