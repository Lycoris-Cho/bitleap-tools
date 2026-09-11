"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type View = "apod" | "neo" | "weather"
type Apod = { date:string; title:string; explanation:string; media_type:"image"|"video"; url:string; hdurl?:string; thumbnail_url?:string; copyright?:string }
type Neo = {
  id:string; name:string; nasa_jpl_url:string; absolute_magnitude_h:number; is_potentially_hazardous_asteroid:boolean;
  estimated_diameter:{ meters:{ estimated_diameter_min:number; estimated_diameter_max:number } };
  close_approach_data:Array<{ close_approach_date:string; relative_velocity:{ kilometers_per_hour:string }; miss_distance:{ kilometers:string; lunar:string } }>
}
type NeoFeed = { element_count:number; near_earth_objects:Record<string, Neo[]> }
type Flare = { flrID?:string; beginTime?:string; peakTime?:string; classType?:string; sourceLocation?:string }
type Cme = { activityID?:string; startTime?:string; sourceLocation?:string; note?:string; cmeAnalyses?:Array<{ speed?:number; type?:string }> }
type Storm = { gstID?:string; startTime?:string; allKpIndex?:Array<{ kpIndex?:number }> }

const NASA = "https://api.nasa.gov"
const KEY_SESSION = "bitleap-nasa-key"

function iso(d:Date){ return d.toISOString().slice(0,10) }
function shift(date:string, days:number){ const d=new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate()+days); return iso(d) }
function daysAgo(days:number){ const d=new Date(); d.setUTCDate(d.getUTCDate()-days); return iso(d) }
function fmt(v:number,d=0){ return new Intl.NumberFormat("zh-CN",{maximumFractionDigits:d}).format(v) }
function shortDate(v?:string){ if(!v)return "—"; const d=new Date(v); return Number.isNaN(d.getTime())?v.slice(0,10):`${d.getUTCMonth()+1}月${d.getUTCDate()}日` }
function approach(n:Neo){ return n.close_approach_data?.[0] }
function diameter(n:Neo){ const m=n.estimated_diameter.meters; return (m.estimated_diameter_min+m.estimated_diameter_max)/2 }
function safeKey(v:string){ return v.trim() || "DEMO_KEY" }
function downloadJson(name:string,data:unknown){ const b=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}); const u=URL.createObjectURL(b); const a=document.createElement("a"); a.href=u; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(u),500) }

export default function NasaSpaceMonitorPage(){
  const today=useMemo(()=>iso(new Date()),[])
  const [view,setView]=useState<View>("apod")
  const [key,setKey]=useState("DEMO_KEY")
  const [keyDraft,setKeyDraft]=useState("DEMO_KEY")
  const [keyOpen,setKeyOpen]=useState(false)

  const [apodDate,setApodDate]=useState(today)
  const [apod,setApod]=useState<Apod|null>(null)
  const [apodLoading,setApodLoading]=useState(false)
  const [apodError,setApodError]=useState("")

  const [neoStart,setNeoStart]=useState(today)
  const [neoDays,setNeoDays]=useState(3)
  const [feed,setFeed]=useState<NeoFeed|null>(null)
  const [neoLoading,setNeoLoading]=useState(false)
  const [neoError,setNeoError]=useState("")
  const [selectedId,setSelectedId]=useState<string|null>(null)
  const [hazardOnly,setHazardOnly]=useState(false)

  const [flares,setFlares]=useState<Flare[]>([])
  const [cmes,setCmes]=useState<Cme[]>([])
  const [storms,setStorms]=useState<Storm[]>([])
  const [weatherLoading,setWeatherLoading]=useState(false)
  const [weatherError,setWeatherError]=useState("")

  const pageRef=useRef<HTMLElement>(null)
  const viewRef=useRef<HTMLDivElement>(null)
  const apodRef=useRef<HTMLImageElement>(null)

  useEffect(()=>{ try{ const s=sessionStorage.getItem(KEY_SESSION); if(s){setKey(s);setKeyDraft(s)} }catch{} },[])

  useEffect(()=>{
    if(!pageRef.current || matchMedia("(prefers-reduced-motion: reduce)").matches)return
    const ctx=gsap.context(()=>{
      gsap.from(".space-intro",{y:24,opacity:0,duration:.85,stagger:.07,ease:"power3.out"})
      gsap.to(".orbit-a",{rotation:360,duration:72,repeat:-1,ease:"none",transformOrigin:"50% 50%"})
      gsap.to(".orbit-b",{rotation:-360,duration:104,repeat:-1,ease:"none",transformOrigin:"50% 50%"})
      gsap.to(".space-glow",{scale:1.08,opacity:.7,duration:5,repeat:-1,yoyo:true,ease:"sine.inOut"})
    },pageRef)
    return()=>ctx.revert()
  },[])

  useEffect(()=>{
    if(!viewRef.current || matchMedia("(prefers-reduced-motion: reduce)").matches)return
    const ctx=gsap.context(()=>gsap.fromTo(".view-reveal",{y:18,opacity:0},{y:0,opacity:1,duration:.62,stagger:.055,ease:"power3.out"}),viewRef)
    return()=>ctx.revert()
  },[view])

  useEffect(()=>{
    let alive=true
    ;(async()=>{
      setApodLoading(true); setApodError("")
      try{
        const q=new URLSearchParams({api_key:safeKey(key),date:apodDate,thumbs:"true"})
        const r=await fetch(`${NASA}/planetary/apod?${q}`)
        if(!r.ok)throw new Error()
        const data:Apod=await r.json()
        if(alive)setApod(data)
      }catch{ if(alive)setApodError("APOD 暂时读取失败。DEMO_KEY 可能达到额度，也可以换用自己的 NASA API Key。") }
      finally{ if(alive)setApodLoading(false) }
    })()
    return()=>{alive=false}
  },[apodDate,key])

  useEffect(()=>{
    if(!apodRef.current || !apod || apod.media_type!=="image" || matchMedia("(prefers-reduced-motion: reduce)").matches)return
    gsap.fromTo(apodRef.current,{scale:1.04,opacity:0},{scale:1,opacity:1,duration:1.15,ease:"power3.out"})
  },[apod])

  useEffect(()=>{
    if(view!=="neo")return
    let alive=true
    ;(async()=>{
      setNeoLoading(true); setNeoError("")
      try{
        const q=new URLSearchParams({start_date:neoStart,end_date:shift(neoStart,Math.min(6,neoDays-1)),api_key:safeKey(key)})
        const r=await fetch(`${NASA}/neo/rest/v1/feed?${q}`)
        if(!r.ok)throw new Error()
        const data:NeoFeed=await r.json()
        if(alive){ setFeed(data); setSelectedId(Object.values(data.near_earth_objects).flat()[0]?.id||null) }
      }catch{ if(alive)setNeoError("近地天体数据读取失败。可以缩短时间范围，或换用自己的 NASA API Key。") }
      finally{ if(alive)setNeoLoading(false) }
    })()
    return()=>{alive=false}
  },[view,neoStart,neoDays,key])

  useEffect(()=>{
    if(view!=="weather")return
    let alive=true
    ;(async()=>{
      setWeatherLoading(true); setWeatherError("")
      const start=daysAgo(7), end=today, k=encodeURIComponent(safeKey(key))
      try{
        const [fr,cr,sr]=await Promise.all([
          fetch(`${NASA}/DONKI/FLR?startDate=${start}&endDate=${end}&api_key=${k}`),
          fetch(`${NASA}/DONKI/CME?startDate=${start}&endDate=${end}&api_key=${k}`),
          fetch(`${NASA}/DONKI/GST?startDate=${start}&endDate=${end}&api_key=${k}`)
        ])
        if(!alive)return
        setFlares(fr.ok?await fr.json():[])
        setCmes(cr.ok?await cr.json():[])
        setStorms(sr.ok?await sr.json():[])
      }catch{ if(alive)setWeatherError("空间天气数据暂时读取失败。") }
      finally{ if(alive)setWeatherLoading(false) }
    })()
    return()=>{alive=false}
  },[view,key,today])

  const asteroids=useMemo(()=>{
    const all=Object.values(feed?.near_earth_objects||{}).flat().sort((a,b)=>Number(approach(a)?.miss_distance.kilometers||Infinity)-Number(approach(b)?.miss_distance.kilometers||Infinity))
    return hazardOnly?all.filter(n=>n.is_potentially_hazardous_asteroid):all
  },[feed,hazardOnly])

  const selected=useMemo(()=>asteroids.find(n=>n.id===selectedId)||asteroids[0]||null,[asteroids,selectedId])
  const allNeo=useMemo(()=>Object.values(feed?.near_earth_objects||{}).flat(),[feed])
  const hazards=allNeo.filter(n=>n.is_potentially_hazardous_asteroid)
  const nearest=allNeo.slice().sort((a,b)=>Number(approach(a)?.miss_distance.kilometers||Infinity)-Number(approach(b)?.miss_distance.kilometers||Infinity))[0]
  const largest=allNeo.slice().sort((a,b)=>diameter(b)-diameter(a))[0]

  const strongestFlare=useMemo(()=>{
    const score=(s="")=>{const m=s[0]==="X"?100:s[0]==="M"?10:s[0]==="C"?1:.1;return m*(Number(s.slice(1))||0)}
    return flares.slice().sort((a,b)=>score(b.classType)-score(a.classType))[0]
  },[flares])
  const fastestCme=useMemo(()=>cmes.flatMap(c=>(c.cmeAnalyses||[]).map(a=>({c,a}))).sort((x,y)=>(y.a.speed||0)-(x.a.speed||0))[0],[cmes])
  const maxKp=useMemo(()=>storms.flatMap(s=>s.allKpIndex||[]).reduce((m,x)=>Math.max(m,x.kpIndex||0),0),[storms])

  const orbitStyle=(n:Neo,index:number):React.CSSProperties=>{
    const lunar=Number(approach(n)?.miss_distance.lunar||20)
    const angle=((index*137.5+Number(n.id.slice(-3)))%360)*Math.PI/180
    const radius=Math.max(25,Math.min(43,28+Math.log10(Math.max(.15,lunar))*8+index*.35))
    const size=Math.max(18,Math.min(36,18+Math.log10(Math.max(20,diameter(n)))*7))
    return {left:`${50+Math.cos(angle)*radius}%`,top:`${50+Math.sin(angle)*radius*.62}%`,width:size,height:size}
  }

  const saveKey=()=>{ const next=safeKey(keyDraft); setKey(next); try{next==="DEMO_KEY"?sessionStorage.removeItem(KEY_SESSION):sessionStorage.setItem(KEY_SESSION,next)}catch{} setKeyOpen(false) }

  return <main ref={pageRef} className="min-h-screen overflow-hidden bg-[#090b0d] text-[#f2efe7] selection:bg-[#f2efe7] selection:text-[#090b0d]">
    <style>{`.space-scroll::-webkit-scrollbar{width:4px;height:4px}.space-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,.14)}.space-num{font-variant-numeric:tabular-nums lining-nums}`}</style>

    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_28%,rgba(91,108,124,.14),transparent_28%),radial-gradient(circle_at_18%_84%,rgba(102,80,64,.09),transparent_28%)]"/>
      <div className="space-glow absolute left-[62%] top-[16%] h-[22vw] w-[22vw] rounded-full bg-[#79899d]/10 blur-[90px]"/>
      <div className="orbit-a absolute right-[-12vw] top-[-16vw] h-[52vw] w-[52vw] rounded-full border border-white/[.045]"><span className="absolute left-[12%] top-1/2 h-1.5 w-1.5 rounded-full bg-[#f0d5a8]/70 shadow-[0_0_24px_rgba(240,213,168,.5)]"/></div>
      <div className="orbit-b absolute bottom-[-24vw] left-[-14vw] h-[50vw] w-[50vw] rounded-full border border-white/[.035]"><span className="absolute right-[14%] top-[30%] h-1 w-1 rounded-full bg-white/60"/></div>
    </div>

    <div className="relative z-10 mx-auto max-w-[1580px] px-4 pb-8 pt-6 sm:px-7 lg:px-9">
      <div className="space-intro flex items-center justify-between gap-4">
        <Breadcrumb/>
        <button type="button" onClick={()=>setKeyOpen(true)} className="rounded-full border border-white/10 px-4 py-2 text-[9px] tracking-[.08em] text-white/38 transition hover:border-white/25 hover:text-white/70">NASA KEY · {key==="DEMO_KEY"?"DEMO":"CUSTOM"}</button>
      </div>

      <header className="space-intro mt-10 flex flex-col gap-7 border-b border-white/[.08] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div><div className="text-[9px] font-semibold tracking-[.22em] text-white/24">BITLEAP / SPACE MONITOR</div><h1 className="mt-3 text-[clamp(42px,6vw,84px)] font-semibold leading-[.92] tracking-[-.065em]">把 NASA 的天空，<br className="hidden sm:block"/>变成一块实时仪表。</h1></div>
        <nav className="flex flex-wrap gap-1">
          {[["apod","今日宇宙"],["neo","近地天体"],["weather","空间天气"]].map(([id,label])=><button key={id} type="button" onClick={()=>setView(id as View)} className={`rounded-full px-4 py-2.5 text-[10px] font-semibold transition ${view===id?"bg-[#f1eee5] text-[#111316]":"text-white/35 hover:bg-white/[.05] hover:text-white/65"}`}>{label}</button>)}
        </nav>
      </header>

      <div ref={viewRef}>
        {view==="apod"&&<section className="view-reveal pt-7">
          <div className="grid min-h-[650px] overflow-hidden rounded-[30px] border border-white/[.07] bg-white/[.025] lg:grid-cols-[1.25fr_.75fr]">
            <div className="relative min-h-[430px] overflow-hidden bg-black">
              {apodLoading&&<div className="absolute inset-0 z-10 grid place-items-center text-[9px] tracking-[.15em] text-white/32">NASA SIGNAL…</div>}
              {apod?.media_type==="image"&&<img ref={apodRef} src={apod.hdurl||apod.url} alt={apod.title} className="absolute inset-0 h-full w-full object-cover"/>}
              {apod?.media_type==="video"&&<>{apod.thumbnail_url?<img src={apod.thumbnail_url} alt={apod.title} className="absolute inset-0 h-full w-full object-cover opacity-75"/>:<div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#29303a,#090b0d_65%)]"/>}<a href={apod.url} target="_blank" rel="noreferrer" className="absolute left-1/2 top-1/2 z-10 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/25 text-xl backdrop-blur-md">▶</a></>}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent"/>
              <div className="absolute bottom-5 left-5 text-[8px] tracking-[.14em] text-white/48">{apod?.copyright?`© ${apod.copyright}`:"NASA / PUBLIC DATA"}</div>
            </div>
            <div className="flex flex-col p-5 sm:p-7 lg:p-8">
              <div className="flex items-center justify-between gap-4"><span className="text-[9px] tracking-[.16em] text-white/24">ASTRONOMY PICTURE OF THE DAY</span><input type="date" max={today} value={apodDate} onChange={e=>setApodDate(e.target.value)} className="bg-transparent text-[10px] text-white/48 outline-none"/></div>
              <div className="mt-auto pt-12">
                <div className="space-num text-[10px] text-white/30">{apod?.date||apodDate}</div>
                <h2 className="mt-3 text-[clamp(30px,4vw,54px)] font-semibold leading-[.97] tracking-[-.055em]">{apod?.title||"正在接收宇宙图像"}</h2>
                <p className="space-scroll mt-6 max-h-[220px] overflow-auto pr-2 text-[11px] leading-6 text-white/42">{apod?.explanation||apodError}</p>
                <div className="mt-7 flex flex-wrap gap-2">
                  <button onClick={()=>setApodDate(shift(apodDate,-1))} className="rounded-full border border-white/10 px-4 py-2.5 text-[9px] text-white/45">← 前一天</button>
                  <button disabled={apodDate>=today} onClick={()=>setApodDate(shift(apodDate,1))} className="rounded-full border border-white/10 px-4 py-2.5 text-[9px] text-white/45 disabled:opacity-25">后一天 →</button>
                  {apod?.media_type==="image"&&<a href={apod.hdurl||apod.url} target="_blank" rel="noreferrer" className="rounded-full bg-[#f0eee6] px-4 py-2.5 text-[9px] font-semibold text-[#111316]">查看原图</a>}
                </div>
              </div>
            </div>
          </div>
        </section>}

        {view==="neo"&&<section className="pt-7">
          <div className="view-reveal flex flex-col gap-5 border-b border-white/[.08] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div><div className="text-[9px] tracking-[.16em] text-white/24">NEAR EARTH OBJECTS / NeoWs</div><div className="mt-2 flex flex-wrap items-baseline gap-4"><h2 className="text-3xl font-semibold tracking-[-.045em]">{feed?`${feed.element_count} 个近地天体`:"近地天体雷达"}</h2><span className="text-[10px] text-[#ff856e]">{hazards.length} 个潜在危险标记</span></div></div>
            <div className="flex flex-wrap items-end gap-3 text-[9px] text-white/30">
              <label>起始 <input type="date" value={neoStart} onChange={e=>setNeoStart(e.target.value)} className="ml-1 bg-transparent text-white/60 outline-none"/></label>
              <label>范围 <select value={neoDays} onChange={e=>setNeoDays(Number(e.target.value))} className="ml-1 bg-[#090b0d] text-white/60 outline-none">{[1,2,3,4,5,6,7].map(x=><option key={x}>{x}</option>)}</select> 天</label>
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={hazardOnly} onChange={e=>setHazardOnly(e.target.checked)} className="accent-[#ff806b]"/>只看危险标记</label>
              <button disabled={!feed} onClick={()=>downloadJson(`nasa-neo-${neoStart}.json`,feed)} className="rounded-full border border-white/10 px-3 py-2 disabled:opacity-25">导出 JSON</button>
            </div>
          </div>

          <div className="view-reveal grid min-h-[650px] gap-6 pt-6 lg:grid-cols-[1.12fr_.88fr]">
            <div className="relative min-h-[520px] overflow-hidden rounded-[30px] border border-white/[.07] bg-[#0d1013]">
              <div className="absolute left-5 top-5 z-20 text-[8px] tracking-[.16em] text-white/24">DISTANCE FIELD · NOT TO SCALE</div>
              <div className="absolute left-1/2 top-1/2 h-[180px] w-[180px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#7ea1bb]/20 bg-[radial-gradient(circle_at_34%_30%,#7f9eb6,#294155_28%,#14232e_58%,#0c1116_72%)] shadow-[0_0_100px_rgba(83,126,156,.16)] sm:h-[230px] sm:w-[230px]">
                <div className="absolute left-1/2 top-1/2 h-[155%] w-[155%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[.045]"/>
                <div className="absolute left-1/2 top-1/2 h-[230%] w-[230%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[.035]"/>
              </div>
              {asteroids.slice(0,36).map((n,i)=><button key={n.id} onClick={()=>setSelectedId(n.id)} className="absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border transition hover:z-30 hover:scale-125" style={{...orbitStyle(n,i),borderColor:n.is_potentially_hazardous_asteroid?"rgba(255,122,98,.45)":"rgba(231,229,216,.22)",background:n.is_potentially_hazardous_asteroid?"rgba(255,122,98,.12)":"rgba(231,229,216,.04)"}}><span className={`absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${n.is_potentially_hazardous_asteroid?"bg-[#ff7a62]":"bg-[#e7e5d8]"}`}/></button>)}
              {neoLoading&&<div className="absolute inset-0 z-40 grid place-items-center bg-[#0d1013]/65 text-[9px] tracking-[.16em] text-white/32 backdrop-blur-sm">SCANNING NEO FEED…</div>}
              {neoError&&<div className="absolute inset-x-7 bottom-7 z-40 text-[10px] leading-5 text-[#d98372]">{neoError}</div>}
            </div>

            <div className="flex min-h-[520px] flex-col">
              {selected?<><div className="border-b border-white/10 pb-5">
                <div className="flex items-center justify-between gap-4"><span className="text-[9px] tracking-[.14em] text-white/25">SELECTED OBJECT</span><span className={`rounded-full px-2.5 py-1 text-[8px] font-semibold ${selected.is_potentially_hazardous_asteroid?"bg-[#ff7a62]/12 text-[#ff856e]":"bg-white/[.05] text-white/35"}`}>{selected.is_potentially_hazardous_asteroid?"POTENTIALLY HAZARDOUS":"NORMAL PASS"}</span></div>
                <h3 className="mt-3 text-[clamp(30px,4vw,52px)] font-semibold tracking-[-.055em]">{selected.name.replace(/[()]/g,"")}</h3><div className="mt-2 text-[9px] text-white/26">JPL ID · {selected.id}</div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-[22px] bg-white/[.07]">
                {[
                  ["最近距离",`${fmt(Number(approach(selected)?.miss_distance.kilometers||0))} km`],
                  ["月球距离",`${fmt(Number(approach(selected)?.miss_distance.lunar||0),2)} LD`],
                  ["相对速度",`${fmt(Number(approach(selected)?.relative_velocity.kilometers_per_hour||0))} km/h`],
                  ["估计直径",`${fmt(diameter(selected))} m`]
                ].map(([l,v])=><div key={l} className="bg-[#0e1012] p-4"><div className="text-[8px] text-white/24">{l}</div><div className="space-num mt-2 text-sm font-semibold">{v}</div></div>)}
              </div>
              <div className="mt-5 border-t border-white/[.08] pt-4"><span className="text-[8px] text-white/24">CLOSE APPROACH</span><div className="mt-2 text-xl font-semibold">{shortDate(approach(selected)?.close_approach_date)}</div></div>
              <div className="space-scroll mt-5 flex-1 overflow-auto border-t border-white/[.08] pt-2">
                {asteroids.slice(0,18).map(n=><button key={n.id} onClick={()=>setSelectedId(n.id)} className={`flex w-full items-center justify-between gap-3 border-b border-white/[.055] py-3 text-left ${selected.id===n.id?"text-white":"text-white/38 hover:text-white/70"}`}><span className="truncate text-[10px]">{n.name}</span><span className="space-num text-[9px]">{fmt(Number(approach(n)?.miss_distance.lunar||0),2)} LD</span></button>)}
              </div></>:<div className="grid h-full place-items-center text-[10px] text-white/28">没有符合当前筛选的天体</div>}
            </div>
          </div>

          <div className="grid gap-px overflow-hidden rounded-[22px] bg-white/[.07] sm:grid-cols-4">
            {[["总计",allNeo.length||"—"],["危险标记",hazards.length],["最近",nearest?`${fmt(Number(approach(nearest)?.miss_distance.lunar||0),2)} LD`:"—"],["最大估算直径",largest?`${fmt(diameter(largest))} m`:"—"]].map(([l,v],i)=><div key={l} className="bg-[#0d0f11] p-4"><div className="text-[8px] text-white/23">{l}</div><b className={`space-num mt-2 block text-lg ${i===1?"text-[#ff806b]":""}`}>{v}</b></div>)}
          </div>
        </section>}

        {view==="weather"&&<section className="pt-7">
          <div className="view-reveal grid min-h-[620px] gap-8 lg:grid-cols-[.68fr_1.32fr] lg:items-center">
            <div><div className="text-[9px] tracking-[.18em] text-white/24">DONKI / LAST 7 DAYS</div><h2 className="mt-3 text-[clamp(45px,6vw,78px)] font-semibold leading-[.9] tracking-[-.065em]">太阳并不安静。</h2><p className="mt-6 max-w-md text-[11px] leading-6 text-white/35">把过去 7 天的太阳耀斑、日冕物质抛射和地磁暴放在同一条空间天气脉冲里。</p>
              <div className="mt-9 grid grid-cols-3 gap-5 border-y border-white/[.08] py-5"><div><span className="text-[8px] text-white/24">太阳耀斑</span><b className="space-num mt-2 block text-2xl">{flares.length}</b></div><div><span className="text-[8px] text-white/24">CME</span><b className="space-num mt-2 block text-2xl">{cmes.length}</b></div><div><span className="text-[8px] text-white/24">最大 Kp</span><b className="space-num mt-2 block text-2xl">{maxKp||"—"}</b></div></div>
            </div>
            <div className="relative min-h-[520px] overflow-hidden rounded-[32px] border border-white/[.07] bg-[#0e1011]">
              <div className="absolute left-1/2 top-1/2 h-[190px] w-[190px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_34%_31%,#fff3c9,#f6ad52_22%,#b74928_48%,#38170e_72%)] shadow-[0_0_120px_rgba(222,99,38,.22)] sm:h-[240px] sm:w-[240px]"><div className="orbit-a absolute left-1/2 top-1/2 h-[180%] w-[180%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#ed9f55]/14"/><div className="orbit-b absolute left-1/2 top-1/2 h-[250%] w-[250%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[.035]"/></div>
              <div className="absolute left-5 top-5 text-[8px] tracking-[.14em] text-white/24">SOLAR ACTIVITY FIELD</div>
              {flares.slice(0,9).map((f,i)=>{const a=(i*73+18)*Math.PI/180,r=28+(i%3)*8;return <div key={f.flrID||i} className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#ffb26c]/35 bg-[#ff9b54]/10 px-2 py-1 text-[8px] font-semibold text-[#ffc182]" style={{left:`${50+Math.cos(a)*r}%`,top:`${50+Math.sin(a)*r*.7}%`}}>{f.classType||"FLR"}</div>})}
              {weatherLoading&&<div className="absolute inset-0 grid place-items-center bg-[#0e1011]/60 text-[9px] tracking-[.15em] text-white/30 backdrop-blur-sm">READING DONKI…</div>}
            </div>
          </div>
          {weatherError&&<div className="mb-5 text-[10px] text-[#d98270]">{weatherError}</div>}
          <div className="view-reveal grid gap-px overflow-hidden rounded-[26px] bg-white/[.07] lg:grid-cols-3">
            <div className="bg-[#0d0f10] p-5"><span className="text-[8px] text-white/23">STRONGEST FLARE</span><div className="mt-4 text-4xl font-semibold text-[#ffc081]">{strongestFlare?.classType||"—"}</div><div className="mt-3 text-[9px] text-white/31">{strongestFlare?`${shortDate(strongestFlare.peakTime)} · ${strongestFlare.sourceLocation||"source unavailable"}`:"过去 7 天没有返回记录"}</div></div>
            <div className="bg-[#0d0f10] p-5"><span className="text-[8px] text-white/23">FASTEST CME</span><div className="space-num mt-4 text-4xl font-semibold">{fastestCme?.a.speed?`${fmt(fastestCme.a.speed)} km/s`:"—"}</div><div className="mt-3 text-[9px] text-white/31">{fastestCme?`${shortDate(fastestCme.c.startTime)} · ${fastestCme.a.type||"analysis"}`:"过去 7 天没有返回速度分析"}</div></div>
            <div className="bg-[#0d0f10] p-5"><span className="text-[8px] text-white/23">GEOMAGNETIC INDEX</span><div className={`space-num mt-4 text-4xl font-semibold ${maxKp>=5?"text-[#ff806b]":"text-[#91b29b]"}`}>{maxKp?`Kp ${maxKp}`:"—"}</div><div className="mt-3 text-[9px] text-white/31">{storms.length?`${storms.length} 次地磁暴事件`:"过去 7 天没有返回地磁暴"}</div></div>
          </div>
        </section>}
      </div>

      <div className="mt-12 border-t border-white/[.08] pt-5 text-[9px] leading-5 text-white/22">数据来自 NASA Open APIs：APOD、NeoWs 与 DONKI。默认使用 DEMO_KEY，正式部署建议使用自己的 NASA 开发者 Key 或服务器代理。近地天体的“潜在危险”是 NASA 数据字段，不代表即将撞击地球。</div>
      <div className="mt-5 border-t border-white/[.055] pt-5"><FooterNote/></div>
    </div>

    {keyOpen&&<div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 backdrop-blur-sm sm:items-center sm:p-5" onClick={()=>setKeyOpen(false)}>
      <div className="w-full max-w-[560px] rounded-t-[30px] border border-white/10 bg-[#111417] p-6 shadow-2xl sm:rounded-[30px] sm:p-8" onClick={e=>e.stopPropagation()}>
        <div className="flex justify-between"><div><div className="text-[8px] tracking-[.16em] text-white/24">NASA API ACCESS</div><h2 className="mt-2 text-2xl font-semibold">API Key</h2></div><button onClick={()=>setKeyOpen(false)} className="text-[10px] text-white/35">关闭</button></div>
        <p className="mt-5 text-[10px] leading-5 text-white/34">不填就使用 DEMO_KEY。自定义 Key 只保存在当前浏览器会话的 sessionStorage，并直接用于 NASA API 请求。</p>
        <input value={keyDraft} onChange={e=>setKeyDraft(e.target.value)} placeholder="DEMO_KEY" className="mt-6 w-full border-b border-white/15 bg-transparent py-3 font-mono text-sm outline-none"/>
        <div className="mt-6 flex justify-end gap-2"><button onClick={()=>{setKeyDraft("DEMO_KEY");setKey("DEMO_KEY");try{sessionStorage.removeItem(KEY_SESSION)}catch{}setKeyOpen(false)}} className="rounded-full border border-white/10 px-4 py-2.5 text-[9px] text-white/38">使用 DEMO_KEY</button><button onClick={saveKey} className="rounded-full bg-[#f1eee6] px-5 py-2.5 text-[9px] font-semibold text-[#111316]">保存并刷新</button></div>
      </div>
    </div>}
  </main>
}
