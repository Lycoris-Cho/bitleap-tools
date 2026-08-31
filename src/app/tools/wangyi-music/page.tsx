'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

interface MusicResult {
    id: string
    name: string
    artist: string
    album: string
    cover: string
    url: string
    duration: number
    pay: string
}

interface LyricLine {
    time: number
    text: string
}

function extractSongId(input: string): string {
    const trimmed = input.trim()
    const match = trimmed.match(/id=(\d+)/)
    if (match?.[1]) return match[1]
    return trimmed
}

function formatTime(sec: number) {
    if (!sec || isNaN(sec)) return '0:00'
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${String(s).padStart(2, '0')}`
}

/** 解析LRC歌词 */
function parseLRC(lrc: string): LyricLine[] {
    const lines = lrc.split('\n')
    const result: LyricLine[] = []
    const reg = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/
    for (const line of lines) {
        const match = line.match(reg)
        if (match) {
            const min = parseInt(match[1])
            const sec = parseInt(match[2])
            const ms = parseInt(match[3].padEnd(3, '0'))
            const time = min * 60 + sec + ms / 1000
            const text = match[4].trim()
            if (text) result.push({ time, text })
        }
    }
    return result.sort((a, b) => a.time - b.time)
}

/** 二分查找当前歌词，避免每次 timeupdate 都从头扫描 */
function findLyricIndex(lyrics: LyricLine[], time: number) {
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

const colorCache = new Map<string, [string, string]>()

/** 从专辑封面提取两种主色 */
async function extractDominantColors(imgUrl: string): Promise<[string, string]> {
    const cached = colorCache.get(imgUrl)
    if (cached) return cached

    return new Promise((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas')
                const ctx = canvas.getContext('2d')
                if (!ctx) return resolve(['#1a1a2e', '#16213e'])
                canvas.width = 24
                canvas.height = 24
                ctx.drawImage(img, 0, 0, 24, 24)
                const data = ctx.getImageData(0, 0, 24, 24).data
                const colorMap = new Map<string, number>()
                for (let i = 0; i < data.length; i += 4) {
                    const r = Math.round(data[i] / 48) * 48
                    const g = Math.round(data[i + 1] / 48) * 48
                    const b = Math.round(data[i + 2] / 48) * 48
                    const key = `${r},${g},${b}`
                    colorMap.set(key, (colorMap.get(key) || 0) + 1)
                }
                const sorted = [...colorMap.entries()].sort((a, b) => b[1] - a[1])
                const top = sorted.slice(0, 2).map(([k]) => {
                    const [r, g, b] = k.split(',').map(Number)
                    return `rgb(${r},${g},${b})`
                })
                const colors: [string, string] = top.length >= 2
                    ? [top[0], top[1]]
                    : [top[0] || '#1a1a2e', '#0f0f1a']
                colorCache.set(imgUrl, colors)
                resolve(colors)
            } catch {
                resolve(['#1a1a2e', '#0f0f1a'])
            }
        }
        img.onerror = () => resolve(['#1a1a2e', '#0f0f1a'])
        img.src = imgUrl
    })
}

export default function WangyiMusicPage() {
    const [musicId, setMusicId] = useState('')
    const [randomLoading, setRandomLoading] = useState(false)
    const [coverLoading, setCoverLoading] = useState(false)
    const [playlist, setPlaylist] = useState<MusicResult[]>([])
    const [currentIndex, setCurrentIndex] = useState(-1)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [copied, setCopied] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [lyrics, setLyrics] = useState<LyricLine[]>([])
    const [currentLyricIndex, setCurrentLyricIndex] = useState(-1)
    const [bgColors, setBgColors] = useState<[string, string] | null>(null)

    const abortControllerRef = useRef<AbortController | null>(null)
    const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const audioRef = useRef<HTMLAudioElement>(null)
    const progressRef = useRef<HTMLDivElement>(null)
    const lyricContainerRef = useRef<HTMLDivElement>(null)
    const lyricAbortRef = useRef<AbortController | null>(null)
    const loadVersionRef = useRef(0)
    const nextLoadingRef = useRef(false)
    const shouldAutoPlayRef = useRef(false)

    const currentSong = currentIndex >= 0 ? playlist[currentIndex] : null
    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

    /* ---------- 加载歌曲（歌词 + 颜色并行，且避免旧请求覆盖新歌曲） ---------- */
    const loadSong = useCallback(async (song: MusicResult) => {
        const version = ++loadVersionRef.current
        lyricAbortRef.current?.abort()
        const lyricController = new AbortController()
        lyricAbortRef.current = lyricController

        setCurrentTime(0)
        setDuration(0)
        setLyrics([])
        setCurrentLyricIndex(-1)

        const lyricTask = fetch(`/api/wangyi-lyrics?id=${encodeURIComponent(song.id)}`, {
            signal: lyricController.signal,
        })
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                return res.json()
            })
            .then(data => data.code === 200 && data.data?.lyric ? parseLRC(data.data.lyric) : [])
            .catch(err => {
                if (err instanceof DOMException && err.name === 'AbortError') return []
                return []
            })

        const colorTask = song.cover
            ? extractDominantColors(song.cover)
            : Promise.resolve<[string, string]>(['#171717', '#090909'])

        const [nextLyrics, nextColors] = await Promise.all([lyricTask, colorTask])
        if (version !== loadVersionRef.current) return

        setLyrics(nextLyrics)
        setBgColors(nextColors)
    }, [])

    useEffect(() => {
        if (currentSong) setCoverLoading(true)
    }, [currentSong?.id])

    useEffect(() => {
        if (currentSong) loadSong(currentSong)
    }, [currentSong, loadSong])

    /* ---------- 歌词自动滚动（修复首尾截断，当前行停留在视口偏上位置） ---------- */
    useEffect(() => {
        if (currentLyricIndex < 0 || !lyricContainerRef.current) return
        const container = lyricContainerRef.current
        const line = container.querySelector(`[data-lyric-index="${currentLyricIndex}"]`) as HTMLElement
        if (line) {
            const containerRect = container.getBoundingClientRect()
            const lineRect = line.getBoundingClientRect()
            // 调整偏移比例，配合上下内边距，确保首尾歌词完整显示
            const offset = lineRect.top - containerRect.top - containerRect.height * 0.28 + lineRect.height / 2
            container.scrollBy({ top: offset, behavior: 'smooth' })
        }
    }, [currentLyricIndex])

    /* ---------- 全局清理 ---------- */
    useEffect(() => {
        return () => {
            abortControllerRef.current?.abort()
            lyricAbortRef.current?.abort()
            if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
        }
    }, [])

    /* ---------- 加入队列并播放 ---------- */
    const addToQueueAndPlay = useCallback((song: MusicResult) => {
        setPlaylist(prev => {
            const next = [...prev, song]
            setCurrentIndex(next.length - 1)
            return next
        })
    }, [])

    /* ---------- 解析用户输入 ---------- */
    const fetchMusic = async () => {
        const inputVal = musicId.trim()
        if (!inputVal) {
            setError('请输入歌曲 ID 或网易云分享链接')
            return
        }
        abortControllerRef.current?.abort()
        const controller = new AbortController()
        abortControllerRef.current = controller
        const songId = extractSongId(inputVal)

        setLoading(true)
        setError('')
        setIsPlaying(false)

        try {
            const res = await fetch(`/api/wangyi-music?id=${encodeURIComponent(songId)}`, { signal: controller.signal })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()
            if (data.code === 200 && data.data && typeof data.data === 'object') {
                const d = data.data
                shouldAutoPlayRef.current = true
                addToQueueAndPlay({
                    id: d.id, name: d.name, artist: d.artistsname, album: d.album,
                    cover: d.picurl, url: d.url, duration: d.duration, pay: d.pay,
                })
            } else {
                setError(data.msg || '解析失败，可能是 ID 错误、歌曲下架或接口暂时不可用')
            }
        } catch (err: unknown) {
            if ((err as Error)?.name === 'AbortError') return
            setError('网络请求失败，请稍后再试：' + String(err))
        } finally {
            if (abortControllerRef.current === controller) setLoading(false)
        }
    }

    /* ---------- 每日推荐 ---------- */
    const fetchRandom = async () => {
        setError('')
        setRandomLoading(true)
        try {
            const res = await fetch('/api/wangyi-random')
            const data = await res.json()
            if (data.code === 200 && data.data) {
                const d = data.data
                shouldAutoPlayRef.current = true
                addToQueueAndPlay({
                    id: String(d.id), name: d.name, artist: d.artistsname, album: d.album,
                    cover: d.picurl, url: d.url, duration: d.duration, pay: d.pay,
                })
            } else {
                setError('获取推荐失败，请稍后再试')
            }
        } catch {
            setError('网络请求失败，请稍后再试')
        } finally {
            setRandomLoading(false)
        }
    }

    /* ---------- 上一首 / 下一首 ---------- */
    const playPrev = () => {
        if (currentIndex > 0) {
            shouldAutoPlayRef.current = true
            setCurrentIndex(currentIndex - 1)
        }
    }

    const playNext = async () => {
        if (nextLoadingRef.current) return
        setCoverLoading(true)
        if (currentIndex < playlist.length - 1) {
            shouldAutoPlayRef.current = true
            setCurrentIndex(currentIndex + 1)
        } else {
            nextLoadingRef.current = true
            try {
                const res = await fetch('/api/wangyi-random')
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                const data = await res.json()
                if (data.code === 200 && data.data) {
                    const d = data.data
                    shouldAutoPlayRef.current = true
                    setPlaylist(prev => {
                        const next = [...prev, {
                            id: String(d.id), name: d.name, artist: d.artistsname, album: d.album,
                            cover: d.picurl, url: d.url, duration: d.duration, pay: d.pay,
                        }]
                        setCurrentIndex(next.length - 1)
                        return next
                    })
                }
            } catch {
                setError('自动获取下一首失败，请手动重试')
            } finally {
                nextLoadingRef.current = false
            }
        }
    }

    /* ---------- 播放控制 ---------- */
    const togglePlay = () => {
        const audio = audioRef.current
        if (!audio) return
        if (audio.paused) audio.play()
        else audio.pause()
    }

    const handleTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement>) => {
        const t = e.currentTarget.currentTime
        setCurrentTime(t)
        if (lyrics.length > 0) {
            const idx = findLyricIndex(lyrics, t)
            setCurrentLyricIndex(prev => prev === idx ? prev : idx)
        }
    }

    const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLAudioElement>) => {
        setDuration(e.currentTarget.duration)
    }

    const handleCanPlay = () => {
        if (shouldAutoPlayRef.current) {
            audioRef.current?.play().catch(() => { })
            shouldAutoPlayRef.current = false
        }
    }

    const handleEnded = () => {
        setIsPlaying(false)
        playNext()
    }

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        const audio = audioRef.current
        const bar = progressRef.current
        if (!audio || !bar || !duration) return
        const rect = bar.getBoundingClientRect()
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
        audio.currentTime = percent * duration
    }

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text)
            setCopied(true)
            if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
            copyTimerRef.current = setTimeout(() => setCopied(false), 1500)
        } catch {
            setError('复制失败，请手动复制链接')
        }
    }

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-[#090909] text-white">
            {/* 双色渐变背景 */}
            <div
                className="absolute inset-0 transition-all duration-1000"
                style={{
                    background: bgColors
                        ? `linear-gradient(135deg, ${bgColors[0]}, ${bgColors[1]})`
                        : 'linear-gradient(145deg, #321313 0%, #171717 38%, #090909 100%)'
                }}
            />
            <div className="absolute inset-0 bg-black/45" />
            <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-[#ec4141]/10 to-transparent pointer-events-none" />

            <div className="relative z-10 flex flex-col min-h-screen">
                {/* 顶部栏 */}
                <div className="px-6 pt-6 pb-2">
                    <Breadcrumb />
                </div>

                {/* 输入区 */}
                <div className="px-6 py-4">
                    <div className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-3">
                        <input
                            value={musicId}
                            onChange={(e) => setMusicId(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !loading && fetchMusic()}
                            placeholder="粘贴网易云歌曲链接或 ID"
                            className="flex-1 px-4 py-3 rounded-xl bg-black/35 border border-white/10 text-sm text-white placeholder-white/35 outline-none transition focus:border-[#ec4141]/70 focus:ring-2 focus:ring-[#ec4141]/20"
                        />
                        <button
                            onClick={fetchMusic}
                            disabled={loading}
                            className="px-5 py-3 rounded-xl bg-[#ec4141] hover:bg-[#d73535] text-white text-sm font-medium active:scale-[.98] transition disabled:opacity-40 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10" strokeWidth={3} strokeOpacity={0.25} />
                                    <path strokeLinecap="round" strokeWidth={3} d="M12 2a10 10 0 0 1 10 10" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            )}
                            解析
                        </button>
                        <button
                            onClick={fetchRandom}
                            disabled={randomLoading}
                            className="px-5 py-3 rounded-xl bg-white/8 hover:bg-white/12 border border-white/10 text-white text-sm font-medium active:scale-[.98] transition disabled:opacity-40 flex items-center justify-center gap-2"
                        >
                            {randomLoading ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10" strokeWidth={3} strokeOpacity={0.25} />
                                    <path strokeLinecap="round" strokeWidth={3} d="M12 2a10 10 0 0 1 10 10" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
                                </svg>
                            )}
                            每日推荐
                        </button>
                    </div>
                    {error && (
                        <div className="max-w-3xl mx-auto mt-3 p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-200 text-sm font-mono backdrop-blur-md">
                            ❌ {error}
                        </div>
                    )}
                </div>

                {/* 中间播放器主体 */}
                <div className="flex-1 flex items-center justify-center px-6 py-6">
                    {currentSong ? (
                        <div className="w-full max-w-6xl flex flex-col md:flex-row gap-10 md:gap-16 items-start rounded-3xl border border-white/8 bg-black/20 p-5 sm:p-8 shadow-2xl shadow-black/30">
                            {/* 左侧：黑胶唱片（已移除唱针） */}
                            <div className="relative w-64 h-64 sm:w-72 sm:h-72 md:w-96 md:h-96 shrink-0 mx-auto md:mx-0">
                                {/* 唱片外圈阴影 */}
                                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-800 to-black shadow-2xl shadow-black/60" />
                                <div
                                    className={`absolute inset-10 rounded-full overflow-hidden shadow-inner will-change-transform ${isPlaying ? 'animate-[spin_18s_linear_infinite]' : ''}`}
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={currentSong.cover}
                                        alt={`${currentSong.name} - ${currentSong.artist} 专辑封面`}
                                        draggable={false}
                                        decoding="async"
                                        onLoad={() => setCoverLoading(false)}
                                        className={`w-full h-full object-cover transition-opacity duration-500 ${coverLoading ? 'opacity-0' : 'opacity-100'}`}
                                    />
                                </div>
                            </div>

                            {/* 右侧：歌曲信息 + 歌词 */}
                            <div className="flex-1 w-full min-w-0 pt-2">
                                <div className="mb-3 text-xs font-medium tracking-[0.18em] text-[#ec4141]">NOW PLAYING</div>
                                {/* 歌曲标题 */}
                                <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-left">{currentSong.name}</h1>
                                {/* 专辑/歌手信息 */}
                                <p className="text-white/60 text-sm mb-6 text-left">
                                    专辑：{currentSong.album} &nbsp;&nbsp; 歌手：{currentSong.artist}
                                </p>

                                {/* 歌词滚动区（增加上下内边距，修复首尾截断） */}
                                <div
                                    ref={lyricContainerRef}
                                    className="h-72 md:h-80 overflow-y-auto scroll-smooth pr-2"
                                    style={{ scrollbarWidth: 'none' }}
                                >
                                    <style>{`.scroll-smooth::-webkit-scrollbar{display:none}`}</style>
                                    {/* 上下内边距设为容器高度的一半，确保首尾歌词都能完整滚动到可视区 */}
                                    <div className="py-32">
                                        {lyrics.length > 0 ? (
                                            lyrics.map((line, i) => (
                                                <p
                                                    key={i}
                                                    data-lyric-index={i}
                                                    className={`text-left py-2.5 transition-all duration-300 ${
                                                        i === currentLyricIndex
                                                            ? 'text-white text-lg font-semibold translate-x-1'
                                                            : 'text-white/35 text-sm'
                                                    }`}
                                                    aria-current={i === currentLyricIndex ? 'true' : undefined}
                                                >
                                                    {line.text}
                                                </p>
                                            ))
                                        ) : (
                                            <p className="text-left text-white/30 text-sm">暂无歌词</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-white/40">
                            <div className="w-40 h-40 mx-auto mb-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                <svg className="w-16 h-16 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                </svg>
                            </div>
                            <p className="text-sm">输入歌曲 ID / 链接，或点击「每日推荐」开始播放</p>
                        </div>
                    )}
                </div>

                {/* 底部控制栏 */}
                {currentSong?.url && (
                    <div className="px-6 pb-6 pt-2">
                        <div className="max-w-3xl mx-auto space-y-3">
                            {/* 进度条 */}
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-white/60 font-mono w-10 text-right shrink-0">
                                    {formatTime(currentTime)}
                                </span>
                                <div
                                    ref={progressRef}
                                    onClick={handleSeek}
                                    role="slider"
                                    aria-label="播放进度"
                                    aria-valuemin={0}
                                    aria-valuemax={Math.round(duration)}
                                    aria-valuenow={Math.round(currentTime)}
                                    className="flex-1 h-1.5 bg-white/15 rounded-full cursor-pointer group relative"
                                >
                                    <div className="h-full bg-[#ec4141] rounded-full relative transition-[width] duration-100" style={{ width: `${progressPercent}%` }}>
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-[#ec4141] ring-2 ring-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow" />
                                    </div>
                                </div>
                                <span className="text-xs text-white/60 font-mono w-10 shrink-0">
                                    {formatTime(duration)}
                                </span>
                            </div>

                            {/* 控制按钮 + 直链 */}
                            <div className="flex flex-col items-center gap-3">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={playPrev}
                                        aria-label="上一首"
                                        disabled={currentIndex <= 0}
                                        className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-all active:scale-95 disabled:opacity-30"
                                    >
                                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={togglePlay}
                                        aria-label={isPlaying ? '暂停' : '播放'}
                                        className="w-12 h-12 rounded-full bg-[#ec4141] text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-black/30"
                                    >
                                        {isPlaying ? (
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                        )}
                                    </button>
                                    <button
                                        onClick={playNext}
                                        aria-label="下一首"
                                        className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-all active:scale-95"
                                    >
                                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                                        </svg>
                                    </button>
                                </div>

                                {/* 直链复制 */}
                                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-2 rounded-xl border border-white/15 w-full max-w-md">
                                    <div className="flex-1 min-w-0 font-mono text-xs text-white/50 truncate">
                                        {currentSong.url}
                                    </div>
                                    <button
                                        onClick={() => copyToClipboard(currentSong.url)}
                                        className="shrink-0 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs transition-all active:scale-95"
                                    >
                                        {copied ? '✓' : '📋'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 隐藏的原生audio */}
                        <audio
                            ref={audioRef}
                            src={currentSong.url}
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            onEnded={handleEnded}
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedMetadata={handleLoadedMetadata}
                            onCanPlay={handleCanPlay}
                            preload="metadata"
                            className="hidden"
                        />
                    </div>
                )}

                {/* 底部说明 */}
                <div className="px-6 pb-6 pt-2">
                    <div className="max-w-3xl mx-auto bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4">
                        <h3 className="text-sm font-semibold text-white/70 mb-2">使用说明</h3>
                        <ul className="text-xs text-white/40 space-y-1">
                            <li>• 支持粘贴歌曲 ID 或含 id= 的网易云分享链接，也可点击「每日推荐」</li>
                            <li>• 播放结束自动切下一首，队列播完自动请求推荐；可手动上一首/下一首</li>
                            <li>• 数据来自第三方公益解析节点，不保证长期可用；仅供个人试听，尊重版权</li>
                        </ul>
                    </div>
                    <div className="mt-4">
                        <FooterNote />
                    </div>
                </div>
            </div>
        </div>
    )
}
