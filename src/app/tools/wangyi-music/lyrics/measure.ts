/*
 * 文字宽度测量 —— 两种风格都要在**画之前**知道一段文字有多宽：
 *   流光：要按"词放大之后"的宽度给邻居留够间距，否则当前词一弹就压到隔壁；
 *   静流：一行必须保持单行，量出比可用宽度长就整行缩字号。
 * 都走同一张离屏 canvas：和浏览器排版同一套字体，量出来的值能直接用。
 */

let measureCanvas: HTMLCanvasElement | null = null

/** 没有 DOM（服务端渲染）时按 0.65 个字号估一个字，够布局用。 */
const roughWidth = (text: string, px: number) => text.length * px * 0.65

export function measureTextWidth(text: string, px: number, fontStack: string, fontWeight: number): number {
    if (!text) return 0
    if (typeof document === 'undefined') return roughWidth(text, px)
    if (!measureCanvas) measureCanvas = document.createElement('canvas')
    const ctx = measureCanvas.getContext('2d')
    if (!ctx) return roughWidth(text, px)
    ctx.font = `${fontWeight} ${px}px ${fontStack}`
    return ctx.measureText(text).width
}
