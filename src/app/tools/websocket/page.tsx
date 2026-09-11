"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type SocketStatus = "idle" | "connecting" | "open" | "closed" | "error"
type MessageDirection = "send" | "recv" | "system"
type PayloadMode = "text" | "json"
type CopyKey = "timeline" | "message" | "payload" | null

type Message = {
  id: string
  direction: MessageDirection
  text: string
  time: string
  timestamp: number
  size: number
  isJson: boolean
}

type Preset = {
  name: string
  url: string
  payload: string
}

const MAX_LOGS = 500

const PRESETS: Preset[] = [
  {
    name: "Postman Echo",
    url: "wss://ws.postman-echo.com/raw",
    payload: '{"type":"ping","source":"BitLeap"}',
  },
  {
    name: "PieSocket Echo",
    url: "wss://socketsbay.com/wss/v2/1/demo/",
    payload: '{"event":"hello","message":"BitLeap WebSocket Studio"}',
  },
  {
    name: "Localhost",
    url: "ws://localhost:8080",
    payload: '{"type":"ping"}',
  },
]

const SAMPLE_PAYLOADS = [
  {
    label: "PING",
    value: '{"type":"ping","time":"now"}',
  },
  {
    label: "SUBSCRIBE",
    value: '{"type":"subscribe","channel":"prices"}',
  },
  {
    label: "AUTH",
    value: '{"type":"auth","token":"YOUR_TOKEN"}',
  },
  {
    label: "TEXT",
    value: "hello from BitLeap",
  },
]

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value)
}

function humanBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function nowLabel() {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date())
}

function getByteSize(value: string) {
  return new TextEncoder().encode(value).length
}

function isLikelyJson(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return false
  if (!["{", "["].includes(trimmed[0])) return false

  try {
    JSON.parse(trimmed)
    return true
  } catch {
    return false
  }
}

function prettyJson(value: string) {
  return JSON.stringify(JSON.parse(value), null, 2)
}

function minifyJson(value: string) {
  return JSON.stringify(JSON.parse(value))
}

function normalizeUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return trimmed
  if (trimmed.startsWith("ws://") || trimmed.startsWith("wss://")) return trimmed
  if (trimmed.startsWith("http://")) return `ws://${trimmed.slice(7)}`
  if (trimmed.startsWith("https://")) return `wss://${trimmed.slice(8)}`
  return `wss://${trimmed}`
}

function statusText(status: SocketStatus) {
  if (status === "idle") return "未连接"
  if (status === "connecting") return "连接中"
  if (status === "open") return "已连接"
  if (status === "closed") return "已断开"
  return "连接错误"
}

function statusTone(status: SocketStatus) {
  if (status === "open") return "bg-[#52685d]"
  if (status === "connecting") return "animate-pulse bg-[#b28d48]"
  if (status === "error") return "bg-[#965744]"
  return "bg-black/24"
}

function makeLogLine(message: Message) {
  const marker =
    message.direction === "send"
      ? ">"
      : message.direction === "recv"
        ? "<"
        : "*"

  return `[${message.time}] ${marker} ${message.text}`
}

function downloadText(content: string, filename: string) {
  if (!content) return

  const blob = new Blob([content], {
    type: "text/plain;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 500)
}

function safeRandomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function StatBox({
  label,
  value,
  tone = "ink",
}: {
  label: string
  value: string
  tone?: "ink" | "green" | "gold" | "rose"
}) {
  const toneClass =
    tone === "green"
      ? "text-[#52685d]"
      : tone === "gold"
        ? "text-[#9b7542]"
        : tone === "rose"
          ? "text-[#965744]"
          : "text-black/61"

  return (
    <div className="bg-[#f3f0e8]/92 p-4">
      <div className="text-[7px] font-semibold tracking-[.12em] text-black/23">
        {label}
      </div>
      <div className={`ws-num mt-3 break-all font-mono text-[13px] font-semibold ${toneClass}`}>
        {value}
      </div>
    </div>
  )
}

function TogglePill({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3.5 py-2 text-[8px] font-semibold transition ${
        active
          ? "border-[#52685d]/20 bg-[#52685d] text-white"
          : "border-black/[.085] text-black/34 hover:bg-white/45 hover:text-black"
      }`}
    >
      {label}
    </button>
  )
}

export default function WebSocketPage() {
  const [url, setUrl] = useState("wss://ws.postman-echo.com/raw")
  const [payload, setPayload] = useState('{"type":"ping","source":"BitLeap"}')
  const [payloadMode, setPayloadMode] = useState<PayloadMode>("json")
  const [status, setStatus] = useState<SocketStatus>("idle")
  const [messages, setMessages] = useState<Message[]>([])
  const [autoReconnect, setAutoReconnect] = useState(true)
  const [clearOnConnect, setClearOnConnect] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const [heartbeat, setHeartbeat] = useState(false)
  const [copied, setCopied] = useState<CopyKey>(null)
  const [closeCode, setCloseCode] = useState<number | null>(null)
  const [closeReason, setCloseReason] = useState("")
  const [connectedAt, setConnectedAt] = useState<number | null>(null)
  const [reconnectDelay, setReconnectDelay] = useState(3000)
  const [filter, setFilter] = useState<"all" | MessageDirection>("all")

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<number | null>(null)
  const heartbeatTimerRef = useRef<number | null>(null)
  const reconnectAttemptRef = useRef(0)
  const manualCloseRef = useRef(false)
  const logRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  const addMessage = useCallback((direction: MessageDirection, text: string) => {
    const next: Message = {
      id: safeRandomId(),
      direction,
      text,
      time: nowLabel(),
      timestamp: Date.now(),
      size: getByteSize(text),
      isJson: isLikelyJson(text),
    }

    setMessages((current) => [...current, next].slice(-MAX_LOGS))
  }, [])

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
  }, [])

  const clearHeartbeatTimer = useCallback(() => {
    if (heartbeatTimerRef.current !== null) {
      window.clearInterval(heartbeatTimerRef.current)
      heartbeatTimerRef.current = null
    }
  }, [])

  const disconnect = useCallback(
    (manual = true) => {
      if (manual) manualCloseRef.current = true
      clearReconnectTimer()
      clearHeartbeatTimer()

      if (wsRef.current) {
        try {
          wsRef.current.close(1000, "closed by BitLeap user")
        } catch {}
      }

      wsRef.current = null
      setConnectedAt(null)
      setStatus("closed")

      if (manual) addMessage("system", "连接已手动关闭")
    },
    [addMessage, clearHeartbeatTimer, clearReconnectTimer],
  )

  const connect = useCallback(
    (reconnect = false) => {
      const normalized = normalizeUrl(url)

      if (!normalized.startsWith("ws://") && !normalized.startsWith("wss://")) {
        setStatus("error")
        addMessage("system", "URL 无效：WebSocket 地址必须以 ws:// 或 wss:// 开头")
        return
      }

      if (
        wsRef.current &&
        (wsRef.current.readyState === WebSocket.OPEN ||
          wsRef.current.readyState === WebSocket.CONNECTING)
      ) {
        return
      }

      clearReconnectTimer()
      clearHeartbeatTimer()
      manualCloseRef.current = false
      setStatus("connecting")
      setCloseCode(null)
      setCloseReason("")
      setUrl(normalized)

      if (clearOnConnect && !reconnect) setMessages([])
      addMessage("system", reconnect ? `正在重连：${normalized}` : `正在连接：${normalized}`)

      try {
        const socket = new WebSocket(normalized)
        wsRef.current = socket

        socket.onopen = () => {
          reconnectAttemptRef.current = 0
          setStatus("open")
          setConnectedAt(Date.now())
          addMessage("system", "连接已建立")

          if (heartbeat) {
            clearHeartbeatTimer()
            heartbeatTimerRef.current = window.setInterval(() => {
              if (socket.readyState !== WebSocket.OPEN) return
              const ping = JSON.stringify({
                type: "ping",
                t: Date.now(),
              })
              socket.send(ping)
              addMessage("send", ping)
            }, 30000)
          }
        }

        socket.onmessage = (event) => {
          const data =
            typeof event.data === "string"
              ? event.data
              : event.data instanceof Blob
                ? `[Blob ${humanBytes(event.data.size)}]`
                : event.data instanceof ArrayBuffer
                  ? `[ArrayBuffer ${humanBytes(event.data.byteLength)}]`
                  : String(event.data)

          addMessage("recv", data)
        }

        socket.onerror = () => {
          setStatus("error")
          addMessage("system", "连接发生错误。浏览器不会暴露更详细的 WebSocket 错误原因。")
        }

        socket.onclose = (event) => {
          if (wsRef.current === socket) wsRef.current = null

          clearHeartbeatTimer()
          setConnectedAt(null)
          setCloseCode(event.code)
          setCloseReason(event.reason)
          setStatus(event.wasClean ? "closed" : "error")
          addMessage("system", `连接已关闭：code=${event.code}${event.reason ? `，reason=${event.reason}` : ""}`)

          if (manualCloseRef.current || !autoReconnect) return

          reconnectAttemptRef.current += 1
          const delay = Math.min(30000, reconnectDelay * reconnectAttemptRef.current)

          reconnectTimerRef.current = window.setTimeout(() => {
            connect(true)
          }, delay)

          addMessage("system", `${Math.round(delay / 1000)} 秒后尝试第 ${reconnectAttemptRef.current} 次重连`)
        }
      } catch (error) {
        setStatus("error")
        addMessage(
          "system",
          error instanceof Error
            ? error.message
            : "URL 无效或当前浏览器不支持 WebSocket",
        )
      }
    },
    [
      addMessage,
      autoReconnect,
      clearHeartbeatTimer,
      clearOnConnect,
      clearReconnectTimer,
      heartbeat,
      reconnectDelay,
      url,
    ],
  )

  const send = useCallback(() => {
    const socket = wsRef.current

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      addMessage("system", "未连接，无法发送消息")
      return
    }

    let text = payload

    if (payloadMode === "json") {
      try {
        text = minifyJson(payload)
      } catch {
        addMessage("system", "JSON 无效，未发送。切换到 TEXT 模式可发送原文。")
        return
      }
    }

    socket.send(text)
    addMessage("send", text)
  }, [addMessage, payload, payloadMode])

  const formatPayload = () => {
    if (!payload.trim()) return

    try {
      setPayload(prettyJson(payload))
      setPayloadMode("json")
    } catch {
      addMessage("system", "当前输入不是有效 JSON，无法格式化。")
    }
  }

  const minifyPayload = () => {
    if (!payload.trim()) return

    try {
      setPayload(minifyJson(payload))
      setPayloadMode("json")
    } catch {
      addMessage("system", "当前输入不是有效 JSON，无法压缩。")
    }
  }

  const copy = async (value: string, key: CopyKey) => {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {}
  }

  const timeline = useMemo(
    () => messages.map(makeLogLine).join("\n"),
    [messages],
  )

  const filteredMessages = useMemo(
    () =>
      filter === "all"
        ? messages
        : messages.filter((message) => message.direction === filter),
    [filter, messages],
  )

  const stats = useMemo(() => {
    const sent = messages.filter((message) => message.direction === "send")
    const received = messages.filter((message) => message.direction === "recv")
    const systems = messages.filter((message) => message.direction === "system")
    const bytesSent = sent.reduce((sum, message) => sum + message.size, 0)
    const bytesReceived = received.reduce((sum, message) => sum + message.size, 0)

    return {
      total: messages.length,
      sent: sent.length,
      received: received.length,
      systems: systems.length,
      bytesSent,
      bytesReceived,
    }
  }, [messages])

  const payloadInfo = useMemo(() => {
    const bytes = getByteSize(payload)
    const validJson = isLikelyJson(payload)

    return {
      bytes,
      validJson,
      lines: payload ? payload.split(/\r?\n/).length : 0,
    }
  }, [payload])

  const sessionSeconds =
    connectedAt && status === "open"
      ? Math.max(0, Math.floor((Date.now() - connectedAt) / 1000))
      : 0

  useEffect(() => {
    return () => {
      manualCloseRef.current = true
      clearReconnectTimer()
      clearHeartbeatTimer()
      try {
        wsRef.current?.close()
      } catch {}
      wsRef.current = null
    }
  }, [clearHeartbeatTimer, clearReconnectTimer])

  useEffect(() => {
    if (!autoScroll || !logRef.current) return
    logRef.current.scrollTop = logRef.current.scrollHeight
  }, [autoScroll, filteredMessages.length])

  useEffect(() => {
    if (
      !pageRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    const ctx = gsap.context(() => {
      gsap.from(".ws-intro", {
        y: 22,
        opacity: 0,
        duration: 0.78,
        stagger: 0.055,
        ease: "power3.out",
      })

      gsap.to(".ws-orbit-a", {
        rotation: 360,
        duration: 70,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })

      gsap.to(".ws-orbit-b", {
        rotation: -360,
        duration: 106,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })
    }, pageRef)

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (
      !outputRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    gsap.fromTo(
      outputRef.current,
      { opacity: 0.72, y: 5 },
      {
        opacity: 1,
        y: 0,
        duration: 0.22,
        ease: "power2.out",
        overwrite: true,
      },
    )
  }, [filteredMessages.length, status])

  const statusLabel = statusText(status)

  return (
    <div ref={pageRef} className="min-h-screen overflow-hidden bg-[#efede6] text-[#22231f] selection:bg-[#22231f] selection:text-white">
      <style>{`
        .ws-scroll::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }

        .ws-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .ws-scroll::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(34,35,31,.13);
        }

        .ws-dark-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,.14);
        }

        .ws-grid {
          background-image:
            linear-gradient(rgba(34,35,31,.032) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,35,31,.032) 1px, transparent 1px);
          background-size: 30px 30px;
        }

        .ws-num {
          font-variant-numeric: tabular-nums lining-nums;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_9%,rgba(178,151,91,.10),transparent_27%),radial-gradient(circle_at_8%_88%,rgba(73,107,91,.08),transparent_31%)]" />
        <div className="ws-orbit-a absolute right-[-20vw] top-[-24vw] h-[58vw] w-[58vw] rounded-full border border-black/[.04]">
          <span className="absolute left-[15%] top-[43%] h-2 w-2 rounded-full bg-[#b28d48]/38" />
        </div>
        <div className="ws-orbit-b absolute bottom-[-26vw] left-[-19vw] h-[53vw] w-[53vw] rounded-full border border-black/[.032]">
          <span className="absolute right-[14%] top-[31%] h-1.5 w-1.5 rounded-full bg-[#52685d]/35" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1580px] px-5 pb-10 pt-6 sm:px-8">
        <div className="ws-intro">
          <Breadcrumb />
        </div>

        <header className="ws-intro mt-8 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/27">
              WEBSOCKET STUDIO
            </div>
            <h1 className="mt-4 max-w-[900px] text-[clamp(48px,6.35vw,90px)] font-semibold leading-[1.03] tracking-[-.055em]">
              连接实时接口，
              <br />
              看见每一次往返。
            </h1>
          </div>

          <div>
            <p className="max-w-[560px] text-[11px] leading-6 text-black/40">
              连接 ws / wss 服务，发送 JSON 或文本，记录收发时间线、状态、关闭码、流量与重连过程。适合调试实时推送、echo 服务和本地 WebSocket 接口。
            </p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[8px] text-black/25">
              <span>NATIVE WEBSOCKET</span>
              <span>JSON / TEXT</span>
              <span>AUTO RECONNECT</span>
              <span>LOCAL CLIENT</span>
            </div>
          </div>
        </header>

        <section className="ws-intro mt-7 grid gap-7 xl:grid-cols-[.68fr_1.32fr]">
          <aside className="min-w-0">
            <div className="rounded-[28px] border border-black/[.075] bg-white/24 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[8px] font-semibold tracking-[.14em] text-black/24">
                    CONNECTION
                  </div>
                  <h2 className="mt-3 text-[clamp(30px,3.5vw,46px)] font-semibold leading-none tracking-[-.045em]">
                    连接设置。
                  </h2>
                </div>

                <div className="flex items-center gap-2 rounded-full border border-black/[.075] bg-white/25 px-3 py-2">
                  <span className={`h-2 w-2 rounded-full ${statusTone(status)}`} />
                  <span className="text-[8px] font-semibold text-black/42">
                    {statusLabel}
                  </span>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                <label>
                  <span className="mb-2 block text-[8px] font-semibold tracking-[.12em] text-black/24">
                    WS URL
                  </span>
                  <input
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    spellCheck={false}
                    className="w-full rounded-full border border-black/[.08] bg-white/35 px-4 py-3 font-mono text-[10px] text-black/68 outline-none transition focus:border-black/25"
                    placeholder="wss://example.com/socket"
                  />
                </label>

                <div>
                  <div className="mb-2 text-[8px] font-semibold tracking-[.12em] text-black/24">
                    PRESETS
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          setUrl(preset.url)
                          setPayload(preset.payload)
                        }}
                        className="rounded-full border border-black/[.08] px-3.5 py-2 text-[8px] font-semibold text-black/34 transition hover:bg-white/45 hover:text-black"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {status !== "open" ? (
                    <button
                      type="button"
                      onClick={() => connect(false)}
                      disabled={status === "connecting"}
                      className="rounded-full bg-[#22231f] px-5 py-4 text-[9px] font-semibold text-white transition hover:scale-[1.01] active:scale-[.98] disabled:opacity-35"
                    >
                      {status === "connecting" ? "连接中…" : "连接"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => disconnect(true)}
                      className="rounded-full bg-[#965744] px-5 py-4 text-[9px] font-semibold text-white transition hover:scale-[1.01] active:scale-[.98]"
                    >
                      断开
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      disconnect(false)
                      window.setTimeout(() => connect(false), 80)
                    }}
                    disabled={status === "connecting"}
                    className="rounded-full border border-black/[.09] px-5 py-4 text-[9px] font-semibold text-black/40 transition hover:bg-white/45 disabled:opacity-30"
                  >
                    重连
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <TogglePill active={autoReconnect} label="自动重连" onClick={() => setAutoReconnect((value) => !value)} />
                  <TogglePill active={heartbeat} label="30 秒心跳" onClick={() => setHeartbeat((value) => !value)} />
                  <TogglePill active={clearOnConnect} label="连接时清空日志" onClick={() => setClearOnConnect((value) => !value)} />
                  <TogglePill active={autoScroll} label="自动滚动" onClick={() => setAutoScroll((value) => !value)} />
                </div>

                <label>
                  <span className="mb-2 block text-[8px] text-black/24">
                    重连基础间隔：{Math.round(reconnectDelay / 1000)} 秒
                  </span>
                  <input
                    type="range"
                    min={1000}
                    max={10000}
                    step={1000}
                    value={reconnectDelay}
                    onChange={(event) => setReconnectDelay(Number(event.target.value))}
                    className="w-full accent-[#52685d]"
                  />
                </label>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-[24px] border border-black/[.075] bg-white/24">
              <div className="border-b border-black/[.06] px-5 py-4">
                <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">
                  SESSION PROFILE
                </div>
                <p className="mt-2 text-[9px] leading-5 text-black/35">
                  {status === "open"
                    ? "连接正在运行，可以发送消息。"
                    : status === "connecting"
                      ? "正在建立 WebSocket 握手。"
                      : status === "error"
                        ? "连接异常，查看系统日志和关闭码。"
                        : "等待连接。"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-px bg-black/[.06]">
                <StatBox label="STATUS" value={statusLabel} tone={status === "open" ? "green" : status === "error" ? "rose" : "ink"} />
                <StatBox label="SESSION" value={status === "open" ? `${sessionSeconds}s` : "—"} tone="gold" />
                <StatBox label="SENT" value={formatNumber(stats.sent)} tone="green" />
                <StatBox label="RECEIVED" value={formatNumber(stats.received)} tone="green" />
                <StatBox label="BYTES OUT" value={humanBytes(stats.bytesSent)} />
                <StatBox label="BYTES IN" value={humanBytes(stats.bytesReceived)} />
                <StatBox label="CLOSE CODE" value={closeCode === null ? "—" : String(closeCode)} tone={closeCode && closeCode !== 1000 ? "rose" : "ink"} />
                <StatBox label="LOGS" value={`${formatNumber(stats.total)} / ${MAX_LOGS}`} />
              </div>

              {closeReason && (
                <div className="border-t border-black/[.06] px-5 py-4">
                  <div className="text-[8px] font-semibold tracking-[.12em] text-[#965744]">
                    CLOSE REASON
                  </div>
                  <p className="mt-2 break-words text-[9px] leading-5 text-[#965744]">
                    {closeReason}
                  </p>
                </div>
              )}
            </div>
          </aside>

          <div className="min-w-0">
            <div className="flex flex-col gap-4 border-b border-black/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-[8px] font-semibold tracking-[.14em] text-black/23">
                  MESSAGE LAB
                </div>
                <h2 className="mt-2 text-[clamp(31px,4vw,48px)] font-semibold leading-none tracking-[-.045em]">
                  写一条消息，然后发送。
                </h2>
              </div>

              <div className="flex flex-wrap gap-2">
                {(["json", "text"] as PayloadMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPayloadMode(mode)}
                    className={`rounded-full px-4 py-2.5 font-mono text-[8px] font-semibold transition ${
                      payloadMode === mode
                        ? "bg-[#22231f] text-white"
                        : "text-black/34 hover:bg-white/45 hover:text-black"
                    }`}
                  >
                    {mode.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-px overflow-hidden rounded-[30px] border border-black/[.075] bg-black/[.07] lg:grid-cols-[.92fr_1.08fr]">
              <div className="min-w-0 bg-[#f4f1e9]">
                <div className="flex h-12 items-center justify-between border-b border-black/[.065] px-5">
                  <span className="text-[8px] font-semibold tracking-[.13em] text-black/26">
                    PAYLOAD
                  </span>
                  <span className={`text-[8px] ${payloadMode === "json" && !payloadInfo.validJson ? "text-[#965744]" : "text-black/22"}`}>
                    {payloadMode === "json"
                      ? payloadInfo.validJson
                        ? "VALID JSON"
                        : "INVALID JSON"
                      : "TEXT"}
                  </span>
                </div>

                <textarea
                  value={payload}
                  onChange={(event) => setPayload(event.target.value)}
                  onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                      event.preventDefault()
                      send()
                    }
                  }}
                  spellCheck={false}
                  className="ws-scroll block h-[430px] w-full resize-none bg-transparent p-5 font-mono text-[11px] leading-6 text-[#292b26] outline-none placeholder:text-black/16 sm:p-6"
                  placeholder='{"type":"ping"}'
                />

                <div className="flex flex-wrap items-center gap-2 border-t border-black/[.06] px-5 py-4">
                  <button
                    type="button"
                    onClick={send}
                    disabled={status !== "open"}
                    className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white transition hover:scale-[1.01] active:scale-[.98] disabled:opacity-30"
                  >
                    发送 Ctrl/⌘ Enter
                  </button>

                  <button type="button" onClick={formatPayload} className="rounded-full border border-black/[.085] px-3.5 py-2.5 text-[8px] font-semibold text-black/35 transition hover:bg-white/45">格式化 JSON</button>
                  <button type="button" onClick={minifyPayload} className="rounded-full border border-black/[.085] px-3.5 py-2.5 text-[8px] font-semibold text-black/35 transition hover:bg-white/45">压缩 JSON</button>
                  <button type="button" onClick={() => copy(payload, "payload")} className="rounded-full border border-black/[.085] px-3.5 py-2.5 text-[8px] font-semibold text-black/35 transition hover:bg-white/45">{copied === "payload" ? "✓ 已复制" : "复制"}</button>
                </div>
              </div>

              <div ref={outputRef} className="min-w-0 bg-[#151714]">
                <div className="flex h-12 items-center justify-between border-b border-white/[.065] px-5">
                  <span className="text-[8px] font-semibold tracking-[.13em] text-white/27">
                    TIMELINE
                  </span>
                  <span className="ws-num font-mono text-[8px] text-white/18">
                    {formatNumber(filteredMessages.length)} logs
                  </span>
                </div>

                <div ref={logRef} className="ws-dark-scroll h-[494px] overflow-auto p-4 sm:p-5">
                  {!filteredMessages.length ? (
                    <div className="grid h-full place-items-center text-center">
                      <p className="max-w-[280px] text-[9px] leading-5 text-white/25">
                        连接后发送消息，系统事件、发送和接收内容都会显示在这里。
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredMessages.map((message) => (
                        <article
                          key={message.id}
                          className={`group rounded-[18px] border px-4 py-3 ${
                            message.direction === "send"
                              ? "border-[#8871b3]/20 bg-[#8871b3]/10"
                              : message.direction === "recv"
                                ? "border-[#52685d]/24 bg-[#52685d]/12"
                                : "border-white/[.07] bg-white/[.035]"
                          }`}
                        >
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className={`h-1.5 w-1.5 rounded-full ${
                                message.direction === "send"
                                  ? "bg-[#aa96ce]"
                                  : message.direction === "recv"
                                    ? "bg-[#8fb69b]"
                                    : "bg-white/25"
                              }`} />
                              <span className="font-mono text-[8px] font-semibold tracking-[.12em] text-white/30">
                                {message.direction === "send"
                                  ? "SEND"
                                  : message.direction === "recv"
                                    ? "RECV"
                                    : "SYSTEM"}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="ws-num font-mono text-[7px] text-white/17">
                                {message.time} · {humanBytes(message.size)}
                              </span>
                              <button
                                type="button"
                                onClick={() => copy(message.text, "message")}
                                className="text-[7px] font-semibold text-white/20 opacity-100 transition hover:text-white sm:opacity-0 sm:group-hover:opacity-100"
                              >
                                {copied === "message" ? "✓" : "COPY"}
                              </button>
                            </div>
                          </div>

                          <pre className="whitespace-pre-wrap break-all font-mono text-[10px] leading-5 text-[#cbd8cd]">
                            {message.isJson
                              ? prettyJson(message.text)
                              : message.text}
                          </pre>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-1.5">
                {(["all", "send", "recv", "system"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    className={`rounded-full px-3.5 py-2 text-[8px] font-semibold transition ${
                      filter === value
                        ? "bg-[#52685d] text-white"
                        : "text-black/32 hover:bg-white/45 hover:text-black"
                    }`}
                  >
                    {value === "all" ? "全部" : value.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => copy(timeline, "timeline")}
                  disabled={!timeline}
                  className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white transition hover:scale-[1.01] active:scale-[.98] disabled:opacity-30"
                >
                  {copied === "timeline" ? "✓ 已复制" : "复制时间线"}
                </button>
                <button
                  type="button"
                  onClick={() => downloadText(timeline, "bitleap-websocket-timeline.txt")}
                  disabled={!timeline}
                  className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 transition hover:bg-white/40 disabled:opacity-30"
                >
                  导出日志
                </button>
                <button
                  type="button"
                  onClick={() => setMessages([])}
                  disabled={!messages.length}
                  className="rounded-full px-4 py-3 text-[9px] font-semibold text-[#965744] transition hover:bg-[#965744]/8 disabled:opacity-30"
                >
                  清空日志
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {SAMPLE_PAYLOADS.map((sample) => (
                <button
                  key={sample.label}
                  type="button"
                  onClick={() => {
                    setPayload(sample.value)
                    setPayloadMode(isLikelyJson(sample.value) ? "json" : "text")
                  }}
                  className="rounded-full border border-black/[.085] px-3.5 py-2 text-[8px] font-semibold text-black/35 transition hover:bg-white/45 hover:text-black"
                >
                  {sample.label}
                </button>
              ))}
              <span className="self-center text-[8px] text-black/24">
                当前 payload：{payloadInfo.lines} 行 · {humanBytes(payloadInfo.bytes)}
              </span>
            </div>
          </div>
        </section>

        <section className="ws-intro mt-12 grid gap-8 border-t border-black/10 pt-7 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              NATIVE SOCKET
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              使用浏览器原生 WebSocket。浏览器端不能随意设置自定义请求头，因此带鉴权的服务通常需要 query token、cookie 或服务端代理。
            </p>
          </div>

          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              AUTO RECONNECT
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              非手动关闭时可以自动重连，并把重连尝试写入时间线。手动断开会停止重连和心跳。
            </p>
          </div>

          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              PROTOCOL LIMIT
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              这个页面测试标准 ws / wss 协议；Socket.IO、STOMP、SignalR 等上层协议需要各自的客户端握手流程。
            </p>
          </div>
        </section>

        <div className="mt-12 border-t border-black/[.08] pt-5">
          <FooterNote />
        </div>
      </div>
    </div>
  )
}
