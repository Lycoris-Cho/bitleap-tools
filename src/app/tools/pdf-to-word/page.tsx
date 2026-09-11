"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Document, Packer, Paragraph, TextRun } from "docx"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type ExtractPage = {
  page: number
  text: string
  items: number
}

type CopyKey = "text" | "report" | null

const PDFJS_WORKER_CDN = "https://cdn.jsdelivr.net/npm/pdfjs-dist@__VERSION__/legacy/build/pdf.worker.min.mjs"

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value)
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function normalizeFileName(name: string) {
  return name.replace(/\.pdf$/i, "") || "bitleap-pdf-text"
}

function extractPageText(items: any[]) {
  const rows: Array<{
    y: number
    items: Array<{
      x: number
      text: string
    }>
  }> = []

  for (const item of items) {
    if (!item || typeof item.str !== "string" || item.str === "") continue

    const transform = Array.isArray(item.transform) ? item.transform : [0, 0, 0, 0, 0, 0]
    const x = Number(transform[4] ?? 0)
    const y = Number(transform[5] ?? 0)

    let row = rows.find((current) => Math.abs(current.y - y) < 4)

    if (!row) {
      row = {
        y,
        items: [],
      }
      rows.push(row)
    }

    row.items.push({
      x,
      text: item.str,
    })
  }

  rows.sort((a, b) => b.y - a.y)

  return rows
    .map((row) =>
      row.items
        .sort((a, b) => a.x - b.x)
        .map((item) => item.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean)
    .join("\n")
}

function buildPlainText(pages: ExtractPage[]) {
  return pages
    .map((page) => `--- 第 ${page.page} 页 ---\n\n${page.text || "[本页未提取到文本]"}`)
    .join("\n\n")
}

function makeParagraph(text: string, options?: { bold?: boolean; size?: number }) {
  return new Paragraph({
    children: [
      new TextRun({
        text: text || " ",
        bold: options?.bold,
        size: options?.size,
      }),
    ],
  })
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 500)
}

function downloadText(content: string, filename: string) {
  const blob = new Blob([content], {
    type: "text/plain;charset=utf-8",
  })
  downloadBlob(blob, filename)
}

async function loadPdfJs() {
  const PDFJS = await import("pdfjs-dist/legacy/build/pdf.mjs")
  const version = (PDFJS as any).version || "5.6.205"
  ;(PDFJS as any).GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN.replace("__VERSION__", version)
  return PDFJS as any
}

export default function PdfToWordPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pageCount, setPageCount] = useState(0)
  const [processedPages, setProcessedPages] = useState(0)
  const [pages, setPages] = useState<ExtractPage[]>([])
  const [docBlob, setDocBlob] = useState<Blob | null>(null)
  const [wordName, setWordName] = useState("")
  const [error, setError] = useState("")
  const [copied, setCopied] = useState<CopyKey>(null)

  const pageRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fullText = useMemo(() => buildPlainText(pages), [pages])
  const textLength = useMemo(() => pages.reduce((sum, page) => sum + page.text.length, 0), [pages])
  const extractedItems = useMemo(() => pages.reduce((sum, page) => sum + page.items, 0), [pages])

  const report = useMemo(
    () =>
      [
        "BitLeap PDF 转 Word 提取报告",
        "",
        file ? `文件：${file.name}` : "文件：暂无",
        file ? `大小：${formatSize(file.size)}` : "大小：暂无",
        `页数：${pageCount}`,
        `已提取页数：${pages.length}`,
        `文本字符：${textLength}`,
        `文本项目：${extractedItems}`,
        "",
        fullText || "暂无提取文本",
      ].join("\n"),
    [extractedItems, file, fullText, pageCount, pages.length, textLength],
  )

  useEffect(() => {
    if (
      !pageRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    const ctx = gsap.context(() => {
      gsap.from(".pdfword-intro", {
        y: 22,
        opacity: 0,
        duration: 0.78,
        stagger: 0.055,
        ease: "power3.out",
      })

      gsap.to(".pdfword-orbit-a", {
        rotation: 360,
        duration: 70,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })

      gsap.to(".pdfword-orbit-b", {
        rotation: -360,
        duration: 106,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })
    }, pageRef)

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (
      !previewRef.current ||
      !pages.length ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    gsap.fromTo(
      previewRef.current,
      { opacity: 0.62, y: 5 },
      {
        opacity: 1,
        y: 0,
        duration: 0.24,
        ease: "power2.out",
        overwrite: true,
      },
    )
  }, [pages.length, docBlob])

  const resetResult = () => {
    setPageCount(0)
    setProcessedPages(0)
    setPages([])
    setDocBlob(null)
    setWordName("")
    setError("")
    setCopied(null)
  }

  const acceptFile = useCallback((nextFile: File) => {
    if (
      nextFile.type !== "application/pdf" &&
      !nextFile.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("请选择 PDF 文件。")
      return
    }

    setFile(nextFile)
    resetResult()
  }, [])

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0]
    if (nextFile) acceptFile(nextFile)
    event.target.value = ""
  }

  const generateWord = async () => {
    if (!file) return

    setLoading(true)
    setError("")
    setDocBlob(null)
    setPages([])
    setProcessedPages(0)

    try {
      const PDFJS = await loadPdfJs()
      const buffer = await file.arrayBuffer()
      const pdf = await PDFJS.getDocument({
        data: buffer,
      }).promise

      setPageCount(pdf.numPages)

      const extractedPages: ExtractPage[] = []

      for (let index = 1; index <= pdf.numPages; index++) {
        const page = await pdf.getPage(index)
        const content = await page.getTextContent()
        const items = Array.isArray(content.items) ? content.items : []
        const pageText = extractPageText(items)

        extractedPages.push({
          page: index,
          text: pageText,
          items: items.length,
        })

        setProcessedPages(index)
        setPages([...extractedPages])
      }

      const children: Paragraph[] = [
        makeParagraph(normalizeFileName(file.name), {
          bold: true,
          size: 32,
        }),
        makeParagraph(`Source PDF: ${file.name}`),
        makeParagraph(`Pages: ${pdf.numPages}`),
        makeParagraph(`Extracted characters: ${extractedPages.reduce((sum, page) => sum + page.text.length, 0)}`),
        makeParagraph(" "),
      ]

      for (const page of extractedPages) {
        children.push(
          makeParagraph(`第 ${page.page} 页`, {
            bold: true,
            size: 26,
          }),
        )

        const lines = page.text ? page.text.split(/\n+/) : ["[本页未提取到文本]"]

        for (const line of lines) {
          children.push(makeParagraph(line))
        }

        children.push(makeParagraph(" "))
      }

      const doc = new Document({
        sections: [
          {
            children,
          },
        ],
      })

      const blob = await Packer.toBlob(doc)
      setDocBlob(blob)
      setWordName(`${normalizeFileName(file.name)}.docx`)

      if (extractedPages.every((page) => !page.text.trim())) {
        setError("PDF 中没有提取到可复制文本。它可能是扫描件或图片型 PDF，需要 OCR。")
      }
    } catch (runError) {
      setError(
        runError instanceof Error
          ? runError.message
          : "PDF 解析或 Word 生成失败。",
      )
    } finally {
      setLoading(false)
    }
  }

  const copy = async (value: string, key: CopyKey) => {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {}
  }

  const clear = () => {
    setFile(null)
    resetResult()
  }

  const progress =
    pageCount > 0 ? Math.round((processedPages / pageCount) * 100) : 0

  return (
    <div ref={pageRef} className="min-h-screen overflow-hidden bg-[#efede6] text-[#22231f] selection:bg-[#22231f] selection:text-white">
      <style>{`
        .pdfword-scroll::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }

        .pdfword-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .pdfword-scroll::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(34,35,31,.13);
        }

        .pdfword-dark-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,.14);
        }

        .pdfword-grid {
          background-image:
            linear-gradient(rgba(34,35,31,.032) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,35,31,.032) 1px, transparent 1px);
          background-size: 30px 30px;
        }

        .pdfword-num {
          font-variant-numeric: tabular-nums lining-nums;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_9%,rgba(178,151,91,.10),transparent_27%),radial-gradient(circle_at_8%_88%,rgba(73,107,91,.08),transparent_31%)]" />
        <div className="pdfword-orbit-a absolute right-[-20vw] top-[-24vw] h-[58vw] w-[58vw] rounded-full border border-black/[.04]">
          <span className="absolute left-[15%] top-[43%] h-2 w-2 rounded-full bg-[#b28d48]/38" />
        </div>
        <div className="pdfword-orbit-b absolute bottom-[-26vw] left-[-19vw] h-[53vw] w-[53vw] rounded-full border border-black/[.032]">
          <span className="absolute right-[14%] top-[31%] h-1.5 w-1.5 rounded-full bg-[#52685d]/35" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1500px] px-5 pb-10 pt-6 sm:px-8">
        <div className="pdfword-intro">
          <Breadcrumb />
        </div>

        <header className="pdfword-intro mt-8 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/27">
              PDF TO WORD STUDIO
            </div>
            <h1 className="mt-4 max-w-[900px] text-[clamp(48px,6.35vw,90px)] font-semibold leading-[1.03] tracking-[-.055em]">
              把 PDF，
              <br />
              变成可编辑文字。
            </h1>
          </div>

          <div>
            <p className="max-w-[560px] text-[11px] leading-6 text-black/40">
              提取文本型 PDF 的文字内容，生成可编辑 DOCX，并提供纯文本预览、复制和 TXT 导出。适合文档、论文、说明书和电子书草稿整理。
            </p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[8px] text-black/25">
              <span>PDFJS TEXT EXTRACT</span>
              <span>DOCX OUTPUT</span>
              <span>LOCAL CONTENT</span>
              <span>NO OCR</span>
            </div>
          </div>
        </header>

        <section className="pdfword-intro mt-7 grid gap-7 lg:grid-cols-[.68fr_1.32fr]">
          <aside className="min-w-0">
            <div className="pdfword-grid rounded-[30px] border border-black/[.075] bg-white/24 p-5">
              <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={onFileChange} />

              <div
                onDragEnter={() => setIsDragging(true)}
                onDragLeave={() => setIsDragging(false)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault()
                  setIsDragging(false)
                  const nextFile = event.dataTransfer.files?.[0]
                  if (nextFile) acceptFile(nextFile)
                }}
                className={`grid min-h-[360px] place-items-center rounded-[25px] border border-dashed p-8 text-center transition ${isDragging ? "border-[#52685d]/55 bg-[#52685d]/8" : "border-black/[.16] bg-white/24"}`}
              >
                <div>
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#22231f] font-mono text-white">
                    PDF
                  </div>
                  <h2 className="mt-6 text-3xl font-semibold tracking-[-.045em]">
                    拖入 PDF 或选择文件。
                  </h2>
                  <p className="mx-auto mt-4 max-w-[360px] text-[9px] leading-5 text-black/34">
                    选择后会立即显示文件信息；点击生成后再开始提取文字和创建 Word。
                  </p>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-6 rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white">
                    选择 PDF
                  </button>
                </div>
              </div>

              {file && (
                <div className="mt-5 overflow-hidden rounded-[22px] border border-black/[.075] bg-white/28">
                  <div className="border-b border-black/[.06] px-5 py-4">
                    <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">
                      FILE READY
                    </div>
                    <div className="mt-2 break-all font-mono text-[10px] leading-5 text-black/58">
                      {file.name}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-px bg-black/[.06]">
                    {[
                      ["大小", formatSize(file.size)],
                      ["类型", file.type || "application/pdf"],
                      ["页数", pageCount ? formatNumber(pageCount) : "待解析"],
                      ["文本", textLength ? formatNumber(textLength) : "待提取"],
                    ].map(([label, value]) => (
                      <div key={label} className="bg-[#f3f0e8]/92 p-4">
                        <div className="text-[8px] text-black/24">{label}</div>
                        <div className="pdfword-num mt-2 break-all font-mono text-[12px] font-semibold text-black/61">{value}</div>
                      </div>
                    ))}
                  </div>

                  {loading && (
                    <div className="border-t border-black/[.06] px-5 py-4">
                      <div className="mb-2 flex justify-between text-[8px] text-black/28">
                        <span>正在提取第 {processedPages || 1} / {pageCount || "?"} 页</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-black/[.06]">
                        <div className="h-full rounded-full bg-[#52685d] transition-[width] duration-300" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="mt-5 rounded-[20px] border border-[#965744]/18 bg-[#965744]/7 p-4">
                  <div className="text-[8px] font-semibold tracking-[.12em] text-[#965744]">
                    NOTICE
                  </div>
                  <p className="mt-2 break-words text-[9px] leading-5 text-[#965744]">
                    {error}
                  </p>
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={generateWord} disabled={!file || loading} className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white transition hover:scale-[1.01] active:scale-[.98] disabled:opacity-30">
                  {loading ? "生成中…" : docBlob ? "重新生成 Word" : "生成 Word"}
                </button>
                <button type="button" onClick={clear} disabled={!file && !pages.length} className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 transition hover:bg-white/40 disabled:opacity-30">
                  清空
                </button>
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="flex flex-col gap-4 border-b border-black/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-[8px] font-semibold tracking-[.14em] text-black/23">
                  EXTRACTED TEXT
                </div>
                <h2 className="mt-2 text-[clamp(31px,4vw,48px)] font-semibold leading-none tracking-[-.045em]">
                  {docBlob ? "Word 已准备好。" : pages.length ? "正在生成可编辑文本。" : "等待 PDF。"}
                </h2>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => copy(fullText, "text")} disabled={!fullText} className="rounded-full border border-black/[.09] px-4 py-2.5 text-[8px] font-semibold text-black/38 transition hover:bg-white/40 disabled:opacity-25">
                  {copied === "text" ? "✓ 已复制" : "复制文本"}
                </button>
                <button type="button" onClick={() => downloadText(fullText, `${file ? normalizeFileName(file.name) : "bitleap-pdf-text"}.txt`)} disabled={!fullText} className="rounded-full border border-black/[.09] px-4 py-2.5 text-[8px] font-semibold text-black/38 transition hover:bg-white/40 disabled:opacity-25">
                  导出 TXT
                </button>
              </div>
            </div>

            <div ref={previewRef} className="mt-5 overflow-hidden rounded-[30px] border border-black/[.08] bg-[#151714]">
              <div className="flex h-12 items-center justify-between border-b border-white/[.065] px-5">
                <span className="text-[8px] font-semibold tracking-[.13em] text-white/27">
                  TEXT PREVIEW
                </span>
                <span className="pdfword-num text-[8px] text-white/18">
                  {pages.length ? `${formatNumber(pages.length)} pages` : "WAITING"}
                </span>
              </div>

              <pre className="pdfword-dark-scroll min-h-[530px] max-h-[650px] overflow-auto whitespace-pre-wrap break-words p-5 font-mono text-[10px] leading-6 text-[#cbd8cd] sm:p-6">
                {fullText || "选择 PDF 后，提取出的文字会显示在这里。"}
              </pre>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-[8px] text-black/25">
                <span>{pageCount ? `${formatNumber(pageCount)} pages` : "no file"}</span>
                <span>{formatNumber(textLength)} chars</span>
                <span>{formatNumber(extractedItems)} text items</span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => docBlob && downloadBlob(docBlob, wordName)} disabled={!docBlob} className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white transition hover:scale-[1.01] active:scale-[.98] disabled:opacity-30">
                  下载 Word
                </button>
                <button type="button" onClick={() => copy(report, "report")} disabled={!fullText} className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 transition hover:bg-white/40 disabled:opacity-30">
                  {copied === "report" ? "✓ 已复制报告" : "复制报告"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="pdfword-intro mt-12 grid gap-8 border-t border-black/10 pt-7 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">TEXT PDF ONLY</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              这个工具提取 PDF 内部已有文字，不做 OCR。扫描件、图片型 PDF 可能只能得到很少或没有文字。
            </p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">EDITABLE DOCX</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              生成的 Word 会按页整理文本，方便后续编辑、复制和二次排版，但不会还原复杂表格或图片布局。
            </p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">LOCAL CONTENT</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              PDF 内容在浏览器中读取和转换，不会上传文件内容。页面会动态加载 PDF.js worker 来完成解析。
            </p>
          </div>
        </section>

        <div className="mt-12 border-t border-black/[.08] pt-5">
          <FooterNote />
        </div>
      </div>
    </div>
  )
}
