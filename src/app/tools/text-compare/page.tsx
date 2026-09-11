"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type RawType = "same" | "del" | "add"
type ViewMode = "split" | "unified"
type CopyState = "report" | null

type LineEntry = {
  raw: string
  normalized: string
  line: number
}

type RawDiff = {
  type: RawType
  old?: LineEntry
  next?: LineEntry
}

type CompareRow = {
  type: "same" | "changed" | "del" | "add"
  old?: LineEntry
  next?: LineEntry
}

type CharPiece = {
  type: "same" | "del" | "add"
  value: string
}

const SAMPLE_OLD = `const config = {
  name: "BitLeap",
  version: "1.0",
  theme: "light",
  tools: 86,
}

export default config`

const SAMPLE_NEW = `const config = {
  name: "BitLeap",
  version: "2.0",
  theme: "system",
  tools: 100,
  localOnly: true,
}

export default config`

function makeLines(
  text: string,
  ignoreWhitespace: boolean,
  ignoreCase: boolean,
  ignoreEmpty: boolean,
) {
  if (text === "") return [] as LineEntry[]

  const rawLines = text.split(/\r?\n/)

  return rawLines
    .map((raw, index) => {
      let normalized = ignoreWhitespace ? raw.trim() : raw
      if (ignoreCase) normalized = normalized.toLocaleLowerCase()

      return {
        raw,
        normalized,
        line: index + 1,
      }
    })
    .filter((item) => !(ignoreEmpty && item.normalized === ""))
}

function lcsDiff(a: LineEntry[], b: LineEntry[]) {
  const m = a.length
  const n = b.length

  if (m === 0) {
    return {
      algorithm: "exact" as const,
      result: b.map((item) => ({
        type: "add" as const,
        next: item,
      })),
    }
  }

  if (n === 0) {
    return {
      algorithm: "exact" as const,
      result: a.map((item) => ({
        type: "del" as const,
        old: item,
      })),
    }
  }

  // 精确 LCS 对大矩阵的内存开销很高。超过阈值时使用窗口式快速比对，
  // 避免用户粘贴大文本后页面冻结。
  if (m * n > 4_000_000) {
    return {
      algorithm: "fast" as const,
      result: fastDiff(a, b),
    }
  }

  const dp = Array.from(
    { length: m + 1 },
    () => new Uint32Array(n + 1),
  )

  for (let i = 1; i <= m; i++) {
    const row = dp[i]
    const prev = dp[i - 1]

    for (let j = 1; j <= n; j++) {
      row[j] =
        a[i - 1].normalized === b[j - 1].normalized
          ? prev[j - 1] + 1
          : Math.max(prev[j], row[j - 1])
    }
  }

  const result: RawDiff[] = []
  let i = m
  let j = n

  while (i > 0 || j > 0) {
    if (
      i > 0 &&
      j > 0 &&
      a[i - 1].normalized === b[j - 1].normalized
    ) {
      result.push({
        type: "same",
        old: a[i - 1],
        next: b[j - 1],
      })
      i--
      j--
      continue
    }

    if (
      j > 0 &&
      (i === 0 || dp[i][j - 1] >= dp[i - 1][j])
    ) {
      result.push({
        type: "add",
        next: b[j - 1],
      })
      j--
      continue
    }

    result.push({
      type: "del",
      old: a[i - 1],
    })
    i--
  }

  result.reverse()

  return {
    algorithm: "exact" as const,
    result,
  }
}

function fastDiff(a: LineEntry[], b: LineEntry[]) {
  const result: RawDiff[] = []
  const LOOK_AHEAD = 18

  let i = 0
  let j = 0

  while (i < a.length || j < b.length) {
    if (
      i < a.length &&
      j < b.length &&
      a[i].normalized === b[j].normalized
    ) {
      result.push({
        type: "same",
        old: a[i],
        next: b[j],
      })
      i++
      j++
      continue
    }

    if (i >= a.length) {
      result.push({ type: "add", next: b[j] })
      j++
      continue
    }

    if (j >= b.length) {
      result.push({ type: "del", old: a[i] })
      i++
      continue
    }

    let nextInB = -1
    let nextInA = -1

    for (
      let offset = 1;
      offset <= LOOK_AHEAD && j + offset < b.length;
      offset++
    ) {
      if (a[i].normalized === b[j + offset].normalized) {
        nextInB = offset
        break
      }
    }

    for (
      let offset = 1;
      offset <= LOOK_AHEAD && i + offset < a.length;
      offset++
    ) {
      if (b[j].normalized === a[i + offset].normalized) {
        nextInA = offset
        break
      }
    }

    if (
      nextInB !== -1 &&
      (nextInA === -1 || nextInB <= nextInA)
    ) {
      for (let step = 0; step < nextInB; step++) {
        result.push({
          type: "add",
          next: b[j + step],
        })
      }
      j += nextInB
      continue
    }

    if (nextInA !== -1) {
      for (let step = 0; step < nextInA; step++) {
        result.push({
          type: "del",
          old: a[i + step],
        })
      }
      i += nextInA
      continue
    }

    result.push({ type: "del", old: a[i] })
    result.push({ type: "add", next: b[j] })
    i++
    j++
  }

  return result
}

function buildRows(diff: RawDiff[]) {
  const rows: CompareRow[] = []
  let index = 0

  while (index < diff.length) {
    const item = diff[index]

    if (item.type === "same") {
      rows.push({
        type: "same",
        old: item.old,
        next: item.next,
      })
      index++
      continue
    }

    const deleted: LineEntry[] = []
    const added: LineEntry[] = []

    while (
      index < diff.length &&
      diff[index].type !== "same"
    ) {
      const current = diff[index]

      if (current.type === "del" && current.old) {
        deleted.push(current.old)
      }

      if (current.type === "add" && current.next) {
        added.push(current.next)
      }

      index++
    }

    const paired = Math.min(deleted.length, added.length)

    for (let pair = 0; pair < paired; pair++) {
      rows.push({
        type: "changed",
        old: deleted[pair],
        next: added[pair],
      })
    }

    for (let rest = paired; rest < deleted.length; rest++) {
      rows.push({
        type: "del",
        old: deleted[rest],
      })
    }

    for (let rest = paired; rest < added.length; rest++) {
      rows.push({
        type: "add",
        next: added[rest],
      })
    }
  }

  return rows
}

function fallbackCharDiff(oldText: string, newText: string) {
  const oldChars = Array.from(oldText)
  const newChars = Array.from(newText)

  let start = 0
  let oldEnd = oldChars.length - 1
  let newEnd = newChars.length - 1

  while (
    start <= oldEnd &&
    start <= newEnd &&
    oldChars[start] === newChars[start]
  ) {
    start++
  }

  while (
    oldEnd >= start &&
    newEnd >= start &&
    oldChars[oldEnd] === newChars[newEnd]
  ) {
    oldEnd--
    newEnd--
  }

  const pieces: CharPiece[] = []

  if (start > 0) {
    pieces.push({
      type: "same",
      value: oldChars.slice(0, start).join(""),
    })
  }

  if (oldEnd >= start) {
    pieces.push({
      type: "del",
      value: oldChars.slice(start, oldEnd + 1).join(""),
    })
  }

  if (newEnd >= start) {
    pieces.push({
      type: "add",
      value: newChars.slice(start, newEnd + 1).join(""),
    })
  }

  if (oldEnd + 1 < oldChars.length) {
    pieces.push({
      type: "same",
      value: oldChars.slice(oldEnd + 1).join(""),
    })
  }

  return pieces
}

function charDiff(oldText: string, newText: string) {
  const a = Array.from(oldText)
  const b = Array.from(newText)

  if (a.length * b.length > 100_000) {
    return fallbackCharDiff(oldText, newText)
  }

  const dp = Array.from(
    { length: a.length + 1 },
    () => new Uint16Array(b.length + 1),
  )

  for (let i = 1; i <= a.length; i++) {
    const row = dp[i]
    const prev = dp[i - 1]

    for (let j = 1; j <= b.length; j++) {
      row[j] =
        a[i - 1] === b[j - 1]
          ? prev[j - 1] + 1
          : Math.max(prev[j], row[j - 1])
    }
  }

  const reversed: CharPiece[] = []
  let i = a.length
  let j = b.length

  const pushPiece = (
    type: CharPiece["type"],
    value: string,
  ) => {
    const last = reversed[reversed.length - 1]

    if (last?.type === type) {
      last.value = value + last.value
    } else {
      reversed.push({ type, value })
    }
  }

  while (i > 0 || j > 0) {
    if (
      i > 0 &&
      j > 0 &&
      a[i - 1] === b[j - 1]
    ) {
      pushPiece("same", a[i - 1])
      i--
      j--
      continue
    }

    if (
      j > 0 &&
      (i === 0 || dp[i][j - 1] >= dp[i - 1][j])
    ) {
      pushPiece("add", b[j - 1])
      j--
      continue
    }

    pushPiece("del", a[i - 1])
    i--
  }

  return reversed.reverse()
}

function DiffText({
  oldText,
  newText,
  side,
  enabled,
}: {
  oldText: string
  newText: string
  side: "old" | "new"
  enabled: boolean
}) {
  if (!enabled) {
    return <>{side === "old" ? oldText : newText}</>
  }

  const pieces = charDiff(oldText, newText)

  return (
    <>
      {pieces.map((piece, index) => {
        if (piece.type === "same") {
          return (
            <span key={`${piece.type}-${index}`}>
              {piece.value}
            </span>
          )
        }

        if (
          side === "old" &&
          piece.type === "del"
        ) {
          return (
            <mark
              key={`${piece.type}-${index}`}
              className="rounded-[3px] bg-[#b65e4f]/22 px-[1px] text-inherit"
            >
              {piece.value}
            </mark>
          )
        }

        if (
          side === "new" &&
          piece.type === "add"
        ) {
          return (
            <mark
              key={`${piece.type}-${index}`}
              className="rounded-[3px] bg-[#5f8b71]/24 px-[1px] text-inherit"
            >
              {piece.value}
            </mark>
          )
        }

        return null
      })}
    </>
  )
}

function makeReport(rows: CompareRow[]) {
  const lines = [
    "--- 文本 A",
    "+++ 文本 B",
    "",
  ]

  for (const row of rows) {
    if (row.type === "same") {
      lines.push(`  ${row.old?.raw ?? ""}`)
      continue
    }

    if (row.type === "changed") {
      lines.push(`- ${row.old?.raw ?? ""}`)
      lines.push(`+ ${row.next?.raw ?? ""}`)
      continue
    }

    if (row.type === "del") {
      lines.push(`- ${row.old?.raw ?? ""}`)
      continue
    }

    lines.push(`+ ${row.next?.raw ?? ""}`)
  }

  return lines.join("\n")
}

function downloadReport(report: string) {
  const blob = new Blob([report], {
    type: "text/plain;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = "bitleap-text-diff.txt"
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 500)
}

export default function TextCompare() {
  const [text1, setText1] = useState(SAMPLE_OLD)
  const [text2, setText2] = useState(SAMPLE_NEW)
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false)
  const [ignoreCase, setIgnoreCase] = useState(false)
  const [ignoreEmpty, setIgnoreEmpty] = useState(false)
  const [charLevel, setCharLevel] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>("split")
  const [showSame, setShowSame] = useState(true)
  const [copied, setCopied] = useState<CopyState>(null)

  const pageRef = useRef<HTMLDivElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  const prepared = useMemo(() => {
    const a = makeLines(
      text1,
      ignoreWhitespace,
      ignoreCase,
      ignoreEmpty,
    )
    const b = makeLines(
      text2,
      ignoreWhitespace,
      ignoreCase,
      ignoreEmpty,
    )

    const calculated = lcsDiff(a, b)
    const rows = buildRows(calculated.result)

    return {
      a,
      b,
      rows,
      algorithm: calculated.algorithm,
    }
  }, [
    text1,
    text2,
    ignoreWhitespace,
    ignoreCase,
    ignoreEmpty,
  ])

  const stats = useMemo(() => {
    const same = prepared.rows.filter(
      (row) => row.type === "same",
    ).length
    const changed = prepared.rows.filter(
      (row) => row.type === "changed",
    ).length
    const deleted = prepared.rows.filter(
      (row) => row.type === "del",
    ).length
    const added = prepared.rows.filter(
      (row) => row.type === "add",
    ).length

    const total = prepared.a.length + prepared.b.length
    const similarity =
      total === 0
        ? null
        : Math.round(
            (2 * same * 1000) / total,
          ) / 10

    return {
      linesA:
        text1 === "" ? 0 : text1.split(/\r?\n/).length,
      linesB:
        text2 === "" ? 0 : text2.split(/\r?\n/).length,
      same,
      changed,
      deleted,
      added,
      similarity,
    }
  }, [prepared, text1, text2])

  const isIdentical =
    text1 !== "" &&
    text2 !== "" &&
    stats.changed === 0 &&
    stats.deleted === 0 &&
    stats.added === 0

  const visibleRows = useMemo(
    () =>
      showSame
        ? prepared.rows
        : prepared.rows.filter(
            (row) => row.type !== "same",
          ),
    [prepared.rows, showSame],
  )

  const report = useMemo(
    () => makeReport(prepared.rows),
    [prepared.rows],
  )

  useEffect(() => {
    if (
      !pageRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    const ctx = gsap.context(() => {
      gsap.from(".compare-intro", {
        y: 22,
        opacity: 0,
        duration: 0.78,
        stagger: 0.055,
        ease: "power3.out",
      })

      gsap.to(".compare-orbit-a", {
        rotation: 360,
        duration: 68,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })

      gsap.to(".compare-orbit-b", {
        rotation: -360,
        duration: 102,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })
    }, pageRef)

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (
      !resultRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    gsap.fromTo(
      resultRef.current,
      { opacity: 0.55, y: 5 },
      {
        opacity: 1,
        y: 0,
        duration: 0.28,
        ease: "power2.out",
        overwrite: true,
      },
    )
  }, [
    text1,
    text2,
    ignoreWhitespace,
    ignoreCase,
    ignoreEmpty,
    charLevel,
    viewMode,
    showSame,
  ])

  const swap = () => {
    setText1(text2)
    setText2(text1)
  }

  const clear = () => {
    setText1("")
    setText2("")
    setCopied(null)
  }

  const loadSample = () => {
    setText1(SAMPLE_OLD)
    setText2(SAMPLE_NEW)
  }

  const copyReport = async () => {
    if (!prepared.rows.length) return

    try {
      await navigator.clipboard.writeText(report)
      setCopied("report")
      window.setTimeout(() => setCopied(null), 1200)
    } catch {}
  }

  return (
    <div
      ref={pageRef}
      className="min-h-screen overflow-hidden bg-[#efede6] text-[#22231f] selection:bg-[#22231f] selection:text-white"
    >
      <style>{`
        .compare-scroll::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }

        .compare-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .compare-scroll::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(34,35,31,.13);
        }

        .compare-dark-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,.14);
        }

        .compare-num {
          font-variant-numeric: tabular-nums lining-nums;
        }

        .compare-grid {
          background-image:
            linear-gradient(rgba(34,35,31,.032) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,35,31,.032) 1px, transparent 1px);
          background-size: 30px 30px;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_9%,rgba(178,151,91,.10),transparent_27%),radial-gradient(circle_at_8%_88%,rgba(73,107,91,.08),transparent_31%)]" />

        <div className="compare-orbit-a absolute right-[-20vw] top-[-24vw] h-[58vw] w-[58vw] rounded-full border border-black/[.04]">
          <span className="absolute left-[15%] top-[43%] h-2 w-2 rounded-full bg-[#b28d48]/38" />
        </div>

        <div className="compare-orbit-b absolute bottom-[-26vw] left-[-19vw] h-[53vw] w-[53vw] rounded-full border border-black/[.032]">
          <span className="absolute right-[14%] top-[31%] h-1.5 w-1.5 rounded-full bg-[#52685d]/35" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1580px] px-5 pb-10 pt-6 sm:px-8">
        <div className="compare-intro">
          <Breadcrumb />
        </div>

        <header className="compare-intro mt-8 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/27">
              TEXT DIFF STUDIO
            </div>

            <h1 className="mt-4 max-w-[870px] text-[clamp(48px,6.35vw,90px)] font-semibold leading-[1.03] tracking-[-.055em]">
              把变化，
              <br />
              一行一行展开。
            </h1>
          </div>

          <div>
            <p className="max-w-[540px] text-[11px] leading-6 text-black/40">
              对比两版文本，识别新增、删除与修改内容。支持字符级差异、忽略空白 / 大小写 / 空行，以及大文本保护。
            </p>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[8px] text-black/25">
              <span>LOCAL ONLY</span>
              <span>LINE DIFF</span>
              <span>CHAR DIFF</span>
              <span>{prepared.algorithm === "exact" ? "EXACT LCS" : "FAST MODE"}</span>
            </div>
          </div>
        </header>

        <section className="compare-intro mt-6 flex flex-col gap-4 border-b border-black/10 pb-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-x-5 gap-y-3">
            <label className="flex cursor-pointer items-center gap-2 text-[9px] text-black/37">
              <input
                type="checkbox"
                checked={ignoreWhitespace}
                onChange={(event) => setIgnoreWhitespace(event.target.checked)}
                className="accent-[#22231f]"
              />
              忽略首尾空白
            </label>

            <label className="flex cursor-pointer items-center gap-2 text-[9px] text-black/37">
              <input
                type="checkbox"
                checked={ignoreCase}
                onChange={(event) => setIgnoreCase(event.target.checked)}
                className="accent-[#22231f]"
              />
              忽略大小写
            </label>

            <label className="flex cursor-pointer items-center gap-2 text-[9px] text-black/37">
              <input
                type="checkbox"
                checked={ignoreEmpty}
                onChange={(event) => setIgnoreEmpty(event.target.checked)}
                className="accent-[#22231f]"
              />
              忽略空行
            </label>

            <label className="flex cursor-pointer items-center gap-2 text-[9px] text-black/37">
              <input
                type="checkbox"
                checked={charLevel}
                onChange={(event) => setCharLevel(event.target.checked)}
                className="accent-[#22231f]"
              />
              行内字符高亮
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={swap}
              className="rounded-full border border-black/[.085] px-4 py-2.5 text-[9px] font-semibold text-black/38 transition hover:bg-white/45 hover:text-black"
            >
              A ⇄ B
            </button>

            <button
              type="button"
              onClick={loadSample}
              className="rounded-full border border-black/[.085] px-4 py-2.5 text-[9px] font-semibold text-black/38 transition hover:bg-white/45 hover:text-black"
            >
              示例
            </button>

            <button
              type="button"
              onClick={clear}
              className="rounded-full px-3 py-2.5 text-[9px] font-semibold text-[#955945] transition hover:bg-[#955945]/8"
            >
              清空
            </button>
          </div>
        </section>

        <section className="compare-intro mt-7 grid gap-px overflow-hidden rounded-[30px] border border-black/[.075] bg-black/[.07] lg:grid-cols-2">
          <div className="min-w-0 bg-[#f4f1e9]">
            <div className="flex h-12 items-center justify-between border-b border-black/[.065] px-5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#a85f50]" />
                <span className="text-[8px] font-semibold tracking-[.13em] text-black/26">
                  TEXT A / OLD
                </span>
              </div>

              <span className="compare-num font-mono text-[8px] text-black/23">
                {stats.linesA} lines
              </span>
            </div>

            <textarea
              value={text1}
              onChange={(event) => setText1(event.target.value)}
              spellCheck={false}
              placeholder="粘贴原始文本…"
              className="compare-scroll block h-[350px] w-full resize-none bg-transparent p-5 font-mono text-[11px] leading-6 text-[#292b26] outline-none placeholder:text-black/16 sm:p-6"
            />
          </div>

          <div className="min-w-0 bg-[#f4f1e9]">
            <div className="flex h-12 items-center justify-between border-b border-black/[.065] px-5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#5f806c]" />
                <span className="text-[8px] font-semibold tracking-[.13em] text-black/26">
                  TEXT B / NEW
                </span>
              </div>

              <span className="compare-num font-mono text-[8px] text-black/23">
                {stats.linesB} lines
              </span>
            </div>

            <textarea
              value={text2}
              onChange={(event) => setText2(event.target.value)}
              spellCheck={false}
              placeholder="粘贴修改后的文本…"
              className="compare-scroll block h-[350px] w-full resize-none bg-transparent p-5 font-mono text-[11px] leading-6 text-[#292b26] outline-none placeholder:text-black/16 sm:p-6"
            />
          </div>
        </section>

        <section className="compare-intro mt-5 grid gap-px overflow-hidden rounded-[22px] bg-black/[.07] sm:grid-cols-2 lg:grid-cols-6">
          {[
            ["SIMILARITY", stats.similarity === null ? "—" : `${stats.similarity}%`],
            ["SAME", String(stats.same)],
            ["MODIFIED", String(stats.changed)],
            ["ADDED", `+${stats.added}`],
            ["DELETED", `-${stats.deleted}`],
            ["ENGINE", prepared.algorithm === "exact" ? "EXACT" : "FAST"],
          ].map(([label, value]) => (
            <div key={label} className="bg-[#f3f0e8] p-4">
              <div className="text-[7px] font-semibold tracking-[.12em] text-black/23">
                {label}
              </div>

              <div
                className={`compare-num mt-3 font-mono text-[13px] font-semibold ${
                  label === "ADDED"
                    ? "text-[#557763]"
                    : label === "DELETED"
                      ? "text-[#9b5548]"
                      : ""
                }`}
              >
                {value}
              </div>
            </div>
          ))}
        </section>

        <section className="compare-intro mt-10">
          <div className="flex flex-col gap-4 border-b border-black/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[8px] font-semibold tracking-[.14em] text-black/23">
                DIFF RESULT
              </div>

              <h2 className="mt-2 text-[clamp(31px,4vw,48px)] font-semibold leading-none tracking-[-.045em]">
                {isIdentical ? "没有发现差异。" : "变化就在这里。"}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSame((value) => !value)}
                className={`rounded-full border px-3.5 py-2.5 text-[8px] font-semibold transition ${
                  showSame
                    ? "border-black/[.085] text-black/35"
                    : "border-[#52685d]/20 bg-[#52685d] text-white"
                }`}
              >
                {showSame ? "隐藏相同行" : "显示相同行"}
              </button>

              <div className="flex rounded-full border border-black/[.085] p-1">
                {(["split", "unified"] as ViewMode[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setViewMode(value)}
                    className={`rounded-full px-3.5 py-2 text-[8px] font-semibold transition ${
                      viewMode === value
                        ? "bg-[#22231f] text-white"
                        : "text-black/30"
                    }`}
                  >
                    {value === "split" ? "左右视图" : "统一视图"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div
            ref={resultRef}
            className="compare-dark-scroll mt-5 max-h-[620px] overflow-auto rounded-[26px] border border-black/[.08] bg-[#151714] font-mono"
          >
            {!prepared.rows.length ? (
              <div className="grid min-h-[260px] place-items-center px-6 text-center">
                <div>
                  <div className="text-[9px] tracking-[.14em] text-white/16">
                    WAITING FOR TEXT
                  </div>
                  <p className="mt-3 text-[9px] leading-5 text-white/22">
                    输入两段文本后，会在这里生成差异。
                  </p>
                </div>
              </div>
            ) : isIdentical ? (
              <div className="grid min-h-[260px] place-items-center px-6 text-center">
                <div>
                  <div className="mx-auto h-2 w-2 rounded-full bg-[#73907c]" />
                  <div className="mt-4 text-xl font-semibold tracking-[-.035em] text-white">
                    两段文本一致
                  </div>
                  <p className="mt-2 text-[9px] text-white/28">
                    当前比较条件下没有检测到差异。
                  </p>
                </div>
              </div>
            ) : viewMode === "split" ? (
              <div className="min-w-[760px]">
                <div className="sticky top-0 z-10 grid grid-cols-2 border-b border-white/[.06] bg-[#151714]/95 backdrop-blur">
                  <div className="border-r border-white/[.055] px-4 py-3 text-[8px] tracking-[.12em] text-white/24">
                    A / OLD
                  </div>
                  <div className="px-4 py-3 text-[8px] tracking-[.12em] text-white/24">
                    B / NEW
                  </div>
                </div>

                {visibleRows.map((row, index) => {
                  const oldClass =
                    row.type === "del" || row.type === "changed"
                      ? "bg-[#9d5145]/10 text-[#e6a89c]"
                      : "text-white/53"

                  const newClass =
                    row.type === "add" || row.type === "changed"
                      ? "bg-[#50755e]/11 text-[#acd0b6]"
                      : "text-white/53"

                  return (
                    <div
                      key={`${row.type}-${index}-${row.old?.line ?? "x"}-${row.next?.line ?? "x"}`}
                      className="grid min-h-8 grid-cols-2 border-b border-white/[.035] last:border-b-0"
                    >
                      <div className={`grid min-w-0 grid-cols-[46px_1fr] border-r border-white/[.045] ${oldClass}`}>
                        <span className="compare-num select-none border-r border-white/[.035] px-2 py-2.5 text-right text-[8px] text-white/18">
                          {row.old?.line ?? ""}
                        </span>

                        <span className="min-w-0 whitespace-pre-wrap break-words px-3 py-2.5 text-[10px] leading-5">
                          {row.old ? (
                            row.type === "changed" && row.next ? (
                              <DiffText
                                oldText={row.old.raw}
                                newText={row.next.raw}
                                side="old"
                                enabled={charLevel}
                              />
                            ) : (
                              row.old.raw || " "
                            )
                          ) : (
                            " "
                          )}
                        </span>
                      </div>

                      <div className={`grid min-w-0 grid-cols-[46px_1fr] ${newClass}`}>
                        <span className="compare-num select-none border-r border-white/[.035] px-2 py-2.5 text-right text-[8px] text-white/18">
                          {row.next?.line ?? ""}
                        </span>

                        <span className="min-w-0 whitespace-pre-wrap break-words px-3 py-2.5 text-[10px] leading-5">
                          {row.next ? (
                            row.type === "changed" && row.old ? (
                              <DiffText
                                oldText={row.old.raw}
                                newText={row.next.raw}
                                side="new"
                                enabled={charLevel}
                              />
                            ) : (
                              row.next.raw || " "
                            )
                          ) : (
                            " "
                          )}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div>
                <div className="sticky top-0 z-10 grid grid-cols-[54px_54px_28px_1fr] border-b border-white/[.06] bg-[#151714]/95 px-0 backdrop-blur">
                  <div className="px-2 py-3 text-right text-[8px] text-white/18">
                    A
                  </div>
                  <div className="px-2 py-3 text-right text-[8px] text-white/18">
                    B
                  </div>
                  <div />
                  <div className="px-3 py-3 text-[8px] tracking-[.12em] text-white/24">
                    UNIFIED DIFF
                  </div>
                </div>

                {visibleRows.flatMap((row, index) => {
                  if (row.type === "changed") {
                    return [
                      <div key={`old-${index}`} className="grid grid-cols-[54px_54px_28px_1fr] border-b border-white/[.035] bg-[#9d5145]/10 text-[#e6a89c]">
                        <span className="compare-num px-2 py-2.5 text-right text-[8px] text-white/18">{row.old?.line ?? ""}</span>
                        <span className="compare-num px-2 py-2.5 text-right text-[8px] text-white/10" />
                        <span className="select-none py-2.5 text-center text-[10px]">−</span>
                        <span className="whitespace-pre-wrap break-words px-3 py-2.5 text-[10px] leading-5">
                          {row.old && row.next ? (
                            <DiffText oldText={row.old.raw} newText={row.next.raw} side="old" enabled={charLevel} />
                          ) : (
                            row.old?.raw
                          )}
                        </span>
                      </div>,
                      <div key={`new-${index}`} className="grid grid-cols-[54px_54px_28px_1fr] border-b border-white/[.035] bg-[#50755e]/11 text-[#acd0b6]">
                        <span className="compare-num px-2 py-2.5 text-right text-[8px] text-white/10" />
                        <span className="compare-num px-2 py-2.5 text-right text-[8px] text-white/18">{row.next?.line ?? ""}</span>
                        <span className="select-none py-2.5 text-center text-[10px]">+</span>
                        <span className="whitespace-pre-wrap break-words px-3 py-2.5 text-[10px] leading-5">
                          {row.old && row.next ? (
                            <DiffText oldText={row.old.raw} newText={row.next.raw} side="new" enabled={charLevel} />
                          ) : (
                            row.next?.raw
                          )}
                        </span>
                      </div>,
                    ]
                  }

                  const rowClass =
                    row.type === "del"
                      ? "bg-[#9d5145]/10 text-[#e6a89c]"
                      : row.type === "add"
                        ? "bg-[#50755e]/11 text-[#acd0b6]"
                        : "text-white/51"

                  const symbol =
                    row.type === "del"
                      ? "−"
                      : row.type === "add"
                        ? "+"
                        : " "

                  return [
                    <div key={`${row.type}-${index}`} className={`grid grid-cols-[54px_54px_28px_1fr] border-b border-white/[.035] ${rowClass}`}>
                      <span className="compare-num px-2 py-2.5 text-right text-[8px] text-white/18">
                        {row.old?.line ?? ""}
                      </span>
                      <span className="compare-num px-2 py-2.5 text-right text-[8px] text-white/18">
                        {row.next?.line ?? ""}
                      </span>
                      <span className="select-none py-2.5 text-center text-[10px]">
                        {symbol}
                      </span>
                      <span className="whitespace-pre-wrap break-words px-3 py-2.5 text-[10px] leading-5">
                        {row.old?.raw ?? row.next?.raw ?? " "}
                      </span>
                    </div>,
                  ]
                })}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copyReport}
                disabled={!prepared.rows.length}
                className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white transition hover:scale-[1.01] active:scale-[.98] disabled:opacity-30"
              >
                {copied === "report" ? "✓ 已复制报告" : "复制差异报告"}
              </button>

              <button
                type="button"
                onClick={() => downloadReport(report)}
                disabled={!prepared.rows.length}
                className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 transition hover:bg-white/40 disabled:opacity-30"
              >
                导出 TXT
              </button>
            </div>

            <div className="text-[8px] text-black/24">
              {prepared.algorithm === "exact"
                ? "精确 LCS 比对"
                : "文本较大，已自动切换快速模式以避免页面卡顿"}
            </div>
          </div>
        </section>

        <section className="compare-intro mt-12 grid gap-8 border-t border-black/10 pt-7 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              LINE DIFF
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              先通过行级最长公共子序列寻找稳定锚点，再把连续删除 / 新增块组合成更易读的修改行。
            </p>
          </div>

          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              CHAR DIFF
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              修改行可以继续做字符级差异，中文、代码和普通文本都能直接看出具体改动位置。
            </p>
          </div>

          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              SAFE LARGE TEXT
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              大文本超过精确矩阵阈值后自动使用轻量快速模式，避免原始 O(m×n) 矩阵拖慢浏览器。
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
