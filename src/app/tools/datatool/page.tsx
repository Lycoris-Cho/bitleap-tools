'use client'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

export default function VideoDownloadHelper() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">视频链接下载（第三方工具）</h1>
        <p className="text-app-muted text-sm">
          粘贴平台分享链接到下方解析站，选择画质即可下载。BitLeap 不提供解析服务，仅做工具展示。
        </p>
      </div>

      <div className="rounded-2xl border border-app-border bg-app-bg/70 backdrop-blur p-6 shadow-sm">
        <div className="text-lg font-semibold text-gray-800 mb-1">DataTool</div>
        <div className="text-sm text-app-muted mb-5">
          支持 B 站 / 抖音 / YouTube / TikTok / 小红书 等，网页端 + 扩展 + 桌面端
        </div>
        <a
          href="https://www.datatool.vip/zh"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-5 py-2.5 bg-violet-500 text-white text-sm font-medium rounded-lg hover:bg-violet-600 active:scale-95 transition-all shadow-sm shadow-violet-500/20"
        >
          前往解析下载 →
        </a>
      </div>

      {/* 说明卡片 */}
      <div className="mt-10 p-4 bg-gray-50 border border-app-border rounded-xl">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">免责声明</h3>
        <ul className="text-xs text-app-muted space-y-1.5 leading-relaxed">
          <li>• 本页仅为工具导航，不解析、不存储、不转发任何视频数据</li>
          <li>• 使用外部服务需遵守各平台条款与著作权法，仅限个人备份或已获授权内容</li>
          <li>• 第三方站点可用性、画质与合规性由其自行负责</li>
        </ul>
      </div>

      <FooterNote />
    </div>
  )
}