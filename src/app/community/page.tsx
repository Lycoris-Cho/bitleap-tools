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

type Category =
  | '全部'
  | '经验分享'
  | '前端作品'
  | '小工具'
  | '资源推荐'

type Post = {
  id: number
  title: string
  excerpt: string
  category: Exclude<Category, '全部'>
  tags: string[]
  author: string
  date: string
  comments: number
  reactions: number
  featured?: boolean
  href?: string
}

const categories: Category[] = [
  '全部',
  '经验分享',
  '前端作品',
  '小工具',
  '资源推荐',
]

const categoryMeta = {
  经验分享: {
    index: '01',
    english: 'Experience',
    color: 'violet',
  },
  前端作品: {
    index: '02',
    english: 'Showcase',
    color: 'sky',
  },
  小工具: {
    index: '03',
    english: 'Tools',
    color: 'orange',
  },
  资源推荐: {
    index: '04',
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
    color: 'violet',
  },
  {
    index: '02',
    title: '前端作品',
    english: 'Showcase',
    description: '分享网站、组件、交互实验和完整前端项目。',
    href: 'https://github.com/Lycoris-Cho/bitleap-tools/discussions/new?category=frontend-showcase',
    color: 'sky',
  },
  {
    index: '03',
    title: '小工具',
    english: 'Tools',
    description: '解决实际问题的小工具、页面和创意项目。',
    href: 'https://github.com/Lycoris-Cho/bitleap-tools/discussions/new?category=small-tools',
    color: 'orange',
  },
  {
    index: '04',
    title: '资源推荐',
    english: 'Resources',
    description: '值得收藏的开源项目、设计资源和开发工具。',
    href: 'https://github.com/Lycoris-Cho/bitleap-tools/discussions/new?category=resource-sharing',
    color: 'emerald',
  },
]

/**
 * 不再放任何写死的假社区内容。
 * 后续直接替换为真实 GitHub Discussions 数据。
 */
const posts: Post[] = []

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

function getAccent(color: string) {
  if (color === 'violet') {
    return {
      dot: 'bg-violet-500',
      text: 'text-violet-600',
      soft: 'bg-violet-50',
      border: 'border-violet-200/70',
      glow: 'bg-violet-300/30',
    }
  }

  if (color === 'sky') {
    return {
      dot: 'bg-sky-500',
      text: 'text-sky-600',
      soft: 'bg-sky-50',
      border: 'border-sky-200/70',
      glow: 'bg-sky-300/30',
    }
  }

  if (color === 'orange') {
    return {
      dot: 'bg-orange-500',
      text: 'text-orange-600',
      soft: 'bg-orange-50',
      border: 'border-orange-200/70',
      glow: 'bg-orange-300/30',
    }
  }

  return {
    dot: 'bg-emerald-500',
    text: 'text-emerald-600',
    soft: 'bg-emerald-50',
    border: 'border-emerald-200/70',
    glow: 'bg-emerald-300/30',
  }
}

export default function CommunityPage() {
  const rootRef = useRef<HTMLDivElement>(null)

  const [activeCategory, setActiveCategory] =
    useState<Category>('全部')

  const [search, setSearch] = useState('')

  const [sort, setSort] =
    useState<'recommended' | 'latest'>('recommended')

  const [publishOpen, setPublishOpen] = useState(false)

  const filteredPosts = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    const result = posts.filter((post) => {
      const categoryMatched =
        activeCategory === '全部' ||
        post.category === activeCategory

      const searchMatched =
        !keyword ||
        post.title.toLowerCase().includes(keyword) ||
        post.excerpt.toLowerCase().includes(keyword) ||
        post.author.toLowerCase().includes(keyword) ||
        post.tags.some((tag) =>
          tag.toLowerCase().includes(keyword),
        )

      return categoryMatched && searchMatched
    })

    if (sort === 'latest') {
      return [...result].sort(
        (a, b) =>
          new Date(
            b.date.replace(/\./g, '-'),
          ).getTime() -
          new Date(
            a.date.replace(/\./g, '-'),
          ).getTime(),
      )
    }

    return [...result].sort((a, b) => {
      if (a.featured !== b.featured) {
        return a.featured ? -1 : 1
      }

      return (
        b.comments +
        b.reactions -
        (a.comments + a.reactions)
      )
    })
  }, [activeCategory, search, sort])

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
          y: 15,
          duration: 0.55,
        })
        .from(
          '.hero-line',
          {
            yPercent: 110,
            opacity: 0,
            rotate: 2.5,
            duration: 1.05,
            stagger: 0.1,
          },
          '-=0.2',
        )
        .from(
          '.hero-copy',
          {
            opacity: 0,
            y: 20,
            duration: 0.65,
          },
          '-=0.55',
        )
        .from(
          '.hero-action',
          {
            opacity: 0,
            y: 20,
            scale: 0.96,
            duration: 0.6,
          },
          '-=0.45',
        )
        .from(
          '.hero-category',
          {
            opacity: 0,
            y: 22,
            rotate: 3,
            duration: 0.65,
            stagger: 0.06,
          },
          '-=0.45',
        )

      gsap.to('.orb-a', {
        x: 60,
        y: 40,
        duration: 14,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      })

      gsap.to('.orb-b', {
        x: -55,
        y: 80,
        duration: 18,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      })

      gsap.to('.orb-c', {
        x: 40,
        y: -50,
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

      gsap.to('.hero-float-a', {
        y: -18,
        x: 10,
        rotate: 8,
        duration: 4.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      })

      gsap.to('.hero-float-b', {
        y: 14,
        x: -12,
        duration: 5.2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      })

      gsap.utils
        .toArray<HTMLElement>('.reveal')
        .forEach((element) => {
          gsap.from(element, {
            opacity: 0,
            y: 45,
            duration: 0.9,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: element,
              start: 'top 88%',
              once: true,
            },
          })
        })

      gsap.utils
        .toArray<HTMLElement>('.post-card')
        .forEach((card, index) => {
          gsap.from(card, {
            opacity: 0,
            y: 55,
            rotate:
              index % 2 === 0 ? -1.2 : 1.2,
            duration: 0.85,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: card,
              start: 'top 92%',
              once: true,
            },
          })
        })
    }, rootRef)

    return () => ctx.revert()
  }, [filteredPosts.length])

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
      rotateY: x * 3,
      rotateX: y * -3,
      x: x * 3,
      y: y * 3,
      transformPerspective: 1100,
      duration: 0.45,
      ease: 'power2.out',
      overwrite: true,
    })

    const glow = card.querySelector(
      '.pointer-glow',
    ) as HTMLElement | null

    if (glow) {
      gsap.to(glow, {
        xPercent: x * 90,
        yPercent: y * 90,
        opacity: 1,
        duration: 0.4,
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
      duration: 0.7,
      ease: 'power3.out',
      overwrite: true,
    })

    const glow = event.currentTarget.querySelector(
      '.pointer-glow',
    ) as HTMLElement | null

    if (glow) {
      gsap.to(glow, {
        opacity: 0,
        duration: 0.3,
      })
    }
  }

  return (
    <div
      ref={rootRef}
      className="relative min-h-screen overflow-x-hidden bg-[#fdfcf9] text-[#151515]"
    >
      {/* 背景氛围 */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="orb-a absolute -left-[20rem] -top-[20rem] h-[48rem] w-[48rem] rounded-full bg-violet-200/35 blur-[165px]" />

        <div className="orb-b absolute -right-[18rem] top-[10%] h-[46rem] w-[46rem] rounded-full bg-sky-200/30 blur-[165px]" />

        <div className="orb-c absolute bottom-[-22rem] left-[28%] h-[44rem] w-[44rem] rounded-full bg-orange-200/30 blur-[165px]" />

        <div className="absolute bottom-[12%] right-[4%] h-[32rem] w-[32rem] rounded-full bg-emerald-100/30 blur-[150px]" />

        <div className="community-noise absolute inset-0 opacity-[0.025]" />
      </div>

      <main className="relative z-10">
        {/* =====================================================
            HERO
        ====================================================== */}

        <section className="mx-auto max-w-[1600px] px-4 pb-20 pt-5 sm:px-6 lg:px-8 lg:pb-28">
          <div className="relative min-h-[780px] overflow-hidden rounded-[46px_18px_46px_46px] border border-black/[0.055] bg-white/72 px-6 py-7 shadow-[0_40px_120px_-80px_rgba(34,20,80,.4)] backdrop-blur-2xl sm:px-9 sm:py-9 lg:min-h-[860px] lg:px-12 lg:py-11">
            {/* 内部背景 */}

            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -right-32 -top-40 h-[34rem] w-[34rem] rounded-full bg-violet-200/35 blur-[90px]" />

              <div className="absolute -bottom-48 left-[18%] h-[30rem] w-[30rem] rounded-full bg-sky-200/25 blur-[95px]" />

              <div className="absolute bottom-[8%] right-[6%] h-[16rem] w-[16rem] rounded-full bg-orange-100/55 blur-[70px]" />

              <div className="hero-orbit-a absolute -right-[100px] -top-[130px] h-[470px] w-[470px] rounded-full border border-violet-500/10">
                <span className="absolute left-[13%] top-[14%] h-2.5 w-2.5 rounded-full bg-violet-500" />
              </div>

              <div className="hero-orbit-b absolute right-[8%] top-[14%] h-[300px] w-[300px] rounded-full border border-sky-500/10">
                <span className="absolute bottom-[11%] right-[6%] h-2 w-2 rounded-full bg-sky-500" />
              </div>

              <div className="hero-float-a absolute right-[15%] top-[45%] h-20 w-20 rotate-12 rounded-[26px_8px_26px_26px] border border-violet-200/60 bg-white/65 shadow-[0_20px_55px_-30px_rgba(124,58,237,.45)] backdrop-blur" />

              <div className="hero-float-b absolute right-[7%] top-[57%] h-6 w-6 rounded-full bg-orange-300 shadow-[0_8px_30px_rgba(251,146,60,.4)]" />

              <div className="absolute left-[9%] top-[9%] h-px w-[55%] bg-gradient-to-r from-black/10 to-transparent" />
            </div>

            <div className="relative flex h-full min-h-[720px] flex-col lg:min-h-[770px]">
              {/* 顶部 */}

              <div className="hero-kicker flex items-center justify-between">
                <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.27em] text-zinc-400">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />

                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>

                  BitLeap Community
                </div>

                <div className="hidden items-center gap-5 text-[9px] uppercase tracking-[0.18em] text-zinc-300 sm:flex">
                  <span>Open Community</span>
                  <span>2026</span>
                </div>
              </div>

              {/* 主体 */}

              <div className="mt-20 lg:mt-24">
                <div className="overflow-hidden pb-2">
                  <h1 className="hero-line text-[clamp(4.2rem,10vw,10rem)] font-medium leading-[0.76] tracking-[-0.085em]">
                    Share
                  </h1>
                </div>

                <div className="overflow-hidden pb-2">
                  <div className="hero-line ml-[12%] bg-gradient-to-r from-violet-500 via-fuchsia-400 to-sky-400 bg-clip-text text-[clamp(4.2rem,10vw,10rem)] font-medium leading-[0.76] tracking-[-0.085em] text-transparent">
                    what
                  </div>
                </div>

                <div className="overflow-hidden pb-4">
                  <div className="hero-line ml-[2%] text-[clamp(4.2rem,10vw,10rem)] font-medium leading-[0.76] tracking-[-0.085em]">
                    matters.
                  </div>
                </div>
              </div>

              {/* 下半 */}

              <div className="mt-auto grid gap-10 pt-16 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <div>
                  <p className="hero-copy max-w-xl text-sm leading-7 text-zinc-500 sm:text-[15px]">
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

                {/* 漂浮分类 */}

                <div className="grid max-w-[560px] grid-cols-2 gap-3">
                  {publishCategories.map((item, index) => {
                    const accent = getAccent(item.color)

                    return (
                      <button
                        key={item.title}
                        type="button"
                        onClick={() =>
                          setActiveCategory(
                            item.title as Category,
                          )
                        }
                        className={`hero-category group relative min-w-[145px] overflow-hidden border bg-white/72 px-4 py-3.5 text-left shadow-[0_16px_40px_-34px_rgba(0,0,0,.35)] backdrop-blur transition duration-300 hover:-translate-y-1 ${accent.border} ${
                          index === 0
                            ? 'rotate-[-2deg] rounded-[22px_8px_22px_22px]'
                            : index === 1
                              ? 'rotate-[1.5deg] rounded-[8px_22px_22px_22px]'
                              : index === 2
                                ? 'rotate-[1deg] rounded-[22px_22px_8px_22px]'
                                : 'rotate-[-1.5deg] rounded-[22px_22px_22px_8px]'
                        }`}
                      >
                        <div
                          className={`absolute -right-10 -top-10 h-28 w-28 rounded-full ${accent.glow} blur-[38px]`}
                        />

                        <div className="relative flex items-center justify-between">
                          <span
                            className={`text-[9px] font-medium ${accent.text}`}
                          >
                            {item.index}
                          </span>

                          <span className="text-zinc-300 transition group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-black">
                            <ArrowUpRightIcon />
                          </span>
                        </div>

                        <div className="relative mt-5">
                          <div className="text-sm font-medium">
                            {item.title}
                          </div>

                          <div className="mt-1 text-[8px] uppercase tracking-[0.18em] text-zinc-300">
                            {item.english}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            CONTENT AREA
        ====================================================== */}

        <section className="mx-auto max-w-[1500px] px-4 pb-24 sm:px-6 lg:px-8">
          {/* 控制栏 */}

          <div className="reveal relative z-20 rounded-[30px_10px_30px_30px] border border-black/[0.06] bg-white/80 px-4 py-4 shadow-[0_25px_70px_-55px_rgba(0,0,0,.32)] backdrop-blur-2xl sm:px-5">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              {/* 分类 */}

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
                      className={`rounded-full px-4 py-2 text-xs transition ${
                        active
                          ? 'bg-black text-white'
                          : 'bg-zinc-50 text-zinc-500 hover:bg-zinc-100 hover:text-black'
                      }`}
                    >
                      {category}
                    </button>
                  )
                })}
              </div>

              {/* 搜索 */}

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative min-w-0 sm:w-[280px]">
                  <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                    <SearchIcon />
                  </div>

                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="搜索作品、经验、作者..."
                    className="h-11 w-full rounded-full border border-black/[0.06] bg-zinc-50/80 pl-11 pr-4 text-xs outline-none placeholder:text-zinc-300 focus:border-black/15 focus:bg-white"
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
                        ? 'text-black'
                        : 'text-zinc-300 transition hover:text-zinc-700'
                    }
                  >
                    推荐
                  </button>

                  <span className="text-zinc-200">
                    /
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setSort('latest')
                    }
                    className={
                      sort === 'latest'
                        ? 'text-black'
                        : 'text-zinc-300 transition hover:text-zinc-700'
                    }
                  >
                    最新
                  </button>

                  <span className="ml-2 text-zinc-300">
                    {String(
                      filteredPosts.length,
                    ).padStart(2, '0')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 标题 */}

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

          {/* =================================================
              帖子
          ================================================== */}

          {filteredPosts.length > 0 ? (
            <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-12">
              {filteredPosts.map((post, index) => {
                const meta =
                  categoryMeta[post.category]

                const accent = getAccent(meta.color)

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
                  <article
                    key={post.id}
                    onMouseMove={handleCardMove}
                    onMouseLeave={handleCardLeave}
                    className={`post-card group relative flex cursor-pointer flex-col overflow-hidden rounded-[34px_12px_34px_34px] border border-black/[0.06] bg-white/82 p-6 shadow-[0_30px_80px_-60px_rgba(0,0,0,.34)] backdrop-blur-xl ${layout} sm:p-7`}
                    style={{
                      transformStyle: 'preserve-3d',
                    }}
                  >
                    <div
                      className={`pointer-glow pointer-events-none absolute -left-[25%] -top-[25%] h-[65%] w-[65%] rounded-full ${accent.glow} opacity-0 blur-[65px]`}
                    />

                    <div
                      className={`absolute -right-20 -top-20 h-56 w-56 rounded-full ${accent.glow} blur-[60px]`}
                    />

                    <div className="relative flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${accent.dot}`}
                        />

                        <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-400">
                          {meta.english}
                        </span>
                      </div>

                      <span className="text-[10px] text-zinc-300">
                        {post.date}
                      </span>
                    </div>

                    <div className="relative mt-auto pt-20">
                      <h3 className="max-w-2xl text-2xl font-medium leading-[1.05] tracking-[-0.04em] sm:text-3xl">
                        {post.title}
                      </h3>

                      <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-500">
                        {post.excerpt}
                      </p>

                      <div className="mt-6 flex flex-wrap gap-2">
                        {post.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-black/[0.06] bg-white/70 px-2.5 py-1 text-[10px] text-zinc-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="mt-7 flex items-end justify-between border-t border-black/[0.05] pt-4">
                        <div>
                          <div className="text-[9px] uppercase tracking-[0.15em] text-zinc-300">
                            Published by
                          </div>

                          <div className="mt-1 text-xs text-zinc-600">
                            @{post.author}
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1.5 text-xs text-zinc-400">
                            <HeartIcon />
                            {post.reactions}
                          </span>

                          <span className="flex items-center gap-1.5 text-xs text-zinc-400">
                            <MessageIcon />
                            {post.comments}
                          </span>

                          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.07] bg-white transition duration-300 group-hover:rotate-[-8deg] group-hover:bg-black group-hover:text-white">
                            <ArrowUpRightIcon />
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            /* =================================================
                空状态
                没有任何假分享
            ================================================== */

            <div className="reveal relative mt-12 overflow-hidden rounded-[48px_16px_48px_48px] border border-black/[0.055] bg-white/75 px-7 py-10 shadow-[0_35px_100px_-75px_rgba(20,20,20,.35)] backdrop-blur-2xl sm:px-10 sm:py-12 lg:min-h-[560px] lg:px-14 lg:py-14">
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -right-28 -top-32 h-[26rem] w-[26rem] rounded-full bg-violet-200/40 blur-[80px]" />

                <div className="absolute -bottom-32 left-[12%] h-[24rem] w-[24rem] rounded-full bg-sky-200/30 blur-[85px]" />

                <div className="absolute bottom-[3%] right-[15%] h-[16rem] w-[16rem] rounded-full bg-orange-100/55 blur-[75px]" />

                <div className="absolute right-[5%] top-[15%] h-52 w-52 rounded-full border border-black/[0.04]" />

                <div className="absolute right-[13%] top-[26%] h-32 w-32 rounded-full border border-black/[0.035]" />
              </div>

              <div className="relative flex min-h-[450px] flex-col justify-between">
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

                  <h3 className="mt-5 max-w-4xl text-[clamp(2.7rem,6vw,6.2rem)] font-medium leading-[0.92] tracking-[-0.065em]">
                    Nothing here
                    <br />

                    <span className="ml-[6%] text-zinc-300">
                      yet.
                    </span>
                  </h3>

                  <div className="mt-8 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
                    <p className="max-w-xl text-sm leading-7 text-zinc-500">
                      这里没有任何为了展示效果而写死的假帖子。
                      等真实的 GitHub Discussion 出现以后，
                      它才会成为真正的社区内容。
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        setPublishOpen(true)
                      }
                      className="group flex h-12 w-fit items-center gap-6 rounded-full bg-black pl-5 pr-2 text-sm font-medium text-white"
                    >
                      发布第一篇

                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black transition-transform duration-300 group-hover:translate-x-1">
                        <ArrowIcon />
                      </span>
                    </button>
                  </div>
                </div>

                <div className="mt-12 grid gap-3 border-t border-black/[0.05] pt-5 sm:grid-cols-4">
                  {publishCategories.map((item) => {
                    const accent = getAccent(item.color)

                    return (
                      <a
                        key={item.title}
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-center gap-3 py-2"
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${accent.dot}`}
                        />

                        <span className="text-xs text-zinc-400 transition group-hover:text-black">
                          {item.title}
                        </span>

                        <span className="ml-auto text-zinc-200 transition group-hover:translate-x-1 group-hover:text-zinc-500">
                          →
                        </span>
                      </a>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* =================================================
              COMMUNITY PRINCIPLES
          ================================================== */}

          <div className="reveal mt-28">
            <div className="grid gap-5 lg:grid-cols-3">
              <div className="relative min-h-[310px] overflow-hidden rounded-[40px_14px_40px_40px] border border-violet-200/60 bg-gradient-to-br from-violet-50 via-white to-white p-7">
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

              <div className="relative min-h-[310px] overflow-hidden rounded-[14px_40px_40px_40px] border border-sky-200/60 bg-gradient-to-br from-sky-50 via-white to-white p-7 lg:translate-y-10">
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

              <div className="relative min-h-[310px] overflow-hidden rounded-[40px_40px_14px_40px] border border-orange-200/60 bg-gradient-to-br from-orange-50 via-white to-white p-7">
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
                      Discussion 是内容本体，
                      BitLeap 负责重新组织和呈现，让浏览更舒服。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* =================================================
              底部 CTA
          ================================================== */}

          <div className="reveal relative mb-10 mt-36 overflow-hidden rounded-[50px_18px_50px_50px] bg-[#171717] px-7 py-12 text-white sm:px-10 sm:py-16 lg:px-14 lg:py-20">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -right-28 -top-28 h-96 w-96 rounded-full bg-violet-500/20 blur-[90px]" />

              <div className="absolute bottom-[-150px] left-[20%] h-80 w-80 rounded-full bg-sky-500/12 blur-[95px]" />

              <div className="absolute right-[12%] top-[15%] h-48 w-48 rounded-full border border-white/[0.07]" />

              <div className="absolute right-[5%] top-[2%] h-80 w-80 rounded-full border border-white/[0.04]" />
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
                    不需要等到“完成”。
                    过程、想法、作品和经验，本身就可以成为一篇值得留下的内容。
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

      {/* =====================================================
          发布弹窗
      ====================================================== */}

      {publishOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/20 p-3 backdrop-blur-md sm:items-center sm:p-6"
          onMouseDown={(event) => {
            if (
              event.currentTarget === event.target
            ) {
              setPublishOpen(false)
            }
          }}
        >
          <div className="community-dialog relative w-full max-w-2xl overflow-hidden rounded-[40px_16px_40px_40px] border border-white/70 bg-white shadow-[0_40px_120px_-30px_rgba(0,0,0,.35)]">
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
                  const accent =
                    getAccent(item.color)

                  return (
                    <a
                      key={item.title}
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className={`group relative min-h-[190px] overflow-hidden p-7 transition duration-300 hover:bg-zinc-50 sm:p-8 ${
                        index % 2 === 0
                          ? 'sm:border-r sm:border-black/[0.06]'
                          : ''
                      } ${
                        index < 2
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
                            {item.index} /{' '}
                            {item.english}
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

            <div className="relative border-t border-black/[0.06] bg-zinc-50/70 px-7 py-4 text-xs leading-5 text-zinc-400 sm:px-9">
              发布时会前往 GitHub Discussions，需要登录 GitHub。
            </div>
          </div>
        </div>
      )}

      <style>{`
        .community-noise {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.93' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.34'/%3E%3C/svg%3E");
        }

        @keyframes community-dialog-in {
          from {
            opacity: 0;
            transform: translateY(18px)
              scale(0.975);
          }

          to {
            opacity: 1;
            transform: translateY(0)
              scale(1);
          }
        }

        .community-dialog {
          animation: community-dialog-in
            220ms
            cubic-bezier(
              0.16,
              1,
              0.3,
              1
            );
        }

        @media (prefers-reduced-motion: reduce) {
          .community-dialog {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}