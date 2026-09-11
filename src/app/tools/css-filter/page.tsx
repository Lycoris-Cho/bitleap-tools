"use client"

import type { ChangeEvent, DragEvent } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type FilterKey = "brightness" | "contrast" | "blur" | "grayscale" | "hueRotate" | "saturate" | "sepia" | "invert" | "opacity"
type CopyKey = "filter" | "css" | "tailwind" | "report" | null
type PreviewFit = "cover" | "contain"
type PreviewMode = "sample" | "image"
type BackgroundMode = "editorial" | "dark" | "checker" | "plain"

type FilterState = Record<FilterKey, number>

type Preset = {
  id: string
  name: string
  desc: string
  values: FilterState
  backgroundMode: BackgroundMode
}

type UploadedImage = {
  url: string
  name: string
  size: number
  type: string
}

const DEFAULT_FILTERS: FilterState = {
  brightness: 100,
  contrast: 100,
  blur: 0,
  grayscale: 0,
  hueRotate: 0,
  saturate: 100,
  sepia: 0,
  invert: 0,
  opacity: 100,
}

const FILTER_META: Array<{
  key: FilterKey
  label: string
  cssName: string
  min: number
  max: number
  step: number
  unit: string
  neutral: number
  desc: string
}> = [
  { key: "brightness", label: "亮度", cssName: "brightness", min: 0, max: 220, step: 1, unit: "%", neutral: 100, desc: "控制明暗，100% 为原图。" },
  { key: "contrast", label: "对比度", cssName: "contrast", min: 0, max: 240, step: 1, unit: "%", neutral: 100, desc: "控制明暗反差，100% 为原图。" },
  { key: "blur", label: "模糊", cssName: "blur", min: 0, max: 40, step: 0.5, unit: "px", neutral: 0, desc: "给元素整体增加高斯模糊。" },
  { key: "grayscale", label: "灰度", cssName: "grayscale", min: 0, max: 100, step: 1, unit: "%", neutral: 0, desc: "把画面转成黑白，100% 为完全灰度。" },
  { key: "hueRotate", label: "色相旋转", cssName: "hue-rotate", min: -180, max: 180, step: 1, unit: "deg", neutral: 0, desc: "沿色相环旋转颜色。" },
  { key: "saturate", label: "饱和度", cssName: "saturate", min: 0, max: 320, step: 1, unit: "%", neutral: 100, desc: "控制颜色浓度，100% 为原图。" },
  { key: "sepia", label: "深褐色", cssName: "sepia", min: 0, max: 100, step: 1, unit: "%", neutral: 0, desc: "加入复古棕黄色调。" },
  { key: "invert", label: "反相", cssName: "invert", min: 0, max: 100, step: 1, unit: "%", neutral: 0, desc: "反转颜色，100% 为完全反相。" },
  { key: "opacity", label: "透明度", cssName: "opacity", min: 0, max: 100, step: 1, unit: "%", neutral: 100, desc: "控制元素透明度。" },
]

const PRESETS: Preset[] = [
  {
    id: "clean",
    name: "原始",
    desc: "恢复默认状态，适合重新开始。",
    backgroundMode: "editorial",
    values: DEFAULT_FILTERS,
  },
  {
    id: "cinema",
    name: "电影冷调",
    desc: "低亮度、高对比、轻微降饱和。",
    backgroundMode: "dark",
    values: {
      brightness: 92,
      contrast: 132,
      blur: 0,
      grayscale: 0,
      hueRotate: -14,
      saturate: 82,
      sepia: 7,
      invert: 0,
      opacity: 100,
    },
  },
  {
    id: "film",
    name: "胶片暖色",
    desc: "暖色偏移、轻 sepia 和高饱和。",
    backgroundMode: "editorial",
    values: {
      brightness: 108,
      contrast: 112,
      blur: 0,
      grayscale: 0,
      hueRotate: 12,
      saturate: 128,
      sepia: 22,
      invert: 0,
      opacity: 100,
    },
  },
  {
    id: "noir",
    name: "黑白报刊",
    desc: "灰度、高对比，适合封面标题。",
    backgroundMode: "plain",
    values: {
      brightness: 102,
      contrast: 142,
      blur: 0,
      grayscale: 100,
      hueRotate: 0,
      saturate: 0,
      sepia: 0,
      invert: 0,
      opacity: 100,
    },
  },
  {
    id: "dream",
    name: "柔梦感",
    desc: "微模糊、高亮、淡饱和。",
    backgroundMode: "editorial",
    values: {
      brightness: 118,
      contrast: 92,
      blur: 1.5,
      grayscale: 0,
      hueRotate: 6,
      saturate: 118,
      sepia: 10,
      invert: 0,
      opacity: 100,
    },
  },
  {
    id: "duotone",
    name: "实验反相",
    desc: "强色相和局部反相，适合海报试验。",
    backgroundMode: "dark",
    values: {
      brightness: 105,
      contrast: 126,
      blur: 0,
      grayscale: 0,
      hueRotate: 130,
      saturate: 190,
      sepia: 0,
      invert: 18,
      opacity: 100,
    },
  },
]

const SAMPLE_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 760">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f7ecd0"/>
      <stop offset="42%" stop-color="#c7d9c3"/>
      <stop offset="100%" stop-color="#4f6358"/>
    </linearGradient>
    <linearGradient id="sun" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fff4b8"/>
      <stop offset="100%" stop-color="#c7825d"/>
    </linearGradient>
    <radialGradient id="glow" cx="26%" cy="20%" r="45%">
      <stop offset="0%" stop-color="#fff6cc" stop-opacity=".85"/>
      <stop offset="100%" stop-color="#fff6cc" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="760" fill="url(#sky)"/>
  <rect width="1200" height="760" fill="url(#glow)"/>
  <circle cx="286" cy="184" r="96" fill="url(#sun)" opacity=".94"/>
  <path d="M0 530 C190 450 330 455 500 520 C690 592 838 450 1200 522 L1200 760 L0 760 Z" fill="#2f453e" opacity=".88"/>
  <path d="M0 605 C205 555 382 590 538 628 C744 680 945 566 1200 612 L1200 760 L0 760 Z" fill="#1d2d2a" opacity=".72"/>
  <path d="M93 516 C188 422 268 432 372 514" fill="none" stroke="#f5e7c2" stroke-width="6" opacity=".4"/>
  <path d="M797 519 C913 386 1015 394 1127 504" fill="none" stroke="#f5e7c2" stroke-width="7" opacity=".32"/>
  <g opacity=".22" fill="#ffffff">
    <circle cx="786" cy="188" r="9"/>
    <circle cx="845" cy="250" r="5"/>
    <circle cx="710" cy="262" r="4"/>
    <circle cx="944" cy="170" r="7"/>
  </g>
  <text x="82" y="674" fill="#fff5df" font-family="ui-sans-serif, system-ui" font-size="42" font-weight="700" letter-spacing="-2">BitLeap Filter Preview</text>
</svg>`)

function formatNumber(value: number, digits = 0) {
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: digits,
  }).format(value)
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function filterPart(meta: (typeof FILTER_META)[number], value: number) {
  if (meta.key === "hueRotate") return `${meta.cssName}(${value}deg)`
  return `${meta.cssName}(${value}${meta.unit})`
}

function buildFilter(values: FilterState, compact: boolean) {
  const parts = FILTER_META
    .filter((meta) => !compact || values[meta.key] !== meta.neutral)
    .map((meta) => filterPart(meta, values[meta.key]))

  return parts.length ? parts.join(" ") : "none"
}

function escapeTailwindValue(value: string) {
  return value.replace(/\s+/g, "_").replace(/,/g, ",")
}

function backgroundStyle(mode: BackgroundMode) {
  if (mode === "dark") {
    return {
      backgroundColor: "#151714",
      backgroundImage: "radial-gradient(circle at 23% 14%, rgba(143,182,155,.18), transparent 34%), radial-gradient(circle at 78% 88%, rgba(178,141,72,.16), transparent 32%)",
      backgroundSize: "auto",
      backgroundPosition: "center",
    }
  }

  if (mode === "checker") {
    return {
      backgroundColor: "#f1eee6",
      backgroundImage: "linear-gradient(45deg, rgba(0,0,0,.045) 25%, transparent 25%), linear-gradient(-45deg, rgba(0,0,0,.045) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(0,0,0,.045) 75%), linear-gradient(-45deg, transparent 75%, rgba(0,0,0,.045) 75%)",
      backgroundSize: "24px 24px",
      backgroundPosition: "0 0, 0 12px, 12px -12px, -12px 0px",
    }
  }

  if (mode === "plain") {
    return {
      backgroundColor: "#f4f1e9",
      backgroundImage: "none",
      backgroundSize: "auto",
      backgroundPosition: "center",
    }
  }

  return {
    backgroundColor: "#f4f1e9",
    backgroundImage: "radial-gradient(circle at 82% 12%, rgba(178,141,72,.14), transparent 30%), radial-gradient(circle at 12% 86%, rgba(82,104,93,.12), transparent 32%)",
    backgroundSize: "auto",
    backgroundPosition: "center",
  }
}

function downloadText(content: string, filename: string) {
  if (!content) return

  const blob = new Blob([content], {
    type: "text/plain;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 500)
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  desc,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  desc: string
  onChange: (value: number) => void
}) {
  return (
    <div className="rounded-[20px] border border-black/[.07] bg-white/22 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[9px] font-semibold text-black/58">{label}</span>
        <span className="filter-num font-mono text-[10px] font-semibold text-[#52685d]">{formatNumber(value, step < 1 ? 1 : 0)}{unit}</span>
      </div>
      <div className="flex items-center gap-3">
        <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="min-w-0 flex-1 accent-[#52685d]" />
        <input type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(clamp(Number(event.target.value) || 0, min, max))} className="w-20 rounded-full border border-black/[.08] bg-white/36 px-3 py-2 font-mono text-[10px] outline-none focus:border-black/22" />
      </div>
      <p className="mt-2 text-[8px] leading-4 text-black/28">{desc}</p>
    </div>
  )
}

function TogglePill({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`rounded-full border px-3.5 py-2 text-[8px] font-semibold transition ${active ? "border-[#52685d]/20 bg-[#52685d] text-white" : "border-black/[.085] text-black/34 hover:bg-white/45 hover:text-black"}`}>
      {label}
    </button>
  )
}

function StatBox({
  label,
  value,
  tone = "ink",
}: {
  label: string
  value: string
  tone?: "ink" | "green" | "gold" | "rose"
}) {
  const toneClass = tone === "green" ? "text-[#52685d]" : tone === "gold" ? "text-[#9b7542]" : tone === "rose" ? "text-[#965744]" : "text-black/61"

  return (
    <div className="bg-[#f3f0e8]/92 p-4">
      <div className="text-[7px] font-semibold tracking-[.12em] text-black/23">{label}</div>
      <div className={`filter-num mt-3 break-all font-mono text-[13px] font-semibold ${toneClass}`}>{value}</div>
    </div>
  )
}

export default function CssFilterPage() {
  const [values, setValues] = useState<FilterState>(DEFAULT_FILTERS)
  const [compactOutput, setCompactOutput] = useState(true)
  const [showBeforeAfter, setShowBeforeAfter] = useState(false)
  const [split, setSplit] = useState(50)
  const [previewFit, setPreviewFit] = useState<PreviewFit>("cover")
  const [previewMode, setPreviewMode] = useState<PreviewMode>("sample")
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>("editorial")
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null)
  const [copied, setCopied] = useState<CopyKey>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState("")

  const pageRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef("")

  const filterValue = useMemo(() => buildFilter(values, compactOutput), [compactOutput, values])
  const cssCode = useMemo(() => `filter: ${filterValue};`, [filterValue])
  const cssBlock = useMemo(() => [".filtered-image {", `  filter: ${filterValue};`, "}"].join("\n"), [filterValue])
  const tailwindValue = useMemo(() => `className="[filter:${escapeTailwindValue(filterValue)}]"`, [filterValue])
  const activeCount = useMemo(() => FILTER_META.filter((meta) => values[meta.key] !== meta.neutral).length, [values])
  const previewSource = previewMode === "image" && uploadedImage ? uploadedImage.url : SAMPLE_IMAGE
  const report = useMemo(
    () =>
      [
        "BitLeap CSS Filter Studio",
        "",
        `filter: ${filterValue}`,
        `active filters: ${activeCount}`,
        `output mode: ${compactOutput ? "compact" : "full"}`,
        `preview: ${previewMode}`,
        uploadedImage ? `uploaded: ${uploadedImage.name} · ${formatBytes(uploadedImage.size)}` : "uploaded: none",
        "",
        "Values:",
        FILTER_META.map((meta) => `${meta.label}: ${values[meta.key]}${meta.unit}`).join("\n"),
        "",
        "CSS:",
        cssBlock,
        "",
        "Tailwind:",
        tailwindValue,
      ].join("\n"),
    [activeCount, compactOutput, cssBlock, filterValue, previewMode, tailwindValue, uploadedImage, values],
  )

  const background = backgroundStyle(backgroundMode)

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  useEffect(() => {
    if (!pageRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      gsap.from(".filter-intro", {
        y: 22,
        opacity: 0,
        duration: 0.78,
        stagger: 0.055,
        ease: "power3.out",
      })

      gsap.to(".filter-orbit-a", {
        rotation: 360,
        duration: 72,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })

      gsap.to(".filter-orbit-b", {
        rotation: -360,
        duration: 104,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })
    }, pageRef)

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (!previewRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    gsap.fromTo(
      previewRef.current,
      { opacity: 0.72, scale: 0.992 },
      {
        opacity: 1,
        scale: 1,
        duration: 0.22,
        ease: "power2.out",
        overwrite: true,
      },
    )
  }, [filterValue, previewMode, backgroundMode, previewFit])

  const updateValue = (key: FilterKey, value: number) => {
    const meta = FILTER_META.find((item) => item.key === key)
    if (!meta) return

    setValues((current) => ({
      ...current,
      [key]: clamp(value, meta.min, meta.max),
    }))
  }

  const applyPreset = (preset: Preset) => {
    setValues(preset.values)
    setBackgroundMode(preset.backgroundMode)
    setCopied(null)
  }

  const reset = () => {
    setValues(DEFAULT_FILTERS)
    setCompactOutput(true)
    setShowBeforeAfter(false)
    setSplit(50)
    setPreviewFit("cover")
    setBackgroundMode("editorial")
    setCopied(null)
    setError("")
  }

  const handleUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件")
      return
    }

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)

    const url = URL.createObjectURL(file)
    objectUrlRef.current = url

    setUploadedImage({
      url,
      name: file.name,
      size: file.size,
      type: file.type,
    })
    setPreviewMode("image")
    setError("")

    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) handleUpload(file)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)

    const file = event.dataTransfer.files?.[0]
    if (file) handleUpload(file)
  }

  const removeImage = () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = ""
    setUploadedImage(null)
    setPreviewMode("sample")
  }

  const copy = async (value: string, key: CopyKey) => {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {
      setError("复制失败，请手动复制")
    }
  }

  return (
    <div ref={pageRef} className="min-h-screen overflow-hidden bg-[#efede6] text-[#22231f] selection:bg-[#22231f] selection:text-white">
      <style>{`
        .filter-scroll::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }

        .filter-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .filter-scroll::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(34,35,31,.13);
        }

        .filter-dark-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,.14);
        }

        .filter-grid {
          background-image:
            linear-gradient(rgba(34,35,31,.032) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,35,31,.032) 1px, transparent 1px);
          background-size: 30px 30px;
        }

        .filter-num {
          font-variant-numeric: tabular-nums lining-nums;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_9%,rgba(178,151,91,.10),transparent_27%),radial-gradient(circle_at_8%_88%,rgba(73,107,91,.08),transparent_31%)]" />
        <div className="filter-orbit-a absolute right-[-20vw] top-[-24vw] h-[58vw] w-[58vw] rounded-full border border-black/[.04]">
          <span className="absolute left-[15%] top-[43%] h-2 w-2 rounded-full bg-[#b28d48]/38" />
        </div>
        <div className="filter-orbit-b absolute bottom-[-26vw] left-[-19vw] h-[53vw] w-[53vw] rounded-full border border-black/[.032]">
          <span className="absolute right-[14%] top-[31%] h-1.5 w-1.5 rounded-full bg-[#52685d]/35" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1580px] px-5 pb-10 pt-6 sm:px-8">
        <div className="filter-intro">
          <Breadcrumb />
        </div>

        <header className="filter-intro mt-8 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/27">CSS FILTER STUDIO</div>
            <h1 className="mt-4 max-w-[900px] text-[clamp(48px,6.35vw,90px)] font-semibold leading-[1.03] tracking-[-.055em]">
              给画面，
              <br />
              调一层滤镜。
            </h1>
          </div>

          <div>
            <p className="max-w-[560px] text-[11px] leading-6 text-black/40">
              可视化生成 CSS filter，支持预设、图片上传、本地预览、before / after 对比、精简输出、Tailwind arbitrary value 和完整报告导出。
            </p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[8px] text-black/25">
              <span>{activeCount} ACTIVE FILTERS</span>
              <span>LOCAL IMAGE</span>
              <span>BEFORE / AFTER</span>
              <span>CSS / TAILWIND</span>
            </div>
          </div>
        </header>

        <section className="filter-intro mt-7 grid gap-7 xl:grid-cols-[.66fr_1.34fr]">
          <aside className="min-w-0">
            <div className="rounded-[28px] border border-black/[.075] bg-white/24 p-5">
              <div className="text-[8px] font-semibold tracking-[.14em] text-black/24">PRESETS</div>
              <h2 className="mt-3 text-[clamp(30px,3.5vw,46px)] font-semibold leading-none tracking-[-.045em]">快速色调。</h2>

              <div className="filter-scroll mt-6 grid max-h-[360px] gap-2 overflow-auto pr-1 sm:grid-cols-2">
                {PRESETS.map((preset) => (
                  <button key={preset.id} type="button" onClick={() => applyPreset(preset)} className="rounded-[20px] border border-black/[.08] bg-white/22 p-4 text-left transition hover:bg-white/48">
                    <div className="font-mono text-[8px] font-semibold text-black/24">{preset.id.toUpperCase()}</div>
                    <div className="mt-2 text-[14px] font-semibold tracking-[-.03em] text-black/70">{preset.name}</div>
                    <p className="mt-2 text-[8px] leading-4 text-black/30">{preset.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-[24px] border border-black/[.075] bg-white/24 p-5">
              <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">SOURCE IMAGE</div>

              <div onDragOver={(event) => event.preventDefault()} onDragEnter={() => setIsDragging(true)} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop} className={`mt-4 rounded-[22px] border border-dashed p-5 text-center transition ${isDragging ? "border-[#52685d] bg-[#52685d]/8" : "border-black/[.13] bg-white/20"}`}>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white transition hover:scale-[1.01] active:scale-[.98]">选择图片</button>
                <p className="mt-3 text-[9px] leading-5 text-black/32">也可以拖拽图片到这里；不上传服务器。</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <TogglePill active={previewMode === "sample"} label="内置样张" onClick={() => setPreviewMode("sample")} />
                <TogglePill active={previewMode === "image"} label="上传图片" onClick={() => uploadedImage && setPreviewMode("image")} />
                {uploadedImage && (
                  <button type="button" onClick={removeImage} className="rounded-full px-3.5 py-2 text-[8px] font-semibold text-[#965744] transition hover:bg-[#965744]/8">移除图片</button>
                )}
              </div>

              <p className="mt-3 break-all text-[8px] leading-4 text-black/28">
                {uploadedImage ? `${uploadedImage.name} · ${formatBytes(uploadedImage.size)}` : "当前使用内置 SVG 样张。"}
              </p>
            </div>

            <div className="mt-4 overflow-hidden rounded-[24px] border border-black/[.075] bg-white/24">
              <div className="border-b border-black/[.06] px-5 py-4">
                <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">FILTER PROFILE</div>
                <p className="mt-2 text-[9px] leading-5 text-black/35">精简输出只保留非默认滤镜；完整输出会列出全部 filter 函数。</p>
              </div>

              <div className="grid grid-cols-2 gap-px bg-black/[.06]">
                <StatBox label="ACTIVE" value={formatNumber(activeCount)} tone="green" />
                <StatBox label="OUTPUT" value={compactOutput ? "COMPACT" : "FULL"} tone="gold" />
                <StatBox label="SOURCE" value={previewMode.toUpperCase()} />
                <StatBox label="FILTER LEN" value={formatNumber(filterValue.length)} />
              </div>

              {error && (
                <div className="border-t border-black/[.06] px-5 py-4">
                  <div className="text-[8px] font-semibold tracking-[.12em] text-[#965744]">ERROR</div>
                  <p className="mt-2 break-words text-[9px] leading-5 text-[#965744]">{error}</p>
                </div>
              )}
            </div>
          </aside>

          <div className="min-w-0">
            <div className="grid gap-px overflow-hidden rounded-[30px] border border-black/[.08] bg-black/[.08] lg:grid-cols-[.92fr_1.08fr]">
              <div className="bg-[#f4f1e9]">
                <div className="flex h-12 items-center justify-between border-b border-black/[.065] px-5">
                  <span className="text-[8px] font-semibold tracking-[.13em] text-black/26">FILTER CONTROLS</span>
                  <span className="text-[8px] text-black/22">{activeCount} active</span>
                </div>

                <div className="filter-scroll h-[690px] overflow-auto p-5 sm:p-6">
                  <div className="grid gap-3">
                    {FILTER_META.map((meta) => (
                      <Slider key={meta.key} label={meta.label} value={values[meta.key]} min={meta.min} max={meta.max} step={meta.step} unit={meta.unit === "deg" ? "°" : meta.unit} desc={meta.desc} onChange={(value) => updateValue(meta.key, value)} />
                    ))}
                  </div>

                  <div className="mt-5 rounded-[22px] border border-black/[.075] bg-white/24 p-5">
                    <div className="mb-4 text-[8px] font-semibold tracking-[.12em] text-black/24">VIEW OPTIONS</div>
                    <div className="flex flex-wrap gap-2">
                      <TogglePill active={compactOutput} label="精简 CSS" onClick={() => setCompactOutput((value) => !value)} />
                      <TogglePill active={showBeforeAfter} label="前后对比" onClick={() => setShowBeforeAfter((value) => !value)} />
                      <TogglePill active={previewFit === "cover"} label={previewFit === "cover" ? "Cover" : "Contain"} onClick={() => setPreviewFit((value) => (value === "cover" ? "contain" : "cover"))} />
                    </div>

                    {showBeforeAfter && (
                      <div className="mt-4">
                        <div className="mb-2 flex justify-between text-[8px] text-black/28">
                          <span>对比线</span>
                          <span className="filter-num font-mono text-[#52685d]">{split}%</span>
                        </div>
                        <input type="range" min={0} max={100} value={split} onChange={(event) => setSplit(Number(event.target.value))} className="w-full accent-[#52685d]" />
                      </div>
                    )}

                    <div className="mt-4">
                      <div className="mb-2 text-[8px] font-semibold tracking-[.12em] text-black/24">BACKGROUND</div>
                      <div className="flex flex-wrap gap-1.5">
                        {(["editorial", "dark", "checker", "plain"] as BackgroundMode[]).map((mode) => (
                          <button key={mode} type="button" onClick={() => setBackgroundMode(mode)} className={`rounded-full px-3 py-2 font-mono text-[8px] font-semibold transition ${backgroundMode === mode ? "bg-[#52685d] text-white" : "text-black/32 hover:bg-white/45 hover:text-black"}`}>{mode}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button type="button" onClick={reset} className="rounded-full px-4 py-3 text-[9px] font-semibold text-[#965744] transition hover:bg-[#965744]/8">重置</button>
                    <button type="button" onClick={() => downloadText(report, "bitleap-css-filter-report.txt")} className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 transition hover:bg-white/40">导出报告</button>
                  </div>
                </div>
              </div>

              <div className="bg-[#151714]">
                <div className="flex h-12 items-center justify-between border-b border-white/[.065] px-5">
                  <span className="text-[8px] font-semibold tracking-[.13em] text-white/27">LIVE PREVIEW</span>
                  <span className="text-[8px] text-[#8fb69b]">READY</span>
                </div>

                <div className="p-4 sm:p-5">
                  <div ref={previewRef} className="relative grid h-[422px] place-items-center overflow-hidden rounded-[26px] border border-white/[.065] p-5" style={background}>
                    {showBeforeAfter ? (
                      <div className="relative h-full w-full overflow-hidden rounded-[20px] bg-black/10">
                        <img src={previewSource} alt="" className={`absolute inset-0 h-full w-full ${previewFit === "cover" ? "object-cover" : "object-contain"}`} />
                        <div className="absolute inset-0 overflow-hidden" style={{ width: `${split}%` }}>
                          <img src={previewSource} alt="" className={`h-full w-full ${previewFit === "cover" ? "object-cover" : "object-contain"}`} style={{ filter: filterValue }} />
                        </div>
                        <div className="absolute bottom-4 left-4 rounded-full bg-black/46 px-3 py-1.5 text-[8px] font-semibold text-white/72">FILTERED</div>
                        <div className="absolute bottom-4 right-4 rounded-full bg-black/46 px-3 py-1.5 text-[8px] font-semibold text-white/72">ORIGINAL</div>
                        <div className="absolute bottom-0 top-0 w-px bg-white/80" style={{ left: `${split}%` }} />
                      </div>
                    ) : (
                      <img src={previewSource} alt="" className={`max-h-full max-w-full rounded-[20px] shadow-2xl shadow-black/30 ${previewFit === "cover" ? "h-full w-full object-cover" : "object-contain"}`} style={{ filter: filterValue }} />
                    )}
                  </div>

                  <div className="mt-4 space-y-3">
                    {[
                      { label: "filter value", value: filterValue, key: "filter" as CopyKey },
                      { label: "CSS block", value: cssBlock, key: "css" as CopyKey },
                      { label: "Tailwind arbitrary", value: tailwindValue, key: "tailwind" as CopyKey },
                    ].map((item) => (
                      <div key={item.label} className="group rounded-[20px] border border-white/[.065] bg-white/[.035] p-4">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-[8px] font-semibold tracking-[.12em] text-white/24">{item.label}</span>
                          <button type="button" onClick={() => copy(item.value, item.key)} className="text-[8px] font-semibold text-white/25 transition hover:text-white">{copied === item.key ? "✓ COPIED" : "COPY"}</button>
                        </div>
                        <pre className="filter-dark-scroll max-h-[132px] overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-5 text-[#cbd8cd]">{item.value}</pre>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="filter-intro mt-12 grid gap-9 border-t border-black/10 pt-8 lg:grid-cols-[.55fr_1.45fr]">
          <div>
            <div className="text-[9px] font-semibold tracking-[.14em] text-black/25">REPORT</div>
            <h2 className="mt-3 text-[clamp(30px,4vw,46px)] font-semibold leading-[1.06] tracking-[-.045em]">
              滤镜参数，
              <br />
              一起导出。
            </h2>
            <p className="mt-5 max-w-[380px] text-[9px] leading-5 text-black/34">
              报告包含当前 filter、所有滑块数值、CSS block 和 Tailwind arbitrary value，方便贴进组件或设计记录。
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" onClick={() => copy(report, "report")} className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white">{copied === "report" ? "✓ 已复制报告" : "复制报告"}</button>
              <button type="button" onClick={() => downloadText(report, "bitleap-css-filter-report.txt")} className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 transition hover:bg-white/40">导出报告</button>
            </div>
          </div>

          <div className="overflow-hidden rounded-[25px] border border-black/[.08] bg-[#171916]">
            <div className="flex items-center justify-between border-b border-white/[.07] px-5 py-3">
              <span className="text-[8px] tracking-[.13em] text-white/25">FILTER PROFILE</span>
              <span className="text-[8px] text-white/17">LOCAL GENERATOR</span>
            </div>
            <pre className="filter-dark-scroll max-h-[390px] overflow-auto whitespace-pre-wrap break-words p-5 font-mono text-[11px] leading-7 text-[#c7d3c7] sm:p-6">{report}</pre>
          </div>
        </section>

        <section className="filter-intro mt-12 grid gap-8 border-t border-black/10 pt-7 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">ORDER MATTERS</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">CSS filter 函数会按顺序执行。这里固定顺序输出，便于结果稳定复现。</p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">LOCAL IMAGE</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">上传图片使用 object URL 本地预览，不会上传服务器；移除或离开页面会释放资源。</p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">CSS NOTE</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">blur 和高强度 filter 可能影响性能，移动端大面积背景滤镜建议谨慎使用。</p>
          </div>
        </section>

        <div className="mt-12 border-t border-black/[.08] pt-5">
          <FooterNote />
        </div>
      </div>
    </div>
  )
}
