'use client'
import { useState, useRef, useEffect } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
type WatermarkPos = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
type FontFamily = 'sans-serif' | 'serif' | 'monospace' | 'Arial' | 'Microsoft YaHei' | 'SimHei'

export default function ImageWatermarkPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [imgSrc, setImgSrc] = useState('')
  const [text, setText] = useState('水印文字')
  const [fontSize, setFontSize] = useState(24)
  const [opacity, setOpacity] = useState(0.4)
  const [position, setPosition] = useState<WatermarkPos>('bottom-right')
  const [fontFamily, setFontFamily] = useState<FontFamily>('sans-serif')
  const [color, setColor] = useState('#000000')
  const [rotate, setRotate] = useState(-20)
  const [tileMode, setTileMode] = useState(false)

  const renderCanvas = () => {
    if (!canvasRef.current || !imgSrc) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.src = imgSrc
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      ctx.globalAlpha = opacity
      ctx.font = `${fontSize}px ${fontFamily}`
      ctx.fillStyle = color

      if (tileMode) {
        const stepX = fontSize * 6
        const stepY = fontSize * 4
        ctx.save()
        for (let y = -canvas.height; y < canvas.height * 2; y += stepY) {
          for (let x = -canvas.width; x < canvas.width * 2; x += stepX) {
            ctx.save()
            ctx.translate(x, y)
            ctx.rotate((rotate * Math.PI) / 180)
            ctx.fillText(text, 0, 0)
            ctx.restore()
          }
        }
        ctx.restore()
      } else {
        const margin = 24
        const textWidth = ctx.measureText(text).width
        let x = 0
        let y = 0

        switch (position) {
          case 'top-left':
            x = margin
            y = fontSize + margin
            break
          case 'top-right':
            x = canvas.width - textWidth - margin
            y = fontSize + margin
            break
          case 'bottom-left':
            x = margin
            y = canvas.height - margin
            break
          case 'bottom-right':
            x = canvas.width - textWidth - margin
            y = canvas.height - margin
            break
          case 'center':
            x = (canvas.width - textWidth) / 2
            y = canvas.height / 2
            break
        }
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate((rotate * Math.PI) / 180)
        ctx.fillText(text, 0, 0)
        ctx.restore()
      }
    }
  }

  useEffect(() => {
    renderCanvas()
  }, [imgSrc, text, fontSize, opacity, position, fontFamily, color, rotate, tileMode])

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setImgSrc(ev.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const download = () => {
    if (!canvasRef.current) return
    const url = canvasRef.current.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = 'watermark.png'
    a.click()
  }

  const resetAll = () => {
    setImgSrc('')
    setText('水印文字')
    setFontSize(24)
    setOpacity(0.4)
    setPosition('bottom-right')
    setFontFamily('sans-serif')
    setColor('#000000')
    setRotate(-20)
    setTileMode(false)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
      canvas.width = 0
      canvas.height = 0
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <Breadcrumb />
      <h1 className="text-2xl font-bold mb-2">图片加水印</h1>
      <p className="text-gray-500 mb-6">浏览器本地添加文字水印，调整样式，实时预览，导出图片</p>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-black file:text-white hover:file:bg-gray-800"
          />

          <div>
            <label className="block mb-1.5 font-medium">水印文字</label>
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              className="w-full border border-gray-300 rounded-xl p-3 font-mono transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-black/20"
            />
          </div>

          <div>
            <label className="block mb-1.5 font-medium">字号 {fontSize}px</label>
            <input
              type="range"
              min={12}
              max={120}
              value={fontSize}
              onChange={e => setFontSize(Number(e.target.value))}
              className="w-full h-2 rounded-lg accent-black"
            />
          </div>

          <div>
            <label className="block mb-1.5 font-medium">透明度 {opacity.toFixed(2)}</label>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={opacity}
              onChange={e => setOpacity(Number(e.target.value))}
              className="w-full h-2 rounded-lg accent-black"
            />
          </div>

          {/* 美化下拉容器：relative + 自定义箭头 */}
          <div>
            <label className="block mb-1.5 font-medium">水印位置</label>
            <div className="relative">
              <select
                value={position}
                onChange={e => setPosition(e.target.value as WatermarkPos)}
                className="w-full appearance-none bg-app-bg border border-gray-300 rounded-xl p-3 pr-10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-black/20 hover:bg-gray-50 cursor-pointer"
              >
                <option value="top-left">左上角</option>
                <option value="top-right">右上角</option>
                <option value="bottom-left">左下角</option>
                <option value="bottom-right">右下角</option>
                <option value="center">居中</option>
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">▼</div>
            </div>
          </div>

          <div>
            <label className="block mb-1.5 font-medium">字体</label>
            <div className="relative">
              <select
                value={fontFamily}
                onChange={e => setFontFamily(e.target.value as FontFamily)}
                className="w-full appearance-none bg-app-bg border border-gray-300 rounded-xl p-3 pr-10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-black/20 hover:bg-gray-50 cursor-pointer"
              >
                <option value="sans-serif">无衬线 sans‑serif</option>
                <option value="serif">衬线 serif</option>
                <option value="monospace">等宽 monospace</option>
                <option value="Arial">Arial</option>
                <option value="Microsoft YaHei">微软雅黑</option>
                <option value="SimHei">黑体</option>
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">▼</div>
            </div>
          </div>

          <div>
            <label className="block mb-1.5 font-medium">水印颜色</label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer"
              />
              <input
                value={color}
                onChange={e => setColor(e.target.value)}
                className="flex‑1 flex-1 border border-gray-300 rounded-xl p-3 font‑mono font-mono transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-black/20"
              />
            </div>
          </div>

          <div>
            <label className="block mb-1.5 font-medium">旋转角度 {rotate}°</label>
            <input
              type="range"
              min={-90}
              max={90}
              value={rotate}
              onChange={e => setRotate(Number(e.target.value))}
              className="w-full h-2 rounded-lg accent-black"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="tileMode"
              type="checkbox"
              checked={tileMode}
              onChange={e => setTileMode(e.target.checked)}
              className="w-4 h-4 accent-black"
            />
            <label htmlFor="tileMode" className="font-medium cursor-pointer">平铺重复水印（全屏斜铺）</label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={download}
              disabled={!imgSrc}
              className="px-4 py-2 bg-black text-white rounded-xl transition-all duration-200 hover:bg-gray-800 disabled:opacity-40"
            >
              下载图片
            </button>
            <button
              onClick={resetAll}
              className="px-4 py-2 border border-gray-300 rounded-xl transition-all duration-200 hover:bg-gray-100"
            >
              重置
            </button>
          </div>
        </div>

        <div>
          <div className="font-medium mb-2">预览画布</div>
          <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 p-2 overflow-auto min-h-48">
            <canvas ref={canvasRef} className="max-w-full"></canvas>
          </div>
        </div>
      </div>
    </div>
  )
}
