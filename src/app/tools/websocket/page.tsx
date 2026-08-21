'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

type Message = {
  id: string
  direction: 'send' | 'recv'
  text: string
  time: string
}

export default function WebSocketPage() {
  const [url, setUrl] = useState('wss://ws.postman-echo.com/raw')
  const [input, setInput] = useState('{"type":"ping"}')
  const [status, setStatus] = useState<'idle' | 'connecting' | 'open' | 'closed' | 'error'>('idle')
  const [messages, setMessages] = useState<Message[]>([])
  const [autoReconnect, setAutoReconnect] = useState(true)
  const [copied, setCopied] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<number | null>(null)

  const now = () =>
    new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })

  const addMessage = (direction: 'send' | 'recv', text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), direction, text, time: now() },
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

  const copyAll = async () => {
    if (messages.length === 0) return
    await navigator.clipboard.writeText(
      messages
        .map((m) => `[${m.time}] ${m.direction === 'send' ? '>' : '<'} ${m.text}`)
        .join('\n')
    )
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">WebSocket 测试台</h1>
        <p className="text-app-muted text-sm">连接 ws / wss 服务，实时收发消息，调试实时接口与推送</p>
      </div>

      {/* 连接区 */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="wss://example.com"
          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
        {status !== 'open' ? (
          <button
            onClick={connect}
            className="px-6 py-2.5 bg-violet-500 text-white rounded-xl text-sm font-medium hover:bg-violet-600 active:scale-95 transition-all shadow-sm shadow-violet-500/20 shrink-0"
          >
            {status === 'connecting' ? '连接中…' : '🔗 连接'}
          </button>
        ) : (
          <button
            onClick={disconnect}
            className="px-6 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 active:scale-95 transition-all shrink-0"
          >
            ✖ 断开
          </button>
        )}
      </div>

      {/* 状态栏 */}
      <div className="flex items-center gap-4 mb-6 text-sm">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${
            status === 'open' ? 'bg-emerald-500' :
            status === 'connecting' ? 'bg-yellow-500 animate-pulse' :
            status === 'error' ? 'bg-red-500' :
            'bg-gray-400'
          }`} />
          <span className="text-app-muted font-medium">
            {status === 'idle' && '未连接'}
            {status === 'connecting' && '连接中…'}
            {status === 'open' && '已连接'}
            {status === 'closed' && '已断开'}
            {status === 'error' && '连接错误'}
          </span>
        </div>
        <label className="flex items-center gap-2 text-sm text-app-muted cursor-pointer">
          <input
            type="checkbox"
            checked={autoReconnect}
            onChange={(e) => setAutoReconnect(e.target.checked)}
            className="w-4 h-4 accent-violet-500"
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
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
            placeholder='{"type":"ping"}'
          />
          <button
            onClick={send}
            disabled={status !== 'open'}
            className="px-6 py-3 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100 shrink-0 self-start"
          >
            📤 发送
          </button>
        </div>
        <p className="text-xs text-app-muted">支持 JSON / 纯文本，回车换行不会自动发送</p>
      </div>

      {/* 消息记录头 */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          消息记录（{messages.length}）
        </span>
        <div className="flex gap-2">
          <button
            onClick={copyAll}
            disabled={messages.length === 0}
            className="px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {copied ? '✓ 已复制' : '📋 复制全部'}
          </button>
          <button
            onClick={clear}
            disabled={messages.length === 0}
            className="px-3 py-1.5 bg-orange-50 text-orange-600 border border-orange-200 text-xs font-medium rounded-lg hover:bg-orange-100 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            清空
          </button>
        </div>
      </div>

      {/* 消息区 */}
      <div className="border border-app-border rounded-2xl bg-gray-900 p-4 h-[360px] overflow-auto">
        {messages.length === 0 ? (
          <div className="text-gray-500 text-sm flex items-center justify-center h-full">
            连接后发送消息，这里会显示时间线
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`text-sm font-mono px-3 py-2 rounded-xl ${
                  m.direction === 'send'
                    ? 'bg-violet-500/10 text-violet-200 border border-violet-500/20'
                    : 'bg-gray-800 text-emerald-300 border border-gray-700'
                }`}
              >
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{m.direction === 'send' ? '↑ SEND' : '↓ RECV'}</span>
                  <span>{m.time}</span>
                </div>
                <div className="whitespace-pre-wrap break-all">{m.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 说明卡片 */}
      <div className="mt-10 p-4 bg-gray-50 border border-app-border rounded-xl">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">使用说明</h3>
        <ul className="text-xs text-app-muted space-y-1.5 leading-relaxed">
          <li>• 使用浏览器原生 WebSocket，仅支持标准 ws / wss 协议</li>
          <li>• 不支持 Socket.IO / SignalR / STOMP 等上层协议</li>
          <li>• 默认预填 Postman 公开 echo 服务，可直接测试</li>
          <li>• 开启「自动重连」后断开会 3 秒后自动重试</li>
          <li>• 所有通信在浏览器本地完成，不经由中间服务器</li>
        </ul>
      </div>

      <FooterNote />
    </div>
  )
}