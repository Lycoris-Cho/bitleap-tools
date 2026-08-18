'use client'

import { useState, useCallback } from 'react'
import { Document, Packer, Paragraph, TextRun } from 'docx'
import { Breadcrumb } from '@/components/breadcrumb'
export default function PdfToWordPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [pageCount, setPageCount] = useState(0)
  const [textLength, setTextLength] = useState(0)

  // ✅ 生成的 Word 下载地址（内存里）
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
      {/* 标题 */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          📄 PDF 转 Word
        </h1>
        <p className="text-app-muted">
          提取 PDF 文本内容，生成可编辑的 Word 文档（纯前端处理）
        </p>
      </div>

      {/* 上传 */}
      <div className="mb-8">
        <label className="block w-full border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center cursor-pointer hover:bg-gray-50 transition">
          <input
            type="file"
            accept="application/pdf"
            onChange={onFileChange}
            className="hidden"
          />
          <div className="text-app-muted">
            点击上传或拖拽 PDF 文件到此处
          </div>
          <div className="text-sm text-app-muted mt-2">
            仅支持文本型 PDF，不支持扫描件
          </div>
        </label>
      </div>

      {/* 文件信息 */}
      {file && (
        <div className="mb-8 space-y-2 text-sm">
          <div>
            <span className="text-gray-500">文件名：</span>
            {file.name}
          </div>
          <div>
            <span className="text-gray-500">大小：</span>
            {formatSize(file.size)}
          </div>
          {pageCount > 0 && (
            <div>
              <span className="text-gray-500">页数：</span>
              {pageCount}
            </div>
          )}
          {textLength > 0 && (
            <div>
              <span className="text-gray-500">提取字数：</span>
              {textLength}
            </div>
          )}
        </div>
      )}

      {/* 生成按钮 */}
      {file && !blobUrl && (
        <div className="mb-10">
          <button
            onClick={generateWord}
            disabled={loading}
            className="px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition font-medium disabled:opacity-50"
          >
            {loading ? '生成中…' : '生成 Word 文档'}
          </button>
        </div>
      )}

      {/* ✅ 生成成功后的下载区域 */}
      {blobUrl && (
        <div className="mb-10 rounded-2xl border border-app-border bg-gray-50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-medium">✅ Word 文档已生成</div>
              <div className="text-sm text-gray-500 mt-1">
                {wordName}
              </div>
            </div>
            <button
              onClick={download}
              className="px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition font-medium"
            >
              下载 Word
            </button>
          </div>
          <p className="text-sm text-gray-500">
            文档已准备好，可多次下载。重新上传 PDF 会清空当前结果。
          </p>
        </div>
      )}

      {/* 使用说明 */}
      <div className="text-sm text-gray-500 leading-relaxed border-t pt-6">
        <p className="mb-2 font-medium text-gray-700">⚠️ 使用说明</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            本工具仅提取 PDF 中的文字内容，无法还原原始排版、表格、图片位置。
          </li>
          <li>
            适合论文、文档、电子书等以文字为主的 PDF。
          </li>
          <li>
            不支持扫描版 PDF（图片型），此类文件需要 OCR 识别。
          </li>
          <li>
            所有处理均在浏览器本地完成，文件不会上传到服务器。
          </li>
        </ul>
      </div>
    </div>
  )
}