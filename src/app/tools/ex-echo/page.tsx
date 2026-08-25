'use client'

import { useState, useRef, useEffect } from 'react'
import { parseTxt, parseCsv, summarizeForDistill } from '@/lib/ex-echo/parseChat'

type Step = 'intake' | 'distilling' | 'chat'

export default function ExEchoPage() {
  const [step, setStep] = useState<Step>('intake')
  const [theirName, setTheirName] = useState('')
  const [echoName, setEchoName] = useState('')
  const [rawText, setRawText] = useState('')
  const [fileType, setFileType] = useState<'txt' | 'csv'>('txt')
  const [memories, setMemories] = useState('')
  const [persona, setPersona] = useState('')
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [distillStep, setDistillStep] = useState('')
  const [error, setError] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [mounted, setMounted] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  useEffect(() => {
    const saved = localStorage.getItem('ex_profile')
    if (saved) {
      try {
        const p = JSON.parse(saved)
        if (p.persona) {
          setEchoName(p.name || '')
          setTheirName(p.theirName || '')
          setPersona(p.persona)
          setMemories(p.memories || '')
          setChatHistory(p.chatHistory || [])
          setStep('chat')
        }
      } catch { }
    }
  }, [])

  async function handleDistill() {
    if (!theirName.trim() || !rawText.trim()) return alert('请填写昵称并粘贴聊天记录')
    setError('')
    setStep('distilling')
    setDistillStep('提取共同记忆中...')

    const msgs = fileType === 'txt' ? parseTxt(rawText, theirName) : parseCsv(rawText)
    const summary = summarizeForDistill(msgs, theirName)

    const memRes = await fetch('/api/ex-distill', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'memories', text: summary }),
    })
    const memData = await memRes.json()
    if (memData.error) { setError(memData.error); setStep('intake'); return }
    setMemories(memData.md)
    setDistillStep('构建五层人格中...')

    const personSummary = `对方昵称：${theirName}\n\n聊天记录摘要：\n${summary.slice(0, 5000)}`
    const perRes = await fetch('/api/ex-distill', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'persona', text: personSummary }),
    })
    const perData = await perRes.json()
    if (perData.error) { setError(perData.error); setStep('intake'); return }
    setPersona(perData.md)

    const profile = {
      name: echoName || theirName + ' 的回声',
      theirName,
      persona: perData.md,
      memories: memData.md,
      chatHistory: [],
      time: Date.now(),
    }
    localStorage.setItem('ex_profile', JSON.stringify(profile))

    setDistillStep('完成')
    setTimeout(() => setStep('chat'), 600)
  }

  async function handleSend() {
    if (!input.trim() || streaming) return
    const msg = input.trim()
    setInput('')
    const newHistory = [...chatHistory, { role: 'user' as const, content: msg }]
    setChatHistory(newHistory)
    setStreaming(true)

    const res = await fetch('/api/ex-chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ persona, memories, history: newHistory, message: msg }),
    })

    if (!res.ok || !res.body) {
      setStreaming(false)
      alert('对话请求失败')
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let assistantMsg = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const json = JSON.parse(line.slice(6))
            const token = json.choices?.[0]?.delta?.content || ''
            assistantMsg += token
            setChatHistory([...newHistory, { role: 'assistant', content: assistantMsg }])
          } catch { }
        }
      }
    }

    setStreaming(false)
    const updated = [...newHistory, { role: 'assistant' as const, content: assistantMsg }]
    setChatHistory(updated)
    const savedRaw = localStorage.getItem('ex_profile')
    if (savedRaw) {
      const saved = JSON.parse(savedRaw)
      saved.chatHistory = updated
      localStorage.setItem('ex_profile', JSON.stringify(saved))
    }
  }

  function handleExport() {
    const profile = JSON.parse(localStorage.getItem('ex_profile') || '{}')
    if (!profile.persona) return
    const skillMd = `---
name: ex_${profile.name || 'echo'}
description: ${profile.name || '某人'} 的回声人格
user-invocable: true
---

# ${profile.name || '某人'}

## PART A：共同记忆
${profile.memories || ''}

## PART B：人物性格
${profile.persona || ''}

## 运行规则
1. 收到消息 → PART B 判心情 → PART A 召回 → 用 TA 语气输出
2. Layer 0 永远优先
3. 无原材料支撑的事不说
4. 不解释自己是 AI

> 设计灵感来自 ex-skill (perkfly/ex-skill, MIT)
`
    const blob = new Blob([skillMd], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ex_${profile.name || 'echo'}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  function resetAll() {
    localStorage.removeItem('ex_profile')
    setStep('intake')
    setTheirName('')
    setEchoName('')
    setRawText('')
    setMemories('')
    setPersona('')
    setChatHistory([])
    setInput('')
    setError('')
    setShowPreview(false)
  }

  // ========= 配色 =========
  const accentMain = '#a1887f'
  const accentSoft = '#efe6dd'
  const bgBase = '#f7f4f0'
  const gridColor = 'rgba(142, 158, 173, 0.08)'
  const textPrimary = '#4a4440'
  const textSecondary = '#8b8178'
  const borderSoft = '#e5ddd5'

  if (!mounted) {
    return <div className="min-h-screen" style={{ backgroundColor: bgBase }} />
  }

  return (
    <div className="min-h-screen relative overflow-hidden font-sans antialiased selection:bg-[#a1887f]/20">

      {/* 冷色网格背景 */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundColor: bgBase,
          backgroundImage: `linear-gradient(${gridColor} 1px, transparent 1px), linear-gradient(90deg, ${gridColor} 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
          backgroundRepeat: 'repeat',
          backgroundPosition: '0 0',
        }}
      />

      {/* 双色柔和光晕 */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-32 w-[32rem] h-[32rem] rounded-full opacity-[0.15] blur-[120px] animate-pulse" style={{ background: '#d7c4b0' }} />
        <div className="absolute top-1/4 -right-28 w-[26rem] h-[26rem] rounded-full opacity-[0.12] blur-[100px] animate-pulse" style={{ background: '#9eaebd', animationDelay: '3s' }} />
        <div className="absolute -bottom-40 left-1/3 w-[30rem] h-[30rem] rounded-full opacity-[0.10] blur-[120px] animate-pulse" style={{ background: '#c9b8a8', animationDelay: '6s' }} />
      </div>

      {/* 主内容 */}
      <div className="relative z-10 w-full px-6 md:px-12 lg:px-20 xl:px-32 2xl:px-48 py-10">

        {/* 顶部导航 */}
        <div className="flex items-center justify-between mb-12">
          <button onClick={step === 'chat' ? resetAll : () => history.back()} className="text-sm transition-colors hover:opacity-80" style={{ color: textSecondary }}>
            ← {step === 'chat' ? '新建回声' : '返回工具站'}
          </button>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowInfo(true)} className="text-xs px-3 py-1.5 rounded-full border bg-white/30 backdrop-blur-md transition-all hover:bg-white/60" style={{ borderColor: borderSoft, color: textSecondary }}>
              使用说明
            </button>
            {step === 'chat' && (
              <button onClick={handleExport} className="text-xs px-4 py-2 rounded-full border bg-white/40 backdrop-blur-md transition-all hover:bg-white/60" style={{ borderColor: borderSoft, color: textSecondary }}>
                导出 SKILL.md
              </button>
            )}
          </div>
        </div>

        {/* 标题区 */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-extralight tracking-[0.15em] mb-4" style={{ color: textPrimary }}>回声</h1>
          <p className=" text-xl font-light leading-relaxed max-w-md mx-auto" style={{ color: textSecondary }}>
            将回忆蒸馏成 Skill<br />
            <span className="relative inline-block mt-1">
              <span className="relative z-10 font-normal" style={{ color: accentMain }}>不是为了挽回，而是为了记住</span>
            </span>
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50/70 border border-rose-100 rounded-2xl text-sm text-rose-500 max-w-2xl mx-auto backdrop-blur-sm">
            {error}
          </div>
        )}

        {/* ===== 录入页 ===== */}
        {step === 'intake' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white/50 backdrop-blur-xl border border-white/70 rounded-3xl p-8 space-y-6" style={{ boxShadow: '0 8px 32px rgba(161, 136, 127, 0.08), inset 0 1px 0 rgba(255,255,255,0.9)' }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-sm font-light" style={{ color: textSecondary }}>TA 的昵称 *</label>
                  <input value={theirName} onChange={e => setTheirName(e.target.value)} placeholder="比如 小A" className="w-full mt-2 px-4 py-3 bg-white/70 border rounded-2xl outline-none transition-all text-sm" style={{ borderColor: borderSoft, color: textPrimary, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.03)' }} onFocus={(e) => { e.target.style.borderColor = accentMain; e.target.style.boxShadow = `0 0 0 4px ${accentMain}15, inset 0 1px 3px rgba(0,0,0,0.03)` }} onBlur={(e) => { e.target.style.borderColor = borderSoft; e.target.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.03)' }} />
                </div>
                <div>
                  <label className="text-sm font-light" style={{ color: textSecondary }}>回声名称</label>
                  <input value={echoName} onChange={e => setEchoName(e.target.value)} placeholder="自动生成" className="w-full mt-2 px-4 py-3 bg-white/70 border rounded-2xl outline-none transition-all text-sm" style={{ borderColor: borderSoft, color: textPrimary, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.03)' }} onFocus={(e) => { e.target.style.borderColor = accentMain; e.target.style.boxShadow = `0 0 0 4px ${accentMain}15, inset 0 1px 3px rgba(0,0,0,0.03)` }} onBlur={(e) => { e.target.style.borderColor = borderSoft; e.target.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.03)' }} />
                </div>
              </div>
              <div>
                <label className="text-sm font-light" style={{ color: textSecondary }}>聊天记录 *</label>
                <div className="flex gap-3 mt-2 mb-3">
                  <FormatTab active={fileType === 'txt'} onClick={() => setFileType('txt')} accent={accentMain}>TXT</FormatTab>
                  <FormatTab active={fileType === 'csv'} onClick={() => setFileType('csv')} accent={accentMain}>CSV</FormatTab>
                </div>
                <textarea value={rawText} onChange={e => setRawText(e.target.value)} placeholder="从留痕 / WeChatMsg 导出后，粘贴到这里…" rows={14} className="w-full px-4 py-4 bg-white/70 border rounded-2xl outline-none transition-all text-sm font-mono leading-relaxed resize-none" style={{ borderColor: borderSoft, color: textPrimary, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.03)' }} onFocus={(e) => { e.target.style.borderColor = accentMain; e.target.style.boxShadow = `0 0 0 4px ${accentMain}15, inset 0 1px 3px rgba(0,0,0,0.03)` }} onBlur={(e) => { e.target.style.borderColor = borderSoft; e.target.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.03)' }} />
                <p className="text-xs mt-2 font-light" style={{ color: textSecondary }}>支持留痕导出的 TXT（带时间戳格式）或 CSV</p>
              </div>
              <button onClick={handleDistill} className="w-full py-4 rounded-2xl text-sm font-light tracking-wider text-white hover:opacity-90 active:scale-[0.985] transition-all" style={{ background: `linear-gradient(135deg, ${accentMain} 0%, #b8a094 100%)`, boxShadow: `0 6px 20px ${accentMain}25` }}>
                开始蒸馏 ✦
              </button>
            </div>
            <p className="text-center text-xs font-light" style={{ color: textSecondary }}>蒸馏约需 30-60 秒 · 由 DeepSeek-V4-Flash 驱动</p>
          </div>
        )}

        {/* ===== 蒸馏中 ===== */}
        {step === 'distilling' && (
          <div className="max-w-md mx-auto">
            <div className="bg-white/50 backdrop-blur-xl border border-white/70 rounded-3xl p-16 text-center" style={{ boxShadow: '0 8px 32px rgba(161, 136, 127, 0.08), inset 0 1px 0 rgba(255,255,255,0.9)' }}>
              <div className="text-5xl mb-5 animate-pulse opacity-80">✦</div>
              <p className="text-base font-light mb-2" style={{ color: textPrimary }}>正在蒸馏</p>
              <p className="text-sm font-light mb-8" style={{ color: textSecondary }}>{distillStep}</p>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: accentSoft }}>
                <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: distillStep.includes('记忆') ? '45%' : distillStep.includes('人格') ? '85%' : '100%', background: `linear-gradient(90deg, ${accentMain}, #b8a094)` }} />
              </div>
            </div>
          </div>
        )}

        {/* ===== 对话页 ===== */}
        {step === 'chat' && (
          <div className="max-w-3xl mx-auto space-y-5">
            <button onClick={() => setShowPreview(!showPreview)} className="w-full text-sm font-light py-2 flex items-center justify-center gap-2 transition-colors" style={{ color: textSecondary }}>
              {showPreview ? '收起' : '查看'}人格设定
              <span className="text-base transition-transform duration-300 ease-out" style={{ transform: showPreview ? 'rotate(180deg)' : 'rotate(0deg)' }}>↓</span>
            </button>

            <div className="overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]" style={{ maxHeight: showPreview ? '320px' : '0px', opacity: showPreview ? 1 : 0, transform: showPreview ? 'translateY(0)' : 'translateY(8px)', pointerEvents: showPreview ? 'auto' : 'none' }}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
                <div className="bg-white/50 backdrop-blur-xl border border-white/70 rounded-2xl p-5" style={{ boxShadow: '0 4px 20px rgba(161, 136, 127, 0.06), inset 0 1px 0 rgba(255,255,255,0.9)' }}>
                  <p className="text-sm font-light mb-2" style={{ color: textSecondary }}>Persona 人格设定</p>
                  <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed max-h-48 overflow-y-auto pr-2 custom-scrollbar" style={{ color: textPrimary }}>{persona.slice(0, 700)}…</pre>
                </div>
                <div className="bg-white/50 backdrop-blur-xl border border-white/70 rounded-2xl p-5" style={{ boxShadow: '0 4px 20px rgba(161, 136, 127, 0.06), inset 0 1px 0 rgba(255,255,255,0.9)' }}>
                  <p className="text-sm font-light mb-2" style={{ color: textSecondary }}>Memories 共同记忆</p>
                  <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed max-h-48 overflow-y-auto pr-2 custom-scrollbar" style={{ color: textPrimary }}>{memories.slice(0, 700)}…</pre>
                </div>
              </div>
            </div>

            <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-3xl p-6 h-[55vh] overflow-y-auto space-y-4 custom-scrollbar" style={{ boxShadow: '0 8px 32px rgba(161, 136, 127, 0.06), inset 0 1px 0 rgba(255,255,255,0.8)' }}>
              {chatHistory.length === 0 && (
                <div className="h-full flex items-center justify-center">
                  <p className="text-base font-light text-center" style={{ color: textSecondary }}>回声已就绪<br />说点什么吧…</p>
                </div>
              )}
              {chatHistory.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[68%] px-5 py-3 rounded-3xl text-sm font-light leading-relaxed ${m.role === 'user' ? 'text-white rounded-br-md' : 'bg-white/85 border border-white/90 rounded-bl-md'}`} style={m.role === 'user' ? { background: `linear-gradient(135deg, ${accentMain}, #b8a094)`, boxShadow: `0 4px 14px ${accentMain}20` } : { color: textPrimary, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {streaming && (
                <div className="flex justify-start">
                  <div className="bg-white/85 border border-white/90 px-5 py-3 rounded-3xl rounded-bl-md text-sm font-light animate-pulse" style={{ color: textSecondary, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>正在输入…</div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="flex gap-3">
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend() } }} placeholder="轻声说点什么…" className="flex-1 px-5 py-3.5 bg-white/60 backdrop-blur-md border rounded-2xl outline-none transition-all text-sm font-light" style={{ borderColor: borderSoft, color: textPrimary, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.03)' }} onFocus={(e) => { e.target.style.borderColor = accentMain; e.target.style.boxShadow = `0 0 0 4px ${accentMain}15, inset 0 1px 3px rgba(0,0,0,0.03)` }} onBlur={(e) => { e.target.style.borderColor = borderSoft; e.target.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.03)' }} />
              <button onClick={handleSend} disabled={streaming} className="px-7 py-3.5 rounded-2xl text-sm font-light text-white disabled:opacity-40 hover:opacity-90 active:scale-95 transition-all" style={{ background: `linear-gradient(135deg, ${accentMain}, #b8a094)`, boxShadow: `0 4px 14px ${accentMain}20` }}>发送</button>
            </div>

            <p className="text-center text-xs font-light" style={{ color: textSecondary }}>{echoName || theirName} · 回声模式</p>
          </div>
        )}

        {/* 底部声明 */}
        <div className="max-w-2xl mx-auto mt-20 pt-8" style={{ borderTop: `1px solid ${borderSoft}50` }}>
          <p className="text-xs font-light text-center leading-relaxed" style={{ color: textSecondary }}>
            聊天记录仅在浏览器本地解析，蒸馏与对话通过 DeepSeek-V4-Flash（服务端代理）完成<br />
            本工具基于 <span style={{ color: accentMain }}>ex-skill (perkfly/ex-skill, MIT)</span> 设计思路独立实现<br />
            仅用于个人回忆与情感疗愈，不鼓励不健康执念，不用于骚扰或侵犯他人隐私
          </p>
        </div>
      </div>

      {/* ===== 使用说明弹窗（带动画）===== */}
      {showInfo && (
        <>
          {/* 遮罩 - 淡入 */}
          <div
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm animate-modal-mask"
            onClick={() => setShowInfo(false)}
          />

          {/* 弹窗主体 - 从下往上弹入 + 弹性缓动 */}
          <div
            className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none"
          >
            <div
              className="relative bg-[#faf8f6] border border-white/80 rounded-3xl p-8 max-w-md w-full shadow-2xl pointer-events-auto animate-modal-body"
              style={{ boxShadow: '0 20px 60px rgba(74, 68, 64, 0.15)' }}
            >
              {/* 关闭按钮 */}
              <button
                onClick={() => setShowInfo(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-black/5"
                style={{ color: textSecondary }}
              >
                ✕
              </button>

              <h3 className="text-lg font-light mb-4" style={{ color: textPrimary }}>关于「回声」</h3>

              <div className="space-y-3 text-sm font-light leading-relaxed" style={{ color: textSecondary }}>
                <p>
                  回声是一个免费工具，由作者独立开发和维护。蒸馏和对话调用的是 DeepSeek 的 AI 接口，费用由作者承担。
                </p>
                <p>
                  为了保证服务不被滥用、同时控制成本，我做了以下限制：
                </p>

                <div className="bg-white/60 rounded-2xl p-4 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span>每 IP 每天蒸馏次数</span>
                    <span style={{ color: accentMain }}>3 次</span>
                  </div>
                  <div className="flex justify-between">
                    <span>每 IP 每天对话条数</span>
                    <span style={{ color: accentMain }}>50 条</span>
                  </div>
                  <div className="flex justify-between">
                    <span>聊天记录输入上限</span>
                    <span style={{ color: accentMain }}>100,000 字符</span>
                  </div>
                </div>

                <p>
                  这些限制足够覆盖正常的使用场景，同时防止接口被恶意刷量。如果你有特殊需求（比如聊天记录特别长），可以导出 SKILL.md 后在本地使用。
                </p>

                <p style={{ color: accentMain }}>
                  谢谢你的理解，希望回声能帮你温柔地记住那些重要的回忆 ✦
                </p>
              </div>

              <button
                onClick={() => setShowInfo(false)}
                className="mt-6 w-full py-3 rounded-2xl text-sm font-light text-white transition-all hover:opacity-90 active:scale-95"
                style={{ background: `linear-gradient(135deg, ${accentMain}, #b8a094)` }}
              >
                知道了
              </button>
            </div>
          </div>
        </>
      )}

      {/* 自定义滚动条 + 弹窗动画关键帧 */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${borderSoft}; border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: ${accentMain}50; }

        /* ===== 弹窗动画 ===== */
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-modal-mask {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .animate-modal-body {
          animation: slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
    </div>
  )
}

function FormatTab({ active, onClick, children, accent }: { active: boolean; onClick: () => void; children: React.ReactNode; accent: string }) {
  return (
    <div className={`px-4 py-2 rounded-xl text-sm font-light transition-all duration-200 ${active ? 'text-white' : 'bg-white/50 hover:bg-white/70'}`} style={active ? { background: `linear-gradient(135deg, ${accent}, #b8a094)`, boxShadow: `0 3px 10px ${accent}20` } : { color: '#8b8178' }}>
      {children}
    </div>
  )
}