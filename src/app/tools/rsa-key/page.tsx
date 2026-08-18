'use client'
import { useState } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
async function generateRsaKey(modulus: number): Promise<{ privatePem: string; publicPem: string }> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'RSA-OAEP', modulusLength: modulus, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['encrypt', 'decrypt']
  )

  const privateBuf = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey)
  const publicBuf = await crypto.subtle.exportKey('spki', keyPair.publicKey)

  const bufToBase64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)))

  const privateBase64 = bufToBase64(privateBuf)
  const publicBase64 = bufToBase64(publicBuf)

  const privatePem = `-----BEGIN PRIVATE KEY-----\n${privateBase64.match(/.{1,64}/g)!.join('\n')}\n-----END PRIVATE KEY-----`
  const publicPem = `-----BEGIN PUBLIC KEY-----\n${publicBase64.match(/.{1,64}/g)!.join('\n')}\n-----END PUBLIC KEY-----`

  return { privatePem, publicPem }
}

export default function RsaKeyPage() {
  const [activeBit, setActiveBit] = useState<2048 | 4096>(2048)
  const [privateKey, setPrivateKey] = useState('')
  const [publicKey, setPublicKey] = useState('')
  const [loading, setLoading] = useState(false)

  const handleGen = async () => {
    setLoading(true)
    setPrivateKey('')
    setPublicKey('')
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

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <Breadcrumb />
      <h1 className="text-2xl font-bold mb-2">RSA密钥生成</h1>
      <p className="text-gray-500 mb-4">浏览器本地生成PEM格式RSA公私钥，密钥不会上传网络</p>

      <div className="flex gap-3 mb-6 flex-wrap items-center">
        <button
          onClick={() => setActiveBit(2048)}
          className={`px-4 py-2 rounded-lg transition-all duration-200 ${
            activeBit === 2048
              ? 'bg-black text-white hover:bg-gray-800 active:bg-gray-700'
              : 'border border-gray-300 hover:bg-gray-100 active:bg-gray-200'
          }`}
        >
          2048 bit
        </button>
        <button
          onClick={() => setActiveBit(4096)}
          className={`px-4 py-2 rounded-lg transition-all duration-200 ${
            activeBit === 4096
              ? 'bg-black text-white hover:bg-gray-800 active:bg-gray-700'
              : 'border border-gray-300 hover:bg-gray-100 active:bg-gray-200'
          }`}
        >
          4096 bit
        </button>
        <button
          onClick={handleGen}
          disabled={loading}
          className="px-4 py-2 bg-black text-white rounded-lg transition-all duration-200 hover:bg-gray-800 active:bg-gray-700 disabled:opacity-50"
        >
          {loading ? '生成中…' : '生成密钥'}
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <div className="mb-1 font-medium">私钥 (PRIVATE KEY)</div>
          <textarea
            readOnly
            value={privateKey}
            className="w-full h-96 border border-gray-300 rounded-xl p-3 font-mono text-sm bg-gray-50 transition-all duration-200"
            placeholder="点击生成密钥"
          />
          <button
            onClick={() => navigator.clipboard.writeText(privateKey)}
            disabled={!privateKey}
            className="mt-3 px-3 py-1.5 border border-gray-300 rounded-md text-sm transition-all duration-200 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-40"
          >
            复制私钥
          </button>
        </div>
        <div>
          <div className="mb-1 font-medium">公钥 (PUBLIC KEY)</div>
          <textarea
            readOnly
            value={publicKey}
            className="w-full h-96 border border-gray-300 rounded-xl p-3 font-mono text-sm bg-gray-50 transition-all duration-200"
            placeholder="点击生成密钥"
          />
          <button
            onClick={() => navigator.clipboard.writeText(publicKey)}
            disabled={!publicKey}
            className="mt-3 px-3 py-1.5 border border-gray-300 rounded-md text-sm transition-all duration-200 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-40"
          >
            复制公钥
          </button>
        </div>
      </div>
    </div>
  )
}
