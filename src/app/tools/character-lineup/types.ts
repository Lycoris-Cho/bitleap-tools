/*
 * 人物合集海报 —— 数据类型。
 *
 * 海报按**真实尺寸**布局（2560×1440），预览只是外层套一个 scale 做视觉缩放，
 * 所以导出时抓到的就是原生尺寸的那张画，所见即所得。
 */

export type Treatment = 'cutout' | 'frame'

export interface CharacterItem {
    id: string
    /** objectURL 或 dataURL；去纯色底之后会被换成 dataURL */
    src: string
    /** 去纯色底之前的原图，用于随时还原 */
    rawSrc: string
    name: string
    /** 代号 / 称号，排在各字下面的小字 */
    tag: string
    treatment: Treatment
    /** 相对槽位的缩放 */
    scale: number
    /** 上下微调（逻辑像素） */
    offsetY: number
    /** 横向焦点 0~100：决定 cover 裁到哪一侧 / 立绘左右挪多少 */
    focal: number
    /** 仅立绘：是否已去纯色底 */
    keyed: boolean
}

export interface LineupConfig {
    /* 文字 */
    badge: string
    title: string
    subtitle: string
    series: string
    footer: string

    /* 版式 */
    mainScale: number
    shrink: number
    slotSpacing: number
    rise: number
    align: 'baseline' | 'center'

    /* 配色 */
    paper: string
    paperAlt: string
    ink: string
    muted: string
    accent: string
    accentSoft: string
    line: string

    /* 装饰 */
    showGrid: boolean
    showDots: boolean
    showBarcode: boolean
    showCorners: boolean
    showOrbit: boolean
    vignette: boolean
    groundShadow: boolean
    showLabels: boolean
}

/** 海报逻辑尺寸 */
export const POSTER_W = 2560
export const POSTER_H = 1440

/** 飘落物的形状 */
export type FallShape = 'petal' | 'star4' | 'star5' | 'snow' | 'leaf' | 'dot'

/* ── 动效 ──
   入场与常态微动都由一个时间参数驱动（见 motion.ts），这里只是它的配置面。 */
export interface MotionConfig {
    /* 入场 */
    introOn: boolean
    introStyle: 'rise' | 'zoom' | 'slide'
    introOrder: 'hero' | 'outer' | 'left'
    introDuration: number
    /** 每人错峰间隔（秒） */
    introStagger: number
    introEase: string
    /** 标题比人物晚多少秒起步 */
    titleLag: number

    /* 常态微动 */
    breathe: boolean
    breatheAmount: number
    float: boolean
    floatAmount: number
    heroGlow: boolean
    heroGlowAmount: number
    sweep: boolean
    sweepPeriod: number
    petals: boolean
    /** 形状：花瓣 / 四角星 / 五角星 / 雪花 / 叶片 / 光点 */
    petalShape: FallShape
    petalCount: number
    petalSpeed: number
    /** 主色与副色，按下标确定性交替，所以同一颗每次都是同一色 */
    petalColor: string
    petalColor2: string
    dust: boolean
    dustCount: number
    orbitSpin: boolean
    orbitPeriod: number

    /* 静态质感 */
    duotone: boolean
    duotoneAmount: number
    grain: boolean
    grainAmount: number

    /* 播放（只影响预览，不影响导出） */
    speed: number
    loopIntro: boolean
}

/** 一个角色在 scale=1 时占的槽位 */
export const SLOT_W = 470
export const SLOT_H = 660

/** 人像安全区：算完站位后整排会被等比缩放着装进这里，所以任何人数都不会溢出 */
export const SAFE = { x0: 150, x1: POSTER_W - 150, top: 330, baseline: 1194 }

/** 人数上限：再多自动适配会把每个人都压得很小，不如不加 */
export const MAX_CHARACTERS = 12
