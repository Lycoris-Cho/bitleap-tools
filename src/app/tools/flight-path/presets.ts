/*
 * 预设航线。
 *
 * 坐标全部写在 960×540 的逻辑画布里（默认画幅），应用预设时会自动等比换算到当前画幅，
 * 所以换过画幅再点预设也不会跑偏。
 */

import type { Pt } from './geometry'
import type { SceneParams } from './scene'

export interface Preset {
    id: string
    label: string
    hint: string
    anchors: Pt[]
    params: Partial<SceneParams>
}

export const PRESETS: Preset[] = [
    {
        id: 'takeoff',
        label: '起飞爬升',
        hint: '一条持续爬升的航线，缓出收尾',
        anchors: [
            { x: 100, y: 460 },
            { x: 180, y: 430 },
            { x: 250, y: 372 },
            { x: 340, y: 330 },
            { x: 430, y: 298 },
            { x: 530, y: 262 },
            { x: 645, y: 212 },
            { x: 765, y: 146 },
            { x: 862, y: 92 },
        ],
        params: { easing: 'out', loop: 'loop', dwell: 0.5, glyph: 'plane', tension: 0.85, dash: 7, gap: 9 },
    },
    {
        id: 'orbit',
        label: '环绕航线',
        hint: '穿过画面后向内绕一圈，适合做"绕行"的叙事',
        anchors: [
            { x: 118, y: 402 },
            { x: 262, y: 240 },
            { x: 432, y: 148 },
            { x: 622, y: 170 },
            { x: 742, y: 292 },
            { x: 678, y: 424 },
            { x: 518, y: 462 },
            { x: 398, y: 400 },
            { x: 420, y: 300 },
            { x: 542, y: 282 },
        ],
        params: { easing: 'inout', loop: 'pingpong', dwell: 0.35, glyph: 'plane', tension: 0.85, dash: 7, gap: 9 },
    },
    {
        id: 'wave',
        label: '波浪巡航',
        hint: '水平方向的起伏，最像"巡航"的一种',
        anchors: [
            { x: 80, y: 288 },
            { x: 180, y: 214 },
            { x: 280, y: 292 },
            { x: 380, y: 372 },
            { x: 480, y: 292 },
            { x: 580, y: 214 },
            { x: 680, y: 292 },
            { x: 780, y: 372 },
            { x: 884, y: 296 },
        ],
        params: { easing: 'linear', loop: 'pingpong', dwell: 0, glyph: 'plane', tension: 0.95, dash: 8, gap: 8 },
    },
    {
        id: 'swoosh',
        label: '回旋下落',
        hint: '一条斜向的 S 形，缓入缓出最顺',
        anchors: [
            { x: 108, y: 108 },
            { x: 300, y: 132 },
            { x: 460, y: 258 },
            { x: 626, y: 384 },
            { x: 856, y: 432 },
        ],
        params: { easing: 'inout', loop: 'loop', dwell: 0.6, glyph: 'paper', tension: 0.8, dash: 6, gap: 10 },
    },
    {
        id: 'bounce',
        label: '折返跳跃',
        hint: '连续折返，张力调小会更"脆"',
        anchors: [
            { x: 96, y: 424 },
            { x: 238, y: 236 },
            { x: 378, y: 424 },
            { x: 518, y: 236 },
            { x: 658, y: 424 },
            { x: 798, y: 238 },
            { x: 880, y: 306 },
        ],
        params: { easing: 'inout', loop: 'pingpong', dwell: 0.25, glyph: 'rocket', tension: 0.6, dash: 6, gap: 8 },
    },
    {
        id: 'blank',
        label: '清空手绘',
        hint: '清掉航线，自己按住飞机画一条',
        anchors: [],
        params: { glyph: 'plane', easing: 'inout', loop: 'loop', dwell: 0.4, tension: 0.8 },
    },
]
