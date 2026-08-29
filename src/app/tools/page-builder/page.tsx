'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

type Device = 'desktop' | 'tablet' | 'mobile'
type LeftTab = 'components' | 'layers' | 'templates'
type ExportTab = 'jsx' | 'html' | 'json'
type SaveStatus = 'saved' | 'saving' | 'error'
type NodeType = 'container' | 'heading' | 'text' | 'button' | 'input' | 'image' | 'spacer'

type BuilderNode = {
  id: string
  type: NodeType
  props: {
    text?: string
    placeholder?: string
    src?: string
    alt?: string
    href?: string
  }
  style: React.CSSProperties
  children?: BuilderNode[]
}

type ProjectData = {
  version: 2
  name: string
  nodes: BuilderNode[]
  updatedAt: number
}

type DragPayload =
  | { kind: 'new'; nodeType: NodeType }
  | { kind: 'move'; nodeId: string }

type LocationInfo = {
  parentId: string | null
  index: number
}

const STORAGE_KEY = 'bitleap-page-builder-v2'
const LEGACY_STORAGE_KEY = 'bitleap-page-builder-v1'
const HISTORY_LIMIT = 80
const NODE_TYPES: NodeType[] = ['container', 'heading', 'text', 'button', 'input', 'image', 'spacer']

const COMPONENTS: Array<{ type: NodeType; label: string; icon: string; desc: string }> = [
  { type: 'container', label: '容器', icon: '▣', desc: '布局、分组与嵌套' },
  { type: 'heading', label: '标题', icon: 'H', desc: '页面标题与区块标题' },
  { type: 'text', label: '文本', icon: 'T', desc: '正文与说明文字' },
  { type: 'button', label: '按钮', icon: '●', desc: 'CTA 与操作入口' },
  { type: 'input', label: '输入框', icon: '⌨', desc: '表单输入控件' },
  { type: 'image', label: '图片', icon: '◫', desc: '网络图片与 Banner' },
  { type: 'spacer', label: '间距', icon: '↕', desc: '控制页面留白' },
]

const DEFAULT_STYLES: Record<NodeType, React.CSSProperties> = {
  container: {
    display: 'flex', flexDirection: 'column', gap: 16, padding: 24, width: '100%', minHeight: 120,
    borderRadius: 20, background: '#ffffff', border: '1px solid #e5e7eb',
  },
  heading: {
    margin: 0, fontSize: 40, lineHeight: 1.12, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.035em',
  },
  text: { margin: 0, fontSize: 16, lineHeight: 1.7, color: '#475569' },
  button: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start',
    padding: '12px 20px', borderRadius: 12, border: 'none', background: '#7c3aed', color: '#ffffff',
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
  },
  input: {
    width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1',
    background: '#ffffff', color: '#0f172a', fontSize: 14, outline: 'none',
  },
  image: {
    display: 'block', width: '100%', height: 240, objectFit: 'cover', borderRadius: 16, background: '#f1f5f9',
  },
  spacer: { height: 40, width: '100%' },
}

function uid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `node-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function createNode(type: NodeType): BuilderNode {
  const base: BuilderNode = { id: uid(), type, props: {}, style: { ...DEFAULT_STYLES[type] } }
  switch (type) {
    case 'container': return { ...base, children: [] }
    case 'heading': return { ...base, props: { text: '这是一个标题' } }
    case 'text': return { ...base, props: { text: '这里是一段正文内容。你可以在右侧属性面板中修改文字与样式。' } }
    case 'button': return { ...base, props: { text: '立即开始', href: '#' } }
    case 'input': return { ...base, props: { placeholder: '请输入内容...' } }
    case 'image': return {
      ...base,
      props: {
        src: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80',
        alt: '示例图片',
      },
    }
    case 'spacer': return base
  }
}

function cloneNodeDeep(node: BuilderNode): BuilderNode {
  return {
    ...node,
    id: uid(),
    props: { ...node.props },
    style: { ...node.style },
    children: node.children?.map(cloneNodeDeep),
  }
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
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (node.id === id) return { parentId, index: i }
    if (node.children) {
      const found = getLocation(node.children, id, node.id)
      if (found) return found
    }
  }
  return null
}

function updateNode(nodes: BuilderNode[], id: string, updater: (node: BuilderNode) => BuilderNode): BuilderNode[] {
  return nodes.map(node => {
    if (node.id === id) return updater(node)
    if (node.children) return { ...node, children: updateNode(node.children, id, updater) }
    return node
  })
}

function removeNode(nodes: BuilderNode[], id: string): { next: BuilderNode[]; removed: BuilderNode | null } {
  let removed: BuilderNode | null = null
  const next = nodes
    .filter(node => {
      if (node.id === id) { removed = node; return false }
      return true
    })
    .map(node => {
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
    if (typeof index === 'number') next.splice(Math.max(0, Math.min(index, next.length)), 0, node)
    else next.push(node)
    return next
  }
  return nodes.map(item => {
    if (item.id === parentId) {
      const children = [...(item.children || [])]
      if (typeof index === 'number') children.splice(Math.max(0, Math.min(index, children.length)), 0, node)
      else children.push(node)
      return { ...item, children }
    }
    if (item.children) return { ...item, children: insertNode(item.children, parentId, node, index) }
    return item
  })
}

function hasDescendant(node: BuilderNode, id: string): boolean {
  if (!node.children) return false
  return node.children.some(child => child.id === id || hasDescendant(child, id))
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable
}

function validateNodes(value: unknown, depth = 0): value is BuilderNode[] {
  if (!Array.isArray(value) || depth > 20) return false
  return value.every(item => {
    if (!item || typeof item !== 'object') return false
    const node = item as Partial<BuilderNode>
    if (typeof node.id !== 'string' || !NODE_TYPES.includes(node.type as NodeType)) return false
    if (!node.props || typeof node.props !== 'object' || Array.isArray(node.props)) return false
    if (!node.style || typeof node.style !== 'object' || Array.isArray(node.style)) return false
    if (node.type === 'container') return node.children === undefined || validateNodes(node.children, depth + 1)
    return node.children === undefined || validateNodes(node.children, depth + 1)
  })
}

function styleValue(value: unknown) {
  if (typeof value === 'number') return String(value)
  return value ?? ''
}

function jsxStyleObject(style: React.CSSProperties) {
  const entries = Object.entries(style).filter(([, value]) => value !== undefined && value !== '')
  if (!entries.length) return ''
  const body = entries.map(([key, value]) => `${key}: ${typeof value === 'number' ? value : JSON.stringify(value)}`).join(', ')
  return ` style={{ ${body} }}`
}

function escapeJsxText(text: string) {
  return text.replace(/[{}]/g, match => (match === '{' ? '&#123;' : '&#125;'))
}

function escapeHtml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function cssStyle(style: React.CSSProperties) {
  return Object.entries(style)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${key.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)}:${value}`)
    .join(';')
}

function exportNode(node: BuilderNode, level = 1): string {
  const pad = '  '.repeat(level)
  const style = jsxStyleObject(node.style)
  switch (node.type) {
    case 'container': {
      const children = (node.children || []).map(child => exportNode(child, level + 1)).join('\n')
      return children ? `${pad}<div${style}>\n${children}\n${pad}</div>` : `${pad}<div${style} />`
    }
    case 'heading': return `${pad}<h2${style}>${escapeJsxText(node.props.text || '')}</h2>`
    case 'text': return `${pad}<p${style}>${escapeJsxText(node.props.text || '')}</p>`
    case 'button': return `${pad}<a href=${JSON.stringify(node.props.href || '#')} style={{ textDecoration: 'none' }}>\n${pad}  <button${style}>${escapeJsxText(node.props.text || '')}</button>\n${pad}</a>`
    case 'input': return `${pad}<input placeholder=${JSON.stringify(node.props.placeholder || '')}${style} />`
    case 'image': return `${pad}<img src=${JSON.stringify(node.props.src || '')} alt=${JSON.stringify(node.props.alt || '')}${style} />`
    case 'spacer': return `${pad}<div aria-hidden="true"${style} />`
  }
}

function exportHtmlNode(node: BuilderNode, level = 2): string {
  const pad = '  '.repeat(level)
  const style = cssStyle(node.style)
  const attr = style ? ` style="${escapeHtml(style)}"` : ''
  switch (node.type) {
    case 'container': {
      const children = (node.children || []).map(child => exportHtmlNode(child, level + 1)).join('\n')
      return `${pad}<div${attr}>${children ? `\n${children}\n${pad}` : ''}</div>`
    }
    case 'heading': return `${pad}<h2${attr}>${escapeHtml(node.props.text || '')}</h2>`
    case 'text': return `${pad}<p${attr}>${escapeHtml(node.props.text || '')}</p>`
    case 'button': return `${pad}<a href="${escapeHtml(node.props.href || '#')}" style="text-decoration:none"><button${attr}>${escapeHtml(node.props.text || '')}</button></a>`
    case 'input': return `${pad}<input placeholder="${escapeHtml(node.props.placeholder || '')}"${attr}>`
    case 'image': return `${pad}<img src="${escapeHtml(node.props.src || '')}" alt="${escapeHtml(node.props.alt || '')}"${attr}>`
    case 'spacer': return `${pad}<div aria-hidden="true"${attr}></div>`
  }
}

function generatePageCode(nodes: BuilderNode[]) {
  const body = nodes.map(node => exportNode(node, 2)).join('\n')
  return `'use client'\n\nexport default function GeneratedPage() {\n  return (\n    <main style={{ minHeight: '100vh', padding: '48px 24px', background: '#f8fafc' }}>\n      <div style={{ width: '100%', maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>\n${body || '        {/* 拖拽组件到画布后，这里会生成 JSX */}'}\n      </div>\n    </main>\n  )\n}\n`
}

function generateHtml(nodes: BuilderNode[]) {
  const body = nodes.map(node => exportHtmlNode(node, 3)).join('\n')
  return `<!doctype html>\n<html lang="zh-CN">\n  <head>\n    <meta charset="utf-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1">\n    <title>Generated Page</title>\n  </head>\n  <body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif">\n    <main style="min-height:100vh;padding:48px 24px">\n      <div style="width:100%;max-width:1100px;margin:0 auto;display:flex;flex-direction:column;gap:20px">\n${body || '        <!-- 拖拽组件到画布后，这里会生成 HTML -->'}\n      </div>\n    </main>\n  </body>\n</html>\n`
}

function makeHeroTemplate(): BuilderNode[] {
  const section = createNode('container')
  section.style = { ...section.style, minHeight: 520, justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '72px 32px', background: '#f8fafc' }
  const heading = createNode('heading'); heading.props.text = '把想法，更快变成产品'; heading.style = { ...heading.style, fontSize: 56, maxWidth: 760, textAlign: 'center' }
  const text = createNode('text'); text.props.text = '一个用于快速构建、预览和导出前端页面的可视化编辑器。'; text.style = { ...text.style, fontSize: 18, maxWidth: 620, textAlign: 'center' }
  const button = createNode('button'); button.props.text = '免费开始构建'; button.style = { ...button.style, alignSelf: 'center', padding: '14px 24px', borderRadius: 14 }
  section.children = [heading, text, button]
  return [section]
}

function makeLoginTemplate(): BuilderNode[] {
  const shell = createNode('container')
  shell.style = { ...shell.style, maxWidth: 460, margin: '48px auto', padding: 32, gap: 18, boxShadow: '0 24px 60px rgba(15,23,42,.10)' }
  const heading = createNode('heading'); heading.props.text = '欢迎回来'; heading.style = { ...heading.style, fontSize: 30 }
  const text = createNode('text'); text.props.text = '登录你的账户以继续。'; text.style = { ...text.style, fontSize: 14 }
  const email = createNode('input'); email.props.placeholder = '邮箱地址'
  const password = createNode('input'); password.props.placeholder = '密码'
  const button = createNode('button'); button.props.text = '登录'; button.style = { ...button.style, width: '100%', alignSelf: 'stretch' }
  shell.children = [heading, text, email, password, button]
  return [shell]
}

function makePricingTemplate(): BuilderNode[] {
  const root = createNode('container')
  root.style = { ...root.style, border: 'none', background: '#f8fafc', padding: '64px 24px', alignItems: 'center' }
  const heading = createNode('heading'); heading.props.text = '简单透明的价格'; heading.style = { ...heading.style, textAlign: 'center' }
  const subtitle = createNode('text'); subtitle.props.text = '选择适合你当前阶段的方案，随时可以升级。'; subtitle.style = { ...subtitle.style, textAlign: 'center' }
  const row = createNode('container'); row.style = { ...row.style, flexDirection: 'row', alignItems: 'stretch', background: 'transparent', border: 'none', padding: 0, maxWidth: 900 }
  const labels = [['基础版', '¥0 / 月'], ['专业版', '¥99 / 月'], ['团队版', '¥299 / 月']]
  row.children = labels.map(([name, price]) => {
    const card = createNode('container'); card.style = { ...card.style, flex: 1, minWidth: 0, padding: 24, boxShadow: '0 12px 30px rgba(15,23,42,.06)' }
    const title = createNode('heading'); title.props.text = name; title.style = { ...title.style, fontSize: 22 }
    const p = createNode('heading'); p.props.text = price; p.style = { ...p.style, fontSize: 30 }
    const copy = createNode('text'); copy.props.text = '包含核心编辑、实时预览与代码导出能力。'; copy.style = { ...copy.style, fontSize: 14 }
    const btn = createNode('button'); btn.props.text = '选择方案'; btn.style = { ...btn.style, width: '100%', alignSelf: 'stretch' }
    card.children = [title, p, copy, btn]
    return card
  })
  root.children = [heading, subtitle, row]
  return [root]
}

const TEMPLATES = [
  { id: 'hero', name: 'Hero 落地页', desc: '适合产品首页与营销页首屏', make: makeHeroTemplate },
  { id: 'login', name: '登录卡片', desc: '适合后台与 SaaS 登录入口', make: makeLoginTemplate },
  { id: 'pricing', name: '价格方案', desc: '三栏 Pricing 区块', make: makePricingTemplate },
]

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] font-semibold text-slate-500">{children}</span>
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="space-y-1.5"><FieldLabel>{label}</FieldLabel><input value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100" /></label>
}

function NumberField({ label, value, onChange, min, max, step = 1 }: { label: string; value: number | undefined; onChange: (value: number | undefined) => void; min?: number; max?: number; step?: number }) {
  return <label className="space-y-1.5"><FieldLabel>{label}</FieldLabel><input type="number" value={value ?? ''} min={min} max={max} step={step} onChange={e => onChange(e.target.value === '' ? undefined : Number(e.target.value))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100" /></label>
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return <label className="space-y-1.5"><FieldLabel>{label}</FieldLabel><select value={value} onChange={e => onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100">{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
}

function LayerTree({ nodes, selectedId, onSelect, depth = 0 }: { nodes: BuilderNode[]; selectedId: string | null; onSelect: (id: string) => void; depth?: number }) {
  return <div className="space-y-1">{nodes.map(node => {
    const meta = COMPONENTS.find(item => item.type === node.type)
    return <div key={node.id}>
      <button onClick={() => onSelect(node.id)} style={{ paddingLeft: 10 + depth * 14 }} className={`flex w-full items-center gap-2 rounded-lg py-2 pr-2 text-left text-xs transition ${selectedId === node.id ? 'bg-violet-100 text-violet-800' : 'text-slate-600 hover:bg-slate-100'}`}>
        <span className="w-4 text-center text-[10px] font-black">{meta?.icon}</span><span className="truncate">{node.props.text || meta?.label}</span>{node.children && <span className="ml-auto text-[9px] text-slate-400">{node.children.length}</span>}
      </button>
      {node.children && node.children.length > 0 && <LayerTree nodes={node.children} selectedId={selectedId} onSelect={onSelect} depth={depth + 1} />}
    </div>
  })}</div>
}

export default function PageBuilderPro() {
  const [nodes, setNodes] = useState<BuilderNode[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [projectName, setProjectName] = useState('未命名页面')
  const [device, setDevice] = useState<Device>('desktop')
  const [leftTab, setLeftTab] = useState<LeftTab>('components')
  const [exportTab, setExportTab] = useState<ExportTab>('jsx')
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [showCode, setShowCode] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [notice, setNotice] = useState('')
  const [copied, setCopied] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [hydrated, setHydrated] = useState(false)
  const undoRef = useRef<BuilderNode[][]>([])
  const redoRef = useRef<BuilderNode[][]>([])
  const clipboardRef = useRef<BuilderNode | null>(null)
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flash = useCallback((message: string) => {
    setNotice(message)
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    noticeTimerRef.current = setTimeout(() => setNotice(''), 1800)
  }, [])

  const commitNodes = useCallback((recipe: BuilderNode[] | ((prev: BuilderNode[]) => BuilderNode[])) => {
    setNodes(prev => {
      const next = typeof recipe === 'function' ? recipe(prev) : recipe
      if (next === prev) return prev
      undoRef.current = [...undoRef.current.slice(-(HISTORY_LIMIT - 1)), prev]
      redoRef.current = []
      return next
    })
  }, [])

  const undo = useCallback(() => {
    const previous = undoRef.current.at(-1)
    if (!previous) return
    setNodes(current => {
      redoRef.current = [...redoRef.current.slice(-(HISTORY_LIMIT - 1)), current]
      undoRef.current = undoRef.current.slice(0, -1)
      return previous
    })
    setSelectedId(null)
    flash('已撤销')
  }, [flash])

  const redo = useCallback(() => {
    const next = redoRef.current.at(-1)
    if (!next) return
    setNodes(current => {
      undoRef.current = [...undoRef.current.slice(-(HISTORY_LIMIT - 1)), current]
      redoRef.current = redoRef.current.slice(0, -1)
      return next
    })
    setSelectedId(null)
    flash('已重做')
  }, [flash])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ProjectData>
        if (validateNodes(parsed.nodes)) {
          setNodes(parsed.nodes)
          if (typeof parsed.name === 'string') setProjectName(parsed.name)
          setHydrated(true)
          return
        }
      }
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
      if (legacy) {
        const parsed = JSON.parse(legacy)
        if (validateNodes(parsed)) setNodes(parsed)
      }
    } catch {
      flash('本地草稿加载失败，已使用空白画布')
    } finally {
      setHydrated(true)
    }
  }, [flash])

  useEffect(() => {
    if (!hydrated) return
    setSaveStatus('saving')
    const timer = setTimeout(() => {
      try {
        const payload: ProjectData = { version: 2, name: projectName, nodes, updatedAt: Date.now() }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
        setSaveStatus('saved')
      } catch {
        setSaveStatus('error')
      }
    }, 320)
    return () => clearTimeout(timer)
  }, [nodes, projectName, hydrated])

  const selected = useMemo(() => selectedId ? getNode(nodes, selectedId) : null, [nodes, selectedId])
  const generatedCode = useMemo(() => generatePageCode(nodes), [nodes])
  const generatedHtml = useMemo(() => generateHtml(nodes), [nodes])
  const projectJson = useMemo(() => JSON.stringify({ version: 2, name: projectName, nodes }, null, 2), [nodes, projectName])
  const exportValue = exportTab === 'jsx' ? generatedCode : exportTab === 'html' ? generatedHtml : projectJson
  const canvasWidth = device === 'desktop' ? '100%' : device === 'tablet' ? '768px' : '390px'

  const setNodeStyle = useCallback((key: keyof React.CSSProperties, value: unknown) => {
    if (!selectedId) return
    commitNodes(prev => updateNode(prev, selectedId, node => ({ ...node, style: { ...node.style, [key]: value === '' ? undefined : value } })))
  }, [commitNodes, selectedId])

  const setNodeProp = useCallback((key: keyof BuilderNode['props'], value: string) => {
    if (!selectedId) return
    commitNodes(prev => updateNode(prev, selectedId, node => ({ ...node, props: { ...node.props, [key]: value } })))
  }, [commitNodes, selectedId])

  const deleteSelected = useCallback(() => {
    if (!selectedId) return
    commitNodes(prev => removeNode(prev, selectedId).next)
    setSelectedId(null)
    flash('组件已删除')
  }, [commitNodes, flash, selectedId])

  const duplicateSelected = useCallback(() => {
    if (!selectedId) return
    const source = getNode(nodes, selectedId)
    const location = getLocation(nodes, selectedId)
    if (!source || !location) return
    const copy = cloneNodeDeep(source)
    commitNodes(prev => insertNode(prev, location.parentId, copy, location.index + 1))
    setSelectedId(copy.id)
    flash('组件已复制')
  }, [commitNodes, flash, nodes, selectedId])

  const copySelected = useCallback(() => {
    if (!selected) return
    clipboardRef.current = cloneNodeDeep(selected)
    flash('已复制到编辑器剪贴板')
  }, [flash, selected])

  const pasteSelected = useCallback(() => {
    const source = clipboardRef.current
    if (!source) return
    const copy = cloneNodeDeep(source)
    const location = selectedId ? getLocation(nodes, selectedId) : null
    commitNodes(prev => insertNode(prev, location?.parentId ?? null, copy, location ? location.index + 1 : undefined))
    setSelectedId(copy.id)
    flash('已粘贴组件')
  }, [commitNodes, flash, nodes, selectedId])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return }
      if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return }
      if (isEditableTarget(e.target)) return
      if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSelected(); return }
      if (mod && e.key.toLowerCase() === 'c') { e.preventDefault(); copySelected(); return }
      if (mod && e.key.toLowerCase() === 'v') { e.preventDefault(); pasteSelected(); return }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelected(); return }
      if (e.key === 'Escape') setSelectedId(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [copySelected, deleteSelected, duplicateSelected, pasteSelected, redo, undo])

  const getPayload = (e: React.DragEvent): DragPayload | null => {
    try {
      const raw = e.dataTransfer.getData('application/x-page-builder')
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  }

  const handleDrop = (e: React.DragEvent, parentId: string | null, index?: number) => {
    e.preventDefault(); e.stopPropagation(); setDragOverId(null)
    const payload = getPayload(e)
    if (!payload) return
    if (payload.kind === 'new') {
      const node = createNode(payload.nodeType)
      commitNodes(prev => insertNode(prev, parentId, node, index))
      setSelectedId(node.id)
      return
    }
    const moving = getNode(nodes, payload.nodeId)
    if (!moving || parentId === moving.id || (parentId && hasDescendant(moving, parentId))) return
    const oldLocation = getLocation(nodes, moving.id)
    const result = removeNode(nodes, moving.id)
    if (!result.removed) return
    let adjustedIndex = index
    if (oldLocation && oldLocation.parentId === parentId && typeof index === 'number' && oldLocation.index < index) adjustedIndex = index - 1
    commitNodes(insertNode(result.next, parentId, result.removed, adjustedIndex))
    setSelectedId(moving.id)
  }

  const importJson = () => {
    const raw = window.prompt('粘贴 Page Builder JSON：')
    if (!raw) return
    try {
      const parsed = JSON.parse(raw)
      const candidate = Array.isArray(parsed) ? parsed : parsed?.nodes
      if (!validateNodes(candidate)) throw new Error('invalid')
      commitNodes(candidate)
      if (!Array.isArray(parsed) && typeof parsed.name === 'string') setProjectName(parsed.name)
      setSelectedId(null)
      flash('JSON 已安全导入')
    } catch { flash('JSON 无效或结构不受支持') }
  }

  const applyTemplate = (make: () => BuilderNode[]) => {
    const template = make()
    commitNodes(prev => prev.length ? [...prev, ...template] : template)
    setSelectedId(template[0]?.id || null)
    setLeftTab('layers')
    flash('模板已添加到画布')
  }

  const copyExport = async () => {
    try {
      await navigator.clipboard.writeText(exportValue)
      setCopied(true); setTimeout(() => setCopied(false), 1400)
    } catch { flash('复制失败，请检查剪贴板权限') }
  }

  const renderNode = (node: BuilderNode, parentId: string | null, index: number): React.ReactNode => {
    const isSelected = selectedId === node.id
    const dropActive = dragOverId === node.id
    const commonProps = {
      draggable: true,
      onDragStart: (e: React.DragEvent) => {
        e.stopPropagation(); e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('application/x-page-builder', JSON.stringify({ kind: 'move', nodeId: node.id } satisfies DragPayload))
      },
      onClick: (e: React.MouseEvent) => { e.stopPropagation(); setSelectedId(node.id) },
      onDragOver: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragOverId(node.id) },
      onDragLeave: (e: React.DragEvent) => { e.stopPropagation(); if (dragOverId === node.id) setDragOverId(null) },
    }
    const wrapperClass = `group/node relative rounded-[18px] transition ${isSelected ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-white' : 'hover:ring-2 hover:ring-violet-200'}`
    let content: React.ReactNode
    switch (node.type) {
      case 'container': content = <div style={node.style} onDrop={e => handleDrop(e, node.id)} className={dropActive ? 'outline outline-2 outline-dashed outline-violet-400' : ''}>{(node.children || []).length === 0 ? <div className="flex min-h-20 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-4 text-center text-xs text-slate-400">拖拽组件到这个容器</div> : node.children!.map((child, childIndex) => <div key={child.id}><div onDragOver={e => { e.preventDefault(); e.stopPropagation() }} onDrop={e => handleDrop(e, node.id, childIndex)} className="h-2 rounded-full transition hover:bg-violet-300" />{renderNode(child, node.id, childIndex)}</div>)}</div>; break
      case 'heading': content = <h2 style={node.style}>{node.props.text}</h2>; break
      case 'text': content = <p style={node.style}>{node.props.text}</p>; break
      case 'button': content = <button type="button" style={node.style}>{node.props.text}</button>; break
      case 'input': content = <input readOnly placeholder={node.props.placeholder} style={node.style} />; break
      case 'image': content = <img src={node.props.src} alt={node.props.alt || ''} style={node.style} draggable={false} />; break
      case 'spacer': content = <div aria-hidden="true" style={node.style} className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50" />; break
    }
    return <div {...commonProps} className={wrapperClass}>
      {isSelected && <div className="pointer-events-none absolute -top-3 left-3 z-20 rounded-lg bg-violet-600 px-2 py-1 text-[10px] font-semibold text-white shadow-lg">{COMPONENTS.find(item => item.type === node.type)?.label}</div>}
      {content}
      <div onDragOver={e => { e.preventDefault(); e.stopPropagation() }} onDrop={e => handleDrop(e, parentId, index + 1)} className="absolute -bottom-2 left-0 right-0 z-10 h-4" />
    </div>
  }

  const saveLabel = saveStatus === 'saved' ? '已保存' : saveStatus === 'saving' ? '保存中…' : '保存失败'
  const saveDot = saveStatus === 'saved' ? 'bg-emerald-500' : saveStatus === 'saving' ? 'bg-amber-400' : 'bg-red-500'

  return <div className="min-h-screen bg-slate-100 text-slate-900">
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className='mt-2 ml-2'><Breadcrumb /></div>
      <div className="flex min-h-16 items-center gap-3 px-4 lg:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <input value={projectName} onChange={e => setProjectName(e.target.value)} className="w-36 truncate rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-bold text-slate-900 outline-none transition hover:border-slate-200 focus:border-violet-300 focus:bg-white sm:w-52" aria-label="项目名称" />
          <span className={`hidden h-2 w-2 rounded-full sm:block ${saveDot}`} /><span className="hidden text-[10px] text-slate-400 sm:block">{saveLabel}</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={undo} disabled={undoRef.current.length === 0} title="撤销 Ctrl/⌘ + Z" className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30">↶</button>
          <button onClick={redo} disabled={redoRef.current.length === 0} title="重做 Ctrl/⌘ + Shift + Z" className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30">↷</button>
          <div className="mx-1 hidden h-6 w-px bg-slate-200 md:block" />
          <div className="hidden rounded-xl bg-slate-100 p-1 md:flex">{([['desktop','桌面'],['tablet','平板'],['mobile','手机']] as Array<[Device,string]>).map(([value,label]) => <button key={value} onClick={() => setDevice(value)} className={`rounded-lg px-3 py-2 text-xs font-medium transition ${device === value ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>{label}</button>)}</div>
          <button onClick={importJson} className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700 lg:block">导入</button>
          <button onClick={() => setShowCode(true)} className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-violet-600 active:scale-95">导出</button>
        </div>
      </div>
    </header>

    {notice && <div className="fixed left-1/2 top-20 z-[120] -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-2xl">{notice}</div>}

    <main className="grid min-h-[calc(100vh-65px)] grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)_310px]">
      <aside className="border-b border-slate-200 bg-white lg:border-b-0 lg:border-r">
        <div className="sticky top-16 max-h-[calc(100vh-65px)] overflow-y-auto p-3">
          <div className="grid grid-cols-3 rounded-xl bg-slate-100 p-1">{([['components','组件'],['layers','图层'],['templates','模板']] as Array<[LeftTab,string]>).map(([value,label]) => <button key={value} onClick={() => setLeftTab(value)} className={`rounded-lg px-2 py-2 text-[11px] font-semibold transition ${leftTab === value ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500'}`}>{label}</button>)}</div>
          {leftTab === 'components' && <div className="mt-4 space-y-2">{COMPONENTS.map(item => <div key={item.type} draggable onDragStart={e => { e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('application/x-page-builder', JSON.stringify({ kind: 'new', nodeType: item.type } satisfies DragPayload)) }} className="group cursor-grab rounded-2xl border border-slate-200 bg-white p-3 transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-lg hover:shadow-violet-500/10 active:cursor-grabbing"><div className="flex items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-black text-slate-600 transition group-hover:bg-violet-100 group-hover:text-violet-700">{item.icon}</div><div className="min-w-0"><div className="text-xs font-semibold text-slate-800">{item.label}</div><div className="mt-0.5 truncate text-[10px] text-slate-400">{item.desc}</div></div></div></div>)}</div>}
          {leftTab === 'layers' && <div className="mt-4">{nodes.length ? <LayerTree nodes={nodes} selectedId={selectedId} onSelect={setSelectedId} /> : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-xs text-slate-400">画布暂无图层</div>}</div>}
          {leftTab === 'templates' && <div className="mt-4 space-y-2">{TEMPLATES.map(template => <button key={template.id} onClick={() => applyTemplate(template.make)} className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-violet-300 hover:shadow-lg hover:shadow-violet-500/10"><div className="text-xs font-bold text-slate-800">{template.name}</div><div className="mt-1 text-[10px] leading-5 text-slate-400">{template.desc}</div><div className="mt-3 text-[10px] font-semibold text-violet-600">添加到画布 →</div></button>)}</div>}
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-[10px] leading-5 text-slate-500"><b className="text-slate-700">快捷键</b><br />⌘/Ctrl Z 撤销 · ⇧⌘/Ctrl Z 重做<br />⌘/Ctrl D 复制 · Delete 删除<br />⌘/Ctrl C / V 编辑器内复制粘贴</div>
        </div>
      </aside>

      <section className="min-w-0 bg-slate-100/80">
        <div className="flex min-h-12 items-center justify-between border-b border-slate-200 px-4 py-2">
          <div className="flex items-center gap-2 text-xs text-slate-500"><span className={`h-2 w-2 rounded-full ${saveDot}`} />{saveLabel}<span className="hidden text-slate-300 sm:inline">·</span><span className="hidden text-slate-400 sm:inline">{nodes.length} 个顶层区块</span></div>
          <div className="flex gap-1"><button onClick={duplicateSelected} disabled={!selected} className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-white hover:text-slate-900 disabled:opacity-30">复制</button><button onClick={copySelected} disabled={!selected} className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-white hover:text-slate-900 disabled:opacity-30">复制到剪贴板</button><button onClick={() => setShowClearConfirm(true)} disabled={!nodes.length} className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-30">清空</button></div>
        </div>
        <div className="overflow-auto p-4 sm:p-7">
          <div style={{ width: canvasWidth }} className="mx-auto min-h-[740px] max-w-full overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl shadow-slate-300/40 transition-all duration-300">
            <div className="flex h-10 items-center gap-2 border-b border-slate-100 bg-slate-50 px-4"><span className="h-2.5 w-2.5 rounded-full bg-red-300" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-300" /><div className="ml-3 flex h-6 flex-1 items-center rounded-md border border-slate-200 bg-white px-2 text-[9px] text-slate-300">preview.local/{projectName.replace(/\s+/g,'-').toLowerCase()}</div></div>
            <div onClick={() => setSelectedId(null)} onDragOver={e => { e.preventDefault(); setDragOverId('root') }} onDragLeave={() => { if (dragOverId === 'root') setDragOverId(null) }} onDrop={e => handleDrop(e, null)} className={`min-h-[700px] p-5 sm:p-8 ${dragOverId === 'root' ? 'bg-violet-50/60' : 'bg-white'}`}>
              {!nodes.length ? <div className="flex min-h-[610px] items-center justify-center"><div className="max-w-sm text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-violet-100 text-2xl text-violet-700">✦</div><h3 className="mt-5 text-lg font-bold text-slate-800">开始搭建你的页面</h3><p className="mt-2 text-xs leading-6 text-slate-400">从左侧拖入组件，或直接套用一个模板。所有修改都会自动保存在当前浏览器。</p><button onClick={e => { e.stopPropagation(); setLeftTab('templates') }} className="mt-4 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-violet-500">浏览模板</button></div></div> : <div className="flex flex-col gap-4">{nodes.map((node,index) => <div key={node.id}><div onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e,null,index)} className="h-2 rounded-full transition hover:bg-violet-300" />{renderNode(node,null,index)}</div>)}</div>}
            </div>
          </div>
          <FooterNote />
        </div>
      </section>

      <aside className="border-t border-slate-200 bg-white lg:border-l lg:border-t-0">
        <div className="sticky top-16 max-h-[calc(100vh-65px)] overflow-y-auto p-4">
          <div className="mb-4"><h2 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">属性面板</h2><p className="mt-1 text-[11px] text-slate-400">{selected ? `正在编辑：${COMPONENTS.find(item => item.type === selected.type)?.label}` : '请选择一个组件'}</p></div>
          {!selected ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center"><div className="text-2xl">↖</div><p className="mt-2 text-xs font-medium text-slate-500">点击画布或图层中的组件</p><p className="mt-1 text-[10px] leading-5 text-slate-400">选中后可以修改内容、尺寸、排版、布局与外观。</p></div> : <div className="space-y-5">
            {(selected.type === 'heading' || selected.type === 'text' || selected.type === 'button') && <div className="space-y-3"><h3 className="text-[11px] font-bold text-slate-700">内容</h3><label className="space-y-1.5"><FieldLabel>文字</FieldLabel><textarea value={selected.props.text || ''} onChange={e => setNodeProp('text',e.target.value)} rows={4} className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100" /></label></div>}
            {selected.type === 'button' && <TextField label="链接" value={selected.props.href || ''} onChange={value => setNodeProp('href',value)} placeholder="#" />}
            {selected.type === 'input' && <TextField label="Placeholder" value={selected.props.placeholder || ''} onChange={value => setNodeProp('placeholder',value)} />}
            {selected.type === 'image' && <div className="space-y-3"><TextField label="图片地址" value={selected.props.src || ''} onChange={value => setNodeProp('src',value)} /><TextField label="Alt" value={selected.props.alt || ''} onChange={value => setNodeProp('alt',value)} /><SelectField label="图片裁切" value={String(selected.style.objectFit || 'cover')} onChange={value => setNodeStyle('objectFit',value as React.CSSProperties['objectFit'])} options={[{value:'cover',label:'Cover'},{value:'contain',label:'Contain'},{value:'fill',label:'Fill'}]} /></div>}
            <div className="h-px bg-slate-100" />
            <div className="space-y-3"><h3 className="text-[11px] font-bold text-slate-700">尺寸与间距</h3><div className="grid grid-cols-2 gap-2"><TextField label="宽度" value={String(styleValue(selected.style.width))} onChange={value => setNodeStyle('width',value)} placeholder="100%" /><TextField label="高度" value={String(styleValue(selected.style.height))} onChange={value => setNodeStyle('height',value)} placeholder="auto" /></div><div className="grid grid-cols-2 gap-2"><TextField label="最大宽度" value={String(styleValue(selected.style.maxWidth))} onChange={value => setNodeStyle('maxWidth',value)} placeholder="none" /><TextField label="最小高度" value={String(styleValue(selected.style.minHeight))} onChange={value => setNodeStyle('minHeight',value)} placeholder="auto" /></div><TextField label="Padding" value={String(styleValue(selected.style.padding))} onChange={value => setNodeStyle('padding',value)} placeholder="24px" /><TextField label="Margin" value={String(styleValue(selected.style.margin))} onChange={value => setNodeStyle('margin',value)} placeholder="0" /><div className="grid grid-cols-2 gap-2"><NumberField label="圆角" value={typeof selected.style.borderRadius === 'number' ? selected.style.borderRadius : undefined} min={0} max={120} onChange={value => setNodeStyle('borderRadius',value)} /><NumberField label="Gap" value={typeof selected.style.gap === 'number' ? selected.style.gap : undefined} min={0} max={120} onChange={value => setNodeStyle('gap',value)} /></div></div>
            {(selected.type === 'heading' || selected.type === 'text' || selected.type === 'button' || selected.type === 'input') && <><div className="h-px bg-slate-100" /><div className="space-y-3"><h3 className="text-[11px] font-bold text-slate-700">文字</h3><div className="grid grid-cols-2 gap-2"><NumberField label="字号" value={typeof selected.style.fontSize === 'number' ? selected.style.fontSize : undefined} min={8} max={160} onChange={value => setNodeStyle('fontSize',value)} /><NumberField label="字重" value={typeof selected.style.fontWeight === 'number' ? selected.style.fontWeight : undefined} min={100} max={900} step={100} onChange={value => setNodeStyle('fontWeight',value)} /></div><SelectField label="对齐" value={String(selected.style.textAlign || 'left')} onChange={value => setNodeStyle('textAlign',value as React.CSSProperties['textAlign'])} options={[{value:'left',label:'左对齐'},{value:'center',label:'居中'},{value:'right',label:'右对齐'}]} /></div></>}
            {selected.type === 'container' && <><div className="h-px bg-slate-100" /><div className="space-y-3"><h3 className="text-[11px] font-bold text-slate-700">Flex 布局</h3><SelectField label="方向" value={String(selected.style.flexDirection || 'column')} onChange={value => setNodeStyle('flexDirection',value as React.CSSProperties['flexDirection'])} options={[{value:'column',label:'纵向 Column'},{value:'row',label:'横向 Row'}]} /><SelectField label="主轴对齐" value={String(selected.style.justifyContent || 'flex-start')} onChange={value => setNodeStyle('justifyContent',value as React.CSSProperties['justifyContent'])} options={[{value:'flex-start',label:'开始'},{value:'center',label:'居中'},{value:'flex-end',label:'结束'},{value:'space-between',label:'两端对齐'},{value:'space-around',label:'环绕'}]} /><SelectField label="交叉轴" value={String(selected.style.alignItems || 'stretch')} onChange={value => setNodeStyle('alignItems',value as React.CSSProperties['alignItems'])} options={[{value:'stretch',label:'拉伸'},{value:'flex-start',label:'开始'},{value:'center',label:'居中'},{value:'flex-end',label:'结束'}]} /><SelectField label="换行" value={String(selected.style.flexWrap || 'nowrap')} onChange={value => setNodeStyle('flexWrap',value as React.CSSProperties['flexWrap'])} options={[{value:'nowrap',label:'不换行'},{value:'wrap',label:'自动换行'}]} /></div></>}
            <div className="h-px bg-slate-100" />
            <div className="space-y-3"><h3 className="text-[11px] font-bold text-slate-700">外观</h3><div className="grid grid-cols-2 gap-2"><label className="space-y-1.5"><FieldLabel>文字颜色</FieldLabel><input type="color" value={typeof selected.style.color === 'string' && selected.style.color.startsWith('#') ? selected.style.color : '#0f172a'} onChange={e => setNodeStyle('color',e.target.value)} className="h-10 w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-1" /></label><label className="space-y-1.5"><FieldLabel>背景颜色</FieldLabel><input type="color" value={typeof selected.style.background === 'string' && selected.style.background.startsWith('#') ? selected.style.background : '#ffffff'} onChange={e => setNodeStyle('background',e.target.value)} className="h-10 w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-1" /></label></div><TextField label="Border" value={String(styleValue(selected.style.border))} onChange={value => setNodeStyle('border',value)} placeholder="1px solid #e5e7eb" /><SelectField label="阴影" value={String(selected.style.boxShadow || '')} onChange={value => setNodeStyle('boxShadow',value)} options={[{value:'',label:'无阴影'},{value:'0 8px 24px rgba(15,23,42,.08)',label:'柔和'},{value:'0 18px 45px rgba(15,23,42,.12)',label:'浮层'},{value:'0 28px 70px rgba(15,23,42,.18)',label:'强阴影'}]} /><NumberField label="透明度" value={typeof selected.style.opacity === 'number' ? selected.style.opacity : 1} min={0} max={1} step={0.05} onChange={value => setNodeStyle('opacity',value)} /></div>
            <div className="grid grid-cols-3 gap-2 pt-2"><button onClick={copySelected} className="rounded-xl border border-slate-200 px-2 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-violet-300 hover:text-violet-700">复制</button><button onClick={duplicateSelected} className="rounded-xl border border-slate-200 px-2 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-violet-300 hover:text-violet-700">副本</button><button onClick={deleteSelected} className="rounded-xl border border-red-100 bg-red-50 px-2 py-2.5 text-xs font-semibold text-red-600 transition hover:bg-red-100">删除</button></div>
          </div>}
        </div>
      </aside>
    </main>

    {showCode && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={e => { if (e.currentTarget === e.target) setShowCode(false) }}><div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-slate-950 shadow-2xl"><div className="flex items-center gap-3 border-b border-white/10 px-5 py-4"><div><h3 className="text-sm font-bold text-white">导出项目</h3><p className="mt-0.5 text-[11px] text-slate-400">JSX 用于 React，HTML 可直接预览，JSON 用于继续编辑。</p></div><button onClick={() => setShowCode(false)} className="ml-auto flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white">✕</button></div><div className="flex items-center gap-2 border-b border-white/10 px-5 py-3"><div className="flex rounded-xl bg-white/5 p-1">{([['jsx','React JSX'],['html','HTML'],['json','项目 JSON']] as Array<[ExportTab,string]>).map(([value,label]) => <button key={value} onClick={() => setExportTab(value)} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${exportTab === value ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'}`}>{label}</button>)}</div><button onClick={copyExport} className="ml-auto rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-500">{copied ? '✓ 已复制' : '复制代码'}</button></div><pre className="overflow-auto p-5 text-[12px] leading-6 text-slate-300"><code>{exportValue}</code></pre></div></div>}

    {showClearConfirm && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"><div className="w-full max-w-sm rounded-[24px] bg-white p-5 shadow-2xl"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-lg">⚠</div><h3 className="mt-4 text-base font-bold text-slate-900">清空整个画布？</h3><p className="mt-2 text-xs leading-6 text-slate-500">所有当前组件都会被移除。你仍然可以通过“撤销”恢复这次操作。</p><div className="mt-5 flex justify-end gap-2"><button onClick={() => setShowClearConfirm(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600">取消</button><button onClick={() => { commitNodes([]); setSelectedId(null); setShowClearConfirm(false); flash('画布已清空，可使用撤销恢复') }} className="rounded-xl bg-red-600 px-4 py-2.5 text-xs font-semibold text-white">确认清空</button></div></div></div>}
  </div>
}