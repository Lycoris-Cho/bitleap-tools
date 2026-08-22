'use client'

import { useState, useMemo } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

// ========== 类型 ==========
type Param = {
  key: string
  label: string
  placeholder: string
  required?: boolean
  defaultValue?: string
}

type CommandTemplate = {
  category: string
  name: string
  description: string
  params: Param[]
  build: (values: Record<string, string>) => string
  note?: string
}

// ========== 命令数据 ==========
const COMMANDS: CommandTemplate[] = [
  // ===== 文件操作 =====
  {
    category: '文件操作',
    name: '查找文件',
    description: '按名称在指定目录查找文件',
    params: [
      { key: 'name', label: '文件名', placeholder: '*.log', required: true },
      { key: 'path', label: '搜索目录', placeholder: '/', defaultValue: '.' },
    ],
    build: v => `find ${v.path || '.'} -name "${v.name}"`,
  },
  {
    category: '文件操作',
    name: '查找内容（grep）',
    description: '在文件中递归搜索文本内容',
    params: [
      { key: 'pattern', label: '搜索内容', placeholder: 'ERROR', required: true },
      { key: 'path', label: '搜索目录', placeholder: '.', defaultValue: '.' },
      { key: 'ext', label: '文件后缀过滤', placeholder: '*.js', defaultValue: '' },
    ],
    build: v => {
      const ext = v.ext ? `--include="${v.ext}" ` : ''
      return `grep -rn "${v.pattern}" ${ext}${v.path || '.'}`
    },
  },
  {
    category: '文件操作',
    name: '压缩文件（tar）',
    description: '将目录或文件打包为 .tar.gz',
    params: [
      { key: 'output', label: '输出文件名', placeholder: 'archive.tar.gz', required: true },
      { key: 'source', label: '源文件/目录', placeholder: './dist', required: true },
    ],
    build: v => `tar -czf ${v.output} ${v.source}`,
  },
  {
    category: '文件操作',
    name: '解压 tar.gz',
    description: '解压 .tar.gz 文件',
    params: [
      { key: 'file', label: '文件名', placeholder: 'archive.tar.gz', required: true },
      { key: 'dest', label: '解压到目录', placeholder: './output', defaultValue: '' },
    ],
    build: v => v.dest ? `tar -xzf ${v.file} -C ${v.dest}` : `tar -xzf ${v.file}`,
  },
  {
    category: '文件操作',
    name: '解压 zip',
    description: '解压 .zip 文件',
    params: [
      { key: 'file', label: '文件名', placeholder: 'archive.zip', required: true },
      { key: 'dest', label: '解压到目录', placeholder: './output', defaultValue: '' },
    ],
    build: v => v.dest ? `unzip ${v.file} -d ${v.dest}` : `unzip ${v.file}`,
  },
  {
    category: '文件操作',
    name: '查看文件尾部（实时）',
    description: '实时追踪日志文件新增内容',
    params: [
      { key: 'file', label: '文件路径', placeholder: '/var/log/nginx/access.log', required: true },
    ],
    build: v => `tail -f ${v.file}`,
  },
  {
    category: '文件操作',
    name: '查看文件前 N 行',
    description: '查看文件开头指定行数',
    params: [
      { key: 'file', label: '文件路径', placeholder: '/etc/hosts', required: true },
      { key: 'lines', label: '行数', placeholder: '20', defaultValue: '20' },
    ],
    build: v => `head -n ${v.lines || '20'} ${v.file}`,
  },
  {
    category: '文件操作',
    name: '修改文件权限',
    description: '递归修改文件/目录权限',
    params: [
      { key: 'mode', label: '权限（数字）', placeholder: '755', required: true },
      { key: 'target', label: '目标路径', placeholder: './public', required: true },
      { key: 'recursive', label: '递归', placeholder: '', defaultValue: 'true' },
    ],
    build: v => v.recursive === 'true' ? `chmod -R ${v.mode} ${v.target}` : `chmod ${v.mode} ${v.target}`,
  },
  {
    category: '文件操作',
    name: '修改文件所有者',
    description: '递归修改文件/目录所有者',
    params: [
      { key: 'owner', label: '用户:组', placeholder: 'www-data:www-data', required: true },
      { key: 'target', label: '目标路径', placeholder: '/var/www/html', required: true },
    ],
    build: v => `chown -R ${v.owner} ${v.target}`,
  },
  {
    category: '文件操作',
    name: '磁盘空间查看',
    description: '以人类可读格式显示磁盘使用情况',
    params: [],
    build: () => 'df -h',
  },
  {
    category: '文件操作',
    name: '目录大小查看',
    description: '查看目录占用空间大小',
    params: [
      { key: 'path', label: '目录路径', placeholder: '.', defaultValue: '.' },
    ],
    build: v => `du -sh ${v.path || '.'}`,
  },

  // ===== 网络排查 =====
  {
    category: '网络排查',
    name: '端口占用查询',
    description: '查看指定端口被哪个进程占用',
    params: [
      { key: 'port', label: '端口号', placeholder: '3000', required: true },
    ],
    build: v => `lsof -i :${v.port}`,
    note: 'macOS 也可用 netstat -an | grep :3000',
  },
  {
    category: '网络排查',
    name: '测试网络连通性',
    description: '向目标主机发送 ICMP 包测试连通性',
    params: [
      { key: 'host', label: '主机地址', placeholder: 'google.com', required: true },
      { key: 'count', label: '发送次数', placeholder: '4', defaultValue: '4' },
    ],
    build: v => `ping -c ${v.count || '4'} ${v.host}`,
  },
  {
    category: '网络排查',
    name: '路由追踪',
    description: '追踪到目标主机的网络路由路径',
    params: [
      { key: 'host', label: '目标主机', placeholder: '8.8.8.8', required: true },
    ],
    build: v => `traceroute ${v.host}`,
  },
  {
    category: '网络排查',
    name: '下载文件（curl）',
    description: '从 URL 下载文件到本地',
    params: [
      { key: 'url', label: '文件 URL', placeholder: 'https://example.com/file.zip', required: true },
      { key: 'output', label: '保存为', placeholder: 'file.zip', defaultValue: '' },
    ],
    build: v => v.output ? `curl -L -o ${v.output} "${v.url}"` : `curl -O "${v.url}"`,
  },
  {
    category: '网络排查',
    name: '下载文件（wget）',
    description: '用 wget 从 URL 下载文件',
    params: [
      { key: 'url', label: '文件 URL', placeholder: 'https://example.com/file.zip', required: true },
    ],
    build: v => `wget "${v.url}"`,
  },
  {
    category: '网络排查',
    name: '查看监听端口',
    description: '列出所有正在监听的 TCP/UDP 端口',
    params: [],
    build: () => 'netstat -tulnp',
    note: 'macOS 用: netstat -an | grep LISTEN',
  },

  // ===== 进程管理 =====
  {
    category: '进程管理',
    name: '查找进程',
    description: '按名称查找运行中的进程',
    params: [
      { key: 'name', label: '进程名', placeholder: 'node', required: true },
    ],
    build: v => `ps aux | grep ${v.name}`,
  },
  {
    category: '进程管理',
    name: '结束进程',
    description: '通过 PID 终止进程',
    params: [
      { key: 'pid', label: '进程 PID', placeholder: '12345', required: true },
      { key: 'force', label: '强制终止', placeholder: '', defaultValue: 'false' },
    ],
    build: v => v.force === 'true' ? `kill -9 ${v.pid}` : `kill ${v.pid}`,
  },
  {
    category: '进程管理',
    name: '实时进程监控',
    description: '动态查看系统进程资源占用',
    params: [
      { key: 'sort', label: '排序方式', placeholder: '%CPU', defaultValue: '%CPU' },
    ],
    build: v => `top -o ${v.sort || '%CPU'}`,
    note: 'macOS 用: top -o cpu',
  },
  {
    category: '进程管理',
    name: '查看系统资源概览',
    description: '显示 CPU、内存、交换分区使用情况',
    params: [],
    build: () => 'htop',
    note: '如未安装: brew install htop / apt install htop',
  },

  // ===== 系统信息 =====
  {
    category: '系统信息',
    name: '查看系统信息',
    description: '显示操作系统信息',
    params: [],
    build: () => 'uname -a',
  },
  {
    category: '系统信息',
    name: '查看内存使用',
    description: '以人类可读格式显示内存使用情况',
    params: [],
    build: () => 'free -h',
  },
  {
    category: '系统信息',
    name: '查看 CPU 信息',
    description: '显示 CPU 核心数和型号',
    params: [],
    build: () => 'lscpu',
  },
  {
    category: '系统信息',
    name: '查看当前用户',
    description: '显示当前登录用户名',
    params: [],
    build: () => 'whoami',
  },
  {
    category: '系统信息',
    name: '查看环境变量',
    description: '显示所有环境变量',
    params: [],
    build: () => 'env',
  },
  {
    category: '系统信息',
    name: '查看开机时间',
    description: '显示系统启动时间和运行时长',
    params: [],
    build: () => 'uptime',
  },

  // ===== 用户 & 权限 =====
  {
    category: '用户 & 权限',
    name: '添加用户',
    description: '创建新系统用户',
    params: [
      { key: 'username', label: '用户名', placeholder: 'deploy', required: true },
    ],
    build: v => `sudo useradd -m ${v.username}`,
  },
  {
    category: '用户 & 权限',
    name: '修改密码',
    description: '修改指定用户的密码',
    params: [
      { key: 'username', label: '用户名', placeholder: 'deploy', required: true },
    ],
    build: v => `sudo passwd ${v.username}`,
  },
  {
    category: '用户 & 权限',
    name: '切换用户',
    description: '切换到指定用户',
    params: [
      { key: 'username', label: '用户名', placeholder: 'root', required: true },
    ],
    build: v => `su ${v.username}`,
  },
  {
    category: '用户 & 权限',
    name: '以 sudo 执行命令',
    description: '用管理员权限执行单条命令',
    params: [
      { key: 'cmd', label: '要执行的命令', placeholder: 'systemctl restart nginx', required: true },
    ],
    build: v => `sudo ${v.cmd}`,
  },

  // ===== 服务管理 =====
  {
    category: '服务管理',
    name: '启动服务',
    description: '启动 systemd 服务',
    params: [
      { key: 'service', label: '服务名', placeholder: 'nginx', required: true },
    ],
    build: v => `sudo systemctl start ${v.service}`,
  },
  {
    category: '服务管理',
    name: '停止服务',
    description: '停止 systemd 服务',
    params: [
      { key: 'service', label: '服务名', placeholder: 'nginx', required: true },
    ],
    build: v => `sudo systemctl stop ${v.service}`,
  },
  {
    category: '服务管理',
    name: '重启服务',
    description: '重启 systemd 服务',
    params: [
      { key: 'service', label: '服务名', placeholder: 'nginx', required: true },
    ],
    build: v => `sudo systemctl restart ${v.service}`,
  },
  {
    category: '服务管理',
    name: '查看服务状态',
    description: '查看 systemd 服务运行状态',
    params: [
      { key: 'service', label: '服务名', placeholder: 'nginx', required: true },
    ],
    build: v => `sudo systemctl status ${v.service}`,
  },
  {
    category: '服务管理',
    name: '开机自启',
    description: '设置服务开机自动启动',
    params: [
      { key: 'service', label: '服务名', placeholder: 'nginx', required: true },
    ],
    build: v => `sudo systemctl enable ${v.service}`,
  },

  // ===== Docker =====
  {
    category: 'Docker',
    name: '查看运行容器',
    description: '列出当前正在运行的容器',
    params: [],
    build: () => 'docker ps',
  },
  {
    category: 'Docker',
    name: '查看所有容器',
    description: '列出所有容器（含已停止）',
    params: [],
    build: () => 'docker ps -a',
  },
  {
    category: 'Docker',
    name: '查看镜像列表',
    description: '列出本地所有 Docker 镜像',
    params: [],
    build: () => 'docker images',
  },
  {
    category: 'Docker',
    name: '启动容器',
    description: '启动已停止的容器',
    params: [
      { key: 'container', label: '容器名/ID', placeholder: 'my-app', required: true },
    ],
    build: v => `docker start ${v.container}`,
  },
  {
    category: 'Docker',
    name: '停止容器',
    description: '停止运行中的容器',
    params: [
      { key: 'container', label: '容器名/ID', placeholder: 'my-app', required: true },
    ],
    build: v => `docker stop ${v.container}`,
  },
  {
    category: 'Docker',
    name: '进入容器终端',
    description: '在运行中的容器内打开 shell',
    params: [
      { key: 'container', label: '容器名/ID', placeholder: 'my-app', required: true },
      { key: 'shell', label: 'Shell 类型', placeholder: '/bin/bash', defaultValue: '/bin/bash' },
    ],
    build: v => `docker exec -it ${v.container} ${v.shell || '/bin/bash'}`,
  },
  {
    category: 'Docker',
    name: '查看容器日志',
    description: '实时查看容器输出日志',
    params: [
      { key: 'container', label: '容器名/ID', placeholder: 'my-app', required: true },
      { key: 'tail', label: '显示最近行数', placeholder: '100', defaultValue: '' },
    ],
    build: v => v.tail ? `docker logs -f --tail ${v.tail} ${v.container}` : `docker logs -f ${v.container}`,
  },
  {
    category: 'Docker',
    name: '删除容器',
    description: '强制删除容器',
    params: [
      { key: 'container', label: '容器名/ID', placeholder: 'my-app', required: true },
    ],
    build: v => `docker rm -f ${v.container}`,
  },
  {
    category: 'Docker',
    name: '删除镜像',
    description: '删除本地 Docker 镜像',
    params: [
      { key: 'image', label: '镜像名:标签', placeholder: 'nginx:latest', required: true },
    ],
    build: v => `docker rmi ${v.image}`,
  },
  {
    category: 'Docker',
    name: '构建镜像',
    description: '从 Dockerfile 构建镜像',
    params: [
      { key: 'tag', label: '镜像标签', placeholder: 'my-app:1.0', required: true },
      { key: 'path', label: 'Dockerfile 路径', placeholder: '.', defaultValue: '.' },
    ],
    build: v => `docker build -t ${v.tag} ${v.path || '.'}`,
  },
]

const CATEGORIES = ['全部', ...Array.from(new Set(COMMANDS.map(c => c.category)))]

// ========== 主页面 ==========
export default function TerminalPage() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('全部')
  const [copied, setCopied] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [paramValues, setParamValues] = useState<Record<string, Record<string, string>>>({})

  // ========== 过滤 ==========
  const filtered = useMemo(() => {
    try {
      return COMMANDS.filter(cmd => {
        const matchCategory = activeCategory === '全部' || cmd.category === activeCategory
        const matchSearch = !search.trim() ||
          cmd.name.toLowerCase().includes(search.toLowerCase()) ||
          cmd.description.toLowerCase().includes(search.toLowerCase()) ||
          cmd.build({}).toLowerCase().includes(search.toLowerCase())
        return matchCategory && matchSearch
      })
    } catch {
      setError('搜索出错，请重试')
      return []
    }
  }, [search, activeCategory])

  const grouped = useMemo(() => {
    const map = new Map<string, CommandTemplate[]>()
    for (const cmd of filtered) {
      if (!map.has(cmd.category)) map.set(cmd.category, [])
      map.get(cmd.category)!.push(cmd)
    }
    return Array.from(map.entries())
  }, [filtered])

  // ========== 参数操作 ==========
  const getValues = (cmd: CommandTemplate): Record<string, string> => {
    const defaults: Record<string, string> = {}
    for (const p of cmd.params) {
      defaults[p.key] = p.defaultValue || ''
    }
    return { ...defaults, ...(paramValues[cmd.name] || {}) }
  }

  const updateParam = (cmdName: string, key: string, value: string) => {
    setParamValues(prev => ({
      ...prev,
      [cmdName]: { ...(prev[cmdName] || {}), [key]: value },
    }))
  }

  // ========== 生成命令 ==========
  const getCommand = (cmd: CommandTemplate) => {
    try {
      return cmd.build(getValues(cmd))
    } catch {
      return cmd.build({})
    }
  }

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
        <h1 className="text-3xl font-bold tracking-tight mb-2 text-gray-900">终端命令生成器</h1>
        <p className="text-gray-500 text-sm">可视化选择操作，自动生成 Linux / macOS 终端命令，一键复制</p>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-mono">
          ❌ {error}
        </div>
      )}

      {/* 搜索 + 筛选 */}
      <div className="space-y-4 mb-8">
        <div className="flex gap-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索命令或描述，如：端口、压缩、docker..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 text-gray-900 bg-white placeholder-gray-400"
          />
          <button
            onClick={() => { setSearch(''); setActiveCategory('全部') }}
            className="px-4 py-2.5 text-sm border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors shrink-0"
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
            <p className="text-gray-400 text-sm">没有找到匹配的终端命令</p>
            <p className="text-gray-300 text-xs mt-2">试试搜索 "docker"、"端口" 或清空筛选条件</p>
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
                  const values = getValues(cmd)
                  const generated = getCommand(cmd)

                  return (
                    <div key={copyKey} className="p-4 bg-white border border-gray-200 rounded-xl hover:border-violet-200 transition-all">
                      {/* 标题行 */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-gray-900">{cmd.name}</span>
                        {cmd.note && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-orange-50 text-orange-600 border border-orange-200 rounded">
                            {cmd.note}
                          </span>
                        )}
                      </div>

                      {/* 描述 */}
                      <p className="text-xs text-gray-500 mb-3">{cmd.description}</p>

                      {/* 参数输入 */}
                      {cmd.params.length > 0 && (
                        <div className="flex flex-wrap gap-3 mb-3">
                          {cmd.params.map(p => (
                            <div key={p.key} className="flex flex-col gap-1">
                              <label className="text-[10px] font-medium text-gray-500">
                                {p.label}
                                {p.required && <span className="text-red-400 ml-0.5">*</span>}
                              </label>
                              <input
                                value={values[p.key] || ''}
                                onChange={e => updateParam(cmd.name, p.key, e.target.value)}
                                placeholder={p.placeholder}
                                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg font-mono text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-violet-300 w-44"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 生成的命令 + 复制 */}
                      <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                        <code className="font-mono text-sm text-emerald-300 break-all flex-1">{generated}</code>
                        <button
                          onClick={() => copy(generated, copyKey)}
                          className="shrink-0 ml-4 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 active:scale-95 transition-all"
                        >
                          {copied === copyKey ? '✓ 已复制' : '📋 复制'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 说明卡片 */}
      <div className="mt-10 p-4 bg-gray-50 border border-gray-200 rounded-xl">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">💡 使用说明</h3>
        <ul className="text-xs text-gray-500 space-y-1.5 leading-relaxed">
          <li>• 填写参数后命令实时生成，无需点击按钮</li>
          <li>• 红色 <span className="text-red-400">*</span> 标记表示必填参数</li>
          <li>• 橙色标签标注了需要特别注意的说明或替代方案</li>
          <li>• 所有命令适用于 Linux / macOS 终端环境</li>
          <li>• 尖括号 <code className="font-mono text-gray-400">{"<xxx>"}</code> 为占位符，实际使用时替换为真实值</li>
        </ul>
      </div>

      <FooterNote />
    </div>
  )
}