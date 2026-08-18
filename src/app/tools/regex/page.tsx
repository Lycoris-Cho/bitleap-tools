'use client'

import { useState } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
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

  const copy = () => navigator.clipboard.writeText(regex)

  const toggleFlag = (k: keyof typeof flags) =>
    setFlags((f) => ({ ...f, [k]: !f[k] }))

  const updateOpt = (k: string, v: any) =>
    setOpts((o) => ({ ...o, [k]: v }))

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      {/* 标题 */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          正则表达式生成器
        </h1>
        <p className="text-app-muted">
          通过可视化配置生成常用正则表达式，无需手写
        </p>
      </div>

      {/* 匹配类型 */}
      <div className="mb-8">
        <label className="block text-sm font-medium mb-3">
          匹配类型
        </label>
        <div className="flex flex-wrap gap-3">
          {RULES.map((r) => (
            <button
              key={r.id}
              onClick={() => setType(r.id)}
              className={`px-5 py-3 rounded-xl border text-sm font-medium transition ${
                type === r.id
                  ? 'bg-black text-white border-black'
                  : 'bg-app-bg text-gray-800 border-gray-300'
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
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={opts.intOnly}
              onChange={(e) => updateOpt('intOnly', e.target.checked)}
            />
            仅整数（不勾选则支持小数）
          </label>
        </div>
      )}

      {type === 'password' && (
        <div className="mb-6 space-y-4">
          <div className="text-sm font-medium">必须包含：</div>
          <div className="flex flex-wrap gap-4">
            {[
              { k: 'lowercase', label: '小写字母' },
              { k: 'uppercase', label: '大写字母' },
              { k: 'number', label: '数字' },
              { k: 'symbol', label: '特殊字符' },
            ].map(({ k, label }) => (
              <label key={k} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={opts[k]}
                  onChange={(e) => updateOpt(k, e.target.checked)}
                />
                {label}
              </label>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm">最小长度</span>
            <input
              type="number"
              value={opts.minLength}
              onChange={(e) => updateOpt('minLength', Number(e.target.value))}
              className="w-24 px-3 py-2 border rounded-lg text-sm"
            />
          </div>
        </div>
      )}

      {/* flags */}
      <div className="mb-8">
        <div className="text-sm font-medium mb-3">修饰符</div>
        <div className="flex gap-3 flex-wrap">
          {(['g', 'i', 'm', 's', 'u'] as const).map((f) => (
            <label
              key={f}
              className="flex items-center gap-2 text-sm cursor-pointer"
            >
              <input
                type="checkbox"
                checked={flags[f]}
                onChange={() => toggleFlag(f)}
              />
              <span className="font-mono">{f}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 结果 */}
      <div className="mb-6">
        <div className="text-sm font-medium mb-2">生成结果</div>
        <div className="p-5 bg-gray-50 border rounded-xl">
          <pre className="text-sm font-mono break-all">{regex}</pre>
        </div>
        <div className="mt-2 text-sm text-app-muted">
          {result.desc}
        </div>
        <button
          onClick={copy}
          className="mt-4 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition font-medium"
        >
          复制正则
        </button>
      </div>

      {/* 说明 */}
      <div className="text-sm text-gray-500 leading-relaxed">
        <p>
          生成的为正则表达式字面量格式，可直接用于 JavaScript / TypeScript。
        </p>
        <p className="mt-1">
          复杂场景（如业务规则校验）建议在此基础上微调。
        </p>
      </div>
    </div>
  )
}