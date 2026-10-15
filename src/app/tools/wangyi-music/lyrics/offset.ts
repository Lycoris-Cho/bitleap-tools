/*
 * 歌词同步偏移 —— 舞台上那组 ± 按钮背后唯一的算术。
 *
 * 符号约定贯穿整条链路（clock.ts 的 now() = 媒体时刻 + 台阶补偿 + offset）：
 *   **正数 = 歌词提前**（歌词比人声慢时按 +），负数 = 歌词延后。
 *
 * 为什么需要它：播放时钟已经把 <audio> 的采样台阶抹平了，修不掉的只剩**输出延迟** ——
 * 蓝牙耳机 150~300ms、外接声卡几十毫秒，浏览器不告诉页面这个数，只能由耳朵定。
 * 另外还有些歌的逐字时间轴本身就偏，那是数据问题，同样只能靠这个参数补。
 */

/** 许可区间（秒）：再大就不像是"对齐"，多半是点错了 */
export const LYRIC_OFFSET_LIMIT = 2

/** 按一下走多少（秒）。10ms 一档是能听出差别的最小粒度，20ms 兼顾手感与速度 */
export const LYRIC_OFFSET_NUDGE = 0.02

/** 拖到极限之外的值、手抖出来的 0.0037，都在这里收口：留两位小数（10ms 精度） */
export const clampLyricOffset = (value: number) => {
    const safe = Number.isFinite(value) ? value : 0
    return Math.round(Math.min(LYRIC_OFFSET_LIMIT, Math.max(-LYRIC_OFFSET_LIMIT, safe)) * 100) / 100
}

/** 在当前值上走一步：按钮、长按连发、快捷键都走它，符号与边界只有一处 */
export const stepLyricOffset = (current: number, delta: number) => clampLyricOffset(current + delta)

/** 读出来给人看：`+180ms` / `-60ms` / `0ms` */
export const formatLyricOffset = (value: number) => {
    const ms = Math.round(clampLyricOffset(value) * 1000)
    return `${ms > 0 ? '+' : ''}${ms}ms`
}

/** 一句话说明当前是提前还是延后（面板里跟着数字走） */
export const describeLyricOffset = (value: number) => {
    const ms = Math.round(clampLyricOffset(value) * 1000)
    if (ms === 0) return '未校准'
    return ms > 0 ? `歌词提前 ${ms}ms` : `歌词延后 ${-ms}ms`
}
