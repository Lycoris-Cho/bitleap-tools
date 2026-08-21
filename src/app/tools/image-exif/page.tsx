'use client'
import { useState, useRef } from 'react'
import EXIF from 'exif-js'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

interface ExifData {
  [key: string]: string | number
}

export default function ImageExifPage() {
  const [exifInfo, setExifInfo] = useState<ExifData | null>(null)
  const [previewSrc, setPreviewSrc] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const outputCanvasRef = useRef<HTMLCanvasElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('')
    setExifInfo(null)
    setCopied(false)

    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = function (event) {
      const imgSrc = event.target?.result as string
      setPreviewSrc(imgSrc)

      const img = new Image()
      img.src = imgSrc
      img.onload = () => {
        EXIF.getData(img as unknown as string, () => {
          const allMeta = EXIF.getAllTags(img as unknown as HTMLImageElement)
          if (!allMeta || Object.keys(allMeta).length === 0) {
            setError('该图片不包含 EXIF 元数据')
            return
          }
          setExifInfo(allMeta)
        })
      }
    }
    reader.readAsDataURL(file)
  }

  const renderExifFrame = () => {
    if (!previewSrc || !exifInfo || !outputCanvasRef.current) return

    const canvas = outputCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.src = previewSrc
    img.onload = () => {
      const footerHeight = Math.max(160, Math.min(260, img.width * 0.18))
      const padding = footerHeight * 0.18

      canvas.width = img.width
      canvas.height = img.height + footerHeight

      ctx.drawImage(img, 0, 0)

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, img.height, canvas.width, footerHeight)

      const make = String(exifInfo.Make ?? '').trim().toUpperCase()
      const model = String(exifInfo.Model ?? '').trim()
      const dateTime = String(exifInfo.DateTimeOriginal ?? exifInfo.DateTime ?? '').trim()

      const fNumber = exifInfo.FNumber ? `F${exifInfo.FNumber}` : ''
      const exposureTime = exifInfo.ExposureTime ? `1/${Math.round(1 / Number(exifInfo.ExposureTime))}s` : ''
      const iso = exifInfo.ISO ? `ISO${exifInfo.ISO}` : ''
      const focalLength = exifInfo.FocalLength ? `${Math.round(Number(exifInfo.FocalLength))}mm` : ''

      const paramText = [focalLength, fNumber, exposureTime, iso].filter(Boolean).join(' ')

      const leftX = padding
      const rightX = canvas.width - padding
      const centerX = canvas.width / 2
      const baseY = img.height + padding
      const lineHeight = footerHeight * 0.22

      ctx.fillStyle = '#111111'
      ctx.font = `700 ${footerHeight * 0.28}px sans-serif`
      ctx.textAlign = 'left'
      ctx.fillText(make, leftX, baseY + lineHeight)

      ctx.font = `${footerHeight * 0.18}px sans-serif`
      ctx.fillStyle = '#666666'
      ctx.fillText(model, leftX, baseY + lineHeight * 2.3)

      ctx.font = `900 ${footerHeight * 0.34}px sans-serif`
      ctx.fillStyle = '#000000'
      ctx.textAlign = 'center'
      ctx.fillText(make, centerX, baseY + lineHeight * 1.8)

      ctx.font = `700 ${footerHeight * 0.22}px sans-serif`
      ctx.fillStyle = '#111111'
      ctx.textAlign = 'right'
      ctx.fillText(paramText, rightX, baseY + lineHeight)

      ctx.font = `${footerHeight * 0.16}px sans-serif`
      ctx.fillStyle = '#666666'
      ctx.fillText(dateTime, rightX, baseY + lineHeight * 2.3)
    }
  }

  const downloadFramedImage = () => {
    if (!outputCanvasRef.current) return
    const url = outputCanvasRef.current.toDataURL('image/jpeg', 0.92)
    const a = document.createElement('a')
    a.href = url
    a.download = 'exif-framed.jpg'
    a.click()
  }

  const handleCopyExif = async () => {
    if (!exifInfo) return
    const text = Object.entries(exifInfo)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleReset = () => {
    setExifInfo(null)
    setPreviewSrc('')
    setError('')
    setCopied(false)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    const canvas = outputCanvasRef.current
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
        <h1 className="text-3xl font-bold tracking-tight mb-2">图片 EXIF 查看器</h1>
        <p className="text-app-muted text-sm">本地读取图片 EXIF 元数据，拍摄时间、相机参数、GPS 信息，支持生成带 EXIF 信息底部边框，文件不会上传</p>
      </div>

      {/* 操作栏 */}
      <div className="flex gap-3 items-center flex-wrap mb-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/tiff"
          onChange={handleFileChange}
          className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-violet-500 file:text-white hover:file:bg-violet-600 file:transition-all file:cursor-pointer text-sm text-gray-600"
        />
        <button
          onClick={renderExifFrame}
          disabled={!previewSrc || !exifInfo}
          className="px-4 py-2.5 bg-violet-500 text-white text-sm font-medium rounded-lg hover:bg-violet-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-violet-500/20"
        >
          生成 EXIF 信息边框
        </button>
        <button
          onClick={downloadFramedImage}
          disabled={!exifInfo}
          className="px-4 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          下载带边框图片
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2.5 bg-orange-50 text-orange-600 border border-orange-200 text-sm font-medium rounded-lg hover:bg-orange-100 active:scale-95 transition-all"
        >
          重置
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* 左侧：预览 */}
        <div className="space-y-6">
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">原图预览</div>
            <div className="w-full min-h-64 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 flex items-center justify-center p-4">
              {previewSrc ? (
                <img src={previewSrc} alt="preview" className="max-w-full max-h-80 object-contain rounded-lg" />
              ) : (
                <span className="text-app-muted text-sm">上传 JPG / TIFF 图片</span>
              )}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">带 EXIF 边框输出预览</div>
            <div className="w-full border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 p-2 overflow-auto">
              <canvas ref={outputCanvasRef} className="max-w-full" />
            </div>
          </div>
        </div>

        {/* 右侧：EXIF 数据 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">EXIF 元数据</span>
            {exifInfo && (
              <button
                onClick={handleCopyExif}
                className="px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 active:scale-95 transition-all"
              >
                {copied ? '✓ 已复制' : '📋 复制全部'}
              </button>
            )}
          </div>
          <div className="w-full max-h-96 overflow-y-auto border border-app-border rounded-xl bg-gray-50 p-4">
            {exifInfo ? (
              <div className="space-y-1">
                {Object.entries(exifInfo).map(([key, val]) => (
                  <div key={key} className="flex gap-2 py-1.5 border-b border-gray-200 last:border-0">
                    <div className="text-app-muted shrink-0 w-32 text-xs">{key}</div>
                    <div className="font-mono text-sm break-all flex-1 text-gray-800">{String(val)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-app-muted text-sm">暂无 EXIF 数据</div>
            )}
          </div>
        </div>
      </div>

      {/* 说明卡片 */}
      <div className="mt-10 p-4 bg-gray-50 border border-app-border rounded-xl">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">使用说明</h3>
        <ul className="text-xs text-app-muted space-y-1.5 leading-relaxed">
          <li>• 所有处理在浏览器本地完成，图片不会上传到任何服务器</li>
          <li>• 支持 JPG / JPEG / TIFF 格式，部分 PNG 可能包含 EXIF</li>
          <li>• 点击「生成 EXIF 信息边框」可在图片底部添加相机参数水印</li>
          <li>• 如果图片不包含 EXIF 数据（如截图、社交媒体下载图），将提示无数据</li>
        </ul>
      </div>

      <FooterNote />
    </div>
  )
}