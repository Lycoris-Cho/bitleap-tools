"use client"

import type { CSSProperties } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type Vec = { x: number; y: number }
type GameStatus = "idle" | "playing" | "paused" | "over"
type WallMode = "wrap" | "wall"
type Difficulty = "chill" | "classic" | "swift"
type ThemeName = "midnight" | "garden" | "candy"

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
}

type GameStore = {
  snake: Vec[]
  dir: Vec
  pending: Vec[]
  food: Vec
  bonus: Vec | null
  bonusTTL: number
  score: number
  moves: number
  lastMove: number
  particles: Particle[]
}

type RuntimeConfig = {
  difficulty: Difficulty
  wallMode: WallMode
  theme: ThemeName
}

const GRID = 24
const STORAGE_KEY = "bitleap-snake-arcade-best-v2"

const DIFFICULTY: Record<Difficulty, { label: string; stepMs: number; note: string }> = {
  chill: { label: "Chill", stepMs: 142, note: "轻松练习，适合手机触控。" },
  classic: { label: "Classic", stepMs: 112, note: "经典节奏，得分和速度平衡。" },
  swift: { label: "Swift", stepMs: 82, note: "更快反应，适合挑战最高分。" },
}

const THEMES: Record<ThemeName, { label: string; bg: string; grid: string; snake: string; head: string; food: string; bonus: string; eye: string; glow: string }> = {
  midnight: { label: "Midnight", bg: "#0B100E", grid: "rgba(205,232,214,.075)", snake: "#7CBF8A", head: "#DFFBE5", food: "#F07B8C", bonus: "#F0C86E", eye: "#102016", glow: "rgba(124,191,138,.26)" },
  garden: { label: "Garden", bg: "#EDE8DC", grid: "rgba(35,42,32,.09)", snake: "#52685D", head: "#1E2A23", food: "#CE6E78", bonus: "#B28D48", eye: "#F6F0E7", glow: "rgba(82,104,93,.18)" },
  candy: { label: "Candy", bg: "#FFF7FB", grid: "rgba(130,85,140,.10)", snake: "#A78BFA", head: "#6D5BE7", food: "#FB7185", bonus: "#FBBF24", eye: "#FFFFFF", glow: "rgba(167,139,250,.24)" },
}

function sameCell(a: Vec, b: Vec) {
  return a.x === b.x && a.y === b.y
}

function isReverse(a: Vec, b: Vec) {
  return a.x + b.x === 0 && a.y + b.y === 0
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function numberLabel(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value)
}

function randomCell() {
  return {
    x: Math.floor(Math.random() * GRID),
    y: Math.floor(Math.random() * GRID),
  }
}

function createGame(): GameStore {
  return {
    snake: [
      { x: 11, y: 12 },
      { x: 10, y: 12 },
      { x: 9, y: 12 },
    ],
    dir: { x: 1, y: 0 },
    pending: [],
    food: { x: 16, y: 12 },
    bonus: null,
    bonusTTL: 0,
    score: 0,
    moves: 0,
    lastMove: typeof performance !== "undefined" ? performance.now() : 0,
    particles: [],
  }
}

function findEmptyCell(snake: Vec[], reserved: Vec[] = []) {
  let attempts = 0

  while (attempts < 320) {
    const cell = randomCell()
    const occupied = snake.some((segment) => sameCell(segment, cell)) || reserved.some((segment) => sameCell(segment, cell))
    if (!occupied) return cell
    attempts += 1
  }

  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      const cell = { x, y }
      const occupied = snake.some((segment) => sameCell(segment, cell)) || reserved.some((segment) => sameCell(segment, cell))
      if (!occupied) return cell
    }
  }

  return null
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}

function spawnParticles(game: GameStore, cell: Vec, color: string, amount = 18) {
  for (let i = 0; i < amount; i += 1) {
    const angle = (Math.PI * 2 * i) / amount + Math.random() * 0.32
    const speed = 2.1 + Math.random() * 3.5
    const life = 0.38 + Math.random() * 0.36
    game.particles.push({
      x: cell.x + 0.5,
      y: cell.y + 0.5,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
      size: 0.08 + Math.random() * 0.09,
      color,
    })
  }
}

function drawBoard(canvas: HTMLCanvasElement, game: GameStore, status: GameStatus, config: RuntimeConfig, now: number, delta: number) {
  const ctx = canvas.getContext("2d")
  if (!ctx) return

  const rect = canvas.getBoundingClientRect()
  const size = Math.max(260, Math.floor(Math.min(rect.width, rect.height)))
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))

  if (canvas.width !== Math.floor(size * dpr) || canvas.height !== Math.floor(size * dpr)) {
    canvas.width = Math.floor(size * dpr)
    canvas.height = Math.floor(size * dpr)
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, size, size)

  const theme = THEMES[config.theme]
  const cell = size / GRID
  const pad = Math.max(2, cell * 0.13)

  const bgGradient = ctx.createRadialGradient(size * 0.5, size * 0.38, size * 0.08, size * 0.5, size * 0.5, size * 0.74)
  bgGradient.addColorStop(0, config.theme === "midnight" ? "#142019" : theme.bg)
  bgGradient.addColorStop(1, theme.bg)
  ctx.fillStyle = bgGradient
  roundRect(ctx, 0, 0, size, size, 28)
  ctx.fill()

  ctx.save()
  roundRect(ctx, 0, 0, size, size, 28)
  ctx.clip()

  ctx.strokeStyle = theme.grid
  ctx.lineWidth = 1
  for (let i = 0; i <= GRID; i += 1) {
    const pos = i * cell
    ctx.beginPath()
    ctx.moveTo(pos, 0)
    ctx.lineTo(pos, size)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, pos)
    ctx.lineTo(size, pos)
    ctx.stroke()
  }

  game.particles = game.particles
    .map((particle) => ({
      ...particle,
      x: particle.x + particle.vx * delta,
      y: particle.y + particle.vy * delta,
      life: particle.life - delta,
    }))
    .filter((particle) => particle.life > 0)

  game.particles.forEach((particle) => {
    const alpha = clamp(particle.life / particle.maxLife, 0, 1)
    ctx.globalAlpha = alpha
    ctx.fillStyle = particle.color
    ctx.beginPath()
    ctx.arc(particle.x * cell, particle.y * cell, particle.size * cell * (1 + (1 - alpha) * 1.5), 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.globalAlpha = 1

  const pulse = 1 + Math.sin(now / 180) * 0.08
  ctx.shadowColor = theme.food
  ctx.shadowBlur = cell * 0.45
  ctx.fillStyle = theme.food
  ctx.beginPath()
  ctx.arc((game.food.x + 0.5) * cell, (game.food.y + 0.5) * cell, cell * 0.26 * pulse, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0

  if (game.bonus) {
    const bonusPulse = 1 + Math.sin(now / 120) * 0.16
    const sizeOffset = cell * (0.24 - 0.24 * bonusPulse)
    ctx.shadowColor = theme.bonus
    ctx.shadowBlur = cell * 0.6
    ctx.fillStyle = theme.bonus
    roundRect(ctx, game.bonus.x * cell + cell * 0.26 + sizeOffset, game.bonus.y * cell + cell * 0.26 + sizeOffset, cell * 0.48 * bonusPulse, cell * 0.48 * bonusPulse, cell * 0.14)
    ctx.fill()
    ctx.shadowBlur = 0
  }

  const segments = [...game.snake].reverse()
  segments.forEach((segment, reversedIndex) => {
    const index = segments.length - 1 - reversedIndex
    const isHead = index === 0
    const fade = 0.54 + (reversedIndex / Math.max(1, segments.length - 1)) * 0.42
    const x = segment.x * cell + pad
    const y = segment.y * cell + pad
    const side = cell - pad * 2

    ctx.globalAlpha = isHead ? 1 : fade
    ctx.shadowColor = isHead ? theme.glow : "transparent"
    ctx.shadowBlur = isHead ? cell * 0.7 : 0
    ctx.fillStyle = isHead ? theme.head : theme.snake
    roundRect(ctx, x, y, side, side, cell * 0.24)
    ctx.fill()
    ctx.shadowBlur = 0

    if (isHead) {
      const eyeOffsetX = game.dir.x === 0 ? side * 0.18 : game.dir.x * side * 0.2
      const eyeOffsetY = game.dir.y === 0 ? side * 0.18 : game.dir.y * side * 0.2
      ctx.fillStyle = theme.eye
      ctx.globalAlpha = 0.92
      ctx.beginPath()
      ctx.arc(x + side * 0.5 + eyeOffsetX - game.dir.y * side * 0.18, y + side * 0.5 + eyeOffsetY - game.dir.x * side * 0.18, Math.max(1.3, side * 0.07), 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x + side * 0.5 + eyeOffsetX + game.dir.y * side * 0.18, y + side * 0.5 + eyeOffsetY + game.dir.x * side * 0.18, Math.max(1.3, side * 0.07), 0, Math.PI * 2)
      ctx.fill()
    }
  })
  ctx.globalAlpha = 1

  if (status === "idle" || status === "paused" || status === "over") {
    ctx.fillStyle = config.theme === "midnight" ? "rgba(7,10,8,.58)" : "rgba(255,255,255,.58)"
    ctx.fillRect(0, 0, size, size)
    ctx.fillStyle = config.theme === "midnight" ? "rgba(232,248,238,.88)" : "rgba(24,24,20,.72)"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.font = "600 18px system-ui, sans-serif"
    const label = status === "idle" ? "按 Enter 或点击开始" : status === "paused" ? "已暂停" : "游戏结束"
    ctx.fillText(label, size / 2, size / 2)
  }

  ctx.restore()
}

function formatDirection(dir: Vec) {
  if (dir.x === 1) return "RIGHT"
  if (dir.x === -1) return "LEFT"
  if (dir.y === 1) return "DOWN"
  return "UP"
}

function calcLevel(score: number) {
  return Math.floor(score / 6) + 1
}

function ButtonPill({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`rounded-full border px-3.5 py-2 text-[8px] font-semibold transition ${active ? "border-[#83d69a]/20 bg-[#83d69a] text-[#09100c]" : "border-white/[.09] text-white/34 hover:bg-white/[.06] hover:text-white"}`}>
      {label}
    </button>
  )
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: string
  tone?: "default" | "green" | "gold" | "rose"
}) {
  const toneClass = tone === "green" ? "text-[#8FE6AE]" : tone === "gold" ? "text-[#F0C86E]" : tone === "rose" ? "text-[#F07B8C]" : "text-white/78"

  return (
    <div className="rounded-[22px] border border-white/[.08] bg-white/[.045] p-4">
      <div className="text-[8px] font-semibold tracking-[.15em] text-white/25">{label}</div>
      <div className={`snake-num mt-3 truncate font-mono text-[18px] font-semibold ${toneClass}`}>{value}</div>
    </div>
  )
}

function DPadButton({
  label,
  onClick,
  className = "",
}: {
  label: string
  onClick: () => void
  className?: string
}) {
  return (
    <button type="button" onClick={onClick} className={`grid h-14 w-14 place-items-center rounded-2xl border border-white/[.1] bg-white/[.055] text-lg font-semibold text-white/64 shadow-[0_18px_45px_-34px_rgba(0,0,0,.7)] transition hover:bg-white/[.1] hover:text-white active:scale-95 ${className}`}>
      {label}
    </button>
  )
}

export default function SnakePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<number>(0)
  const frameLastRef = useRef<number>(0)
  const dragStartRef = useRef<Vec | null>(null)
  const gameRef = useRef<GameStore>(createGame())
  const statusRef = useRef<GameStatus>("idle")
  const bestRef = useRef(0)
  const scoreRef = useRef(0)
  const configRef = useRef<RuntimeConfig>({ difficulty: "classic", wallMode: "wrap", theme: "midnight" })

  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const [status, setStatus] = useState<GameStatus>("idle")
  const [difficulty, setDifficulty] = useState<Difficulty>("classic")
  const [wallMode, setWallMode] = useState<WallMode>("wrap")
  const [theme, setTheme] = useState<ThemeName>("midnight")
  const [lastEat, setLastEat] = useState("—")

  const level = useMemo(() => calcLevel(score), [score])
  const interval = useMemo(() => Math.max(48, DIFFICULTY[difficulty].stepMs - (level - 1) * 4), [difficulty, level])
  const progress = useMemo(() => Math.min(100, ((score % 6) / 6) * 100), [score])
  const statusLabel = status === "idle" ? "等待开始" : status === "playing" ? "运行中" : status === "paused" ? "已暂停" : "游戏结束"
  const themeConfig = THEMES[theme]

  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    configRef.current = { difficulty, wallMode, theme }
  }, [difficulty, theme, wallMode])

  useEffect(() => {
    bestRef.current = best
  }, [best])

  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem(STORAGE_KEY) || 0)
      setBest(saved)
      bestRef.current = saved
    } catch {}
  }, [])

  const setGameOver = useCallback(() => {
    const game = gameRef.current
    statusRef.current = "over"
    setStatus("over")

    if (game.score > bestRef.current) {
      bestRef.current = game.score
      setBest(game.score)
      try {
        window.localStorage.setItem(STORAGE_KEY, String(game.score))
      } catch {}
    }
  }, [])

  const stepGame = useCallback(() => {
    const game = gameRef.current
    const config = configRef.current

    const nextDir = game.pending.shift()
    if (nextDir && !isReverse(game.dir, nextDir)) {
      game.dir = nextDir
    }

    const head = game.snake[0]
    let nextHead = { x: head.x + game.dir.x, y: head.y + game.dir.y }

    if (config.wallMode === "wrap") {
      nextHead = {
        x: (nextHead.x + GRID) % GRID,
        y: (nextHead.y + GRID) % GRID,
      }
    } else if (nextHead.x < 0 || nextHead.x >= GRID || nextHead.y < 0 || nextHead.y >= GRID) {
      spawnParticles(game, head, THEMES[config.theme].food, 28)
      setGameOver()
      return
    }

    const eatsFood = sameCell(nextHead, game.food)
    const eatsBonus = game.bonus ? sameCell(nextHead, game.bonus) : false
    const bodyToCheck = eatsFood || eatsBonus ? game.snake : game.snake.slice(0, -1)

    if (bodyToCheck.some((segment) => sameCell(segment, nextHead))) {
      spawnParticles(game, nextHead, THEMES[config.theme].food, 28)
      setGameOver()
      return
    }

    game.snake.unshift(nextHead)
    game.moves += 1

    if (eatsFood || eatsBonus) {
      const gained = eatsBonus ? 5 : 1
      game.score += gained
      scoreRef.current = game.score
      setScore(game.score)
      setLastEat(eatsBonus ? "+5 BONUS" : "+1 FOOD")
      spawnParticles(game, nextHead, eatsBonus ? THEMES[config.theme].bonus : THEMES[config.theme].food, eatsBonus ? 34 : 18)

      if (eatsBonus) {
        game.bonus = null
        game.bonusTTL = 0
      }

      if (eatsFood) {
        const nextFood = findEmptyCell(game.snake, game.bonus ? [game.bonus] : [])
        if (!nextFood) {
          setGameOver()
          return
        }
        game.food = nextFood

        if (game.score > 0 && game.score % 6 === 0 && !game.bonus) {
          const nextBonus = findEmptyCell(game.snake, [game.food])
          if (nextBonus) {
            game.bonus = nextBonus
            game.bonusTTL = 72
          }
        }
      }
    } else {
      game.snake.pop()
    }

    if (game.bonus) {
      game.bonusTTL -= 1
      if (game.bonusTTL <= 0) {
        game.bonus = null
      }
    }
  }, [setGameOver])

  const requestDirection = useCallback((dir: Vec) => {
    const game = gameRef.current
    const current = game.pending[game.pending.length - 1] ?? game.dir
    if (isReverse(current, dir)) return
    if (game.pending.length >= 2) return
    game.pending.push(dir)
  }, [])

  const reset = useCallback(() => {
    const nextGame = createGame()
    const food = findEmptyCell(nextGame.snake)
    if (food) nextGame.food = food
    gameRef.current = nextGame
    scoreRef.current = 0
    setScore(0)
    setLastEat("—")
    statusRef.current = "playing"
    setStatus("playing")
  }, [])

  const togglePause = useCallback(() => {
    const current = statusRef.current
    if (current === "playing") {
      statusRef.current = "paused"
      setStatus("paused")
      return
    }
    if (current === "paused") {
      gameRef.current.lastMove = performance.now()
      statusRef.current = "playing"
      setStatus("playing")
    }
  }, [])

  const turn = useCallback(
    (dir: Vec) => {
      if (statusRef.current === "idle" || statusRef.current === "over") {
        reset()
      }
      requestDirection(dir)
    },
    [requestDirection, reset],
  )

  useEffect(() => {
    const loop = (now: number) => {
      const delta = Math.min(0.045, Math.max(0, (now - frameLastRef.current) / 1000 || 0))
      frameLastRef.current = now

      const game = gameRef.current
      const currentConfig = configRef.current
      const currentLevel = calcLevel(game.score)
      const currentInterval = Math.max(48, DIFFICULTY[currentConfig.difficulty].stepMs - (currentLevel - 1) * 4)

      if (statusRef.current === "playing" && now - game.lastMove >= currentInterval) {
        game.lastMove = now
        stepGame()
      }

      if (canvasRef.current) {
        drawBoard(canvasRef.current, gameRef.current, statusRef.current, currentConfig, now, delta)
      }

      frameRef.current = requestAnimationFrame(loop)
    }

    frameRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frameRef.current)
  }, [stepGame])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const tagName = target?.tagName.toLowerCase()
      if (tagName === "input" || tagName === "textarea" || tagName === "select" || target?.isContentEditable) return

      const key = event.key.toLowerCase()

      if (key === "arrowup" || key === "w") {
        event.preventDefault()
        turn({ x: 0, y: -1 })
        return
      }
      if (key === "arrowdown" || key === "s") {
        event.preventDefault()
        turn({ x: 0, y: 1 })
        return
      }
      if (key === "arrowleft" || key === "a") {
        event.preventDefault()
        turn({ x: -1, y: 0 })
        return
      }
      if (key === "arrowright" || key === "d") {
        event.preventDefault()
        turn({ x: 1, y: 0 })
        return
      }
      if (key === " " || key === "spacebar" || key === "p") {
        event.preventDefault()
        if (statusRef.current === "idle" || statusRef.current === "over") reset()
        else togglePause()
        return
      }
      if (key === "enter") {
        event.preventDefault()
        if (statusRef.current === "playing") return
        if (statusRef.current === "paused") togglePause()
        else reset()
      }
    }

    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [reset, togglePause, turn])

  useEffect(() => {
    if (!pageRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      gsap.from(".snake-intro", { opacity: 0, y: 16, duration: 0.7, stagger: 0.055, ease: "power3.out" })
      gsap.from(".arcade-frame", { opacity: 0, scale: 0.985, duration: 0.9, ease: "power3.out" })
      gsap.to(".snake-orbit", { rotation: 360, duration: 96, repeat: -1, ease: "none", transformOrigin: "50% 50%" })
      gsap.to(".snake-glow", { opacity: 0.72, scale: 1.06, duration: 4.8, repeat: -1, yoyo: true, ease: "sine.inOut" })
    }, pageRef)

    return () => ctx.revert()
  }, [])

  const handlePrimary = () => {
    if (status === "playing" || status === "paused") {
      togglePause()
      return
    }
    reset()
  }

  const handleSwipeEnd = (clientX: number, clientY: number) => {
    if (!dragStartRef.current) return
    const dx = clientX - dragStartRef.current.x
    const dy = clientY - dragStartRef.current.y
    dragStartRef.current = null
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return

    if (Math.abs(dx) > Math.abs(dy)) {
      turn({ x: dx > 0 ? 1 : -1, y: 0 })
    } else {
      turn({ x: 0, y: dy > 0 ? 1 : -1 })
    }
  }

  const resetBest = () => {
    setBest(0)
    bestRef.current = 0
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {}
  }

  return (
    <div ref={pageRef} className="relative min-h-[calc(100dvh-4rem)] overflow-hidden bg-[#080A08] text-white selection:bg-[#8FE6AE] selection:text-[#080A08]">
      <style>{`
        .snake-num { font-variant-numeric: tabular-nums lining-nums; }
        .snake-panel-scroll::-webkit-scrollbar { width:5px; height:5px; }
        .snake-panel-scroll::-webkit-scrollbar-track { background:transparent; }
        .snake-panel-scroll::-webkit-scrollbar-thumb { background:rgba(255,255,255,.16); border-radius:999px; }
        .snake-board-grid { background-image:linear-gradient(rgba(143,230,174,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(143,230,174,.055) 1px,transparent 1px); background-size:32px 32px; }
      `}</style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_48%_8%,rgba(143,230,174,.12),transparent_28%),radial-gradient(circle_at_8%_82%,rgba(240,200,110,.08),transparent_25%),radial-gradient(circle_at_88%_72%,rgba(124,191,138,.10),transparent_30%)]" />
      <div className="snake-board-grid pointer-events-none absolute inset-0 opacity-70" />
      <div className="snake-orbit pointer-events-none absolute right-[-18vw] top-[-22vw] h-[56vw] w-[56vw] rounded-full border border-white/[.04]">
        <span className="absolute left-[18%] top-[44%] h-2 w-2 rounded-full bg-[#8FE6AE]/40" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-4rem)] max-w-[1680px] flex-col px-5 pb-6 pt-5 sm:px-7 lg:px-8">
        <div className="snake-intro flex flex-col gap-5 border-b border-white/[.08] pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="[&_*]:!text-white/55">
              <Breadcrumb />
            </div>
            <div className="mt-5 text-[9px] font-semibold tracking-[.22em] text-[#8FE6AE]/55">SNAKE ARCADE</div>
            <h1 className="mt-3 text-[clamp(42px,5.6vw,86px)] font-semibold leading-[.98] tracking-[-.06em]">贪吃蛇，<br />做成街机台。</h1>
          </div>

          <p className="max-w-[590px] text-[11px] leading-6 text-white/40">HiDPI Canvas、稳定 rAF 循环、输入队列、触控方向盘、奖励食物、穿墙 / 撞墙模式和本地最高分。视觉从普通小画布升级成完整游戏工作台。</p>
        </div>

        <section className="snake-intro grid flex-1 gap-5 py-5 xl:grid-cols-[270px_minmax(0,1fr)_290px]">
          <aside className="snake-panel-scroll min-h-0 space-y-4 overflow-auto">
            <div className="rounded-[30px] border border-white/[.08] bg-white/[.04] p-5 backdrop-blur-xl">
              <div className="text-[8px] font-semibold tracking-[.14em] text-white/25">SCOREBOARD</div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <StatCard label="SCORE" value={numberLabel(score)} tone="green" />
                <StatCard label="BEST" value={numberLabel(best)} tone="gold" />
                <StatCard label="LEVEL" value={String(level)} />
                <StatCard label="STATUS" value={statusLabel} tone={status === "over" ? "rose" : "default"} />
              </div>

              <div className="mt-5">
                <div className="mb-2 flex justify-between text-[8px] text-white/28">
                  <span>Next level</span>
                  <span>{score % 6}/6</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[.06]">
                  <div className="h-full rounded-full bg-[#8FE6AE] transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/[.08] bg-white/[.04] p-5 backdrop-blur-xl">
              <div className="text-[8px] font-semibold tracking-[.14em] text-white/25">GAMEPLAY</div>
              <div className="mt-5 space-y-5">
                <div>
                  <div className="mb-2 text-[8px] font-semibold tracking-[.12em] text-white/24">难度</div>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(DIFFICULTY) as Difficulty[]).map((item) => (
                      <ButtonPill key={item} active={difficulty === item} label={DIFFICULTY[item].label} onClick={() => setDifficulty(item)} />
                    ))}
                  </div>
                  <p className="mt-3 text-[8px] leading-4 text-white/28">{DIFFICULTY[difficulty].note}</p>
                </div>

                <div>
                  <div className="mb-2 text-[8px] font-semibold tracking-[.12em] text-white/24">边界</div>
                  <div className="flex flex-wrap gap-2">
                    <ButtonPill active={wallMode === "wrap"} label="穿墙" onClick={() => setWallMode("wrap")} />
                    <ButtonPill active={wallMode === "wall"} label="撞墙" onClick={() => setWallMode("wall")} />
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-[8px] font-semibold tracking-[.12em] text-white/24">主题</div>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(THEMES) as ThemeName[]).map((item) => (
                      <ButtonPill key={item} active={theme === item} label={THEMES[item].label} onClick={() => setTheme(item)} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/[.08] bg-white/[.035] p-5 text-[9px] leading-5 text-white/30">
              <div className="mb-2 text-[8px] font-semibold tracking-[.14em] text-white/24">DETAILS</div>
              输入采用最多 2 步方向队列，快速连按不会漏掉转弯；自撞判断允许合法进入即将离开的尾巴位置。
            </div>
          </aside>

          <main className="arcade-frame min-w-0">
            <div className="snake-glow pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8FE6AE]/10 blur-[120px]" />

            <div className="relative mx-auto flex h-full min-h-[620px] max-w-[860px] flex-col rounded-[38px] border border-white/[.08] bg-[#0E120F]/88 p-3 shadow-[0_40px_140px_-70px_rgba(0,0,0,.82)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3 px-3 py-3">
                <div>
                  <div className="text-[8px] font-semibold tracking-[.14em] text-white/24">LIVE BOARD</div>
                  <div className="snake-num mt-1 font-mono text-[9px] text-[#8FE6AE]/55">{GRID}×{GRID} · {interval}ms · {formatDirection(gameRef.current.dir)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden rounded-full border border-white/[.08] px-3 py-2 text-[8px] text-white/28 sm:inline-flex">Last {lastEat}</span>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: status === "playing" ? "#8FE6AE" : status === "over" ? "#F07B8C" : "#F0C86E", boxShadow: status === "playing" ? "0 0 24px rgba(143,230,174,.45)" : "none" }} />
                </div>
              </div>

              <div className="relative grid flex-1 place-items-center overflow-hidden rounded-[30px] border border-white/[.07] bg-black/20 p-3">
                <canvas ref={canvasRef} aria-label="贪吃蛇游戏画布" className="aspect-square w-full max-w-[min(72vh,760px)] touch-none rounded-[28px]" onPointerDown={(event) => { dragStartRef.current = { x: event.clientX, y: event.clientY } }} onPointerUp={(event) => handleSwipeEnd(event.clientX, event.clientY)} />

                {(status === "idle" || status === "over") && (
                  <div className="pointer-events-none absolute inset-0 grid place-items-center">
                    <div className="rounded-[28px] border border-white/[.08] bg-[#0A0E0B]/72 px-7 py-6 text-center backdrop-blur-xl">
                      <div className="text-[8px] font-semibold tracking-[.18em] text-[#8FE6AE]/60">{status === "idle" ? "READY" : "GAME OVER"}</div>
                      <div className="mt-3 text-[28px] font-semibold tracking-[-.05em]">{status === "idle" ? "开始吞下第一颗光点" : `得分 ${score}`}</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-3 px-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <button type="button" onClick={handlePrimary} className="h-12 rounded-full bg-[#8FE6AE] px-6 text-sm font-semibold text-[#071009] shadow-[0_20px_55px_-28px_rgba(143,230,174,.55)] transition hover:-translate-y-0.5 hover:bg-[#B7F6C8] active:translate-y-0">
                  {status === "playing" ? "暂停" : status === "paused" ? "继续" : "开始游戏"}
                </button>

                <button type="button" onClick={reset} className="h-12 rounded-full border border-white/[.09] px-6 text-sm font-semibold text-white/42 transition hover:bg-white/[.06] hover:text-white">
                  重新开始
                </button>
              </div>
            </div>
          </main>

          <aside className="snake-panel-scroll min-h-0 space-y-4 overflow-auto">
            <div className="rounded-[30px] border border-white/[.08] bg-white/[.04] p-5 backdrop-blur-xl">
              <div className="text-[8px] font-semibold tracking-[.14em] text-white/25">TOUCH CONTROL</div>
              <div className="mt-5 grid grid-cols-3 justify-items-center gap-2">
                <span />
                <DPadButton label="↑" onClick={() => turn({ x: 0, y: -1 })} />
                <span />
                <DPadButton label="←" onClick={() => turn({ x: -1, y: 0 })} />
                <button type="button" onClick={togglePause} className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-[10px] font-semibold text-[#10120F] transition active:scale-95">{status === "paused" ? "PLAY" : "PAUSE"}</button>
                <DPadButton label="→" onClick={() => turn({ x: 1, y: 0 })} />
                <span />
                <DPadButton label="↓" onClick={() => turn({ x: 0, y: 1 })} />
                <span />
              </div>
              <p className="mt-4 text-[8px] leading-4 text-white/28">也可以直接在棋盘上滑动控制方向。</p>
            </div>

            <div className="rounded-[30px] border border-white/[.08] bg-white/[.04] p-5 backdrop-blur-xl">
              <div className="text-[8px] font-semibold tracking-[.14em] text-white/25">KEYBOARD</div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-[9px] text-white/34">
                <div className="rounded-2xl bg-white/[.035] p-3"><span className="font-mono text-[#8FE6AE]">WASD</span><br />移动方向</div>
                <div className="rounded-2xl bg-white/[.035] p-3"><span className="font-mono text-[#8FE6AE]">ARROWS</span><br />方向键</div>
                <div className="rounded-2xl bg-white/[.035] p-3"><span className="font-mono text-[#F0C86E]">SPACE / P</span><br />暂停继续</div>
                <div className="rounded-2xl bg-white/[.035] p-3"><span className="font-mono text-[#F0C86E]">ENTER</span><br />开始重开</div>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/[.08] bg-white/[.04] p-5 backdrop-blur-xl">
              <div className="text-[8px] font-semibold tracking-[.14em] text-white/25">LOCAL BEST</div>
              <p className="mt-4 text-[9px] leading-5 text-white/30">最高分保存在当前浏览器本地，不会上传。切换难度和边界不会清空最高分。</p>
              <button type="button" onClick={resetBest} className="mt-4 rounded-full border border-[#F07B8C]/18 px-4 py-3 text-[9px] font-semibold text-[#F07B8C] transition hover:bg-[#F07B8C]/10">清除最高分</button>
            </div>

            <div className="[&_*]:!text-white/36">
              <FooterNote />
            </div>
          </aside>
        </section>
      </div>
    </div>
  )
}
