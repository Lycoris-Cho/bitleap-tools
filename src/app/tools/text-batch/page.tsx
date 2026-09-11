"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type Operation =
  | "dedupe"
  | "clean"
  | "replace"
  | "wrap"
  | "number"
  | "case"
  | "sort"

type CaseMode = "upper" | "lower" | "title" | "sentence"
type SortMode = "asc" | "desc" | "lengthAsc" | "lengthDesc" | "random"
type RegexFlag = "g" | "i" | "m" | "s" | "u"
type CopyKey = "result" | "report" | null

type ProcessResult = {
  output: string
  note: string
  details: Array<{
    label: string
    value: string
    tone?: "ink" | "green" | "gold" | "rose"
  }>
  warnings?: string[]
}

const SAMPLE_TEXT = `BitLeap
bitLeap
工具站

Regex Studio
Color Studio
Regex Studio
JSON Workbench
  Markdown Studio
Markdown Studio  `

const OPERATIONS: Array<{
  key: Operation
  label: string
  eyebrow: string
  desc: string
}> = [
  {
    key: "dedupe",
    label: "文本去重",
    eyebrow: "DEDUP",
    desc: "按行去重，支持大小写、首尾空白和空行策略。",
  },
  {
    key: "clean",
    label: "清理整理",
    eyebrow: "CLEAN",
    desc: "删除空行、修剪空白、压缩空白或统一换行。",
  },
  {
    key: "replace",
    label: "查找替换",
    eyebrow: "REPLACE",
    desc: "普通文本或正则替换，适合批量改名和批量修正文案。",
  },
  {
    key: "wrap",
    label: "前缀后缀",
    eyebrow: "WRAP",
    desc: "给每一行添加前缀、后缀，也可只处理非空行。",
  },
  {
    key: "number",
    label: "行号编号",
    eyebrow: "NUMBER",
    desc: "用 {n}、{line}、{index} 生成灵活的行号格式。",
  },
  {
    key: "case",
    label: "大小写转换",
    eyebrow: "CASE",
    desc: "英文大写、小写、标题式或句首大写。",
  },
  {
    key: "sort",
    label: "排序洗牌",
    eyebrow: "SORT",
    desc: "按字母、长度或随机顺序重排每一行。",
  },
]

const REGEX_FLAGS: Array<{
  key: RegexFlag
  label: string
  title: string
}> = [
  { key: "g", label: "g", title: "全局替换" },
  { key: "i", label: "i", title: "忽略大小写" },
  { key: "m", label: "m", title: "多行模式" },
  { key: "s", label: "s", title: "dotAll" },
  { key: "u", label: "u", title: "Unicode" },
]

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value)
}

function splitLines(text: string) {
  if (text === "") return []
  return text.split(/\r?\n/)
}

function normalizeLineEndings(text: string) {
  return text.replace(/\r\n?/g, "\n")
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function applyTitleCase(value: string) {
  return value.replace(
    /[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu,
    (word) =>
      word.charAt(0).toLocaleUpperCase() +
      word.slice(1).toLocaleLowerCase(),
  )
}

function applySentenceCase(value: string) {
  let shouldCapitalize = true

  return value
    .toLocaleLowerCase()
    .replace(/\p{L}/gu, (char) => {
      if (!shouldCapitalize) return char
      shouldCapitalize = false
      return char.toLocaleUpperCase()
    })
    .replace(/[.!?。！？]\s*/g, (chunk) => {
      shouldCapitalize = true
      return chunk
    })
}

function seededShuffle(lines: string[]) {
  const result = [...lines]
  let seed = lines.join("\u0000").length || 1

  const random = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }

  for (let index = result.length - 1; index > 0; index--) {
    const next = Math.floor(random() * (index + 1))
    const current = result[index]
    result[index] = result[next]
    result[next] = current
  }

  return result
}

function countDuplicateGroups(
  lines: string[],
  getKey: (line: string) => string,
  keepEmpty: boolean,
) {
  const map = new Map<string, number>()

  for (const line of lines) {
    if (!keepEmpty && line.trim() === "") continue

    const key = getKey(line)
    map.set(key, (map.get(key) ?? 0) + 1)
  }

  return Array.from(map.values()).filter((count) => count > 1)
}

function downloadText(content: string) {
  const blob = new Blob([content], {
    type: "text/plain;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = "bitleap-text-batch.txt"
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 500)
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
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3.5 py-2 text-[8px] font-semibold transition ${
        active
          ? "border-[#52685d]/20 bg-[#52685d] text-white"
          : "border-black/[.085] text-black/34 hover:bg-white/45 hover:text-black"
      }`}
    >
      {label}
    </button>
  )
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  readonly = false,
}: {
  label: string
  value: string
  onChange?: (value: string) => void
  placeholder: string
  readonly?: boolean
}) {
  return (
    <div className="min-w-0 bg-[#f4f1e9]">
      <div className="flex h-12 items-center justify-between border-b border-black/[.065] px-5">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              readonly ? "bg-[#52685d]" : "bg-[#a8754b]"
            }`}
          />
          <span className="text-[8px] font-semibold tracking-[.13em] text-black/26">
            {label}
          </span>
        </div>

        <span className="batch-num font-mono text-[8px] text-black/22">
          {formatNumber(value.length)} chars
        </span>
      </div>

      <textarea
        value={value}
        readOnly={readonly}
        onChange={(event) => onChange?.(event.target.value)}
        spellCheck={false}
        placeholder={placeholder}
        className="batch-scroll block h-[430px] w-full resize-none bg-transparent p-5 font-mono text-[11px] leading-6 text-[#292b26] outline-none placeholder:text-black/16 sm:p-6"
      />
    </div>
  )
}

export default function TextBatch() {
  const [input, setInput] = useState(SAMPLE_TEXT)
  const [operation, setOperation] = useState<Operation>("dedupe")
  const [copied, setCopied] = useState<CopyKey>(null)

  const [caseSensitive, setCaseSensitive] = useState(false)
  const [compareTrimmed, setCompareTrimmed] = useState(true)
  const [keepEmptyLines, setKeepEmptyLines] = useState(false)
  const [keepLastDuplicate, setKeepLastDuplicate] = useState(false)

  const [cleanTrim, setCleanTrim] = useState(true)
  const [cleanRemoveEmpty, setCleanRemoveEmpty] = useState(true)
  const [cleanCollapseEmpty, setCleanCollapseEmpty] = useState(false)
  const [cleanCollapseSpaces, setCleanCollapseSpaces] = useState(false)

  const [findText, setFindText] = useState("Studio")
  const [replaceText, setReplaceText] = useState("Lab")
  const [replaceAsRegex, setReplaceAsRegex] = useState(false)
  const [regexFlags, setRegexFlags] = useState<RegexFlag[]>(["g"])

  const [prefix, setPrefix] = useState("- ")
  const [suffix, setSuffix] = useState("")
  const [wrapNonEmptyOnly, setWrapNonEmptyOnly] = useState(true)

  const [lineNumFormat, setLineNumFormat] = useState("{n}. ")
  const [lineStart, setLineStart] = useState(1)
  const [linePad, setLinePad] = useState(1)
  const [numberNonEmptyOnly, setNumberNonEmptyOnly] = useState(false)

  const [caseMode, setCaseMode] = useState<CaseMode>("upper")
  const [sortMode, setSortMode] = useState<SortMode>("asc")
  const [sortTrim, setSortTrim] = useState(false)
  const [sortRemoveEmpty, setSortRemoveEmpty] = useState(false)

  const pageRef = useRef<HTMLDivElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  const lines = useMemo(
    () => splitLines(normalizeLineEndings(input)),
    [input],
  )

  const result = useMemo<ProcessResult>(() => {
    if (!input) {
      return {
        output: "",
        note: "等待输入文本",
        details: [
          { label: "输入行数", value: "0" },
          { label: "输出行数", value: "0" },
          { label: "变化", value: "0" },
        ],
      }
    }

    if (operation === "dedupe") {
      const getKey = (line: string) => {
        let key = compareTrimmed ? line.trim() : line
        if (!caseSensitive) key = key.toLocaleLowerCase()
        return key
      }

      const source = [...lines]
      const seen = new Set<string>()
      const outputLines: string[] = []
      let skippedEmpty = 0
      let duplicateRemoved = 0

      if (keepLastDuplicate) {
        const lastIndexByKey = new Map<string, number>()

        source.forEach((line, index) => {
          if (!keepEmptyLines && line.trim() === "") return
          lastIndexByKey.set(getKey(line), index)
        })

        source.forEach((line, index) => {
          if (line.trim() === "") {
            if (keepEmptyLines) outputLines.push(line)
            else skippedEmpty++
            return
          }

          const key = getKey(line)
          if (lastIndexByKey.get(key) === index) {
            outputLines.push(line)
          } else {
            duplicateRemoved++
          }
        })
      } else {
        for (const line of source) {
          if (line.trim() === "") {
            if (keepEmptyLines) outputLines.push(line)
            else skippedEmpty++
            continue
          }

          const key = getKey(line)

          if (seen.has(key)) {
            duplicateRemoved++
            continue
          }

          seen.add(key)
          outputLines.push(line)
        }
      }

      const duplicateGroups = countDuplicateGroups(
        source,
        getKey,
        keepEmptyLines,
      )

      return {
        output: outputLines.join("\n"),
        note:
          duplicateRemoved > 0 || skippedEmpty > 0
            ? `去除 ${duplicateRemoved} 个重复，跳过 ${skippedEmpty} 个空行`
            : "没有发现需要移除的重复行",
        details: [
          { label: "输入行数", value: formatNumber(source.length) },
          {
            label: "输出行数",
            value: formatNumber(outputLines.length),
            tone: "green",
          },
          {
            label: "重复行",
            value: formatNumber(duplicateRemoved),
            tone: "rose",
          },
          {
            label: "重复组",
            value: formatNumber(duplicateGroups.length),
            tone: "gold",
          },
        ],
      }
    }

    if (operation === "clean") {
      let outputLines = [...lines]
      const originalLines = outputLines.length

      if (cleanTrim) {
        outputLines = outputLines.map((line) => line.trim())
      }

      if (cleanCollapseSpaces) {
        outputLines = outputLines.map((line) =>
          line.replace(/[ \t]+/g, " "),
        )
      }

      if (cleanRemoveEmpty) {
        outputLines = outputLines.filter((line) => line.trim() !== "")
      } else if (cleanCollapseEmpty) {
        const collapsed: string[] = []

        for (const line of outputLines) {
          const previous = collapsed[collapsed.length - 1]
          if (line.trim() === "" && previous?.trim() === "") continue
          collapsed.push(line)
        }

        outputLines = collapsed
      }

      return {
        output: outputLines.join("\n"),
        note: `清理完成：${originalLines} 行 → ${outputLines.length} 行`,
        details: [
          { label: "原始行数", value: formatNumber(originalLines) },
          {
            label: "处理后",
            value: formatNumber(outputLines.length),
            tone: "green",
          },
          {
            label: "移除行数",
            value: formatNumber(originalLines - outputLines.length),
            tone: originalLines - outputLines.length > 0 ? "rose" : "ink",
          },
          {
            label: "字符变化",
            value: formatNumber(input.length - outputLines.join("\n").length),
            tone: "gold",
          },
        ],
      }
    }

    if (operation === "replace") {
      if (!findText) {
        return {
          output: input,
          note: "请输入需要查找的内容",
          details: [
            { label: "匹配次数", value: "0" },
            { label: "输出字符", value: formatNumber(input.length) },
          ],
          warnings: ["查找内容为空时不会执行替换。"],
        }
      }

      try {
        const search = replaceAsRegex
          ? new RegExp(findText, regexFlags.join(""))
          : new RegExp(
              escapeRegExp(findText),
              regexFlags.includes("g")
                ? regexFlags.filter((flag) => flag !== "u").join("")
                : regexFlags
                    .filter((flag) => flag !== "u")
                    .join("")
                    .replace("g", ""),
            )

        const matches = input.match(search) ?? []
        const output = input.replace(search, replaceText)

        return {
          output,
          note: `已替换 ${matches.length} 处`,
          details: [
            {
              label: "匹配次数",
              value: formatNumber(matches.length),
              tone: matches.length > 0 ? "green" : "ink",
            },
            {
              label: "字符变化",
              value: formatNumber(output.length - input.length),
              tone: "gold",
            },
            { label: "输出字符", value: formatNumber(output.length) },
            {
              label: "模式",
              value: replaceAsRegex ? "Regex" : "Plain",
            },
          ],
        }
      } catch (error) {
        return {
          output: input,
          note:
            error instanceof Error
              ? error.message
              : "正则表达式无效",
          details: [
            { label: "匹配次数", value: "0" },
            { label: "输出字符", value: formatNumber(input.length) },
          ],
          warnings: [
            "正则表达式语法错误时会保留原文本，不会执行替换。",
          ],
        }
      }
    }

    if (operation === "wrap") {
      const outputLines = lines.map((line) => {
        if (wrapNonEmptyOnly && line.trim() === "") return line
        return `${prefix}${line}${suffix}`
      })

      const affected = lines.filter(
        (line) => !wrapNonEmptyOnly || line.trim() !== "",
      ).length

      return {
        output: outputLines.join("\n"),
        note: `已处理 ${affected} 行`,
        details: [
          { label: "输入行数", value: formatNumber(lines.length) },
          {
            label: "处理行数",
            value: formatNumber(affected),
            tone: "green",
          },
          {
            label: "前缀长度",
            value: formatNumber(prefix.length),
          },
          {
            label: "后缀长度",
            value: formatNumber(suffix.length),
          },
        ],
      }
    }

    if (operation === "number") {
      let currentNumber = lineStart

      const outputLines = lines.map((line, index) => {
        if (numberNonEmptyOnly && line.trim() === "") return line

        const number = String(currentNumber).padStart(
          Math.max(1, linePad),
          "0",
        )
        const zeroIndex = String(index)
        const oneIndex = String(index + 1)
        currentNumber++

        const marker = lineNumFormat
          .replaceAll("{n}", number)
          .replaceAll("{line}", oneIndex)
          .replaceAll("{index}", zeroIndex)

        return `${marker}${line}`
      })

      return {
        output: outputLines.join("\n"),
        note: `已添加编号，起始值 ${lineStart}`,
        details: [
          { label: "输入行数", value: formatNumber(lines.length) },
          {
            label: "编号行数",
            value: formatNumber(currentNumber - lineStart),
            tone: "green",
          },
          {
            label: "起始序号",
            value: formatNumber(lineStart),
          },
          {
            label: "补零位数",
            value: formatNumber(linePad),
            tone: "gold",
          },
        ],
      }
    }

    if (operation === "case") {
      const output =
        caseMode === "upper"
          ? input.toLocaleUpperCase()
          : caseMode === "lower"
            ? input.toLocaleLowerCase()
            : caseMode === "title"
              ? applyTitleCase(input)
              : applySentenceCase(input)

      return {
        output,
        note:
          caseMode === "upper"
            ? "已转为大写"
            : caseMode === "lower"
              ? "已转为小写"
              : caseMode === "title"
                ? "已转为标题式大小写"
                : "已转为句首大写",
        details: [
          { label: "输入字符", value: formatNumber(input.length) },
          { label: "输出字符", value: formatNumber(output.length) },
          {
            label: "变化字符",
            value: formatNumber(
              Array.from(input).filter(
                (char, index) => char !== Array.from(output)[index],
              ).length,
            ),
            tone: "gold",
          },
          {
            label: "模式",
            value:
              caseMode === "upper"
                ? "UPPER"
                : caseMode === "lower"
                  ? "lower"
                  : caseMode === "title"
                    ? "Title"
                    : "Sentence",
          },
        ],
      }
    }

    let outputLines = [...lines]

    if (sortRemoveEmpty) {
      outputLines = outputLines.filter((line) => line.trim() !== "")
    }

    if (sortTrim) {
      outputLines = outputLines.map((line) => line.trim())
    }

    if (sortMode === "random") {
      outputLines = seededShuffle(outputLines)
    } else {
      outputLines.sort((a, b) => {
        if (sortMode === "lengthAsc") return a.length - b.length
        if (sortMode === "lengthDesc") return b.length - a.length

        const compared = a.localeCompare(b, "zh-CN", {
          numeric: true,
          sensitivity: "base",
        })

        return sortMode === "desc" ? -compared : compared
      })
    }

    return {
      output: outputLines.join("\n"),
      note:
        sortMode === "random"
          ? "已按稳定随机顺序洗牌"
          : "已完成排序",
      details: [
        { label: "输入行数", value: formatNumber(lines.length) },
        {
          label: "输出行数",
          value: formatNumber(outputLines.length),
          tone: "green",
        },
        {
          label: "排序方式",
          value:
            sortMode === "asc"
              ? "A → Z"
              : sortMode === "desc"
                ? "Z → A"
                : sortMode === "lengthAsc"
                  ? "短 → 长"
                  : sortMode === "lengthDesc"
                    ? "长 → 短"
                    : "Shuffle",
          tone: "gold",
        },
        {
          label: "空行策略",
          value: sortRemoveEmpty ? "删除" : "保留",
        },
      ],
    }
  }, [
    caseMode,
    caseSensitive,
    cleanCollapseEmpty,
    cleanCollapseSpaces,
    cleanRemoveEmpty,
    cleanTrim,
    compareTrimmed,
    findText,
    input,
    keepEmptyLines,
    keepLastDuplicate,
    lineNumFormat,
    linePad,
    lineStart,
    lines,
    numberNonEmptyOnly,
    operation,
    prefix,
    regexFlags,
    replaceAsRegex,
    replaceText,
    sortMode,
    sortRemoveEmpty,
    sortTrim,
    suffix,
    wrapNonEmptyOnly,
  ])

  const report = useMemo(
    () =>
      [
        "BitLeap 文本批处理报告",
        "",
        `操作：${OPERATIONS.find((item) => item.key === operation)?.label}`,
        `说明：${result.note}`,
        "",
        ...result.details.map(
          (item) => `${item.label}：${item.value}`,
        ),
        "",
        "输出：",
        result.output || "暂无输出",
      ].join("\n"),
    [operation, result],
  )

  const outputLines = useMemo(
    () => splitLines(result.output).length,
    [result.output],
  )

  const inputStats = useMemo(
    () => ({
      lines: lines.length,
      chars: input.length,
      nonEmpty: lines.filter((line) => line.trim() !== "").length,
    }),
    [input.length, lines],
  )

  useEffect(() => {
    if (
      !pageRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    const ctx = gsap.context(() => {
      gsap.from(".batch-intro", {
        y: 22,
        opacity: 0,
        duration: 0.78,
        stagger: 0.055,
        ease: "power3.out",
      })

      gsap.to(".batch-orbit-a", {
        rotation: 360,
        duration: 70,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })

      gsap.to(".batch-orbit-b", {
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
    if (
      !outputRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    gsap.fromTo(
      outputRef.current,
      {
        opacity: 0.68,
        y: 5,
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.24,
        ease: "power2.out",
        overwrite: true,
      },
    )
  }, [result.output, operation])

  const copy = async (value: string, key: CopyKey) => {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {}
  }

  const paste = async () => {
    try {
      const value = await navigator.clipboard.readText()
      if (value) setInput(value)
    } catch {}
  }

  const clear = () => {
    setInput("")
    setCopied(null)
  }

  const sendOutputToInput = () => {
    setInput(result.output)
    setCopied(null)
  }

  const toggleRegexFlag = (flag: RegexFlag) => {
    setRegexFlags((current) =>
      current.includes(flag)
        ? current.filter((item) => item !== flag)
        : [...current, flag],
    )
  }

  return (
    <div
      ref={pageRef}
      className="min-h-screen overflow-hidden bg-[#efede6] text-[#22231f] selection:bg-[#22231f] selection:text-white"
    >
      <style>{`
        .batch-scroll::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }

        .batch-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .batch-scroll::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(34,35,31,.13);
        }

        .batch-dark-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,.14);
        }

        .batch-grid {
          background-image:
            linear-gradient(rgba(34,35,31,.032) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,35,31,.032) 1px, transparent 1px);
          background-size: 30px 30px;
        }

        .batch-num {
          font-variant-numeric: tabular-nums lining-nums;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_9%,rgba(178,151,91,.10),transparent_27%),radial-gradient(circle_at_8%_88%,rgba(73,107,91,.08),transparent_31%)]" />

        <div className="batch-orbit-a absolute right-[-20vw] top-[-24vw] h-[58vw] w-[58vw] rounded-full border border-black/[.04]">
          <span className="absolute left-[15%] top-[43%] h-2 w-2 rounded-full bg-[#b28d48]/38" />
        </div>

        <div className="batch-orbit-b absolute bottom-[-26vw] left-[-19vw] h-[53vw] w-[53vw] rounded-full border border-black/[.032]">
          <span className="absolute right-[14%] top-[31%] h-1.5 w-1.5 rounded-full bg-[#52685d]/35" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1580px] px-5 pb-10 pt-6 sm:px-8">
        <div className="batch-intro">
          <Breadcrumb />
        </div>

        <header className="batch-intro mt-8 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/27">
              TEXT BATCH STUDIO
            </div>

            <h1 className="mt-4 max-w-[900px] text-[clamp(48px,6.35vw,90px)] font-semibold leading-[1.03] tracking-[-.055em]">
              把一批文本，
              <br />
              一次整理干净。
            </h1>
          </div>

          <div>
            <p className="max-w-[560px] text-[11px] leading-6 text-black/40">
              合并行去重、空行清理、查找替换、前缀后缀、编号、大小写和排序。所有处理都在浏览器本地完成。
            </p>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[8px] text-black/25">
              <span>LOCAL ONLY</span>
              <span>LINE TOOLS</span>
              <span>BATCH REPLACE</span>
              <span>ONE INPUT · MANY ACTIONS</span>
            </div>
          </div>
        </header>

        <section className="batch-intro mt-6 grid gap-2 border-b border-black/10 pb-5 sm:grid-cols-2 lg:grid-cols-7">
          {OPERATIONS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setOperation(item.key)}
              className={`group rounded-[20px] border p-4 text-left transition ${
                operation === item.key
                  ? "border-[#22231f]/16 bg-[#22231f] text-white"
                  : "border-black/[.075] bg-white/18 text-[#22231f] hover:bg-white/45"
              }`}
            >
              <div
                className={`text-[7px] font-semibold tracking-[.13em] ${
                  operation === item.key
                    ? "text-white/33"
                    : "text-black/22"
                }`}
              >
                {item.eyebrow}
              </div>

              <div className="mt-3 text-[14px] font-semibold tracking-[-.03em]">
                {item.label}
              </div>

              <p
                className={`mt-2 hidden text-[8px] leading-4 lg:block ${
                  operation === item.key
                    ? "text-white/33"
                    : "text-black/30"
                }`}
              >
                {item.desc}
              </p>
            </button>
          ))}
        </section>

        <section className="batch-intro mt-7 grid gap-7 xl:grid-cols-[.68fr_1.32fr]">
          <aside className="min-w-0">
            <div className="rounded-[28px] border border-black/[.075] bg-white/24 p-5">
              <div className="text-[8px] font-semibold tracking-[.14em] text-black/24">
                CURRENT ACTION
              </div>

              <h2 className="mt-3 text-[clamp(30px,3.5vw,46px)] font-semibold leading-none tracking-[-.045em]">
                {
                  OPERATIONS.find((item) => item.key === operation)
                    ?.label
                }
              </h2>

              <p className="mt-4 text-[9px] leading-5 text-black/34">
                {
                  OPERATIONS.find((item) => item.key === operation)
                    ?.desc
                }
              </p>

              <div className="mt-6 border-t border-black/[.065] pt-5">
                {operation === "dedupe" && (
                  <div className="space-y-3">
                    <TogglePill
                      active={caseSensitive}
                      label="区分大小写"
                      onClick={() =>
                        setCaseSensitive((value) => !value)
                      }
                    />
                    <TogglePill
                      active={compareTrimmed}
                      label="忽略首尾空白比较"
                      onClick={() =>
                        setCompareTrimmed((value) => !value)
                      }
                    />
                    <TogglePill
                      active={keepEmptyLines}
                      label="保留空行"
                      onClick={() =>
                        setKeepEmptyLines((value) => !value)
                      }
                    />
                    <TogglePill
                      active={keepLastDuplicate}
                      label="保留最后一次出现"
                      onClick={() =>
                        setKeepLastDuplicate((value) => !value)
                      }
                    />
                  </div>
                )}

                {operation === "clean" && (
                  <div className="space-y-3">
                    <TogglePill
                      active={cleanTrim}
                      label="每行去首尾空格"
                      onClick={() =>
                        setCleanTrim((value) => !value)
                      }
                    />
                    <TogglePill
                      active={cleanRemoveEmpty}
                      label="删除空行"
                      onClick={() =>
                        setCleanRemoveEmpty((value) => !value)
                      }
                    />
                    <TogglePill
                      active={cleanCollapseEmpty}
                      label="合并连续空行"
                      onClick={() =>
                        setCleanCollapseEmpty((value) => !value)
                      }
                    />
                    <TogglePill
                      active={cleanCollapseSpaces}
                      label="压缩行内空白"
                      onClick={() =>
                        setCleanCollapseSpaces((value) => !value)
                      }
                    />
                  </div>
                )}

                {operation === "replace" && (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-[8px] font-semibold tracking-[.12em] text-black/24">
                        FIND
                      </label>
                      <input
                        value={findText}
                        onChange={(event) =>
                          setFindText(event.target.value)
                        }
                        spellCheck={false}
                        className="w-full rounded-full border border-black/[.08] bg-white/35 px-4 py-3 font-mono text-[10px] text-black/68 outline-none transition focus:border-black/25"
                        placeholder="查找内容"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[8px] font-semibold tracking-[.12em] text-black/24">
                        REPLACE WITH
                      </label>
                      <input
                        value={replaceText}
                        onChange={(event) =>
                          setReplaceText(event.target.value)
                        }
                        spellCheck={false}
                        className="w-full rounded-full border border-black/[.08] bg-white/35 px-4 py-3 font-mono text-[10px] text-black/68 outline-none transition focus:border-black/25"
                        placeholder="替换为"
                      />
                    </div>

                    <TogglePill
                      active={replaceAsRegex}
                      label="按正则表达式"
                      onClick={() =>
                        setReplaceAsRegex((value) => !value)
                      }
                    />

                    {replaceAsRegex && (
                      <div className="flex flex-wrap gap-1.5">
                        {REGEX_FLAGS.map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            title={item.title}
                            onClick={() =>
                              toggleRegexFlag(item.key)
                            }
                            className={`grid h-9 min-w-9 place-items-center rounded-full border px-3 font-mono text-[10px] font-semibold transition ${
                              regexFlags.includes(item.key)
                                ? "border-[#52685d]/20 bg-[#52685d] text-white"
                                : "border-black/[.08] text-black/30 hover:bg-white/45"
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {operation === "wrap" && (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-[8px] font-semibold tracking-[.12em] text-black/24">
                        PREFIX
                      </label>
                      <input
                        value={prefix}
                        onChange={(event) =>
                          setPrefix(event.target.value)
                        }
                        spellCheck={false}
                        className="w-full rounded-full border border-black/[.08] bg-white/35 px-4 py-3 font-mono text-[10px] text-black/68 outline-none transition focus:border-black/25"
                        placeholder="如：- "
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[8px] font-semibold tracking-[.12em] text-black/24">
                        SUFFIX
                      </label>
                      <input
                        value={suffix}
                        onChange={(event) =>
                          setSuffix(event.target.value)
                        }
                        spellCheck={false}
                        className="w-full rounded-full border border-black/[.08] bg-white/35 px-4 py-3 font-mono text-[10px] text-black/68 outline-none transition focus:border-black/25"
                        placeholder="如：.css"
                      />
                    </div>

                    <TogglePill
                      active={wrapNonEmptyOnly}
                      label="只处理非空行"
                      onClick={() =>
                        setWrapNonEmptyOnly((value) => !value)
                      }
                    />
                  </div>
                )}

                {operation === "number" && (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-[8px] font-semibold tracking-[.12em] text-black/24">
                        FORMAT
                      </label>
                      <input
                        value={lineNumFormat}
                        onChange={(event) =>
                          setLineNumFormat(event.target.value)
                        }
                        spellCheck={false}
                        className="w-full rounded-full border border-black/[.08] bg-white/35 px-4 py-3 font-mono text-[10px] text-black/68 outline-none transition focus:border-black/25"
                        placeholder="{n}. "
                      />
                      <p className="mt-2 text-[8px] leading-5 text-black/28">
                        支持 {"{n}"}、{"{line}"}、{"{index}"}。
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-2 block text-[8px] text-black/24">
                          起始值
                        </label>
                        <input
                          type="number"
                          value={lineStart}
                          onChange={(event) =>
                            setLineStart(
                              Number(event.target.value) || 0,
                            )
                          }
                          className="w-full rounded-full border border-black/[.08] bg-white/35 px-4 py-3 font-mono text-[10px] outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-[8px] text-black/24">
                          补零位数
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={linePad}
                          onChange={(event) =>
                            setLinePad(
                              Math.max(
                                1,
                                Number(event.target.value) || 1,
                              ),
                            )
                          }
                          className="w-full rounded-full border border-black/[.08] bg-white/35 px-4 py-3 font-mono text-[10px] outline-none"
                        />
                      </div>
                    </div>

                    <TogglePill
                      active={numberNonEmptyOnly}
                      label="只给非空行编号"
                      onClick={() =>
                        setNumberNonEmptyOnly((value) => !value)
                      }
                    />
                  </div>
                )}

                {operation === "case" && (
                  <div className="flex flex-wrap gap-2">
                    {(["upper", "lower", "title", "sentence"] as CaseMode[]).map(
                      (mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setCaseMode(mode)}
                          className={`rounded-full px-3.5 py-2 text-[8px] font-semibold transition ${
                            caseMode === mode
                              ? "bg-[#22231f] text-white"
                              : "text-black/32 hover:bg-white/45 hover:text-black"
                          }`}
                        >
                          {mode === "upper"
                            ? "全部大写"
                            : mode === "lower"
                              ? "全部小写"
                              : mode === "title"
                                ? "标题式"
                                : "句首大写"}
                        </button>
                      ),
                    )}
                  </div>
                )}

                {operation === "sort" && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          "asc",
                          "desc",
                          "lengthAsc",
                          "lengthDesc",
                          "random",
                        ] as SortMode[]
                      ).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setSortMode(mode)}
                          className={`rounded-full px-3.5 py-2 text-[8px] font-semibold transition ${
                            sortMode === mode
                              ? "bg-[#22231f] text-white"
                              : "text-black/32 hover:bg-white/45 hover:text-black"
                          }`}
                        >
                          {mode === "asc"
                            ? "A → Z"
                            : mode === "desc"
                              ? "Z → A"
                              : mode === "lengthAsc"
                                ? "短 → 长"
                                : mode === "lengthDesc"
                                  ? "长 → 短"
                                  : "随机洗牌"}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <TogglePill
                        active={sortTrim}
                        label="排序前 trim"
                        onClick={() =>
                          setSortTrim((value) => !value)
                        }
                      />
                      <TogglePill
                        active={sortRemoveEmpty}
                        label="删除空行"
                        onClick={() =>
                          setSortRemoveEmpty((value) => !value)
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-[24px] border border-black/[.075] bg-white/24">
              <div className="border-b border-black/[.06] px-5 py-4">
                <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">
                  SUMMARY
                </div>

                <p className="mt-2 text-[9px] leading-5 text-black/35">
                  {result.note}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-px bg-black/[.06]">
                {result.details.map((item) => {
                  const tone =
                    item.tone === "green"
                      ? "text-[#52685d]"
                      : item.tone === "gold"
                        ? "text-[#9b7542]"
                        : item.tone === "rose"
                          ? "text-[#965744]"
                          : "text-black/61"

                  return (
                    <div
                      key={item.label}
                      className="bg-[#f3f0e8]/92 p-4"
                    >
                      <div className="text-[8px] text-black/24">
                        {item.label}
                      </div>

                      <div
                        className={`batch-num mt-2 break-all font-mono text-[13px] font-semibold ${tone}`}
                      >
                        {item.value}
                      </div>
                    </div>
                  )
                })}
              </div>

              {result.warnings?.length ? (
                <div className="border-t border-black/[.06] px-5 py-4">
                  {result.warnings.map((warning) => (
                    <p
                      key={warning}
                      className="text-[8px] leading-5 text-[#965744]"
                    >
                      {warning}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          </aside>

          <div className="min-w-0">
            <div className="flex flex-col gap-4 border-b border-black/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-[8px] font-semibold tracking-[.14em] text-black/23">
                  WORKSPACE
                </div>

                <h2 className="mt-2 text-[clamp(31px,4vw,48px)] font-semibold leading-none tracking-[-.045em]">
                  输入在左，结果在右。
                </h2>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setInput(SAMPLE_TEXT)}
                  className="rounded-full border border-black/[.085] px-4 py-2.5 text-[9px] font-semibold text-black/36 transition hover:bg-white/45 hover:text-black"
                >
                  示例
                </button>

                <button
                  type="button"
                  onClick={paste}
                  className="rounded-full border border-black/[.085] px-4 py-2.5 text-[9px] font-semibold text-black/36 transition hover:bg-white/45 hover:text-black"
                >
                  粘贴
                </button>

                <button
                  type="button"
                  onClick={clear}
                  className="rounded-full px-4 py-2.5 text-[9px] font-semibold text-[#965744] transition hover:bg-[#965744]/8"
                >
                  清空
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-px overflow-hidden rounded-[30px] border border-black/[.075] bg-black/[.07] lg:grid-cols-2">
              <TextInput
                label="INPUT"
                value={input}
                onChange={setInput}
                placeholder="粘贴需要批量处理的文本……"
              />

              <div ref={outputRef}>
                <TextInput
                  label="OUTPUT"
                  value={result.output}
                  readonly
                  placeholder="处理结果会显示在这里……"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-[8px] text-black/25">
                <span>{formatNumber(inputStats.lines)} 输入行</span>
                <span>{formatNumber(inputStats.nonEmpty)} 非空行</span>
                <span>{formatNumber(outputLines)} 输出行</span>
                <span>{formatNumber(result.output.length)} 输出字符</span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => copy(result.output, "result")}
                  disabled={!result.output}
                  className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white transition hover:scale-[1.01] active:scale-[.98] disabled:opacity-30"
                >
                  {copied === "result" ? "✓ 已复制" : "复制结果"}
                </button>

                <button
                  type="button"
                  onClick={sendOutputToInput}
                  disabled={!result.output}
                  className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 transition hover:bg-white/40 disabled:opacity-30"
                >
                  结果 → 输入
                </button>

                <button
                  type="button"
                  onClick={() => downloadText(result.output)}
                  disabled={!result.output}
                  className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 transition hover:bg-white/40 disabled:opacity-30"
                >
                  导出 TXT
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="batch-intro mt-12 grid gap-9 border-t border-black/10 pt-8 lg:grid-cols-[.55fr_1.45fr]">
          <div>
            <div className="text-[9px] font-semibold tracking-[.14em] text-black/25">
              REPORT
            </div>

            <h2 className="mt-3 text-[clamp(30px,4vw,46px)] font-semibold leading-[1.06] tracking-[-.045em]">
              处理结果，
              <br />
              可以直接带走。
            </h2>

            <p className="mt-5 max-w-[360px] text-[9px] leading-5 text-black/34">
              适合批量整理路由、文件名、文案列表、关键词、CSS 类名、数据清单和临时笔记。
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => copy(report, "report")}
                disabled={!result.output}
                className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white transition hover:scale-[1.01] active:scale-[.98] disabled:opacity-30"
              >
                {copied === "report"
                  ? "✓ 已复制报告"
                  : "复制报告"}
              </button>

              <button
                type="button"
                onClick={() => downloadText(report)}
                disabled={!result.output}
                className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 transition hover:bg-white/40 disabled:opacity-30"
              >
                导出报告
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-[25px] border border-black/[.08] bg-[#171916]">
            <div className="flex items-center justify-between border-b border-white/[.07] px-5 py-3">
              <span className="text-[8px] tracking-[.13em] text-white/25">
                PROCESS PROFILE
              </span>

              <span className="text-[8px] text-white/17">
                LOCAL BATCH
              </span>
            </div>

            <div className="batch-dark-scroll max-h-[390px] overflow-auto p-5 sm:p-6">
              <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-7 text-[#c7d3c7]">
                {result.output ? report : "等待输入…"}
              </pre>
            </div>
          </div>
        </section>

        <section className="batch-intro mt-12 grid gap-8 border-t border-black/10 pt-7 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              ONE WORKSPACE
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              原本分散在两个区域的去重和批处理，现在集中在一个输入 / 输出工作台里，切换操作更快。
            </p>
          </div>

          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              MORE ACTIONS
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              保留原来的去重、空行清理、替换、前缀后缀和编号，同时增加排序、大小写、正则替换和结果回填。
            </p>
          </div>

          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              LOCAL ONLY
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              所有文本都只在当前浏览器中处理，不需要网络请求，也不会上传输入内容。
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
