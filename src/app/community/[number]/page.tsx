import Link from 'next/link'
import { notFound } from 'next/navigation'
import { promises as fs } from 'fs'
import path from 'path'
import CommunityComments from '@/components/CommunityComments'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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

type CategoryMeta = {
    label: string
    english: string
    dot: string
    soft: string
    text: string
}

const categoryMeta: Record<string, CategoryMeta> = {
    'Experience Sharing': {
        label: '经验分享',
        english: 'Experience',
        dot: 'bg-violet-500',
        soft: 'bg-violet-50',
        text: 'text-violet-600',
    },
    'Frontend Showcase': {
        label: '前端作品',
        english: 'Showcase',
        dot: 'bg-sky-500',
        soft: 'bg-sky-50',
        text: 'text-sky-600',
    },
    'Small Tools': {
        label: '小工具',
        english: 'Tools',
        dot: 'bg-orange-500',
        soft: 'bg-orange-50',
        text: 'text-orange-600',
    },
    'Resource Sharing': {
        label: '资源推荐',
        english: 'Resources',
        dot: 'bg-emerald-500',
        soft: 'bg-emerald-50',
        text: 'text-emerald-600',
    },
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
        .slice(0, 10)
}

async function getPosts(): Promise<Post[]> {
    const filePath = path.join(
        process.cwd(),
        'public',
        'data',
        'community.json',
    )

    try {
        const file = await fs.readFile(filePath, 'utf8')
        const data = JSON.parse(file) as Post[]
        return Array.isArray(data) ? data : []
    } catch {
        return []
    }
}

export async function generateStaticParams() {
    const posts = await getPosts()

    return posts.map((post) => ({
        number: String(post.number),
    }))
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ number: string }>
}) {
    const { number } = await params
    const posts = await getPosts()
    const post = posts.find(
        (item) => String(item.number) === String(number),
    )

    if (!post) {
        return {
            title: 'Community | BitLeap',
        }
    }

    return {
        title: `${post.title} | BitLeap Community`,
        description: post.excerpt,
    }
}

function ArrowLeftIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            className="h-4 w-4"
            aria-hidden="true"
        >
            <path d="M19 12H5" />
            <path d="m11 18-6-6 6-6" />
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

export default async function CommunityDetailPage({
    params,
}: {
    params: Promise<{ number: string }>
}) {
    const { number } = await params
    const posts = await getPosts()

    const post = posts.find(
        (item) => String(item.number) === String(number),
    )

    if (!post) {
        notFound()
    }

    const meta =
        categoryMeta[post.category] ?? {
            label: '社区内容',
            english: 'Community',
            dot: 'bg-zinc-500',
            soft: 'bg-zinc-100',
            text: 'text-zinc-600',
        }

    const tags = getTechTags(post.tech)

    return (
        <main className="min-h-screen bg-[#f7f7f5] px-4 pb-20 pt-5 text-[#151515] sm:px-5 lg:px-6 xl:px-8">
            <div className="mx-auto max-w-[1380px]">
                <div className="mb-5 flex items-center justify-between gap-4">
                    <Link
                        href="/community"
                        className="group inline-flex h-10 items-center gap-2 rounded-full border border-black/[0.07] bg-white px-4 text-xs font-medium text-zinc-600 shadow-sm transition hover:-translate-y-0.5 hover:text-black"
                    >
                        <span className="transition-transform duration-300 group-hover:-translate-x-1">
                            <ArrowLeftIcon />
                        </span>
                        返回 Community
                    </Link>

                    <div className="hidden text-[9px] uppercase tracking-[0.22em] text-zinc-300 sm:block">
                        BitLeap / Community / #{post.number}
                    </div>
                </div>

                <article className="overflow-hidden rounded-[32px] border border-black/[0.06] bg-white shadow-[0_36px_110px_-78px_rgba(15,23,42,.28)]">
                    <header className="relative overflow-hidden border-b border-black/[0.06] px-6 py-8 sm:px-9 sm:py-10 lg:px-12 lg:py-12">
                        <div className="pointer-events-none absolute -right-28 -top-32 h-96 w-96 rounded-full bg-violet-100/75 blur-[90px]" />
                        <div className="pointer-events-none absolute -bottom-40 left-[15%] h-80 w-80 rounded-full bg-sky-100/70 blur-[95px]" />

                        <div className="relative">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <span
                                        className={`h-2 w-2 rounded-full ${meta.dot}`}
                                    />
                                    <span
                                        className={`rounded-full px-3 py-1.5 text-[10px] font-medium ${meta.soft} ${meta.text}`}
                                    >
                                        {meta.label}
                                    </span>
                                    <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-300">
                                        {meta.english}
                                    </span>
                                </div>

                                <time className="text-[11px] text-zinc-400">
                                    {formatDate(post.createdAt)}
                                </time>
                            </div>

                            <h1 className="mt-8 max-w-5xl text-[clamp(2.5rem,6vw,5.8rem)] font-medium leading-[0.98] tracking-[-0.06em] text-zinc-950">
                                {post.title}
                            </h1>

                            {post.excerpt && (
                                <p className="mt-6 max-w-3xl text-sm leading-7 text-zinc-500 sm:text-[15px]">
                                    {post.excerpt}
                                </p>
                            )}

                            <div className="mt-8 flex flex-col gap-5 border-t border-black/[0.06] pt-6 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-3">
                                    {post.avatar ? (
                                        <img
                                            src={post.avatar}
                                            alt=""
                                            className="h-10 w-10 rounded-full border border-black/[0.06] object-cover"
                                        />
                                    ) : (
                                        <div className="h-10 w-10 rounded-full bg-zinc-100" />
                                    )}

                                    <div>
                                        <div className="text-[9px] uppercase tracking-[0.18em] text-zinc-300">
                                            Published by
                                        </div>
                                        <a
                                            href={post.authorUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="mt-1 block text-sm font-medium text-zinc-700 transition hover:text-black"
                                        >
                                            @{post.author}
                                        </a>
                                    </div>
                                </div>

                                <div className="flex items-center gap-5 text-xs text-zinc-500">
                                    <span className="flex items-center gap-1.5">
                                        <HeartIcon />
                                        {post.upvotes}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <MessageIcon />
                                        {post.comments}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </header>

                    <div className="grid lg:grid-cols-[minmax(0,1fr)_260px]">
                        <div className="min-w-0 px-6 py-8 sm:px-9 sm:py-10 lg:px-12 lg:py-12">
                            {post.body ? (
                                <div className="community-markdown max-w-4xl">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            h1: ({ children }) => (
                                                <h1 className="mb-5 mt-10 text-3xl font-semibold tracking-[-0.04em] first:mt-0">
                                                    {children}
                                                </h1>
                                            ),
                                            h2: ({ children }) => (
                                                <h2 className="mb-4 mt-9 text-2xl font-semibold tracking-[-0.035em] first:mt-0">
                                                    {children}
                                                </h2>
                                            ),
                                            h3: ({ children }) => (
                                                <h3 className="mb-3 mt-7 text-xl font-semibold tracking-[-0.025em]">
                                                    {children}
                                                </h3>
                                            ),
                                            p: ({ children }) => (
                                                <p className="my-4 text-[15px] leading-8 text-zinc-600">
                                                    {children}
                                                </p>
                                            ),
                                            ul: ({ children }) => (
                                                <ul className="my-5 list-disc space-y-2 pl-6 text-[15px] leading-7 text-zinc-600">
                                                    {children}
                                                </ul>
                                            ),
                                            ol: ({ children }) => (
                                                <ol className="my-5 list-decimal space-y-2 pl-6 text-[15px] leading-7 text-zinc-600">
                                                    {children}
                                                </ol>
                                            ),
                                            li: ({ children }) => (
                                                <li>{children}</li>
                                            ),
                                            blockquote: ({ children }) => (
                                                <blockquote className="my-6 rounded-r-[18px] border-l-2 border-violet-300 bg-violet-50/60 px-5 py-3 text-zinc-600">
                                                    {children}
                                                </blockquote>
                                            ),
                                            a: ({ href, children }) => (
                                                <a
                                                    href={href}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="font-medium text-violet-600 underline decoration-violet-200 underline-offset-4 transition hover:text-violet-700"
                                                >
                                                    {children}
                                                </a>
                                            ),
                                            img: ({ src, alt }) => {
                                                if (!src) return null

                                                return (
                                                    <span className="my-7 block overflow-hidden rounded-[24px] border border-black/[0.06] bg-zinc-50 shadow-[0_20px_55px_-45px_rgba(0,0,0,.35)]">
                                                        <img
                                                            src={src}
                                                            alt={alt || ''}
                                                            loading="lazy"
                                                            className="block h-auto max-h-[760px] w-full object-contain"
                                                        />
                                                    </span>
                                                )
                                            },
                                            code: ({ children }) => (
                                                <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-[0.9em] text-zinc-800">
                                                    {children}
                                                </code>
                                            ),
                                            pre: ({ children }) => (
                                                <pre className="my-6 overflow-x-auto rounded-[20px] bg-[#171717] p-5 text-sm leading-6 text-zinc-100">
                                                    {children}
                                                </pre>
                                            ),
                                            hr: () => (
                                                <hr className="my-9 border-black/[0.07]" />
                                            ),
                                        }}
                                    >
                                        {post.body}
                                    </ReactMarkdown>
                                </div>
                            ) : (
                                <p className="text-sm text-zinc-400">
                                    暂无正文内容。
                                </p>
                            )}
                            <CommunityComments />
                        </div>

                        <aside className="border-t border-black/[0.06] bg-zinc-50/60 px-6 py-7 lg:border-l lg:border-t-0">
                            <div className="lg:sticky lg:top-6">
                                <div className="text-[9px] uppercase tracking-[0.22em] text-zinc-300">
                                    Post info
                                </div>

                                {tags.length > 0 && (
                                    <div className="mt-5 flex flex-wrap gap-2">
                                        {tags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="rounded-full border border-black/[0.06] bg-white px-3 py-1.5 text-[10px] font-medium text-zinc-500"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-7 space-y-3">
                                    {post.demoUrl && (
                                        <a
                                            href={post.demoUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="group flex h-11 items-center justify-between rounded-full bg-black px-4 text-xs font-medium text-white transition hover:-translate-y-0.5"
                                        >
                                            在线体验
                                            <span className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                                                <ArrowUpRightIcon />
                                            </span>
                                        </a>
                                    )}

                                    {post.githubUrl && (
                                        <a
                                            href={post.githubUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="group flex h-11 items-center justify-between rounded-full border border-black/[0.08] bg-white px-4 text-xs font-medium text-zinc-700 transition hover:-translate-y-0.5 hover:text-black"
                                        >
                                            查看源码
                                            <span className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                                                <ArrowUpRightIcon />
                                            </span>
                                        </a>
                                    )}

                                    <a
                                        href={post.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="group flex h-11 items-center justify-between rounded-full border border-black/[0.08] bg-white px-4 text-xs font-medium text-zinc-700 transition hover:-translate-y-0.5 hover:text-black"
                                    >
                                        GitHub Discussion
                                        <span className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                                            <ArrowUpRightIcon />
                                        </span>
                                    </a>
                                </div>

                                <div className="mt-8 border-t border-black/[0.06] pt-5 text-[11px] leading-6 text-zinc-400">
                                    内容来自 GitHub Discussions。
                                    阅读留在 BitLeap，需要参与讨论时再前往 GitHub。
                                </div>
                            </div>
                        </aside>
                    </div>
                </article>
            </div>
        </main>
    )
}
