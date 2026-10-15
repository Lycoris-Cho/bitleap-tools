'use client'

/*
 * 发现 · 歌单 —— 主区全宽的那一屏。
 *
 * 三段式，自上而下：今日推荐（大卡横排）→ 分类胶囊 → 歌单网格（可翻页）。
 *
 * 几个刻意的选择：
 *   ① 卡片只有两种（宽卡 / 方卡），尺寸与留白写死，不随内容变 —— 网格才立得住；
 *   ② 封面加载一律走浏览器原生 lazy + 渐显，不给歌单列表做逐张请求
 *      （这一屏一进来就是几十张图，逐张请求会把上游和首屏一起拖垮）；
 *   ③ 分类切换用请求序号做竞态保护：连续点几个分类时，只认最后一次的结果，
 *      否则先发的慢响应回来会把后来的覆盖掉；
 *   ④ 「推荐」与「分类」各自失败各自降级：推荐挂了不影响分类，分类挂了不影响推荐。
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PlaylistBrief } from '../types'
import { formatPlayCount } from '../utils'
import { IconAlert, IconHeadphones, IconPlay, IconRetry, IconSpinner } from './icons'
import PlaylistCarousel from './PlaylistCarousel'

interface DiscoverPanelProps {
    /** 打开歌单详情；autoPlay = 直接开播（卡片上那个悬浮播放钮） */
    onOpenPlaylist: (id: string, autoPlay?: boolean) => void
}

const RECOMMEND_LIMIT = 24
/** 推荐里前几张做成轮播，其余铺网格 */
const CAROUSEL_SIZE = 5
const GRID_PAGE_SIZE = 30
/** 分类胶囊默认先摊出这么多个，其余收在「更多」里 */
const TAG_PREVIEW_COUNT = 11

interface CategoryResult {
    items: PlaylistBrief[]
    total: number
    hasMore: boolean
}

export default function DiscoverPanel({ onOpenPlaylist }: DiscoverPanelProps) {
    const [recommended, setRecommended] = useState<PlaylistBrief[] | null>(null)
    const [recommendError, setRecommendError] = useState('')

    const [tags, setTags] = useState<string[]>([])
    const [tagsExpanded, setTagsExpanded] = useState(false)
    const [activeTag, setActiveTag] = useState('全部')

    /**
     * 网格数据**带着它是哪个分类的**一起存。
     * 于是"正在加载"不必靠 effect 里抢先 setState(true) 来表达：
     * 手上这份数据的 tag 跟当前选中的不一样，就是在加载 —— 派生出来的状态不会闪、也不会多一次渲染。
     */
    const [grid, setGrid] = useState<{ tag: string; items: PlaylistBrief[]; total: number; hasMore: boolean }>({
        tag: '',
        items: [],
        total: 0,
        hasMore: false,
    })
    const [moreLoading, setMoreLoading] = useState(false)
    const [gridError, setGridError] = useState('')

    const gridLoading = grid.tag !== activeTag && !gridError

    /** 取一页分类歌单。第一句就是 await：从 effect 里发起也不会同步 setState（那会触发级联渲染） */
    const fetchCategory = useCallback(async (cat: string, offset: number): Promise<CategoryResult | { error: string }> => {
        try {
            const url = `/api/wangyi-playlists?type=category&cat=${encodeURIComponent(cat)}&limit=${GRID_PAGE_SIZE}&offset=${offset}`
            const res = await fetch(url, { cache: 'no-store' })
            const data = await res.json()
            if (data?.code !== 200) return { error: String(data?.msg ?? '歌单加载失败') }
            return {
                items: (data.data?.items ?? []) as PlaylistBrief[],
                total: Number(data.data?.total ?? 0) || 0,
                hasMore: Boolean(data.data?.hasMore),
            }
        } catch {
            return { error: '歌单加载失败，请检查网络' }
        }
    }, [])

    /* 推荐歌单 + 分类目录：各拉一次，互不阻塞 */
    useEffect(() => {
        let alive = true
        fetch('/api/wangyi-playlists?type=recommend&limit=' + RECOMMEND_LIMIT, { cache: 'no-store' })
            .then((res) => res.json())
            .then((data) => {
                if (!alive) return
                if (data?.code === 200 && Array.isArray(data.data?.items)) setRecommended(data.data.items as PlaylistBrief[])
                else setRecommendError(data?.msg ?? '推荐歌单加载失败')
            })
            .catch(() => alive && setRecommendError('推荐歌单加载失败，请检查网络'))

        fetch('/api/wangyi-playlists?type=catalogue', { cache: 'no-store' })
            .then((res) => res.json())
            .then((data) => {
                if (!alive) return
                if (data?.code === 200 && Array.isArray(data.data?.tags)) setTags(data.data.tags as string[])
            })
            .catch(() => {
                /* 分类拿不到就只显示「全部」，不影响推荐与网格 */
            })

        return () => {
            alive = false
        }
    }, [])

    /* 换分类：重新取第一页（setState 全在 await 之后） */
    useEffect(() => {
        let alive = true
        void (async () => {
            const page = await fetchCategory(activeTag, 0)
            if (!alive) return
            if ('error' in page) {
                setGridError(page.error)
                return
            }
            setGrid({ tag: activeTag, items: page.items, total: page.total, hasMore: page.hasMore })
        })()
        return () => {
            alive = false
        }
    }, [activeTag, fetchCategory])

    /** 加载更多：点击触发，追加到现有列表后面 */
    const loadMore = async () => {
        setMoreLoading(true)
        const page = await fetchCategory(activeTag, grid.items.length)
        setMoreLoading(false)
        if ('error' in page) {
            setGridError(page.error)
            return
        }
        setGrid((prev) => (prev.tag === activeTag ? { ...prev, items: [...prev.items, ...page.items], total: page.total, hasMore: page.hasMore } : prev))
    }

    /** 失败重试：清掉错误再取一次第一页 */
    const retryCategory = async () => {
        setGridError('')
        setGrid({ tag: '', items: [], total: 0, hasMore: false })
        const page = await fetchCategory(activeTag, 0)
        if ('error' in page) {
            setGridError(page.error)
            return
        }
        setGrid({ tag: activeTag, items: page.items, total: page.total, hasMore: page.hasMore })
    }

    const visibleTags = tagsExpanded ? tags : tags.slice(0, TAG_PREVIEW_COUNT)
    /* 头几张进轮播，其余铺网格 —— 一共 24 张，够两屏看。
       必须 useMemo：slice() 每次渲染都产生新数组，而轮播那边会监听"数据是否换了"，
       数组身份一变它就以为换了一批、把当前页重置回第一张 —— 表现就是"点了闪一下没跳过去"。 */
    const carouselItems = useMemo(() => (recommended ? recommended.slice(0, CAROUSEL_SIZE) : []), [recommended])
    const restItems = useMemo(() => (recommended ? recommended.slice(CAROUSEL_SIZE) : []), [recommended])

    return (
        <div className="flex w-full flex-col gap-7 pb-2">
            {/* ── 今日推荐：大图轮播 ──
                以前这里是一排横向卡片，桌面端既没有可见滚动条、鼠标又拖不动，等于看不全 ——
                现在头几张做成轮播，其余的铺成网格，一屏能看全，也更好看。 */}
            {recommendError ? (
                <p className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[12px] text-white/45">
                    {recommendError}
                </p>
            ) : (
                <PlaylistCarousel items={carouselItems} onOpen={onOpenPlaylist} loading={recommended === null} />
            )}

            {recommended !== null && recommended.length > CAROUSEL_SIZE && (
                <section>
                    <header className="mb-3 flex items-end justify-between gap-3">
                        <div>
                            <h2 className="text-[15px] font-semibold text-white/90 sm:text-[17px]">更多推荐</h2>
                            <p className="mt-0.5 text-[11px] text-white/35">每天更新的歌单，来自网易云推荐</p>
                        </div>
                        <span className="shrink-0 font-mono text-[11px] text-white/25">{recommended.length} 张</span>
                    </header>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
                        {restItems.map((item, index) => (
                            <PlaylistCard key={item.id} item={item} index={index} onOpen={onOpenPlaylist} />
                        ))}
                    </div>
                </section>
            )}

            {/* ── 分类 ── */}
            <section>
                <div className="scrollbar-hidden -mx-1 flex flex-wrap items-center gap-2 px-1">
                    {['全部', ...visibleTags].map((tag) => {
                        const active = tag === activeTag
                        return (
                            <button
                                key={tag}
                                type="button"
                                onClick={() => setActiveTag(tag)}
                                aria-pressed={active}
                                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] transition ${
                                    active
                                        ? 'border-[#ec4141]/40 bg-[#ec4141]/15 text-[#ff9d9d]'
                                        : 'border-white/10 bg-white/[0.05] text-white/55 hover:border-white/20 hover:text-white/85'
                                }`}
                            >
                                {tag}
                            </button>
                        )
                    })}
                    {tags.length > TAG_PREVIEW_COUNT && (
                        <button
                            type="button"
                            onClick={() => setTagsExpanded((v) => !v)}
                            className="shrink-0 rounded-full px-2.5 py-1.5 text-[12px] text-white/40 transition hover:text-white/80"
                        >
                            {tagsExpanded ? '收起' : `更多分类 +${tags.length - TAG_PREVIEW_COUNT}`}
                        </button>
                    )}
                </div>
            </section>

            {/* ── 网格 ── */}
            <section>
                <header className="mb-3 flex items-end justify-between gap-3">
                    <h2 className="text-[15px] font-semibold text-white/90 sm:text-[17px]">
                        {activeTag === '全部' ? '热门歌单' : activeTag}
                    </h2>
                    {grid.total > 0 && <span className="shrink-0 font-mono text-[11px] text-white/25">{grid.total} 张</span>}
                </header>

                {gridError ? (
                    <div className="flex flex-col items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/[0.08] px-4 py-4">
                        <p className="flex items-center gap-2 text-[12px] text-red-200/85">
                            <IconAlert className="h-4 w-4 shrink-0" />
                            {gridError}
                        </p>
                        <button
                            type="button"
                            onClick={() => void retryCategory()}
                            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 text-[12px] text-white/75 transition hover:bg-white/12 hover:text-white"
                        >
                            <IconRetry className="h-3.5 w-3.5" />
                            重试
                        </button>
                    </div>
                ) : gridLoading ? (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} className="animate-pulse">
                                <div className="aspect-square rounded-2xl bg-white/[0.05]" />
                                <div className="mt-2.5 h-3 w-4/5 rounded bg-white/[0.05]" />
                                <div className="mt-1.5 h-2.5 w-1/3 rounded bg-white/[0.04]" />
                            </div>
                        ))}
                    </div>
                ) : grid.items.length === 0 ? (
                    <p className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-6 text-center text-[12px] text-white/40">
                        这个分类暂时没有歌单
                    </p>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
                            {grid.items.map((item, index) => (
                                <PlaylistCard key={item.id} item={item} index={index} onOpen={onOpenPlaylist} />
                            ))}
                        </div>
                        {grid.hasMore && (
                            <div className="mt-7 flex justify-center">
                                <button
                                    type="button"
                                    onClick={() => void loadMore()}
                                    disabled={moreLoading}
                                    className="inline-flex h-9 items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-5 text-[12px] text-white/70 transition hover:bg-white/12 hover:text-white disabled:opacity-50"
                                >
                                    {moreLoading && <IconSpinner className="h-3.5 w-3.5" />}
                                    {moreLoading ? '加载中' : '加载更多'}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </section>
        </div>
    )
}

/* ── 方卡 ── */

function PlaylistCard({
    item,
    index,
    onOpen,
}: {
    item: PlaylistBrief
    index: number
    onOpen: (id: string, autoPlay?: boolean) => void
}) {
    return (
        <div
            className="group"
            style={{ animation: 'wy-rise .32s ease-out both', animationDelay: `${Math.min(index * 24, 320)}ms` }}
        >
            <div className="relative overflow-hidden rounded-2xl ring-1 ring-white/[0.08] transition duration-300 hover:ring-white/25">
                <span className="relative block aspect-square">
                    <CoverImage src={item.cover} alt={item.name} sizes="(max-width: 640px) 45vw, 220px" hoverZoom />
                    {/* 播放量徽标：黑玻璃，压在最右下角 */}
                    <span className="pointer-events-none absolute bottom-2 right-2 z-20 flex items-center gap-1 rounded-full bg-black/55 px-1.5 py-0.5 font-mono text-[10px] text-white/85 backdrop-blur-sm">
                        <IconHeadphones className="h-3 w-3" />
                        {formatPlayCount(item.playCount)}
                    </span>
                </span>

                {/* 整卡可点：打开详情 */}
                <button
                    type="button"
                    onClick={() => onOpen(item.id)}
                    title={item.name}
                    aria-label={`打开歌单 ${item.name}`}
                    className="absolute inset-0 z-10"
                />
                {/* 悬浮遮罩 + 中央播放钮 */}
                <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/25 opacity-0 transition duration-300 group-hover:opacity-100">
                    <button
                        type="button"
                        onClick={() => onOpen(item.id, true)}
                        title="播放全部"
                        aria-label={`播放歌单 ${item.name}`}
                        className="pointer-events-auto flex h-11 w-11 translate-y-1 items-center justify-center rounded-full bg-[#ec4141] text-white shadow-[0_14px_34px_-14px_rgba(236,65,65,1)] transition duration-300 group-hover:translate-y-0"
                    >
                        <IconPlay className="ml-0.5 h-5 w-5" />
                    </button>
                </span>
            </div>
            <button
                type="button"
                onClick={() => onOpen(item.id)}
                className="mt-2.5 line-clamp-2 block w-full text-left text-[12.5px] leading-snug text-white/80 transition hover:text-white"
            >
                {item.name}
            </button>
            <p className="mt-1 font-mono text-[10.5px] text-white/30">{item.trackCount} 首</p>
        </div>
    )
}

/* ── 封面：native lazy + 渐显（不逐张请求接口） ── */

function CoverImage({ src, alt, sizes, hoverZoom = false }: { src: string; alt: string; sizes: string; hoverZoom?: boolean }) {
    const [loaded, setLoaded] = useState(false)
    return (
        <>
            {/* 底色占位：图没到之前也不是一块纯黑 */}
            <span className="absolute inset-0 bg-white/[0.04]" aria-hidden="true" />
            {src && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={src}
                    alt={alt}
                    loading="lazy"
                    decoding="async"
                    sizes={sizes}
                    onLoad={() => setLoaded(true)}
                    onError={() => setLoaded(true)}
                    className={`absolute inset-0 h-full w-full object-cover transition duration-500 ${
                        loaded ? 'opacity-100 blur-0' : 'opacity-0 blur-md'
                    } ${hoverZoom ? 'group-hover:scale-[1.05]' : ''}`}
                />
            )}
        </>
    )
}
