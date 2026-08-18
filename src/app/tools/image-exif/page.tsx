'use client'
import { useState, useRef } from 'react'
import EXIF from 'exif-js'
import { Breadcrumb } from '@/components/breadcrumb'
interface ExifData {
  [key: string]: string | number
}

export default function ImageExifPage() {
  const [exifInfo, setExifInfo] = useState<ExifData | null>(null)
  const [previewSrc, setPreviewSrc] = useState('')
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const outputCanvasRef = useRef<HTMLCanvasElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('')
    setExifInfo(null)

    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = function (event) {
      const imgSrc = event.target?.result as string
      setPreviewSrc(imgSrc)

      const img = new Image()
      img.src = imgSrc
      img.onload = () => {
        EXIF.getData(img as any, function () {
          const allMeta = EXIF.getAllTags(this)
          if (!allMeta || Object.keys(allMeta).length === 0) {
            setError('该图片不包含EXIF元数据')
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
      // 底部信息栏高度按图片宽度比例放大，更接近参考图
      const footerHeight = Math.max(160, Math.min(260, img.width * 0.18))
      const padding = footerHeight * 0.18

      canvas.width = img.width
      canvas.height = img.height + footerHeight

      // 绘制原图
      ctx.drawImage(img, 0, 0)

      // 底部白色信息区
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, img.height, canvas.width, footerHeight)

      // 读取EXIF
      const make = String(exifInfo.Make ?? '').trim().toUpperCase()
      const model = String(exifInfo.Model ?? '').trim()
      const dateTime = String(exifInfo.DateTimeOriginal ?? exifInfo.DateTime ?? '').trim()

      const fNumber = exifInfo.FNumber ? `F${exifInfo.FNumber}` : ''
      const exposureTime = exifInfo.ExposureTime ? `1/${Math.round(1 / Number(exifInfo.ExposureTime))}s` : ''
      const iso = exifInfo.ISO ? `ISO${exifInfo.ISO}` : ''
      const focalLength = exifInfo.FocalLength ? `${Math.round(Number(exifInfo.FocalLength))}mm` : ''

      const paramText = [focalLength, fNumber, exposureTime, iso].filter(Boolean).join(' ')

      // 参考图样式：左右大留白，中间品牌/机型突出
      const leftX = padding
      const rightX = canvas.width - padding
      const centerX = canvas.width / 2
      const baseY = img.height + padding
      const lineHeight = footerHeight * 0.22

      // 左侧品牌
      ctx.fillStyle = '#111111'
      ctx.font = `700 ${footerHeight * 0.28}px sans-serif`
      ctx.textAlign = 'left'
      ctx.fillText(make, leftX, baseY + lineHeight)

      // 左侧下方机型
      ctx.font = `${footerHeight * 0.18}px sans-serif`
      ctx.fillStyle = '#666666'
      ctx.fillText(model, leftX, baseY + lineHeight * 2.3)

      // 中间相机品牌大字，类似 SONY 样张中间标识
      ctx.font = `900 ${footerHeight * 0.34}px sans-serif`
      ctx.fillStyle = '#000000'
      ctx.textAlign = 'center'
      ctx.fillText(make, centerX, baseY + lineHeight * 1.8)

      // 右侧参数
      ctx.font = `700 ${footerHeight * 0.22}px sans-serif`
      ctx.fillStyle = '#111111'
      ctx.textAlign = 'right'
      ctx.fillText(paramText, rightX, baseY + lineHeight)

      // 右侧下方时间
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

  const handleReset = () => {
    setExifInfo(null)
    setPreviewSrc('')
    setError('')

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
    <div className="max-w-5xl mx-auto py-12 px-4">
      <Breadcrumb />
      <h1 className="text-2xl font-bold mb-2">图片EXIF查看器</h1>
      <p className="text-gray-500 mb-6">
        本地读取图片EXIF元数据，拍摄时间、相机参数、GPS信息，支持生成带EXIF信息底部边框，文件不会上传
      </p>

      <div className="space-y-6">
        <div className="flex gap-4 items-center flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/tiff"
            onChange={handleFileChange}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-black file:text-white hover:file:bg-gray-800"
          />
          <button
            onClick={renderExifFrame}
            disabled={!previewSrc || !exifInfo}
            className="px-4 py-2 bg-black text-white rounded-lg transition-all duration-200 hover:bg-gray-800 disabled:opacity-40"
          >
            生成EXIF信息边框
          </button>
          <button
            onClick={downloadFramedImage}
            disabled={!exifInfo}
            className="px-4 py-2 border border-gray-300 rounded-lg transition-all duration-200 hover:bg-gray-100 disabled:opacity-40"
          >
            下载带边框图片
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 border border-gray-300 rounded-lg transition-all duration-200 hover:bg-gray-100"
          >
            重置
          </button>
        </div>

        {error && <div className="text-red-500">{error}</div>}

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <div className="font-medium mb-2">原图预览</div>
            <div className="w-full min-h-64 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 flex items-center justify-center p-4">
              {previewSrc ? (
                <img src={previewSrc} alt="preview" className="max-w-full max-h-80 object-contain rounded-lg" />
              ) : (
                <span className="text-gray-400">上传JPG/TIFF图片</span>
              )}
            </div>

            <div className="mt-6">
              <div className="font-medium mb-2">带EXIF边框输出预览</div>
              <div className="w-full border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 p-2 overflow-auto">
                <canvas ref={outputCanvasRef} className="max-w-full"></canvas>
              </div>
            </div>
          </div>

          <div>
            <div className="font-medium mb-2">EXIF 元数据</div>
            <div className="w-full max-h-96 overflow-y-auto border border-gray-200 rounded-xl bg-gray-50 p-4">
              {exifInfo ? (
                <div className="space-y-2">
                  {Object.entries(exifInfo).map(([key, val]) => (
                    <div key={key} className="flex gap-2 py-1 border-b border-gray-100">
                      <div className="text-gray-500 shrink-0 w-32">{key}</div>
                      <div className="font-mono text-sm break-all flex-1">{String(val)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-400">暂无EXIF数据</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
