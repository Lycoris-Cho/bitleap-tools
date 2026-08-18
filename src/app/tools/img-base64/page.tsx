'use client'

import { useState, useCallback } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
export default function ImgToBase64() {
  const [preview, setPreview] = useState<string | null>(null)
  const [base64, setBase64] = useState('')
  const [filename, setFilename] = useState('')
  const [size, setSize] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)

  const MAX_SIZE = 5 * 1024 * 1024 // 5MB

  const processFile = useCallback((file: File) => {
    setError('')
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件')
      return
    }
    if (file.size > MAX_SIZE) {
      setError('图片不能超过 5MB（Base64 会膨胀约 33%）')
      return
    }

    setFilename(file.name)
    setSize((file.size / 1024).toFixed(1) + ' KB')

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setBase64(result)
      setPreview(result)
    }
    reader.readAsDataURL(file)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const copy = async () => {
    if (!base64) return
    await navigator.clipboard.writeText(base64)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  const clear = () => {
    setPreview(null)
    setBase64('')
    setFilename('')
    setSize('')
    setError('')
    setCopied(false)
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-10 sm:px-8">
      <Breadcrumb />
      {/* 顶部说明 */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-app-text mb-2">图片转 Base64</h1>
        <p className="text-sm text-app-muted">拖拽或选择图片，即时转换为 Data URL，一键复制。</p>
      </div>

      {/* 上传区 */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        className={`relative border-2 border-dashed rounded-2xl p-8 mb-6 text-center transition-all duration-200 ${
          dragging
            ? 'border-violet-400 bg-violet-50 dark:bg-violet-500/10'
            : 'border-app-border bg-app-card hover:border-violet-300'
        }`}
      >
        {/* 光斑 */}
        <div className="absolute -top-6 -left-6 w-20 h-20 rounded-full bg-violet-100/40 dark:bg-violet-500/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-6 -right-6 w-16 h-16 rounded-full bg-sky-50/50 dark:bg-violet-500/5 blur-2xl pointer-events-none" />

        <div className="relative">
          <div className="text-4xl mb-3">🖼️</div>
          <p className="text-sm text-app-text font-medium mb-1">
            {dragging ? '松开即可上传' : '拖拽图片到此处'}
          </p>
          <p className="text-xs text-app-muted mb-4">或</p>
          <label className="inline-block px-5 py-2.5 bg-app-text text-app-bg text-sm font-semibold rounded-xl cursor-pointer hover:opacity-90 transition">
            选择图片
            <input type="file" accept="image/*" onChange={onFileChange} className="hidden" />
          </label>
          <p className="text-xs text-app-muted mt-3">最大 5MB · {filename || '未选择文件'}</p>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* 预览 + 结果 */}
      {preview && (
        <div className="space-y-4">
          {/* 图片预览 */}
          <div className="bg-app-card border border-app-border rounded-2xl p-5 overflow-hidden">
            <div className="flex items-start gap-4">
              <img src={preview} alt="预览" className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-xl border border-app-border shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-app-text truncate">{filename}</p>
                <p className="text-xs text-app-muted mt-1">原始大小：{size}</p>
                <p className="text-xs text-app-muted">Base64 大小：{(base64.length / 1024).toFixed(1)} KB（约膨胀 33%）</p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={copy}
                    className="px-4 py-2 bg-app-bg border border-app-border rounded-xl text-xs text-app-text hover:border-violet-300 transition"
                  >
                    {copied ? '✓ 已复制' : '📋 复制 Base64'}
                  </button>
                  <button
                    onClick={clear}
                    className="px-4 py-2 bg-app-bg border border-app-border rounded-xl text-xs text-app-muted hover:text-red-500 transition"
                  >
                    清空
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 代码输出 */}
          <div className="bg-app-card border border-app-border rounded-2xl p-5 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-app-muted uppercase tracking-wider">Data URL</span>
              <span className="text-xs text-app-muted">{base64.length} 字符</span>
            </div>
            <textarea
              readOnly
              value={base64}
              className="w-full h-32 sm:h-40 px-4 py-3 bg-app-bg border border-app-border rounded-xl text-xs font-mono text-app-text resize-none focus:outline-none focus:border-violet-300"
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            />
          </div>
        </div>
      )}

      <p className="text-center text-xs text-app-muted mt-12">BitLeap · 纯前端 · 图片不上传服务器</p>
    </div>
  )
}