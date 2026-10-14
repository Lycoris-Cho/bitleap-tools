/*
 * 航线几何 —— 全部是纯函数，不碰 DOM。
 *
 * 为什么不用 SVG 原生的 getPointAtLength：
 *   ① 它必须挂在一个真实的 DOM 节点上，而预设、导出、画幅换算都要在"没有节点"时先算出结果；
 *   ② 我们要的切线角、等分点、分段控制点，它给不全。
 * 所以这里自己把 Catmull-Rom 展平成折线并累计弧长，一次算好，后面查表即用。
 * 展平还带来一个好处：**预览与导出用的是同一套数字**，不会出现"页面好看、导出跑偏"。
 */

export type Pt = { x: number; y: number }

/** 两点距离 */
export const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y)

/** 保留两位小数（导出路径里不要出现一长串小数） */
const f2 = (n: number) => {
    const v = Math.round(n * 100) / 100
    return Object.is(v, -0) ? 0 : v
}

/* ── 点列抽稀：Ramer–Douglas–Peucker ──
   手绘的三百个点直接做样条会抖得像锯齿。RDP 只留下"偏离直线超过 ε"的点，
   既去掉抖动，又保留了转弯的骨架。 */

/** 点到线段 ab 的垂距平方（落在线段外时取端点距离） */
function perpDistSq(p: Pt, a: Pt, b: Pt): number {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const lenSq = dx * dx + dy * dy
    if (lenSq === 0) return (p.x - a.x) ** 2 + (p.y - a.y) ** 2
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq
    t = Math.max(0, Math.min(1, t))
    const cx = a.x + t * dx
    const cy = a.y + t * dy
    return (p.x - cx) ** 2 + (p.y - cy) ** 2
}

export function simplify(points: Pt[], epsilon: number): Pt[] {
    if (points.length <= 2) return points.slice()

    const keep = new Uint8Array(points.length)
    keep[0] = 1
    keep[points.length - 1] = 1
    const epsSq = epsilon * epsilon
    // 用显式栈代替递归：手绘可能上千个点，递归有爆栈风险
    const stack: Array<[number, number]> = [[0, points.length - 1]]

    while (stack.length > 0) {
        const [start, end] = stack.pop() as [number, number]
        let bestSq = 0
        let bestIndex = -1
        for (let i = start + 1; i < end; i += 1) {
            const d = perpDistSq(points[i], points[start], points[end])
            if (d > bestSq) {
                bestSq = d
                bestIndex = i
            }
        }
        if (bestIndex > 0 && bestSq > epsSq) {
            keep[bestIndex] = 1
            stack.push([start, bestIndex], [bestIndex, end])
        }
    }

    const out: Pt[] = []
    for (let i = 0; i < points.length; i += 1) if (keep[i]) out.push(points[i])
    return out
}

/* ── Catmull-Rom → 三次贝塞尔 ──
   直接把锚点连成折线会很生硬。Catmull-Rom 让每个锚点处的切线由**前后两点**决定，
   于是曲线自动穿过每个锚点、又处处连续 —— 这正是"拖锚点微调"需要的性质：
   动一个点，只影响它左右两段，不会整条乱掉。
   切线系数用标准 1/6，再乘张力（1 = 标准样条，越小越接近折线）。 */

export interface Cubic {
    /** 起点 */
    p0: Pt
    /** 控制点 1 */
    c1: Pt
    /** 控制点 2 */
    c2: Pt
    /** 终点 */
    p1: Pt
}

/** 锚点 → 一串三次贝塞尔段（端点用自身做虚拟邻居，保证首尾切线自然） */
export function toCubics(anchors: Pt[], tension: number): Cubic[] {
    const n = anchors.length
    if (n < 2) return []
    const t = Math.max(0, Math.min(1, tension)) / 6
    const at = (i: number) => anchors[Math.max(0, Math.min(n - 1, i))]

    const out: Cubic[] = []
    for (let i = 0; i < n - 1; i += 1) {
        const p0 = anchors[i]
        const p1 = anchors[i + 1]
        const prev = at(i - 1)
        const next = at(i + 2)
        out.push({
            p0,
            c1: { x: p0.x + (p1.x - prev.x) * t, y: p0.y + (p1.y - prev.y) * t },
            c2: { x: p1.x - (next.x - p0.x) * t, y: p1.y - (next.y - p0.y) * t },
            p1,
        })
    }
    return out
}

/** 贝塞尔段 → d 片段 */
const cubicToD = (c: Cubic) =>
    `C${f2(c.c1.x)} ${f2(c.c1.y)} ${f2(c.c2.x)} ${f2(c.c2.y)} ${f2(c.p1.x)} ${f2(c.p1.y)}`

/** 锚点 → SVG 路径 d */
export function pathFromAnchors(anchors: Pt[], tension: number): string {
    if (anchors.length === 0) return ''
    if (anchors.length === 1) return `M${f2(anchors[0].x)} ${f2(anchors[0].y)}`
    const cubics = toCubics(anchors, tension)
    return `M${f2(anchors[0].x)} ${f2(anchors[0].y)}${cubics.map(cubicToD).join('')}`
}

/* ── 弧长轨道 ──
   把曲线展平成折线并累计弧长。之后"飞了 40% 长度"就是一次查表：
   位置、切线角都能拿到，反复取也不重算。 */

export interface TrackSample {
    x: number
    y: number
    /** 从起点累计的弧长 */
    s: number
    /** 该处的切线角（度） */
    a: number
}

export interface Track {
    d: string
    /** 总弧长 */
    total: number
    samples: TrackSample[]
}

/** 一段三次贝塞尔的求值 */
const evalCubic = (c: Cubic, u: number): Pt => {
    const v = 1 - u
    const a = v * v * v
    const b = 3 * v * v * u
    const d = 3 * v * u * u
    const e = u * u * u
    return {
        x: a * c.p0.x + b * c.c1.x + d * c.c2.x + e * c.p1.x,
        y: a * c.p0.y + b * c.c1.y + d * c.c2.y + e * c.p1.y,
    }
}

/**
 * 锚点 → 轨道。
 * perSeg 是每段展平的折线段数：32 段对 960×540 的画布来说误差远小于 1px，
 * 而代价只是一千次求值，随时重算都不心疼。
 */
export function buildTrack(anchors: Pt[], tension: number, perSeg = 32): Track {
    const cubics = toCubics(anchors, tension)
    const d = pathFromAnchors(anchors, tension)
    if (cubics.length === 0) {
        const only = anchors[0]
        return { d, total: 0, samples: only ? [{ x: only.x, y: only.y, s: 0, a: 0 }] : [] }
    }

    const flat: Pt[] = [anchors[0]]
    for (const c of cubics) {
        for (let k = 1; k <= perSeg; k += 1) flat.push(evalCubic(c, k / perSeg))
    }

    const samples: TrackSample[] = []
    let total = 0
    for (let i = 0; i < flat.length; i += 1) {
        if (i > 0) total += dist(flat[i - 1], flat[i])
        const prev = flat[Math.max(0, i - 1)]
        const next = flat[Math.min(flat.length - 1, i + 1)]
        // 用前后点算切线，比用单段端点更稳（顶点处不会跳角）
        samples.push({
            x: flat[i].x,
            y: flat[i].y,
            s: total,
            a: (Math.atan2(next.y - prev.y, next.x - prev.x) * 180) / Math.PI,
        })
    }
    return { d, total, samples }
}

/** 取弧长 s 处的位置与切线角；越界自动夹到两端 */
export function pointAt(track: Track, s: number): { x: number; y: number; a: number } {
    const { samples, total } = track
    if (samples.length === 0) return { x: 0, y: 0, a: 0 }
    if (samples.length === 1 || total <= 0) return { x: samples[0].x, y: samples[0].y, a: samples[0].a }

    const target = Math.max(0, Math.min(total, s))
    let lo = 0
    let hi = samples.length - 1
    while (lo < hi - 1) {
        const mid = (lo + hi) >> 1
        if (samples[mid].s <= target) lo = mid
        else hi = mid
    }
    const a = samples[lo]
    const b = samples[hi]
    const span = b.s - a.s
    const k = span > 0 ? (target - a.s) / span : 0
    // 角度插值要处理 ±180 的跨界，否则飞机过顶点会突然翻个身
    let da = b.a - a.a
    while (da > 180) da -= 360
    while (da < -180) da += 360
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, a: a.a + da * k }
}

/* ── 画幅换算 ──
   切画幅时把已有的图等比缩放着装进新画幅：只缩放 + 居中，绝不做非等比拉伸，
   所以换比例不会把画好的航线拉变形。 */

export function rescale(
    anchors: Pt[],
    from: { w: number; h: number },
    to: { w: number; h: number },
    pad = 48,
): Pt[] {
    if (anchors.length === 0 || from.w <= 0 || from.h <= 0) return anchors

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const p of anchors) {
        minX = Math.min(minX, p.x)
        minY = Math.min(minY, p.y)
        maxX = Math.max(maxX, p.x)
        maxY = Math.max(maxY, p.y)
    }
    const bw = Math.max(maxX - minX, 1)
    const bh = Math.max(maxY - minY, 1)
    const k = Math.min((to.w - pad * 2) / bw, (to.h - pad * 2) / bh)
    const offX = (to.w - bw * k) / 2 - minX * k
    const offY = (to.h - bh * k) / 2 - minY * k
    return anchors.map((p) => ({ x: f2(p.x * k + offX), y: f2(p.y * k + offY) }))
}

/* ── 缓动 ──
   预览与导出必须用同一份缓动，否则"页面上节奏对了、导出的 SVG 却不对"。
   所以缓动只在这里定义一次：预览直接调用，导出把它采样成 SMIL 的 values/keyTimes。 */

/** CSS cubic-bezier(x1,y1,x2,y2)：给定线性 t，先解出参数 u 使 X(u)=t，再求 Y(u) */
export function bezierEase(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
    const cx = 3 * x1
    const bx = 3 * (x2 - x1) - cx
    const ax = 1 - cx - bx
    const cy = 3 * y1
    const by = 3 * (y2 - y1) - cy
    const ay = 1 - cy - by
    const sampleX = (u: number) => ((ax * u + bx) * u + cx) * u
    const sampleY = (u: number) => ((ay * u + by) * u + cy) * u
    const slopeX = (u: number) => (3 * ax * u + 2 * bx) * u + cx

    // x1=y1、x2=y2 时就是线性，省掉迭代
    if (x1 === 0 && y1 === 0 && x2 === 1 && y2 === 1) return (t) => t

    return (t: number) => {
        if (t <= 0) return 0
        if (t >= 1) return 1
        let u = t
        for (let i = 0; i < 8; i += 1) {
            const dx = sampleX(u) - t
            if (Math.abs(dx) < 1e-5) break
            const k = slopeX(u)
            if (Math.abs(k) < 1e-6) break
            u -= dx / k
        }
        // 牛顿法偶尔会跑出 [0,1]，兜一次二分
        if (u < 0 || u > 1) {
            let lo = 0
            let hi = 1
            for (let i = 0; i < 20; i += 1) {
                u = (lo + hi) / 2
                if (sampleX(u) < t) lo = u
                else hi = u
            }
        }
        return sampleY(u)
    }
}

export interface EasingDef {
    id: string
    label: string
    cp: [number, number, number, number]
}

/*
 * 缓动只用"单调"的几种（y 不冲出 0~1）。
 *
 * 故意不提供"回弹"这类会过冲的缓动：SMIL 规定 keySplines 的取值必须在 0~1 之间，
 * 过冲的曲线没法精确写成 keySplines，只能退化成"采样成一堆关键帧"的近似写法 ——
 * 而它在路径进度上本来就没有意义：飞机飞到终点就到底了，再"过冲"只会被夹住。
 * 所以这里用一条规则换导出代码的干净与精确：**只留单调缓动**。
 */
export const EASINGS: EasingDef[] = [
    { id: 'linear', label: '匀速', cp: [0, 0, 1, 1] },
    { id: 'in', label: '缓入', cp: [0.42, 0, 1, 1] },
    { id: 'out', label: '缓出', cp: [0, 0, 0.58, 1] },
    { id: 'inout', label: '缓入缓出', cp: [0.42, 0, 0.58, 1] },
    { id: 'outstrong', label: '强缓出', cp: [0.16, 1, 0.3, 1] },
    { id: 'soft', label: '柔和', cp: [0.22, 1, 0.36, 1] },
]

export const easingById = (id: string) => EASINGS.find((e) => e.id === id) ?? EASINGS[0]

export const easeFn = (id: string) => {
    const [x1, y1, x2, y2] = easingById(id).cp
    return bezierEase(x1, y1, x2, y2)
}

/* ── 命中：把点投到"锚点折线"上 ──
   编辑态点一下航线要在最近处插入锚点。这里刻意投到**锚点连成的折线**而不是平滑后的曲线：
   插入位置的语义是"插在第 i 个锚点之后"，用折线算既简单又和数据结构一一对应。 */

export interface Projection {
    /** 插到这个下标之后（即新锚点放在 index 与 index+1 之间） */
    afterIndex: number
    /** 投影点 */
    point: Pt
    /** 到折线的距离 */
    dist: number
}

export function projectOnPath(anchors: Pt[], p: Pt): Projection | null {
    if (anchors.length === 0) return null
    if (anchors.length === 1) return { afterIndex: 0, point: anchors[0], dist: dist(p, anchors[0]) }

    let best: Projection = { afterIndex: 0, point: anchors[0], dist: Infinity }
    for (let i = 0; i < anchors.length - 1; i += 1) {
        const a = anchors[i]
        const b = anchors[i + 1]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const lenSq = dx * dx + dy * dy
        let t = lenSq === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq
        t = Math.max(0, Math.min(1, t))
        const point = { x: a.x + t * dx, y: a.y + t * dy }
        const d = dist(p, point)
        if (d < best.dist) best = { afterIndex: i, point, dist: d }
    }
    return best
}

/* ── 杂项 ── */

/** 把 "960x540" 之类的比例预设展开成具体画幅 */
export const RATIOS = [
    { id: '16:9', label: '16 : 9', w: 960, h: 540 },
    { id: '4:3', label: '4 : 3', w: 960, h: 720 },
    { id: '1:1', label: '1 : 1', w: 800, h: 800 },
    { id: '9:16', label: '9 : 16', w: 540, h: 960 },
] as const

export type RatioId = (typeof RATIOS)[number]['id']

export const ratioById = (id: string) => RATIOS.find((r) => r.id === id) ?? RATIOS[0]

/** 四舍五入到 0.1，用于界面上的数值显示 */
export const round1 = (n: number) => Math.round(n * 10) / 10
