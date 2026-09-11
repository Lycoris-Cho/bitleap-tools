"use client"

import type { ChangeEvent, CSSProperties, DragEvent, ReactNode } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type FitMode = "contain" | "cover" | "stretch"
type BackgroundMode = "transparent" | "white" | "black" | "custom"
type CopyKey = "html" | "manifest" | "report" | null

type SourceInfo = {
  name: string
  size: number
  type: string
  width: number
  height: number
}

type PreviewItem = {
  size: number
  url: string
  bytes: number
}

type IcoOutput = {
  url: string
  blob: Blob
  sizes: number[]
  generatedAt: string
}

const SIZE_OPTIONS = [16, 24, 32, 48, 64, 128, 256]
const DEFAULT_SIZES = [16, 32, 48, 64, 128, 256]
const MAX_FILE_SIZE = 24 * 1024 * 1024

function formatSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function cleanName(name: string) {
  const base = name.replace(/\.[^.]+$/, "").trim() || "favicon"
  return base.replace(/[^\w\u4e00-\u9fa5-]+/g, "-").replace(/-+/g, "-")
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("图片加载失败，请确认文件没有损坏。"))
    image.src = url
  })
}

function canvasToPngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("PNG 编码失败，当前浏览器可能不支持 Canvas 导出。"))
        return
      }
      resolve(blob)
    }, "image/png")
  })
}

function writeUint16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, true)
}

function writeUint32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value, true)
}

async function createPngForSize(
  image: HTMLImageElement,
  size: number,
  fitMode: FitMode,
  backgroundMode: BackgroundMode,
  customBackground: string,
  padding: number,
  radius: number,
) {
  const canvas = document.createElement("canvas")
  const scale = Math.max(1, Math.min(3, window.devicePixelRatio || 1))
  canvas.width = size * scale
  canvas.height = size * scale

  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("浏览器无法创建 Canvas 上下文。")

  ctx.scale(scale, scale)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"

  const bgColor = backgroundMode === "transparent" ? "" : backgroundMode === "white" ? "#ffffff" : backgroundMode === "black" ? "#111111" : customBackground

  if (bgColor) {
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, size, size)
  }

  const inset = Math.max(0, Math.min(size / 3, (padding / 100) * size))
  const target = Math.max(1, size - inset * 2)

  ctx.save()
  if (radius > 0) {
    const r = (radius / 100) * (size / 2)
    ctx.beginPath()
    ctx.moveTo(inset + r, inset)
    ctx.arcTo(inset + target, inset, inset + target, inset + target, r)
    ctx.arcTo(inset + target, inset + target, inset, inset + target, r)
    ctx.arcTo(inset, inset + target, inset, inset, r)
    ctx.arcTo(inset, inset, inset + target, inset, r)
    ctx.closePath()
    ctx.clip()
  }

  const imageRatio = image.naturalWidth / image.naturalHeight
  let drawWidth = target
  let drawHeight = target

  if (fitMode === "contain") {
    if (imageRatio > 1) {
      drawWidth = target
      drawHeight = target / imageRatio
    } else {
      drawHeight = target
      drawWidth = target * imageRatio
    }
  }

  if (fitMode === "cover") {
    if (imageRatio > 1) {
      drawHeight = target
      drawWidth = target * imageRatio
    } else {
      drawWidth = target
      drawHeight = target / imageRatio
    }
  }

  ctx.drawImage(image, inset + (target - drawWidth) / 2, inset + (target - drawHeight) / 2, drawWidth, drawHeight)
  ctx.restore()

  return canvasToPngBlob(canvas)
}

async function buildIcoBlob(items: Array<{ size: number; blob: Blob }>) {
  const pngBuffers = await Promise.all(items.map((item) => item.blob.arrayBuffer()))
  const count = pngBuffers.length
  const headerSize = 6
  const directorySize = 16 * count
  const totalSize = headerSize + directorySize + pngBuffers.reduce((sum, buffer) => sum + buffer.byteLength, 0)
  const buffer = new ArrayBuffer(totalSize)
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  writeUint16(view, 0, 0)
  writeUint16(view, 2, 1)
  writeUint16(view, 4, count)

  let imageOffset = headerSize + directorySize

  pngBuffers.forEach((pngBuffer, index) => {
    const offset = headerSize + index * 16
    const size = items[index].size

    view.setUint8(offset, size >= 256 ? 0 : size)
    view.setUint8(offset + 1, size >= 256 ? 0 : size)
    view.setUint8(offset + 2, 0)
    view.setUint8(offset + 3, 0)
    writeUint16(view, offset + 4, 1)
    writeUint16(view, offset + 6, 32)
    writeUint32(view, offset + 8, pngBuffer.byteLength)
    writeUint32(view, offset + 12, imageOffset)

    bytes.set(new Uint8Array(pngBuffer), imageOffset)
    imageOffset += pngBuffer.byteLength
  })

  return new Blob([buffer], { type: "image/x-icon" })
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 500)
}

function htmlSnippet(filename: string) {
  return `<link rel="icon" href="/${filename}" sizes="any" />`
}

function manifestSnippet(filename: string, sizes: number[]) {
  return JSON.stringify(
    {
      icons: [
        {
          src: `/${filename}`,
          sizes: sizes.map((size) => `${size}x${size}`).join(" "),
          type: "image/x-icon",
        },
      ],
    },
    null,
    2,
  )
}

function reportText(source: SourceInfo | null, output: IcoOutput | null, fitMode: FitMode, backgroundMode: BackgroundMode, padding: number, radius: number) {
  return [
    "BitLeap ICO Forge Report",
    "",
    `Source: ${source ? source.name : "—"}`,
    `Source size: ${source ? formatSize(source.size) : "—"}`,
    `Source dimension: ${source ? `${source.width}×${source.height}` : "—"}`,
    `Output: ${output ? formatSize(output.blob.size) : "—"}`,
    `Icon sizes: ${output ? output.sizes.map((size) => `${size}×${size}`).join(", ") : "—"}`,
    `Fit mode: ${fitMode}`,
    `Background: ${backgroundMode}`,
    `Padding: ${padding}%`,
    `Corner radius: ${radius}%`,
  ].join("\n")
}

function IconGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M5 5h14v14H5z" />
      <path d="M9 9h6v6H9z" />
      <path d="M3 9h2M3 15h2M19 9h2M19 15h2M9 3v2M15 3v2M9 19v2M15 19v2" />
    </svg>
  )
}

function UploadGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M12 15V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M5 20h14" />
    </svg>
  )
}

function ButtonPill({
  active,
  children,
  onClick,
  disabled,
}: {
  active?: boolean
  children: ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} aria-pressed={active} className={`rounded-full border px-3.5 py-2 text-[10px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-35 ${active ? "border-[#1e4037] bg-[#1e4037] text-[#f6efe3]" : "border-black/[0.08] bg-white/55 text-stone-500 hover:border-stone-300 hover:bg-white hover:text-stone-950"}`}>
      {children}
    </button>
  )
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-[22px] border border-black/[0.06] bg-white/58 p-4 shadow-[0_18px_55px_-48px_rgba(35,28,18,.34)]">
      <div className="text-[8px] font-semibold uppercase tracking-[0.18em] text-stone-400">{label}</div>
      <div className="ico-num mt-3 truncate font-mono text-lg font-semibold tracking-[-0.03em] text-stone-950">{value}</div>
      {hint && <div className="mt-1 text-[10px] leading-4 text-stone-400">{hint}</div>}
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
  suffix?: string
  onChange: (value: number) => void
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-stone-400">{label}</span>
        <span className="rounded-full border border-black/[0.06] bg-white/70 px-2.5 py-1 font-mono text-[10px] text-stone-600">
          {value}
          {suffix}
        </span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-[#1e4037]" />
    </label>
  )
}

export default function ImageToIcoPage() {
  const pageRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const sourceUrlRef = useRef<string | null>(null)
  const outputUrlRef = useRef<string | null>(null)
  const previewUrlsRef = useRef<string[]>([])

  const [file, setFile] = useState<File | null>(null)
  const [sourceUrl, setSourceUrl] = useState("")
  const [sourceInfo, setSourceInfo] = useState<SourceInfo | null>(null)
  const [selectedSizes, setSelectedSizes] = useState<number[]>(DEFAULT_SIZES)
  const [focusSize, setFocusSize] = useState(64)
  const [fitMode, setFitMode] = useState<FitMode>("contain")
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>("transparent")
  const [customBackground, setCustomBackground] = useState("#f7f0e4")
  const [padding, setPadding] = useState(8)
  const [radius, setRadius] = useState(18)
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([])
  const [output, setOutput] = useState<IcoOutput | null>(null)
  const [message, setMessage] = useState("")
  const [processing, setProcessing] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [copied, setCopied] = useState<CopyKey>(null)

  const outputName = useMemo(() => `${file ? cleanName(file.name) : "favicon"}.ico`, [file])
  const sortedSizes = useMemo(() => selectedSizes.slice().sort((a, b) => a - b), [selectedSizes])
  const report = useMemo(() => reportText(sourceInfo, output, fitMode, backgroundMode, padding, radius), [backgroundMode, fitMode, output, padding, radius, sourceInfo])
  const canGenerate = Boolean(file && sourceUrl && sourceInfo && selectedSizes.length && !processing)
  const selectedPreview = previewItems.find((item) => item.size === focusSize) || previewItems[previewItems.length - 1]

  const clearPreviewUrls = useCallback(() => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    previewUrlsRef.current = []
  }, [])

  const revokeOutput = useCallback(() => {
    if (outputUrlRef.current) {
      URL.revokeObjectURL(outputUrlRef.current)
      outputUrlRef.current = null
    }
  }, [])

  const revokeAll = useCallback(() => {
    if (sourceUrlRef.current) {
      URL.revokeObjectURL(sourceUrlRef.current)
      sourceUrlRef.current = null
    }
    clearPreviewUrls()
    revokeOutput()
  }, [clearPreviewUrls, revokeOutput])

  const reset = useCallback(() => {
    revokeAll()
    setFile(null)
    setSourceUrl("")
    setSourceInfo(null)
    setSelectedSizes(DEFAULT_SIZES)
    setFocusSize(64)
    setFitMode("contain")
    setBackgroundMode("transparent")
    setCustomBackground("#f7f0e4")
    setPadding(8)
    setRadius(18)
    setPreviewItems([])
    setOutput(null)
    setMessage("")
    setProcessing(false)
    setDragActive(false)
    if (inputRef.current) inputRef.current.value = ""
  }, [revokeAll])

  const acceptFile = useCallback(
    async (nextFile: File) => {
      setMessage("")

      if (!nextFile.type.startsWith("image/")) {
        setMessage("请选择图片文件。")
        return
      }

      if (nextFile.size > MAX_FILE_SIZE) {
        setMessage(`文件不能超过 ${formatSize(MAX_FILE_SIZE)}。`)
        return
      }

      revokeAll()
      setOutput(null)
      setPreviewItems([])
      setFile(nextFile)

      const url = URL.createObjectURL(nextFile)
      sourceUrlRef.current = url
      setSourceUrl(url)

      try {
        const image = await loadImage(url)
        setSourceInfo({
          name: nextFile.name,
          size: nextFile.size,
          type: nextFile.type || "image/*",
          width: image.naturalWidth,
          height: image.naturalHeight,
        })
        setMessage("图片已读取，可调整尺寸和图标边距。")
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "图片读取失败。")
      }
    },
    [revokeAll],
  )

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0]
    if (!nextFile) return
    void acceptFile(nextFile)
    event.target.value = ""
  }

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setDragActive(false)
    const nextFile = event.dataTransfer.files?.[0]
    if (nextFile) void acceptFile(nextFile)
  }

  const toggleSize = (size: number) => {
    setSelectedSizes((current) => {
      if (current.includes(size)) {
        const next = current.filter((item) => item !== size)
        return next.length ? next : current
      }
      return [...current, size]
    })
    setFocusSize(size)
  }

  const generatePreviews = useCallback(async () => {
    if (!sourceUrl || !sourceInfo || !selectedSizes.length) return

    try {
      const image = await loadImage(sourceUrl)
      const blobs = await Promise.all(
        sortedSizes.map(async (size) => ({
          size,
          blob: await createPngForSize(image, size, fitMode, backgroundMode, customBackground, padding, radius),
        })),
      )

      clearPreviewUrls()
      const nextPreviewItems = blobs.map((item) => {
        const url = URL.createObjectURL(item.blob)
        previewUrlsRef.current.push(url)
        return {
          size: item.size,
          url,
          bytes: item.blob.size,
        }
      })

      setPreviewItems(nextPreviewItems)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "图标预览生成失败。")
    }
  }, [backgroundMode, clearPreviewUrls, customBackground, fitMode, padding, radius, selectedSizes.length, sortedSizes, sourceInfo, sourceUrl])

  const generateIco = useCallback(async () => {
    if (!sourceUrl || !sourceInfo || !selectedSizes.length) return

    setProcessing(true)
    setMessage("正在生成真正的 ICO 文件…")

    try {
      const image = await loadImage(sourceUrl)
      const pngItems = await Promise.all(
        sortedSizes.map(async (size) => ({
          size,
          blob: await createPngForSize(image, size, fitMode, backgroundMode, customBackground, padding, radius),
        })),
      )

      const icoBlob = await buildIcoBlob(pngItems)
      revokeOutput()
      const url = URL.createObjectURL(icoBlob)
      outputUrlRef.current = url

      setOutput({
        url,
        blob: icoBlob,
        sizes: sortedSizes,
        generatedAt: new Date().toISOString(),
      })
      setMessage(`已生成 ${sortedSizes.length} 个尺寸的 .ico 文件。`)
      requestAnimationFrame(() => {
        if (!pageRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
        gsap.fromTo(".ico-output-pop", { scale: 0.96, opacity: 0.45 }, { scale: 1, opacity: 1, duration: 0.36, ease: "power3.out" })
      })
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ICO 生成失败。")
    } finally {
      setProcessing(false)
    }
  }, [backgroundMode, customBackground, fitMode, padding, radius, revokeOutput, selectedSizes.length, sortedSizes, sourceInfo, sourceUrl])

  useEffect(() => {
    return () => revokeAll()
  }, [revokeAll])

  useEffect(() => {
    if (!sourceUrl || !sourceInfo) return
    const timer = window.setTimeout(() => {
      void generatePreviews()
    }, 220)
    return () => window.clearTimeout(timer)
  }, [generatePreviews, sourceInfo, sourceUrl])

  useEffect(() => {
    if (!pageRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      gsap.from(".ico-enter", { y: 16, opacity: 0, duration: 0.62, stagger: 0.055, ease: "power3.out" })
      gsap.to(".ico-orb", { y: -10, x: 8, duration: 6.2, repeat: -1, yoyo: true, ease: "sine.inOut" })
      gsap.to(".ico-chip", { y: -5, duration: 2.8, repeat: -1, yoyo: true, stagger: 0.12, ease: "sine.inOut" })
    }, pageRef)

    return () => ctx.revert()
  }, [])

  const copyText = async (value: string, key: CopyKey, success: string) => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      setMessage(success)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {
      setMessage("复制失败，浏览器可能未授权剪贴板。")
    }
  }

  const downloadIco = () => {
    if (!output) return
    downloadBlob(output.blob, outputName)
  }

  const downloadPng = async (size: number) => {
    if (!sourceUrl) return
    try {
      const image = await loadImage(sourceUrl)
      const blob = await createPngForSize(image, size, fitMode, backgroundMode, customBackground, padding, radius)
      downloadBlob(blob, `${file ? cleanName(file.name) : "favicon"}-${size}x${size}.png`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "PNG 导出失败。")
    }
  }

  return (
    <div ref={pageRef} className="relative min-h-[calc(100dvh-4rem)] overflow-hidden bg-[#ede6da] text-[#18140f]">
      <style>{`
        .ico-scroll::-webkit-scrollbar { width:5px; height:5px; }
        .ico-scroll::-webkit-scrollbar-track { background:transparent; }
        .ico-scroll::-webkit-scrollbar-thumb { background:rgba(24,20,15,.2); border-radius:999px; }
        .ico-num { font-variant-numeric:tabular-nums lining-nums; }
        .ico-checker { background-image:linear-gradient(45deg,rgba(20,16,12,.08) 25%,transparent 25%),linear-gradient(-45deg,rgba(20,16,12,.08) 25%,transparent 25%),linear-gradient(45deg,transparent 75%,rgba(20,16,12,.08) 75%),linear-gradient(-45deg,transparent 75%,rgba(20,16,12,.08) 75%); background-size:18px 18px; background-position:0 0,0 9px,9px -9px,-9px 0px; }
      `}</style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_8%,rgba(255,255,255,.9),transparent_27%),radial-gradient(circle_at_82%_18%,rgba(69,96,82,.18),transparent_32%),radial-gradient(circle_at_18%_88%,rgba(217,188,127,.22),transparent_28%),linear-gradient(180deg,#fbf8ef_0%,#ede6da_56%,#e4d8c5_100%)]" />
      <div className="ico-orb pointer-events-none absolute -right-32 top-20 h-[480px] w-[480px] rounded-full bg-[#1e4037]/10 blur-[120px]" />
      <div className="ico-orb pointer-events-none absolute -left-28 bottom-10 h-[380px] w-[380px] rounded-full bg-white/48 blur-[110px]" />

      <main className="relative z-10 mx-auto max-w-[1560px] px-5 py-6 sm:px-8 lg:px-10">
        <div className="ico-enter inline-flex max-w-max">
          <Breadcrumb />
        </div>

        <header className="ico-enter mt-8 grid gap-8 border-b border-black/[0.07] pb-8 lg:grid-cols-[minmax(0,1fr)_500px] lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.24em] text-black/34">
              <IconGlyph />
              Local Icon Forge
            </div>
            <h1 className="mt-4 max-w-[980px] text-[clamp(42px,6.2vw,92px)] font-semibold leading-[1.03] tracking-[-0.045em]">
              图片转 ICO，
              <br />
              像素尺寸一次备齐。
            </h1>
          </div>
          <p className="max-w-[520px] text-[12px] leading-7 text-black/45">
            重新换成像素工坊风格：上传 PNG / JPG / WebP 后，可生成包含多尺寸图层的真正 .ico 文件，并同步导出 favicon 代码。
          </p>
        </header>

        {message && (
          <div className="ico-enter mt-5 rounded-[22px] border border-[#1e4037]/15 bg-white/46 px-4 py-3 text-sm text-[#1e4037] backdrop-blur-xl">
            {message}
          </div>
        )}

        <section className="mt-6 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)_340px]">
          <aside className="ico-enter space-y-5">
            <label
              onDragOver={(event) => {
                event.preventDefault()
                setDragActive(true)
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={onDrop}
              className={`group block cursor-pointer overflow-hidden rounded-[34px] border border-dashed p-5 transition ${
                dragActive ? "border-[#1e4037] bg-white/78" : "border-black/[0.12] bg-white/44 hover:border-black/25 hover:bg-white/58"
              }`}
            >
              <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={onFileChange} className="hidden" />
              <div className="rounded-[26px] border border-black/[0.05] bg-white/54 p-5 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#1e4037] text-white transition group-hover:-translate-y-0.5">
                  <UploadGlyph />
                </div>
                <div className="mt-5 text-lg font-semibold tracking-[-0.04em]">{sourceUrl ? "重新选择图片" : "拖拽或点击上传"}</div>
                <p className="mx-auto mt-2 max-w-[240px] text-xs leading-5 text-black/38">支持 PNG / JPG / WebP / SVG，单文件 ≤ {formatSize(MAX_FILE_SIZE)}</p>
              </div>

              {sourceInfo && (
                <div className="mt-4 rounded-[24px] border border-black/[0.05] bg-white/46 p-4">
                  <div className="truncate text-sm font-semibold">{sourceInfo.name}</div>
                  <div className="mt-2 font-mono text-[11px] text-black/40">{sourceInfo.width}×{sourceInfo.height} · {formatSize(sourceInfo.size)}</div>
                </div>
              )}
            </label>

            <div className="rounded-[34px] border border-black/[0.06] bg-white/44 p-5 backdrop-blur-xl">
              <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/34">Icon Sizes</div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {SIZE_OPTIONS.map((size) => (
                  <button key={size} type="button" onClick={() => toggleSize(size)} className={`rounded-[18px] border px-3 py-3 text-left transition ${selectedSizes.includes(size) ? "border-[#1e4037]/30 bg-[#1e4037] text-[#f6efe3]" : "border-black/[0.06] bg-white/48 text-stone-600 hover:-translate-y-0.5 hover:bg-white"}`}>
                    <div className="font-mono text-sm font-semibold">{size}</div>
                    <div className="mt-1 text-[9px] opacity-60">px</div>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[10px] leading-5 text-black/36">建议 favicon 至少包含 16、32、48、256。</p>
            </div>

            <div className="rounded-[34px] border border-black/[0.06] bg-white/44 p-5 backdrop-blur-xl">
              <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/34">Artwork Fit</div>
              <div className="mt-4 flex flex-wrap gap-2">
                {(["contain", "cover", "stretch"] as FitMode[]).map((mode) => (
                  <ButtonPill key={mode} active={fitMode === mode} onClick={() => setFitMode(mode)}>
                    {mode}
                  </ButtonPill>
                ))}
              </div>

              <div className="mt-5 space-y-5">
                <RangeControl label="Padding" value={padding} min={0} max={30} suffix="%" onChange={setPadding} />
                <RangeControl label="Corner" value={radius} min={0} max={100} suffix="%" onChange={setRadius} />
              </div>
            </div>

            <div className="rounded-[34px] border border-black/[0.06] bg-white/44 p-5 backdrop-blur-xl">
              <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/34">Background</div>
              <div className="mt-4 flex flex-wrap gap-2">
                {(["transparent", "white", "black", "custom"] as BackgroundMode[]).map((mode) => (
                  <ButtonPill key={mode} active={backgroundMode === mode} onClick={() => setBackgroundMode(mode)}>
                    {mode === "transparent" ? "透明" : mode === "white" ? "白底" : mode === "black" ? "黑底" : "自定义"}
                  </ButtonPill>
                ))}
              </div>
              {backgroundMode === "custom" && (
                <label className="mt-4 flex items-center justify-between rounded-2xl border border-black/[0.07] bg-white/54 p-3">
                  <span className="text-[10px] font-semibold text-black/40">颜色</span>
                  <input type="color" value={customBackground} onChange={(event) => setCustomBackground(event.target.value)} className="h-9 w-14 cursor-pointer rounded-xl border-0 bg-transparent" />
                </label>
              )}
            </div>
          </aside>

          <section className="ico-enter min-w-0 overflow-hidden rounded-[40px] border border-black/[0.06] bg-white/38 p-3 shadow-[0_35px_120px_-72px_rgba(45,35,22,.45)] backdrop-blur-xl">
            <div className="overflow-hidden rounded-[32px] border border-black/[0.055] bg-[#151712]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
                <div>
                  <div className="text-[8px] font-semibold uppercase tracking-[0.18em] text-white/24">Icon Preview Board</div>
                  <div className="mt-2 font-mono text-[12px] text-emerald-100/82">{sourceInfo ? `${sourceInfo.width}×${sourceInfo.height}` : "waiting for image"}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sortedSizes.map((size) => (
                    <button key={size} type="button" onClick={() => setFocusSize(size)} className={`rounded-full border px-3 py-1.5 text-[9px] font-semibold transition ${focusSize === size ? "border-white bg-white text-stone-950" : "border-white/[0.1] text-white/38 hover:bg-white/[0.08] hover:text-white"}`}>{size}px</button>
                  ))}
                </div>
              </div>

              <div className="grid gap-px bg-white/[0.07] lg:grid-cols-[minmax(0,1fr)_260px]">
                <div className="bg-[#151712] p-5">
                  <div className="ico-checker relative grid min-h-[560px] place-items-center overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.035] p-6">
                    {!sourceUrl && (
                      <div className="text-center">
                        <div className="mx-auto mb-7 h-px w-24 bg-white/18" />
                        <h2 className="text-[clamp(32px,5vw,72px)] font-semibold leading-[0.9] tracking-[-0.07em] text-white">Drop artwork</h2>
                        <p className="mx-auto mt-5 max-w-[420px] text-xs leading-6 text-white/38">上传图片后会生成多尺寸图标预览，不再只是把 PNG 改后缀成 .ico。</p>
                      </div>
                    )}

                    {sourceUrl && selectedPreview && (
                      <div className="ico-output-pop text-center">
                        <div className="mx-auto grid h-[260px] w-[260px] place-items-center rounded-[44px] border border-white/[0.08] bg-black/18 shadow-[0_32px_110px_-54px_rgba(0,0,0,.88)]">
                          <img src={selectedPreview.url} alt={`${selectedPreview.size}px 图标预览`} className="image-render-auto" style={{ width: `${Math.min(180, Math.max(64, selectedPreview.size))}px`, height: `${Math.min(180, Math.max(64, selectedPreview.size))}px` }} />
                        </div>
                        <div className="mt-5 font-mono text-[12px] text-emerald-100/72">{selectedPreview.size}×{selectedPreview.size} · {formatSize(selectedPreview.bytes)}</div>
                      </div>
                    )}
                  </div>
                </div>

                <aside className="bg-[#1d1c17] p-4">
                  <div className="grid gap-3">
                    {previewItems.length ? (
                      previewItems.map((item) => (
                        <button key={item.size} type="button" onClick={() => setFocusSize(item.size)} className={`grid grid-cols-[54px_1fr] items-center gap-3 rounded-[20px] border p-3 text-left transition ${focusSize === item.size ? "border-emerald-200/30 bg-emerald-200/10" : "border-white/[0.08] bg-white/[0.045] hover:bg-white/[0.07]"}`}>
                          <div className="ico-checker grid h-12 w-12 place-items-center overflow-hidden rounded-2xl bg-white/[0.04]">
                            <img src={item.url} alt={`${item.size}px`} style={{ width: `${Math.min(32, Math.max(16, item.size / 2))}px`, height: `${Math.min(32, Math.max(16, item.size / 2))}px` }} />
                          </div>
                          <div>
                            <div className="font-mono text-[11px] text-white/74">{item.size}×{item.size}</div>
                            <div className="mt-1 text-[9px] text-white/28">{formatSize(item.bytes)} PNG layer</div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.045] p-4 text-[11px] leading-5 text-white/35">等待生成预览。</div>
                    )}
                  </div>
                </aside>
              </div>
            </div>
          </section>

          <aside className="ico-enter space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="源文件" value={sourceInfo ? formatSize(sourceInfo.size) : "—"} hint={sourceInfo ? sourceInfo.type : "等待上传"} />
              <Stat label="源尺寸" value={sourceInfo ? `${sourceInfo.width}×${sourceInfo.height}` : "—"} hint="Original pixels" />
              <Stat label="ICO 体积" value={output ? formatSize(output.blob.size) : "—"} hint={output ? `${output.sizes.length} layers` : "尚未生成"} />
              <Stat label="当前尺寸" value={`${focusSize}px`} hint={selectedSizes.length ? `${selectedSizes.length} selected` : "请选择尺寸"} />
            </div>

            <div className="rounded-[34px] border border-black/[0.06] bg-white/44 p-5 backdrop-blur-xl">
              <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/34">Generate</div>
              <div className="mt-5 grid gap-3">
                <button type="button" disabled={!canGenerate} onClick={() => void generateIco()} className="h-12 rounded-full bg-[#1e4037] px-5 text-sm font-semibold text-[#f6efe3] transition hover:-translate-y-0.5 hover:bg-[#28594c] disabled:cursor-not-allowed disabled:opacity-35">
                  {processing ? "生成中…" : output ? "重新生成 ICO" : "生成 ICO 文件"}
                </button>
                <button type="button" disabled={!output} onClick={downloadIco} className="h-12 rounded-full border border-black/[0.08] bg-white/64 px-5 text-sm font-semibold text-stone-700 transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-35">
                  下载 {outputName}
                </button>
                <button type="button" disabled={!sourceUrl} onClick={() => void downloadPng(focusSize)} className="h-12 rounded-full border border-black/[0.08] bg-white/40 px-5 text-sm font-semibold text-stone-500 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35">
                  导出当前尺寸 PNG
                </button>
                <button type="button" onClick={reset} className="h-12 rounded-full border border-orange-200 bg-orange-50/70 px-5 text-sm font-semibold text-orange-700 transition hover:bg-orange-100">
                  重置
                </button>
              </div>
            </div>

            <div className="rounded-[34px] border border-black/[0.06] bg-white/44 p-5 backdrop-blur-xl">
              <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/34">Favicon Code</div>
              <div className="mt-4 space-y-3">
                <button type="button" disabled={!output} onClick={() => void copyText(htmlSnippet(outputName), "html", "HTML 片段已复制。")} className="w-full rounded-[18px] border border-black/[0.06] bg-white/48 px-4 py-3 text-left font-mono text-[10px] leading-5 text-stone-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35">
                  {copied === "html" ? "已复制 HTML" : htmlSnippet(outputName)}
                </button>
                <button type="button" disabled={!output} onClick={() => void copyText(manifestSnippet(outputName, sortedSizes), "manifest", "Manifest 图标配置已复制。")} className="w-full rounded-[18px] border border-black/[0.06] bg-white/48 px-4 py-3 text-left font-mono text-[10px] leading-5 text-stone-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35">
                  {copied === "manifest" ? "已复制 Manifest" : "复制 manifest icons 配置"}
                </button>
                <button type="button" disabled={!sourceInfo} onClick={() => void copyText(report, "report", "转换报告已复制。")} className="w-full rounded-[18px] border border-black/[0.06] bg-white/48 px-4 py-3 text-left text-[11px] font-semibold text-stone-500 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35">
                  {copied === "report" ? "已复制报告" : "复制转换报告"}
                </button>
              </div>
            </div>

            <div className="rounded-[30px] border border-black/[0.06] bg-white/38 p-5 text-[11px] leading-6 text-black/42">
              <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-black/30">说明</div>
              这版会写入 ICO 文件头和多尺寸 PNG 图层，不是单纯把 PNG 下载成 .ico 后缀。适合网站 favicon 和桌面快捷方式图标。
            </div>

            <div className="[&_*]:!text-black/38">
              <FooterNote />
            </div>
          </aside>
        </section>
      </main>
    </div>
  )
}
