"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { Breadcrumb } from "@/components/breadcrumb";
import FooterNote from "@/components/FooterNote";

type AlgorithmKind = "array" | "search" | "grid";
type AlgorithmCategory = "排序" | "搜索" | "图与路径";
type AlgorithmId =
  | "bubble"
  | "selection"
  | "insertion"
  | "quick"
  | "merge"
  | "heap"
  | "linear"
  | "binary"
  | "bfs"
  | "dfs"
  | "dijkstra"
  | "astar";

type AlgorithmMeta = {
  id: AlgorithmId;
  name: string;
  en: string;
  category: AlgorithmCategory;
  kind: AlgorithmKind;
  summary: string;
  best: string;
  average: string;
  worst: string;
  space: string;
  stable?: boolean;
  code: string[];
};

type Frame = {
  array?: number[];
  active?: number[];
  secondary?: number[];
  sorted?: number[];
  pivot?: number;
  found?: number;
  range?: [number, number];
  visited?: number[];
  frontier?: number[];
  path?: number[];
  currentNode?: number;
  message: string;
  codeLine?: number;
  comparisons?: number;
  writes?: number;
};

type GridEditMode = "wall" | "start" | "end" | "weight";

const ROWS = 12;
const COLS = 18;
const CELL_COUNT = ROWS * COLS;

const ALGORITHMS: AlgorithmMeta[] = [
  {
    id: "bubble",
    name: "冒泡排序",
    en: "Bubble Sort",
    category: "排序",
    kind: "array",
    summary: "反复比较相邻元素，把较大的值逐轮推向数组尾部。",
    best: "O(n)",
    average: "O(n²)",
    worst: "O(n²)",
    space: "O(1)",
    stable: true,
    code: [
      "for end = n - 1 down to 1",
      "  swapped = false",
      "  for i = 0 to end - 1",
      "    if a[i] > a[i + 1]",
      "      swap(a[i], a[i + 1])",
      "      swapped = true",
      "  if !swapped: break",
    ],
  },
  {
    id: "selection",
    name: "选择排序",
    en: "Selection Sort",
    category: "排序",
    kind: "array",
    summary: "每一轮从未排序区间中找到最小值，放到当前起点。",
    best: "O(n²)",
    average: "O(n²)",
    worst: "O(n²)",
    space: "O(1)",
    stable: false,
    code: [
      "for i = 0 to n - 2",
      "  min = i",
      "  for j = i + 1 to n - 1",
      "    if a[j] < a[min]",
      "      min = j",
      "  swap(a[i], a[min])",
    ],
  },
  {
    id: "insertion",
    name: "插入排序",
    en: "Insertion Sort",
    category: "排序",
    kind: "array",
    summary: "把当前元素插入到左侧已经有序的区间中。",
    best: "O(n)",
    average: "O(n²)",
    worst: "O(n²)",
    space: "O(1)",
    stable: true,
    code: [
      "for i = 1 to n - 1",
      "  key = a[i]",
      "  j = i - 1",
      "  while j >= 0 and a[j] > key",
      "    a[j + 1] = a[j]",
      "    j--",
      "  a[j + 1] = key",
    ],
  },
  {
    id: "quick",
    name: "快速排序",
    en: "Quick Sort",
    category: "排序",
    kind: "array",
    summary: "选择 Pivot，把更小与更大的元素分到两侧，再递归处理。",
    best: "O(n log n)",
    average: "O(n log n)",
    worst: "O(n²)",
    space: "O(log n)",
    stable: false,
    code: [
      "quickSort(lo, hi)",
      "  pivot = a[hi]",
      "  i = lo",
      "  for j = lo to hi - 1",
      "    if a[j] <= pivot",
      "      swap(a[i], a[j]); i++",
      "  swap(a[i], a[hi])",
      "  recurse left / right",
    ],
  },
  {
    id: "merge",
    name: "归并排序",
    en: "Merge Sort",
    category: "排序",
    kind: "array",
    summary: "不断二分数组，再把两个有序区间合并回去。",
    best: "O(n log n)",
    average: "O(n log n)",
    worst: "O(n log n)",
    space: "O(n)",
    stable: true,
    code: [
      "mergeSort(lo, hi)",
      "  mid = (lo + hi) / 2",
      "  mergeSort(lo, mid)",
      "  mergeSort(mid + 1, hi)",
      "  merge(left, right)",
      "    choose smaller head",
      "    write back to array",
    ],
  },
  {
    id: "heap",
    name: "堆排序",
    en: "Heap Sort",
    category: "排序",
    kind: "array",
    summary: "先建立最大堆，再反复把堆顶最大值交换到数组末尾。",
    best: "O(n log n)",
    average: "O(n log n)",
    worst: "O(n log n)",
    space: "O(1)",
    stable: false,
    code: [
      "build max heap",
      "for end = n - 1 down to 1",
      "  swap(a[0], a[end])",
      "  heapify(0, end)",
      "heapify(root, size)",
      "  choose largest child",
      "  swap and continue",
    ],
  },
  {
    id: "linear",
    name: "线性搜索",
    en: "Linear Search",
    category: "搜索",
    kind: "search",
    summary: "从左到右逐个检查，直到找到目标值或遍历结束。",
    best: "O(1)",
    average: "O(n)",
    worst: "O(n)",
    space: "O(1)",
    code: [
      "for i = 0 to n - 1",
      "  compare a[i] with target",
      "  if a[i] == target",
      "    return i",
      "return not found",
    ],
  },
  {
    id: "binary",
    name: "二分搜索",
    en: "Binary Search",
    category: "搜索",
    kind: "search",
    summary: "在有序数组中不断砍掉不可能包含答案的一半区间。",
    best: "O(1)",
    average: "O(log n)",
    worst: "O(log n)",
    space: "O(1)",
    code: [
      "left = 0; right = n - 1",
      "while left <= right",
      "  mid = floor((left + right) / 2)",
      "  if a[mid] == target: return mid",
      "  if a[mid] < target: left = mid + 1",
      "  else: right = mid - 1",
      "return not found",
    ],
  },
  {
    id: "bfs",
    name: "广度优先搜索",
    en: "Breadth-First Search",
    category: "图与路径",
    kind: "grid",
    summary: "按距离一层层向外扩展；在无权图中可以找到最短步数路径。",
    best: "O(V + E)",
    average: "O(V + E)",
    worst: "O(V + E)",
    space: "O(V)",
    code: [
      "queue = [start]",
      "while queue not empty",
      "  node = queue.shift()",
      "  if node == goal: stop",
      "  for each neighbor",
      "    if unvisited: mark + enqueue",
      "reconstruct path",
    ],
  },
  {
    id: "dfs",
    name: "深度优先搜索",
    en: "Depth-First Search",
    category: "图与路径",
    kind: "grid",
    summary: "沿一个方向尽可能深入，再回溯探索其他分支。",
    best: "O(V + E)",
    average: "O(V + E)",
    worst: "O(V + E)",
    space: "O(V)",
    code: [
      "stack = [start]",
      "while stack not empty",
      "  node = stack.pop()",
      "  if visited: continue",
      "  mark node visited",
      "  push unvisited neighbors",
      "reconstruct path if found",
    ],
  },
  {
    id: "dijkstra",
    name: "Dijkstra",
    en: "Shortest Path",
    category: "图与路径",
    kind: "grid",
    summary: "从当前距离最小的节点继续扩展，适合非负权重图的最短路径。",
    best: "O((V + E) log V)",
    average: "O((V + E) log V)",
    worst: "O((V + E) log V)",
    space: "O(V)",
    code: [
      "dist[start] = 0",
      "while priority queue not empty",
      "  node = pop minimum distance",
      "  if node == goal: stop",
      "  for each neighbor",
      "    next = dist[node] + weight",
      "    relax distance if smaller",
      "reconstruct shortest path",
    ],
  },
  {
    id: "astar",
    name: "A* 寻路",
    en: "A* Search",
    category: "图与路径",
    kind: "grid",
    summary: "把已走代价 g 与到终点的启发式估计 h 结合，优先探索更有希望的方向。",
    best: "依启发函数而定",
    average: "依图结构而定",
    worst: "O(E)",
    space: "O(V)",
    code: [
      "g[start] = 0",
      "open = [start]",
      "while open not empty",
      "  node = min(g + h)",
      "  if node == goal: stop",
      "  for each neighbor",
      "    relax g score",
      "    h = Manhattan distance",
      "reconstruct best path",
    ],
  },
];

const DEFAULT_DATA = [38, 74, 19, 61, 45, 86, 27, 53, 12, 68, 34, 91];
const DEFAULT_TARGET = 53;
const DEFAULT_START = 5 * COLS + 2;
const DEFAULT_END = 6 * COLS + 15;

function createDefaultWalls() {
  const values = [
    21, 39, 57, 75, 93, 111, 129,
    43, 44, 45, 46, 47,
    83, 101, 119, 137, 155,
    151, 152, 153, 154,
  ];
  return new Set(values.filter((v) => v !== DEFAULT_START && v !== DEFAULT_END));
}

function createDefaultWeights() {
  const weights = Array(CELL_COUNT).fill(1);
  [30, 31, 32, 50, 68, 86, 104, 122, 140, 158, 159, 160, 143, 125].forEach((i, k) => {
    if (i < CELL_COUNT) weights[i] = k % 3 === 0 ? 5 : 3;
  });
  return weights;
}

function uniqueSorted(values: number[]) {
  return [...new Set(values)].sort((a, b) => a - b);
}

function cloneFrameArray(a: number[]) {
  return a.slice();
}

function baseArrayFrame(array: number[], message: string): Frame {
  return {
    array: cloneFrameArray(array),
    active: [],
    secondary: [],
    sorted: [],
    message,
    codeLine: 0,
    comparisons: 0,
    writes: 0,
  };
}

function buildBubble(input: number[]): Frame[] {
  const a = input.slice();
  const frames: Frame[] = [baseArrayFrame(a, "准备开始。从左向右比较相邻元素。")];
  let comparisons = 0;
  let writes = 0;
  const sorted: number[] = [];
  for (let end = a.length - 1; end > 0; end--) {
    let swapped = false;
    for (let i = 0; i < end; i++) {
      comparisons++;
      frames.push({ array: a.slice(), active: [i, i + 1], sorted: sorted.slice(), message: `比较 ${a[i]} 与 ${a[i + 1]}。`, codeLine: 3, comparisons, writes });
      if (a[i] > a[i + 1]) {
        [a[i], a[i + 1]] = [a[i + 1], a[i]];
        writes += 2;
        swapped = true;
        frames.push({ array: a.slice(), active: [i, i + 1], sorted: sorted.slice(), message: "左侧更大，交换两个相邻元素。", codeLine: 4, comparisons, writes });
      }
    }
    sorted.push(end);
    frames.push({ array: a.slice(), active: [], sorted: sorted.slice(), message: `${a[end]} 已落在这一轮的最终位置。`, codeLine: 0, comparisons, writes });
    if (!swapped) break;
  }
  if (a.length) sorted.push(0);
  frames.push({ array: a.slice(), active: [], sorted: uniqueSorted(sorted), message: "排序完成。", codeLine: 6, comparisons, writes });
  return frames;
}

function buildSelection(input: number[]): Frame[] {
  const a = input.slice();
  const frames: Frame[] = [baseArrayFrame(a, "每一轮从未排序区间寻找最小值。")];
  let comparisons = 0;
  let writes = 0;
  const sorted: number[] = [];
  for (let i = 0; i < a.length - 1; i++) {
    let min = i;
    for (let j = i + 1; j < a.length; j++) {
      comparisons++;
      frames.push({ array: a.slice(), active: [j], secondary: [min], sorted: sorted.slice(), message: `当前最小值 ${a[min]}，检查 ${a[j]}。`, codeLine: 3, comparisons, writes });
      if (a[j] < a[min]) {
        min = j;
        frames.push({ array: a.slice(), active: [j], secondary: [min], sorted: sorted.slice(), message: `${a[j]} 更小，更新最小值位置。`, codeLine: 4, comparisons, writes });
      }
    }
    if (min !== i) {
      [a[i], a[min]] = [a[min], a[i]];
      writes += 2;
    }
    sorted.push(i);
    frames.push({ array: a.slice(), active: [i], secondary: [min], sorted: sorted.slice(), message: `把本轮最小值放到索引 ${i}。`, codeLine: 5, comparisons, writes });
  }
  if (a.length) sorted.push(a.length - 1);
  frames.push({ array: a.slice(), sorted, message: "排序完成。", codeLine: 5, comparisons, writes });
  return frames;
}

function buildInsertion(input: number[]): Frame[] {
  const a = input.slice();
  const frames: Frame[] = [baseArrayFrame(a, "左侧第一个元素视为已排序区间。")];
  let comparisons = 0;
  let writes = 0;
  for (let i = 1; i < a.length; i++) {
    const key = a[i];
    let j = i - 1;
    frames.push({ array: a.slice(), active: [i], sorted: Array.from({ length: i }, (_, k) => k), message: `取出 ${key}，准备插入左侧有序区间。`, codeLine: 1, comparisons, writes });
    while (j >= 0) {
      comparisons++;
      frames.push({ array: a.slice(), active: [j], secondary: [j + 1], sorted: Array.from({ length: i }, (_, k) => k), message: `比较 ${a[j]} 与待插入值 ${key}。`, codeLine: 3, comparisons, writes });
      if (a[j] <= key) break;
      a[j + 1] = a[j];
      writes++;
      j--;
      frames.push({ array: a.slice(), active: [j + 1, j + 2].filter((x) => x >= 0 && x < a.length), sorted: [], message: "右移较大的元素，为 key 腾出位置。", codeLine: 4, comparisons, writes });
    }
    a[j + 1] = key;
    writes++;
    frames.push({ array: a.slice(), active: [j + 1], sorted: Array.from({ length: i + 1 }, (_, k) => k), message: `${key} 插入正确位置。`, codeLine: 6, comparisons, writes });
  }
  frames.push({ array: a.slice(), sorted: a.map((_, i) => i), message: "排序完成。", codeLine: 6, comparisons, writes });
  return frames;
}

function buildQuick(input: number[]): Frame[] {
  const a = input.slice();
  const frames: Frame[] = [baseArrayFrame(a, "快速排序会选择 Pivot，并原地划分区间。")];
  let comparisons = 0;
  let writes = 0;
  const fixed = new Set<number>();

  const sort = (lo: number, hi: number) => {
    if (lo > hi) return;
    if (lo === hi) {
      fixed.add(lo);
      frames.push({ array: a.slice(), active: [lo], sorted: [...fixed], message: `${a[lo]} 的位置已经确定。`, codeLine: 7, comparisons, writes });
      return;
    }
    const pivot = a[hi];
    frames.push({ array: a.slice(), active: [], pivot: hi, sorted: [...fixed], range: [lo, hi], message: `选择区间末尾 ${pivot} 作为 Pivot。`, codeLine: 1, comparisons, writes });
    let i = lo;
    for (let j = lo; j < hi; j++) {
      comparisons++;
      frames.push({ array: a.slice(), active: [j], secondary: [i], pivot: hi, sorted: [...fixed], range: [lo, hi], message: `比较 ${a[j]} 与 Pivot ${pivot}。`, codeLine: 4, comparisons, writes });
      if (a[j] <= pivot) {
        if (i !== j) {
          [a[i], a[j]] = [a[j], a[i]];
          writes += 2;
        }
        frames.push({ array: a.slice(), active: [i, j], pivot: hi, sorted: [...fixed], range: [lo, hi], message: `${a[i]} 属于 Pivot 左侧，扩张“小于区”。`, codeLine: 5, comparisons, writes });
        i++;
      }
    }
    [a[i], a[hi]] = [a[hi], a[i]];
    writes += 2;
    fixed.add(i);
    frames.push({ array: a.slice(), active: [i], pivot: i, sorted: [...fixed], range: [lo, hi], message: `Pivot ${a[i]} 放到最终位置。`, codeLine: 6, comparisons, writes });
    sort(lo, i - 1);
    sort(i + 1, hi);
  };

  sort(0, a.length - 1);
  frames.push({ array: a.slice(), sorted: a.map((_, i) => i), message: "所有分区处理完毕，排序完成。", codeLine: 7, comparisons, writes });
  return frames;
}

function buildMerge(input: number[]): Frame[] {
  const a = input.slice();
  const frames: Frame[] = [baseArrayFrame(a, "先拆分，再按大小把子区间合并回来。")];
  let comparisons = 0;
  let writes = 0;

  const mergeSort = (lo: number, hi: number) => {
    if (lo >= hi) return;
    const mid = Math.floor((lo + hi) / 2);
    frames.push({ array: a.slice(), active: [], range: [lo, hi], secondary: [mid], message: `拆分区间 [${lo}, ${hi}]，中点是 ${mid}。`, codeLine: 1, comparisons, writes });
    mergeSort(lo, mid);
    mergeSort(mid + 1, hi);
    const left = a.slice(lo, mid + 1);
    const right = a.slice(mid + 1, hi + 1);
    let i = 0;
    let j = 0;
    let k = lo;
    while (i < left.length && j < right.length) {
      comparisons++;
      frames.push({ array: a.slice(), active: [k], range: [lo, hi], message: `比较左侧 ${left[i]} 与右侧 ${right[j]}。`, codeLine: 5, comparisons, writes });
      a[k++] = left[i] <= right[j] ? left[i++] : right[j++];
      writes++;
      frames.push({ array: a.slice(), active: [k - 1], range: [lo, hi], message: "把较小值写回当前合并位置。", codeLine: 6, comparisons, writes });
    }
    while (i < left.length) { a[k++] = left[i++]; writes++; }
    while (j < right.length) { a[k++] = right[j++]; writes++; }
    frames.push({ array: a.slice(), active: Array.from({ length: hi - lo + 1 }, (_, x) => lo + x), range: [lo, hi], message: `区间 [${lo}, ${hi}] 合并完成。`, codeLine: 4, comparisons, writes });
  };

  mergeSort(0, a.length - 1);
  frames.push({ array: a.slice(), sorted: a.map((_, i) => i), message: "归并排序完成。", codeLine: 6, comparisons, writes });
  return frames;
}

function buildHeap(input: number[]): Frame[] {
  const a = input.slice();
  const frames: Frame[] = [baseArrayFrame(a, "先把数组调整成最大堆。")];
  let comparisons = 0;
  let writes = 0;
  const sorted: number[] = [];

  const heapify = (size: number, root: number) => {
    let current = root;
    while (true) {
      let largest = current;
      const left = current * 2 + 1;
      const right = current * 2 + 2;
      if (left < size) {
        comparisons++;
        if (a[left] > a[largest]) largest = left;
      }
      if (right < size) {
        comparisons++;
        if (a[right] > a[largest]) largest = right;
      }
      frames.push({ array: a.slice(), active: [current], secondary: [largest], sorted: sorted.slice(), message: "比较父节点与左右子节点，寻找最大值。", codeLine: 5, comparisons, writes });
      if (largest === current) break;
      [a[current], a[largest]] = [a[largest], a[current]];
      writes += 2;
      frames.push({ array: a.slice(), active: [current, largest], sorted: sorted.slice(), message: "子节点更大，交换并继续向下调整。", codeLine: 6, comparisons, writes });
      current = largest;
    }
  };

  for (let i = Math.floor(a.length / 2) - 1; i >= 0; i--) heapify(a.length, i);
  frames.push({ array: a.slice(), active: [0], sorted: [], message: "最大堆建立完成，堆顶是当前最大值。", codeLine: 0, comparisons, writes });
  for (let end = a.length - 1; end > 0; end--) {
    [a[0], a[end]] = [a[end], a[0]];
    writes += 2;
    sorted.push(end);
    frames.push({ array: a.slice(), active: [0, end], sorted: sorted.slice(), message: `把最大值 ${a[end]} 放到数组末尾。`, codeLine: 2, comparisons, writes });
    heapify(end, 0);
  }
  if (a.length) sorted.push(0);
  frames.push({ array: a.slice(), sorted: uniqueSorted(sorted), message: "堆排序完成。", codeLine: 6, comparisons, writes });
  return frames;
}

function buildLinear(input: number[], target: number): Frame[] {
  const frames: Frame[] = [baseArrayFrame(input, `目标值是 ${target}，从左到右检查。`)];
  let comparisons = 0;
  for (let i = 0; i < input.length; i++) {
    comparisons++;
    frames.push({ array: input.slice(), active: [i], message: `检查索引 ${i}：${input[i]} ${input[i] === target ? "= " : "≠ "}${target}。`, codeLine: 1, comparisons, writes: 0 });
    if (input[i] === target) {
      frames.push({ array: input.slice(), found: i, active: [i], message: `找到目标值，位置是索引 ${i}。`, codeLine: 3, comparisons, writes: 0 });
      return frames;
    }
  }
  frames.push({ array: input.slice(), message: "遍历结束，没有找到目标值。", codeLine: 4, comparisons, writes: 0 });
  return frames;
}

function buildBinary(input: number[], target: number): Frame[] {
  const a = input.slice().sort((x, y) => x - y);
  const frames: Frame[] = [baseArrayFrame(a, `二分搜索要求有序数组，已自动排序。目标值：${target}。`)];
  let left = 0;
  let right = a.length - 1;
  let comparisons = 0;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    comparisons++;
    frames.push({ array: a.slice(), active: [mid], range: [left, right], message: `当前范围 [${left}, ${right}]，中点值是 ${a[mid]}。`, codeLine: 2, comparisons, writes: 0 });
    if (a[mid] === target) {
      frames.push({ array: a.slice(), found: mid, active: [mid], range: [left, right], message: `中点恰好等于 ${target}，搜索完成。`, codeLine: 3, comparisons, writes: 0 });
      return frames;
    }
    if (a[mid] < target) {
      frames.push({ array: a.slice(), active: [mid], range: [mid + 1, right], message: `${a[mid]} < ${target}，左半区不可能包含答案。`, codeLine: 4, comparisons, writes: 0 });
      left = mid + 1;
    } else {
      frames.push({ array: a.slice(), active: [mid], range: [left, mid - 1], message: `${a[mid]} > ${target}，右半区不可能包含答案。`, codeLine: 5, comparisons, writes: 0 });
      right = mid - 1;
    }
  }
  frames.push({ array: a.slice(), message: "搜索范围已经为空，没有找到目标值。", codeLine: 6, comparisons, writes: 0 });
  return frames;
}

function neighbors(index: number) {
  const row = Math.floor(index / COLS);
  const col = index % COLS;
  const out: number[] = [];
  if (row > 0) out.push(index - COLS);
  if (col < COLS - 1) out.push(index + 1);
  if (row < ROWS - 1) out.push(index + COLS);
  if (col > 0) out.push(index - 1);
  return out;
}

function reconstructPath(parent: number[], start: number, end: number) {
  if (start === end) return [start];
  if (parent[end] === -1) return [];
  const path: number[] = [];
  let current = end;
  while (current !== -1) {
    path.push(current);
    if (current === start) break;
    current = parent[current];
  }
  return path.reverse();
}

function buildGridFrames(
  id: "bfs" | "dfs" | "dijkstra" | "astar",
  walls: Set<number>,
  weights: number[],
  start: number,
  end: number,
): Frame[] {
  const frames: Frame[] = [{ visited: [], frontier: [start], path: [], currentNode: start, message: "准备探索网格。点击格子可以重新编辑地图。", codeLine: 0, comparisons: 0, writes: 0 }];
  const parent = Array(CELL_COUNT).fill(-1);
  const visited = new Set<number>();
  let operations = 0;

  if (id === "bfs" || id === "dfs") {
    const frontier = [start];
    const discovered = new Set<number>([start]);
    while (frontier.length) {
      const node = id === "bfs" ? frontier.shift()! : frontier.pop()!;
      if (visited.has(node)) continue;
      visited.add(node);
      operations++;
      frames.push({ visited: [...visited], frontier: frontier.slice(), path: [], currentNode: node, message: node === end ? "到达终点，准备回溯路径。" : `${id === "bfs" ? "取出队首" : "弹出栈顶"}节点，继续检查相邻格子。`, codeLine: 2, comparisons: operations, writes: discovered.size });
      if (node === end) {
        const path = reconstructPath(parent, start, end);
        frames.push({ visited: [...visited], frontier: [], path, currentNode: end, message: `找到路径，共 ${Math.max(0, path.length - 1)} 步。`, codeLine: 6, comparisons: operations, writes: discovered.size });
        return frames;
      }
      const list = neighbors(node);
      if (id === "dfs") list.reverse();
      for (const next of list) {
        if (walls.has(next) || discovered.has(next)) continue;
        discovered.add(next);
        parent[next] = node;
        frontier.push(next);
      }
      frames.push({ visited: [...visited], frontier: frontier.slice(), path: [], currentNode: node, message: `把 ${frontier.length} 个待探索节点保留在${id === "bfs" ? "队列" : "栈"}中。`, codeLine: 5, comparisons: operations, writes: discovered.size });
    }
    frames.push({ visited: [...visited], frontier: [], path: [], message: "可到达区域已经探索完，没有找到终点。", codeLine: 6, comparisons: operations, writes: visited.size });
    return frames;
  }

  const dist = Array(CELL_COUNT).fill(Infinity);
  const closed = new Set<number>();
  dist[start] = 0;
  const open: { node: number; priority: number }[] = [{ node: start, priority: 0 }];

  const heuristic = (node: number) => {
    const r1 = Math.floor(node / COLS);
    const c1 = node % COLS;
    const r2 = Math.floor(end / COLS);
    const c2 = end % COLS;
    return Math.abs(r1 - r2) + Math.abs(c1 - c2);
  };

  while (open.length) {
    open.sort((a, b) => a.priority - b.priority);
    const { node } = open.shift()!;
    if (closed.has(node)) continue;
    closed.add(node);
    operations++;
    frames.push({ visited: [...closed], frontier: uniqueSorted(open.map((v) => v.node)), path: [], currentNode: node, message: node === end ? "当前最优节点就是终点。" : `选择当前总代价最小的节点，已知距离 ${Number.isFinite(dist[node]) ? dist[node] : "∞"}。`, codeLine: 2, comparisons: operations, writes: open.length });
    if (node === end) {
      const path = reconstructPath(parent, start, end);
      frames.push({ visited: [...closed], frontier: [], path, currentNode: end, message: `最短路径已确定，总代价 ${dist[end]}。`, codeLine: id === "astar" ? 8 : 7, comparisons: operations, writes: path.length });
      return frames;
    }
    for (const next of neighbors(node)) {
      if (walls.has(next) || closed.has(next)) continue;
      const stepCost = Math.max(1, weights[next] || 1);
      const nextDist = dist[node] + stepCost;
      if (nextDist < dist[next]) {
        dist[next] = nextDist;
        parent[next] = node;
        const priority = id === "astar" ? nextDist + heuristic(next) : nextDist;
        open.push({ node: next, priority });
        frames.push({ visited: [...closed], frontier: uniqueSorted(open.map((v) => v.node)), path: [], currentNode: next, message: id === "astar" ? `更新节点：g=${nextDist}，h=${heuristic(next)}，f=${priority}。` : `发现更短路线，把距离更新为 ${nextDist}。`, codeLine: id === "astar" ? 6 : 6, comparisons: operations, writes: open.length });
      }
    }
  }
  frames.push({ visited: [...closed], frontier: [], path: [], message: "优先队列已经为空，没有可达路径。", codeLine: 7, comparisons: operations, writes: 0 });
  return frames;
}

function buildFrames(
  id: AlgorithmId,
  data: number[],
  target: number,
  walls: Set<number>,
  weights: number[],
  start: number,
  end: number,
) {
  switch (id) {
    case "bubble": return buildBubble(data);
    case "selection": return buildSelection(data);
    case "insertion": return buildInsertion(data);
    case "quick": return buildQuick(data);
    case "merge": return buildMerge(data);
    case "heap": return buildHeap(data);
    case "linear": return buildLinear(data, target);
    case "binary": return buildBinary(data, target);
    case "bfs":
    case "dfs":
    case "dijkstra":
    case "astar":
      return buildGridFrames(id, walls, weights, start, end);
  }
}

function speedToDelay(speed: number) {
  const t = Math.max(0, Math.min(100, speed)) / 100;
  return Math.round(900 - 830 * Math.pow(t, 0.72));
}

function parseArrayInput(value: string) {
  const nums = value
    .split(/[\s,，;；]+/)
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isFinite(v))
    .map((v) => Math.round(Math.max(1, Math.min(99, v))))
    .slice(0, 24);
  return nums.length >= 2 ? nums : null;
}

function randomArray(length = 12) {
  return Array.from({ length }, () => Math.floor(8 + Math.random() * 90));
}

function randomGrid(start: number, end: number) {
  const walls = new Set<number>();
  const weights = Array(CELL_COUNT).fill(1);
  for (let i = 0; i < CELL_COUNT; i++) {
    if (i === start || i === end) continue;
    const r = Math.random();
    if (r < 0.16) walls.add(i);
    else if (r < 0.29) weights[i] = Math.random() < 0.55 ? 3 : 5;
  }
  return { walls, weights };
}

const CATEGORY_ORDER: ("全部" | AlgorithmCategory)[] = ["全部", "排序", "搜索", "图与路径"];

export default function Page() {
  const [algorithmId, setAlgorithmId] = useState<AlgorithmId>("quick");
  const [category, setCategory] = useState<"全部" | AlgorithmCategory>("全部");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<number[]>(DEFAULT_DATA);
  const [arrayDraft, setArrayDraft] = useState(DEFAULT_DATA.join(", "));
  const [target, setTarget] = useState(DEFAULT_TARGET);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(62);
  const [error, setError] = useState("");
  const [walls, setWalls] = useState<Set<number>>(() => createDefaultWalls());
  const [weights, setWeights] = useState<number[]>(() => createDefaultWeights());
  const [gridStart, setGridStart] = useState(DEFAULT_START);
  const [gridEnd, setGridEnd] = useState(DEFAULT_END);
  const [editMode, setEditMode] = useState<GridEditMode>("wall");

  const algorithm = useMemo(
    () => ALGORITHMS.find((item) => item.id === algorithmId) ?? ALGORITHMS[0],
    [algorithmId],
  );

  const frames = useMemo(
    () => buildFrames(algorithmId, data, target, walls, weights, gridStart, gridEnd),
    [algorithmId, data, target, walls, weights, gridStart, gridEnd],
  );

  const current = frames[Math.min(step, Math.max(0, frames.length - 1))] ?? frames[0];
  const progress = frames.length <= 1 ? 0 : Math.max(0, Math.min(1, step / (frames.length - 1)));

  useEffect(() => {
    setPlaying(false);
    setStep(0);
  }, [algorithmId, data, target, walls, weights, gridStart, gridEnd]);

  useEffect(() => {
    if (!playing) return;
    if (step >= frames.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setStep((value) => Math.min(frames.length - 1, value + 1));
    }, speedToDelay(speed));
    return () => window.clearTimeout(timer);
  }, [playing, step, speed, frames.length]);

  const filteredAlgorithms = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALGORITHMS.filter((item) => {
      const categoryMatch = category === "全部" || item.category === category;
      const queryMatch = !q || `${item.name} ${item.en} ${item.summary}`.toLowerCase().includes(q);
      return categoryMatch && queryMatch;
    });
  }, [category, query]);

  const applyArray = () => {
    const parsed = parseArrayInput(arrayDraft);
    if (!parsed) {
      setError("至少输入 2 个数字，使用逗号或空格分隔。范围会自动限制在 1–99。");
      return;
    }
    setError("");
    setData(parsed);
  };

  const shuffleArray = () => {
    const next = randomArray(Math.max(8, Math.min(18, data.length || 12)));
    setData(next);
    setArrayDraft(next.join(", "));
    if (algorithm.kind === "search") setTarget(next[Math.floor(next.length * 0.58)]);
  };

  const clearGrid = () => {
    setWalls(new Set());
    setWeights(Array(CELL_COUNT).fill(1));
  };

  const randomizeGrid = () => {
    const next = randomGrid(gridStart, gridEnd);
    setWalls(next.walls);
    setWeights(next.weights);
  };

  const handleGridCell = (index: number) => {
    if (playing) return;
    if (editMode === "start") {
      if (index === gridEnd) return;
      setGridStart(index);
      setWalls((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
      return;
    }
    if (editMode === "end") {
      if (index === gridStart) return;
      setGridEnd(index);
      setWalls((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
      return;
    }
    if (index === gridStart || index === gridEnd) return;
    if (editMode === "wall") {
      setWalls((prev) => {
        const next = new Set(prev);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        return next;
      });
      return;
    }
    setWeights((prev) => {
      const next = prev.slice();
      const currentWeight = next[index] || 1;
      next[index] = currentWeight === 1 ? 3 : currentWeight === 3 ? 5 : 1;
      return next;
    });
  };

  const renderArrayStage = () => {
    const values = current.array ?? data;
    const max = Math.max(...values, 1);
    const active = new Set(current.active ?? []);
    const secondary = new Set(current.secondary ?? []);
    const sorted = new Set(current.sorted ?? []);
    const range = current.range;

    return (
      <div className="array-stage" aria-label={`${algorithm.name} 可视化`}>
        <div className="array-bars">
          {values.map((value, index) => {
            const isFound = current.found === index;
            const isPivot = current.pivot === index;
            const outsideRange = range ? index < range[0] || index > range[1] : false;
            const stateClass = isFound
              ? "found"
              : isPivot
                ? "pivot"
                : active.has(index)
                  ? "active"
                  : secondary.has(index)
                    ? "secondary"
                    : sorted.has(index)
                      ? "sorted"
                      : outsideRange
                        ? "muted"
                        : "idle";
            const height = 18 + (value / max) * 70;
            return (
              <div className="bar-slot" key={index}>
                <div className={`bar ${stateClass}`} style={{ height: `${height}%` }}>
                  <span className="bar-value">{value}</span>
                </div>
                <span className="bar-index">{index}</span>
              </div>
            );
          })}
        </div>
        <div className="stage-legend">
          <span><i className="legend-dot active-dot" /> 当前比较</span>
          <span><i className="legend-dot secondary-dot" /> 指针 / 候选</span>
          <span><i className="legend-dot done-dot" /> 已确定</span>
          {algorithm.id === "quick" && <span><i className="legend-dot pivot-dot" /> Pivot</span>}
        </div>
      </div>
    );
  };

  const renderGridStage = () => {
    const visited = new Set(current.visited ?? []);
    const frontier = new Set(current.frontier ?? []);
    const path = new Set(current.path ?? []);
    const weighted = algorithm.id === "dijkstra" || algorithm.id === "astar";
    return (
      <div className="grid-wrap">
        <div
          className="path-grid"
          style={{ "--cols": COLS } as CSSProperties}
          role="grid"
          aria-label={`${algorithm.name} 网格`}
        >
          {Array.from({ length: CELL_COUNT }, (_, index) => {
            const isStart = index === gridStart;
            const isEnd = index === gridEnd;
            const isWall = walls.has(index);
            const isPath = path.has(index);
            const isCurrent = current.currentNode === index;
            const isFrontier = frontier.has(index);
            const isVisited = visited.has(index);
            const weight = weights[index] || 1;
            const cellClass = [
              "grid-cell",
              isWall ? "wall" : "",
              isVisited ? "visited" : "",
              isFrontier ? "frontier" : "",
              isPath ? "path" : "",
              isCurrent ? "current" : "",
              isStart ? "start" : "",
              isEnd ? "end" : "",
              weighted && weight > 1 && !isWall ? "weighted" : "",
            ].filter(Boolean).join(" ");
            return (
              <button
                type="button"
                key={index}
                className={cellClass}
                onClick={() => handleGridCell(index)}
                aria-label={isStart ? "起点" : isEnd ? "终点" : isWall ? "障碍" : `网格 ${index}`}
                title={isStart ? "起点" : isEnd ? "终点" : isWall ? "障碍" : weighted && weight > 1 ? `权重 ${weight}` : "点击编辑"}
              >
                {isStart ? "S" : isEnd ? "E" : weighted && weight > 1 && !isWall ? weight : ""}
              </button>
            );
          })}
        </div>
        <div className="stage-legend grid-legend">
          <span><i className="legend-dot frontier-dot" /> 待探索</span>
          <span><i className="legend-dot visited-dot" /> 已访问</span>
          <span><i className="legend-dot path-dot" /> 最终路径</span>
          {weighted && <span className="weight-note">数字格 = 移动代价</span>}
        </div>
      </div>
    );
  };

  return (
    <main className="algo-page">
      <style>{`
        * { box-sizing:border-box; }
        .algo-page {
          --algo-bg:#f5f3ed;
          --algo-surface:#ffffff;
          --algo-surface-soft:#faf9f5;
          --algo-surface-warm:#fbf7ed;
          --algo-line:rgba(35,38,34,.095);
          --algo-line-strong:rgba(35,38,34,.15);
          --algo-text:#20231f;
          --algo-muted:rgba(32,35,31,.58);
          --algo-soft:rgba(32,35,31,.36);
          --algo-faint:rgba(32,35,31,.18);
          --algo-gold:#a27b3d;
          --algo-gold-2:#795a29;
          --algo-coral:#c96f5b;
          --algo-green:#5f9272;
          --algo-blue:#6587aa;
          --algo-purple:#846fa8;
          min-height:100vh;
          color:var(--algo-text);
          background:
            radial-gradient(circle at 16% 4%,rgba(201,166,104,.12),transparent 27%),
            radial-gradient(circle at 88% 18%,rgba(101,135,170,.08),transparent 30%),
            linear-gradient(180deg,#fbfaf6 0%,var(--algo-bg) 72%,#f3f0e8 100%);
          font-family:Inter,"SF Pro Display","PingFang SC","Microsoft YaHei",system-ui,sans-serif;
          overflow-x:hidden;
        }
        .algo-page::before {
          content:"";
          position:fixed;
          inset:0;
          pointer-events:none;
          opacity:.34;
          background-image:
            linear-gradient(rgba(56,58,52,.032) 1px,transparent 1px),
            linear-gradient(90deg,rgba(56,58,52,.032) 1px,transparent 1px);
          background-size:44px 44px;
          mask-image:linear-gradient(to bottom,black,transparent 82%);
        }
        button,input { font:inherit; }
        button { color:inherit; }
        button:focus-visible,input:focus-visible {
          outline:none;
          box-shadow:0 0 0 3px rgba(162,123,61,.14);
          border-color:rgba(162,123,61,.45)!important;
        }
        .algo-shell { position:relative; z-index:1; width:min(1540px,calc(100% - 36px)); margin:0 auto; padding:18px 0 34px; }
        .breadcrumb-wrap { min-height:34px; display:flex; align-items:center; margin-bottom:12px; }
        .hero { display:flex; align-items:flex-end; justify-content:space-between; gap:28px; padding:18px 4px 24px; }
        .eyebrow { color:var(--algo-gold); font-size:11px; letter-spacing:.22em; text-transform:uppercase; margin-bottom:9px; font-weight:650; }
        .hero h1 { margin:0; font-size:clamp(34px,4vw,58px); line-height:1; letter-spacing:-.045em; font-weight:680; color:#1d201c; }
        .hero h1 span { color:rgba(32,35,31,.46); font-weight:440; }
        .hero p { max-width:720px; margin:13px 0 0; color:var(--algo-muted); line-height:1.72; font-size:13px; }
        .hero-metrics { display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-end; }
        .metric-chip {
          min-width:112px;
          padding:12px 14px;
          border:1px solid var(--algo-line);
          border-radius:14px;
          background:rgba(255,255,255,.74);
          box-shadow:0 8px 24px rgba(47,43,34,.035),inset 0 1px 0 rgba(255,255,255,.9);
        }
        .metric-chip strong { display:block; font-size:17px; font-weight:650; color:#252721; }
        .metric-chip span { display:block; margin-top:3px; font-size:10px; color:var(--algo-soft); letter-spacing:.08em; }

        .workspace {
          display:grid;
          grid-template-columns:250px minmax(0,1fr) 318px;
          min-height:720px;
          border:1px solid var(--algo-line-strong);
          border-radius:26px;
          overflow:hidden;
          background:rgba(255,255,255,.92);
          box-shadow:0 24px 70px rgba(57,49,35,.10),0 2px 10px rgba(57,49,35,.035);
        }
        .sidebar { min-width:0; border-right:1px solid var(--algo-line); background:#fbfaf6; padding:17px 14px 18px; }
        .side-label { font-size:10px; letter-spacing:.14em; color:var(--algo-soft); margin:0 5px 9px; text-transform:uppercase; font-weight:650; }
        .algo-search {
          width:100%;
          border:1px solid var(--algo-line);
          border-radius:12px;
          background:#fff;
          color:var(--algo-text);
          padding:10px 12px;
          outline:none;
          font-size:12px;
          box-shadow:inset 0 1px 2px rgba(40,38,32,.025);
        }
        .algo-search::placeholder { color:rgba(32,35,31,.32); }
        .category-tabs { display:flex; flex-wrap:wrap; gap:6px; margin:12px 0 14px; }
        .category-btn { border:1px solid transparent; background:transparent; border-radius:999px; padding:6px 9px; font-size:10px; color:var(--algo-muted); cursor:pointer; transition:.16s ease; }
        .category-btn:hover { background:rgba(32,35,31,.035); color:var(--algo-text); }
        .category-btn.active { color:var(--algo-gold-2); border-color:rgba(162,123,61,.22); background:rgba(197,158,91,.11); font-weight:650; }
        .algo-list { display:flex; flex-direction:column; gap:5px; max-height:592px; overflow:auto; padding-right:3px; scrollbar-gutter:stable; }
        .algo-list::-webkit-scrollbar,.inspector-scroll::-webkit-scrollbar { width:5px; }
        .algo-list::-webkit-scrollbar-thumb,.inspector-scroll::-webkit-scrollbar-thumb { background:rgba(32,35,31,.13); border-radius:99px; }
        .algo-item { position:relative; text-align:left; width:100%; border:1px solid transparent; border-radius:13px; background:transparent; padding:10px 10px 9px 12px; cursor:pointer; transition:.16s ease; }
        .algo-item::before { content:""; position:absolute; left:3px; top:50%; width:3px; height:0; transform:translateY(-50%); border-radius:99px; background:var(--algo-gold); transition:.16s ease; }
        .algo-item:hover { background:rgba(32,35,31,.035); }
        .algo-item.active { background:linear-gradient(135deg,rgba(197,158,91,.13),rgba(255,255,255,.72)); border-color:rgba(162,123,61,.18); }
        .algo-item.active::before { height:26px; }
        .algo-name { display:flex; align-items:center; justify-content:space-between; gap:8px; font-size:12px; font-weight:540; }
        .algo-name em { font-style:normal; font-size:9px; color:var(--algo-soft); font-family:"SFMono-Regular",Consolas,monospace; }
        .algo-en { margin-top:3px; font-size:9px; color:rgba(32,35,31,.32); letter-spacing:.04em; }

        .stage-column { min-width:0; display:flex; flex-direction:column; background:linear-gradient(180deg,#fff,#fdfcf8); }
        .stage-head { padding:18px 20px 14px; border-bottom:1px solid var(--algo-line); display:flex; justify-content:space-between; gap:18px; align-items:flex-start; }
        .stage-title-row { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
        .stage-title { font-size:19px; font-weight:660; letter-spacing:-.02em; }
        .stage-category { font-size:9px; letter-spacing:.12em; padding:5px 8px; border:1px solid rgba(162,123,61,.2); color:var(--algo-gold-2); border-radius:999px; background:rgba(197,158,91,.1); font-weight:650; }
        .stage-summary { margin-top:5px; max-width:650px; color:var(--algo-muted); font-size:11px; line-height:1.6; }
        .complexity-mini { display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end; }
        .complexity-mini span { padding:6px 8px; border:1px solid var(--algo-line); border-radius:9px; font-size:9px; color:rgba(32,35,31,.56); background:rgba(250,249,245,.82); white-space:nowrap; font-family:"SFMono-Regular",Consolas,monospace; }

        .visual-stage {
          position:relative;
          min-height:430px;
          display:flex;
          align-items:stretch;
          justify-content:center;
          padding:25px 22px 16px;
          overflow:hidden;
          background:
            radial-gradient(circle at 50% 45%,rgba(210,175,112,.10),transparent 40%),
            linear-gradient(180deg,#fff 0%,#fdfbf5 100%);
        }
        .visual-stage::after {
          content:"";
          position:absolute;
          inset:0;
          pointer-events:none;
          opacity:.45;
          background-image:linear-gradient(rgba(52,55,49,.035) 1px,transparent 1px);
          background-size:100% 52px;
          mask-image:linear-gradient(to bottom,transparent 3%,black 20%,black 82%,transparent 98%);
        }
        .array-stage { position:relative; z-index:1; width:100%; display:flex; flex-direction:column; min-height:380px; }
        .array-bars { flex:1; display:flex; align-items:flex-end; justify-content:center; gap:clamp(4px,1vw,12px); padding:48px 8px 24px; min-height:310px; }
        .bar-slot { height:100%; flex:1 1 0; max-width:64px; min-width:13px; display:flex; flex-direction:column; justify-content:flex-end; align-items:center; gap:7px; }
        .bar {
          width:100%;
          min-height:20px;
          position:relative;
          border-radius:8px 8px 3px 3px;
          border:1px solid rgba(55,57,52,.10);
          transition:height .24s ease,background .2s ease,transform .2s ease,border-color .2s ease,opacity .2s ease,box-shadow .2s ease;
          box-shadow:inset 0 1px rgba(255,255,255,.65),0 4px 12px rgba(44,43,38,.045);
        }
        .bar.idle { background:linear-gradient(180deg,#dcd9cf,#c9c5b9); }
        .bar.active { background:linear-gradient(180deg,#d8b56f,#b88b43); border-color:rgba(151,107,44,.35); transform:translateY(-5px); box-shadow:0 10px 22px rgba(162,123,61,.17); }
        .bar.secondary { background:linear-gradient(180deg,#92b2cf,#6f91b3); border-color:rgba(79,112,146,.28); }
        .bar.sorted,.bar.found { background:linear-gradient(180deg,#85b79a,#639879); border-color:rgba(77,128,95,.28); }
        .bar.pivot { background:linear-gradient(180deg,#df917f,#c96f5b); border-color:rgba(171,76,58,.3); transform:translateY(-5px); box-shadow:0 10px 22px rgba(201,111,91,.15); }
        .bar.muted { opacity:.22; }
        .bar-value { position:absolute; top:-21px; left:50%; transform:translateX(-50%); font-size:9px; color:rgba(32,35,31,.68); font-weight:650; font-variant-numeric:tabular-nums; }
        .bar-index { font-size:8px; color:rgba(32,35,31,.28); font-variant-numeric:tabular-nums; }
        .stage-legend { display:flex; justify-content:center; flex-wrap:wrap; gap:14px; color:rgba(32,35,31,.48); font-size:9px; min-height:22px; }
        .stage-legend span { display:flex; align-items:center; gap:6px; }
        .legend-dot { width:7px; height:7px; display:inline-block; border-radius:50%; background:rgba(32,35,31,.2); }
        .active-dot{background:var(--algo-gold)} .secondary-dot{background:var(--algo-blue)} .done-dot{background:var(--algo-green)} .pivot-dot{background:var(--algo-coral)} .frontier-dot{background:var(--algo-gold)} .visited-dot{background:var(--algo-blue)} .path-dot{background:var(--algo-green)}

        .grid-wrap { position:relative; z-index:1; width:min(100%,820px); margin:auto; display:flex; flex-direction:column; justify-content:center; }
        .path-grid { --cols:18; display:grid; grid-template-columns:repeat(var(--cols),minmax(0,1fr)); gap:3px; width:100%; aspect-ratio:18/11.5; }
        .grid-cell { min-width:0; border:1px solid rgba(52,55,49,.09); border-radius:5px; background:rgba(255,255,255,.82); color:rgba(32,35,31,.5); font-size:8px; cursor:pointer; transition:background .16s ease,transform .16s ease,border-color .16s ease,opacity .16s ease,box-shadow .16s ease; display:grid; place-items:center; padding:0; }
        .grid-cell:hover { border-color:rgba(162,123,61,.35); box-shadow:0 0 0 2px rgba(162,123,61,.07); }
        .grid-cell.wall { background:#50534d; border-color:#444741; box-shadow:inset 0 0 0 1px rgba(255,255,255,.08); }
        .grid-cell.weighted { background:rgba(132,111,168,.13); color:#725e96; }
        .grid-cell.frontier { background:rgba(214,179,111,.34); border-color:rgba(162,123,61,.30); }
        .grid-cell.visited { background:rgba(101,135,170,.19); border-color:rgba(101,135,170,.24); }
        .grid-cell.path { background:rgba(95,146,114,.67); border-color:rgba(72,127,91,.42); box-shadow:0 4px 12px rgba(95,146,114,.12); }
        .grid-cell.current { transform:scale(.86); background:rgba(201,111,91,.82); border-color:rgba(171,76,58,.45); }
        .grid-cell.start { background:#76a98a!important; border-color:#5e9773!important; color:#fff!important; font-weight:750; }
        .grid-cell.end { background:#d77f6b!important; border-color:#c36450!important; color:#fff!important; font-weight:750; }
        .grid-legend { margin-top:16px; }
        .weight-note { color:#765f9c; }

        .playback { border-top:1px solid var(--algo-line); padding:13px 18px 15px; background:#fbfaf6; }
        .progress-track { height:4px; border-radius:99px; background:rgba(32,35,31,.08); overflow:hidden; margin-bottom:12px; }
        .progress-fill { height:100%; border-radius:inherit; background:linear-gradient(90deg,#b48a49,var(--algo-coral)); transition:width .12s linear; }
        .playback-row { display:flex; align-items:center; gap:9px; }
        .icon-btn,.play-btn,.soft-btn { border:1px solid var(--algo-line); background:#fff; cursor:pointer; transition:.16s ease; box-shadow:0 1px 2px rgba(41,39,34,.025); }
        .icon-btn:hover,.soft-btn:hover { background:#f7f4ec; border-color:rgba(32,35,31,.16); transform:translateY(-1px); }
        .icon-btn { width:34px; height:34px; border-radius:10px; display:grid; place-items:center; font-size:13px; }
        .play-btn { min-width:88px; height:36px; border-radius:11px; background:#2b302a; border-color:#2b302a; color:#fff; font-size:11px; font-weight:650; box-shadow:0 5px 14px rgba(35,39,34,.12); }
        .play-btn:hover { background:#1f231f; }
        .speed-wrap { margin-left:auto; display:flex; align-items:center; gap:9px; min-width:190px; }
        .speed-wrap label { font-size:9px; color:var(--algo-soft); white-space:nowrap; }
        .speed-wrap input { width:100%; accent-color:var(--algo-gold); }
        .step-count { min-width:65px; text-align:right; font-size:9px; color:var(--algo-soft); font-variant-numeric:tabular-nums; }

        .inspector { min-width:0; border-left:1px solid var(--algo-line); background:#fbfaf6; display:flex; flex-direction:column; }
        .inspector-scroll { overflow:auto; padding:16px 15px 28px; scrollbar-gutter:stable; }
        .section { padding:0 0 17px; margin-bottom:17px; border-bottom:1px solid var(--algo-line); }
        .section:last-child { border-bottom:0; }
        .section-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
        .section-title { font-size:10px; color:rgba(32,35,31,.75); letter-spacing:.08em; font-weight:650; }
        .section-kicker { font-size:8px; color:var(--algo-soft); font-family:"SFMono-Regular",Consolas,monospace; }
        .message-card { border:1px solid rgba(162,123,61,.14); background:linear-gradient(135deg,#fcf5e6,#fffdf8); border-radius:14px; padding:12px 13px; color:rgba(32,35,31,.75); font-size:11px; line-height:1.7; box-shadow:inset 3px 0 0 rgba(162,123,61,.35); }
        .input-row { display:flex; gap:7px; }
        .text-input,.number-input { width:100%; min-width:0; border:1px solid var(--algo-line); background:#fff; color:var(--algo-text); border-radius:10px; padding:9px 10px; outline:none; font-size:10px; }
        .text-input::placeholder,.number-input::placeholder { color:rgba(32,35,31,.28); }
        .soft-btn { border-radius:10px; padding:8px 10px; font-size:9px; white-space:nowrap; color:rgba(32,35,31,.66); }
        .soft-btn.active { border-color:rgba(162,123,61,.25); background:rgba(197,158,91,.13); color:var(--algo-gold-2); font-weight:650; }
        .error { margin-top:6px; color:#b85848; font-size:9px; line-height:1.5; }
        .target-row { margin-top:8px; display:grid; grid-template-columns:1fr 82px; gap:8px; align-items:center; }
        .target-row label { font-size:9px; color:var(--algo-soft); }
        .grid-tools { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; }
        .grid-tools + .grid-tools { margin-top:6px; }
        .code-block { border:1px solid var(--algo-line); border-radius:13px; overflow:hidden; background:#f4f2ec; box-shadow:inset 0 1px 0 rgba(255,255,255,.7); }
        .code-line { display:grid; grid-template-columns:24px minmax(0,1fr); gap:5px; padding:6px 9px; color:rgba(39,43,38,.55); font:9px/1.45 "SFMono-Regular",Consolas,"Liberation Mono",monospace; transition:.15s ease; }
        .code-line + .code-line { border-top:1px solid rgba(35,38,34,.035); }
        .code-line .no { color:rgba(32,35,31,.25); user-select:none; }
        .code-line.active { color:#5e4723; background:linear-gradient(90deg,#f7e9c7,#fbf5e7); box-shadow:inset 3px 0 var(--algo-gold); font-weight:650; }
        .stats-grid { display:grid; grid-template-columns:1fr 1fr; gap:7px; }
        .stat-box { border:1px solid var(--algo-line); border-radius:11px; padding:9px 10px; background:#fff; }
        .stat-box span { display:block; font-size:8px; color:var(--algo-soft); margin-bottom:4px; }
        .stat-box strong { font-size:13px; font-weight:650; color:rgba(32,35,31,.82); font-variant-numeric:tabular-nums; }
        .complexity-list { display:grid; grid-template-columns:1fr 1fr; gap:7px; }
        .complexity-item { padding:8px 9px; border-radius:10px; border:1px solid rgba(35,38,34,.055); background:#fff; }
        .complexity-item span { display:block; font-size:8px; color:var(--algo-soft); }
        .complexity-item strong { display:block; margin-top:3px; font-size:10px; color:rgba(32,35,31,.72); font-family:"SFMono-Regular",Consolas,monospace; }
        .footer-note-wrap { margin-top:20px; }

        @media (max-width:1250px) {
          .workspace { grid-template-columns:220px minmax(0,1fr); }
          .inspector { grid-column:1 / -1; border-left:0; border-top:1px solid var(--algo-line); }
          .inspector-scroll { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; overflow:visible; }
          .section { border-bottom:0; margin-bottom:0; padding-bottom:0; }
        }
        @media (max-width:860px) {
          .algo-shell { width:min(100% - 20px,760px); padding-top:10px; }
          .hero { align-items:flex-start; flex-direction:column; gap:14px; padding-top:10px; }
          .hero-metrics { justify-content:flex-start; }
          .workspace { grid-template-columns:1fr; min-height:0; border-radius:20px; }
          .sidebar { border-right:0; border-bottom:1px solid var(--algo-line); }
          .algo-list { flex-direction:row; overflow-x:auto; max-height:none; padding:0 0 4px; scrollbar-width:thin; }
          .algo-item { min-width:150px; }
          .stage-head { flex-direction:column; }
          .complexity-mini { justify-content:flex-start; }
          .visual-stage { min-height:380px; padding:20px 12px 12px; }
          .array-stage { min-height:335px; }
          .array-bars { min-height:275px; gap:5px; }
          .path-grid { gap:2px; }
          .inspector-scroll { grid-template-columns:1fr 1fr; }
          .playback-row { flex-wrap:wrap; }
          .speed-wrap { width:100%; margin-left:0; order:2; }
          .step-count { margin-left:auto; }
        }
        @media (max-width:560px) {
          .algo-shell { width:calc(100% - 12px); }
          .hero { padding-left:3px; padding-right:3px; }
          .hero h1 { font-size:36px; line-height:1.04; }
          .hero h1 span { display:block; margin-top:7px; font-size:20px; letter-spacing:-.02em; }
          .hero-metrics { width:100%; }
          .metric-chip { flex:1; min-width:0; padding:10px 11px; }
          .workspace { border-radius:17px; }
          .stage-head { padding:15px 14px 12px; }
          .visual-stage { min-height:330px; padding:16px 8px 10px; }
          .array-bars { min-height:230px; padding:43px 2px 20px; gap:3px; }
          .bar { border-radius:5px 5px 2px 2px; }
          .bar-value { font-size:8px; }
          .bar-index { display:none; }
          .grid-cell { border-radius:3px; font-size:7px; }
          .path-grid { gap:1.5px; }
          .inspector-scroll { grid-template-columns:1fr; padding:14px 13px 28px; }
          .stage-legend { gap:9px; }
          .playback { padding-left:12px; padding-right:12px; }
          .play-btn { min-width:82px; }
        }
        @media (prefers-reduced-motion:reduce) {
          *,*::before,*::after { scroll-behavior:auto!important; transition:none!important; animation:none!important; }
        }
      `}</style>

      <div className="algo-shell">
        <div className="breadcrumb-wrap"><Breadcrumb /></div>

        <header className="hero">
          <div>
            <div className="eyebrow">BitLeap · Interactive Lab</div>
            <h1>算法可视化实验室</h1>
            <p>把抽象步骤变成可以暂停、回退、修改数据的动态展示。先看见算法怎么走，再理解它为什么这样走。</p>
          </div>
          <div className="hero-metrics" aria-label="工具概览">
            <div className="metric-chip"><strong>12</strong><span>常用算法</span></div>
            <div className="metric-chip"><strong>0</strong><span>服务端上传</span></div>
            <div className="metric-chip"><strong>∞</strong><span>可重复实验</span></div>
          </div>
        </header>

        <section className="workspace">
          <aside className="sidebar">
            <div className="side-label">Algorithms</div>
            <input
              className="algo-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索算法…"
              aria-label="搜索算法"
            />
            <div className="category-tabs">
              {CATEGORY_ORDER.map((item) => (
                <button type="button" key={item} onClick={() => setCategory(item)} className={`category-btn ${category === item ? "active" : ""}`}>{item}</button>
              ))}
            </div>
            <div className="algo-list">
              {filteredAlgorithms.map((item) => (
                <button
                  type="button"
                  className={`algo-item ${algorithmId === item.id ? "active" : ""}`}
                  key={item.id}
                  onClick={() => setAlgorithmId(item.id)}
                >
                  <div className="algo-name"><span>{item.name}</span><em>{item.average}</em></div>
                  <div className="algo-en">{item.en}</div>
                </button>
              ))}
            </div>
          </aside>

          <section className="stage-column">
            <div className="stage-head">
              <div>
                <div className="stage-title-row">
                  <div className="stage-title">{algorithm.name}</div>
                  <span className="stage-category">{algorithm.category}</span>
                </div>
                <div className="stage-summary">{algorithm.summary}</div>
              </div>
              <div className="complexity-mini">
                <span>平均 {algorithm.average}</span>
                <span>空间 {algorithm.space}</span>
              </div>
            </div>

            <div className="visual-stage">
              {algorithm.kind === "grid" ? renderGridStage() : renderArrayStage()}
            </div>

            <div className="playback">
              <div className="progress-track"><div className="progress-fill" style={{ width: `${progress * 100}%` }} /></div>
              <div className="playback-row">
                <button type="button" className="icon-btn" onClick={() => { setPlaying(false); setStep(0); }} aria-label="回到开始">↺</button>
                <button type="button" className="icon-btn" onClick={() => { setPlaying(false); setStep((v) => Math.max(0, v - 1)); }} aria-label="上一步">‹</button>
                <button type="button" className="play-btn" onClick={() => { if (playing) { setPlaying(false); return; } if (step >= frames.length - 1) setStep(0); setPlaying(true); }}>{playing ? "Ⅱ  暂停" : step >= frames.length - 1 ? "↺  重播" : "▶  播放"}</button>
                <button type="button" className="icon-btn" onClick={() => { setPlaying(false); setStep((v) => Math.min(frames.length - 1, v + 1)); }} aria-label="下一步">›</button>
                <div className="step-count">{step + 1} / {frames.length}</div>
                <div className="speed-wrap">
                  <label htmlFor="speed">速度</label>
                  <input id="speed" type="range" min="0" max="100" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
                  <span style={{ fontSize: 9, color: "rgba(32,35,31,.38)", minWidth: 30, textAlign: "right" }}>{speed < 34 ? "慢" : speed > 72 ? "快" : "中"}</span>
                </div>
              </div>
            </div>
          </section>

          <aside className="inspector">
            <div className="inspector-scroll">
              <section className="section">
                <div className="section-head"><span className="section-title">此刻发生了什么</span><span className="section-kicker">STEP {step + 1}</span></div>
                <div className="message-card" aria-live="polite">{current.message}</div>
              </section>

              <section className="section">
                <div className="section-head"><span className="section-title">实验数据</span><span className="section-kicker">EDIT</span></div>
                {algorithm.kind !== "grid" ? (
                  <>
                    <div className="input-row">
                      <input className="text-input" value={arrayDraft} onChange={(e) => setArrayDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") applyArray(); }} aria-label="数组数据" />
                      <button type="button" className="soft-btn" onClick={applyArray}>应用</button>
                    </div>
                    <div className="input-row" style={{ marginTop: 7 }}>
                      <button type="button" className="soft-btn" onClick={shuffleArray}>随机数据</button>
                      <button type="button" className="soft-btn" onClick={() => { const next = [...data].sort((a,b)=>a-b); setData(next); setArrayDraft(next.join(", ")); }}>近乎有序</button>
                      <button type="button" className="soft-btn" onClick={() => { const next = [...data].sort((a,b)=>b-a); setData(next); setArrayDraft(next.join(", ")); }}>逆序</button>
                    </div>
                    {algorithm.kind === "search" && (
                      <div className="target-row"><label htmlFor="target">目标值 Target</label><input id="target" className="number-input" type="number" min="1" max="99" value={target} onChange={(e) => setTarget(Math.max(1, Math.min(99, Number(e.target.value) || 1)))} /></div>
                    )}
                    {error && <div className="error">{error}</div>}
                  </>
                ) : (
                  <>
                    <div className="grid-tools">
                      <button type="button" className={`soft-btn ${editMode === "wall" ? "active" : ""}`} onClick={() => setEditMode("wall")}>画障碍</button>
                      <button type="button" className={`soft-btn ${editMode === "weight" ? "active" : ""}`} onClick={() => setEditMode("weight")}>改权重</button>
                      <button type="button" className={`soft-btn ${editMode === "start" ? "active" : ""}`} onClick={() => setEditMode("start")}>设置起点</button>
                      <button type="button" className={`soft-btn ${editMode === "end" ? "active" : ""}`} onClick={() => setEditMode("end")}>设置终点</button>
                    </div>
                    <div className="grid-tools">
                      <button type="button" className="soft-btn" onClick={randomizeGrid}>随机地图</button>
                      <button type="button" className="soft-btn" onClick={clearGrid}>清空地图</button>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 9, color: "rgba(32,35,31,.38)", lineHeight: 1.6 }}>Dijkstra / A* 会读取权重；BFS / DFS 只关心是否可达。权重按钮会在 1 → 3 → 5 之间循环。</div>
                  </>
                )}
              </section>

              <section className="section">
                <div className="section-head"><span className="section-title">伪代码</span><span className="section-kicker">TRACE</span></div>
                <div className="code-block">
                  {algorithm.code.map((line, index) => (
                    <div key={`${algorithm.id}-${index}`} className={`code-line ${current.codeLine === index ? "active" : ""}`}>
                      <span className="no">{String(index + 1).padStart(2, "0")}</span><span>{line}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="section">
                <div className="section-head"><span className="section-title">运行观察</span><span className="section-kicker">LIVE</span></div>
                <div className="stats-grid">
                  <div className="stat-box"><span>{algorithm.kind === "grid" ? "探索次数" : "比较次数"}</span><strong>{current.comparisons ?? 0}</strong></div>
                  <div className="stat-box"><span>{algorithm.kind === "grid" ? "前沿规模" : "写入 / 交换"}</span><strong>{current.writes ?? 0}</strong></div>
                </div>
              </section>

              <section className="section">
                <div className="section-head"><span className="section-title">复杂度</span><span className="section-kicker">BIG O</span></div>
                <div className="complexity-list">
                  <div className="complexity-item"><span>最好</span><strong>{algorithm.best}</strong></div>
                  <div className="complexity-item"><span>平均</span><strong>{algorithm.average}</strong></div>
                  <div className="complexity-item"><span>最坏</span><strong>{algorithm.worst}</strong></div>
                  <div className="complexity-item"><span>空间</span><strong>{algorithm.space}</strong></div>
                </div>
                {algorithm.category === "排序" && (
                  <div style={{ marginTop: 8, fontSize: 9, color: "rgba(32,35,31,.38)" }}>稳定性：{algorithm.stable ? "稳定" : "通常不稳定"}</div>
                )}
              </section>
            </div>
          </aside>
        </section>

        <div className="footer-note-wrap">
          <FooterNote />
        </div>
      </div>
    </main>
  );
}
