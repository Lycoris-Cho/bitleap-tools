'use client'

import { useEffect } from 'react'

export default function CopyToast() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    let toastEl: HTMLDivElement | null = null
    let timer: ReturnType<typeof setTimeout>

    const show = () => {
      // 如果已经存在就重置计时
      if (toastEl) {
        clearTimeout(timer)
        timer = setTimeout(hide, 2000)
        return
      }

      toastEl = document.createElement('div')
      toastEl.className = 'fixed top-20 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300'
      toastEl.innerHTML = `
        <div style="
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: 12px;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        ">
          <svg style="width:16px;height:16px;color:#10b981;flex-shrink:0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span style="font-size:14px;font-weight:500;color:#047857">复制成功</span>
        </div>
      `
      document.body.appendChild(toastEl)

      // 入场动画
      requestAnimationFrame(() => {
        toastEl!.style.opacity = '1'
        toastEl!.style.transform = 'translate(-50%, 0)'
      })

      timer = setTimeout(hide, 2000)
    }

    const hide = () => {
      if (!toastEl) return
      toastEl.style.opacity = '0'
      toastEl.style.transform = 'translate(-50%, -12px)'
      setTimeout(() => {
        toastEl?.remove()
        toastEl = null
      }, 300)
    }

    // 保存原始方法
    const originalWriteText = navigator.clipboard.writeText.bind(navigator.clipboard)

    // 重写
    navigator.clipboard.writeText = async (...args) => {
      const result = await originalWriteText(...args)
      show()
      return result
    }

    return () => {
      // 还原（虽然 SPA 里基本不会触发）
      navigator.clipboard.writeText = originalWriteText
      clearTimeout(timer)
      toastEl?.remove()
    }
  }, [])

  return null
}