'use client'

import { useRef, useEffect, useMemo, useState } from 'react'
import * as echarts from 'echarts'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

// ---------- Mock 数据 ----------
const kpiData = [
  { label: '总用户', value: '128,490', change: '+12.5%', up: true },
  { label: '活跃用户', value: '38,274', change: '+8.3%', up: true },
  { label: '总收入', value: '¥ 847,230', change: '-3.2%', up: false },
  { label: '转化率', value: '4.67%', change: '+1.2%', up: true },
]

const months = ['1月','2月','3月','4月','5月','6月','7月','8月']
const trendData = {
  uv: [4200, 3800, 5100, 4700, 6200, 5900, 7300, 6800],
  pv: [9800, 8200, 11000, 10300, 13500, 12900, 15800, 14200],
}

const categoryNames = ['电子产品', '服装', '食品', '图书', '其他']
const categorySales = [4800, 3200, 2100, 1500, 900]

const pieData = [
  { name: '搜索引擎', value: 42 },
  { name: '社交媒体', value: 28 },
  { name: '直接访问', value: 19 },
  { name: '邮件营销', value: 11 },
]

const radarIndicators = [
  { name: '品牌知名度', max: 100 },
  { name: '产品质量', max: 100 },
  { name: '售后服务', max: 100 },
  { name: '性价比', max: 100 },
  { name: '创新能力', max: 100 },
]
const radarValue = [85, 92, 75, 88, 79]

const gaugeValue = 73.5

const scatterData = [
  [10, 86], [15, 72], [22, 95], [30, 63], [37, 81],
  [41, 54], [46, 77], [53, 69], [59, 91], [66, 47],
  [71, 83], [76, 61], [84, 74], [93, 57], [99, 87],
]

const amounts = ['1234.56', '7890.23', '4567.89', '2345.78', '6789.34', '3456.21', '5678.43', '8901.65', '4321.98', '7654.32']

const detailRows = Array.from({ length: 10 }, (_, i) => ({
  id: `ORD-${String(i + 1).padStart(4, '0')}`,
  customer: ['张三', '李四', '王五', '赵六', '陈七'][i % 5],
  product: ['iPhone 15', 'MacBook Air', 'AirPods Pro', 'iPad Air', 'Apple Watch'][i % 5],
  amount: amounts[i],
  status: ['已完成', '处理中', '已取消', '退款中'][i % 4],
}))


type TimeRange = '7d' | '30d' | 'quarter' | 'year'

type DashboardDataset = {
  kpis: typeof kpiData
  trendLabels: string[]
  uv: number[]
  pv: number[]
  categorySales: number[]
  pieData: Array<{ name: string; value: number }>
  radarValue: number[]
  gaugeValue: number
  scatterData: number[][]
}

const RANGE_LABELS: Record<TimeRange, string> = {
  '7d': '近7天',
  '30d': '近30天',
  quarter: '本季度',
  year: '今年',
}

const DASHBOARD_DATA: Record<TimeRange, DashboardDataset> = {
  '7d': {
    kpis: [
      { label: '总用户', value: '18,920', change: '+6.8%', up: true },
      { label: '活跃用户', value: '8,476', change: '+11.2%', up: true },
      { label: '总收入', value: '¥ 96,420', change: '+4.6%', up: true },
      { label: '转化率', value: '5.18%', change: '+0.7%', up: true },
    ],
    trendLabels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    uv: [4280, 4690, 4510, 5270, 6080, 6720, 7310],
    pv: [9100, 10380, 9870, 11620, 13200, 14980, 16140],
    categorySales: [920, 680, 510, 350, 230],
    pieData: [
      { name: '搜索引擎', value: 44 },
      { name: '社交媒体', value: 26 },
      { name: '直接访问', value: 20 },
      { name: '邮件营销', value: 10 },
    ],
    radarValue: [82, 91, 78, 86, 81],
    gaugeValue: 76.8,
    scatterData: [[12,82],[18,68],[26,91],[34,74],[43,88],[50,58],[57,77],[65,71],[73,94],[81,63],[91,84]],
  },
  '30d': {
    kpis: [
      { label: '总用户', value: '54,760', change: '+9.4%', up: true },
      { label: '活跃用户', value: '19,845', change: '+7.1%', up: true },
      { label: '总收入', value: '¥ 286,930', change: '+2.8%', up: true },
      { label: '转化率', value: '4.92%', change: '+0.4%', up: true },
    ],
    trendLabels: ['第1周', '第2周', '第3周', '第4周'],
    uv: [21800, 24600, 28100, 31500],
    pv: [49200, 56100, 64800, 73200],
    categorySales: [1680, 1280, 890, 620, 410],
    pieData: [
      { name: '搜索引擎', value: 42 },
      { name: '社交媒体', value: 29 },
      { name: '直接访问', value: 18 },
      { name: '邮件营销', value: 11 },
    ],
    radarValue: [84, 92, 76, 88, 80],
    gaugeValue: 74.2,
    scatterData: [[10,86],[17,70],[24,94],[31,67],[39,82],[46,59],[54,79],[61,72],[70,91],[78,64],[88,76],[96,88]],
  },
  quarter: {
    kpis: [
      { label: '总用户', value: '91,420', change: '+10.8%', up: true },
      { label: '活跃用户', value: '29,680', change: '+8.9%', up: true },
      { label: '总收入', value: '¥ 568,240', change: '-1.1%', up: false },
      { label: '转化率', value: '4.81%', change: '+0.9%', up: true },
    ],
    trendLabels: ['第1月', '第2月', '第3月'],
    uv: [52300, 61800, 70400],
    pv: [118000, 139000, 158000],
    categorySales: [3260, 2180, 1480, 980, 650],
    pieData: [
      { name: '搜索引擎', value: 41 },
      { name: '社交媒体', value: 30 },
      { name: '直接访问', value: 19 },
      { name: '邮件营销', value: 10 },
    ],
    radarValue: [86, 93, 77, 89, 82],
    gaugeValue: 72.6,
    scatterData: [[9,84],[15,71],[22,96],[29,66],[36,80],[43,55],[51,79],[58,69],[66,93],[73,60],[82,75],[90,58],[98,86]],
  },
  year: {
    kpis: kpiData,
    trendLabels: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
    uv: [4200,3800,5100,4700,6200,5900,7300,6800,7600,8100,7900,8800],
    pv: [9800,8200,11000,10300,13500,12900,15800,14200,16900,18100,17500,19600],
    categorySales,
    pieData,
    radarValue,
    gaugeValue,
    scatterData,
  },
}


// ---------- 颜色主题 ----------
const neonColors = ['#22d3ee', '#34d399', '#f472b6', '#fbbf24', '#a78bfa']

// ---------- 图表工厂 ----------
function createLineOption(data: DashboardDataset) {
  return {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(4,15,30,0.96)', borderColor: 'rgba(34,211,238,0.4)', borderWidth: 1, textStyle: { color: '#e2f7ff', fontSize: 12 }, extraCssText: 'box-shadow:0 12px 32px rgba(0,0,0,.35);backdrop-filter:blur(12px);border-radius:10px;' },
    legend: { data: ['UV', 'PV'], right: 4, top: 0, icon: 'roundRect', itemWidth: 14, itemHeight: 3, textStyle: { color: '#7894aa', fontSize: 11 } },
    grid: { left: 46, right: 18, top: 42, bottom: 28 },
    xAxis: { type: 'category', data: data.trendLabels, boundaryGap: false, axisLabel: { color: '#5f7b91', fontSize: 11, margin: 14 }, axisTick: { show: false }, axisLine: { lineStyle: { color: 'rgba(75,122,153,.25)' } } },
    yAxis: { type: 'value', splitNumber: 4, splitLine: { lineStyle: { color: 'rgba(75,122,153,.14)', type: 'dashed' } }, axisLabel: { color: '#5f7b91', fontSize: 10 }, axisLine: { show: false }, axisTick: { show: false } },
    series: [
      {
        name: 'UV', type: 'line', data: data.uv, smooth: true,
        lineStyle: { width: 2.5, color: neonColors[0], shadowBlur: 12, shadowColor: 'rgba(34,211,238,.45)' },
        areaStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1, [{offset:0,color:'rgba(34,211,238,0.22)'},{offset:1,color:'rgba(34,211,238,0)'}]) },
        symbol: 'circle', symbolSize: 5, showSymbol: false, emphasis: { focus: 'series', scale: 1.5 },
      },
      {
        name: 'PV', type: 'line', data: data.pv, smooth: true,
        lineStyle: { width: 2.5, color: neonColors[1], shadowBlur: 12, shadowColor: 'rgba(52,211,153,.4)' },
        areaStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1, [{offset:0,color:'rgba(52,211,153,0.16)'},{offset:1,color:'rgba(52,211,153,0)'}]) },
        symbol: 'circle', symbolSize: 5, showSymbol: false, emphasis: { focus: 'series', scale: 1.5 },
      },
    ],
  }
}

function createBarOption(data: DashboardDataset) {
  return {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(4,15,30,0.96)', borderColor: 'rgba(167,139,250,.4)', textStyle: { color: '#e2f7ff', fontSize: 12 }, extraCssText: 'box-shadow:0 12px 32px rgba(0,0,0,.35);border-radius:10px;' },
    grid: { left: 46, right: 18, top: 18, bottom: 30 },
    xAxis: { type: 'category', data: categoryNames, axisLabel: { color: '#5f7b91', fontSize: 11, margin: 14 }, axisTick: { show: false }, axisLine: { lineStyle: { color: 'rgba(75,122,153,.25)' } } },
    yAxis: { type: 'value', splitNumber: 4, splitLine: { lineStyle: { color: 'rgba(75,122,153,.14)', type: 'dashed' } }, axisLabel: { color: '#5f7b91', fontSize: 10 }, axisTick: { show: false }, axisLine: { show: false } },
    series: [{
      name: '销售额', type: 'bar', data: data.categorySales,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0,0,0,1, [
          { offset: 0, color: '#22d3ee' },
          { offset: 1, color: '#6366f1' }
        ]),
        borderRadius: [4,4,0,0],
        shadowBlur: 10, shadowColor: 'rgba(34,211,238,.22)',
      },
      barMaxWidth: 40,
    }],
  }
}

function createPieOption(data: DashboardDataset) {
  return {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', formatter: '{b}: {c}%', backgroundColor: 'rgba(4,15,30,0.96)', borderColor: 'rgba(34,211,238,.35)', textStyle: { color: '#e2f7ff', fontSize: 12 }, extraCssText: 'border-radius:10px;' },
    series: [{
      type: 'pie', radius: ['48%', '72%'], center: ['50%', '54%'], padAngle: 3,
      data: data.pieData.map((d,i) => ({ ...d, itemStyle: { color: neonColors[i], borderColor: '#071321', borderWidth: 3 } })),
      label: { color: '#7f9bb0', formatter: '{b}\n{d}%', fontSize: 10, lineHeight: 16 },
      labelLine: { length: 8, length2: 8, lineStyle: { color: 'rgba(97,139,166,.4)' } },
      emphasis: { itemStyle: { shadowBlur: 16, shadowColor: 'rgba(255,255,255,0.3)' } },
    }],
  }
}

function createRadarOption(data: DashboardDataset) {
  return {
    backgroundColor: 'transparent',
    tooltip: { backgroundColor: 'rgba(4,15,30,0.96)', borderColor: 'rgba(167,139,250,.4)', textStyle: { color: '#e2f7ff' } },
    radar: {
      indicator: radarIndicators,
      shape: 'circle',
      splitArea: { areaStyle: { color: ['rgba(34,211,238,0.008)', 'rgba(34,211,238,0.025)'] } },
      axisLine: { lineStyle: { color: 'rgba(93,139,166,.28)' } },
      axisName: { color: '#7894aa', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(93,139,166,.18)' } },
    },
    series: [{
      type: 'radar', data: [{ value: data.radarValue, name: '综合评分' }],
      symbol: 'none',
      lineStyle: { width: 2, color: neonColors[4], shadowBlur: 10, shadowColor: 'rgba(167,139,250,.35)' },
      areaStyle: { color: 'rgba(99,102,241,0.14)' },
    }],
  }
}

function createGaugeOption(data: DashboardDataset) {
  return {
    backgroundColor: 'transparent',
    series: [{
      type: 'gauge',
      startAngle: 220, endAngle: -40,
      min: 0, max: 100,
      progress: { show: true, roundCap: true, width: 10, itemStyle: { color: new echarts.graphic.LinearGradient(0,0,1,0,[{offset:0,color:'#22d3ee'},{offset:1,color:'#6366f1'}]), shadowBlur: 14, shadowColor: 'rgba(34,211,238,.4)' } },
      axisLine: { roundCap: true, lineStyle: { width: 10, color: [[1, 'rgba(77,117,143,.16)']] } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      pointer: { show: false },
      anchor: { show: false },
      title: { show: false },
      detail: { fontSize: 30, fontWeight: 700, color: '#e8fbff', offsetCenter: [0, '22%'], formatter: '{value}%', valueAnimation: true },
      data: [{ value: data.gaugeValue }],
    }],
  }
}

function createScatterOption(data: DashboardDataset) {
  return {
    backgroundColor: 'transparent',
    tooltip: { backgroundColor: 'rgba(4,15,30,0.96)', borderColor: 'rgba(52,211,153,.35)', borderWidth: 1, textStyle: { color: '#e2f7ff', fontSize: 12 } },
    grid: { left: 44, right: 16, top: 18, bottom: 28 },
    xAxis: { axisLabel: { color: '#5f7b91', fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(75,122,153,.12)', type: 'dashed' } }, axisLine: { lineStyle: { color: 'rgba(75,122,153,.22)' } }, axisTick: { show: false } },
    yAxis: { axisLabel: { color: '#5f7b91', fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(75,122,153,.12)', type: 'dashed' } }, axisLine: { show: false }, axisTick: { show: false } },
    series: [{
      type: 'scatter', data: data.scatterData,
      symbolSize: (val: number[]) => val[1] / 5 + 5,
      itemStyle: { color: neonColors[1], shadowBlur: 10, shadowColor: 'rgba(52,211,153,.38)', opacity: .82 },
    }],
  }
}

// ---------- 组件 ----------


function buildStandaloneHtml(data: DashboardDataset, range: TimeRange) {
  const exportedAt = new Date().toLocaleString('zh-CN')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>智能数据驾驶舱</title>

  <!--
    ============================================================
    智能数据驾驶舱 - 单文件导出版
    ------------------------------------------------------------
    1. 本文件不依赖 React / Next.js。
    2. ECharts 通过 jsDelivr CDN 在线加载。
    3. 最常修改的内容都集中在下方 PAGE_CONFIG 和 DATA。
    4. 修改数据后保存 HTML，刷新浏览器即可看到新结果。
    ============================================================
  -->

  <style>
    *{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#030914;color:#dbeafe;font-family:Inter,"PingFang SC","Microsoft YaHei",Arial,sans-serif}
    body{min-height:100vh;background:
      radial-gradient(circle at 50% -10%,rgba(21,94,117,.28),transparent 38%),
      radial-gradient(circle at 8% 45%,rgba(30,64,175,.12),transparent 26%),
      radial-gradient(circle at 92% 55%,rgba(88,28,135,.10),transparent 25%),#030914}
    body:before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.13;background-image:
      linear-gradient(rgba(34,211,238,.10) 1px,transparent 1px),
      linear-gradient(90deg,rgba(34,211,238,.10) 1px,transparent 1px);background-size:42px 42px}
    .app{position:relative;z-index:1;width:100%;max-width:1920px;margin:auto;padding:16px 22px 24px}
    .header{min-height:92px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:12px 26px;border-top:1px solid rgba(34,211,238,.1);border-bottom:1px solid rgba(34,211,238,.1);background:rgba(6,17,30,.68)}
    .eyebrow{text-align:center;font-size:10px;letter-spacing:.42em;color:rgba(103,232,249,.6)}h1{margin:7px 0 0;text-align:center;font-size:28px;letter-spacing:.16em;color:#e8fbff}
    .subtitle{text-align:center;margin-top:8px;font-size:10px;letter-spacing:.22em;color:#64748b}.status{font-size:10px;letter-spacing:.16em;color:#64748b}.status b{display:block;margin-top:7px;color:#86efac;font-weight:500}
    .range{text-align:right;color:#7894aa;font:11px monospace}
    .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:14px 0}.kpi,.panel{position:relative;overflow:hidden;border:1px solid rgba(34,211,238,.12);background:rgba(8,22,37,.84);box-shadow:inset 0 1px 0 rgba(255,255,255,.025),0 18px 50px rgba(0,0,0,.16)}
    .kpi{border-radius:16px;padding:17px 18px}.kpi small{color:#64748b;font-size:10px;letter-spacing:.14em}.kpi .label{margin-top:7px;color:#94a3b8;font-size:11px}.kpi .value{margin-top:8px;font:600 27px monospace;color:#f8fafc}.kpi .change{float:right;margin-top:-29px;font:10px monospace;color:#6ee7b7}
    .grid2{display:grid;grid-template-columns:1.45fr 1fr;gap:14px;margin-bottom:14px}.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:14px}.bottom{display:grid;grid-template-columns:.92fr 1.48fr;gap:14px}
    .panel{border-radius:18px}.title{height:55px;display:flex;align-items:center;padding:0 16px;border-bottom:1px solid rgba(34,211,238,.08)}.title i{width:3px;height:28px;background:#22d3ee;border-radius:8px;box-shadow:0 0 12px #22d3ee;margin-right:12px}.title strong{display:block;font-size:13px;letter-spacing:.08em}.title small{display:block;margin-top:4px;font-size:9px;letter-spacing:.18em;color:#475569}
    .chart{width:100%;height:315px}.grid3 .chart{height:270px}.bottom .chart{height:355px}
    table{width:100%;border-collapse:collapse;font-size:11px}th{padding:13px 8px;color:#526378;text-align:left;font-size:9px;letter-spacing:.12em;border-bottom:1px solid rgba(34,211,238,.08)}td{padding:12px 8px;border-bottom:1px solid rgba(34,211,238,.045);color:#a7b5c7}td:nth-child(4),th:nth-child(4){text-align:right}.table-wrap{padding:4px 16px 16px;overflow:auto}.badge{display:inline-block;padding:4px 8px;border-radius:6px;border:1px solid rgba(52,211,153,.2);color:#6ee7b7;background:rgba(52,211,153,.07)}
    .footer{margin-top:14px;padding-top:11px;border-top:1px solid rgba(34,211,238,.07);display:flex;justify-content:space-between;color:#3f5267;font:9px monospace;letter-spacing:.12em}
    @media(max-width:1100px){.kpis{grid-template-columns:repeat(2,1fr)}.grid2,.bottom{grid-template-columns:1fr}.grid3{grid-template-columns:1fr}.header{grid-template-columns:1fr}.status,.range{display:none}}
  </style>
</head>
<body>
  <main class="app">
    <header class="header">
      <div class="status">SYSTEM STATUS<b>● ONLINE</b></div>
      <div>
        <div class="eyebrow">INTELLIGENT DATA CENTER</div>
        <h1 id="pageTitle"></h1>
        <div class="subtitle" id="pageSubtitle"></div>
      </div>
      <div class="range">DATA RANGE<br><span id="rangeLabel"></span></div>
    </header>

    <section class="kpis" id="kpiGrid"></section>

    <section class="grid2">
      <div class="panel"><div class="title"><i></i><div><strong id="trendTitle"></strong><small>TRAFFIC TREND / UV & PV</small></div></div><div id="trendChart" class="chart"></div></div>
      <div class="panel"><div class="title"><i style="background:#a78bfa;box-shadow:0 0 12px #a78bfa"></i><div><strong id="salesTitle"></strong><small>CATEGORY SALES ANALYSIS</small></div></div><div id="salesChart" class="chart"></div></div>
    </section>

    <section class="grid3">
      <div class="panel"><div class="title"><i style="background:#fbbf24;box-shadow:0 0 12px #fbbf24"></i><div><strong id="channelTitle"></strong><small>CHANNEL SOURCE</small></div></div><div id="pieChart" class="chart"></div></div>
      <div class="panel"><div class="title"><i style="background:#a78bfa;box-shadow:0 0 12px #a78bfa"></i><div><strong id="radarTitle"></strong><small>BRAND CAPABILITY</small></div></div><div id="radarChart" class="chart"></div></div>
      <div class="panel"><div class="title"><i></i><div><strong id="gaugeTitle"></strong><small>TARGET COMPLETION</small></div></div><div id="gaugeChart" class="chart"></div></div>
    </section>

    <section class="bottom">
      <div class="panel"><div class="title"><i style="background:#34d399;box-shadow:0 0 12px #34d399"></i><div><strong id="scatterTitle"></strong><small>USER VALUE DISTRIBUTION</small></div></div><div id="scatterChart" class="chart"></div></div>
      <div class="panel"><div class="title"><i style="background:#f472b6;box-shadow:0 0 12px #f472b6"></i><div><strong id="orderTitle"></strong><small>REAL-TIME ORDER STREAM</small></div></div><div class="table-wrap"><table><thead><tr><th>订单号</th><th>客户</th><th>商品</th><th>交易金额</th><th>状态</th></tr></thead><tbody id="orderBody"></tbody></table></div></div>
    </section>

    <footer class="footer"><span>EXPORTED: ${exportedAt}</span><span>ECharts CDN · Standalone HTML</span></footer>
  </main>

  <!-- ECharts 在线包。需要离线部署时，可下载该文件并改成本地路径。 -->
  <script src="https://cdn.jsdelivr.net/npm/echarts@6.1.0/dist/echarts.min.js"></script>

  <script>
    /* ==========================================================
       【用户编辑区 1】修改页面标题
       只需要修改下面这些字符串，不需要改 ECharts 配置。
       ========================================================== */
    const PAGE_CONFIG = {
      pageTitle: '智能数据驾驶舱',
      pageSubtitle: '实时监控 · 多维分析 · 决策支持',
      trendTitle: '全域流量趋势',
      salesTitle: '品类销售分析',
      channelTitle: '流量渠道来源',
      radarTitle: '品牌综合能力',
      gaugeTitle: '年度目标完成率',
      scatterTitle: '用户价值分布',
      orderTitle: '实时订单明细'
    };

    /* ==========================================================
       【用户编辑区 2】修改大屏数据
       说明：
       - kpis：顶部四个指标卡
       - trendLabels / uv / pv：折线图
       - categoryNames / categorySales：柱状图
       - pieData：渠道来源环形图
       - radarValue：雷达图，0~100
       - gaugeValue：完成率，0~100
       - scatterData：散点图，每项格式为 [X, Y]
       - orders：订单表格
       修改后保存本 HTML，刷新浏览器即可。
       ========================================================== */
    const DATA = ${JSON.stringify({
      "rangeLabel": RANGE_LABELS[range],
      "kpis": data["kpis"],
      "trendLabels": data["trendLabels"],
      "uv": data["uv"],
      "pv": data["pv"],
      "categoryNames": categoryNames,
      "categorySales": data["categorySales"],
      "pieData": data["pieData"],
      "radarValue": data["radarValue"],
      "gaugeValue": data["gaugeValue"],
      "scatterData": data["scatterData"],
      "orders": detailRows,
    }, null, 2)};

    // ===================== 以下一般不需要修改 =====================
    const COLORS = ['#22d3ee','#34d399','#f472b6','#fbbf24','#a78bfa'];
    const tooltip = {backgroundColor:'rgba(4,15,30,.96)',borderColor:'rgba(34,211,238,.35)',textStyle:{color:'#e2f7ff'}};
    const axis = {axisLabel:{color:'#5f7b91',fontSize:10},axisTick:{show:false},axisLine:{lineStyle:{color:'rgba(75,122,153,.22)'}},splitLine:{lineStyle:{color:'rgba(75,122,153,.12)',type:'dashed'}}};

    Object.entries(PAGE_CONFIG).forEach(([key,value]) => {
      const el = document.getElementById(key);
      if(el) el.textContent = value;
    });
    document.getElementById('rangeLabel').textContent = DATA.rangeLabel;

    document.getElementById('kpiGrid').innerHTML = DATA.kpis.map((item,i) =>
      '<div class="kpi"><small>0'+(i+1)+' / KPI</small><div class="label">'+item.label+'</div><div class="value">'+item.value+'</div><div class="change">'+(item.up?'▲ ':'▼ ')+item.change+'</div></div>'
    ).join('');

    document.getElementById('orderBody').innerHTML = DATA.orders.map(row =>
      '<tr><td style="font-family:monospace;color:#9bddeb">'+row.id+'</td><td>'+row.customer+'</td><td>'+row.product+'</td><td>¥'+row.amount+'</td><td><span class="badge">'+row.status+'</span></td></tr>'
    ).join('');

    const trend = echarts.init(document.getElementById('trendChart'));
    trend.setOption({
      tooltip:{...tooltip,trigger:'axis'},legend:{data:['UV','PV'],right:10,textStyle:{color:'#7894aa'}},
      grid:{left:48,right:20,top:42,bottom:30},
      xAxis:{...axis,type:'category',boundaryGap:false,data:DATA.trendLabels},
      yAxis:{...axis,type:'value'},
      series:[
        {name:'UV',type:'line',smooth:true,showSymbol:false,data:DATA.uv,lineStyle:{width:2.5,color:COLORS[0]},areaStyle:{color:new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'rgba(34,211,238,.22)'},{offset:1,color:'rgba(34,211,238,0)'}])}},
        {name:'PV',type:'line',smooth:true,showSymbol:false,data:DATA.pv,lineStyle:{width:2.5,color:COLORS[1]},areaStyle:{color:new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'rgba(52,211,153,.16)'},{offset:1,color:'rgba(52,211,153,0)'}])}}
      ]
    });

    const sales = echarts.init(document.getElementById('salesChart'));
    sales.setOption({
      tooltip:{...tooltip,trigger:'axis'},grid:{left:48,right:20,top:20,bottom:32},
      xAxis:{...axis,type:'category',data:DATA.categoryNames},yAxis:{...axis,type:'value'},
      series:[{type:'bar',data:DATA.categorySales,barMaxWidth:40,itemStyle:{borderRadius:[4,4,0,0],color:new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#22d3ee'},{offset:1,color:'#6366f1'}])}}]
    });

    const pie = echarts.init(document.getElementById('pieChart'));
    pie.setOption({tooltip:{...tooltip,trigger:'item'},series:[{type:'pie',radius:['48%','72%'],center:['50%','54%'],padAngle:3,data:DATA.pieData.map((d,i)=>({...d,itemStyle:{color:COLORS[i],borderColor:'#071321',borderWidth:3}})),label:{color:'#7f9bb0',formatter:'{b}\\n{d}%',fontSize:10}}]});

    const radar = echarts.init(document.getElementById('radarChart'));
    radar.setOption({tooltip,radar:{indicator:['品牌知名度','产品质量','售后服务','性价比','创新能力'].map(name=>({name,max:100})),shape:'circle',axisName:{color:'#7894aa',fontSize:10},axisLine:{lineStyle:{color:'rgba(93,139,166,.28)'}},splitLine:{lineStyle:{color:'rgba(93,139,166,.18)'}}},series:[{type:'radar',data:[{value:DATA.radarValue}],symbol:'none',lineStyle:{width:2,color:'#a78bfa'},areaStyle:{color:'rgba(99,102,241,.14)'}}]});

    const gauge = echarts.init(document.getElementById('gaugeChart'));
    gauge.setOption({series:[{type:'gauge',startAngle:220,endAngle:-40,min:0,max:100,progress:{show:true,roundCap:true,width:10,itemStyle:{color:'#22d3ee'}},axisLine:{roundCap:true,lineStyle:{width:10,color:[[1,'rgba(77,117,143,.16)']]}},axisTick:{show:false},splitLine:{show:false},axisLabel:{show:false},pointer:{show:false},anchor:{show:false},title:{show:false},detail:{fontSize:30,fontWeight:700,color:'#e8fbff',offsetCenter:[0,'22%'],formatter:'{value}%'},data:[{value:DATA.gaugeValue}]}]});

    const scatter = echarts.init(document.getElementById('scatterChart'));
    scatter.setOption({tooltip,grid:{left:46,right:18,top:20,bottom:30},xAxis:{...axis,type:'value'},yAxis:{...axis,type:'value'},series:[{type:'scatter',data:DATA.scatterData,symbolSize:v=>v[1]/5+5,itemStyle:{color:'#34d399',opacity:.82}}]});

    const charts = [trend,sales,pie,radar,gauge,scatter];
    window.addEventListener('resize',()=>charts.forEach(chart=>chart.resize()));
  </script>
</body>
</html>`
}

function downloadHtmlFile(data: DashboardDataset, range: TimeRange) {
  const html = buildStandaloneHtml(data, range)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `data-dashboard-${range}.html`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

const panelClass = 'relative overflow-hidden rounded-[18px] border border-cyan-400/[0.12] bg-[#081625]/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.025),0_18px_50px_rgba(0,0,0,0.16)] backdrop-blur-xl'
const chartTitleClass = 'relative z-10 flex items-center justify-between border-b border-cyan-400/[0.08] px-4 py-3.5'

const statusColor = {
  已完成: 'border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300',
  处理中: 'border-amber-400/20 bg-amber-400/[0.08] text-amber-300',
  已取消: 'border-slate-400/15 bg-slate-400/[0.07] text-slate-400',
  退款中: 'border-pink-400/20 bg-pink-400/[0.08] text-pink-300',
} as const

function PanelCorners() {
  return (
    <>
      <span className="pointer-events-none absolute left-0 top-0 h-5 w-5 border-l border-t border-cyan-300/50" />
      <span className="pointer-events-none absolute right-0 top-0 h-5 w-5 border-r border-t border-cyan-300/30" />
      <span className="pointer-events-none absolute bottom-0 left-0 h-5 w-5 border-b border-l border-cyan-300/25" />
      <span className="pointer-events-none absolute bottom-0 right-0 h-5 w-5 border-b border-r border-cyan-300/40" />
    </>
  )
}

function PanelTitle({
  title,
  sub,
  color = '#22d3ee',
}: {
  title: string
  sub: string
  color?: string
}) {
  return (
    <div className={chartTitleClass}>
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="h-7 w-[3px] shrink-0 rounded-full"
          style={{ background: color, boxShadow: `0 0 12px ${color}` }}
        />
        <div className="min-w-0">
          <h2 className="truncate text-[13px] font-semibold tracking-[0.08em] text-slate-100">
            {title}
          </h2>
          <p className="mt-0.5 truncate text-[9px] uppercase tracking-[0.18em] text-slate-600">
            {sub}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-1 w-1 rounded-full bg-cyan-300 shadow-[0_0_7px_#22d3ee]" />
        <span className="h-px w-5 bg-gradient-to-r from-cyan-300/50 to-transparent" />
      </div>
    </div>
  )
}

export default function DataAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d')
  const dashboardData = useMemo(() => DASHBOARD_DATA[timeRange], [timeRange])

  const chartRefs = useRef<(HTMLDivElement | null)[]>([])
  const setChartRef = (index: number) => (el: HTMLDivElement | null) => { chartRefs.current[index] = el }

  useEffect(() => {
    const options = [
      createLineOption(dashboardData),
      createBarOption(dashboardData),
      createPieOption(dashboardData),
      createRadarOption(dashboardData),
      createGaugeOption(dashboardData),
      createScatterOption(dashboardData),
    ]

    const instances: echarts.ECharts[] = []

    chartRefs.current.forEach((el, i) => {
      if (!el || !options[i]) return

      const existing = echarts.getInstanceByDom(el)
      if (existing) existing.dispose()

      const chart = echarts.init(el, undefined, { renderer: 'canvas' })
      chart.setOption(options[i], { notMerge: true, lazyUpdate: false })
      instances.push(chart)
    })

    const resizeCharts = () => {
      instances.forEach(chart => {
        if (!chart.isDisposed()) chart.resize()
      })
    }

    // 首帧布局完成后再 resize 一次，避免 Grid/Flex 下首次尺寸计算不完整
    const frame = requestAnimationFrame(resizeCharts)

    // 比只监听 window.resize 更可靠：
    // 侧栏、字体、响应式断点、父容器尺寸变化时都能重新计算 ECharts 尺寸
    const observer = new ResizeObserver(() => {
      resizeCharts()
    })

    chartRefs.current.forEach(el => {
      if (el) observer.observe(el)
    })

    window.addEventListener('resize', resizeCharts)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resizeCharts)
      observer.disconnect()

      instances.forEach(chart => {
        if (!chart.isDisposed()) chart.dispose()
      })
    }
  }, [dashboardData])


  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#030914] text-slate-200 selection:bg-cyan-400/20">
      {/* 大屏环境背景 */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(21,94,117,0.28),transparent_38%),radial-gradient(circle_at_8%_45%,rgba(30,64,175,0.12),transparent_26%),radial-gradient(circle_at_92%_55%,rgba(88,28,135,0.10),transparent_25%)]" />
        <div
          className="absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(34,211,238,.10) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,.10) 1px, transparent 1px)',
            backgroundSize: '42px 42px',
            maskImage: 'linear-gradient(to bottom, black, transparent 92%)',
          }}
        />
        <div className="absolute left-1/2 top-0 h-[1px] w-[72%] -translate-x-1/2 bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent shadow-[0_0_18px_rgba(34,211,238,.7)]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1920px] px-3 py-3 sm:px-4 md:px-5 lg:px-6">
        <div className="mb-2 opacity-60">
          <Breadcrumb />
        </div>

        {/* 顶部中控标题 */}
        <header className="relative mb-4 overflow-hidden border-y border-cyan-400/[0.10] bg-[#06111e]/65">
          <div className="absolute inset-x-[14%] bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />
          <div className="absolute left-1/2 top-0 h-16 w-[38%] -translate-x-1/2 bg-cyan-400/[0.055] blur-3xl" />

          <div className="grid min-h-[88px] grid-cols-1 items-center gap-3 px-4 py-3 md:grid-cols-[1fr_auto_1fr] md:px-7">
            <div className="hidden items-center gap-5 text-[10px] uppercase tracking-[0.16em] text-slate-600 md:flex">
              <div>
                <div className="text-cyan-300/80">SYSTEM STATUS</div>
                <div className="mt-1 flex items-center gap-2 text-slate-400">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                  ONLINE
                </div>
              </div>
              <div className="h-7 w-px bg-cyan-400/10" />
              <div>
                <div>DATA SYNC</div>
                <div className="mt-1 font-mono text-slate-300">REAL-TIME</div>
              </div>
            </div>

            <div className="text-center">
              <div className="mb-1 flex items-center justify-center gap-3">
                <span className="hidden h-px w-12 bg-gradient-to-r from-transparent to-cyan-300/50 sm:block" />
                <span className="text-[9px] font-medium uppercase tracking-[0.42em] text-cyan-300/60">
                  INTELLIGENT DATA CENTER
                </span>
                <span className="hidden h-px w-12 bg-gradient-to-l from-transparent to-cyan-300/50 sm:block" />
              </div>
              <h1 className="bg-gradient-to-b from-white via-cyan-50 to-cyan-300 bg-clip-text text-xl font-black tracking-[0.16em] text-transparent sm:text-2xl md:text-[28px]">
                智 能 数 据 驾 驶 舱
              </h1>
              <div className="mx-auto mt-2 flex items-center justify-center gap-2">
                <span className="h-px w-8 bg-cyan-300/15" />
                <span className="text-[10px] tracking-[0.22em] text-slate-500">实时监控 · 多维分析 · 决策支持</span>
                <span className="h-px w-8 bg-cyan-300/15" />
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 md:justify-end">
              <div className="hidden text-right lg:block">
                <div className="text-[9px] uppercase tracking-[0.18em] text-slate-600">UPDATE FREQ.</div>
                <div className="mt-1 font-mono text-[11px] text-cyan-200/80">{RANGE_LABELS[timeRange]} · 5 SEC</div>
              </div>
              <select
                value={timeRange}
                onChange={e => setTimeRange(e.target.value as TimeRange)}
                className="rounded-lg border border-cyan-300/[0.16] bg-[#071522]/90 px-4 py-2 text-xs text-slate-300 outline-none transition hover:border-cyan-300/30 focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-400/10"
                aria-label="选择数据时间范围"
              >
                <option value="7d">近7天</option>
                <option value="30d">近30天</option>
                <option value="quarter">本季度</option>
                <option value="year">今年</option>
              </select>

              <button
                type="button"
                onClick={() => downloadHtmlFile(dashboardData, timeRange)}
                className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/20 bg-cyan-300/[0.06] px-4 py-2 text-xs font-medium text-cyan-100 transition hover:border-cyan-300/35 hover:bg-cyan-300/[0.10] active:scale-[0.98]"
                title="导出当前时间范围的单文件 HTML"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 3v12m0 0 4-4m-4 4-4-4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" strokeLinecap="round" />
                </svg>
                导出 HTML
              </button>
            </div>
          </div>
        </header>

        {/* KPI 数据带 */}
        <section className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
          {dashboardData.kpis.map((item, idx) => {
            const colors = ['#22d3ee', '#34d399', '#a78bfa', '#fbbf24']
            const labels = ['TOTAL USERS', 'ACTIVE USERS', 'TOTAL REVENUE', 'CONVERSION RATE']
            const color = colors[idx]
            return (
              <div
                key={item.label}
                className="group relative overflow-hidden rounded-[16px] border border-cyan-300/[0.10] bg-gradient-to-br from-[#0a1b2b]/90 to-[#07121f]/90 px-4 py-4 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-300/20 hover:shadow-[0_14px_40px_rgba(0,0,0,.22)] md:px-5"
              >
                <PanelCorners />
                <div
                  className="pointer-events-none absolute -right-8 -top-12 h-28 w-28 rounded-full opacity-[0.12] blur-2xl transition-opacity group-hover:opacity-20"
                  style={{ background: color }}
                />
                <div className="relative z-10 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{labels[idx]}</p>
                    </div>
                    <p className="mt-2 text-[11px] font-medium text-slate-400">{item.label}</p>
                  </div>
                  <span className="font-mono text-[9px] text-slate-700">0{idx + 1}</span>
                </div>

                <div className="relative z-10 mt-3 flex items-end justify-between gap-2">
                  <p className="font-mono text-[23px] font-semibold tracking-tight text-slate-50 sm:text-[27px]">{item.value}</p>
                  <div className={`mb-1 flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[10px] ${
                    item.up
                      ? 'border-emerald-400/15 bg-emerald-400/[0.06] text-emerald-300'
                      : 'border-pink-400/15 bg-pink-400/[0.06] text-pink-300'
                  }`}>
                    {item.up ? '▲' : '▼'} {item.change}
                  </div>
                </div>

                <div className="relative z-10 mt-3 h-[2px] overflow-hidden rounded-full bg-white/[0.04]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${72 + idx * 6}%`,
                      background: `linear-gradient(90deg, transparent, ${color})`,
                      boxShadow: `0 0 9px ${color}`,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </section>

        {/* 主趋势区 */}
        <section className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.45fr_1fr]">
          <div className={panelClass}>
            <PanelCorners />
            <PanelTitle title="全域流量趋势" sub="TRAFFIC TREND / UV & PV" color="#22d3ee" />
            <div className="px-2 pb-2 pt-1">
              <div ref={setChartRef(0)} className="h-[290px] min-h-[290px] w-full min-w-0 md:h-[315px] md:min-h-[315px]" />
            </div>
          </div>

          <div className={panelClass}>
            <PanelCorners />
            <PanelTitle title="品类销售分析" sub="CATEGORY SALES ANALYSIS" color="#a78bfa" />
            <div className="px-2 pb-2 pt-1">
              <div ref={setChartRef(1)} className="h-[290px] min-h-[290px] w-full min-w-0 md:h-[315px] md:min-h-[315px]" />
            </div>
          </div>
        </section>

        {/* 三联分析区 */}
        <section className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className={panelClass}>
            <PanelCorners />
            <PanelTitle title="流量渠道来源" sub="CHANNEL SOURCE" color="#fbbf24" />
            <div className="px-1 pb-2">
              <div ref={setChartRef(2)} className="h-[270px] min-h-[270px] w-full min-w-0" />
            </div>
          </div>

          <div className={panelClass}>
            <PanelCorners />
            <PanelTitle title="品牌综合能力" sub="BRAND CAPABILITY" color="#a78bfa" />
            <div className="px-1 pb-2">
              <div ref={setChartRef(3)} className="h-[270px] min-h-[270px] w-full min-w-0" />
            </div>
          </div>

          <div className={panelClass}>
            <PanelCorners />
            <PanelTitle title="年度目标完成率" sub="TARGET COMPLETION" color="#22d3ee" />
            <div className="relative px-1 pb-2">
              <div ref={setChartRef(4)} className="h-[270px] min-h-[270px] w-full min-w-0" />
              <div className="pointer-events-none absolute bottom-9 left-1/2 -translate-x-1/2 text-center">
                <div className="text-[9px] uppercase tracking-[0.22em] text-slate-600">COMPLETION</div>
                <div className="mt-1 flex items-center justify-center gap-1.5 text-[10px] text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                  状态良好
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 用户画像 + 实时订单 */}
        <section className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[0.92fr_1.48fr]">
          <div className={panelClass}>
            <PanelCorners />
            <PanelTitle title="用户价值分布" sub="USER VALUE DISTRIBUTION" color="#34d399" />
            <div className="px-2 pb-2">
              <div ref={setChartRef(5)} className="h-[355px] min-h-[355px] w-full min-w-0" />
            </div>
          </div>

          <div className={panelClass}>
            <PanelCorners />
            <div className={chartTitleClass}>
              <div className="flex items-center gap-3">
                <span className="h-7 w-[3px] rounded-full bg-pink-400 shadow-[0_0_12px_#f472b6]" />
                <div>
                  <h2 className="text-[13px] font-semibold tracking-[0.08em] text-slate-100">实时订单明细</h2>
                  <p className="mt-0.5 text-[9px] uppercase tracking-[0.18em] text-slate-600">REAL-TIME ORDER STREAM</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-md border border-emerald-400/10 bg-emerald-400/[0.04] px-2 py-1">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-emerald-300/80">LIVE</span>
              </div>
            </div>

            <div className="overflow-x-auto px-4 pb-4 pt-2">
              <table className="w-full min-w-[620px] text-left">
                <thead>
                  <tr className="border-b border-cyan-300/[0.08]">
                    {['订单号', '客户', '商品', '交易金额', '状态'].map((title, idx) => (
                      <th
                        key={title}
                        className={`py-3 text-[9px] font-medium uppercase tracking-[0.15em] text-slate-600 ${
                          idx === 3 ? 'text-right' : ''
                        }`}
                      >
                        {title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detailRows.map((row, index) => (
                    <tr
                      key={row.id}
                      className="group border-b border-cyan-300/[0.045] transition hover:bg-cyan-300/[0.025]"
                    >
                      <td className="py-[11px] pr-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[9px] text-slate-700">{String(index + 1).padStart(2, '0')}</span>
                          <span className="font-mono text-[11px] text-cyan-200/70">{row.id}</span>
                        </div>
                      </td>
                      <td className="py-[11px] pr-4 text-[11px] text-slate-400">{row.customer}</td>
                      <td className="py-[11px] pr-4 text-[11px] text-slate-300">{row.product}</td>
                      <td className="py-[11px] pr-4 text-right font-mono text-[11px] font-medium text-slate-200">
                        <span className="mr-0.5 text-slate-600">¥</span>{row.amount}
                      </td>
                      <td className="py-[11px]">
                        <span className={`inline-flex min-w-[58px] items-center justify-center rounded-md border px-2 py-1 text-[9px] font-medium ${
                          statusColor[row.status as keyof typeof statusColor]
                        }`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 底部状态栏 */}
        <div className="mb-3 flex flex-col items-center justify-between gap-2 border-t border-cyan-300/[0.07] px-2 pt-3 text-[9px] uppercase tracking-[0.14em] text-slate-700 sm:flex-row">
          <div className="flex items-center gap-4">
            <span>DATA NODE: <b className="font-normal text-slate-500">CN-EAST-01</b></span>
            <span>LATENCY: <b className="font-normal text-emerald-400/70">18 MS</b></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-cyan-300/70 shadow-[0_0_7px_#22d3ee]" />
            ALL SYSTEMS OPERATIONAL
          </div>
        </div>

        <div className="opacity-60">
          <FooterNote />
        </div>
      </div>
    </div>
  )
}