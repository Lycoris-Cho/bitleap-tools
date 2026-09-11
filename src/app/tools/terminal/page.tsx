"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"

type RiskLevel = "safe" | "watch" | "danger"
type Platform = "linux" | "macos" | "docker"
type CopyKey = "command" | "queue" | "report" | "visible" | string | null
type PlatformFilter = "all" | Platform

type ParamChoice = {
  label: string
  value: string
}

type Param = {
  key: string
  label: string
  placeholder: string
  required?: boolean
  defaultValue?: string
  type?: "text" | "number" | "select"
  choices?: ParamChoice[]
  raw?: boolean
}

type TerminalCommand = {
  id: string
  category: string
  name: string
  description: string
  template: string
  params: Param[]
  note: string
  risk: RiskLevel
  platforms: Platform[]
  tags: string[]
}

type QueueItem = {
  id: string
  name: string
  command: string
  risk: RiskLevel
}

const STORAGE_KEY = "bitleap-terminal-command-favorites"

const COMMANDS: TerminalCommand[] = [
  {
    "id": "file-find",
    "category": "文件操作",
    "name": "查找文件",
    "description": "按文件名在指定目录递归查找文件",
    "template": "find {path} -name {name}",
    "params": [
      {
        "key": "name",
        "label": "文件名",
        "placeholder": "*.log",
        "required": true,
        "defaultValue": "*.log"
      },
      {
        "key": "path",
        "label": "搜索目录",
        "placeholder": ".",
        "defaultValue": "."
      }
    ],
    "note": "",
    "risk": "safe",
    "platforms": [
      "linux",
      "macos"
    ],
    "tags": [
      "find",
      "file",
      "文件",
      "查找"
    ]
  },
  {
    "id": "file-grep",
    "category": "文件操作",
    "name": "查找内容（grep）",
    "description": "在文件中递归搜索文本内容并显示行号",
    "template": "grep -rn [--include={ext} ]{pattern} {path}",
    "params": [
      {
        "key": "pattern",
        "label": "搜索内容",
        "placeholder": "ERROR",
        "required": true,
        "defaultValue": "ERROR"
      },
      {
        "key": "path",
        "label": "搜索目录",
        "placeholder": ".",
        "defaultValue": "."
      },
      {
        "key": "ext",
        "label": "后缀过滤",
        "placeholder": "*.js",
        "defaultValue": ""
      }
    ],
    "note": "",
    "risk": "safe",
    "platforms": [
      "linux",
      "macos"
    ],
    "tags": [
      "grep",
      "search",
      "日志",
      "内容"
    ]
  },
  {
    "id": "file-ripgrep",
    "category": "文件操作",
    "name": "更快搜索（ripgrep）",
    "description": "使用 rg 快速搜索代码或文本内容",
    "template": "rg -n [--glob {glob} ]{pattern} {path}",
    "params": [
      {
        "key": "pattern",
        "label": "搜索内容",
        "placeholder": "TODO",
        "required": true,
        "defaultValue": "TODO"
      },
      {
        "key": "path",
        "label": "搜索目录",
        "placeholder": ".",
        "defaultValue": "."
      },
      {
        "key": "glob",
        "label": "Glob 过滤",
        "placeholder": "*.tsx",
        "defaultValue": ""
      }
    ],
    "note": "需要安装 ripgrep",
    "risk": "safe",
    "platforms": [
      "linux",
      "macos"
    ],
    "tags": [
      "rg",
      "ripgrep",
      "搜索"
    ]
  },
  {
    "id": "file-tar-create",
    "category": "文件操作",
    "name": "压缩文件（tar.gz）",
    "description": "将目录或文件打包为 .tar.gz",
    "template": "tar -czf {output} {source}",
    "params": [
      {
        "key": "output",
        "label": "输出文件名",
        "placeholder": "archive.tar.gz",
        "required": true,
        "defaultValue": "archive.tar.gz"
      },
      {
        "key": "source",
        "label": "源文件/目录",
        "placeholder": "./dist",
        "required": true,
        "defaultValue": "./dist"
      }
    ],
    "note": "",
    "risk": "safe",
    "platforms": [
      "linux",
      "macos"
    ],
    "tags": [
      "tar",
      "压缩",
      "archive"
    ]
  },
  {
    "id": "file-tar-extract",
    "category": "文件操作",
    "name": "解压 tar.gz",
    "description": "解压 .tar.gz 文件，可选目标目录",
    "template": "tar -xzf {file} [-C {dest}]",
    "params": [
      {
        "key": "file",
        "label": "文件名",
        "placeholder": "archive.tar.gz",
        "required": true,
        "defaultValue": "archive.tar.gz"
      },
      {
        "key": "dest",
        "label": "解压到目录",
        "placeholder": "./output",
        "defaultValue": ""
      }
    ],
    "note": "",
    "risk": "safe",
    "platforms": [
      "linux",
      "macos"
    ],
    "tags": [
      "tar",
      "解压",
      "extract"
    ]
  },
  {
    "id": "file-unzip",
    "category": "文件操作",
    "name": "解压 zip",
    "description": "解压 .zip 文件，可选目标目录",
    "template": "unzip {file} [-d {dest}]",
    "params": [
      {
        "key": "file",
        "label": "文件名",
        "placeholder": "archive.zip",
        "required": true,
        "defaultValue": "archive.zip"
      },
      {
        "key": "dest",
        "label": "解压到目录",
        "placeholder": "./output",
        "defaultValue": ""
      }
    ],
    "note": "",
    "risk": "safe",
    "platforms": [
      "linux",
      "macos"
    ],
    "tags": [
      "zip",
      "unzip",
      "解压"
    ]
  },
  {
    "id": "file-tail",
    "category": "文件操作",
    "name": "实时查看日志",
    "description": "追踪文件尾部新增内容",
    "template": "tail -f {file}",
    "params": [
      {
        "key": "file",
        "label": "文件路径",
        "placeholder": "/var/log/nginx/access.log",
        "required": true,
        "defaultValue": "/var/log/nginx/access.log"
      }
    ],
    "note": "",
    "risk": "safe",
    "platforms": [
      "linux",
      "macos"
    ],
    "tags": [
      "tail",
      "log",
      "日志"
    ]
  },
  {
    "id": "file-head",
    "category": "文件操作",
    "name": "查看文件前 N 行",
    "description": "查看文件开头指定行数",
    "template": "head -n {lines} {file}",
    "params": [
      {
        "key": "file",
        "label": "文件路径",
        "placeholder": "/etc/hosts",
        "required": true,
        "defaultValue": "/etc/hosts"
      },
      {
        "key": "lines",
        "label": "行数",
        "placeholder": "20",
        "defaultValue": "20"
      }
    ],
    "note": "",
    "risk": "safe",
    "platforms": [
      "linux",
      "macos"
    ],
    "tags": [
      "head",
      "file"
    ]
  },
  {
    "id": "file-chmod",
    "category": "文件操作",
    "name": "修改文件权限",
    "description": "修改文件或目录权限，可选择递归",
    "template": "chmod {recursive} {mode} {target}",
    "params": [
      {
        "key": "recursive",
        "label": "递归参数",
        "placeholder": "-R",
        "defaultValue": "-R",
        "type": "select",
        "choices": [
          {
            "label": "递归 -R",
            "value": "-R"
          },
          {
            "label": "不递归",
            "value": ""
          }
        ]
      },
      {
        "key": "mode",
        "label": "权限",
        "placeholder": "755",
        "required": true,
        "defaultValue": "755"
      },
      {
        "key": "target",
        "label": "目标路径",
        "placeholder": "./public",
        "required": true,
        "defaultValue": "./public"
      }
    ],
    "note": "权限设置错误可能导致服务不可用",
    "risk": "watch",
    "platforms": [
      "linux",
      "macos"
    ],
    "tags": [
      "chmod",
      "permission",
      "权限"
    ]
  },
  {
    "id": "file-chown",
    "category": "文件操作",
    "name": "修改文件所有者",
    "description": "递归修改文件或目录所有者",
    "template": "chown -R {owner} {target}",
    "params": [
      {
        "key": "owner",
        "label": "用户:组",
        "placeholder": "www-data:www-data",
        "required": true,
        "defaultValue": "www-data:www-data"
      },
      {
        "key": "target",
        "label": "目标路径",
        "placeholder": "/var/www/html",
        "required": true,
        "defaultValue": "/var/www/html"
      }
    ],
    "note": "需要管理员权限时请开启 sudo 前缀",
    "risk": "watch",
    "platforms": [
      "linux",
      "macos"
    ],
    "tags": [
      "chown",
      "owner",
      "权限"
    ]
  },
  {
    "id": "file-df",
    "category": "文件操作",
    "name": "磁盘空间查看",
    "description": "以人类可读格式显示磁盘使用情况",
    "template": "df -h",
    "params": [],
    "note": "",
    "risk": "safe",
    "platforms": [
      "linux",
      "macos"
    ],
    "tags": [
      "df",
      "disk",
      "磁盘"
    ]
  },
  {
    "id": "file-du",
    "category": "文件操作",
    "name": "目录大小查看",
    "description": "查看目录占用空间大小",
    "template": "du -sh {path}",
    "params": [
      {
        "key": "path",
        "label": "目录路径",
        "placeholder": ".",
        "defaultValue": "."
      }
    ],
    "note": "",
    "risk": "safe",
    "platforms": [
      "linux",
      "macos"
    ],
    "tags": [
      "du",
      "size",
      "目录"
    ]
  },
  {
    "id": "file-rsync",
    "category": "文件操作",
    "name": "同步目录（rsync）",
    "description": "同步两个目录并显示进度",
    "template": "rsync -avh --progress {source} {dest}",
    "params": [
      {
        "key": "source",
        "label": "源路径",
        "placeholder": "./dist/",
        "required": true,
        "defaultValue": "./dist/"
      },
      {
        "key": "dest",
        "label": "目标路径",
        "placeholder": "user@host:/var/www/",
        "required": true,
        "defaultValue": "user@host:/var/www/"
      }
    ],
    "note": "覆盖目标前请确认 source 与 dest",
    "risk": "watch",
    "platforms": [
      "linux",
      "macos"
    ],
    "tags": [
      "rsync",
      "sync",
      "同步"
    ]
  },
  {
    "id": "file-clean-empty",
    "category": "文件操作",
    "name": "删除空目录",
    "description": "递归删除指定目录下的空目录",
    "template": "find {path} -type d -empty -delete",
    "params": [
      {
        "key": "path",
        "label": "目录路径",
        "placeholder": ".",
        "required": true,
        "defaultValue": "."
      }
    ],
    "note": "会直接删除空目录",
    "risk": "watch",
    "platforms": [
      "linux",
      "macos"
    ],
    "tags": [
      "find",
      "delete",
      "目录"
    ]
  },
  {
    "id": "net-port-lsof",
    "category": "网络排查",
    "name": "端口占用查询",
    "description": "查看指定端口被哪个进程占用",
    "template": "lsof -i :{port}",
    "params": [
      {
        "key": "port",
        "label": "端口号",
        "placeholder": "3000",
        "required": true,
        "defaultValue": "3000",
        "raw": true
      }
    ],
    "note": "macOS 也可用 netstat -an | grep :3000",
    "risk": "safe",
    "platforms": [
      "linux",
      "macos"
    ],
    "tags": [
      "port",
      "lsof",
      "端口"
    ]
  },
  {
    "id": "net-port-ss",
    "category": "网络排查",
    "name": "查看监听端口（ss）",
    "description": "列出所有监听中的 TCP/UDP 端口",
    "template": "ss -tulpen",
    "params": [],
    "note": "Linux 推荐；macOS 可用 netstat",
    "risk": "safe",
    "platforms": [
      "linux"
    ],
    "tags": [
      "ss",
      "port",
      "端口"
    ]
  },
  {
    "id": "net-ping",
    "category": "网络排查",
    "name": "测试网络连通性",
    "description": "向目标主机发送 ICMP 包测试连通性",
    "template": "ping -c {count} {host}",
    "params": [
      {
        "key": "host",
        "label": "主机地址",
        "placeholder": "example.com",
        "required": true,
        "defaultValue": "example.com"
      },
      {
        "key": "count",
        "label": "发送次数",
        "placeholder": "4",
        "defaultValue": "4",
        "raw": true
      }
    ],
    "note": "",
    "risk": "safe",
    "platforms": [
      "linux",
      "macos"
    ],
    "tags": [
      "ping",
      "network",
      "连通"
    ]
  },
  {
    "id": "net-traceroute",
    "category": "网络排查",
    "name": "路由追踪",
    "description": "追踪到目标主机的网络路由路径",
    "template": "traceroute {host}",
    "params": [
      {
        "key": "host",
        "label": "目标主机",
        "placeholder": "8.8.8.8",
        "required": true,
        "defaultValue": "8.8.8.8"
      }
    ],
    "note": "Windows 通常使用 tracert",
    "risk": "safe",
    "platforms": [
      "linux",
      "macos"
    ],
    "tags": [
      "traceroute",
      "route"
    ]
  },
  {
    "id": "net-curl-download",
    "category": "网络排查",
    "name": "下载文件（curl）",
    "description": "从 URL 下载文件到本地",
    "template": "curl -L [-o {output} ]{url}",
    "params": [
      {
        "key": "url",
        "label": "文件 URL",
        "placeholder": "https://example.com/file.zip",
        "required": true,
        "defaultValue": "https://example.com/file.zip"
      },
      {
        "key": "output",
        "label": "保存为",
        "placeholder": "file.zip",
        "defaultValue": ""
      }
    ],
    "note": "",
    "risk": "safe",
    "platforms": [
      "linux",
      "macos"
    ],
    "tags": [
      "curl",
      "download"
    ]
  },
  {
    "id": "net-wget",
    "category": "网络排查",
    "name": "下载文件（wget）",
    "description": "用 wget 从 URL 下载文件",
    "template": "wget {url}",
    "params": [
      {
        "key": "url",
        "label": "文件 URL",
        "placeholder": "https://example.com/file.zip",
        "required": true,
        "defaultValue": "https://example.com/file.zip"
      }
    ],
    "note": "",
    "risk": "safe",
    "platforms": [
      "linux",
      "macos"
    ],
    "tags": [
      "wget",
      "download"
    ]
  },
  {
    "id": "net-curl-head",
    "category": "网络排查",
    "name": "查看 HTTP 响应头",
    "description": "只请求并显示 HTTP 响应头",
    "template": "curl -I {url}",
    "params": [
      {
        "key": "url",
        "label": "URL",
        "placeholder": "https://example.com",
        "required": true,
        "defaultValue": "https://example.com"
      }
    ],
    "note": "",
    "risk": "safe",
    "platforms": [
      "linux",
      "macos"
    ],
    "tags": [
      "curl",
      "header",
      "http"
    ]
  },
  {
    "id": "net-curl-json",
    "category": "网络排查",
    "name": "POST JSON 请求",
    "description": "使用 curl 发送 JSON 请求体",
    "template": "curl -X POST {url} -H 'Content-Type: application/json' -d {body}",
    "params": [
      {
        "key": "url",
        "label": "URL",
        "placeholder": "https://api.example.com",
        "required": true,
        "defaultValue": "https://api.example.com"
      },
      {
        "key": "body",
        "label": "JSON Body",
        "placeholder": "{\"hello\":\"world\"}",
        "required": true,
        "defaultValue": "{\"hello\":\"world\"}"
      }
    ],
    "note": "包含敏感 token 时不要粘贴到公开日志",
    "risk": "watch",
    "platforms": [
      "linux",
      "macos"
    ],
    "tags": [
      "curl",
      "post",
      "json",
      "api"
    ]
  },
  {
    "id": "net-dns",
    "category": "网络排查",
    "name": "DNS 查询",
    "description": "查询域名 DNS 解析记录",
    "template": "dig {domain} [{record}]",
    "params": [
      {
        "key": "domain",
        "label": "域名",
        "placeholder": "example.com",
        "required": true,
        "defaultValue": "example.com"
      },
      {
        "key": "record",
        "label": "记录类型",
        "placeholder": "A",
        "defaultValue": "A",
        "type": "select",
        "choices": [
          {
            "label": "A",
            "value": "A"
          },
          {
            "label": "AAAA",
            "value": "AAAA"
          },
          {
            "label": "CNAME",
            "value": "CNAME"
          },
          {
            "label": "MX",
            "value": "MX"
          },
          {
            "label": "TXT",
            "value": "TXT"
          },
          {
            "label": "NS",
            "value": "NS"
          }
        ]
      }
    ],
    "note": "部分系统需要先安装 dnsutils / bind-tools",
    "risk": "safe",
    "platforms": [
      "linux",
      "macos"
    ],
    "tags": [
      "dig",
      "dns"
    ]
  },
  {
    "id": "net-nc-port",
    "category": "网络排查",
    "name": "测试端口连通",
    "description": "使用 nc 测试目标主机端口是否可连接",
    "template": "nc -vz {host} {port}",
    "params": [
      {
        "key": "host",
        "label": "主机",
        "placeholder": "example.com",
        "required": true,
        "defaultValue": "example.com"
      },
      {
        "key": "port",
        "label": "端口",
        "placeholder": "443",
        "required": true,
        "defaultValue": "443",
        "raw": true
      }
    ],
    "note": "",
    "risk": "safe",
    "platforms": [
      "linux",
      "macos"
    ],
    "tags": [
      "nc",
      "port",
      "tcp"
    ]
  },
  {
    "id": "proc-ps",
    "category": "进程管理",
    "name": "查找进程",
    "description": "按名称查找运行中的进程",
    "template": "ps aux | grep {name}",
    "params": [
      {
        "key": "name",
        "label": "进程名",
        "placeholder": "node",
        "required": true,
        "defaultValue": "node"
      }
    ],
    "note": "",
    "risk": "safe",
    "platforms": [
      "linux",
      "macos"
    ],
    "tags": [
      "ps",
      "grep",
      "process"
    ]
  },
  {
    "id": "proc-kill",
    "category": "进程管理",
    "name": "结束进程",
    "description": "通过 PID 终止进程",
    "template": "kill {signal} {pid}",
    "params": [
      {
        "key": "signal",
        "label": "信号",
        "placeholder": "",
        "defaultValue": "",
        "type": "select",
        "choices": [
          {
            "label": "正常终止",
            "value": ""
          },
          {
            "label": "强制 -9",
            "value": "-9"
          }
        ]
      },
      {
        "key": "pid",
        "label": "进程 PID",
        "placeholder": "12345",
        "required": true,
        "defaultValue": "12345",
        "raw": true
      }
    ],
    "note": "kill -9 会强制终止，可能造成未保存数据丢失",
    "risk": "danger",
    "platforms": [
      "linux",
      "macos"
    ],
    "tags": [
      "kill",
      "process"
    ]
  },
  {
    "id": "proc-top",
    "category": "进程管理",
    "name": "实时进程监控",
    "description": "动态查看系统进程资源占用",
    "template": "top -o {sort}",
    "params": [
      {
        "key": "sort",
        "label": "排序方式",
        "placeholder": "%CPU",
        "defaultValue": "%CPU",
        "type": "select",
        "choices": [
          {
            "label": "CPU",
            "value": "%CPU"
          },
          {
            "label": "Memory",
            "value": "%MEM"
          },
          {
            "label": "PID",
            "value": "PID"
          }
        ]
      }
    ],
    "note": "macOS 常用 top -o cpu",
    "risk": "safe",
    "platforms": [
      "linux",
      "macos"
    ],
    "tags": [
      "top",
      "process",
      "cpu"
    ]
  },
  {
    "id": "proc-htop",
    "category": "进程管理",
    "name": "查看系统资源概览",
    "description": "使用 htop 查看 CPU、内存和进程",
    "template": "htop",
    "params": [],
    "note": "如未安装：brew install htop / apt install htop",
    "risk": "safe",
    "platforms": [
      "linux",
      "macos"
    ],
    "tags": [
      "htop",
      "monitor"
    ]
  },
  {
    "id": "proc-pkill",
    "category": "进程管理",
    "name": "按名称结束进程",
    "description": "按进程名匹配并结束进程",
    "template": "pkill {signal} -f {name}",
    "params": [
      {
        "key": "signal",
        "label": "信号",
        "placeholder": "",
        "defaultValue": "",
        "type": "select",
        "choices": [
          {
            "label": "正常终止",
            "value": ""
          },
          {
            "label": "强制 -9",
            "value": "-9"
          }
        ]
      },
      {
        "key": "name",
        "label": "进程名",
        "placeholder": "node",
        "required": true,
        "defaultValue": "node"
      }
    ],
    "note": "会影响所有匹配的进程，先用 ps aux | grep 确认",
    "risk": "danger",
    "platforms": [
      "linux",
      "macos"
    ],
    "tags": [
      "pkill",
      "kill",
      "process"
    ]
  },
  {
    "id": "sys-uname",
    "category": "系统信息",
    "name": "查看系统信息",
    "description": "显示操作系统和内核信息",
    "template": "uname -a",
    "params": [],
    "note": "",
    "risk": "safe",
    "platforms": [
      "linux",
      "macos"
    ],
    "tags": [
      "uname",
      "system"
    ]
  },
  {
    "id": "sys-memory",
    "category": "系统信息",
    "name": "查看内存使用",
    "description": "以人类可读格式显示内存使用情况",
    "template": "free -h",
    "params": [],
    "note": "macOS 可用 vm_stat 或 top",
    "risk": "safe",
    "platforms": [
      "linux"
    ],
    "tags": [
      "memory",
      "free"
    ]
  },
  {
    "id": "sys-cpu",
    "category": "系统信息",
    "name": "查看 CPU 信息",
    "description": "显示 CPU 核心数和型号",
    "template": "lscpu",
    "params": [],
    "note": "macOS 可用 sysctl -n machdep.cpu.brand_string",
    "risk": "safe",
    "platforms": [
      "linux"
    ],
    "tags": [
      "cpu",
      "lscpu"
    ]
  },
  {
    "id": "sys-user",
    "category": "系统信息",
    "name": "查看当前用户",
    "description": "显示当前登录用户名",
    "template": "whoami",
    "params": [],
    "note": "",
    "risk": "safe",
    "platforms": [
      "linux",
      "macos"
    ],
    "tags": [
      "user",
      "whoami"
    ]
  },
  {
    "id": "sys-env",
    "category": "系统信息",
    "name": "查看环境变量",
    "description": "显示所有环境变量",
    "template": "env",
    "params": [],
    "note": "可能包含 token，不要随意分享输出",
    "risk": "watch",
    "platforms": [
      "linux",
      "macos"
    ],
    "tags": [
      "env",
      "环境变量"
    ]
  },
  {
    "id": "sys-uptime",
    "category": "系统信息",
    "name": "查看开机时间",
    "description": "显示系统启动时间和运行时长",
    "template": "uptime",
    "params": [],
    "note": "",
    "risk": "safe",
    "platforms": [
      "linux",
      "macos"
    ],
    "tags": [
      "uptime"
    ]
  },
  {
    "id": "sys-journal",
    "category": "系统信息",
    "name": "查看系统日志",
    "description": "查看 systemd journal 最近日志",
    "template": "journalctl -xe [--unit {service}]",
    "params": [
      {
        "key": "service",
        "label": "服务名",
        "placeholder": "nginx",
        "defaultValue": ""
      }
    ],
    "note": "Linux systemd 环境适用",
    "risk": "safe",
    "platforms": [
      "linux"
    ],
    "tags": [
      "journalctl",
      "log",
      "systemd"
    ]
  },
  {
    "id": "user-add",
    "category": "用户 & 权限",
    "name": "添加用户",
    "description": "创建新系统用户并创建 home 目录",
    "template": "useradd -m {username}",
    "params": [
      {
        "key": "username",
        "label": "用户名",
        "placeholder": "deploy",
        "required": true,
        "defaultValue": "deploy",
        "raw": true
      }
    ],
    "note": "通常需要 sudo 权限",
    "risk": "watch",
    "platforms": [
      "linux"
    ],
    "tags": [
      "useradd",
      "user"
    ]
  },
  {
    "id": "user-passwd",
    "category": "用户 & 权限",
    "name": "修改密码",
    "description": "修改指定用户的密码",
    "template": "passwd {username}",
    "params": [
      {
        "key": "username",
        "label": "用户名",
        "placeholder": "deploy",
        "required": true,
        "defaultValue": "deploy",
        "raw": true
      }
    ],
    "note": "通常需要 sudo 权限",
    "risk": "watch",
    "platforms": [
      "linux",
      "macos"
    ],
    "tags": [
      "passwd",
      "password"
    ]
  },
  {
    "id": "user-su",
    "category": "用户 & 权限",
    "name": "切换用户",
    "description": "切换到指定用户",
    "template": "su {username}",
    "params": [
      {
        "key": "username",
        "label": "用户名",
        "placeholder": "root",
        "required": true,
        "defaultValue": "root",
        "raw": true
      }
    ],
    "note": "",
    "risk": "watch",
    "platforms": [
      "linux",
      "macos"
    ],
    "tags": [
      "su",
      "user"
    ]
  },
  {
    "id": "user-sudo",
    "category": "用户 & 权限",
    "name": "以 sudo 执行命令",
    "description": "用管理员权限执行单条命令",
    "template": "sudo {cmd}",
    "params": [
      {
        "key": "cmd",
        "label": "命令",
        "placeholder": "systemctl restart nginx",
        "required": true,
        "defaultValue": "systemctl restart nginx",
        "raw": true
      }
    ],
    "note": "请确认命令来源可信",
    "risk": "danger",
    "platforms": [
      "linux",
      "macos"
    ],
    "tags": [
      "sudo",
      "root"
    ]
  },
  {
    "id": "user-groups",
    "category": "用户 & 权限",
    "name": "查看用户组",
    "description": "查看当前用户或指定用户所属用户组",
    "template": "groups [{username}]",
    "params": [
      {
        "key": "username",
        "label": "用户名",
        "placeholder": "deploy",
        "defaultValue": "",
        "raw": true
      }
    ],
    "note": "",
    "risk": "safe",
    "platforms": [
      "linux",
      "macos"
    ],
    "tags": [
      "groups",
      "user"
    ]
  },
  {
    "id": "svc-start",
    "category": "服务管理",
    "name": "启动服务",
    "description": "启动 systemd 服务",
    "template": "systemctl start {service}",
    "params": [
      {
        "key": "service",
        "label": "服务名",
        "placeholder": "nginx",
        "required": true,
        "defaultValue": "nginx",
        "raw": true
      }
    ],
    "note": "通常需要 sudo 权限",
    "risk": "watch",
    "platforms": [
      "linux"
    ],
    "tags": [
      "systemctl",
      "service"
    ]
  },
  {
    "id": "svc-stop",
    "category": "服务管理",
    "name": "停止服务",
    "description": "停止 systemd 服务",
    "template": "systemctl stop {service}",
    "params": [
      {
        "key": "service",
        "label": "服务名",
        "placeholder": "nginx",
        "required": true,
        "defaultValue": "nginx",
        "raw": true
      }
    ],
    "note": "会中断对应服务",
    "risk": "danger",
    "platforms": [
      "linux"
    ],
    "tags": [
      "systemctl",
      "service",
      "stop"
    ]
  },
  {
    "id": "svc-restart",
    "category": "服务管理",
    "name": "重启服务",
    "description": "重启 systemd 服务",
    "template": "systemctl restart {service}",
    "params": [
      {
        "key": "service",
        "label": "服务名",
        "placeholder": "nginx",
        "required": true,
        "defaultValue": "nginx",
        "raw": true
      }
    ],
    "note": "会短暂中断对应服务",
    "risk": "watch",
    "platforms": [
      "linux"
    ],
    "tags": [
      "systemctl",
      "restart"
    ]
  },
  {
    "id": "svc-status",
    "category": "服务管理",
    "name": "查看服务状态",
    "description": "查看 systemd 服务运行状态",
    "template": "systemctl status {service}",
    "params": [
      {
        "key": "service",
        "label": "服务名",
        "placeholder": "nginx",
        "required": true,
        "defaultValue": "nginx",
        "raw": true
      }
    ],
    "note": "",
    "risk": "safe",
    "platforms": [
      "linux"
    ],
    "tags": [
      "systemctl",
      "status"
    ]
  },
  {
    "id": "svc-enable",
    "category": "服务管理",
    "name": "开机自启",
    "description": "设置服务开机自动启动",
    "template": "systemctl enable {service}",
    "params": [
      {
        "key": "service",
        "label": "服务名",
        "placeholder": "nginx",
        "required": true,
        "defaultValue": "nginx",
        "raw": true
      }
    ],
    "note": "通常需要 sudo 权限",
    "risk": "watch",
    "platforms": [
      "linux"
    ],
    "tags": [
      "enable",
      "systemctl"
    ]
  },
  {
    "id": "svc-logs",
    "category": "服务管理",
    "name": "实时查看服务日志",
    "description": "跟踪指定 systemd 服务日志",
    "template": "journalctl -u {service} -f",
    "params": [
      {
        "key": "service",
        "label": "服务名",
        "placeholder": "nginx",
        "required": true,
        "defaultValue": "nginx",
        "raw": true
      }
    ],
    "note": "",
    "risk": "safe",
    "platforms": [
      "linux"
    ],
    "tags": [
      "journalctl",
      "logs"
    ]
  },
  {
    "id": "docker-ps",
    "category": "Docker",
    "name": "查看运行容器",
    "description": "列出当前正在运行的容器",
    "template": "docker ps",
    "params": [],
    "note": "",
    "risk": "safe",
    "platforms": [
      "docker"
    ],
    "tags": [
      "docker",
      "ps"
    ]
  },
  {
    "id": "docker-ps-a",
    "category": "Docker",
    "name": "查看所有容器",
    "description": "列出所有容器，包含已停止容器",
    "template": "docker ps -a",
    "params": [],
    "note": "",
    "risk": "safe",
    "platforms": [
      "docker"
    ],
    "tags": [
      "docker",
      "container"
    ]
  },
  {
    "id": "docker-images",
    "category": "Docker",
    "name": "查看镜像列表",
    "description": "列出本地所有 Docker 镜像",
    "template": "docker images",
    "params": [],
    "note": "",
    "risk": "safe",
    "platforms": [
      "docker"
    ],
    "tags": [
      "docker",
      "images"
    ]
  },
  {
    "id": "docker-start",
    "category": "Docker",
    "name": "启动容器",
    "description": "启动已停止的容器",
    "template": "docker start {container}",
    "params": [
      {
        "key": "container",
        "label": "容器名/ID",
        "placeholder": "my-app",
        "required": true,
        "defaultValue": "my-app"
      }
    ],
    "note": "",
    "risk": "safe",
    "platforms": [
      "docker"
    ],
    "tags": [
      "docker",
      "start"
    ]
  },
  {
    "id": "docker-stop",
    "category": "Docker",
    "name": "停止容器",
    "description": "停止运行中的容器",
    "template": "docker stop {container}",
    "params": [
      {
        "key": "container",
        "label": "容器名/ID",
        "placeholder": "my-app",
        "required": true,
        "defaultValue": "my-app"
      }
    ],
    "note": "会停止服务容器",
    "risk": "watch",
    "platforms": [
      "docker"
    ],
    "tags": [
      "docker",
      "stop"
    ]
  },
  {
    "id": "docker-exec",
    "category": "Docker",
    "name": "进入容器终端",
    "description": "在运行中的容器内打开 shell",
    "template": "docker exec -it {container} {shell}",
    "params": [
      {
        "key": "container",
        "label": "容器名/ID",
        "placeholder": "my-app",
        "required": true,
        "defaultValue": "my-app"
      },
      {
        "key": "shell",
        "label": "Shell",
        "placeholder": "/bin/bash",
        "defaultValue": "/bin/bash",
        "raw": true
      }
    ],
    "note": "",
    "risk": "safe",
    "platforms": [
      "docker"
    ],
    "tags": [
      "docker",
      "exec",
      "shell"
    ]
  },
  {
    "id": "docker-logs",
    "category": "Docker",
    "name": "查看容器日志",
    "description": "实时查看容器输出日志",
    "template": "docker logs -f [--tail {tail} ]{container}",
    "params": [
      {
        "key": "container",
        "label": "容器名/ID",
        "placeholder": "my-app",
        "required": true,
        "defaultValue": "my-app"
      },
      {
        "key": "tail",
        "label": "最近行数",
        "placeholder": "100",
        "defaultValue": "100",
        "raw": true
      }
    ],
    "note": "",
    "risk": "safe",
    "platforms": [
      "docker"
    ],
    "tags": [
      "docker",
      "logs"
    ]
  },
  {
    "id": "docker-rm",
    "category": "Docker",
    "name": "删除容器",
    "description": "强制删除容器",
    "template": "docker rm -f {container}",
    "params": [
      {
        "key": "container",
        "label": "容器名/ID",
        "placeholder": "my-app",
        "required": true,
        "defaultValue": "my-app"
      }
    ],
    "note": "会删除容器，请确认数据卷和状态",
    "risk": "danger",
    "platforms": [
      "docker"
    ],
    "tags": [
      "docker",
      "rm",
      "delete"
    ]
  },
  {
    "id": "docker-rmi",
    "category": "Docker",
    "name": "删除镜像",
    "description": "删除本地 Docker 镜像",
    "template": "docker rmi {image}",
    "params": [
      {
        "key": "image",
        "label": "镜像名:标签",
        "placeholder": "nginx:latest",
        "required": true,
        "defaultValue": "nginx:latest"
      }
    ],
    "note": "被容器使用的镜像无法直接删除",
    "risk": "watch",
    "platforms": [
      "docker"
    ],
    "tags": [
      "docker",
      "rmi",
      "image"
    ]
  },
  {
    "id": "docker-build",
    "category": "Docker",
    "name": "构建镜像",
    "description": "从 Dockerfile 构建镜像",
    "template": "docker build -t {tag} {path}",
    "params": [
      {
        "key": "tag",
        "label": "镜像标签",
        "placeholder": "my-app:1.0",
        "required": true,
        "defaultValue": "my-app:1.0"
      },
      {
        "key": "path",
        "label": "构建路径",
        "placeholder": ".",
        "defaultValue": "."
      }
    ],
    "note": "",
    "risk": "safe",
    "platforms": [
      "docker"
    ],
    "tags": [
      "docker",
      "build"
    ]
  },
  {
    "id": "docker-prune",
    "category": "Docker",
    "name": "清理 Docker 资源",
    "description": "清理未使用的容器、网络、镜像和构建缓存",
    "template": "docker system prune {all}",
    "params": [
      {
        "key": "all",
        "label": "清理范围",
        "placeholder": "",
        "defaultValue": "",
        "type": "select",
        "choices": [
          {
            "label": "默认",
            "value": ""
          },
          {
            "label": "包含未使用镜像 -a",
            "value": "-a"
          }
        ]
      }
    ],
    "note": "会删除未使用资源，执行前确认",
    "risk": "danger",
    "platforms": [
      "docker"
    ],
    "tags": [
      "docker",
      "prune",
      "clean"
    ]
  },
  {
    "id": "pkg-apt-update",
    "category": "包管理",
    "name": "APT 更新索引",
    "description": "更新 apt 软件包索引",
    "template": "apt update",
    "params": [],
    "note": "通常需要 sudo",
    "risk": "safe",
    "platforms": [
      "linux"
    ],
    "tags": [
      "apt",
      "update"
    ]
  },
  {
    "id": "pkg-apt-install",
    "category": "包管理",
    "name": "APT 安装包",
    "description": "使用 apt 安装软件包",
    "template": "apt install {package}",
    "params": [
      {
        "key": "package",
        "label": "包名",
        "placeholder": "nginx",
        "required": true,
        "defaultValue": "nginx",
        "raw": true
      }
    ],
    "note": "通常需要 sudo",
    "risk": "watch",
    "platforms": [
      "linux"
    ],
    "tags": [
      "apt",
      "install"
    ]
  },
  {
    "id": "pkg-brew-install",
    "category": "包管理",
    "name": "Homebrew 安装包",
    "description": "使用 Homebrew 安装软件包",
    "template": "brew install {package}",
    "params": [
      {
        "key": "package",
        "label": "包名",
        "placeholder": "wget",
        "required": true,
        "defaultValue": "wget",
        "raw": true
      }
    ],
    "note": "macOS 常用",
    "risk": "safe",
    "platforms": [
      "macos"
    ],
    "tags": [
      "brew",
      "install"
    ]
  },
  {
    "id": "pkg-npm",
    "category": "包管理",
    "name": "npm 安装依赖",
    "description": "在当前项目安装 npm 依赖",
    "template": "npm install {package}",
    "params": [
      {
        "key": "package",
        "label": "包名",
        "placeholder": "lodash",
        "required": true,
        "defaultValue": "lodash",
        "raw": true
      }
    ],
    "note": "会修改 package.json / lockfile",
    "risk": "watch",
    "platforms": [
      "linux",
      "macos"
    ],
    "tags": [
      "npm",
      "install"
    ]
  }
]

const RISK_META: Record<RiskLevel, { label: string; desc: string }> = {
  safe: {
    label: "安全",
    desc: "主要是查看、读取或常规操作。",
  },
  watch: {
    label: "注意",
    desc: "可能修改文件、服务、权限或项目状态，执行前确认目标。",
  },
  danger: {
    label: "高风险",
    desc: "可能中断服务、删除资源、强制结束进程或影响系统状态。",
  },
}

const PLATFORM_META: Record<Platform, { label: string; short: string }> = {
  linux: {
    label: "Linux",
    short: "LINUX",
  },
  macos: {
    label: "macOS",
    short: "MAC",
  },
  docker: {
    label: "Docker",
    short: "DOCKER",
  },
}

const QUICK_SEARCHES = [
  { label: "端口", query: "端口" },
  { label: "docker", query: "docker" },
  { label: "日志", query: "日志" },
  { label: "权限", query: "权限" },
  { label: "高风险", query: "kill" },
]

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value)
}

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase()
}

function shellQuote(value: string) {
  if (value === "") return "''"
  if (/^[A-Za-z0-9_./:@%+=,-]+$/.test(value)) return value
  return `'${value.replace(/'/g, `'\\''`)}'`
}

function extractPlaceholders(template: string) {
  const keys = new Set<string>()
  const pattern = /\{([a-zA-Z0-9_-]+)\}/g
  let match: RegExpExecArray | null

  while ((match = pattern.exec(template)) !== null) {
    keys.add(match[1])
  }

  return Array.from(keys)
}

function getDefaultValues(command: TerminalCommand) {
  return command.params.reduce<Record<string, string>>((acc, param) => {
    acc[param.key] = param.defaultValue ?? ""
    return acc
  }, {})
}

function cleanCommandLine(value: string) {
  return value
    .split("\n")
    .map((line) =>
      line
        .replace(/[ \t]+/g, " ")
        .replace(/\s+([|;])/g, " $1")
        .replace(/([|;])\s+/g, "$1 ")
        .trim(),
    )
    .filter(Boolean)
    .join("\n")
}

function renderCommand(command: TerminalCommand, values: Record<string, string>, quoteValues: boolean, sudoPrefix: boolean) {
  const paramMap = new Map(command.params.map((param) => [param.key, param]))
  const merged = {
    ...getDefaultValues(command),
    ...values,
  }

  const getValue = (key: string) => merged[key] ?? ""

  const interpolate = (source: string) =>
    source.replace(/\{([a-zA-Z0-9_-]+)\}/g, (_, key: string) => {
      const param = paramMap.get(key)
      const value = getValue(key)

      if (!quoteValues || param?.raw) return value
      return shellQuote(value)
    })

  const withOptional = command.template.replace(/\[([^\[\]]+)\]/g, (full, inner: string) => {
    const keys = extractPlaceholders(inner)
    const shouldInclude = keys.every((key) => {
      const value = getValue(key).trim()
      return value !== "" && value !== "false"
    })

    return shouldInclude ? interpolate(inner) : ""
  })

  let output = cleanCommandLine(interpolate(withOptional))

  if (sudoPrefix && output && !output.startsWith("sudo ") && command.category !== "Docker") {
    output = output
      .split("\n")
      .map((line) => (line.trim() ? `sudo ${line}` : line))
      .join("\n")
  }

  return output
}

function getMissingParams(command: TerminalCommand, values: Record<string, string>) {
  const merged = {
    ...getDefaultValues(command),
    ...values,
  }

  return command.params.filter((param) => param.required && !String(merged[param.key] ?? "").trim())
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

function commandSearchText(command: TerminalCommand) {
  return [
    command.category,
    command.name,
    command.description,
    command.template,
    command.note,
    command.risk,
    ...command.tags,
    ...command.platforms,
  ]
    .join(" ")
    .toLocaleLowerCase()
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
  generated,
  copied,
  favorite,
  selected,
  onCopy,
  onSelect,
  onToggleFavorite,
}: {
  command: TerminalCommand
  generated: string
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
            <span className={`text-[8px] font-semibold tracking-[.13em] ${selected ? "text-white/28" : "text-black/24"}`}>{command.category}</span>
            {command.platforms.map((platform) => (
              <span key={platform} className={`rounded-full px-2 py-0.5 text-[7px] font-semibold ${selected ? "bg-white/10 text-white/36" : "bg-black/[.04] text-black/25"}`}>{PLATFORM_META[platform].short}</span>
            ))}
          </div>

          <h3 className={`mt-3 text-[15px] font-semibold tracking-[-.03em] ${selected ? "text-white" : "text-[#22231f]"}`}>{command.name}</h3>
          <p className={`mt-2 text-[9px] leading-5 ${selected ? "text-white/36" : "text-black/34"}`}>{command.description}</p>
          <pre className={`mt-3 overflow-auto whitespace-pre-wrap break-all rounded-[16px] px-3 py-3 font-mono text-[10px] leading-5 ${selected ? "bg-white/[.055] text-[#cbd8cd]" : "bg-[#151714] text-[#cbd8cd]"}`}>{generated}</pre>

          {command.note && (
            <p className={`mt-3 text-[8px] leading-4 ${selected ? "text-[#e1b0a2]" : "text-[#965744]"}`}>{command.note}</p>
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
  const toneClass = tone === "green" ? "text-[#52685d]" : tone === "gold" ? "text-[#9b7542]" : tone === "rose" ? "text-[#965744]" : "text-black/61"

  return (
    <div className="bg-[#f3f0e8]/92 p-4">
      <div className="text-[7px] font-semibold tracking-[.12em] text-black/23">{label}</div>
      <div className={`term-num mt-3 break-all font-mono text-[13px] font-semibold ${toneClass}`}>{value}</div>
    </div>
  )
}

export default function TerminalPage() {
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState("全部")
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "all">("all")
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all")
  const [favoriteOnly, setFavoriteOnly] = useState(false)
  const [dangerOnly, setDangerOnly] = useState(false)
  const [quoteValues, setQuoteValues] = useState(true)
  const [sudoPrefix, setSudoPrefix] = useState(false)
  const [copied, setCopied] = useState<CopyKey>(null)
  const [favorites, setFavorites] = useState<string[]>([])
  const [activeId, setActiveId] = useState(COMMANDS[0]?.id ?? "")
  const [paramValues, setParamValues] = useState<Record<string, Record<string, string>>>({})
  const [queue, setQueue] = useState<QueueItem[]>([])

  const pageRef = useRef<HTMLDivElement>(null)
  const detailRef = useRef<HTMLDivElement>(null)

  const categories = useMemo(() => ["全部", ...Array.from(new Set(COMMANDS.map((command) => command.category)))], [])
  const favoriteSet = useMemo(() => new Set(favorites), [favorites])
  const activeCommand = useMemo(() => COMMANDS.find((command) => command.id === activeId) ?? COMMANDS[0], [activeId])
  const activeValues = useMemo(() => ({ ...getDefaultValues(activeCommand), ...(paramValues[activeCommand.id] ?? {}) }), [activeCommand, paramValues])
  const generatedCommand = useMemo(() => renderCommand(activeCommand, activeValues, quoteValues, sudoPrefix), [activeCommand, activeValues, quoteValues, sudoPrefix])
  const missingParams = useMemo(() => getMissingParams(activeCommand, activeValues), [activeCommand, activeValues])

  const commandOutputs = useMemo(() => {
    const map = new Map<string, string>()

    for (const command of COMMANDS) {
      map.set(
        command.id,
        renderCommand(command, paramValues[command.id] ?? {}, quoteValues, sudoPrefix),
      )
    }

    return map
  }, [paramValues, quoteValues, sudoPrefix])

  const filtered = useMemo(() => {
    const query = normalizeSearch(search)

    return COMMANDS.filter((command) => {
      const matchCategory = activeCategory === "全部" || command.category === activeCategory
      const matchRisk = riskFilter === "all" || command.risk === riskFilter
      const matchPlatform = platformFilter === "all" || command.platforms.includes(platformFilter)
      const matchFavorite = !favoriteOnly || favoriteSet.has(command.id)
      const matchDanger = !dangerOnly || command.risk === "danger" || command.risk === "watch"
      const haystack = `${commandSearchText(command)} ${commandOutputs.get(command.id) ?? ""}`.toLocaleLowerCase()

      return matchCategory && matchRisk && matchPlatform && matchFavorite && matchDanger && (!query || haystack.includes(query))
    })
  }, [activeCategory, commandOutputs, dangerOnly, favoriteOnly, favoriteSet, platformFilter, riskFilter, search])

  const grouped = useMemo(() => {
    const map = new Map<string, TerminalCommand[]>()

    for (const command of filtered) {
      if (!map.has(command.category)) map.set(command.category, [])
      map.get(command.category)?.push(command)
    }

    return Array.from(map.entries())
  }, [filtered])

  const stats = useMemo(
    () => ({
      total: COMMANDS.length,
      shown: filtered.length,
      categories: categories.length - 1,
      safe: COMMANDS.filter((command) => command.risk === "safe").length,
      watch: COMMANDS.filter((command) => command.risk === "watch").length,
      danger: COMMANDS.filter((command) => command.risk === "danger").length,
      linux: COMMANDS.filter((command) => command.platforms.includes("linux")).length,
      macos: COMMANDS.filter((command) => command.platforms.includes("macos")).length,
      docker: COMMANDS.filter((command) => command.platforms.includes("docker")).length,
    }),
    [categories.length, filtered.length],
  )

  const visibleText = useMemo(
    () =>
      filtered
        .map((command) => {
          const generated = commandOutputs.get(command.id) ?? command.template
          return `${command.name}\n${generated}\n${command.description}${command.note ? `\n${command.note}` : ""}`
        })
        .join("\n\n"),
    [commandOutputs, filtered],
  )

  const queueScript = useMemo(
    () =>
      [
        "#!/usr/bin/env bash",
        "set -euo pipefail",
        "",
        ...queue.flatMap((item, index) => [
          `# ${index + 1}. ${item.name} · ${RISK_META[item.risk].label}`,
          item.command,
          "",
        ]),
      ].join("\n").trimEnd(),
    [queue],
  )

  const report = useMemo(
    () =>
      [
        "BitLeap Terminal Command Studio",
        "",
        `分类：${activeCategory}`,
        `搜索：${search || "无"}`,
        `风险：${riskFilter === "all" ? "全部" : RISK_META[riskFilter].label}`,
        `平台：${platformFilter === "all" ? "全部" : PLATFORM_META[platformFilter].label}`,
        `显示：${filtered.length} / ${COMMANDS.length}`,
        "",
        "当前命令：",
        activeCommand ? `${activeCommand.name}\n${generatedCommand}\n${activeCommand.description}` : "无",
        "",
        "脚本队列：",
        queue.length ? queueScript : "空",
        "",
        "当前筛选结果：",
        visibleText || "无匹配命令",
      ].join("\n"),
    [
      activeCategory,
      activeCommand,
      filtered.length,
      generatedCommand,
      platformFilter,
      queue.length,
      queueScript,
      riskFilter,
      search,
      visibleText,
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
    if (!pageRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      gsap.from(".term-intro", {
        y: 22,
        opacity: 0,
        duration: 0.78,
        stagger: 0.055,
        ease: "power3.out",
      })

      gsap.to(".term-orbit-a", {
        rotation: 360,
        duration: 70,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      })

      gsap.to(".term-orbit-b", {
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
    if (!detailRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

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
  }, [activeId, generatedCommand])

  const copy = async (value: string, key: CopyKey) => {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {}
  }

  const updateParam = (commandId: string, key: string, value: string) => {
    setParamValues((current) => ({
      ...current,
      [commandId]: {
        ...(current[commandId] ?? {}),
        [key]: value,
      },
    }))
  }

  const toggleFavorite = (id: string) => {
    setFavorites((current) => (current.includes(id) ? current.filter((item) => item !== id) : [id, ...current]))
  }

  const addToQueue = () => {
    if (!generatedCommand) return

    setQueue((current) => [
      ...current,
      {
        id: `${activeCommand.id}-${Date.now()}-${current.length}`,
        name: activeCommand.name,
        command: generatedCommand,
        risk: activeCommand.risk,
      },
    ])
  }

  const reset = () => {
    setSearch("")
    setActiveCategory("全部")
    setRiskFilter("all")
    setPlatformFilter("all")
    setFavoriteOnly(false)
    setDangerOnly(false)
  }

  return (
    <div ref={pageRef} className="min-h-screen overflow-hidden bg-[#efede6] text-[#22231f] selection:bg-[#22231f] selection:text-white">
      <style>{`
        .term-scroll::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }

        .term-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .term-scroll::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(34,35,31,.13);
        }

        .term-dark-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,.14);
        }

        .term-grid {
          background-image:
            linear-gradient(rgba(34,35,31,.032) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,35,31,.032) 1px, transparent 1px);
          background-size: 30px 30px;
        }

        .term-num {
          font-variant-numeric: tabular-nums lining-nums;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_9%,rgba(178,151,91,.10),transparent_27%),radial-gradient(circle_at_8%_88%,rgba(73,107,91,.08),transparent_31%)]" />
        <div className="term-orbit-a absolute right-[-20vw] top-[-24vw] h-[58vw] w-[58vw] rounded-full border border-black/[.04]">
          <span className="absolute left-[15%] top-[43%] h-2 w-2 rounded-full bg-[#b28d48]/38" />
        </div>
        <div className="term-orbit-b absolute bottom-[-26vw] left-[-19vw] h-[53vw] w-[53vw] rounded-full border border-black/[.032]">
          <span className="absolute right-[14%] top-[31%] h-1.5 w-1.5 rounded-full bg-[#52685d]/35" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1580px] px-5 pb-10 pt-6 sm:px-8">
        <div className="term-intro">
          <Breadcrumb />
        </div>

        <header className="term-intro mt-8 grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div>
            <div className="text-[9px] font-semibold tracking-[.2em] text-black/27">TERMINAL COMMAND STUDIO</div>
            <h1 className="mt-4 max-w-[920px] text-[clamp(48px,6.35vw,90px)] font-semibold leading-[1.03] tracking-[-.055em]">
              把终端命令，
              <br />
              生成得更稳。
            </h1>
          </div>

          <div>
            <p className="max-w-[560px] text-[11px] leading-6 text-black/40">
              从 Linux、macOS、Docker 常用场景中选择命令，填写参数后实时生成可复制版本。支持风险分级、收藏、脚本队列、智能 Shell 引号和导出。
            </p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[8px] text-black/25">
              <span>{formatNumber(stats.total)} COMMANDS</span>
              <span>{formatNumber(stats.categories)} CATEGORIES</span>
              <span>{formatNumber(stats.danger)} HIGH RISK</span>
              <span>LOCAL ONLY</span>
            </div>
          </div>
        </header>

        <section className="term-intro mt-7 grid gap-7 xl:grid-cols-[.68fr_1.32fr]">
          <aside className="min-w-0">
            <div className="rounded-[28px] border border-black/[.075] bg-white/24 p-5">
              <div className="text-[8px] font-semibold tracking-[.14em] text-black/24">COMMAND INDEX</div>
              <h2 className="mt-3 text-[clamp(30px,3.5vw,46px)] font-semibold leading-none tracking-[-.045em]">搜索命令。</h2>

              <div className="mt-6 space-y-5">
                <label>
                  <span className="mb-2 block text-[8px] font-semibold tracking-[.12em] text-black/24">KEYWORD</span>
                  <input value={search} onChange={(event) => setSearch(event.target.value)} spellCheck={false} className="w-full rounded-full border border-black/[.08] bg-white/35 px-4 py-3 font-mono text-[10px] text-black/68 outline-none transition focus:border-black/25" placeholder="端口 / docker / 日志 / chmod / curl..." />
                </label>

                <div>
                  <div className="mb-2 text-[8px] font-semibold tracking-[.12em] text-black/24">CATEGORY</div>
                  <div className="flex max-h-[166px] flex-wrap gap-1.5 overflow-auto pr-1">
                    {categories.map((category) => (
                      <button key={category} type="button" onClick={() => setActiveCategory(category)} className={`rounded-full px-3.5 py-2 text-[8px] font-semibold transition ${activeCategory === category ? "bg-[#22231f] text-white" : "text-black/32 hover:bg-white/45 hover:text-black"}`}>{category}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-[8px] font-semibold tracking-[.12em] text-black/24">PLATFORM</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(["all", "linux", "macos", "docker"] as const).map((platform) => (
                      <button key={platform} type="button" onClick={() => setPlatformFilter(platform)} className={`rounded-full border px-3.5 py-2 text-[8px] font-semibold transition ${platformFilter === platform ? "border-[#52685d]/20 bg-[#52685d] text-white" : "border-black/[.08] text-black/31 hover:bg-white/45"}`}>
                        {platform === "all" ? "全部" : PLATFORM_META[platform].label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-[8px] font-semibold tracking-[.12em] text-black/24">RISK</div>
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
                  <TogglePill active={dangerOnly} label="只看需谨慎" onClick={() => setDangerOnly((value) => !value)} />
                  <TogglePill active={quoteValues} label="智能引号" onClick={() => setQuoteValues((value) => !value)} />
                  <TogglePill active={sudoPrefix} label="sudo 前缀" onClick={() => setSudoPrefix((value) => !value)} />
                  <button type="button" onClick={reset} className="rounded-full px-3.5 py-2 text-[8px] font-semibold text-[#965744] transition hover:bg-[#965744]/8">重置筛选</button>
                </div>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-[24px] border border-black/[.075] bg-white/24">
              <div className="border-b border-black/[.06] px-5 py-4">
                <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">PROFILE</div>
                <p className="mt-2 text-[9px] leading-5 text-black/35">
                  当前显示 {formatNumber(stats.shown)} 条命令。危险操作会用红色标记，复制前请检查目标路径、进程和服务名。
                </p>
              </div>

              <div className="grid grid-cols-2 gap-px bg-black/[.06]">
                <StatBox label="TOTAL" value={formatNumber(stats.total)} />
                <StatBox label="SHOWN" value={formatNumber(stats.shown)} tone="green" />
                <StatBox label="WATCH" value={formatNumber(stats.watch)} tone="gold" />
                <StatBox label="DANGER" value={formatNumber(stats.danger)} tone="rose" />
                <StatBox label="LINUX" value={formatNumber(stats.linux)} />
                <StatBox label="MAC / DOCKER" value={`${formatNumber(stats.macos)} / ${formatNumber(stats.docker)}`} />
              </div>
            </div>

            <div className="mt-4 rounded-[24px] border border-black/[.075] bg-white/24 p-5">
              <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">QUICK SEARCH</div>
              <div className="mt-4 flex flex-wrap gap-2">
                {QUICK_SEARCHES.map((item) => (
                  <button key={item.label} type="button" onClick={() => { setSearch(item.query); setActiveCategory("全部") }} className="rounded-full border border-black/[.085] px-3.5 py-2 text-[8px] font-semibold text-black/35 transition hover:bg-white/45 hover:text-black">{item.label}</button>
                ))}
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="flex flex-col gap-4 border-b border-black/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-[8px] font-semibold tracking-[.14em] text-black/23">RESULT</div>
                <h2 className="mt-2 text-[clamp(31px,4vw,48px)] font-semibold leading-none tracking-[-.045em]">{filtered.length ? `${formatNumber(filtered.length)} 条命令。` : "没有匹配结果。"}</h2>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => copy(visibleText, "visible")} disabled={!visibleText} className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white transition hover:scale-[1.01] active:scale-[.98] disabled:opacity-30">{copied === "visible" ? "✓ 已复制" : "复制当前结果"}</button>
                <button type="button" onClick={() => downloadText(report, "bitleap-terminal-commands.txt")} disabled={!visibleText} className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 transition hover:bg-white/40 disabled:opacity-30">导出结果</button>
              </div>
            </div>

            <div className="mt-5 grid gap-7 2xl:grid-cols-[1fr_.74fr]">
              <div className="term-scroll max-h-[790px] overflow-auto pr-1">
                {grouped.length === 0 ? (
                  <div className="grid min-h-[360px] place-items-center rounded-[30px] border border-black/[.075] bg-white/22 px-6 text-center">
                    <div>
                      <div className="text-[8px] tracking-[.14em] text-black/20">EMPTY</div>
                      <p className="mt-3 text-[9px] text-black/28">没有找到匹配的终端命令。试试 docker、端口、日志、权限或清空筛选。</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {grouped.map(([category, commands]) => (
                      <section key={category}>
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="text-[9px] font-semibold tracking-[.14em] text-black/27">{category}</h3>
                          <span className="term-num font-mono text-[8px] text-black/22">{formatNumber(commands.length)} commands</span>
                        </div>

                        <div className="grid gap-3 lg:grid-cols-2">
                          {commands.map((command) => (
                            <CommandCard key={command.id} command={command} generated={commandOutputs.get(command.id) ?? command.template} copied={copied === command.id} favorite={favoriteSet.has(command.id)} selected={activeCommand?.id === command.id} onCopy={() => copy(commandOutputs.get(command.id) ?? command.template, command.id)} onSelect={() => setActiveId(command.id)} onToggleFavorite={() => toggleFavorite(command.id)} />
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
                      <span className="text-[8px] font-semibold tracking-[.13em] text-white/27">COMMAND BUILDER</span>
                      <span className={`text-[8px] font-semibold ${riskTone(activeCommand.risk)}`}>{RISK_META[activeCommand.risk].label}</span>
                    </div>

                    <h3 className="mt-4 text-[24px] font-semibold leading-none tracking-[-.05em] text-white">{activeCommand.name}</h3>
                    <p className="mt-3 text-[9px] leading-5 text-white/33">{activeCommand.description}</p>
                  </div>

                  <div className="border-b border-white/[.065] p-5">
                    <pre className="term-dark-scroll max-h-[240px] overflow-auto whitespace-pre-wrap break-all rounded-[20px] bg-white/[.035] p-4 font-mono text-[11px] leading-6 text-[#cbd8cd]">{generatedCommand}</pre>

                    {missingParams.length > 0 && (
                      <p className="mt-3 text-[8px] leading-5 text-[#d49a88]/72">还有 {missingParams.map((param) => param.label).join("、")} 未填写。</p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" onClick={() => copy(generatedCommand, "command")} disabled={!generatedCommand || missingParams.length > 0} className="rounded-full bg-white px-5 py-3 text-[9px] font-semibold text-[#151714] transition disabled:opacity-30">{copied === "command" ? "✓ 已复制" : "复制命令"}</button>
                      <button type="button" onClick={addToQueue} disabled={!generatedCommand || missingParams.length > 0} className="rounded-full border border-white/[.08] px-4 py-3 text-[9px] font-semibold text-white/33 transition hover:bg-white hover:text-[#151714] disabled:opacity-25">加入脚本</button>
                    </div>
                  </div>

                  <div className="term-dark-scroll max-h-[450px] overflow-auto p-5">
                    {activeCommand.params.length ? (
                      <div>
                        <div className="mb-3 text-[8px] font-semibold tracking-[.13em] text-white/24">PARAMS</div>
                        <div className="space-y-3">
                          {activeCommand.params.map((param) => (
                            <label key={param.key} className="block">
                              <span className="mb-1.5 block text-[8px] text-white/25">
                                {param.label}{param.required && <span className="text-[#d49a88]"> *</span>}
                              </span>

                              {param.type === "select" && param.choices ? (
                                <select value={activeValues[param.key] ?? ""} onChange={(event) => updateParam(activeCommand.id, param.key, event.target.value)} className="w-full rounded-full border border-white/[.07] bg-[#1d201b] px-4 py-3 font-mono text-[10px] text-[#cbd8cd] outline-none transition focus:border-white/20">
                                  {param.choices.map((choice) => (
                                    <option key={choice.label} value={choice.value}>{choice.label}</option>
                                  ))}
                                </select>
                              ) : (
                                <input value={activeValues[param.key] ?? ""} onChange={(event) => updateParam(activeCommand.id, param.key, event.target.value)} spellCheck={false} className="w-full rounded-full border border-white/[.07] bg-white/[.045] px-4 py-3 font-mono text-[10px] text-[#cbd8cd] outline-none transition focus:border-white/20" placeholder={param.placeholder} />
                              )}
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[9px] leading-5 text-white/24">这条命令没有参数，可以直接复制使用。</p>
                    )}

                    {activeCommand.note && (
                      <div className="mt-5 rounded-[18px] border border-[#d49a88]/14 bg-[#d49a88]/8 p-4">
                        <div className="text-[8px] font-semibold tracking-[.12em] text-[#d49a88]/72">NOTE</div>
                        <p className="mt-2 text-[8px] leading-5 text-[#d49a88]/72">{activeCommand.note}</p>
                      </div>
                    )}

                    <div className="mt-5 rounded-[18px] border border-white/[.07] bg-white/[.035] p-4">
                      <div className="text-[8px] font-semibold tracking-[.12em] text-white/24">RISK LEVEL</div>
                      <p className="mt-2 text-[8px] leading-5 text-white/31">{RISK_META[activeCommand.risk].desc}</p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="term-intro mt-12 grid gap-7 border-t border-black/10 pt-8 lg:grid-cols-[.56fr_1.44fr]">
          <div>
            <div className="text-[9px] font-semibold tracking-[.14em] text-black/25">SCRIPT QUEUE</div>
            <h2 className="mt-3 text-[clamp(30px,4vw,46px)] font-semibold leading-[1.06] tracking-[-.045em]">
              多条命令，
              <br />
              组装成脚本。
            </h2>
            <p className="mt-5 max-w-[390px] text-[9px] leading-5 text-black/34">
              把常用步骤加入队列，一次性复制或导出为 bash 脚本。高风险命令会保留注释标识，方便执行前复查。
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" onClick={() => copy(queueScript, "queue")} disabled={!queue.length} className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white transition disabled:opacity-30">{copied === "queue" ? "✓ 已复制脚本" : "复制脚本"}</button>
              <button type="button" onClick={() => downloadText(queueScript, "bitleap-terminal-script.sh")} disabled={!queue.length} className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 transition hover:bg-white/40 disabled:opacity-30">导出 .sh</button>
              <button type="button" onClick={() => setQueue([])} disabled={!queue.length} className="rounded-full px-4 py-3 text-[9px] font-semibold text-[#965744] transition hover:bg-[#965744]/8 disabled:opacity-30">清空队列</button>
            </div>
          </div>

          <div className="grid gap-px overflow-hidden rounded-[30px] border border-black/[.08] bg-black/[.08] lg:grid-cols-[.8fr_1.2fr]">
            <div className="bg-[#f4f1e9]">
              <div className="border-b border-black/[.065] px-5 py-4">
                <div className="text-[8px] font-semibold tracking-[.13em] text-black/24">QUEUE ITEMS</div>
                <p className="mt-2 text-[8px] leading-5 text-black/31">{queue.length ? `已有 ${formatNumber(queue.length)} 条命令。` : "还没有加入脚本的命令。"}</p>
              </div>

              <div className="term-scroll max-h-[420px] overflow-auto">
                {queue.length ? (
                  queue.map((item, index) => (
                    <div key={item.id} className="grid gap-2 border-b border-black/[.055] px-5 py-4 last:border-b-0">
                      <div className="flex items-center justify-between gap-3">
                        <span className="term-num font-mono text-[8px] text-black/22">#{String(index + 1).padStart(2, "0")}</span>
                        <button type="button" onClick={() => setQueue((current) => current.filter((entry) => entry.id !== item.id))} className="text-[8px] font-semibold text-[#965744]">删除</button>
                      </div>
                      <div className="text-[10px] font-semibold text-black/66">{item.name}</div>
                      <pre className="whitespace-pre-wrap break-all font-mono text-[9px] leading-5 text-black/48">{item.command}</pre>
                    </div>
                  ))
                ) : (
                  <div className="grid min-h-[260px] place-items-center px-6 text-center text-[9px] text-black/27">从右侧命令详情点击“加入脚本”。</div>
                )}
              </div>
            </div>

            <div className="bg-[#151714]">
              <div className="flex h-12 items-center justify-between border-b border-white/[.065] px-5">
                <span className="text-[8px] font-semibold tracking-[.13em] text-white/27">BASH SCRIPT</span>
                <span className="text-[8px] text-white/18">{queue.length ? "READY" : "EMPTY"}</span>
              </div>
              <pre className="term-dark-scroll h-[484px] overflow-auto whitespace-pre-wrap break-all p-5 font-mono text-[10px] leading-6 text-[#cbd8cd] sm:p-6">{queue.length ? queueScript : "#!/usr/bin/env bash\nset -euo pipefail\n\n# command queue is empty"}</pre>
            </div>
          </div>
        </section>

        <section className="term-intro mt-12 grid gap-9 border-t border-black/10 pt-8 lg:grid-cols-[.55fr_1.45fr]">
          <div>
            <div className="text-[9px] font-semibold tracking-[.14em] text-black/25">REPORT</div>
            <h2 className="mt-3 text-[clamp(30px,4vw,46px)] font-semibold leading-[1.06] tracking-[-.045em]">
              结果与脚本，
              <br />
              一起带走。
            </h2>
            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" onClick={() => copy(report, "report")} disabled={!report} className="rounded-full bg-[#22231f] px-5 py-3 text-[9px] font-semibold text-white transition disabled:opacity-30">{copied === "report" ? "✓ 已复制报告" : "复制报告"}</button>
              <button type="button" onClick={() => downloadText(report, "bitleap-terminal-report.txt")} disabled={!report} className="rounded-full border border-black/[.09] px-4 py-3 text-[9px] font-semibold text-black/38 transition hover:bg-white/40 disabled:opacity-30">导出报告</button>
            </div>
          </div>

          <div className="overflow-hidden rounded-[25px] border border-black/[.08] bg-[#171916]">
            <div className="flex items-center justify-between border-b border-white/[.07] px-5 py-3">
              <span className="text-[8px] tracking-[.13em] text-white/25">TERMINAL PROFILE</span>
              <span className="text-[8px] text-white/17">LOCAL GENERATOR</span>
            </div>
            <pre className="term-dark-scroll max-h-[390px] overflow-auto whitespace-pre-wrap break-words p-5 font-mono text-[11px] leading-7 text-[#c7d3c7] sm:p-6">{report}</pre>
          </div>
        </section>

        <section className="term-intro mt-12 grid gap-8 border-t border-black/10 pt-7 md:grid-cols-3">
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">SMART QUOTE</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">默认会对包含空格或特殊字符的参数做 Shell 引号包裹，减少路径、URL、搜索词中断命令的概率。</p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">RISK FIRST</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">删除、停止服务、强制结束进程、权限变更等命令会标记为注意或高风险，复制前先确认目标。</p>
          </div>
          <div>
            <div className="text-[8px] font-semibold tracking-[.11em] text-black/25">NOT A SANDBOX</div>
            <p className="mt-2 text-[9px] leading-5 text-black/34">这个页面只生成文本命令，不执行命令。真正运行前请根据你的系统、权限和路径做最终确认。</p>
          </div>
        </section>

        <div className="mt-12 border-t border-black/[.08] pt-5">
          <FooterNote />
        </div>
      </div>
    </div>
  )
}
