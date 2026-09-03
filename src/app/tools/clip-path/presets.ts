export interface Point {
  x: number
  y: number
}

export type ClipShapeKind = 'polygon' | 'circle' | 'ellipse'

export interface PolygonClipPreset {
  id: string
  name: string
  category: string
  description: string
  kind: 'polygon'
  points: Point[]
}

export interface CircleClipPreset {
  id: string
  name: string
  category: string
  description: string
  kind: 'circle'
  center: Point
  radius: number
}

export interface EllipseClipPreset {
  id: string
  name: string
  category: string
  description: string
  kind: 'ellipse'
  center: Point
  radiusX: number
  radiusY: number
}

export type ClipPreset =
  | PolygonClipPreset
  | CircleClipPreset
  | EllipseClipPreset

export const clipPresets: ClipPreset[] = [
  {
    id: 'circle',
    name: 'Circle',
    category: '基础',
    description: '标准圆形，支持圆心与半径调节',
    kind: 'circle',
    center: { x: 50, y: 50 },
    radius: 46,
  },
  {
    id: 'ellipse',
    name: 'Ellipse',
    category: '基础',
    description: '椭圆形，支持水平与垂直半径调节',
    kind: 'ellipse',
    center: { x: 50, y: 50 },
    radiusX: 46,
    radiusY: 34,
  },
  {
    id: 'triangle',
    name: 'Triangle',
    category: '基础',
    description: '经典等腰三角形',
    kind: 'polygon',
    points: [
      { x: 50, y: 4 },
      { x: 96, y: 94 },
      { x: 4, y: 94 },
    ],
  },
  {
    id: 'diamond',
    name: 'Diamond',
    category: '基础',
    description: '平衡、干净的菱形',
    kind: 'polygon',
    points: [
      { x: 50, y: 3 },
      { x: 97, y: 50 },
      { x: 50, y: 97 },
      { x: 3, y: 50 },
    ],
  },
  {
    id: 'pentagon',
    name: 'Pentagon',
    category: '几何',
    description: '更规整的五边形比例',
    kind: 'polygon',
    points: [
      { x: 50, y: 3 },
      { x: 97, y: 38 },
      { x: 79, y: 96 },
      { x: 21, y: 96 },
      { x: 3, y: 38 },
    ],
  },
  {
    id: 'hexagon',
    name: 'Hexagon',
    category: '几何',
    description: '适合卡片、头像和蜂巢布局',
    kind: 'polygon',
    points: [
      { x: 24, y: 5 },
      { x: 76, y: 5 },
      { x: 98, y: 50 },
      { x: 76, y: 95 },
      { x: 24, y: 95 },
      { x: 2, y: 50 },
    ],
  },
  {
    id: 'octagon',
    name: 'Octagon',
    category: '几何',
    description: '轻切角八边形，适合徽章',
    kind: 'polygon',
    points: [
      { x: 30, y: 3 },
      { x: 70, y: 3 },
      { x: 97, y: 30 },
      { x: 97, y: 70 },
      { x: 70, y: 97 },
      { x: 30, y: 97 },
      { x: 3, y: 70 },
      { x: 3, y: 30 },
    ],
  },
  {
    id: 'bevel',
    name: 'Bevel',
    category: '几何',
    description: '四角斜切的现代 UI 轮廓',
    kind: 'polygon',
    points: [
      { x: 12, y: 0 },
      { x: 88, y: 0 },
      { x: 100, y: 12 },
      { x: 100, y: 88 },
      { x: 88, y: 100 },
      { x: 12, y: 100 },
      { x: 0, y: 88 },
      { x: 0, y: 12 },
    ],
  },
  {
    id: 'star',
    name: 'Star',
    category: '装饰',
    description: '比例更柔和的五角星',
    kind: 'polygon',
    points: [
      { x: 50, y: 2 },
      { x: 61, y: 35 },
      { x: 96, y: 35 },
      { x: 68, y: 56 },
      { x: 79, y: 91 },
      { x: 50, y: 71 },
      { x: 21, y: 91 },
      { x: 32, y: 56 },
      { x: 4, y: 35 },
      { x: 39, y: 35 },
    ],
  },
  {
    id: 'spark',
    name: 'Spark',
    category: '装饰',
    description: '四向闪光形，适合装饰图标',
    kind: 'polygon',
    points: [
      { x: 50, y: 0 },
      { x: 61, y: 38 },
      { x: 100, y: 50 },
      { x: 61, y: 62 },
      { x: 50, y: 100 },
      { x: 39, y: 62 },
      { x: 0, y: 50 },
      { x: 39, y: 38 },
    ],
  },
  {
    id: 'burst',
    name: 'Burst',
    category: '装饰',
    description: '适合促销标签和强调元素',
    kind: 'polygon',
    points: [
      { x: 50, y: 0 },
      { x: 61, y: 20 },
      { x: 82, y: 8 },
      { x: 80, y: 31 },
      { x: 100, y: 50 },
      { x: 80, y: 61 },
      { x: 92, y: 82 },
      { x: 69, y: 80 },
      { x: 50, y: 100 },
      { x: 39, y: 80 },
      { x: 18, y: 92 },
      { x: 20, y: 69 },
      { x: 0, y: 50 },
      { x: 20, y: 39 },
      { x: 8, y: 18 },
      { x: 31, y: 20 },
    ],
  },
  {
    id: 'arrow-right',
    name: 'Arrow',
    category: '方向',
    description: '向右箭头，适合流程与导航',
    kind: 'polygon',
    points: [
      { x: 0, y: 30 },
      { x: 61, y: 30 },
      { x: 61, y: 8 },
      { x: 100, y: 50 },
      { x: 61, y: 92 },
      { x: 61, y: 70 },
      { x: 0, y: 70 },
    ],
  },
  {
    id: 'chevron-right',
    name: 'Chevron',
    category: '方向',
    description: '更轻量的箭形切片',
    kind: 'polygon',
    points: [
      { x: 0, y: 0 },
      { x: 58, y: 0 },
      { x: 100, y: 50 },
      { x: 58, y: 100 },
      { x: 0, y: 100 },
      { x: 42, y: 50 },
    ],
  },
  {
    id: 'tag',
    name: 'Tag',
    category: 'UI',
    description: '标签形状，适合价格和状态块',
    kind: 'polygon',
    points: [
      { x: 0, y: 12 },
      { x: 76, y: 12 },
      { x: 100, y: 50 },
      { x: 76, y: 88 },
      { x: 0, y: 88 },
    ],
  },
  {
    id: 'message',
    name: 'Message',
    category: 'UI',
    description: '更自然的消息气泡轮廓',
    kind: 'polygon',
    points: [
      { x: 6, y: 7 },
      { x: 94, y: 7 },
      { x: 94, y: 75 },
      { x: 66, y: 75 },
      { x: 53, y: 94 },
      { x: 48, y: 75 },
      { x: 6, y: 75 },
    ],
  },
  {
    id: 'ticket',
    name: 'Ticket',
    category: 'UI',
    description: '票券轮廓，适合优惠券和卡券',
    kind: 'polygon',
    points: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 34 },
      { x: 92, y: 40 },
      { x: 92, y: 60 },
      { x: 100, y: 66 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
      { x: 0, y: 66 },
      { x: 8, y: 60 },
      { x: 8, y: 40 },
      { x: 0, y: 34 },
    ],
  },
  {
    id: 'wave',
    name: 'Wave',
    category: '布局',
    description: '适合图片底部波浪裁切',
    kind: 'polygon',
    points: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 72 },
      { x: 82, y: 82 },
      { x: 64, y: 76 },
      { x: 47, y: 88 },
      { x: 28, y: 80 },
      { x: 12, y: 90 },
      { x: 0, y: 84 },
    ],
  },
  {
    id: 'slant',
    name: 'Slant',
    category: '布局',
    description: '常用于 Hero 图片与分区切面',
    kind: 'polygon',
    points: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 88, y: 100 },
      { x: 0, y: 100 },
    ],
  },
  {
    id: 'notch',
    name: 'Notch',
    category: '布局',
    description: '顶部凹口，适合卡片或标签容器',
    kind: 'polygon',
    points: [
      { x: 0, y: 0 },
      { x: 38, y: 0 },
      { x: 44, y: 12 },
      { x: 56, y: 12 },
      { x: 62, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ],
  },
  {
    id: 'custom',
    name: 'Custom',
    category: '自由',
    description: '从基础四边形开始自由编辑',
    kind: 'polygon',
    points: [
      { x: 16, y: 16 },
      { x: 84, y: 16 },
      { x: 84, y: 84 },
      { x: 16, y: 84 },
    ],
  },
]

export function clonePreset(preset: ClipPreset): ClipPreset {
  if (preset.kind === 'polygon') {
    return {
      ...preset,
      points: preset.points.map((point) => ({ ...point })),
    }
  }

  if (preset.kind === 'circle') {
    return {
      ...preset,
      center: { ...preset.center },
    }
  }

  return {
    ...preset,
    center: { ...preset.center },
  }
}

export function generateClipPath(
  preset: ClipPreset,
  fillRule: 'nonzero' | 'evenodd' = 'nonzero',
): string {
  if (preset.kind === 'circle') {
    return `circle(${preset.radius}% at ${preset.center.x}% ${preset.center.y}%)`
  }

  if (preset.kind === 'ellipse') {
    return `ellipse(${preset.radiusX}% ${preset.radiusY}% at ${preset.center.x}% ${preset.center.y}%)`
  }

  const coordinates = preset.points
    .map((point) => `${point.x}% ${point.y}%`)
    .join(', ')

  return fillRule === 'evenodd'
    ? `polygon(evenodd, ${coordinates})`
    : `polygon(${coordinates})`
}
