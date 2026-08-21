'use client'
import { useState, useMemo } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

function safeParseJwt(token: string) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const decode = (s: string) =>
      JSON.parse(atob(s.replace(/-/g, '+').replace(/_/g, '/')))
    const header = decode(parts[0])
    const payload = decode(parts[1])
    return { header, payload, signature: parts[2] }
  } catch {
    return null
  }
}

/* 将 JWT 时间戳转为可读时间 */
function formatTime(ts?: number): string {
  if (!ts) return ''
  return new Date(ts * 1000).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export default function JwtParser() {
  const [token, setToken] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const result = useMemo(() => safeParseJwt(token.trim()), [token])

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  const clearAll = () => {
    setToken('')
    setCopied(null)
  }

  const payload = result?.payload
  const exp = payload?.exp
  const iat = payload?.iat
  const isExpired = exp ? Date.now() / 1000 > exp : false

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">JWT 解析器</h1>
        <p className="text-app-muted text-sm">解析 Header、Payload，注意：不能校验签名合法性</p>
      </div>

      {/* 输入区 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">粘贴 JWT Token</label>
          {token && (
            <button
              onClick={clearAll}
              className="px-3 py-1.5 bg-orange-50 text-orange-600 border border-orange-200 text-xs font-medium rounded-lg hover:bg-orange-100 active:scale-95 transition-all"
            >
              清空
            </button>
          )}
        </div>
        <textarea
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="w-full h-32 px-4 py-3 rounded-xl border border-gray-300 bg-app-bg text-gray-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
        />
      </div>

      {/* 错误提示 */}
      {!result && token.trim() && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-mono">
          ❌ JWT 格式错误，请检查输入（需要 3 段 base64url 格式）
        </div>
      )}

      {/* 过期状态提示 */}
      {result && exp && (
        <div className={`mb-4 p-4 rounded-xl border text-sm font-medium ${
          isExpired
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          {isExpired ? '⚠️ Token 已过期' : '✅ Token 未过期'}
          {iat && <span className="font-normal ml-2">签发于 {formatTime(iat)}</span>}
          <span className="font-normal ml-2">· 过期于 {formatTime(exp)}</span>
        </div>
      )}

      {/* 解析结果 */}
      {result && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[
            { label: 'Header', data: result.header, key: 'header' },
            { label: 'Payload', data: result.payload, key: 'payload' },
          ].map(({ label, data, key }) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
                <button
                  onClick={() => copy(JSON.stringify(data, null, 2), key)}
                  className="px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 active:scale-95 transition-all"
                >
                  {copied === key ? '✓ 已复制' : '📋 复制'}
                </button>
              </div>
              <pre className="p-4 rounded-xl border border-app-border bg-gray-900 text-emerald-300 text-sm overflow-auto max-h-96">
{JSON.stringify(data, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}

      {/* 说明卡片 */}
      <div className="mt-10 p-4 bg-gray-50 border border-app-border rounded-xl">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">使用说明</h3>
        <ul className="text-xs text-app-muted space-y-1.5 leading-relaxed">
          <li>• 纯前端解析，Token 不会发送到任何服务器</li>
          <li>• 仅解码 Header 和 Payload，<strong>不校验签名</strong>，不可用于鉴权验证</li>
          <li>• 自动识别 exp / iat 字段并转换为可读时间</li>
          <li>• 支持标准 JWT（3 段 base64url 格式）</li>
        </ul>
      </div>

      <FooterNote />
    </div>
  )
}