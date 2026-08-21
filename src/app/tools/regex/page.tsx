'use client'

import { useState } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

type Rule = {
  id: string
  label: string
  build: (opts: Record<string, any>) => { pattern: string; desc: string }
}

const RULES: Rule[] = [
  {
    id: 'email',
    label: '邮箱',
    build: () => ({
      pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
      desc: '匹配标准邮箱地址',
    }),
  },
  {
    id: 'phone',
    label: '手机号（中国大陆）',
    build: () => ({
      pattern: '^1[3-9]\\d{9}$',
      desc: '匹配中国大陆 11 位手机号',
    }),
  },
  {
    id: 'url',
    label: 'URL',
    build: () => ({
      pattern: '^https?:\\/\\/[^\\s/$.?#][^\\s]*$',
      desc: '匹配 http / https 链接',
    }),
  },
  {
    id: 'chinese',
    label: '中文',
    build: () => ({
      pattern: '[\\u4e00-\\u9fa5]+',
      desc: '匹配中文字符',
    }),
  },
  {
    id: 'number',
    label: '数字',
    build: (opts) => {
      const intOnly = opts.intOnly
      const pattern = intOnly ? '^\\d+$' : '^\\d+(\\.\\d+)?$'
      const desc = intOnly ? '匹配整数' : '匹配整数或小数'
      return { pattern, desc }
    },
  },
  {
    id: 'idcard',
    label: '身份证号（18位）',
    build: () => ({
      pattern: '^\\d{17}[\\dXx]$',
      desc: '匹配 18 位中国大陆身份证号',
    }),
  },
  {
    id: 'password',
    label: '强密码',
    build: (opts) => {
      const parts: string[] = []
      if (opts.lowercase) parts.push('a-z')
      if (opts.uppercase) parts.push('A-Z')
      if (opts.number) parts.push('0-9')
      if (opts.symbol) parts.push('!@#$%^&*]')
      const charset = parts.join('')
      const min = opts.minLength || 8
      const pattern = `^[${charset}]{${min},}$`
      const desc = `至少 ${min} 位，包含 ${parts.join('、')}`
      return { pattern, desc }
    },
  },
  {
    id: 'whitespace',
    label: '首尾空白',
    build: () => ({
      pattern: '^\\s+|\\s+$',
      desc: '匹配字符串首尾的空白字符',
    }),
  },
  {
    id: 'empty-line',
    label: '空行',
    build: () => ({
      pattern: '^\\s*$',
      desc: '匹配空行或只包含空白的行',
    }),
  },
]

export default function RegexGeneratorPage() {
  const [type, setType] = useState('email')
  const [flags, setFlags] = useState({
    g: false,
    i: true,
    m: false,
    s: false,
    u: false,
  })
  const [copied, setCopied] = useState(false)

  const [opts, setOpts] = useState<Record<string, any>>({
    intOnly: false,
    lowercase: true,
    uppercase: true,
    number: true,
    symbol: true,
    minLength: 8,
  })

  const rule = RULES.find((r) => r.id === type)!
  const result = rule.build(opts)

  const flagStr = Object.entries(flags)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join('')

  const regex = `/${result.pattern}/${flagStr}`

  const copy = async () => {
    await navigator.clipboard.writeText(regex)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const toggleFlag = (k: keyof typeof flags) =>
    setFlags((f) => ({ ...f, [k]: !f[k] }))

  const updateOpt = (k: string, v: any) =>
    setOpts((o) => ({ ...o, [k]: v }))

  const reset = () => {
    setType('email')
    setFlags({ g: false, i: true, m: false, s: false, u: false })
    setOpts({
      intOnly: false,
      lowercase: true,
      uppercase: true,
      number: true,
      symbol: true,
      minLength: 8,
    })
    setCopied(false)
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">正则表达式生成器</h1>
        <p className="text-app-muted text-sm">通过可视化配置生成常用正则表达式，无需手写</p>
      </div>

      {/* 匹配类型 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">匹配类型</label>
        <div className="flex flex-wrap gap-3">
          {RULES.map((r) => (
            <button
              key={r.id}
              onClick={() => setType(r.id)}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                type === r.id
                  ? 'bg-violet-500 text-white shadow-sm shadow-violet-500/20'
                  : 'bg-app-bg border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* 选项（动态） */}
      {type === 'number' && (
        <div className="mb-6">
          <label className="flex items-center gap-3 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={opts.intOnly}
              onChange={(e) => updateOpt('intOnly', e.target.checked)}
              className="w-4 h-4 accent-violet-500"
            />
            仅整数（不勾选则支持小数）
          </label>
        </div>
      )}

      {type === 'password' && (
        <div className="mb-6 space-y-4">
          <div className="text-sm font-medium text-gray-700">必须包含：</div>
          <div className="flex flex-wrap gap-4">
            {[
              { k: 'lowercase', label: '小写字母' },
              { k: 'uppercase', label: '大写字母' },
              { k: 'number', label: '数字' },
              { k: 'symbol', label: '特殊字符' },
            ].map(({ k, label }) => (
              <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={opts[k]}
                  onChange={(e) => updateOpt(k, e.target.checked)}
                  className="w-4 h-4 accent-violet-500"
                />
                {label}
              </label>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-700">最小长度</span>
            <input
              type="number"
              value={opts.minLength}
              onChange={(e) => updateOpt('minLength', Number(e.target.value))}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
        </div>
      )}

      {/* Flags */}
      <div className="mb-8">
        <div className="text-sm font-medium text-gray-700 mb-3">修饰符</div>
        <div className="flex gap-3 flex-wrap">
          {(['g', 'i', 'm', 's', 'u'] as const).map((f) => (
            <label key={f} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={flags[f]}
                onChange={() => toggleFlag(f)}
                className="w-4 h-4 accent-violet-500"
              />
              <span className="font-mono text-gray-700">{f}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 结果 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">生成结果</span>
          <button
            onClick={copy}
            className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 active:scale-95 transition-all"
          >
            {copied ? '✓ 已复制' : '📋 复制正则'}
          </button>
        </div>
        <div className="p-5 bg-gray-900 border border-app-border rounded-xl overflow-auto">
          <pre className="text-sm font-mono text-emerald-300 break-all">{regex}</pre>
        </div>
        <div className="mt-2 text-sm text-app-muted">{result.desc}</div>
      </div>

      {/* 重置 */}
      <div className="flex justify-end mb-6">
        <button
          onClick={reset}
          className="px-5 py-2.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-xl text-sm font-medium hover:bg-orange-100 active:scale-95 transition-all"
        >
          重置
        </button>
      </div>

      {/* 说明卡片 */}
      <div className="mt-10 p-4 bg-gray-50 border border-app-border rounded-xl">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">使用说明</h3>
        <ul className="text-xs text-app-muted space-y-1.5 leading-relaxed">
          <li>• 生成的为正则表达式字面量格式（含斜杠），可直接用于 JavaScript / TypeScript</li>
          <li>• 点击修饰符复选框可切换 g / i / m / s / u 标志</li>
          <li>• 密码规则支持自定义字符类型和最小长度</li>
          <li>• 复杂业务场景建议在此基础上手动微调</li>
          <li>• 所有操作在浏览器本地完成</li>
        </ul>
      </div>

      <FooterNote />
    </div>
  )
}