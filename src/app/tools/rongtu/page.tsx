"use client";

import {
  useCallback,
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
type PresetName = "自然融入" | "黄昏" | "雨夜" | "街灯" | "胶片" | "梦境";
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

  shadowOpacity: number;
  shadowBlur: number;
  shadowX: number;
  shadowY: number;
  contactShadow: number;
  contactShadowWidth: number;
  contactShadowBlur: number;
  rimLight: number;
  personGlow: number;
  personGlowSize: number;
  personGlowColor: string;

  keyMode: KeyMode;
  keyTolerance: number;
  keyFeather: number;

  overallExposure: number;
  overallContrast: number;
  overallSaturation: number;
  overallWarmth: number;
  grain: number;
  vignette: number;
  bloom: number;

  exportSize: ExportSize;
};

const DEFAULT_SETTINGS: Settings = {
  bgFit: "完整显示",
  bgBlur: 0,
  bgBrightness: 1,
  bgSaturation: 1,

  personOpacity: 1,
  personBrightness: 0.94,
  personContrast: 0.98,
  personSaturation: 0.92,
  personWarmth: 0,
  personBlur: 0.25,
  edgeSoftness: 0.6,
  ambientTint: 0.22,
  ambientHaze: 0.04,
  lightStrength: 0.16,
  lightAngle: -35,
  lightSoftness: 0.62,
  lightCoverage: 0.58,
  lightWarmth: 0.06,
  lightLift: 0.04,
  relightStrength: 0.46,
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

  shadowOpacity: 0.22,
  shadowBlur: 18,
  shadowX: 4,
  shadowY: 12,
  contactShadow: 0.28,
  contactShadowWidth: 0.72,
  contactShadowBlur: 18,
  rimLight: 0.06,
  personGlow: 0.08,
  personGlowSize: 20,
  personGlowColor: "#B6D7FF",

  keyMode: "保留透明",
  keyTolerance: 0.2,
  keyFeather: 0.16,

  overallExposure: 0.98,
  overallContrast: 1.01,
  overallSaturation: 0.98,
  overallWarmth: 0,
  grain: 0.018,
  vignette: 0.18,
  bloom: 0.05,

  exportSize: "原图尺寸",
};

const PRESETS: Record<PresetName, Partial<Settings>> = {
  自然融入: {
    personBrightness: 0.94,
    personContrast: 0.98,
    personSaturation: 0.92,
    personWarmth: 0,
    personBlur: 0.2,
    edgeSoftness: 0.55,
    ambientTint: 0.2,
    ambientHaze: 0.035,
    lightStrength: 0.14,
    lightAngle: -35,
    lightSoftness: 0.7,
    lightCoverage: 0.6,
    lightWarmth: 0.04,
    lightLift: 0.035,
    relightStrength: 0.42,
    volumeDepth: 0.58,
    wrapLight: 0.36,
    edgeLight: 0.18,
    backShade: 0.15,
    shadowOpacity: 0.2,
    shadowBlur: 18,
    contactShadow: 0.26,
    rimLight: 0.04,
    personGlow: 0.05,
    personGlowSize: 16,
    personGlowColor: "#B9D2FF",
    overallExposure: 0.98,
    overallContrast: 1.01,
    overallSaturation: 0.98,
    overallWarmth: 0,
    grain: 0.016,
    vignette: 0.16,
    bloom: 0.035,
  },
  黄昏: {
    personBrightness: 0.9,
    personContrast: 0.96,
    personSaturation: 0.9,
    personWarmth: 0.28,
    personBlur: 0.35,
    edgeSoftness: 0.75,
    ambientTint: 0.34,
    ambientHaze: 0.08,
    lightStrength: 0.28,
    lightAngle: -28,
    lightSoftness: 0.58,
    lightCoverage: 0.54,
    lightWarmth: 0.3,
    lightLift: 0.06,
    relightStrength: 0.58,
    volumeDepth: 0.68,
    wrapLight: 0.25,
    edgeLight: 0.36,
    backShade: 0.24,
    shadowOpacity: 0.3,
    shadowBlur: 24,
    shadowY: 15,
    contactShadow: 0.3,
    rimLight: 0.15,
    personGlow: 0.1,
    personGlowSize: 22,
    personGlowColor: "#FFD2A6",
    overallExposure: 0.94,
    overallContrast: 1.02,
    overallSaturation: 0.97,
    overallWarmth: 0.14,
    grain: 0.022,
    vignette: 0.2,
    bloom: 0.08,
  },
  雨夜: {
    personBrightness: 0.83,
    personContrast: 1.04,
    personSaturation: 0.82,
    personWarmth: -0.18,
    personBlur: 0.5,
    edgeSoftness: 0.9,
    ambientTint: 0.38,
    ambientHaze: 0.12,
    lightStrength: 0.22,
    lightAngle: -48,
    lightSoftness: 0.68,
    lightCoverage: 0.48,
    lightWarmth: -0.18,
    lightLift: 0.045,
    relightStrength: 0.52,
    volumeDepth: 0.62,
    wrapLight: 0.3,
    edgeLight: 0.42,
    backShade: 0.28,
    shadowOpacity: 0.36,
    shadowBlur: 28,
    shadowY: 10,
    contactShadow: 0.2,
    rimLight: 0.2,
    overallExposure: 0.88,
    overallContrast: 1.06,
    overallSaturation: 0.88,
    overallWarmth: -0.1,
    grain: 0.028,
    vignette: 0.28,
    bloom: 0.09,
  },
  街灯: {
    personBrightness: 0.9,
    personContrast: 1.01,
    personSaturation: 0.88,
    personWarmth: 0.22,
    personBlur: 0.35,
    edgeSoftness: 0.8,
    ambientTint: 0.32,
    ambientHaze: 0.07,
    lightStrength: 0.34,
    lightAngle: -32,
    lightSoftness: 0.46,
    lightCoverage: 0.44,
    lightWarmth: 0.34,
    lightLift: 0.075,
    relightStrength: 0.66,
    volumeDepth: 0.72,
    wrapLight: 0.2,
    edgeLight: 0.48,
    backShade: 0.32,
    shadowOpacity: 0.34,
    shadowBlur: 22,
    shadowX: 10,
    shadowY: 14,
    contactShadow: 0.32,
    rimLight: 0.24,
    overallExposure: 0.92,
    overallContrast: 1.05,
    overallSaturation: 0.91,
    overallWarmth: 0.1,
    grain: 0.025,
    vignette: 0.26,
    bloom: 0.11,
  },
  胶片: {
    personBrightness: 0.93,
    personContrast: 0.94,
    personSaturation: 0.84,
    personWarmth: 0.08,
    personBlur: 0.55,
    edgeSoftness: 0.85,
    ambientTint: 0.22,
    ambientHaze: 0.06,
    lightStrength: 0.15,
    lightAngle: -38,
    lightSoftness: 0.74,
    lightCoverage: 0.62,
    lightWarmth: 0.08,
    lightLift: 0.035,
    relightStrength: 0.4,
    volumeDepth: 0.54,
    wrapLight: 0.38,
    edgeLight: 0.16,
    backShade: 0.14,
    shadowOpacity: 0.24,
    shadowBlur: 24,
    contactShadow: 0.24,
    rimLight: 0.04,
    overallExposure: 0.93,
    overallContrast: 1.08,
    overallSaturation: 0.86,
    overallWarmth: 0.08,
    grain: 0.065,
    vignette: 0.3,
    bloom: 0.035,
  },
  梦境: {
    personBrightness: 0.96,
    personContrast: 0.9,
    personSaturation: 0.94,
    personWarmth: 0.08,
    personBlur: 0.75,
    edgeSoftness: 1.4,
    ambientTint: 0.28,
    ambientHaze: 0.12,
    lightStrength: 0.2,
    lightAngle: -24,
    lightSoftness: 0.82,
    lightCoverage: 0.7,
    lightWarmth: 0.1,
    lightLift: 0.07,
    relightStrength: 0.46,
    volumeDepth: 0.5,
    wrapLight: 0.52,
    edgeLight: 0.34,
    backShade: 0.1,
    shadowOpacity: 0.16,
    shadowBlur: 30,
    contactShadow: 0.16,
    rimLight: 0.3,
    overallExposure: 0.97,
    overallContrast: 0.94,
    overallSaturation: 0.94,
    overallWarmth: 0.06,
    grain: 0.012,
    vignette: 0.14,
    bloom: 0.16,
  },
};

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

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
  if (amount <= 0.001) return;

  // 固定种子的颗粒，拖动人物/滑杆时不会“闪烁”。
  let seed = 0x9e3779b9;
  const random = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return ((seed >>> 0) % 100000) / 100000;
  };

  const count = Math.min(42000, Math.floor((w * h * amount) / 155));
  ctx.save();
  ctx.globalCompositeOperation = "soft-light";
  for (let i = 0; i < count; i++) {
    const alpha = random() * amount * 0.5;
    const c = random() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${c},${c},${c},${alpha})`;
    const size = random() > 0.94 ? 2 : 1;
    ctx.fillRect(random() * w, random() * h, size, size);
  }
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
  const actx = alphaSource.getContext("2d", { willReadFrequently: true });
  if (!ctx || !actx) return;

  // Build a softened silhouette. Its gradient gives us a useful local normal
  // near hair / clothes / outline edges without a neural normal estimator.
  const soft = document.createElement("canvas");
  soft.width = w;
  soft.height = h;
  const sctx = soft.getContext("2d", { willReadFrequently: true })!;
  sctx.filter = `blur(${Math.max(1.2, 2.4 + settings.edgeSoftness * 0.7)}px)`;
  sctx.drawImage(alphaSource, 0, 0);

  const pixels = ctx.getImageData(0, 0, w, h);
  const alphaPixels = soft.getContext("2d", { willReadFrequently: true })!
    .getImageData(0, 0, w, h).data;
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

  const invW = 1 / Math.max(1, w - 1);
  const invH = 1 / Math.max(1, h - 1);

  const alphaAt = (x: number, y: number) => {
    x = Math.max(0, Math.min(w - 1, x));
    y = Math.max(0, Math.min(h - 1, y));
    return alphaPixels[(y * w + x) * 4 + 3] / 255;
  };

  for (let y = 1; y < h - 1; y++) {
    const ey = y * invH * 2 - 1;
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      const alpha = d[i + 3] / 255;
      if (alpha < 0.01) continue;

      const ex = x * invW * 2 - 1;

      // Silhouette-gradient normal.
      const gx = alphaAt(x + 1, y) - alphaAt(x - 1, y);
      const gy = alphaAt(x, y + 1) - alphaAt(x, y - 1);

      // Ellipsoid-like volume term gives broad face/body curvature inside
      // otherwise flat anime regions.
      const radial = Math.max(0, 1 - ex * ex * 0.82 - ey * ey * 0.9);
      let nx = -gx * 3.1 + ex * depth * 0.42;
      let ny = -gy * 3.1 + ey * depth * 0.34;
      let nz = 0.72 + radial * depth * 0.82;

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
        centered * strength * 0.9 +
        rim * strength * 0.72 -
        (1 - lambert) * backShade * strength * 0.36 -
        localShadow * 0.72;

      const tint = clamp(
        (lambert * 0.6 + rim * 0.9) *
          strength *
          (0.16 + settings.lightLift * 0.7),
        0,
        0.42,
      );

      d[i] = clamp(d[i] * gain * (1 - tint) + lr * tint, 0, 255);
      d[i + 1] = clamp(d[i + 1] * gain * (1 - tint) + lg * tint, 0, 255);
      d[i + 2] = clamp(d[i + 2] * gain * (1 - tint) + lb * tint, 0, 255);
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

  const lightLayer = document.createElement("canvas");
  lightLayer.width = w;
  lightLayer.height = h;
  const lctx = lightLayer.getContext("2d")!;

  const shadowLayer = document.createElement("canvas");
  shadowLayer.width = w;
  shadowLayer.height = h;
  const sctx = shadowLayer.getContext("2d")!;

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
      // 硬光/光带统一使用“模糊遮罩 + 可衰减核心”。四条边都会羽化，避免矩形硬边。
      const blurPx = softness <= 0.001 ? 0 : Math.max(0.8, softness * Math.min(pw, ph) * 0.48);
      const baseAlpha = clamp(power * alphaScale, 0, 1);
      if (blurPx > 0) {
        pctx.save();
        pctx.filter = `blur(${blurPx}px)`;
        pctx.fillStyle = `rgba(${r},${g},${b},${clamp(baseAlpha * (0.72 + softness * 0.22), 0, 1)})`;
        pctx.fillRect(-pw / 2, -ph / 2, pw, ph);
        pctx.restore();
      }

      const coreAlpha = clamp(baseAlpha * Math.pow(1 - softness, 2.8), 0, 1);
      if (coreAlpha > 0.008) {
        if (patch.shape === "光带") {
          const grad = pctx.createLinearGradient(0, -ph / 2, 0, ph / 2);
          const edge = clamp(0.04 + softness * 0.24, 0.04, 0.32);
          grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
          grad.addColorStop(edge, `rgba(${r},${g},${b},${coreAlpha * 0.72})`);
          grad.addColorStop(0.5, `rgba(${r},${g},${b},${coreAlpha})`);
          grad.addColorStop(1 - edge, `rgba(${r},${g},${b},${coreAlpha * 0.72})`);
          grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
          pctx.fillStyle = grad;
        } else {
          pctx.fillStyle = `rgba(${r},${g},${b},${coreAlpha})`;
        }
        pctx.fillRect(-pw / 2, -ph / 2, pw, ph);
      }
    }
    pctx.restore();
  };

  lctx.imageSmoothingEnabled = true;
  lctx.imageSmoothingQuality = "high";
  sctx.imageSmoothingEnabled = true;
  sctx.imageSmoothingQuality = "high";

  for (const patch of patches) {
    const isShadow = patch.mode === "影";
    paintPatch(isShadow ? sctx : lctx, patch, isShadow);
  }

  // 光与影都只存在于人物 alpha 内部。
  for (const layerCtx of [lctx, sctx]) {
    layerCtx.save();
    layerCtx.globalCompositeOperation = "destination-in";
    layerCtx.drawImage(alphaSource, 0, 0, w, h);
    layerCtx.restore();
  }

  // Screen 更接近直射光；先把亮部推起来。
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.drawImage(lightLayer, 0, 0);
  ctx.restore();

  // 遮光片放在直射光之后，相当于窗框 / 树影挡住光，能形成参考图中的硬明暗切线。
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(shadowLayer, 0, 0);
  ctx.restore();

  // 少量局部 bloom，仅围绕正向光斑，不给整个人蒙雾。
  const bloom = clamp(settings.localLightBloom ?? 0, 0, 0.5);
  if (bloom > 0.001) {
    const blur = document.createElement("canvas");
    blur.width = w;
    blur.height = h;
    const bctx = blur.getContext("2d")!;
    bctx.filter = `blur(${Math.max(1.2, Math.min(w, h) * 0.012)}px)`;
    bctx.globalAlpha = bloom;
    bctx.drawImage(lightLayer, 0, 0);
    bctx.globalCompositeOperation = "destination-in";
    bctx.globalAlpha = 1;
    bctx.drawImage(alphaSource, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.drawImage(blur, 0, 0);
    ctx.restore();
  }
}

function createProcessedPerson(
  asset: ImageAsset,
  settings: Settings,
  ambient: { r: number; g: number; b: number },
  maxSide = 1600,
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

    const corners = [
      [2, 2],
      [Math.max(0, w - 3), 2],
      [2, Math.max(0, h - 3)],
      [Math.max(0, w - 3), Math.max(0, h - 3)],
    ];

    let kr = 0;
    let kg = 0;
    let kb = 0;
    for (const [x, y] of corners) {
      const i = (y * w + x) * 4;
      kr += d[i];
      kg += d[i + 1];
      kb += d[i + 2];
    }
    kr /= corners.length;
    kg /= corners.length;
    kb /= corners.length;

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

  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d")!;

  ctx.save();
  // 人物微模糊只处理画面细节；边缘柔化在最终 alpha 上单独完成，避免把脸和线稿一起糊掉。
  const blur = settings.personBlur;
  ctx.filter = [
    `brightness(${settings.personBrightness})`,
    `contrast(${settings.personContrast})`,
    `saturate(${settings.personSaturation})`,
    blur > 0.02 ? `blur(${blur.toFixed(2)}px)` : "",
  ]
    .filter(Boolean)
    .join(" ");

  ctx.drawImage(raw, 0, 0);
  ctx.restore();

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

  // Environment color contamination — the key to avoiding a sticker look.
  if (settings.ambientTint > 0.001) {
    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = `rgba(${ambient.r},${ambient.g},${ambient.b},${settings.ambientTint * 0.38})`;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
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
    const featherMask = document.createElement("canvas");
    featherMask.width = w;
    featherMask.height = h;
    const fctx = featherMask.getContext("2d")!;
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

  return out;
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

  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = processed.width;
  glowCanvas.height = processed.height;
  const glowCtx = glowCanvas.getContext("2d")!;
  glowCtx.clearRect(0, 0, glowCanvas.width, glowCanvas.height);
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

  // Full silhouette shadow.
  if (!showRaw && settings.shadowOpacity > 0.001) {
    ctx.save();
    ctx.globalAlpha = settings.shadowOpacity;
    ctx.shadowColor = `rgba(${Math.round(ambient.r * 0.16)},${Math.round(
      ambient.g * 0.16,
    )},${Math.round(ambient.b * 0.16)},0.9)`;
    ctx.shadowBlur = settings.shadowBlur * scaleFactor;
    ctx.shadowOffsetX = settings.shadowX * scaleFactor;
    ctx.shadowOffsetY = settings.shadowY * scaleFactor;
    ctx.filter = "brightness(0)";
    ctx.drawImage(
      processed,
      -targetW / 2,
      -targetH / 2,
      targetW,
      targetH,
    );
    ctx.restore();
  }

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

function drawContactShadow(
  ctx: CanvasRenderingContext2D,
  transform: Transform,
  processed: HTMLCanvasElement,
  settings: Settings,
  scaleFactor: number,
  rawAsset?: ImageAsset,
) {
  if (settings.contactShadow <= 0.001) return;

  const sourceW = rawAsset?.width ?? processed.width;
  const sourceH = rawAsset?.height ?? processed.height;
  const personH = sourceH * transform.scale * scaleFactor;
  const personW = sourceW * transform.scale * scaleFactor;
  const footY = transform.y * scaleFactor + personH * 0.47;
  const shadowW =
    personW * clamp(settings.contactShadowWidth, 0.15, 1.4) * 0.48;

  ctx.save();
  ctx.translate(transform.x * scaleFactor, footY);
  ctx.rotate((transform.rotation * Math.PI) / 180);

  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, shadowW);
  g.addColorStop(0, `rgba(0,0,0,${settings.contactShadow * 0.7})`);
  g.addColorStop(0.52, `rgba(0,0,0,${settings.contactShadow * 0.28})`);
  g.addColorStop(1, "rgba(0,0,0,0)");

  ctx.filter = `blur(${settings.contactShadowBlur * scaleFactor * 0.3}px)`;
  ctx.scale(1, 0.22);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, shadowW, 0, Math.PI * 2);
  ctx.fill();
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

const Icons = {
  photo: makeIcon("M4 5h16v14H4z M4 15l4-4 4 4 2-2 6 6 M15.5 9.5h.01"),
  person: makeIcon("M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M5 21a7 7 0 0 1 14 0"),
  magic: makeIcon("M12 3l1.2 3.3L16.5 7.5l-3.3 1.2L12 12l-1.2-3.3L7.5 7.5l3.3-1.2L12 3z M18 13l.8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8L18 13z"),
  reset: makeIcon("M3 12a9 9 0 1 0 3-6.7L3 8 M3 3v5h5"),
  mirror: makeIcon("M12 3v18 M10 6L5 9v6l5 3 M14 6l5 3v6l-5 3"),
  compare: makeIcon("M12 3v18 M5 5h7v14H5z M12 5h7v14h-7"),
  download: makeIcon("M12 3v12 M7 10l5 5 5-5 M5 21h14"),
  fullscreen: makeIcon("M8 3H3v5 M16 3h5v5 M8 21H3v-5 M16 21h5v-5"),
  layers: makeIcon("M12 3l9 5-9 5-9-5 9-5z M3 12l9 5 9-5 M3 16l9 5 9-5"),
};

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

  const [activePreset, setActivePreset] = useState<PresetName | null>("自然融入");
  const [showRawComposite, setShowRawComposite] = useState(false);
  const [activeTab, setActiveTab] = useState<"融合" | "空间" | "氛围" | "去背">("融合");
  const [ambientColor, setAmbientColor] = useState("#c5b6a8");
  const ambientRef = useRef({ r: 197, g: 182, b: 168 });
  const [toast, setToast] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [personSelected, setPersonSelected] = useState(false);
  const [pickLightMode, setPickLightMode] = useState(false);
  const [lightPoint, setLightPoint] = useState<{ x: number; y: number } | null>(null);
  const [lightPatches, setLightPatches] = useState<LightPatch[]>([]);
  const [activeLightPatchId, setActiveLightPatchId] = useState<string | null>(null);
  const [lightPatchEditMode, setLightPatchEditMode] = useState(false);
  const [pickPatchColorMode, setPickPatchColorMode] = useState(false);

  // Next.js Fast Refresh 可能保留旧版本 state。
  // 当新增设置字段后，用默认值补齐，避免旧 state 中出现 undefined / NaN。
  useEffect(() => {
    setSettings((prev) => ({
      ...DEFAULT_SETTINGS,
      ...prev,
    }));
  }, []);

  const processedPersonRef = useRef<HTMLCanvasElement | null>(null);
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

  const updateSettings = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => (Object.is(prev[key], value) ? prev : { ...prev, [key]: value }));
    setActivePreset((prev) => (prev === null ? prev : null));
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

  // 面板里的 range/select 在拖动时会非常高频地触发 change。
  // Next 16 + React 19 开发模式下，如果每个原生 change 都同步 setState，
  // 某些浏览器会在受控 input 的连续更新中触发 Maximum update depth。
  // 这里统一合并到下一帧，同时严格跳过“值没有变化”的更新。
  const updateLightPatch = useCallback(
    (id: string, patch: Partial<LightPatch>) => {
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
        setActivePreset((prev) => (prev === null ? prev : null));
      });
    },
    [],
  );

  const previewPatchColor = useCallback((color: string) => {
    // 只更新文本。不要在系统色卡拖动期间触发 React / Canvas。
    if (patchColorHexRef.current) {
      patchColorHexRef.current.textContent = color.toUpperCase();
    }
  }, []);

  const commitPatchColor = useCallback(
    (id: string, color: string) => {
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
      setActivePreset((prev) => (prev === null ? prev : null));
    },
    [],
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
    if (personGlowColorHexRef.current) {
      personGlowColorHexRef.current.textContent = color.toUpperCase();
    }
    setSettings((prev) =>
      prev.personGlowColor === color ? prev : { ...prev, personGlowColor: color },
    );
    setActivePreset((prev) => (prev === null ? prev : null));
  }, []);

  useEffect(() => {
    if (personGlowColorInputRef.current) {
      personGlowColorInputRef.current.value = settings.personGlowColor;
    }
    if (personGlowColorHexRef.current) {
      personGlowColorHexRef.current.textContent = settings.personGlowColor.toUpperCase();
    }
  }, [settings.personGlowColor]);

  // PointerMove 可能每秒触发上百次；合并到每个动画帧一次，避免 React / Canvas 被拖垮。
  const queueLightPatchUpdate = useCallback((id: string, patch: Partial<LightPatch>) => {
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
      setActivePreset(null);
    });
  }, []);

  useEffect(() => () => {
    if (patchMoveFrameRef.current !== null) cancelAnimationFrame(patchMoveFrameRef.current);
    if (patchControlFrameRef.current !== null) cancelAnimationFrame(patchControlFrameRef.current);
    pendingPatchMoveRef.current = null;
    pendingPatchControlRef.current = null;
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
  }, []);

  const addLightPatch = useCallback(
    (kind: "暖光" | "冷光" | "硬窗光" | "阴影" = "暖光") => {
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
              color: "#111722",
              intensity: 0.62,
              softness: 0.12,
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
              color: "#b9dcff",
              intensity: 0.72,
              softness: 0.72,
              highlight: 0.34,
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
                color: "#fff0c8",
                intensity: 0.95,
                softness: 0.08,
                highlight: 0.8,
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
                color: "#ffd9a6",
                intensity: 0.72,
                softness: 0.68,
                highlight: 0.38,
                shape: "柔光",
                mode: "光",
              };
      setLightPatches((prev) => [...prev, next].slice(-10));
      setActiveLightPatchId(id);
      setPersonSelected(false);
      setLightPatchEditMode(true);
      setSettings((prev) => ({
        ...prev,
        localLightShadow: Math.max(prev.localLightShadow ?? 0, kind === "硬窗光" ? 0.24 : kind === "阴影" ? 0.08 : 0.12),
      }));
      setActivePreset(null);
    },
    [],
  );

  const applyReferenceSunlight = useCallback(() => {
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
      localLightShadow: 0.28,
      localLightBloom: 0.09,
      faceShadowStrength: Math.max(prev.faceShadowStrength ?? 0.32, 0.42),
      backShade: Math.max(prev.backShade ?? 0.18, 0.24),
      relightStrength: Math.max(prev.relightStrength ?? 0.46, 0.5),
    }));
    setActivePreset(null);
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    setToast("已生成参考图风格的斜射日光，可直接拖动每一块光");
    toastTimerRef.current = window.setTimeout(() => {
      toastTimerRef.current = null;
      setToast("");
    }, 1800);
  }, []);

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
      ctx.save();
      ctx.filter = [
        `brightness(${s.bgBrightness})`,
        `saturate(${s.bgSaturation})`,
        s.bgBlur > 0.01 ? `blur(${s.bgBlur}px)` : "",
      ]
        .filter(Boolean)
        .join(" ");
      ctx.drawImage(bg.img, rect.x, rect.y, rect.w, rect.h);
      ctx.restore();

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

  const analyzeAmbient = useCallback(
    (canvas: HTMLCanvasElement, t: Transform, asset?: ImageAsset | null) => {
      const canvasEl = canvasRef.current;
      if (!canvasEl) return { r: 190, g: 180, b: 170, l: 0.55, s: 0.2 };

      const cssW = parseFloat(canvasEl.style.width) || canvasEl.clientWidth || 1;
      const cssH = parseFloat(canvasEl.style.height) || canvasEl.clientHeight || 1;
      const sx = canvas.width / cssW;
      const sy = canvas.height / cssH;

      const displayedW = asset ? asset.width * t.scale * sx : canvas.width * 0.22;
      const displayedH = asset ? asset.height * t.scale * sy : canvas.height * 0.26;
      const regionW = clamp(Math.max(80, displayedW * 1.18), 80, canvas.width * 0.58);
      const regionH = clamp(Math.max(80, displayedH * 1.12), 80, canvas.height * 0.62);
      return sampleCanvas(canvas, {
        x: t.x * sx - regionW / 2,
        y: t.y * sy - regionH / 2,
        w: regionW,
        h: regionH,
      });
    },
    [],
  );

  const renderScene = useCallback(
    (
      target: HTMLCanvasElement,
      bg: ImageAsset,
      fg: ImageAsset | null,
      s: Settings,
      t: Transform,
      options?: { rawComposite?: boolean; exportMode?: boolean },
    ) => {
      const ctx = target.getContext("2d")!;
      const w = target.width;
      const h = target.height;

      const bgCacheKey = [
        bg.url,
        w,
        h,
        s.bgFit,
        s.bgBlur.toFixed(3),
        s.bgBrightness.toFixed(4),
        s.bgSaturation.toFixed(4),
      ].join("|");
      let bgCanvas = backgroundCanvasCacheRef.current?.key === bgCacheKey
        ? backgroundCanvasCacheRef.current.canvas
        : null;
      if (!bgCanvas) {
        bgCanvas = buildBackgroundCanvas(w, h, bg, s, false);
        backgroundCanvasCacheRef.current = { key: bgCacheKey, canvas: bgCanvas };
      }
      const ambient = analyzeAmbient(bgCanvas, t, fg);
      ambientRef.current = ambient;

      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(bgCanvas, 0, 0);

      if (fg) {
        const displayCanvas = canvasRef.current;
        const cssW =
          displayCanvas && !options?.exportMode
            ? parseFloat(displayCanvas.style.width) || displayCanvas.clientWidth
            : displayCanvas
              ? parseFloat(displayCanvas.style.width) || displayCanvas.clientWidth
              : w;
        const scaleFactor = options?.exportMode ? w / Math.max(1, cssW) : w / Math.max(1, cssW);

        const ambientKey = `${Math.round(ambient.r / 8)}-${Math.round(
          ambient.g / 8,
        )}-${Math.round(ambient.b / 8)}`;
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
        ].join("|");

        let processed = processedPersonRef.current;
        if (
          !processed ||
          processedPersonKeyRef.current !== processedKey ||
          options?.exportMode
        ) {
          processed = createProcessedPerson(
            fg,
            s,
            ambient,
            options?.exportMode ? 3000 : 960,
          );
          if (!options?.exportMode) {
            processedPersonRef.current = processed;
            processedPersonKeyRef.current = processedKey;
          }
        }

        let personForDraw = processed;
        if (!options?.rawComposite && lightPatches.length) {
          // 局部光斑单独作为轻量图层叠加，不再因为拖动光斑反复执行整套逐像素重照明。
          // 这样拖动/缩放/旋转的反馈能稳定在动画帧级别。
          const localLit = document.createElement("canvas");
          localLit.width = processed.width;
          localLit.height = processed.height;
          const localCtx = localLit.getContext("2d")!;
          localCtx.drawImage(processed, 0, 0);
          drawLocalLightPatches(localLit, processed, lightPatches, s);
          personForDraw = localLit;
        }

        if (!options?.rawComposite) {
          drawContactShadow(ctx, t, personForDraw, s, scaleFactor, fg);
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
        const graded = document.createElement("canvas");
        graded.width = w;
        graded.height = h;
        const gctx = graded.getContext("2d")!;
        gctx.filter = `brightness(${s.overallExposure}) contrast(${s.overallContrast}) saturate(${s.overallSaturation})`;
        gctx.drawImage(target, 0, 0);

        if (Math.abs(s.overallWarmth) > 0.004) {
          gctx.globalCompositeOperation = "soft-light";
          gctx.fillStyle =
            s.overallWarmth > 0
              ? `rgba(255,145,70,${Math.abs(s.overallWarmth) * 0.22})`
              : `rgba(75,145,255,${Math.abs(s.overallWarmth) * 0.22})`;
          gctx.fillRect(0, 0, w, h);
        }

        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(graded, 0, 0);

        drawBloom(ctx, graded, s.bloom);
        drawVignette(ctx, w, h, s.vignette);
        drawNoise(ctx, w, h, s.grain);
      }

      return ambient;
    },
    [analyzeAmbient, buildBackgroundCanvas, lightPatches],
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !background) return;

    const ambient = renderScene(
      canvas,
      background,
      person,
      normalizeSettings(settings),
      transform,
      { rawComposite: showRawComposite },
    );

    const hex = rgbToHex(ambient.r, ambient.g, ambient.b);
    setAmbientColor((old) => (old === hex ? old : hex));
  }, [background, person, settings, transform, showRawComposite, renderScene]);

  const resetCharacter = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !person) return;

    const cssW = parseFloat(canvas.style.width) || canvas.clientWidth || 900;
    const cssH = parseFloat(canvas.style.height) || canvas.clientHeight || 650;

    const desiredHeight = cssH * 0.67;
    const scale = desiredHeight / Math.max(1, person.height);

    setTransform({
      x: cssW * 0.56,
      y: cssH * 0.53,
      scale,
      rotation: 0,
      flipX: false,
    });
  }, [person]);

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

    const canvas = canvasRef.current;
    const bgCanvas = buildBackgroundCanvas(
      canvas.width,
      canvas.height,
      background,
      normalizeSettings(settingsRef.current),
      false,
    );

    const ambient = analyzeAmbient(bgCanvas, transformRef.current, person);

    const cssW = parseFloat(canvas.style.width) || canvas.clientWidth || 1;
    const cssH = parseFloat(canvas.style.height) || canvas.clientHeight || 1;
    const sx = bgCanvas.width / cssW;
    const sy = bgCanvas.height / cssH;
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
    }));
    setActivePreset(null);
    notify("已匹配环境色、明暗与局部光照方向");
  }, [
    analyzeAmbient,
    background,
    buildBackgroundCanvas,
    notify,
    person,
  ]);

  const applyPreset = (name: PresetName) => {
    setSettings((prev) => ({
      ...DEFAULT_SETTINGS,
      ...prev,
      ...PRESETS[name],
    }));
    setActivePreset(name);
  };

  const resetAllAdjustments = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    setActivePreset("自然融入");
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
  }, [notify, person, resetCharacter]);

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
        const bgCanvas = buildBackgroundCanvas(
          canvas.width,
          canvas.height,
          background,
          normalizeSettings(settingsRef.current),
          false,
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
        setActivePreset(null);
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
          e.currentTarget.setPointerCapture(e.pointerId);
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
          e.currentTarget.setPointerCapture(e.pointerId);
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
          e.currentTarget.setPointerCapture(e.pointerId);
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
    dragRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: px,
      startY: py,
      originX: transform.x,
      originY: transform.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
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
  };

  const onWheel = (e: ReactWheelEvent<HTMLCanvasElement>) => {
    if (!person || lightPatchEditMode) return;
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.94 : 1.06;
    setTransform((prev) => ({
      ...prev,
      scale: clamp(prev.scale * factor, 0.02, 5),
    }));
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!person) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

      const step = e.shiftKey ? 10 : 2;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setTransform((p) => ({ ...p, x: p.x - step }));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setTransform((p) => ({ ...p, x: p.x + step }));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setTransform((p) => ({ ...p, y: p.y - step }));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setTransform((p) => ({ ...p, y: p.y + step }));
      } else if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        setTransform((p) => ({ ...p, scale: clamp(p.scale * 1.04, 0.02, 5) }));
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setTransform((p) => ({ ...p, scale: clamp(p.scale * 0.96, 0.02, 5) }));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [person]);

  const exportImage = useCallback(() => {
    if (!background) {
      notify("请先上传现实场景");
      return;
    }

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
    const ctx = out.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

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

    const ambient = sampleCanvas(bgCanvas, {
      x: exportTransform.x - width * 0.11,
      y: exportTransform.y - height * 0.13,
      w: width * 0.22,
      h: height * 0.26,
    });

    ctx.drawImage(bgCanvas, 0, 0);

    if (person) {
      const processed = createProcessedPerson(
        person,
        safeSettings,
        ambient,
        3200,
      );
      let personForExport = processed;
      if (lightPatches.length) {
        const localLit = document.createElement("canvas");
        localLit.width = processed.width;
        localLit.height = processed.height;
        const localCtx = localLit.getContext("2d")!;
        localCtx.drawImage(processed, 0, 0);
        drawLocalLightPatches(localLit, processed, lightPatches, safeSettings);
        personForExport = localLit;
      }
      drawContactShadow(
        ctx,
        exportTransform,
        personForExport,
        safeSettings,
        1,
        person,
      );
      drawPersonLayer(
        ctx,
        personForExport,
        exportTransform,
        safeSettings,
        ambient,
        1,
        false,
        person,
      );
    }

    const graded = document.createElement("canvas");
    graded.width = width;
    graded.height = height;
    const gctx = graded.getContext("2d")!;
    gctx.imageSmoothingEnabled = true;
    gctx.imageSmoothingQuality = "high";
    gctx.filter = `brightness(${safeSettings.overallExposure}) contrast(${safeSettings.overallContrast}) saturate(${safeSettings.overallSaturation})`;
    gctx.drawImage(out, 0, 0);

    if (Math.abs(safeSettings.overallWarmth) > 0.004) {
      gctx.globalCompositeOperation = "soft-light";
      gctx.fillStyle =
        safeSettings.overallWarmth > 0
          ? `rgba(255,145,70,${Math.abs(safeSettings.overallWarmth) * 0.22})`
          : `rgba(75,145,255,${Math.abs(safeSettings.overallWarmth) * 0.22})`;
      gctx.fillRect(0, 0, width, height);
    }

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(graded, 0, 0);
    drawBloom(ctx, graded, safeSettings.bloom);
    drawVignette(ctx, width, height, safeSettings.vignette);
    drawNoise(ctx, width, height, safeSettings.grain);

    out.toBlob(
      (blob) => {
        if (!blob) {
          notify("导出失败");
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `入画-${Date.now()}.png`;
        a.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1200);
        notify(`PNG 已导出 · ${width} × ${height} · 已自动去除预览黑边`);
      },
      "image/png",
      1,
    );
  }, [background, person, settings, transform, buildBackgroundCanvas, notify, lightPatches]);

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

  const presetDock = useMemo<CSSProperties>(
    () => ({
      position: "absolute",
      top: 58,
      left: 16,
      zIndex: 22,
      display: "flex",
      alignItems: "center",
      gap: 6,
      maxWidth: "calc(100% - 390px)",
      padding: "6px 7px",
      borderRadius: 15,
      border: "1px solid rgba(255,255,255,.12)",
      background:
        "linear-gradient(180deg,rgba(22,20,25,.72),rgba(13,13,17,.58))",
      boxShadow:
        "0 18px 48px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)",
      backdropFilter: "blur(18px) saturate(125%)",
      WebkitBackdropFilter: "blur(18px) saturate(125%)",
    }),
    [],
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
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
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
          * { box-sizing: border-box; }
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

          .preset-scroll::-webkit-scrollbar,
          .toolbar::-webkit-scrollbar,
          .panel-scroll::-webkit-scrollbar { display:none; }
          .preset-scroll, .toolbar, .panel-scroll { scrollbar-width:none; }

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
            .preset-dock {
              left:8px !important;
              right:8px !important;
              top:52px !important;
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

        <div className="preset-dock preset-scroll" style={presetDock}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
              padding: "0 4px 0 2px",
              color: "rgba(255,255,255,.65)",
              fontSize: 11,
              letterSpacing: ".08em",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: 99,
                background: "linear-gradient(135deg,#f1a6b9,#eac48d)",
                boxShadow: "0 0 15px rgba(239,177,159,.7)",
              }}
            />
            氛围
          </div>
          {(["自然融入", "黄昏", "雨夜", "街灯", "胶片", "梦境"] as PresetName[]).map(
            (name) => (
              <button
                key={name}
                type="button"
                onClick={() => applyPreset(name)}
                style={{
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor:
                    activePreset === name
                      ? "rgba(245,199,172,.36)"
                      : "transparent",
                  whiteSpace: "nowrap",
                  borderRadius: 10,
                  padding: "7px 10px",
                  color:
                    activePreset === name
                      ? "#fff7f1"
                      : "rgba(255,255,255,.58)",
                  background:
                    activePreset === name
                      ? "linear-gradient(135deg,rgba(242,157,179,.17),rgba(234,198,142,.14))"
                      : "transparent",
                  cursor: "pointer",
                  fontSize: 11,
                  transition: ".15s ease",
                }}
              >
                {name}
              </button>
            ),
          )}
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
                    onChange={(v) => setTransform((p) => ({ ...p, scale: v }))}
                    format={(v) => `${Math.round(v * 100)}%`}
                  />
                  <Slider
                    label="旋转"
                    value={transform.rotation}
                    min={-30}
                    max={30}
                    step={0.2}
                    onChange={(v) =>
                      setTransform((p) => ({ ...p, rotation: v }))
                    }
                    suffix="°"
                  />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                    <button
                      type="button"
                      style={smallAction}
                      onClick={() =>
                        setTransform((p) => ({ ...p, flipX: !p.flipX }))
                      }
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
              </>
            )}

            {activeTab === "空间" && (
              <>
                <Section
                  title="人物投影"
                  hint="阴影越贴合现场光向，人物越不容易像贴纸"
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
                        自动去纯色会采样图片四角作为背景色，更适合白底、绿幕、单色背景。
                        复杂背景仍建议先使用透明 PNG。
                      </div>
                    </>
                  )}
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
            disabled={!hasBoth}
            title="查看没有经过融合处理的人物叠加"
          >
            {Icons.compare}
            {showRawComposite ? "返回效果" : "未融合对比"}
          </button>
          <button
            type="button"
            style={toolbarButton}
            onClick={() =>
              setTransform((p) => ({ ...p, flipX: !p.flipX }))
            }
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
            disabled={!background}
          >
            {Icons.download}
            导出 PNG
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
          点击人物/光斑显示编辑框 · 点击空白隐藏 · 拖动人物 · 滚轮缩放 · 光斑四角自由缩放 · 拾取场景光源
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
