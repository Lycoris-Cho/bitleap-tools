'use client'

import Giscus from '@giscus/react'

export default function CommunityComments() {
    return (
        <section className="mt-10 border-t border-black/[0.07] pt-8">
            <div className="mb-6">
                <div className="text-[9px] uppercase tracking-[0.22em] text-zinc-300">
                    Discussion / Comments
                </div>

                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
                    参与讨论
                </h2>

                <p className="mt-2 text-sm leading-6 text-zinc-400">
                    评论由 GitHub Discussions 提供，需要登录 GitHub。
                </p>
            </div>

            <div className="rounded-[24px] border border-black/[0.06] bg-white p-4 sm:p-5">
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
            </div>
        </section>
    )
}