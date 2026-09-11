"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import QRCode from "qrcode"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type ContentType = "url" | "text" | "wifi"
type WifiSecurity = "WPA" | "WEP" | "nopass"
type ErrorLevel = "L" | "M" | "Q" | "H"

const SIZE_PRESETS = [256, 512, 1024]
const COLOR_PRESETS = [
  { dark: "#171914", light: "#F3F0E8", label: "墨色" },
  { dark: "#173E36", light: "#F3F0E8", label: "松绿" },
  { dark: "#26344A", light: "#F4F1E9", label: "深蓝" },
  { dark: "#5E3F35", light: "#F3EEE7", label: "陶土" },
]

function escapeWifi(value: string) {
  return value.replace(/([\\;,:"'])/g, "\\$1")
}

function normalizeHex(value: string, fallback: string) {
  const raw = value.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toUpperCase()
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toUpperCase()}`
  return fallback
}

function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex, "#000000").slice(1)
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  }
}

function luminance(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  const channel = (value: number) => {
    const srgb = value / 255
    return srgb <= 0.03928
      ? srgb / 12.92
      : ((srgb + 0.055) / 1.055) ** 2.4
  }
  return (
    0.2126 * channel(r) +
    0.7152 * channel(g) +
    0.0722 * channel(b)
  )
}

function contrastRatio(a: string, b: string) {
  const first = luminance(a)
  const second = luminance(b)
  const lighter = Math.max(first, second)
  const darker = Math.min(first, second)
  return (lighter + 0.05) / (darker + 0.05)
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 500)
}

export default function QrcodePage() {
  const [type, setType] = useState<ContentType>("url")
  const [text, setText] = useState("https://bitleap.app")
  const [wifiPassword, setWifiPassword] = useState("")
  const [wifiSecurity, setWifiSecurity] = useState<WifiSecurity>("WPA")
  const [wifiHidden, setWifiHidden] = useState(false)

  const [size, setSize] = useState(512)
  const [margin, setMargin] = useState(2)
  const [errorLevel, setErrorLevel] = useState<ErrorLevel>("M")
  const [dark, setDark] = useState("#171914")
  const [light, setLight] = useState("#F3F0E8")

  const [dataUrl, setDataUrl] = useState("")
  const [status, setStatus] = useState<"idle" | "generating" | "ready" | "error">("idle")
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  const pageRef = useRef<HTMLDivElement>(null)
  const qrRef = useRef<HTMLImageElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const content = useMemo(() => {
    const value = text.trim()
    if (!value) return ""

    if (type !== "wifi") return value

    const ssid = escapeWifi(value)
    const password = escapeWifi(wifiPassword.trim())
    const security = wifiSecurity

    if (security === "nopass") {
      return `WIFI:T:nopass;S:${ssid};H:${wifiHidden ? "true" : "false"};;`
    }

    return `WIFI:T:${security};S:${ssid};P:${password};H:${wifiHidden ? "true" : "false"};;`
  }, [text, type, wifiPassword, wifiSecurity, wifiHidden])

  const normalizedDark = useMemo(
    () => normalizeHex(dark, "#171914"),
    [dark],
  )
  const normalizedLight = useMemo(
    () => normalizeHex(light, "#F3F0E8"),
    [light],
  )
  const contrast = useMemo(
    () => contrastRatio(normalizedDark, normalizedLight),
    [normalizedDark, normalizedLight],
  )

  const label = useMemo(() => {
    if (type === "url") return "网址"
    if (type === "wifi") return "WiFi 名称"
    return "文本内容"
  }, [type])

  const placeholder = useMemo(() => {
    if (type === "url") return "https://example.com"
    if (type === "wifi") return "My WiFi"
    return "输入任意文本…"
  }, [type])

  const generate = useCallback(async () => {
    if (!content) {
      setDataUrl("")
      setStatus("idle")
      setError("")
      return
    }

    setStatus("generating")
    setError("")

    try {
      const url = await QRCode.toDataURL(content, {
        width: size,
        margin,
        errorCorrectionLevel: errorLevel,
        color: {
          dark: normalizedDark,
          light: normalizedLight,
        },
      })

      setDataUrl(url)
      setStatus("ready")
    } catch {
      setStatus("error")
      setError("二维码生成失败。请检查内容长度、颜色或参数后重试。")
    }
  }, [
    content,
    size,
    margin,
    errorLevel,
    normalizedDark,
    normalizedLight,
  ])

  useEffect(() => {
    const timer = window.setTimeout(generate, 120)
    return () => window.clearTimeout(timer)
  }, [generate])

  useEffect(() => {
    if (
      !pageRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    const ctx = gsap.context(() => {
      gsap.from(".qr-intro", {
        y: 22,
        opacity: 0,
        duration: 0.82,
        stagger: 0.065,
        ease: "power3.out",
      })

      gsap.to(".qr-orbit-a", {
        rotation: 360,
        duration: 58,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })

      gsap.to(".qr-orbit-b", {
        rotation: -360,
        duration: 86,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })
    }, pageRef)

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (
      status !== "ready" ||
      !qrRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    gsap.fromTo(
      qrRef.current,
      { scale: 0.97, opacity: 0.45 },
      {
        scale: 1,
        opacity: 1,
        duration: 0.38,
        ease: "power2.out",
        overwrite: true,
      },
    )
  }, [dataUrl, status])

  const downloadPNG = () => {
    if (!dataUrl) return

    const anchor = document.createElement("a")
    anchor.href = dataUrl
    anchor.download = `bitleap-qr-${size}.png`
    anchor.click()
  }

  const downloadSVG = async () => {
    if (!content) return

    try {
      const svg = await QRCode.toString(content, {
        type: "svg",
        width: size,
        margin,
        errorCorrectionLevel: errorLevel,
        color: {
          dark: normalizedDark,
          light: normalizedLight,
        },
      })

      downloadBlob(
        new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
        "bitleap-qr.svg",
      )
    } catch {
      setError("SVG 导出失败，请稍后再试。")
    }
  }

  const copyContent = async () => {
    if (!content) return

    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {}
  }

  const reset = () => {
    setType("url")
    setText("https://bitleap.app")
    setWifiPassword("")
    setWifiSecurity("WPA")
    setWifiHidden(false)
    setSize(512)
    setMargin(2)
    setErrorLevel("M")
    setDark("#171914")
    setLight("#F3F0E8")
    setError("")
  }

  const applyColorPreset = (preset: (typeof COLOR_PRESETS)[number]) => {
    setDark(preset.dark)
    setLight(preset.light)
  }

  return (
    <div
      ref={pageRef}
      className="min-h-screen overflow-hidden bg-[#efede6] text-[#22231f] selection:bg-[#22231f] selection:text-white"
    >
      <style>{`
        .qr-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
        .qr-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,.13); }
        .qr-range { appearance: none; height: 2px; border-radius: 999px; background: rgba(34,35,31,.14); }
        .qr-range::-webkit-slider-thumb { appearance: none; width: 14px; height: 14px; border-radius: 999px; background: #22231f; cursor: pointer; }
        .qr-range::-moz-range-thumb { width: 14px; height: 14px; border: 0; border-radius: 999px; background: #22231f; cursor: pointer; }
        .qr-checker {
          background-image:
            linear-gradient(45deg, rgba(0,0,0,.025) 25%, transparent 25%),
            linear-gradient(-45deg, rgba(0,0,0,.025) 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, rgba(0,0,0,.025) 75%),
            linear-gradient(-45deg, transparent 75%, rgba(0,0,0,.025) 75%);
          background-size: 22px 22px;
          background-position: 0 0, 0 11px, 11px -11px, -11px 0px;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(178,151,91,.11),transparent_27%),radial-gradient(circle_at_8%_88%,rgba(73,107,91,.09),transparent_31%)]" />
        <div className="qr-orbit-a absolute right-[-20vw] top-[-23vw] h-[57vw] w-[57vw] rounded-full border border-black/[.045]">
          <span className="absolute left-[15%] top-[43%] h-2 w-2 rounded-full bg-[#b28d48]/42" />
        </div>
        <div className="qr-orbit-b absolute bottom-[-25vw] left-[-19vw] h-[52vw] w-[52vw] rounded-full border border-black/[.035]">
          <span className="absolute right-[14%] top-[31%] h-1.5 w-1.5 rounded-full bg-[#52685d]/38" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1500px] px-5 pb-10 pt-6 sm:px-8">
        <div className="qr-intro flex items-center justify-between gap-4">
          <Breadcrumb />
          <div className="hidden text-[9px] tracking-[.14em] text-black/25 sm:block">
            QR STUDIO · LOCAL GENERATION
          </div>
        </div>

        <header className="qr-intro mt-11 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/27">
              QR CODE STUDIO
            </div>
            <h1 className="mt-4 max-w-[850px] text-[clamp(48px,6.8vw,96px)] font-semibold leading-[.9] tracking-[-.073em]">
              内容进去，
              <br />
              二维码出来。
            </h1>
          </div>

          <p className="max-w-[520px] text-[11px] leading-6 text-black/39">
            URL、文本和 WiFi 均可实时生成。颜色、容错等级、边距与导出尺寸都会即时反映到预览中，没有多余步骤。
          </p>
        </header>

        <section className="qr-intro grid gap-10 py-8 lg:grid-cols-[.83fr_1.17fr] lg:items-start">
          <div>
            <div className="mb-5 flex flex-wrap gap-1">
              {[
                ["url", "URL"],
                ["text", "文本"],
                ["wifi", "WiFi"],
              ].map(([value, title]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value as ContentType)}
                  className={`rounded-full px-4 py-2.5 text-[10px] font-semibold transition ${
                    type === value
                      ? "bg-[#22231f] text-white"
                      : "text-black/38 hover:bg-white/40 hover:text-black"
                  }`}
                >
                  {title}
                </button>
              ))}
            </div>

            <div>
              <div className="text-[9px] font-semibold tracking-[.14em] text-black/26">
                {label.toUpperCase()}
              </div>

              {type === "text" ? (
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder={placeholder}
                  rows={5}
                  className="qr-scroll mt-3 w-full resize-none border-b border-black/15 bg-transparent pb-4 text-[clamp(22px,3vw,38px)] font-medium leading-[1.2] tracking-[-.04em] outline-none placeholder:text-black/16"
                />
              ) : (
                <input
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder={placeholder}
                  spellCheck={false}
                  className="mt-3 w-full border-b border-black/15 bg-transparent pb-4 font-mono text-[clamp(20px,3vw,34px)] font-medium tracking-[-.045em] outline-none placeholder:text-black/16"
                />
              )}
            </div>

            {type === "wifi" && (
              <div className="mt-7 grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="text-[9px] font-semibold tracking-[.12em] text-black/25">
                    SECURITY
                  </label>
                  <div className="mt-3 flex gap-1">
                    {(["WPA", "WEP", "nopass"] as WifiSecurity[]).map(
                      (value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setWifiSecurity(value)}
                          className={`rounded-full px-3 py-2 text-[9px] font-semibold transition ${
                            wifiSecurity === value
                              ? "bg-[#52685d] text-white"
                              : "border border-black/10 text-black/36"
                          }`}
                        >
                          {value === "nopass" ? "开放网络" : value}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                <label className="flex items-center justify-between border-b border-black/10 pb-3 sm:self-end">
                  <span>
                    <b className="block text-[9px] font-semibold">
                      隐藏网络
                    </b>
                    <span className="mt-1 block text-[8px] text-black/26">
                      SSID 不公开广播
                    </span>
                  </span>

                  <input
                    type="checkbox"
                    checked={wifiHidden}
                    onChange={(event) => setWifiHidden(event.target.checked)}
                    className="h-4 w-4 accent-[#22231f]"
                  />
                </label>

                {wifiSecurity !== "nopass" && (
                  <div className="sm:col-span-2">
                    <label className="text-[9px] font-semibold tracking-[.12em] text-black/25">
                      PASSWORD
                    </label>
                    <input
                      value={wifiPassword}
                      onChange={(event) => setWifiPassword(event.target.value)}
                      type="text"
                      placeholder="WiFi 密码"
                      className="mt-2 w-full border-b border-black/15 bg-transparent pb-3 font-mono text-base outline-none placeholder:text-black/17"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="mt-9 border-t border-black/10 pt-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-[9px] font-semibold tracking-[.14em] text-black/25">
                    OUTPUT
                  </div>
                  <h2 className="mt-1 text-xl font-semibold tracking-[-.035em]">
                    导出设置
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={reset}
                  className="text-[9px] text-black/28 transition hover:text-black"
                >
                  恢复默认
                </button>
              </div>

              <div className="mt-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[9px] font-semibold text-black/32">
                    尺寸
                  </span>
                  <span className="font-mono text-[10px] text-black/45">
                    {size}px
                  </span>
                </div>

                <input
                  type="range"
                  min={128}
                  max={1024}
                  step={32}
                  value={size}
                  onChange={(event) => setSize(Number(event.target.value))}
                  className="qr-range block w-full"
                />

                <div className="mt-3 flex gap-2">
                  {SIZE_PRESETS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSize(value)}
                      className={`rounded-full px-3 py-2 text-[9px] font-semibold ${
                        size === value
                          ? "bg-[#22231f] text-white"
                          : "border border-black/10 text-black/34"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-7 grid gap-6 sm:grid-cols-2">
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[9px] font-semibold text-black/32">
                      容错等级
                    </span>
                    <span className="font-mono text-[10px] text-black/42">
                      {errorLevel}
                    </span>
                  </div>

                  <div className="flex gap-1">
                    {(["L", "M", "Q", "H"] as ErrorLevel[]).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setErrorLevel(level)}
                        className={`flex-1 rounded-full py-2 text-[9px] font-semibold ${
                          errorLevel === level
                            ? "bg-[#22231f] text-white"
                            : "border border-black/10 text-black/34"
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[9px] font-semibold text-black/32">
                      Quiet Zone
                    </span>
                    <span className="font-mono text-[10px] text-black/42">
                      {margin}
                    </span>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={8}
                    step={1}
                    value={margin}
                    onChange={(event) => setMargin(Number(event.target.value))}
                    className="qr-range block w-full"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-black/10 pt-6">
              <div className="text-[9px] font-semibold tracking-[.14em] text-black/25">
                COLOR
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyColorPreset(preset)}
                    className="flex items-center gap-2 rounded-full border border-black/10 px-3 py-2 text-[9px] text-black/37"
                  >
                    <span
                      className="h-3 w-3 rounded-full border border-black/8"
                      style={{ background: preset.dark }}
                    />
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                {[
                  ["前景色", dark, setDark],
                  ["背景色", light, setLight],
                ].map(([name, value, setter]) => (
                  <div key={name as string}>
                    <label className="text-[8px] text-black/26">
                      {name as string}
                    </label>

                    <div className="mt-2 flex items-center gap-3 border-b border-black/10 pb-3">
                      <input
                        type="color"
                        value={normalizeHex(value as string, "#000000")}
                        onChange={(event) =>
                          (setter as (value: string) => void)(event.target.value)
                        }
                        className="h-7 w-7 cursor-pointer rounded-full border-0 bg-transparent p-0"
                      />

                      <input
                        value={value as string}
                        onChange={(event) =>
                          (setter as (value: string) => void)(event.target.value)
                        }
                        onBlur={() =>
                          (setter as (value: string) => void)(
                            normalizeHex(
                              value as string,
                              name === "前景色" ? "#171914" : "#F3F0E8",
                            ),
                          )
                        }
                        className="min-w-0 flex-1 bg-transparent font-mono text-[10px] uppercase outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between text-[9px]">
                <span className="text-black/28">颜色对比度</span>
                <span
                  className={
                    contrast >= 4.5
                      ? "font-semibold text-[#476554]"
                      : "font-semibold text-[#9b5a43]"
                  }
                >
                  {contrast.toFixed(2)} : 1
                  {contrast < 4.5 ? " · 建议提高" : " · 良好"}
                </span>
              </div>
            </div>
          </div>

          <div className="lg:sticky lg:top-24">
            <div
              ref={previewRef}
              className="qr-checker relative flex min-h-[560px] items-center justify-center overflow-hidden rounded-[34px] border border-black/[.075] bg-white/25 p-6 sm:p-10"
            >
              <div className="absolute left-5 top-5 text-[8px] tracking-[.14em] text-black/22">
                LIVE PREVIEW
              </div>

              <div className="absolute right-5 top-5 flex items-center gap-2 text-[8px] text-black/25">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    status === "ready"
                      ? "bg-[#587362]"
                      : status === "error"
                        ? "bg-[#a45b47]"
                        : "bg-[#b28d48]"
                  }`}
                />
                {status === "generating"
                  ? "GENERATING"
                  : status === "ready"
                    ? "READY"
                    : status === "error"
                      ? "ERROR"
                      : "WAITING"}
              </div>

              {dataUrl ? (
                <div
                  className="relative rounded-[26px] p-5 shadow-[0_30px_80px_rgba(54,49,39,.14)]"
                  style={{ background: normalizedLight }}
                >
                  <img
                    ref={qrRef}
                    src={dataUrl}
                    alt="生成的二维码"
                    className="h-auto w-[min(68vw,420px)] max-w-full"
                  />
                </div>
              ) : (
                <div className="text-center">
                  <div className="mx-auto grid h-36 w-36 grid-cols-5 gap-2 opacity-15">
                    {Array.from({ length: 25 }).map((_, index) => (
                      <span
                        key={index}
                        className={`rounded-[2px] ${
                          [0, 1, 5, 6, 3, 4, 8, 9, 15, 16, 20, 21, 13, 18, 24].includes(
                            index,
                          )
                            ? "bg-black"
                            : "border border-black/30"
                        }`}
                      />
                    ))}
                  </div>

                  <p className="mt-5 text-[10px] text-black/30">
                    输入内容后自动生成
                  </p>
                </div>
              )}

              {status === "generating" && (
                <div className="absolute inset-0 grid place-items-center bg-[#efede6]/28 backdrop-blur-[1px]">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-black/10 border-t-black/50" />
                </div>
              )}
            </div>

            {error && (
              <div className="mt-3 text-[9px] leading-5 text-[#95503d]">
                {error}
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={downloadPNG}
                disabled={!dataUrl}
                className="rounded-full bg-[#22231f] px-4 py-3 text-[10px] font-semibold text-white transition hover:scale-[1.01] active:scale-[.98] disabled:opacity-30"
              >
                PNG
              </button>

              <button
                type="button"
                onClick={downloadSVG}
                disabled={!content}
                className="rounded-full border border-black/10 px-4 py-3 text-[10px] font-semibold transition hover:bg-white/40 disabled:opacity-30"
              >
                SVG
              </button>

              <button
                type="button"
                onClick={copyContent}
                disabled={!content}
                className="col-span-2 rounded-full border border-black/10 px-4 py-3 text-[10px] font-semibold transition hover:bg-white/40 disabled:opacity-30 sm:col-span-1"
              >
                {copied ? "✓ 已复制" : "复制内容"}
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-black/10 pt-4 text-[8px] text-black/26">
              <span>{size}px · ECC {errorLevel} · Margin {margin}</span>
              <span>LOCAL ONLY</span>
            </div>
          </div>
        </section>

        <section className="qr-intro mt-5 grid gap-8 border-t border-black/10 pt-7 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-semibold tracking-[.12em] text-black/25">
              URL / TEXT
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              链接与纯文本直接编码，不经过 BitLeap 服务器。
            </p>
          </div>

          <div>
            <div className="text-[8px] font-semibold tracking-[.12em] text-black/25">
              WIFI
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              支持 WPA、WEP、开放网络和隐藏 SSID；特殊字符会按 WiFi QR 格式自动转义。
            </p>
          </div>

          <div>
            <div className="text-[8px] font-semibold tracking-[.12em] text-black/25">
              EXPORT
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              PNG 适合直接分享，SVG 可无损缩放，更适合印刷和设计工作流。
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
