"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type Option = {
  id: string
  text: string
  color: string
}

type HistoryItem = {
  id: string
  text: string
  color: string
  at: number
}

const STORAGE_KEY = "bitleap-roulette-v2"

const PALETTE = [
  "#52685d",
  "#c36a4c",
  "#d2a548",
  "#486878",
  "#7b6586",
  "#b96e79",
  "#71854f",
  "#987158",
  "#65718d",
  "#b07c3f",
  "#577c78",
  "#8d625f",
]

const INITIAL_OPTIONS: Option[] = [
  { id: "initial-1", text: "去散步", color: PALETTE[0] },
  { id: "initial-2", text: "看一部电影", color: PALETTE[1] },
  { id: "initial-3", text: "吃点喜欢的", color: PALETTE[2] },
  { id: "initial-4", text: "早点休息", color: PALETTE[3] },
]

function createId(prefix = "opt") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function sanitizeImported(raw: string) {
  const seen = new Set<string>()
  return raw
    .split(/[\n,，、;；]+/)
    .map((value) => value.trim())
    .filter((value) => {
      if (!value) return false
      const key = value.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 24)
}

function clampText(text: string, count: number) {
  const limit = count >= 16 ? 7 : count >= 10 ? 9 : 13
  return text.length > limit ? `${text.slice(0, limit)}…` : text
}

function toDisplayTime(timestamp: number) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp))
}

export default function Roulette() {
  const [options, setOptions] = useState<Option[]>(INITIAL_OPTIONS)
  const [spinning, setSpinning] = useState(false)
  const [winner, setWinner] = useState<Option | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [noRepeat, setNoRepeat] = useState(false)
  const [excludedIds, setExcludedIds] = useState<string[]>([])
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkText, setBulkText] = useState("")
  const [hydrated, setHydrated] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wheelRef = useRef<HTMLDivElement>(null)
  const pointerRef = useRef<HTMLDivElement>(null)
  const pointerGlowRef = useRef<HTMLDivElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const rotationRef = useRef(0)

  const validOptions = useMemo(
    () => options.filter((option) => option.text.trim()),
    [options],
  )

  const activeOptions = useMemo(
    () =>
      noRepeat
        ? validOptions.filter((option) => !excludedIds.includes(option.id))
        : validOptions,
    [validOptions, noRepeat, excludedIds],
  )

  const canSpin = activeOptions.length >= 2 && !spinning

  const drawWheel = useCallback((opts: Option[]) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const logicalSize = 560
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = logicalSize * dpr
    canvas.height = logicalSize * dpr

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, logicalSize, logicalSize)

    const cx = logicalSize / 2
    const cy = logicalSize / 2
    const radius = 260

    if (!opts.length) {
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.fillStyle = "#dedbd1"
      ctx.fill()
      return
    }

    const arc = (Math.PI * 2) / opts.length

    ctx.save()
    ctx.translate(cx, cy)

    opts.forEach((option, index) => {
      const start = index * arc - Math.PI / 2
      const end = start + arc
      const center = start + arc / 2

      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, radius, start, end)
      ctx.closePath()
      ctx.fillStyle = option.color
      ctx.fill()

      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(Math.cos(start) * radius, Math.sin(start) * radius)
      ctx.strokeStyle = "rgba(255,255,255,.26)"
      ctx.lineWidth = 1
      ctx.stroke()

      ctx.save()
      ctx.rotate(center)

      const normalized = ((center % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
      const flip = normalized > Math.PI / 2 && normalized < Math.PI * 1.5

      if (flip) {
        ctx.rotate(Math.PI)
        ctx.textAlign = "left"
      } else {
        ctx.textAlign = "right"
      }

      ctx.textBaseline = "middle"
      ctx.fillStyle = "rgba(255,255,255,.96)"
      ctx.font = `600 ${opts.length >= 16 ? 11 : opts.length >= 10 ? 12 : 14}px ui-sans-serif, system-ui, sans-serif`
      ctx.shadowColor = "rgba(0,0,0,.18)"
      ctx.shadowBlur = 8

      const x = flip ? -(radius - 24) : radius - 24
      ctx.fillText(clampText(option.text, opts.length), x, 0)
      ctx.restore()
    })

    ctx.restore()

    ctx.beginPath()
    ctx.arc(cx, cy, radius - 1, 0, Math.PI * 2)
    ctx.strokeStyle = "rgba(32,33,29,.16)"
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(cx, cy, 43, 0, Math.PI * 2)
    ctx.fillStyle = "#f3f0e7"
    ctx.fill()

    ctx.beginPath()
    ctx.arc(cx, cy, 29, 0, Math.PI * 2)
    ctx.fillStyle = "#252620"
    ctx.fill()

    ctx.beginPath()
    ctx.arc(cx, cy, 5, 0, Math.PI * 2)
    ctx.fillStyle = "#f3f0e7"
    ctx.fill()
  }, [])

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null")
      if (stored?.options?.length >= 2) setOptions(stored.options.slice(0, 24))
      if (Array.isArray(stored?.history)) setHistory(stored.history.slice(0, 8))
      if (typeof stored?.noRepeat === "boolean") setNoRepeat(stored.noRepeat)
      if (Array.isArray(stored?.excludedIds)) setExcludedIds(stored.excludedIds)
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          options,
          history,
          noRepeat,
          excludedIds,
        }),
      )
    } catch {}
  }, [options, history, noRepeat, excludedIds, hydrated])

  useEffect(() => {
    drawWheel(activeOptions)
  }, [activeOptions, drawWheel])

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced || !pageRef.current) return

    const ctx = gsap.context(() => {
      gsap.from(".roulette-reveal", {
        y: 22,
        opacity: 0,
        duration: 0.82,
        stagger: 0.065,
        ease: "power3.out",
      })

      gsap.to(".roulette-orbit-a", {
        rotation: 360,
        duration: 44,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })

      gsap.to(".roulette-orbit-b", {
        rotation: -360,
        duration: 72,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })
    }, pageRef)

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable

      if (event.code === "Space" && !typing) {
        event.preventDefault()
        if (canSpin) spin()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  })

  const updateOption = (id: string, text: string) => {
    if (spinning) return
    setOptions((current) =>
      current.map((option) => (option.id === id ? { ...option, text } : option)),
    )
    setWinner(null)
  }

  const addOption = () => {
    if (spinning || options.length >= 24) return

    const next: Option = {
      id: createId(),
      text: `选项 ${options.length + 1}`,
      color: PALETTE[options.length % PALETTE.length],
    }

    setOptions((current) => [...current, next])
    setWinner(null)

    window.setTimeout(() => {
      const index = options.length
      inputRefs.current[index]?.focus()
      inputRefs.current[index]?.select()
    }, 0)
  }

  const removeOption = (id: string) => {
    if (spinning || options.length <= 2) return
    setOptions((current) => current.filter((option) => option.id !== id))
    setExcludedIds((current) => current.filter((value) => value !== id))
    setWinner(null)
  }

  const shuffleOptions = () => {
    if (spinning) return
    setOptions((current) => {
      const copy = [...current]
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
      }
      return copy.map((option, index) => ({
        ...option,
        color: PALETTE[index % PALETTE.length],
      }))
    })
    setWinner(null)
  }

  const resetAll = () => {
    if (spinning) return
    setOptions(INITIAL_OPTIONS)
    setHistory([])
    setWinner(null)
    setExcludedIds([])
    setNoRepeat(false)
    rotationRef.current = 0
    if (wheelRef.current) gsap.set(wheelRef.current, { rotation: 0 })
  }

  const resetPool = () => {
    setExcludedIds([])
    setWinner(null)
  }

  const applyBulk = () => {
    const imported = sanitizeImported(bulkText)
    if (imported.length < 2) return

    setOptions(
      imported.map((text, index) => ({
        id: createId(),
        text,
        color: PALETTE[index % PALETTE.length],
      })),
    )

    setHistory([])
    setWinner(null)
    setExcludedIds([])
    setBulkOpen(false)
    setBulkText("")
    rotationRef.current = 0

    if (wheelRef.current) {
      gsap.set(wheelRef.current, { rotation: 0 })
    }
  }

  const spin = () => {
    if (!canSpin || !wheelRef.current) return

    const pool = activeOptions
    const winnerIndex = Math.floor(Math.random() * pool.length)
    const nextWinner = pool[winnerIndex]

    const arc = 360 / pool.length
    const targetMod = (360 - ((winnerIndex + 0.5) * arc) % 360) % 360
    const currentMod = ((rotationRef.current % 360) + 360) % 360
    const alignment = (targetMod - currentMod + 360) % 360
    const extraTurns = 6 + Math.floor(Math.random() * 3)
    const targetRotation = rotationRef.current + extraTurns * 360 + alignment
    const spinProxy = { value: rotationRef.current }

    setSpinning(true)
    setWinner(null)
    gsap.killTweensOf(wheelRef.current)
    gsap.killTweensOf(spinProxy)

    gsap.to(spinProxy, {
      value: targetRotation,
      duration: 4.6,
      ease: "power4.out",
      onUpdate: () => {
        if (!wheelRef.current) return
        wheelRef.current.style.transform = `rotate(${spinProxy.value}deg)`
      },
      onComplete: () => {
        rotationRef.current = targetRotation
        setSpinning(false)
        setWinner(nextWinner)

        if (
          pointerGlowRef.current &&
          !window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
          gsap.fromTo(
            pointerGlowRef.current,
            { scale: 0.72, opacity: 0 },
            {
              scale: 1.35,
              opacity: 0,
              duration: 0.55,
              ease: "power2.out",
              overwrite: true,
            },
          )
        }
        setHistory((current) => [
          {
            id: createId("history"),
            text: nextWinner.text,
            color: nextWinner.color,
            at: Date.now(),
          },
          ...current,
        ].slice(0, 8))

        if (noRepeat) {
          setExcludedIds((current) =>
            current.includes(nextWinner.id)
              ? current
              : [...current, nextWinner.id],
          )
        }

        if (
          resultRef.current &&
          !window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
          gsap.timeline()
            .fromTo(
              resultRef.current,
              { y: 12, opacity: 0, scale: 0.96 },
              {
                y: 0,
                opacity: 1,
                scale: 1,
                duration: 0.5,
                ease: "back.out(1.8)",
              },
            )
            .fromTo(
              ".winner-line",
              { scaleX: 0 },
              {
                scaleX: 1,
                duration: 0.55,
                ease: "power3.out",
                transformOrigin: "left center",
              },
              "-=.28",
            )
        }
      },
    })
  }

  return (
    <div ref={pageRef} className="min-h-screen overflow-hidden bg-[#efede6] text-[#22231f] selection:bg-[#22231f] selection:text-white">
      <style>{`
        .roulette-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
        .roulette-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,.13); }
        .roulette-wheel-shadow { box-shadow: 0 38px 90px rgba(47,43,35,.13), 0 8px 24px rgba(47,43,35,.08); }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(190,161,103,.13),transparent_27%),radial-gradient(circle_at_10%_82%,rgba(87,118,103,.10),transparent_31%)]" />
        <div className="roulette-orbit-a absolute right-[-17vw] top-[-19vw] h-[54vw] w-[54vw] rounded-full border border-black/[.045]">
          <span className="absolute left-[16%] top-[44%] h-2 w-2 rounded-full bg-[#c69e52]/45" />
        </div>
        <div className="roulette-orbit-b absolute bottom-[-22vw] left-[-18vw] h-[50vw] w-[50vw] rounded-full border border-black/[.035]">
          <span className="absolute right-[14%] top-[31%] h-1.5 w-1.5 rounded-full bg-[#52685d]/40" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1500px] px-5 pb-10 pt-6 sm:px-8">
        <div className="roulette-reveal flex items-center justify-between gap-4">
          <Breadcrumb />
          <div className="hidden text-[9px] tracking-[.14em] text-black/25 sm:block">
            DECISION STUDIO · SPACE TO SPIN
          </div>
        </div>

        <section className="grid min-h-[720px] items-center gap-10 py-10 lg:grid-cols-[.78fr_1.22fr] lg:py-6">
          <div className="roulette-reveal order-2 lg:order-1">
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/27">
              随机决定转盘
            </div>

            <h1 className="mt-4 max-w-[580px] text-[clamp(48px,6vw,88px)] font-semibold leading-[.91] tracking-[-.07em]">
              今天，
              <br />
              别想太多。
            </h1>

            <p className="mt-6 max-w-[460px] text-[11px] leading-6 text-black/39">
              把犹豫写进候选项，剩下的交给转盘。支持批量导入、不重复抽取、历史结果与快捷键。
            </p>

            <div className="mt-8 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={spin}
                disabled={!canSpin}
                className="group flex items-center gap-5 rounded-full bg-[#22231f] px-6 py-3.5 text-[11px] font-semibold text-white transition hover:scale-[1.02] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-35"
              >
                {spinning ? "正在转动" : "开始旋转"}
                <span className="text-white/45 transition group-hover:translate-x-1">
                  {spinning ? "···" : "→"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setBulkOpen(true)}
                disabled={spinning}
                className="rounded-full border border-black/11 px-5 py-3.5 text-[10px] font-semibold transition hover:bg-white/45 disabled:opacity-35"
              >
                批量粘贴
              </button>

              <button
                type="button"
                onClick={shuffleOptions}
                disabled={spinning}
                className="rounded-full border border-black/11 px-5 py-3.5 text-[10px] font-semibold transition hover:bg-white/45 disabled:opacity-35"
              >
                打乱顺序
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[9px] text-black/28">
              <span>空格键开始</span>
              <span>{activeOptions.length} 个可抽候选</span>
              <span>最多 24 项</span>
            </div>

            <div className="mt-9 border-t border-black/10 pt-5">
              <label className="flex cursor-pointer items-center justify-between gap-5">
                <span>
                  <b className="block text-[10px] font-semibold">不重复抽取</b>
                  <span className="mt-1 block text-[9px] text-black/29">
                    抽中过的选项会暂时退出下一轮
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={noRepeat}
                  onChange={(event) => {
                    setNoRepeat(event.target.checked)
                    if (!event.target.checked) setExcludedIds([])
                  }}
                  disabled={spinning}
                  className="h-4 w-4 accent-[#22231f]"
                />
              </label>

              {noRepeat && excludedIds.length > 0 && (
                <button
                  type="button"
                  onClick={resetPool}
                  className="mt-3 text-[9px] font-semibold text-[#8f5946] transition hover:text-[#663f32]"
                >
                  重置候选池 · 已抽过 {excludedIds.length} 项
                </button>
              )}
            </div>
          </div>

          <div className="roulette-reveal order-1 flex justify-center lg:order-2 lg:justify-end">
            <div className="relative aspect-square w-full max-w-[650px]">
              <div
                ref={pointerRef}
                className="absolute left-1/2 top-[-3px] z-30 -translate-x-1/2"
                style={{ transform: "translateX(-50%)" }}
              >
                <div
                  ref={pointerGlowRef}
                  className="pointer-events-none absolute left-1/2 top-[2px] h-7 w-7 -translate-x-1/2 rounded-full border border-[#22231f]/20 opacity-0"
                />
                <div className="h-0 w-0 border-l-[14px] border-r-[14px] border-t-[28px] border-l-transparent border-r-transparent border-t-[#22231f]" />
              </div>

              <div className="absolute inset-[5.5%] rounded-full border border-black/[.08]" />
              <div className="absolute inset-[1.2%] rounded-full border border-black/[.045]" />

              <div
                ref={wheelRef}
                className="roulette-wheel-shadow absolute inset-[8%] rounded-full will-change-transform"
                style={{ transform: `rotate(${rotationRef.current}deg)` }}
              >
                <canvas
                  ref={canvasRef}
                  className="h-full w-full rounded-full"
                  aria-label="随机决定转盘"
                />
              </div>

              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="h-[17%] w-[17%] rounded-full border border-white/40" />
              </div>

              <div className="absolute bottom-[3%] left-1/2 -translate-x-1/2 rounded-full bg-[#efede6]/78 px-3 py-1.5 text-[8px] font-semibold tracking-[.13em] text-black/33 backdrop-blur-md">
                FAIR · EQUAL WEIGHT
              </div>
            </div>
          </div>
        </section>

        <section className="roulette-reveal border-t border-black/10 pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[9px] font-semibold tracking-[.15em] text-black/26">
                OPTIONS
              </div>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-.04em]">
                你的候选项
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[9px] text-black/28">
                {validOptions.length}/24
              </span>
              <button
                type="button"
                onClick={resetAll}
                disabled={spinning}
                className="rounded-full border border-black/10 px-3 py-2 text-[9px] text-black/36 transition hover:text-black disabled:opacity-30"
              >
                恢复示例
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-x-7 md:grid-cols-2">
            {options.map((option, index) => {
              const excluded = noRepeat && excludedIds.includes(option.id)

              return (
                <div
                  key={option.id}
                  className={`group grid grid-cols-[28px_1fr_auto] items-center gap-3 border-b border-black/[.075] py-3 transition ${
                    excluded ? "opacity-35" : ""
                  }`}
                >
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[8px] font-semibold text-white"
                    style={{ backgroundColor: option.color }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <input
                    ref={(element) => {
                      inputRefs.current[index] = element
                    }}
                    value={option.text}
                    onChange={(event) =>
                      updateOption(option.id, event.target.value)
                    }
                    placeholder={`选项 ${index + 1}`}
                    disabled={spinning}
                    className="min-w-0 bg-transparent py-2 text-sm font-medium outline-none placeholder:text-black/20 disabled:opacity-50"
                  />

                  <button
                    type="button"
                    onClick={() => removeOption(option.id)}
                    disabled={spinning || options.length <= 2}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-black/22 transition hover:bg-black/[.045] hover:text-[#a45643] disabled:opacity-20"
                    aria-label={`删除 ${option.text}`}
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>

          <button
            type="button"
            onClick={addOption}
            disabled={options.length >= 24 || spinning}
            className="mt-5 flex items-center gap-2 text-[10px] font-semibold text-black/41 transition hover:text-black disabled:opacity-25"
          >
            <span className="text-base font-normal">＋</span>
            添加选项
          </button>
        </section>

        {(winner || history.length > 0) && (
          <section className="mt-14 grid gap-10 border-t border-black/10 pt-7 lg:grid-cols-[.85fr_1.15fr]">
            <div ref={resultRef}>
              <div className="text-[9px] font-semibold tracking-[.15em] text-black/26">
                RESULT
              </div>

              {winner ? (
                <>
                  <div className="mt-4 flex items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: winner.color }}
                    />
                    <h2 className="text-[clamp(38px,5vw,68px)] font-semibold leading-none tracking-[-.06em]">
                      {winner.text}
                    </h2>
                  </div>

                  <div className="winner-line mt-5 h-px w-full bg-black/18" />

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={spin}
                      disabled={!canSpin}
                      className="rounded-full bg-[#22231f] px-4 py-2.5 text-[9px] font-semibold text-white disabled:opacity-30"
                    >
                      再转一次
                    </button>

                    <button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(winner.text)}
                      className="rounded-full border border-black/10 px-4 py-2.5 text-[9px] font-semibold"
                    >
                      复制结果
                    </button>
                  </div>
                </>
              ) : (
                <div className="mt-4 text-2xl font-semibold text-black/28">
                  等待下一次决定
                </div>
              )}
            </div>

            <div>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-[9px] font-semibold tracking-[.15em] text-black/26">
                    RECENT PICKS
                  </div>
                  <h3 className="mt-1 text-lg font-semibold tracking-[-.03em]">
                    最近结果
                  </h3>
                </div>

                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setHistory([])}
                    className="text-[9px] text-black/28 transition hover:text-black"
                  >
                    清空记录
                  </button>
                )}
              </div>

              <div className="roulette-scroll mt-4 flex gap-2 overflow-x-auto pb-2">
                {history.map((item, index) => (
                  <div
                    key={item.id}
                    className="min-w-[155px] rounded-[20px] border border-black/[.08] bg-white/25 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[8px] text-black/25">
                        #{String(index + 1).padStart(2, "0")}
                      </span>
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                    </div>
                    <b className="mt-4 block truncate text-sm">
                      {item.text}
                    </b>
                    <span className="mt-1 block text-[8px] text-black/25">
                      {toDisplayTime(item.at)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <div className="mt-14 border-t border-black/[.08] pt-5">
          <FooterNote />
        </div>
      </div>

      {bulkOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/20 backdrop-blur-sm sm:items-center sm:p-5"
          onClick={() => setBulkOpen(false)}
        >
          <div
            className="w-full max-w-[660px] rounded-t-[30px] bg-[#f3f0e8] p-6 shadow-2xl sm:rounded-[30px] sm:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-5">
              <div>
                <div className="text-[8px] tracking-[.15em] text-black/24">
                  BULK INPUT
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-.04em]">
                  一次粘贴所有选项
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setBulkOpen(false)}
                className="text-[10px] text-black/35"
              >
                关闭
              </button>
            </div>

            <p className="mt-4 text-[10px] leading-5 text-black/33">
              支持换行、逗号、顿号和分号。重复内容会自动去重，最多保留 24 项。
            </p>

            <textarea
              autoFocus
              value={bulkText}
              onChange={(event) => setBulkText(event.target.value)}
              rows={10}
              placeholder={"火锅\n日料\n烧烤\n披萨\n在家做饭"}
              className="roulette-scroll mt-6 w-full resize-none rounded-[22px] border border-black/[.08] bg-white/30 p-4 text-sm leading-7 outline-none placeholder:text-black/18"
            />

            <div className="mt-5 flex items-center justify-between gap-4">
              <span className="text-[9px] text-black/27">
                已识别 {sanitizeImported(bulkText).length} 项
              </span>

              <button
                type="button"
                onClick={applyBulk}
                disabled={sanitizeImported(bulkText).length < 2}
                className="rounded-full bg-[#22231f] px-5 py-3 text-[10px] font-semibold text-white disabled:opacity-30"
              >
                替换当前选项
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
