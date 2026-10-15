/*
 * 静流（zen）模式 —— 与流光、汇聚并列的一档。
 *
 * 一句话：**一次只有一句在唱**，它在正中央，上下各留几行淡影；换句时整列一起上浮。
 *   ① 位置：每行按"离当前行几格"定位（一格 = 一个行距 slot），位移由 framer 用同一条缓动
 *      从旧格挪到新格 —— 所有行同步移动，看上去就是"整列在走"。
 *   ② 层次：只有**透明度**。不缩放、不模糊 —— 缩放与景深模糊会把画面往"立体"上带，
 *      而这一档要的是平铺的留白：字一样大、一样实，只是越远的越淡。
 *   ③ 逐字：当前行的每个词画两层（见 sweep.tsx），亮的右边界跟着这个词自己的时刻往右推，
 *      光顺着字扫过去。这是这一档唯一的"动"，其余都是安静的位移。
 *   ④ 构图不用随机数：这一档的大气来自留白与秩序，不来自参差。
 *
 * 与另两档共用：时钟（currentTime）、逐词时刻（StageWord）、主题与字号、扫光层。
 */

import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { motion, type MotionValue } from 'framer-motion'
import type { StageLine, StageTheme } from './types'
import { INTERLUDE_FULL_TEXT } from './parse'
import { SweepWord, buildLineItems, type LineItem } from './sweep'
import {
    colorWithAlpha,
    resolveSubtitleFontSizes,
    resolveThemeFontStack,
    resolveThemeFontWeight,
    resolveTranslationFontStack,
} from './theme'

/** 当前行的上下各留几行（再多也只是看不到的淡影，白占节点） */
const WINDOW_RADIUS = 4
/** 行距 = 字号 × 这个比例。比行高松，才有"一句一行"的呼吸空间 */
const SLOT_RATIO = 1.66
/** 一行最长占多宽：超过就整行缩字号（缩到底还放不下才折行） */
const MAX_LINE_WIDTH_RATIO = 0.86
const MAX_LINE_WIDTH_PX = 1040
/** 缩字号的底线：再长的句子宁可折成两行，也不要缩成蚂蚁字 */
const MIN_FIT_SCALE = 0.5
/**
 * 量出来的宽度留 3% 余量再拿去缩字号。
 * 排版宽度与"字号 × 字数"之间总有几个百分点的出入（字偶距、字体替换），
 * 正好卡在边界上的句子会因为这点误差折行 —— 留一点余量，让它安稳占一行。
 */
const FIT_SAFETY = 0.97
/** 越远的行越淡：不缩放、不模糊，全交给透明度 */
const FADE_BY_DISTANCE = [1, 0.36, 0.15, 0.055]
/** 列位移的缓动时长（秒）—— 慢一点才"静"，快了就变成刷新 */
const SHIFT_DURATION = 0.62
const SOFT_EASE = [0.22, 1, 0.36, 1] as const

function useViewportSize() {
    const [size, setSize] = useState(() =>
        typeof window === 'undefined'
            ? { width: 1200, height: 800 }
            : { width: window.innerWidth, height: window.innerHeight }
    )
    useEffect(() => {
        const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight })
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    }, [])
    return size
}

/* ── 一行 ── */

interface ZenLineProps {
    line: StageLine
    /** 离"正在唱的那句"几格：0 = 正在唱，负数 = 唱过了 */
    distance: number
    isActive: boolean
    slot: number
    fontPx: number
    maxWidth: number
    theme: StageTheme
    currentTime: MotionValue<number>
    translationFontSize: string
}

const ZenLine = memo(function ZenLine({
    line,
    distance,
    isActive,
    slot,
    fontPx,
    maxWidth,
    theme,
    currentTime,
    translationFontSize,
}: ZenLineProps) {
    const isInterlude = line.fullText === INTERLUDE_FULL_TEXT
    const fontStack = resolveThemeFontStack(theme)
    const fontWeight = resolveThemeFontWeight(theme, 700)

    const { items, text } = useMemo(
        () => (isInterlude ? { items: [] as LineItem[], text: '· · ·' } : buildLineItems(line)),
        [line, isInterlude]
    )

    /*
     * 一句话必须占一行，这是这一档的构图纪律：放不下就整行缩字号。
     *
     * 量的是**真正渲染出来的那个元素**（先把字号调回基准、把折行关掉，量完还原），
     * 而不是另开 canvas 量一遍：canvas 的字体替换与真实排版在有的机器上能差三成
     * （实测：同一句中文，canvas 量 2088px，页面上只排 1503px），按它缩字号会缩错。
     * 也不读 scrollWidth —— 内联元素上那个值会把溢出的子盒也算进去（同样实测偏大）。
     * Range 量的是文字实际排到哪儿，这才是要找的数。
     *
     * 改 state 放在 useLayoutEffect 里，赶在这一帧画出来之前，所以看不到"先大后小"的跳。
     */
    const textRef = useRef<HTMLSpanElement>(null)
    const [fit, setFit] = useState({ scale: 1, wrap: false })

    useLayoutEffect(() => {
        const el = textRef.current
        if (!el) return
        const previousFontSize = el.style.fontSize
        const previousWhiteSpace = el.style.whiteSpace
        el.style.fontSize = `${fontPx}px`
        el.style.whiteSpace = 'pre'
        const range = document.createRange()
        range.selectNodeContents(el)
        const width = range.getBoundingClientRect().width
        el.style.fontSize = previousFontSize
        el.style.whiteSpace = previousWhiteSpace

        let next = { scale: 1, wrap: false }
        if (width > 0 && width > maxWidth) {
            const needed = (maxWidth / width) * FIT_SAFETY
            // 缩到 MIN_FIT_SCALE 依然放不下（手机上遇到特别长的句子）才折行：
            // 折行只是把这一格的文字堆高一点，行距不变，整列的节奏不散。
            next = needed >= MIN_FIT_SCALE ? { scale: needed, wrap: false } : { scale: MIN_FIT_SCALE, wrap: true }
        }
        setFit((prev) => (Math.abs(prev.scale - next.scale) < 0.004 && prev.wrap === next.wrap ? prev : next))
    }, [text, fontPx, maxWidth])

    const { scale: fitScale, wrap } = fit

    const baseColor = colorWithAlpha(theme.primaryColor, isActive ? 0.46 : 0.3)
    const litColor = theme.highlightColor ?? '#fafafa'
    /*
     * 一个字的"光"分两档：贴着字的紧光 + 摊开的远光。
     * 单层要么像描边（半径小时），要么糊成一团（半径大时）；两档叠起来才是"字被点亮"的样子。
     * 亮度压得比较低（.38 / .2）：这一档要的是扫过的一道亮，不是霓虹灯牌。
     */
    const glow = `0 0 14px ${colorWithAlpha(litColor, 0.38)}, 0 0 34px ${colorWithAlpha(litColor, 0.2)}`
    /* 羽化宽度跟字号走：字大，光的斜坡就长一点，否则大字上会看着像被切了一刀 */
    const featherPx = Math.round(Math.min(26, Math.max(10, fontPx * fitScale * 0.3)))
    /* 折行的句子不画扫光层：它可能被折成两段，绝对定位的亮层会叠在第一个片段上。
       这种句子本来就已经缩到最小字号了，整行亮起反而更清楚。 */
    const sweep = isActive && !wrap

    const steps = Math.abs(distance)
    const fade = FADE_BY_DISTANCE[Math.min(steps, FADE_BY_DISTANCE.length - 1)]

    return (
        <motion.div
            initial={false}
            data-distance={distance}
            animate={{ y: distance * slot, opacity: fade }}
            transition={{
                y: { duration: SHIFT_DURATION, ease: SOFT_EASE },
                opacity: { duration: 0.5, ease: 'easeOut' },
            }}
            style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: '50%',
                marginTop: -slot / 2,
                height: slot,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                paddingLeft: 24,
                paddingRight: 24,
                willChange: 'transform, opacity',
            }}
        >
            <span
                ref={textRef}
                style={{
                    fontFamily: fontStack,
                    fontWeight,
                    fontSize: fontPx * fitScale,
                    lineHeight: 1.08,
                    whiteSpace: wrap ? 'normal' : 'pre',
                    maxWidth: wrap ? maxWidth : undefined,
                    textAlign: wrap ? 'center' : undefined,
                    letterSpacing: isInterlude ? '0.5em' : undefined,
                    /*
                     * 亮层带遮罩，浏览器对"被遮罩的元素"只做灰度抗锯齿，而暗层仍走次像素抗锯齿。
                     * 两层各用一套抗锯齿，扫过字中间时能看出笔画粗细/彩边不一致 —— 所以这里统一成灰度，
                     * 让两层用同一套光栅化。
                     */
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale',
                    // 折行时整行亮：这时没有扫光层，颜色得由文字自己承担
                    color: isActive && wrap ? litColor : baseColor,
                    transition: 'color .45s ease',
                }}
            >
                {isInterlude || wrap
                    ? text
                    : items.map((item) =>
                          item.word && sweep ? (
                              <SweepWord
                                  key={item.key}
                                  word={item.word}
                                  currentTime={currentTime}
                                  baseColor={baseColor}
                                  litColor={litColor}
                                  glow={glow}
                                  featherPx={featherPx}
                              />
                          ) : (
                              <span key={item.key} style={{ whiteSpace: 'pre', color: 'inherit', transition: 'color .45s ease' }}>
                                  {item.text}
                              </span>
                          )
                      )}
            </span>

            {/* 译文跟着这一行走：它属于这句话，不该单独浮在别处 */}
            {isActive && line.translation && (
                <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 0.55, y: 0 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    style={{
                        marginTop: fontPx * 0.16,
                        maxWidth,
                        color: theme.primaryColor,
                        fontSize: translationFontSize,
                        fontFamily: resolveTranslationFontStack(theme),
                        fontWeight: resolveThemeFontWeight(theme, 500),
                        textAlign: 'center',
                    }}
                >
                    {line.translation}
                </motion.p>
            )}
        </motion.div>
    )
})

/* ── 舞台 ── */

export interface ZenLyricsProps {
    lines: StageLine[]
    currentLineIndex: number
    currentTime: MotionValue<number>
    theme: StageTheme
    lyricsFontScale?: number
}

export default function ZenLyrics({ lines, currentLineIndex, currentTime, theme, lyricsFontScale = 1 }: ZenLyricsProps) {
    const { width } = useViewportSize()

    /* 字号与另两档同一条 clamp：切换风格时字不会突然变大变小 */
    const baseFontPx = useMemo(() => {
        const rem = 16
        const minPx = 2.25 * lyricsFontScale * rem
        const valPx = (6 * lyricsFontScale * width) / 100
        const maxPx = 4.5 * lyricsFontScale * rem
        return Math.max(minPx, Math.min(valPx, maxPx))
    }, [width, lyricsFontScale])

    const slot = baseFontPx * SLOT_RATIO
    const maxWidth = Math.max(240, Math.min(width * MAX_LINE_WIDTH_RATIO, MAX_LINE_WIDTH_PX))
    const { translationFontSize } = resolveSubtitleFontSizes(lyricsFontScale)

    /* 前奏还没有歌词时（currentLineIndex = -1）把第一句放在中央当"预告"，
       但不点亮它 —— 唱到哪句才亮哪句。 */
    const center = currentLineIndex < 0 ? 0 : currentLineIndex
    const start = Math.max(0, center - WINDOW_RADIUS)
    const end = Math.min(lines.length, center + WINDOW_RADIUS + 1)
    const visible = lines.slice(start, end)

    return (
        <div className="relative h-full w-full overflow-hidden">
            {/* 上下两端淡出：一列字不是被裁掉的，是"走进走出画面" */}
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    maskImage: 'linear-gradient(to bottom, transparent 3%, #000 26%, #000 74%, transparent 97%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, transparent 3%, #000 26%, #000 74%, transparent 97%)',
                }}
            >
                {visible.map((line, index) => (
                    <ZenLine
                        key={line.startTime}
                        line={line}
                        distance={start + index - center}
                        isActive={start + index === currentLineIndex}
                        slot={slot}
                        fontPx={baseFontPx}
                        maxWidth={maxWidth}
                        theme={theme}
                        currentTime={currentTime}
                        translationFontSize={translationFontSize}
                    />
                ))}
            </div>
        </div>
    )
}
