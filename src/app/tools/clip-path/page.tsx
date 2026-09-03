'use client'

import {
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Check,
  CircleDot,
  Copy,
  Grid3X3,
  Image as ImageIcon,
  Minus,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import {
  clipPresets,
  clonePreset,
  generateClipPath,
  type ClipPreset,
  type Point,
} from './presets'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

type FillRule = 'nonzero' | 'evenodd'
type PreviewMode = 'gradient' | 'photo' | 'solid'

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

function distanceToSegment(
  point: Point,
  a: Point,
  b: Point,
) {
  const abX = b.x - a.x
  const abY = b.y - a.y
  const apX = point.x - a.x
  const apY = point.y - a.y
  const abLengthSq = abX * abX + abY * abY

  if (abLengthSq === 0) {
    return Math.hypot(point.x - a.x, point.y - a.y)
  }

  const t = clamp(
    (apX * abX + apY * abY) / abLengthSq,
    0,
    1,
  )

  const nearestX = a.x + abX * t
  const nearestY = a.y + abY * t

  return Math.hypot(
    point.x - nearestX,
    point.y - nearestY,
  )
}

function insertPointOnNearestEdge(
  points: Point[],
  newPoint: Point,
) {
  if (points.length < 2) {
    return [...points, newPoint]
  }

  let bestIndex = 0
  let bestDistance = Number.POSITIVE_INFINITY

  for (let index = 0; index < points.length; index += 1) {
    const nextIndex = (index + 1) % points.length
    const distance = distanceToSegment(
      newPoint,
      points[index],
      points[nextIndex],
    )

    if (distance < bestDistance) {
      bestDistance = distance
      bestIndex = nextIndex
    }
  }

  const next = [...points]
  next.splice(bestIndex, 0, newPoint)
  return next
}

export default function ClipPathGenerator() {
  const canvasRef = useRef<SVGSVGElement>(null)
  const dragIndexRef = useRef<number | null>(null)

  const initialPreset = useMemo(
    () =>
      clonePreset(
        clipPresets.find(
          (preset) => preset.id === 'triangle',
        )!,
      ),
    [],
  )

  const [activePreset, setActivePreset] =
    useState<ClipPreset>(initialPreset)
  const [fillRule, setFillRule] =
    useState<FillRule>('nonzero')
  const [previewMode, setPreviewMode] =
    useState<PreviewMode>('gradient')
  const [showGrid, setShowGrid] = useState(true)
  const [copiedKey, setCopiedKey] = useState('')

  const categories = useMemo(
    () => [
      ...new Set(
        clipPresets.map((preset) => preset.category),
      ),
    ],
    [],
  )

  const clipPathCss = useMemo(
    () => generateClipPath(activePreset, fillRule),
    [activePreset, fillRule],
  )

  const fullCss = useMemo(
    () =>
      `clip-path: ${clipPathCss};\n-webkit-clip-path: ${clipPathCss};`,
    [clipPathCss],
  )

  const getPointerPosition = (
    clientX: number,
    clientY: number,
  ): Point => {
    const svg = canvasRef.current

    if (!svg) return { x: 50, y: 50 }

    const rect = svg.getBoundingClientRect()

    return {
      x: clamp(
        ((clientX - rect.left) / rect.width) * 100,
      ),
      y: clamp(
        ((clientY - rect.top) / rect.height) * 100,
      ),
    }
  }

  const selectPreset = (preset: ClipPreset) => {
    setActivePreset(clonePreset(preset))
    dragIndexRef.current = null
  }

  const updatePolygonPoint = (
    index: number,
    point: Point,
  ) => {
    setActivePreset((current) => {
      if (current.kind !== 'polygon') return current

      return {
        ...current,
        points: current.points.map(
          (currentPoint, currentIndex) =>
            currentIndex === index
              ? point
              : currentPoint,
        ),
      }
    })
  }

  const removePoint = (index: number) => {
    setActivePreset((current) => {
      if (
        current.kind !== 'polygon' ||
        current.points.length <= 3
      ) {
        return current
      }

      return {
        ...current,
        id: 'custom',
        name: 'Custom',
        category: '自由',
        description: '自由编辑中的多边形',
        points: current.points.filter(
          (_, currentIndex) =>
            currentIndex !== index,
        ),
      }
    })
  }

  const addPointAt = (point: Point) => {
    setActivePreset((current) => {
      if (current.kind !== 'polygon') return current

      return {
        ...current,
        id: 'custom',
        name: 'Custom',
        category: '自由',
        description: '自由编辑中的多边形',
        points: insertPointOnNearestEdge(
          current.points,
          point,
        ),
      }
    })
  }

  const addCenterPoint = () => {
    if (activePreset.kind !== 'polygon') return

    addPointAt({ x: 50, y: 50 })
  }

  const handleCanvasPointerMove = (
    event: React.PointerEvent<SVGSVGElement>,
  ) => {
    const index = dragIndexRef.current

    if (
      index === null ||
      activePreset.kind !== 'polygon'
    ) {
      return
    }

    updatePolygonPoint(
      index,
      getPointerPosition(
        event.clientX,
        event.clientY,
      ),
    )
  }

  const handleCanvasPointerUp = () => {
    dragIndexRef.current = null
  }

  const handleCanvasDoubleClick = (
    event: React.MouseEvent<SVGSVGElement>,
  ) => {
    if (activePreset.kind !== 'polygon') return

    if (event.target !== event.currentTarget) {
      return
    }

    addPointAt(
      getPointerPosition(
        event.clientX,
        event.clientY,
      ),
    )
  }

  const updateCircle = (
    patch: Partial<
      Extract<ClipPreset, { kind: 'circle' }>
    >,
  ) => {
    setActivePreset((current) => {
      if (current.kind !== 'circle') return current

      return {
        ...current,
        ...patch,
      }
    })
  }

  const updateEllipse = (
    patch: Partial<
      Extract<ClipPreset, { kind: 'ellipse' }>
    >,
  ) => {
    setActivePreset((current) => {
      if (current.kind !== 'ellipse') return current

      return {
        ...current,
        ...patch,
      }
    })
  }

  const resetCurrent = () => {
    const preset = clipPresets.find(
      (item) => item.id === activePreset.id,
    )

    if (preset) {
      setActivePreset(clonePreset(preset))
      return
    }

    const custom = clipPresets.find(
      (item) => item.id === 'custom',
    )

    if (custom) {
      setActivePreset(clonePreset(custom))
    }
  }

  const copy = async (
    value: string,
    key: string,
  ) => {
    await navigator.clipboard.writeText(value)
    setCopiedKey(key)
    window.setTimeout(
      () => setCopiedKey(''),
      1500,
    )
  }

  const previewBackground =
    previewMode === 'gradient'
      ? 'linear-gradient(135deg,#8b5cf6 0%,#ec4899 48%,#f59e0b 100%)'
      : previewMode === 'solid'
        ? '#18181b'
        : undefined

  return (
    <div className="relative min-h-screen bg-[#f7f7fa] text-zinc-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_7%_5%,rgba(237,233,254,.62),transparent_24%),radial-gradient(circle_at_93%_8%,rgba(224,242,254,.58),transparent_25%),radial-gradient(circle_at_50%_78%,rgba(253,242,248,.42),transparent_34%)]" />

      <div className="relative mx-auto w-full max-w-[1600px] px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <Breadcrumb />

        <div className="mt-5 flex flex-col gap-4 border-b border-black/[0.055] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-violet-500">
              CSS Shape Tool
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
              Clip Path 形状生成器
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              选择预设、拖拽顶点或调整圆形参数，实时生成可以直接使用的 clip-path CSS。
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setShowGrid(
                  (current) => !current,
                )
              }
              className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[11px] font-medium transition ${
                showGrid
                  ? 'border-zinc-950 bg-zinc-950 text-white'
                  : 'border-black/[0.06] bg-white/78 text-zinc-600 hover:bg-white'
              }`}
            >
              <Grid3X3 className="h-4 w-4" />
              网格
            </button>

            <button
              type="button"
              onClick={resetCurrent}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-black/[0.06] bg-white/78 px-4 text-[11px] font-medium text-zinc-600 transition hover:border-violet-200 hover:text-violet-600"
            >
              <RotateCcw className="h-4 w-4" />
              重置当前
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)_360px]">
          <aside className="rounded-[24px] border border-black/[0.055] bg-white/78 p-3 backdrop-blur-xl xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:self-start xl:overflow-y-auto">
            <div className="px-2 pb-3">
              <div className="text-[9px] uppercase tracking-[0.17em] text-zinc-300">
                Presets
              </div>
              <h2 className="mt-1 text-sm font-semibold text-zinc-800">
                形状库
              </h2>
            </div>

            <div className="space-y-4">
              {categories.map((category) => (
                <div key={category}>
                  <div className="mb-1.5 px-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-300">
                    {category}
                  </div>

                  <div className="space-y-1">
                    {clipPresets
                      .filter(
                        (preset) =>
                          preset.category === category,
                      )
                      .map((preset) => {
                        const isActive =
                          activePreset.id === preset.id

                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() =>
                              selectPreset(preset)
                            }
                            className={`flex w-full items-center gap-3 rounded-[14px] border px-2.5 py-2 text-left transition ${
                              isActive
                                ? 'border-violet-200 bg-violet-50/75'
                                : 'border-transparent text-zinc-500 hover:border-black/[0.05] hover:bg-zinc-50'
                            }`}
                          >
                            <div
                              className={`h-9 w-9 shrink-0 ${
                                isActive
                                  ? 'bg-violet-500'
                                  : 'bg-zinc-300'
                              }`}
                              style={{
                                clipPath:
                                  generateClipPath(
                                    preset,
                                  ),
                              }}
                            />

                            <div className="min-w-0">
                              <div
                                className={`truncate text-[11px] font-semibold ${
                                  isActive
                                    ? 'text-violet-700'
                                    : 'text-zinc-700'
                                }`}
                              >
                                {preset.name}
                              </div>
                              <div className="mt-0.5 truncate text-[9px] text-zinc-300">
                                {preset.kind}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <main className="min-w-0 space-y-5">
            <section className="rounded-[28px] border border-black/[0.055] bg-white/82 p-4 shadow-[0_28px_90px_-66px_rgba(67,56,202,.24)] backdrop-blur-xl sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-[9px] uppercase tracking-[0.17em] text-zinc-300">
                    Live Canvas
                  </div>
                  <h2 className="mt-1 text-sm font-semibold text-zinc-800">
                    {activePreset.name}
                  </h2>
                  <p className="mt-1 text-[11px] leading-5 text-zinc-400">
                    {activePreset.description}
                  </p>
                </div>

                <div className="flex gap-1 rounded-full border border-black/[0.055] bg-zinc-50 p-1">
                  {(
                    [
                      {
                        id: 'gradient',
                        label: '渐变',
                      },
                      {
                        id: 'solid',
                        label: '纯色',
                      },
                      {
                        id: 'photo',
                        label: '图片',
                      },
                    ] as const
                  ).map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() =>
                        setPreviewMode(mode.id)
                      }
                      className={`rounded-full px-3 py-1.5 text-[9px] font-medium transition ${
                        previewMode === mode.id
                          ? 'bg-white text-zinc-800 shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-700'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative mt-5 flex min-h-[520px] items-center justify-center overflow-hidden rounded-[22px] border border-black/[0.055] bg-[#f6f6f8] p-5">
                {showGrid && (
                  <div
                    className="pointer-events-none absolute inset-0 opacity-[0.055]"
                    style={{
                      backgroundImage:
                        'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
                      backgroundSize: '24px 24px',
                    }}
                  />
                )}

                <div className="relative aspect-square w-full max-w-[520px]">
                  <div
                    className="absolute inset-0 overflow-hidden"
                    style={{
                      clipPath: clipPathCss,
                      WebkitClipPath:
                        clipPathCss,
                    }}
                  >
                    {previewMode === 'photo' ? (
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_28%,#fde68a_0%,transparent_27%),radial-gradient(circle_at_74%_32%,#a5f3fc_0%,transparent_29%),radial-gradient(circle_at_55%_75%,#ddd6fe_0%,transparent_34%),linear-gradient(135deg,#f8fafc,#e4e4e7)]" />
                    ) : (
                      <div
                        className="absolute inset-0"
                        style={{
                          background:
                            previewBackground,
                        }}
                      />
                    )}

                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(125deg,rgba(255,255,255,.2),transparent_32%,transparent_68%,rgba(255,255,255,.08))]" />
                  </div>

                  {activePreset.kind ===
                    'polygon' && (
                    <svg
                      ref={canvasRef}
                      viewBox="0 0 100 100"
                      className="absolute inset-0 h-full w-full touch-none"
                      onPointerMove={
                        handleCanvasPointerMove
                      }
                      onPointerUp={
                        handleCanvasPointerUp
                      }
                      onPointerCancel={
                        handleCanvasPointerUp
                      }
                      onDoubleClick={
                        handleCanvasDoubleClick
                      }
                    >
                      <polygon
                        points={activePreset.points
                          .map(
                            (point) =>
                              `${point.x},${point.y}`,
                          )
                          .join(' ')}
                        fill="rgba(139,92,246,.04)"
                        stroke="rgba(24,24,27,.22)"
                        strokeWidth=".45"
                        strokeDasharray="1.5 1.5"
                        pointerEvents="none"
                      />

                      {activePreset.points.map(
                        (point, index) => (
                          <g key={`${index}-${point.x}-${point.y}`}>
                            <circle
                              cx={point.x}
                              cy={point.y}
                              r="3.4"
                              fill="rgba(255,255,255,.92)"
                              stroke="rgba(24,24,27,.14)"
                              strokeWidth=".5"
                              className="cursor-grab active:cursor-grabbing"
                              onPointerDown={(
                                event,
                              ) => {
                                event.preventDefault()
                                event.stopPropagation()
                                dragIndexRef.current =
                                  index
                                event.currentTarget.setPointerCapture(
                                  event.pointerId,
                                )
                              }}
                              onDoubleClick={(
                                event,
                              ) => {
                                event.preventDefault()
                                event.stopPropagation()
                                removePoint(index)
                              }}
                            />

                            <circle
                              cx={point.x}
                              cy={point.y}
                              r="1.25"
                              fill="#8b5cf6"
                              pointerEvents="none"
                            />
                          </g>
                        ),
                      )}
                    </svg>
                  )}
                </div>

                {activePreset.kind ===
                  'polygon' && (
                  <button
                    type="button"
                    onClick={addCenterPoint}
                    className="absolute right-4 top-4 inline-flex h-9 items-center gap-2 rounded-full border border-black/[0.06] bg-white/86 px-3 text-[10px] font-medium text-zinc-500 shadow-sm backdrop-blur transition hover:border-violet-200 hover:text-violet-600"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    添加顶点
                  </button>
                )}

                <div className="absolute bottom-4 left-4 rounded-full border border-black/[0.05] bg-white/78 px-3 py-1.5 font-mono text-[9px] text-zinc-400 backdrop-blur">
                  {activePreset.kind ===
                  'polygon'
                    ? `${activePreset.points.length} points`
                    : activePreset.kind}
                </div>
              </div>

              {activePreset.kind ===
                'polygon' && (
                <p className="mt-3 text-center text-[10px] leading-5 text-zinc-400">
                  拖拽圆点调整形状 · 双击顶点删除 · 双击画布空白会在最近边插入顶点
                </p>
              )}
            </section>

            {activePreset.kind ===
              'polygon' && (
              <section className="rounded-[24px] border border-black/[0.055] bg-white/78 p-4 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.17em] text-zinc-300">
                      Coordinates
                    </div>
                    <h2 className="mt-1 text-sm font-semibold text-zinc-800">
                      顶点坐标
                    </h2>
                  </div>

                  <span className="rounded-full bg-zinc-50 px-2.5 py-1 font-mono text-[9px] text-zinc-400">
                    {activePreset.points.length}{' '}
                    points
                  </span>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {activePreset.points.map(
                    (point, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 rounded-[14px] border border-black/[0.055] bg-zinc-50 p-2"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white font-mono text-[9px] text-zinc-400">
                          {String(
                            index + 1,
                          ).padStart(2, '0')}
                        </div>

                        <label className="flex min-w-0 flex-1 items-center rounded-lg bg-white px-2">
                          <span className="text-[9px] text-zinc-300">
                            X
                          </span>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            value={
                              Math.round(
                                point.x * 10,
                              ) / 10
                            }
                            onChange={(
                              event,
                            ) =>
                              updatePolygonPoint(
                                index,
                                {
                                  ...point,
                                  x: clamp(
                                    Number(
                                      event
                                        .target
                                        .value,
                                    ),
                                  ),
                                },
                              )
                            }
                            className="h-8 min-w-0 flex-1 bg-transparent text-right font-mono text-[10px] text-zinc-600 outline-none"
                          />
                          <span className="ml-1 text-[9px] text-zinc-300">
                            %
                          </span>
                        </label>

                        <label className="flex min-w-0 flex-1 items-center rounded-lg bg-white px-2">
                          <span className="text-[9px] text-zinc-300">
                            Y
                          </span>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            value={
                              Math.round(
                                point.y * 10,
                              ) / 10
                            }
                            onChange={(
                              event,
                            ) =>
                              updatePolygonPoint(
                                index,
                                {
                                  ...point,
                                  y: clamp(
                                    Number(
                                      event
                                        .target
                                        .value,
                                    ),
                                  ),
                                },
                              )
                            }
                            className="h-8 min-w-0 flex-1 bg-transparent text-right font-mono text-[10px] text-zinc-600 outline-none"
                          />
                          <span className="ml-1 text-[9px] text-zinc-300">
                            %
                          </span>
                        </label>

                        <button
                          type="button"
                          onClick={() =>
                            removePoint(index)
                          }
                          disabled={
                            activePreset.points
                              .length <= 3
                          }
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-300 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-20"
                          aria-label="删除顶点"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ),
                  )}
                </div>
              </section>
            )}
          </main>

          <aside className="space-y-5 xl:sticky xl:top-20 xl:self-start">
            <section className="rounded-[24px] border border-black/[0.055] bg-white/82 p-4 shadow-[0_24px_70px_-58px_rgba(67,56,202,.2)] backdrop-blur-xl">
              <div className="text-[9px] uppercase tracking-[0.17em] text-zinc-300">
                Inspector
              </div>
              <h2 className="mt-1 text-sm font-semibold text-zinc-800">
                参数设置
              </h2>

              {activePreset.kind ===
                'circle' && (
                <div className="mt-4 space-y-4">
                  <RangeControl
                    label="半径"
                    value={activePreset.radius}
                    onChange={(value) =>
                      updateCircle({
                        radius: value,
                      })
                    }
                  />
                  <RangeControl
                    label="圆心 X"
                    value={activePreset.center.x}
                    onChange={(value) =>
                      updateCircle({
                        center: {
                          ...activePreset.center,
                          x: value,
                        },
                      })
                    }
                  />
                  <RangeControl
                    label="圆心 Y"
                    value={activePreset.center.y}
                    onChange={(value) =>
                      updateCircle({
                        center: {
                          ...activePreset.center,
                          y: value,
                        },
                      })
                    }
                  />
                </div>
              )}

              {activePreset.kind ===
                'ellipse' && (
                <div className="mt-4 space-y-4">
                  <RangeControl
                    label="水平半径"
                    value={
                      activePreset.radiusX
                    }
                    onChange={(value) =>
                      updateEllipse({
                        radiusX: value,
                      })
                    }
                  />
                  <RangeControl
                    label="垂直半径"
                    value={
                      activePreset.radiusY
                    }
                    onChange={(value) =>
                      updateEllipse({
                        radiusY: value,
                      })
                    }
                  />
                  <RangeControl
                    label="中心 X"
                    value={activePreset.center.x}
                    onChange={(value) =>
                      updateEllipse({
                        center: {
                          ...activePreset.center,
                          x: value,
                        },
                      })
                    }
                  />
                  <RangeControl
                    label="中心 Y"
                    value={activePreset.center.y}
                    onChange={(value) =>
                      updateEllipse({
                        center: {
                          ...activePreset.center,
                          y: value,
                        },
                      })
                    }
                  />
                </div>
              )}

              {activePreset.kind ===
                'polygon' && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-zinc-400">
                      顶点数量
                    </span>
                    <span className="font-mono text-zinc-600">
                      {
                        activePreset.points
                          .length
                      }
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={addCenterPoint}
                    className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-black/[0.1] bg-zinc-50 text-[10px] font-medium text-zinc-500 transition hover:border-violet-200 hover:bg-violet-50/50 hover:text-violet-600"
                  >
                    <CircleDot className="h-4 w-4" />
                    添加控制点
                  </button>
                </div>
              )}

              {activePreset.kind ===
                'polygon' && (
                <div className="mt-5 border-t border-black/[0.045] pt-4">
                  <div className="text-[10px] text-zinc-400">
                    Fill Rule
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {(
                      [
                        'nonzero',
                        'evenodd',
                      ] as const
                    ).map((rule) => (
                      <button
                        key={rule}
                        type="button"
                        onClick={() =>
                          setFillRule(rule)
                        }
                        className={`rounded-xl border px-3 py-2.5 font-mono text-[10px] transition ${
                          fillRule === rule
                            ? 'border-zinc-950 bg-zinc-950 text-white'
                            : 'border-black/[0.06] bg-zinc-50 text-zinc-500 hover:border-violet-200'
                        }`}
                      >
                        {rule}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-[24px] border border-black/[0.055] bg-[#111113] shadow-[0_26px_70px_-54px_rgba(0,0,0,.42)]">
              <div className="flex h-11 items-center justify-between border-b border-white/[0.07] px-4">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                  <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.12em] text-white/28">
                    css
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    copy(fullCss, 'css')
                  }
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] text-white/45 transition hover:bg-white/[0.06] hover:text-white"
                >
                  {copiedKey === 'css' ? (
                    <Check className="h-3.5 w-3.5 text-emerald-300" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copiedKey === 'css'
                    ? '已复制'
                    : '复制 CSS'}
                </button>
              </div>

              <pre className="max-h-[270px] overflow-auto p-4 font-mono text-[11px] leading-6 text-emerald-300">
                <code>{fullCss}</code>
              </pre>
            </section>

            <section className="rounded-[20px] border border-black/[0.055] bg-white/68 p-4 backdrop-blur">
              <div className="flex items-start gap-3">
                <ImageIcon className="mt-0.5 h-4 w-4 text-violet-400" />
                <div>
                  <div className="text-xs font-semibold text-zinc-700">
                    使用建议
                  </div>
                  <p className="mt-1 text-[10px] leading-5 text-zinc-400">
                    多边形适合卡片和图片切面；圆形与椭圆更适合头像、媒体缩略图和装饰元素。
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>

        <div className="mt-8">
          <FooterNote />
        </div>
      </div>
    </div>
  )
}

function RangeControl({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-zinc-400">
          {label}
        </span>
        <div className="flex h-8 items-center rounded-lg border border-black/[0.06] bg-zinc-50 px-2">
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={Math.round(value * 10) / 10}
            onChange={(event) =>
              onChange(
                clamp(
                  Number(event.target.value),
                ),
              )
            }
            className="w-11 bg-transparent text-right font-mono text-[10px] text-zinc-600 outline-none"
          />
          <span className="ml-1 text-[9px] text-zinc-300">
            %
          </span>
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        step={0.5}
        value={value}
        onChange={(event) =>
          onChange(
            Number(event.target.value),
          )
        }
        className="mt-2 w-full accent-violet-500"
      />
    </div>
  )
}
