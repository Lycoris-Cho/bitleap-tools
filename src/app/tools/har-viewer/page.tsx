'use client'
import { useState } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

interface HarEntry {
  url: string
  method: string
  status: number
  mimeType: string
  size: number
  time: number
  requestHeaders: Record<string, string>
  responseHeaders: Record<string, string>
  requestBody?: string
  responseBody?: string
}

export default function HarViewerPage() {
  const [entries, setEntries] = useState<HarEntry[]>([])
  const [rawText, setRawText] = useState('')
  const [error, setError] = useState('')
  const [filterUrl, setFilterUrl] = useState('')
  const [selected, setSelected] = useState<HarEntry | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('')
    setSelected(null)
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      setRawText(text)
      const json = JSON.parse(text)
      const list: HarEntry[] = json.log.entries.map((item: any) => ({
        url: item.request.url,
        method: item.request.method,
        status: item.response.status,
        mimeType: item.response.content?.mimeType || '',
        size: item.response.content?.size || 0,
        time: item.response.content?.size ? item.time : 0,
        requestHeaders: Object.fromEntries(item.request.headers.map((h: any) => [h.name, h.value])),
        responseHeaders: Object.fromEntries(item.response.headers.map((h: any) => [h.name, h.value])),
        requestBody: item.request.postData?.text,
        responseBody: item.response.content?.text,
      }))
      setEntries(list)
    } catch (err: any) {
      setError(`解析失败：${err.message}`)
    }
  }

  const filtered = entries.filter(e =>
    e.url.toLowerCase().includes(filterUrl.toLowerCase())
  )

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  }

  const formatTime = (ms: number) => {
    if (ms === 0) return '-'
    if (ms < 1000) return `${Math.round(ms)} ms`
    return `${(ms / 1000).toFixed(2)} s`
  }

  const statusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-emerald-600 bg-emerald-50'
    if (status >= 300 && status < 400) return 'text-amber-600 bg-amber-50'
    if (status >= 400) return 'text-red-600 bg-red-50'
    return 'text-gray-600 bg-gray-50'
  }

  const methodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'text-emerald-600 bg-emerald-50'
      case 'POST': return 'text-violet-600 bg-violet-50'
      case 'PUT': return 'text-amber-600 bg-amber-50'
      case 'DELETE': return 'text-red-600 bg-red-50'
      case 'PATCH': return 'text-orange-600 bg-orange-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />

      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-gray-900">HAR 抓包解析器</h1>
        <p className="text-sm text-gray-500">上传浏览器 HAR 文件，查看请求详情、响应头、响应体、耗时与大小</p>
      </div>

      {/* 操作栏 */}
      <div className="mb-6 flex flex-wrap gap-3 items-center">
        <label className="cursor-pointer">
          <span className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-600 active:scale-95">
            📂 选择 HAR 文件
          </span>
          <input type="file" accept=".har" onChange={handleFileChange} className="hidden" />
        </label>

        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            placeholder="过滤 URL 关键词…"
            value={filterUrl}
            onChange={e => setFilterUrl(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>

        {entries.length > 0 && (
          <span className="text-xs text-gray-400">
            共 {filtered.length} / {entries.length} 条请求
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          ❌ {error}
        </div>
      )}

      {/* 表格 */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Method</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">URL</th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">耗时</th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">大小</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-16 text-center text-gray-400">
                    <div className="text-4xl mb-2">📭</div>
                    {entries.length === 0 ? '上传 HAR 文件后展示请求列表' : '没有匹配的请求'}
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => (
                  <tr
                    key={idx}
                    onClick={() => setSelected(item)}
                    className="cursor-pointer transition hover:bg-violet-50/50"
                  >
                    <td className="px-3 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${methodColor(item.method)}`}>
                        {item.method}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 max-w-xl truncate font-mono text-xs text-gray-700" title={item.url}>
                      {item.url}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs text-gray-500">
                      {formatTime(item.time)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs text-gray-500">
                      {formatSize(item.size)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 详情抽屉 */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center" onClick={() => setSelected(null)}>
          <div
            className="max-h-[85vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${methodColor(selected.method)}`}>
                    {selected.method}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor(selected.status)}`}>
                    {selected.status}
                  </span>
                  <span className="text-xs text-gray-400">{formatTime(selected.time)} · {formatSize(selected.size)}</span>
                </div>
                <p className="break-all font-mono text-xs text-gray-600">{selected.url}</p>
              </div>
              <button onClick={() => setSelected(null)} className="ml-4 shrink-0 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* 请求头 */}
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">请求头</h3>
                <div className="rounded-xl bg-gray-900 p-4 font-mono text-xs text-emerald-300 overflow-auto max-h-40">
                  {Object.entries(selected.requestHeaders).map(([k, v]) => (
                    <div key={k}><span className="text-violet-400">{k}</span>: {v}</div>
                  ))}
                </div>
              </section>

              {/* 响应头 */}
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">响应头</h3>
                <div className="rounded-xl bg-gray-900 p-4 font-mono text-xs text-emerald-300 overflow-auto max-h-40">
                  {Object.entries(selected.responseHeaders).map(([k, v]) => (
                    <div key={k}><span className="text-violet-400">{k}</span>: {v}</div>
                  ))}
                </div>
              </section>

              {/* 请求体 */}
              {selected.requestBody && (
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">请求体</h3>
                  <pre className="rounded-xl bg-gray-900 p-4 font-mono text-xs text-emerald-300 overflow-auto max-h-60 whitespace-pre-wrap">
                    {selected.requestBody}
                  </pre>
                </section>
              )}

              {/* 响应体 */}
              {selected.responseBody && (
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">响应体</h3>
                  <pre className="rounded-xl bg-gray-900 p-4 font-mono text-xs text-emerald-300 overflow-auto max-h-60 whitespace-pre-wrap">
                    {selected.responseBody}
                  </pre>
                </section>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-10 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">使用说明</h3>
        <ul className="space-y-1.5 text-xs leading-relaxed text-gray-500">
          <li>• 在 Chrome DevTools → Network 面板右键可导出 HAR 文件</li>
          <li>• 点击表格行可查看请求/响应头、请求体、响应体详情</li>
          <li>• 支持按 URL 关键词过滤，大小自动格式化为 KB/MB</li>
          <li>• 所有解析在浏览器本地完成，文件不会上传到任何服务器</li>
        </ul>
      </div>

      <FooterNote />
    </div>
  )
}