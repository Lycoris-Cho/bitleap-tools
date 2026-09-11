"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type OutputMode = "pretty" | "minify"
type IndentMode = "2" | "4" | "tab"
type CopyState = "output" | "input" | null

type JsonToken = {
  value: string
  type:
    | "key"
    | "string"
    | "number"
    | "boolean"
    | "null"
    | "punctuation"
    | "space"
    | "plain"
}

const SAMPLE = `{
  "name": "BitLeap",
  "version": "2.0",
  "private": true,
  "features": [
    "JSON 格式化",
    "结构统计",
    "本地处理"
  ],
  "author": {
    "name": "Lycoris",
    "tools": 100
  }
}`

function getIndent(indent: IndentMode) {
  if (indent === "4") return 4
  if (indent === "tab") return "\t"
  return 2
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson)

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort((a, b) => a.localeCompare(b))
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = sortJson(
          (value as Record<string, unknown>)[key],
        )
        return result
      }, {})
  }

  return value
}

function getDepth(value: unknown): number {
  if (value === null || typeof value !== "object") return 0

  if (Array.isArray(value)) {
    if (value.length === 0) return 1
    return 1 + Math.max(...value.map(getDepth))
  }

  const values = Object.values(value as Record<string, unknown>)
  if (values.length === 0) return 1
  return 1 + Math.max(...values.map(getDepth))
}

function getNodeCount(value: unknown): number {
  if (value === null || typeof value !== "object") return 1

  if (Array.isArray(value)) {
    return 1 + value.reduce((sum, item) => sum + getNodeCount(item), 0)
  }

  return (
    1 +
    Object.values(value as Record<string, unknown>).reduce<number>(
      (sum, item) => sum + getNodeCount(item),
      0,
    )
  )
}

function getKeyCount(value: unknown): number {
  if (value === null || typeof value !== "object") return 0

  if (Array.isArray(value)) {
    return value.reduce((sum, item) => sum + getKeyCount(item), 0)
  }

  const object = value as Record<string, unknown>
  return (
    Object.keys(object).length +
    Object.values(object).reduce<number>(
      (sum, item) => sum + getKeyCount(item),
      0,
    )
  )
}

function rootType(value: unknown) {
  if (Array.isArray(value)) return "Array"
  if (value === null) return "Null"
  if (typeof value === "object") return "Object"
  if (typeof value === "string") return "String"
  if (typeof value === "number") return "Number"
  if (typeof value === "boolean") return "Boolean"
  return typeof value
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).length
}

function humanBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function getJsonErrorInfo(
  input: string,
  error: unknown,
): {
  message: string
  line: number | null
  column: number | null
  position: number | null
} {
  const message =
    error instanceof Error ? error.message : "JSON 解析失败"

  const match =
    message.match(/position\s+(\d+)/i) ||
    message.match(/at\s+position\s+(\d+)/i)

  if (!match) {
    return {
      message,
      line: null,
      column: null,
      position: null,
    }
  }

  const position = Number(match[1])
  const before = input.slice(0, position)
  const lines = before.split("\n")

  return {
    message,
    position,
    line: lines.length,
    column: (lines.at(-1)?.length ?? 0) + 1,
  }
}

function tokenizeJson(source: string): JsonToken[] {
  const matcher =
    /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(?=\s*:))|("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false)\b|\b(null)\b|([{}\[\],:])|(\s+)|([^\s]+)/g

  const tokens: JsonToken[] = []
  let match: RegExpExecArray | null

  while ((match = matcher.exec(source))) {
    let type: JsonToken["type"] = "plain"

    if (match[1]) type = "key"
    else if (match[2]) type = "string"
    else if (match[3]) type = "number"
    else if (match[4]) type = "boolean"
    else if (match[5]) type = "null"
    else if (match[6]) type = "punctuation"
    else if (match[7]) type = "space"

    tokens.push({
      value: match[0],
      type,
    })
  }

  return tokens
}

function downloadText(
  filename: string,
  content: string,
  type = "application/json;charset=utf-8",
) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 500)
}

function SyntaxJson({ value }: { value: string }) {
  const tokens = useMemo(() => tokenizeJson(value), [value])

  const classMap: Record<JsonToken["type"], string> = {
    key: "text-[#b8d6c1]",
    string: "text-[#e3b58a]",
    number: "text-[#d9c77b]",
    boolean: "text-[#afa5f0]",
    null: "text-[#b888a7]",
    punctuation: "text-white/48",
    space: "",
    plain: "text-white/65",
  }

  return (
    <code>
      {tokens.map((token, index) => (
        <span
          key={`${token.type}-${index}`}
          className={classMap[token.type]}
        >
          {token.value}
        </span>
      ))}
    </code>
  )
}

export default function JsonPage() {
  const [input, setInput] = useState(SAMPLE)
  const [mode, setMode] = useState<OutputMode>("pretty")
  const [indent, setIndent] = useState<IndentMode>("2")
  const [sortKeys, setSortKeys] = useState(false)
  const [copied, setCopied] = useState<CopyState>(null)
  const [dragging, setDragging] = useState(false)

  const pageRef = useRef<HTMLDivElement>(null)
  const outputRef = useRef<HTMLPreElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parsed = useMemo(() => {
    if (!input.trim()) {
      return {
        valid: false as const,
        empty: true,
        value: null as unknown,
        error: null,
      }
    }

    try {
      return {
        valid: true as const,
        empty: false,
        value: JSON.parse(input) as unknown,
        error: null,
      }
    } catch (error) {
      return {
        valid: false as const,
        empty: false,
        value: null as unknown,
        error: getJsonErrorInfo(input, error),
      }
    }
  }, [input])

  const transformedValue = useMemo(() => {
    if (!parsed.valid) return null
    return sortKeys ? sortJson(parsed.value) : parsed.value
  }, [parsed, sortKeys])

  const output = useMemo(() => {
    if (!parsed.valid) return ""

    return mode === "minify"
      ? JSON.stringify(transformedValue)
      : JSON.stringify(
          transformedValue,
          null,
          getIndent(indent),
        )
  }, [parsed.valid, transformedValue, mode, indent])

  const stats = useMemo(() => {
    if (!parsed.valid) {
      return {
        type: "—",
        keys: 0,
        nodes: 0,
        depth: 0,
        inputBytes: byteLength(input),
        outputBytes: 0,
      }
    }

    return {
      type: rootType(parsed.value),
      keys: getKeyCount(parsed.value),
      nodes: getNodeCount(parsed.value),
      depth: getDepth(parsed.value),
      inputBytes: byteLength(input),
      outputBytes: byteLength(output),
    }
  }, [parsed, input, output])

  const outputLines = output ? output.split("\n").length : 0

  useEffect(() => {
    if (
      !pageRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    const ctx = gsap.context(() => {
      gsap.from(".json-intro", {
        y: 22,
        opacity: 0,
        duration: 0.78,
        stagger: 0.055,
        ease: "power3.out",
      })

      gsap.to(".json-orbit-a", {
        rotation: 360,
        duration: 64,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })

      gsap.to(".json-orbit-b", {
        rotation: -360,
        duration: 96,
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
      !output ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    gsap.fromTo(
      outputRef.current,
      {
        y: 5,
        opacity: 0.55,
      },
      {
        y: 0,
        opacity: 1,
        duration: 0.25,
        ease: "power2.out",
        overwrite: true,
      },
    )
  }, [output])

  const copy = async (
    value: string,
    kind: CopyState,
  ) => {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setCopied(kind)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {}
  }

  const clear = () => {
    setInput("")
    setCopied(null)
    textareaRef.current?.focus()
  }

  const useOutputAsInput = () => {
    if (!output) return
    setInput(output)
    window.requestAnimationFrame(() =>
      textareaRef.current?.focus(),
    )
  }

  const loadFile = async (file: File) => {
    if (
      !file.name.toLowerCase().endsWith(".json") &&
      file.type !== "application/json"
    ) {
      return
    }

    try {
      const text = await file.text()
      setInput(text)
    } catch {}
  }

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) setInput(text)
    } catch {}
  }

  const jumpToError = () => {
    if (
      !textareaRef.current ||
      !parsed.error?.position
    ) {
      textareaRef.current?.focus()
      return
    }

    const position = parsed.error.position
    textareaRef.current.focus()
    textareaRef.current.setSelectionRange(position, position)
  }

  return (
    <div
      ref={pageRef}
      className="min-h-screen overflow-hidden bg-[#eeece5] text-[#22231f] selection:bg-[#22231f] selection:text-white"
    >
      <style>{`
        .json-scroll::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }

        .json-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .json-scroll::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(255,255,255,.13);
        }

        .json-range {
          font-variant-numeric: tabular-nums lining-nums;
        }

        .json-grid {
          background-image:
            linear-gradient(rgba(34,35,31,.032) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,35,31,.032) 1px, transparent 1px);
          background-size: 30px 30px;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_9%,rgba(178,151,91,.10),transparent_27%),radial-gradient(circle_at_8%_88%,rgba(73,107,91,.08),transparent_31%)]" />

        <div className="json-orbit-a absolute right-[-20vw] top-[-24vw] h-[58vw] w-[58vw] rounded-full border border-black/[.04]">
          <span className="absolute left-[15%] top-[43%] h-2 w-2 rounded-full bg-[#b28d48]/38" />
        </div>

        <div className="json-orbit-b absolute bottom-[-26vw] left-[-19vw] h-[53vw] w-[53vw] rounded-full border border-black/[.032]">
          <span className="absolute right-[14%] top-[31%] h-1.5 w-1.5 rounded-full bg-[#52685d]/35" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1560px] px-5 pb-10 pt-6 sm:px-8">
        <div className="json-intro">
          <Breadcrumb />
        </div>

        <header className="json-intro mt-8 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/27">
              JSON WORKBENCH
            </div>

            <h1 className="mt-4 max-w-[830px] text-[clamp(48px,6.4vw,90px)] font-semibold leading-[1.03] tracking-[-.055em]">
              把结构，
              <br />
              看得更清楚。
            </h1>
          </div>

          <div>
            <p className="max-w-[530px] text-[11px] leading-6 text-black/40">
              实时校验 JSON，格式化、压缩、排序键名并查看结构统计。文件不会离开当前浏览器。
            </p>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[8px] text-black/25">
              <span>LOCAL ONLY</span>
              <span>UTF-8</span>
              <span>NO UPLOAD</span>
              <span>LIVE VALIDATION</span>
            </div>
          </div>
        </header>

        <section className="json-intro mt-6 flex flex-col gap-4 border-b border-black/10 pb-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-1">
            {(["pretty", "minify"] as OutputMode[]).map(
              (value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={`rounded-full px-4 py-2.5 text-[9px] font-semibold transition ${
                    mode === value
                      ? "bg-[#22231f] text-white"
                      : "text-black/35 hover:bg-white/40 hover:text-black"
                  }`}
                >
                  {value === "pretty" ? "格式化" : "压缩"}
                </button>
              ),
            )}

            <span className="mx-1 hidden h-8 w-px bg-black/10 sm:block" />

            {mode === "pretty" &&
              (["2", "4", "tab"] as IndentMode[]).map(
                (value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setIndent(value)}
                    className={`rounded-full px-3.5 py-2.5 font-mono text-[8px] font-semibold transition ${
                      indent === value
                        ? "bg-[#52685d] text-white"
                        : "text-black/32 hover:bg-white/40 hover:text-black"
                    }`}
                  >
                    {value === "tab"
                      ? "TAB"
                      : `${value} SPACES`}
                  </button>
                ),
              )}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-[9px] text-black/35">
              <input
                type="checkbox"
                checked={sortKeys}
                onChange={(event) =>
                  setSortKeys(event.target.checked)
                }
                className="accent-[#22231f]"
              />
              递归排序键名
            </label>

            <button
              type="button"
              onClick={() => setInput(SAMPLE)}
              className="text-[9px] font-semibold text-black/30 transition hover:text-black"
            >
              示例
            </button>

            <button
              type="button"
              onClick={clear}
              className="text-[9px] font-semibold text-[#965744] transition hover:text-[#713f32]"
            >
              清空
            </button>
          </div>
        </section>

        <section
          className={`json-intro json-grid relative mt-6 overflow-hidden rounded-[30px] border ${
            dragging
              ? "border-[#52685d]/45"
              : "border-black/[.075]"
          } bg-black/[.07] transition-colors`}
          onDragEnter={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={(event) => {
            if (
              event.currentTarget.contains(
                event.relatedTarget as Node,
              )
            ) {
              return
            }

            setDragging(false)
          }}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)

            const file = event.dataTransfer.files[0]
            if (file) void loadFile(file)
          }}
        >
          {dragging && (
            <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center bg-[#eeece5]/82 backdrop-blur-sm">
              <div className="text-center">
                <div className="text-[9px] font-semibold tracking-[.16em] text-black/26">
                  DROP JSON FILE
                </div>
                <div className="mt-3 text-2xl font-semibold tracking-[-.04em]">
                  松开即可读取
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-px lg:grid-cols-2">
            <div className="min-w-0 bg-[#f4f1e9]">
              <div className="flex h-12 items-center justify-between border-b border-black/[.065] px-4 sm:px-5">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      parsed.empty
                        ? "bg-black/15"
                        : parsed.valid
                          ? "bg-[#64816f]"
                          : "bg-[#b7604c]"
                    }`}
                  />

                  <span className="text-[8px] font-semibold tracking-[.13em] text-black/26">
                    JSON INPUT
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={paste}
                    className="text-[8px] font-semibold text-black/24 transition hover:text-black"
                  >
                    PASTE
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    className="text-[8px] font-semibold text-black/24 transition hover:text-black"
                  >
                    OPEN .JSON
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) void loadFile(file)
                      event.currentTarget.value = ""
                    }}
                  />
                </div>
              </div>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={(event) =>
                  setInput(event.target.value)
                }
                onKeyDown={(event) => {
                  if (
                    (event.ctrlKey || event.metaKey) &&
                    event.key === "Enter"
                  ) {
                    event.preventDefault()
                    setMode("pretty")
                  }
                }}
                spellCheck={false}
                placeholder='例如：{"name":"BitLeap","version":"2.0"}'
                className="json-scroll block h-[600px] w-full resize-none bg-transparent p-5 font-mono text-[12px] leading-7 text-[#292b26] outline-none placeholder:text-black/16 sm:p-6"
              />
            </div>

            <div className="min-w-0 bg-[#121411]">
              <div className="flex h-12 items-center justify-between border-b border-white/[.065] px-4 sm:px-5">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      parsed.empty
                        ? "bg-white/15"
                        : parsed.valid
                          ? "bg-[#8db09a]"
                          : "bg-[#ca7561]"
                    }`}
                  />

                  <span className="text-[8px] font-semibold tracking-[.13em] text-white/27">
                    {mode === "pretty"
                      ? "FORMATTED OUTPUT"
                      : "MINIFIED OUTPUT"}
                  </span>
                </div>

                <span className="json-range font-mono text-[8px] text-white/18">
                  {output
                    ? `${outputLines} lines · ${humanBytes(
                        stats.outputBytes,
                      )}`
                    : "WAITING"}
                </span>
              </div>

              <div className="relative h-[600px]">
                {!input.trim() ? (
                  <div className="grid h-full place-items-center px-6 text-center">
                    <div>
                      <div className="text-[9px] tracking-[.13em] text-white/14">
                        JSON OUTPUT
                      </div>
                      <p className="mt-3 text-[9px] leading-5 text-white/18">
                        输入、粘贴或拖入一个 JSON 文件。
                      </p>
                    </div>
                  </div>
                ) : parsed.valid ? (
                  <pre
                    ref={outputRef}
                    className="json-scroll h-full overflow-auto whitespace-pre p-5 font-mono text-[11px] leading-6 sm:p-6"
                  >
                    <SyntaxJson value={output} />
                  </pre>
                ) : (
                  <div className="flex h-full items-center p-6 sm:p-8">
                    <div className="max-w-[520px]">
                      <div className="text-[8px] font-semibold tracking-[.14em] text-[#d78470]">
                        INVALID JSON
                      </div>

                      <h3 className="mt-4 text-2xl font-semibold tracking-[-.04em] text-white">
                        这里有一处语法问题。
                      </h3>

                      <p className="mt-4 break-words font-mono text-[10px] leading-6 text-[#d69a8b]">
                        {parsed.error?.message}
                      </p>

                      {(parsed.error?.line ||
                        parsed.error?.column) && (
                        <div className="mt-5 flex flex-wrap gap-2">
                          {parsed.error?.line && (
                            <span className="rounded-full border border-white/[.08] px-3 py-2 font-mono text-[8px] text-white/35">
                              line {parsed.error.line}
                            </span>
                          )}

                          {parsed.error?.column && (
                            <span className="rounded-full border border-white/[.08] px-3 py-2 font-mono text-[8px] text-white/35">
                              column {parsed.error.column}
                            </span>
                          )}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={jumpToError}
                        className="mt-6 rounded-full bg-[#efece4] px-4 py-2.5 text-[9px] font-semibold text-[#171916]"
                      >
                        回到输入位置
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="json-intro mt-4 flex flex-col gap-4 border-b border-black/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => copy(output, "output")}
              disabled={!output}
              className="rounded-full bg-[#22231f] px-5 py-3 text-[10px] font-semibold text-white transition hover:scale-[1.01] active:scale-[.98] disabled:opacity-30"
            >
              {copied === "output"
                ? "✓ 已复制结果"
                : "复制结果"}
            </button>

            <button
              type="button"
              onClick={useOutputAsInput}
              disabled={!output}
              className="rounded-full border border-black/10 px-5 py-3 text-[10px] font-semibold text-black/42 transition hover:bg-white/40 disabled:opacity-30"
            >
              结果 → 输入
            </button>

            <button
              type="button"
              onClick={() =>
                downloadText(
                  "bitleap-formatted.json",
                  output,
                )
              }
              disabled={!output}
              className="rounded-full border border-black/10 px-4 py-3 text-[9px] font-semibold text-black/37 transition hover:bg-white/40 disabled:opacity-30"
            >
              导出 .json
            </button>
          </div>

          <div className="flex items-center gap-2 text-[8px] text-black/24">
            <span>⌘ / Ctrl + Enter</span>
            <span>·</span>
            <span>格式化</span>
          </div>
        </section>

        <section className="json-intro mt-10 grid gap-px overflow-hidden rounded-[24px] bg-black/[.07] sm:grid-cols-2 lg:grid-cols-6">
          {[
            ["STATUS", parsed.valid ? "VALID" : parsed.empty ? "EMPTY" : "ERROR"],
            ["ROOT", stats.type],
            ["KEYS", String(stats.keys)],
            ["NODES", String(stats.nodes)],
            ["DEPTH", String(stats.depth)],
            ["INPUT", humanBytes(stats.inputBytes)],
          ].map(([label, value]) => (
            <div
              key={label}
              className="bg-[#f3f0e8] p-4 sm:p-5"
            >
              <div className="text-[7px] font-semibold tracking-[.12em] text-black/23">
                {label}
              </div>

              <div
                className={`json-range mt-3 font-mono text-[13px] font-semibold ${
                  label === "STATUS" &&
                  value === "VALID"
                    ? "text-[#52685d]"
                    : label === "STATUS" &&
                        value === "ERROR"
                      ? "text-[#9a5543]"
                      : ""
                }`}
              >
                {value}
              </div>
            </div>
          ))}
        </section>

        <section className="json-intro mt-12 grid gap-8 border-t border-black/10 pt-7 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              VALIDATE
            </div>

            <p className="mt-2 text-[9px] leading-5 text-black/34">
              输入时立即解析 JSON。浏览器能够返回字符位置时，会进一步计算对应行号和列号。
            </p>
          </div>

          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              TRANSFORM
            </div>

            <p className="mt-2 text-[9px] leading-5 text-black/34">
              支持格式化、压缩、2 / 4 空格或 Tab 缩进，以及对象键名递归排序。
            </p>
          </div>

          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              INSPECT
            </div>

            <p className="mt-2 text-[9px] leading-5 text-black/34">
              自动统计根类型、键数量、节点数量、结构深度和数据体积，适合快速判断接口响应复杂度。
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
