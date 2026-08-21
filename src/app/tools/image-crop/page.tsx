'use client'
import { useState, useRef, useEffect } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

export default function ImageCrop() {
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [originalSize, setOriginalSize] = useState({ w: 0, h: 0 })
  const [width, setWidth] = useState(400)
  const [height, setHeight] = useState(300)
  const [lockRatio, setLockRatio] = useState(true)

  const fileRef = useRef<HTMLInputElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const src = ev.target?.result as string
      setImgSrc(src)
      // 获取原图尺寸
      const img = new Image()
      img.onload = () => {
        setOriginalSize({ w: img.width, h: img.height })
        setWidth(img.width)
        setHeight(img.height)
      }
      img.src = src
    }
    reader.readAsDataURL(f)
  }

  // 实时绘制预览画布
  useEffect(() => {
    if (!imgSrc || !previewCanvasRef.current) return
    const canvas = previewCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.onload = () => {
      canvas.width = width
      canvas.height = height
      // 居中裁切模式（模拟裁剪：按目标尺寸居中，超出部分裁掉）
      const scale = Math.max(width / img.width, height / img.height)
      const drawW = img.width * scale
      const drawH = img.height * scale
      const offsetX = (width - drawW) / 2
      const offsetY = (height - drawH) / 2

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, offsetX, offsetY, drawW, drawH)
    }
    img.src = imgSrc
  }, [imgSrc, width, height])

  // 锁定宽高比：改宽度自动更新高度
  const handleWidthChange = (val: number) => {
    if (!lockRatio || originalSize.w === 0) {
      setWidth(val)
      return
    }
    const ratio = originalSize.h / originalSize.w
    setWidth(val)
    setHeight(Math.round(val * ratio))
  }

  const handleHeightChange = (val: number) => {
    if (!lockRatio || originalSize.h === 0) {
      setHeight(val)
      return
    }
    const ratio = originalSize.w / originalSize.h
    setHeight(val)
    setWidth(Math.round(val * ratio))
  }

  const download = () => {
    if (!previewCanvasRef.current) return
    const a = document.createElement('a')
    a.href = previewCanvasRef.current.toDataURL('image/png')
    a.download = 'crop.png'
    a.click()
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Breadcrumb />
      <h1 className="text-2xl font-bold text-app-text mb-1">图片裁剪缩放</h1>
      <p className="text-app-muted text-sm mb-6">浏览器本地处理，居中裁剪、缩放，实时预览导出PNG</p>
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      <button onClick={() => fileRef.current?.click()} className="px-4 py-2 bg-violet-500 text-white rounded-xl text-sm">选择图片</button>

      {imgSrc && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="lockRatio"
                checked={lockRatio}
                onChange={(e) => setLockRatio(e.target.checked)}
              />
              <label htmlFor="lockRatio" className="text-sm text-app-text">锁定原始宽高比</label>
            </div>

            <label className="text-sm text-app-text block mb-1">宽度(px)</label>
            <input
              type="number"
              value={width}
              onChange={(e) => handleWidthChange(Number(e.target.value))}
              className="w-full p-2 rounded-xl border border-app-border bg-app-bg text-app-text"
            />

            <label className="text-sm text-app-text block mt-2 mb-1">高度(px)</label>
            <input
              type="number"
              value={height}
              onChange={(e) => handleHeightChange(Number(e.target.value))}
              className="w-full p-2 rounded-xl border border-app-border bg-app-bg text-app-text"
            />

            <div className="text-xs text-app-muted">
              原图尺寸：{originalSize.w} × {originalSize.h} px
            </div>

            <button onClick={download} className="mt-4 px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm">下载图片</button>
          </div>

          <div className="flex justify-center overflow-auto rounded-xl border border-app-border p-3 bg-app-bg">
            <canvas ref={previewCanvasRef} style={{ maxWidth: '100%' }} />
          </div>
        </div>
      )}
      <FooterNote />
    </div>
  )
}
