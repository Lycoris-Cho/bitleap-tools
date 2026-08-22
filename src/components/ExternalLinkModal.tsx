'use client'

import { useEffect } from 'react'

interface Props {
  href: string
  title: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ExternalLinkModal({ href, title, onConfirm, onCancel }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px] px-4"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      {/* 纯白底 + 极细边 + 大圆角 + 软阴影 */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full p-7 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] border border-gray-100 dark:border-gray-800">

        {/* 标题 — 大、粗、黑 */}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1.5">
          离开 BitLeap
        </h3>

        {/* 副标题 — 中等灰 */}
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
          你即将在浏览器新标签页中打开外部工具
        </p>

        {/* 工具名 + URL — 不用任何背景色，纯文字 + 分隔线 */}
        <div className="mb-6 pb-5 border-b border-gray-100 dark:border-gray-800">
          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {title}
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500 font-mono truncate mt-1">
            {href}
          </div>
        </div>

        {/* 免责 — 最弱灰，紧凑行高 */}
        <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed mb-7">
          该工具由第三方提供，非 BitLeap 出品。本站不对外部链接的内容与安全性负责，请谨慎提交个人信息。
        </p>

        {/* 按钮 — 主按钮实心灰黑 + 次按钮纯文字，macOS 风格 */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 active:scale-[0.98] transition-all"
          >
            继续访问
          </button>
        </div>
      </div>
    </div>
  )
}