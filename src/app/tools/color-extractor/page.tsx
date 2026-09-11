"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { Breadcrumb } from '@/components/breadcrumb'

type RGB = { r: number; g: number; b: number };
type PaletteColor = RGB & {
  hex: string;
  hsl: string;
  weight: number;
  name: string;
};

const SAMPLE_STEP = 7;
const K = 7;
const ITERATIONS = 10;

function clamp(value: number, min = 0, max = 255) {
  return Math.max(min, Math.min(max, value));
}

function componentToHex(value: number) {
  return clamp(Math.round(value)).toString(16).padStart(2, "0");
}

function rgbToHex({ r, g, b }: RGB) {
  return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`.toUpperCase();
}

function rgbToHsl({ r, g, b }: RGB) {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rr:
        h = (gg - bb) / d + (gg < bb ? 6 : 0);
        break;
      case gg:
        h = (bb - rr) / d + 2;
        break;
      default:
        h = (rr - gg) / d + 4;
    }
    h /= 6;
  }

  return `hsl(${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
}

function luminance({ r, g, b }: RGB) {
  const channels = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(a: RGB, b: RGB) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const light = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (light + 0.05) / (dark + 0.05);
}

function distance(a: RGB, b: RGB) {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

function hueName(rgb: RGB) {
  const hex = rgbToHex(rgb);
  const hsl = rgbToHsl(rgb);
  const match = /hsl\((\d+)/.exec(hsl);
  const hue = match ? Number(match[1]) : 0;
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  const spread = max - min;
  const avg = (rgb.r + rgb.g + rgb.b) / 3;

  if (spread < 18) {
    if (avg > 225) return "Paper";
    if (avg > 175) return "Mist";
    if (avg > 105) return "Stone";
    if (avg > 45) return "Graphite";
    return "Ink";
  }
  if (hue < 15 || hue >= 345) return "Crimson";
  if (hue < 40) return "Amber";
  if (hue < 65) return "Sun";
  if (hue < 155) return "Leaf";
  if (hue < 195) return "Aqua";
  if (hue < 245) return "Sky";
  if (hue < 285) return "Violet";
  if (hue < 330) return "Magenta";
  return hex;
}

function pickInitialCentroids(samples: RGB[], k: number) {
  if (!samples.length) return [];
  const centroids: RGB[] = [samples[0]];
  while (centroids.length < k && centroids.length < samples.length) {
    let best = samples[0];
    let bestDistance = -1;
    for (const sample of samples) {
      const nearest = Math.min(...centroids.map((c) => distance(sample, c)));
      if (nearest > bestDistance) {
        bestDistance = nearest;
        best = sample;
      }
    }
    centroids.push(best);
  }
  return centroids;
}

function extractPalette(image: HTMLImageElement): PaletteColor[] {
  const canvas = document.createElement("canvas");
  const maxSide = 520;
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const samples: RGB[] = [];

  for (let i = 0; i < pixels.length; i += 4 * SAMPLE_STEP) {
    const a = pixels[i + 3];
    if (a < 180) continue;
    const rgb = { r: pixels[i], g: pixels[i + 1], b: pixels[i + 2] };
    const max = Math.max(rgb.r, rgb.g, rgb.b);
    const min = Math.min(rgb.r, rgb.g, rgb.b);
    if (max > 248 && min > 248) continue;
    samples.push(rgb);
  }

  if (!samples.length) return [];
  let centroids = pickInitialCentroids(samples, K);

  for (let iter = 0; iter < ITERATIONS; iter += 1) {
    const groups = centroids.map(() => ({ r: 0, g: 0, b: 0, count: 0 }));
    for (const sample of samples) {
      let best = 0;
      let bestDistance = Infinity;
      centroids.forEach((centroid, index) => {
        const d = distance(sample, centroid);
        if (d < bestDistance) {
          bestDistance = d;
          best = index;
        }
      });
      groups[best].r += sample.r;
      groups[best].g += sample.g;
      groups[best].b += sample.b;
      groups[best].count += 1;
    }

    centroids = centroids.map((centroid, index) => {
      const group = groups[index];
      if (!group.count) return centroid;
      return {
        r: group.r / group.count,
        g: group.g / group.count,
        b: group.b / group.count,
      };
    });
  }

  const counts = centroids.map(() => 0);
  for (const sample of samples) {
    let best = 0;
    let bestDistance = Infinity;
    centroids.forEach((centroid, index) => {
      const d = distance(sample, centroid);
      if (d < bestDistance) {
        bestDistance = d;
        best = index;
      }
    });
    counts[best] += 1;
  }

  const total = counts.reduce((sum, value) => sum + value, 0) || 1;

  return centroids
    .map((centroid, index) => ({
      ...centroid,
      hex: rgbToHex(centroid),
      hsl: rgbToHsl(centroid),
      weight: counts[index] / total,
      name: hueName(centroid),
    }))
    .sort((a, b) => b.weight - a.weight)
    .filter((color, index, arr) => arr.findIndex((other) => distance(color, other) < 420) === index)
    .slice(0, K);
}

function shade(rgb: RGB, amount: number): RGB {
  return {
    r: clamp(rgb.r + (255 - rgb.r) * Math.max(amount, 0) + rgb.r * Math.min(amount, 0)),
    g: clamp(rgb.g + (255 - rgb.g) * Math.max(amount, 0) + rgb.g * Math.min(amount, 0)),
    b: clamp(rgb.b + (255 - rgb.b) * Math.max(amount, 0) + rgb.b * Math.min(amount, 0)),
  };
}

function buildScale(base: RGB) {
  const steps = [
    ["50", 0.93],
    ["100", 0.82],
    ["200", 0.66],
    ["300", 0.48],
    ["400", 0.26],
    ["500", 0],
    ["600", -0.12],
    ["700", -0.25],
    ["800", -0.38],
    ["900", -0.5],
    ["950", -0.62],
  ] as const;

  return steps.map(([label, amount]) => ({
    label,
    hex: rgbToHex(shade(base, amount)),
  }));
}

function downloadText(filename: string, content: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ColorExtractorPro() {
  const rootRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [palette, setPalette] = useState<PaletteColor[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [copied, setCopied] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const active = palette[activeIndex] ?? palette[0];
  const scale = useMemo(() => active ? buildScale(active) : [], [active]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.from(".cep-reveal", { y: 12, opacity: 0, duration: 0.65, stagger: 0.045, ease: "power3.out" });
    }, root);
    return () => ctx.revert();
  }, []);

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1100);
    } catch {
      setCopied("Copy failed");
    }
  }

  function loadFile(nextFile: File) {
    if (!nextFile.type.startsWith("image/")) {
      setError("请选择 JPG、PNG、WEBP、AVIF 等图片。");
      return;
    }

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(nextFile);
    objectUrlRef.current = url;
    setFile(nextFile);
    setImageUrl(url);
    setPalette([]);
    setActiveIndex(0);
    setError("");
    setProcessing(true);
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0];
    if (nextFile) loadFile(nextFile);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    const nextFile = event.dataTransfer.files?.[0];
    if (nextFile) loadFile(nextFile);
  }

  function onImageLoad() {
    if (!imageRef.current) return;
    window.requestAnimationFrame(() => {
      try {
        const colors = extractPalette(imageRef.current!);
        setPalette(colors);
        setActiveIndex(0);
        if (!colors.length) setError("没有提取到有效颜色，请换一张图片。");
      } catch (cause) {
        console.error(cause);
        setError("颜色分析失败。");
      } finally {
        setProcessing(false);
      }
    });
  }

  function exportCss() {
    if (!palette.length) return;
    const content = `:root {\n${palette.map((color, index) => `  --palette-${index + 1}: ${color.hex};`).join("\n")}\n}\n`;
    downloadText("bitleap-palette.css", content, "text/css");
  }

  function exportJson() {
    if (!palette.length) return;
    const content = JSON.stringify(
      palette.map((color, index) => ({
        id: index + 1,
        name: color.name,
        hex: color.hex,
        rgb: `rgb(${Math.round(color.r)} ${Math.round(color.g)} ${Math.round(color.b)})`,
        hsl: color.hsl,
        weight: Number((color.weight * 100).toFixed(1)),
      })),
      null,
      2,
    );
    downloadText("bitleap-palette.json", content, "application/json");
  }

  function exportTailwind() {
    if (!active) return;
    const content = `export default {\n  theme: {\n    extend: {\n      colors: {\n        extracted: {\n${scale.map((item) => `          ${item.label}: "${item.hex}",`).join("\n")}\n        },\n      },\n    },\n  },\n};\n`;
    downloadText("tailwind.extracted.js", content, "text/javascript");
  }

  const contrastWhite = active ? contrastRatio(active, { r: 255, g: 255, b: 255 }) : 0;
  const contrastBlack = active ? contrastRatio(active, { r: 0, g: 0, b: 0 }) : 0;
  const bestText = contrastWhite >= contrastBlack ? "#FFFFFF" : "#000000";

  return (
    <main ref={rootRef} className="min-h-screen bg-[#f1f0eb] pt-16 text-[#171713]">
      <div className="pointer-events-none fixed inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(23,23,19,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(23,23,19,.03)_1px,transparent_1px)] [background-size:32px_32px]" />

      <section className="relative mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="cep-reveal flex flex-col gap-4 border-b border-black/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[8px] font-semibold uppercase tracking-[0.18em] text-black/28"><Breadcrumb /></div>
            <h1 className="mt-2 text-[30px] font-medium tracking-[-0.045em] sm:text-[40px]">配色提取器</h1>
            <p className="mt-2 max-w-[620px] text-[10px] font-medium leading-5 text-black/42">从图片中自动提取主色、生成色阶、检查文字对比度，并导出为设计变量。</p>
          </div>

          {imageUrl && (
            <div className="flex gap-2">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="border border-black/10 bg-white/45 px-4 py-2 text-[8px] font-semibold tracking-[0.08em] text-black/48 transition hover:bg-black hover:text-white">更换图片</button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={onInputChange} className="hidden" />
            </div>
          )}
        </header>

        {!imageUrl ? (
          <div className="cep-reveal flex min-h-[calc(100vh-200px)] items-center justify-center py-8">
            <div className="w-full max-w-[920px]">
              <div className="mb-5 text-center">
                <h2 className="text-[26px] font-medium tracking-[-0.035em] sm:text-[34px]">上传一张图片，马上提取配色</h2>
                <p className="mt-2 text-[10px] font-medium text-black/38">支持 JPG、PNG、WEBP、AVIF，图片仅在浏览器本地处理。</p>
              </div>

              <button type="button" onDragOver={(event) => event.preventDefault()} onDrop={onDrop} onClick={() => fileInputRef.current?.click()} className="group relative block w-full overflow-hidden border border-dashed border-black/18 bg-[#faf9f5] text-left transition hover:border-black/30 hover:bg-white">
                <div className="flex min-h-[330px] flex-col items-center justify-center px-6 py-10 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#171713] text-[24px] font-light text-white transition-transform duration-300 group-hover:scale-105">+</div>
                  <div className="mt-5 text-[18px] font-semibold tracking-[-0.02em]">点击上传图片</div>
                  <div className="mt-2 text-[9px] font-medium text-black/34">或者将图片拖到这里</div>
                  <div className="mt-6 inline-flex items-center gap-2 bg-[#caff82] px-4 py-2.5 text-[8px] font-semibold tracking-[0.08em] text-[#171713]">选择图片 <span>↗</span></div>
                </div>
              </button>

              <input ref={fileInputRef} type="file" accept="image/*" onChange={onInputChange} className="hidden" />

              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                <div className="border border-black/10 bg-white/35 p-4">
                  <div className="text-[8px] font-semibold text-black/55">自动提取主色</div>
                  <div className="mt-1 text-[8px] leading-4 text-black/32">识别图片中最具代表性的 7 个颜色。</div>
                </div>
                <div className="border border-black/10 bg-white/35 p-4">
                  <div className="text-[8px] font-semibold text-black/55">生成设计色阶</div>
                  <div className="mt-1 text-[8px] leading-4 text-black/32">自动生成 50–950 的 Tailwind 风格色阶。</div>
                </div>
                <div className="border border-black/10 bg-white/35 p-4">
                  <div className="text-[8px] font-semibold text-black/55">检查可读性</div>
                  <div className="mt-1 text-[8px] leading-4 text-black/32">快速判断黑字或白字是否适合当前颜色。</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="cep-reveal min-w-0">
              <div className="overflow-hidden border border-black/10 bg-[#f8f7f2]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 px-4 py-3">
                  <div>
                    <div className="text-[7px] font-semibold tracking-[0.1em] text-black/28">原图</div>
                    <div className="mt-1 max-w-[60vw] truncate text-[10px] font-semibold">{file?.name}</div>
                  </div>
                  <div className="text-[8px] font-semibold text-black/30">{processing ? "正在分析颜色…" : `已提取 ${palette.length} 个颜色`}</div>
                </div>

                <div className="flex min-h-[560px] items-center justify-center bg-[#e4e3de] p-4 sm:p-6">
                  <img ref={imageRef} src={imageUrl} alt="原图" onLoad={onImageLoad} className="max-h-[72vh] max-w-full object-contain shadow-[0_20px_50px_rgba(20,20,15,.12)]" />
                </div>

                <div className="grid border-t border-black/10 sm:grid-cols-7">
                  {palette.map((color, index) => {
                    const textColor = contrastRatio(color, { r: 255, g: 255, b: 255 }) > contrastRatio(color, { r: 0, g: 0, b: 0 }) ? "#FFFFFF" : "#111111";
                    return (
                      <button key={color.hex} type="button" onClick={() => setActiveIndex(index)} className={`min-h-[94px] border-b border-black/[0.07] p-3 text-left transition sm:border-b-0 sm:border-r sm:last:border-r-0 ${activeIndex === index ? "ring-2 ring-inset ring-black/45" : ""}`} style={{ backgroundColor: color.hex, color: textColor }}>
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[6px] font-semibold opacity-58">{String(index + 1).padStart(2, "0")}</span>
                          <span className="text-[6px] font-semibold opacity-55">{(color.weight * 100).toFixed(0)}%</span>
                        </div>
                        <div className="mt-6">
                          <div className="text-[8px] font-semibold">{color.name}</div>
                          <div className="mt-1 font-mono text-[8px] font-semibold">{color.hex}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <button type="button" onClick={exportCss} className="border border-black/10 bg-[#faf9f5] p-4 text-left transition hover:bg-black hover:text-white">
                  <div className="text-[7px] font-semibold text-black/30 transition group-hover:text-white/40">导出</div>
                  <div className="mt-2 text-[9px] font-semibold">CSS 变量</div>
                </button>
                <button type="button" onClick={exportJson} className="border border-black/10 bg-[#faf9f5] p-4 text-left transition hover:bg-black hover:text-white">
                  <div className="text-[7px] font-semibold text-black/30">导出</div>
                  <div className="mt-2 text-[9px] font-semibold">配色 JSON</div>
                </button>
                <button type="button" onClick={exportTailwind} className="border border-black/10 bg-[#caff82] p-4 text-left transition hover:bg-black hover:text-white">
                  <div className="text-[7px] font-semibold text-black/30">导出</div>
                  <div className="mt-2 text-[9px] font-semibold">Tailwind 色阶</div>
                </button>
              </div>
            </div>

            <aside className="cep-reveal min-w-0 space-y-4">
              {active && (
                <>
                  <div className="border border-black/10 bg-[#faf9f5]">
                    <div className="grid grid-cols-[minmax(0,1fr)_112px] border-b border-black/10">
                      <div className="p-4">
                        <div className="text-[7px] font-semibold tracking-[0.12em] text-black/26">当前颜色</div>
                        <div className="mt-2 text-[22px] font-medium tracking-[-0.035em]">{active.name}</div>
                      </div>
                      <div style={{ backgroundColor: active.hex }} />
                    </div>

                    <div className="divide-y divide-black/[0.07]">
                      <button type="button" onClick={() => copy(active.hex, "已复制 HEX")} className="grid w-full grid-cols-[50px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left hover:bg-black/[0.025]">
                        <span className="text-[7px] font-semibold text-black/28">HEX</span>
                        <span className="font-mono text-[10px] font-semibold">{active.hex}</span>
                        <span className="text-[6px] font-semibold text-black/24">复制</span>
                      </button>
                      <button type="button" onClick={() => copy(`rgb(${Math.round(active.r)} ${Math.round(active.g)} ${Math.round(active.b)})`, "已复制 RGB")} className="grid w-full grid-cols-[50px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left hover:bg-black/[0.025]">
                        <span className="text-[7px] font-semibold text-black/28">RGB</span>
                        <span className="truncate font-mono text-[9px]">rgb({Math.round(active.r)} {Math.round(active.g)} {Math.round(active.b)})</span>
                        <span className="text-[6px] font-semibold text-black/24">复制</span>
                      </button>
                      <button type="button" onClick={() => copy(active.hsl, "已复制 HSL")} className="grid w-full grid-cols-[50px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left hover:bg-black/[0.025]">
                        <span className="text-[7px] font-semibold text-black/28">HSL</span>
                        <span className="truncate font-mono text-[9px]">{active.hsl}</span>
                        <span className="text-[6px] font-semibold text-black/24">复制</span>
                      </button>
                    </div>
                  </div>

                  <div className="border border-black/10 bg-[#faf9f5]">
                    <div className="border-b border-black/10 px-4 py-3">
                      <div className="text-[7px] font-semibold tracking-[0.12em] text-black/26">文字对比度</div>
                      <div className="mt-1 text-[10px] font-semibold">查看黑字与白字的可读性</div>
                    </div>

                    <div className="grid grid-cols-2">
                      <div className="border-r border-black/10 p-4" style={{ backgroundColor: active.hex, color: "#FFFFFF" }}>
                        <div className="text-[7px] font-semibold opacity-55">白色文字</div>
                        <div className="mt-4 text-[26px] font-medium tracking-[-0.04em]">{contrastWhite.toFixed(2)}</div>
                        <div className="mt-1 text-[6px] font-semibold opacity-60">{contrastWhite >= 4.5 ? "通过 AA" : "未通过 AA"}</div>
                      </div>
                      <div className="p-4" style={{ backgroundColor: active.hex, color: "#000000" }}>
                        <div className="text-[7px] font-semibold opacity-55">黑色文字</div>
                        <div className="mt-4 text-[26px] font-medium tracking-[-0.04em]">{contrastBlack.toFixed(2)}</div>
                        <div className="mt-1 text-[6px] font-semibold opacity-60">{contrastBlack >= 4.5 ? "通过 AA" : "未通过 AA"}</div>
                      </div>
                    </div>

                    <div className="border-t border-black/10 px-4 py-3 text-[8px] font-medium text-black/40">推荐文字颜色：<span className="ml-1 font-mono font-semibold text-black/72">{bestText}</span></div>
                  </div>

                  <div className="border border-black/10 bg-[#faf9f5]">
                    <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
                      <div>
                        <div className="text-[7px] font-semibold tracking-[0.12em] text-black/26">设计色阶</div>
                        <div className="mt-1 text-[10px] font-semibold">50 → 950</div>
                      </div>
                      <span className="text-[7px] font-semibold text-black/24">点击复制</span>
                    </div>

                    <div className="grid grid-cols-2">
                      {scale.map((item, index) => {
                        const rgb = {
                          r: parseInt(item.hex.slice(1, 3), 16),
                          g: parseInt(item.hex.slice(3, 5), 16),
                          b: parseInt(item.hex.slice(5, 7), 16),
                        };
                        const textColor = contrastRatio(rgb, { r: 255, g: 255, b: 255 }) > contrastRatio(rgb, { r: 0, g: 0, b: 0 }) ? "#FFFFFF" : "#111111";
                        return (
                          <button key={item.label} type="button" onClick={() => copy(item.hex, `已复制 ${item.label}`)} className={`flex min-h-[56px] items-center justify-between px-3 py-2 text-left ${index === scale.length - 1 ? "col-span-2" : ""}`} style={{ backgroundColor: item.hex, color: textColor }}>
                            <span className="text-[6px] font-semibold opacity-60">{item.label}</span>
                            <span className="font-mono text-[7px] font-semibold">{item.hex}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {error && <div className="border-l-2 border-[#c75a44] bg-[#ead5cf] px-4 py-3 text-[9px] font-medium leading-4 text-black/60">{error}</div>}
            </aside>
          </div>
        )}
      </section>

      {copied && <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 bg-[#171713] px-4 py-2 text-[7px] font-semibold tracking-[0.08em] text-white shadow-lg">{copied}</div>}
    </main>
  );
}
