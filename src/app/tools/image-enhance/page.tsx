'use client'
import { useState, useRef, useEffect } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

export default function ImageEnhance() {
  const [src, setSrc] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const [sharp, setSharp] = useState(1.6)
  const [contrast, setContrast] = useState(1.12)
  const [brightness, setBrightness] = useState(1.0)

  const fileRef = useRef<HTMLInputElement>(null)
  const originCanvasRef = useRef<HTMLCanvasElement>(null)
  const outputCanvasRef = useRef<HTMLCanvasElement>(null)

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setSrc(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  // 渲染原图画布
  useEffect(() => {
    if (!src || !originCanvasRef.current) return
    const canvas = originCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const img = new Image()
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
    }
    img.src = src
  }, [src])

  const runEnhance = () => {
    if (!src || !outputCanvasRef.current || !originCanvasRef.current) return
    const originCanvas = originCanvasRef.current
    const outputCanvas = outputCanvasRef.current
    const ctxOut = outputCanvas.getContext('2d')
    if (!ctxOut) return

    const img = new Image()
    img.onload = () => {
      const newW = Math.round(img.width * scale)
      const newH = Math.round(img.height * scale)
      outputCanvas.width = newW
      outputCanvas.height = newH

      // 双三次插值放大
      ctxOut.imageSmoothingEnabled = true
      ctxOut.imageSmoothingQuality = 'high'
      ctxOut.drawImage(img, 0, 0, newW, newH)

      const imageData = ctxOut.getImageData(0, 0, newW, newH)
      const data = imageData.data
      const outData = ctxOut.createImageData(newW, newH).data
      const w = newW
      const h = newH

      // USM锐化算法
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = (y * w + x) * 4
          const i00 = ((y - 1) * w + (x - 1)) * 4
          const i01 = ((y - 1) * w + x) * 4
          const i02 = ((y - 1) * w + (x + 1)) * 4
          const i10 = (y * w + (x - 1)) * 4
          const i12 = (y * w + (x + 1)) * 4
          const i20 = ((y + 1) * w + (x - 1)) * 4
          const i21 = ((y + 1) * w + x) * 4
          const i22 = ((y + 1) * w + (x + 1)) * 4

          for (let c = 0; c < 3; c++) {
            const center = data[i + c]
            const surround = (
              data[i00 + c] + data[i01 + c] + data[i02 + c] +
              data[i10 + c] + data[i12 + c] +
              data[i20 + c] + data[i21 + c] + data[i22 + c]
            ) / 8
            let val = center + sharp * (center - surround)
            val = ((val - 128) * contrast + 128) * brightness
            outData[i + c] = Math.max(0, Math.min(255, val))
          }
          outData[i + 3] = data[i + 3]
        }
      }
      ctxOut.putImageData(new ImageData(outData, newW, newH), 0, 0)
    }
    img.src = src
  }

  const download = () => {
    if (!outputCanvasRef.current) return
    const a = document.createElement('a')
    a.href = outputCanvasRef.current.toDataURL('image/png')
    a.download = 'enhanced.png'
    a.click()
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumb />
      <h1 className="text-2xl font-bold text-app-text mb-1">图片高清增强</h1>
      <p className="text-app-muted text-sm mb-6">浏览器本地处理，放大+锐化增强，图片不上传服务器</p>

      <input ref={fileRef} type="file" accept="image/*" onChange={handleSelectFile} className="hidden" />
      <button onClick={() => fileRef.current?.click()} className="px-4 py-2 bg-violet-500 text-white rounded-xl text-sm">选择图片</button>

      {src && (
        <>
          <div className="mt-4 space-y-3 max-w-md">
            <div>
              <label className="text-sm text-app-text">放大倍数 {scale}x</label>
              <select value={scale} onChange={e => setScale(Number(e.target.value))} className="ml-2 px-2 py-1 rounded-xl border border-app-border bg-app-bg text-app-text">
                <option value={1}>1x (仅锐化)</option>
                <option value={2}>2x</option>
                <option value={3}>3x</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-app-text">锐化强度 {sharp.toFixed(2)}</label>
              <input type="range" min="0" max="4" step="0.1" value={sharp} onChange={e => setSharp(Number(e.target.value))} className="w-full" />
            </div>
            <div>
              <label className="text-sm text-app-text">对比度 {contrast.toFixed(2)}</label>
              <input type="range" min="0.5" max="2" step="0.05" value={contrast} onChange={e => setContrast(Number(e.target.value))} className="w-full" />
            </div>
            <div>
              <label className="text-sm text-app-text">亮度 {brightness.toFixed(2)}</label>
              <input type="range" min="0.5" max="1.8" step="0.05" value={brightness} onChange={e => setBrightness(Number(e.target.value))} className="w-full" />
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button onClick={runEnhance} className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm">执行增强</button>
            <button onClick={download} className="px-4 py-2 bg-violet-500 text-white rounded-xl text-sm">下载结果PNG</button>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-app-border p-3 bg-app-bg">
              <h3 className="text-sm font-medium text-app-text mb-2">原图</h3>
              <canvas ref={originCanvasRef} style={{ maxWidth: '100%' }} />
            </div>
            <div className="rounded-xl border border-app-border p-3 bg-app-bg">
              <h3 className="text-sm font-medium text-app-text mb-2">增强结果</h3>
              <canvas ref={outputCanvasRef} style={{ maxWidth: '100%' }} />
            </div>
          </div>
        </>
      )}
       <FooterNote />
    </div>
  )
}
