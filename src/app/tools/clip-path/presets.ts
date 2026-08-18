export interface Point {
    x: number // 0-100, 百分比
    y: number // 0-100, 百分比
  }
  
  export interface ClipPreset {
    id: string
    name: string
    icon: string
    points: Point[]
    description: string
  }
  
  export const clipPresets: ClipPreset[] = [
    {
      id: 'circle',
      name: '圆形',
      icon: '●',
      description: '最基础的圆形裁剪',
      points: [{ x: 50, y: 50 }], // 圆心，半径固定 50%
    },
    {
      id: 'ellipse',
      name: '椭圆',
      icon: '⬭',
      description: '水平/垂直方向不同半径',
      points: [{ x: 50, y: 50 }],
    },
    {
      id: 'triangle',
      name: '三角形',
      icon: '▲',
      description: '经典上尖三角形',
      points: [
        { x: 50, y: 0 },
        { x: 0, y: 100 },
        { x: 100, y: 100 },
      ],
    },
    {
      id: 'rhombus',
      name: '菱形',
      icon: '◆',
      description: '四边等长的菱形',
      points: [
        { x: 50, y: 0 },
        { x: 100, y: 50 },
        { x: 50, y: 100 },
        { x: 0, y: 50 },
      ],
    },
    {
      id: 'pentagon',
      name: '五边形',
      icon: '⬟',
      description: '正五边形',
      points: [
        { x: 50, y: 0 },
        { x: 100, y: 38 },
        { x: 82, y: 100 },
        { x: 18, y: 100 },
        { x: 0, y: 38 },
      ],
    },
    {
      id: 'hexagon',
      name: '六边形',
      icon: '⬡',
      description: '正六边形（蜂巢形）',
      points: [
        { x: 50, y: 0 },
        { x: 100, y: 25 },
        { x: 100, y: 75 },
        { x: 50, y: 100 },
        { x: 0, y: 75 },
        { x: 0, y: 25 },
      ],
    },
    {
      id: 'star',
      name: '五角星',
      icon: '★',
      description: '五角星（内半径 38%）',
      points: [
        { x: 50, y: 0 },
        { x: 61, y: 35 },
        { x: 98, y: 35 },
        { x: 68, y: 57 },
        { x: 79, y: 91 },
        { x: 50, y: 70 },
        { x: 21, y: 91 },
        { x: 32, y: 57 },
        { x: 2, y: 35 },
        { x: 39, y: 35 },
      ],
    },
    {
      id: 'arrow',
      name: '箭头',
      icon: '➤',
      description: '向右箭头',
      points: [
        { x: 0, y: 35 },
        { x: 60, y: 35 },
        { x: 60, y: 0 },
        { x: 100, y: 50 },
        { x: 60, y: 100 },
        { x: 60, y: 65 },
        { x: 0, y: 65 },
      ],
    },
    {
      id: 'message',
      name: '聊天气泡',
      icon: '💬',
      description: '带小尾巴的对话气泡',
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 75 },
        { x: 75, y: 75 },
        { x: 50, y: 100 },
        { x: 50, y: 75 },
        { x: 0, y: 75 },
      ],
    },
    {
      id: 'custom',
      name: '自由绘制',
      icon: '✏️',
      description: '拖拽顶点自定义形状',
      points: [
        { x: 20, y: 20 },
        { x: 80, y: 20 },
        { x: 80, y: 80 },
        { x: 20, y: 80 },
      ],
    },
  ]
  
  export function generateClipPath(
    id: string,
    points: Point[],
    fillRule: 'nonzero' | 'evenodd' = 'nonzero'
  ): string {
    if (id === 'circle') {
      return 'circle(50% at 50% 50%)'
    }
    if (id === 'ellipse') {
      return 'ellipse(40% 50% at 50% 50%)'
    }
    const coords = points.map(p => `${p.x}% ${p.y}%`).join(', ')
    return `polygon(${fillRule === 'evenodd' ? 'evenodd ' : ''}${coords})`
  }