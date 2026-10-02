/* ==========================================================================
   海报尺寸契约（所有角色海报都必须套这一层）
   --------------------------------------------------------------------------
   背景：根布局里 <main className="pt-16"> 给固定在顶部的 SiteHeader 让出 4rem，
   所以海报如果按 min-h-[calc(100vh-4rem)] 来写，就被减了两次 64px ——
   导出的图片高度因此比显示器矮一截（"下载的图高度不对劲"就是这个原因）。

   三个类各自解决一件事：
     -mt-16      抵消 main 的 pt-16：海报从屏幕最顶端开始，页头浮在海报之上
     pt-16       把海报内容整体推下来：不会被固定导航栏盖住
     h-[100svh]  海报高度 = 一屏（svh 用移动端的小视口高度，避免地址栏收起时跳动）

   结果：海报正好等于一屏，导出图片的高度 = 当前显示器高度，任何窗口、任何页面都一致。
   新增海报请直接用 POSTER_SHELL / POSTER_SURFACE，不要再自己写 vh 减法。
   ========================================================================== */

export const POSTER_SHELL = "-mt-16 h-[100svh] w-full"
export const POSTER_SURFACE = "relative h-full w-full overflow-hidden pt-16"

/** 需要包裹式用法（不自己写外层 div）时用这个 */
export function PosterShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <div className={`${POSTER_SHELL} ${className}`}>{children}</div>
}

/** 顶部浮层（面包屑 / 保存按钮）的定位类：坐在页头下方，且不参与导出 */
export const POSTER_OVERLAY = "pointer-events-none absolute inset-x-0 top-16 z-20 mx-auto flex max-w-[1660px] items-center justify-between gap-4 px-5 pt-4 sm:px-8"
