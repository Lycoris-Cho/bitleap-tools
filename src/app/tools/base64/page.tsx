"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type Mode = "encode" | "decode"
type Variant = "standard" | "url"

const EXAMPLES = [
  "Hello, BitLeap!",
  "你好，世界 👋",
  '{"name":"BitLeap","type":"tool"}',
]

function bytesToBinary(bytes: Uint8Array) {
  let binary = ""
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk)
    binary += String.fromCharCode(...slice)
  }
  return binary
}

function encodeUtf8Base64(input: string, variant: Variant) {
  const bytes = new TextEncoder().encode(input)
  let encoded = btoa(bytesToBinary(bytes))

  if (variant === "url") {
    encoded = encoded
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "")
  }

  return encoded
}

function normalizeBase64(input: string, variant: Variant) {
  let normalized = input.replace(/\s+/g, "")

  if (variant === "url") {
    normalized = normalized.replace(/-/g, "+").replace(/_/g, "/")
  }

  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
    throw new Error("invalid")
  }

  const remainder = normalized.length % 4
  if (remainder === 1) throw new Error("invalid")
  if (remainder > 0) normalized += "=".repeat(4 - remainder)

  return normalized
}

function decodeUtf8Base64(input: string, variant: Variant) {
  const normalized = normalizeBase64(input, variant)
  const binary = atob(normalized)
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }

  return new TextDecoder("utf-8", { fatal: true }).decode(bytes)
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).length
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 500)
}

export default function Base64Page() {
  const [input, setInput] = useState("你好，BitLeap 👋")
  const [mode, setMode] = useState<Mode>("encode")
  const [variant, setVariant] = useState<Variant>("standard")
  const [copied, setCopied] = useState(false)

  const pageRef = useRef<HTMLDivElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const conversion = useMemo(() => {
    if (!input) {
      return { output: "", error: "" }
    }

    try {
      const output =
        mode === "encode"
          ? encodeUtf8Base64(input, variant)
          : decodeUtf8Base64(input, variant)

      return { output, error: "" }
    } catch {
      return {
        output: "",
        error:
          mode === "encode"
            ? "编码失败，请检查输入内容。"
            : variant === "url"
              ? "无法解码：请输入合法的 Base64 URL 字符串。"
              : "无法解码：请输入合法的 Base64 字符串；如果内容使用 - 和 _，请切换到 Base64 URL。",
      }
    }
  }, [input, mode, variant])

  const output = conversion.output

  const stats = useMemo(() => {
    const inputBytes = byteLength(input)
    const outputBytes = byteLength(output)

    return {
      inputChars: input.length,
      inputBytes,
      outputChars: output.length,
      outputBytes,
      ratio:
        inputBytes > 0 && outputBytes > 0
          ? outputBytes / inputBytes
          : 0,
    }
  }, [input, output])

  useEffect(() => {
    if (
      !pageRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    const ctx = gsap.context(() => {
      gsap.from(".b64-intro", {
        y: 22,
        opacity: 0,
        duration: 0.82,
        stagger: 0.06,
        ease: "power3.out",
      })

      gsap.to(".b64-orbit-a", {
        rotation: 360,
        duration: 62,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })

      gsap.to(".b64-orbit-b", {
        rotation: -360,
        duration: 94,
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
      { y: 6, opacity: 0.55 },
      {
        y: 0,
        opacity: 1,
        duration: 0.28,
        ease: "power2.out",
        overwrite: true,
      },
    )
  }, [output, mode, variant])

  const copy = async () => {
    if (!output) return
    try {
      await navigator.clipboard.writeText(output)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {}
  }

  const useOutputAsInput = () => {
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
      className="min-h-screen overflow-hidden bg-[#10120f] text-[#f2efe7] selection:bg-[#f2efe7] selection:text-[#10120f]"
    >
      <style>{`
        .b64-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
        .b64-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.14); }
        .b64-num { font-variant-numeric: tabular-nums lining-nums; }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_12%,rgba(111,138,120,.12),transparent_28%),radial-gradient(circle_at_10%_88%,rgba(151,119,79,.08),transparent_30%)]" />
        <div className="b64-orbit-a absolute right-[-20vw] top-[-24vw] h-[58vw] w-[58vw] rounded-full border border-white/[.035]">
          <span className="absolute left-[15%] top-[43%] h-2 w-2 rounded-full bg-[#a5c4ad]/38" />
        </div>
        <div className="b64-orbit-b absolute bottom-[-26vw] left-[-19vw] h-[53vw] w-[53vw] rounded-full border border-white/[.028]">
          <span className="absolute right-[14%] top-[31%] h-1.5 w-1.5 rounded-full bg-[#d4ab72]/34" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1500px] px-5 pb-10 pt-6 sm:px-8">
        <div className="b64-intro flex items-center justify-between gap-4">
          <Breadcrumb />
          <div className="hidden text-[9px] tracking-[.14em] text-white/23 sm:block">
            BASE64 STUDIO · UTF-8 SAFE
          </div>
        </div>

        <header className="b64-intro mt-11 grid gap-7 border-b border-white/[.08] pb-8 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-white/25">
              BASE64 ENCODE / DECODE
            </div>
            <h1 className="mt-4 max-w-[900px] text-[clamp(48px,6.8vw,96px)] font-semibold leading-[.9] tracking-[-.073em]">
              文本进去，
              <br />
              字节出来。
            </h1>
          </div>

          <div>
            <p className="max-w-[520px] text-[11px] leading-6 text-white/35">
              使用浏览器原生 TextEncoder / TextDecoder 正确处理 UTF-8，再进行 Base64 转换。中文、Emoji 与 Base64 URL 都可以直接使用。
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
                  className="rounded-full border border-white/[.08] px-3 py-2 text-[8px] text-white/30 transition hover:bg-white/[.05] hover:text-white/60"
                >
                  {example.length > 24 ? `${example.slice(0, 24)}…` : example}
                </button>
              ))}
            </div>
          </div>
        </header>

        <section className="b64-intro mt-7 flex flex-col gap-5 border-b border-white/[.08] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1">
            {(["encode", "decode"] as Mode[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`rounded-full px-4 py-2.5 text-[9px] font-semibold transition ${
                  mode === value
                    ? "bg-[#f2efe7] text-[#11130f]"
                    : "text-white/30 hover:bg-white/[.05] hover:text-white/60"
                }`}
              >
                {value === "encode" ? "编码" : "解码"}
              </button>
            ))}

            <span className="mx-1 hidden h-8 w-px bg-white/[.08] sm:block" />

            {(["standard", "url"] as Variant[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setVariant(value)}
                className={`rounded-full px-4 py-2.5 text-[9px] font-semibold transition ${
                  variant === value
                    ? "bg-[#607a69] text-white"
                    : "text-white/30 hover:bg-white/[.05] hover:text-white/60"
                }`}
              >
                {value === "standard" ? "标准 Base64" : "Base64 URL"}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={clear}
            className="self-start text-[9px] font-semibold text-[#cb8b74] transition hover:text-[#e1a38c] sm:self-auto"
          >
            清空
          </button>
        </section>

        <section className="b64-intro mt-7 grid gap-px overflow-hidden rounded-[30px] border border-white/[.07] bg-white/[.07] lg:grid-cols-2">
          <div className="min-w-0 bg-[#151713]">
            <div className="flex h-12 items-center justify-between border-b border-white/[.06] px-5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#7d9a86]" />
                <span className="text-[8px] font-semibold tracking-[.13em] text-white/26">
                  {mode === "encode" ? "UTF-8 TEXT" : variant === "standard" ? "BASE64 INPUT" : "BASE64 URL INPUT"}
                </span>
              </div>
              <span className="b64-num text-[8px] text-white/20">
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
                  ? "输入文本、JSON、Emoji…"
                  : variant === "standard"
                    ? "输入 Base64 字符串…"
                    : "输入 Base64 URL 字符串…"
              }
              className="b64-scroll block h-[440px] w-full resize-none bg-transparent p-5 font-mono text-[12px] leading-7 text-[#e4e3dc] outline-none placeholder:text-white/14 sm:p-6"
            />
          </div>

          <div className="min-w-0 bg-[#0d0f0c]">
            <div className="flex h-12 items-center justify-between border-b border-white/[.06] px-5">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${conversion.error ? "bg-[#c76e59]" : output ? "bg-[#c5a56b]" : "bg-white/20"}`} />
                <span className="text-[8px] font-semibold tracking-[.13em] text-white/26">
                  {mode === "encode" ? "BASE64 OUTPUT" : "UTF-8 OUTPUT"}
                </span>
              </div>

              <span className="b64-num text-[8px] text-white/20">
                {output ? `${stats.outputChars} chars` : "WAITING"}
              </span>
            </div>

            <div className="relative h-[440px]">
              {conversion.error ? (
                <div className="flex h-full items-center p-6">
                  <div className="max-w-md">
                    <div className="text-[8px] font-semibold tracking-[.13em] text-[#d98773]">
                      INVALID INPUT
                    </div>
                    <p className="mt-3 text-[11px] leading-6 text-[#d59a8a]">
                      {conversion.error}
                    </p>
                  </div>
                </div>
              ) : output ? (
                <div
                  ref={outputRef}
                  className="b64-scroll h-full overflow-auto whitespace-pre-wrap break-all p-5 font-mono text-[12px] leading-7 text-[#b8d3be] sm:p-6"
                >
                  {output}
                </div>
              ) : (
                <div className="grid h-full place-items-center text-[9px] tracking-[.12em] text-white/16">
                  OUTPUT WILL APPEAR HERE
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="b64-intro mt-5 flex flex-col gap-4 border-b border-white/[.08] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copy}
              disabled={!output}
              className="rounded-full bg-[#f2efe7] px-5 py-3 text-[10px] font-semibold text-[#11130f] transition hover:scale-[1.01] active:scale-[.98] disabled:opacity-25"
            >
              {copied ? "✓ 已复制" : "复制结果"}
            </button>

            <button
              type="button"
              onClick={useOutputAsInput}
              disabled={!output}
              className="rounded-full border border-white/[.09] px-5 py-3 text-[10px] font-semibold text-white/45 transition hover:bg-white/[.05] hover:text-white/70 disabled:opacity-25"
            >
              结果 → 输入并反向
            </button>

            <button
              type="button"
              onClick={() =>
                downloadText(
                  mode === "encode" ? "bitleap-base64.txt" : "bitleap-decoded.txt",
                  output,
                )
              }
              disabled={!output}
              className="rounded-full border border-white/[.09] px-4 py-3 text-[9px] font-semibold text-white/38 transition hover:bg-white/[.05] hover:text-white/65 disabled:opacity-25"
            >
              导出 TXT
            </button>
          </div>

          {output && (
            <div className="b64-num text-[8px] text-white/22">
              {mode === "encode"
                ? `输出约为输入字节的 ${stats.ratio.toFixed(2)}×`
                : `${stats.inputChars} → ${stats.outputChars} chars`}
            </div>
          )}
        </section>

        <section className="b64-intro mt-10 grid gap-7 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-white/22">
              UTF-8 CORRECT
            </div>
            <p className="mt-2 text-[9px] leading-5 text-white/30">
              不再把 `encodeURIComponent()` 的百分号文本拿去 Base64，而是先把真实 UTF-8 字节编码。
            </p>
          </div>

          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-white/22">
              BASE64 URL
            </div>
            <p className="mt-2 text-[9px] leading-5 text-white/30">
              URL-safe 模式会把 `+ /` 转为 `- _` 并移除结尾 padding，适合 JWT、URL 参数和 Web API。
            </p>
          </div>

          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-white/22">
              LOCAL ONLY
            </div>
            <p className="mt-2 text-[9px] leading-5 text-white/30">
              所有编码和解码都在浏览器本地完成，内容不会发送给 BitLeap 服务器。
            </p>
          </div>
        </section>

        <div className="mt-12 border-t border-white/[.07] pt-5">
          <FooterNote />
        </div>
      </div>
    </div>
  )
}
