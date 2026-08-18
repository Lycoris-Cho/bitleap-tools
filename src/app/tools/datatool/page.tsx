'use client'
import { Breadcrumb } from '@/components/breadcrumb'
export default function VideoDownloadHelper() {
  return (
    <div className="max-w-2xl mx-auto py-16 px-6">
      <Breadcrumb />
      <h1 className="text-3xl font-bold mb-3">视频链接下载（第三方工具）</h1>
      <p className="text-app-muted mb-10">
        粘贴平台分享链接到下方解析站，选择画质即可下载。BitLeap 不提供解析服务，仅做工具展示。
      </p>

      <div className="rounded-2xl border border-app-border bg-app-bg/70 backdrop-blur p-6 shadow-sm">
        <div className="text-lg font-medium mb-2">DataTool</div>
        <div className="text-sm text-gray-500 mb-4">
          支持 B 站 / 抖音 / YouTube / TikTok / 小红书 等，网页端 + 扩展 + 桌面端
        </div>
        <a
          href="https://www.datatool.vip/zh"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-5 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition"
        >
          前往解析下载
        </a>
      </div>

      <p className="text-xs text-app-muted mt-10 leading-relaxed">
        免责声明：本页仅为工具导航，不解析、不存储、不转发任何视频数据。
        使用外部服务需遵守各平台条款与著作权法，仅限个人备份或已获授权内容。
        第三方站点可用性、画质与合规性由其自行负责。
      </p>
    </div>
  )
}