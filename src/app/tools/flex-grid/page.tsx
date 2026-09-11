"use client"

import type { CSSProperties } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type Mode = "flex" | "grid"
type Viewport = "sm" | "md" | "lg" | "xl" | "custom"
type GridMode = "auto-fit" | "auto-fill" | "fixed"
type CopyKey = "css" | "tailwind" | "report" | null

type State = {
  mode: Mode
  count: number
  gap: number
  rowGap: number
  colGap: number
  splitGap: boolean
  viewport: Viewport
  customWidth: number
  minHeight: number
  itemWidth: number
  itemHeight: number
  radius: number
  direction: "row" | "row-reverse" | "column" | "column-reverse"
  wrap: "nowrap" | "wrap" | "wrap-reverse"
  justify: "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly"
  align: "stretch" | "flex-start" | "center" | "flex-end" | "baseline"
  alignContent: "stretch" | "flex-start" | "center" | "flex-end" | "space-between" | "space-around"
  gridMode: GridMode
  minColWidth: number
  fixedColumns: number
  justifyItems: "stretch" | "start" | "center" | "end"
  gridAlign: "stretch" | "start" | "center" | "end"
  dense: boolean
}

const VIEWPORTS = {
  sm: { label: "手机", width: 375 },
  md: { label: "平板", width: 768 },
  lg: { label: "桌面", width: 1024 },
  xl: { label: "宽屏", width: 1280 },
} as const

const DEFAULTS: State = {
  mode: "grid",
  count: 8,
  gap: 16,
  rowGap: 16,
  colGap: 16,
  splitGap: false,
  viewport: "lg",
  customWidth: 900,
  minHeight: 360,
  itemWidth: 96,
  itemHeight: 88,
  radius: 18,
  direction: "row",
  wrap: "wrap",
  justify: "center",
  align: "center",
  alignContent: "stretch",
  gridMode: "auto-fit",
  minColWidth: 160,
  fixedColumns: 4,
  justifyItems: "stretch",
  gridAlign: "stretch",
  dense: false,
}

const PRESETS: Array<{ name: string; desc: string; patch: Partial<State> }> = [
  { name: "响应式卡片", desc: "auto-fit + minmax", patch: { mode: "grid", gridMode: "auto-fit", minColWidth: 180, count: 8, gap: 18, itemHeight: 104 } },
  { name: "四列面板", desc: "固定 4 列", patch: { mode: "grid", gridMode: "fixed", fixedColumns: 4, count: 12, gap: 14, itemHeight: 92 } },
  { name: "导航分布", desc: "Flex 两端分散", patch: { mode: "flex", direction: "row", wrap: "wrap", justify: "space-between", align: "center", count: 5, itemWidth: 104, itemHeight: 54, minHeight: 180 } },
  { name: "绝对居中", desc: "Flex 双轴居中", patch: { mode: "flex", justify: "center", align: "center", count: 4, itemWidth: 120, itemHeight: 90, minHeight: 360 } },
  { name: "标签流", desc: "紧凑自动换行", patch: { mode: "flex", justify: "flex-start", align: "center", wrap: "wrap", count: 14, gap: 8, itemWidth: 92, itemHeight: 42, minHeight: 240 } },
]

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value)
}

function cssText(state: State) {
  const lines: string[] = []

  if (state.mode === "flex") {
    lines.push("display: flex;")
    lines.push(`flex-direction: ${state.direction};`)
    lines.push(`flex-wrap: ${state.wrap};`)
    lines.push(`justify-content: ${state.justify};`)
    lines.push(`align-items: ${state.align};`)
    if (state.wrap !== "nowrap") lines.push(`align-content: ${state.alignContent};`)
  } else {
    lines.push("display: grid;")
    lines.push(
      state.gridMode === "fixed"
        ? `grid-template-columns: repeat(${state.fixedColumns}, minmax(0, 1fr));`
        : `grid-template-columns: repeat(${state.gridMode}, minmax(${state.minColWidth}px, 1fr));`,
    )
    lines.push(`justify-items: ${state.justifyItems};`)
    lines.push(`align-items: ${state.gridAlign};`)
    if (state.dense) lines.push("grid-auto-flow: dense;")
  }

  if (state.splitGap) {
    lines.push(`row-gap: ${state.rowGap}px;`)
    lines.push(`column-gap: ${state.colGap}px;`)
  } else {
    lines.push(`gap: ${state.gap}px;`)
  }

  return lines.join("\n")
}

function liveStyle(state: State): CSSProperties {
  const gaps = state.splitGap ? { rowGap: state.rowGap, columnGap: state.colGap } : { gap: state.gap }

  if (state.mode === "flex") {
    return {
      display: "flex",
      flexDirection: state.direction,
      flexWrap: state.wrap,
      justifyContent: state.justify,
      alignItems: state.align,
      alignContent: state.alignContent,
      minHeight: state.minHeight,
      ...gaps,
    }
  }

  return {
    display: "grid",
    gridTemplateColumns:
      state.gridMode === "fixed"
        ? `repeat(${state.fixedColumns}, minmax(0, 1fr))`
        : `repeat(${state.gridMode}, minmax(${state.minColWidth}px, 1fr))`,
    justifyItems: state.justifyItems,
    alignItems: state.gridAlign,
    gridAutoFlow: state.dense ? "dense" : "row",
    minHeight: state.minHeight,
    ...gaps,
  }
}

function tailwindText(state: State) {
  const gap = state.splitGap ? `gap-x-[${state.colGap}px] gap-y-[${state.rowGap}px]` : `gap-[${state.gap}px]`

  if (state.mode === "grid") {
    const cols = state.gridMode === "fixed"
      ? `grid-cols-${state.fixedColumns}`
      : `[grid-template-columns:repeat(${state.gridMode},minmax(${state.minColWidth}px,1fr))]`
    return `className="grid ${cols} ${gap}"`
  }

  const direction = {
    row: "flex-row",
    "row-reverse": "flex-row-reverse",
    column: "flex-col",
    "column-reverse": "flex-col-reverse",
  }[state.direction]

  const wrap = {
    nowrap: "flex-nowrap",
    wrap: "flex-wrap",
    "wrap-reverse": "flex-wrap-reverse",
  }[state.wrap]

  const justify = {
    "flex-start": "justify-start",
    center: "justify-center",
    "flex-end": "justify-end",
    "space-between": "justify-between",
    "space-around": "justify-around",
    "space-evenly": "justify-evenly",
  }[state.justify]

  const align = {
    stretch: "items-stretch",
    "flex-start": "items-start",
    center: "items-center",
    "flex-end": "items-end",
    baseline: "items-baseline",
  }[state.align]

  return `className="flex ${direction} ${wrap} ${justify} ${align} ${gap}"`
}

function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 500)
}

function buttonClass(active: boolean) {
  return `rounded-full px-3.5 py-2 text-[8px] font-semibold transition ${active ? "bg-[#22231f] text-white" : "border border-black/[.08] text-black/34 hover:bg-white/50 hover:text-black"}`
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit: string
  onChange: (value: number) => void
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[8px]">
        <span className="text-black/30">{label}</span>
        <span className="layout-num font-mono font-semibold text-[#52685d]">{value}{unit}</span>
      </div>
      <div className="flex items-center gap-3">
        <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="min-w-0 flex-1 accent-[#52685d]" />
        <input type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(clamp(Number(event.target.value) || 0, min, max))} className="w-20 rounded-full border border-black/[.08] bg-white/40 px-3 py-2 font-mono text-[9px] outline-none" />
      </div>
    </div>
  )
}

export default function FlexGridPage() {
  const [state, setState] = useState<State>(DEFAULTS)
  const [copied, setCopied] = useState<CopyKey>(null)
  const [selected, setSelected] = useState<number | null>(null)

  const pageRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const viewportWidth = state.viewport === "custom" ? state.customWidth : VIEWPORTS[state.viewport].width
  const previewWidth = Math.min(viewportWidth, 1120)
  const style = useMemo(() => liveStyle(state), [state])
  const css = useMemo(() => cssText(state), [state])
  const tailwind = useMemo(() => tailwindText(state), [state])
  const report = useMemo(
    () => [
      "BitLeap Layout Studio",
      "",
      `Mode: ${state.mode}`,
      `Viewport: ${viewportWidth}px`,
      `Items: ${state.count}`,
      "",
      "CSS:",
      css,
      "",
      "Tailwind:",
      tailwind,
    ].join("\n"),
    [css, state, tailwind, viewportWidth],
  )

  useEffect(() => {
    if (!pageRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const ctx = gsap.context(() => {
      gsap.from(".layout-intro", { opacity: 0, y: 18, duration: 0.72, stagger: 0.055, ease: "power3.out" })
      gsap.to(".layout-orbit", { rotation: 360, duration: 90, repeat: -1, ease: "none", transformOrigin: "50% 50%" })
    }, pageRef)
    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (!previewRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    gsap.fromTo(previewRef.current, { opacity: 0.82 }, { opacity: 1, duration: 0.18, overwrite: true })
  }, [state])

  const patch = (next: Partial<State>) => setState((current) => ({ ...current, ...next }))

  const copy = async (value: string, key: CopyKey) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {}
  }

  return (
    <div ref={pageRef} className="min-h-screen overflow-hidden bg-[#f0eee8] text-[#22231f] selection:bg-[#22231f] selection:text-white">
      <style>{`
        .layout-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
        .layout-scroll::-webkit-scrollbar-track { background: transparent; }
        .layout-scroll::-webkit-scrollbar-thumb { background: rgba(34,35,31,.13); border-radius: 999px; }
        .layout-dark-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.13); }
        .layout-num { font-variant-numeric: tabular-nums lining-nums; }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(178,141,72,.08),transparent_25%),radial-gradient(circle_at_7%_91%,rgba(82,104,93,.08),transparent_29%)]" />
        <div className="layout-orbit absolute right-[-18vw] top-[-22vw] h-[56vw] w-[56vw] rounded-full border border-black/[.035]">
          <span className="absolute left-[18%] top-[44%] h-2 w-2 rounded-full bg-[#52685d]/30" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1600px] px-5 pb-10 pt-6 sm:px-8">
        <div className="layout-intro"><Breadcrumb /></div>

        <header className="layout-intro mt-8 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.75fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/25">LAYOUT STUDIO</div>
            <h1 className="mt-4 text-[clamp(48px,6.2vw,88px)] font-semibold leading-[1.02] tracking-[-.055em]">Flex / Grid，<br />看着调。</h1>
          </div>
          <div>
            <p className="max-w-[560px] text-[11px] leading-6 text-black/40">比普通表单更接近真实前端工作流：切视口、调布局、看响应式变化，然后直接复制 CSS 或 Tailwind。</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button key={preset.name} type="button" onClick={() => patch(preset.patch)} className="rounded-full border border-black/[.08] px-3.5 py-2 text-[8px] font-semibold text-black/34 transition hover:bg-white/50 hover:text-black">{preset.name}</button>
              ))}
            </div>
          </div>
        </header>

        <section className="layout-intro mt-7 overflow-hidden rounded-[32px] border border-black/[.08] bg-[#171916]">
          <div className="flex flex-col gap-4 border-b border-white/[.07] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-2">
              {(["flex", "grid"] as Mode[]).map((mode) => (
                <button key={mode} type="button" onClick={() => patch({ mode })} className={`rounded-full px-5 py-2.5 text-[9px] font-semibold transition ${state.mode === mode ? "bg-white text-[#151714]" : "text-white/34 hover:bg-white/[.07]"}`}>{mode === "flex" ? "Flex" : "Grid"}</button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(Object.keys(VIEWPORTS) as Array<Exclude<Viewport, "custom">>).map((viewport) => (
                <button key={viewport} type="button" onClick={() => patch({ viewport })} className={`rounded-full px-3 py-2 font-mono text-[8px] font-semibold transition ${state.viewport === viewport ? "bg-[#52685d] text-white" : "border border-white/[.08] text-white/28 hover:bg-white/[.06]"}`}>{VIEWPORTS[viewport].label} {VIEWPORTS[viewport].width}</button>
              ))}
              <button type="button" onClick={() => patch({ viewport: "custom" })} className={`rounded-full px-3 py-2 font-mono text-[8px] font-semibold transition ${state.viewport === "custom" ? "bg-[#52685d] text-white" : "border border-white/[.08] text-white/28 hover:bg-white/[.06]"}`}>CUSTOM</button>
            </div>
          </div>

          <div className="grid gap-px bg-white/[.06] xl:grid-cols-[330px_1fr_330px]">
            <aside className="bg-[#f4f1e9]">
              <div className="border-b border-black/[.06] px-5 py-4 text-[8px] font-semibold tracking-[.13em] text-black/24">CONTROLS</div>
              <div className="layout-scroll h-[720px] overflow-auto p-5">
                <div className="space-y-6">
                  <Slider label="子项数量" value={state.count} min={1} max={30} unit="" onChange={(count) => patch({ count })} />
                  <Slider label="容器最小高度" value={state.minHeight} min={160} max={620} step={10} unit="px" onChange={(minHeight) => patch({ minHeight })} />

                  <div>
                    <div className="mb-2 text-[8px] font-semibold tracking-[.12em] text-black/24">GAP</div>
                    <div className="mb-3 flex gap-2">
                      <button type="button" onClick={() => patch({ splitGap: false })} className={buttonClass(!state.splitGap)}>统一</button>
                      <button type="button" onClick={() => patch({ splitGap: true })} className={buttonClass(state.splitGap)}>行 / 列</button>
                    </div>
                    {state.splitGap ? (
                      <div className="space-y-4">
                        <Slider label="Row gap" value={state.rowGap} min={0} max={80} unit="px" onChange={(rowGap) => patch({ rowGap })} />
                        <Slider label="Column gap" value={state.colGap} min={0} max={80} unit="px" onChange={(colGap) => patch({ colGap })} />
                      </div>
                    ) : (
                      <Slider label="Gap" value={state.gap} min={0} max={80} unit="px" onChange={(gap) => patch({ gap })} />
                    )}
                  </div>

                  {state.mode === "flex" ? (
                    <>
                      <ControlGroup title="DIRECTION" values={["row", "row-reverse", "column", "column-reverse"]} active={state.direction} onChange={(direction) => patch({ direction: direction as State["direction"] })} />
                      <ControlGroup title="WRAP" values={["nowrap", "wrap", "wrap-reverse"]} active={state.wrap} onChange={(wrap) => patch({ wrap: wrap as State["wrap"] })} />
                      <ControlGroup title="JUSTIFY CONTENT" values={["flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly"]} active={state.justify} onChange={(justify) => patch({ justify: justify as State["justify"] })} />
                      <ControlGroup title="ALIGN ITEMS" values={["stretch", "flex-start", "center", "flex-end", "baseline"]} active={state.align} onChange={(align) => patch({ align: align as State["align"] })} />
                      {state.wrap !== "nowrap" && <ControlGroup title="ALIGN CONTENT" values={["stretch", "flex-start", "center", "flex-end", "space-between", "space-around"]} active={state.alignContent} onChange={(alignContent) => patch({ alignContent: alignContent as State["alignContent"] })} />}
                    </>
                  ) : (
                    <>
                      <ControlGroup title="GRID COLUMNS" values={["auto-fit", "auto-fill", "fixed"]} active={state.gridMode} onChange={(gridMode) => patch({ gridMode: gridMode as GridMode })} />
                      {state.gridMode === "fixed"
                        ? <Slider label="固定列数" value={state.fixedColumns} min={1} max={12} unit="" onChange={(fixedColumns) => patch({ fixedColumns })} />
                        : <Slider label="最小列宽" value={state.minColWidth} min={80} max={360} step={10} unit="px" onChange={(minColWidth) => patch({ minColWidth })} />}
                      <ControlGroup title="JUSTIFY ITEMS" values={["stretch", "start", "center", "end"]} active={state.justifyItems} onChange={(justifyItems) => patch({ justifyItems: justifyItems as State["justifyItems"] })} />
                      <ControlGroup title="ALIGN ITEMS" values={["stretch", "start", "center", "end"]} active={state.gridAlign} onChange={(gridAlign) => patch({ gridAlign: gridAlign as State["gridAlign"] })} />
                      <button type="button" onClick={() => patch({ dense: !state.dense })} className={buttonClass(state.dense)}>grid-auto-flow: dense</button>
                    </>
                  )}

                  <div className="border-t border-black/[.08] pt-5">
                    <div className="mb-4 text-[8px] font-semibold tracking-[.12em] text-black/24">ITEMS</div>
                    <div className="space-y-4">
                      <Slider label="Item width" value={state.itemWidth} min={44} max={220} unit="px" onChange={(itemWidth) => patch({ itemWidth })} />
                      <Slider label="Item height" value={state.itemHeight} min={36} max={180} unit="px" onChange={(itemHeight) => patch({ itemHeight })} />
                      <Slider label="圆角" value={state.radius} min={0} max={36} unit="px" onChange={(radius) => patch({ radius })} />
                    </div>
                  </div>
                </div>
              </div>
            </aside>

            <main className="min-w-0 bg-[#151714]">
              <div className="flex h-12 items-center justify-between border-b border-white/[.06] px-5">
                <span className="text-[8px] font-semibold tracking-[.13em] text-white/24">LIVE VIEWPORT</span>
                <span className="layout-num font-mono text-[8px] text-white/20">{formatNumber(viewportWidth)}px</span>
              </div>

              <div className="layout-dark-scroll overflow-auto p-5 sm:p-7">
                {state.viewport === "custom" && (
                  <div className="mb-5 max-w-[460px]">
                    <div className="mb-2 flex justify-between text-[8px] text-white/24"><span>Custom viewport</span><span className="font-mono text-[#8fb69b]">{state.customWidth}px</span></div>
                    <input type="range" min={280} max={1440} step={10} value={state.customWidth} onChange={(event) => patch({ customWidth: Number(event.target.value) })} className="w-full accent-[#8fb69b]" />
                  </div>
                )}

                <div className="mx-auto transition-[width] duration-300 ease-out" style={{ width: `${previewWidth}px`, maxWidth: "100%" }}>
                  <div className="mb-2 flex items-center justify-between text-[8px] text-white/18">
                    <span>{state.viewport === "custom" ? "CUSTOM" : VIEWPORTS[state.viewport].label.toUpperCase()}</span>
                    <span>{state.mode.toUpperCase()}</span>
                  </div>

                  <div ref={previewRef} className="overflow-auto rounded-[24px] border border-white/[.07] bg-[#f1eee6] p-5">
                    <div style={style}>
                      {Array.from({ length: state.count }, (_, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setSelected(index + 1)}
                          style={{
                            width: state.mode === "grid" && state.justifyItems === "stretch" ? "100%" : `${state.itemWidth}px`,
                            height: `${state.itemHeight}px`,
                            borderRadius: `${state.radius}px`,
                          }}
                          className={`grid place-items-center border font-mono text-[10px] font-semibold transition ${selected === index + 1 ? "border-[#52685d] bg-[#52685d] text-white shadow-[0_14px_32px_rgba(82,104,93,.24)]" : "border-black/[.08] bg-white/68 text-black/45 hover:bg-white"}`}
                        >
                          {String(index + 1).padStart(2, "0")}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-px border-t border-white/[.06] bg-white/[.06]">
                {[
                  ["VIEWPORT", `${viewportWidth}px`],
                  ["ITEMS", String(state.count)],
                  ["MODE", state.mode.toUpperCase()],
                  ["SELECTED", selected ? `#${selected}` : "none"],
                ].map(([label, value]) => (
                  <div key={label} className="bg-[#151714] p-4">
                    <div className="text-[7px] font-semibold tracking-[.12em] text-white/20">{label}</div>
                    <div className="layout-num mt-2 font-mono text-[10px] font-semibold text-[#cbd8cd]">{value}</div>
                  </div>
                ))}
              </div>
            </main>

            <aside className="bg-[#f4f1e9]">
              <div className="border-b border-black/[.06] px-5 py-4 text-[8px] font-semibold tracking-[.13em] text-black/24">OUTPUT</div>
              <div className="layout-scroll h-[720px] overflow-auto p-5">
                <div className="space-y-4">
                  {[
                    { label: "CSS", value: css, key: "css" as CopyKey },
                    { label: "Tailwind", value: tailwind, key: "tailwind" as CopyKey },
                  ].map((item) => (
                    <article key={item.label} className="rounded-[20px] border border-black/[.075] bg-white/28 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-[8px] font-semibold tracking-[.12em] text-black/24">{item.label}</span>
                        <button type="button" onClick={() => copy(item.value, item.key)} className="text-[8px] font-semibold text-black/28 hover:text-black">{copied === item.key ? "✓ COPIED" : "COPY"}</button>
                      </div>
                      <pre className="layout-scroll max-h-[240px] overflow-auto whitespace-pre-wrap break-all rounded-[16px] bg-[#151714] p-4 font-mono text-[9px] leading-5 text-[#cbd8cd]">{item.value}</pre>
                    </article>
                  ))}

                  <article className="rounded-[20px] border border-black/[.075] bg-white/28 p-4">
                    <div className="text-[8px] font-semibold tracking-[.12em] text-black/24">BEHAVIOR NOTE</div>
                    <p className="mt-3 text-[8px] leading-5 text-black/34">
                      Grid 的 auto-fit 会折叠空轨道，auto-fill 会保留轨道。Flex 的 align-content 只有在多行且交叉轴有额外空间时才明显。
                    </p>
                  </article>

                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => { setState(DEFAULTS); setSelected(null) }} className="rounded-full px-4 py-3 text-[9px] font-semibold text-[#965744] hover:bg-[#965744]/8">重置</button>
                    <button type="button" onClick={() => copy(report, "report")} className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 hover:bg-white/40">{copied === "report" ? "✓ 报告" : "复制报告"}</button>
                    <button type="button" onClick={() => downloadText(report, "bitleap-layout-report.txt")} className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 hover:bg-white/40">导出</button>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="layout-intro mt-12 grid gap-8 border-t border-black/10 pt-7 md:grid-cols-3">
          <div><div className="text-[8px] font-semibold tracking-[.11em] text-black/25">REAL VIEWPORT</div><p className="mt-2 text-[9px] leading-5 text-black/34">手机、平板、桌面、宽屏和自定义宽度都会真实改变预览容器宽度。</p></div>
          <div><div className="text-[8px] font-semibold tracking-[.11em] text-black/25">GRID DEPTH</div><p className="mt-2 text-[9px] leading-5 text-black/34">支持 auto-fit、auto-fill、固定列数、justify-items、align-items 和 dense。</p></div>
          <div><div className="text-[8px] font-semibold tracking-[.11em] text-black/25">FLEX DEPTH</div><p className="mt-2 text-[9px] leading-5 text-black/34">支持 direction、wrap、完整 justify-content、align-items 和 align-content。</p></div>
        </section>

        <div className="mt-12 border-t border-black/[.08] pt-5"><FooterNote /></div>
      </div>
    </div>
  )
}

function ControlGroup({
  title,
  values,
  active,
  onChange,
}: {
  title: string
  values: readonly string[]
  active: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <div className="mb-2 text-[8px] font-semibold tracking-[.12em] text-black/24">{title}</div>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <button key={value} type="button" onClick={() => onChange(value)} className={buttonClass(active === value)}>
            {value.replace("flex-", "")}
          </button>
        ))}
      </div>
    </div>
  )
}
