/*
 * 逐词组件 —— 行为对照开源播放器 Folia（AGPL-3.0）classic / partita 共用的 GlowWord 重写。
 *
 * 一个词只持有 waiting / active / passed 三态；状态一变才 setState，颜色/模糊/光晕/位移全交给
 * framer-motion 的 variants。分三层：
 *   外层容器 —— 位置 / 缩放 / 旋转（waiting 缩到 .5，active 弹簧弹到 config.scale*1.4，passed 落回并继续慢转）；
 *   光晕层   —— 透明文字 + text-shadow，唱到时按字错峰扫过去；
 *   正文层   —— 颜色与模糊，唱到时去模糊、压暗时再糊回去。
 * 三层各司其职，正文的字重始终不变，所以"高亮"看起来可以很大却不影响可读性。
 */

import { memo, useMemo, useState } from 'react'
import {
    AnimatePresence,
    motion,
    useMotionValueEvent,
    type MotionValue,
    type Variants,
} from 'framer-motion'
import type { StageLine, StageTheme, StageWord } from './types'
import { splitGraphemes } from './parse'
import { resolveThemeFontWeight, colorWithAlpha } from './theme'
import {
    getGlowWordActiveEndTime,
    getGlowWordDisplayDuration,
    type GlowWordRenderProfile,
} from './timing'

/* ── Linux 上的字形缓存泄漏开关（与 Folia 一致：只有 Linux 换成 drop-shadow 画光晕） ──
   Chromium 的字形缓存按"设备空间下的阴影 sigma"缓存，半径每帧都变会无限铸造新字形，
   Linux 下渲染进程的 fd 约 35 分钟就会耗尽、画面卡死。Web 端在 Windows/macOS 上无此问题，
   故保持 text-shadow 原路径；判定沿用 Folia 的平台默认。 */
const isLinuxRuntime = () => {
    if (typeof window === 'undefined') return false
    const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent
    return /Linux/.test(ua) && !/Android/.test(ua)
}
let glowQuantizedFlag: boolean | null = null
const isGlowBlurQuantized = () => {
    if (glowQuantizedFlag === null) glowQuantizedFlag = isLinuxRuntime()
    return glowQuantizedFlag
}

const DROP_SHADOW_RADIUS_SCALE = 0.4
const DROP_SHADOW_INNER_ALPHA = 0.7

const withAlpha = (color: string, alpha: number) =>
    /^\s*(#|rgba?\()/.test(color) ? colorWithAlpha(color, alpha) : color

const textShadowAt = (color: string, inner: number, outer: number) =>
    `0 0 ${inner}px ${color}, 0 0 ${outer}px ${color}`

const dropShadowAt = (color: string, inner: number, outer: number) =>
    `drop-shadow(0 0 ${inner * DROP_SHADOW_RADIUS_SCALE}px ${withAlpha(color, DROP_SHADOW_INNER_ALPHA)}) ` +
    `drop-shadow(0 0 ${outer * DROP_SHADOW_RADIUS_SCALE}px ${color})`

/** 一段光晕的 framer 关键帧：从"没有"到光晕（或反过来），peaks[i] ∈ 0..1。 */
const glowKeyframes = (color: string, inner: number, outer: number, peaks: number[]) => {
    if (!isGlowBlurQuantized()) {
        return {
            color: 'transparent',
            textShadow: peaks.map((peak) => (peak > 0 ? textShadowAt(color, inner, outer) : 'none')),
        }
    }
    return {
        color,
        opacity: peaks,
        filter: peaks.map((peak) => dropShadowAt(color, inner * peak, outer * peak)),
    }
}

interface GlowCustom {
    activeColor?: string
    duration?: number
    index?: number
    total?: number
    charStartTime?: number
    charEndTime?: number
    wordStartTime?: number
    wordRevealMode?: string | null
}

/** 光晕层的 variants：按揭示模式给不同半径，长词按字错峰。 */
export const wordGlowVariants: Variants = {
    waiting: () =>
        isGlowBlurQuantized()
            ? { color: 'transparent', opacity: 0, filter: 'none', transition: { duration: 0 } }
            : { color: 'transparent', textShadow: 'none', opacity: 1, filter: 'none' },
    active: ({
        activeColor = '',
        duration,
        index,
        total,
        charStartTime,
        charEndTime,
        wordStartTime,
        wordRevealMode,
    }: GlowCustom) => {
        if (wordRevealMode === 'instant') {
            return {
                ...glowKeyframes(activeColor, 14, 24, [0, 1, 0]),
                transition: { duration: Math.min(duration || 0.08, 0.12), times: [0, 0.35, 1], ease: 'easeOut' },
            }
        }

        if (wordRevealMode === 'fast') {
            return {
                ...glowKeyframes(activeColor, 18, 32, [0, 1, 0]),
                transition: {
                    duration: Math.min(Math.max(duration || 0.12, 0.12), 0.2),
                    times: [0, 0.4, 1],
                    ease: 'easeInOut',
                },
            }
        }

        // 逐字扫过：光晕从一个字荡到下一个字
        if (total !== undefined && total > 1) {
            const singleDuration = (duration ?? 0) / total
            const hasCharTiming =
                typeof charStartTime === 'number' && typeof charEndTime === 'number' && typeof wordStartTime === 'number'
            const charDuration = hasCharTiming ? Math.max(charEndTime - charStartTime, 0.001) : singleDuration
            const charDelay = hasCharTiming ? Math.max(0, charStartTime - wordStartTime) : singleDuration * (index ?? 0)
            return {
                ...glowKeyframes(activeColor, 20, 40, [0, 1, 0]),
                transition: {
                    duration: charDuration * 6,
                    times: [0, 0.3, 1],
                    delay: charDelay,
                    ease: 'easeInOut',
                },
            }
        }

        // 单字 / 中日文一个词：常亮
        return {
            ...glowKeyframes(activeColor, 20, 40, [0, 1, 1]),
            transition: { duration: duration || 0.1, times: [0, 0.9, 1], ease: 'easeInOut' },
        }
    },
    passed: ({ activeColor = '', wordRevealMode }: GlowCustom) => {
        const transition = {
            duration: wordRevealMode === 'instant' ? 0.12 : wordRevealMode === 'fast' ? 0.22 : 0.9,
            ease: 'easeOut' as const,
        }
        if (!isGlowBlurQuantized()) {
            return { color: 'transparent', textShadow: 'none', transition }
        }
        return { color: activeColor, opacity: 0, filter: dropShadowAt(activeColor, 0, 0), transition }
    },
}

/** 外层容器的位移 / 缩放 / 旋转。三态复用同一份 config，只是解释不同。 */
export const buildGlowWordLayoutVariants = (enableWordRotation = true): Variants => ({
    waiting: ({ config }: { config: WordLayoutConfig }) => ({
        opacity: 0,
        scale: 0.5,
        x: config.x + Math.sin(config.y) * 100,
        y: config.y + Math.cos(config.x) * 50,
        rotate: enableWordRotation ? config.rotate + 20 : 0,
        transition: { duration: 0.4 },
    }),
    active: ({ config }: { config: WordLayoutConfig }) => ({
        opacity: 1,
        scale: Number.isNaN(config.scale) ? 1.5 : config.scale * 1.4,
        x: config.x,
        y: config.y,
        rotate: config.rotate,
        transition: {
            type: 'spring' as const,
            stiffness: 200,
            damping: 20,
            opacity: { duration: 0.1 },
        },
    }),
    passed: ({ config }: { config: WordLayoutConfig }) => ({
        opacity: 0.82,
        scale: config.scale || 1,
        x: config.x,
        y: config.y,
        rotate: config.rotate + config.passedRotate,
        transition: { duration: 0.5, rotate: { duration: 5, ease: 'linear' } },
    }),
})

/** 正文层：颜色与模糊在这里收干净。 */
export const glowWordBodyVariants: Variants = {
    waiting: ({ baseColor }: { baseColor: string }) => ({
        color: baseColor,
        filter: 'blur(10px)',
        transition: { duration: 0.4 },
    }),
    active: ({ activeColor, duration, wordRevealMode }: GlowCustom & { baseColor?: string }) => ({
        color: activeColor,
        filter: 'none',
        transition: {
            color: { duration: duration || 0.2, ease: 'linear' },
            filter: { type: 'tween', duration: wordRevealMode === 'instant' ? 0.08 : wordRevealMode === 'fast' ? 0.12 : 0.2 },
        },
        transitionEnd: { filter: 'none' },
    }),
    passed: ({ baseColor, wordRevealMode }: { baseColor: string; wordRevealMode?: string | null }) => ({
        color: baseColor,
        filter: 'blur(0px)',
        transition: {
            color: { duration: wordRevealMode === 'instant' ? 0.12 : wordRevealMode === 'fast' ? 0.24 : 0.8, ease: 'easeInOut' },
            filter: { duration: wordRevealMode === 'instant' ? 0.12 : wordRevealMode === 'fast' ? 0.2 : 0.5 },
        },
        transitionEnd: { filter: 'none' },
    }),
}

/** 逐字时刻：没有音节数据时，按字素把词的时长均分。 */
function buildWordGraphemeTimings(word: StageWord) {
    const graphemes = splitGraphemes(word.text)
    if (graphemes.length === 0) return []
    const duration = Math.max(word.endTime - word.startTime, 0)
    const unit = duration / graphemes.length
    return graphemes.map((char, index) => ({
        char,
        startTime: word.startTime + unit * index,
        endTime: index === graphemes.length - 1 ? word.endTime : word.startTime + unit * (index + 1),
    }))
}

export interface WordLayoutConfig {
    id: string
    x: number
    y: number
    rotate: number
    scale: number
    passedRotate: number
}

interface GlowWordProps {
    word: StageWord
    config: WordLayoutConfig
    currentTime: MotionValue<number>
    theme: StageTheme
    layoutVariants: Variants
    baseColor: string
    activeColor: string
    renderProfile: GlowWordRenderProfile
    isChorus?: boolean
    fontSize: string
    layoutStyle: React.CSSProperties
}

export const GlowWord = memo(function GlowWord({
    word,
    config,
    currentTime,
    theme,
    layoutVariants,
    baseColor,
    activeColor,
    renderProfile,
    isChorus,
    fontSize,
    layoutStyle,
}: GlowWordProps) {
    const [status, setStatus] = useState<'waiting' | 'active' | 'passed'>('waiting')
    const rippleScale = useMemo(() => 1.5 + Math.random() * 2, [])
    const duration = getGlowWordDisplayDuration(word, renderProfile)
    const activeEndTime = getGlowWordActiveEndTime(word, renderProfile)
    const graphemeTimings = useMemo(() => buildWordGraphemeTimings(word), [word])

    useMotionValueEvent(currentTime, 'change', (latest: number) => {
        let next: 'waiting' | 'active' | 'passed' = 'waiting'
        if (latest >= word.startTime - renderProfile.wordLookahead && latest <= activeEndTime) next = 'active'
        else if (latest > activeEndTime) next = 'passed'
        if (next !== status) setStatus(next)
    })

    return (
        <motion.div
            key={config.id}
            data-status={status}
            custom={{ config, activeColor, baseColor, duration, wordRevealMode: renderProfile.wordRevealMode }}
            variants={layoutVariants}
            initial="waiting"
            animate={status}
            style={{
                display: 'inline-block',
                position: 'relative',
                transformOrigin: 'center',
                whiteSpace: 'nowrap',
                willChange: 'transform',
                fontSize,
                fontWeight: resolveThemeFontWeight(theme, 700),
                lineHeight: 1.22,
                ...layoutStyle,
            }}
        >
            {/* 光晕层：透明文字 + 阴影，绝对定位铺在正文底下 */}
            <span
                aria-hidden="true"
                style={{ position: 'absolute', inset: 0, display: 'block', pointerEvents: 'none', userSelect: 'none' }}
            >
                {graphemeTimings.length > 1 ? (
                    graphemeTimings.map((timing, index) => (
                        <motion.span
                            key={index}
                            variants={wordGlowVariants}
                            custom={{
                                config,
                                activeColor,
                                baseColor,
                                duration,
                                index,
                                total: graphemeTimings.length,
                                charStartTime: timing.startTime,
                                charEndTime: timing.endTime,
                                wordStartTime: word.startTime,
                                wordRevealMode: renderProfile.wordRevealMode,
                            }}
                        >
                            {timing.char}
                        </motion.span>
                    ))
                ) : (
                    <motion.span
                        variants={wordGlowVariants}
                        custom={{ config, activeColor, baseColor, duration, wordRevealMode: renderProfile.wordRevealMode }}
                    >
                        {word.text}
                    </motion.span>
                )}
            </span>

            {/* 正文层：颜色与模糊 */}
            <motion.span
                variants={glowWordBodyVariants}
                custom={{ config, activeColor, baseColor, duration, wordRevealMode: renderProfile.wordRevealMode }}
                style={{ position: 'relative', zIndex: 10, display: 'block' }}
            >
                {word.text}
            </motion.span>

            {/* 合唱涟漪 */}
            <AnimatePresence>
                {isChorus && status === 'active' && (
                    <motion.span
                        key="ripple"
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            width: '150%',
                            aspectRatio: '1 / 1',
                            marginTop: '-75%',
                            marginLeft: '-50%',
                            borderRadius: '999px',
                            border: `1px solid ${activeColor}`,
                            filter: 'blur(1px)',
                            pointerEvents: 'none',
                            zIndex: 0,
                        }}
                        initial={{ scale: 0.2, opacity: 0.8 }}
                        animate={{ scale: rippleScale, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    )
})

/** 供运行时读取一行里当前应该高亮的行 */
export type { StageLine }
