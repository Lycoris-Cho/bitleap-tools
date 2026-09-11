"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type Country = {
  id:string
  iso2Code:string
  name:string
  region:{ id:string; value:string }
  incomeLevel:{ id:string; value:string }
  capitalCity:string
  longitude:string
  latitude:string
}

type Point = {
  indicator:{ id:string; value:string }
  country:{ id:string; value:string }
  countryiso3code:string
  date:string
  value:number|null
  unit:string
  obs_status:string
  decimal:number
}

type IndicatorMeta = {
  id:string
  name:string
  unit:string
  source:{ id:string; value:string }
  sourceNote:string
  sourceOrganization:string
  topics:Array<{ id:string; value:string }>
}

type Series = {
  code:string
  name:string
  points:Array<{ year:number; value:number }>
}

type Preset = {
  code:string
  zh:string
  short:string
  format:"number"|"money"|"percent"|"years"|"tons"
}

const WB = "https://api.worldbank.org/v2"
const CURRENT_YEAR = new Date().getUTCFullYear()

const PRESETS:Preset[] = [
  { code:"SP.POP.TOTL", zh:"总人口", short:"Population", format:"number" },
  { code:"NY.GDP.MKTP.CD", zh:"GDP", short:"GDP · Current US$", format:"money" },
  { code:"NY.GDP.PCAP.CD", zh:"人均 GDP", short:"GDP per capita", format:"money" },
  { code:"SP.DYN.LE00.IN", zh:"预期寿命", short:"Life expectancy", format:"years" },
  { code:"IT.NET.USER.ZS", zh:"互联网普及率", short:"Internet users", format:"percent" },
  { code:"SP.URB.TOTL.IN.ZS", zh:"城市人口占比", short:"Urban population", format:"percent" },
  { code:"SL.UEM.TOTL.ZS", zh:"失业率", short:"Unemployment", format:"percent" },
  { code:"EN.ATM.CO2E.PC", zh:"人均 CO₂ 排放", short:"CO₂ per capita", format:"tons" },
]

const COUNTRY_COLORS = ["#183c34","#c2593f","#b38a39","#4d6584","#7d5f7f"]

function countryZh(c:Country){
  try{ return new Intl.DisplayNames(["zh-CN"],{type:"region"}).of(c.iso2Code)||c.name }catch{return c.name}
}

function compact(v:number){
  return new Intl.NumberFormat("zh-CN",{notation:"compact",maximumFractionDigits:2}).format(v)
}

function fixed(v:number,d=2){
  return new Intl.NumberFormat("zh-CN",{maximumFractionDigits:d}).format(v)
}

function formatValue(value:number|undefined, preset:Preset){
  if(value==null || !Number.isFinite(value))return "—"
  if(preset.format==="money") return value>=1e9?`$${compact(value)}`:`$${fixed(value,0)}`
  if(preset.format==="percent") return `${fixed(value,1)}%`
  if(preset.format==="years") return `${fixed(value,1)} 年`
  if(preset.format==="tons") return `${fixed(value,2)} t`
  return compact(value)
}

function nearestValue(series:Series|undefined, year:number){
  if(!series?.points.length)return undefined
  const exact=series.points.find(p=>p.year===year)
  if(exact)return exact.value
  const older=series.points.filter(p=>p.year<=year).sort((a,b)=>b.year-a.year)[0]
  return older?.value
}

function buildPath(points:Array<{year:number;value:number}>, minYear:number,maxYear:number,min:number,max:number){
  if(!points.length)return ""
  const spread=Math.max(1e-9,max-min)
  return points.map((p,i)=>{
    const x=60+((p.year-minYear)/Math.max(1,maxYear-minYear))*880
    const y=355-((p.value-min)/spread)*280
    return `${i===0?"M":"L"} ${x.toFixed(2)} ${y.toFixed(2)}`
  }).join(" ")
}

function csv(series:Series[],preset:Preset){
  const years=[...new Set(series.flatMap(s=>s.points.map(p=>p.year)))].sort((a,b)=>a-b)
  const lines=[["year",...series.map(s=>s.name)].join(",")]
  for(const year of years){
    lines.push([year,...series.map(s=>s.points.find(p=>p.year===year)?.value??"")].join(","))
  }
  const blob=new Blob([lines.join("\n")],{type:"text/csv;charset=utf-8"})
  const url=URL.createObjectURL(blob)
  const a=document.createElement("a")
  a.href=url
  a.download=`world-bank-${preset.code}.csv`
  a.click()
  setTimeout(()=>URL.revokeObjectURL(url),500)
}

export default function WorldLensPage(){
  const [countries,setCountries]=useState<Country[]>([])
  const [selectedCodes,setSelectedCodes]=useState(["CHN","JPN","USA"])
  const [indicator,setIndicator]=useState(PRESETS[2].code)
  const [customCode,setCustomCode]=useState("")
  const [startYear,setStartYear]=useState(2000)
  const [endYear,setEndYear]=useState(CURRENT_YEAR)
  const [selectedYear,setSelectedYear]=useState(CURRENT_YEAR)
  const [series,setSeries]=useState<Series[]>([])
  const [meta,setMeta]=useState<IndicatorMeta|null>(null)
  const [ranking,setRanking]=useState<Array<{code:string;name:string;value:number;year:number}>>([])
  const [loading,setLoading]=useState(true)
  const [rankLoading,setRankLoading]=useState(false)
  const [error,setError]=useState("")
  const [normalized,setNormalized]=useState(false)
  const [search,setSearch]=useState("")
  const [pickerOpen,setPickerOpen]=useState(false)

  const pageRef=useRef<HTMLElement>(null)
  const chartRef=useRef<SVGSVGElement>(null)
  const yearRef=useRef<HTMLSpanElement>(null)

  const preset=useMemo(()=>PRESETS.find(p=>p.code===indicator) || {code:indicator,zh:meta?.name||indicator,short:meta?.name||indicator,format:"number" as const},[indicator,meta])
  const selectedCountries=useMemo(()=>selectedCodes.map(code=>countries.find(c=>c.id===code)).filter(Boolean) as Country[],[countries,selectedCodes])

  useEffect(()=>{
    if(!pageRef.current || matchMedia("(prefers-reduced-motion: reduce)").matches)return
    const ctx=gsap.context(()=>{
      gsap.from(".world-intro",{y:24,opacity:0,duration:.88,stagger:.07,ease:"power3.out"})
      gsap.to(".world-ring-a",{rotation:360,duration:90,repeat:-1,ease:"none",transformOrigin:"50% 50%"})
      gsap.to(".world-ring-b",{rotation:-360,duration:130,repeat:-1,ease:"none",transformOrigin:"50% 50%"})
    },pageRef)
    return()=>ctx.revert()
  },[])

  useEffect(()=>{
    let alive=true
    ;(async()=>{
      try{
        const r=await fetch(`${WB}/country?format=json&per_page=400`)
        if(!r.ok)throw new Error()
        const data=await r.json()
        const rows:Country[]=(data?.[1]||[]).filter((c:Country)=>c.region?.id && c.id && c.iso2Code && c.iso2Code.length===2)
        if(alive)setCountries(rows)
      }catch{ if(alive)setError("国家列表暂时无法读取。") }
    })()
    return()=>{alive=false}
  },[])

  useEffect(()=>{
    let alive=true
    ;(async()=>{
      setLoading(true); setError("")
      try{
        const codes=selectedCodes.join(";")
        const dataUrl=`${WB}/country/${codes}/indicator/${indicator}?format=json&date=${startYear}:${endYear}&per_page=2000`
        const metaUrl=`${WB}/indicator/${indicator}?format=json`
        const [dr,mr]=await Promise.all([fetch(dataUrl),fetch(metaUrl)])
        if(!dr.ok)throw new Error()
        const data=await dr.json()
        const rows:Point[]=data?.[1]||[]
        const metaJson=mr.ok?await mr.json():null
        const next:Series[]=selectedCodes.map(code=>{
          const country=countries.find(c=>c.id===code)
          const pts=rows.filter(r=>r.countryiso3code===code && r.value!=null).map(r=>({year:Number(r.date),value:Number(r.value)})).sort((a,b)=>a.year-b.year)
          return {code,name:country?countryZh(country):code,points:pts}
        })
        if(!alive)return
        setSeries(next)
        setMeta(metaJson?.[1]?.[0]||null)
        const available=next.flatMap(s=>s.points.map(p=>p.year))
        if(available.length){
          const latest=Math.max(...available)
          setSelectedYear(y=>Math.min(Math.max(y,startYear),latest))
        }
      }catch{ if(alive){setSeries([]);setError("这组世界银行数据暂时读取失败。可以换一个指标或缩短年份范围。")} }
      finally{ if(alive)setLoading(false) }
    })()
    return()=>{alive=false}
  },[selectedCodes,indicator,startYear,endYear,countries])

  useEffect(()=>{
    if(!series.length || !chartRef.current || matchMedia("(prefers-reduced-motion: reduce)").matches)return
    const lines=[...chartRef.current.querySelectorAll<SVGPathElement>(".world-line")]
    lines.forEach((line,i)=>{
      const len=line.getTotalLength()
      gsap.fromTo(line,{strokeDasharray:len,strokeDashoffset:len},{strokeDashoffset:0,duration:1.15,delay:i*.08,ease:"power2.inOut"})
    })
    gsap.fromTo(".world-stat",{y:10,opacity:0},{y:0,opacity:1,duration:.45,stagger:.05,ease:"power2.out"})
  },[series,normalized])

  useEffect(()=>{
    if(!yearRef.current || matchMedia("(prefers-reduced-motion: reduce)").matches)return
    gsap.fromTo(yearRef.current,{y:10,opacity:.25},{y:0,opacity:1,duration:.3,ease:"power2.out"})
  },[selectedYear])

  useEffect(()=>{
    let alive=true
    ;(async()=>{
      setRankLoading(true)
      try{
        const r=await fetch(`${WB}/country/all/indicator/${indicator}?format=json&mrnev=1&per_page=500`)
        if(!r.ok)throw new Error()
        const data=await r.json()
        const valid=new Set(countries.map(c=>c.id))
        const rows:Point[]=(data?.[1]||[]).filter((x:Point)=>x.value!=null && valid.has(x.countryiso3code))
        const result=rows.map(x=>({code:x.countryiso3code,name:countryZh(countries.find(c=>c.id===x.countryiso3code)!),value:Number(x.value),year:Number(x.date)})).sort((a,b)=>b.value-a.value)
        if(alive)setRanking(result)
      }catch{ if(alive)setRanking([]) }
      finally{ if(alive)setRankLoading(false) }
    })()
    return()=>{alive=false}
  },[indicator,countries])

  const plotted=useMemo(()=>{
    if(!normalized)return series
    return series.map(s=>{
      const first=s.points[0]?.value
      return {...s,points:first?s.points.map(p=>({...p,value:(p.value/first)*100})):[]}
    })
  },[series,normalized])

  const allValues=plotted.flatMap(s=>s.points.map(p=>p.value))
  const min=allValues.length?Math.min(...allValues):0
  const max=allValues.length?Math.max(...allValues):1

  const paths=useMemo(()=>plotted.map(s=>buildPath(s.points,startYear,endYear,min,max)),[plotted,startYear,endYear,min,max])

  const latestYear=useMemo(()=>{
    const ys=series.flatMap(s=>s.points.map(p=>p.year))
    return ys.length?Math.max(...ys):endYear
  },[series,endYear])

  const currentRanking=useMemo(()=>{
    return selectedCountries.map((c,i)=>({country:c,index:i,value:nearestValue(series.find(s=>s.code===c.id),selectedYear)}))
      .sort((a,b)=>(b.value??-Infinity)-(a.value??-Infinity))
  },[selectedCountries,series,selectedYear])

  const pickerResults=useMemo(()=>{
    const q=search.trim().toLowerCase()
    const list=countries.filter(c=>!selectedCodes.includes(c.id))
    if(!q)return list.slice(0,30)
    return list.filter(c=>`${c.name} ${countryZh(c)} ${c.id} ${c.iso2Code}`.toLowerCase().includes(q)).slice(0,40)
  },[countries,search,selectedCodes])

  const addCountry=(code:string)=>{
    if(selectedCodes.length>=5)return
    setSelectedCodes(v=>[...v,code]);setPickerOpen(false);setSearch("")
  }
  const removeCountry=(code:string)=>{ if(selectedCodes.length<=1)return; setSelectedCodes(v=>v.filter(x=>x!==code)) }
  const applyCustom=()=>{ const code=customCode.trim().toUpperCase(); if(code){setIndicator(code);setCustomCode("")} }

  return <main ref={pageRef} className="min-h-screen overflow-hidden bg-[#ece9df] text-[#20231f] selection:bg-[#20231f] selection:text-white">
    <style>{`.world-scroll::-webkit-scrollbar{width:4px;height:4px}.world-scroll::-webkit-scrollbar-thumb{background:rgba(0,0,0,.14)}.world-num{font-variant-numeric:tabular-nums lining-nums}`}</style>

    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_8%,rgba(180,155,93,.11),transparent_26%),radial-gradient(circle_at_8%_92%,rgba(83,118,105,.10),transparent_30%)]"/>
      <div className="world-ring-a absolute right-[-17vw] top-[-22vw] h-[58vw] w-[58vw] rounded-full border border-black/[.05]"><span className="absolute left-[16%] top-[38%] h-2 w-2 rounded-full bg-[#b38a39]/45"/></div>
      <div className="world-ring-b absolute bottom-[-25vw] left-[-18vw] h-[55vw] w-[55vw] rounded-full border border-black/[.04]"><span className="absolute right-[13%] top-[29%] h-1.5 w-1.5 rounded-full bg-[#31594e]/40"/></div>
    </div>

    <div className="relative z-10 mx-auto max-w-[1580px] px-4 pb-8 pt-6 sm:px-7 lg:px-9">
      <div className="world-intro flex items-center justify-between gap-4"><Breadcrumb/><div className="hidden text-[9px] tracking-[.13em] text-black/27 sm:block">WORLD BANK · INDICATORS API V2</div></div>

      <header className="world-intro mt-12 grid gap-8 lg:grid-cols-[1fr_.74fr] lg:items-end">
        <div><div className="text-[9px] font-semibold tracking-[.2em] text-black/26">WORLD LENS / 全球数据观察台</div><h1 className="mt-4 max-w-[850px] text-[clamp(52px,7vw,105px)] font-semibold leading-[.9] tracking-[-.073em]">全球<br/>国家数据监测</h1></div>
        <div className="border-t border-black/12 pt-5"><p className="max-w-lg text-[11px] leading-6 text-black/40">世界银行负责提供时间序列，BitLeap 把它变成可拖动、可比较、可导出的长期变化视图。最多同时观察 5 个国家。</p></div>
      </header>

      <section className="world-intro mt-14 border-y border-black/10 py-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="world-scroll flex gap-2 overflow-x-auto pb-1">
            {selectedCountries.map((c,i)=><div key={c.id} className="flex shrink-0 items-center gap-3 rounded-full border border-black/10 bg-white/28 py-1.5 pl-2 pr-3">
              <span className="h-5 w-5 rounded-full" style={{backgroundColor:COUNTRY_COLORS[i]}}/>
              <span className="text-[10px] font-semibold">{countryZh(c)}</span>
              {selectedCodes.length>1&&<button onClick={()=>removeCountry(c.id)} className="text-[10px] text-black/25 hover:text-black">×</button>}
            </div>)}
            {selectedCodes.length<5&&<button onClick={()=>setPickerOpen(true)} className="shrink-0 rounded-full border border-dashed border-black/16 px-4 py-2 text-[9px] text-black/35 hover:border-black/30 hover:text-black">＋ 添加国家</button>}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-[9px] text-black/32"><input type="checkbox" checked={normalized} onChange={e=>setNormalized(e.target.checked)} className="accent-[#20231f]"/>指数化比较（起点=100）</label>
            <button disabled={!series.length} onClick={()=>csv(series,preset)} className="rounded-full border border-black/10 px-4 py-2 text-[9px] text-black/38 disabled:opacity-30">导出 CSV</button>
          </div>
        </div>
      </section>

      <section className="mt-7">
        <div className="world-scroll flex gap-2 overflow-x-auto pb-2">
          {PRESETS.map(p=><button key={p.code} onClick={()=>setIndicator(p.code)} className={`min-w-[145px] rounded-[20px] border p-4 text-left transition ${indicator===p.code?"border-[#20231f] bg-[#20231f] text-white":"border-black/[.08] bg-white/22 hover:bg-white/50"}`}>
            <span className={`text-[8px] ${indicator===p.code?"text-white/35":"text-black/25"}`}>{p.code}</span><b className="mt-3 block text-sm">{p.zh}</b><span className={`mt-1 block text-[8px] ${indicator===p.code?"text-white/38":"text-black/28"}`}>{p.short}</span>
          </button>)}
          <div className="min-w-[205px] rounded-[20px] border border-dashed border-black/13 p-4"><span className="text-[8px] text-black/25">CUSTOM INDICATOR</span><input value={customCode} onChange={e=>setCustomCode(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")applyCustom()}} placeholder="例如 SE.ADT.LITR.ZS" className="mt-3 w-full bg-transparent font-mono text-[10px] outline-none placeholder:text-black/20"/><button onClick={applyCustom} className="mt-3 text-[9px] font-semibold">载入 →</button></div>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[9px] tracking-[.15em] text-black/25">{indicator}</div>
            <h2 className="mt-1 text-[clamp(30px,4vw,55px)] font-semibold tracking-[-.055em]">{preset.zh}</h2>
            <div className="mt-2 text-[9px] text-black/28">{meta?.source?.value||"World Bank Indicators"} · {meta?.unit||"latest available observations"}</div>
          </div>
          <div className="flex flex-wrap gap-3 text-[9px] text-black/34">
            <label>从 <input type="number" min={1960} max={endYear} value={startYear} onChange={e=>setStartYear(Math.min(endYear,Math.max(1960,Number(e.target.value)||2000)))} className="w-14 border-b border-black/15 bg-transparent text-center font-semibold outline-none"/></label>
            <label>到 <input type="number" min={startYear} max={CURRENT_YEAR} value={endYear} onChange={e=>setEndYear(Math.max(startYear,Math.min(CURRENT_YEAR,Number(e.target.value)||CURRENT_YEAR)))} className="w-14 border-b border-black/15 bg-transparent text-center font-semibold outline-none"/></label>
          </div>
        </div>

        <div className="relative mt-5 min-h-[470px] overflow-hidden rounded-[30px] border border-black/[.075] bg-white/28 p-2 sm:p-5">
          <span ref={yearRef} className="pointer-events-none absolute right-4 top-2 select-none text-[clamp(90px,18vw,250px)] font-semibold leading-none tracking-[-.09em] text-black/[.035]">{selectedYear}</span>
          {loading&&<div className="absolute inset-0 z-20 grid place-items-center bg-[#ece9df]/62 text-[9px] tracking-[.15em] text-black/30 backdrop-blur-sm">READING WORLD BANK…</div>}
          {error&&<div className="absolute bottom-5 left-6 z-20 text-[10px] text-[#9a503e]">{error}</div>}

          <svg ref={chartRef} viewBox="0 0 1000 420" className="h-[420px] w-full overflow-visible">
            {[75,145,215,285,355].map(y=><line key={y} x1="60" x2="940" y1={y} y2={y} stroke="rgba(32,35,31,.07)" strokeWidth="1"/>)}
            {plotted.map((s,i)=><path key={s.code} className="world-line" d={paths[i]} fill="none" stroke={COUNTRY_COLORS[i]} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>)}
            {plotted.map((s,i)=>{
              const p=s.points.filter(x=>x.year<=selectedYear).slice(-1)[0]
              if(!p)return null
              const x=60+((p.year-startYear)/Math.max(1,endYear-startYear))*880
              const y=355-((p.value-min)/Math.max(1e-9,max-min))*280
              return <g key={`${s.code}-dot`}><circle cx={x} cy={y} r="7" fill="#ece9df" stroke={COUNTRY_COLORS[i]} strokeWidth="3"/><circle cx={x} cy={y} r="2.5" fill={COUNTRY_COLORS[i]}/></g>
            })}
          </svg>

          <div className="absolute bottom-5 left-6 right-6">
            <input type="range" min={startYear} max={latestYear} value={Math.min(selectedYear,latestYear)} onChange={e=>setSelectedYear(Number(e.target.value))} className="w-full accent-[#20231f]"/>
            <div className="mt-1 flex justify-between text-[8px] text-black/25"><span>{startYear}</span><span>{latestYear}</span></div>
          </div>
        </div>
      </section>

      <section className="mt-7 grid gap-px overflow-hidden rounded-[24px] bg-black/[.07] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {currentRanking.map((item,rank)=>{
          const originalIndex=selectedCountries.findIndex(c=>c.id===item.country.id)
          return <div key={item.country.id} className="world-stat bg-[#efede5] p-5">
            <div className="flex items-center justify-between"><span className="text-[8px] text-black/27">#{rank+1} · {selectedYear}</span><span className="h-2.5 w-2.5 rounded-full" style={{backgroundColor:COUNTRY_COLORS[originalIndex]}}/></div>
            <b className="mt-4 block text-lg">{countryZh(item.country)}</b>
            <div className="world-num mt-2 text-2xl font-semibold tracking-[-.04em]">{formatValue(item.value,preset)}</div>
            <div className="mt-3 text-[8px] text-black/28">{item.country.region.value} · {item.country.incomeLevel.value}</div>
          </div>
        })}
      </section>

      <section className="mt-14 grid gap-10 border-t border-black/10 pt-7 lg:grid-cols-[.74fr_1.26fr]">
        <div>
          <div className="text-[9px] font-semibold tracking-[.15em] text-black/26">LATEST GLOBAL RANK</div>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-.045em]">这个指标，世界排成什么样。</h2>
          <p className="mt-4 max-w-md text-[10px] leading-5 text-black/34">排名使用 World Bank API 返回的最近非空观测值。不同国家的“最新年份”可能并不完全相同，因此右侧同时显示数据年份。</p>
          <div className="mt-6 flex gap-5 border-y border-black/10 py-4 text-[9px]">
            <div><span className="block text-black/25">国家数</span><b className="mt-1 block text-lg">{ranking.length||"—"}</b></div>
            <div><span className="block text-black/25">状态</span><b className="mt-1 block text-sm">{rankLoading?"读取中":"最近非空值"}</b></div>
          </div>
        </div>

        <div className="world-scroll max-h-[520px] overflow-auto">
          {ranking.slice(0,30).map((row,index)=><button key={row.code} onClick={()=>{if(!selectedCodes.includes(row.code)){selectedCodes.length<5?setSelectedCodes(v=>[...v,row.code]):setSelectedCodes(v=>[...v.slice(1),row.code])}}} className="grid w-full grid-cols-[42px_1fr_auto_48px] items-center gap-3 border-b border-black/[.07] py-3 text-left transition hover:bg-white/25">
            <span className="world-num text-[10px] text-black/26">{String(index+1).padStart(2,"0")}</span><span className="text-[11px] font-medium">{row.name}</span><b className="world-num text-[11px]">{formatValue(row.value,preset)}</b><span className="text-right text-[8px] text-black/24">{row.year}</span>
          </button>)}
          {!ranking.length&&!rankLoading&&<div className="py-12 text-center text-[10px] text-black/30">这个指标暂时没有可用的全球排名数据</div>}
        </div>
      </section>

      {meta&&<section className="mt-14 border-t border-black/10 pt-7">
        <div className="grid gap-8 lg:grid-cols-[.5fr_1.5fr]">
          <div><div className="text-[9px] tracking-[.15em] text-black/25">INDICATOR NOTE</div><h2 className="mt-2 text-xl font-semibold">{meta.name}</h2><div className="mt-2 text-[9px] text-black/29">{meta.source.value}</div></div>
          <div><p className="text-[10px] leading-6 text-black/40">{meta.sourceNote||"World Bank API 没有为该指标返回说明。"}</p>{meta.sourceOrganization&&<p className="mt-4 text-[9px] leading-5 text-black/27">来源：{meta.sourceOrganization}</p>}</div>
        </div>
      </section>}

      <div className="mt-14 border-t border-black/10 pt-5 text-[9px] leading-5 text-black/25">数据来自 World Bank Indicators API v2。API 无需 API Key。不同指标的数据更新周期、统计口径和可用年份不同；“最近值”不应自动理解为同一个统计年份。</div>
      <div className="mt-5 border-t border-black/[.07] pt-5"><FooterNote/></div>
    </div>

    {pickerOpen&&<div className="fixed inset-0 z-50 flex items-end justify-center bg-black/20 backdrop-blur-sm sm:items-center sm:p-5" onClick={()=>setPickerOpen(false)}>
      <div className="w-full max-w-[650px] rounded-t-[30px] bg-[#f1eee6] p-6 shadow-2xl sm:rounded-[30px] sm:p-8" onClick={e=>e.stopPropagation()}>
        <div className="flex items-start justify-between"><div><div className="text-[8px] tracking-[.15em] text-black/25">COUNTRY PICKER</div><h2 className="mt-2 text-2xl font-semibold tracking-[-.04em]">添加一个国家</h2></div><button onClick={()=>setPickerOpen(false)} className="text-[10px] text-black/35">关闭</button></div>
        <input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="搜索 中国 / Japan / BRA…" className="mt-6 w-full border-b border-black/15 bg-transparent py-3 text-sm outline-none placeholder:text-black/20"/>
        <div className="world-scroll mt-4 max-h-[430px] overflow-auto">
          {pickerResults.map(c=><button key={c.id} onClick={()=>addCountry(c.id)} className="flex w-full items-center justify-between border-b border-black/[.07] py-3 text-left"><div><b className="text-xs">{countryZh(c)}</b><span className="ml-2 text-[9px] text-black/28">{c.name}</span></div><span className="font-mono text-[9px] text-black/28">{c.id}</span></button>)}
        </div>
      </div>
    </div>}
  </main>
}
