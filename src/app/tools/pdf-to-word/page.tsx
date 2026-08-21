'use client'

import { useState } from 'react'
import { Document, Packer, Paragraph, TextRun } from 'docx'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

export default function PdfToWordPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [pageCount, setPageCount] = useState(0)
  const [textLength, setTextLength] = useState(0)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [wordName, setWordName] = useState('')

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f || !f.type.includes('pdf')) return
    setFile(f)
    setPageCount(0)
    setTextLength(0)
    setBlobUrl(null)
    setWordName('')
  }

  const extractText = async (): Promise<string> => {
    if (!file) return ''
    const PDFJS = await import('pdfjs-dist/legacy/build/pdf.mjs')
    PDFJS.GlobalWorkerOptions.workerSrc =
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.6.205/legacy/build/pdf.worker.min.mjs'

    const buffer = await file.arrayBuffer()
    const pdf = await PDFJS.getDocument({ data: buffer }).promise
    setPageCount(pdf.numPages)

    let fullText = ''
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items
        .map((item: any) => item.str)
        .join(' ')
      fullText += `\n\n--- 第 ${i} 页 ---\n\n${pageText}`
    }
    return fullText
  }

  const generateWord = async () => {
    if (!file) return
    setLoading(true)
    setBlobUrl(null)

    try {
      const text = await extractText()
      setTextLength(text.length)

      const doc = new Document({
        sections: [
          {
            children: text
              .split('\n')
              .map(
                (line) =>
                  new Paragraph({
                    children: [new TextRun(line || ' ')],
                  })
              ),
          },
        ],
      })

      const blob = await Packer.toBlob(doc)
      const url = URL.createObjectURL(blob)
      setBlobUrl(url)
      setWordName(file.name.replace(/\.pdf$/i, '') + '.docx')
    } finally {
      setLoading(false)
    }
  }

  const download = () => {
    if (!blobUrl || !wordName) return
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = wordName
    a.click()
  }

  const formatSize = (bytes: number) =>
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / 1024 / 1024).toFixed(2)} MB`

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">PDF 转 Word</h1>
        <p className="text-app-muted text-sm">提取 PDF 文本内容，生成可编辑的 Word 文档（纯前端处理）</p>
      </div>

      {/* 上传区 */}
      <label className="block w-full border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center cursor-pointer hover:border-violet-400 hover:bg-violet-50/30 transition-all mb-6">
        <input
          type="file"
          accept="application/pdf"
          onChange={onFileChange}
          className="hidden"
        />
        <div className="text-gray-600 font-medium text-lg mb-1">点击上传或拖拽 PDF 文件到此处</div>
        <div className="text-xs text-app-muted">仅支持文本型 PDF，不支持扫描件</div>
      </label>

      {/* 文件信息卡片 */}
      {file && (
        <div className="mb-6 p-4 bg-app-bg border border-app-border rounded-xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-xs text-gray-500 block mb-0.5">文件名</span>
              <span className="font-medium text-gray-800 truncate block" title={file.name}>{file.name}</span>
            </div>
            <div>
              <span className="text-xs text-gray-500 block mb-0.5">大小</span>
              <span className="font-medium text-gray-800">{formatSize(file.size)}</span>
            </div>
            {pageCount > 0 && (
              <div>
                <span className="text-xs text-gray-500 block mb-0.5">页数</span>
                <span className="font-medium text-gray-800">{pageCount}</span>
              </div>
            )}
            {textLength > 0 && (
              <div>
                <span className="text-xs text-gray-500 block mb-0.5">提取字数</span>
                <span className="font-medium text-gray-800">{textLength.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 生成按钮 */}
      {file && !blobUrl && (
        <div className="mb-8">
          <button
            onClick={generateWord}
            disabled={loading}
            className="px-6 py-3 bg-violet-500 text-white rounded-xl text-sm font-medium hover:bg-violet-600 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 shadow-sm shadow-violet-500/20"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                生成中…
              </span>
            ) : (
              '🔧 生成 Word 文档'
            )}
          </button>
        </div>
      )}

      {/* 生成成功 */}
      {blobUrl && (
        <div className="mb-8 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="font-semibold text-emerald-800">✅ Word 文档已生成</div>
              <div className="text-sm text-emerald-600 mt-0.5">{wordName}</div>
            </div>
            <button
              onClick={download}
              className="px-6 py-2.5 bg-violet-500 text-white rounded-xl text-sm font-medium hover:bg-violet-600 active:scale-95 transition-all shadow-sm shadow-violet-500/20"
            >
              📥 下载 Word
            </button>
          </div>
          <p className="text-xs text-emerald-600">文档已准备好，可多次下载。重新上传 PDF 会清空当前结果。</p>
        </div>
      )}

      {/* 说明卡片 */}
      <div className="mt-10 p-4 bg-gray-50 border border-app-border rounded-xl">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">⚠️ 使用说明</h3>
        <ul className="text-xs text-app-muted space-y-1.5 leading-relaxed">
          <li>• 本工具仅提取 PDF 中的文字内容，无法还原原始排版、表格、图片位置</li>
          <li>• 适合论文、文档、电子书等以文字为主的文本型 PDF</li>
          <li>• 不支持扫描版 PDF（图片型），此类文件需要 OCR 识别</li>
          <li>• 所有处理均在浏览器本地完成，文件不会上传到服务器</li>
        </ul>
      </div>

      <FooterNote />
    </div>
  )
}