/*
 * 音频分析：把 <audio> 接到 AnalyserNode 上，逐帧输出低/中/高频能量与起音密度。
 *
 * 歌词动画本身不依赖它 —— 主流音乐软件的歌词页就是"模糊封面 + 滚动高亮"，
 * 这里只用来让画面跟着音乐轻轻呼吸一下（背景的明暗、当前句的辉光）。
 *
 * 全链路容错：CORS 不通、AudioContext 被拦、浏览器不支持、上下文被挂起（数据全 0）
 * —— 一律降级成 ready:false，画面照常，绝不影响播放。
 */

export type AudioSample = {
  /** 是否拿到了真实音频数据（false 时画面用合成曲线顶上） */
  ready: boolean
  /** 总体能量 0~1 */
  level: number
  /** 低频（底鼓、贝斯）0~1 */
  bass: number
  /** 中频（人声、主乐器）0~1 */
  mid: number
  /** 高频（镲片、空气感）0~1 */
  treble: number
  /** 本帧是否检测到一次起音（近似节拍） */
  onset: boolean
  /** 最近 3 秒的起音频率，次/秒；乘 60 约等于 BPM/60 */
  onsetRate: number
  /** 逐频段原始数据，用于画频谱（可能为空） */
  spectrum: Uint8Array
}

export const IDLE_SAMPLE: AudioSample = {
  ready: false,
  level: 0,
  bass: 0,
  mid: 0,
  treble: 0,
  onset: false,
  onsetRate: 0,
  spectrum: new Uint8Array(0),
}

type Entry = {
  ctx: AudioContext
  analyser: AnalyserNode
  /** 必须是 Uint8Array<ArrayBuffer>：getByteFrequencyData 不接受 SharedArrayBuffer 后备 */
  data: Uint8Array<ArrayBuffer>
}

/** 同一个 <audio> 只能接一次 MediaElementSource，重复创建会抛错（StrictMode 会双调用） */
const attached = new WeakMap<HTMLAudioElement, Entry>()

/**
 * 唤醒这颗元素所在的那张音频图。
 *
 * 需要它是因为：一旦 createMediaElementSource 把元素接进图里，那声音就只从图里出来，
 * 而**图被挂起就等于没声音**。而且这件事没法撤销 —— dispose() 只能丢引用，
 * 不能把元素从图里摘出来。所以离开全屏歌词之后，元素可能还挂在一张图上，
 * 只是应用已经不持有那张图的引用了。
 * 这里按元素去查注册表（WeakMap 一直在），任何时候都能把挂起的上下文叫醒。
 */
export function wakeElementGraph(audio: HTMLAudioElement | null | undefined) {
  if (!audio) return
  const entry = attached.get(audio)
  if (entry && entry.ctx.state === 'suspended') entry.ctx.resume().catch(() => {})
}

export type AudioAnalyzer = {
  /** 每帧调用一次；未就绪时返回 ready:false */
  sample: () => AudioSample
  /** 在用户手势里调用，尽量把 AudioContext 唤醒（自动播放策略） */
  warmup: () => void
  dispose: () => void
}

const BASS_BINS = 8 // ~43–344Hz
const MID_BINS = 60 // ~387–3kHz
/** 连续这么多帧没有信号就先按"读不到"处理（约 1.5 秒），恢复出声后立刻回到 ready */
const SILENT_LIMIT = 90

/** blob:/data: 不算跨域；同源直链也不需要 CORS 就能接进 WebAudio */
function isSameOrigin(url: string) {
  if (!url) return true
  if (/^(blob:|data:)/.test(url)) return true
  try {
    return new URL(url, window.location.href).origin === window.location.origin
  } catch {
    return false
  }
}

export function attachAudioAnalyzer(audio: HTMLAudioElement): AudioAnalyzer {
  let entry: Entry | null = null
  let failed = false
  let pending: AudioContext | null = null
  let silentFrames = 0
  let disposed = false

  let sBass = 0
  let sMid = 0
  let sTreble = 0
  let sLevel = 0
  let bassAvg = 0.18
  let lastOnset = 0
  const onsets: number[] = []

  /*
   * 这里有一件事必须守住：**绝不让分析器把声音弄没**。
   *
   * createMediaElementSource 会把 <audio> 的输出整个改道进 AudioContext ——
   * 接进去之后，那声音就只从这张图里出来了。而 AudioContext 在拿到用户手势之前
   * 是 suspended 的，图不跑就等于**进度条照样在走、却完全没有声音**。
   * 曾经这里是一进全屏歌词就接（可能在用户还没点过任何东西时），正好踩中这种情况。
   *
   * 所以现在：上下文没确认在跑，就先不接；元素不在 CORS 模式下（跨域音源被摘掉了
   * crossOrigin），也不接 —— 那种情况下接进 WebAudio 同样是静音。
   * 不接的代价只是动画退化成合成曲线，声音永远优先于动画。
   */
  const ensure = (): Entry | null => {
    if (disposed || failed) return null
    if (entry) return entry
    const cached = attached.get(audio)
    if (cached) {
      entry = cached
      return entry
    }
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext
      if (!Ctor) {
        failed = true
        return null
      }
      if (!pending) pending = new Ctor()
      const ctx = pending
      // 挂起就催一下；每个手势之后都会走到这里，所以一旦用户点过，下一帧就能接上
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      if (ctx.state !== 'running') return null
      if (audio.crossOrigin !== 'anonymous' && !isSameOrigin(audio.src)) return null
      const source = ctx.createMediaElementSource(audio)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      analyser.smoothingTimeConstant = 0.72
      source.connect(analyser)
      // 必须再接回输出：只连 analyser 的话声音会没有
      analyser.connect(ctx.destination)
      const data = new Uint8Array(analyser.frequencyBinCount)
      entry = { ctx, analyser, data }
      attached.set(audio, entry)
      return entry
    } catch {
      failed = true
      return null
    }
  }

  const warmup = () => {
    const e = ensure()
    if (e && e.ctx.state === 'suspended') e.ctx.resume().catch(() => {})
  }

  const rate = () => {
    const now = performance.now()
    while (onsets.length && now - onsets[0] > 3000) onsets.shift()
    return (onsets.length / 3000) * 1000
  }

  const sample = (): AudioSample => {
    const e = ensure()
    if (!e) return { ...IDLE_SAMPLE, onsetRate: rate() }
    if (e.ctx.state === 'suspended') e.ctx.resume().catch(() => {})

    e.analyser.getByteFrequencyData(e.data)
    const d = e.data

    let bassSum = 0
    let midSum = 0
    let trebleSum = 0
    for (let i = 1; i <= BASS_BINS && i < d.length; i++) bassSum += d[i]
    for (let i = BASS_BINS + 1; i <= BASS_BINS + MID_BINS && i < d.length; i++) {
      midSum += d[i]
    }
    const trebleEnd = Math.min(d.length - 1, BASS_BINS + MID_BINS + 160)
    let trebleCount = 0
    for (let i = BASS_BINS + MID_BINS + 1; i <= trebleEnd; i++) {
      trebleSum += d[i]
      trebleCount++
    }

    const bass = bassSum / (BASS_BINS * 255)
    const mid = midSum / (MID_BINS * 255)
    const treble = trebleCount ? trebleSum / (trebleCount * 255) : 0
    const level = bass * 0.5 + mid * 0.42 + treble * 0.08

    /*
     * 全 0 不代表"坏了"，可能只是这一刻真的没声音：用户把音量拖到 0、按了静音（M）、
     * 歌曲间奏、或者浏览器把跨域音源静音了。而 element.volume / muted 是在进入
     * 音频图之前生效的 —— 音量 0 时 analyser 读到的就是一片 0。
     * 所以这里只按"连续多少帧没信号"临时降级，绝不永久锁死：
     * 用户一取消静音就要能立刻恢复，否则动画会一直卡在合成曲线里。
     */
    silentFrames = bass + mid + treble < 0.002 ? silentFrames + 1 : 0
    const ready = silentFrames < SILENT_LIMIT

    // 平滑：起音要快、回落要慢，观感才像"跟着音乐呼吸"
    const attack = 0.55
    const release = 0.12
    sBass += (bass - sBass) * (bass > sBass ? attack : release)
    sMid += (mid - sMid) * (mid > sMid ? attack : release)
    sTreble += (treble - sTreble) * (treble > sTreble ? attack : release)
    sLevel += (level - sLevel) * (level > sLevel ? 0.4 : 0.1)

    const now = performance.now()
    let onset = false
    if (sBass > bassAvg * 1.32 + 0.03 && now - lastOnset > 130) {
      onset = true
      lastOnset = now
      onsets.push(now)
    }
    bassAvg += (sBass - bassAvg) * 0.05

    return {
      ready,
      level: sLevel,
      bass: sBass,
      mid: sMid,
      treble: sTreble,
      onset,
      onsetRate: rate(),
      spectrum: d,
    }
  }

  return {
    sample,
    warmup,
    dispose: () => {
      disposed = true
      // 音频元素可能还会继续被复用（比如切换歌曲），所以只丢弃引用，
      // 不 close AudioContext —— close 会把正在播的声音一起掐断。
      entry = null
    },
  }
}
