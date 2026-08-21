'use client'
import { useState, useRef } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

type OutputFormat = 'jpeg' | 'png' | 'webp' | 'avif'

export default function ImageConvertPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [src, setSrc] = useState('')
  const [format, setFormat] = useState<OutputFormat>('webp')
  const [quality, setQuality] = useState(0.8)

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setSrc(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const convert = () => {
    if (!canvasRef.current || !src) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.src = src
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      let mimeType = 'image/webp'
      let suffix = 'webp'
      if (format === 'jpeg') { mimeType = 'image/jpeg'; suffix = 'jpg' }
      if (format === 'png') { mimeType = 'image/png'; suffix = 'png' }
      if (format === 'avif') { mimeType = 'image/avif'; suffix = 'avif' }

      const dataUrl = canvas.toDataURL(mimeType, quality)
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `output.${suffix}`
      a.click()
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">图片格式转换</h1>
        <p className="text-app-muted text-sm">本地互转 JPG / PNG / WebP / AVIF，不经过服务器</p>
      </div>

      <div className="grid md:grid-cols-2 gap-10">
        {/* 左：控制区 */}
        <div className="space-y-5">
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-violet-500 file:text-white hover:file:bg-violet-600 file:transition-all file:cursor-pointer text-sm text-gray-600"
          />

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">输出格式</label>
            <div className="relative">
              <select
                value={format}
                onChange={e => setFormat(e.target.value as OutputFormat)}
                className="w-full appearance-none bg-app-bg border border-gray-300 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 hover:bg-gray-50 cursor-pointer"
              >
                <option value="jpeg">JPEG</option>
                <option value="png">PNG</option>
                <option value="webp">WebP</option>
                <option value="avif">AVIF</option>
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">▼</div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-gray-700">质量</span>
              <span className="font-mono text-violet-600 font-semibold">{quality}</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={quality}
              onChange={e => setQuality(Number(e.target.value))}
              className="w-full accent-violet-500"
            />
          </div>

          <button
            onClick={convert}
            disabled={!src}
            className="px-5 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            转换并下载
          </button>
        </div>

        {/* 右：预览 */}
        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">原图预览</div>
          <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 p-4 min-h-64 flex items-center justify-center">
            {src ? (
              <img src={src} alt="preview" className="max-w-full max-h-80 object-contain" />
            ) : (
              <span className="text-app-muted text-sm">上传图片</span>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </div>

      {/* 说明卡片 */}
      <div className="mt-10 p-4 bg-gray-50 border border-app-border rounded-xl">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">使用说明</h3>
        <ul className="text-xs text-app-muted space-y-1.5 leading-relaxed">
          <li>• 所有转换在浏览器本地完成，图片不会上传到任何服务器</li>
          <li>• 支持 JPG / PNG / WebP / AVIF 互转，输出质量可调（0.1–1.0）</li>
          <li>• AVIF 输出依赖浏览器原生支持，部分旧版浏览器可能无法导出</li>
          <li>• 点击「转换并下载」即可获取转换后的图片文件</li>
        </ul>
      </div>

      <FooterNote />
    </div>
  )
}