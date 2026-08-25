export interface Msg {
    time: string
    sender: 'me' | 'them'
    text: string
  }
  
  export function parseTxt(raw: string, theirName: string): Msg[] {
    const msgs: Msg[] = []
    const lines = raw.split(/\r?\n/)
    let pendingSender: 'me' | 'them' | null = null
    let pendingTime: string | null = null
    let pendingText = ''
  
    for (const line of lines) {
      const m = line.match(/\[?(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\]?\s*(.+?)[：:]\s*(.*)$/)
      if (m) {
        if (pendingSender) {
          msgs.push({ time: pendingTime!, sender: pendingSender, text: pendingText.trim() })
        }
        pendingTime = m[1]
        pendingSender = m[2].includes('我') ? 'me' : 'them'
        pendingText = m[3]
      } else if (pendingSender && line.trim()) {
        pendingText += '\n' + line
      }
    }
    if (pendingSender) {
      msgs.push({ time: pendingTime!, sender: pendingSender, text: pendingText.trim() })
    }
    return msgs
  }
  
  export function parseCsv(raw: string): Msg[] {
    const msgs: Msg[] = []
    const lines = raw.split(/\r?\n/)
    if (lines.length < 2) return msgs
    const header = lines[0]
    const idx: Record<string, number> = {}
    header.split(',').forEach((col, i) => { idx[col.trim()] = i })
  
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',')
      if (cols.length < 4) continue
      const time = cols[idx['StrTime']]?.trim() || ''
      const isMe = cols[idx['IsSender']]?.trim() === '1'
      const text = cols[idx['StrContent']]?.trim() || ''
      if (time && text) {
        msgs.push({ time, sender: isMe ? 'me' : 'them', text })
      }
    }
    return msgs
  }
  
  export function summarizeForDistill(msgs: Msg[], theirName: string, maxChars = 25000): string {
    let out = `对方昵称：${theirName}\n\n聊天记录：\n`
    let len = out.length
    for (let i = msgs.length - 1; i >= 0 && len < maxChars; i--) {
      const m = msgs[i]
      const who = m.sender === 'me' ? '我' : theirName
      const line = `[${m.time}] ${who}：${m.text}\n`
      out = line + out
      len += line.length
    }
    return out
  }