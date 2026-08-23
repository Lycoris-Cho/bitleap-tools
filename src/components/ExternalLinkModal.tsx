'use client'

import { useEffect, useState } from 'react'

interface Props {
  href: string
  title: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ExternalLinkModal({ href, title, onConfirm, onCancel }: Props) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // 下一帧才置 true，确保初始状态是 hidden，触发进入动画
    const raf = requestAnimationFrame(() => setMounted(true))
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onCancel])

  const handleClose = () => {
    setMounted(false)
    // 动画 200ms 后再通知父组件卸载
    setTimeout(onCancel, 200)
  }

  const handleConfirm = () => {
    setMounted(false)
    setTimeout(onConfirm, 200)
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center px-4 transition-all duration-200 ease-out ${
        mounted
          ? 'bg-black/20 backdrop-blur-[2px] opacity-100'
          : 'bg-black/0 backdrop-blur-none opacity-0 pointer-events-none'
      }`}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      {/* 弹窗本体 */}
      <div
        className={`bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full p-7 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] border border-gray-100 dark:border-gray-800 transition-all duration-200 ease-out ${
          mounted
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-2'
        }`}
      >
        {/* 标题 */}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1.5">
          离开 BitLeap
        </h3>

        {/* 副标题 */}
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
          你即将在浏览器新标签页中打开外部工具
        </p>

        {/* 工具名 + URL */}
        <div className="mb-6 pb-5 border-b border-gray-100 dark:border-gray-800">
          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {title}
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500 font-mono truncate mt-1">
            {href}
          </div>
        </div>

        {/* 免责 */}
        <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed mb-7">
          该工具由第三方提供，非 BitLeap 出品。本站不对外部链接的内容与安全性负责，请谨慎提交个人信息。
        </p>

        {/* 按钮 */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 py-2.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 active:scale-[0.98] transition-all"
          >
            继续访问
          </button>
        </div>
      </div>
    </div>
  )
}