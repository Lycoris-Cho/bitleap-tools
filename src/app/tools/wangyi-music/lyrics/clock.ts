/*
 * 播放时钟 —— 把 <audio>.currentTime 变成一条连续、精确、可校准的时间轴。
 *
 * 为什么不直接拿 audio.currentTime 驱动逐字歌词：
 *   ① 它不是逐帧更新的。浏览器内部按十几到几十毫秒（Chromium 系跟着 timeupdate，约 250ms）
 *      的**台阶**推进这个值：台阶之间它纹丝不动，跨台阶时整块跳一格。逐字动画按它走，
 *      字与字之间会整体偏后半拍，而且是"跳着走"的；
 *   ② 它是"上一次更新时媒体到过哪儿"，天然**落后于此刻的真实位置**，平均差半档。
 *      这一档就是常说的"歌词慢半拍" —— 见下面 autoLead；
 *   ③ 它标的是媒体时间轴上的位置，而耳朵听到的声音还要过一层输出缓冲才出来
 *      （有线 20~40ms，蓝牙 150~300ms）。这是设备相关的量，只能由用户校准，见 offset；
 *   ④ 拖动进度条之后它要等浏览器真的把 seek 做完才变（网络流上可能几百毫秒），
 *      这段时间画面会停在旧位置；缓冲（waiting / stalled）时它完全不推进。
 *
 * 做法：以一次真实采样当锚点（媒体时刻 + performance.now() + playbackRate），两次采样之间
 * 用墙上时钟线性外推 —— 于是时间轴每帧都在走，且永远朝真实值收敛。
 *
 * 校正只动"读出的速度"，绝不把读出值直接挪到采样值上去。这一点是整个模块的关键：
 * currentTime 是个只往前跳的**下界**，把画面生硬地挪到下界上，每次跨台阶都会看见一次跳变。
 * 所以三个分支是这么分的：
 *   落后于下界  —— 实实在在地慢半拍了，用正的速度偏置追；
 *   略微领先下界 —— 正是我们要的（台阶之间的位置只能靠推算），不管它；
 *   领先太多    —— 用负的速度偏置慢慢退回来，绝不做跳变。
 */

/** 落后/领先在它以内就当没有误差：避免逐帧采样把读出速度调得发抖 */
const CALM_BAND = 0.05
/** 误差超过它就硬对齐：这种情况多半是 seek / 换源 / 卡顿恢复，平滑追会拖很久 */
const HARD_DRIFT = 0.35
/** 把一次误差摊到这么久里追完（秒）。越大越平滑，越小越跟手 */
const CORRECTION_WINDOW = 0.4
/** 读出速度最多偏离正常速度多少（±8%）：再大就能看出画面在快放或慢放了 */
const MAX_RATE_BIAS = 0.08
/** 两次真实采样之间的最小间隔（秒）。这个值也决定了台阶估计能分辨到多细，别调大 */
const SAMPLE_INTERVAL = 0.05
/**
 * 媒体管线卡住（缓冲、解码跟不上）时，画面最多允许超前最后一次真实采样这么多。
 *
 * 注意它只在"下界已经不往前走"时生效（见 STALL_GRACE）—— 这是这块最容易写错的地方：
 * 台阶式 currentTime 在正常播放时**看起来**也总是落后于画面，那是它的常态，不是卡顿。
 * 若不分青红皂白地拿它当上限，画面会在每次跨台阶前被卡住几十毫秒（实测每 200ms 冻结一次），
 * 比原来的台阶还难看。
 */
const MAX_RUN_AHEAD = 0.35
/**
 * 下界超过这么久没有往前动，才认定是卡住了。
 * 必须大于"浏览器更新下界的间隔 + 我们采样的间隔"（Chromium 约 250ms + 50ms），
 * 否则正常的台阶会被当成卡顿。
 */
const STALL_GRACE = 0.6
/**
 * 自己发起的 seek 落地之前，先按住目标时刻不放的宽限期。
 * 浏览器对 `currentTime = x` 通常会把 seeking 立刻置真，但也有不置真的情形（目标已在缓冲区内、
 * 或此刻还不可 seek）。若不加宽限，下一帧就会读到旧位置并把画面拽回去，拖动进度条会看见回弹。
 */
const SEEK_GRACE = 0.25

/*
 * ── 台阶补偿 ──
 *
 * 下界只在浏览器更新它的那一刻成立，而**更新间隔本身就是误差上限**：我们手上最新的
 * "确定位置"平均比真实位置旧半档。这半档不补掉，歌词就是稳定地慢半拍 —— 而且它不会随时间
 * 累积（速率是对的），所以光看"有没有越走越偏"根本发现不了。
 *
 * 好在这一档是**能测出来的**：盯着下界每次前进多少，取中位数就是它的更新间隔。
 * 采样比更新细（50ms vs 250ms）时，前进量会出现"若干次 0 + 一次整档"，
 * 中位数正好落在那一档上；若浏览器本来就给得很细（每帧都更新），前进量就是采样间隔本身，
 * 补出来的量自然很小。于是这个补偿能自适应，不需要给任何机型写死数字。
 */
const STEP_SAMPLES = 24
const MIN_STEP_SAMPLES = 6
/** 补偿量上限（秒）：测不准时最多补这么多，绝不把歌词顶到人声前面去 */
const MAX_AUTO_LEAD = 0.12
/**
 * 补偿量每秒最多变化多少（秒/秒）。
 *
 * 补偿量是直接加在读出位置上的，它一变画面就跟着挪 —— 估算收敛的过程中它会动好几次，
 * 突变就是看得见的跳格。所以估出来的值只当目标，实际生效的量一秒最多走这么多，
 * 收敛过程大约一秒，代价只是那段时间读出速度偏快十几个百分点，看不出来。
 */
const AUTO_LEAD_SLEW = 0.15

const wallNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export interface PlaybackClockOptions {
    /** 歌词偏移（秒），正数 = 歌词提前。由用户在舞台上校准 */
    getOffset?: () => number
}

export interface PlaybackClock {
    /** 校准后的歌词时间（秒）：连续、已补偿台阶、已按 offset 修正 */
    now: () => number
    /** 未校准的媒体时间（秒）：进度条与拖动用，绝不能带上歌词偏移 */
    mediaTime: () => number
    /** 立刻把时间轴落到目标时刻：拖动进度条时用，不必等浏览器真的 seek 完 */
    seek: (time: number) => void
    /** 手动对齐一次（外部读到新的 currentTime 时用） */
    sync: () => void
    dispose: () => void
}

export function createPlaybackClock(audio: HTMLAudioElement, options: PlaybackClockOptions = {}): PlaybackClock {
    const { getOffset } = options

    /** 锚点：anchorWall 那一刻，媒体时间轴在 anchorMedia */
    let anchorMedia = 0
    let anchorWall = wallNow()
    let rate = 1
    /** 读出速度的临时偏置，用来把误差平滑抹掉；它只影响"接下来这段"走多快 */
    let bias = 0
    let running = false
    /** 我们自己发起的 seek 还没落地：这段时间不理会 currentTime 的旧值 */
    let ownSeek = false
    let seekWall = Number.NEGATIVE_INFINITY
    /** 最后一次真实采样到的媒体时刻，也是"卡住时最多允许超前"的基准 */
    let sampledMedia = 0
    let sampledWall = Number.NEGATIVE_INFINITY
    /** 下界最后一次**发生变化**的时刻：用它区分"台阶"与"真的卡住了" */
    let lastFloor = Number.NaN
    let floorMovedWall = wallNow()
    /** 台阶补偿：targetAutoLead 是估出来的目标，autoLead 是此刻真正生效的量（缓变） */
    let autoLead = 0
    let targetAutoLead = 0
    let leadWall = wallNow()
    let stepHistory: number[] = []
    let disposed = false

    const readMedia = () => {
        const value = audio.currentTime
        return Number.isFinite(value) && value >= 0 ? value : 0
    }

    const readRate = () => {
        const value = audio.playbackRate
        return Number.isFinite(value) && value > 0 ? value : 1
    }

    /** 重新打锚：从现在起，时间轴从 media 开始按当前倍速走 */
    const reanchor = (media: number, wall = wallNow(), markSampled = true) => {
        anchorMedia = media
        anchorWall = wall
        rate = readRate()
        bias = 0
        if (markSampled) {
            sampledMedia = media
            sampledWall = wall
            lastFloor = media
            floorMovedWall = wall
        }
    }

    /** 换源 / seek / 起停：这些都不是"台阶前进"，估计器要从头再来 */
    const resetSteps = () => {
        stepHistory = []
        targetAutoLead = 0
        // 这些时刻时间轴本来就要整块落下去，补偿量跟着归零不会多出一次可见的跳变
        autoLead = 0
        leadWall = wallNow()
    }

    const shouldRun = () => !audio.paused && !audio.ended && !ownSeek

    /** 当前应该走到的媒体时刻（未校准）：外推；只有确认卡住时才设上限 */
    const extrapolate = () => {
        if (!running) return anchorMedia
        const wall = wallNow()
        const ahead = (wall - anchorWall) * rate * (1 + bias)
        if (!(ahead > 0)) return anchorMedia
        const value = anchorMedia + ahead
        if (wall - floorMovedWall <= STALL_GRACE) return value
        return Math.min(value, sampledMedia + MAX_RUN_AHEAD)
    }

    /** 记一次下界前进，用来估更新间隔 */
    const noteFloorStep = (delta: number) => {
        stepHistory.push(delta)
        if (stepHistory.length > STEP_SAMPLES) stepHistory.shift()
        if (stepHistory.length < MIN_STEP_SAMPLES) return
        const sorted = [...stepHistory].sort((a, b) => a - b)
        targetAutoLead = clamp(sorted[sorted.length >> 1] / 2, 0, MAX_AUTO_LEAD)
    }

    /** 让生效的补偿量朝估算目标缓慢靠拢，避免读出位置突变 */
    const rampAutoLead = (wall: number) => {
        // leadWall 每次都推进：中间隔了多久就只能走多久的量，
        // 否则一次补太多会在单帧里把画面顶出去（实测能到 0.15 秒）。
        const step = AUTO_LEAD_SLEW * Math.max(0, wall - leadWall)
        leadWall = wall
        if (autoLead === targetAutoLead) return
        autoLead += clamp(targetAutoLead - autoLead, -step, step)
    }

    /**
     * 用一次真实采样校正外推。只调读出速度，不做跳变。
     * force = 忽略采样间隔（离散事件上必须立刻看一眼）。
     */
    const sample = (force = false, hard = false) => {
        if (disposed) return
        const wall = wallNow()

        // 自己发起的 seek 还没落地：currentTime 可能还是旧位置，读了会把画面拽回去。
        // 按住目标时刻，等 seeking 结束（或宽限期过完）再回到真实值。
        if (ownSeek) {
            if (!audio.seeking && wall - seekWall > SEEK_GRACE) {
                ownSeek = false
                reanchor(readMedia(), wall)
                running = shouldRun()
            }
            return
        }
        if (!force && wall - sampledWall < SAMPLE_INTERVAL) return

        const media = readMedia()
        const predicted = extrapolate()
        const drift = media - predicted
        sampledMedia = media
        sampledWall = wall
        rampAutoLead(wall)
        if (media !== lastFloor) {
            const delta = media - lastFloor
            lastFloor = media
            floorMovedWall = wall
            // 倒退或大跳（seek / 换源）不是台阶，别喂给估计器
            if (delta > 0 && delta < HARD_DRIFT) noteFloorStep(delta)
        }

        if (hard || Math.abs(drift) > HARD_DRIFT) {
            reanchor(media, wall)
            resetSteps()
            running = shouldRun()
            return
        }

        /*
         * 只改速度，不挪位置：锚点落在**当前读出值**上（值本身连续，所以看不见跳变），
         * 误差则换算成一个临时的速度偏置，在这之后的一小段时间里走完。
         * 略微领先下界是允许的 —— 那正是台阶之间只能靠推算的部分，只有领先太多才退回来。
         */
        reanchor(predicted, wall, false)
        if (drift > CALM_BAND) {
            bias = clamp(drift / CORRECTION_WINDOW, 0, MAX_RATE_BIAS)
        } else if (drift < -CALM_BAND) {
            bias = -clamp((-drift - CALM_BAND) / CORRECTION_WINDOW, 0, MAX_RATE_BIAS)
        }
        running = shouldRun()
    }

    const onTimeUpdate = () => sample(true)
    const onSeeked = () => {
        ownSeek = false
        sample(true, true)
    }
    const onSeeking = () => {
        // 外部（系统媒体控制等）发起的 seek：也按"自己发起"处理，避免读到旧值
        ownSeek = true
        seekWall = wallNow()
    }
    /*
     * 注意 resetSteps() 只出现在"声源的更新节奏可能变了"的地方：换源、拿到新元数据、改倍速。
     * 起停与拖动都不重置 —— 下界的更新间隔是浏览器与媒体管线的性质，跟播放状态无关；
     * 一暂停就清空的话，恢复播放后补偿要从 0 重新爬 0.8 秒，那段时间歌词会重新慢半拍。
     */
    const onPlay = () => {
        reanchor(readMedia())
        ownSeek = false
        running = true
    }
    const onPlaying = () => {
        ownSeek = false
        sample(true, true)
        running = true
    }
    const onPause = () => {
        reanchor(readMedia())
        running = false
    }
    const onRateChange = () => {
        // 先把当前时刻固定下来，再按新倍速继续走；倍速一变，原来的台阶估计不成立了
        reanchor(extrapolate(), wallNow(), false)
        resetSteps()
        running = shouldRun()
    }
    const onStalled = () => sample(true)
    const onWaiting = () => sample(true)
    const onLoadedMetadata = () => {
        ownSeek = false
        reanchor(readMedia())
        resetSteps()
        running = shouldRun()
    }
    /** 换源 / 清空：时间轴归零并停下，等新的媒体数据进来 */
    const onReset = () => {
        ownSeek = false
        reanchor(0)
        resetSteps()
        running = false
    }
    const onEnded = () => {
        reanchor(readMedia())
        running = false
    }

    const listeners: Array<[keyof HTMLMediaElementEventMap, EventListener]> = [
        ['timeupdate', onTimeUpdate],
        ['seeked', onSeeked],
        ['seeking', onSeeking],
        ['play', onPlay],
        ['playing', onPlaying],
        ['pause', onPause],
        ['ratechange', onRateChange],
        ['stalled', onStalled],
        ['waiting', onWaiting],
        ['loadedmetadata', onLoadedMetadata],
        ['loadstart', onReset],
        ['emptied', onReset],
        ['ended', onEnded],
    ]
    for (const [event, handler] of listeners) audio.addEventListener(event, handler)

    running = shouldRun()
    reanchor(readMedia())
    resetSteps()

    return {
        now: () => {
            sample()
            return extrapolate() + autoLead + (getOffset?.() ?? 0)
        },
        mediaTime: () => {
            sample()
            return extrapolate()
        },
        seek: (time: number) => {
            const target = Number.isFinite(time) ? Math.max(0, time) : 0
            ownSeek = true
            seekWall = wallNow()
            reanchor(target)
            resetSteps()
            // seek 期间画面停在目标时刻：声音还没到，让词先等着比让它跑过去好
            running = false
        },
        sync: () => sample(true),
        dispose: () => {
            disposed = true
            for (const [event, handler] of listeners) audio.removeEventListener(event, handler)
        },
    }
}
