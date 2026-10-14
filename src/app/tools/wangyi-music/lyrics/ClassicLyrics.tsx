/*
 * classic「流光」模式 —— 行为对照开源播放器 Folia（AGPL-3.0）的 classic Visualizer 重写。
 *
 * 一句话：**一整句同时在场**，唱到哪个单位、哪个单位才弹出来。
 *   ① 外层容器整句一起轻轻起伏（呼吸），不让人在场面上感觉到"静止"；
 *   ② 换句时整行做一个"模糊淡入 / 放大化开"的入场离场（AnimatePresence popLayout），
 *      极短的碎句走 fast / none，避免抖；
 *   ③ 句内每个词由 GlowWord 自己按时刻切 waiting / active / passed，
 *      位移、缩放、旋转、光晕、模糊都由 framer-motion 接管。
 *
 * 构图（位置 / 缩放 / 旋转 / 词距）用**行起点时刻**做种子，确定性随机：
 * 同一句每次看都一样，时间只负责换状态、不负责改构图。
 */

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, type MotionValue } from 'framer-motion'
import type { StageLine, StageTheme, StageWord } from './types'
import { buildDisplayWords } from './parse'
import {
    buildGlowWordLayoutVariants,
    GlowWord,
    type WordLayoutConfig,
} from './GlowWord'
import { getLineContainerMotion, resolveGlowWordProfile } from './timing'
import {
    colorWithAlpha,
    resolveSubtitleFontSizes,
    resolveThemeFontStack,
    resolveThemeFontWeight,
    resolveTranslationFontStack,
    resolveWordColor,
} from './theme'

const DEFAULT_CLASSIC_TUNING = {
    enableWordRotation: true,
    breathingFloatMultiplier: 1,
    wordSpacing: 0.7,
}

/* ── 量词宽：布局必须自己预留"放大之后"的宽度，否则当前词一弹就会压到邻居 ── */

let measureCanvas: HTMLCanvasElement | null = null
function measureWordWidth(text: string, px: number, fontStack: string, fontWeight: number): number {
    if (typeof document === 'undefined') return text.length * px * 0.65
    if (!measureCanvas) measureCanvas = document.createElement('canvas')
    const ctx = measureCanvas.getContext('2d')
    if (!ctx) return text.length * px * 0.65
    ctx.font = `${fontWeight} ${px}px ${fontStack}`
    return ctx.measureText(text).width
}

interface LineLayoutConfig {
    justifyContent: string
    alignItems: string
    perspective: number
}

/* ── 运行时：当前该关心哪一行 ── */

interface RuntimeState {
    activeLine: StageLine | null
    recentCompletedLine: StageLine | null
    nextLines: StageLine[]
}

function useStageRuntime(lines: StageLine[], currentTime: MotionValue<number>, currentLineIndex: number): RuntimeState {
    const time = currentTime.get()
    const activeLine = lines[currentLineIndex] ?? null

    const recentCompletedLine = useMemo(() => {
        if (currentLineIndex !== -1 || lines.length === 0) return null
        for (let i = lines.length - 1; i >= 0; i -= 1) {
            if (time > lines[i].endTime) return lines[i]
        }
        return null
    }, [currentLineIndex, time, lines])

    const nextLines = useMemo(() => {
        if (currentLineIndex < 0) return []
        return lines.slice(currentLineIndex + 1, currentLineIndex + 3)
    }, [currentLineIndex, lines])

    return { activeLine, recentCompletedLine, nextLines }
}

/* ── 底部字幕：译文 / 下一句预览 ── */

const hasReadableText = (text?: string | null) => !!text && /[\p{L}\p{N}]/u.test(text)

interface SubtitleOverlayProps {
    activeLine: StageLine | null
    recentCompletedLine: StageLine | null
    nextLines: StageLine[]
    theme: StageTheme
    translationFontSize: string
    upcomingFontSize: string
}

function SubtitleOverlay({
    activeLine,
    recentCompletedLine,
    nextLines,
    theme,
    translationFontSize,
    upcomingFontSize,
}: SubtitleOverlayProps) {
    const translation = [activeLine, recentCompletedLine]
        .map((line) => (line && hasReadableText(line.translation) ? line.translation : null))
        .find((text) => Boolean(text)) as string | undefined
    const upcoming = translation ? [] : nextLines.filter((line) => hasReadableText(line.fullText)).slice(0, 2)
    const shouldRender = Boolean(translation) || (Boolean(activeLine) && upcoming.length > 0)
    const textShadow = `0 1px 2px ${colorWithAlpha(theme.backgroundColor, 0.24)}`

    return (
        <AnimatePresence>
            {shouldRender && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 0.6, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ opacity: { duration: 0.24, ease: 'easeOut' }, y: { duration: 0.24, ease: 'easeOut' } }}
                    style={{ bottom: '11.5vh' }}
                    className="pointer-events-none absolute left-0 right-0 z-20 px-4 text-center"
                >
                    {translation ? (
                        <motion.div
                            key={`trans-${activeLine?.startTime ?? recentCompletedLine?.startTime}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="mx-auto max-w-4xl"
                            style={{
                                color: theme.secondaryColor,
                                fontSize: translationFontSize,
                                fontFamily: resolveTranslationFontStack(theme),
                                fontWeight: resolveThemeFontWeight(theme, 500),
                                textShadow,
                            }}
                        >
                            {translation}
                        </motion.div>
                    ) : (
                        <div className="space-y-2">
                            {upcoming.map((line, index) => (
                                <p
                                    key={index}
                                    className="mx-auto max-w-2xl truncate blur-[1px] transition-all duration-500"
                                    style={{
                                        color: theme.secondaryColor,
                                        fontSize: upcomingFontSize,
                                        fontWeight: resolveThemeFontWeight(theme, 400),
                                        textShadow,
                                    }}
                                >
                                    {line.fullText}
                                </p>
                            ))}
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    )
}

/* ── 主渲染 ── */

export interface ClassicLyricsProps {
    lines: StageLine[]
    currentLineIndex: number
    currentTime: MotionValue<number>
    theme: StageTheme
    lyricsFontScale?: number
}

export default function ClassicLyrics({ lines, currentLineIndex, currentTime, theme, lyricsFontScale = 1 }: ClassicLyricsProps) {
    const { activeLine, recentCompletedLine, nextLines } = useStageRuntime(lines, currentTime, currentLineIndex)

    const [viewportWidth, setViewportWidth] = useState(() => (typeof window === 'undefined' ? 1200 : window.innerWidth))
    useEffect(() => {
        const onResize = () => setViewportWidth(window.innerWidth)
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    }, [])

    const renderProfile = activeLine ? resolveGlowWordProfile(activeLine) : null
    const containerMotion = getLineContainerMotion(renderProfile)

    const displayWords = useMemo<StageWord[]>(() => (activeLine ? buildDisplayWords(activeLine) : []), [activeLine])

    const mainFontSize = `clamp(${(2.25 * lyricsFontScale).toFixed(3)}rem, ${(6 * lyricsFontScale).toFixed(3)}vw, ${(
        4.5 * lyricsFontScale
    ).toFixed(3)}rem)`
    const { translationFontSize, upcomingFontSize } = resolveSubtitleFontSizes(lyricsFontScale)

    const { wordConfigs, lineConfig } = useMemo(() => {
        if (!activeLine) {
            return { wordConfigs: [] as WordLayoutConfig[], lineConfig: { justifyContent: 'center', alignItems: 'center', perspective: 1000 } as LineLayoutConfig }
        }

        const seed = activeLine.startTime
        const intensity = theme.animationIntensity
        const isChaotic = intensity === 'chaotic'
        const isCalm = intensity === 'calm'

        const justifyOptions = isCalm
            ? ['center']
            : ['flex-start', 'center', 'flex-end', 'space-around', 'space-between']
        const alignOptions = isCalm ? ['center'] : ['flex-start', 'center', 'flex-end']

        const isInterlude = activeLine.fullText === '......'

        const resolvedLineConfig: LineLayoutConfig = {
            justifyContent: isInterlude ? 'center' : justifyOptions[Math.floor(seed % justifyOptions.length)],
            alignItems: alignOptions[Math.floor((seed * 2) % alignOptions.length)],
            perspective: isChaotic ? 500 + (seed % 500) : 1000,
        }

        const fontStack = resolveThemeFontStack(theme)
        const fontWeight = resolveThemeFontWeight(theme, 700)
        const rem = 16
        const minPx = 2.25 * lyricsFontScale * rem
        const valPx = (6 * lyricsFontScale * viewportWidth) / 100
        const maxPx = 4.5 * lyricsFontScale * rem
        const pxFontSize = Math.max(minPx, Math.min(valPx, maxPx))
        const wordWidths = displayWords.map((w) => measureWordWidth(w.text, pxFontSize, fontStack, fontWeight))

        const baseSpread = isChaotic ? 60 : isCalm ? 0 : 20
        const baseRotate = isChaotic ? 30 : isCalm ? 0 : 5

        const configs: WordLayoutConfig[] = displayWords.map((word, i) => {
            const wordSeed = seed + i
            const random = (offset: number) => {
                const x = Math.sin(wordSeed + offset) * 10000
                return x - Math.floor(x)
            }

            if (isInterlude) {
                return {
                    id: `${word.text}-${i}-${seed}`,
                    x: 0,
                    y: (random(2) - 0.5) * 15,
                    rotate: 0,
                    scale: 1.5,
                    passedRotate: 0,
                    marginRight: '3rem',
                    alignSelf: 'center',
                } as WordLayoutConfig & { marginRight: string; alignSelf: string }
            }

            const scale = isChaotic ? 0.8 + random(4) * 0.6 : 1.1 + random(4) * 0.2
            const xVal = (random(1) - 0.5) * baseSpread * 2
            const yVal = (random(2) - 0.5) * baseSpread * 2

            let marginRight = isChaotic ? `${random(5) * 1.5}rem` : '0.8rem'

            // 精确留白：按相邻两词"各自最大状态"的宽度算需要多少，再补上横向偏移差与一点缝。
            const wI = wordWidths[i] ?? 0
            const sI = scale * 1.4
            let wNext = 0
            let sNext = 1
            let xNext = 0
            if (i + 1 < displayWords.length) {
                const nextSeed = seed + (i + 1)
                const nextRandom = (offset: number) => {
                    const x = Math.sin(nextSeed + offset) * 10000
                    return x - Math.floor(x)
                }
                const nextScale = isChaotic ? 0.8 + nextRandom(4) * 0.6 : 1.1 + nextRandom(4) * 0.2
                sNext = nextScale * 1.4
                xNext = (nextRandom(1) - 0.5) * baseSpread * 2
                wNext = wordWidths[i + 1] ?? 0
            }

            const spacingMultiplier = DEFAULT_CLASSIC_TUNING.wordSpacing
            const gap = 0.05 * pxFontSize
            const halfOverflowI = (wI * (sI - 1)) / 2
            const halfOverflowNext = (wNext * (sNext - 1)) / 2
            const xOffsetDiff = xVal - xNext
            const calculated = (halfOverflowI + halfOverflowNext + xOffsetDiff + gap) * spacingMultiplier
            const minMargin = (isChaotic ? 0.08 * pxFontSize : 0.12 * pxFontSize) * spacingMultiplier
            marginRight = `${Math.max(minMargin, calculated).toFixed(1)}px`

            return {
                id: `${word.text}-${i}-${seed}`,
                x: xVal,
                y: yVal,
                rotate: DEFAULT_CLASSIC_TUNING.enableWordRotation ? (random(3) - 0.5) * baseRotate * 2 : 0,
                scale,
                passedRotate: DEFAULT_CLASSIC_TUNING.enableWordRotation ? (random(8) - 0.5) * 45 : 0,
                marginRight,
                alignSelf: isChaotic && random(6) > 0.7 ? (random(7) > 0.5 ? 'flex-start' : 'flex-end') : 'auto',
            } as WordLayoutConfig & { marginRight: string; alignSelf: string }
        })

        return { wordConfigs: configs, lineConfig: resolvedLineConfig }
    }, [activeLine, displayWords, theme, lyricsFontScale, viewportWidth])

    const layoutVariants = useMemo(() => buildGlowWordLayoutVariants(DEFAULT_CLASSIC_TUNING.enableWordRotation), [])

    // 整句轻轻起伏：不让场面上出现"完全静止"的一段时间。
    const float = useMemo(() => {
        const multiplier = DEFAULT_CLASSIC_TUNING.breathingFloatMultiplier
        if (multiplier <= 0) return null
        const configByIntensity = {
            calm: { distance: 10, duration: 8.5 },
            normal: { distance: 14, duration: 7 },
            chaotic: { distance: 18, duration: 5.8 },
        } as const
        const { distance, duration } = configByIntensity[theme.animationIntensity]
        const scaled = distance * multiplier
        return {
            animate: { y: [0, -scaled, 0, scaled * 0.45, 0], scale: [1, 1 + 0.01 * multiplier, 1, 1 - 0.005 * multiplier, 1] },
            transition: { duration, repeat: Infinity, ease: 'easeInOut' as const },
        }
    }, [theme.animationIntensity])

    return (
        <div className="relative h-full w-full">
            <motion.div
                className="pointer-events-none relative z-10 flex h-[70vh] w-full items-center justify-center p-8 will-change-transform"
                style={{ fontFamily: resolveThemeFontStack(theme) }}
                animate={float?.animate}
                transition={float?.transition}
            >
                <AnimatePresence mode="popLayout">
                    {activeLine && (
                        <motion.div
                            key={activeLine.startTime}
                            initial={containerMotion.initial}
                            animate={containerMotion.animate}
                            exit={containerMotion.exit}
                            className="flex w-full max-w-6xl flex-wrap content-center"
                            style={{
                                justifyContent: lineConfig.justifyContent,
                                alignItems: lineConfig.alignItems,
                                perspective: `${lineConfig.perspective}px`,
                                minHeight: '300px',
                            }}
                        >
                            {displayWords.map((word, idx) => {
                                const config =
                                    (wordConfigs[idx] as (WordLayoutConfig & { marginRight?: string; alignSelf?: string }) | undefined) ??
                                    { id: `fallback-${idx}`, x: 0, y: 0, rotate: 0, scale: 1, passedRotate: 0, marginRight: '0.5rem', alignSelf: 'auto' }
                                const activeColor = resolveWordColor(word.text, theme, theme.accentColor)
                                return (
                                    <GlowWord
                                        key={`${word.text}-${idx}-${activeLine.startTime}`}
                                        word={word}
                                        config={config}
                                        currentTime={currentTime}
                                        theme={theme}
                                        layoutVariants={layoutVariants}
                                        baseColor={theme.primaryColor}
                                        activeColor={activeColor}
                                        renderProfile={renderProfile!}
                                        isChorus={activeLine.isChorus}
                                        fontSize={mainFontSize}
                                        layoutStyle={{ marginRight: config.marginRight, alignSelf: config.alignSelf }}
                                    />
                                )
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            <SubtitleOverlay
                activeLine={activeLine}
                recentCompletedLine={recentCompletedLine}
                nextLines={nextLines}
                theme={theme}
                translationFontSize={translationFontSize}
                upcomingFontSize={upcomingFontSize}
            />
        </div>
    )
}
