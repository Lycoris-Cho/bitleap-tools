/*
 * 导出 —— 自包含的 SMIL 动画 SVG，以及它的 HTML / React 两种封装。
 *
 * 关键设计：**只有一份结构，渲染两次**。
 * 先按"段"生成 keyTimes / keyPoints(progress) / keySplines，再交给同一个 renderScene：
 *   目标 = xml → 原样输出属性名（stroke-width）
 *   目标 = jsx → 顺手转成驼峰（strokeWidth）
 * 这样 React 组件与 SVG 文件不可能不一致（正则改属性名的做法迟早会漏掉一个）。
 *
 * 为什么用 SMIL（<animate>/<animateMotion>）而不是 CSS 动画：
 *   CSS 动画在 <img src="x.svg"> 里不会执行，SMIL 会。
 *   也就是说这个 SVG 可以直接当图片用、拖进聊天窗口、贴进 README，都会动。
 *
 * 关于虚线"逐段铺开"：虚线路径上改 stroke-dashoffset 只会让虚线滚动、不会裁剪。
 * 所以真正的做法是**遮罩**：遮罩里放一条实线，用 stroke-dasharray=TOTAL / dashoffset=TOTAL-已飞
 * 揭示前 N 个单位，再把彩色虚线套上这个遮罩 —— 虚线就被干净地逐段点亮了。
 */

import { easingById, type Pt, type Track } from './geometry'
import { glyphById } from './glyphs'
import { buildSegments, cycleLength, type SceneParams } from './scene'

export interface ExportInput {
    anchors: Pt[]
    params: SceneParams
    track: Track
    ratio: { w: number; h: number }
    /** 页面标题，用在 HTML 封装里 */
    title?: string
}

type Target = 'xml' | 'jsx'

/** SVG 里需要转成驼峰的属性名（React 只认驼峰） */
const CAMEL: Record<string, string> = {
    'stroke-width': 'strokeWidth',
    'stroke-dasharray': 'strokeDasharray',
    'stroke-dashoffset': 'strokeDashoffset',
    'stroke-linecap': 'strokeLinecap',
    'stroke-opacity': 'strokeOpacity',
    'fill-opacity': 'fillOpacity',
    'fill-rule': 'fillRule',
    'mask-units': 'maskUnits',
    'attribute-name': 'attributeName',
    'repeat-count': 'repeatCount',
    'key-times': 'keyTimes',
    'key-points': 'keyPoints',
    'key-splines': 'keySplines',
    'calc-mode': 'calcMode',
    'std-deviation': 'stdDeviation',
    'xlink:href': 'xlinkHref',
}

const n2 = (n: number) => String(Math.round(n * 100) / 100)

/** 由内容算一个短 id 前缀：同样的航线 + 同样的参数 → 同样的导出代码，方便对比与版本管理 */
function shortHash(text: string): string {
    let h = 2166136261
    for (let i = 0; i < text.length; i += 1) {
        h ^= text.charCodeAt(i)
        h = Math.imul(h, 16777619)
    }
    return (h >>> 0).toString(36).slice(0, 6)
}

/* ── 时间轴 → SMIL 关键帧 ── */

interface Keyframes {
    /** 一轮总时长（秒） */
    cycle: number
    /** 归一化时间点，首 0 尾 1（已是格式化后的字符串，直接拼进属性） */
    times: string[]
    /** 进度值，与 times 一一对应（保持数值，后面还要拿它算遮罩的 dashoffset） */
    points: number[]
    /** 每两个关键帧之间一段缓动（段数 = times.length - 1） */
    splines: string[]
}

/**
 * 把"段"翻译成 SMIL 的关键帧。
 * 缓动只写在"飞"的段上，停留段用线性占位（值不变，曲线无所谓）。
 * 缓动一律用 keySplines 精确表达 —— 前提是缓动的 y 落在 0~1 内，
 * 所以 geometry 里刻意不提供会冲出 1 的"回弹"：那种缓动在路径进度上本来也会被夹掉，
 * 留着只会逼导出走一条"采样成关键帧"的粗糙路线。
 */
function keyframesFor(params: SceneParams, segments: ReturnType<typeof buildSegments>): Keyframes {
    const cycle = Math.max(0.05, cycleLength(segments))
    const cp = easingById(params.easing).cp
    const easeSpline = `${n2(cp[0])} ${n2(cp[1])} ${n2(cp[2])} ${n2(cp[3])}`

    const times: string[] = ['0']
    const points: number[] = [segments[0]?.from ?? 0]
    const splines: string[] = []
    let acc = 0

    for (const seg of segments) {
        acc += seg.dur
        times.push(n2(acc / cycle))
        points.push(seg.to)
        splines.push(seg.kind === 'hold' ? '0 0 1 1' : easeSpline)
    }

    // keyTimes 必须严格递增，且尾值正好是 1；浮点累积偶尔会差一点点，这里对齐一下
    times[times.length - 1] = '1'
    return { cycle, times, points, splines }
}

/* ── 主体渲染 ── */

function renderScene(input: ExportInput, target: Target): string {
    const { params, track, ratio, anchors } = input
    const w = ratio.w
    const h = ratio.h
    const glyph = glyphById(params.glyph)

    const seed = shortHash(`${track.d}|${JSON.stringify(params)}|${anchors.length}`)
    const idReveal = `reveal-${seed}`
    const idRoute = `route-${seed}`
    const idGlow = `glow-${seed}`

    const total = track.total
    const dashArray = `${n2(params.dash)} ${n2(params.gap)}`
    const scale = params.size / 24
    const off = (name: string, value: string | number | undefined) => {
        if (value === undefined || value === '') return ''
        const key = target === 'jsx' ? CAMEL[name] ?? name : name
        return ` ${key}="${value}"`
    }

    const segments = buildSegments(params, Math.max(0.1, params.bySpeed && params.speed > 0 ? total / params.speed : params.duration))
    const kf = keyframesFor(params, segments)
    const repeat = params.loop === 'once' ? '1' : 'indefinite'
    const freeze = params.loop === 'once' ? 'freeze' : 'remove'

    const keyTimes = kf.times.join(';')
    const keyPoints = kf.points.map((p) => n2(Math.max(0, Math.min(1, p)))).join(';')
    const keySplines = kf.splines.join(';')
    // 遮罩揭示长度 = 进度 × 总弧长，所以 dashoffset 就是 TOTAL × (1 - 进度)
    const offsetValues = kf.points.map((p) => n2(total * (1 - Math.max(0, Math.min(1, p))))).join(';')

    const L: string[] = []
    const p = (s = '') => L.push(s)

    p(`<svg${off('xmlns', 'http://www.w3.org/2000/svg')}${off('xmlns:xlink', 'http://www.w3.org/1999/xlink')}${off(
        'viewBox',
        `0 0 ${w} ${h}`,
    )}${off('width', w)}${off('height', h)}${off('role', 'img')}${off('aria-label', '航线动画')}>`)
    p(`  <title>航线动画</title>`)
    p(`  <desc>沿虚线航线飞行的动画。由 BitLeap 航线动画生成。</desc>`)
    p(`  <defs>`)

    // 发光：半径跟线宽挂钩，细线不会糊成一团
    if (params.glow) {
        const blur = n2(Math.max(1.2, params.lineWidth * 1.5))
        p(`    <filter${off('id', idGlow)}${off('x', '-40%')}${off('y', '-40%')}${off('width', '180%')}${off('height', '180%')}>`)
        p(`      <feGaussianBlur${off('stdDeviation', blur)}${off('result', 'b')}/>`)
        p(`      <feMerge>`)
        p(`        <feMergeNode${off('in', 'b')}/>`)
        p(`        <feMergeNode${off('in', 'SourceGraphic')}/>`)
        p(`      </feMerge>`)
        p(`    </filter>`)
    }

    // 遮罩：一条实线，靠 dasharray/dashoffset 揭示前 N 个单位
    p(`    <mask${off('id', idReveal)}${off('maskUnits', 'userSpaceOnUse')}${off('x', 0)}${off('y', 0)}${off('width', w)}${off(
        'height',
        h,
    )}>`)
    p(
        `      <path${off('d', track.d)}${off('fill', 'none')}${off('stroke', '#fff')}${off(
            'stroke-width',
            n2(Math.max(24, params.lineWidth * 8)),
        )}${off('stroke-linecap', 'butt')}${off('stroke-dasharray', n2(total))}${off('stroke-dashoffset', n2(total))}>`,
    )
    p(
        `        <animate${off('attributeName', 'stroke-dashoffset')}${off('dur', `${n2(kf.cycle)}s`)}${off(
            'repeatCount',
            repeat,
        )}${off('fill', freeze)}${off('values', offsetValues)}${off('keyTimes', keyTimes)}${off('calcMode', 'spline')}${off(
            'keySplines',
            keySplines,
        )}/>`,
    )
    p(`      </path>`)
    p(`    </mask>`)

    // 航线本体：单独放一条（不带描边的）路径供 animateMotion 引用
    p(`    <path${off('id', idRoute)}${off('d', track.d)}${off('fill', 'none')}/>`)
    p(`  </defs>`)

    if (params.bgExport) {
        p(`  <rect${off('width', w)}${off('height', h)}${off('fill', params.bg)}/>`)
    }

    const glowAttr = params.glow ? off('filter', `url(#${idGlow})`) : ''

    // 整条航线的暗底：让人看得到"还没飞过的路"
    p(
        `  <path${off('d', track.d)}${off('fill', 'none')}${off('stroke', params.lineColor)}${off('stroke-opacity', '0.22')}${off(
            'stroke-width',
            params.lineWidth,
        )}${off('stroke-dasharray', dashArray)}${off('stroke-linecap', 'round')}/>`,
    )
    // 亮的那条：被遮罩按进度点亮
    p(
        `  <path${off('d', track.d)}${off('fill', 'none')}${off('stroke', params.lineColor)}${off(
            'stroke-width',
            params.lineWidth,
        )}${off('stroke-dasharray', dashArray)}${off('stroke-linecap', 'round')}${off('mask', `url(#${idReveal})`)}${glowAttr}/>`,
    )

    // 飞行器：外层 g 交给 animateMotion，内层 g 承担缩放与朝向偏移（嵌套最稳，兼容性最好）
    p(`  <g${glowAttr}>`)
    p(`    <g${off('transform', `scale(${n2(scale)})${params.rotateOffset ? ` rotate(${n2(params.rotateOffset)})` : ''}`)}>`)
    p(`      <path${off('d', glyph.d)}${off('fill', params.glyphColor)}/>`)
    p(`    </g>`)
    p(
        `    <animateMotion${off('dur', `${n2(kf.cycle)}s`)}${off('repeatCount', repeat)}${off('fill', freeze)}${off(
            'rotate',
            params.follow ? 'auto' : '0',
        )}${off('keyPoints', keyPoints)}${off('keyTimes', keyTimes)}${off('calcMode', 'spline')}${off(
            'keySplines',
            keySplines,
        )}>`,
    )
    p(`      <mpath${off('xlink:href', `#${idRoute}`)}${off('href', `#${idRoute}`)}/>`)
    p(`    </animateMotion>`)
    p(`  </g>`)
    p(`</svg>`)

    return L.join('\n')
}

/** 自包含的动画 SVG 文件内容 */
export function buildSvg(input: ExportInput): string {
    return `<?xml version="1.0" encoding="UTF-8"?>\n${renderScene(input, 'xml')}\n`
}

/** React 组件（属性名已转驼峰），可直接粘进项目 */
export function buildReact(input: ExportInput): string {
    const svg = renderScene(input, 'jsx')
    // 只把最外层缩进成组件返回体，内部结构原样保留（它自己已经是分层缩进的）
    const body = svg
        .split('\n')
        .map((line) => (line.trim() ? `      ${line}` : line))
        .join('\n')
    return `export default function FlightPath() {\n  return (\n${body}\n  )\n}\n`
}

/** 只有轨迹的 d，给 AE / Figma 之类的地方用 */
export function buildPathD(input: ExportInput): string {
    return input.track.d
}

/** 完整 HTML 页面：双击就能打开，动画照跑 */
export function buildHtml(input: ExportInput): string {
    const svg = renderScene(input, 'xml')
    const title = input.title?.trim() || '航线动画'
    return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  html, body { height: 100%; margin: 0; }
  body {
    display: grid;
    place-items: center;
    background: #f4f4f6;
    font: 14px/1.6 system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  }
  .stage { width: min(92vw, ${input.ratio.w}px); }
  svg { display: block; width: 100%; height: auto; border-radius: 16px; }
</style>
</head>
<body>
  <div class="stage">
${svg
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n')}
  </div>
</body>
</html>
`
}
