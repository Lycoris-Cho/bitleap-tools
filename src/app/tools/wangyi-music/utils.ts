import type { LyricLine, MusicResult } from './types'

export const ACCENT = '#ec4141'
export const STORAGE_KEY = 'bitleap:wangyi-music'
export const NETEASE_SONG_URL = 'https://music.163.com/#/song?id='

/** 细颗粒噪点，用于给背景增加质感 */
export const NOISE_URL =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")"

/** 纯数字 ID、含 id= 的分享链接、song/xxx 链接都按 ID 处理，其余视为搜索关键词 */
export function extractSongId(input: string): string | null {
    const trimmed = input.trim()
    const patterns = [/[?&#]id=(\d+)/, /song\/(\d+)/, /^\s*(\d+)\s*$/]
    for (const pattern of patterns) {
        const match = trimmed.match(pattern)
        if (match?.[1]) return match[1]
    }
    return null
}

export function formatTime(sec: number) {
    if (!sec || !Number.isFinite(sec) || sec < 0) return '0:00'
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${String(s).padStart(2, '0')}`
}

/** 上游 duration 单位是毫秒 */
export function formatDurationMs(ms: number) {
    return formatTime((ms || 0) / 1000)
}

/** 解析 LRC 歌词 */
export function parseLRC(lrc: string): LyricLine[] {
    const result: LyricLine[] = []
    const reg = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/
    for (const line of lrc.split('\n')) {
        const match = line.match(reg)
        if (!match) continue
        const min = parseInt(match[1], 10)
        const sec = parseInt(match[2], 10)
        const ms = parseInt(match[3].padEnd(3, '0'), 10)
        const text = match[4].trim()
        if (text) result.push({ time: min * 60 + sec + ms / 1000, text })
    }
    return result.sort((a, b) => a.time - b.time)
}

/** 二分查找当前歌词行，避免每次 timeupdate 都从头扫描 */
export function findLyricIndex(lyrics: LyricLine[], time: number) {
    let left = 0
    let right = lyrics.length - 1
    let answer = -1
    while (left <= right) {
        const mid = (left + right) >> 1
        if (lyrics[mid].time <= time) {
            answer = mid
            left = mid + 1
        } else {
            right = mid - 1
        }
    }
    return answer
}

/** 归一化上游返回的歌曲结构 */
export function normalizeSong(raw: Record<string, unknown>): MusicResult {
    return {
        id: String(raw.id ?? ''),
        name: String(raw.name ?? '未知歌曲'),
        artist: String(raw.artistsname ?? raw.artist ?? '未知歌手'),
        album: String(raw.album ?? '未知专辑'),
        cover: String(raw.picurl ?? raw.cover ?? ''),
        url: String(raw.url ?? ''),
        duration: Number(raw.duration ?? 0) || 0,
        pay: String(raw.pay ?? ''),
    }
}

/**
 * 把颜色压到 [minPeak, maxPeak] 的亮度区间内。
 * - 亮色封面（白/黄）压暗，保证白字可读；
 * - 深色封面提亮到下限，保证背景还能看出专辑色调，而不是一坨黑。
 * 全屏背景靠这个控制明暗，而不是靠黑色蒙版（那样会变成"中间有颜色、上下发黑"）。
 */
export function toneDown(color: string, maxPeak = 110, minPeak = 52) {
    const nums = color.match(/\d+(\.\d+)?/g)
    if (!nums || nums.length < 3) return color
    const [r, g, b] = nums.map(Number)
    const peak = Math.max(r, g, b)
    let k = 1
    if (peak > maxPeak) k = maxPeak / peak
    else if (peak > 0 && peak < minPeak) k = minPeak / peak
    const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)))
    return `rgb(${clamp(r)},${clamp(g)},${clamp(b)})`
}

/* =========================================================================
 * 搜索结果封面
 * 上游搜索接口不返回封面地址，只能按 id 单独取一次。
 * 为避免一次搜索打出几十个请求：这里做缓存 + 并发上限，
 * 调用方再配合 IntersectionObserver 只在行可见时才请求。
 * ========================================================================= */

const coverCache = new Map<string, string>()
const coverQueue: (() => void)[] = []
const MAX_CONCURRENT_COVER = 4
let activeCoverRequests = 0

/** 同步读缓存：undefined = 还没取过，'' = 取过但没有封面 */
export function getCachedCover(id: string): string | undefined {
    return coverCache.get(id)
}

export function requestCover(id: string): Promise<string | null> {
    const cached = coverCache.get(id)
    if (cached !== undefined) return Promise.resolve(cached || null)

    return new Promise((resolve) => {
        const run = async () => {
            activeCoverRequests++
            try {
                const res = await fetch(`/api/wangyi-music?id=${encodeURIComponent(id)}`, { cache: 'no-store' })
                const data = await res.json()
                const cover = data?.code === 200 && data?.data?.picurl ? String(data.data.picurl) : ''
                coverCache.set(id, cover)
                resolve(cover || null)
            } catch {
                coverCache.set(id, '')
                resolve(null)
            } finally {
                activeCoverRequests--
                const next = coverQueue.shift()
                if (next) next()
            }
        }
        if (activeCoverRequests < MAX_CONCURRENT_COVER) void run()
        else coverQueue.push(run)
    })
}

const colorCache = new Map<string, [string, string]>()

/**
 * 从专辑封面提取两种主色，供背景渐变使用。
 * 量化到 40 一档并按饱和度加权，避免选中灰白背景色。
 */
export async function extractDominantColors(imgUrl: string): Promise<[string, string]> {
    const cached = colorCache.get(imgUrl)
    if (cached) return cached

    return new Promise((resolve) => {
        const fallback: [string, string] = ['#3a1414', '#0d0d12']
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas')
                const ctx = canvas.getContext('2d')
                if (!ctx) return resolve(fallback)

                canvas.width = 24
                canvas.height = 24
                ctx.drawImage(img, 0, 0, 24, 24)
                const data = ctx.getImageData(0, 0, 24, 24).data

                const scoreMap = new Map<string, number>()
                let sumR = 0
                let sumG = 0
                let sumB = 0
                let counted = 0
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i]
                    const g = data[i + 1]
                    const b = data[i + 2]
                    sumR += r
                    sumG += g
                    sumB += b
                    counted++

                    // 近黑/近白的像素不当主色：否则深色封面会取到"纯黑"，
                    // 背景就成了一坨黑（这正是"上下发黑"的一个来源）。
                    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
                    if (luminance < 0.07 || luminance > 0.93) continue

                    const key = `${Math.round(r / 40) * 40},${Math.round(g / 40) * 40},${Math.round(b / 40) * 40}`
                    const max = Math.max(r, g, b)
                    const min = Math.min(r, g, b)
                    const saturation = max === 0 ? 0 : (max - min) / max
                    scoreMap.set(key, (scoreMap.get(key) || 0) + 0.35 + saturation * 1.65)
                }

                const top = [...scoreMap.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 4)
                    .map(([key]) => {
                        const [r, g, b] = key.split(',').map(Number)
                        const clamp = (v: number) => Math.max(0, Math.min(255, v))
                        return `rgb(${clamp(r)},${clamp(g)},${clamp(b)})`
                    })

                // 没有可用的彩色候选时（整张封面都很暗/很亮），用整图平均色兜底，
                // 至少保证背景还能反映封面的色调。
                if (top.length < 2 && counted > 0) {
                    const avg = `rgb(${Math.round(sumR / counted)},${Math.round(sumG / counted)},${Math.round(sumB / counted)})`
                    while (top.length < 2) top.push(avg)
                }

                const colors: [string, string] = [top[0], top[1]]
                colorCache.set(imgUrl, colors)
                resolve(colors)
            } catch {
                resolve(fallback)
            }
        }
        img.onerror = () => resolve(fallback)
        img.src = imgUrl
    })
}
