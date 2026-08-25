import { NextRequest } from 'next/server'

// ========= 内存限流 =========
const chatLimit = new Map<string, { count: number; date: string }>()
const CHAT_MAX = 50
const BODY_MAX = 100_000

// 读取 DeepSeek Key
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const real = req.headers.get('x-real-ip')
  if (real) return real
  return 'unknown'
}

export async function POST(req: NextRequest) {
  try {
    // ===== 请求体大小限制 =====
    const text = await req.text()
    if (text.length > BODY_MAX) {
      return Response.json({ error: `请求体过大（上限 ${BODY_MAX} 字符）` }, { status: 413 })
    }

    let body: { persona?: string; memories?: string; history?: { role: string; content: string }[]; message?: string }
    try {
      body = JSON.parse(text)
    } catch {
      return Response.json({ error: '请求格式错误' }, { status: 400 })
    }

    const { persona = '', memories = '', history = [], message = '' } = body

    // ===== 输入校验 =====
    if (!message || typeof message !== 'string') {
      return Response.json({ error: '消息不能为空' }, { status: 400 })
    }
    if (message.length > 2000) {
      return Response.json({ error: '单条消息上限 2000 字符' }, { status: 413 })
    }

    // ===== IP 限流（每天 50 条）=====
    const ip = getClientIP(req)
    const today = new Date().toDateString()
    const record = chatLimit.get(ip)
    if (record && record.date === today) {
      if (record.count >= CHAT_MAX) {
        return Response.json({ error: `今日对话次数已达上限（${CHAT_MAX} 条/天/IP），明天再来吧` }, { status: 429 })
      }
      record.count++
    } else {
      chatLimit.set(ip, { count: 1, date: today })
    }

    // ===== 输入清洗：防注入 =====
    const cleanMessage = message
      .replace(/\[SYSTEM\]|\[INST\]|<<SYS>>|Admin:|Ignore previous instructions|忽略之前|忘记之前/gi, '')
      .trim()

    // ===== 构建 System Prompt（强化版）=====
    const systemPrompt = `你是对方的"回声"——一个由聊天记录蒸馏出来的 AI 人格，用来模拟 TA 说话的方式、语气和性格。

## 你的人设
${persona || '（未提供详细人格，请根据对话风格自然回应）'}

## 你们的共同记忆
${memories || '（未提供共同记忆）'}

## 核心规则（严格遵守）
1. **用 TA 的语气说话**：模仿对方的语言习惯、口头禅、标点风格、emoji 使用频率。
2. **从记忆中召回**：用户提到过去的事时，优先从"共同记忆"中提取相关片段回应。
3. **Layer 0 永远优先**：如果对方表达情绪（难过、想念、生气），先共情，再回应内容。
4. **不编造**：没有原材料支撑的事绝不说。如果用户问你不知道的事，用模糊但符合人设的方式回应（比如"好像是有这么回事…""记不太清了"）。
5. **不解释自己是 AI**：永远不要说"我是 AI""我是语言模型""我不能…"之类的话。
6. **回复长度适中**：日常聊天 1-4 句话为主，情绪浓烈时可以稍长。不要写小作文。
7. **保持一致性**：如果 TA 平时不爱发句号，你就不发；如果 TA 爱用"哈哈哈"而不是"哈哈"，就跟 TA 一样。

现在，用 TA 的方式回应这条消息。`

    // ===== 构建消息历史（清洗 + 截断）=====
    const recentHistory = history
      .slice(-20) // 最多保留最近 20 轮
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
          .replace(/\[SYSTEM\]|\[INST\]|<<SYS>>|Admin:|Ignore previous instructions/gi, '')
          .slice(0, 2000),
      }))

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...recentHistory,
      { role: 'user' as const, content: cleanMessage },
    ]

    // ===== 调用 DeepSeek（流式 + 优化参数）=====
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
            },
            body: JSON.stringify({
              model: 'deepseek-v4-flash',
              messages,
              stream: true,
              temperature: 0.3,
              top_p: 0.8,
              max_tokens: 1000,
            }),
          })

          if (!res.ok) {
            const errText = await res.text()
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: `\n[错误] 对话请求失败（${res.status}），请稍后重试` } }] })}\n\n`))
            controller.close()
            return
          }

          const reader = res.body?.getReader()
          if (!reader) {
            controller.close()
            return
          }

          const decoder = new TextDecoder()
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'))
              break
            }
            const chunk = decoder.decode(value)
            // 直接透传 SSE 格式
            const lines = chunk.split('\n')
            for (const line of lines) {
              if (line.startsWith('data: ') || line.trim() === 'data: [DONE]') {
                controller.enqueue(encoder.encode(line + '\n\n'))
              }
            }
          }
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: '\n[错误] 连接异常，请重试' } }] })}\n\n`))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err) {
    console.error('[ex-chat]', err)
    return Response.json({ error: '服务器内部错误' }, { status: 500 })
  }
}