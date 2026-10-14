'use client'

/*
 * SVG 航线动画 —— 在画布上按住小飞机拖出一条虚线航线，飞机沿航线飞、虚线同步铺开，
 * 拖锚点微调，最后导出**自包含的 SMIL 动画 SVG**（零 JS，直接嵌网页就会动）。
 *
 * 三条贯穿全篇的原则：
 *   ① 播放不触发 React 渲染：进度放 ref，每帧只写 DOM（见 components/FlightCanvas.tsx）；
 *   ② 预览与导出同源：时间轴只描述一次（scene.ts），几何只算一次（geometry.ts），
 *      导出不是"另做一遍"，而是把同一份结果格式化成 SMIL；
 *   ③ 手绘必抽稀：RDP 之后曲线才不抖，锚点数也才点得过来。
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'
import { Check, Copy, Download, Pause, Play, Redo2, RotateCcw, Trash2, Undo2 } from 'lucide-react'
import FlightCanvas, { type CanvasMode, type FlightCanvasHandle } from './components/FlightCanvas'
import { buildHtml, buildPathD, buildReact, buildSvg } from './exportSvg'
import { buildTrack, EASINGS, RATIOS, ratioById, rescale, type Pt } from './geometry'
import { GLYPHS } from './glyphs'
import { PRESETS } from './presets'
import {
    buildSegments,
    CANVAS_BGS,
    cycleLength,
    DEFAULT_PARAMS,
    displaySpeed,
    LOOP_MODES,
    travelSeconds,
    type LoopMode,
    type SceneParams,
} from './scene'

/** 画布高度上限：按比例反算容器最大宽度，保证容器宽高比与 viewBox 完全一致
    （只有这样 getBoundingClientRect 的线性换算才是精确的坐标映射） */
const MAX_CANVAS_H = 520

const LINE_SWATCHES = ['#7dd3fc', '#5eead4', '#fcd34d', '#fda4af', '#c4b5fd', '#e8f6ff']
const GLYPH_SWATCHES = ['#e8f6ff', '#7dd3fc', '#fcd34d', '#fda4af', '#a7f3d0', '#ffffff']

type OutputTab = 'svg' | 'html' | 'react' | 'd'

const TABS: Array<{ id: OutputTab; label: string }> = [
    { id: 'svg', label: 'SVG' },
    { id: 'html', label: 'HTML' },
    { id: 'react', label: 'React' },
    { id: 'd', label: 'path d' },
]

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

/* ── 本地控件（站点惯例：控件就地手写，不抽公共库） ── */

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
                        onChange={(e) => onChange(clamp(Number(e.target.value), min, max))}
                        className="w-12 bg-transparent text-right font-mono text-[11px] text-zinc-600 outline-none"
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

function ColorRow({
    label,
    value,
    swatches,
    onChange,
}: {
    label: string
    value: string
    swatches: string[]
    onChange: (v: string) => void
}) {
    return (
        <div>
            <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-400">{label}</span>
                <span className="font-mono text-[11px] text-zinc-500">{value.toUpperCase()}</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
                {swatches.map((c) => (
                    <button
                        key={c}
                        type="button"
                        aria-label={`使用颜色 ${c}`}
                        onClick={() => onChange(c)}
                        style={{ background: c }}
                        className={`h-6 w-6 rounded-full border transition ${
                            value.toLowerCase() === c.toLowerCase() ? 'border-zinc-900 ring-2 ring-zinc-900/20' : 'border-black/10'
                        }`}
                    />
                ))}
                <label className="relative h-6 w-6 cursor-pointer overflow-hidden rounded-full border border-black/10">
                    <input
                        type="color"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="absolute -left-1.5 -top-1.5 h-10 w-10 cursor-pointer"
                        aria-label={label}
                    />
                </label>
            </div>
        </div>
    )
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
    return (
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
    )
}

function SectionCard({ kicker, title, children }: { kicker: string; title: string; children: ReactNode }) {
    return (
        <section className="rounded-[24px] border border-black/[0.055] bg-white/82 p-4 shadow-[0_24px_70px_-58px_rgba(67,56,202,.28)] backdrop-blur-xl">
            <div className="text-[9px] uppercase tracking-[0.17em] text-zinc-300">{kicker}</div>
            <h3 className="mt-1 text-sm font-semibold text-zinc-800">{title}</h3>
            <div className="mt-3 space-y-3.5">{children}</div>
        </section>
    )
}

function downloadText(name: string, text: string) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
}

/* ── 页面 ── */

export default function FlightPathPage() {
    const [params, setParams] = useState<SceneParams>(DEFAULT_PARAMS)
    const [anchors, setAnchors] = useState<Pt[]>([])
    const [mode, setMode] = useState<CanvasMode>('draw')
    const [selected, setSelected] = useState<number | null>(null)
    const [playing, setPlaying] = useState(false)
    const [tab, setTab] = useState<OutputTab>('svg')
    const [copied, setCopied] = useState('')
    const [reduceMotion, setReduceMotion] = useState(false)

    const [past, setPast] = useState<Pt[][]>([])
    const [future, setFuture] = useState<Pt[][]>([])

    const canvasRef = useRef<FlightCanvasHandle>(null)
    const scrubRef = useRef<HTMLInputElement>(null)
    const pctRef = useRef<HTMLSpanElement>(null)
    const scrubDragRef = useRef(false)
    const resumeRef = useRef(false)

    const ratio = useMemo(() => ratioById(params.ratio), [params.ratio])
    const track = useMemo(() => buildTrack(anchors, params.tension), [anchors, params.tension])
    const cycle = useMemo(() => cycleLength(buildSegments(params, travelSeconds(params, track))), [params, track])

    const exportInput = useMemo(
        () => ({ anchors, params, track, ratio: { w: ratio.w, h: ratio.h }, title: '航线动画' }),
        [anchors, params, track, ratio.h, ratio.w],
    )
    const code = useMemo(() => {
        if (tab === 'svg') return buildSvg(exportInput)
        if (tab === 'html') return buildHtml(exportInput)
        if (tab === 'react') return buildReact(exportInput)
        return buildPathD(exportInput)
    }, [tab, exportInput])

    /* 尊重系统"减少动态效果"：不自动播放 */
    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
        const sync = () => setReduceMotion(mq.matches)
        sync()
        mq.addEventListener('change', sync)
        return () => mq.removeEventListener('change', sync)
    }, [])

    const patch = useCallback((p: Partial<SceneParams>) => setParams((prev) => ({ ...prev, ...p })), [])

    /* ── 历史 ── */
    const pushHistory = useCallback(() => {
        setPast((p) => [...p.slice(-49), anchors])
        setFuture([])
    }, [anchors])

    const undo = useCallback(() => {
        if (past.length === 0) return
        setPast(past.slice(0, -1))
        setFuture([anchors, ...future])
        setAnchors(past[past.length - 1])
        setSelected(null)
    }, [anchors, future, past])

    const redo = useCallback(() => {
        if (future.length === 0) return
        setFuture(future.slice(1))
        setPast([...past, anchors])
        setAnchors(future[0])
        setSelected(null)
    }, [anchors, future, past])

    /* ── 画布回调 ── */
    const onFrame = useCallback((progress: number, cyclePos: number, total: number) => {
        // 只写 DOM：这两个 readout 每帧都在变，绝不能变成 setState
        if (!scrubDragRef.current && scrubRef.current) scrubRef.current.value = String((cyclePos / total) * 1000)
        if (pctRef.current) pctRef.current.textContent = `${Math.round(progress * 100)}%`
    }, [])

    const play = useCallback(() => {
        canvasRef.current?.play()
        setPlaying(true)
    }, [])

    const restart = useCallback(() => {
        canvasRef.current?.restart()
        setPlaying(true)
    }, [])

    const onDrawEnd = useCallback(
        (next: Pt[]) => {
            pushHistory()
            setAnchors(next)
            setSelected(null)
            canvasRef.current?.restart()
            if (!reduceMotion) setPlaying(true)
        },
        [pushHistory, reduceMotion],
    )

    const onAnchorMove = useCallback((index: number, p: Pt) => {
        setAnchors((a) => {
            const next = a.slice()
            next[index] = p
            return next
        })
    }, [])

    const onInsert = useCallback(
        (afterIndex: number, p: Pt) => {
            pushHistory()
            setAnchors((a) => {
                const next = a.slice()
                next.splice(afterIndex + 1, 0, p)
                return next
            })
        },
        [pushHistory],
    )

    const onTranslate = useCallback((dx: number, dy: number, origin: Pt[]) => {
        setAnchors(origin.map((p) => ({ x: p.x + dx, y: p.y + dy })))
    }, [])

    /* ── 操作 ── */
    const applyPreset = useCallback(
        (presetId: string) => {
            const preset = PRESETS.find((p) => p.id === presetId)
            if (!preset) return
            pushHistory()
            const to = ratioById(params.ratio)
            setAnchors(rescale(preset.anchors, { w: 960, h: 540 }, { w: to.w, h: to.h }))
            setParams((prev) => ({ ...prev, ...preset.params }))
            setSelected(null)
            setPlaying(false)
            canvasRef.current?.restart()
            if (preset.anchors.length > 0 && !reduceMotion) window.setTimeout(() => setPlaying(true), 60)
        },
        [params.ratio, pushHistory, reduceMotion],
    )

    const changeRatio = useCallback(
        (id: string) => {
            const from = ratioById(params.ratio)
            const to = ratioById(id)
            if (from.id === to.id) return
            pushHistory()
            setAnchors((a) => rescale(a, { w: from.w, h: from.h }, { w: to.w, h: to.h }))
            setParams((p) => ({ ...p, ratio: to.id }))
        },
        [params.ratio, pushHistory],
    )

    const deleteSelected = useCallback(() => {
        if (selected === null) return
        pushHistory()
        setAnchors((a) => a.filter((_, i) => i !== selected))
        setSelected(null)
    }, [pushHistory, selected])

    const clearAll = useCallback(() => {
        pushHistory()
        setAnchors([])
        setSelected(null)
        setPlaying(false)
    }, [pushHistory])

    const copy = useCallback(async (text: string, key: string) => {
        await navigator.clipboard.writeText(text)
        setCopied(key)
        window.setTimeout(() => setCopied(''), 1500)
    }, [])

    /* ── 快捷键 ── */
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const el = e.target as HTMLElement | null
            if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
            if (e.code === 'KeyZ' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                if (e.shiftKey) redo()
                else undo()
                return
            }
            if (e.code === 'Space') {
                e.preventDefault()
                if (playing) setPlaying(false)
                else play()
                return
            }
            if (e.code === 'KeyR') {
                e.preventDefault()
                restart()
                return
            }
            if (e.code === 'Delete' || e.code === 'Backspace') {
                if (selected !== null) {
                    e.preventDefault()
                    deleteSelected()
                }
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [deleteSelected, playing, play, redo, restart, selected, undo])

    const boxW = Math.min(1040, MAX_CANVAS_H * (ratio.w / ratio.h))
    const speed = displaySpeed(params, track)
    const modeHint =
        mode === 'draw'
            ? '按住小飞机拖动 = 画一条新航线（会替换原来的）'
            : '拖锚点改形 · 点航线插点 · 拖飞机整体平移 · 选中后按 Delete 删点'

    return (
        <div className="relative min-h-screen bg-[#f7f7fa] text-zinc-950">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_7%_5%,rgba(237,233,254,.62),transparent_24%),radial-gradient(circle_at_93%_8%,rgba(224,242,254,.58),transparent_25%),radial-gradient(circle_at_50%_78%,rgba(253,242,248,.42),transparent_34%)]" />

            <div className="relative mx-auto w-full max-w-[1600px] px-4 pb-12 pt-6 sm:px-6 lg:px-8">
                <Breadcrumb />

                <header className="mt-2 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <div className="text-[10px] uppercase tracking-[0.18em] text-violet-400">Flight Path</div>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">SVG 航线动画</h1>
                        <p className="mt-2 max-w-2xl text-[13px] leading-6 text-zinc-500">
                            按住小飞机拖出一条虚线航线，飞机沿航线飞、虚线同步铺开；拖锚点微调，导出<b className="font-medium text-zinc-700">自带动画的 SVG</b>
                            —— 纯 SMIL，零脚本，直接嵌进网页或用浏览器打开就会动。（设计软件与 PPT 只能当静态图导入）
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={playing ? () => setPlaying(false) : play}
                            className="flex items-center gap-1.5 rounded-full bg-zinc-950 px-4 py-2 text-[12px] font-medium text-white transition hover:bg-zinc-800"
                        >
                            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                            {playing ? '暂停' : '播放'}
                        </button>
                        <button
                            type="button"
                            onClick={restart}
                            className="flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white/80 px-3.5 py-2 text-[12px] text-zinc-600 transition hover:border-black/20 hover:text-zinc-900"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            重播
                        </button>
                    </div>
                </header>

                <div className="mt-6 grid gap-5 xl:grid-cols-[232px_minmax(0,1fr)_360px]">
                    {/* ── 左：预设 ── */}
                    <aside className="rounded-[24px] border border-black/[0.055] bg-white/78 p-2.5 backdrop-blur-xl xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:self-start xl:overflow-y-auto">
                        <div className="px-2 pb-2 pt-1 text-[9px] uppercase tracking-[0.17em] text-zinc-300">预设航线</div>
                        <div className="space-y-1.5">
                            {PRESETS.map((p) => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => applyPreset(p.id)}
                                    className="w-full rounded-xl border border-transparent px-3 py-2 text-left transition hover:border-black/[0.07] hover:bg-white"
                                >
                                    <div className="text-[12px] font-medium text-zinc-800">{p.label}</div>
                                    <div className="mt-0.5 text-[11px] leading-4 text-zinc-400">{p.hint}</div>
                                </button>
                            ))}
                        </div>
                    </aside>

                    {/* ── 中：画布 + 输出 ── */}
                    <main className="min-w-0 space-y-5">
                        <section className="rounded-[28px] border border-black/[0.055] bg-white/82 p-4 shadow-[0_28px_90px_-66px_rgba(67,56,202,.24)] backdrop-blur-xl sm:p-5">
                            {/* 工具条 */}
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-0.5 rounded-full border border-black/[0.07] bg-white/70 p-0.5">
                                    {(['draw', 'edit'] as CanvasMode[]).map((m) => (
                                        <button
                                            key={m}
                                            type="button"
                                            onClick={() => {
                                                setMode(m)
                                                setSelected(null)
                                            }}
                                            className={`rounded-full px-3 py-1.5 text-[11px] transition ${
                                                mode === m ? 'bg-zinc-950 text-white' : 'text-zinc-500 hover:text-zinc-900'
                                            }`}
                                        >
                                            {m === 'draw' ? '画线' : '调节'}
                                        </button>
                                    ))}
                                </div>

                                <div className="mx-1 h-5 w-px bg-black/[0.08]" />

                                <button
                                    type="button"
                                    onClick={undo}
                                    disabled={past.length === 0}
                                    title="撤销 (Ctrl+Z)"
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/[0.07] bg-white/70 text-zinc-500 transition enabled:hover:text-zinc-900 disabled:opacity-35"
                                >
                                    <Undo2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={redo}
                                    disabled={future.length === 0}
                                    title="重做 (Ctrl+Shift+Z)"
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/[0.07] bg-white/70 text-zinc-500 transition enabled:hover:text-zinc-900 disabled:opacity-35"
                                >
                                    <Redo2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={deleteSelected}
                                    disabled={selected === null}
                                    title="删除选中的锚点 (Delete)"
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/[0.07] bg-white/70 text-zinc-500 transition enabled:hover:text-rose-600 disabled:opacity-35"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>

                                <div className="ml-auto flex items-center gap-3 font-mono text-[11px] text-zinc-400">
                                    <span>{anchors.length} 点</span>
                                    <span>{track.total.toFixed(0)} px</span>
                                    <span>{speed.toFixed(0)} px/s</span>
                                    <span className="text-zinc-600">
                                        <span ref={pctRef}>0%</span>
                                    </span>
                                </div>
                            </div>

                            {/* 画布 */}
                            <div className="mt-4 flex justify-center">
                                <div style={{ width: '100%', maxWidth: boxW }}>
                                    <div
                                        className="relative w-full overflow-hidden rounded-[22px] border border-black/[0.06]"
                                        style={{ aspectRatio: `${ratio.w} / ${ratio.h}` }}
                                    >
                                        <FlightCanvas
                                            ref={canvasRef}
                                            anchors={anchors}
                                            params={params}
                                            ratio={{ w: ratio.w, h: ratio.h }}
                                            track={track}
                                            mode={mode}
                                            playing={playing}
                                            selected={selected}
                                            onDrawEnd={onDrawEnd}
                                            onAnchorMove={onAnchorMove}
                                            onInsert={onInsert}
                                            onSelect={setSelected}
                                            onTranslate={onTranslate}
                                            onEnded={() => setPlaying(false)}
                                            onFrame={onFrame}
                                            onEditBegin={pushHistory}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 进度条 */}
                            <div className="mt-4 flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={playing ? () => setPlaying(false) : play}
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-white transition hover:bg-zinc-800"
                                    aria-label={playing ? '暂停' : '播放'}
                                >
                                    {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="ml-0.5 h-3.5 w-3.5" />}
                                </button>
                                <input
                                    ref={scrubRef}
                                    type="range"
                                    min={0}
                                    max={1000}
                                    defaultValue={0}
                                    aria-label="播放进度"
                                    className="h-1.5 w-full cursor-pointer accent-violet-500"
                                    onPointerDown={() => {
                                        scrubDragRef.current = true
                                        resumeRef.current = playing
                                        setPlaying(false)
                                    }}
                                    onPointerUp={() => {
                                        scrubDragRef.current = false
                                        if (resumeRef.current) setPlaying(true)
                                    }}
                                    onPointerCancel={() => {
                                        scrubDragRef.current = false
                                    }}
                                    onChange={(e) => {
                                        canvasRef.current?.seek((Number(e.target.value) / 1000) * cycle)
                                    }}
                                />
                                <span className="shrink-0 font-mono text-[11px] text-zinc-400">{cycle.toFixed(1)}s</span>
                            </div>

                            <p className="mt-3 text-[11px] leading-5 text-zinc-400">{modeHint}</p>
                        </section>

                        {/* ── 输出 ── */}
                        <section className="overflow-hidden rounded-[24px] border border-black/[0.055] bg-[#111113] shadow-[0_26px_70px_-54px_rgba(0,0,0,.42)]">
                            <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.07] px-4 py-2.5">
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                                    <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                                    <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                                </div>
                                <div className="ml-2 flex items-center gap-0.5 rounded-full bg-white/[0.06] p-0.5">
                                    {TABS.map((t) => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => setTab(t.id)}
                                            className={`rounded-full px-2.5 py-1 font-mono text-[10px] transition ${
                                                tab === t.id ? 'bg-white/90 text-zinc-900' : 'text-white/50 hover:text-white/90'
                                            }`}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="ml-auto flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => copy(code, 'code')}
                                        className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] text-white/45 transition hover:bg-white/[0.06] hover:text-white"
                                    >
                                        {copied === 'code' ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                                        {copied === 'code' ? '已复制' : '复制'}
                                    </button>
                                    {(tab === 'svg' || tab === 'html') && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                downloadText(tab === 'svg' ? 'flight-path.svg' : 'flight-path.html', code)
                                            }
                                            className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] text-white/45 transition hover:bg-white/[0.06] hover:text-white"
                                        >
                                            <Download className="h-3.5 w-3.5" />
                                            下载
                                        </button>
                                    )}
                                </div>
                            </div>
                            <pre className="max-h-[320px] overflow-auto p-4 font-mono text-[11px] leading-6 text-emerald-300">
                                <code>{code}</code>
                            </pre>
                        </section>
                    </main>

                    {/* ── 右：检查器 ── */}
                    <aside className="space-y-5 xl:sticky xl:top-20 xl:self-start">
                        <SectionCard kicker="Route" title="航线">
                            <ColorRow label="航线颜色" value={params.lineColor} swatches={LINE_SWATCHES} onChange={(v) => patch({ lineColor: v })} />
                            <Slider label="线宽" value={params.lineWidth} min={0.5} max={8} step={0.1} onChange={(v) => patch({ lineWidth: v })} />
                            <Slider label="虚线段长" value={params.dash} min={1} max={30} step={0.5} onChange={(v) => patch({ dash: v })} />
                            <Slider label="虚线间隔" value={params.gap} min={1} max={30} step={0.5} onChange={(v) => patch({ gap: v })} />
                            <Slider label="曲线张力" value={params.tension} min={0} max={1} step={0.05} onChange={(v) => patch({ tension: v })} />
                            <Toggle label="发光描边" value={params.glow} onChange={(v) => patch({ glow: v })} />
                        </SectionCard>

                        <SectionCard kicker="Flight" title="飞行">
                            <Pills
                                label="时长 / 速度"
                                value={params.bySpeed ? 'speed' : 'time'}
                                options={[
                                    { id: 'time', label: '按时长' },
                                    { id: 'speed', label: '按速度' },
                                ]}
                                columns={2}
                                onChange={(v) => patch({ bySpeed: v === 'speed' })}
                            />
                            {params.bySpeed ? (
                                <Slider label="速度" value={params.speed} min={40} max={900} step={10} unit="px/s" onChange={(v) => patch({ speed: v })} />
                            ) : (
                                <Slider label="时长" value={params.duration} min={0.5} max={20} step={0.1} unit="s" onChange={(v) => patch({ duration: v })} />
                            )}
                            <Pills
                                label="缓动"
                                value={params.easing}
                                options={EASINGS.map((e) => ({ id: e.id, label: e.label }))}
                                columns={3}
                                onChange={(v) => patch({ easing: v })}
                            />
                            <Pills
                                label="循环"
                                value={params.loop}
                                options={LOOP_MODES as ReadonlyArray<{ id: LoopMode; label: string }>}
                                columns={3}
                                onChange={(v) => patch({ loop: v })}
                            />
                            {params.loop !== 'once' && (
                                <Slider label="每轮停留" value={params.dwell} min={0} max={4} step={0.05} unit="s" onChange={(v) => patch({ dwell: v })} />
                            )}
                        </SectionCard>

                        <SectionCard kicker="Craft" title="飞行器">
                            <Pills label="图形" value={params.glyph} options={GLYPHS.map((g) => ({ id: g.id, label: g.label }))} columns={3} onChange={(v) => patch({ glyph: v })} />
                            <Slider label="大小" value={params.size} min={10} max={70} step={1} onChange={(v) => patch({ size: v })} />
                            <ColorRow label="颜色" value={params.glyphColor} swatches={GLYPH_SWATCHES} onChange={(v) => patch({ glyphColor: v })} />
                            <Toggle label="跟随航线朝向" value={params.follow} onChange={(v) => patch({ follow: v })} />
                            {params.follow && (
                                <Slider label="朝向偏移" value={params.rotateOffset} min={-180} max={180} step={1} unit="°" onChange={(v) => patch({ rotateOffset: v })} />
                            )}
                        </SectionCard>

                        <SectionCard kicker="Canvas" title="画布">
                            <Pills
                                label="画幅比例"
                                value={params.ratio}
                                options={RATIOS.map((r) => ({ id: r.id, label: r.label }))}
                                columns={4}
                                onChange={changeRatio}
                            />
                            <ColorRow label="画布底色" value={params.bg} swatches={CANVAS_BGS.map((b) => b.value)} onChange={(v) => patch({ bg: v })} />
                            <Toggle label="对齐网格" value={params.grid} onChange={(v) => patch({ grid: v })} />
                            <Toggle label="导出含背景" value={params.bgExport} onChange={(v) => patch({ bgExport: v })} />
                            <button
                                type="button"
                                onClick={clearAll}
                                disabled={anchors.length === 0}
                                className="w-full rounded-lg border border-black/[0.07] bg-white/70 px-3 py-2 text-[11px] text-zinc-500 transition enabled:hover:border-rose-200 enabled:hover:text-rose-600 disabled:opacity-35"
                            >
                                清空航线
                            </button>
                        </SectionCard>
                    </aside>
                </div>

                <div className="mt-8">
                    <FooterNote />
                </div>
            </div>
        </div>
    )
}
