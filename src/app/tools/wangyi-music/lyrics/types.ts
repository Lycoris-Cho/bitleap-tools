/*
 * 逐词歌词的数据模型 —— 对照开源播放器 Folia（AGPL-3.0，classic「流光」模式）的行为重写，
 * 用来驱动全屏歌词舞台。这里只保留 classic 模式真正读到的字段。
 *
 * 与 ../types.ts 里的 LyricLine 区分：
 *   LyricLine   —— 逐行（LRC），给左侧滚动列表用；
 *   StageLine   —— 逐词，带每个字/词的起止时刻，给舞台动画用。
 */

/** 一段音节：中日文里一个字、西文里一个音节的时刻 */
export interface StageSyllable {
    text: string
    /** 秒 */
    startTime: number
    /** 秒 */
    endTime: number
}

/** 一个词（或一个字）：动画里"点亮"的最小单位 */
export interface StageWord {
    text: string
    /** 秒 */
    startTime: number
    /** 秒 */
    endTime: number
    syllables?: StageSyllable[]
}

/** 单行的时长分档，决定换行过渡与逐词点亮的快慢 */
export type LineTimingClass = 'normal' | 'short' | 'micro'
export type LineTransitionMode = 'normal' | 'fast' | 'none'
export type WordRevealMode = 'normal' | 'fast' | 'instant'

export interface LineRenderHints {
    rawDuration: number
    timingClass: LineTimingClass
    /** 这一行允许留在屏幕上的最晚时刻（揭示结束后还留给退场一点时间） */
    renderEndTime: number
    lineTransitionMode: LineTransitionMode
    wordRevealMode: WordRevealMode
}

export interface StageLine {
    words: StageWord[]
    /** 秒 */
    startTime: number
    /** 秒 */
    endTime: number
    fullText: string
    translation?: string
    renderHints?: LineRenderHints
    /** 合唱句：触发一圈涟漪 */
    isChorus?: boolean
}

export interface StageLyricData {
    lines: StageLine[]
    title?: string
    artist?: string
    /** 是否拿到了逐字时间轴（YRC）；false 表示时刻是由整行摊开估的 */
    isWordByWord?: boolean
}

export interface StageTheme {
    backgroundColor: string
    primaryColor: string
    accentColor: string
    secondaryColor: string
    fontStyle: 'sans' | 'serif' | 'mono'
    fontWeight: number
    animationIntensity: 'calm' | 'normal' | 'chaotic'
    wordColors?: { word: string; color: string }[]
}
