/*
 * 动效时间线 —— 全部是**纯函数**，画面 = f(t)。
 *
 * 为什么不用 CSS @keyframes：
 *   ① 进度条要能逐帧回看，CSS 动画没法 seek；
 *   ② WebM 是逐帧渲染的：CSS 动画按**真实墙钟**走，而视频时间按 1/30 秒/帧推进，
 *      录出来的常态动效节奏会全错（这是最容易踩、也最难查的坑）；
 *   ③ PNG 导出只要 apply(入场结束) 就是确定性的终态，不必再额外 reset 一遍。
 *
 * 所以入场和常态微动都走这一条：给一个时刻 t（秒），算出每层该怎么摆。
 * 预览每帧调它，进度条拖拽调它，WebM 逐帧渲染也调它 —— 三处同一份真相。
 */

import { POSTER_H, POSTER_W, type FallShape, type MotionConfig } from './types'
import type { Slot } from './lineup'

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

/* ── 缓动：与站点其它工具同一套控制点 ── */
export interface EasingDef {
    id: string
    label: string
    cp: [number, number, number, number]
}

export const EASINGS: EasingDef[] = [
    { id: 'linear', label: '匀速', cp: [0, 0, 1, 1] },
    { id: 'out', label: '缓出', cp: [0, 0, 0.58, 1] },
    { id: 'inout', label: '缓入缓出', cp: [0.42, 0, 0.58, 1] },
    { id: 'outstrong', label: '强缓出', cp: [0.16, 1, 0.3, 1] },
    { id: 'soft', label: '柔和', cp: [0.22, 1, 0.36, 1] },
    { id: 'in', label: '缓入', cp: [0.42, 0, 1, 1] },
]

const easingById = (id: string) => EASINGS.find((e) => e.id === id) ?? EASINGS[1]

/** CSS cubic-bezier(x1,y1,x2,y2)：先解出参数 u 使 X(u)=t，再求 Y(u) */
export function bezierEase(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
    if (x1 === 0 && y1 === 0 && x2 === 1 && y2 === 1) return (t) => t
    const cx = 3 * x1
    const bx = 3 * (x2 - x1) - cx
    const ax = 1 - cx - bx
    const cy = 3 * y1
    const by = 3 * (y2 - y1) - cy
    const ay = 1 - cy - by
    const sx = (u: number) => ((ax * u + bx) * u + cx) * u
    const sy = (u: number) => ((ay * u + by) * u + cy) * u
    const dx = (u: number) => (3 * ax * u + 2 * bx) * u + cx

    return (t: number) => {
        if (t <= 0) return 0
        if (t >= 1) return 1
        let u = t
        for (let i = 0; i < 8; i += 1) {
            const err = sx(u) - t
            if (Math.abs(err) < 1e-5) break
            const k = dx(u)
            if (Math.abs(k) < 1e-6) break
            u -= err / k
        }
        if (u < 0 || u > 1) {
            let lo = 0
            let hi = 1
            for (let i = 0; i < 20; i += 1) {
                u = (lo + hi) / 2
                if (sx(u) < t) lo = u
                else hi = u
            }
        }
        return sy(u)
    }
}

export const easeFn = (id: string) => {
    const [x1, y1, x2, y2] = easingById(id).cp
    return bezierEase(x1, y1, x2, y2)
}

/* ── 确定性布点 ──
   花瓣和浮尘要有"随机感"，但必须**可复现**：同一个下标永远得到同一组参数。
   所以用下标做种子的散列，而不是 Math.random —— 否则每帧、每次导出、预览与视频全都不一样。 */
function seeded(i: number, salt: number): number {
    const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
    return x - Math.floor(x)
}

const TAU = Math.PI * 2

/* ── 飘落物的形状 ──
   全部用 CSS 形状（border-radius / clip-path）画出来，**不新增任何 DOM 节点**。
   这一点很要紧：导出的每一帧都要把 DOM 克隆一遍，多一种形状就是多几十个节点，
   视频导出会明显变慢。换形状只是换一行样式，所以想加多少种都不心疼。 */

export interface FallShapeDef {
    id: FallShape
    label: string
    /** 宽高比（高 = 宽 × aspect） */
    aspect: number
    style: { borderRadius?: string; clipPath?: string; WebkitClipPath?: string }
}

export const FALL_SHAPES: FallShapeDef[] = [
    { id: 'petal', label: '花瓣', aspect: 0.78, style: { borderRadius: '62% 38% 58% 42% / 58% 62% 38% 42%' } },
    {
        id: 'star4',
        label: '四角星',
        aspect: 1,
        style: { clipPath: 'polygon(50% 0%, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0% 50%, 39% 39%)' },
    },
    {
        id: 'star5',
        label: '五角星',
        aspect: 1,
        style: {
            clipPath: 'polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)',
        },
    },
    {
        id: 'snow',
        label: '雪花',
        aspect: 1,
        // 六角星：外径 50、内径 22，每 30° 交替一次（算出来的，不是随手写的）
        style: {
            clipPath:
                'polygon(50% 0%,61% 31%,93% 25%,72% 50%,93% 75%,61% 69%,50% 100%,39% 69%,7% 75%,28% 50%,7% 25%,39% 31%)',
        },
    },
    { id: 'leaf', label: '叶片', aspect: 0.82, style: { borderRadius: '0 62% 0 62%' } },
    { id: 'dot', label: '光点', aspect: 1, style: { borderRadius: '50%' } },
]

export const fallShapeById = (id: string) => FALL_SHAPES.find((s) => s.id === id) ?? FALL_SHAPES[0]

export interface PetalSeed {
    /** 起始横向位置 0~1 */
    x0: number
    /** 相位 0~1（决定它在循环里的位置）*/
    phase: number
    /** 下落速度倍率 */
    speed: number
    /** 尺寸 px */
    size: number
    /** 左右摆动幅度 px */
    sway: number
    /** 自转速度（度/秒） */
    spin: number
    /** 摆动频率 */
    swayFreq: number
    /** 0/1：用主色还是副色（确定性，所以同一颗每次同色） */
    tint: number
}

export const petalSeed = (i: number): PetalSeed => ({
    x0: seeded(i, 1),
    phase: seeded(i, 2),
    speed: 0.7 + seeded(i, 3) * 0.6,
    size: 16 + seeded(i, 4) * 22,
    sway: 30 + seeded(i, 5) * 70,
    spin: (seeded(i, 6) - 0.5) * 90,
    swayFreq: 0.12 + seeded(i, 7) * 0.16,
    tint: seeded(i, 21),
})

export const dustSeed = (i: number) => ({
    x: seeded(i, 11),
    y: seeded(i, 12),
    size: 2 + seeded(i, 13) * 3,
    phase: seeded(i, 14),
    freq: 0.08 + seeded(i, 15) * 0.2,
})

/* ── 采样 ── */

export interface CharAnim {
    index: number
    dx: number
    dy: number
    scale: number
    opacity: number
}

export interface AnimSample {
    chars: CharAnim[]
    labels: Array<{ index: number; dy: number; opacity: number }>
    title: { dy: number; opacity: number; tracking: number }
    footer: { dy: number; opacity: number }
    decor: { opacity: number; scale: number }
    glow: { opacity: number; scale: number }
    /** 扫光：x 是版面宽度比例，opacity 0 表示不可见 */
    sweep: { x: number; opacity: number }
    petals: Array<{ i: number; x: number; y: number; rot: number; opacity: number }>
    dust: Array<{ i: number; opacity: number; scale: number }>
    /** 轨道旋转角度 */
    orbit: number
    /** 入场是否已收尾（PNG 导出取这个时刻） */
    settled: boolean
}

/** 几个入场元素各自的"出场序号"：错峰就是按这个序号排 */
function orderRank(slots: Slot[], order: MotionConfig['introOrder']): Map<number, number> {
    const rank = new Map<number, number>()
    const list = slots.slice()
    if (order === 'hero') {
        // 主角先，其余按由内向外
        list.sort((a, b) => a.depth - b.depth || a.index - b.index)
    } else if (order === 'outer') {
        // 由外向内：两侧先出，主角压轴
        list.sort((a, b) => b.depth - a.depth || a.index - b.index)
    } else {
        // 从左到右
        list.sort((a, b) => a.x - b.x)
    }
    list.forEach((s, i) => rank.set(s.index, i))
    return rank
}

/** 整段入场什么时候结束（含标题、名条）—— PNG 导出就取这个时刻 */
export function introEndTime(slots: Slot[], motion: MotionConfig): number {
    if (!motion.introOn || !motion.introDuration) return 0
    const n = Math.max(1, slots.length)
    const charsEnd = motion.introDuration + motion.introStagger * (n - 1)
    // 标题总是最后收尾一点点；名条跟在人物后面
    return Math.max(charsEnd, motion.titleLag + motion.introDuration) + motion.introDuration * 0.35
}

/**
 * 核心：给一个时刻得到整张海报的动效状态。
 * 单调、无副作用、同输入同输出 —— 所以预览、拖拽、逐帧录视频都调这一个。
 */
export function buildAnimSample(t: number, slots: Slot[], motion: MotionConfig): AnimSample {
    const time = Math.max(0, t)
    const ease = easeFn(motion.introEase)
    const n = slots.length
    const rank = orderRank(slots, motion.introOrder)

    /* 入场进度：每个人自己的 p */
    const pOf = (index: number) => {
        if (!motion.introOn) return 1
        const delay = (rank.get(index) ?? index) * motion.introStagger
        const raw = clamp((time - delay) / Math.max(0.05, motion.introDuration), 0, 1)
        return ease(raw)
    }

    /* ── 人物 ── */
    const chars: CharAnim[] = slots.map((s) => {
        const p = pOf(s.index)
        const inv = 1 - p

        let dx = 0
        let dy = 0
        let scale = 1
        if (motion.introStyle === 'rise') {
            dy = inv * 110
            scale = 1 - inv * 0.05
        } else if (motion.introStyle === 'zoom') {
            dy = inv * 30
            scale = 1 - inv * 0.18
        } else {
            // 横向滑入：从各自那一侧进来，构图上更"合拢"
            const dir = s.x >= POSTER_W / 2 ? 1 : -1
            dx = inv * dir * 200
            scale = 1 - inv * 0.04
        }

        /* 常态：呼吸 + 漂浮（相位按下标错开，整排不会一起上下） */
        if (p > 0) {
            const phase = s.index * 1.7
            if (motion.breathe) {
                const a = motion.breatheAmount * 0.016
                const k = Math.sin(TAU * (time / 7.5) + phase)
                scale *= 1 + a * k
            }
            if (motion.float) {
                const a = motion.floatAmount * 9
                dy += a * Math.sin(TAU * (time / 6.2) + phase * 0.7)
            }
        }

        return { index: s.index, dx, dy, scale, opacity: p }
    })

    /* ── 名字条：跟在人物后面淡入 ── */
    const labelDelay = motion.introOn ? motion.introDuration * 0.55 : 0
    const labels = slots.map((s) => {
        const base = motion.introOn ? (rank.get(s.index) ?? s.index) * motion.introStagger : 0
        const p = motion.introOn ? ease(clamp((time - base - labelDelay) / Math.max(0.05, motion.introDuration * 0.7), 0, 1)) : 1
        return { index: s.index, dy: (1 - p) * 16, opacity: p }
    })

    /* ── 标题 / 底部：比人物稍晚起步 ── */
    const titleP = motion.introOn
        ? ease(clamp((time - motion.titleLag) / Math.max(0.05, motion.introDuration * 1.15), 0, 1))
        : 1
    const footerP = motion.introOn ? ease(clamp((time - motion.titleLag - 0.25) / Math.max(0.05, motion.introDuration), 0, 1)) : 1
    const decorP = motion.introOn ? ease(clamp(time / Math.max(0.05, motion.introDuration * 0.9), 0, 1)) : 1

    /* ── 主角光晕呼吸 ── */
    let glowOpacity = 0
    let glowScale = 1
    if (motion.heroGlow) {
        const a = 0.35 + motion.heroGlowAmount * 0.45
        const k = 0.5 + 0.5 * Math.sin(TAU * (time / 5.4))
        glowOpacity = a * k * (0.35 + 0.65 * (n > 0 ? 1 : 0))
        glowScale = 0.94 + 0.12 * k
    }

    /* ── 扫光：一个周期内从左掠到右，两端淡入淡出 ── */
    let sweep = { x: -0.4, opacity: 0 }
    if (motion.sweep) {
        const period = Math.max(1.5, motion.sweepPeriod)
        const k = (time % period) / period
        sweep = { x: -0.45 + k * 1.9, opacity: Math.sin(Math.PI * clamp((k - 0.08) / 0.84, 0, 1)) * 0.9 }
    }

    /* ── 花瓣：y 从版面上方落到下方，一个循环刚好接上 ── */
    const petals: AnimSample['petals'] = []
    if (motion.petals) {
        const count = Math.max(0, Math.min(60, Math.round(motion.petalCount)))
        const span = POSTER_H * 1.25
        for (let i = 0; i < count; i += 1) {
            const s = petalSeed(i)
            const k = ((time * s.speed) / Math.max(2, motion.petalSpeed ? 26 / Math.max(0.2, motion.petalSpeed) : 26) + s.phase) % 1
            const y = -POSTER_H * 0.25 + k * span
            const x = s.x0 * POSTER_W + Math.sin(TAU * time * s.swayFreq + s.phase * 6) * s.sway
            // 两端各 8% 淡入淡出，落到底就"化掉"，不会有硬边
            const fade = Math.min(1, Math.min(k, 1 - k) / 0.08)
            petals.push({ i, x, y, rot: time * s.spin + s.phase * 360, opacity: 0.85 * fade })
        }
    }

    /* ── 浮尘：原地闪烁，不移动（移动交给花瓣） ── */
    const dust: AnimSample['dust'] = []
    if (motion.dust) {
        const count = Math.max(0, Math.min(80, Math.round(motion.dustCount)))
        for (let i = 0; i < count; i += 1) {
            const s = dustSeed(i)
            const k = 0.5 + 0.5 * Math.sin(TAU * time * s.freq + s.phase * TAU)
            dust.push({ i, opacity: 0.14 + 0.5 * k, scale: 0.7 + 0.6 * k })
        }
    }

    /* ── 轨道缓转 ── */
    const orbit = motion.orbitSpin ? (time / Math.max(4, motion.orbitPeriod)) * 360 : 0

    return {
        chars,
        labels,
        title: { dy: (1 - titleP) * 44, opacity: titleP, tracking: (1 - titleP) * 0.22 },
        footer: { dy: (1 - footerP) * 20, opacity: footerP },
        decor: { opacity: decorP, scale: 0.985 + 0.015 * decorP },
        glow: { opacity: glowOpacity, scale: glowScale },
        sweep,
        petals,
        dust,
        orbit,
        settled: motion.introOn ? time >= introEndTime(slots, motion) - 1e-6 : true,
    }
}
