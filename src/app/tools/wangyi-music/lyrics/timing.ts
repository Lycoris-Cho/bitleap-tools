/*
 * 逐词时序 —— 行为对照开源播放器 Folia（AGPL-3.0）的 renderHints / glowWordTiming 重写。
 *
 * 两层：
 *   ① buildLineRenderHints：把"这一行有多长"分档（micro / short / normal），
 *      再据此决定换行过渡与逐词揭示的模式与快慢。极短的碎句（如"哦"）不能走完整的入场动画，
 *      否则字幕会抖；长句则给足 0.4 秒的入场。
 *   ② resolveGlowWordProfile：把上面那份提示整理成逐帧好用的 profile，
 *      算出每个词的 active 结束时刻与显示时长。
 */

import type { LineRenderHints, LineTimingClass, LineTransitionMode, StageLine, StageWord, WordRevealMode } from './types'

export const MICRO_LINE_DURATION_THRESHOLD = 0.1
export const SHORT_LINE_DURATION_THRESHOLD = 0.18
export const MICRO_LINE_RENDER_FLOOR = 0.067

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export interface LineTransitionTiming {
    enterDuration: number
    exitDuration: number
    linePassHold: number
}

export function getLineTransitionTiming(
    rawDuration: number,
    lineTransitionMode: LineTransitionMode,
    wordRevealMode: WordRevealMode,
): LineTransitionTiming {
    if (lineTransitionMode === 'none') {
        return { enterDuration: 0, exitDuration: 0, linePassHold: 0 }
    }

    if (lineTransitionMode === 'fast') {
        return {
            enterDuration: clamp(rawDuration * 0.45, 0.045, 0.06),
            exitDuration: clamp(rawDuration * 0.22, 0.03, 0.04),
            linePassHold: wordRevealMode === 'instant' ? 0 : 0.03,
        }
    }

    return {
        enterDuration: Math.min(0.42, Math.max(0.22, Math.max(rawDuration, 0.12) * 0.34)),
        exitDuration: Math.min(0.32, Math.max(0.18, Math.max(rawDuration, 0.12) * 0.18)),
        linePassHold: wordRevealMode === 'instant' ? 0 : 0.06,
    }
}

const getTimingClass = (rawDuration: number): LineTimingClass => {
    if (rawDuration < MICRO_LINE_DURATION_THRESHOLD) return 'micro'
    if (rawDuration < SHORT_LINE_DURATION_THRESHOLD) return 'short'
    return 'normal'
}

const getLineTransitionMode = (timingClass: LineTimingClass): LineTransitionMode => {
    if (timingClass === 'micro') return 'none'
    if (timingClass === 'short') return 'fast'
    return 'normal'
}

const getWordRevealMode = (timingClass: LineTimingClass): WordRevealMode => {
    if (timingClass === 'micro') return 'instant'
    if (timingClass === 'short') return 'fast'
    return 'normal'
}

const lastWordEndTime = (line: Pick<StageLine, 'endTime' | 'words'>): number =>
    line.words[line.words.length - 1]?.endTime ?? line.endTime

/**
 * 这一行允许留在屏幕上的最晚时刻：揭示结束之后再留一点给"退场"的收尾。
 * 不是独立时间轴 —— 下一行更早开始就会把这段窗口截短。
 */
function buildLineRenderEndTime(
    line: Pick<StageLine, 'startTime' | 'endTime' | 'words'>,
    rawDuration: number,
    lineTransitionMode: LineTransitionMode,
    wordRevealMode: WordRevealMode,
): number {
    if (lineTransitionMode === 'none') {
        return Math.max(line.endTime, line.startTime + MICRO_LINE_RENDER_FLOOR)
    }

    const timing = getLineTransitionTiming(rawDuration, lineTransitionMode, wordRevealMode)
    const passStart = Math.max(lastWordEndTime(line), line.startTime) + timing.linePassHold
    const exitStart =
        lineTransitionMode === 'fast'
            ? Math.max(line.startTime + timing.enterDuration + 0.01, passStart, line.endTime - timing.exitDuration)
            : Math.max(passStart, line.endTime - timing.exitDuration)

    return Math.max(line.endTime, exitStart + timing.exitDuration)
}

export function buildLineRenderHints(line: Pick<StageLine, 'startTime' | 'endTime' | 'words'>): LineRenderHints {
    const rawDuration = Math.max(line.endTime - line.startTime, 0)
    const timingClass = getTimingClass(rawDuration)
    const lineTransitionMode = getLineTransitionMode(timingClass)
    const wordRevealMode = getWordRevealMode(timingClass)
    return {
        rawDuration,
        timingClass,
        renderEndTime: buildLineRenderEndTime(line, rawDuration, lineTransitionMode, wordRevealMode),
        lineTransitionMode,
        wordRevealMode,
    }
}

export const getLineRenderHints = (line: StageLine | null | undefined): LineRenderHints | null =>
    line ? line.renderHints ?? buildLineRenderHints(line) : null

export const getLineRenderEndTime = (line: StageLine | null | undefined): number =>
    line ? getLineRenderHints(line)?.renderEndTime ?? line.endTime : Number.NEGATIVE_INFINITY

/* ── 逐词 profile ── */

export interface GlowWordRenderProfile {
    renderHints: LineRenderHints | null
    lineRenderEndTime: number
    lineTransitionMode: LineTransitionMode
    wordRevealMode: WordRevealMode
    wordLookahead: number
}

export const resolveGlowWordProfile = (line: StageLine | null | undefined): GlowWordRenderProfile | null => {
    if (!line) return null
    const renderHints = getLineRenderHints(line)
    const wordRevealMode = renderHints?.wordRevealMode ?? 'normal'
    return {
        renderHints,
        lineRenderEndTime: getLineRenderEndTime(line),
        lineTransitionMode: renderHints?.lineTransitionMode ?? 'normal',
        wordRevealMode,
        wordLookahead: wordRevealMode === 'instant' ? 0.03 : wordRevealMode === 'fast' ? 0.08 : 0.15,
    }
}

/** 这个词 active 到什么时候为止 */
export const getGlowWordActiveEndTime = (word: StageWord, profile: GlowWordRenderProfile): number => {
    if (profile.wordRevealMode === 'instant') return profile.lineRenderEndTime
    if (profile.wordRevealMode === 'fast') {
        return Math.min(profile.lineRenderEndTime, Math.max(word.endTime, word.startTime + 0.12))
    }
    return word.endTime
}

/** 这个词显示多久（光晕 / 颜色过渡的时长都用它） */
export const getGlowWordDisplayDuration = (word: StageWord, profile: GlowWordRenderProfile): number => {
    const activeEndTime = getGlowWordActiveEndTime(word, profile)
    const minDuration = profile.wordRevealMode === 'instant' ? 0.08 : profile.wordRevealMode === 'fast' ? 0.12 : 0.1
    return Math.max(activeEndTime - word.startTime, minDuration)
}

/** 整行容器的入场 / 离场：一句进来时是否模糊着淡入、出去时是否放大着化开 */
export const getLineContainerMotion = (profile: GlowWordRenderProfile | null) => {
    if (profile?.lineTransitionMode === 'none') {
        return {
            initial: { opacity: 1, scale: 1, filter: 'blur(0px)' },
            animate: { opacity: 1, scale: 1, filter: 'blur(0px)', transitionEnd: { filter: 'none' } },
            exit: { opacity: 0, scale: 1.02, filter: 'blur(6px)', transition: { duration: 0.12, ease: 'easeOut' as const } },
        }
    }

    if (profile?.lineTransitionMode === 'fast') {
        return {
            initial: { opacity: 0.35, scale: 0.96, filter: 'blur(4px)' },
            animate: {
                opacity: 1,
                scale: 1,
                filter: 'blur(0px)',
                transition: { duration: 0.16, ease: 'easeOut' as const },
                transitionEnd: { filter: 'none' },
            },
            exit: {
                opacity: 0,
                scale: 1.04,
                filter: 'blur(10px)',
                transition: { duration: 0.16, ease: 'easeInOut' as const },
            },
        }
    }

    return {
        initial: { opacity: 0, scale: 0.9, filter: 'blur(10px)' },
        animate: { opacity: 1, scale: 1, filter: 'blur(0px)', transitionEnd: { filter: 'none' } },
        exit: { opacity: 0, scale: 1.1, filter: 'blur(20px)', transition: { duration: 0.3 } },
    }
}
