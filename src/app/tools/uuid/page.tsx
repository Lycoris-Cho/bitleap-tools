"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type IdKind = "uuid" | "compact" | "hex" | "nano"
type LetterCase = "lower" | "upper"
type CopyKey = "all" | string | null

type IdItem = {
  id: string
  value: string
  createdAt: number
}

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
const NANO_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-"

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value)
}

function randomBytes(length: number) {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes
}

function randomHex(bytesLength: number) {
  return Array.from(randomBytes(bytesLength))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

function randomNano(size: number) {
  const bytes = randomBytes(size)
  let id = ""

  for (let index = 0; index < size; index++) {
    id += NANO_ALPHABET[bytes[index] & 63]
  }

  return id
}

function ulidLike() {
  const time = Date.now()
  let value = ""
  let remaining = time

  for (let index = 9; index >= 0; index--) {
    const mod = remaining % 32
    value = CROCKFORD[mod] + value
    remaining = Math.floor(remaining / 32)
  }

  const bytes = randomBytes(10)

  for (const byte of bytes) {
    value += CROCKFORD[byte & 31]
  }

  return value
}

function formatUuid(
  value: string,
  options: {
    uppercase: boolean
    hyphen: boolean
    braces: boolean
    prefix: string
    suffix: string
  },
) {
  let output = options.hyphen ? value : value.replace(/-/g, "")
  output = options.uppercase ? output.toUpperCase() : output.toLowerCase()
  output = options.braces ? `{${output}}` : output
  return `${options.prefix}${output}${options.suffix}`
}

function createId(kind: IdKind) {
  if (kind === "uuid") return crypto.randomUUID()
  if (kind === "compact") return ulidLike()
  if (kind === "hex") return randomHex(16)
  return randomNano(21)
}

function entropyLabel(kind: IdKind) {
  if (kind === "uuid") return "122-bit random"
  if (kind === "hex") return "128-bit random"
  if (kind === "nano") return "~126-bit random"
  return "time + 80-bit random"
}

function downloadText(content: string) {
  const blob = new Blob([content], {
    type: "text/plain;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = "bitleap-ids.txt"
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 500)
}

export default function UuidPage() {
  const [list, setList] = useState<IdItem[]>([])
  const [kind, setKind] = useState<IdKind>("uuid")
  const [count, setCount] = useState(10)
  const [letterCase, setLetterCase] = useState<LetterCase>("lower")
  const [hyphen, setHyphen] = useState(true)
  const [braces, setBraces] = useState(false)
  const [prefix, setPrefix] = useState("")
  const [suffix, setSuffix] = useState("")
  const [copied, setCopied] = useState<CopyKey>(null)

  const pageRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const formattedList = useMemo(
    () =>
      list.map((item) => ({
        ...item,
        display:
          kind === "uuid"
            ? formatUuid(item.value, {
                uppercase: letterCase === "upper",
                hyphen,
                braces,
                prefix,
                suffix,
              })
            : `${prefix}${
                letterCase === "upper"
                  ? item.value.toUpperCase()
                  : item.value.toLowerCase()
              }${suffix}`,
      })),
    [braces, hyphen, kind, letterCase, list, prefix, suffix],
  )

  const allText = useMemo(
    () => formattedList.map((item) => item.display).join("\n"),
    [formattedList],
  )

  const stats = useMemo(
    () => ({
      count: formattedList.length,
      chars: allText.length,
      latest: formattedList[0]?.createdAt ?? null,
    }),
    [allText.length, formattedList],
  )

  useEffect(() => {
    if (
      !pageRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    const ctx = gsap.context(() => {
      gsap.from(".uuid-intro", {
        y: 22,
        opacity: 0,
        duration: 0.78,
        stagger: 0.055,
        ease: "power3.out",
      })

      gsap.to(".uuid-orbit-a", {
        rotation: 360,
        duration: 68,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })

      gsap.to(".uuid-orbit-b", {
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
    generate(10, "replace")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (
      !listRef.current ||
      !list.length ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    gsap.fromTo(
      listRef.current,
      { opacity: 0.62, y: 5 },
      {
        opacity: 1,
        y: 0,
        duration: 0.24,
        ease: "power2.out",
        overwrite: true,
      },
    )
  }, [list, kind])

  const generate = (
    amount: number,
    mode: "append" | "replace" = "replace",
  ) => {
    const safeAmount = Math.max(
      1,
      Math.min(1000, Math.floor(amount)),
    )
    const now = Date.now()
    const next = Array.from(
      { length: safeAmount },
      () => ({
        id: crypto.randomUUID(),
        value: createId(kind),
        createdAt: now,
      }),
    )

    setList((current) =>
      mode === "append" ? [...next, ...current].slice(0, 3000) : next,
    )
    setCopied(null)
  }

  const remove = (id: string) => {
    setList((current) => current.filter((item) => item.id !== id))
  }

  const clear = () => {
    setList([])
    setCopied(null)
  }

  const copy = async (value: string, key: CopyKey) => {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {}
  }

  return (
    <div
      ref={pageRef}
      className="min-h-screen overflow-hidden bg-[#efede6] text-[#22231f] selection:bg-[#22231f] selection:text-white"
    >
      <style>{`
        .uuid-scroll::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }

        .uuid-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .uuid-scroll::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(34,35,31,.13);
        }

        .uuid-dark-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,.14);
        }

        .uuid-grid {
          background-image:
            linear-gradient(rgba(34,35,31,.032) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,35,31,.032) 1px, transparent 1px);
          background-size: 30px 30px;
        }

        .uuid-num {
          font-variant-numeric: tabular-nums lining-nums;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_9%,rgba(178,151,91,.10),transparent_27%),radial-gradient(circle_at_8%_88%,rgba(73,107,91,.08),transparent_31%)]" />
        <div className="uuid-orbit-a absolute right-[-20vw] top-[-24vw] h-[58vw] w-[58vw] rounded-full border border-black/[.04]">
          <span className="absolute left-[15%] top-[43%] h-2 w-2 rounded-full bg-[#b28d48]/38" />
        </div>
        <div className="uuid-orbit-b absolute bottom-[-26vw] left-[-19vw] h-[53vw] w-[53vw] rounded-full border border-black/[.032]">
          <span className="absolute right-[14%] top-[31%] h-1.5 w-1.5 rounded-full bg-[#52685d]/35" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1500px] px-5 pb-10 pt-6 sm:px-8">
        <div className="uuid-intro">
          <Breadcrumb />
        </div>

        <header className="uuid-intro mt-8 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/27">
              ID GENERATOR
            </div>
            <h1 className="mt-4 max-w-[870px] text-[clamp(48px,6.35vw,90px)] font-semibold leading-[1.03] tracking-[-.055em]">
              给每一项，
              <br />
              一个可靠名字。
            </h1>
          </div>

          <div>
            <p className="max-w-[560px] text-[11px] leading-6 text-black/40">
              生成 UUID v4、紧凑时间型 ID、128 位随机 Hex 和 Nano 风格 ID。适合前端 key、配置标识、临时数据和测试样本。
            </p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[8px] text-black/25">
              <span>CRYPTO RANDOM</span>
              <span>BATCH GENERATE</span>
              <span>FORMAT OPTIONS</span>
              <span>LOCAL ONLY</span>
            </div>
          </div>
        </header>

        <section className="uuid-intro mt-7 grid gap-7 lg:grid-cols-[.62fr_1.38fr]">
          <aside className="min-w-0">
            <div className="rounded-[28px] border border-black/[.075] bg-white/24 p-5">
              <div className="text-[8px] font-semibold tracking-[.14em] text-black/24">
                GENERATOR
              </div>
              <h2 className="mt-3 text-[clamp(30px,3.5vw,46px)] font-semibold leading-none tracking-[-.045em]">
                批量生成。
              </h2>

              <div className="mt-6 grid gap-4">
                <div>
                  <div className="mb-2 text-[8px] font-semibold tracking-[.12em] text-black/24">
                    TYPE
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(["uuid", "compact", "hex", "nano"] as IdKind[]).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setKind(value)}
                        className={`rounded-full px-3.5 py-2 text-[8px] font-semibold transition ${
                          kind === value
                            ? "bg-[#22231f] text-white"
                            : "text-black/32 hover:bg-white/45 hover:text-black"
                        }`}
                      >
                        {value === "uuid" ? "UUID v4" : value === "compact" ? "Compact" : value === "hex" ? "Hex" : "Nano"}
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-[8px] leading-5 text-black/29">
                    {entropyLabel(kind)}
                  </p>
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-3">
                  <label>
                    <span className="mb-2 block text-[8px] text-black/24">
                      数量
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={count}
                      onChange={(event) => setCount(Number(event.target.value) || 1)}
                      className="w-full rounded-full border border-black/[.08] bg-white/35 px-4 py-3 font-mono text-[10px] outline-none"
                    />
                  </label>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => generate(count)}
                      className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white"
                    >
                      生成
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[1, 5, 10, 20, 50, 100].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => generate(amount)}
                      className="rounded-full border border-black/[.085] px-3.5 py-2 text-[8px] font-semibold text-black/35 transition hover:bg-white/45 hover:text-black"
                    >
                      {amount}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => generate(count, "append")}
                  className="rounded-full border border-black/[.085] px-4 py-3 text-[9px] font-semibold text-black/38 transition hover:bg-white/45 hover:text-black"
                >
                  ＋ 追加 {formatNumber(count)} 个
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-[28px] border border-black/[.075] bg-white/24 p-5">
              <div className="text-[8px] font-semibold tracking-[.14em] text-black/24">
                FORMAT
              </div>

              <div className="mt-5 grid gap-4">
                <div className="flex flex-wrap gap-1.5">
                  {(["lower", "upper"] as LetterCase[]).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setLetterCase(value)}
                      className={`rounded-full px-3.5 py-2 font-mono text-[8px] font-semibold transition ${
                        letterCase === value
                          ? "bg-[#52685d] text-white"
                          : "text-black/32 hover:bg-white/45 hover:text-black"
                      }`}
                    >
                      {value === "lower" ? "lower" : "UPPER"}
                    </button>
                  ))}

                  {kind === "uuid" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setHyphen((value) => !value)}
                        className={`rounded-full px-3.5 py-2 text-[8px] font-semibold transition ${
                          hyphen
                            ? "bg-[#52685d] text-white"
                            : "text-black/32 hover:bg-white/45 hover:text-black"
                        }`}
                      >
                        hyphen
                      </button>
                      <button
                        type="button"
                        onClick={() => setBraces((value) => !value)}
                        className={`rounded-full px-3.5 py-2 text-[8px] font-semibold transition ${
                          braces
                            ? "bg-[#52685d] text-white"
                            : "text-black/32 hover:bg-white/45 hover:text-black"
                        }`}
                      >
                        {"{ }"}
                      </button>
                    </>
                  )}
                </div>

                <label>
                  <span className="mb-2 block text-[8px] text-black/24">
                    前缀
                  </span>
                  <input
                    value={prefix}
                    onChange={(event) => setPrefix(event.target.value)}
                    className="w-full rounded-full border border-black/[.08] bg-white/35 px-4 py-3 font-mono text-[10px] outline-none"
                    placeholder="如：user_"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-[8px] text-black/24">
                    后缀
                  </span>
                  <input
                    value={suffix}
                    onChange={(event) => setSuffix(event.target.value)}
                    className="w-full rounded-full border border-black/[.08] bg-white/35 px-4 py-3 font-mono text-[10px] outline-none"
                    placeholder="如：_dev"
                  />
                </label>
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="flex flex-col gap-4 border-b border-black/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-[8px] font-semibold tracking-[.14em] text-black/23">
                  GENERATED IDS
                </div>
                <h2 className="mt-2 text-[clamp(31px,4vw,48px)] font-semibold leading-none tracking-[-.045em]">
                  {stats.count ? `${formatNumber(stats.count)} 个结果。` : "等待生成。"}
                </h2>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => copy(allText, "all")}
                  disabled={!allText}
                  className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white transition hover:scale-[1.01] active:scale-[.98] disabled:opacity-30"
                >
                  {copied === "all" ? "✓ 已复制全部" : "复制全部"}
                </button>
                <button
                  type="button"
                  onClick={() => downloadText(allText)}
                  disabled={!allText}
                  className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 transition hover:bg-white/40 disabled:opacity-30"
                >
                  导出 TXT
                </button>
                <button
                  type="button"
                  onClick={clear}
                  className="rounded-full px-4 py-3 text-[9px] font-semibold text-[#965744] transition hover:bg-[#965744]/8"
                >
                  清空
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-px overflow-hidden rounded-[22px] bg-black/[.07] sm:grid-cols-3">
              {[
                ["COUNT", formatNumber(stats.count)],
                ["FORMAT", kind.toUpperCase()],
                ["CHARS", formatNumber(stats.chars)],
              ].map(([label, value]) => (
                <div key={label} className="bg-[#f3f0e8]/92 p-4">
                  <div className="text-[7px] font-semibold tracking-[.12em] text-black/23">
                    {label}
                  </div>
                  <div className="uuid-num mt-3 break-all font-mono text-[13px] font-semibold text-black/61">
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <div
              ref={listRef}
              className="uuid-scroll mt-5 max-h-[650px] overflow-auto rounded-[30px] border border-black/[.075] bg-[#f4f1e9]"
            >
              {!formattedList.length ? (
                <div className="grid min-h-[360px] place-items-center px-6 text-center">
                  <div>
                    <div className="text-[8px] tracking-[.14em] text-black/20">
                      EMPTY
                    </div>
                    <p className="mt-3 text-[9px] text-black/28">
                      点击生成按钮创建 ID。
                    </p>
                  </div>
                </div>
              ) : (
                formattedList.map((item, index) => (
                  <article
                    key={item.id}
                    className="group grid gap-3 border-b border-black/[.055] px-5 py-4 last:border-b-0 sm:grid-cols-[56px_1fr_auto] sm:items-center"
                  >
                    <div className="uuid-num font-mono text-[8px] text-black/22">
                      #{String(index + 1).padStart(2, "0")}
                    </div>

                    <div className="min-w-0 break-all font-mono text-[11px] leading-5 text-black/67">
                      {item.display}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => copy(item.display, item.id)}
                        className="rounded-full border border-black/[.085] px-3 py-2 text-[8px] font-semibold text-black/31 transition hover:bg-[#22231f] hover:text-white sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                      >
                        {copied === item.id ? "✓" : "复制"}
                      </button>

                      <button
                        type="button"
                        onClick={() => remove(item.id)}
                        className="rounded-full px-3 py-2 text-[8px] font-semibold text-[#965744] transition hover:bg-[#965744]/8"
                      >
                        删除
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="uuid-intro mt-12 grid gap-8 border-t border-black/10 pt-7 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              UUID V4
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              UUID v4 使用浏览器原生 crypto.randomUUID 生成，适合通用唯一标识和测试数据。
            </p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              OTHER IDS
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              Compact、Hex 和 Nano 风格 ID 基于 crypto.getRandomValues，适合更短或更好复制的临时标识。
            </p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              NOT TOKENS
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              这些 ID 适合标识和测试，不建议直接当作登录令牌、长期密钥或权限凭证使用。
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
