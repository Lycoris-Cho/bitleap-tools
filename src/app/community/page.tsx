'use client'

import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type MouseEvent,
} from 'react'

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

type CategoryFilter =
    | '全部'
    | '经验分享'
    | '前端作品'
    | '小工具'
    | '资源推荐'

type GitHubCategory =
    | 'Experience Sharing'
    | 'Frontend Showcase'
    | 'Small Tools'
    | 'Resource Sharing'

type Post = {
    id: string
    number: number
    title: string
    excerpt: string
    body: string
    category: string
    author: string
    avatar: string
    authorUrl: string
    createdAt: string
    updatedAt: string
    comments: number
    upvotes: number
    url: string
    demoUrl: string
    githubUrl: string
    tech: string
}

type AccentName = 'violet' | 'sky' | 'orange' | 'emerald'

const categories: CategoryFilter[] = [
    '全部',
    '经验分享',
    '前端作品',
    '小工具',
    '资源推荐',
]

const categoryMeta: Record<
    GitHubCategory,
    {
        label: Exclude<CategoryFilter, '全部'>
        english: string
        color: AccentName
    }
> = {
    'Experience Sharing': {
        label: '经验分享',
        english: 'Experience',
        color: 'violet',
    },
    'Frontend Showcase': {
        label: '前端作品',
        english: 'Showcase',
        color: 'sky',
    },
    'Small Tools': {
        label: '小工具',
        english: 'Tools',
        color: 'orange',
    },
    'Resource Sharing': {
        label: '资源推荐',
        english: 'Resources',
        color: 'emerald',
    },
}

const publishCategories = [
    {
        index: '01',
        title: '经验分享',
        english: 'Experience',
        description: '开发实践、踩坑经历、学习过程与产品思考。',
        href: 'https://github.com/Lycoris-Cho/bitleap-tools/discussions/new?category=experience-sharing',
        color: 'violet' as AccentName,
    },
    {
        index: '02',
        title: '前端作品',
        english: 'Showcase',
        description: '分享网站、组件、交互实验和完整前端项目。',
        href: 'https://github.com/Lycoris-Cho/bitleap-tools/discussions/new?category=frontend-showcase',
        color: 'sky' as AccentName,
    },
    {
        index: '03',
        title: '小工具',
        english: 'Tools',
        description: '解决实际问题的小工具、页面和创意项目。',
        href: 'https://github.com/Lycoris-Cho/bitleap-tools/discussions/new?category=small-tools',
        color: 'orange' as AccentName,
    },
    {
        index: '04',
        title: '资源推荐',
        english: 'Resources',
        description: '值得收藏的开源项目、设计资源和开发工具。',
        href: 'https://github.com/Lycoris-Cho/bitleap-tools/discussions/new?category=resource-sharing',
        color: 'emerald' as AccentName,
    },
]

function ArrowIcon({
    className = 'h-4 w-4',
}: {
    className?: string
}) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            className={className}
            aria-hidden="true"
        >
            <path d="M5 12h14" />
            <path d="m13 6 6 6-6 6" />
        </svg>
    )
}

function ArrowUpRightIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            className="h-4 w-4"
            aria-hidden="true"
        >
            <path d="M7 17 17 7" />
            <path d="M7 7h10v10" />
        </svg>
    )
}

function SearchIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            className="h-4 w-4"
            aria-hidden="true"
        >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.4-3.4" />
        </svg>
    )
}

function CloseIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            className="h-5 w-5"
            aria-hidden="true"
        >
            <path d="m6 6 12 12M18 6 6 18" />
        </svg>
    )
}

function HeartIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            className="h-4 w-4"
            aria-hidden="true"
        >
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
        </svg>
    )
}

function MessageIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            className="h-4 w-4"
            aria-hidden="true"
        >
            <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
        </svg>
    )
}

function SparkIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            className="h-5 w-5"
            aria-hidden="true"
        >
            <path d="M12 2c.9 5.5 3.5 8.1 9 9-5.5.9-8.1 3.5-9 9-.9-5.5-3.5-8.1-9-9 5.5-.9 8.1-3.5 9-9Z" />
        </svg>
    )
}

function getAccent(color: AccentName) {
    if (color === 'violet') {
        return {
            dot: 'bg-violet-500',
            text: 'text-violet-600',
            soft: 'bg-violet-50',
            border: 'border-violet-200',
            glow: 'bg-violet-300/30',
            gradient: 'from-violet-50 via-white to-white',
            ring: 'ring-violet-100',
        }
    }

    if (color === 'sky') {
        return {
            dot: 'bg-sky-500',
            text: 'text-sky-600',
            soft: 'bg-sky-50',
            border: 'border-sky-200',
            glow: 'bg-sky-300/30',
            gradient: 'from-sky-50 via-white to-white',
            ring: 'ring-sky-100',
        }
    }

    if (color === 'orange') {
        return {
            dot: 'bg-orange-500',
            text: 'text-orange-600',
            soft: 'bg-orange-50',
            border: 'border-orange-200',
            glow: 'bg-orange-300/30',
            gradient: 'from-orange-50 via-white to-white',
            ring: 'ring-orange-100',
        }
    }

    return {
        dot: 'bg-emerald-500',
        text: 'text-emerald-600',
        soft: 'bg-emerald-50',
        border: 'border-emerald-200',
        glow: 'bg-emerald-300/30',
        gradient: 'from-emerald-50 via-white to-white',
        ring: 'ring-emerald-100',
    }
}

function isGitHubCategory(value: string): value is GitHubCategory {
    return value in categoryMeta
}

function formatDate(value: string) {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return ''

    return new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date)
}

function getTechTags(tech: string) {
    return (tech || '')
        .split(/[,，]/)
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 5)
}

export default function CommunityPage() {
    const rootRef = useRef<HTMLDivElement>(null)

    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)
    const [activeCategory, setActiveCategory] =
        useState<CategoryFilter>('全部')
    const [search, setSearch] = useState('')
    const [sort, setSort] =
        useState<'recommended' | 'latest'>('recommended')
    const [publishOpen, setPublishOpen] = useState(false)

    useEffect(() => {
        let cancelled = false

        async function loadPosts() {
            try {
                const response = await fetch('/data/community.json', {
                    cache: 'no-store',
                })

                if (!response.ok) {
                    throw new Error(
                        `Failed to load community posts: ${response.status}`,
                    )
                }

                const data: Post[] = await response.json()

                if (!cancelled) {
                    setPosts(Array.isArray(data) ? data : [])
                }
            } catch (error) {
                console.error('加载社区内容失败：', error)

                if (!cancelled) {
                    setPosts([])
                }
            } finally {
                if (!cancelled) {
                    setLoading(false)
                }
            }
        }

        loadPosts()

        return () => {
            cancelled = true
        }
    }, [])

    const filteredPosts = useMemo(() => {
        const keyword = search.trim().toLowerCase()

        const result = posts.filter((post) => {
            const meta = isGitHubCategory(post.category)
                ? categoryMeta[post.category]
                : null

            const categoryMatched =
                activeCategory === '全部' ||
                meta?.label === activeCategory

            const searchMatched =
                !keyword ||
                post.title.toLowerCase().includes(keyword) ||
                post.excerpt.toLowerCase().includes(keyword) ||
                post.author.toLowerCase().includes(keyword) ||
                (post.tech || '').toLowerCase().includes(keyword)

            return categoryMatched && searchMatched
        })

        if (sort === 'latest') {
            return [...result].sort(
                (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime(),
            )
        }

        return [...result].sort(
            (a, b) =>
                b.comments +
                b.upvotes -
                (a.comments + a.upvotes),
        )
    }, [posts, activeCategory, search, sort])

    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger)

        const reduceMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ).matches

        if (reduceMotion) return

        const ctx = gsap.context(() => {
            const intro = gsap.timeline({
                defaults: {
                    ease: 'power4.out',
                },
            })

            intro
                .from('.hero-kicker', {
                    opacity: 0,
                    y: 14,
                    duration: 0.5,
                })
                .from(
                    '.hero-line',
                    {
                        yPercent: 108,
                        opacity: 0,
                        rotate: 2,
                        duration: 0.95,
                        stagger: 0.09,
                    },
                    '-=0.18',
                )
                .from(
                    '.hero-copy',
                    {
                        opacity: 0,
                        y: 18,
                        duration: 0.6,
                    },
                    '-=0.48',
                )
                .from(
                    '.hero-action',
                    {
                        opacity: 0,
                        y: 16,
                        scale: 0.97,
                        duration: 0.55,
                    },
                    '-=0.4',
                )
                .from(
                    '.hero-category',
                    {
                        opacity: 0,
                        y: 18,
                        rotate: 2,
                        duration: 0.6,
                        stagger: 0.05,
                    },
                    '-=0.4',
                )

            gsap.to('.orb-a', {
                x: 55,
                y: 35,
                duration: 14,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
            })

            gsap.to('.orb-b', {
                x: -50,
                y: 70,
                duration: 18,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
            })

            gsap.to('.orb-c', {
                x: 36,
                y: -45,
                duration: 21,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
            })

            gsap.to('.hero-orbit-a', {
                rotate: 360,
                duration: 34,
                repeat: -1,
                ease: 'none',
            })

            gsap.to('.hero-orbit-b', {
                rotate: -360,
                duration: 48,
                repeat: -1,
                ease: 'none',
            })

            gsap.utils
                .toArray<HTMLElement>('.reveal')
                .forEach((element) => {
                    gsap.from(element, {
                        y: 34,
                        duration: 0.8,
                        ease: 'power3.out',
                        scrollTrigger: {
                            trigger: element,
                            start: 'top 90%',
                            once: true,
                        },
                    })
                })

            // 帖子卡片只做位移动画，不再用 opacity: 0。
            // 即使 ScrollTrigger 尚未刷新，卡片也始终是完整可见的。
            gsap.utils
                .toArray<HTMLElement>('.post-card')
                .forEach((card, index) => {
                    gsap.from(card, {
                        y: 30,
                        rotate:
                            index % 2 === 0 ? -0.6 : 0.6,
                        duration: 0.75,
                        ease: 'power3.out',
                        scrollTrigger: {
                            trigger: card,
                            start: 'top 94%',
                            once: true,
                        },
                    })
                })

            requestAnimationFrame(() => {
                ScrollTrigger.refresh()
            })
        }, rootRef)

        return () => ctx.revert()
    }, [filteredPosts.length])

    useEffect(() => {
        if (!publishOpen) return

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setPublishOpen(false)
            }
        }

        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [publishOpen])

    const handleCardMove = (
        event: MouseEvent<HTMLElement>,
    ) => {
        if (
            window.innerWidth < 1024 ||
            window.matchMedia('(pointer: coarse)').matches
        ) {
            return
        }

        const card = event.currentTarget
        const rect = card.getBoundingClientRect()
        const x =
            (event.clientX - rect.left) / rect.width - 0.5
        const y =
            (event.clientY - rect.top) / rect.height - 0.5

        gsap.to(card, {
            rotateY: x * 2.2,
            rotateX: y * -2.2,
            x: x * 2,
            y: y * 2,
            transformPerspective: 1200,
            duration: 0.4,
            ease: 'power2.out',
            overwrite: true,
        })

        const glow = card.querySelector(
            '.pointer-glow',
        ) as HTMLElement | null

        if (glow) {
            gsap.to(glow, {
                xPercent: x * 70,
                yPercent: y * 70,
                opacity: 1,
                duration: 0.35,
            })
        }
    }

    const handleCardLeave = (
        event: MouseEvent<HTMLElement>,
    ) => {
        gsap.to(event.currentTarget, {
            rotateX: 0,
            rotateY: 0,
            x: 0,
            y: 0,
            duration: 0.6,
            ease: 'power3.out',
            overwrite: true,
        })

        const glow = event.currentTarget.querySelector(
            '.pointer-glow',
        ) as HTMLElement | null

        if (glow) {
            gsap.to(glow, {
                opacity: 0,
                duration: 0.25,
            })
        }
    }

    return (
        <div
            ref={rootRef}
            className="relative min-h-screen overflow-x-hidden bg-[#f7f7f5] text-[#151515]"
        >
            {/* 背景 */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="orb-a absolute -left-[18rem] -top-[18rem] h-[44rem] w-[44rem] rounded-full bg-violet-200/35 blur-[150px]" />
                <div className="orb-b absolute -right-[16rem] top-[10%] h-[42rem] w-[42rem] rounded-full bg-sky-200/30 blur-[150px]" />
                <div className="orb-c absolute bottom-[-20rem] left-[28%] h-[40rem] w-[40rem] rounded-full bg-orange-200/25 blur-[150px]" />
            </div>

            <main className="relative z-10">
                {/* HERO */}
                <section className="mx-auto max-w-[1600px] px-4 pb-12 pt-5 sm:px-6 lg:px-8 lg:pb-16">
                    <div className="relative min-h-[620px] overflow-hidden rounded-[42px_18px_42px_42px] border border-black/[0.06] bg-white px-6 py-7 shadow-[0_36px_110px_-70px_rgba(20,20,30,.24)] sm:px-9 sm:py-8 lg:min-h-[680px] lg:px-12 lg:py-9">
                        <div className="pointer-events-none absolute inset-0 overflow-hidden">
                            <div className="absolute -right-32 -top-40 h-[34rem] w-[34rem] rounded-full bg-violet-100 blur-[95px]" />
                            <div className="absolute -bottom-48 left-[18%] h-[30rem] w-[30rem] rounded-full bg-sky-100/80 blur-[100px]" />
                            <div className="absolute bottom-[8%] right-[6%] h-[16rem] w-[16rem] rounded-full bg-orange-100 blur-[75px]" />

                            <div className="hero-orbit-a absolute -right-[100px] -top-[130px] h-[470px] w-[470px] rounded-full border border-violet-500/10">
                                <span className="absolute left-[13%] top-[14%] h-2.5 w-2.5 rounded-full bg-violet-500" />
                            </div>

                            <div className="hero-orbit-b absolute right-[8%] top-[14%] h-[300px] w-[300px] rounded-full border border-sky-500/10">
                                <span className="absolute bottom-[11%] right-[6%] h-2 w-2 rounded-full bg-sky-500" />
                            </div>
                        </div>

                        <div className="relative flex h-full min-h-[560px] flex-col lg:min-h-[600px]">
                            <div className="hero-kicker flex items-center justify-between">
                                <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.27em] text-zinc-400">
                                    <span className="relative flex h-2 w-2">
                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                                    </span>
                                    BitLeap Community
                                </div>

                                <div className="hidden items-center gap-5 text-[9px] uppercase tracking-[0.18em] text-zinc-300 sm:flex">
                                    <span>GitHub Powered</span>
                                    <span>Open Community</span>
                                </div>
                            </div>

                            <div className="mt-12 lg:mt-14">
                                {/* Share：大、稳、靠左 */}
                                <div className="overflow-visible">
                                    <h1 className="hero-line text-[clamp(3.8rem,8.8vw,8.8rem)] font-medium leading-[0.84] tracking-[-0.08em] text-zinc-950">
                                        Share
                                    </h1>
                                </div>

                                {/* 你的：缩小，像一句插入语 */}
                                <div className="hero-line mt-4 flex items-center gap-4 pl-[10%]">
                                    <span className="h-px w-10 bg-zinc-300 sm:w-16" />

                                    <span className="text-[clamp(1.8rem,4vw,3.8rem)] font-medium leading-none tracking-[-0.04em] text-zinc-900">
                                        你的
                                    </span>

                                    <span className="text-[9px] uppercase tracking-[0.22em] text-zinc-300">
                                        idea / thought / work
                                    </span>
                                </div>

                                {/* 创意：真正的主视觉 */}
                                <div className="relative mt-3 overflow-visible pl-[2%]">
                                    <div className="pointer-events-none absolute left-[2%] top-1/2 h-[38%] w-[45%] -translate-y-1/2 rounded-full bg-violet-200/30 blur-[55px]" />

                                    <div className="hero-line relative inline-block bg-gradient-to-r from-violet-500 to-sky-400 bg-clip-text text-[clamp(4.2rem,9.6vw,9.6rem)] font-medium leading-[1] tracking-[-0.075em] text-transparent">
                                        创意
                                    </div>

                                    <span className="absolute -right-1 top-[18%] hidden text-[9px] uppercase tracking-[0.2em] text-zinc-300 sm:block">
                                        make it visible
                                    </span>
                                </div>
                            </div>

                            <div className="mt-auto grid gap-10 pt-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
                                {/* 左侧：说明 + 主发布入口 */}
                                <div className="max-w-xl">
                                    <p className="hero-copy text-sm leading-7 text-zinc-500 sm:text-[15px]">
                                        分享作品、实践、小工具和真正值得收藏的资源。
                                        <br />
                                        不需要写得很长，有价值的东西本身就值得被看见。
                                    </p>

                                    <button
                                        type="button"
                                        onClick={() => setPublishOpen(true)}
                                        className="hero-action group mt-7 flex h-13 items-center gap-6 rounded-full bg-[#171717] py-2 pl-5 pr-2 text-sm font-medium text-white shadow-[0_18px_40px_-20px_rgba(0,0,0,.6)] transition duration-300 hover:scale-[1.025]"
                                    >
                                        发布内容
                                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black transition-transform duration-300 group-hover:translate-x-1">
                                            <ArrowIcon />
                                        </span>
                                    </button>
                                </div>

                                {/* 右侧：快速分享 + 发布流程 */}
                                <div className="hero-category relative">
                                    <div className="pointer-events-none absolute -right-8 -top-16 h-48 w-48 rounded-full bg-violet-200/45 blur-[70px]" />
                                    <div className="pointer-events-none absolute -bottom-12 left-8 h-40 w-40 rounded-full bg-sky-200/35 blur-[65px]" />

                                    <div className="relative border-l border-black/[0.08] pl-6 sm:pl-8">
                                        <div className="flex items-center justify-between gap-6">
                                            <div>
                                                <div className="text-[9px] uppercase tracking-[0.25em] text-zinc-400">
                                                    Quick Share
                                                </div>
                                                <h3 className="mt-2 text-2xl font-medium tracking-[-0.04em] text-zinc-900">
                                                    有想法，就发出来。
                                                </h3>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => setPublishOpen(true)}
                                                className="group flex h-12 shrink-0 items-center gap-3 rounded-full bg-[#171717] py-2 pl-5 pr-2 text-sm font-medium text-white shadow-[0_16px_35px_-20px_rgba(0,0,0,.55)] transition duration-300 hover:-translate-y-0.5"
                                            >
                                                分享
                                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                                                    <ArrowUpRightIcon />
                                                </span>
                                            </button>
                                        </div>

                                        <div className="mt-6 border-t border-black/[0.07] pt-5">
                                            <div className="mb-5 text-[9px] uppercase tracking-[0.22em] text-zinc-300">
                                                Publish Flow
                                            </div>

                                            <div className="relative">
                                                <div className="absolute bottom-3 left-[5px] top-3 w-px bg-gradient-to-b from-violet-300 via-sky-300 to-emerald-300" />

                                                <div className="relative flex gap-4 pb-4">
                                                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-violet-500 ring-4 ring-violet-100" />
                                                    <div>
                                                        <div className="text-sm font-medium text-zinc-800">
                                                            发布
                                                        </div>
                                                        <div className="mt-1 text-xs leading-5 text-zinc-400">
                                                            通过 GitHub Discussion 提交内容
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="relative flex gap-4 pb-4">
                                                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-sky-500 ring-4 ring-sky-100" />
                                                    <div>
                                                        <div className="text-sm font-medium text-zinc-800">
                                                            审核
                                                        </div>
                                                        <div className="mt-1 text-xs leading-5 text-zinc-400">
                                                            通过后加入 approved 标签
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="relative flex gap-4">
                                                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                                                    <div>
                                                        <div className="text-sm font-medium text-zinc-800">
                                                            展示
                                                        </div>
                                                        <div className="mt-1 text-xs leading-5 text-zinc-400">
                                                            同步后出现在 BitLeap Community
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CONTENT */}
                <section className="mx-auto max-w-[1500px] px-4 pb-24 sm:px-6 lg:px-8">
                    {/* 控制栏 */}
                    <div className="reveal relative z-20 rounded-[28px_10px_28px_28px] border border-black/[0.06] bg-white px-4 py-4 shadow-[0_22px_65px_-50px_rgba(0,0,0,.25)] sm:px-5">
                        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                            <div className="flex flex-wrap items-center gap-2">
                                {categories.map((category) => {
                                    const active =
                                        activeCategory === category

                                    return (
                                        <button
                                            key={category}
                                            type="button"
                                            onClick={() =>
                                                setActiveCategory(category)
                                            }
                                            className={`rounded-full px-4 py-2 text-xs transition ${active
                                                ? 'bg-black text-white'
                                                : 'bg-zinc-100/70 text-zinc-500 hover:bg-zinc-200/70 hover:text-black'
                                                }`}
                                        >
                                            {category}
                                        </button>
                                    )
                                })}
                            </div>

                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                <div className="relative min-w-0 sm:w-[290px]">
                                    <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                                        <SearchIcon />
                                    </div>

                                    <input
                                        value={search}
                                        onChange={(event) =>
                                            setSearch(event.target.value)
                                        }
                                        placeholder="搜索作品、经验、作者..."
                                        className="h-11 w-full rounded-full border border-black/[0.07] bg-zinc-50 pl-11 pr-4 text-xs outline-none placeholder:text-zinc-300 focus:border-black/15 focus:bg-white"
                                    />
                                </div>

                                <div className="flex items-center gap-3 px-2 text-xs">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setSort('recommended')
                                        }
                                        className={
                                            sort === 'recommended'
                                                ? 'font-medium text-black'
                                                : 'text-zinc-300 transition hover:text-zinc-700'
                                        }
                                    >
                                        推荐
                                    </button>

                                    <span className="text-zinc-200">/</span>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setSort('latest')
                                        }
                                        className={
                                            sort === 'latest'
                                                ? 'font-medium text-black'
                                                : 'text-zinc-300 transition hover:text-zinc-700'
                                        }
                                    >
                                        最新
                                    </button>

                                    <span className="ml-2 text-zinc-300">
                                        {String(filteredPosts.length).padStart(
                                            2,
                                            '0',
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="reveal mt-20 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-400">
                                Discover / Community
                            </div>

                            <h2 className="mt-4 max-w-3xl text-4xl font-medium leading-[0.98] tracking-[-0.055em] sm:text-6xl">
                                Things worth
                                <br />
                                <span className="ml-[8%] text-zinc-300">
                                    discovering.
                                </span>
                            </h2>
                        </div>

                        <div className="max-w-sm text-sm leading-7 text-zinc-400">
                            GitHub Discussions 负责内容和讨论，
                            这里负责把它们整理成更舒服的阅读体验。
                        </div>
                    </div>

                    {/* 加载状态 */}
                    {loading ? (
                        <div className="mt-12 rounded-[36px_14px_36px_36px] border border-black/[0.06] bg-white p-8 shadow-[0_25px_80px_-65px_rgba(0,0,0,.3)]">
                            <div className="flex items-center gap-3 text-sm text-zinc-400">
                                <span className="h-2 w-2 animate-pulse rounded-full bg-violet-500" />
                                正在读取社区内容...
                            </div>
                        </div>
                    ) : filteredPosts.length > 0 ? (
                        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-12">
                            {filteredPosts.map((post, index) => {
                                if (!isGitHubCategory(post.category)) {
                                    return null
                                }

                                const meta = categoryMeta[post.category]
                                const accent = getAccent(meta.color)
                                const tags = getTechTags(post.tech)

                                const layout =
                                    index % 5 === 0
                                        ? 'lg:col-span-8 min-h-[430px]'
                                        : index % 5 === 1
                                            ? 'lg:col-span-4 min-h-[430px]'
                                            : index % 5 === 2
                                                ? 'lg:col-span-5 min-h-[340px]'
                                                : index % 5 === 3
                                                    ? 'lg:col-span-7 min-h-[340px]'
                                                    : 'lg:col-span-12 min-h-[300px]'

                                return (
                                    <a
                                        key={post.id}
                                        href={post.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        onMouseMove={handleCardMove}
                                        onMouseLeave={handleCardLeave}
                                        className={`post-card group relative flex flex-col overflow-hidden rounded-[34px_12px_34px_34px] border border-black/[0.08] bg-white p-6 text-inherit shadow-[0_28px_75px_-52px_rgba(15,23,42,.30)] ring-1 ring-black/[0.02] transition-shadow duration-300 hover:shadow-[0_34px_90px_-48px_rgba(15,23,42,.38)] ${layout} sm:p-7`}
                                        style={{
                                            transformStyle: 'preserve-3d',
                                        }}
                                    >
                                        {/* 卡片底层：保持不透明 */}
                                        <div
                                            className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent.gradient} opacity-70`}
                                        />

                                        <div
                                            className={`pointer-glow pointer-events-none absolute -left-[20%] -top-[25%] h-[60%] w-[60%] rounded-full ${accent.glow} opacity-0 blur-[65px]`}
                                        />

                                        <div
                                            className={`pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full ${accent.glow} opacity-70 blur-[60px]`}
                                        />

                                        <div className="relative flex items-start justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <span
                                                    className={`h-1.5 w-1.5 rounded-full ${accent.dot}`}
                                                />
                                                <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-400">
                                                    {meta.english}
                                                </span>
                                            </div>

                                            <span className="shrink-0 text-[10px] text-zinc-400">
                                                {formatDate(post.createdAt)}
                                            </span>
                                        </div>

                                        <div className="relative mt-auto pt-20">
                                            <h3 className="max-w-2xl text-2xl font-semibold leading-[1.08] tracking-[-0.04em] text-zinc-900 sm:text-3xl">
                                                {post.title}
                                            </h3>

                                            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-600">
                                                {post.excerpt}
                                            </p>

                                            {tags.length > 0 && (
                                                <div className="mt-6 flex flex-wrap gap-2">
                                                    {tags.map((tag) => (
                                                        <span
                                                            key={tag}
                                                            className={`rounded-full border px-3 py-1.5 text-[10px] font-medium ${accent.soft} ${accent.border} ${accent.text}`}
                                                        >
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="mt-7 flex items-end justify-between gap-4 border-t border-black/[0.07] pt-4">
                                                <div className="flex min-w-0 items-center gap-3">
                                                    {post.avatar ? (
                                                        <img
                                                            src={post.avatar}
                                                            alt=""
                                                            className="h-8 w-8 rounded-full border border-black/[0.06] object-cover"
                                                        />
                                                    ) : (
                                                        <div className="h-8 w-8 rounded-full bg-zinc-100" />
                                                    )}

                                                    <div className="min-w-0">
                                                        <div className="text-[9px] uppercase tracking-[0.15em] text-zinc-400">
                                                            Published by
                                                        </div>
                                                        <div className="mt-0.5 truncate text-xs font-medium text-zinc-700">
                                                            @{post.author}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex shrink-0 items-center gap-4">
                                                    <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                                                        <HeartIcon />
                                                        {post.upvotes}
                                                    </span>

                                                    <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                                                        <MessageIcon />
                                                        {post.comments}
                                                    </span>

                                                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.08] bg-white text-zinc-700 shadow-sm transition duration-300 group-hover:rotate-[-8deg] group-hover:bg-black group-hover:text-white">
                                                        <ArrowUpRightIcon />
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </a>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="reveal relative mt-12 overflow-hidden rounded-[44px_16px_44px_44px] border border-black/[0.06] bg-white px-7 py-10 shadow-[0_32px_95px_-68px_rgba(20,20,20,.28)] sm:px-10 sm:py-12 lg:min-h-[500px] lg:px-14 lg:py-14">
                            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                                <div className="absolute -right-28 -top-32 h-[26rem] w-[26rem] rounded-full bg-violet-100 blur-[85px]" />
                                <div className="absolute -bottom-32 left-[12%] h-[24rem] w-[24rem] rounded-full bg-sky-100/80 blur-[85px]" />
                            </div>

                            <div className="relative flex min-h-[390px] flex-col justify-between">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3 text-[9px] uppercase tracking-[0.23em] text-zinc-400">
                                        <SparkIcon />
                                        Empty for now
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-violet-400" />
                                        <span className="h-2 w-2 rounded-full bg-sky-400" />
                                        <span className="h-2 w-2 rounded-full bg-orange-400" />
                                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                    </div>
                                </div>

                                <div>
                                    <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-300">
                                        Community / 00
                                    </div>

                                    <h3 className="mt-5 max-w-4xl text-[clamp(2.7rem,6vw,6rem)] font-medium leading-[0.92] tracking-[-0.065em]">
                                        Nothing here
                                        <br />
                                        <span className="ml-[6%] text-zinc-300">
                                            yet.
                                        </span>
                                    </h3>

                                    <div className="mt-8 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
                                        <p className="max-w-xl text-sm leading-7 text-zinc-500">
                                            当前筛选条件下还没有内容。你可以换一个分类，
                                            或者发布一篇新的 GitHub Discussion。
                                        </p>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setPublishOpen(true)
                                            }
                                            className="group flex h-12 w-fit items-center gap-6 rounded-full bg-black pl-5 pr-2 text-sm font-medium text-white"
                                        >
                                            发布内容
                                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black transition-transform duration-300 group-hover:translate-x-1">
                                                <ArrowIcon />
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PRINCIPLES */}
                    <div className="reveal mt-28">
                        <div className="grid gap-5 lg:grid-cols-3">
                            <div className="relative min-h-[300px] overflow-hidden rounded-[38px_14px_38px_38px] border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-white p-7">
                                <div className="absolute -right-14 -top-16 h-44 w-44 rounded-full bg-violet-200/45 blur-[55px]" />
                                <div className="relative flex h-full flex-col justify-between">
                                    <span className="text-[9px] uppercase tracking-[0.22em] text-violet-500">
                                        01 / Share
                                    </span>
                                    <div>
                                        <h3 className="text-2xl font-medium tracking-[-0.04em]">
                                            有东西，再分享。
                                        </h3>
                                        <p className="mt-4 max-w-sm text-sm leading-7 text-zinc-500">
                                            不追求数量，也不需要为了活跃而制造内容。
                                            一个真实项目、一段真实经验就足够。
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="relative min-h-[300px] overflow-hidden rounded-[14px_38px_38px_38px] border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-white p-7 lg:translate-y-10">
                                <div className="absolute -right-14 -top-16 h-44 w-44 rounded-full bg-sky-200/45 blur-[55px]" />
                                <div className="relative flex h-full flex-col justify-between">
                                    <span className="text-[9px] uppercase tracking-[0.22em] text-sky-500">
                                        02 / Discuss
                                    </span>
                                    <div>
                                        <h3 className="text-2xl font-medium tracking-[-0.04em]">
                                            讨论留在 GitHub。
                                        </h3>
                                        <p className="mt-4 max-w-sm text-sm leading-7 text-zinc-500">
                                            不重复建设账号、权限和评论系统，
                                            让社区尽量保持简单。
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="relative min-h-[300px] overflow-hidden rounded-[38px_38px_14px_38px] border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-white p-7">
                                <div className="absolute -right-14 -top-16 h-44 w-44 rounded-full bg-orange-200/45 blur-[55px]" />
                                <div className="relative flex h-full flex-col justify-between">
                                    <span className="text-[9px] uppercase tracking-[0.22em] text-orange-500">
                                        03 / Discover
                                    </span>
                                    <div>
                                        <h3 className="text-2xl font-medium tracking-[-0.04em]">
                                            网站负责被发现。
                                        </h3>
                                        <p className="mt-4 max-w-sm text-sm leading-7 text-zinc-500">
                                            Discussion 是内容本体，BitLeap
                                            负责重新组织和呈现，让浏览更舒服。
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CTA */}
                    <div className="reveal relative mb-10 mt-36 overflow-hidden rounded-[48px_18px_48px_48px] bg-[#171717] px-7 py-12 text-white sm:px-10 sm:py-16 lg:px-14 lg:py-20">
                        <div className="pointer-events-none absolute inset-0">
                            <div className="absolute -right-28 -top-28 h-96 w-96 rounded-full bg-violet-500/20 blur-[90px]" />
                            <div className="absolute bottom-[-150px] left-[20%] h-80 w-80 rounded-full bg-sky-500/10 blur-[95px]" />
                            <div className="absolute right-[12%] top-[15%] h-48 w-48 rounded-full border border-white/[0.07]" />
                        </div>

                        <div className="relative">
                            <div className="text-[9px] uppercase tracking-[0.28em] text-zinc-600">
                                Open Community / GitHub Powered
                            </div>

                            <div className="mt-16 flex flex-col gap-12 lg:flex-row lg:items-end lg:justify-between">
                                <div>
                                    <h2 className="max-w-3xl text-4xl font-medium leading-[0.96] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
                                        Made something
                                        <br />
                                        worth sharing?
                                    </h2>

                                    <p className="mt-7 max-w-xl text-sm leading-7 text-zinc-500">
                                        不需要等到“完成”。过程、想法、作品和经验，
                                        本身就可以成为一篇值得留下的内容。
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setPublishOpen(true)
                                    }
                                    className="group flex h-13 w-fit items-center gap-7 rounded-full bg-white py-2 pl-5 pr-2 text-sm font-medium text-black"
                                >
                                    开始分享
                                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white transition-transform duration-300 group-hover:translate-x-1">
                                        <ArrowIcon />
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* 全局浮动分享按钮：滚动到任何位置都能快速发布 */}
            <button
                type="button"
                onClick={() => setPublishOpen(true)}
                className="group fixed bottom-6 right-6 z-40 flex h-12 items-center gap-3 rounded-full border border-white/20 bg-[#171717] py-2 pl-5 pr-2 text-sm font-medium text-white shadow-[0_20px_55px_-20px_rgba(0,0,0,.45)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_25px_65px_-18px_rgba(0,0,0,.5)]"
                aria-label="分享内容"
            >
                分享
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black transition-transform duration-300 group-hover:rotate-[-8deg]">
                    <ArrowUpRightIcon />
                </span>
            </button>

            {/* 发布弹窗 */}
            {publishOpen && (
                <div
                    className="fixed inset-0 z-[100] flex items-end justify-center bg-black/25 p-3 backdrop-blur-md sm:items-center sm:p-6"
                    onMouseDown={(event) => {
                        if (
                            event.currentTarget === event.target
                        ) {
                            setPublishOpen(false)
                        }
                    }}
                >
                    <div className="relative w-full max-w-2xl overflow-hidden rounded-[38px_16px_38px_38px] border border-white/70 bg-white shadow-[0_40px_120px_-30px_rgba(0,0,0,.35)]">
                        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-200/40 blur-[70px]" />

                        <div className="relative flex items-start justify-between px-7 pb-7 pt-8 sm:px-9">
                            <div>
                                <div className="text-[9px] uppercase tracking-[0.25em] text-zinc-400">
                                    Publish / GitHub Discussions
                                </div>

                                <h2 className="mt-3 text-3xl font-medium tracking-[-0.045em]">
                                    分享些什么？
                                </h2>

                                <p className="mt-2 text-sm text-zinc-400">
                                    选择一个最接近的分类。
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setPublishOpen(false)
                                }
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition duration-300 hover:rotate-90 hover:bg-black hover:text-white"
                                aria-label="关闭"
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        <div className="relative grid border-t border-black/[0.06] sm:grid-cols-2">
                            {publishCategories.map(
                                (item, index) => {
                                    const accent = getAccent(item.color)

                                    return (
                                        <a
                                            key={item.title}
                                            href={item.href}
                                            target="_blank"
                                            rel="noreferrer"
                                            className={`group relative min-h-[190px] overflow-hidden p-7 transition duration-300 hover:bg-zinc-50 sm:p-8 ${index % 2 === 0
                                                ? 'sm:border-r sm:border-black/[0.06]'
                                                : ''
                                                } ${index < 2
                                                    ? 'border-b border-black/[0.06]'
                                                    : ''
                                                }`}
                                        >
                                            <div
                                                className={`absolute -right-14 -top-14 h-40 w-40 rounded-full ${accent.glow} opacity-0 blur-[50px] transition duration-500 group-hover:opacity-100`}
                                            />

                                            <div className="relative">
                                                <div className="flex items-center justify-between">
                                                    <span
                                                        className={`text-[9px] font-medium ${accent.text}`}
                                                    >
                                                        {item.index} / {item.english}
                                                    </span>

                                                    <span className="text-zinc-300 transition duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-black">
                                                        <ArrowUpRightIcon />
                                                    </span>
                                                </div>

                                                <h3 className="mt-7 text-lg font-medium tracking-tight">
                                                    {item.title}
                                                </h3>

                                                <p className="mt-3 max-w-xs text-xs leading-6 text-zinc-400">
                                                    {item.description}
                                                </p>
                                            </div>
                                        </a>
                                    )
                                },
                            )}
                        </div>

                        <div className="relative border-t border-black/[0.06] bg-zinc-50 px-7 py-4 text-xs leading-5 text-zinc-400 sm:px-9">
                            发布时会前往 GitHub Discussions，需要登录 GitHub。
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
