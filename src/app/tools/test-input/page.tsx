"use client"

import type { ChangeEvent } from "react"
import { groups as defaultGroups } from "./payloads"
import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type PresetItem = {
  label: string
  value: string
  note?: string
}

type PresetGroup = {
  label: string
  items: PresetItem[]
  description?: string
}

type CustomField = {
  id: string
  name: string
  values: string[]
  note?: string
}

type GeneratedCase = {
  id: string
  field: string
  label: string
  value: string
  source: string
}

type CopyKey = "all" | "group" | "json" | "csv" | "field" | "report" | string | null
type ExportMode = "plain" | "json" | "csv"
type ViewMode = "library" | "custom" | "matrix"

const CUSTOM_STORAGE_KEY = "bitleap-login-fuzzer-custom-fields-v2"
const FAVORITE_STORAGE_KEY = "bitleap-login-fuzzer-favorites-v2"

const PRESET_GROUPS = defaultGroups as PresetGroup[]

const FALLBACK_GROUP: PresetGroup = {
  label: "基础边界值",
  description: "通用表单验证边界测试。",
  items: [
    { label: "空字符串", value: "" },
    { label: "空格", value: " " },
    { label: "普通文本", value: "hello" },
    { label: "中文", value: "测试用户" },
    { label: "Emoji", value: "hello 🚀" },
    { label: "长文本", value: "a".repeat(128) },
  ],
}

const SAFE_GROUPS = PRESET_GROUPS.length ? PRESET_GROUPS : [FALLBACK_GROUP]

const QUICK_FIELDS = [
  {
    name: "用户名",
    values: ["", "admin", "test_user", "user@example.com", "中文用户名", "user-with-dash", "very_long_username_very_long_username"],
  },
  {
    name: "密码",
    values: ["", "123456", "password", "Passw0rd!", "含中文密码123", "space password", "very-long-password-very-long-password"],
  },
  {
    name: "验证码",
    values: ["", "000000", "123456", "１２３４５６", "abcdef", "12345", "1234567"],
  },
  {
    name: "手机号",
    values: ["", "13800138000", "12800138000", "+86 13800138000", "138 0013 8000", "123456"],
  },
]

const BUILT_IN_SCENARIOS = [
  {
    name: "登录基础回归",
    desc: "用户名、密码和验证码常见边界。",
    fields: ["用户名", "密码", "验证码"],
  },
  {
    name: "手机号登录",
    desc: "手机号、短信验证码和密码边界。",
    fields: ["手机号", "验证码", "密码"],
  },
  {
    name: "账号格式校验",
    desc: "邮箱、用户名、中文、空白和长度边界。",
    fields: ["用户名", "邮箱", "手机号"],
  },
]

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value)
}

function safeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase()
}

function toPrintable(value: string) {
  if (value === "") return "(空字符串)"
  if (value === " ") return "(单个空格)"
  return value
}

function escapeCsv(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }

  return value
}

function downloadText(content: string, filename: string, type = "text/plain;charset=utf-8") {
  if (!content) return

  const blob = new Blob([content], {
    type,
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 500)
}

function parseValues(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trimEnd())
    .filter((item, index, arr) => item !== "" || arr.indexOf(item) === index)
}

function groupText(group: PresetGroup) {
  return group.items.map((item) => `${item.label}: ${toPrintable(item.value)}`).join("\n")
}

function groupCsv(group: PresetGroup) {
  return [
    "group,label,value,note",
    ...group.items.map((item) => [group.label, item.label, item.value, item.note ?? ""].map(escapeCsv).join(",")),
  ].join("\n")
}

function groupJson(group: PresetGroup) {
  return JSON.stringify(
    {
      group: group.label,
      description: group.description ?? "",
      items: group.items,
    },
    null,
    2,
  )
}

function fieldToGroup(field: CustomField): PresetGroup {
  return {
    label: field.name,
    description: field.note ?? "自定义字段测试值。",
    items: field.values.map((value, index) => ({
      label: `值 ${index + 1}`,
      value,
    })),
  }
}

function buildCases(groups: PresetGroup[], customFields: CustomField[], search: string, favorites: Set<string>, favoriteOnly: boolean) {
  const query = normalizeSearch(search)
  const cases: GeneratedCase[] = []

  groups.forEach((group) => {
    group.items.forEach((item, index) => {
      const id = `preset:${group.label}:${item.label}:${index}`
      const haystack = `${group.label} ${item.label} ${item.value} ${item.note ?? ""}`.toLocaleLowerCase()
      if (query && !haystack.includes(query)) return
      if (favoriteOnly && !favorites.has(id)) return
      cases.push({
        id,
        field: group.label,
        label: item.label,
        value: item.value,
        source: "preset",
      })
    })
  })

  customFields.forEach((field) => {
    field.values.forEach((value, index) => {
      const id = `custom:${field.id}:${index}`
      const haystack = `${field.name} ${value} ${field.note ?? ""}`.toLocaleLowerCase()
      if (query && !haystack.includes(query)) return
      if (favoriteOnly && !favorites.has(id)) return
      cases.push({
        id,
        field: field.name,
        label: `自定义 ${index + 1}`,
        value,
        source: "custom",
      })
    })
  })

  return cases
}

function createPairwiseMatrix(fields: CustomField[], limit: number) {
  if (!fields.length) return []

  const usable = fields.filter((field) => field.values.length)
  if (!usable.length) return []

  const longest = Math.max(...usable.map((field) => field.values.length))
  const rows: Array<Record<string, string>> = []

  for (let index = 0; index < Math.min(longest, limit); index++) {
    const row: Record<string, string> = {}
    usable.forEach((field, fieldIndex) => {
      row[field.name] = field.values[(index + fieldIndex) % field.values.length] ?? ""
    })
    rows.push(row)
  }

  return rows
}

function matrixToText(matrix: Array<Record<string, string>>) {
  return matrix
    .map((row, index) => {
      const fields = Object.entries(row)
        .map(([key, value]) => `${key}=${toPrintable(value)}`)
        .join(" | ")
      return `#${index + 1} ${fields}`
    })
    .join("\n")
}

function matrixToCsv(matrix: Array<Record<string, string>>) {
  if (!matrix.length) return ""
  const headers = Object.keys(matrix[0])
  return [
    headers.map(escapeCsv).join(","),
    ...matrix.map((row) => headers.map((key) => escapeCsv(row[key] ?? "")).join(",")),
  ].join("\n")
}

function sampleFromQuickField(name: string) {
  return QUICK_FIELDS.find((field) => field.name === name)
}

function StatBox({
  label,
  value,
  tone = "ink",
}: {
  label: string
  value: string
  tone?: "ink" | "green" | "gold" | "rose"
}) {
  const toneClass = tone === "green" ? "text-[#52685d]" : tone === "gold" ? "text-[#9b7542]" : tone === "rose" ? "text-[#965744]" : "text-black/61"

  return (
    <div className="bg-[#f3f0e8]/92 p-4">
      <div className="text-[7px] font-semibold tracking-[.12em] text-black/23">{label}</div>
      <div className={`fuzzer-num mt-3 break-all font-mono text-[13px] font-semibold ${toneClass}`}>{value}</div>
    </div>
  )
}

function TogglePill({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`rounded-full border px-3.5 py-2 text-[8px] font-semibold transition ${active ? "border-[#52685d]/20 bg-[#52685d] text-white" : "border-black/[.085] text-black/34 hover:bg-white/45 hover:text-black"}`}>
      {label}
    </button>
  )
}

function PayloadCard({
  item,
  copied,
  favorite,
  onCopy,
  onToggleFavorite,
}: {
  item: GeneratedCase
  copied: boolean
  favorite: boolean
  onCopy: () => void
  onToggleFavorite: () => void
}) {
  return (
    <article className="group rounded-[22px] border border-black/[.075] bg-white/24 p-4 transition hover:bg-white/45">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`h-1.5 w-1.5 rounded-full ${item.source === "custom" ? "bg-[#b28d48]" : "bg-[#52685d]"}`} />
            <span className="text-[8px] font-semibold tracking-[.13em] text-black/24">{item.field}</span>
            <span className="rounded-full bg-black/[.04] px-2 py-0.5 text-[7px] font-semibold text-black/24">{item.source.toUpperCase()}</span>
          </div>
          <div className="mt-2 text-[13px] font-semibold tracking-[-.03em] text-black/68">{item.label}</div>
          <pre className="fuzzer-scroll mt-3 max-h-28 overflow-auto whitespace-pre-wrap break-all rounded-[16px] bg-[#151714] px-3 py-3 font-mono text-[10px] leading-5 text-[#cbd8cd]">{toPrintable(item.value)}</pre>
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          <button type="button" onClick={onToggleFavorite} className={`grid h-8 w-8 place-items-center rounded-full border text-[12px] transition ${favorite ? "border-[#b28d48]/25 bg-[#b28d48]/14 text-[#9b7542]" : "border-black/[.08] text-black/25 hover:bg-white/50 hover:text-black"}`} aria-label={favorite ? "取消收藏" : "收藏"}>
            {favorite ? "★" : "☆"}
          </button>
          <button type="button" onClick={onCopy} className="rounded-full border border-black/[.08] px-3 py-2 text-[8px] font-semibold text-black/31 transition hover:bg-[#22231f] hover:text-white">
            {copied ? "✓" : "COPY"}
          </button>
        </div>
      </div>
    </article>
  )
}

export default function LoginFuzzer() {
  const [activeGroupLabel, setActiveGroupLabel] = useState(SAFE_GROUPS[0]?.label ?? FALLBACK_GROUP.label)
  const [viewMode, setViewMode] = useState<ViewMode>("library")
  const [search, setSearch] = useState("")
  const [copied, setCopied] = useState<CopyKey>(null)
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [fieldName, setFieldName] = useState("")
  const [fieldValues, setFieldValues] = useState("")
  const [fieldNote, setFieldNote] = useState("")
  const [favoriteOnly, setFavoriteOnly] = useState(false)
  const [exportMode, setExportMode] = useState<ExportMode>("plain")
  const [matrixLimit, setMatrixLimit] = useState(24)
  const [error, setError] = useState("")

  const pageRef = useRef<HTMLDivElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  const activeGroup = useMemo(() => SAFE_GROUPS.find((group) => group.label === activeGroupLabel) ?? SAFE_GROUPS[0] ?? FALLBACK_GROUP, [activeGroupLabel])
  const favoriteSet = useMemo(() => new Set(favorites), [favorites])
  const allCases = useMemo(() => buildCases(SAFE_GROUPS, customFields, search, favoriteSet, favoriteOnly), [customFields, favoriteOnly, favoriteSet, search])
  const activeGroupCases = useMemo(() => buildCases([activeGroup], [], search, favoriteSet, favoriteOnly), [activeGroup, favoriteOnly, favoriteSet, search])
  const customCases = useMemo(() => buildCases([], customFields, search, favoriteSet, favoriteOnly), [customFields, favoriteOnly, favoriteSet, search])
  const matrix = useMemo(() => createPairwiseMatrix(customFields, matrixLimit), [customFields, matrixLimit])
  const activeList = viewMode === "custom" ? customCases : viewMode === "matrix" ? [] : activeGroupCases
  const parsedFieldValues = useMemo(() => parseValues(fieldValues), [fieldValues])
  const selectedOutput = useMemo(() => {
    if (viewMode === "matrix") {
      if (exportMode === "json") return JSON.stringify(matrix, null, 2)
      if (exportMode === "csv") return matrixToCsv(matrix)
      return matrixToText(matrix)
    }

    const group = viewMode === "custom" ? { label: "自定义字段", items: customCases.map((item) => ({ label: item.field, value: item.value })) } : activeGroup

    if (exportMode === "json") return JSON.stringify(group, null, 2)
    if (exportMode === "csv") return groupCsv(group)
    return viewMode === "custom" ? customCases.map((item) => `${item.field}: ${toPrintable(item.value)}`).join("\n") : groupText(activeGroup)
  }, [activeGroup, customCases, exportMode, matrix, viewMode])

  const report = useMemo(
    () =>
      [
        "BitLeap Login QA Payload Studio",
        "",
        `当前视图：${viewMode}`,
        `当前分类：${activeGroup.label}`,
        `搜索：${search || "无"}`,
        `收藏过滤：${favoriteOnly ? "开启" : "关闭"}`,
        `预设分类：${SAFE_GROUPS.length}`,
        `全部测试值：${allCases.length}`,
        `自定义字段：${customFields.length}`,
        "",
        "当前输出：",
        selectedOutput || "无内容",
      ].join("\n"),
    [activeGroup.label, allCases.length, customFields.length, favoriteOnly, search, selectedOutput, viewMode],
  )

  const stats = useMemo(
    () => ({
      groups: SAFE_GROUPS.length,
      presetItems: SAFE_GROUPS.reduce((sum, group) => sum + group.items.length, 0),
      customFields: customFields.length,
      customValues: customFields.reduce((sum, field) => sum + field.values.length, 0),
      shown: activeList.length || (viewMode === "matrix" ? matrix.length : 0),
      favorites: favorites.length,
    }),
    [activeList.length, customFields, favorites.length, matrix.length, viewMode],
  )

  useEffect(() => {
    try {
      const custom = localStorage.getItem(CUSTOM_STORAGE_KEY)
      const fav = localStorage.getItem(FAVORITE_STORAGE_KEY)

      if (custom) {
        const parsed = JSON.parse(custom)
        if (Array.isArray(parsed)) {
          setCustomFields(
            parsed
              .filter((item) => item && typeof item.name === "string" && Array.isArray(item.values))
              .map((item) => ({
                id: typeof item.id === "string" ? item.id : safeId(),
                name: item.name,
                values: item.values.filter((value: unknown): value is string => typeof value === "string"),
                note: typeof item.note === "string" ? item.note : "",
              })),
          )
        }
      }

      if (fav) {
        const parsed = JSON.parse(fav)
        if (Array.isArray(parsed)) setFavorites(parsed.filter((item): item is string => typeof item === "string"))
      }
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(customFields))
    } catch {}
  }, [customFields])

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITE_STORAGE_KEY, JSON.stringify(favorites))
    } catch {}
  }, [favorites])

  useEffect(() => {
    if (!pageRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      gsap.from(".fuzzer-intro", {
        y: 22,
        opacity: 0,
        duration: 0.78,
        stagger: 0.055,
        ease: "power3.out",
      })

      gsap.to(".fuzzer-orbit-a", {
        rotation: 360,
        duration: 78,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })

      gsap.to(".fuzzer-orbit-b", {
        rotation: -360,
        duration: 112,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })
    }, pageRef)

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (!resultRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    gsap.fromTo(
      resultRef.current,
      { opacity: 0.68, y: 5 },
      {
        opacity: 1,
        y: 0,
        duration: 0.24,
        ease: "power2.out",
        overwrite: true,
      },
    )
  }, [activeGroupLabel, viewMode, search, exportMode, selectedOutput])

  const copy = async (value: string, key: CopyKey) => {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {
      setError("复制失败，请手动复制。")
    }
  }

  const addCustomField = () => {
    const name = fieldName.trim()
    const values = parsedFieldValues

    if (!name || !values.length) {
      setError("请填写字段名，并至少输入一个测试值。")
      return
    }

    setCustomFields((current) => [
      ...current,
      {
        id: safeId(),
        name,
        values,
        note: fieldNote.trim(),
      },
    ])
    setFieldName("")
    setFieldValues("")
    setFieldNote("")
    setViewMode("custom")
    setError("")
  }

  const removeCustomField = (id: string) => {
    setCustomFields((current) => current.filter((field) => field.id !== id))
  }

  const updateCustomField = (id: string, patch: Partial<CustomField>) => {
    setCustomFields((current) =>
      current.map((field) =>
        field.id === id
          ? {
              ...field,
              ...patch,
            }
          : field,
      ),
    )
  }

  const loadQuickField = (name: string) => {
    const sample = sampleFromQuickField(name)
    if (!sample) return
    setFieldName(sample.name)
    setFieldValues(sample.values.join("\n"))
    setFieldNote("由快捷模板生成，可继续修改。")
    setViewMode("custom")
  }

  const loadScenario = (scenario: (typeof BUILT_IN_SCENARIOS)[number]) => {
    const additions = scenario.fields
      .map(sampleFromQuickField)
      .filter((field): field is (typeof QUICK_FIELDS)[number] => Boolean(field))
      .map((field) => ({
        id: safeId(),
        name: field.name,
        values: field.values,
        note: scenario.name,
      }))

    setCustomFields((current) => [...current, ...additions])
    setViewMode("matrix")
  }

  const toggleFavorite = (id: string) => {
    setFavorites((current) => (current.includes(id) ? current.filter((item) => item !== id) : [id, ...current]))
  }

  const handleImportJson = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        if (!Array.isArray(parsed)) {
          setError("JSON 必须是自定义字段数组。")
          return
        }

        const fields = parsed
          .filter((item) => item && typeof item.name === "string" && Array.isArray(item.values))
          .map((item) => ({
            id: safeId(),
            name: item.name,
            values: item.values.filter((value: unknown): value is string => typeof value === "string"),
            note: typeof item.note === "string" ? item.note : "",
          }))
          .filter((field) => field.values.length)

        setCustomFields((current) => [...current, ...fields])
        setViewMode("custom")
        setError("")
      } catch {
        setError("JSON 解析失败。")
      }
    }
    reader.readAsText(file)

    event.target.value = ""
  }

  return (
    <div ref={pageRef} className="min-h-screen overflow-hidden bg-[#efede6] text-[#22231f] selection:bg-[#22231f] selection:text-white">
      <style>{`
        .fuzzer-scroll::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }

        .fuzzer-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .fuzzer-scroll::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(34,35,31,.13);
        }

        .fuzzer-dark-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,.14);
        }

        .fuzzer-grid {
          background-image:
            linear-gradient(rgba(34,35,31,.032) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,35,31,.032) 1px, transparent 1px);
          background-size: 30px 30px;
        }

        .fuzzer-num {
          font-variant-numeric: tabular-nums lining-nums;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_9%,rgba(178,151,91,.10),transparent_27%),radial-gradient(circle_at_8%_88%,rgba(73,107,91,.08),transparent_31%)]" />
        <div className="fuzzer-orbit-a absolute right-[-20vw] top-[-24vw] h-[58vw] w-[58vw] rounded-full border border-black/[.04]">
          <span className="absolute left-[15%] top-[43%] h-2 w-2 rounded-full bg-[#b28d48]/38" />
        </div>
        <div className="fuzzer-orbit-b absolute bottom-[-26vw] left-[-19vw] h-[53vw] w-[53vw] rounded-full border border-black/[.032]">
          <span className="absolute right-[14%] top-[31%] h-1.5 w-1.5 rounded-full bg-[#52685d]/35" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1580px] px-5 pb-10 pt-6 sm:px-8">
        <div className="fuzzer-intro">
          <Breadcrumb />
        </div>

        <header className="fuzzer-intro mt-8 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/27">LOGIN QA PAYLOAD STUDIO</div>
            <h1 className="mt-4 max-w-[980px] text-[clamp(48px,6.35vw,90px)] font-semibold leading-[1.03] tracking-[-.055em]">
              登录表单，
              <br />
              多测几个边界。
            </h1>
          </div>

          <div>
            <p className="max-w-[560px] text-[11px] leading-6 text-black/40">
              面向自有系统和授权测试的表单测试值工作台。保留预设分类复制，同时加入搜索、收藏、自定义字段、组合矩阵、JSON / CSV 导出和测试报告。
            </p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[8px] text-black/25">
              <span>{formatNumber(stats.groups)} GROUPS</span>
              <span>{formatNumber(stats.presetItems)} PRESET VALUES</span>
              <span>{formatNumber(stats.customValues)} CUSTOM VALUES</span>
              <span>LOCAL ONLY</span>
            </div>
          </div>
        </header>

        <section className="fuzzer-intro mt-7 grid gap-7 xl:grid-cols-[.66fr_1.34fr]">
          <aside className="min-w-0">
            <div className="rounded-[28px] border border-black/[.075] bg-white/24 p-5">
              <div className="text-[8px] font-semibold tracking-[.14em] text-black/24">NAVIGATION</div>
              <h2 className="mt-3 text-[clamp(30px,3.5vw,46px)] font-semibold leading-none tracking-[-.045em]">测试库。</h2>

              <div className="mt-6 flex flex-wrap gap-2">
                <TogglePill active={viewMode === "library"} label="预设库" onClick={() => setViewMode("library")} />
                <TogglePill active={viewMode === "custom"} label="自定义字段" onClick={() => setViewMode("custom")} />
                <TogglePill active={viewMode === "matrix"} label="组合矩阵" onClick={() => setViewMode("matrix")} />
              </div>

              <label className="mt-5 block">
                <span className="mb-2 block text-[8px] font-semibold tracking-[.12em] text-black/24">SEARCH</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} spellCheck={false} className="w-full rounded-full border border-black/[.08] bg-white/35 px-4 py-3 font-mono text-[10px] text-black/68 outline-none transition focus:border-black/25" placeholder="空字符串 / 手机号 / unicode / email..." />
              </label>

              <div className="mt-5 flex flex-wrap gap-2">
                <TogglePill active={favoriteOnly} label="只看收藏" onClick={() => setFavoriteOnly((value) => !value)} />
                <button type="button" onClick={() => { setSearch(""); setFavoriteOnly(false) }} className="rounded-full px-3.5 py-2 text-[8px] font-semibold text-[#965744] transition hover:bg-[#965744]/8">重置筛选</button>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-[24px] border border-black/[.075] bg-white/24">
              <div className="border-b border-black/[.06] px-5 py-4">
                <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">PROFILE</div>
                <p className="mt-2 text-[9px] leading-5 text-black/35">这里不会向任何目标发送请求，只负责整理、复制和导出测试值。实际测试请仅用于自己的系统或已授权环境。</p>
              </div>

              <div className="grid grid-cols-2 gap-px bg-black/[.06]">
                <StatBox label="GROUPS" value={formatNumber(stats.groups)} />
                <StatBox label="PRESET" value={formatNumber(stats.presetItems)} tone="green" />
                <StatBox label="CUSTOM FIELDS" value={formatNumber(stats.customFields)} tone="gold" />
                <StatBox label="CUSTOM VALUES" value={formatNumber(stats.customValues)} tone="gold" />
                <StatBox label="VISIBLE" value={formatNumber(stats.shown)} />
                <StatBox label="FAVORITES" value={formatNumber(stats.favorites)} tone="rose" />
              </div>

              {error && (
                <div className="border-t border-black/[.06] px-5 py-4">
                  <div className="text-[8px] font-semibold tracking-[.12em] text-[#965744]">ERROR</div>
                  <p className="mt-2 break-words text-[9px] leading-5 text-[#965744]">{error}</p>
                </div>
              )}
            </div>

            <div className="mt-4 rounded-[24px] border border-black/[.075] bg-white/24 p-5">
              <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">SCENARIOS</div>
              <div className="mt-4 space-y-2">
                {BUILT_IN_SCENARIOS.map((scenario) => (
                  <button key={scenario.name} type="button" onClick={() => loadScenario(scenario)} className="w-full rounded-[18px] border border-black/[.08] bg-white/22 p-4 text-left transition hover:bg-white/48">
                    <div className="text-[12px] font-semibold text-black/66">{scenario.name}</div>
                    <p className="mt-2 text-[8px] leading-4 text-black/30">{scenario.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="flex flex-col gap-4 border-b border-black/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-[8px] font-semibold tracking-[.14em] text-black/23">WORKSPACE</div>
                <h2 className="mt-2 text-[clamp(31px,4vw,48px)] font-semibold leading-none tracking-[-.045em]">
                  {viewMode === "library" ? activeGroup.label : viewMode === "custom" ? "自定义字段。" : "组合矩阵。"}
                </h2>
              </div>

              <div className="flex flex-wrap gap-2">
                {(["plain", "json", "csv"] as ExportMode[]).map((mode) => (
                  <button key={mode} type="button" onClick={() => setExportMode(mode)} className={`rounded-full px-3.5 py-2.5 font-mono text-[8px] font-semibold transition ${exportMode === mode ? "bg-[#52685d] text-white" : "text-black/32 hover:bg-white/45 hover:text-black"}`}>{mode.toUpperCase()}</button>
                ))}
                <button type="button" onClick={() => copy(selectedOutput, "all")} disabled={!selectedOutput} className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white transition hover:scale-[1.01] active:scale-[.98] disabled:opacity-30">{copied === "all" ? "✓ 已复制" : "复制当前输出"}</button>
              </div>
            </div>

            <div ref={resultRef} className="mt-5 grid gap-px overflow-hidden rounded-[30px] border border-black/[.08] bg-black/[.08] lg:grid-cols-[.92fr_1.08fr]">
              <div className="bg-[#f4f1e9]">
                <div className="flex h-12 items-center justify-between border-b border-black/[.065] px-5">
                  <span className="text-[8px] font-semibold tracking-[.13em] text-black/26">
                    {viewMode === "library" ? "PRESET GROUPS" : viewMode === "custom" ? "CUSTOM FIELDS" : "MATRIX BUILDER"}
                  </span>
                  <span className="text-[8px] text-black/22">{formatNumber(stats.shown)} visible</span>
                </div>

                <div className="fuzzer-scroll h-[680px] overflow-auto p-5 sm:p-6">
                  {viewMode === "library" && (
                    <div className="space-y-5">
                      <div className="grid gap-2 sm:grid-cols-2">
                        {SAFE_GROUPS.map((group) => (
                          <button key={group.label} type="button" onClick={() => setActiveGroupLabel(group.label)} className={`rounded-[20px] border p-4 text-left transition ${activeGroupLabel === group.label ? "border-[#22231f]/15 bg-[#22231f] text-white" : "border-black/[.08] bg-white/22 hover:bg-white/48"}`}>
                            <div className={`font-mono text-[8px] font-semibold ${activeGroupLabel === group.label ? "text-white/32" : "text-black/25"}`}>{group.items.length} ITEMS</div>
                            <div className={`mt-2 text-[14px] font-semibold tracking-[-.03em] ${activeGroupLabel === group.label ? "text-white" : "text-black/70"}`}>{group.label}</div>
                            {group.description && <p className={`mt-2 text-[8px] leading-4 ${activeGroupLabel === group.label ? "text-white/32" : "text-black/30"}`}>{group.description}</p>}
                          </button>
                        ))}
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        {activeGroupCases.map((item) => (
                          <PayloadCard key={item.id} item={item} copied={copied === item.id} favorite={favoriteSet.has(item.id)} onCopy={() => copy(item.value, item.id)} onToggleFavorite={() => toggleFavorite(item.id)} />
                        ))}
                      </div>
                    </div>
                  )}

                  {viewMode === "custom" && (
                    <div className="space-y-5">
                      <div className="rounded-[22px] border border-dashed border-black/[.14] bg-white/18 p-5">
                        <div className="text-[8px] font-semibold tracking-[.12em] text-black/24">ADD FIELD</div>
                        <div className="mt-4 grid gap-3 md:grid-cols-[.8fr_1.2fr]">
                          <input value={fieldName} onChange={(event) => setFieldName(event.target.value)} className="rounded-full border border-black/[.08] bg-white/35 px-4 py-3 text-[10px] outline-none" placeholder="字段名，如：手机号 / 验证码" />
                          <input value={fieldNote} onChange={(event) => setFieldNote(event.target.value)} className="rounded-full border border-black/[.08] bg-white/35 px-4 py-3 text-[10px] outline-none" placeholder="备注，可选" />
                        </div>
                        <textarea value={fieldValues} onChange={(event) => setFieldValues(event.target.value)} rows={5} className="fuzzer-scroll mt-3 block w-full resize-none rounded-[20px] border border-black/[.08] bg-white/35 p-4 font-mono text-[10px] leading-5 outline-none" placeholder={"每行一个测试值，例如：\n13800138000\n123456\n中文用户名"} />
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                          <span className="text-[8px] text-black/29">将添加 {formatNumber(parsedFieldValues.length)} 个值</span>
                          <div className="flex flex-wrap gap-2">
                            {QUICK_FIELDS.map((field) => (
                              <button key={field.name} type="button" onClick={() => loadQuickField(field.name)} className="rounded-full border border-black/[.08] px-3 py-2 text-[8px] font-semibold text-black/34 transition hover:bg-white/45">{field.name}</button>
                            ))}
                            <button type="button" onClick={addCustomField} className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white">添加字段</button>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3">
                        {customFields.length ? (
                          customFields.map((field) => (
                            <article key={field.id} className="rounded-[22px] border border-black/[.075] bg-white/22 p-4">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <div className="text-[13px] font-semibold text-black/68">{field.name}</div>
                                  <p className="mt-1 text-[8px] text-black/30">{field.values.length} 个测试值 {field.note ? `· ${field.note}` : ""}</p>
                                </div>
                                <div className="flex gap-2">
                                  <button type="button" onClick={() => copy(field.values.join("\n"), `field-${field.id}`)} className="rounded-full border border-black/[.08] px-3 py-2 text-[8px] font-semibold text-black/33 transition hover:bg-white/50">{copied === `field-${field.id}` ? "✓" : "复制值"}</button>
                                  <button type="button" onClick={() => removeCustomField(field.id)} className="rounded-full px-3 py-2 text-[8px] font-semibold text-[#965744] transition hover:bg-[#965744]/8">删除</button>
                                </div>
                              </div>
                              <textarea value={field.values.join("\n")} onChange={(event) => updateCustomField(field.id, { values: parseValues(event.target.value) })} className="fuzzer-scroll mt-3 block h-28 w-full resize-none rounded-[16px] border border-black/[.07] bg-white/30 p-3 font-mono text-[10px] leading-5 outline-none" />
                            </article>
                          ))
                        ) : (
                          <div className="grid min-h-[260px] place-items-center rounded-[24px] border border-black/[.075] bg-white/18 px-6 text-center text-[9px] text-black/28">还没有自定义字段，可以从快捷模板开始。</div>
                        )}
                      </div>

                      <label className="block rounded-[18px] border border-black/[.08] bg-white/18 p-4">
                        <span className="text-[8px] font-semibold tracking-[.12em] text-black/24">IMPORT CUSTOM JSON</span>
                        <input type="file" accept="application/json,.json" onChange={handleImportJson} className="mt-3 block w-full text-[9px] text-black/35 file:mr-3 file:rounded-full file:border-0 file:bg-[#22231f] file:px-4 file:py-2 file:text-[8px] file:font-semibold file:text-white" />
                      </label>
                    </div>
                  )}

                  {viewMode === "matrix" && (
                    <div className="space-y-5">
                      <div className="rounded-[22px] border border-black/[.075] bg-white/22 p-5">
                        <div className="mb-2 flex justify-between text-[8px] text-black/28">
                          <span>矩阵行数上限</span>
                          <span className="fuzzer-num font-mono text-[#52685d]">{matrixLimit}</span>
                        </div>
                        <input type="range" min={5} max={100} value={matrixLimit} onChange={(event) => setMatrixLimit(Number(event.target.value))} className="w-full accent-[#52685d]" />
                        <p className="mt-3 text-[8px] leading-5 text-black/31">组合矩阵使用自定义字段生成轻量 pairwise 风格样例，适合手工验证多个字段的边界组合。</p>
                      </div>

                      <div className="grid gap-3">
                        {matrix.length ? (
                          matrix.map((row, index) => (
                            <article key={index} className="rounded-[20px] border border-black/[.075] bg-white/22 p-4">
                              <div className="mb-3 font-mono text-[8px] text-black/24">CASE #{String(index + 1).padStart(2, "0")}</div>
                              <div className="grid gap-2">
                                {Object.entries(row).map(([key, value]) => (
                                  <div key={key} className="grid gap-2 rounded-[14px] bg-white/30 p-3 sm:grid-cols-[120px_1fr]">
                                    <span className="text-[8px] font-semibold text-black/35">{key}</span>
                                    <code className="break-all font-mono text-[10px] text-black/62">{toPrintable(value)}</code>
                                  </div>
                                ))}
                              </div>
                            </article>
                          ))
                        ) : (
                          <div className="grid min-h-[260px] place-items-center rounded-[24px] border border-black/[.075] bg-white/18 px-6 text-center text-[9px] text-black/28">先添加至少一个自定义字段，再生成组合矩阵。</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-[#151714]">
                <div className="flex h-12 items-center justify-between border-b border-white/[.065] px-5">
                  <span className="text-[8px] font-semibold tracking-[.13em] text-white/27">EXPORT OUTPUT</span>
                  <span className="text-[8px] text-[#8fb69b]">{exportMode.toUpperCase()}</span>
                </div>

                <div className="p-5 sm:p-6">
                  <pre className="fuzzer-dark-scroll h-[530px] overflow-auto whitespace-pre-wrap break-all rounded-[22px] border border-white/[.065] bg-white/[.035] p-5 font-mono text-[10px] leading-6 text-[#cbd8cd]">{selectedOutput || "（没有可导出的内容）"}</pre>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => copy(selectedOutput, "group")} disabled={!selectedOutput} className="rounded-full bg-white px-5 py-3 text-[9px] font-semibold text-[#151714] transition disabled:opacity-30">{copied === "group" ? "✓ 已复制" : "复制输出"}</button>
                    <button type="button" onClick={() => downloadText(selectedOutput, `bitleap-login-qa-payloads.${exportMode === "json" ? "json" : exportMode === "csv" ? "csv" : "txt"}`, exportMode === "json" ? "application/json;charset=utf-8" : exportMode === "csv" ? "text/csv;charset=utf-8" : "text/plain;charset=utf-8")} disabled={!selectedOutput} className="rounded-full border border-white/[.08] px-4 py-3 text-[9px] font-semibold text-white/33 transition hover:bg-white hover:text-[#151714] disabled:opacity-25">导出文件</button>
                    <button type="button" onClick={() => copy(report, "report")} className="rounded-full border border-white/[.08] px-4 py-3 text-[9px] font-semibold text-white/33 transition hover:bg-white hover:text-[#151714]">{copied === "report" ? "✓ REPORT" : "复制报告"}</button>
                  </div>

                  <div className="mt-5 rounded-[18px] border border-[#d49a88]/14 bg-[#d49a88]/8 p-4">
                    <div className="text-[8px] font-semibold tracking-[.12em] text-[#d49a88]/72">AUTHORIZED TESTING ONLY</div>
                    <p className="mt-2 text-[8px] leading-5 text-[#d49a88]/72">本工具仅生成表单测试值，不发送请求、不绕过验证、不执行自动化攻击。请只用于你拥有或获得授权的系统。</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="fuzzer-intro mt-12 grid gap-9 border-t border-black/10 pt-8 lg:grid-cols-[.55fr_1.45fr]">
          <div>
            <div className="text-[9px] font-semibold tracking-[.14em] text-black/25">REPORT</div>
            <h2 className="mt-3 text-[clamp(30px,4vw,46px)] font-semibold leading-[1.06] tracking-[-.045em]">
              测试值，
              <br />
              留下记录。
            </h2>
            <p className="mt-5 max-w-[390px] text-[9px] leading-5 text-black/34">报告包含当前视图、筛选条件、自定义字段数量和当前导出结果，适合贴进测试记录或 issue。</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" onClick={() => copy(report, "report")} className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white">{copied === "report" ? "✓ 已复制报告" : "复制报告"}</button>
              <button type="button" onClick={() => downloadText(report, "bitleap-login-qa-report.txt")} className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 transition hover:bg-white/40">导出报告</button>
            </div>
          </div>

          <div className="overflow-hidden rounded-[25px] border border-black/[.08] bg-[#171916]">
            <div className="flex items-center justify-between border-b border-white/[.07] px-5 py-3">
              <span className="text-[8px] tracking-[.13em] text-white/25">QA PROFILE</span>
              <span className="text-[8px] text-white/17">LOCAL LIBRARY</span>
            </div>
            <pre className="fuzzer-dark-scroll max-h-[390px] overflow-auto whitespace-pre-wrap break-words p-5 font-mono text-[11px] leading-7 text-[#c7d3c7] sm:p-6">{report}</pre>
          </div>
        </section>

        <section className="fuzzer-intro mt-12 grid gap-8 border-t border-black/10 pt-7 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">LOCAL ONLY</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">页面只在浏览器本地整理文本，不会把测试值发送到服务器，也不会对目标站点发起请求。</p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">CUSTOM MATRIX</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">自定义字段可以组合成轻量测试矩阵，帮助你覆盖空值、长度、字符集和格式边界。</p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">SAFE SCOPE</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">它是 QA 辅助工具，不是攻击器。不要用于未授权系统，也不要将真实账号密码放进测试集合。</p>
          </div>
        </section>

        <div className="mt-12 border-t border-black/[.08] pt-5">
          <FooterNote />
        </div>
      </div>
    </div>
  )
}
