'use client'
import { useState, useMemo } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

// ===== 工具函数（不变）=====
function ipToUint(ipStr: string): number {
  const parts = ipStr.split('.').map(Number)
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
}

function uintToIp(num: number): string {
  return [
    (num >>> 24) & 0xff,
    (num >>> 16) & 0xff,
    (num >>> 8) & 0xff,
    num & 0xff,
  ].join('.')
}

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
  const [copied, setCopied] = useState<string | null>(null)

  // ===== 用 useMemo 自动计算，不用点按钮 =====
  const { result, error } = useMemo(() => {
    const prefix = parseInt(prefixInput, 10)
    if (isNaN(prefix) || prefix < 0 || prefix > 32) {
      return { result: null, error: '前缀范围必须 0-32' }
    }
    const ipParts = ipInput.split('.').map(Number)
    if (ipParts.length !== 4 || ipParts.some(n => isNaN(n) || n < 0 || n > 255)) {
      return { result: null, error: 'IPv4 地址格式错误，应为 0-255 的四段数字' }
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

    const result: IpResult = {
      ip: ipInput,
      mask: maskIp,
      prefix,
      network: uintToIp(networkUint),
      broadcast: uintToIp(broadcastUint),
      firstUsable: uintToIp(firstUsableUint),
      lastUsable: uintToIp(lastUsableUint),
      totalHosts,
      usableHosts,
    }
    return { result, error: '' }
  }, [ipInput, prefixInput])

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 1500)
  }

  const rows: [string, string][] = result
    ? [
        ['IP 地址', result.ip],
        ['子网掩码', result.mask],
        ['CIDR 前缀', `/${result.prefix}`],
        ['网络地址', result.network],
        ['广播地址', result.broadcast],
        ['首个可用 IP', result.firstUsable],
        ['末尾可用 IP', result.lastUsable],
        ['总 IP 数量', String(result.totalHosts)],
        ['可用主机数量', String(result.usableHosts)],
      ]
    : []

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">IP 子网计算器</h1>
        <p className="text-app-muted text-sm">输入 IPv4 地址与掩码前缀，实时计算网段、广播地址、可用 IP 范围</p>
      </div>

      {/* 输入区 */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700">IPv4 地址</label>
          <input
            value={ipInput}
            onChange={e => setIpInput(e.target.value)}
            className="w-full border border-gray-300 rounded-xl p-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 transition-all"
            placeholder="192.168.1.10"
          />
        </div>
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700">掩码前缀 (0-32)</label>
          <input
            value={prefixInput}
            onChange={e => setPrefixInput(e.target.value)}
            className="w-full border border-gray-300 rounded-xl p-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 transition-all"
            placeholder="24"
          />
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-mono">
          ❌ {error}
        </div>
      )}

      {/* 结果区 */}
      {result && (
        <div className="space-y-3">
          {rows.map(([label, val]) => (
            <div
              key={label}
              className="border border-app-border rounded-xl p-4 flex items-center justify-between bg-app-bg hover:border-violet-200 transition-all"
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  {label}
                </div>
                <div className="font-mono text-sm text-gray-800 break-all">{val}</div>
              </div>
              <button
                onClick={() => copy(val, label)}
                className="shrink-0 ml-4 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 active:scale-95 transition-all"
              >
                {copied === label ? '✓ 已复制' : '📋 复制'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 说明 */}
      <div className="mt-10 p-4 bg-gray-50 border border-app-border rounded-xl">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">说明</h3>
        <ul className="text-xs text-app-muted space-y-1.5 leading-relaxed">
          <li>• /31 网络（点对点链路）：无网络/广播地址，2 个 IP 全部可用</li>
          <li>• /32 网络（单主机）：总 1 个 IP，可用 1 个，无广播地址</li>
          <li>• 其他前缀：网络地址和广播地址各占 1 个，可用 = 总数 - 2</li>
        </ul>
      </div>

      <FooterNote />
    </div>
  )
}