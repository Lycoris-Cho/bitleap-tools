"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react"
import { Breadcrumb } from "@/components/breadcrumb"
import FooterNote from "@/components/FooterNote"
import {
  resolveInsertion,
  resolveSnap,
  shouldShowGuides,
  thresholdForZoom,
  type Anchor,
  type AxisSnap,
  type Box,
  type GapHint,
  type Guide,
  type Slot,
} from "./snapping"

type Device = "desktop" | "tablet" | "mobile"
type StyleScope = "base" | Device
type LeftTab = "components" | "layers" | "templates"
type InspectorTab = "content" | "layout" | "style" | "advanced"
type ExportTab = "jsx" | "html" | "json"
type SaveStatus = "saved" | "saving" | "error"
type NodeType =
  | "section"
  | "container"
  | "grid"
  | "heading"
  | "text"
  | "button"
  | "input"
  | "image"
  | "badge"
  | "divider"
  | "spacer"

type BuilderNode = {
  id: string
  type: NodeType
  hidden?: boolean
  locked?: boolean
  props: {
    text?: string
    placeholder?: string
    src?: string
    alt?: string
    href?: string
  }
  style: CSSProperties
  responsive?: Partial<Record<Device, CSSProperties>>
  children?: BuilderNode[]
}

type ProjectData = {
  version: 4
  name: string
  nodes: BuilderNode[]
  updatedAt: number
}

type DragPayload =
  | { kind: "new"; nodeType: NodeType }
  | { kind: "move"; nodeId: string }

type LocationInfo = {
  parentId: string | null
  index: number
}

type ComponentMeta = {
  type: NodeType
  label: string
  icon: string
  desc: string
  group: "layout" | "content" | "form" | "media"
}

const STORAGE_KEY = "bitleap-page-builder-v4"
const LEGACY_STORAGE_KEY = "bitleap-page-builder-v3"
const HISTORY_LIMIT = 90
/** 吸附判定的屏幕像素阈值（会按缩放换算到画布坐标，保证任何缩放下手感一致） */
const SNAP_SCREEN_PX = 6

/** 自由拖拽期间的瞬时状态。放在 ref 里，不走 React 状态，避免拖动时整树重渲染 */
type FreeDragState = {
  nodeId: string
  el: HTMLElement
  scale: number
  baseLeft: number
  baseTop: number
  startX: number
  startY: number
  pendingLeft: number
  pendingTop: number
  snap: { x: AxisSnap | null; y: AxisSnap | null }
  anchors: Anchor[]
  box: Box
  originalLeft: string
  originalTop: string
  lastX: number
  lastY: number
  lastTime: number
  velocity: number
  moved: boolean
}
const NODE_TYPES: NodeType[] = [
  "section",
  "container",
  "grid",
  "heading",
  "text",
  "button",
  "input",
  "image",
  "badge",
  "divider",
  "spacer",
]

const COMPONENTS: ComponentMeta[] = [
  { type: "section", label: "页面区块", icon: "▤", desc: "大段落、首屏、内容分区", group: "layout" },
  { type: "container", label: "容器", icon: "▣", desc: "纵向布局、卡片、分组", group: "layout" },
  { type: "grid", label: "栅格", icon: "▦", desc: "多列卡片与响应式布局", group: "layout" },
  { type: "heading", label: "标题", icon: "H", desc: "Hero 标题、区块标题", group: "content" },
  { type: "text", label: "文本", icon: "T", desc: "正文、说明、介绍", group: "content" },
  { type: "button", label: "按钮", icon: "●", desc: "CTA、链接按钮", group: "content" },
  { type: "badge", label: "徽标", icon: "✦", desc: "标签、状态、卖点", group: "content" },
  { type: "input", label: "输入框", icon: "⌨", desc: "表单输入控件", group: "form" },
  { type: "image", label: "图片", icon: "◫", desc: "网络图片、Banner、封面", group: "media" },
  { type: "divider", label: "分割线", icon: "─", desc: "内容分隔与装饰线", group: "layout" },
  { type: "spacer", label: "间距", icon: "↕", desc: "精确控制留白", group: "layout" },
]

const DEFAULT_STYLES: Record<NodeType, CSSProperties> = {
  section: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: 24,
    width: "100%",
    minHeight: "520px",
    padding: "72px 40px",
    borderRadius: 28,
    background: "linear-gradient(135deg,#faf7f0 0%,#ffffff 52%,#eee6d8 100%)",
    border: "1px solid rgba(214,202,184,.72)",
    boxShadow: "0 24px 70px rgba(92,74,45,.08)",
  },
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    width: "100%",
    minHeight: 120,
    padding: 24,
    borderRadius: 22,
    background: "#ffffff",
    border: "1px solid #e7e0d5",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3,minmax(0,1fr))",
    gap: 18,
    width: "100%",
    padding: 0,
    background: "transparent",
    border: "none",
  },
  heading: {
    margin: 0,
    maxWidth: "820px",
    fontSize: 56,
    lineHeight: 1.04,
    fontWeight: 800,
    color: "#1f2937",
    letterSpacing: "-0.045em",
  },
  text: {
    margin: 0,
    maxWidth: "680px",
    fontSize: 16,
    lineHeight: 1.8,
    color: "#64748b",
  },
  button: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    width: "fit-content",
    minHeight: 44,
    padding: "12px 20px",
    borderRadius: 14,
    border: "none",
    background: "#7c3aed",
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 750,
    cursor: "pointer",
    boxShadow: "0 14px 34px rgba(124,58,237,.2)",
  },
  input: {
    width: "100%",
    maxWidth: "420px",
    minHeight: 44,
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: 14,
    outline: "none",
  },
  image: {
    display: "block",
    width: "100%",
    height: 260,
    objectFit: "cover",
    objectPosition: "center",
    borderRadius: 18,
    background: "#f1f5f9",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    width: "fit-content",
    padding: "7px 11px",
    borderRadius: 999,
    border: "1px solid rgba(124,58,237,.22)",
    background: "#f3e8ff",
    color: "#6d28d9",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
  },
  divider: {
    width: "100%",
    height: 1,
    margin: "8px 0",
    background: "#e7e0d5",
  },
  spacer: {
    width: "100%",
    height: 40,
  },
}

const SHADOW_PRESETS = [
  { label: "无", value: "" },
  { label: "轻柔", value: "0 8px 24px rgba(15,23,42,.08)" },
  { label: "卡片", value: "0 18px 45px rgba(15,23,42,.12)" },
  { label: "浮层", value: "0 28px 70px rgba(15,23,42,.18)" },
  { label: "瓷感", value: "0 24px 70px rgba(92,74,45,.08)" },
]

const GRADIENT_PRESETS = [
  { label: "白色", value: "#ffffff" },
  { label: "瓷白", value: "linear-gradient(135deg,#faf7f0 0%,#ffffff 52%,#eee6d8 100%)" },
  { label: "紫雾", value: "linear-gradient(135deg,#f5f3ff 0%,#ffffff 52%,#faf5ff 100%)" },
  { label: "深色", value: "linear-gradient(135deg,#111827 0%,#1f2937 100%)" },
  { label: "透明", value: "transparent" },
]

const DIMENSION_CHIPS = ["auto", "100%", "50%", "fit-content", "320px", "640px", "100vh"]

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `node-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function createNode(type: NodeType): BuilderNode {
  const base: BuilderNode = {
    id: uid(),
    type,
    props: {},
    style: { ...DEFAULT_STYLES[type] },
  }

  switch (type) {
    case "section":
      return { ...base, children: [] }
    case "container":
      return { ...base, children: [] }
    case "grid":
      return { ...base, children: [] }
    case "heading":
      return { ...base, props: { text: "把想法，更快变成产品" } }
    case "text":
      return { ...base, props: { text: "这里是一段正文内容。你可以在右侧属性面板中修改文字、宽高、间距、布局与响应式样式。" } }
    case "button":
      return { ...base, props: { text: "立即开始", href: "#" } }
    case "input":
      return { ...base, props: { placeholder: "请输入内容..." } }
    case "image":
      return {
        ...base,
        props: {
          src: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
          alt: "示例图片",
        },
      }
    case "badge":
      return { ...base, props: { text: "NEW RELEASE" } }
    case "divider":
    case "spacer":
      return base
  }
}

function cloneNodeDeep(node: BuilderNode): BuilderNode {
  return {
    ...node,
    id: uid(),
    props: { ...node.props },
    style: { ...node.style },
    responsive: node.responsive
      ? {
          desktop: node.responsive.desktop ? { ...node.responsive.desktop } : undefined,
          tablet: node.responsive.tablet ? { ...node.responsive.tablet } : undefined,
          mobile: node.responsive.mobile ? { ...node.responsive.mobile } : undefined,
        }
      : undefined,
    children: node.children?.map(cloneNodeDeep),
  }
}

function canHaveChildren(type: NodeType) {
  return type === "section" || type === "container" || type === "grid"
}

function getNode(nodes: BuilderNode[], id: string): BuilderNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children) {
      const found = getNode(node.children, id)
      if (found) return found
    }
  }
  return null
}

function getLocation(nodes: BuilderNode[], id: string, parentId: string | null = null): LocationInfo | null {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]
    if (node.id === id) return { parentId, index }
    if (node.children) {
      const found = getLocation(node.children, id, node.id)
      if (found) return found
    }
  }
  return null
}

function updateNode(nodes: BuilderNode[], id: string, updater: (node: BuilderNode) => BuilderNode): BuilderNode[] {
  return nodes.map((node) => {
    if (node.id === id) return updater(node)
    if (node.children) return { ...node, children: updateNode(node.children, id, updater) }
    return node
  })
}

function removeNode(nodes: BuilderNode[], id: string): { next: BuilderNode[]; removed: BuilderNode | null } {
  let removed: BuilderNode | null = null
  const next = nodes
    .filter((node) => {
      if (node.id === id) {
        removed = node
        return false
      }
      return true
    })
    .map((node) => {
      if (!node.children) return node
      const result = removeNode(node.children, id)
      if (result.removed) removed = result.removed
      return { ...node, children: result.next }
    })

  return { next, removed }
}

function insertNode(nodes: BuilderNode[], parentId: string | null, node: BuilderNode, index?: number): BuilderNode[] {
  if (parentId === null) {
    const next = [...nodes]
    if (typeof index === "number") next.splice(clamp(index, 0, next.length), 0, node)
    else next.push(node)
    return next
  }

  return nodes.map((item) => {
    if (item.id === parentId && canHaveChildren(item.type)) {
      const children = [...(item.children || [])]
      if (typeof index === "number") children.splice(clamp(index, 0, children.length), 0, node)
      else children.push(node)
      return { ...item, children }
    }
    if (item.children) return { ...item, children: insertNode(item.children, parentId, node, index) }
    return item
  })
}

function hasDescendant(node: BuilderNode, id: string): boolean {
  if (!node.children) return false
  return node.children.some((child) => child.id === id || hasDescendant(child, id))
}

function countNodes(nodes: BuilderNode[]): number {
  return nodes.reduce((total, node) => total + 1 + countNodes(node.children || []), 0)
}

function validateNodes(value: unknown, depth = 0): value is BuilderNode[] {
  if (!Array.isArray(value) || depth > 20) return false
  return value.every((item) => {
    if (!item || typeof item !== "object") return false
    const node = item as Partial<BuilderNode>
    if (typeof node.id !== "string" || !NODE_TYPES.includes(node.type as NodeType)) return false
    if (!node.props || typeof node.props !== "object" || Array.isArray(node.props)) return false
    if (!node.style || typeof node.style !== "object" || Array.isArray(node.style)) return false
    if (node.responsive && (typeof node.responsive !== "object" || Array.isArray(node.responsive))) return false
    if (node.children !== undefined && !validateNodes(node.children, depth + 1)) return false
    return true
  })
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable
}

function styleValue(value: unknown) {
  if (typeof value === "number") return String(value)
  return typeof value === "string" ? value : ""
}

function normalizeStyleValue(value: string | number | undefined) {
  if (value === "" || value === undefined) return undefined
  return value
}

function setStyleProperty(style: CSSProperties, key: keyof CSSProperties, value: string | number | undefined) {
  const next = { ...style }
  ;(next as Record<string, unknown>)[key as string] = normalizeStyleValue(value)
  return next
}

function mergeStyleForDevice(node: BuilderNode, device: Device): CSSProperties {
  return {
    ...node.style,
    ...(node.responsive?.desktop || {}),
    ...(device === "tablet" || device === "mobile" ? node.responsive?.tablet || {} : {}),
    ...(device === "mobile" ? node.responsive?.mobile || {} : {}),
  }
}

function scopedStyleValue(node: BuilderNode | null, scope: StyleScope, key: keyof CSSProperties) {
  if (!node) return ""
  if (scope === "base") return styleValue(node.style[key])
  return styleValue(node.responsive?.[scope]?.[key] ?? node.style[key])
}

function escapeJsxText(text: string) {
  return text.replace(/[{}]/g, (match) => (match === "{" ? "&#123;" : "&#125;"))
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function cssKey(key: string) {
  return key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)
}

function cssStyle(style: CSSProperties) {
  return Object.entries(style)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${cssKey(key)}:${value}`)
    .join(";")
}

function cssClass(node: BuilderNode) {
  return `pb-${node.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`
}

function collectCss(nodes: BuilderNode[]): string {
  const base: string[] = []
  const desktop: string[] = []
  const tablet: string[] = []
  const mobile: string[] = []

  const walk = (items: BuilderNode[]) => {
    items.forEach((node) => {
      if (node.hidden) return
      const className = cssClass(node)
      const baseStyle = cssStyle(node.style)
      if (baseStyle) base.push(`.${className}{${baseStyle}}`)
      const desktopStyle = cssStyle(node.responsive?.desktop || {})
      const tabletStyle = cssStyle(node.responsive?.tablet || {})
      const mobileStyle = cssStyle(node.responsive?.mobile || {})
      if (desktopStyle) desktop.push(`.${className}{${desktopStyle}}`)
      if (tabletStyle) tablet.push(`.${className}{${tabletStyle}}`)
      if (mobileStyle) mobile.push(`.${className}{${mobileStyle}}`)
      if (node.children) walk(node.children)
    })
  }

  walk(nodes)

  const parts = [...base]
  if (desktop.length) parts.push(`@media (min-width: 901px){${desktop.join("")}}`)
  if (tablet.length) parts.push(`@media (max-width: 900px){${tablet.join("")}}`)
  if (mobile.length) parts.push(`@media (max-width: 640px){${mobile.join("")}}`)
  return parts.join("\n")
}

function exportNode(node: BuilderNode, level = 2): string {
  if (node.hidden) return ""
  const pad = "  ".repeat(level)
  const classAttr = ` className="${cssClass(node)}"`

  switch (node.type) {
    case "section":
    case "container":
    case "grid": {
      const children = (node.children || []).map((child) => exportNode(child, level + 1)).filter(Boolean).join("\n")
      return children ? `${pad}<div${classAttr}>\n${children}\n${pad}</div>` : `${pad}<div${classAttr} />`
    }
    case "heading":
      return `${pad}<h2${classAttr}>${escapeJsxText(node.props.text || "")}</h2>`
    case "text":
      return `${pad}<p${classAttr}>${escapeJsxText(node.props.text || "")}</p>`
    case "button":
      return `${pad}<a href=${JSON.stringify(node.props.href || "#")} style={{ textDecoration: "none" }}>\n${pad}  <button${classAttr}>${escapeJsxText(node.props.text || "")}</button>\n${pad}</a>`
    case "input":
      return `${pad}<input${classAttr} placeholder=${JSON.stringify(node.props.placeholder || "")} />`
    case "image":
      return `${pad}<img${classAttr} src=${JSON.stringify(node.props.src || "")} alt=${JSON.stringify(node.props.alt || "")} />`
    case "badge":
      return `${pad}<span${classAttr}>${escapeJsxText(node.props.text || "")}</span>`
    case "divider":
    case "spacer":
      return `${pad}<div${classAttr} aria-hidden="true" />`
  }
}

function exportHtmlNode(node: BuilderNode, level = 3): string {
  if (node.hidden) return ""
  const pad = "  ".repeat(level)
  const classAttr = ` class="${cssClass(node)}"`

  switch (node.type) {
    case "section":
    case "container":
    case "grid": {
      const children = (node.children || []).map((child) => exportHtmlNode(child, level + 1)).filter(Boolean).join("\n")
      return `${pad}<div${classAttr}>${children ? `\n${children}\n${pad}` : ""}</div>`
    }
    case "heading":
      return `${pad}<h2${classAttr}>${escapeHtml(node.props.text || "")}</h2>`
    case "text":
      return `${pad}<p${classAttr}>${escapeHtml(node.props.text || "")}</p>`
    case "button":
      return `${pad}<a href="${escapeHtml(node.props.href || "#")}" style="text-decoration:none"><button${classAttr}>${escapeHtml(node.props.text || "")}</button></a>`
    case "input":
      return `${pad}<input${classAttr} placeholder="${escapeHtml(node.props.placeholder || "")}">`
    case "image":
      return `${pad}<img${classAttr} src="${escapeHtml(node.props.src || "")}" alt="${escapeHtml(node.props.alt || "")}">`
    case "badge":
      return `${pad}<span${classAttr}>${escapeHtml(node.props.text || "")}</span>`
    case "divider":
    case "spacer":
      return `${pad}<div${classAttr} aria-hidden="true"></div>`
  }
}

function generatePageCode(nodes: BuilderNode[]) {
  const css = collectCss(nodes)
  const body = nodes.map((node) => exportNode(node, 3)).filter(Boolean).join("\n")
  return `'use client'

export default function GeneratedPage() {
  return (
    <main className="generated-page">
      <style>{\`
.generated-page{min-height:100vh;padding:48px 24px;background:#f8fafc}
.generated-page-shell{width:100%;max-width:1180px;margin:0 auto;display:flex;flex-direction:column;gap:20px}
${css}
      \`}</style>
      <div className="generated-page-shell">
${body || "        {/* 拖拽组件到画布后，这里会生成 JSX */}"}
      </div>
    </main>
  )
}
`
}

function generateHtml(nodes: BuilderNode[]) {
  const css = collectCss(nodes)
  const body = nodes.map((node) => exportHtmlNode(node, 4)).filter(Boolean).join("\n")
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Generated Page</title>
    <style>
      body{margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a}
      main{min-height:100vh;padding:48px 24px}
      .generated-page-shell{width:100%;max-width:1180px;margin:0 auto;display:flex;flex-direction:column;gap:20px}
${css}
    </style>
  </head>
  <body>
    <main>
      <div class="generated-page-shell">
${body || "        <!-- 拖拽组件到画布后，这里会生成 HTML -->"}
      </div>
    </main>
  </body>
</html>
`
}

function sanitizeFileName(value: string) {
  const safe = value.trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-")
  return safe || "bitleap-page"
}

function downloadTextFile(fileName: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function makeHeroTemplate(): BuilderNode[] {
  const section = createNode("section")
  const badge = createNode("badge")
  const heading = createNode("heading")
  const text = createNode("text")
  const button = createNode("button")
  const row = createNode("container")

  section.style = {
    ...section.style,
    minHeight: "620px",
    alignItems: "center",
    textAlign: "center",
    padding: "92px 44px",
  }
  section.responsive = {
    mobile: {
      minHeight: "560px",
      padding: "64px 22px",
      borderRadius: 22,
    },
  }
  badge.props.text = "PRODUCT BUILDER"
  badge.style = { ...badge.style, alignSelf: "center" }
  heading.props.text = "把想法，更快变成产品页面"
  heading.style = { ...heading.style, textAlign: "center", fontSize: 68 }
  heading.responsive = { mobile: { fontSize: 42, lineHeight: 1.05 } }
  text.props.text = "一个用于快速搭建、预览和导出前端页面的可视化编辑器。现在支持更完整的尺寸、布局、响应式与高级样式控制。"
  text.style = { ...text.style, textAlign: "center", fontSize: 18 }
  text.responsive = { mobile: { fontSize: 15 } }
  row.style = {
    display: "flex",
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    background: "transparent",
    border: "none",
    minHeight: "auto",
  }
  row.responsive = { mobile: { flexDirection: "column", width: "100%" } }
  button.props.text = "免费开始构建"
  button.style = { ...button.style, alignSelf: "center", padding: "14px 24px" }

  row.children = [button]
  section.children = [badge, heading, text, row]
  return [section]
}

function makeFeatureTemplate(): BuilderNode[] {
  const section = createNode("section")
  const heading = createNode("heading")
  const text = createNode("text")
  const grid = createNode("grid")
  const labels = [
    ["灵活尺寸", "宽高、最小最大值、单位、响应式覆写都可以细调。"],
    ["真实预览", "同一套数据可以切换桌面、平板和手机画布。"],
    ["干净导出", "导出 JSX、HTML 或 JSON，隐藏图层不会出现在成品里。"],
  ]

  section.style = { ...section.style, alignItems: "center", textAlign: "center", minHeight: "auto" }
  heading.props.text = "更接近产品级的编辑体验"
  heading.style = { ...heading.style, textAlign: "center", fontSize: 44 }
  text.props.text = "不只是拖拽几个组件，而是让每个组件都能被精确调整。"
  text.style = { ...text.style, textAlign: "center" }
  grid.responsive = {
    tablet: { gridTemplateColumns: "repeat(2,minmax(0,1fr))" },
    mobile: { gridTemplateColumns: "1fr" },
  }

  grid.children = labels.map(([title, copy]) => {
    const card = createNode("container")
    const cardTitle = createNode("heading")
    const cardText = createNode("text")
    card.style = {
      ...card.style,
      minHeight: 190,
      padding: 24,
      borderRadius: 24,
      boxShadow: "0 14px 38px rgba(15,23,42,.06)",
    }
    cardTitle.props.text = title
    cardTitle.style = { ...cardTitle.style, fontSize: 24, letterSpacing: "-0.02em" }
    cardText.props.text = copy
    cardText.style = { ...cardText.style, fontSize: 14 }
    card.children = [cardTitle, cardText]
    return card
  })

  section.children = [heading, text, grid]
  return [section]
}

function makeLoginTemplate(): BuilderNode[] {
  const shell = createNode("container")
  const heading = createNode("heading")
  const text = createNode("text")
  const email = createNode("input")
  const password = createNode("input")
  const button = createNode("button")

  shell.style = {
    ...shell.style,
    maxWidth: "460px",
    margin: "48px auto",
    padding: 32,
    gap: 18,
    boxShadow: "0 24px 60px rgba(15,23,42,.10)",
  }
  heading.props.text = "欢迎回来"
  heading.style = { ...heading.style, fontSize: 30 }
  text.props.text = "登录你的账户以继续。"
  text.style = { ...text.style, fontSize: 14 }
  email.props.placeholder = "邮箱地址"
  password.props.placeholder = "密码"
  button.props.text = "登录"
  button.style = { ...button.style, width: "100%", alignSelf: "stretch" }
  shell.children = [heading, text, email, password, button]
  return [shell]
}

const TEMPLATES = [
  { id: "hero", name: "Hero 落地页", desc: "产品首页与营销页首屏", make: makeHeroTemplate },
  { id: "features", name: "功能三栏", desc: "Feature Cards 与响应式栅格", make: makeFeatureTemplate },
  { id: "login", name: "登录卡片", desc: "后台与 SaaS 登录入口", make: makeLoginTemplate },
]

function FieldLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 px-0.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">{children}</span>
      {action}
    </div>
  )
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  multiline?: boolean
}) {
  const className = "w-full rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-xs font-medium text-slate-800 shadow-sm shadow-slate-950/[0.02] outline-none transition placeholder:font-normal placeholder:text-slate-300 hover:border-slate-300 focus:border-violet-400 focus:ring-4 focus:ring-violet-100/80"

  return (
    <label className="space-y-1.5">
      <FieldLabel>{label}</FieldLabel>
      {multiline ? (
        <textarea value={value} placeholder={placeholder} rows={4} onChange={(event) => onChange(event.target.value)} className={`${className} resize-none leading-5`} />
      ) : (
        <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className={className} />
      )}
    </label>
  )
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string
  value: number | undefined
  onChange: (value: number | undefined) => void
  min?: number
  max?: number
  step?: number
}) {
  return (
    <label className="space-y-1.5">
      <FieldLabel>{label}</FieldLabel>
      <input
        type="number"
        value={value ?? ""}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(event.target.value === "" ? undefined : Number(event.target.value))}
        className="w-full rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-xs font-medium text-slate-800 shadow-sm shadow-slate-950/[0.02] outline-none transition hover:border-slate-300 focus:border-violet-400 focus:ring-4 focus:ring-violet-100/80"
      />
    </label>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label className="space-y-1.5">
      <FieldLabel>{label}</FieldLabel>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-xs font-medium text-slate-800 shadow-sm shadow-slate-950/[0.02] outline-none transition hover:border-slate-300 focus:border-violet-400 focus:ring-4 focus:ring-violet-100/80">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}

function ColorField({
  label,
  value,
  onChange,
  fallback = "#0f172a",
}: {
  label: string
  value: string
  onChange: (value: string) => void
  fallback?: string
}) {
  const colorValue = value.startsWith("#") && (value.length === 4 || value.length === 7) ? value : fallback

  return (
    <label className="space-y-1.5">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-2 shadow-sm shadow-slate-950/[0.02] transition hover:border-slate-300 focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-100/80">
        <input type="color" value={colorValue} onChange={(event) => onChange(event.target.value)} className="h-7 w-9 cursor-pointer rounded-lg border-0 bg-transparent p-0" />
        <input value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent text-xs text-slate-900 outline-none" />
      </div>
    </label>
  )
}

function DimensionField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <div className="space-y-1.5">
      <FieldLabel>{label}</FieldLabel>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-xs font-medium text-slate-800 shadow-sm shadow-slate-950/[0.02] outline-none transition placeholder:font-normal placeholder:text-slate-300 hover:border-slate-300 focus:border-violet-400 focus:ring-4 focus:ring-violet-100/80"
      />
      <div className="flex flex-wrap gap-1.5">
        {DIMENSION_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => onChange(chip)}
            className="rounded-lg border border-transparent bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-500 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  )
}

function PatchButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-left text-[11px] font-semibold text-slate-600 shadow-sm shadow-slate-950/[0.02] transition hover:-translate-y-px hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 hover:shadow-md"
    >
      {children}
    </button>
  )
}

function LayerTree({
  nodes,
  selectedId,
  onSelect,
  onToggleHidden,
  onToggleLocked,
  depth = 0,
}: {
  nodes: BuilderNode[]
  selectedId: string | null
  onSelect: (id: string) => void
  onToggleHidden: (id: string, hidden: boolean) => void
  onToggleLocked: (id: string, locked: boolean) => void
  depth?: number
}) {
  return (
    <div className="space-y-1">
      {nodes.map((node) => {
        const meta = COMPONENTS.find((item) => item.type === node.type)
        return (
          <div key={node.id}>
            <div
              style={{ paddingLeft: 6 + depth * 13 }}
              className={`group flex items-center gap-1 rounded-xl py-1.5 pr-1 transition ${
                selectedId === node.id
                  ? "bg-violet-100 text-violet-900"
                  : node.hidden
                    ? "text-slate-300"
                    : "text-slate-600 hover:bg-stone-100"
              }`}
            >
              <button type="button" onClick={() => onSelect(node.id)} className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1 text-left text-xs">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/80 text-[9px] font-black shadow-sm">{meta?.icon}</span>
                <span className={`truncate ${node.hidden ? "line-through opacity-60" : ""}`}>
                  {node.props.text || node.props.placeholder || meta?.label}
                </span>
                {node.locked && <span className="text-[9px] text-slate-400">锁</span>}
                {node.children && <span className="ml-auto rounded-full bg-white/80 px-1.5 py-0.5 text-[9px] text-slate-400">{node.children.length}</span>}
              </button>
              <button type="button" title={node.hidden ? "显示" : "隐藏"} onClick={() => onToggleHidden(node.id, !node.hidden)} className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] text-slate-400 transition hover:bg-white hover:text-violet-700 group-hover:flex">
                {node.hidden ? "○" : "◉"}
              </button>
              <button type="button" title={node.locked ? "解锁" : "锁定"} onClick={() => onToggleLocked(node.id, !node.locked)} className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] text-slate-400 transition hover:bg-white hover:text-violet-700 group-hover:flex">
                {node.locked ? "◆" : "◇"}
              </button>
            </div>
            {node.children && node.children.length > 0 && (
              <LayerTree
                nodes={node.children}
                selectedId={selectedId}
                onSelect={onSelect}
                onToggleHidden={onToggleHidden}
                onToggleLocked={onToggleLocked}
                depth={depth + 1}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function PageBuilderPro() {
  const [nodes, setNodes] = useState<BuilderNode[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [projectName, setProjectName] = useState("未命名页面")
  const [device, setDevice] = useState<Device>("desktop")
  const [styleScope, setStyleScope] = useState<StyleScope>("base")
  const [leftTab, setLeftTab] = useState<LeftTab>("components")
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("content")
  const [exportTab, setExportTab] = useState<ExportTab>("jsx")
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [showCode, setShowCode] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [componentQuery, setComponentQuery] = useState("")
  const [zoom, setZoom] = useState(100)
  const [notice, setNotice] = useState("")
  const [copied, setCopied] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved")
  const [hydrated, setHydrated] = useState(false)

  const undoRef = useRef<BuilderNode[][]>([])
  const redoRef = useRef<BuilderNode[][]>([])
  const clipboardRef = useRef<BuilderNode | null>(null)
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flash = useCallback((message: string) => {
    setNotice(message)
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    noticeTimerRef.current = setTimeout(() => setNotice(""), 1800)
  }, [])

  const commitNodes = useCallback((recipe: BuilderNode[] | ((prev: BuilderNode[]) => BuilderNode[])) => {
    setNodes((prev) => {
      const next = typeof recipe === "function" ? recipe(prev) : recipe
      if (next === prev) return prev
      undoRef.current = [...undoRef.current.slice(-(HISTORY_LIMIT - 1)), prev]
      redoRef.current = []
      return next
    })
  }, [])

  /* ==================== 画布自由拖拽 + 磁吸对齐 ====================
     这段刻意不走 React 状态：拖动过程中每次指针移动都重渲染整棵节点树会卡，
     所以拖动时只改 DOM（被拖元素的 left/top、叠加层里的参考线），
     松手时才提交一次状态 —— 撤销栈里因此也只有一条记录。 */
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const nodeElsRef = useRef(new Map<string, HTMLElement>())
  const slotElsRef = useRef(new Map<string, HTMLElement>())
  const guideRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<FreeDragState | null>(null)
  const commitRef = useRef(commitNodes)

  useEffect(() => {
    commitRef.current = commitNodes
  }, [commitNodes])

  /** 元素的内边距盒。绝对定位子元素的包含块原点就是它，所以吸附锚点也该用它 */
  const paddingBoxOf = useCallback((el: HTMLElement, canvasRect: DOMRect, scale: number): Box => {
    const rect = el.getBoundingClientRect()
    const style = getComputedStyle(el)
    const bl = parseFloat(style.borderLeftWidth) || 0
    const bt = parseFloat(style.borderTopWidth) || 0
    const br = parseFloat(style.borderRightWidth) || 0
    const bb = parseFloat(style.borderBottomWidth) || 0
    return {
      left: (rect.left + bl - canvasRect.left) / scale,
      top: (rect.top + bt - canvasRect.top) / scale,
      width: (rect.width - bl - br) / scale,
      height: (rect.height - bt - bb) / scale,
    }
  }, [])

  const boxOf = useCallback((el: HTMLElement, canvasRect: DOMRect, scale: number): Box => {
    const rect = el.getBoundingClientRect()
    return {
      left: (rect.left - canvasRect.left) / scale,
      top: (rect.top - canvasRect.top) / scale,
      width: rect.width / scale,
      height: rect.height / scale,
    }
  }, [])

  const isFreePositioned = useCallback((node: BuilderNode) => {
    const position = String(node.style.position ?? "static")
    return position === "absolute" || position === "fixed"
  }, [])

  /** 取节点当前的 left/top：有 px 值就用它，否则用实测偏移（绝对定位常见的 auto 情况） */
  const resolvedOffsets = useCallback(
    (node: BuilderNode): { left: number; top: number } | null => {
      const canvas = canvasRef.current
      const el = nodeElsRef.current.get(node.id)
      if (!canvas || !el) return null
      const canvasRect = canvas.getBoundingClientRect()
      const scale = Math.max(0.05, zoom / 100)
      const location = getLocation(nodes, node.id)
      const parentEl = location?.parentId ? nodeElsRef.current.get(location.parentId) : canvas
      const parentBox = parentEl ? paddingBoxOf(parentEl, canvasRect, scale) : { left: 0, top: 0, width: 0, height: 0 }
      const box = boxOf(el, canvasRect, scale)
      const parsePx = (value: unknown) => {
        const text = String(value ?? "")
        return text.endsWith("px") ? Number.parseFloat(text) : NaN
      }
      const styleLeft = parsePx(node.style.left)
      const styleTop = parsePx(node.style.top)
      return {
        left: Number.isFinite(styleLeft) ? styleLeft : box.left - parentBox.left,
        top: Number.isFinite(styleTop) ? styleTop : box.top - parentBox.top,
      }
    },
    [boxOf, nodes, paddingBoxOf, zoom],
  )

  /**
   * 采集吸附锚点：画布框、父容器内边距盒、以及同级兄弟的包围盒。
   * 排除自己和自己的后代 —— 拖自己时不该被自己吸住。
   */
  const collectAnchors = useCallback(
    (nodeId: string): { anchors: Anchor[]; box: Box } | null => {
      const canvas = canvasRef.current
      const el = nodeElsRef.current.get(nodeId)
      if (!canvas || !el) return null
      const canvasRect = canvas.getBoundingClientRect()
      const scale = Math.max(0.05, zoom / 100)
      const box = boxOf(el, canvasRect, scale)
      const location = getLocation(nodes, nodeId)
      const moving = getNode(nodes, nodeId)

      const anchors: Anchor[] = [
        { box: { left: 0, top: 0, width: canvas.clientWidth, height: canvas.clientHeight }, kind: "canvas" },
      ]

      const parentEl = location?.parentId ? nodeElsRef.current.get(location.parentId) : canvas
      if (parentEl) anchors.push({ box: paddingBoxOf(parentEl, canvasRect, scale), kind: "parent" })

      const siblings = location?.parentId ? (getNode(nodes, location.parentId)?.children ?? []) : nodes
      for (const sibling of siblings) {
        if (sibling.id === nodeId) continue
        if (moving && hasDescendant(moving, sibling.id)) continue
        const siblingEl = nodeElsRef.current.get(sibling.id)
        if (!siblingEl) continue
        anchors.push({ box: boxOf(siblingEl, canvasRect, scale), kind: "sibling", id: sibling.id })
      }

      return { anchors, box }
    },
    [boxOf, nodes, paddingBoxOf, zoom],
  )

  /** 刷新叠加层里的参考线、间距标签与插入指示线 */
  const paintGuides = useCallback((guides: Guide[], gap: GapHint | null, scale: number) => {
    const layer = guideRef.current
    if (!layer) return
    const thin = Math.max(1 / scale, 0.5)

    for (let index = 0; index < 3; index += 1) {
      const vertical = layer.querySelector<HTMLElement>(`[data-guide-x="${index}"]`)
      if (vertical) {
        const guide = guides.filter((item) => item.axis === "x")[index]
        if (!guide) vertical.style.display = "none"
        else {
          vertical.style.display = "block"
          vertical.style.left = `${guide.position}px`
          vertical.style.top = `${guide.from}px`
          vertical.style.width = `${thin}px`
          vertical.style.height = `${Math.max(guide.to - guide.from, 1)}px`
        }
      }
      const horizontal = layer.querySelector<HTMLElement>(`[data-guide-y="${index}"]`)
      if (horizontal) {
        const guide = guides.filter((item) => item.axis === "y")[index]
        if (!guide) horizontal.style.display = "none"
        else {
          horizontal.style.display = "block"
          horizontal.style.top = `${guide.position}px`
          horizontal.style.left = `${guide.from}px`
          horizontal.style.height = `${thin}px`
          horizontal.style.width = `${Math.max(guide.to - guide.from, 1)}px`
        }
      }
    }

    const badge = layer.querySelector<HTMLElement>("[data-guide-gap]")
    if (badge) {
      if (!gap || gap.value < 1 || gap.value > 600) badge.style.display = "none"
      else {
        badge.style.display = "block"
        badge.textContent = `${Math.round(gap.value)}px`
        badge.style.fontSize = `${11 / scale}px`
        badge.style.padding = `${2 / scale}px ${6 / scale}px`
        badge.style.borderRadius = `${5 / scale}px`
        const centerX = gap.axis === "x" ? (gap.from + gap.to) / 2 : gap.cross
        const centerY = gap.axis === "x" ? gap.cross : (gap.from + gap.to) / 2
        badge.style.left = `${centerX}px`
        badge.style.top = `${centerY}px`
      }
    }
  }, [])

  type InsertTarget = {
    containerId: string | null
    index: number
    axis: "x" | "y"
    line: number
    crossFrom: number
    crossTo: number
  }

  /**
   * 结构式拖拽的落点：按指针在容器主轴上的位置吸到最近的插入缝隙。
   *
   * 原来的做法是在每两个子节点之间铺一条 8px 高的拖放条，必须精准命中那 8px 才生效；
   * 现在指针落在容器里任何位置都能算出落点 —— 命中的是「离指针最近的缝隙」，
   * 而不是「你有没有对准那条细线」。落点同时用来画指示线。
   */
  const resolveDropSlot = useCallback(
    (containerId: string | null, clientX: number, clientY: number): InsertTarget | null => {
      const canvas = canvasRef.current
      if (!canvas) return null
      const containerEl = containerId ? nodeElsRef.current.get(containerId) : canvas
      if (!containerEl) return null

      const canvasRect = canvas.getBoundingClientRect()
      const scale = Math.max(0.05, zoom / 100)
      const toLocal = (value: number, origin: number) => (value - origin) / scale

      const containerBox = boxOf(containerEl, canvasRect, scale)
      const style = getComputedStyle(containerEl)
      const borderTop = parseFloat(style.borderTopWidth) || 0
      const borderLeft = parseFloat(style.borderLeftWidth) || 0
      const padTop = parseFloat(style.paddingTop) || 0
      const padBottom = parseFloat(style.paddingBottom) || 0
      const padLeft = parseFloat(style.paddingLeft) || 0
      const padRight = parseFloat(style.paddingRight) || 0

      // flex 横向容器按 x 判定；grid 与 block 都是按 DOM 顺序铺开，用 y
      const isRow = style.display.includes("flex") && style.flexDirection.startsWith("row")
      const axis: "x" | "y" = isRow ? "x" : "y"

      const children = containerId ? (getNode(nodes, containerId)?.children ?? []) : nodes
      const slots: Slot[] = []
      for (const child of children) {
        const slotEl = slotElsRef.current.get(child.id)
        if (!slotEl) continue
        const rect = slotEl.getBoundingClientRect()
        slots.push(
          axis === "x"
            ? { start: toLocal(rect.left, canvasRect.left), end: toLocal(rect.right, canvasRect.left) }
            : { start: toLocal(rect.top, canvasRect.top), end: toLocal(rect.bottom, canvasRect.top) },
        )
      }

      const bounds: Slot =
        axis === "x"
          ? { start: containerBox.left + borderLeft + padLeft, end: containerBox.left + containerBox.width - borderLeft - padRight }
          : { start: containerBox.top + borderTop + padTop, end: containerBox.top + containerBox.height - borderTop - padBottom }

      const pointer = axis === "x" ? toLocal(clientX, canvasRect.left) : toLocal(clientY, canvasRect.top)
      const resolved = resolveInsertion(pointer, slots, bounds)
      // 容器有子节点却一个槽位都没量到（理论上不该发生）：退化成追加到末尾，
      // 至少不会把所有东西都插到第一个位置去
      const index = children.length > 0 && slots.length === 0 ? children.length : resolved.index

      return {
        containerId,
        index,
        axis,
        line: resolved.line,
        crossFrom: axis === "x" ? containerBox.top + padTop : containerBox.left + padLeft,
        crossTo: axis === "x"
          ? containerBox.top + containerBox.height - padBottom
          : containerBox.left + containerBox.width - padRight,
      }
    },
    [boxOf, nodes, zoom],
  )

  const paintInsertion = useCallback((target: InsertTarget | null, scale: number) => {
    const layer = guideRef.current
    if (!layer) return
    const line = layer.querySelector<HTMLElement>("[data-guide-insert]")
    const label = layer.querySelector<HTMLElement>("[data-guide-insert-label]")
    if (!line || !label) return

    if (!target) {
      line.style.display = "none"
      label.style.display = "none"
      return
    }

    const thick = Math.max(3 / scale, 1.5)
    line.style.display = "block"
    if (target.axis === "x") {
      line.style.left = `${target.line - thick / 2}px`
      line.style.top = `${target.crossFrom}px`
      line.style.width = `${thick}px`
      line.style.height = `${Math.max(target.crossTo - target.crossFrom, 1)}px`
    } else {
      line.style.left = `${target.crossFrom}px`
      line.style.top = `${target.line - thick / 2}px`
      line.style.width = `${Math.max(target.crossTo - target.crossFrom, 1)}px`
      line.style.height = `${thick}px`
    }

    label.style.display = "block"
    label.textContent = `插入到第 ${target.index + 1} 位`
    label.style.fontSize = `${11 / scale}px`
    label.style.padding = `${2 / scale}px ${6 / scale}px`
    label.style.borderRadius = `${5 / scale}px`
    if (target.axis === "x") {
      label.style.left = `${target.line}px`
      label.style.top = `${Math.max(target.crossFrom - 20 / scale, 0)}px`
    } else {
      label.style.left = `${target.crossTo + 6 / scale}px`
      label.style.top = `${target.line}px`
    }
  }, [])

  // 指针当前所在的插入落点。放在 ref 里，dragover 期间不触发重渲染
  const dropTargetRef = useRef<InsertTarget | null>(null)
  const handleDropRef = useRef<((event: DragEvent, parentId: string | null, index?: number) => void) | null>(null)

  const handleContainerDragOver = useCallback(
    (event: DragEvent, containerId: string | null) => {
      event.preventDefault()
      event.stopPropagation()
      const target = resolveDropSlot(containerId, event.clientX, event.clientY)
      dropTargetRef.current = target
      paintInsertion(target, Math.max(0.05, zoom / 100))
      setDragOverId(containerId ?? "root")
    },
    [paintInsertion, resolveDropSlot, zoom],
  )

  const handleContainerDrop = useCallback(
    (event: DragEvent, containerId: string | null) => {
      event.preventDefault()
      event.stopPropagation()
      const target = resolveDropSlot(containerId, event.clientX, event.clientY) ?? dropTargetRef.current
      dropTargetRef.current = null
      paintInsertion(null, 1)
      // 落点按几何算出来，而不是看指针命中了哪条拖放条。
      // handleDrop 在下面才声明，这里通过 ref 取最新那份，避免渲染期就引用它。
      handleDropRef.current?.(event, containerId, target ? target.index : undefined)
    },
    [paintInsertion, resolveDropSlot],
  )

  const beginFreeDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, node: BuilderNode) => {
      if (node.locked || node.hidden || event.button !== 0) return
      if (!isFreePositioned(node)) return

      const canvas = canvasRef.current
      const el = nodeElsRef.current.get(node.id)
      const collected = collectAnchors(node.id)
      const offsets = resolvedOffsets(node)
      if (!canvas || !el || !collected || !offsets) return

      // 阻止原生 HTML5 拖拽接管这次指针
      event.preventDefault()
      event.stopPropagation()

      dragRef.current = {
        nodeId: node.id,
        el,
        scale: Math.max(0.05, zoom / 100),
        baseLeft: offsets.left,
        baseTop: offsets.top,
        startX: event.clientX,
        startY: event.clientY,
        pendingLeft: offsets.left,
        pendingTop: offsets.top,
        snap: { x: null, y: null },
        anchors: collected.anchors,
        box: collected.box,
        originalLeft: el.style.left,
        originalTop: el.style.top,
        lastX: event.clientX,
        lastY: event.clientY,
        lastTime: performance.now(),
        velocity: 0,
        moved: false,
      }

      el.style.cursor = "grabbing"
      if (guideRef.current) guideRef.current.style.display = "block"
      setSelectedId(node.id)
    },
    [collectAnchors, isFreePositioned, resolvedOffsets, zoom],
  )

  useEffect(() => {
    const finish = (commit: boolean) => {
      const drag = dragRef.current
      if (!drag) return
      dragRef.current = null
      drag.el.style.cursor = ""
      if (guideRef.current) guideRef.current.style.display = "none"

      if (!commit) {
        drag.el.style.left = drag.originalLeft
        drag.el.style.top = drag.originalTop
        return
      }

      if (!drag.moved) return

      const left = drag.pendingLeft
      const top = drag.pendingTop
      // 提交的是吸附之后的值：提交原始值会把吸附结果覆盖掉
      commitRef.current((prev) =>
        updateNode(prev, drag.nodeId, (node) => ({
          ...node,
          style: { ...node.style, left: `${Math.round(left * 100) / 100}px`, top: `${Math.round(top * 100) / 100}px` },
        })),
      )
      const snapped = Boolean(drag.snap.x || drag.snap.y)
      flash(snapped ? "位置已更新 · 已吸附到对齐线" : "位置已更新")
    }

    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return

      const rawDx = (event.clientX - drag.startX) / drag.scale
      const rawDy = (event.clientY - drag.startY) / drag.scale
      if (Math.abs(rawDx) > 0.5 || Math.abs(rawDy) > 0.5) drag.moved = true

      // 速度用指数平滑，用它决定参考线要不要收起来：拖得快时线会很晃眼
      const now = performance.now()
      const elapsed = Math.max(1, now - drag.lastTime)
      const moved = Math.hypot(event.clientX - drag.lastX, event.clientY - drag.lastY)
      drag.velocity = drag.velocity * 0.72 + (moved / elapsed) * 0.28
      drag.lastX = event.clientX
      drag.lastY = event.clientY
      drag.lastTime = now

      const proposed: Box = { ...drag.box, left: drag.box.left + rawDx, top: drag.box.top + rawDy }
      const outcome = resolveSnap({
        target: proposed,
        anchors: drag.anchors,
        // 按住 Alt 时临时关掉吸附，方便精细摆放
        threshold: event.altKey ? 0 : thresholdForZoom(SNAP_SCREEN_PX, drag.scale),
        previous: drag.snap,
      })
      drag.snap = outcome.state
      drag.pendingLeft = drag.baseLeft + rawDx + outcome.dx
      drag.pendingTop = drag.baseTop + rawDy + outcome.dy

      drag.el.style.left = `${drag.pendingLeft}px`
      drag.el.style.top = `${drag.pendingTop}px`

      const show = shouldShowGuides(drag.velocity)
      paintGuides(show ? outcome.guides : [], show ? outcome.gap : null, drag.scale)
    }

    const onUp = () => finish(true)
    const onCancel = () => finish(false)
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !dragRef.current) return
      event.preventDefault()
      finish(false)
      flash("已取消拖动")
    }

    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onCancel)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onCancel)
      window.removeEventListener("keydown", onKey)
    }
  }, [flash, paintGuides])

  /** 把普通节点转成绝对定位，left/top 取它现在所在的位置，转换后就能直接拖动吸附 */
  const makeFreePositioned = useCallback(
    (node: BuilderNode) => {
      const offsets = resolvedOffsets(node)
      if (!offsets) return
      commitNodes((prev) =>
        updateNode(prev, node.id, (item) => ({
          ...item,
          style: {
            ...item.style,
            position: "absolute",
            left: `${Math.round(offsets.left * 100) / 100}px`,
            top: `${Math.round(offsets.top * 100) / 100}px`,
          },
        })),
      )
      flash("已转为自由定位，现在可以直接拖动并自动吸附")
    },
    [commitNodes, flash, resolvedOffsets],
  )

  const undo = useCallback(() => {
    const previous = undoRef.current.at(-1)
    if (!previous) return
    setNodes((current) => {
      redoRef.current = [...redoRef.current.slice(-(HISTORY_LIMIT - 1)), current]
      undoRef.current = undoRef.current.slice(0, -1)
      return previous
    })
    setSelectedId(null)
    flash("已撤销")
  }, [flash])

  const redo = useCallback(() => {
    const next = redoRef.current.at(-1)
    if (!next) return
    setNodes((current) => {
      undoRef.current = [...undoRef.current.slice(-(HISTORY_LIMIT - 1)), current]
      redoRef.current = redoRef.current.slice(0, -1)
      return next
    })
    setSelectedId(null)
    flash("已重做")
  }, [flash])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ProjectData>
        if (validateNodes(parsed.nodes)) {
          setNodes(parsed.nodes)
          if (typeof parsed.name === "string") setProjectName(parsed.name)
          setHydrated(true)
          return
        }
      }

      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
      if (legacy) {
        const parsed = JSON.parse(legacy) as Partial<ProjectData> | BuilderNode[]
        const candidate = Array.isArray(parsed) ? parsed : parsed.nodes
        if (validateNodes(candidate)) setNodes(candidate)
        if (!Array.isArray(parsed) && typeof parsed.name === "string") setProjectName(parsed.name)
      }
    } catch {
      flash("本地草稿加载失败，已使用空白画布")
    } finally {
      setHydrated(true)
    }
  }, [flash])

  useEffect(() => {
    if (!hydrated) return
    setSaveStatus("saving")
    const timer = setTimeout(() => {
      try {
        const payload: ProjectData = { version: 4, name: projectName, nodes, updatedAt: Date.now() }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
        setSaveStatus("saved")
      } catch {
        setSaveStatus("error")
      }
    }, 320)
    return () => clearTimeout(timer)
  }, [nodes, projectName, hydrated])

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    }
  }, [])

  const selected = useMemo(() => (selectedId ? getNode(nodes, selectedId) : null), [nodes, selectedId])
  const generatedCode = useMemo(() => generatePageCode(nodes), [nodes])
  const generatedHtml = useMemo(() => generateHtml(nodes), [nodes])
  const projectJson = useMemo(() => JSON.stringify({ version: 4, name: projectName, nodes }, null, 2), [nodes, projectName])
  const exportValue = exportTab === "jsx" ? generatedCode : exportTab === "html" ? generatedHtml : projectJson
  const canvasWidth = device === "desktop" ? "1180px" : device === "tablet" ? "768px" : "390px"
  const totalNodeCount = useMemo(() => countNodes(nodes), [nodes])
  const editableStyle = selected ? (styleScope === "base" ? selected.style : selected.responsive?.[styleScope] || {}) : {}

  const visibleComponents = useMemo(() => {
    const query = componentQuery.trim().toLowerCase()
    if (!query) return COMPONENTS
    return COMPONENTS.filter((item) => `${item.label} ${item.desc} ${item.type}`.toLowerCase().includes(query))
  }, [componentQuery])

  const setNodeStyle = useCallback((key: keyof CSSProperties, value: string | number | undefined) => {
    if (!selectedId) return
    commitNodes((prev) =>
      updateNode(prev, selectedId, (node) => {
        if (node.locked) return node
        if (styleScope === "base") {
          return { ...node, style: setStyleProperty(node.style, key, value) }
        }

        const nextResponsive = { ...(node.responsive || {}) }
        nextResponsive[styleScope] = setStyleProperty(nextResponsive[styleScope] || {}, key, value)
        return { ...node, responsive: nextResponsive }
      }),
    )
  }, [commitNodes, selectedId, styleScope])

  const setNodeStylePatch = useCallback((patch: CSSProperties) => {
    if (!selectedId) return
    commitNodes((prev) =>
      updateNode(prev, selectedId, (node) => {
        if (node.locked) return node
        if (styleScope === "base") return { ...node, style: { ...node.style, ...patch } }
        return {
          ...node,
          responsive: {
            ...(node.responsive || {}),
            [styleScope]: { ...(node.responsive?.[styleScope] || {}), ...patch },
          },
        }
      }),
    )
  }, [commitNodes, selectedId, styleScope])

  const clearCurrentOverrides = useCallback(() => {
    if (!selectedId || styleScope === "base") return
    commitNodes((prev) =>
      updateNode(prev, selectedId, (node) => {
        const responsive = { ...(node.responsive || {}) }
        delete responsive[styleScope]
        return { ...node, responsive }
      }),
    )
    flash(`${styleScope} 覆写已清除`)
  }, [commitNodes, flash, selectedId, styleScope])

  const setNodeProp = useCallback((key: keyof BuilderNode["props"], value: string) => {
    if (!selectedId) return
    commitNodes((prev) =>
      updateNode(prev, selectedId, (node) => {
        if (node.locked) return node
        return { ...node, props: { ...node.props, [key]: value } }
      }),
    )
  }, [commitNodes, selectedId])

  const toggleHidden = useCallback((id: string, hidden: boolean) => {
    commitNodes((prev) => updateNode(prev, id, (node) => ({ ...node, hidden })))
    flash(hidden ? "图层已隐藏" : "图层已显示")
  }, [commitNodes, flash])

  const toggleLocked = useCallback((id: string, locked: boolean) => {
    commitNodes((prev) => updateNode(prev, id, (node) => ({ ...node, locked })))
    flash(locked ? "图层已锁定" : "图层已解锁")
  }, [commitNodes, flash])

  const deleteSelected = useCallback(() => {
    if (!selectedId) return
    const target = getNode(nodes, selectedId)
    if (target?.locked) {
      flash("锁定图层不能删除，请先解锁")
      return
    }
    commitNodes((prev) => removeNode(prev, selectedId).next)
    setSelectedId(null)
    flash("组件已删除")
  }, [commitNodes, flash, nodes, selectedId])

  const duplicateSelected = useCallback(() => {
    if (!selectedId) return
    const source = getNode(nodes, selectedId)
    const location = getLocation(nodes, selectedId)
    if (!source || !location) return
    if (source.locked) {
      flash("锁定图层不能复制，请先解锁")
      return
    }

    const copy = cloneNodeDeep(source)
    commitNodes((prev) => insertNode(prev, location.parentId, copy, location.index + 1))
    setSelectedId(copy.id)
    flash("组件已复制")
  }, [commitNodes, flash, nodes, selectedId])

  const copySelected = useCallback(() => {
    if (!selected) return
    clipboardRef.current = cloneNodeDeep(selected)
    flash("已复制到编辑器剪贴板")
  }, [flash, selected])

  const pasteSelected = useCallback(() => {
    const source = clipboardRef.current
    if (!source) return
    const copy = cloneNodeDeep(source)
    const location = selectedId ? getLocation(nodes, selectedId) : null
    commitNodes((prev) => insertNode(prev, location?.parentId ?? null, copy, location ? location.index + 1 : undefined))
    setSelectedId(copy.id)
    flash("已粘贴组件")
  }, [commitNodes, flash, nodes, selectedId])

  const selectParent = useCallback(() => {
    if (!selectedId) return
    const location = getLocation(nodes, selectedId)
    setSelectedId(location?.parentId ?? null)
  }, [nodes, selectedId])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey
      if (isEditableTarget(event.target)) return
      if (mod && event.key.toLowerCase() === "z") {
        event.preventDefault()
        event.shiftKey ? redo() : undo()
        return
      }
      if (mod && event.key.toLowerCase() === "y") {
        event.preventDefault()
        redo()
        return
      }
      if (mod && event.key.toLowerCase() === "d") {
        event.preventDefault()
        duplicateSelected()
        return
      }
      if (mod && event.key.toLowerCase() === "c") {
        event.preventDefault()
        copySelected()
        return
      }
      if (mod && event.key.toLowerCase() === "v") {
        event.preventDefault()
        pasteSelected()
        return
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault()
        deleteSelected()
        return
      }
      // 自由定位的节点用方向键微调：默认 1px，按住 Shift 一次 10px
      if (event.key.startsWith("Arrow") && selectedId) {
        const node = getNode(nodes, selectedId)
        if (node && !node.locked && isFreePositioned(node)) {
          const step = event.shiftKey ? 10 : 1
          const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0
          const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0
          if (dx || dy) {
            event.preventDefault()
            const offsets = resolvedOffsets(node)
            if (offsets) {
              commitNodes((prev) =>
                updateNode(prev, node.id, (item) => ({
                  ...item,
                  style: {
                    ...item.style,
                    left: `${Math.round((offsets.left + dx) * 100) / 100}px`,
                    top: `${Math.round((offsets.top + dy) * 100) / 100}px`,
                  },
                })),
              )
            }
            return
          }
        }
      }
      if (event.key === "Escape") setSelectedId(null)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [
    commitNodes,
    copySelected,
    deleteSelected,
    duplicateSelected,
    isFreePositioned,
    nodes,
    pasteSelected,
    redo,
    resolvedOffsets,
    selectedId,
    undo,
  ])

  const getPayload = (event: DragEvent): DragPayload | null => {
    try {
      const raw = event.dataTransfer.getData("application/x-page-builder")
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  const handleDrop = (event: DragEvent, parentId: string | null, index?: number) => {
    event.preventDefault()
    event.stopPropagation()
    setDragOverId(null)

    const payload = getPayload(event)
    if (!payload) return

    if (payload.kind === "new") {
      const node = createNode(payload.nodeType)
      commitNodes((prev) => insertNode(prev, parentId, node, index))
      setSelectedId(node.id)
      return
    }

    const moving = getNode(nodes, payload.nodeId)
    if (!moving || moving.locked || parentId === moving.id || (parentId && hasDescendant(moving, parentId))) return

    const oldLocation = getLocation(nodes, moving.id)
    const result = removeNode(nodes, moving.id)
    if (!result.removed) return

    let adjustedIndex = index
    if (oldLocation && oldLocation.parentId === parentId && typeof index === "number" && oldLocation.index < index) adjustedIndex = index - 1

    commitNodes(insertNode(result.next, parentId, result.removed, adjustedIndex))
    setSelectedId(moving.id)
  }

  // handleContainerDrop 通过这个 ref 取用最新的 handleDrop，避免渲染期就引用尚未初始化的 const
  useEffect(() => {
    handleDropRef.current = handleDrop
  })

  const importJson = () => {
    const raw = window.prompt("粘贴 Page Builder JSON：")
    if (!raw) return

    try {
      const parsed = JSON.parse(raw) as Partial<ProjectData> | BuilderNode[]
      const candidate = Array.isArray(parsed) ? parsed : parsed.nodes
      if (!validateNodes(candidate)) throw new Error("invalid")
      commitNodes(candidate)
      if (!Array.isArray(parsed) && typeof parsed.name === "string") setProjectName(parsed.name)
      setSelectedId(null)
      flash("JSON 已安全导入")
    } catch {
      flash("JSON 无效或结构不受支持")
    }
  }

  const applyTemplate = (make: () => BuilderNode[]) => {
    const template = make()
    commitNodes((prev) => (prev.length ? [...prev, ...template] : template))
    setSelectedId(template[0]?.id || null)
    setLeftTab("layers")
    flash("模板已添加到画布")
  }

  const copyExport = async () => {
    try {
      await navigator.clipboard.writeText(exportValue)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      flash("复制失败，请检查剪贴板权限")
    }
  }

  const downloadExport = () => {
    const base = sanitizeFileName(projectName)
    if (exportTab === "jsx") downloadTextFile(`${base}.tsx`, generatedCode, "text/plain;charset=utf-8")
    if (exportTab === "html") downloadTextFile(`${base}.html`, generatedHtml, "text/html;charset=utf-8")
    if (exportTab === "json") downloadTextFile(`${base}.json`, projectJson, "application/json;charset=utf-8")
    flash("导出文件已生成")
  }

  const renderNode = (node: BuilderNode, parentId: string | null, index: number, mode: "edit" | "preview" = "edit"): ReactNode => {
    if (node.hidden) return null

    const isSelected = selectedId === node.id && mode === "edit"
    const dropActive = dragOverId === node.id
    const nodeStyle = mode === "preview" ? mergeStyleForDevice(node, device) : mergeStyleForDevice(node, device)

    const renderChildren = () => {
      if (!node.children || node.children.length === 0) {
        if (mode === "preview") return null
        return (
          <div className="flex min-h-20 items-center justify-center rounded-xl border border-dashed border-stone-300 bg-stone-50/70 px-4 text-center text-xs text-slate-400">
            拖拽组件到这个容器
          </div>
        )
      }

      return node.children.map((child, childIndex) => (
        <div
          key={child.id}
          ref={(element) => {
            if (element) slotElsRef.current.set(child.id, element)
            else slotElsRef.current.delete(child.id)
          }}
        >
          {renderNode(child, node.id, childIndex, mode)}
        </div>
      ))
    }

    let content: ReactNode

    switch (node.type) {
      case "section":
      case "container":
      case "grid":
        content = (
          <div
            style={nodeStyle}
            onDragOver={mode === "edit" ? (event) => handleContainerDragOver(event, node.id) : undefined}
            onDrop={mode === "edit" ? (event) => handleContainerDrop(event, node.id) : undefined}
            className={dropActive && mode === "edit" ? "outline outline-2 outline-dashed outline-violet-400" : ""}
          >
            {renderChildren()}
          </div>
        )
        break
      case "heading":
        content = <h2 style={nodeStyle}>{node.props.text}</h2>
        break
      case "text":
        content = <p style={nodeStyle}>{node.props.text}</p>
        break
      case "button":
        content = <button type="button" style={nodeStyle}>{node.props.text}</button>
        break
      case "input":
        content = <input readOnly placeholder={node.props.placeholder} style={nodeStyle} />
        break
      case "image":
        content = <img src={node.props.src} alt={node.props.alt || ""} style={nodeStyle} draggable={false} />
        break
      case "badge":
        content = <span style={nodeStyle}>{node.props.text}</span>
        break
      case "divider":
        content = <div aria-hidden="true" style={nodeStyle} />
        break
      case "spacer":
        content = <div aria-hidden="true" style={nodeStyle} className={mode === "edit" ? "rounded-xl border border-dashed border-stone-200 bg-stone-50/50" : ""} />
        break
    }

    if (mode === "preview") return content

    const freePositioned = isFreePositioned(node)

    const wrapperClass = `group/node relative rounded-[18px] transition ${
      isSelected
        ? "ring-2 ring-violet-500 ring-offset-2 ring-offset-white"
        : node.locked
          ? "ring-1 ring-stone-200"
          : "hover:ring-2 hover:ring-violet-200"
    }`

    return (
      <div
        ref={(element) => {
          if (element) nodeElsRef.current.set(node.id, element)
          else nodeElsRef.current.delete(node.id)
        }}
        data-node-id={node.id}
        // 绝对定位的节点用指针直接拖（配合吸附），其余节点仍然走结构式拖拽
        draggable={!node.locked && !freePositioned}
        style={freePositioned ? { cursor: "grab" } : undefined}
        onPointerDown={(event: ReactPointerEvent<HTMLDivElement>) => beginFreeDrag(event, node)}
        onDragStart={(event) => {
          if (node.locked) {
            event.preventDefault()
            return
          }
          event.stopPropagation()
          event.dataTransfer.effectAllowed = "move"
          event.dataTransfer.setData("application/x-page-builder", JSON.stringify({ kind: "move", nodeId: node.id } satisfies DragPayload))
        }}
        onClick={(event: MouseEvent) => {
          event.stopPropagation()
          setSelectedId(node.id)
        }}
        onDragOver={(event) => {
          event.preventDefault()
          // 不再 stopPropagation：要让事件冒泡到容器，由容器按几何算出插入缝隙
          setDragOverId(node.id)
        }}
        onDragLeave={(event) => {
          event.stopPropagation()
          if (dragOverId === node.id) setDragOverId(null)
        }}
        className={wrapperClass}
      >
        {isSelected && (
          <div className="absolute -top-3 left-3 z-20 flex items-center gap-1.5">
            <span className="rounded-lg bg-violet-600 px-2 py-1 text-[10px] font-semibold text-white shadow-lg">
              {COMPONENTS.find((item) => item.type === node.type)?.label}
              {node.locked ? " · 已锁定" : ""}
            </span>
            {!node.locked && !freePositioned && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  makeFreePositioned(node)
                }}
                title="转为绝对定位，之后可以直接在画布上拖动并自动吸附对齐"
                className="rounded-lg bg-slate-900/85 px-2 py-1 text-[10px] font-semibold text-white shadow-lg transition hover:bg-slate-900"
              >
                自由定位
              </button>
            )}
            {freePositioned && (
              <span className="rounded-lg bg-rose-500/90 px-2 py-1 text-[10px] font-semibold text-white shadow-lg">
                可拖动 · 自动吸附
              </span>
            )}
          </div>
        )}
        {content}
      </div>
    )
  }

  const saveLabel = saveStatus === "saved" ? "已保存" : saveStatus === "saving" ? "保存中…" : "保存失败"
  const saveDot = saveStatus === "saved" ? "bg-emerald-500" : saveStatus === "saving" ? "bg-amber-400" : "bg-red-500"

  const dimensionValue = (key: keyof CSSProperties) => scopedStyleValue(selected, styleScope, key)
  const editableNumberValue = (key: keyof CSSProperties) => {
    const value = editableStyle[key]
    return typeof value === "number" ? value : undefined
  }

  return (
    <div className="min-h-screen bg-[#f3f5f9] text-slate-900">
      <style>{`
        .builder-scroll::-webkit-scrollbar { width: 9px; height: 9px; }
        .builder-scroll::-webkit-scrollbar-thumb { background: rgba(120,113,108,.22); border-radius: 999px; }
        .builder-scroll::-webkit-scrollbar-track { background: transparent; }
        .builder-scroll { scrollbar-gutter: stable; }
        .inspector-sections > div { border: 1px solid rgba(226,232,240,.86); background: #fff; border-radius: 20px; padding: 14px; box-shadow: 0 1px 2px rgba(15,23,42,.025); }
        .inspector-sections > div > h3 { display: flex; align-items: center; gap: 8px; color: #1e293b; font-weight: 800; letter-spacing: -.01em; }
        .inspector-sections > div > h3::before { content: ""; width: 6px; height: 6px; border-radius: 999px; background: #8b5cf6; box-shadow: 0 0 0 4px rgba(139,92,246,.10); }
        input, textarea, select, button { -webkit-font-smoothing: antialiased; }
      `}</style>

      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="flex min-h-16 items-center gap-3 px-3 sm:px-4 lg:px-5">
          <div className="hidden shrink-0 xl:block"><Breadcrumb /></div>
          <div className="hidden h-6 w-px bg-stone-200 xl:block" />
          <div className="flex min-w-0 items-center gap-2">
            <input
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              className="w-32 truncate rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-bold text-slate-900 outline-none transition hover:border-stone-200 focus:border-violet-300 focus:bg-white sm:w-48"
              aria-label="项目名称"
            />
            <span className={`hidden h-2 w-2 rounded-full sm:block ${saveDot}`} />
            <span className="hidden text-[10px] text-slate-400 sm:block">{saveLabel}</span>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={undo} title="撤销 Ctrl/⌘ + Z" className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-white hover:text-slate-900">↶</button>
            <button onClick={redo} title="重做 Ctrl/⌘ + Shift + Z" className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-white hover:text-slate-900">↷</button>
            <div className="mx-1 hidden h-6 w-px bg-stone-200 md:block" />
            <div className="hidden rounded-xl bg-stone-100 p-1 md:flex">
              {([["desktop", "桌面"], ["tablet", "平板"], ["mobile", "手机"]] as Array<[Device, string]>).map(([value, label]) => (
                <button key={value} onClick={() => { setDevice(value); if (styleScope !== "base") setStyleScope(value) }} className={`rounded-lg px-3 py-2 text-xs font-medium transition ${device === value ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>
                  {label}
                </button>
              ))}
            </div>
            <button onClick={() => setShowPreview(true)} className="hidden rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700 sm:block">
              预览
            </button>
            <button onClick={importJson} className="hidden rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700 lg:block">
              导入
            </button>
            <button onClick={() => setShowCode(true)} className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-violet-600 active:scale-95">
              导出
            </button>
          </div>
        </div>
      </header>

      {notice && <div className="fixed left-1/2 top-20 z-[120] -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-2xl">{notice}</div>}

      <main className="grid min-h-[calc(100vh-65px)] grid-cols-1 lg:grid-cols-[288px_minmax(0,1fr)_390px]">
        <aside className="border-b border-slate-200 bg-white/92 lg:border-b-0 lg:border-r">
          <div className="builder-scroll sticky top-16 max-h-[calc(100vh-65px)] overflow-y-auto p-3">
            <div className="grid grid-cols-3 rounded-2xl border border-slate-200/80 bg-slate-100/80 p-1">
              {([["components", "组件"], ["layers", "图层"], ["templates", "模板"]] as Array<[LeftTab, string]>).map(([value, label]) => (
                <button key={value} onClick={() => setLeftTab(value)} className={`rounded-lg px-2 py-2 text-[11px] font-semibold transition ${leftTab === value ? "bg-white text-violet-700 shadow-sm ring-1 ring-slate-200/70" : "text-slate-500 hover:text-slate-800"}`}>
                  {label}
                </button>
              ))}
            </div>

            {leftTab === "components" && (
              <div className="mt-4">
                <div className="relative mb-3">
                  <input
                    value={componentQuery}
                    onChange={(event) => setComponentQuery(event.target.value)}
                    placeholder="搜索组件、布局、图片…"
                    className="h-10 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 pr-9 text-xs text-slate-800 outline-none transition focus:border-violet-300 focus:bg-white"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">⌕</span>
                </div>
                <div className="space-y-5">
                  {(["layout", "content", "form", "media"] as ComponentMeta["group"][]).map((group) => {
                    const list = visibleComponents.filter((item) => item.group === group)
                    if (!list.length) return null
                    return (
                      <div key={group}>
                        <div className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                          {group === "layout" ? "布局" : group === "content" ? "内容" : group === "form" ? "表单" : "媒体"}
                        </div>
                        <div className="space-y-2">
                          {list.map((item) => (
                            <div
                              key={item.type}
                              draggable
                              onDragStart={(event) => {
                                event.dataTransfer.effectAllowed = "copy"
                                event.dataTransfer.setData("application/x-page-builder", JSON.stringify({ kind: "new", nodeType: item.type } satisfies DragPayload))
                              }}
                              className="group cursor-grab rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm shadow-slate-950/[0.02] transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-lg hover:shadow-violet-500/10 active:cursor-grabbing"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-sm font-black text-slate-600 transition group-hover:bg-violet-100 group-hover:text-violet-700">{item.icon}</div>
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold text-slate-800">{item.label}</div>
                                  <div className="mt-0.5 truncate text-[10px] text-slate-400">{item.desc}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
                {!visibleComponents.length && <div className="rounded-2xl border border-dashed border-stone-200 p-5 text-center text-xs text-slate-400">没有匹配的组件</div>}
              </div>
            )}

            {leftTab === "layers" && (
              <div className="mt-4">
                {nodes.length ? (
                  <LayerTree nodes={nodes} selectedId={selectedId} onSelect={setSelectedId} onToggleHidden={toggleHidden} onToggleLocked={toggleLocked} />
                ) : (
                  <div className="rounded-[22px] border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm shadow-slate-950/[0.02] text-xs text-slate-400">画布暂无图层</div>
                )}
              </div>
            )}

            {leftTab === "templates" && (
              <div className="mt-4 space-y-2">
                {TEMPLATES.map((template) => (
                  <button key={template.id} onClick={() => applyTemplate(template.make)} className="w-full rounded-2xl border border-stone-200 bg-white p-4 text-left transition hover:border-violet-300 hover:shadow-lg hover:shadow-violet-500/10">
                    <div className="text-xs font-bold text-slate-800">{template.name}</div>
                    <div className="mt-1 text-[10px] leading-5 text-slate-400">{template.desc}</div>
                    <div className="mt-3 text-[10px] font-semibold text-violet-600">添加到画布 →</div>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-3 text-[10px] leading-5 text-slate-500">
              <b className="text-slate-700">快捷键</b><br />
              ⌘/Ctrl Z 撤销 · ⇧⌘/Ctrl Z 重做<br />
              ⌘/Ctrl D 复制 · Delete 删除<br />
              图层可隐藏、锁定，隐藏后不参与导出
            </div>
          </div>
        </aside>

        <section className="min-w-0 bg-[#f3f5f9]">
          <div className="flex min-h-12 flex-wrap items-center gap-2 border-b border-stone-200 px-4 py-2">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className={`h-2 w-2 rounded-full ${saveDot}`} />
              {saveLabel}
              <span className="hidden text-slate-300 sm:inline">·</span>
              <span className="hidden text-slate-400 sm:inline">{totalNodeCount} 个组件</span>
            </div>

            <div className="ml-auto flex items-center gap-1">
              <button onClick={selectParent} disabled={!selectedId} className="hidden rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-white hover:text-slate-900 disabled:opacity-30 sm:block">父级</button>
              <button onClick={duplicateSelected} disabled={!selected || selected.locked} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-white hover:text-slate-900 disabled:opacity-30">副本</button>
              <button onClick={() => setShowClearConfirm(true)} disabled={!nodes.length} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-30">清空</button>
              <div className="mx-1 h-5 w-px bg-stone-200" />
              <button onClick={() => setZoom((value) => Math.max(50, value - 10))} className="h-8 w-8 rounded-lg text-xs font-bold text-slate-500 transition hover:bg-white">−</button>
              <button onClick={() => setZoom(100)} className="min-w-12 rounded-lg px-2 py-1.5 text-[10px] font-semibold text-slate-500 transition hover:bg-white">{zoom}%</button>
              <button onClick={() => setZoom((value) => Math.min(140, value + 10))} className="h-8 w-8 rounded-lg text-xs font-bold text-slate-500 transition hover:bg-white">+</button>
            </div>
          </div>

          <div className="builder-scroll overflow-auto p-4 sm:p-7">
            <div className="mx-auto flex min-h-[790px] w-max min-w-full items-start justify-center">
              <div
                style={{ width: canvasWidth, transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
                className="min-h-[740px] max-w-none overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-[0_24px_70px_rgba(15,23,42,.12)] transition-[width,transform] duration-300"
              >
                <div className="flex h-10 items-center gap-2 border-b border-stone-100 bg-stone-50 px-4">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                  <div className="ml-3 flex h-6 flex-1 items-center rounded-md border border-stone-200 bg-white px-2 text-[9px] text-slate-300">
                    preview.local/{projectName.replace(/\s+/g, "-").toLowerCase()}
                  </div>
                  <span className="hidden text-[10px] text-slate-400 lg:inline">
                    拖动组件时按最近缝隙吸附 · 选中后点「自由定位」可拖动对齐（Alt 关吸附 / Shift+方向键 10px）
                  </span>
                </div>

                <div
                  ref={canvasRef}
                  onClick={() => setSelectedId(null)}
                  onDragOver={(event) => handleContainerDragOver(event, null)}
                  onDragLeave={() => {
                    if (dragOverId === "root") setDragOverId(null)
                    dropTargetRef.current = null
                    paintInsertion(null, 1)
                  }}
                  onDrop={(event) => handleContainerDrop(event, null)}
                  className={`relative min-h-[700px] p-5 sm:p-8 ${dragOverId === "root" ? "bg-violet-50/60" : "bg-white"}`}
                >
                  {!nodes.length ? (
                    <div className="flex min-h-[610px] items-center justify-center">
                      <div className="max-w-sm text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-violet-100 text-2xl text-violet-700">✦</div>
                        <h3 className="mt-5 text-lg font-bold text-slate-800">开始搭建你的页面</h3>
                        <p className="mt-2 text-xs leading-6 text-slate-400">从左侧拖入组件，或直接套用一个模板。所有修改都会自动保存在当前浏览器。</p>
                        <button onClick={(event) => { event.stopPropagation(); setLeftTab("templates") }} className="mt-4 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-violet-500">浏览模板</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {nodes.map((node, index) => (
                        <div
                          key={node.id}
                          ref={(element) => {
                            if (element) slotElsRef.current.set(node.id, element)
                            else slotElsRef.current.delete(node.id)
                          }}
                        >
                          {renderNode(node, null, index)}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 对齐参考线 / 间距标签 / 插入指示线。
                      挂在画布坐标系里（和缩放同一个坐标系），所以位置可以直接用画布坐标写；
                      pointer-events-none 保证不影响画布上的任何交互。 */}
                  <div ref={guideRef} className="pointer-events-none absolute inset-0 z-30" style={{ display: "none" }}>
                    {[0, 1, 2].map((index) => (
                      <div key={`gx${index}`} data-guide-x={index} className="absolute bg-rose-500/85" style={{ display: "none" }} />
                    ))}
                    {[0, 1, 2].map((index) => (
                      <div key={`gy${index}`} data-guide-y={index} className="absolute bg-rose-500/85" style={{ display: "none" }} />
                    ))}
                    <div
                      data-guide-gap
                      className="absolute -translate-x-1/2 -translate-y-1/2 bg-rose-500 font-mono font-semibold text-white"
                      style={{ display: "none" }}
                    />
                    <div data-guide-insert className="absolute rounded-full bg-violet-500" style={{ display: "none" }} />
                    <div
                      data-guide-insert-label
                      className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap bg-violet-600 font-semibold text-white"
                      style={{ display: "none" }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <FooterNote />
          </div>
        </section>

        <aside className="border-t border-slate-200 bg-[#fbfcfe] lg:border-l lg:border-t-0">
          <div className="builder-scroll sticky top-16 max-h-[calc(100vh-65px)] overflow-y-auto p-3.5">
            <div className="mb-4 rounded-[22px] border border-slate-200/80 bg-white p-3.5 shadow-sm shadow-slate-950/[0.03]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-violet-100 text-[11px] font-black text-violet-700">✦</span>
                    <div>
                      <h2 className="text-[12px] font-extrabold tracking-tight text-slate-800">属性检查器</h2>
                      <p className="mt-0.5 text-[10px] text-slate-400">{selected ? `正在编辑 · ${COMPONENTS.find((item) => item.type === selected.type)?.label}` : "选择画布中的组件开始编辑"}</p>
                    </div>
                  </div>
                </div>
                {selected && (
                  <div className="flex gap-1">
                    <button onClick={() => toggleHidden(selected.id, !selected.hidden)} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-500 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700">{selected.hidden ? "显示" : "隐藏"}</button>
                    <button onClick={() => toggleLocked(selected.id, !selected.locked)} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-500 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700">{selected.locked ? "解锁" : "锁定"}</button>
                  </div>
                )}
              </div>

              {selected && (
                <>
                  <div className="mt-4 grid grid-cols-4 gap-1 rounded-2xl bg-slate-100/90 p-1.5">
                    {([["content", "内容"], ["layout", "布局"], ["style", "样式"], ["advanced", "高级"]] as Array<[InspectorTab, string]>).map(([value, label]) => (
                      <button key={value} onClick={() => setInspectorTab(value)} className={`rounded-xl px-2 py-2.5 text-[11px] font-bold transition ${inspectorTab === value ? "bg-white text-violet-700 shadow-sm ring-1 ring-slate-200/70" : "text-slate-500 hover:bg-white/60 hover:text-slate-800"}`}>
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-1 rounded-2xl border border-slate-200/70 bg-slate-50 p-1">
                    {([["base", "基础"], ["desktop", "桌面"], ["tablet", "平板"], ["mobile", "手机"]] as Array<[StyleScope, string]>).map(([value, label]) => (
                      <button key={value} onClick={() => setStyleScope(value)} className={`rounded-xl px-2 py-2 text-[10px] font-bold transition ${styleScope === value ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" : "text-slate-500 hover:bg-white hover:text-slate-800"}`}>
                        {label}
                      </button>
                    ))}
                  </div>

                  {styleScope !== "base" && (
                    <button onClick={clearCurrentOverrides} className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600">
                      清除当前设备覆写
                    </button>
                  )}
                </>
              )}
            </div>

            {!selected ? (
              <div className="rounded-[22px] border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm shadow-slate-950/[0.02]">
                <div className="text-2xl">↖</div>
                <p className="mt-2 text-xs font-medium text-slate-500">点击画布或图层中的组件</p>
                <p className="mt-1 text-[10px] leading-5 text-slate-400">选中后可以修改内容、尺寸、排版、布局、响应式与高级样式。</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className={`rounded-2xl border p-3.5 text-[10px] leading-5 shadow-sm ${selected.locked ? "border-amber-200 bg-amber-50 text-amber-700" : "border-violet-100 bg-gradient-to-br from-violet-50 to-white text-slate-500"}`}>
                  <span className="font-semibold text-slate-700">节点</span> · {selected.type}{selected.locked ? " · 已锁定" : ""}<br />
                  <span className="font-mono text-[9px] text-slate-400">{selected.id}</span>
                </div>

                {inspectorTab === "content" && (
                  <div className="rounded-[20px] border border-slate-200/80 bg-white p-3.5 shadow-sm shadow-slate-950/[0.025] space-y-3">
                    {(selected.type === "heading" || selected.type === "text" || selected.type === "button" || selected.type === "badge") && (
                      <TextField label="文字" value={selected.props.text || ""} onChange={(value) => setNodeProp("text", value)} multiline={selected.type === "text"} />
                    )}
                    {selected.type === "button" && <TextField label="链接" value={selected.props.href || ""} onChange={(value) => setNodeProp("href", value)} placeholder="#" />}
                    {selected.type === "input" && <TextField label="Placeholder" value={selected.props.placeholder || ""} onChange={(value) => setNodeProp("placeholder", value)} />}
                    {selected.type === "image" && (
                      <>
                        <TextField label="图片地址" value={selected.props.src || ""} onChange={(value) => setNodeProp("src", value)} />
                        <TextField label="Alt" value={selected.props.alt || ""} onChange={(value) => setNodeProp("alt", value)} />
                        <DimensionField label="Object Position" value={dimensionValue("objectPosition")} onChange={(value) => setNodeStyle("objectPosition", value)} placeholder="center / 50% 40%" />
                      </>
                    )}
                    {(selected.type === "section" || selected.type === "container" || selected.type === "grid") && (
                      <p className="rounded-2xl border border-stone-200 bg-white p-4 text-xs leading-6 text-slate-500">
                        这个组件是布局容器。请切到「布局」调整宽高、栅格、Flex 和间距；切到「样式」调整背景、边框与阴影。
                      </p>
                    )}
                  </div>
                )}

                {inspectorTab === "layout" && (
                  <div className="inspector-sections space-y-3.5">
                    <div className="space-y-3">
                      <h3 className="text-[11px] font-bold text-slate-700">尺寸 Size</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <DimensionField label="Width" value={dimensionValue("width")} onChange={(value) => setNodeStyle("width", value)} placeholder="auto / 100% / 320px" />
                        <DimensionField label="Height" value={dimensionValue("height")} onChange={(value) => setNodeStyle("height", value)} placeholder="auto / 240px / 100vh" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <DimensionField label="Min Width" value={dimensionValue("minWidth")} onChange={(value) => setNodeStyle("minWidth", value)} placeholder="0 / 320px" />
                        <DimensionField label="Max Width" value={dimensionValue("maxWidth")} onChange={(value) => setNodeStyle("maxWidth", value)} placeholder="none / 1180px" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <DimensionField label="Min Height" value={dimensionValue("minHeight")} onChange={(value) => setNodeStyle("minHeight", value)} placeholder="0 / 520px" />
                        <DimensionField label="Max Height" value={dimensionValue("maxHeight")} onChange={(value) => setNodeStyle("maxHeight", value)} placeholder="none / 80vh" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <DimensionField label="Aspect Ratio" value={dimensionValue("aspectRatio")} onChange={(value) => setNodeStyle("aspectRatio", value)} placeholder="16 / 9" />
                        <SelectField label="Overflow" value={dimensionValue("overflow") || "visible"} onChange={(value) => setNodeStyle("overflow", value)} options={[{ value: "visible", label: "Visible" }, { value: "hidden", label: "Hidden" }, { value: "auto", label: "Auto" }, { value: "scroll", label: "Scroll" }]} />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-[11px] font-bold text-slate-700">快捷尺寸</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <PatchButton onClick={() => setNodeStylePatch({ width: "100%", height: "auto" })}>铺满宽度</PatchButton>
                        <PatchButton onClick={() => setNodeStylePatch({ width: "fit-content", height: "auto" })}>内容自适应</PatchButton>
                        <PatchButton onClick={() => setNodeStylePatch({ width: "100%", minHeight: "100vh" })}>整屏区块</PatchButton>
                        <PatchButton onClick={() => setNodeStylePatch({ width: "320px", height: "320px", aspectRatio: "1 / 1" })}>正方形</PatchButton>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-[11px] font-bold text-slate-700">间距 Spacing</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <DimensionField label="Padding" value={dimensionValue("padding")} onChange={(value) => setNodeStyle("padding", value)} placeholder="24px / 24px 32px" />
                        <DimensionField label="Margin" value={dimensionValue("margin")} onChange={(value) => setNodeStyle("margin", value)} placeholder="0 auto / 24px 0" />
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <DimensionField label="PT" value={dimensionValue("paddingTop")} onChange={(value) => setNodeStyle("paddingTop", value)} />
                        <DimensionField label="PR" value={dimensionValue("paddingRight")} onChange={(value) => setNodeStyle("paddingRight", value)} />
                        <DimensionField label="PB" value={dimensionValue("paddingBottom")} onChange={(value) => setNodeStyle("paddingBottom", value)} />
                        <DimensionField label="PL" value={dimensionValue("paddingLeft")} onChange={(value) => setNodeStyle("paddingLeft", value)} />
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <DimensionField label="MT" value={dimensionValue("marginTop")} onChange={(value) => setNodeStyle("marginTop", value)} />
                        <DimensionField label="MR" value={dimensionValue("marginRight")} onChange={(value) => setNodeStyle("marginRight", value)} />
                        <DimensionField label="MB" value={dimensionValue("marginBottom")} onChange={(value) => setNodeStyle("marginBottom", value)} />
                        <DimensionField label="ML" value={dimensionValue("marginLeft")} onChange={(value) => setNodeStyle("marginLeft", value)} />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-[11px] font-bold text-slate-700">布局 Display</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <SelectField label="Display" value={dimensionValue("display") || "block"} onChange={(value) => setNodeStyle("display", value)} options={[{ value: "block", label: "Block" }, { value: "flex", label: "Flex" }, { value: "inline-flex", label: "Inline Flex" }, { value: "grid", label: "Grid" }, { value: "none", label: "None" }]} />
                        <DimensionField label="Gap" value={dimensionValue("gap")} onChange={(value) => setNodeStyle("gap", value)} placeholder="16px" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <SelectField label="Flex Direction" value={dimensionValue("flexDirection") || "column"} onChange={(value) => setNodeStyle("flexDirection", value)} options={[{ value: "row", label: "Row" }, { value: "column", label: "Column" }, { value: "row-reverse", label: "Row Reverse" }, { value: "column-reverse", label: "Column Reverse" }]} />
                        <SelectField label="Wrap" value={dimensionValue("flexWrap") || "nowrap"} onChange={(value) => setNodeStyle("flexWrap", value)} options={[{ value: "nowrap", label: "No Wrap" }, { value: "wrap", label: "Wrap" }]} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <SelectField label="Justify" value={dimensionValue("justifyContent") || "flex-start"} onChange={(value) => setNodeStyle("justifyContent", value)} options={[{ value: "flex-start", label: "Start" }, { value: "center", label: "Center" }, { value: "flex-end", label: "End" }, { value: "space-between", label: "Between" }, { value: "space-around", label: "Around" }, { value: "space-evenly", label: "Evenly" }]} />
                        <SelectField label="Align" value={dimensionValue("alignItems") || "stretch"} onChange={(value) => setNodeStyle("alignItems", value)} options={[{ value: "stretch", label: "Stretch" }, { value: "flex-start", label: "Start" }, { value: "center", label: "Center" }, { value: "flex-end", label: "End" }, { value: "baseline", label: "Baseline" }]} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <DimensionField label="Grid Columns" value={dimensionValue("gridTemplateColumns")} onChange={(value) => setNodeStyle("gridTemplateColumns", value)} placeholder="repeat(3,minmax(0,1fr))" />
                        <DimensionField label="Grid Rows" value={dimensionValue("gridTemplateRows")} onChange={(value) => setNodeStyle("gridTemplateRows", value)} placeholder="auto" />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <NumberField label="Grow" value={editableNumberValue("flexGrow")} min={0} max={12} onChange={(value) => setNodeStyle("flexGrow", value)} />
                        <NumberField label="Shrink" value={editableNumberValue("flexShrink")} min={0} max={12} onChange={(value) => setNodeStyle("flexShrink", value)} />
                        <DimensionField label="Basis" value={dimensionValue("flexBasis")} onChange={(value) => setNodeStyle("flexBasis", value)} placeholder="auto" />
                      </div>
                    </div>
                  </div>
                )}

                {inspectorTab === "style" && (
                  <div className="inspector-sections space-y-3.5">
                    {(selected.type === "heading" || selected.type === "text" || selected.type === "button" || selected.type === "input" || selected.type === "badge") && (
                      <div className="space-y-3">
                        <h3 className="text-[11px] font-bold text-slate-700">文字 Typography</h3>
                        <div className="grid grid-cols-2 gap-2">
                          <DimensionField label="Font Size" value={dimensionValue("fontSize")} onChange={(value) => setNodeStyle("fontSize", Number.isFinite(Number(value)) ? Number(value) : value)} placeholder="16 / 1rem / clamp(...)" />
                          <NumberField label="Font Weight" value={editableNumberValue("fontWeight")} min={100} max={950} step={50} onChange={(value) => setNodeStyle("fontWeight", value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <DimensionField label="Line Height" value={dimensionValue("lineHeight")} onChange={(value) => setNodeStyle("lineHeight", Number.isFinite(Number(value)) ? Number(value) : value)} placeholder="1.5 / 24px" />
                          <DimensionField label="Letter Spacing" value={dimensionValue("letterSpacing")} onChange={(value) => setNodeStyle("letterSpacing", value)} placeholder="-0.02em / 1px" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <SelectField label="Text Align" value={dimensionValue("textAlign") || "left"} onChange={(value) => setNodeStyle("textAlign", value)} options={[{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }, { value: "justify", label: "Justify" }]} />
                          <ColorField label="文字颜色" value={dimensionValue("color")} onChange={(value) => setNodeStyle("color", value)} />
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <h3 className="text-[11px] font-bold text-slate-700">背景 Background</h3>
                      <TextField label="背景值" value={dimensionValue("background")} onChange={(value) => setNodeStyle("background", value)} placeholder="#fff / linear-gradient(...)" />
                      <div className="grid grid-cols-2 gap-2">
                        {GRADIENT_PRESETS.map((preset) => (
                          <PatchButton key={preset.label} onClick={() => setNodeStyle("background", preset.value)}>{preset.label}</PatchButton>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-[11px] font-bold text-slate-700">边框与圆角</h3>
                      <TextField label="Border" value={dimensionValue("border")} onChange={(value) => setNodeStyle("border", value)} placeholder="1px solid #e7e0d5" />
                      <div className="grid grid-cols-2 gap-2">
                        <DimensionField label="Radius" value={dimensionValue("borderRadius")} onChange={(value) => setNodeStyle("borderRadius", Number.isFinite(Number(value)) ? Number(value) : value)} placeholder="16 / 24px / 999px" />
                        <SelectField label="Object Fit" value={dimensionValue("objectFit") || "cover"} onChange={(value) => setNodeStyle("objectFit", value)} options={[{ value: "cover", label: "Cover" }, { value: "contain", label: "Contain" }, { value: "fill", label: "Fill" }, { value: "none", label: "None" }]} />
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <DimensionField label="TL" value={dimensionValue("borderTopLeftRadius")} onChange={(value) => setNodeStyle("borderTopLeftRadius", value)} />
                        <DimensionField label="TR" value={dimensionValue("borderTopRightRadius")} onChange={(value) => setNodeStyle("borderTopRightRadius", value)} />
                        <DimensionField label="BR" value={dimensionValue("borderBottomRightRadius")} onChange={(value) => setNodeStyle("borderBottomRightRadius", value)} />
                        <DimensionField label="BL" value={dimensionValue("borderBottomLeftRadius")} onChange={(value) => setNodeStyle("borderBottomLeftRadius", value)} />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-[11px] font-bold text-slate-700">效果 Effects</h3>
                      <SelectField label="阴影" value={dimensionValue("boxShadow")} onChange={(value) => setNodeStyle("boxShadow", value)} options={SHADOW_PRESETS} />
                      <div className="grid grid-cols-2 gap-2">
                        <NumberField label="透明度" value={typeof editableStyle.opacity === "number" ? editableStyle.opacity : 1} min={0} max={1} step={0.05} onChange={(value) => setNodeStyle("opacity", value)} />
                        <DimensionField label="Filter" value={dimensionValue("filter")} onChange={(value) => setNodeStyle("filter", value)} placeholder="blur(4px)" />
                      </div>
                    </div>
                  </div>
                )}

                {inspectorTab === "advanced" && (
                  <div className="inspector-sections space-y-3.5">
                    <div className="space-y-3">
                      <h3 className="text-[11px] font-bold text-slate-700">定位 Position</h3>
                      <SelectField label="Position" value={dimensionValue("position") || "static"} onChange={(value) => setNodeStyle("position", value)} options={[{ value: "static", label: "Static" }, { value: "relative", label: "Relative" }, { value: "absolute", label: "Absolute" }, { value: "sticky", label: "Sticky" }, { value: "fixed", label: "Fixed" }]} />
                      <div className="grid grid-cols-4 gap-2">
                        <DimensionField label="Top" value={dimensionValue("top")} onChange={(value) => setNodeStyle("top", value)} />
                        <DimensionField label="Right" value={dimensionValue("right")} onChange={(value) => setNodeStyle("right", value)} />
                        <DimensionField label="Bottom" value={dimensionValue("bottom")} onChange={(value) => setNodeStyle("bottom", value)} />
                        <DimensionField label="Left" value={dimensionValue("left")} onChange={(value) => setNodeStyle("left", value)} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <NumberField label="Z Index" value={editableNumberValue("zIndex")} min={-10} max={999} onChange={(value) => setNodeStyle("zIndex", value)} />
                        <SelectField label="Align Self" value={dimensionValue("alignSelf") || "auto"} onChange={(value) => setNodeStyle("alignSelf", value)} options={[{ value: "auto", label: "Auto" }, { value: "stretch", label: "Stretch" }, { value: "flex-start", label: "Start" }, { value: "center", label: "Center" }, { value: "flex-end", label: "End" }]} />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-[11px] font-bold text-slate-700">变换 Transform</h3>
                      <TextField label="Transform" value={dimensionValue("transform")} onChange={(value) => setNodeStyle("transform", value)} placeholder="translateY(-8px) scale(1.05)" />
                      <div className="grid grid-cols-2 gap-2">
                        <PatchButton onClick={() => setNodeStyle("transform", "translateY(-8px)")}>上浮</PatchButton>
                        <PatchButton onClick={() => setNodeStyle("transform", "scale(1.05)")}>放大</PatchButton>
                        <PatchButton onClick={() => setNodeStyle("transform", "rotate(-3deg)")}>轻旋转</PatchButton>
                        <PatchButton onClick={() => setNodeStyle("transform", undefined)}>清除</PatchButton>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-[11px] font-bold text-slate-700">CSS 速写</h3>
                      <TextField label="Box Shadow" value={dimensionValue("boxShadow")} onChange={(value) => setNodeStyle("boxShadow", value)} placeholder="0 20px 60px rgba(...)" />
                      <TextField label="Transition" value={dimensionValue("transition")} onChange={(value) => setNodeStyle("transition", value)} placeholder="all .2s ease" />
                      <TextField label="Cursor" value={dimensionValue("cursor")} onChange={(value) => setNodeStyle("cursor", value)} placeholder="pointer / default" />
                    </div>
                  </div>
                )}

                <div className="sticky bottom-0 grid grid-cols-3 gap-2 rounded-[18px] border border-slate-200/80 bg-white/95 p-2 shadow-[0_-8px_28px_rgba(15,23,42,.06)] backdrop-blur">
                  <button onClick={copySelected} className="rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-xs font-bold text-slate-600 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700">复制</button>
                  <button onClick={duplicateSelected} disabled={selected.locked} className="rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-xs font-bold text-slate-600 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-40">副本</button>
                  <button onClick={deleteSelected} disabled={selected.locked} className="rounded-xl bg-red-50 px-2 py-2.5 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-40">删除</button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </main>

      {showCode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.currentTarget === event.target) setShowCode(false) }}>
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-slate-950 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
              <div>
                <h3 className="text-sm font-bold text-white">导出项目</h3>
                <p className="mt-0.5 text-[11px] text-slate-400">JSX / HTML 会包含响应式 CSS；JSON 用于继续编辑。</p>
              </div>
              <button onClick={() => setShowCode(false)} className="ml-auto flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white">✕</button>
            </div>
            <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
              <div className="flex rounded-xl bg-white/5 p-1">
                {([["jsx", "React JSX"], ["html", "HTML"], ["json", "项目 JSON"]] as Array<[ExportTab, string]>).map(([value, label]) => (
                  <button key={value} onClick={() => setExportTab(value)} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${exportTab === value ? "bg-white text-slate-900" : "text-slate-400 hover:text-white"}`}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="ml-auto flex gap-2">
                <button onClick={downloadExport} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10">下载文件</button>
                <button onClick={copyExport} className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-500">{copied ? "✓ 已复制" : "复制代码"}</button>
              </div>
            </div>
            <pre className="builder-scroll overflow-auto p-5 text-[12px] leading-6 text-slate-300"><code>{exportValue}</code></pre>
          </div>
        </div>
      )}

      {showPreview && (
        <div className="fixed inset-0 z-[105] bg-[#f3f5f9] p-3 sm:p-6">
          <div className="mx-auto flex h-full max-w-[1600px] flex-col overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-2xl shadow-stone-300/40">
            <div className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                实时预览
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="hidden text-[10px] text-slate-400 sm:inline">{totalNodeCount} 个组件 · {device}</span>
                <button onClick={() => setShowPreview(false)} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-600">返回编辑</button>
              </div>
            </div>
            <div className="builder-scroll flex-1 overflow-auto bg-stone-100 p-4 sm:p-8">
              <div style={{ width: canvasWidth }} className="mx-auto min-h-full max-w-full overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl">
                <div className="min-h-[700px] p-5 sm:p-8">
                  {!nodes.length ? (
                    <div className="flex min-h-[600px] items-center justify-center text-sm text-slate-400">暂无内容</div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {nodes.map((node, index) => <div key={node.id}>{renderNode(node, null, index, "preview")}</div>)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showClearConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[24px] bg-white p-5 shadow-2xl">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-lg">⚠</div>
            <h3 className="mt-4 text-base font-bold text-slate-900">清空整个画布？</h3>
            <p className="mt-2 text-xs leading-6 text-slate-500">所有当前组件都会被移除。你仍然可以通过“撤销”恢复这次操作。</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowClearConfirm(false)} className="rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-semibold text-slate-600">取消</button>
              <button
                onClick={() => {
                  commitNodes([])
                  setSelectedId(null)
                  setShowClearConfirm(false)
                  flash("画布已清空，可使用撤销恢复")
                }}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-xs font-semibold text-white"
              >
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
