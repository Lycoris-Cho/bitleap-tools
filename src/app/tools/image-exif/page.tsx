"use client"

import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react"
import EXIF from "exif-js"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

interface ExifData {
  [key: string]: unknown
}

type FrameTheme = "light" | "dark"

function formatFileSize(bytes: number) {
  if (!bytes) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index > 1 ? 1 : 0)} ${units[index]}`
}

function toDisplayValue(value: unknown) {
  if (value == null) return "—"
  if (typeof value === "object") {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

function normalizeExposureTime(value: unknown) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return ""
  if (n >= 1) return `${Number(n.toFixed(1))}s`
  return `1/${Math.max(1, Math.round(1 / n))}s`
}

function normalizeFNumber(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? `f/${Number(n.toFixed(1))}` : ""
}

function normalizeFocalLength(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? `${Math.round(n)}mm` : ""
}

function readGpsCoordinate(values: unknown, ref: unknown) {
  if (!Array.isArray(values) || values.length < 3) return null
  const parts = values.map(Number)
  if (parts.some((n) => !Number.isFinite(n))) return null
  let decimal = parts[0] + parts[1] / 60 + parts[2] / 3600
  if (String(ref).toUpperCase() === "S" || String(ref).toUpperCase() === "W") decimal *= -1
  return decimal
}

export default function ImageExifPage() {
  const [exifInfo, setExifInfo] = useState<ExifData | null>(null)
  const [previewSrc, setPreviewSrc] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState("")
  const [dragging, setDragging] = useState(false)
  const [frameReady, setFrameReady] = useState(false)
  const [frameTheme, setFrameTheme] = useState<FrameTheme>("light")

  const fileInputRef = useRef<HTMLInputElement>(null)
  const outputCanvasRef = useRef<HTMLCanvasElement>(null)

  const summary = useMemo(() => {
    if (!exifInfo) return null

    const make = String(exifInfo.Make ?? "").trim()
    const model = String(exifInfo.Model ?? "").trim()
    const lens = String(exifInfo.LensModel ?? exifInfo.LensInfo ?? "").trim()
    const date = String(exifInfo.DateTimeOriginal ?? exifInfo.DateTime ?? "").trim()
    const iso = exifInfo.ISO ?? exifInfo.ISOSpeedRatings
    const exposure = normalizeExposureTime(exifInfo.ExposureTime)
    const aperture = normalizeFNumber(exifInfo.FNumber)
    const focal = normalizeFocalLength(exifInfo.FocalLength)
    const width = exifInfo.PixelXDimension ?? exifInfo.ImageWidth
    const height = exifInfo.PixelYDimension ?? exifInfo.ImageHeight

    const latitude = readGpsCoordinate(exifInfo.GPSLatitude, exifInfo.GPSLatitudeRef)
    const longitude = readGpsCoordinate(exifInfo.GPSLongitude, exifInfo.GPSLongitudeRef)

    return {
      make,
      model,
      lens,
      date,
      iso: iso ? `ISO ${iso}` : "",
      exposure,
      aperture,
      focal,
      resolution: width && height ? `${width} × ${height}` : "",
      latitude,
      longitude,
    }
  }, [exifInfo])

  const keyFields = useMemo(() => {
    if (!summary) return []
    return [
      ["相机", [summary.make, summary.model].filter(Boolean).join(" ") || "—"],
      ["镜头", summary.lens || "—"],
      ["焦距", summary.focal || "—"],
      ["光圈", summary.aperture || "—"],
      ["快门", summary.exposure || "—"],
      ["感光度", summary.iso || "—"],
      ["拍摄时间", summary.date || "—"],
      ["分辨率", summary.resolution || "—"],
    ] as const
  }, [summary])

  const parseImage = (nextFile: File) => {
    setError("")
    setExifInfo(null)
    setCopied("")
    setFrameReady(false)
    setFile(nextFile)

    if (!/image\/(jpeg|jpg|tiff)/i.test(nextFile.type) && !/\.(jpe?g|tiff?)$/i.test(nextFile.name)) {
      setError("请选择 JPG / JPEG / TIFF 图片。多数 PNG、WEBP 不包含标准 EXIF 数据。")
      return
    }

    const reader = new FileReader()

    reader.onerror = () => {
      setError("图片读取失败，请重新选择文件。")
    }

    reader.onload = (event) => {
      const imgSrc = event.target?.result as string
      setPreviewSrc(imgSrc)

      const img = new Image()
      img.src = imgSrc

      img.onerror = () => {
        setError("无法解析这张图片。")
      }

      img.onload = () => {
        try {
          EXIF.getData(img as unknown as string, function () {
            const allMeta = EXIF.getAllTags(img as unknown as HTMLImageElement) as ExifData
            if (!allMeta || Object.keys(allMeta).length === 0) {
              setError("没有读取到 EXIF 元数据。截图、社交平台下载图或经过压缩的图片通常会被清除 EXIF。")
              return
            }
            setExifInfo(allMeta)
          })
        } catch (cause) {
          console.error(cause)
          setError("EXIF 解析失败，请换一张原始照片重试。")
        }
      }
    }

    reader.readAsDataURL(nextFile)
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0]
    if (nextFile) parseImage(nextFile)
    event.target.value = ""
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    const nextFile = event.dataTransfer.files?.[0]
    if (nextFile) parseImage(nextFile)
  }

  const renderExifFrame = () => {
    if (!previewSrc || !exifInfo || !outputCanvasRef.current || !summary) return

    const canvas = outputCanvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const img = new Image()
    img.src = previewSrc

    img.onload = () => {
      const footerHeight = Math.max(150, Math.min(280, img.width * 0.16))
      const paddingX = footerHeight * 0.22
      const footerTop = img.height
      const dark = frameTheme === "dark"

      canvas.width = img.width
      canvas.height = img.height + footerHeight

      ctx.drawImage(img, 0, 0)

      ctx.fillStyle = dark ? "#151515" : "#F7F6F1"
      ctx.fillRect(0, footerTop, canvas.width, footerHeight)

      const brand = summary.make.toUpperCase() || "CAMERA"
      const model = summary.model || "Unknown model"
      const date = summary.date || ""
      const params = [summary.focal, summary.aperture, summary.exposure, summary.iso].filter(Boolean).join("  ")
      const primary = dark ? "#F4F4EF" : "#161612"
      const secondary = dark ? "#A8A8A2" : "#72726C"

      ctx.textBaseline = "alphabetic"

      ctx.textAlign = "left"
      ctx.fillStyle = primary
      ctx.font = `700 ${footerHeight * 0.19}px Arial, sans-serif`
      ctx.fillText(brand, paddingX, footerTop + footerHeight * 0.42)

      ctx.fillStyle = secondary
      ctx.font = `400 ${footerHeight * 0.105}px Arial, sans-serif`
      ctx.fillText(model, paddingX, footerTop + footerHeight * 0.67)

      ctx.textAlign = "right"
      ctx.fillStyle = primary
      ctx.font = `600 ${footerHeight * 0.13}px Arial, sans-serif`
      ctx.fillText(params || "EXIF PHOTO", canvas.width - paddingX, footerTop + footerHeight * 0.42)

      ctx.fillStyle = secondary
      ctx.font = `400 ${footerHeight * 0.095}px Arial, sans-serif`
      ctx.fillText(date, canvas.width - paddingX, footerTop + footerHeight * 0.67)

      ctx.strokeStyle = dark ? "rgba(255,255,255,.12)" : "rgba(0,0,0,.12)"
      ctx.lineWidth = Math.max(1, footerHeight * 0.006)
      ctx.beginPath()
      ctx.moveTo(canvas.width / 2, footerTop + footerHeight * 0.22)
      ctx.lineTo(canvas.width / 2, footerTop + footerHeight * 0.78)
      ctx.stroke()

      setFrameReady(true)
    }
  }

  const downloadFramedImage = () => {
    const canvas = outputCanvasRef.current
    if (!canvas || !frameReady) return

    const url = canvas.toDataURL("image/jpeg", 0.94)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${file?.name.replace(/\.[^.]+$/, "") || "photo"}-exif-frame.jpg`
    anchor.click()
  }

  const handleCopyExif = async () => {
    if (!exifInfo) return
    const text = Object.entries(exifInfo)
      .map(([key, value]) => `${key}: ${toDisplayValue(value)}`)
      .join("\n")

    try {
      await navigator.clipboard.writeText(text)
      setCopied("全部 EXIF 已复制")
      window.setTimeout(() => setCopied(""), 1500)
    } catch {
      setCopied("复制失败")
    }
  }

  const copyValue = async (label: string, value: string) => {
    if (!value || value === "—") return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(`${label}已复制`)
      window.setTimeout(() => setCopied(""), 1300)
    } catch {
      setCopied("复制失败")
    }
  }

  const handleReset = () => {
    setExifInfo(null)
    setPreviewSrc("")
    setFile(null)
    setError("")
    setCopied("")
    setFrameReady(false)

    if (fileInputRef.current) fileInputRef.current.value = ""

    const canvas = outputCanvasRef.current
    if (canvas) {
      const ctx = canvas.getContext("2d")
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
      canvas.width = 0
      canvas.height = 0
    }
  }

  return (
    <main className="min-h-screen bg-[#f2f1ed] text-[#171713]">
      <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-10">
        <Breadcrumb />

        <header className="mt-5 flex flex-col gap-5 border-b border-black/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[11px] font-medium tracking-[0.14em] text-black/30">图片工具 / 本地处理</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">图片 EXIF 查看器</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-black/45">
              查看相机、镜头、曝光、拍摄时间与 GPS 等元数据，并生成带摄影参数的简洁照片边框。
            </p>
          </div>

          {previewSrc && (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => fileInputRef.current?.click()} className="border border-black/10 bg-white px-4 py-2.5 text-xs font-medium transition hover:bg-black hover:text-white">
                更换图片
              </button>
              <button onClick={handleReset} className="border border-black/10 px-4 py-2.5 text-xs font-medium text-black/45 transition hover:bg-black/5">
                清空
              </button>
            </div>
          )}

          <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.tif,.tiff,image/jpeg,image/tiff" onChange={handleFileChange} className="hidden" />
        </header>

        {!previewSrc ? (
          <section className="flex min-h-[560px] items-center justify-center py-8">
            <div className="w-full max-w-4xl">
              <div
                onDragEnter={() => setDragging(true)}
                onDragLeave={() => setDragging(false)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer border border-dashed p-6 transition sm:p-8 ${dragging ? "border-black bg-white" : "border-black/20 bg-[#faf9f5] hover:border-black/40 hover:bg-white"}`}
              >
                <div className="flex min-h-[330px] flex-col items-center justify-center text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#171713] text-2xl font-light text-white">+</div>
                  <h2 className="mt-5 text-xl font-semibold tracking-[-0.02em]">上传一张原始照片</h2>
                  <p className="mt-2 text-sm text-black/38">点击选择，或直接将 JPG / TIFF 拖到这里</p>
                  <button type="button" className="mt-6 bg-[#caff82] px-5 py-3 text-xs font-semibold text-black">
                    选择图片
                  </button>
                  <p className="mt-4 text-[11px] text-black/28">文件仅在浏览器本地读取，不会上传到服务器</p>
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {[
                  ["读取拍摄参数", "相机、镜头、快门、光圈、ISO"],
                  ["查看 GPS", "如果原图保留定位信息，可直接查看坐标"],
                  ["生成参数边框", "自动排版相机品牌与摄影参数"],
                ].map(([title, desc]) => (
                  <div key={title} className="border border-black/10 bg-white/45 p-4">
                    <div className="text-xs font-semibold">{title}</div>
                    <div className="mt-1 text-[11px] leading-5 text-black/35">{desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <>
            {error && (
              <div className="mt-5 border-l-2 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="min-w-0 space-y-4">
                <div className="overflow-hidden border border-black/10 bg-[#faf9f5]">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 px-4 py-3">
                    <div>
                      <div className="text-[10px] font-medium tracking-[0.12em] text-black/28">原图预览</div>
                      <div className="mt-1 max-w-[60vw] truncate text-sm font-medium">{file?.name}</div>
                    </div>
                    <div className="text-[11px] text-black/35">{file ? formatFileSize(file.size) : ""}</div>
                  </div>

                  <div className="flex min-h-[520px] items-center justify-center bg-[#e6e5df] p-4 sm:p-6">
                    <img src={previewSrc} alt="原图预览" className="max-h-[68vh] max-w-full object-contain shadow-[0_18px_50px_rgba(20,20,15,.12)]" />
                  </div>
                </div>

                <div className="border border-black/10 bg-[#faf9f5]">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 px-4 py-3">
                    <div>
                      <div className="text-[10px] font-medium tracking-[0.12em] text-black/28">参数边框</div>
                      <div className="mt-1 text-sm font-medium">生成可直接保存的摄影信息边框</div>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => setFrameTheme("light")} className={`px-3 py-2 text-[11px] font-medium ${frameTheme === "light" ? "bg-black text-white" : "border border-black/10"}`}>
                        浅色
                      </button>
                      <button onClick={() => setFrameTheme("dark")} className={`px-3 py-2 text-[11px] font-medium ${frameTheme === "dark" ? "bg-black text-white" : "border border-black/10"}`}>
                        深色
                      </button>
                    </div>
                  </div>

                  <div className="min-h-[180px] overflow-auto bg-[#e6e5df] p-3">
                    <canvas ref={outputCanvasRef} className="mx-auto max-w-full shadow-sm" />
                    {!frameReady && (
                      <div className="flex min-h-[180px] items-center justify-center text-xs text-black/30">
                        点击下方按钮生成边框预览
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 border-t border-black/10 p-3">
                    <button
                      onClick={renderExifFrame}
                      disabled={!exifInfo}
                      className="bg-[#171713] px-4 py-2.5 text-xs font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      生成参数边框
                    </button>
                    <button
                      onClick={downloadFramedImage}
                      disabled={!frameReady}
                      className="bg-[#caff82] px-4 py-2.5 text-xs font-semibold text-black transition disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      下载图片
                    </button>
                  </div>
                </div>
              </div>

              <aside className="min-w-0 space-y-4">
                <div className="border border-black/10 bg-[#faf9f5]">
                  <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
                    <div>
                      <div className="text-[10px] font-medium tracking-[0.12em] text-black/28">拍摄信息</div>
                      <div className="mt-1 text-sm font-medium">常用参数摘要</div>
                    </div>
                    {exifInfo && (
                      <button onClick={handleCopyExif} className="border border-black/10 px-3 py-2 text-[11px] font-medium transition hover:bg-black hover:text-white">
                        复制全部
                      </button>
                    )}
                  </div>

                  {exifInfo ? (
                    <div className="divide-y divide-black/[0.07]">
                      {keyFields.map(([label, value]) => (
                        <button key={label} onClick={() => copyValue(label, value)} className="grid w-full grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition hover:bg-black/[0.025]">
                          <span className="text-[11px] text-black/35">{label}</span>
                          <span className="truncate text-sm font-medium text-black/75">{value}</span>
                          <span className="text-[10px] text-black/20">复制</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-5 text-sm text-black/35">正在读取 EXIF…</div>
                  )}
                </div>

                {summary?.latitude != null && summary?.longitude != null && (
                  <div className="border border-black/10 bg-[#dfe9d6] p-4">
                    <div className="text-[10px] font-medium tracking-[0.12em] text-black/30">GPS 定位</div>
                    <div className="mt-2 font-mono text-sm font-semibold">
                      {summary.latitude.toFixed(6)}, {summary.longitude.toFixed(6)}
                    </div>
                    <a
                      href={`https://www.google.com/maps?q=${summary.latitude},${summary.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-block border-b border-black/30 pb-0.5 text-xs font-medium"
                    >
                      在地图中查看 ↗
                    </a>
                  </div>
                )}

                <div className="border border-black/10 bg-[#faf9f5]">
                  <div className="border-b border-black/10 px-4 py-3">
                    <div className="text-[10px] font-medium tracking-[0.12em] text-black/28">完整 EXIF</div>
                    <div className="mt-1 text-sm font-medium">{exifInfo ? `${Object.keys(exifInfo).length} 项元数据` : "暂无数据"}</div>
                  </div>

                  <div className="max-h-[430px] overflow-y-auto">
                    {exifInfo ? (
                      Object.entries(exifInfo).map(([key, value]) => (
                        <div key={key} className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 border-b border-black/[0.06] px-4 py-2.5 last:border-b-0">
                          <div className="truncate font-mono text-[10px] text-black/32">{key}</div>
                          <div className="break-all font-mono text-[11px] leading-5 text-black/65">{toDisplayValue(value)}</div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-sm text-black/30">暂无 EXIF 数据</div>
                    )}
                  </div>
                </div>
              </aside>
            </section>
          </>
        )}

        <div className="mt-8 border-t border-black/10 pt-5">
          <div className="grid gap-3 text-[11px] leading-5 text-black/38 sm:grid-cols-2 lg:grid-cols-4">
            <div>原始相机照片最容易保留完整 EXIF。</div>
            <div>截图与社交平台保存图片通常已清除元数据。</div>
            <div>GPS 属于隐私信息，对外分享前建议检查。</div>
            <div>生成边框不会修改原始文件。</div>
          </div>
        </div>

        <FooterNote />
      </div>

      {copied && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 bg-[#171713] px-4 py-2.5 text-xs font-medium text-white shadow-lg">
          {copied}
        </div>
      )}
    </main>
  )
}
