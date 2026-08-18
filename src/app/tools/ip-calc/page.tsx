'use client'
import { useState } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
// ip转uint32
function ipToUint(ipStr: string): number {
  const parts = ipStr.split('.').map(Number)
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
}

// uint32转ip字符串
function uintToIp(num: number): string {
  return [
    (num >>> 24) & 0xff,
    (num >>> 16) & 0xff,
    (num >>> 8) & 0xff,
    num & 0xff
  ].join('.')
}

// 掩码前缀转掩码ip
function prefixToMask(prefix: number): string {
  if (prefix <= 0) return '0.0.0.0'
  if (prefix >= 32) return '255.255.255.255'
  const shift = 32 - prefix
  const maskUint = (0xffffffff << shift) >>> 0
  return uintToIp(maskUint)
}

interface IpResult {
  ip: string
  mask: string
  prefix: number
  network: string
  broadcast: string
  firstUsable: string
  lastUsable: string
  totalHosts: number
  usableHosts: number
}

export default function IPCalcPage() {
  const [ipInput, setIpInput] = useState('192.168.1.10')
  const [prefixInput, setPrefixInput] = useState('24')
  const [result, setResult] = useState<IpResult | null>(null)
  const [error, setError] = useState('')

  const handleCalc = () => {
    setError('')
    setResult(null)
    const prefix = parseInt(prefixInput, 10)
    if (isNaN(prefix) || prefix < 0 || prefix > 32) {
      setError('前缀范围必须 0-32')
      return
    }
    const ipParts = ipInput.split('.').map(Number)
    if (ipParts.length !== 4 || ipParts.some(n => isNaN(n) || n < 0 || n > 255)) {
      setError('IPv4地址格式错误')
      return
    }

    const maskIp = prefixToMask(prefix)
    const ipUint = ipToUint(ipInput)
    const maskUint = ipToUint(maskIp)
    const networkUint = (ipUint & maskUint) >>> 0
    const hostBits = 32 - prefix
    const hostMask = ((1 << hostBits) - 1) >>> 0
    const broadcastUint = (networkUint | hostMask) >>> 0

    const totalHosts = hostBits === 0 ? 1 : 2 ** hostBits
    let usableHosts = totalHosts
    if (prefix !== 32 && prefix !== 31) {
      usableHosts = totalHosts - 2
    }

    let firstUsableUint = networkUint
    let lastUsableUint = broadcastUint
    if (prefix < 31) {
      firstUsableUint = (networkUint + 1) >>> 0
      lastUsableUint = (broadcastUint - 1) >>> 0
    }

    setResult({
      ip: ipInput,
      mask: maskIp,
      prefix,
      network: uintToIp(networkUint),
      broadcast: uintToIp(broadcastUint),
      firstUsable: uintToIp(firstUsableUint),
      lastUsable: uintToIp(lastUsableUint),
      totalHosts,
      usableHosts
    })
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <Breadcrumb />
      <h1 className="text-2xl font-bold mb-2">IP子网计算器</h1>
      <p className="text-gray-500 mb-6">输入IP与掩码前缀，计算网段、广播、可用IP数量</p>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block mb-1.5 font-medium">IPv4地址</label>
          <input
            value={ipInput}
            onChange={e => setIpInput(e.target.value)}
            className="w-full border border-gray-300 rounded-xl p-3 font-mono transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-black/20"
            placeholder="192.168.1.10"
          />
        </div>
        <div>
          <label className="block mb-1.5 font-medium">掩码前缀 (0-32)</label>
          <input
            value={prefixInput}
            onChange={e => setPrefixInput(e.target.value)}
            className="w-full border border-gray-300 rounded-xl p-3 font-mono transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-black/20"
            placeholder="24"
          />
        </div>
      </div>

      <button
        onClick={handleCalc}
        className="px-4 py-2 bg-black text-white rounded-lg transition-all duration-200 hover:bg-gray-800 active:bg-gray-700 mb-6"
      >
        计算
      </button>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      {result && (
        <div className="space-y-3">
          {[
            ['IP地址', result.ip],
            ['子网掩码', result.mask],
            ['CIDR前缀', `/${result.prefix}`],
            ['网络地址(网段)', result.network],
            ['广播地址', result.broadcast],
            ['首个可用IP', result.firstUsable],
            ['末尾可用IP', result.lastUsable],
            ['总IP数量', String(result.totalHosts)],
            ['可用主机数量', String(result.usableHosts)]
          ].map(([label, val]) => (
            <div key={label} className="border border-gray-200 rounded-xl p-4 flex justify-between items-center bg-app-bg">
              <div className="flex-1 mr-4">
                <div className="text-sm text-gray-500">{label}</div>
                <div className="font-mono mt-1 break-all">{val}</div>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(val)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm transition-all duration-200 hover:bg-gray-100 active:bg-gray-200"
              >
                复制
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
