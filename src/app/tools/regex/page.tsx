"use client"

import type { ReactNode } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type RuleId =
  | "email"
  | "phone"
  | "url"
  | "chinese"
  | "number"
  | "idcard"
  | "password"
  | "whitespace"
  | "emptyLine"
  | "ipv4"
  | "uuid"
  | "date"
  | "time"
  | "hexColor"
  | "username"
  | "slug"
  | "quoted"
  | "htmlTag"

type RiskLevel = "safe" | "watch"
type CopyKey = "literal" | "pattern" | "constructor" | "typescript" | "matches" | "report" | null

type FlagKey = "g" | "i" | "m" | "s" | "u" | "y"

type Flags = Record<FlagKey, boolean>

type RuleResult = {
  pattern: string
  desc: string
  sample: string
  risk: RiskLevel
  tips: string[]
}

type MatchItem = {
  index: number
  start: number
  end: number
  text: string
  groups: string[]
  namedGroups: Record<string, string>
}

type Rule = {
  id: RuleId
  label: string
  category: string
  short: string
  build: (opts: RegexOptions) => RuleResult
}

type RegexOptions = {
  anchored: boolean
  numberIntOnly: boolean
  numberSigned: boolean
  numberAllowThousands: boolean
  urlRequireProtocol: boolean
  phoneLoose: boolean
  chineseMode: "basic" | "han"
  passwordLowercase: boolean
  passwordUppercase: boolean
  passwordNumber: boolean
  passwordSymbol: boolean
  passwordMinLength: number
  passwordMaxLength: number
  usernameMinLength: number
  usernameMaxLength: number
  usernameAllowDash: boolean
  slugLowerOnly: boolean
  dateSeparator: "-" | "/" | "."
  timeWithSeconds: boolean
  colorAllowAlpha: boolean
  quotedDouble: boolean
  htmlCaptureName: boolean
}

const DEFAULT_FLAGS: Flags = {
  g: true,
  i: false,
  m: false,
  s: false,
  u: false,
  y: false,
}

const DEFAULT_OPTIONS: RegexOptions = {
  anchored: true,
  numberIntOnly: false,
  numberSigned: false,
  numberAllowThousands: false,
  urlRequireProtocol: true,
  phoneLoose: false,
  chineseMode: "basic",
  passwordLowercase: true,
  passwordUppercase: true,
  passwordNumber: true,
  passwordSymbol: true,
  passwordMinLength: 8,
  passwordMaxLength: 64,
  usernameMinLength: 3,
  usernameMaxLength: 20,
  usernameAllowDash: true,
  slugLowerOnly: true,
  dateSeparator: "-",
  timeWithSeconds: true,
  colorAllowAlpha: false,
  quotedDouble: true,
  htmlCaptureName: true,
}

const FLAG_INFO: Array<{ key: FlagKey; label: string; desc: string }> = [
  { key: "g", label: "global", desc: "查找全部匹配" },
  { key: "i", label: "ignore case", desc: "忽略大小写" },
  { key: "m", label: "multiline", desc: "^ 和 $ 匹配行首行尾" },
  { key: "s", label: "dotAll", desc: ". 可以匹配换行" },
  { key: "u", label: "unicode", desc: "启用 Unicode 模式" },
  { key: "y", label: "sticky", desc: "从 lastIndex 粘性匹配" },
]

const RULES: Rule[] = [
  {
    id: "email",
    label: "邮箱",
    category: "身份 / 账号",
    short: "EMAIL",
    build: (opts) => wrapAnchor("[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\\.[a-zA-Z0-9-]+)+", opts.anchored, {
      desc: "匹配常见邮箱地址。它适合表单初筛，不等同于完整 RFC 邮箱验证。",
      sample: "hello@bitleap.dev\nbad@email\nteam.name+demo@example.co.jp",
      risk: "safe",
      tips: ["支持 +tag 与多级域名", "不尝试覆盖所有 RFC 边界"],
    }),
  },
  {
    id: "phone",
    label: "手机号（中国大陆）",
    category: "身份 / 账号",
    short: "PHONE",
    build: (opts) => wrapAnchor(opts.phoneLoose ? "\\+?86[-\\s]?1[3-9]\\d{9}|1[3-9]\\d{9}" : "1[3-9]\\d{9}", opts.anchored, {
      desc: opts.phoneLoose ? "匹配中国大陆手机号，并允许 +86、空格或短横线前缀。" : "匹配中国大陆 11 位手机号。",
      sample: "13800138000\n+86 13800138000\n12800138000",
      risk: "safe",
      tips: ["号段规则只做格式判断", "不能判断号码是否真实可用"],
    }),
  },
  {
    id: "url",
    label: "URL",
    category: "网络",
    short: "URL",
    build: (opts) => wrapAnchor(opts.urlRequireProtocol ? "https?:\\/\\/(?:[\\w-]+\\.)+[\\w-]+(?:[\\w\\-._~:/?#[\\]@!$&'()*+,;=%]*)?" : "(?:https?:\\/\\/)?(?:[\\w-]+\\.)+[\\w-]+(?:[\\w\\-._~:/?#[\\]@!$&'()*+,;=%]*)?", opts.anchored, {
      desc: opts.urlRequireProtocol ? "匹配 http / https URL。" : "匹配 URL，并允许省略协议。",
      sample: "https://bitleap.dev/tools?tab=regex\nhttp://localhost:3000\nbitleap.dev/tools",
      risk: "watch",
      tips: ["适合常见 Web URL", "复杂国际化域名可改用 URL 构造器验证"],
    }),
  },
  {
    id: "chinese",
    label: "中文",
    category: "文本",
    short: "HAN",
    build: (opts) => wrapAnchor(opts.chineseMode === "han" ? "\\p{Script=Han}+" : "[\\u4e00-\\u9fff]+", opts.anchored, {
      desc: opts.chineseMode === "han" ? "使用 Unicode Script 匹配汉字，需要开启 u 标志。" : "匹配常见 CJK 汉字范围。",
      sample: "BitLeap 工具站\n中文 English 123\nかな カナ",
      risk: "safe",
      tips: opts.chineseMode === "han" ? ["建议同时开启 u 标志", "覆盖面比基本区更广"] : ["基本区写法兼容性好", "不覆盖全部扩展汉字"],
    }),
  },
  {
    id: "number",
    label: "数字",
    category: "数据",
    short: "NUM",
    build: (opts) => {
      const sign = opts.numberSigned ? "[+-]?" : ""
      const core = opts.numberAllowThousands ? "(?:\\d{1,3}(?:,\\d{3})+|\\d+)" : "\\d+"
      const decimal = opts.numberIntOnly ? "" : "(?:\\.\\d+)?"
      return wrapAnchor(`${sign}${core}${decimal}`, opts.anchored, {
        desc: opts.numberIntOnly ? "匹配整数。" : "匹配整数或小数。",
        sample: "42\n-12.5\n1,024.50\nabc123",
        risk: "safe",
        tips: ["只做格式匹配", "金额、科学计数法可在此基础上扩展"],
      })
    },
  },
  {
    id: "idcard",
    label: "身份证号（18位）",
    category: "身份 / 账号",
    short: "ID",
    build: (opts) => wrapAnchor("[1-9]\\d{5}(?:18|19|20)\\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\\d|3[01])\\d{3}[\\dXx]", opts.anchored, {
      desc: "匹配 18 位中国大陆身份证号的基本格式和出生日期结构。",
      sample: "11010119900307421X\n11010119909999421X\n123456789012345678",
      risk: "watch",
      tips: ["不校验行政区划和校验位", "真实业务应做更严格校验"],
    }),
  },
  {
    id: "password",
    label: "强密码",
    category: "身份 / 账号",
    short: "PASS",
    build: (opts) => {
      const lookaheads: string[] = []
      const classes: string[] = []

      if (opts.passwordLowercase) {
        lookaheads.push("(?=.*[a-z])")
        classes.push("a-z")
      }

      if (opts.passwordUppercase) {
        lookaheads.push("(?=.*[A-Z])")
        classes.push("A-Z")
      }

      if (opts.passwordNumber) {
        lookaheads.push("(?=.*\\d)")
        classes.push("\\d")
      }

      if (opts.passwordSymbol) {
        lookaheads.push("(?=.*[!@#$%^&*._~\\-])")
        classes.push("!@#$%^&*._~\\-")
      }

      const charset = classes.length ? classes.join("") : "\\s\\S"
      const min = Math.max(1, Math.min(128, opts.passwordMinLength || 8))
      const max = Math.max(min, Math.min(256, opts.passwordMaxLength || 64))
      const pattern = `${lookaheads.join("")}[${charset}]{${min},${max}}`

      return wrapAnchor(pattern, true, {
        desc: `匹配 ${min}-${max} 位密码，并要求包含已勾选的字符类型。`,
        sample: "BitLeap_2026\nweakpass\nABC12345\nGood-Pass_99",
        risk: "watch",
        tips: ["新版用 lookahead 检查“必须包含”", "密码强度还应结合泄露库和业务策略"],
      })
    },
  },
  {
    id: "whitespace",
    label: "首尾空白",
    category: "文本",
    short: "TRIM",
    build: () => ({
      pattern: "^\\s+|\\s+$",
      desc: "匹配字符串首尾的空白字符，常用于 trim 预览。",
      sample: "   hello BitLeap   \nclean line\n\tindented",
      risk: "safe",
      tips: ["替换为空字符串即可去除首尾空白", "多行模式下配合 m 可逐行处理"],
    }),
  },
  {
    id: "emptyLine",
    label: "空行",
    category: "文本",
    short: "EMPTY",
    build: () => ({
      pattern: "^\\s*$",
      desc: "匹配空行或只包含空白的行。",
      sample: "first line\n\n   \nlast line",
      risk: "safe",
      tips: ["建议开启 g + m", "替换为空可删除空行"],
    }),
  },
  {
    id: "ipv4",
    label: "IPv4",
    category: "网络",
    short: "IP",
    build: (opts) => wrapAnchor("(?:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)", opts.anchored, {
      desc: "匹配 IPv4 地址，并限制每段为 0-255。",
      sample: "192.168.1.1\n255.255.255.255\n999.1.1.1",
      risk: "safe",
      tips: ["格式验证，不判断内网/公网", "CIDR 可继续拼接 /\\d{1,2}"],
    }),
  },
  {
    id: "uuid",
    label: "UUID",
    category: "数据",
    short: "UUID",
    build: (opts) => wrapAnchor("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}", opts.anchored, {
      desc: "匹配常见 UUID v1-v5 字符串。",
      sample: "550e8400-e29b-41d4-a716-446655440000\n550e8400e29b41d4a716446655440000",
      risk: "safe",
      tips: ["第 3 段约束版本位", "第 4 段约束 variant"],
    }),
  },
  {
    id: "date",
    label: "日期",
    category: "时间",
    short: "DATE",
    build: (opts) => {
      const sep = escapeRegExp(opts.dateSeparator)
      return wrapAnchor(`\\d{4}${sep}(?:0[1-9]|1[0-2])${sep}(?:0[1-9]|[12]\\d|3[01])`, opts.anchored, {
        desc: `匹配 YYYY${opts.dateSeparator}MM${opts.dateSeparator}DD 日期格式。`,
        sample: `2026${opts.dateSeparator}09${opts.dateSeparator}09\n2026${opts.dateSeparator}13${opts.dateSeparator}40\n1999${opts.dateSeparator}01${opts.dateSeparator}01`,
        risk: "watch",
        tips: ["限制了月份和日期范围", "不判断闰年和大小月"],
      })
    },
  },
  {
    id: "time",
    label: "时间",
    category: "时间",
    short: "TIME",
    build: (opts) => wrapAnchor(opts.timeWithSeconds ? "(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d" : "(?:[01]\\d|2[0-3]):[0-5]\\d", opts.anchored, {
      desc: opts.timeWithSeconds ? "匹配 24 小时制 HH:mm:ss。" : "匹配 24 小时制 HH:mm。",
      sample: "09:30:12\n23:59:59\n25:00:00",
      risk: "safe",
      tips: ["24 小时制", "不包含时区"],
    }),
  },
  {
    id: "hexColor",
    label: "Hex 颜色",
    category: "前端",
    short: "HEX",
    build: (opts) => wrapAnchor(opts.colorAllowAlpha ? "#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})" : "#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})", opts.anchored, {
      desc: opts.colorAllowAlpha ? "匹配 #RGB / #RGBA / #RRGGBB / #RRGGBBAA。" : "匹配 #RGB / #RRGGBB。",
      sample: "#fff\n#12a4ff\n#12a4ffcc\nblue",
      risk: "safe",
      tips: ["适合 CSS 色值初筛", "不包含 rgb()、hsl() 等函数色"],
    }),
  },
  {
    id: "username",
    label: "用户名",
    category: "身份 / 账号",
    short: "USER",
    build: (opts) => {
      const min = Math.max(1, Math.min(64, opts.usernameMinLength || 3))
      const max = Math.max(min, Math.min(128, opts.usernameMaxLength || 20))
      const middle = opts.usernameAllowDash ? "[a-zA-Z0-9_-]" : "[a-zA-Z0-9_]"
      return wrapAnchor(`[a-zA-Z]${middle}{${Math.max(0, min - 1)},${Math.max(0, max - 1)}}`, opts.anchored, {
        desc: `匹配以字母开头、长度 ${min}-${max} 的用户名。`,
        sample: "bitleap_user\n9bad\nhello-world\nxy",
        risk: "safe",
        tips: ["首字符限定为字母", "可以按业务继续限制连续符号"],
      })
    },
  },
  {
    id: "slug",
    label: "Slug",
    category: "前端",
    short: "SLUG",
    build: (opts) => wrapAnchor(opts.slugLowerOnly ? "[a-z0-9]+(?:-[a-z0-9]+)*" : "[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*", opts.anchored, {
      desc: opts.slugLowerOnly ? "匹配小写 URL slug。" : "匹配大小写 URL slug。",
      sample: "regex-generator\nBitLeap-tools\nbad slug\nhello--world",
      risk: "safe",
      tips: ["不允许连续短横线", "适合路由片段初筛"],
    }),
  },
  {
    id: "quoted",
    label: "引号字符串",
    category: "代码",
    short: "QUOTE",
    build: (opts) => wrapAnchor(opts.quotedDouble ? "\"(?:\\\\.|[^\"\\\\])*\"" : "'(?:\\\\.|[^'\\\\])*'", opts.anchored, {
      desc: opts.quotedDouble ? "匹配双引号字符串，并允许转义字符。" : "匹配单引号字符串，并允许转义字符。",
      sample: '"hello"\n"hello \\"BitLeap\\""\n"broken',
      risk: "watch",
      tips: ["适合简单代码片段", "完整语言解析请使用 AST parser"],
    }),
  },
  {
    id: "htmlTag",
    label: "HTML 标签",
    category: "前端",
    short: "TAG",
    build: (opts) => wrapAnchor(opts.htmlCaptureName ? "<(?<tag>[a-z][a-z0-9-]*)(?:\\s[^>]*)?>[\\s\\S]*?<\\/\\k<tag>>" : "<[a-z][a-z0-9-]*(?:\\s[^>]*)?>[\\s\\S]*?<\\/[a-z][a-z0-9-]*>", opts.anchored, {
      desc: opts.htmlCaptureName ? "匹配成对 HTML 标签，并用命名组约束闭合标签名。" : "匹配简单成对 HTML 标签。",
      sample: "<div>Hello</div>\n<span class=\"x\">BitLeap</span>\n<div>broken</span>",
      risk: "watch",
      tips: ["只适合简单片段", "复杂 HTML 请使用 DOMParser"],
    }),
  },
]

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value)
}

function wrapAnchor(pattern: string, anchored: boolean, meta: Omit<RuleResult, "pattern">): RuleResult {
  return {
    pattern: anchored ? `^${pattern}$` : pattern,
    ...meta,
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function escapeForLiteral(pattern: string) {
  return pattern.replace(/\//g, "\\/")
}

function escapeForString(pattern: string) {
  return pattern.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

function flagString(flags: Flags) {
  return (Object.keys(flags) as FlagKey[])
    .filter((key) => flags[key])
    .join("")
}

function createRegex(pattern: string, flags: string) {
  return new RegExp(pattern, flags)
}

function collectMatches(pattern: string, flags: string, sample: string) {
  if (!sample) return { matches: [] as MatchItem[], error: "" }

  try {
    const activeFlags = flags.includes("g") ? flags : `${flags}g`
    const regex = createRegex(pattern, activeFlags)
    const matches: MatchItem[] = []
    let match: RegExpExecArray | null
    let guard = 0

    while ((match = regex.exec(sample)) !== null && guard < 500) {
      matches.push({
        index: matches.length + 1,
        start: match.index,
        end: match.index + match[0].length,
        text: match[0],
        groups: match.slice(1).filter((item): item is string => typeof item === "string"),
        namedGroups: match.groups ? { ...match.groups } : {},
      })

      if (match[0].length === 0) {
        regex.lastIndex += 1
      }

      guard++
    }

    return { matches, error: "" }
  } catch (error) {
    return {
      matches: [] as MatchItem[],
      error: error instanceof Error ? error.message : "正则表达式无效",
    }
  }
}

function HighlightedSample({
  sample,
  matches,
}: {
  sample: string
  matches: MatchItem[]
}) {
  if (!sample || !matches.length) {
    return <span className="text-white/28">{sample || "测试文本为空。"}</span>
  }

  const nodes: ReactNode[] = []
  let cursor = 0

  matches
    .filter((match) => match.end > match.start)
    .forEach((match) => {
      if (match.start > cursor) {
        nodes.push(
          <span key={`plain-${cursor}`} className="text-white/40">
            {sample.slice(cursor, match.start)}
          </span>,
        )
      }

      nodes.push(
        <mark key={`match-${match.start}-${match.end}`} className="rounded bg-[#52685d]/45 px-0.5 text-[#eaf4ea]">
          {sample.slice(match.start, match.end)}
        </mark>,
      )

      cursor = Math.max(cursor, match.end)
    })

  if (cursor < sample.length) {
    nodes.push(
      <span key="tail" className="text-white/40">
        {sample.slice(cursor)}
      </span>,
    )
  }

  return <>{nodes}</>
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
      <div className={`rxgen-num mt-3 break-all font-mono text-[13px] font-semibold ${toneClass}`}>{value}</div>
    </div>
  )
}

function OptionNumber({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}) {
  return (
    <label>
      <span className="mb-2 block text-[8px] text-black/24">{label}</span>
      <input type="number" min={min} max={max} value={value} onChange={(event) => onChange(Math.max(min, Math.min(max, Number(event.target.value) || min)))} className="w-full rounded-full border border-black/[.08] bg-white/35 px-4 py-3 font-mono text-[10px] outline-none" />
    </label>
  )
}

function downloadText(content: string, filename: string) {
  if (!content) return

  const blob = new Blob([content], {
    type: "text/plain;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 500)
}

export default function RegexGeneratorPage() {
  const [activeId, setActiveId] = useState<RuleId>("email")
  const [flags, setFlags] = useState<Flags>(DEFAULT_FLAGS)
  const [opts, setOpts] = useState<RegexOptions>(DEFAULT_OPTIONS)
  const [sample, setSample] = useState("")
  const [copied, setCopied] = useState<CopyKey>(null)
  const [category, setCategory] = useState("全部")

  const pageRef = useRef<HTMLDivElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  const categories = useMemo(() => ["全部", ...Array.from(new Set(RULES.map((rule) => rule.category)))], [])
  const visibleRules = useMemo(() => RULES.filter((rule) => category === "全部" || rule.category === category), [category])
  const activeRule = useMemo(() => RULES.find((rule) => rule.id === activeId) ?? RULES[0], [activeId])
  const result = useMemo(() => activeRule.build(opts), [activeRule, opts])
  const flagsText = useMemo(() => flagString(flags), [flags])
  const literal = useMemo(() => `/${escapeForLiteral(result.pattern)}/${flagsText}`, [flagsText, result.pattern])
  const constructorCode = useMemo(() => `new RegExp("${escapeForString(result.pattern)}", "${flagsText}")`, [flagsText, result.pattern])
  const typeScriptCode = useMemo(() => `const ${activeRule.id}Pattern = ${literal}\nconst isValid = ${activeRule.id}Pattern.test(value)`, [activeRule.id, literal])
  const testText = sample || result.sample
  const matchResult = useMemo(() => collectMatches(result.pattern, flagsText, testText), [flagsText, result.pattern, testText])
  const activeRegexError = useMemo(() => {
    try {
      createRegex(result.pattern, flagsText)
      return ""
    } catch (error) {
      return error instanceof Error ? error.message : "正则表达式无效"
    }
  }, [flagsText, result.pattern])

  const report = useMemo(
    () =>
      [
        "BitLeap Regex Generator Studio",
        "",
        `类型：${activeRule.label}`,
        `分类：${activeRule.category}`,
        `说明：${result.desc}`,
        `风险：${result.risk === "safe" ? "常规" : "需要复核"}`,
        "",
        "Regex literal:",
        literal,
        "",
        "Pattern:",
        result.pattern,
        "",
        "RegExp constructor:",
        constructorCode,
        "",
        "TypeScript:",
        typeScriptCode,
        "",
        "Test matches:",
        matchResult.error ? matchResult.error : matchResult.matches.map((match) => `#${match.index} [${match.start}, ${match.end}) ${match.text}`).join("\n") || "No matches",
      ].join("\n"),
    [activeRule, constructorCode, literal, matchResult, result, typeScriptCode],
  )

  useEffect(() => {
    setSample(result.sample)
  }, [activeId, result.sample])

  useEffect(() => {
    if (activeId === "chinese" && opts.chineseMode === "han" && !flags.u) {
      setFlags((current) => ({ ...current, u: true }))
    }
  }, [activeId, flags.u, opts.chineseMode])

  useEffect(() => {
    if (!pageRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      gsap.from(".rxgen-intro", {
        y: 22,
        opacity: 0,
        duration: 0.78,
        stagger: 0.055,
        ease: "power3.out",
      })

      gsap.to(".rxgen-orbit-a", {
        rotation: 360,
        duration: 70,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })

      gsap.to(".rxgen-orbit-b", {
        rotation: -360,
        duration: 106,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })
    }, pageRef)

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (!outputRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    gsap.fromTo(
      outputRef.current,
      { opacity: 0.64, y: 5 },
      {
        opacity: 1,
        y: 0,
        duration: 0.24,
        ease: "power2.out",
        overwrite: true,
      },
    )
  }, [activeId, literal, matchResult.matches.length])

  const updateOption = <K extends keyof RegexOptions>(key: K, value: RegexOptions[K]) => {
    setOpts((current) => ({ ...current, [key]: value }))
  }

  const toggleFlag = (key: FlagKey) => {
    setFlags((current) => ({ ...current, [key]: !current[key] }))
  }

  const copy = async (value: string, key: CopyKey) => {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {}
  }

  const reset = () => {
    setActiveId("email")
    setCategory("全部")
    setFlags(DEFAULT_FLAGS)
    setOpts(DEFAULT_OPTIONS)
    setSample("")
    setCopied(null)
  }

  return (
    <div ref={pageRef} className="min-h-screen overflow-hidden bg-[#efede6] text-[#22231f] selection:bg-[#22231f] selection:text-white">
      <style>{`
        .rxgen-scroll::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }

        .rxgen-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .rxgen-scroll::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(34,35,31,.13);
        }

        .rxgen-dark-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,.14);
        }

        .rxgen-grid {
          background-image:
            linear-gradient(rgba(34,35,31,.032) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,35,31,.032) 1px, transparent 1px);
          background-size: 30px 30px;
        }

        .rxgen-num {
          font-variant-numeric: tabular-nums lining-nums;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_9%,rgba(178,151,91,.10),transparent_27%),radial-gradient(circle_at_8%_88%,rgba(73,107,91,.08),transparent_31%)]" />
        <div className="rxgen-orbit-a absolute right-[-20vw] top-[-24vw] h-[58vw] w-[58vw] rounded-full border border-black/[.04]">
          <span className="absolute left-[15%] top-[43%] h-2 w-2 rounded-full bg-[#b28d48]/38" />
        </div>
        <div className="rxgen-orbit-b absolute bottom-[-26vw] left-[-19vw] h-[53vw] w-[53vw] rounded-full border border-black/[.032]">
          <span className="absolute right-[14%] top-[31%] h-1.5 w-1.5 rounded-full bg-[#52685d]/35" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1580px] px-5 pb-10 pt-6 sm:px-8">
        <div className="rxgen-intro">
          <Breadcrumb />
        </div>

        <header className="rxgen-intro mt-8 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/27">REGEX GENERATOR STUDIO</div>
            <h1 className="mt-4 max-w-[900px] text-[clamp(48px,6.35vw,90px)] font-semibold leading-[1.03] tracking-[-.055em]">
              不手写，
              <br />
              也能得到好正则。
            </h1>
          </div>

          <div>
            <p className="max-w-[560px] text-[11px] leading-6 text-black/40">
              从常用规则出发，可视化调整选项、修饰符和锚点，实时生成 JavaScript 正则字面量、构造器代码，并在测试文本中高亮匹配结果。
            </p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[8px] text-black/25">
              <span>{RULES.length} TEMPLATES</span>
              <span>LIVE TEST</span>
              <span>JS / TS OUTPUT</span>
              <span>LOCAL ONLY</span>
            </div>
          </div>
        </header>

        <section className="rxgen-intro mt-7 grid gap-7 xl:grid-cols-[.68fr_1.32fr]">
          <aside className="min-w-0">
            <div className="rounded-[28px] border border-black/[.075] bg-white/24 p-5">
              <div className="text-[8px] font-semibold tracking-[.14em] text-black/24">RULE LIBRARY</div>
              <h2 className="mt-3 text-[clamp(30px,3.5vw,46px)] font-semibold leading-none tracking-[-.045em]">选择模板。</h2>

              <div className="mt-6 flex flex-wrap gap-1.5">
                {categories.map((item) => (
                  <button key={item} type="button" onClick={() => setCategory(item)} className={`rounded-full px-3.5 py-2 text-[8px] font-semibold transition ${category === item ? "bg-[#22231f] text-white" : "text-black/32 hover:bg-white/45 hover:text-black"}`}>{item}</button>
                ))}
              </div>

              <div className="rxgen-scroll mt-5 max-h-[390px] space-y-2 overflow-auto pr-1">
                {visibleRules.map((rule) => (
                  <button key={rule.id} type="button" onClick={() => setActiveId(rule.id)} className={`w-full rounded-[20px] border p-4 text-left transition ${activeId === rule.id ? "border-[#22231f]/15 bg-[#22231f] text-white" : "border-black/[.08] bg-white/22 hover:bg-white/48"}`}>
                    <div className="flex items-center justify-between gap-3">
                      <span className={`font-mono text-[8px] font-semibold ${activeId === rule.id ? "text-white/32" : "text-black/25"}`}>{rule.short}</span>
                      <span className={`text-[8px] ${activeId === rule.id ? "text-white/24" : "text-black/23"}`}>{rule.category}</span>
                    </div>
                    <div className={`mt-2 text-[14px] font-semibold tracking-[-.03em] ${activeId === rule.id ? "text-white" : "text-black/70"}`}>{rule.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-[24px] border border-black/[.075] bg-white/24">
              <div className="border-b border-black/[.06] px-5 py-4">
                <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">REGEX PROFILE</div>
                <p className="mt-2 text-[9px] leading-5 text-black/35">{activeRegexError ? "当前表达式无法编译。" : result.desc}</p>
              </div>

              <div className="grid grid-cols-2 gap-px bg-black/[.06]">
                <StatBox label="FLAGS" value={flagsText || "none"} />
                <StatBox label="MATCHES" value={matchResult.error ? "—" : String(matchResult.matches.length)} tone={matchResult.matches.length ? "green" : "ink"} />
                <StatBox label="PATTERN LEN" value={formatNumber(result.pattern.length)} />
                <StatBox label="RISK" value={result.risk === "safe" ? "常规" : "需复核"} tone={result.risk === "safe" ? "green" : "gold"} />
              </div>

              {(activeRegexError || matchResult.error) && (
                <div className="border-t border-black/[.06] px-5 py-4">
                  <div className="text-[8px] font-semibold tracking-[.12em] text-[#965744]">REGEX ERROR</div>
                  <p className="mt-2 break-words font-mono text-[9px] leading-5 text-[#965744]">{activeRegexError || matchResult.error}</p>
                </div>
              )}
            </div>
          </aside>

          <div className="min-w-0">
            <div className="flex flex-col gap-4 border-b border-black/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-[8px] font-semibold tracking-[.14em] text-black/23">BUILDER</div>
                <h2 className="mt-2 text-[clamp(31px,4vw,48px)] font-semibold leading-none tracking-[-.045em]">{activeRule.label}</h2>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => copy(literal, "literal")} disabled={Boolean(activeRegexError)} className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white transition hover:scale-[1.01] active:scale-[.98] disabled:opacity-30">{copied === "literal" ? "✓ 已复制" : "复制正则"}</button>
                <button type="button" onClick={reset} className="rounded-full px-4 py-3 text-[9px] font-semibold text-[#965744] transition hover:bg-[#965744]/8">重置</button>
              </div>
            </div>

            <div className="mt-5 grid gap-px overflow-hidden rounded-[30px] border border-black/[.075] bg-black/[.07] lg:grid-cols-[.92fr_1.08fr]">
              <div className="min-w-0 bg-[#f4f1e9]">
                <div className="flex h-12 items-center justify-between border-b border-black/[.065] px-5">
                  <span className="text-[8px] font-semibold tracking-[.13em] text-black/26">OPTIONS</span>
                  <span className="text-[8px] text-black/22">{activeRule.category}</span>
                </div>

                <div className="rxgen-scroll h-[560px] overflow-auto p-5 sm:p-6">
                  <div className="space-y-6">
                    {!["whitespace", "emptyLine", "password"].includes(activeId) && (
                      <div>
                        <div className="mb-2 text-[8px] font-semibold tracking-[.12em] text-black/24">MATCH RANGE</div>
                        <TogglePill active={opts.anchored} label="完整匹配 ^...$" onClick={() => updateOption("anchored", !opts.anchored)} />
                      </div>
                    )}

                    {activeId === "phone" && (
                      <TogglePill active={opts.phoneLoose} label="允许 +86 前缀" onClick={() => updateOption("phoneLoose", !opts.phoneLoose)} />
                    )}

                    {activeId === "url" && (
                      <TogglePill active={opts.urlRequireProtocol} label="必须包含 http/https" onClick={() => updateOption("urlRequireProtocol", !opts.urlRequireProtocol)} />
                    )}

                    {activeId === "chinese" && (
                      <div>
                        <div className="mb-2 text-[8px] font-semibold tracking-[.12em] text-black/24">HAN RANGE</div>
                        <div className="flex flex-wrap gap-1.5">
                          {(["basic", "han"] as const).map((mode) => (
                            <button key={mode} type="button" onClick={() => updateOption("chineseMode", mode)} className={`rounded-full px-3.5 py-2 font-mono text-[8px] font-semibold transition ${opts.chineseMode === mode ? "bg-[#52685d] text-white" : "text-black/32 hover:bg-white/45 hover:text-black"}`}>{mode}</button>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeId === "number" && (
                      <div className="space-y-2">
                        <TogglePill active={opts.numberIntOnly} label="仅整数" onClick={() => updateOption("numberIntOnly", !opts.numberIntOnly)} />
                        <TogglePill active={opts.numberSigned} label="允许正负号" onClick={() => updateOption("numberSigned", !opts.numberSigned)} />
                        <TogglePill active={opts.numberAllowThousands} label="允许千分位" onClick={() => updateOption("numberAllowThousands", !opts.numberAllowThousands)} />
                      </div>
                    )}

                    {activeId === "password" && (
                      <div className="space-y-5">
                        <div>
                          <div className="mb-2 text-[8px] font-semibold tracking-[.12em] text-black/24">REQUIRED TYPES</div>
                          <div className="flex flex-wrap gap-2">
                            <TogglePill active={opts.passwordLowercase} label="小写" onClick={() => updateOption("passwordLowercase", !opts.passwordLowercase)} />
                            <TogglePill active={opts.passwordUppercase} label="大写" onClick={() => updateOption("passwordUppercase", !opts.passwordUppercase)} />
                            <TogglePill active={opts.passwordNumber} label="数字" onClick={() => updateOption("passwordNumber", !opts.passwordNumber)} />
                            <TogglePill active={opts.passwordSymbol} label="符号" onClick={() => updateOption("passwordSymbol", !opts.passwordSymbol)} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <OptionNumber label="最小长度" value={opts.passwordMinLength} min={1} max={128} onChange={(value) => updateOption("passwordMinLength", value)} />
                          <OptionNumber label="最大长度" value={opts.passwordMaxLength} min={1} max={256} onChange={(value) => updateOption("passwordMaxLength", value)} />
                        </div>
                      </div>
                    )}

                    {activeId === "username" && (
                      <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-3">
                          <OptionNumber label="最小长度" value={opts.usernameMinLength} min={1} max={64} onChange={(value) => updateOption("usernameMinLength", value)} />
                          <OptionNumber label="最大长度" value={opts.usernameMaxLength} min={1} max={128} onChange={(value) => updateOption("usernameMaxLength", value)} />
                        </div>
                        <TogglePill active={opts.usernameAllowDash} label="允许短横线" onClick={() => updateOption("usernameAllowDash", !opts.usernameAllowDash)} />
                      </div>
                    )}

                    {activeId === "slug" && (
                      <TogglePill active={opts.slugLowerOnly} label="仅小写 slug" onClick={() => updateOption("slugLowerOnly", !opts.slugLowerOnly)} />
                    )}

                    {activeId === "date" && (
                      <div>
                        <div className="mb-2 text-[8px] font-semibold tracking-[.12em] text-black/24">SEPARATOR</div>
                        <div className="flex flex-wrap gap-1.5">
                          {(["-", "/", "."] as const).map((sep) => (
                            <button key={sep} type="button" onClick={() => updateOption("dateSeparator", sep)} className={`rounded-full px-3.5 py-2 font-mono text-[8px] font-semibold transition ${opts.dateSeparator === sep ? "bg-[#52685d] text-white" : "text-black/32 hover:bg-white/45 hover:text-black"}`}>{sep}</button>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeId === "time" && (
                      <TogglePill active={opts.timeWithSeconds} label="包含秒" onClick={() => updateOption("timeWithSeconds", !opts.timeWithSeconds)} />
                    )}

                    {activeId === "hexColor" && (
                      <TogglePill active={opts.colorAllowAlpha} label="允许 Alpha" onClick={() => updateOption("colorAllowAlpha", !opts.colorAllowAlpha)} />
                    )}

                    {activeId === "quoted" && (
                      <TogglePill active={opts.quotedDouble} label={opts.quotedDouble ? "双引号" : "单引号"} onClick={() => updateOption("quotedDouble", !opts.quotedDouble)} />
                    )}

                    {activeId === "htmlTag" && (
                      <TogglePill active={opts.htmlCaptureName} label="命名组约束闭合标签" onClick={() => updateOption("htmlCaptureName", !opts.htmlCaptureName)} />
                    )}

                    <div>
                      <div className="mb-2 text-[8px] font-semibold tracking-[.12em] text-black/24">FLAGS</div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {FLAG_INFO.map((flag) => (
                          <button key={flag.key} type="button" onClick={() => toggleFlag(flag.key)} className={`rounded-[18px] border p-3 text-left transition ${flags[flag.key] ? "border-[#52685d]/25 bg-[#52685d] text-white" : "border-black/[.08] bg-white/20 hover:bg-white/50"}`}>
                            <div className={`font-mono text-[12px] font-semibold ${flags[flag.key] ? "text-white" : "text-black/66"}`}>{flag.key}</div>
                            <div className={`mt-1 text-[8px] ${flags[flag.key] ? "text-white/38" : "text-black/30"}`}>{flag.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-black/[.07] bg-white/24 p-4">
                      <div className="text-[8px] font-semibold tracking-[.12em] text-black/24">TIPS</div>
                      <div className="mt-3 space-y-2">
                        {result.tips.map((tip) => (
                          <p key={tip} className="text-[8px] leading-5 text-black/34">· {tip}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div ref={outputRef} className="min-w-0 bg-[#151714]">
                <div className="flex h-12 items-center justify-between border-b border-white/[.065] px-5">
                  <span className="text-[8px] font-semibold tracking-[.13em] text-white/27">REGEX OUTPUT</span>
                  <span className={`text-[8px] ${activeRegexError ? "text-[#d49a88]" : "text-[#8fb69b]"}`}>{activeRegexError ? "INVALID" : "READY"}</span>
                </div>

                <div className="rxgen-dark-scroll h-[560px] overflow-auto p-5 sm:p-6">
                  <div className="space-y-4">
                    {[
                      { label: "Regex literal", value: literal, key: "literal" as CopyKey },
                      { label: "Pattern only", value: result.pattern, key: "pattern" as CopyKey },
                      { label: "RegExp constructor", value: constructorCode, key: "constructor" as CopyKey },
                      { label: "TypeScript snippet", value: typeScriptCode, key: "typescript" as CopyKey },
                    ].map((item) => (
                      <div key={item.label} className="group rounded-[20px] border border-white/[.065] bg-white/[.035] p-4">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-[8px] font-semibold tracking-[.12em] text-white/24">{item.label}</span>
                          <button type="button" onClick={() => copy(item.value, item.key)} className="text-[8px] font-semibold text-white/25 transition hover:text-white">{copied === item.key ? "✓ COPIED" : "COPY"}</button>
                        </div>
                        <pre className="whitespace-pre-wrap break-all font-mono text-[10px] leading-5 text-[#cbd8cd]">{item.value}</pre>
                      </div>
                    ))}

                    <div className="rounded-[20px] border border-[#d49a88]/14 bg-[#d49a88]/8 p-4">
                      <div className="text-[8px] font-semibold tracking-[.12em] text-[#d49a88]/72">NOTE</div>
                      <p className="mt-2 text-[8px] leading-5 text-[#d49a88]/72">
                        正则适合做格式初筛。邮箱、身份证、URL、HTML、密码强度等复杂业务规则，生产环境仍建议结合专用解析器或后端校验。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rxgen-intro mt-12 grid gap-7 border-t border-black/10 pt-8 lg:grid-cols-[.56fr_1.44fr]">
          <div>
            <div className="text-[9px] font-semibold tracking-[.14em] text-black/25">TEST LAB</div>
            <h2 className="mt-3 text-[clamp(30px,4vw,46px)] font-semibold leading-[1.06] tracking-[-.045em]">
              生成之后，
              <br />
              马上试一下。
            </h2>
            <p className="mt-5 max-w-[390px] text-[9px] leading-5 text-black/34">
              测试区会自动使用当前模板的示例文本，也可以手动粘贴真实样本。匹配结果会高亮，并列出 index、范围和捕获组。
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" onClick={() => setSample(result.sample)} className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 transition hover:bg-white/40">恢复示例</button>
              <button type="button" onClick={() => copy(matchResult.matches.map((match) => match.text).join("\n"), "matches")} disabled={!matchResult.matches.length} className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white transition disabled:opacity-30">{copied === "matches" ? "✓ 已复制匹配" : "复制匹配"}</button>
            </div>
          </div>

          <div className="grid gap-px overflow-hidden rounded-[30px] border border-black/[.08] bg-black/[.08] lg:grid-cols-[.82fr_1.18fr]">
            <div className="bg-[#f4f1e9]">
              <div className="flex h-12 items-center justify-between border-b border-black/[.065] px-5">
                <span className="text-[8px] font-semibold tracking-[.13em] text-black/26">TEST INPUT</span>
                <span className="rxgen-num font-mono text-[8px] text-black/22">{testText.length} chars</span>
              </div>
              <textarea value={testText} onChange={(event) => setSample(event.target.value)} spellCheck={false} className="rxgen-scroll block h-[420px] w-full resize-none bg-transparent p-5 font-mono text-[11px] leading-6 text-[#292b26] outline-none placeholder:text-black/16 sm:p-6" />
            </div>

            <div className="bg-[#151714]">
              <div className="flex h-12 items-center justify-between border-b border-white/[.065] px-5">
                <span className="text-[8px] font-semibold tracking-[.13em] text-white/27">MATCH PREVIEW</span>
                <span className="rxgen-num font-mono text-[8px] text-white/18">{matchResult.matches.length} matches</span>
              </div>
              <div className="rxgen-dark-scroll h-[420px] overflow-auto p-5 sm:p-6">
                <pre className="whitespace-pre-wrap break-all font-mono text-[10px] leading-6">
                  <HighlightedSample sample={testText} matches={matchResult.matches} />
                </pre>

                <div className="mt-6 space-y-2">
                  {matchResult.matches.slice(0, 50).map((match) => (
                    <article key={`${match.index}-${match.start}-${match.end}`} className="rounded-[16px] border border-white/[.06] bg-white/[.035] p-3">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="rxgen-num font-mono text-[8px] text-white/25">#{match.index} · [{match.start}, {match.end})</span>
                        <span className="text-[8px] text-white/16">{match.text.length} chars</span>
                      </div>
                      <div className="break-all font-mono text-[10px] leading-5 text-[#cbd8cd]">{match.text || "[zero-width]"}</div>
                      {(match.groups.length > 0 || Object.keys(match.namedGroups).length > 0) && (
                        <pre className="mt-2 whitespace-pre-wrap break-all rounded-[12px] bg-white/[.035] p-2 font-mono text-[8px] leading-4 text-white/35">{JSON.stringify({ groups: match.groups, namedGroups: match.namedGroups }, null, 2)}</pre>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rxgen-intro mt-12 grid gap-9 border-t border-black/10 pt-8 lg:grid-cols-[.55fr_1.45fr]">
          <div>
            <div className="text-[9px] font-semibold tracking-[.14em] text-black/25">REPORT</div>
            <h2 className="mt-3 text-[clamp(30px,4vw,46px)] font-semibold leading-[1.06] tracking-[-.045em]">
              规则、代码、
              <br />
              结果一起导出。
            </h2>
            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" onClick={() => copy(report, "report")} className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white">{copied === "report" ? "✓ 已复制报告" : "复制报告"}</button>
              <button type="button" onClick={() => downloadText(report, "bitleap-regex-report.txt")} className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 transition hover:bg-white/40">导出报告</button>
            </div>
          </div>

          <div className="overflow-hidden rounded-[25px] border border-black/[.08] bg-[#171916]">
            <div className="flex items-center justify-between border-b border-white/[.07] px-5 py-3">
              <span className="text-[8px] tracking-[.13em] text-white/25">REGEX PROFILE</span>
              <span className="text-[8px] text-white/17">LOCAL GENERATOR</span>
            </div>
            <pre className="rxgen-dark-scroll max-h-[390px] overflow-auto whitespace-pre-wrap break-words p-5 font-mono text-[11px] leading-7 text-[#c7d3c7] sm:p-6">{report}</pre>
          </div>
        </section>

        <section className="rxgen-intro mt-12 grid gap-8 border-t border-black/10 pt-7 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">LOOKAHEAD FIX</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              密码规则使用 lookahead 判断“必须包含”，不是只限制可用字符集，因此比简单字符类更符合强密码检查。
            </p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">TEST BEFORE USE</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              每条规则都能用样本即时测试。复制到生产环境前，建议再用真实边界数据跑一遍。
            </p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">REGEX IS NOT PARSER</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              URL、HTML、邮箱等复杂格式不建议完全依赖正则做最终判断，严格场景应使用专用解析器或后端校验。
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
