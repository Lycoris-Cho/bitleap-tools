"use client"

import { useState, useCallback, useEffect } from "react"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type Answer = { zh: string; en: string }

const FALLBACK_ANSWERS: Answer[] = [
  { zh: "相信自己的直觉", en: "Trust your intuition" },
  { zh: "时机未到，再等等", en: "Not the right time" },
  { zh: "大胆去做", en: "Just do it" },
  { zh: "换个角度看", en: "Look from another angle" },
  { zh: "答案是否定的", en: "The answer is no" },
  { zh: "顺其自然", en: "Let it be" },
  { zh: "去问一个信任的人", en: "Ask someone you trust" },
  { zh: "答案是肯定的", en: "The answer is yes" },
  { zh: "先睡一觉再说", en: "Sleep on it" },
  { zh: "别急，让子弹飞一会儿", en: "Let the bullet fly" },
  { zh: "你心里早有答案", en: "You already know" },
  { zh: "试着写下三种可能", en: "Write down three possibilities" },
  { zh: "放下执念", en: "Let go of the obsession" },
  { zh: "再坚持一下", en: "Hold on a little longer" },
  { zh: "问问题本身", en: "Question the question itself" },
]

export default function AnswerBookPage() {
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [pageNo, setPageNo] = useState(0)
  const [loading, setLoading] = useState(false)
  const [flipped, setFlipped] = useState(false)
  const [error, setError] = useState(false)
  const [hasAsked, setHasAsked] = useState(false)

  useEffect(() => {
    setPageNo(Math.floor(Math.random() * 268) + 1)
  }, [])

  const fetchAnswer = useCallback(async () => {
    if (!question.trim() || hasAsked) return
    setLoading(true)
    setFlipped(false)
    setError(false)
    setHasAsked(true)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 4000)

    try {
      const res = await fetch("https://uapis.cn/api/v1/answerbook/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim() }),
        signal: controller.signal,
      })
      clearTimeout(timer)
      if (!res.ok) throw new Error("HTTP " + res.status)
      const data = await res.json()
      if (data?.answer) {
        setAnswer({ zh: data.answer, en: "" })
        setPageNo(Math.floor(Math.random() * 268) + 1)
      } else throw new Error("格式异常")
    } catch {
      setError(true)
      setAnswer(FALLBACK_ANSWERS[Math.floor(Math.random() * FALLBACK_ANSWERS.length)])
      setPageNo(Math.floor(Math.random() * 268) + 1)
    } finally {
      setLoading(false)
      setTimeout(() => setFlipped(true), 300)
    }
  }, [question, hasAsked])

  const reset = () => {
    setFlipped(false)
    setTimeout(() => {
      setAnswer(null)
      setQuestion("")
      setHasAsked(false)
      setError(false)
    }, 300)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") fetchAnswer()
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0f]">
      {/* 背景光晕 */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute top-1/3 -right-32 h-[400px] w-[400px] rounded-full bg-fuchsia-600/15 blur-[100px]" />
        <div className="absolute bottom-0 left-1/4 h-[300px] w-[300px] rounded-full bg-blue-600/15 blur-[90px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-10">
        <Breadcrumb />

        <div className="mb-10 text-center">
          <h1 className="mb-3 bg-gradient-to-r from-violet-400 via-fuchsia-400 to-blue-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
            答案之书
          </h1>
          <p className="text-sm text-gray-400">在心里默念一个问题，写下它，然后翻开答案</p>
        </div>

        {/* 输入区 —— 永远在，点完后变灰 */}
        <div className="mb-2">
          <div className="relative">
            <input
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="比如：我该辞职吗？"
              disabled={hasAsked}
              className={`w-full rounded-2xl border bg-white/5 px-5 py-4 text-lg text-white placeholder-gray-500 backdrop-blur-md transition-all duration-500 focus:border-violet-400/50 focus:outline-none focus:ring-4 focus:ring-violet-500/10 ${
                hasAsked ? "border-white/5 opacity-40" : "border-white/10"
              }`}
            />
            <button
              onClick={fetchAnswer}
              disabled={!question.trim() || loading || hasAsked}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-violet-500/40 active:scale-95 disabled:opacity-40"
            >
              {loading ? "翻页中…" : hasAsked ? "已翻开" : "翻开答案"}
            </button>
          </div>
          {!hasAsked && (
            <p className="mt-2 text-center text-xs text-gray-600">按 Enter 也能翻开 ✦</p>
          )}
        </div>

        {/* 加载态 */}
        {loading && (
          <div className="flex justify-center gap-2 py-8">
            <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:-0.3s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-fuchsia-400 [animation-delay:-0.15s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400" />
          </div>
        )}

        {/* 答案区 —— max-height 展开 + 淡入上浮 */}
        <div
          className={`overflow-hidden transition-all duration-700 ease-out ${
            flipped ? "max-h-[400px] opacity-100 translate-y-0" : "max-h-0 opacity-0 translate-y-4"
          }`}
        >
          <div className="pt-6">
            <p className="mb-3 text-center text-sm text-gray-400 italic">"{question}"</p>
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/10 to-blue-500/10 p-10 backdrop-blur-xl">
              <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-violet-400/80">
                第 {pageNo} 页
              </p>
              <h2 className="text-center text-2xl font-bold leading-relaxed text-white">
                {answer?.zh}
              </h2>
            </div>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={reset}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-gray-300 backdrop-blur-md transition hover:bg-white/10 active:scale-95"
              >
                🔄 再问一个
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(`"${question}"\n\n${answer?.zh}`)}
                className="rounded-xl bg-violet-500/80 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-md transition hover:bg-violet-500 active:scale-95"
              >
                📋 复制答案
              </button>
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-4 text-center text-xs text-amber-400/80">
            ⚠ 接口暂不可用，已显示本地收藏答案
          </p>
        )}

        <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-300">怎么玩</h3>
          <ul className="space-y-2 text-xs leading-relaxed text-gray-500">
            <li className="flex items-start gap-2"><span className="mt-0.5 text-violet-400">✦</span>在心里默念一个你正在纠结的问题</li>
            <li className="flex items-start gap-2"><span className="mt-0.5 text-fuchsia-400">✦</span>把问题打在输入框里，点击"翻开答案"</li>
            <li className="flex items-start gap-2"><span className="mt-0.5 text-blue-400">✦</span>等待片刻，答案会像书页一样在你面前展开</li>
            <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-400">✦</span>答案仅供参考，最终决定权永远在你自己手里 ✨</li>
          </ul>
        </div>

        <p className="mt-4 text-center text-xs text-gray-600">
          答案数据来自 <span className="text-violet-400/70">uapis.cn</span> · 公益免费 · 前端直连
        </p>

        <div className="mt-10">
          <FooterNote />
        </div>
      </div>
    </div>
  )
}