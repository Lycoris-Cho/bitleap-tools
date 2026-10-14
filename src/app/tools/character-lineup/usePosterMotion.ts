'use client'

/*
 * 动效驱动 —— 把时间变成画面，且**不经过 React**。
 *
 * 每一帧只做一件事：算一个 sample，然后往 data-anim 标记的节点上写 transform / opacity。
 * 进度不进 state，所以播一整天 React 也一动不动（这套路和 flight-path 里那套一致）。
 *
 * 节点是"按结构变化重新收集"的：加减角色、开关花瓣/浮尘都会重建列表，
 * 但每帧不做 querySelectorAll（那才是真会掉帧的地方）。
 */

import { useCallback, useEffect, useLayoutEffect, useImperativeHandle, useMemo, useRef, type Ref, type RefObject } from 'react'
import { buildAnimSample, introEndTime } from './motion'
import type { Slot } from './lineup'
import { POSTER_W, type MotionConfig } from './types'

export interface PosterMotionHandle {
    play: () => void
    pause: () => void
    restart: () => void
    /** 拖进度条：跳到某个时刻 */
    seek: (t: number) => void
    /** 归位到入场终态（导出 PNG 前调，保证不缺内容） */
    settle: () => void
    /** 直接把某个时刻画上去：WebM 逐帧渲染就靠它 */
    render: (t: number) => void
    getTime: () => number
}

interface Nodes {
    chars: Map<number, HTMLElement>
    labels: Map<number, HTMLElement>
    petals: Map<number, HTMLElement>
    dust: Map<number, HTMLElement>
    title: HTMLElement | null
    titleText: HTMLElement | null
    footer: HTMLElement | null
    decor: HTMLElement | null
    orbit: HTMLElement | null
    glow: HTMLElement | null
    sweep: HTMLElement | null
}

const emptyNodes = (): Nodes => ({
    chars: new Map(),
    labels: new Map(),
    petals: new Map(),
    dust: new Map(),
    title: null,
    titleText: null,
    footer: null,
    decor: null,
    orbit: null,
    glow: null,
    sweep: null,
})

/** 有没有常态微动 —— 没有的话入场跑完就该停掉循环，别一直空转 */
export const hasIdleMotion = (m: MotionConfig) =>
    m.breathe || m.float || m.heroGlow || m.sweep || m.petals || m.dust || m.orbitSpin

interface Options {
    playing: boolean
    /** 每帧回调（写原生进度条用）。**禁止在里面 setState** */
    onFrame: (t: number, end: number) => void
    /** 入场循环时的复位点，默认入场结束 + 1.2 秒 */
    holdSeconds?: number
    ref?: Ref<PosterMotionHandle>
}

export function usePosterMotion(
    rootRef: RefObject<HTMLElement | null>,
    slots: Slot[],
    motion: MotionConfig,
    { playing, onFrame, holdSeconds = 1.2, ref }: Options,
) {
    const timeRef = useRef(0)
    const nodesRef = useRef<Nodes>(emptyNodes())
    const slotsRef = useRef(slots)
    const motionRef = useRef(motion)
    const onFrameRef = useRef(onFrame)
    useEffect(() => {
        slotsRef.current = slots
        motionRef.current = motion
        onFrameRef.current = onFrame
    })

    const end = useMemo(() => introEndTime(slots, motion), [slots, motion])

    /* ── 收集节点 ── */
    const collect = useCallback(() => {
        const root = rootRef.current
        if (!root) return
        const n = emptyNodes()
        const each = (sel: string, fn: (el: HTMLElement, i: number) => void) =>
            root.querySelectorAll<HTMLElement>(`[data-anim="${sel}"]`).forEach((el, i) => fn(el, i))
        each('char', (el) => n.chars.set(Number(el.dataset.slot ?? 0), el))
        each('label', (el) => n.labels.set(Number(el.dataset.label ?? 0), el))
        each('petal', (el) => n.petals.set(Number(el.dataset.i ?? 0), el))
        each('dust', (el) => n.dust.set(Number(el.dataset.i ?? 0), el))
        n.title = root.querySelector<HTMLElement>('[data-anim="title"]')
        n.titleText = root.querySelector<HTMLElement>('[data-anim="title-text"]')
        n.footer = root.querySelector<HTMLElement>('[data-anim="footer"]')
        n.decor = root.querySelector<HTMLElement>('[data-anim="decor"]')
        n.orbit = root.querySelector<HTMLElement>('[data-anim="orbit"]')
        n.glow = root.querySelector<HTMLElement>('[data-anim="glow"]')
        n.sweep = root.querySelector<HTMLElement>('[data-anim="sweep"]')
        nodesRef.current = n
    }, [rootRef])

    /* ── apply：唯一一处"把时间变成画面" ── */
    const apply = useCallback((t: number) => {
        const { chars, labels, petals, dust, title, titleText, footer, decor, orbit, glow, sweep } = nodesRef.current
        const s = buildAnimSample(t, slotsRef.current, motionRef.current)

        for (const c of s.chars) {
            const el = chars.get(c.index)
            if (!el) continue
            el.style.transform = `translate3d(${c.dx.toFixed(2)}px, ${c.dy.toFixed(2)}px, 0) scale(${c.scale.toFixed(4)})`
            el.style.opacity = c.opacity.toFixed(3)
        }
        for (const l of s.labels) {
            const el = labels.get(l.index)
            if (!el) continue
            el.style.transform = `translate3d(0, ${l.dy.toFixed(2)}px, 0)`
            el.style.opacity = l.opacity.toFixed(3)
        }
        if (title) {
            title.style.transform = `translate3d(0, ${s.title.dy.toFixed(2)}px, 0)`
            title.style.opacity = s.title.opacity.toFixed(3)
        }
        if (titleText) titleText.style.letterSpacing = `${(0.16 + s.title.tracking).toFixed(3)}em`
        if (footer) {
            footer.style.transform = `translate3d(0, ${s.footer.dy.toFixed(2)}px, 0)`
            footer.style.opacity = s.footer.opacity.toFixed(3)
        }
        if (decor) {
            decor.style.opacity = s.decor.opacity.toFixed(3)
            decor.style.transform = `scale(${s.decor.scale.toFixed(4)})`
        }
        if (orbit) orbit.style.transform = `rotate(${s.orbit.toFixed(2)}deg)`
        if (glow) {
            glow.style.opacity = s.glow.opacity.toFixed(3)
            glow.style.transform = `scale(${s.glow.scale.toFixed(4)})`
        }
        if (sweep) {
            sweep.style.transform = `translate3d(${(s.sweep.x * POSTER_W).toFixed(1)}px, 0, 0) rotate(14deg)`
            sweep.style.opacity = s.sweep.opacity.toFixed(3)
        }
        for (const p of s.petals) {
            const el = petals.get(p.i)
            if (!el) continue
            el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) rotate(${p.rot.toFixed(1)}deg)`
            el.style.opacity = p.opacity.toFixed(3)
        }
        for (const d of s.dust) {
            const el = dust.get(d.i)
            if (!el) continue
            el.style.opacity = d.opacity.toFixed(3)
            el.style.transform = `scale(${d.scale.toFixed(3)})`
        }

        // 把 end 一起给出去：调用方就不用自己缓存它（缓存 ref 会被 React 编译器判为跨 hook 改值）
        onFrameRef.current(t, end)
    }, [end])

    /* 结构一变就重新收节点，并把当前时刻重新画上（否则会停在旧状态） */
    useLayoutEffect(() => {
        collect()
        apply(timeRef.current)
    }, [collect, apply, slots, motion.petals, motion.dust, motion.sweep, motion.heroGlow, motion.grain, motion.duotone])

    /* ── rAF 循环：只在 playing 时存在 ── */
    useEffect(() => {
        if (!playing) return
        let raf = 0
        let last = performance.now()
        const tick = (now: number) => {
            const dt = Math.min(0.1, (now - last) / 1000) * Math.max(0.1, motionRef.current.speed)
            last = now
            let next = timeRef.current + dt
            const m = motionRef.current
            if (m.loopIntro && m.introOn && next > end + holdSeconds) next = 0
            timeRef.current = next
            apply(next) // apply 内部会把 onFrame 一起调掉
            raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [playing, apply, end, holdSeconds])

    useImperativeHandle(
        ref,
        () => ({
            play: () => apply(timeRef.current),
            pause: () => apply(timeRef.current),
            restart: () => {
                timeRef.current = 0
                apply(0)
            },
            seek: (t: number) => {
                timeRef.current = Math.max(0, t)
                apply(timeRef.current)
            },
            settle: () => {
                timeRef.current = end
                apply(end)
            },
            render: (t: number) => apply(Math.max(0, t)),
            getTime: () => timeRef.current,
        }),
        [apply, end],
    )

    /** end = 入场结束时刻：进度条上限、PNG 归位、视频分段都用它 */
    return { end }
}
