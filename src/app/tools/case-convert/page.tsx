"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type Mode = "single" | "lines"
type CopyState = string | null

type FormatItem = {
  id: string
  label: string
  sub: string
  description: string
  convert: (value: string) => string
}

const EXAMPLES = [
  "helloWorld",
  "XMLHttpRequest",
  "hello_world",
  "hello-world",
  "MY_API_TOKEN",
]

function splitWords(value: string) {
  return value
    .trim()
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Za-z])([0-9])/g, "$1 $2")
    .replace(/([0-9])([A-Za-z])/g, "$1 $2")
    .replace(/[-_.:/\\\s]+/g, " ")
    .split(" ")
    .map((word) => word.trim())
    .filter(Boolean)
}

function lower(word: string) {
  return word.toLocaleLowerCase()
}

function upper(word: string) {
  return word.toLocaleUpperCase()
}

function capital(word: string) {
  const normalized = lower(word)
  return normalized ? normalized.charAt(0).toLocaleUpperCase() + normalized.slice(1) : ""
}

function toCamel(value: string) {
  return splitWords(value)
    .map((word, index) => (index === 0 ? lower(word) : capital(word)))
    .join("")
}

function toPascal(value: string) {
  return splitWords(value).map(capital).join("")
}

function toSnake(value: string) {
  return splitWords(value).map(lower).join("_")
}

function toKebab(value: string) {
  return splitWords(value).map(lower).join("-")
}

function toConstant(value: string) {
  return splitWords(value).map(upper).join("_")
}

function toDot(value: string) {
  return splitWords(value).map(lower).join(".")
}

function toPath(value: string) {
  return splitWords(value).map(lower).join("/")
}

function toTrain(value: string) {
  return splitWords(value).map(capital).join("-")
}

const FORMATS: FormatItem[] = [
  { id: "camel", label: "小驼峰", sub: "camelCase", description: "JavaScript 变量、函数", convert: toCamel },
  { id: "pascal", label: "大驼峰", sub: "PascalCase", description: "组件、类、类型名", convert: toPascal },
  { id: "snake", label: "下划线", sub: "snake_case", description: "Python、数据库字段", convert: toSnake },
  { id: "kebab", label: "短横线", sub: "kebab-case", description: "URL、CSS class、文件名", convert: toKebab },
  { id: "constant", label: "常量", sub: "CONSTANT_CASE", description: "环境变量、常量", convert: toConstant },
  { id: "dot", label: "点号", sub: "dot.case", description: "配置键、命名空间", convert: toDot },
  { id: "path", label: "路径", sub: "path/case", description: "路由、目录片段", convert: toPath },
  { id: "train", label: "标题短横线", sub: "Train-Case", description: "标签、展示型命名", convert: toTrain },
]

function convertByMode(
  value: string,
  convert: (input: string) => string,
  mode: Mode,
) {
  if (mode === "single") return convert(value)

  return value
    .split(/\r?\n/)
    .map((line) => (line.trim() ? convert(line) : ""))
    .join("\n")
}

function downloadText(content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = "bitleap-case-convert.txt"
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 500)
}

export default function CaseConvertPage() {
  const [input, setInput] = useState("XMLHttpRequest")
  const [mode, setMode] = useState<Mode>("single")
  const [copied, setCopied] = useState<CopyState>(null)
  const [activeId, setActiveId] = useState("camel")

  const pageRef = useRef<HTMLDivElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const list = useMemo(
    () =>
      FORMATS.map((format) => ({
        ...format,
        value: convertByMode(input, format.convert, mode),
      })),
    [input, mode],
  )

  const active = list.find((item) => item.id === activeId) || list[0]
  const words = useMemo(() => splitWords(input.replace(/\r?\n/g, " ")), [input])

  useEffect(() => {
    if (
      !pageRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    const ctx = gsap.context(() => {
      gsap.from(".case-intro", {
        y: 22,
        opacity: 0,
        duration: 0.82,
        stagger: 0.06,
        ease: "power3.out",
      })

      gsap.to(".case-orbit-a", {
        rotation: 360,
        duration: 58,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })

      gsap.to(".case-orbit-b", {
        rotation: -360,
        duration: 88,
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

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".case-result",
        { y: 8, opacity: 0.45 },
        {
          y: 0,
          opacity: 1,
          duration: 0.34,
          stagger: 0.025,
          ease: "power2.out",
        },
      )
    }, resultRef)

    return () => ctx.revert()
  }, [input, mode])

  const copy = async (text: string, id: string) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(id)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {}
  }

  const copyAll = async () => {
    const output = list
      .map((item) => `${item.sub}\n${item.value || "—"}`)
      .join("\n\n")
    await copy(output, "all")
  }

  const clear = () => {
    setInput("")
    setCopied(null)
    inputRef.current?.focus()
  }

  const useExample = (value: string) => {
    setInput(value)
    setMode("single")
    window.requestAnimationFrame(() => inputRef.current?.focus())
  }

  return (
    <div
      ref={pageRef}
      className="min-h-screen overflow-hidden bg-[#efede6] text-[#22231f] selection:bg-[#22231f] selection:text-white"
    >
      <style>{`
        .case-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
        .case-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,.13); }
        .case-num { font-variant-numeric: tabular-nums lining-nums; }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(178,151,91,.10),transparent_27%),radial-gradient(circle_at_8%_88%,rgba(73,107,91,.08),transparent_31%)]" />
        <div className="case-orbit-a absolute right-[-20vw] top-[-24vw] h-[58vw] w-[58vw] rounded-full border border-black/[.04]">
          <span className="absolute left-[15%] top-[43%] h-2 w-2 rounded-full bg-[#b28d48]/38" />
        </div>
        <div className="case-orbit-b absolute bottom-[-26vw] left-[-19vw] h-[53vw] w-[53vw] rounded-full border border-black/[.032]">
          <span className="absolute right-[14%] top-[31%] h-1.5 w-1.5 rounded-full bg-[#52685d]/35" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1500px] px-5 pb-10 pt-6 sm:px-8">
        <div className="case-intro flex items-center justify-between gap-4">
          <Breadcrumb />
          <div className="hidden text-[9px] tracking-[.14em] text-black/25 sm:block">
            NAMING STUDIO · CASE CONVERTER
          </div>
        </div>

        <header className="case-intro mt-11 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/27">
              VARIABLE NAMING CONVERTER
            </div>
            <h1 className="mt-4 max-w-[900px] text-[clamp(48px,6.8vw,96px)] font-semibold leading-[.9] tracking-[-.073em]">
              同一个名字，
              <br />
              换一种写法。
            </h1>
          </div>

          <div>
            <p className="max-w-[520px] text-[11px] leading-6 text-black/39">
              自动识别 camelCase、PascalCase、缩写、数字和常见分隔符，再转换成开发中常用的命名格式。
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => useExample(example)}
                  className="rounded-full border border-black/[.085] px-3 py-2 font-mono text-[8px] text-black/34 transition hover:bg-white/40 hover:text-black"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </header>

        <section className="case-intro mt-7">
          <div className="flex flex-col gap-4 border-b border-black/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1">
              {(["single", "lines"] as Mode[]).map((value) => (
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
                  {value === "single" ? "单个名称" : "多行批量"}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4 text-[8px] text-black/26">
              <span>{words.length} WORDS</span>
              <button
                type="button"
                onClick={clear}
                className="font-semibold text-[#965744] transition hover:text-[#6e3e31]"
              >
                清空
              </button>
            </div>
          </div>

          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            spellCheck={false}
            rows={mode === "single" ? 2 : 6}
            placeholder={
              mode === "single"
                ? "helloWorld / XMLHttpRequest / hello_world"
                : "每行一个名称…"
            }
            className="case-scroll mt-5 block w-full resize-none bg-transparent font-mono text-[clamp(30px,5vw,66px)] font-medium leading-[1.15] tracking-[-.055em] outline-none placeholder:text-black/14"
          />

          {mode === "single" && words.length > 0 && (
            <div className="case-scroll mt-4 flex gap-2 overflow-x-auto pb-1">
              {words.map((word, index) => (
                <span
                  key={`${word}-${index}`}
                  className="shrink-0 rounded-full border border-black/[.08] bg-white/24 px-3 py-2 font-mono text-[9px] text-black/38"
                >
                  {word}
                </span>
              ))}
            </div>
          )}
        </section>

        <section
          ref={resultRef}
          className="case-intro mt-10 grid gap-8 lg:grid-cols-[.72fr_1.28fr]"
        >
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="text-[9px] font-semibold tracking-[.14em] text-black/25">
              SELECTED FORMAT
            </div>

            <div className="mt-3 border-y border-black/10 py-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-[-.04em]">
                    {active.label}
                  </h2>
                  <div className="mt-1 font-mono text-[9px] text-black/28">
                    {active.sub}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => copy(active.value, active.id)}
                  disabled={!active.value}
                  className="rounded-full bg-[#22231f] px-4 py-2.5 text-[9px] font-semibold text-white disabled:opacity-30"
                >
                  {copied === active.id ? "✓ 已复制" : "复制"}
                </button>
              </div>

              <div className="case-scroll mt-7 max-h-[260px] overflow-auto whitespace-pre-wrap break-all font-mono text-[clamp(24px,3.6vw,48px)] font-medium leading-[1.15] tracking-[-.05em]">
                {active.value || (
                  <span className="text-black/16">等待输入…</span>
                )}
              </div>

              <div className="mt-5 text-[9px] text-black/28">
                {active.description}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copyAll}
                disabled={!input.trim()}
                className="rounded-full border border-black/10 px-4 py-2.5 text-[9px] font-semibold text-black/40 transition hover:bg-white/40 disabled:opacity-30"
              >
                {copied === "all" ? "✓ 已复制全部" : "复制全部格式"}
              </button>

              <button
                type="button"
                onClick={() =>
                  downloadText(
                    list
                      .map((item) => `${item.sub}: ${item.value}`)
                      .join("\n"),
                  )
                }
                disabled={!input.trim()}
                className="rounded-full border border-black/10 px-4 py-2.5 text-[9px] font-semibold text-black/40 transition hover:bg-white/40 disabled:opacity-30"
              >
                导出 TXT
              </button>
            </div>
          </div>

          <div className="grid gap-px overflow-hidden rounded-[26px] bg-black/[.07] sm:grid-cols-2">
            {list.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveId(item.id)}
                className={`case-result group min-w-0 p-5 text-left transition sm:p-6 ${
                  activeId === item.id
                    ? "bg-[#22231f] text-white"
                    : "bg-[#f2f0e9] hover:bg-[#f8f6f0]"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div
                      className={`text-[8px] font-semibold tracking-[.11em] ${
                        activeId === item.id
                          ? "text-white/35"
                          : "text-black/25"
                      }`}
                    >
                      {item.label}
                    </div>
                    <div
                      className={`mt-1 font-mono text-[8px] ${
                        activeId === item.id
                          ? "text-white/25"
                          : "text-black/23"
                      }`}
                    >
                      {item.sub}
                    </div>
                  </div>

                  <span
                    className={`text-[8px] ${
                      activeId === item.id
                        ? "text-white/25"
                        : "text-black/18 group-hover:text-black/45"
                    }`}
                  >
                    VIEW
                  </span>
                </div>

                <div
                  className={`mt-6 whitespace-pre-wrap break-all font-mono text-[14px] font-medium leading-6 ${
                    activeId === item.id ? "text-white" : "text-[#292b26]"
                  }`}
                >
                  {item.value || "—"}
                </div>

                <div
                  className={`mt-4 text-[8px] ${
                    activeId === item.id
                      ? "text-white/28"
                      : "text-black/27"
                  }`}
                >
                  {item.description}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="case-intro mt-12 grid gap-7 border-t border-black/10 pt-6 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              ACRONYMS
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              `XMLHttpRequest` 会先拆成 XML / Http / Request，而不是把缩写粘成一个错误单词。
            </p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              NUMBERS
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              字母与数字边界也会参与拆词，更适合 API v2、OAuth2 等真实开发命名。
            </p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              BATCH
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              多行批量模式会逐行转换，适合一次处理字段名、接口参数和数据库列名。
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
