'use client'

import { useState, useMemo } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

// ========== 数据 ==========
type GitCommand = {
  category: string
  name: string
  command: string
  description: string
  note?: string
}

const GIT_COMMANDS: GitCommand[] = [
  // 基础
  { category: '基础操作', name: '初始化仓库', command: 'git init', description: '在当前目录创建新的 Git 仓库' },
  { category: '基础操作', name: '克隆仓库', command: 'git clone <repository-url>', description: '下载远程仓库到本地' },
  { category: '基础操作', name: '查看状态', command: 'git status', description: '显示工作区文件变更状态' },
  { category: '基础操作', name: '查看简洁状态', command: 'git status -s', description: '简洁模式显示变更（两列输出）' },
  { category: '基础操作', name: '查看日志', command: 'git log', description: '显示提交历史' },
  { category: '基础操作', name: '图形化日志', command: 'git log --oneline --graph --all', description: '图形化显示所有分支提交历史' },
  { category: '基础操作', name: '查看差异', command: 'git diff', description: '显示工作区与暂存区的差异' },
  { category: '基础操作', name: '查看已暂存差异', command: 'git diff --staged', description: '显示暂存区与上一次提交的差异' },

  // 文件操作
  { category: '文件操作', name: '添加文件到暂存区', command: 'git add <file>', description: '将指定文件加入暂存区' },
  { category: '文件操作', name: '添加所有变更', command: 'git add .', description: '将所有变更（新增/修改/删除）加入暂存区' },
  { category: '文件操作', name: '提交变更', command: 'git commit -m "<message>"', description: '提交暂存区到本地仓库' },
  { category: '文件操作', name: '暂存并提交所有', command: 'git commit -am "<message>"', description: '自动暂存已跟踪文件并提交（不含新文件）' },
  { category: '文件操作', name: '修改最近一次提交', command: 'git commit --amend', description: '将当前暂存区追加到上一次提交（可修改 message）', note: '⚠️ 已推送的提交不要 amend' },
  { category: '文件操作', name: '删除文件', command: 'git rm <file>', description: '从工作区和暂存区同时删除文件' },
  { category: '文件操作', name: '停止跟踪文件', command: 'git rm --cached <file>', description: '从暂存区移除，但保留在工作区（常用于 .gitignore 后）' },
  { category: '文件操作', name: '移动/重命名', command: 'git mv <old> <new>', description: '移动或重命名文件并自动暂存' },

  // 分支
  { category: '分支管理', name: '列出本地分支', command: 'git branch', description: '显示所有本地分支（当前分支前有 *）' },
  { category: '分支管理', name: '列出所有分支', command: 'git branch -a', description: '显示本地和远程所有分支' },
  { category: '分支管理', name: '创建新分支', command: 'git branch <branch-name>', description: '基于当前 HEAD 创建新分支' },
  { category: '分支管理', name: '切换分支', command: 'git checkout <branch-name>', description: '切换到指定分支' },
  { category: '分支管理', name: '创建并切换', command: 'git checkout -b <branch-name>', description: '创建新分支并立即切换过去' },
  { category: '分支管理', name: '切换分支（新版）', command: 'git switch <branch-name>', description: 'Git 2.23+ 推荐的切换分支命令' },
  { category: '分支管理', name: '创建并切换（新版）', command: 'git switch -c <branch-name>', description: '创建并切换到新分支' },
  { category: '分支管理', name: '删除分支', command: 'git branch -d <branch-name>', description: '删除已合并的分支' },
  { category: '分支管理', name: '强制删除分支', command: 'git branch -D <branch-name>', description: '强制删除分支（即使未合并）' },
  { category: '分支管理', name: '重命名分支', command: 'git branch -m <new-name>', description: '重命名当前分支' },

  // 远程
  { category: '远程操作', name: '查看远程仓库', command: 'git remote -v', description: '显示所有远程仓库地址' },
  { category: '远程操作', name: '添加远程仓库', command: 'git remote add origin <url>', description: '关联一个远程仓库（通常命名为 origin）' },
  { category: '远程操作', name: '拉取并合并', command: 'git pull', description: '从远程拉取并自动合并到当前分支' },
  { category: '远程操作', name: '拉取不合并', command: 'git fetch', description: '从远程下载最新数据但不合并' },
  { category: '远程操作', name: '推送到远程', command: 'git push', description: '将本地提交推送到远程仓库' },
  { category: '远程操作', name: '推送并设置上游', command: 'git push -u origin <branch>', description: '推送并关联远程分支（首次推送必用）' },
  { category: '远程操作', name: '强制推送', command: 'git push --force', description: '强制覆盖远程分支', note: '⚠️ 会覆盖远程历史，慎用！' },
  { category: '远程操作', name: '删除远程分支', command: 'git push origin --delete <branch>', description: '删除远程仓库的分支' },

  // 撤销/回退
  { category: '撤销回退', name: '撤销工作区修改', command: 'git restore <file>', description: '丢弃工作区中指定文件的修改（Git 2.23+）' },
  { category: '撤销回退', name: '取消暂存', command: 'git restore --staged <file>', description: '将文件从暂存区移回工作区' },
  { category: '撤销回退', name: '回退到指定提交', command: 'git reset --hard <commit>', description: '将 HEAD 和工作区都回退到指定提交', note: '⚠️ 会丢失之后的所有修改' },
  { category: '撤销回退', name: '软回退', command: 'git reset --soft <commit>', description: '回退 HEAD 但保留暂存区和工作区' },
  { category: '撤销回退', name: '创建反向提交', command: 'git revert <commit>', description: '生成一个新提交来撤销指定提交的变更（安全，不重写历史）' },

  // 暂存
  { category: '暂存区（Stash）', name: '暂存当前修改', command: 'git stash', description: '将未提交的修改临时保存' },
  { category: '暂存区（Stash）', name: '查看暂存列表', command: 'git stash list', description: '列出所有暂存的修改' },
  { category: '暂存区（Stash）', name: '恢复最近暂存', command: 'git stash pop', description: '恢复最近一次暂存并删除暂存记录' },
  { category: '暂存区（Stash）', name: '恢复但不删除', command: 'git stash apply', description: '恢复暂存但保留暂存记录' },
  { category: '暂存区（Stash）', name: '删除暂存', command: 'git stash drop', description: '删除最近一次暂存记录' },

  // 标签
  { category: '标签', name: '列出标签', command: 'git tag', description: '显示所有标签' },
  { category: '标签', name: '创建标签', command: 'git tag -a v1.0 -m "message"', description: '创建带注释的标签' },
  { category: '标签', name: '推送标签', command: 'git push origin --tags', description: '将所有本地标签推送到远程' },
  { category: '标签', name: '删除标签', command: 'git tag -d v1.0', description: '删除本地标签' },

  // 高级
  { category: '高级操作', name: '变基', command: 'git rebase <branch>', description: '将当前分支的提交移到目标分支之上', note: '⚠️ 不要对已推送的提交做 rebase' },
  { category: '高级操作', name: '交互式变基', command: 'git rebase -i HEAD~3', description: '交互式修改最近 3 个提交（合并/修改/删除）' },
  { category: '高级操作', name: '挑选提交', command: 'git cherry-pick <commit>', description: '将指定提交应用到当前分支' },
  { category: '高级操作', name: '二分查找 Bug', command: 'git bisect start', description: '用二分法定位引入 Bug 的提交' },
  { category: '高级操作', name: '清理未跟踪文件', command: 'git clean -fd', description: '强制删除所有未跟踪的文件和目录' },
  { category: '高级操作', name: '查看配置', command: 'git config --list', description: '显示所有 Git 配置' },
  { category: '高级操作', name: '设置用户名', command: 'git config --global user.name "Your Name"', description: '全局设置提交时显示的用户名' },
  { category: '高级操作', name: '设置邮箱', command: 'git config --global user.email "you@example.com"', description: '全局设置提交时显示的邮箱' },
]

const CATEGORIES = ['全部', ...Array.from(new Set(GIT_COMMANDS.map(c => c.category)))]

// ========== 主页面 ==========
export default function GitCheatsheetPage() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('全部')
  const [copied, setCopied] = useState<string | null>(null)
  const [error, setError] = useState('')

  // ========== 过滤（实时计算）==========
  const filtered = useMemo(() => {
    try {
      return GIT_COMMANDS.filter(cmd => {
        const matchCategory = activeCategory === '全部' || cmd.category === activeCategory
        const matchSearch = !search.trim() ||
          cmd.name.toLowerCase().includes(search.toLowerCase()) ||
          cmd.command.toLowerCase().includes(search.toLowerCase()) ||
          cmd.description.toLowerCase().includes(search.toLowerCase())
        return matchCategory && matchSearch
      })
    } catch {
      setError('搜索出错，请重试')
      return []
    }
  }, [search, activeCategory])

  // 按分类分组
  const grouped = useMemo(() => {
    const map = new Map<string, GitCommand[]>()
    for (const cmd of filtered) {
      if (!map.has(cmd.category)) map.set(cmd.category, [])
      map.get(cmd.category)!.push(cmd)
    }
    return Array.from(map.entries())
  }, [filtered])

  // ========== 复制 ==========
  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      setError('复制失败，请手动复制')
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
      <Breadcrumb />

      {/* 标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2 text-gray-900">Git 命令速查</h1>
        <p className="text-app-muted text-sm">常用 Git 操作一键查询，支持搜索、分类筛选、一键复制</p>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-mono">
          ❌ {error}
        </div>
      )}

      {/* 搜索 + 分类筛选 */}
      <div className="space-y-4 mb-8">
        <div className="flex gap-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索命令或描述，如：branch、撤销、stash..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 text-gray-900 bg-white placeholder-gray-400"
          />
          <button
            onClick={() => { setSearch(''); setActiveCategory('全部') }}
            className="px-4 py-2.5 text-sm border border-app-border rounded-xl text-gray-700 hover:bg-gray-50transition-colors shrink-0"
          >
            重置
          </button>
        </div>

        {/* 分类标签 */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeCategory === cat
                  ? 'bg-violet-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 结果 */}
      <div className="space-y-8">
        {grouped.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">没有找到匹配的 Git 命令</p>
            <p className="text-gray-300 text-xs mt-2">试试搜索 "branch"、"撤销" 或清空筛选条件</p>
          </div>
        ) : (
          grouped.map(([category, commands]) => (
            <div key={category}>
              <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-violet-500 rounded-full inline-block" />
                {category}
                <span className="text-xs font-normal text-gray-400">({commands.length})</span>
              </h2>
              <div className="space-y-3">
                {commands.map((cmd, i) => {
                  const copyKey = `${category}-${i}`
                  return (
                    <div key={copyKey} className="flex items-center justify-between p-4 bg-white border border-app-border rounded-xl hover:border-violet-200 transition-all">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-900">{cmd.name}</span>
                          {cmd.note && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-orange-50 text-orange-600 border border-orange-200 rounded">
                              {cmd.note}
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-sm text-emerald-600 break-all">{cmd.command}</div>
                        <div className="text-xs text-app-muted mt-1">{cmd.description}</div>
                      </div>
                      <button
                        onClick={() => copy(cmd.command, copyKey)}
                        className="shrink-0 ml-4 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 active:scale-95 transition-all"
                      >
                        {copied === copyKey ? '✓ 已复制' : '📋 复制'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 说明卡片 */}
      <div className="mt-10 p-4 bg-gray-50 border border-app-border rounded-xl">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">💡 使用说明</h3>
        <ul className="text-xs text-app-muted space-y-1.5 leading-relaxed">
          <li>• 搜索框支持模糊匹配命令名、命令内容和描述文字</li>
          <li>• 点击分类标签可快速筛选（如"分支管理"、"撤销回退"）</li>
          <li>• 橙色标签标注了需要特别注意的高风险命令</li>
          <li>• 所有数据纯前端，无需联网，可离线使用</li>
          <li>• 尖括号 <code className="font-mono text-gray-500">&lt;xxx&gt;</code> 表示需要替换的占位符</li>
        </ul>
      </div>

      <FooterNote />
    </div>
  )
}