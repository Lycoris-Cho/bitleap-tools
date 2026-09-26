/**
 * 吸附与对齐参考线的几何计算。
 *
 * 这里刻意只做纯计算、不碰 DOM，原因有两个：
 * 一是吸附出问题时几乎都出在几何上（阈值判定、滞回、参考线跨度），纯函数可以直接跑单测；
 * 二是渲染和计算必须分开 —— 每次指针移动都重渲染整棵节点树会卡，所以调用方拿到的只是
 * 一组「该画哪几条线、线在哪」，由它自己去改 DOM 样式。
 *
 * 坐标系约定：全部用「画布坐标」（设备框内部的、未经过 zoom 缩放的坐标）。
 * 屏幕像素阈值要除以缩放比再传进来，这样吸附手感在任何缩放级别下都一致。
 */

export type Box = { left: number; top: number; width: number; height: number }

export type Axis = "x" | "y"

export type AnchorKind = "parent" | "sibling" | "canvas"

export type Anchor = {
  box: Box
  kind: AnchorKind
  id?: string
}

export type Guide = {
  axis: Axis
  /** 参考线在画布坐标里的位置 */
  position: number
  /** 线段在另一个轴上的起止，长度取参与对齐的所有盒子的并集 */
  from: number
  to: number
  kind: AnchorKind
}

/** 吸附后与最近邻居的间距，用来显示距离标签 */
export type GapHint = {
  axis: Axis
  value: number
  /** 间距在主轴上的起止 */
  from: number
  to: number
  /** 画标签用的另一个轴坐标 */
  cross: number
}

/** 某个轴上已经吸住的线，用于滞回 */
export type AxisSnap = { position: number; edgeIndex: 0 | 1 | 2; kind: AnchorKind }

export type SnapOutcome = {
  dx: number
  dy: number
  guides: Guide[]
  gap: GapHint | null
  state: { x: AxisSnap | null; y: AxisSnap | null }
}

/** [起点, 中心, 终点] */
function axisEdges(box: Box, axis: Axis): [number, number, number] {
  const start = axis === "x" ? box.left : box.top
  const size = axis === "x" ? box.width : box.height
  return [start, start + size / 2, start + size]
}

/** 另一个轴上的跨度，用于参考线长度 */
function crossRange(box: Box, axis: Axis): [number, number] {
  const start = axis === "x" ? box.top : box.left
  const size = axis === "x" ? box.height : box.width
  return [start, start + size]
}

type Candidate = { delta: number; position: number; edgeIndex: 0 | 1 | 2; kind: AnchorKind }

function bestCandidate(
  targetEdges: [number, number, number],
  anchors: Anchor[],
  axis: Axis,
  threshold: number,
): Candidate | null {
  let best: Candidate | null = null
  for (const anchor of anchors) {
    const edges = axisEdges(anchor.box, axis)
    for (let ai = 0; ai < 3; ai += 1) {
      for (let ti = 0; ti < 3; ti += 1) {
        const delta = edges[ai] - targetEdges[ti]
        if (Math.abs(delta) > threshold) continue
        if (!best || Math.abs(delta) < Math.abs(best.delta)) {
          best = { delta, position: edges[ai], edgeIndex: ti as 0 | 1 | 2, kind: anchor.kind }
        }
      }
    }
  }
  return best
}

/**
 * 滞回：已经吸住的那条线只要还在阈值内，就不轻易换成另一条。
 * 没有这一步，两个距离相近的锚点会让参考线来回跳，拖动时看着像在抖。
 */
function withHysteresis(
  targetEdges: [number, number, number],
  previous: AxisSnap | null,
  candidate: Candidate | null,
  threshold: number,
): Candidate | null {
  if (!previous) return candidate

  const sticky: Candidate = {
    delta: previous.position - targetEdges[previous.edgeIndex],
    position: previous.position,
    edgeIndex: previous.edgeIndex,
    kind: previous.kind,
  }
  if (Math.abs(sticky.delta) > threshold) return candidate
  if (!candidate) return sticky
  // 新候选至少要好 1px 才切换
  return Math.abs(candidate.delta) > Math.abs(sticky.delta) - 1 ? sticky : candidate
}

/**
 * 收集参考线：每个锚点只保留「最优的那一条」对齐关系，而不是把上/中/下三条都画出来。
 * 两个盒子尺寸相同时上下中会同时成立，全画出来会非常吵。
 * 同为最优时边优先于中心（边对齐是更明确的意图）。
 * 落在同一位置的多个锚点再合并，线段长度取所有参与盒子的并集。
 */
function collectGuides(target: Box, anchors: Anchor[], axis: Axis, delta: number): Guide[] {
  const targetEdges = axisEdges(target, axis)
  const merged = new Map<string, { position: number; boxes: Box[]; kind: AnchorKind }>()

  for (const anchor of anchors) {
    const edges = axisEdges(anchor.box, axis)
    let picked: { position: number; error: number; centerPenalty: number } | null = null

    for (let ai = 0; ai < 3; ai += 1) {
      for (let ti = 0; ti < 3; ti += 1) {
        const error = Math.abs(edges[ai] - (targetEdges[ti] + delta))
        if (error > 0.5) continue
        const centerPenalty = ai === 1 || ti === 1 ? 1 : 0
        const better =
          !picked ||
          error < picked.error - 1e-6 ||
          (Math.abs(error - picked.error) < 1e-6 && centerPenalty < picked.centerPenalty)
        if (better) picked = { position: edges[ai], error, centerPenalty }
      }
    }

    if (!picked) continue
    const key = picked.position.toFixed(1)
    const entry = merged.get(key)
    if (entry) {
      if (!entry.boxes.includes(anchor.box)) entry.boxes.push(anchor.box)
    } else {
      merged.set(key, { position: picked.position, boxes: [target, anchor.box], kind: anchor.kind })
    }
  }

  return Array.from(merged.values()).map((entry) => {
    const ranges = entry.boxes.map((box) => crossRange(box, axis))
    return {
      axis,
      position: entry.position,
      from: Math.min(...ranges.map((range) => range[0])),
      to: Math.max(...ranges.map((range) => range[1])),
      kind: entry.kind,
    }
  })
}

/** 最近的邻居间距（左右两侧取更近的那个），用于距离标签 */
function nearestGap(target: Box, anchors: Anchor[], axis: Axis): GapHint | null {
  const [start, center, end] = axisEdges(target, axis)
  let best: GapHint | null = null

  for (const anchor of anchors) {
    const [anchorStart, , anchorEnd] = axisEdges(anchor.box, axis)
    const candidates: GapHint[] = [
      { axis, value: anchorStart - end, from: end, to: anchorStart, cross: center },
      { axis, value: start - anchorEnd, from: anchorEnd, to: start, cross: center },
    ]
    for (const hint of candidates) {
      if (hint.value < -0.5) continue
      if (!best || hint.value < best.value) best = hint
    }
  }

  return best
}

/**
 * 求解吸附。threshold 为 0 时表示本次不吸附（比如按住了 Alt 想精细摆放）。
 */
export function resolveSnap(params: {
  target: Box
  anchors: Anchor[]
  threshold: number
  previous?: { x: AxisSnap | null; y: AxisSnap | null }
}): SnapOutcome {
  const { target, anchors, threshold, previous } = params
  const none: SnapOutcome = { dx: 0, dy: 0, guides: [], gap: null, state: { x: null, y: null } }
  if (threshold <= 0 || anchors.length === 0) return none

  const edgesX = axisEdges(target, "x")
  const edgesY = axisEdges(target, "y")

  const pickX = withHysteresis(edgesX, previous?.x ?? null, bestCandidate(edgesX, anchors, "x", threshold), threshold)
  const pickY = withHysteresis(edgesY, previous?.y ?? null, bestCandidate(edgesY, anchors, "y", threshold), threshold)

  const guides: Guide[] = []
  if (pickX) guides.push(...collectGuides(target, anchors, "x", pickX.delta))
  if (pickY) guides.push(...collectGuides(target, anchors, "y", pickY.delta))

  // 两个轴分别找间距，标签只显示更近的那个，避免同时冒出两个数字
  const gapX = pickX ? nearestGap(target, anchors, "x") : null
  const gapY = pickY ? nearestGap(target, anchors, "y") : null
  const gap = !gapX ? gapY : !gapY ? gapX : gapX.value <= gapY.value ? gapX : gapY

  return {
    dx: pickX ? pickX.delta : 0,
    dy: pickY ? pickY.delta : 0,
    guides,
    gap,
    state: {
      x: pickX ? { position: pickX.position, edgeIndex: pickX.edgeIndex, kind: pickX.kind } : null,
      y: pickY ? { position: pickY.position, edgeIndex: pickY.edgeIndex, kind: pickY.kind } : null,
    },
  }
}

/* ============================ 结构拖拽的插入吸附 ============================ */

export type Slot = { start: number; end: number }

/**
 * 结构式拖拽（把组件插到某个容器里）的插入位置。
 *
 * 传统做法是在每两个子节点之间铺一条几像素高的拖放条，必须精准命中那几像素才生效；
 * 这里改成用指针在主轴上相对各子节点中线的位置来判定，指针落在哪就吸到最近的缝隙，
 * 命中率就不依赖那条细线有多高了。
 *
 * @param pointer 指针在主轴上的坐标（容器内坐标）
 * @param slots   各子节点在主轴上的区间
 * @param bounds  容器内容区在主轴上的区间，空容器或首尾用它定位
 */
export function resolveInsertion(
  pointer: number,
  slots: Slot[],
  bounds: Slot,
): { index: number; line: number } {
  if (slots.length === 0) {
    return { index: 0, line: (bounds.start + bounds.end) / 2 }
  }

  let index = slots.length
  for (let i = 0; i < slots.length; i += 1) {
    const middle = (slots[i].start + slots[i].end) / 2
    if (pointer < middle) {
      index = i
      break
    }
  }

  const gapStart = index === 0 ? Math.min(bounds.start, slots[0].start) : slots[index - 1].end
  const gapEnd = index === slots.length ? Math.max(bounds.end, slots[slots.length - 1].end) : slots[index].start
  return { index, line: (gapStart + gapEnd) / 2 }
}

/* ============================ 输入判定辅助 ============================ */

/** 拖动速度快时参考线会晃眼，超过阈值就让调用方把线收起来 */
export function shouldShowGuides(velocity: number, limit = 1.4): boolean {
  return velocity <= limit
}

/** 把屏幕像素阈值换算到画布坐标，保证任何缩放下手感一致 */
export function thresholdForZoom(screenPx: number, zoom: number): number {
  const scale = zoom <= 0 ? 1 : zoom
  return screenPx / scale
}
