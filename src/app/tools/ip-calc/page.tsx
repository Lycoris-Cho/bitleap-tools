"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

interface IpResult {
  ip: string
  prefix: number
  mask: string
  wildcard: string
  cidr: string
  network: string
  broadcast: string
  firstUsable: string
  lastUsable: string
  totalHosts: number
  usableHosts: number
  hostBits: number
  networkBits: string
  hostBinary: string
  ipBinary: string
  maskBinary: string
  position: number
  category: string
  categoryDetail: string
}

const QUICK_PREFIXES = [8, 16, 24, 30, 31, 32]

function parseIpv4(input: string): { value: number; normalized: string } | null {
  const raw = input.trim()
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(raw)) return null

  const parts = raw.split(".").map(Number)
  if (parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return null
  }

  const value =
    (((parts[0] << 24) >>> 0) |
      (parts[1] << 16) |
      (parts[2] << 8) |
      parts[3]) >>>
    0

  return { value, normalized: parts.join(".") }
}

function uintToIp(value: number) {
  return [
    (value >>> 24) & 255,
    (value >>> 16) & 255,
    (value >>> 8) & 255,
    value & 255,
  ].join(".")
}

function prefixToMaskUint(prefix: number) {
  if (prefix <= 0) return 0
  if (prefix >= 32) return 0xffffffff >>> 0
  return (0xffffffff << (32 - prefix)) >>> 0
}

function uintToBinary(value: number) {
  return [24, 16, 8, 0]
    .map((shift) => ((value >>> shift) & 255).toString(2).padStart(8, "0"))
    .join(".")
}

function compactNumber(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    notation: value >= 1000000 ? "compact" : "standard",
    maximumFractionDigits: 2,
  }).format(value)
}

function classifyIpv4(ip: number) {
  const a = (ip >>> 24) & 255
  const b = (ip >>> 16) & 255
  const c = (ip >>> 8) & 255

  if (a === 10) return ["私有地址", "RFC 1918 · 10.0.0.0/8"]
  if (a === 172 && b >= 16 && b <= 31) {
    return ["私有地址", "RFC 1918 · 172.16.0.0/12"]
  }
  if (a === 192 && b === 168) {
    return ["私有地址", "RFC 1918 · 192.168.0.0/16"]
  }
  if (a === 127) return ["环回地址", "Loopback · 127.0.0.0/8"]
  if (a === 169 && b === 254) {
    return ["链路本地", "Link-local · 169.254.0.0/16"]
  }
  if (a === 100 && b >= 64 && b <= 127) {
    return ["运营商级 NAT", "CGNAT · 100.64.0.0/10"]
  }
  if (a >= 224 && a <= 239) return ["组播地址", "Multicast · 224.0.0.0/4"]
  if (a >= 240) return ["保留地址", "Reserved · 240.0.0.0/4"]
  if (a === 0) return ["特殊用途", "This network · 0.0.0.0/8"]
  if (
    (a === 192 && b === 0 && c === 2) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113)
  ) {
    return ["文档示例地址", "Documentation range"]
  }
  if (a === 198 && (b === 18 || b === 19)) {
    return ["基准测试地址", "Benchmarking · 198.18.0.0/15"]
  }

  return ["公网地址", "Global unicast / other"]
}

function buildResult(ipInput: string, prefixInput: string) {
  const prefix = Number(prefixInput)

  if (
    prefixInput.trim() === "" ||
    !Number.isInteger(prefix) ||
    prefix < 0 ||
    prefix > 32
  ) {
    return {
      result: null as IpResult | null,
      error: "CIDR 前缀必须是 0–32 之间的整数。",
    }
  }

  const parsed = parseIpv4(ipInput)
  if (!parsed) {
    return {
      result: null as IpResult | null,
      error: "IPv4 格式不正确。请输入四段 0–255 的数字，例如 192.168.1.10。",
    }
  }

  const maskUint = prefixToMaskUint(prefix)
  const wildcardUint = (~maskUint) >>> 0
  const networkUint = (parsed.value & maskUint) >>> 0
  const broadcastUint = (networkUint | wildcardUint) >>> 0
  const hostBits = 32 - prefix
  const totalHosts = 2 ** hostBits

  let usableHosts = totalHosts
  let firstUsableUint = networkUint
  let lastUsableUint = broadcastUint

  if (prefix < 31) {
    usableHosts = Math.max(0, totalHosts - 2)
    firstUsableUint = (networkUint + 1) >>> 0
    lastUsableUint = (broadcastUint - 1) >>> 0
  }

  const [category, categoryDetail] = classifyIpv4(parsed.value)
  const span = broadcastUint - networkUint
  const position =
    span <= 0 ? 0.5 : (parsed.value - networkUint) / Math.max(1, span)

  const fullBinary = parsed.value.toString(2).padStart(32, "0")
  const networkBits = fullBinary.slice(0, prefix)
  const hostBinary = fullBinary.slice(prefix)

  const result: IpResult = {
    ip: parsed.normalized,
    prefix,
    mask: uintToIp(maskUint),
    wildcard: uintToIp(wildcardUint),
    cidr: `${uintToIp(networkUint)}/${prefix}`,
    network: uintToIp(networkUint),
    broadcast:
      prefix >= 31
        ? prefix === 31
          ? "无传统广播（/31）"
          : "无传统广播（/32）"
        : uintToIp(broadcastUint),
    firstUsable: uintToIp(firstUsableUint),
    lastUsable: uintToIp(lastUsableUint),
    totalHosts,
    usableHosts,
    hostBits,
    networkBits,
    hostBinary,
    ipBinary: uintToBinary(parsed.value),
    maskBinary: uintToBinary(maskUint),
    position,
    category,
    categoryDetail,
  }

  return { result, error: "" }
}

export default function IPCalcPage() {
  const [ipInput, setIpInput] = useState("192.168.1.10")
  const [prefixInput, setPrefixInput] = useState("24")
  const [copied, setCopied] = useState<string | null>(null)

  const pageRef = useRef<HTMLDivElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const markerRef = useRef<HTMLDivElement>(null)

  const { result, error } = useMemo(
    () => buildResult(ipInput, prefixInput),
    [ipInput, prefixInput],
  )

  useEffect(() => {
    if (
      !pageRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    const ctx = gsap.context(() => {
      gsap.from(".ip-intro", {
        y: 22,
        opacity: 0,
        duration: 0.8,
        stagger: 0.065,
        ease: "power3.out",
      })

      gsap.to(".ip-orbit-a", {
        rotation: 360,
        duration: 54,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })

      gsap.to(".ip-orbit-b", {
        rotation: -360,
        duration: 82,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })
    }, pageRef)

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (
      !result ||
      !resultRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".ip-result-reveal",
        { y: 10, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.42,
          stagger: 0.035,
          ease: "power2.out",
        },
      )

      if (markerRef.current) {
        gsap.fromTo(
          markerRef.current,
          { scale: 0.6, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 0.46,
            ease: "back.out(1.8)",
          },
        )
      }
    }, resultRef)

    return () => ctx.revert()
  }, [result?.cidr, result?.ip])

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {}
  }

  const copySummary = async () => {
    if (!result) return

    const summary = [
      `IP: ${result.ip}`,
      `CIDR: ${result.cidr}`,
      `Subnet Mask: ${result.mask}`,
      `Wildcard: ${result.wildcard}`,
      `Network: ${result.network}`,
      `Broadcast: ${result.broadcast}`,
      `Usable Range: ${result.firstUsable} - ${result.lastUsable}`,
      `Total IPs: ${result.totalHosts}`,
      `Usable Hosts: ${result.usableHosts}`,
    ].join("\n")

    await copy(summary, "全部")
  }

  const prefix = Number(prefixInput)
  const validPrefix =
    Number.isInteger(prefix) && prefix >= 0 && prefix <= 32

  const primaryRows = result
    ? [
        ["网络地址", result.network],
        ["首个可用 IP", result.firstUsable],
        ["末尾可用 IP", result.lastUsable],
        ["广播地址", result.broadcast],
      ]
    : []

  const technicalRows = result
    ? [
        ["子网掩码", result.mask],
        ["Wildcard", result.wildcard],
        ["CIDR", result.cidr],
        ["Host bits", String(result.hostBits)],
      ]
    : []

  return (
    <div
      ref={pageRef}
      className="min-h-screen overflow-hidden bg-[#efede6] text-[#22231f] selection:bg-[#22231f] selection:text-white"
    >
      <style>{`
        .ip-num { font-variant-numeric: tabular-nums lining-nums; }
        .ip-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
        .ip-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,.13); }
        .ip-range { appearance: none; height: 2px; background: rgba(34,35,31,.14); border-radius: 999px; }
        .ip-range::-webkit-slider-thumb { appearance: none; width: 14px; height: 14px; border-radius: 999px; background: #22231f; cursor: pointer; }
        .ip-range::-moz-range-thumb { width: 14px; height: 14px; border: 0; border-radius: 999px; background: #22231f; cursor: pointer; }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_14%,rgba(178,151,91,.12),transparent_27%),radial-gradient(circle_at_8%_86%,rgba(73,107,91,.09),transparent_31%)]" />
        <div className="ip-orbit-a absolute right-[-19vw] top-[-23vw] h-[57vw] w-[57vw] rounded-full border border-black/[.045]">
          <span className="absolute left-[15%] top-[44%] h-2 w-2 rounded-full bg-[#b28d48]/40" />
        </div>
        <div className="ip-orbit-b absolute bottom-[-24vw] left-[-19vw] h-[52vw] w-[52vw] rounded-full border border-black/[.035]">
          <span className="absolute right-[14%] top-[31%] h-1.5 w-1.5 rounded-full bg-[#52685d]/38" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1480px] px-5 pb-10 pt-6 sm:px-8">
        <div className="ip-intro flex items-center justify-between gap-4">
          <Breadcrumb />
          <div className="hidden text-[9px] tracking-[.14em] text-black/25 sm:block">
            IPV4 / CIDR · LIVE CALCULATION
          </div>
        </div>

        <header className="ip-intro mt-12 grid gap-8 border-b border-black/10 pb-9 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/27">
              IP SUBNET CALCULATOR
            </div>
            <h1 className="mt-4 max-w-[850px] text-[clamp(48px,6.7vw,96px)] font-semibold leading-[.9] tracking-[-.073em]">
              一眼看清，
              <br />
              这个网段。
            </h1>
          </div>

          <p className="max-w-[520px] text-[11px] leading-6 text-black/39">
            输入 IPv4 和 CIDR 前缀，实时查看网络地址、主机范围、广播地址、掩码和二进制结构。没有提交按钮，输入就是计算。
          </p>
        </header>

        <section className="ip-intro py-7">
          <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="mb-3 text-[9px] font-semibold tracking-[.14em] text-black/27">
                ADDRESS
              </div>

              <div className="flex min-w-0 items-baseline border-b border-black/15 pb-3">
                <input
                  value={ipInput}
                  onChange={(event) => setIpInput(event.target.value)}
                  spellCheck={false}
                  inputMode="decimal"
                  aria-label="IPv4 地址"
                  className="ip-num min-w-0 flex-1 bg-transparent font-mono text-[clamp(28px,5vw,66px)] font-medium tracking-[-.055em] outline-none placeholder:text-black/16"
                  placeholder="192.168.1.10"
                />

                <span className="mx-2 text-[clamp(28px,5vw,62px)] font-light text-black/18">
                  /
                </span>

                <input
                  value={prefixInput}
                  onChange={(event) =>
                    setPrefixInput(event.target.value.replace(/[^\d]/g, "").slice(0, 2))
                  }
                  inputMode="numeric"
                  aria-label="CIDR 前缀"
                  className="ip-num w-[1.7em] bg-transparent font-mono text-[clamp(28px,5vw,66px)] font-medium tracking-[-.055em] outline-none placeholder:text-black/16"
                  placeholder="24"
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {QUICK_PREFIXES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPrefixInput(String(value))}
                    className={`rounded-full px-3 py-2 text-[9px] font-semibold transition ${
                      prefixInput === String(value)
                        ? "bg-[#22231f] text-white"
                        : "border border-black/10 text-black/36 hover:bg-white/35 hover:text-black"
                    }`}
                  >
                    /{value}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-w-[260px]">
              <div className="mb-3 flex items-center justify-between text-[9px] text-black/28">
                <span>NETWORK</span>
                <span>HOST</span>
              </div>

              <input
                type="range"
                min={0}
                max={32}
                value={validPrefix ? prefix : 24}
                onChange={(event) => setPrefixInput(event.target.value)}
                className="ip-range block w-full"
              />

              <div className="mt-2 flex justify-between text-[8px] text-black/22">
                <span>/0</span>
                <span>/16</span>
                <span>/32</span>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="ip-intro border-y border-[#9a513f]/20 bg-[#9a513f]/[.035] px-1 py-4 text-[10px] font-medium text-[#8d4b3b]">
            {error}
          </div>
        )}

        {result && (
          <div ref={resultRef}>
            <section className="ip-result-reveal mt-4 grid gap-8 lg:grid-cols-[1.2fr_.8fr] lg:items-start">
              <div>
                <div className="flex flex-wrap items-end justify-between gap-5">
                  <div>
                    <div className="text-[9px] font-semibold tracking-[.14em] text-black/25">
                      NETWORK IDENTITY
                    </div>

                    <div className="ip-num mt-3 font-mono text-[clamp(34px,5.6vw,76px)] font-medium leading-none tracking-[-.06em]">
                      {result.cidr}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[8px] text-black/24">
                      ADDRESS TYPE
                    </div>
                    <div className="mt-1 text-sm font-semibold">
                      {result.category}
                    </div>
                    <div className="mt-1 text-[8px] text-black/28">
                      {result.categoryDetail}
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <div className="relative h-[68px]">
                    <div className="absolute left-0 right-0 top-7 h-px bg-black/15" />
                    <div className="absolute left-0 top-[22px] h-[11px] w-px bg-black/30" />
                    <div className="absolute right-0 top-[22px] h-[11px] w-px bg-black/30" />

                    <div
                      ref={markerRef}
                      className="absolute top-[18px] h-5 w-5 -translate-x-1/2 rounded-full border-[5px] border-[#efede6] bg-[#22231f] shadow-[0_3px_12px_rgba(0,0,0,.16)]"
                      style={{
                        left: `${Math.max(1, Math.min(99, result.position * 100))}%`,
                      }}
                    />

                    <span className="absolute bottom-0 left-0 font-mono text-[9px] text-black/37">
                      {result.network}
                    </span>
                    <span className="absolute bottom-0 right-0 font-mono text-[9px] text-black/37">
                      {result.prefix < 31
                        ? uintToIp(
                            (parseIpv4(result.network)!.value |
                              (~prefixToMaskUint(result.prefix) >>> 0)) >>>
                              0,
                          )
                        : result.lastUsable}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center justify-between gap-4 text-[8px] text-black/24">
                    <span>NETWORK</span>
                    <span>当前 IP 在网段中的位置</span>
                    <span>END</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[24px] bg-black/[.075]">
                <div className="bg-[#f2f0e9] p-5">
                  <div className="text-[8px] tracking-[.12em] text-black/25">
                    TOTAL IPS
                  </div>
                  <div className="ip-num mt-3 text-3xl font-semibold tracking-[-.05em]">
                    {compactNumber(result.totalHosts)}
                  </div>
                </div>

                <div className="bg-[#f2f0e9] p-5">
                  <div className="text-[8px] tracking-[.12em] text-black/25">
                    USABLE HOSTS
                  </div>
                  <div className="ip-num mt-3 text-3xl font-semibold tracking-[-.05em]">
                    {compactNumber(result.usableHosts)}
                  </div>
                </div>

                <div className="bg-[#f2f0e9] p-5">
                  <div className="text-[8px] tracking-[.12em] text-black/25">
                    NETWORK BITS
                  </div>
                  <div className="ip-num mt-3 text-3xl font-semibold tracking-[-.05em]">
                    {result.prefix}
                  </div>
                </div>

                <div className="bg-[#f2f0e9] p-5">
                  <div className="text-[8px] tracking-[.12em] text-black/25">
                    HOST BITS
                  </div>
                  <div className="ip-num mt-3 text-3xl font-semibold tracking-[-.05em]">
                    {result.hostBits}
                  </div>
                </div>
              </div>
            </section>

            <section className="ip-result-reveal mt-12 border-t border-black/10 pt-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-[9px] font-semibold tracking-[.14em] text-black/25">
                    RANGE
                  </div>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-.04em]">
                    地址范围
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={copySummary}
                  className="rounded-full border border-black/10 px-4 py-2.5 text-[9px] font-semibold text-black/40 transition hover:bg-white/40 hover:text-black"
                >
                  {copied === "全部" ? "✓ 已复制" : "复制全部"}
                </button>
              </div>

              <div className="mt-5 grid gap-x-8 md:grid-cols-2">
                {primaryRows.map(([label, value]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => copy(value, label)}
                    className="group grid grid-cols-[1fr_auto] items-center gap-4 border-b border-black/[.075] py-4 text-left"
                  >
                    <div>
                      <div className="text-[8px] font-semibold tracking-[.1em] text-black/26">
                        {label}
                      </div>
                      <div className="ip-num mt-2 break-all font-mono text-[clamp(16px,2vw,23px)] font-medium tracking-[-.03em]">
                        {value}
                      </div>
                    </div>

                    <span className="text-[9px] text-black/20 transition group-hover:text-black/55">
                      {copied === label ? "✓" : "COPY"}
                    </span>
                  </button>
                ))}
              </div>

              {result.prefix >= 31 && (
                <div className="mt-4 text-[9px] leading-5 text-black/34">
                  {result.prefix === 31
                    ? "/31 常用于点对点链路：两个地址都可作为端点使用，没有传统意义上的网络地址与广播地址。"
                    : "/32 表示单个主机路由：仅包含当前这一个 IPv4 地址。"}
                </div>
              )}
            </section>

            <section className="ip-result-reveal mt-12 grid gap-10 border-t border-black/10 pt-7 lg:grid-cols-[.72fr_1.28fr]">
              <div>
                <div className="text-[9px] font-semibold tracking-[.14em] text-black/25">
                  SUBNET DETAILS
                </div>
                <h2 className="mt-2 max-w-[380px] text-[clamp(30px,4vw,48px)] font-semibold leading-[.98] tracking-[-.055em]">
                  掩码不只是
                  <br />
                  255.255.255.0
                </h2>

                <p className="mt-5 max-w-[390px] text-[10px] leading-5 text-black/34">
                  CIDR 的本质是把 32 位 IPv4 切成网络位与主机位。右边用二进制直接展示这条边界。
                </p>
              </div>

              <div>
                <div className="grid gap-x-7 sm:grid-cols-2">
                  {technicalRows.map(([label, value]) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => copy(value, label)}
                      className="group border-b border-black/[.075] py-4 text-left"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[8px] font-semibold tracking-[.1em] text-black/25">
                          {label}
                        </span>
                        <span className="text-[8px] text-black/18 group-hover:text-black/45">
                          {copied === label ? "✓" : "COPY"}
                        </span>
                      </div>
                      <div className="ip-num mt-2 break-all font-mono text-sm font-medium">
                        {value}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-7">
                  <div className="mb-3 flex items-center justify-between text-[8px] text-black/25">
                    <span>IP · BINARY</span>
                    <span>
                      {result.prefix} NETWORK / {result.hostBits} HOST
                    </span>
                  </div>

                  <div className="ip-scroll overflow-x-auto border-y border-black/10 py-5">
                    <div className="min-w-[660px] whitespace-nowrap font-mono text-[14px] tracking-[.08em]">
                      <span className="rounded bg-[#52685d]/10 px-1 py-2 text-[#385649]">
                        {result.networkBits || "∅"}
                      </span>
                      <span className="rounded bg-[#b18d48]/10 px-1 py-2 text-[#8e6e33]">
                        {result.hostBinary || "∅"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 text-[8px] text-black/28 sm:grid-cols-2">
                    <span className="font-mono">IP&nbsp;&nbsp;&nbsp; {result.ipBinary}</span>
                    <span className="font-mono">MASK&nbsp; {result.maskBinary}</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="ip-result-reveal mt-12 border-t border-black/10 pt-6">
              <div className="grid gap-6 md:grid-cols-3">
                <div>
                  <div className="text-[8px] font-semibold tracking-[.1em] text-black/25">
                    /31
                  </div>
                  <p className="mt-2 text-[9px] leading-5 text-black/35">
                    点对点链路可使用两个地址，不扣除传统 network / broadcast。
                  </p>
                </div>

                <div>
                  <div className="text-[8px] font-semibold tracking-[.1em] text-black/25">
                    /32
                  </div>
                  <p className="mt-2 text-[9px] leading-5 text-black/35">
                    单主机路由，仅包含一个 IPv4 地址。
                  </p>
                </div>

                <div>
                  <div className="text-[8px] font-semibold tracking-[.1em] text-black/25">
                    /0–/30
                  </div>
                  <p className="mt-2 text-[9px] leading-5 text-black/35">
                    通常首地址为网络地址、末地址为广播地址，可用主机数为总数减 2。
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}

        <div className="mt-14 border-t border-black/[.08] pt-5">
          <FooterNote />
        </div>
      </div>
    </div>
  )
}
