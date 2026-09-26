'use client';

/**
 * ============================================================================
 *  日式山间温泉旅馆 · 微缩三维小场景（Three.js / 三渲二卡通渲染）
 * ============================================================================
 *  用法：  <OnsenRyokanDiorama className="h-[720px] w-full" />
 *
 *  · 所有模型都在代码内程序化生成：几何体 + Canvas 程序化贴图，无任何外部资源
 *  · 三渲二：MeshToonMaterial + 阶梯渐变 Ramp + 反相壳（Inverted Hull）描边
 *  · 严格无穿模策略（详见文件末尾《无穿模设计约定》）：
 *      1) 所有物件均"落座"——用实测地表/支撑面高度把包围盒底面精确贴合，绝不沉入
 *      2) 建筑、屋顶、鸟居等由"分片拼装"构成，不做布尔运算，面片互不重叠
 *      3) 重复元素（松林/竹/栅栏/落石）用碰撞半径 + 最小间距排斥采样，杜绝互相插入
 *      4) 山体是整体高度场（heightfield），树石按地形采样落座，天然无自相交
 *  · 交互：左键拖拽旋转、滚轮缩放、右键平移（平移目标点被限制在底座内）
 * ============================================================================
 */

import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/* ==========================================================================
 * 0 · 类型 / 画质档位
 * ========================================================================== */

export type DioramaQuality = 'low' | 'medium' | 'high';

export interface DioramaContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  /** 回到初始机位 */
  reset: () => void;
}

export interface OnsenRyokanDioramaProps {
  className?: string;
  style?: CSSProperties;
  /** 画质档位，默认 'medium' */
  quality?: DioramaQuality;
  /** 是否开启辉光后期（three >= r152 生效，失败会静默降级），默认 true */
  bloom?: boolean;
  /** 曝光，默认 1.0 */
  exposure?: number;
  /** 自动缓慢旋转，默认 false */
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  /** 是否响应鼠标交互，默认 true */
  interactive?: boolean;
  /** 是否叠加暗角（参考图的主要特征之一），默认 true */
  vignette?: boolean;
  /** 场景构建完成回调（可用于在外部接自己的相机动画等） */
  onReady?: (ctx: DioramaContext) => void;
}

interface QualityPreset {
  pixelRatio: number;
  shadowMap: number;
  stars: number;
  pines: number;
  steam: number;
  leaves: number;
  grass: number;
}

const QUALITY: Record<DioramaQuality, QualityPreset> = {
  low: { pixelRatio: 1, shadowMap: 1024, stars: 420, pines: 26, steam: 14, leaves: 22, grass: 70 },
  medium: { pixelRatio: 1.75, shadowMap: 2048, stars: 700, pines: 40, steam: 22, leaves: 36, grass: 120 },
  high: { pixelRatio: 2, shadowMap: 2048, stars: 900, pines: 52, steam: 30, leaves: 48, grass: 170 },
};

/* ==========================================================================
 * 1 · 通用工具
 * ========================================================================== */

type Rng = () => number;
type Anim = (t: number, dt: number) => void;

/** 确定性随机：保证每次载入场景完全一致 */
function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rr = (rng: Rng, a: number, b: number) => a + (b - a) * rng();

/** 支持 edge0 > edge1（反向平滑） */
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function nonIndexed(g: THREE.BufferGeometry): THREE.BufferGeometry {
  return g.index ? g.toNonIndexed() : g;
}

/** 低多边形岩石 / 团状树冠用的"径向噪声"（只与位置有关 → 共享顶点位移一致，网格不漏） */
function radialWave(x: number, y: number, z: number, seed: number): number {
  return (
    Math.sin(x * 2.1 + seed) * Math.cos(y * 1.7 - seed * 1.3) * 0.5 +
    Math.sin(z * 2.6 + seed * 0.7) * 0.32 +
    Math.sin((x + y + z) * 3.3 + seed * 2.1) * 0.18
  );
}

/** 团状卡通树冠：球体径向起伏 → 一朵圆润的"云" */
function blobGeometry(radius: number, detail: number, amp: number, seed: number): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(radius, detail);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const f = 1 + amp * radialWave(x, y, z, seed);
    pos.setXYZ(i, x * f, y * f, z * f);
  }
  pos.needsUpdate = true;
  geo.computeBoundingSphere();
  return geo;
}

/** 低多边形石块：多面体 + 起伏 + 平面法线（棱面感） */
function rockGeometry(radius: number, seed: number, squash = 0.72, detail = 0): THREE.BufferGeometry {
  const geo = new THREE.DodecahedronGeometry(radius, detail);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const f = 1 + 0.24 * radialWave(x * 1.6, y * 1.6, z * 1.6, seed);
    pos.setXYZ(i, x * f, y * f * squash, z * f);
  }
  pos.needsUpdate = true;
  const out = geo.index ? geo.toNonIndexed() : geo;
  if (out !== geo) geo.dispose();
  out.computeVertexNormals(); // 平面法线 → 低多边形棱面
  out.computeBoundingSphere();
  return out;
}

/**
 * 沿 X 轴拉伸的棱柱（断面为 (y,z) 顶点序列）。
 * 用于：屋顶山墙三角、屋脊压顶、桥拱楔块、鸟居笠木等"分片拼装"构件。
 */
function prismX(pts: Array<[number, number]>, x0: number, x1: number): THREE.BufferGeometry {
  // 自动保证逆时针，法线朝外
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  const p = area < 0 ? pts.slice().reverse() : pts;
  const n = p.length;
  const v: number[] = [];
  const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
    v.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  };
  const at = (x: number, i: number) => new THREE.Vector3(x, p[i][0], p[i][1]);
  for (let i = 1; i < n - 1; i++) {
    tri(at(x0, 0), at(x0, i + 1), at(x0, i)); // 端面 -X
    tri(at(x1, 0), at(x1, i), at(x1, i + 1)); // 端面 +X
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    tri(at(x0, i), at(x0, j), at(x1, j));
    tri(at(x0, i), at(x1, j), at(x1, i));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}

interface MergePart {
  geo: THREE.BufferGeometry;
  matrix?: THREE.Matrix4;
  /** 顶点色（可选，用于一次 draw call 画多种颜色的小物件） */
  color?: number;
}

/** 合并几何体（自带实现，避免依赖 BufferGeometryUtils 的版本差异） */
function mergeGeos(parts: MergePart[]): THREE.BufferGeometry {
  const useColor = parts.some((p) => p.color !== undefined);
  const list = parts.map((p) => {
    const g = nonIndexed(p.geo).clone();
    if (p.matrix) g.applyMatrix4(p.matrix);
    return g;
  });
  let total = 0;
  list.forEach((g) => (total += g.attributes.position.count));
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  const uv = new Float32Array(total * 2);
  const col = useColor ? new Float32Array(total * 3) : null;
  const c = new THREE.Color();
  let o = 0;
  list.forEach((g, i) => {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array as Float32Array, o * 3);
    if (g.attributes.normal) nor.set(g.attributes.normal.array as Float32Array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array as Float32Array, o * 2);
    if (col) {
      c.set(parts[i].color === undefined ? 0xffffff : (parts[i].color as number));
      for (let k = 0; k < n; k++) {
        col[(o + k) * 3] = c.r;
        col[(o + k) * 3 + 1] = c.g;
        col[(o + k) * 3 + 2] = c.b;
      }
    }
    o += n;
    g.dispose();
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (col) out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}

/** 沿法线外扩一份几何体，配合 BackSide 材质做描边 */
function expandHull(geo: THREE.BufferGeometry, t: number): THREE.BufferGeometry {
  const g = nonIndexed(geo).clone();
  const pos = g.attributes.position as THREE.BufferAttribute;
  const nor = g.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(i, pos.getX(i) + nor.getX(i) * t, pos.getY(i) + nor.getY(i) * t, pos.getZ(i) + nor.getZ(i) * t);
  }
  pos.needsUpdate = true;
  g.computeBoundingSphere();
  return g;
}

const _box = new THREE.Box3();
const _v3 = new THREE.Vector3();

/** 计算物体"实体"最低点（忽略描边壳，保证落座高度准确） */
function solidMinY(obj: THREE.Object3D): number {
  let min = Infinity;
  obj.updateMatrixWorld(true);
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.geometry) return;
    if (m.userData.isOutline) return;
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    _box.copy(m.geometry.boundingBox as THREE.Box3).applyMatrix4(m.matrixWorld);
    if (_box.min.y < min) min = _box.min.y;
  });
  return min;
}

/** 落座：把物体的最低点精确贴合到 baseY（严格不沉入支撑面） */
function seatOn(obj: THREE.Object3D, baseY: number): void {
  const min = solidMinY(obj);
  if (Number.isFinite(min)) obj.position.y += baseY - min;
}

/** 落座（相对父级，父级只有平移时为等价） */
function seatXZ(obj: THREE.Object3D, x: number, z: number, baseY: number): void {
  obj.position.x = x;
  obj.position.z = z;
  seatOn(obj, baseY);
}

/** XZ 平面半径碰撞判定 */
interface Disc {
  x: number;
  z: number;
  r: number;
}
function hitDiscs(x: number, z: number, r: number, list: Disc[]): boolean {
  for (let i = 0; i < list.length; i++) {
    const d = list[i];
    const dx = x - d.x, dz = z - d.z;
    if (dx * dx + dz * dz < (r + d.r) * (r + d.r)) return true;
  }
  return false;
}

/* ==========================================================================
 * 2 · 程序化贴图（Canvas 生成，无外部资源）
 * ========================================================================== */

type Ctx2D = CanvasRenderingContext2D;

function makeTex(
  w: number,
  h: number,
  draw: (ctx: Ctx2D, w: number, h: number) => void,
  repeat = true,
): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d') as Ctx2D;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(cv);
  const anyThree = THREE as unknown as { SRGBColorSpace?: string };
  if (anyThree.SRGBColorSpace) (tex as unknown as { colorSpace: string }).colorSpace = anyThree.SRGBColorSpace;
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

interface TextureSet {
  sky: THREE.CanvasTexture;
  disc: THREE.CanvasTexture;
  moon: THREE.CanvasTexture;
  cloud: THREE.CanvasTexture;
  shoji: THREE.CanvasTexture;
  roof: THREE.CanvasTexture;
  woodWall: THREE.CanvasTexture;
  woodPost: THREE.CanvasTexture;
  tatami: THREE.CanvasTexture;
  sand: THREE.CanvasTexture;
  gravel: THREE.CanvasTexture;
  stone: THREE.CanvasTexture;
  soil: THREE.CanvasTexture;
  water: THREE.CanvasTexture;
  noren: THREE.CanvasTexture;
  scroll: THREE.CanvasTexture;
  leaf: THREE.CanvasTexture;
  moss: THREE.CanvasTexture;
  vignette: THREE.CanvasTexture;
}

function createTextures(): TextureSet {
  /* 夜空渐变（球体内壁，上下渐变 = 天顶深紫 → 地平线紫红余晖） */
  const sky = makeTex(
    8,
    512,
    (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0.0, '#333856');
      g.addColorStop(0.26, '#3b3d62');
      g.addColorStop(0.5, '#4b4468');
      g.addColorStop(0.72, '#665275');
      g.addColorStop(0.88, '#8a7089');
      g.addColorStop(1.0, '#4e4260');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
    false,
  );

  /* 通用柔光圆点（星光 / 蒸汽 / 灯光辉光 / 灯笼光晕） */
  const disc = makeTex(128, 128, (ctx, w) => {
    const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.14)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
  }, false);

  /* 月亮 */
  const moon = makeTex(128, 128, (ctx, w) => {
    const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w * 0.5);
    g.addColorStop(0, '#fffdf4');
    g.addColorStop(0.62, '#f3ecd8');
    g.addColorStop(0.9, '#cfc6d8');
    g.addColorStop(1, 'rgba(150,140,180,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = '#9a90b0';
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(w / 2 + Math.cos(a) * w * 0.17, w / 2 + Math.sin(a) * w * 0.17, w * (0.05 + 0.04 * ((i * 37) % 5) / 5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, false);

  /* 云絮（夜色薄云，加色混合） */
  const cloud = makeTex(256, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      const x = (i * 97) % w;
      const y = h * 0.5 + Math.sin(i * 1.7) * h * 0.2;
      const r = 18 + ((i * 53) % 34);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(190,175,235,0.30)');
      g.addColorStop(1, 'rgba(190,175,235,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }, true);

  /* 障子纸（细腻纤维感，实际使用会调成半透明） */
  const shoji = makeTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#f6ecd8';
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.05;
    ctx.strokeStyle = '#c9b48c';
    for (let i = 0; i < 90; i++) {
      const x = (i * 31) % w;
      const y = (i * 57) % h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 6 + (i % 5), y + ((i % 3) - 1) * 3);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.09;
    ctx.fillStyle = '#b39a6e';
    for (let i = 0; i < 40; i++) ctx.fillRect((i * 71) % w, (i * 43) % h, 2, 2);
    ctx.globalAlpha = 1;
  });

  /* 和瓦（桟瓦）：瓦棱沿坡面方向贯通 + 每段瓦头横向搭接并投影
     画布 u ↔ 屋顶宽度方向，画布 v ↔ 沿坡面方向
     （CanvasTexture 默认 flipY：画布上方 = v 大 = 檐口一侧，画布下方 = 屋脊一侧）
     段边界画在 (r+0.5)·rh 处，跨 RepeatWrapping 拼接时相位一致、不会出现接缝 */
  const roof = makeTex(256, 256, (ctx, w, h) => {
    const cols = 4, rows = 4;
    const cw = w / cols, rh = h / rows;
    ctx.fillStyle = '#3c466b';
    ctx.fillRect(0, 0, w, h);

    // 瓦面：沿坡面由檐口向屋脊由亮转暗 + 每片手作色差
    for (let r = -1; r <= rows; r++) {
      const y0 = (r + 0.5) * rh;
      for (let c = 0; c < cols; c++) {
        const t = ((r * 7 + c * 13) % 5) / 5;
        const g = ctx.createLinearGradient(0, y0, 0, y0 + rh);
        g.addColorStop(0, `rgb(${Math.round(126 + t * 22)},${Math.round(142 + t * 22)},${Math.round(186 + t * 24)})`);
        g.addColorStop(0.5, `rgb(${Math.round(92 + t * 16)},${Math.round(104 + t * 16)},${Math.round(142 + t * 18)})`);
        g.addColorStop(1, `rgb(${Math.round(60 + t * 14)},${Math.round(70 + t * 14)},${Math.round(98 + t * 16)})`);
        ctx.fillStyle = g;
        ctx.fillRect(c * cw, y0, cw, rh);
      }
    }

    // 竖瓦棱（丸瓦の稜）：沿坡面方向贯通，是"瓦朝下"的关键视觉特征
    const rib = (x: number) => {
      const g = ctx.createLinearGradient(x - 10, 0, x + 10, 0);
      g.addColorStop(0, 'rgba(8,10,20,0.55)');
      g.addColorStop(0.3, 'rgba(120,138,180,0.35)');
      g.addColorStop(0.48, 'rgba(206,222,252,0.5)');
      g.addColorStop(0.62, 'rgba(120,138,180,0.3)');
      g.addColorStop(1, 'rgba(8,10,20,0.5)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 10, 0, 20, h);
    };
    for (let c = 0; c < cols; c++) rib((c + 0.5) * cw);
    rib(w - cw * 0.5);

    // 段边界：搭接阴影（檐口侧）+ 瓦头圆弧高光
    for (let r = 0; r < rows; r++) {
      const y = (r + 0.5) * rh;
      const sg = ctx.createLinearGradient(0, y - rh * 0.3, 0, y);
      sg.addColorStop(0, 'rgba(6,8,18,0)');
      sg.addColorStop(1, 'rgba(6,8,18,0.6)');
      ctx.fillStyle = sg;
      ctx.fillRect(0, y - rh * 0.3, w, rh * 0.3);
      ctx.strokeStyle = 'rgba(206,222,252,0.34)';
      ctx.lineWidth = 2;
      for (let c = 0; c < cols; c++) {
        const x = c * cw;
        ctx.beginPath();
        ctx.moveTo(x + 3, y);
        ctx.quadraticCurveTo(x + cw / 2, y - rh * 0.1, x + cw - 3, y);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(8,10,20,0.35)';
      ctx.fillRect(0, y + 1, w, 1.5);
    }
  });

  /* 竖向木板墙 */
  const woodWall = makeTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#6d4b36';
    ctx.fillRect(0, 0, w, h);
    const planks = 8;
    const pw = w / planks;
    for (let i = 0; i < planks; i++) {
      const t = ((i * 41) % 7) / 7;
      ctx.fillStyle = `rgb(${Math.round(96 + t * 26)},${Math.round(66 + t * 20)},${Math.round(48 + t * 16)})`;
      ctx.fillRect(i * pw, 0, pw - 1, h);
      ctx.fillStyle = 'rgba(30,18,12,0.55)';
      ctx.fillRect(i * pw + pw - 1.6, 0, 1.6, h);
      ctx.globalAlpha = 0.14;
      ctx.strokeStyle = '#3a2418';
      for (let k = 0; k < 5; k++) {
        const x = i * pw + 3 + ((k * 29) % (pw - 5));
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 1.5, h);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  });

  /* 木柱 / 梁（深色木纹） */
  const woodPost = makeTex(128, 256, (ctx, w, h) => {
    ctx.fillStyle = '#4a3122';
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.22;
    for (let i = 0; i < 26; i++) {
      ctx.strokeStyle = i % 3 === 0 ? '#7a5537' : '#2c1c12';
      ctx.lineWidth = 1 + (i % 2);
      const x = (i * 23) % w;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + 3, h * 0.33, x - 3, h * 0.66, x + 1, h);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });

  /* 榻榻米：草编纹 + 席边 */
  const tatami = makeTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#c8bd8a';
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = '#a99a63';
    for (let i = 0; i < 64; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * 2);
      ctx.lineTo(w, i * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = '#8d7f4e';
    for (let i = 0; i < 32; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 4, 0);
      ctx.lineTo(i * 4, h);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // 席边（黑边 + 纹样）
    const b = 7;
    ctx.fillStyle = '#2f2a24';
    ctx.fillRect(0, 0, w, b);
    ctx.fillRect(0, h - b, w, b);
    ctx.fillRect(0, 0, b, h);
    ctx.fillRect(w - b, 0, b, h);
    ctx.strokeStyle = 'rgba(214,196,140,0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(b + 1.5, b + 1.5, w - 2 * b - 3, h - 2 * b - 3);
  });

  /* 枯山水耙沙（同心波纹由 drawSand 依据石头实际位置绘制） */
  const sand = makeTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#ded6c0';
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.05;
    for (let i = 0; i < 1600; i++) {
      ctx.fillStyle = i % 2 ? '#b8ad92' : '#f3ecdb';
      ctx.fillRect((i * 137) % w, (i * 311) % h, 2, 2);
    }
    ctx.globalAlpha = 1;
  });

  /* 碎石 / 砾石地面 */
  const gravel = makeTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#6a6559';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 340; i++) {
      const x = (i * 61) % w;
      const y = (i * 113) % h;
      const r = 1.4 + ((i * 7) % 5) * 0.5;
      const l = 78 + ((i * 37) % 11) * 4;
      ctx.fillStyle = `rgb(${l},${l - 4},${l - 12})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  /* 石材 */
  const stone = makeTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#8c8a90';
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.16;
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = i % 2 ? '#6f6d76' : '#a9a7ad';
      ctx.beginPath();
      ctx.arc((i * 47) % w, (i * 89) % h, 2 + ((i * 13) % 9), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.1;
    ctx.strokeStyle = '#5c5a63';
    for (let i = 0; i < 14; i++) {
      ctx.beginPath();
      ctx.moveTo(0, (i * 37) % h);
      ctx.bezierCurveTo(w * 0.3, (i * 53) % h, w * 0.7, (i * 19) % h, w, (i * 71) % h);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });

  /* 底座表土 */
  const soil = makeTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#3c3630';
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = i % 3 === 0 ? '#4d463c' : i % 3 === 1 ? '#2e2a25' : '#5a5148';
      ctx.beginPath();
      ctx.arc((i * 53) % w, (i * 97) % h, 1.5 + ((i * 11) % 7), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  });

  /* 水面（夜色映照，配合涟漪环使用） */
  const water = makeTex(256, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#5f7bb5');
    g.addColorStop(0.45, '#3d5488');
    g.addColorStop(1, '#2b3a63');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = '#9fb6e0';
    for (let i = 0; i < 22; i++) {
      ctx.beginPath();
      ctx.moveTo(0, (i * 6.3) % h);
      ctx.bezierCurveTo(w * 0.35, ((i * 6.3) % h) - 4, w * 0.65, ((i * 6.3) % h) + 4, w, (i * 6.3) % h);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });

  /* 暖帘（藏青布 + 白色汤字纹样 + 分片缝） */
  const noren = makeTex(128, 64, (ctx, w, h) => {
    ctx.fillStyle = '#26365e';
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 200; i++) {
      ctx.fillStyle = i % 2 ? '#1b2846' : '#33456f';
      ctx.fillRect((i * 43) % w, (i * 67) % h, 3, 1);
    }
    ctx.globalAlpha = 1;
    // 三片布的分缝
    ctx.fillStyle = 'rgba(10,16,32,0.75)';
    for (let i = 1; i < 3; i++) ctx.fillRect((w / 3) * i - 1, 0, 2, h);
    // 白色圆形汤纹
    ctx.strokeStyle = 'rgba(240,244,255,0.9)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.46, h * 0.19, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.46, h * 0.1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w / 2 - h * 0.31, h * 0.2);
    ctx.quadraticCurveTo(w / 2, h * 0.05, w / 2 + h * 0.31, h * 0.2);
    ctx.stroke();
  });

  /* 挂轴（水墨远山与月） */
  const scroll = makeTex(64, 128, (ctx, w, h) => {
    ctx.fillStyle = '#e8dfc6';
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#c3b391';
    for (let i = 0; i < 60; i++) ctx.fillRect((i * 29) % w, (i * 47) % h, 4, 1);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(40,44,52,0.85)';
    ctx.fillStyle = 'rgba(52,58,70,0.85)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); // 远山
    ctx.moveTo(6, h * 0.62);
    ctx.quadraticCurveTo(w * 0.34, h * 0.4, w * 0.52, h * 0.6);
    ctx.quadraticCurveTo(w * 0.7, h * 0.76, w - 6, h * 0.56);
    ctx.lineTo(w - 6, h * 0.72);
    ctx.lineTo(6, h * 0.72);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.8;
    ctx.beginPath(); // 月
    ctx.arc(w * 0.68, h * 0.3, 6.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  });

  /* 单片红叶（用于飘落叶片 / 地面落叶） */
  const leaf = makeTex(64, 64, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#ffd08a');
    g.addColorStop(0.5, '#e8623c');
    g.addColorStop(1, '#a8322c');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(w / 2, h * 0.04);
    ctx.bezierCurveTo(w * 0.98, h * 0.3, w * 0.9, h * 0.78, w / 2, h * 0.97);
    ctx.bezierCurveTo(w * 0.1, h * 0.78, w * 0.02, h * 0.3, w / 2, h * 0.04);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,30,26,0.7)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(w / 2, h * 0.08);
    ctx.lineTo(w / 2, h * 0.94);
    ctx.stroke();
  }, false);

  /* 苔藓斑块（带 alpha 的不规则边） */
  const moss = makeTex(128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#3f5a3a';
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2;
      const r = w * (0.3 + 0.1 * Math.sin(i * 2.3));
      ctx.beginPath();
      ctx.arc(w / 2 + Math.cos(a) * r * 0.55, w / 2 + Math.sin(a) * r * 0.55, w * 0.13, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#5b7d4a';
    for (let i = 0; i < 60; i++) {
      ctx.beginPath();
      ctx.arc((i * 53) % w, (i * 89) % h, 3 + ((i * 7) % 5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, false);

  /* 暗角（相机前全屏片用，中心透明 → 边缘压暗；参考图里中心/边缘亮度比约 1.2~1.3） */
  const vignette = makeTex(256, 256, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, w * 0.16, w / 2, h / 2, w * 0.66);
    g.addColorStop(0, 'rgba(3,2,12,0)');
    g.addColorStop(0.55, 'rgba(3,2,12,0.055)');
    g.addColorStop(0.8, 'rgba(3,2,12,0.16)');
    g.addColorStop(1, 'rgba(3,2,12,0.4)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }, false);

  return { sky, disc, moon, cloud, shoji, roof, woodWall, woodPost, tatami, sand, gravel, stone, soil, water, noren, scroll, leaf, moss, vignette };
}

/* ==========================================================================
 * 3 · 材质库（三渲二：Toon + 阶梯 Ramp）
 * ========================================================================== */

function rampTexture(steps: number[]): THREE.DataTexture {
  const data = new Uint8Array(steps);
  const tex = new THREE.DataTexture(data, steps.length, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

interface Mats {
  ramp: THREE.DataTexture;
  outline: THREE.MeshBasicMaterial;
  wallWood: THREE.MeshToonMaterial;
  woodPost: THREE.MeshToonMaterial;
  woodLight: THREE.MeshToonMaterial;
  woodRed: THREE.MeshToonMaterial;
  plaster: THREE.MeshToonMaterial;
  roof: THREE.MeshToonMaterial;
  roofTrim: THREE.MeshToonMaterial;
  stone: THREE.MeshToonMaterial;
  stoneDark: THREE.MeshToonMaterial;
  rock: THREE.MeshToonMaterial;
  rockWet: THREE.MeshToonMaterial;
  gravel: THREE.MeshToonMaterial;
  sand: THREE.MeshToonMaterial;
  soil: THREE.MeshToonMaterial;
  soilDark: THREE.MeshToonMaterial;
  moss: THREE.MeshToonMaterial;
  tatami: THREE.MeshToonMaterial;
  paper: THREE.MeshBasicMaterial;
  glass: THREE.MeshBasicMaterial;
  water: THREE.MeshBasicMaterial;
  waterHot: THREE.MeshBasicMaterial;
  ripple: THREE.MeshBasicMaterial;
  foam: THREE.MeshBasicMaterial;
  pineDark: THREE.MeshToonMaterial;
  pineMid: THREE.MeshToonMaterial;
  leafRed: THREE.MeshToonMaterial;
  leafOrange: THREE.MeshToonMaterial;
  leafGreen: THREE.MeshToonMaterial;
  leafTeal: THREE.MeshToonMaterial;
  bamboo: THREE.MeshToonMaterial;
  lampWarm: THREE.MeshBasicMaterial;
  lampPaper: THREE.MeshBasicMaterial;
  displayGlow: THREE.MeshBasicMaterial;
  metal: THREE.MeshToonMaterial;
  cloth: THREE.MeshToonMaterial;
  noren: THREE.MeshToonMaterial;
  scroll: THREE.MeshToonMaterial;
  bark: THREE.MeshToonMaterial;
  misc: THREE.MeshToonMaterial;
  colorful: THREE.MeshToonMaterial;
}

function createMaterials(tex: TextureSet): Mats {
  const ramp = rampTexture([64, 122, 176, 222, 255]);
  const toon = (
    color: number,
    opts: {
      map?: THREE.Texture;
      emissive?: number;
      emissiveIntensity?: number;
      transparent?: boolean;
      opacity?: number;
      side?: THREE.Side;
      vertexColors?: boolean;
      flat?: boolean;
    } = {},
  ) => {
    const m = new THREE.MeshToonMaterial({ color, gradientMap: ramp });
    if (opts.map) m.map = opts.map; // 只在确有贴图时赋值，避免 three 的参数告警
    if (opts.transparent !== undefined) m.transparent = opts.transparent;
    if (opts.opacity !== undefined) m.opacity = opts.opacity;
    if (opts.side !== undefined) m.side = opts.side;
    if (opts.vertexColors !== undefined) m.vertexColors = opts.vertexColors;
    if (opts.emissive !== undefined) {
      m.emissive = new THREE.Color(opts.emissive);
      m.emissiveIntensity = opts.emissiveIntensity ?? 1;
    }
    return m;
  };

  const outline = new THREE.MeshBasicMaterial({ color: 0x170f28, side: THREE.BackSide });

  return {
    ramp,
    outline,
    wallWood: toon(0xffffff, { map: tex.woodWall }),
    woodPost: toon(0xffffff, { map: tex.woodPost }),
    woodLight: toon(0xa9855e, { map: tex.woodPost }),
    woodRed: toon(0x8c3b34, { map: tex.woodPost }),
    plaster: toon(0xd8cbb0),
    roof: toon(0xffffff, { map: tex.roof }),
    roofTrim: toon(0x2b2438),
    stone: toon(0xffffff, { map: tex.stone }),
    stoneDark: toon(0x6b6a74, { map: tex.stone }),
    rock: toon(0x7c7a86),
    rockWet: toon(0x555463),
    gravel: toon(0xffffff, { map: tex.gravel }),
    sand: toon(0xffffff, { map: tex.sand }),
    soil: toon(0xffffff, { map: tex.soil }),
    soilDark: toon(0x4a4038),
    moss: toon(0xffffff, { map: tex.moss, transparent: true }),
    tatami: toon(0xffffff, { map: tex.tatami }),
    // 障子纸：半透明 + 微微自发光 → 从室外看是"被室内灯光照亮的纸"，同时能看清屋内
    paper: new THREE.MeshBasicMaterial({
      map: tex.shoji,
      color: 0xffd9a0,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    glass: new THREE.MeshBasicMaterial({
      color: 0xbfe0ff,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    water: new THREE.MeshBasicMaterial({ map: tex.water, color: 0xb9c8ee, transparent: true, opacity: 0.82 }),
    waterHot: new THREE.MeshBasicMaterial({ map: tex.water, color: 0xd6e2f2, transparent: true, opacity: 0.9 }),
    ripple: new THREE.MeshBasicMaterial({
      color: 0xdce8ff,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }),
    foam: new THREE.MeshBasicMaterial({
      color: 0xe8f0ff,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }),
    pineDark: toon(0x233a36),
    pineMid: toon(0x2c4f4c),
    leafRed: toon(0xc2452f),
    leafOrange: toon(0xd97a35),
    leafGreen: toon(0x3d5f5b),
    leafTeal: toon(0x37585f),
    bamboo: toon(0x47635c),
    lampWarm: new THREE.MeshBasicMaterial({ color: 0xffcf8a }),
    lampPaper: new THREE.MeshBasicMaterial({ color: 0xffb867, transparent: true, opacity: 0.85 }),
    displayGlow: new THREE.MeshBasicMaterial({ color: 0xcfe8ff }),
    metal: toon(0x8e93a6),
    cloth: toon(0x9a3f4a),
    noren: toon(0xffffff, { map: tex.noren, side: THREE.DoubleSide }),
    scroll: toon(0xffffff, { map: tex.scroll, side: THREE.DoubleSide }),
    bark: toon(0x4a3a2c),
    misc: toon(0x6b6f7d),
    colorful: toon(0xffffff, { vertexColors: true }),
  };
}

/* ==========================================================================
 * 4 · 场景布局常量（所有关键坐标集中在此，"无穿模"靠这些数值保证）
 * ========================================================================== */

const BASE_HALF = 8; // 底座 16 × 16
const L0 = { y0: -0.2, y1: 0 }; // 表土层（会被挖出溪流槽）
const L1 = { y0: -0.5, y1: -0.2, half: BASE_HALF + 0.35 };
const L2 = { y0: -0.78, y1: -0.5, half: BASE_HALF + 0.7 };

/** 溪流槽（矩形缺口） */
const CHAN = { x0: -5.0, x1: -3.8, z0: -2.9, z1: 4.7 };
/** 溪流尽头的水潭（比溪流槽向右扩展） */
const POND = { x0: -5.0, x1: -3.0, z0: 4.7, z1: 5.9 };
const CHAN_FLOOR = -0.2;
const STREAM_Y = -0.06; // 溪流水面高度

/** 主屋（一层） */
const H = {
  x0: -2.4,
  x1: 1.4,
  z0: -1.75,
  z1: 1.45,
  t: 0.12, // 墙厚
  plinthOut: 0.14, // 基座外扩
  plinthTop: 0.42,
  tatamiTop: 0.5,
  wallTop: 1.92,
  winBottom: 0.62,
  winTop: 1.78,
  // 二层
  uX0: -2.15,
  uX1: 1.15,
  uZ0: -1.5,
  uZ1: 1.2,
  uFloorY: 1.92,
  uSlabY: 2.02,
  uWallTop: 3.15,
  // 主屋顶（切妻）
  tanA: 0.62,
  roofT: 0.09,
  eave: 0.45,
  ridgeZ: -0.15,
};
H.ridgeZ = (H.uZ0 + H.uZ1) / 2;

const RIDGE_TOP = H.uWallTop + ((H.uZ1 - H.uZ0) / 2) * H.tanA + H.roofT / Math.cos(Math.atan(H.tanA));

/** 缘侧（外廊） */
const ENGAWA = { z0: H.z1 + H.plinthOut, z1: H.z1 + H.plinthOut + 0.72, deckTop: 0.4, deckT: 0.1 };

/** 露天温泉 */
const ONSEN = { cx: 3.6, cz: 2.6, innerR: 1.15, outerR: 1.5, deckTop: 0.34, waterY: 0.26 };

/** 鸟居（正对主屋中央障子，框住入口） */
const TORII = { cx: -0.5, cz: 5.3, halfSpan: 0.8, pillarR: 0.09, pillarH: 1.62 };

/** 枯山水石庭 */
const SAND = { x0: -3.6, x1: -1.4, z0: 2.6, z1: 4.6, h: 0.05 };

/** 参道（石板路）：正对主屋中央开口 */
const PATH = { cx: -0.5, halfW: 0.55, z0: 2.75, z1: 7.45 };

/* --------------------------------------------------------------------------
 * 山体高度场（整体一块，天然不自相交）
 * ------------------------------------------------------------------------ */
const HILL = { z0: -6, z1: -2.9, seg: 48, segZ: 16 };

function hillRaw(x: number, z: number): number {
  const rise = smoothstep(-2.9, -4.4, z);
  const fall = smoothstep(-4.9, -6.0, z);
  const zProfile = rise * (1 - 0.82 * fall);
  const xProfile = 0.26 + 0.74 * smoothstep(-BASE_HALF, -BASE_HALF + 1.0, x) * smoothstep(BASE_HALF, BASE_HALF - 1.0, x);
  const mound =
    0.3 * Math.exp(-(((x - 3.1) ** 2) / 7 + ((z + 4.5) ** 2) / 1.4)) +
    0.26 * Math.exp(-(((x + 3.4) ** 2) / 6 + ((z + 5.0) ** 2) / 1.2)) +
    0.18 * Math.exp(-(((x + 0.4) ** 2) / 9 + ((z + 3.9) ** 2) / 1.0));
  const h = (zProfile * xProfile) * 1.42 + mound * rise;
  // 边缘强制归零 → 与表土层完美衔接，不产生薄片断口
  const edge =
    smoothstep(-BASE_HALF, -BASE_HALF + 0.65, z) *
    smoothstep(BASE_HALF, BASE_HALF - 0.9, x) *
    smoothstep(-BASE_HALF, -BASE_HALF + 0.9, x);
  return h * edge;
}

const HILL_GRID_X = (BASE_HALF * 2) / HILL.seg;
const HILL_GRID_Z = (HILL.z1 - HILL.z0) / HILL.segZ;

/** 地表高度（对"网格顶点"取包围范围内的最大值 → 保证落座物体永不沉入网格面） */
function groundTop(x: number, z: number, radius = 0): number {
  let max = -Infinity;
  const i0 = Math.floor((x - radius + BASE_HALF) / HILL_GRID_X);
  const i1 = Math.ceil((x + radius + BASE_HALF) / HILL_GRID_X);
  const j0 = Math.floor((z - radius - HILL.z0) / HILL_GRID_Z);
  const j1 = Math.ceil((z + radius - HILL.z0) / HILL_GRID_Z);
  for (let i = i0; i <= i1; i++) {
    for (let j = j0; j <= j1; j++) {
      const gx = -BASE_HALF + i * HILL_GRID_X;
      const gz = HILL.z0 + j * HILL_GRID_Z;
      if (gx < -BASE_HALF - 1e-6 || gx > BASE_HALF + 1e-6) continue;
      if (gz < HILL.z0 - 1e-6 || gz > HILL.z1 + 1e-6) continue;
      const h = hillRaw(gx, gz);
      if (h > max) max = h;
    }
  }
  if (!Number.isFinite(max)) max = 0;
  return Math.max(0, max);
}

/**
 * 落座高度（按中心点解析值，用于地形上的岩块/植被：配合微量下埋消除坡度悬浮）
 */
function groundSeat(x: number, z: number, radius = 0.15): number {
  return groundTop(x, z, radius);
}

const _seatRay = new THREE.Raycaster();
const _seatFrom = new THREE.Vector3();
const _seatDown = new THREE.Vector3(0, -1, 0);

/**
 * 精确地表高度：直接对地形网格做向下射线求交。
 * 解析高度 hillRaw 与取网格顶点最大值都不准——前者在凹陷处高于实际三角面，
 * 后者在陡坡上会高估整整一个网格单元，两者都会让物件悬空。
 */
function groundY(ctx: BuildCtx, x: number, z: number, fallback = 0): number {
  const mesh = ctx.hillMesh;
  if (!mesh) return fallback;
  _seatFrom.set(x, 30, z);
  _seatRay.set(_seatFrom, _seatDown);
  _seatRay.far = 60;
  const hit = _seatRay.intersectObject(mesh, false)[0];
  return hit ? hit.point.y : fallback;
}

/* ==========================================================================
 * 5 · 渲染辅助（描边、建组）
 * ========================================================================== */

interface BuildCtx {
  rng: Rng;
  tex: TextureSet;
  mats: Mats;
  anims: Anim[];
  q: QualityPreset;
  /** 全局"不可占用"圆盘（用于散布采样时避让建筑/庭院） */
  blocked: Disc[];
  /** 地形网格（用于射线求交取精确地表高度） */
  hillMesh?: THREE.Mesh;
}

function addOutline(parent: THREE.Object3D, mesh: THREE.Mesh, thickness: number, mats: Mats): void {
  const geo = expandHull(mesh.geometry as THREE.BufferGeometry, thickness);
  const ol = new THREE.Mesh(geo, mats.outline);
  ol.userData.isOutline = true;
  ol.castShadow = false;
  ol.receiveShadow = false;
  ol.renderOrder = -1;
  mesh.add(ol);
}

interface AddOpts {
  cast?: boolean;
  receive?: boolean;
  outline?: number;
  x?: number;
  y?: number;
  z?: number;
  rx?: number;
  ry?: number;
  rz?: number;
  sx?: number;
  sy?: number;
  sz?: number;
  name?: string;
}

function add(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  opts: AddOpts = {},
  mats?: Mats,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = opts.cast !== false;
  mesh.receiveShadow = opts.receive !== false;
  if (opts.x !== undefined) mesh.position.x = opts.x;
  if (opts.y !== undefined) mesh.position.y = opts.y;
  if (opts.z !== undefined) mesh.position.z = opts.z;
  if (opts.rx) mesh.rotation.x = opts.rx;
  if (opts.ry) mesh.rotation.y = opts.ry;
  if (opts.rz) mesh.rotation.z = opts.rz;
  if (opts.sx !== undefined || opts.sy !== undefined || opts.sz !== undefined) {
    mesh.scale.set(opts.sx ?? 1, opts.sy ?? 1, opts.sz ?? 1);
  }
  if (opts.name) mesh.name = opts.name;
  parent.add(mesh);
  if (opts.outline && mats) addOutline(parent, mesh, opts.outline, mats);
  return mesh;
}

/** 共享矩阵的实例化描边 */
function addInstancedOutline(mesh: THREE.InstancedMesh, thickness: number, mats: Mats): void {
  const geo = expandHull(mesh.geometry as THREE.BufferGeometry, thickness);
  const ol = new THREE.InstancedMesh(geo, mats.outline, mesh.count);
  ol.instanceMatrix = mesh.instanceMatrix;
  ol.userData.isOutline = true;
  ol.castShadow = false;
  ol.receiveShadow = false;
  ol.frustumCulled = false;
  mesh.add(ol);
}

const M4 = new THREE.Matrix4();
const Q4 = new THREE.Quaternion();
const E3 = new THREE.Euler();
const V3 = new THREE.Vector3();
const S3 = new THREE.Vector3();

/** 把 UV 重写为"世界尺度"（每 uvScale 个世界单位重复一次），让大面共用同一材质仍保持密度一致 */
function worldUV(geo: THREE.BufferGeometry, scale: number): void {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const nor = geo.attributes.normal as THREE.BufferAttribute;
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i)), nz = Math.abs(nor.getZ(i));
    let u: number, v: number;
    if (ny > nx && ny > nz) {
      u = pos.getX(i);
      v = pos.getZ(i);
    } else if (nx >= nz) {
      u = pos.getZ(i);
      v = pos.getY(i);
    } else {
      u = pos.getX(i);
      v = pos.getY(i);
    }
    uv.setXY(i, u / scale, v / scale);
  }
  uv.needsUpdate = true;
}

/** 带世界尺度 UV 的盒子（已平移到目标位置，便于直接合并） */
function boxG(w: number, h: number, d: number, x: number, y: number, z: number, uvScale = 1): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  worldUV(g, uvScale);
  g.translate(x, y, z);
  return g;
}

/** 区间切分：返回 count 个开口 + count+1 个柱（严丝合缝，不重叠） */
function splitSegments(a: number, b: number, count: number, pillar: number) {
  const open = (b - a - (count + 1) * pillar) / count;
  const pillars: Array<[number, number]> = [];
  const openings: Array<[number, number]> = [];
  let x = a;
  for (let i = 0; i < count; i++) {
    pillars.push([x, x + pillar]);
    x += pillar;
    openings.push([x, x + open]);
    x += open;
  }
  pillars.push([x, x + pillar]);
  return { pillars, openings };
}

/* ==========================================================================
 * 6 · 底座 + 山体
 * ========================================================================== */

function buildBase(ctx: BuildCtx): THREE.Group {
  const g = new THREE.Group();
  g.name = 'base';

  // 三层叠涩底座（微缩模型底座感）
  add(g, boxG(L2.half * 2, L2.y1 - L2.y0, L2.half * 2, 0, (L2.y0 + L2.y1) / 2, 0, 2.2), ctx.mats.stoneDark, { outline: 0.016 }, ctx.mats);
  add(g, boxG(L1.half * 2, L1.y1 - L1.y0, L1.half * 2, 0, (L1.y0 + L1.y1) / 2, 0, 2.2), ctx.mats.stoneDark, { outline: 0.016, cast: false }, ctx.mats);

  // 表土层：绕着"溪流槽 + 水潭"拼出 6 块，恰好铺满 12×12 的剩余面积（无重叠、无缝）
  const yMid = (L0.y0 + L0.y1) / 2, yH = L0.y1 - L0.y0;
  const E = BASE_HALF;
  const pieces: Array<[number, number, number, number]> = [
    [-E, CHAN.x0, -E, E], // 溪流左侧整条
    [CHAN.x1, E, -E, POND.z0], // 溪流右侧（至水潭前沿）
    [CHAN.x0, CHAN.x1, -E, CHAN.z0], // 溪流尾端之后
    [CHAN.x0, CHAN.x1, POND.z1, E], // 水潭之后
    [CHAN.x1, POND.x1, POND.z1, E], // 水潭右后补角
    [POND.x1, E, POND.z0, E], // 水潭右侧大块
  ];
  const groundGeo = mergeGeos(
    pieces.map(([x0, x1, z0, z1]) => ({
      geo: boxG(x1 - x0, yH, z1 - z0, (x0 + x1) / 2, yMid, (z0 + z1) / 2, 1.6),
    })),
  );
  add(g, groundGeo, ctx.mats.soil, { outline: 0.014, cast: false }, ctx.mats);

  return g;
}

/** 山脊裸岩（同时作为散布采样的碰撞体，避免松树长进岩石里）
 *  坐标已避让溪流源头瀑布岩组（-4.4,-3.48）/（-3.5,-4.5）/（-5.3,-4.45） */
const HILL_ROCKS: Array<[number, number, number, number]> = [
  [-1.2, -3.6, 0.34, 31],
  [1.9, -3.9, 0.46, 41],
  [3.4, -4.5, 0.62, 51],
  [4.9, -3.4, 0.36, 61],
  [-2.2, -5.2, 0.44, 71],
  [0.6, -5.4, 0.5, 81],
  [5.6, -5.0, 0.4, 91],
  [-4.6, -5.6, 0.4, 101],
];

function buildHill(ctx: BuildCtx): THREE.Group {
  const g = new THREE.Group();
  g.name = 'hill';

  const geo = new THREE.PlaneGeometry(BASE_HALF * 2, HILL.z1 - HILL.z0, HILL.seg, HILL.segZ);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i) + (HILL.z0 + HILL.z1) / 2; // 平移到 z0..z1
    pos.setZ(i, z);
    pos.setY(i, hillRaw(x, z));
  }
  pos.needsUpdate = true;
  worldUV(geo, 1.4);
  geo.computeVertexNormals();
  const hills = add(g, geo, ctx.mats.soil, { cast: false, outline: 0.0 }, ctx.mats);
  hills.receiveShadow = true;
  ctx.hillMesh = hills; // 供 groundY() 射线求交

  // 山脊裸岩（用包围盒底面贴合地形，绝不沉入）
  const rockParts: MergePart[] = [];
  HILL_ROCKS.forEach(([x, z, r, seed]) => {
    const geoR = rockGeometry(r, seed, 0.78, 0);
    geoR.computeBoundingBox();
    geoR.translate(x, groundY(ctx, x, z) - r * 0.34 - (geoR.boundingBox as THREE.Box3).min.y, z);
    rockParts.push({ geo: geoR });
    ctx.blocked.push({ x, z, r: r * 1.3 });
  });
  const rockMesh = add(g, mergeGeos(rockParts), ctx.mats.rock, { outline: 0.016 }, ctx.mats);
  rockMesh.name = 'hillRocks';

  return g;
}

/* ==========================================================================
 * 7 · 主屋（一层 + 二层 + 切妻瓦屋顶 + 室内）
 * ========================================================================== */

/** 障子（纸格推拉窗）：半透明纸面 + 细木格（木格浮在纸面前方，不穿透纸面） */
function addShoji(
  parent: THREE.Object3D,
  ctx: BuildCtx,
  o: { a0: number; a1: number; y0: number; y1: number; at: number; axis: 'x' | 'z' },
): void {
  const len = o.a1 - o.a0;
  const hgt = o.y1 - o.y0;
  const cA = (o.a0 + o.a1) / 2;
  const cY = (o.y0 + o.y1) / 2;

  const paper = new THREE.PlaneGeometry(len, hgt);
  const pm = new THREE.Mesh(paper, ctx.mats.paper);
  pm.castShadow = false;
  pm.receiveShadow = false;
  if (o.axis === 'z') pm.position.set(cA, cY, o.at);
  else {
    pm.rotation.y = Math.PI / 2;
    pm.position.set(o.at, cY, cA);
  }
  parent.add(pm);

  const parts: MergePart[] = [];
  const bar = 0.024;
  const dir = o.axis === 'z' ? 1 : -1; // 朝室外
  // 竖格贴纸面、横格再靠外一层：两层错开，横竖格栅互不相交（与真实组子做法一致）
  const offV = o.at + 0.017 * dir;
  const offH = o.at + 0.043 * dir;
  for (let i = 1; i <= 3; i++) {
    const a = o.a0 + (len * i) / 4;
    const m = new THREE.Matrix4();
    if (o.axis === 'z') m.makeTranslation(a, cY, offV);
    else m.makeTranslation(offV, cY, a);
    parts.push({ geo: new THREE.BoxGeometry(bar, hgt - 0.008, bar), matrix: m });
  }
  for (let i = 1; i <= 3; i++) {
    const yy = o.y0 + (hgt * i) / 4;
    const m = new THREE.Matrix4();
    if (o.axis === 'z') m.makeTranslation(cA, yy, offH);
    else m.makeTranslation(offH, yy, cA);
    parts.push({ geo: new THREE.BoxGeometry(o.axis === 'z' ? len - 0.008 : bar, bar, o.axis === 'z' ? bar : len - 0.008), matrix: m });
  }
  const bars = add(parent, mergeGeos(parts), ctx.mats.woodPost, { outline: 0, cast: false });
  bars.name = 'shojiBars';
}

/** 挂灯（纸罩 + 暖光 + 微呼吸）；给出 cordTop 时自动补出"从灯顶到吊点"的提绳，绝不留缝 */
function addPaperLantern(
  parent: THREE.Object3D,
  ctx: BuildCtx,
  o: { x: number; y: number; z: number; r?: number; h?: number; cordTop?: number },
): void {
  const r = o.r ?? 0.115;
  const h = o.h ?? 0.17;
  const lx = o.x, lz = o.z;
  const capTop = o.y + h / 2 + 0.022;
  if (o.cordTop !== undefined && o.cordTop > capTop + 0.005) {
    const len = o.cordTop - capTop;
    add(parent, new THREE.CylinderGeometry(0.008, 0.008, len, 5), ctx.mats.woodPost, {
      x: lx, y: capTop + len / 2, z: lz, outline: 0, cast: false,
    });
  }
  const body = add(parent, new THREE.CylinderGeometry(r * 0.92, r, h, 12, 1, false), ctx.mats.lampPaper.clone(), {
    x: lx, y: o.y, z: lz, outline: 0.01, cast: false,
  }, ctx.mats);
  add(parent, new THREE.CylinderGeometry(r * 0.72, r * 0.72, 0.022, 12), ctx.mats.woodPost, { x: lx, y: o.y + h / 2 + 0.011, z: lz, outline: 0 });
  add(parent, new THREE.CylinderGeometry(r * 0.8, r * 0.8, 0.022, 12), ctx.mats.woodPost, { x: lx, y: o.y - h / 2 - 0.011, z: lz, outline: 0 });
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: ctx.tex.disc, color: 0xffb765, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  glow.scale.setScalar(r * 7);
  glow.position.set(lx, o.y, lz);
  parent.add(glow);
  const mat = body.material as THREE.Material & { opacity: number };
  ctx.anims.push((t) => {
    const k = 0.86 + 0.14 * Math.sin(t * 1.7 + lx * 3.1) * Math.sin(t * 0.9 + lz);
    mat.opacity = 0.75 + 0.2 * k;
    (glow.material as THREE.SpriteMaterial).opacity = 0.34 + 0.24 * k;
  });
}

function buildHouse(ctx: BuildCtx, outLights: THREE.Light[]): THREE.Group {
  const g = new THREE.Group();
  g.name = 'house';
  const M = ctx.mats;
  const po = H.plinthOut;

  /* ---- 基座（石） ---- */
  add(
    g,
    boxG(H.x1 - H.x0 + po * 2, H.plinthTop, H.z1 - H.z0 + po * 2, (H.x0 + H.x1) / 2, H.plinthTop / 2, (H.z0 + H.z1) / 2, 0.9),
    M.stone,
    { outline: 0.016 },
    M,
  );

  /* ---- 一层墙体（分片拼装：前后墙占满整个 X，左右墙让出转角，绝不重叠） ---- */
  const wallParts: MergePart[] = [];
  const wallY0 = H.plinthTop, wallH = H.wallTop - H.plinthTop;
  const wc = (x0: number, x1: number, z0: number, z1: number, y0: number, y1: number) => {
    wallParts.push({ geo: boxG(x1 - x0, y1 - y0, z1 - z0, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, 1.1) });
  };

  // 后墙（满宽）
  wc(H.x0, H.x1, H.z0, H.z0 + H.t, wallY0, H.wallTop);
  // 左右墙（只到前后墙的内侧面）
  wc(H.x0, H.x0 + H.t, H.z0 + H.t, H.z1 - H.t, wallY0, H.wallTop);
  wc(H.x1 - H.t, H.x1, H.z0 + H.t, H.z1 - H.t, wallY0, H.wallTop);

  // 前墙：3 个开口
  const front = splitSegments(H.x0, H.x1, 3, 0.14);
  const fz0 = H.z1 - H.t, fz1 = H.z1;
  wc(H.x0, H.x1, fz0, fz1, wallY0, H.winBottom); // 窗下坎墙
  wc(H.x0, H.x1, fz0, fz1, H.winTop, H.wallTop); // 窗上过梁
  front.pillars.forEach(([a, b]) => wc(a, b, fz0, fz1, H.winBottom, H.winTop));

  // 左墙：2 个开口
  const left = splitSegments(H.z0 + H.t, H.z1 - H.t, 2, 0.14);
  const lx0 = H.x0, lx1 = H.x0 + H.t;
  wc(lx0, lx1, H.z0 + H.t, H.z1 - H.t, wallY0, H.winBottom);
  wc(lx0, lx1, H.z0 + H.t, H.z1 - H.t, H.winTop, H.wallTop);
  left.pillars.forEach(([a, b]) => wc(lx0, lx1, a, b, H.winBottom, H.winTop));

  const wallMesh = add(g, mergeGeos(wallParts), M.wallWood, { outline: 0.014 }, M);
  wallMesh.name = 'walls1F';

  /* ---- 障子：正面 1、3 号开口 + 左侧 2 个开口；正面中央开口完全敞开 ---- */
  const shojiZ = fz0 + 0.045; // 纸面在墙厚中间偏外
  addShoji(g, ctx, { a0: front.openings[0][0], a1: front.openings[0][1], y0: H.winBottom, y1: H.winTop, at: shojiZ, axis: 'z' });
  addShoji(g, ctx, { a0: front.openings[2][0], a1: front.openings[2][1], y0: H.winBottom, y1: H.winTop, at: shojiZ, axis: 'z' });
  left.openings.forEach(([a, b]) => {
    addShoji(g, ctx, { a0: a, a1: b, y0: H.winBottom, y1: H.winTop, at: H.x0 + 0.085, axis: 'x' });
  });

  /* ---- 障子透出的暖光片：让"屋里亮着灯"在远处也读得出来 ---- */
  const glowPanels: Array<{ a: number; b: number; y0: number; y1: number; axis: 'x' | 'z'; at: number }> = [
    { a: front.openings[0][0], b: front.openings[0][1], y0: H.winBottom, y1: H.winTop, axis: 'z', at: H.z1 + 0.012 },
    { a: front.openings[2][0], b: front.openings[2][1], y0: H.winBottom, y1: H.winTop, axis: 'z', at: H.z1 + 0.012 },
    { a: left.openings[0][0], b: left.openings[0][1], y0: H.winBottom, y1: H.winTop, axis: 'x', at: H.x0 - 0.012 },
    { a: left.openings[1][0], b: left.openings[1][1], y0: H.winBottom, y1: H.winTop, axis: 'x', at: H.x0 - 0.012 },
  ];
  glowPanels.forEach((gp) => {
    const w = gp.b - gp.a;
    const hh = gp.y1 - gp.y0;
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffb367,
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.05, hh * 1.05), mat);
    if (gp.axis === 'z') mesh.position.set((gp.a + gp.b) / 2, (gp.y0 + gp.y1) / 2, gp.at);
    else {
      mesh.rotation.y = Math.PI / 2;
      mesh.position.set(gp.at, (gp.y0 + gp.y1) / 2, (gp.a + gp.b) / 2);
    }
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    g.add(mesh);
  });

  // 中央开口：门扇被推到右侧叠放（室内侧，与墙内面留 5mm 间隙）
  const openC = front.openings[1];
  const slideW = openC[1] - openC[0];
  const slidePanel = new THREE.Group();
  add(slidePanel, new THREE.BoxGeometry(slideW, H.winTop - H.winBottom, 0.04), M.woodPost, { outline: 0.008 });
  add(slidePanel, new THREE.PlaneGeometry(slideW - 0.1, H.winTop - H.winBottom - 0.1), M.paper.clone(), {
    z: 0.03, cast: false, receive: false,
  });
  // 左边缘贴住"中柱"外侧 → 遮住中柱并叠在右侧障子之前，室内侧 5mm 间隙
  slidePanel.position.set(front.pillars[2][0] + slideW / 2, (H.winBottom + H.winTop) / 2, fz0 - 0.055);
  g.add(slidePanel);

  /* ---- 暖帘（挂在中央开口上方，布面在竹竿前方，只贴不穿） ---- */
  const norenW = openC[1] - openC[0] + 0.16;
  add(g, new THREE.CylinderGeometry(0.018, 0.018, norenW, 6), M.woodPost, {
    x: (openC[0] + openC[1]) / 2, y: H.winTop + 0.03, z: H.z1 + 0.02, rz: Math.PI / 2, outline: 0,
  });
  add(g, new THREE.PlaneGeometry(norenW, 0.34), M.noren, {
    x: (openC[0] + openC[1]) / 2, y: H.winTop - 0.15, z: H.z1 + 0.046, cast: false, receive: false,
  });

  /* ---- 玄关庇（小屋檐）+ 斜撑 ---- */
  const a2 = Math.atan(0.16 / 0.7);
  const canopyGeo = new THREE.BoxGeometry(1.5, 0.07, 0.718);
  worldUV(canopyGeo, 1.1);
  // 原点移到"顶面靠墙那条棱"，再绕 X 正转 → 屋檐朝 +Z 方向往下降
  canopyGeo.translate(0, -0.035, 0.359);
  const canopy = new THREE.Mesh(canopyGeo, M.roof);
  canopy.rotation.x = a2;
  canopy.position.set(-0.5, 2.06, H.z1);
  canopy.castShadow = true;
  canopy.receiveShadow = true;
  g.add(canopy);
  addOutline(g, canopy, 0.012, M);
  [-1.2, 0.2].forEach((x) => {
    add(g, boxG(0.07, 0.16, 0.3, x, 1.86, H.z1 + 0.15, 0.4), M.woodPost, { outline: 0.008 }, M);
  });

  /* ---- 缘侧（外廊）+ 支柱 + 前缘挡板 + 踏石 ---- */
  const deckW = H.x1 - H.x0 + po * 2;
  const deckCX = (H.x0 + H.x1) / 2;
  add(g, boxG(deckW, ENGAWA.deckT, ENGAWA.z1 - ENGAWA.z0, deckCX, (ENGAWA.deckTop + ENGAWA.deckTop - ENGAWA.deckT) / 2, (ENGAWA.z0 + ENGAWA.z1) / 2, 0.75), M.woodLight, { outline: 0.012 }, M);
  [-2.3, -0.9, 0.5, 1.3].forEach((x) => {
    add(g, new THREE.CylinderGeometry(0.055, 0.065, ENGAWA.deckTop - ENGAWA.deckT, 7), M.woodPost, {
      x, y: (ENGAWA.deckTop - ENGAWA.deckT) / 2, z: ENGAWA.z1 - 0.08, outline: 0.01,
    }, M);
  });
  // 前缘挡板（让开踏石位置）
  const fasciaX: Array<[number, number]> = [
    [deckCX - deckW / 2, -0.85],
    [-0.15, deckCX + deckW / 2],
  ];
  fasciaX.forEach(([a, b]) => {
    add(g, boxG(b - a, 0.16, 0.06, (a + b) / 2, ENGAWA.deckTop - 0.06, ENGAWA.z1 + 0.03, 0.5), M.woodPost, { outline: 0.008 }, M);
  });
  // 踏石（两级台阶：缘侧 0.40 → 踏石 0.22 → 地面 0）
  add(g, boxG(0.7, 0.22, 0.41, -0.5, 0.11, ENGAWA.z1 + 0.205, 0.55), M.stone, { outline: 0.012 }, M);

  /* ---- 缘侧生活感：坐垫 + 茶托 + 植木钵 ---- */
  add(g, boxG(0.46, 0.06, 0.46, -1.9, ENGAWA.deckTop + 0.03, 1.93, 0.4), M.cloth, { outline: 0.008 }, M);
  add(g, new THREE.CylinderGeometry(0.13, 0.13, 0.02, 14), M.woodLight, { x: -1.45, y: ENGAWA.deckTop + 0.01, z: 2.0, outline: 0.006 }, M);
  add(g, new THREE.CylinderGeometry(0.035, 0.03, 0.05, 10), M.colorful, { x: -1.45, y: ENGAWA.deckTop + 0.045, z: 2.0, cast: false });
  [
    [-2.35, 2.05, 31],
    [1.15, 2.12, 37],
  ].forEach(([px, pz, sd]) => {
    add(g, new THREE.CylinderGeometry(0.11, 0.09, 0.15, 10), M.stone, { x: px, y: ENGAWA.deckTop + 0.075, z: pz, outline: 0.008 }, M);
    add(g, blobGeometry(0.19, 1, 0.22, sd), M.leafTeal, { x: px, y: ENGAWA.deckTop + 0.34, z: pz, outline: 0.012 }, M);
  });

  /* ---- 玄关：红提灯 + 和伞 + 参道旁木看板 ---- */
  const chochin = add(g, new THREE.CylinderGeometry(0.1, 0.088, 0.26, 12), M.lampPaper.clone(), {
    x: -0.65, y: 1.63, z: 1.72, outline: 0.01, cast: false,
  }, M);
  const chochinMat = chochin.material as THREE.MeshBasicMaterial;
  chochinMat.color.set(0xff9a72);
  add(g, new THREE.CylinderGeometry(0.008, 0.008, 0.16, 5), M.woodPost, { x: -0.65, y: 1.84, z: 1.72, outline: 0, cast: false });
  const cGlow = addGlow(g, ctx, -0.65, 1.63, 1.72, 0.95, 0xffa268, 0.4);
  ctx.anims.push((t) => {
    const k = 0.9 + 0.1 * Math.sin(t * 1.6) * Math.sin(t * 0.7 + 2);
    chochinMat.opacity = 0.76 + 0.2 * k;
    (cGlow.material as THREE.SpriteMaterial).opacity = 0.26 + 0.2 * k;
  });

  // 和傘（收拢后靠在玄关墙边：底端坐在缘侧，顶端斜向墙外皮）
  const waGeo = new THREE.ConeGeometry(0.06, 1.0, 10, 1, true);
  const waMesh = new THREE.Mesh(waGeo, M.cloth);
  waMesh.position.set(0.5, 0.89, 1.66);
  waMesh.rotation.x = -Math.atan2(0.38, 1.0); // 负向 → 伞尖朝墙（-z）倾，伞柄立在缘侧
  waMesh.castShadow = true;
  waMesh.receiveShadow = true;
  g.add(waMesh);
  addOutline(g, waMesh, 0.008, M);

  // 木看板（参道东侧；牌面白圈 + 两道横纹，抽象"湯"意象）
  const sgX = 1.78, sgZ = 2.2;
  add(g, new THREE.CylinderGeometry(0.035, 0.042, 1.3, 8), M.woodPost, { x: sgX, y: 0.65, z: sgZ, outline: 0.01 }, M);
  add(g, boxG(0.36, 0.74, 0.05, sgX, 0.98, sgZ + 0.03, 0.4), M.woodLight, { outline: 0.012 }, M);
  add(g, new THREE.RingGeometry(0.072, 0.092, 20), M.plaster, { x: sgX, y: 1.09, z: sgZ + 0.058, cast: false, receive: false });
  add(g, boxG(0.17, 0.016, 0.012, sgX, 0.95, sgZ + 0.058, 0.1), M.plaster, { outline: 0, cast: false }, M);
  add(g, boxG(0.12, 0.016, 0.012, sgX, 0.9, sgZ + 0.058, 0.1), M.plaster, { outline: 0, cast: false }, M);

  /* ---- 室内 ---- */
  const inX0 = H.x0 + H.t, inX1 = H.x1 - H.t;
  const inZ0 = H.z0 + H.t, inZ1 = H.z1 - H.t;

  // 榻榻米（12 帖，各自带席边；相互留 1cm 缝，四周留 2cm 与墙脱开）
  const mats: MergePart[] = [];
  const cols = 4, rows = 3;
  const gapM = 0.012, gapWall = 0.02;
  const mw = (inX1 - inX0 - gapWall * 2 - gapM * (cols - 1)) / cols;
  const md = (inZ1 - inZ0 - gapWall * 2 - gapM * (rows - 1)) / rows;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const x = inX0 + gapWall + mw / 2 + c * (mw + gapM);
      const z = inZ0 + gapWall + md / 2 + r * (md + gapM);
      mats.push({ geo: new THREE.BoxGeometry(mw, 0.08, md).translate(x, H.plinthTop + 0.04, z) });
    }
  }
  add(g, mergeGeos(mats), M.tatami, { outline: 0.008, cast: false }, M);

  // 床の間（壁龛）：台板 + 柱子 + 鸭居 + 挂轴 + 花瓶（各构件高度互相衔接，均在室内净高之内）
  add(g, boxG(0.83, 0.06, 0.23, inX0 + 0.415, H.tatamiTop + 0.03, inZ0 + 0.115, 0.4), M.woodLight, { outline: 0.008 }, M);
  add(g, boxG(0.06, 1.22, 0.2, inX0 + 0.86, H.tatamiTop + 0.61, inZ0 + 0.1, 0.35), M.woodPost, { outline: 0.01 }, M);
  add(g, boxG(0.86, 0.12, 0.21, inX0 + 0.43, 1.78, inZ0 + 0.105, 0.35), M.woodPost, { outline: 0.01 }, M);
  add(g, new THREE.PlaneGeometry(0.34, 0.7), M.scroll, { x: inX0 + 0.4, y: 1.35, z: inZ0 + 0.012, cast: false, receive: false });
  add(g, new THREE.CylinderGeometry(0.05, 0.07, 0.2, 10), M.stone, { x: inX0 + 0.38, y: H.tatamiTop + 0.16, z: inZ0 + 0.12, outline: 0.008 }, M);
  add(g, new THREE.CylinderGeometry(0.012, 0.016, 0.34, 5), M.bark, { x: inX0 + 0.4, y: H.tatamiTop + 0.42, z: inZ0 + 0.12, rz: 0.22, outline: 0 });

  // 矮桌（卓袱台）+ 坐垫 + 茶具
  const tX = -0.5, tZ = -0.2, tTop = 0.72;
  add(g, boxG(0.6, 0.045, 0.6, tX, tTop - 0.0225, tZ, 0.5), M.woodLight, { outline: 0.01 }, M);
  const legs: MergePart[] = [];
  [-1, 1].forEach((sx) =>
    [-1, 1].forEach((sz) => legs.push({ geo: boxG(0.05, 0.175, 0.05, tX + sx * 0.25, H.tatamiTop + 0.0875, tZ + sz * 0.25, 0.3) })),
  );
  add(g, mergeGeos(legs), M.woodPost, { outline: 0.008 }, M);
  [[-0.5, -0.95], [-0.5, 0.55]].forEach(([x, z]) => {
    add(g, boxG(0.44, 0.06, 0.44, x, H.tatamiTop + 0.03, z, 0.4), M.cloth, { outline: 0.008 }, M);
  });
  const tea: MergePart[] = [
    { geo: new THREE.SphereGeometry(0.072, 12, 9).translate(tX, tTop + 0.072, tZ - 0.03), color: 0x8d5a3b },
    { geo: new THREE.CylinderGeometry(0.036, 0.03, 0.05, 10).translate(tX - 0.17, tTop + 0.025, tZ + 0.13), color: 0xe8e2d4 },
    { geo: new THREE.CylinderGeometry(0.036, 0.03, 0.05, 10).translate(tX + 0.02, tTop + 0.041, tZ + 0.15), color: 0xe8e2d4 },
    { geo: new THREE.CylinderGeometry(0.11, 0.11, 0.016, 14).translate(tX + 0.02, tTop + 0.008, tZ + 0.15), color: 0x5c4632 },
  ];
  add(g, mergeGeos(tea), M.colorful, { outline: 0, cast: false });

  // 火钵（暖光小炉）
  add(g, new THREE.CylinderGeometry(0.15, 0.13, 0.19, 10), M.woodPost, { x: tX - 1.0, y: H.tatamiTop + 0.095, z: tZ + 0.55, outline: 0.01 }, M);
  const ember = add(g, new THREE.CylinderGeometry(0.105, 0.105, 0.03, 10), M.lampWarm.clone(), { x: tX - 1.0, y: H.tatamiTop + 0.205, z: tZ + 0.55, cast: false, receive: false });

  // 箪笥（靠右墙的抽屉柜；抽屉面与拉手都在柜体之外，只贴不穿）
  const chX = inX1 - 0.17;
  const chZ = -0.1;
  add(g, boxG(0.34, 0.44, 0.8, chX, H.tatamiTop + 0.22, chZ, 0.5), M.woodLight, { outline: 0.012 }, M);
  const drawers: MergePart[] = [];
  for (let i = 0; i < 4; i++) {
    const dy = H.tatamiTop + 0.08 + i * 0.1;
    drawers.push({ geo: boxG(0.03, 0.075, 0.7, chX - 0.185, dy, chZ, 0.2) });
    drawers.push({ geo: new THREE.SphereGeometry(0.018, 8, 6).translate(chX - 0.218, dy, chZ), color: 0x2b2620 });
  }
  add(g, mergeGeos(drawers), M.colorful, { outline: 0, cast: false });

  // 二曲屏風（靠右墙折立；两扇之间留折缝、互不重叠）
  const scrX = inX1 - 0.05;
  [-1, 1].forEach((k) => {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.92, 0.026), M.cloth);
    panel.position.set(scrX, H.tatamiTop + 0.46, -1.2 + k * 0.25);
    panel.rotation.y = Math.PI / 2 + k * 0.24;
    panel.castShadow = true;
    panel.receiveShadow = true;
    g.add(panel);
    addOutline(g, panel, 0.008, M);
  });

  // 文机（矮书案）+ 卷物 + 笔 + 砚
  const dX = 0.2, dZ = 0.8, dTop = 0.66;
  add(g, boxG(0.56, 0.04, 0.34, dX, dTop - 0.02, dZ, 0.4), M.woodLight, { outline: 0.008 }, M);
  const deskLegs: MergePart[] = [];
  [-1, 1].forEach((sx) =>
    [-1, 1].forEach((sz) => deskLegs.push({ geo: boxG(0.045, 0.12, 0.045, dX + sx * 0.23, H.tatamiTop + 0.06, dZ + sz * 0.12, 0.25) })),
  );
  add(g, mergeGeos(deskLegs), M.woodPost, { outline: 0.006 }, M);
  add(g, new THREE.CylinderGeometry(0.028, 0.028, 0.3, 8).rotateZ(Math.PI / 2), M.scroll, {
    x: dX - 0.1, y: dTop + 0.028, z: dZ - 0.08, outline: 0, cast: false,
  });
  add(g, new THREE.CylinderGeometry(0.006, 0.008, 0.22, 6).rotateZ(Math.PI / 2), M.bark, {
    x: dX + 0.12, y: dTop + 0.016, z: dZ + 0.06, ry: 0.4, outline: 0,
  });
  add(g, boxG(0.1, 0.03, 0.08, dX + 0.16, dTop + 0.015, dZ - 0.05, 0.2), M.stoneDark, { outline: 0, cast: false }, M);

  // 后墙置物架 + 酒器
  add(g, boxG(0.72, 0.05, 0.2, inX1 - 0.5, 1.31, inZ0 + 0.11, 0.4), M.woodLight, { outline: 0.008 }, M);
  const shelf: MergePart[] = [];
  [[-0.22, 0.055, 0xd8d2c2], [-0.06, 0.05, 0x6f5a3c], [0.12, 0.06, 0xd8d2c2], [0.3, 0.045, 0x9c4a3a]].forEach(([dx, r, col]) => {
    shelf.push({ geo: new THREE.CylinderGeometry(r, r * 0.86, 0.15, 9).translate(inX1 - 0.5 + (dx as number), 1.335 + 0.075, inZ0 + 0.11), color: col as number });
  });
  add(g, mergeGeos(shelf), M.colorful, { outline: 0, cast: false });

  // 室内盆栽
  add(g, new THREE.CylinderGeometry(0.12, 0.09, 0.16, 10), M.stone, { x: inX1 - 0.25, y: H.tatamiTop + 0.08, z: 0.95, outline: 0.008 }, M);
  add(g, blobGeometry(0.2, 1, 0.2, 5), M.leafGreen, { x: inX1 - 0.25, y: H.tatamiTop + 0.4, z: 0.95, outline: 0.012 }, M);

  // 行灯（落地纸罩灯，自带暖光）
  const andon = new THREE.Group();
  add(andon, boxG(0.2, 0.06, 0.2, 0, 0.03, 0, 0.2), M.woodPost, { outline: 0.006 }, M);
  add(andon, boxG(0.18, 0.3, 0.18, 0, 0.21, 0, 0.2), M.lampPaper.clone(), { outline: 0.008, cast: false }, M);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    add(andon, boxG(0.022, 0.34, 0.022, sx * 0.086, 0.21, sz * 0.086, 0.15), M.woodPost, { outline: 0 }, M);
  });
  add(andon, boxG(0.21, 0.04, 0.21, 0, 0.4, 0, 0.2), M.woodPost, { outline: 0.006 }, M);
  andon.position.set(0.72, H.tatamiTop, 1.15);
  g.add(andon);
  addGlow(g, ctx, 0.72, H.tatamiTop + 0.21, 1.15, 0.62, 0xffc07a, 0.3);

  // 围棋盘 + 两个棋盒
  add(g, boxG(0.44, 0.05, 0.44, -1.6, H.tatamiTop + 0.055, -0.6, 0.3), M.woodLight, { outline: 0.008 }, M);
  const gobowls: MergePart[] = [
    { geo: new THREE.CylinderGeometry(0.055, 0.05, 0.05, 10).translate(-1.78, H.tatamiTop + 0.105, -0.6), color: 0x2b2620 },
    { geo: new THREE.CylinderGeometry(0.055, 0.05, 0.05, 10).translate(-1.42, H.tatamiTop + 0.105, -0.6), color: 0xd8d2c2 },
  ];
  add(g, mergeGeos(gobowls), M.colorful, { outline: 0, cast: false });

  // 室内吊灯 ×2 + 暖色点光源
  addPaperLantern(g, ctx, { x: tX, y: 1.55, z: tZ, cordTop: H.wallTop });
  addPaperLantern(g, ctx, { x: inX1 - 0.75, y: 1.55, z: 0.5, cordTop: H.wallTop });
  const inLight = new THREE.PointLight(0xffb066, 1, 7.5, 1.8);
  inLight.position.set(-0.35, 1.5, -0.05);
  inLight.castShadow = false;
  g.add(inLight);
  outLights.push(inLight);
  ctx.anims.push((t) => {
    const k = 0.93 + 0.07 * Math.sin(t * 1.3) * Math.sin(t * 0.47 + 1.2);
    inLight.intensity = LIGHT_SCALE.point * 13.5 * k;
    (ember.material as THREE.MeshBasicMaterial).color.setRGB(0.75 + 0.25 * k, 0.34 * k, 0.12 * k);
  });

  /* ---- 二层（体量内收 + 楼板挑檐） ---- */
  const slabX0 = H.x0, slabX1 = H.x1, slabZ0 = H.z0, slabZ1 = H.z1;
  add(g, boxG(slabX1 - slabX0, H.uSlabY - H.uFloorY, slabZ1 - slabZ0, (slabX0 + slabX1) / 2, (H.uFloorY + H.uSlabY) / 2, (slabZ0 + slabZ1) / 2, 1.0), M.woodPost, { outline: 0.014 }, M);

  const upParts: MergePart[] = [];
  const uY0 = H.uSlabY, uY1 = H.uWallTop, ut = H.t;
  const uw = (x0: number, x1: number, z0: number, z1: number, y0: number, y1: number) => {
    upParts.push({ geo: boxG(x1 - x0, y1 - y0, z1 - z0, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, 1.0) });
  };
  const uWin0 = uY0 + 0.2, uWin1 = uY1 - 0.13;
  uw(H.uX0, H.uX1, H.uZ0, H.uZ0 + ut, uY0, uY1); // 后墙
  uw(H.uX0, H.uX0 + ut, H.uZ0 + ut, H.uZ1 - ut, uY0, uY1); // 左墙（下面开口）
  uw(H.uX1 - ut, H.uX1, H.uZ0 + ut, H.uZ1 - ut, uY0, uY1); // 右墙
  const uFront = splitSegments(H.uX0, H.uX1, 2, 0.12);
  const ufz0 = H.uZ1 - ut, ufz1 = H.uZ1;
  uw(H.uX0, H.uX1, ufz0, ufz1, uY0, uWin0);
  uw(H.uX0, H.uX1, ufz0, ufz1, uWin1, uY1);
  uFront.pillars.forEach(([a, b]) => uw(a, b, ufz0, ufz1, uWin0, uWin1));
  const uLeft = splitSegments(H.uZ0 + ut, H.uZ1 - ut, 1, 0.12);
  uw(H.uX0, H.uX0 + ut, H.uZ0 + ut, H.uZ1 - ut, uY0, uWin0);
  uw(H.uX0, H.uX0 + ut, H.uZ0 + ut, H.uZ1 - ut, uWin1, uY1);
  uLeft.pillars.forEach(([a, b]) => uw(H.uX0, H.uX0 + ut, a, b, uWin0, uWin1));
  add(g, mergeGeos(upParts), M.wallWood, { outline: 0.014 }, M).name = 'walls2F';

  uFront.openings.forEach(([a, b]) => {
    addShoji(g, ctx, { a0: a, a1: b, y0: uWin0, y1: uWin1, at: ufz0 + 0.045, axis: 'z' });
  });
  addShoji(g, ctx, { a0: uLeft.openings[0][0], a1: uLeft.openings[0][1], y0: uWin0, y1: uWin1, at: H.uX0 + 0.045, axis: 'x' });

  // 二层室内（简化：榻榻米台 + 矮桌 + 灯）
  add(g, boxG(H.uX1 - H.uX0 - ut * 2, 0.05, H.uZ1 - H.uZ0 - ut * 2, (H.uX0 + H.uX1) / 2, uY0 + 0.025, (H.uZ0 + H.uZ1) / 2, 0.5), M.tatami, { outline: 0, cast: false }, M);
  add(g, boxG(0.44, 0.04, 0.44, -0.5, uY0 + 0.17, -0.15, 0.3), M.woodLight, { outline: 0.006 }, M);
  addPaperLantern(g, ctx, { x: -0.5, y: 2.62, z: -0.15, r: 0.1, h: 0.15, cordTop: H.uWallTop });

  /* ---- 主屋顶（切妻）：两块坡瓦 + 两侧山墙三角 + 屋脊压顶 ----
     坡瓦几何体原点取在"屋脊处的上棱"，再沿该侧坡向（side）延伸：
     延伸方向必须跟着 side 取反，否则负 z 侧会绕 X 反向旋转、整块翻到屋脊上方。 */
  const cosA = Math.cos(Math.atan(H.tanA));
  const sinA = Math.sin(Math.atan(H.tanA));
  const halfD = (H.uZ1 - H.uZ0) / 2;
  const L = (halfD + H.eave) / cosA;
  const xSpan = H.uX1 - H.uX0 + H.eave * 2;
  const cRoofX = (H.uX0 + H.uX1) / 2;
  const gapRidge = 0.008;

  [-1, 1].forEach((side) => {
    const geo = new THREE.BoxGeometry(xSpan, H.roofT, L - gapRidge);
    worldUV(geo, 1.1);
    // 向该侧檐口方向延伸（side=+1 → +z 檐，side=-1 → -z 檐），并整体压到"上棱之下"
    geo.translate(0, -H.roofT / 2, side * ((L - gapRidge) / 2 + gapRidge));
    const m = new THREE.Mesh(geo, M.roof);
    m.rotation.x = side * Math.atan(H.tanA);
    m.position.set(cRoofX, RIDGE_TOP, H.ridgeZ);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    addOutline(g, m, 0.014, M);
  });

  // 山墙三角（正好顶到坡瓦下皮，无缝隙也无穿插）
  const gableApex = RIDGE_TOP - H.roofT / cosA;
  [-1, 1].forEach((side) => {
    const x0 = side < 0 ? H.uX0 - ut : H.uX1;
    const x1 = x0 + ut;
    const tri = prismX(
      [
        [H.uWallTop, H.ridgeZ - halfD],
        [gableApex, H.ridgeZ],
        [H.uWallTop, H.ridgeZ + halfD],
      ],
      x0,
      x1,
    );
    add(g, tri, M.plaster, { outline: 0.014 }, M);
  });

  // 屋脊压顶（底面是与坡瓦完全贴合的倒 V，既盖住缝隙也不穿入瓦面）
  const w = 0.22, capH = 0.1;
  const cap = prismX(
    [
      [RIDGE_TOP - w * H.tanA, H.ridgeZ - w],
      [RIDGE_TOP, H.ridgeZ],
      [RIDGE_TOP - w * H.tanA, H.ridgeZ + w],
      [RIDGE_TOP + capH, H.ridgeZ + w],
      [RIDGE_TOP + capH, H.ridgeZ - w],
    ],
    cRoofX - xSpan / 2,
    cRoofX + xSpan / 2,
  );
  add(g, cap, M.roofTrim, { outline: 0.014 }, M);

  // 屋檐封檐板（贴在坡瓦外端面之外，仅相接不重叠）
  [-1, 1].forEach((side) => {
    const eaveZ = H.ridgeZ + side * (halfD + H.eave);
    const eaveY = RIDGE_TOP - L * sinA;
    add(g, boxG(xSpan, 0.075, 0.045, cRoofX, eaveY - 0.03, eaveZ + side * 0.025, 0.5), M.roofTrim, { outline: 0.008 }, M);
  });

  /* ---- 屋顶工艺细节：垂木（椽子）/ 破風（博风板）/ 懸魚（山墙坠饰）/ 鬼瓦（脊端瓦） ---- */
  const aTan = Math.atan(H.tanA);
  const uEave = halfD + H.eave;
  const uR0 = halfD + 0.012;
  const uMid = (uR0 + uEave) / 2;
  const rafterLen = (uEave - uR0) / cosA;
  /** 坡瓦下皮：距屋脊水平距离 u 处的高度（与坡瓦推导同一套公式） */
  const underAt = (u: number) => RIDGE_TOP - H.roofT * cosA - (u + H.roofT * sinA) * H.tanA;
  const craft: MergePart[] = [];
  const rafterN = 13;
  [-1, 1].forEach((slope) => {
    // 垂木：只做出檐可见段，顶面精确贴合坡瓦下皮
    for (let i = 0; i < rafterN; i++) {
      const x = cRoofX - xSpan / 2 + 0.16 + (i * (xSpan - 0.32)) / (rafterN - 1);
      const gr = new THREE.BoxGeometry(0.05, 0.07, rafterLen);
      gr.rotateX(slope * aTan);
      gr.translate(x, underAt(uMid) - 0.035 * cosA, H.ridgeZ + slope * (uMid - 0.035 * sinA));
      craft.push({ geo: gr });
    }
    // 破風板：沿两侧山墙斜边通长
    [-1, 1].forEach((edge) => {
      const gb = new THREE.BoxGeometry(0.055, 0.17, L);
      gb.rotateX(slope * aTan);
      gb.translate(
        cRoofX + edge * (xSpan / 2 - 0.05),
        underAt((halfD + H.eave) / 2) - 0.085 * cosA,
        H.ridgeZ + slope * ((halfD + H.eave) / 2 - 0.085 * sinA),
      );
      craft.push({ geo: gb });
    });
  });
  add(g, mergeGeos(craft), M.roofTrim, { outline: 0.009 }, M);

  // 懸魚（山墙坠饰）：主体块 + 下垂的锥形饰
  [-1, 1].forEach((edge) => {
    const gx = cRoofX + edge * (xSpan / 2 - 0.13);
    const gy = underAt(0);
    add(g, boxG(0.1, 0.11, 0.06, gx, gy - 0.055, H.ridgeZ, 0.25), M.woodLight, { outline: 0.008 }, M);
    const pt = prismX(
      [
        [gy - 0.1, H.ridgeZ - 0.05],
        [gy - 0.1, H.ridgeZ + 0.05],
        [gy - 0.26, H.ridgeZ],
      ],
      gx - 0.025,
      gx + 0.025,
    );
    add(g, pt, M.woodLight, { outline: 0.008 }, M);
  });

  // 鬼瓦（脊端瓦块）：坐在屋脊压顶之上
  [-1, 1].forEach((edge) => {
    add(
      g,
      boxG(0.17, 0.13, 0.34, cRoofX + edge * (xSpan / 2 - 0.1), RIDGE_TOP + capH + 0.065, H.ridgeZ, 0.3),
      M.roofTrim,
      { outline: 0.01 },
      M,
    );
  });

  // 玄关庇的椽子（5 根，顶面贴合庇的下皮）
  const a2c = Math.atan(0.16 / 0.7);
  const canLen = 0.67 / Math.cos(a2c);
  const canUnder = (z: number) => 2.06 - 0.035 / Math.cos(a2c) - (z - H.z1) * Math.tan(a2c);
  for (let i = 0; i < 5; i++) {
    const x = -1.1 + i * 0.3;
    const gz = 1.815;
    const gc = new THREE.BoxGeometry(0.045, 0.05, canLen);
    gc.rotateX(a2c);
    gc.translate(x, canUnder(gz) - 0.025 * Math.cos(a2c), gz - 0.025 * Math.sin(a2c));
    add(g, gc, M.woodPost, { outline: 0 }, M);
  }

  // 二层檐下挂灯 ×2（吊在主屋檐口正下方、落在两根垂木之间，不与屋瓦/垂木相碰）
  const eaveUnder = underAt(H.z1 + 0.15 - H.ridgeZ);
  [-1.49, 0.79].forEach((lx) => {
    addPaperLantern(g, ctx, { x: lx, y: eaveUnder - 0.16, z: H.z1 + 0.15, r: 0.085, h: 0.13, cordTop: eaveUnder - 0.012 });
  });

  // 风铃（挂在檐下，随风轻摆）
  const furin = new THREE.Group();
  const furinCord = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.2, 5), M.woodPost);
  furinCord.position.y = -0.1;
  furin.add(furinCord);
  const furinBell = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.03, 0.08, 12, 1, true), M.glass);
  furinBell.position.y = -0.24;
  furin.add(furinBell);
  const furinStrip = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.17), M.paper);
  furinStrip.position.y = -0.37;
  furin.add(furinStrip);
  furin.position.set(1.05, eaveUnder, H.z1 + 0.15);
  g.add(furin);
  ctx.anims.push((t) => {
    furin.rotation.z = 0.13 * Math.sin(t * 0.9 + 1.3);
    furin.rotation.x = 0.07 * Math.sin(t * 0.71 + 0.4);
  });

  return g;
}

/* ==========================================================================
 * 8 · 通用效果件（涟漪 / 蒸汽 / 辉光）
 * ========================================================================== */

/** 灯光强度换算：兼容 three r155 前后两套"物理光照"单位 */
const LIGHT_SCALE = { point: 1, dir: 1 };

function addGlow(parent: THREE.Object3D, ctx: BuildCtx, x: number, y: number, z: number, size: number, color: number, opacity: number): THREE.Sprite {
  const sp = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: ctx.tex.disc, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  sp.scale.setScalar(size);
  sp.position.set(x, y, z);
  parent.add(sp);
  return sp;
}

/** 水面涟漪环：从中心不断扩散并淡出（可用 scale 让环呈椭圆以适配不同水面） */
function addRipples(
  ctx: BuildCtx,
  parent: THREE.Object3D,
  o: { x: number; y: number; z: number; count: number; maxR: number; speed: number; spread: number; sx?: number; sz?: number },
): void {
  for (let i = 0; i < o.count; i++) {
    const mat = ctx.mats.ripple.clone();
    const mesh = new THREE.Mesh(new THREE.RingGeometry(0.74, 1, 30), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    const a = ctx.rng() * Math.PI * 2;
    const rr0 = Math.sqrt(ctx.rng()) * o.spread;
    const bx = o.x + Math.cos(a) * rr0;
    const bz = o.z + Math.sin(a) * rr0;
    mesh.position.set(bx, o.y, bz);
    parent.add(mesh);
    const maxR = o.maxR * rr(ctx.rng, 0.72, 1.12);
    const speed = o.speed * rr(ctx.rng, 0.85, 1.2);
    const phase = i / o.count;
    ctx.anims.push((t) => {
      const k = (t * speed + phase) % 1;
      const s = 0.05 + k * maxR;
      mesh.scale.set(s * (o.sx ?? 1), s * (o.sz ?? 1), 1);
      mat.opacity = 0.5 * (1 - k) * Math.min(1, k * 6);
    });
  }
}

/** 蒸汽：不断上升、放大、淡出的柔光片 */
function addSteam(
  ctx: BuildCtx,
  parent: THREE.Object3D,
  o: { x: number; y: number; z: number; count: number; radius: number; rise: number; size: number; opacity: number; color?: number },
): void {
  for (let i = 0; i < o.count; i++) {
    const mat = new THREE.SpriteMaterial({
      map: ctx.tex.disc,
      color: o.color ?? 0xd9e3f6,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const sp = new THREE.Sprite(mat);
    const a = ctx.rng() * Math.PI * 2;
    const r0 = Math.sqrt(ctx.rng()) * o.radius;
    const bx = o.x + Math.cos(a) * r0;
    const bz = o.z + Math.sin(a) * r0;
    const s0 = o.size * rr(ctx.rng, 0.55, 1.25);
    const life = rr(ctx.rng, 3.6, 6.4);
    const phase = ctx.rng();
    const driftX = (ctx.rng() - 0.5) * 0.6;
    const driftZ = (ctx.rng() - 0.5) * 0.6;
    sp.position.set(bx, o.y, bz);
    sp.scale.setScalar(s0);
    parent.add(sp);
    ctx.anims.push((t) => {
      const k = (t / life + phase) % 1;
      sp.position.set(
        bx + driftX * k + Math.sin(t * 0.55 + phase * 11) * 0.11,
        o.y + k * o.rise,
        bz + driftZ * k + Math.cos(t * 0.43 + phase * 8) * 0.1,
      );
      sp.scale.setScalar(s0 * (0.65 + k * 1.55));
      mat.opacity = o.opacity * Math.sin(Math.PI * Math.min(1, k * 1.02)) * Math.min(1, k / 0.14);
    });
  }
}

/* ==========================================================================
 * 9 · 庭院元素
 * ========================================================================== */

/** 石灯笼（春日型）：基础 / 竿 / 中台 / 火袋 / 笠 / 宝珠 */
function buildStoneLantern(ctx: BuildCtx, x: number, z: number, scale = 1, lit = true): THREE.Group {
  const g = new THREE.Group();
  const M = ctx.mats;
  const parts: MergePart[] = [
    { geo: new THREE.CylinderGeometry(0.17 * scale, 0.19 * scale, 0.1 * scale, 10).translate(0, 0.05 * scale, 0) },
    { geo: new THREE.CylinderGeometry(0.075 * scale, 0.085 * scale, 0.5 * scale, 8).translate(0, 0.35 * scale, 0) },
    { geo: new THREE.CylinderGeometry(0.16 * scale, 0.13 * scale, 0.07 * scale, 10).translate(0, 0.635 * scale, 0) },
  ];
  add(g, mergeGeos(parts), M.stone, { outline: 0.012 }, M);

  // 火袋（发光体 + 四角框：框在四角外侧、高度正好顶到笠底）
  const box = add(g, new THREE.BoxGeometry(0.23 * scale, 0.22 * scale, 0.23 * scale), lit ? M.lampWarm.clone() : M.stoneDark, {
    y: 0.78 * scale, cast: lit, receive: lit, outline: 0.01,
  }, M);
  const frame: MergePart[] = [];
  [-1, 1].forEach((sx) =>
    [-1, 1].forEach((sz) => {
      frame.push({ geo: new THREE.BoxGeometry(0.028 * scale, 0.22 * scale, 0.028 * scale).translate(sx * 0.129 * scale, 0.78 * scale, sz * 0.129 * scale) });
    }),
  );
  add(g, mergeGeos(frame), M.woodPost, { outline: 0.006 }, M);

  // 笠（四角锥）+ 宝珠（球心抬高到锥尖之上，仅相切）
  const roof = new THREE.ConeGeometry(0.27 * scale, 0.15 * scale, 4);
  roof.rotateY(Math.PI / 4);
  add(g, roof, M.stone, { y: 0.965 * scale, outline: 0.012 }, M);
  add(g, new THREE.SphereGeometry(0.05 * scale, 10, 8), M.stone, { y: 1.09 * scale, outline: 0.01 }, M);

  g.position.set(x, 0, z);
  seatOn(g, 0);
  if (lit) {
    const glow = addGlow(g, ctx, 0, 0.78 * scale, 0, 1.05 * scale, 0xffb765, 0.36);
    const mat = box.material as THREE.MeshBasicMaterial;
    ctx.anims.push((t) => {
      const k = 0.88 + 0.12 * Math.sin(t * 1.9 + x * 2.3) * Math.sin(t * 0.73 + z);
      mat.color.setRGB(k, 0.62 * k, 0.34 * k);
      (glow.material as THREE.SpriteMaterial).opacity = 0.24 + 0.2 * k;
    });
  }
  return g;
}

/** 木栅栏 / 竹垣（四つ目垣）：立柱 + 横杆 + 竖条（竖条贴背面，两层错开不穿插） */
function buildFence(
  ctx: BuildCtx,
  runs: Array<{ axis: 'x' | 'z'; at: number; a0: number; a1: number; inward: 1 | -1; style?: 'wood' | 'bamboo' }>,
): THREE.Group {
  const g = new THREE.Group();
  const parts: MergePart[] = [];
  const postH = 0.78, postS = 0.1, railT = 0.05, slatT = 0.035;
  runs.forEach((run) => {
    const seg = 0.92;
    const n = Math.max(1, Math.round((run.a1 - run.a0) / seg));
    const step = (run.a1 - run.a0) / n;

    /* ---- 竹垣：圆竹立柱 + 四道横竹 + 细竹格（横竹与细竹错层，仅相切不相交） ---- */
    if (run.style === 'bamboo') {
      const bPostR = 0.05, bRailR = 0.028, bSlatR = 0.02;
      for (let i = 0; i <= n; i++) {
        const a = run.a0 + i * step;
        const px = run.axis === 'z' ? run.at : a;
        const pz = run.axis === 'z' ? a : run.at;
        parts.push({ geo: new THREE.CylinderGeometry(bPostR * 0.92, bPostR, 1.02, 7).translate(px, 0.51, pz) });
      }
      for (let i = 0; i < n; i++) {
        const a = run.a0 + i * step + bPostR;
        const b = run.a0 + (i + 1) * step - bPostR;
        const len = b - a;
        const cx = run.axis === 'z' ? run.at : (a + b) / 2;
        const cz = run.axis === 'z' ? (a + b) / 2 : run.at;
        [0.3, 0.55, 0.8, 1.0].forEach((y) => {
          parts.push({
            geo:
              run.axis === 'z'
                ? new THREE.CylinderGeometry(bRailR, bRailR, len, 6).rotateX(Math.PI / 2).translate(cx, y, cz)
                : new THREE.CylinderGeometry(bRailR, bRailR, len, 6).rotateZ(Math.PI / 2).translate(cx, y, cz),
          });
        });
        const slats = Math.max(3, Math.round(len / 0.15));
        const off = (bRailR + bSlatR + 0.004) * run.inward;
        for (let k = 0; k < slats; k++) {
          const aa = a + (len * (k + 0.5)) / slats;
          const sx = run.axis === 'z' ? run.at + off : aa;
          const sz = run.axis === 'z' ? aa : run.at + off;
          parts.push({ geo: new THREE.CylinderGeometry(bSlatR, bSlatR, 0.94, 5).translate(sx, 0.52, sz) });
        }
      }
      return;
    }

    /* ---- 木板栅栏 ---- */
    for (let i = 0; i <= n; i++) {
      const a = run.a0 + i * step;
      const px = run.axis === 'z' ? run.at : a;
      const pz = run.axis === 'z' ? a : run.at;
      parts.push({ geo: new THREE.BoxGeometry(postS, postH, postS).translate(px, postH / 2, pz) });
    }
    for (let i = 0; i < n; i++) {
      const a = run.a0 + i * step + postS / 2;
      const b = run.a0 + (i + 1) * step - postS / 2;
      const len = b - a;
      const cx = run.axis === 'z' ? run.at : (a + b) / 2;
      const cz = run.axis === 'z' ? (a + b) / 2 : run.at;
      [0.34, 0.66].forEach((y) => {
        parts.push({
          geo:
            run.axis === 'z'
              ? new THREE.BoxGeometry(railT, 0.045, len).translate(cx, y, cz)
              : new THREE.BoxGeometry(len, 0.045, railT).translate(cx, y, cz),
        });
      });
      // 竖条（在横杆背面，与横杆仅面相接）
      const slats = 5;
      const off = (railT / 2 + slatT / 2) * run.inward;
      for (let k = 0; k < slats; k++) {
        const aa = a + (len * (k + 0.5)) / slats;
        const sx = run.axis === 'z' ? run.at + off : aa;
        const sz = run.axis === 'z' ? aa : run.at + off;
        parts.push({
          geo:
            run.axis === 'z'
              ? new THREE.BoxGeometry(slatT, 0.66, 0.055).translate(sx, 0.39, sz)
              : new THREE.BoxGeometry(0.055, 0.66, slatT).translate(sx, 0.39, sz),
        });
      }
    }
  });
  add(g, mergeGeos(parts), ctx.mats.woodPost, { outline: 0.01 }, ctx.mats);
  return g;
}

/** 露天温泉池：石台（旋转体）+ 池底 + 水面 + 缘石 + 汤口 + 木桶 */
function buildOnsen(ctx: BuildCtx, outLights: THREE.Light[]): THREE.Group {
  const g = new THREE.Group();
  const M = ctx.mats;
  const { cx, cz, innerR, outerR, deckTop, waterY } = ONSEN;

  // 石台：断面绕 Y 旋转（内壁 / 顶面 / 外壁），底部敞开但落地不可见
  const profile = [
    new THREE.Vector2(innerR, 0),
    new THREE.Vector2(innerR, deckTop),
    new THREE.Vector2(outerR, deckTop),
    new THREE.Vector2(outerR, 0),
  ];
  const lathe = new THREE.LatheGeometry(profile, 40);
  const stoneMat = M.stone.clone();
  stoneMat.side = THREE.DoubleSide;
  const deck = new THREE.Mesh(lathe, stoneMat);
  deck.position.set(cx, 0, cz);
  deck.castShadow = true;
  deck.receiveShadow = true;
  g.add(deck);

  // 池底 + 水面（半径都取 innerR，与石台内壁恰好相接）
  add(g, new THREE.CylinderGeometry(innerR, innerR, 0.06, 36).translate(cx, 0.03, cz), M.rockWet, { outline: 0, cast: false }, M);
  const waterGeo = new THREE.CircleGeometry(innerR, 40);
  waterGeo.rotateX(-Math.PI / 2);
  const water = add(g, waterGeo, M.waterHot, { x: cx, y: waterY, z: cz, cast: false, receive: false });
  // 边缘白色汤花圈
  const foamGeo = new THREE.RingGeometry(innerR - 0.16, innerR, 40);
  foamGeo.rotateX(-Math.PI / 2);
  add(g, foamGeo, M.foam, { x: cx, y: waterY + 0.014, z: cz, cast: false, receive: false });

  // 缘石：16 块，环向间距 2π×1.36/16 = 0.534 > 相邻最大半径和 0.496 → 绝不互相插入
  const rockParts: MergePart[] = [];
  const N = 16;
  const ringR = 1.36;
  for (let i = 0; i < N; i++) {
    const ang = (i / N) * Math.PI * 2;
    const rad = ringR + Math.sin(i * 2.7) * 0.04;
    const size = 0.16 + 0.02 * ((i * 7) % 3);
    const geo = rockGeometry(size, 100 + i, 0.62, 0);
    geo.rotateY(ang * 1.7 + i);
    geo.computeBoundingBox();
    // 用实际包围盒把底面对齐到石台顶面（严格落座，不沉入）
    geo.translate(cx + Math.cos(ang) * rad, deckTop - (geo.boundingBox as THREE.Box3).min.y, cz + Math.sin(ang) * rad);
    rockParts.push({ geo });
  }
  add(g, mergeGeos(rockParts), M.rock, { outline: 0.012 }, M);

  // 汤口（石砌出水口，底面坐在石台上、不越出石台外缘）+ 落水（贴着出水口内侧面）
  const spoutAng = -2.1;
  const spoutR = 1.24;
  add(
    g,
    boxG(0.36, 0.34, 0.3, cx + Math.cos(spoutAng) * spoutR, deckTop + 0.17, cz + Math.sin(spoutAng) * spoutR, 0.4),
    M.rockWet,
    { outline: 0.012, ry: Math.PI / 2 - spoutAng },
    M,
  );
  const jetTop = deckTop + 0.1;
  const jetR = 1.04;
  const jx = cx + Math.cos(spoutAng) * jetR;
  const jz = cz + Math.sin(spoutAng) * jetR;
  const fall = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.042, jetTop - waterY, 8), M.waterHot);
  fall.position.set(jx, (jetTop + waterY) / 2, jz);
  fall.castShadow = false;
  g.add(fall);

  // 木桶 + 手桶（放在池外地面，离开缘石径向范围）
  add(g, new THREE.CylinderGeometry(0.15, 0.13, 0.22, 12), M.woodLight, { x: cx + 1.85, y: 0.11, z: cz + 0.15, outline: 0.01 }, M);
  add(g, new THREE.CylinderGeometry(0.1, 0.09, 0.14, 10), M.woodLight, { x: cx + 1.9, y: 0.07, z: cz - 0.35, outline: 0.008 }, M);

  // 水面涟漪 + 蒸汽 + 暖光
  addRipples(ctx, g, { x: cx, y: waterY + 0.018, z: cz, count: 7, maxR: 1.05, speed: 0.16, spread: 0.9 });
  addRipples(ctx, g, { x: jx, y: waterY + 0.02, z: jz, count: 3, maxR: 0.4, speed: 0.5, spread: 0.05 });
  addSteam(ctx, g, { x: cx, y: waterY + 0.05, z: cz, count: ctx.q.steam, radius: 1.0, rise: 2.1, size: 0.62, opacity: 0.4 });
  const oLight = new THREE.PointLight(0xffd0a0, 1, 6.5, 2);
  oLight.position.set(cx, waterY + 0.5, cz);
  oLight.castShadow = false;
  g.add(oLight);
  outLights.push(oLight);
  ctx.anims.push((t) => {
    oLight.intensity = LIGHT_SCALE.point * 6 * (0.94 + 0.06 * Math.sin(t * 0.8));
    water.position.y = waterY + Math.sin(t * 1.1) * 0.004;
  });

  // 池边踏石（在缘石之外）
  add(g, boxG(0.5, 0.1, 0.42, cx - 2.0, 0.05, cz + 0.35, 0.5), M.stone, { outline: 0.01 }, M);
  ctx.blocked.push({ x: cx, z: cz, r: outerR + 0.35 });
  return g;
}

/** 溪流：槽内水面 + 两岸石 + 汀步石 + 瀑布 + 水潭 */
function buildStream(ctx: BuildCtx): THREE.Group {
  const g = new THREE.Group();
  const M = ctx.mats;

  // 溪流水面（与水面同高，两片恰好拼接、不重叠）
  const chanW = CHAN.x1 - CHAN.x0 - 0.02;
  const chanD = CHAN.z1 - CHAN.z0;
  const cwGeo = new THREE.PlaneGeometry(chanW, chanD);
  cwGeo.rotateX(-Math.PI / 2);
  worldUV(cwGeo, 1.3);
  const chanTex = ctx.tex.water.clone();
  chanTex.needsUpdate = true;
  const chanMat = M.water.clone();
  chanMat.map = chanTex;
  const chan = add(g, cwGeo, chanMat, {
    x: (CHAN.x0 + CHAN.x1) / 2, y: STREAM_Y, z: (CHAN.z0 + CHAN.z1) / 2, cast: false, receive: false,
  });
  chan.name = 'streamWater';

  const pondW = POND.x1 - POND.x0 - 0.04;
  const pondD = POND.z1 - POND.z0 - 0.01;
  const pwGeo = new THREE.PlaneGeometry(pondW, pondD);
  pwGeo.rotateX(-Math.PI / 2);
  worldUV(pwGeo, 1.3);
  add(g, pwGeo, chanMat, { x: (POND.x0 + POND.x1) / 2, y: STREAM_Y, z: POND.z0 + pondD / 2, cast: false, receive: false });

  // 水纹流动
  ctx.anims.push((t) => {
    chanTex.offset.y = -(t * 0.035) % 1;
  });

  // 两岸置石（沿槽边外侧落座于地面；纵向间距 0.72 > 相邻最大半径和 0.546 → 不互相插入）
  const bankParts: MergePart[] = [];
  for (let i = 0; i < 12; i++) {
    const z = -2.5 + i * 0.72;
    if (z > 0.95 && z < 2.55) continue; // 让开石拱桥（含桥台）
    if (z > CHAN.z1 - 0.25) break;
    [-1, 1].forEach((side) => {
      const edge = side < 0 ? CHAN.x0 : CHAN.x1;
      const r = rr(ctx.rng, 0.16, 0.22);
      const x = edge + side * (r * 1.24 + 0.05 + rr(ctx.rng, 0, 0.1));
      const geo = rockGeometry(r, 300 + i * 3 + side, 0.62, 0);
      geo.rotateY(ctx.rng() * 3);
      geo.computeBoundingBox();
      geo.translate(x, -(geo.boundingBox as THREE.Box3).min.y, z + rr(ctx.rng, -0.05, 0.05));
      bankParts.push({ geo });
    });
  }
  // 汀步石（坐在槽底，露出水面）
  [-1.6, 0.6, 3.3].forEach((z, i) => {
    const geo = rockGeometry(0.24, 420 + i, 0.5, 0);
    geo.computeBoundingBox();
    geo.translate(CHAN.x0 + 0.62 + (i % 2) * 0.06, CHAN_FLOOR - (geo.boundingBox as THREE.Box3).min.y, z);
    bankParts.push({ geo });
  });
  add(g, mergeGeos(bankParts), M.rockWet, { outline: 0.01 }, M);

  // 瀑布：主岩台（正面正好贴住水帘）+ 两侧岩体（相互间距远大于半径和）
  const fallParts: MergePart[] = [];
  [
    [-4.4, -3.48, 0.46, 501],
    [-3.5, -4.5, 0.3, 511],
    [-5.3, -4.45, 0.32, 521],
  ].forEach(([x, z, r, seed]) => {
    const geo = rockGeometry(r, seed, 0.8, 0);
    const y = groundY(ctx, x, z) - r * 0.34;
    geo.computeBoundingBox();
    geo.translate(x, y - (geo.boundingBox as THREE.Box3).min.y, z);
    fallParts.push({ geo });
  });
  add(g, mergeGeos(fallParts), M.rock, { outline: 0.016 }, M);

  const curtainH = 0.95 - STREAM_Y;
  const curtainGeo = new THREE.PlaneGeometry(0.62, curtainH);
  const curtain = add(g, curtainGeo, M.waterHot, {
    x: -4.4, y: STREAM_Y + curtainH / 2, z: -2.88, cast: false, receive: false,
  });
  curtain.name = 'waterfall';
  add(g, new THREE.PlaneGeometry(0.62, curtainH), M.waterHot, {
    x: -4.4, y: STREAM_Y + curtainH / 2, z: -2.885, ry: Math.PI, cast: false, receive: false,
  });
  addGlow(g, ctx, -4.4, STREAM_Y + 0.06, -2.8, 1.1, 0xdfeaff, 0.2);
  addSteam(ctx, g, { x: -4.4, y: STREAM_Y + 0.02, z: -2.72, count: Math.round(ctx.q.steam * 0.5), radius: 0.28, rise: 0.8, size: 0.35, opacity: 0.3 });

  // 溪面 / 水潭涟漪
  addRipples(ctx, g, { x: -4.4, y: STREAM_Y + 0.004, z: 0.5, count: 5, maxR: 0.34, speed: 0.42, spread: 0.28, sx: 0.85 });
  addRipples(ctx, g, { x: -4.4, y: STREAM_Y + 0.004, z: -2.5, count: 3, maxR: 0.3, speed: 0.6, spread: 0.18 });
  addRipples(ctx, g, { x: -4.05, y: STREAM_Y + 0.004, z: 5.25, count: 6, maxR: 0.42, speed: 0.3, spread: 0.5 });

  ctx.blocked.push({ x: (CHAN.x0 + CHAN.x1) / 2, z: 0.9, r: 1.0 });
  ctx.blocked.push({ x: -4.0, z: 5.3, r: 1.3 });
  ctx.blocked.push({ x: -4.4, z: -3.48, r: 1.05 });
  ctx.blocked.push({ x: -3.5, z: -4.5, r: 0.7 });
  ctx.blocked.push({ x: -5.3, z: -4.45, r: 0.7 });
  return g;
}

/** 石拱桥：两岸桥台 + 弧形拱圈楔块 + 随拱贴合的桥面 + 亲柱 */
function buildBridge(ctx: BuildCtx): THREE.Group {
  const g = new THREE.Group();
  const M = ctx.mats;
  const bz = 1.8; // 桥中线
  const z0 = bz - 0.45, z1 = bz + 0.45; // 桥宽 0.9
  const xL = -5.5, xR = -3.3; // 桥台外缘
  const axL = -5.0, axR = -3.8; // 拱脚
  const spring = 0.3; // 拱脚高
  const s = axR - axL;
  const R = 0.9;

  // 桥台
  add(g, boxG(axL - xL, spring, z1 - z0, (xL + axL) / 2, spring / 2, bz, 0.5), M.stone, { outline: 0.012 }, M);
  add(g, boxG(xR - axR, spring, z1 - z0, (axR + xR) / 2, spring / 2, bz, 0.5), M.stone, { outline: 0.012 }, M);

  // 拱圈：以 (cx, ycC) 为圆心，等角楔块首尾相接
  const cx = (axL + axR) / 2;
  const ycC = spring - Math.sqrt(R * R - (s / 2) * (s / 2)); // 圆心在起拱线下方
  const thMax = Math.asin(s / 2 / R);
  const nV = 9;
  const rt = 0.16;
  const rMid = R + rt / 2;
  const tang = rMid * ((thMax * 2) / nV);
  const parts: MergePart[] = [];
  for (let i = 0; i < nV; i++) {
    const th = -thMax + ((i + 0.5) * thMax * 2) / nV;
    const px = cx + Math.sin(th) * rMid;
    const py = ycC + Math.cos(th) * rMid;
    const geo = new THREE.BoxGeometry(tang, rt, z1 - z0);
    geo.rotateZ(-th);
    geo.translate(px, py, bz);
    parts.push({ geo });
    // 桥面石板：贴着拱圈外弧逐块铺，形成缓拱
    const rDeck = R + rt + 0.028;
    const geoD = new THREE.BoxGeometry(tang, 0.055, z1 - z0);
    geoD.rotateZ(-th);
    geoD.translate(cx + Math.sin(th) * rDeck, ycC + Math.cos(th) * rDeck, bz);
    parts.push({ geo: geoD, color: 0x9a99a2 });
  }
  add(g, mergeGeos(parts), M.colorful, { outline: 0.012 }, M);

  // 亲柱（桥面四角）：必须落在拱跨以内、由弧形桥面承托，不能落在拱脚之外（那里是桥台体）
  const deckTopAt = (x: number) => {
    const th = Math.asin(clamp((x - cx) / (R + rt + 0.028), -1, 1));
    return ycC + Math.cos(th) * (R + rt + 0.028) + 0.032;
  };
  [axL + 0.18, axR - 0.18].forEach((x) =>
    [z0 + 0.1, z1 - 0.1].forEach((z) => {
      const y = deckTopAt(x);
      add(g, boxG(0.15, 0.44, 0.15, x, y + 0.22, z, 0.4), M.stone, { outline: 0.01 }, M);
      add(g, boxG(0.19, 0.05, 0.19, x, y + 0.465, z, 0.4), M.stoneDark, { outline: 0.008 }, M);
    }),
  );
  return g;
}

/** 枯山水石庭：耙沙纹（贴图按石头实际位置绘制）+ 置石 + 苔岛 */
const SAND_STONES: Array<[number, number, number]> = [
  [-2.95, 3.15, 0.23],
  [-2.15, 3.75, 0.17],
  [-2.85, 4.15, 0.14],
];

function buildSansui(ctx: BuildCtx): THREE.Group {
  const g = new THREE.Group();
  const M = ctx.mats;
  const w = SAND.x1 - SAND.x0;
  const d = SAND.z1 - SAND.z0;

  // 耙沙贴图：由 BoxGeometry 顶面 UV 约定推得 —— 画布 px ↔ 世界 X，画布 py ↔ 世界 Z
  const tex = makeTex(
    512,
    512,
    (ctx2, W, H) => {
      ctx2.fillStyle = '#ded6c0';
      ctx2.fillRect(0, 0, W, H);
      ctx2.globalAlpha = 0.06;
      for (let i = 0; i < 2600; i++) {
        ctx2.fillStyle = i % 2 ? '#b6ab90' : '#f4eedd';
        ctx2.fillRect((i * 137) % W, (i * 311) % H, 2, 2);
      }
      ctx2.globalAlpha = 1;
      const pxPerX = W / w;
      const pxPerZ = H / d;
      SAND_STONES.forEach(([sx, sz, sr]) => {
        const px = (sx - SAND.x0) * pxPerX;
        const py = (sz - SAND.z0) * pxPerZ;
        for (let r = sr + 0.08; r < sr + 0.95; r += 0.075) {
          ctx2.beginPath();
          ctx2.ellipse(px, py, r * pxPerX, r * pxPerZ, 0, 0, Math.PI * 2);
          ctx2.strokeStyle = 'rgba(168,157,131,0.5)';
          ctx2.lineWidth = 1.6;
          ctx2.stroke();
          ctx2.beginPath();
          ctx2.ellipse(px, py, (r + 0.028) * pxPerX, (r + 0.028) * pxPerZ, 0, 0, Math.PI * 2);
          ctx2.strokeStyle = 'rgba(250,246,232,0.55)';
          ctx2.lineWidth = 1.4;
          ctx2.stroke();
        }
      });
    },
    false,
  );
  const sandMat = M.sand.clone();
  sandMat.map = tex;
  const sandBox = new THREE.Mesh(new THREE.BoxGeometry(w, SAND.h, d), sandMat);
  sandBox.position.set((SAND.x0 + SAND.x1) / 2, SAND.h / 2, (SAND.z0 + SAND.z1) / 2);
  sandBox.castShadow = false;
  sandBox.receiveShadow = true;
  g.add(sandBox);

  // 置石（用包围盒把底面正好落在沙面上）
  const stones: MergePart[] = [];
  SAND_STONES.forEach(([sx, sz, sr], i) => {
    const geo = rockGeometry(sr, 700 + i * 13, 0.78, 0);
    geo.rotateY(i * 1.2);
    geo.computeBoundingBox();
    geo.translate(sx, SAND.h - (geo.boundingBox as THREE.Box3).min.y, sz);
    stones.push({ geo });
  });
  add(g, mergeGeos(stones), M.rock, { outline: 0.012 }, M);

  // 苔岛（薄片，浮在沙面 3mm 之上）
  [
    [-1.75, 2.95, 0.3],
    [-3.3, 4.32, 0.24],
  ].forEach(([mx, mz, mr]) => {
    const geo = new THREE.CircleGeometry(mr, 14);
    geo.rotateX(-Math.PI / 2);
    geo.translate(mx, SAND.h + 0.003, mz);
    add(g, geo, M.moss, { outline: 0, cast: false }, M);
  });
  ctx.blocked.push({ x: (SAND.x0 + SAND.x1) / 2, z: (SAND.z0 + SAND.z1) / 2, r: Math.max(w, d) / 2 + 0.1 });
  return g;
}

/** 参道：石板（行列错缝、互不重叠） */
function buildPath(ctx: BuildCtx): THREE.Group {
  const g = new THREE.Group();
  const parts: MergePart[] = [];
  const colStep = 0.54, rowStep = 0.49;
  const rows = 6;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < 2; c++) {
      const x = PATH.cx + (c === 0 ? -colStep / 2 : colStep / 2);
      const z = PATH.z0 + 0.24 + r * rowStep;
      if (z > PATH.z1 - 0.2) continue;
      const sx = rr(ctx.rng, 0.42, 0.47);
      const sz = rr(ctx.rng, 0.36, 0.42);
      const geo = new THREE.BoxGeometry(sx, 0.035, sz);
      geo.rotateY(rr(ctx.rng, -0.05, 0.05));
      geo.translate(x + rr(ctx.rng, -0.012, 0.012), 0.0175, z + rr(ctx.rng, -0.012, 0.012));
      parts.push({ geo });
    }
  }
  add(g, mergeGeos(parts), ctx.mats.stone, { outline: 0.008, cast: false }, ctx.mats);
  return g;
}

/** 鸟居（明神型）：基础 / 柱 / 贯（分段穿过柱，不相交）/ 岛木 / 笠木 */
function buildTorii(ctx: BuildCtx): THREE.Group {
  const g = new THREE.Group();
  const M = ctx.mats;
  const { cx, cz, halfSpan, pillarR } = TORII;
  const px = [cx - halfSpan, cx + halfSpan];
  const footH = 0.09, pillarH = 1.62;
  const nukiY = 1.28, nukiH = 0.12;
  const shimakiY = footH + pillarH, shimakiH = 0.08;
  const kasagiY = shimakiY + shimakiH, kasagiH = 0.16;

  px.forEach((x) => {
    add(g, new THREE.CylinderGeometry(pillarR * 1.5, pillarR * 1.6, footH, 10), M.stone, { x, y: footH / 2, z: cz, outline: 0.01 }, M);
    add(g, new THREE.CylinderGeometry(pillarR * 0.88, pillarR, pillarH, 12), M.woodRed, { x, y: footH + pillarH / 2, z: cz, outline: 0.012 }, M);
  });

  // 贯：中间段 + 两外侧出头段（与圆柱面仅相切，不侵入）
  const innerL = px[0] + pillarR, innerR = px[1] - pillarR;
  const nukiParts: MergePart[] = [
    { geo: new THREE.BoxGeometry(innerR - innerL, nukiH, 0.16).translate((innerL + innerR) / 2, nukiY + nukiH / 2, cz) },
    { geo: new THREE.BoxGeometry(0.2, nukiH, 0.16).translate(px[0] - pillarR - 0.1, nukiY + nukiH / 2, cz) },
    { geo: new THREE.BoxGeometry(0.2, nukiH, 0.16).translate(px[1] + pillarR + 0.1, nukiY + nukiH / 2, cz) },
  ];
  add(g, mergeGeos(nukiParts), M.woodRed, { outline: 0.01 }, M);

  // 额束（贯与岛木之间的垫块）
  add(g, boxG(0.17, shimakiY - (nukiY + nukiH), 0.14, cx, (nukiY + nukiH + shimakiY) / 2, cz, 0.3), M.woodRed, { outline: 0.008 }, M);

  // 岛木 + 笠木
  add(g, boxG(2 * halfSpan + 2 * pillarR + 0.42, shimakiH, 0.15, cx, shimakiY + shimakiH / 2, cz, 0.4), M.woodRed, { outline: 0.01 }, M);
  add(g, boxG(2 * halfSpan + 2 * pillarR + 0.66, kasagiH, 0.19, cx, kasagiY + kasagiH / 2, cz, 0.4), M.woodRed, { outline: 0.012 }, M);
  // 笠木两端上翘（反り上がり）：绕 Z 正向转，外端抬起；与主体留 2cm 缝避免角部相碰
  [-1, 1].forEach((s) => {
    const w = 0.28;
    const x = cx + s * (halfSpan + pillarR + 0.33 + w / 2 + 0.02);
    const geo = new THREE.BoxGeometry(w, kasagiH, 0.19);
    const m = new THREE.Mesh(geo, M.woodRed);
    m.position.set(x, kasagiY + kasagiH / 2 + 0.05, cz);
    m.rotation.z = s * 0.16;
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    addOutline(g, m, 0.012, M);
  });
  return g;
}

/** 自动贩卖机：空腔式箱体（前框 + 玻璃 + 货道饮料），光带发光 */
function buildVendingMachine(ctx: BuildCtx, x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  const M = ctx.mats;
  const w = 0.72, h = 1.44, d = 0.56;
  const x0 = x - w / 2, x1 = x + w / 2;
  const z0 = z - d / 2, z1 = z + d / 2;
  const baseH = 0.06;
  const t = 0.05;
  const fr = 0.06;
  const topY = baseH + h - t; // 顶板下沿
  const zf0 = z1 - fr, zf1 = z1;
  const winY0 = baseH + 0.53, winY1 = baseH + h - 0.2;
  const winH = winY1 - winY0;
  const parts: MergePart[] = [];
  // 底座
  parts.push({ geo: boxG(w + 0.04, baseH, d + 0.04, x, baseH / 2, z, 0.5) });
  // 顶板（压在四壁之上）
  parts.push({ geo: boxG(w, t, d, x, topY + t / 2, z, 0.6) });
  // 左右侧板（前侧让给前框立边）
  parts.push({ geo: boxG(t, h - t, zf0 - z0, x0 + t / 2, baseH + (h - t) / 2, (z0 + zf0) / 2, 0.6) });
  parts.push({ geo: boxG(t, h - t, zf0 - z0, x1 - t / 2, baseH + (h - t) / 2, (z0 + zf0) / 2, 0.6) });
  // 背板（夹在两侧板之间）
  parts.push({ geo: boxG(w - t * 2, h - t, t, x, baseH + (h - t) / 2, z0 + t / 2, 0.6) });
  // 内底板
  parts.push({ geo: boxG(w - t * 2, 0.05, zf0 - z0 - t, x, baseH + 0.025, (z0 + t + zf0) / 2, 0.6) });
  // 前框：上横 / 下横 / 左右立边（四块相邻不重叠，中间留出橱窗）
  parts.push({ geo: boxG(w, topY - winY1, fr, x, (winY1 + topY) / 2, z1 - fr / 2, 0.4) });
  parts.push({ geo: boxG(w, winY0 - baseH, fr, x, (baseH + winY0) / 2, z1 - fr / 2, 0.4) });
  parts.push({ geo: boxG(fr, winH, fr, x0 + fr / 2, (winY0 + winY1) / 2, z1 - fr / 2, 0.4) });
  parts.push({ geo: boxG(fr, winH, fr, x1 - fr / 2, (winY0 + winY1) / 2, z1 - fr / 2, 0.4) });
  add(g, mergeGeos(parts), M.misc, { outline: 0.014 }, M);

  // 玻璃（贴着前框背面，不与之重叠）
  add(g, new THREE.PlaneGeometry(w - fr * 2, winH), M.glass, {
    x, y: (winY0 + winY1) / 2, z: zf0 - 0.004, cast: false, receive: false,
  });

  // 货架 + 饮料（层板两端顶到侧板内面，饮料各自坐在层板上）
  const drinks: MergePart[] = [];
  const shelfYs = [0.62, 0.86, 1.1];
  const shelfZ = (z0 + t + zf0) / 2;
  const shelfD = zf0 - z0 - t - 0.01;
  const colors = [0xe0574a, 0x3f7fd0, 0xefc14a, 0x51a86a, 0xe8e8ee];
  shelfYs.forEach((sy, row) => {
    drinks.push({ geo: boxG(w - t * 2, 0.022, shelfD, x, sy, shelfZ, 0.3), color: 0x3b4050 });
    for (let i = 0; i < 5; i++) {
      const dx = x - (w - t * 2 - 0.14) / 2 + (i * (w - t * 2 - 0.14)) / 4;
      drinks.push({
        geo: new THREE.CylinderGeometry(0.043, 0.043, 0.16, 8).translate(dx, sy + 0.011 + 0.08, shelfZ),
        color: colors[(i + row) % colors.length],
      });
    }
  });
  add(g, mergeGeos(drinks), M.colorful, { outline: 0, cast: false });

  // 光带（贴在前脸上方横框之外）+ 按钮 + 辉光
  add(g, new THREE.PlaneGeometry(w - 0.14, 0.14), M.displayGlow, {
    x, y: (winY1 + topY) / 2, z: z1 + 0.002, cast: false, receive: false,
  });
  const buttons: MergePart[] = [];
  for (let i = 0; i < 4; i++) {
    buttons.push({ geo: new THREE.BoxGeometry(0.05, 0.05, 0.02).translate(x - 0.18 + i * 0.12, baseH + 0.3, z1 + 0.011), color: 0xffb45c });
  }
  add(g, mergeGeos(buttons), M.colorful, { outline: 0, cast: false });
  const glow = addGlow(g, ctx, x, (winY1 + topY) / 2, z1 + 0.05, 1.5, 0xa8d4ff, 0.3);
  ctx.anims.push((t) => {
    (glow.material as THREE.SpriteMaterial).opacity = 0.24 + 0.06 * Math.sin(t * 2.2);
  });
  ctx.blocked.push({ x, z, r: 0.62 });
  return g;
}

/** 木长椅 */
function buildBench(ctx: BuildCtx, x: number, z: number, ry = 0): THREE.Group {
  const g = new THREE.Group();
  const M = ctx.mats;
  const w = 1.0;
  const seatY = 0.42;
  const legs: MergePart[] = [];
  [-1, 1].forEach((s) => {
    legs.push({ geo: boxG(0.07, seatY, 0.42, s * (w / 2 - 0.1), seatY / 2, 0, 0.3) });
  });
  add(g, mergeGeos(legs), M.woodPost, { outline: 0.008 }, M);
  add(g, boxG(w, 0.06, 0.42, 0, seatY + 0.03, 0, 0.5), M.woodLight, { outline: 0.01 }, M);
  // 靠背（底棱正好落在座面上沿，倾斜后仍不沉入）
  const back = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, 0.05), M.woodLight);
  back.position.set(0, seatY + 0.06 + 0.155, -0.185);
  back.rotation.x = -0.16;
  back.castShadow = true;
  back.receiveShadow = true;
  g.add(back);
  addOutline(g, back, 0.01, M);
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  seatOn(g, 0);
  ctx.blocked.push({ x, z, r: 0.65 });
  return g;
}

/** 路灯：石基 + 木杆 + 灯箱（木框在四角外）+ 四角锥顶 */
function buildStreetLamp(ctx: BuildCtx, x: number, z: number, withLight: boolean, outLights: THREE.Light[]): THREE.Group {
  const g = new THREE.Group();
  const M = ctx.mats;
  add(g, new THREE.CylinderGeometry(0.15, 0.18, 0.12, 10), M.stone, { y: 0.06, outline: 0.01 }, M);
  add(g, new THREE.CylinderGeometry(0.045, 0.055, 1.5, 8), M.woodPost, { y: 0.87, outline: 0.012 }, M);
  const lamp = add(g, new THREE.BoxGeometry(0.24, 0.3, 0.24), M.lampWarm.clone(), { y: 1.77, cast: false, outline: 0.01 }, M);
  const frame: MergePart[] = [];
  [-1, 1].forEach((sx) =>
    [-1, 1].forEach((sz) => {
      frame.push({ geo: new THREE.BoxGeometry(0.03, 0.3, 0.03).translate(sx * 0.135, 1.77, sz * 0.135) });
    }),
  );
  add(g, mergeGeos(frame), M.woodPost, { outline: 0.008 }, M);
  const cap = new THREE.ConeGeometry(0.26, 0.14, 4);
  cap.rotateY(Math.PI / 4);
  add(g, cap, M.roofTrim, { y: 1.99, outline: 0.012 }, M);

  g.position.set(x, 0, z);
  seatOn(g, 0);
  const glow = addGlow(g, ctx, 0, 1.77, 0, 2.0, 0xffc07a, 0.34);
  const mat = lamp.material as THREE.MeshBasicMaterial;
  let light: THREE.PointLight | null = null;
  if (withLight) {
    light = new THREE.PointLight(0xffc07a, 1, 7, 2);
    light.position.set(0, 1.72, 0);
    light.castShadow = false;
    g.add(light);
    outLights.push(light);
  }
  const ph = x * 1.7 + z * 0.9;
  ctx.anims.push((t) => {
    const k = 0.88 + 0.12 * Math.sin(t * 1.55 + ph) * Math.sin(t * 0.61 + ph * 0.5);
    mat.color.setRGB(k, 0.72 * k, 0.46 * k);
    (glow.material as THREE.SpriteMaterial).opacity = 0.2 + 0.2 * k;
    if (light) light.intensity = LIGHT_SCALE.point * 11 * k;
  });
  ctx.blocked.push({ x, z, r: 0.4 });
  return g;
}

/** 鹿威し（添水）：竹筒绕轴被水压得缓缓低头 → 磕石倒空 → 迅速回弹 */
function buildShishiOdoshi(ctx: BuildCtx, x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  const M = ctx.mats;
  const axleY = 0.32;
  // 石基座（顶面即接水面）
  add(g, new THREE.CylinderGeometry(0.2, 0.23, 0.1, 12), M.stone, { y: 0.05, outline: 0.012 }, M);
  // 两根立竹
  [-1, 1].forEach((s) => {
    add(g, new THREE.CylinderGeometry(0.032, 0.036, 0.22, 7), M.bamboo, { x: s * 0.16, y: 0.21, outline: 0.008 }, M);
  });
  // 横轴
  add(g, new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6).rotateZ(Math.PI / 2), M.bamboo, { y: axleY, outline: 0 }, M);
  // 受水石（在失衡端下方，筒落下时正好磕到）
  add(g, boxG(0.16, 0.14, 0.16, 0, 0.17, 0.3, 0.25), M.stoneDark, { outline: 0.008 }, M);
  // 竹筒（绕横轴倾斜；重心偏移，受水端在 +z）
  const tube = new THREE.Group();
  tube.position.set(0, axleY, 0);
  const tubeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.64, 10).rotateX(Math.PI / 2), M.bamboo);
  tubeMesh.position.z = 0.07;
  tubeMesh.castShadow = true;
  tubeMesh.receiveShadow = true;
  tube.add(tubeMesh);
  addOutline(tube, tubeMesh, 0.008, M);
  g.add(tube);
  // 注水（受水端抬起时才有水流）
  const streamH = 0.3;
  const stream = add(g, new THREE.CylinderGeometry(0.008, 0.011, streamH, 6), M.waterHot, {
    x: 0, y: axleY + 0.16 + streamH / 2, z: 0.3, cast: false, receive: false,
  });
  addRipples(ctx, g, { x: 0, y: 0.103, z: 0.3, count: 2, maxR: 0.16, speed: 0.5, spread: 0.06 });
  g.position.set(x, 0, z);
  seatOn(g, 0);
  ctx.anims.push((t) => {
    const k = (t * 0.26 + 0.35) % 1;
    let a: number;
    if (k < 0.78) a = -0.1 + 0.2 * (k / 0.78); // 缓缓低头（受水端变重）
    else {
      const q = (k - 0.78) / 0.22;
      a = 0.1 - 0.2 * Math.min(1, q * 1.5) - 0.03 * Math.sin(q * Math.PI); // 磕石后快速回弹
    }
    tube.rotation.x = a;
    stream.visible = a < -0.03;
  });
  ctx.blocked.push({ x, z, r: 0.5 });
  return g;
}

/**
 * 汤小屋（温泉区的小浴屋）：基座 / 四壁（正面两格障子透暖光）/ 切妻瓦顶 / 檐下提灯
 * 尺寸全部由入参推导；墙体分片拼装（前后墙占满整宽、左右墙让出转角），与主屋同一套做法
 */
function buildBathHut(
  ctx: BuildCtx,
  o: { cx: number; cz: number; w: number; d: number; wallH: number },
  outLights: THREE.Light[],
): THREE.Group {
  const g = new THREE.Group();
  const M = ctx.mats;
  const { cx, cz, w, d, wallH } = o;
  const t = 0.1;
  const po = 0.12;
  const plinthTop = 0.36;
  const x0 = cx - w / 2, x1 = cx + w / 2;
  const z0 = cz - d / 2, z1 = cz + d / 2;
  const wallTop = plinthTop + wallH;
  const winB = plinthTop + 0.18, winT = wallTop - 0.16;

  add(g, boxG(w + po * 2, plinthTop, d + po * 2, cx, plinthTop / 2, cz, 0.8), M.stone, { outline: 0.014 }, M);

  const parts: MergePart[] = [];
  const wc = (ax0: number, ax1: number, az0: number, az1: number, y0: number, y1: number) => {
    parts.push({ geo: boxG(ax1 - ax0, y1 - y0, az1 - az0, (ax0 + ax1) / 2, (y0 + y1) / 2, (az0 + az1) / 2, 1.0) });
  };
  wc(x0, x1, z0, z0 + t, plinthTop, wallTop);
  wc(x0, x0 + t, z0 + t, z1 - t, plinthTop, wallTop);
  wc(x1 - t, x1, z0 + t, z1 - t, plinthTop, wallTop);
  const fr = splitSegments(x0, x1, 2, 0.12);
  wc(x0, x1, z1 - t, z1, plinthTop, winB);
  wc(x0, x1, z1 - t, z1, winT, wallTop);
  fr.pillars.forEach(([a, b]) => wc(a, b, z1 - t, z1, winB, winT));
  add(g, mergeGeos(parts), M.wallWood, { outline: 0.013 }, M);

  fr.openings.forEach(([a, b]) => {
    addShoji(g, ctx, { a0: a, a1: b, y0: winB, y1: winT, at: z1 - t + 0.04, axis: 'z' });
    const gm = new THREE.MeshBasicMaterial({
      color: 0xffb367, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry((b - a) * 1.05, (winT - winB) * 1.05), gm);
    mesh.position.set((a + b) / 2, (winB + winT) / 2, z1 + 0.012);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    g.add(mesh);
  });

  const inX0 = x0 + t, inX1 = x1 - t, inZ0 = z0 + t, inZ1 = z1 - t;
  add(g, boxG(inX1 - inX0 - 0.04, 0.07, inZ1 - inZ0 - 0.04, cx, plinthTop + 0.035, cz, 0.5), M.tatami, { outline: 0, cast: false }, M);
  add(g, boxG(w * 0.5, 0.4, d * 0.34, cx - w * 0.16, plinthTop + 0.27, cz - d * 0.16, 0.4), M.woodLight, { outline: 0.01 }, M);
  addPaperLantern(g, ctx, { x: cx + w * 0.12, y: plinthTop + 1.02, z: cz + d * 0.1, r: 0.09, h: 0.14, cordTop: wallTop });
  const hu = new THREE.PointLight(0xffb066, 1, 5.5, 1.8);
  hu.position.set(cx, plinthTop + 0.95, cz);
  hu.castShadow = false;
  g.add(hu);
  outLights.push(hu);
  ctx.anims.push((t2) => {
    hu.intensity = LIGHT_SCALE.point * 6.5 * (0.94 + 0.06 * Math.sin(t2 * 1.1 + cx));
  });

  // 切妻瓦顶（与主屋同一套坡度推导：原点取屋脊上棱，几何体沿 ±z 分别延伸）
  const tanA = 0.66;
  const a2 = Math.atan(tanA);
  const cosA = Math.cos(a2), sinA = Math.sin(a2);
  const halfD = d / 2 + 0.06;
  const eave = 0.32;
  const roofT = 0.08;
  const ridgeTop = wallTop + halfD * tanA + roofT / cosA;
  const Lr = (halfD + eave) / cosA;
  const xSpan = w + 0.14 + eave * 2;
  const gap = 0.008;
  [-1, 1].forEach((side) => {
    const geo = new THREE.BoxGeometry(xSpan, roofT, Lr - gap);
    worldUV(geo, 1.0);
    geo.translate(0, -roofT / 2, side * ((Lr - gap) / 2 + gap));
    const m = new THREE.Mesh(geo, M.roof);
    m.rotation.x = side * a2;
    m.position.set(cx, ridgeTop, cz);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    addOutline(g, m, 0.013, M);
  });
  const apex = ridgeTop - roofT / cosA;
  [-1, 1].forEach((side) => {
    const gx0 = side < 0 ? x0 - 0.02 : x1 - 0.11;
    add(
      g,
      prismX(
        [
          [wallTop, cz - halfD],
          [apex, cz],
          [wallTop, cz + halfD],
        ],
        gx0,
        gx0 + 0.13,
      ),
      M.plaster,
      { outline: 0.012 },
      M,
    );
  });
  const capW = 0.18, capH = 0.09;
  add(
    g,
    prismX(
      [
        [ridgeTop - capW * tanA, cz - capW],
        [ridgeTop, cz],
        [ridgeTop - capW * tanA, cz + capW],
        [ridgeTop + capH, cz + capW],
        [ridgeTop + capH, cz - capW],
      ],
      cx - xSpan / 2,
      cx + xSpan / 2,
    ),
    M.roofTrim,
    { outline: 0.012 },
    M,
  );

  // 檐下提灯（吊在檐口正中）
  const eaveUnder = ridgeTop - roofT * cosA - (halfD + 0.2 + roofT * sinA) * tanA;
  addPaperLantern(g, ctx, { x: cx, y: eaveUnder - 0.2, z: z1 + 0.16, r: 0.075, h: 0.12, cordTop: eaveUnder - 0.01 });

  ctx.blocked.push({ x: cx, z: cz, r: Math.max(w, d) / 2 + 0.5 });
  return g;
}

/** 竹制目隠し（温泉区挡景竹垣）：立竹 + 四道横竹 + 细竹格（错层不相交） */
function buildBambooScreen(ctx: BuildCtx, x: number, z0: number, z1: number): THREE.Group {
  const g = new THREE.Group();
  const M = ctx.mats;
  const parts: MergePart[] = [];
  const len = z1 - z0;
  const n = Math.max(2, Math.round(len / 0.85));
  const step = len / n;
  for (let i = 0; i <= n; i++) {
    parts.push({ geo: new THREE.CylinderGeometry(0.046, 0.05, 1.12, 7).translate(x, 0.56, z0 + i * step) });
  }
  for (let i = 0; i < n; i++) {
    const a = z0 + i * step + 0.05;
    const b = z0 + (i + 1) * step - 0.05;
    [0.26, 0.53, 0.8, 1.03].forEach((y) => {
      parts.push({ geo: new THREE.CylinderGeometry(0.026, 0.026, b - a, 6).rotateX(Math.PI / 2).translate(x, y, (a + b) / 2) });
    });
    const slats = Math.max(3, Math.round((b - a) / 0.16));
    for (let k = 0; k < slats; k++) {
      parts.push({ geo: new THREE.CylinderGeometry(0.018, 0.018, 1.0, 5).translate(x - 0.048, 0.56, a + ((b - a) * (k + 0.5)) / slats) });
    }
  }
  add(g, mergeGeos(parts), M.bamboo, { outline: 0.012 }, M);
  ctx.blocked.push({ x, z: (z0 + z1) / 2, r: len / 2 + 0.25 });
  return g;
}

/** 地面水洼（薄水面 + 持续涟漪） */
function buildPuddles(ctx: BuildCtx): THREE.Group {
  const g = new THREE.Group();
  const spots: Array<[number, number, number, number]> = [
    [0.62, 4.3, 0.32, 1.55],
    [1.0, 2.7, 0.24, 1.0],
    [-3.0, 1.0, 0.28, 1.35],
    [-2.75, 0.2, 0.2, 0.9],
  ];
  spots.forEach(([x, z, r, sq]) => {
    const geo = new THREE.CircleGeometry(r, 22);
    geo.rotateX(-Math.PI / 2);
    geo.scale(1, 1, sq);
    add(g, geo, ctx.mats.water, { x, y: 0.012, z, cast: false, receive: false });
    addRipples(ctx, g, { x, y: 0.016, z, count: 4, maxR: r * 0.9, speed: 0.34, spread: r * 0.5, sx: 1, sz: sq });
  });
  return g;
}

/** 手水钵（蹲踞）：石盆 + 水面 + 竹制出水口与落水 + 竹杓 */
function buildChozu(ctx: BuildCtx, x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  const M = ctx.mats;
  add(g, new THREE.CylinderGeometry(0.26, 0.29, 0.24, 12), M.stone, { y: 0.12, outline: 0.012 }, M);
  const wGeo = new THREE.CircleGeometry(0.22, 18);
  wGeo.rotateX(-Math.PI / 2);
  add(g, wGeo, M.water, { y: 0.2, cast: false, receive: false });
  // 竹制出水口：立竹 + 横竹（横竹从盆沿上方伸入，不碰盆体）
  add(g, new THREE.CylinderGeometry(0.032, 0.036, 0.75, 7), M.bamboo, { x: 0.42, y: 0.375, z: 0, outline: 0.01 }, M);
  add(g, new THREE.CylinderGeometry(0.06, 0.07, 0.07, 8), M.stoneDark, { x: 0.42, y: 0.035, z: 0, outline: 0.006 }, M);
  add(g, new THREE.CylinderGeometry(0.022, 0.022, 0.36, 7).rotateZ(Math.PI / 2), M.bamboo, { x: 0.24, y: 0.43, z: 0, outline: 0 }, M);
  // 落水：从横竹末端到水面
  const streamH = 0.43 - 0.2;
  add(g, new THREE.CylinderGeometry(0.009, 0.012, streamH, 6), M.waterHot, { x: 0.06, y: 0.2 + streamH / 2, z: 0, cast: false, receive: false });
  // 竹杓（放在盆沿另一侧）
  add(g, new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6), M.bamboo, { x: -0.2, y: 0.26, z: 0.12, rz: Math.PI / 2, ry: 0.4, outline: 0 }, M);
  add(g, new THREE.CylinderGeometry(0.05, 0.045, 0.05, 8), M.bamboo, { x: -0.34, y: 0.26, z: 0.19, outline: 0.006 }, M);
  g.position.set(x, 0, z);
  seatOn(g, 0);
  addRipples(ctx, g, { x: 0.06, y: 0.205, z: 0, count: 3, maxR: 0.2, speed: 0.45, spread: 0.1 });
  ctx.blocked.push({ x, z, r: 0.55 });
  return g;
}

/* ==========================================================================
 * 10 · 植被（树 / 竹 / 松林）
 * ========================================================================== */

/** 阔叶树：树干 + 团状卡通树冠（树干顶端藏进树冠内部，绝不外露） */
function buildTree(
  ctx: BuildCtx,
  spec: { x: number; z: number; h: number; r: number; mat: THREE.Material; seed: number; sway?: number; groundY?: number },
): THREE.Group {
  const g = new THREE.Group();
  const M = ctx.mats;
  const trunkR = 0.05 + spec.r * 0.055;
  add(g, new THREE.CylinderGeometry(trunkR * 0.72, trunkR, spec.h, 8), M.bark, { y: spec.h / 2, outline: 0.012 }, M);
  const canopy = new THREE.Mesh(blobGeometry(spec.r, 2, 0.2, spec.seed), spec.mat);
  canopy.position.set(0, spec.h + spec.r * 0.25, 0);
  canopy.castShadow = true;
  canopy.receiveShadow = true;
  g.add(canopy);
  addOutline(g, canopy, 0.016, M);

  g.position.set(spec.x, 0, spec.z);
  g.rotation.y = spec.seed * 0.7;
  seatOn(g, spec.groundY ?? 0);
  const amp = spec.sway ?? 0.014;
  const ph = spec.x * 1.7 + spec.z * 2.3;
  ctx.anims.push((t) => {
    g.rotation.z = amp * Math.sin(t * 0.62 + ph) + amp * 0.4 * Math.sin(t * 1.31 + ph * 1.7);
    g.rotation.x = amp * 0.7 * Math.cos(t * 0.53 + ph * 0.8);
    canopy.rotation.y = 0.03 * Math.sin(t * 0.35 + ph);
  });
  return g;
}

/** 松树几何（四段式：树干 + 三层锥形树冠，层与层只相接不重叠） */
function pineGeometry(): THREE.BufferGeometry {
  return mergeGeos([
    { geo: new THREE.CylinderGeometry(0.052, 0.075, 0.45, 6).translate(0, 0.225, 0) },
    { geo: new THREE.ConeGeometry(0.46, 0.62, 7).translate(0, 0.45 + 0.31, 0) },
    { geo: new THREE.ConeGeometry(0.34, 0.56, 7).translate(0, 1.07 + 0.28, 0) },
    { geo: new THREE.ConeGeometry(0.22, 0.46, 7).translate(0, 1.63 + 0.23, 0) },
  ]);
}

/** 竹：竹杆 + 同心竹节环（环内径大于杆径）+ 顶部两簇竹叶 */
function bambooGeometry(): THREE.BufferGeometry {
  const parts: MergePart[] = [{ geo: new THREE.CylinderGeometry(0.03, 0.042, 2.5, 6).translate(0, 1.25, 0) }];
  for (let i = 1; i <= 4; i++) {
    const y = i * 0.5;
    const r = 0.03 + 0.012 * (1 - y / 2.5);
    parts.push({ geo: new THREE.CylinderGeometry(r * 1.34, r * 1.34, 0.035, 6, 1, true).translate(0, y, 0) });
  }
  parts.push({ geo: blobGeometry(0.22, 1, 0.24, 9).translate(0, 2.78, 0) });
  parts.push({ geo: blobGeometry(0.15, 1, 0.26, 15).translate(0.245, 2.42, 0.05) });
  return mergeGeos(parts);
}

interface InstanceSpec {
  x: number;
  z: number;
  y: number;
  s: number;
  yaw: number;
  phase: number;
}

/** 实例化植被 + 逐实例风摆（矩阵每帧重算，原点在根部 → 摇摆不脱离地面） */
function buildInstancedFlora(
  ctx: BuildCtx,
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  list: InstanceSpec[],
  swayAmp: number,
  outline: number,
): void {
  if (!list.length) return;
  const mesh = new THREE.InstancedMesh(geo, mat, list.length);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  parent.add(mesh);
  const dummy = new THREE.Object3D();
  const apply = (t: number) => {
    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      dummy.position.set(it.x, it.y, it.z);
      dummy.rotation.set(
        swayAmp * Math.sin(t * 0.7 + it.phase) * 0.7,
        it.yaw,
        swayAmp * Math.sin(t * 0.55 + it.phase * 1.3),
      );
      dummy.scale.set(it.s * (0.94 + 0.06 * Math.sin(it.phase * 3)), it.s, it.s * (0.94 + 0.06 * Math.cos(it.phase * 2)));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  apply(0);
  ctx.anims.push((t) => apply(t));
  if (outline > 0) addInstancedOutline(mesh, outline, ctx.mats);
}

/* ==========================================================================
 * 11 · 天空 / 星月 / 云
 * ========================================================================== */

function buildSky(ctx: BuildCtx): THREE.Group {
  const g = new THREE.Group();
  g.name = 'sky';

  const domeMat = new THREE.MeshBasicMaterial({ map: ctx.tex.sky, side: THREE.BackSide, depthWrite: false });
  domeMat.fog = false; // 天穹不受雾影响
  const dome = new THREE.Mesh(new THREE.SphereGeometry(80, 32, 20), domeMat);
  dome.renderOrder = -100;
  dome.castShadow = false;
  dome.receiveShadow = false;
  g.add(dome);

  // 月亮 + 光晕
  const moonMat = new THREE.SpriteMaterial({ map: ctx.tex.moon, transparent: true, depthWrite: false, opacity: 0.95 });
  moonMat.fog = false;
  const moon = new THREE.Sprite(moonMat);
  moon.position.set(-27, 23, -50);
  moon.scale.setScalar(6.6);
  g.add(moon);
  const moonGlowMat = new THREE.SpriteMaterial({ map: ctx.tex.disc, color: 0xd9d2ff, transparent: true, opacity: 0.34, depthWrite: false, blending: THREE.AdditiveBlending });
  moonGlowMat.fog = false;
  const moonGlow = new THREE.Sprite(moonGlowMat);
  moonGlow.position.copy(moon.position);
  moonGlow.scale.setScalar(24);
  g.add(moonGlow);

  // 星空：三层不同大小/速度，交错闪烁
  const layers = [
    { n: Math.round(ctx.q.stars * 0.5), size: 0.52, color: 0xffffff, speed: 1.35, ph: 0.0 },
    { n: Math.round(ctx.q.stars * 0.3), size: 0.78, color: 0xcfe0ff, speed: 0.92, ph: 2.1 },
    { n: Math.round(ctx.q.stars * 0.2), size: 1.1, color: 0xffe4f2, speed: 0.63, ph: 4.3 },
  ];
  layers.forEach((L) => {
    const pos = new Float32Array(L.n * 3);
    const col = new Float32Array(L.n * 3);
    const c = new THREE.Color();
    for (let i = 0; i < L.n; i++) {
      const u = ctx.rng() * Math.PI * 2;
      const v = 0.04 + ctx.rng() * 0.94; // 只铺地平线以上
      const phi = Math.acos(1 - v);
      const r = 74;
      pos[i * 3] = Math.sin(phi) * Math.cos(u) * r;
      pos[i * 3 + 1] = Math.cos(phi) * r * 0.92;
      pos[i * 3 + 2] = Math.sin(phi) * Math.sin(u) * r;
      c.set(L.color).lerp(new THREE.Color(0xa9c4ff), ctx.rng() * 0.5);
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: L.size,
      map: ctx.tex.disc,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    mat.fog = false;
    g.add(pts);
    ctx.anims.push((t) => {
      const k = 0.5 + 0.5 * Math.sin(t * L.speed + L.ph);
      mat.opacity = 0.55 + 0.45 * k;
      mat.size = L.size * (0.86 + 0.28 * k);
    });
  });

  // 夜色薄云（缓慢横移）
  for (let i = 0; i < 5; i++) {
    const cloudMat = new THREE.SpriteMaterial({
      map: ctx.tex.cloud,
      color: 0x8f7fc4,
      transparent: true,
      opacity: rr(ctx.rng, 0.12, 0.24),
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    cloudMat.fog = false;
    const sp = new THREE.Sprite(cloudMat);
    const y = rr(ctx.rng, 16, 28);
    const z = rr(ctx.rng, -46, -10);
    sp.position.set(rr(ctx.rng, -40, 40), y, z);
    const s = rr(ctx.rng, 26, 46);
    sp.scale.set(s, s * 0.45, 1);
    g.add(sp);
    const sp0 = sp.position.x;
    const vx = rr(ctx.rng, 0.12, 0.34);
    ctx.anims.push((t) => {
      sp.position.x = ((sp0 + t * vx + 60) % 120) - 60;
    });
  }
  return g;
}

/* ==========================================================================
 * 12 · 地面散布（草丛 / 碎石 / 苔藓 / 落叶）
 * ========================================================================== */

function buildScatter(ctx: BuildCtx): THREE.Group {
  const g = new THREE.Group();
  const M = ctx.mats;
  const rng = ctx.rng;

  /* 草丛（三叶一小簇，实例化） */
  const tuft = mergeGeos([
    { geo: new THREE.ConeGeometry(0.035, 0.19, 4).translate(0, 0.095, 0) },
    { geo: new THREE.ConeGeometry(0.03, 0.15, 4).translate(0.055, 0.075, 0.02) },
    { geo: new THREE.ConeGeometry(0.028, 0.13, 4).translate(-0.045, 0.065, -0.03) },
  ]);
  const grassList: InstanceSpec[] = [];
  const wanted = ctx.q.grass;
  let guard = 0;
  while (grassList.length < wanted && guard++ < wanted * 40) {
    const x = rr(rng, -7.5, 7.5);
    const z = rr(rng, -2.55, 7.5);
    if (x > CHAN.x0 - 0.2 && x < CHAN.x1 + 0.2 && z > CHAN.z0 - 0.2 && z < POND.z1 + 0.2) continue;
    if (hitDiscs(x, z, 0.1, ctx.blocked)) continue;
    grassList.push({ x, z, y: 0, s: rr(rng, 0.7, 1.5), yaw: rng() * 6.28, phase: rng() * 6.28 });
  }
  buildInstancedFlora(ctx, g, tuft, M.leafGreen, grassList, 0.09, 0);

  /* 碎石 */
  const pebbleGeo = mergeGeos([{ geo: rockGeometry(0.075, 909, 0.5, 0) }]);
  const pebbles: InstanceSpec[] = [];
  guard = 0;
  while (pebbles.length < 90 && guard++ < 4000) {
    const x = rr(rng, -7.6, 7.6);
    const z = rr(rng, -2.5, 7.6);
    if (x > CHAN.x0 - 0.15 && x < CHAN.x1 + 0.15 && z > CHAN.z0 - 0.15 && z < POND.z1 + 0.15) continue;
    if (hitDiscs(x, z, 0.08, ctx.blocked)) continue;
    pebbles.push({ x, z, y: 0, s: rr(rng, 0.6, 1.6), yaw: rng() * 6.28, phase: 0 });
  }
  buildInstancedFlora(ctx, g, pebbleGeo, M.stoneDark, pebbles, 0, 0);

  /* 苔藓斑（薄片，浮在地面 8mm 之上） */
  const mossGeo = new THREE.CircleGeometry(0.3, 12);
  mossGeo.rotateX(-Math.PI / 2);
  const mosses: InstanceSpec[] = [];
  guard = 0;
  while (mosses.length < 26 && guard++ < 2000) {
    const x = rr(rng, -7.5, 7.5);
    const z = rr(rng, -2.3, 7.5);
    if (x > CHAN.x0 - 0.3 && x < POND.x1 + 0.3 && z > CHAN.z0 - 0.3 && z < POND.z1 + 0.3) continue;
    if (hitDiscs(x, z, 0.35, ctx.blocked)) continue;
    mosses.push({ x, z, y: 0.008, s: rr(rng, 0.6, 1.5), yaw: rng() * 6.28, phase: 0 });
  }
  if (mosses.length) {
    const moss = new THREE.InstancedMesh(mossGeo, M.moss, mosses.length);
    const dummy = new THREE.Object3D();
    mosses.forEach((it, i) => {
      dummy.position.set(it.x, it.y, it.z);
      dummy.rotation.set(0, it.yaw, 0);
      dummy.scale.set(it.s, 1, it.s * rr(rng, 0.7, 1.3));
      dummy.updateMatrix();
      moss.setMatrixAt(i, dummy.matrix);
    });
    moss.receiveShadow = true;
    moss.castShadow = false;
    moss.frustumCulled = false;
    g.add(moss);
  }

  /* 地面落叶（贴在红叶树附近） */
  const leafGeo = new THREE.PlaneGeometry(0.14, 0.17);
  leafGeo.rotateX(-Math.PI / 2);
  const leafMat = new THREE.MeshBasicMaterial({
    map: ctx.tex.leaf,
    transparent: true,
    alphaTest: 0.35,
    side: THREE.DoubleSide,
  });
  const groundLeaves: InstanceSpec[] = [];
  const sources: Array<[number, number]> = [
    [-3.15, 0.45],
    [2.25, -0.55],
    [4.85, 4.6],
    [-1.5, -2.95],
  ];
  guard = 0;
  while (groundLeaves.length < 120 && guard++ < 6000) {
    const [sx, sz] = sources[Math.floor(rng() * sources.length)];
    const x = sx + rr(rng, -1.9, 1.9);
    const z = sz + rr(rng, -1.9, 1.9);
    if (Math.abs(x) > 7.6 || z < -2.6 || z > 7.6) continue;
    if (hitDiscs(x, z, 0.1, ctx.blocked)) continue;
    groundLeaves.push({ x, z, y: 0.007, s: rr(rng, 0.8, 1.5), yaw: rng() * 6.28, phase: 0 });
  }
  if (groundLeaves.length) {
    const lm = new THREE.InstancedMesh(leafGeo, leafMat, groundLeaves.length);
    const dummy = new THREE.Object3D();
    groundLeaves.forEach((it, i) => {
      dummy.position.set(it.x, it.y, it.z);
      dummy.rotation.set(0, it.yaw, 0);
      dummy.scale.setScalar(it.s);
      dummy.updateMatrix();
      lm.setMatrixAt(i, dummy.matrix);
    });
    lm.castShadow = false;
    lm.receiveShadow = false;
    lm.frustumCulled = false;
    g.add(lm);
  }
  return g;
}

/* ==========================================================================
 * 12.5 · 夜景氛围件（萤火 / 锦鲤 / 水面月光 / 谷雾 / 砂庭踏石）
 * ========================================================================== */

function buildNightAtmosphere(ctx: BuildCtx): THREE.Group {
  const g = new THREE.Group();
  const M = ctx.mats;

  /* 萤火虫：缓慢漂移 + 呼吸闪烁（避开建筑/水面等已登记区域） */
  for (let i = 0; i < 12; i++) {
    let cx = 0, cz = 0, ok = false;
    for (let tryN = 0; tryN < 40 && !ok; tryN++) {
      cx = rr(ctx.rng, -4.8, 4.8);
      cz = rr(ctx.rng, -1.6, 5.4);
      ok = !hitDiscs(cx, cz, 0.35, ctx.blocked);
    }
    const mat = new THREE.SpriteMaterial({
      map: ctx.tex.disc,
      color: 0xd6ff9c,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const sp = new THREE.Sprite(mat);
    const s0 = rr(ctx.rng, 0.07, 0.13);
    sp.scale.setScalar(s0);
    g.add(sp);
    const ph = ctx.rng() * 6.28;
    const rad = rr(ctx.rng, 0.35, 1.0);
    const y0 = rr(ctx.rng, 0.35, 1.3);
    const spd = rr(ctx.rng, 0.12, 0.3);
    const blink = rr(ctx.rng, 0.45, 1.05);
    ctx.anims.push((t) => {
      sp.position.set(
        cx + Math.sin(t * spd + ph) * rad,
        y0 + Math.sin(t * spd * 1.7 + ph * 2) * 0.22,
        cz + Math.cos(t * spd * 0.8 + ph * 1.4) * rad,
      );
      const k = Math.max(0, Math.sin(t * blink * 2.2 + ph * 3));
      mat.opacity = 0.12 + 0.72 * k * k;
      sp.scale.setScalar(s0 * (0.7 + 0.5 * k));
    });
  }

  /* 锦鲤 ×2：在潭中缓慢巡游，背脊刚刚破水 */
  [
    { mat: M.leafOrange, r: 0.5, sz: 0.28, y: -0.042, spd: 0.28, ph: 0 },
    { mat: M.plaster, r: 0.36, sz: 0.2, y: -0.05, spd: 0.22, ph: 2.6 },
  ].forEach((spec, idx) => {
    const koi = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), spec.mat);
    body.scale.set(1.6, 0.6, 0.72);
    koi.add(body);
    // 尾鳍：底面切点正好落在鱼身尾端（仅相切不钻入）
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.1, 6), spec.mat);
    tail.rotation.z = Math.PI / 2;
    tail.position.x = -0.162;
    koi.add(tail);
    // 背鳍：底面落在鱼身顶面
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.06, 5), spec.mat);
    fin.position.y = 0.072;
    koi.add(fin);
    koi.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = false;
        m.receiveShadow = false;
      }
    });
    g.add(koi);
    const tailMesh = tail;
    ctx.anims.push((t) => {
      const a = t * spec.spd + spec.ph;
      const px = -4.0 + Math.cos(a) * spec.r;
      const pz = 5.3 + Math.sin(a) * spec.sz;
      koi.position.set(px, spec.y + Math.sin(t * 1.4 + spec.ph) * 0.006, pz);
      // 朝向沿椭圆切线：本地 +X 对齐速度方向
      const vx = -Math.sin(a) * spec.r;
      const vz = Math.cos(a) * spec.sz;
      koi.rotation.y = Math.atan2(-vz, vx);
      tailMesh.rotation.y = Math.sin(t * 4.5 + spec.ph) * 0.5;
    });
  });

  /* 水面月光倒影（加色柔光，拉长呈竖向） */
  [
    [ONSEN.cx, ONSEN.waterY + 0.02, ONSEN.cz, 0.9, 2.4, 0.16],
    [-4.0, STREAM_Y + 0.02, 5.25, 0.7, 1.9, 0.12],
  ].forEach(([x, y, z, sx, sy, op]) => {
    const mat = new THREE.SpriteMaterial({
      map: ctx.tex.disc,
      color: 0xcfe0ff,
      transparent: true,
      opacity: op,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const sp = new THREE.Sprite(mat);
    sp.position.set(x, y, z);
    sp.scale.set(sx, sy, 1);
    g.add(sp);
    ctx.anims.push((t) => {
      mat.opacity = op * (0.72 + 0.28 * Math.sin(t * 0.6));
    });
  });

  /* 溪谷低雾：几片很大的柔光片缓慢横移（透明度自身缓慢起伏） */
  for (let i = 0; i < 5; i++) {
    const baseOp = rr(ctx.rng, 0.04, 0.085);
    const mat = new THREE.SpriteMaterial({
      map: ctx.tex.disc,
      color: 0xcdd6f2,
      transparent: true,
      opacity: baseOp,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const sp = new THREE.Sprite(mat);
    const bx = rr(ctx.rng, -5.0, -2.6);
    const bz = rr(ctx.rng, -2.4, 5.4);
    const s = rr(ctx.rng, 2.2, 4.2);
    sp.position.set(bx, rr(ctx.rng, 0.18, 0.5), bz);
    sp.scale.set(s, s * 0.42, 1);
    g.add(sp);
    const vx = rr(ctx.rng, 0.02, 0.06);
    const ph = ctx.rng() * 6.28;
    ctx.anims.push((t) => {
      sp.position.x = bx + Math.sin(t * vx + ph) * 0.9;
      mat.opacity = baseOp * (0.55 + 0.45 * Math.sin(t * 0.22 + ph));
    });
  }

  /* 枯山水石庭的观景踏石（坐在沙面上，避开置石与苔岛） */
  const stepParts: MergePart[] = [];
  [
    [-1.58, 3.3],
    [-1.62, 3.68],
    [-1.66, 4.06],
    [-1.7, 4.42],
  ].forEach(([sx, sz], i) => {
    const geo = new THREE.BoxGeometry(0.3, 0.045, 0.26);
    geo.rotateY(rr(ctx.rng, -0.14, 0.14));
    geo.translate(sx, SAND.h + 0.0225, sz);
    stepParts.push({ geo });
    void i;
  });
  add(g, mergeGeos(stepParts), M.stoneDark, { outline: 0.008, cast: false }, M);

  return g;
}

/* ==========================================================================
 * 13 · 飘落的红叶
 * ========================================================================== */

function buildFallingLeaves(ctx: BuildCtx): THREE.Group {
  const g = new THREE.Group();
  const n = ctx.q.leaves;
  const geo = new THREE.PlaneGeometry(0.15, 0.19);
  const mat = new THREE.MeshBasicMaterial({
    map: ctx.tex.leaf,
    transparent: true,
    alphaTest: 0.35,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  g.add(mesh);

  const sources: Array<[number, number, number]> = [
    [-3.15, 1.75, 0.45],
    [2.25, 1.6, -0.55],
    [4.85, 1.85, 4.6],
    [-1.5, 1.95, -2.95],
  ];
  interface LeafState {
    sx: number;
    sz: number;
    y: number;
    vy: number;
    vx: number;
    vz: number;
    spin: number;
    ph: number;
    t: number;
  }
  const st: LeafState[] = [];
  for (let i = 0; i < n; i++) {
    const src = sources[i % sources.length];
    st.push({
      sx: src[0] + rr(ctx.rng, -1.2, 1.2),
      sz: src[2] + rr(ctx.rng, -1.2, 1.2),
      y: rr(ctx.rng, 0.6, src[1]),
      vy: rr(ctx.rng, 0.16, 0.34),
      vx: rr(ctx.rng, -0.12, 0.12),
      vz: rr(ctx.rng, -0.12, 0.12),
      spin: rr(ctx.rng, 0.6, 2.2),
      ph: ctx.rng() * 6.28,
      t: ctx.rng() * 40,
    });
  }
  const dummy = new THREE.Object3D();
  ctx.anims.push((t, dt) => {
    for (let i = 0; i < n; i++) {
      const L = st[i];
      L.t += dt;
      L.y -= L.vy * dt;
      const flutter = Math.sin(L.t * 2.4 + L.ph) * 0.22;
      dummy.position.set(
        L.sx + L.vx * L.t + Math.sin(L.t * 0.9 + L.ph) * 0.3,
        L.y,
        L.sz + L.vz * L.t + Math.cos(L.t * 0.75 + L.ph) * 0.26,
      );
      dummy.rotation.set(flutter, L.t * L.spin, Math.sin(L.t * 1.7 + L.ph) * 0.5);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      if (L.y < 0.05) {
        L.y = rr(ctx.rng, 1.4, 2.4);
        L.t = 0;
        L.sx = L.sx + rr(ctx.rng, -0.6, 0.6);
        L.sz = L.sz + rr(ctx.rng, -0.6, 0.6);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return g;
}

/* ==========================================================================
 * 14 · React 组件
 * ========================================================================== */

export function buildDiorama(renderer: THREE.WebGLRenderer, quality: DioramaQuality): {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  anims: Anim[];
  root: THREE.Group;
  vignette: THREE.Mesh;
} {
  const q = QUALITY[quality];
  const scene = new THREE.Scene();
  // 夜色紫雾：给"山间"以距离感（天空穹顶/星月/云单独关闭雾，避免被雾染色）
  scene.fog = new THREE.FogExp2(0x2f2c49, 0.0155);
  const rng = mulberry32(20260923);
  const tex = createTextures();
  const mats = createMaterials(tex);
  const anims: Anim[] = [];
  const ctx: BuildCtx = { rng, tex, mats, anims, q, blocked: [] };

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 400);
  // 暗角：1×1 平面贴在相机前，按 fov/aspect 缩放到刚好覆盖视口
  const vignetteMat = new THREE.MeshBasicMaterial({
    map: tex.vignette,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  vignetteMat.fog = false;
  const vignette = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), vignetteMat);
  vignette.position.set(0, 0, -1);
  vignette.renderOrder = 999;
  vignette.frustumCulled = false;
  vignette.userData.isVignette = true;
  camera.add(vignette);

  const root = new THREE.Group();
  scene.add(root);

  /* 光照：冷色月光 + 星空环境光，与室内暖光形成对比
     （强度按 three r155+ 的物理光照单位标定，同时用 LIGHT_SCALE 兼容旧版） */
  const hemi = new THREE.HemisphereLight(0xb3c1e2, 0x4d4661, 1);
  scene.add(hemi);
  const moonLight = new THREE.DirectionalLight(0xd2dcf2, 1);
  moonLight.position.set(-13, 16, -9);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.set(q.shadowMap, q.shadowMap);
  moonLight.shadow.camera.near = 1;
  moonLight.shadow.camera.far = 60;
  moonLight.shadow.camera.left = -12.5;
  moonLight.shadow.camera.right = 12.5;
  moonLight.shadow.camera.top = 12.5;
  moonLight.shadow.camera.bottom = -12.5;
  moonLight.shadow.bias = -0.0006;
  moonLight.shadow.normalBias = 0.022;
  scene.add(moonLight);
  scene.add(moonLight.target);
  // 前侧补光：让朝向镜头的一面不死黑（不投影，纯提亮）
  const fillLight = new THREE.DirectionalLight(0xa8aed0, 1);
  fillLight.position.set(8, 5, 12);
  fillLight.castShadow = false;
  scene.add(fillLight);
  scene.add(fillLight.target);

  // 根据 three 版本自动换算灯光单位
  const legacy = (renderer as unknown as { useLegacyLights?: boolean }).useLegacyLights === true;
  LIGHT_SCALE.point = legacy ? 1 / (4 * Math.PI) : 1;
  LIGHT_SCALE.dir = legacy ? 1 / Math.PI : 1;
  hemi.intensity = 3.05 * LIGHT_SCALE.dir;
  moonLight.intensity = 3.3 * LIGHT_SCALE.dir;
  fillLight.intensity = 1.3 * LIGHT_SCALE.dir;

  const lights: THREE.Light[] = [];
  /** 给顶层分组命名，便于自检/调试定位 */
  const named = <T extends THREE.Object3D>(o: T, n: string): T => {
    o.name = n;
    return o;
  };

  /* ---- 场景搭建 ---- */
  const base = buildBase(ctx);
  const hill = buildHill(ctx);
  root.add(named(base, 'base'), named(hill, 'hill'));

  root.add(named(buildHouse(ctx, lights), 'house'));
  ctx.blocked.push({ x: (H.x0 + H.x1) / 2, z: (H.z0 + H.z1) / 2, r: 3.4 });

  // 木栅栏（右侧 / 左侧两段 / 前侧短段，避开拱桥与正门）；左侧后段做竹垣
  root.add(
    named(
      buildFence(ctx, [
        { axis: 'z', at: 7.72, a0: -2.35, a1: 6.6, inward: -1 },
        { axis: 'z', at: -7.78, a0: -2.35, a1: 1.25, inward: 1 },
        { axis: 'z', at: -7.78, a0: 2.35, a1: 6.6, inward: 1, style: 'bamboo' },
        { axis: 'x', at: 7.78, a0: 3.25, a1: 7.6, inward: -1 },
        { axis: 'x', at: -7.78, a0: -6.4, a1: -3.2, inward: 1 },
      ]),
      'fence',
    ),
  );

  // 石灯笼（同时登记碰撞盘，避免草丛/碎石长进灯笼里）
  [
    [-2.6, 1.9, 1.0],
    [0.75, 3.3, 0.92],
    [5.3, 1.0, 1.05],
    [1.9, 5.65, 0.85],
    [1.5, 6.85, 0.9],
    [-2.5, 6.85, 0.9],
  ].forEach(([lx, lz, ls], i) => {
    root.add(named(buildStoneLantern(ctx, lx, lz, ls), `lantern${i + 1}`));
    ctx.blocked.push({ x: lx, z: lz, r: 0.42 * ls });
  });

  // 露天温泉 / 溪流 / 石桥 / 石庭 / 参道 / 鸟居 / 贩卖机 / 长椅 / 路灯 / 水洼 / 手水钵
  root.add(named(buildOnsen(ctx, lights), 'onsen'));
  // 温泉区扩建：岸上汤小屋 + 挡景竹垣（位置已核算：距温泉池缘 0.4、距栅栏 0.7）
  root.add(named(buildBathHut(ctx, { cx: 6.2, cz: 1.2, w: 1.6, d: 1.4, wallH: 0.86 }, lights), 'bathHut'));
  root.add(named(buildBambooScreen(ctx, 2.18, 1.25, 2.85), 'onsenScreen'));
  root.add(named(buildStream(ctx), 'stream'));
  root.add(named(buildBridge(ctx), 'bridge'));
  ctx.blocked.push({ x: -4.4, z: 1.8, r: 1.35 });
  root.add(named(buildSansui(ctx), 'sansui'));
  root.add(named(buildPath(ctx), 'path'));
  ctx.blocked.push({ x: PATH.cx, z: 4.3, r: 1.1 });
  ctx.blocked.push({ x: PATH.cx, z: 6.6, r: 1.1 });
  root.add(named(buildTorii(ctx), 'torii'));
  ctx.blocked.push({ x: TORII.cx, z: TORII.cz, r: 1.35 });
  root.add(named(buildVendingMachine(ctx, 2.4, 4.55), 'vending'));
  root.add(named(buildBench(ctx, -2.35, 5.35, Math.PI), 'bench'));
  root.add(named(buildStreetLamp(ctx, 1.15, 5.35, true, lights), 'lamp1'));
  root.add(named(buildStreetLamp(ctx, -2.9, 2.1, false, lights), 'lamp2'));
  root.add(named(buildStreetLamp(ctx, 2.5, 0.9, false, lights), 'lamp3'));
  root.add(named(buildPuddles(ctx), 'puddles'));
  [
    [0.62, 4.3, 0.5],
    [1.0, 2.7, 0.4],
    [-3.0, 1.0, 0.45],
    [-2.75, 0.2, 0.35],
  ].forEach(([px, pz, pr]) => ctx.blocked.push({ x: px, z: pz, r: pr }));
  root.add(named(buildChozu(ctx, -1.75, 2.15), 'chozu'));
  root.add(named(buildShishiOdoshi(ctx, -2.9, -0.35), 'shishiodoshi'));

  /* ---- 植被（位置均已与建筑屋顶/岩石/桥/灯笼做过间距核算） ---- */
  [
    { x: -3.15, z: 0.45, h: 1.5, r: 0.86, mat: mats.leafRed, seed: 3 },
    { x: 2.25, z: -0.55, h: 1.35, r: 0.72, mat: mats.leafRed, seed: 7 },
    { x: 4.85, z: 4.6, h: 1.6, r: 0.8, mat: mats.leafOrange, seed: 11 },
    { x: -1.5, z: -2.95, h: 1.7, r: 0.8, mat: mats.leafOrange, seed: 17 },
    { x: 4.7, z: -2.4, h: 1.8, r: 0.9, mat: mats.leafTeal, seed: 23 },
    { x: 0.4, z: -2.75, h: 1.5, r: 0.55, mat: mats.leafGreen, seed: 29 },
    { x: -6.7, z: -1.1, h: 1.75, r: 0.72, mat: mats.leafRed, seed: 41 },
    { x: 6.5, z: -0.6, h: 1.6, r: 0.66, mat: mats.leafTeal, seed: 43 },
    { x: -6.1, z: 5.8, h: 1.7, r: 0.7, mat: mats.leafOrange, seed: 47 },
    { x: 6.7, z: 5.9, h: 1.55, r: 0.62, mat: mats.leafRed, seed: 53 },
  ].forEach((s, i) => {
    root.add(named(buildTree(ctx, s), `tree${i + 1}`));
    ctx.blocked.push({ x: s.x, z: s.z, r: s.r + 0.3 });
  });

  // 竹林（后山右侧）
  const bambooList: InstanceSpec[] = [];
  {
    let guard = 0;
    while (bambooList.length < 15 && guard++ < 900) {
      const x = rr(rng, 3.3, 7.2);
      const z = rr(rng, -5.5, -4.0);
      if (hitDiscs(x, z, 0.42, ctx.blocked)) continue;
      bambooList.push({
        x,
        z,
        y: groundY(ctx, x, z) - 0.03,
        s: rr(rng, 0.82, 1.22),
        yaw: rng() * 6.28,
        phase: rng() * 6.28,
      });
    }
    ctx.blocked.push({ x: 4.4, z: -4.75, r: 1.9 });
  }
  const bambooGroup = named(new THREE.Group(), 'bamboo');
  root.add(bambooGroup);
  buildInstancedFlora(ctx, bambooGroup, bambooGeometry(), mats.bamboo, bambooList, 0.035, 0.014);

  // 后山松林（排斥采样：树冠半径 + 间距，绝无互相插入）
  const pineGeo = pineGeometry();
  const pineA: InstanceSpec[] = [];
  const pineB: InstanceSpec[] = [];
  {
    let guard = 0;
    const placed: Disc[] = [];
    const wanted = ctx.q.pines;
    while (pineA.length + pineB.length < wanted && guard++ < wanted * 60) {
      const x = rr(rng, -7.4, 7.4);
      const z = rr(rng, -5.85, -3.05);
      const s = rr(rng, 0.62, 1.15);
      const r = 0.46 * s;
      if (hitDiscs(x, z, r, ctx.blocked)) continue;
      if (hitDiscs(x, z, r * 1.02, placed)) continue;
      placed.push({ x, z, r });
      const inst: InstanceSpec = {
        x,
        z,
        y: groundY(ctx, x, z) - 0.03,
        s,
        yaw: rng() * 6.28,
        phase: rng() * 6.28,
      };
      (rng() > 0.45 ? pineA : pineB).push(inst);
    }
  }
  const pineGroup = named(new THREE.Group(), 'pines');
  root.add(pineGroup);
  buildInstancedFlora(ctx, pineGroup, pineGeo, mats.pineDark, pineA, 0.012, 0.015);
  buildInstancedFlora(ctx, pineGroup, pineGeo, mats.pineMid, pineB, 0.012, 0.015);

  root.add(named(buildScatter(ctx), 'scatter'));
  root.add(named(buildNightAtmosphere(ctx), 'nightAtmosphere'));
  root.add(named(buildFallingLeaves(ctx), 'fallingLeaves'));
  scene.add(buildSky(ctx));

  return { scene, camera, anims, root, vignette };
}

const CAM_DIR = new THREE.Vector3(0.53, 0.44, 0.725).normalize();
const CAM_TARGET = new THREE.Vector3(0, 0.85, 0.15);

function fitDistance(aspect: number, fovDeg: number): number {
  const t = Math.tan((fovDeg * Math.PI) / 360);
  return Math.max(7.2 / t, 9.4 / (t * Math.max(0.6, aspect))) * 1.1;
}

export default function OnsenRyokanDiorama({
  className,
  style,
  quality = 'medium',
  bloom = true,
  exposure = 1.0,
  autoRotate = false,
  autoRotateSpeed = 0.45,
  interactive = true,
  vignette: vignetteOn = true,
  onReady,
}: OnsenRyokanDioramaProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    composer: { render: () => void; setSize: (w: number, h: number) => void; dispose: () => void } | null;
    anims: Anim[];
    clock: { start: number; last: number; elapsed: number };
    visible: boolean;
  } | null>(null);
  const propsRef = useRef({ autoRotate, autoRotateSpeed, interactive, exposure, vignette: vignetteOn });
  propsRef.current = { autoRotate, autoRotateSpeed, interactive, exposure, vignette: vignetteOn };
  // 用 ref 持有回调，避免其身份变化导致整个场景被重建
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    const anyR = renderer as unknown as Record<string, unknown>;
    if (anyR.outputColorSpace !== undefined && (THREE as unknown as { SRGBColorSpace?: string }).SRGBColorSpace) {
      anyR.outputColorSpace = (THREE as unknown as { SRGBColorSpace: string }).SRGBColorSpace;
    }
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = exposure * 1.06;
    renderer.shadowMap.enabled = true;
    // r18x 起移除了 PCFSoftShadowMap，按版本选择以免产生告警
    renderer.shadowMap.type = parseInt(THREE.REVISION, 10) >= 180 ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, QUALITY[quality].pixelRatio));
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    host.appendChild(renderer.domElement);

    if (THREE.ColorManagement) THREE.ColorManagement.enabled = true;

    const { scene, camera, anims, vignette } = buildDiorama(renderer, quality);
    // 相机要挂进场景图，它下面的暗角片才会被渲染
    scene.add(camera);

    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    const aspect = width / height;
    camera.aspect = aspect;
    const dist = fitDistance(aspect, camera.fov);
    camera.position.copy(CAM_TARGET).addScaledVector(CAM_DIR, dist);
    camera.lookAt(CAM_TARGET);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    /** 暗角片按 fov/aspect 铺满视口 */
    const fitVignette = () => {
      const hh = 2 * Math.tan((camera.fov * Math.PI) / 360);
      vignette.scale.set(hh * camera.aspect * 1.02, hh * 1.02, 1);
    };
    fitVignette();

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(CAM_TARGET);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.rotateSpeed = 0.85;
    controls.zoomSpeed = 0.9;
    controls.panSpeed = 0.6;
    controls.minDistance = 5.5;
    controls.maxDistance = 42;
    controls.minPolarAngle = 0.22;
    controls.maxPolarAngle = 1.46;
    controls.enablePan = true;
    controls.screenSpacePanning = false;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = autoRotateSpeed;
    controls.update();

    const state = {
      renderer,
      scene,
      camera,
      controls,
      composer: null as null | { render: () => void; setSize: (w: number, h: number) => void; dispose: () => void },
      anims,
      clock: { start: performance.now(), last: performance.now(), elapsed: 0 },
      visible: true,
    };
    stateRef.current = state;

    const reset = () => {
      const a = Math.max(1, host.clientWidth) / Math.max(1, host.clientHeight);
      camera.aspect = a;
      camera.updateProjectionMatrix();
      camera.position.copy(CAM_TARGET).addScaledVector(CAM_DIR, fitDistance(a, camera.fov));
      controls.target.copy(CAM_TARGET);
      controls.update();
    };

    /* ---- 后期辉光（可选，失败自动降级为直接渲染） ---- */
    let cancelled = false;
    const setupBloom = async () => {
      if (!bloom) return;
      try {
        // @ts-ignore three 的 examples 类型随版本变化，这里做宽松处理
        const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, outputMod] = await Promise.all([
          import('three/examples/jsm/postprocessing/EffectComposer.js'),
          import('three/examples/jsm/postprocessing/RenderPass.js'),
          import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
          import('three/examples/jsm/postprocessing/OutputPass.js').catch(() => null),
        ]);
        if (cancelled || !stateRef.current) return;
        const composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        composer.addPass(new UnrealBloomPass(new THREE.Vector2(width, height), 0.62, 0.62, 0.72));
        if (outputMod && (outputMod as { OutputPass?: unknown }).OutputPass) {
          composer.addPass(new (outputMod as { OutputPass: new () => never }).OutputPass());
        }
        composer.setSize(width, height);
        state.composer = composer as unknown as typeof state.composer;
      } catch {
        state.composer = null; // 环境不支持时退回普通渲染
      }
    };
    void setupBloom();

    /* ---- 视口尺寸 ---- */
    const ro = new ResizeObserver(() => {
      const w = Math.max(1, host.clientWidth);
      const h = Math.max(1, host.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      state.composer?.setSize(w, h);
      vignette.visible = propsRef.current.vignette;
      fitVignette();
    });
    ro.observe(host);

    /* ---- 离屏暂停 ---- */
    const io = new IntersectionObserver(
      (entries) => {
        state.visible = entries.some((e) => e.isIntersecting);
      },
      { threshold: 0.01 },
    );
    io.observe(host);

    /* ---- 主循环 ---- */
    const _t = new THREE.Vector3();
    renderer.setAnimationLoop(() => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - state.clock.last) / 1000);
      state.clock.last = now;
      const t = (now - state.clock.start) / 1000;
      if (!state.visible) return;
      for (let i = 0; i < state.anims.length; i++) state.anims[i](t, dt);
      controls.autoRotate = propsRef.current.autoRotate;
      controls.autoRotateSpeed = propsRef.current.autoRotateSpeed;
      controls.enabled = propsRef.current.interactive;
      controls.update();
      // 限制平移范围，避免把模型推出画面
      _t.copy(controls.target);
      _t.x = clamp(_t.x, -4.5, 4.5);
      _t.y = clamp(_t.y, -0.5, 4.5);
      _t.z = clamp(_t.z, -4.5, 4.5);
      controls.target.copy(_t);
      renderer.toneMappingExposure = propsRef.current.exposure;
      if (state.composer) state.composer.render();
      else renderer.render(scene, camera);
    });

    onReadyRef.current?.({ scene, camera, renderer, controls, reset });

    /* ---- 清理 ---- */
    return () => {
      cancelled = true;
      renderer.setAnimationLoop(null);
      ro.disconnect();
      io.disconnect();
      controls.dispose();
      state.composer?.dispose();

      const seenTex = new Set<THREE.Texture>();
      const disposeMat = (m: THREE.Material) => {
        const anyM = m as unknown as Record<string, unknown>;
        ['map', 'gradientMap', 'alphaMap', 'emissiveMap', 'normalMap', 'roughnessMap'].forEach((k) => {
          const tx = anyM[k] as THREE.Texture | undefined;
          if (tx && tx.dispose && !seenTex.has(tx)) {
            seenTex.add(tx);
            tx.dispose();
          }
        });
        m.dispose();
      };
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach(disposeMat);
        else if (mat) disposeMat(mat);
      });
      renderer.dispose();
      renderer.forceContextLoss();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
      stateRef.current = null;
    };
  }, [quality, bloom]);

  return <div ref={hostRef} className={className} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', ...style }} />;
}

export { OnsenRyokanDiorama };



