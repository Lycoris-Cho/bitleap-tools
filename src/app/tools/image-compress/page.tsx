'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
type ImageFormat = 'image/jpeg' | 'image/png' | 'image/webp'

export default function ImageCompressPage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [compressed, setCompressed] = useState<string | null>(null)
  const [originalSize, setOriginalSize] = useState(0)
  const [compressedSize, setCompressedSize] = useState(0)
  const [compressStrength, setCompressStrength] = useState(5)
  const [format, setFormat] = useState<ImageFormat>('image/webp')
  const [errorMsg, setErrorMsg] = useState('')

  const previewUrlRef = useRef<string | null>(null)
  const compressedUrlRef = useRef<string | null>(null)

  const strengthToQuality = (strength: number) => {
    return 0.95 - ((strength - 1) / 9) * 0.85
  }

  const revokeUrls = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
    if (compressedUrlRef.current) {
      URL.revokeObjectURL(compressedUrlRef.current)
      compressedUrlRef.current = null
    }
  }, [])

  const handleReset = useCallback(() => {
    revokeUrls()
    setFile(null)
    setPreview(null)
    setCompressed(null)
    setOriginalSize(0)
    setCompressedSize(0)
    setCompressStrength(5)
    setFormat('image/webp')
    setErrorMsg('')
  }, [revokeUrls])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('')
    const f = e.target.files?.[0]
    if (!f) return

    const MAX_SIZE = 10 * 1024 * 1024
    if (f.size > MAX_SIZE) {
      setErrorMsg('文件不能超过10MB')
      return
    }

    revokeUrls()
    setCompressed(null)
    setCompressedSize(0)

    setFile(f)
    setOriginalSize(f.size)
    const url = URL.createObjectURL(f)
    previewUrlRef.current = url
    setPreview(url)
  }

  const compress = useCallback(async () => {
    if (!file || !preview) return
    setErrorMsg('')

    const img = new Image()
    img.src = preview

    try {
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
      })
    } catch (err) {
      setErrorMsg('图片加载失败，文件可能已损坏')
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (format === 'image/jpeg') {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    ctx.drawImage(img, 0, 0)

    const outputQuality = strengthToQuality(compressStrength)

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setErrorMsg('压缩失败，请更换图片或输出格式')
          return
        }
        if (compressedUrlRef.current) {
          URL.revokeObjectURL(compressedUrlRef.current)
        }
        const url = URL.createObjectURL(blob)
        compressedUrlRef.current = url
        setCompressed(url)
        setCompressedSize(blob.size)

        if (blob.size > originalSize) {
          setErrorMsg('⚠️ 压缩后文件比原图更大！建议调大压缩强度或改用WebP。PNG为无损格式，体积通常更大。')
        } else {
          setErrorMsg('')
        }
      },
      format,
      outputQuality
    )
  }, [file, preview, format, compressStrength, originalSize])

  const download = () => {
    if (!compressed || !file) return
    const a = document.createElement('a')
    a.href = compressed
    const ext = format.split('/')[1]
    a.download = file.name.replace(/\.[^.]+$/, '') + '-compressed.' + ext
    a.click()
  }

  const formatSize = (bytes: number) =>
    bytes < 1024
      ? `${bytes} B`
      : bytes < 1024 * 1024
        ? `${(bytes / 1024).toFixed(1)} KB`
        : `${(bytes / 1024 / 1024).toFixed(2)} MB`

  useEffect(() => {
    return () => revokeUrls()
  }, [revokeUrls])

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          图片压缩
        </h1>
        <p className="text-app-muted">
          在浏览器中压缩 JPG / PNG / WebP，完全本地处理，不上传服务器
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-3 rounded-xl bg-amber-50 text-amber-700 text-sm border border-amber-200">
          {errorMsg}
        </div>
      )}

      {/* 上传区域，选中图片后显示缩略图 */}
      <div className="mb-8">
        <label className="block w-full border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center cursor-pointer hover:bg-gray-50 transition">
          <input
            type="file"
            accept="image/*"
            onChange={onFileChange}
            className="hidden"
          />
          {file && preview ? (
            <div>
              <img
                src={preview}
                alt="selected preview"
                className="max-h-48 mx-auto rounded-lg object-contain"
              />
              <div className="mt-3 text-sm">
                <div className="font-medium">{file.name}</div>
                <div className="text-app-muted mt-1">{formatSize(file.size)}</div>
                <div className="text-xs text-gray‑400 mt‑2">点击此处可重新选择图片</div>
              </div>
            </div>
          ) : (
            <>
              <div className="text-app-muted">
                点击上传或拖拽图片到此处
              </div>
              <div className="text-sm text-app-muted mt-2">
                支持 JPG / PNG / WebP，单文件 ≤ 10MB
              </div>
            </>
          )}
        </label>
      </div>

      {file && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>压缩强度</span>
              <span className="font-mono">{compressStrength}</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={compressStrength}
              onChange={(e) => setCompressStrength(Number(e.target.value))}
              className="w-full"
              disabled={format === 'image/png'}
            />
            <p className="text-xs text-gray-500 mt-1">
              {format === 'image/png'
                ? 'PNG为无损格式，压缩强度不生效'
                : '数值越大，压缩越强，文件越小，画质损失越高'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              输出格式
            </label>
            <div className="flex gap-3">
              {[
                { value: 'image/jpeg', label: 'JPG' },
                { value: 'image/png', label: 'PNG' },
                { value: 'image/webp', label: 'WebP' },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFormat(f.value as ImageFormat)}
                  className={`px-5 py-3 rounded-xl border text-sm font-medium transition ${
                    format === f.value
                      ? 'bg-black text-white border-black'
                      : 'bg-app-bg text-gray-800 border-gray-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {file && (
        <div className="flex gap-4 mb-10">
          {!compressed && (
            <button
              onClick={compress}
              className="px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition font-medium"
            >
              压缩图片
            </button>
          )}
          <button
            onClick={handleReset}
            className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition font-medium"
          >
            重置
          </button>
        </div>
      )}

      {preview && compressed && (
        <div className="mb-10 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm font-medium mb-2">
                原图 · {formatSize(originalSize)}
              </div>
              <img
                src={preview}
                alt="original"
                className="w-full rounded-xl border border-app-border"
              />
            </div>

            <div>
              <div className="text-sm font-medium mb-2">
                压缩后 · {formatSize(compressedSize)}
                {originalSize > compressedSize ? (
                  <span className="ml-2 text-green-600">
                    ↓ {((1 - compressedSize / originalSize) * 100).toFixed(1)}%
                  </span>
                ) : (
                  <span className="ml-2 text-red-500">体积增大</span>
                )}
              </div>
              <img
                src={compressed}
                alt="compressed"
                className="w-full rounded-xl border border-app-border"
              />
            </div>
          </div>

          <button
            onClick={download}
            className="px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition font-medium"
          >
            下载压缩图片
          </button>
        </div>
      )}

      <div className="text-sm text-gray-500 leading-relaxed">
        <p className="mb-2">
          所有压缩操作均在浏览器本地完成，图片不会上传到任何服务器。
        </p>
        <p>
          压缩强度越大，文件体积越小，但画质损失越大。WebP 相同条件下压缩效果最优。PNG为无损输出，可能会比原图更大。
        </p>
      </div>
    </div>
  )
}
