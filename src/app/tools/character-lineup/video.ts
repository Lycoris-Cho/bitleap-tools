/*
 * WebM 动图导出。
 *
 * 关键点：**必须两趟做，不能边渲染边推帧。**
 *
 * MediaRecorder 给每一帧的时间戳来自**推帧时的真实时钟**。而 html-to-image 把整张海报
 * 克隆成 SVG 再栅格化，一帧要几十毫秒 —— 远慢于 1/30 秒。若边渲染边推，90 帧会花掉七八秒，
 * 视频时间戳就照实记成七八秒，播出来变成慢动作。
 *
 * 所以：
 *   第一趟 —— 把每个时刻的画面渲染成位图，全部备好（这趟耗时最长，但时间戳还没开始记）；
 *   第二趟 —— 按 1/fps 的节奏把位图逐张推到 captureStream(0) 的画布上。
 * 这样时间戳均匀，视频时长就是你要的时长，动画速度也正确。
 *
 * 代价是第一趟会同时持有全部帧的位图（720p、72 帧约 250MB），所以画幅/时长/帧率都设了上限。
 */

import { toCanvas } from 'html-to-image'
import { POSTER_W } from './types'

export interface WebmOptions {
    node: HTMLElement
    /** 目标像素宽（例如 1280 = 720p）；高按海报比例算 */
    width: number
    fps: number
    seconds: number
    /** 渲染第 t 秒那一帧：调用方负责把海报摆到该时刻 */
    renderAt: (t: number) => void
    fontEmbedCSS?: string
    backgroundColor: string
    onProgress?: (phase: 'render' | 'encode', done: number, total: number) => void
    isCancelled?: () => boolean
}

/** 单次导出的帧数上限：再多会同时占住太多位图内存 */
export const MAX_FRAMES = 150

function pickMime(): string {
    if (typeof MediaRecorder === 'undefined') return ''
    for (const m of ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']) {
        if (MediaRecorder.isTypeSupported(m)) return m
    }
    return ''
}

export const canRecordWebm = () => Boolean(pickMime()) && typeof HTMLCanvasElement.prototype.captureStream === 'function'

export async function recordPosterWebm(opts: WebmOptions): Promise<Blob> {
    const mimeType = pickMime()
    if (!mimeType) throw new Error('当前浏览器不支持 WebM 录制')

    const height = Math.round((opts.width * 1440) / POSTER_W)
    const total = Math.min(MAX_FRAMES, Math.max(1, Math.round(opts.fps * opts.seconds)))
    const pixelRatio = opts.width / POSTER_W

    const canvas = document.createElement('canvas')
    canvas.width = opts.width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('无法创建画布')

    /* ── 第一趟：把每一帧都渲染成位图 ── */
    const frames: ImageBitmap[] = []
    try {
        for (let i = 0; i < total; i += 1) {
            if (opts.isCancelled?.()) throw new Error('已取消')
            opts.renderAt(i / opts.fps)
            const shot = await toCanvas(opts.node, {
                pixelRatio,
                // 用户上传的是 blob: 地址，加查询串会让它失效（html-to-image 的坑）
                cacheBust: false,
                backgroundColor: opts.backgroundColor,
                ...(opts.fontEmbedCSS ? { fontEmbedCSS: opts.fontEmbedCSS } : {}),
            })
            frames.push(await createImageBitmap(shot))
            opts.onProgress?.('render', i + 1, total)
        }

        /* ── 第二趟：按固定节奏推帧 ── */
        const stream = canvas.captureStream(0)
        const track = stream.getVideoTracks()[0] as MediaStreamTrack & { requestFrame?: () => void }
        const recorder = new MediaRecorder(stream, {
            mimeType,
            videoBitsPerSecond: opts.width >= 1920 ? 12_000_000 : 8_000_000,
        })
        const chunks: BlobPart[] = []
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data)
        }
        const stopped = new Promise<void>((resolve) => {
            recorder.onstop = () => resolve()
        })

        recorder.start()
        const interval = 1000 / opts.fps
        for (let i = 0; i < frames.length; i += 1) {
            if (opts.isCancelled?.()) break
            const started = performance.now()
            ctx.drawImage(frames[i], 0, 0, opts.width, height)
            track.requestFrame?.()
            opts.onProgress?.('encode', i + 1, frames.length)
            // 让每一帧落在它该在的时间点上（渲染已经提前做完，这里只等）
            const rest = interval - (performance.now() - started)
            if (rest > 0) await new Promise((r) => setTimeout(r, rest))
        }
        // 收尾留一帧的时间，最后那帧才不会被丢掉
        await new Promise((r) => setTimeout(r, interval + 60))
        recorder.stop()
        await stopped

        if (chunks.length === 0) throw new Error('录制没有产出任何数据')
        return new Blob(chunks, { type: mimeType })
    } finally {
        // 位图占的是 GPU/系统内存，必须手动释放
        for (const f of frames) f.close()
    }
}
