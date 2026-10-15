'use client'

/*
 * 全屏歌词舞台 —— 两套动画风格 + 一整套外框（歌名、进度条、播放控制、同步校准）。
 *
 * 见 ./lyrics 下的实现：
 *   clock.ts        —— 播放时钟：把 <audio>.currentTime 变成连续、精确、可校准的时间轴
 *   parse.ts        —— 逐词歌词解析（YRC 优先，LRC 摊开兜底）与布局分词
 *   timing.ts       —— 每行的时长分档、换行提前量、逐词时刻
 *   GlowWord.tsx    —— 流光：单个词的 waiting / active / passed 三态动画
 *   ClassicLyrics.tsx —— 流光：整句在场、换句运镜、按时刻逐词点亮
 *   ZenLyrics.tsx   —— 静流：一句一行居中、整列上浮、逐字扫光
 *   sweep.tsx       —— 静流用的逐字扫光层
 *   styles.ts       —— 风格清单（切换器与存档校验读同一份）
 *   offset.ts       —— 歌词偏移的算术（符号约定、步长、边界）
 *
 * 这里只做四件事：
 *   ① 把播放时钟的时刻灌进一个 MotionValue（逐词动画是"订阅时间"，不是"每帧重渲染"）；
 *   ② 由它推出"当前唱到第几行"，换行时才重渲染；
 *   ③ 舞台外框：底色、歌名、进度条、控制按钮、风格切换；
 *   ④ 歌词同步校准：两套风格共用同一个偏移量，改的是时钟读出的时刻，不是各画各的。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValue } from 'framer-motion'
import type { LyricStageStyle, StageLine } from '../lyrics/types'
import { buildStageTheme } from '../lyrics/theme'
import ClassicLyrics from '../lyrics/ClassicLyrics'
import ZenLyrics from '../lyrics/ZenLyrics'
import { LYRIC_STAGE_STYLES, nextLyricStageStyle } from '../lyrics/styles'
import { LYRIC_OFFSET_NUDGE, stepLyricOffset } from '../lyrics/offset'
import { INTERLUDE_FULL_TEXT } from '../lyrics/parse'
import { LINE_ENTER_LEAD } from '../lyrics/timing'
import { formatTime } from '../utils'
import { IconClose, IconNext, IconPause, IconPlay, IconPrev, IconSparkles } from './icons'
import SyncControl from './SyncControl'

type Props = {
    /** 逐词歌词（含间奏占位行），已按行排好序 */
    lines: StageLine[]
    playing: boolean
    /** 校准后的歌词时刻（秒）：逐词动画唯一的时间来源 */
    getTime: () => number
    /** 未校准的媒体时刻（秒）：进度条与拖动用，不能带歌词偏移 */
    getMediaTime?: () => number
    /** 歌词偏移（秒），正数 = 歌词提前；用于补偿蓝牙等输出延迟 */
    lyricOffset?: number
    onLyricOffsetChange?: (offset: number) => void
    /** 本曲是否已单独记住过一个偏移值（面板里会多一行"清除本曲校准"） */
    songOffsetTuned?: boolean
    onClearSongOffset?: () => void
    /** 当前动画风格：流光 / 静流 */
    stageStyle: LyricStageStyle
    onStageStyleChange: (style: LyricStageStyle) => void
    colors: [string, string] | null
    songName: string
    artist: string
    duration: number
    onSeek: (time: number) => void
    onToggle: () => void
    onPrev: () => void
    onNext: () => void
    onClose: () => void
}

/** 二分：最后一个 startTime <= t 的行下标，没有则 -1 */
function findLineIndex(lines: StageLine[], time: number) {
    let left = 0
    let right = lines.length - 1
    let answer = -1
    while (left <= right) {
        const mid = (left + right) >> 1
        if (lines[mid].startTime <= time) {
            answer = mid
            left = mid + 1
        } else {
            right = mid - 1
        }
    }
    return answer
}

/** 这一行最后一个字唱完的时刻（没有逐字数据时退回行尾） */
function lastVoiceEnd(line: StageLine): number {
    return line.words[line.words.length - 1]?.endTime ?? line.endTime
}

/**
 * 当前该由哪一行在场。
 *
 * 两条规则：
 *   ① 新的一句在开唱前 LINE_ENTER_LEAD 就挂上场，入场过渡才有时间跑完，头一个字不会晚亮；
 *   ② 上一句最后一个字还在唱时不换场 —— 逐字歌词里两句的尾音经常是叠着的，
 *      按行首一刀切会把还没唱完的字抹掉。
 *
 * 之前这里是"行尾之后就返回 -1"，于是两句之间只要有一点空档，AnimatePresence 就把整行撤了，
 * 画面在空档里是空的，下一句再重新入场 —— 看着就像画面漏了一拍。现在改成一直留着上一句
 * （它的字都已经是 passed 的回落状态），等下一句接上。
 */
function resolveActiveIndex(lines: StageLine[], time: number) {
    const index = findLineIndex(lines, time + LINE_ENTER_LEAD)
    if (index <= 0) return index
    const previous = lines[index - 1]
    // 间奏的"......"只是占位，不拦换场；真歌词才看尾音
    if (previous.fullText === INTERLUDE_FULL_TEXT) return index
    return lastVoiceEnd(previous) > time ? findLineIndex(lines, time) : index
}

function IconExpand({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={className}>
            <path d="M4 9V4h5M20 15v5h-5M15 4h5v5M9 20H4v-5" />
        </svg>
    )
}

const EMPTY_LINES: StageLine[] = []

export default function LyricsStage({
    lines = EMPTY_LINES,
    playing,
    getTime,
    getMediaTime,
    lyricOffset = 0,
    onLyricOffsetChange,
    songOffsetTuned,
    onClearSongOffset,
    stageStyle,
    onStageStyleChange,
    colors,
    songName,
    artist,
    duration,
    onSeek,
    onToggle,
    onPrev,
    onNext,
    onClose,
}: Props) {
    const rootRef = useRef<HTMLDivElement>(null)
    const seekRef = useRef<HTMLDivElement>(null)
    const draggingRef = useRef(false)
    const getTimeRef = useRef(getTime)
    const getMediaTimeRef = useRef(getMediaTime ?? getTime)

    const currentTime = useMotionValue(0)
    const [activeIndex, setActiveIndex] = useState(-1)
    const [chrome, setChrome] = useState(true)
    const [pos, setPos] = useState(0)
    const [isFs, setIsFs] = useState(false)
    /** 校准面板开着时不让控件栏自己淡出 —— 否则鼠标一停，面板连着一起消失 */
    const [syncOpen, setSyncOpen] = useState(false)

    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const syncOpenRef = useRef(false)

    useEffect(() => {
        getTimeRef.current = getTime
        getMediaTimeRef.current = getMediaTime ?? getTime
    })

    useEffect(() => {
        syncOpenRef.current = syncOpen
    }, [syncOpen])

    const theme = useMemo(() => buildStageTheme({ coverColors: colors }), [colors])
    const hasLyrics = lines.length > 0

    /* 时间轴：把（已校准的）歌词时刻写进 MotionValue；换行才 setState。
       逐词动画订阅的是 MotionValue，所以这里不需要 60fps 的 React 渲染。
       主驱动是 rAF：它跟屏幕刷新对齐，写进去的值正好是这一帧要画的值。
       另有一条低频定时器兜底 —— 浏览器暂停 rAF 的情形不止"页面被隐藏"，被遮挡、面板没在合成时
       rAF 也会停；只按 document.hidden 判断会在那种情况下让整条时间轴冻住。
       两条同时写同一个 MotionValue 是幂等的，而时间本身来自播放时钟（它自己会跟音频对齐），
       所以兜底这条哪怕慢，也只会让画面顿一下，不会让时间偏掉。 */
    useEffect(() => {
        let lastIndex = Number.NaN
        const tick = () => {
            const t = getTimeRef.current()
            currentTime.set(t)
            const index = resolveActiveIndex(lines, t)
            if (index !== lastIndex) {
                lastIndex = index
                setActiveIndex(index)
            }
        }
        let raf = 0
        const frame = () => {
            raf = requestAnimationFrame(frame)
            tick()
        }
        raf = requestAnimationFrame(frame)
        const timer = setInterval(tick, 250)
        return () => {
            cancelAnimationFrame(raf)
            clearInterval(timer)
        }
    }, [lines, currentTime])

    /* 进度条用的粗粒度时钟：这里读的是**未校准**的媒体时刻，拖动条不能跟着歌词偏移动 */
    useEffect(() => {
        const tick = () => {
            if (!draggingRef.current) setPos(getMediaTimeRef.current())
        }
        tick()
        const timer = setInterval(tick, 200)
        return () => clearInterval(timer)
    }, [])

    useEffect(() => () => {
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }, [])

    /* 打开时锁页面滚动。舞台内的按键在下面（要等 nudgeOffset 就位） */
    useEffect(() => {
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        const onFs = () => setIsFs(Boolean(document.fullscreenElement))
        document.addEventListener('fullscreenchange', onFs)
        return () => {
            document.body.style.overflow = prev
            document.removeEventListener('fullscreenchange', onFs)
        }
    }, [])

    const armHide = useCallback(() => {
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
        hideTimerRef.current = setTimeout(() => {
            // 校准面板正开着：控件栏必须留着，否则面板会跟着一起淡掉
            if (syncOpenRef.current) return
            setChrome(false)
        }, 3500)
    }, [])
    const wake = useCallback(() => {
        setChrome(true)
        armHide()
    }, [armHide])

    /* 偏移的微调走同一套算术（lyrics/offset.ts）：步长、符号、边界只有一处定义。
       顺带 wake()：用快捷键调完，控件栏要露出来让用户看见那个毫秒数变了。 */
    const nudgeOffset = useCallback(
        (delta: number) => {
            onLyricOffsetChange?.(stepLyricOffset(lyricOffset, delta))
            wake()
        },
        [lyricOffset, onLyricOffsetChange, wake]
    )

    /* 舞台内的按键：Esc 退出、S 换风格、[ ] 校准歌词同步 */
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
            if (e.key === 'Escape') {
                // 校准面板开着：这一下 Esc 属于它，它自己会关（见 SyncControl）
                if (syncOpenRef.current) return
                if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
                else onClose()
                return
            }
            if (e.key === 's' || e.key === 'S') {
                onStageStyleChange(nextLyricStageStyle(stageStyle))
                return
            }
            // 方括号：词比声音快就延后，词比声音慢就提前（符号约定见 lyrics/offset.ts）
            if (e.key === '[') nudgeOffset(-LYRIC_OFFSET_NUDGE)
            else if (e.key === ']') nudgeOffset(LYRIC_OFFSET_NUDGE)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose, onStageStyleChange, stageStyle, nudgeOffset])

    useEffect(() => {
        if (!playing) return
        armHide()
        return () => {
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
        }
    }, [playing, armHide])

    const toggleFullscreen = () => {
        const el = rootRef.current
        if (!el) return
        if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
        else void el.requestFullscreen?.().catch(() => {})
    }

    const seekFromEvent = (clientX: number) => {
        const el = seekRef.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)))
        const target = ratio * (duration || 0)
        setPos(target)
        onSeek(target)
    }

    const progress = duration > 0 ? Math.max(0, Math.min(1, pos / duration)) : 0
    const chromeVisible = chrome || !playing || syncOpen
    // 小屏那个轮换按钮要显示当前档的名字，所以先取出来
    const currentStyleOption =
        LYRIC_STAGE_STYLES.find((option) => option.id === stageStyle) ?? LYRIC_STAGE_STYLES[0]

    return (
        <div
            ref={rootRef}
            onMouseMove={wake}
            onTouchStart={wake}
            data-line={activeIndex}
            data-style={stageStyle}
            className="fixed inset-0 z-[70] select-none overflow-hidden"
            style={{ background: theme.backgroundColor, animation: 'fls-in .5s ease-out' }}
            role="dialog"
            aria-label="全屏歌词"
        >
            <style>{'@keyframes fls-in { from { opacity: 0 } to { opacity: 1 } }'}</style>

            {/* 歌词本体：两套风格共用同一个时刻。切换时交叉淡入淡出 —— 两套都在同一块幕布上，
                硬切会让底色的光晕闪一下，淡一下过去更像"换了个唱法"而不是"换了个页面"。 */}
            {hasLyrics && (
                <AnimatePresence initial={false}>
                    <motion.div
                        key={stageStyle}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.45, ease: 'easeInOut' }}
                        className="absolute inset-0"
                    >
                        {stageStyle === 'zen' ? (
                            <ZenLyrics lines={lines} currentLineIndex={activeIndex} currentTime={currentTime} theme={theme} />
                        ) : (
                            <ClassicLyrics lines={lines} currentLineIndex={activeIndex} currentTime={currentTime} theme={theme} />
                        )}
                    </motion.div>
                </AnimatePresence>
            )}

            {/* 无歌词：纯音乐或该曲暂无歌词 */}
            {!hasLyrics && (
                <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
                    <p className="text-[13px]" style={{ color: 'rgba(255,255,255,.4)' }}>
                        纯音乐，或该歌曲暂未提供歌词
                    </p>
                </div>
            )}

            {/* 左上角常驻：歌名 / 歌手 */}
            <div className="absolute left-5 top-5 z-20 max-w-[46vw] sm:left-7 sm:top-6 sm:max-w-[52vw]">
                <h2 className="truncate text-[15px] font-semibold text-white/95 sm:text-[17px]">{songName}</h2>
                <p className="mt-1 truncate text-[12px] text-white/50">{artist}</p>
            </div>

            {/* 右上角：风格切换 + 全屏 + 关闭，跟着 chrome 一起淡出 */}
            <div
                className={`absolute right-5 top-5 z-20 flex shrink-0 items-center gap-2 transition-opacity duration-500 sm:right-7 sm:top-6 ${
                    chromeVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
            >
                {/* 大屏：三档平铺，一眼看全。小屏放不下三个 —— 一个按钮轮换，当前档的名字写在按钮上 */}
                <div
                    role="group"
                    aria-label="歌词动画风格"
                    className="hidden items-center rounded-full border border-white/15 bg-white/10 p-0.5 backdrop-blur sm:flex"
                >
                    {LYRIC_STAGE_STYLES.map((option) => (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => onStageStyleChange(option.id)}
                            aria-pressed={stageStyle === option.id}
                            title={`${option.hint}（快捷键 S 切换）`}
                            className={`h-7 rounded-full px-3 text-[11px] transition ${
                                stageStyle === option.id ? 'bg-white/22 text-white' : 'text-white/55 hover:text-white/85'
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={() => onStageStyleChange(nextLyricStageStyle(stageStyle))}
                    title={`${currentStyleOption.hint}（点一下换下一档，快捷键 S）`}
                    aria-label={`切换歌词动画风格，当前 ${currentStyleOption.label}`}
                    className="flex h-8 items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 text-[11px] text-white/85 backdrop-blur transition hover:bg-white/20 hover:text-white sm:hidden"
                >
                    <IconSparkles className="h-3.5 w-3.5" />
                    {currentStyleOption.label}
                </button>
                <button
                    type="button"
                    onClick={toggleFullscreen}
                    aria-label={isFs ? '退出全屏' : '进入全屏'}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/80 backdrop-blur transition hover:bg-white/20 hover:text-white"
                >
                    <IconExpand className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    onClick={() => {
                        if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
                        onClose()
                    }}
                    aria-label="关闭歌词"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/80 backdrop-blur transition hover:bg-white/20 hover:text-white"
                >
                    <IconClose className="h-4 w-4" />
                </button>
            </div>

            {/* 底栏 */}
            <div
                className={`absolute inset-x-0 bottom-0 z-20 px-4 pt-10 transition-opacity duration-500 sm:px-7 ${
                    chromeVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
                style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}
            >
                <div
                    ref={seekRef}
                    onPointerDown={(e) => {
                        draggingRef.current = true
                        e.currentTarget.setPointerCapture(e.pointerId)
                        seekFromEvent(e.clientX)
                    }}
                    onPointerMove={(e) => {
                        if (draggingRef.current) seekFromEvent(e.clientX)
                    }}
                    onPointerUp={(e) => {
                        draggingRef.current = false
                        e.currentTarget.releasePointerCapture(e.pointerId)
                    }}
                    className="group flex h-8 cursor-pointer items-center sm:h-5"
                    role="slider"
                    aria-label="播放进度"
                    aria-valuemin={0}
                    aria-valuemax={Math.round(duration)}
                    aria-valuenow={Math.round(pos)}
                >
                    <div className="relative h-1 w-full rounded-full bg-white/20">
                        <div className="absolute inset-y-0 left-0 rounded-full bg-white/85" style={{ width: `${progress * 100}%` }} />
                        <div
                            className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-white opacity-0 transition group-hover:opacity-100"
                            style={{ left: `calc(${progress * 100}% - 5px)` }}
                        />
                    </div>
                </div>

                <div className="mt-3 flex items-center gap-3">
                    <span className="w-11 shrink-0 font-mono text-[11px] text-white/75">{formatTime(pos)}</span>

                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={onPrev}
                            aria-label="上一首"
                            className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
                        >
                            <IconPrev className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={onToggle}
                            aria-label={playing ? '暂停' : '播放'}
                            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black transition hover:scale-105"
                        >
                            {playing ? <IconPause className="h-5 w-5" /> : <IconPlay className="ml-0.5 h-5 w-5" />}
                        </button>
                        <button
                            type="button"
                            onClick={onNext}
                            aria-label="下一首"
                            className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
                        >
                            <IconNext className="h-4 w-4" />
                        </button>
                    </div>

                    {/* 总时长：小屏让位给右边的同步控件，进度已经在进度条上了 */}
                    <span className="ml-auto hidden w-11 shrink-0 text-right font-mono text-[11px] text-white/75 sm:block">
                        {formatTime(duration || 0)}
                    </span>

                    {/* 歌词同步校准。
                        播放时钟已经把 <audio> 的采样误差抹平了，剩下唯一修不掉的是**输出延迟**：
                        蓝牙耳机 150~300ms、外接声卡几十毫秒，浏览器不告诉页面这个数，只能让耳朵定。
                        符号约定见 lyrics/offset.ts：+ = 歌词提前。 */}
                    {onLyricOffsetChange && (
                        <SyncControl
                            offset={lyricOffset}
                            onChange={onLyricOffsetChange}
                            songTuned={songOffsetTuned}
                            onClearSongTune={onClearSongOffset}
                            onOpenChange={setSyncOpen}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}
