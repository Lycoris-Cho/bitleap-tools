export interface MusicResult {
    id: string
    name: string
    artist: string
    album: string
    cover: string
    url: string
    /** 毫秒，来自上游接口 */
    duration: number
    pay: string
    /** 直链的解析时刻（毫秒）。直链是 CDN 现签的临时地址，会过期，切歌时按它判断要不要重取 */
    resolvedAt?: number
}

export interface LyricLine {
    time: number
    text: string
}

/** 搜索结果项：上游不返回封面与直链，播放前需要再用 id 解析一次 */
export interface SearchSong {
    id: string
    name: string
    artist: string
    album: string
    /** 毫秒 */
    duration: number
}

export type PlayMode = 'list' | 'single' | 'shuffle'

/* ── 歌单 ──
 * 三个接口各给一半信息，这里统一成两套类型：
 *   PlaylistBrief —— 卡片用（推荐列表、分类列表都映射成它，界面不必关心来源）
 *   PlaylistTrack —— 曲目用；**只有 id 和元数据，没有直链**，播放前才按 id 解析
 */

export interface PlaylistBrief {
    id: string
    name: string
    cover: string
    playCount: number
    trackCount: number
    /** 推荐歌单才有的推荐语 */
    copywriter?: string
}

export interface PlaylistHeader {
    id: string
    name: string
    cover: string
    description: string
    creator: string
    playCount: number
    trackCount: number
}

export interface PlaylistTrack {
    id: string
    name: string
    artist: string
    album: string
    cover: string
    /** 毫秒 */
    duration: number
}

