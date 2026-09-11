"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { marked } from "marked"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type ViewMode = "split" | "edit" | "preview"
type CopyState = "html" | "markdown" | null

const STORAGE_KEY = "bitleap-markdown-studio-draft"

const SAMPLE = `# Markdown Studio

把 Markdown 写在左边，右侧会即时生成安全的 HTML 预览。

## 现在支持

- 标题、列表、引用
- **粗体**、*斜体*、~~删除线~~
- [链接](https://bitleap.app)
- 表格
- 代码块
- 一键复制 HTML / Markdown
- 导出 \`.md\` 和 \`.html\`

> 你的草稿只保存在当前浏览器本地。

### 示例代码

\`\`\`js
const tools = ["Markdown", "GSAP", "DOMPurify"]

console.log(tools.join(" + "))
\`\`\`

### 表格

| 功能 | 状态 |
| --- | --- |
| 实时预览 | ✓ |
| HTML 净化 | ✓ |
| 本地草稿 | ✓ |
`

const TOOLBAR = [
  { label: "H1", title: "一级标题", before: "# ", after: "", block: true },
  { label: "H2", title: "二级标题", before: "## ", after: "", block: true },
  { label: "B", title: "粗体", before: "**", after: "**" },
  { label: "I", title: "斜体", before: "*", after: "*" },
  { label: "S", title: "删除线", before: "~~", after: "~~" },
  { label: "Link", title: "链接", before: "[", after: "](https://)" },
  { label: "Code", title: "行内代码", before: "`", after: "`" },
  { label: "Quote", title: "引用", before: "> ", after: "", block: true },
  { label: "List", title: "无序列表", before: "- ", after: "", block: true },
]

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 500)
}

function countWords(text: string) {
  const chinese = text.match(/[\u4e00-\u9fff]/g)?.length || 0
  const latin = text
    .replace(/[\u4e00-\u9fff]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
  return chinese + latin
}

function sanitizeHtmlFallback(raw: string) {
  if (typeof document === "undefined") return ""

  const template = document.createElement("template")
  template.innerHTML = raw

  template.content
    .querySelectorAll("script, style, iframe, object, embed, link, meta, base")
    .forEach((node) => node.remove())

  template.content.querySelectorAll("*").forEach((node) => {
    Array.from(node.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase()
      const value = attribute.value.trim().toLowerCase()

      if (name.startsWith("on")) {
        node.removeAttribute(attribute.name)
        return
      }

      if (
        (name === "href" ||
          name === "src" ||
          name === "xlink:href") &&
        (value.startsWith("javascript:") ||
          value.startsWith("vbscript:"))
      ) {
        node.removeAttribute(attribute.name)
        return
      }

      if (
        name === "src" &&
        value.startsWith("data:") &&
        !value.startsWith("data:image/")
      ) {
        node.removeAttribute(attribute.name)
      }
    })
  })

  return template.innerHTML
}

async function sanitizeMarkdownHtml(raw: string) {
  try {
    const module = await import("dompurify")
    const candidate = ((module as any).default ?? module) as any
    const purifier =
      typeof candidate?.sanitize === "function"
        ? candidate
        : typeof candidate === "function" && typeof window !== "undefined"
          ? candidate(window)
          : null

    if (purifier && typeof purifier.sanitize === "function") {
      return purifier.sanitize(raw, {
        USE_PROFILES: { html: true },
      }) as string
    }
  } catch {}

  return sanitizeHtmlFallback(raw)
}

function buildHtmlDocument(body: string) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Markdown Export</title>
  <style>
    body { margin: 0; background: #f4f1e9; color: #22231f; font: 16px/1.75 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    article { max-width: 760px; margin: 0 auto; padding: 64px 24px 96px; }
    h1,h2,h3,h4 { line-height: 1.15; letter-spacing: -.035em; margin: 1.4em 0 .55em; }
    h1 { font-size: 2.6rem; } h2 { font-size: 1.8rem; } h3 { font-size: 1.35rem; }
    p,ul,ol,blockquote,pre,table { margin: 1em 0; }
    a { color: #365e52; }
    blockquote { margin-left: 0; padding-left: 1em; border-left: 3px solid #8d9c8f; color: #5d625c; }
    code { padding: .15em .35em; border-radius: 5px; background: #e8e4da; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    pre { overflow: auto; padding: 18px; border-radius: 14px; background: #171916; color: #d6ddd2; }
    pre code { padding: 0; background: none; color: inherit; }
    table { width: 100%; border-collapse: collapse; }
    th,td { padding: 10px 12px; border-bottom: 1px solid #d8d4ca; text-align: left; }
    img { max-width: 100%; height: auto; border-radius: 12px; }
    hr { border: 0; border-top: 1px solid #d8d4ca; margin: 2em 0; }
  </style>
</head>
<body>
  <article>${body}</article>
</body>
</html>`
}

export default function MarkdownPreviewPage() {
  const [md, setMd] = useState(SAMPLE)
  const [viewMode, setViewMode] = useState<ViewMode>("split")
  const [copyState, setCopyState] = useState<CopyState>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [hydrated, setHydrated] = useState(false)

  const pageRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const [html, setHtml] = useState("")

  useEffect(() => {
    let active = true

    const render = async () => {
      const raw = marked.parse(md, {
        gfm: true,
        breaks: false,
      }) as string

      const clean = await sanitizeMarkdownHtml(raw)

      if (active) setHtml(clean)
    }

    render()

    return () => {
      active = false
    }
  }, [md])

  const stats = useMemo(() => {
    const lines = md ? md.split("\n").length : 0
    const words = countWords(md)
    const chars = md.length
    const readingMinutes = Math.max(1, Math.ceil(words / 350))

    return { lines, words, chars, readingMinutes }
  }, [md])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setMd(stored)
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return

    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, md)
        setSavedAt(Date.now())
      } catch {}
    }, 300)

    return () => window.clearTimeout(timer)
  }, [md, hydrated])

  useEffect(() => {
    if (
      !pageRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    const ctx = gsap.context(() => {
      gsap.from(".md-intro", {
        y: 22,
        opacity: 0,
        duration: 0.82,
        stagger: 0.065,
        ease: "power3.out",
      })

      gsap.to(".md-orbit-a", {
        rotation: 360,
        duration: 66,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })

      gsap.to(".md-orbit-b", {
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
      !previewRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    gsap.fromTo(
      previewRef.current,
      { opacity: 0.62, y: 4 },
      {
        opacity: 1,
        y: 0,
        duration: 0.26,
        ease: "power2.out",
        overwrite: true,
      },
    )
  }, [html, viewMode])

  const copy = async (value: string, kind: CopyState) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopyState(kind)
      window.setTimeout(() => setCopyState(null), 1200)
    } catch {}
  }

  const insertSyntax = (
    before: string,
    after: string,
    block = false,
  ) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = md.slice(start, end)
    const fallback = block ? "内容" : "文本"

    let prefix = before
    if (block && start > 0 && md[start - 1] !== "\n") {
      prefix = `\n${before}`
    }

    const replacement = `${prefix}${selected || fallback}${after}`
    const next = md.slice(0, start) + replacement + md.slice(end)
    const selectionStart = start + prefix.length
    const selectionEnd = selectionStart + (selected || fallback).length

    setMd(next)

    window.requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(selectionStart, selectionEnd)
    })
  }

  const insertCodeBlock = () => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = md.slice(start, end) || "const hello = 'world'"

    const needsNewline = start > 0 && md[start - 1] !== "\n"
    const block = `${needsNewline ? "\n" : ""}\`\`\`js\n${selected}\n\`\`\`\n`

    setMd(md.slice(0, start) + block + md.slice(end))

    window.requestAnimationFrame(() => {
      textarea.focus()
    })
  }

  const insertTable = () => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const table = `| 列 1 | 列 2 |
| --- | --- |
| 内容 | 内容 |
`

    const prefix = start > 0 && md[start - 1] !== "\n" ? "\n" : ""
    setMd(md.slice(0, start) + prefix + table + md.slice(start))

    window.requestAnimationFrame(() => textarea.focus())
  }

  const clear = () => {
    setMd("")
    setCopyState(null)
    textareaRef.current?.focus()
  }

  const restoreSample = () => {
    setMd(SAMPLE)
    setCopyState(null)
  }

  const downloadMarkdown = () => {
    downloadText("bitleap-markdown.md", md, "text/markdown;charset=utf-8")
  }

  const downloadHtml = () => {
    downloadText(
      "bitleap-markdown.html",
      buildHtmlDocument(html),
      "text/html;charset=utf-8",
    )
  }

  const savedText = savedAt
    ? new Intl.DateTimeFormat("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date(savedAt))
    : "—"

  return (
    <div
      ref={pageRef}
      className="min-h-screen overflow-hidden bg-[#efede6] text-[#22231f] selection:bg-[#22231f] selection:text-white"
    >
      <style>{`
        .md-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
        .md-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,.13); }
        .md-num { font-variant-numeric: tabular-nums lining-nums; }
        .md-preview { color: #2b2d28; font-size: 14px; line-height: 1.78; }
        .md-preview > *:first-child { margin-top: 0 !important; }
        .md-preview > *:last-child { margin-bottom: 0 !important; }
        .md-preview h1, .md-preview h2, .md-preview h3, .md-preview h4 { color: #20221e; font-weight: 650; line-height: 1.13; letter-spacing: -.035em; }
        .md-preview h1 { margin: 0 0 .65em; font-size: 2.45rem; letter-spacing: -.055em; }
        .md-preview h2 { margin: 1.6em 0 .65em; font-size: 1.7rem; }
        .md-preview h3 { margin: 1.45em 0 .55em; font-size: 1.25rem; }
        .md-preview p { margin: .85em 0; }
        .md-preview ul, .md-preview ol { margin: .9em 0; padding-left: 1.4em; }
        .md-preview li { margin: .28em 0; }
        .md-preview ul { list-style: disc; }
        .md-preview ol { list-style: decimal; }
        .md-preview a { color: #3d6559; text-decoration: underline; text-underline-offset: 3px; }
        .md-preview strong { color: #20221e; font-weight: 700; }
        .md-preview blockquote { margin: 1.25em 0; padding: .1em 0 .1em 1em; border-left: 3px solid #82958a; color: rgba(34,35,31,.6); }
        .md-preview code { border-radius: 5px; background: #e7e3d9; padding: .16em .36em; font: .88em ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
        .md-preview pre { margin: 1.25em 0; overflow: auto; border-radius: 16px; background: #171916; padding: 18px; color: #d6ddd2; box-shadow: inset 0 0 0 1px rgba(255,255,255,.045); }
        .md-preview pre code { background: transparent; padding: 0; color: inherit; font-size: 12px; line-height: 1.7; }
        .md-preview table { width: 100%; margin: 1.3em 0; border-collapse: collapse; font-size: 12px; }
        .md-preview th, .md-preview td { border-bottom: 1px solid rgba(34,35,31,.1); padding: 9px 10px; text-align: left; }
        .md-preview th { color: rgba(34,35,31,.55); font-size: 10px; font-weight: 700; letter-spacing: .04em; }
        .md-preview img { max-width: 100%; height: auto; border-radius: 14px; }
        .md-preview hr { margin: 2em 0; border: 0; border-top: 1px solid rgba(34,35,31,.12); }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(178,151,91,.10),transparent_27%),radial-gradient(circle_at_8%_88%,rgba(73,107,91,.08),transparent_31%)]" />
        <div className="md-orbit-a absolute right-[-20vw] top-[-24vw] h-[58vw] w-[58vw] rounded-full border border-black/[.04]">
          <span className="absolute left-[15%] top-[43%] h-2 w-2 rounded-full bg-[#b28d48]/38" />
        </div>
        <div className="md-orbit-b absolute bottom-[-26vw] left-[-19vw] h-[53vw] w-[53vw] rounded-full border border-black/[.032]">
          <span className="absolute right-[14%] top-[31%] h-1.5 w-1.5 rounded-full bg-[#52685d]/35" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1560px] px-5 pb-10 pt-6 sm:px-8">
        <div className="md-intro flex items-center justify-between gap-4">
          <Breadcrumb />
          <div className="hidden text-[9px] tracking-[.14em] text-black/25 sm:block">
            MARKDOWN STUDIO · LOCAL PREVIEW
          </div>
        </div>

        <header className="md-intro mt-10 grid gap-7 border-b border-black/10 pb-7 lg:grid-cols-[1fr_.74fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/27">
              MARKDOWN PREVIEW
            </div>
            <h1 className="mt-4 max-w-[900px] text-[clamp(46px,6.4vw,92px)] font-semibold leading-[.9] tracking-[-.073em]">
              写 Markdown，
              <br />
              直接看结果。
            </h1>
          </div>

          <div>
            <p className="max-w-[520px] text-[11px] leading-6 text-black/39">
              实时渲染、HTML 净化、本地草稿、格式工具栏与导出都放在同一个工作区。输入不会发送到服务器。
            </p>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[8px] text-black/26">
              <span>{stats.lines} 行</span>
              <span>{stats.words} 字 / 词</span>
              <span>{stats.chars} 字符</span>
              <span>约 {stats.readingMinutes} 分钟阅读</span>
            </div>
          </div>
        </header>

        <section className="md-intro mt-6 flex flex-col gap-4 border-b border-black/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="md-scroll flex gap-1 overflow-x-auto pb-1">
            {TOOLBAR.map((tool) => (
              <button
                key={tool.title}
                type="button"
                title={tool.title}
                onClick={() =>
                  insertSyntax(tool.before, tool.after, tool.block)
                }
                className="shrink-0 rounded-full border border-black/[.085] px-3 py-2 text-[9px] font-semibold text-black/42 transition hover:bg-white/40 hover:text-black"
              >
                {tool.label}
              </button>
            ))}

            <button
              type="button"
              onClick={insertCodeBlock}
              className="shrink-0 rounded-full border border-black/[.085] px-3 py-2 text-[9px] font-semibold text-black/42 transition hover:bg-white/40 hover:text-black"
            >
              ``` Block
            </button>

            <button
              type="button"
              onClick={insertTable}
              className="shrink-0 rounded-full border border-black/[.085] px-3 py-2 text-[9px] font-semibold text-black/42 transition hover:bg-white/40 hover:text-black"
            >
              Table
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(["split", "edit", "preview"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`rounded-full px-3.5 py-2 text-[9px] font-semibold transition ${
                  viewMode === mode
                    ? "bg-[#22231f] text-white"
                    : "text-black/35 hover:bg-white/35 hover:text-black"
                }`}
              >
                {mode === "split"
                  ? "分栏"
                  : mode === "edit"
                    ? "只编辑"
                    : "只预览"}
              </button>
            ))}
          </div>
        </section>

        <section
          className={`md-intro mt-6 ${
            viewMode === "split"
              ? "grid gap-px overflow-hidden rounded-[28px] border border-black/[.075] bg-black/[.07] lg:grid-cols-2"
              : "overflow-hidden rounded-[28px] border border-black/[.075]"
          }`}
        >
          {viewMode !== "preview" && (
            <div className="min-w-0 bg-[#f3f0e8]">
              <div className="flex h-12 items-center justify-between border-b border-black/[.07] px-4 sm:px-5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#52685d]" />
                  <span className="text-[8px] font-semibold tracking-[.13em] text-black/28">
                    MARKDOWN
                  </span>
                </div>

                <span className="text-[8px] text-black/22">
                  自动保存 · {savedText}
                </span>
              </div>

              <textarea
                ref={textareaRef}
                value={md}
                onChange={(event) => setMd(event.target.value)}
                spellCheck={false}
                placeholder="开始输入 Markdown…"
                className={`md-scroll block w-full resize-none bg-transparent p-5 font-mono text-[12px] leading-7 text-[#292b26] outline-none placeholder:text-black/18 sm:p-6 ${
                  viewMode === "split"
                    ? "h-[620px]"
                    : "h-[720px] lg:h-[760px]"
                }`}
              />
            </div>
          )}

          {viewMode !== "edit" && (
            <div className="min-w-0 bg-[#fbfaf6]">
              <div className="flex h-12 items-center justify-between border-b border-black/[.07] px-4 sm:px-5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#b28d48]" />
                  <span className="text-[8px] font-semibold tracking-[.13em] text-black/28">
                    PREVIEW
                  </span>
                </div>

                <span className="text-[8px] text-black/22">
                  SANITIZED HTML
                </span>
              </div>

              <div
                ref={previewRef}
                className={`md-preview md-scroll overflow-auto p-6 sm:p-8 lg:p-10 ${
                  viewMode === "split"
                    ? "h-[620px]"
                    : "h-[720px] lg:h-[760px]"
                }`}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
          )}
        </section>

        <section className="md-intro mt-5 flex flex-col gap-4 border-b border-black/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => copy(html, "html")}
              disabled={!html}
              className="rounded-full bg-[#22231f] px-5 py-3 text-[10px] font-semibold text-white transition hover:scale-[1.01] active:scale-[.98] disabled:opacity-30"
            >
              {copyState === "html" ? "✓ 已复制 HTML" : "复制 HTML"}
            </button>

            <button
              type="button"
              onClick={() => copy(md, "markdown")}
              disabled={!md}
              className="rounded-full border border-black/10 px-5 py-3 text-[10px] font-semibold transition hover:bg-white/40 disabled:opacity-30"
            >
              {copyState === "markdown"
                ? "✓ 已复制 Markdown"
                : "复制 Markdown"}
            </button>

            <button
              type="button"
              onClick={downloadMarkdown}
              disabled={!md}
              className="rounded-full border border-black/10 px-4 py-3 text-[9px] font-semibold text-black/40 transition hover:bg-white/40 disabled:opacity-30"
            >
              导出 .md
            </button>

            <button
              type="button"
              onClick={downloadHtml}
              disabled={!html}
              className="rounded-full border border-black/10 px-4 py-3 text-[9px] font-semibold text-black/40 transition hover:bg-white/40 disabled:opacity-30"
            >
              导出 .html
            </button>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={restoreSample}
              className="text-[9px] font-semibold text-black/30 transition hover:text-black"
            >
              恢复示例
            </button>

            <button
              type="button"
              onClick={clear}
              className="text-[9px] font-semibold text-[#9b5947] transition hover:text-[#743f32]"
            >
              清空
            </button>
          </div>
        </section>

        <section className="md-intro mt-9 grid gap-7 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              LIVE
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              Markdown 输入后即时渲染，不需要点击预览或生成按钮。
            </p>
          </div>

          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              SAFE OUTPUT
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              marked 负责解析，DOMPurify 对 HTML 再进行净化后才进入预览区域。
            </p>
          </div>

          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              LOCAL DRAFT
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              草稿自动保存在当前浏览器的 localStorage，重新打开页面可以继续编辑。
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
