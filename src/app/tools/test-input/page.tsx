'use client'

import { groups as defaultGroups } from './payloads'
import { useState } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

interface CustomField {
  id: string
  name: string
  values: string[]
}

export default function LoginFuzzer() {
  const [activeGroup, setActiveGroup] = useState(defaultGroups[0].label)
  const [copied, setCopied] = useState<string | null>(null)

  // 自定义字段
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [fieldName, setFieldName] = useState('')
  const [fieldValues, setFieldValues] = useState('')

  const isCustom = activeGroup === '__custom__'
  const currentGroup = isCustom ? null : defaultGroups.find(g => g.label === activeGroup)

  const copy = async (value: string, key: string) => {
    await navigator.clipboard.writeText(value)
    setCopied(key)
    setTimeout(() => setCopied(null), 1200)
  }

  const copyAll = async (items: { label: string; value: string }[]) => {
    const text = items.map(i => `${i.label}: ${i.value || '(空)'}`).join('\n')
    await navigator.clipboard.writeText(text)
    setCopied('all')
    setTimeout(() => setCopied(null), 1200)
  }

  const addCustomField = () => {
    if (!fieldName.trim() || !fieldValues.trim()) return
    const values = fieldValues.split('\n').map(v => v.trim()).filter(Boolean)
    setCustomFields(prev => [...prev, { id: Date.now().toString(), name: fieldName.trim(), values }])
    setFieldName('')
    setFieldValues('')
  }

  const removeCustomField = (id: string) => {
    setCustomFields(prev => prev.filter(f => f.id !== id))
  }

  return (
    <div className="flex w-full h-[calc(100vh-4rem)] overflow-hidden bg-gray-50/50">
      {/* 左侧：分类导航 */}
      <div className="w-48 shrink-0 h-full overflow-y-auto border-r border-app-border/60 bg-app-bg/80 backdrop-blur-xl p-3 space-y-1">
        <div className="px-3 py-2 mb-2">
          <h2 className="text-xs font-bold text-app-muted uppercase tracking-wider">预设分类</h2>
        </div>
        {defaultGroups.map(g => (
          <button
            key={g.label}
            onClick={() => setActiveGroup(g.label)}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${activeGroup === g.label
                ? 'bg-gray-900 text-white shadow-md'
                : 'text-app-muted hover:bg-gray-100'
              }`}
          >
            <span className="truncate block">{g.label}</span>
            <span className={`text-xs ${activeGroup === g.label ? 'text-gray-300' : 'text-app-muted'}`}>
              {g.items.length} 条
            </span>
          </button>
        ))}

        {/* 自定义字段入口 */}
        <div className="border-t border-app-border/60 mt-3 pt-3">
          <button
            onClick={() => setActiveGroup('__custom__')}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isCustom
                ? 'bg-gray-900 text-white shadow-md'
                : 'text-app-muted hover:bg-gray-100'
              }`}
          >
            <span className="truncate block">＋ 自定义字段</span>
            <span className={`text-xs ${isCustom ? 'text-gray-300' : 'text-app-muted'}`}>
              {customFields.length} 个
            </span>
          </button>
        </div>
      </div>

      {/* 右侧：内容区 */}
      <div className="flex-1 h-full overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          {/* 标题 */}
          <div className="mb-6">
            <Breadcrumb />
            {!isCustom ? (
              <>
                <h1 className="text-2xl font-black text-app-text mb-1">{currentGroup!.label}</h1>
                <p className="text-sm text-gray-500">点击复制，粘贴到被测系统的表单中</p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-black text-app-text mb-1">＋ 自定义测试字段</h1>
                <p className="text-sm text-gray-500">添加你自己的字段名和测试值，生成专属弹药</p>
              </>
            )}
          </div>

          {/* 预设分类内容 */}
          {!isCustom && currentGroup && (
            <>
              <div className="bg-app-bg/80 backdrop-blur-xl border border-app-border/60 rounded-2xl overflow-hidden">
                {currentGroup.items.map((item, i) => {
                  const key = `${currentGroup.label}-${item.label}`
                  return (
                    <div
                      key={key}
                      className={`flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition ${i !== currentGroup.items.length - 1 ? 'border-b border-gray-100' : ''
                        }`}
                    >
                      <code className="flex-1 text-sm text-gray-800 font-mono bg-gray-50 px-3 py-2 rounded-lg truncate">
                        {item.value || '(空字符串)'}
                      </code>
                      <span className="text-xs text-app-muted shrink-0 w-20 text-right">{item.label}</span>
                      <button
                        onClick={() => copy(item.value, key)}
                        className="shrink-0 px-3.5 py-2 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 active:scale-95 transition-all"
                      >
                        {copied === key ? '✓ 已复制' : '复制'}
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* 复制全部 */}
              <button
                onClick={() => copyAll(currentGroup.items)}
                className="mt-4 text-sm text-gray-500 hover:text-app-text transition"
              >
                {copied === 'all' ? '✓ 已复制全部' : '📋 复制该分类全部'}
              </button>
            </>
          )}

          {/* 自定义字段内容 */}
          {isCustom && (
            <div className="space-y-5">
              {/* 添加表单 */}
              <div className="bg-app-bg/80 backdrop-blur-xl border border-dashed border-gray-300 rounded-2xl p-5">
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="字段名，如：手机号 / 验证码"
                    value={fieldName}
                    onChange={e => setFieldName(e.target.value)}
                    className="flex-1 px-4 py-2.5 text-sm border border-app-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
                <textarea
                  placeholder={'每行一个测试值，如：\n13800138000\n123456\nabc'}
                  value={fieldValues}
                  onChange={e => setFieldValues(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 text-sm border border-app-border rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                />
                <div className="mt-3 flex justify-between items-center">
                  <span className="text-xs text-app-muted">{fieldValues.split('\n').filter(Boolean).length} 个值</span>
                  <button
                    onClick={addCustomField}
                    className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 active:scale-95 transition-all"
                  >
                    添加到列表
                  </button>
                </div>
              </div>

              {/* 已添加的自定义字段 */}
              {customFields.length === 0 ? (
                <p className="text-center text-sm text-app-muted py-10">还没有自定义字段，在上方添加</p>
              ) : (
                <div className="space-y-3">
                  {customFields.map(field => (
                    <div key={field.id} className="bg-app-bg border border-app-border rounded-2xl overflow-hidden">
                      <div className="px-5 py-3 flex items-center justify-between bg-gray-50 border-b border-gray-100">
                        <span className="text-sm font-semibold text-app-text">{field.name}</span>
                        <button
                          onClick={() => removeCustomField(field.id)}
                          className="text-xs text-red-500 hover:text-red-700 transition"
                        >
                          删除
                        </button>
                      </div>
                      <div className="p-3 space-y-2">
                        {field.values.map((val, i) => (
                          <div key={i} className="flex items-center gap-3 px-2 py-2">
                            <code className="flex-1 text-sm font-mono bg-gray-50 px-3 py-2 rounded-lg truncate">
                              {val || '(空)'}
                            </code>
                            <button
                              onClick={() => copy(val, `${field.id}-${i}`)}
                              className="shrink-0 px-3.5 py-2 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 active:scale-95 transition-all"
                            >
                              {copied === `${field.id}-${i}` ? '✓' : '复制'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <FooterNote />
        </div>
      </div>
    </div>
  )
}