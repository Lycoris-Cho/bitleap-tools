/*
 * 逐字扫光 —— 静流这一档的光。
 *
 * 一个词画两层：暗层是"还没唱到"的字，亮层是同一段字，它的**遮罩**右边界跟着
 * **这个词自己的时刻**往右推，推过去的部分就是已经唱到的。
 * 进度直接挂在 MotionValue 上：它每帧都在动，而 React 一次都不重渲染。
 *
 * 为什么是遮罩（mask-image）而不是 clip-path：
 *   clip-path 的边是**硬的**，光到哪儿就是一刀切，边界上那条线看得见，
 *   连带着字的阴影也被切断。遮罩用一段渐变收尾（羽化），边界就化成一道光的斜坡。
 *   两者都只影响绘制、不触发布局，逐帧变也不会引起重排。
 *
 * 遮罩必须比字**大一圈**（PAD）：遮罩是乘在元素盒上的，盒外的画面一律乘 0。
 * 而亮层是紧着文字收缩的，盒高只有行高（1.08em），**比字体实际的 ascent+descent 盒还矮** ——
 * 于是字的下缘（中文尤其明显，字面本来就靠下）和摊到盒外的光晕会被遮罩割掉：
 * 看上去就是"字底部有一条没光、且边界是一条直线"。所以这里四周各留 PAD，
 * 再用等量 padding 把文字压回原来的位置（内容盒顶边不变 → 两层依然严丝合缝）。
 */

import { memo } from 'react'
import { motion, useTransform, type MotionValue } from 'framer-motion'
import type { StageLine, StageWord } from './types'
import { buildDisplayWords } from './parse'

/**
 * 亮层四周留出的余量（px）。
 * 要盖得住两样东西：字体度量盒超出盒高的那几像素（字号越大越多），以及扫光的光晕外溢
 * （最外层阴影半径 34px，再远基本看不见了）。60 对 36~72px 的字号都够。
 */
const GLOW_PAD = 60
/** 光边缘的羽化宽度（px）：让扫过的边界是一道斜坡，而不是一条线 */
const FEATHER_PX = 18

/* ── 一行要画的"文字流" ──
 * YRC 的词自带它自己的空格（在 text 里），LRC 摊开的词则被空格拆没了。
 * 所以这里在"西文接西文"的词之间补一个空格，中日文逐字之间不补。
 * 空格也是文字流的一员（有自己的元素），这样同一行在"淡影"与"正在唱"两种状态下排版完全一致 ——
 * 一行亮起来时，字不会挪位。 */

export interface LineItem {
    key: string
    text: string
    word?: StageWord
    /** 这个词在行里的位置（0 起）：需要错峰或按位置取种子时用它 */
    index?: number
}

const needsSpaceBetween = (left: string, right: string) =>
    /[0-9A-Za-z]$/.test(left) && /^[0-9A-Za-z]/.test(right)

export function buildLineItems(line: StageLine): { items: LineItem[]; text: string } {
    const words = buildDisplayWords(line)
    const items: LineItem[] = []
    words.forEach((word, index) => {
        const previous = words[index - 1]
        if (previous && needsSpaceBetween(previous.text, word.text)) {
            items.push({ key: `gap-${index}`, text: ' ' })
        }
        items.push({ key: `w-${index}`, text: word.text, word, index })
    })
    return { items, text: items.map((item) => item.text).join('') }
}

/** 这个词被唱到的比例（0..1）：整段时长里已经过去多少 */
function singProgress(word: StageWord, time: number): number {
    const span = Math.max(word.endTime - word.startTime, 0.001)
    if (time <= word.startTime) return 0
    if (time >= word.endTime) return 1
    return (time - word.startTime) / span
}

interface SweepWordProps {
    word: StageWord
    currentTime: MotionValue<number>
    baseColor: string
    litColor: string
    /** 亮层的 text-shadow：那一层"光"本身 */
    glow: string
    /** 羽化宽度（px）：按字号给，字大则光的斜坡也长一点 */
    featherPx?: number
}

export const SweepWord = memo(function SweepWord({
    word,
    currentTime,
    baseColor,
    litColor,
    glow,
    featherPx = FEATHER_PX,
}: SweepWordProps) {
    /*
     * 遮罩：左半永远不透明（唱过的部分整块亮着），右边界落在"这个词唱到百分之几"处，
     * 再往右 featherPx 之内渐变到全透明 —— 边界是斜坡。
     *
     * 遮罩盒比词盒四周各宽 GLOW_PAD，所以百分比换算回"词的宽度"要减掉两边的余量：
     * 盒宽 Wm = W + 2P，边界落在词内 p 处 = 盒内 P + pW 处，
     * 写成渐变的 "a% + bpx" 就是 a = p、b = P·(1 − 2p)。p=0 时 b=+P（正好是词首）、
     * p=1 时 b=−P（calc(100% − P) 正好是词尾）、p=0.5 时 b=0（正好是词中），三点都准。
     */
    const mask = useTransform(currentTime, (time) => {
        const progress = singProgress(word, time)
        const stop = (extra: number) =>
            `calc(${(progress * 100).toFixed(3)}% + ${((1 - 2 * progress) * GLOW_PAD + extra).toFixed(2)}px)`
        return `linear-gradient(to right, #000 ${stop(0)}, rgba(0, 0, 0, 0) ${stop(featherPx)})`
    })

    /*
     * 外层必须是 **inline-block**，不能是 inline。
     *
     * 亮层是绝对定位的，它按外层盒的 padding 边定位；而 inline 盒的顶边在"字体 ascent 线"上，
     * 与基线对齐相差半个行距（line-height 1.08 小于字体默认行高时是负的半个行距）。
     * 结果就是亮层比原文**高了一点点**（72px 字号约 3px）—— 两层叠起来看就是"重影"。
     * inline-block 的内容盒顶边与首行行盒顶边重合，两层用同一套半行距，就能严丝合缝。
     *
     * 代价：inline-block 之间不换行。所以折行的那种句子（见 ZenLyrics 的 wrap）不再逐词绘制，
     * 整行走纯文本 —— 那种句子本来也不画扫光层。
     */
    return (
        <span style={{ position: 'relative', display: 'inline-block', whiteSpace: 'pre' }}>
            <span style={{ color: baseColor }}>{word.text}</span>
            <motion.span
                aria-hidden="true"
                data-lit=""
                style={{
                    position: 'absolute',
                    // 盒四周各外扩 GLOW_PAD（-P 的 left/top/right/bottom），再用等量 padding
                    // 把文字压回原位：内容盒顶边不变，两层依旧严丝合缝，但遮罩盖得住字的下缘与光晕。
                    left: -GLOW_PAD,
                    top: -GLOW_PAD,
                    right: -GLOW_PAD,
                    bottom: -GLOW_PAD,
                    padding: GLOW_PAD,
                    whiteSpace: 'pre',
                    color: litColor,
                    textShadow: glow,
                    // 盒比字大一圈是给它自己盖的，别让它变成一块挡住指针的透明板
                    pointerEvents: 'none',
                    // 两套前缀都写：Safari 仍只认 -webkit- 那个
                    maskImage: mask,
                    WebkitMaskImage: mask,
                    maskRepeat: 'no-repeat',
                    WebkitMaskRepeat: 'no-repeat',
                    maskSize: '100% 100%',
                    WebkitMaskSize: '100% 100%',
                    willChange: 'mask-image',
                }}
            >
                {word.text}
            </motion.span>
        </span>
    )
})
