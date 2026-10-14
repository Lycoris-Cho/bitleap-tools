/*
 * 配色预设与默认文案。
 *
 * 色调语言沿用你现有的「人物海报制作」那一套（樱白 / 雷紫 / 朱印 / 月金），
 * 另加一个深色，因为 AI 娘化图多为满色彩，压在深底上最跳、也最"大气"。
 */

import { POSTER_W, type LineupConfig, type MotionConfig } from './types'

export type ToneId = 'sakura' | 'violet' | 'vermilion' | 'moon' | 'night'

export interface TonePreset {
    id: ToneId
    label: string
    colors: Pick<LineupConfig, 'paper' | 'paperAlt' | 'ink' | 'muted' | 'accent' | 'accentSoft' | 'line'>
    /** 深色底上角色需要一点提亮，用不到就忽略 */
    dark?: boolean
}

export const TONES: TonePreset[] = [
    {
        id: 'sakura',
        label: '神樱粉白',
        colors: {
            paper: '#FDF7F9',
            paperAlt: '#F6E5EE',
            ink: '#2A2027',
            muted: '#9C8A93',
            accent: '#E2679A',
            accentSoft: '#F7D6E4',
            line: '#E8D5DE',
        },
    },
    {
        id: 'violet',
        label: '雷樱紫',
        colors: {
            paper: '#F7F5FC',
            paperAlt: '#E9E3F8',
            ink: '#241F33',
            muted: '#8B84A3',
            accent: '#7C5CFF',
            accentSoft: '#DCD3FA',
            line: '#DED7F0',
        },
    },
    {
        id: 'vermilion',
        label: '鸣神朱印',
        colors: {
            paper: '#FBF5F2',
            paperAlt: '#F4E3DA',
            ink: '#2C1F1B',
            muted: '#9B857B',
            accent: '#D2453A',
            accentSoft: '#F3CFC8',
            line: '#E9D5CD',
        },
    },
    {
        id: 'moon',
        label: '月白淡金',
        colors: {
            paper: '#FAF8F2',
            paperAlt: '#EFE8D8',
            ink: '#232019',
            muted: '#96907D',
            accent: '#C79A3E',
            accentSoft: '#EBDBB9',
            line: '#E3D9C2',
        },
    },
    {
        id: 'night',
        label: '暗夜群星',
        dark: true,
        colors: {
            paper: '#141220',
            paperAlt: '#241E38',
            ink: '#F5F2FF',
            muted: '#9C94BC',
            accent: '#A78BFA',
            accentSoft: '#312A4C',
            line: '#2E2842',
        },
    },
]

export const toneById = (id: string) => TONES.find((t) => t.id === id) ?? TONES[0]

/** 文案默认值。{n} 会被替换成当前人数，{date} 替换成年月 */
export const DEFAULT_TEXT = {
    badge: 'CHARACTER ARCHIVE',
    title: '角色群像',
    subtitle: 'CHARACTER  LINEUP',
    series: 'SERIES 01  ·  共 {n} 位',
    footer: 'BITLEAP  ·  {date}',
}

export const DEFAULT_CONFIG: LineupConfig = {
    ...DEFAULT_TEXT,
    mainScale: 1.35,
    shrink: 0.16,
    slotSpacing: 0.86,
    rise: 26,
    align: 'baseline',
    ...toneById('sakura').colors,
    showGrid: true,
    showDots: true,
    showBarcode: true,
    showCorners: true,
    showOrbit: true,
    vignette: true,
    groundShadow: true,
    showLabels: true,
}

/** 把 {n} / {date} 替换掉 */
export function fillText(template: string, count: number) {
    const now = new Date()
    const date = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}`
    return template.replace(/\{n\}/g, String(count)).replace(/\{date\}/g, date)
}

/** 导出尺寸：沿用站点里 BitLeap 海报那套上限（2 倍或 2600px 宽，取小的） */
export const EXPORT_CAP = 2600
export const exportPixelRatio = () => Math.min(2, EXPORT_CAP / POSTER_W)

/* ── 动效默认值与预设 ── */

export const DEFAULT_MOTION: MotionConfig = {
    introOn: true,
    introStyle: 'rise',
    introOrder: 'hero',
    introDuration: 1.1,
    introStagger: 0.12,
    introEase: 'out',
    titleLag: 0.15,

    breathe: true,
    breatheAmount: 0.5,
    float: false,
    floatAmount: 0.4,
    heroGlow: true,
    heroGlowAmount: 0.6,
    sweep: false,
    sweepPeriod: 6,
    petals: false,
    petalShape: 'petal',
    petalCount: 18,
    petalSpeed: 1,
    petalColor: '#E2679A',
    petalColor2: '#F5C36B',
    dust: true,
    dustCount: 36,
    orbitSpin: true,
    orbitPeriod: 90,

    duotone: false,
    duotoneAmount: 0.35,
    grain: false,
    grainAmount: 0.35,

    speed: 1,
    loopIntro: false,
}

export interface MotionPreset {
    id: string
    label: string
    hint: string
    motion: Partial<MotionConfig>
}

/** 一键切整套动效，再手动微调。名称对应"这张海报的气质"。 */
export const MOTION_PRESETS: MotionPreset[] = [
    {
        id: 'quiet',
        label: '静雅',
        hint: '只有入场，之后完全静止',
        motion: { introOn: true, breathe: false, float: false, heroGlow: false, sweep: false, petals: false, dust: false, orbitSpin: false },
    },
    {
        id: 'lively',
        label: '灵动',
        hint: '入场 + 呼吸 + 花瓣 + 浮尘',
        motion: { introOn: true, breathe: true, float: true, heroGlow: true, sweep: false, petals: true, dust: true, orbitSpin: true },
    },
    {
        id: 'grand',
        label: '盛典',
        hint: '全套：扫光 + 光晕 + 花瓣，最热闹',
        motion: {
            introOn: true,
            introStyle: 'zoom',
            introStagger: 0.16,
            breathe: true,
            float: true,
            heroGlow: true,
            heroGlowAmount: 0.85,
            sweep: true,
            sweepPeriod: 4.5,
            petals: true,
            petalShape: 'star4',
            petalCount: 26,
            dust: true,
            orbitSpin: true,
        },
    },
    {
        id: 'off',
        label: '关闭',
        hint: '不留动效，只导出静帧',
        motion: {
            introOn: false,
            breathe: false,
            float: false,
            heroGlow: false,
            sweep: false,
            petals: false,
            dust: false,
            orbitSpin: false,
        },
    },
]
