import type { Metadata } from 'next'
import './globals.css'

import CopyToast from '@/components/CopyToast'
import SiteHeader from '@/components/SiteHeader'

import { Analytics } from '@vercel/analytics/next'

export const metadata: Metadata = {
    title: 'BitLeap – Tiny tools',
    description:
        'A collection of fast, privacy-first online utilities.',
}

/*
 * 开屏动画。
 *
 * 三条硬性约束（否则只会更糟）：
 * 1. 必须是服务器直出的纯 HTML + 内联样式 —— 不能依赖 CSS 文件或 React，
 *    国内网络下这两样都要等，开屏动画自己都出不来；
 * 2. pointer-events:none —— 绝不允许它遮住点击。用户反馈过「点了没反应」，
 *    一个挡住点击的遮罩只会让这个问题更严重；
 * 3. 淡出由一小段内联脚本负责：window.load 触发、或最多 2400ms 后收场，
 *    并且同一次会话内只出现一次（sessionStorage），避免每次跳转都看一遍。
 */
const SPLASH_CSS = `
#bl-splash{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;
  background:#f7f7f5;pointer-events:none;transition:opacity .5s ease,visibility .5s ease}
html.bls-off #bl-splash{opacity:0;visibility:hidden}
#bl-splash .bls-glow{position:absolute;width:34rem;height:34rem;border-radius:999px;
  background:radial-gradient(circle at 50% 50%,rgba(196,181,253,.42),rgba(186,230,253,.22) 45%,transparent 70%);
  filter:blur(60px);animation:bls-breathe 3.2s ease-in-out infinite}
#bl-splash .bls-box{position:relative;display:flex;flex-direction:column;align-items:center;gap:14px}
#bl-splash .bls-mark{font:500 34px/1 -apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",system-ui,sans-serif;
  letter-spacing:-.05em;color:#151515;animation:bls-rise .6s cubic-bezier(.16,1,.3,1) both}
#bl-splash .bls-mark span{background:linear-gradient(90deg,#8b5cf6,#e879f9 45%,#38bdf8);
  -webkit-background-clip:text;background-clip:text;color:transparent}
#bl-splash .bls-sub{font:400 11px/1 -apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",system-ui,sans-serif;
  letter-spacing:.26em;text-transform:uppercase;color:#a1a1aa;animation:bls-rise .6s cubic-bezier(.16,1,.3,1) .08s both}
#bl-splash .bls-bar{position:relative;width:168px;height:3px;border-radius:999px;background:rgba(0,0,0,.07);overflow:hidden;
  animation:bls-rise .6s cubic-bezier(.16,1,.3,1) .16s both}
#bl-splash .bls-bar i{position:absolute;top:0;bottom:0;width:40%;border-radius:999px;
  background:linear-gradient(90deg,#8b5cf6,#e879f9,#38bdf8);animation:bls-run 1.15s ease-in-out infinite}
#bl-splash .bls-note{font:400 12px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",system-ui,sans-serif;
  color:#a1a1aa;animation:bls-rise .6s cubic-bezier(.16,1,.3,1) .24s both}
@keyframes bls-run{0%{left:-42%}100%{left:102%}}
@keyframes bls-rise{from{opacity:0;transform:translate3d(0,10px,0)}to{opacity:1;transform:none}}
@keyframes bls-breathe{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.08);opacity:1}}
@media (prefers-reduced-motion: reduce){
  #bl-splash .bls-glow,#bl-splash .bls-mark,#bl-splash .bls-sub,#bl-splash .bls-bar,#bl-splash .bls-note{animation:none}
  #bl-splash .bls-bar i{animation:none;left:30%}
}
`

const SPLASH_JS = `(function(){
var doc=document.documentElement;
var seen=false;try{seen=!!sessionStorage.getItem('bl.splash.seen');}catch(e){}
if(seen){doc.className+=' bls-off';return;}
var t0=Date.now();
function hide(){
  try{sessionStorage.setItem('bl.splash.seen','1');}catch(e){}
  /* 最少展示 450ms：网速快的时候也要看得见，不能"闪一下就没了" */
  var wait=Math.max(0,450-(Date.now()-t0));
  setTimeout(function(){doc.className+=' bls-off';},wait);
}
if(document.readyState==='complete')hide();else window.addEventListener('load',hide);
setTimeout(hide,2600);
})();`;



export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="zh-CN" suppressHydrationWarning>
            <head>
                <style dangerouslySetInnerHTML={{ __html: SPLASH_CSS }} />
            </head>
            <body className="min-h-screen bg-app-bg text-app-text antialiased">
                {/*
                  开屏动画由服务器直接输出（保证首屏就画得出来），内联脚本只负责在
                  <html> 上加一个 bls-off 类让它淡出 —— 不删节点，React 水合不会不一致
                  （<html> 上已有 suppressHydrationWarning）。同一会话内看过就直接跳过。
                */}
                <div id="bl-splash" aria-hidden="true">
                    <span className="bls-glow" />
                    <div className="bls-box">
                        <div className="bls-mark">
                            Bit<span>Leap</span>
                        </div>
                        <div className="bls-sub">Tiny tools, big leap</div>
                        <div className="bls-bar">
                            <i />
                        </div>
                        <div className="bls-note">正在准备工具…</div>
                    </div>
                </div>
                <script dangerouslySetInnerHTML={{ __html: SPLASH_JS }} />

                <CopyToast />

                <div className="flex min-h-screen flex-col">
                    <SiteHeader />

                    <main className="flex-1 pt-16 bg-app-bg">
                        {children}
                    </main>
                </div>

                <Analytics />
            </body>
        </html>
    )
}
