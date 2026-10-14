/*
 * 逐词歌词解析 —— 行为对照开源播放器 Folia（AGPL-3.0）的 lyric pipeline 重写。
 *
 * 输入有两条路：
 *   ① YRC（网易云逐字歌词）：`[行起,行长](字起,字长,0)字…`，每个字都有真实时刻；
 *   ② LRC（只有整行时刻）：按 Folia 的 buildTimedWords 把整行时长按字数摊到每个字/词上。
 * 两条路最终都产出带 words 的 StageLine，舞台动画只认这一种数据。
 *
 * 另外还把 Folia 的三件布局工作搬了过来：
 *   - 字素切分（grapheme）：光晕按字错峰扫过时要用；
 *   - 分词（Intl.Segmenter）：西文按词、中日文按字；
 *   - 语义聚合 + 粘连标点：把 `It` `’` `s` 合成 `It’s`、把句尾标点粘回上一个词，
 *     这样显示出来的"词"是可读的，而时刻仍然来自原始 token。
 */

import type { LineRenderHints, StageLine, StageLyricData, StageWord } from './types'
import { buildLineRenderHints } from './timing'

export const INTERLUDE_FULL_TEXT = '......'

/* ── 字素切分 ── */

const graphemeSegmenter =
    typeof Intl !== 'undefined' && (Intl as { Segmenter?: unknown }).Segmenter
        ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
        : null

export function splitGraphemes(text: string): string[] {
    if (!text) return []
    if (graphemeSegmenter) {
        return Array.from(graphemeSegmenter.segment(text), (s) => s.segment)
    }
    return Array.from(text)
}

/* ── 分词 ── */

export interface WordSegment {
    segment: string
    isWordLike: boolean
}

const PUNCTUATION_ONLY = /^[\s\p{P}\p{S}]+$/u
const isWordLikeText = (text: string) => !PUNCTUATION_ONLY.test(text)

export function segmentWords(text: string): WordSegment[] {
    if (!text) return []
    const Segmenter = typeof Intl !== 'undefined' ? (Intl as { Segmenter?: unknown }).Segmenter : undefined
    if (Segmenter) {
        try {
            return Array.from(
                new Intl.Segmenter(undefined, { granularity: 'word' }).segment(text),
                (part) => ({ segment: part.segment, isWordLike: part.isWordLike ?? isWordLikeText(part.segment) }),
            )
        } catch {
            /* 落到字素兜底 */
        }
    }
    return splitGraphemes(text).map((segment) => ({ segment, isWordLike: isWordLikeText(segment) }))
}

/* ── 逐行时刻摊到逐字（Folia buildTimedWords） ── */

const CJK_CHAR = /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/
const CJK_PUNCT = /[，。！？、：；"'）]/

/**
 * 拿不到逐字时间轴时，把整行时长按"权重"摊给每个单位：
 * 中日文按字拆、标点权重 0（不占时间），西文按词且略加权（长词多分一点）。
 * 最后 10% 的时长刻意留空，让词唱完还有一点余韵。
 */
export function buildTimedWords(text: string, startTime: number, endTime: number): StageWord[] {
    const duration = Math.max(endTime - startTime, 0.1)
    const rawTokens = text.split(/\s+/).filter((token) => token)
    const tokens: Array<{ text: string; weight: number }> = []
    let totalWeight = 0

    for (const token of rawTokens) {
        if (CJK_CHAR.test(token)) {
            for (const char of Array.from(token)) {
                const weight = CJK_PUNCT.test(char) ? 0 : 1
                tokens.push({ text: char, weight })
                totalWeight += weight
            }
        } else {
            const weight = 1 + token.length * 0.15
            tokens.push({ text: token, weight })
            totalWeight += weight
        }
    }

    if (totalWeight === 0) totalWeight = 1

    const activeDuration = duration * 0.9
    const timePerWeight = activeDuration / totalWeight
    let cursor = startTime
    const words: StageWord[] = tokens.map((token) => {
        const wordDuration = token.weight * timePerWeight
        const finalDuration = Math.max(wordDuration, 0.05)
        const word: StageWord = { text: token.text, startTime: cursor, endTime: cursor + finalDuration }
        cursor += token.weight > 0 ? wordDuration : 0.05
        return word
    })

    if (words.length > 0) {
        const last = words[words.length - 1]
        if (last.endTime > endTime) {
            const scale = (endTime - startTime) / (last.endTime - startTime || 1)
            for (const word of words) {
                word.startTime = startTime + (word.startTime - startTime) * scale
                word.endTime = startTime + (word.endTime - startTime) * scale
            }
        }
    }

    return words
}

/* ── 译文轨（LRC 形式的整行时刻） ── */

interface TimedEntry {
    startTime: number
    text: string
}

const LRC_LINE = /^\[(\d{2}):(\d{2})[.:](\d{2,3})\](.*)$/

function parseTimedEntries(content: string): TimedEntry[] {
    const entries: TimedEntry[] = []
    for (const raw of content.replace(/^\uFEFF/, '').split(/\r?\n/)) {
        const match = raw.match(LRC_LINE)
        if (!match) continue
        const time = Number(match[1]) * 60 + Number(match[2]) + Number(match[3].padEnd(3, '0')) / 1000
        const text = match[4].trim()
        if (text) entries.push({ startTime: time, text })
    }
    return entries.sort((a, b) => a.startTime - b.startTime)
}

const ALTERNATE_MATCH_WINDOW = 1.0

/** 每个译文条目最多用一次：在 ±1 秒窗口内按时间差从小到大贪心配对。 */
function matchTranslations(lineStarts: number[], entries: TimedEntry[]): Array<string | undefined> {
    const result: Array<string | undefined> = new Array(lineStarts.length).fill(undefined)
    if (entries.length === 0) return result

    const pairs: Array<{ line: number; entry: number; diff: number }> = []
    for (let i = 0; i < lineStarts.length; i += 1) {
        for (let j = 0; j < entries.length; j += 1) {
            const diff = Math.abs(entries[j].startTime - lineStarts[i])
            if (diff <= ALTERNATE_MATCH_WINDOW) pairs.push({ line: i, entry: j, diff })
        }
    }

    pairs.sort((a, b) => a.diff - b.diff)
    const usedLine = new Set<number>()
    const usedEntry = new Set<number>()
    for (const pair of pairs) {
        if (usedLine.has(pair.line) || usedEntry.has(pair.entry)) continue
        usedLine.add(pair.line)
        usedEntry.add(pair.entry)
        result[pair.line] = entries[pair.entry].text
    }
    return result
}

/* ── 间奏占位行 ── */

/**
 * 长间隔（> 3 秒）与开头前奏补一行"......"。
 * classic 模式对 fullText === '......' 的行有专门处理：放大、拉宽间距，就是那一排点。
 */
export function attachInterludes(lines: StageLine[]): StageLine[] {
    const out: StageLine[] = []

    const createInterlude = (start: number, end: number): StageLine => {
        const duration = end - start
        const unit = duration / 6
        const words: StageWord[] = Array.from({ length: 6 }, (_, i) => ({
            text: '.',
            startTime: start + i * unit,
            endTime: start + (i + 1) * unit,
        }))
        return { startTime: start, endTime: end, fullText: INTERLUDE_FULL_TEXT, words }
    }

    if (lines.length > 0 && lines[0].startTime > 3) {
        out.push(createInterlude(0.5, lines[0].startTime - 0.5))
    }

    lines.forEach((line, index) => {
        out.push(line)
        const next = lines[index + 1]
        if (next) {
            const gap = next.startTime - line.endTime
            if (gap > 3) out.push(createInterlude(line.endTime + 0.05, next.startTime - 0.05))
        }
    })

    return out
}

/* ── YRC / LRC 解析 ── */

const YRC_LINE = /^\[(\d+),(\d+)\](.*)$/
const YRC_WORD = /\((\d+),(\d+),(\d+)\)([^(]*)/g

/**
 * 整行只有时间戳（LRC）时，"这句词该怎么铺"只能自己估 —— 因为 LRC 完全不告诉你
 * 这一句的时间里，哪一段在唱、哪一段没唱。可能的两件事：
 *   ① 尾音被拖长：最后一个字唱了 4 秒，行时长自然就长；
 *   ② 后面接间奏：唱完了，但下一句要等很久才开始。
 * 两者从时间戳上看一模一样，只能靠"多出来的时间有多少"来分档（见 parseLrc）。
 *
 * 基准是**每字秒数**：用全曲的中位数定（慢歌快歌差一倍多，写死任何一个值都会偏），
 * 再乘一点宽限，宁可略微晚收尾。
 */
const PACE_FALLBACK = 0.45
const PACE_GRACE = 1.1
/** 多出来的时间不超过这个数，就当成行的正常误差，整行照旧铺满（免得行尾露出一小段空隙） */
const FOLD_RESIDUAL_MAX = 1.2
/** 多出来的时间在这个数以内，认定是"尾音拖长"：词身照常铺，最后一个字撑到行尾 */
const HOLD_RESIDUAL_MAX = 6

function estimatePace(entries: Array<{ startTime: number; text: string }>): number {
    const ratios: number[] = []
    for (let i = 0; i + 1 < entries.length; i += 1) {
        const gap = entries[i + 1].startTime - entries[i].startTime
        const chars = entries[i].text.replace(/\s/g, '').length
        // 超过 20 秒的间隔是间奏，不是这一句的节奏，排除掉，否则整首会估得极慢。
        if (gap > 0.2 && gap < 20 && chars > 0) ratios.push(gap / chars)
    }
    if (ratios.length < 6) return PACE_FALLBACK
    ratios.sort((a, b) => a - b)
    return Math.min(0.9, Math.max(0.22, ratios[Math.floor(ratios.length / 2)]))
}

/** YRC：每行 `[起,长](字起,字长,0)字…`，时刻是毫秒。 */
export function parseYrc(yrc: string, translationLrc = ''): StageLyricData {
    const raw: Array<Pick<StageLine, 'words' | 'startTime' | 'endTime' | 'fullText'>> = []
    let sorted = true
    let lastStart = Number.NEGATIVE_INFINITY

    for (const rawLine of yrc.replace(/^\uFEFF/, '').split(/\r?\n/)) {
        const match = rawLine.match(YRC_LINE)
        if (!match) continue
        const lineStartMs = Number(match[1])
        const lineDurMs = Number(match[2])
        const rest = match[3]
        const words: StageWord[] = []
        let fullText = ''
        YRC_WORD.lastIndex = 0
        let wordMatch: RegExpExecArray | null
        while ((wordMatch = YRC_WORD.exec(rest)) !== null) {
            const start = Number(wordMatch[1]) / 1000
            const dur = Number(wordMatch[2]) / 1000
            const text = wordMatch[4]
            if (!text) continue
            words.push({ text, startTime: start, endTime: start + dur })
            fullText += text
        }
        if (words.length === 0) continue
        const startTime = lineStartMs / 1000

        /*
         * 网易云的 YRC 里，每个字的时刻是**绝对毫秒**（实测 13 首歌全部如此：首个字的时刻与行首完全相等）。
         * 但同类格式（LX 的 awlrc / KRC）用的是**相对行首**的偏移，真有这种数据落进来，
         * 整行的字都会被判成"早就唱过"，画面会整首错乱。所以加一道自证：
         * 首字明显落在行首之前，就认定是相对偏移，整行补上行首。
         */
        const lead = words[0].startTime - startTime
        if (lead < -0.5) {
            for (const word of words) {
                word.startTime += startTime
                word.endTime += startTime
            }
        }

        if (startTime < lastStart) sorted = false
        lastStart = startTime
        raw.push({ words, startTime, endTime: (lineStartMs + lineDurMs) / 1000, fullText })
    }

    const ordered = sorted ? raw : [...raw].sort((a, b) => a.startTime - b.startTime)
    const translations = matchTranslations(ordered.map((l) => l.startTime), parseTimedEntries(translationLrc))
    const lines: StageLine[] = ordered.map((line, index) => ({ ...line, translation: translations[index] }))

    return { lines, isWordByWord: true }
}

/** LRC：只有整行时刻，逐字时刻按 buildTimedWords 摊开。 */
export function parseLrc(lrc: string, translationLrc = '', duration = 0): StageLyricData {
    const raw: Array<{ startTime: number; text: string }> = []
    for (const line of lrc.replace(/^\uFEFF/, '').split(/\r?\n/)) {
        const match = line.match(LRC_LINE)
        if (!match) continue
        const time = Number(match[1]) * 60 + Number(match[2]) + Number(match[3].padEnd(3, '0')) / 1000
        const text = match[4].trim()
        if (text) raw.push({ startTime: time, text })
    }
    raw.sort((a, b) => a.startTime - b.startTime)

    const pace = estimatePace(raw)

    const lines: StageLine[] = raw.map((entry, index) => {
        const next = raw[index + 1]
        // 到下一句/曲末的可用时长：下一句起点；最后一行用整首时长兜底，兜不住就按 3 秒估。
        const available = next ? next.startTime : duration > entry.startTime ? duration : entry.startTime + 3

        /*
         * 这一段的关键是：LRC 的"行长"里混着两件事 —— 唱，和没唱。
         * 直接拿行长铺词，只要行长被撑长（拖长音或被间奏撑开），词就会一个一个字慢慢往外冒，
         * 唱完半天还在弹。所以要先把"唱"的那段估出来（natural），行长里多出来的部分（residual）再分档处理：
         *
         *   residual ≤ FOLD   —— 只是误差，整行照旧铺满。绝大多数正常句子走这条，行为与不做处理时一致，
         *                        也不会在行尾露出一小段空隙（那会让画面在每句之间闪一下）。
         *   residual ≤ HOLD   —— 判定为**尾音拖长**：词身仍按 natural 的节奏铺，但把最后一个字撑到行尾。
         *                        这样"这个字唱得很长"时，它就一直亮着，而不是唱完了才慢慢弹出来。
         *   residual >  HOLD  —— 判定为**间奏**：词只铺到 natural 就收，行也在那里结束，
         *                        余下的时间交给 attachInterludes 补上那排呼吸点。
         */
        const natural = Math.max(1.2, entry.text.replace(/\s/g, '').length * pace * PACE_GRACE)
        const sungSpan = Math.min(available - entry.startTime, natural)
        const residual = available - entry.startTime - sungSpan

        // 误差范围内：整行照旧
        const span = residual <= FOLD_RESIDUAL_MAX ? available - entry.startTime : sungSpan
        // 拖长音：最后一个字撑到行尾，行也留在场上
        const holding = residual > FOLD_RESIDUAL_MAX && residual <= HOLD_RESIDUAL_MAX
        const endTime = holding ? available : entry.startTime + span

        const words = buildTimedWords(entry.text, entry.startTime, entry.startTime + span)
        if (holding && words.length > 0) {
            words[words.length - 1].endTime = available
        }

        return { words, startTime: entry.startTime, endTime, fullText: entry.text }
    })

    const translations = matchTranslations(lines.map((l) => l.startTime), parseTimedEntries(translationLrc))
    lines.forEach((line, index) => {
        line.translation = translations[index]
    })

    return { lines, isWordByWord: false }
}

/* ── 布局：语义聚合 + 粘连标点 ── */

export interface LyricLayoutUnit {
    text: string
    words: StageWord[]
    startTime: number
    endTime: number
    isSemantic: boolean
    isSticky?: boolean
}

const CJK_ANY = /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/
const WS_ONLY = /^\s+$/
const APOSTROPHE_ONLY = /^['’]\s*$/
const CONTRACTION_SUFFIX = /^(s|t|m|d|ll|re|ve|em)\s*$/i
const DIRECT_CONTRACTION = /^['’](s|t|m|d|ll|re|ve|em)\s*$/i
const TRAILING_APOSTROPHE = /['’]\s*$/
const TRAILING_WORD_CHAR = /[\p{L}\p{N}]$/u
const INLINE_CONTRACTION = /[\p{L}\p{N}]+['’](s|t|m|d|ll|re|ve|em)/iu
const STICKY_TRAILING_PUNCT =
    /^[,.;:!?，。！？、：；）】》」』〉〕］)}\]"'’”’]+$/u

const singleWordUnits = (words: StageWord[]): LyricLayoutUnit[] =>
    words.map((word) => ({
        text: word.text,
        words: [word],
        startTime: word.startTime,
        endTime: word.endTime,
        isSemantic: false,
    }))

/** 把 Intl.Segmenter 的切分对回原始 token；只要有一个对不上就整体退回逐 token。 */
function mapSegmentsToWords(segments: WordSegment[], words: StageWord[]): LyricLayoutUnit[] | null {
    const units: LyricLayoutUnit[] = []
    let wordIndex = 0

    for (const segment of segments) {
        const segmentText = segment.segment
        if (!segmentText || WS_ONLY.test(segmentText)) continue

        const startWordIndex = wordIndex
        let collected = ''
        while (wordIndex < words.length && collected.length < segmentText.length) {
            collected += words[wordIndex].text
            wordIndex += 1
            if (!segmentText.startsWith(collected)) return null
        }
        if (collected !== segmentText) return null

        const segmentWords = words.slice(startWordIndex, wordIndex)
        const first = segmentWords[0]
        const last = segmentWords[segmentWords.length - 1]
        if (!first || !last) return null

        if (!segment.isWordLike && units.length > 0) {
            const target = units[units.length - 1]
            target.text += segmentText
            target.words.push(...segmentWords)
            target.endTime = last.endTime
            continue
        }

        units.push({
            text: segmentText,
            words: segmentWords,
            startTime: first.startTime,
            endTime: last.endTime,
            isSemantic: Boolean(segment.isWordLike && CJK_ANY.test(segmentText) && segmentWords.length > 1),
        })
    }

    if (wordIndex !== words.length || units.length === 0) return null
    return units
}

/** 中日文按语义聚合（只在没有空格的语言里有意义），西文保持逐 token。 */
function buildCjkSemanticUnits(line: StageLine): LyricLayoutUnit[] {
    if (line.words.length === 0) return []
    const fallback = singleWordUnits(line.words)
    if (!CJK_ANY.test(line.fullText)) return fallback
    const segments = segmentWords(line.fullText)
    if (segments.length === 0) return fallback
    return mapSegmentsToWords(segments, line.words) ?? fallback
}

const canAttachToPrevious = (text: string) => TRAILING_WORD_CHAR.test(text.trimEnd())
const isApostropheOnly = (unit: LyricLayoutUnit) => APOSTROPHE_ONLY.test(unit.text.trim())
const isContractionSuffix = (unit: LyricLayoutUnit) => CONTRACTION_SUFFIX.test(unit.text.trim())
const isDirectContraction = (unit: LyricLayoutUnit) => DIRECT_CONTRACTION.test(unit.text.trim())
const isStickyTrailingPunct = (unit: LyricLayoutUnit) => STICKY_TRAILING_PUNCT.test(unit.text.trim())

/** 把标点 / 缩写碎片粘回上一个词，避免 `It’s` 被拆成三层各飘各的。 */
function applyStickyPunctuation(units: LyricLayoutUnit[]): LyricLayoutUnit[] {
    const merged: LyricLayoutUnit[] = []

    for (let index = 0; index < units.length; index += 1) {
        const current = units[index]
        const previous = merged[merged.length - 1]
        if (!previous) {
            merged.push({ ...current, words: [...current.words] })
            continue
        }

        const next = units[index + 1]
        const attach = (extra: LyricLayoutUnit) => {
            previous.text += extra.text
            previous.words.push(...extra.words)
            previous.endTime = extra.endTime
            previous.isSticky = true
        }

        if (isApostropheOnly(current) && next && canAttachToPrevious(previous.text) && isContractionSuffix(next)) {
            attach(current)
            attach(next)
            index += 1
            continue
        }
        if (isDirectContraction(current) && canAttachToPrevious(previous.text)) {
            attach(current)
            continue
        }
        if (isContractionSuffix(current) && TRAILING_APOSTROPHE.test(previous.text.trimEnd())) {
            attach(current)
            continue
        }
        if (isStickyTrailingPunct(current) && canAttachToPrevious(previous.text)) {
            attach(current)
            continue
        }

        merged.push({ ...current, words: [...current.words] })
    }

    return merged.map((unit) => {
        const lastWord = unit.words[unit.words.length - 1]
        const attachedTrailingPunct =
            unit.words.length > 1 &&
            Boolean(
                lastWord &&
                    STICKY_TRAILING_PUNCT.test(lastWord.text.trim()),
            )
        const inlineContraction = unit.words.length > 1 && !unit.isSemantic && INLINE_CONTRACTION.test(unit.text)
        return attachedTrailingPunct || inlineContraction ? { ...unit, isSticky: true } : unit
    })
}

/** 舞台实际要画的词：粘连的非语义单元合成一个词，其余保留原始 token（时刻不变）。 */
export function buildDisplayWords(line: StageLine): StageWord[] {
    const units = applyStickyPunctuation(buildCjkSemanticUnits(line))
    return units.flatMap((unit) => {
        if (!unit.isSticky || unit.isSemantic) return unit.words
        return [{ text: unit.text, startTime: unit.startTime, endTime: unit.endTime }]
    })
}

/* ── 开头署名块（staff credits） ──
 * 歌词开头常有一整块"作词/作曲/出品…"的署名。逐字歌词里这些行同样是带时刻的，
 * 若当成歌词唱出来，前奏就会一个字一个字往外蹦。
 * 判据（对照 Folia）：词表命中起头，之后靠"字段名＋冒号＋内容"的结构续接；
 * 再用**前奏时间预算**决定去留 —— 前奏放得下就保留，放不下就整块去掉。
 */

const STAFF_ROLE_KEYWORDS = [
    '作词', '作曲', '词', '曲', '编曲', '制作人', '演唱', '吉他', '贝斯', '混音', '母带', '录音',
    '监制', '出品', '策划', '统筹', '设计', '宣传', '运营', '总监', '鸣谢', '工作室', '版权', '发行',
    '艺人统筹', '制作总监', '总顾问', '出品人', '总监制', '战略', '视觉', '资产管理', '总策划',
    '音乐总监', '制作统筹', '音乐版权', '创意顾问', '平面设计', '宣传物料', '黑胶设计', '项目总统筹',
    '艺人协力', '项目协力', '策略行销', '视觉统筹', '媒介', '宣传营销', '联合出品', '协办单位',
    '宣发合作伙伴', '独家短视频平台', '主题歌音乐专辑工作团队', '工作室负责人', '协作', '平面摄影师',
    '海报设计团队', '企划', '和声编写', '画师', '场景画师', 'PV底图', '美工', '题字', '视频',
    '人声后期', 'PV', '封面', '单曲封面', '单曲封面及标准字设计', '单曲封面摄影', '歌词字幕', '歌手', '原唱',
    '和声', '弦乐', '键盘', '鼓', '制作',
    'Producer', 'Composer', 'Lyricist', 'Arranger', 'Vocal', 'Guitar', 'Bass',
    'Mixing', 'Mastering', 'Recording', 'Arrangement', 'Lyrics', 'Music',
]
const STAFF_BY_PREFIX = /^\s*(?:produced|written|composed|arranged|mixed|mastered|recorded|performed)\s+by\s+\S/i
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const STAFF_KEYWORD_GROUP = `(?:${STAFF_ROLE_KEYWORDS.map(escapeRegExp).join('|')})`
const STAFF_LATIN_ALIAS = `(?:\\s*[A-Za-z][A-Za-z0-9 .&'/-]*)?`
const BUILT_IN_STAFF_PATTERN =
    `^\\s*[\\[（(【]?\\s*${STAFF_KEYWORD_GROUP}(?:\\s*[/、&+,，·・和]?\\s*${STAFF_KEYWORD_GROUP})*${STAFF_LATIN_ALIAS}\\s*[\\]）)】]?\\s*[:：]\\s*\\S`
const builtInStaffRegex = new RegExp(BUILT_IN_STAFF_PATTERN, 'i')

const isStaffLine = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return false
    return builtInStaffRegex.test(trimmed) || STAFF_BY_PREFIX.test(trimmed)
}

const FILLER_REGEX = /^[^\p{L}\p{N}]+$/u
const isFillerLine = (text: string) => {
    const trimmed = text.trim()
    return !trimmed || (trimmed.length <= 8 && FILLER_REGEX.test(trimmed))
}

const COLON_SHAPED = /^[^:：，。！？；…!?]{1,60}[:：]\s*\S/
const isColonShaped = (text: string) => COLON_SHAPED.test(text.trim())
const isHeaderLike = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return true
    return /\s[-–—]\s/.test(trimmed)
}

interface StaffBlock {
    memberIndexes: number[]
    firstLyricIndex: number | null
    staffCount: number
}

/** 从开头识别连续的一块署名；单行块一律不算（误判代价是删掉一句真歌词）。 */
function detectLeadingStaffBlock(lines: StageLine[]): StaffBlock | null {
    const MAX_HEADER_LINES = 2
    const MIN_STAFF_LINES = 2
    const MIN_DICTIONARY_HITS = 2
    const MIN_TRAILING_STRUCTURAL_RUN = 2

    let cursor = 0
    let headerLineCount = 0
    while (cursor < lines.length && !isStaffLine(lines[cursor].fullText)) {
        if (isFillerLine(lines[cursor].fullText)) {
            cursor += 1
            continue
        }
        if (headerLineCount >= MAX_HEADER_LINES || !isHeaderLike(lines[cursor].fullText)) return null
        headerLineCount += 1
        cursor += 1
    }
    if (cursor >= lines.length) return null

    const accepted: Array<{ index: number; fromDictionary: boolean; leadingFiller: number[] }> = []
    let dictionaryHits = 0
    let pendingFiller: number[] = []
    let scan = cursor

    while (scan < lines.length) {
        const line = lines[scan]
        if (isFillerLine(line.fullText)) {
            pendingFiller.push(scan)
            scan += 1
            continue
        }
        const fromDictionary = isStaffLine(line.fullText)
        const isStructural = dictionaryHits >= MIN_DICTIONARY_HITS && isColonShaped(line.fullText)
        if (!fromDictionary && !isStructural) break
        if (fromDictionary) dictionaryHits += 1
        accepted.push({ index: scan, fromDictionary, leadingFiller: pendingFiller })
        pendingFiller = []
        scan += 1
    }

    // 块尾孤零零一条"结构续接"行退回：正文里的"他说：我爱你"与署名长一个样，区别只在署名成片出现。
    let trailingStructural = 0
    while (trailingStructural < accepted.length && !accepted[accepted.length - 1 - trailingStructural].fromDictionary) {
        trailingStructural += 1
    }
    if (trailingStructural > 0 && trailingStructural < MIN_TRAILING_STRUCTURAL_RUN) {
        accepted.length -= trailingStructural
        pendingFiller = []
    }
    if (accepted.length < MIN_STAFF_LINES) return null

    const memberIndexes = accepted.flatMap((entry) => [...entry.leadingFiller, entry.index])
    memberIndexes.push(...pendingFiller)

    let firstLyricIndex: number | null = null
    for (let index = memberIndexes[memberIndexes.length - 1] + 1; index < lines.length; index += 1) {
        if (!isFillerLine(lines[index].fullText)) {
            firstLyricIndex = index
            break
        }
    }

    return { memberIndexes, firstLyricIndex, staffCount: accepted.length }
}

/**
 * 前奏时间预算：这段前奏放不放得下整块署名。放得下保留，放不下整块去掉（没有中间态）。
 * 每行至少停留 1.5 秒，末尾再留 1 秒缓冲，避免署名贴脸接第一句歌词。
 */
function resolveStaffVerdict(lines: StageLine[], block: StaffBlock): 'keep' | 'hide' {
    const MIN_DWELL = 1.5
    const TAIL_MARGIN = 1
    if (block.firstLyricIndex === null) return 'keep'
    const windowStart = lines[block.memberIndexes[0]].startTime
    const windowSeconds = Math.max(0, lines[block.firstLyricIndex].startTime - windowStart)
    return windowSeconds >= block.staffCount * MIN_DWELL + TAIL_MARGIN ? 'keep' : 'hide'
}

/** 前奏放不下时，把开头整块署名（含其间的分隔符行）从歌词里去掉。 */
export function stripLeadingStaffCredits(lines: StageLine[]): StageLine[] {
    const block = detectLeadingStaffBlock(lines)
    if (!block) return lines
    if (resolveStaffVerdict(lines, block) === 'keep') return lines
    const drop = new Set(block.memberIndexes)
    return lines.filter((_, index) => !drop.has(index))
}

/* ── 对外入口 ── */

/** 给每一行补上时长分档与渲染提示（换行过渡快慢、逐词揭示模式都在这里定）。 */
export function annotateRenderHints(lines: StageLine[]): StageLine[] {
    return lines.map((line) => ({ ...line, renderHints: buildLineRenderHints(line) }))
}

export interface BuildStageLyricsInput {
    /** 逐字歌词（优选） */
    yrc?: string
    /** 整行歌词（兜底） */
    lrc?: string
    /** 逐行译文 */
    translation?: string
    /** 秒；LRC 兜底时给最后一行封口 */
    duration?: number
}

/**
 * 组出舞台用的数据：有 YRC 就用 YRC（真正的逐字时刻），否则用 LRC 摊开。
 * 之后补间奏行、再逐行算好渲染提示。
 */
export function buildStageLyrics({ yrc = '', lrc = '', translation = '', duration = 0 }: BuildStageLyricsInput): StageLyricData {
    let data: StageLyricData = yrc.trim()
        ? parseYrc(yrc, translation)
        : { lines: [], isWordByWord: false }

    if (data.lines.length === 0) {
        data = parseLrc(lrc, translation, duration)
    }

    const withInterludes = attachInterludes(stripLeadingStaffCredits(data.lines))
    return { ...data, lines: annotateRenderHints(withInterludes) }
}

export type { LineRenderHints }
