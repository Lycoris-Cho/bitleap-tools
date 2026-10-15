/*
 * 舞台主题与配色工具 —— 对照开源播放器 Folia（AGPL-3.0）的 colorMix / fontStacks / subtitleFontSizes 重写。
 *
 * Folia 的 classic 内置主题就是一套"近黑底 + 近白字"：词从近白（#f4f4f5）被模糊地摆着，
 * 唱到时去模糊、弹大、起一层白晕，唱完再压回近白。换句话说，**高亮靠的是清晰度与光晕，不是换色**。
 * 这里保留这套默认值，只在背景里掺一点封面主色，让底色不是纯黑。
 */

import type { StageTheme } from './types'

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const FALLBACK_RGB = { r: 255, g: 255, b: 255 }

type Channels = { r: number; g: number; b: number }

const readColor = (color: string): Channels | 'fallback' | 'passthrough' => {
    if (!color) return 'fallback'
    if (color.startsWith('#')) {
        const hex = color.slice(1)
        const parse = (v: string) => Number.parseInt(v, 16)
        if (/^[0-9a-fA-F]{3}$/.test(hex)) {
            return { r: parse(hex[0] + hex[0]), g: parse(hex[1] + hex[1]), b: parse(hex[2] + hex[2]) }
        }
        if (/^[0-9a-fA-F]{6}$/.test(hex)) {
            return { r: parse(hex.slice(0, 2)), g: parse(hex.slice(2, 4)), b: parse(hex.slice(4, 6)) }
        }
        return 'fallback'
    }
    const rgbMatch = color.match(/^rgba?\(([^)]+)\)$/)
    if (rgbMatch) {
        const [r, g, b] = rgbMatch[1].split(',').slice(0, 3).map((p) => Number.parseFloat(p.trim()))
        return [r, g, b].every(Number.isFinite) ? { r, g, b } : 'fallback'
    }
    return 'passthrough'
}

/** 给颜色套一个 alpha；只认 hex 与 rgb()，其它（命名色 / hsl）原样返回。 */
export function colorWithAlpha(color: string, alpha: number): string {
    const normalized = typeof color === 'string' ? color.trim() : ''
    const parsed = readColor(normalized)
    if (parsed === 'passthrough') return normalized
    const { r, g, b } = parsed === 'fallback' ? FALLBACK_RGB : parsed
    return `rgba(${Math.round(clamp(r, 0, 255))}, ${Math.round(clamp(g, 0, 255))}, ${Math.round(clamp(b, 0, 255))}, ${clamp(alpha, 0, 1)})`
}

/** 从 "rgb(r,g,b)" / "#rrggbb" 里取通道；取不到给兜底。 */
function channelsOf(color: string, fallback: Channels = { r: 9, g: 9, b: 11 }): Channels {
    const parsed = readColor(color)
    return typeof parsed === 'string' ? fallback : parsed
}

/** 把颜色整体压到 [minPeak, maxPeak] 的亮度区间内（背景底色用）。 */
function tone(color: string, maxPeak: number, minPeak: number): string {
    const { r, g, b } = channelsOf(color)
    const peak = Math.max(r, g, b)
    let k = 1
    if (peak > maxPeak) k = maxPeak / peak
    else if (peak > 0 && peak < minPeak) k = minPeak / peak
    const f = (v: number) => Math.round(clamp(v * k, 0, 255))
    return `rgb(${f(r)}, ${f(g)}, ${f(b)})`
}

/** 取封面主色做一层很暗的底色：keep 色相，压到近黑。 */
export function darkBackdropOf(coverColors: [string, string] | null): string {
    if (!coverColors || !coverColors[0]) return '#09090b'
    const { r, g, b } = channelsOf(coverColors[0])
    const peak = Math.max(r, g, b) || 1
    const k = 46 / peak
    const f = (v: number) => Math.round(clamp(14 + v * k * 0.9, 0, 255))
    return `rgb(${f(r)}, ${f(g)}, ${f(b)})`
}

/**
 * 高亮色：拿封面副色往白里提。
 *
 * 直接用封面色不行 —— 它可能很深，当歌词高亮会读不清；一律用纯白也不行 ——
 * 静流模式的"扫光"就没有个性了。提白 70% 之后色相还在、亮度一定够，
 * 于是每个词可以差别明显（封面色相）又不失可读性（近白）。
 */
export function highlightOf(coverColors: [string, string] | null): string {
    const source = coverColors?.[1] || coverColors?.[0]
    if (!source) return '#fafafa'
    const { r, g, b } = channelsOf(source, { r: 250, g: 250, b: 250 })
    const lift = (v: number) => Math.round(clamp(v * 0.3 + 255 * 0.7, 0, 255))
    return `rgb(${lift(r)}, ${lift(g)}, ${lift(b)})`
}

/* ── 字体 ── */

const SANS_STACK =
    '"Inter", "Noto Sans CJK SC", "Noto Sans JP", "Source Han Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif'
const SERIF_STACK =
    '"Iowan Old Style", "Noto Serif CJK SC", "Noto Serif JP", "Source Han Serif SC", "Songti SC", "STSong", Georgia, serif'
const MONO_STACK = '"IBM Plex Mono", "Sarasa Mono SC", "Noto Sans Mono CJK SC", "SFMono-Regular", Consolas, monospace'

const FONT_STACKS: Record<StageTheme['fontStyle'], string> = {
    sans: SANS_STACK,
    serif: SERIF_STACK,
    mono: MONO_STACK,
}

const TRANSLATION_STACKS: Record<StageTheme['fontStyle'], string> = {
    sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", "Helvetica Neue", Arial, "Noto Sans CJK SC", "Source Han Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    serif: '"Iowan Old Style", Georgia, "Times New Roman", "Noto Serif CJK SC", "Source Han Serif SC", "Songti SC", "STSong", SimSun, serif',
    mono: 'Consolas, "IBM Plex Mono", "SFMono-Regular", Menlo, Monaco, "Sarasa Mono SC", "Noto Sans Mono CJK SC", "SimHei", "DengXian", "Microsoft YaHei UI", monospace',
}

export const resolveThemeFontStack = (theme: Pick<StageTheme, 'fontStyle'>) =>
    FONT_STACKS[theme.fontStyle] ?? SANS_STACK

export const resolveTranslationFontStack = (theme: Pick<StageTheme, 'fontStyle'>) =>
    TRANSLATION_STACKS[theme.fontStyle] ?? TRANSLATION_STACKS.sans

export const resolveThemeFontWeight = (theme: Pick<StageTheme, 'fontWeight'> | null | undefined, fallback: number) => {
    const weight = theme?.fontWeight
    if (typeof weight !== 'number' || !Number.isFinite(weight)) return fallback
    return Math.round(clamp(weight, 100, 900) / 10) * 10
}

/* ── 底部字幕字号（译文 / 下一句预览） ── */

const clampSize = (min: number, preferred: number, max: number, scale: number) =>
    `clamp(${(min * scale).toFixed(3)}rem, ${(preferred * scale).toFixed(3)}vw, ${(max * scale).toFixed(3)}rem)`

/** 译文与下一句预览的 clamp 字号，各模式共用同一组值。 */
export function resolveSubtitleFontSizes(lyricsFontScale = 1) {
    const scale = Number.isFinite(lyricsFontScale) && lyricsFontScale > 0 ? lyricsFontScale : 1
    return {
        translationFontSize: clampSize(1.125, 2.6, 1.25, scale),
        upcomingFontSize: clampSize(0.875, 2, 1, scale),
    }
}

/* ── 主题 ── */

/** 关键字着色：主题里给了词色表才生效（当前调用方传空，等于关闭）。 */
export function resolveWordColor(wordText: string, theme: StageTheme, fallback: string): string {
    const table = theme.wordColors
    if (!table || table.length === 0) return fallback
    const clean = wordText.trim()
    if (!clean) return fallback
    const hit = table.find((entry) => entry.word && clean.includes(entry.word.trim()))
    return hit?.color || fallback
}

export interface BuildStageThemeOptions {
    /** 封面提取出的两种主色 */
    coverColors?: [string, string] | null
    fontStyle?: StageTheme['fontStyle']
    animationIntensity?: StageTheme['animationIntensity']
}

/**
 * 组装舞台要用的主题。
 * 文字一律近白（#f4f4f5），高亮色 accent 也保持近白 —— 这是 Folia 内置主题的默认，
 * 高亮完全交给"去模糊 + 光晕 + 弹大"来表达。底色则从封面主色压到近黑，避免纯黑发死。
 * 静流模式另外要一个 highlightColor：同样是近白，但掺了封面副色的色相，用来画扫光。
 */
export function buildStageTheme(options: BuildStageThemeOptions = {}): StageTheme {
    const { coverColors = null, fontStyle = 'sans', animationIntensity = 'normal' } = options
    void tone
    return {
        backgroundColor: darkBackdropOf(coverColors),
        primaryColor: '#f4f4f5',
        accentColor: '#f4f4f5',
        secondaryColor: '#71717a',
        highlightColor: highlightOf(coverColors),
        fontStyle,
        fontWeight: 700,
        animationIntensity,
    }
}
