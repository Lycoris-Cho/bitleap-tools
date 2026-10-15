'use client'

/*
 * 今日推荐轮播 —— 发现页顶部那条大图。
 *
 * 用的是推荐歌单自己的封面：同一张图放大模糊铺满做底、原图放在左侧当主视觉，
 * 于是不需要额外的横幅素材，也不会把方图裁得乱七八糟。
 *
 * 几点刻意的处理：
 *   ① 自动播放会在**悬停 / 拖动 / 切到后台**时停下 —— 用户正在看的那一张不该被抢走；
 *   ② 指针拖动可以翻页（移动端最主要的操作方式），拖过 40px 就算一次翻页；
 *   ③ 键盘方向键**不接**：整页已经用 ←/→ 做快进快退，这里再抢一次必然打架，
 *      所以翻页入口是两侧箭头 + 底部圆点（都可聚焦、都有 aria）。
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PlaylistBrief } from '../types'
import { formatPlayCount } from '../utils'
import { IconHeadphones, IconNext, IconPlay, IconPrev } from './icons'

interface PlaylistCarouselProps {
    items: PlaylistBrief[]
    onOpen: (id: string, autoPlay?: boolean) => void
    /** 数据还没到时渲染骨架 */
    loading?: boolean
}

/** 自动翻页间隔（毫秒） */
const AUTO_MS = 5200
/** 拖过这么多像素算一次翻页 */
const SWIPE_THRESHOLD = 40

export default function PlaylistCarousel({ items, onOpen, loading = false }: PlaylistCarouselProps) {
    const [index, setIndex] = useState(0)
    const [paused, setPaused] = useState(false)
    /**
     * 拖动状态。
     * 用 setPointerCapture 把后续事件锁在这个容器上：手指划出边界后松手也能收到 pointerup，
     * 否则 dragRef 会一直挂着，下一次随便哪里松手都可能被当成一次翻页。
     */
    const dragRef = useRef<{ id: number; startX: number } | null>(null)
    /** 刚发生过拖动：这一次的 click 要吞掉，不然"划一下"会连带把划到的歌单点开 */
    const swallowClickRef = useRef(false)

    const count = items.length
    const current = count > 0 ? ((index % count) + count) % count : 0

    const go = useCallback(
        (delta: number) => {
            if (count <= 1) return
            setIndex((prev) => (((prev + delta) % count) + count) % count)
        },
        [count]
    )

    /* 自动翻页：悬停/拖动时不走，页面切到后台也不走（回来时不该一次跳好几张） */
    useEffect(() => {
        if (paused || count <= 1) return
        const timer = setInterval(() => {
            if (typeof document !== 'undefined' && document.hidden) return
            setIndex((prev) => (prev + 1) % count)
        }, AUTO_MS)
        return () => clearInterval(timer)
    }, [paused, count])

    /* 数据换了（比如重新拉了一次推荐）：回到第一张。
       依赖用**内容**（id 串）而不是数组本身：父组件重渲染时很容易传进来一个新的同内容数组，
       按数组身份判断会天天误判成"换了数据"，把用户刚翻到的那张重置掉。

       放进微任务里而不是直接在 effect 体内 setState —— 后者会被判为"渲染期级联"，也会多一次同步渲染。 */
    const itemsKey = items.map((item) => item.id).join('|')
    useEffect(() => {
        let alive = true
        void Promise.resolve().then(() => {
            if (alive) setIndex(0)
        })
        return () => {
            alive = false
        }
    }, [itemsKey])

    const skeletonHeight = 'h-[210px] sm:h-[250px]'
    if (loading || count === 0) {
        return <div className={`w-full animate-pulse rounded-2xl bg-white/[0.05] ${skeletonHeight}`} />
    }

    return (
        <section
            aria-roledescription="轮播"
            aria-label="今日推荐歌单"
            className={`group relative w-full overflow-hidden rounded-2xl ring-1 ring-white/[0.08] ${skeletonHeight}`}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            /* 指针按下就先停住自动翻页：否则正在点的那一张会在指针底下被换走 ——
               "有时候点不动"多半就是这么来的（点下去是 A，松手时已经是 B）。
               注意这里**不能** setPointerCapture：指针一旦被容器捕获，click 的目标会退回容器本身，
               卡片、播放按钮、左右箭头的 onClick 就全都收不到了（整条轮播点不动）。 */
            onPointerDown={(event) => {
                dragRef.current = { id: event.pointerId, startX: event.clientX }
                swallowClickRef.current = false
                setPaused(true)
            }}
            onPointerMove={(event) => {
                const drag = dragRef.current
                if (!drag || drag.id !== event.pointerId) return
                const dx = event.clientX - drag.startX
                if (Math.abs(dx) < SWIPE_THRESHOLD) return
                // 越过阈值就立刻翻页（不等抬手，手感更跟手），并吞掉随之而来的那次 click
                dragRef.current = null
                swallowClickRef.current = true
                go(dx < 0 ? 1 : -1)
            }}
            onPointerUp={() => {
                dragRef.current = null
                setPaused(false)
            }}
            onPointerCancel={() => {
                dragRef.current = null
                setPaused(false)
            }}
            /* 划过的那一下不要连带点开歌单 */
            onClickCapture={(event) => {
                if (!swallowClickRef.current) return
                swallowClickRef.current = false
                event.preventDefault()
                event.stopPropagation()
            }}
        >
            {/* 交叉淡入，而不是横向滑动。
                滑动时按钮一直在移动：按下时指针在 A 上、抬起时 A 已经滑走，浏览器就丢弃这次 click ——
                那正是"有时候点不动"。淡入淡出时按钮位置不动，怎么点都不会丢。 */}
            {items.map((item, i) => (
                <div
                    key={item.id}
                    aria-hidden={i !== current}
                    className={`absolute inset-0 transition-opacity duration-700 ease-out ${
                        i === current ? 'opacity-100' : 'pointer-events-none opacity-0'
                    }`}
                >
                    {/* 底：同一张封面放大模糊，撑满整条 */}
                    {item.cover && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={item.cover}
                            alt=""
                            aria-hidden="true"
                            className={`absolute inset-0 h-full w-full object-cover opacity-40 blur-2xl saturate-150 transition-transform duration-[1200ms] ${
                                i === current ? 'scale-110' : 'scale-100'
                            }`}
                        />
                    )}
                    <span className="absolute inset-0 bg-gradient-to-r from-black/88 via-black/55 to-black/25" />

                    <div className="relative flex h-full items-center gap-4 px-4 pr-14 sm:gap-6 sm:px-7">
                        {item.cover && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={item.cover}
                                alt={item.name}
                                loading={i === 0 ? 'eager' : 'lazy'}
                                className="aspect-square h-[58%] shrink-0 rounded-xl object-cover shadow-[0_22px_50px_-22px_rgba(0,0,0,1)] ring-1 ring-white/12"
                            />
                        )}
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] uppercase tracking-[0.22em] text-white/40">今日推荐</p>
                            <h3 className="mt-1.5 line-clamp-2 text-[16px] font-bold leading-snug text-white sm:text-[21px]">
                                {item.name}
                            </h3>
                            {item.copywriter && (
                                <p className="mt-1.5 hidden line-clamp-1 text-[12px] text-white/50 sm:block">{item.copywriter}</p>
                            )}
                            <p className="mt-2 flex items-center gap-2 text-[11px] text-white/45">
                                <IconHeadphones className="h-3 w-3" />
                                {formatPlayCount(item.playCount)}
                                <span className="text-white/20">·</span>
                                {item.trackCount} 首
                            </p>
                            <button
                                type="button"
                                onClick={() => onOpen(item.id, true)}
                                className="relative z-20 mt-3.5 inline-flex h-9 items-center gap-2 rounded-full bg-[#ec4141] px-4 text-[12.5px] font-medium text-white shadow-[0_14px_34px_-16px_rgba(236,65,65,1)] transition hover:bg-[#d73535] active:scale-[.98]"
                            >
                                <IconPlay className="h-3.5 w-3.5" />
                                播放全部
                            </button>
                        </div>
                    </div>

                    {/* 整张可点：进歌单详情 */}
                    <button
                        type="button"
                        onClick={() => onOpen(item.id)}
                        aria-label={`打开歌单 ${item.name}`}
                        className="absolute inset-0 z-10"
                    />
                </div>
            ))}

            {/* 翻页箭头：桌面端悬停出现，触屏一直显示 */}
            {count > 1 && (
                <>
                    <button
                        type="button"
                        onClick={() => go(-1)}
                        aria-label="上一张推荐"
                        className="absolute left-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white/85 backdrop-blur transition hover:bg-black/70 hover:text-white sm:pointer-events-none sm:opacity-0 sm:group-hover:pointer-events-auto sm:group-hover:opacity-100"
                    >
                        <IconPrev className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => go(1)}
                        aria-label="下一张推荐"
                        className="absolute right-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white/85 backdrop-blur transition hover:bg-black/70 hover:text-white sm:pointer-events-none sm:opacity-0 sm:group-hover:pointer-events-auto sm:group-hover:opacity-100"
                    >
                        <IconNext className="h-4 w-4" />
                    </button>
                </>
            )}

            {/* 圆点：靠右下角，不占左下角那块内容区
                （放正中间时，窄屏会和「播放全部」按钮叠在一起，点下去变成翻页 —— 也是"点不动"的一种） */}
            {count > 1 && (
                <div className="absolute bottom-2.5 right-4 z-20 flex items-center gap-1.5">
                    {items.map((item, i) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => setIndex(i)}
                            aria-label={`第 ${i + 1} 张：${item.name}`}
                            aria-current={i === current}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                i === current ? 'w-5 bg-white' : 'w-1.5 bg-white/35 hover:bg-white/60'
                            }`}
                        />
                    ))}
                </div>
            )}
        </section>
    )
}
