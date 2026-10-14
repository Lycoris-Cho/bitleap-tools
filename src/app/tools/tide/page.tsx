"use client"

import {
  FormEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"

/* ------------------------------------------------------------------ *
 * 类型
 * ------------------------------------------------------------------ */

type MoodKey = "calm" | "miss" | "tired" | "happy" | "blank"
type SkyKey = "dawn" | "day" | "dusk" | "night"
type RGB = [number, number, number]

type Mood = {
  key: MoodKey
  label: string
  short: string
  hint: string
  line: string
  level: number
  water: [string, string, string]
  glow: string
}

type TideEntry = {
  date: string
  mood: MoodKey
  note: string
  createdAt: number
}

/** 画布用的一组颜色（随天色与心情过渡） */
type SkyFx = {
  sky: [RGB, RGB, RGB]
  orbColor: RGB
  orbHalo: RGB
  orbLight: RGB
  stars: number
  orbScale: number
  ring: boolean
}

type SkyUi = {
  ink: string
  inkSoft: string
  inkFaint: string
  line: string
  panel: string
  panelLine: string
  chip: string
  chipLine: string
  accentBg: string
  accentInk: string
  accentHover: string
  grain: string
  vignette: string
  breadcrumb: "light" | "dark"
}

type Sky = {
  key: SkyKey
  /** 时段名：拂晓 / 白昼 / 黄昏 / 夜晚 */
  name: string
  /** 更短的说法：清晨 / 午后 … */
  moment: string
  range: string
  fx: SkyFx
  /** 水面被天空染上的颜色 */
  tint: RGB
  tintMix: number
  /** 地平线霞光里掺入心情色彩的比例 */
  moodMix: number
  fallback: string
  ui: SkyUi
}

/* ------------------------------------------------------------------ *
 * 颜色工具
 * ------------------------------------------------------------------ */

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function hexToRgb(hex: string): RGB {
  const raw = hex.replace("#", "")
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw
  const num = Number.parseInt(full, 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

function rgbToHex(color: RGB): string {
  return `#${color.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("")}`
}

function mixRgb(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

const rgb = (color: RGB, alpha = 1) => `rgba(${color[0]},${color[1]},${color[2]},${alpha})`

/* ------------------------------------------------------------------ *
 * 心情
 * ------------------------------------------------------------------ */

const MOODS: Mood[] = [
  {
    key: "calm",
    label: "平静",
    short: "静",
    hint: "水面很轻，风也慢",
    line: "今天的水面很轻，风也很慢。",
    level: 0.46,
    water: ["#9fc8c3", "#6fa9aa", "#4e7f86"],
    glow: "#f7ddb3",
  },
  {
    key: "miss",
    label: "想念",
    short: "念",
    hint: "潮水正在慢慢上涨",
    line: "有些名字没有说出口，也会在心里涨潮。",
    level: 0.62,
    water: ["#b9b6d8", "#8e91b8", "#646b95"],
    glow: "#f1d1c2",
  },
  {
    key: "tired",
    label: "疲惫",
    short: "倦",
    hint: "让水把力气慢慢收回",
    line: "今天就让潮水替你把力气慢慢收回来。",
    level: 0.72,
    water: ["#96a8ae", "#70878f", "#51676e"],
    glow: "#ead8bd",
  },
  {
    key: "happy",
    label: "开心",
    short: "晴",
    hint: "有一点光落进了水里",
    line: "今天有一点光，刚好落进了水里。",
    level: 0.36,
    water: ["#9ed3c0", "#6eb49f", "#498b7e"],
    glow: "#ffd69e",
  },
  {
    key: "blank",
    label: "空白",
    short: "空",
    hint: "没有风，也没有浪",
    line: "没有特别的情绪，也是一种被允许的天气。",
    level: 0.52,
    water: ["#aebec2", "#8fa3a7", "#6b8186"],
    glow: "#f0dfc8",
  },
]

/* ------------------------------------------------------------------ *
 * 一天里的四种天色
 * ------------------------------------------------------------------ */

const SKY_PRESETS: Record<SkyKey, Sky> = {
  dawn: {
    key: "dawn",
    name: "拂晓",
    moment: "清晨",
    range: "05:00 — 07:59",
    fx: {
      sky: [hexToRgb("#cbd6e2"), hexToRgb("#e7d8d2"), hexToRgb("#f6dfc4")],
      orbColor: hexToRgb("#ffe6bd"),
      orbHalo: hexToRgb("#ffd9a8"),
      orbLight: hexToRgb("#ffeccd"),
      stars: 0.14,
      orbScale: 1.06,
      ring: false,
    },
    tint: hexToRgb("#e6bda3"),
    tintMix: 0.22,
    moodMix: 0.5,
    fallback: "#e3e0d6",
    ui: {
      ink: "#2f332f",
      inkSoft: "rgba(40,48,44,.62)",
      inkFaint: "rgba(40,48,44,.42)",
      line: "rgba(30,40,36,.13)",
      panel: "rgba(247,241,232,.86)",
      panelLine: "rgba(255,255,255,.5)",
      chip: "rgba(255,255,255,.44)",
      chipLine: "rgba(20,30,25,.09)",
      accentBg: "#2f3f3b",
      accentInk: "#eef4ee",
      accentHover: "#3a4d47",
      grain: "rgba(38,44,40,.16)",
      vignette: "rgba(120,102,88,.14)",
      breadcrumb: "light",
    },
  },
  day: {
    key: "day",
    name: "白昼",
    moment: "午后",
    range: "08:00 — 16:59",
    fx: {
      sky: [hexToRgb("#dee3d8"), hexToRgb("#e9e5d9"), hexToRgb("#ccd8d1")],
      orbColor: hexToRgb("#fff1ce"),
      orbHalo: hexToRgb("#ffedbe"),
      orbLight: hexToRgb("#fff8e4"),
      stars: 0,
      orbScale: 1,
      ring: false,
    },
    tint: hexToRgb("#c9d6cd"),
    tintMix: 0.12,
    moodMix: 0.42,
    fallback: "#e6e3d8",
    ui: {
      ink: "#2f332f",
      inkSoft: "rgba(40,48,44,.6)",
      inkFaint: "rgba(40,48,44,.4)",
      line: "rgba(30,40,36,.12)",
      panel: "rgba(245,240,231,.86)",
      panelLine: "rgba(255,255,255,.55)",
      chip: "rgba(255,255,255,.46)",
      chipLine: "rgba(20,30,25,.08)",
      accentBg: "#2f3f3b",
      accentInk: "#eef4ee",
      accentHover: "#3a4d47",
      grain: "rgba(38,44,40,.15)",
      vignette: "rgba(110,96,84,.12)",
      breadcrumb: "light",
    },
  },
  dusk: {
    key: "dusk",
    name: "黄昏",
    moment: "傍晚",
    range: "17:00 — 19:59",
    fx: {
      sky: [hexToRgb("#b6bcc6"), hexToRgb("#e2c3ac"), hexToRgb("#f6cf9f")],
      orbColor: hexToRgb("#ffd9a3"),
      orbHalo: hexToRgb("#ffbe83"),
      orbLight: hexToRgb("#ffdcae"),
      stars: 0.16,
      orbScale: 1.12,
      ring: false,
    },
    tint: hexToRgb("#dd9f74"),
    tintMix: 0.3,
    moodMix: 0.46,
    fallback: "#e0d6c9",
    ui: {
      ink: "#332f2b",
      inkSoft: "rgba(48,42,36,.62)",
      inkFaint: "rgba(48,42,36,.42)",
      line: "rgba(46,38,32,.13)",
      panel: "rgba(247,237,226,.86)",
      panelLine: "rgba(255,246,235,.5)",
      chip: "rgba(255,252,248,.42)",
      chipLine: "rgba(46,34,24,.09)",
      accentBg: "#3b332c",
      accentInk: "#f7efe3",
      accentHover: "#4a4038",
      grain: "rgba(48,38,30,.16)",
      vignette: "rgba(120,84,58,.16)",
      breadcrumb: "light",
    },
  },
  night: {
    key: "night",
    name: "夜晚",
    moment: "夜里",
    range: "20:00 — 04:59",
    fx: {
      sky: [hexToRgb("#121a2c"), hexToRgb("#1c2942"), hexToRgb("#2b3d5c")],
      orbColor: hexToRgb("#eef3f8"),
      orbHalo: hexToRgb("#c7dcff"),
      orbLight: hexToRgb("#cfe2ff"),
      stars: 0.85,
      orbScale: 0.72,
      ring: true,
    },
    tint: hexToRgb("#15203a"),
    tintMix: 0.5,
    moodMix: 0.2,
    fallback: "#16203a",
    ui: {
      ink: "rgba(236,242,247,.94)",
      inkSoft: "rgba(228,238,246,.62)",
      inkFaint: "rgba(222,234,244,.4)",
      line: "rgba(255,255,255,.14)",
      panel: "rgba(17,25,40,.7)",
      panelLine: "rgba(255,255,255,.12)",
      chip: "rgba(255,255,255,.07)",
      chipLine: "rgba(255,255,255,.13)",
      accentBg: "#dbe8e2",
      accentInk: "#15202e",
      accentHover: "#eaf2ee",
      grain: "rgba(255,255,255,.07)",
      vignette: "rgba(0,0,0,.4)",
      breadcrumb: "dark",
    },
  },
}

const SKY_ORDER: { key: SkyKey; from: number; to: number }[] = [
  { key: "night", from: 0, to: 4 },
  { key: "dawn", from: 5, to: 7 },
  { key: "day", from: 8, to: 16 },
  { key: "dusk", from: 17, to: 19 },
  { key: "night", from: 20, to: 23 },
]

function resolveSky(date: Date): Sky {
  const hour = date.getHours()
  const match = SKY_ORDER.find((item) => hour >= item.from && hour <= item.to)
  return SKY_PRESETS[match?.key ?? "day"]
}

const fxOf = (sky: Sky): SkyFx => ({
  ...sky.fx,
  sky: [sky.fx.sky[0], sky.fx.sky[1], sky.fx.sky[2]],
})

function lerpFx(a: SkyFx, b: SkyFx, t: number): SkyFx {
  return {
    sky: [mixRgb(a.sky[0], b.sky[0], t), mixRgb(a.sky[1], b.sky[1], t), mixRgb(a.sky[2], b.sky[2], t)],
    orbColor: mixRgb(a.orbColor, b.orbColor, t),
    orbHalo: mixRgb(a.orbHalo, b.orbHalo, t),
    orbLight: mixRgb(a.orbLight, b.orbLight, t),
    stars: a.stars + (b.stars - a.stars) * t,
    orbScale: a.orbScale + (b.orbScale - a.orbScale) * t,
    ring: t < 0.5 ? a.ring : b.ring,
  }
}

/** 水面四色：0-2 为水，3 为地平线霞光 */
function waterTarget(mood: Mood, sky: Sky): RGB[] {
  const base = mood.water.map((hex) => mixRgb(hexToRgb(hex), sky.tint, sky.tintMix))
  const haze = mixRgb(sky.fx.orbHalo, hexToRgb(mood.glow), sky.moodMix)
  return [...base, haze]
}

/** 界面里用到的水色（与画布同源，再往天色方向靠一点） */
function swatch(mood: Mood, sky: Sky): [string, string, string] {
  const mix = sky.tintMix * 0.72
  return mood.water.map((hex) => rgbToHex(mixRgb(hexToRgb(hex), sky.tint, mix))) as [string, string, string]
}

/* ------------------------------------------------------------------ *
 * 日期与本地存储
 * ------------------------------------------------------------------ */

function getLocalDateKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function formatChineseDate(date = new Date()) {
  return new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(date)
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(date)
}

function loadEntries(): TideEntry[] {
  try {
    const raw = localStorage.getItem("bitleap:tide:entries")
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveEntries(entries: TideEntry[]) {
  try {
    localStorage.setItem("bitleap:tide:entries", JSON.stringify(entries))
  } catch {
    /* 隐私模式下写入失败时静默处理 */
  }
}

function getMood(key: MoodKey) {
  return MOODS.find((mood) => mood.key === key) ?? MOODS[0]
}

const SIDE_LINES = [
  "潮水会记得每一粒沙，也会记得你来过。",
  "退去的时候，也是在为下一次涨潮攒力气。",
  "把心事交给水面，它不会说给任何人听。",
  "今天的水位，只属于今天的你。",
]

/* ------------------------------------------------------------------ *
 * 近 7 天的潮线
 * ------------------------------------------------------------------ */

type CurveDay = {
  key: string
  dayLabel: string
  fullLabel: string
  weekday: string
  isToday: boolean
  level: number | null
  colors: [string, string, string]
  moodLabel: string
  note: string
}

function TideCurve({
  days,
  tokens,
  dark,
}: {
  days: CurveDay[]
  tokens: { ink: string; inkSoft: string; inkFaint: string; line: string }
  dark: boolean
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [hover, setHover] = useState<number | null>(null)
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "")

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    setWidth(Math.round(el.clientWidth))
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width ?? el.clientWidth
      setWidth(Math.round(next))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const H = 104
  const padX = 18
  const top = 18
  const bottom = 30
  const innerW = Math.max(60, width - padX * 2)
  const xAt = (index: number) => padX + (innerW * index) / Math.max(1, days.length - 1)
  const yAt = (level: number) => bottom + (1 - level) * (H - top - bottom)

  const points = days.map((day, index) => ({
    day,
    x: xAt(index),
    y: day.level === null ? null : yAt(day.level),
  }))

  const recorded = points.filter((point) => point.y !== null)
  const strokeFrom = recorded[0]?.day.colors[1] ?? tokens.inkSoft
  const gradientStops =
    recorded.length > 1
      ? recorded.map((point) => ({ offset: `${(point.x / Math.max(1, width)) * 100}%`, color: point.day.colors[1] }))
      : [{ offset: "0%", color: strokeFrom }]

  const runs: { x: number; y: number }[][] = []
  let run: { x: number; y: number }[] = []
  points.forEach((point) => {
    if (point.y === null) {
      if (run.length) runs.push(run)
      run = []
    } else {
      run.push({ x: point.x, y: point.y })
    }
  })
  if (run.length) runs.push(run)

  const pathOf = (segment: { x: number; y: number }[]) => {
    if (segment.length < 2) return ""
    let d = `M ${segment[0].x.toFixed(2)} ${segment[0].y.toFixed(2)}`
    for (let i = 0; i < segment.length - 1; i += 1) {
      const p0 = segment[i - 1] ?? segment[i]
      const p1 = segment[i]
      const p2 = segment[i + 1]
      const p3 = segment[i + 2] ?? segment[i + 1]
      const c1x = p1.x + (p2.x - p0.x) / 6
      const c1y = p1.y + (p2.y - p0.y) / 6
      const c2x = p2.x - (p3.x - p1.x) / 6
      const c2y = p2.y - (p3.y - p1.y) / 6
      d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
    }
    return d
  }

  const active = hover !== null ? points[hover] : null

  const handleMove = (event: ReactMouseEvent<HTMLDivElement>) => {
    const el = wrapRef.current
    if (!el || days.length === 0) return
    const x = event.clientX - el.getBoundingClientRect().left
    const step = days.length > 1 ? innerW / (days.length - 1) : innerW
    const index = clamp(Math.round((x - padX) / Math.max(1, step)), 0, days.length - 1)
    setHover((prev) => (prev === index ? prev : index))
  }

  return (
    <div
      ref={wrapRef}
      className="relative"
      style={{ height: H }}
      onMouseMove={handleMove}
      onMouseLeave={() => setHover(null)}
    >
      {width > 0 && (
        <svg width={width} height={H} className="block overflow-visible" role="img" aria-label="近 7 天的潮线">
          <defs>
            <linearGradient id={`tide-line-${uid}`} x1="0" y1="0" x2="1" y2="0">
              {gradientStops.map((stop, index) => (
                <stop key={index} offset={stop.offset} stopColor={stop.color} />
              ))}
            </linearGradient>
            <linearGradient id={`tide-fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeFrom} stopOpacity="0.28" />
              <stop offset="100%" stopColor={strokeFrom} stopOpacity="0" />
            </linearGradient>
          </defs>

          <line x1={padX} y1={yAt(0)} x2={Math.max(padX, width - padX)} y2={yAt(0)} stroke={tokens.line} strokeWidth="1" />
          <line
            x1={padX}
            y1={yAt(1)}
            x2={Math.max(padX, width - padX)}
            y2={yAt(1)}
            stroke={tokens.line}
            strokeWidth="1"
            strokeDasharray="1 5"
          />

          {runs.map((segment, index) => {
            const d = pathOf(segment)
            if (!d) return null
            const last = segment[segment.length - 1]
            const first = segment[0]
            return (
              <g key={index}>
                <path
                  d={`${d} L ${last.x} ${yAt(0)} L ${first.x} ${yAt(0)} Z`}
                  fill={`url(#tide-fill-${uid})`}
                  opacity={hover === null ? 1 : 0.5}
                />
                <path d={d} fill="none" stroke={`url(#tide-line-${uid})`} strokeWidth="1.8" strokeLinecap="round" />
              </g>
            )
          })}

          {points.map((point, index) => {
            const isHover = hover === index
            return (
              <g key={point.day.key}>
                {point.y !== null ? (
                  <>
                    {point.day.isToday && (
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={9}
                        fill="none"
                        stroke={point.day.colors[1]}
                        strokeOpacity="0.42"
                        strokeWidth="1.2"
                      />
                    )}
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={isHover ? 5.4 : 4}
                      fill={point.day.colors[1]}
                      stroke={dark ? tokens.ink : "#ffffff"}
                      strokeOpacity={0.75}
                      strokeWidth="1.4"
                    />
                  </>
                ) : (
                  <rect
                    x={point.x - 0.8}
                    y={yAt(0) - 5}
                    width="1.6"
                    height="6"
                    rx="0.8"
                    fill={tokens.inkFaint}
                    opacity={0.55}
                  />
                )}
                <text
                  x={point.x}
                  y={H - 12}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight={point.day.isToday ? 700 : 400}
                  fill={point.day.isToday || isHover ? tokens.ink : tokens.inkFaint}
                >
                  {point.day.weekday}
                </text>
                <text x={point.x} y={H - 1} textAnchor="middle" fontSize="8" fill={tokens.inkFaint}>
                  {point.day.dayLabel}
                </text>
              </g>
            )
          })}

          {active && active.y !== null && (
            <line
              x1={active.x}
              y1={active.y}
              x2={active.x}
              y2={yAt(0)}
              stroke={tokens.inkFaint}
              strokeWidth="1"
              strokeDasharray="2 4"
            />
          )}
        </svg>
      )}

      {active && active.y !== null && width > 0 && (
        <div
          className="pointer-events-none absolute bottom-[calc(100%+6px)] z-30 w-[186px] rounded-[3px] border px-3 py-2 backdrop-blur-md"
          style={{
            left: clamp(active.x, 96, Math.max(96, width - 96)),
            transform: "translateX(-50%)",
            background: dark ? "rgba(17,25,40,.92)" : "rgba(255,253,248,.93)",
            borderColor: tokens.line,
            boxShadow: "0 18px 40px -22px rgba(20,30,30,.5)",
          }}
        >
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: active.day.colors[1] }} />
            <span className="text-[10px] font-medium" style={{ color: tokens.ink }}>
              {active.day.fullLabel}
            </span>
            <span className="ml-auto shrink-0 text-[10px]" style={{ color: tokens.inkSoft }}>
              {active.day.moodLabel}
            </span>
          </div>
          <div className="mt-1.5 text-[10px] leading-[1.6]" style={{ color: tokens.inkSoft }}>
            {active.day.note ? `“${active.day.note}”` : "那天没有留下字"}
          </div>
        </div>
      )}
    </div>
  )
}

const ORB = { left: 0.845, top: 0.17 }

export default function TidePage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLSpanElement>(null)
  const knobRef = useRef<HTMLSpanElement>(null)
  const valueRef = useRef<HTMLSpanElement>(null)

  const tideValueRef = useRef({ level: MOODS[0].level })
  const waterRef = useRef({
    from: waterTarget(MOODS[0], SKY_PRESETS.day),
    to: waterTarget(MOODS[0], SKY_PRESETS.day),
    blend: 1,
  })
  const skyFxRef = useRef({ from: fxOf(SKY_PRESETS.day), to: fxOf(SKY_PRESETS.day), blend: 1 })
  const parallaxRef = useRef({ x: 0, y: 0 })
  const ripplesRef = useRef<{ x: number; y: number; t0: number; scale: number }[]>([])
  const timeRef = useRef(0)
  /** 没有动画循环时（降低动效 / 后台标签）也能立刻补一帧 */
  const drawIfIdleRef = useRef<() => void>(() => {})
  /** 首次解析出天色时直接落位，避免深夜打开先闪一下白昼 */
  const waterSnapRef = useRef(true)
  const skySnapRef = useRef(true)

  const [mounted, setMounted] = useState(false)
  const [entries, setEntries] = useState<TideEntry[]>([])
  const [selectedMood, setSelectedMood] = useState<MoodKey>("calm")
  const [hoverMood, setHoverMood] = useState<MoodKey | null>(null)
  const [note, setNote] = useState("")
  const [saved, setSaved] = useState(false)
  const [todayLabel, setTodayLabel] = useState("")
  const [sideLine, setSideLine] = useState(SIDE_LINES[0])
  const [sky, setSky] = useState<Sky>(SKY_PRESETS.day)
  const [skyResolved, setSkyResolved] = useState(false)

  const effectiveMood = useMemo(() => getMood(hoverMood ?? selectedMood), [hoverMood, selectedMood])
  const todayKey = mounted ? getLocalDateKey() : ""
  const todayEntry = entries.find((entry) => entry.date === todayKey)
  const tone = useMemo(() => swatch(effectiveMood, sky), [effectiveMood, sky])

  const curveDays = useMemo<CurveDay[]>(() => {
    if (!mounted) return []
    const formatter = new Intl.DateTimeFormat("zh-CN", { weekday: "short" })
    const result: CurveDay[] = []
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const key = getLocalDateKey(date)
      const entry = entries.find((item) => item.date === key)
      const mood = entry ? getMood(entry.mood) : null
      result.push({
        key,
        dayLabel: String(date.getDate()).padStart(2, "0"),
        fullLabel: formatShortDate(date),
        weekday: formatter.format(date).replace("周", ""),
        isToday: i === 0,
        level: mood ? mood.level : null,
        colors: mood ? swatch(mood, sky) : swatch(MOODS[0], sky),
        moodLabel: mood ? mood.label : "未记录",
        note: entry?.note ?? "",
      })
    }
    return result
  }, [entries, mounted, sky])

  const streak = useMemo(() => {
    if (!mounted) return 0
    const set = new Set(entries.map((entry) => entry.date))
    const cursor = new Date()
    if (!set.has(getLocalDateKey(cursor))) cursor.setDate(cursor.getDate() - 1)
    let count = 0
    while (set.has(getLocalDateKey(cursor))) {
      count += 1
      cursor.setDate(cursor.getDate() - 1)
    }
    return count
  }, [entries, mounted])

  /* ---------- 挂载：读取本地记录 + 解析当前天色 ---------- */

  useEffect(() => {
    setMounted(true)
    setTodayLabel(formatChineseDate())
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
    setSideLine(SIDE_LINES[dayOfYear % SIDE_LINES.length])
    setSky((prev) => {
      const next = resolveSky(new Date())
      return next.key === prev.key ? prev : next
    })
    setSkyResolved(true)

    const stored = loadEntries()
    setEntries(stored)
    const today = stored.find((entry) => entry.date === getLocalDateKey())
    if (today) {
      setSelectedMood(today.mood)
      setNote(today.note)
    }

    const timer = window.setInterval(() => {
      setSky((prev) => {
        const next = resolveSky(new Date())
        return next.key === prev.key ? prev : next
      })
    }, 60_000)

    return () => window.clearInterval(timer)
  }, [])

  /* ---------- 入场 ---------- */

  useEffect(() => {
    const root = rootRef.current
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      gsap.from(".tide-intro", { y: 18, opacity: 0, duration: 0.9, stagger: 0.08, ease: "power3.out" })
      gsap.from(".tide-panel", { y: 26, opacity: 0, duration: 1, delay: 0.16, ease: "power3.out" })
    }, root)

    return () => ctx.revert()
  }, [])

  /* ---------- 心情 / 天色 → 水位与颜色的过渡 ---------- */

  useEffect(() => {
    if (!mounted || !skyResolved) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const snap = waterSnapRef.current
    waterSnapRef.current = false

    const current = waterRef.current
    const to = waterTarget(effectiveMood, sky)
    waterRef.current = snap
      ? { from: to, to, blend: 1 }
      : {
          from: current.from.map((color, index) => mixRgb(color, current.to[index], current.blend)),
          to,
          blend: reduce ? 1 : 0,
        }

    const proxy = { v: tideValueRef.current.level }
    const levelTween = gsap.to(proxy, {
      v: effectiveMood.level,
      duration: reduce ? 0 : 1.8,
      ease: "sine.inOut",
      overwrite: true,
      onUpdate: () => {
        tideValueRef.current.level = proxy.v
        if (barRef.current) barRef.current.style.width = `${proxy.v * 100}%`
        if (knobRef.current) knobRef.current.style.left = `${proxy.v * 100}%`
        if (valueRef.current) valueRef.current.textContent = String(Math.round(proxy.v * 100))
        drawIfIdleRef.current()
      },
    })

    const waterTween = snap
      ? null
      : gsap.to(waterRef.current, {
          blend: 1,
          duration: reduce ? 0 : 1.9,
          ease: "sine.inOut",
          overwrite: true,
          onUpdate: () => drawIfIdleRef.current(),
        })

    drawIfIdleRef.current()

    return () => {
      levelTween.kill()
      waterTween?.kill()
    }
  }, [effectiveMood, sky, skyResolved, mounted])

  useEffect(() => {
    if (!mounted || !skyResolved) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const snap = skySnapRef.current
    skySnapRef.current = false

    const current = skyFxRef.current
    const to = fxOf(sky)
    skyFxRef.current = snap
      ? { from: to, to, blend: 1 }
      : { from: lerpFx(current.from, current.to, current.blend), to, blend: reduce ? 1 : 0 }

    if (snap) {
      drawIfIdleRef.current()
      return
    }

    const tween = gsap.to(skyFxRef.current, {
      blend: 1,
      duration: reduce ? 0 : 2.4,
      ease: "sine.inOut",
      overwrite: true,
      onUpdate: () => drawIfIdleRef.current(),
    })
    return () => {
      tween.kill()
    }
  }, [sky, skyResolved, mounted])

  /* ---------- 画布：整幅场景 ---------- */

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let raf = 0
    let width = 0
    let height = 0
    let dpr = 1
    let time = 0
    let last = performance.now()
    /** 动画循环是否真的出过帧（隐藏标签页里 rAF 不会触发） */
    let loopActive = false
    let stars: { x: number; y: number; r: number; p: number }[] = []
    let motes: { x: number; y: number; r: number; sp: number; ph: number; dx: number }[] = []

    const surfaceAt = (x: number, baseY: number, amp: number, speed: number, phase: number) =>
      baseY +
      Math.sin(x * 0.011 + time * speed + phase) * amp +
      Math.sin(x * 0.0046 - time * speed * 0.58 + phase * 1.7) * amp * 0.42

    const traceSurface = (baseY: number, amp: number, speed: number, phase: number, close: boolean) => {
      const step = width > 1400 ? 9 : 6
      ctx.beginPath()
      if (close) {
        ctx.moveTo(0, height)
        ctx.lineTo(0, surfaceAt(0, baseY, amp, speed, phase))
      } else {
        ctx.moveTo(0, surfaceAt(0, baseY, amp, speed, phase))
      }
      for (let x = step; x <= width + step; x += step) {
        ctx.lineTo(x, surfaceAt(x, baseY, amp, speed, phase))
      }
      if (close) {
        ctx.lineTo(width, height)
        ctx.closePath()
      }
    }

    const draw = () => {
      const fxFrame = skyFxRef.current
      const fx = lerpFx(fxFrame.from, fxFrame.to, fxFrame.blend)
      const water = waterRef.current
      const col = water.from.map((color, index) => mixRgb(color, water.to[index], water.blend))
      const w0 = col[0]
      const w1 = col[1]
      const w2 = col[2]
      const haze = col[3]
      const idle = reduce ? 0 : Math.sin(time * 0.32) * 0.006
      const level = clamp(tideValueRef.current.level + idle, 0.1, 0.94)
      const baseY = height * (1 - level)
      const amp = clamp(width * 0.011, 7, 18)

      ctx.clearRect(0, 0, width, height)

      // 天空
      const skyGrad = ctx.createLinearGradient(0, 0, 0, Math.max(1, height * 0.94))
      skyGrad.addColorStop(0, rgb(fx.sky[0]))
      skyGrad.addColorStop(0.46, rgb(fx.sky[1]))
      skyGrad.addColorStop(0.88, rgb(fx.sky[2]))
      skyGrad.addColorStop(1, rgb(fx.sky[2]))
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, width, height)

      // 星
      if (fx.stars > 0.02) {
        ctx.fillStyle = "#ffffff"
        for (const star of stars) {
          const twinkle = 0.45 + 0.55 * Math.sin(time * 0.9 + star.p)
          ctx.globalAlpha = clamp(fx.stars * twinkle, 0, 1) * 0.9
          ctx.beginPath()
          ctx.arc(star.x, star.y, star.r * (0.8 + twinkle * 0.4), 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1
      }

      // 月亮 / 太阳
      const ox = width * ORB.left + parallaxRef.current.x
      const oy = height * ORB.top + parallaxRef.current.y
      const orbR = Math.min(width, height) * 0.075 * fx.orbScale
      const pulse = 1 + Math.sin(time * 0.6) * 0.03

      const halo = ctx.createRadialGradient(ox, oy, 0, ox, oy, orbR * 4.6)
      halo.addColorStop(0, rgb(fx.orbHalo, 0.46))
      halo.addColorStop(0.42, rgb(fx.orbHalo, 0.13))
      halo.addColorStop(1, rgb(fx.orbHalo, 0))
      ctx.fillStyle = halo
      ctx.beginPath()
      ctx.arc(ox, oy, orbR * 4.6, 0, Math.PI * 2)
      ctx.fill()

      const core = ctx.createRadialGradient(ox, oy, 0, ox, oy, orbR * 1.9 * pulse)
      core.addColorStop(0, rgb(fx.orbColor, 0.96))
      core.addColorStop(0.32, rgb(fx.orbColor, 0.68))
      core.addColorStop(0.7, rgb(fx.orbColor, 0.16))
      core.addColorStop(1, rgb(fx.orbColor, 0))
      ctx.fillStyle = core
      ctx.beginPath()
      ctx.arc(ox, oy, orbR * 1.9 * pulse, 0, Math.PI * 2)
      ctx.fill()

      if (fx.ring) {
        ctx.strokeStyle = rgb(fx.orbHalo, 0.2)
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(ox, oy, orbR * 2.7, 0, Math.PI * 2)
        ctx.stroke()
      }

      // 地平线霞光
      const hazeTop = baseY - height * 0.28
      const hazeGrad = ctx.createLinearGradient(0, hazeTop, 0, baseY + 6)
      hazeGrad.addColorStop(0, rgb(haze, 0))
      hazeGrad.addColorStop(0.66, rgb(haze, 0.4))
      hazeGrad.addColorStop(1, rgb(haze, 0.6))
      ctx.fillStyle = hazeGrad
      ctx.fillRect(0, hazeTop, width, baseY + 6 - hazeTop)

      // 远处两道浪
      ctx.globalAlpha = 0.34
      ctx.fillStyle = rgb(mixRgb(w1, fx.sky[2], 0.42))
      traceSurface(baseY - amp * 3.1, amp * 0.62, 0.16, 0.9, true)
      ctx.fill()

      ctx.globalAlpha = 0.44
      ctx.fillStyle = rgb(mixRgb(w1, haze, 0.2))
      traceSurface(baseY - amp * 1.25, amp * 0.85, 0.24, 2.2, true)
      ctx.fill()
      ctx.globalAlpha = 1

      // 主体水面
      ctx.save()
      traceSurface(baseY, amp, 0.55, 2.2, true)
      ctx.clip()

      const waterGrad = ctx.createLinearGradient(0, baseY, 0, height)
      waterGrad.addColorStop(0, rgb(w0))
      waterGrad.addColorStop(0.42, rgb(w1))
      waterGrad.addColorStop(1, rgb(w2))
      ctx.fillStyle = waterGrad
      ctx.fillRect(0, baseY - amp * 3, width, height - baseY + amp * 3)

      ctx.globalCompositeOperation = "lighter"

      // 水下光斑
      for (let i = 0; i < 5; i += 1) {
        const p = (i + 1) / 6
        const y = baseY + p * (height - baseY)
        ctx.globalAlpha = 0.028 + 0.026 * (0.5 + 0.5 * Math.sin(time * 0.5 + i * 1.4))
        ctx.fillStyle = rgb(fx.orbLight)
        const bandW = width * (0.36 + 0.52 * p)
        ctx.fillRect(
          width * 0.5 - bandW / 2 + Math.sin(time * 0.35 + i) * width * 0.09,
          y + Math.sin(time * 0.6 + i * 2) * 7,
          bandW,
          1.2 + p * 3.4,
        )
      }

      // 光在水面铺开的那条路
      const rows = 30
      for (let i = 0; i < rows; i += 1) {
        const p = i / (rows - 1)
        const wobble = Math.sin(time * 1.4 + i * 0.85)
        const y = baseY + p * (height - baseY) + wobble * 1.8
        const bandW = (4 + p * 40) * (0.5 + 0.5 * wobble) * clamp(width / 1200, 0.5, 1.4)
        const alpha = (1 - p) * 0.24 * (0.45 + 0.55 * Math.sin(time * 2.1 + i * 1.15))
        if (alpha <= 0.004) continue
        ctx.globalAlpha = alpha
        ctx.fillStyle = rgb(fx.orbLight)
        ctx.fillRect(ox - bandW / 2 + wobble * 6, y, bandW, 2)
      }

      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = "source-over"
      ctx.restore()

      // 浪尖上的一线光
      ctx.save()
      ctx.shadowColor = rgb(fx.orbLight, 0.45)
      ctx.shadowBlur = 10
      ctx.strokeStyle = rgb(fx.orbLight, 0.5)
      ctx.lineWidth = 1.3
      traceSurface(baseY, amp, 0.55, 2.2, false)
      ctx.stroke()
      ctx.restore()

      // 水面的涟漪
      ctx.save()
      ctx.globalCompositeOperation = "lighter"
      for (let i = ripplesRef.current.length - 1; i >= 0; i -= 1) {
        const ripple = ripplesRef.current[i]
        const age = time - ripple.t0
        if (age > 2.8) {
          ripplesRef.current.splice(i, 1)
          continue
        }
        for (let k = 0; k < 3; k += 1) {
          const p = (age - k * 0.22) / 2.1
          if (p <= 0 || p >= 1) continue
          const rx = (12 + p * 160) * (0.6 + 0.4 * ripple.scale)
          ctx.globalAlpha = (1 - p) * 0.4
          ctx.strokeStyle = rgb(fx.orbLight)
          ctx.lineWidth = 0.6 + (1 - p) * 1.6
          ctx.beginPath()
          ctx.ellipse(ripple.x, ripple.y, rx, rx * 0.26, 0, 0, Math.PI * 2)
          ctx.stroke()
        }
      }
      ctx.restore()

      // 浮尘
      ctx.save()
      ctx.globalCompositeOperation = "lighter"
      const moteColor = mixRgb(fx.orbLight, [255, 255, 255], 0.35)
      for (const mote of motes) {
        const x = (mote.x + time * mote.dx) % width
        const y = mote.y + Math.sin(time * mote.sp * 1.6 + mote.ph) * 14
        if (y > surfaceAt(x, baseY, amp, 0.55, 2.2) - 4) continue
        ctx.globalAlpha = 0.08 + 0.16 * (0.5 + 0.5 * Math.sin(time * mote.sp + mote.ph))
        ctx.fillStyle = rgb(moteColor)
        ctx.beginPath()
        ctx.arc(x, y, mote.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
      ctx.globalAlpha = 1
    }

    const tick = (now: number) => {
      loopActive = true
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      time += dt
      timeRef.current = time
      draw()
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = Math.max(1, Math.round(rect.width))
      height = Math.max(1, Math.round(rect.height))
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      stars = Array.from({ length: Math.round(clamp(width / 15, 36, 160)) }, () => ({
        x: Math.random() * width,
        y: Math.random() * height * 0.84,
        r: Math.random() < 0.85 ? 0.85 : 1.5,
        p: Math.random() * Math.PI * 2,
      }))
      motes = Array.from({ length: Math.round(clamp(width / 46, 14, 42)) }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.7 + Math.random() * 1.5,
        sp: 0.2 + Math.random() * 0.5,
        ph: Math.random() * Math.PI * 2,
        dx: 4 + Math.random() * 16,
      }))
    }

    resize()
    draw()
    drawIfIdleRef.current = () => {
      // 动画循环没在出帧时（后台标签页 / 降低动效）同步画一帧
      if (!loopActive) draw()
    }
    last = performance.now()
    if (!reduce) {
      raf = requestAnimationFrame(tick)
    }

    const observer = new ResizeObserver(() => {
      resize()
      drawIfIdleRef.current()
    })
    observer.observe(canvas.parentElement ?? canvas)

    const onVisibility = () => {
      if (document.hidden) {
        loopActive = false
        if (raf) cancelAnimationFrame(raf)
        raf = 0
      } else if (!reduce && !raf) {
        last = performance.now()
        raf = requestAnimationFrame(tick)
      }
    }
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      drawIfIdleRef.current = () => {}
      observer.disconnect()
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  /* ---------- 点击水面泛起涟漪 ---------- */

  useEffect(() => {
    if (!mounted) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const onDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest("button, a, textarea, input, select, label, [data-no-ripple]")) return
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      ripplesRef.current.push({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        t0: timeRef.current,
        scale: 0.7 + Math.random() * 0.7,
      })
    }

    window.addEventListener("pointerdown", onDown)
    return () => window.removeEventListener("pointerdown", onDown)
  }, [mounted])

  /* ---------- 光标带动光影 ---------- */

  useEffect(() => {
    if (!mounted) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    let tween: gsap.core.Tween | null = null
    const onMove = (event: PointerEvent) => {
      const nx = (event.clientX / window.innerWidth - 0.5) * 2
      const ny = (event.clientY / window.innerHeight - 0.5) * 2
      tween?.kill()
      tween = gsap.to(parallaxRef.current, { x: -nx * 16, y: -ny * 10, duration: 1.4, ease: "power2.out" })
    }

    window.addEventListener("pointermove", onMove)
    return () => {
      window.removeEventListener("pointermove", onMove)
      tween?.kill()
    }
  }, [mounted])

  /* ---------- 记录 ---------- */

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!mounted) return

    const nextEntry: TideEntry = {
      date: getLocalDateKey(),
      mood: selectedMood,
      note: note.trim(),
      createdAt: Date.now(),
    }

    const next = [nextEntry, ...entries.filter((entry) => entry.date !== nextEntry.date)].sort((a, b) =>
      b.date.localeCompare(a.date),
    )
    setEntries(next)
    saveEntries(next)
    setSaved(true)

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const canvas = canvasRef.current
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        const originX = rect.width * ORB.left
        for (let i = 0; i < 3; i += 1) {
          ripplesRef.current.push({
            x: originX + (i - 1) * 34,
            y: rect.height * 0.62 + i * 18,
            t0: timeRef.current + i * 0.16,
            scale: 1,
          })
        }
      }
      if (panelRef.current) {
        gsap.fromTo(panelRef.current, { y: 10 }, { y: 0, duration: 0.9, ease: "power3.out" })
      }
      gsap.fromTo(".saved-note", { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power2.out" })
    }

    window.setTimeout(() => setSaved(false), 2400)
  }

  const ui = sky.ui
  const rootStyle = {
    "--ink": ui.ink,
    "--ink-soft": ui.inkSoft,
    "--ink-faint": ui.inkFaint,
    "--line": ui.line,
    "--panel": ui.panel,
    "--panel-line": ui.panelLine,
    "--chip": ui.chip,
    "--chip-line": ui.chipLine,
    "--fill": ui.accentBg,
    "--fill-hover": ui.accentHover,
    "--fill-ink": ui.accentInk,
    "--grain": ui.grain,
    backgroundColor: sky.fallback,
  } as CSSProperties

  return (
    <main
      ref={rootRef}
      className="relative flex min-h-screen flex-col overflow-hidden transition-colors duration-1000"
      style={rootStyle}
    >
      {/* 场景：天空、光、水面都由画布绘制 */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <canvas ref={canvasRef} className="h-full w-full" />
      </div>
      <div
        className="pointer-events-none absolute inset-0 z-10 opacity-[0.55]"
        style={{
          backgroundImage: "radial-gradient(var(--grain) 0.7px, transparent 0.7px)",
          backgroundSize: "22px 22px",
        }}
      />

      <div className="relative z-20 flex min-h-screen flex-col">
        {/* 顶部 */}
        <header className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-8 sm:pt-7 lg:px-10">
          <div className="tide-intro">
            <Breadcrumb variant={ui.breadcrumb} />
            <div className="mt-2 text-[10px] font-medium tracking-[0.18em]" style={{ color: "var(--ink-faint)" }}>
              心迹 / 情绪记录
            </div>
          </div>

          <div className="tide-intro text-right">
            <div className="text-[10px] tracking-[0.16em]" style={{ color: "var(--ink-faint)" }}>
              今天
            </div>
            <div className="mt-1 text-xs font-medium" style={{ color: "var(--ink-soft)" }}>
              {todayLabel || "—"}
            </div>
            <div className="mt-1.5 flex items-center justify-end gap-1.5" title={`${sky.name} · ${sky.range}`}>
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: rgb(sky.fx.orbColor), boxShadow: `0 0 8px ${rgb(sky.fx.orbColor, 0.85)}` }}
              />
              <span className="text-[9px] tracking-[0.14em]" style={{ color: "var(--ink-faint)" }}>
                {sky.name} · {sky.moment}
              </span>
            </div>
            {todayEntry && (
              <span
                className="mt-2 inline-block rounded-full px-2 py-0.5 text-[9px] tracking-[0.08em]"
                style={{ background: "var(--chip)", color: "var(--ink-soft)", border: "1px solid var(--chip-line)" }}
              >
                今天已留下
              </span>
            )}
          </div>
        </header>

        {/* 主体 */}
        <section className="relative flex flex-1 flex-col justify-center px-5 py-10 sm:px-8 lg:px-10">
          <div className="max-w-[560px]">
            <h1
              className="tide-intro text-[clamp(52px,7.4vw,116px)] font-semibold leading-[0.86] tracking-[-0.065em]"
              style={{ color: "var(--ink)" }}
            >
              潮汐
            </h1>
            <p
              className="tide-intro mt-6 max-w-[480px] font-serif text-[clamp(21px,2.2vw,36px)] italic leading-[1.45] tracking-[-0.01em]"
              style={{ color: "var(--ink-soft)" }}
            >
              “{effectiveMood.line}”
            </p>
            <div className="tide-intro mt-6 h-px w-16" style={{ background: "var(--line)" }} />

            <div className="tide-intro mt-7 w-[248px] max-w-full">
              <div
                className="flex items-baseline justify-between text-[9px] tracking-[0.16em]"
                style={{ color: "var(--ink-faint)" }}
              >
                <span>低潮</span>
                <span>满潮</span>
              </div>
              <div className="relative mt-2 h-[3px] w-full rounded-full" style={{ background: "var(--line)" }}>
                <span
                  ref={barRef}
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${MOODS[0].level * 100}%`,
                    background: `linear-gradient(90deg, ${tone[0]}, ${tone[2]})`,
                  }}
                />
                <span
                  ref={knobRef}
                  className="absolute top-1/2 h-3 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{ left: `${MOODS[0].level * 100}%`, background: "var(--ink)" }}
                />
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span ref={valueRef} className="font-mono text-[12px]" style={{ color: "var(--ink-soft)" }}>
                  {Math.round(MOODS[0].level * 100)}
                </span>
                <span className="text-[9px] tracking-[0.12em]" style={{ color: "var(--ink-faint)" }}>
                  / 100 · 此刻水位
                </span>
              </div>
            </div>

            <p className="tide-intro mt-6 max-w-[380px] text-[11px] leading-5" style={{ color: "var(--ink-faint)" }}>
              不必写很多。选一个此刻的心情，让今天在水面上留下一个轻轻的刻度。水面的颜色会跟着一天的光，慢慢改变。
            </p>
          </div>

          <div
            className="pointer-events-none absolute right-5 top-[16%] hidden lg:block xl:right-9"
            style={{ writingMode: "vertical-rl" }}
          >
            <p
              className="font-serif text-[13px] italic leading-[2] tracking-[0.26em]"
              style={{ color: "var(--ink-faint)" }}
            >
              {sideLine}
            </p>
          </div>
        </section>

        {/* 底部记录台 */}
        <section ref={panelRef} data-no-ripple className="tide-panel relative">
          <div
            className="pointer-events-none h-20"
            style={{ background: "linear-gradient(to top, var(--vignette), transparent)" }}
          />

          <div
            className="border-t px-4 py-3.5 backdrop-blur-2xl sm:px-6 lg:px-8"
            style={{ background: "var(--panel)", borderColor: "var(--panel-line)" }}
          >
            <form
              onSubmit={handleSubmit}
              className="mx-auto grid max-w-[1480px] gap-3 lg:grid-cols-[minmax(0,1.05fr)_minmax(300px,.85fr)_auto] lg:items-end"
            >
              <div>
                <div className="mb-2 flex items-center justify-between gap-4">
                  <span className="text-[10px] font-medium tracking-[0.12em]" style={{ color: "var(--ink-faint)" }}>
                    此刻更接近哪一种？
                  </span>
                  <span
                    className="hidden items-center gap-1.5 text-[9px] sm:flex"
                    style={{ color: "var(--ink-faint)" }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone[1] }} />
                    {effectiveMood.label} · {effectiveMood.hint}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  {MOODS.map((item) => {
                    const active = selectedMood === item.key
                    const itemTone = swatch(item, sky)
                    return (
                      <button
                        key={item.key}
                        type="button"
                        title={item.hint}
                        aria-pressed={active}
                        onClick={() => setSelectedMood(item.key)}
                        onMouseEnter={() => setHoverMood(item.key)}
                        onMouseLeave={() => setHoverMood(null)}
                        onFocus={() => setHoverMood(item.key)}
                        onBlur={() => setHoverMood(null)}
                        className="min-h-[70px] rounded-[3px] border px-2 pb-2 pt-2.5 text-center transition-all duration-500"
                        style={
                          active
                            ? {
                                background: `linear-gradient(150deg, ${itemTone[0]}, ${itemTone[2]})`,
                                borderColor: "transparent",
                                boxShadow: "0 14px 30px -16px rgba(18,30,28,.62)",
                                color: "#ffffff",
                              }
                            : {
                                background: "var(--chip)",
                                borderColor: "var(--chip-line)",
                                color: "var(--ink-soft)",
                              }
                        }
                      >
                        <span className="block text-lg leading-none">{item.short}</span>
                        <span
                          className="mt-1.5 block text-[9px] font-medium tracking-[0.08em]"
                          style={{ color: active ? "rgba(255,255,255,.8)" : "var(--ink-faint)" }}
                        >
                          {item.label}
                        </span>
                        <span
                          className="mx-auto mt-1.5 block h-[3px] w-8 overflow-hidden rounded-full"
                          style={{ background: active ? "rgba(255,255,255,.3)" : "var(--chip-line)" }}
                        >
                          <span
                            className="block h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${item.level * 100}%`,
                              background: active
                                ? "rgba(255,255,255,.9)"
                                : `linear-gradient(90deg, ${itemTone[0]}, ${itemTone[2]})`,
                            }}
                          />
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label
                  htmlFor="tide-note"
                  className="mb-2 block text-[10px] font-medium tracking-[0.12em]"
                  style={{ color: "var(--ink-faint)" }}
                >
                  给今天留一句话，可不写
                </label>
                <textarea
                  id="tide-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value.slice(0, 80))}
                  placeholder="比如：今天没有发生什么，但晚风很好。"
                  className="h-[70px] w-full resize-none rounded-[3px] border px-3 py-2.5 text-sm leading-5 outline-none transition"
                  style={{ background: "var(--chip)", borderColor: "var(--chip-line)", color: "var(--ink)" }}
                />
              </div>

              <button
                type="submit"
                className="group flex min-h-[70px] min-w-[168px] items-center justify-between rounded-[3px] px-4 text-left transition-colors duration-300"
                style={{ background: "var(--fill)", color: "var(--fill-ink)" }}
              >
                <span>
                  <span className="block text-[9px] tracking-[0.12em] opacity-70">记录今天</span>
                  <span className="mt-1 block text-sm font-semibold">{todayEntry ? "更新潮汐" : "留下潮汐"}</span>
                </span>
                <span className="text-lg transition-transform duration-300 group-hover:translate-x-1">→</span>
              </button>
            </form>

            <div
              className="mx-auto mt-3.5 grid max-w-[1480px] gap-4 border-t pt-3.5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-8"
              style={{ borderColor: "var(--panel-line)" }}
            >
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="text-[10px] font-medium tracking-[0.12em]" style={{ color: "var(--ink-faint)" }}>
                    近 7 天的潮线
                  </span>
                  <span className="hidden text-[9px] sm:block" style={{ color: "var(--ink-faint)" }}>
                    把光标停在某一天，可以看到那天留下的字
                  </span>
                </div>
                <TideCurve
                  days={curveDays}
                  dark={ui.breadcrumb === "dark"}
                  tokens={{ ink: ui.ink, inkSoft: ui.inkSoft, inkFaint: ui.inkFaint, line: ui.line }}
                />
              </div>

              <div className="flex items-end justify-between gap-6 pb-1 lg:flex-col lg:items-end lg:gap-2">
                <div className="lg:text-right">
                  <div className="text-[9px] tracking-[0.14em]" style={{ color: "var(--ink-faint)" }}>
                    连续记录
                  </div>
                  <div className="mt-0.5 flex items-baseline gap-1 lg:justify-end">
                    <span className="font-mono text-[15px]" style={{ color: "var(--ink)" }}>
                      {streak}
                    </span>
                    <span className="text-[9px]" style={{ color: "var(--ink-faint)" }}>
                      天
                    </span>
                  </div>
                </div>
                <div className="lg:text-right">
                  <div className="text-[9px] tracking-[0.14em]" style={{ color: "var(--ink-faint)" }}>
                    一共留下
                  </div>
                  <div className="mt-0.5 flex items-baseline gap-1 lg:justify-end">
                    <span className="font-mono text-[15px]" style={{ color: "var(--ink)" }}>
                      {entries.length}
                    </span>
                    <span className="text-[9px]" style={{ color: "var(--ink-faint)" }}>
                      天
                    </span>
                  </div>
                </div>
                <div
                  className="hidden text-[9px] leading-4 lg:block lg:text-right"
                  style={{ color: "var(--ink-faint)" }}
                >
                  BitLeap · 只保存在这台设备
                  <br />
                  不会上传
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {saved && (
        <div
          className="saved-note fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-[3px] border px-5 py-3 text-xs font-medium shadow-xl backdrop-blur-md"
          style={{ background: "var(--panel)", borderColor: "var(--panel-line)", color: "var(--ink)" }}
        >
          今天的潮汐已经留下
        </div>
      )}

      <span className="sr-only" aria-live="polite">
        {`当前心情 ${getMood(selectedMood).label}，水位 ${Math.round(getMood(selectedMood).level * 100)}`}
      </span>
    </main>
  )
}
