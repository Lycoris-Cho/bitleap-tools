'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as echarts from 'echarts'
import { read, utils } from 'xlsx'
import Papa from 'papaparse'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

type ChartType = 'bar' | 'line' | 'scatter' | 'pie' | 'radar' | 'heatmap'
type Theme = 'light' | 'dark'

interface FieldMeta {
  name: string
  sample: string
  inferredType: 'number' | 'string' | 'date'
}

const SAMPLES: Record<string, string> = {
  sales: `月份,产品A,产品B,产品C
1月,120,80,45
2月,132,92,52
3月,145,107,61
4月,162,118,73
5月,178,135,84
6月,195,148,96`,
  population: `城市,人口(万),GDP(亿元),增长率
北京,2184,40269,0.5
上海,2487,43214,0.4
广州,1867,28231,1.2
深圳,1756,32387,1.8
杭州,1219,18246,2.1
成都,2119,19916,1.5`,
  scatter: `身高,体重,组别
158,48,A
162,52,A
165,55,A
168,58,A
170,62,B
172,64,B
175,68,B
178,72,B
180,75,C
183,81,C
186,85,C
188,88,C`,
  radar: `角色,攻击,防御,速度,魔法,生命,暴击
战士,85,90,60,30,88,45
法师,40,45,55,95,50,80
刺客,92,35,98,20,45,95
坦克,55,95,40,25,98,15`,
  heatmap: `星期,时段,访问量
周一,上午,18
周一,下午,32
周一,晚上,46
周二,上午,24
周二,下午,38
周二,晚上,51
周三,上午,28
周三,下午,43
周三,晚上,58
周四,上午,21
周四,下午,36
周四,晚上,49
周五,上午,30
周五,下午,52
周五,晚上,68`,
}

const CHART_TYPES: { value: ChartType; label: string; hint: string }[] = [
  { value: 'bar', label: '柱状图', hint: '分类对比' },
  { value: 'line', label: '折线图', hint: '趋势变化' },
  { value: 'scatter', label: '散点图', hint: '相关关系' },
  { value: 'pie', label: '饼图', hint: '占比分布' },
  { value: 'radar', label: '雷达图', hint: '多维比较' },
  { value: 'heatmap', label: '热力图', hint: '二维强度' },
]

const PALETTE = ['#8b5cf6', '#0ea5e9', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#14b8a6']

function inferFieldType(values: unknown[]): FieldMeta['inferredType'] {
  const usable = values
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .slice(0, 30)

  if (usable.length === 0) return 'string'

  const numericCount = usable.filter((value) => Number.isFinite(Number(value))).length
  if (numericCount / usable.length >= 0.8) return 'number'

  const dateCount = usable.filter((value) => {
    if (/^\d{1,4}[-/.]\d{1,2}([-/.\d]*)?$/.test(value)) {
      return !Number.isNaN(Date.parse(value))
    }
    return false
  }).length

  if (dateCount / usable.length >= 0.8) return 'date'
  return 'string'
}

function detectFields(data: Record<string, unknown>[]): FieldMeta[] {
  if (data.length === 0) return []

  return Object.keys(data[0]).map((name) => {
    const values = data.map((row) => row[name])
    return {
      name,
      sample: String(values.find((value) => String(value ?? '').trim()) ?? ''),
      inferredType: inferFieldType(values),
    }
  })
}

function inferTypes(data: Record<string, unknown>[], fields: FieldMeta[]) {
  return data.map((row) => {
    const output: Record<string, unknown> = {}

    fields.forEach((field) => {
      const value = row[field.name]
      if (field.inferredType === 'number') {
        const n = Number(value)
        output[field.name] = Number.isFinite(n) ? n : 0
      } else {
        output[field.name] = value
      }
    })

    return output
  })
}

function getFileName(file: File | undefined) {
  if (!file) return ''
  return file.name.length > 30 ? `${file.name.slice(0, 26)}…` : file.name
}

export default function DataVisualizerPage() {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInst = useRef<echarts.ECharts | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [rawInput, setRawInput] = useState('')
  const [parsedData, setParsedData] = useState<Record<string, unknown>[]>([])
  const [fields, setFields] = useState<FieldMeta[]>([])
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')

  const [chartType, setChartType] = useState<ChartType>('bar')
  const [xField, setXField] = useState('')
  const [yFields, setYFields] = useState<string[]>([])
  const [groupField, setGroupField] = useState('')
  const [title, setTitle] = useState('数据可视化')
  const [theme, setTheme] = useState<Theme>('light')
  const [stacked, setStacked] = useState(false)
  const [showLegend, setShowLegend] = useState(true)
  const [smoothLine, setSmoothLine] = useState(true)
  const [copied, setCopied] = useState(false)

  const numberFields = useMemo(
    () => fields.filter((field) => field.inferredType === 'number'),
    [fields],
  )

  const allNumberFieldNames = useMemo(
    () => numberFields.map((field) => field.name),
    [numberFields],
  )

  const isAllYSelected =
    allNumberFieldNames.length > 0 &&
    yFields.length === allNumberFieldNames.length &&
    allNumberFieldNames.every((name) => yFields.includes(name))

  const isRadar = chartType === 'radar'

  const processParsedData = useCallback((data: Record<string, unknown>[]) => {
    const clean = data.filter((row) =>
      Object.values(row).some((value) => String(value ?? '').trim() !== ''),
    )

    if (clean.length === 0) {
      setError('没有发现有效数据')
      return
    }

    const detected = detectFields(clean)
    const typed = inferTypes(clean, detected)
    const numeric = detected.filter((field) => field.inferredType === 'number')

    setFields(detected)
    setParsedData(typed)
    setXField(detected[0]?.name || '')
    setYFields(numeric.slice(0, 3).map((field) => field.name))
    setGroupField('')
    setError('')
  }, [])

  const parseCSVFile = useCallback((file: File) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      const text = event.target?.result as string
      const result = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
      })

      if (result.errors.length > 0) {
        setError(`CSV 解析错误：${result.errors[0].message}`)
        return
      }

      processParsedData(result.data as Record<string, unknown>[])
    }

    reader.onerror = () => setError('CSV 文件读取失败')
    reader.readAsText(file)
  }, [processParsedData])

  const parseExcelFile = useCallback((file: File) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer)
        const workbook = read(data, { type: 'array' })
        const firstSheet = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheet]
        const rows = utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' })
        processParsedData(rows)
      } catch (err) {
        setError(`Excel 解析失败：${(err as Error).message}`)
      }
    }

    reader.onerror = () => setError('Excel 文件读取失败')
    reader.readAsArrayBuffer(file)
  }, [processParsedData])

  const handleFileSelect = useCallback((file: File | undefined) => {
    if (!file) return

    setFileName(getFileName(file))
    const name = file.name.toLowerCase()

    if (name.endsWith('.csv')) {
      parseCSVFile(file)
      return
    }

    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      parseExcelFile(file)
      return
    }

    setError('不支持该文件格式，请上传 .csv / .xlsx / .xls')
  }, [parseCSVFile, parseExcelFile])

  const parseInput = () => {
    setError('')
    const trimmed = rawInput.trim()

    if (!trimmed) {
      setError('请先粘贴 CSV 或 JSON 数据')
      return
    }

    try {
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        const parsed = JSON.parse(trimmed)
        const rows = Array.isArray(parsed) ? parsed : [parsed]

        if (!rows.every((row) => row && typeof row === 'object' && !Array.isArray(row))) {
          setError('JSON 必须是对象数组，或单个对象')
          return
        }

        processParsedData(rows as Record<string, unknown>[])
        return
      }

      const result = Papa.parse<Record<string, string>>(trimmed, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
      })

      if (result.errors.length > 0) {
        setError(`CSV 解析错误：${result.errors[0].message}`)
        return
      }

      processParsedData(result.data as Record<string, unknown>[])
    } catch (err) {
      setError(`解析失败：${(err as Error).message}`)
    }
  }

  const toggleYField = (fieldName: string) => {
    setYFields((current) =>
      current.includes(fieldName)
        ? current.filter((field) => field !== fieldName)
        : [...current, fieldName],
    )
  }

  const toggleAllYFields = () => {
    setYFields(isAllYSelected ? [] : allNumberFieldNames)
  }

  const chartOption = useMemo<echarts.EChartsOption | null>(() => {
    if (parsedData.length === 0 || !xField || yFields.length === 0) return null

    const isDark = theme === 'dark'
    const textColor = isDark ? '#d4d4d8' : '#52525b'
    const subtleColor = isDark ? '#52525b' : '#e4e4e7'
    const categories = parsedData.map((row) => String(row[xField] ?? ''))

    const commonTitle: echarts.TitleComponentOption = {
      text: title || '数据可视化',
      left: 22,
      top: 18,
      textStyle: {
        fontSize: 16,
        fontWeight: 600,
        color: isDark ? '#fafafa' : '#18181b',
      },
    }

    if (chartType === 'pie') {
      const y = yFields[0]
      const data = categories.map((category, index) => ({
        name: category,
        value: Number(parsedData[index]?.[y] ?? 0),
      }))

      return {
        backgroundColor: 'transparent',
        title: commonTitle,
        color: PALETTE,
        tooltip: { trigger: 'item', formatter: '{b}<br/>{c} · {d}%' },
        legend: showLegend
          ? { bottom: 8, type: 'scroll', textStyle: { color: textColor } }
          : undefined,
        series: [
          {
            name: y,
            type: 'pie',
            radius: ['34%', '66%'],
            center: ['50%', '52%'],
            avoidLabelOverlap: true,
            padAngle: 2,
            itemStyle: {
              borderRadius: 8,
              borderColor: isDark ? '#18181b' : '#fff',
              borderWidth: 2,
            },
            label: { color: textColor },
            data,
          },
        ],
      }
    }

    if (chartType === 'radar') {
      const indicator = yFields.map((y) => ({
        name: y,
        max:
          Math.max(
            1,
            ...parsedData.map((row) => Number(row[y] ?? 0)),
          ) * 1.15,
      }))

      return {
        backgroundColor: 'transparent',
        title: commonTitle,
        color: PALETTE,
        tooltip: {},
        legend: showLegend
          ? { bottom: 8, type: 'scroll', textStyle: { color: textColor } }
          : undefined,
        radar: {
          indicator,
          shape: 'polygon',
          center: ['50%', '54%'],
          radius: '62%',
          axisName: { color: textColor },
          splitLine: { lineStyle: { color: subtleColor } },
          splitArea: { areaStyle: { color: isDark ? ['#18181b', '#1f1f23'] : ['#fff', '#fafafa'] } },
          axisLine: { lineStyle: { color: subtleColor } },
        },
        series: [
          {
            type: 'radar',
            data: parsedData.map((row, index) => ({
              name: String(row[xField] ?? `系列 ${index + 1}`),
              value: yFields.map((y) => Number(row[y] ?? 0)),
              areaStyle: { opacity: 0.08 },
            })),
          },
        ],
      }
    }

    if (chartType === 'heatmap') {
      const y = yFields[0]
      const xValues = [...new Set(categories)]
      const groupValues = groupField
        ? [...new Set(parsedData.map((row) => String(row[groupField] ?? '')))]
        : ['值']

      const data: [number, number, number][] = parsedData.map((row) => [
        xValues.indexOf(String(row[xField] ?? '')),
        groupField ? groupValues.indexOf(String(row[groupField] ?? '')) : 0,
        Number(row[y] ?? 0),
      ])

      const values = data.map((item) => item[2])
      const max = Math.max(1, ...values)
      const min = Math.min(0, ...values)

      return {
        backgroundColor: 'transparent',
        title: commonTitle,
        tooltip: {
          position: 'top',
          formatter: (params: unknown) => {
            const p = params as { value?: [number, number, number] }
            const value = p.value
            if (!value) return ''
            return `${xValues[value[0]]}<br/>${groupValues[value[1]]}：${value[2]}`
          },
        },
        grid: { top: 70, bottom: 72, left: 84, right: 24 },
        xAxis: {
          type: 'category',
          data: xValues,
          axisLabel: { color: textColor },
          axisLine: { lineStyle: { color: subtleColor } },
          splitArea: { show: true },
        },
        yAxis: {
          type: 'category',
          data: groupValues,
          axisLabel: { color: textColor },
          axisLine: { lineStyle: { color: subtleColor } },
          splitArea: { show: true },
        },
        visualMap: {
          min,
          max,
          calculable: true,
          orient: 'horizontal',
          left: 'center',
          bottom: 10,
          textStyle: { color: textColor },
          inRange: { color: ['#ede9fe', '#8b5cf6', '#4c1d95'] },
        },
        series: [
          {
            type: 'heatmap',
            data,
            label: { show: data.length <= 80, fontSize: 10 },
            itemStyle: { borderRadius: 4, borderColor: isDark ? '#18181b' : '#fff', borderWidth: 2 },
          },
        ],
      }
    }

    if (chartType === 'scatter') {
      const xMeta = fields.find((field) => field.name === xField)
      const xIsNumber = xMeta?.inferredType === 'number'
      const groupValues =
        groupField
          ? [...new Set(parsedData.map((row) => String(row[groupField] ?? '未分组')))]
          : ['全部']

      const series: echarts.ScatterSeriesOption[] = groupValues.flatMap((group, groupIndex) =>
        yFields.map((y) => ({
          name: groupField ? `${group} · ${y}` : y,
          type: 'scatter',
          symbolSize: 10,
          itemStyle: { color: PALETTE[(groupIndex + yFields.indexOf(y)) % PALETTE.length] },
          data: parsedData
            .filter((row) => !groupField || String(row[groupField] ?? '未分组') === group)
            .map((row) => [
              xIsNumber ? Number(row[xField] ?? 0) : String(row[xField] ?? ''),
              Number(row[y] ?? 0),
            ]),
        })),
      )

      return {
        backgroundColor: 'transparent',
        title: commonTitle,
        color: PALETTE,
        tooltip: { trigger: 'item' },
        legend: showLegend ? { bottom: 8, type: 'scroll', textStyle: { color: textColor } } : undefined,
        grid: { top: 70, bottom: 62, left: 64, right: 24 },
        xAxis: {
          type: xIsNumber ? 'value' : 'category',
          data: xIsNumber ? undefined : categories,
          name: xField,
          nameLocation: 'middle',
          nameGap: 34,
          axisLabel: { color: textColor },
          axisLine: { lineStyle: { color: subtleColor } },
          splitLine: { lineStyle: { color: subtleColor } },
        },
        yAxis: {
          type: 'value',
          axisLabel: { color: textColor },
          axisLine: { lineStyle: { color: subtleColor } },
          splitLine: { lineStyle: { color: subtleColor } },
        },
        series,
      }
    }

    const series: echarts.SeriesOption[] = yFields.map((y, index) => {
      const values = parsedData.map((row) => Number(row[y] ?? 0))

      if (chartType === 'bar') {
        return {
          name: y,
          type: 'bar',
          data: values,
          stack: stacked ? 'total' : undefined,
          barMaxWidth: 42,
          itemStyle: {
            color: PALETTE[index % PALETTE.length],
            borderRadius: [7, 7, 2, 2],
          },
          emphasis: { focus: 'series' },
        } satisfies echarts.BarSeriesOption
      }

      return {
        name: y,
        type: 'line',
        data: values,
        stack: stacked ? 'total' : undefined,
        smooth: smoothLine,
        showSymbol: values.length <= 20,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2.5 },
        itemStyle: { color: PALETTE[index % PALETTE.length] },
        areaStyle: stacked ? { opacity: 0.08 } : undefined,
        emphasis: { focus: 'series' },
      } satisfies echarts.LineSeriesOption
    })

    return {
      backgroundColor: 'transparent',
      title: commonTitle,
      color: PALETTE,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: chartType === 'line' ? 'cross' : 'shadow' },
      },
      legend: showLegend
        ? { bottom: 8, type: 'scroll', textStyle: { color: textColor } }
        : undefined,
      grid: { top: 70, bottom: 62, left: 64, right: 24 },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: { color: textColor, rotate: categories.length > 10 ? 30 : 0 },
        axisLine: { lineStyle: { color: subtleColor } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: textColor },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: subtleColor } },
      },
      series,
    }
  }, [
    parsedData,
    fields,
    xField,
    yFields,
    groupField,
    chartType,
    title,
    theme,
    stacked,
    showLegend,
    smoothLine,
  ])

  useEffect(() => {
    if (!chartRef.current) return

    chartInst.current?.dispose()
    chartInst.current = echarts.init(chartRef.current, theme)

    const observer = new ResizeObserver(() => {
      chartInst.current?.resize()
    })

    observer.observe(chartRef.current)

    return () => {
      observer.disconnect()
      chartInst.current?.dispose()
      chartInst.current = null
    }
  }, [theme])

  useEffect(() => {
    if (!chartInst.current) return

    if (!chartOption) {
      chartInst.current.clear()
      return
    }

    chartInst.current.setOption(chartOption, true)
  }, [chartOption])

  const downloadPNG = () => {
    if (!chartInst.current || !chartOption) return

    const url = chartInst.current.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff',
    })

    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${title.trim() || 'chart'}.png`
    anchor.click()
  }

  const copyOption = async () => {
    if (!chartOption) return

    await navigator.clipboard.writeText(JSON.stringify(chartOption, null, 2))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  const loadSample = (key: string) => {
    setRawInput(SAMPLES[key])
    setError('')
  }

  const clearAll = () => {
    setRawInput('')
    setParsedData([])
    setFields([])
    setError('')
    setFileName('')
    setXField('')
    setYFields([])
    setGroupField('')

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const selectClass =
    'h-10 w-full rounded-xl border border-black/[0.07] bg-white px-3 text-sm text-zinc-700 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100/60'

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f7f7f9] text-zinc-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_8%,rgba(237,233,254,.72),transparent_24%),radial-gradient(circle_at_90%_14%,rgba(224,242,254,.66),transparent_26%),linear-gradient(180deg,#fafafd_0%,#f7f7f9_50%,#fafafa_100%)]" />

      <div className="relative mx-auto w-full max-w-[1560px] px-4 pb-12 pt-6 sm:px-5 lg:px-6 xl:px-8">
        <Breadcrumb />

        <header className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[9px] uppercase tracking-[0.24em] text-violet-500">
              Data workspace
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.055em] text-zinc-950 sm:text-4xl">
              数据可视化沙盒
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              上传 CSV / Excel，或粘贴 CSV / JSON。字段识别、图表配置、预览与导出全部在浏览器本地完成。
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="rounded-full border border-black/[0.06] bg-white/75 px-3 py-2 text-[10px] text-zinc-500 backdrop-blur-md">
              {parsedData.length ? `${parsedData.length} 行` : '0 行'}
            </div>
            <div className="rounded-full border border-black/[0.06] bg-white/75 px-3 py-2 text-[10px] text-zinc-500 backdrop-blur-md">
              {fields.length ? `${fields.length} 字段` : '0 字段'}
            </div>
            <div className="rounded-full border border-black/[0.06] bg-white/75 px-3 py-2 text-[10px] text-zinc-500 backdrop-blur-md">
              本地处理
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
            <section className="rounded-[24px] border border-black/[0.06] bg-white/82 p-4 shadow-[0_24px_70px_-58px_rgba(67,56,202,.22)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-300">01 / Data</div>
                  <h2 className="mt-1 text-sm font-semibold text-zinc-800">数据输入</h2>
                </div>

                <div className="flex flex-wrap justify-end gap-1.5">
                  {[
                    ['sales', '销售'],
                    ['population', '城市'],
                    ['scatter', '散点'],
                    ['radar', '雷达'],
                    ['heatmap', '热力'],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => loadSample(key)}
                      className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-medium text-violet-600 transition hover:bg-violet-100"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div
                onDrop={(event) => {
                  event.preventDefault()
                  setDragOver(false)
                  handleFileSelect(event.dataTransfer.files[0])
                }}
                onDragOver={(event) => {
                  event.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`mt-4 cursor-pointer rounded-[18px] border border-dashed px-4 py-5 text-center transition ${
                  dragOver
                    ? 'border-violet-400 bg-violet-50'
                    : 'border-black/[0.10] bg-zinc-50/70 hover:border-violet-200 hover:bg-violet-50/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(event) => handleFileSelect(event.target.files?.[0])}
                  className="hidden"
                />
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.05] bg-white text-lg shadow-sm">
                  ↥
                </div>
                <div className="mt-2 text-xs font-medium text-zinc-700">
                  点击上传或拖拽文件
                </div>
                <div className="mt-1 text-[10px] text-zinc-400">
                  CSV / XLSX / XLS
                </div>
                {fileName && (
                  <div className="mt-2 truncate text-[10px] font-medium text-violet-500">
                    {fileName}
                  </div>
                )}
              </div>

              <div className="my-3 flex items-center gap-3">
                <span className="h-px flex-1 bg-black/[0.06]" />
                <span className="text-[9px] uppercase tracking-[0.18em] text-zinc-300">or paste</span>
                <span className="h-px flex-1 bg-black/[0.06]" />
              </div>

              <textarea
                value={rawInput}
                onChange={(event) => setRawInput(event.target.value)}
                placeholder="粘贴 CSV 或 JSON 数组…"
                className="h-28 w-full resize-none rounded-[15px] border border-black/[0.07] bg-[#fafafa] px-3 py-3 font-mono text-[11px] leading-5 text-zinc-700 outline-none transition placeholder:text-zinc-300 focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100/60"
                spellCheck={false}
              />

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={parseInput}
                  className="h-10 flex-1 rounded-xl bg-zinc-950 text-xs font-semibold text-white transition hover:bg-violet-600"
                >
                  解析数据
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  className="h-10 rounded-xl border border-black/[0.07] bg-white px-3 text-xs text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-800"
                >
                  清空
                </button>
              </div>

              {error && (
                <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-[11px] leading-5 text-red-600">
                  {error}
                </div>
              )}

              {parsedData.length > 0 && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-[11px] font-medium text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  已解析 {parsedData.length} 行 × {fields.length} 列
                </div>
              )}
            </section>

            {fields.length > 0 && (
              <section className="rounded-[24px] border border-black/[0.06] bg-white/82 p-4 shadow-[0_24px_70px_-58px_rgba(67,56,202,.18)] backdrop-blur-xl">
                <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-300">02 / Mapping</div>
                <h2 className="mt-1 text-sm font-semibold text-zinc-800">字段映射</h2>

                <label className="mt-4 block">
                  <span className="mb-1.5 block text-[10px] text-zinc-400">X 轴</span>
                  <select value={xField} onChange={(event) => setXField(event.target.value)} className={selectClass}>
                    {fields.map((field) => (
                      <option key={field.name} value={field.name}>
                        {field.name} · {field.inferredType}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <span className="text-[10px] text-zinc-400">
                      Y 轴
                      {isRadar && <span className="ml-1 text-violet-500">雷达图建议 ≥ 3</span>}
                    </span>
                    <button
                      type="button"
                      onClick={toggleAllYFields}
                      className="text-[10px] font-medium text-violet-600 hover:text-violet-800"
                    >
                      {isAllYSelected ? '取消全选' : '全选'}
                    </button>
                  </div>

                  <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-black/[0.07] bg-[#fafafa] p-1.5">
                    {numberFields.length === 0 ? (
                      <div className="px-2 py-3 text-center text-[10px] text-zinc-400">
                        没有识别到数值字段
                      </div>
                    ) : (
                      numberFields.map((field) => (
                        <label
                          key={field.name}
                          className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-violet-50"
                        >
                          <input
                            type="checkbox"
                            checked={yFields.includes(field.name)}
                            onChange={() => toggleYField(field.name)}
                            className="h-4 w-4 accent-violet-500"
                          />
                          <span className="min-w-0 flex-1 truncate text-xs text-zinc-700">
                            {field.name}
                          </span>
                          <span className="font-mono text-[9px] text-zinc-300">
                            {field.sample}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <label className="mt-4 block">
                  <span className="mb-1.5 block text-[10px] text-zinc-400">分组字段</span>
                  <select value={groupField} onChange={(event) => setGroupField(event.target.value)} className={selectClass}>
                    <option value="">无分组</option>
                    {fields.map((field) => (
                      <option key={field.name} value={field.name}>
                        {field.name}
                      </option>
                    ))}
                  </select>
                </label>
              </section>
            )}

            <section className="rounded-[24px] border border-black/[0.06] bg-white/82 p-4 shadow-[0_24px_70px_-58px_rgba(67,56,202,.18)] backdrop-blur-xl">
              <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-300">03 / Chart</div>
              <h2 className="mt-1 text-sm font-semibold text-zinc-800">图表配置</h2>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {CHART_TYPES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setChartType(item.value)}
                    className={`rounded-xl border px-2 py-2.5 text-left transition ${
                      chartType === item.value
                        ? 'border-violet-300 bg-violet-50 text-violet-700'
                        : 'border-black/[0.06] bg-white text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    <div className="text-[11px] font-semibold">{item.label}</div>
                    <div className="mt-0.5 text-[9px] opacity-55">{item.hint}</div>
                  </button>
                ))}
              </div>

              <label className="mt-4 block">
                <span className="mb-1.5 block text-[10px] text-zinc-400">标题</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="h-10 w-full rounded-xl border border-black/[0.07] bg-white px-3 text-sm text-zinc-700 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100/60"
                />
              </label>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-black/[0.06] bg-[#fafafa] px-3 py-2.5 text-xs text-zinc-600">
                  图例
                  <input type="checkbox" checked={showLegend} onChange={(event) => setShowLegend(event.target.checked)} className="h-4 w-4 accent-violet-500" />
                </label>

                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-black/[0.06] bg-[#fafafa] px-3 py-2.5 text-xs text-zinc-600">
                  堆叠
                  <input type="checkbox" checked={stacked} onChange={(event) => setStacked(event.target.checked)} className="h-4 w-4 accent-violet-500" />
                </label>

                {chartType === 'line' && (
                  <label className="flex cursor-pointer items-center justify-between rounded-xl border border-black/[0.06] bg-[#fafafa] px-3 py-2.5 text-xs text-zinc-600">
                    平滑
                    <input type="checkbox" checked={smoothLine} onChange={(event) => setSmoothLine(event.target.checked)} className="h-4 w-4 accent-violet-500" />
                  </label>
                )}

                <button
                  type="button"
                  onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}
                  className="flex items-center justify-between rounded-xl border border-black/[0.06] bg-[#fafafa] px-3 py-2.5 text-xs text-zinc-600 transition hover:bg-white"
                >
                  <span>主题</span>
                  <span>{theme === 'light' ? '浅色' : '深色'}</span>
                </button>
              </div>
            </section>
          </aside>

          <section className="min-w-0 space-y-4">
            <div className="overflow-hidden rounded-[28px] border border-black/[0.06] bg-white/86 shadow-[0_30px_90px_-68px_rgba(30,41,59,.24)] backdrop-blur-xl">
              <div className="flex flex-col gap-3 border-b border-black/[0.055] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-300">Preview</div>
                  <h2 className="mt-1 text-sm font-semibold text-zinc-800">图表预览</h2>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!chartOption}
                    onClick={copyOption}
                    className="h-9 rounded-full border border-black/[0.07] bg-white px-3.5 text-[10px] font-medium text-zinc-600 transition hover:border-violet-200 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    {copied ? '✓ 已复制' : '复制 ECharts option'}
                  </button>
                  <button
                    type="button"
                    disabled={!chartOption}
                    onClick={downloadPNG}
                    className="h-9 rounded-full bg-zinc-950 px-3.5 text-[10px] font-semibold text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    下载 PNG
                  </button>
                </div>
              </div>

              <div className={`relative min-h-[560px] ${theme === 'dark' ? 'bg-[#18181b]' : 'bg-white'}`}>
                {!chartOption && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center px-6 text-center">
                    <div>
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-violet-100 bg-violet-50 text-2xl">
                        ◫
                      </div>
                      <div className="mt-4 text-sm font-medium text-zinc-600">
                        先给我一份数据
                      </div>
                      <div className="mt-2 text-xs leading-6 text-zinc-400">
                        上传文件、拖入 Excel，或从左侧加载一份示例数据。
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chartRef} className="h-[560px] w-full" />
              </div>
            </div>

            {parsedData.length > 0 && (
              <div className="overflow-hidden rounded-[24px] border border-black/[0.06] bg-white/82 shadow-[0_24px_70px_-60px_rgba(30,41,59,.20)] backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-black/[0.05] px-4 py-3.5">
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-300">Raw data</div>
                    <h3 className="mt-1 text-sm font-semibold text-zinc-800">数据预览</h3>
                  </div>
                  <span className="font-mono text-[9px] text-zinc-300">前 10 行</span>
                </div>

                <div className="max-h-[300px] overflow-auto">
                  <table className="w-full min-w-max text-left text-xs">
                    <thead className="sticky top-0 bg-[#fafafa]/95 backdrop-blur">
                      <tr className="border-b border-black/[0.05]">
                        {fields.map((field) => (
                          <th key={field.name} className="px-4 py-2.5 font-medium text-zinc-500">
                            <div>{field.name}</div>
                            <div className="mt-0.5 font-mono text-[8px] font-normal uppercase tracking-[0.12em] text-zinc-300">
                              {field.inferredType}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.slice(0, 10).map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-b border-black/[0.04] last:border-0 hover:bg-violet-50/30">
                          {fields.map((field) => (
                            <td key={field.name} className="max-w-[260px] truncate px-4 py-2.5 font-mono text-[11px] text-zinc-600">
                              {String(row[field.name] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[20px] border border-black/[0.055] bg-white/68 p-4 backdrop-blur-md">
                <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-300">Privacy</div>
                <div className="mt-2 text-sm font-semibold text-zinc-700">本地处理</div>
                <p className="mt-1 text-[11px] leading-5 text-zinc-400">文件不会上传服务器。</p>
              </div>
              <div className="rounded-[20px] border border-black/[0.055] bg-white/68 p-4 backdrop-blur-md">
                <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-300">Input</div>
                <div className="mt-2 text-sm font-semibold text-zinc-700">CSV / Excel / JSON</div>
                <p className="mt-1 text-[11px] leading-5 text-zinc-400">支持上传、拖拽与粘贴。</p>
              </div>
              <div className="rounded-[20px] border border-black/[0.055] bg-white/68 p-4 backdrop-blur-md">
                <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-300">Export</div>
                <div className="mt-2 text-sm font-semibold text-zinc-700">PNG / Option</div>
                <p className="mt-1 text-[11px] leading-5 text-zinc-400">快速带走图表与配置。</p>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-8">
          <FooterNote />
        </div>
      </div>
    </div>
  )
}
