'use client'
import { useState } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

interface UaResult {
  browser: string
  browserVersion: string
  os: string
  osVersion: string
  device: string
  isMobile: boolean
}

export default function UAParserPage() {
  const [uaText, setUaText] = useState<string>('')
  const [result, setResult] = useState<UaResult | null>(null)
  const [copied, setCopied] = useState(false)

  const parseUA = (ua: string): UaResult => {
    let browser = 'Unknown'
    let browserVersion = ''
    let os = 'Unknown'
    let osVersion = ''
    let device = 'Desktop'
    let isMobile = false

    // Mobile
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
      isMobile = true
      if (/iPad/.test(ua)) device = 'Tablet'
      else if (/Android/.test(ua)) device = 'Android Phone'
      else if (/iPhone/.test(ua)) device = 'iPhone'
      else device = 'Mobile'
    }

    // Chrome
    const chromeMatch = ua.match(/Chrome\/([0-9.]+)/)
    if (chromeMatch) {
      browser = 'Chrome'
      browserVersion = chromeMatch[1]
    }
    // Safari
    const safariMatch = ua.match(/Version\/([0-9.]+).*Safari/)
    if (safariMatch && !chromeMatch) {
      browser = 'Safari'
      browserVersion = safariMatch[1]
    }
    // Firefox
    const ffMatch = ua.match(/Firefox\/([0-9.]+)/)
    if (ffMatch) {
      browser = 'Firefox'
      browserVersion = ffMatch[1]
    }
    // Edge
    const edgeMatch = ua.match(/Edg\/([0-9.]+)/)
    if (edgeMatch) {
      browser = 'Edge'
      browserVersion = edgeMatch[1]
    }

    // OS
    if (/Windows NT 10/.test(ua)) {
      os = 'Windows'
      osVersion = '10/11'
    } else if (/Mac OS X ([0-9_\.]+)/.test(ua)) {
      os = 'macOS'
      const m = ua.match(/Mac OS X ([0-9_\.]+)/)
      if (m) osVersion = m[1].replace(/_/g, '.')
    } else if (/Android ([0-9.]+)/.test(ua)) {
      os = 'Android'
      const m = ua.match(/Android ([0-9.]+)/)
      if (m) osVersion = m[1]
    } else if (/OS ([0-9_]+) like Mac OS X/.test(ua)) {
      os = 'iOS'
      const m = ua.match(/OS ([0-9_]+) like Mac OS X/)
      if (m) osVersion = m[1].replace(/_/g, '.')
    }

    return { browser, browserVersion, os, osVersion, device, isMobile }
  }

  const handleParse = () => {
    if (!uaText.trim()) return
    const data = parseUA(uaText)
    setResult(data)
  }

  const fillCurrentUA = () => {
    setUaText(navigator.userAgent)
  }

  const copyResult = async () => {
    if (!result) return
    const text = JSON.stringify(result, null, 2)
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">User-Agent 解析</h1>
        <p className="text-app-muted text-sm">解析 UA 字符串，识别浏览器、操作系统、设备类型，全部本地运行</p>
      </div>

      <div className="space-y-5">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-gray-700">User-Agent 字符串</label>
            <button onClick={fillCurrentUA} className="text-sm text-violet-600 hover:underline font-medium">
              填入当前浏览器 UA
            </button>
          </div>
          <textarea
            value={uaText}
            onChange={(e) => setUaText(e.target.value)}
            className="w-full h-36 px-4 py-3 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
            placeholder="粘贴 UA 字符串..."
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleParse}
            className="px-5 py-2.5 bg-violet-500 text-white text-sm font-medium rounded-lg hover:bg-violet-600 active:scale-95 transition-all shadow-sm shadow-violet-500/20"
          >
            解析 UA
          </button>
          {result && (
            <button
              onClick={copyResult}
              className="px-5 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 active:scale-95 transition-all"
            >
              {copied ? '✓ 已复制' : '📋 复制结果 JSON'}
            </button>
          )}
        </div>

        {result && (
          <div className="border border-app-border rounded-xl p-5 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">解析结果</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div>
                <div className="text-xs text-app-muted mb-1">浏览器</div>
                <div className="font-medium text-gray-800">{result.browser} {result.browserVersion}</div>
              </div>
              <div>
                <div className="text-xs text-app-muted mb-1">操作系统</div>
                <div className="font-medium text-gray-800">{result.os} {result.osVersion}</div>
              </div>
              <div>
                <div className="text-xs text-app-muted mb-1">设备类型</div>
                <div className="font-medium text-gray-800">{result.device}</div>
              </div>
              <div>
                <div className="text-xs text-app-muted mb-1">移动端</div>
                <div className="font-medium text-gray-800">{result.isMobile ? '✅ 是' : '❌ 否'}</div>
              </div>
            </div>
            {/* JSON 代码块 */}
            <div className="p-4 bg-gray-900 rounded-xl overflow-auto">
              <pre className="text-xs font-mono text-emerald-300 whitespace-pre-wrap break-all">
{JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* 说明卡片 */}
      <div className="mt-10 p-4 bg-gray-50 border border-app-border rounded-xl">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">使用说明</h3>
        <ul className="text-xs text-app-muted space-y-1.5 leading-relaxed">
          <li>• 粘贴任意 User-Agent 字符串，点击「解析 UA」即可识别浏览器、操作系统和设备类型</li>
          <li>• 点击「填入当前浏览器 UA」可快速解析当前访问环境</li>
          <li>• 解析结果以结构化 JSON 展示，点击「复制结果 JSON」可直接粘贴到项目中</li>
          <li>• 所有解析在浏览器本地完成，UA 字符串不会上传到任何服务器</li>
        </ul>
      </div>

      <FooterNote />
    </div>
  )
}