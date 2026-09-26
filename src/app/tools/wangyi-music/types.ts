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
