"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { RGBShiftShader } from "three/addons/shaders/RGBShiftShader.js";
import { VignetteShader } from "three/addons/shaders/VignetteShader.js";
import { Breadcrumb } from "@/components/breadcrumb";

type 镜头模式 = "静止" | "轻柔漂移" | "电影推进" | "呼吸镜头" | "手持微动";
type 粒子类型 = "关闭" | "尘埃" | "樱花" | "萤火虫" | "雪花" | "雨丝";
type 预设名称 = "暮光" | "春日" | "夜色" | "雨夜" | "胶片";

const MAX_UPLOAD_MB = 30;

type 设置 = {
  镜头X: number;
  镜头Y: number;
  缩放: number;
  旋转: number;
  竖图适配: "完整显示" | "铺满画布";
  竖图构图位置: number;
  镜头模式: 镜头模式;
  镜头幅度: number;
  镜头速度: number;
  鼠标视差: number;

  泛光: number;
  泛光半径: number;
  泛光阈值: number;
  色散: number;
  暗角: number;
  曝光: number;
  饱和度: number;
  色温: number;
  对比度: number;
  胶片颗粒: number;
  柔光: number;
  清晰度: number;

  粒子类型: 粒子类型;
  粒子数量: number;
  粒子速度: number;
  粒子大小: number;
  粒子透明度: number;

  背景模糊: number;
};

const 默认设置: 设置 = {
  镜头X: 0.5,
  镜头Y: 0.5,
  缩放: 0.52,
  旋转: 0,
  竖图适配: "完整显示",
  竖图构图位置: 0.0,
  镜头模式: "轻柔漂移",
  镜头幅度: 0.22,
  镜头速度: 0.55,
  鼠标视差: 0.12,

  泛光: 0.10,
  泛光半径: 0.38,
  泛光阈值: 0.62,
  色散: 0.0002,
  暗角: 0.62,
  曝光: 1.0,
  饱和度: 1.0,
  色温: 0.03,
  对比度: 1.01,
  胶片颗粒: 0.008,
  柔光: 0.06,
  清晰度: 0.12,

  粒子类型: "尘埃",
  粒子数量: 0.42,
  粒子速度: 0.32,
  粒子大小: 0.58,
  粒子透明度: 0.58,

  背景模糊: 0,
};

const 预设: Record<预设名称, Partial<设置>> = {
  暮光: {
    镜头模式: "轻柔漂移",
    镜头幅度: 0.30,
    镜头速度: 0.58,
    泛光: 0.10,
    泛光半径: 0.38,
    泛光阈值: 0.68,
    色散: 0.0008,
    暗角: 1.08,
    曝光: 0.94,
    饱和度: 1.06,
    色温: 0.18,
    对比度: 1.03,
    胶片颗粒: 0.018,
    柔光: 0.10,
    清晰度: 0.08,
    粒子类型: "尘埃",
    粒子数量: 0.48,
    粒子速度: 0.42,
    粒子大小: 0.55,
    粒子透明度: 0.42,
  },
  春日: {
    镜头模式: "呼吸镜头",
    镜头幅度: 0.25,
    镜头速度: 0.62,
    泛光: 0.12,
    泛光半径: 0.42,
    泛光阈值: 0.62,
    色散: 0.0004,
    暗角: 0.76,
    曝光: 0.98,
    饱和度: 1.08,
    色温: 0.11,
    对比度: 0.98,
    胶片颗粒: 0.01,
    柔光: 0.11,
    清晰度: 0.06,
    粒子类型: "樱花",
    粒子数量: 0.72,
    粒子速度: 0.45,
    粒子大小: 0.72,
    粒子透明度: 0.72,
  },
  夜色: {
    镜头模式: "电影推进",
    镜头幅度: 0.20,
    镜头速度: 0.38,
    泛光: 0.11,
    泛光半径: 0.40,
    泛光阈值: 0.66,
    色散: 0.00035,
    暗角: 0.92,
    曝光: 0.86,
    饱和度: 0.92,
    色温: -0.10,
    对比度: 1.06,
    胶片颗粒: 0.018,
    柔光: 0.02,
    清晰度: 0.16,
    粒子类型: "萤火虫",
    粒子数量: 0.40,
    粒子速度: 0.25,
    粒子大小: 0.72,
    粒子透明度: 0.66,
  },
  雨夜: {
    镜头模式: "手持微动",
    镜头幅度: 0.22,
    镜头速度: 0.72,
    泛光: 0.10,
    泛光半径: 0.38,
    泛光阈值: 0.68,
    色散: 0.00045,
    暗角: 0.98,
    曝光: 0.86,
    饱和度: 0.90,
    色温: -0.11,
    对比度: 1.07,
    胶片颗粒: 0.025,
    柔光: 0.02,
    清晰度: 0.14,
    粒子类型: "雨丝",
    粒子数量: 0.82,
    粒子速度: 0.95,
    粒子大小: 0.58,
    粒子透明度: 0.58,
  },
  胶片: {
    镜头模式: "手持微动",
    镜头幅度: 0.18,
    镜头速度: 0.64,
    泛光: 0.09,
    泛光半径: 0.36,
    泛光阈值: 0.60,
    色散: 0.0009,
    暗角: 1.28,
    曝光: 0.95,
    饱和度: 0.88,
    色温: 0.15,
    对比度: 1.1,
    胶片颗粒: 0.075,
    柔光: 0.06,
    清晰度: 0.10,
    粒子类型: "尘埃",
    粒子数量: 0.24,
    粒子速度: 0.24,
    粒子大小: 0.42,
    粒子透明度: 0.3,
  },
};

const 调色着色器 = {
  uniforms: {
    tDiffuse: { value: null },
    exposure: { value: 1 },
    saturation: { value: 1 },
    warmth: { value: 0 },
    contrast: { value: 1 },
    grain: { value: 0 },
    softness: { value: 0 },
    blurMix: { value: 0 },
    sharpness: { value: 0 },
    resolution: { value: new THREE.Vector2(1440, 900) },
    time: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float exposure;
    uniform float saturation;
    uniform float warmth;
    uniform float contrast;
    uniform float grain;
    uniform float softness;
    uniform float blurMix;
    uniform float sharpness;
    uniform vec2 resolution;
    uniform float time;
    varying vec2 vUv;

    float rand(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898,78.233)) + time * 0.75) * 43758.5453);
    }

    void main() {
      vec2 texel = 1.0 / max(resolution, vec2(1.0));
      vec4 c = texture2D(tDiffuse, vUv);

      if (blurMix > 0.001) {
        vec3 b = vec3(0.0);
        b += texture2D(tDiffuse, vUv + texel * vec2(-2.0, 0.0)).rgb;
        b += texture2D(tDiffuse, vUv + texel * vec2( 2.0, 0.0)).rgb;
        b += texture2D(tDiffuse, vUv + texel * vec2( 0.0,-2.0)).rgb;
        b += texture2D(tDiffuse, vUv + texel * vec2( 0.0, 2.0)).rgb;
        b += texture2D(tDiffuse, vUv).rgb * 4.0;
        b /= 8.0;
        c.rgb = mix(c.rgb, b, clamp(blurMix, 0.0, 1.0));
      }

      if (sharpness > 0.001) {
        vec3 n =
          texture2D(tDiffuse, vUv + texel * vec2(-1.0, 0.0)).rgb +
          texture2D(tDiffuse, vUv + texel * vec2( 1.0, 0.0)).rgb +
          texture2D(tDiffuse, vUv + texel * vec2( 0.0,-1.0)).rgb +
          texture2D(tDiffuse, vUv + texel * vec2( 0.0, 1.0)).rgb;

        vec3 sharpened = c.rgb * (1.0 + 4.0 * sharpness) - n * sharpness;
        c.rgb = mix(c.rgb, sharpened, clamp(sharpness, 0.0, 1.0));
      }

      c.rgb *= exposure;

      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      c.rgb = mix(vec3(l), c.rgb, saturation);

      c.r += warmth * 0.10;
      c.g += warmth * 0.026;
      c.b -= warmth * 0.10;

      c.rgb = (c.rgb - 0.5) * contrast + 0.5;

      // 柔光：提亮暗部，同时保留高光
      vec3 screenBlend = 1.0 - (1.0 - c.rgb) * (1.0 - c.rgb);
      c.rgb = mix(c.rgb, screenBlend, clamp(softness, 0.0, 1.0) * 0.28);

      float g = (rand(vUv * vec2(1920.0,1080.0)) - 0.5) * grain;
      c.rgb += g;

      gl_FragColor = vec4(c.rgb, c.a);
    }
  `,
};

function 限制(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function 画面比例(
  iw: number,
  ih: number,
  vw: number,
  vh: number,
  mode: "完整显示" | "铺满画布",
) {
  const ia = iw / ih;
  const va = vw / vh;

  if (mode === "完整显示") {
    if (ia > va) return { x: 1, y: va / ia };
    return { x: ia / va, y: 1 };
  }

  if (ia > va) return { x: ia / va, y: 1 };
  return { x: 1, y: va / ia };
}

function 竖图构图偏移(
  isPortrait: boolean,
  fitMode: "完整显示" | "铺满画布",
  position: number,
  imageHalfHeight: number,
  cameraHalfHeight: number,
) {
  if (!isPortrait || fitMode !== "铺满画布") return 0;

  const crop = Math.max(0, imageHalfHeight - cameraHalfHeight);
  if (crop <= 0.0001) return 0;

  // 0 = 顶部、0.5 = 居中、1 = 底部。
  // 顶部对齐时图片中心向下移动，底部对齐时向上移动。
  const p = THREE.MathUtils.clamp(position, 0, 1);
  return THREE.MathUtils.lerp(-crop, crop, p);
}

function 粒子纹理(type: 粒子类型) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 128, 128);

  if (type === "雨丝") {
    const g = ctx.createLinearGradient(82, 6, 46, 122);
    g.addColorStop(0, "rgba(230,245,255,0)");
    g.addColorStop(0.25, "rgba(230,245,255,.95)");
    g.addColorStop(1, "rgba(205,230,255,0)");
    ctx.strokeStyle = g;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(82, 6);
    ctx.lineTo(46, 122);
    ctx.stroke();
  } else if (type === "樱花") {
    ctx.save();
    ctx.translate(64, 64);
    ctx.rotate(-0.42);
    const g = ctx.createRadialGradient(0, -3, 2, 0, 0, 42);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.36, "rgba(255,220,233,.98)");
    g.addColorStop(0.72, "rgba(255,174,205,.68)");
    g.addColorStop(1, "rgba(255,160,195,0)");
    ctx.fillStyle = g;
    ctx.scale(1.18, 0.72);
    ctx.beginPath();
    ctx.ellipse(0, 0, 34, 42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    const center =
      type === "萤火虫"
        ? "rgba(255,244,145,1)"
        : type === "雪花"
          ? "rgba(255,255,255,1)"
          : "rgba(255,246,230,1)";
    const edge =
      type === "萤火虫"
        ? "rgba(255,221,90,0)"
        : "rgba(255,255,255,0)";
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, center);
    g.addColorStop(0.28, center.replace(",1)", ",.74)"));
    g.addColorStop(1, edge);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}


/** 粒子类型到着色器分支的序号（“关闭”走 0 分支，但会被 drawRange 归零，不会绘制） */
const 粒子类型序号: Record<粒子类型, number> = {
  关闭: 0,
  尘埃: 0,
  樱花: 1,
  萤火虫: 2,
  雪花: 3,
  雨丝: 4,
};

const 粒子顶点着色器 = `
  attribute float aSeed;
  attribute float aDepth;
  uniform float uSize;
  uniform float uTime;
  uniform float uSpeed;
  uniform float uType;
  uniform float uView;
  varying float vSeed;
  varying float vDepth;

  void main() {
    vSeed = aSeed;
    vDepth = aDepth;

    // 所有运动都在 GPU 上用「初值 + 时间」的解析式算。
    // 原来是在 JS 里每帧把增量累加到 1000 个粒子上，再把整个 position buffer 传回 GPU，
    // 两个问题：一是每帧 1000 次循环 + 12KB 上传；二是增量按帧给，
    // 所以 144Hz 屏上的雨会比 60Hz 快 2.4 倍。解析式天生与帧率无关。
    //
    // 横向摆动在原实现里是「每帧加一个 sin 值」，那是 sin 的积分，写成解析式是 cos 之差，
    // 这样才不会留下逐帧累积的漂移。系数与原来逐帧增量 × 60 完全对应。
    float t = uTime;
    float sp = uSpeed;
    float extent = uView;
    vec3 p = vec3(position.x * extent, position.y * extent, position.z);

    if (uType > 3.5) {
      // 雨丝：匀速斜落，出界后从另一端绕回
      p.x += 0.168 * sp * t;
      p.y -= 1.26 * sp * t;
      p.x = mod(p.x + extent, 2.0 * extent) - extent;
      p.y = mod(p.y + extent, 2.0 * extent) - extent;
    } else if (uType > 2.5) {
      // 雪花：匀速下落 + 横向摆动
      p.x += 0.036 * (cos(aSeed * 9.0) - cos(t * 0.7 + aSeed * 9.0));
      p.y -= 0.132 * sp * t;
      p.y = mod(p.y + extent, 2.0 * extent) - extent;
    } else if (uType > 1.5) {
      // 萤火虫：两轴各自缓慢游走，本身有界所以不循环
      p.x += 0.0583 * sp * (cos(aSeed * 10.0) - cos(t * 0.72 + aSeed * 10.0));
      p.y += 0.06 * sp * (sin(t * 0.62 + aSeed * 12.0) - sin(aSeed * 12.0));
    } else if (uType > 0.5) {
      // 樱花：斜向飘落 + 打旋
      p.x += 0.126 * sp * t + 0.0287 * (cos(aSeed * 10.0) - cos(t * 1.15 + aSeed * 10.0));
      p.y -= 0.063 * sp * t;
      p.x = mod(p.x + extent, 2.0 * extent) - extent;
      p.y = mod(p.y + extent, 2.0 * extent) - extent;
    } else {
      // 尘埃：缓慢横移 + 轻微浮动
      p.x += 0.03 * sp * t;
      p.y += 0.0133 * (cos(aSeed * 8.0) - cos(t * 0.45 + aSeed * 8.0));
      p.x = mod(p.x + extent, 2.0 * extent) - extent;
    }

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * mix(0.50, 1.38, aDepth) * (0.76 + aSeed * 0.42);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const 粒子片元着色器 = `
  uniform sampler2D uMap;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uTwinkle;
  uniform float uRotate;
  varying float vSeed;
  varying float vDepth;

  mat2 rot(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
  }

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float angle = uRotate * (vSeed * 6.283185 + uTime * (0.20 + vSeed * 0.18));
    uv = rot(angle) * uv + 0.5;

    vec4 tex = texture2D(uMap, uv);
    float twinkle = mix(
      1.0,
      0.55 + 0.45 * sin(uTime * (2.0 + vSeed * 3.0) + vSeed * 20.0),
      uTwinkle
    );

    float depthAlpha = mix(0.42, 1.0, vDepth);
    float alpha = tex.a * uOpacity * depthAlpha * max(0.18, twinkle);
    if (alpha < 0.012) discard;

    gl_FragColor = vec4(tex.rgb * max(0.55, twinkle), alpha);
  }
`;

// 组件名用拉丁字母：中文函数名会被 eslint 的 rules-of-hooks 判为非法组件，
// 这个文件里 25 条 hook 报错全是这一个命名引起的
export default function WeiguangStudio() {
  const 容器 = useRef<HTMLDivElement | null>(null);
  const 文件输入 = useRef<HTMLInputElement | null>(null);
  const 设置引用 = useRef<设置>(默认设置);
  const 运行时 = useRef<any>(null);
  const 录制计时器 = useRef<number | null>(null);
  const 进度计时器 = useRef<number | null>(null);
  const 录制器 = useRef<MediaRecorder | null>(null);
  const 原图预览引用 = useRef(false);

  const [设置值, set设置值] = useState<设置>(默认设置);
  const [已有图片, set已有图片] = useState(false);
  const [暂停, set暂停] = useState(false);
  const [面板打开, set面板打开] = useState(true);
  const [原图预览, set原图预览] = useState(false);
  const [当前预设, set当前预设] = useState<预设名称 | "自然" | "自定义">("自然");
  const [正在录制, set正在录制] = useState(false);
  const [录制总长, set录制总长] = useState(5);
  const [录制已过, set录制已过] = useState(0);
  const [错误, set错误] = useState("");

  useEffect(() => {
    设置引用.current = 设置值;
  }, [设置值]);

  useEffect(() => {
    原图预览引用.current = 原图预览;
  }, [原图预览]);

  useEffect(() => {
    const rt = 运行时.current;
    const mount = 容器.current;
    const img = rt?.imageTexture?.image as HTMLImageElement | undefined;
    if (!rt || !mount || !img) return;

    const cover = 画面比例(
      img.naturalWidth || img.width,
      img.naturalHeight || img.height,
      mount.clientWidth,
      mount.clientHeight,
      设置值.竖图适配,
    );

    rt.imageMesh.scale.set(cover.x, cover.y, 1);
  }, [设置值.竖图适配]);

  useEffect(() => {
    const mount = 容器.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({
      // 后处理链是渲染到 render target 再把一张全屏贴图铺到画布上的，
      // 场景里没有需要抗锯齿的几何边缘，开 antialias 只是白花 GPU。
      antialias: false,
      alpha: false,
      // 不再开 preserveDrawingBuffer：那会让浏览器每帧多留一份画面拷贝。
      // 导出 PNG 改成一帧内渲染完立刻取数据（见 导出图片 / capture 标记）。
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.setClearColor("#101116");
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
    camera.position.z = 2;

    const imageMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      color: 0xffffff,
      toneMapped: false,
    });
    const imageMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      imageMaterial,
    );
    scene.add(imageMesh);

    const count = 1000;
    const particleGeometry = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const depths = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // 归一化到 [-1,1]，由顶点着色器按当前可见区域铺开。
      // 原来直接写死在 ±1.2 的世界坐标里，而默认 zoom 1.72 下可见范围只有 ±0.58，
      // 有一半粒子一直在画外空转，缩放一动密度还会跟着变。
      pos[i * 3] = Math.random() * 2 - 1;
      pos[i * 3 + 1] = Math.random() * 2 - 1;
      pos[i * 3 + 2] = THREE.MathUtils.randFloat(-0.3, 0.3);
      seeds[i] = Math.random();
      depths[i] = Math.random();
    }

    particleGeometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    particleGeometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    particleGeometry.setAttribute("aDepth", new THREE.BufferAttribute(depths, 1));
    const particleTexture = 粒子纹理("尘埃");

    const particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: particleTexture },
        uOpacity: { value: 默认设置.粒子透明度 },
        uSize: { value: 7.5 },
        uTime: { value: 0 },
        uSpeed: { value: 默认设置.粒子速度 },
        uType: { value: 粒子类型序号[默认设置.粒子类型] },
        uView: { value: 1.12 },
        uTwinkle: { value: 0.16 },
        uRotate: { value: 0.0 },
      },
      vertexShader: 粒子顶点着色器,
      fragmentShader: 粒子片元着色器,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    particles.renderOrder = 4;
    scene.add(particles);

    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(mount.clientWidth, mount.clientHeight),
      默认设置.泛光,
      默认设置.泛光半径,
      默认设置.泛光阈值,
    );
    const rgbPass = new ShaderPass(RGBShiftShader);
    const vignettePass = new ShaderPass(VignetteShader);
    const gradePass = new ShaderPass(调色着色器);

    composer.addPass(renderPass);
    composer.addPass(bloomPass);
    composer.addPass(rgbPass);
    composer.addPass(vignettePass);
    composer.addPass(gradePass);

    const rt = {
      renderer,
      scene,
      camera,
      imageMesh,
      imageMaterial,
      imageTexture: null as THREE.Texture | null,
      objectUrl: null as string | null,
      composer,
      bloomPass,
      rgbPass,
      vignettePass,
      gradePass,
      particles,
      particleGeometry,
      particleMaterial,
      particleTexture,
      particleType: "尘埃" as 粒子类型,
      pointerX: 0,
      pointerY: 0,
      targetX: 0,
      targetY: 0,
      paused: false,
      motionTime: 0,
      capture: false,
    };

    运行时.current = rt;

    const onPointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      // 只记目标值，缓动放到动画循环里做：直接跟指针会让镜头一顿一顿的
      rt.targetX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      rt.targetY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };

    renderer.domElement.addEventListener("pointermove", onPointerMove);

    const onVisibilityChange = () => {
      if (document.hidden) {
        clock.stop();
      } else if (!rt.paused) {
        clock.start();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const resize = () => {
      const w = Math.max(1, mount.clientWidth);
      const h = Math.max(1, mount.clientHeight);

      renderer.setSize(w, h);
      composer.setSize(w, h);
      bloomPass.setSize(w, h);
      gradePass.uniforms.resolution.value.set(
        w * renderer.getPixelRatio(),
        h * renderer.getPixelRatio(),
      );

      if (rt.imageTexture?.image) {
        const img = rt.imageTexture.image as HTMLImageElement;
        const current = 设置引用.current;
        const cover = 画面比例(
          img.naturalWidth || img.width,
          img.naturalHeight || img.height,
          w,
          h,
          current.竖图适配,
        );
        imageMesh.scale.set(cover.x, cover.y, 1);
      }
    };

    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    const clock = new THREE.Clock();
    let raf = 0;

    const animate = () => {
      raf = requestAnimationFrame(animate);

      const delta = Math.min(clock.getDelta(), 0.05);
      if (!rt.paused) rt.motionTime += delta;

      const t = rt.motionTime;
      const s = 设置引用.current;
      const preview = 原图预览引用.current;

      // 指针视差缓动，并且做成与帧率无关（0.92^60 ≈ 每秒收敛到 8%）
      const follow = 1 - Math.pow(0.92, Math.max(delta, 0.001) * 60);
      rt.pointerX += (rt.targetX - rt.pointerX) * follow;
      rt.pointerY += (rt.targetY - rt.pointerY) * follow;

      // 后处理参数全部实时写入，确保每个滑杆都有响应。
      bloomPass.strength = preview ? 0 : s.泛光;
      bloomPass.radius = s.泛光半径;
      bloomPass.threshold = s.泛光阈值;

      rgbPass.uniforms.amount.value = preview ? 0 : s.色散;
      rgbPass.uniforms.angle.value = 2.18;

      vignettePass.uniforms.offset.value = 1.02;
      vignettePass.uniforms.darkness.value = preview ? 0 : s.暗角;

      gradePass.uniforms.exposure.value = preview ? 1 : s.曝光;
      gradePass.uniforms.saturation.value = preview ? 1 : s.饱和度;
      gradePass.uniforms.warmth.value = preview ? 0 : s.色温;
      gradePass.uniforms.contrast.value = preview ? 1 : s.对比度;
      gradePass.uniforms.grain.value = preview ? 0 : s.胶片颗粒;
      gradePass.uniforms.softness.value = preview ? 0 : s.柔光;
      gradePass.uniforms.blurMix.value = preview ? 0 : s.背景模糊;
      gradePass.uniforms.sharpness.value = preview ? 0 : s.清晰度;
      gradePass.uniforms.time.value = t;

      if (rt.particleType !== s.粒子类型) {
        rt.particleType = s.粒子类型;
        rt.particleTexture.dispose();
        rt.particleTexture = 粒子纹理(s.粒子类型);
        particleMaterial.uniforms.uMap.value = rt.particleTexture;
        particleMaterial.blending =
          s.粒子类型 === "萤火虫" || s.粒子类型 === "尘埃"
            ? THREE.AdditiveBlending
            : THREE.NormalBlending;
        particleMaterial.needsUpdate = true;
      }

      let dx = 0;
      let dy = 0;
      let dz = 0;
      let dr = 0;
      const amp = s.镜头幅度;
      const speed = s.镜头速度;

      if (!preview) {
        if (s.镜头模式 === "轻柔漂移") {
          dx = Math.sin(t * 0.19 * speed) * 0.025 * amp;
          dy = Math.sin(t * 0.15 * speed + 0.8) * 0.016 * amp;
          dz = Math.sin(t * 0.10 * speed + 1.2) * 0.02 * amp;
          dr = Math.sin(t * 0.12 * speed) * 0.003 * amp;
        } else if (s.镜头模式 === "电影推进") {
          dz = Math.sin(t * 0.08 * speed) * 0.06 * amp;
          dx = Math.sin(t * 0.11 * speed) * 0.014 * amp;
        } else if (s.镜头模式 === "呼吸镜头") {
          dz = Math.sin(t * 0.42 * speed) * 0.035 * amp;
          dy = Math.sin(t * 0.21 * speed) * 0.012 * amp;
        } else if (s.镜头模式 === "手持微动") {
          dx = (Math.sin(t * 1.9) + Math.sin(t * 2.7) * 0.45) * 0.004 * amp;
          dy = (Math.sin(t * 1.4 + 1.2) + Math.sin(t * 2.1) * 0.35) * 0.004 * amp;
          dr = Math.sin(t * 1.2) * 0.0018 * amp;
        }

        dx += rt.pointerX * s.鼠标视差 * 0.035;
        dy -= rt.pointerY * s.鼠标视差 * 0.024;
      }

      const imgObj = rt.imageTexture?.image as HTMLImageElement | undefined;

      if (preview && imgObj) {
        // “对比原图”必须完全绕过用户设置：
        // 1. 整图居中完整显示
        // 2. 不使用缩放 / 平移 / 旋转 / 构图锚点
        // 3. 不使用镜头运动和鼠标视差
        camera.zoom = 1;
        camera.updateProjectionMatrix();

        const originalFit = 画面比例(
          imgObj.naturalWidth || imgObj.width,
          imgObj.naturalHeight || imgObj.height,
          mount.clientWidth,
          mount.clientHeight,
          "完整显示",
        );

        imageMesh.scale.set(originalFit.x, originalFit.y, 1);
        imageMesh.position.set(0, 0, 0);
        imageMesh.rotation.z = 0;
      } else {
        // 正常效果模式：使用用户选择的适配、构图和镜头参数。
        if (imgObj) {
          const fitted = 画面比例(
            imgObj.naturalWidth || imgObj.width,
            imgObj.naturalHeight || imgObj.height,
            mount.clientWidth,
            mount.clientHeight,
            s.竖图适配,
          );
          imageMesh.scale.set(fitted.x, fitted.y, 1);
        }

        const z = 限制(s.缩放 + dz, 0, 1);
        camera.zoom = THREE.MathUtils.lerp(1.72, 0.96, z);
        camera.updateProjectionMatrix();

        imageMesh.position.x =
          THREE.MathUtils.lerp(0.17, -0.17, s.镜头X) + dx;

        const isPortrait = imgObj
          ? (imgObj.naturalHeight || imgObj.height) >
            (imgObj.naturalWidth || imgObj.width)
          : false;

        const portraitOffset = 竖图构图偏移(
          isPortrait,
          s.竖图适配,
          s.竖图构图位置,
          imageMesh.scale.y,
          1 / camera.zoom,
        );

        const manualY =
          s.竖图适配 === "铺满画布" && isPortrait
            ? THREE.MathUtils.lerp(-0.045, 0.045, s.镜头Y)
            : THREE.MathUtils.lerp(-0.13, 0.13, s.镜头Y);

        imageMesh.position.y = manualY + dy + portraitOffset;
        imageMesh.rotation.z = THREE.MathUtils.degToRad(s.旋转) + dr;
      }

      const visibleCount = Math.floor(count * s.粒子数量);
      particleGeometry.setDrawRange(
        0,
        preview || s.粒子类型 === "关闭" ? 0 : visibleCount,
      );

      const particleSize =
        s.粒子类型 === "雨丝"
          ? 24 + s.粒子大小 * 30
          : s.粒子类型 === "樱花"
            ? 12 + s.粒子大小 * 18
            : s.粒子类型 === "萤火虫"
              ? 8 + s.粒子大小 * 14
              : s.粒子类型 === "雪花"
                ? 5 + s.粒子大小 * 11
                : 3.5 + s.粒子大小 * 9;

      particleMaterial.uniforms.uOpacity.value = s.粒子透明度;
      particleMaterial.uniforms.uSize.value = particleSize;
      particleMaterial.uniforms.uTime.value = t;
      // 运动参数也从这里喂：类型、速度、可见半高（粒子按可见范围铺开）
      particleMaterial.uniforms.uSpeed.value = s.粒子速度;
      particleMaterial.uniforms.uType.value = 粒子类型序号[s.粒子类型];
      particleMaterial.uniforms.uView.value = (1 / camera.zoom) * 1.12;
      particleMaterial.uniforms.uTwinkle.value =
        s.粒子类型 === "萤火虫" ? 1.0 : s.粒子类型 === "尘埃" ? 0.22 : 0.0;
      particleMaterial.uniforms.uRotate.value =
        s.粒子类型 === "樱花" ? 1.0 : s.粒子类型 === "雪花" ? 0.35 : 0.0;


      if (preview) {
        // 真正的原图比较：直接渲染场景，不经过 Bloom / RGB Shift /
        // Vignette / 调色 / 柔光 / 清晰度 / 颗粒 / 背景柔化。
        renderer.render(scene, camera);
      } else {
        composer.render();
      }

      // 导出必须紧跟在渲染之后：没有 preserveDrawingBuffer 时，
      // 一旦让出这一帧，画布内容就可能被换走，toDataURL 只会拿到空白
      if (rt.capture) {
        rt.capture = false;
        const a = document.createElement("a");
        a.download = `微光-${Date.now()}.png`;
        a.href = renderer.domElement.toDataURL("image/png");
        a.click();
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibilityChange);

      if (rt.objectUrl) URL.revokeObjectURL(rt.objectUrl);
      rt.imageTexture?.dispose();
      rt.particleTexture.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      imageMesh.geometry.dispose();
      imageMaterial.dispose();
      composer.dispose();
      renderer.dispose();

      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      }

      运行时.current = null;
    };
  }, []);

  async function 加载图片(file: File) {
    const rt = 运行时.current;
    if (!rt) return;

    try {
      set错误("");
      if (!file.type.startsWith("image/")) {
        throw new Error("请选择 JPG、PNG、WebP、GIF 等图片文件。");
      }
      if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
        throw new Error(`图片不能超过 ${MAX_UPLOAD_MB}MB。`);
      }

      if (rt.objectUrl) URL.revokeObjectURL(rt.objectUrl);
      const url = URL.createObjectURL(file);
      rt.objectUrl = url;

      const texture = await new THREE.TextureLoader().loadAsync(url);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;

      rt.imageTexture?.dispose();
      rt.imageTexture = texture;
      rt.imageMaterial.map = texture;
      rt.imageMaterial.needsUpdate = true;

      const img = texture.image as HTMLImageElement;
      const mount = 容器.current!;
      const current = 设置引用.current;
      const cover = 画面比例(
        img.naturalWidth || img.width,
        img.naturalHeight || img.height,
        mount.clientWidth,
        mount.clientHeight,
        current.竖图适配,
      );

      rt.imageMesh.scale.set(cover.x, cover.y, 1);

      rt.imageMaterial.opacity = 0;
      const start = performance.now();

      const fadeIn = (now: number) => {
        const p = Math.min(1, (now - start) / 650);
        rt.imageMaterial.opacity = 1 - Math.pow(1 - p, 3);
        if (p < 1) requestAnimationFrame(fadeIn);
      };

      requestAnimationFrame(fadeIn);

      set已有图片(true);
      // 系统开了「减少动态效果」就以暂停状态载入，用户按播放才开始动
      const 减少动态 = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      rt.paused = 减少动态;
      set暂停(减少动态);
    } catch (e) {
      set错误(e instanceof Error ? e.message : String(e));
    }
  }

  function 修改<K extends keyof 设置>(key: K, value: 设置[K]) {
    set当前预设("自定义");
    set设置值((prev) => ({ ...prev, [key]: value }));
  }

  function 应用预设(name: 预设名称) {
    set当前预设(name);
    set设置值((prev) => ({ ...prev, ...预设[name] }));
  }

  function 恢复自然() {
    set当前预设("自然");
    set设置值(默认设置);
  }

  function 切换暂停() {
    const rt = 运行时.current;
    if (!rt) return;
    rt.paused = !rt.paused;
    set暂停(rt.paused);
  }

  function 收尾() {
    if (录制计时器.current) {
      window.clearTimeout(录制计时器.current);
      录制计时器.current = null;
    }
    if (进度计时器.current) {
      window.clearInterval(进度计时器.current);
      进度计时器.current = null;
    }
    录制器.current = null;
    set正在录制(false);
    set录制已过(0);
  }

  function 停止录制() {
    const recorder = 录制器.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    else 收尾();
  }

  function 导出图片() {
    const rt = 运行时.current;
    if (!rt) return;
    // 交给动画循环：下一帧渲染完立刻取数据。这里自己渲染再取是拿不到的，
    // 因为画面已经被换走（preserveDrawingBuffer 关掉之后就是这样）。
    rt.capture = true;
  }

  async function 全屏() {
    const el = 容器.current?.parentElement;
    if (!el) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await el.requestFullscreen();
  }

  function 开始录制(seconds: number) {
    const rt = 运行时.current;
    if (!rt || 正在录制) return;

    try {
      const stream = rt.renderer.domElement.captureStream(60);
      const type =
        MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm";
      const recorder = new MediaRecorder(stream, {
        mimeType: type,
        videoBitsPerSecond: 12_000_000,
      });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };

      recorder.onerror = () => {
        set错误("录制失败，请尝试使用最新版 Chrome / Edge。");
        收尾();
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.download = `微光-${Math.round(录制已过)}s-${Date.now()}.webm`;
        a.href = url;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        收尾();
      };

      录制器.current = recorder;
      recorder.start();
      set正在录制(true);
      set录制总长(seconds);
      set录制已过(0);

      // 录像是固定时长的，但之前界面上完全看不出进度，很容易以为卡住了
      const 起点 = performance.now();
      if (进度计时器.current) window.clearInterval(进度计时器.current);
      进度计时器.current = window.setInterval(() => {
        set录制已过(Math.min(seconds, (performance.now() - 起点) / 1000));
      }, 100);

      录制计时器.current = window.setTimeout(() => {
        if (recorder.state !== "inactive") recorder.stop();
      }, seconds * 1000);
    } catch (e) {
      set错误(e instanceof Error ? e.message : String(e));
      set正在录制(false);
    }
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (e.code === "Space" && 已有图片) {
        e.preventDefault();
        切换暂停();
      } else if (e.key.toLowerCase() === "o" && 已有图片) {
        set原图预览((v) => !v);
      } else if (e.key.toLowerCase() === "h" && 已有图片) {
        set面板打开((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [已有图片]);

  useEffect(() => () => {
    if (录制计时器.current) window.clearTimeout(录制计时器.current);
    if (进度计时器.current) window.clearInterval(进度计时器.current);
  }, []);

  const rangeCss = useMemo(
    () => `
      .bl-range {
        --fill: 50%;
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 18px;
        background: transparent;
        cursor: pointer;
      }
      .bl-range::-webkit-slider-runnable-track {
        height: 6px;
        border-radius: 999px;
        background:
          linear-gradient(
            90deg,
            rgba(255,190,205,.96) 0%,
            rgba(255,211,168,.96) var(--fill),
            rgba(255,255,255,.10) var(--fill),
            rgba(255,255,255,.10) 100%
          );
        box-shadow:
          inset 0 0 0 1px rgba(255,255,255,.05),
          0 2px 10px rgba(255,180,190,.08);
      }
      .bl-range::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        margin-top: -5px;
        border-radius: 50%;
        border: 2px solid rgba(255,255,255,.92);
        background: linear-gradient(145deg,#fff7f7,#ffd7cb);
        box-shadow:
          0 2px 10px rgba(0,0,0,.28),
          0 0 0 4px rgba(255,211,196,.09);
      }
      .bl-range:focus-visible::-webkit-slider-thumb {
        box-shadow:
          0 0 0 5px rgba(255,204,196,.18),
          0 2px 10px rgba(0,0,0,.28);
      }
      .bl-range::-moz-range-track {
        height: 6px;
        border-radius: 999px;
        background: rgba(255,255,255,.10);
      }
      .bl-range::-moz-range-progress {
        height: 6px;
        border-radius: 999px;
        background: linear-gradient(90deg,#ffbecd,#ffd3a8);
      }
      .bl-range::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 2px solid rgba(255,255,255,.92);
        background: #ffe2d7;
      }
      .bl-scroll::-webkit-scrollbar { width: 6px; }
      .bl-scroll::-webkit-scrollbar-track { background: transparent; }
      .bl-scroll::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,.13);
        border-radius: 999px;
      }
      .bl-preset-scroll::-webkit-scrollbar, .bl-toolbar::-webkit-scrollbar { display:none; }
      .bl-preset-scroll, .bl-toolbar { scrollbar-width:none; }

      .bl-floating-breadcrumb {
        position:absolute;
        top:14px;
        left:16px;
        z-index:32;
        width:max-content;
        max-width:calc(100% - 380px);
        filter:drop-shadow(0 10px 26px rgba(0,0,0,.16));
      }

      .bl-floating-breadcrumb > * {
        margin:0 !important;
      }

      /* 不覆盖 Breadcrumb 自己的背景 / 圆角 / 边框。
         这里只负责悬浮定位，这样和 BitLeap 其它工具页保持同一套组件视觉。 */
      .bl-floating-breadcrumb::before {
        content:"";
        position:absolute;
        inset:-5px -7px;
        z-index:-1;
        border-radius:999px;
        background:rgba(255,255,255,.035);
        box-shadow:0 10px 32px rgba(0,0,0,.08);
        backdrop-filter:blur(10px);
        -webkit-backdrop-filter:blur(10px);
        pointer-events:none;
      }
      .bl-ui-button { transition: background .16s ease, transform .16s ease, border-color .16s ease; }
      .bl-ui-button:hover { background:rgba(255,255,255,.13) !important; }
      .bl-ui-button:active { transform:scale(.97); }
      @media (max-width: 760px) {
        .bl-studio-stage {
          height: calc(100dvh - var(--site-header-height, 60px)) !important;
          min-height: 520px !important;
        }
        .bl-floating-breadcrumb {
          top:8px !important;
          left:8px !important;
          right:auto !important;
          width:max-content !important;
          max-width:calc(100% - 16px) !important;
        }
        .bl-preset-dock {
          left:8px !important;
          right:8px !important;
          top:54px !important;
          max-width:none !important;
        }
        .bl-parameter-panel {
          left:8px !important;
          right:8px !important;
          top:104px !important;
          width:auto !important;
          max-height:calc(100% - 170px) !important;
        }
        .bl-toolbar {
          bottom:8px !important;
          max-width:calc(100vw - 16px) !important;
        }
        .bl-toolbar button {
          padding:8px 10px !important;
          font-size:11px !important;
        }
      }
      @media (max-height: 720px) {
        .bl-studio-stage { min-height: 480px !important; }
        .bl-parameter-panel { max-height:calc(100% - 126px) !important; }
      }
      @media (prefers-reduced-motion: reduce) {
        .bl-ui-button { transition:none !important; }
      }
    `,
    [],
  );

  return (
    <div className="relative w-full overflow-hidden bg-[#101116]">
      <main
        className="bl-studio-stage"
        style={{
          position: "relative",
          width: "100%",
          height: "calc(100dvh - var(--site-header-height, 60px))",
          minHeight: 560,
          overflow: "hidden",
          background: "#101116",
          color: "#fff",
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file?.type.startsWith("image/")) void 加载图片(file);
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: "0 0 auto 0",
            zIndex: 8,
            height: 112,
            pointerEvents: "none",
            background:
              "linear-gradient(180deg,rgba(7,7,11,.42),rgba(7,7,11,.12) 48%,transparent)",
          }}
        />

        <div className="bl-floating-breadcrumb">
          <Breadcrumb />
        </div>
      <style>{rangeCss}</style>

      <div ref={容器} style={{ position: "absolute", inset: 0 }} />

      <input
        ref={文件输入}
        hidden
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void 加载图片(file);
          e.currentTarget.value = "";
        }}
      />

      {!已有图片 && (
        <button
          type="button"
          onClick={() => 文件输入.current?.click()}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            border: 0,
            cursor: "pointer",
            color: "#fff",
            background:
              "radial-gradient(circle at 50% 34%,rgba(255,210,220,.15),transparent 32%),radial-gradient(circle at 36% 65%,rgba(255,222,176,.07),transparent 28%),linear-gradient(180deg,#17151c,#101116)",
          }}
        >
          <div style={{ textAlign: "center", padding: 28 }}>
            <div
              style={{
                marginBottom: 12,
                fontSize: 11,
                opacity: 0.5,
                letterSpacing: ".24em",
              }}
            >
              微光 · 动态背景工作室
            </div>
            <div
              style={{
                fontWeight: 300,
                fontSize: "clamp(30px,4vw,50px)",
                letterSpacing: "-.045em",
              }}
            >
              让一张图片慢慢活起来
            </div>
            <div style={{ marginTop: 14, opacity: 0.46, fontSize: 13 }}>
              点击上传 · 或直接把图片拖进来
            </div>
          </div>
        </button>
      )}

      {已有图片 && (
        <>
          <div className="bl-preset-dock" style={presetDock}>
            <div style={presetTitle}>
              <span style={presetGlowDot} />
              氛围
            </div>
            <div className="bl-preset-scroll" style={presetSegments}>
              <button
                className="bl-ui-button"
                onClick={恢复自然}
                style={{
                  ...presetChip,
                  ...(当前预设 === "自然" ? presetChipActive : {}),
                }}
              >
                自然
              </button>
              {(Object.keys(预设) as 预设名称[]).map((name) => (
                <button
                  className="bl-ui-button"
                  key={name}
                  onClick={() => 应用预设(name)}
                  style={{
                    ...presetChip,
                    ...(当前预设 === name ? presetChipActive : {}),
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {面板打开 && (
            <aside className="bl-scroll bl-parameter-panel" style={panelStyle}>
              <div style={panelHeader}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 650 }}>微光参数</div>
                  <div style={{ marginTop: 3, fontSize: 10, opacity: 0.38 }}>
                    所有参数实时生效
                  </div>
                </div>
                <button
                  type="button"
                  style={smallGhost}
                  onClick={恢复自然}
                >
                  恢复默认
                </button>
              </div>

              <参数组 标题="镜头">
                <下拉
                  标签="镜头运动"
                  value={设置值.镜头模式}
                  options={["静止", "轻柔漂移", "电影推进", "呼吸镜头", "手持微动"]}
                  onChange={(v) => 修改("镜头模式", v as 镜头模式)}
                />
                <滑杆 标签="运动幅度" value={设置值.镜头幅度} min={0} max={1} step={0.01} onChange={(v) => 修改("镜头幅度", v)} />
                <滑杆 标签="运动速度" value={设置值.镜头速度} min={0.1} max={2} step={0.01} onChange={(v) => 修改("镜头速度", v)} />
                <滑杆 标签="鼠标视差" value={设置值.鼠标视差} min={0} max={1} step={0.01} onChange={(v) => 修改("鼠标视差", v)} />
                <滑杆 标签="水平位置" value={设置值.镜头X} min={0} max={1} step={0.01} onChange={(v) => 修改("镜头X", v)} />
                <滑杆 标签="垂直位置" value={设置值.镜头Y} min={0} max={1} step={0.01} onChange={(v) => 修改("镜头Y", v)} />
                <滑杆 标签="镜头远近" value={设置值.缩放} min={0} max={1} step={0.01} onChange={(v) => 修改("缩放", v)} />
                <滑杆 标签="画面旋转" value={设置值.旋转} min={-8} max={8} step={0.1} onChange={(v) => 修改("旋转", v)} suffix="°" />

                <下拉
                  标签="竖图适配"
                  value={设置值.竖图适配}
                  options={["完整显示", "铺满画布"]}
                  onChange={(v) => 修改("竖图适配", v as 设置["竖图适配"])}
                />

                <滑杆
                  标签="竖图构图位置"
                  value={设置值.竖图构图位置}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(v) => 修改("竖图构图位置", v)}
                  formatter={(v) =>
                    v <= 0.04
                      ? "顶部"
                      : v >= 0.96
                        ? "底部"
                        : Math.abs(v - 0.5) <= 0.04
                          ? "居中"
                          : `${Math.round(v * 100)}%`
                  }
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    margin: "-6px 1px 10px",
                    fontSize: 9,
                    color: "rgba(255,255,255,.24)",
                  }}
                >
                  <span>顶部</span>
                  <span>居中</span>
                  <span>底部</span>
                </div>
                <div style={{ margin: "-2px 0 9px", fontSize: 10, lineHeight: 1.5, color: "rgba(255,255,255,.30)" }}>
                  “完整显示”保留整张竖图；“铺满画布”时可连续调整裁切位置，不再局限于三个固定位置。
                </div>
              </参数组>

              <参数组 标题="氛围粒子">
                <下拉
                  标签="粒子类型"
                  value={设置值.粒子类型}
                  options={["关闭", "尘埃", "樱花", "萤火虫", "雪花", "雨丝"]}
                  onChange={(v) => 修改("粒子类型", v as 粒子类型)}
                />
                <滑杆 标签="粒子数量" value={设置值.粒子数量} min={0} max={1} step={0.01} onChange={(v) => 修改("粒子数量", v)} />
                <滑杆 标签="粒子速度" value={设置值.粒子速度} min={0} max={1.5} step={0.01} onChange={(v) => 修改("粒子速度", v)} />
                <滑杆 标签="粒子大小" value={设置值.粒子大小} min={0} max={1.5} step={0.01} onChange={(v) => 修改("粒子大小", v)} />
                <滑杆 标签="粒子透明度" value={设置值.粒子透明度} min={0} max={1} step={0.01} onChange={(v) => 修改("粒子透明度", v)} />
              </参数组>

              <参数组 标题="光影与色彩">
                <滑杆 标签="泛光强度" value={设置值.泛光} min={0} max={0.9} step={0.01} onChange={(v) => 修改("泛光", v)} />
                <滑杆 标签="泛光范围" value={设置值.泛光半径} min={0} max={1} step={0.01} onChange={(v) => 修改("泛光半径", v)} />
                <滑杆 标签="泛光阈值" value={设置值.泛光阈值} min={0.15} max={0.9} step={0.01} onChange={(v) => 修改("泛光阈值", v)} />
                <div style={{ margin: "-4px 0 9px", fontSize: 10, lineHeight: 1.45, color: "rgba(255,255,255,.30)" }}>
                  阈值越高，只有真正的高光区域才会发光，能避免人物和大面积白色区域过曝。
                </div>
                <滑杆 标签="镜头色散" value={设置值.色散} min={0} max={0.008} step={0.0001} onChange={(v) => 修改("色散", v)} />
                <滑杆 标签="暗角" value={设置值.暗角} min={0} max={2} step={0.01} onChange={(v) => 修改("暗角", v)} />
                <滑杆 标签="曝光" value={设置值.曝光} min={0.72} max={1.18} step={0.01} onChange={(v) => 修改("曝光", v)} />
                <滑杆 标签="饱和度" value={设置值.饱和度} min={0} max={1.8} step={0.01} onChange={(v) => 修改("饱和度", v)} />
                <滑杆 标签="色温" value={设置值.色温} min={-0.5} max={0.5} step={0.01} onChange={(v) => 修改("色温", v)} />
                <滑杆 标签="对比度" value={设置值.对比度} min={0.6} max={1.5} step={0.01} onChange={(v) => 修改("对比度", v)} />
                <滑杆 标签="柔光" value={设置值.柔光} min={0} max={1} step={0.01} onChange={(v) => 修改("柔光", v)} />
                <滑杆
                  标签="清晰度"
                  value={设置值.清晰度}
                  min={0}
                  max={0.8}
                  step={0.01}
                  onChange={(v) => 修改("清晰度", v)}
                />
                <div style={{ margin: "-4px 0 9px", fontSize: 10, lineHeight: 1.45, color: "rgba(255,255,255,.30)" }}>
                  提升边缘细节与线稿锐度。动漫图建议保持在 0.05–0.25，过高会放大噪点和锯齿。
                </div>
                <滑杆 标签="胶片颗粒" value={设置值.胶片颗粒} min={0} max={0.15} step={0.001} onChange={(v) => 修改("胶片颗粒", v)} />
                <滑杆 标签="背景柔化" value={设置值.背景模糊} min={0} max={1} step={0.01} onChange={(v) => 修改("背景模糊", v)} />
              </参数组>
            </aside>
          )}

          <div className="bl-toolbar" style={toolbarStyle}>
            <button className="bl-ui-button" style={toolbarButton} onClick={() => 文件输入.current?.click()} title="更换图片">
              换图
            </button>
            <button className="bl-ui-button" style={toolbarButton} onClick={切换暂停} title="空格键播放 / 暂停">
              {暂停 ? "播放" : "暂停"}
            </button>
            <button
              className="bl-ui-button"
              style={{
                ...toolbarButton,
                background: 原图预览
                  ? "rgba(255,208,191,.18)"
                  : "rgba(255,255,255,.075)",
              }}
              onClick={() => set原图预览((v) => !v)}
            >
              {原图预览 ? "返回效果" : "查看原图"}
            </button>
            <button className="bl-ui-button" style={toolbarButton} onClick={导出图片}>
              导出 PNG
            </button>
            {正在录制 ? (
              <button
                className="bl-ui-button"
                style={{ ...toolbarButton, background: "rgba(255,120,120,.2)" }}
                onClick={停止录制}
                title="提前结束并保存"
              >
                停止录制 · {录制已过.toFixed(1)}s / {录制总长}s
              </button>
            ) : (
              <button className="bl-ui-button" style={toolbarButton} onClick={() => 开始录制(5)}>
                录制 5 秒
              </button>
            )}
            <button className="bl-ui-button" style={toolbarButton} onClick={全屏}>
              全屏
            </button>
            <button className="bl-ui-button" style={toolbarButton} onClick={() => set面板打开((v) => !v)}>
              {面板打开 ? "隐藏参数" : "显示参数"}
            </button>
          </div>
        </>
      )}

      {错误 && (
        <button type="button" onClick={() => set错误("")} style={errorStyle} title="点击关闭">
          {错误}
        </button>
      )}
      </main>
    </div>
  );
}

function 参数组({ 标题, children }: { 标题: string; children: ReactNode }) {
  return (
    <section
      style={{
        marginTop: 14,
        paddingTop: 13,
        borderTop: "1px solid rgba(255,255,255,.075)",
      }}
    >
      <div
        style={{
          marginBottom: 11,
          fontSize: 10,
          fontWeight: 650,
          letterSpacing: ".12em",
          color: "rgba(255,230,222,.58)",
        }}
      >
        {标题}
      </div>
      {children}
    </section>
  );
}

function 滑杆({
  标签,
  value,
  min,
  max,
  step,
  onChange,
  suffix = "",
  formatter,
}: {
  标签: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  suffix?: string;
  formatter?: (value: number) => string;
}) {
  const fill = ((value - min) / (max - min)) * 100;
  const decimals = step < 0.001 ? 4 : step < 0.01 ? 3 : step < 0.1 ? 2 : 1;

  return (
    <label style={{ display: "grid", gap: 3, marginBottom: 9 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          minHeight: 18,
        }}
      >
        <span style={{ color: "rgba(255,255,255,.78)" }}>{标签}</span>
        <span
          style={{
            minWidth: 48,
            textAlign: "right",
            color: "rgba(255,224,214,.52)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {formatter ? formatter(value) : `${value.toFixed(decimals)}${suffix}`}
        </span>
      </div>

      <input
        className="bl-range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ "--fill": `${fill}%` } as CSSProperties}
      />
    </label>
  );
}

function 下拉({
  标签,
  value,
  options,
  onChange,
}: {
  标签: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label style={{ display: "grid", gap: 6, marginBottom: 11 }}>
      <span style={{ color: "rgba(255,255,255,.78)" }}>{标签}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          height: 34,
          padding: "0 10px",
          borderRadius: 9,
          border: "1px solid rgba(255,255,255,.09)",
          outline: "none",
          color: "rgba(255,255,255,.88)",
          background: "rgba(255,255,255,.055)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,.025)",
          cursor: "pointer",
        }}
      >
        {options.map((x) => (
          <option key={x} value={x} style={{ color: "#16161a" }}>
            {x}
          </option>
        ))}
      </select>
    </label>
  );
}

const presetDock: CSSProperties = {
  position: "absolute",
  top: 62,
  left: 16,
  zIndex: 15,
  display: "flex",
  alignItems: "center",
  gap: 8,
  maxWidth: "calc(100% - 360px)",
  padding: 6,
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,.09)",
  background:
    "linear-gradient(180deg,rgba(22,20,25,.62),rgba(13,13,17,.48))",
  boxShadow:
    "0 16px 46px rgba(0,0,0,.16), inset 0 1px 0 rgba(255,255,255,.045)",
  backdropFilter: "blur(18px) saturate(125%)",
  WebkitBackdropFilter: "blur(18px) saturate(125%)",
};

const presetTitle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  padding: "0 7px 0 5px",
  color: "rgba(255,255,255,.46)",
  fontSize: 10,
  letterSpacing: ".12em",
  whiteSpace: "nowrap",
};

const presetGlowDot: CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: 999,
  background: "#ffd2bd",
  boxShadow: "0 0 10px rgba(255,201,183,.58)",
};

const presetSegments: CSSProperties = {
  display: "flex",
  gap: 3,
  overflowX: "auto",
};

const presetChip: CSSProperties = {
  flex: "0 0 auto",
  minWidth: 46,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "transparent",
  borderRadius: 10,
  padding: "7px 10px",
  color: "rgba(255,255,255,.58)",
  background: "transparent",
  cursor: "pointer",
  fontSize: 11,
  transition:
    "background-color .18s ease, color .18s ease, border-color .18s ease, box-shadow .18s ease",
};

const presetChipActive: CSSProperties = {
  color: "#fff8f4",
  borderColor: "rgba(255,224,211,.13)",
  background:
    "linear-gradient(180deg,rgba(255,220,205,.16),rgba(255,194,174,.08))",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,.08), 0 4px 16px rgba(0,0,0,.08)",
};

const panelStyle: CSSProperties = {
  position: "absolute",
  top: 14,
  right: 14,
  zIndex: 20,
  width: "min(322px, calc(100vw - 28px))",
  maxHeight: "calc(100% - 86px)",
  overflowY: "auto",
  padding: 15,
  borderRadius: 18,
  color: "#fff",
  background:
    "linear-gradient(180deg,rgba(18,17,23,.76),rgba(12,12,17,.66))",
  border: "1px solid rgba(255,255,255,.085)",
  boxShadow: "0 20px 70px rgba(0,0,0,.22)",
  backdropFilter: "blur(22px) saturate(120%)",
  WebkitBackdropFilter: "blur(22px) saturate(120%)",
  font: '12px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif',
};

const panelHeader: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const smallGhost: CSSProperties = {
  border: "1px solid rgba(255,255,255,.075)",
  borderRadius: 999,
  padding: "6px 9px",
  color: "rgba(255,255,255,.52)",
  background: "rgba(255,255,255,.035)",
  cursor: "pointer",
  fontSize: 10,
};

const toolbarStyle: CSSProperties = {
  position: "absolute",
  left: "50%",
  bottom: 14,
  zIndex: 30,
  display: "flex",
  maxWidth: "calc(100vw - 28px)",
  overflowX: "auto",
  gap: 6,
  padding: 7,
  transform: "translateX(-50%)",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,.085)",
  background: "rgba(14,13,18,.54)",
  boxShadow: "0 12px 40px rgba(0,0,0,.16)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
};

const toolbarButton: CSSProperties = {
  flex: "0 0 auto",
  border: "1px solid rgba(255,255,255,.055)",
  borderRadius: 999,
  padding: "9px 12px",
  color: "rgba(255,255,255,.86)",
  background: "rgba(255,255,255,.075)",
  cursor: "pointer",
  fontSize: 12,
};

const errorStyle: CSSProperties = {
  position: "absolute",
  left: 16,
  bottom: 16,
  zIndex: 50,
  maxWidth: 520,
  padding: "10px 12px",
  borderRadius: 10,
  color: "#fff",
  background: "rgba(110,20,32,.84)",
  border: "1px solid rgba(255,255,255,.12)",
  cursor: "pointer",
  fontSize: 12,
};

