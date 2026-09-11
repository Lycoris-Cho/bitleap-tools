"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type ShaAlgorithm = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512"
type DigestAlgorithm = "MD5" | ShaAlgorithm
type OutputCase = "lower" | "upper"
type CopyKey = DigestAlgorithm | "all" | "hmac" | null
type Tab = "text" | "file" | "hmac"

type ResultItem = {
  name: DigestAlgorithm
  value: string
  bits: number
  note: string
  caution?: string
}

const SHA_ALGORITHMS: ShaAlgorithm[] = [
  "SHA-1",
  "SHA-256",
  "SHA-384",
  "SHA-512",
]

const ALL_ALGORITHMS: DigestAlgorithm[] = [
  "MD5",
  ...SHA_ALGORITHMS,
]

const SAMPLE_TEXT =
  "BitLeap Hash Studio\nTiny tools, Big leap.\n你好，世界。"

function bufferToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value)
}

function humanBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function encodeText(value: string) {
  return new TextEncoder().encode(value)
}

function applyOutputCase(value: string, outputCase: OutputCase) {
  return outputCase === "upper" ? value.toUpperCase() : value.toLowerCase()
}

async function shaHash(
  data: BufferSource,
  algorithm: ShaAlgorithm,
) {
  return bufferToHex(await crypto.subtle.digest(algorithm, data))
}

function md5(input: string | Uint8Array): string {
  const bytes =
    typeof input === "string" ? encodeText(input) : input
  const words: number[] = []
  const bitLength = bytes.length * 8

  for (let index = 0; index < bytes.length; index++) {
    words[index >> 2] |= bytes[index] << ((index % 4) * 8)
  }

  words[bitLength >> 5] |= 0x80 << bitLength % 32
  words[(((bitLength + 64) >>> 9) << 4) + 14] = bitLength

  let a = 0x67452301
  let b = 0xefcdab89
  let c = 0x98badcfe
  let d = 0x10325476

  const rotateLeft = (value: number, amount: number) =>
    (value << amount) | (value >>> (32 - amount))

  const add = (x: number, y: number) => {
    const low = (x & 0xffff) + (y & 0xffff)
    const high = (x >>> 16) + (y >>> 16) + (low >>> 16)
    return (high << 16) | (low & 0xffff)
  }

  const cmn = (
    q: number,
    x: number,
    y: number,
    word: number,
    shift: number,
    constant: number,
  ) => add(rotateLeft(add(add(x, q), add(word, constant)), shift), y)

  const ff = (
    x: number,
    y: number,
    z: number,
  ) => (x & y) | (~x & z)

  const gg = (
    x: number,
    y: number,
    z: number,
  ) => (x & z) | (y & ~z)

  const hh = (
    x: number,
    y: number,
    z: number,
  ) => x ^ y ^ z

  const ii = (
    x: number,
    y: number,
    z: number,
  ) => y ^ (x | ~z)

  for (let index = 0; index < words.length; index += 16) {
    const oldA = a
    const oldB = b
    const oldC = c
    const oldD = d

    a = cmn(ff(b, c, d), a, b, words[index + 0] ?? 0, 7, -680876936)
    d = cmn(ff(a, b, c), d, a, words[index + 1] ?? 0, 12, -389564586)
    c = cmn(ff(d, a, b), c, d, words[index + 2] ?? 0, 17, 606105819)
    b = cmn(ff(c, d, a), b, c, words[index + 3] ?? 0, 22, -1044525330)
    a = cmn(ff(b, c, d), a, b, words[index + 4] ?? 0, 7, -176418897)
    d = cmn(ff(a, b, c), d, a, words[index + 5] ?? 0, 12, 1200080426)
    c = cmn(ff(d, a, b), c, d, words[index + 6] ?? 0, 17, -1473231341)
    b = cmn(ff(c, d, a), b, c, words[index + 7] ?? 0, 22, -45705983)
    a = cmn(ff(b, c, d), a, b, words[index + 8] ?? 0, 7, 1770035416)
    d = cmn(ff(a, b, c), d, a, words[index + 9] ?? 0, 12, -1958414417)
    c = cmn(ff(d, a, b), c, d, words[index + 10] ?? 0, 17, -42063)
    b = cmn(ff(c, d, a), b, c, words[index + 11] ?? 0, 22, -1990404162)
    a = cmn(ff(b, c, d), a, b, words[index + 12] ?? 0, 7, 1804603682)
    d = cmn(ff(a, b, c), d, a, words[index + 13] ?? 0, 12, -40341101)
    c = cmn(ff(d, a, b), c, d, words[index + 14] ?? 0, 17, -1502002290)
    b = cmn(ff(c, d, a), b, c, words[index + 15] ?? 0, 22, 1236535329)

    a = cmn(gg(b, c, d), a, b, words[index + 1] ?? 0, 5, -165796510)
    d = cmn(gg(a, b, c), d, a, words[index + 6] ?? 0, 9, -1069501632)
    c = cmn(gg(d, a, b), c, d, words[index + 11] ?? 0, 14, 643717713)
    b = cmn(gg(c, d, a), b, c, words[index + 0] ?? 0, 20, -373897302)
    a = cmn(gg(b, c, d), a, b, words[index + 5] ?? 0, 5, -701558691)
    d = cmn(gg(a, b, c), d, a, words[index + 10] ?? 0, 9, 38016083)
    c = cmn(gg(d, a, b), c, d, words[index + 15] ?? 0, 14, -660478335)
    b = cmn(gg(c, d, a), b, c, words[index + 4] ?? 0, 20, -405537848)
    a = cmn(gg(b, c, d), a, b, words[index + 9] ?? 0, 5, 568446438)
    d = cmn(gg(a, b, c), d, a, words[index + 14] ?? 0, 9, -1019803690)
    c = cmn(gg(d, a, b), c, d, words[index + 3] ?? 0, 14, -187363961)
    b = cmn(gg(c, d, a), b, c, words[index + 8] ?? 0, 20, 1163531501)
    a = cmn(gg(b, c, d), a, b, words[index + 13] ?? 0, 5, -1444681467)
    d = cmn(gg(a, b, c), d, a, words[index + 2] ?? 0, 9, -51403784)
    c = cmn(gg(d, a, b), c, d, words[index + 7] ?? 0, 14, 1735328473)
    b = cmn(gg(c, d, a), b, c, words[index + 12] ?? 0, 20, -1926607734)

    a = cmn(hh(b, c, d), a, b, words[index + 5] ?? 0, 4, -378558)
    d = cmn(hh(a, b, c), d, a, words[index + 8] ?? 0, 11, -2022574463)
    c = cmn(hh(d, a, b), c, d, words[index + 11] ?? 0, 16, 1839030562)
    b = cmn(hh(c, d, a), b, c, words[index + 14] ?? 0, 23, -35309556)
    a = cmn(hh(b, c, d), a, b, words[index + 1] ?? 0, 4, -1530992060)
    d = cmn(hh(a, b, c), d, a, words[index + 4] ?? 0, 11, 1272893353)
    c = cmn(hh(d, a, b), c, d, words[index + 7] ?? 0, 16, -155497632)
    b = cmn(hh(c, d, a), b, c, words[index + 10] ?? 0, 23, -1094730640)
    a = cmn(hh(b, c, d), a, b, words[index + 13] ?? 0, 4, 681279174)
    d = cmn(hh(a, b, c), d, a, words[index + 0] ?? 0, 11, -358537222)
    c = cmn(hh(d, a, b), c, d, words[index + 3] ?? 0, 16, -722521979)
    b = cmn(hh(c, d, a), b, c, words[index + 6] ?? 0, 23, 76029189)
    a = cmn(hh(b, c, d), a, b, words[index + 9] ?? 0, 4, -640364487)
    d = cmn(hh(a, b, c), d, a, words[index + 12] ?? 0, 11, -421815835)
    c = cmn(hh(d, a, b), c, d, words[index + 15] ?? 0, 16, 530742520)
    b = cmn(hh(c, d, a), b, c, words[index + 2] ?? 0, 23, -995338651)

    a = cmn(ii(b, c, d), a, b, words[index + 0] ?? 0, 6, -198630844)
    d = cmn(ii(a, b, c), d, a, words[index + 7] ?? 0, 10, 1126891415)
    c = cmn(ii(d, a, b), c, d, words[index + 14] ?? 0, 15, -1416354905)
    b = cmn(ii(c, d, a), b, c, words[index + 5] ?? 0, 21, -57434055)
    a = cmn(ii(b, c, d), a, b, words[index + 12] ?? 0, 6, 1700485571)
    d = cmn(ii(a, b, c), d, a, words[index + 3] ?? 0, 10, -1894986606)
    c = cmn(ii(d, a, b), c, d, words[index + 10] ?? 0, 15, -1051523)
    b = cmn(ii(c, d, a), b, c, words[index + 1] ?? 0, 21, -2054922799)
    a = cmn(ii(b, c, d), a, b, words[index + 8] ?? 0, 6, 1873313359)
    d = cmn(ii(a, b, c), d, a, words[index + 15] ?? 0, 10, -30611744)
    c = cmn(ii(d, a, b), c, d, words[index + 6] ?? 0, 15, -1560198380)
    b = cmn(ii(c, d, a), b, c, words[index + 13] ?? 0, 21, 1309151649)
    a = cmn(ii(b, c, d), a, b, words[index + 4] ?? 0, 6, -145523070)
    d = cmn(ii(a, b, c), d, a, words[index + 11] ?? 0, 10, -1120210379)
    c = cmn(ii(d, a, b), c, d, words[index + 2] ?? 0, 15, 718787259)
    b = cmn(ii(c, d, a), b, c, words[index + 9] ?? 0, 21, -343485551)

    a = add(a, oldA)
    b = add(b, oldB)
    c = add(c, oldC)
    d = add(d, oldD)
  }

  const toHex = (value: number) => {
    let result = ""
    for (let index = 0; index < 4; index++) {
      result += ((value >>> (index * 8)) & 0xff)
        .toString(16)
        .padStart(2, "0")
    }
    return result
  }

  return toHex(a) + toHex(b) + toHex(c) + toHex(d)
}

async function calculateTextHashes(text: string) {
  const encoded = encodeText(text)
  const shaResults = await Promise.all(
    SHA_ALGORITHMS.map(async (algorithm) => ({
      name: algorithm,
      value: await shaHash(encoded, algorithm),
    })),
  )

  return [
    {
      name: "MD5" as const,
      value: md5(encoded),
    },
    ...shaResults,
  ]
}

async function calculateHmac(
  message: string,
  secret: string,
  algorithm: ShaAlgorithm,
) {
  const key = await crypto.subtle.importKey(
    "raw",
    encodeText(secret),
    {
      name: "HMAC",
      hash: algorithm,
    },
    false,
    ["sign"],
  )

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encodeText(message),
  )

  return bufferToHex(signature)
}

function makeFileDigestWorker() {
  const workerCode = String.raw`
    self.onmessage = async function (event) {
      const { id, file } = event.data;

      try {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);

        function bufferToHex(buffer) {
          return Array.from(new Uint8Array(buffer))
            .map((byte) => byte.toString(16).padStart(2, "0"))
            .join("");
        }

        function md5(input) {
          const bytes = input;
          const words = [];
          const bitLength = bytes.length * 8;

          for (let index = 0; index < bytes.length; index++) {
            words[index >> 2] |= bytes[index] << ((index % 4) * 8);
          }

          words[bitLength >> 5] |= 0x80 << bitLength % 32;
          words[(((bitLength + 64) >>> 9) << 4) + 14] = bitLength;

          let a = 0x67452301;
          let b = 0xefcdab89;
          let c = 0x98badcfe;
          let d = 0x10325476;

          const rotateLeft = (value, amount) =>
            (value << amount) | (value >>> (32 - amount));
          const add = (x, y) => {
            const low = (x & 0xffff) + (y & 0xffff);
            const high = (x >>> 16) + (y >>> 16) + (low >>> 16);
            return (high << 16) | (low & 0xffff);
          };
          const cmn = (q, x, y, word, shift, constant) =>
            add(rotateLeft(add(add(x, q), add(word, constant)), shift), y);
          const ff = (x, y, z) => (x & y) | (~x & z);
          const gg = (x, y, z) => (x & z) | (y & ~z);
          const hh = (x, y, z) => x ^ y ^ z;
          const ii = (x, y, z) => y ^ (x | ~z);

          for (let index = 0; index < words.length; index += 16) {
            const oldA = a, oldB = b, oldC = c, oldD = d;

            a = cmn(ff(b, c, d), a, b, words[index + 0] ?? 0, 7, -680876936);
            d = cmn(ff(a, b, c), d, a, words[index + 1] ?? 0, 12, -389564586);
            c = cmn(ff(d, a, b), c, d, words[index + 2] ?? 0, 17, 606105819);
            b = cmn(ff(c, d, a), b, c, words[index + 3] ?? 0, 22, -1044525330);
            a = cmn(ff(b, c, d), a, b, words[index + 4] ?? 0, 7, -176418897);
            d = cmn(ff(a, b, c), d, a, words[index + 5] ?? 0, 12, 1200080426);
            c = cmn(ff(d, a, b), c, d, words[index + 6] ?? 0, 17, -1473231341);
            b = cmn(ff(c, d, a), b, c, words[index + 7] ?? 0, 22, -45705983);
            a = cmn(ff(b, c, d), a, b, words[index + 8] ?? 0, 7, 1770035416);
            d = cmn(ff(a, b, c), d, a, words[index + 9] ?? 0, 12, -1958414417);
            c = cmn(ff(d, a, b), c, d, words[index + 10] ?? 0, 17, -42063);
            b = cmn(ff(c, d, a), b, c, words[index + 11] ?? 0, 22, -1990404162);
            a = cmn(ff(b, c, d), a, b, words[index + 12] ?? 0, 7, 1804603682);
            d = cmn(ff(a, b, c), d, a, words[index + 13] ?? 0, 12, -40341101);
            c = cmn(ff(d, a, b), c, d, words[index + 14] ?? 0, 17, -1502002290);
            b = cmn(ff(c, d, a), b, c, words[index + 15] ?? 0, 22, 1236535329);
            a = cmn(gg(b, c, d), a, b, words[index + 1] ?? 0, 5, -165796510);
            d = cmn(gg(a, b, c), d, a, words[index + 6] ?? 0, 9, -1069501632);
            c = cmn(gg(d, a, b), c, d, words[index + 11] ?? 0, 14, 643717713);
            b = cmn(gg(c, d, a), b, c, words[index + 0] ?? 0, 20, -373897302);
            a = cmn(gg(b, c, d), a, b, words[index + 5] ?? 0, 5, -701558691);
            d = cmn(gg(a, b, c), d, a, words[index + 10] ?? 0, 9, 38016083);
            c = cmn(gg(d, a, b), c, d, words[index + 15] ?? 0, 14, -660478335);
            b = cmn(gg(c, d, a), b, c, words[index + 4] ?? 0, 20, -405537848);
            a = cmn(gg(b, c, d), a, b, words[index + 9] ?? 0, 5, 568446438);
            d = cmn(gg(a, b, c), d, a, words[index + 14] ?? 0, 9, -1019803690);
            c = cmn(gg(d, a, b), c, d, words[index + 3] ?? 0, 14, -187363961);
            b = cmn(gg(c, d, a), b, c, words[index + 8] ?? 0, 20, 1163531501);
            a = cmn(gg(b, c, d), a, b, words[index + 13] ?? 0, 5, -1444681467);
            d = cmn(gg(a, b, c), d, a, words[index + 2] ?? 0, 9, -51403784);
            c = cmn(gg(d, a, b), c, d, words[index + 7] ?? 0, 14, 1735328473);
            b = cmn(gg(c, d, a), b, c, words[index + 12] ?? 0, 20, -1926607734);
            a = cmn(hh(b, c, d), a, b, words[index + 5] ?? 0, 4, -378558);
            d = cmn(hh(a, b, c), d, a, words[index + 8] ?? 0, 11, -2022574463);
            c = cmn(hh(d, a, b), c, d, words[index + 11] ?? 0, 16, 1839030562);
            b = cmn(hh(c, d, a), b, c, words[index + 14] ?? 0, 23, -35309556);
            a = cmn(hh(b, c, d), a, b, words[index + 1] ?? 0, 4, -1530992060);
            d = cmn(hh(a, b, c), d, a, words[index + 4] ?? 0, 11, 1272893353);
            c = cmn(hh(d, a, b), c, d, words[index + 7] ?? 0, 16, -155497632);
            b = cmn(hh(c, d, a), b, c, words[index + 10] ?? 0, 23, -1094730640);
            a = cmn(hh(b, c, d), a, b, words[index + 13] ?? 0, 4, 681279174);
            d = cmn(hh(a, b, c), d, a, words[index + 0] ?? 0, 11, -358537222);
            c = cmn(hh(d, a, b), c, d, words[index + 3] ?? 0, 16, -722521979);
            b = cmn(hh(c, d, a), b, c, words[index + 6] ?? 0, 23, 76029189);
            a = cmn(hh(b, c, d), a, b, words[index + 9] ?? 0, 4, -640364487);
            d = cmn(hh(a, b, c), d, a, words[index + 12] ?? 0, 11, -421815835);
            c = cmn(hh(d, a, b), c, d, words[index + 15] ?? 0, 16, 530742520);
            b = cmn(hh(c, d, a), b, c, words[index + 2] ?? 0, 23, -995338651);
            a = cmn(ii(b, c, d), a, b, words[index + 0] ?? 0, 6, -198630844);
            d = cmn(ii(a, b, c), d, a, words[index + 7] ?? 0, 10, 1126891415);
            c = cmn(ii(d, a, b), c, d, words[index + 14] ?? 0, 15, -1416354905);
            b = cmn(ii(c, d, a), b, c, words[index + 5] ?? 0, 21, -57434055);
            a = cmn(ii(b, c, d), a, b, words[index + 12] ?? 0, 6, 1700485571);
            d = cmn(ii(a, b, c), d, a, words[index + 3] ?? 0, 10, -1894986606);
            c = cmn(ii(d, a, b), c, d, words[index + 10] ?? 0, 15, -1051523);
            b = cmn(ii(c, d, a), b, c, words[index + 1] ?? 0, 21, -2054922799);
            a = cmn(ii(b, c, d), a, b, words[index + 8] ?? 0, 6, 1873313359);
            d = cmn(ii(a, b, c), d, a, words[index + 15] ?? 0, 10, -30611744);
            c = cmn(ii(d, a, b), c, d, words[index + 6] ?? 0, 15, -1560198380);
            b = cmn(ii(c, d, a), b, c, words[index + 13] ?? 0, 21, 1309151649);
            a = cmn(ii(b, c, d), a, b, words[index + 4] ?? 0, 6, -145523070);
            d = cmn(ii(a, b, c), d, a, words[index + 11] ?? 0, 10, -1120210379);
            c = cmn(ii(d, a, b), c, d, words[index + 2] ?? 0, 15, 718787259);
            b = cmn(ii(c, d, a), b, c, words[index + 9] ?? 0, 21, -343485551);
            a = add(a, oldA);
            b = add(b, oldB);
            c = add(c, oldC);
            d = add(d, oldD);
          }

          const toHex = (value) => {
            let result = "";
            for (let index = 0; index < 4; index++) {
              result += ((value >>> (index * 8)) & 0xff).toString(16).padStart(2, "0");
            }
            return result;
          };

          return toHex(a) + toHex(b) + toHex(c) + toHex(d);
        }

        const shaAlgorithms = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"];
        const shaResults = await Promise.all(
          shaAlgorithms.map(async (algorithm) => ({
            name: algorithm,
            value: bufferToHex(await crypto.subtle.digest(algorithm, bytes)),
          }))
        );

        self.postMessage({
          id,
          ok: true,
          name: file.name,
          size: file.size,
          type: file.type || "unknown",
          results: [
            { name: "MD5", value: md5(bytes) },
            ...shaResults,
          ],
        });
      } catch (error) {
        self.postMessage({
          id,
          ok: false,
          error: error && error.message ? error.message : "文件哈希计算失败",
        });
      }
    };
  `

  const blob = new Blob([workerCode], {
    type: "text/javascript",
  })
  const url = URL.createObjectURL(blob)
  const worker = new Worker(url)

  return {
    worker,
    url,
  }
}

function ResultCard({
  item,
  outputCase,
  copied,
  onCopy,
}: {
  item: ResultItem
  outputCase: OutputCase
  copied: boolean
  onCopy: () => void
}) {
  const displayed = applyOutputCase(item.value, outputCase)

  return (
    <article className="group border-b border-white/[.055] px-5 py-4 last:border-b-0">
      <div className="grid gap-3 sm:grid-cols-[110px_1fr_auto] sm:items-start">
        <div>
          <div className="font-mono text-[11px] font-semibold text-white/72">
            {item.name}
          </div>
          <div className="mt-1 text-[7px] tracking-[.12em] text-white/20">
            {item.bits} BIT
          </div>
        </div>

        <div className="min-w-0 break-all font-mono text-[10px] leading-5 text-[#cbd8cd]">
          {displayed}
          {item.caution && (
            <p className="mt-2 font-sans text-[8px] leading-4 text-[#d49a88]/72">
              {item.caution}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onCopy}
          className="w-fit rounded-full border border-white/[.08] px-3 py-2 text-[8px] font-semibold text-white/33 transition hover:bg-white hover:text-[#171916] sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
        >
          {copied ? "✓ COPIED" : "COPY"}
        </button>
      </div>
    </article>
  )
}

export default function HashPage() {
  const [inputText, setInputText] = useState(SAMPLE_TEXT)
  const [results, setResults] = useState<ResultItem[]>([])
  const [outputCase, setOutputCase] = useState<OutputCase>("lower")
  const [copied, setCopied] = useState<CopyKey>(null)
  const [tab, setTab] = useState<Tab>("text")
  const [fileInfo, setFileInfo] = useState<{
    name: string
    size: number
    type: string
  } | null>(null)
  const [fileResults, setFileResults] = useState<ResultItem[]>([])
  const [hmacSecret, setHmacSecret] = useState("secret")
  const [hmacMessage, setHmacMessage] = useState("hello")
  const [hmacAlgorithm, setHmacAlgorithm] =
    useState<ShaAlgorithm>("SHA-256")
  const [hmacResult, setHmacResult] = useState("")
  const [status, setStatus] = useState("")
  const [isRunning, setIsRunning] = useState(false)

  const pageRef = useRef<HTMLDivElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const workerRef = useRef<Worker | null>(null)
  const workerUrlRef = useRef<string | null>(null)
  const runIdRef = useRef(0)

  const textBytes = useMemo(
    () => encodeText(inputText).length,
    [inputText],
  )

  const activeResults = tab === "file" ? fileResults : results

  const allText = useMemo(() => {
    const source = tab === "file" ? fileResults : results

    return source
      .map(
        (item) =>
          `${item.name}: ${applyOutputCase(item.value, outputCase)}`,
      )
      .join("\n")
  }, [fileResults, outputCase, results, tab])

  const textReport = useMemo(
    () =>
      [
        "BitLeap Hash Studio",
        "",
        tab === "file" && fileInfo
          ? `文件：${fileInfo.name}`
          : "来源：文本",
        tab === "file" && fileInfo
          ? `大小：${humanBytes(fileInfo.size)}`
          : `UTF-8：${humanBytes(textBytes)}`,
        "",
        allText || "暂无结果",
      ].join("\n"),
    [allText, fileInfo, tab, textBytes],
  )

  const cleanupWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }

    if (workerUrlRef.current) {
      URL.revokeObjectURL(workerUrlRef.current)
      workerUrlRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => cleanupWorker()
  }, [cleanupWorker])

  useEffect(() => {
    if (
      !pageRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    const ctx = gsap.context(() => {
      gsap.from(".hash-intro", {
        y: 22,
        opacity: 0,
        duration: 0.78,
        stagger: 0.055,
        ease: "power3.out",
      })

      gsap.to(".hash-orbit-a", {
        rotation: 360,
        duration: 68,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })

      gsap.to(".hash-orbit-b", {
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
    if (!inputText.trim()) {
      setResults([])
      return
    }

    let active = true
    const timer = window.setTimeout(async () => {
      try {
        setStatus("正在计算文本哈希…")
        const calculated = await calculateTextHashes(inputText)

        if (!active) return

        setResults(
          calculated.map((item) => ({
            name: item.name,
            value: item.value,
            bits:
              item.name === "MD5"
                ? 128
                : Number(item.name.replace("SHA-", "")),
            note:
              item.name === "MD5"
                ? "历史校验算法"
                : "WebCrypto SHA 摘要",
            caution:
              item.name === "MD5" || item.name === "SHA-1"
                ? "不建议用于密码存储或安全签名。"
                : undefined,
          })),
        )
        setStatus("文本哈希已更新")
      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "文本哈希计算失败",
        )
      }
    }, 120)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [inputText])

  useEffect(() => {
    if (
      !outputRef.current ||
      !activeResults.length ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    gsap.fromTo(
      outputRef.current,
      { opacity: 0.62, y: 5 },
      {
        opacity: 1,
        y: 0,
        duration: 0.24,
        ease: "power2.out",
        overwrite: true,
      },
    )
  }, [activeResults, outputCase])

  const calculateFile = (file: File) => {
    cleanupWorker()

    const id = ++runIdRef.current
    const { worker, url } = makeFileDigestWorker()

    workerRef.current = worker
    workerUrlRef.current = url
    setTab("file")
    setFileInfo({
      name: file.name,
      size: file.size,
      type: file.type || "unknown",
    })
    setFileResults([])
    setStatus(`正在计算文件：${file.name}`)

    worker.onmessage = (
      event: MessageEvent<{
        id: number
        ok: boolean
        name?: string
        size?: number
        type?: string
        results?: Array<{
          name: DigestAlgorithm
          value: string
        }>
        error?: string
      }>,
    ) => {
      if (event.data.id !== id) return

      if (event.data.ok && event.data.results) {
        setFileResults(
          event.data.results.map((item) => ({
            name: item.name,
            value: item.value,
            bits:
              item.name === "MD5"
                ? 128
                : Number(item.name.replace("SHA-", "")),
            note:
              item.name === "MD5"
                ? "文件 MD5"
                : "文件 SHA 摘要",
            caution:
              item.name === "MD5" || item.name === "SHA-1"
                ? "适合历史校验，不适合安全用途。"
                : undefined,
          })),
        )
        setStatus("文件哈希已完成")
      } else {
        setStatus(event.data.error || "文件哈希计算失败")
      }

      cleanupWorker()
    }

    worker.onerror = () => {
      setStatus("文件哈希计算线程发生异常")
      cleanupWorker()
    }

    worker.postMessage({
      id,
      file,
    })
  }

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    if (!file) return
    calculateFile(file)
    event.target.value = ""
  }

  const runHmac = async () => {
    if (!hmacMessage || !hmacSecret) {
      setHmacResult("")
      setStatus("HMAC 需要消息和密钥")
      return
    }

    try {
      setIsRunning(true)
      const result = await calculateHmac(
        hmacMessage,
        hmacSecret,
        hmacAlgorithm,
      )
      setHmacResult(result)
      setStatus("HMAC 已生成")
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "HMAC 计算失败",
      )
    } finally {
      setIsRunning(false)
    }
  }

  const copy = async (value: string, key: CopyKey) => {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {}
  }

  const download = (content: string, filename: string) => {
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

  return (
    <div
      ref={pageRef}
      className="min-h-screen overflow-hidden bg-[#efede6] text-[#22231f] selection:bg-[#22231f] selection:text-white"
    >
      <style>{`
        .hash-scroll::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }

        .hash-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .hash-scroll::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(34,35,31,.13);
        }

        .hash-dark-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,.14);
        }

        .hash-grid {
          background-image:
            linear-gradient(rgba(34,35,31,.032) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,35,31,.032) 1px, transparent 1px);
          background-size: 30px 30px;
        }

        .hash-num {
          font-variant-numeric: tabular-nums lining-nums;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_9%,rgba(178,151,91,.10),transparent_27%),radial-gradient(circle_at_8%_88%,rgba(73,107,91,.08),transparent_31%)]" />
        <div className="hash-orbit-a absolute right-[-20vw] top-[-24vw] h-[58vw] w-[58vw] rounded-full border border-black/[.04]">
          <span className="absolute left-[15%] top-[43%] h-2 w-2 rounded-full bg-[#b28d48]/38" />
        </div>
        <div className="hash-orbit-b absolute bottom-[-26vw] left-[-19vw] h-[53vw] w-[53vw] rounded-full border border-black/[.032]">
          <span className="absolute right-[14%] top-[31%] h-1.5 w-1.5 rounded-full bg-[#52685d]/35" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1560px] px-5 pb-10 pt-6 sm:px-8">
        <div className="hash-intro">
          <Breadcrumb />
        </div>

        <header className="hash-intro mt-8 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/27">
              HASH STUDIO
            </div>
            <h1 className="mt-4 max-w-[870px] text-[clamp(48px,6.35vw,90px)] font-semibold leading-[1.03] tracking-[-.055em]">
              把内容，
              <br />
              压成指纹。
            </h1>
          </div>

          <div>
            <p className="max-w-[560px] text-[11px] leading-6 text-black/40">
              本地计算文本和文件的 MD5 / SHA 摘要，也可以生成 HMAC。适合校验文件、比对内容和生成接口签名测试值。
            </p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[8px] text-black/25">
              <span>LOCAL ONLY</span>
              <span>WEBCRYPTO SHA</span>
              <span>FILE DIGEST</span>
              <span>HMAC LAB</span>
            </div>
          </div>
        </header>

        <section className="hash-intro mt-6 flex flex-col gap-4 border-b border-black/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {(["text", "file", "hmac"] as Tab[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={`rounded-full px-4 py-2.5 text-[9px] font-semibold transition ${
                  tab === value
                    ? "bg-[#22231f] text-white"
                    : "text-black/34 hover:bg-white/45 hover:text-black"
                }`}
              >
                {value === "text" ? "文本哈希" : value === "file" ? "文件哈希" : "HMAC"}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(["lower", "upper"] as OutputCase[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setOutputCase(value)}
                className={`rounded-full px-3.5 py-2 font-mono text-[8px] font-semibold transition ${
                  outputCase === value
                    ? "bg-[#52685d] text-white"
                    : "text-black/31 hover:bg-white/45 hover:text-black"
                }`}
              >
                {value === "lower" ? "lowercase" : "UPPERCASE"}
              </button>
            ))}
          </div>
        </section>

        {tab === "text" && (
          <section className="hash-intro mt-7 grid gap-px overflow-hidden rounded-[30px] border border-black/[.075] bg-black/[.07] lg:grid-cols-[.88fr_1.12fr]">
            <div className="min-w-0 bg-[#f4f1e9]">
              <div className="flex h-12 items-center justify-between border-b border-black/[.065] px-5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#a8754b]" />
                  <span className="text-[8px] font-semibold tracking-[.13em] text-black/26">
                    TEXT INPUT
                  </span>
                </div>
                <span className="hash-num font-mono text-[8px] text-black/22">
                  {humanBytes(textBytes)}
                </span>
              </div>

              <textarea
                value={inputText}
                onChange={(event) => setInputText(event.target.value)}
                spellCheck={false}
                placeholder="在此输入需要计算哈希的文本……"
                className="hash-scroll block h-[470px] w-full resize-none bg-transparent p-5 font-mono text-[11px] leading-6 text-[#292b26] outline-none placeholder:text-black/16 sm:p-6"
              />

              <div className="flex flex-wrap gap-2 border-t border-black/[.06] px-5 py-4">
                <button
                  type="button"
                  onClick={() => setInputText(SAMPLE_TEXT)}
                  className="rounded-full border border-black/[.085] px-3.5 py-2 text-[8px] font-semibold text-black/35 transition hover:bg-white/45 hover:text-black"
                >
                  示例
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const value = await navigator.clipboard.readText()
                      if (value) setInputText(value)
                    } catch {}
                  }}
                  className="rounded-full border border-black/[.085] px-3.5 py-2 text-[8px] font-semibold text-black/35 transition hover:bg-white/45 hover:text-black"
                >
                  粘贴
                </button>
                <button
                  type="button"
                  onClick={() => setInputText("")}
                  className="rounded-full px-3.5 py-2 text-[8px] font-semibold text-[#965744] transition hover:bg-[#965744]/8"
                >
                  清空
                </button>
              </div>
            </div>

            <div ref={outputRef} className="min-w-0 bg-[#151714]">
              <div className="flex h-12 items-center justify-between border-b border-white/[.065] px-5">
                <span className="text-[8px] font-semibold tracking-[.13em] text-white/27">
                  DIGEST OUTPUT
                </span>
                <span className="text-[8px] text-white/18">
                  {status || "READY"}
                </span>
              </div>

              <div className="hash-dark-scroll h-[530px] overflow-auto">
                {!results.length ? (
                  <div className="grid h-full place-items-center px-6 text-center">
                    <p className="text-[9px] leading-5 text-white/25">
                      输入文本后自动计算哈希。
                    </p>
                  </div>
                ) : (
                  results.map((item) => (
                    <ResultCard
                      key={item.name}
                      item={item}
                      outputCase={outputCase}
                      copied={copied === item.name}
                      onCopy={() => copy(applyOutputCase(item.value, outputCase), item.name)}
                    />
                  ))
                )}
              </div>
            </div>
          </section>
        )}

        {tab === "file" && (
          <section className="hash-intro mt-7 grid gap-7 lg:grid-cols-[.65fr_1.35fr]">
            <div className="hash-grid rounded-[30px] border border-black/[.075] bg-white/24 p-6">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />

              <div
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault()
                  const file = event.dataTransfer.files?.[0]
                  if (file) calculateFile(file)
                }}
                className="grid min-h-[360px] place-items-center rounded-[24px] border border-dashed border-black/[.16] bg-white/24 p-8 text-center"
              >
                <div>
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#22231f] text-white">
                    #
                  </div>
                  <h2 className="mt-6 text-3xl font-semibold tracking-[-.045em]">
                    拖入文件或选择文件。
                  </h2>
                  <p className="mx-auto mt-4 max-w-[360px] text-[9px] leading-5 text-black/34">
                    文件会在浏览器本地读取。大文件会消耗内存，适合常见脚本、配置、压缩包和资源文件校验。
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-6 rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white"
                  >
                    选择文件
                  </button>
                </div>
              </div>

              {fileInfo && (
                <div className="mt-5 rounded-[20px] border border-black/[.07] bg-white/28 p-4">
                  <div className="break-all font-mono text-[10px] text-black/58">
                    {fileInfo.name}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[8px] text-black/28">
                    <span>{humanBytes(fileInfo.size)}</span>
                    <span>{fileInfo.type}</span>
                  </div>
                </div>
              )}
            </div>

            <div ref={outputRef} className="overflow-hidden rounded-[30px] border border-black/[.08] bg-[#151714]">
              <div className="flex h-12 items-center justify-between border-b border-white/[.065] px-5">
                <span className="text-[8px] font-semibold tracking-[.13em] text-white/27">
                  FILE DIGESTS
                </span>
                <span className="text-[8px] text-white/18">
                  {status || "WAITING"}
                </span>
              </div>

              <div className="hash-dark-scroll max-h-[560px] overflow-auto">
                {!fileResults.length ? (
                  <div className="grid min-h-[360px] place-items-center px-6 text-center">
                    <p className="text-[9px] leading-5 text-white/25">
                      选择文件后显示 MD5 和 SHA 摘要。
                    </p>
                  </div>
                ) : (
                  fileResults.map((item) => (
                    <ResultCard
                      key={item.name}
                      item={item}
                      outputCase={outputCase}
                      copied={copied === item.name}
                      onCopy={() => copy(applyOutputCase(item.value, outputCase), item.name)}
                    />
                  ))
                )}
              </div>
            </div>
          </section>
        )}

        {tab === "hmac" && (
          <section className="hash-intro mt-7 grid gap-7 lg:grid-cols-[.82fr_1.18fr]">
            <div className="rounded-[30px] border border-black/[.075] bg-white/24 p-6">
              <div className="text-[8px] font-semibold tracking-[.14em] text-black/24">
                HMAC INPUT
              </div>

              <div className="mt-5 grid gap-4">
                <label>
                  <span className="mb-2 block text-[8px] font-semibold tracking-[.12em] text-black/24">
                    SECRET
                  </span>
                  <input
                    value={hmacSecret}
                    onChange={(event) => setHmacSecret(event.target.value)}
                    spellCheck={false}
                    className="w-full rounded-full border border-black/[.08] bg-white/35 px-4 py-3 font-mono text-[10px] text-black/68 outline-none transition focus:border-black/25"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-[8px] font-semibold tracking-[.12em] text-black/24">
                    MESSAGE
                  </span>
                  <textarea
                    value={hmacMessage}
                    onChange={(event) => setHmacMessage(event.target.value)}
                    spellCheck={false}
                    className="hash-scroll h-[220px] w-full resize-none rounded-[22px] border border-black/[.08] bg-white/35 p-4 font-mono text-[10px] leading-5 text-black/68 outline-none transition focus:border-black/25"
                  />
                </label>

                <div className="flex flex-wrap gap-2">
                  {SHA_ALGORITHMS.map((algorithm) => (
                    <button
                      key={algorithm}
                      type="button"
                      onClick={() => setHmacAlgorithm(algorithm)}
                      className={`rounded-full px-3.5 py-2 text-[8px] font-semibold transition ${
                        hmacAlgorithm === algorithm
                          ? "bg-[#22231f] text-white"
                          : "text-black/32 hover:bg-white/45 hover:text-black"
                      }`}
                    >
                      {algorithm}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={runHmac}
                  disabled={isRunning}
                  className="w-fit rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white disabled:opacity-30"
                >
                  生成 HMAC
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-[30px] border border-black/[.08] bg-[#151714]">
              <div className="flex h-12 items-center justify-between border-b border-white/[.065] px-5">
                <span className="text-[8px] font-semibold tracking-[.13em] text-white/27">
                  HMAC OUTPUT
                </span>
                <button
                  type="button"
                  onClick={() => copy(applyOutputCase(hmacResult, outputCase), "hmac")}
                  disabled={!hmacResult}
                  className="text-[8px] font-semibold text-white/27 transition hover:text-white disabled:opacity-20"
                >
                  {copied === "hmac" ? "✓ COPIED" : "COPY"}
                </button>
              </div>

              <div className="hash-dark-scroll min-h-[420px] overflow-auto p-6">
                <div className="break-all font-mono text-[11px] leading-6 text-[#cbd8cd]">
                  {hmacResult ? applyOutputCase(hmacResult, outputCase) : "等待生成 HMAC…"}
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="hash-intro mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-[8px] text-black/25">
            <span>{ALL_ALGORITHMS.length} algorithms</span>
            <span>{tab === "file" && fileInfo ? humanBytes(fileInfo.size) : humanBytes(textBytes)}</span>
            <span>{status || "local digest"}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => copy(allText, "all")}
              disabled={!allText}
              className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white transition hover:scale-[1.01] active:scale-[.98] disabled:opacity-30"
            >
              {copied === "all" ? "✓ 已复制全部" : "复制全部结果"}
            </button>

            <button
              type="button"
              onClick={() => download(textReport, "bitleap-hash-report.txt")}
              disabled={!allText}
              className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 transition hover:bg-white/40 disabled:opacity-30"
            >
              导出报告
            </button>
          </div>
        </section>

        <section className="hash-intro mt-12 grid gap-8 border-t border-black/10 pt-7 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              SHA BY WEBCRYPTO
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              SHA 系列使用浏览器原生 WebCrypto 计算，文本先按 UTF-8 编码，结果默认显示十六进制。
            </p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              MD5 FOR CHECKSUM
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              MD5 仅适合历史校验和内容指纹对比，不建议用于密码存储、签名或安全认证。
            </p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              LOCAL ONLY
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              文本、文件和密钥都只在当前浏览器内处理，不需要网络请求，也不会上传内容。
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
