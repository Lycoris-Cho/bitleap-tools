'use client'

/*
 * 航线画布 —— 画线、调节、播放三件事都在这一个 SVG 里。
 *
 * 一条硬规矩：**播放期间不触发任何 React 渲染**。
 * 每帧只做三件写 DOM 的事：给飞行器设 transform、给遮罩设 stroke-dashoffset、
 * 把抓手圆挪到飞行器上。进度不进 state，所以播一小时 React 也一动不动。
 *
 * 另一条：坐标一律换算成"逻辑画布单位"（viewBox 坐标）再存。
 * 容器由父组件用 aspect-ratio 强制成与 viewBox 相同的宽高比，
 * 因此 `getBoundingClientRect` 的线性换算就是精确的，不需要 getScreenCTM。
 *
 * 抓手为什么是"兄弟节点 + 每帧挪位置"而不是飞行器的子节点：
 * 子节点会连着旋转一起被转，圆形倒是无所谓，但锚点要压在它上面才点得准，
 * 所以让它留在同一层，用文档顺序控制谁在上。
 */

import { useCallback, useEffect, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type Ref } from 'react'
import { easeFn, pointAt, projectOnPath, simplify, type Pt, type Track } from '../geometry'
import { glyphById } from '../glyphs'
import { buildSegments, cycleLength, progressAt, travelSeconds, type SceneParams } from '../scene'

export interface FlightCanvasHandle {
    play: () => void
    restart: () => void
    /** 拖进度条：跳到一轮内的某个时刻 */
    seek: (cyclePos: number) => void
}

export type CanvasMode = 'draw' | 'edit'

interface Props {
    anchors: Pt[]
    params: SceneParams
    ratio: { w: number; h: number }
    track: Track
    mode: CanvasMode
    playing: boolean
    selected: number | null
    /** 画完一条新航线 */
    onDrawEnd: (anchors: Pt[]) => void
    /** 拖动锚点中（父组件接成一次普通的 setState） */
    onAnchorMove: (index: number, p: Pt) => void
    /** 在 afterIndex 之后插入一个锚点 */
    onInsert: (afterIndex: number, p: Pt) => void
    onSelect: (index: number | null) => void
    /** 整体平移（拖动中会连续调用） */
    onTranslate: (dx: number, dy: number, origin: Pt[]) => void
    /** 一次编辑动作开始（拖锚点 / 平移之前调用一次），用来给撤销栈打一个点 */
    onEditBegin: () => void
    /** 单次模式播到终点 */
    onEnded: () => void
    /** 每帧回调，用来把进度写进原生滑杆。**禁止在里面 setState**（否则每帧都会重渲染） */
    onFrame: (progress: number, cyclePos: number, cycle: number) => void
    ref?: Ref<FlightCanvasHandle>
}

const HANDLE_R = 30 // 抓手半径（逻辑单位）。放大是为了好点中
const ANCHOR_R = 8
const MIN_STEP = 3 // 采样间距：比这更近的点丢弃，手绘才不会堆出几百个点

/** 指针捕获偶尔会抛（指针已失效、合成事件等），捕获失败不该让整个拖拽流程断掉 */
function capture(el: Element, pointerId: number) {
    try {
        el.setPointerCapture(pointerId)
    } catch {
        /* 拿不到捕获也能继续，只是指针移出元素后会丢事件 */
    }
}

export default function FlightCanvas({
    anchors,
    params,
    ratio,
    track,
    mode,
    playing,
    selected,
    onDrawEnd,
    onAnchorMove,
    onInsert,
    onSelect,
    onTranslate,
    onEditBegin,
    onEnded,
    onFrame,
    ref,
}: Props) {
    const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
    const idReveal = `fp-reveal-${uid}`
    const idGlow = `fp-glow-${uid}`
    const idGrid = `fp-grid-${uid}`

    const svgRef = useRef<SVGSVGElement>(null)
    const craftRef = useRef<SVGGElement>(null)
    const grabRef = useRef<SVGCircleElement>(null)
    const maskRef = useRef<SVGPathElement>(null)
    const liveRef = useRef<SVGPathElement>(null)

    /** 一轮内的当前时刻（秒）—— 故意放 ref，不进 state */
    const cyclePosRef = useRef(0)
    const drawRef = useRef<Pt[] | null>(null)
    const dragRef = useRef<{ kind: 'anchor'; index: number } | { kind: 'move'; from: Pt; origin: Pt[] } | null>(null)
    const [hover, setHover] = useState<'craft' | number | null>(null)

    /* ── 时间轴 ── */
    const ease = useMemo(() => easeFn(params.easing), [params.easing])
    const travel = useMemo(() => travelSeconds(params, track), [params, track])
    const segments = useMemo(() => buildSegments(params, travel), [params, travel])
    const cycle = useMemo(() => cycleLength(segments), [segments])

    /** 进度 → 画面。这是唯一一处"把时间变成画面"的地方 */
    const apply = useCallback(
        (cyclePos: number) => {
            const progress = Math.max(0, Math.min(1, progressAt(segments, ease, cyclePos)))
            const pos =
                track.total > 0
                    ? pointAt(track, progress * track.total)
                    : { x: anchors[0]?.x ?? ratio.w / 2, y: anchors[0]?.y ?? ratio.h / 2, a: 0 }

            const craft = craftRef.current
            if (craft) {
                const angle = params.follow ? pos.a : 0
                craft.setAttribute('transform', `translate(${pos.x.toFixed(2)} ${pos.y.toFixed(2)}) rotate(${angle.toFixed(2)})`)
            }
            const grab = grabRef.current
            if (grab) {
                grab.setAttribute('cx', pos.x.toFixed(2))
                grab.setAttribute('cy', pos.y.toFixed(2))
            }
            const mask = maskRef.current
            if (mask) mask.setAttribute('stroke-dashoffset', String(track.total * (1 - progress)))

            onFrame(progress, cyclePos, cycle)
        },
        [anchors, cycle, ease, onFrame, params.follow, ratio.h, ratio.w, segments, track],
    )

    /* 结构一变（换航线、改参数）就把当前这一帧重新画上，别让画面停在旧状态 */
    useLayoutEffect(() => {
        apply(cyclePosRef.current)
    }, [apply])

    /* rAF 循环：只在 playing 时存在 */
    useEffect(() => {
        if (!playing) return
        let raf = 0
        let last = performance.now()
        const tick = (now: number) => {
            const dt = Math.min(0.1, (now - last) / 1000)
            last = now
            let next = cyclePosRef.current + dt
            if (next >= cycle) {
                if (params.loop === 'once') {
                    cyclePosRef.current = cycle
                    apply(cycle)
                    onEnded()
                    return
                }
                next %= cycle
            }
            cyclePosRef.current = next
            apply(next)
            raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [playing, apply, cycle, params.loop, onEnded])

    useImperativeHandle(
        ref,
        () => ({
            play: () => {
                // 单次模式已经停在终点时，再按一次从头来
                if (params.loop === 'once' && cyclePosRef.current >= cycle - 1e-3) cyclePosRef.current = 0
                apply(cyclePosRef.current)
            },
            restart: () => {
                cyclePosRef.current = 0
                apply(0)
            },
            seek: (p: number) => {
                cyclePosRef.current = Math.max(0, Math.min(cycle, p))
                apply(cyclePosRef.current)
            },
        }),
        [apply, cycle, params.loop],
    )

    /* ── 坐标换算 ── */
    const toLogical = useCallback(
        (clientX: number, clientY: number): Pt => {
            const svg = svgRef.current
            if (!svg) return { x: 0, y: 0 }
            const r = svg.getBoundingClientRect()
            return {
                x: ((clientX - r.left) / Math.max(1, r.width)) * ratio.w,
                y: ((clientY - r.top) / Math.max(1, r.height)) * ratio.h,
            }
        },
        [ratio.h, ratio.w],
    )

    /* ── 抓手上按下：画线 / 整体平移 ── */
    const onCraftPointerDown = (e: React.PointerEvent<SVGCircleElement>) => {
        e.preventDefault()
        e.stopPropagation()
        const p = toLogical(e.clientX, e.clientY)

        if (mode === 'edit') {
            onEditBegin()
            dragRef.current = { kind: 'move', from: p, origin: anchors.map((a) => ({ ...a })) }
            capture(e.currentTarget, e.pointerId)
            return
        }

        drawRef.current = [p]
        capture(e.currentTarget, e.pointerId)
        if (liveRef.current) liveRef.current.setAttribute('d', `M${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    }

    const onCraftPointerMove = (e: React.PointerEvent<SVGCircleElement>) => {
        const p = toLogical(e.clientX, e.clientY)

        const drag = dragRef.current
        if (drag?.kind === 'move') {
            onTranslate(p.x - drag.from.x, p.y - drag.from.y, drag.origin)
            return
        }

        const pts = drawRef.current
        if (!pts) return
        const last = pts[pts.length - 1]
        if (Math.hypot(p.x - last.x, p.y - last.y) < MIN_STEP) return
        pts.push(p)
        // 实时折线用 setAttribute 更新：这段每帧都在跑，绝不能走 React
        if (liveRef.current) {
            liveRef.current.setAttribute(
                'd',
                pts.map((q, i) => `${i === 0 ? 'M' : 'L'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(''),
            )
        }
    }

    const onCraftPointerUp = (e: React.PointerEvent<SVGCircleElement>) => {
        try {
            e.currentTarget.releasePointerCapture(e.pointerId)
        } catch {
            /* 指针已经释放，忽略 */
        }

        if (dragRef.current?.kind === 'move') {
            dragRef.current = null
            return
        }

        const pts = drawRef.current
        drawRef.current = null
        if (liveRef.current) liveRef.current.setAttribute('d', '')
        if (!pts || pts.length < 2) return

        // 抽稀：手绘动辄几百个点，不抽稀曲线会抖成锯齿，锚点也点不过来
        const cleaned = simplify(pts, 1.4)
        if (cleaned.length >= 2) onDrawEnd(cleaned)
    }

    /* ── 锚点拖动 ── */
    const onAnchorPointerDown = (index: number) => (e: React.PointerEvent<SVGCircleElement>) => {
        e.preventDefault()
        e.stopPropagation()
        onEditBegin()
        dragRef.current = { kind: 'anchor', index }
        onSelect(index)
        capture(e.currentTarget, e.pointerId)
    }

    const onAnchorPointerMove = (e: React.PointerEvent<SVGCircleElement>) => {
        const drag = dragRef.current
        if (drag?.kind !== 'anchor') return
        onAnchorMove(drag.index, toLogical(e.clientX, e.clientY))
    }

    const onAnchorPointerUp = (e: React.PointerEvent<SVGCircleElement>) => {
        try {
            e.currentTarget.releasePointerCapture(e.pointerId)
        } catch {
            /* 忽略 */
        }
        if (dragRef.current?.kind === 'anchor') dragRef.current = null
    }

    /* ── 点航线插点 ── */
    const onPathPointerDown = (e: React.PointerEvent<SVGPathElement>) => {
        if (mode !== 'edit' || anchors.length < 2) return
        e.preventDefault()
        e.stopPropagation()
        const hit = projectOnPath(anchors, toLogical(e.clientX, e.clientY))
        if (hit) onInsert(hit.afterIndex, hit.point)
    }

    const glyph = glyphById(params.glyph)
    const maskWidth = Math.max(24, params.lineWidth * 8)
    const glow = params.glow ? `url(#${idGlow})` : undefined
    const craftScale = params.size / 24
    const dashArray = `${params.dash} ${params.gap}`

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${ratio.w} ${ratio.h}`}
            preserveAspectRatio="xMidYMid meet"
            className="absolute inset-0 h-full w-full touch-none select-none"
            onPointerDown={() => onSelect(null)}
            role="application"
            aria-label="航线画布"
        >
            <defs>
                {params.glow && (
                    <filter id={idGlow} x="-40%" y="-40%" width="180%" height="180%">
                        <feGaussianBlur stdDeviation={Math.max(1.2, params.lineWidth * 1.5)} result="b" />
                        <feMerge>
                            <feMergeNode in="b" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                )}
                {/* 遮罩里的实线：dasharray=总长、dashoffset=总长 表示"完全遮住"；
                    每帧把 offset 推向 0，就把彩色虚线逐段放出来 */}
                <mask id={idReveal} maskUnits="userSpaceOnUse" x={0} y={0} width={ratio.w} height={ratio.h}>
                    <path
                        ref={maskRef}
                        d={track.d}
                        fill="none"
                        stroke="#fff"
                        strokeWidth={maskWidth}
                        strokeLinecap="butt"
                        strokeDasharray={Math.max(1, track.total)}
                        strokeDashoffset={Math.max(1, track.total)}
                    />
                </mask>
                <pattern id={idGrid} width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M40 0H0V40" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="1" />
                </pattern>
            </defs>

            {/* 底：画布底色 + 对齐网格（网格只是画布辅助，不参与导出） */}
            <rect width={ratio.w} height={ratio.h} fill={params.bg} />
            {params.grid && <rect width={ratio.w} height={ratio.h} fill={`url(#${idGrid})`} />}

            {/* 整条航线的暗底：让人看得到"还没飞过的路" */}
            {track.d && (
                <path
                    d={track.d}
                    fill="none"
                    stroke={params.lineColor}
                    strokeOpacity={0.2}
                    strokeWidth={params.lineWidth}
                    strokeDasharray={dashArray}
                    strokeLinecap="round"
                />
            )}

            {/* 亮航线：被遮罩按进度点亮 */}
            {track.d && (
                <path
                    d={track.d}
                    fill="none"
                    stroke={params.lineColor}
                    strokeWidth={params.lineWidth}
                    strokeDasharray={dashArray}
                    strokeLinecap="round"
                    mask={`url(#${idReveal})`}
                    filter={glow}
                    pointerEvents="none"
                />
            )}

            {/* 调节模式：一条透明粗线专门接"点线插点" */}
            {mode === 'edit' && track.d && (
                <path d={track.d} fill="none" stroke="transparent" strokeWidth={26} onPointerDown={onPathPointerDown} className="cursor-copy" />
            )}

            {/* 手绘中的实时折线 */}
            <path
                ref={liveRef}
                d=""
                fill="none"
                stroke={params.lineColor}
                strokeWidth={params.lineWidth}
                strokeLinecap="round"
                opacity={0.9}
                pointerEvents="none"
            />

            {/* 起点标记 */}
            {anchors.length > 1 && (
                <circle
                    cx={anchors[0].x}
                    cy={anchors[0].y}
                    r={4}
                    fill="none"
                    stroke={params.lineColor}
                    strokeWidth={1.5}
                    opacity={0.7}
                    pointerEvents="none"
                />
            )}

            {/* 飞行器：位置每帧由 apply 写 transform */}
            <g ref={craftRef} pointerEvents="none">
                <g transform={`scale(${craftScale})${params.rotateOffset ? ` rotate(${params.rotateOffset})` : ''}`}>
                    <path d={glyph.d} fill={params.glyphColor} filter={glow} />
                </g>
            </g>

            {/* 抓手：透明圆，压在飞行器上；cx/cy 每帧跟着飞行器走 */}
            {!playing && (
                <circle
                    ref={grabRef}
                    r={HANDLE_R}
                    fill="transparent"
                    stroke={hover === 'craft' ? params.lineColor : 'transparent'}
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    className={mode === 'edit' ? 'cursor-move' : 'cursor-crosshair'}
                    onPointerDown={onCraftPointerDown}
                    onPointerMove={onCraftPointerMove}
                    onPointerUp={onCraftPointerUp}
                    onPointerCancel={onCraftPointerUp}
                    onPointerEnter={() => setHover('craft')}
                    onPointerLeave={() => setHover(null)}
                />
            )}

            {/* 锚点（调节模式）。压在抓手之上，所以飞行器停在终点时仍然点得到最后一个锚点 */}
            {mode === 'edit' &&
                anchors.map((a, i) => (
                    <g key={i}>
                        {hover === i && (
                            <circle cx={a.x} cy={a.y} r={ANCHOR_R + 5} fill="none" stroke={params.lineColor} strokeWidth={1.5} opacity={0.8} pointerEvents="none" />
                        )}
                        <circle
                            cx={a.x}
                            cy={a.y}
                            r={ANCHOR_R}
                            fill={selected === i ? params.lineColor : 'rgba(255,255,255,.92)'}
                            stroke={selected === i ? '#fff' : params.bg}
                            strokeWidth={2}
                            className="cursor-grab active:cursor-grabbing"
                            onPointerDown={onAnchorPointerDown(i)}
                            onPointerMove={onAnchorPointerMove}
                            onPointerUp={onAnchorPointerUp}
                            onPointerCancel={onAnchorPointerUp}
                            onPointerEnter={() => setHover(i)}
                            onPointerLeave={() => setHover(null)}
                        />
                    </g>
                ))}

            {/* 空状态提示 */}
            {anchors.length === 0 && (
                <text x={ratio.w / 2} y={ratio.h / 2 + 80} textAnchor="middle" fill="rgba(255,255,255,.5)" fontSize={17} pointerEvents="none">
                    按住小飞机拖动，画出第一条航线
                </text>
            )}
        </svg>
    )
}
