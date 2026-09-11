"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type RiskLevel = "safe" | "watch" | "danger"
type CopyKey = "all" | "report" | "materialized" | "workflow" | string | null

type GitCommand = {
  id: string
  category: string
  name: string
  command: string
  description: string
  note: string
  risk: RiskLevel
  modern: boolean
  keywords: string[]
}

type PlaceholderValues = Record<string, string>

const STORAGE_KEY = "bitleap-git-cheatsheet-favorites"

const GIT_COMMANDS = [
  {
    "id": "base-1",
    "category": "基础操作",
    "name": "初始化仓库",
    "command": "git init",
    "description": "在当前目录创建新的 Git 仓库",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git init",
      "初始化仓库",
      "在当前目录创建新的 Git 仓库",
      "基础操作"
    ]
  },
  {
    "id": "base-2",
    "category": "基础操作",
    "name": "克隆仓库",
    "command": "git clone <repository-url>",
    "description": "下载远程仓库到本地",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git clone <repository-url>",
      "下载远程仓库到本地",
      "克隆仓库",
      "基础操作"
    ]
  },
  {
    "id": "base-3",
    "category": "基础操作",
    "name": "查看状态",
    "command": "git status",
    "description": "显示工作区文件变更状态",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git status",
      "基础操作",
      "显示工作区文件变更状态",
      "查看状态"
    ]
  },
  {
    "id": "base-4",
    "category": "基础操作",
    "name": "查看简洁状态",
    "command": "git status -s",
    "description": "简洁模式显示变更（两列输出）",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git status -s",
      "基础操作",
      "查看简洁状态",
      "简洁模式显示变更（两列输出）"
    ]
  },
  {
    "id": "base-5",
    "category": "基础操作",
    "name": "查看日志",
    "command": "git log",
    "description": "显示提交历史",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git log",
      "基础操作",
      "显示提交历史",
      "查看日志"
    ]
  },
  {
    "id": "base-6",
    "category": "基础操作",
    "name": "图形化日志",
    "command": "git log --oneline --graph --all",
    "description": "图形化显示所有分支提交历史",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git log --oneline --graph --all",
      "图形化日志",
      "图形化显示所有分支提交历史",
      "基础操作"
    ]
  },
  {
    "id": "base-7",
    "category": "基础操作",
    "name": "查看差异",
    "command": "git diff",
    "description": "显示工作区与暂存区的差异",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git diff",
      "基础操作",
      "显示工作区与暂存区的差异",
      "查看差异"
    ]
  },
  {
    "id": "base-8",
    "category": "基础操作",
    "name": "查看已暂存差异",
    "command": "git diff --staged",
    "description": "显示暂存区与上一次提交的差异",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git diff --staged",
      "基础操作",
      "显示暂存区与上一次提交的差异",
      "查看已暂存差异"
    ]
  },
  {
    "id": "base-9",
    "category": "文件操作",
    "name": "添加文件到暂存区",
    "command": "git add <file>",
    "description": "将指定文件加入暂存区",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git add <file>",
      "将指定文件加入暂存区",
      "文件操作",
      "添加文件到暂存区"
    ]
  },
  {
    "id": "base-10",
    "category": "文件操作",
    "name": "添加所有变更",
    "command": "git add .",
    "description": "将所有变更（新增/修改/删除）加入暂存区",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git add .",
      "将所有变更（新增/修改/删除）加入暂存区",
      "文件操作",
      "添加所有变更"
    ]
  },
  {
    "id": "base-11",
    "category": "文件操作",
    "name": "提交变更",
    "command": "git commit -m \"<message>\"",
    "description": "提交暂存区到本地仓库",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git commit -m \"<message>\"",
      "提交变更",
      "提交暂存区到本地仓库",
      "文件操作"
    ]
  },
  {
    "id": "base-12",
    "category": "文件操作",
    "name": "暂存并提交所有",
    "command": "git commit -am \"<message>\"",
    "description": "自动暂存已跟踪文件并提交（不含新文件）",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git commit -am \"<message>\"",
      "文件操作",
      "暂存并提交所有",
      "自动暂存已跟踪文件并提交（不含新文件）"
    ]
  },
  {
    "id": "base-13",
    "category": "文件操作",
    "name": "修改最近一次提交",
    "command": "git commit --amend",
    "description": "将当前暂存区追加到上一次提交（可修改 message）",
    "note": "⚠️ 已推送的提交不要 amend",
    "risk": "danger",
    "modern": false,
    "keywords": [
      "git commit --amend",
      "修改最近一次提交",
      "将当前暂存区追加到上一次提交（可修改 message）",
      "文件操作"
    ]
  },
  {
    "id": "base-14",
    "category": "文件操作",
    "name": "删除文件",
    "command": "git rm <file>",
    "description": "从工作区和暂存区同时删除文件",
    "note": "",
    "risk": "watch",
    "modern": false,
    "keywords": [
      "git rm <file>",
      "从工作区和暂存区同时删除文件",
      "删除文件",
      "文件操作"
    ]
  },
  {
    "id": "base-15",
    "category": "文件操作",
    "name": "停止跟踪文件",
    "command": "git rm --cached <file>",
    "description": "从暂存区移除，但保留在工作区（常用于 .gitignore 后）",
    "note": "",
    "risk": "watch",
    "modern": false,
    "keywords": [
      "git rm --cached <file>",
      "从暂存区移除，但保留在工作区（常用于 .gitignore 后）",
      "停止跟踪文件",
      "文件操作"
    ]
  },
  {
    "id": "base-16",
    "category": "文件操作",
    "name": "移动/重命名",
    "command": "git mv <old> <new>",
    "description": "移动或重命名文件并自动暂存",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git mv <old> <new>",
      "文件操作",
      "移动/重命名",
      "移动或重命名文件并自动暂存"
    ]
  },
  {
    "id": "base-17",
    "category": "分支管理",
    "name": "列出本地分支",
    "command": "git branch",
    "description": "显示所有本地分支（当前分支前有 *）",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git branch",
      "分支管理",
      "列出本地分支",
      "显示所有本地分支（当前分支前有 *）"
    ]
  },
  {
    "id": "base-18",
    "category": "分支管理",
    "name": "列出所有分支",
    "command": "git branch -a",
    "description": "显示本地和远程所有分支",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git branch -a",
      "分支管理",
      "列出所有分支",
      "显示本地和远程所有分支"
    ]
  },
  {
    "id": "base-19",
    "category": "分支管理",
    "name": "创建新分支",
    "command": "git branch <branch-name>",
    "description": "基于当前 HEAD 创建新分支",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git branch <branch-name>",
      "分支管理",
      "创建新分支",
      "基于当前 HEAD 创建新分支"
    ]
  },
  {
    "id": "base-20",
    "category": "分支管理",
    "name": "切换分支",
    "command": "git checkout <branch-name>",
    "description": "切换到指定分支",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git checkout <branch-name>",
      "分支管理",
      "切换分支",
      "切换到指定分支"
    ]
  },
  {
    "id": "base-21",
    "category": "分支管理",
    "name": "创建并切换",
    "command": "git checkout -b <branch-name>",
    "description": "创建新分支并立即切换过去",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git checkout -b <branch-name>",
      "分支管理",
      "创建并切换",
      "创建新分支并立即切换过去"
    ]
  },
  {
    "id": "base-22",
    "category": "分支管理",
    "name": "切换分支（新版）",
    "command": "git switch <branch-name>",
    "description": "Git 2.23+ 推荐的切换分支命令",
    "note": "",
    "risk": "safe",
    "modern": true,
    "keywords": [
      "Git 2.23+ 推荐的切换分支命令",
      "git switch <branch-name>",
      "分支管理",
      "切换分支（新版）"
    ]
  },
  {
    "id": "base-23",
    "category": "分支管理",
    "name": "创建并切换（新版）",
    "command": "git switch -c <branch-name>",
    "description": "创建并切换到新分支",
    "note": "",
    "risk": "safe",
    "modern": true,
    "keywords": [
      "git switch -c <branch-name>",
      "分支管理",
      "创建并切换到新分支",
      "创建并切换（新版）"
    ]
  },
  {
    "id": "base-24",
    "category": "分支管理",
    "name": "删除分支",
    "command": "git branch -d <branch-name>",
    "description": "删除已合并的分支",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git branch -d <branch-name>",
      "分支管理",
      "删除分支",
      "删除已合并的分支"
    ]
  },
  {
    "id": "base-25",
    "category": "分支管理",
    "name": "强制删除分支",
    "command": "git branch -D <branch-name>",
    "description": "强制删除分支（即使未合并）",
    "note": "",
    "risk": "danger",
    "modern": false,
    "keywords": [
      "git branch -D <branch-name>",
      "分支管理",
      "强制删除分支",
      "强制删除分支（即使未合并）"
    ]
  },
  {
    "id": "base-26",
    "category": "分支管理",
    "name": "重命名分支",
    "command": "git branch -m <new-name>",
    "description": "重命名当前分支",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git branch -m <new-name>",
      "分支管理",
      "重命名分支",
      "重命名当前分支"
    ]
  },
  {
    "id": "base-27",
    "category": "远程操作",
    "name": "查看远程仓库",
    "command": "git remote -v",
    "description": "显示所有远程仓库地址",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git remote -v",
      "显示所有远程仓库地址",
      "查看远程仓库",
      "远程操作"
    ]
  },
  {
    "id": "base-28",
    "category": "远程操作",
    "name": "添加远程仓库",
    "command": "git remote add origin <url>",
    "description": "关联一个远程仓库（通常命名为 origin）",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git remote add origin <url>",
      "关联一个远程仓库（通常命名为 origin）",
      "添加远程仓库",
      "远程操作"
    ]
  },
  {
    "id": "base-29",
    "category": "远程操作",
    "name": "拉取并合并",
    "command": "git pull",
    "description": "从远程拉取并自动合并到当前分支",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git pull",
      "从远程拉取并自动合并到当前分支",
      "拉取并合并",
      "远程操作"
    ]
  },
  {
    "id": "base-30",
    "category": "远程操作",
    "name": "拉取不合并",
    "command": "git fetch",
    "description": "从远程下载最新数据但不合并",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git fetch",
      "从远程下载最新数据但不合并",
      "拉取不合并",
      "远程操作"
    ]
  },
  {
    "id": "base-31",
    "category": "远程操作",
    "name": "推送到远程",
    "command": "git push",
    "description": "将本地提交推送到远程仓库",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git push",
      "将本地提交推送到远程仓库",
      "推送到远程",
      "远程操作"
    ]
  },
  {
    "id": "base-32",
    "category": "远程操作",
    "name": "推送并设置上游",
    "command": "git push -u origin <branch>",
    "description": "推送并关联远程分支（首次推送必用）",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git push -u origin <branch>",
      "推送并关联远程分支（首次推送必用）",
      "推送并设置上游",
      "远程操作"
    ]
  },
  {
    "id": "base-33",
    "category": "远程操作",
    "name": "强制推送",
    "command": "git push --force",
    "description": "强制覆盖远程分支",
    "note": "⚠️ 会覆盖远程历史，慎用！",
    "risk": "danger",
    "modern": false,
    "keywords": [
      "git push --force",
      "强制推送",
      "强制覆盖远程分支",
      "远程操作"
    ]
  },
  {
    "id": "base-34",
    "category": "远程操作",
    "name": "删除远程分支",
    "command": "git push origin --delete <branch>",
    "description": "删除远程仓库的分支",
    "note": "",
    "risk": "watch",
    "modern": false,
    "keywords": [
      "git push origin --delete <branch>",
      "删除远程仓库的分支",
      "删除远程分支",
      "远程操作"
    ]
  },
  {
    "id": "base-35",
    "category": "撤销回退",
    "name": "撤销工作区修改",
    "command": "git restore <file>",
    "description": "丢弃工作区中指定文件的修改（Git 2.23+）",
    "note": "",
    "risk": "safe",
    "modern": true,
    "keywords": [
      "git restore <file>",
      "丢弃工作区中指定文件的修改（Git 2.23+）",
      "撤销回退",
      "撤销工作区修改"
    ]
  },
  {
    "id": "base-36",
    "category": "撤销回退",
    "name": "取消暂存",
    "command": "git restore --staged <file>",
    "description": "将文件从暂存区移回工作区",
    "note": "",
    "risk": "safe",
    "modern": true,
    "keywords": [
      "git restore --staged <file>",
      "取消暂存",
      "将文件从暂存区移回工作区",
      "撤销回退"
    ]
  },
  {
    "id": "base-37",
    "category": "撤销回退",
    "name": "回退到指定提交",
    "command": "git reset --hard <commit>",
    "description": "将 HEAD 和工作区都回退到指定提交",
    "note": "⚠️ 会丢失之后的所有修改",
    "risk": "danger",
    "modern": false,
    "keywords": [
      "git reset --hard <commit>",
      "回退到指定提交",
      "将 HEAD 和工作区都回退到指定提交",
      "撤销回退"
    ]
  },
  {
    "id": "base-38",
    "category": "撤销回退",
    "name": "软回退",
    "command": "git reset --soft <commit>",
    "description": "回退 HEAD 但保留暂存区和工作区",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git reset --soft <commit>",
      "回退 HEAD 但保留暂存区和工作区",
      "撤销回退",
      "软回退"
    ]
  },
  {
    "id": "base-39",
    "category": "撤销回退",
    "name": "创建反向提交",
    "command": "git revert <commit>",
    "description": "生成一个新提交来撤销指定提交的变更（安全，不重写历史）",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git revert <commit>",
      "创建反向提交",
      "撤销回退",
      "生成一个新提交来撤销指定提交的变更（安全，不重写历史）"
    ]
  },
  {
    "id": "base-40",
    "category": "暂存区（Stash）",
    "name": "暂存当前修改",
    "command": "git stash",
    "description": "将未提交的修改临时保存",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git stash",
      "将未提交的修改临时保存",
      "暂存区（Stash）",
      "暂存当前修改"
    ]
  },
  {
    "id": "base-41",
    "category": "暂存区（Stash）",
    "name": "查看暂存列表",
    "command": "git stash list",
    "description": "列出所有暂存的修改",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git stash list",
      "列出所有暂存的修改",
      "暂存区（Stash）",
      "查看暂存列表"
    ]
  },
  {
    "id": "base-42",
    "category": "暂存区（Stash）",
    "name": "恢复最近暂存",
    "command": "git stash pop",
    "description": "恢复最近一次暂存并删除暂存记录",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git stash pop",
      "恢复最近一次暂存并删除暂存记录",
      "恢复最近暂存",
      "暂存区（Stash）"
    ]
  },
  {
    "id": "base-43",
    "category": "暂存区（Stash）",
    "name": "恢复但不删除",
    "command": "git stash apply",
    "description": "恢复暂存但保留暂存记录",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git stash apply",
      "恢复但不删除",
      "恢复暂存但保留暂存记录",
      "暂存区（Stash）"
    ]
  },
  {
    "id": "base-44",
    "category": "暂存区（Stash）",
    "name": "删除暂存",
    "command": "git stash drop",
    "description": "删除最近一次暂存记录",
    "note": "",
    "risk": "watch",
    "modern": false,
    "keywords": [
      "git stash drop",
      "删除暂存",
      "删除最近一次暂存记录",
      "暂存区（Stash）"
    ]
  },
  {
    "id": "base-45",
    "category": "标签",
    "name": "列出标签",
    "command": "git tag",
    "description": "显示所有标签",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git tag",
      "列出标签",
      "显示所有标签",
      "标签"
    ]
  },
  {
    "id": "base-46",
    "category": "标签",
    "name": "创建标签",
    "command": "git tag -a v1.0 -m \"message\"",
    "description": "创建带注释的标签",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git tag -a v1.0 -m \"message\"",
      "创建带注释的标签",
      "创建标签",
      "标签"
    ]
  },
  {
    "id": "base-47",
    "category": "标签",
    "name": "推送标签",
    "command": "git push origin --tags",
    "description": "将所有本地标签推送到远程",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git push origin --tags",
      "将所有本地标签推送到远程",
      "推送标签",
      "标签"
    ]
  },
  {
    "id": "base-48",
    "category": "标签",
    "name": "删除标签",
    "command": "git tag -d v1.0",
    "description": "删除本地标签",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git tag -d v1.0",
      "删除本地标签",
      "删除标签",
      "标签"
    ]
  },
  {
    "id": "base-49",
    "category": "高级操作",
    "name": "变基",
    "command": "git rebase <branch>",
    "description": "将当前分支的提交移到目标分支之上",
    "note": "⚠️ 不要对已推送的提交做 rebase",
    "risk": "danger",
    "modern": false,
    "keywords": [
      "git rebase <branch>",
      "变基",
      "将当前分支的提交移到目标分支之上",
      "高级操作"
    ]
  },
  {
    "id": "base-50",
    "category": "高级操作",
    "name": "交互式变基",
    "command": "git rebase -i HEAD~3",
    "description": "交互式修改最近 3 个提交（合并/修改/删除）",
    "note": "",
    "risk": "watch",
    "modern": false,
    "keywords": [
      "git rebase -i HEAD~3",
      "交互式修改最近 3 个提交（合并/修改/删除）",
      "交互式变基",
      "高级操作"
    ]
  },
  {
    "id": "base-51",
    "category": "高级操作",
    "name": "挑选提交",
    "command": "git cherry-pick <commit>",
    "description": "将指定提交应用到当前分支",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git cherry-pick <commit>",
      "将指定提交应用到当前分支",
      "挑选提交",
      "高级操作"
    ]
  },
  {
    "id": "base-52",
    "category": "高级操作",
    "name": "二分查找 Bug",
    "command": "git bisect start",
    "description": "用二分法定位引入 Bug 的提交",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git bisect start",
      "二分查找 Bug",
      "用二分法定位引入 Bug 的提交",
      "高级操作"
    ]
  },
  {
    "id": "base-53",
    "category": "高级操作",
    "name": "清理未跟踪文件",
    "command": "git clean -fd",
    "description": "强制删除所有未跟踪的文件和目录",
    "note": "",
    "risk": "danger",
    "modern": false,
    "keywords": [
      "git clean -fd",
      "强制删除所有未跟踪的文件和目录",
      "清理未跟踪文件",
      "高级操作"
    ]
  },
  {
    "id": "base-54",
    "category": "高级操作",
    "name": "查看配置",
    "command": "git config --list",
    "description": "显示所有 Git 配置",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git config --list",
      "显示所有 Git 配置",
      "查看配置",
      "高级操作"
    ]
  },
  {
    "id": "base-55",
    "category": "高级操作",
    "name": "设置用户名",
    "command": "git config --global user.name \"Your Name\"",
    "description": "全局设置提交时显示的用户名",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git config --global user.name \"Your Name\"",
      "全局设置提交时显示的用户名",
      "设置用户名",
      "高级操作"
    ]
  },
  {
    "id": "base-56",
    "category": "高级操作",
    "name": "设置邮箱",
    "command": "git config --global user.email \"you@example.com\"",
    "description": "全局设置提交时显示的邮箱",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git config --global user.email \"you@example.com\"",
      "全局设置提交时显示的邮箱",
      "设置邮箱",
      "高级操作"
    ]
  },
  {
    "id": "extra-1",
    "category": "基础操作",
    "name": "简洁图形日志",
    "command": "git log --oneline --decorate --graph --all",
    "description": "更完整地查看分支、标签和提交图谱",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git log --oneline --decorate --graph --all",
      "graph",
      "history",
      "log",
      "基础操作",
      "更完整地查看分支、标签和提交图谱",
      "简洁图形日志"
    ]
  },
  {
    "id": "extra-2",
    "category": "基础操作",
    "name": "查看某次提交",
    "command": "git show <commit>",
    "description": "查看指定提交的说明和变更内容",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "commit",
      "diff",
      "git show <commit>",
      "基础操作",
      "查看指定提交的说明和变更内容",
      "查看某次提交"
    ]
  },
  {
    "id": "extra-3",
    "category": "基础操作",
    "name": "查看文件每行作者",
    "command": "git blame <file>",
    "description": "显示文件每一行最近由谁修改",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "author",
      "file",
      "git blame <file>",
      "基础操作",
      "显示文件每一行最近由谁修改",
      "查看文件每行作者"
    ]
  },
  {
    "id": "extra-4",
    "category": "基础操作",
    "name": "仓库内搜索文本",
    "command": "git grep \"<keyword>\"",
    "description": "在已跟踪文件中搜索关键词",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git grep \"<keyword>\"",
      "grep",
      "search",
      "仓库内搜索文本",
      "在已跟踪文件中搜索关键词",
      "基础操作"
    ]
  },
  {
    "id": "extra-5",
    "category": "文件操作",
    "name": "恢复指定版本文件",
    "command": "git restore --source=<commit> <file>",
    "description": "从某个提交恢复指定文件内容",
    "note": "会覆盖工作区中的该文件",
    "risk": "watch",
    "modern": true,
    "keywords": [
      "commit",
      "file",
      "git restore --source=<commit> <file>",
      "restore",
      "从某个提交恢复指定文件内容",
      "恢复指定版本文件",
      "文件操作"
    ]
  },
  {
    "id": "extra-6",
    "category": "文件操作",
    "name": "只查看文件名差异",
    "command": "git diff --name-only",
    "description": "只列出发生变化的文件路径",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "diff",
      "files",
      "git diff --name-only",
      "只列出发生变化的文件路径",
      "只查看文件名差异",
      "文件操作"
    ]
  },
  {
    "id": "extra-7",
    "category": "文件操作",
    "name": "查看统计差异",
    "command": "git diff --stat",
    "description": "按文件显示增删行统计",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "diff",
      "git diff --stat",
      "stat",
      "按文件显示增删行统计",
      "文件操作",
      "查看统计差异"
    ]
  },
  {
    "id": "extra-8",
    "category": "分支管理",
    "name": "查看分支跟踪状态",
    "command": "git branch -vv",
    "description": "显示本地分支对应的上游分支和 ahead/behind 状态",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "branch",
      "git branch -vv",
      "upstream",
      "分支管理",
      "显示本地分支对应的上游分支和 ahead/behind 状态",
      "查看分支跟踪状态"
    ]
  },
  {
    "id": "extra-9",
    "category": "分支管理",
    "name": "切回上一个分支",
    "command": "git switch -",
    "description": "快速返回上一个分支",
    "note": "",
    "risk": "safe",
    "modern": true,
    "keywords": [
      "branch",
      "git switch -",
      "switch",
      "分支管理",
      "切回上一个分支",
      "快速返回上一个分支"
    ]
  },
  {
    "id": "extra-10",
    "category": "分支管理",
    "name": "设置上游分支",
    "command": "git branch --set-upstream-to=origin/<branch>",
    "description": "把当前本地分支关联到远程分支",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "branch",
      "git branch --set-upstream-to=origin/<branch>",
      "origin",
      "upstream",
      "分支管理",
      "把当前本地分支关联到远程分支",
      "设置上游分支"
    ]
  },
  {
    "id": "extra-11",
    "category": "远程操作",
    "name": "拉取并清理远程引用",
    "command": "git fetch --prune",
    "description": "拉取远程信息并清除已删除的远程分支引用",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "fetch",
      "git fetch --prune",
      "prune",
      "remote",
      "拉取并清理远程引用",
      "拉取远程信息并清除已删除的远程分支引用",
      "远程操作"
    ]
  },
  {
    "id": "extra-12",
    "category": "远程操作",
    "name": "以 rebase 方式拉取",
    "command": "git pull --rebase",
    "description": "拉取远程提交并把本地提交变基到其后",
    "note": "有冲突时需要解决后 continue",
    "risk": "watch",
    "modern": false,
    "keywords": [
      "git pull --rebase",
      "pull",
      "rebase",
      "以 rebase 方式拉取",
      "拉取远程提交并把本地提交变基到其后",
      "远程操作"
    ]
  },
  {
    "id": "extra-13",
    "category": "远程操作",
    "name": "安全强推",
    "command": "git push --force-with-lease",
    "description": "只在远程没有别人新提交时才强制推送",
    "note": "仍会重写远程历史，团队协作需谨慎",
    "risk": "danger",
    "modern": false,
    "keywords": [
      "force",
      "git push --force-with-lease",
      "push",
      "只在远程没有别人新提交时才强制推送",
      "安全强推",
      "远程操作"
    ]
  },
  {
    "id": "extra-14",
    "category": "撤销回退",
    "name": "查看引用日志",
    "command": "git reflog",
    "description": "查看 HEAD 移动记录，常用于找回误删或误 reset 的提交",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git reflog",
      "history",
      "recover",
      "撤销回退",
      "查看 HEAD 移动记录，常用于找回误删或误 reset 的提交",
      "查看引用日志"
    ]
  },
  {
    "id": "extra-15",
    "category": "撤销回退",
    "name": "混合回退",
    "command": "git reset --mixed <commit>",
    "description": "回退 HEAD 和暂存区，但保留工作区文件内容",
    "note": "会重写本地提交历史",
    "risk": "watch",
    "modern": false,
    "keywords": [
      "git reset --mixed <commit>",
      "reset",
      "undo",
      "回退 HEAD 和暂存区，但保留工作区文件内容",
      "撤销回退",
      "混合回退"
    ]
  },
  {
    "id": "extra-16",
    "category": "撤销回退",
    "name": "放弃合并",
    "command": "git merge --abort",
    "description": "合并冲突时回到 merge 前状态",
    "note": "",
    "risk": "watch",
    "modern": false,
    "keywords": [
      "abort",
      "git merge --abort",
      "merge",
      "合并冲突时回到 merge 前状态",
      "撤销回退",
      "放弃合并"
    ]
  },
  {
    "id": "extra-17",
    "category": "暂存区（Stash）",
    "name": "带说明暂存",
    "command": "git stash push -m \"<message>\"",
    "description": "保存当前修改并添加易识别的说明",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git stash push -m \"<message>\"",
      "message",
      "stash",
      "保存当前修改并添加易识别的说明",
      "带说明暂存",
      "暂存区（Stash）"
    ]
  },
  {
    "id": "extra-18",
    "category": "暂存区（Stash）",
    "name": "包含未跟踪文件暂存",
    "command": "git stash push -u -m \"<message>\"",
    "description": "连同未跟踪文件一起暂存",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git stash push -u -m \"<message>\"",
      "stash",
      "untracked",
      "包含未跟踪文件暂存",
      "暂存区（Stash）",
      "连同未跟踪文件一起暂存"
    ]
  },
  {
    "id": "extra-19",
    "category": "暂存区（Stash）",
    "name": "查看暂存内容",
    "command": "git stash show -p stash@{0}",
    "description": "查看某条 stash 的具体补丁内容",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "diff",
      "git stash show -p stash@{0}",
      "stash",
      "暂存区（Stash）",
      "查看暂存内容",
      "查看某条 stash 的具体补丁内容"
    ]
  },
  {
    "id": "extra-20",
    "category": "标签",
    "name": "推送指定标签",
    "command": "git push origin <tag>",
    "description": "只推送一个指定标签到远程",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git push origin <tag>",
      "push",
      "tag",
      "只推送一个指定标签到远程",
      "推送指定标签",
      "标签"
    ]
  },
  {
    "id": "extra-21",
    "category": "标签",
    "name": "删除远程标签",
    "command": "git push origin --delete <tag>",
    "description": "删除远程仓库中的指定标签",
    "note": "会影响远程标签引用",
    "risk": "watch",
    "modern": false,
    "keywords": [
      "delete",
      "git push origin --delete <tag>",
      "tag",
      "删除远程仓库中的指定标签",
      "删除远程标签",
      "标签"
    ]
  },
  {
    "id": "extra-22",
    "category": "高级操作",
    "name": "继续变基",
    "command": "git rebase --continue",
    "description": "解决冲突后继续 rebase 流程",
    "note": "",
    "risk": "watch",
    "modern": false,
    "keywords": [
      "conflict",
      "git rebase --continue",
      "rebase",
      "继续变基",
      "解决冲突后继续 rebase 流程",
      "高级操作"
    ]
  },
  {
    "id": "extra-23",
    "category": "高级操作",
    "name": "放弃变基",
    "command": "git rebase --abort",
    "description": "取消当前 rebase 并恢复到变基前状态",
    "note": "",
    "risk": "watch",
    "modern": false,
    "keywords": [
      "abort",
      "git rebase --abort",
      "rebase",
      "取消当前 rebase 并恢复到变基前状态",
      "放弃变基",
      "高级操作"
    ]
  },
  {
    "id": "extra-24",
    "category": "高级操作",
    "name": "清理前预览",
    "command": "git clean -fdn",
    "description": "预览 git clean -fd 将删除哪些未跟踪文件",
    "note": "执行真正删除前建议先运行它",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "clean",
      "git clean -fdn",
      "preview",
      "清理前预览",
      "预览 git clean -fd 将删除哪些未跟踪文件",
      "高级操作"
    ]
  },
  {
    "id": "extra-25",
    "category": "高级操作",
    "name": "维护仓库",
    "command": "git maintenance run",
    "description": "运行 Git 维护任务，帮助清理和优化仓库数据",
    "note": "",
    "risk": "safe",
    "modern": false,
    "keywords": [
      "git maintenance run",
      "maintenance",
      "维护仓库",
      "运行 Git 维护任务，帮助清理和优化仓库数据",
      "高级操作"
    ]
  },
  {
    "id": "extra-26",
    "category": "工作流",
    "name": "新功能分支流程",
    "command": "git switch -c <branch>\ngit add .\ngit commit -m \"<message>\"\ngit push -u origin <branch>",
    "description": "从创建分支到首次推送的一组常用命令",
    "note": "",
    "risk": "safe",
    "modern": true,
    "keywords": [
      "feature",
      "git switch -c <branch>\ngit add .\ngit commit -m \"<message>\"\ngit push -u origin <branch>",
      "workflow",
      "从创建分支到首次推送的一组常用命令",
      "工作流",
      "新功能分支流程"
    ]
  },
  {
    "id": "extra-27",
    "category": "工作流",
    "name": "同步当前分支",
    "command": "git fetch --prune\ngit pull --rebase",
    "description": "更新远程引用，并以 rebase 方式同步当前分支",
    "note": "多人协作时注意冲突处理",
    "risk": "watch",
    "modern": false,
    "keywords": [
      "git fetch --prune\ngit pull --rebase",
      "sync",
      "workflow",
      "同步当前分支",
      "工作流",
      "更新远程引用，并以 rebase 方式同步当前分支"
    ]
  },
  {
    "id": "extra-28",
    "category": "工作流",
    "name": "撤销最近一次本地提交",
    "command": "git reset --soft HEAD~1",
    "description": "撤销最近一次提交，但保留变更在暂存区",
    "note": "不要用于已经推送且他人依赖的提交",
    "risk": "watch",
    "modern": false,
    "keywords": [
      "git reset --soft HEAD~1",
      "undo",
      "workflow",
      "工作流",
      "撤销最近一次提交，但保留变更在暂存区",
      "撤销最近一次本地提交"
    ]
  }
] satisfies GitCommand[]

const RISK_META: Record<
  RiskLevel,
  {
    label: string
    desc: string
  }
> = {
  safe: {
    label: "安全",
    desc: "主要是查看、创建或常规提交操作。",
  },
  watch: {
    label: "注意",
    desc: "可能改变历史、工作区或远程引用，执行前确认上下文。",
  },
  danger: {
    label: "高风险",
    desc: "可能丢失数据或重写远程历史，建议先备份或确认团队状态。",
  },
}

const PLACEHOLDER_DEFAULTS: Record<string, string> = {
  "repository-url": "https://github.com/user/repo.git",
  "branch-name": "feature/demo",
  branch: "feature/demo",
  file: "src/app/page.tsx",
  commit: "HEAD~1",
  message: "update content",
  url: "https://github.com/user/repo.git",
  tag: "v1.0.0",
  keyword: "TODO",
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value)
}

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase()
}

function extractPlaceholders(command: string) {
  const names = new Set<string>()
  const pattern = /<([^>]+)>/g
  let match: RegExpExecArray | null

  while ((match = pattern.exec(command)) !== null) {
    names.add(match[1])
  }

  return Array.from(names)
}

function fillCommand(command: string, values: PlaceholderValues) {
  return command.replace(/<([^>]+)>/g, (_, key: string) => values[key] || `<${key}>`)
}

function riskTone(risk: RiskLevel) {
  if (risk === "safe") return "text-[#52685d]"
  if (risk === "watch") return "text-[#9b7542]"
  return "text-[#965744]"
}

function riskDot(risk: RiskLevel) {
  if (risk === "safe") return "bg-[#52685d]"
  if (risk === "watch") return "bg-[#b28d48]"
  return "bg-[#965744]"
}

function downloadText(content: string, filename: string) {
  if (!content) return

  const blob = new Blob([content], {
    type: "text/plain;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 500)
}

function CommandCard({
  command,
  copied,
  favorite,
  selected,
  onCopy,
  onSelect,
  onToggleFavorite,
}: {
  command: GitCommand
  copied: boolean
  favorite: boolean
  selected: boolean
  onCopy: () => void
  onSelect: () => void
  onToggleFavorite: () => void
}) {
  return (
    <article className={`group rounded-[24px] border p-4 transition ${selected ? "border-[#22231f]/20 bg-[#22231f] text-white" : "border-black/[.075] bg-white/24 hover:bg-white/45"}`}>
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`h-1.5 w-1.5 rounded-full ${riskDot(command.risk)}`} />
            <span className={`text-[8px] font-semibold tracking-[.13em] ${selected ? "text-white/28" : "text-black/24"}`}>
              {command.category}
            </span>
            {command.modern && (
              <span className={`rounded-full px-2 py-0.5 text-[7px] font-semibold ${selected ? "bg-white/10 text-white/40" : "bg-[#52685d]/8 text-[#52685d]"}`}>
                MODERN
              </span>
            )}
          </div>

          <h3 className={`mt-3 text-[15px] font-semibold tracking-[-.03em] ${selected ? "text-white" : "text-[#22231f]"}`}>
            {command.name}
          </h3>

          <p className={`mt-2 text-[9px] leading-5 ${selected ? "text-white/36" : "text-black/34"}`}>
            {command.description}
          </p>

          <pre className={`mt-3 overflow-auto whitespace-pre-wrap break-all rounded-[16px] px-3 py-3 font-mono text-[10px] leading-5 ${selected ? "bg-white/[.055] text-[#cbd8cd]" : "bg-[#151714] text-[#cbd8cd]"}`}>
            {command.command}
          </pre>

          {command.note && (
            <p className={`mt-3 text-[8px] leading-4 ${selected ? "text-[#e1b0a2]" : "text-[#965744]"}`}>
              {command.note}
            </p>
          )}
        </button>

        <div className="flex shrink-0 flex-col gap-2">
          <button type="button" onClick={onToggleFavorite} className={`grid h-8 w-8 place-items-center rounded-full border text-[12px] transition ${favorite ? "border-[#b28d48]/25 bg-[#b28d48]/14 text-[#9b7542]" : selected ? "border-white/[.08] text-white/28 hover:bg-white/10" : "border-black/[.08] text-black/25 hover:bg-white/50 hover:text-black"}`} aria-label={favorite ? "取消收藏" : "收藏命令"}>
            {favorite ? "★" : "☆"}
          </button>

          <button type="button" onClick={onCopy} className={`rounded-full px-3 py-2 text-[8px] font-semibold transition ${selected ? "border border-white/[.08] text-white/30 hover:bg-white hover:text-[#151714]" : "border border-black/[.08] text-black/31 hover:bg-[#22231f] hover:text-white"}`}>
            {copied ? "✓" : "COPY"}
          </button>
        </div>
      </div>
    </article>
  )
}

function TogglePill({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`rounded-full border px-3.5 py-2 text-[8px] font-semibold transition ${active ? "border-[#52685d]/20 bg-[#52685d] text-white" : "border-black/[.085] text-black/34 hover:bg-white/45 hover:text-black"}`}>
      {label}
    </button>
  )
}

function StatBox({
  label,
  value,
  tone = "ink",
}: {
  label: string
  value: string
  tone?: "ink" | "green" | "gold" | "rose"
}) {
  const toneClass =
    tone === "green"
      ? "text-[#52685d]"
      : tone === "gold"
        ? "text-[#9b7542]"
        : tone === "rose"
          ? "text-[#965744]"
          : "text-black/61"

  return (
    <div className="bg-[#f3f0e8]/92 p-4">
      <div className="text-[7px] font-semibold tracking-[.12em] text-black/23">
        {label}
      </div>
      <div className={`git-num mt-3 break-all font-mono text-[13px] font-semibold ${toneClass}`}>
        {value}
      </div>
    </div>
  )
}

export default function GitCheatsheetPage() {
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState("全部")
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "all">("all")
  const [favoriteOnly, setFavoriteOnly] = useState(false)
  const [modernOnly, setModernOnly] = useState(false)
  const [copied, setCopied] = useState<CopyKey>(null)
  const [favorites, setFavorites] = useState<string[]>([])
  const [activeId, setActiveId] = useState(GIT_COMMANDS[0]?.id ?? "")
  const [placeholderValues, setPlaceholderValues] = useState<PlaceholderValues>({})

  const pageRef = useRef<HTMLDivElement>(null)
  const detailRef = useRef<HTMLDivElement>(null)

  const categories = useMemo(
    () => ["全部", ...Array.from(new Set(GIT_COMMANDS.map((command) => command.category)))],
    [],
  )

  const favoriteSet = useMemo(() => new Set(favorites), [favorites])
  const activeCommand = useMemo(
    () => GIT_COMMANDS.find((command) => command.id === activeId) ?? GIT_COMMANDS[0],
    [activeId],
  )

  const placeholders = useMemo(
    () => extractPlaceholders(activeCommand?.command ?? ""),
    [activeCommand],
  )

  const materializedCommand = useMemo(
    () => fillCommand(activeCommand?.command ?? "", placeholderValues),
    [activeCommand, placeholderValues],
  )

  const filtered = useMemo(() => {
    const query = normalizeSearch(search)

    return GIT_COMMANDS.filter((command) => {
      const matchCategory =
        activeCategory === "全部" || command.category === activeCategory
      const matchRisk =
        riskFilter === "all" || command.risk === riskFilter
      const matchFavorite =
        !favoriteOnly || favoriteSet.has(command.id)
      const matchModern =
        !modernOnly || command.modern
      const haystack = [
        command.category,
        command.name,
        command.command,
        command.description,
        command.note,
        command.risk,
        ...command.keywords,
      ]
        .join(" ")
        .toLocaleLowerCase()

      return (
        matchCategory &&
        matchRisk &&
        matchFavorite &&
        matchModern &&
        (!query || haystack.includes(query))
      )
    })
  }, [
    activeCategory,
    favoriteOnly,
    favoriteSet,
    modernOnly,
    riskFilter,
    search,
  ])

  const grouped = useMemo(() => {
    const map = new Map<string, GitCommand[]>()

    for (const command of filtered) {
      if (!map.has(command.category)) map.set(command.category, [])
      map.get(command.category)?.push(command)
    }

    return Array.from(map.entries())
  }, [filtered])

  const stats = useMemo(
    () => ({
      total: GIT_COMMANDS.length,
      shown: filtered.length,
      categories: categories.length - 1,
      dangerous: GIT_COMMANDS.filter((command) => command.risk === "danger").length,
      watch: GIT_COMMANDS.filter((command) => command.risk === "watch").length,
      modern: GIT_COMMANDS.filter((command) => command.modern).length,
    }),
    [categories.length, filtered.length],
  )

  const copiedList = useMemo(
    () =>
      filtered
        .map((command) => `${command.name}\n${command.command}\n${command.description}`)
        .join("\n\n"),
    [filtered],
  )

  const report = useMemo(
    () =>
      [
        "BitLeap Git Command Studio",
        "",
        `筛选：${activeCategory}`,
        `搜索：${search || "无"}`,
        `风险：${riskFilter === "all" ? "全部" : RISK_META[riskFilter].label}`,
        `结果：${filtered.length} / ${GIT_COMMANDS.length}`,
        "",
        "当前命令：",
        activeCommand ? `${activeCommand.name}\n${materializedCommand}\n${activeCommand.description}` : "无",
        "",
        "当前结果：",
        copiedList || "无匹配命令",
      ].join("\n"),
    [
      activeCategory,
      activeCommand,
      copiedList,
      filtered.length,
      materializedCommand,
      riskFilter,
      search,
    ],
  )

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        setFavorites(parsed.filter((item) => typeof item === "string"))
      }
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites))
    } catch {}
  }, [favorites])

  useEffect(() => {
    if (
      !pageRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    const ctx = gsap.context(() => {
      gsap.from(".git-intro", {
        y: 22,
        opacity: 0,
        duration: 0.78,
        stagger: 0.055,
        ease: "power3.out",
      })

      gsap.to(".git-orbit-a", {
        rotation: 360,
        duration: 70,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })

      gsap.to(".git-orbit-b", {
        rotation: -360,
        duration: 106,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })
    }, pageRef)

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (
      !detailRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    gsap.fromTo(
      detailRef.current,
      { opacity: 0.64, y: 5 },
      {
        opacity: 1,
        y: 0,
        duration: 0.24,
        ease: "power2.out",
        overwrite: true,
      },
    )
  }, [activeId, materializedCommand])

  useEffect(() => {
    setPlaceholderValues((current) => {
      const next = { ...current }

      for (const key of placeholders) {
        if (!next[key]) next[key] = PLACEHOLDER_DEFAULTS[key] ?? key
      }

      return next
    })
  }, [placeholders])

  const copy = async (value: string, key: CopyKey) => {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {}
  }

  const toggleFavorite = (id: string) => {
    setFavorites((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [id, ...current],
    )
  }

  const reset = () => {
    setSearch("")
    setActiveCategory("全部")
    setRiskFilter("all")
    setFavoriteOnly(false)
    setModernOnly(false)
  }

  return (
    <div ref={pageRef} className="min-h-screen overflow-hidden bg-[#efede6] text-[#22231f] selection:bg-[#22231f] selection:text-white">
      <style>{`
        .git-scroll::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }

        .git-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .git-scroll::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(34,35,31,.13);
        }

        .git-dark-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,.14);
        }

        .git-grid {
          background-image:
            linear-gradient(rgba(34,35,31,.032) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,35,31,.032) 1px, transparent 1px);
          background-size: 30px 30px;
        }

        .git-num {
          font-variant-numeric: tabular-nums lining-nums;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_9%,rgba(178,151,91,.10),transparent_27%),radial-gradient(circle_at_8%_88%,rgba(73,107,91,.08),transparent_31%)]" />
        <div className="git-orbit-a absolute right-[-20vw] top-[-24vw] h-[58vw] w-[58vw] rounded-full border border-black/[.04]">
          <span className="absolute left-[15%] top-[43%] h-2 w-2 rounded-full bg-[#b28d48]/38" />
        </div>
        <div className="git-orbit-b absolute bottom-[-26vw] left-[-19vw] h-[53vw] w-[53vw] rounded-full border border-black/[.032]">
          <span className="absolute right-[14%] top-[31%] h-1.5 w-1.5 rounded-full bg-[#52685d]/35" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1580px] px-5 pb-10 pt-6 sm:px-8">
        <div className="git-intro">
          <Breadcrumb />
        </div>

        <header className="git-intro mt-8 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/27">
              GIT COMMAND STUDIO
            </div>
            <h1 className="mt-4 max-w-[900px] text-[clamp(48px,6.35vw,90px)] font-semibold leading-[1.03] tracking-[-.055em]">
              找到命令，
              <br />
              也知道风险。
            </h1>
          </div>

          <div>
            <p className="max-w-[560px] text-[11px] leading-6 text-black/40">
              Git 命令速查、搜索、分类、风险提示、收藏、占位符填充和常用平台复制。适合日常开发、教学、排查和新成员上手。
            </p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[8px] text-black/25">
              <span>{formatNumber(stats.total)} COMMANDS</span>
              <span>{formatNumber(stats.categories)} CATEGORIES</span>
              <span>{formatNumber(stats.dangerous)} HIGH RISK</span>
              <span>LOCAL ONLY</span>
            </div>
          </div>
        </header>

        <section className="git-intro mt-7 grid gap-7 xl:grid-cols-[.68fr_1.32fr]">
          <aside className="min-w-0">
            <div className="rounded-[28px] border border-black/[.075] bg-white/24 p-5">
              <div className="text-[8px] font-semibold tracking-[.14em] text-black/24">
                SEARCH
              </div>
              <h2 className="mt-3 text-[clamp(30px,3.5vw,46px)] font-semibold leading-none tracking-[-.045em]">
                命令索引。
              </h2>

              <div className="mt-6 space-y-5">
                <label>
                  <span className="mb-2 block text-[8px] font-semibold tracking-[.12em] text-black/24">
                    KEYWORD
                  </span>
                  <input value={search} onChange={(event) => setSearch(event.target.value)} spellCheck={false} className="w-full rounded-full border border-black/[.08] bg-white/35 px-4 py-3 font-mono text-[10px] text-black/68 outline-none transition focus:border-black/25" placeholder="branch / stash / 撤销 / force..." />
                </label>

                <div>
                  <div className="mb-2 text-[8px] font-semibold tracking-[.12em] text-black/24">
                    CATEGORY
                  </div>
                  <div className="flex max-h-[166px] flex-wrap gap-1.5 overflow-auto pr-1">
                    {categories.map((category) => (
                      <button key={category} type="button" onClick={() => setActiveCategory(category)} className={`rounded-full px-3.5 py-2 text-[8px] font-semibold transition ${activeCategory === category ? "bg-[#22231f] text-white" : "text-black/32 hover:bg-white/45 hover:text-black"}`}>
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-[8px] font-semibold tracking-[.12em] text-black/24">
                    RISK
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(["all", "safe", "watch", "danger"] as const).map((risk) => (
                      <button key={risk} type="button" onClick={() => setRiskFilter(risk)} className={`rounded-full border px-3.5 py-2 text-[8px] font-semibold transition ${riskFilter === risk ? "border-[#52685d]/20 bg-[#52685d] text-white" : "border-black/[.08] text-black/31 hover:bg-white/45"}`}>
                        {risk === "all" ? "全部" : RISK_META[risk].label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <TogglePill active={favoriteOnly} label="只看收藏" onClick={() => setFavoriteOnly((value) => !value)} />
                  <TogglePill active={modernOnly} label="只看新命令" onClick={() => setModernOnly((value) => !value)} />
                  <button type="button" onClick={reset} className="rounded-full px-3.5 py-2 text-[8px] font-semibold text-[#965744] transition hover:bg-[#965744]/8">
                    重置筛选
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-[24px] border border-black/[.075] bg-white/24">
              <div className="border-b border-black/[.06] px-5 py-4">
                <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">
                  COMMAND PROFILE
                </div>
                <p className="mt-2 text-[9px] leading-5 text-black/35">
                  当前显示 {formatNumber(stats.shown)} 条命令。高风险命令会用红色标识，执行前确认是否会重写历史或删除文件。
                </p>
              </div>

              <div className="grid grid-cols-2 gap-px bg-black/[.06]">
                <StatBox label="TOTAL" value={formatNumber(stats.total)} />
                <StatBox label="SHOWN" value={formatNumber(stats.shown)} tone="green" />
                <StatBox label="WATCH" value={formatNumber(stats.watch)} tone="gold" />
                <StatBox label="DANGER" value={formatNumber(stats.dangerous)} tone="rose" />
                <StatBox label="MODERN" value={formatNumber(stats.modern)} />
                <StatBox label="FAVORITES" value={formatNumber(favorites.length)} tone="gold" />
              </div>
            </div>

            <div className="mt-4 rounded-[24px] border border-black/[.075] bg-white/24 p-5">
              <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">
                QUICK COPY
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => copy(copiedList, "all")} disabled={!copiedList} className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white transition disabled:opacity-30">
                  {copied === "all" ? "✓ 已复制结果" : "复制当前结果"}
                </button>
                <button type="button" onClick={() => downloadText(report, "bitleap-git-cheatsheet.txt")} disabled={!copiedList} className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 transition hover:bg-white/40 disabled:opacity-30">
                  导出速查表
                </button>
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="flex flex-col gap-4 border-b border-black/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-[8px] font-semibold tracking-[.14em] text-black/23">
                  RESULT
                </div>
                <h2 className="mt-2 text-[clamp(31px,4vw,48px)] font-semibold leading-none tracking-[-.045em]">
                  {filtered.length ? `${formatNumber(filtered.length)} 条可用命令。` : "没有匹配结果。"}
                </h2>
              </div>

              <div className="flex flex-wrap gap-2">
                {PRESET_SEARCHES.map((item) => (
                  <button key={item.label} type="button" onClick={() => { setSearch(item.query); setRiskFilter("all"); setActiveCategory("全部") }} className="rounded-full border border-black/[.085] px-4 py-2.5 text-[8px] font-semibold text-black/35 transition hover:bg-white/45">
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-7 2xl:grid-cols-[1fr_.72fr]">
              <div className="git-scroll max-h-[760px] overflow-auto pr-1">
                {grouped.length === 0 ? (
                  <div className="grid min-h-[360px] place-items-center rounded-[30px] border border-black/[.075] bg-white/22 px-6 text-center">
                    <div>
                      <div className="text-[8px] tracking-[.14em] text-black/20">
                        EMPTY
                      </div>
                      <p className="mt-3 text-[9px] text-black/28">
                        没有找到匹配的 Git 命令。试试 branch、stash、reset 或清空筛选。
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {grouped.map(([category, commands]) => (
                      <section key={category}>
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="text-[9px] font-semibold tracking-[.14em] text-black/27">
                            {category}
                          </h3>
                          <span className="git-num font-mono text-[8px] text-black/22">
                            {formatNumber(commands.length)} commands
                          </span>
                        </div>

                        <div className="grid gap-3 lg:grid-cols-2">
                          {commands.map((command) => (
                            <CommandCard key={command.id} command={command} copied={copied === command.id} favorite={favoriteSet.has(command.id)} selected={activeCommand?.id === command.id} onCopy={() => copy(command.command, command.id)} onSelect={() => setActiveId(command.id)} onToggleFavorite={() => toggleFavorite(command.id)} />
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </div>

              <aside ref={detailRef} className="min-w-0">
                <div className="sticky top-6 overflow-hidden rounded-[30px] border border-black/[.08] bg-[#151714]">
                  <div className="border-b border-white/[.065] px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[8px] font-semibold tracking-[.13em] text-white/27">
                        COMMAND BUILDER
                      </span>
                      <span className={`text-[8px] font-semibold ${activeCommand ? riskTone(activeCommand.risk).replace("text-", "text-") : "text-white/18"}`}>
                        {activeCommand ? RISK_META[activeCommand.risk].label : "—"}
                      </span>
                    </div>

                    <h3 className="mt-4 text-[24px] font-semibold leading-none tracking-[-.05em] text-white">
                      {activeCommand?.name ?? "选择一条命令"}
                    </h3>

                    <p className="mt-3 text-[9px] leading-5 text-white/33">
                      {activeCommand?.description}
                    </p>
                  </div>

                  <div className="border-b border-white/[.065] p-5">
                    <pre className="git-dark-scroll max-h-[240px] overflow-auto whitespace-pre-wrap break-all rounded-[20px] bg-white/[.035] p-4 font-mono text-[11px] leading-6 text-[#cbd8cd]">
                      {materializedCommand || "选择命令后会显示可复制版本。"}
                    </pre>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" onClick={() => copy(materializedCommand, "materialized")} disabled={!materializedCommand} className="rounded-full bg-white px-5 py-3 text-[9px] font-semibold text-[#151714] transition disabled:opacity-30">
                        {copied === "materialized" ? "✓ 已复制" : "复制填充命令"}
                      </button>

                      <button type="button" onClick={() => downloadText(materializedCommand, "bitleap-git-command.sh")} disabled={!materializedCommand} className="rounded-full border border-white/[.08] px-4 py-3 text-[9px] font-semibold text-white/33 transition hover:bg-white hover:text-[#151714] disabled:opacity-25">
                        导出 .sh
                      </button>
                    </div>
                  </div>

                  <div className="git-dark-scroll max-h-[390px] overflow-auto p-5">
                    {placeholders.length ? (
                      <div>
                        <div className="mb-3 text-[8px] font-semibold tracking-[.13em] text-white/24">
                          PLACEHOLDERS
                        </div>
                        <div className="space-y-3">
                          {placeholders.map((key) => (
                            <label key={key} className="block">
                              <span className="mb-1.5 block font-mono text-[8px] text-white/25">
                                &lt;{key}&gt;
                              </span>
                              <input value={placeholderValues[key] ?? ""} onChange={(event) => setPlaceholderValues((current) => ({ ...current, [key]: event.target.value }))} spellCheck={false} className="w-full rounded-full border border-white/[.07] bg-white/[.045] px-4 py-3 font-mono text-[10px] text-[#cbd8cd] outline-none transition focus:border-white/20" />
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[9px] leading-5 text-white/24">
                        这条命令没有占位符，可以直接复制使用。
                      </p>
                    )}

                    {activeCommand?.note && (
                      <div className="mt-5 rounded-[18px] border border-[#d49a88]/14 bg-[#d49a88]/8 p-4">
                        <div className="text-[8px] font-semibold tracking-[.12em] text-[#d49a88]/72">
                          RISK NOTE
                        </div>
                        <p className="mt-2 text-[8px] leading-5 text-[#d49a88]/72">
                          {activeCommand.note}
                        </p>
                      </div>
                    )}

                    {activeCommand && (
                      <div className="mt-5 rounded-[18px] border border-white/[.07] bg-white/[.035] p-4">
                        <div className="text-[8px] font-semibold tracking-[.12em] text-white/24">
                          RISK LEVEL
                        </div>
                        <p className="mt-2 text-[8px] leading-5 text-white/31">
                          {RISK_META[activeCommand.risk].desc}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="git-intro mt-12 grid gap-9 border-t border-black/10 pt-8 lg:grid-cols-[.55fr_1.45fr]">
          <div>
            <div className="text-[9px] font-semibold tracking-[.14em] text-black/25">
              REPORT
            </div>
            <h2 className="mt-3 text-[clamp(30px,4vw,46px)] font-semibold leading-[1.06] tracking-[-.045em]">
              搜索结果，
              <br />
              可以直接带走。
            </h2>
            <p className="mt-5 max-w-[380px] text-[9px] leading-5 text-black/34">
              导出的报告会包含当前筛选条件、当前命令和所有命中命令，适合发给同事或贴进项目 README。
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" onClick={() => copy(report, "report")} disabled={!copiedList} className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white transition disabled:opacity-30">
                {copied === "report" ? "✓ 已复制报告" : "复制报告"}
              </button>
              <button type="button" onClick={() => downloadText(report, "bitleap-git-report.txt")} disabled={!copiedList} className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 transition hover:bg-white/40 disabled:opacity-30">
                导出报告
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-[25px] border border-black/[.08] bg-[#171916]">
            <div className="flex items-center justify-between border-b border-white/[.07] px-5 py-3">
              <span className="text-[8px] tracking-[.13em] text-white/25">
                CHEATSHEET PROFILE
              </span>
              <span className="text-[8px] text-white/17">
                LOCAL INDEX
              </span>
            </div>

            <pre className="git-dark-scroll max-h-[390px] overflow-auto whitespace-pre-wrap break-words p-5 font-mono text-[11px] leading-7 text-[#c7d3c7] sm:p-6">
              {report}
            </pre>
          </div>
        </section>

        <section className="git-intro mt-12 grid gap-8 border-t border-black/10 pt-7 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              SEARCH WITHOUT SIDE EFFECT
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              搜索只做纯计算，不在 useMemo 中 setState，避免渲染期副作用和难以追踪的 UI 抖动。
            </p>
          </div>

          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              PLACEHOLDER FILL
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              选中命令后会自动识别 &lt;file&gt;、&lt;branch&gt;、&lt;commit&gt; 等占位符，填完即可复制可执行版本。
            </p>
          </div>

          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">
              RISK FIRST
            </div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">
              reset、clean、force push、rebase 等命令会被标记为注意或高风险，方便新手在复制前多看一眼。
            </p>
          </div>
        </section>

        <div className="mt-12 border-t border-black/[.08] pt-5">
          <FooterNote />
        </div>
      </div>
    </div>
  )
}

const PRESET_SEARCHES = [
  { label: "撤销", query: "撤销" },
  { label: "分支", query: "branch" },
  { label: "stash", query: "stash" },
  { label: "远程", query: "origin" },
  { label: "高风险", query: "force" },
]
