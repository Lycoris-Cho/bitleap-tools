'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

type AspectRatio = 'auto' | '1:1' | '4:3' | '3:2' | '16:9'
type ExportFormat = 'png' | 'jpeg'

type BackgroundPreset = {
  id: string
  name: string
  css: string
  stops: string[]
  angle: number
}

const MAX_CANVAS_WIDTH = 1800

const backgrounds: BackgroundPreset[] = [
  { id: 'peach', name: '暖杏', css: 'linear-gradient(135deg, #f8d7c3 0%, #e9b9a8 100%)', stops: ['#f8d7c3', '#e9b9a8'], angle: 135 },
  { id: 'violet', name: '暮紫', css: 'linear-gradient(135deg, #c7b8ea 0%, #8f83c9 100%)', stops: ['#c7b8ea', '#8f83c9'], angle: 135 },
  { id: 'blue', name: '雾蓝', css: 'linear-gradient(135deg, #c6ddf4 0%, #8fb7dc 100%)', stops: ['#c6ddf4', '#8fb7dc'], angle: 135 },
  { id: 'mint', name: '薄荷', css: 'linear-gradient(135deg, #cfe8dc 0%, #8fc6ac 100%)', stops: ['#cfe8dc', '#8fc6ac'], angle: 135 },
  { id: 'sunset', name: '日落', css: 'linear-gradient(135deg, #ffd4b8 0%, #f6a7ba 52%, #a9a6e9 100%)', stops: ['#ffd4b8', '#f6a7ba', '#a9a6e9'], angle: 135 },
  { id: 'mono', name: '银灰', css: 'linear-gradient(135deg, #e7e8eb 0%, #c9cbd1 100%)', stops: ['#e7e8eb', '#c9cbd1'], angle: 135 },
  { id: 'dark', name: '深夜', css: 'linear-gradient(135deg, #22252c 0%, #0f1115 100%)', stops: ['#22252c', '#0f1115'], angle: 135 },
]

const aspectOptions: { label: string; value: AspectRatio }[] = [
  { label: '自由', value: 'auto' },
  { label: '1:1', value: '1:1' },
  { label: '4:3', value: '4:3' },
  { label: '3:2', value: '3:2' },
  { label: '16:9', value: '16:9' },
]

function ratioValue(ratio: AspectRatio) {
  if (ratio === '1:1') return 1
  if (ratio === '4:3') return 4 / 3
  if (ratio === '3:2') return 3 / 2
  if (ratio === '16:9') return 16 / 9
  return null
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2))
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}

function createGradient(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  preset: BackgroundPreset,
) {
  const rad = ((preset.angle - 90) * Math.PI) / 180
  const cx = width / 2
  const cy = height / 2
  const length = Math.abs(width * Math.cos(rad)) + Math.abs(height * Math.sin(rad))
  const x1 = cx - (Math.cos(rad) * length) / 2
  const y1 = cy - (Math.sin(rad) * length) / 2
  const x2 = cx + (Math.cos(rad) * length) / 2
  const y2 = cy + (Math.sin(rad) * length) / 2

  const gradient = ctx.createLinearGradient(x1, y1, x2, y2)
  preset.stops.forEach((color, index) => {
    const offset = preset.stops.length === 1 ? 0 : index / (preset.stops.length - 1)
    gradient.addColorStop(offset, color)
  })
  return gradient
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('图片生成失败'))
    }, type, quality)
  })
}

export default function ScreenshotBeautifierPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)

  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [fileName, setFileName] = useState('')
  const [backgroundId, setBackgroundId] = useState('peach')
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('auto')
  const [padding, setPadding] = useState(72)
  const [radius, setRadius] = useState(20)
  const [shadow, setShadow] = useState(36)
  const [scale, setScale] = useState(90)
  const [showWindow, setShowWindow] = useState(false)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('png')
  const [dragging, setDragging] = useState(false)
  const [notice, setNotice] = useState('')

  const background = useMemo(
    () => backgrounds.find((item) => item.id === backgroundId) ?? backgrounds[0],
    [backgroundId],
  )

  const showNotice = useCallback((message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 1800)
  }, [])

  const loadImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      showNotice('请选择图片文件')
      return
    }

    const url = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      setImage(img)
      setFileName(file.name || 'screenshot')
      URL.revokeObjectURL(url)
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      showNotice('图片读取失败')
    }

    img.src = url
  }, [showNotice])

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const item = Array.from(event.clipboardData?.items ?? []).find((entry) =>
        entry.type.startsWith('image/'),
      )
      const blob = item?.getAsFile()
      if (!blob) return

      event.preventDefault()
      loadImageFile(new File([blob], 'clipboard-image.png', { type: blob.type || 'image/png' }))
    }

    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [loadImageFile])

  const getCanvasSize = useCallback((img: HTMLImageElement) => {
    const sourceRatio = img.naturalWidth / img.naturalHeight
    const chosenRatio = ratioValue(aspectRatio)

    const contentScale = scale / 100
    const targetImageWidth = Math.min(
      MAX_CANVAS_WIDTH - padding * 2,
      img.naturalWidth * contentScale,
    )
    const targetImageHeight = targetImageWidth / sourceRatio

    let width = targetImageWidth + padding * 2
    let height = targetImageHeight + padding * 2 + (showWindow ? 34 : 0)

    if (chosenRatio) {
      if (width / height > chosenRatio) height = width / chosenRatio
      else width = height * chosenRatio
    }

    return {
      width: Math.max(360, Math.round(width)),
      height: Math.max(260, Math.round(height)),
    }
  }, [aspectRatio, padding, scale, showWindow])

  const drawCanvas = useCallback((canvas: HTMLCanvasElement, multiplier = 1) => {
    if (!image) return

    const base = getCanvasSize(image)
    canvas.width = Math.round(base.width * multiplier)
    canvas.height = Math.round(base.height * multiplier)

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.save()
    ctx.scale(multiplier, multiplier)

    ctx.fillStyle = createGradient(ctx, base.width, base.height, background)
    ctx.fillRect(0, 0, base.width, base.height)

    const chromeHeight = showWindow ? 34 : 0
    const sourceRatio = image.naturalWidth / image.naturalHeight

    const maxImageWidth = Math.max(120, base.width - padding * 2)
    const maxImageHeight = Math.max(120, base.height - padding * 2 - chromeHeight)

    let drawWidth = maxImageWidth
    let drawHeight = drawWidth / sourceRatio

    if (drawHeight > maxImageHeight) {
      drawHeight = maxImageHeight
      drawWidth = drawHeight * sourceRatio
    }

    const x = (base.width - drawWidth) / 2
    const totalHeight = drawHeight + chromeHeight
    const y = (base.height - totalHeight) / 2
    const cardRadius = Math.min(radius, drawWidth / 8)

    ctx.save()
    ctx.shadowColor = `rgba(15, 18, 24, ${Math.min(0.32, shadow / 120)})`
    ctx.shadowBlur = shadow
    ctx.shadowOffsetY = Math.max(4, shadow * 0.32)
    roundedRect(ctx, x, y, drawWidth, totalHeight, cardRadius)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.restore()

    ctx.save()
    roundedRect(ctx, x, y, drawWidth, totalHeight, cardRadius)
    ctx.clip()

    if (showWindow) {
      ctx.fillStyle = '#f5f5f7'
      ctx.fillRect(x, y, drawWidth, chromeHeight)

      const dotY = y + chromeHeight / 2
      const startX = x + 16
      const dots = ['#ff5f57', '#febc2e', '#28c840']
      dots.forEach((color, index) => {
        ctx.beginPath()
        ctx.arc(startX + index * 16, dotY, 5, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
      })
    }

    ctx.drawImage(image, x, y + chromeHeight, drawWidth, drawHeight)
    ctx.restore()
    ctx.restore()
  }, [background, getCanvasSize, image, padding, radius, shadow, showWindow])

  useEffect(() => {
    const canvas = previewCanvasRef.current
    if (!canvas || !image) return
    drawCanvas(canvas, 1)
  }, [drawCanvas, image])

  const randomPretty = () => {
    const preset = backgrounds[Math.floor(Math.random() * backgrounds.length)]
    const ratios: AspectRatio[] = ['auto', '1:1', '4:3', '3:2', '16:9']
    const paddingValues = [48, 56, 64, 72, 84, 96]
    const radiusValues = [14, 18, 20, 24, 28]
    const shadowValues = [22, 28, 34, 40, 48]

    setBackgroundId(preset.id)
    setAspectRatio(ratios[Math.floor(Math.random() * ratios.length)])
    setPadding(paddingValues[Math.floor(Math.random() * paddingValues.length)])
    setRadius(radiusValues[Math.floor(Math.random() * radiusValues.length)])
    setShadow(shadowValues[Math.floor(Math.random() * shadowValues.length)])
    setScale(90)
  }

  const exportImage = async () => {
    if (!image) return

    const canvas = document.createElement('canvas')
    drawCanvas(canvas, 2)

    const mime = exportFormat === 'png' ? 'image/png' : 'image/jpeg'
    const blob = await canvasToBlob(canvas, mime, 0.94)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const cleanName = fileName.replace(/\.[^.]+$/, '') || 'screenshot'

    a.href = url
    a.download = `${cleanName}-beautified.${exportFormat === 'png' ? 'png' : 'jpg'}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  const copyImage = async () => {
    if (!image) return

    if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
      showNotice('当前浏览器不支持复制图片')
      return
    }

    try {
      const canvas = document.createElement('canvas')
      drawCanvas(canvas, 2)
      const blob = await canvasToBlob(canvas, 'image/png')
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      showNotice('图片已复制')
    } catch {
      showNotice('复制失败，请尝试下载')
    }
  }

  return (
    <main className="shot-page">
      <style>{styles}</style>

      <div className="shot-shell">
      <Breadcrumb />
        <header className="shot-header">
          <div>
            <h1>截图美化</h1>
            <p>粘贴一张截图，把它变成适合分享的图片。</p>
          </div>

          <div className="header-actions">
            <button className="button button-ghost" onClick={randomPretty} disabled={!image}>
              ✦ 随机好看
            </button>
            <button className="button button-ghost" onClick={copyImage} disabled={!image}>
              复制
            </button>
            <button className="button button-primary" onClick={exportImage} disabled={!image}>
              导出 ↓
            </button>
          </div>
        </header>

        <section className="studio">
          <aside className="control-panel">
            <ControlTitle title="背景" value={background.name} />
            <div className="background-grid">
              {backgrounds.map((item) => (
                <button
                  key={item.id}
                  className={`background-swatch ${backgroundId === item.id ? 'is-active' : ''}`}
                  style={{ background: item.css }}
                  onClick={() => setBackgroundId(item.id)}
                  title={item.name}
                />
              ))}
            </div>

            <div className="control-section">
              <ControlTitle title="画布比例" value={aspectRatio === 'auto' ? '跟随截图' : aspectRatio} />
              <div className="segmented">
                {aspectOptions.map((item) => (
                  <button
                    key={item.value}
                    className={aspectRatio === item.value ? 'is-active' : ''}
                    onClick={() => setAspectRatio(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <RangeControl label="留白" value={padding} min={24} max={140} suffix="px" onChange={setPadding} />
            <RangeControl label="圆角" value={radius} min={0} max={40} suffix="px" onChange={setRadius} />
            <RangeControl label="阴影" value={shadow} min={0} max={64} suffix="" onChange={setShadow} />
            <RangeControl label="截图大小" value={scale} min={62} max={100} suffix="%" onChange={setScale} />

            <div className="control-section row-control">
              <div>
                <div className="control-label">窗口外壳</div>
                <div className="control-sub">模拟 macOS 窗口</div>
              </div>
              <button
                className={`switch ${showWindow ? 'is-on' : ''}`}
                onClick={() => setShowWindow((v) => !v)}
                aria-pressed={showWindow}
              >
                <span />
              </button>
            </div>

            <div className="control-section">
              <ControlTitle title="导出格式" value={exportFormat === 'png' ? 'PNG' : 'JPG'} />
              <div className="segmented two">
                {(['png', 'jpeg'] as ExportFormat[]).map((item) => (
                  <button
                    key={item}
                    className={exportFormat === item ? 'is-active' : ''}
                    onClick={() => setExportFormat(item)}
                  >
                    {item === 'png' ? 'PNG' : 'JPG'}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div
            className={`preview-area ${dragging ? 'is-dragging' : ''}`}
            onDragEnter={(e) => { e.preventDefault(); setDragging(true) }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false) }}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              const file = e.dataTransfer.files?.[0]
              if (file) loadImageFile(file)
            }}
          >
            {!image ? (
              <button className="drop-zone" onClick={() => fileInputRef.current?.click()}>
                <strong>拖入截图，或点击选择图片</strong>
                <span>也可以直接按 Ctrl / Cmd + V 粘贴截图</span>
                <small>PNG · JPG · WebP · 全程本地处理</small>
              </button>
            ) : (
              <div className="canvas-stage">
                <canvas ref={previewCanvasRef} className="preview-canvas" />
                <div className="canvas-meta">
                  <span>{fileName}</span>
                  <button onClick={() => fileInputRef.current?.click()}>更换图片</button>
                </div>
              </div>
            )}

            {dragging && (
              <div className="drag-overlay">
                <strong>松开即可导入</strong>
                <span>图片不会上传到服务器</span>
              </div>
            )}
          </div>
        </section>
        < FooterNote/>
      </div>

      <input
        ref={fileInputRef}
        hidden
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) loadImageFile(file)
          e.currentTarget.value = ''
        }}
      />
      {notice && <div className="toast">{notice}</div>}
    </main>
  )
}

function ControlTitle({ title, value }: { title: string; value: string }) {
  return (
    <div className="control-title">
      <span>{title}</span>
      <small>{value}</small>
    </div>
  )
}

function RangeControl({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  suffix: string
  onChange: (value: number) => void
}) {
  return (
    <div className="control-section">
      <ControlTitle title={label} value={`${value}${suffix}`} />
      <input
        className="range"
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

const styles = `
  .shot-page{
    min-height:100vh;
    position:relative;
    overflow:hidden;
    background:#f4f4f2;
    color:#26282d;
    font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif
  }
  .shot-page *{box-sizing:border-box}
  .shot-page button,.shot-page input{font:inherit}
  .shot-shell{position:relative;z-index:1;width:min(1380px,calc(100% - 32px));margin:0 auto;padding:34px 0}
  .shot-header{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;padding:10px 4px 26px}
  .shot-eyebrow{display:block;margin-bottom:10px;color:#9b776b;font-size:10px;font-weight:750;letter-spacing:.18em}
  .shot-header h1{margin:0;font-size:clamp(28px,3.2vw,42px);letter-spacing:-.045em}
  .shot-header p{margin:10px 0 0;color:#858992;font-size:13px}
  .header-actions{display:flex;gap:8px;flex-wrap:wrap}
  .button{min-height:40px;padding:9px 15px;border-radius:11px;border:1px solid transparent;cursor:pointer;font-size:12px;font-weight:650;transition:.18s ease}
  .button:disabled{opacity:.35;cursor:not-allowed}
  .button:not(:disabled):hover{transform:translateY(-1px)}
  .button-primary{color:#fff;background:#2c2e33;box-shadow:0 7px 18px rgba(31,33,38,.15)}
  .button-ghost{color:#5f6269;background:rgba(255,255,255,.62);border-color:rgba(38,40,45,.10)}
  .studio{
    display:grid;grid-template-columns:276px minmax(0,1fr);min-height:690px;overflow:hidden;
    border:1px solid rgba(38,40,45,.10);border-radius:24px;background:rgba(255,255,255,.48);
    box-shadow:0 24px 80px rgba(43,45,49,.075),inset 0 1px 0 rgba(255,255,255,.86);
    backdrop-filter:blur(22px)
  }
  .control-panel{padding:22px 20px;background:rgba(249,249,248,.86);border-right:1px solid rgba(38,40,45,.08)}
  .control-section{padding:16px 0;border-bottom:1px solid rgba(38,40,45,.075)}
  .control-title{display:flex;justify-content:space-between;gap:12px;margin-bottom:11px}
  .control-title span,.control-label{font-size:12px;font-weight:650;color:#484b51}
  .control-title small,.control-sub{font-size:10px;color:#a0a3aa}
  .background-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:7px;margin-bottom:16px}
  .background-swatch{aspect-ratio:1;border:2px solid transparent;border-radius:9px;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(0,0,0,.05)}
  .background-swatch.is-active{border-color:#fff;box-shadow:0 0 0 2px #6a6d74}
  .segmented{display:grid;grid-template-columns:repeat(5,1fr);gap:3px;padding:3px;border:1px solid rgba(38,40,45,.08);border-radius:10px;background:rgba(48,52,58,.045)}
  .segmented.two{grid-template-columns:repeat(2,1fr)}
  .segmented button{padding:7px 4px;border:0;border-radius:7px;background:transparent;color:#8b8e95;font-size:10px;cursor:pointer}
  .segmented button.is-active{background:#fff;color:#34373d;box-shadow:0 1px 5px rgba(35,38,43,.08)}
  .range{width:100%}
  .row-control{display:flex;align-items:center;justify-content:space-between;gap:16px}
  .switch{position:relative;width:36px;height:21px;padding:0;border:0;border-radius:999px;background:#d8dadd;cursor:pointer}
  .switch span{position:absolute;top:3px;left:3px;width:15px;height:15px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.16);transition:.18s ease}
  .switch.is-on{background:#4b4e55}
  .switch.is-on span{transform:translateX(15px)}
  .preview-area{position:relative;display:grid;place-items:center;padding:38px;overflow:hidden;background:rgba(237,238,238,.58)}
  .preview-area:before{
    content:"";position:absolute;inset:0;pointer-events:none;
    background-image:
      linear-gradient(rgba(63,68,76,.035) 1px,transparent 1px),
      linear-gradient(90deg,rgba(63,68,76,.035) 1px,transparent 1px);
    background-size:24px 24px
  }
  .drop-zone{
    position:relative;z-index:1;width:min(460px,90%);min-height:310px;padding:38px;
    display:flex;align-items:center;justify-content:center;flex-direction:column;
    border:1px dashed rgba(54,58,64,.18);border-radius:20px;background:rgba(255,255,255,.58);
    cursor:pointer
  }
  .drop-zone strong{font-size:14px;color:#44474d}
  .drop-zone span{margin-top:8px;font-size:11px;color:#898c93}
  .drop-zone small{margin-top:20px;font-size:9px;color:#b0b2b7}
  .canvas-stage{position:relative;z-index:1;width:100%;display:flex;align-items:center;justify-content:center;flex-direction:column}
  .preview-canvas{display:block;max-width:min(100%,980px);max-height:590px;width:auto;height:auto;border-radius:8px}
  .canvas-meta{display:flex;gap:12px;margin-top:14px;color:#989ba1;font-size:10px}
  .canvas-meta button{border:0;background:transparent;color:#686b72;cursor:pointer}
  .drag-overlay{
    position:absolute;z-index:8;inset:18px;display:grid;place-content:center;text-align:center;
    border:1.5px dashed rgba(58,61,67,.32);border-radius:18px;background:rgba(247,247,245,.88);
    backdrop-filter:blur(12px)
  }
  .drag-overlay strong{font-size:15px}
  .drag-overlay span{margin-top:7px;font-size:10px;color:#96999f}
  .toast{
    position:fixed;z-index:50;left:50%;bottom:28px;transform:translateX(-50%);
    padding:10px 14px;border-radius:10px;color:#fff;background:rgba(32,34,38,.92);font-size:11px
  }
  @media(max-width:760px){
    .shot-header{align-items:flex-start;flex-direction:column}
    .studio{display:flex;flex-direction:column-reverse}
    .control-panel{border-right:0;border-top:1px solid rgba(38,40,45,.08)}
    .preview-area{min-height:430px}
  }
`