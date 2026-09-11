"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type Unit = "px" | "%"
type CornerKey = "tl" | "tr" | "br" | "bl"
type CornerValues = Record<CornerKey, number>

const CORNERS: Array<{
  key: CornerKey
  label: string
  short: string
}> = [
  { key: "tl", label: "左上", short: "TL" },
  { key: "tr", label: "右上", short: "TR" },
  { key: "br", label: "右下", short: "BR" },
  { key: "bl", label: "左下", short: "BL" },
]

const PRESETS: Array<{
  name: string
  note: string
  horizontal: CornerValues
  vertical?: CornerValues
  advanced?: boolean
}> = [
  {
    name: "Soft",
    note: "柔和",
    horizontal: { tl: 28, tr: 28, br: 28, bl: 28 },
  },
  {
    name: "Editorial",
    note: "杂志",
    horizontal: { tl: 54, tr: 12, br: 54, bl: 12 },
  },
  {
    name: "Ticket",
    note: "票券",
    horizontal: { tl: 8, tr: 36, br: 8, bl: 36 },
  },
  {
    name: "Blob",
    note: "有机",
    horizontal: { tl: 58, tr: 34, br: 66, bl: 42 },
    vertical: { tl: 36, tr: 62, br: 38, bl: 68 },
    advanced: true,
  },
]

function cloneCorners(value: CornerValues): CornerValues {
  return { tl: value.tl, tr: value.tr, br: value.br, bl: value.bl }
}

function formatRadius(
  horizontal: CornerValues,
  vertical: CornerValues,
  unit: Unit,
  advanced: boolean,
) {
  const h = `${horizontal.tl}${unit} ${horizontal.tr}${unit} ${horizontal.br}${unit} ${horizontal.bl}${unit}`

  if (!advanced) return h

  const v = `${vertical.tl}${unit} ${vertical.tr}${unit} ${vertical.br}${unit} ${vertical.bl}${unit}`
  return `${h} / ${v}`
}

function compactRadius(
  horizontal: CornerValues,
  vertical: CornerValues,
  unit: Unit,
  advanced: boolean,
) {
  const h = [horizontal.tl, horizontal.tr, horizontal.br, horizontal.bl]
  const v = [vertical.tl, vertical.tr, vertical.br, vertical.bl]

  const compact = (values: number[]) => {
    const [a, b, c, d] = values
    if (a === b && a === c && a === d) return `${a}${unit}`
    if (a === c && b === d) return `${a}${unit} ${b}${unit}`
    if (b === d) return `${a}${unit} ${b}${unit} ${c}${unit}`
    return values.map((value) => `${value}${unit}`).join(" ")
  }

  const horizontalValue = compact(h)

  if (!advanced) return horizontalValue

  const verticalValue = compact(v)
  return horizontalValue === verticalValue
    ? horizontalValue
    : `${horizontalValue} / ${verticalValue}`
}

function randomBetween(min: number, max: number) {
  return Math.round(min + Math.random() * (max - min))
}

function RangeControl({
  corner,
  horizontal,
  vertical,
  advanced,
  max,
  unit,
  onHorizontal,
  onVertical,
}: {
  corner: (typeof CORNERS)[number]
  horizontal: number
  vertical: number
  advanced: boolean
  max: number
  unit: Unit
  onHorizontal: (value: number) => void
  onVertical: (value: number) => void
}) {
  return (
    <div className="border-b border-black/[.075] py-4">
      <div className="mb-3 flex items-center justify-between gap-5">
        <div className="flex items-center gap-3">
          <span className="grid h-7 w-7 place-items-center rounded-full border border-black/[.08] font-mono text-[8px] text-black/36">
            {corner.short}
          </span>
          <div>
            <div className="text-[10px] font-semibold">{corner.label}</div>
            <div className="mt-0.5 text-[8px] text-black/28">
              {advanced ? "horizontal / vertical" : "radius"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold text-black/52">
          <span>{horizontal}</span>
          {advanced && (
            <>
              <span className="text-black/20">/</span>
              <span>{vertical}</span>
            </>
          )}
          <span className="text-[8px] font-normal text-black/25">{unit}</span>
        </div>
      </div>

      <div className={advanced ? "grid gap-3" : ""}>
        <input
          type="range"
          min={0}
          max={max}
          value={horizontal}
          onChange={(event) => onHorizontal(Number(event.target.value))}
          className="radius-range block w-full"
          aria-label={`${corner.label}水平圆角`}
        />

        {advanced && (
          <input
            type="range"
            min={0}
            max={max}
            value={vertical}
            onChange={(event) => onVertical(Number(event.target.value))}
            className="radius-range block w-full"
            aria-label={`${corner.label}垂直圆角`}
          />
        )}
      </div>
    </div>
  )
}

export default function BorderRadiusGen() {
  const [horizontal, setHorizontal] = useState<CornerValues>({
    tl: 28,
    tr: 28,
    br: 28,
    bl: 28,
  })
  const [vertical, setVertical] = useState<CornerValues>({
    tl: 28,
    tr: 28,
    br: 28,
    bl: 28,
  })
  const [unit, setUnit] = useState<Unit>("px")
  const [advanced, setAdvanced] = useState(false)
  const [linked, setLinked] = useState(false)
  const [copied, setCopied] = useState<"css" | "value" | "tailwind" | null>(
    null,
  )

  const pageRef = useRef<HTMLDivElement>(null)
  const shapeRef = useRef<HTMLDivElement>(null)

  const max = unit === "px" ? 180 : 50

  const radiusValue = useMemo(
    () => compactRadius(horizontal, vertical, unit, advanced),
    [horizontal, vertical, unit, advanced],
  )

  const fullRadiusValue = useMemo(
    () => formatRadius(horizontal, vertical, unit, advanced),
    [horizontal, vertical, unit, advanced],
  )

  const css = `border-radius: ${radiusValue};`
  const tailwind = `rounded-[${radiusValue
    .replace(/\s+/g, "_")
    .replace(/\//g, "/")}]`

  useEffect(() => {
    if (
      !pageRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    const ctx = gsap.context(() => {
      gsap.from(".radius-intro", {
        y: 22,
        opacity: 0,
        duration: 0.78,
        stagger: 0.055,
        ease: "power3.out",
      })

      gsap.to(".radius-orbit-a", {
        rotation: 360,
        duration: 64,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })

      gsap.to(".radius-orbit-b", {
        rotation: -360,
        duration: 96,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })
    }, pageRef)

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (
      !shapeRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    gsap.fromTo(
      shapeRef.current,
      {
        scale: 0.985,
        filter: "saturate(.88)",
      },
      {
        scale: 1,
        filter: "saturate(1)",
        duration: 0.28,
        ease: "power2.out",
        overwrite: true,
      },
    )
  }, [radiusValue])

  const setCorner = (
    target: "horizontal" | "vertical",
    key: CornerKey,
    value: number,
  ) => {
    const setter = target === "horizontal" ? setHorizontal : setVertical

    setter((current) => {
      if (linked) {
        return { tl: value, tr: value, br: value, bl: value }
      }

      return { ...current, [key]: value }
    })

    if (linked && advanced) {
      const otherSetter =
        target === "horizontal" ? setVertical : setHorizontal

      otherSetter({ tl: value, tr: value, br: value, bl: value })
    }
  }

  const toggleLinked = () => {
    setLinked((current) => {
      const next = !current

      if (next) {
        const value = horizontal.tl
        setHorizontal({ tl: value, tr: value, br: value, bl: value })

        if (advanced) {
          setVertical({ tl: value, tr: value, br: value, bl: value })
        }
      }

      return next
    })
  }

  const changeUnit = (nextUnit: Unit) => {
    if (nextUnit === unit) return

    if (nextUnit === "%") {
      const convert = (value: number) =>
        Math.min(50, Math.round((value / 180) * 50))

      setHorizontal((current) => ({
        tl: convert(current.tl),
        tr: convert(current.tr),
        br: convert(current.br),
        bl: convert(current.bl),
      }))

      setVertical((current) => ({
        tl: convert(current.tl),
        tr: convert(current.tr),
        br: convert(current.br),
        bl: convert(current.bl),
      }))
    } else {
      const convert = (value: number) =>
        Math.min(180, Math.round((value / 50) * 180))

      setHorizontal((current) => ({
        tl: convert(current.tl),
        tr: convert(current.tr),
        br: convert(current.br),
        bl: convert(current.bl),
      }))

      setVertical((current) => ({
        tl: convert(current.tl),
        tr: convert(current.tr),
        br: convert(current.br),
        bl: convert(current.bl),
      }))
    }

    setUnit(nextUnit)
  }

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    const nextHorizontal = cloneCorners(preset.horizontal)
    const nextVertical = cloneCorners(
      preset.vertical ?? preset.horizontal,
    )

    setHorizontal(nextHorizontal)
    setVertical(nextVertical)
    setAdvanced(Boolean(preset.advanced))
    setLinked(false)
    setUnit("px")
  }

  const randomize = () => {
    if (unit === "%") {
      setHorizontal({
        tl: randomBetween(8, 50),
        tr: randomBetween(8, 50),
        br: randomBetween(8, 50),
        bl: randomBetween(8, 50),
      })

      if (advanced) {
        setVertical({
          tl: randomBetween(8, 50),
          tr: randomBetween(8, 50),
          br: randomBetween(8, 50),
          bl: randomBetween(8, 50),
        })
      }

      return
    }

    setHorizontal({
      tl: randomBetween(8, 110),
      tr: randomBetween(8, 110),
      br: randomBetween(8, 110),
      bl: randomBetween(8, 110),
    })

    if (advanced) {
      setVertical({
        tl: randomBetween(8, 110),
        tr: randomBetween(8, 110),
        br: randomBetween(8, 110),
        bl: randomBetween(8, 110),
      })
    }
  }

  const reset = () => {
    setHorizontal({ tl: 28, tr: 28, br: 28, bl: 28 })
    setVertical({ tl: 28, tr: 28, br: 28, bl: 28 })
    setUnit("px")
    setAdvanced(false)
    setLinked(false)
  }

  const copy = async (
    value: string,
    kind: "css" | "value" | "tailwind",
  ) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(kind)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {}
  }

  const previewRadius = fullRadiusValue

  return (
    <div
      ref={pageRef}
      className="min-h-screen overflow-hidden bg-[#efede6] text-[#22231f] selection:bg-[#22231f] selection:text-white"
    >
      <style>{`
        .radius-range {
          appearance: none;
          height: 2px;
          border-radius: 999px;
          background: rgba(34,35,31,.14);
        }

        .radius-range::-webkit-slider-thumb {
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 999px;
          background: #22231f;
          cursor: pointer;
          box-shadow: 0 0 0 4px rgba(239,237,230,.9);
        }

        .radius-range::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border: 0;
          border-radius: 999px;
          background: #22231f;
          cursor: pointer;
        }

        .radius-grid {
          background-image:
            linear-gradient(rgba(34,35,31,.034) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,35,31,.034) 1px, transparent 1px);
          background-size: 28px 28px;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_9%,rgba(178,151,91,.10),transparent_27%),radial-gradient(circle_at_9%_88%,rgba(73,107,91,.08),transparent_31%)]" />

        <div className="radius-orbit-a absolute right-[-20vw] top-[-24vw] h-[58vw] w-[58vw] rounded-full border border-black/[.04]">
          <span className="absolute left-[15%] top-[43%] h-2 w-2 rounded-full bg-[#b28d48]/38" />
        </div>

        <div className="radius-orbit-b absolute bottom-[-26vw] left-[-19vw] h-[53vw] w-[53vw] rounded-full border border-black/[.032]">
          <span className="absolute right-[14%] top-[31%] h-1.5 w-1.5 rounded-full bg-[#52685d]/35" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1500px] px-5 pb-10 pt-6 sm:px-8">
        <div className="radius-intro">
          <Breadcrumb />
        </div>

        <header className="radius-intro mt-8 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/27">
              BORDER RADIUS STUDIO
            </div>

            <h1 className="mt-4 max-w-[860px] text-[clamp(48px,6.5vw,92px)] font-semibold leading-[1.02] tracking-[-.055em]">
              把四个角，
              <br />
              调成你想要的形状。
            </h1>
          </div>

          <p className="max-w-[520px] text-[11px] leading-6 text-black/39">
            四角独立调节，也可以锁定同步。需要更自由的形状时，开启椭圆模式，分别控制水平与垂直半径。
          </p>
        </header>

        <section className="radius-intro mt-8 grid gap-10 lg:grid-cols-[1.18fr_.82fr] lg:items-start">
          <div className="lg:sticky lg:top-24">
            <div className="radius-grid relative flex min-h-[620px] items-center justify-center overflow-hidden rounded-[34px] border border-black/[.075] bg-white/24 p-7 sm:p-12">
              <div className="absolute left-5 top-5 text-[8px] font-semibold tracking-[.14em] text-black/22">
                LIVE SHAPE
              </div>

              <div className="absolute right-5 top-5 font-mono text-[8px] text-black/24">
                {advanced ? "ELLIPTICAL" : "STANDARD"}
              </div>

              <div className="relative w-full max-w-[520px] py-14">
                <div
                  className="pointer-events-none absolute inset-[8%] bg-[linear-gradient(135deg,#8f7ee8,#e596b7_52%,#d5ad67)] opacity-45 blur-[45px]"
                  style={{ borderRadius: previewRadius }}
                />

                <div
                  ref={shapeRef}
                  className="relative z-10 aspect-[1.14/1] w-full border border-black/[.055] bg-[#fbfaf6] shadow-[0_32px_80px_rgba(62,52,38,.12)]"
                  style={{ borderRadius: previewRadius }}
                >
                  <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: previewRadius }}>
                    <div className="absolute -right-[12%] -top-[18%] h-[50%] w-[50%] rounded-full bg-[#9a87ee]/12 blur-[20px]" />
                    <div className="absolute -bottom-[18%] -left-[10%] h-[48%] w-[48%] rounded-full bg-[#dda67a]/14 blur-[22px]" />
                  </div>

                  <div className="relative z-10 flex h-full flex-col justify-between p-7 sm:p-9">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-semibold tracking-[.14em] text-black/24">
                        BITLEAP / SHAPE
                      </span>

                      <span className="rounded-full border border-black/[.07] px-2.5 py-1 font-mono text-[7px] text-black/29">
                        {unit}
                      </span>
                    </div>

                    <div>
                      <div className="text-[clamp(34px,5vw,58px)] font-semibold leading-[1.02] tracking-[-.05em]">
                        Shape the
                        <br />
                        quiet details.
                      </div>

                      <p className="mt-5 max-w-[330px] text-[9px] leading-5 text-black/33">
                        边框圆角很小，但它会直接改变一个界面的气质。
                      </p>
                    </div>
                  </div>
                </div>

                {CORNERS.map((corner) => {
                  const classes: Record<CornerKey, string> = {
                    tl: "-left-2 top-10",
                    tr: "-right-2 top-10 text-right",
                    br: "-right-2 bottom-10 text-right",
                    bl: "-left-2 bottom-10",
                  }

                  return (
                    <div
                      key={corner.key}
                      className={`absolute hidden font-mono text-[8px] text-black/24 sm:block ${classes[corner.key]}`}
                    >
                      {corner.short} · {horizontal[corner.key]}
                      {advanced ? `/${vertical[corner.key]}` : ""}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="group flex items-center gap-3 rounded-full border border-black/[.085] bg-white/22 px-3 py-2.5 transition hover:bg-white/55"
                >
                  <span
                    className="h-5 w-5 border border-black/[.08] bg-[#22231f]"
                    style={{
                      borderRadius: formatRadius(
                        preset.horizontal,
                        preset.vertical ?? preset.horizontal,
                        "px",
                        Boolean(preset.advanced),
                      ),
                    }}
                  />

                  <span>
                    <b className="block text-left text-[8px] font-semibold">
                      {preset.name}
                    </b>
                    <span className="block text-left text-[7px] text-black/25">
                      {preset.note}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 pb-5">
              <div className="flex gap-1">
                {(["px", "%"] as Unit[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => changeUnit(value)}
                    className={`rounded-full px-4 py-2.5 text-[9px] font-semibold transition ${
                      unit === value
                        ? "bg-[#22231f] text-white"
                        : "text-black/35 hover:bg-white/40 hover:text-black"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={toggleLinked}
                  className={`rounded-full border px-4 py-2.5 text-[9px] font-semibold transition ${
                    linked
                      ? "border-[#52685d]/20 bg-[#52685d] text-white"
                      : "border-black/[.085] text-black/38 hover:bg-white/40"
                  }`}
                >
                  {linked ? "已锁定四角" : "锁定四角"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAdvanced((current) => !current)
                    setLinked(false)
                  }}
                  className={`rounded-full border px-4 py-2.5 text-[9px] font-semibold transition ${
                    advanced
                      ? "border-[#a37358]/20 bg-[#a37358] text-white"
                      : "border-black/[.085] text-black/38 hover:bg-white/40"
                  }`}
                >
                  {advanced ? "椭圆模式 ON" : "椭圆模式"}
                </button>
              </div>
            </div>

            <div className="mt-2">
              {CORNERS.map((corner) => (
                <RangeControl
                  key={corner.key}
                  corner={corner}
                  horizontal={horizontal[corner.key]}
                  vertical={vertical[corner.key]}
                  advanced={advanced}
                  max={max}
                  unit={unit}
                  onHorizontal={(value) =>
                    setCorner("horizontal", corner.key, value)
                  }
                  onVertical={(value) =>
                    setCorner("vertical", corner.key, value)
                  }
                />
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={randomize}
                className="rounded-full border border-black/[.085] px-4 py-2.5 text-[9px] font-semibold text-black/39 transition hover:bg-white/45 hover:text-black"
              >
                随机形状
              </button>

              <button
                type="button"
                onClick={reset}
                className="rounded-full border border-black/[.085] px-4 py-2.5 text-[9px] font-semibold text-black/39 transition hover:bg-white/45 hover:text-black"
              >
                恢复默认
              </button>
            </div>

            <div className="mt-8 overflow-hidden rounded-[25px] border border-black/[.08] bg-[#171916]">
              <div className="flex items-center justify-between border-b border-white/[.07] px-5 py-3">
                <span className="text-[8px] tracking-[.13em] text-white/28">
                  CSS OUTPUT
                </span>

                <span className="text-[8px] text-white/18">
                  {advanced ? "ELLIPTICAL RADIUS" : "STANDARD RADIUS"}
                </span>
              </div>

              <div className="p-5 sm:p-6">
                <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-6 text-[#cad5ca]">
                  {css}
                </pre>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => copy(css, "css")}
                    className="rounded-full bg-[#f1efe8] px-4 py-2.5 text-[9px] font-semibold text-[#171916]"
                  >
                    {copied === "css" ? "✓ 已复制 CSS" : "复制 CSS"}
                  </button>

                  <button
                    type="button"
                    onClick={() => copy(radiusValue, "value")}
                    className="rounded-full border border-white/[.09] px-4 py-2.5 text-[9px] font-semibold text-white/42 transition hover:bg-white/[.06]"
                  >
                    {copied === "value" ? "✓ 已复制值" : "只复制值"}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-3 overflow-hidden rounded-[20px] border border-black/[.075] bg-white/24">
              <div className="flex items-center justify-between border-b border-black/[.06] px-4 py-2.5">
                <span className="text-[8px] tracking-[.11em] text-black/23">
                  TAILWIND
                </span>

                <button
                  type="button"
                  onClick={() => copy(tailwind, "tailwind")}
                  className="text-[8px] font-semibold text-black/28 transition hover:text-black"
                >
                  {copied === "tailwind" ? "✓ COPIED" : "COPY"}
                </button>
              </div>

              <div className="overflow-x-auto p-4 font-mono text-[10px] text-black/48">
                {tailwind}
              </div>
            </div>
          </div>
        </section>

        <section className="radius-intro mt-14 grid gap-8 border-t border-black/10 pt-7 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              4 CORNERS
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              标准模式按左上、右上、右下、左下分别控制，也可以一键锁定四角同步调整。
            </p>
          </div>

          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              ELLIPTICAL
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              开启椭圆模式后可独立控制水平 / 垂直半径，生成带 `/` 的完整 CSS 语法。
            </p>
          </div>

          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              EXPORT
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              可以复制完整 CSS、单独 radius 值，也提供 Tailwind arbitrary value 形式。
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
