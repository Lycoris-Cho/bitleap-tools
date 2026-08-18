'use client'
import { useState, useRef } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
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
    <div className="max-w-5xl mx-auto py-12 px-4">
      <Breadcrumb />
      <h1 className="text-2xl font-bold mb-2">图片格式转换</h1>
      <p className="text-gray-500 mb-6">本地互转JPG PNG WebP AVIF，不经过服务器</p>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-black file:text-white hover:file:bg-gray-800"
          />

          <div>
            <label className="block mb-1.5 font-medium">输出格式</label>
            <select
              value={format}
              onChange={e => setFormat(e.target.value as OutputFormat)}
              className="w-full border border-gray-300 rounded-xl p-3 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-black/20"
            >
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
              <option value="webp">WebP</option>
              <option value="avif">AVIF</option>
            </select>
          </div>

          <div>
            <label className="block mb-1.5 font-medium">质量 {quality}</label>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={quality}
              onChange={e => setQuality(Number(e.target.value))}
              className="w-full h-2 rounded-lg accent-black"
            />
          </div>

          <button
            onClick={convert}
            disabled={!src}
            className="px-4 py-2 bg-black text-white rounded-lg transition-all duration-200 hover:bg-gray-800 disabled:opacity-40"
          >
            转换并下载
          </button>
        </div>

        <div>
          <div className="font-medium mb-2">原图预览</div>
          <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 p-4 min-h-64 flex items-center justify-center">
            {src ? <img src={src} alt="preview" className="max-w-full max-h-80 object-contain" /> : <span className="text-gray‑400">上传图片</span>}
          </div>
          <canvas ref={canvasRef} className="hidden"></canvas>
        </div>
      </div>
    </div>
  )
}
