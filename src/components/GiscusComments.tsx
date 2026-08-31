'use client'

import Giscus from '@giscus/react'

export default function GiscusComments() {
  return (
    <section className="mt-12 border-t border-zinc-200 pt-8 dark:border-zinc-800">
      <div className="mb-6">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          评论
        </h2>

        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          使用 GitHub 登录即可参与讨论
        </p>
      </div>

      <Giscus
        repo="Lycoris-Cho/bitleap-tools"
        repoId="R_kgDOT8mrpw"
        category="Announcements"
        categoryId="DIC_kwDOT8mrp84DE17G"
        mapping="pathname"
        strict="1"
        reactionsEnabled="1"
        emitMetadata="0"
        inputPosition="top"
        theme="preferred_color_scheme"
        lang="zh-CN"
        loading="lazy"
      />
    </section>
  )
}