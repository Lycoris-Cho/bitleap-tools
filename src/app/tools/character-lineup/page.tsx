'use client'

/*
 * 人物合集海报 —— 把单人海报变成一张"整体大图"，并且能动。
 *
 * 布局：海报在**左**（大、吸顶），配置在**右**（标签页），这样调参数时海报一直看得见。
 * 动效：所有画面都是 apply(t) 的纯函数（见 motion.ts / usePosterMotion.ts），
 *       所以进度条能逐帧回看、WebM 能逐帧渲染、PNG 只要归位到终态就是确定性的。
 *
 * 加图支持三种方式：上传 / 粘贴（Ctrl+V）/ 拖拽 —— AI 出图的工作流就是"复制→粘贴"。
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'
import { getFontEmbedCSS, toPng } from 'html-to-image'
import {
    Check,
    Copy,
    Download,
    Expand,
    Film,
    ImagePlus,
    Loader2,
    Minimize2,
    MoveDown,
    MoveUp,
    Pause,
    Play,
    RotateCcw,
    Sparkles,
    Star,
    Trash2,
    TriangleAlert,
} from 'lucide-react'
import PosterStage from './components/PosterStage'
import { buildLineup, defaultHeroIndex, keyOutBackground, mixHex } from './lineup'
import { EASINGS, FALL_SHAPES } from './motion'
import {
    DEFAULT_CONFIG,
    DEFAULT_MOTION,
    DEFAULT_TEXT,
    exportPixelRatio,
    fillText,
    MOTION_PRESETS,
    toneById,
    TONES,
    type ToneId,
} from './presets'
import { MAX_FRAMES, canRecordWebm, recordPosterWebm } from './video'
import { hasIdleMotion, usePosterMotion, type PosterMotionHandle } from './usePosterMotion'
import { MAX_CHARACTERS, POSTER_H, POSTER_W, type CharacterItem, type LineupConfig, type MotionConfig, type Treatment } from './types'

const STORAGE_KEY = 'bitleap:character-lineup:v2'
/** 动图的帧率：24 对海报这类慢动作足够，还能把逐帧成本压下来 */
const VIDEO_FPS = 24

type Tab = 'chars' | 'layout' | 'text' | 'tone' | 'motion' | 'decor'

const TABS: Array<{ id: Tab; label: string }> = [
    { id: 'chars', label: '角色' },
    { id: 'layout', label: '版式' },
    { id: 'text', label: '文案' },
    { id: 'tone', label: '配色' },
    { id: 'motion', label: '动效' },
    { id: 'decor', label: '装饰' },
]

/* ── 本地控件 ── */

function Section({ kicker, title, children }: { kicker: string; title: string; children: ReactNode }) {
    return (
        <section className="rounded-[22px] border border-black/[0.055] bg-white/82 p-4 shadow-[0_24px_70px_-58px_rgba(67,56,202,.28)] backdrop-blur-xl">
            <div className="text-[9px] uppercase tracking-[0.17em] text-zinc-300">{kicker}</div>
            <h3 className="mt-1 text-sm font-semibold text-zinc-800">{title}</h3>
            <div className="mt-3 space-y-3.5">{children}</div>
        </section>
    )
}

function Slider({
    label,
    value,
    min,
    max,
    step = 1,
    unit = '',
    onChange,
}: {
    label: string
    value: number
    min: number
    max: number
    step?: number
    unit?: string
    onChange: (v: number) => void
}) {
    return (
        <div>
            <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-400">{label}</span>
                <div className="flex h-7 items-center rounded-lg border border-black/[0.06] bg-zinc-50 px-2">
                    <input
                        type="number"
                        min={min}
                        max={max}
                        step={step}
                        value={Math.round(value * 100) / 100}
                        onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value))))}
                        className="w-14 bg-transparent text-right font-mono text-[11px] text-zinc-600 outline-none"
                    />
                    {unit && <span className="ml-1 text-[11px] text-zinc-400">{unit}</span>}
                </div>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="mt-2 w-full accent-violet-500"
            />
        </div>
    )
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
    return (
        <label className="block">
            <span className="text-[11px] text-zinc-400">{label}</span>
            <input
                value={value}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-black/[0.07] bg-white/80 px-2.5 py-1.5 text-[12px] text-zinc-700 outline-none transition focus:border-violet-300"
            />
        </label>
    )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
        <label className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-zinc-400">{label}</span>
            <span className="flex items-center gap-1.5">
                <span className="font-mono text-[11px] text-zinc-500">{value.toUpperCase()}</span>
                <span className="relative h-6 w-6 overflow-hidden rounded-full border border-black/10">
                    <input
                        type="color"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        aria-label={label}
                        className="absolute -left-1.5 -top-1.5 h-10 w-10 cursor-pointer"
                    />
                </span>
            </span>
        </label>
    )
}

function Toggle({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
    return (
        <div>
            <button
                type="button"
                onClick={() => onChange(!value)}
                className="flex w-full items-center justify-between rounded-lg border border-black/[0.06] bg-white/70 px-3 py-2 text-[11px] text-zinc-600 transition hover:border-black/15"
            >
                <span>{label}</span>
                <span className={`h-4 w-7 rounded-full p-0.5 transition ${value ? 'bg-zinc-950' : 'bg-zinc-300'}`}>
                    <span className={`block h-3 w-3 rounded-full bg-white transition ${value ? 'translate-x-3' : ''}`} />
                </span>
            </button>
            {hint && <p className="mt-1.5 text-[10px] leading-4 text-zinc-400">{hint}</p>}
        </div>
    )
}

function Pills<T extends string>({
    label,
    value,
    options,
    onChange,
    columns = 3,
}: {
    label?: string
    value: T
    options: ReadonlyArray<{ id: T; label: string }>
    onChange: (v: T) => void
    columns?: number
}) {
    return (
        <div>
            {label && <div className="mb-2 text-[11px] text-zinc-400">{label}</div>}
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
                {options.map((o) => (
                    <button
                        key={o.id}
                        type="button"
                        onClick={() => onChange(o.id)}
                        className={`rounded-lg border px-2 py-1.5 text-[11px] transition ${
                            value === o.id
                                ? 'border-zinc-950 bg-zinc-950 text-white'
                                : 'border-black/[0.07] bg-white/70 text-zinc-600 hover:border-black/15 hover:text-zinc-900'
                        }`}
                    >
                        {o.label}
                    </button>
                ))}
            </div>
        </div>
    )
}

function downloadBlob(name: string, blob: Blob) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
}

/* ── 页面 ── */

export default function CharacterLineupPage() {
    const [items, setItems] = useState<CharacterItem[]>([])
    const [heroId, setHeroId] = useState<string | null>(null)
    const [cfg, setCfg] = useState<LineupConfig>(DEFAULT_CONFIG)
    const [motion, setMotion] = useState<MotionConfig>(DEFAULT_MOTION)
    const [tone, setTone] = useState<ToneId>('sakura')
    const [tab, setTab] = useState<Tab>('chars')
    const [notice, setNotice] = useState('')
    const [busy, setBusy] = useState(false)
    const [keying, setKeying] = useState<string | null>(null)
    const [dragging, setDragging] = useState(false)
    const [openId, setOpenId] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [hydrated, setHydrated] = useState(false)
    const [dragFrom, setDragFrom] = useState<number | null>(null)
    const [playing, setPlaying] = useState(false)
    const [fullscreen, setFullscreen] = useState(false)
    /** 普通视图下的缩放（按容器量）；全屏另有 fsScale */
    const [normalScale, setNormalScale] = useState(0.4)
    const [fsScale, setFsScale] = useState(0.5)
    const [videoSeconds, setVideoSeconds] = useState(2)
    const [videoSize, setVideoSize] = useState<'540' | '720' | '1080'>('720')
    const [videoIntro, setVideoIntro] = useState(true)
    const [videoBusy, setVideoBusy] = useState(false)
    const [videoPct, setVideoPct] = useState(0)
    const [videoPhase, setVideoPhase] = useState<'render' | 'encode'>('render')

    const fileRef = useRef<HTMLInputElement>(null)
    const stageWrapRef = useRef<HTMLDivElement>(null)
    const posterRef = useRef<HTMLDivElement>(null)
    const scrubRef = useRef<HTMLInputElement>(null)
    const timeLabelRef = useRef<HTMLSpanElement>(null)
    const scrubDragRef = useRef(false)
    const cancelVideoRef = useRef(false)
    const fontCssPromiseRef = useRef<Promise<string> | null>(null)
    const motionHandle = useRef<PosterMotionHandle>(null)

    const patch = useCallback((p: Partial<LineupConfig>) => setCfg((c) => ({ ...c, ...p })), [])
    const patchMotion = useCallback((p: Partial<MotionConfig>) => setMotion((m) => ({ ...m, ...p })), [])

    const heroIndex = useMemo(() => {
        if (items.length === 0) return -1
        const found = heroId ? items.findIndex((i) => i.id === heroId) : -1
        return found >= 0 ? found : defaultHeroIndex(items.length)
    }, [heroId, items])

    const slots = useMemo(() => buildLineup(items, cfg, heroIndex), [items, cfg, heroIndex])

    /* ── 动效驱动：时间→画面，全程不经过 React ── */
    const onFrame = useCallback((t: number, total: number) => {
        if (!scrubDragRef.current && scrubRef.current && total > 0) {
            scrubRef.current.value = String((Math.min(t, total) / total) * 1000)
        }
        /*
         * 秒数只显示"入场进度"，跑完就停。
         * 不能直接显示 t：常态微动（飘落物/呼吸）要求 t 一直增长，而进度条被夹在入场结束处，
         * 于是会出现"条到底了、秒数还在涨"。
         */
        if (timeLabelRef.current) {
            timeLabelRef.current.textContent =
                total <= 0 ? '无入场' : t >= total ? '已完成' : `${t.toFixed(2)}s / ${total.toFixed(2)}s`
        }
    }, [])
    // end（入场结束时刻）由驱动回传，页面不自己缓存 —— 缓存 ref 会被 React 编译器判成"跨 hook 改值"
    const { end } = usePosterMotion(posterRef, slots, motion, { playing, onFrame, ref: motionHandle })

    /* 当前缩放：普通视图按容器量，全屏按视口量 */
    const scale = fullscreen ? fsScale : normalScale

    /* 首帧用终态渲染（服务端与首屏都不空白），挂载后再决定要不要播入场 */
    const [initialTime] = useState(() => end)

    /* ── 尺寸与全屏缩放 ── */
    useEffect(() => {
        const el = stageWrapRef.current
        if (!el || fullscreen) return
        const measure = () => {
            const w = el.clientWidth
            const maxH = Math.max(320, window.innerHeight - 240)
            setNormalScale(Math.min(w / POSTER_W, maxH / POSTER_H))
        }
        measure()
        const ro = new ResizeObserver(measure)
        ro.observe(el)
        window.addEventListener('resize', measure)
        return () => {
            ro.disconnect()
            window.removeEventListener('resize', measure)
        }
    }, [fullscreen])

    useEffect(() => {
        if (!fullscreen) return
        const measure = () => setFsScale(Math.min(window.innerWidth / POSTER_W, window.innerHeight / POSTER_H) * 0.96)
        measure()
        window.addEventListener('resize', measure)
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setFullscreen(false)
        }
        window.addEventListener('keydown', onKey)
        return () => {
            window.removeEventListener('resize', measure)
            window.removeEventListener('keydown', onKey)
        }
    }, [fullscreen])

    /* ── 持久化：只存配置（图片是 objectURL，刷新即失效） ── */
    useEffect(() => {
        let raw: string | null = null
        try {
            raw = localStorage.getItem(STORAGE_KEY)
        } catch {
            /* 隐私模式读不到 */
        }
        const timer = window.setTimeout(() => {
            if (raw) {
                try {
                    const saved = JSON.parse(raw) as { cfg?: LineupConfig; motion?: MotionConfig; tone?: ToneId }
                    if (saved.cfg) setCfg({ ...DEFAULT_CONFIG, ...saved.cfg })
                    if (saved.motion) setMotion({ ...DEFAULT_MOTION, ...saved.motion })
                    if (saved.tone) setTone(saved.tone)
                } catch {
                    /* 忽略损坏数据 */
                }
            }
            setHydrated(true)
        }, 0)
        return () => window.clearTimeout(timer)
    }, [])

    useEffect(() => {
        if (!hydrated) return
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ cfg, motion, tone }))
        } catch {
            /* 忽略配额错误 */
        }
    }, [cfg, motion, tone, hydrated])

    /* ── 入场自动播一次（尊重"减少动态效果"） ── */
    const [reduceMotion, setReduceMotion] = useState(false)
    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
        const sync = () => setReduceMotion(mq.matches)
        sync()
        mq.addEventListener('change', sync)
        return () => mq.removeEventListener('change', sync)
    }, [])

    useEffect(() => {
        if (reduceMotion || !motion.introOn) return
        const id = window.setTimeout(() => {
            motionHandle.current?.restart()
            setPlaying(true)
        }, 120)
        return () => window.clearTimeout(id)
        // 只在挂载时自动播一次；之后由用户控制
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    /* 入场跑完且没有常态微动 → 停掉循环，别空转 */
    useEffect(() => {
        if (!playing) return
        if (hasIdleMotion(motion) || motion.loopIntro) return
        const id = window.setInterval(() => {
            if ((motionHandle.current?.getTime() ?? 0) >= end + 0.1) setPlaying(false)
        }, 200)
        return () => window.clearInterval(id)
    }, [playing, motion, end])

    useEffect(() => {
        if (!fullscreen) return
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = prev
        }
    }, [fullscreen])

    const flash = useCallback((msg: string) => {
        setNotice(msg)
        window.setTimeout(() => setNotice((cur) => (cur === msg ? '' : cur)), 3000)
    }, [])

    /* ── 加图：上传 / 粘贴 / 拖拽三条路 ── */
    const addImages = useCallback(
        async (files: File[]) => {
            const images = files.filter((f) => f.type.startsWith('image/'))
            if (images.length === 0) return
            setItems((cur) => {
                const room = MAX_CHARACTERS - cur.length
                if (room <= 0) {
                    flash(`上限 ${MAX_CHARACTERS} 位，先删掉一些再加`)
                    return cur
                }
                const take = images.slice(0, room)
                if (take.length < images.length) flash(`上限 ${MAX_CHARACTERS} 位，已忽略多余的 ${images.length - take.length} 张`)
                const added = take.map((f, i) => {
                    const url = URL.createObjectURL(f)
                    return {
                        id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
                        src: url,
                        rawSrc: url,
                        name: f.name.replace(/\.[^.]+$/, '').slice(0, 24) || '未命名',
                        tag: '',
                        // PNG 多半是透明底立绘、JPG 多半带背景，按类型给个聪明的默认值
                        treatment: (/png/i.test(f.type) ? 'cutout' : 'frame') as Treatment,
                        scale: 1,
                        offsetY: 0,
                        focal: 50,
                        keyed: false,
                    }
                })
                return [...cur, ...added]
            })
        },
        [flash],
    )

    useEffect(() => {
        const onPaste = (e: ClipboardEvent) => {
            const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'))
            if (files.length === 0) return
            e.preventDefault()
            void addImages(files)
        }
        window.addEventListener('paste', onPaste)
        return () => window.removeEventListener('paste', onPaste)
    }, [addImages])

    const update = useCallback((id: string, p: Partial<CharacterItem>) => {
        setItems((cur) => cur.map((it) => (it.id === id ? { ...it, ...p } : it)))
    }, [])

    const remove = useCallback((id: string) => {
        setItems((cur) => {
            const hit = cur.find((i) => i.id === id)
            if (hit) for (const u of [hit.src, hit.rawSrc]) if (u.startsWith('blob:')) URL.revokeObjectURL(u)
            return cur.filter((i) => i.id !== id)
        })
        setOpenId((cur) => (cur === id ? null : cur))
    }, [])

    const move = useCallback((index: number, delta: number) => {
        setItems((cur) => {
            const to = index + delta
            if (to < 0 || to >= cur.length) return cur
            const next = cur.slice()
            const [it] = next.splice(index, 1)
            next.splice(to, 0, it)
            return next
        })
    }, [])

    const dropAt = useCallback((from: number, to: number) => {
        setItems((cur) => {
            if (from === to || from < 0 || to < 0 || from >= cur.length || to >= cur.length) return cur
            const next = cur.slice()
            const [it] = next.splice(from, 1)
            next.splice(to, 0, it)
            return next
        })
    }, [])

    const toggleKey = useCallback(
        async (item: CharacterItem) => {
            if (item.keyed) {
                update(item.id, { keyed: false, src: item.rawSrc })
                return
            }
            setKeying(item.id)
            try {
                const res = await keyOutBackground(item.rawSrc)
                update(item.id, { keyed: true, src: res.url })
                if (res.spread > 90) flash('四角颜色差异较大，背景不纯，抠图效果可能不理想')
                else if (res.removedRatio > 0.92) flash('几乎整张图都被判定为背景，请检查图片或关掉这个开关')
                else flash(`已去掉纯色底（抠掉 ${Math.round(res.removedRatio * 100)}%）`)
            } catch {
                flash('抠图失败，已保留原图')
            } finally {
                setKeying(null)
            }
        },
        [flash, update],
    )

    const applyTone = useCallback((id: ToneId) => {
        setTone(id)
        setCfg((c) => ({ ...c, ...toneById(id).colors }))
    }, [])

    const applyMotionPreset = useCallback(
        (id: string) => {
            const preset = MOTION_PRESETS.find((p) => p.id === id)
            if (!preset) return
            setMotion((m) => ({ ...m, ...preset.motion }))
            if (preset.motion.introOn) {
                motionHandle.current?.restart()
                setPlaying(true)
            }
        },
        [],
    )

    /* ── 导出 ── */
    const videoWidth = videoSize === '1080' ? 1920 : videoSize === '540' ? 960 : 1280
    const frameTotal = Math.min(MAX_FRAMES, Math.round(VIDEO_FPS * videoSeconds))
    /*
     * 逐帧成本与**像素数**成正比。实测：720p 时约 0.42 秒/帧，而滤镜/混合模式开关对它几乎没有影响
     * （两轮对比都是 415ms/帧）—— 时间花在 html-to-image 每帧克隆 DOM + 栅格化本身。
     * 所以预估就按面积换算，并如实写出来让用户自己权衡。
     */
    const perFrame = 0.42 * (videoWidth / 1280) ** 2
    const estSeconds = Math.max(2, Math.round(frameTotal * perFrame + videoSeconds))
    const ratioPx = exportPixelRatio()
    const outW = Math.round(POSTER_W * ratioPx)
    const outH = Math.round(POSTER_H * ratioPx)

    const ensureFontCss = useCallback((node: HTMLElement) => {
        // 缓存 Promise 而不是结果：getFontEmbedCSS 可能返回空串，用 `if (!css)` 会每次导出都重算（实测多花十几秒）
        if (!fontCssPromiseRef.current) fontCssPromiseRef.current = getFontEmbedCSS(node)
        return fontCssPromiseRef.current
    }, [])

    useEffect(() => {
        const id = window.setTimeout(() => {
            const node = posterRef.current
            if (node) void ensureFontCss(node).catch(() => {})
        }, 1500)
        return () => window.clearTimeout(id)
    }, [ensureFontCss])

    const exportPng = useCallback(async () => {
        const node = posterRef.current
        if (!node) return
        setBusy(true)
        try {
            // 归位到入场终态：动画没跑完就导出的话，人物和文字还停在 opacity 0，成图会缺内容
            motionHandle.current?.settle()
            const fontEmbedCSS = await ensureFontCss(node)
            const dataUrl = await toPng(node, {
                pixelRatio: ratioPx,
                // 必须关掉 cacheBust：它给资源地址加 ?t= 查询串，而用户上传的是 blob: 地址，加了就失效
                cacheBust: false,
                backgroundColor: cfg.paper,
                fontEmbedCSS,
            })
            const a = document.createElement('a')
            a.href = dataUrl
            a.download = `lineup-${fillText(cfg.title, items.length)}-${Date.now()}.png`
            a.click()
            flash(`已导出 ${outW} × ${outH} 静帧`)
        } catch (err) {
            console.error('[character-lineup] png export failed', err)
            flash(`导出失败：${(err instanceof Error ? err.message : String(err)).slice(0, 60)}`)
        } finally {
            setBusy(false)
        }
    }, [cfg.paper, cfg.title, ensureFontCss, flash, items.length, outH, outW, ratioPx])

    const exportWebm = useCallback(async () => {
        const node = posterRef.current
        if (!node) return
        if (!canRecordWebm()) {
            flash('当前浏览器不支持 WebM 录制，请用 Chrome / Edge')
            return
        }
        setVideoBusy(true)
        setVideoPct(0)
        setVideoPhase('render')
        cancelVideoRef.current = false
        const prevPlaying = playing
        setPlaying(false)
        try {
            const width = videoWidth
            const fontEmbedCSS = await ensureFontCss(node)
            const t0 = videoIntro ? 0 : end
            const blob = await recordPosterWebm({
                node,
                width,
                fps: VIDEO_FPS,
                seconds: videoSeconds,
                renderAt: (t) => motionHandle.current?.render(t0 + t),
                fontEmbedCSS,
                backgroundColor: cfg.paper,
                onProgress: (phase, done, total) => {
                    setVideoPhase(phase)
                    setVideoPct(done / total)
                },
                isCancelled: () => cancelVideoRef.current,
            })
            downloadBlob(`lineup-${fillText(cfg.title, items.length)}-${videoSeconds}s-${Date.now()}.webm`, blob)
            flash(`已导出 ${videoSeconds}s WebM（${blob.size / 1048576 > 0.1 ? (blob.size / 1048576).toFixed(1) + 'MB' : Math.round(blob.size / 1024) + 'KB'}）`)
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            if (msg.includes('取消')) flash('已取消导出')
            else {
                console.error('[character-lineup] webm export failed', err)
                flash(`动图导出失败：${msg.slice(0, 60)}`)
            }
        } finally {
            setVideoBusy(false)
            setVideoPct(0)
            motionHandle.current?.seek(t0Safe(videoIntro, end))
            setPlaying(prevPlaying)
        }
    }, [cfg.paper, cfg.title, end, ensureFontCss, flash, items.length, playing, videoIntro, videoSeconds, videoWidth])

    const copyConfig = useCallback(async () => {
        await navigator.clipboard.writeText(JSON.stringify({ cfg, motion, tone }, null, 2))
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
    }, [cfg, motion, tone])


    return (
        <div className="relative min-h-screen bg-[#f7f7fa] text-zinc-950">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_7%_5%,rgba(237,233,254,.62),transparent_24%),radial-gradient(circle_at_93%_8%,rgba(224,242,254,.58),transparent_25%),radial-gradient(circle_at_50%_78%,rgba(253,242,248,.42),transparent_34%)]" />

            <div className="relative mx-auto w-full max-w-[1800px] px-4 pb-12 pt-6 sm:px-6 lg:px-8">
                <Breadcrumb />

                <header className="mt-2 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <div className="text-[10px] uppercase tracking-[0.18em] text-violet-400">Character Lineup</div>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">人物合集海报</h1>
                        <p className="mt-2 max-w-2xl text-[13px] leading-6 text-zinc-500">
                            多张人物图合成一张<b className="font-medium text-zinc-700">整体群像</b>：主角居中、两翼渐小，可加入场与常态动效，
                            导出 {outW}×{outH} 静帧或 WebM 动图。
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            disabled={items.length >= MAX_CHARACTERS}
                            className="flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white/80 px-3.5 py-2 text-[12px] text-zinc-600 transition enabled:hover:border-black/20 enabled:hover:text-zinc-900 disabled:opacity-40"
                        >
                            <ImagePlus className="h-3.5 w-3.5" />
                            添加图片
                        </button>
                        <button
                            type="button"
                            onClick={() => setFullscreen(true)}
                            className="flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white/80 px-3.5 py-2 text-[12px] text-zinc-600 transition hover:border-black/20 hover:text-zinc-900"
                        >
                            <Expand className="h-3.5 w-3.5" />
                            全屏预览
                        </button>
                        <button
                            type="button"
                            onClick={() => void exportPng()}
                            disabled={busy || items.length === 0}
                            className="flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white/80 px-3.5 py-2 text-[12px] text-zinc-600 transition enabled:hover:border-black/20 enabled:hover:text-zinc-900 disabled:opacity-40"
                        >
                            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                            {busy ? '合成中' : '导出 PNG'}
                        </button>
                        <button
                            type="button"
                            onClick={() => void exportWebm()}
                            disabled={videoBusy || items.length === 0}
                            className="flex items-center gap-1.5 rounded-full bg-zinc-950 px-4 py-2 text-[12px] font-medium text-white transition enabled:hover:bg-zinc-800 disabled:opacity-40"
                        >
                            {videoBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Film className="h-3.5 w-3.5" />}
                            {videoBusy ? '录制中' : '导出动图'}
                        </button>
                    </div>
                </header>

                {notice && (
                    <p className="mt-3 flex items-center gap-1.5 text-[11px] text-violet-500">
                        <Sparkles className="h-3.5 w-3.5" />
                        {notice}
                    </p>
                )}

                <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_384px]">
                    {/* ── 左：海报（大、吸顶） ── */}
                    <main className="min-w-0">
                        <div className="space-y-3 xl:sticky xl:top-20">
                            <div
                                ref={stageWrapRef}
                                onDragOver={(e) => {
                                    e.preventDefault()
                                    setDragging(true)
                                }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={(e) => {
                                    e.preventDefault()
                                    setDragging(false)
                                    void addImages(Array.from(e.dataTransfer.files))
                                }}
                                className={
                                    fullscreen
                                        ? 'fixed inset-0 z-[80] flex items-center justify-center bg-[#0b0b0d]'
                                        : `relative rounded-[24px] border bg-white/70 p-3 shadow-[0_28px_90px_-66px_rgba(67,56,202,.24)] backdrop-blur-xl transition ${
                                              dragging ? 'border-violet-400 bg-violet-50/70' : 'border-black/[0.055]'
                                          }`
                                }
                            >
                                <div
                                    className={fullscreen ? '' : 'relative overflow-hidden rounded-[16px] shadow-[0_18px_50px_-38px_rgba(15,23,42,.4)]'}
                                    style={fullscreen ? { width: POSTER_W * scale, height: POSTER_H * scale } : { height: POSTER_H * scale }}
                                >
                                    <div
                                        style={{
                                            position: 'absolute',
                                            left: fullscreen ? 0 : '50%',
                                            top: 0,
                                            width: POSTER_W,
                                            height: POSTER_H,
                                            transform: fullscreen ? `scale(${scale})` : `translateX(-50%) scale(${scale})`,
                                            transformOrigin: fullscreen ? 'top left' : 'top center',
                                        }}
                                    >
                                        {/* 导出抓的就是这个节点：它本身没有被缩放 */}
                                        <div ref={posterRef}>
                                            <PosterStage items={items} slots={slots} cfg={cfg} motion={motion} initialTime={initialTime} />
                                        </div>
                                    </div>
                                </div>

                                {/* 全屏时的退出按钮与提示 */}
                                {fullscreen && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setFullscreen(false)}
                                            className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/80 backdrop-blur transition hover:bg-white/20 hover:text-white"
                                            aria-label="退出全屏预览"
                                        >
                                            <Minimize2 className="h-4 w-4" />
                                        </button>
                                        <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1.5 text-[11px] text-white/60">
                                            按 Esc 退出 · 空格播放/暂停
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* 播放控制（全屏时隐藏，避免遮挡） */}
                            {!fullscreen && (
                                <div className="flex items-center gap-3 rounded-2xl border border-black/[0.055] bg-white/70 px-3 py-2.5 backdrop-blur-xl">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (playing) setPlaying(false)
                                            else {
                                                motionHandle.current?.play()
                                                setPlaying(true)
                                            }
                                        }}
                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-white transition hover:bg-zinc-800"
                                        aria-label={playing ? '暂停' : '播放'}
                                    >
                                        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="ml-0.5 h-3.5 w-3.5" />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            motionHandle.current?.restart()
                                            setPlaying(true)
                                        }}
                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/[0.08] text-zinc-500 transition hover:text-zinc-900"
                                        aria-label="重播"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                    </button>
                                    <input
                                        ref={scrubRef}
                                        type="range"
                                        min={0}
                                        max={1000}
                                        defaultValue={1000}
                                        disabled={end <= 0}
                                        aria-label="入场进度"
                                        className="h-1.5 w-full cursor-pointer accent-violet-500 disabled:opacity-40"
                                        onPointerDown={() => {
                                            scrubDragRef.current = true
                                        }}
                                        onPointerUp={() => {
                                            scrubDragRef.current = false
                                        }}
                                        onPointerCancel={() => {
                                            scrubDragRef.current = false
                                        }}
                                        onChange={(e) => {
                                            setPlaying(false)
                                            motionHandle.current?.seek((Number(e.target.value) / 1000) * end)
                                        }}
                                    />
                                    <span ref={timeLabelRef} className="shrink-0 font-mono text-[11px] text-zinc-400">
                                        0.00s
                                    </span>
                                    <div className="flex shrink-0 items-center gap-0.5 rounded-full border border-black/[0.07] bg-white/70 p-0.5">
                                        {[0.5, 1, 1.5].map((s) => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => patchMotion({ speed: s })}
                                                className={`rounded-full px-2 py-0.5 text-[10px] transition ${
                                                    motion.speed === s ? 'bg-zinc-950 text-white' : 'text-zinc-500 hover:text-zinc-900'
                                                }`}
                                            >
                                                {s}×
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!fullscreen && (
                                <div className="flex items-center justify-between px-1 text-[11px] text-zinc-400">
                                    <span>
                                        海报 {POSTER_W} × {POSTER_H} · 16:9
                                    </span>
                                    <span>
                                        静帧导出 {outW} × {outH}px
                                    </span>
                                </div>
                            )}
                        </div>
                    </main>

                    {/* ── 右：配置面板（标签页） ── */}
                    <aside className="space-y-3 xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto xl:pr-1">
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                                void addImages(Array.from(e.target.files ?? []))
                                e.target.value = ''
                            }}
                        />

                        <div className="grid grid-cols-6 gap-1 rounded-2xl border border-black/[0.055] bg-white/78 p-1 backdrop-blur-xl">
                            {TABS.map((t) => (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setTab(t.id)}
                                    className={`rounded-xl px-1 py-1.5 text-[11px] transition ${
                                        tab === t.id ? 'bg-zinc-950 text-white' : 'text-zinc-500 hover:text-zinc-900'
                                    }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        {tab === 'chars' && (
                            <Section kicker={`Characters · ${items.length}/${MAX_CHARACTERS}`} title="角色">
                                {items.length === 0 && (
                                    <button
                                        type="button"
                                        onClick={() => fileRef.current?.click()}
                                        className="w-full rounded-2xl border border-dashed border-black/15 bg-white/60 px-3 py-8 text-center text-[12px] leading-5 text-zinc-400 transition hover:border-violet-300 hover:text-violet-500"
                                    >
                                        点这里选图
                                        <br />
                                        也可以直接 <b className="font-medium text-zinc-500">Ctrl+V 粘贴</b> 或把图拖到左边
                                    </button>
                                )}
                                <div className="space-y-1.5">
                                    {items.map((item, index) => {
                                        const isHero = index === heroIndex
                                        const open = openId === item.id
                                        return (
                                            <div
                                                key={item.id}
                                                draggable
                                                onDragStart={() => setDragFrom(index)}
                                                onDragOver={(e) => e.preventDefault()}
                                                onDrop={() => {
                                                    if (dragFrom !== null) dropAt(dragFrom, index)
                                                    setDragFrom(null)
                                                }}
                                                className={`rounded-2xl border p-2 transition ${
                                                    isHero ? 'border-violet-300 bg-violet-50/60' : 'border-black/[0.06] bg-white/70'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-black/[0.07] bg-zinc-100">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            src={item.src}
                                                            alt=""
                                                            className={`h-full w-full ${item.treatment === 'cutout' ? 'object-contain' : 'object-cover'}`}
                                                        />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <input
                                                            value={item.name}
                                                            onChange={(e) => update(item.id, { name: e.target.value })}
                                                            placeholder="名字"
                                                            className="w-full truncate bg-transparent text-[12px] font-medium text-zinc-800 outline-none placeholder:text-zinc-300"
                                                        />
                                                        <input
                                                            value={item.tag}
                                                            onChange={(e) => update(item.id, { tag: e.target.value })}
                                                            placeholder="代号 / 称号（可选）"
                                                            className="mt-0.5 w-full truncate bg-transparent text-[11px] text-zinc-400 outline-none placeholder:text-zinc-300"
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setHeroId(item.id)}
                                                        title="设为主角（居中放大）"
                                                        className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${
                                                            isHero ? 'text-violet-500' : 'text-zinc-300 hover:text-violet-400'
                                                        }`}
                                                    >
                                                        <Star className={`h-3.5 w-3.5 ${isHero ? 'fill-violet-400' : ''}`} />
                                                    </button>
                                                </div>

                                                <div className="mt-1.5 flex items-center gap-1">
                                                    <div className="flex items-center gap-0.5 rounded-full border border-black/[0.07] bg-white/70 p-0.5">
                                                        {(['cutout', 'frame'] as Treatment[]).map((t) => (
                                                            <button
                                                                key={t}
                                                                type="button"
                                                                onClick={() => update(item.id, { treatment: t })}
                                                                className={`rounded-full px-2 py-0.5 text-[10px] transition ${
                                                                    item.treatment === t ? 'bg-zinc-950 text-white' : 'text-zinc-500 hover:text-zinc-900'
                                                                }`}
                                                            >
                                                                {t === 'cutout' ? '立绘' : '画框'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setOpenId(open ? null : item.id)}
                                                        className="rounded-full px-2 py-1 text-[10px] text-zinc-400 transition hover:text-zinc-900"
                                                    >
                                                        {open ? '收起' : '微调'}
                                                    </button>
                                                    <div className="ml-auto flex items-center gap-0.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => move(index, -1)}
                                                            disabled={index === 0}
                                                            aria-label="上移"
                                                            className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 transition enabled:hover:text-zinc-900 disabled:opacity-30"
                                                        >
                                                            <MoveUp className="h-3 w-3" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => move(index, 1)}
                                                            disabled={index === items.length - 1}
                                                            aria-label="下移"
                                                            className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 transition enabled:hover:text-zinc-900 disabled:opacity-30"
                                                        >
                                                            <MoveDown className="h-3 w-3" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => remove(item.id)}
                                                            aria-label="删除"
                                                            className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 transition hover:text-rose-500"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {open && (
                                                    <div className="mt-2 space-y-2.5 border-t border-black/[0.05] pt-2.5">
                                                        <Slider
                                                            label={item.treatment === 'cutout' ? '人物大小' : '取景缩放'}
                                                            value={item.scale}
                                                            min={0.4}
                                                            max={item.treatment === 'cutout' ? 1.8 : 2.6}
                                                            step={0.02}
                                                            onChange={(v) => update(item.id, { scale: v })}
                                                        />
                                                        <Slider
                                                            label="上下微调"
                                                            value={item.offsetY}
                                                            min={-200}
                                                            max={200}
                                                            step={2}
                                                            unit="px"
                                                            onChange={(v) => update(item.id, { offsetY: v })}
                                                        />
                                                        <Slider
                                                            label={item.treatment === 'cutout' ? '左右位置' : '横向焦点'}
                                                            value={item.focal}
                                                            min={0}
                                                            max={100}
                                                            onChange={(v) => update(item.id, { focal: v })}
                                                        />
                                                        {item.treatment === 'cutout' && (
                                                            <Toggle
                                                                label={keying === item.id ? '正在抠图…' : '去掉纯色底'}
                                                                value={item.keyed}
                                                                onChange={() => void toggleKey(item)}
                                                                hint="只适合纯色 / 近白底的图（AI 出图常见）。背景复杂会抠不干净，那种情况请改用「画框」。"
                                                            />
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                                {items.length > 1 && <p className="text-[10px] text-zinc-400">拖动可排序；★ 决定谁居中放大。</p>}
                            </Section>
                        )}

                        {tab === 'layout' && (
                            <Section kicker="Layout" title="版式">
                                <Slider label="主角大小" value={cfg.mainScale} min={0.9} max={1.9} step={0.01} onChange={(v) => patch({ mainScale: v })} />
                                <Slider label="两翼缩小" value={cfg.shrink} min={0} max={0.32} step={0.01} onChange={(v) => patch({ shrink: v })} />
                                <Slider label="槽位间距" value={cfg.slotSpacing} min={0.5} max={1.3} step={0.01} onChange={(v) => patch({ slotSpacing: v })} />
                                <Slider label="两翼抬高" value={cfg.rise} min={0} max={80} step={1} unit="px" onChange={(v) => patch({ rise: v })} />
                                <Pills
                                    label="纵向对齐"
                                    value={cfg.align}
                                    options={[
                                        { id: 'baseline' as const, label: '踩同一条底线' },
                                        { id: 'center' as const, label: '整体垂直居中' },
                                    ]}
                                    columns={2}
                                    onChange={(v) => patch({ align: v })}
                                />
                            </Section>
                        )}

                        {tab === 'text' && (
                            <Section kicker="Type" title="文字">
                                <TextField label="大标题" value={cfg.title} onChange={(v) => patch({ title: v })} />
                                <TextField label="副标题" value={cfg.subtitle} onChange={(v) => patch({ subtitle: v })} />
                                <TextField label="顶部小标" value={cfg.badge} onChange={(v) => patch({ badge: v })} />
                                <TextField label="左下系列行" value={cfg.series} onChange={(v) => patch({ series: v })} />
                                <TextField label="右下页脚" value={cfg.footer} onChange={(v) => patch({ footer: v })} />
                                <p className="text-[10px] leading-4 text-zinc-400">
                                    占位符：<code className="rounded bg-zinc-100 px-1">{'{n}'}</code> → 人数，
                                    <code className="rounded bg-zinc-100 px-1">{'{date}'}</code> → 年月。
                                </p>
                                <button
                                    type="button"
                                    onClick={() => patch({ ...DEFAULT_TEXT })}
                                    className="w-full rounded-lg border border-black/[0.07] bg-white/70 px-3 py-1.5 text-[11px] text-zinc-500 transition hover:text-zinc-900"
                                >
                                    恢复默认文案
                                </button>
                            </Section>
                        )}

                        {tab === 'tone' && (
                            <Section kicker="Tone" title="配色">
                                <div className="grid grid-cols-2 gap-1.5">
                                    {TONES.map((t) => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => applyTone(t.id)}
                                            className={`rounded-lg border px-2 py-2 text-left text-[11px] transition ${
                                                tone === t.id ? 'border-zinc-950' : 'border-black/[0.07] hover:border-black/20'
                                            }`}
                                        >
                                            <span className="flex items-center gap-1.5">
                                                <span className="flex h-3.5 w-3.5 overflow-hidden rounded-full border border-black/10">
                                                    <span className="h-full w-1/2" style={{ background: t.colors.paper }} />
                                                    <span className="h-full w-1/2" style={{ background: t.colors.accent }} />
                                                </span>
                                                <span className="text-zinc-700">{t.label}</span>
                                            </span>
                                        </button>
                                    ))}
                                </div>
                                <ColorField label="底纸" value={cfg.paper} onChange={(v) => patch({ paper: v })} />
                                <ColorField label="次底" value={cfg.paperAlt} onChange={(v) => patch({ paperAlt: v })} />
                                <ColorField label="墨色" value={cfg.ink} onChange={(v) => patch({ ink: v })} />
                                <ColorField label="弱化" value={cfg.muted} onChange={(v) => patch({ muted: v })} />
                                <ColorField label="强调" value={cfg.accent} onChange={(v) => patch({ accent: v })} />
                                <ColorField label="细线" value={cfg.line} onChange={(v) => patch({ line: v })} />
                                <button
                                    type="button"
                                    onClick={() => patch({ paperAlt: mixHex(cfg.paper, cfg.accent, 0.14) })}
                                    className="w-full rounded-lg border border-black/[0.07] bg-white/70 px-3 py-1.5 text-[11px] text-zinc-500 transition hover:text-zinc-900"
                                >
                                    次底 = 底纸掺一点强调色
                                </button>
                            </Section>
                        )}

                        {tab === 'motion' && (
                            <>
                                <Section kicker="Preset" title="动效预设">
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {MOTION_PRESETS.map((p) => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => applyMotionPreset(p.id)}
                                                className="rounded-lg border border-black/[0.07] bg-white/70 px-2 py-2 text-left transition hover:border-violet-300"
                                            >
                                                <div className="text-[11px] font-medium text-zinc-700">{p.label}</div>
                                                <div className="mt-0.5 text-[10px] leading-4 text-zinc-400">{p.hint}</div>
                                            </button>
                                        ))}
                                    </div>
                                </Section>

                                <Section kicker="Intro" title="入场">
                                    <Toggle label="启用入场" value={motion.introOn} onChange={(v) => patchMotion({ introOn: v })} />
                                    <Pills
                                        label="位移方式"
                                        value={motion.introStyle}
                                        options={[
                                            { id: 'rise' as const, label: '上浮' },
                                            { id: 'zoom' as const, label: '放大' },
                                            { id: 'slide' as const, label: '横滑' },
                                        ]}
                                        onChange={(v) => patchMotion({ introStyle: v })}
                                    />
                                    <Pills
                                        label="出场顺序"
                                        value={motion.introOrder}
                                        options={[
                                            { id: 'hero' as const, label: '主角先' },
                                            { id: 'outer' as const, label: '由外向内' },
                                            { id: 'left' as const, label: '从左到右' },
                                        ]}
                                        onChange={(v) => patchMotion({ introOrder: v })}
                                    />
                                    <Slider label="单人时长" value={motion.introDuration} min={0.3} max={3} step={0.05} unit="s" onChange={(v) => patchMotion({ introDuration: v })} />
                                    <Slider label="错峰间隔" value={motion.introStagger} min={0} max={0.3} step={0.01} unit="s" onChange={(v) => patchMotion({ introStagger: v })} />
                                    <Slider label="标题延迟" value={motion.titleLag} min={0} max={1} step={0.05} unit="s" onChange={(v) => patchMotion({ titleLag: v })} />
                                    <Pills
                                        label="缓动"
                                        value={motion.introEase}
                                        options={EASINGS.map((e) => ({ id: e.id, label: e.label }))}
                                        columns={3}
                                        onChange={(v) => patchMotion({ introEase: v })}
                                    />
                                    <Toggle label="入场循环播放" value={motion.loopIntro} onChange={(v) => patchMotion({ loopIntro: v })} />
                                </Section>

                                <Section kicker="Idle" title="常态微动">
                                    <Toggle label="呼吸" value={motion.breathe} onChange={(v) => patchMotion({ breathe: v })} />
                                    {motion.breathe && (
                                        <Slider label="呼吸幅度" value={motion.breatheAmount} min={0} max={1} step={0.02} onChange={(v) => patchMotion({ breatheAmount: v })} />
                                    )}
                                    <Toggle label="漂浮" value={motion.float} onChange={(v) => patchMotion({ float: v })} />
                                    {motion.float && (
                                        <Slider label="漂浮幅度" value={motion.floatAmount} min={0} max={1} step={0.02} onChange={(v) => patchMotion({ floatAmount: v })} />
                                    )}
                                    <Toggle label="主角光晕" value={motion.heroGlow} onChange={(v) => patchMotion({ heroGlow: v })} />
                                    {motion.heroGlow && (
                                        <Slider label="光晕强度" value={motion.heroGlowAmount} min={0} max={1} step={0.02} onChange={(v) => patchMotion({ heroGlowAmount: v })} />
                                    )}
                                    <Toggle label="画面扫光" value={motion.sweep} onChange={(v) => patchMotion({ sweep: v })} />
                                    {motion.sweep && (
                                        <Slider label="扫光间隔" value={motion.sweepPeriod} min={2} max={14} step={0.5} unit="s" onChange={(v) => patchMotion({ sweepPeriod: v })} />
                                    )}
                                    <Toggle label="飘落物" value={motion.petals} onChange={(v) => patchMotion({ petals: v })} />
                                    {motion.petals && (
                                        <>
                                            <Pills
                                                label="形状"
                                                value={motion.petalShape}
                                                options={FALL_SHAPES.map((f) => ({ id: f.id, label: f.label }))}
                                                columns={3}
                                                onChange={(v) => patchMotion({ petalShape: v })}
                                            />
                                            <Slider label="数量" value={motion.petalCount} min={4} max={48} step={1} onChange={(v) => patchMotion({ petalCount: v })} />
                                            <Slider label="飘落速度" value={motion.petalSpeed} min={0.3} max={3} step={0.05} onChange={(v) => patchMotion({ petalSpeed: v })} />
                                            <ColorField label="主色" value={motion.petalColor} onChange={(v) => patchMotion({ petalColor: v })} />
                                            <ColorField label="副色" value={motion.petalColor2} onChange={(v) => patchMotion({ petalColor2: v })} />
                                            <p className="text-[10px] leading-4 text-zinc-400">两颗颜色按下标确定性交替，所以同一颗每次都是同一色，导出的动图也一致。</p>
                                        </>
                                    )}
                                    <Toggle label="浮尘" value={motion.dust} onChange={(v) => patchMotion({ dust: v })} />
                                    {motion.dust && (
                                        <Slider label="浮尘数量" value={motion.dustCount} min={6} max={70} step={1} onChange={(v) => patchMotion({ dustCount: v })} />
                                    )}
                                    <Toggle label="轨道缓转" value={motion.orbitSpin} onChange={(v) => patchMotion({ orbitSpin: v })} />
                                    {motion.orbitSpin && (
                                        <Slider label="轨道周期" value={motion.orbitPeriod} min={20} max={200} step={5} unit="s" onChange={(v) => patchMotion({ orbitPeriod: v })} />
                                    )}
                                </Section>

                                <Section kicker="Texture" title="质感">
                                    <Toggle
                                        label="双色调叠加"
                                        value={motion.duotone}
                                        onChange={(v) => patchMotion({ duotone: v })}
                                        hint="给「画框」图叠一层强调色，多张图放在一起更统一。立绘是透明底，叠上去会糊成一块矩形，所以不叠。"
                                    />
                                    {motion.duotone && (
                                        <Slider label="叠加强度" value={motion.duotoneAmount} min={0} max={1} step={0.02} onChange={(v) => patchMotion({ duotoneAmount: v })} />
                                    )}
                                    <Toggle label="颗粒质感" value={motion.grain} onChange={(v) => patchMotion({ grain: v })} />
                                    {motion.grain && (
                                        <Slider label="颗粒强度" value={motion.grainAmount} min={0} max={1} step={0.02} onChange={(v) => patchMotion({ grainAmount: v })} />
                                    )}
                                </Section>

                                <Section kicker="Video" title="动图导出">
                                    <Pills
                                        label="时长（含入场）"
                                        value={String(videoSeconds)}
                                        options={[
                                            { id: '2', label: '2 秒' },
                                            { id: '3', label: '3 秒' },
                                            { id: '5', label: '5 秒' },
                                        ]}
                                        onChange={(v) => setVideoSeconds(Number(v))}
                                    />
                                    <Pills
                                        label="分辨率"
                                        value={videoSize}
                                        options={[
                                            { id: '540' as const, label: '540p 快' },
                                            { id: '720' as const, label: '720p' },
                                            { id: '1080' as const, label: '1080p 慢' },
                                        ]}
                                        columns={3}
                                        onChange={(v) => setVideoSize(v)}
                                    />
                                    <Toggle label="包含入场动画" value={videoIntro} onChange={setVideoIntro} />
                                    <button
                                        type="button"
                                        onClick={() => void exportWebm()}
                                        disabled={videoBusy || items.length === 0}
                                        className="w-full rounded-lg bg-zinc-950 px-3 py-2 text-[11px] font-medium text-white transition enabled:hover:bg-zinc-800 disabled:opacity-40"
                                    >
                                        {videoBusy ? '录制中…' : `生成 ${videoSeconds}s 动图`}
                                    </button>
                                    {videoBusy && (
                                        <div className="space-y-1.5">
                                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
                                                <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${Math.round(videoPct * 100)}%` }} />
                                            </div>
                                            <div className="flex items-center justify-between text-[10px] text-zinc-400">
                                                <span>{videoPhase === 'render' ? '渲染帧…' : '编码中…'}</span>
                                                <span>{Math.round(videoPct * 100)}%</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    cancelVideoRef.current = true
                                                }}
                                                className="w-full rounded-lg border border-black/[0.07] px-2 py-1.5 text-[10px] text-zinc-500 transition hover:text-rose-500"
                                            >
                                                取消
                                            </button>
                                        </div>
                                    )}
                                    <p className="flex items-start gap-1.5 text-[10px] leading-4 text-zinc-400">
                                        <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" />
                                        <span>
                                            逐帧渲染，共 {frameTotal} 帧（{videoWidth}×
                                            {Math.round((videoWidth * POSTER_H) / POSTER_W)}），
                                            <b className="font-medium text-zinc-500">约 {estSeconds} 秒</b>。分辨率越高越慢，赶时间就选 540p。
                                            录成 webm：Chrome / Edge / 安卓能播，
                                            <b className="font-medium text-zinc-500">Safari 与微信里播不了</b>（那些场景请用 PNG 或录屏）。
                                        </span>
                                    </p>
                                </Section>
                            </>
                        )}

                        {tab === 'decor' && (
                            <Section kicker="Decor" title="装饰">
                                <Toggle label="细网格" value={cfg.showGrid} onChange={(v) => patch({ showGrid: v })} />
                                <Toggle label="点阵" value={cfg.showDots} onChange={(v) => patch({ showDots: v })} />
                                <Toggle label="条码条" value={cfg.showBarcode} onChange={(v) => patch({ showBarcode: v })} />
                                <Toggle label="四角刻度" value={cfg.showCorners} onChange={(v) => patch({ showCorners: v })} />
                                <Toggle label="轨道椭圆" value={cfg.showOrbit} onChange={(v) => patch({ showOrbit: v })} />
                                <Toggle label="暗角" value={cfg.vignette} onChange={(v) => patch({ vignette: v })} />
                                <Toggle label="落地投影" value={cfg.groundShadow} onChange={(v) => patch({ groundShadow: v })} />
                                <Toggle label="角色名条" value={cfg.showLabels} onChange={(v) => patch({ showLabels: v })} />
                                <button
                                    type="button"
                                    onClick={() => void copyConfig()}
                                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-black/[0.07] bg-white/70 px-3 py-2 text-[11px] text-zinc-500 transition hover:text-zinc-900"
                                >
                                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                                    {copied ? '已复制版式配置' : '复制版式配置（JSON）'}
                                </button>
                                <p className="text-[10px] leading-4 text-zinc-400">
                                    图片不随配置保存（浏览器不允许把本地图存进 storage），换设备请重新传图。
                                </p>
                            </Section>
                        )}
                    </aside>
                </div>

                <div className="mt-8">
                    <FooterNote />
                </div>
            </div>

            {/* 全屏时的关闭提示条（点任意处也能退） */}
            {fullscreen && <button type="button" className="sr-only" onClick={() => setFullscreen(false)} aria-label="退出全屏" />}
        </div>
    )
}

/** 导出结束后把进度条放回该在的位置 */
function t0Safe(includeIntro: boolean, end: number) {
    return includeIntro ? 0 : end
}
