'use client'
import Image from 'next/image'
import { useState, useEffect } from 'react'

export default function About() {
  const [booted, setBooted] = useState(false)
  useEffect(() => { setBooted(true) }, [])

  return (
    <div className="font-['myFont',sans-serif] flex flex-col lg:flex-row w-full h-full lg:h-[calc(100vh-4rem)] overflow-hidden">
      {/* 左侧：图片区 */}
      <div
        style={{
          animationName: booted ? 'fadeInLeft' : undefined,
          animationDuration: booted ? '0.6s' : undefined,
          animationTimingFunction: booted ? 'cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
          animationFillMode: booted ? 'backwards' : undefined,
        }}
        className="hidden lg:block relative w-[20%] h-full shrink-0"
      >
        <Image src="/image/p3.png" alt="Violet" fill sizes="20vw" className="object-cover" />
        <div className="absolute top-0 right-0 w-[15%] h-full bg-gradient-to-r from-transparent to-app-bg" />
      </div>

      {/* 右侧 */}
      <div className="relative flex-1 h-full bg-app-bg overflow-hidden">
        {/* 抠图人物 */}
        <div
          style={{
            animationName: booted ? 'fadeIn' : undefined,
            animationDuration: booted ? '0.8s' : undefined,
            animationTimingFunction: booted ? 'ease-out' : undefined,
            animationFillMode: booted ? 'backwards' : undefined,
            animationDelay: booted ? '200ms' : undefined,
          }}
          className="hidden md:block absolute inset-0 pointer-events-none z-0"
        >
          <Image src="/image/kp5.png" alt="Lycoris Character" fill sizes="80vw" className="object-contain object-bottom-right opacity-90" priority />
        </div>

        <div className="absolute inset-0 bg-gradient-to-r from-app-bg via-app-bg/85 to-transparent z-0" />
        {/* 樱花飘落层 - 最底层 */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden hidden md:block">
          {[...Array(12)].map((_, i) => {
            const left = 5 + (i * 8 + (i % 3) * 5) % 85
            const size = 10 + (i % 4) * 2
            const delay = i * 1.5
            const duration = 10 + (i % 5) * 2

            return (
              <div
                key={i}
                className="absolute opacity-50"
                style={{
                  left: `${left}%`,
                  top: '-20px',
                  width: `${size}px`,
                  height: `${size * 0.7}px`,
                  background: 'linear-gradient(135deg, #fce7f3, #fbcfe8)',
                  borderRadius: '50% 50% 50% 0',
                  transform: 'rotate(-45deg)',
                  animation: `sakura-fall ${duration}s linear infinite`,
                  animationDelay: `${delay}s`,
                  boxShadow: '0 0 8px rgba(244, 114, 182, 0.3)',
                }}
              />
            )
          })}
        </div>

        {/* 个人信息 */}
        <div className="relative z-10 h-full overflow-y-auto">
          <div className="min-h-full flex flex-col justify-start py-8 px-5 sm:py-10 sm:px-8 md:px-12 lg:py-12 lg:px-16 max-w-2xl mx-auto lg:mx-0">

            {/* 在线状态徽章 */}
            <div
              style={{
                animationName: booted ? 'fadeInDown' : undefined,
                animationDuration: booted ? '0.4s' : undefined,
                animationTimingFunction: booted ? 'cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
                animationFillMode: booted ? 'backwards' : undefined,
                animationDelay: booted ? '100ms' : undefined,
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs sm:text-sm font-medium mb-6 sm:mb-8 shrink-0 self-start"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Available for work
            </div>

            {/* 头像 + 名字 */}
            <div
              style={{
                animationName: booted ? 'fadeInLeft' : undefined,
                animationDuration: booted ? '0.5s' : undefined,
                animationTimingFunction: booted ? 'cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
                animationFillMode: booted ? 'backwards' : undefined,
                animationDelay: booted ? '200ms' : undefined,
              }}
              className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4 shrink-0"
            >
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-full overflow-hidden border-2 border-app-border ring-4 ring-violet-100 dark:ring-violet-500/20 shrink-0">
                <Image src="/image/head2.jpg" alt="Lycoris" fill sizes="(max-width: 640px) 64px, (max-width: 1024px) 80px, 96px" className="object-cover" />
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-app-text leading-tight">Lycoris</h1>
            </div>

            {/* 角色 */}
            <div
              style={{
                animationName: booted ? 'fadeInLeft' : undefined,
                animationDuration: booted ? '0.5s' : undefined,
                animationTimingFunction: booted ? 'cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
                animationFillMode: booted ? 'backwards' : undefined,
                animationDelay: booted ? '300ms' : undefined,
              }}
              className="relative inline-block mb-6 sm:mb-8 shrink-0 self-start"
            >
              <span className="text-lg sm:text-xl md:text-2xl text-violet-500 font-medium">Frontend Developer & CSS Enthusiast</span>
              <div className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-yellow-300 to-pink-400 rounded-full"></div>
            </div>

            {/* 标语 */}
            <p
              style={{
                animationName: booted ? 'fadeInUp' : undefined,
                animationDuration: booted ? '0.45s' : undefined,
                animationTimingFunction: booted ? 'cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
                animationFillMode: booted ? 'backwards' : undefined,
                animationDelay: booted ? '380ms' : undefined,
              }}
              className="text-sm sm:text-base text-app-muted mb-4 sm:mb-6 shrink-0"
            >
              Craft beautiful interfaces with code & imagination.
            </p>

            {/* 简介 */}
            <p
              style={{
                animationName: booted ? 'fadeInUp' : undefined,
                animationDuration: booted ? '0.45s' : undefined,
                animationTimingFunction: booted ? 'cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
                animationFillMode: booted ? 'backwards' : undefined,
                animationDelay: booted ? '420ms' : undefined,
              }}
              className="text-sm sm:text-base md:text-lg text-app-muted leading-relaxed mb-8 sm:mb-10 max-w-[55ch] shrink-0"
            >
              BitLeap 工具站开发者 —— 一个纯粹的"前端＆日常"工具实验室。
            </p>

            {/* 技能标签 */}
            <div className="flex gap-2 sm:gap-3 flex-wrap mb-8 sm:mb-12 shrink-0">
              {['React', 'Next.js', 'Tailwind', 'CSS Animations', 'TypeScript'].map((skill, i) => (
                <span
                  key={skill}
                  style={{
                    animationName: booted ? 'fadeInUp' : undefined,
                    animationDuration: booted ? '0.4s' : undefined,
                    animationTimingFunction: booted ? 'cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
                    animationFillMode: booted ? 'backwards' : undefined,
                    animationDelay: booted ? `${450 + i * 60}ms` : undefined,
                  }}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-app-card border border-app-border rounded-full text-xs sm:text-sm text-app-text"
                >
                  {skill}
                </span>
              ))}
            </div>

            {/* 分割线 */}
            {/* 分割线 - 流光 */}
            <div
              style={{
                background: 'linear-gradient(90deg, transparent 0%, #c4b5fd 50%, transparent 100%)',
                backgroundSize: '200% 100%',
                animation: booted
                  ? 'fadeInLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1) backwards, shimmer 3.5s linear infinite 0.5s'
                  : undefined,
              }}
              className="w-full h-[3px] mb-6 sm:mb-8 shrink-0 rounded-full"
            />

            {/* 联系方式标题 */}
            <h2
              style={{
                animationName: booted ? 'fadeInLeft' : undefined,
                animationDuration: booted ? '0.4s' : undefined,
                animationTimingFunction: booted ? 'cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
                animationFillMode: booted ? 'backwards' : undefined,
                animationDelay: booted ? '520ms' : undefined,
              }}
              className="text-base sm:text-lg font-semibold text-app-text mb-4 sm:mb-5 shrink-0"
            >
              Get in touch
            </h2>

            {/* 联系方式卡片 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 sm:mb-8 shrink-0">
              {[
                {
                  delay: 550, node: (
                    <a href="mailto:1756204616@qq.com" className="flex items-center gap-3 px-4 py-3 bg-app-card border border-app-border rounded-3xl sm:rounded-4xl hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_4px_20px_rgba(139,92,246,0.1)] hover:-translate-y-0.5 transition-all duration-300 group">
                      <div className="w-9 h-9 rounded-3xl sm:rounded-4xl bg-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
                        <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                      </div>
                      <div className="min-w-0"><div className="text-xs text-app-muted font-medium">邮箱</div><div className="text-sm text-app-text font-semibold truncate">1756204616@qq.com</div></div>
                    </a>
                  )
                },
                {
                  delay: 600, node: (
                    <a href="#" className="flex items-center gap-3 px-4 py-3 bg-app-card border border-app-border rounded-3xl sm:rounded-4xl hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_4px_20px_rgba(139,92,246,0.1)] hover:-translate-y-0.5 transition-all duration-300 group">
                      <div className="w-9 h-9 rounded-3xl sm:rounded-4xl bg-green-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
                        <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 003 12c0-.778.099-1.533.284-2.253" /></svg>
                      </div>
                      <div className="min-w-0"><div className="text-xs text-app-muted font-medium">微信</div><div className="text-sm text-app-text font-semibold truncate">fxy98942698338</div></div>
                    </a>
                  )
                },
                {
                  delay: 650, node: (
                    <a href="#" className="flex items-center gap-3 px-4 py-3 bg-app-card border border-app-border rounded-3xl sm:rounded-4xl hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_4px_20px_rgba(139,92,246,0.1)] hover:-translate-y-0.5 transition-all duration-300 group">
                      <div className="w-9 h-9 rounded-3xl sm:rounded-4xl bg-sky-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
                        <svg className="w-4 h-4 text-sky-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12c0 2.39.83 4.59 2.22 6.32L3 22l4.07-2.07A9.93 9.93 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.85 0-3.56-.63-4.92-1.68l-.35-.25-.37.1-2.3.66.66-2.24.12-.37-.26-.35A7.94 7.94 0 014 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8zm1-13h-2v2h2V7zm0 4h-2v6h2v-6z" /></svg>
                      </div>
                      <div className="min-w-0"><div className="text-xs text-app-muted font-medium">QQ</div><div className="text-sm text-app-text font-semibold truncate">1756204616</div></div>
                    </a>
                  )
                },
                {
                  delay: 700, node: (
                    <a href="tel:15085948691" className="flex items-center gap-3 px-4 py-3 bg-app-card border border-app-border rounded-3xl sm:rounded-4xl hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_4px_20px_rgba(139,92,246,0.1)] hover:-translate-y-0.5 transition-all duration-300 group">
                      <div className="w-9 h-9 rounded-3xl sm:rounded-4xl bg-orange-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
                        <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.896-1.596-5.25-3.95-6.846-6.846l1.293-.97c.362-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                      </div>
                      <div className="min-w-0"><div className="text-xs text-app-muted font-medium">电话</div><div className="text-sm text-app-text font-semibold truncate">15085948691</div></div>
                    </a>
                  )
                },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    animationName: booted ? 'fadeInUp' : undefined,
                    animationDuration: booted ? '0.45s' : undefined,
                    animationTimingFunction: booted ? 'cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
                    animationFillMode: booted ? 'backwards' : undefined,
                    animationDelay: booted ? `${item.delay}ms` : undefined,
                  }}
                >
                  {item.node}
                </div>
              ))}
            </div>

            {/* About me */}
            <div className="mt-2 shrink-0">
              <h3
                style={{
                  animationName: booted ? 'fadeInLeft' : undefined,
                  animationDuration: booted ? '0.4s' : undefined,
                  animationTimingFunction: booted ? 'cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
                  animationFillMode: booted ? 'backwards' : undefined,
                  animationDelay: booted ? '650ms' : undefined,
                }}
                className="text-sm font-medium text-app-muted mb-4"
              >
                About me
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    delay: 700, node: (
                      <div className="flex items-center gap-3 px-3 sm:px-4 py-3 bg-amber-50 border border-amber-200 rounded-3xl sm:rounded-4xl hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 group">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-3xl sm:rounded-4xl bg-amber-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs text-amber-500 font-medium">当前状态</div>
                          <div className="text-xs sm:text-sm text-amber-800 font-semibold truncate">专注前端开发与页面打磨</div>
                        </div>
                      </div>
                    )
                  },
                  {
                    delay: 750, node: (
                      <div className="flex items-center gap-3 px-3 sm:px-4 py-3 bg-rose-50 border border-rose-200 rounded-3xl sm:rounded-4xl hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 group">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-3xl sm:rounded-4xl bg-rose-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs text-rose-500 font-medium">爱好</div>
                          <div className="text-xs sm:text-sm text-rose-800 font-semibold truncate">二次元 · 界面美学 · 动画</div>
                        </div>
                      </div>
                    )
                  },
                  {
                    delay: 800, node: (
                      <div className="flex items-center gap-3 px-3 sm:px-4 py-3 bg-violet-50 border border-violet-200 rounded-3xl sm:rounded-4xl hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 group">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-3xl sm:rounded-4xl bg-violet-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs text-violet-500 font-medium">喜欢</div>
                          <div className="text-xs sm:text-sm text-violet-800 font-semibold truncate">紫罗兰永恒花园</div>
                        </div>
                      </div>
                    )
                  },
                  {
                    delay: 850, node: (
                      <button
                        onClick={async () => {
                          const url = window.location.href
                          const text = '来看看 Lycoris 的 BitLeap —— 小工具，大跨越 ✨'
                          if (navigator.share) {
                            try { await navigator.share({ title: 'BitLeap', text, url }) } catch { }
                          } else {
                            await navigator.clipboard.writeText(`${text}\n${url}`)
                            alert('链接已复制到剪贴板 🎉')
                          }
                        }}
                        className="flex items-center gap-3 px-3 sm:px-4 py-3 bg-sky-50 border border-sky-200 rounded-3xl sm:rounded-4xl hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 group w-full"
                      >
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-3xl sm:rounded-4xl bg-sky-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m4.24-10.586a2.25 2.25 0 100 2.186m0-2.186a2.25 2.25 0 01.283 1.093 2.25 2.25 0 01-.283 1.093m0-2.186L9.75 12m10.217 4.907L9.75 12m0-4.907l10.217-5.314" />
                          </svg>
                        </div>
                        <div className="min-w-0 text-left">
                          <div className="text-xs text-sky-500 font-medium">分享</div>
                          <div className="text-xs sm:text-sm text-sky-800 font-semibold truncate">分享BitLeap</div>
                        </div>
                      </button>
                    )
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    style={{
                      animationName: booted ? 'fadeInUp' : undefined,
                      animationDuration: booted ? '0.45s' : undefined,
                      animationTimingFunction: booted ? 'cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
                      animationFillMode: booted ? 'backwards' : undefined,
                      animationDelay: booted ? `${item.delay}ms` : undefined,
                    }}
                    className="w-full"
                  >
                    {item.node}
                  </div>
                ))}
              </div>
            </div>

            <div className="h-8 sm:h-12 shrink-0" />
          </div>
        </div>
      </div>
    </div>
  )
}