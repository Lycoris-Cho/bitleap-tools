'use client'
import { useState, useRef, useEffect } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

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
    <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">图片加水印</h1>
        <p className="text-app-muted text-sm">浏览器本地添加文字水印，调整样式，实时预览，导出图片</p>
      </div>

      <div className="grid md:grid-cols-2 gap-10">
        {/* 左：控制区 */}
        <div className="space-y-5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-violet-500 file:text-white hover:file:bg-violet-600 file:transition-all file:cursor-pointer text-sm text-gray-600"
          />

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">水印文字</label>
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-gray-700">字号</span>
              <span className="font-mono text-violet-600 font-semibold">{fontSize}px</span>
            </div>
            <input
              type="range"
              min={12}
              max={120}
              value={fontSize}
              onChange={e => setFontSize(Number(e.target.value))}
              className="w-full accent-violet-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-gray-700">透明度</span>
              <span className="font-mono text-violet-600 font-semibold">{opacity.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={opacity}
              onChange={e => setOpacity(Number(e.target.value))}
              className="w-full accent-violet-500"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">水印位置</label>
            <div className="relative">
              <select
                value={position}
                onChange={e => setPosition(e.target.value as WatermarkPos)}
                className="w-full appearance-none bg-app-bg border border-gray-300 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 hover:bg-gray-50 cursor-pointer"
              >
                <option value="top-left">左上角</option>
                <option value="top-right">右上角</option>
                <option value="bottom-left">左下角</option>
                <option value="bottom-right">右下角</option>
                <option value="center">居中</option>
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">▼</div>
            </div>
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">字体</label>
            <div className="relative">
              <select
                value={fontFamily}
                onChange={e => setFontFamily(e.target.value as FontFamily)}
                className="w-full appearance-none bg-app-bg border border-gray-300 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 hover:bg-gray-50 cursor-pointer"
              >
                <option value="sans-serif">无衬线 sans-serif</option>
                <option value="serif">衬线 serif</option>
                <option value="monospace">等宽 monospace</option>
                <option value="Arial">Arial</option>
                <option value="Microsoft YaHei">微软雅黑</option>
                <option value="SimHei">黑体</option>
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">▼</div>
            </div>
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">水印颜色</label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-12 h-12 p-0 border-0 bg-transparent cursor-pointer rounded-lg shrink-0"
              />
              <input
                value={color}
                onChange={e => setColor(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-gray-700">旋转角度</span>
              <span className="font-mono text-violet-600 font-semibold">{rotate}°</span>
            </div>
            <input
              type="range"
              min={-90}
              max={90}
              value={rotate}
              onChange={e => setRotate(Number(e.target.value))}
              className="w-full accent-violet-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="tileMode"
              type="checkbox"
              checked={tileMode}
              onChange={e => setTileMode(e.target.checked)}
              className="w-4 h-4 accent-violet-500"
            />
            <label htmlFor="tileMode" className="text-sm text-gray-700 cursor-pointer">平铺重复水印（全屏斜铺）</label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={download}
              disabled={!imgSrc}
              className="px-5 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              下载图片
            </button>
            <button
              onClick={resetAll}
              className="px-5 py-2.5 bg-orange-50 text-orange-600 border border-orange-200 text-sm font-medium rounded-lg hover:bg-orange-100 active:scale-95 transition-all"
            >
              重置
            </button>
          </div>
        </div>

        {/* 右：预览 */}
        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">预览画布</div>
          <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 p-2 overflow-auto min-h-48">
            <canvas ref={canvasRef} className="max-w-full" />
          </div>
        </div>
      </div>

      {/* 说明卡片 */}
      <div className="mt-10 p-4 bg-gray-50 border border-app-border rounded-xl">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">使用说明</h3>
        <ul className="text-xs text-app-muted space-y-1.5 leading-relaxed">
          <li>• 所有处理在浏览器本地完成，图片不会上传到任何服务器</li>
          <li>• 支持自定义水印文字、字号、透明度、颜色、旋转角度和字体</li>
          <li>• 开启「平铺重复水印」可在整张图片上斜铺水印，适合版权保护</li>
          <li>• 点击「下载图片」导出带水印的 PNG 图片</li>
        </ul>
      </div>

      <FooterNote />
    </div>
  )
}