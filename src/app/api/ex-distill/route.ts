import { NextRequest } from 'next/server'

// ========= 内存限流 =========
const distillLimit = new Map<string, { count: number; date: string }>()
const DISTILL_MAX = 3
const BODY_MAX = 100_000

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
    const text = await req.text()
    if (text.length > BODY_MAX) {
      return Response.json({ error: `请求体过大（上限 ${BODY_MAX} 字符）` }, { status: 413 })
    }

    let body: { kind?: string; text?: string }
    try {
      body = JSON.parse(text)
    } catch {
      return Response.json({ error: '请求格式错误' }, { status: 400 })
    }

    const { kind, text: inputText } = body
    if (!kind || !inputText || typeof inputText !== 'string') {
      return Response.json({ error: '参数缺失' }, { status: 400 })
    }
    if (inputText.length > BODY_MAX) {
      return Response.json({ error: '输入文本过长' }, { status: 413 })
    }

    // ===== IP 限流（每天 3 次）=====
    const ip = getClientIP(req)
    const today = new Date().toDateString()
    const record = distillLimit.get(ip)
    if (record && record.date === today) {
      if (record.count >= DISTILL_MAX) {
        return Response.json({ error: `今日蒸馏次数已达上限（${DISTILL_MAX} 次/天/IP），明天再来吧` }, { status: 429 })
      }
      record.count++
    } else {
      distillLimit.set(ip, { count: 1, date: today })
    }

    // ===== 构建 Prompt =====
    let systemPrompt = ''
    let userPrompt = ''

    if (kind === 'memories') {
      systemPrompt = `你是一个情感分析师。你的任务是从聊天记录摘要中提取"共同记忆"。

要求：
1. 按时间线或主题分类，提取 8-15 个关键记忆片段。
2. 每个片段包含：时间背景（如"刚认识时""吵架后"）、事件、双方的情绪状态。
3. 用 Markdown 列表格式输出，每条 1-3 句话。
4. 不要编造，只基于提供的摘要提取。
5. 语言风格：温暖、客观、有画面感。

输出格式示例：
- **初识**：在XX场合认识，TA当时说了XX，给人感觉XX
- **第一次深夜长谈**：聊到凌晨，TA分享了XX，语气变得柔软
- **那次争执**：因为XX吵架，TA的反应是XX，后来XX和好`
      userPrompt = inputText.slice(0, 60000)
    } else if (kind === 'persona') {
      systemPrompt = `你是一个人格建模专家。你的任务是基于聊天记录摘要，构建一个"五层人格模型"。

要求：
1. 输出以下五层，每层用 Markdown 小标题：
   - ### Layer 1：表层人设（社交面具、说话方式、常用表情）
   - ### Layer 2：情绪底色（面对压力/开心/难过时的真实反应）
   - ### Layer 3：深层性格（价值观、底线、在乎的东西）
   - ### Layer 4：关系模式（在亲密关系中的行为模式、依恋风格）
   - ### Layer 5：隐藏面（不会轻易展示的一面、矛盾点）
2. 每层 2-4 句话，基于聊天记录中的具体表现来推断，不要空泛。
3. 如果信息不足，诚实标注"信息不足，无法判断"，不要硬编。
4. 最后加一句"核心总结：一句话概括这个人"。

输出必须严格使用 Markdown 格式。`
      userPrompt = inputText.slice(0, 60000)
    } else {
      return Response.json({ error: '未知蒸馏类型' }, { status: 400 })
    }

    // ===== 调用 DeepSeek（优化参数）=====
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 90000) // 90 秒超时

    try {
      const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'deepseek-v4-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          stream: false,
          temperature: 0.3,
          top_p: 0.8,
          max_tokens: 3000,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (!res.ok) {
        const errText = await res.text()
        console.error('[ex-distill] DeepSeek error:', res.status, errText)
        return Response.json({ error: `蒸馏失败（${res.status}），请稍后重试` }, { status: 502 })
      }

      const data = await res.json()
      const md = data.choices?.[0]?.message?.content || ''

      if (!md) {
        return Response.json({ error: '蒸馏结果为空，请重试' }, { status: 502 })
      }

      return Response.json({ md })
    } catch (fetchErr: any) {
      if (fetchErr.name === 'AbortError') {
        return Response.json({ error: '蒸馏超时（90秒），聊天记录可能过长，请精简后重试' }, { status: 504 })
      }
      throw fetchErr
    }
  } catch (err) {
    console.error('[ex-distill]', err)
    return Response.json({ error: '服务器内部错误' }, { status: 500 })
  }
}