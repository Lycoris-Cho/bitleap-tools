'use client'
import { useState } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

async function generateRsaKey(modulus: number): Promise<{ privatePem: string; publicPem: string }> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'RSA-OAEP', modulusLength: modulus, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['encrypt', 'decrypt']
  )

  const privateBuf = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey)
  const publicBuf = await crypto.subtle.exportKey('spki', keyPair.publicKey)

  const bufToBase64 = (buf: ArrayBuffer) =>
    btoa(String.fromCharCode(...new Uint8Array(buf)))

  const privateBase64 = bufToBase64(privateBuf)
  const publicBase64 = bufToBase64(publicBuf)

  const chunk = (s: string) => s.match(/.{1,64}/g)!.join('\n')

  const privatePem = `-----BEGIN PRIVATE KEY-----\n${chunk(privateBase64)}\n-----END PRIVATE KEY-----`
  const publicPem = `-----BEGIN PUBLIC KEY-----\n${chunk(publicBase64)}\n-----END PUBLIC KEY-----`

  return { privatePem, publicPem }
}

export default function RsaKeyPage() {
  const [activeBit, setActiveBit] = useState<2048 | 4096>(2048)
  const [privateKey, setPrivateKey] = useState('')
  const [publicKey, setPublicKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<'private' | 'public' | null>(null)

  const handleGen = async () => {
    setLoading(true)
    setPrivateKey('')
    setPublicKey('')
    setCopied(null)
    try {
      const res = await generateRsaKey(activeBit)
      setPrivateKey(res.privatePem)
      setPublicKey(res.publicPem)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const copy = async (text: string, which: 'private' | 'public') => {
    await navigator.clipboard.writeText(text)
    setCopied(which)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">RSA 密钥生成</h1>
        <p className="text-app-muted text-sm">浏览器本地生成 PEM 格式 RSA 公私钥，密钥不会上传网络</p>
      </div>

      {/* 操作区 */}
      <div className="flex gap-3 mb-8 flex-wrap items-center">
        <button
          onClick={() => setActiveBit(2048)}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeBit === 2048
              ? 'bg-violet-500 text-white border-violet-500 shadow-sm shadow-violet-500/20'
              : 'bg-app-bg border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          2048 bit
        </button>
        <button
          onClick={() => setActiveBit(4096)}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeBit === 4096
              ? 'bg-violet-500 text-white border-violet-500 shadow-sm shadow-violet-500/20'
              : 'bg-app-bg border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          4096 bit
        </button>
        <button
          onClick={handleGen}
          disabled={loading}
          className="px-6 py-2.5 bg-violet-500 text-white rounded-xl text-sm font-medium hover:bg-violet-600 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 shadow-sm shadow-violet-500/20"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              生成中…
            </span>
          ) : (
            '🔑 生成密钥'
          )}
        </button>
      </div>

      {/* 密钥展示 */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* 私钥 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">私钥 (PRIVATE KEY)</span>
            <button
              onClick={() => copy(privateKey, 'private')}
              disabled={!privateKey}
              className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {copied === 'private' ? '✓ 已复制' : '📋 复制私钥'}
            </button>
          </div>
          <textarea
            readOnly
            value={privateKey}
            className="w-full h-96 border border-gray-300 rounded-xl p-4 font-mono text-xs bg-gray-900 text-emerald-300 focus:outline-none resize-none"
            placeholder="点击「生成密钥」后在此显示 PEM 格式私钥"
          />
        </div>

        {/* 公钥 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">公钥 (PUBLIC KEY)</span>
            <button
              onClick={() => copy(publicKey, 'public')}
              disabled={!publicKey}
              className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {copied === 'public' ? '✓ 已复制' : '📋 复制公钥'}
            </button>
          </div>
          <textarea
            readOnly
            value={publicKey}
            className="w-full h-96 border border-gray-300 rounded-xl p-4 font-mono text-xs bg-gray-900 text-emerald-300 focus:outline-none resize-none"
            placeholder="点击「生成密钥」后在此显示 PEM 格式公钥"
          />
        </div>
      </div>

      {/* 说明 */}
      <div className="mt-10 p-4 bg-gray-50 border border-app-border rounded-xl">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">说明</h3>
        <ul className="text-xs text-app-muted space-y-1.5 leading-relaxed">
          <li>• 使用 Web Crypto API 在浏览器本地生成，密钥不会离开你的设备</li>
          <li>• 私钥格式为 PKCS#8 PEM，公钥格式为 X.509 SPKI PEM</li>
          <li>• 2048 bit 兼容性最好；4096 bit 安全性更高但生成稍慢</li>
          <li>• 生成后请妥善保存私钥，丢失无法恢复</li>
        </ul>
      </div>

      <FooterNote />
    </div>
  )
}