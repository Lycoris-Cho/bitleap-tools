'use client'

import {
  useState,
  useRef,
  useCallback,
  useEffect,
} from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
type Message = {
  id: string
  direction: 'send' | 'recv'
  text: string
  time: string
}

export default function WebSocketPage() {
  const [url, setUrl] = useState('wss://ws.postman-echo.com/raw')
  const [input, setInput] = useState('{"type":"ping"}')
  const [status, setStatus] = useState<
    'idle' | 'connecting' | 'open' | 'closed' | 'error'
  >('idle')
  const [messages, setMessages] = useState<Message[]>([])
  const [autoReconnect, setAutoReconnect] = useState(true)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<number | null>(null)

  const now = () =>
    new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })

  const addMessage = (
    direction: 'send' | 'recv',
    text: string
  ) => {
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        direction,
        text,
        time: now(),
      },
    ])
  }

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    setStatus('connecting')
    setMessages([])

    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        setStatus('open')
        addMessage('recv', '✅ 已连接')
      }

      ws.onmessage = (e) => {
        addMessage('recv', String(e.data))
      }

      ws.onerror = () => {
        setStatus('error')
        addMessage('recv', '❌ 连接出错')
      }

      ws.onclose = () => {
        setStatus('closed')
        addMessage('recv', '🔌 连接已关闭')

        wsRef.current = null

        if (autoReconnect) {
          reconnectTimer.current = window.setTimeout(() => {
            addMessage('recv', '🔄 尝试重连...')
            connect()
          }, 3000)
        }
      }
    } catch {
      setStatus('error')
      addMessage('recv', '❌ URL 无效或浏览器不支持 WebSocket')
    }
  }, [url, autoReconnect])

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current)
      reconnectTimer.current = null
    }
    wsRef.current?.close()
    wsRef.current = null
    setStatus('closed')
  }, [])

  const send = useCallback(() => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      addMessage('recv', '⚠️ 未连接，无法发送')
      return
    }

    ws.send(input)
    addMessage('send', input)
  }, [input])

  const clear = () => setMessages([])

  const copyAll = () => {
    navigator.clipboard.writeText(
      messages
        .map(
          (m) =>
            `[${m.time}] ${m.direction === 'send' ? '>' : '<'} ${m.text}`
        )
        .join('\n')
    )
  }

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      {/* 标题 */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          WebSocket 测试台
        </h1>
        <p className="text-app-muted">
          连接 ws / wss 服务，实时收发消息，调试实时接口与推送
        </p>
      </div>

      {/* 连接区 */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="wss://example.com"
          className="flex-1 px-4 py-3 border rounded-xl font-mono text-sm"
        />
        {status !== 'open' ? (
          <button
            onClick={connect}
            className="px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition font-medium"
          >
            连接
          </button>
        ) : (
          <button
            onClick={disconnect}
            className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-medium"
          >
            断开
          </button>
        )}
      </div>

      {/* 状态 */}
      <div className="flex items-center gap-4 mb-6 text-sm">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              status === 'open'
                ? 'bg-green-500'
                : status === 'connecting'
                ? 'bg-yellow-500'
                : status === 'error'
                ? 'bg-red-500'
                : 'bg-gray-400'
            }`}
          />
          <span className="text-app-muted">
            {status === 'idle' && '未连接'}
            {status === 'connecting' && '连接中…'}
            {status === 'open' && '已连接'}
            {status === 'closed' && '已断开'}
            {status === 'error' && '连接错误'}
          </span>
        </div>

        <label className="flex items-center gap-2 text-app-muted">
          <input
            type="checkbox"
            checked={autoReconnect}
            onChange={(e) => setAutoReconnect(e.target.checked)}
          />
          自动重连
        </label>
      </div>

      {/* 发送区 */}
      <div className="mb-6">
        <div className="flex gap-3 mb-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={3}
            className="flex-1 px-4 py-3 border rounded-xl font-mono text-sm"
            placeholder='{"type":"ping"}'
          />
          <button
            onClick={send}
            disabled={status !== 'open'}
            className="px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            发送
          </button>
        </div>
        <p className="text-xs text-gray-500">
          支持 JSON / 纯文本，回车换行不会自动发送
        </p>
      </div>

      {/* 消息区 */}
      <div className="mb-4 flex justify-between items-center">
        <div className="text-sm font-medium">
          消息记录（{messages.length}）
        </div>
        <div className="flex gap-3">
          <button
            onClick={copyAll}
            className="px-4 py-2 border rounded-xl text-sm hover:bg-gray-50 transition"
          >
            复制全部
          </button>
          <button
            onClick={clear}
            className="px-4 py-2 border rounded-xl text-sm text-red-600 hover:bg-red-50 transition"
          >
            清空
          </button>
        </div>
      </div>

      <div className="border rounded-2xl bg-gray-50 p-4 h-[360px] overflow-auto">
        {messages.length === 0 && (
          <div className="text-gray-500 text-sm">
            连接后发送消息，这里会显示时间线
          </div>
        )}
        <div className="space-y-2">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`text-sm font-mono px-3 py-2 rounded-xl ${
                m.direction === 'send'
                  ? 'bg-blue-50 text-blue-900'
                  : 'bg-app-bg border'
              }`}
            >
              <div className="flex justify-between text-xs text-app-muted mb-1">
                <span>{m.direction === 'send' ? '>' : '<'}</span>
                <span>{m.time}</span>
              </div>
              <div className="whitespace-pre-wrap break-all">
                {m.text}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 说明 */}
      <div className="mt-10 text-sm text-gray-500 leading-relaxed">
        <p className="mb-2">
          当前使用浏览器原生 WebSocket，仅支持标准 ws / wss 协议。
        </p>
        <p>
          不支持 Socket.IO / SignalR / STOMP 等上层协议。
          默认已预填 Postman 的公开 echo 服务，可直接测试。
        </p>
      </div>
    </div>
  )
}