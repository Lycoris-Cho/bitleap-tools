'use client'
import { useState } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
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
      if(m) osVersion = m[1].replace(/_/g,'.')
    } else if (/Android ([0-9.]+)/.test(ua)) {
      os = 'Android'
      const m = ua.match(/Android ([0-9.]+)/)
      if(m) osVersion = m[1]
    } else if (/OS ([0-9_]+) like Mac OS X/.test(ua)) {
      os = 'iOS'
      const m = ua.match(/OS ([0-9_]+) like Mac OS X/)
      if(m) osVersion = m[1].replace(/_/g,'.')
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
    alert('已复制解析结果')
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <Breadcrumb />
      <h1 className="text-2xl font-bold mb-1">User-Agent 解析</h1>
      <p className="text-gray-500 mb-8">解析 UA 字符串，识别浏览器、操作系统、设备类型，全部本地运行</p>

      <div className="space-y-5">
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="font-medium">User-Agent 字符串</label>
            <button onClick={fillCurrentUA} className="text-sm text-blue-600 hover:underline">填入当前浏览器UA</button>
          </div>
          <textarea
            value={uaText}
            onChange={(e) => setUaText(e.target.value)}
            className="w-full h-36 border border-gray-300 rounded-xl p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-black/20 resize-none"
            placeholder="粘贴UA字符串..."
          />
        </div>

        <div className="flex gap-3">
          <button onClick={handleParse} className="px-5 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-all">解析UA</button>
          {result && <button onClick={copyResult} className="px-5 py-2 border border-gray-300 rounded-xl hover:bg-gray-100 transition-all">复制结果JSON</button>}
        </div>

        {result && (
          <div className="border border-gray-200 rounded-xl p-5 bg-gray-50">
            <h3 className="font-medium mb-4 text-lg">解析结果</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-500">浏览器</div>
                <div className="font-medium">{result.browser} {result.browserVersion}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">操作系统</div>
                <div className="font-medium">{result.os} {result.osVersion}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">设备类型</div>
                <div className="font-medium">{result.device}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">移动端</div>
                <div className="font-medium">{result.isMobile ? '✅ 是' : '❌ 否'}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
