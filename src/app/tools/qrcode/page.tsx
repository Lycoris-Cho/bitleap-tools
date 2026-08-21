'use client'

import { useState, useCallback } from 'react'
import QRCode from 'qrcode'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

type ContentType = 'url' | 'text' | 'wifi'

export default function QrcodePage() {
  const [type, setType] = useState<ContentType>('url')
  const [text, setText] = useState('https://bitleap.app')
  const [wifiPwd, setWifiPwd] = useState('')
  const [size, setSize] = useState(256)
  const [dark, setDark] = useState('#000000')
  const [light, setLight] = useState('#FFFFFF')
  const [dataUrl, setDataUrl] = useState<string>('')
  const [loading, setLoading] = useState(false)

  /* 构建内容 */
  const buildContent = () => {
    const t = text.trim()
    if (!t) return ''
    if (type === 'wifi') {
      const pwd = wifiPwd.trim()
      return `WIFI:T:WPA;S:${t};P:${pwd};;`
    }
    return t
  }

  /* 生成二维码 */
  const generate = useCallback(async () => {
    const content = buildContent()
    if (!content) return

    setLoading(true)
    try {
      const url = await QRCode.toDataURL(content, {
        width: size,
        margin: 2,
        color: { dark, light },
      })
      setDataUrl(url)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [text, wifiPwd, type, size, dark, light])

  /* 下载 PNG */
  const downloadPNG = () => {
    if (!dataUrl) return
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = 'qrcode.png'
    a.click()
  }

  /* 下载 SVG */
  const downloadSVG = async () => {
    const content = buildContent()
    if (!content) return
    const svg = await QRCode.toString(content, {
      type: 'svg',
      width: size,
      margin: 2,
      color: { dark, light },
    })
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'qrcode.svg'
    a.click()
    URL.revokeObjectURL(url)
  }

  const reset = () => {
    setText('https://bitleap.app')
    setWifiPwd('')
    setSize(256)
    setDark('#000000')
    setLight('#FFFFFF')
    setDataUrl('')
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">二维码生成</h1>
        <p className="text-app-muted text-sm">将 URL、文本、WiFi 等信息生成二维码</p>
      </div>

      {/* 内容类型 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">内容类型</label>
        <div className="flex gap-3">
          {[
            { value: 'url', label: 'URL' },
            { value: 'text', label: '文本' },
            { value: 'wifi', label: 'WiFi' },
          ].map((t) => (
            <button
              key={t.value}
              onClick={() => setType(t.value as ContentType)}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                type === t.value
                  ? 'bg-violet-500 text-white shadow-sm shadow-violet-500/20'
                  : 'bg-app-bg border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 输入内容 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {type === 'wifi' ? 'WiFi 名称 (SSID)' : '内容'}
        </label>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            type === 'url' ? 'https://example.com' :
            type === 'wifi' ? 'MyWiFi' : '输入文本'
          }
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
      </div>

      {/* WiFi 密码 */}
      {type === 'wifi' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">WiFi 密码</label>
          <input
            value={wifiPwd}
            onChange={(e) => setWifiPwd(e.target.value)}
            placeholder="输入密码（可选）"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>
      )}

      {/* 尺寸 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          尺寸：{size}px
        </label>
        <input
          type="range"
          min={128}
          max={1024}
          step={32}
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          className="w-full accent-violet-500"
        />
      </div>

      {/* 颜色 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">前景色</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={dark}
              onChange={(e) => setDark(e.target.value)}
              className="w-12 h-12 p-0 border-0 bg-transparent cursor-pointer rounded-lg shrink-0"
            />
            <input
              value={dark}
              onChange={(e) => setDark(e.target.value)}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">背景色</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={light}
              onChange={(e) => setLight(e.target.value)}
              className="w-12 h-12 p-0 border-0 bg-transparent cursor-pointer rounded-lg shrink-0"
            />
            <input
              value={light}
              onChange={(e) => setLight(e.target.value)}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3 mb-8">
        <button
          onClick={generate}
          disabled={loading || !buildContent()}
          className="flex-1 px-6 py-3 bg-violet-500 text-white rounded-xl text-sm font-medium hover:bg-violet-600 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 shadow-sm shadow-violet-500/20"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              生成中…
            </span>
          ) : (
            '🔳 生成二维码'
          )}
        </button>
        <button
          onClick={reset}
          className="px-5 py-3 bg-orange-50 text-orange-600 border border-orange-200 rounded-xl text-sm font-medium hover:bg-orange-100 active:scale-95 transition-all"
        >
          重置
        </button>
      </div>

      {/* 预览 */}
      {dataUrl && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-6 flex justify-center">
          <img
            src={dataUrl}
            alt="QR Code"
            className="rounded-xl bg-white p-2 shadow-sm"
          />
        </div>
      )}

      {/* 下载按钮 */}
      {dataUrl && (
        <div className="flex gap-3 mb-8">
          <button
            onClick={downloadPNG}
            className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 active:scale-95 transition-all"
          >
            📥 下载 PNG
          </button>
          <button
            onClick={downloadSVG}
            className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 active:scale-95 transition-all"
          >
            📥 下载 SVG
          </button>
        </div>
      )}

      {/* 说明卡片 */}
      <div className="mt-10 p-4 bg-gray-50 border border-app-border rounded-xl">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">使用说明</h3>
        <ul className="text-xs text-app-muted space-y-1.5 leading-relaxed">
          <li>• 支持 URL、文本、WiFi 二维码生成</li>
          <li>• WiFi 模式可填写名称和密码，扫码即可连接</li>
          <li>• 可自定义尺寸（128–1024px）、前景色与背景色</li>
          <li>• 支持 PNG 与 SVG 格式下载，SVG 可无损放大</li>
          <li>• 所有操作在浏览器本地完成，不保存任何数据</li>
        </ul>
      </div>

      <FooterNote />
    </div>
  )
}