"use client"

import type { ChangeEvent, CSSProperties, DragEvent, ReactNode } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type ImageFormat = "image/jpeg" | "image/png" | "image/webp"
type FitMode = "original" | "max-edge" | "width" | "height"
type PreviewMode = "compare" | "split" | "original" | "compressed"
type ProcessStatus = "idle" | "ready" | "processing" | "done" | "error"

type ImageInfo = {
  name: string
  type: string
  width: number
  height: number
  size: number
}

type OutputInfo = {
  url: string
  blob: Blob
  width: number
  height: number
  quality: number
  format: ImageFormat
  duration: number
}

const MAX_UPLOAD_SIZE = 28 * 1024 * 1024
const FORMAT_OPTIONS: Array<{ value: ImageFormat; label: string; note: string }> = [
  { value: "image/webp", label: "WebP", note: "推荐，体积通常更小" },
  { value: "image/jpeg", label: "JPG", note: "兼容性好，适合照片" },
  { value: "image/png", label: "PNG", note: "无损，适合透明图" },
]

const PRESETS = [
  { label: "清晰", strength: 3, fitMode: "original" as FitMode, maxEdge: 2400 },
  { label: "均衡", strength: 5, fitMode: "max-edge" as FitMode, maxEdge: 1920 },
  { label: "小体积", strength: 8, fitMode: "max-edge" as FitMode, maxEdge: 1280 },
  { label: "缩略图", strength: 7, fitMode: "width" as FitMode, maxEdge: 960 },
]

function strengthToQuality(strength: number) {
  return Number((0.96 - ((strength - 1) / 9) * 0.78).toFixed(2))
}

function formatSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0%"
  return `${value.toFixed(1)}%`
}

function extensionForFormat(format: ImageFormat) {
  if (format === "image/jpeg") return "jpg"
  if (format === "image/png") return "png"
  return "webp"
}

function calcOutputSize(width: number, height: number, fitMode: FitMode, maxEdge: number) {
  if (fitMode === "original") return { width, height }

  if (fitMode === "width") {
    const nextWidth = Math.min(width, Math.max(1, maxEdge))
    return {
      width: Math.round(nextWidth),
      height: Math.round((height / width) * nextWidth),
    }
  }

  if (fitMode === "height") {
    const nextHeight = Math.min(height, Math.max(1, maxEdge))
    return {
      width: Math.round((width / height) * nextHeight),
      height: Math.round(nextHeight),
    }
  }

  const edge = Math.max(width, height)
  if (edge <= maxEdge) return { width, height }

  const scale = maxEdge / edge
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, format: ImageFormat, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("当前浏览器不支持该输出格式，或图片无法编码。"))
          return
        }
        resolve(blob)
      },
      format,
      format === "image/png" ? undefined : quality,
    )
  })
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("图片加载失败，文件可能已损坏。"))
    image.src = url
  })
}

function downloadBlob(url: string, filename: string) {
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
}

function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string
  value: string
  hint?: string
  tone?: "default" | "good" | "warn"
}) {
  const toneClass = tone === "good" ? "text-emerald-700" : tone === "warn" ? "text-amber-700" : "text-zinc-950"

  return (
    <div className="rounded-[22px] border border-black/[0.06] bg-white/64 p-4 shadow-[0_18px_55px_-48px_rgba(30,24,18,.34)]">
      <div className="text-[8px] font-semibold uppercase tracking-[0.18em] text-zinc-400">{label}</div>
      <div className={`mt-3 font-mono text-lg font-semibold tracking-[-0.03em] ${toneClass}`}>{value}</div>
      {hint && <div className="mt-1 text-[10px] leading-4 text-zinc-400">{hint}</div>}
    </div>
  )
}

function PillButton({
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
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full border px-3.5 py-2 text-[10px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-35 ${
        active ? "border-zinc-950 bg-zinc-950 text-white" : "border-black/[0.08] bg-white/54 text-zinc-500 hover:border-zinc-300 hover:bg-white hover:text-zinc-900"
      }`}
    >
      {children}
    </button>
  )
}

function RangeControl({
  label,
  value,
  min,
  max,
  step,
  disabled,
  suffix,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  disabled?: boolean
  suffix?: string
  onChange: (value: number) => void
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-400">{label}</span>
        <span className="rounded-full border border-black/[0.06] bg-white/70 px-2.5 py-1 font-mono text-[10px] text-zinc-600">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-zinc-950 disabled:cursor-not-allowed disabled:opacity-35"
      />
    </label>
  )
}

export default function ImageCompressPage() {
  const pageRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const beforeAfterRef = useRef<HTMLDivElement>(null)
  const originalUrlRef = useRef<string | null>(null)
  const outputUrlRef = useRef<string | null>(null)
  const lastProcessedKeyRef = useRef("")

  const [file, setFile] = useState<File | null>(null)
  const [originalUrl, setOriginalUrl] = useState("")
  const [output, setOutput] = useState<OutputInfo | null>(null)
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null)
  const [strength, setStrength] = useState(5)
  const [format, setFormat] = useState<ImageFormat>("image/webp")
  const [fitMode, setFitMode] = useState<FitMode>("max-edge")
  const [maxEdge, setMaxEdge] = useState(1920)
  const [previewMode, setPreviewMode] = useState<PreviewMode>("split")
  const [split, setSplit] = useState(50)
  const [status, setStatus] = useState<ProcessStatus>("idle")
  const [dragActive, setDragActive] = useState(false)
  const [message, setMessage] = useState("")
  const [autoRun, setAutoRun] = useState(false)

  const quality = useMemo(() => strengthToQuality(strength), [strength])
  const targetSize = useMemo(() => (imageInfo ? calcOutputSize(imageInfo.width, imageInfo.height, fitMode, maxEdge) : null), [fitMode, imageInfo, maxEdge])
  const savedBytes = output && imageInfo ? imageInfo.size - output.blob.size : 0
  const savedPercent = output && imageInfo ? (1 - output.blob.size / imageInfo.size) * 100 : 0
  const outputLarger = Boolean(output && imageInfo && output.blob.size > imageInfo.size)
  const canCompress = Boolean(file && originalUrl && imageInfo && status !== "processing")
  const compressionKey = useMemo(() => {
    if (!file || !imageInfo || !targetSize) return ""
    return [file.name, file.size, file.lastModified, format, strength, fitMode, maxEdge, targetSize.width, targetSize.height].join("|")
  }, [file, fitMode, format, imageInfo, maxEdge, strength, targetSize])
  const outputStale = Boolean(output && compressionKey && lastProcessedKeyRef.current !== compressionKey)

  const revokeOutput = useCallback(() => {
    if (outputUrlRef.current) {
      URL.revokeObjectURL(outputUrlRef.current)
      outputUrlRef.current = null
    }
  }, [])

  const revokeAll = useCallback(() => {
    if (originalUrlRef.current) {
      URL.revokeObjectURL(originalUrlRef.current)
      originalUrlRef.current = null
    }
    revokeOutput()
  }, [revokeOutput])

  const reset = useCallback(() => {
    revokeAll()
    setFile(null)
    setOriginalUrl("")
    setOutput(null)
    setImageInfo(null)
    setStrength(5)
    setFormat("image/webp")
    setFitMode("max-edge")
    setMaxEdge(1920)
    setPreviewMode("split")
    setSplit(50)
    setStatus("idle")
    setMessage("")
    setDragActive(false)
    lastProcessedKeyRef.current = ""
    if (inputRef.current) inputRef.current.value = ""
  }, [revokeAll])

  const acceptFile = useCallback(
    async (nextFile: File) => {
      setMessage("")

      if (!nextFile.type.startsWith("image/")) {
        setMessage("请选择图片文件。")
        setStatus("error")
        return
      }

      if (nextFile.size > MAX_UPLOAD_SIZE) {
        setMessage(`文件不能超过 ${formatSize(MAX_UPLOAD_SIZE)}。`)
        setStatus("error")
        return
      }

      revokeAll()
      lastProcessedKeyRef.current = ""
      setOutput(null)
      setFile(nextFile)
      setStatus("ready")

      const url = URL.createObjectURL(nextFile)
      originalUrlRef.current = url
      setOriginalUrl(url)

      try {
        const image = await loadImage(url)
        setImageInfo({
          name: nextFile.name,
          type: nextFile.type || "image/*",
          width: image.naturalWidth,
          height: image.naturalHeight,
          size: nextFile.size,
        })

        if (image.naturalWidth > 2400 || image.naturalHeight > 2400) {
          setFitMode("max-edge")
          setMaxEdge(1920)
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "图片读取失败。")
        setStatus("error")
      }
    },
    [revokeAll],
  )

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0]
    if (!nextFile) return
    void acceptFile(nextFile)
  }

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setDragActive(false)
    const nextFile = event.dataTransfer.files?.[0]
    if (nextFile) void acceptFile(nextFile)
  }

  const compress = useCallback(async () => {
    if (!originalUrl || !file || !imageInfo || !targetSize) return

    const startedAt = performance.now()
    lastProcessedKeyRef.current = compressionKey
    setStatus("processing")
    setMessage("")

    try {
      const image = await loadImage(originalUrl)
      const canvas = document.createElement("canvas")
      canvas.width = targetSize.width
      canvas.height = targetSize.height

      const context = canvas.getContext("2d", { alpha: format !== "image/jpeg" })
      if (!context) throw new Error("浏览器无法创建 Canvas 上下文。")

      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = "high"

      if (format === "image/jpeg") {
        context.fillStyle = "#ffffff"
        context.fillRect(0, 0, canvas.width, canvas.height)
      }

      context.drawImage(image, 0, 0, targetSize.width, targetSize.height)

      const blob = await canvasToBlob(canvas, format, quality)

      revokeOutput()
      const url = URL.createObjectURL(blob)
      outputUrlRef.current = url

      setOutput({
        url,
        blob,
        width: targetSize.width,
        height: targetSize.height,
        quality,
        format,
        duration: Math.max(1, Math.round(performance.now() - startedAt)),
      })
      setStatus("done")

      if (blob.size > imageInfo.size && fitMode === "original") {
        setMessage("压缩后的文件比原图更大。可以提高压缩强度，或启用最大边缩放。")
      }
    } catch (error) {
      setStatus("error")
      setMessage(error instanceof Error ? error.message : "压缩失败，请更换图片或输出格式。")
    }
  }, [compressionKey, file, fitMode, format, imageInfo, originalUrl, quality, revokeOutput, targetSize])

  useEffect(() => {
    return () => revokeAll()
  }, [revokeAll])

  useEffect(() => {
    if (!pageRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      gsap.from(".compress-enter", { y: 14, opacity: 0, duration: 0.58, stagger: 0.055, ease: "power3.out" })
      gsap.to(".compress-orb", { y: -12, x: 8, duration: 5.8, repeat: -1, yoyo: true, ease: "sine.inOut" })
      gsap.to(".compress-scan", { xPercent: 120, duration: 3.8, repeat: -1, ease: "sine.inOut" })
    }, pageRef)

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (!autoRun || !canCompress || !compressionKey) return
    if (lastProcessedKeyRef.current === compressionKey) return

    const timer = window.setTimeout(() => {
      void compress()
    }, 420)

    return () => window.clearTimeout(timer)
  }, [autoRun, canCompress, compress, compressionKey])

  useEffect(() => {
    if (!beforeAfterRef.current || !output || previewMode !== "split") return
    gsap.fromTo(beforeAfterRef.current, { "--split": "50%" } as CSSProperties, { "--split": `${split}%`, duration: 0.28, ease: "power2.out" } as gsap.TweenVars)
  }, [output, previewMode, split])

  const download = () => {
    if (!output || !file) return
    const base = file.name.replace(/\.[^.]+$/, "") || "image"
    downloadBlob(output.url, `${base}-compressed.${extensionForFormat(output.format)}`)
  }

  const copyReport = async () => {
    if (!imageInfo || !targetSize) return

    const report = [
      "BitLeap Image Compress Report",
      "",
      `File: ${imageInfo.name}`,
      `Original: ${formatSize(imageInfo.size)} · ${imageInfo.width}×${imageInfo.height}`,
      output ? `Compressed: ${formatSize(output.blob.size)} · ${output.width}×${output.height}` : "Compressed: not generated",
      output ? `Saved: ${formatSize(savedBytes)} · ${formatPercent(savedPercent)}` : "Saved: —",
      `Format: ${format}`,
      `Quality: ${format === "image/png" ? "lossless" : quality}`,
      `Resize: ${fitMode} · ${targetSize.width}×${targetSize.height}`,
    ].join("\n")

    try {
      await navigator.clipboard.writeText(report)
      setMessage("压缩报告已复制。")
    } catch {
      setMessage("复制失败，浏览器可能未授权剪贴板。")
    }
  }

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setStrength(preset.strength)
    setFitMode(preset.fitMode)
    setMaxEdge(preset.maxEdge)
  }

  return (
    <div ref={pageRef} className="relative min-h-[calc(100dvh-4rem)] overflow-hidden bg-[#f5f0e8] text-[#201a14]">
      <style>{`
        .compress-scroll::-webkit-scrollbar { width:5px; height:5px; }
        .compress-scroll::-webkit-scrollbar-track { background:transparent; }
        .compress-scroll::-webkit-scrollbar-thumb { background:rgba(32,26,20,.18); border-radius:999px; }
        .compress-checker { background-image:linear-gradient(45deg,rgba(32,26,20,.045) 25%,transparent 25%),linear-gradient(-45deg,rgba(32,26,20,.045) 25%,transparent 25%),linear-gradient(45deg,transparent 75%,rgba(32,26,20,.045) 75%),linear-gradient(-45deg,transparent 75%,rgba(32,26,20,.045) 75%); background-size:22px 22px; background-position:0 0,0 11px,11px -11px,-11px 0px; }
        .compress-breadcrumb-clean > * { margin:0 !important; }
        .compress-breadcrumb-clean :is(nav,ol,ul) { width:auto !important; max-width:max-content !important; }
      `}</style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(255,255,255,.76),transparent_28%),radial-gradient(circle_at_85%_14%,rgba(226,213,188,.58),transparent_30%),linear-gradient(180deg,#fbf8f1_0%,#f5f0e8_52%,#eee5d6_100%)]" />
      <div className="compress-orb pointer-events-none absolute -right-32 top-24 h-[480px] w-[480px] rounded-full bg-[#dac8a8]/24 blur-[120px]" />
      <div className="compress-orb pointer-events-none absolute -left-28 bottom-10 h-[380px] w-[380px] rounded-full bg-white/46 blur-[110px]" />

      <main className="relative z-10 mx-auto max-w-[1580px] px-5 py-6 sm:px-8 lg:px-10">
        <div className="compress-enter compress-breadcrumb-clean inline-flex max-w-max">
          <Breadcrumb />
        </div>

        <header className="compress-enter mt-8 grid gap-8 border-b border-black/[0.07] pb-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.24em] text-black/32">Local Image Compressor</div>
            <h1 className="mt-4 max-w-[980px] text-[clamp(42px,6.1vw,92px)] font-semibold leading-[1.04] tracking-[-0.04em]">
              <span className="block">图片压缩</span>
              <span className="mt-1 block text-[0.72em] leading-[1.1] tracking-[-0.025em] text-[#46392e]">清晰对比后再下载</span>
            </h1>
          </div>
          <p className="max-w-[520px] text-[12px] leading-7 text-black/45">
            在浏览器本地完成压缩、尺寸缩放和格式转换。支持实时预览原图 / 压缩图，也可以用分割线检查细节差异。
          </p>
        </header>

        {message && (
          <div className={`compress-enter mt-5 rounded-[22px] border px-4 py-3 text-sm ${status === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
            {message}
          </div>
        )}

        <section className="mt-6 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)_330px]">
          <aside className="compress-enter space-y-5">
            <label
              onDragOver={(event) => {
                event.preventDefault()
                setDragActive(true)
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={onDrop}
              className={`group block cursor-pointer overflow-hidden rounded-[34px] border border-dashed p-5 transition ${
                dragActive ? "border-zinc-900 bg-white/78" : "border-black/[0.12] bg-white/44 hover:border-black/25 hover:bg-white/58"
              }`}
            >
              <input ref={inputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
              <div className="rounded-[26px] border border-black/[0.05] bg-white/54 p-5 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-zinc-950 text-xl text-white transition group-hover:-translate-y-0.5">＋</div>
                <div className="mt-5 text-lg font-semibold tracking-[-0.04em]">{file ? "重新选择图片" : "拖拽或点击上传"}</div>
                <p className="mx-auto mt-2 max-w-[240px] text-xs leading-5 text-black/38">JPG / PNG / WebP / GIF 首帧等图片文件，单文件 ≤ {formatSize(MAX_UPLOAD_SIZE)}</p>
              </div>
              {imageInfo && (
                <div className="mt-4 rounded-[24px] border border-black/[0.05] bg-white/46 p-4">
                  <div className="truncate text-sm font-semibold">{imageInfo.name}</div>
                  <div className="mt-2 font-mono text-[11px] text-black/40">
                    {imageInfo.width}×{imageInfo.height} · {formatSize(imageInfo.size)}
                  </div>
                </div>
              )}
            </label>

            <div className="rounded-[34px] border border-black/[0.06] bg-white/44 p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/34">Presets</div>
                <PillButton active={autoRun} onClick={() => setAutoRun(!autoRun)}>{autoRun ? "自动压缩开" : "自动压缩关"}</PillButton>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {PRESETS.map((preset) => (
                  <button key={preset.label} type="button" onClick={() => applyPreset(preset)} className="rounded-[18px] border border-black/[0.06] bg-white/48 px-3 py-3 text-left transition hover:-translate-y-0.5 hover:bg-white">
                    <div className="text-sm font-semibold">{preset.label}</div>
                    <div className="mt-1 text-[10px] text-black/34">强度 {preset.strength} · {preset.maxEdge}px</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[34px] border border-black/[0.06] bg-white/44 p-5 backdrop-blur-xl">
              <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/34">Output</div>
              <div className="mt-4 flex flex-wrap gap-2">
                {FORMAT_OPTIONS.map((item) => (
                  <PillButton key={item.value} active={format === item.value} onClick={() => setFormat(item.value)}>
                    {item.label}
                  </PillButton>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-5 text-black/36">{FORMAT_OPTIONS.find((item) => item.value === format)?.note}</p>

              <div className="mt-5 space-y-5">
                <RangeControl label="压缩强度" value={strength} min={1} max={10} step={1} disabled={format === "image/png"} onChange={setStrength} />
                <RangeControl label="最大边 / 指定边" value={maxEdge} min={320} max={4096} step={20} suffix="px" disabled={fitMode === "original"} onChange={setMaxEdge} />
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  ["original", "原尺寸"],
                  ["max-edge", "最大边"],
                  ["width", "宽度"],
                  ["height", "高度"],
                ].map(([value, label]) => (
                  <PillButton key={value} active={fitMode === value} onClick={() => setFitMode(value as FitMode)}>
                    {label}
                  </PillButton>
                ))}
              </div>
            </div>
          </aside>

          <section className="compress-enter min-w-0 overflow-hidden rounded-[40px] border border-black/[0.06] bg-white/38 p-3 shadow-[0_35px_120px_-72px_rgba(45,35,22,.45)] backdrop-blur-xl">
            <div className="relative min-h-[620px] overflow-hidden rounded-[32px] border border-black/[0.055] bg-[#15130f]">
              <div className="compress-scan pointer-events-none absolute bottom-0 top-0 z-10 w-1/3 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.08),transparent)] opacity-60" />

              {!originalUrl && (
                <div className="absolute inset-0 grid place-items-center p-8 text-center">
                  <div>
                    <div className="mx-auto mb-7 h-px w-24 bg-white/18" />
                    <h2 className="text-[clamp(32px,5vw,72px)] font-semibold leading-[0.9] tracking-[-0.07em] text-white">Drop image here</h2>
                    <p className="mx-auto mt-5 max-w-[420px] text-xs leading-6 text-white/38">上传后会在这里显示大图预览。压缩完成后可切换分屏、原图和压缩图。</p>
                  </div>
                </div>
              )}

              {originalUrl && (
                <div className="absolute inset-0 flex flex-col">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {(["split", "compare", "original", "compressed"] as PreviewMode[]).map((mode) => (
                        <PillButton key={mode} active={previewMode === mode} onClick={() => setPreviewMode(mode)} disabled={mode === "compressed" && !output}>
                          {mode === "split" ? "分割预览" : mode === "compare" ? "并排" : mode === "original" ? "原图" : "压缩图"}
                        </PillButton>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[10px] text-white/34">
                      {status === "processing" && <span className="rounded-full bg-white/[0.08] px-2 py-1 text-[8px] text-white/45">encoding</span>}
                      {outputStale && status !== "processing" && <span className="rounded-full bg-amber-300/12 px-2 py-1 text-[8px] text-amber-100/72">stale</span>}
                      <span>{targetSize ? `${targetSize.width}×${targetSize.height}` : "—"}</span>
                    </div>
                  </div>

                  <div className="relative min-h-0 flex-1 p-4">
                    {previewMode === "compare" && output ? (
                      <div className="grid h-full gap-3 md:grid-cols-2">
                        <div className="compress-checker grid min-h-0 place-items-center overflow-hidden rounded-[24px] border border-white/[0.08] bg-white/5 p-3">
                          <img src={originalUrl} alt="原图预览" className="max-h-full max-w-full rounded-[18px] object-contain" />
                        </div>
                        <div className="compress-checker grid min-h-0 place-items-center overflow-hidden rounded-[24px] border border-white/[0.08] bg-white/5 p-3">
                          <img src={output.url} alt="压缩后预览" className="max-h-full max-w-full rounded-[18px] object-contain" />
                        </div>
                      </div>
                    ) : previewMode === "split" && output ? (
                      <div ref={beforeAfterRef} className="compress-checker relative h-full overflow-hidden rounded-[24px] border border-white/[0.08] bg-white/5" style={{ "--split": `${split}%` } as CSSProperties}>
                        <img src={originalUrl} alt="原图预览" className="absolute inset-0 h-full w-full object-contain p-4" />
                        <div className="absolute inset-0 overflow-hidden" style={{ clipPath: "inset(0 calc(100% - var(--split)) 0 0)" }}>
                          <img src={output.url} alt="压缩后预览" className="h-full w-full object-contain p-4" />
                        </div>
                        <div className="absolute bottom-4 left-4 rounded-full bg-black/55 px-3 py-1.5 text-[10px] text-white/70 backdrop-blur">压缩后</div>
                        <div className="absolute bottom-4 right-4 rounded-full bg-black/55 px-3 py-1.5 text-[10px] text-white/70 backdrop-blur">原图</div>
                        <input type="range" min={5} max={95} value={split} onChange={(event) => setSplit(Number(event.target.value))} className="absolute inset-x-6 bottom-14 accent-white" aria-label="调整分割预览比例" />
                      </div>
                    ) : (
                      <div className="compress-checker grid h-full place-items-center overflow-hidden rounded-[24px] border border-white/[0.08] bg-white/5 p-4">
                        <img src={previewMode === "compressed" && output ? output.url : originalUrl} alt="图片预览" className="max-h-full max-w-full rounded-[20px] object-contain shadow-[0_30px_90px_-58px_rgba(0,0,0,.82)]" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {status === "processing" && !output && (
                <div className="absolute inset-0 z-20 grid place-items-center bg-black/28 backdrop-blur-[2px]">
                  <div className="rounded-[24px] border border-white/[0.1] bg-black/45 px-5 py-4 text-sm text-white">正在压缩图片…</div>
                </div>
              )}
            </div>
          </section>

          <aside className="compress-enter space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="原图" value={imageInfo ? formatSize(imageInfo.size) : "—"} hint={imageInfo ? `${imageInfo.width}×${imageInfo.height}` : "等待上传"} />
              <Stat label="输出" value={output ? formatSize(output.blob.size) : "—"} hint={output ? (outputStale ? "参数已变化，需重新压缩" : `${output.width}×${output.height}`) : "尚未生成"} tone={outputLarger || outputStale ? "warn" : "default"} />
              <Stat label="节省" value={output ? formatSize(savedBytes) : "—"} hint={output ? formatPercent(savedPercent) : "—"} tone={outputLarger ? "warn" : "good"} />
              <Stat label="质量" value={format === "image/png" ? "无损" : String(quality)} hint={output ? `${output.duration} ms` : "编码参数"} />
            </div>

            <div className="rounded-[34px] border border-black/[0.06] bg-white/46 p-5 backdrop-blur-xl">
              <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/34">Actions</div>
              <div className="mt-5 grid gap-3">
                <button type="button" disabled={!canCompress} onClick={() => void compress()} className="h-12 rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-35">
                  {status === "processing" ? "压缩中…" : outputStale ? "参数已变化，重新压缩" : output ? "重新压缩" : "压缩图片"}
                </button>
                <button type="button" disabled={!output} onClick={download} className="h-12 rounded-full border border-black/[0.08] bg-white/64 px-5 text-sm font-semibold text-zinc-700 transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-35">
                  下载压缩图片
                </button>
                <button type="button" disabled={!imageInfo} onClick={() => void copyReport()} className="h-12 rounded-full border border-black/[0.08] bg-white/40 px-5 text-sm font-semibold text-zinc-500 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35">
                  复制压缩报告
                </button>
                <button type="button" onClick={reset} className="h-12 rounded-full border border-orange-200 bg-orange-50/70 px-5 text-sm font-semibold text-orange-700 transition hover:bg-orange-100">
                  重置
                </button>
              </div>
            </div>

            <div className="rounded-[30px] border border-black/[0.06] bg-white/38 p-5 text-[11px] leading-6 text-black/42">
              <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-black/30">说明</div>
              所有处理都在当前浏览器本地完成。自动压缩只会在图片或参数变化后触发一次，不会在完成后反复重跑；JPG 会自动铺白底，避免透明区域变黑。
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
