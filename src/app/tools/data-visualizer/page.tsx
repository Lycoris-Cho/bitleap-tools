'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import * as echarts from 'echarts'
import { read, utils } from 'xlsx'
import Papa from 'papaparse'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

/* ─── 类型 ─── */
type ChartType = 'bar' | 'line' | 'scatter' | 'pie' | 'radar' | 'heatmap'
type Theme = 'light' | 'dark'
type FileType = 'csv' | 'excel'

interface FieldMeta {
  name: string
  sample: string
  inferredType: 'number' | 'string' | 'date'
}

/* ─── 示例数据（保持不变）─── */
const SAMPLES: Record<string, string> = {
  sales: `月份,产品A,产品B,产品C\n1月,120,80,45\n2月,132,92,52\n3月,145,107,61\n4月,162,118,73\n5月,178,135,84\n6月,195,148,96`,
  population: `城市,人口(万),GDP(亿元),增长率\n北京,2184,40269,0.5\n上海,2487,43214,0.4\n广州,1867,28231,1.2\n深圳,1756,32387,1.8\n杭州,1219,18246,2.1\n成都,2119,19916,1.5`,
  scatter: (() => {
    const rows = ['x,y,group']
    for (let i = 0; i < 30; i++) {
      const g = i % 3
      rows.push(`${(Math.random() * 100).toFixed(1)},${(Math.random() * 100).toFixed(1)},组别${g + 1}`)
    }
    return rows.join('\n')
  })(),
}

/* ─── 工具函数（保持不变）─── */
function detectFields(data: Record<string, unknown>[]): FieldMeta[] {
  if (data.length === 0) return []
  const keys = Object.keys(data[0])
  return keys.map((k) => {
    const sample = String(data[0][k] ?? '')
    let inferredType: FieldMeta['inferredType'] = 'string'
    if (!isNaN(Number(sample)) && sample.trim() !== '') inferredType = 'number'
    else if (!isNaN(Date.parse(sample))) inferredType = 'date'
    return { name: k, sample, inferredType }
  })
}

function inferTypes(data: Record<string, unknown>[], fields: FieldMeta[]) {
  return data.map((row) => {
    const out: Record<string, unknown> = {}
    fields.forEach((f) => {
      if (f.inferredType === 'number') out[f.name] = Number(row[f.name]) || 0
      else out[f.name] = row[f.name]
    })
    return out
  })
}

/* ─── 主组件 ─── */
export default function DataVisualizerPage() {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInst = useRef<echarts.ECharts | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const [rawInput, setRawInput] = useState('')
  const [parsedData, setParsedData] = useState<Record<string, unknown>[]>([])
  const [fields, setFields] = useState<FieldMeta[]>([])
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const [chartType, setChartType] = useState<ChartType>('bar')
  const [xField, setXField] = useState('')
  const [yFields, setYFields] = useState<string[]>([])
  const [groupField, setGroupField] = useState('')
  const [title, setTitle] = useState('数据可视化')
  const [theme, setTheme] = useState<Theme>('light')
  const [stacked, setStacked] = useState(false)
  const [showLegend, setShowLegend] = useState(true)
  const [copied, setCopied] = useState(false)

  /* ─── ✅ 新增：处理解析后的数据（CSV 和 Excel 共用） ─── */
  const processParsedData = (data: Record<string, unknown>[]) => {
    if (data.length === 0) { setError('文件无有效数据'); return }
    const f = detectFields(data)
    setFields(f)
    setParsedData(inferTypes(data, f))
    setXField(f[0]?.name || '')
    setYFields(f.length > 1 ? [f[1].name] : [])
    setGroupField('')
    setError('')
  }

  /* ─── ✅ 新增：解析 CSV 文件 ─── */
  const parseCSVFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true })
      if (result.errors.length > 0) {
        setError(`CSV 解析错误: ${result.errors[0].message}`)
        return
      }
      processParsedData(result.data as Record<string, unknown>[])
    }
    reader.readAsText(file)
  }

  /* ─── ✅ 新增：解析 Excel 文件 ─── */
  const parseExcelFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0] // 取第一个 sheet
        const worksheet = workbook.Sheets[sheetName]
        const jsonData: Record<string, unknown>[] = utils.sheet_to_json(worksheet, { defval: '' })
        processParsedData(jsonData)
      } catch (err) {
        setError(`Excel 解析失败: ${(err as Error).message}`)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  /* ─── ✅ 新增：文件选择处理 ─── */
  const handleFileSelect = (file: File | undefined) => {
    if (!file) return
    const name = file.name.toLowerCase()
    if (name.endsWith('.csv')) {
      parseCSVFile(file)
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      parseExcelFile(file)
    } else {
      setError('不支持的文件格式，请上传 .csv / .xlsx / .xls 文件')
    }
  }

  /* ─── ✅ 新增：拖拽处理 ─── */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    handleFileSelect(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  /* ─── 原有的文本解析（小改：复用 processParsedData） ─── */
  const parseInput = () => {
    setError('')
    const trimmed = rawInput.trim()
    if (!trimmed) { setError('请输入数据'); return }
    try {
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        const json = JSON.parse(trimmed)
        const arr = Array.isArray(json) ? json : [json]
        processParsedData(arr)
        return
      }
      const result = Papa.parse<Record<string, string>>(trimmed, { header: true, skipEmptyLines: true })
      if (result.errors.length > 0) { setError(`CSV 解析错误: ${result.errors[0].message}`); return }
      processParsedData(result.data as Record<string, unknown>[])
    } catch (e) {
      setError(`解析失败: ${(e as Error).message}`)
    }
  }

  /* ─── ECharts option / renderChart / 导出（完全不变，省略保持简洁） ─── */
  const option = ((): echarts.EChartsOption | null => {
    if (parsedData.length === 0 || !xField || yFields.length === 0) return null
    const categories = parsedData.map((r) => String(r[xField]))
    const palette = ['#8b5cf6', '#22d3ee', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1']

    if (chartType === 'pie') {
      const pieData = categories.map((cat, i) => ({ name: cat, value: Number(parsedData[i][yFields[0]] ?? 0) }))
      return {
        title: { text: title, left: 'center' },
        tooltip: { trigger: 'item' as const, formatter: '{b}: {c} ({d}%)' },
        legend: showLegend ? { bottom: 0 } : undefined,
        series: [{ type: 'pie', radius: '55%', center: ['50%', '50%'], data: pieData, itemStyle: { borderRadius: 6, borderColor: theme === 'dark' ? '#1e1e2e' : '#fff', borderWidth: 2 } }],
      }
    }
    if (chartType === 'radar') {
      const indicator = yFields.map((y) => ({ name: y, max: Math.max(...parsedData.map((r) => Number(r[y] ?? 0))) * 1.2 }))
      const seriesData = groupField
        ? [...new Set(parsedData.map((r) => String(r[groupField])))].map((g, gi) => ({
            name: g, value: yFields.map((y) => { const row = parsedData.find((r) => String(r[groupField]) === g); return Number(row?.[y] ?? 0) }),
            lineStyle: { color: palette[gi % palette.length] }, itemStyle: { color: palette[gi % palette.length] },
          }))
        : [{ name: title, value: yFields.map((y) => Number(parsedData[0]?.[y] ?? 0)), lineStyle: { color: palette[0] }, itemStyle: { color: palette[0] } }]
      return { title: { text: title, left: 'center' }, tooltip: {}, legend: showLegend ? { bottom: 0 } : undefined, radar: { indicator, shape: 'circle' as const }, series: [{ type: 'radar', data: seriesData }] }
    }
    if (chartType === 'heatmap') {
      const yField = yFields[0], xVals = [...new Set(categories)], groupVals = groupField ? [...new Set(parsedData.map((r) => String(r[groupField])))] : ['value']
      const heatData: [number, number, number][] = []
      parsedData.forEach((row) => { heatData.push([xVals.indexOf(String(row[xField])), groupField ? groupVals.indexOf(String(row[groupField])) : 0, Number(row[yField] ?? 0)]) })
      return {
        title: { text: title, left: 'center' }, tooltip: { position: 'top' as const }, grid: { top: 60, bottom: 60, left: 120 },
        xAxis: { type: 'category' as const, data: xVals, splitArea: { show: true } }, yAxis: { type: 'category' as const, data: groupVals, splitArea: { show: true } },
        visualMap: { min: 0, max: Math.max(...heatData.map((d) => d[2])), calculable: true, orient: 'horizontal' as const, left: 'center', bottom: 0 },
        series: [{ type: 'heatmap', data: heatData, label: { show: true, fontSize: 10 }, itemStyle: { borderRadius: 2 } }],
      }
    }
    const series: echarts.SeriesOption[] = yFields.map((y, i): echarts.SeriesOption => {
      const baseData = parsedData.map((r) => r[y])
      if (chartType === 'bar') { const s: echarts.BarSeriesOption = { name: y, type: 'bar', data: baseData as echarts.BarSeriesOption['data'], itemStyle: { color: palette[i % palette.length], borderRadius: [4, 4, 0, 0] } }; if (stacked) s.stack = 'total'; return s }
      if (chartType === 'line') { const s: echarts.LineSeriesOption = { name: y, type: 'line', data: baseData as echarts.LineSeriesOption['data'], itemStyle: { color: palette[i % palette.length] }, symbol: 'circle', symbolSize: 6 }; if (stacked) { s.stack = 'total'; s.areaStyle = { opacity: 0.15 } }; return s }
      const s: echarts.ScatterSeriesOption = { name: y, type: 'scatter', data: baseData as echarts.ScatterSeriesOption['data'], itemStyle: { color: palette[i % palette.length] }, symbol: 'circle', symbolSize: 10 }
      return s
    })
    return {
      title: { text: title, left: 'center' }, tooltip: { trigger: 'axis' as const, axisPointer: { type: chartType === 'line' ? 'cross' : 'shadow' } },
      legend: showLegend ? { bottom: 0 } : undefined, grid: { top: 60, bottom: 60, left: 60, right: 20 },
      xAxis: { type: 'category' as const, data: categories, axisLabel: { rotate: categories.length > 8 ? 30 : 0 } }, yAxis: { type: 'value' as const }, series,
    }
  })()

  const renderChart = useCallback(() => {
    if (!chartRef.current || !option) return
    if (!chartInst.current) { chartInst.current = echarts.init(chartRef.current, theme) }
    else { chartInst.current.dispose(); chartInst.current = echarts.init(chartRef.current, theme) }
    chartInst.current.setOption(option, true)
  }, [option, theme])

  useEffect(() => { renderChart() }, [renderChart])
  useEffect(() => { return () => { chartInst.current?.dispose() } }, [])

  const downloadPNG = () => {
    if (!chartInst.current) return
    const url = chartInst.current.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: theme === 'dark' ? '#1e1e2e' : '#fff' })
    const a = document.createElement('a'); a.href = url; a.download = `${title || 'chart'}.png`; a.click()
  }

  const copyOption = async () => {
    if (!option) return
    await navigator.clipboard.writeText(JSON.stringify(option, null, 2))
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  const loadSample = (key: string) => { setRawInput(SAMPLES[key]); setError('') }

  const clearAll = () => {
    setRawInput(''); setParsedData([]); setFields([]); setError('')
    setXField(''); setYFields([]); setGroupField('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const numberFields = fields.filter((f) => f.inferredType === 'number')
  const allFields = fields.map((f) => f.name)

  return (
    <div className="max-w-[1400px] mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">数据可视化沙盒</h1>
        <p className="text-app-muted text-sm">上传 CSV / Excel 文件或粘贴数据，选择图表类型，实时预览并导出 PNG / ECharts 配置</p>
      </div>

      <div className="grid lg:grid-cols-[400px_1fr] gap-6">
        {/* ─── 左：数据输入 + 配置 ─── */}
        <div className="space-y-4">
          {/* ✅ 数据输入区（新增文件上传 + 拖拽） */}
          <div className="border border-app-border rounded-2xl p-4 bg-app-bg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">数据输入</span>
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={() => loadSample('sales')} className="px-2.5 py-1 text-xs bg-violet-50 text-violet-600 rounded-lg hover:bg-violet-100 transition">销售</button>
                <button onClick={() => loadSample('population')} className="px-2.5 py-1 text-xs bg-violet-50 text-violet-600 rounded-lg hover:bg-violet-100 transition">人口</button>
                <button onClick={() => loadSample('scatter')} className="px-2.5 py-1 text-xs bg-violet-50 text-violet-600 rounded-lg hover:bg-violet-100 transition">散点</button>
              </div>
            </div>

            {/* ✅ 拖拽上传区 */}
            <div
              ref={dropRef}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer ${
                dragOver ? 'border-violet-500 bg-violet-50' : 'border-gray-300 hover:border-violet-300 hover:bg-gray-50'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => handleFileSelect(e.target.files?.[0])}
                className="hidden"
              />
              <div className="text-2xl mb-1">📂</div>
              <div className="text-xs text-gray-600 font-medium">点击上传或拖拽文件到此处</div>
              <div className="text-xs text-app-muted mt-0.5">支持 .csv / .xlsx / .xls</div>
            </div>

            {/* ✅ 分隔符 */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-xs text-app-muted">或粘贴文本</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>

            {/* 文本输入 */}
            <textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder="粘贴 CSV 或 JSON 数组..."
              className="w-full h-28 px-3 py-2 border border-gray-300 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
              spellCheck={false}
            />
            <div className="flex gap-2">
              <button onClick={parseInput} className="flex-1 py-2 bg-violet-500 text-white text-sm font-medium rounded-lg hover:bg-violet-600 active:scale-95 transition-all">解析数据</button>
              <button onClick={clearAll} className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition">清空</button>
            </div>

            {error && <div className="text-xs text-red-500">{error}</div>}
            {parsedData.length > 0 && (
              <div className="text-xs text-emerald-600 font-medium">✅ 已解析 {parsedData.length} 行 × {fields.length} 列</div>
            )}
          </div>

          {/* 字段映射（不变） */}
          {fields.length > 0 && (
            <div className="border border-app-border rounded-2xl p-4 bg-app-bg space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">字段映射</h3>
              <div>
                <label className="text-xs text-app-muted mb-1 block">X 轴</label>
                <select value={xField} onChange={(e) => setXField(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                  {allFields.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-app-muted mb-1 block">Y 轴（可多选，Ctrl/Cmd + 点击）</label>
                <select multiple value={yFields} onChange={(e) => setYFields([...e.target.selectedOptions].map((o) => o.value))} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 h-24">
                  {numberFields.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-app-muted mb-1 block">分组字段（可选）</label>
                <select value={groupField} onChange={(e) => setGroupField(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                  <option value="">无分组</option>
                  {allFields.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* 图表配置（不变） */}
          <div className="border border-app-border rounded-2xl p-4 bg-app-bg space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">图表配置</h3>
            <div className="flex gap-2 flex-wrap">
              {(['bar', 'line', 'scatter', 'pie', 'radar', 'heatmap'] as ChartType[]).map((t) => (
                <button key={t} onClick={() => setChartType(t)} className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${chartType === t ? 'bg-violet-500 text-white border-violet-500' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                  {t === 'bar' ? '柱状' : t === 'line' ? '折线' : t === 'scatter' ? '散点' : t === 'pie' ? '饼图' : t === 'radar' ? '雷达' : '热力'}
                </button>
              ))}
            </div>
            <div>
              <label className="text-xs text-app-muted mb-1 block">标题</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={stacked} onChange={(e) => setStacked(e.target.checked)} className="accent-violet-500" /> 堆叠</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={showLegend} onChange={(e) => setShowLegend(e.target.checked)} className="accent-violet-500" /> 图例</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-app-muted">主题</span>
                <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="px-2.5 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-100 transition">{theme === 'light' ? '☀️ 浅色' : '🌙 深色'}</button>
              </div>
            </div>
          </div>
        </div>

        {/* ─── 右：图表预览 + 导出（不变） ─── */}
        <div className="space-y-4">
          <div className="border border-app-border rounded-2xl p-4 bg-app-bg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700">图表预览</span>
              <div className="flex gap-2">
                <button onClick={copyOption} className="px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 active:scale-95 transition-all">{copied ? '✓ 已复制' : '📋 复制 option'}</button>
                <button onClick={downloadPNG} className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-medium rounded-lg hover:bg-emerald-600 active:scale-95 transition-all">⬇ 下载 PNG</button>
              </div>
            </div>
            <div ref={chartRef} className="w-full h-[480px] rounded-xl bg-white" />
          </div>

          {parsedData.length > 0 && (
            <div className="border border-app-border rounded-2xl p-4 bg-app-bg">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">数据预览（前 10 行）</h3>
              <div className="overflow-auto max-h-48">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-gray-200">{fields.map((f) => <th key={f.name} className="px-2 py-1.5 text-left font-medium text-app-muted">{f.name}</th>)}</tr></thead>
                  <tbody>{parsedData.slice(0, 10).map((row, i) => <tr key={i} className="border-b border-gray-100">{fields.map((f) => <td key={f.name} className="px-2 py-1.5 font-mono text-gray-700">{String(row[f.name] ?? '')}</td>)}</tr>)}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 说明卡片 */}
      <div className="mt-10 p-4 bg-gray-50 border border-app-border rounded-xl">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">使用说明</h3>
        <ul className="text-xs text-app-muted space-y-1.5 leading-relaxed">
          <li>• 支持上传 .csv / .xlsx / .xls 文件（拖拽或点击选择），或直接粘贴 CSV / JSON 文本</li>
          <li>• Excel 文件默认读取第一个 Sheet，首行为表头</li>
          <li>• 选择 X 轴（分类）和 Y 轴（数值，支持多选），可选分组字段拆分系列</li>
          <li>• 支持 6 种图表：柱状图、折线图、散点图、饼图、雷达图、热力图</li>
          <li>• 所有数据在浏览器本地处理，不会上传到任何服务器</li>
        </ul>
      </div>

      <FooterNote />
    </div>
  )
}