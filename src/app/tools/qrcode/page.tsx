'use client'

import { useState, useCallback } from 'react'
import QRCode from 'qrcode'
import { Breadcrumb } from '@/components/breadcrumb'
type ContentType = 'url' | 'text' | 'wifi'

export default function QrcodePage() {
  const [type, setType] = useState<ContentType>('url')
  const [text, setText] = useState('https://bitleap.app')
  const [size, setSize] = useState(256)
  const [dark, setDark] = useState('#000000')
  const [light, setLight] = useState('#FFFFFF')
  const [dataUrl, setDataUrl] = useState<string>('')

  /* 生成二维码 */
  const generate = useCallback(async () => {
    let content = text.trim()

    if (!content) return

    // WiFi 格式处理
    if (type === 'wifi') {
      content = `WIFI:T:WPA;S:${content};;`
    }

    try {
      const url = await QRCode.toDataURL(content, {
        width: size,
        margin: 2,
        color: {
          dark,
          light,
        },
      })
      setDataUrl(url)
    } catch (err) {
      console.error(err)
    }
  }, [type, text, size, dark, light])

  /* 下载 PNG */
  function downloadPNG() {
    if (!dataUrl) return
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = 'qrcode.png'
    a.click()
  }

  /* 下载 SVG */
  async function downloadSVG() {
    let content = text.trim()
    if (type === 'wifi') {
      content = `WIFI:T:WPA;S:${content};;`
    }

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

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      {/* 标题 */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          二维码生成
        </h1>
        <p className="text-app-muted">
          将 URL、文本、WiFi 等信息生成二维码
        </p>
      </div>

      {/* 内容类型 */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">内容类型</label>
        <div className="flex gap-4">
          {[
            { value: 'url', label: 'URL' },
            { value: 'text', label: '文本' },
            { value: 'wifi', label: 'WiFi' },
          ].map((t) => (
            <button
              key={t.value}
              onClick={() => setType(t.value as ContentType)}
              className={`px-5 py-3 rounded-xl border text-sm font-medium transition ${
                type === t.value
                  ? 'bg-black text-white border-black'
                  : 'bg-app-bg text-gray-800 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 输入内容 */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          {type === 'wifi' ? 'WiFi 名称' : '内容'}
        </label>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            type === 'url'
              ? 'https://example.com'
              : type === 'wifi'
              ? 'WiFi 名称'
              : '输入文本'
          }
          className="w-full px-4 py-3 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
        />
      </div>

      {/* 尺寸 */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          尺寸：{size}px
        </label>
        <input
          type="range"
          min={128}
          max={1024}
          step={32}
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          className="w-full"
        />
      </div>

      {/* 颜色 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <div>
          <label className="block text-sm font-medium mb-2">前景色</label>
          <div className="flex items-center gap-4">
            <input
              type="color"
              value={dark}
              onChange={(e) => setDark(e.target.value)}
              className="w-14 h-14 p-0 border-0 bg-transparent cursor-pointer"
            />
            <input
              value={dark}
              onChange={(e) => setDark(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-mono text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">背景色</label>
          <div className="flex items-center gap-4">
            <input
              type="color"
              value={light}
              onChange={(e) => setLight(e.target.value)}
              className="w-14 h-14 p-0 border-0 bg-transparent cursor-pointer"
            />
            <input
              value={light}
              onChange={(e) => setLight(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-mono text-sm"
            />
          </div>
        </div>
      </div>

      {/* 生成按钮 */}
      <button
        onClick={generate}
        className="w-full px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition font-medium mb-8"
      >
        生成二维码
      </button>

      {/* 预览 */}
      {dataUrl && (
        <div className="mb-8 flex justify-center">
          <img
            src={dataUrl}
            alt="QR Code"
            className="rounded-2xl border border-app-border"
          />
        </div>
      )}

      {/* 下载按钮 */}
      {dataUrl && (
        <div className="flex gap-4">
          <button
            onClick={downloadPNG}
            className="flex-1 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition font-medium"
          >
            下载 PNG
          </button>
          <button
            onClick={downloadSVG}
            className="flex-1 px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition font-medium"
          >
            下载 SVG
          </button>
        </div>
      )}

      {/* SEO 文案 */}
      <section className="mt-16 pt-10 border-t border-app-border">
        <h2 className="text-lg font-semibold mb-3">使用说明</h2>
        <ul className="text-sm text-app-muted space-y-2 leading-relaxed">
          <li>• 支持 URL、文本、WiFi 二维码生成</li>
          <li>• 可自定义尺寸、前景色与背景色</li>
          <li>• 支持 PNG 与 SVG 格式下载</li>
          <li>• 所有操作在浏览器本地完成，不保存任何数据</li>
        </ul>
      </section>
    </div>
  )
}