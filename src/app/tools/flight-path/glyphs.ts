/*
 * 内置飞行图形。
 *
 * 约定：**全部朝 +x（右）方向设计，几何中心在原点附近**。
 * 这样摆放它们只需要 `translate(位置) rotate(切线角 + 用户偏移)`，
 * 不需要为每个图形单独调偏移量 —— 也正因为如此，切线角可以直接当旋转角用。
 *
 * 只存 path 的 d，不存 JSX：预览、导出 SVG、导出 React 组件三处共用同一份数据，
 * 不会出现"预览用的是 A 图形、导出成了 B"。
 */

export interface Glyph {
    id: string
    label: string
    d: string
}

/** 五角星：算出来而不是手写，保证十个点精确等分、且一个角正对 +x */
const starPath = (() => {
    const outer = 9.2
    const inner = 3.9
    const pts: string[] = []
    for (let i = 0; i < 10; i += 1) {
        const ang = (i * Math.PI) / 5
        const r = i % 2 === 0 ? outer : inner
        pts.push(`${(Math.cos(ang) * r).toFixed(2)} ${(Math.sin(ang) * r).toFixed(2)}`)
    }
    return `M${pts[0]}L${pts.slice(1).join('L')}Z`
})()

/** 正圆：用两段半圆弧写成 path，好处是六个图形在导出时是同一种元素，不用分支处理 */
const dotPath = 'M5 0A5 5 0 1 1 -5 0A5 5 0 1 1 5 0Z'

export const GLYPHS: Glyph[] = [
    {
        id: 'plane',
        label: '飞机',
        // 俯视民航客机：机鼻在最右，中部是后掠翼，尾部是水平尾翼
        d: 'M12 0L4 -1.2L-2 -1.2L-5 -8L-7.2 -8L-6 -1.2L-9 -1.2L-10.4 -3.2L-11.6 -3.2L-10.6 0L-11.6 3.2L-10.4 3.2L-9 1.2L-6 1.2L-7.2 8L-5 8L-2 1.2L4 1.2Z',
    },
    {
        id: 'paper',
        label: '纸飞机',
        // 经典的"发送"箭头：一个带缺口的飞镖
        d: 'M11.5 0L-9.5 -8.6L-5.6 0L-9.5 8.6Z',
    },
    {
        id: 'rocket',
        label: '火箭',
        // 尖头 + 柱体 + 两片尾翼
        d: 'M12 0C8 -3 3 -3.6 0 -3.6L-2 -3.6L-5 -7.6L-7.6 -7.6L-6.4 -3.6L-9 -3.6L-9 3.6L-6.4 3.6L-7.6 7.6L-5 7.6L-2 3.6L0 3.6C3 3.6 8 3 12 0Z',
    },
    {
        id: 'arrow',
        label: '箭头',
        d: 'M12 0L2 -7.6L2 -2.6L-12 -2.6L-12 2.6L2 2.6L2 7.6Z',
    },
    {
        id: 'star',
        label: '星星',
        d: starPath,
    },
    {
        id: 'dot',
        label: '圆点',
        d: dotPath,
    },
]

export const glyphById = (id: string): Glyph => GLYPHS.find((g) => g.id === id) ?? GLYPHS[0]
