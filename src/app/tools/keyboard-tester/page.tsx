"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type CopyKey = "event" | "json" | "react" | "report" | "history" | null
type KeyPhase = "idle" | "down" | "up"
type PanelMode = "event" | "shortcut" | "history"
type LayoutRow = Array<{ code: string; label: string; wide?: number }>

type KeyInfo = {
  key: string
  code: string
  keyCode: number
  which: number
  location: number
  shift: boolean
  ctrl: boolean
  alt: boolean
  meta: boolean
  repeat: boolean
  phase: KeyPhase
  time: string
}

const INITIAL: KeyInfo = {
  key: "—",
  code: "—",
  keyCode: 0,
  which: 0,
  location: 0,
  shift: false,
  ctrl: false,
  alt: false,
  meta: false,
  repeat: false,
  phase: "idle",
  time: "—",
}

const KEYBOARD: LayoutRow[] = [
  [
    { code: "Escape", label: "esc" },
    { code: "Digit1", label: "1" },
    { code: "Digit2", label: "2" },
    { code: "Digit3", label: "3" },
    { code: "Digit4", label: "4" },
    { code: "Digit5", label: "5" },
    { code: "Digit6", label: "6" },
    { code: "Digit7", label: "7" },
    { code: "Digit8", label: "8" },
    { code: "Digit9", label: "9" },
    { code: "Digit0", label: "0" },
    { code: "Minus", label: "-" },
    { code: "Equal", label: "=" },
    { code: "Backspace", label: "delete", wide: 1.8 },
  ],
  [
    { code: "Tab", label: "tab", wide: 1.45 },
    { code: "KeyQ", label: "Q" },
    { code: "KeyW", label: "W" },
    { code: "KeyE", label: "E" },
    { code: "KeyR", label: "R" },
    { code: "KeyT", label: "T" },
    { code: "KeyY", label: "Y" },
    { code: "KeyU", label: "U" },
    { code: "KeyI", label: "I" },
    { code: "KeyO", label: "O" },
    { code: "KeyP", label: "P" },
    { code: "BracketLeft", label: "[" },
    { code: "BracketRight", label: "]" },
    { code: "Backslash", label: "\\", wide: 1.35 },
  ],
  [
    { code: "CapsLock", label: "caps", wide: 1.8 },
    { code: "KeyA", label: "A" },
    { code: "KeyS", label: "S" },
    { code: "KeyD", label: "D" },
    { code: "KeyF", label: "F" },
    { code: "KeyG", label: "G" },
    { code: "KeyH", label: "H" },
    { code: "KeyJ", label: "J" },
    { code: "KeyK", label: "K" },
    { code: "KeyL", label: "L" },
    { code: "Semicolon", label: ";" },
    { code: "Quote", label: "'" },
    { code: "Enter", label: "return", wide: 1.9 },
  ],
  [
    { code: "ShiftLeft", label: "shift", wide: 2.25 },
    { code: "KeyZ", label: "Z" },
    { code: "KeyX", label: "X" },
    { code: "KeyC", label: "C" },
    { code: "KeyV", label: "V" },
    { code: "KeyB", label: "B" },
    { code: "KeyN", label: "N" },
    { code: "KeyM", label: "M" },
    { code: "Comma", label: "," },
    { code: "Period", label: "." },
    { code: "Slash", label: "/" },
    { code: "ShiftRight", label: "shift", wide: 2.35 },
  ],
  [
    { code: "ControlLeft", label: "ctrl", wide: 1.35 },
    { code: "MetaLeft", label: "cmd", wide: 1.35 },
    { code: "AltLeft", label: "alt", wide: 1.25 },
    { code: "Space", label: "space", wide: 6.4 },
    { code: "AltRight", label: "alt", wide: 1.25 },
    { code: "MetaRight", label: "cmd", wide: 1.35 },
    { code: "ControlRight", label: "ctrl", wide: 1.35 },
    { code: "ArrowLeft", label: "←" },
    { code: "ArrowUp", label: "↑" },
    { code: "ArrowDown", label: "↓" },
    { code: "ArrowRight", label: "→" },
  ],
]

const SPECIAL_KEY_LABEL: Record<string, string> = {
  " ": "Space",
  ArrowUp: "Arrow Up",
  ArrowDown: "Arrow Down",
  ArrowLeft: "Arrow Left",
  ArrowRight: "Arrow Right",
  Control: "Ctrl",
  Meta: "Meta",
  Alt: "Alt",
  Shift: "Shift",
  Escape: "Esc",
}

function timeLabel() {
  const date = new Date()
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`
}

function displayKey(key: string) {
  if (!key || key === "—") return "?"
  return SPECIAL_KEY_LABEL[key] ?? key
}

function shortKey(key: string) {
  const value = displayKey(key)
  return value.length > 12 ? `${value.slice(0, 12)}…` : value
}

function comboFromInfo(info: KeyInfo) {
  const parts = []
  if (info.ctrl) parts.push("Ctrl")
  if (info.alt) parts.push("Alt")
  if (info.shift) parts.push("Shift")
  if (info.meta) parts.push("Meta")
  const key = displayKey(info.key)
  if (!["Ctrl", "Alt", "Shift", "Meta"].includes(key) && key !== "?") parts.push(key)
  return parts.length ? parts.join(" + ") : "—"
}

function keyLocationLabel(location: number) {
  if (location === 1) return "Left"
  if (location === 2) return "Right"
  if (location === 3) return "Numpad"
  return "Standard"
}

function eventSnippet(info: KeyInfo) {
  return [
    `key: ${info.key}`,
    `code: ${info.code}`,
    `keyCode: ${info.keyCode}`,
    `which: ${info.which}`,
    `location: ${keyLocationLabel(info.location)}`,
    `shiftKey: ${info.shift}`,
    `ctrlKey: ${info.ctrl}`,
    `altKey: ${info.alt}`,
    `metaKey: ${info.meta}`,
    `repeat: ${info.repeat}`,
  ].join("\n")
}

function jsonSnippet(info: KeyInfo) {
  return JSON.stringify(
    {
      key: info.key,
      code: info.code,
      keyCode: info.keyCode,
      which: info.which,
      location: info.location,
      shiftKey: info.shift,
      ctrlKey: info.ctrl,
      altKey: info.alt,
      metaKey: info.meta,
      repeat: info.repeat,
    },
    null,
    2,
  )
}

function reactSnippet(info: KeyInfo) {
  const combo = comboFromInfo(info)
  return [
    "const handleKeyDown = (event: React.KeyboardEvent) => {",
    `  if (event.code === "${info.code}") {`,
    `    // ${combo}`,
    "  }",
    "}",
  ].join("\n")
}

function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 500)
}

function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: string
  tone?: "default" | "green" | "gold" | "rose"
}) {
  const color = tone === "green" ? "text-[#8FE6AE]" : tone === "gold" ? "text-[#F3C872]" : tone === "rose" ? "text-[#FF9F8D]" : "text-white/78"

  return (
    <div className="rounded-[20px] border border-white/[.08] bg-white/[.035] p-4">
      <div className="text-[8px] font-semibold tracking-[.15em] text-white/25">{label}</div>
      <div className={`keyboard-num mt-3 truncate font-mono text-[15px] font-semibold ${color}`}>{value}</div>
    </div>
  )
}

function ToggleButton({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`rounded-full border px-3.5 py-2 text-[8px] font-semibold transition ${active ? "border-[#8FE6AE]/20 bg-[#8FE6AE] text-[#10120F]" : "border-white/[.09] text-white/30 hover:bg-white/[.06] hover:text-white"}`}>
      {label}
    </button>
  )
}

function CopyBlock({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string
  value: string
  copied: boolean
  onCopy: () => void
}) {
  return (
    <article className="border-t border-white/[.07] py-4 first:border-t-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[8px] font-semibold tracking-[.15em] text-white/22">{label}</span>
        <button type="button" onClick={onCopy} className="text-[8px] font-semibold text-white/30 transition hover:text-white">{copied ? "✓ COPIED" : "COPY"}</button>
      </div>
      <pre className="keyboard-scroll max-h-44 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-5 text-[#CAD8CF]">{value}</pre>
    </article>
  )
}

function ModifierBadge({
  label,
  active,
}: {
  label: string
  active: boolean
}) {
  return (
    <span className={`rounded-full border px-3.5 py-2 text-[8px] font-semibold transition ${active ? "border-[#8FE6AE]/25 bg-[#8FE6AE] text-[#10120F] shadow-[0_0_24px_rgba(143,230,174,.22)]" : "border-white/[.09] bg-white/[.03] text-white/28"}`}>
      {label}
    </span>
  )
}

function KeyboardKey({
  label,
  wide = 1,
  active,
  recent,
}: {
  label: string
  wide?: number
  active: boolean
  recent: boolean
}) {
  return (
    <div className={`grid h-11 place-items-center rounded-[13px] border font-mono text-[8px] font-semibold uppercase transition ${active ? "border-[#8FE6AE]/30 bg-[#8FE6AE] text-[#10120F] shadow-[0_0_26px_rgba(143,230,174,.28)]" : recent ? "border-[#F3C872]/25 bg-[#F3C872]/12 text-[#F3C872]" : "border-white/[.08] bg-white/[.035] text-white/31"}`} style={{ flex: wide }}>
      {label}
    </div>
  )
}

export default function KeyboardTester() {
  const [info, setInfo] = useState<KeyInfo>(INITIAL)
  const [history, setHistory] = useState<KeyInfo[]>([])
  const [pressedCodes, setPressedCodes] = useState<string[]>([])
  const [listening, setListening] = useState(true)
  const [preventDefault, setPreventDefault] = useState(true)
  const [panelMode, setPanelMode] = useState<PanelMode>("event")
  const [copied, setCopied] = useState<CopyKey>(null)
  const [lastUpCode, setLastUpCode] = useState("")

  const pageRef = useRef<HTMLDivElement>(null)
  const pulseRef = useRef<HTMLDivElement>(null)

  const currentCombo = useMemo(() => comboFromInfo(info), [info])
  const eventText = useMemo(() => eventSnippet(info), [info])
  const jsonText = useMemo(() => jsonSnippet(info), [info])
  const reactText = useMemo(() => reactSnippet(info), [info])
  const historyText = useMemo(() => history.map((item, index) => `${String(index + 1).padStart(2, "0")}. [${item.time}] ${comboFromInfo(item)} · key=${item.key} · code=${item.code} · repeat=${item.repeat}`).join("\n"), [history])
  const report = useMemo(
    () =>
      [
        "BitLeap Keyboard Observatory",
        "",
        `Listening: ${listening}`,
        `Prevent default: ${preventDefault}`,
        `Last key: ${info.key}`,
        `Code: ${info.code}`,
        `Combo: ${currentCombo}`,
        `Location: ${keyLocationLabel(info.location)}`,
        `Repeat: ${info.repeat}`,
        "",
        "Event:",
        eventText,
        "",
        "History:",
        historyText || "No history",
      ].join("\n"),
    [currentCombo, eventText, historyText, info.code, info.key, info.location, info.repeat, listening, preventDefault],
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!listening) return
      if (preventDefault) event.preventDefault()

      const entry: KeyInfo = {
        key: event.key === " " ? "Space" : event.key,
        code: event.code,
        keyCode: event.keyCode || 0,
        which: event.which || event.keyCode || 0,
        location: event.location,
        shift: event.shiftKey,
        ctrl: event.ctrlKey,
        alt: event.altKey,
        meta: event.metaKey,
        repeat: event.repeat,
        phase: "down",
        time: timeLabel(),
      }

      setInfo(entry)
      setPressedCodes((current) => (current.includes(event.code) ? current : [...current, event.code]))
      setHistory((current) => [entry, ...current].slice(0, 18))
    },
    [listening, preventDefault],
  )

  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      if (!listening) return
      if (preventDefault) event.preventDefault()

      setLastUpCode(event.code)
      setPressedCodes((current) => current.filter((code) => code !== event.code))
      setInfo((current) => ({
        ...current,
        shift: event.shiftKey,
        ctrl: event.ctrlKey,
        alt: event.altKey,
        meta: event.metaKey,
        phase: "up",
        time: timeLabel(),
      }))

      window.setTimeout(() => setLastUpCode((current) => (current === event.code ? "" : current)), 260)
    },
    [listening, preventDefault],
  )

  useEffect(() => {
    const handleBlur = () => setPressedCodes([])

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    window.addEventListener("blur", handleBlur)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      window.removeEventListener("blur", handleBlur)
    }
  }, [handleKeyDown, handleKeyUp])

  useEffect(() => {
    if (!pageRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      gsap.from(".keyboard-intro", { opacity: 0, y: 18, duration: 0.72, stagger: 0.055, ease: "power3.out" })
      gsap.to(".keyboard-orbit", { rotation: 360, duration: 92, repeat: -1, ease: "none", transformOrigin: "50% 50%" })
    }, pageRef)

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (!pulseRef.current || info.phase === "idle" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    gsap.fromTo(pulseRef.current, { scale: 0.965, opacity: 0.78 }, { scale: 1, opacity: 1, duration: 0.2, ease: "power2.out", overwrite: true })
  }, [info.code, info.phase])

  const reset = () => {
    setInfo(INITIAL)
    setHistory([])
    setPressedCodes([])
    setLastUpCode("")
    setCopied(null)
  }

  const copy = async (text: string, key: CopyKey) => {
    if (!text) return

    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {}
  }

  return (
    <div ref={pageRef} className="min-h-screen overflow-hidden bg-[#070907] text-white selection:bg-[#8FE6AE] selection:text-[#070907]">
      <style>{`
        .keyboard-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
        .keyboard-scroll::-webkit-scrollbar-track { background: transparent; }
        .keyboard-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.15); border-radius: 999px; }
        .keyboard-num { font-variant-numeric: tabular-nums lining-nums; }
        .keyboard-grid {
          background-image:
            linear-gradient(rgba(143,230,174,.055) 1px, transparent 1px),
            linear-gradient(90deg, rgba(143,230,174,.055) 1px, transparent 1px);
          background-size: 34px 34px;
          background-position: center;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(143,230,174,.13),transparent_30%),radial-gradient(circle_at_85%_15%,rgba(243,200,114,.08),transparent_24%),radial-gradient(circle_at_18%_84%,rgba(122,163,255,.09),transparent_30%)]" />
        <div className="keyboard-grid absolute inset-0 opacity-70" />
        <div className="keyboard-orbit absolute right-[-18vw] top-[-22vw] h-[56vw] w-[56vw] rounded-full border border-white/[.04]">
          <span className="absolute left-[18%] top-[44%] h-2 w-2 rounded-full bg-[#8FE6AE]/40" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1680px] px-5 pb-10 pt-6 sm:px-8">
        <div className="keyboard-intro [&_*]:!text-white/60">
          <Breadcrumb />
        </div>

        <header className="keyboard-intro mt-8 grid gap-7 border-b border-white/[.09] pb-8 lg:grid-cols-[1fr_.74fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.22em] text-[#8FE6AE]/55">KEYBOARD OBSERVATORY</div>
            <h1 className="mt-4 text-[clamp(48px,6.2vw,90px)] font-semibold leading-[1.01] tracking-[-.06em]">
              每一次按键，
              <br />
              都是一束信号。
            </h1>
          </div>

          <div>
            <p className="max-w-[600px] text-[11px] leading-6 text-white/40">
              换成深色硬件观察站风格：实时监听 keydown / keyup、物理键位高亮、快捷键组合、历史记录、React 代码片段和 JSON 输出，适合调试快捷键、游戏键位和输入兼容性。
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <ToggleButton active={listening} label={listening ? "监听中" : "已暂停"} onClick={() => setListening((value) => !value)} />
              <ToggleButton active={preventDefault} label="阻止默认行为" onClick={() => setPreventDefault((value) => !value)} />
              <button type="button" onClick={reset} className="rounded-full border border-white/[.09] px-3.5 py-2 text-[8px] font-semibold text-[#FF9F8D] transition hover:bg-[#FF9F8D]/10">清空</button>
            </div>
          </div>
        </header>

        <section className="keyboard-intro mt-7 grid gap-5 xl:grid-cols-[1fr_360px]">
          <main className="min-w-0 overflow-hidden rounded-[34px] border border-white/[.09] bg-[#10120F]/95 shadow-[0_40px_120px_rgba(0,0,0,.32)]">
            <div className="flex flex-col gap-3 border-b border-white/[.07] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[8px] font-semibold tracking-[.14em] text-white/24">SIGNAL DISPLAY</div>
                <p className="mt-2 text-[8px] text-white/30">点击页面后按任意键，观察键值、物理码和组合状态。</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ModifierBadge label="Shift" active={info.shift} />
                <ModifierBadge label="Ctrl" active={info.ctrl} />
                <ModifierBadge label="Alt" active={info.alt} />
                <ModifierBadge label="Meta" active={info.meta} />
              </div>
            </div>

            <div className="grid gap-px bg-white/[.06] lg:grid-cols-[.86fr_1.14fr]">
              <div className="bg-[#10120F] p-5 sm:p-7">
                <div ref={pulseRef} tabIndex={0} className="grid min-h-[440px] place-items-center rounded-[30px] border border-[#8FE6AE]/10 bg-[radial-gradient(circle_at_50%_34%,rgba(143,230,174,.12),transparent_38%)] outline-none focus:border-[#8FE6AE]/30">
                  <div className="text-center">
                    <div className={`mx-auto mb-5 h-3 w-3 rounded-full ${listening ? "bg-[#8FE6AE] shadow-[0_0_30px_rgba(143,230,174,.58)]" : "bg-white/18"}`} />
                    <div className="max-w-[520px] break-all px-5 font-mono text-[clamp(54px,8vw,120px)] font-semibold leading-none tracking-[-.09em] text-white">{shortKey(info.key)}</div>
                    <div className="keyboard-num mt-5 font-mono text-[12px] text-[#8FE6AE]/58">{info.code}</div>
                    <div className="mt-4 text-[9px] font-semibold uppercase tracking-[.18em] text-white/22">{info.phase === "down" ? "KEY DOWN" : info.phase === "up" ? "KEY UP" : "WAITING"}</div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Metric label="COMBO" value={currentCombo} tone="green" />
                  <Metric label="LOCATION" value={keyLocationLabel(info.location)} tone="gold" />
                  <Metric label="KEYCODE / WHICH" value={`${info.keyCode} / ${info.which}`} />
                  <Metric label="REPEAT" value={info.repeat ? "true" : "false"} tone={info.repeat ? "rose" : "default"} />
                </div>
              </div>

              <div className="bg-[#0C0E0C] p-5 sm:p-7">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[8px] font-semibold tracking-[.14em] text-white/24">PHYSICAL KEYBOARD</div>
                    <p className="mt-2 text-[8px] text-white/26">按下时显示绿色，刚释放显示金色。</p>
                  </div>
                  <span className="keyboard-num rounded-full border border-white/[.08] px-3 py-2 text-[8px] text-white/28">{pressedCodes.length} pressed</span>
                </div>

                <div className="keyboard-scroll overflow-auto rounded-[26px] border border-white/[.07] bg-white/[.025] p-4">
                  <div className="min-w-[760px] space-y-2">
                    {KEYBOARD.map((row, rowIndex) => (
                      <div key={rowIndex} className="flex gap-2">
                        {row.map((key) => (
                          <KeyboardKey key={key.code} label={key.label} wide={key.wide} active={pressedCodes.includes(key.code)} recent={lastUpCode === key.code || info.code === key.code} />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-[20px] border border-white/[.07] bg-white/[.06]">
                  {[
                    ["LAST", displayKey(info.key)],
                    ["CODE", info.code],
                    ["TIME", info.time],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-[#0C0E0C] p-4">
                      <div className="text-[7px] font-semibold tracking-[.12em] text-white/18">{label}</div>
                      <div className="keyboard-num mt-2 truncate font-mono text-[10px] font-semibold text-[#CAD8CF]">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </main>

          <aside className="min-w-0 overflow-hidden rounded-[30px] border border-white/[.09] bg-[#10120F]/95">
            <div className="flex h-14 items-center gap-2 border-b border-white/[.07] px-4">
              {(["event", "shortcut", "history"] as PanelMode[]).map((mode) => (
                <button key={mode} type="button" onClick={() => setPanelMode(mode)} className={`rounded-full px-3 py-2 text-[8px] font-semibold transition ${panelMode === mode ? "bg-white text-[#10120F]" : "text-white/28 hover:bg-white/[.06]"}`}>{mode}</button>
              ))}
            </div>

            <div className="keyboard-scroll h-[720px] overflow-auto px-5">
              {panelMode === "event" && (
                <>
                  <CopyBlock label="EVENT FIELDS" value={eventText} copied={copied === "event"} onCopy={() => copy(eventText, "event")} />
                  <CopyBlock label="JSON" value={jsonText} copied={copied === "json"} onCopy={() => copy(jsonText, "json")} />
                </>
              )}

              {panelMode === "shortcut" && (
                <>
                  <article className="py-5">
                    <div className="text-[8px] font-semibold tracking-[.15em] text-white/22">CURRENT SHORTCUT</div>
                    <div className="mt-4 rounded-[22px] border border-[#8FE6AE]/12 bg-[#8FE6AE]/8 p-5 font-mono text-[18px] font-semibold text-[#8FE6AE]">{currentCombo}</div>
                    <p className="mt-3 text-[9px] leading-5 text-white/32">推荐在业务逻辑里优先判断 event.code；需要受键盘布局影响时再判断 event.key。</p>
                  </article>
                  <CopyBlock label="REACT SNIPPET" value={reactText} copied={copied === "react"} onCopy={() => copy(reactText, "react")} />
                </>
              )}

              {panelMode === "history" && (
                <article className="py-5">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-[8px] font-semibold tracking-[.15em] text-white/22">KEY HISTORY</span>
                    <button type="button" onClick={() => copy(historyText, "history")} className="text-[8px] font-semibold text-white/30 transition hover:text-white">{copied === "history" ? "✓ COPIED" : "COPY"}</button>
                  </div>

                  {history.length ? (
                    <div className="space-y-2">
                      {history.map((item, index) => (
                        <div key={`${item.time}-${item.code}-${index}`} className="rounded-[18px] border border-white/[.07] bg-white/[.035] p-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-mono text-[13px] font-semibold text-white/76">{comboFromInfo(item)}</span>
                            <span className="font-mono text-[8px] text-white/24">{item.time}</span>
                          </div>
                          <div className="mt-2 font-mono text-[8px] text-white/30">{item.key} · {item.code} · {item.repeat ? "repeat" : "single"}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid h-64 place-items-center rounded-[20px] border border-white/[.07] bg-white/[.025] text-center text-[10px] text-white/22">还没有按键记录</div>
                  )}
                </article>
              )}
            </div>

            <div className="border-t border-white/[.07] p-5">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => copy(report, "report")} className="rounded-full border border-white/[.09] px-4 py-3 text-[9px] font-semibold text-white/34 transition hover:bg-white hover:text-[#10120F]">{copied === "report" ? "✓ 报告" : "复制报告"}</button>
                <button type="button" onClick={() => downloadText(report, "bitleap-keyboard-report.txt")} className="rounded-full border border-white/[.09] px-4 py-3 text-[9px] font-semibold text-white/34 transition hover:bg-white hover:text-[#10120F]">导出</button>
              </div>
            </div>
          </aside>
        </section>

        <section className="keyboard-intro mt-12 grid gap-8 border-t border-white/[.09] pt-7 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-semibold tracking-[.13em] text-white/25">KEY VS CODE</div>
            <p className="mt-2 text-[9px] leading-5 text-white/34">key 代表用户输入的字符或语义，code 代表物理键位。做快捷键时通常 code 更稳定。</p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.13em] text-white/25">KEYDOWN / KEYUP</div>
            <p className="mt-2 text-[9px] leading-5 text-white/34">页面同时监听按下和释放，因此可以观察组合键是否被按住，也能看到 repeat 状态。</p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.13em] text-white/25">LOCAL ONLY</div>
            <p className="mt-2 text-[9px] leading-5 text-white/34">测试只发生在当前浏览器页面，不会上传输入内容。关闭监听后不会继续记录按键。</p>
          </div>
        </section>

        <div className="mt-12 border-t border-white/[.08] pt-5 [&_*]:!text-white/45">
          <FooterNote />
        </div>
      </div>
    </div>
  )
}
