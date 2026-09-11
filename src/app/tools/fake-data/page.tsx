"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { generateData, FIELD_OPTIONS } from "./generator"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type CopyKey = string | null
type ExportMode = "json" | "csv" | "sql" | "markdown" | "typescript"
type ViewMode = "table" | "cards" | "raw"
type Density = "compact" | "comfortable" | "spacious"
type FieldOption = { key: string; label: string; category?: string }
type FieldGroup = { name: string; fields: FieldOption[] }

const fieldOptions = FIELD_OPTIONS as FieldOption[]

const FIELD_PRESETS: Array<{ name: string; desc: string; fields: string[] }> = [
  { name: "联系资料", desc: "姓名、邮箱、手机号等常用用户字段。", fields: ["姓名", "邮箱", "手机号", "电话", "用户名", "昵称"] },
  { name: "用户档案", desc: "适合账号、CRM、后台列表。", fields: ["姓名", "性别", "年龄", "邮箱", "手机号", "城市", "地址", "生日"] },
  { name: "企业客户", desc: "公司、职位、地址、联系方式。", fields: ["公司", "职位", "姓名", "邮箱", "手机号", "城市", "地址"] },
  { name: "开发测试", desc: "ID、IP、URL、时间、布尔值。", fields: ["ID", "UUID", "IP", "URL", "日期", "时间", "状态", "布尔"] },
  { name: "全字段", desc: "生成器当前提供的所有字段。", fields: fieldOptions.map((field) => field.key) },
]

const COUNT_OPTIONS = [1, 5, 10, 20, 50, 100, 200, 500]

function classifyField(field: FieldOption) {
  const text = `${field.key} ${field.label}`.toLowerCase()
  if (field.category) return field.category
  if (/姓名|邮箱|手机|电话|用户|昵称|name|email|phone|user/.test(text)) return "身份 / 联系"
  if (/城市|地址|省|国家|邮编|city|address|country/.test(text)) return "地域 / 地址"
  if (/公司|职位|部门|组织|company|job|title/.test(text)) return "企业 / 职位"
  if (/日期|时间|生日|created|updated|date|time/.test(text)) return "日期 / 时间"
  if (/id|uuid|ip|url|状态|布尔|number|boolean/.test(text)) return "技术 / 系统"
  return "其他字段"
}

function groupFields(fields: FieldOption[]): FieldGroup[] {
  const map = new Map<string, FieldOption[]>()
  fields.forEach((field) => {
    const category = classifyField(field)
    map.set(category, [...(map.get(category) ?? []), field])
  })
  return Array.from(map.entries()).map(([name, items]) => ({ name, fields: items }))
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function safeCount(value: number) {
  if (!Number.isFinite(value)) return 10
  return clamp(Math.round(value), 1, 500)
}

function numberText(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value)
}

function randomSeed() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID().slice(0, 8)
  return Math.random().toString(36).slice(2, 10)
}

function pickExisting(fields: string[]) {
  const available = new Set(fieldOptions.map((field) => field.key))
  const picked = fields.filter((field) => available.has(field))
  return picked.length ? picked : fieldOptions.slice(0, 3).map((field) => field.key)
}

function filterRows(rows: Record<string, string>[], selectedFields: string[]) {
  return rows.map((row) => {
    const next: Record<string, string> = {}
    selectedFields.forEach((key) => {
      next[key] = row[key] ?? ""
    })
    return next
  })
}

function escapeCsv(value: string) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`
}

function toCsv(rows: Record<string, string>[], selectedFields: string[]) {
  const header = selectedFields.map(escapeCsv).join(",")
  const body = rows.map((row) => selectedFields.map((key) => escapeCsv(row[key] ?? "")).join(",")).join("\n")
  return body ? `${header}\n${body}` : header
}

function escapeSql(value: string) {
  return String(value ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'")
}

function toSql(rows: Record<string, string>[], selectedFields: string[], tableName: string) {
  const safeTableName = tableName.trim() || "users"
  const headers = selectedFields.map((key) => `\`${key.replace(/`/g, "")}\``).join(", ")
  const values = rows
    .map((row) => `(${selectedFields.map((key) => `'${escapeSql(row[key] ?? "")}'`).join(", ")})`)
    .join(",\n")
  return `INSERT INTO \`${safeTableName.replace(/`/g, "")}\` (${headers}) VALUES\n${values};`
}

function toMarkdown(rows: Record<string, string>[], selectedFields: string[]) {
  if (!selectedFields.length) return ""
  const header = `| ${selectedFields.join(" | ")} |`
  const divider = `| ${selectedFields.map(() => "---").join(" | ")} |`
  const body = rows.map((row) => `| ${selectedFields.map((key) => String(row[key] ?? "").replace(/\|/g, "\\|")).join(" | ")} |`).join("\n")
  return [header, divider, body].filter(Boolean).join("\n")
}

function toTypeScript(selectedFields: string[]) {
  const body = selectedFields.map((field) => `  "${field.replace(/"/g, '\\"')}": string`).join("\n")
  return `type FakeDataRow = {\n${body}\n}`
}

function downloadText(content: string, filename: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 500)
}

function TogglePill({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`rounded-full border px-3.5 py-2 text-[8px] font-semibold transition ${active ? "border-[#52685d]/20 bg-[#52685d] text-white" : "border-black/[.085] text-black/34 hover:bg-white/45 hover:text-black"}`}>
      {label}
    </button>
  )
}

function StatBox({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "green" | "gold" | "rose" }) {
  const toneClass = tone === "green" ? "text-[#52685d]" : tone === "gold" ? "text-[#9b7542]" : tone === "rose" ? "text-[#965744]" : "text-black/62"
  return (
    <div className="bg-[#f3f0e8]/92 p-4">
      <div className="text-[7px] font-semibold tracking-[.12em] text-black/23">{label}</div>
      <div className={`fake-num mt-3 truncate font-mono text-[13px] font-semibold ${toneClass}`}>{value}</div>
    </div>
  )
}

function OutputBlock({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
  return (
    <article className="border-t border-white/[.07] py-4 first:border-t-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[8px] font-semibold tracking-[.14em] text-white/22">{label}</span>
        <button type="button" onClick={onCopy} className="text-[8px] font-semibold text-white/28 transition hover:text-white">{copied ? "✓ COPIED" : "COPY"}</button>
      </div>
      <pre className="fake-dark-scroll max-h-48 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-5 text-[#cbd8cd]">{value}</pre>
    </article>
  )
}

function FieldCheckbox({ field, checked, onToggle }: { field: FieldOption; checked: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className={`flex w-full items-center justify-between gap-3 rounded-[16px] border px-3 py-2.5 text-left transition ${checked ? "border-[#52685d]/20 bg-[#52685d] text-white" : "border-black/[.07] bg-white/24 text-black/52 hover:bg-white/50"}`}>
      <span className="min-w-0 truncate text-[10px] font-semibold">{field.label || field.key}</span>
      <span className={`shrink-0 font-mono text-[7px] ${checked ? "text-white/40" : "text-black/24"}`}>{field.key}</span>
    </button>
  )
}

export default function FakeData() {
  const [seed, setSeed] = useState("bitleap")
  const [count, setCount] = useState(10)
  const [selectedFields, setSelectedFields] = useState<string[]>(() => pickExisting(["姓名", "邮箱", "手机号"]))
  const [results, setResults] = useState<Record<string, string>[]>([])
  const [copied, setCopied] = useState<CopyKey>(null)
  const [fieldQuery, setFieldQuery] = useState("")
  const [viewMode, setViewMode] = useState<ViewMode>("table")
  const [density, setDensity] = useState<Density>("comfortable")
  const [tableName, setTableName] = useState("users")
  const [exportMode, setExportMode] = useState<ExportMode>("json")
  const [autoGenerate, setAutoGenerate] = useState(false)
  const [error, setError] = useState("")

  const pageRef = useRef<HTMLDivElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  const selectedSet = useMemo(() => new Set(selectedFields), [selectedFields])
  const visibleFields = useMemo(() => {
    const query = fieldQuery.trim().toLowerCase()
    const list = query ? fieldOptions.filter((field) => `${field.key} ${field.label}`.toLowerCase().includes(query)) : fieldOptions
    return groupFields(list)
  }, [fieldQuery])
  const filtered = useMemo(() => filterRows(results, selectedFields), [results, selectedFields])
  const jsonText = useMemo(() => JSON.stringify(filtered, null, 2), [filtered])
  const csvText = useMemo(() => toCsv(filtered, selectedFields), [filtered, selectedFields])
  const sqlText = useMemo(() => toSql(filtered, selectedFields, tableName), [filtered, selectedFields, tableName])
  const markdownText = useMemo(() => toMarkdown(filtered, selectedFields), [filtered, selectedFields])
  const tsText = useMemo(() => toTypeScript(selectedFields), [selectedFields])
  const activeOutput = useMemo(() => {
    if (exportMode === "csv") return csvText
    if (exportMode === "sql") return sqlText
    if (exportMode === "markdown") return markdownText
    if (exportMode === "typescript") return tsText
    return jsonText
  }, [csvText, exportMode, jsonText, markdownText, sqlText, tsText])
  const report = useMemo(
    () =>
      [
        "BitLeap Fake Data Studio",
        "",
        `Seed: ${seed}`,
        `Count: ${count}`,
        `Fields: ${selectedFields.join(", ") || "—"}`,
        `Rows generated: ${results.length}`,
        `Table: ${tableName}`,
        "",
        "JSON:",
        jsonText || "[]",
      ].join("\n"),
    [count, jsonText, results.length, seed, selectedFields, tableName],
  )

  const rowClass = density === "compact" ? "px-3 py-2" : density === "spacious" ? "px-5 py-4" : "px-4 py-3"
  const hasRows = results.length > 0

  const generate = () => {
    if (!selectedFields.length) {
      setError("请至少选择一个字段。")
      return
    }

    const nextCount = safeCount(count)
    setCount(nextCount)
    setError("")
    setResults(generateData({ seed: seed || "bitleap", count: nextCount }) as Record<string, string>[])
  }

  useEffect(() => {
    generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!autoGenerate) return
    generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, count, selectedFields, autoGenerate])

  useEffect(() => {
    if (!pageRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const ctx = gsap.context(() => {
      gsap.from(".fake-intro", { opacity: 0, y: 18, duration: 0.72, stagger: 0.055, ease: "power3.out" })
      gsap.to(".fake-orbit", { rotation: 360, duration: 104, repeat: -1, ease: "none", transformOrigin: "50% 50%" })
    }, pageRef)
    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (!resultRef.current || !hasRows || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    gsap.fromTo(resultRef.current, { opacity: 0.82, y: 6 }, { opacity: 1, y: 0, duration: 0.22, ease: "power2.out", overwrite: true })
  }, [hasRows, results.length, viewMode])

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {
      setError("复制失败，请手动复制。")
    }
  }

  const toggleField = (key: string) => {
    setSelectedFields((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]))
  }

  const applyFieldPreset = (fields: string[]) => {
    setSelectedFields(pickExisting(fields))
  }

  const selectAllFields = () => setSelectedFields(fieldOptions.map((field) => field.key))
  const clearFields = () => setSelectedFields([])

  const download = () => {
    const ext = exportMode === "typescript" ? "ts" : exportMode === "markdown" ? "md" : exportMode
    const mime = exportMode === "json" ? "application/json;charset=utf-8" : exportMode === "csv" ? "text/csv;charset=utf-8" : "text/plain;charset=utf-8"
    downloadText(activeOutput, `bitleap-fake-data.${ext}`, mime)
  }

  return (
    <div ref={pageRef} className="min-h-screen overflow-hidden bg-[#f0eee8] text-[#22231f] selection:bg-[#22231f] selection:text-white">
      <style>{`
        .fake-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
        .fake-scroll::-webkit-scrollbar-track { background: transparent; }
        .fake-scroll::-webkit-scrollbar-thumb { background: rgba(34,35,31,.13); border-radius: 999px; }
        .fake-dark-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.13); }
        .fake-num { font-variant-numeric: tabular-nums lining-nums; }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_84%_10%,rgba(178,141,72,.08),transparent_25%),radial-gradient(circle_at_8%_88%,rgba(82,104,93,.08),transparent_29%)]" />
        <div className="fake-orbit absolute right-[-18vw] top-[-22vw] h-[56vw] w-[56vw] rounded-full border border-black/[.035]">
          <span className="absolute left-[18%] top-[44%] h-2 w-2 rounded-full bg-[#52685d]/30" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1680px] px-5 pb-10 pt-6 sm:px-8">
        <div className="fake-intro">
          <Breadcrumb />
        </div>

        <header className="fake-intro mt-8 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.76fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/25">FAKE DATA STUDIO</div>
            <h1 className="mt-4 text-[clamp(48px,6.2vw,88px)] font-semibold leading-[1.02] tracking-[-.055em]">假数据，<br />生成得像真表。</h1>
          </div>
          <div>
            <p className="max-w-[590px] text-[11px] leading-6 text-black/40">保留你现有的 generateData / FIELD_OPTIONS 数据源，重新做成“字段库 + 数据表 + 导出台”的工作流。相同 seed 可复现，适合接口 mock、后台列表、表单测试和演示数据。</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {FIELD_PRESETS.map((preset) => <button key={preset.name} type="button" onClick={() => applyFieldPreset(preset.fields)} className="rounded-full border border-black/[.08] px-3.5 py-2 text-[8px] font-semibold text-black/34 transition hover:bg-white/50 hover:text-black">{preset.name}</button>)}
            </div>
          </div>
        </header>

        <section className="fake-intro mt-7 grid gap-5 xl:grid-cols-[320px_1fr_360px]">
          <aside className="min-w-0 space-y-4">
            <div className="rounded-[30px] border border-black/[.075] bg-white/24 p-5">
              <div className="text-[8px] font-semibold tracking-[.14em] text-black/24">GENERATOR</div>
              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-[8px] font-semibold tracking-[.12em] text-black/24">SEED</span>
                  <div className="flex gap-2">
                    <input value={seed} onChange={(event) => setSeed(event.target.value)} className="min-w-0 flex-1 rounded-full border border-black/[.08] bg-white/35 px-4 py-3 font-mono text-[10px] outline-none focus:border-black/22" />
                    <button type="button" onClick={() => setSeed(randomSeed())} className="rounded-full border border-black/[.08] px-3.5 py-2 text-[8px] font-semibold text-black/34 transition hover:bg-white/50">随机</button>
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[8px] font-semibold tracking-[.12em] text-black/24">COUNT</span>
                  <div className="grid grid-cols-[1fr_92px] gap-2">
                    <input type="range" min={1} max={500} value={count} onChange={(event) => setCount(safeCount(Number(event.target.value)))} className="accent-[#52685d]" />
                    <input type="number" min={1} max={500} value={count} onChange={(event) => setCount(safeCount(Number(event.target.value)))} className="rounded-full border border-black/[.08] bg-white/35 px-3 py-2 text-right font-mono text-[10px] outline-none" />
                  </div>
                </label>

                <div className="grid grid-cols-4 gap-1.5">
                  {COUNT_OPTIONS.map((item) => <button key={item} type="button" onClick={() => setCount(item)} className="rounded-[14px] bg-white/32 px-2 py-2.5 font-mono text-[8px] font-semibold text-black/34 transition hover:bg-white/60">{item}</button>)}
                </div>

                <div className="flex flex-wrap gap-2">
                  <TogglePill active={autoGenerate} label="自动生成" onClick={() => setAutoGenerate((value) => !value)} />
                  <button type="button" onClick={generate} className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white transition active:scale-[.98]">生成数据</button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[22px] border border-black/[.075] bg-black/[.06]">
              <StatBox label="ROWS" value={numberText(results.length)} tone="green" />
              <StatBox label="FIELDS" value={numberText(selectedFields.length)} tone="gold" />
              <StatBox label="SEED" value={seed || "—"} />
              <StatBox label="OUTPUT" value={exportMode.toUpperCase()} tone="rose" />
            </div>

            <div className="rounded-[24px] border border-black/[.075] bg-white/24 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">FIELD LIBRARY</div>
                  <p className="mt-2 text-[8px] leading-4 text-black/30">选择需要出现在导出里的字段。</p>
                </div>
                <div className="flex gap-1.5">
                  <button type="button" onClick={selectAllFields} className="text-[8px] font-semibold text-black/35 hover:text-black">全选</button>
                  <button type="button" onClick={clearFields} className="text-[8px] font-semibold text-[#965744]">清空</button>
                </div>
              </div>

              <input value={fieldQuery} onChange={(event) => setFieldQuery(event.target.value)} placeholder="搜索字段..." className="mb-4 w-full rounded-full border border-black/[.08] bg-white/35 px-4 py-3 text-[10px] outline-none focus:border-black/22" />

              <div className="fake-scroll max-h-[560px] space-y-5 overflow-auto pr-1">
                {visibleFields.map((group) => (
                  <div key={group.name}>
                    <div className="mb-2 text-[7px] font-semibold tracking-[.13em] text-black/23">{group.name}</div>
                    <div className="space-y-1.5">
                      {group.fields.map((field) => <FieldCheckbox key={field.key} field={field} checked={selectedSet.has(field.key)} onToggle={() => toggleField(field.key)} />)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <main ref={resultRef} className="min-w-0 overflow-hidden rounded-[32px] border border-black/[.08] bg-[#151714]">
            <div className="flex flex-col gap-3 border-b border-white/[.065] px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-[8px] font-semibold tracking-[.13em] text-white/24">DATA PREVIEW</div>
                <p className="mt-2 text-[8px] text-white/28">当前只展示已选字段，导出也会同步过滤。</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["table", "cards", "raw"] as ViewMode[]).map((mode) => <button key={mode} type="button" onClick={() => setViewMode(mode)} className={`rounded-full px-3 py-2 font-mono text-[8px] font-semibold transition ${viewMode === mode ? "bg-white text-[#151714]" : "border border-white/[.08] text-white/28 hover:bg-white/[.06]"}`}>{mode}</button>)}
              </div>
            </div>

            {!hasRows ? (
              <div className="grid h-[740px] place-items-center p-8 text-center">
                <div>
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-white/[.08] text-[24px] text-white/26">↳</div>
                  <p className="mt-5 text-[10px] text-white/28">左侧配置 seed、字段和数量后生成数据。</p>
                </div>
              </div>
            ) : (
              <div className="fake-dark-scroll h-[740px] overflow-auto">
                {viewMode === "table" && (
                  <table className="w-full min-w-[760px] text-left text-[10px]">
                    <thead className="sticky top-0 z-10 bg-[#151714] text-[8px] uppercase tracking-[.12em] text-white/22">
                      <tr>{selectedFields.map((field) => <th key={field} className="border-b border-white/[.065] px-4 py-3 font-semibold">{field}</th>)}</tr>
                    </thead>
                    <tbody>
                      {filtered.map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-b border-white/[.045] transition hover:bg-white/[.035]">
                          {selectedFields.map((field) => <td key={field} className={`${rowClass} max-w-[240px] truncate font-mono text-[#cbd8cd]`} title={row[field]}>{row[field] || <span className="text-white/18">empty</span>}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {viewMode === "cards" && (
                  <div className="grid gap-3 p-5 lg:grid-cols-2">
                    {filtered.map((row, rowIndex) => (
                      <article key={rowIndex} className="rounded-[22px] border border-white/[.065] bg-white/[.035] p-4">
                        <div className="mb-3 font-mono text-[8px] text-white/22">ROW {String(rowIndex + 1).padStart(2, "0")}</div>
                        <div className="space-y-2">
                          {selectedFields.map((field) => <div key={field} className="grid grid-cols-[92px_1fr] gap-3 text-[9px]"><span className="truncate text-white/26">{field}</span><span className="break-all font-mono text-[#cbd8cd]">{row[field] || "—"}</span></div>)}
                        </div>
                      </article>
                    ))}
                  </div>
                )}

                {viewMode === "raw" && <pre className="whitespace-pre-wrap break-all p-5 font-mono text-[10px] leading-5 text-[#cbd8cd]">{jsonText}</pre>}
              </div>
            )}
          </main>

          <aside className="min-w-0">
            <div className="sticky top-6 overflow-hidden rounded-[28px] border border-black/[.08] bg-[#151714]">
              <div className="border-b border-white/[.06] px-5 py-4">
                <div className="text-[8px] font-semibold tracking-[.13em] text-white/22">EXPORT</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["json", "csv", "sql", "markdown", "typescript"] as ExportMode[]).map((mode) => <button key={mode} type="button" onClick={() => setExportMode(mode)} className={`rounded-full px-3 py-2 font-mono text-[8px] font-semibold transition ${exportMode === mode ? "bg-white text-[#151714]" : "border border-white/[.08] text-white/28 hover:bg-white/[.06]"}`}>{mode}</button>)}
                </div>
              </div>

              <div className="p-5">
                <label className="mb-4 block">
                  <span className="mb-2 block text-[8px] font-semibold tracking-[.12em] text-white/22">SQL TABLE NAME</span>
                  <input value={tableName} onChange={(event) => setTableName(event.target.value)} className="w-full rounded-full border border-white/[.08] bg-white/[.035] px-4 py-3 font-mono text-[10px] text-white/64 outline-none focus:border-white/20" />
                </label>
                <OutputBlock label={exportMode.toUpperCase()} value={activeOutput || "No output"} copied={copied === exportMode} onCopy={() => copy(activeOutput, exportMode)} />
                <OutputBlock label="REPORT" value={report} copied={copied === "report"} onCopy={() => copy(report, "report")} />
              </div>

              <div className="border-t border-white/[.06] p-5">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => copy(activeOutput, exportMode)} disabled={!hasRows && exportMode !== "typescript"} className="rounded-full bg-white px-4 py-3 text-[9px] font-semibold text-[#151714] transition disabled:opacity-30">{copied === exportMode ? "✓ 已复制" : "复制输出"}</button>
                  <button type="button" onClick={download} disabled={!activeOutput} className="rounded-full border border-white/[.08] px-4 py-3 text-[9px] font-semibold text-white/33 transition hover:bg-white hover:text-[#151714] disabled:opacity-25">下载</button>
                  <button type="button" onClick={() => downloadText(report, "bitleap-fake-data-report.txt")} className="rounded-full border border-white/[.08] px-4 py-3 text-[9px] font-semibold text-white/33 transition hover:bg-white hover:text-[#151714]">报告</button>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[24px] border border-black/[.075] bg-white/24 p-5">
              <div className="mb-3 text-[8px] font-semibold tracking-[.13em] text-black/24">VIEW OPTIONS</div>
              <div className="flex flex-wrap gap-2">
                <TogglePill active={density === "compact"} label="紧凑" onClick={() => setDensity("compact")} />
                <TogglePill active={density === "comfortable"} label="舒适" onClick={() => setDensity("comfortable")} />
                <TogglePill active={density === "spacious"} label="宽松" onClick={() => setDensity("spacious")} />
              </div>
            </div>

            {error && <div className="mt-4 rounded-[20px] border border-[#965744]/15 bg-[#965744]/8 p-4 text-[9px] leading-5 text-[#965744]">{error}</div>}
          </aside>
        </section>

        <section className="fake-intro mt-12 grid gap-8 border-t border-black/10 pt-7 md:grid-cols-3">
          <div><div className="text-[8px] font-semibold tracking-[.11em] text-black/25">REPRODUCIBLE</div><p className="mt-2 text-[9px] leading-5 text-black/34">相同 seed 和数量会生成相同数据，适合团队复现测试用例。</p></div>
          <div><div className="text-[8px] font-semibold tracking-[.11em] text-black/25">FIELD FIRST</div><p className="mt-2 text-[9px] leading-5 text-black/34">字段库支持搜索、分组、预设和全选，结果表格只保留当前选中字段。</p></div>
          <div><div className="text-[8px] font-semibold tracking-[.11em] text-black/25">EXPORT READY</div><p className="mt-2 text-[9px] leading-5 text-black/34">JSON、CSV、SQL、Markdown 和 TypeScript 类型都能直接复制或下载。</p></div>
        </section>

        <div className="mt-12 border-t border-black/[.08] pt-5"><FooterNote /></div>
      </div>
    </div>
  )
}
