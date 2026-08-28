'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

type Phase = 'editing' | 'sealing' | 'sealed'
type PaperStyle = 'blank' | 'lined'
type ThemeKey = 'clean' | 'vintage' | 'sakura' | 'mint' | 'obsidian'

type PaperTheme = {
  key: ThemeKey
  name: string
  description: string
  paperBg: string
  paperColor: string
  lineColor: string
  envelopeGradient: string
  envelopeFlap: string
  accent: string
  accentSoft: string
  sealColor?: string
}

const DRAFT_KEY = 'letter-workshop:draft:v2'
const LINE_HEIGHT = 32
const MAX_CONTENT_LENGTH = 6000

const paperThemes: PaperTheme[] = [
  {
    key: 'clean',
    name: '素白',
    description: '干净克制',
    paperBg: '#fffdf8',
    paperColor: '#3b2f25',
    lineColor: 'rgba(59,47,37,0.11)',
    envelopeGradient: 'linear-gradient(145deg, #f8ddc7 0%, #efbca0 100%)',
    envelopeFlap: 'linear-gradient(160deg, #f5d6bf 0%, #eeb395 100%)',
    accent: '#8d6048',
    accentSoft: 'rgba(141,96,72,.10)',
  },
  {
    key: 'vintage',
    name: '旧纸',
    description: '温暖怀旧',
    paperBg: '#f7f0df',
    paperColor: '#594938',
    lineColor: 'rgba(89,73,56,0.13)',
    envelopeGradient: 'linear-gradient(145deg, #c89a78 0%, #9c7052 100%)',
    envelopeFlap: 'linear-gradient(160deg, #b98365 0%, #8f6249 100%)',
    accent: '#7c5a46',
    accentSoft: 'rgba(124,90,70,.11)',
  },
  {
    key: 'sakura',
    name: '樱粉',
    description: '柔和轻盈',
    paperBg: '#fff7f8',
    paperColor: '#65474d',
    lineColor: 'rgba(101,71,77,0.11)',
    envelopeGradient: 'linear-gradient(145deg, #f3c9ca 0%, #e8aaa8 100%)',
    envelopeFlap: 'linear-gradient(160deg, #f2d2cd 0%, #e9aaa5 100%)',
    accent: '#b66d78',
    accentSoft: 'rgba(182,109,120,.10)',
  },
  {
    key: 'mint',
    name: '薄荷',
    description: '清新安静',
    paperBg: '#f5faf6',
    paperColor: '#345247',
    lineColor: 'rgba(52,82,71,0.11)',
    envelopeGradient: 'linear-gradient(145deg, #b9d3c5 0%, #86ad9b 100%)',
    envelopeFlap: 'linear-gradient(160deg, #c9dfd4 0%, #91b5a5 100%)',
    accent: '#587d6d',
    accentSoft: 'rgba(88,125,109,.10)',
  },
  {
    key: 'obsidian',
    name: '黑曜',
    description: '深色克制',
    paperBg: '#111214',
    paperColor: '#f5f5f3',
    lineColor: 'rgba(255,255,255,0.14)',
    envelopeGradient: 'linear-gradient(145deg, #202124 0%, #0b0c0e 100%)',
    envelopeFlap: 'linear-gradient(160deg, #2a2b2f 0%, #111214 100%)',
    accent: '#666970',
    accentSoft: 'rgba(102,105,112,.14)',
    sealColor: '#a61f2b',
  },
]

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function textToSafeHtml(value: string) {
  return escapeHtml(value).replace(/\n/g, '<br/>')
}

export default function LetterWorkshop() {
  const [themeKey, setThemeKey] = useState<ThemeKey>('vintage')
  const [paperStyle, setPaperStyle] = useState<PaperStyle>('blank')
  const [content, setContent] = useState('')
  const [sender, setSender] = useState('')
  const [receiver, setReceiver] = useState('')
  const [phase, setPhase] = useState<Phase>('editing')
  const [draftRestored, setDraftRestored] = useState(false)
  const sealingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const theme = useMemo(
    () => paperThemes.find((item) => item.key === themeKey) ?? paperThemes[0],
    [themeKey],
  )

  const linedBg = useMemo(
    () => paperStyle === 'lined'
      ? `repeating-linear-gradient(transparent, transparent ${LINE_HEIGHT - 1}px, ${theme.lineColor} ${LINE_HEIGHT - 1}px, ${theme.lineColor} ${LINE_HEIGHT}px)`
      : 'none',
    [paperStyle, theme.lineColor],
  )

  const hasDraft = Boolean(content.trim() || sender.trim() || receiver.trim())
  const canSeal = Boolean(content.trim()) && phase === 'editing'

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY)
      if (!raw) return

      const saved = JSON.parse(raw) as {
        themeKey?: ThemeKey
        paperStyle?: PaperStyle
        content?: string
        sender?: string
        receiver?: string
      }

      if (saved.themeKey && paperThemes.some((item) => item.key === saved.themeKey)) {
        setThemeKey(saved.themeKey)
      }
      if (saved.paperStyle === 'blank' || saved.paperStyle === 'lined') {
        setPaperStyle(saved.paperStyle)
      }
      setContent(saved.content?.slice(0, MAX_CONTENT_LENGTH) ?? '')
      setSender(saved.sender?.slice(0, 40) ?? '')
      setReceiver(saved.receiver?.slice(0, 40) ?? '')
      setDraftRestored(Boolean(saved.content || saved.sender || saved.receiver))
    } catch {
      // Ignore malformed local drafts.
    }
  }, [])

  useEffect(() => {
    if (phase !== 'editing') return

    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ themeKey, paperStyle, content, sender, receiver }),
        )
      } catch {
        // LocalStorage may be unavailable in private / restricted contexts.
      }
    }, 300)

    return () => window.clearTimeout(timer)
  }, [themeKey, paperStyle, content, sender, receiver, phase])

  useEffect(() => {
    return () => {
      if (sealingTimerRef.current) clearTimeout(sealingTimerRef.current)
    }
  }, [])

  const backToEditing = () => {
    if (sealingTimerRef.current) clearTimeout(sealingTimerRef.current)
    setPhase('editing')
  }

  const handleSealEnvelope = () => {
    if (!canSeal) return

    setPhase('sealing')
    sealingTimerRef.current = setTimeout(() => {
      setPhase('sealed')
      sealingTimerRef.current = null
    }, 720)
  }

  const handleReset = () => {
    if (sealingTimerRef.current) clearTimeout(sealingTimerRef.current)
    setContent('')
    setSender('')
    setReceiver('')
    setPhase('editing')
    setDraftRestored(false)

    try {
      window.localStorage.removeItem(DRAFT_KEY)
    } catch {
      // Ignore storage failures.
    }
  }

  const handleDownloadHtml = () => {
    const safeContent = textToSafeHtml(content || '（这里什么也没有写）')
    const safeSender = textToSafeHtml(sender || '匿名')
    const safeReceiver = textToSafeHtml(receiver || '某人')
    const lineBg = paperStyle === 'lined'
      ? `repeating-linear-gradient(transparent, transparent ${LINE_HEIGHT - 1}px, ${theme.lineColor} ${LINE_HEIGHT - 1}px, ${theme.lineColor} ${LINE_HEIGHT}px)`
      : 'none'

    const htmlTemplate = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>一封给 ${safeReceiver} 的信</title>
<style>
  *{box-sizing:border-box}
  html,body{margin:0;min-height:100%}
  body{
    min-height:100vh;display:grid;place-items:center;padding:32px 18px 56px;color:#4a3b34;
    background:radial-gradient(circle at 50% 0%,rgba(255,255,255,.94),transparent 36%),linear-gradient(180deg,#f7f3ef 0%,#eee7e1 100%);
    font-family:"Songti SC","STSong","Noto Serif SC","PingFang SC",serif;
  }
  .wrap{width:min(640px,100%);text-align:center}
  .scene{position:relative;width:100%;height:470px;perspective:1500px}
  .envelope{position:absolute;inset:34px 0 0;transform-style:preserve-3d;outline:none;cursor:pointer;-webkit-tap-highlight-color:transparent}
  .env-body{position:absolute;inset:82px 22px 20px;border-radius:18px;background:${theme.envelopeGradient};box-shadow:0 28px 70px rgba(64,45,34,.18),0 2px 8px rgba(64,45,34,.08);z-index:2}
  .env-body:after{content:"";position:absolute;inset:0;border-radius:inherit;border:1px solid rgba(255,255,255,.22);pointer-events:none}
  .env-flap{border-radius:18px 18px 0 0;position:absolute;top:82px;left:22px;width:calc(100% - 44px);height:225px;background:${theme.envelopeFlap};clip-path:polygon(0 0,100% 0,50% 100%);transform-origin:top center;transform:rotateX(0deg);backface-visibility:hidden;filter:drop-shadow(0 10px 12px rgba(60,40,30,.08));z-index:5;transition:transform .62s cubic-bezier(.22,.72,.22,1)}
  .seal{position:absolute;top:286px;left:50%;z-index:7;display:grid;place-items:center;width:54px;height:54px;border-radius:50%;transform:translate(-50%,-50%) scale(1);color:#f9eee6;background:${theme.sealColor ?? theme.accent};font-size:22px;line-height:1;box-shadow:inset 0 0 0 1px rgba(255,255,255,.24),0 5px 14px rgba(62,43,33,.18);transition:opacity .24s ease,transform .24s ease}
  .addr{position:absolute;left:58px;right:58px;bottom:54px;z-index:3;display:flex;justify-content:space-between;gap:20px;color:rgba(255,255,255,.9);font:500 13px/1.5 "PingFang SC",sans-serif;letter-spacing:.04em;text-shadow:0 1px 2px rgba(0,0,0,.12);transition:opacity .25s ease}
  .letter{position:absolute;left:50%;top:72px;z-index:1;width:calc(100% - 92px);max-height:min(62vh,560px);min-height:340px;padding:33px 38px 40px;color:${theme.paperColor};background-color:${theme.paperBg};border:1px solid rgba(80,60,44,.07);border-radius:12px;box-shadow:0 22px 55px rgba(55,42,32,.16);transform:translate(-50%,148px) scale(.94);opacity:0;text-align:left;overflow:auto;transition:transform .74s cubic-bezier(.2,.78,.2,1),opacity .4s ease}
  .head{display:flex;justify-content:space-between;gap:24px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid ${theme.lineColor};font:500 12px/1.5 "PingFang SC",sans-serif;opacity:.68;letter-spacing:.04em}
  .content{padding-top:${paperStyle === 'lined' ? '7px' : '0'};font-size:17px;line-height:${LINE_HEIGHT}px;word-break:break-word;overflow-wrap:anywhere;white-space:pre-wrap;${paperStyle === 'lined' ? `background-image:${lineBg};background-position:0 7px;background-repeat:repeat-y;` : ''}}
  .hint{margin:5px 0 0;color:#85766d;font:400 13px/1.6 "PingFang SC",sans-serif;letter-spacing:.04em;transition:opacity .3s ease}
  .envelope.is-opening{cursor:default}
  .envelope.is-opening .seal,.envelope.is-open .seal{opacity:0;transform:translate(-50%,-50%) scale(.68);pointer-events:none}
  .envelope.is-opening .addr,.envelope.is-open .addr{opacity:.35}
  .envelope.flap-open .env-flap,.envelope.is-open .env-flap{transform:rotateX(178deg)}
  .envelope.letter-out .env-flap,.envelope.is-open .env-flap{z-index:1}
  .envelope.letter-out .letter,.envelope.is-open .letter{z-index:6;opacity:1;transform:translate(-50%,-34px) scale(1)}
  .envelope.is-open{cursor:default}
  @media (max-width:560px){
    body{padding:18px 10px 40px}.scene{height:430px}.envelope{inset:20px 0 0}.env-body{inset:76px 8px 20px}.env-flap{top:76px;left:8px;width:calc(100% - 16px);height:200px}.seal{top:258px}.letter{top:68px;width:calc(100% - 38px);min-height:320px;padding:27px 24px 34px}.addr{left:28px;right:28px;bottom:48px}.head{flex-direction:column;gap:3px}.content{font-size:16px}.envelope.letter-out .letter,.envelope.is-open .letter{transform:translate(-50%,-20px) scale(1)}
  }
  @media (prefers-reduced-motion:reduce){*{transition:none!important}.envelope.flap-open .env-flap,.envelope.is-open .env-flap{transform:rotateX(178deg)}}
</style>
</head>
<body>
  <main class="wrap">
    <div class="scene">
      <div id="envelope" class="envelope" role="button" tabindex="0" aria-label="拆开信封" aria-expanded="false">
        <div class="env-body"></div>
        <div class="env-flap"></div>
        <div class="seal">✦</div>
        <div class="addr"><span>寄 · ${safeSender}</span><span>收 · ${safeReceiver}</span></div>
        <article class="letter">
          <div class="head"><span>寄 · ${safeSender}</span><span>收 · ${safeReceiver}</span></div>
          <div class="content">${safeContent}</div>
        </article>
      </div>
    </div>
    <p id="hint" class="hint">轻触信封，打开这封信</p>
  </main>
<script>
  (() => {
    const envelope = document.getElementById('envelope')
    const hint = document.getElementById('hint')
    let opened = false
    let opening = false
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    function openLetter() {
      if (opened || opening) return
      opening = true
      envelope.classList.add('is-opening')
      envelope.setAttribute('aria-expanded', 'true')
      hint.textContent = '正在拆开这封信…'

      const flapDelay = reducedMotion ? 0 : 90
      const letterDelay = reducedMotion ? 0 : 520
      const doneDelay = reducedMotion ? 0 : 1180

      window.setTimeout(() => envelope.classList.add('flap-open'), flapDelay)
      window.setTimeout(() => envelope.classList.add('letter-out'), letterDelay)
      window.setTimeout(() => {
        envelope.classList.remove('is-opening', 'flap-open', 'letter-out')
        envelope.classList.add('is-open')
        envelope.removeAttribute('role')
        envelope.removeAttribute('tabindex')
        hint.textContent = '这封信，已经为你打开'
        opening = false
        opened = true
      }, doneDelay)
    }

    envelope.addEventListener('click', openLetter)
    envelope.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        openLetter()
      }
    })
  })()
</script>
</body>
</html>`

    const blob = new Blob([htmlTemplate], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = receiver.trim() ? `写给${receiver.trim()}的信.html` : '未寄出的信.html'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  return (
    <main
      className="letter-page"
      style={{
        '--accent': theme.accent,
        '--accent-soft': theme.accentSoft,
        '--seal': theme.sealColor ?? theme.accent,
        '--paper': theme.paperBg,
        '--paper-line': theme.lineColor,
        '--paper-text': theme.paperColor,
        '--envelope': theme.envelopeGradient,
        '--flap': theme.envelopeFlap,
        '--lined-bg': linedBg,
      } as CSSProperties}
    >
      <style>{styles}</style>

      <div className="letter-shell">
        <Breadcrumb />

        <header className="letter-hero">
          <span className="letter-eyebrow">LETTER WORKSHOP</span>
          <h1>信笺</h1>
          <p>与你相遇时，我会轻轻呼唤你的名字。</p>
        </header>

        <section className="workbench" aria-label="信件设置">
          <div className="settings-row settings-theme-row">
            <div className="setting-label">
              <span>纸张</span>
              <small>选择一份气质</small>
            </div>

            <div className="theme-options" role="radiogroup" aria-label="信纸主题">
              {paperThemes.map((item) => {
                const active = themeKey === item.key
                return (
                  <button
                    key={item.key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={`theme-card ${active ? 'is-active' : ''}`}
                    onClick={() => {
                      setThemeKey(item.key)
                      if (phase !== 'editing') backToEditing()
                    }}
                  >
                    <span
                      className="theme-swatch"
                      aria-hidden="true"
                      style={{ background: item.envelopeGradient }}
                    />
                    <span className="theme-copy">
                      <strong>{item.name}</strong>
                      <small>{item.description}</small>
                    </span>
                    <span className="theme-check" aria-hidden="true">✓</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="settings-row settings-meta-row">
            <div className="setting-label">
              <span>格式</span>
              <small>保持简单就好</small>
            </div>

            <div className="segmented" role="radiogroup" aria-label="信纸格式">
              {(['blank', 'lined'] as PaperStyle[]).map((style) => (
                <button
                  key={style}
                  type="button"
                  role="radio"
                  aria-checked={paperStyle === style}
                  className={paperStyle === style ? 'is-active' : ''}
                  onClick={() => {
                    setPaperStyle(style)
                    if (phase !== 'editing') backToEditing()
                  }}
                >
                  {style === 'blank' ? '留白' : '横格'}
                </button>
              ))}
            </div>

          </div>
        </section>

        <section className="letter-stage" aria-live="polite">
          <div className={`paper-wrap phase-${phase}`}>
            {phase !== 'sealed' && (
              <article className="paper-sheet">
                <div className="paper-meta">
                  <label className="paper-meta-field">
                    <span>FROM</span>
                    <input
                      value={sender}
                      onChange={(event) => setSender(event.target.value.slice(0, 40))}
                      placeholder="写信人的名字"
                      maxLength={40}
                      disabled={phase !== 'editing'}
                      aria-label="写信人"
                    />
                  </label>
                  <label className="paper-meta-field paper-meta-field-to">
                    <span>TO</span>
                    <input
                      value={receiver}
                      onChange={(event) => setReceiver(event.target.value.slice(0, 40))}
                      placeholder="收信人的名字"
                      maxLength={40}
                      disabled={phase !== 'editing'}
                      aria-label="收信人"
                    />
                  </label>
                </div>

                <textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value.slice(0, MAX_CONTENT_LENGTH))}
                  placeholder="写下那些不适合匆匆说完的话……"
                  disabled={phase !== 'editing'}
                  maxLength={MAX_CONTENT_LENGTH}
                  aria-label="信件正文"
                />

                <div className="paper-footer">
                  <span>{draftRestored ? '已恢复上次草稿 · 自动保存' : '草稿自动保存'}</span>
                  <span>{content.length.toLocaleString()} / {MAX_CONTENT_LENGTH.toLocaleString()}</span>
                </div>
              </article>
            )}

            {phase === 'sealed' && (
              <div className="sealed-card">
                <div className="envelope-card">
                  <div className="envelope-flap" />
                  <div className="wax-seal">✦</div>
                  <div className="envelope-address">
                    <span>{sender || '匿名'}</span>
                    <span className="envelope-line" />
                    <span>{receiver || '某人'}</span>
                  </div>
                </div>
                <div className="sealed-copy">
                  <strong>信已经装好了</strong>
                  <span>下载后，对方可以点击信封亲手拆开。</span>
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="action-bar">
          <div className="action-note">
            {phase === 'editing' && !content.trim() && '写下一点内容后，就可以装入信封'}
            {phase === 'editing' && content.trim() && '准备好后，把这封信装进信封'}
            {phase === 'sealing' && '正在封好这封信…'}
            {phase === 'sealed' && '一个独立 HTML 文件，不依赖当前网站也能打开'}
          </div>

          <div className="actions">
            {phase === 'editing' && (
              <>
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={handleReset}
                  disabled={!hasDraft}
                >
                  清空
                </button>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={handleSealEnvelope}
                  disabled={!canSeal}
                >
                  装入信封
                  <span aria-hidden="true">→</span>
                </button>
              </>
            )}

            {phase === 'sealing' && (
              <button type="button" className="button button-primary" disabled>
                正在封装…
              </button>
            )}

            {phase === 'sealed' && (
              <>
                <button type="button" className="button button-ghost" onClick={backToEditing}>
                  返回修改
                </button>
                <button type="button" className="button button-primary" onClick={handleDownloadHtml}>
                  下载信件
                  <span aria-hidden="true">↓</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <FooterNote />
    </main>
  )
}

const styles = `
  .letter-page {
    --ink: #3e3732;
    --muted: #897d74;
    --hairline: rgba(72, 54, 43, .10);
    --panel: rgba(255, 255, 255, .72);
    min-height: 100vh;
    color: var(--ink);
    background:
      radial-gradient(circle at 50% -10%, rgba(255,255,255,.96) 0%, rgba(255,255,255,.42) 32%, transparent 58%),
      linear-gradient(180deg, #f7f4f1 0%, #f1ece7 100%);
    font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
    padding: 28px 18px 44px;
  }

  .letter-page * { box-sizing: border-box; }
  .letter-page button, .letter-page input, .letter-page textarea { font: inherit; }
  .letter-page button { -webkit-tap-highlight-color: transparent; }

  .letter-shell { width: min(1040px, 100%); margin: 0 auto; }

  .letter-hero { text-align: center; padding: 42px 16px 34px; }
  .letter-eyebrow {
    display: inline-block; margin-bottom: 14px; color: var(--accent); font-size: 11px;
    font-weight: 700; letter-spacing: .18em;
  }
  .letter-hero h1 {
    margin: 0; color: #302b28; font-family: "Songti SC", "STSong", "Noto Serif SC", serif;
    font-size: clamp(30px, 4vw, 44px); font-weight: 600; letter-spacing: -.035em; line-height: 1.2;
  }
  .letter-hero p { margin: 12px 0 0; color: var(--muted); font-size: 14px; }

  .workbench {
    overflow: hidden; border: 1px solid var(--hairline); border-radius: 22px;
    background: var(--panel); box-shadow: 0 10px 38px rgba(63, 45, 35, .055);
    backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
  }
  .settings-row { display: grid; grid-template-columns: 132px 1fr; gap: 22px; padding: 20px 22px; }
  .settings-row + .settings-row { border-top: 1px solid var(--hairline); }
  .setting-label { padding-top: 4px; }
  .setting-label span { display: block; color: #4b423c; font-size: 13px; font-weight: 650; }
  .setting-label small { display: block; margin-top: 5px; color: #a0968e; font-size: 11px; }

  .theme-options { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
  .theme-card {
    position: relative; display: flex; min-width: 0; align-items: center; gap: 10px;
    padding: 10px 11px; text-align: left; color: #544a43; background: rgba(255,255,255,.38);
    border: 1px solid rgba(72,54,43,.09); border-radius: 13px; cursor: pointer;
    transition: border-color .18s ease, background .18s ease, box-shadow .18s ease, transform .18s ease;
  }
  .theme-card:hover { transform: translateY(-1px); border-color: rgba(72,54,43,.16); background: rgba(255,255,255,.78); }
  .theme-card.is-active { border-color: color-mix(in srgb, var(--accent) 48%, transparent); background: var(--accent-soft); box-shadow: inset 0 0 0 1px rgba(255,255,255,.35); }
  .theme-swatch { flex: 0 0 auto; width: 31px; height: 31px; border-radius: 9px; box-shadow: inset 0 0 0 1px rgba(70,45,30,.07); }
  .theme-copy { min-width: 0; }
  .theme-copy strong { display: block; overflow: hidden; color: #483f39; font-size: 12px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
  .theme-copy small { display: block; margin-top: 2px; overflow: hidden; color: #9c9189; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
  .theme-check { position: absolute; top: 8px; right: 8px; color: var(--accent); font-size: 10px; font-weight: 800; opacity: 0; transform: scale(.7); transition: .18s ease; }
  .theme-card.is-active .theme-check { opacity: 1; transform: scale(1); }

  .settings-meta-row { align-items: center; }
  .segmented { display: inline-flex; width: fit-content; padding: 3px; border: 1px solid var(--hairline); border-radius: 10px; background: rgba(100,80,65,.045); }
  .segmented button { min-width: 58px; padding: 7px 13px; color: #81766f; background: transparent; border: 0; border-radius: 7px; cursor: pointer; font-size: 12px; transition: .18s ease; }
  .segmented button.is-active { color: #433b36; background: #fff; box-shadow: 0 1px 5px rgba(58,42,32,.08); }

  .letter-stage { min-height: 520px; display: grid; place-items: center; padding: 42px 0 22px; }
  .paper-wrap { width: min(650px, 94vw); display: grid; place-items: center; }
  .paper-sheet {
    position: relative; width: 100%; min-height: 430px; padding: 38px 44px 28px;
    color: var(--paper-text); background-color: var(--paper);
    border: 1px solid var(--paper-line); border-radius: 16px;
    box-shadow: 0 24px 65px rgba(59,42,31,.12), 0 3px 9px rgba(59,42,31,.055);
    transform-origin: center bottom; overflow: hidden;
  }
  .phase-sealing .paper-sheet { animation: paperSeal .72s cubic-bezier(.25,.75,.2,1) both; pointer-events: none; }
  @keyframes paperSeal { 0% { opacity: 1; transform: translateY(0) scale(1); } 60% { opacity: .92; transform: translateY(56px) scale(.96); } 100% { opacity: 0; transform: translateY(130px) scale(.84); } }

  .paper-meta { display: flex; justify-content: space-between; align-items: center; gap: 28px; padding-bottom: 13px; border-bottom: 1px solid var(--paper-line); }
  .paper-meta-field { display: flex; min-width: 0; flex: 1; align-items: center; gap: 9px; color: color-mix(in srgb, var(--paper-text) 52%, transparent); font-size: 9px; font-weight: 750; letter-spacing: .13em; }
  .paper-meta-field-to { justify-content: flex-end; }
  .paper-meta-field input {
    width: min(180px, 100%); min-width: 0; padding: 4px 2px 5px; color: color-mix(in srgb, var(--paper-text) 82%, transparent);
    background: transparent; border: 0; border-bottom: 1px solid transparent; border-radius: 0; outline: 0;
    font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; font-size: 11px; font-weight: 500; letter-spacing: .02em;
    transition: border-color .18s ease, background .18s ease;
  }
  .paper-meta-field-to input { text-align: right; }
  .paper-meta-field input:hover:not(:disabled) { border-bottom-color: color-mix(in srgb, var(--paper-text) 18%, transparent); }
  .paper-meta-field input:focus { border-bottom-color: var(--accent); }
  .paper-meta-field input::placeholder { color: color-mix(in srgb, var(--paper-text) 32%, transparent); }
  .paper-meta-field input:disabled { opacity: .78; }
  .paper-sheet textarea {
    display: block; width: 100%; min-height: 290px; margin-top: 13px; padding: 7px 0 0; resize: none;
    color: inherit; background-color: transparent; background-image: var(--lined-bg); background-position: 0 7px; background-repeat: repeat-y; border: 0; outline: 0;
    font-family: "Songti SC", "STSong", "Noto Serif SC", "PingFang SC", serif;
    font-size: 17px; line-height: ${LINE_HEIGHT}px; letter-spacing: .015em; white-space: pre-wrap; word-break: break-word; overflow-wrap: anywhere;
  }
  .paper-sheet textarea::placeholder { color: color-mix(in srgb, var(--paper-text) 36%, transparent); }
  .paper-footer { display: flex; justify-content: space-between; gap: 20px; margin-top: 18px; color: color-mix(in srgb, var(--paper-text) 45%, transparent); font-size: 10px; }

  .sealed-card { width: min(600px, 94vw); text-align: center; animation: sealedIn .52s cubic-bezier(.2,.8,.2,1) both; }
  @keyframes sealedIn { from { opacity: 0; transform: translateY(22px) scale(.98); } to { opacity: 1; transform: none; } }
  .envelope-card {
    position: relative; height: 360px; overflow: hidden; border-radius: 20px; background: var(--envelope);
    box-shadow: 0 28px 75px rgba(58,41,31,.17), 0 4px 12px rgba(58,41,31,.08);
  }
  .envelope-card::after { content: ''; position: absolute; inset: 0; border: 1px solid rgba(255,255,255,.18); border-radius: inherit; pointer-events: none; }
  .envelope-flap { position: absolute; top: 0; left: 0; width: 100%; height: 220px; background: var(--flap); clip-path: polygon(0 0,100% 0,50% 100%); filter: drop-shadow(0 10px 16px rgba(50,35,28,.08)); }
  .wax-seal {
    position: absolute; top: 211px; left: 50%; z-index: 3; display: grid; place-items: center;
    width: 58px; height: 58px; border-radius: 50%; transform: translate(-50%,-50%);
    color: rgba(255,255,255,.94); background: var(--seal); font-size: 22px;
    box-shadow: inset 0 0 0 1px rgba(255,255,255,.22), 0 8px 18px rgba(48,34,27,.16);
  }
  .envelope-address { position: absolute; left: 54px; right: 54px; bottom: 40px; display: grid; grid-template-columns: 1fr 56px 1fr; align-items: center; gap: 14px; color: rgba(255,255,255,.88); font-size: 12px; letter-spacing: .05em; text-shadow: 0 1px 2px rgba(0,0,0,.1); }
  .envelope-address span:first-child { text-align: right; }.envelope-address span:last-child { text-align: left; }
  .envelope-line { height: 1px; background: rgba(255,255,255,.35); }
  .sealed-copy { margin-top: 24px; }
  .sealed-copy strong { display: block; color: #443a34; font-family: "Songti SC", "STSong", serif; font-size: 18px; font-weight: 600; }
  .sealed-copy span { display: block; margin-top: 7px; color: #948982; font-size: 12px; }

  .action-bar { display: flex; align-items: center; justify-content: space-between; gap: 20px; min-height: 54px; padding: 0 2px; }
  .action-note { color: #978d86; font-size: 11px; }
  .actions { display: flex; gap: 9px; }
  .button { display: inline-flex; min-height: 40px; align-items: center; justify-content: center; gap: 9px; padding: 9px 16px; border-radius: 11px; cursor: pointer; font-size: 12px; font-weight: 650; transition: transform .18s ease, box-shadow .18s ease, opacity .18s ease, background .18s ease; }
  .button:not(:disabled):hover { transform: translateY(-1px); }.button:not(:disabled):active { transform: translateY(0); }
  .button:disabled { cursor: not-allowed; opacity: .42; }
  .button-primary { color: #fff; background: var(--accent); border: 1px solid transparent; box-shadow: 0 6px 16px color-mix(in srgb, var(--accent) 22%, transparent); }
  .button-ghost { color: #746a63; background: rgba(255,255,255,.48); border: 1px solid rgba(72,54,43,.11); }
  .button-ghost:not(:disabled):hover { background: #fff; border-color: rgba(72,54,43,.17); }

  @media (max-width: 820px) {
    .settings-row { grid-template-columns: 1fr; gap: 12px; }
    .setting-label { display: flex; align-items: baseline; gap: 8px; padding-top: 0; }
    .setting-label small { margin: 0; }
    .theme-options { grid-template-columns: repeat(2, minmax(0,1fr)); }
    .settings-meta-row { grid-template-columns: 1fr; }
  }

  @media (max-width: 600px) {
    .letter-page { padding: 20px 12px 36px; }
    .letter-hero { padding: 34px 12px 26px; }
    .letter-hero h1 { font-size: 31px; }
    .workbench { border-radius: 18px; }
    .settings-row { padding: 17px 16px; }
    .theme-options { gap: 8px; }
    .theme-card { padding: 9px; }.theme-copy small { display: none; }
    .letter-stage { min-height: 470px; padding-top: 28px; }
    .paper-sheet { min-height: 405px; padding: 30px 25px 24px; border-radius: 14px; }
    .paper-sheet textarea { min-height: 275px; font-size: 16px; }
    .paper-meta { gap: 14px; }
    .paper-meta-field { gap: 6px; }
    .paper-meta-field input { width: 100%; }
    .paper-meta-field-to { justify-content: flex-end; }
    .paper-footer { gap: 10px; }
    .envelope-card { height: 300px; border-radius: 16px; }
    .envelope-flap { height: 185px; }.wax-seal { top: 178px; }
    .envelope-address { left: 24px; right: 24px; bottom: 32px; grid-template-columns: 1fr 34px 1fr; gap: 8px; }
    .action-bar { align-items: stretch; flex-direction: column; }
    .action-note { min-height: 16px; text-align: center; }
    .actions { width: 100%; }.button { flex: 1; }
  }

  @media (prefers-reduced-motion: reduce) {
    .letter-page *, .letter-page *::before, .letter-page *::after { scroll-behavior: auto !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
  }
`