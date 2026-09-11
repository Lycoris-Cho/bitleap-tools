"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type GlowPreset = {
    name: string
    color1: string
    color2: string
    surface: string
    angle: number
    blur: number
    offsetX: number
    offsetY: number
    scale: number
    opacity: number
    radius: number
}

const PRESETS: GlowPreset[] = [
    {
        name: "Sakura",
        color1: "#F3A9C8",
        color2: "#8E91FF",
        surface: "#FFFDFC",
        angle: -42,
        blur: 34,
        offsetX: 0,
        offsetY: 22,
        scale: 94,
        opacity: 72,
        radius: 28,
    },
    {
        name: "Aurora",
        color1: "#79D6B0",
        color2: "#68A7E7",
        surface: "#FCFEFC",
        angle: 28,
        blur: 38,
        offsetX: -5,
        offsetY: 18,
        scale: 96,
        opacity: 68,
        radius: 30,
    },
    {
        name: "Ember",
        color1: "#F29A62",
        color2: "#CB586A",
        surface: "#FFFDF9",
        angle: -18,
        blur: 30,
        offsetX: 6,
        offsetY: 24,
        scale: 93,
        opacity: 66,
        radius: 24,
    },
    {
        name: "Night",
        color1: "#6E7AF0",
        color2: "#9A5ED6",
        surface: "#171A1D",
        angle: -58,
        blur: 42,
        offsetX: 0,
        offsetY: 20,
        scale: 95,
        opacity: 76,
        radius: 28,
    },
]

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
    const convert = (value: number) => {
        const channel = value / 255
        return channel <= 0.03928
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * convert(r) + 0.7152 * convert(g) + 0.0722 * convert(b)
}

function readableTextColor(surface: string) {
    return luminance(surface) > 0.52 ? "#22231F" : "#F3F0E8"
}

function RangeControl({
    label,
    value,
    min,
    max,
    step = 1,
    suffix,
    onChange,
}: {
    label: string
    value: number
    min: number
    max: number
    step?: number
    suffix: string
    onChange: (value: number) => void
}) {
    return (
        <div className="border-b border-black/[.075] py-4">
            <div className="mb-3 flex items-center justify-between gap-4">
                <span className="text-[9px] font-semibold tracking-[.09em] text-black/36">{label}</span>
                <span className="glow-num font-mono text-[10px] font-semibold text-black/54">{value}{suffix}</span>
            </div>
            <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="glow-range block w-full" />
        </div>
    )
}

export default function GlowBackgroundPage() {
    const [color1, setColor1] = useState("#F3A9C8")
    const [color2, setColor2] = useState("#8E91FF")
    const [surface, setSurface] = useState("#FFFDFC")
    const [angle, setAngle] = useState(-42)
    const [blur, setBlur] = useState(34)
    const [offsetX, setOffsetX] = useState(0)
    const [offsetY, setOffsetY] = useState(22)
    const [scale, setScale] = useState(94)
    const [opacity, setOpacity] = useState(72)
    const [radius, setRadius] = useState(28)
    const [copied, setCopied] = useState<"css" | "html" | null>(null)

    const pageRef = useRef<HTMLDivElement>(null)
    const previewRef = useRef<HTMLDivElement>(null)
    const glowRef = useRef<HTMLDivElement>(null)

    const safeColor1 = normalizeHex(color1, "#F3A9C8")
    const safeColor2 = normalizeHex(color2, "#8E91FF")
    const safeSurface = normalizeHex(surface, "#FFFDFC")
    const foreground = readableTextColor(safeSurface)
    const muted = luminance(safeSurface) > 0.52 ? "rgba(34,35,31,.46)" : "rgba(243,240,232,.52)"
    const gradient = `linear-gradient(${angle}deg, ${safeColor1}, ${safeColor2})`

    const cssCode = useMemo(
        () => `.glow-wrap {
  position: relative;
  display: inline-block;
  isolation: isolate;
}

.glow-wrap::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  background: linear-gradient(${angle}deg, ${safeColor1}, ${safeColor2});
  transform: translate3d(${offsetX}px, ${offsetY}px, 0) scale(${scale / 100});
  filter: blur(${blur}px);
  opacity: ${opacity / 100};
  border-radius: ${radius}px;
  pointer-events: none;
}

.glow-card {
  position: relative;
  z-index: 1;
  border-radius: ${radius}px;
  background: ${safeSurface};
}`,
        [
            angle,
            safeColor1,
            safeColor2,
            offsetX,
            offsetY,
            scale,
            blur,
            opacity,
            radius,
            safeSurface,
        ],
    )

    const htmlCode = `<div class="glow-wrap">
  <div class="glow-card">
    Your content
  </div>
</div>`

    useEffect(() => {
        if (!pageRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

        const ctx = gsap.context(() => {
            gsap.from(".glow-intro", {
                y: 22,
                opacity: 0,
                duration: 0.82,
                stagger: 0.065,
                ease: "power3.out",
            })

            gsap.to(".glow-orbit-a", {
                rotation: 360,
                duration: 62,
                repeat: -1,
                ease: "none",
                transformOrigin: "50% 50%",
            })

            gsap.to(".glow-orbit-b", {
                rotation: -360,
                duration: 94,
                repeat: -1,
                ease: "none",
                transformOrigin: "50% 50%",
            })
        }, pageRef)

        return () => ctx.revert()
    }, [])

    useEffect(() => {
        if (!glowRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

        gsap.fromTo(
            glowRef.current,
            { opacity: Math.max(0, opacity / 100 - 0.12), scale: scale / 100 - 0.025 },
            {
                opacity: opacity / 100,
                scale: scale / 100,
                duration: 0.34,
                ease: "power2.out",
                overwrite: true,
            },
        )
    }, [safeColor1, safeColor2, angle, blur, offsetX, offsetY, scale, opacity])

    const applyPreset = (preset: GlowPreset) => {
        setColor1(preset.color1)
        setColor2(preset.color2)
        setSurface(preset.surface)
        setAngle(preset.angle)
        setBlur(preset.blur)
        setOffsetX(preset.offsetX)
        setOffsetY(preset.offsetY)
        setScale(preset.scale)
        setOpacity(preset.opacity)
        setRadius(preset.radius)

        if (
            previewRef.current &&
            !window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
            gsap.fromTo(
                previewRef.current,
                { y: 5 },
                { y: 0, duration: 0.42, ease: "back.out(1.7)", overwrite: true },
            )
        }
    }

    const swapColors = () => {
        setColor1(safeColor2)
        setColor2(safeColor1)
    }

    const randomize = () => {
        const hue = Math.floor(Math.random() * 360)
        const hue2 = (hue + 55 + Math.floor(Math.random() * 95)) % 360

        const toHex = (h: number, s: number, l: number) => {
            s /= 100
            l /= 100
            const k = (n: number) => (n + h / 30) % 12
            const a = s * Math.min(l, 1 - l)
            const f = (n: number) =>
                l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
            return `#${[f(0), f(8), f(4)]
                .map((value) => Math.round(255 * value).toString(16).padStart(2, "0"))
                .join("")}`.toUpperCase()
        }

        setColor1(toHex(hue, 68, 67))
        setColor2(toHex(hue2, 70, 62))
        setAngle(Math.floor(Math.random() * 241) - 120)
    }

    const reset = () => applyPreset(PRESETS[0])

    const copy = async (value: string, kind: "css" | "html") => {
        try {
            await navigator.clipboard.writeText(value)
            setCopied(kind)
            window.setTimeout(() => setCopied(null), 1200)
        } catch { }
    }

    return (
        <div ref={pageRef} className="min-h-screen overflow-hidden bg-[#efede6] text-[#22231f] selection:bg-[#22231f] selection:text-white">
            <style>{`
        .glow-num { font-variant-numeric: tabular-nums lining-nums; }
        .glow-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
        .glow-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,.13); }
        .glow-range { appearance: none; height: 2px; border-radius: 999px; background: rgba(34,35,31,.14); }
        .glow-range::-webkit-slider-thumb { appearance: none; width: 14px; height: 14px; border-radius: 999px; background: #22231f; cursor: pointer; }
        .glow-range::-moz-range-thumb { width: 14px; height: 14px; border: 0; border-radius: 999px; background: #22231f; cursor: pointer; }
        .glow-grid {
          background-image:
            linear-gradient(rgba(34,35,31,.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,35,31,.035) 1px, transparent 1px);
          background-size: 28px 28px;
        }
      `}</style>

            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(178,151,91,.11),transparent_27%),radial-gradient(circle_at_8%_88%,rgba(73,107,91,.09),transparent_31%)]" />
                <div className="glow-orbit-a absolute right-[-20vw] top-[-23vw] h-[57vw] w-[57vw] rounded-full border border-black/[.045]">
                    <span className="absolute left-[15%] top-[43%] h-2 w-2 rounded-full bg-[#b28d48]/42" />
                </div>
                <div className="glow-orbit-b absolute bottom-[-25vw] left-[-19vw] h-[52vw] w-[52vw] rounded-full border border-black/[.035]">
                    <span className="absolute right-[14%] top-[31%] h-1.5 w-1.5 rounded-full bg-[#52685d]/38" />
                </div>
            </div>

            <div className="relative z-10 mx-auto max-w-[1500px] px-5 pb-10 pt-6 sm:px-8">
                <div className="glow-intro flex items-center justify-between gap-4">
                    <Breadcrumb />
                    <div className="hidden text-[9px] tracking-[.14em] text-black/25 sm:block">CSS GLOW STUDIO · LIVE PREVIEW</div>
                </div>

                <header className="glow-intro mt-11 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.72fr] lg:items-end">
                    <div>
                        <div className="text-[9px] font-semibold tracking-[.2em] text-black/27">GRADIENT GLOW BACKGROUND</div>
                        <h1 className="mt-4 max-w-[880px] text-[clamp(48px,6.8vw,98px)] font-semibold leading-[.9] tracking-[-.073em]">渐变色背景</h1>
                    </div>
                    <p className="max-w-[520px] text-[11px] leading-6 text-black/39">用两种颜色生成柔和渐变光晕。调整角度、模糊、偏移、缩放和圆角，预览与 CSS 会同步更新。</p>
                </header>

                <section className="glow-intro pt-8">
                    <div ref={previewRef} className="glow-grid relative flex min-h-[560px] items-center justify-center overflow-hidden rounded-[34px] border border-black/[.075] bg-white/24 p-7 sm:p-12">
                        <div className="absolute left-5 top-5 text-[8px] tracking-[.14em] text-black/22">LIVE CANVAS</div>
                        <div className="absolute right-5 top-5 text-[8px] text-black/24">{safeColor1} → {safeColor2}</div>
                        <div className="relative mx-auto w-full max-w-[760px]">
                            {/* 光晕层：和盒子同尺寸 */}
                            <div className="pointer-events-none absolute inset-0">
                                <div
                                    ref={glowRef}
                                    className="h-full w-full"
                                    style={{
                                        background: gradient,
                                        filter: `blur(${blur}px)`,
                                        transform: `translate3d(${offsetX}px, ${offsetY}px, 0) scale(${scale / 100})`,
                                        transformOrigin: 'center center',
                                        opacity: opacity / 100,
                                        borderRadius: `${radius}px`,
                                        willChange: 'transform, filter, opacity',
                                    }}
                                />
                            </div>

                            {/* 内容卡片 */}
                            <div
                                className="relative z-10 flex min-h-[270px] items-center justify-center overflow-hidden border border-black/[.055] px-8 py-12 text-center shadow-[0_16px_50px_rgba(48,44,36,.05)] sm:min-h-[330px]"
                                style={{
                                    borderRadius: `${radius}px`,
                                    backgroundColor: safeSurface,
                                    color: foreground,
                                }}
                            >
                                <div>
                                    <div className="text-[8px] font-semibold tracking-[.18em]" style={{ color: muted }}>
                                        BITLEAP / GLOW CARD
                                    </div>
                                    <div className="mt-4 text-[clamp(28px,5vw,54px)] font-semibold leading-[.95] tracking-[-.06em]">
                                        Soft light.
                                        <br />
                                        Clear content.
                                    </div>
                                    <p className="mx-auto mt-5 max-w-[420px] text-[10px] leading-5" style={{ color: muted }}>
                                        光晕留在卡片外侧，内容层保持干净。适合 Hero、产品卡片、下载面板和强调区域。
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="glow-intro mt-6 flex flex-col gap-5 border-y border-black/10 py-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="glow-scroll flex gap-2 overflow-x-auto pb-1">
                        {PRESETS.map((preset) => (
                            <button key={preset.name} type="button" onClick={() => applyPreset(preset)} className="flex shrink-0 items-center gap-3 rounded-full border border-black/10 bg-white/24 px-3 py-2.5 text-[9px] font-semibold transition hover:bg-white/50">
                                <span className="flex -space-x-1">
                                    <span className="h-4 w-4 rounded-full border border-[#efede6]" style={{ backgroundColor: preset.color1 }} />
                                    <span className="h-4 w-4 rounded-full border border-[#efede6]" style={{ backgroundColor: preset.color2 }} />
                                </span>
                                {preset.name}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={swapColors} className="rounded-full border border-black/10 px-4 py-2.5 text-[9px] font-semibold text-black/40 transition hover:bg-white/40 hover:text-black">交换颜色</button>
                        <button type="button" onClick={randomize} className="rounded-full border border-black/10 px-4 py-2.5 text-[9px] font-semibold text-black/40 transition hover:bg-white/40 hover:text-black">随机配色</button>
                        <button type="button" onClick={reset} className="rounded-full border border-black/10 px-4 py-2.5 text-[9px] font-semibold text-black/40 transition hover:bg-white/40 hover:text-black">恢复默认</button>
                    </div>
                </section>

                <section className="glow-intro mt-8 grid gap-10 lg:grid-cols-[.72fr_1.28fr]">
                    <div>
                        <div className="text-[9px] font-semibold tracking-[.14em] text-black/25">COLOR</div>
                        <h2 className="mt-2 text-3xl font-semibold tracking-[-.05em]">光的颜色。</h2>
                        <p className="mt-4 max-w-[360px] text-[10px] leading-5 text-black/34">建议让光晕颜色更饱和，让内容表面保持相对克制，这样层次会更稳定。</p>

                        <div className="mt-6 space-y-5">
                            {[
                                ["颜色 1", color1, setColor1, "#F3A9C8"],
                                ["颜色 2", color2, setColor2, "#8E91FF"],
                                ["内容表面", surface, setSurface, "#FFFDFC"],
                            ].map(([label, value, setter, fallback]) => (
                                <div key={label as string}>
                                    <label className="text-[8px] font-semibold tracking-[.1em] text-black/25">{label as string}</label>
                                    <div className="mt-2 flex items-center gap-3 border-b border-black/10 pb-3">
                                        <input type="color" value={normalizeHex(value as string, fallback as string)} onChange={(event) => (setter as (value: string) => void)(event.target.value)} className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent p-0" />
                                        <input value={value as string} onChange={(event) => (setter as (value: string) => void)(event.target.value)} onBlur={() => (setter as (value: string) => void)(normalizeHex(value as string, fallback as string))} className="min-w-0 flex-1 bg-transparent font-mono text-[11px] uppercase outline-none" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="grid gap-x-8 sm:grid-cols-2">
                            <RangeControl label="角度" value={angle} min={-180} max={180} suffix="°" onChange={setAngle} />
                            <RangeControl label="模糊" value={blur} min={0} max={80} suffix="px" onChange={setBlur} />
                            <RangeControl label="水平偏移" value={offsetX} min={-60} max={60} suffix="px" onChange={setOffsetX} />
                            <RangeControl label="垂直偏移" value={offsetY} min={-20} max={80} suffix="px" onChange={setOffsetY} />
                            <RangeControl label="缩放" value={scale} min={75} max={125} suffix="%" onChange={setScale} />
                            <RangeControl label="透明度" value={opacity} min={0} max={100} suffix="%" onChange={setOpacity} />
                            <RangeControl label="圆角" value={radius} min={0} max={64} suffix="px" onChange={setRadius} />
                        </div>

                        <div className="mt-6 flex items-center justify-between border-t border-black/10 pt-4 text-[9px] text-black/30">
                            <span>当前渐变</span>
                            <span className="max-w-[68%] truncate font-mono">{gradient}</span>
                        </div>
                    </div>
                </section>

                <section className="glow-intro mt-14 grid gap-9 border-t border-black/10 pt-7 lg:grid-cols-[.58fr_1.42fr]">
                    <div>
                        <div className="text-[9px] font-semibold tracking-[.14em] text-black/25">EXPORT</div>
                        <h2 className="mt-2 text-[clamp(30px,4vw,48px)] font-semibold leading-[.98] tracking-[-.055em]">可直接用的<br />CSS 结构。</h2>
                        <p className="mt-5 max-w-[360px] text-[10px] leading-5 text-black/34">这一版不再把光晕塞进卡片背景里，而是用外层负责光、内层负责内容，避免被 `overflow` 或负层级吃掉。</p>

                        <div className="mt-6 flex flex-wrap gap-2">
                            <button type="button" onClick={() => copy(cssCode, "css")} className="rounded-full bg-[#22231f] px-5 py-3 text-[10px] font-semibold text-white transition hover:scale-[1.01] active:scale-[.98]">{copied === "css" ? "✓ 已复制 CSS" : "复制 CSS"}</button>
                            <button type="button" onClick={() => copy(htmlCode, "html")} className="rounded-full border border-black/10 px-5 py-3 text-[10px] font-semibold transition hover:bg-white/40">{copied === "html" ? "✓ 已复制 HTML" : "复制 HTML"}</button>
                        </div>
                    </div>

                    <div>
                        <div className="overflow-hidden rounded-[26px] border border-black/[.08] bg-[#171916]">
                            <div className="flex items-center justify-between border-b border-white/[.07] px-5 py-3">
                                <span className="text-[8px] tracking-[.12em] text-white/28">CSS</span>
                                <span className="text-[8px] text-white/20">LIVE OUTPUT</span>
                            </div>
                            <pre className="glow-scroll max-h-[480px] overflow-auto p-5 font-mono text-[10px] leading-6 text-[#c9d4c9] sm:p-6">{cssCode}</pre>
                        </div>

                        <div className="mt-3 overflow-hidden rounded-[20px] border border-black/[.08] bg-white/26">
                            <div className="border-b border-black/[.06] px-4 py-2.5 text-[8px] tracking-[.12em] text-black/24">HTML</div>
                            <pre className="glow-scroll overflow-x-auto p-4 font-mono text-[10px] leading-5 text-black/48">{htmlCode}</pre>
                        </div>
                    </div>
                </section>

                <section className="glow-intro mt-12 grid gap-7 border-t border-black/10 pt-6 md:grid-cols-3">
                    <div><div className="text-[8px] font-semibold tracking-[.1em] text-black/25">BLUR</div><p className="mt-2 text-[9px] leading-5 text-black/34">模糊越高，边缘越柔，但范围也会向外扩散更多。</p></div>
                    <div><div className="text-[8px] font-semibold tracking-[.1em] text-black/25">OFFSET</div><p className="mt-2 text-[9px] leading-5 text-black/34">轻微向下偏移会更像环境光，而不是规则描边。</p></div>
                    <div><div className="text-[8px] font-semibold tracking-[.1em] text-black/25">LAYERING</div><p className="mt-2 text-[9px] leading-5 text-black/34">外层产生光晕，内层保持不透明表面，CSS 更稳定也更容易复用。</p></div>
                </section>

                <div className="mt-12 border-t border-black/[.08] pt-5">
                    <FooterNote />
                </div>
            </div>
        </div>
    )
}
