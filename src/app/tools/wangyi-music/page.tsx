'use client'

import { useEffect, useRef, useState, type SyntheticEvent } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import DiscoverPanel from './components/DiscoverPanel'
import Drawer from './components/Drawer'
import ArtistPanel from './components/ArtistPanel'
import AlbumPanel from './components/AlbumPanel'
import LyricPanel from './components/LyricPanel'
import LyricsStage from './components/LyricsStage'
import PlaylistDetail from './components/PlaylistDetail'
import QueuePanel from './components/QueuePanel'
import SearchPanel, { type SearchArtist } from './components/SearchPanel'
import Slider from './components/Slider'
import Tonearm from './components/Tonearm'
import {
    IconAlert,
    IconCheck,
    IconCompass,
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
    LYRIC_OFFSET_STORE_KEY,
    LYRIC_OFFSET_STORE_LIMIT,
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
import type { LyricLine, MusicResult, PlayMode, PlaylistTrack, SearchSong } from './types'
import type { LyricStageStyle, StageLyricData } from './lyrics/types'
import { buildStageLyrics } from './lyrics/parse'
import { createPlaybackClock, type PlaybackClock } from './lyrics/clock'
import { clampLyricOffset } from './lyrics/offset'
import { isLyricStageStyle } from './lyrics/styles'

/** 组件内自用的关键帧，避免污染全局样式 */
const KEYFRAMES = `
@keyframes wy-spin { to { transform: rotate(360deg) } }
@keyframes wy-eq { 0%,100% { height: 22% } 50% { height: 100% } }
@keyframes wy-pulse { 0%,100% { opacity: 1; transform: scale(1) } 50% { opacity: .3; transform: scale(.65) } }
@keyframes wy-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes wy-slide-in { from { opacity: 0; transform: translateX(30px) } to { opacity: 1; transform: translateX(0) } }
@keyframes wy-rise { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
@keyframes wy-panel-in { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
/* 缓冲/准备中的那道来回扫的光带 */
@keyframes wy-loading { 0% { transform: translateX(-100%) } 100% { transform: translateX(350%) } }
`

const MODE_META: Record<PlayMode, { label: string; hint: string }> = {
    list: { label: '列表循环', hint: '播完自动下一首，队列结束自动请求推荐' },
    single: { label: '单曲循环', hint: '当前歌曲结束后重新播放' },
    shuffle: { label: '随机播放', hint: '在播放列表内随机切换' },
}

const RATE_OPTIONS = [1, 1.25, 1.5, 2, 0.75]
const EXAMPLE_KEYWORDS = ['周杰伦', '海阔天空', '五月天']
const EMPTY_LYRICS: LyricLine[] = []
const EMPTY_STAGE_LINES: StageLyricData['lines'] = []

interface SongAssets {
    id: string
    /** 逐行歌词：给左侧滚动列表用 */
    lyrics: LyricLine[]
    /** 逐词歌词：给全屏歌词舞台用（YRC 优先，LRC 摊开兜底） */
    stage: StageLyricData
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
    /** 歌词呈现方式：经典滚动列表 / 音频可视化动画 */
    lyricMode?: LyricMode
    /** 动画舞台的风格：流光 / 静流 */
    stageStyle?: LyricStageStyle
    /** 歌词偏移（秒）：正数 = 歌词提前。跟着设备走，所以和设置一起存档 */
    lyricOffset?: number
}

type LyricMode = 'list' | 'stage'

/** 逐曲偏移的一条记忆。存成数组而不是对象：对象里纯数字的键会被按大小重排，丢掉"先后" */
interface SongOffsetEntry {
    id: string
    offset: number
}

/** 随机挑一个不同于 exclude 的下标（放在组件外，保持渲染函数纯净） */
function pickRandomIndex(length: number, exclude: number) {
    if (length <= 1) return 0
    let index = exclude
    while (index === exclude) index = Math.floor(Math.random() * length)
    return index
}

/**
 * 底部播放条里的「正在播放」小块：封面 + 歌名 / 歌手。
 * 浏览歌单时主区被占满，用户需要一眼看到"现在放的是哪首"；点它回到播放视图。
 * 放在组件外只是因为它纯展示，不带任何状态。
 */
function NowPlayingStrip({ song, onOpen, className = '' }: { song: MusicResult; onOpen: () => void; className?: string }) {
    return (
        <button
            type="button"
            onClick={onOpen}
            title={`回到播放：${song.name}`}
            aria-label={`回到播放：${song.name} - ${song.artist}`}
            className={`flex min-w-0 items-center gap-2.5 rounded-full py-1 pl-1 pr-3 text-left transition hover:bg-white/[0.08] ${className}`}
        >
            {song.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={song.cover}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-white/10"
                    style={{ animation: 'wy-rise .3s ease-out' }}
                />
            ) : (
                <span className="h-9 w-9 shrink-0 rounded-lg bg-white/[0.08] ring-1 ring-white/10" />
            )}
            <span className="min-w-0">
                <span className="block truncate text-[12.5px] text-white/90">{song.name}</span>
                <span className="mt-0.5 block truncate text-[11px] text-white/45">{song.artist}</span>
            </span>
        </button>
    )
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
    /** 搜索里的艺人结果：和歌曲结果分开存，点进去看他的单曲与专辑 */
    const [searchArtists, setSearchArtists] = useState<SearchArtist[]>([])

    const [queue, setQueue] = useState<{ songs: MusicResult[]; index: number }>({ songs: [], index: -1 })
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')

    /**
     * 主区当前显示哪一屏。
     *   player   —— 黑胶 + 信息 + 歌词（原来的全部内容）
     *   discover —— 歌单发现（推荐 + 分类 + 网格）
     *   playlist —— 某张歌单的详情与曲目
     * 只切主区，顶栏、底部播放条、全屏动画舞台都不受影响。
     */
    const [view, setView] = useState<'player' | 'discover' | 'playlist' | 'artist' | 'album'>('player')
    const [playlistId, setPlaylistId] = useState<string | null>(null)
    /** 艺人 / 专辑页的当前对象（艺人名先拿着，详情没回来时标题不空着） */
    const [artistId, setArtistId] = useState<string | null>(null)
    const [artistName, setArtistName] = useState('')
    const [albumId, setAlbumId] = useState<string | null>(null)
    /** 从卡片上的"悬浮播放钮"进来的歌单：详情页第一页到手就自动开播 */
    const [playlistAutoPlay, setPlaylistAutoPlay] = useState(false)
    /** 歌单点播正在解析直链（播放前必须先拿到直链）：用来给按钮一个"准备中"的反馈 */
    const [playlistBusy, setPlaylistBusy] = useState(false)

    const [isPlaying, setIsPlaying] = useState(false)
    /**
     * 正在取数据（换源、解析直链、缓冲）。
     * 进度条平时显示的是"播到哪儿"，可这段时间里它显示的其实是**还没开始播** ——
     * 元素每次重新取数据都会把位置归零，于是进度条就在 0 与上次的位置之间来回跳，
     * 看着像 bug。所以这段状态单独拎出来：条上换成一个来回扫的等待动画，而不是假装在走。
     */
    const [buffering, setBuffering] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    /** 校准后的歌词时刻（秒）：左列表的高亮用它，跟舞台上逐字动画吃到的是同一个时刻 */
    const [lyricTime, setLyricTime] = useState(0)
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
    /** 歌词区域呈现方式：滚动列表（默认）或音频可视化动画舞台 */
    const [lyricMode, setLyricMode] = useState<LyricMode>('list')
    /** 动画舞台的风格：流光（默认，逐字弹出）/ 静流（整句上浮 + 扫光） */
    const [stageStyle, setStageStyle] = useState<LyricStageStyle>('classic')
    /** 本地设置读取完成后才允许回写 localStorage */
    const [hydrated, setHydrated] = useState(false)
    /** 歌词偏移（秒）：正数 = 歌词提前，用来补偿蓝牙/外接声卡的输出延迟 */
    const [lyricOffset, setLyricOffset] = useState(0)
    /** 当前这首歌是否单独校准过（面板里据此多给一个"清除本曲校准"） */
    const [songOffsetTuned, setSongOffsetTuned] = useState(false)

    const audioRef = useRef<HTMLAudioElement>(null)
    const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const searchAbortRef = useRef<AbortController | null>(null)
    const nextLoadingRef = useRef(false)
    const shouldAutoPlayRef = useRef(false)
    /** 这一次播放是用户主动点出来的（点歌 / 按播放 / 按下一首），还是自动续播 */
    const userPlayRef = useRef(false)
    /** 已经为哪些歌重新解析过一次直链（防止失败后无限重试） */
    const retriedRef = useRef<Set<string>>(new Set())
    /**
     * 队列的实时镜像。
     * 异步流程（解析直链、失败后跳过）里读 `queue` 拿到的是发起那一刻的闭包，
     * 而歌单动辄上百首、连播中途还会换队列，靠闭包判断"下一首是谁"必然错位。
     */
    const queueRef = useRef(queue)
    /** 连续跳过了几首：整张歌单都不可播时要停下报错，不能无限往下顺 */
    const skipStreakRef = useRef(0)
    /**
     * 直链中途失效、重新解析之后要恢复到的播放位置（秒）。
     * 重新解析会让 <audio> 换一个 src，媒体从头加载、位置归零 ——
     * 不把位置接回去的话，用户看到的就是进度条从 35% 掉到 0 再爬一遍（还以为在抽搐）。
     */
    const resumeAtRef = useRef(0)
    /**
     * 设备默认偏移 = 最后一次调到的那个值。
     * 延迟来自耳机/声卡，不来自歌，所以换一首没单独记录过的曲子要沿用这个值，
     * 而不是回到 0 让用户从头再调一遍。
     */
    const defaultOffsetRef = useRef(0)
    /** 逐曲偏移记忆（按写入先后排列，见 SongOffsetEntry） */
    const songOffsetsRef = useRef<SongOffsetEntry[]>([])
    const songOffsetSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const currentSong = queue.index >= 0 ? queue.songs[queue.index] ?? null : null
    const songId = currentSong?.id ?? null
    const songCover = currentSong?.cover ?? ''
    const assets = songAssets && songAssets.id === songId ? songAssets : null
    const lyrics = assets ? assets.lyrics : EMPTY_LYRICS
    const stageLines = assets ? assets.stage.lines : EMPTY_STAGE_LINES
    const lyricsLoading = songId !== null && assets === null
    const bgColors = assets ? assets.colors : null
    /**
     * 当前歌词行直接由播放进度推导，而不是等 timeupdate 事件。
     * 这样刚进页面、暂停中、拖动进度时也能正确高亮当前句。
     *
     * 用的是**校准后的歌词时刻**（播放时钟 + 台阶补偿 + 用户偏移），跟全屏舞台吃的是同一个值 ——
     * 列表是默认视图，它以前直接读 audio.currentTime，也就是那个台阶式、平均慢半档的下界，
     * 于是"列表比声音慢半拍、舞台却对得上"会同时出现。两处统一到一个时钟上才不会各说各话。
     */
    const currentLyricIndex = lyrics.length > 0 ? findLyricIndex(lyrics, lyricTime) : -1

    /* 歌词只在拉取时整体写入。解析 LRC 最后一行要用到整首时长，但拉取那一刻音频时长还没就绪，
       所以把它放进 ref：解析时读一次当前值，避免把时长塞进 effect 依赖里导致反复重拉。 */
    const durationRef = useRef(0)
    useEffect(() => {
        durationRef.current = audioDuration || (currentSong ? currentSong.duration / 1000 : 0)
    }, [audioDuration, currentSong])

    /* 歌词偏移的实时快照：播放时钟每帧都要读它，走 ref 就不必因为改动而重建时钟。 */
    const lyricOffsetRef = useRef(0)
    useEffect(() => {
        lyricOffsetRef.current = lyricOffset
    }, [lyricOffset])

    /*
     * 播放时钟：整个歌词体系（舞台的逐字动画、列表的当前句高亮）的时间来源。
     *
     * 不直接用 audio.currentTime 的原因见 lyrics/clock.ts 顶部 —— 简要说就是它按几十毫秒
     * 的步长跳、标的是媒体时间轴而不是耳朵听到的时刻、拖动之后要等 seek 真的落地才变。
     * 时钟在内部把这些都抹平：连续外推、按采样平滑收敛、seek/起停/变速立刻重新打锚。
     */
    const clockRef = useRef<PlaybackClock | null>(null)
    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return
        const clock = createPlaybackClock(audio, { getOffset: () => lyricOffsetRef.current })
        clockRef.current = clock
        return () => {
            clock.dispose()
            clockRef.current = null
        }
    }, [])

    /* 动画舞台的取数口子。用函数而不用值：舞台每帧在 rAF 里取一次，
       这样不会因为 currentTime 每 200ms 更新一次就把 60fps 的循环拽回 React 渲染。
       两条口子分开：舞台上逐字动画吃"校准后的歌词时刻"，进度条吃"未校准的媒体时刻"。 */
    const getStageTime = () => clockRef.current?.now() ?? (audioRef.current?.currentTime ?? 0) + lyricOffsetRef.current
    const getStageMediaTime = () => clockRef.current?.mediaTime() ?? audioRef.current?.currentTime ?? 0
    /** 朗读一次时钟，把"进度条用的媒体时刻"和"歌词用的校准时刻"一起写进状态 */
    const syncClocks = (fallback: number) => {
        const clock = clockRef.current
        setCurrentTime(clock ? clock.mediaTime() : fallback)
        setLyricTime(clock ? clock.now() : fallback + lyricOffsetRef.current)
    }

    /* ── 歌词同步偏移的记忆 ──
     * 三处都要用到同一个值：舞台上的 ± / 滑条 / 快捷键。都走 applyLyricOffset。
     * 除了"当前值"，还更新两处记忆：
     *   设备默认 —— 换一首没记录过的歌时沿用它（延迟属于耳机，不属于歌）；
     *   本曲      —— 这首歌专门调过就单独记下来，下次放这首歌直接对上。
     * 写入按 400ms 去抖：按住 ± 快拉时会连发十几次，不必每次都落盘。 */

    const persistSongOffsets = () => {
        try {
            localStorage.setItem(LYRIC_OFFSET_STORE_KEY, JSON.stringify(songOffsetsRef.current))
        } catch {
            /* 配额满了也无所谓：记不住不影响这次校准 */
        }
    }

    const applyLyricOffset = (value: number) => {
        const next = clampLyricOffset(value)
        setLyricOffset(next)
        defaultOffsetRef.current = next
        if (!songId) return
        // 同一首歌只留最新的一条，并保证排列顺序就是写入顺序
        const rest = songOffsetsRef.current.filter((entry) => entry.id !== songId)
        rest.push({ id: songId, offset: next })
        songOffsetsRef.current = rest.length > LYRIC_OFFSET_STORE_LIMIT ? rest.slice(-LYRIC_OFFSET_STORE_LIMIT) : rest
        setSongOffsetTuned(true)
        if (songOffsetSaveTimerRef.current) clearTimeout(songOffsetSaveTimerRef.current)
        songOffsetSaveTimerRef.current = setTimeout(persistSongOffsets, 400)
    }

    /** 忘掉这首歌的单独校准，回到设备默认 —— 数据本身偏的歌换回去，或者不再需要时 */
    const clearSongOffset = () => {
        if (!songId) return
        songOffsetsRef.current = songOffsetsRef.current.filter((entry) => entry.id !== songId)
        persistSongOffsets()
        setSongOffsetTuned(false)
        setLyricOffset(defaultOffsetRef.current)
    }

    /* 换曲：这首歌单独记录过就用它，否则沿用设备默认 */
    useEffect(() => {
        if (!hydrated || !songId) return
        const remembered = songOffsetsRef.current.find((entry) => entry.id === songId)
        setSongOffsetTuned(Boolean(remembered))
        setLyricOffset(remembered ? remembered.offset : defaultOffsetRef.current)
    }, [hydrated, songId])

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
        if (data.code === 200 && data.data && typeof data.data === 'object') {
            return { ...normalizeSong(data.data), resolvedAt: Date.now() }
        }
        return null
    }

    const fetchRandomSong = async (): Promise<MusicResult | null> => {
        const res = await fetch('/api/wangyi-random', { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (data.code === 200 && data.data) return { ...normalizeSong(data.data), resolvedAt: Date.now() }
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

    /*
     * 直链是 CDN 现签的**临时地址**，实测签发后一两个小时内必定失效（8 分钟前的还能用，
     * 165 分钟前的全部 403）。而队列是持久化的，里面躺着的直链早就过期了。
     * 所以切歌时先看手上的直链是不是旧的：旧了就重新解析一条再切过去。
     * 不这么做的话，点歌会先加载失败、报一次错、再自愈 —— 观感就是"点了歌先没声音"。
     */
    const URL_TTL_MS = 10 * 60 * 1000
    const isUrlStale = (song: MusicResult) => !song.url || Date.now() - (song.resolvedAt ?? 0) > URL_TTL_MS

    /** 切到队列里的第 index 首：直链还新就直接切，过期了先换一条新的再切 */
    const switchTo = (index: number) => {
        const target = queue.songs[index]
        if (!target) return
        shouldAutoPlayRef.current = true
        // 换歌就是新的开始：位置不再接着上一首
        resumeAtRef.current = 0
        // 用户每切一次都是新的意图，重新给它一次"自动重新解析"的机会
        retriedRef.current.delete(target.id)
        if (!isUrlStale(target)) {
            setQueue((q) => ({ ...q, index }))
            return
        }
        setCoverLoading(true)
        resolveSongById(target.id)
            .then((fresh) => {
                setQueue((q) => {
                    const songs = q.songs.slice()
                    const at = songs.findIndex((item) => item.id === target.id)
                    if (at >= 0 && fresh?.url) songs[at] = { ...songs[at], ...fresh }
                    return { songs, index: at >= 0 ? at : index }
                })
                // 直链刚补上：立刻推一次播放（不能等 canplay，见 kickPlayback 的注释）
                if (fresh?.url) kickPlayback()
            })
            // 解析失败也照样切过去：播放失败会走 handleAudioError 去报错，比卡在原地好
            .catch(() => setQueue((q) => ({ ...q, index })))
            .finally(() => setCoverLoading(false))
    }

    const goTo = (index: number) => {
        if (index < 0 || index >= queue.songs.length) return
        if (index === queue.index) {
            togglePlay()
            return
        }
        userPlayRef.current = true
        switchTo(index)
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

    /* ==================== 歌单（发现） ==================== */

    /**
     * 歌单曲目 → 队列条目。
     * 直链留空：歌单接口只给 id 与元数据，直链要按 id 现解（付费歌的解不出也可能）。
     * 留空正好落在既有的"直链过期"判定上，切到它时会自动解析一条新的。
     */
    const toMusicResult = (track: PlaylistTrack): MusicResult => ({
        id: track.id,
        name: track.name,
        artist: track.artist,
        album: track.album,
        cover: track.cover,
        url: '',
        duration: track.duration,
        pay: '',
        resolvedAt: 0,
    })

    /**
     * 换到某一首之前先把直链备好。
     * 拿到就补进队列（audio 的 src 由此生效并起播）；拿不到就当这首不可播，往后跳。
     */
    const ensurePlayable = async (songId: string | undefined) => {
        if (!songId) return
        setCoverLoading(true)
        try {
            const fresh = await resolveSongById(songId)
            if (fresh?.url) {
                skipStreakRef.current = 0
                setQueue((q) => {
                    const at = q.songs.findIndex((song) => song.id === songId)
                    if (at < 0 || q.songs[at].url) return q
                    const songs = q.songs.slice()
                    songs[at] = { ...songs[at], ...fresh }
                    return { ...q, songs }
                })
                // 直链刚补上：立刻推一次播放（不能等 canplay，见 kickPlayback 的注释）
                kickPlayback()
                return
            }
        } catch {
            /* 落到下面按"不可播"处理 */
        } finally {
            setCoverLoading(false)
        }
        skipUnplayable(songId)
    }

    /**
     * 这首歌解不出直链（付费/版权/下架）：队列里还有别的歌就往后跳一首，并说明原因。
     * 歌单里夹着几首 VIP 歌是常态，卡在第一首不动比跳过去更让人莫名其妙。
     */
    const skipUnplayable = (songId: string) => {
        const { songs } = queueRef.current
        const at = songs.findIndex((song) => song.id === songId)
        const name = at >= 0 ? songs[at].name : '这首歌'

        if (at < 0 || songs.length < 2 || skipStreakRef.current >= 4) {
            setError(`「${name}」暂时无法播放，可能受版权或付费限制`)
            skipStreakRef.current = 0
            return
        }

        skipStreakRef.current += 1
        const nextSong = songs[at + 1 < songs.length ? at + 1 : 0]
        flashNotice(`「${name}」暂不可播，已跳过`)
        shouldAutoPlayRef.current = true
        retriedRef.current.delete(nextSong.id)
        // 用 id 定位下一首：await 期间队列可能已经变了，下标会指错人
        setQueue((q) => {
            const nextIndex = q.songs.findIndex((song) => song.id === nextSong.id)
            if (nextIndex < 0) return q
            return { ...q, index: nextIndex }
        })
        void ensurePlayable(nextSong.id)
    }

    /**
     * 从 startIndex 起找第一首**能解出直链**的曲目。
     * 歌单里夹着几首 VIP / 下架是常态，所以遇到解不出的就往后顺，顺到能播的那首为止。
     */
    const resolvePlayableTrack = async (tracks: PlaylistTrack[], startIndex: number) => {
        const maxAttempts = 5
        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
            const at = startIndex + attempt
            if (at >= tracks.length) break
            const track = tracks[at]
            let fresh: MusicResult | null = null
            try {
                fresh = await resolveSongById(track.id)
            } catch {
                fresh = null
            }
            if (fresh?.url) return { index: at, fresh }
            if (at + 1 < tracks.length) flashNotice(`「${track.name}」暂不可播，已跳过`)
        }
        return null
    }

    /**
     * 播放一整张歌单（从第 startIndex 首开始）。
     *
     * **先把直链解出来，再换队列** —— 这个顺序是这个函数的全部要点。
     * 反过来做（先换队列、之后再补直链）时，<audio> 会先拿到一个空 src、过一会儿才被补上真实地址，
     * 能不能自动播起来就取决于 canplay 事件或兜底轮询的时序；而 preload="metadata" 下 canplay
     * 未必按时到，于是就成了"点了歌只在下面显示、不响，得再点一次或按播放键"。
     * 搜索那条路一直是"先解析后换队列"，所以从来没有这个毛病 —— 这里跟它对齐。
     */
    const playPlaylist = async (tracks: PlaylistTrack[], startIndex = 0, showPlayer = false) => {
        if (tracks.length === 0) return
        const from = Math.min(Math.max(startIndex, 0), tracks.length - 1)
        setCoverLoading(true)
        setPlaylistBusy(true)
        let playable: { index: number; fresh: MusicResult } | null = null
        try {
            playable = await resolvePlayableTrack(tracks, from)
        } finally {
            setCoverLoading(false)
            setPlaylistBusy(false)
        }

        if (!playable) {
            setError('这些歌曲暂时都无法播放，可能受版权或付费限制')
            return
        }

        const songs = tracks.map(toMusicResult)
        // 起始这首带上刚解析好的直链，其余留空：播到哪首解析哪首（切歌时会自动补）
        songs[playable.index] = { ...songs[playable.index], ...playable.fresh }
        shouldAutoPlayRef.current = true
        userPlayRef.current = true
        skipStreakRef.current = 0
        resumeAtRef.current = 0
        retriedRef.current.delete(songs[playable.index].id)
        if (showPlayer) setView('player')
        setQueue({ songs, index: playable.index })
        flashNotice(`已开始播放「${songs[playable.index].name}」，共 ${songs.length} 首`)
        // 等 React 把新的 src 提交到 DOM 之后再推一次 play()：这次的时机是确定的，不会撞上"元素还没有 src"
        window.setTimeout(() => kickPlayback(), 0)
    }

    /** 把整张歌单追加到队列末尾；队列本来是空的就等价于播放全部 */
    const appendPlaylist = (tracks: PlaylistTrack[]) => {
        if (tracks.length === 0) return
        if (queueRef.current.songs.length === 0) {
            playPlaylist(tracks, 0)
            return
        }
        const songs = tracks.map(toMusicResult)
        setQueue((q) => ({ ...q, songs: [...q.songs, ...songs] }))
        flashNotice(`已加入队列：${songs.length} 首`)
    }

    /** 打开某张歌单：自动开播标记只在"卡片上的播放钮"那一路为真 */
    const openPlaylist = (id: string, autoPlay = false) => {
        setLyricMode('list')
        setPlaylistId(id)
        setPlaylistAutoPlay(autoPlay)
        setView('playlist')
    }

    /** 打开艺人页（从搜索里的艺人 chip 进来） */
    const openArtist = (id: string, name: string) => {
        setLyricMode('list')
        setPanel(null)
        setArtistId(id)
        setArtistName(name)
        setView('artist')
    }

    /** 打开专辑页（从艺人页的专辑网格进来）；顺带记住是哪个艺人，返回时回到艺人页 */
    const openAlbum = (id: string) => {
        setAlbumId(id)
        setView('album')
    }

    /**
     * 按名字打开艺人页。
     * 歌曲信息里只有歌手名、没有艺人 id，所以先搜一次拿到 id 再进 —— 多一次请求，
     * 换来的是"点歌手名就能看他的歌"这个最顺的入口（合唱曲只取第一个歌手）。
     */
    const openArtistByName = async (rawName: string) => {
        const name = rawName.split(/[,，/&、]/)[0]?.trim()
        if (!name) return
        try {
            const res = await fetch(`/api/wangyi-artist?type=search&limit=1&q=${encodeURIComponent(name)}`, { cache: 'no-store' })
            const data = await res.json()
            const first = data?.data?.artists?.[0]
            if (first?.id) openArtist(String(first.id), String(first.name ?? name))
            else flashNotice(`没找到艺人「${name}」`)
        } catch {
            flashNotice('艺人搜索失败，请稍后再试')
        }
    }

    /* ==================== 播放控制 ==================== */

    const togglePlay = () => {
        const audio = audioRef.current
        if (!audio || !currentSong?.url) return
        if (!audio.paused) {
            // 用户主动暂停：把"待自动播放"的标记也清掉，
            // 否则下面的换歌兜底会一直想把声音抢回来
            shouldAutoPlayRef.current = false
            userPlayRef.current = false
            audio.pause()
            return
        }
        userPlayRef.current = true
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
        const target = Math.max(0, time)
        audio.currentTime = target
        // 时钟立刻落到目标时刻：等浏览器把 seek 做完（网络流上可能几百毫秒）画面才会跟着走，
        // 那段时间歌词会停在旧位置 —— 这正是"拖完进度条画面和声音对不上"的由来。
        clockRef.current?.seek(target)
        syncClocks(target)
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
                // 走 seekTo 而不是直接写 audio.currentTime：时间轴与进度条要一起回到开头，
                // 否则单曲循环重头播时，歌词还会从上一遍的位置继续读一小会儿。
                seekTo(0)
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
            switchTo(next)
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
        switchTo(prev)
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
            userPlayRef.current = true
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
        /* 艺人搜索和歌曲搜索并行发：用户搜的是人名时，结果里先看到艺人入口才有意义。
           艺人这条路失败不影响歌曲结果（各自 catch）。 */
        void fetch(`/api/wangyi-artist?type=search&limit=6&q=${encodeURIComponent(query)}`, {
            signal: controller.signal,
            cache: 'no-store',
        })
            .then((res) => res.json())
            .then((data) => {
                if (data?.code === 200 && Array.isArray(data.data?.artists)) setSearchArtists(data.data.artists as SearchArtist[])
                else setSearchArtists([])
            })
            .catch(() => setSearchArtists([]))
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
            userPlayRef.current = true
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
            userPlayRef.current = true
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
        setBuffering(true)
    }

    const handleTimeUpdate = (e: SyntheticEvent<HTMLAudioElement>) => {
        const audio = e.currentTarget
        // 暂停时这条是唯一会来的更新（上面那个 60ms 定时器只在播放中跑），
        // 所以两个时刻都要在这里补上，否则暂停状态下拖进度条歌词不会跟着走。
        syncClocks(audio.currentTime)
        if (audio.buffered.length > 0) setBuffered(audio.buffered.end(audio.buffered.length - 1))
    }

    const handleCanPlay = () => {
        setCoverLoading(false)
        setBuffering(false)
        const audio = audioRef.current
        // 重新解析过直链：把播放位置接回原来的地方（媒体换了 src 会从头开始）
        if (audio && resumeAtRef.current > 0) {
            const target = resumeAtRef.current
            resumeAtRef.current = 0
            if (Math.abs(audio.currentTime - target) > 1) {
                audio.currentTime = target
                clockRef.current?.seek(target)
                syncClocks(target)
            }
        }
        if (!shouldAutoPlayRef.current) return
        if (!audio) return
        // 成功起播才清掉这个标记：清早了的话，中途失败一次就再也没人补播
        audio
            .play()
            .then(() => {
                shouldAutoPlayRef.current = false
            })
            .catch(() => setError('浏览器拦截了自动播放，请点击播放按钮'))
    }

    /*
     * 「点歌之后在播、却没声音」在代码里其实只有两种成因：音量是 0，或者被静音。
     * 这两种都不会报任何错、进度条也照样在走，用户只能对着那个小喇叭图标猜，
     * 而且都会被持久化 —— 下次打开页面还是这样，于是每一首都没声音。
     *
     * 所以用户主动点播（点歌 / 按播放 / 按下一首）的那一刻检查一次：听不见就恢复并明确告知。
     * 只对"用户主动"的播放这么做 —— 用户按 M 静音是有意的，自动续播时不去动它。
     */
    const handlePlayStart = () => {
        setIsPlaying(true)
        setBuffering(false)
        if (!userPlayRef.current) return
        userPlayRef.current = false
        if (muted) {
            setMuted(false)
            flashNotice('此前是静音状态，已取消静音')
            return
        }
        if (volume <= 0) {
            setVolume(0.8)
            flashNotice('音量之前是 0，已自动恢复')
        }
    }

    /* 队列镜像：异步流程里要靠它判断"现在队列里都有什么"（见 queueRef 的注释） */
    useEffect(() => {
        queueRef.current = queue
    }, [queue])

    /**
     * 直链一到位就把播放推下去，**不等 canplay**。
     *
     * 为什么必须这样：<audio> 上是 preload="metadata"，浏览器经常只取元数据就停住
     * （readyState 停在 1），于是 canplay 迟迟不来、下面那个兜底轮询又卡在 readyState 门槛上，
     * 结果直链明明已经有了却没人调 play() —— 表现就是"点了歌不响，得再按一次播放按钮"
     * （手按播放键是直接调 play()，绕过上面两道门，所以按了就好）。
     * play() 在 readyState 0 也能调用：它会先把数据取够再开始，这正是我们要的行为。
     */
    const kickPlayback = () => {
        const audio = audioRef.current
        if (!audio || !shouldAutoPlayRef.current) return
        void audio.play().catch(() => {
            /* 被浏览器拦或换源打断：交给下面的兜底轮询继续试 */
        })
    }

    /** 直链多为带签名的临时地址，失效时自动重新解析一次 */
    const handleAudioError = async () => {
        const song = currentSong
        if (!song) return
        setIsPlaying(false)
        setBuffering(true)

        // 记住当前听到哪儿：重解析后要接着这里放，而不是从头再来
        const audio = audioRef.current
        if (audio && audio.currentTime > 3) resumeAtRef.current = audio.currentTime

        if (retriedRef.current.has(song.id)) {
            // 重试过一次还是不行：队列里还有别的歌就跳过它，别卡在一首死歌上
            if (queueRef.current.songs.length > 1) {
                skipUnplayable(song.id)
                return
            }
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
                // 直链刚补上：立刻推一次播放（不能等 canplay，见 kickPlayback 的注释）
                kickPlayback()
            } else if (queueRef.current.songs.length > 1) {
                skipUnplayable(song.id)
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
                if (saved.lyricMode === 'list' || saved.lyricMode === 'stage') setLyricMode(saved.lyricMode)
                if (isLyricStageStyle(saved.stageStyle)) setStageStyle(saved.stageStyle)
                if (typeof saved.lyricOffset === 'number' && Number.isFinite(saved.lyricOffset)) {
                    const value = clampLyricOffset(saved.lyricOffset)
                    setLyricOffset(value)
                    // 上次调的偏移同时也是这次启动的"设备默认"
                    defaultOffsetRef.current = value
                }
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
        /* 逐曲偏移的存档跟着主存档一起读（但分开存，见 utils.ts）：
           只有"用户为这首歌单独调过"的才会在里面。 */
        try {
            const rawOffsets = localStorage.getItem(LYRIC_OFFSET_STORE_KEY)
            if (rawOffsets) {
                const parsed: unknown = JSON.parse(rawOffsets)
                if (Array.isArray(parsed)) {
                    songOffsetsRef.current = parsed
                        .filter(
                            (entry): entry is [string, number] =>
                                Array.isArray(entry) &&
                                entry.length === 2 &&
                                typeof entry[0] === 'string' &&
                                typeof entry[1] === 'number' &&
                                Number.isFinite(entry[1])
                        )
                        .map(([id, offset]) => ({ id, offset: clampLyricOffset(offset) }))
                }
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
                JSON.stringify({
                    volume,
                    muted,
                    mode,
                    rate: playbackRate,
                    songs: queue.songs,
                    index: queue.index,
                    lyricMode,
                    stageStyle,
                    lyricOffset,
                })
            )
        } catch {
            /* 超出配额时忽略 */
        }
    }, [hydrated, volume, muted, mode, playbackRate, queue, lyricMode, stageStyle, lyricOffset])

    /* 播放中用更细的时钟刷新进度：
       timeupdate 只有 ~250ms 精度，会让歌词高亮、滚动、进度条都慢半拍。
       这里读的是播放时钟（连续外推 + 按采样收敛），所以哪怕改成 60ms 轮询一次，
       拿到的也是那一刻准确的位置，而不是浏览器上一次更新留下的台阶。 */
    useEffect(() => {
        if (!isPlaying) return
        const timer = setInterval(() => {
            const audio = audioRef.current
            if (audio && !audio.paused) syncClocks(audio.currentTime)
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

    /*
     * 这里刻意**不再**把 <audio> 接进 WebAudio 分析图。
     *
     * createMediaElementSource 会把元素的输出整个改道进 AudioContext —— 接进去之后，
     * 那声音就只从这张图里出来；而图一旦被浏览器挂起（页面转后台、系统休眠、自动播放策略），
     * 元素照样"在播"、进度条照样走，**却完全没有声音**，还不报任何错。
     * 这是"点了歌、在播放、没声音"最隐蔽的一种成因。
     *
     * 而这张图现在没有任何消费者了：逐词动画按歌词时刻走，不需要音频能量
     * （Folia 的 classic 模式本身也不用频谱驱动的画面）。留着它只剩坏处，
     * 所以整条链路（分析图、crossOrigin、以及为它服务的 CORS 降级）一起去掉。
     * lib/audio.ts 保留着，将来要做随音乐呼吸的画面时再接回来。
     */

    /*
     * 换歌兜底。
     * 正常路径是：换源 → loadstart → canplay → 自动播放。
     * 但 canplay 有时不会来：preload="metadata" 只取元数据、重新解析出来的直链字符串和
     * 上一首一字不差（React 发现 src 没变，干脆不重新加载）、或者播放请求被紧接着的一次
     * 换源打断。表现就是"点了歌，进度条不走"或者"走起来了却没声音"。
     * 所以点名播放之后的几秒里盯着：还没真正开始播就先强制重新加载一次，再重试播放。
     */
    useEffect(() => {
        if (!songId) return
        const audio = audioRef.current
        if (!audio) return
        let ticks = 0
        let reloaded = false
        const timer = setInterval(() => {
            if (!shouldAutoPlayRef.current) {
                clearInterval(timer)
                return
            }
            if (++ticks > 20) {
                shouldAutoPlayRef.current = false
                clearInterval(timer)
                return
            }
            if (!audio.paused) {
                shouldAutoPlayRef.current = false
                clearInterval(timer)
                return
            }
            if (audio.ended) return
            /*
             * 这里**刻意不检查 readyState**。
             * preload="metadata" 下 readyState 常常停在 1（只取了元数据），
             * 若要求"至少 HAVE_CURRENT_DATA 才试播"，这首就永远不会被推起来 ——
             * 恰恰是"点了歌不响、要再按一次播放"的成因。play() 从 readyState 0 调也没问题。
             */
            if (!reloaded && ticks >= 4) {
                // 约 1.2 秒还没动静：多半是 src 没变、浏览器根本没重新加载
                reloaded = true
                audio.load()
                return
            }
            audio
                .play()
                .then(() => {
                    shouldAutoPlayRef.current = false
                    clearInterval(timer)
                })
                .catch(() => {})
        }, 300)
        return () => clearInterval(timer)
    }, [songId])

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
            .then((data) => {
                if (data.code !== 200) return { list: EMPTY_LYRICS, stage: { lines: EMPTY_STAGE_LINES, isWordByWord: false } as StageLyricData }
                // 左侧列表始终用整行 LRC；舞台优先用带逐字时刻的 YRC。
                const list = data.lrc ? parseLRC(data.lrc) : EMPTY_LYRICS
                const stage = buildStageLyrics({
                    yrc: data.yrc,
                    lrc: data.lrc,
                    translation: data.tlyric,
                    duration: durationRef.current,
                })
                return { list, stage }
            })
            .catch(() => ({ list: EMPTY_LYRICS, stage: { lines: EMPTY_STAGE_LINES, isWordByWord: false } as StageLyricData }))

        const colorTask = songCover
            ? extractDominantColors(songCover)
            : Promise.resolve<[string, string]>(['#3a1414', '#0d0d12'])

        Promise.all([lyricTask, colorTask]).then(([{ list, stage }, nextColors]) => {
            if (cancelled) return
            setSongAssets({ id: songId, lyrics: list, stage, colors: nextColors })
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
            prev: () => {
                userPlayRef.current = true
                playPrev()
            },
            next: () => {
                userPlayRef.current = true
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
            // 卸载时把还没落盘的那一次逐曲校准写完：去抖窗口里正好关页面，不该丢掉这次调整
            if (songOffsetSaveTimerRef.current) {
                clearTimeout(songOffsetSaveTimerRef.current)
                persistSongOffsets()
            }
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
    /** 主区不在播放视图（看歌单）时，播放条上要显示"正在播放" */
    const showNowPlaying = Boolean(currentSong) && view !== 'player'
    /** 正在准备/缓冲：直链还没到手，或者元素正在等数据 —— 这时进度条显示等待动画 */
    const awaitingAudio = Boolean(currentSong) && (buffering || !currentSong?.url)
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
                    // 播放条在移动端是 fixed 的：看歌单时它多出一行"正在播放"，底部留白也要跟着加，
                    // 否则主区最后一行会被压在播放条底下
                    !currentSong ? 'pb-6' : showNowPlaying ? 'pb-[148px] sm:pb-[96px]' : 'pb-[96px]'
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
                    {/* 随机：随便挑一首，和歌单无关 */}
                    <button
                        onClick={playRandom}
                        disabled={randomLoading}
                        aria-label="随机播一首"
                        title="随机播一首"
                        className="flex h-10 w-10 shrink-0 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/[0.07] text-[13px] font-medium text-white/85 backdrop-blur-xl transition hover:bg-white/12 active:scale-[.98] disabled:opacity-40 sm:w-auto sm:px-4"
                    >
                        {randomLoading ? <IconSpinner className="h-4 w-4" /> : <IconSparkles className="h-4 w-4" />}
                        <span className="hidden sm:inline">随机</span>
                    </button>

                    {/* 发现：主区切成歌单发现 / 切回播放。在详情页里再点一下就回到播放 */}
                    <button
                        onClick={() => setView((v) => (v === 'player' ? 'discover' : 'player'))}
                        aria-pressed={view !== 'player'}
                        aria-label={view === 'player' ? '打开歌单发现' : '返回播放'}
                        title={view === 'player' ? '发现歌单' : '返回播放'}
                        className={`flex h-10 w-10 shrink-0 items-center justify-center gap-1.5 rounded-full border text-[13px] font-medium backdrop-blur-xl transition active:scale-[.98] sm:w-auto sm:px-4 ${
                            view === 'player'
                                ? 'border-white/10 bg-white/[0.07] text-white/85 hover:bg-white/12'
                                : 'border-[#ec4141]/45 bg-[#ec4141]/18 text-white hover:bg-[#ec4141]/28'
                        }`}
                    >
                        <IconCompass className="h-4 w-4" />
                        <span className="hidden sm:inline">{view === 'player' ? '发现' : '返回播放'}</span>
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

                {/* ============ 主体 ============
                    三屏共用这一块：播放（黑胶+信息+歌词）/ 歌单发现 / 歌单详情。
                    顶栏与底部播放条在它外面，所以切屏时播放不受任何影响。 */}
                <div className="flex min-h-0 flex-1 items-center justify-center py-5 md:py-3">
                    {view === 'discover' ? (
                        /* 滚动容器铺满整行宽度（self-stretch 顶掉父级的居中），宽度限制交给里面那层 ——
                           否则在宽屏上，只有中间 1200px 那一块能滚，光标落在两侧留白上滚不动。 */
                        <section
                            key="discover"
                            className="scrollbar-hidden min-h-0 w-full self-stretch md:h-full md:overflow-y-auto"
                            style={{ animation: 'wy-panel-in .32s ease-out' }}
                        >
                            <div className="mx-auto w-full max-w-[1200px]">
                                <DiscoverPanel onOpenPlaylist={openPlaylist} />
                            </div>
                        </section>
                    ) : view === 'playlist' && playlistId ? (
                        <section
                            key={`playlist-${playlistId}`}
                            className="scrollbar-hidden min-h-0 w-full self-stretch md:h-full md:overflow-y-auto"
                            style={{ animation: 'wy-panel-in .32s ease-out' }}
                        >
                            <div className="mx-auto w-full max-w-[1200px]">
                                <PlaylistDetail
                                    playlistId={playlistId}
                                    autoPlay={playlistAutoPlay}
                                    busy={playlistBusy}
                                    onBack={() => setView('discover')}
                                    onPlayAll={(tracks, index = 0) => void playPlaylist(tracks, index)}
                                    onAutoPlay={(tracks) => void playPlaylist(tracks, 0, true)}
                                    onAppend={appendPlaylist}
                                    currentTrackId={songId}
                                />
                            </div>
                        </section>
                    ) : view === 'artist' && artistId ? (
                        <section
                            key={`artist-${artistId}`}
                            className="scrollbar-hidden min-h-0 w-full self-stretch md:h-full md:overflow-y-auto"
                            style={{ animation: 'wy-panel-in .32s ease-out' }}
                        >
                            <div className="mx-auto w-full max-w-[1200px]">
                                <ArtistPanel
                                    artistId={artistId}
                                    fallbackName={artistName}
                                    busy={playlistBusy}
                                    onBack={() => setView('discover')}
                                    onOpenAlbum={openAlbum}
                                    onPlayTracks={(tracks, index = 0) => void playPlaylist(tracks, index)}
                                    onAppendTracks={appendPlaylist}
                                    currentTrackId={songId}
                                />
                            </div>
                        </section>
                    ) : view === 'album' && albumId ? (
                        <section
                            key={`album-${albumId}`}
                            className="scrollbar-hidden min-h-0 w-full self-stretch md:h-full md:overflow-y-auto"
                            style={{ animation: 'wy-panel-in .32s ease-out' }}
                        >
                            <div className="mx-auto w-full max-w-[1200px]">
                                <AlbumPanel
                                    albumId={albumId}
                                    busy={playlistBusy}
                                    /* 从艺人页进来的就回艺人页，否则回发现页 */
                                    onBack={() => setView(artistId ? 'artist' : 'discover')}
                                    onPlayAll={(tracks, index = 0) => void playPlaylist(tracks, index)}
                                    onAppend={appendPlaylist}
                                    currentTrackId={songId}
                                />
                            </div>
                        </section>
                    ) : currentSong ? (
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
                                                <span className="text-white/55">·</span>
                                                <span className="truncate">{currentSong.pay}</span>
                                            </>
                                        )}

                                        {/* 歌词呈现方式：滚动列表 / 动画舞台。
                                            放在状态行里而不是塞进歌词面板——小屏切换歌词时
                                            这一行始终可见，不会出现"切进去就切不回来"。 */}
                                        <div className="ml-auto flex shrink-0 items-center rounded-full border border-white/12 bg-white/[0.06] p-0.5">
                                            {(['list', 'stage'] as const).map((m) => (
                                                <button
                                                    key={m}
                                                    type="button"
                                                    onClick={() => setLyricMode(m)}
                                                    aria-pressed={lyricMode === m}
                                                    title={m === 'list' ? '经典滚动歌词' : '跟着音乐跳动的歌词动画'}
                                                    className={`inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[12px] transition ${
                                                        lyricMode === m
                                                            ? 'bg-white/18 text-white'
                                                            : 'text-white/50 hover:text-white/80'
                                                    }`}
                                                >
                                                    {m === 'list' ? (
                                                        <IconList className="h-3.5 w-3.5" />
                                                    ) : (
                                                        <IconSparkles className="h-3.5 w-3.5" />
                                                    )}
                                                    {m === 'list' ? '歌词' : '动画'}
                                                </button>
                                            ))}
                                        </div>

                                        <button
                                            onClick={() => setMobileLyrics((v) => !v)}
                                            aria-label={mobileLyrics ? '显示封面' : '显示歌词'}
                                            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.08] px-3 text-[12px] text-white/70 transition hover:bg-white/15 hover:text-white md:hidden"
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
                                        歌手：
                                        {/* 点歌手名看他的单曲与专辑（合唱曲取第一个歌手） */}
                                        <button
                                            type="button"
                                            onClick={() => void openArtistByName(currentSong.artist)}
                                            title="查看这位艺人的单曲与专辑"
                                            className="text-white/75 underline-offset-2 transition hover:text-white hover:underline"
                                        >
                                            {currentSong.artist}
                                        </button>
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
                                            <IconMusic className="h-7 w-7 text-white/55" />
                                            <p className="mt-3 text-sm text-white/45">暂无歌词</p>
                                            <p className="mt-1 text-xs text-white/55">纯音乐，或该歌曲暂未提供歌词</p>
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
                                    <IconDisc className="h-20 w-20 text-white/55" />
                                </div>
                            </div>
                            <h2 className="mt-8 text-lg font-semibold text-white/85">开始你的播放</h2>
                            <p className="mt-2 max-w-md text-sm text-white/40">
                                粘贴网易云分享链接或歌曲 ID 直接播放，也可以直接输入歌名搜索
                            </p>
                            {/* 主入口：没有歌的时候，最该先去的地方就是歌单 */}
                            <button
                                onClick={() => setView('discover')}
                                className="mt-6 inline-flex h-10 items-center gap-2 rounded-full bg-[#ec4141] px-5 text-[13px] font-medium text-white shadow-[0_14px_34px_-16px_rgba(236,65,65,1)] transition hover:bg-[#d73535] active:scale-[.98]"
                            >
                                <IconCompass className="h-4 w-4" />
                                去发现歌单
                            </button>
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
                                    className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs text-white/60 transition hover:bg-white/12 hover:text-white"
                                >
                                    随机一首
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
                            {/* 正在播放：看歌单时主区被占满，播放条上得能看见"现在放的是哪首"。
                                刻意排在**最上面独立一行**：播放条是从底往上长的，加一行只会往上顶，
                                下面那排播放键（上一首/播放/下一首）的位置一动不动。
                                点它回到播放视图；播放视图里大封面与歌名就在眼前，所以那时不显示。 */}
                            {showNowPlaying && (
                                <div className="mb-1 flex justify-start">
                                    <NowPlayingStrip song={currentSong} onOpen={() => setView('player')} className="max-w-full sm:max-w-[320px]" />
                                </div>
                            )}

                            <div className="flex items-center gap-3">
                                <span className="w-11 shrink-0 text-right font-mono text-[11px] text-white/45">
                                    {awaitingAudio ? '--:--' : formatTime(currentTime)}
                                </span>
                                {/* 正在取数据时，进度条换成一条来回扫的等待动画。
                                    这一段里"播到哪儿"其实还没有意义（媒体每次重新取数据都会把位置归零），
                                    原来的做法是照常画进度，于是条子在 0 与上次的位置之间来回跳 —— 看着像 bug。 */}
                                {awaitingAudio ? (
                                    <div
                                        className="relative h-5 flex-1 overflow-hidden"
                                        role="progressbar"
                                        aria-label={currentSong.url ? '正在缓冲' : '正在准备播放'}
                                        aria-busy="true"
                                    >
                                        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-white/12">
                                            <div
                                                className="h-full w-1/3 rounded-full"
                                                style={{
                                                    background: `linear-gradient(90deg, transparent, ${ACCENT}, transparent)`,
                                                    animation: 'wy-loading 1.5s ease-in-out infinite',
                                                }}
                                            />
                                        </div>
                                        <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[10px] text-white/40">
                                            {currentSong.url ? '缓冲中' : '准备中'}
                                        </span>
                                    </div>
                                ) : (
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
                                )}
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
                    <p className="mx-auto max-w-[860px] truncate text-[11px] text-white/55">
                        空格 播放/暂停 · ← → 快进退 5 秒 · ↑ ↓ 音量 · M 静音 · N/P 切歌 · 仅供个人试听
                    </p>
                </div>
            </div>

            {/* ============ 全屏歌词动画 ============
                做成整屏覆盖层（而不是塞在歌词面板里）：这样它才是一块"幕布"，
                封面糊成底、音浪铺满、歌词在正中间逐字亮起。Esc / 右上角关闭。 */}
            {lyricMode === 'stage' && currentSong && (
                <LyricsStage
                    lines={stageLines}
                    playing={isPlaying}
                    getTime={getStageTime}
                    getMediaTime={getStageMediaTime}
                    lyricOffset={lyricOffset}
                    onLyricOffsetChange={applyLyricOffset}
                    songOffsetTuned={songOffsetTuned}
                    onClearSongOffset={clearSongOffset}
                    stageStyle={stageStyle}
                    onStageStyleChange={setStageStyle}
                    colors={bgColors}
                    songName={currentSong.name}
                    artist={currentSong.artist}
                    duration={audioDuration || currentSong.duration / 1000}
                    onSeek={seekTo}
                    onToggle={togglePlay}
                    onPrev={() => {
                        userPlayRef.current = true
                        playPrev()
                    }}
                    onNext={() => {
                        userPlayRef.current = true
                        void advance({ auto: true })
                    }}
                    onClose={() => setLyricMode('list')}
                />
            )}

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
                        artists={searchArtists}
                        onPickArtist={(artist) => openArtist(artist.id, artist.name)}
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
            {/* 隐藏的原生 audio。
                刻意不带 crossOrigin：那只是为了读波形才需要的，而读波形那套已经拆掉（见上方注释）。
                不带它，跨域音源按普通媒体加载即可，少一层出错的可能。 */}
            <audio
                ref={audioRef}
                src={currentSong?.url || undefined}
                onPlay={handlePlayStart}
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
                /* 缓冲信号：waiting/stalled 表示"正在等数据"，playing 表示"又走起来了"。
                   进度条据此切成等待动画，而不是把一个还没开始播的位置当成进度显示。 */
                onWaiting={() => setBuffering(true)}
                onStalled={() => setBuffering(true)}
                onPlaying={() => setBuffering(false)}
                onSeeked={() => setBuffering(false)}
                preload="metadata"
                className="hidden"
            />
        </div>
    )
}
