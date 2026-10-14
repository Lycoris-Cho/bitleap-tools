"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { Breadcrumb } from "@/components/breadcrumb";

type FitMode = "铺满画布" | "完整显示";
type KeyMode = "保留透明" | "自动去纯色";
type BlendMode = "正常" | "柔光" | "滤色" | "叠加";
;
type ExportSize = "原图尺寸" | "1920px" | "2560px" | "3840px";
type LightPatchShape = "柔光" | "硬光" | "光带";
type LightPatchMode = "光" | "影";

type LightPatch = {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  intensity: number;
  softness: number;
  highlight: number;
  shape: LightPatchShape;
  mode: LightPatchMode;
};

type ImageAsset = {
  img: HTMLImageElement;
  url: string;
  name: string;
  width: number;
  height: number;
};

/** 进入撤销栈的状态快照：只收会改变成图的部分 */
type Snapshot = {
  settings: Settings;
  transform: Transform;
  lightPatches: LightPatch[];
};

type Transform = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  flipX: boolean;
};

type Settings = {
  bgFit: FitMode;
  bgBlur: number;
  bgBrightness: number;
  bgSaturation: number;

  personOpacity: number;
  personBrightness: number;
  personContrast: number;
  personSaturation: number;
  personWarmth: number;
  personBlur: number;
  edgeSoftness: number;
  ambientTint: number;
  ambientHaze: number;

  // 局部环境光：让人物真正“吃到”现实场景中的方向光。
  lightStrength: number;
  lightAngle: number;
  lightSoftness: number;
  lightCoverage: number;
  lightWarmth: number;
  lightLift: number;

  // clean-room intrinsic-style relighting
  relightStrength: number;
  volumeDepth: number;
  wrapLight: number;
  edgeLight: number;
  backShade: number;
  faceShadowStrength: number;
  faceShadowSoftness: number;
  faceShadowThreshold: number;

  // 可拖动局部光斑：用于模拟窗缝、路灯、霓虹等直接打到人物上的局部光。
  localLightShadow: number;
  localLightBloom: number;

  blendMode: BlendMode;

  keyMode: KeyMode;
  keyTolerance: number;
  keyFeather: number;

  /*
   * 边缘去污染。
   *
   * 抠图 PNG 的半透明像素里通常还残留着原背景的颜色（白底抠图 => 白边，
   * 黑底/绿幕 => 深边/绿边）。这是「像贴纸」最主要的原因，也是调色阶段
   * 唯一无法补救的问题：再好的环境色匹配也盖不住一圈白边。
   * 做法是在人物 alpha 内部做一次颜色外推（interior color bleed），
   * 把轮廓附近被污染的像素颜色替换成邻近实心区域的颜色，再轻微收缩遮罩。
   */
  edgeDecontaminate: number;
  edgeChoke: number;

  // 环境色分布：0 = 单一均值染色，1 = 完全按背景四角做双线性渐变（AE 四色渐变思路）
  ambientSpread: number;

  shadowOpacity: number;
  shadowBlur: number;
  shadowX: number;
  shadowY: number;
  // 落地投影：沿光向斜切并拉伸，形成“贴地”的方向性投影，而不是简单偏移的贴纸阴影
  shadowLength: number;
  shadowSkew: number;
  contactShadow: number;
  contactShadowWidth: number;
  contactShadowBlur: number;
  rimLight: number;
  personGlow: number;
  personGlowSize: number;
  personGlowColor: string;
  // 背光：人物轮廓外的光溢出，逆光/霓虹场景里最出效果的一层
  backLight: number;
  backLightSize: number;
  backLightColor: string;

  // 人物表面高光（镜面反射）：有高光才像被灯照到，而不是整体提亮
  specular: number;
  specularSharpness: number;
  // 亮部滚降：让过曝区域平滑过渡到白，而不是硬切到 255
  highlightRolloff: number;
  overallExposure: number;
  overallContrast: number;
  overallSaturation: number;
  overallWarmth: number;
  grain: number;
  vignette: number;
  bloom: number;

  exportSize: ExportSize;
};

/*
 * 默认参数：**恒等**。
 *
 * 导入一张人物，它必须和原图一模一样 —— 不加深、不降饱和、不模糊、不重照明、
 * 不压高光、不去边。所有会改变画面像素的东西一律默认关闭，由用户自己按需加
 * （「一键融入」会按现场情况把这套参数一次性配好，那是用户主动触发的动作）。
 *
 * 注意 personBrightness / personContrast / personSaturation / overallExposure 等
 * 之所以是 1 而不是"差不多"，是因为合成里对恒等值做了短路（见 createProcessedPerson
 * 与 buildBackgroundCanvas），这样连一次滤镜求值的舍入都不会发生。
 */
const DEFAULT_SETTINGS: Settings = {
  bgFit: "完整显示",
  bgBlur: 0,
  bgBrightness: 1,
  bgSaturation: 1,

  // 人物：全部恒等
  personOpacity: 1,
  personBrightness: 1,
  personContrast: 1,
  personSaturation: 1,
  personWarmth: 0,
  personBlur: 0,
  edgeSoftness: 0,
  ambientTint: 0,
  ambientHaze: 0,

  // 光照：默认不参与合成（保留参数本身，方便用户自己拉起来）
  lightStrength: 0,
  lightAngle: -35,
  lightSoftness: 0.62,
  lightCoverage: 0.58,
  lightWarmth: 0.06,
  lightLift: 0,
  relightStrength: 0,
  volumeDepth: 0.62,
  wrapLight: 0.34,
  edgeLight: 0.22,
  backShade: 0.18,
  faceShadowStrength: 0.32,
  faceShadowSoftness: 0.38,
  faceShadowThreshold: 0.48,
  localLightShadow: 0,
  localLightBloom: 0.08,
  blendMode: "正常",

  // 投影与落地感：默认不生成，用户自己加
  shadowOpacity: 0,
  shadowBlur: 20,
  shadowX: 6,
  shadowY: 14,
  shadowLength: 0.62,
  shadowSkew: 0.5,
  contactShadow: 0,
  contactShadowWidth: 0.72,
  contactShadowBlur: 18,
  rimLight: 0,
  personGlow: 0,
  personGlowSize: 20,
  personGlowColor: "#B6D7FF",
  backLight: 0,
  backLightSize: 26,
  backLightColor: "#FFD9A6",

  // 高光：默认不改动原图
  specular: 0,
  specularSharpness: 0.42,
  highlightRolloff: 0,

  // 去背：默认沿用原图 alpha，不做任何像素改动
  keyMode: "保留透明",
  keyTolerance: 0.2,
  keyFeather: 0.16,
  edgeDecontaminate: 0,
  edgeChoke: 0,
  ambientSpread: 0.55,

  // 整体调色：默认恒等
  overallExposure: 1,
  overallContrast: 1,
  overallSaturation: 1,
  overallWarmth: 0,
  grain: 0,
  vignette: 0,
  bloom: 0,

  exportSize: "原图尺寸",
};

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

/**
 * 复用的离屏画布。
 *
 * 合成流程每帧都要几块临时画布（调色、泛光、局部光斑图层）。
 * 之前每帧都 document.createElement("canvas")，在 960~2880 这个量级上
 * 会产生大量大块内存分配，拖动时 GC 抖动明显。这里按用途缓存下来复用。
 */
const scratchCanvases = new Map<string, HTMLCanvasElement>();

function getScratch(key: string, w: number, h: number) {
  let canvas = scratchCanvases.get(key);
  if (!canvas) {
    canvas = document.createElement("canvas");
    scratchCanvases.set(key, canvas);
  }
  if (canvas.width !== w || canvas.height !== h) {
    // 尺寸变化会顺带清空内容，正好符合预期。
    canvas.width = w;
    canvas.height = h;
  }
  return canvas;
}

/** getScratch 的 ctx 版本：拿到的画布一定是干净的（尺寸没变时手动清一次） */
function getScratchCtx(key: string, w: number, h: number) {
  const canvas = getScratch(key, w, h);
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.filter = "none";
  ctx.clearRect(0, 0, w, h);
  return { canvas, ctx };
}

/**
 * 人物内容包围盒（按 alpha 计算，归一化到 0~1）。
 *
 * 抠好的透明 PNG 往往四周带很多透明留白，直接用图片高度去算「脚在哪」
 * 会整体偏上一大截：接触阴影浮在半空、自动摆放也摆不到地平面。
 * 所以这里统计真正不透明的范围，后续落地阴影、自动构图都以它为基准。
 */
type PersonBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

const FULL_BOUNDS: PersonBounds = {
  left: 0,
  top: 0,
  right: 1,
  bottom: 1,
  width: 1,
  height: 1,
};

function computeAlphaBounds(canvas: HTMLCanvasElement): PersonBounds {
  const w = canvas.width;
  const h = canvas.height;
  if (w < 2 || h < 2) return FULL_BOUNDS;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return FULL_BOUNDS;
  const d = ctx.getImageData(0, 0, w, h).data;

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  // 每 2px 采一次就足够定位，省一半遍历。
  for (let y = 0; y < h; y += 2) {
    const row = y * w;
    for (let x = 0; x < w; x += 2) {
      if (d[(row + x) * 4 + 3] < 16) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0 || maxY < 0) return FULL_BOUNDS;

  const left = clamp(minX / w, 0, 1);
  const top = clamp(minY / h, 0, 1);
  const right = clamp((maxX + 1) / w, 0, 1);
  const bottom = clamp((maxY + 1) / h, 0, 1);
  return {
    left,
    top,
    right,
    bottom,
    width: Math.max(0.001, right - left),
    height: Math.max(0.001, bottom - top),
  };
}

/**
 * 边缘去污染（color decontamination）。
 *
 * 抠图出来的半透明像素满足 I = α·F + (1-α)·B，B 是原背景色。直接贴到新背景上
 * 就带着原背景的颜色 —— 白底抠图必然一圈白边，绿幕则是一圈绿边。这是「像贴纸」
 * 最主要、也最无法靠调色补救的原因。
 *
 * 这里不解方程（B 未知、边缘处还不稳定），而是用更稳的做法：从「可信的内部实心
 * 像素」向外逐圈扩散颜色，只替换 alpha 落在边界带上的像素。因为取色只来自人物
 * 内部，线稿/五官的深色会被保留，被冲淡的只有那圈污染色。
 *
 * 另外提供一个遮罩收缩（choke），等价于 PS 里「收缩选区 1px」，把最外层污染环
 * 直接裁掉。两者叠加基本能消掉肉眼可见的白边。
 */
function decontaminateEdges(
  canvas: HTMLCanvasElement,
  strength: number,
  choke: number,
) {
  const useChoke = choke > 0.002;
  const useBleed = strength > 0.002;
  if (!useChoke && !useBleed) return;

  const w = canvas.width;
  const h = canvas.height;
  if (w < 4 || h < 4) return;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  const image = ctx.getImageData(0, 0, w, h);
  const d = image.data;
  const n = w * h;

  if (useChoke) {
    const c = clamp(choke, 0, 1) * 0.6;
    const inv = 1 / Math.max(0.05, 1 - c);
    for (let i = 3, len = d.length; i < len; i += 4) {
      const a = d[i];
      if (a === 0 || a === 255) continue;
      d[i] = clamp(Math.round((a / 255 - c) * inv * 255), 0, 255);
    }
  }

  if (useBleed) {
    // 只处理 alpha 落在边界带上的像素：实心内部不需要动，全透明像素画不出来。
    const band: number[] = [];
    for (let p = 0; p < n; p++) {
      const a = d[p * 4 + 3];
      if (a >= 8 && a <= 238) band.push(p);
    }

    if (band.length) {
      const known = new Uint8Array(n);
      for (let p = 0; p < n; p++) {
        if (d[p * 4 + 3] >= 239) known[p] = 1;
      }

      const rounds = clamp(Math.round(2 + strength * 9), 2, 12);
      let active = band;
      for (let round = 0; round < rounds && active.length; round++) {
        const filled: number[] = [];
        const next: number[] = [];
        for (let bi = 0; bi < active.length; bi++) {
          const p = active[bi];
          const x = p % w;
          const y = (p - x) / w;
          let r = 0;
          let g = 0;
          let b = 0;
          let cnt = 0;
          for (let dy = -1; dy <= 1; dy++) {
            const yy = y + dy;
            if (yy < 0 || yy >= h) continue;
            const rowBase = yy * w;
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const xx = x + dx;
              if (xx < 0 || xx >= w) continue;
              const q = rowBase + xx;
              if (!known[q]) continue;
              const qi = q * 4;
              r += d[qi];
              g += d[qi + 1];
              b += d[qi + 2];
              cnt++;
            }
          }
          if (!cnt) {
            next.push(p);
            continue;
          }
          const i = p * 4;
          const a = d[i + 3] / 255;
          /*
           * 替换强度。边界带里保存的 RGB 本身就是被原背景冲淡过的值，属于「不可信」，
           * 所以靠近全透明一侧要**整体替换**成人物自身的颜色，而不是简单加权混合 ——
           * 混合会留下一部分污染色，白边只是变淡而不是消失。
           * 越接近实心内部越保守，避免动到真正属于人物的细节。
           */
          const solid = clamp((a - 0.55) / 0.4, 0, 1); // 0.55 以下全替换，0.95 以上不动
          const taper = 1 - solid * solid * (3 - 2 * solid);
          const t = clamp(strength * taper, 0, 1);
          if (t <= 0.001) {
            filled.push(p);
            continue;
          }
          d[i] = d[i] * (1 - t) + (r / cnt) * t;
          d[i + 1] = d[i + 1] * (1 - t) + (g / cnt) * t;
          d[i + 2] = d[i + 2] * (1 - t) + (b / cnt) * t;
          filled.push(p);
        }
        // 本轮新填充的像素下一轮才参与取色，保证是一圈一圈向外扩而不是沿扫描方向窜。
        for (let fi = 0; fi < filled.length; fi++) known[filled[fi]] = 1;
        active = next;
      }
    }
  }

  ctx.putImageData(image, 0, 0);
}

/**
 * 自动去纯色的背景色估计。
 *
 * 之前的实现取四角平均，只要主体有一点伸进角落（很常见：手、头发、道具）
 * 就会把背景色估错。这里沿四条边密集取样，再按 4bit/通道做直方图取众数，
 * 对「主体贴边」和轻微渐变背景都更稳。
 */
function estimateKeyColor(d: Uint8ClampedArray, w: number, h: number) {
  const bins = new Map<number, { r: number; g: number; b: number; c: number }>();
  const stepX = Math.max(1, Math.floor(w / 96));
  const stepY = Math.max(1, Math.floor(h / 96));

  const record = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bin = bins.get(key);
    if (bin) {
      bin.r += r;
      bin.g += g;
      bin.b += b;
      bin.c += 1;
    } else {
      bins.set(key, { r, g, b, c: 1 });
    }
  };

  for (let x = 0; x < w; x += stepX) {
    record(x, 0);
    record(x, h - 1);
  }
  for (let y = 0; y < h; y += stepY) {
    record(0, y);
    record(w - 1, y);
  }

  let best: { r: number; g: number; b: number; c: number } | null = null;
  bins.forEach((bin) => {
    if (!best || bin.c > best.c) best = bin;
  });
  const winner = best as { r: number; g: number; b: number; c: number } | null;
  if (!winner) return { r: 255, g: 255, b: 255 };
  return {
    r: winner.r / winner.c,
    g: winner.g / winner.c,
    b: winner.b / winner.c,
  };
}

/**
 * 4x4 噪点瓦片。
 *
 * 原来每帧用 4 万次 fillRect 撒颗粒，1600px 画布上一帧就要几毫秒。
 * 改成预生成一张固定种子的噪点贴图，用 pattern 一次填满，速度提升一个量级，
 * 而且因为种子固定，拖动时颗粒不会闪烁。
 */
let noiseTileCanvas: HTMLCanvasElement | null = null;

function getNoiseTile() {
  if (noiseTileCanvas) return noiseTileCanvas;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  let seed = 0x9e3779b9;
  const random = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return ((seed >>> 0) % 100000) / 100000;
  };
  for (let i = 0; i < img.data.length; i += 4) {
    const v = random() > 0.5 ? 255 : 0;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = Math.round(random() * 255);
  }
  ctx.putImageData(img, 0, 0);
  noiseTileCanvas = canvas;
  return canvas;
}

/**
 * 四角环境色场。
 *
 * AE 溶图里的「四色渐变」：把背景在人物四周取到的四个角色，做成双线性渐变，
 * 以柔光叠到人物上。相比单一均值染色，它能把「左边是窗户冷光、右边是台灯暖光」
 * 这种方向性的环境色差带到人物身上，是人物质感「进入场景」的关键一步。
 * 用 2x2 的小图放大绘制即可拿到浏览器的双线性插值。
 */
function buildAmbientFieldCanvas(
  key: string,
  w: number,
  h: number,
  corners: { tl: Rgb; tr: Rgb; bl: Rgb; br: Rgb },
) {
  const { ctx } = getScratchCtx(key, w, h);
  const tiny = getScratch(`${key}-tiny`, 2, 2).getContext("2d")!;
  tiny.setTransform(1, 0, 0, 1, 0, 0);
  tiny.globalAlpha = 1;
  tiny.globalCompositeOperation = "source-over";
  tiny.filter = "none";
  tiny.clearRect(0, 0, 2, 2);
  const put = (x: number, y: number, c: Rgb) => {
    tiny.fillStyle = `rgb(${Math.round(clamp(c.r, 0, 255))},${Math.round(
      clamp(c.g, 0, 255),
    )},${Math.round(clamp(c.b, 0, 255))})`;
    tiny.fillRect(x, y, 1, 1);
  };
  put(0, 0, corners.tl);
  put(1, 0, corners.tr);
  put(0, 1, corners.bl);
  put(1, 1, corners.br);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(getScratch(`${key}-tiny`, 2, 2), 0, 0, w, h);
  return getScratch(key, w, h);
}

type Rgb = { r: number; g: number; b: number };

/** 环境采样结果：均值 + 四角色 + 亮度/饱和度，四角色用于环境色场 */
type AmbientSample = {
  r: number;
  g: number;
  b: number;
  l: number;
  s: number;
  corners: { tl: Rgb; tr: Rgb; bl: Rgb; br: Rgb };
};

const NEUTRAL_AMBIENT: AmbientSample = {
  r: 190,
  g: 180,
  b: 170,
  l: 0.55,
  s: 0.2,
  corners: {
    tl: { r: 190, g: 180, b: 170 },
    tr: { r: 196, g: 184, b: 172 },
    bl: { r: 182, g: 174, b: 166 },
    br: { r: 188, g: 178, b: 168 },
  },
};

/** 按 t 在「角色」和「均值」之间插值，t=1 保留角色差异，t=0 退回均值 */
function mixRgb(color: Rgb, avg: Rgb, t: number): Rgb {
  return {
    r: avg.r + (color.r - avg.r) * t,
    g: avg.g + (color.g - avg.g) * t,
    b: avg.b + (color.b - avg.b) * t,
  };
}

function normalizeSettings(value: Partial<Settings> | Settings): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...value,
  };
}

function fitRect(
  iw: number,
  ih: number,
  cw: number,
  ch: number,
  mode: FitMode,
) {
  const scale =
    mode === "铺满画布"
      ? Math.max(cw / iw, ch / ih)
      : Math.min(cw / iw, ch / ih);

  const w = iw * scale;
  const h = ih * scale;
  return {
    x: (cw - w) / 2,
    y: (ch - h) / 2,
    w,
    h,
    scale,
  };
}

function blendToComposite(mode: BlendMode): GlobalCompositeOperation {
  if (mode === "柔光") return "soft-light";
  if (mode === "滤色") return "screen";
  if (mode === "叠加") return "overlay";
  return "source-over";
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

function hexToRgb(hex: string) {
  const safe = hex.replace("#", "").trim();
  const value = safe.length === 3
    ? safe.split("").map((c) => c + c).join("")
    : safe.padEnd(6, "f").slice(0, 6);
  const n = Number.parseInt(value, 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  };
}

function colorTemperature(r: number, b: number) {
  return clamp((r - b) / 255, -1, 1);
}

function luminance(r: number, g: number, b: number) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function saturationEstimate(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max <= 0) return 0;
  return (max - min) / max;
}

function analyzeDirectionalLight(
  canvas: HTMLCanvasElement,
  centerX: number,
  centerY: number,
  regionW: number,
  regionH: number,
) {
  const halfW = regionW / 2;
  const halfH = regionH / 2;
  const cellW = Math.max(16, regionW / 2);
  const cellH = Math.max(16, regionH / 2);

  const samples = [
    { x: centerX - halfW, y: centerY - halfH, dx: -1, dy: -1 },
    { x: centerX, y: centerY - halfH, dx: 1, dy: -1 },
    { x: centerX - halfW, y: centerY, dx: -1, dy: 1 },
    { x: centerX, y: centerY, dx: 1, dy: 1 },
  ].map((q) => ({
    ...q,
    sample: sampleCanvas(canvas, {
      x: q.x,
      y: q.y,
      w: cellW,
      h: cellH,
    }),
  }));

  const avg = samples.reduce((sum, q) => sum + q.sample.l, 0) / samples.length;
  let vx = 0;
  let vy = 0;
  let strongest = samples[0];

  for (const q of samples) {
    const weight = Math.max(0.001, q.sample.l - avg + 0.08);
    vx += q.dx * weight;
    vy += q.dy * weight;
    if (q.sample.l > strongest.sample.l) strongest = q;
  }

  if (Math.abs(vx) + Math.abs(vy) < 0.03) {
    vx = strongest.dx;
    vy = strongest.dy;
  }

  const angle = (Math.atan2(vy, vx) * 180) / Math.PI;
  const contrast =
    Math.max(...samples.map((q) => q.sample.l)) -
    Math.min(...samples.map((q) => q.sample.l));

  return {
    angle,
    contrast,
    color: strongest.sample,
  };
}

function sampleCanvas(
  canvas: HTMLCanvasElement,
  rect?: { x: number; y: number; w: number; h: number },
  ignoreTransparent = false,
) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { r: 128, g: 128, b: 128, l: 0.5, s: 0.5 };

  const x = clamp(Math.floor(rect?.x ?? 0), 0, Math.max(0, canvas.width - 1));
  const y = clamp(Math.floor(rect?.y ?? 0), 0, Math.max(0, canvas.height - 1));
  const w = clamp(
    Math.floor(rect?.w ?? canvas.width),
    1,
    Math.max(1, canvas.width - x),
  );
  const h = clamp(
    Math.floor(rect?.h ?? canvas.height),
    1,
    Math.max(1, canvas.height - y),
  );

  const data = ctx.getImageData(x, y, w, h).data;
  const stride = Math.max(1, Math.floor(Math.sqrt((w * h) / 16000)));
  let rr = 0;
  let gg = 0;
  let bb = 0;
  let count = 0;

  for (let py = 0; py < h; py += stride) {
    for (let px = 0; px < w; px += stride) {
      const i = (py * w + px) * 4;
      const a = data[i + 3];
      if (ignoreTransparent && a < 32) continue;
      rr += data[i];
      gg += data[i + 1];
      bb += data[i + 2];
      count++;
    }
  }

  if (!count) return { r: 128, g: 128, b: 128, l: 0.5, s: 0.5 };
  const r = rr / count;
  const g = gg / count;
  const b = bb / count;
  return { r, g, b, l: luminance(r, g, b), s: saturationEstimate(r, g, b) };
}

function drawNoise(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  amount: number,
) {
  if (amount <= 0.001 || w < 2 || h < 2) return;
  const pattern = ctx.createPattern(getNoiseTile(), "repeat");
  if (!pattern) return;
  ctx.save();
  ctx.globalCompositeOperation = "soft-light";
  ctx.globalAlpha = clamp(amount * 0.6, 0, 0.72);
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawVignette(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  amount: number,
) {
  if (amount <= 0.001) return;
  const g = ctx.createRadialGradient(
    w / 2,
    h / 2,
    Math.min(w, h) * 0.22,
    w / 2,
    h / 2,
    Math.max(w, h) * 0.7,
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.58, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${clamp(amount, 0, 0.75)})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}


function sampleImageColor(
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  radius = 18,
) {
  return sampleCanvas(canvas, {
    x: x - radius,
    y: y - radius,
    w: radius * 2,
    h: radius * 2,
  });
}

function sampleLightSourceColor(
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  radius = 18,
) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return sampleImageColor(canvas, x, y, radius);

  const sx = clamp(Math.floor(x - radius), 0, Math.max(0, canvas.width - 1));
  const sy = clamp(Math.floor(y - radius), 0, Math.max(0, canvas.height - 1));
  const sw = clamp(Math.ceil(radius * 2), 1, Math.max(1, canvas.width - sx));
  const sh = clamp(Math.ceil(radius * 2), 1, Math.max(1, canvas.height - sy));
  const data = ctx.getImageData(sx, sy, sw, sh).data;
  const stride = Math.max(1, Math.floor(Math.sqrt((sw * sh) / 5000)));

  let meanL = 0;
  let maxL = 0;
  let count = 0;
  for (let py = 0; py < sh; py += stride) {
    for (let px = 0; px < sw; px += stride) {
      const i = (py * sw + px) * 4;
      if (data[i + 3] < 24) continue;
      const l = luminance(data[i], data[i + 1], data[i + 2]);
      meanL += l;
      maxL = Math.max(maxL, l);
      count++;
    }
  }
  if (!count) return sampleImageColor(canvas, x, y, radius);
  meanL /= count;

  const threshold = meanL + (maxL - meanL) * 0.28;
  let rr = 0;
  let gg = 0;
  let bb = 0;
  let total = 0;
  for (let py = 0; py < sh; py += stride) {
    for (let px = 0; px < sw; px += stride) {
      const i = (py * sw + px) * 4;
      const alpha = data[i + 3] / 255;
      if (alpha < 0.1) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const l = luminance(r, g, b);
      const sat = saturationEstimate(r, g, b);
      const highlight = clamp((l - threshold) / Math.max(0.06, maxL - threshold), 0, 1);
      const weight = alpha * (0.12 + highlight * 2.35 + sat * 0.42);
      rr += r * weight;
      gg += g * weight;
      bb += b * weight;
      total += weight;
    }
  }

  if (total < 0.001) return sampleImageColor(canvas, x, y, radius);
  const r = rr / total;
  const g = gg / total;
  const b = bb / total;
  return { r, g, b, l: luminance(r, g, b), s: saturationEstimate(r, g, b) };
}

/**
 * 由人物剪影算出的「形体起伏场」。
 *
 * 原来的做法是把每个人物都当成一个固定椭球（`1 - ex²·0.82 - ey²·0.9`）来取法线，
 * 结果就是无论人物长什么样、姿势如何，明暗都长一个样 —— 这是「光打上去没感觉」
 * 最根本的原因：光照没有跟着形体走。
 *
 * 这里改成对 alpha 做内部距离变换（chamfer 两遍扫描，O(n)）：离轮廓越远表示越接近
 * 形体中心，越「高」。再把它软化成 h = d/(d+k)，得到一张处处连续、越靠边越陡的
 * 高度场 —— 它的梯度就是跟随真实轮廓的伪法线：手臂自动像圆柱、裙摆自动像穹顶、
 * 躯干自动有柔和的整体起伏。
 *
 * 距离场在小图上算完（上限 512），采样时再做双线性，代价和分辨率无关。
 */
type ShapeField = {
  hx: Float32Array;
  hy: Float32Array;
  hgt: Float32Array;
  w: number;
  h: number;
  id: number;
};

function buildShapeField(
  alphaSource: HTMLCanvasElement,
  maxSide = 512,
): ShapeField | null {
  const sw = alphaSource.width;
  const sh = alphaSource.height;
  if (sw < 8 || sh < 8) return null;

  const ratio = Math.min(1, maxSide / Math.max(sw, sh));
  const w = Math.max(8, Math.round(sw * ratio));
  const h = Math.max(8, Math.round(sh * ratio));

  const { ctx } = getScratchCtx("shapeMask", w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(alphaSource, 0, 0, w, h);
  const src = ctx.getImageData(0, 0, w, h).data;

  const n = w * h;
  const INF = 1e6;
  const dist = new Float32Array(n);
  for (let p = 0; p < n; p++) dist[p] = src[p * 4 + 3] > 120 ? INF : 0;

  const D1 = 1;
  const D2 = Math.SQRT2;
  const at = (x: number, y: number) => dist[y * w + x];

  // 第一遍：左上 -> 右下
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (dist[p] === 0) continue;
      let best = dist[p];
      if (y > 0) {
        best = Math.min(best, at(x, y - 1) + D1);
        if (x > 0) best = Math.min(best, at(x - 1, y - 1) + D2);
        if (x < w - 1) best = Math.min(best, at(x + 1, y - 1) + D2);
      }
      if (x > 0) best = Math.min(best, at(x - 1, y) + D1);
      dist[p] = best;
    }
  }
  // 第二遍：右下 -> 左上
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const p = y * w + x;
      if (dist[p] === 0) continue;
      let best = dist[p];
      if (y < h - 1) {
        best = Math.min(best, at(x, y + 1) + D1);
        if (x > 0) best = Math.min(best, at(x - 1, y + 1) + D2);
        if (x < w - 1) best = Math.min(best, at(x + 1, y + 1) + D2);
      }
      if (x < w - 1) best = Math.min(best, at(x + 1, y) + D1);
      dist[p] = best;
    }
  }

  // 软化：h = d/(d+k)。k 取画布短边的 8%，让「薄」的部位陡、「厚」的部位平缓，
  // 既不会像椭球那样一刀切，也不会让粗壮的人物整块变平。
  const k = Math.max(2, Math.min(w, h) * 0.08);
  const height = new Float32Array(n);
  for (let p = 0; p < n; p++) {
    const v = dist[p];
    height[p] = v >= INF ? 0 : v / (v + k);
  }

  // 中心差分得到梯度场；再乘回 k，使靠近轮廓处的斜率落在「约 1」这个量级，
  // 这样 volumeDepth 的取值才有直观意义（0 = 平，1 = 强起伏）。
  // 注意这里刻意不按重采样比例缩放：距离场始终在 ≤512 的网格上计算，
  // 于是预览(960)与导出(3000)得到完全相同的法线场，明暗不会随分辨率漂移。
  const hx = new Float32Array(n);
  const hy = new Float32Array(n);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const xl = height[y * w + Math.max(0, x - 1)];
      const xr = height[y * w + Math.min(w - 1, x + 1)];
      const yt = height[Math.max(0, y - 1) * w + x];
      const yb = height[Math.min(h - 1, y + 1) * w + x];
      hx[p] = (xr - xl) * 0.5 * k;
      hy[p] = (yb - yt) * 0.5 * k;
    }
  }

  return { hx, hy, hgt: height, w, h, id: 0 };
}

/*
 * 形体场按画布缓存。
 *
 * 同一个 processed 画布会被重照明和光斑两层共用，距离变换不该算两遍；
 * 而 processed 每次重新处理都是一个新对象，用 WeakMap 可以在它被回收时自动失效。
 */
let shapeFieldSeq = 0;
const shapeFieldCache = new WeakMap<HTMLCanvasElement, ShapeField | null>();

function getShapeField(canvas: HTMLCanvasElement): ShapeField | null {
  const hit = shapeFieldCache.get(canvas);
  if (hit !== undefined) return hit;
  const field = buildShapeField(canvas);
  if (field) field.id = ++shapeFieldSeq;
  shapeFieldCache.set(canvas, field);
  return field;
}

/*
 * 「形体受光遮罩」：把某个光斑的受光强度写进一张遮罩的 alpha。
 *
 * 这是这一轮光斑优化的核心。以前光斑用 screen 平铺在人物上，效果是一块贴上去的
 * 亮斑，跟身体的起伏没有关系；真实的光打在圆柱上，正对光的一面最亮、侧面衰减。
 * 这里用剪影距离场的伪法线，按「从形体指向光斑」的方向算一个朗伯系数，
 * 直接乘进光斑的 alpha —— 于是硬光会沿着肩膀、手臂的起伏自然衰减，
 * 而不是糊一块均匀的亮。
 *
 * 系数下限保底 0.45，背光侧只是变弱、不会被抹掉；体积深度为 0 时整张遮罩为 1
 * （即完全没有形体衰减），与「体积深度 = 0 表示法线是平的」保持一致的语义。
 * 遮罩只有 160px 长边，且按方位角分桶缓存，拖动时不会重复计算。
 */
const FORM_MASK_BUCKETS = 24;
const formMaskCache = new Map<string, HTMLCanvasElement>();

function getFormLightMask(
  shape: ShapeField,
  azimuth: number,
  depth: number,
) {
  const k = clamp(depth, 0, 1);
  if (k < 0.03) return null;

  const turns = ((azimuth / (Math.PI * 2)) % 1 + 1) % 1;
  const bucket = Math.round(turns * FORM_MASK_BUCKETS) % FORM_MASK_BUCKETS;
  const depthBucket = Math.round(k * 4);
  const key = `${shape.id}-${bucket}-${depthBucket}`;
  const hit = formMaskCache.get(key);
  if (hit) return hit;

  const maxSide = 160;
  const ratio = Math.min(1, maxSide / Math.max(shape.w, shape.h));
  const mw = Math.max(8, Math.round(shape.w * ratio));
  const mh = Math.max(8, Math.round(shape.h * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = mw;
  canvas.height = mh;
  const mctx = canvas.getContext("2d")!;
  const img = mctx.createImageData(mw, mh);

  // 光源方向 = 从人物中心指向光斑的方位，配一个固定仰角
  const ux = Math.cos(azimuth);
  const uy = Math.sin(azimuth);
  const llen = Math.hypot(ux, uy, 1.15) || 1;
  const lx = ux / llen;
  const ly = uy / llen;
  const lz = 1.15 / llen;

  const sx = shape.w / mw;
  const sy = shape.h / mh;
  for (let y = 0; y < mh; y++) {
    const srow = Math.min(shape.h - 1, Math.floor(y * sy)) * shape.w;
    for (let x = 0; x < mw; x++) {
      const p = srow + Math.min(shape.w - 1, Math.floor(x * sx));
      let nx = -shape.hx[p] * 1.6;
      let ny = -shape.hy[p] * 1.6;
      let nz = 1;
      const nl = Math.hypot(nx, ny, nz) || 1;
      nx /= nl;
      ny /= nl;
      nz /= nl;
      const lit = clamp(nx * lx + ny * ly + nz * lz, 0, 1);
      const m = 1 - k * (1 - (0.45 + 0.55 * lit));
      const i = (y * mw + x) * 4;
      img.data[i] = 255;
      img.data[i + 1] = 255;
      img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(clamp(m, 0, 1) * 255);
    }
  }
  mctx.putImageData(img, 0, 0);
  if (formMaskCache.size > 160) formMaskCache.clear();
  formMaskCache.set(key, canvas);
  return canvas;
}

/** 光斑相对人物中心的方位角，用来决定形体受光的方向 */
function patchAzimuth(patch: LightPatch, w: number, h: number) {
  return Math.atan2((patch.y - 0.5) * h, (patch.x - 0.5) * w);
}

function applyIntrinsicStyleRelight(
  out: HTMLCanvasElement,
  alphaSource: HTMLCanvasElement,
  settings: Settings,
  ambient: { r: number; g: number; b: number },
) {
  const strength = clamp(settings.relightStrength ?? 0, 0, 1);
  if (strength <= 0.001) return;

  const w = out.width;
  const h = out.height;
  if (w < 3 || h < 3) return;

  const ctx = out.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;

  // 柔化的剪影：它的梯度负责边缘处（发丝、衣服轮廓）的细节法线。
  const { ctx: sctx } = getScratchCtx("relightSoft", w, h);
  sctx.filter = `blur(${Math.max(1.2, 2.4 + settings.edgeSoftness * 0.7)}px)`;
  sctx.drawImage(alphaSource, 0, 0);

  const pixels = ctx.getImageData(0, 0, w, h);
  const alphaPixels = sctx.getImageData(0, 0, w, h).data;
  const d = pixels.data;

  const rad = (settings.lightAngle * Math.PI) / 180;
  // Canvas y grows downward.
  const lx = -Math.cos(rad);
  const ly = -Math.sin(rad);
  const lz = 0.72;
  const llen = Math.hypot(lx, ly, lz) || 1;
  const nlx = lx / llen;
  const nly = ly / llen;
  const nlz = lz / llen;

  const depth = clamp(settings.volumeDepth, 0, 1);
  const wrap = clamp(settings.wrapLight, 0, 0.9);
  const edgeLight = clamp(settings.edgeLight, 0, 1);
  const backShade = clamp(settings.backShade, 0, 0.7);
  const faceShadowStrength = clamp(settings.faceShadowStrength ?? 0.32, 0, 0.85);
  const faceShadowSoftness = clamp(settings.faceShadowSoftness ?? 0.38, 0.04, 1);
  const faceShadowThreshold = clamp(settings.faceShadowThreshold ?? 0.48, 0.05, 0.95);

  // 高光（镜面反射）。真正的「被灯照到」主要靠这一层：漫反射只让画面变亮，
  // 只有高光才有明确的形状和方向感，也才会在阈值泛光里发光。
  const specStrength = clamp(settings.specular ?? 0, 0, 1) * strength;
  const specSharp = clamp(settings.specularSharpness ?? 0.45, 0.02, 1);
  const shininess = 2 + Math.pow(1 - specSharp, 2.1) * 150;
  // 半程向量：光方向与视线(0,0,1)的中间方向
  let hvx = nlx;
  let hvy = nly;
  let hvz = nlz + 1;
  const hvl = Math.hypot(hvx, hvy, hvz) || 1;
  hvx /= hvl;
  hvy /= hvl;
  hvz /= hvl;

  const shape = getShapeField(alphaSource);
  const sfScaleX = shape ? shape.w / w : 0;
  const sfScaleY = shape ? shape.h / h : 0;
  const depthK = 0.35 + depth * 1.6;
  let sfx = 0;
  let sfy = 0;
  let sfm = 1;
  const readShape = (x: number, y: number) => {
    if (!shape) {
      sfx = 0;
      sfy = 0;
      sfm = 1;
      return;
    }
    const fx = clamp(x * sfScaleX - 0.5, 0, shape.w - 1.001);
    const fy = clamp(y * sfScaleY - 0.5, 0, shape.h - 1.001);
    const x0 = fx | 0;
    const y0 = fy | 0;
    const tx = fx - x0;
    const ty = fy - y0;
    const i00 = y0 * shape.w + x0;
    const i10 = i00 + 1;
    const i01 = i00 + shape.w;
    const i11 = i01 + 1;
    const w00 = (1 - tx) * (1 - ty);
    const w10 = tx * (1 - ty);
    const w01 = (1 - tx) * ty;
    const w11 = tx * ty;
    sfx =
      (shape.hx[i00] * w00 + shape.hx[i10] * w10 + shape.hx[i01] * w01 + shape.hx[i11] * w11) *
      depthK;
    sfy =
      (shape.hy[i00] * w00 + shape.hy[i10] * w10 + shape.hy[i01] * w01 + shape.hy[i11] * w11) *
      depthK;
    sfm =
      shape.hgt[i00] * w00 + shape.hgt[i10] * w10 + shape.hgt[i01] * w01 + shape.hgt[i11] * w11;
  };

  const lr = clamp(
    ambient.r + settings.lightWarmth * 110,
    0,
    255,
  );
  const lg = clamp(
    ambient.g + Math.abs(settings.lightWarmth) * 18,
    0,
    255,
  );
  const lb = clamp(
    ambient.b - settings.lightWarmth * 110,
    0,
    255,
  );

  // 亮部滚降：超过拐点的部分按软肩压缩。
  // 这一步必须在浮点阶段做 —— 一旦写进 8bit 画布，超过 255 的部分已经被 clamp 掉，
  // 再想恢复层次就不可能了。滚降之后高光是「一条平滑过渡到接近白」的带，
  // 而不是一片切平的死白，也才有东西可以让阈值泛光抓出来发光。
  const rolloff = clamp(settings.highlightRolloff ?? 0, 0, 1);
  const kneeV = 255 * (1 - rolloff * 0.5);
  const shoulderSpan = Math.max(1, 255 - kneeV);
  const shoulderS = shoulderSpan * (0.8 + rolloff * 1.4);
  const useShoulder = rolloff > 0.004;
  const shoulder = (v: number) => {
    if (v <= kneeV) return v;
    const ex = v - kneeV;
    return kneeV + shoulderSpan * (ex / (ex + shoulderS));
  };

  const alphaAt = (x: number, y: number) => {
    x = Math.max(0, Math.min(w - 1, x));
    y = Math.max(0, Math.min(h - 1, y));
    return alphaPixels[(y * w + x) * 4 + 3] / 255;
  };

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      const alpha = d[i + 3] / 255;
      if (alpha < 0.01) continue;

      // Silhouette-gradient normal（边缘细节）
      const gx = alphaAt(x + 1, y) - alphaAt(x - 1, y);
      const gy = alphaAt(x, y + 1) - alphaAt(x, y - 1);

      // 形体起伏法线：来自剪影距离场，跟随人物真实形状（手臂像圆柱、躯干像穹顶）
      readShape(x, y);

      let nx = -gx * 3.1 + sfx;
      let ny = -gy * 3.1 + sfy;
      let nz = 0.72 + sfm * depth * 0.95;

      const nlen = Math.hypot(nx, ny, nz) || 1;
      nx /= nlen;
      ny /= nlen;
      nz /= nlen;

      let lambert = nx * nlx + ny * nly + nz * nlz;
      lambert = clamp((lambert + wrap) / (1 + wrap), 0, 1);

      // Stronger near silhouette on the light-facing side = colored rim light.
      const edge = clamp(Math.hypot(gx, gy) * 4.2, 0, 1);
      const edgeFacing = clamp(nx * nlx + ny * nly, 0, 1);
      const rim = edge * edgeFacing * edgeLight;

      const centered = lambert - 0.52;

      // Character-local shadow mask: unlike a drop shadow, this darkens the
      // surfaces that turn away from the picked environmental light. The
      // threshold controls how much of the body enters shadow and softness
      // controls the penumbra, which is important for anime faces/hair.
      const shadowEdge0 = faceShadowThreshold - faceShadowSoftness * 0.5;
      const shadowEdge1 = faceShadowThreshold + faceShadowSoftness * 0.5;
      const shadowT = clamp((lambert - shadowEdge0) / Math.max(0.001, shadowEdge1 - shadowEdge0), 0, 1);
      const smoothShadowT = shadowT * shadowT * (3 - 2 * shadowT);
      const localShadow = (1 - smoothShadowT) * faceShadowStrength * strength;

      const gain =
        1 +
        centered * strength * 0.95 +
        rim * strength * 0.8 -
        (1 - lambert) * backShade * strength * 0.4 -
        localShadow * 0.72;

      // 方向性轮廓光：只有「朝向光源那侧的轮廓」会被推向光源色，形成暖边/冷边，
      // 而不是整圈均匀发光。这是逆光、街灯场景里人物从背景里「跳出来」的关键。
      const rimTint = rim * strength * (0.22 + settings.lightLift * 1.5);

      const tint = clamp(
        (lambert * 0.6 + rim * 0.9) *
          strength *
          (0.16 + settings.lightLift * 0.7) +
          rimTint,
        0,
        0.62,
      );

      // 镜面高光：漫反射负责明暗，高光负责「被灯照到」这件事本身。
      let spec = 0;
      if (specStrength > 0.002) {
        const dot = nx * hvx + ny * hvy + nz * hvz;
        if (dot > 0) spec = Math.pow(dot, shininess) * specStrength;
      }
      const specAdd = spec * 255;

      // 高光的颜色略偏向白（真实高光是被光源色漂白的），否则会像糊了一层颜料
      const shr = lr * 0.62 + 255 * 0.38;
      const shg = lg * 0.62 + 255 * 0.38;
      const shb = lb * 0.62 + 255 * 0.38;

      const r0 = d[i] * gain * (1 - tint) + lr * tint + specAdd * (shr / 255);
      const g0 = d[i + 1] * gain * (1 - tint) + lg * tint + specAdd * (shg / 255);
      const b0 = d[i + 2] * gain * (1 - tint) + lb * tint + specAdd * (shb / 255);

      d[i] = clamp(useShoulder ? shoulder(r0) : r0, 0, 255);
      d[i + 1] = clamp(useShoulder ? shoulder(g0) : g0, 0, 255);
      d[i + 2] = clamp(useShoulder ? shoulder(b0) : b0, 0, 255);
    }
  }

  ctx.putImageData(pixels, 0, 0);
}

function drawLocalLightPatches(
  out: HTMLCanvasElement,
  alphaSource: HTMLCanvasElement,
  patches: LightPatch[],
  settings: Settings,
) {
  if (!patches.length) return;
  const w = out.width;
  const h = out.height;
  const ctx = out.getContext("2d")!;

  // 先轻压未受直射光区域，才能得到参考图里“亮块很亮、其余区域自然进阴影”的反差。
  const shadow = clamp(settings.localLightShadow ?? 0, 0, 0.7);
  if (shadow > 0.001) {
    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = `rgba(7,10,16,${shadow * 0.72})`;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  const { canvas: shadowLayer, ctx: sctx } = getScratchCtx("patchShadow", w, h);
  const shape = getShapeField(alphaSource);
  const depth = clamp(settings.volumeDepth ?? 0, 0, 1);
  const bloomAmount = clamp(settings.localLightBloom ?? 0, 0, 0.5);
  // 局部辉光需要一张"叠加后的光层"，只有真的要用时才多维护一块画布
  const accum = bloomAmount > 0.001
    ? getScratchCtx("patchLightAccum", w, h)
    : null;

  const paintPatch = (
    pctx: CanvasRenderingContext2D,
    patch: LightPatch,
    isShadow: boolean,
  ) => {
    const cx = clamp(patch.x, -0.25, 1.25) * w;
    const cy = clamp(patch.y, -0.25, 1.25) * h;
    const pw = Math.max(5, patch.width * w);
    const ph = Math.max(5, patch.height * h);
    const base = hexToRgb(patch.color || (isShadow ? "#101622" : "#fff0cf"));
    const hi = clamp(patch.highlight ?? 0, 0, 1);
    const r = isShadow ? clamp(base.r, 0, 150) : Math.round(base.r * (1 - hi * 0.55) + 255 * hi * 0.55);
    const g = isShadow ? clamp(base.g, 0, 150) : Math.round(base.g * (1 - hi * 0.55) + 255 * hi * 0.55);
    const b = isShadow ? clamp(base.b, 0, 170) : Math.round(base.b * (1 - hi * 0.55) + 255 * hi * 0.55);
    const power = clamp(patch.intensity, 0, isShadow ? 1 : 1.4);
    const softness = clamp(patch.softness, 0, 1);
    const alphaScale = isShadow ? 0.78 : 1;

    pctx.save();
    pctx.translate(cx, cy);
    pctx.rotate((patch.rotation * Math.PI) / 180);

    if (patch.shape === "柔光") {
      const sx = pw / 2;
      const sy = ph / 2;
      pctx.save();
      pctx.scale(1, sy / Math.max(1, sx));
      const radius = sx;
      const grad = pctx.createRadialGradient(0, 0, 0, 0, 0, radius);
      const inner = clamp(0.04 + (1 - softness) * 0.34, 0.04, 0.38);
      const mid = clamp(inner + 0.24 + softness * 0.18, 0.32, 0.78);
      grad.addColorStop(0, `rgba(${r},${g},${b},${clamp(power * 0.98 * alphaScale, 0, 1)})`);
      grad.addColorStop(inner, `rgba(${r},${g},${b},${clamp(power * 0.82 * alphaScale, 0, 0.95)})`);
      grad.addColorStop(mid, `rgba(${r},${g},${b},${clamp(power * 0.3 * alphaScale, 0, 0.55)})`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      pctx.fillStyle = grad;
      pctx.fillRect(-radius, -radius, radius * 2, radius * 2);
      pctx.restore();
    } else {
      /*
       * 硬光 / 光带。
       *
       * 这里以前是「先模糊一层，再盖一个完全不羽化的实心矩形当核心」。
       * 结果是无论边缘模糊拉多高，最外面那圈硬边永远都在 —— 用户只能把
       * 边缘模糊一路拉到 0.9 以上、把核心整个压掉，光斑自然也就废了。
       *
       * 现在形状完全由「模糊后的矩形」本身定义：羽化宽度直接由 softness 决定，
       * 核心平台按内缩的第二层模糊叠出来。任何取值都不会出现硬边，
       * 并且「变软」不再等于「变暗」（峰值按羽化量补偿）。
       */
      const minSide = Math.min(pw, ph);
      const featherPx = clamp(0.6 + softness * minSide * 0.55, 0.6, minSide * 0.55);
      const peak = clamp(power * alphaScale * (0.74 + softness * 0.5), 0, 1);

      if (patch.shape === "光带") {
        // 光带：沿短轴做线性渐变（中间最亮、两侧衰减），四边同时被羽化。
        pctx.save();
        pctx.filter = `blur(${featherPx.toFixed(2)}px)`;
        const grad = pctx.createLinearGradient(0, -ph / 2, 0, ph / 2);
        const edge = clamp(0.06 + softness * 0.22, 0.06, 0.3);
        grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
        grad.addColorStop(edge, `rgba(${r},${g},${b},${peak * 0.78})`);
        grad.addColorStop(0.5, `rgba(${r},${g},${b},${peak})`);
        grad.addColorStop(1 - edge, `rgba(${r},${g},${b},${peak * 0.78})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        pctx.fillStyle = grad;
        pctx.fillRect(-pw / 2, -ph / 2, pw, ph);
        pctx.restore();
      } else {
        // 硬光：外层大羽化 + 内缩小羽化两层叠加，得到「核心实在但边缘连续」的效果。
        pctx.save();
        pctx.filter = `blur(${featherPx.toFixed(2)}px)`;
        pctx.fillStyle = `rgba(${r},${g},${b},${peak * 0.66})`;
        pctx.fillRect(-pw / 2, -ph / 2, pw, ph);

        const inset = minSide * 0.15;
        pctx.filter = `blur(${Math.max(0.6, featherPx * 0.5).toFixed(2)}px)`;
        pctx.fillStyle = `rgba(${r},${g},${b},${peak * 0.52})`;
        pctx.fillRect(
          -pw / 2 + inset,
          -ph / 2 + inset,
          Math.max(2, pw - inset * 2),
          Math.max(2, ph - inset * 2),
        );
        pctx.restore();
      }
    }
    pctx.restore();
  };

  sctx.imageSmoothingEnabled = true;
  sctx.imageSmoothingQuality = "high";

  for (const patch of patches) {
    if (patch.mode === "影") paintPatch(sctx, patch, true);
  }
  // 影只存在于人物 alpha 内部。
  sctx.save();
  sctx.globalCompositeOperation = "destination-in";
  sctx.drawImage(alphaSource, 0, 0, w, h);
  sctx.restore();

  /*
   * 光斑逐块合成。
   *
   * 每块光斑先单独画进一张临时画布，再乘上「形体受光遮罩」（朝光斑那一侧更亮、
   * 背向衰减），最后才以 screen 叠到人物上。这样硬光会顺着肩膀/手臂的起伏走，
   * 而不是糊一块均匀的亮斑 —— 光斑真正"打在形体上"的关键就在这一步。
   */
  const { canvas: lightOne, ctx: oneCtx } = getScratchCtx("patchLightOne", w, h);
  oneCtx.imageSmoothingEnabled = true;
  oneCtx.imageSmoothingQuality = "high";

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (const patch of patches) {
    if (patch.mode === "影") continue;

    oneCtx.setTransform(1, 0, 0, 1, 0, 0);
    oneCtx.globalAlpha = 1;
    oneCtx.globalCompositeOperation = "source-over";
    oneCtx.filter = "none";
    oneCtx.clearRect(0, 0, w, h);
    paintPatch(oneCtx, patch, false);

    const mask = shape
      ? getFormLightMask(shape, patchAzimuth(patch, w, h), depth)
      : null;
    if (mask) {
      oneCtx.globalCompositeOperation = "destination-in";
      oneCtx.drawImage(mask, 0, 0, w, h);
      oneCtx.globalCompositeOperation = "source-over";
    }
    oneCtx.globalCompositeOperation = "destination-in";
    oneCtx.drawImage(alphaSource, 0, 0, w, h);
    oneCtx.globalCompositeOperation = "source-over";

    ctx.drawImage(lightOne, 0, 0);
    if (accum) {
      accum.ctx.globalCompositeOperation = "screen";
      accum.ctx.drawImage(lightOne, 0, 0);
      accum.ctx.globalCompositeOperation = "source-over";
    }
  }
  ctx.restore();

  // 遮光片放在直射光之后，相当于窗框 / 树影挡住光，能形成参考图中的硬明暗切线。
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(shadowLayer, 0, 0);
  ctx.restore();

  // 少量局部 bloom，仅围绕正向光斑，不给整个人蒙雾。
  if (accum && bloomAmount > 0.001) {
    const { canvas: blur, ctx: bctx } = getScratchCtx("patchBloom", w, h);
    bctx.filter = `blur(${Math.max(1.2, Math.min(w, h) * 0.012)}px)`;
    bctx.globalAlpha = bloomAmount;
    bctx.drawImage(accum.canvas, 0, 0);
    bctx.globalCompositeOperation = "destination-in";
    bctx.globalAlpha = 1;
    bctx.drawImage(alphaSource, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.drawImage(blur, 0, 0);
    ctx.restore();
  }
}

/**
 * 抠图 + 去污染：把原图变成「只剩人物、颜色干净」的图层。
 *
 * 这是所有权衡之前的输入。单独抽出来是因为「量一下人物实际占多大」也需要同一套
 * 抠图结果，否则测出来的内容和实际画出来的对不上。
 */
function prepareRawPerson(
  asset: ImageAsset,
  settings: Settings,
  maxSide: number,
) {
  const ratio = Math.min(1, maxSide / Math.max(asset.width, asset.height));
  const w = Math.max(2, Math.round(asset.width * ratio));
  const h = Math.max(2, Math.round(asset.height * ratio));

  const raw = document.createElement("canvas");
  raw.width = w;
  raw.height = h;
  const rctx = raw.getContext("2d", { willReadFrequently: true })!;
  rctx.drawImage(asset.img, 0, 0, w, h);

  if (settings.keyMode === "自动去纯色") {
    const imgData = rctx.getImageData(0, 0, w, h);
    const d = imgData.data;

    const key = estimateKeyColor(d, w, h);
    const kr = key.r;
    const kg = key.g;
    const kb = key.b;

    const threshold = 18 + settings.keyTolerance * 150;
    const feather = 8 + settings.keyFeather * 70;

    for (let i = 0; i < d.length; i += 4) {
      const dr = d[i] - kr;
      const dg = d[i + 1] - kg;
      const db = d[i + 2] - kb;
      const dist = Math.sqrt(dr * dr + dg * dg + db * db);

      if (dist <= threshold) {
        d[i + 3] = 0;
      } else if (dist < threshold + feather) {
        const t = (dist - threshold) / feather;
        d[i + 3] = Math.round(d[i + 3] * t);
      }
    }

    rctx.putImageData(imgData, 0, 0);
  }

  /*
   * 去白边 / 去杂色必须在所有调色之前做：它改的是「像素本身是什么颜色」，
   * 一旦先做了亮度/色温/环境染色，污染色就已经和新颜色混在一起，再想分开就难了。
   */
  decontaminateEdges(raw, settings.edgeDecontaminate, settings.edgeChoke);

  return raw;
}

/** 只做抠图 + 量一次内容包围盒，尺度很小，用于自动摆放这类需要立即拿到结果的场景 */
function measurePersonBounds(asset: ImageAsset, settings: Settings) {
  return computeAlphaBounds(prepareRawPerson(asset, settings, 380));
}

function createProcessedPerson(
  asset: ImageAsset,
  settings: Settings,
  ambient: AmbientSample,
  maxSide = 1600,
) {
  const raw = prepareRawPerson(asset, settings, maxSide);
  const w = raw.width;
  const h = raw.height;
  const bounds = computeAlphaBounds(raw);

  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d")!;

  /*
   * 恒等短路。
   *
   * 亮度/对比度/饱和度都等于 1、也没有微模糊时，干脆不设 filter ——
   * 这样「导入即原图」是字节级的，连一次滤镜求值的舍入都不会发生。
   */
  const gradeParts: string[] = [];
  if (Math.abs(settings.personBrightness - 1) > 0.001) {
    gradeParts.push(`brightness(${settings.personBrightness})`);
  }
  if (Math.abs(settings.personContrast - 1) > 0.001) {
    gradeParts.push(`contrast(${settings.personContrast})`);
  }
  if (Math.abs(settings.personSaturation - 1) > 0.001) {
    gradeParts.push(`saturate(${settings.personSaturation})`);
  }
  // 人物微模糊只处理画面细节；边缘柔化在最终 alpha 上单独完成，避免把脸和线稿一起糊掉。
  const blur = settings.personBlur;
  if (blur > 0.02) gradeParts.push(`blur(${blur.toFixed(2)}px)`);

  if (gradeParts.length) {
    ctx.save();
    ctx.filter = gradeParts.join(" ");
  }
  ctx.drawImage(raw, 0, 0);
  if (gradeParts.length) ctx.restore();

  // Warm / cool shift.
  if (Math.abs(settings.personWarmth) > 0.005) {
    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    const warm = settings.personWarmth;
    ctx.fillStyle =
      warm > 0
        ? `rgba(255,145,72,${Math.abs(warm) * 0.18})`
        : `rgba(72,142,255,${Math.abs(warm) * 0.18})`;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  /*
   * 环境色匹配分两层，两层都用「四角色场」而不是单一均值：
   * 1) 方向性色偏（source-atop）：把背景在人物四周的颜色差按位置铺上去，
   *    左边窗光偏冷、右边台灯偏暖，人物两侧就该吃到不同的环境色；
   * 2) 柔光（soft-light）：让环境色参与明暗关系，这是 AE 溶图里「四色渐变 + 柔光」的用法。
   * ambientSpread 越小两块越接近均值色，退化成整体染色；越大越保留方向性差异。
   */
  const spread = clamp(settings.ambientSpread ?? 0, 0, 1);
  if (settings.ambientTint > 0.001) {
    const field = buildAmbientFieldCanvas("ambientField", w, h, {
      tl: mixRgb(ambient.corners.tl, ambient, spread),
      tr: mixRgb(ambient.corners.tr, ambient, spread),
      bl: mixRgb(ambient.corners.bl, ambient, spread),
      br: mixRgb(ambient.corners.br, ambient, spread),
    });

    const cast = clamp(settings.ambientTint * 0.3, 0, 1);
    if (cast > 0.001) {
      ctx.save();
      ctx.globalCompositeOperation = "source-atop";
      ctx.globalAlpha = cast;
      ctx.drawImage(field, 0, 0);
      ctx.restore();
    }

    const softAmount = clamp(settings.ambientTint * (0.28 + spread * 0.62), 0, 1);
    if (softAmount > 0.001) {
      // 先把场裁到人物 alpha 内，才能用柔光混合且不影响背景。
      const { canvas: layer, ctx: lctx } = getScratchCtx("ambientLayer", w, h);
      lctx.globalAlpha = softAmount;
      lctx.drawImage(field, 0, 0);
      lctx.globalAlpha = 1;
      lctx.globalCompositeOperation = "destination-in";
      lctx.drawImage(out, 0, 0);

      ctx.save();
      ctx.globalCompositeOperation = "soft-light";
      ctx.drawImage(layer, 0, 0);
      ctx.restore();
    }
  }

  if (settings.ambientHaze > 0.001) {
    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = `rgba(${ambient.r},${ambient.g},${ambient.b},${settings.ambientHaze * 0.52})`;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // 基于人物 alpha 轮廓生成伪法线，并按 Lambert 思路重新受光。
  // 这是独立实现的浏览器近似版，不使用第三方模型或其源码。
  applyIntrinsicStyleRelight(out, raw, settings, ambient);

  // 大尺度环境方向光，负责把局部 relighting 和整张场景光向连接起来。
  // 用一条可旋转、可控制覆盖范围的渐变真正“打”到人物表面，
  // 同时给背光侧轻微压暗，避免只是给人物叠一层白色。
  if (settings.lightStrength > 0.001) {
    const rad = (settings.lightAngle * Math.PI) / 180;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.hypot(w, h) * 0.62;
    const dx = Math.cos(rad) * radius;
    const dy = Math.sin(rad) * radius;

    const coverage = clamp(settings.lightCoverage, 0.15, 1);
    const softness = clamp(settings.lightSoftness, 0.05, 1);
    const brightStop = clamp(0.08 + (1 - coverage) * 0.32, 0.04, 0.42);
    const fadeStop = clamp(brightStop + 0.18 + softness * 0.42, 0.24, 0.94);

    const lr = clamp(
      ambient.r + settings.lightWarmth * 95 - Math.min(0, settings.lightWarmth) * 12,
      0,
      255,
    );
    const lg = clamp(
      ambient.g + Math.abs(settings.lightWarmth) * 18,
      0,
      255,
    );
    const lb = clamp(
      ambient.b - settings.lightWarmth * 95 + Math.max(0, settings.lightWarmth) * 8,
      0,
      255,
    );

    const light = ctx.createLinearGradient(
      cx + dx,
      cy + dy,
      cx - dx,
      cy - dy,
    );
    light.addColorStop(
      0,
      `rgba(${Math.round(lr)},${Math.round(lg)},${Math.round(lb)},${clamp(
        (settings.lightStrength ?? DEFAULT_SETTINGS.lightStrength) * 0.72 +
          (settings.lightLift ?? DEFAULT_SETTINGS.lightLift) * 0.18,
        0,
        0.72,
      )})`,
    );
    light.addColorStop(
      brightStop,
      `rgba(${Math.round(lr)},${Math.round(lg)},${Math.round(lb)},${clamp(
        settings.lightStrength * 0.48,
        0,
        0.5,
      )})`,
    );
    light.addColorStop(fadeStop, "rgba(255,255,255,0)");
    light.addColorStop(1, "rgba(255,255,255,0)");

    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // 背光侧只做很轻的压暗，增强立体感。
    const shade = ctx.createLinearGradient(
      cx - dx,
      cy - dy,
      cx + dx,
      cy + dy,
    );
    shade.addColorStop(
      0,
      `rgba(18,20,28,${clamp(settings.lightStrength * 0.16, 0, 0.13)})`,
    );
    shade.addColorStop(0.42, "rgba(18,20,28,0)");
    shade.addColorStop(1, "rgba(18,20,28,0)");

    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // 只柔化轮廓 alpha，不再牺牲人物内部的线稿与五官细节。
  if (settings.edgeSoftness > 0.01) {
    const { canvas: featherMask, ctx: fctx } = getScratchCtx(
      "edgeFeather",
      w,
      h,
    );
    const featherPx = clamp(settings.edgeSoftness * 1.8, 0.25, 5.5);
    fctx.filter = `blur(${featherPx.toFixed(2)}px)`;
    fctx.drawImage(raw, 0, 0);
    fctx.filter = "none";
    // 再与原 alpha 相交，避免柔化向人物外部扩张成发光白边。
    fctx.globalCompositeOperation = "destination-in";
    fctx.drawImage(raw, 0, 0);

    ctx.save();
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(featherMask, 0, 0);
    ctx.restore();
  }

  return { canvas: out, bounds };
}

function drawPersonGlow(
  ctx: CanvasRenderingContext2D,
  processed: HTMLCanvasElement,
  targetW: number,
  targetH: number,
  settings: Settings,
  scaleFactor: number,
) {
  const glowAmount = clamp(settings.personGlow, 0, 1);
  if (glowAmount <= 0.001) return;

  const { canvas: glowCanvas, ctx: glowCtx } = getScratchCtx(
    "personGlow",
    processed.width,
    processed.height,
  );
  glowCtx.drawImage(processed, 0, 0);
  glowCtx.globalCompositeOperation = "source-in";
  glowCtx.fillStyle = settings.personGlowColor || "#FFFFFF";
  glowCtx.fillRect(0, 0, glowCanvas.width, glowCanvas.height);

  const size = Math.max(0, settings.personGlowSize) * scaleFactor;
  ctx.save();
  ctx.globalCompositeOperation = "screen";

  // 外圈柔光
  ctx.globalAlpha = glowAmount * 0.9;
  ctx.filter = `blur(${Math.max(0.01, size)}px) saturate(1.12)`;
  ctx.drawImage(glowCanvas, -targetW / 2, -targetH / 2, targetW, targetH);

  // 中圈加强，保留一点轮廓发亮的存在感
  ctx.globalAlpha = glowAmount * 0.55;
  ctx.filter = `blur(${Math.max(0.01, size * 0.45)}px)`;
  ctx.drawImage(glowCanvas, -targetW / 2, -targetH / 2, targetW, targetH);

  // 近轮廓轻微强化，避免只剩一团雾
  ctx.globalAlpha = glowAmount * 0.22;
  ctx.filter = `blur(${Math.max(0.01, size * 0.15)}px)`;
  ctx.drawImage(glowCanvas, -targetW / 2, -targetH / 2, targetW, targetH);
  ctx.restore();
}

function drawPersonLayer(
  ctx: CanvasRenderingContext2D,
  processed: HTMLCanvasElement,
  transform: Transform,
  settings: Settings,
  ambient: { r: number; g: number; b: number },
  scaleFactor: number,
  showRaw = false,
  rawAsset?: ImageAsset,
) {
  const x = transform.x * scaleFactor;
  const y = transform.y * scaleFactor;

  // Transform 永远以原始人物图片尺寸为基准。
  // 处理用 canvas 即使为了性能缩小，也不会改变人物在画面里的实际大小。
  const sourceW = rawAsset?.width ?? processed.width;
  const sourceH = rawAsset?.height ?? processed.height;
  const targetH = sourceH * transform.scale * scaleFactor;
  const aspect = sourceW / Math.max(1, sourceH);
  const targetW = targetH * aspect;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((transform.rotation * Math.PI) / 180);
  ctx.scale(transform.flipX ? -1 : 1, 1);

  // 投影与接触阴影已经由 drawGroundShadow 单独处理（它们需要按内容包围盒定位，
  // 并且要在人物图层之下、背景之上），这里只负责人物自身的光效。
  // Environment rim light.
  if (!showRaw && settings.rimLight > 0.001) {
    ctx.save();
    ctx.globalAlpha = settings.rimLight * 0.52;
    ctx.shadowColor = `rgb(${Math.round(ambient.r)},${Math.round(
      ambient.g,
    )},${Math.round(ambient.b)})`;
    ctx.shadowBlur = (10 + 34 * settings.rimLight) * scaleFactor;
    ctx.drawImage(
      processed,
      -targetW / 2,
      -targetH / 2,
      targetW,
      targetH,
    );
    ctx.restore();
  }

  if (!showRaw && settings.personGlow > 0.001) {
    drawPersonGlow(ctx, processed, targetW, targetH, settings, scaleFactor);
  }

  ctx.globalAlpha = showRaw ? 1 : settings.personOpacity;
  ctx.globalCompositeOperation = showRaw
    ? "source-over"
    : blendToComposite(settings.blendMode);

  const source = showRaw && rawAsset ? rawAsset.img : processed;
  ctx.drawImage(source, -targetW / 2, -targetH / 2, targetW, targetH);
  ctx.restore();

  return { x, y, targetW, targetH };
}

/** 人物本地归一化坐标（-0.5~0.5，相对图片框）→ 画布坐标，含旋转与镜像 */
function personLocalToCanvas(
  transform: Transform,
  lx: number,
  ly: number,
  scaleFactor: number,
) {
  const x = transform.flipX ? -lx : lx;
  const rad = (transform.rotation * Math.PI) / 180;
  return {
    x: transform.x * scaleFactor + x * Math.cos(rad) - ly * Math.sin(rad),
    y: transform.y * scaleFactor + x * Math.sin(rad) + ly * Math.cos(rad),
  };
}

/** 人物图片框在画布上的像素尺寸（不含内容裁剪） */
function personBoxOnCanvas(
  transform: Transform,
  processed: HTMLCanvasElement,
  scaleFactor: number,
  rawAsset?: ImageAsset,
) {
  const srcW = rawAsset?.width ?? processed.width;
  const srcH = rawAsset?.height ?? processed.height;
  const h = srcH * transform.scale * scaleFactor;
  return { w: (h * srcW) / Math.max(1, srcH), h, srcW, srcH };
}

/**
 * 落地投影。
 *
 * 原来的实现是「在人物图层上用 ctx.shadowOffset」，本质是一张按固定像素偏移的贴纸
 * 阴影，而且脚点写死在图片高度的 0.47 处 —— 抠图 PNG 四周的透明留白一大，阴影就
 * 浮在半空。
 *
 * 这里换成和 AE「CC Slant」同思路的做法：拿人物剪影本身，沿光照方向压扁 + 斜切，
 * 得到“躺在地上”的方向性投影，再按距离渐隐，最后以正片叠底压到地面上。
 * 落点用真正的内容包围盒底边中点，人物站在哪，影子就从哪开始。
 */
function drawGroundShadow(
  ctx: CanvasRenderingContext2D,
  transform: Transform,
  processed: HTMLCanvasElement,
  settings: Settings,
  scaleFactor: number,
  bounds: PersonBounds | undefined,
  rawAsset?: ImageAsset,
) {
  const opacity = clamp(settings.shadowOpacity, 0, 1);
  if (opacity <= 0.001) return;

  const box = personBoxOnCanvas(transform, processed, scaleFactor, rawAsset);
  const b = bounds ?? FULL_BOUNDS;
  const foot = personLocalToCanvas(
    transform,
    ((b.left + b.right) / 2 - 0.5) * box.w,
    (b.bottom - 0.5) * box.h,
    scaleFactor,
  );

  const length = clamp(settings.shadowLength, 0.08, 1.6);
  const skew = clamp(settings.shadowSkew, -1.5, 1.5);
  const blur = Math.max(0.6, settings.shadowBlur * scaleFactor);

  // 铺开方向：优先听「阴影水平/垂直」滑杆（自动融入时会被光向写进来），
  // 没有明显偏移时按斜切方向给一个默认的侧向地面投影。
  const offX = settings.shadowX;
  const offY = settings.shadowY;
  const dirRad =
    Math.hypot(offX, offY) > 1
      ? Math.atan2(offY, offX)
      : (transform.flipX ? -1 : 1) * (skew >= 0 ? 1 : -1) * (Math.PI / 2.4);

  const pad = blur * 3 + 8;
  const along = box.h * length * 1.2 + pad * 2;
  const across = box.w * 1.25 + Math.abs(skew) * box.h * length + pad * 2;

  const cap = 1400;
  const ratio = Math.min(1, cap / Math.max(along, across));
  const fw = Math.max(8, Math.round(across * ratio));
  const fh = Math.max(8, Math.round(along * ratio));
  const { canvas: frame, ctx: fctx } = getScratchCtx("castShadow", fw, fh);

  const blurScaled = blur * ratio;
  const footY = fh - pad * ratio;

  /*
   * 在「影子本地坐标系」里作画：
   *   +x —— 轮廓横向（斜切方向）
   *   -y —— 影子从脚点向外铺开的方向
   * 脚点固定在 (fw/2, footY)。
   */
  fctx.save();
  fctx.translate(fw / 2, footY);
  fctx.transform(1, 0, -skew, 1, 0, 0); // 斜切：离地越高越往侧面倒
  fctx.scale(1, length); // 压扁：形成“躺在地上”的透视
  fctx.rotate((transform.rotation * Math.PI) / 180);
  fctx.scale(transform.flipX ? -1 : 1, 1);
  fctx.filter = `brightness(0) blur(${blurScaled.toFixed(2)}px)`;
  const drawW = box.w * ratio;
  const drawH = box.h * ratio;
  fctx.drawImage(
    processed,
    -drawW / 2 - ((b.left + b.right) / 2 - 0.5) * drawW,
    -drawH / 2 - (b.bottom - 0.5) * drawH,
    drawW,
    drawH,
  );
  fctx.restore();

  // 距离渐隐：越远离脚点越淡，避免出现一条生硬的边缘。
  fctx.globalCompositeOperation = "destination-out";
  const fade = fctx.createLinearGradient(0, footY, 0, 0);
  fade.addColorStop(0, "rgba(0,0,0,0)");
  fade.addColorStop(0.3, "rgba(0,0,0,0.22)");
  fade.addColorStop(0.68, "rgba(0,0,0,0.66)");
  fade.addColorStop(1, "rgba(0,0,0,1)");
  fctx.fillStyle = fade;
  fctx.fillRect(0, 0, fw, fh);
  fctx.globalCompositeOperation = "source-over";

  // 正片叠底让影子真正「压暗地面」而不是糊一层灰。
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = "multiply";
  ctx.translate(foot.x, foot.y);
  ctx.rotate(dirRad + Math.PI / 2);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(frame, -fw / 2, -footY);
  ctx.restore();
}

/**
 * 接触阴影：脚底那一小块环境遮蔽。
 * 用内容包围盒的宽度与底边定位，抠图 PNG 带留白时也能准确踩在地上。
 */
function drawContactShadow(
  ctx: CanvasRenderingContext2D,
  transform: Transform,
  processed: HTMLCanvasElement,
  settings: Settings,
  scaleFactor: number,
  rawAsset?: ImageAsset,
  bounds?: PersonBounds,
) {
  const amount = clamp(settings.contactShadow, 0, 1);
  if (amount <= 0.001) return;

  const box = personBoxOnCanvas(transform, processed, scaleFactor, rawAsset);
  const b = bounds ?? FULL_BOUNDS;
  const foot = personLocalToCanvas(
    transform,
    ((b.left + b.right) / 2 - 0.5) * box.w,
    (b.bottom - 0.5) * box.h,
    scaleFactor,
  );

  const shadowW = Math.max(
    6,
    box.w * clamp(b.width, 0.05, 1) * clamp(settings.contactShadowWidth, 0.15, 1.4) * 0.62,
  );
  const shadowH = Math.max(3, shadowW * 0.2);

  ctx.save();
  ctx.translate(foot.x, foot.y);
  ctx.rotate((transform.rotation * Math.PI) / 180);
  ctx.filter = `blur(${Math.max(0.5, settings.contactShadowBlur * scaleFactor * 0.34)}px)`;
  ctx.scale(1, shadowH / shadowW);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, shadowW);
  g.addColorStop(0, `rgba(0,0,0,${amount * 0.85})`);
  g.addColorStop(0.5, `rgba(0,0,0,${amount * 0.34})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, shadowW, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * 背光。
 *
 * 教程里的「背光」是把人物剪影填成光源色、模糊后垫在人物身后：逆光、霓虹、
 * 雪夜这类场景里，它比轮廓光更能把人物从背景里托出来，也解释了「人物挡住了
 * 光源，所以边缘发光」这件事。
 */
function drawBackLight(
  ctx: CanvasRenderingContext2D,
  transform: Transform,
  processed: HTMLCanvasElement,
  settings: Settings,
  scaleFactor: number,
  rawAsset?: ImageAsset,
) {
  const amount = clamp(settings.backLight, 0, 1);
  if (amount <= 0.001) return;

  const box = personBoxOnCanvas(transform, processed, scaleFactor, rawAsset);
  if (box.w < 2 || box.h < 2) return;

  // 模糊是低频操作，用几百像素的画布算完再放大，省掉 4K 导出时的大图滤波。
  const cap = 720;
  const ratio = Math.min(1, cap / Math.max(box.w, box.h));
  const gw = Math.max(4, Math.round(box.w * ratio));
  const gh = Math.max(4, Math.round(box.h * ratio));
  const { canvas: glow, ctx: gctx } = getScratchCtx("backLight", gw, gh);
  gctx.drawImage(processed, 0, 0, gw, gh);
  gctx.globalCompositeOperation = "source-in";
  gctx.fillStyle = settings.backLightColor || "#FFD9A6";
  gctx.fillRect(0, 0, gw, gh);

  ctx.save();
  ctx.translate(transform.x * scaleFactor, transform.y * scaleFactor);
  ctx.rotate((transform.rotation * Math.PI) / 180);
  ctx.scale(transform.flipX ? -1 : 1, 1);
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = clamp(amount * 0.9, 0, 1);
  ctx.filter = `blur(${Math.max(1, (settings.backLightSize * scaleFactor) / ratio * 0.28)}px)`;
  ctx.drawImage(glow, -box.w / 2, -box.h / 2, box.w, box.h);
  ctx.restore();
}

function drawBloom(
  ctx: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  amount: number,
) {
  if (amount <= 0.001) return;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = amount * 0.5;
  ctx.filter = `blur(${7 + amount * 24}px) brightness(${1.06 + amount * 0.35}) contrast(${1.12 + amount * 0.55})`;
  ctx.drawImage(source, 0, 0);
  ctx.restore();
}

/**
 * 阈值泛光（高光泛光）。
 *
 * 原来的「柔光泛光」是把整张图模糊后 screen 回去 —— 那只会让画面蒙一层雾，
 * 暗部被一起抬亮，画面反而更平。真正好看的光晕只来自高光：先把阈值以上的部分
 * 抽出来，再大范围模糊叠回去。这样暗部纹丝不动，亮部周围浮起一层光 —— 是「发光」
 * 而不是「起雾」。
 */
function makeIcon(path: string) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

const Icons = {  photo: makeIcon("M4 5h16v14H4z M4 15l4-4 4 4 2-2 6 6 M15.5 9.5h.01"),
  person: makeIcon("M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M5 21a7 7 0 0 1 14 0"),
  magic: makeIcon("M12 3l1.2 3.3L16.5 7.5l-3.3 1.2L12 12l-1.2-3.3L7.5 7.5l3.3-1.2L12 3z M18 13l.8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8L18 13z"),
  reset: makeIcon("M3 12a9 9 0 1 0 3-6.7L3 8 M3 3v5h5"),
  mirror: makeIcon("M12 3v18 M10 6L5 9v6l5 3 M14 6l5 3v6l-5 3"),
  compare: makeIcon("M12 3v18 M5 5h7v14H5z M12 5h7v14h-7"),
  download: makeIcon("M12 3v12 M7 10l5 5 5-5 M5 21h14"),
  fullscreen: makeIcon("M8 3H3v5 M16 3h5v5 M8 21H3v-5 M16 21h5v-5"),
  undo: makeIcon("M9 14 4 9l5-5 M4 9h10a6 6 0 0 1 0 12h-3"),
  redo: makeIcon("M15 14l5-5-5-5 M20 9H10a6 6 0 0 0 0 12h3"),
  layers: makeIcon("M12 3l9 5-9 5-9-5 9-5z M3 12l9 5 9-5 M3 16l9 5 9-5"),
};

/**
 * 交互质量降级用的上下文。
 *
 * 面板里有四十多个滑杆，逐个透传「开始/结束交互」回调太啰嗦；
 * 用上下文让叶子组件自己接一次即可，滑杆一按下就切到低分辨率预览。
 */
const InteractionContext = createContext<{ begin: () => void; end: () => void }>({
  begin: () => {},
  end: () => {},
});

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const bgInputRef = useRef<HTMLInputElement | null>(null);
  const personInputRef = useRef<HTMLInputElement | null>(null);

  const [background, setBackground] = useState<ImageAsset | null>(null);
  const [person, setPerson] = useState<ImageAsset | null>(null);
  const [settings, setSettings] = useState<Settings>(() => ({
    ...DEFAULT_SETTINGS,
  }));
  const settingsRef = useRef(settings);
  const [transform, setTransform] = useState<Transform>({
    x: 640,
    y: 390,
    scale: 0.52,
    rotation: 0,
    flipX: false,
  });
  const transformRef = useRef(transform);

  const [showRawComposite, setShowRawComposite] = useState(false);
  const holdCompareRef = useRef<boolean | null>(null);
  type TabName = "融合" | "空间" | "氛围" | "去背";
  const [activeTab, setActiveTab] = useState<TabName>("融合");
  const [ambientColor, setAmbientColor] = useState("#c5b6a8");
  // 保存最近一次的环境采样结果（含亮度与饱和度），交互期间会冻结在这里。
  const ambientRef = useRef<AmbientSample>({
    ...NEUTRAL_AMBIENT,
    r: 197,
    g: 182,
    b: 168,
  });
  const [toast, setToast] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [personSelected, setPersonSelected] = useState(false);
  const [pickLightMode, setPickLightMode] = useState(false);
  const [lightPoint, setLightPoint] = useState<{ x: number; y: number } | null>(null);
  const [lightPatches, setLightPatches] = useState<LightPatch[]>([]);
  const [activeLightPatchId, setActiveLightPatchId] = useState<string | null>(null);
  const [lightPatchEditMode, setLightPatchEditMode] = useState(false);
  const [pickPatchColorMode, setPickPatchColorMode] = useState(false);

  /*
   * ── 交互质量降级 ────────────────────────────────────────────────────────
   * 这套合成里最贵的一步是逐像素重照明（人物图层）。它是「所见即所得」的核心，
   * 不能省，但可以降分辨率：交互期间按半分辨率处理，松手后再按原分辨率重算一次。
   * 配合冻结环境采样，拖动时既不会每帧重算，观感也不会掉链子。
   */
  const frozenAmbientRef = useRef<AmbientSample | null>(null);
  const interactingRef = useRef(false);
  const [interactionTick, setInteractionTick] = useState(0);

  /** 渲染输入镜像：渲染被合并进动画帧，取的是"最新"输入而不是闭包里的旧值 */
  const renderInputRef = useRef({
    background,
    person,
    settings,
    transform,
    showRawComposite,
  });
  const renderFrameRef = useRef<number | null>(null);

  /** 给非 React 回调（粘贴、快捷键、撤销栈）读取最新状态 */
  const backgroundRef = useRef<ImageAsset | null>(null);
  const personRef = useRef<ImageAsset | null>(null);
  const lightPatchesRef = useRef<LightPatch[]>([]);

  const [exporting, setExporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  /** 撤销栈深度。栈本身放在 ref 里（改动频繁），只把长度同步到 state 渲染用 */
  const [historyDepth, setHistoryDepth] = useState({ past: 0, future: 0 });

  // Next.js Fast Refresh 可能保留旧版本 state。
  // 当新增设置字段后，用默认值补齐，避免旧 state 中出现 undefined / NaN。
  useEffect(() => {
    setSettings((prev) => ({
      ...DEFAULT_SETTINGS,
      ...prev,
    }));
  }, []);

  /** 缓存的人物处理图层；bounds 是它的内容包围盒，投影/构图要用 */
  const processedPersonRef = useRef<{
    canvas: HTMLCanvasElement;
    bounds: PersonBounds;
  } | null>(null);
  const processedPersonKeyRef = useRef("");
  const backgroundCanvasCacheRef = useRef<{ key: string; canvas: HTMLCanvasElement } | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const imageLoadSeqRef = useRef({ background: 0, person: 0 });
  const dragRef = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });
  const lightPatchDragRef = useRef({
    active: false,
    pointerId: -1,
    id: "",
    mode: "move" as "move" | "resize" | "rotate",
    offsetU: 0,
    offsetV: 0,
    startWidth: 0,
    startHeight: 0,
    startRotation: 0,
    startX: 0,
    startY: 0,
    cornerX: 1,
    cornerY: 1,
    anchorX: 0,
    anchorY: 0,
  });
  const patchMoveFrameRef = useRef<number | null>(null);
  const pendingPatchMoveRef = useRef<{ id: string; patch: Partial<LightPatch> } | null>(null);

  /*
   * ── 撤销 / 重做 ────────────────────────────────────────────────────────
   * 快照只收「会改变成图」的三块状态：参数、人物变换、光斑。
   * 视图类开关（未融合对比、当前标签页等）不进历史，否则撤销时画面会莫名跳动。
   */
  const historyRef = useRef<{
    past: Snapshot[];
    future: Snapshot[];
  }>({ past: [], future: [] });
  const lastHistoryRef = useRef({ label: "", at: 0 });

  const captureSnapshot = useCallback(
    (): Snapshot => ({
      settings: settingsRef.current,
      transform: transformRef.current,
      lightPatches: lightPatchesRef.current,
    }),
    [],
  );

  /**
   * 记录"这次改动之前"的状态。
   *
   * 同一个 label 在 700ms 内的连续改动会合并成一条：拖一次滑杆或拖一次人物
   * 只产生一步可撤销的改动，而不是几十步。
   */
  const pushHistory = useCallback(
    (label: string) => {
      const now = performance.now();
      const last = lastHistoryRef.current;
      if (last.label === label && now - last.at < 700) {
        last.at = now;
        return;
      }
      lastHistoryRef.current = { label, at: now };

      const history = historyRef.current;
      history.past.push(captureSnapshot());
      if (history.past.length > 80) history.past.shift();
      history.future.length = 0;
      setHistoryDepth({ past: history.past.length, future: history.future.length });
    },
    [captureSnapshot],
  );

  const canUndo = historyDepth.past > 0;
  const canRedo = historyDepth.future > 0;

  const applySnapshot = useCallback((snap: Snapshot) => {
    // 同步写回 ref：连续快速撤销时，下一步的快照才不会读到旧值。
    settingsRef.current = snap.settings;
    transformRef.current = snap.transform;
    lightPatchesRef.current = snap.lightPatches;
    setSettings(snap.settings);
    setTransform(snap.transform);
    setLightPatches(snap.lightPatches);
  }, []);

  const updateSettings = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    // 值没变就不写历史，也不触发重渲染：滑杆抖动不会污染撤销栈。
    if (Object.is(settingsRef.current[key], value)) return;
    pushHistory(`setting:${key}`);
    setSettings((prev) => (Object.is(prev[key], value) ? prev : { ...prev, [key]: value }));
  };

  const activeLightPatch =
    lightPatches.find((patch) => patch.id === activeLightPatchId) ?? null;

  useEffect(() => {
    if (!activeLightPatchId) setPickPatchColorMode(false);
  }, [activeLightPatchId]);

  const patchControlFrameRef = useRef<number | null>(null);
  const pendingPatchControlRef = useRef<{ id: string; patch: Partial<LightPatch> } | null>(null);

  // Windows / Chromium 的系统色卡在拖动时会以很高频率触发 input。
  // 这里采用“零 Canvas 重绘”的交互：
  // - onInput 只更新 HEX 文本，不触发 React state / Canvas；
  // - onChange / onBlur 时一次性提交最终颜色。
  // 这样系统色卡本身保持原生流畅，避免每拖 1px 都重绘整张合成图。
  const patchColorInputRef = useRef<HTMLInputElement | null>(null);
  const patchColorHexRef = useRef<HTMLSpanElement | null>(null);
  const personGlowColorInputRef = useRef<HTMLInputElement | null>(null);
  const personGlowColorHexRef = useRef<HTMLSpanElement | null>(null);
  const backLightColorInputRef = useRef<HTMLInputElement | null>(null);
  const backLightColorHexRef = useRef<HTMLSpanElement | null>(null);

  // 面板里的 range/select 在拖动时会非常高频地触发 change。
  // Next 16 + React 19 开发模式下，如果每个原生 change 都同步 setState，
  // 某些浏览器会在受控 input 的连续更新中触发 Maximum update depth。
  // 这里统一合并到下一帧，同时严格跳过“值没有变化”的更新。
  const updateLightPatch = useCallback(
    (id: string, patch: Partial<LightPatch>) => {
      pushHistory(`patch:${id}`);
      const pending = pendingPatchControlRef.current;
      pendingPatchControlRef.current =
        pending && pending.id === id
          ? { id, patch: { ...pending.patch, ...patch } }
          : { id, patch };

      if (patchControlFrameRef.current !== null) return;
      patchControlFrameRef.current = requestAnimationFrame(() => {
        patchControlFrameRef.current = null;
        const nextUpdate = pendingPatchControlRef.current;
        pendingPatchControlRef.current = null;
        if (!nextUpdate) return;

        setLightPatches((prev) => {
          const index = prev.findIndex((item) => item.id === nextUpdate.id);
          if (index < 0) return prev;

          const current = prev[index] as unknown as Record<string, unknown>;
          const entries = Object.entries(nextUpdate.patch);
          const changed = entries.some(([key, value]) => !Object.is(current[key], value));
          if (!changed) return prev;

          const next = prev.slice();
          next[index] = { ...prev[index], ...nextUpdate.patch };
          return next;
        });
      });
    },
    [pushHistory],
  );

  const previewPatchColor = useCallback((color: string) => {
    // 只更新文本。不要在系统色卡拖动期间触发 React / Canvas。
    if (patchColorHexRef.current) {
      patchColorHexRef.current.textContent = color.toUpperCase();
    }
  }, []);

  const commitPatchColor = useCallback(
    (id: string, color: string) => {
      pushHistory(`patch-color:${id}`);
      if (patchColorHexRef.current) {
        patchColorHexRef.current.textContent = color.toUpperCase();
      }
      setLightPatches((prev) => {
        const index = prev.findIndex((item) => item.id === id);
        if (index < 0 || prev[index].color === color) return prev;
        const next = prev.slice();
        next[index] = { ...prev[index], color };
        return next;
      });
    },
    [pushHistory],
  );

  useEffect(() => {
    if (!activeLightPatch) return;
    if (patchColorInputRef.current) {
      patchColorInputRef.current.value = activeLightPatch.color;
    }
    if (patchColorHexRef.current) {
      patchColorHexRef.current.textContent = activeLightPatch.color.toUpperCase();
    }
  }, [activeLightPatchId, activeLightPatch?.color]);

  const previewPersonGlowColor = useCallback((color: string) => {
    // 同样只更新 HEX，不触发整张画布渲染。
    if (personGlowColorHexRef.current) {
      personGlowColorHexRef.current.textContent = color.toUpperCase();
    }
  }, []);

  const commitPersonGlowColor = useCallback((color: string) => {
    pushHistory("glow-color");
    if (personGlowColorHexRef.current) {
      personGlowColorHexRef.current.textContent = color.toUpperCase();
    }
    setSettings((prev) =>
      prev.personGlowColor === color ? prev : { ...prev, personGlowColor: color },
    );
  }, [pushHistory]);

  useEffect(() => {
    if (personGlowColorInputRef.current) {
      personGlowColorInputRef.current.value = settings.personGlowColor;
    }
    if (personGlowColorHexRef.current) {
      personGlowColorHexRef.current.textContent = settings.personGlowColor.toUpperCase();
    }
  }, [settings.personGlowColor]);

  const previewBackLightColor = useCallback((color: string) => {
    if (backLightColorHexRef.current) {
      backLightColorHexRef.current.textContent = color.toUpperCase();
    }
  }, []);

  const commitBackLightColor = useCallback((color: string) => {
    pushHistory("backlight-color");
    if (backLightColorHexRef.current) {
      backLightColorHexRef.current.textContent = color.toUpperCase();
    }
    setSettings((prev) =>
      prev.backLightColor === color ? prev : { ...prev, backLightColor: color },
    );
  }, [pushHistory]);

  useEffect(() => {
    if (backLightColorInputRef.current) {
      backLightColorInputRef.current.value = settings.backLightColor;
    }
    if (backLightColorHexRef.current) {
      backLightColorHexRef.current.textContent = settings.backLightColor.toUpperCase();
    }
  }, [settings.backLightColor]);

  const queueLightPatchUpdate = useCallback((id: string, patch: Partial<LightPatch>) => {
    pushHistory(`patch:${id}`);
    const pending = pendingPatchMoveRef.current;
    pendingPatchMoveRef.current = pending && pending.id === id
      ? { id, patch: { ...pending.patch, ...patch } }
      : { id, patch };
    if (patchMoveFrameRef.current !== null) return;
    patchMoveFrameRef.current = requestAnimationFrame(() => {
      patchMoveFrameRef.current = null;
      const next = pendingPatchMoveRef.current;
      pendingPatchMoveRef.current = null;
      if (!next) return;
      setLightPatches((prev) =>
        prev.map((item) => (item.id === next.id ? { ...item, ...next.patch } : item)),
      );
    });
  }, [pushHistory]);

  useEffect(() => () => {
    if (patchMoveFrameRef.current !== null) cancelAnimationFrame(patchMoveFrameRef.current);
    if (patchControlFrameRef.current !== null) cancelAnimationFrame(patchControlFrameRef.current);
    pendingPatchMoveRef.current = null;
    pendingPatchControlRef.current = null;
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
  }, []);

  const addLightPatch = useCallback(
    (kind: "暖光" | "冷光" | "硬窗光" | "阴影" = "暖光") => {
      pushHistory("patch-add");
      const id = `light-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const next: LightPatch =
        kind === "阴影"
          ? {
              id,
              name: "遮光阴影",
              x: 0.48,
              y: 0.38,
              width: 0.5,
              height: 0.16,
              rotation: -16,
              color: "#141A26",
              intensity: 0.6,
              softness: 0.1,
              highlight: 0,
              shape: "硬光",
              mode: "影",
            }
          : kind === "冷光"
          ? {
              id,
              name: "冷色柔光",
              x: 0.42,
              y: 0.38,
              width: 0.46,
              height: 0.34,
              rotation: -18,
              color: "#9AC6FF",
              intensity: 0.82,
              softness: 0.6,
              highlight: 0.26,
              shape: "柔光",
              mode: "光",
            }
          : kind === "硬窗光"
            ? {
                id,
                name: "窗缝硬光",
                x: 0.57,
                y: 0.36,
                width: 0.5,
                height: 0.14,
                rotation: -16,
                color: "#FFF3D6",
                intensity: 1,
                softness: 0.05,
                highlight: 0.6,
                shape: "硬光",
                mode: "光",
              }
            : {
                id,
                name: "暖色柔光",
                x: 0.58,
                y: 0.38,
                width: 0.44,
                height: 0.32,
                rotation: -16,
                color: "#FFAE5E",
                intensity: 0.82,
                softness: 0.6,
                highlight: 0.26,
                shape: "柔光",
                mode: "光",
              };
      setLightPatches((prev) => [...prev, next].slice(-10));
      setActiveLightPatchId(id);
      setPersonSelected(false);
      setLightPatchEditMode(true);
    },
    [pushHistory],
  );

  const applyReferenceSunlight = useCallback(() => {
    pushHistory("sunlight");
    const stamp = Date.now();
    const patches: LightPatch[] = [
      {
        id: `sun-${stamp}-1`, name: "面部日光", x: 0.55, y: 0.34,
        width: 0.46, height: 0.12, rotation: -14, color: "#fff3d8",
        intensity: 1.08, softness: 0.07, highlight: 0.88, shape: "硬光", mode: "光",
      },
      {
        id: `sun-${stamp}-2`, name: "上身日光", x: 0.66, y: 0.49,
        width: 0.42, height: 0.11, rotation: -14, color: "#fff1cf",
        intensity: 0.98, softness: 0.09, highlight: 0.78, shape: "硬光", mode: "光",
      },
      {
        id: `sun-${stamp}-3`, name: "衣摆日光", x: 0.49, y: 0.66,
        width: 0.58, height: 0.105, rotation: -14, color: "#ffedc6",
        intensity: 0.88, softness: 0.11, highlight: 0.7, shape: "光带", mode: "光",
      },
      {
        id: `sun-${stamp}-4`, name: "面部遮光", x: 0.34, y: 0.345,
        width: 0.28, height: 0.14, rotation: -14, color: "#17202a",
        intensity: 0.5, softness: 0.12, highlight: 0, shape: "硬光", mode: "影",
      },
    ];
    setLightPatches(patches);
    setActiveLightPatchId(patches[0].id);
    setPersonSelected(false);
    setLightPatchEditMode(true);
    setSettings((prev) => ({
      ...prev,
      faceShadowStrength: Math.max(prev.faceShadowStrength ?? 0.32, 0.42),
      backShade: Math.max(prev.backShade ?? 0.18, 0.24),
      relightStrength: Math.max(prev.relightStrength ?? 0.46, 0.5),
    }));
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    setToast("已生成参考图风格的斜射日光，可直接拖动每一块光");
    toastTimerRef.current = window.setTimeout(() => {
      toastTimerRef.current = null;
      setToast("");
    }, 1800);
  }, [pushHistory]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  const notify = useCallback((msg: string) => {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = window.setTimeout(() => {
      toastTimerRef.current = null;
      setToast("");
    }, 1800);
  }, []);

  const undo = useCallback(() => {
    const history = historyRef.current;
    const snap = history.past.pop();
    if (!snap) return;
    history.future.push(captureSnapshot());
    applySnapshot(snap);
    setHistoryDepth({ past: history.past.length, future: history.future.length });
    notify("已撤销上一步");
  }, [applySnapshot, captureSnapshot, notify]);

  const redo = useCallback(() => {
    const history = historyRef.current;
    const snap = history.future.pop();
    if (!snap) return;
    history.past.push(captureSnapshot());
    applySnapshot(snap);
    setHistoryDepth({ past: history.past.length, future: history.future.length });
    notify("已重做");
  }, [applySnapshot, captureSnapshot, notify]);

  const loadImage = useCallback(
    (file: File, kind: "background" | "person") => {
      if (!file.type.startsWith("image/")) {
        notify("请选择图片文件");
        return;
      }
      if (file.size > 35 * 1024 * 1024) {
        notify("图片请控制在 35MB 以内");
        return;
      }

      const seq = ++imageLoadSeqRef.current[kind];
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        // 用户连续快速换图时，旧图片即使后加载完成也不能覆盖新选择。
        if (seq !== imageLoadSeqRef.current[kind]) {
          URL.revokeObjectURL(url);
          return;
        }
        const asset: ImageAsset = {
          img,
          url,
          name: file.name,
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
        };

        if (kind === "background") {
          setBackground((old) => {
            if (old) URL.revokeObjectURL(old.url);
            return asset;
          });
          notify("现实场景已载入");
        } else {
          setPerson((old) => {
            if (old) URL.revokeObjectURL(old.url);
            return asset;
          });
          setPersonSelected(true);
          setActiveLightPatchId(null);
          notify("人物已载入");
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        notify("图片读取失败");
      };
      img.src = url;
    },
    [notify],
  );

  // 直接粘贴图片：这个工具最常见的入口就是截图/复制一张图过来。
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      const item = items.find((i) => i.type.startsWith("image/"));
      const file = item?.getAsFile();
      if (!file) return;
      e.preventDefault();

      // 没有场景就先当场景，其次当人物；两张都齐了就替换人物。
      // ClipboardEvent 上没有 shiftKey（只有鼠标/键盘事件才有），
      // 所以这里不做修饰键分支，行为保持可预期。
      if (!backgroundRef.current) loadImage(file, "background");
      else loadImage(file, "person");
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [loadImage]);

  const backgroundUrlRef = useRef<string | null>(null);
  const personUrlRef = useRef<string | null>(null);

  useEffect(() => {
    backgroundUrlRef.current = background?.url ?? null;
    backgroundCanvasCacheRef.current = null;
  }, [background]);

  useEffect(() => {
    personUrlRef.current = person?.url ?? null;
  }, [person]);

  useEffect(() => {
    return () => {
      if (backgroundUrlRef.current) URL.revokeObjectURL(backgroundUrlRef.current);
      if (personUrlRef.current) URL.revokeObjectURL(personUrlRef.current);
    };
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;

    const rect = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(320, Math.floor(rect.width));
    const h = Math.max(420, Math.floor(rect.height));

    const oldCssW = Number(canvas.dataset.cssWidth) || w;
    const oldCssH = Number(canvas.dataset.cssHeight) || h;

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.dataset.cssWidth = String(w);
    canvas.dataset.cssHeight = String(h);

    // 窗口尺寸变化时保持人物的相对构图位置，而不是突然跳走。
    if (oldCssW > 0 && oldCssH > 0 && (oldCssW !== w || oldCssH !== h)) {
      setTransform((prev) => ({
        ...prev,
        x: clamp((prev.x / oldCssW) * w, -w * 0.5, w * 1.5),
        y: clamp((prev.y / oldCssH) * h, -h * 0.5, h * 1.5),
      }));
      setLightPoint((prev) =>
        prev
          ? { x: (prev.x / oldCssW) * w, y: (prev.y / oldCssH) * h }
          : prev,
      );
    }
  }, []);

  useEffect(() => {
    resizeCanvas();
    const ro = new ResizeObserver(resizeCanvas);
    if (stageRef.current) ro.observe(stageRef.current);
    return () => ro.disconnect();
  }, [resizeCanvas]);

  const buildBackgroundCanvas = useCallback(
    (
      width: number,
      height: number,
      bg: ImageAsset,
      s: Settings,
      finalGrade = false,
    ) => {
      const c = document.createElement("canvas");
      c.width = width;
      c.height = height;
      const ctx = c.getContext("2d")!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      const rect = fitRect(bg.width, bg.height, width, height, s.bgFit);

      ctx.fillStyle = "#111115";
      ctx.fillRect(0, 0, width, height);
      // 同样是恒等短路：背景默认也要原样呈现
      const bgParts: string[] = [];
      if (Math.abs(s.bgBrightness - 1) > 0.001) bgParts.push(`brightness(${s.bgBrightness})`);
      if (Math.abs(s.bgSaturation - 1) > 0.001) bgParts.push(`saturate(${s.bgSaturation})`);
      if (s.bgBlur > 0.01) bgParts.push(`blur(${s.bgBlur}px)`);
      if (bgParts.length) {
        ctx.save();
        ctx.filter = bgParts.join(" ");
      }
      ctx.drawImage(bg.img, rect.x, rect.y, rect.w, rect.h);
      if (bgParts.length) ctx.restore();

      if (finalGrade) {
        const grade = document.createElement("canvas");
        grade.width = width;
        grade.height = height;
        const gctx = grade.getContext("2d")!;
        gctx.filter = `brightness(${s.overallExposure}) contrast(${s.overallContrast}) saturate(${s.overallSaturation})`;
        gctx.drawImage(c, 0, 0);
        return grade;
      }
      return c;
    },
    [],
  );

  /**
   * 环境采样。
   *
   * 除了原来的「人物周围均值」，这里额外在人物框四角附近各采一块，作为双线性
   * 环境色场的四个控制点。窗光/台灯这类场景里，人物左侧和右侧接收到的环境色
   * 本来就不同，只用一个均值染色会把这种方向性抹平，人物看起来就“贴”在画面上。
   */
  const analyzeAmbient = useCallback(
    (
      canvas: HTMLCanvasElement,
      t: Transform,
      asset?: ImageAsset | null,
      scaleFactor = 1,
    ): AmbientSample => {
      const sampleAt = (cx: number, cy: number, rw: number, rh: number) =>
        sampleCanvas(canvas, { x: cx - rw / 2, y: cy - rh / 2, w: rw, h: rh });

      const boxW = asset ? asset.width * t.scale * scaleFactor : canvas.width * 0.22;
      const boxH = asset ? asset.height * t.scale * scaleFactor : canvas.height * 0.26;
      const regionW = clamp(Math.max(80, boxW * 1.18), 80, canvas.width * 0.58);
      const regionH = clamp(Math.max(80, boxH * 1.12), 80, canvas.height * 0.62);
      const cx = t.x * scaleFactor;
      const cy = t.y * scaleFactor;

      const avg = sampleAt(cx, cy, regionW, regionH);

      /*
       * 四角色场：取样块按「人物框四角」摆放，而且要足够小。
       * 早期版本用了很大的取样块（boxW*0.72），结果左右两块互相重叠、
       * 把背景自身的渐变平均掉了，四色场退化成一片灰，完全看不出方向性。
       * 现在把小块直接压在四角上，量到的才是「人物左右上下的局部环境色」。
       */
      const cellW = clamp(boxW * 0.36, 20, 220);
      const cellH = clamp(boxH * 0.22, 20, 200);
      const dx = boxW * 0.5;
      const dy = boxH * 0.5;

      return {
        ...avg,
        corners: {
          tl: sampleAt(cx - dx, cy - dy, cellW, cellH),
          tr: sampleAt(cx + dx, cy - dy, cellW, cellH),
          bl: sampleAt(cx - dx, cy + dy, cellW, cellH),
          br: sampleAt(cx + dx, cy + dy, cellW, cellH),
        },
      };
    },
    [],
  );

  /**
   * 合成核心：假定背景画布已经按目标尺寸准备好，负责把人物、光影、整体调色
   * 叠到 target 上。
   *
   * 预览和导出走的是同一个函数 —— 以前导出单独抄了一份百余行的合成流程，
   * 任何一处观感改动都得改两遍，还很容易让「导出和预览不一样」。
   */
  const composeScene = useCallback(
    (
      target: HTMLCanvasElement,
      bgCanvas: HTMLCanvasElement,
      fg: ImageAsset | null,
      s: Settings,
      t: Transform,
      ambient: AmbientSample,
      scaleFactor: number,
      options?: {
        rawComposite?: boolean;
        exportMode?: boolean;
        preview?: boolean;
        lightPatches?: LightPatch[];
      },
    ) => {
      const ctx = target.getContext("2d")!;
      const w = target.width;
      const h = target.height;
      const patches = options?.lightPatches ?? [];

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.filter = "none";
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(bgCanvas, 0, 0);

      if (fg) {
        const ambientKey = [
          Math.round(ambient.r / 8),
          Math.round(ambient.g / 8),
          Math.round(ambient.b / 8),
          Math.round((ambient.corners.tl.r + ambient.corners.br.r) / 16),
          Math.round((ambient.corners.tr.r + ambient.corners.bl.b) / 16),
        ].join("-");

        const processedKey = [
          fg.url,
          ambientKey,
          s.personBrightness,
          s.personContrast,
          s.personSaturation,
          s.personWarmth,
          s.personBlur,
          s.edgeSoftness,
          s.ambientTint,
          s.ambientHaze,
          s.ambientSpread,
          s.lightStrength,
          s.lightAngle,
          s.lightSoftness,
          s.lightCoverage,
          s.lightWarmth,
          s.lightLift,
          s.relightStrength,
          s.volumeDepth,
          s.wrapLight,
          s.edgeLight,
          s.backShade,
          s.faceShadowStrength,
          s.faceShadowSoftness,
          s.faceShadowThreshold,
          s.keyMode,
          s.keyTolerance,
          s.keyFeather,
          s.edgeDecontaminate,
          s.edgeChoke,
        ].join("|");

        let entry = processedPersonRef.current;
        if (
          !entry ||
          processedPersonKeyRef.current !== processedKey ||
          options?.exportMode
        ) {
          entry = createProcessedPerson(
            fg,
            s,
            ambient,
            options?.exportMode ? Math.max(3000, Math.max(w, h)) : 960,
          );
          if (!options?.exportMode) {
            processedPersonRef.current = entry;
            processedPersonKeyRef.current = processedKey;
          }
        }
        const processed = entry.canvas;
        const bounds = entry.bounds;

        let personForDraw = processed;
        if (!options?.rawComposite && patches.length) {
          // 局部光斑单独作为轻量图层叠加，不再因为拖动光斑反复执行整套逐像素重照明。
          // 这样拖动/缩放/旋转的反馈能稳定在动画帧级别。
          const { canvas: localLit, ctx: localCtx } = getScratchCtx(
            "localLit",
            processed.width,
            processed.height,
          );
          localCtx.drawImage(processed, 0, 0);
          drawLocalLightPatches(localLit, processed, patches, s);
          personForDraw = localLit;
        }

        if (!options?.rawComposite) {
          // 先落地投影，再接触阴影，再背光，最后人物本体 —— 这个顺序保证
          // 影子永远在脚下、背光永远在身后。
          drawGroundShadow(ctx, t, personForDraw, s, scaleFactor, bounds, fg);
          drawContactShadow(ctx, t, personForDraw, s, scaleFactor, fg, bounds);
          drawBackLight(ctx, t, processed, s, scaleFactor, fg);
        }

        drawPersonLayer(
          ctx,
          personForDraw,
          t,
          s,
          ambient,
          scaleFactor,
          Boolean(options?.rawComposite),
          fg,
        );
      }

      if (!options?.rawComposite) {
        const { canvas: graded, ctx: gctx } = getScratchCtx("graded", w, h);
        const overallParts: string[] = [];
        if (Math.abs(s.overallExposure - 1) > 0.001) overallParts.push(`brightness(${s.overallExposure})`);
        if (Math.abs(s.overallContrast - 1) > 0.001) overallParts.push(`contrast(${s.overallContrast})`);
        if (Math.abs(s.overallSaturation - 1) > 0.001) overallParts.push(`saturate(${s.overallSaturation})`);
        if (overallParts.length) gctx.filter = overallParts.join(" ");
        gctx.drawImage(target, 0, 0);
        gctx.filter = "none";

        if (Math.abs(s.overallWarmth) > 0.004) {
          gctx.globalCompositeOperation = "soft-light";
          gctx.fillStyle =
            s.overallWarmth > 0
              ? `rgba(255,145,70,${Math.abs(s.overallWarmth) * 0.22})`
              : `rgba(75,145,255,${Math.abs(s.overallWarmth) * 0.22})`;
          gctx.fillRect(0, 0, w, h);
          gctx.globalCompositeOperation = "source-over";
        }

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
        ctx.filter = "none";
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(graded, 0, 0);

        /*
         * 交互中跳过泛光、光点与颗粒：这三项是纯观感修饰，拖动时省掉能明显降帧耗时，
         * 松手后的完整渲染会把它们补回来。光柱、暗角、分离色调便宜且影响大，保留。
         */
        if (!options?.preview) {
          drawBloom(ctx, graded, s.bloom);
        }
        drawVignette(ctx, w, h, s.vignette);
        if (!options?.preview) {
          drawNoise(ctx, w, h, s.grain);
        }
      }
    },
    [],
  );

  /**
   * 背景画布缓存。
   *
   * 背景本身在「拖动人物」时是不变的，但它每帧都要重画一次（fit + 亮度/饱和度/景深）。
   * 拾取光源时更是每次点击都会重新合成一遍。抽成一个带缓存的取用口，两条路径共用。
   */
  const getBackgroundCanvas = useCallback(
    (w: number, h: number, bg: ImageAsset, s: Settings) => {
      const key = [
        bg.url,
        w,
        h,
        s.bgFit,
        s.bgBlur.toFixed(3),
        s.bgBrightness.toFixed(4),
        s.bgSaturation.toFixed(4),
      ].join("|");
      const cached = backgroundCanvasCacheRef.current;
      if (cached?.key === key) return cached.canvas;
      const canvas = buildBackgroundCanvas(w, h, bg, s, false);
      backgroundCanvasCacheRef.current = { key, canvas };
      return canvas;
    },
    [buildBackgroundCanvas],
  );

  const renderScene = useCallback(
    (
      target: HTMLCanvasElement,
      bg: ImageAsset,
      fg: ImageAsset | null,
      s: Settings,
      t: Transform,
      options?: { rawComposite?: boolean; preview?: boolean },
    ) => {
      const w = target.width;
      const h = target.height;

      const bgCanvas = getBackgroundCanvas(w, h, bg, s);

      const displayCanvas = canvasRef.current;
      const cssW = displayCanvas
        ? parseFloat(displayCanvas.style.width) || displayCanvas.clientWidth || w
        : w;
      const scaleFactor = w / Math.max(1, cssW);

      /*
       * 拖动时冻结环境采样。
       *
       * 环境色是「按人物当前所在区域采样背景」得到的，所以人物一移动，采样区域
       * 就跟着动，量化后几乎每帧都会落到新的档位；而它参与了 processedKey，
       * 于是每帧都会重新执行整套逐像素重照明 —— 实测一帧要几百毫秒。
       *
       * 交互期间沿用上一次的环境值，processedKey 保持稳定，缓存的人物图层可以
       * 直接复用；松手后再做一次完整重算。
       */
      const ambient =
        options?.preview && frozenAmbientRef.current
          ? frozenAmbientRef.current
          : analyzeAmbient(bgCanvas, t, fg, scaleFactor);
      if (!options?.preview) ambientRef.current = ambient;

      composeScene(target, bgCanvas, fg, s, t, ambient, scaleFactor, {
        rawComposite: options?.rawComposite,
        preview: options?.preview,
        lightPatches,
      });

      return ambient;
    },
    [analyzeAmbient, composeScene, getBackgroundCanvas, lightPatches],
  );

  useEffect(() => {
    processedPersonRef.current = null;
    processedPersonKeyRef.current = "";
  }, [
    person,
    settings.personBrightness,
    settings.personContrast,
    settings.personSaturation,
    settings.personWarmth,
    settings.personBlur,
    settings.edgeSoftness,
    settings.ambientTint,
    settings.ambientHaze,
    settings.ambientSpread,
    settings.lightStrength,
    settings.lightAngle,
    settings.lightSoftness,
    settings.lightCoverage,
    settings.lightWarmth,
    settings.lightLift,
    settings.relightStrength,
    settings.volumeDepth,
    settings.wrapLight,
    settings.edgeLight,
    settings.backShade,
    settings.faceShadowStrength,
    settings.faceShadowSoftness,
    settings.faceShadowThreshold,
    settings.keyMode,
    settings.keyTolerance,
    settings.keyFeather,
    settings.edgeDecontaminate,
    settings.edgeChoke,
  ]);

  useEffect(() => {
    return () => {
      if (patchControlFrameRef.current !== null) {
        cancelAnimationFrame(patchControlFrameRef.current);
      }
      if (patchMoveFrameRef.current !== null) {
        cancelAnimationFrame(patchMoveFrameRef.current);
      }
      pendingPatchControlRef.current = null;
      pendingPatchMoveRef.current = null;
    };
  }, []);

  const beginInteraction = useCallback(() => {
    if (interactingRef.current) return;
    interactingRef.current = true;
    // 沿用上一次的环境采样值：否则拖动时采样区域跟着人物移动、量化后不断换档，
    // 人物图层缓存会一直失效，等于每帧重跑一次逐像素重照明。
    frozenAmbientRef.current = ambientRef.current;
  }, []);

  const endInteraction = useCallback(() => {
    if (!interactingRef.current) return;
    interactingRef.current = false;
    frozenAmbientRef.current = null;
    // 触发一次完整质量渲染：把交互期间降掉的分辨率、泛光和环境重采样补回来。
    setInteractionTick((v) => v + 1);
  }, []);

  // 兜底：指针在任何地方松开都要结束交互，避免一直卡在低质量预览。
  useEffect(() => {
    const finish = () => endInteraction();
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    window.addEventListener("blur", finish);
    return () => {
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      window.removeEventListener("blur", finish);
    };
  }, [endInteraction]);

  // 状态镜像，供上面的交互回调与非 React 回调读取。
  useEffect(() => {
    backgroundRef.current = background;
  }, [background]);

  useEffect(() => {
    personRef.current = person;
  }, [person]);

  useEffect(() => {
    lightPatchesRef.current = lightPatches;
  }, [lightPatches]);

  useEffect(() => {
    renderInputRef.current = {
      background,
      person,
      settings,
      transform,
      showRawComposite,
    };
  });

  /**
   * 把渲染合并到动画帧。
   *
   * 拖动人物时 pointermove 的触发频率远高于屏幕刷新率，合并之前每个事件都会
   * 完整跑一遍合成；合并之后一帧最多合成一次，且永远用的是最新输入。
   */
  useEffect(() => {
    if (!background) return;
    if (renderFrameRef.current !== null) return; // 本帧已经排好

    renderFrameRef.current = requestAnimationFrame(() => {
      renderFrameRef.current = null;
      const canvas = canvasRef.current;
      const input = renderInputRef.current;
      if (!canvas || !input.background) return;

      const ambient = renderScene(
        canvas,
        input.background,
        input.person,
        normalizeSettings(input.settings),
        input.transform,
        {
          rawComposite: input.showRawComposite,
          preview: interactingRef.current,
        },
      );

      const hex = rgbToHex(ambient.r, ambient.g, ambient.b);
      setAmbientColor((old) => (old === hex ? old : hex));
    });
  }, [
    background,
    person,
    settings,
    transform,
    showRawComposite,
    renderScene,
    interactionTick,
  ]);

  useEffect(
    () => () => {
      if (renderFrameRef.current !== null) {
        cancelAnimationFrame(renderFrameRef.current);
        renderFrameRef.current = null;
      }
    },
    [],
  );

  const resetCharacter = useCallback(() => {
    pushHistory("reset-transform");
    const canvas = canvasRef.current;
    if (!canvas || !person) return;

    const cssW = parseFloat(canvas.style.width) || canvas.clientWidth || 900;
    const cssH = parseFloat(canvas.style.height) || canvas.clientHeight || 650;

    /*
     * 按「实际内容」而不是「整张图片」摆放。
     *
     * 抠图 PNG 的四边经常留着一大圈透明像素，直接按图片高度算尺寸会让同一个人
     * 时大时小，落点也会浮在半空。这里先量出内容包围盒，让内容高度占画布 66%，
     * 内容底边落在画布 88% 处，看上去就是站在地面上。
     */
    const b = measurePersonBounds(person, normalizeSettings(settingsRef.current));
    const contentH = Math.max(0.05, b.height);
    const scale = (cssH * 0.66) / Math.max(1, person.height * contentH);

    const contentCenterX = ((b.left + b.right) / 2 - 0.5) * person.width * scale;
    const contentBottom = (b.bottom - 0.5) * person.height * scale;

    setTransform({
      x: cssW * 0.54 - contentCenterX,
      y: cssH * 0.88 - contentBottom,
      scale,
      rotation: 0,
      flipX: false,
    });
  }, [person, pushHistory]);

  useEffect(() => {
    if (!person) return;
    const id = requestAnimationFrame(resetCharacter);
    return () => cancelAnimationFrame(id);
  }, [person, resetCharacter]);

  const autoBlend = useCallback(() => {
    if (!background || !person || !canvasRef.current) {
      notify("先上传现实场景和人物图片");
      return;
    }

    pushHistory("auto-blend");

    const canvas = canvasRef.current;
    const bgCanvas = getBackgroundCanvas(
      canvas.width,
      canvas.height,
      background,
      normalizeSettings(settingsRef.current),
    );

    const cssW = parseFloat(canvas.style.width) || canvas.clientWidth || 1;
    const cssH = parseFloat(canvas.style.height) || canvas.clientHeight || 1;
    const sx = bgCanvas.width / cssW;
    const sy = bgCanvas.height / cssH;

    const ambient = analyzeAmbient(
      bgCanvas,
      transformRef.current,
      person,
      (sx + sy) / 2,
    );

    const lightInfo = analyzeDirectionalLight(
      bgCanvas,
      transformRef.current.x * sx,
      transformRef.current.y * sy,
      Math.max(140, person.width * transformRef.current.scale * sx * 1.35),
      Math.max(180, person.height * transformRef.current.scale * sy * 1.18),
    );

    const personCanvas = document.createElement("canvas");
    const max = 720;
    const ratio = Math.min(1, max / Math.max(person.width, person.height));
    personCanvas.width = Math.max(2, Math.round(person.width * ratio));
    personCanvas.height = Math.max(2, Math.round(person.height * ratio));
    const pctx = personCanvas.getContext("2d")!;
    pctx.drawImage(person.img, 0, 0, personCanvas.width, personCanvas.height);
    const p = sampleCanvas(personCanvas, undefined, true);

    const brightness = clamp((ambient.l + 0.08) / Math.max(0.12, p.l), 0.68, 1.08);
    const sat = clamp((ambient.s + 0.22) / Math.max(0.18, p.s + 0.08), 0.72, 1.08);
    const warmth = clamp(colorTemperature(ambient.r, ambient.b) * 0.85, -0.36, 0.36);

    setSettings((prev) => ({
      ...prev,
      personBrightness: brightness,
      personContrast: ambient.l < 0.35 ? 1.02 : 0.96,
      personSaturation: sat,
      personWarmth: warmth,
      personBlur: clamp(0.18 + (1 - ambient.l) * 0.35, 0.18, 0.58),
      edgeSoftness: clamp(0.48 + (1 - ambient.l) * 0.42, 0.45, 1.0),
      ambientTint: clamp(0.18 + Math.abs(warmth) * 0.42, 0.18, 0.38),
      ambientHaze: clamp((1 - ambient.l) * 0.08, 0.025, 0.1),
      lightStrength: clamp(0.10 + lightInfo.contrast * 0.9, 0.10, 0.38),
      lightAngle: lightInfo.angle,
      lightSoftness: clamp(0.78 - lightInfo.contrast * 0.75, 0.28, 0.78),
      lightCoverage: clamp(0.62 - lightInfo.contrast * 0.35, 0.38, 0.68),
      lightWarmth: clamp(
        colorTemperature(lightInfo.color.r, lightInfo.color.b) * 0.85,
        -0.45,
        0.45,
      ),
      lightLift: clamp(lightInfo.color.l * 0.09, 0.025, 0.085),
      relightStrength: clamp(0.38 + lightInfo.contrast * 0.9, 0.38, 0.72),
      volumeDepth: clamp(0.56 + lightInfo.contrast * 0.35, 0.56, 0.82),
      wrapLight: clamp(0.38 - lightInfo.contrast * 0.32, 0.14, 0.38),
      edgeLight: clamp(0.18 + lightInfo.contrast * 0.82, 0.18, 0.56),
      // 一键融入是出成品的动作，顺手把抠图残留的边缘污染清掉
      edgeDecontaminate:
        settingsRef.current.edgeDecontaminate > 0.01
          ? settingsRef.current.edgeDecontaminate
          : 0.7,
      backShade: clamp(0.12 + lightInfo.contrast * 0.5, 0.12, 0.34),
      shadowOpacity: clamp(0.16 + (1 - ambient.l) * 0.24, 0.18, 0.38),
      shadowBlur: ambient.l < 0.38 ? 25 : 18,
      contactShadow: clamp(0.18 + (1 - ambient.l) * 0.16, 0.2, 0.34),
      rimLight: clamp(ambient.s * 0.22 + Math.abs(warmth) * 0.2, 0.035, 0.18),
      overallExposure: clamp(0.9 + ambient.l * 0.13, 0.9, 0.99),
      overallSaturation: clamp(0.91 + ambient.s * 0.12, 0.91, 1.0),
      overallWarmth: warmth * 0.28,
      grain: 0.018 + (1 - ambient.l) * 0.015,
      vignette: 0.16 + (1 - ambient.l) * 0.1,
      bloom: ambient.l < 0.35 ? 0.08 : 0.035,

      // 环境色按四角色场铺开；光是暗场景时把背光开出来，人物更容易从暗背景里站出来。
      ambientSpread: clamp(0.6 + ambient.s * 0.5, 0.6, 1),
      shadowLength: clamp(0.4 + (1 - ambient.l) * 0.5, 0.4, 0.9),
      shadowSkew: clamp(0.3 + lightInfo.contrast * 1.4, 0.3, 0.8),
      backLight: clamp((1 - ambient.l) * 0.22, 0.03, 0.26),
      backLightSize: ambient.l < 0.4 ? 34 : 24,
      backLightColor: rgbToHex(
        clamp(lightInfo.color.r + (lightInfo.color.r > lightInfo.color.b ? 18 : -10), 0, 255),
        clamp(lightInfo.color.g, 0, 255),
        clamp(lightInfo.color.b + (lightInfo.color.b > lightInfo.color.r ? 18 : -10), 0, 255),
      ),

    }));
    notify("已匹配环境色、明暗与局部光照方向");
  }, [
    analyzeAmbient,
    background,
    getBackgroundCanvas,
    notify,
    person,
    pushHistory,
  ]);


  const resetAllAdjustments = useCallback(() => {
    pushHistory("reset-all");
    setSettings(DEFAULT_SETTINGS);
    setShowRawComposite(false);
    setPickLightMode(false);
    setPickPatchColorMode(false);
    setLightPoint(null);
    setLightPatches([]);
    setActiveLightPatchId(null);
    setLightPatchEditMode(false);
    setPersonSelected(Boolean(person));
    if (person) {
      requestAnimationFrame(resetCharacter);
    }
    notify("已恢复默认融合参数");
  }, [notify, person, pushHistory, resetCharacter]);

  const canvasPointToPersonUV = useCallback(
    (px: number, py: number) => {
      if (!person) return null;
      const t = transformRef.current;
      const dx = px - t.x;
      const dy = py - t.y;
      const rad = (-t.rotation * Math.PI) / 180;
      let localX = dx * Math.cos(rad) - dy * Math.sin(rad);
      const localY = dx * Math.sin(rad) + dy * Math.cos(rad);
      if (t.flipX) localX = -localX;
      const denomX = Math.max(1e-5, person.width * t.scale);
      const denomY = Math.max(1e-5, person.height * t.scale);
      return {
        u: localX / denomX + 0.5,
        v: localY / denomY + 0.5,
      };
    },
    [person],
  );

  const pointInsidePerson = useCallback(
    (px: number, py: number, padding = 18) => {
      if (!person) return false;
      const t = transformRef.current;
      const dx = px - t.x;
      const dy = py - t.y;
      const rad = (-t.rotation * Math.PI) / 180;
      const localX = dx * Math.cos(rad) - dy * Math.sin(rad);
      const localY = dx * Math.sin(rad) + dy * Math.cos(rad);
      return (
        Math.abs(localX) <= (person.width * t.scale) / 2 + padding &&
        Math.abs(localY) <= (person.height * t.scale) / 2 + padding
      );
    },
    [person],
  );

  const hitLightPatch = useCallback(
    (u: number, v: number) => {
      if (!person) return null;
      const scale = Math.max(0.0001, transformRef.current.scale);
      const hitPadding = 10 / scale;
      for (let i = lightPatches.length - 1; i >= 0; i--) {
        const patch = lightPatches[i];
        const dx = (u - patch.x) * person.width;
        const dy = (v - patch.y) * person.height;
        const rad = (-patch.rotation * Math.PI) / 180;
        const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
        const ry = dx * Math.sin(rad) + dy * Math.cos(rad);
        const halfW = patch.width * person.width / 2;
        const halfH = patch.height * person.height / 2;
        if (Math.abs(rx) <= halfW + hitPadding && Math.abs(ry) <= halfH + hitPadding) {
          return patch;
        }
      }
      return null;
    },
    [lightPatches, person],
  );

  const hitLightPatchHandle = useCallback(
    (u: number, v: number, patch: LightPatch | null) => {
      if (!patch || !person) return null;
      const scale = Math.max(0.0001, transformRef.current.scale);
      const dx = (u - patch.x) * person.width;
      const dy = (v - patch.y) * person.height;
      const rad = (-patch.rotation * Math.PI) / 180;
      const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
      const ry = dx * Math.sin(rad) + dy * Math.cos(rad);
      const halfW = patch.width * person.width / 2;
      const halfH = patch.height * person.height / 2;
      const hitRadius = 12 / scale;
      const rotateGap = 24 / scale;

      if (Math.hypot(rx, ry - (-halfH - rotateGap)) <= hitRadius * 1.15) {
        return { mode: "rotate" as const };
      }

      const corners = [
        { cornerX: -1, cornerY: -1 },
        { cornerX: 1, cornerY: -1 },
        { cornerX: 1, cornerY: 1 },
        { cornerX: -1, cornerY: 1 },
      ];
      for (const corner of corners) {
        const hx = halfW * corner.cornerX;
        const hy = halfH * corner.cornerY;
        if (Math.hypot(rx - hx, ry - hy) <= hitRadius) {
          return { mode: "resize" as const, ...corner };
        }
      }
      return null;
    },
    [person],
  );

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    if ((pickLightMode || pickPatchColorMode) && background) {
      const canvas = canvasRef.current;
      if (canvas) {
        const dprX = canvas.width / Math.max(1, rect.width);
        const dprY = canvas.height / Math.max(1, rect.height);
        const bgCanvas = getBackgroundCanvas(
          canvas.width,
          canvas.height,
          background,
          normalizeSettings(settingsRef.current),
        );
        const lightSample = sampleLightSourceColor(
          bgCanvas,
          px * dprX,
          py * dprY,
          Math.max(12, Math.round(22 * dprX)),
        );

        const dx = px - transformRef.current.x;
        const dy = py - transformRef.current.y;
        const angle = (Math.atan2(-dy, -dx) * 180) / Math.PI;
        const warm = clamp(
          colorTemperature(lightSample.r, lightSample.b) * 0.95,
          -0.5,
          0.5,
        );
        const intensity = clamp(
          0.16 + lightSample.l * 0.38 + lightSample.s * 0.12,
          0.14,
          0.62,
        );

        const pickedHex = rgbToHex(lightSample.r, lightSample.g, lightSample.b);

        if (pickPatchColorMode && activeLightPatch) {
          updateLightPatch(activeLightPatch.id, { color: pickedHex });
          setPickPatchColorMode(false);
          notify(`已为${activeLightPatch.name}拾取环境颜色`);
          return;
        }

        setLightPoint({ x: px, y: py });
        setSettings((prev) => ({
          ...DEFAULT_SETTINGS,
          ...prev,
          lightAngle: angle,
          lightWarmth: warm,
          lightStrength: intensity,
          relightStrength: clamp(0.34 + intensity * 0.55, 0.38, 0.72),
          edgeLight: clamp(0.16 + intensity * 0.5, 0.18, 0.55),
          shadowX: clamp((-dx / Math.max(1, rect.width)) * 90, -65, 65),
          shadowY: clamp((-dy / Math.max(1, rect.height)) * 70 + 14, -20, 80),
        }));
        setPickLightMode(false);
        notify("已采样光源位置、颜色和方向");
      }
      return;
    }

    if (!person) return;

    if (lightPatchEditMode && lightPatches.length) {
      const uv = canvasPointToPersonUV(px, py);
      if (uv) {
        const selectedPatch = activeLightPatch;
        const handle = hitLightPatchHandle(uv.u, uv.v, selectedPatch);
        if (selectedPatch && handle) {
          setActiveLightPatchId(selectedPatch.id);
          setPersonSelected(false);
          let anchorX = selectedPatch.x;
          let anchorY = selectedPatch.y;
          let cornerX = 1;
          let cornerY = 1;
          if (handle.mode === "resize") {
            cornerX = handle.cornerX;
            cornerY = handle.cornerY;
            const theta = (selectedPatch.rotation * Math.PI) / 180;
            const halfW = (selectedPatch.width * person.width) / 2;
            const halfH = (selectedPatch.height * person.height) / 2;
            const localOppX = -cornerX * halfW;
            const localOppY = -cornerY * halfH;
            const anchorPxX =
              selectedPatch.x * person.width +
              localOppX * Math.cos(theta) -
              localOppY * Math.sin(theta);
            const anchorPxY =
              selectedPatch.y * person.height +
              localOppX * Math.sin(theta) +
              localOppY * Math.cos(theta);
            anchorX = anchorPxX / Math.max(1, person.width);
            anchorY = anchorPxY / Math.max(1, person.height);
          }
          lightPatchDragRef.current = {
            active: true,
            pointerId: e.pointerId,
            id: selectedPatch.id,
            mode: handle.mode,
            offsetU: 0,
            offsetV: 0,
            startWidth: selectedPatch.width,
            startHeight: selectedPatch.height,
            startRotation: selectedPatch.rotation,
            startX: selectedPatch.x,
            startY: selectedPatch.y,
            cornerX,
            cornerY,
            anchorX,
            anchorY,
          };
          beginInteraction();
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // pointerId 失效（合成事件、设备切换）时会抛错，不能让它打断拖动
          }
          return;
        }

        const hit = hitLightPatch(uv.u, uv.v);
        if (hit) {
          setActiveLightPatchId(hit.id);
          setPersonSelected(false);
          lightPatchDragRef.current = {
            active: true,
            pointerId: e.pointerId,
            id: hit.id,
            mode: "move",
            offsetU: uv.u - hit.x,
            offsetV: uv.v - hit.y,
            startWidth: hit.width,
            startHeight: hit.height,
            startRotation: hit.rotation,
            startX: hit.x,
            startY: hit.y,
            cornerX: 1,
            cornerY: 1,
            anchorX: hit.x,
            anchorY: hit.y,
          };
          beginInteraction();
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // pointerId 失效（合成事件、设备切换）时会抛错，不能让它打断拖动
          }
          return;
        }

        // 未点中光斑：先取消光斑框；如果点在人物上则立即切回人物图层。
        setActiveLightPatchId(null);
        setPickPatchColorMode(false);
        if (pointInsidePerson(px, py)) {
          setPersonSelected(true);
          dragRef.current = {
            active: true,
            pointerId: e.pointerId,
            startX: px,
            startY: py,
            originX: transformRef.current.x,
            originY: transformRef.current.y,
          };
          beginInteraction();
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // pointerId 失效（合成事件、设备切换）时会抛错，不能让它打断拖动
          }
          setIsDragging(true);
        } else {
          setPersonSelected(false);
        }
      }
      return;
    }

    if (!pointInsidePerson(px, py)) {
      setPersonSelected(false);
      setActiveLightPatchId(null);
      return;
    }

    setPersonSelected(true);
    setActiveLightPatchId(null);
    pushHistory("transform");
    dragRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: px,
      startY: py,
      originX: transformRef.current.x,
      originY: transformRef.current.y,
    };
    beginInteraction();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // 同上
    }
    setIsDragging(true);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const ld = lightPatchDragRef.current;
    if (ld.active && ld.pointerId === e.pointerId) {
      const rect = e.currentTarget.getBoundingClientRect();
      const uv = canvasPointToPersonUV(e.clientX - rect.left, e.clientY - rect.top);
      if (uv && person) {
        if (ld.mode === "move") {
          queueLightPatchUpdate(ld.id, {
            x: clamp(uv.u - ld.offsetU, -0.25, 1.25),
            y: clamp(uv.v - ld.offsetV, -0.25, 1.25),
          });
        } else if (ld.mode === "rotate") {
          const dx = (uv.u - ld.startX) * person.width;
          const dy = (uv.v - ld.startY) * person.height;
          const pointerAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
          queueLightPatchUpdate(ld.id, {
            rotation: ((pointerAngle + 90 + 540) % 360) - 180,
          });
        } else {
          // 角点缩放：固定对角点，当前角跟随指针，宽高独立变化；
          // 中心随两个对角点的中点移动，手感更接近真正的图形编辑器。
          const pointerX = uv.u * person.width;
          const pointerY = uv.v * person.height;
          const anchorX = ld.anchorX * person.width;
          const anchorY = ld.anchorY * person.height;
          const vx = pointerX - anchorX;
          const vy = pointerY - anchorY;
          const theta = (ld.startRotation * Math.PI) / 180;
          const localW = vx * Math.cos(theta) + vy * Math.sin(theta);
          const localH = -vx * Math.sin(theta) + vy * Math.cos(theta);
          queueLightPatchUpdate(ld.id, {
            x: clamp(((anchorX + pointerX) * 0.5) / Math.max(1, person.width), -0.25, 1.25),
            y: clamp(((anchorY + pointerY) * 0.5) / Math.max(1, person.height), -0.25, 1.25),
            width: clamp(Math.abs(localW) / Math.max(1, person.width), 0.03, 1.6),
            height: clamp(Math.abs(localH) / Math.max(1, person.height), 0.02, 1.6),
          });
        }
      }
      return;
    }
    const d = dragRef.current;
    if (!d.active || d.pointerId !== e.pointerId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setTransform((prev) => ({
      ...prev,
      x: d.originX + (x - d.startX),
      y: d.originY + (y - d.startY),
    }));
  };

  const endPointer = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (lightPatchDragRef.current.pointerId === e.pointerId) {
      lightPatchDragRef.current.active = false;
      if (patchMoveFrameRef.current !== null) {
        cancelAnimationFrame(patchMoveFrameRef.current);
        patchMoveFrameRef.current = null;
      }
      const pending = pendingPatchMoveRef.current;
      pendingPatchMoveRef.current = null;
      if (pending) updateLightPatch(pending.id, pending.patch);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
    if (dragRef.current.pointerId === e.pointerId) {
      dragRef.current.active = false;
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }

    // 松手后回到全分辨率合成（泛光、颗粒与环境重采样一并补回来）
    endInteraction();
  };

  const wheelEndTimerRef = useRef<number | null>(null);

  const onWheel = (e: ReactWheelEvent<HTMLCanvasElement>) => {
    if (!person || lightPatchEditMode) return;
    e.preventDefault();

    // 滚轮缩放同样走交互降级，停止滚动 180ms 后再做一次完整渲染。
    pushHistory("transform");
    beginInteraction();
    if (wheelEndTimerRef.current !== null) {
      window.clearTimeout(wheelEndTimerRef.current);
    }
    wheelEndTimerRef.current = window.setTimeout(() => {
      wheelEndTimerRef.current = null;
      endInteraction();
    }, 180);

    const factor = e.deltaY > 0 ? 0.94 : 1.06;
    setTransform((prev) => ({
      ...prev,
      scale: clamp(prev.scale * factor, 0.02, 5),
    }));
  };

  useEffect(
    () => () => {
      if (wheelEndTimerRef.current !== null) {
        window.clearTimeout(wheelEndTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;

      // 撤销 / 重做：滑杆（range）和取色器（color）获得焦点时也要能撤销，
      // 只有真正在输入文字时才让浏览器自己处理。
      const isTextEntry =
        tag === "TEXTAREA" ||
        (tag === "INPUT" &&
          ![
            "range",
            "color",
            "checkbox",
            "radio",
            "button",
            "submit",
          ].includes((target as HTMLInputElement).type));

      if ((e.metaKey || e.ctrlKey) && !isTextEntry) {
        const key = e.key.toLowerCase();
        if (key === "z") {
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
          return;
        }
        if (key === "y") {
          e.preventDefault();
          redo();
          return;
        }
      }

      if (!person) return;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

      const step = e.shiftKey ? 10 : 2;
      // 方向键微调也记进撤销栈：同一个 label 在 700ms 内会被合并成一步，
      // 所以连按不会把历史刷爆，但「按几下再撤销」能一次退回原处。
      const nudge = (patch: (t: Transform) => Partial<Transform>) => {
        e.preventDefault();
        pushHistory("nudge");
        setTransform((p) => ({ ...p, ...patch(p) }));
      };
      if (e.key === "ArrowLeft") {
        nudge((p) => ({ x: p.x - step }));
      } else if (e.key === "ArrowRight") {
        nudge((p) => ({ x: p.x + step }));
      } else if (e.key === "ArrowUp") {
        nudge((p) => ({ y: p.y - step }));
      } else if (e.key === "ArrowDown") {
        nudge((p) => ({ y: p.y + step }));
      } else if (e.key === "=" || e.key === "+") {
        nudge((p) => ({ scale: clamp(p.scale * 1.04, 0.02, 5) }));
      } else if (e.key === "-" || e.key === "_") {
        nudge((p) => ({ scale: clamp(p.scale * 0.96, 0.02, 5) }));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [person, pushHistory, redo, undo]);

  const exportImage = useCallback(async () => {
    if (exporting) return;
    if (!background) {
      notify("请先上传现实场景");
      return;
    }

    // 4K 导出会在主线程上跑好几百毫秒的合成。先把「导出中」这一帧画出来，
    // 否则点下去到文件落地之间界面完全是死的，用户会以为没反应。
    setExporting(true);
    notify("正在合成导出…");
    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      // 后台标签页里 rAF 根本不会触发，所以必须有超时兜底。
      requestAnimationFrame(finish);
      window.setTimeout(finish, 120);
    });

    const display = canvasRef.current;
    if (!display) return;

    const safeSettings = normalizeSettings(settings);
    const cssW = parseFloat(display.style.width) || display.clientWidth || 1;
    const cssH = parseFloat(display.style.height) || display.clientHeight || 1;

    // 「完整显示」时，编辑画布为了居中预览可能产生左右/上下留黑。
    // 导出不应该把这些舞台留白一起保存，所以只导出真实背景图所在的内容矩形。
    // 「铺满画布」本身没有留黑，继续按整个编辑画布导出，保持所见即所得。
    const previewBgRect = fitRect(
      background.width,
      background.height,
      cssW,
      cssH,
      safeSettings.bgFit,
    );
    const cropRect =
      safeSettings.bgFit === "完整显示"
        ? {
            x: previewBgRect.x,
            y: previewBgRect.y,
            w: previewBgRect.w,
            h: previewBgRect.h,
          }
        : { x: 0, y: 0, w: cssW, h: cssH };

    const aspect = cropRect.w / Math.max(1, cropRect.h);
    let longEdge =
      safeSettings.exportSize === "1920px"
        ? 1920
        : safeSettings.exportSize === "2560px"
          ? 2560
          : safeSettings.exportSize === "3840px"
            ? 3840
            : Math.min(4096, Math.max(background.width, background.height));

    longEdge = Math.max(720, longEdge);

    let width: number;
    let height: number;
    if (aspect >= 1) {
      width = Math.round(longEdge);
      height = Math.round(longEdge / aspect);
    } else {
      height = Math.round(longEdge);
      width = Math.round(longEdge * aspect);
    }

    const maxPixels = 18_000_000;
    if (width * height > maxPixels) {
      const ratio = Math.sqrt(maxPixels / (width * height));
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    const out = document.createElement("canvas");
    out.width = Math.max(2, width);
    out.height = Math.max(2, height);

    // 坐标不是从整个黑色舞台映射，而是从「真实背景内容区域」映射。
    // 因此人物在竖图里的相对位置与预览保持一致。
    const sx = width / Math.max(1, cropRect.w);
    const sy = height / Math.max(1, cropRect.h);
    const uniformScale = (sx + sy) / 2;

    const bgCanvas = buildBackgroundCanvas(
      width,
      height,
      background,
      // 完整显示导出时，输出画布已经与背景图同宽高比，不会再产生黑边。
      safeSettings,
      false,
    );

    const exportTransform: Transform = {
      ...transform,
      x: (transform.x - cropRect.x) * sx,
      y: (transform.y - cropRect.y) * sy,
      scale: transform.scale * uniformScale,
    };

    // 和预览走完全同一条合成路径：exportMode 会让它跳过缓存、按导出分辨率重算，
    // 并保留泛光/颗粒这些交互期被降掉的修饰层。
    const ambient = analyzeAmbient(bgCanvas, exportTransform, person, 1);
    composeScene(
      out,
      bgCanvas,
      person,
      safeSettings,
      exportTransform,
      ambient,
      1,
      { exportMode: true, preview: false, lightPatches },
    );

    out.toBlob(
      (blob) => {
        setExporting(false);
        if (!blob) {
          notify("导出失败，请重试");
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `入画-${Date.now()}.png`;
        a.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1200);
        notify(`PNG 已导出 · ${width} × ${height}`);
      },
      "image/png",
      1,
    );
  }, [
    background,
    person,
    settings,
    transform,
    buildBackgroundCanvas,
    analyzeAmbient,
    composeScene,
    exporting,
    lightPatches,
    notify,
  ]);

  const toggleFullscreen = async () => {
    const el = stageRef.current?.parentElement;
    if (!el) return;
    try {
      if (!document.fullscreenElement) await el.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      notify("当前浏览器无法进入全屏");
    }
  };

  const hasBoth = Boolean(background && person);

  const interaction = useMemo(
    () => ({ begin: beginInteraction, end: endInteraction }),
    [beginInteraction, endInteraction],
  );

  return (
    <div className="relative w-full overflow-hidden bg-[#101116]">
      <main
        className="blend-stage"
        style={{
          position: "relative",
          width: "100%",
          height: "calc(100dvh - var(--site-header-height, 60px))",
          minHeight: 620,
          overflow: "hidden",
          background: "#101116",
          color: "#fff",
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!dragOver) setDragOver(true);
        }}
        onDragLeave={(e) => {
          // 只有真正离开舞台才取消高亮，子元素之间移动不算。
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const files = Array.from(e.dataTransfer.files).filter((f) =>
            f.type.startsWith("image/"),
          );
          if (!files.length) return;
          if (!background) loadImage(files[0], "background");
          else if (!person) loadImage(files[0], "person");
          else loadImage(files[0], e.shiftKey ? "background" : "person");
        }}
      >
        <style>{`
          .blend-stage *,
          .blend-stage *::before,
          .blend-stage *::after { box-sizing: border-box; }
          .blend-stage button, .blend-stage input, .blend-stage select { font: inherit; }
          .blend-stage button { -webkit-tap-highlight-color: transparent; }
          .blend-stage button:disabled {
            opacity:.38 !important;
            cursor:not-allowed !important;
          }
          .blend-stage button:focus-visible,
          .blend-stage select:focus-visible,
          .blend-stage input:focus-visible {
            outline:2px solid rgba(244,190,177,.72);
            outline-offset:2px;
          }
          .blend-floating-breadcrumb {
            position:absolute;
            top:14px;
            left:16px;
            z-index:40;
            max-width:calc(100% - 400px);
            filter:drop-shadow(0 10px 28px rgba(0,0,0,.18));
          }
          .blend-floating-breadcrumb > * { margin:0 !important; }

          .blend-stage::before {
            content:"";
            position:absolute;
            inset:0 0 auto 0;
            height:128px;
            z-index:5;
            pointer-events:none;
            background:linear-gradient(180deg,rgba(6,7,10,.48),rgba(6,7,10,.14) 52%,transparent);
          }

          .toolbar::-webkit-scrollbar,
          .panel-scroll::-webkit-scrollbar { display:none; }
          .toolbar, .panel-scroll { scrollbar-width:none; }

          .range {
            appearance:none;
            -webkit-appearance:none;
            width:100%;
            height:4px;
            border-radius:999px;
            outline:none;
            background:linear-gradient(90deg,#f3a7b6 0%,#eec99d 100%);
            opacity:.88;
          }
          .range::-webkit-slider-thumb {
            appearance:none;
            -webkit-appearance:none;
            width:15px;
            height:15px;
            border-radius:50%;
            border:2px solid rgba(255,255,255,.88);
            background:#fff7f0;
            box-shadow:0 2px 12px rgba(0,0,0,.28);
            cursor:pointer;
          }
          .range::-moz-range-thumb {
            width:13px;
            height:13px;
            border-radius:50%;
            border:2px solid rgba(255,255,255,.88);
            background:#fff7f0;
            box-shadow:0 2px 12px rgba(0,0,0,.28);
            cursor:pointer;
          }

          .panel {
            position:absolute;
            z-index:24;
            top:14px;
            right:14px;
            width:352px;
            height:calc(100dvh - var(--site-header-height, 60px) - 28px);
            max-height:calc(100% - 28px);
            min-height:0;
            display:flex;
            flex-direction:column;
            overflow:hidden;
            border:1px solid rgba(255,255,255,.11);
            border-radius:20px;
            background:linear-gradient(180deg,rgba(23,23,29,.91),rgba(13,14,18,.89));
            box-shadow:0 24px 80px rgba(0,0,0,.32),inset 0 1px 0 rgba(255,255,255,.045);
            backdrop-filter:blur(22px) saturate(125%);
            -webkit-backdrop-filter:blur(22px) saturate(125%);
          }
          .panel > :not(.panel-scroll) {
            flex:0 0 auto;
          }
          .panel-scroll {
            flex:1 1 auto;
            min-height:0;
            max-height:none;
            overflow-x:hidden;
            overflow-y:auto;
            overscroll-behavior:contain;
            -webkit-overflow-scrolling:touch;
            touch-action:pan-y;
            scroll-padding-bottom:128px;
            padding:0 14px max(128px, calc(env(safe-area-inset-bottom) + 96px));
          }

          .canvas-wrap {
            position:absolute;
            inset:0;
            display:grid;
            place-items:center;
          }
          .scene-canvas {
            display:block;
            width:100%;
            height:100%;
            touch-action:none;
            cursor:grab;
          }
          .scene-canvas.dragging { cursor:grabbing; }

          .empty-grid {
            position:absolute;
            inset:0;
            z-index:8;
            display:grid;
            grid-template-columns:repeat(2,minmax(220px,340px));
            gap:14px;
            align-content:center;
            justify-content:center;
            padding:120px 390px 120px 30px;
            background:
              radial-gradient(circle at 35% 35%,rgba(244,168,182,.08),transparent 34%),
              radial-gradient(circle at 65% 65%,rgba(234,201,157,.07),transparent 34%);
          }
          .drop-card {
            min-height:210px;
            padding:22px;
            border-radius:24px;
            border:1px solid rgba(255,255,255,.11);
            background:rgba(255,255,255,.045);
            box-shadow:inset 0 1px 0 rgba(255,255,255,.04);
            backdrop-filter:blur(12px);
            cursor:pointer;
            transition:transform .18s ease,border-color .18s ease,background .18s ease;
          }
          .drop-card:hover {
            transform:translateY(-2px);
            border-color:rgba(245,190,178,.34);
            background:rgba(255,255,255,.065);
          }
          .tab-button {
            border:0;
            background:transparent;
            color:rgba(255,255,255,.46);
            padding:9px 8px;
            border-radius:10px;
            cursor:pointer;
            transition:.15s ease;
          }
          .tab-button.active {
            color:#fff;
            background:rgba(255,255,255,.08);
            box-shadow:inset 0 0 0 1px rgba(255,255,255,.06);
          }

          .toolbar {
            position:absolute;
            z-index:23;
            left:50%;
            bottom:14px;
            transform:translateX(-50%);
            display:flex;
            gap:5px;
            align-items:center;
            max-width:calc(100% - 390px);
            padding:6px;
            overflow:auto;
            border:1px solid rgba(255,255,255,.11);
            border-radius:16px;
            background:rgba(15,15,20,.72);
            box-shadow:0 16px 48px rgba(0,0,0,.25),inset 0 1px 0 rgba(255,255,255,.04);
            backdrop-filter:blur(18px) saturate(125%);
            -webkit-backdrop-filter:blur(18px) saturate(125%);
          }

          @media (max-width: 980px) {
            .panel {
              width:318px;
            }
            .blend-floating-breadcrumb { max-width:calc(100% - 344px); }
            .empty-grid { padding-right:340px; }
            .toolbar { max-width:calc(100% - 340px); left:calc((100% - 318px)/2); }
          }

          @media (max-width: 760px) {
            .blend-stage {
              min-height:720px !important;
            }
            .blend-floating-breadcrumb {
              top:8px !important;
              left:8px !important;
              right:8px !important;
              max-width:none !important;
            }
            .panel {
              left:8px !important;
              right:8px !important;
              top:auto !important;
              bottom:66px !important;
              width:auto !important;
              height:min(52dvh, calc(100dvh - 150px)) !important;
              max-height:min(52dvh, calc(100dvh - 150px)) !important;
              min-height:260px !important;
              border-radius:18px !important;
            }
            .panel-scroll {
              max-height:none !important;
              padding-bottom:max(132px, calc(env(safe-area-inset-bottom) + 104px)) !important;
              scroll-padding-bottom:132px;
            }
            .toolbar {
              left:8px !important;
              right:8px !important;
              bottom:8px !important;
              max-width:none !important;
              transform:none !important;
            }
            .empty-grid {
              grid-template-columns:1fr;
              align-content:start;
              padding:108px 12px 50vh;
            }
            .blend-stage::before { height:112px; }
            .drop-card { min-height:150px; }
          }
        `}</style>

        <div className="blend-floating-breadcrumb">
          <Breadcrumb />
        </div>

        <div className="canvas-wrap" ref={stageRef}>
          <canvas
            ref={canvasRef}
            className={`scene-canvas ${isDragging ? "dragging" : ""}`}
            style={{ cursor: pickLightMode || pickPatchColorMode ? "crosshair" : isDragging ? "grabbing" : person ? "grab" : "default" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
            onWheel={onWheel}
            onDoubleClick={() => {
              if (!lightPatchEditMode && person) resetCharacter();
            }}
          />
          {person && lightPatchEditMode && activeLightPatchId && lightPatches.filter((patch) => patch.id === activeLightPatchId).map((patch) => {
            const t = transform;
            let lx = (patch.x - 0.5) * person.width * t.scale;
            const ly = (patch.y - 0.5) * person.height * t.scale;
            if (t.flipX) lx = -lx;
            const rr = (t.rotation * Math.PI) / 180;
            const ox = lx * Math.cos(rr) - ly * Math.sin(rr);
            const oy = lx * Math.sin(rr) + ly * Math.cos(rr);
            const selected = patch.id === activeLightPatchId;
            const shapeRadius = patch.shape === "柔光" ? "999px" : "10px";
            const patchPreviewColor = patch.mode === "影" ? "#778092" : patch.color;
            return (
              <div
                key={patch.id}
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: t.x + ox,
                  top: t.y + oy,
                  width: Math.max(28, patch.width * person.width * t.scale),
                  height: Math.max(22, patch.height * person.height * t.scale),
                  transform: `translate(-50%, -50%) rotate(${t.rotation + (t.flipX ? -patch.rotation : patch.rotation)}deg)`,
                  transformOrigin: "center",
                  borderRadius: shapeRadius,
                  border: "1.5px solid rgba(255,247,224,.92)",
                  background: `linear-gradient(135deg,${patchPreviewColor}12,${patchPreviewColor}08)`,
                  boxShadow: `0 0 0 3px ${patchPreviewColor}12, 0 0 20px ${patchPreviewColor}22`,
                  pointerEvents: "none",
                  zIndex: 7,
                }}
              >
                {selected && (
                  <>
                    <span style={{ position: "absolute", left: 6, top: 5, fontSize: 9, color: "rgba(255,255,255,.9)", textShadow: "0 1px 4px rgba(0,0,0,.65)" }}>
                      {patch.name}
                    </span>
                    <span style={{ position: "absolute", left: "50%", top: -25, width: 1, height: 20, background: "rgba(255,247,224,.65)", transform: "translateX(-50%)" }} />
                    <span style={{ position: "absolute", left: "50%", top: -33, width: 13, height: 13, marginLeft: -6.5, borderRadius: 99, background: "#fff8e8", border: "1px solid rgba(20,20,24,.55)", boxShadow: `0 0 12px ${patchPreviewColor}` }} />
                    {[
                      { left: -5, top: -5 },
                      { right: -5, top: -5 },
                      { right: -5, bottom: -5 },
                      { left: -5, bottom: -5 },
                    ].map((pos, idx) => (
                      <span
                        key={idx}
                        style={{
                          position: "absolute",
                          width: 10,
                          height: 10,
                          borderRadius: 99,
                          background: "#fff8e8",
                          boxShadow: `0 0 12px ${patchPreviewColor}`,
                          border: "1px solid rgba(20,20,24,.55)",
                          ...pos,
                        }}
                      />
                    ))}
                  </>
                )}
              </div>
            );
          })}
          {lightPoint && (
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: lightPoint.x,
                top: lightPoint.y,
                width: 18,
                height: 18,
                marginLeft: -9,
                marginTop: -9,
                borderRadius: 99,
                border: "1px solid rgba(255,244,220,.92)",
                background: "rgba(255,216,154,.22)",
                boxShadow:
                  "0 0 0 5px rgba(255,205,137,.08), 0 0 28px rgba(255,196,112,.56)",
                pointerEvents: "none",
                zIndex: 6,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  left: 8,
                  top: 8,
                  width: 2,
                  height: 2,
                  borderRadius: 99,
                  background: "#fff7dd",
                }}
              />
            </div>
          )}
          {person && !showRawComposite && (personSelected || isDragging) && (
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: transform.x,
                top: transform.y,
                width: person.width * transform.scale,
                height: person.height * transform.scale,
                transform: `translate(-50%, -50%) rotate(${transform.rotation}deg)`,
                transformOrigin: "center",
                border: isDragging
                  ? "1px solid rgba(248,210,191,.64)"
                  : "1px solid rgba(255,255,255,.18)",
                borderRadius: 3,
                boxShadow: isDragging
                  ? "0 0 0 1px rgba(244,170,187,.10)"
                  : "none",
                pointerEvents: "none",
                transition: isDragging ? "none" : "border-color .15s ease",
              }}
            >
              {[
                ["-4px", "-4px"],
                ["calc(100% - 4px)", "-4px"],
                ["-4px", "calc(100% - 4px)"],
                ["calc(100% - 4px)", "calc(100% - 4px)"],
              ].map(([left, top], i) => (
                <span
                  key={i}
                  style={{
                    position: "absolute",
                    left,
                    top,
                    width: 8,
                    height: 8,
                    borderRadius: 99,
                    border: "1px solid rgba(255,255,255,.72)",
                    background: "rgba(24,24,29,.78)",
                    boxShadow: "0 2px 8px rgba(0,0,0,.24)",
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {dragOver && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 12,
              zIndex: 45,
              pointerEvents: "none",
              borderRadius: 24,
              border: "2px dashed rgba(244,190,177,.62)",
              background: "rgba(20,18,24,.42)",
              backdropFilter: "blur(3px)",
              WebkitBackdropFilter: "blur(3px)",
              display: "grid",
              placeItems: "center",
              color: "rgba(255,247,241,.92)",
              fontSize: 13,
              letterSpacing: ".04em",
            }}
          >
            松开即可载入图片
          </div>
        )}

        {!background && (
          <div className="empty-grid">
            <button
              type="button"
              className="drop-card"
              onClick={() => bgInputRef.current?.click()}
              style={{ textAlign: "left", color: "#fff" }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  display: "grid",
                  placeItems: "center",
                  background:
                    "linear-gradient(135deg,rgba(242,159,177,.17),rgba(235,198,144,.1))",
                  border: "1px solid rgba(255,255,255,.08)",
                  marginBottom: 28,
                }}
              >
                {Icons.photo}
              </div>
              <div style={{ fontSize: 17, fontWeight: 620, marginBottom: 8 }}>
                上传现实场景
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,.42)",
                  fontSize: 12,
                  lineHeight: 1.7,
                }}
              >
                街道、房间、车站、夜景、咖啡店……
                <br />
                JPG / PNG / WebP，所有处理仅在本地完成。
              </div>
            </button>

            <button
              type="button"
              className="drop-card"
              onClick={() => personInputRef.current?.click()}
              style={{ textAlign: "left", color: "#fff" }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  display: "grid",
                  placeItems: "center",
                  background:
                    "linear-gradient(135deg,rgba(172,179,255,.14),rgba(241,169,190,.1))",
                  border: "1px solid rgba(255,255,255,.08)",
                  marginBottom: 28,
                }}
              >
                {Icons.person}
              </div>
              <div style={{ fontSize: 17, fontWeight: 620, marginBottom: 8 }}>
                上传二次元人物
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,.42)",
                  fontSize: 12,
                  lineHeight: 1.7,
                }}
              >
                推荐透明背景 PNG。
                <br />
                普通图片也可使用「自动去纯色」辅助处理。
              </div>
            </button>
          </div>
        )}

        {/* 滑杆按下时切到低分辨率预览，见 beginInteraction */}
        <InteractionContext.Provider value={interaction}>
        <aside className="panel">
          <div
            style={{
              padding: "15px 16px 13px",
              borderBottom: "1px solid rgba(255,255,255,.075)",
              background:
                "linear-gradient(180deg,rgba(255,255,255,.026),transparent)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 14,
                    fontWeight: 650,
                    letterSpacing: ".02em",
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 99,
                      background: ambientColor,
                      boxShadow: `0 0 14px ${ambientColor}`,
                    }}
                  />
                  入画 · 光影融合工作室
                </div>
                <div
                  style={{
                    marginTop: 5,
                    color: "rgba(255,255,255,.34)",
                    fontSize: 10.5,
                  }}
                >
                  环境取色 · {ambientColor.toUpperCase()}
                </div>
              </div>

              <button
                type="button"
                onClick={autoBlend}
                disabled={!hasBoth}
                title="分析人物周围的环境光线和色彩，并生成融合参数"
                style={{
                  ...smallAction,
                  opacity: hasBoth ? 1 : 0.4,
                  cursor: hasBoth ? "pointer" : "default",
                  background:
                    "linear-gradient(135deg,rgba(242,158,180,.16),rgba(236,198,142,.12))",
                  borderColor: "rgba(244,194,174,.2)",
                  color: "#fff4ee",
                }}
              >
                {Icons.magic}
                一键融入
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 7,
                marginTop: 13,
              }}
            >
              <AssetButton
                icon={Icons.photo}
                title={background ? "更换场景" : "上传场景"}
                subtitle={
                  background
                    ? `${background.width} × ${background.height}`
                    : "现实照片"
                }
                active={Boolean(background)}
                onClick={() => bgInputRef.current?.click()}
              />
              <AssetButton
                icon={Icons.person}
                title={person ? "更换人物" : "上传人物"}
                subtitle={
                  person ? `${person.width} × ${person.height}` : "透明 PNG"
                }
                active={Boolean(person)}
                onClick={() => personInputRef.current?.click()}
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 4,
              padding: "8px 12px",
              borderBottom: "1px solid rgba(255,255,255,.065)",
            }}
          >
            {(["融合", "空间", "氛围", "去背"] as const).map((tab) => (
              <button
                type="button"
                key={tab}
                className={`tab-button ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="panel-scroll">
            {activeTab === "融合" && (
              <>
                <Section title="人物构图" hint="直接在画布拖动人物，滚轮缩放">
                  <Slider
                    label="大小"
                    value={transform.scale}
                    min={0.02}
                    max={2.5}
                    step={0.01}
                    onChange={(v) => {
                      pushHistory("transform");
                      setTransform((p) => ({ ...p, scale: v }));
                    }}
                    format={(v) => `${Math.round(v * 100)}%`}
                  />
                  <Slider
                    label="旋转"
                    value={transform.rotation}
                    min={-30}
                    max={30}
                    step={0.2}
                    onChange={(v) => {
                      pushHistory("transform");
                      setTransform((p) => ({ ...p, rotation: v }));
                    }}
                    suffix="°"
                  />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                    <button
                      type="button"
                      style={smallAction}
                      onClick={() => {
                        pushHistory("transform");
                        setTransform((p) => ({ ...p, flipX: !p.flipX }));
                      }}
                    >
                      {Icons.mirror}
                      水平镜像
                    </button>
                    <button type="button" style={smallAction} onClick={resetCharacter}>
                      {Icons.reset}
                      自动摆放
                    </button>
                  </div>
                </Section>

                <Section title="融入环境">
                  <Slider
                    label="人物亮度"
                    value={settings.personBrightness}
                    min={0.55}
                    max={1.35}
                    step={0.01}
                    onChange={(v) => updateSettings("personBrightness", v)}
                  />
                  <Slider
                    label="人物对比度"
                    value={settings.personContrast}
                    min={0.65}
                    max={1.35}
                    step={0.01}
                    onChange={(v) => updateSettings("personContrast", v)}
                  />
                  <Slider
                    label="人物饱和度"
                    value={settings.personSaturation}
                    min={0.45}
                    max={1.35}
                    step={0.01}
                    onChange={(v) => updateSettings("personSaturation", v)}
                  />
                  <Slider
                    label="人物色温"
                    value={settings.personWarmth}
                    min={-0.5}
                    max={0.5}
                    step={0.01}
                    onChange={(v) => updateSettings("personWarmth", v)}
                    format={(v) =>
                      Math.abs(v) < 0.01
                        ? "中性"
                        : v > 0
                          ? `暖 +${Math.round(v * 100)}`
                          : `冷 ${Math.round(v * 100)}`
                    }
                  />
                  <Slider
                    label="环境染色"
                    value={settings.ambientTint}
                    min={0}
                    max={0.7}
                    step={0.01}
                    onChange={(v) => updateSettings("ambientTint", v)}
                  />
                  <Slider
                    label="环境色分布"
                    value={settings.ambientSpread}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(v) => updateSettings("ambientSpread", v)}
                    format={(v) =>
                      v < 0.03
                        ? "均匀"
                        : v > 0.94
                          ? "四角渐变"
                          : `渐变 ${Math.round(v * 100)}`
                    }
                  />
                  <div style={{ color: "rgba(255,255,255,.28)", fontSize: 9.5, lineHeight: 1.55 }}>
                    环境色分布把背景在人物左右/上下的色差按位置铺到人物身上（AE 四色渐变 + 柔光），
                    左边窗户冷光、右边台灯暖光这种场景，拉到「四角渐变」才自然。
                  </div>
                  <Slider
                    label="空气透色"
                    value={settings.ambientHaze}
                    min={0}
                    max={0.4}
                    step={0.01}
                    onChange={(v) => updateSettings("ambientHaze", v)}
                  />
                </Section>

                <Section
                  title="环境光照"
                  hint="模拟路灯、窗光、夕阳等方向光真正落在人物表面"
                >
                  <Slider
                    label="受光强度"
                    value={settings.lightStrength}
                    min={0}
                    max={0.65}
                    step={0.01}
                    onChange={(v) => updateSettings("lightStrength", v)}
                  />
                  <Slider
                    label="光照方向"
                    value={settings.lightAngle}
                    min={-180}
                    max={180}
                    step={1}
                    onChange={(v) => updateSettings("lightAngle", v)}
                    format={(v) => `${Math.round(v)}°`}
                  />
                  <Slider
                    label="光线柔和"
                    value={settings.lightSoftness}
                    min={0.05}
                    max={1}
                    step={0.01}
                    onChange={(v) => updateSettings("lightSoftness", v)}
                  />
                  <Slider
                    label="受光范围"
                    value={settings.lightCoverage}
                    min={0.15}
                    max={1}
                    step={0.01}
                    onChange={(v) => updateSettings("lightCoverage", v)}
                  />
                  <Slider
                    label="光源色温"
                    value={settings.lightWarmth}
                    min={-0.5}
                    max={0.5}
                    step={0.01}
                    onChange={(v) => updateSettings("lightWarmth", v)}
                    format={(v) =>
                      Math.abs(v) < 0.01
                        ? "中性"
                        : v > 0
                          ? `暖 +${Math.round(v * 100)}`
                          : `冷 ${Math.round(v * 100)}`
                    }
                  />
                  <Slider
                    label="亮部抬升"
                    value={settings.lightLift}
                    min={0}
                    max={0.2}
                    step={0.005}
                    onChange={(v) => updateSettings("lightLift", v)}
                  />
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 7,
                    }}
                  >
                    <button
                      type="button"
                      style={{
                        ...smallAction,
                        background: pickLightMode
                          ? "linear-gradient(135deg,rgba(242,158,180,.16),rgba(236,198,142,.12))"
                          : smallAction.background,
                        color: pickLightMode ? "#fff5ee" : smallAction.color,
                        borderColor: pickLightMode
                          ? "rgba(244,194,174,.22)"
                          : "rgba(255,255,255,.075)",
                      }}
                      onClick={() => {
                        setPickPatchColorMode(false);
                        setPickLightMode((v) => !v);
                      }}
                      disabled={!background || !person}
                    >
                      {Icons.magic}
                      {pickLightMode ? "点击画面光源…" : "拾取光源"}
                    </button>
                    <button
                      type="button"
                      style={smallAction}
                      onClick={() => {
                        setLightPoint(null);
                        setPickLightMode(false);
                      }}
                      disabled={!lightPoint}
                    >
                      {Icons.reset}
                      清除光源点
                    </button>
                  </div>
                </Section>

                <Section
                  title="可拖动光斑"
                  hint="点击光斑才显示编辑框；四角独立缩放，顶部圆点旋转，并可直接从背景吸取光源颜色"
                >
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    <button type="button" style={smallAction} onClick={() => addLightPatch("暖光")} disabled={!person}>
                      + 暖光
                    </button>
                    <button type="button" style={smallAction} onClick={() => addLightPatch("冷光")} disabled={!person}>
                      + 冷光
                    </button>
                    <button type="button" style={smallAction} onClick={() => addLightPatch("硬窗光")} disabled={!person}>
                      + 硬光
                    </button>
                    <button type="button" style={smallAction} onClick={() => addLightPatch("阴影")} disabled={!person}>
                      + 阴影块
                    </button>
                  </div>
                  <button
                    type="button"
                    style={{
                      ...smallAction,
                      minHeight: 38,
                      background: "linear-gradient(135deg,rgba(255,231,190,.105),rgba(244,171,184,.07))",
                      borderColor: "rgba(255,225,178,.15)",
                    }}
                    onClick={applyReferenceSunlight}
                    disabled={!person}
                  >
                    {Icons.magic}
                    参考图 · 斜射日光
                  </button>

                  {lightPatches.length > 0 && (
                    <>
                      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
                        {lightPatches.map((patch, index) => (
                          <button
                            key={patch.id}
                            type="button"
                            onClick={() => {
                              setActiveLightPatchId(patch.id);
                              setPersonSelected(false);
                              setLightPatchEditMode(true);
                            }}
                            style={{
                              ...smallAction,
                              flex: "0 0 auto",
                              minWidth: 54,
                              padding: "0 8px",
                              borderColor: patch.id === activeLightPatchId ? "rgba(255,241,211,.28)" : "rgba(255,255,255,.075)",
                              background: patch.id === activeLightPatchId ? "rgba(255,236,202,.075)" : smallAction.background,
                            }}
                          >
                            <span style={{ width: 9, height: 9, borderRadius: 99, background: patch.mode === "影" ? "#798292" : patch.color, boxShadow: `0 0 8px ${patch.mode === "影" ? "#798292" : patch.color}` }} />
                            光{index + 1}
                          </button>
                        ))}
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                        <button
                          type="button"
                          style={{
                            ...smallAction,
                            background: lightPatchEditMode ? "rgba(255,237,207,.08)" : smallAction.background,
                            color: lightPatchEditMode ? "#fff4e2" : smallAction.color,
                          }}
                          onClick={() => setLightPatchEditMode((v) => {
                            const next = !v;
                            if (!next) {
                              setActiveLightPatchId(null);
                              setPickPatchColorMode(false);
                            }
                            return next;
                          })}
                        >
                          {lightPatchEditMode ? "正在拖动光斑" : "编辑光斑位置"}
                        </button>
                        <button
                          type="button"
                          style={smallAction}
                          onClick={() => {
                            if (!activeLightPatchId) return;
                            setLightPatches((prev) => prev.filter((p) => p.id !== activeLightPatchId));
                            const next = lightPatches.find((p) => p.id !== activeLightPatchId);
                            setActiveLightPatchId(next?.id ?? null);
                            if (!next) setPickPatchColorMode(false);
                          }}
                          disabled={!activeLightPatchId}
                        >
                          删除当前光斑
                        </button>
                      </div>
                    </>
                  )}

                  {activeLightPatch && (
                    <>
                      <SelectRow
                        label="作用类型"
                        value={activeLightPatch.mode ?? "光"}
                        options={["光", "影"]}
                        onChange={(v) => updateLightPatch(activeLightPatch.id, { mode: v as LightPatchMode })}
                      />
                      <label style={{ display: "grid", gridTemplateColumns: "1fr 136px", alignItems: "center", gap: 10 }}>
                        <span style={{ color: "rgba(255,255,255,.48)", fontSize: 10.5 }}>{activeLightPatch.mode === "影" ? "阴影色" : "光源颜色"}</span>
                        <div style={{ height: 32, display: "flex", alignItems: "center", gap: 7, padding: "0 7px", borderRadius: 10, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.04)" }}>
                          <input
                            key={activeLightPatch.id}
                            ref={patchColorInputRef}
                            type="color"
                            defaultValue={activeLightPatch.color}
                            onInput={(e) =>
                              previewPatchColor(e.currentTarget.value)
                            }
                            onChange={(e) =>
                              commitPatchColor(activeLightPatch.id, e.currentTarget.value)
                            }
                            onBlur={(e) =>
                              commitPatchColor(activeLightPatch.id, e.currentTarget.value)
                            }
                            style={{ width: 28, height: 22, padding: 0, border: 0, background: "transparent", cursor: "pointer" }}
                          />
                          <span
                            ref={patchColorHexRef}
                            style={{ fontSize: 10, color: "rgba(255,255,255,.55)", fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace" }}
                          >
                            {activeLightPatch.color.toUpperCase()}
                          </span>
                          <span style={{ marginLeft: "auto", fontSize: 9, color: "rgba(255,255,255,.22)", whiteSpace: "nowrap" }}>
                            松开应用
                          </span>
                        </div>
                      </label>
                      <button
                        type="button"
                        style={{
                          ...smallAction,
                          background: pickPatchColorMode ? "linear-gradient(135deg,rgba(149,195,255,.15),rgba(255,215,166,.13))" : smallAction.background,
                          color: pickPatchColorMode ? "#fff6ea" : smallAction.color,
                          borderColor: pickPatchColorMode ? "rgba(255,225,178,.2)" : "rgba(255,255,255,.075)",
                        }}
                        onClick={() => {
                          setPickLightMode(false);
                          setPickPatchColorMode((v) => !v);
                        }}
                        disabled={!background}
                      >
                        {Icons.magic}
                        {pickPatchColorMode ? "点击画面为当前光斑取色…" : activeLightPatch.mode === "影" ? "从背景拾取阴影色" : "从背景拾取光源色"}
                      </button>
                      <SelectRow
                        label="光斑形状"
                        value={activeLightPatch.shape}
                        options={["柔光", "硬光", "光带"]}
                        onChange={(v) => updateLightPatch(activeLightPatch.id, { shape: v as LightPatchShape })}
                      />
                      <Slider label={activeLightPatch.mode === "影" ? "阴影强度" : "直射强度"} value={activeLightPatch.intensity} min={0} max={1.4} step={0.01} onChange={(v) => updateLightPatch(activeLightPatch.id, { intensity: v })} />
                      <Slider label="高光泛白" value={activeLightPatch.highlight} min={0} max={1} step={0.01} onChange={(v) => updateLightPatch(activeLightPatch.id, { highlight: v })} />
                      <Slider label="边缘模糊" value={activeLightPatch.softness} min={0} max={1} step={0.01} onChange={(v) => updateLightPatch(activeLightPatch.id, { softness: v })} />
                      <Slider label="光斑宽度" value={activeLightPatch.width} min={0.03} max={1.6} step={0.01} onChange={(v) => updateLightPatch(activeLightPatch.id, { width: v })} />
                      <Slider label="光斑高度" value={activeLightPatch.height} min={0.02} max={1.6} step={0.01} onChange={(v) => updateLightPatch(activeLightPatch.id, { height: v })} />
                      <Slider label="光斑旋转" value={activeLightPatch.rotation} min={-180} max={180} step={1} format={(v) => `${Math.round(v)}°`} onChange={(v) => updateLightPatch(activeLightPatch.id, { rotation: v })} />
                    </>
                  )}

                  <Slider
                    label="未受光压暗"
                    value={settings.localLightShadow}
                    min={0}
                    max={0.7}
                    step={0.01}
                    onChange={(v) => updateSettings("localLightShadow", v)}
                  />
                  <Slider
                    label="局部辉光"
                    value={settings.localLightBloom}
                    min={0}
                    max={0.5}
                    step={0.01}
                    onChange={(v) => updateSettings("localLightBloom", v)}
                  />
                  <div style={{ color: "rgba(255,255,255,.28)", fontSize: 9.5, lineHeight: 1.55 }}>
                    操作：拖光斑内部移动；拖四角可分别改变宽度和高度；拖顶部圆点旋转。点击画布其它位置会取消选中并隐藏边框。边缘模糊会同时羽化四条边，适合自然窗光、路灯和霓虹。
                  </div>
                </Section>

                <Section
                  title="体积受光"
                  hint="用人物透明轮廓生成伪法线，再按光向计算明暗；这是浏览器本地近似 relighting"
                >
                  <Slider
                    label="重照明强度"
                    value={settings.relightStrength}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(v) => updateSettings("relightStrength", v)}
                  />
                  <Slider
                    label="体积深度"
                    value={settings.volumeDepth}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(v) => updateSettings("volumeDepth", v)}
                  />
                  <Slider
                    label="包裹光"
                    value={settings.wrapLight}
                    min={0}
                    max={0.8}
                    step={0.01}
                    onChange={(v) => updateSettings("wrapLight", v)}
                  />
                  <Slider
                    label="轮廓受光"
                    value={settings.edgeLight}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(v) => updateSettings("edgeLight", v)}
                  />
                  <Slider
                    label="背光压暗"
                    value={settings.backShade}
                    min={0}
                    max={0.7}
                    step={0.01}
                    onChange={(v) => updateSettings("backShade", v)}
                  />
                  <Slider
                    label="人物局部阴影"
                    value={settings.faceShadowStrength}
                    min={0}
                    max={0.85}
                    step={0.01}
                    onChange={(v) => updateSettings("faceShadowStrength", v)}
                  />
                  <Slider
                    label="阴影边界柔和"
                    value={settings.faceShadowSoftness}
                    min={0.04}
                    max={1}
                    step={0.01}
                    onChange={(v) => updateSettings("faceShadowSoftness", v)}
                  />
                  <Slider
                    label="明暗分界位置"
                    value={settings.faceShadowThreshold}
                    min={0.05}
                    max={0.95}
                    step={0.01}
                    onChange={(v) => updateSettings("faceShadowThreshold", v)}
                  />
                  <Slider
                    label="高光强度"
                    value={settings.specular}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(v) => updateSettings("specular", v)}
                  />
                  <Slider
                    label="高光聚焦"
                    value={settings.specularSharpness}
                    min={0.05}
                    max={1}
                    step={0.01}
                    onChange={(v) => updateSettings("specularSharpness", v)}
                    format={(v) =>
                      v > 0.72 ? "锐利" : v < 0.3 ? "柔和" : `${Math.round(v * 100)}`
                    }
                  />
                  <Slider
                    label="亮部滚降"
                    value={settings.highlightRolloff}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(v) => updateSettings("highlightRolloff", v)}
                    format={(v) =>
                      v < 0.03 ? "硬切" : v > 0.8 ? "很软" : `${Math.round(v * 100)}`
                    }
                  />
                  <div style={{ color: "rgba(255,255,255,.28)", fontSize: 9.5, lineHeight: 1.55 }}>
                    明暗来自「剪影距离场」算出的伪法线，会跟着人物真实形状走（手臂像圆柱、躯干像穹顶）。
                    高光是「被灯照到」的关键：漫反射只让画面变亮，只有镜面高光才有形状和方向；
                    亮部滚降让过曝区域平滑过渡到接近白，而不是切成一团死白，也给阈值泛光留出发光素材。
                  </div>
                </Section>

                <Section title="边缘与质感">
                  <Slider
                    label="边缘柔化"
                    value={settings.edgeSoftness}
                    min={0}
                    max={3}
                    step={0.05}
                    onChange={(v) => updateSettings("edgeSoftness", v)}
                    suffix="px"
                  />
                  <Slider
                    label="人物微模糊"
                    value={settings.personBlur}
                    min={0}
                    max={3}
                    step={0.05}
                    onChange={(v) => updateSettings("personBlur", v)}
                    suffix="px"
                  />
                  <SelectRow
                    label="混合模式"
                    value={settings.blendMode}
                    options={["正常", "柔光", "滤色", "叠加"]}
                    onChange={(v) => updateSettings("blendMode", v as BlendMode)}
                  />
                  <Slider
                    label="人物透明度"
                    value={settings.personOpacity}
                    min={0.2}
                    max={1}
                    step={0.01}
                    onChange={(v) => updateSettings("personOpacity", v)}
                  />
                </Section>

                <Section title="人物泛光" hint="适合霓虹、梦境、逆光边缘发亮。泛光颜色可单独指定，不跟随环境光。">
                  <Slider
                    label="泛光强度"
                    value={settings.personGlow}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(v) => updateSettings("personGlow", v)}
                  />
                  <Slider
                    label="泛光范围"
                    value={settings.personGlowSize}
                    min={0}
                    max={64}
                    step={1}
                    onChange={(v) => updateSettings("personGlowSize", v)}
                    suffix="px"
                  />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
                    <div>
                      <div style={{ color: "rgba(255,255,255,.7)", fontSize: 11, marginBottom: 6 }}>泛光颜色</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 12, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)" }}>
                        <input
                          ref={personGlowColorInputRef}
                          type="color"
                          defaultValue={settings.personGlowColor}
                          onInput={(e) => previewPersonGlowColor((e.target as HTMLInputElement).value)}
                          onChange={(e) => commitPersonGlowColor((e.target as HTMLInputElement).value)}
                          onBlur={(e) => commitPersonGlowColor((e.target as HTMLInputElement).value)}
                          style={{ width: 34, height: 34, padding: 0, border: "none", background: "transparent", cursor: "pointer" }}
                        />
                        <span ref={personGlowColorHexRef} style={{ fontSize: 11, letterSpacing: ".06em", color: "rgba(255,255,255,.78)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{settings.personGlowColor.toUpperCase()}</span>
                        <span style={{ fontSize: 9, color: "rgba(255,255,255,.24)", whiteSpace: "nowrap" }}>松开应用</span>
                        <button
                          type="button"
                          onClick={() => commitPersonGlowColor(ambientColor)}
                          style={{ marginLeft: "auto", borderRadius: 999, padding: "6px 10px", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)", color: "rgba(255,255,255,.75)", fontSize: 10.5, cursor: "pointer" }}
                        >
                          用环境色
                        </button>
                      </div>
                    </div>
                  </div>
                </Section>

                <Section
                  title="背光"
                  hint="把人物剪影填成光源色、模糊后垫在身后；逆光、霓虹、雪夜里最能托出人物"
                >
                  <Slider
                    label="背光强度"
                    value={settings.backLight}
                    min={0}
                    max={0.6}
                    step={0.01}
                    onChange={(v) => updateSettings("backLight", v)}
                  />
                  <Slider
                    label="背光扩散"
                    value={settings.backLightSize}
                    min={0}
                    max={80}
                    step={1}
                    onChange={(v) => updateSettings("backLightSize", v)}
                    suffix="px"
                  />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
                    <div>
                      <div style={{ color: "rgba(255,255,255,.7)", fontSize: 11, marginBottom: 6 }}>背光颜色</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 12, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)" }}>
                        <input
                          ref={backLightColorInputRef}
                          type="color"
                          defaultValue={settings.backLightColor}
                          onInput={(e) => previewBackLightColor((e.target as HTMLInputElement).value)}
                          onChange={(e) => commitBackLightColor((e.target as HTMLInputElement).value)}
                          onBlur={(e) => commitBackLightColor((e.target as HTMLInputElement).value)}
                          style={{ width: 34, height: 34, padding: 0, border: "none", background: "transparent", cursor: "pointer" }}
                        />
                        <span ref={backLightColorHexRef} style={{ fontSize: 11, letterSpacing: ".06em", color: "rgba(255,255,255,.78)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{settings.backLightColor.toUpperCase()}</span>
                        <span style={{ fontSize: 9, color: "rgba(255,255,255,.24)", whiteSpace: "nowrap" }}>松开应用</span>
                        <button
                          type="button"
                          onClick={() => commitBackLightColor(ambientColor)}
                          style={{ marginLeft: "auto", borderRadius: 999, padding: "6px 10px", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)", color: "rgba(255,255,255,.75)", fontSize: 10.5, cursor: "pointer" }}
                        >
                          用环境色
                        </button>
                      </div>
                    </div>
                  </div>
                </Section>
              </>
            )}

            {activeTab === "空间" && (
              <>
                <Section
                  title="人物投影"
                  hint="阴影从内容底边出发，沿光照反方向斜切铺开；越贴合现场光向，人物越不像贴纸"
                >
                  <Slider
                    label="阴影强度"
                    value={settings.shadowOpacity}
                    min={0}
                    max={0.7}
                    step={0.01}
                    onChange={(v) => updateSettings("shadowOpacity", v)}
                  />
                  <Slider
                    label="阴影柔化"
                    value={settings.shadowBlur}
                    min={0}
                    max={60}
                    step={1}
                    onChange={(v) => updateSettings("shadowBlur", v)}
                    suffix="px"
                  />
                  <Slider
                    label="投影长度"
                    value={settings.shadowLength}
                    min={0.05}
                    max={1.6}
                    step={0.01}
                    onChange={(v) => updateSettings("shadowLength", v)}
                    format={(v) => `${Math.round(v * 100)}%`}
                  />
                  <Slider
                    label="投影斜切"
                    value={settings.shadowSkew}
                    min={-1.2}
                    max={1.2}
                    step={0.01}
                    onChange={(v) => updateSettings("shadowSkew", v)}
                  />
                  <Slider
                    label="阴影水平"
                    value={settings.shadowX}
                    min={-60}
                    max={60}
                    step={1}
                    onChange={(v) => updateSettings("shadowX", v)}
                    suffix="px"
                  />
                  <Slider
                    label="阴影垂直"
                    value={settings.shadowY}
                    min={-20}
                    max={80}
                    step={1}
                    onChange={(v) => updateSettings("shadowY", v)}
                    suffix="px"
                  />
                  <div style={{ color: "rgba(255,255,255,.28)", fontSize: 9.5, lineHeight: 1.55 }}>
                    「阴影水平/垂直」同时决定投影铺开的方向：自动融入会按光向写入这两个值。
                    投影长度控制影子被拉多长，斜切控制它往侧面倒多少，两者一起就是「贴地」的透视感。
                  </div>
                </Section>

                <Section title="落地感">
                  <Slider
                    label="接触阴影"
                    value={settings.contactShadow}
                    min={0}
                    max={0.8}
                    step={0.01}
                    onChange={(v) => updateSettings("contactShadow", v)}
                  />
                  <Slider
                    label="接触范围"
                    value={settings.contactShadowWidth}
                    min={0.15}
                    max={1.4}
                    step={0.01}
                    onChange={(v) => updateSettings("contactShadowWidth", v)}
                  />
                  <Slider
                    label="接触柔化"
                    value={settings.contactShadowBlur}
                    min={0}
                    max={50}
                    step={1}
                    onChange={(v) => updateSettings("contactShadowBlur", v)}
                    suffix="px"
                  />
                  <Slider
                    label="环境轮廓光"
                    value={settings.rimLight}
                    min={0}
                    max={0.6}
                    step={0.01}
                    onChange={(v) => updateSettings("rimLight", v)}
                  />
                </Section>

                <Section title="背景">
                  <SelectRow
                    label="背景适配"
                    value={settings.bgFit}
                    options={["铺满画布", "完整显示"]}
                    onChange={(v) => updateSettings("bgFit", v as FitMode)}
                  />
                  <Slider
                    label="背景亮度"
                    value={settings.bgBrightness}
                    min={0.65}
                    max={1.25}
                    step={0.01}
                    onChange={(v) => updateSettings("bgBrightness", v)}
                  />
                  <Slider
                    label="背景饱和度"
                    value={settings.bgSaturation}
                    min={0.5}
                    max={1.3}
                    step={0.01}
                    onChange={(v) => updateSettings("bgSaturation", v)}
                  />
                  <Slider
                    label="背景景深"
                    value={settings.bgBlur}
                    min={0}
                    max={8}
                    step={0.1}
                    onChange={(v) => updateSettings("bgBlur", v)}
                    suffix="px"
                  />
                </Section>
              </>
            )}

            {activeTab === "氛围" && (
              <>
                <Section title="统一调色" hint="最后一层整体处理，让人物和现实共享同一画面质感">
                  <Slider
                    label="整体曝光"
                    value={settings.overallExposure}
                    min={0.72}
                    max={1.16}
                    step={0.01}
                    onChange={(v) => updateSettings("overallExposure", v)}
                  />
                  <Slider
                    label="整体对比度"
                    value={settings.overallContrast}
                    min={0.75}
                    max={1.28}
                    step={0.01}
                    onChange={(v) => updateSettings("overallContrast", v)}
                  />
                  <Slider
                    label="整体饱和度"
                    value={settings.overallSaturation}
                    min={0.55}
                    max={1.25}
                    step={0.01}
                    onChange={(v) => updateSettings("overallSaturation", v)}
                  />
                  <Slider
                    label="整体色温"
                    value={settings.overallWarmth}
                    min={-0.4}
                    max={0.4}
                    step={0.01}
                    onChange={(v) => updateSettings("overallWarmth", v)}
                    format={(v) =>
                      Math.abs(v) < 0.01
                        ? "中性"
                        : v > 0
                          ? `暖 +${Math.round(v * 100)}`
                          : `冷 ${Math.round(v * 100)}`
                    }
                  />
                  <Slider
                    label="统一颗粒"
                    value={settings.grain}
                    min={0}
                    max={0.12}
                    step={0.002}
                    onChange={(v) => updateSettings("grain", v)}
                  />
                  <Slider
                    label="暗角"
                    value={settings.vignette}
                    min={0}
                    max={0.55}
                    step={0.01}
                    onChange={(v) => updateSettings("vignette", v)}
                  />
                  <Slider
                    label="柔光泛光"
                    value={settings.bloom}
                    min={0}
                    max={0.35}
                    step={0.01}
                    onChange={(v) => updateSettings("bloom", v)}
                  />
                </Section>
              </>
            )}

            {activeTab === "去背" && (
              <>
                <Section
                  title="人物透明背景"
                  hint="透明 PNG 最佳；普通纯色背景图片可使用自动去纯色"
                >
                  <SelectRow
                    label="去背方式"
                    value={settings.keyMode}
                    options={["保留透明", "自动去纯色"]}
                    onChange={(v) => updateSettings("keyMode", v as KeyMode)}
                  />
                  {settings.keyMode === "自动去纯色" && (
                    <>
                      <Slider
                        label="去背范围"
                        value={settings.keyTolerance}
                        min={0}
                        max={1}
                        step={0.01}
                        onChange={(v) => updateSettings("keyTolerance", v)}
                      />
                      <Slider
                        label="边缘羽化"
                        value={settings.keyFeather}
                        min={0}
                        max={1}
                        step={0.01}
                        onChange={(v) => updateSettings("keyFeather", v)}
                      />
                      <div
                        style={{
                          marginTop: 4,
                          padding: "10px 11px",
                          borderRadius: 12,
                          background: "rgba(255,255,255,.035)",
                          border: "1px solid rgba(255,255,255,.055)",
                          color: "rgba(255,255,255,.34)",
                          fontSize: 10.5,
                          lineHeight: 1.6,
                        }}
                      >
                        自动去纯色会沿图片四条边取样，按颜色众数估计背景色，
                        白底、绿幕、单色背景都能用。复杂背景仍建议先使用透明 PNG。
                      </div>
                    </>
                  )}
                </Section>

                <Section
                  title="去白边 / 去杂色"
                  hint="抠图素材边缘残留的原背景色，是「像贴纸」最直接的原因"
                >
                  <Slider
                    label="去污染强度"
                    value={settings.edgeDecontaminate}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(v) => updateSettings("edgeDecontaminate", v)}
                  />
                  <Slider
                    label="边缘收缩"
                    value={settings.edgeChoke}
                    min={0}
                    max={0.6}
                    step={0.01}
                    onChange={(v) => updateSettings("edgeChoke", v)}
                  />
                  <div
                    style={{
                      marginTop: 4,
                      padding: "10px 11px",
                      borderRadius: 12,
                      background: "rgba(255,255,255,.035)",
                      border: "1px solid rgba(255,255,255,.055)",
                      color: "rgba(255,255,255,.34)",
                      fontSize: 10.5,
                      lineHeight: 1.6,
                    }}
                  >
                    去污染会把轮廓内侧那条被原背景冲淡的窄带，用人物自身的颜色填回来（白边变回头发/衣服的颜色），
                    边缘收缩则直接把最外层污染环裁掉，等价于 PS 的「收缩选区 1px」。
                    留一点强度通常最稳；素材本身很干净时把两项都拉到 0 即可。
                  </div>
                </Section>

                <Section title="导出">
                  <SelectRow
                    label="输出尺寸"
                    value={settings.exportSize}
                    options={["原图尺寸", "1920px", "2560px", "3840px"]}
                    onChange={(v) =>
                      updateSettings("exportSize", v as ExportSize)
                    }
                  />
                  <div
                    style={{
                      color: "rgba(255,255,255,.3)",
                      fontSize: 10.5,
                      lineHeight: 1.6,
                    }}
                  >
                    导出会保持当前编辑画面的构图比例，并重新高分辨率合成，不会简单放大预览。
                  </div>
                </Section>
              </>
            )}
          </div>
        </aside>
        </InteractionContext.Provider>

        <div className="toolbar">
          <button
            type="button"
            style={toolbarButton}
            onClick={autoBlend}
            disabled={!hasBoth}
            title="自动匹配人物和环境"
          >
            {Icons.magic}
            一键融入
          </button>
          <button
            type="button"
            style={{
              ...toolbarButton,
              background: showRawComposite
                ? "rgba(247,191,173,.12)"
                : "transparent",
              color: showRawComposite ? "#fff2e9" : toolbarButton.color,
            }}
            onClick={() => setShowRawComposite((v) => !v)}
            onPointerDown={() => {
              // 按住临时预览未融合效果，松手回到原来的状态；单击仍然保持切换。
              holdCompareRef.current = showRawComposite;
              if (!showRawComposite) setShowRawComposite(true);
            }}
            onPointerUp={() => {
              if (holdCompareRef.current === null) return;
              const restore = holdCompareRef.current;
              holdCompareRef.current = null;
              setShowRawComposite(restore);
            }}
            onPointerLeave={() => {
              if (holdCompareRef.current === null) return;
              const restore = holdCompareRef.current;
              holdCompareRef.current = null;
              setShowRawComposite(restore);
            }}
            disabled={!hasBoth}
            title="单击切换未融合对比；按住可临时查看，松手自动恢复"
          >
            {Icons.compare}
            {showRawComposite ? "返回效果" : "未融合对比"}
          </button>
          <button
            type="button"
            style={toolbarButton}
            onClick={() => {
              pushHistory("transform");
              setTransform((p) => ({ ...p, flipX: !p.flipX }));
            }}
            disabled={!person}
          >
            {Icons.mirror}
            镜像
          </button>
          <button
            type="button"
            style={toolbarButton}
            onClick={resetCharacter}
            disabled={!person}
          >
            {Icons.reset}
            摆正
          </button>
          <button
            type="button"
            style={{
              ...toolbarButton,
              opacity: canUndo ? 1 : 0.42,
            }}
            onClick={undo}
            disabled={!canUndo}
            title="撤销（Ctrl / ⌘ + Z）"
          >
            {Icons.undo}
            撤销
          </button>
          <button
            type="button"
            style={{
              ...toolbarButton,
              opacity: canRedo ? 1 : 0.42,
            }}
            onClick={redo}
            disabled={!canRedo}
            title="重做（Ctrl / ⌘ + Shift + Z）"
          >
            {Icons.redo}
            重做
          </button>
          <button
            type="button"
            style={toolbarButton}
            onClick={resetAllAdjustments}
            disabled={!background && !person}
            title="恢复默认融合参数"
          >
            {Icons.reset}
            重置参数
          </button>
          <button
            type="button"
            style={toolbarButton}
            onClick={exportImage}
            disabled={!background || exporting}
            title={exporting ? "正在合成，请稍候" : "按当前构图导出高分辨率 PNG"}
          >
            {Icons.download}
            {exporting ? "导出中…" : "导出 PNG"}
          </button>
          <button type="button" style={toolbarButton} onClick={toggleFullscreen}>
            {Icons.fullscreen}
            全屏
          </button>
        </div>

        <input
          ref={bgInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) loadImage(file, "background");
            e.currentTarget.value = "";
          }}
        />
        <input
          ref={personInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) loadImage(file, "person");
            e.currentTarget.value = "";
          }}
        />

        {toast && (
          <div
            role="status"
            style={{
              position: "absolute",
              left: "50%",
              top: 112,
              zIndex: 60,
              transform: "translateX(-50%)",
              padding: "8px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.12)",
              background: "rgba(17,17,22,.82)",
              boxShadow: "0 12px 36px rgba(0,0,0,.24)",
              backdropFilter: "blur(18px)",
              color: "rgba(255,255,255,.82)",
              fontSize: 11,
              pointerEvents: "none",
            }}
          >
            {toast}
          </div>
        )}

        <div
          style={{
            position: "absolute",
            zIndex: 7,
            left: 17,
            bottom: 72,
            display: "flex",
            alignItems: "center",
            gap: 7,
            color: "rgba(255,255,255,.28)",
            fontSize: 10,
            pointerEvents: "none",
          }}
        >
          {Icons.layers}
          点击人物/光斑显示编辑框 · 点击空白隐藏 · 拖动人物 · 滚轮缩放 · 方向键微调 · 按住「未融合对比」临时预览
        </div>
      </main>
    </div>
  );
}

function AssetButton({
  icon,
  title,
  subtitle,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        minWidth: 0,
        padding: "9px 10px",
        borderRadius: 12,
        border: `1px solid ${
          active ? "rgba(237,195,169,.16)" : "rgba(255,255,255,.07)"
        }`,
        background: active
          ? "linear-gradient(135deg,rgba(242,167,184,.07),rgba(236,201,151,.05))"
          : "rgba(255,255,255,.025)",
        color: "rgba(255,255,255,.78)",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <span
        style={{
          width: 28,
          height: 28,
          flex: "0 0 auto",
          display: "grid",
          placeItems: "center",
          borderRadius: 9,
          background: "rgba(255,255,255,.05)",
          color: active ? "#efc5ae" : "rgba(255,255,255,.45)",
        }}
      >
        {icon}
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 11.5, fontWeight: 560 }}>
          {title}
        </span>
        <span
          style={{
            display: "block",
            marginTop: 2,
            color: "rgba(255,255,255,.28)",
            fontSize: 9.5,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {subtitle}
        </span>
      </span>
    </button>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        paddingTop: 15,
        paddingBottom: 14,
        borderBottom: "1px solid rgba(255,255,255,.055)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 13,
        }}
      >
        <div
          style={{
            fontSize: 11.5,
            fontWeight: 620,
            color: "rgba(255,255,255,.77)",
          }}
        >
          {title}
        </div>
        {hint && (
          <div
            style={{
              maxWidth: 205,
              textAlign: "right",
              color: "rgba(255,255,255,.25)",
              fontSize: 9.5,
              lineHeight: 1.45,
            }}
          >
            {hint}
          </div>
        )}
      </div>
      <div style={{ display: "grid", gap: 11 }}>{children}</div>
    </section>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  suffix = "",
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  suffix?: string;
  format?: (value: number) => string;
}) {
  const interaction = useContext(InteractionContext);
  const decimals = step < 0.01 ? 3 : step < 1 ? 2 : 0;
  const safeValue =
    typeof value === "number" && Number.isFinite(value)
      ? clamp(value, min, max)
      : clamp(min, min, max);

  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          fontSize: 10.5,
        }}
      >
        <span style={{ color: "rgba(255,255,255,.48)" }}>{label}</span>
        <span
          style={{
            minWidth: 46,
            textAlign: "right",
            color: "rgba(255,255,255,.72)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {format
            ? format(safeValue)
            : `${safeValue.toFixed(decimals)}${suffix}`}
        </span>
      </div>
      <input
        className="range"
        type="range"
        value={safeValue}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        // 按住滑杆时切到低分辨率预览，松手后由全局兜底回到全质量渲染
        onPointerDown={interaction.begin}
        onPointerUp={interaction.end}
        onPointerCancel={interaction.end}
        onBlur={interaction.end}
      />
    </label>
  );
}

function SelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 136px",
        alignItems: "center",
        gap: 10,
      }}
    >
      <span style={{ color: "rgba(255,255,255,.48)", fontSize: 10.5 }}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          height: 32,
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,.08)",
          outline: "none",
          background: "rgba(255,255,255,.045)",
          color: "rgba(255,255,255,.74)",
          padding: "0 9px",
          fontSize: 10.5,
        }}
      >
        {options.map((option) => (
          <option key={option} value={option} style={{ background: "#1a1a20" }}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

const smallAction: CSSProperties = {
  minHeight: 34,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,.075)",
  background: "rgba(255,255,255,.035)",
  color: "rgba(255,255,255,.62)",
  padding: "0 10px",
  cursor: "pointer",
  fontSize: 10.5,
};

const toolbarButton: CSSProperties = {
  minHeight: 34,
  flex: "0 0 auto",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "0 10px",
  border: "1px solid transparent",
  borderRadius: 10,
  background: "transparent",
  color: "rgba(255,255,255,.62)",
  cursor: "pointer",
  whiteSpace: "nowrap",
  fontSize: 10.5,
};
