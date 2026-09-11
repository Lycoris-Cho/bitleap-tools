"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type Mode = "encode" | "decode"
type Scope = "component" | "full"

const EXAMPLES = [
  "搜索 设计工具",
  "https://example.com/search?q=你好 世界&lang=zh",
  "name=BitLeap&tag=前端 工具",
]

function encodeValue(
  input: string,
  scope: Scope,
  plusForSpace: boolean,
) {
  const encoded =
    scope === "full"
      ? encodeURI(input)
      : encodeURIComponent(input)

  return plusForSpace && scope === "component"
    ? encoded.replace(/%20/g, "+")
    : encoded
}

function decodeValue(
  input: string,
  scope: Scope,
  plusForSpace: boolean,
) {
  const source =
    plusForSpace && scope === "component"
      ? input.replace(/\+/g, " ")
      : input

  return scope === "full"
    ? decodeURI(source)
    : decodeURIComponent(source)
}

function percentCount(value: string) {
  return value.match(/%[0-9A-Fa-f]{2}/g)?.length || 0
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).length
}

function tryInspectUrl(value: string) {
  try {
    const url = new URL(value)
    return {
      valid: true as const,
      protocol: url.protocol.replace(":", ""),
      host: url.host,
      hostname: url.hostname,
      port: url.port || "默认",
      pathname: url.pathname || "/",
      search: url.search,
      hash: url.hash,
      params: [...url.searchParams.entries()],
    }
  } catch {
    return { valid: false as const }
  }
}

function downloadText(filename: string, content: string) {
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

export default function UrlPage() {
  const [input, setInput] = useState(
    "https://bitleap.app/search?q=前端 工具&from=首页",
  )
  const [mode, setMode] = useState<Mode>("encode")
  const [scope, setScope] = useState<Scope>("component")
  const [plusForSpace, setPlusForSpace] = useState(false)
  const [copied, setCopied] = useState(false)

  const pageRef = useRef<HTMLDivElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const conversion = useMemo(() => {
    if (!input) return { output: "", error: "" }

    try {
      return {
        output:
          mode === "encode"
            ? encodeValue(input, scope, plusForSpace)
            : decodeValue(input, scope, plusForSpace),
        error: "",
      }
    } catch {
      return {
        output: "",
        error:
          mode === "encode"
            ? "编码失败：输入中可能存在无法处理的代理字符。"
            : "解码失败：检测到不完整或非法的 %XX 百分号编码。",
      }
    }
  }, [input, mode, scope, plusForSpace])

  const output = conversion.output

  const stats = useMemo(
    () => ({
      inputChars: input.length,
      inputBytes: byteLength(input),
      outputChars: output.length,
      escapes: percentCount(output),
    }),
    [input, output],
  )

  const inspectionTarget =
    mode === "decode" && output
      ? output
      : mode === "encode"
        ? input
        : ""

  const inspection = useMemo(
    () => tryInspectUrl(inspectionTarget.trim()),
    [inspectionTarget],
  )

  useEffect(() => {
    if (
      !pageRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    const ctx = gsap.context(() => {
      gsap.from(".url-intro", {
        y: 22,
        opacity: 0,
        duration: 0.82,
        stagger: 0.06,
        ease: "power3.out",
      })

      gsap.to(".url-orbit-a", {
        rotation: 360,
        duration: 64,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })

      gsap.to(".url-orbit-b", {
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
      { y: 6, opacity: 0.5 },
      {
        y: 0,
        opacity: 1,
        duration: 0.28,
        ease: "power2.out",
        overwrite: true,
      },
    )
  }, [output, mode, scope, plusForSpace])

  const copy = async () => {
    if (!output) return
    try {
      await navigator.clipboard.writeText(output)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {}
  }

  const reverse = () => {
    if (!output) return
    setInput(output)
    setMode((current) => (current === "encode" ? "decode" : "encode"))
    window.requestAnimationFrame(() => inputRef.current?.focus())
  }

  const clear = () => {
    setInput("")
    setCopied(false)
    inputRef.current?.focus()
  }

  return (
    <div
      ref={pageRef}
      className="min-h-screen overflow-hidden bg-[#efede6] text-[#22231f] selection:bg-[#22231f] selection:text-white"
    >
      <style>{`
        .url-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
        .url-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,.13); }
        .url-num { font-variant-numeric: tabular-nums lining-nums; }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(178,151,91,.10),transparent_27%),radial-gradient(circle_at_8%_88%,rgba(73,107,91,.08),transparent_31%)]" />
        <div className="url-orbit-a absolute right-[-20vw] top-[-24vw] h-[58vw] w-[58vw] rounded-full border border-black/[.04]">
          <span className="absolute left-[15%] top-[43%] h-2 w-2 rounded-full bg-[#b28d48]/38" />
        </div>
        <div className="url-orbit-b absolute bottom-[-26vw] left-[-19vw] h-[53vw] w-[53vw] rounded-full border border-black/[.032]">
          <span className="absolute right-[14%] top-[31%] h-1.5 w-1.5 rounded-full bg-[#52685d]/35" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1500px] px-5 pb-10 pt-6 sm:px-8">
        <div className="url-intro flex items-center justify-between gap-4">
          <Breadcrumb />
          <div className="hidden text-[9px] tracking-[.14em] text-black/25 sm:block">
            URL CODEC · PERCENT ENCODING
          </div>
        </div>

        <header className="url-intro mt-11 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/27">
              URL ENCODE / DECODE
            </div>
            <h1 className="mt-4 max-w-[900px] text-[clamp(48px,6.8vw,96px)] font-semibold leading-[.9] tracking-[-.073em]">
              让字符，
              <br />
              安全穿过 URL。
            </h1>
          </div>

          <div>
            <p className="max-w-[520px] text-[11px] leading-6 text-black/39">
              在 `encodeURIComponent` 与 `encodeURI` 之间明确切换，支持查询参数中的 `+` 空格规则，并即时检查完整 URL 的结构。
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => {
                    setInput(example)
                    setMode("encode")
                  }}
                  className="rounded-full border border-black/[.085] px-3 py-2 font-mono text-[8px] text-black/32 transition hover:bg-white/40 hover:text-black"
                >
                  {example.length > 28 ? `${example.slice(0, 28)}…` : example}
                </button>
              ))}
            </div>
          </div>
        </header>

        <section className="url-intro mt-7 flex flex-col gap-5 border-b border-black/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1">
            {(["encode", "decode"] as Mode[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`rounded-full px-4 py-2.5 text-[9px] font-semibold transition ${
                  mode === value
                    ? "bg-[#22231f] text-white"
                    : "text-black/35 hover:bg-white/35 hover:text-black"
                }`}
              >
                {value === "encode" ? "编码" : "解码"}
              </button>
            ))}

            <span className="mx-1 hidden h-8 w-px bg-black/10 sm:block" />

            {(["component", "full"] as Scope[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setScope(value)}
                className={`rounded-full px-4 py-2.5 text-[9px] font-semibold transition ${
                  scope === value
                    ? "bg-[#52685d] text-white"
                    : "text-black/35 hover:bg-white/35 hover:text-black"
                }`}
              >
                {value === "component" ? "参数 / 片段" : "完整 URL"}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {scope === "component" && (
              <label className="flex cursor-pointer items-center gap-2 text-[9px] text-black/35">
                <input
                  type="checkbox"
                  checked={plusForSpace}
                  onChange={(event) => setPlusForSpace(event.target.checked)}
                  className="accent-[#22231f]"
                />
                Query / Form 空格使用 +
              </label>
            )}

            <button
              type="button"
              onClick={clear}
              className="text-[9px] font-semibold text-[#965744] transition hover:text-[#6e3e31]"
            >
              清空
            </button>
          </div>
        </section>

        <section className="url-intro mt-7 grid gap-px overflow-hidden rounded-[30px] border border-black/[.075] bg-black/[.07] lg:grid-cols-2">
          <div className="min-w-0 bg-[#f3f0e8]">
            <div className="flex h-12 items-center justify-between border-b border-black/[.065] px-5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#52685d]" />
                <span className="text-[8px] font-semibold tracking-[.13em] text-black/27">
                  INPUT
                </span>
              </div>
              <span className="url-num text-[8px] text-black/22">
                {stats.inputChars} chars · {stats.inputBytes} bytes
              </span>
            </div>

            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              spellCheck={false}
              placeholder={
                mode === "encode"
                  ? scope === "full"
                    ? "输入完整 URL…"
                    : "输入参数值、路径片段或文本…"
                  : "输入带有 %XX 的 URL 编码字符串…"
              }
              className="url-scroll block h-[440px] w-full resize-none bg-transparent p-5 font-mono text-[12px] leading-7 text-[#292b26] outline-none placeholder:text-black/16 sm:p-6"
            />
          </div>

          <div className="min-w-0 bg-[#fbfaf6]">
            <div className="flex h-12 items-center justify-between border-b border-black/[.065] px-5">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    conversion.error
                      ? "bg-[#b96350]"
                      : output
                        ? "bg-[#b28d48]"
                        : "bg-black/15"
                  }`}
                />
                <span className="text-[8px] font-semibold tracking-[.13em] text-black/27">
                  OUTPUT
                </span>
              </div>

              <span className="url-num text-[8px] text-black/22">
                {output
                  ? `${stats.outputChars} chars · ${stats.escapes} escapes`
                  : "WAITING"}
              </span>
            </div>

            <div className="relative h-[440px]">
              {conversion.error ? (
                <div className="flex h-full items-center p-6">
                  <div className="max-w-md">
                    <div className="text-[8px] font-semibold tracking-[.13em] text-[#9d5543]">
                      INVALID ENCODING
                    </div>
                    <p className="mt-3 text-[11px] leading-6 text-[#8d5a4d]">
                      {conversion.error}
                    </p>
                  </div>
                </div>
              ) : output ? (
                <div
                  ref={outputRef}
                  className="url-scroll h-full overflow-auto whitespace-pre-wrap break-all p-5 font-mono text-[12px] leading-7 text-[#36594f] sm:p-6"
                >
                  {output}
                </div>
              ) : (
                <div className="grid h-full place-items-center text-[9px] tracking-[.12em] text-black/14">
                  OUTPUT WILL APPEAR HERE
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="url-intro mt-5 flex flex-col gap-4 border-b border-black/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copy}
              disabled={!output}
              className="rounded-full bg-[#22231f] px-5 py-3 text-[10px] font-semibold text-white transition hover:scale-[1.01] active:scale-[.98] disabled:opacity-30"
            >
              {copied ? "✓ 已复制" : "复制结果"}
            </button>

            <button
              type="button"
              onClick={reverse}
              disabled={!output}
              className="rounded-full border border-black/10 px-5 py-3 text-[10px] font-semibold text-black/42 transition hover:bg-white/40 disabled:opacity-30"
            >
              结果 → 输入并反向
            </button>

            <button
              type="button"
              onClick={() =>
                downloadText(
                  mode === "encode"
                    ? "bitleap-url-encoded.txt"
                    : "bitleap-url-decoded.txt",
                  output,
                )
              }
              disabled={!output}
              className="rounded-full border border-black/10 px-4 py-3 text-[9px] font-semibold text-black/37 transition hover:bg-white/40 disabled:opacity-30"
            >
              导出 TXT
            </button>
          </div>

          <div className="text-[8px] text-black/25">
            {scope === "component"
              ? "encodeURIComponent / decodeURIComponent"
              : "encodeURI / decodeURI"}
          </div>
        </section>

        {inspection.valid && (
          <section className="url-intro mt-12 grid gap-10 border-t border-black/10 pt-7 lg:grid-cols-[.62fr_1.38fr]">
            <div>
              <div className="text-[9px] font-semibold tracking-[.14em] text-black/25">
                URL INSPECTOR
              </div>
              <h2 className="mt-2 text-[clamp(30px,4vw,48px)] font-semibold leading-[.98] tracking-[-.055em]">
                顺便看清，
                <br />
                URL 的结构。
              </h2>

              <p className="mt-5 max-w-[370px] text-[10px] leading-5 text-black/34">
                当输入或解码结果是完整绝对 URL 时，这里会直接拆出协议、主机、路径、查询参数与 hash。
              </p>
            </div>

            <div>
              <div className="grid gap-px overflow-hidden rounded-[24px] bg-black/[.07] sm:grid-cols-2">
                {[
                  ["Protocol", inspection.protocol],
                  ["Host", inspection.host],
                  ["Path", inspection.pathname],
                  ["Hash", inspection.hash || "—"],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-0 bg-[#f2f0e9] p-5">
                    <div className="text-[8px] font-semibold tracking-[.1em] text-black/24">
                      {label}
                    </div>
                    <div className="mt-3 break-all font-mono text-[11px] font-medium">
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 border-t border-black/10 pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[8px] font-semibold tracking-[.1em] text-black/24">
                    QUERY PARAMETERS
                  </span>
                  <span className="url-num text-[8px] text-black/22">
                    {inspection.params.length}
                  </span>
                </div>

                {inspection.params.length ? (
                  <div>
                    {inspection.params.map(([key, value], index) => (
                      <div
                        key={`${key}-${index}`}
                        className="grid grid-cols-[minmax(90px,.45fr)_1fr] gap-4 border-b border-black/[.065] py-3"
                      >
                        <span className="break-all font-mono text-[10px] font-semibold text-[#49655c]">
                          {key}
                        </span>
                        <span className="break-all font-mono text-[10px] text-black/43">
                          {value || "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-[9px] text-black/24">
                    没有查询参数
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="url-intro mt-12 grid gap-7 border-t border-black/10 pt-6 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              COMPONENT
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              参数 / 片段模式会编码 `? & = / #` 等保留字符，适合单个 query value 或动态参数。
            </p>
          </div>

          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              FULL URL
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              完整 URL 模式保留协议、斜杠和查询结构，只编码 URL 中不安全的字符。
            </p>
          </div>

          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              + SPACE
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              `application/x-www-form-urlencoded` 常用 `+` 表示空格；需要构造表单或传统 query 时可开启。
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
