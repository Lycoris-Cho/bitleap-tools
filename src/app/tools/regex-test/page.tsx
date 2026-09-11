"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type RegexStatus = "idle" | "running" | "ready" | "error" | "timeout"
type CopyState = "regex" | "matches" | "replacement" | null
type Flag = "g" | "i" | "m" | "s" | "u" | "y"

type MatchItem = {
  full: string
  index: number
  end: number
  groups: Array<string | null>
  named: Record<string, string | null> | null
}

type WorkerResult = {
  id: number
  ok: boolean
  matches: MatchItem[]
  replacement: string
  truncated: boolean
  duration: number
  error?: string
}

type Preset = {
  name: string
  note: string
  pattern: string
  flags: Flag[]
  sample: string
}

const MAX_MATCHES = 5000
const REGEX_TIMEOUT = 900

const FLAGS: Array<{
  key: Flag
  label: string
  title: string
}> = [
  { key: "g", label: "g", title: "全局匹配" },
  { key: "i", label: "i", title: "忽略大小写" },
  { key: "m", label: "m", title: "多行模式" },
  { key: "s", label: "s", title: "dotAll：. 可匹配换行" },
  { key: "u", label: "u", title: "Unicode 模式" },
  { key: "y", label: "y", title: "sticky 粘连匹配" },
]

const PRESETS: Preset[] = [
  {
    name: "数字",
    note: "number",
    pattern: "\\d+",
    flags: ["g"],
    sample: "订单 A-1024，数量 18；订单 B-2048，数量 36。",
  },
  {
    name: "邮箱",
    note: "email",
    pattern: "[\\w.+-]+@[\\w-]+(?:\\.[\\w-]+)+",
    flags: ["g", "i"],
    sample:
      "联系 hello@bitleap.dev 或 team+tools@example.com，测试 bad@mail 是否被忽略。",
  },
  {
    name: "URL",
    note: "url",
    pattern: "https?:\\/\\/[^\\s]+",
    flags: ["g", "i"],
    sample:
      "文档：https://bitleap.dev/docs\n接口：http://localhost:3000/api/test",
  },
  {
    name: "中文",
    note: "han",
    pattern: "[\\u4e00-\\u9fff]+",
    flags: ["g", "u"],
    sample: "BitLeap 是一个纯前端工具站，Tiny tools, Big leap.",
  },
  {
    name: "HEX",
    note: "color",
    pattern: "#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\\b",
    flags: ["g"],
    sample: "Theme: #111827 / #8b5cf6 / #fff / rgb(0,0,0)",
  },
  {
    name: "空白",
    note: "space",
    pattern: "\\s+",
    flags: ["g"],
    sample: "BitLeap   tools\n\nRegex\tStudio",
  },
]

const REGEX_WORKER = String.raw`
self.onmessage = function (event) {
  var payload = event.data;
  var started = performance.now();

  function advanceStringIndex(source, index, unicode) {
    if (!unicode) return index + 1;
    if (index + 1 >= source.length) return index + 1;

    var first = source.charCodeAt(index);
    if (first < 0xD800 || first > 0xDBFF) return index + 1;

    var second = source.charCodeAt(index + 1);
    if (second < 0xDC00 || second > 0xDFFF) return index + 1;

    return index + 2;
  }

  try {
    var regex = new RegExp(payload.pattern, payload.flags);
    var matches = [];
    var match = null;
    var shouldLoop =
      payload.flags.indexOf("g") !== -1 ||
      payload.flags.indexOf("y") !== -1;
    var truncated = false;

    if (shouldLoop) {
      while ((match = regex.exec(payload.text)) !== null) {
        var groups = [];
        for (var groupIndex = 1; groupIndex < match.length; groupIndex++) {
          groups.push(
            typeof match[groupIndex] === "string"
              ? match[groupIndex]
              : null
          );
        }

        var named = null;
        if (match.groups) {
          named = {};
          Object.keys(match.groups).forEach(function (key) {
            named[key] =
              typeof match.groups[key] === "string"
                ? match.groups[key]
                : null;
          });
        }

        matches.push({
          full: match[0],
          index: match.index,
          end: match.index + match[0].length,
          groups: groups,
          named: named
        });

        if (matches.length >= payload.maxMatches) {
          truncated = true;
          break;
        }

        if (match[0].length === 0) {
          regex.lastIndex = advanceStringIndex(
            payload.text,
            regex.lastIndex,
            payload.flags.indexOf("u") !== -1
          );
        }
      }
    } else {
      match = regex.exec(payload.text);

      if (match) {
        var singleGroups = [];
        for (var singleIndex = 1; singleIndex < match.length; singleIndex++) {
          singleGroups.push(
            typeof match[singleIndex] === "string"
              ? match[singleIndex]
              : null
          );
        }

        var singleNamed = null;
        if (match.groups) {
          singleNamed = {};
          Object.keys(match.groups).forEach(function (key) {
            singleNamed[key] =
              typeof match.groups[key] === "string"
                ? match.groups[key]
                : null;
          });
        }

        matches.push({
          full: match[0],
          index: match.index,
          end: match.index + match[0].length,
          groups: singleGroups,
          named: singleNamed
        });
      }
    }

    var replaceRegex = new RegExp(payload.pattern, payload.flags);
    var replacement = payload.text.replace(
      replaceRegex,
      payload.replacement
    );

    self.postMessage({
      id: payload.id,
      ok: true,
      matches: matches,
      replacement: replacement,
      truncated: truncated,
      duration: performance.now() - started
    });
  } catch (error) {
    self.postMessage({
      id: payload.id,
      ok: false,
      matches: [],
      replacement: payload.text,
      truncated: false,
      duration: performance.now() - started,
      error:
        error && error.message
          ? error.message
          : "正则表达式执行失败"
    });
  }
};
`

function escapePatternForLiteral(pattern: string) {
  let output = ""
  let backslashes = 0

  for (const char of pattern) {
    if (char === "\\") {
      output += char
      backslashes++
      continue
    }

    if (char === "/" && backslashes % 2 === 0) {
      output += "\\/"
    } else {
      output += char
    }

    backslashes = 0
  }

  return output
}

function humanNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value)
}

function makeLineStarts(text: string) {
  const starts = [0]

  for (let index = 0; index < text.length; index++) {
    if (text[index] === "\n") starts.push(index + 1)
  }

  return starts
}

function getLineColumn(
  index: number,
  lineStarts: number[],
) {
  let left = 0
  let right = lineStarts.length - 1

  while (left <= right) {
    const middle = Math.floor((left + right) / 2)

    if (lineStarts[middle] <= index) {
      left = middle + 1
    } else {
      right = middle - 1
    }
  }

  const lineIndex = Math.max(0, right)

  return {
    line: lineIndex + 1,
    column: index - lineStarts[lineIndex] + 1,
  }
}

function HighlightedText({
  text,
  matches,
}: {
  text: string
  matches: MatchItem[]
}) {
  if (!text) {
    return (
      <span className="text-white/16">
        Match preview will appear here.
      </span>
    )
  }

  if (!matches.length) {
    return <span className="text-white/45">{text}</span>
  }

  const nodes: React.ReactNode[] = []
  let cursor = 0

  matches.forEach((match, index) => {
    if (match.index < cursor) return

    if (match.index > cursor) {
      nodes.push(
        <span
          key={`plain-${index}`}
          className="text-white/47"
        >
          {text.slice(cursor, match.index)}
        </span>,
      )
    }

    if (match.full.length === 0) {
      nodes.push(
        <span
          key={`zero-${index}`}
          className="relative inline-block h-[1.15em] w-px translate-y-[.18em] bg-[#d2b56b] align-baseline"
          title="零宽匹配"
        />,
      )
    } else {
      nodes.push(
        <mark
          key={`match-${index}`}
          className="rounded-[4px] bg-[#687d70]/38 px-[1px] text-[#e2efe5]"
        >
          {match.full}
        </mark>,
      )
      cursor = match.end
    }
  })

  if (cursor < text.length) {
    nodes.push(
      <span key="tail" className="text-white/47">
        {text.slice(cursor)}
      </span>,
    )
  }

  return <>{nodes}</>
}

function TinyToggle({
  active,
  label,
  title,
  onClick,
}: {
  active: boolean
  label: string
  title: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`grid h-9 min-w-9 place-items-center rounded-full border px-3 font-mono text-[10px] font-semibold transition ${
        active
          ? "border-[#52685d]/20 bg-[#52685d] text-white"
          : "border-black/[.08] text-black/30 hover:bg-white/45 hover:text-black"
      }`}
    >
      {label}
    </button>
  )
}

export default function RegexTestPage() {
  const [pattern, setPattern] = useState("\\d+")
  const [activeFlags, setActiveFlags] = useState<Flag[]>(["g"])
  const [text, setText] = useState("abc123def456")
  const [replacement, setReplacement] = useState("[$&]")
  const [matches, setMatches] = useState<MatchItem[]>([])
  const [replacementOutput, setReplacementOutput] =
    useState("abc[123]def[456]")
  const [status, setStatus] = useState<RegexStatus>("idle")
  const [error, setError] = useState("")
  const [duration, setDuration] = useState(0)
  const [truncated, setTruncated] = useState(false)
  const [live, setLive] = useState(true)
  const [copied, setCopied] = useState<CopyState>(null)

  const pageRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const runIdRef = useRef(0)
  const activeWorkerRef = useRef<Worker | null>(null)
  const activeUrlRef = useRef<string | null>(null)
  const activeTimeoutRef = useRef<number | null>(null)

  const flags = useMemo(
    () =>
      FLAGS.map((item) => item.key)
        .filter((key) => activeFlags.includes(key))
        .join(""),
    [activeFlags],
  )

  const regexLiteral = useMemo(
    () => `/${escapePatternForLiteral(pattern)}/${flags}`,
    [pattern, flags],
  )

  const lineStarts = useMemo(
    () => makeLineStarts(text),
    [text],
  )

  const groupCount =
    matches.length > 0 ? matches[0].groups.length : 0

  const namedGroupCount =
    matches.length > 0 && matches[0].named
      ? Object.keys(matches[0].named ?? {}).length
      : 0

  const totalMatchedCharacters = useMemo(
    () =>
      matches.reduce(
        (sum, match) => sum + match.full.length,
        0,
      ),
    [matches],
  )

  const coverage =
    text.length > 0
      ? Math.min(
          100,
          (totalMatchedCharacters / text.length) * 100,
        )
      : 0

  const stopActiveWorker = useCallback(() => {
    if (activeWorkerRef.current) {
      activeWorkerRef.current.terminate()
      activeWorkerRef.current = null
    }

    if (activeUrlRef.current) {
      URL.revokeObjectURL(activeUrlRef.current)
      activeUrlRef.current = null
    }

    if (activeTimeoutRef.current !== null) {
      window.clearTimeout(activeTimeoutRef.current)
      activeTimeoutRef.current = null
    }
  }, [])

  const run = useCallback(() => {
    stopActiveWorker()

    const id = ++runIdRef.current

    if (!pattern) {
      setMatches([])
      setReplacementOutput(text)
      setError("")
      setDuration(0)
      setTruncated(false)
      setStatus("idle")
      return
    }

    setStatus("running")
    setError("")
    setCopied(null)

    try {
      const blob = new Blob([REGEX_WORKER], {
        type: "text/javascript",
      })
      const url = URL.createObjectURL(blob)
      const worker = new Worker(url)

      activeWorkerRef.current = worker
      activeUrlRef.current = url

      const cleanup = () => {
        if (activeWorkerRef.current === worker) {
          activeWorkerRef.current = null
        }

        worker.terminate()

        if (activeUrlRef.current === url) {
          URL.revokeObjectURL(url)
          activeUrlRef.current = null
        }

        if (activeTimeoutRef.current !== null) {
          window.clearTimeout(activeTimeoutRef.current)
          activeTimeoutRef.current = null
        }
      }

      worker.onmessage = (
        event: MessageEvent<WorkerResult>,
      ) => {
        if (event.data.id !== runIdRef.current) {
          cleanup()
          return
        }

        const result = event.data

        if (result.ok) {
          setMatches(result.matches)
          setReplacementOutput(result.replacement)
          setDuration(result.duration)
          setTruncated(result.truncated)
          setError("")
          setStatus("ready")
        } else {
          setMatches([])
          setReplacementOutput(text)
          setDuration(result.duration)
          setTruncated(false)
          setError(result.error || "正则表达式执行失败")
          setStatus("error")
        }

        cleanup()
      }

      worker.onerror = () => {
        if (id !== runIdRef.current) {
          cleanup()
          return
        }

        setMatches([])
        setReplacementOutput(text)
        setError("正则执行线程发生异常")
        setStatus("error")
        cleanup()
      }

      activeTimeoutRef.current = window.setTimeout(
        () => {
          if (id !== runIdRef.current) {
            cleanup()
            return
          }

          cleanup()
          setMatches([])
          setReplacementOutput(text)
          setError(
            `执行超过 ${REGEX_TIMEOUT}ms，已自动终止。这个表达式可能存在灾难性回溯。`,
          )
          setStatus("timeout")
        },
        REGEX_TIMEOUT,
      )

      worker.postMessage({
        id,
        pattern,
        flags,
        text,
        replacement,
        maxMatches: MAX_MATCHES,
      })
    } catch (runError) {
      setMatches([])
      setReplacementOutput(text)
      setError(
        runError instanceof Error
          ? runError.message
          : "无法启动正则执行线程",
      )
      setStatus("error")
    }
  }, [
    flags,
    pattern,
    replacement,
    stopActiveWorker,
    text,
  ])

  useEffect(() => {
    return () => stopActiveWorker()
  }, [stopActiveWorker])

  useEffect(() => {
    if (!live) return

    const timer = window.setTimeout(() => {
      run()
    }, 150)

    return () => window.clearTimeout(timer)
  }, [live, run])

  useEffect(() => {
    if (
      !pageRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches
    ) {
      return
    }

    const ctx = gsap.context(() => {
      gsap.from(".regex-intro", {
        y: 22,
        opacity: 0,
        duration: 0.78,
        stagger: 0.055,
        ease: "power3.out",
      })

      gsap.to(".regex-orbit-a", {
        rotation: 360,
        duration: 68,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })

      gsap.to(".regex-orbit-b", {
        rotation: -360,
        duration: 104,
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
      status !== "ready" ||
      window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches
    ) {
      return
    }

    gsap.fromTo(
      previewRef.current,
      {
        opacity: 0.55,
        y: 5,
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.26,
        ease: "power2.out",
        overwrite: true,
      },
    )
  }, [matches, status])

  const toggleFlag = (flag: Flag) => {
    setActiveFlags((current) => {
      if (current.includes(flag)) {
        return current.filter((item) => item !== flag)
      }

      // sticky 和 global 都可以同时存在于 JS RegExp，
      // 这里不做互斥，保持原生 JavaScript 行为。
      return [...current, flag]
    })
  }

  const applyPreset = (preset: Preset) => {
    setPattern(preset.pattern)
    setActiveFlags(preset.flags)
    setText(preset.sample)
    setReplacement("[$&]")
  }

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

  const copyMatches = async () => {
    if (!matches.length) return
    await copy(
      matches.map((match) => match.full).join("\n"),
      "matches",
    )
  }

  const exportMatches = () => {
    if (!matches.length) return

    const data = matches.map((match, index) => {
      const position = getLineColumn(
        match.index,
        lineStarts,
      )

      return {
        order: index + 1,
        value: match.full,
        index: match.index,
        end: match.end,
        line: position.line,
        column: position.column,
        groups: match.groups,
        namedGroups: match.named,
      }
    })

    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      {
        type: "application/json;charset=utf-8",
      },
    )
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "bitleap-regex-matches.json"
    anchor.click()
    window.setTimeout(
      () => URL.revokeObjectURL(url),
      500,
    )
  }

  const statusLabel =
    status === "running"
      ? "RUNNING"
      : status === "error"
        ? "INVALID"
        : status === "timeout"
          ? "TIMEOUT"
          : status === "ready"
            ? matches.length
              ? "MATCHED"
              : "NO MATCH"
            : "IDLE"

  return (
    <div
      ref={pageRef}
      className="min-h-screen overflow-hidden bg-[#efede6] text-[#22231f] selection:bg-[#22231f] selection:text-white"
    >
      <style>{`
        .regex-scroll::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }

        .regex-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .regex-scroll::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(34,35,31,.13);
        }

        .regex-dark-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,.14);
        }

        .regex-grid {
          background-image:
            linear-gradient(rgba(34,35,31,.032) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,35,31,.032) 1px, transparent 1px);
          background-size: 30px 30px;
        }

        .regex-num {
          font-variant-numeric: tabular-nums lining-nums;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_9%,rgba(178,151,91,.10),transparent_27%),radial-gradient(circle_at_8%_88%,rgba(73,107,91,.08),transparent_31%)]" />

        <div className="regex-orbit-a absolute right-[-20vw] top-[-24vw] h-[58vw] w-[58vw] rounded-full border border-black/[.04]">
          <span className="absolute left-[15%] top-[43%] h-2 w-2 rounded-full bg-[#b28d48]/38" />
        </div>

        <div className="regex-orbit-b absolute bottom-[-26vw] left-[-19vw] h-[53vw] w-[53vw] rounded-full border border-black/[.032]">
          <span className="absolute right-[14%] top-[31%] h-1.5 w-1.5 rounded-full bg-[#52685d]/35" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1560px] px-5 pb-10 pt-6 sm:px-8">
        <div className="regex-intro">
          <Breadcrumb />
        </div>

        <header className="regex-intro mt-8 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/27">
              REGEX WORKBENCH
            </div>

            <h1 className="mt-4 max-w-[870px] text-[clamp(48px,6.35vw,90px)] font-semibold leading-[1.03] tracking-[-.055em]">
              把规则，
              <br />
              照进文本。
            </h1>
          </div>

          <div>
            <p className="max-w-[540px] text-[11px] leading-6 text-black/40">
              编写 JavaScript 正则表达式，实时查看匹配位置、捕获组与替换结果。正则执行放在独立线程，并带超时保护。
            </p>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[8px] text-black/25">
              <span>JAVASCRIPT REGEXP</span>
              <span>LOCAL ONLY</span>
              <span>WORKER SAFE</span>
              <span>{REGEX_TIMEOUT}MS TIMEOUT</span>
            </div>
          </div>
        </header>

        <section className="regex-intro mt-7">
          <div className="flex flex-col gap-4 border-b border-black/10 pb-5 xl:flex-row xl:items-end">
            <div className="min-w-0 flex-1">
              <label className="mb-2 block text-[8px] font-semibold tracking-[.13em] text-black/25">
                PATTERN
              </label>

              <div className="flex min-h-12 items-center overflow-hidden rounded-full border border-black/[.085] bg-white/32 px-4 transition focus-within:border-black/20 focus-within:bg-white/48">
                <span className="select-none font-mono text-[18px] text-black/18">
                  /
                </span>

                <input
                  value={pattern}
                  onChange={(event) =>
                    setPattern(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (
                      (event.ctrlKey || event.metaKey) &&
                      event.key === "Enter"
                    ) {
                      event.preventDefault()
                      run()
                    }
                  }}
                  spellCheck={false}
                  className="min-w-0 flex-1 bg-transparent px-2 font-mono text-[13px] text-black/72 outline-none placeholder:text-black/16"
                  placeholder="\\d+"
                />

                <span className="select-none font-mono text-[18px] text-black/18">
                  /
                </span>

                <span className="ml-2 select-none font-mono text-[10px] font-semibold text-[#52685d]">
                  {flags}
                </span>
              </div>
            </div>

            <div>
              <div className="mb-2 text-[8px] font-semibold tracking-[.13em] text-black/25">
                FLAGS
              </div>

              <div className="flex flex-wrap gap-1.5">
                {FLAGS.map((item) => (
                  <TinyToggle
                    key={item.key}
                    active={activeFlags.includes(
                      item.key,
                    )}
                    label={item.label}
                    title={item.title}
                    onClick={() =>
                      toggleFlag(item.key)
                    }
                  />
                ))}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setLive((value) => !value)}
                className={`rounded-full border px-4 py-3 text-[9px] font-semibold transition ${
                  live
                    ? "border-[#52685d]/20 bg-[#52685d] text-white"
                    : "border-black/[.085] text-black/35 hover:bg-white/45"
                }`}
              >
                {live ? "LIVE ON" : "LIVE OFF"}
              </button>

              <button
                type="button"
                onClick={run}
                className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white transition hover:scale-[1.01] active:scale-[.98]"
              >
                执行匹配
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyPreset(preset)}
                className="group flex items-center gap-2 rounded-full border border-black/[.08] bg-white/18 px-3 py-2.5 transition hover:bg-white/46"
              >
                <span className="text-[8px] font-semibold text-black/46">
                  {preset.name}
                </span>
                <span className="font-mono text-[7px] text-black/20">
                  {preset.note}
                </span>
              </button>
            ))}

            <button
              type="button"
              onClick={() => copy(regexLiteral, "regex")}
              className="ml-auto rounded-full px-3 py-2.5 text-[8px] font-semibold text-black/28 transition hover:bg-white/45 hover:text-black"
            >
              {copied === "regex"
                ? "✓ 已复制表达式"
                : "复制 /regex/flags"}
            </button>
          </div>
        </section>

        <section className="regex-intro mt-7 grid gap-px overflow-hidden rounded-[30px] border border-black/[.075] bg-black/[.07] lg:grid-cols-[.92fr_1.08fr]">
          <div className="min-w-0 bg-[#f4f1e9]">
            <div className="flex h-12 items-center justify-between border-b border-black/[.065] px-5">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    status === "error" ||
                    status === "timeout"
                      ? "bg-[#ac5f4e]"
                      : status === "running"
                        ? "animate-pulse bg-[#b28d48]"
                        : "bg-[#52685d]"
                  }`}
                />
                <span className="text-[8px] font-semibold tracking-[.13em] text-black/26">
                  TEST TEXT
                </span>
              </div>

              <span className="regex-num font-mono text-[8px] text-black/22">
                {humanNumber(text.length)} chars
              </span>
            </div>

            <textarea
              value={text}
              onChange={(event) =>
                setText(event.target.value)
              }
              onKeyDown={(event) => {
                if (
                  (event.ctrlKey || event.metaKey) &&
                  event.key === "Enter"
                ) {
                  event.preventDefault()
                  run()
                }
              }}
              spellCheck={false}
              placeholder="输入或粘贴待测试文本…"
              className="regex-scroll block h-[470px] w-full resize-none bg-transparent p-5 font-mono text-[11px] leading-6 text-[#292b26] outline-none placeholder:text-black/16 sm:p-6"
            />
          </div>

          <div className="min-w-0 bg-[#151714]">
            <div className="flex h-12 items-center justify-between border-b border-white/[.065] px-5">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    status === "error" ||
                    status === "timeout"
                      ? "bg-[#c16d5a]"
                      : matches.length
                        ? "bg-[#80a18b]"
                        : "bg-white/15"
                  }`}
                />

                <span className="text-[8px] font-semibold tracking-[.13em] text-white/27">
                  MATCH PREVIEW
                </span>
              </div>

              <span className="regex-num font-mono text-[8px] text-white/18">
                {statusLabel}
              </span>
            </div>

            <div
              ref={previewRef}
              className="regex-dark-scroll h-[470px] overflow-auto p-5 font-mono text-[11px] leading-7 sm:p-6"
            >
              {status === "error" ||
              status === "timeout" ? (
                <div className="flex h-full items-center">
                  <div className="max-w-[540px]">
                    <div className="text-[8px] font-semibold tracking-[.14em] text-[#d58471]">
                      {status === "timeout"
                        ? "REGEX TIMEOUT"
                        : "INVALID REGEX"}
                    </div>

                    <h3 className="mt-4 text-2xl font-semibold tracking-[-.04em] text-white">
                      {status === "timeout"
                        ? "这个表达式执行得太久了。"
                        : "表达式存在语法问题。"}
                    </h3>

                    <p className="mt-4 break-words font-mono text-[10px] leading-6 text-[#d39a8a]">
                      {error}
                    </p>

                    {status === "timeout" && (
                      <p className="mt-5 text-[9px] leading-5 text-white/27">
                        可以尝试减少嵌套量词、避免模糊的重复分支，或缩小测试文本。
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap break-words">
                  <HighlightedText
                    text={text}
                    matches={matches}
                  />
                </pre>
              )}
            </div>
          </div>
        </section>

        <section className="regex-intro mt-5 grid gap-px overflow-hidden rounded-[22px] bg-black/[.07] sm:grid-cols-2 lg:grid-cols-6">
          {[
            ["STATUS", statusLabel],
            ["MATCHES", truncated ? `${matches.length}+` : String(matches.length)],
            ["GROUPS", String(groupCount)],
            ["NAMED", String(namedGroupCount)],
            ["COVERAGE", `${coverage.toFixed(1)}%`],
            ["TIME", status === "ready" || status === "error" ? `${duration.toFixed(1)}ms` : "—"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="bg-[#f3f0e8] p-4"
            >
              <div className="text-[7px] font-semibold tracking-[.12em] text-black/23">
                {label}
              </div>

              <div
                className={`regex-num mt-3 font-mono text-[13px] font-semibold ${
                  label === "MATCHES" &&
                  matches.length
                    ? "text-[#557763]"
                    : label === "STATUS" &&
                        (status === "error" ||
                          status === "timeout")
                      ? "text-[#9b5548]"
                      : ""
                }`}
              >
                {value}
              </div>
            </div>
          ))}
        </section>

        <section className="regex-intro mt-10 grid gap-9 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <div className="flex flex-col gap-4 border-b border-black/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-[8px] font-semibold tracking-[.14em] text-black/23">
                  MATCH INSPECTOR
                </div>

                <h2 className="mt-2 text-[clamp(31px,4vw,48px)] font-semibold leading-none tracking-[-.045em]">
                  {matches.length
                    ? `${matches.length}${truncated ? "+" : ""} 个命中。`
                    : "等待命中。"}
                </h2>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copyMatches}
                  disabled={!matches.length}
                  className="rounded-full border border-black/[.09] px-4 py-2.5 text-[8px] font-semibold text-black/38 transition hover:bg-white/40 disabled:opacity-25"
                >
                  {copied === "matches"
                    ? "✓ 已复制"
                    : "复制全部匹配"}
                </button>

                <button
                  type="button"
                  onClick={exportMatches}
                  disabled={!matches.length}
                  className="rounded-full border border-black/[.09] px-4 py-2.5 text-[8px] font-semibold text-black/38 transition hover:bg-white/40 disabled:opacity-25"
                >
                  导出 JSON
                </button>
              </div>
            </div>

            <div className="regex-scroll mt-4 max-h-[490px] overflow-auto border-y border-black/[.065]">
              {!matches.length ? (
                <div className="py-16 text-center">
                  <div className="text-[8px] tracking-[.14em] text-black/20">
                    NO MATCHES
                  </div>
                  <p className="mt-3 text-[9px] text-black/26">
                    修改表达式或测试文本后查看结果。
                  </p>
                </div>
              ) : (
                matches.map((match, index) => {
                  const position = getLineColumn(
                    match.index,
                    lineStarts,
                  )
                  const namedEntries = Object.entries(
                    match.named ?? {},
                  )

                  return (
                    <article
                      key={`${match.index}-${match.end}-${index}`}
                      className="grid gap-3 border-b border-black/[.06] py-4 last:border-b-0 sm:grid-cols-[60px_1fr_auto]"
                    >
                      <div className="font-mono text-[8px] text-black/23">
                        #{String(index + 1).padStart(2, "0")}
                      </div>

                      <div className="min-w-0">
                        <div className="whitespace-pre-wrap break-all font-mono text-[11px] leading-5 text-black/68">
                          {match.full || (
                            <span className="italic text-black/27">
                              zero-width match
                            </span>
                          )}
                        </div>

                        {(match.groups.length > 0 ||
                          namedEntries.length > 0) && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {match.groups.map(
                              (group, groupIndex) => (
                                <span
                                  key={`group-${groupIndex}`}
                                  className="rounded-full bg-[#8e7eb0]/9 px-2.5 py-1.5 font-mono text-[7px] text-[#665d7c]"
                                >
                                  ${groupIndex + 1}:{" "}
                                  {group ?? "undefined"}
                                </span>
                              ),
                            )}

                            {namedEntries.map(
                              ([name, value]) => (
                                <span
                                  key={name}
                                  className="rounded-full bg-[#52685d]/9 px-2.5 py-1.5 font-mono text-[7px] text-[#52685d]"
                                >
                                  {name}:{" "}
                                  {value ?? "undefined"}
                                </span>
                              ),
                            )}
                          </div>
                        )}
                      </div>

                      <div className="regex-num flex gap-3 whitespace-nowrap font-mono text-[7px] text-black/22">
                        <span>
                          L{position.line}:C
                          {position.column}
                        </span>
                        <span>
                          {match.index}–{match.end}
                        </span>
                      </div>
                    </article>
                  )
                })
              )}
            </div>

            {truncated && (
              <p className="mt-3 text-[8px] leading-5 text-[#8a654b]">
                为避免渲染过多节点，当前只显示前 {MAX_MATCHES} 个匹配。
              </p>
            )}
          </div>

          <div>
            <div className="border-b border-black/10 pb-5">
              <div className="text-[8px] font-semibold tracking-[.14em] text-black/23">
                REPLACE LAB
              </div>

              <h2 className="mt-2 text-[clamp(31px,4vw,48px)] font-semibold leading-none tracking-[-.045em]">
                顺便看看替换结果。
              </h2>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-[8px] font-semibold tracking-[.12em] text-black/24">
                REPLACEMENT
              </label>

              <input
                value={replacement}
                onChange={(event) =>
                  setReplacement(event.target.value)
                }
                spellCheck={false}
                className="w-full border-b border-black/12 bg-transparent py-3 font-mono text-[12px] text-black/68 outline-none transition focus:border-black/35"
                placeholder="例如：[$&]、$1、$<name>"
              />

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 font-mono text-[7px] text-black/23">
                <span>$& = 整个匹配</span>
                <span>$1 = 捕获组</span>
                <span>$` / $' = 前后文本</span>
                <span>$&lt;name&gt; = 命名组</span>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-[25px] border border-black/[.08] bg-[#171916]">
              <div className="flex items-center justify-between border-b border-white/[.07] px-5 py-3">
                <span className="text-[8px] tracking-[.13em] text-white/25">
                  REPLACEMENT PREVIEW
                </span>

                <button
                  type="button"
                  onClick={() =>
                    copy(
                      replacementOutput,
                      "replacement",
                    )
                  }
                  disabled={!replacementOutput}
                  className="text-[8px] font-semibold text-white/26 transition hover:text-white disabled:opacity-20"
                >
                  {copied === "replacement"
                    ? "✓ COPIED"
                    : "COPY"}
                </button>
              </div>

              <pre className="regex-dark-scroll max-h-[330px] min-h-[230px] overflow-auto whitespace-pre-wrap break-words p-5 font-mono text-[10px] leading-6 text-[#c7d3c7] sm:p-6">
                {replacementOutput || "等待文本…"}
              </pre>
            </div>

            <div className="mt-5 rounded-[20px] border border-black/[.075] bg-white/22 p-4">
              <div className="text-[8px] font-semibold tracking-[.12em] text-black/24">
                CURRENT REGEX
              </div>

              <div className="mt-3 break-all font-mono text-[10px] leading-5 text-black/52">
                {regexLiteral}
              </div>
            </div>
          </div>
        </section>

        <section className="regex-intro mt-12 grid gap-8 border-t border-black/10 pt-7 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              INSPECT
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              每个匹配都会显示字符区间、行列位置、普通捕获组和命名捕获组，不只返回一串结果。
            </p>
          </div>

          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              SAFE RUN
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              正则运行在 Web Worker 中，超过 {REGEX_TIMEOUT}ms 会被终止，降低灾难性回溯导致主界面卡死的风险。
            </p>
          </div>

          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              REPLACE
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              替换实验区遵循 JavaScript 原生 replace 语法，可直接验证 $1、$&amp; 与命名捕获组。
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
