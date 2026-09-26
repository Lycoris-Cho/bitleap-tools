'use client'

import { useEffect, useRef, useState, type SyntheticEvent } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import Drawer from './components/Drawer'
import LyricPanel from './components/LyricPanel'
import QueuePanel from './components/QueuePanel'
import SearchPanel from './components/SearchPanel'
import Slider from './components/Slider'
import Tonearm from './components/Tonearm'
import {
    IconAlert,
    IconCheck,
    IconDisc,
    IconExternal,
    IconLink,
    IconList,
    IconMusic,
    IconMute,
    IconNext,
    IconPause,
    IconPlay,
    IconPrev,
    IconRepeat,
    IconRepeatOne,
    IconSearch,
    IconShuffle,
    IconSparkles,
    IconSpinner,
    IconVolume,
} from './components/icons'
import {
    ACCENT,
    NETEASE_SONG_URL,
    STORAGE_KEY,
    toneDown,
    extractDominantColors,
    extractSongId,
    findLyricIndex,
    formatTime,
    normalizeSong,
    parseLRC,
} from './utils'
import type { LyricLine, MusicResult, PlayMode, SearchSong } from './types'

/** 组件内自用的关键帧，避免污染全局样式 */
const KEYFRAMES = `
@keyframes wy-spin { to { transform: rotate(360deg) } }
@keyframes wy-eq { 0%,100% { height: 22% } 50% { height: 100% } }
@keyframes wy-pulse { 0%,100% { opacity: 1; transform: scale(1) } 50% { opacity: .3; transform: scale(.65) } }
@keyframes wy-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes wy-slide-in { from { opacity: 0; transform: translateX(30px) } to { opacity: 1; transform: translateX(0) } }
@keyframes wy-rise { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
@keyframes wy-panel-in { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
`

const MODE_META: Record<PlayMode, { label: string; hint: string }> = {
    list: { label: '列表循环', hint: '播完自动下一首，队列结束自动请求推荐' },
    single: { label: '单曲循环', hint: '当前歌曲结束后重新播放' },
    shuffle: { label: '随机播放', hint: '在播放列表内随机切换' },
}

const RATE_OPTIONS = [1, 1.25, 1.5, 2, 0.75]
const EXAMPLE_KEYWORDS = ['周杰伦', '海阔天空', '五月天']
const EMPTY_LYRICS: LyricLine[] = []

interface SongAssets {
    id: string
    lyrics: LyricLine[]
    /** 封面提取出的两种主色，用于背景渐变 */
    colors: [string, string]
}

/** 供快捷键与系统媒体控制调用的一组播放动作 */
interface PlayerActions {
    togglePlay: () => void
    seekBy: (delta: number) => void
    nudgeVolume: (delta: number) => void
    toggleMute: () => void
    play: () => void
    pause: () => void
    prev: () => void
    next: () => void
    seek: (time: number) => void
}

interface PersistedState {
    volume?: number
    muted?: boolean
    mode?: PlayMode
    rate?: number
    songs?: MusicResult[]
    index?: number
}

/** 随机挑一个不同于 exclude 的下标（放在组件外，保持渲染函数纯净） */
function pickRandomIndex(length: number, exclude: number) {
    if (length <= 1) return 0
    let index = exclude
    while (index === exclude) index = Math.floor(Math.random() * length)
    return index
}

export default function WangyiMusicPage() {
    const [input, setInput] = useState('')
    const [parsing, setParsing] = useState(false)
    const [randomLoading, setRandomLoading] = useState(false)
    const [panel, setPanel] = useState<'search' | 'queue' | null>(null)

    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<SearchSong[]>([])
    const [searchTotal, setSearchTotal] = useState(0)
    const [searchLoading, setSearchLoading] = useState(false)
    const [searchError, setSearchError] = useState('')
    const [resolvingId, setResolvingId] = useState<string | null>(null)

    const [queue, setQueue] = useState<{ songs: MusicResult[]; index: number }>({ songs: [], index: -1 })
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')

    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [audioDuration, setAudioDuration] = useState(0)
    const [buffered, setBuffered] = useState(0)
    const [volume, setVolume] = useState(0.8)
    const [muted, setMuted] = useState(false)
    const [playbackRate, setPlaybackRate] = useState(1)
    const [mode, setMode] = useState<PlayMode>('list')

    // 歌词与封面主色只在拉取完成后整体写入，用歌曲 id 判断是否已就绪
    const [songAssets, setSongAssets] = useState<SongAssets | null>(null)
    const [coverLoading, setCoverLoading] = useState(false)
    const [copied, setCopied] = useState(false)
    /** 小屏下：false 显示封面与歌曲信息，true 显示歌词（仿网易云移动端，点封面切换） */
    const [mobileLyrics, setMobileLyrics] = useState(false)
    /** 本地设置读取完成后才允许回写 localStorage */
    const [hydrated, setHydrated] = useState(false)

    const audioRef = useRef<HTMLAudioElement>(null)
    const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const searchAbortRef = useRef<AbortController | null>(null)
    const nextLoadingRef = useRef(false)
    const shouldAutoPlayRef = useRef(false)
    const retriedRef = useRef<Set<string>>(new Set())

    const currentSong = queue.index >= 0 ? queue.songs[queue.index] ?? null : null
    const songId = currentSong?.id ?? null
    const songCover = currentSong?.cover ?? ''
    const assets = songAssets && songAssets.id === songId ? songAssets : null
    const lyrics = assets ? assets.lyrics : EMPTY_LYRICS
    const lyricsLoading = songId !== null && assets === null
    const bgColors = assets ? assets.colors : null
    /**
     * 当前歌词行直接由播放进度推导，而不是等 timeupdate 事件。
     * 这样刚进页面、暂停中、拖动进度时也能正确高亮当前句。
     */
    const currentLyricIndex = lyrics.length > 0 ? findLyricIndex(lyrics, currentTime) : -1

    /* ==================== 小工具 ==================== */

    const flashNotice = (text: string) => {
        setNotice(text)
        if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
        noticeTimerRef.current = setTimeout(() => setNotice(''), 2600)
    }

    const resolveSongById = async (id: string): Promise<MusicResult | null> => {
        const res = await fetch(`/api/wangyi-music?id=${encodeURIComponent(id)}`, { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (data.code === 200 && data.data && typeof data.data === 'object') return normalizeSong(data.data)
        return null
    }

    const fetchRandomSong = async (): Promise<MusicResult | null> => {
        const res = await fetch('/api/wangyi-random', { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (data.code === 200 && data.data) return normalizeSong(data.data)
        return null
    }

    /* ==================== 播放列表操作 ==================== */

    /** 已在队列中则跳到该曲并刷新直链，否则追加到队尾播放 */
    const playFromLibrary = (song: MusicResult) => {
        shouldAutoPlayRef.current = true
        setQueue((q) => {
            const found = q.songs.findIndex((item) => item.id === song.id)
            if (found >= 0) {
                const songs = q.songs.slice()
                songs[found] = { ...songs[found], ...song }
                return { songs, index: found }
            }
            return { songs: [...q.songs, song], index: q.songs.length }
        })
    }

    const goTo = (index: number) => {
        if (index < 0 || index >= queue.songs.length) return
        if (index === queue.index) {
            togglePlay()
            return
        }
        shouldAutoPlayRef.current = true
        setQueue((q) => ({ ...q, index }))
    }

    const removeAt = (index: number) => {
        if (index === queue.index) shouldAutoPlayRef.current = isPlaying
        setQueue((q) => {
            const songs = q.songs.filter((_, i) => i !== index)
            if (songs.length === 0) return { songs, index: -1 }
            let next = q.index
            if (index < q.index) next = q.index - 1
            else if (index === q.index) next = Math.min(q.index, songs.length - 1)
            return { songs, index: next }
        })
    }

    /* ==================== 播放控制 ==================== */

    const togglePlay = () => {
        const audio = audioRef.current
        if (!audio || !currentSong?.url) return
        if (!audio.paused) {
            audio.pause()
            return
        }
        audio.play().catch((err: unknown) => {
            // 区分失败原因：浏览器拦截 / 后台标签被省电策略中断 / 其它
            const name = (err as Error)?.name
            if (name === 'NotAllowedError') {
                setError('浏览器拦截了自动播放，请再点一次播放按钮')
            } else if (name === 'AbortError') {
                setError('播放被浏览器中断：页面可能不在前台，或直链已失效，请再试一次')
            } else {
                setError('播放失败，请再试一次或换一首')
            }
        })
    }

    const seekTo = (time: number) => {
        const audio = audioRef.current
        if (!audio || !Number.isFinite(time)) return
        audio.currentTime = Math.max(0, time)
        setCurrentTime(Math.max(0, time))
    }

    const seekBy = (delta: number) => {
        const audio = audioRef.current
        if (!audio || !audioDuration) return
        seekTo(Math.min(audioDuration, Math.max(0, audio.currentTime + delta)))
    }

    const nudgeVolume = (delta: number) => {
        setMuted(false)
        setVolume((v) => Math.min(1, Math.max(0, Number((v + delta).toFixed(2)))))
    }

    /** 自动/手动切换下一首：单曲循环与随机模式在此分流 */
    const advance = async ({ auto = false }: { auto?: boolean } = {}) => {
        const { songs, index } = queue
        if (songs.length === 0) {
            await playRandom()
            return
        }

        if (auto && mode === 'single') {
            const audio = audioRef.current
            if (audio) {
                audio.currentTime = 0
                void audio.play().catch(() => {})
            }
            return
        }

        let next: number
        if (mode === 'shuffle' && songs.length > 1) {
            next = pickRandomIndex(songs.length, index)
        } else {
            next = index + 1
        }

        if (next < songs.length) {
            shouldAutoPlayRef.current = true
            setQueue((q) => ({ ...q, index: next }))
            return
        }

        // 队列已播完：自动续一首推荐，保持连续播放
        if (nextLoadingRef.current) return
        nextLoadingRef.current = true
        setCoverLoading(true)
        try {
            const song = await fetchRandomSong()
            if (song) playFromLibrary(song)
            else setError('自动获取下一首失败，请手动重试')
        } catch {
            setError('自动获取下一首失败，请手动重试')
        } finally {
            nextLoadingRef.current = false
        }
    }

    const playPrev = () => {
        const audio = audioRef.current
        if (!audio) return
        const { songs, index } = queue
        if (songs.length === 0) return
        // 播放超过 3 秒先回到本曲开头，符合常见播放器习惯
        if (audio.currentTime > 3) {
            seekTo(0)
            return
        }
        let prev: number
        if (mode === 'shuffle' && songs.length > 1) {
            prev = pickRandomIndex(songs.length, index)
        } else {
            prev = index - 1
        }
        if (prev < 0) {
            seekTo(0)
            return
        }
        shouldAutoPlayRef.current = true
        setQueue((q) => ({ ...q, index: prev }))
    }

    const playRandom = async () => {
        setRandomLoading(true)
        setError('')
        try {
            const song = await fetchRandomSong()
            if (!song) {
                setError('获取推荐失败，请稍后再试')
                return
            }
            playFromLibrary(song)
        } catch {
            setError('网络请求失败，请稍后再试')
        } finally {
            setRandomLoading(false)
        }
    }

    /* ==================== 搜索 ==================== */

    const runSearch = async (keywords: string) => {
        const query = keywords.trim()
        if (!query) return
        searchAbortRef.current?.abort()
        const controller = new AbortController()
        searchAbortRef.current = controller

        setSearchLoading(true)
        setSearchError('')
        try {
            const res = await fetch(`/api/wangyi-search?limit=30&keywords=${encodeURIComponent(query)}`, {
                signal: controller.signal,
                cache: 'no-store',
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()
            if (data.code === 200 && data.data) {
                const songs: SearchSong[] = (data.data.songs ?? []).map((item: Record<string, unknown>) => ({
                    id: String(item.id ?? ''),
                    name: String(item.name ?? '未知歌曲'),
                    artist: String(item.artistsname ?? '未知歌手'),
                    album: String(item.album ?? ''),
                    duration: Number(item.duration ?? 0) || 0,
                }))
                setSearchResults(songs)
                setSearchTotal(Number(data.data.count ?? songs.length) || songs.length)
                if (songs.length === 0) setSearchError('没有找到匹配的歌曲，换个关键词试试')
            } else {
                setSearchResults([])
                setSearchError(data.msg || '搜索失败，请稍后再试')
            }
        } catch (err) {
            if ((err as Error)?.name === 'AbortError') return
            setSearchResults([])
            setSearchError('网络请求失败，请稍后再试')
        } finally {
            setSearchLoading(false)
        }
    }

    /** 搜索面板点击某首：先解析出封面与直链再播放 */
    const pickFromSearch = async (song: SearchSong) => {
        setResolvingId(song.id)
        setError('')
        try {
            const full = await resolveSongById(song.id)
            if (!full || !full.url) {
                setError(`「${song.name}」没有可用的播放直链，可能受版权或付费限制`)
                return
            }
            playFromLibrary(full)
            flashNotice(`已加入播放：${full.name}`)
        } catch {
            setError('解析失败，请稍后再试')
        } finally {
            setResolvingId(null)
        }
    }

    /* ==================== 输入提交：ID/链接直接播放，关键词去搜索 ==================== */

    const handleSubmit = async () => {
        const value = input.trim()
        if (!value) {
            setError('请输入歌曲 ID / 分享链接，或直接输入歌名搜索')
            return
        }
        setError('')

        const id = extractSongId(value)
        if (!id) {
            setSearchQuery(value)
            setPanel('search')
            await runSearch(value)
            return
        }

        setParsing(true)
        try {
            const song = await resolveSongById(id)
            if (!song) {
                setError('解析失败：可能是 ID 错误、歌曲下架或接口暂时不可用')
                return
            }
            if (!song.url) {
                setError(`「${song.name}」暂时没有可用的播放直链，可能受版权或付费限制`)
                return
            }
            playFromLibrary(song)
            flashNotice(`已加入播放：${song.name}`)
        } catch {
            setError('网络请求失败，请稍后再试')
        } finally {
            setParsing(false)
        }
    }

    /* ==================== 复制 ==================== */

    const copyText = async (text: string, tip: string) => {
        try {
            await navigator.clipboard.writeText(text)
            setCopied(true)
            flashNotice(tip)
            if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
            copyTimerRef.current = setTimeout(() => setCopied(false), 1500)
        } catch {
            setError('复制失败，请手动选择复制')
        }
    }

    /* ==================== 音频事件 ==================== */

    /** 开始加载新音源时清掉上一首的进度状态（loadstart 是换源最可靠的信号） */
    const handleLoadStart = () => {
        setCurrentTime(0)
        setAudioDuration(0)
        setBuffered(0)
        setIsPlaying(false)
        setCoverLoading(true)
    }

    const handleTimeUpdate = (e: SyntheticEvent<HTMLAudioElement>) => {
        const audio = e.currentTarget
        setCurrentTime(audio.currentTime)
        if (audio.buffered.length > 0) setBuffered(audio.buffered.end(audio.buffered.length - 1))
    }

    const handleCanPlay = () => {
        setCoverLoading(false)
        if (shouldAutoPlayRef.current) {
            shouldAutoPlayRef.current = false
            audioRef.current?.play().catch(() => setError('浏览器拦截了自动播放，请点击播放按钮'))
        }
    }

    /** 直链多为带签名的临时地址，失效时自动重新解析一次 */
    const handleAudioError = async () => {
        const song = currentSong
        if (!song) return
        setIsPlaying(false)
        if (retriedRef.current.has(song.id)) {
            setError(`「${song.name}」播放失败，直链可能已失效，换一首试试`)
            return
        }
        retriedRef.current.add(song.id)
        flashNotice('直链已失效，正在重新解析…')
        try {
            const fresh = await resolveSongById(song.id)
            if (fresh?.url) {
                shouldAutoPlayRef.current = true
                setQueue((q) => {
                    const songs = q.songs.slice()
                    if (songs[q.index]?.id === fresh.id) songs[q.index] = { ...songs[q.index], ...fresh }
                    return { ...q, songs }
                })
            } else {
                setError(`「${song.name}」暂时无法播放，可能受版权或付费限制`)
            }
        } catch {
            setError('重新解析失败，请稍后再试')
        }
    }

    /* ==================== 副作用 ==================== */

    /* 读取本地设置与上次的播放列表 */
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY)
            if (raw) {
                const saved = JSON.parse(raw) as PersistedState
                if (typeof saved.volume === 'number') setVolume(Math.min(1, Math.max(0, saved.volume)))
                if (typeof saved.muted === 'boolean') setMuted(saved.muted)
                if (saved.mode === 'list' || saved.mode === 'single' || saved.mode === 'shuffle') setMode(saved.mode)
                if (typeof saved.rate === 'number' && RATE_OPTIONS.includes(saved.rate)) setPlaybackRate(saved.rate)
                if (Array.isArray(saved.songs) && saved.songs.length > 0) {
                    const songs = saved.songs.filter(
                        (song) => song && typeof song.id === 'string' && typeof song.url === 'string'
                    )
                    if (songs.length > 0) {
                        const index = typeof saved.index === 'number' ? Math.min(Math.max(saved.index, 0), songs.length - 1) : 0
                        setQueue({ songs, index })
                    }
                }
            } else {
                // 兼容早期版本单独存储的音量与播放模式
                const legacyVolume = Number(localStorage.getItem('wy-volume'))
                if (Number.isFinite(legacyVolume) && legacyVolume >= 0 && legacyVolume <= 1) setVolume(legacyVolume)
                const legacyMode = localStorage.getItem('wy-play-mode')
                if (legacyMode === 'order') setMode('list')
                else if (legacyMode === 'repeat-one') setMode('single')
                else if (legacyMode === 'shuffle') setMode('shuffle')
            }
        } catch {
            /* 忽略损坏的本地数据 */
        }
        // 必须等读取完成后再允许回写，否则挂载瞬间会用默认值覆盖掉存档
        setHydrated(true)
    }, [])

    useEffect(() => {
        if (!hydrated) return
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ volume, muted, mode, rate: playbackRate, songs: queue.songs, index: queue.index })
            )
        } catch {
            /* 超出配额时忽略 */
        }
    }, [hydrated, volume, muted, mode, playbackRate, queue])

    /* 播放中用更细的时钟刷新进度：
       timeupdate 只有 ~250ms 精度，会让歌词高亮、滚动、进度条都慢半拍 */
    useEffect(() => {
        if (!isPlaying) return
        const timer = setInterval(() => {
            const audio = audioRef.current
            if (audio && !audio.paused) setCurrentTime(audio.currentTime)
        }, 60)
        return () => clearInterval(timer)
    }, [isPlaying])

    /* 音量、静音与倍速 */
    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return
        audio.volume = volume
        audio.muted = muted
        audio.playbackRate = playbackRate
    }, [volume, muted, playbackRate, songId])

    /* 切歌：并行拉取歌词与封面主色，完成前由 id 判断为加载中 */
    useEffect(() => {
        if (!songId) return
        let cancelled = false
        const controller = new AbortController()

        const lyricTask = fetch(`/api/wangyi-lyrics?id=${encodeURIComponent(songId)}`, {
            signal: controller.signal,
            cache: 'no-store',
        })
            .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
            .then((data) => (data.code === 200 && data.data?.lyric ? parseLRC(data.data.lyric) : []))
            .catch(() => [] as LyricLine[])

        const colorTask = songCover
            ? extractDominantColors(songCover)
            : Promise.resolve<[string, string]>(['#3a1414', '#0d0d12'])

        Promise.all([lyricTask, colorTask]).then(([nextLyrics, nextColors]) => {
            if (cancelled) return
            setSongAssets({ id: songId, lyrics: nextLyrics, colors: nextColors })
        })

        return () => {
            cancelled = true
            controller.abort()
        }
    }, [songId, songCover])

    /* 队列清空后停止播放 */
    useEffect(() => {
        if (currentSong) return
        const audio = audioRef.current
        if (!audio) return
        audio.pause()
        audio.removeAttribute('src')
        audio.load()
    }, [currentSong])

    /* 最新 handler 快照，供全局快捷键与系统媒体控制读取 */
    const actionsRef = useRef<PlayerActions>({
        togglePlay: () => {},
        seekBy: () => {},
        nudgeVolume: () => {},
        toggleMute: () => {},
        play: () => {},
        pause: () => {},
        prev: () => {},
        next: () => {},
        seek: () => {},
    })

    useEffect(() => {
        actionsRef.current = {
            togglePlay,
            seekBy,
            nudgeVolume,
            toggleMute: () => setMuted((m) => !m),
            play: () => {
                audioRef.current?.play().catch(() => {})
            },
            pause: () => audioRef.current?.pause(),
            prev: playPrev,
            next: () => {
                void advance()
            },
            seek: (time: number) => seekTo(time),
        }
    })

    /* 全局快捷键：空格播放/暂停、左右快进退、上下音量、M 静音 */
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null
            // 输入框里不抢按键
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
            // 抽屉里让方向键正常滚动列表；滑条自己处理方向键（避免音量被调两次）
            if (target?.closest?.('[role="dialog"]') || target?.closest?.('[role="slider"]')) return

            const actions = actionsRef.current
            switch (e.key) {
                case ' ':
                    // 唯一会顺手滚动页面的键：空格，必须阻止默认行为
                    e.preventDefault()
                    actions.togglePlay()
                    break
                case 'ArrowRight':
                    e.preventDefault()
                    actions.seekBy(5)
                    break
                case 'ArrowLeft':
                    e.preventDefault()
                    actions.seekBy(-5)
                    break
                case 'ArrowUp':
                    // 不阻止默认行为的话，方向键会连带滚动歌词区/页面
                    e.preventDefault()
                    actions.nudgeVolume(0.05)
                    break
                case 'ArrowDown':
                    e.preventDefault()
                    actions.nudgeVolume(-0.05)
                    break
                case 'm':
                case 'M':
                    actions.toggleMute()
                    break
                case 'n':
                case 'N':
                    actions.next()
                    break
                case 'p':
                case 'P':
                    actions.prev()
                    break
                default:
                    break
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [])

    /* 系统媒体控制（锁屏 / 耳机按键 / 媒体面板） */
    useEffect(() => {
        if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
        const session = navigator.mediaSession
        session.setActionHandler('play', () => actionsRef.current.play())
        session.setActionHandler('pause', () => actionsRef.current.pause())
        session.setActionHandler('previoustrack', () => actionsRef.current.prev())
        session.setActionHandler('nexttrack', () => actionsRef.current.next())
        try {
            session.setActionHandler('seekto', (details) => {
                if (typeof details.seekTime === 'number') actionsRef.current.seek(details.seekTime)
            })
        } catch {
            /* 部分浏览器不支持 seekto */
        }
        return () => {
            session.setActionHandler('play', null)
            session.setActionHandler('pause', null)
            session.setActionHandler('previoustrack', null)
            session.setActionHandler('nexttrack', null)
            try {
                session.setActionHandler('seekto', null)
            } catch {
                /* 忽略 */
            }
        }
    }, [])

    useEffect(() => {
        if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || !currentSong) return
        try {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: currentSong.name,
                artist: currentSong.artist,
                album: currentSong.album,
                artwork: currentSong.cover ? [{ src: currentSong.cover, sizes: '500x500' }] : [],
            })
        } catch {
            /* 不支持 MediaMetadata 时忽略 */
        }
    }, [currentSong])

    useEffect(() => {
        return () => {
            searchAbortRef.current?.abort()
            if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
            if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
        }
    }, [])

    /* ==================== 派生样式 ==================== */

    /* 背景＝专辑主色渐变：三档色标让两种主色自然过渡到深底 */
    /**
     * 背景＝专辑主色铺满整屏。
     * 两种主色各压暗到不同亮度，形成从左上到右下的浅淡变化，
     * 但整屏都保留专辑色调（末端不再淡到近黑）。
     */
    const bgGradient = bgColors
        ? `linear-gradient(158deg, ${toneDown(bgColors[0], 120)} 0%, ${toneDown(bgColors[1], 104)} 46%, ${toneDown(bgColors[0], 86)} 100%)`
        : 'linear-gradient(158deg, #43201f 0%, #2c1a30 46%, #1d1519 100%)'

    const volumeLevel: 0 | 1 | 2 = muted || volume === 0 ? 0 : volume < 0.5 ? 1 : 2
    const modeIcon =
        mode === 'single' ? (
            <IconRepeatOne className="h-[17px] w-[17px]" />
        ) : mode === 'shuffle' ? (
            <IconShuffle className="h-[17px] w-[17px]" />
        ) : (
            <IconRepeat className="h-[17px] w-[17px]" />
        )

    return (
        <div className="relative min-h-[calc(100vh-4rem)] w-full overflow-hidden bg-[#0a0a0f] text-white md:h-[calc(100vh-4rem)] md:min-h-[560px]">
            <style>{KEYFRAMES}</style>

            {/* 背景：专辑主色铺满整屏。
                只用「压暗后的专辑色」本身做渐变，不再叠径向暗角 / 顶部黑 / 底部黑，
                否则就会变成"只有中间有颜色、上下发黑"。 */}
            <div className="pointer-events-none absolute inset-0 transition-[background] duration-1000" style={{ background: bgGradient }} />
            <div className="pointer-events-none absolute inset-0 bg-black/20" />

            <div
                className={`relative z-10 flex min-h-[calc(100vh-4rem)] w-full flex-col px-5 pt-5 sm:px-8 md:h-full md:min-h-0 md:pb-0 md:pt-3 ${
                    currentSong ? 'pb-[96px]' : 'pb-6'
                }`}
            >
                {/* ============ 顶部工具条：面包屑 + 输入框 + 两个按钮，始终一行 ============ */}
                {/* [&_nav]:mb-0 —— 面包屑自带 mb-6，必须消掉，否则它会被 24px 下边距顶得比输入框高 12px */}
                <header className="flex shrink-0 items-center gap-2 [&_nav]:mb-0 sm:gap-3">
                    {/* 平板及以下隐藏面包屑：站点头部已有导航，留着只会挤占输入框宽度 */}
                    <div className="hidden shrink-0 md:block">
                        <Breadcrumb variant="dark" />
                    </div>

                    {/* 输入框与提交按钮同处一个药丸里，且药丸铺满面包屑与「每日推荐」之间的整段宽度。
                        之前输入框自带 lg:max-w-[420px]、外层却是 flex-1，
                        宽屏下输入框提前收窄，按钮被甩到几百像素之外、右边还空一大片。
                        现在边框/底色/聚焦环都交给外层容器，按钮浮在输入框右端，整行右缘对齐。 */}
                    <div className="relative flex h-10 min-w-0 flex-1 items-center rounded-full border border-white/10 bg-white/[0.07] backdrop-blur-xl transition focus-within:border-[#ec4141]/60 focus-within:bg-white/[0.1] focus-within:ring-2 focus-within:ring-[#ec4141]/15">
                        <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !parsing) void handleSubmit()
                            }}
                            placeholder="粘贴链接 / ID，或搜索歌名"
                            className="h-full min-w-0 flex-1 rounded-full bg-transparent pl-10 pr-2 text-[13px] text-white placeholder-white/30 outline-none"
                        />
                        <button
                            onClick={handleSubmit}
                            disabled={parsing}
                            aria-label="解析或搜索"
                            title="解析 / 搜索"
                            className="mr-1 flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#ec4141] px-3 text-[13px] font-medium text-white shadow-[0_10px_24px_-12px_rgba(236,65,65,.85)] transition hover:bg-[#d73535] active:scale-[.97] disabled:opacity-40"
                        >
                            {parsing ? <IconSpinner className="h-4 w-4" /> : <IconSearch className="h-4 w-4" />}
                            <span className="hidden sm:inline">解析 / 搜索</span>
                        </button>
                    </div>
                    <button
                        onClick={playRandom}
                        disabled={randomLoading}
                        aria-label="每日推荐"
                        title="每日推荐"
                        className="flex h-10 w-10 shrink-0 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/[0.07] text-[13px] font-medium text-white/85 backdrop-blur-xl transition hover:bg-white/12 active:scale-[.98] disabled:opacity-40 sm:w-auto sm:px-4"
                    >
                        {randomLoading ? <IconSpinner className="h-4 w-4" /> : <IconSparkles className="h-4 w-4" />}
                        <span className="hidden sm:inline">每日推荐</span>
                    </button>
                </header>

                {/* ============ 提示条：浮层显示 ============
                    放在文档流里会因为高度变化把垂直居中的主体顶得上下跳，
                    所以做成 fixed 提示层（和站内 CopyToast 的位置保持一致）。 */}
                {(error || notice) && (
                    <div className="pointer-events-none fixed inset-x-0 top-20 z-40 flex flex-col items-center gap-2 px-4">
                        {error && (
                            <div
                                className="pointer-events-auto flex w-full max-w-[620px] items-start gap-2.5 rounded-2xl border border-red-400/30 bg-red-950/85 px-4 py-3 text-sm text-red-100 shadow-[0_18px_40px_-20px_rgba(0,0,0,.9)] backdrop-blur-xl"
                                style={{ animation: 'wy-rise .25s ease-out' }}
                            >
                                <IconAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                                <span className="flex-1 break-all">{error}</span>
                                <button onClick={() => setError('')} className="shrink-0 text-xs text-red-200/70 transition hover:text-white">
                                    知道了
                                </button>
                            </div>
                        )}
                        {notice && (
                            <div
                                className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-950/85 px-3.5 py-1.5 text-xs text-emerald-100 shadow-[0_18px_40px_-20px_rgba(0,0,0,.9)] backdrop-blur-xl"
                                style={{ animation: 'wy-rise .25s ease-out' }}
                            >
                                <IconCheck className="h-3.5 w-3.5" />
                                {notice}
                            </div>
                        )}
                    </div>
                )}

                {/* ============ 主体 ============ */}
                <div className="flex min-h-0 flex-1 items-center justify-center py-5 md:py-3">
                    {currentSong ? (
                        // key 跟着歌曲走：换歌时整块重新入场（淡入 + 轻微上移），不会生硬地"啪"一下换掉
                        <section
                            key={songId ?? 'song'}
                            className="w-full max-w-[1200px] md:h-full"
                            style={{ animation: 'wy-panel-in .32s ease-out' }}
                        >
                            <div className="flex flex-col items-center gap-8 md:h-full md:min-h-0 md:flex-row md:items-stretch md:gap-14">
                                {/* 黑胶唱片 */}
                                <div
                                    onClick={() => setMobileLyrics(true)}
                                    title="查看歌词"
                                    style={{ animation: mobileLyrics ? undefined : 'wy-panel-in .3s ease-out' }}
                                    className={`relative h-64 w-64 shrink-0 self-center sm:h-72 sm:w-72 md:h-[min(44vh,360px)] md:w-[min(44vh,360px)] md:pointer-events-none lg:h-[min(46vh,400px)] lg:w-[min(46vh,400px)] ${
                                        mobileLyrics ? 'hidden md:block' : 'cursor-pointer'
                                    }`}
                                >
                                    <div
                                        className="absolute inset-0 rounded-full"
                                        style={{
                                            background: 'radial-gradient(circle at 32% 26%, #2b2b33 0%, #131317 42%, #050508 100%)',
                                            boxShadow: '0 46px 90px -34px rgba(0,0,0,.95), inset 0 0 0 1px rgba(255,255,255,.07)',
                                        }}
                                    />
                                    <div
                                        className="absolute inset-0 rounded-full opacity-70"
                                        style={{
                                            backgroundImage:
                                                'repeating-radial-gradient(circle at 50% 50%, rgba(255,255,255,.055) 0 1px, rgba(0,0,0,0) 1px 5px)',
                                        }}
                                    />
                                    {/* 封面随播放旋转，暂停时停在当前角度 */}
                                    <div
                                        className="absolute inset-[15%] rounded-full"
                                        style={{
                                            animation: 'wy-spin 22s linear infinite',
                                            animationPlayState: isPlaying ? 'running' : 'paused',
                                            willChange: 'transform',
                                        }}
                                    >
                                        <div className="absolute inset-0 overflow-hidden rounded-full ring-1 ring-white/15">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                ref={(el) => {
                                                    // 命中缓存的图片可能不会再触发 onLoad，挂载时补一次判断
                                                    if (el?.complete) setCoverLoading(false)
                                                }}
                                                src={songCover}
                                                alt={`${currentSong.name} - ${currentSong.artist} 专辑封面`}
                                                draggable={false}
                                                decoding="async"
                                                onLoad={() => setCoverLoading(false)}
                                                onError={() => setCoverLoading(false)}
                                                className={`h-full w-full object-cover transition-all duration-700 ${
                                                    coverLoading ? 'scale-105 opacity-0 blur-md' : 'scale-100 opacity-100 blur-0'
                                                }`}
                                            />
                                        </div>
                                    </div>
                                    <div
                                        className="pointer-events-none absolute inset-0 rounded-full"
                                        style={{
                                            background:
                                                'linear-gradient(118deg, rgba(255,255,255,.16) 0%, rgba(255,255,255,0) 36%, rgba(255,255,255,0) 64%, rgba(255,255,255,.09) 100%)',
                                        }}
                                    />
                                    {/* 唱臂：播放时落针，暂停时抬起 */}
                                    <Tonearm playing={isPlaying} />
                                    {coverLoading && (
                                        <div className="absolute inset-[15%] flex items-center justify-center rounded-full bg-black/40">
                                            <IconSpinner className="h-6 w-6 text-white/60" />
                                        </div>
                                    )}
                                </div>

                                {/* 歌曲信息 + 歌词 */}
                                <div className="relative flex min-w-0 w-full flex-1 flex-col pt-1 md:min-h-0">
                                    {/* 极简状态行：替代原来一堆药丸标签。
                                        小屏的"封面/歌词"切换也放在这里——它始终在可视区顶部，
                                        不会像放在下面那样被挤到折叠线以下导致"回不去"。 */}
                                    <div className="flex items-center gap-2 text-[13px] text-white/35">
                                        <span
                                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#ec4141]"
                                            style={{
                                                animation: 'wy-pulse 1.6s ease-in-out infinite',
                                                animationPlayState: isPlaying ? 'running' : 'paused',
                                            }}
                                        />
                                        <span>{isPlaying ? '正在播放' : '已暂停'}</span>
                                        <span className="font-mono">{formatTime(audioDuration || currentSong.duration / 1000)}</span>
                                        {currentSong.pay && (
                                            <>
                                                <span className="text-white/15">·</span>
                                                <span className="truncate">{currentSong.pay}</span>
                                            </>
                                        )}
                                        <button
                                            onClick={() => setMobileLyrics((v) => !v)}
                                            aria-label={mobileLyrics ? '显示封面' : '显示歌词'}
                                            className="ml-auto inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.08] px-3 text-[12px] text-white/70 transition hover:bg-white/15 hover:text-white md:hidden"
                                        >
                                            {mobileLyrics ? <IconDisc className="h-3.5 w-3.5" /> : <IconMusic className="h-3.5 w-3.5" />}
                                            {mobileLyrics ? '封面' : '歌词'}
                                        </button>
                                    </div>

                                    <h1
                                        className="mt-2 truncate text-[26px] font-bold leading-tight tracking-tight sm:text-[32px]"
                                        title={currentSong.name}
                                    >
                                        {currentSong.name}
                                    </h1>
                                    <p className="mt-2 truncate text-sm text-white/55" title={currentSong.artist}>
                                        歌手：{currentSong.artist}
                                    </p>
                                    <p className="mt-1 truncate text-[13px] text-white/35" title={currentSong.album}>
                                        所属专辑：{currentSong.album}
                                    </p>

                                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                        <button
                                            onClick={() => copyText(currentSong.url, '直链已复制，可用于其他播放器')}
                                            className="inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[12px] text-white/45 transition hover:bg-white/[0.07] hover:text-white md:h-8 md:text-[11px]"
                                        >
                                            {copied ? <IconCheck className="h-3.5 w-3.5" /> : <IconLink className="h-3.5 w-3.5" />}
                                            复制直链
                                        </button>
                                        <button
                                            onClick={() => copyText(`${currentSong.name} - ${currentSong.artist}`, '歌曲信息已复制')}
                                            className="inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[12px] text-white/45 transition hover:bg-white/[0.07] hover:text-white md:h-8 md:text-[11px]"
                                        >
                                            <IconMusic className="h-3.5 w-3.5" />
                                            复制歌名
                                        </button>
                                        <a
                                            href={`${NETEASE_SONG_URL}${currentSong.id}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[12px] text-white/45 transition hover:bg-white/[0.07] hover:text-white md:h-8 md:text-[11px]"
                                        >
                                            <IconExternal className="h-3.5 w-3.5" />
                                            网易云查看
                                        </a>
                                    </div>

                                    <div
                                        style={{ animation: mobileLyrics ? 'wy-panel-in .3s ease-out' : undefined }}
                                        className={`mt-4 min-h-0 flex-col md:mt-3 md:flex md:flex-1 ${
                                            mobileLyrics ? 'flex flex-1' : 'hidden'
                                        }`}
                                    >
                                        <LyricPanel
                                            lyrics={lyrics}
                                            loading={lyricsLoading}
                                            activeIndex={currentLyricIndex}
                                            playing={isPlaying}
                                            audioRef={audioRef}
                                            onSeek={seekTo}
                                            layoutKey={mobileLyrics ? 'lyrics' : 'cover'}
                                        />
                                    </div>

                                    {/* 无歌词时（桌面端）：提示居中在整个歌词区域的视觉中线上，
                                        与左侧唱片对齐；面板内那份只在移动端显示。 */}
                                    {!lyricsLoading && lyrics.length === 0 && (
                                        <div className="pointer-events-none absolute inset-0 hidden flex-col items-center justify-center text-center md:flex">
                                            <IconMusic className="h-7 w-7 text-white/20" />
                                            <p className="mt-3 text-sm text-white/45">暂无歌词</p>
                                            <p className="mt-1 text-xs text-white/25">纯音乐，或该歌曲暂未提供歌词</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    ) : (
                        <section className="flex flex-col items-center justify-center py-10 text-center" style={{ animation: 'wy-fade .4s ease-out' }}>
                            <div className="relative">
                                <div
                                    className="absolute inset-0 rounded-full border border-dashed border-white/12"
                                    style={{ animation: 'wy-spin 26s linear infinite' }}
                                />
                                <div className="relative flex h-48 w-48 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-xl sm:h-60 sm:w-60">
                                    <IconDisc className="h-20 w-20 text-white/20" />
                                </div>
                            </div>
                            <h2 className="mt-8 text-lg font-semibold text-white/85">开始你的播放</h2>
                            <p className="mt-2 max-w-md text-sm text-white/40">
                                粘贴网易云分享链接或歌曲 ID 直接播放，也可以直接输入歌名搜索
                            </p>
                            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                                {EXAMPLE_KEYWORDS.map((keyword) => (
                                    <button
                                        key={keyword}
                                        onClick={() => {
                                            setInput(keyword)
                                            setSearchQuery(keyword)
                                            setPanel('search')
                                            void runSearch(keyword)
                                        }}
                                        className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs text-white/60 transition hover:bg-white/12 hover:text-white"
                                    >
                                        {keyword}
                                    </button>
                                ))}
                                <button
                                    onClick={playRandom}
                                    className="rounded-full border border-[#ec4141]/40 bg-[#ec4141]/15 px-3.5 py-1.5 text-xs text-[#ff9d9d] transition hover:bg-[#ec4141]/25"
                                >
                                    每日推荐
                                </button>
                            </div>
                        </section>
                    )}
                </div>

                {/* ============ 底部播放栏：全透明只保留背景模糊，固定在视口底部 ============ */}
                {currentSong && (
                    <div
                        className="fixed inset-x-0 bottom-0 z-30 px-5 backdrop-blur-2xl sm:px-8 md:static md:inset-auto md:z-auto md:order-2 md:-mx-8 md:shrink-0"
                        style={{ animation: 'wy-rise .3s ease-out' }}
                    >
                        <div className="mx-auto flex w-full max-w-[1200px] flex-col py-2">
                            <div className="flex items-center gap-3">
                                <span className="w-11 shrink-0 text-right font-mono text-[11px] text-white/45">{formatTime(currentTime)}</span>
                                <Slider
                                    className="flex-1"
                                    value={currentTime}
                                    max={audioDuration || 1}
                                    buffered={buffered}
                                    ariaLabel="播放进度"
                                    format={formatTime}
                                    accent={ACCENT}
                                    onScrub={seekTo}
                                />
                                <span className="w-11 shrink-0 font-mono text-[11px] text-white/45">{formatTime(audioDuration)}</span>
                            </div>

                            <div className="mt-2 flex items-center justify-between gap-2">
                                {/* 播放模式 + 倍速 */}
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setMode((m) => (m === 'list' ? 'single' : m === 'single' ? 'shuffle' : 'list'))}
                                        title={`${MODE_META[mode].label}：${MODE_META[mode].hint}`}
                                        aria-label={`播放模式：${MODE_META[mode].label}`}
                                        className="flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2.5 text-[11px] text-white/65 transition hover:bg-white/12 hover:text-white"
                                    >
                                        {modeIcon}
                                        <span className="hidden sm:inline">{MODE_META[mode].label}</span>
                                    </button>
                                    <button
                                        onClick={() =>
                                            setPlaybackRate((rate) => {
                                                const i = RATE_OPTIONS.indexOf(rate)
                                                return RATE_OPTIONS[(i + 1) % RATE_OPTIONS.length]
                                            })
                                        }
                                        title="播放倍速"
                                        aria-label={`播放倍速 ${playbackRate} 倍`}
                                        className={`flex h-8 w-10 items-center justify-center rounded-full border px-1.5 font-mono text-[11px] transition ${
                                            playbackRate === 1
                                                ? 'border-white/10 bg-white/[0.06] text-white/65 hover:bg-white/12 hover:text-white'
                                                : 'border-[#ec4141]/40 bg-[#ec4141]/15 text-[#ff9d9d]'
                                        }`}
                                    >
                                        {playbackRate}x
                                    </button>
                                </div>

                                {/* 播放控制 */}
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <button
                                        onClick={playPrev}
                                        aria-label="上一首"
                                        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/[0.1] text-white/85 transition hover:bg-white/20 hover:text-white active:scale-95"
                                    >
                                        <IconPrev className="h-[18px] w-[18px]" />
                                    </button>
                                <button
                                    onClick={togglePlay}
                                    aria-label={isPlaying ? '暂停' : '播放'}
                                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ec4141] text-white shadow-[0_14px_34px_-14px_rgba(236,65,65,1)] transition hover:scale-105 hover:bg-[#d73535] active:scale-95"
                                >
                                        {isPlaying ? <IconPause className="h-6 w-6" /> : <IconPlay className="ml-0.5 h-6 w-6" />}
                                    </button>
                                    <button
                                        onClick={() => void advance()}
                                        aria-label="下一首"
                                        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/[0.1] text-white/85 transition hover:bg-white/20 hover:text-white active:scale-95"
                                    >
                                        <IconNext className="h-[18px] w-[18px]" />
                                    </button>
                                </div>

                                {/* 音量 + 播放列表（对齐网易云：列表入口在播放栏） */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setMuted((m) => !m)}
                                        aria-label={muted ? '取消静音' : '静音'}
                                        className="flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-white/[0.1] text-white/75 transition hover:bg-white/18 hover:text-white"
                                    >
                                        {volumeLevel === 0 ? <IconMute className="h-[17px] w-[17px]" /> : <IconVolume className="h-[17px] w-[17px]" level={volumeLevel} />}
                                    </button>
                                    <Slider
                                        className="hidden w-24 md:flex"
                                        value={muted ? 0 : volume}
                                        max={1}
                                        ariaLabel="音量"
                                        format={(v) => `${Math.round(v * 100)}%`}
                                        onScrub={(v) => {
                                            setMuted(false)
                                            setVolume(v)
                                        }}
                                    />
                                    <button
                                        onClick={() => setPanel((p) => (p === 'queue' ? null : 'queue'))}
                                        aria-label="播放列表"
                                        title="播放列表"
                                        className={`relative flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-white/[0.1] transition hover:bg-white/18 ${
                                            panel === 'queue'
                                                ? 'border-[#ec4141]/50 bg-[#ec4141]/20 text-white'
                                                : 'border-white/10 bg-white/[0.06] text-white/70 hover:bg-white/12 hover:text-white'
                                        }`}
                                    >
                                        <IconList className="h-[17px] w-[17px]" />
                                        {queue.songs.length > 0 && (
                                            <span className="absolute -right-1.5 -top-1.5 min-w-[17px] rounded-full bg-[#ec4141] px-1 text-center font-mono text-[10px] leading-[17px] text-white shadow">
                                                {queue.songs.length}
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ============ 底部：一行极简快捷键提示（小屏隐藏，避免拥挤） ============ */}
                <div className="hidden shrink-0 pt-1.5 text-center md:order-1 md:block">
                    <p className="mx-auto max-w-[860px] truncate text-[11px] text-white/20">
                        空格 播放/暂停 · ← → 快进退 5 秒 · ↑ ↓ 音量 · M 静音 · N/P 切歌 · 仅供个人试听
                    </p>
                </div>
            </div>

            {/* ============ 抽屉面板 ============ */}
            {panel === 'search' && (
                <Drawer title="搜索歌曲" subtitle="选择结果即解析直链并加入播放列表" onClose={() => setPanel(null)}>
                    <SearchPanel
                        query={searchQuery}
                        onQueryChange={setSearchQuery}
                        onSearch={() => void runSearch(searchQuery)}
                        loading={searchLoading}
                        error={searchError}
                        results={searchResults}
                        total={searchTotal}
                        resolvingId={resolvingId}
                        currentSongId={songId}
                        onPick={(song) => void pickFromSearch(song)}
                    />
                </Drawer>
            )}

            {panel === 'queue' && (
                <Drawer
                    title="播放列表"
                    subtitle={`共 ${queue.songs.length} 首 · ${MODE_META[mode].label}${playbackRate !== 1 ? ` · ${playbackRate}x` : ''}`}
                    onClose={() => setPanel(null)}
                >
                    <QueuePanel
                        songs={queue.songs}
                        currentIndex={queue.index}
                        isPlaying={isPlaying}
                        mode={mode}
                        onModeChange={setMode}
                        onPick={goTo}
                        onRemove={removeAt}
                        onClear={() => setQueue({ songs: [], index: -1 })}
                    />
                </Drawer>
            )}

            {/* ============ 隐藏的原生 audio ============ */}
            <audio
                ref={audioRef}
                src={currentSong?.url || undefined}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => void advance({ auto: true })}
                onLoadStart={handleLoadStart}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={(e) => {
                    const value = e.currentTarget.duration
                    setAudioDuration(Number.isFinite(value) ? value : 0)
                }}
                onCanPlay={handleCanPlay}
                onError={handleAudioError}
                preload="metadata"
                className="hidden"
            />
        </div>
    )
}
