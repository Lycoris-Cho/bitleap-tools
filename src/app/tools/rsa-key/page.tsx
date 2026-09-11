"use client"

import type { ChangeEvent } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type Purpose = "oaep" | "pss"
type ModulusLength = 2048 | 3072 | 4096
type HashName = "SHA-256" | "SHA-384" | "SHA-512"
type CopyKey = "private" | "public" | "privateJwk" | "publicJwk" | "bundle" | "fingerprint" | "test" | null

type GeneratedMeta = {
  purpose: Purpose
  modulusLength: ModulusLength
  hash: HashName
  publicFingerprint: string
  generatedAt: string
  durationMs: number
  privateLength: number
  publicLength: number
}

type GeneratedKeys = {
  privatePem: string
  publicPem: string
  privateJwk: string
  publicJwk: string
  pair: CryptoKeyPair
  meta: GeneratedMeta
}

const PURPOSES: Array<{
  value: Purpose
  label: string
  title: string
  desc: string
}> = [
  {
    value: "oaep",
    label: "RSA-OAEP",
    title: "加密 / 解密",
    desc: "适合做小段数据加密测试，WebCrypto 用途为 encrypt / decrypt。",
  },
  {
    value: "pss",
    label: "RSA-PSS",
    title: "签名 / 验签",
    desc: "适合做消息签名测试，WebCrypto 用途为 sign / verify。",
  },
]

const HASHES: HashName[] = ["SHA-256", "SHA-384", "SHA-512"]
const MODULUS_OPTIONS: ModulusLength[] = [2048, 3072, 4096]

const SAMPLE_MESSAGE = "BitLeap RSA Studio\nTiny tools, Big leap."

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value)
}

function humanBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function getHashBytes(hash: HashName) {
  if (hash === "SHA-256") return 32
  if (hash === "SHA-384") return 48
  return 64
}

function getOaepMaxPayloadBytes(modulusLength: ModulusLength, hash: HashName) {
  return modulusLength / 8 - 2 * getHashBytes(hash) - 2
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  const chunkSize = 0x8000

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

function pemFromBuffer(buffer: ArrayBuffer, label: string) {
  const base64 = arrayBufferToBase64(buffer)
  const lines = base64.match(/.{1,64}/g) ?? []

  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----`
}

function bufferToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

function formatFingerprint(hex: string) {
  return hex.match(/.{1,2}/g)?.join(":") ?? hex
}

function base64FromBytes(bytes: Uint8Array) {
  let binary = ""
  const chunkSize = 0x8000

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }

  return btoa(binary)
}

function downloadText(content: string, filename: string) {
  if (!content) return

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

async function generateRsaKey(options: {
  purpose: Purpose
  modulusLength: ModulusLength
  hash: HashName
}): Promise<GeneratedKeys> {
  const algorithmName =
    options.purpose === "oaep" ? "RSA-OAEP" : "RSA-PSS"

  const usages: KeyUsage[] =
    options.purpose === "oaep"
      ? ["encrypt", "decrypt"]
      : ["sign", "verify"]

  const started = performance.now()

  const pair = (await crypto.subtle.generateKey(
    {
      name: algorithmName,
      modulusLength: options.modulusLength,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: options.hash,
    },
    true,
    usages,
  )) as CryptoKeyPair

  const [privateBuffer, publicBuffer, privateJwk, publicJwk] = await Promise.all([
    crypto.subtle.exportKey("pkcs8", pair.privateKey),
    crypto.subtle.exportKey("spki", pair.publicKey),
    crypto.subtle.exportKey("jwk", pair.privateKey),
    crypto.subtle.exportKey("jwk", pair.publicKey),
  ])

  const publicFingerprint = formatFingerprint(
    bufferToHex(await crypto.subtle.digest("SHA-256", publicBuffer)),
  )

  const privatePem = pemFromBuffer(privateBuffer, "PRIVATE KEY")
  const publicPem = pemFromBuffer(publicBuffer, "PUBLIC KEY")
  const durationMs = performance.now() - started

  return {
    privatePem,
    publicPem,
    privateJwk: JSON.stringify(privateJwk, null, 2),
    publicJwk: JSON.stringify(publicJwk, null, 2),
    pair,
    meta: {
      purpose: options.purpose,
      modulusLength: options.modulusLength,
      hash: options.hash,
      publicFingerprint,
      generatedAt: new Intl.DateTimeFormat("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date()),
      durationMs,
      privateLength: privatePem.length,
      publicLength: publicPem.length,
    },
  }
}

function KeyPanel({
  title,
  label,
  value,
  copied,
  masked = false,
  onCopy,
  onDownload,
}: {
  title: string
  label: string
  value: string
  copied: boolean
  masked?: boolean
  onCopy: () => void
  onDownload: () => void
}) {
  return (
    <div className="min-w-0 bg-[#151714]">
      <div className="flex h-12 items-center justify-between border-b border-white/[.065] px-5">
        <div>
          <div className="text-[8px] font-semibold tracking-[.13em] text-white/27">{title}</div>
          <div className="mt-0.5 text-[7px] text-white/15">{label}</div>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={onDownload} disabled={!value} className="text-[8px] font-semibold text-white/27 transition hover:text-white disabled:opacity-20">DOWNLOAD</button>
          <button type="button" onClick={onCopy} disabled={!value} className="text-[8px] font-semibold text-white/27 transition hover:text-white disabled:opacity-20">{copied ? "✓ COPIED" : "COPY"}</button>
        </div>
      </div>

      <pre className={`rsa-dark-scroll h-[460px] overflow-auto whitespace-pre-wrap break-all p-5 font-mono text-[10px] leading-6 text-[#cbd8cd] sm:p-6 ${masked ? "select-none blur-[3px]" : ""}`}>
        {value || "生成密钥后会显示在这里。"}
      </pre>
    </div>
  )
}

export default function RsaKeyPage() {
  const [purpose, setPurpose] = useState<Purpose>("oaep")
  const [modulusLength, setModulusLength] = useState<ModulusLength>(2048)
  const [hash, setHash] = useState<HashName>("SHA-256")
  const [privatePem, setPrivatePem] = useState("")
  const [publicPem, setPublicPem] = useState("")
  const [privateJwk, setPrivateJwk] = useState("")
  const [publicJwk, setPublicJwk] = useState("")
  const [keyPair, setKeyPair] = useState<CryptoKeyPair | null>(null)
  const [meta, setMeta] = useState<GeneratedMeta | null>(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const [copied, setCopied] = useState<CopyKey>(null)
  const [showJwk, setShowJwk] = useState(false)
  const [privateVisible, setPrivateVisible] = useState(true)
  const [testMessage, setTestMessage] = useState(SAMPLE_MESSAGE)
  const [testOutput, setTestOutput] = useState("")

  const pageRef = useRef<HTMLDivElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  const activePurpose = PURPOSES.find((item) => item.value === purpose) ?? PURPOSES[0]
  const hasKeys = Boolean(privatePem && publicPem && meta)
  const settingsChanged = Boolean(meta && (meta.purpose !== purpose || meta.modulusLength !== modulusLength || meta.hash !== hash))
  const maxPayload = getOaepMaxPayloadBytes(modulusLength, hash)
  const currentBundle = useMemo(
    () =>
      [
        "# BitLeap RSA Key Pair",
        "",
        `Purpose: ${meta?.purpose === "oaep" ? "RSA-OAEP encrypt/decrypt" : "RSA-PSS sign/verify"}`,
        `Modulus: ${meta?.modulusLength ?? modulusLength} bit`,
        `Hash: ${meta?.hash ?? hash}`,
        `Public fingerprint SHA-256: ${meta?.publicFingerprint ?? "not generated"}`,
        "",
        publicPem || "PUBLIC KEY NOT GENERATED",
        "",
        privatePem || "PRIVATE KEY NOT GENERATED",
      ].join("\n"),
    [hash, meta, modulusLength, privatePem, publicPem],
  )

  useEffect(() => {
    if (!pageRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      gsap.from(".rsa-intro", {
        y: 22,
        opacity: 0,
        duration: 0.78,
        stagger: 0.055,
        ease: "power3.out",
      })

      gsap.to(".rsa-orbit-a", {
        rotation: 360,
        duration: 70,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })

      gsap.to(".rsa-orbit-b", {
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
    if (!outputRef.current || !hasKeys || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    gsap.fromTo(
      outputRef.current,
      { opacity: 0.62, y: 6 },
      {
        opacity: 1,
        y: 0,
        duration: 0.26,
        ease: "power2.out",
        overwrite: true,
      },
    )
  }, [hasKeys, privatePem, publicPem])

  const handleGen = async () => {
    setLoading(true)
    setStatus("正在生成密钥，请稍候…")
    setError("")
    setCopied(null)
    setTestOutput("")
    setPrivatePem("")
    setPublicPem("")
    setPrivateJwk("")
    setPublicJwk("")
    setKeyPair(null)
    setMeta(null)

    try {
      const generated = await generateRsaKey({
        purpose,
        modulusLength,
        hash,
      })

      setPrivatePem(generated.privatePem)
      setPublicPem(generated.publicPem)
      setPrivateJwk(generated.privateJwk)
      setPublicJwk(generated.publicJwk)
      setKeyPair(generated.pair)
      setMeta(generated.meta)
      setPrivateVisible(true)
      setStatus("密钥已生成")
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "RSA 密钥生成失败")
      setStatus("生成失败")
    } finally {
      setLoading(false)
    }
  }

  const copy = async (text: string, key: CopyKey) => {
    if (!text) return

    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {}
  }

  const runSelfTest = async () => {
    if (!keyPair || !meta) {
      setTestOutput("请先生成密钥。")
      return
    }

    setError("")
    setTestOutput("正在运行自检…")

    try {
      const encoded = new TextEncoder().encode(testMessage)

      if (meta.purpose === "oaep") {
        const limit = getOaepMaxPayloadBytes(meta.modulusLength, meta.hash)

        if (encoded.length > limit) {
          setTestOutput(`测试文本过长。当前 ${meta.modulusLength} bit / ${meta.hash} 的 RSA-OAEP 单次明文上限约为 ${limit} bytes。`)
          return
        }

        const encrypted = await crypto.subtle.encrypt(
          {
            name: "RSA-OAEP",
          },
          keyPair.publicKey,
          encoded,
        )

        const decrypted = await crypto.subtle.decrypt(
          {
            name: "RSA-OAEP",
          },
          keyPair.privateKey,
          encrypted,
        )

        setTestOutput(
          [
            "RSA-OAEP 自检通过",
            "",
            `明文 bytes：${encoded.length}`,
            `密文 bytes：${encrypted.byteLength}`,
            "",
            "Encrypted Base64:",
            base64FromBytes(new Uint8Array(encrypted)),
            "",
            "Decrypted:",
            new TextDecoder().decode(decrypted),
          ].join("\n"),
        )

        return
      }

      const saltLength = getHashBytes(meta.hash)
      const signature = await crypto.subtle.sign(
        {
          name: "RSA-PSS",
          saltLength,
        },
        keyPair.privateKey,
        encoded,
      )

      const verified = await crypto.subtle.verify(
        {
          name: "RSA-PSS",
          saltLength,
        },
        keyPair.publicKey,
        signature,
        encoded,
      )

      setTestOutput(
        [
          verified ? "RSA-PSS 签名自检通过" : "RSA-PSS 验签失败",
          "",
          `消息 bytes：${encoded.length}`,
          `签名 bytes：${signature.byteLength}`,
          `saltLength：${saltLength}`,
          "",
          "Signature Base64:",
          base64FromBytes(new Uint8Array(signature)),
        ].join("\n"),
      )
    } catch (runError) {
      setTestOutput(runError instanceof Error ? runError.message : "自检失败")
    }
  }

  const handleFileImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()

    reader.onload = () => {
      const content = String(reader.result ?? "")
      if (content.includes("PRIVATE KEY")) {
        setPrivatePem(content)
        setStatus("已载入私钥文本，仅用于复制 / 下载展示，不能直接进行 WebCrypto 自检。")
      } else if (content.includes("PUBLIC KEY")) {
        setPublicPem(content)
        setStatus("已载入公钥文本，仅用于复制 / 下载展示，不能直接进行 WebCrypto 自检。")
      } else {
        setError("未识别到 PEM PRIVATE KEY 或 PUBLIC KEY。")
      }
    }

    reader.readAsText(file)
    event.target.value = ""
  }

  return (
    <div ref={pageRef} className="min-h-screen overflow-hidden bg-[#efede6] text-[#22231f] selection:bg-[#22231f] selection:text-white">
      <style>{`
        .rsa-scroll::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }

        .rsa-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .rsa-scroll::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(34,35,31,.13);
        }

        .rsa-dark-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,.14);
        }

        .rsa-grid {
          background-image:
            linear-gradient(rgba(34,35,31,.032) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,35,31,.032) 1px, transparent 1px);
          background-size: 30px 30px;
        }

        .rsa-num {
          font-variant-numeric: tabular-nums lining-nums;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_9%,rgba(178,151,91,.10),transparent_27%),radial-gradient(circle_at_8%_88%,rgba(73,107,91,.08),transparent_31%)]" />
        <div className="rsa-orbit-a absolute right-[-20vw] top-[-24vw] h-[58vw] w-[58vw] rounded-full border border-black/[.04]">
          <span className="absolute left-[15%] top-[43%] h-2 w-2 rounded-full bg-[#b28d48]/38" />
        </div>
        <div className="rsa-orbit-b absolute bottom-[-26vw] left-[-19vw] h-[53vw] w-[53vw] rounded-full border border-black/[.032]">
          <span className="absolute right-[14%] top-[31%] h-1.5 w-1.5 rounded-full bg-[#52685d]/35" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1580px] px-5 pb-10 pt-6 sm:px-8">
        <div className="rsa-intro">
          <Breadcrumb />
        </div>

        <header className="rsa-intro mt-8 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/27">RSA KEY STUDIO</div>
            <h1 className="mt-4 max-w-[900px] text-[clamp(48px,6.35vw,90px)] font-semibold leading-[1.03] tracking-[-.055em]">
              在本地，
              <br />
              生成一对密钥。
            </h1>
          </div>

          <div>
            <p className="max-w-[560px] text-[11px] leading-6 text-black/40">
              使用浏览器 WebCrypto 生成 RSA-OAEP 或 RSA-PSS 密钥对，导出 PKCS#8 私钥、SPKI 公钥和 JWK，并提供指纹、自检、复制与下载。
            </p>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[8px] text-black/25">
              <span>WEBCRYPTO</span>
              <span>PEM / JWK</span>
              <span>LOCAL ONLY</span>
              <span>{purpose === "oaep" ? "ENCRYPT / DECRYPT" : "SIGN / VERIFY"}</span>
            </div>
          </div>
        </header>

        <section className="rsa-intro mt-7 grid gap-7 xl:grid-cols-[.66fr_1.34fr]">
          <aside className="min-w-0">
            <div className="rounded-[28px] border border-black/[.075] bg-white/24 p-5">
              <div className="text-[8px] font-semibold tracking-[.14em] text-black/24">KEY SETTINGS</div>
              <h2 className="mt-3 text-[clamp(30px,3.5vw,46px)] font-semibold leading-none tracking-[-.045em]">生成参数。</h2>

              <div className="mt-6 space-y-6">
                <div>
                  <div className="mb-2 text-[8px] font-semibold tracking-[.12em] text-black/24">PURPOSE</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {PURPOSES.map((item) => (
                      <button key={item.value} type="button" onClick={() => setPurpose(item.value)} className={`rounded-[20px] border p-4 text-left transition ${purpose === item.value ? "border-[#22231f]/15 bg-[#22231f] text-white" : "border-black/[.08] bg-white/24 hover:bg-white/48"}`}>
                        <div className={`font-mono text-[9px] font-semibold ${purpose === item.value ? "text-white/72" : "text-black/55"}`}>{item.label}</div>
                        <div className={`mt-2 text-[13px] font-semibold ${purpose === item.value ? "text-white" : "text-black/72"}`}>{item.title}</div>
                        <p className={`mt-2 text-[8px] leading-4 ${purpose === item.value ? "text-white/34" : "text-black/32"}`}>{item.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-[8px] font-semibold tracking-[.12em] text-black/24">MODULUS LENGTH</div>
                  <div className="flex flex-wrap gap-1.5">
                    {MODULUS_OPTIONS.map((bits) => (
                      <button key={bits} type="button" onClick={() => setModulusLength(bits)} className={`rounded-full px-3.5 py-2 text-[8px] font-semibold transition ${modulusLength === bits ? "bg-[#22231f] text-white" : "text-black/32 hover:bg-white/45 hover:text-black"}`}>{bits} bit</button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-[8px] font-semibold tracking-[.12em] text-black/24">HASH</div>
                  <div className="flex flex-wrap gap-1.5">
                    {HASHES.map((item) => (
                      <button key={item} type="button" onClick={() => setHash(item)} className={`rounded-full px-3.5 py-2 text-[8px] font-semibold transition ${hash === item ? "bg-[#52685d] text-white" : "text-black/32 hover:bg-white/45 hover:text-black"}`}>{item}</button>
                    ))}
                  </div>
                </div>

                {purpose === "oaep" && (
                  <div className="rounded-[20px] border border-black/[.07] bg-white/24 p-4">
                    <div className="text-[8px] font-semibold tracking-[.12em] text-black/24">OAEP PAYLOAD LIMIT</div>
                    <div className="rsa-num mt-3 font-mono text-[18px] font-semibold tracking-[-.04em] text-[#52685d]">{maxPayload} bytes</div>
                    <p className="mt-2 text-[8px] leading-5 text-black/30">RSA-OAEP 只适合加密很短的明文；实际文件加密通常用混合加密。</p>
                  </div>
                )}

                <button type="button" onClick={handleGen} disabled={loading} className="w-full rounded-full bg-[#22231f] px-5 py-4 text-[9px] font-semibold text-white transition hover:scale-[1.01] active:scale-[.98] disabled:opacity-35">
                  {loading ? "生成中…" : `生成 ${modulusLength} bit 密钥`}
                </button>

                {settingsChanged && (
                  <p className="text-[8px] leading-5 text-[#965744]">当前显示的密钥使用的是上一次生成参数。点击生成按钮后才会应用新的设置。</p>
                )}
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-[24px] border border-black/[.075] bg-white/24">
              <div className="border-b border-black/[.06] px-5 py-4">
                <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">KEY PROFILE</div>
                <p className="mt-2 text-[9px] leading-5 text-black/35">{status || "等待生成密钥。"}</p>
              </div>

              <div className="grid grid-cols-2 gap-px bg-black/[.06]">
                {[
                  ["用途", meta ? (meta.purpose === "oaep" ? "RSA-OAEP" : "RSA-PSS") : activePurpose.label],
                  ["位数", `${meta?.modulusLength ?? modulusLength} bit`],
                  ["Hash", meta?.hash ?? hash],
                  ["耗时", meta ? `${meta.durationMs.toFixed(0)}ms` : "—"],
                  ["私钥长度", meta ? formatNumber(meta.privateLength) : "—"],
                  ["公钥长度", meta ? formatNumber(meta.publicLength) : "—"],
                ].map(([label, value]) => (
                  <div key={label} className="bg-[#f3f0e8]/92 p-4">
                    <div className="text-[8px] text-black/24">{label}</div>
                    <div className="rsa-num mt-2 break-all font-mono text-[12px] font-semibold text-black/61">{value}</div>
                  </div>
                ))}
              </div>

              {meta && (
                <div className="border-t border-black/[.06] px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[8px] font-semibold tracking-[.12em] text-black/24">PUBLIC SHA-256 FINGERPRINT</div>
                    <button type="button" onClick={() => copy(meta.publicFingerprint, "fingerprint")} className="text-[8px] font-semibold text-black/30 transition hover:text-black">{copied === "fingerprint" ? "✓ COPIED" : "COPY"}</button>
                  </div>
                  <div className="mt-3 break-all font-mono text-[9px] leading-5 text-black/48">{meta.publicFingerprint}</div>
                </div>
              )}

              {error && (
                <div className="border-t border-black/[.06] px-5 py-4">
                  <div className="text-[8px] font-semibold tracking-[.12em] text-[#965744]">ERROR</div>
                  <p className="mt-2 break-words text-[9px] leading-5 text-[#965744]">{error}</p>
                </div>
              )}
            </div>
          </aside>

          <div className="min-w-0">
            <div className="flex flex-col gap-4 border-b border-black/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-[8px] font-semibold tracking-[.14em] text-black/23">KEY OUTPUT</div>
                <h2 className="mt-2 text-[clamp(31px,4vw,48px)] font-semibold leading-none tracking-[-.045em]">{hasKeys ? "PEM 已准备好。" : "等待生成。"}</h2>
              </div>

              <div className="flex flex-wrap gap-2">
                <label className="cursor-pointer rounded-full border border-black/[.085] px-4 py-2.5 text-[8px] font-semibold text-black/35 transition hover:bg-white/45">
                  导入 PEM
                  <input type="file" accept=".pem,.key,.txt" className="hidden" onChange={handleFileImport} />
                </label>

                <button type="button" onClick={() => setPrivateVisible((value) => !value)} disabled={!privatePem} className="rounded-full border border-black/[.085] px-4 py-2.5 text-[8px] font-semibold text-black/35 transition hover:bg-white/45 disabled:opacity-30">
                  {privateVisible ? "隐藏私钥" : "显示私钥"}
                </button>

                <button type="button" onClick={() => setShowJwk((value) => !value)} disabled={!hasKeys} className={`rounded-full px-4 py-2.5 text-[8px] font-semibold transition disabled:opacity-30 ${showJwk ? "bg-[#52685d] text-white" : "border border-black/[.085] text-black/35 hover:bg-white/45"}`}>
                  {showJwk ? "显示 PEM" : "显示 JWK"}
                </button>
              </div>
            </div>

            <div ref={outputRef} className="mt-5 grid gap-px overflow-hidden rounded-[30px] border border-black/[.08] bg-black/[.08] lg:grid-cols-2">
              {showJwk ? (
                <>
                  <KeyPanel title="PRIVATE JWK" label="JSON Web Key" value={privateJwk} copied={copied === "privateJwk"} masked={!privateVisible && Boolean(privateJwk)} onCopy={() => copy(privateJwk, "privateJwk")} onDownload={() => downloadText(privateJwk, "rsa-private.jwk.json")} />
                  <KeyPanel title="PUBLIC JWK" label="JSON Web Key" value={publicJwk} copied={copied === "publicJwk"} onCopy={() => copy(publicJwk, "publicJwk")} onDownload={() => downloadText(publicJwk, "rsa-public.jwk.json")} />
                </>
              ) : (
                <>
                  <KeyPanel title="PRIVATE KEY" label="PKCS#8 PEM" value={privatePem} copied={copied === "private"} masked={!privateVisible && Boolean(privatePem)} onCopy={() => copy(privatePem, "private")} onDownload={() => downloadText(privatePem, "rsa-private-key.pem")} />
                  <KeyPanel title="PUBLIC KEY" label="SPKI PEM" value={publicPem} copied={copied === "public"} onCopy={() => copy(publicPem, "public")} onDownload={() => downloadText(publicPem, "rsa-public-key.pem")} />
                </>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-[8px] text-black/25">
                <span>{hasKeys ? "key generated" : "no key"}</span>
                <span>{meta ? meta.generatedAt : "local only"}</span>
                <span>{meta ? humanBytes(new TextEncoder().encode(currentBundle).length) : "—"}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => copy(currentBundle, "bundle")} disabled={!hasKeys} className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white transition hover:scale-[1.01] active:scale-[.98] disabled:opacity-30">{copied === "bundle" ? "✓ 已复制全部" : "复制密钥包"}</button>
                <button type="button" onClick={() => downloadText(currentBundle, "bitleap-rsa-keypair.txt")} disabled={!hasKeys} className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 transition hover:bg-white/40 disabled:opacity-30">导出密钥包</button>
              </div>
            </div>
          </div>
        </section>

        <section className="rsa-intro mt-12 grid gap-7 border-t border-black/10 pt-8 lg:grid-cols-[.62fr_1.38fr]">
          <div>
            <div className="text-[9px] font-semibold tracking-[.14em] text-black/25">SELF TEST</div>
            <h2 className="mt-3 text-[clamp(30px,4vw,46px)] font-semibold leading-[1.06] tracking-[-.045em]">
              生成后，
              <br />
              顺手验证一次。
            </h2>
            <p className="mt-5 max-w-[390px] text-[9px] leading-5 text-black/34">
              RSA-OAEP 会用公钥加密、私钥解密；RSA-PSS 会用私钥签名、公钥验签。导入的 PEM 仅展示，不会被重新导入为 CryptoKey。
            </p>
          </div>

          <div className="grid gap-px overflow-hidden rounded-[30px] border border-black/[.08] bg-black/[.08] lg:grid-cols-2">
            <div className="min-w-0 bg-[#f4f1e9]">
              <div className="flex h-12 items-center justify-between border-b border-black/[.065] px-5">
                <span className="text-[8px] font-semibold tracking-[.13em] text-black/26">TEST MESSAGE</span>
                <span className="rsa-num font-mono text-[8px] text-black/22">{new TextEncoder().encode(testMessage).length} bytes</span>
              </div>
              <textarea value={testMessage} onChange={(event) => setTestMessage(event.target.value)} spellCheck={false} className="rsa-scroll block h-[330px] w-full resize-none bg-transparent p-5 font-mono text-[11px] leading-6 text-[#292b26] outline-none placeholder:text-black/16 sm:p-6" />
              <div className="border-t border-black/[.06] px-5 py-4">
                <button type="button" onClick={runSelfTest} disabled={!keyPair} className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white disabled:opacity-30">运行自检</button>
              </div>
            </div>

            <div className="min-w-0 bg-[#151714]">
              <div className="flex h-12 items-center justify-between border-b border-white/[.065] px-5">
                <span className="text-[8px] font-semibold tracking-[.13em] text-white/27">TEST OUTPUT</span>
                <button type="button" onClick={() => copy(testOutput, "test")} disabled={!testOutput} className="text-[8px] font-semibold text-white/27 transition hover:text-white disabled:opacity-20">{copied === "test" ? "✓ COPIED" : "COPY"}</button>
              </div>

              <pre className="rsa-dark-scroll h-[394px] overflow-auto whitespace-pre-wrap break-all p-5 font-mono text-[10px] leading-6 text-[#cbd8cd] sm:p-6">{testOutput || "运行自检后会显示加密 / 解密或签名 / 验签结果。"}</pre>
            </div>
          </div>
        </section>

        <section className="rsa-intro mt-12 grid gap-8 border-t border-black/10 pt-7 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">PEM FORMAT</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">私钥导出为 PKCS#8 PEM，公钥导出为 SPKI PEM，适合复制到常见开发和接口调试场景。</p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">USE FOR PURPOSE</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">RSA-OAEP 用于加密 / 解密；RSA-PSS 用于签名 / 验签。不同用途的 KeyUsage 不一样，不建议混用。</p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">PRIVATE KEY</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">私钥只在浏览器本地生成和展示，不会上传。复制或下载后请自行保管，不要放进公开仓库。</p>
          </div>
        </section>

        <div className="mt-12 border-t border-black/[.08] pt-5">
          <FooterNote />
        </div>
      </div>
    </div>
  )
}
