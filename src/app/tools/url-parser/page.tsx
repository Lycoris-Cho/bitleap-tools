'use client'

import { useState } from 'react'
import { statusCodes, suspiciousParams } from './data'
import { Breadcrumb } from '@/components/breadcrumb'
export default function UrlParser() {
  const [activeTab, setActiveTab] = useState('parse')
  const [statusFilter, setStatusFilter] = useState('全部')
  const [input, setInput] = useState('')
  const [parsed, setParsed] = useState<{
    protocol: string
    host: string
    path: string
    hash: string
    params: { key: string; value: string; decoded: string; warning?: string }[]
  } | null>(null)
  const [decodeInput, setDecodeInput] = useState('')
  const [decodeResult, setDecodeResult] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1200)
  }

  const parseUrl = () => {
    if (!input.trim()) return
    try {
      const url = new URL(input.includes('://') ? input : `https://${input}`)
      const params: { key: string; value: string; decoded: string; warning?: string }[] = []
      url.searchParams.forEach((value, key) => {
        let decoded = ''
        try { decoded = decodeURIComponent(value.replace(/\+/g, '%20')) } catch { decoded = value }
        params.push({
          key,
          value,
          decoded,
          warning: suspiciousParams[key.toLowerCase()],
        })
      })
      setParsed({
        protocol: url.protocol.replace(':', ''),
        host: url.host,
        path: url.pathname,
        hash: url.hash,
        params,
      })
    } catch {
      setParsed(null)
    }
  }

  const doDecode = () => {
    try {
      setDecodeResult(decodeURIComponent(decodeInput.replace(/\+/g, '%20')))
    } catch {
      setDecodeResult('解码失败')
    }
  }

  const doEncode = () => {
    setDecodeResult(encodeURIComponent(decodeInput))
  }

  const exportJson = () => {
    if (!parsed) return
    const obj: Record<string, string> = {}
    parsed.params.forEach(p => { obj[p.key] = p.decoded })
    copy(JSON.stringify(obj, null, 2), 'json')
  }

  const exportCurl = () => {
    if (!parsed) return
    const url = `${parsed.protocol}://${parsed.host}${parsed.path}`
    const query = parsed.params.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&')
    copy(`curl '${url}?${query}'`, 'curl')
  }

  const exportFetch = () => {
    if (!parsed) return
    const url = `${parsed.protocol}://${parsed.host}${parsed.path}`
    const body = Object.fromEntries(parsed.params.map(p => [p.key, p.decoded]))
    copy(`fetch('${url}', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify(${JSON.stringify(body, null, 2)})\n})`, 'fetch')
  }

  return (
    <div className="flex w-full h-[calc(100vh-4rem)] overflow-hidden bg-gray-50/50">
      {/* 左侧导航 */}
      <div className="w-48 shrink-0 h-full overflow-y-auto border-r border-app-border/60 bg-app-bg/80 backdrop-blur-xl p-3 space-y-1">
        <div className="px-3 py-2 mb-2">
          <h2 className="text-xs font-bold text-app-muted uppercase tracking-wider">功能</h2>
        </div>
        {[
          { id: 'parse', label: 'URL 参数解析' },
          { id: 'decode', label: '编解码工具' },
          { id: 'status', label: '状态码速查' },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === item.id
                ? 'bg-gray-900 text-white shadow-md'
                : 'text-app-muted hover:bg-gray-100'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 右侧内容 */}
      <div className="flex-1 h-full overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
        <Breadcrumb />
          {/* 标题 */}
          <div className="mb-6">
            <h1 className="text-2xl font-black text-app-text mb-1">
              {activeTab === 'parse' && 'URL 拆解台'}
              {activeTab === 'decode' && '编解码工具'}
              {activeTab === 'status' && 'HTTP 状态码速查'}
            </h1>
            <p className="text-sm text-gray-500">
              {activeTab === 'parse' && '解析 URL 查询参数，识别安全风险，一键导出'}
              {activeTab === 'decode' && 'URL Encode / Decode 快速转换'}
              {activeTab === 'status' && '常见 HTTP 状态码含义、触发场景一览'}
            </p>
          </div>

          {/* URL 解析 */}
          {activeTab === 'parse' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="粘贴完整 URL，如 https://api.x.com/login?user=admin%27..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && parseUrl()}
                  className="flex-1 px-4 py-3 text-sm border border-app-border rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                <button onClick={parseUrl} className="px-5 py-3 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition">解析</button>
              </div>

              {parsed && (
                <>
                  {/* URL 概览 */}
                  <div className="bg-app-bg/80 backdrop-blur-xl border border-app-border/60 rounded-2xl p-5">
                    <h3 className="text-xs font-bold text-app-muted uppercase tracking-wider mb-3">URL 概览</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-app-muted">协议</span> <span className="font-mono text-app-text">{parsed.protocol}</span></div>
                      <div><span className="text-app-muted">域名</span> <span className="font-mono text-app-text">{parsed.host}</span></div>
                      <div className="col-span-2"><span className="text-app-muted">路径</span> <span className="font-mono text-app-text">{parsed.path}</span></div>
                      {parsed.hash && <div className="col-span-2"><span className="text-app-muted">Hash</span> <span className="font-mono text-app-text">{parsed.hash}</span></div>}
                    </div>
                  </div>

                  {/* 参数列表 */}
                  <div className="bg-app-bg/80 backdrop-blur-xl border border-app-border/60 rounded-2xl overflow-hidden">
                    <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                      <h3 className="text-xs font-bold text-app-muted uppercase tracking-wider">查询参数（已解码）</h3>
                    </div>
                    {parsed.params.length === 0 ? (
                      <p className="px-5 py-8 text-center text-sm text-app-muted">无查询参数</p>
                    ) : (
                      parsed.params.map((p, i) => (
                        <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 last:border-0">
                          <code className="w-28 shrink-0 text-xs font-mono text-indigo-600 truncate">{p.key}</code>
                          <code className="flex-1 text-sm font-mono text-gray-800 truncate">{p.decoded || '(空)'}</code>
                          {p.warning && (
                            <span className="shrink-0 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">⚠ {p.warning}</span>
                          )}
                          <button onClick={() => copy(p.decoded, `param-${i}`)} className="shrink-0 px-3 py-1.5 text-xs bg-gray-900 text-white rounded-lg hover:bg-gray-800 active:scale-95 transition-all">
                            {copied === `param-${i}` ? '✓' : '复制'}
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* 导出 */}
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={exportJson} className="px-4 py-2 text-xs bg-app-bg border border-app-border rounded-lg hover:bg-gray-50 transition">
                      {copied === 'json' ? '✓ 已复制' : '📋 导出 JSON'}
                    </button>
                    <button onClick={exportCurl} className="px-4 py-2 text-xs bg-app-bg border border-app-border rounded-lg hover:bg-gray-50 transition">
                      {copied === 'curl' ? '✓ 已复制' : '📋 导出 cURL'}
                    </button>
                    <button onClick={exportFetch} className="px-4 py-2 text-xs bg-app-bg border border-app-border rounded-lg hover:bg-gray-50 transition">
                      {copied === 'fetch' ? '✓ 已复制' : '📋 导出 Fetch'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* 编解码 */}
          {activeTab === 'decode' && (
            <div className="space-y-4">
              <textarea
                placeholder="输入要编码/解码的内容..."
                value={decodeInput}
                onChange={e => setDecodeInput(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 text-sm border border-app-border rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
              />
              <div className="flex gap-2">
                <button onClick={doDecode} className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition">URL Decode</button>
                <button onClick={doEncode} className="px-5 py-2.5 bg-app-bg text-app-text border border-app-border text-sm font-medium rounded-xl hover:bg-gray-50 transition">URL Encode</button>
              </div>
              {decodeResult && (
                <div className="bg-app-bg/80 backdrop-blur-xl border border-app-border/60 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-app-muted uppercase tracking-wider">结果</span>
                    <button onClick={() => copy(decodeResult, 'decode')} className="text-xs text-gray-500 hover:text-app-text transition">
                      {copied === 'decode' ? '✓ 已复制' : '复制'}
                    </button>
                  </div>
                  <code className="text-sm font-mono text-gray-800 break-all">{decodeResult}</code>
                </div>
              )}
            </div>
          )}

          {/* 状态码速查 - 卡片网格 */}
          {activeTab === 'status' && (
            <div className="space-y-4">
              {/* 分类筛选 */}
              <div className="flex gap-2 flex-wrap">
                {['全部', '成功', '重定向', '客户端错误', '服务端错误'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setStatusFilter(cat)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                      statusFilter === cat
                        ? 'bg-gray-900 text-white'
                        : 'bg-app-bg text-app-muted border border-app-border hover:bg-gray-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* 卡片网格 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {statusCodes
                  .filter(s => statusFilter === '全部' || s.category === statusFilter)
                  .map(s => (
                  <div key={s.code} className="bg-app-bg/80 backdrop-blur-xl border border-app-border/60 rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`shrink-0 w-12 text-center text-sm font-bold rounded-lg py-1 ${
                        s.category === '成功' ? 'bg-green-100 text-green-700' :
                        s.category === '重定向' ? 'bg-blue-100 text-blue-700' :
                        s.category === '客户端错误' ? 'bg-amber-100 text-amber-700' :
                        s.category === '服务端错误' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {s.code}
                      </span>
                      <span className="text-sm font-bold text-app-text truncate">{s.name}</span>
                      <span className="ml-auto text-xs text-app-muted shrink-0">{s.category}</span>
                    </div>
                    <p className="text-xs text-app-muted leading-relaxed">{s.description}</p>
                    <p className="text-xs text-app-muted mt-1">常见：{s.commonCause}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 底部 */}
          <p className="text-center text-xs text-app-muted mt-10">
            BitLeap · 本地计算 · 隐私优先
          </p>
        </div>
      </div>
    </div>
  )
}