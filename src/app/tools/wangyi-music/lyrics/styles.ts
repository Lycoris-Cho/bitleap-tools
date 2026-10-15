/*
 * 舞台风格清单 —— 舞台上那个切换器、快捷键轮换、以及存档校验都读这里，
 * 免得"有哪些风格、按什么顺序"这件事散在几个文件里各写一份。
 */

import type { LyricStageStyle } from './types'

export interface LyricStageStyleOption {
    id: LyricStageStyle
    label: string
    hint: string
}

export const LYRIC_STAGE_STYLES: LyricStageStyleOption[] = [
    { id: 'classic', label: '流光', hint: '流光：整句同时在场，唱到哪个词哪个词亮起' },
    { id: 'zen', label: '静流', hint: '静流：一句一行居中，光顺着字扫过，其余淡出' },
]

export const isLyricStageStyle = (value: unknown): value is LyricStageStyle => value === 'classic' || value === 'zen'

/** 顺序轮换：舞台上按 S 用 */
export const nextLyricStageStyle = (current: LyricStageStyle): LyricStageStyle => {
    const index = LYRIC_STAGE_STYLES.findIndex((option) => option.id === current)
    return LYRIC_STAGE_STYLES[(index + 1) % LYRIC_STAGE_STYLES.length].id
}
