/*
 * 站位算法与图像工具 —— 全部纯函数（抠图那个需要 canvas，但也是无状态的一次性转换）。
 *
 * "大气"全靠 buildLineup 这一段：
 *   主角居中 → 其余左右**交替**向外排 → 越靠外越小、越靠外越"靠后" → 相邻略微重叠产生纵深
 *   → 最后把整排等比缩放着装进安全区（所以 2 个人和 12 个人都刚好铺满、两边留白对称）。
 * 把它写成纯函数是为了能被单测钉死：不溢出、主角居中、左右对称。
 */

import { POSTER_W, SAFE, SLOT_H, SLOT_W, type CharacterItem, type LineupConfig } from './types'

export interface Slot {
    /** 在原数组里的下标 */
    index: number
    /** 从主角往外第几层（0 = 主角） */
    depth: number
    /** 底边中点 x */
    x: number
    /** 底边 y */
    y: number
    /** 最终缩放 */
    scale: number
    z: number
    /** 槽位盒尺寸（已含缩放） */
    w: number
    h: number
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

/** 每往外一层的缩放；最外层也不小于 0.3，免得最边上的人小到看不清 */
const scaleOf = (depth: number, cfg: LineupConfig) => Math.max(0.3, cfg.mainScale * (1 - cfg.shrink * depth))

/**
 * 计算站位。
 * heroIndex 是主角在原数组里的下标；其余人按数组顺序左右交替分配，
 * 这样左右两侧的"层数"始终一一对应 —— 人数是奇数还是偶数都不会歪。
 */
export function buildLineup(items: CharacterItem[], cfg: LineupConfig, heroIndex: number): Slot[] {
    const n = items.length
    if (n === 0) return []

    const hero = heroIndex >= 0 && heroIndex < n ? heroIndex : Math.floor(n / 2)
    const rest = items.map((_, i) => i).filter((i) => i !== hero)

    // 左右交替：第 0 个去右边、第 1 个去左边、第 2 个又去右边……
    const right: number[] = []
    const left: number[] = []
    rest.forEach((idx, i) => (i % 2 === 0 ? right : left).push(idx))

    type Raw = { index: number; depth: number; side: number; scale: number }
    const raw: Raw[] = [{ index: hero, depth: 0, side: 0, scale: scaleOf(0, cfg) }]
    right.forEach((idx, i) => raw.push({ index: idx, depth: i + 1, side: 1, scale: scaleOf(i + 1, cfg) }))
    left.forEach((idx, i) => raw.push({ index: idx, depth: i + 1, side: -1, scale: scaleOf(i + 1, cfg) }))

    const step = SLOT_W * cfg.slotSpacing
    const centerX = POSTER_W / 2

    // 第一遍：按公式摆开，量出整排包围盒
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    const placed = raw.map((r) => {
        const w = SLOT_W * r.scale
        const h = SLOT_H * r.scale
        const x = centerX + r.side * r.depth * step
        const y = SAFE.baseline - cfg.rise * r.depth
        minX = Math.min(minX, x - w / 2)
        maxX = Math.max(maxX, x + w / 2)
        minY = Math.min(minY, y - h)
        maxY = Math.max(maxY, y)
        return { ...r, x, y, w, h }
    })

    // 第二遍：等比缩放到安全区里，再对齐。
    /*
     * 横向**以主角为轴**缩放，而不是"把整排包围盒居中"。
     * 因为"居中主视觉"要求主角永远在正中；而偶数人时两侧人数不等（右侧先排），
     * 若按包围盒居中，主角会被推离中线。以主角为轴、并按**两侧较大的那一侧**定缩放，
     * 就能同时保证：主角居中 + 任何一侧都不越界。
     */
    const boxH = Math.max(1, maxY - minY)
    const halfNeed = Math.max(maxX - centerX, centerX - minX)
    const halfSafe = (SAFE.x1 - SAFE.x0) / 2
    const fit = Math.min(1, halfSafe / Math.max(1, halfNeed), (SAFE.baseline - SAFE.top) / boxH)

    const cy = (minY + maxY) / 2
    const bottomAfter = cy + (maxY - cy) * fit
    const ty =
        cfg.align === 'baseline'
            ? SAFE.baseline - bottomAfter
            : SAFE.top + (SAFE.baseline - SAFE.top) / 2 - cy

    const slots: Slot[] = placed.map((p) => {
        const scale = p.scale * fit
        return {
            index: p.index,
            depth: p.depth,
            x: centerX + (p.x - centerX) * fit,
            y: cy + (p.y - cy) * fit + ty,
            scale,
            // 主角最前，越靠外越在后 —— 相邻人物因此略有重叠，才像群像站位
            z: 100 - p.depth,
            w: SLOT_W * scale,
            h: SLOT_H * scale,
        }
    })

    return slots
}

/** 主角默认取列表中间那位 */
export const defaultHeroIndex = (count: number) => (count === 0 ? -1 : Math.floor(count / 2))

/* ── 颜色工具 ── */

const clamp255 = (n: number) => clamp(Math.round(n), 0, 255)

export function parseHex(hex: string): [number, number, number] {
    const h = hex.replace('#', '').trim()
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
    const n = Number.parseInt(full.slice(0, 6) || '000000', 16)
    if (!Number.isFinite(n)) return [0, 0, 0]
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export const withAlpha = (hex: string, a: number) => {
    const [r, g, b] = parseHex(hex)
    return `rgba(${r}, ${g}, ${b}, ${clamp(a, 0, 1)})`
}

export const mixHex = (from: string, to: string, t: number) => {
    const a = parseHex(from)
    const b = parseHex(to)
    const k = clamp(t, 0, 1)
    return `rgb(${clamp255(a[0] + (b[0] - a[0]) * k)}, ${clamp255(a[1] + (b[1] - a[1]) * k)}, ${clamp255(a[2] + (b[2] - a[2]) * k)})`
}

/* ── 去纯色底 ──
   只做一件事：把"角落那几个像素的颜色"认成背景色，然后把整张图里跟它接近的像素抠成透明。
   所以它**只适合纯色底 / 近白底**的图（AI 出图很常见），遇到复杂背景会抠不干净 ——
   这一点在界面上直接写明，不假装它是通用抠图。
   （你站点里真正的通用抠图引擎在 rongtu，这里不碰。） */

export interface KeyResult {
    url: string
    /** 四角颜色的离散程度：越大说明背景越不纯，效果越不可靠 */
    spread: number
    /** 被抠掉的比例，用来判断是不是把人物也抠了 */
    removedRatio: number
}

/** 读一张图（抠图用；这里是唯一需要 canvas 的地方，其余全是纯函数） */
const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('图片加载失败'))
        img.crossOrigin = 'anonymous'
        img.src = src
    })

export async function keyOutBackground(src: string, tolerance = 34, feather = 26, maxSide = 2000): Promise<KeyResult> {
    const img = await loadImage(src)
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.max(1, Math.round(img.naturalWidth * scale))
    const h = Math.max(1, Math.round(img.naturalHeight * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('无法创建画布')
    ctx.drawImage(img, 0, 0, w, h)

    const data = ctx.getImageData(0, 0, w, h)
    const px = data.data

    // 四角各取一块的平均色，再取它们的平均作为背景色；离散度用来提示"背景不纯"
    const cornerSize = Math.max(2, Math.round(Math.min(w, h) * 0.03))
    const corners: Array<[number, number, number]> = []
    for (const [ox, oy] of [
        [0, 0],
        [w - cornerSize, 0],
        [0, h - cornerSize],
        [w - cornerSize, h - cornerSize],
    ] as const) {
        let r = 0
        let g = 0
        let b = 0
        let c = 0
        for (let y = oy; y < oy + cornerSize; y += 1) {
            for (let x = ox; x < ox + cornerSize; x += 1) {
                const i = (y * w + x) * 4
                r += px[i]
                g += px[i + 1]
                b += px[i + 2]
                c += 1
            }
        }
        corners.push([r / c, g / c, b / c])
    }

    const bg: [number, number, number] = [0, 1, 2].map((k) => corners.reduce((s, c) => s + c[k], 0) / corners.length) as [number, number, number]
    const spread = Math.max(
        ...corners.map((c) => Math.hypot(c[0] - bg[0], c[1] - bg[1], c[2] - bg[2])),
    )

    const lo = tolerance
    const hi = tolerance + feather
    let removed = 0
    for (let i = 0; i < px.length; i += 4) {
        const d = Math.hypot(px[i] - bg[0], px[i + 1] - bg[1], px[i + 2] - bg[2])
        if (d <= lo) {
            px[i + 3] = 0
            removed += 1
        } else if (d < hi) {
            // 羽化：边缘留一层半透明，避免锯齿状的硬边
            px[i + 3] = Math.min(px[i + 3], Math.round(((d - lo) / (hi - lo)) * 255))
        }
    }

    ctx.putImageData(data, 0, 0)
    return { url: canvas.toDataURL('image/png'), spread, removedRatio: removed / ((w * h) || 1) }
}
