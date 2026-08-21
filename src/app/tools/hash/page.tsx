"use client";

import { useState } from "react";
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

// WebCrypto 只支持 SHA 系列；MD5 需要简易纯前端实现
async function shaHash(text: string, algo: "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512") {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest(algo, data);
  return bufferToHex(hashBuffer);
}

function bufferToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// MD5 轻量实现（纯前端，无依赖）
function md5(str: string): string {
  function rotateLeft(x: number, n: number) {
    return (x << n) | (x >>> (32 - n));
  }
  function addUnsigned(x: number, y: number) {
    const lsw = (x & 0xffff) + (y & 0xffff);
    const msw = (x >>> 16) + (y >>> 16) + (lsw >>> 16);
    return (msw << 16) | (lsw & 0xffff);
  }
  let x: number[] = [], k, AA, BB, CC, DD, a, b, c, d;
  const S11 = 7, S12 = 12, S13 = 17, S14 = 22;
  const S21 = 5, S22 = 9, S23 = 14, S24 = 20;
  const S31 = 4, S32 = 11, S33 = 16, S34 = 23;
  const S41 = 6, S42 = 10, S43 = 15, S44 = 21;

  str = unescape(encodeURIComponent(str));
  x = [];
  for (let i = 0; i < str.length; i++)
    x[i] = str.charCodeAt(i);

  const len = str.length;
  const bitLen = len << 3;
  x[bitLen >> 3] |= 0x80;
  x[(((bitLen + 64) >>> 9) << 4) + 14] = bitLen;

  AA = 0x67452301; BB = 0xefcdab89; CC = 0x98badcfe; DD = 0x10325476;

  for (k = 0; k < x.length; k += 16) {
    const oldA = AA, oldB = BB, oldC = CC, oldD = DD;
    a = AA; b = BB; c = CC; d = DD;

    function F(x: number, y: number, z: number) { return (x & y) | (~x & z); }
    function G(x: number, y: number, z: number) { return (x & z) | (y & ~z); }
    function H(x: number, y: number, z: number) { return x ^ y ^ z; }
    function I(x: number, y: number, z: number) { return y ^ (x | ~z); }

    function FF(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
      return addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, F(b, c, d)), addUnsigned(x, ac)), s), b);
    }
    function GG(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
      return addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, G(b, c, d)), addUnsigned(x, ac)), s), b);
    }
    function HH(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
      return addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, H(b, c, d)), addUnsigned(x, ac)), s), b);
    }
    function II(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
      return addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, I(b, c, d)), addUnsigned(x, ac)), s), b);
    }

    a = FF(a, b, c, d, x[k + 0], S11, 0xd76aa478);
    d = FF(d, a, b, c, x[k + 1], S12, 0xe8c7b756);
    c = FF(c, d, a, b, x[k + 2], S13, 0x242070db);
    b = FF(b, c, d, a, x[k + 3], S14, 0xc1bdceee);
    a = FF(a, b, c, d, x[k + 4], S11, 0xf57c0faf);
    d = FF(d, a, b, c, x[k + 5], S12, 0x4787c62a);
    c = FF(c, d, a, b, x[k + 6], S13, 0xa8304613);
    b = FF(b, c, d, a, x[k + 7], S14, 0xfd469501);
    a = FF(a, b, c, d, x[k + 8], S11, 0x698098d8);
    d = FF(d, a, b, c, x[k + 9], S12, 0x8b44f7af);
    c = FF(c, d, a, b, x[k + 10], S13, 0xffff5bb1);
    b = FF(b, c, d, a, x[k + 11], S14, 0x895cd7be);
    a = FF(a, b, c, d, x[k + 12], S11, 0x6b901122);
    d = FF(d, a, b, c, x[k + 13], S12, 0xfd987193);
    c = FF(c, d, a, b, x[k + 14], S13, 0xa679438e);
    b = FF(b, c, d, a, x[k + 15], S14, 0x49b40821);

    a = GG(a, b, c, d, x[k + 1], S21, 0xf61e2562);
    d = GG(d, a, b, c, x[k + 6], S22, 0xc040b340);
    c = GG(c, d, a, b, x[k + 11], S23, 0x265e5a51);
    b = GG(b, c, d, a, x[k + 0], S24, 0xe9b6c7aa);
    a = GG(a, b, c, d, x[k + 5], S21, 0xd62f105d);
    d = GG(d, a, b, c, x[k + 10], S22, 0x02441453);
    c = GG(c, d, a, b, x[k + 15], S23, 0xd8a1e681);
    b = GG(b, c, d, a, x[k + 4], S24, 0xe7d3fbc8);
    a = GG(a, b, c, d, x[k + 9], S21, 0x21e1cde6);
    d = GG(d, a, b, c, x[k + 14], S22, 0xc33707d6);
    c = GG(c, d, a, b, x[k + 3], S23, 0xf4d50d87);
    b = GG(b, c, d, a, x[k + 8], S24, 0x455a14ed);
    a = GG(a, b, c, d, x[k + 13], S21, 0xa9e3e905);
    d = GG(d, a, b, c, x[k + 2], S22, 0xfcefa3f8);
    c = GG(c, d, a, b, x[k + 7], S23, 0x676f02d9);
    b = GG(b, c, d, a, x[k + 12], S24, 0x8d2a4c8a);

    a = HH(a, b, c, d, x[k + 5], S31, 0xfffa3942);
    d = HH(d, a, b, c, x[k + 8], S32, 0x8771f681);
    c = HH(c, d, a, b, x[k + 11], S33, 0x6d9d6122);
    b = HH(b, c, d, a, x[k + 14], S34, 0xfde5380c);
    a = HH(a, b, c, d, x[k + 1], S31, 0xa4beea44);
    d = HH(d, a, b, c, x[k + 4], S32, 0x4bdecfa9);
    c = HH(c, d, a, b, x[k + 7], S33, 0xf6bb4b60);
    b = HH(b, c, d, a, x[k + 10], S34, 0xbebfbc70);
    a = HH(a, b, c, d, x[k + 13], S31, 0x289b7ec6);
    d = HH(d, a, b, c, x[k + 0], S32, 0xeaa127fa);
    c = HH(c, d, a, b, x[k + 3], S33, 0xd4ef3085);
    b = HH(b, c, d, a, x[k + 6], S34, 0x04881d05);
    a = HH(a, b, c, d, x[k + 9], S31, 0xd9d4d039);
    d = HH(d, a, b, c, x[k + 12], S32, 0xe6db99e5);
    c = HH(c, d, a, b, x[k + 15], S33, 0x1fa27cf8);
    b = HH(b, c, d, a, x[k + 2], S34, 0xc4ac5665);

    a = II(a, b, c, d, x[k + 0], S41, 0xf4292244);
    d = II(d, a, b, c, x[k + 7], S42, 0x432aff97);
    c = II(c, d, a, b, x[k + 14], S43, 0xab9423a7);
    b = II(b, c, d, a, x[k + 5], S44, 0xfc93a039);
    a = II(a, b, c, d, x[k + 12], S41, 0x655b59c3);
    d = II(d, a, b, c, x[k + 3], S42, 0x8f0ccc92);
    c = II(c, d, a, b, x[k + 10], S43, 0xffeff47d);
    b = II(b, c, d, a, x[k + 1], S44, 0x85845dd1);
    a = II(a, b, c, d, x[k + 8], S41, 0x6fa87e4f);
    d = II(d, a, b, c, x[k + 15], S42, 0xfe2ce6e0);
    c = II(c, d, a, b, x[k + 6], S43, 0xa3014314);
    b = II(b, c, d, a, x[k + 13], S44, 0x4e0811a1);
    a = II(a, b, c, d, x[k + 4], S41, 0xf7537e82);
    d = II(d, a, b, c, x[k + 11], S42, 0xbd3af235);
    c = II(c, d, a, b, x[k + 2], S43, 0x2ad7d2bb);
    b = II(b, c, d, a, x[k + 9], S44, 0xeb86d391);

    AA = addUnsigned(a, oldA);
    BB = addUnsigned(b, oldB);
    CC = addUnsigned(c, oldC);
    DD = addUnsigned(d, oldD);
  }

  function wordToHex(n: number) {
    let s = "", v;
    for (let i = 0; i <= 3; i++) {
      v = (n >>> (i * 8)) & 0xff;
      s += ("0" + v.toString(16)).slice(-2);
    }
    return s;
  }
  return wordToHex(AA) + wordToHex(BB) + wordToHex(CC) + wordToHex(DD);
}

type ResultItem = { name: string; value: string };

export default function HashPage() {
  const [inputText, setInputText] = useState("");
  const [results, setResults] = useState<ResultItem[]>([]);

  async function handleCalc() {
    const text = inputText;
    if (!text) {
      setResults([]);
      return;
    }
    const md = md5(text);
    const s1 = await shaHash(text, "SHA-1");
    const s256 = await shaHash(text, "SHA-256");
    const s384 = await shaHash(text, "SHA-384");
    const s512 = await shaHash(text, "SHA-512");

    setResults([
      { name: "MD5", value: md },
      { name: "SHA-1", value: s1 },
      { name: "SHA-256", value: s256 },
      { name: "SHA-384", value: s384 },
      { name: "SHA-512", value: s512 },
    ]);
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumb />
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Hash 哈希工具</h1>
        <p className="text-sm text-app-muted mt-1">本地计算 MD5 / SHA1 / SHA256 / SHA384 / SHA512，数据不会上传服务器</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">输入文本</label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="在此输入需要计算哈希的文本……"
            className="w-full min-h-36 p-4 rounded-xl border border-app-border bg-app-bg focus:outline-none focus:ring-2 focus:ring-violet-200 resize-y"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleCalc}
            className="px-5 py-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition"
          >
            计算哈希
          </button>
          <button
            onClick={() => { setInputText(""); setResults([]); }}
            className="px-5 py-2.5 border border-app-border rounded-xl hover:bg-gray-50 transition"
          >
            清空
          </button>
        </div>

        {results.length > 0 && (
          <div className="space-y-3 mt-4">
            <h3 className="font-semibold">计算结果</h3>
            {results.map((r) => (
              <div key={r.name} className="p-4 rounded-xl border border-app-border bg-app-bg flex items-start gap-3">
                <div className="w-20 shrink-0 font-medium text-sm">{r.name}</div>
                <div className="flex-1 break-all font-mono text-sm text-gray-800">{r.value}</div>
                <button
                  onClick={() => copy(r.value)}
                  className="shrink-0 text-sm text-violet-600 hover:text-violet-800"
                >
                  复制
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <FooterNote />
    </div>
  );
}
