"use client"

import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type MoodKey = "calm" | "miss" | "tired" | "happy" | "blank"

type Mood = {
  key: MoodKey
  label: string
  short: string
  line: string
  level: number
  water: [string, string, string]
  glow: string
  surface: string
}

type TideEntry = {
  date: string
  mood: MoodKey
  note: string
  createdAt: number
}

const MOODS: Mood[] = [
  {
    key: "calm",
    label: "平静",
    short: "静",
    line: "今天的水面很轻，风也很慢。",
    level: 0.46,
    water: ["#9fc8c3", "#6fa9aa", "#4e7f86"],
    glow: "#f7ddb3",
    surface: "#dbe7df",
  },
  {
    key: "miss",
    label: "想念",
    short: "念",
    line: "有些名字没有说出口，也会在心里涨潮。",
    level: 0.62,
    water: ["#b9b6d8", "#8e91b8", "#646b95"],
    glow: "#f1d1c2",
    surface: "#e3dfeb",
  },
  {
    key: "tired",
    label: "疲惫",
    short: "倦",
    line: "今天就让潮水替你把力气慢慢收回来。",
    level: 0.72,
    water: ["#96a8ae", "#70878f", "#51676e"],
    glow: "#ead8bd",
    surface: "#d6dddc",
  },
  {
    key: "happy",
    label: "开心",
    short: "晴",
    line: "今天有一点光，刚好落进了水里。",
    level: 0.36,
    water: ["#9ed3c0", "#6eb49f", "#498b7e"],
    glow: "#ffd69e",
    surface: "#e4eadf",
  },
  {
    key: "blank",
    label: "空白",
    short: "空",
    line: "没有特别的情绪，也是一种被允许的天气。",
    level: 0.52,
    water: ["#aebec2", "#8fa3a7", "#6b8186"],
    glow: "#f0dfc8",
    surface: "#dde3e1",
  },
]

function getLocalDateKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function formatChineseDate(date = new Date()) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date)
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
  localStorage.setItem("bitleap:tide:entries", JSON.stringify(entries))
}

function getMood(key: MoodKey) {
  return MOODS.find((mood) => mood.key === key) ?? MOODS[0]
}

function buildRecentDays(entries: TideEntry[]) {
  const result: { key: string; day: string; weekday: string; entry?: TideEntry }[] = []
  const formatter = new Intl.DateTimeFormat("zh-CN", { weekday: "short" })

  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const key = getLocalDateKey(date)
    result.push({
      key,
      day: String(date.getDate()).padStart(2, "0"),
      weekday: formatter.format(date).replace("周", ""),
      entry: entries.find((item) => item.date === key),
    })
  }
  return result
}

export default function TidePage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const waterWrapRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const tideValueRef = useRef({ level: MOODS[0].level })

  const [mounted, setMounted] = useState(false)
  const [entries, setEntries] = useState<TideEntry[]>([])
  const [selectedMood, setSelectedMood] = useState<MoodKey>("calm")
  const [note, setNote] = useState("")
  const [saved, setSaved] = useState(false)
  const [todayLabel, setTodayLabel] = useState("")

  const mood = useMemo(() => getMood(selectedMood), [selectedMood])
  const todayKey = mounted ? getLocalDateKey() : ""
  const todayEntry = entries.find((entry) => entry.date === todayKey)
  const recentDays = useMemo(() => (mounted ? buildRecentDays(entries) : []), [entries, mounted])

  useEffect(() => {
    setMounted(true)
    setTodayLabel(formatChineseDate())
    const stored = loadEntries()
    setEntries(stored)
    const today = stored.find((entry) => entry.date === getLocalDateKey())
    if (today) {
      setSelectedMood(today.mood)
      setNote(today.note)
    }
  }, [])

  useEffect(() => {
    const root = rootRef.current
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      gsap.from(".tide-intro", {
        y: 18,
        opacity: 0,
        duration: 0.9,
        stagger: 0.08,
        ease: "power3.out",
      })
      gsap.from(".tide-panel", {
        y: 24,
        opacity: 0,
        duration: 1.0,
        delay: 0.18,
        ease: "power3.out",
      })
    }, root)

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (!mounted) return

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const target = mood.level

    if (prefersReduced) {
      tideValueRef.current.level = target
      return
    }

    const tween = gsap.to(tideValueRef.current, {
      level: target,
      duration: 1.8,
      ease: "sine.inOut",
    })

    if (glowRef.current) {
      gsap.fromTo(glowRef.current, { scale: 0.96, opacity: 0.72 }, { scale: 1, opacity: 1, duration: 1.4, ease: "sine.out" })
    }

    return () => tween.kill()
  }, [mood, mounted])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let frame = 0
    let raf = 0
    let width = 0
    let height = 0
    let dpr = 1

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const drawWave = (baseY: number, amp: number, speed: number, offset: number, fill: string, alpha: number) => {
      ctx.beginPath()
      ctx.moveTo(0, height)
      ctx.lineTo(0, baseY)

      for (let x = 0; x <= width + 6; x += 6) {
        const y =
          baseY +
          Math.sin(x * 0.011 + frame * speed + offset) * amp +
          Math.sin(x * 0.0046 - frame * speed * 0.58 + offset * 1.7) * amp * 0.42
        ctx.lineTo(x, y)
      }

      ctx.lineTo(width, height)
      ctx.closePath()
      ctx.globalAlpha = alpha
      ctx.fillStyle = fill
      ctx.fill()
      ctx.globalAlpha = 1
    }

    const draw = () => {
      frame += 1
      ctx.clearRect(0, 0, width, height)

      const level = tideValueRef.current.level
      const baseY = height * (1 - level)
      const gradient = ctx.createLinearGradient(0, baseY, 0, height)
      gradient.addColorStop(0, mood.water[0])
      gradient.addColorStop(0.45, mood.water[1])
      gradient.addColorStop(1, mood.water[2])

      drawWave(baseY + 18, 14, 0.018, 0.8, mood.water[1], 0.48)
      drawWave(baseY + 8, 11, 0.023, 2.4, gradient as unknown as string, 0.78)

      ctx.save()
      ctx.beginPath()
      ctx.moveTo(0, height)
      ctx.lineTo(0, baseY)
      for (let x = 0; x <= width + 6; x += 6) {
        const y = baseY + Math.sin(x * 0.011 + frame * 0.023 + 2.4) * 11 + Math.sin(x * 0.0046 - frame * 0.01334 + 4.08) * 4.6
        ctx.lineTo(x, y)
      }
      ctx.lineTo(width, height)
      ctx.closePath()
      ctx.clip()

      ctx.fillStyle = gradient
      ctx.fillRect(0, baseY - 30, width, height - baseY + 30)

      const light = ctx.createRadialGradient(width * 0.72, baseY + height * 0.18, 0, width * 0.72, baseY + height * 0.18, width * 0.34)
      light.addColorStop(0, "rgba(255,245,221,.22)")
      light.addColorStop(1, "rgba(255,245,221,0)")
      ctx.fillStyle = light
      ctx.fillRect(0, baseY - 20, width, height - baseY + 20)
      ctx.restore()

      raf = requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener("resize", resize)
    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
    }
  }, [mood])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!mounted) return

    const nextEntry: TideEntry = {
      date: getLocalDateKey(),
      mood: selectedMood,
      note: note.trim(),
      createdAt: Date.now(),
    }

    const next = [nextEntry, ...entries.filter((entry) => entry.date !== nextEntry.date)].sort((a, b) => b.date.localeCompare(a.date))
    setEntries(next)
    saveEntries(next)
    setSaved(true)

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      if (waterWrapRef.current) {
        gsap.fromTo(waterWrapRef.current, { scale: 0.995 }, { scale: 1, duration: 1.1, ease: "sine.out" })
      }
      gsap.fromTo(".saved-note", { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power2.out" })
    }

    window.setTimeout(() => setSaved(false), 2200)
  }

  return (
    <main ref={rootRef} className="relative h-screen overflow-hidden bg-[#e9e5dc] text-[#2f332f]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_14%,rgba(255,238,207,.72),transparent_23%),linear-gradient(180deg,#dedfd4_0%,#e6e3d8_45%,#cad5d0_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.15] [background-image:radial-gradient(rgba(59,69,63,.19)_0.7px,transparent_0.7px)] [background-size:22px_22px]" />

      <div ref={waterWrapRef} className="absolute inset-0">
        <div ref={glowRef} className="pointer-events-none absolute right-[8vw] top-[10vh] z-[2] h-[15vw] min-h-[110px] w-[15vw] min-w-[110px] max-h-[210px] max-w-[210px] rounded-full" style={{ background: `radial-gradient(circle, ${mood.glow} 0%, ${mood.glow} 31%, rgba(255,255,255,.16) 32%, rgba(255,255,255,0) 72%)`, boxShadow: `0 0 100px ${mood.glow}` }} />
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      </div>

      <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between px-5 pt-5 sm:px-8 sm:pt-7 lg:px-10">
        <div className="tide-intro">
          <Breadcrumb />
          <div className="mt-3 text-[10px] font-medium tracking-[0.16em] text-black/28">心迹 / 情绪记录</div>
        </div>

        <div className="tide-intro text-right">
          <div className="text-[10px] tracking-[0.14em] text-black/24">今天</div>
          <div className="mt-1 text-xs font-medium text-black/48">{todayLabel || "—"}</div>
        </div>
      </div>

      <div className="absolute left-5 top-[19vh] z-10 max-w-[520px] sm:left-8 lg:left-10">
        <div className="tide-intro text-[clamp(52px,7vw,108px)] font-semibold leading-[0.88] tracking-[-0.065em] text-[#2e3834]/90">潮汐</div>
        <div className="tide-intro mt-5 max-w-[470px] font-serif text-[clamp(22px,2.2vw,36px)] italic leading-[1.45] tracking-[-0.02em] text-[#3b403d]/68">“{mood.line}”</div>
        <div className="tide-intro mt-5 h-px w-16 bg-black/12" />
        <p className="tide-intro mt-4 max-w-[390px] text-[11px] leading-5 text-black/36">不必写很多。选一个此刻的心情，让今天在水面上留下一个轻轻的刻度。</p>
      </div>

      <div className="pointer-events-none absolute left-5 top-[58vh] z-10 hidden sm:block sm:left-8 lg:left-10">
        <div className="text-[9px] tracking-[0.16em] text-black/20">TODAY'S TIDE</div>
        <div className="mt-1 font-mono text-[11px] text-black/30">{Math.round(mood.level * 100)} / 100</div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20">
        <div className="pointer-events-none h-28 bg-gradient-to-t from-[#213f43]/18 to-transparent" />

        <div className="border-t border-white/35 bg-[#f4efe6]/84 px-4 py-3 backdrop-blur-2xl sm:px-6 lg:px-8">
          <form onSubmit={handleSubmit} className="mx-auto grid max-w-[1480px] gap-3 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,.9fr)_auto] lg:items-end">
            <div>
              <div className="mb-2 flex items-center justify-between gap-4">
                <span className="text-[10px] font-medium tracking-[0.12em] text-black/34">此刻更接近哪一种？</span>
                <span className="text-[9px] text-black/22">选择后，潮水会慢慢改变</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {MOODS.map((item) => {
                  const active = selectedMood === item.key
                  return (
                    <button key={item.key} type="button" onClick={() => setSelectedMood(item.key)} className={`min-h-[66px] border px-2 py-2.5 text-center transition-all duration-500 ${active ? "border-black/18 bg-[#263c3f] text-white shadow-[0_8px_24px_rgba(38,60,63,.14)]" : "border-black/8 bg-white/32 text-black/48 hover:bg-white/60"}`}>
                      <div className="text-lg">{item.short}</div>
                      <div className={`mt-1 text-[9px] font-medium ${active ? "text-white/62" : "text-black/32"}`}>{item.label}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label htmlFor="tide-note" className="mb-2 block text-[10px] font-medium tracking-[0.12em] text-black/34">给今天留一句话，可不写</label>
              <textarea id="tide-note" value={note} onChange={(event) => setNote(event.target.value.slice(0, 80))} placeholder="比如：今天没有发生什么，但晚风很好。" className="h-[66px] w-full resize-none border border-black/8 bg-white/36 px-3 py-2.5 text-sm leading-5 text-black/66 outline-none transition placeholder:text-black/22 focus:border-black/18 focus:bg-white/58" />
            </div>

            <button type="submit" className="group flex min-h-[66px] min-w-[160px] items-center justify-between bg-[#c8dda9] px-4 text-left text-[#24322b] transition duration-300 hover:bg-[#bdd49b]">
              <span>
                <span className="block text-[9px] tracking-[0.1em] text-black/34">记录今天</span>
                <span className="mt-1 block text-sm font-semibold">{todayEntry ? "更新潮汐" : "留下潮汐"}</span>
              </span>
              <span className="text-lg transition-transform duration-300 group-hover:translate-x-1">→</span>
            </button>
          </form>

          <div className="mx-auto mt-3 hidden max-w-[1480px] grid-cols-[1fr_auto] items-center gap-6 border-t border-black/7 pt-3 xl:grid">
            <div className="grid grid-cols-7 gap-1.5">
              {recentDays.map((day) => {
                const dayMood = day.entry ? getMood(day.entry.mood) : null
                return (
                  <div key={day.key} className="grid grid-cols-[26px_1fr_auto] items-center gap-2 border-r border-black/7 pr-2 last:border-r-0">
                    <div className="text-[8px] text-black/24">{day.weekday}</div>
                    <div className="relative h-5 overflow-hidden bg-black/[0.04]">
                      {dayMood && <div className="absolute inset-y-0 left-0" style={{ width: `${Math.max(18, dayMood.level * 100)}%`, background: `linear-gradient(90deg, ${dayMood.water[0]}, ${dayMood.water[2]})` }} />}
                    </div>
                    <div className="text-[8px] font-medium text-black/30">{day.day}</div>
                  </div>
                )
              })}
            </div>
            <div className="text-[9px] text-black/24">{entries.length ? `已经留下 ${entries.length} 天` : "从今天开始"}</div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-[154px] right-5 z-10 hidden max-w-[320px] text-right lg:block lg:right-8 xl:right-10">
        <div className="font-serif text-[18px] italic leading-7 text-black/32 mb-5">情绪不是需要被解决的东西。<br />有时只是经过，像潮水一样。</div>
      </div>

      {saved && (
        <div className="saved-note fixed bottom-28 left-1/2 z-50 -translate-x-1/2 border border-white/20 bg-[#263c3f]/94 px-5 py-3 text-xs font-medium text-white shadow-xl backdrop-blur">
          今天的潮汐已经留下
        </div>
      )}
    </main>
  )
}
