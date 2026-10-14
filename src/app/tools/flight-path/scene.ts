/*
 * 场景参数与时间轴 —— 预览与导出共用的唯一一份。
 *
 * 这里最要紧的是**时间轴只描述一次**：
 *   把一轮动画拆成若干「段」（向前飞 / 停住 / 折返），
 *   预览按段时间求值，导出把同样的段格式化成 SMIL 的 keyTimes/keySplines。
 * 两边都从 buildSegments 出发，所以"预览里几秒到终点"和"导出的 SVG 里几秒到终点"必然一致。
 */

import type { Track } from './geometry'

/* ── 画布底色（深色画布是给发光虚线用的，所以只给深色） ── */
export const CANVAS_BGS = [
    { id: 'indigo', label: '深靛', value: '#0b1020' },
    { id: 'github', label: '墨黑', value: '#0d1117' },
    { id: 'graphite', label: '石墨', value: '#111114' },
    { id: 'teal', label: '深海', value: '#08181a' },
    { id: 'plum', label: '夜紫', value: '#140f22' },
] as const

export const LOOP_MODES = [
    { id: 'once', label: '单次' },
    { id: 'loop', label: '循环' },
    { id: 'pingpong', label: '往返' },
] as const

export type LoopMode = (typeof LOOP_MODES)[number]['id']

export interface SceneParams {
    /* 航线 */
    lineColor: string
    lineWidth: number
    dash: number
    gap: number
    /** 曲线张力：1 = 标准 Catmull-Rom，越小越接近折线（急转弯的航线要调小） */
    tension: number
    glow: boolean
    /* 飞行 */
    bySpeed: boolean
    duration: number
    speed: number
    easing: string
    loop: LoopMode
    dwell: number
    /* 飞行器 */
    glyph: string
    size: number
    glyphColor: string
    follow: boolean
    rotateOffset: number
    /* 画布 */
    ratio: string
    bg: string
    grid: boolean
    /** 导出的 SVG / HTML 里要不要带背景色块（不要就是透明底，方便叠在别的画面上） */
    bgExport: boolean
}

export const DEFAULT_PARAMS: SceneParams = {
    lineColor: '#7dd3fc',
    lineWidth: 2.5,
    dash: 7,
    gap: 9,
    tension: 0.8,
    glow: true,

    bySpeed: false,
    duration: 4,
    speed: 260,
    easing: 'inout',
    loop: 'loop',
    dwell: 0.4,

    glyph: 'plane',
    size: 26,
    glyphColor: '#e8f6ff',
    follow: true,
    rotateOffset: 0,

    ratio: '16:9',
    bg: '#0b1020',
    grid: true,
    bgExport: true,
}

/* ── 时间轴 ── */

export interface Segment {
    kind: 'travel' | 'hold'
    /** 段起点的进度（0~1） */
    from: number
    /** 段终点的进度（0~1） */
    to: number
    /** 段时长（秒） */
    dur: number
}

/** 飞行时长：按速度算还是按用户给的时长 */
export function travelSeconds(params: SceneParams, track: Track): number {
    if (params.bySpeed && params.speed > 0) return Math.max(0.1, track.total / params.speed)
    return Math.max(0.1, params.duration)
}

/**
 * 一轮动画的段序列。
 *   单次：飞一趟，SMIL 用 freeze 停在终点（所以不需要尾部停留段）
 *   循环：飞一趟 + 末尾停 dwell 秒，避免"刚到终点就跳回起点"的突兀
 *   往返：去 + 停 + 回 + 停
 */
export function buildSegments(params: SceneParams, travel: number): Segment[] {
    const dwell = Math.max(0, params.dwell)

    if (params.loop === 'once') {
        return [{ kind: 'travel', from: 0, to: 1, dur: travel }]
    }

    if (params.loop === 'pingpong') {
        const segs: Segment[] = [{ kind: 'travel', from: 0, to: 1, dur: travel }]
        if (dwell > 0) segs.push({ kind: 'hold', from: 1, to: 1, dur: dwell })
        segs.push({ kind: 'travel', from: 1, to: 0, dur: travel })
        if (dwell > 0) segs.push({ kind: 'hold', from: 0, to: 0, dur: dwell })
        return segs
    }

    const segs: Segment[] = [{ kind: 'travel', from: 0, to: 1, dur: travel }]
    if (dwell > 0) segs.push({ kind: 'hold', from: 1, to: 1, dur: dwell })
    return segs
}

export const cycleLength = (segments: Segment[]) => segments.reduce((sum, s) => sum + s.dur, 0)

/**
 * 一轮内经过 tc 秒时的进度（0~1，已含缓动）。
 * 缓动**只作用于"飞"的那一段**，停留段是常数 —— 这样"缓入缓出"不会把末尾的停留也拖成一截曲线。
 */
export function progressAt(segments: Segment[], ease: (t: number) => number, tc: number): number {
    let rest = tc
    for (const seg of segments) {
        if (rest <= seg.dur) {
            if (seg.kind === 'hold') return seg.from
            const u = seg.dur > 0 ? rest / seg.dur : 1
            return seg.from + (seg.to - seg.from) * ease(u)
        }
        rest -= seg.dur
    }
    return segments.length > 0 ? segments[segments.length - 1].to : 0
}

/** 界面上显示的等效速度 */
export function displaySpeed(params: SceneParams, track: Track): number {
    if (params.bySpeed) return params.speed
    return track.total / Math.max(0.1, params.duration)
}
