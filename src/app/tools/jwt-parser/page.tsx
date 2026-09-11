"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type CopyKey =
  | "header"
  | "payload"
  | "signature"
  | "token"
  | null

type ParsedJwt = {
  header: Record<string, unknown>
  payload: Record<string, unknown>
  signature: string
  rawHeader: string
  rawPayload: string
}

const SAMPLE_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkJpdExlYXAgVXNlciIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjo0MTAyNDQ0ODAwfQ.dummy-signature"

function base64UrlDecode(value: string) {
  const normalized = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")

  const padded = normalized.padEnd(
    Math.ceil(normalized.length / 4) * 4,
    "=",
  )

  const binary = atob(padded)
  const bytes = Uint8Array.from(
    binary,
    (char) => char.charCodeAt(0),
  )

  return new TextDecoder().decode(bytes)
}

function safeParseJwt(token: string): {
  result: ParsedJwt | null
  error: string
} {
  const trimmed = token.trim()

  if (!trimmed) {
    return {
      result: null,
      error: "",
    }
  }

  const parts = trimmed.split(".")

  if (parts.length !== 3) {
    return {
      result: null,
      error: `JWT 需要 3 段，目前检测到 ${parts.length} 段。`,
    }
  }

  try {
    const rawHeader = base64UrlDecode(parts[0])
    const rawPayload = base64UrlDecode(parts[1])

    const header = JSON.parse(rawHeader)
    const payload = JSON.parse(rawPayload)

    if (
      !header ||
      typeof header !== "object" ||
      Array.isArray(header)
    ) {
      throw new Error("Header 不是 JSON Object")
    }

    if (
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload)
    ) {
      throw new Error("Payload 不是 JSON Object")
    }

    return {
      result: {
        header,
        payload,
        signature: parts[2],
        rawHeader,
        rawPayload,
      },
      error: "",
    }
  } catch (error) {
    return {
      result: null,
      error:
        error instanceof Error
          ? error.message
          : "JWT 解码失败",
    }
  }
}

function formatTime(
  timestamp: unknown,
) {
  if (
    typeof timestamp !== "number" ||
    !Number.isFinite(timestamp)
  ) {
    return ""
  }

  const date = new Date(timestamp * 1000)

  if (Number.isNaN(date.getTime())) return ""

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date)
}

function relativeUnix(
  timestamp: unknown,
  nowMs: number,
) {
  if (
    typeof timestamp !== "number" ||
    !Number.isFinite(timestamp)
  ) {
    return ""
  }

  const diff =
    timestamp * 1000 - nowMs
  const abs = Math.abs(diff)

  if (abs < 1000) return "现在"

  const units: Array<[string, number]> = [
    ["天", 86400000],
    ["小时", 3600000],
    ["分钟", 60000],
    ["秒", 1000],
  ]

  const selected =
    units.find(([, size]) => abs >= size) ??
    units[units.length - 1]

  const amount = Math.floor(
    abs / selected[1],
  )

  return diff > 0
    ? `${amount} ${selected[0]}后`
    : `${amount} ${selected[0]}前`
}

function tokenPartColor(index: number) {
  if (index === 0) return "text-[#d39d8e]"
  if (index === 1) return "text-[#a8c8ad]"
  return "text-[#9fb4d6]"
}

function downloadText(
  content: string,
  filename: string,
) {
  const blob = new Blob([content], {
    type: "text/plain;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(
    () => URL.revokeObjectURL(url),
    500,
  )
}

export default function JwtParser() {
  const [token, setToken] =
    useState(SAMPLE_TOKEN)
  const [copied, setCopied] =
    useState<CopyKey>(null)
  const [nowMs, setNowMs] = useState(0)

  const pageRef = useRef<HTMLDivElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const update = () => setNowMs(Date.now())
    update()

    const timer = window.setInterval(
      update,
      1000,
    )

    return () =>
      window.clearInterval(timer)
  }, [])

  const parsed = useMemo(
    () => safeParseJwt(token),
    [token],
  )

  const result = parsed.result
  const payload = result?.payload ?? {}
  const header = result?.header ?? {}

  const exp =
    typeof payload.exp === "number"
      ? payload.exp
      : null
  const iat =
    typeof payload.iat === "number"
      ? payload.iat
      : null
  const nbf =
    typeof payload.nbf === "number"
      ? payload.nbf
      : null

  const isExpired =
    exp !== null &&
    nowMs > exp * 1000

  const notActiveYet =
    nbf !== null &&
    nowMs < nbf * 1000

  const issuer =
    typeof payload.iss === "string"
      ? payload.iss
      : "—"

  const subject =
    typeof payload.sub === "string"
      ? payload.sub
      : "—"

  const audience =
    typeof payload.aud === "string"
      ? payload.aud
      : Array.isArray(payload.aud)
        ? payload.aud.join(", ")
        : "—"

  const algorithm =
    typeof header.alg === "string"
      ? header.alg
      : "—"

  const tokenParts = useMemo(
    () => token.trim().split("."),
    [token],
  )

  const report = useMemo(() => {
    if (!result) return ""

    return [
      "BitLeap JWT Inspector",
      "",
      `Algorithm: ${algorithm}`,
      `Issuer: ${issuer}`,
      `Subject: ${subject}`,
      `Audience: ${audience}`,
      `Issued At: ${iat ? formatTime(iat) : "—"}`,
      `Not Before: ${nbf ? formatTime(nbf) : "—"}`,
      `Expires: ${exp ? formatTime(exp) : "—"}`,
      `Expired: ${exp ? (isExpired ? "yes" : "no") : "unknown"}`,
      "",
      "Header:",
      JSON.stringify(result.header, null, 2),
      "",
      "Payload:",
      JSON.stringify(result.payload, null, 2),
      "",
      "Signature:",
      result.signature,
      "",
      "NOTICE: This page only decodes JWT. Signature validity is NOT verified.",
    ].join("\n")
  }, [
    algorithm,
    audience,
    exp,
    iat,
    isExpired,
    issuer,
    nbf,
    result,
    subject,
  ])

  useEffect(() => {
    if (
      !pageRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    const ctx = gsap.context(() => {
      gsap.from(".jwt-intro", {
        y: 22,
        opacity: 0,
        duration: 0.78,
        stagger: 0.055,
        ease: "power3.out",
      })

      gsap.to(".jwt-orbit-a", {
        rotation: 360,
        duration: 70,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })

      gsap.to(".jwt-orbit-b", {
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
      !resultRef.current ||
      !result ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    gsap.fromTo(
      resultRef.current,
      { opacity: 0.64, y: 5 },
      {
        opacity: 1,
        y: 0,
        duration: 0.24,
        ease: "power2.out",
        overwrite: true,
      },
    )
  }, [result])

  const copy = async (
    value: string,
    key: CopyKey,
  ) => {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      window.setTimeout(
        () => setCopied(null),
        1200,
      )
    } catch {}
  }

  const paste = async () => {
    try {
      const value =
        await navigator.clipboard.readText()
      if (value) setToken(value.trim())
    } catch {}
  }

  return (
    <div
      ref={pageRef}
      className="min-h-screen overflow-hidden bg-[#efede6] text-[#22231f] selection:bg-[#22231f] selection:text-white"
    >
      <style>{`
        .jwt-scroll::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }

        .jwt-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .jwt-scroll::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(34,35,31,.13);
        }

        .jwt-dark-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,.14);
        }

        .jwt-num {
          font-variant-numeric: tabular-nums lining-nums;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_9%,rgba(178,151,91,.10),transparent_27%),radial-gradient(circle_at_8%_88%,rgba(73,107,91,.08),transparent_31%)]" />
        <div className="jwt-orbit-a absolute right-[-20vw] top-[-24vw] h-[58vw] w-[58vw] rounded-full border border-black/[.04]">
          <span className="absolute left-[15%] top-[43%] h-2 w-2 rounded-full bg-[#b28d48]/38" />
        </div>
        <div className="jwt-orbit-b absolute bottom-[-26vw] left-[-19vw] h-[53vw] w-[53vw] rounded-full border border-black/[.032]">
          <span className="absolute right-[14%] top-[31%] h-1.5 w-1.5 rounded-full bg-[#52685d]/35" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1580px] px-5 pb-10 pt-6 sm:px-8">
        <div className="jwt-intro">
          <Breadcrumb />
        </div>

        <header className="jwt-intro mt-8 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/27">
              JWT INSPECTOR
            </div>

            <h1 className="mt-4 max-w-[900px] text-[clamp(48px,6.35vw,90px)] font-semibold leading-[1.03] tracking-[-.055em]">
              把 Token，
              <br />
              拆开来看。
            </h1>
          </div>

          <div>
            <p className="max-w-[560px] text-[11px] leading-6 text-black/40">
              解码 JWT Header、Payload 与 Signature，识别 alg、iss、sub、aud、iat、nbf、exp，并实时判断时间状态。这里只做解码，不验证签名。
            </p>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[8px] text-black/25">
              <span>BASE64URL</span>
              <span>CLAIM INSPECTOR</span>
              <span>LOCAL ONLY</span>
              <span>NO SIGNATURE VERIFY</span>
            </div>
          </div>
        </header>

        <section className="jwt-intro mt-7">
          <div className="flex flex-col gap-4 border-b border-black/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[8px] font-semibold tracking-[.14em] text-black/23">
                JWT TOKEN
              </div>
              <p className="mt-2 text-[9px] text-black/31">
                标准 JWS/JWT 通常由 Header.Payload.Signature 三段组成。
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setToken(SAMPLE_TOKEN)
                }
                className="rounded-full border border-black/[.085] px-4 py-2.5 text-[8px] font-semibold text-black/35 transition hover:bg-white/45"
              >
                示例
              </button>

              <button
                type="button"
                onClick={paste}
                className="rounded-full border border-black/[.085] px-4 py-2.5 text-[8px] font-semibold text-black/35 transition hover:bg-white/45"
              >
                粘贴
              </button>

              <button
                type="button"
                onClick={() => setToken("")}
                className="rounded-full px-4 py-2.5 text-[8px] font-semibold text-[#965744] transition hover:bg-[#965744]/8"
              >
                清空
              </button>
            </div>
          </div>

          <textarea
            value={token}
            onChange={(event) =>
              setToken(event.target.value)
            }
            spellCheck={false}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            className="jwt-scroll mt-5 block h-[145px] w-full resize-none bg-transparent font-mono text-[11px] leading-6 text-black/67 outline-none placeholder:text-black/16"
          />

          {token.trim() && (
            <div className="mt-4 break-all rounded-[20px] border border-black/[.07] bg-white/20 p-4 font-mono text-[9px] leading-5">
              {tokenParts.map((part, index) => (
                <span key={`${index}-${part.slice(0, 8)}`}>
                  <span
                    className={tokenPartColor(index)}
                  >
                    {part}
                  </span>
                  {index < tokenParts.length - 1 && (
                    <span className="text-black/18">
                      .
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}

          {parsed.error && (
            <div className="mt-4 rounded-[20px] border border-[#965744]/18 bg-[#965744]/7 p-4">
              <div className="text-[8px] font-semibold tracking-[.12em] text-[#965744]">
                INVALID JWT
              </div>
              <p className="mt-2 break-words font-mono text-[9px] leading-5 text-[#965744]">
                {parsed.error}
              </p>
            </div>
          )}
        </section>

        {result && (
          <section
            ref={resultRef}
            className="jwt-intro mt-7"
          >
            <div className="grid gap-px overflow-hidden rounded-[24px] bg-black/[.07] sm:grid-cols-2 lg:grid-cols-5">
              {[
                ["ALG", algorithm],
                ["ISSUER", issuer],
                ["SUBJECT", subject],
                ["AUDIENCE", audience],
                [
                  "STATUS",
                  notActiveYet
                    ? "NOT ACTIVE"
                    : exp === null
                      ? "NO EXP"
                      : isExpired
                        ? "EXPIRED"
                        : "ACTIVE",
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="bg-[#f3f0e8]/92 p-4"
                >
                  <div className="text-[7px] font-semibold tracking-[.12em] text-black/23">
                    {label}
                  </div>
                  <div className="jwt-num mt-3 break-all font-mono text-[11px] font-semibold text-black/61">
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {(exp !== null ||
              iat !== null ||
              nbf !== null) && (
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {[
                  {
                    label: "ISSUED AT",
                    value: iat,
                  },
                  {
                    label: "NOT BEFORE",
                    value: nbf,
                  },
                  {
                    label: "EXPIRES",
                    value: exp,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[22px] border border-black/[.075] bg-white/24 p-4"
                  >
                    <div className="text-[8px] font-semibold tracking-[.12em] text-black/23">
                      {item.label}
                    </div>
                    <div className="mt-3 font-mono text-[10px] text-black/58">
                      {item.value !== null
                        ? formatTime(item.value)
                        : "—"}
                    </div>
                    <div className="mt-2 text-[8px] text-black/27">
                      {item.value !== null
                        ? relativeUnix(
                            item.value,
                            nowMs,
                          )
                        : "claim not present"}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-7 grid gap-px overflow-hidden rounded-[30px] border border-black/[.08] bg-black/[.07] lg:grid-cols-2">
              {[
                {
                  label: "HEADER",
                  data: result.header,
                  key: "header" as CopyKey,
                },
                {
                  label: "PAYLOAD",
                  data: result.payload,
                  key: "payload" as CopyKey,
                },
              ].map((item) => {
                const formatted =
                  JSON.stringify(
                    item.data,
                    null,
                    2,
                  )

                return (
                  <div
                    key={item.label}
                    className="min-w-0 bg-[#151714]"
                  >
                    <div className="flex h-12 items-center justify-between border-b border-white/[.065] px-5">
                      <span className="text-[8px] font-semibold tracking-[.13em] text-white/27">
                        {item.label}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          copy(
                            formatted,
                            item.key,
                          )
                        }
                        className="text-[8px] font-semibold text-white/27 transition hover:text-white"
                      >
                        {copied === item.key
                          ? "✓ COPIED"
                          : "COPY"}
                      </button>
                    </div>

                    <pre className="jwt-dark-scroll h-[420px] overflow-auto whitespace-pre-wrap break-words p-5 font-mono text-[10px] leading-6 text-[#cbd8cd] sm:p-6">
                      {formatted}
                    </pre>
                  </div>
                )
              })}
            </div>

            <div className="mt-5 overflow-hidden rounded-[24px] border border-black/[.075] bg-white/24">
              <div className="flex items-center justify-between border-b border-black/[.06] px-5 py-4">
                <span className="text-[8px] font-semibold tracking-[.13em] text-black/24">
                  SIGNATURE SEGMENT
                </span>
                <button
                  type="button"
                  onClick={() =>
                    copy(
                      result.signature,
                      "signature",
                    )
                  }
                  className="text-[8px] font-semibold text-black/30 transition hover:text-black"
                >
                  {copied === "signature"
                    ? "✓ COPIED"
                    : "COPY"}
                </button>
              </div>

              <div className="break-all p-5 font-mono text-[10px] leading-5 text-black/54">
                {result.signature || "[empty signature]"}
              </div>

              <div className="border-t border-black/[.06] px-5 py-4 text-[8px] leading-5 text-[#965744]">
                这里显示的 Signature 只是编码片段。没有公钥 / 密钥与验证算法时，不能判断 Token 是否真实可信。
              </div>
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  copy(token.trim(), "token")
                }
                className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38"
              >
                {copied === "token"
                  ? "✓ 已复制 Token"
                  : "复制 Token"}
              </button>

              <button
                type="button"
                onClick={() =>
                  downloadText(
                    report,
                    "bitleap-jwt-report.txt",
                  )
                }
                className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white"
              >
                导出解析报告
              </button>
            </div>
          </section>
        )}

        <section className="jwt-intro mt-12 grid gap-8 border-t border-black/10 pt-7 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              BASE64URL
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              新版会补齐 Base64URL padding，并用 TextDecoder 解码 UTF-8，比直接 atob 后 JSON.parse 更适合包含中文等 Unicode 内容。
            </p>
          </div>

          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              CLAIM STATUS
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              自动检查 iat、nbf、exp，并随着当前时间变化实时显示“未生效 / 有效 / 已过期”等时间状态。
            </p>
          </div>

          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              DECODE ≠ VERIFY
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              解码 JWT 不代表它可信。真正鉴权必须校验签名、issuer、audience、算法和业务约束。
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
