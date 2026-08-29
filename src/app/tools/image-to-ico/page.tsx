'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

const SIZE_OPTIONS = [16, 32, 48, 64, 128, 256]

export default function ImageToIcoPage() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedSize, setSelectedSize] = useState<number>(32)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreviewUrl(url)
  }

  const convertAndDownload = () => {
    if (!file || !canvasRef.current) return
    const img = new window.Image()
    img.onload = () => {
      const canvas = canvasRef.current!
      const ctx = canvas.getContext('2d')!
      const size = selectedSize
      canvas.width = size
      canvas.height = size
      ctx.clearRect(0, 0, size, size)
      // 保持比例居中绘制
      const ratio = Math.min(size / img.width, size / img.height)
      const w = img.width * ratio
      const h = img.height * ratio
      const x = (size - w) / 2
      const y = (size - h) / 2
      ctx.drawImage(img, x, y, w, h)

      // 导出为 PNG 数据，但以 .ico 命名下载
      const link = document.createElement('a')
      link.download = file.name.replace(/\.(png|jpg|jpeg)$/i, '') + '.ico'
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    img.src = previewUrl!
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <Breadcrumb />

      <h1 className="text-2xl font-bold mt-4 mb-2">图片转 ICO 图标</h1>
      <p className="text-gray-500 mb-6">上传 PNG 或 JPG 图片，转换为指定尺寸的 ICO 格式（适用于 favicon）</p>

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition">
        <input
          type="file"
          accept="image/png, image/jpeg"
          onChange={handleFileChange}
          className="hidden"
          id="fileInput"
        />
        <label htmlFor="fileInput" className="cursor-pointer block">
          {previewUrl ? (
            <div className="flex flex-col items-center gap-2">
              <Image src={previewUrl} alt="预览" width={120} height={120} className="object-contain max-h-32" />
              <span className="text-sm text-gray-400">点击更换图片</span>
            </div>
          ) : (
            <div className="py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="mt-2 text-sm text-gray-500">点击上传 PNG 或 JPG 图片</p>
            </div>
          )}
        </label>
      </div>

      {file && (
        <div className="mt-6 space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
            <p>文件名：{file.name}</p>
            <p>原始尺寸：{(file.size / 1024).toFixed(1)} KB</p>
          </div>

          {/* 尺寸选择 */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">输出尺寸：</label>
            <select
              value={selectedSize}
              onChange={(e) => setSelectedSize(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {SIZE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s} × {s}</option>
              ))}
            </select>
          </div>

          <button
            onClick={convertAndDownload}
            className="w-full py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition"
          >
            下载 ICO 图标 ({selectedSize}×{selectedSize})
          </button>

          <p className="text-xs text-gray-400 text-center">
            输出 PNG 格式，后缀名为 .ico，兼容主流浏览器
          </p>
        </div>
      )}

      {/* 隐藏 canvas 用于绘图 */}
      <canvas ref={canvasRef} className="hidden" />

      <FooterNote />
    </div>
  )
}