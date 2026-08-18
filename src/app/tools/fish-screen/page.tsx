'use client'

import { useEffect, useRef, useState } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
export default function FishScreenPage() {
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState<string[]>([])
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const logContainerRef = useRef<HTMLDivElement>(null)

  const logPool = [
    '校验工具模块完整性',
    '加载 PDF 解析引擎',
    '同步剪贴板会话',
    '压缩本地缓存',
    '重建索引',
    '校验 JSON Schema',
    '预热正则编译器',
    '刷新图标缓存',
  ]

  // 日志更新自动滚动到底
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs])

  const start = () => {
    setRunning(true)
    setProgress(0)
    setLogs(['> 初始化 BitLeap 本地环境…'])

    timer.current = setInterval(() => {
      setProgress((p) => {
        const next = p + Math.random() * 3 + 1
        if (next >= 100) {
          if (timer.current) clearInterval(timer.current)
          setLogs((l) => [...l, '> 同步完成，环境就绪 ✅'])
          return 100
        }
        return next
      })

      setLogs((prevLogs) => {
        if (Math.random() > 0.6) {
          const msg = logPool[Math.floor(Math.random() * logPool.length)]
          // 只保留最近8条日志
          return [...prevLogs, `> ${msg} ok`].slice(-8)
        }
        return prevLogs
      })
    }, 800)
  }

  const stop = () => {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
    setRunning(false)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') stop()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // 全屏摸鱼屏
  if (running) {
    return (
      <div className="fixed inset-0 z-[9999] bg-gray-900 text-green-400 font-mono text-sm flex flex-col justify-center px-6 sm:px-20">
        <div className="max-w-2xl mx-auto w-full relative z-10">
          <h1 className="text-2xl text-white mb-2">
            BitLeap 本地环境同步中
          </h1>
          <p className="text-gray-400 mb-8">
            正在校验工具模块，请勿关闭此窗口…
          </p>

          <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-green-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-right text-gray-300 mb-8">
            {Math.floor(progress)}%
          </div>

          {/* 修复日志区域：外层外壳，内层滚动，padding写在内层 */}
          <div className="bg-black/40 rounded-lg h-40 overflow-hidden">
            <div
              ref={logContainerRef}
              className="h-full overflow-y-auto p-4
      [scrollbar-width:thin]
      [scrollbar-color:#777_transparent]
      [&::-webkit-scrollbar]:w-[4px]
      [&::-webkit-scrollbar-track]:bg-transparent
      [&::-webkit-scrollbar-thumb]:bg-[#777]
      [&::-webkit-scrollbar-thumb]:rounded-full
      [&::-webkit-scrollbar-track]:!bg-transparent"
            >
              {logs.map((line, i) => (
                <div key={`log_${i}_${line}`} className="mb-0.5">
                  {line}
                </div>
              ))}
            </div>
          </div>


          <p className="mt-8 text-gray-500 text-xs">
            按 Esc 或点击任意处退出 · 纯本地模拟，无网络请求
          </p>
        </div>

        {/* 全屏点击遮罩，阻止事件穿透 */}
        <div
          className="absolute inset-0 cursor-pointer"
          onClick={stop}
        />
      </div>
    )
  }

  // 配置页
  return (
    <div className="max-w-xl mx-auto py-16 px-6">
      <Breadcrumb />
      <h1 className="text-3xl font-bold mt-6 mb-2">摸鱼屏生成器</h1>
      <p className="text-gray-500 mb-8">
        生成一个“系统同步中”的全屏进度界面，纯本地模拟，按 Esc 退出。
      </p>

      <button
        onClick={start}
        className="px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition"
      >
        启动摸鱼屏
      </button>

      <div className="mt-10 text-sm text-gray-500 leading-relaxed">
        <p>· 不伪造具体系统崩溃画面</p>
        <p>· 不连接任何网络</p>
        <p>· 进度与日志均为随机模拟</p>
        <p>· 适合“老板来了”场景（你懂的）</p>
      </div>
    </div>
  )
}
