/**
 * 图例配置。
 *
 * 单独抽出来有两个原因：
 * 一是原来四类图（饼/雷达/热力/直角坐标）各自复制了一份 `{ bottom: 8, type: 'scroll' }`，
 * 改一处要记着改四处；
 * 二是图例这块的配置几乎全是「视觉参数」，抽成纯函数就能拿 ECharts 的 SSR 渲染成 SVG
 * 去核对真实排版（色块形状、两列对齐、分页器），而不是靠肉眼猜。
 *
 * 视觉上的取舍：
 * - 圆角色块（roundRect）替代默认方块，和卡片圆角一致；
 * - 拉大 itemGap，色块 12×12、文字 12px，整体松一些才不像上个十年的图表；
 * - 关掉某项时用弱化的灰色（inactiveColor），而不是默认的灰块；
 * - 项目多时用滚动分页，并把分页器调成主题色（ECharts 默认是深蓝绿，很跳）；
 * - 有数值可展示时（目前只有饼图的占比）用富文本排成两列：名字定宽截断 + 数值右对齐等宽字体。
 */

import type { LegendComponentOption } from "echarts"

export type LegendPalette = {
  /** 图例主文字色 */
  text: string
  /** 次要文字色：数值、分页器文字、被关掉的项 */
  muted: string
  /** 分页器可用箭头 */
  pager: string
  /** 分页器禁用箭头 */
  pagerOff: string
}

export function legendPalette(theme: "light" | "dark"): LegendPalette {
  return theme === "dark"
    ? { text: "#d4d4d8", muted: "#71717a", pager: "#a1a1aa", pagerOff: "#3f3f46" }
    : { text: "#52525b", muted: "#a1a1aa", pager: "#71717a", pagerOff: "#d4d4d8" }
}

export type LegendPlacement = "bottom" | "top" | "right"

export type LegendInput = {
  /** 图例项名称，用于和 values 对齐以及算列宽 */
  names?: string[]
  /** 与 names 一一对应的数值文本；给了就排成两列 */
  values?: string[]
  placement?: LegendPlacement
}

/** 超过这个数量改用滚动分页，避免一行挤成一团 */
export const LEGEND_SCROLL_THRESHOLD = 6

/** 图例文字字号，列宽换算和富文本样式都从这里取，避免出现魔法数字 */
export const LEGEND_FONT_SIZE = 12

/** 按字符的视觉宽度估算长度：中日韩字符算 1 个字宽，其余约 0.56 */
export function displayWidth(text: string): number {
  let width = 0
  for (const char of text) {
    width += /[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]/.test(char) ? 1 : 0.56
  }
  return width
}

/**
 * 名字列的宽度：按最长的一项估算，并夹在合理区间内。
 * 定宽是为了让「名字 + 数值」两列对齐 —— 对齐之后图例才像仪表盘而不是一串零散标签。
 */
/**
 * 按可用宽度截断并补省略号。
 * 注意 maxWidth 的单位是「汉字宽」（和 displayWidth 一致），不是像素 ——
 * 传像素进来会让阈值大一个数量级，省略号就永远不会触发。
 * 富文本里的 overflow/ellipsis 同样不在 ECharts 6 的类型里，自己算反而更可控：
 * 列宽是我算的，能放几个字自然也由我算，而且可以直接写单测。
 */
export function truncateToWidth(text: string, maxWidth: number): string {
  if (displayWidth(text) <= maxWidth) return text
  let out = ""
  let width = 0
  for (const char of text) {
    const next = width + displayWidth(char)
    // 留出省略号的位置，否则截断后会刚好溢出
    if (next > maxWidth - 0.8) break
    out += char
    width = next
  }
  return out ? `${out}…` : `${text.slice(0, 1)}…`
}

/**
 * ECharts 6 的 LegendComponentOption 类型里缺了这几个分页器字段，但运行时是支持的 ——
 * 已用 SSR 渲染出的 SVG 核对过：分页箭头用的就是这里的颜色。
 * 不写这段的话分页器会保持 ECharts 默认的深蓝绿，和页面配色冲突。
 */
type LegendPagerOptions = {
  pageIconColor?: string
  pageIconInactiveColor?: string
  pageIconSize?: number
  pageButtonItemGap?: number
  pageButtonPosition?: "start" | "end"
  pageTextStyle?: { color?: string; fontSize?: number }
}

export function nameColumnWidth(names: string[]): number {
  const longest = names.reduce((max, name) => Math.max(max, displayWidth(name)), 0)
  // 上下限按「4 个汉字左右不截断、再长就省略号」来定。
  // 列宽偏大时图例项会变宽，几项就换行，所以宁可紧一点。
  return Math.round(Math.min(Math.max(longest * LEGEND_FONT_SIZE + 10, 56), 132))
}

export function buildLegend(palette: LegendPalette, input: LegendInput = {}): LegendComponentOption {
  const { names = [], values, placement = "bottom" } = input
  const count = Math.max(names.length, 1)
  const scroll = count > LEGEND_SCROLL_THRESHOLD
  const stacked = Boolean(values && values.length && names.length)

  const legend: LegendComponentOption & LegendPagerOptions = {
    // 圆角色块比方块柔和，也和页面里的卡片圆角一致
    icon: "roundRect",
    itemWidth: 12,
    itemHeight: 12,
    itemGap: placement === "right" ? 14 : 22,
    selectedMode: true,
    // 关掉某项时的颜色，默认那个灰块太生硬
    inactiveColor: palette.muted,
    textStyle: {
      color: palette.text,
      fontSize: LEGEND_FONT_SIZE,
      lineHeight: 16,
      padding: [0, 0, 0, 6],
    },
  }

  if (scroll) {
    legend.type = "scroll"
    legend.pageIconColor = palette.pager
    legend.pageIconInactiveColor = palette.pagerOff
    legend.pageIconSize = 12
    legend.pageButtonItemGap = 6
    legend.pageButtonPosition = "end"
    legend.pageTextStyle = { color: palette.muted, fontSize: 11 }
  }

  if (stacked) {
    const width = nameColumnWidth(names)
    legend.textStyle = {
      ...legend.textStyle,
      rich: {
        name: {
          width,
          color: palette.text,
          fontSize: LEGEND_FONT_SIZE,
          lineHeight: 16,
          padding: [0, 0, 0, 6],
        },
        value: {
          width: 46,
          align: "right",
          color: palette.muted,
          fontSize: 11,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        },
      },
    }
    legend.formatter = (name: string) => {
      const index = names.indexOf(name)
      const value = index >= 0 ? values?.[index] ?? "" : ""
      // 名字按列宽截断（宽度换算成汉字宽再传进去），保证两列不会互相挤
      const nameBudget = (width - 6) / LEGEND_FONT_SIZE
      return `{name|${truncateToWidth(name, nameBudget)}}{value|${value}}`
    }
  }

  if (placement === "right") {
    legend.orient = "vertical"
    legend.right = 16
    legend.top = "middle"
    legend.align = "left"
  } else {
    legend.left = "center"
    legend.orient = "horizontal"
    if (placement === "top") legend.top = 8
    else legend.bottom = 8
  }

  return legend
}
