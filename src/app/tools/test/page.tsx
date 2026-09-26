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
    const patterns = [
        /[?&]id=(\d+)/,
        /song\/(\d+)/,
        /^\s*(\d+)\s*$/,
    ]
    for (const pattern of patterns) {
        const match = trimmed.match(pattern)
        if (match?.[1]) return match[1]
    }
    return trimmed
}

type PlayMode = 'order' | 'repeat-one' | 'shuffle'

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


type ToolMode = 'music' | 'netdisk'
type NetdiskProvider = 'baidu' | 'quark' | 'aliyun' | '123pan' | 'tianyi' | 'xunlei' | 'uc' | 'mobile' | 'unknown'

interface NetdiskResult {
    provider: NetdiskProvider
    providerName: string
    shareUrl: string
    fileName: string
    size?: number
    isFolder?: boolean
    downloadUrl?: string
    expiresAt?: string
    headers?: Record<string, string>
    message?: string
}

interface NetdiskHistoryItem extends NetdiskResult {
    id: string
    createdAt: number
}

const NETDISK_PROVIDERS: Array<{ id: NetdiskProvider; name: string; hosts: string[] }> = [
    { id: 'baidu', name: '百度网盘', hosts: ['pan.baidu.com'] },
    { id: 'quark', name: '夸克网盘', hosts: ['pan.quark.cn'] },
    { id: 'aliyun', name: '阿里云盘', hosts: ['www.alipan.com', 'www.aliyundrive.com'] },
    { id: '123pan', name: '123云盘', hosts: ['www.123pan.com', '123pan.com'] },
    { id: 'tianyi', name: '天翼云盘', hosts: ['cloud.189.cn'] },
    { id: 'xunlei', name: '迅雷云盘', hosts: ['pan.xunlei.com'] },
    { id: 'uc', name: 'UC网盘', hosts: ['drive.uc.cn'] },
    { id: 'mobile', name: '移动云盘', hosts: ['yun.139.com'] },
]

function detectNetdiskProvider(input: string) {
    const trimmed = input.trim()
    try {
        const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
        const host = new URL(normalized).hostname.toLowerCase()
        const item = NETDISK_PROVIDERS.find(provider => provider.hosts.some(h => host === h || host.endsWith(`.${h}`)))
        return item || { id: 'unknown' as const, name: '暂未识别', hosts: [] }
    } catch {
        const item = NETDISK_PROVIDERS.find(provider => provider.hosts.some(h => trimmed.toLowerCase().includes(h)))
        return item || { id: 'unknown' as const, name: '暂未识别', hosts: [] }
    }
}

function formatBytes(value?: number) {
    if (!value || value <= 0) return '未知'
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let size = value
    let unit = 0
    while (size >= 1024 && unit < units.length - 1) {
        size /= 1024
        unit++
    }
    return `${size >= 100 || unit === 0 ? size.toFixed(0) : size.toFixed(2)} ${units[unit]}`
}

function buildCurlCommand(result: NetdiskResult) {
    if (!result.downloadUrl) return ''
    const headers = Object.entries(result.headers || {})
        .map(([key, value]) => `-H ${JSON.stringify(`${key}: ${value}`)}`)
        .join(' ')
    return `curl -L ${headers ? `${headers} ` : ''}${JSON.stringify(result.downloadUrl)} -o ${JSON.stringify(result.fileName || 'download.bin')}`
}

function buildAria2Command(result: NetdiskResult) {
    if (!result.downloadUrl) return ''
    const headers = Object.entries(result.headers || {})
        .map(([key, value]) => `--header=${JSON.stringify(`${key}: ${value}`)}`)
        .join(' ')
    return `aria2c -c -x 16 -s 16 ${headers ? `${headers} ` : ''}-o ${JSON.stringify(result.fileName || 'download.bin')} ${JSON.stringify(result.downloadUrl)}`
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
    const [volume, setVolume] = useState(0.8)
    const [muted, setMuted] = useState(false)
    const [playbackRate, setPlaybackRate] = useState(1)
    const [playMode, setPlayMode] = useState<PlayMode>('order')
    const [queueOpen, setQueueOpen] = useState(false)
    const [toolMode, setToolMode] = useState<ToolMode>('music')
    const [netdiskInput, setNetdiskInput] = useState('')
    const [netdiskPassword, setNetdiskPassword] = useState('')
    const [netdiskLoading, setNetdiskLoading] = useState(false)
    const [netdiskError, setNetdiskError] = useState('')
    const [netdiskResult, setNetdiskResult] = useState<NetdiskResult | null>(null)
    const [netdiskHistory, setNetdiskHistory] = useState<NetdiskHistoryItem[]>([])
    const [netdiskCopied, setNetdiskCopied] = useState('')

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
            const existingIndex = prev.findIndex(item => item.id === song.id)
            if (existingIndex >= 0) {
                setCurrentIndex(existingIndex)
                return prev
            }
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
        if (playMode === 'shuffle' && playlist.length > 1) {
            let nextIndex = currentIndex
            while (nextIndex === currentIndex) nextIndex = Math.floor(Math.random() * playlist.length)
            shouldAutoPlayRef.current = true
            setCurrentIndex(nextIndex)
        } else if (currentIndex < playlist.length - 1) {
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
        if (playMode === 'repeat-one' && audioRef.current) {
            audioRef.current.currentTime = 0
            audioRef.current.play().catch(() => { })
            return
        }
        playNext()
    }

    const cyclePlayMode = () => {
        setPlayMode(prev => prev === 'order' ? 'repeat-one' : prev === 'repeat-one' ? 'shuffle' : 'order')
    }

    const removeFromQueue = (index: number) => {
        setPlaylist(prev => prev.filter((_, i) => i !== index))
        if (index < currentIndex) setCurrentIndex(i => i - 1)
        else if (index === currentIndex) {
            if (playlist.length <= 1) {
                setCurrentIndex(-1)
                setIsPlaying(false)
            } else {
                setCurrentIndex(Math.min(index, playlist.length - 2))
                shouldAutoPlayRef.current = true
            }
        }
    }

    const seekToLyric = (time: number) => {
        if (!audioRef.current) return
        audioRef.current.currentTime = time
        audioRef.current.play().catch(() => { })
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

    useEffect(() => {
        const savedVolume = Number(localStorage.getItem('wy-volume'))
        const savedMode = localStorage.getItem('wy-play-mode') as PlayMode | null
        if (!Number.isNaN(savedVolume) && savedVolume >= 0 && savedVolume <= 1) setVolume(savedVolume)
        if (savedMode && ['order', 'repeat-one', 'shuffle'].includes(savedMode)) setPlayMode(savedMode)
    }, [])

    useEffect(() => {
        if (audioRef.current) audioRef.current.volume = muted ? 0 : volume
        localStorage.setItem('wy-volume', String(volume))
    }, [volume, muted])

    useEffect(() => {
        if (audioRef.current) audioRef.current.playbackRate = playbackRate
    }, [playbackRate, currentSong?.id])

    useEffect(() => {
        localStorage.setItem('wy-play-mode', playMode)
    }, [playMode])

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null
            if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return
            if (e.code === 'Space') {
                e.preventDefault()
                togglePlay()
            } else if (e.code === 'ArrowRight' && audioRef.current) {
                audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 5)
            } else if (e.code === 'ArrowLeft' && audioRef.current) {
                audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5)
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [duration])

    useEffect(() => {
        try {
            const raw = localStorage.getItem('netdisk-history')
            if (raw) setNetdiskHistory(JSON.parse(raw))
        } catch { }
    }, [])

    const saveNetdiskHistory = (result: NetdiskResult) => {
        const item: NetdiskHistoryItem = {
            ...result,
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            createdAt: Date.now(),
        }
        setNetdiskHistory(prev => {
            const next = [item, ...prev.filter(h => h.shareUrl !== item.shareUrl)].slice(0, 12)
            try { localStorage.setItem('netdisk-history', JSON.stringify(next)) } catch { }
            return next
        })
    }

    const parseNetdisk = async () => {
        const shareUrl = netdiskInput.trim()
        if (!shareUrl) {
            setNetdiskError('请粘贴网盘分享链接')
            return
        }
        const detected = detectNetdiskProvider(shareUrl)
        if (detected.id === 'unknown') {
            setNetdiskError('暂未识别这个网盘链接，目前支持百度、夸克、阿里、123、天翼、迅雷、UC、移动云盘')
            return
        }

        setNetdiskLoading(true)
        setNetdiskError('')
        setNetdiskResult(null)
        try {
            const res = await fetch('/api/netdisk/parse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shareUrl, password: netdiskPassword.trim() || undefined }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok || data.code !== 200 || !data.data) {
                throw new Error(data.message || data.msg || `解析失败（HTTP ${res.status}）`)
            }
            const result: NetdiskResult = {
                provider: data.data.provider || detected.id,
                providerName: data.data.providerName || detected.name,
                shareUrl,
                fileName: data.data.fileName || data.data.name || '未命名文件',
                size: Number(data.data.size) || undefined,
                isFolder: Boolean(data.data.isFolder),
                downloadUrl: data.data.downloadUrl || data.data.url || undefined,
                expiresAt: data.data.expiresAt || undefined,
                headers: data.data.headers || undefined,
                message: data.data.message || undefined,
            }
            setNetdiskResult(result)
            saveNetdiskHistory(result)
        } catch (err) {
            setNetdiskError(err instanceof Error ? err.message : '解析失败，请稍后重试')
        } finally {
            setNetdiskLoading(false)
        }
    }

    const copyNetdiskText = async (text: string, type: string) => {
        if (!text) return
        try {
            await navigator.clipboard.writeText(text)
            setNetdiskCopied(type)
            window.setTimeout(() => setNetdiskCopied(''), 1400)
        } catch {
            setNetdiskError('复制失败，请手动复制')
        }
    }

    const clearNetdiskHistory = () => {
        setNetdiskHistory([])
        try { localStorage.removeItem('netdisk-history') } catch { }
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

                {/* 工具切换 */}
                <div className="px-6 pt-3">
                    <div className="max-w-3xl mx-auto flex items-center justify-center">
                        <div className="inline-flex rounded-2xl border border-white/10 bg-black/25 backdrop-blur-xl p-1 shadow-lg">
                            <button
                                onClick={() => setToolMode('music')}
                                className={`px-5 py-2.5 rounded-xl text-sm transition ${toolMode === 'music' ? 'bg-[#ec4141] text-white shadow-md' : 'text-white/55 hover:text-white hover:bg-white/5'}`}
                            >
                                音乐解析
                            </button>
                            <button
                                onClick={() => setToolMode('netdisk')}
                                className={`px-5 py-2.5 rounded-xl text-sm transition ${toolMode === 'netdisk' ? 'bg-sky-500 text-white shadow-md' : 'text-white/55 hover:text-white hover:bg-white/5'}`}
                            >
                                网盘解析
                            </button>
                        </div>
                    </div>
                </div>

                {toolMode === 'music' ? (
                    <>
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
                        <div className="w-full max-w-6xl flex flex-col md:flex-row gap-10 md:gap-16 items-start rounded-[2rem] border border-white/10 bg-black/25 backdrop-blur-2xl p-5 sm:p-8 shadow-2xl shadow-black/40 ring-1 ring-white/[0.03]">
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
                                                    className={`text-left py-2.5 transition-all duration-300 cursor-pointer hover:text-white/80 ${
                                                        i === currentLyricIndex
                                                            ? 'text-white text-lg font-semibold translate-x-1'
                                                            : 'text-white/35 text-sm'
                                                    }`}
                                                    aria-current={i === currentLyricIndex ? 'true' : undefined}
                                                    onClick={() => seekToLyric(line.time)}
                                                    title="点击跳转到这句歌词"
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
                            <p className="text-sm">粘贴歌曲链接 / ID，或点击「每日推荐」开始播放；空格暂停，方向键快进/快退 5 秒</p>
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
                                    <button
                                        onClick={cyclePlayMode}
                                        aria-label="切换播放模式"
                                        title={playMode === 'order' ? '顺序播放' : playMode === 'repeat-one' ? '单曲循环' : '随机播放'}
                                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all active:scale-95 text-xs"
                                    >
                                        {playMode === 'order' ? '↻' : playMode === 'repeat-one' ? '①' : '⤨'}
                                    </button>
                                    <button
                                        onClick={() => setQueueOpen(v => !v)}
                                        aria-label="播放队列"
                                        title="播放队列"
                                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all active:scale-95 text-sm"
                                    >
                                        ☰
                                    </button>
                                </div>

                                <div className="flex items-center gap-3 w-full max-w-md px-1">
                                    <button onClick={() => setMuted(v => !v)} className="text-xs text-white/60 hover:text-white w-8" aria-label={muted ? '取消静音' : '静音'}>
                                        {muted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
                                    </button>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={muted ? 0 : volume}
                                        onChange={(e) => { setMuted(false); setVolume(Number(e.target.value)) }}
                                        className="flex-1 accent-[#ec4141]"
                                        aria-label="音量"
                                    />
                                    <select
                                        value={playbackRate}
                                        onChange={(e) => setPlaybackRate(Number(e.target.value))}
                                        className="bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none"
                                        aria-label="播放速度"
                                    >
                                        {[0.75, 1, 1.25, 1.5, 2].map(rate => <option key={rate} value={rate} className="bg-neutral-900">{rate}x</option>)}
                                    </select>
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

                                {queueOpen && (
                                    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/25 backdrop-blur-xl overflow-hidden">
                                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                                            <div>
                                                <p className="text-sm font-medium">播放队列</p>
                                                <p className="text-[11px] text-white/35">{playlist.length} 首歌曲</p>
                                            </div>
                                            <button onClick={() => { setPlaylist(currentSong ? [currentSong] : []); setCurrentIndex(currentSong ? 0 : -1) }} className="text-xs text-white/40 hover:text-white">清理队列</button>
                                        </div>
                                        <div className="max-h-52 overflow-y-auto">
                                            {playlist.map((song, index) => (
                                                <div key={`${song.id}-${index}`} className={`flex items-center gap-3 px-3 py-2.5 border-b border-white/5 last:border-0 ${index === currentIndex ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                                                    <button onClick={() => { shouldAutoPlayRef.current = true; setCurrentIndex(index) }} className="flex-1 min-w-0 text-left">
                                                        <p className="text-sm truncate">{index === currentIndex ? '▶ ' : ''}{song.name}</p>
                                                        <p className="text-[11px] text-white/35 truncate">{song.artist} · {song.album}</p>
                                                    </button>
                                                    <button onClick={() => removeFromQueue(index)} className="text-white/25 hover:text-red-300 px-2" aria-label={`移除 ${song.name}`}>×</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
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

                    </>
                ) : (
                    <>
                        <div className="px-6 py-5">
                            <div className="max-w-4xl mx-auto rounded-[2rem] border border-white/10 bg-black/25 backdrop-blur-2xl p-5 sm:p-7 shadow-2xl shadow-black/30 ring-1 ring-white/[0.03]">
                                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
                                    <div>
                                        <div className="text-xs font-semibold tracking-[0.18em] text-sky-300 mb-2">NETDISK PARSER</div>
                                        <h1 className="text-2xl sm:text-3xl font-bold">网盘链接解析</h1>
                                        <p className="mt-2 text-sm text-white/45">统一入口识别多个网盘，解析结果可复制直链、cURL 或 Aria2 命令。</p>
                                    </div>
                                    <div className="text-xs text-white/35">仅处理你有权访问和下载的文件</div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-3">
                                    <div className="relative">
                                        <input
                                            value={netdiskInput}
                                            onChange={(e) => setNetdiskInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && !netdiskLoading && parseNetdisk()}
                                            placeholder="粘贴百度 / 夸克 / 阿里 / 123 / 天翼 / 迅雷 / UC / 移动云盘分享链接"
                                            className="w-full px-4 py-3.5 rounded-xl bg-white/[0.06] border border-white/10 text-sm text-white placeholder-white/25 outline-none transition focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/15"
                                        />
                                        {netdiskInput.trim() && (
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] px-2 py-1 rounded-md bg-white/10 text-white/55">
                                                {detectNetdiskProvider(netdiskInput).name}
                                            </span>
                                        )}
                                    </div>
                                    <input
                                        value={netdiskPassword}
                                        onChange={(e) => setNetdiskPassword(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && !netdiskLoading && parseNetdisk()}
                                        placeholder="提取码（可选）"
                                        className="px-4 py-3.5 rounded-xl bg-white/[0.06] border border-white/10 text-sm text-white placeholder-white/25 outline-none transition focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/15"
                                    />
                                    <button
                                        onClick={parseNetdisk}
                                        disabled={netdiskLoading}
                                        className="px-5 py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium active:scale-[.98] transition disabled:opacity-40 min-w-28"
                                    >
                                        {netdiskLoading ? '解析中…' : '开始解析'}
                                    </button>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    {NETDISK_PROVIDERS.map(provider => (
                                        <span key={provider.id} className="px-2.5 py-1.5 rounded-lg border border-white/8 bg-white/[0.035] text-[11px] text-white/45">{provider.name}</span>
                                    ))}
                                </div>

                                {netdiskError && (
                                    <div className="mt-4 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{netdiskError}</div>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 px-6 pb-6">
                            <div className="max-w-4xl mx-auto space-y-5">
                                {netdiskResult ? (
                                    <div className="rounded-[2rem] border border-white/10 bg-black/25 backdrop-blur-2xl overflow-hidden shadow-xl">
                                        <div className="p-5 sm:p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-sky-400/15 border border-sky-300/20 flex items-center justify-center text-2xl shrink-0">☁</div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                    <span className="text-xs px-2 py-1 rounded-md bg-sky-400/15 text-sky-200">{netdiskResult.providerName}</span>
                                                    {netdiskResult.isFolder && <span className="text-xs px-2 py-1 rounded-md bg-white/10 text-white/55">文件夹</span>}
                                                </div>
                                                <h2 className="text-lg font-semibold truncate">{netdiskResult.fileName}</h2>
                                                <p className="text-xs text-white/35 mt-1">大小：{formatBytes(netdiskResult.size)}{netdiskResult.expiresAt ? ` · 直链有效期至 ${netdiskResult.expiresAt}` : ''}</p>
                                            </div>
                                        </div>

                                        <div className="p-5 sm:p-6 space-y-4">
                                            {netdiskResult.downloadUrl ? (
                                                <>
                                                    <div className="rounded-xl bg-black/20 border border-white/8 px-4 py-3 font-mono text-xs text-white/45 break-all">{netdiskResult.downloadUrl}</div>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                        <a
                                                            href={netdiskResult.downloadUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-center px-3 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-sm font-medium transition"
                                                        >
                                                            浏览器下载
                                                        </a>
                                                        <button onClick={() => copyNetdiskText(netdiskResult.downloadUrl || '', 'url')} className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm transition">{netdiskCopied === 'url' ? '已复制' : '复制直链'}</button>
                                                        <button onClick={() => copyNetdiskText(buildCurlCommand(netdiskResult), 'curl')} className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm transition">{netdiskCopied === 'curl' ? '已复制' : '复制 cURL'}</button>
                                                        <button onClick={() => copyNetdiskText(buildAria2Command(netdiskResult), 'aria2')} className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm transition">{netdiskCopied === 'aria2' ? '已复制' : '复制 Aria2'}</button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="rounded-xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                                                    {netdiskResult.message || '已识别分享链接，但当前 Provider 没有返回可下载直链。'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-[2rem] border border-dashed border-white/10 bg-white/[0.025] py-16 text-center">
                                        <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl text-white/30">↗</div>
                                        <h2 className="mt-4 text-base font-medium text-white/65">等待解析网盘链接</h2>
                                        <p className="mt-2 text-sm text-white/30">系统会自动识别网盘类型，并由服务端 Provider 处理。</p>
                                    </div>
                                )}

                                <div className="rounded-2xl border border-white/10 bg-black/20 backdrop-blur-xl overflow-hidden">
                                    <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-sm font-medium">最近解析</h3>
                                            <p className="text-[11px] text-white/30 mt-0.5">仅保存在当前浏览器</p>
                                        </div>
                                        {netdiskHistory.length > 0 && <button onClick={clearNetdiskHistory} className="text-xs text-white/35 hover:text-white">清空</button>}
                                    </div>
                                    {netdiskHistory.length > 0 ? (
                                        <div className="divide-y divide-white/5">
                                            {netdiskHistory.slice(0, 6).map(item => (
                                                <button
                                                    key={item.id}
                                                    onClick={() => { setNetdiskResult(item); setNetdiskInput(item.shareUrl) }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] text-left transition"
                                                >
                                                    <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white/40">☁</div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm truncate">{item.fileName}</p>
                                                        <p className="text-[11px] text-white/30 mt-0.5">{item.providerName} · {formatBytes(item.size)}</p>
                                                    </div>
                                                    <span className="text-xs text-white/20">›</span>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="px-4 py-8 text-center text-sm text-white/25">暂无解析记录</div>
                                    )}
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-xs text-white/40 leading-6">
                                    网盘模块采用统一 Provider 接口。前端只提交分享链接和可选提取码；需要登录态的网盘应在服务端通过你自己的授权配置处理，不在浏览器保存 Cookie、BDUSS 或访问令牌。下载速度最终取决于网盘服务本身、账号权限和网络状况。
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* 底部说明 */}
                <div className="px-6 pb-6 pt-2">
                    <div className="max-w-3xl mx-auto bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4">
                        <h3 className="text-sm font-semibold text-white/70 mb-2">使用说明</h3>
                        {toolMode === 'music' ? (
                            <ul className="text-xs text-white/40 space-y-1">
                                <li>• 支持粘贴歌曲 ID 或含 id= 的网易云分享链接，也可点击「每日推荐」</li>
                                <li>• 支持顺序 / 单曲循环 / 随机播放、播放队列、音量、静音、倍速和歌词点击跳转</li>
                                <li>• 快捷键：空格播放/暂停，← / → 快退或快进 5 秒；音量与播放模式会自动记忆</li>
                                <li>• 数据来自第三方解析节点，不保证长期可用；仅供个人试听，尊重版权</li>
                            </ul>
                        ) : (
                            <ul className="text-xs text-white/40 space-y-1">
                                <li>• 自动识别百度、夸克、阿里、123、天翼、迅雷、UC、移动云盘分享链接</li>
                                <li>• 服务端解析成功后，可浏览器下载或复制直链、cURL、Aria2 命令</li>
                                <li>• 解析历史仅保存于本地浏览器；敏感授权凭据不应传入前端</li>
                                <li>• 请仅解析和下载你有权访问的内容，并遵守对应网盘服务规则</li>
                            </ul>
                        )}
                    </div>
                    <div className="mt-4">
                        <FooterNote />
                    </div>
                </div>
            </div>
        </div>
    )
}
