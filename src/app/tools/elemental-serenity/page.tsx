// @ts-nocheck
// 本文件内联了一整份打包好的 3D 游戏引擎（见下方说明），不参与类型检查。
// 注意：这个指令必须放在文件最前面 —— 放在 'use client' 之后会被 TypeScript 忽略，
// 之前就是因为位置不对，构建时照报 1000+ 条类型错误。
'use client';
/**
 * Elemental Serenity — single-TSX integration of the uploaded GitHub source.
 *
 * IMPORTANT:
 * - Application/source logic from the repository is bundled below as local module factories.
 * - GLSL shader files are embedded verbatim in this TSX.
 * - The repository's original CSS and DOM are embedded verbatim.
 * - Binary/static assets are intentionally NOT rewritten; keep the uploaded repository's
 *   `public` directory at your tool site's public root so the original URLs remain unchanged.
 *
 * Runtime dependencies required by this single-file integration:
 *   three@^0.182.0, gsap@^3.14.2
 *
 * The repository's optional debug-only packages (lil-gui, three-perf) and
 * deterministic mersennetwister helper are embedded below so Next.js does not
 * need to resolve those packages separately.
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import gsap from 'gsap';


/**
 * Embedded compatibility layer for the original repository's small external helpers.
 * This keeps the production scene logic untouched while avoiding extra npm packages.
 */
class EmbeddedMersenneTwister {
  mt: number[];
  mti: number;

  constructor(seed = 5489) {
    this.mt = new Array(624);
    this.mti = 625;
    this.initSeed(seed >>> 0);
  }

  initSeed(seed: number) {
    this.mt[0] = seed >>> 0;
    for (this.mti = 1; this.mti < 624; this.mti++) {
      const s = this.mt[this.mti - 1] ^ (this.mt[this.mti - 1] >>> 30);
      this.mt[this.mti] =
        (((((s & 0xffff0000) >>> 16) * 1812433253) << 16) +
          (s & 0x0000ffff) * 1812433253 +
          this.mti) >>> 0;
    }
  }

  int32() {
    let y: number;
    const mag01 = [0x0, 0x9908b0df];

    if (this.mti >= 624) {
      let kk = 0;

      for (; kk < 227; kk++) {
        y = (this.mt[kk] & 0x80000000) | (this.mt[kk + 1] & 0x7fffffff);
        this.mt[kk] = this.mt[kk + 397] ^ (y >>> 1) ^ mag01[y & 0x1];
      }

      for (; kk < 623; kk++) {
        y = (this.mt[kk] & 0x80000000) | (this.mt[kk + 1] & 0x7fffffff);
        this.mt[kk] = this.mt[kk - 227] ^ (y >>> 1) ^ mag01[y & 0x1];
      }

      y = (this.mt[623] & 0x80000000) | (this.mt[0] & 0x7fffffff);
      this.mt[623] = this.mt[396] ^ (y >>> 1) ^ mag01[y & 0x1];
      this.mti = 0;
    }

    y = this.mt[this.mti++];
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;

    return y >>> 0;
  }

  random() {
    return this.int32() * (1.0 / 4294967296.0);
  }
}

class EmbeddedGUIController {
  _onChange: ((value: any) => void) | null = null;

  name(_label?: string) {
    return this;
  }

  onChange(fn: (value: any) => void) {
    this._onChange = fn;
    return this;
  }

  listen() {
    return this;
  }

  min(_v?: number) {
    return this;
  }

  max(_v?: number) {
    return this;
  }

  step(_v?: number) {
    return this;
  }
}

class EmbeddedGUIFolder {
  domElement: HTMLElement;
  folders: EmbeddedGUIFolder[] = [];

  constructor() {
    this.domElement =
      typeof document !== 'undefined'
        ? document.createElement('div')
        : ({} as HTMLElement);
  }

  add(..._args: any[]) {
    return new EmbeddedGUIController();
  }

  addColor(..._args: any[]) {
    return new EmbeddedGUIController();
  }

  addFolder(_name?: string) {
    const folder = new EmbeddedGUIFolder();
    this.folders.push(folder);
    return folder;
  }

  close() {
    return this;
  }

  open() {
    return this;
  }

  destroy() {
    try {
      this.domElement?.remove?.();
    } catch {}
  }
}

class EmbeddedGUI extends EmbeddedGUIFolder {
  constructor(..._args: any[]) {
    super();
  }
}

class EmbeddedThreePerf {
  enabled = false;
  showGraph = false;
  domElement: HTMLElement | null = null;

  constructor(_options: any = {}) {}

  begin() {}
  end() {}
  dispose() {}
}

const ORIGINAL_CSS = String.raw`
      @import url('https://fonts.googleapis.com/css2?family=Amatic+SC:wght@400;700&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Schoolbell&display=swap');
      @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css');

      * {
        margin: 0;
        padding: 0;

        &::selection {
          color: #ede8e4;
          background-color: #000000;
        }
      }

      html,
      body {
        background-color: #ede8e4;
        overflow: hidden;
      }

      #three {
        position: fixed;
        top: 0;
        left: 0;
        outline: none;
      }

      #shader-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1001;
        pointer-events: none;
      }

      #loader {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(
          145deg,
          #f5f0ec 0%,
          #ede8e4 50%,
          #e5dfd9 100%
        );
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 1002;
        transition: opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        gap: 28px;
      }

      #loader::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: radial-gradient(
            ellipse at 20% 30%,
            rgba(253, 230, 27, 0.08) 0%,
            transparent 50%
          ),
          radial-gradient(
            ellipse at 80% 70%,
            rgba(191, 5, 5, 0.05) 0%,
            transparent 50%
          );
        pointer-events: none;
      }

      #loader.hidden {
        opacity: 0;
        pointer-events: none;
      }

      .loader-title {
        font-family: 'Schoolbell', sans-serif;
        font-size: 3.2rem;
        font-weight: 700;
        color: #000;
        text-align: center;
        position: relative;
        display: inline-block;
        margin-bottom: 0;
        letter-spacing: 1px;
        animation: titlePulse 4s ease-in-out infinite;
      }

      @keyframes titlePulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.85;
        }
      }

      .loader-title .fa-square {
        position: absolute;
        top: -0.4em;
        left: -0.8em;
        font-size: 0.55em;
        background: linear-gradient(
          135deg,
          #fde61b 0%,
          #f69e02 30%,
          #fa5a03 60%,
          #bf0505 100%
        );
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        transform: rotate(-25deg);
        animation: leafFloat 3s ease-in-out infinite;
        filter: drop-shadow(0 2px 4px rgba(246, 158, 2, 0.3));
      }

      @keyframes leafFloat {
        0%,
        100% {
          transform: rotate(-25deg) translateY(0px) scale(1);
        }
        50% {
          transform: rotate(-18deg) translateY(-4px) scale(1.05);
        }
      }

      .loader-progress {
        width: 380px;
        height: 3px;
        background: rgba(0, 0, 0, 0.08);
        overflow: hidden;
        margin: 0;
        border-radius: 4px;
        position: relative;
        box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.06);
      }

      .loader-progress::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(255, 255, 255, 0.4),
          transparent
        );
        animation: shimmer 2s infinite;
      }

      @keyframes shimmer {
        0% {
          transform: translateX(-100%);
        }
        100% {
          transform: translateX(100%);
        }
      }

      .loader-progress-bar {
        height: 100%;
        background: linear-gradient(
          90deg,
          rgba(0, 0, 0, 0.5) 0%,
          rgba(0, 0, 0, 0.7) 50%,
          rgba(0, 0, 0, 0.5) 100%
        );
        width: 0%;
        transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: 4px;
        position: relative;
      }

      .loader-progress-bar::after {
        content: '';
        position: absolute;
        right: 0;
        top: -2px;
        bottom: -2px;
        width: 8px;
        background: rgba(0, 0, 0, 0.9);
        border-radius: 4px;
        box-shadow: 0 0 12px rgba(0, 0, 0, 0.4);
      }

      .loader-text {
        font-family: 'Inter', sans-serif;
        font-size: 0.82rem;
        color: rgba(0, 0, 0, 0.45);
        text-align: center;
        line-height: 1.6;
        max-width: 400px;
        margin: 0;
        min-height: 40px;
        letter-spacing: 0.3px;
        transition: color 0.3s ease;
      }

      .explore-buttons {
        display: flex;
        gap: 14px;
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        visibility: hidden;
      }

      .explore-button {
        padding: 15px 28px;
        border-radius: 14px;
        font-family: 'Inter', sans-serif;
        font-size: 0.85rem;
        font-weight: 500;
        letter-spacing: 0.4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 10px;
        transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        margin: 0;
        position: relative;
        overflow: hidden;
      }

      .explore-button::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        background: radial-gradient(
          circle,
          rgba(255, 255, 255, 0.15) 0%,
          transparent 70%
        );
        border-radius: 50%;
        transform: translate(-50%, -50%);
        transition: width 0.4s ease, height 0.4s ease;
      }

      .explore-button:hover::before {
        width: 200%;
        height: 200%;
      }

      .explore-button-light {
        background: linear-gradient(145deg, #f5f0ec, #e5dfd9);
        border: 1px solid rgba(0, 0, 0, 0.06);
        color: rgba(0, 0, 0, 0.8);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08),
          0 1px 4px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.9),
          inset 0 -1px 0 rgba(0, 0, 0, 0.03);
      }

      .explore-button-light:hover {
        background: linear-gradient(145deg, #ffffff, #f0ebe7);
        border-color: rgba(0, 0, 0, 0.1);
        color: rgba(0, 0, 0, 1);
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.06),
          inset 0 1px 0 rgba(255, 255, 255, 1);
      }

      .explore-button-light:active {
        transform: translateY(0px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08),
          inset 0 1px 0 rgba(255, 255, 255, 0.8);
      }

      .explore-button-dark {
        background: linear-gradient(145deg, #2a2a2a, #1a1a1a);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: rgba(255, 255, 255, 0.95);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25),
          0 1px 4px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1),
          inset 0 -1px 0 rgba(0, 0, 0, 0.2);
      }

      .explore-button-dark:hover {
        background: linear-gradient(145deg, #1e1e1e, #252525);
        border-color: rgba(255, 255, 255, 0.12);
        color: rgba(255, 255, 255, 1);
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.15),
          inset 0 1px 0 rgba(255, 255, 255, 0.15);
      }

      .explore-button-dark:active {
        transform: translateY(0px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25),
          inset 0 1px 0 rgba(255, 255, 255, 0.08);
      }

      .explore-button-dark::before {
        background: radial-gradient(
          circle,
          rgba(255, 255, 255, 0.08) 0%,
          transparent 70%
        );
      }

      .explore-buttons.show {
        opacity: 1;
        transform: translateY(0px);
        visibility: visible;
      }

      .explore-button i {
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        font-size: 0.8rem;
      }

      .explore-button:hover i {
        transform: scale(1.15);
      }

      #control-panel {
        position: fixed;
        right: calc(24px + env(safe-area-inset-right, 0px));
        bottom: calc(24px + env(safe-area-inset-bottom, 0px));
        display: none;
        flex-direction: column;
        gap: 14px;
        z-index: 1000;
      }

      #control-panel.show {
        display: flex;
        animation: controlPanelFadeIn 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)
          forwards;
      }

      #music-control {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: linear-gradient(145deg, #f5f0ec, #e5dfd9);
        border: 1px solid rgba(0, 0, 0, 0.06);
        color: #000;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1rem;
        transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08),
          0 1px 4px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.9),
          inset 0 -1px 0 rgba(0, 0, 0, 0.03);
        font-family: 'Inter', sans-serif;
        position: relative;
        overflow: hidden;
      }

      #music-control::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        background: radial-gradient(
          circle,
          rgba(0, 0, 0, 0.08) 0%,
          transparent 70%
        );
        border-radius: 50%;
        transform: translate(-50%, -50%);
        transition: width 0.4s ease, height 0.4s ease;
      }

      #music-control:hover::before {
        width: 120%;
        height: 120%;
      }

      #music-control:hover {
        transform: translateY(-3px) scale(1.05);
        background: linear-gradient(145deg, #ffffff, #f0ebe7);
        border-color: rgba(0, 0, 0, 0.1);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12),
          0 4px 12px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 1);
      }

      #music-control:active {
        transform: translateY(-1px) scale(1.02);
      }

      #music-control.muted {
        background: linear-gradient(145deg, #d8d0c8, #c8bfb7);
        color: rgba(0, 0, 0, 0.4);
        border-color: rgba(0, 0, 0, 0.04);
      }

      #music-control.muted:hover {
        background: linear-gradient(145deg, #d0c8c0, #c0b7af);
        color: rgba(0, 0, 0, 0.6);
      }

      .lightning-btn-wrapper {
        position: relative;
        display: none;
        opacity: 0;
        transform: scale(0.8) translateY(20px);
        transition: opacity 0.4s ease,
          transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        width: 46px;
        height: 46px;
      }

      .lightning-btn-wrapper.show {
        display: block;
        opacity: 1;
        transform: scale(1) translateY(0);
      }

      .lightning-btn {
        position: relative;
        width: 46px;
        height: 46px;
        border-radius: 50%;
        background: linear-gradient(145deg, #080c1a, #0f1628);
        border: 2px solid #00d4ff;
        color: #00ffff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.1rem;
        transition: all 0.3s ease;
        box-shadow: 0 0 20px rgba(0, 212, 255, 0.5),
          0 0 40px rgba(0, 212, 255, 0.2), 0 4px 15px rgba(0, 0, 0, 0.4),
          inset 0 0 15px rgba(0, 212, 255, 0.1);
        z-index: 2;
      }

      .lightning-btn i {
        color: #00ffff;
        text-shadow: 0 0 10px #00ffff, 0 0 20px #00d4ff, 0 0 30px #0099ff,
          0 0 40px rgba(0, 255, 255, 0.5);
        animation: bolt-pulse 1.5s ease-in-out infinite;
      }

      @keyframes bolt-pulse {
        0%,
        100% {
          text-shadow: 0 0 10px #00ffff, 0 0 20px #00d4ff, 0 0 30px #0099ff;
          transform: scale(1);
        }
        50% {
          text-shadow: 0 0 15px #ffffff, 0 0 25px #00ffff, 0 0 40px #00d4ff,
            0 0 60px #0099ff;
          transform: scale(1.15);
        }
      }

      .lightning-btn:hover {
        background: linear-gradient(145deg, #0a1020, #141e38);
        border-color: #00ffff;
        box-shadow: 0 0 30px rgba(0, 255, 255, 0.6),
          0 0 50px rgba(0, 212, 255, 0.3), 0 6px 20px rgba(0, 0, 0, 0.5),
          inset 0 0 20px rgba(0, 255, 255, 0.15);
      }

      .lightning-btn:active {
        transform: translateY(0) scale(0.95);
      }

      .electric-arcs {
        position: absolute;
        top: 0;
        left: 0;
        width: 46px;
        height: 46px;
        pointer-events: none;
        z-index: 3;
      }

      .arc {
        position: absolute;
        top: -7px;
        left: -6px;
        width: 54px;
        height: 54px;
        border-radius: 50%;
        border: 2px solid transparent;
        opacity: 0;
      }

      .lightning-btn-wrapper.show .arc {
        animation: arc-spark 2s linear infinite;
      }

      .arc-1 {
        border-top-color: #00ffff;
        border-right-color: #00d4ff;
        filter: drop-shadow(0 0 4px #00ffff) drop-shadow(0 0 8px #00d4ff)
          drop-shadow(0 0 15px #0099ff);
        animation-delay: 0s !important;
      }

      .arc-2 {
        border-bottom-color: #00b4ff;
        border-left-color: #0088ff;
        filter: drop-shadow(0 0 4px #00b4ff) drop-shadow(0 0 8px #0088ff)
          drop-shadow(0 0 15px #0066ff);
        animation-delay: 0.5s !important;
      }

      .arc-3 {
        border-top-color: #00d4ff;
        border-left-color: #00ffff;
        filter: drop-shadow(0 0 4px #00ffff) drop-shadow(0 0 8px #00d4ff)
          drop-shadow(0 0 15px #0099ff);
        animation-delay: 1s !important;
      }

      .arc-4 {
        border-bottom-color: #0088ff;
        border-right-color: #00b4ff;
        filter: drop-shadow(0 0 4px #00b4ff) drop-shadow(0 0 8px #0088ff)
          drop-shadow(0 0 15px #0066ff);
        animation-delay: 1.5s !important;
      }

      @keyframes arc-spark {
        0% {
          opacity: 0;
          transform: rotate(0deg) scale(0.95);
        }
        15% {
          opacity: 1;
        }
        35% {
          opacity: 0.9;
        }
        50% {
          opacity: 0;
          transform: rotate(180deg) scale(1.05);
        }
        100% {
          opacity: 0;
          transform: rotate(360deg) scale(0.95);
        }
      }

      .lightning-btn-wrapper.striking .lightning-btn {
        background: linear-gradient(145deg, #1a1a3a, #2a2a5a);
        border-color: #ffffff;
        box-shadow: 0 0 50px rgba(0, 255, 255, 1),
          0 0 80px rgba(0, 180, 255, 0.8), 0 0 100px rgba(0, 212, 255, 0.6),
          inset 0 0 30px rgba(255, 255, 255, 0.3);
      }

      .lightning-btn-wrapper.striking .lightning-btn i {
        animation: none;
        color: #ffffff;
        text-shadow: 0 0 20px #ffffff, 0 0 40px #00ffff, 0 0 60px #00d4ff,
          0 0 80px #0088ff;
        transform: scale(1.3);
      }

      .lightning-btn-wrapper.striking .arc {
        animation: arc-flash 0.4s ease-out !important;
        animation-delay: 0s !important;
      }

      @keyframes arc-flash {
        0% {
          opacity: 1;
          transform: scale(1);
          border-color: #ffffff;
          filter: drop-shadow(0 0 15px #ffffff) drop-shadow(0 0 30px #00ffff);
        }
        100% {
          opacity: 0;
          transform: scale(1.8);
          filter: drop-shadow(0 0 25px #00ffff) drop-shadow(0 0 40px #0088ff);
        }
      }

      #daynight-toggle {
        display: flex;
        flex-direction: column;
        gap: 6px;
        background: linear-gradient(145deg, #f5f0ec, #e5dfd9);
        backdrop-filter: blur(20px);
        border-radius: 28px;
        padding: 8px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08),
          0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.8),
          inset 0 -1px 0 rgba(0, 0, 0, 0.02);
        border: 1px solid rgba(0, 0, 0, 0.04);
        width: fit-content;
      }

      .daynight-button {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1rem;
        color: rgba(0, 0, 0, 0.5);
        background: transparent;
        transition: all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        position: relative;
        overflow: hidden;
      }

      .daynight-button::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        border-radius: 50%;
        background: transparent;
        transition: all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        z-index: -1;
        opacity: 0;
        transform: scale(0.8);
      }

      .daynight-button:hover {
        transform: scale(1.1);
        color: rgba(0, 0, 0, 0.75);
      }

      .daynight-button:hover::before {
        background: rgba(0, 0, 0, 0.06);
        opacity: 1;
        transform: scale(1);
      }

      .daynight-button:active {
        transform: scale(1.05);
      }

      .daynight-button.active {
        color: white;
        transform: scale(1.12);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2), 0 2px 6px rgba(0, 0, 0, 0.12);
      }

      .daynight-button.active::before {
        opacity: 1;
        transform: scale(1);
      }

      .daynight-button.active.day::before {
        background: linear-gradient(
          145deg,
          #ffdd44 0%,
          #ffb800 50%,
          #ff9500 100%
        );
        box-shadow: 0 0 20px rgba(255, 184, 0, 0.4);
      }

      .daynight-button.active.night::before {
        background: linear-gradient(
          145deg,
          #6366f1 0%,
          #4f46e5 50%,
          #3730a3 100%
        );
        box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
      }

      #season-menu {
        display: flex;
        flex-direction: column;
        gap: 6px;
        background: linear-gradient(145deg, #f5f0ec, #e5dfd9);
        backdrop-filter: blur(20px);
        border-radius: 28px;
        padding: 8px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08),
          0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.8),
          inset 0 -1px 0 rgba(0, 0, 0, 0.02);
        border: 1px solid rgba(0, 0, 0, 0.04);
        width: fit-content;
      }

      .season-button {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1rem;
        color: rgba(0, 0, 0, 0.5);
        background: transparent;
        transition: all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        position: relative;
        overflow: hidden;
      }

      .season-button::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        border-radius: 50%;
        background: transparent;
        transition: all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        z-index: -1;
        opacity: 0;
        transform: scale(0.8);
      }

      .season-button:hover {
        transform: scale(1.1);
        color: rgba(0, 0, 0, 0.75);
      }

      .season-button:hover::before {
        background: rgba(0, 0, 0, 0.06);
        opacity: 1;
        transform: scale(1);
      }

      .season-button:active {
        transform: scale(1.05);
      }

      .season-button.active {
        color: white;
        transform: scale(1.12);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2), 0 2px 6px rgba(0, 0, 0, 0.12);
      }

      .season-button.active::before {
        opacity: 1;
        transform: scale(1);
      }

      .season-button.active.spring::before {
        background: linear-gradient(
          145deg,
          #22c55e 0%,
          #16a34a 50%,
          #15803d 100%
        );
        box-shadow: 0 0 20px rgba(34, 197, 94, 0.4);
      }

      .season-button.active.autumn::before {
        background: linear-gradient(
          145deg,
          #f97316 0%,
          #ea580c 50%,
          #c2410c 100%
        );
        box-shadow: 0 0 20px rgba(249, 115, 22, 0.4);
      }

      .season-button.active.winter::before {
        background: linear-gradient(
          145deg,
          #38bdf8 0%,
          #0ea5e9 50%,
          #0284c7 100%
        );
        box-shadow: 0 0 20px rgba(56, 189, 248, 0.4);
      }

      .season-button.active.rain::before {
        background: linear-gradient(
          145deg,
          #64748b 0%,
          #475569 50%,
          #334155 100%
        );
        box-shadow: 0 0 20px rgba(100, 116, 139, 0.4);
      }

      @keyframes controlPanelFadeIn {
        0% {
          opacity: 0;
          transform: translateY(40px) translateX(40px) scale(0.85);
          filter: blur(4px);
        }
        60% {
          filter: blur(0);
        }
        100% {
          opacity: 1;
          transform: translateY(0) translateX(0) scale(1);
          filter: blur(0);
        }
      }

      #page-title {
        position: fixed;
        left: 32px;
        bottom: 24px;
        display: none;
        flex-direction: column;
        gap: 16px;
        z-index: 1000;
        font-family: 'Schoolbell', sans-serif;
        font-size: 2.8rem;
        font-weight: 700;
        color: #ede8e4;
        text-align: left;
        position: relative;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3),
          0 0 40px rgba(0, 0, 0, 0.15);
        letter-spacing: 1px;
      }

      #page-title.show {
        display: flex;
        animation: pageTitleFadeIn 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)
          forwards;
      }

      #page-title .fa-square {
        position: absolute;
        top: -0.4em;
        left: -0.8em;
        font-size: 0.55em;
        background: linear-gradient(
          135deg,
          #fde61b 0%,
          #f69e02 30%,
          #fa5a03 60%,
          #bf0505 100%
        );
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        transform: rotate(-25deg);
        animation: leafFloat 3s ease-in-out infinite;
        filter: drop-shadow(0 2px 6px rgba(246, 158, 2, 0.4));
      }

      @keyframes pageTitleFadeIn {
        0% {
          opacity: 0;
          transform: translateY(40px) translateX(-40px) scale(0.9);
          filter: blur(4px);
        }
        100% {
          opacity: 1;
          transform: translateY(0) translateX(0) scale(1);
          filter: blur(0);
        }
      }

      #page-title {
        position: fixed;
        left: calc(24px + env(safe-area-inset-left, 0px));
        bottom: calc(24px + env(safe-area-inset-bottom, 0px));
        gap: 16px;
        z-index: 1000;
      }

      #hamburger-menu {
        position: fixed;
        top: calc(24px + env(safe-area-inset-top, 0px));
        right: calc(24px + env(safe-area-inset-right, 0px));
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: linear-gradient(145deg, #f5f0ec, #e5dfd9);
        border: 1px solid rgba(0, 0, 0, 0.06);
        color: #000;
        cursor: pointer;
        display: none;
        align-items: center;
        justify-content: center;
        font-size: 1rem;
        transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08),
          0 1px 4px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.9),
          inset 0 -1px 0 rgba(0, 0, 0, 0.03);
        font-family: 'Inter', sans-serif;
        z-index: 1000;
        overflow: hidden;
      }

      #hamburger-menu::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        background: radial-gradient(
          circle,
          rgba(0, 0, 0, 0.08) 0%,
          transparent 70%
        );
        border-radius: 50%;
        transform: translate(-50%, -50%);
        transition: width 0.4s ease, height 0.4s ease;
      }

      #hamburger-menu:hover::before {
        width: 120%;
        height: 120%;
      }

      #hamburger-menu.show {
        display: flex;
        animation: controlPanelFadeIn 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)
          forwards;
      }

      #hamburger-menu:hover {
        transform: translateY(-3px) scale(1.05);
        background: linear-gradient(145deg, #ffffff, #f0ebe7);
        border-color: rgba(0, 0, 0, 0.1);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12),
          0 4px 12px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 1);
      }

      #hamburger-menu:active {
        transform: translateY(-1px) scale(1.02);
      }

      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(12px);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        opacity: 0;
        transition: opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .modal-overlay.show {
        display: flex;
        opacity: 1;
      }

      .modal-container {
        background: linear-gradient(145deg, #f5f0ec, #ede8e4);
        border-radius: 20px;
        width: 90%;
        max-width: 620px;
        max-height: 80vh;
        box-shadow: 0 32px 80px rgba(0, 0, 0, 0.35),
          0 16px 40px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.8);
        transform: scale(0.92) translateY(30px);
        transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.3);
      }

      .modal-overlay.show .modal-container {
        transform: scale(1) translateY(0);
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 28px 32px 18px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.08);
        background: linear-gradient(
          180deg,
          rgba(255, 255, 255, 0.5) 0%,
          transparent 100%
        );
      }

      .modal-title {
        font-family: 'Schoolbell', cursive;
        font-size: 2.1rem;
        color: #000;
        margin: 0;
        letter-spacing: 0.5px;
      }

      .modal-close {
        background: transparent;
        border: none;
        font-size: 1.1rem;
        color: rgba(0, 0, 0, 0.5);
        cursor: pointer;
        padding: 10px;
        border-radius: 50%;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
      }

      .modal-close:hover {
        background: rgba(0, 0, 0, 0.08);
        color: rgba(0, 0, 0, 0.8);
        transform: rotate(90deg);
      }

      .modal-tabs {
        display: flex;
        background: rgba(0, 0, 0, 0.03);
        padding: 0;
        gap: 0;
      }

      .tab-button {
        flex: 1;
        padding: 16px 24px;
        background: none;
        border: none;
        font-family: 'Inter', sans-serif;
        font-size: 0.88rem;
        font-weight: 500;
        color: rgba(0, 0, 0, 0.5);
        cursor: pointer;
        transition: all 0.25s ease;
        border-bottom: 2px solid transparent;
        position: relative;
      }

      .tab-button::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 50%;
        width: 0;
        height: 2px;
        background: #000;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        transform: translateX(-50%);
      }

      .tab-button:hover {
        color: rgba(0, 0, 0, 0.75);
        background: rgba(0, 0, 0, 0.03);
      }

      .tab-button.active {
        color: #000;
        background: linear-gradient(
          180deg,
          transparent 0%,
          rgba(255, 255, 255, 0.5) 100%
        );
      }

      .tab-button.active::after {
        width: 60%;
      }

      .modal-content {
        max-height: 60vh;
        overflow-y: auto;
        padding: 0;
      }

      .tab-content {
        display: none;
        padding: 32px;
        font-family: 'Inter', sans-serif;
        animation: fadeInContent 0.3s ease;
      }

      @keyframes fadeInContent {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .tab-content.active {
        display: block;
      }

      .settings-section {
        margin-bottom: 28px;
        padding: 20px;
        background: linear-gradient(
          145deg,
          rgba(255, 255, 255, 0.5),
          rgba(0, 0, 0, 0.01)
        );
        border-radius: 14px;
        border: 1px solid rgba(0, 0, 0, 0.04);
      }

      .settings-section:last-child {
        margin-bottom: 0;
      }

      .section-title {
        font-family: 'Schoolbell', cursive;
        font-size: 1.35rem;
        color: #000;
        margin: 0 0 16px 0;
        padding-bottom: 12px;
        position: relative;
        display: block;
        border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      }

      .section-title::after {
        content: '';
        position: absolute;
        bottom: -1px;
        left: 0;
        width: 50px;
        height: 2px;
        background: linear-gradient(90deg, rgba(0, 0, 0, 0.4), transparent);
        border-radius: 1px;
      }

      .setting-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px !important;
        border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        font-size: 14px !important;
        transition: background 0.2s ease;
      }

      .setting-item:hover {
        background: rgba(0, 0, 0, 0.02);
        border-radius: 8px;
      }

      .setting-item:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }

      .setting-item label {
        font-weight: 500;
        color: rgba(0, 0, 0, 0.75);
        font-size: 0.9rem;
      }

      .volume-control {
        display: flex;
        align-items: center;
        gap: 14px;
      }

      #volume-slider {
        width: 130px;
        height: 5px;
        background: rgba(0, 0, 0, 0.12);
        border-radius: 4px;
        outline: none;
        -webkit-appearance: none;
        transition: background 0.2s ease;
      }

      #volume-slider:hover {
        background: rgba(0, 0, 0, 0.18);
      }

      #volume-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        background: linear-gradient(145deg, #1a1a1a, #000);
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }

      #volume-slider::-webkit-slider-thumb:hover {
        transform: scale(1.15);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      }

      .volume-value {
        font-size: 0.82rem;
        color: rgba(0, 0, 0, 0.5);
        min-width: 38px;
        font-weight: 500;
        font-variant-numeric: tabular-nums;
      }

      .custom-select {
        position: relative;
        display: inline-block;
      }

      .custom-select select {
        padding: 10px 36px 10px 14px;
        border: 1px solid rgba(0, 0, 0, 0.12);
        border-radius: 10px;
        background: linear-gradient(145deg, #ffffff, #f5f0ec);
        font-family: 'Inter', sans-serif;
        font-size: 0.88rem;
        cursor: pointer;
        appearance: none;
        -webkit-appearance: none;
        -moz-appearance: none;
        min-width: 130px;
        transition: all 0.25s ease;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
      }

      .custom-select select:hover {
        border-color: rgba(0, 0, 0, 0.25);
        background: linear-gradient(145deg, #ffffff, #f8f4f0);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      }

      .custom-select select:focus {
        outline: none;
        border-color: rgba(0, 0, 0, 0.4);
        box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.08);
      }

      .custom-select::after {
        content: '▼';
        position: absolute;
        top: 50%;
        right: 14px;
        transform: translateY(-50%);
        pointer-events: none;
        color: rgba(0, 0, 0, 0.4);
        font-size: 0.65rem;
        transition: transform 0.2s ease;
      }

      .custom-select:hover::after {
        transform: translateY(-50%) scale(1.1);
      }

      .preset-description {
        margin-top: 16px;
        padding: 14px 16px;
        background: linear-gradient(
          145deg,
          rgba(0, 0, 0, 0.03),
          rgba(0, 0, 0, 0.01)
        );
        border-radius: 10px;
        border: 1px solid rgba(0, 0, 0, 0.05);
      }

      .preset-info {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .preset-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: rgba(0, 0, 0, 0.5);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .preset-details {
        font-size: 0.85rem;
        color: rgba(0, 0, 0, 0.65);
        line-height: 1.5;
      }

      .custom-graphics-options {
        display: none;
        margin-top: 20px;
        padding: 18px;
        background: linear-gradient(
          145deg,
          rgba(0, 0, 0, 0.02),
          rgba(0, 0, 0, 0.01)
        );
        border-radius: 12px;
        border: 1px solid rgba(0, 0, 0, 0.06);
        gap: 18px;
        flex-direction: column;
      }

      .custom-graphics-options.show {
        display: flex;
        animation: slideDown 0.3s ease;
      }

      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .custom-option {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .custom-option-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .custom-option-header label {
        font-size: 0.85rem;
        font-weight: 500;
        color: rgba(0, 0, 0, 0.75);
      }

      .custom-option-value {
        font-size: 0.8rem;
        font-weight: 600;
        color: rgba(0, 0, 0, 0.6);
        font-variant-numeric: tabular-nums;
        min-width: 60px;
        text-align: right;
      }

      .custom-slider {
        width: 100%;
        height: 6px;
        background: rgba(0, 0, 0, 0.1);
        border-radius: 4px;
        outline: none;
        -webkit-appearance: none;
        transition: background 0.2s ease;
      }

      .custom-slider:hover {
        background: rgba(0, 0, 0, 0.15);
      }

      .custom-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        background: linear-gradient(145deg, #1a1a1a, #000);
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }

      .custom-slider::-webkit-slider-thumb:hover {
        transform: scale(1.1);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      }

      .custom-option-range {
        display: flex;
        justify-content: space-between;
        font-size: 0.7rem;
        color: rgba(0, 0, 0, 0.4);
      }

      .custom-option .custom-select {
        width: 100%;
      }

      .custom-option .custom-select select {
        width: 100%;
      }

      .custom-option .toggle-switch {
        align-self: flex-start;
      }

      .toggle-switch {
        position: relative;
        width: 52px;
        height: 28px;
      }

      .toggle-switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }

      .toggle-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.15);
        transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: 28px;
      }

      .toggle-slider:before {
        position: absolute;
        content: '';
        height: 22px;
        width: 22px;
        left: 3px;
        bottom: 3px;
        background: linear-gradient(145deg, #ffffff, #f0f0f0);
        transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
      }

      input:checked + .toggle-slider {
        background: linear-gradient(145deg, #1a1a1a, #000);
      }

      input:checked + .toggle-slider:before {
        transform: translateX(24px);
      }

      .about-section {
        line-height: 1.7;
      }

      .about-text {
        color: rgba(0, 0, 0, 0.65);
        margin-bottom: 22px;
        font-size: 0.92rem;
      }

      .about-text a {
        color: #2563eb;
        text-decoration: none;
        border-bottom: 1px solid transparent;
        transition: all 0.25s ease;
        font-weight: 500;
      }

      .about-text a:hover {
        color: #1d4ed8;
        border-bottom-color: #1d4ed8;
      }

      .subsection-title {
        font-family: 'Schoolbell', cursive;
        font-size: 1.05rem;
        color: #000;
        margin: 18px 0 10px 0;
        font-weight: 600;
      }

      .tech-title {
        font-family: 'Schoolbell', cursive;
        font-size: 1.25rem;
        color: #000;
        margin: 28px 0 14px 0;
        position: relative;
        display: inline-block;
      }

      .tech-title::before {
        content: '';
        position: absolute;
        left: -12px;
        top: 50%;
        transform: translateY(-50%);
        width: 4px;
        height: 70%;
        background: linear-gradient(
          180deg,
          rgba(0, 0, 0, 0.6),
          rgba(0, 0, 0, 0.2)
        );
        border-radius: 2px;
      }

      .tech-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        gap: 10px;
        margin-bottom: 24px;
      }

      .tech-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        background: linear-gradient(
          145deg,
          rgba(255, 255, 255, 0.6),
          rgba(0, 0, 0, 0.02)
        );
        border-radius: 10px;
        font-size: 0.82rem;
        color: rgba(0, 0, 0, 0.7);
        border: 1px solid rgba(0, 0, 0, 0.04);
        transition: all 0.25s ease;
      }

      .tech-item:hover {
        background: linear-gradient(
          145deg,
          rgba(255, 255, 255, 0.9),
          rgba(0, 0, 0, 0.03)
        );
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
      }

      .tech-item i {
        font-size: 1rem;
        color: rgba(0, 0, 0, 0.55);
      }

      .feature-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .feature-list li {
        padding: 8px 0;
        color: rgba(0, 0, 0, 0.65);
        font-size: 0.88rem;
        position: relative;
        padding-left: 22px;
        transition: color 0.2s ease;
      }

      .feature-list li:hover {
        color: rgba(0, 0, 0, 0.85);
      }

      .feature-list li:before {
        content: '';
        width: 6px;
        height: 6px;
        background: linear-gradient(
          135deg,
          rgba(0, 0, 0, 0.4),
          rgba(0, 0, 0, 0.2)
        );
        border-radius: 50%;
        position: absolute;
        left: 0;
        top: 14px;
      }

      .credits-section {
        line-height: 1.7;
      }

      .credit-category {
        margin-bottom: 28px;
        padding: 18px 20px;
        background: linear-gradient(
          145deg,
          rgba(255, 255, 255, 0.5),
          rgba(0, 0, 0, 0.01)
        );
        border-radius: 12px;
        border-left: 3px solid rgba(0, 0, 0, 0.15);
        transition: all 0.25s ease;
      }

      .credit-category:hover {
        background: linear-gradient(
          145deg,
          rgba(255, 255, 255, 0.7),
          rgba(0, 0, 0, 0.02)
        );
        border-left-color: rgba(0, 0, 0, 0.3);
      }

      .credit-title {
        font-family: 'Schoolbell', cursive;
        font-size: 1.25rem;
        color: #000;
        margin: 0 0 14px 0;
        padding-bottom: 10px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      }

      .credit-item {
        padding: 10px 0;
        color: rgba(0, 0, 0, 0.65);
        font-size: 0.88rem;
        line-height: 1.6;
        border-bottom: 1px solid rgba(0, 0, 0, 0.04);
        transition: color 0.2s ease;
      }

      .credit-item:hover {
        color: rgba(0, 0, 0, 0.85);
      }

      .credit-item:last-child {
        border-bottom: none;
      }

      .credit-item strong {
        color: rgba(0, 0, 0, 0.85);
        font-weight: 600;
      }

      .credit-item a {
        color: #2563eb;
        text-decoration: none;
        border-bottom: 1px solid transparent;
        transition: all 0.25s ease;
      }

      .credit-item a:hover {
        color: #1d4ed8;
        border-bottom-color: #1d4ed8;
      }

      .version-info {
        text-align: center;
        margin-top: 36px;
        padding-top: 28px;
        border-top: 1px solid rgba(0, 0, 0, 0.08);
        color: rgba(0, 0, 0, 0.4);
        font-size: 0.82rem;
        letter-spacing: 0.3px;
      }

      .modal-content::-webkit-scrollbar {
        width: 8px;
      }

      .modal-content::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.04);
        border-radius: 4px;
      }

      .modal-content::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
        transition: background 0.2s ease;
      }

      .modal-content::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 0, 0, 0.35);
      }

      @media (max-width: 768px) {
        .loader-title {
          font-size: 2.6rem;
        }

        .loader-progress {
          width: 280px;
        }

        .explore-buttons {
          flex-direction: column;
          gap: 12px;
          width: 50%;
        }

        .explore-button {
          width: 100%;
          justify-content: center;
          padding: 14px 24px;
        }

        #control-panel {
          gap: 16px;
        }

        #daynight-toggle,
        #season-menu {
          padding: 6px;
          gap: 4px;
        }

        .daynight-button,
        .season-button {
          width: 30px;
          height: 30px;
          font-size: 0.9rem;
        }

        #music-control {
          width: 44px;
          height: 44px;
        }

        #page-title {
          font-size: 2.2rem;
          left: calc(24px + env(safe-area-inset-left, 0px));
          bottom: calc(24px + env(safe-area-inset-bottom, 0px));
        }

        .modal-container {
          width: 95%;
          max-height: 85vh;
          border-radius: 16px;
        }

        .modal-header {
          padding: 20px 24px 12px;
        }

        .modal-title {
          font-size: 1.6rem;
        }

        .tab-content {
          padding: 24px 20px;
        }

        .tech-grid {
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
        }

        .setting-item {
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
          padding: 14px !important;
        }

        .setting-item:hover {
          margin: 0;
        }

        .setting-item label {
          font-size: 0.92rem;
          font-weight: 600;
          color: rgba(0, 0, 0, 0.8);
        }

        .settings-section {
          padding: 16px;
          margin-bottom: 20px;
        }

        .section-title {
          font-size: 1.25rem;
          margin-bottom: 14px;
          padding-bottom: 10px;
        }

        .volume-control {
          width: 100%;
          justify-content: space-between;
        }

        #volume-slider {
          flex: 1;
          max-width: none;
          width: 100%;
        }

        .custom-select {
          width: 100%;
        }

        .custom-select select {
          width: 100%;
          min-width: unset;
        }

        .preset-description {
          margin-top: 14px;
          padding: 12px 14px;
        }

        .preset-details {
          font-size: 0.82rem;
        }

        .custom-graphics-options {
          margin-top: 16px;
          padding: 14px;
          gap: 16px;
        }

        .custom-option-header label {
          font-size: 0.82rem;
        }

        .custom-option-value {
          font-size: 0.78rem;
        }

        .credit-category {
          padding: 14px 16px;
        }

        .about-text,
        .credit-item {
          font-size: 0.85rem;
        }

        .feature-list li {
          font-size: 0.85rem;
        }
      }

      @media (max-width: 480px) {
        .loader-title {
          font-size: 2.1rem;
          padding: 0 20px;
        }

        .loader-title .fa-square {
          font-size: 0.5em;
          left: -0.6em;
        }

        .loader-progress {
          width: 240px;
        }

        .loader-text {
          font-size: 0.78rem;
          padding: 0 24px;
        }

        .explore-buttons {
          width: 85%;
          max-width: 280px;
        }

        .explore-button {
          padding: 13px 20px;
          font-size: 0.82rem;
          border-radius: 10px;
        }

        #hamburger-menu {
          top: calc(12px + env(safe-area-inset-top, 0px));
          right: calc(12px + env(safe-area-inset-right, 0px));
          width: 40px;
          height: 40px;
          font-size: 0.9rem;
        }

        #control-panel {
          gap: 10px;
        }

        #daynight-toggle,
        #season-menu {
          padding: 5px;
          gap: 3px;
          border-radius: 22px;
        }

        .daynight-button,
        .season-button {
          width: 28px;
          height: 28px;
          font-size: 0.85rem;
        }

        .daynight-button.active,
        .season-button.active {
          transform: scale(1.08);
        }

        #music-control {
          width: 40px;
          height: 40px;
          font-size: 0.9rem;
        }

        #page-title {
          font-size: 1.8rem;
          left: calc(12px + env(safe-area-inset-left, 0px));
          bottom: calc(12px + env(safe-area-inset-bottom, 0px));
        }

        #page-title .fa-square {
          font-size: 0.5em;
        }

        .modal-container {
          width: 96%;
          max-height: 88vh;
          border-radius: 14px;
        }

        .modal-header {
          padding: 16px 18px 10px;
        }

        .modal-title {
          font-size: 1.4rem;
        }

        .modal-close {
          width: 36px;
          height: 36px;
        }

        .modal-tabs {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .tab-button {
          padding: 12px 14px;
          font-size: 0.82rem;
          white-space: nowrap;
        }

        .tab-content {
          padding: 18px 16px;
        }

        .section-title {
          font-size: 1.15rem;
          margin-bottom: 12px;
          padding-bottom: 8px;
        }

        .settings-section {
          padding: 14px;
          margin-bottom: 16px;
          border-radius: 12px;
        }

        .setting-item {
          padding: 12px 0;
          gap: 10px;
        }

        .setting-item label {
          font-size: 0.88rem;
        }

        #volume-slider {
          height: 6px;
        }

        #volume-slider::-webkit-slider-thumb {
          width: 20px;
          height: 20px;
        }

        .volume-value {
          font-size: 0.85rem;
          min-width: 42px;
        }

        .tech-title {
          font-size: 1.1rem;
          margin: 20px 0 12px 0;
        }

        .tech-grid {
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        .tech-item {
          padding: 8px 10px;
          font-size: 0.78rem;
        }

        .custom-select select {
          min-width: 100%;
          font-size: 0.85rem;
        }

        .preset-description {
          margin-top: 12px;
          padding: 10px 12px;
        }

        .preset-label {
          font-size: 0.7rem;
        }

        .preset-details {
          font-size: 0.78rem;
        }

        .custom-graphics-options {
          margin-top: 14px;
          padding: 12px;
          gap: 14px;
        }

        .custom-option-header label {
          font-size: 0.8rem;
        }

        .custom-option-value {
          font-size: 0.75rem;
        }

        .custom-slider {
          height: 8px;
        }

        .custom-slider::-webkit-slider-thumb {
          width: 20px;
          height: 20px;
        }

        .custom-option-range {
          font-size: 0.65rem;
        }

        .credit-category {
          padding: 12px 14px;
          margin-bottom: 20px;
        }

        .credit-title {
          font-size: 1.1rem;
        }

        .about-text {
          font-size: 0.82rem;
          margin-bottom: 18px;
        }

        .credit-item {
          font-size: 0.82rem;
          padding: 8px 0;
        }

        .feature-list li {
          font-size: 0.82rem;
          padding-left: 18px;
        }

        .version-info {
          font-size: 0.78rem;
          margin-top: 24px;
          padding-top: 20px;
        }

        .lightning-btn-wrapper {
          width: 40px;
          height: 40px;
        }

        .lightning-btn {
          width: 40px;
          height: 40px;
          font-size: 0.95rem;
        }

        .electric-arcs {
          width: 40px;
          height: 40px;
        }

        .arc {
          top: -6px;
          left: -5px;
          width: 48px;
          height: 48px;
        }
      }

      @media (max-width: 360px) {
        .loader-title {
          font-size: 1.8rem;
        }

        .loader-progress {
          width: 200px;
        }

        .explore-buttons {
          width: 90%;
        }

        .explore-button {
          padding: 12px 16px;
          font-size: 0.8rem;
          gap: 8px;
        }

        #page-title {
          font-size: 1.5rem;
        }

        .modal-container {
          width: 98%;
          border-radius: 12px;
        }

        .tab-button {
          padding: 10px 12px;
          font-size: 0.78rem;
        }

        .tab-content {
          padding: 14px 12px;
        }

        .settings-section {
          padding: 12px;
          margin-bottom: 14px;
          border-radius: 10px;
        }

        .section-title {
          font-size: 1.05rem;
          margin-bottom: 10px;
        }

        .setting-item {
          padding: 10px 0;
          gap: 8px;
        }

        .setting-item label {
          font-size: 0.85rem;
        }

        .volume-value {
          font-size: 0.82rem;
        }

        .tech-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-height: 500px) and (orientation: landscape) {
        #loader {
          gap: 16px;
        }

        .loader-title {
          font-size: 2rem;
        }

        .loader-progress {
          width: 300px;
        }

        .explore-buttons {
          flex-direction: row;
          gap: 12px;
        }

        .explore-button {
          width: auto;
          padding: 10px 20px;
        }

        .modal-container {
          max-height: 95vh;
        }

        .modal-content {
          max-height: 50vh;
        }

        #control-panel {
          flex-direction: row;
          top: auto;
        }

        #page-title {
          left: calc(24px + env(safe-area-inset-left, 0px));
          bottom: calc(24px + env(safe-area-inset-bottom, 0px));
          font-size: 3.6vw;
        }

        #daynight-toggle,
        #season-menu {
          flex-direction: row;
        }
      }


      /* Tool-station integration override:
         hide the original lower-left page title while preserving its DOM node
         because the original runtime references #page-title. */
      #page-title {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
    `;
const ORIGINAL_BODY_HTML = String.raw`<div id="app"></div>
    <canvas id="three"></canvas>

    <!-- Shader Reveal Overlay -->
    <canvas id="shader-overlay"></canvas>

    <!-- Hamburger Menu Button -->
    <button id="hamburger-menu" title="Settings">
      <i class="fas fa-bars"></i>
    </button>

    <!-- Right Side Control Panel -->
    <div id="control-panel">
      <!-- Day/Night Toggle -->
      <div id="daynight-toggle">
        <button class="daynight-button active day" data-time="day" title="Day">
          <i class="fas fa-sun"></i>
        </button>
        <button class="daynight-button night" data-time="night" title="Night">
          <i class="fas fa-moon"></i>
        </button>
      </div>

      <!-- Season Toggle Menu -->
      <div id="season-menu">
        <button
          class="season-button active spring"
          data-season="spring"
          title="Spring"
        >
          <i class="fas fa-seedling"></i>
        </button>
        <button
          class="season-button autumn"
          data-season="autumn"
          title="Autumn"
        >
          <i class="fa-brands fa-canadian-maple-leaf"></i>
        </button>
        <button
          class="season-button winter"
          data-season="winter"
          title="Winter"
        >
          <i class="fas fa-snowflake"></i>
        </button>
        <button class="season-button rain" data-season="rain" title="Rain">
          <i class="fas fa-cloud-rain"></i>
        </button>
      </div>

      <!-- Music Control Button -->
      <button id="music-control" title="Toggle Music">
        <i class="fas fa-music"></i>
      </button>
    </div>

    <div id="page-title">
      <i class="fa-regular fa-square"></i>Elemental Serenity
    </div>

    <!-- Settings Modal -->
    <div id="settings-modal" class="modal-overlay">
      <div class="modal-container">
        <div class="modal-header">
          <h2 class="modal-title">Settings</h2>
          <button class="modal-close" id="modal-close">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="modal-tabs">
          <button class="tab-button active" data-tab="settings">
            Settings
          </button>
          <button class="tab-button" data-tab="about">About</button>
          <button class="tab-button" data-tab="credits">Credits</button>
        </div>

        <div class="modal-content">
          <!-- Settings Tab -->
          <div class="tab-content active" id="settings-tab">
            <div class="settings-section">
              <h3 class="section-title">Audio Settings</h3>
              <div class="setting-item">
                <label for="volume-slider">Master Volume</label>
                <div class="volume-control">
                  <input
                    type="range"
                    id="volume-slider"
                    min="0"
                    max="100"
                    value="50"
                  />
                  <span class="volume-value">50%</span>
                </div>
              </div>
            </div>

            <div class="settings-section">
              <h3 class="section-title">Graphics Settings</h3>
              <div class="setting-item">
                <label for="graphics-quality">Quality Preset</label>
                <div class="custom-select">
                  <select id="graphics-quality">
                    <option value="low">Low</option>
                    <option value="medium" selected>Medium</option>
                    <option value="high">High</option>
                    <option value="ultra">Ultra</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>
              <div class="preset-description" id="preset-description">
                <div class="preset-info">
                  <span class="preset-label">Affects:</span>
                  <span class="preset-details" id="preset-details"
                    >Grass density, particle effects, shadow quality, and pixel
                    ratio</span
                  >
                </div>
              </div>

              <!-- Custom Graphics Options (hidden by default) -->
              <div class="custom-graphics-options" id="custom-graphics-options">
                <div class="custom-option">
                  <div class="custom-option-header">
                    <label for="grass-density">Grass Density</label>
                    <span class="custom-option-value" id="grass-density-value"
                      >12,500</span
                    >
                  </div>
                  <input
                    type="range"
                    id="grass-density"
                    min="5000"
                    max="100000"
                    step="5000"
                    value="12500"
                    class="custom-slider"
                  />
                  <div class="custom-option-range">
                    <span>5K</span>
                    <span>100K</span>
                  </div>
                </div>

                <div class="custom-option">
                  <div class="custom-option-header">
                    <label for="particle-density">Fire Particles</label>
                    <span
                      class="custom-option-value"
                      id="particle-density-value"
                      >500</span
                    >
                  </div>
                  <input
                    type="range"
                    id="particle-density"
                    min="200"
                    max="1200"
                    step="50"
                    value="500"
                    class="custom-slider"
                  />
                  <div class="custom-option-range">
                    <span>200</span>
                    <span>1200</span>
                  </div>
                </div>

                <div class="custom-option">
                  <div class="custom-option-header">
                    <label for="shadow-quality">Shadow Quality</label>
                    <span class="custom-option-value" id="shadow-quality-value"
                      >Standard</span
                    >
                  </div>
                  <div class="custom-select">
                    <select id="shadow-quality">
                      <option value="BasicShadowMap">Basic</option>
                      <option value="PCFShadowMap" selected>Standard</option>
                      <option value="PCFSoftShadowMap">Soft</option>
                    </select>
                  </div>
                </div>

                <div class="custom-option">
                  <div class="custom-option-header">
                    <label for="pixel-ratio">Pixel Ratio Cap</label>
                    <span class="custom-option-value" id="pixel-ratio-value"
                      >2x</span
                    >
                  </div>
                  <input
                    type="range"
                    id="pixel-ratio"
                    min="1"
                    max="4"
                    step="0.5"
                    value="2"
                    class="custom-slider"
                  />
                  <div class="custom-option-range">
                    <span>1x</span>
                    <span>4x</span>
                  </div>
                </div>

                <div class="custom-option">
                  <div class="custom-option-header">
                    <label for="antialias-toggle">Antialiasing</label>
                  </div>
                  <label class="toggle-switch">
                    <input type="checkbox" id="antialias-toggle" />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- About Tab -->
          <div class="tab-content" id="about-tab">
            <div class="about-section">
              <h3 class="section-title">
                Building <em>Elemental Serenity</em>
              </h3>

              <div
                style="
                  text-align: left;
                  margin-bottom: 24px;
                  padding: 16px;
                  background: rgba(0, 0, 0, 0.02);
                  border-radius: 8px;
                  border-left: 3px solid #2563eb;
                "
              >
                <p
                  style="
                    margin: 0;
                    font-size: 0.95rem;
                    color: rgba(0, 0, 0, 0.7);
                  "
                >
                  <strong
                    ><i class="fa-brands fa-github" style="font-size: 18px"></i
                  ></strong>
                  <a
                    href="https://github.com/SahilK-027/Elemental-Serenity"
                    target="_blank"
                    style="
                      color: #2563eb;
                      text-decoration: none;
                      font-weight: 600;
                    "
                  >
                    https://github.com/SahilK-027/Elemental-Serenity
                  </a>
                </p>
              </div>

              <p class="about-text">
                What started as a weekend experiment to render a calm, digital
                glade turned into a months-long exercise in pushing WebGL 2.0
                and Three.js to their limits. I wanted an environment that felt
                <em>alive,</em> not just pretty-looking, but responsive,
                season-aware, and fast enough to run on a mid-range laptop.
                Below is the short version of that journey: the problems that
                kept me up at night, the solutions that actually worked, and the
                few hard lessons I carried into every subsystem.
              </p>

              <h4 class="tech-title">Inspiration & Creative Direction</h4>
              <p class="about-text">
                The original spark for <em>Elemental Serenity</em> came from
                watching <strong>Bruno Simon's portfolio devlogs</strong> (<a
                  href="https://youtu.be/MXpML0B2MJc?si=rePA5w2j7CL7Jm9s"
                  target="_blank"
                  >https://youtu.be/MXpML0B2MJc?si=rePA5w2j7CL7Jm9s</a
                >), specifically his breakdowns of how a playful, interactive 3D
                experience can still be technically rigorous. Seeing how he
                approached world-building in the browser reframed how I thought
                about WebGL projects: not as static demos, but as
                <em>places</em> users can explore. His emphasis on
                performance-aware creativity pushed me to treat every visual
                decision as an engineering problem waiting to be solved.
              </p>
              <p class="about-text">
                At the same time, <strong>Jordan Breton's portfolio</strong> (<a
                  href="https://jordan-breton.com/"
                  target="_blank"
                  >https://jordan-breton.com/</a
                >) heavily influenced the overall mood and restraint of the
                scene. Where Bruno's work inspired interactivity and technical
                ambition, Jordan's reminded me of the power of atmosphere,
                subtle motion, carefully chosen colour palettes, and
                environments that feel intentional rather than busy. That
                balance between expressiveness and calm became a guiding
                principle throughout the project.
              </p>

              <h4 class="tech-title">The Stack (Why These Tools)</h4>
              <p class="about-text">
                I intentionally kept the tech simple but modern:
              </p>
              <ul class="feature-list">
                <li>
                  <strong>Three.js 0.182</strong> on top of
                  <strong>WebGL 2.0</strong> for lower-level control.
                </li>
                <li>
                  Custom <strong>GLSL</strong> for the parts where CPU-driven
                  tricks just wouldn't cut it.
                </li>
                <li>
                  <strong>GSAP 3.14</strong> for smooth orchestration of UI and
                  seasonal transitions.
                </li>
                <li>
                  <strong>Vite 6.0</strong> + ES6 modules for a snappy dev loop.
                </li>
                <li>
                  <code>vite-plugin-glsl</code> — absolute game changer for
                  shader hot-reload.
                </li>
              </ul>
              <p class="about-text">
                These choices gave me quick iteration during development while
                allowing me to drop into GLSL when performance mattered.
              </p>

              <h4 class="tech-title">
                The Grass Problem Was My Biggest Challenge
              </h4>
              <p class="about-text">
                I wanted thousands of grass blades that bend and whisper in the
                wind. Naively creating tens of thousands of separate meshes was
                an instant FPS death sentence. The goal became:
                <em
                  >how do I keep visual richness with minimal geometry and GPU
                  overhead?</em
                >
              </p>

              <h5 class="subsection-title">What I tried</h5>
              <ul class="feature-list">
                <li>
                  <strong>Instanced rendering</strong>: share a single blade
                  geometry and provide per-instance transforms. This is
                  standard, but it alone doesn't solve density control or varied
                  wind behaviour.
                </li>
                <li>
                  <strong>Billboards</strong>: keep each blade as a
                  camera-facing quad to dramatically reduce vertex counts.
                </li>
              </ul>

              <h5 class="subsection-title">The solution that stuck</h5>
              <ol class="feature-list">
                <li>
                  <strong>Instanced quads + billboard rotation.</strong> Each
                  grass blade is an instanced quad that rotates in the vertex
                  shader to face the camera. This alone reduced the vertex count
                  by orders of magnitude.
                </li>
                <li>
                  <strong>RGB control texture:</strong> a single texture packed
                  with control channels:
                  <ul style="margin-left: 20px; margin-top: 8px">
                    <li>
                      <strong>R</strong> = path mask (0 = path, 1 = dense grass)
                    </li>
                    <li><strong>G</strong> = thickness/scale variation</li>
                    <li>
                      <strong>B</strong> = wind intensity map (used to bias
                      per-instance wind strength)
                    </li>
                  </ul>
                  This texture lets me paint where grass should be sparse
                  (paths), where it should be thick, and where it should sway
                  wildly.
                </li>
                <li>
                  <strong>GPU wind physics in GLSL</strong> — per-instance
                  attributes for base offset + a per-pixel wind strength sampled
                  from the B channel; everything runs in the vertex shader, so
                  the CPU only updates when instances are added/removed.
                </li>
                <li>
                  <strong>LOD + quality presets</strong> — for
                  Low/Medium/High/Ultra I dynamically reduce instance count,
                  billboard complexity, and particle emissions.
                </li>
              </ol>

              <h4 class="tech-title">Seasons — 8 Worlds in One</h4>
              <p class="about-text">
                I didn't want a single color toggle. I wanted completely
                different moods.
              </p>
              <ul class="feature-list">
                <li>
                  <strong>Design</strong>: 4 seasons × 2 times of day = 8 full
                  palettes. Every material, grass, rock, water, fire, and smoke
                  responds.
                </li>
                <li>
                  <strong>Implementation</strong>: a single
                  <code>SeasonManager</code> singleton broadcasts events and
                  exposes a small set of uniforms every shader subscribes to
                  (palette colors, shadow tint, water reflectance, smoke
                  opacity).
                </li>
                <li>
                  <strong>Performance trick</strong>: shaders receive a compact,
                  precomputed palette (vec3 arrays + single floats). The heavy
                  interpolation happens once in JS when switching seasons;
                  shaders simply lerp between two provided palettes based on
                  <code>u_seasonBlend</code>.
                </li>
              </ul>
              <p class="about-text">
                The result is smooth, event-driven transitions with zero frame
                drops even on large scenes.
              </p>

              <h4 class="tech-title">Audio — Making Proximity Feel Real</h4>
              <p class="about-text">
                Visuals were only half the immersion. Sound had to be reactive,
                not just background music.
              </p>
              <ul class="feature-list">
                <li><strong>Web Audio API</strong> drives the system.</li>
                <li>
                  An <code>AmbientSoundManager</code> controls both
                  <strong>spatialized sounds</strong> (bird pings, crackling
                  fire) and <strong>ambience tracks</strong> (wind, brook,
                  seasonal pads).
                </li>
                <li>
                  <strong>Distance-based falloff</strong> and
                  <strong>smart mixing</strong> prevent CPU spikes (don't decode
                  or play inaudible sounds).
                </li>
                <li>
                  Crossfading between tracks and season-aware mixes keeps the
                  audio design cohesive.
                </li>
              </ul>
              <p class="about-text">
                This was deceptively tricky: poorly handled crossfades or too
                many simultaneous sound nodes easily produce audible artefacts
                or memory leaks, so lifecycle management was critical.
              </p>

              <h4 class="tech-title">
                Architecture Decisions That Actually Saved Time
              </h4>
              <p class="about-text">
                A few engineering choices repeatedly paid dividends:
              </p>
              <ul class="feature-list">
                <li>
                  <strong>Event-driven design</strong>: a lightweight
                  <code>EventEmitter</code> allowed decoupled components to
                  react to seasonal or quality changes without washing the scene
                  with polling logic.
                </li>
                <li>
                  <strong>Singleton SeasonManager & AudioManager</strong>: one
                  source of truth is easier to reason about than dozens of
                  semi-consistent objects.
                </li>
                <li>
                  <strong>vite-plugin-glsl</strong>: shader hot-reload made
                  iterating GLSL feel almost as fast as tweaking CSS in a web
                  app.
                </li>
                <li>
                  <strong>Quality presets</strong>: Low/Medium/High/Ultra mapped
                  to concrete parameters (grass density, particle rates, shadow
                  resolution). Users could persist settings in
                  <code>localStorage</code>.
                </li>
                <li>
                  <strong>Perf tooling</strong>: embedded three-perf for FPS
                  tracking while tuning the grass system and particles.
                </li>
              </ul>

              <h4 class="tech-title">
                Memory Management Is the Thing I Learned the Hard Way
              </h4>
              <p class="about-text">
                WebGL resources are explicit. I ran into crashes and VRAM leaks
                until I audited the cleanup.
              </p>
              <ul class="feature-list">
                <li>
                  Always call <code>.dispose()</code> on geometries, materials,
                  and textures when removed.
                </li>
                <li>
                  Remove event listeners and stop audio nodes on scene teardown.
                </li>
                <li>
                  Keep visible object lists small and reuse buffers when
                  possible (object pools for particles and temporary meshes).
                </li>
              </ul>
              <p class="about-text">
                After enforcing strict cleanup patterns, stability improved
                dramatically, especially on devices with constrained memory.
              </p>

              <h4 class="tech-title">Tradeoffs & Lessons Learned</h4>
              <ul class="feature-list">
                <li>
                  <strong>Complex GLSL > simple CPU logic</strong>: doing wind
                  and billboarding in the vertex shader saved CPU time but
                  shifted complexity into shader code. Worth it for performance,
                  but harder to debug.
                </li>
                <li>
                  <strong>Billboards are cheap, but not always right</strong>:
                  they work brilliantly for grass and distant foliage but fall
                  short at close range. I mixed instance billboards with a few
                  full meshes near the camera.
                </li>
                <li>
                  <strong>Start profiling early</strong>: three-perf and simple
                  bench scenes let me measure the real effect of changes.
                  Guessing is expensive.
                </li>
                <li>
                  <strong>One true source of state</strong> (singletons/event
                  bus) simplifies seasonal transitions, and settings sync across
                  systems.
                </li>
                <li>
                  <strong>User-configurable quality</strong> matters: letting
                  users scale down particle counts and shadow resolution kept
                  the experience accessible.
                </li>
              </ul>

              <h4 class="tech-title">Closing Notes</h4>
              <p class="about-text">
                This project was equal parts art and systems engineering. The
                biggest wins came from moving logic onto the GPU (instancing,
                wind, particles), centralising state (SeasonManager), and being
                ruthless about cleanup. If you want to poke around the code,
                focus on the instanced grass shader and the event-driven
                SeasonManager; they're the heart of the system.
              </p>
            </div>
          </div>

          <!-- Credits Tab -->
          <div class="tab-content" id="credits-tab">
            <div class="credits-section">
              <h3 class="section-title">Credits & Resources</h3>

              <div class="credit-category">
                <h4 class="credit-title">Models</h4>
                <div class="credit-item">
                  <strong>"A simple medieval wooden bridge"</strong> (<a
                    href="https://skfb.ly/oE6UI"
                    target="_blank"
                    >https://skfb.ly/oE6UI</a
                  >) by FunWithBlender is licensed under Creative Commons
                  Attribution-NonCommercial (<a
                    href="http://creativecommons.org/licenses/by-nc/4.0/"
                    target="_blank"
                    >http://creativecommons.org/licenses/by-nc/4.0/</a
                  >).
                </div>
                <div class="credit-item">
                  <strong>"Stylized Tent"</strong> (<a
                    href="https://skfb.ly/6YSvM"
                    target="_blank"
                    >https://skfb.ly/6YSvM</a
                  >) by csabat3D is licensed under Creative Commons Attribution
                  (<a
                    href="http://creativecommons.org/licenses/by/4.0/"
                    target="_blank"
                    >http://creativecommons.org/licenses/by/4.0/</a
                  >).
                </div>
                <div class="credit-item">
                  <strong>Tree trunks and some sound effects:</strong>
                  <a href="https://bruno-simon.com/" target="_blank"
                    >https://bruno-simon.com/</a
                  >
                </div>
              </div>

              <div class="credit-category">
                <h4 class="credit-title">Environment & Textures</h4>
                <div class="credit-item">
                  <strong>Environment map:</strong>
                  "citrus_orchard_road_puresky_4k.hdr" from
                  <a href="https://polyhaven.com" target="_blank">Polyhaven</a>
                </div>
              </div>

              <div class="credit-category">
                <h4 class="credit-title">Music and Audio</h4>
                <div class="credit-item">
                  <strong>BGM:</strong>
                  <a href="https://suno.com" target="_blank">suno.com</a> - Suno
                  AI music
                </div>
                <div class="credit-item">
                  <strong>Additional audio resources:</strong>
                  <a href="https://brunosimon.com/" target="_blank"
                    >https://brunosimon.com/</a
                  >
                </div>
              </div>

              <div class="credit-category">
                <h4 class="credit-title">Tools and Resources</h4>
                <div class="credit-item">
                  <a href="https://threejs-journey.com/" target="_blank"
                    >https://threejs-journey.com/</a
                  >
                </div>
                <div class="credit-item">
                  <a href="https://simondev.io/" target="_blank"
                    >https://simondev.io/</a
                  >
                </div>
                <div class="credit-item">
                  <a href="https://blog.maximeheckel.com/" target="_blank"
                    >https://blog.maximeheckel.com/</a
                  >
                </div>
                <div class="credit-item">
                  <a
                    href="https://youtu.be/M4kMri55rdE?si=sgcrKVit2EzGozD2"
                    target="_blank"
                    >https://youtu.be/M4kMri55rdE?si=sgcrKVit2EzGozD2</a
                  >
                </div>
                <div class="credit-item">
                  <a
                    href="https://youtu.be/F7_btP0Vhzo?si=fymP2M4GQUD-6aqS"
                    target="_blank"
                    >https://youtu.be/F7_btP0Vhzo?si=fymP2M4GQUD-6aqS</a
                  >
                </div>
                <div class="credit-item">
                  <a
                    href="https://tympanus.net/codrops/2024/12/02/how-to-code-a-shader-based-reveal-effect-with-react-three-fiber-glsl/"
                    target="_blank"
                    >Shader-based reveal effect tutorial - Codrops</a
                  >
                </div>
                <div class="credit-item">
                  <a
                    href="https://tympanus.net/codrops/2025/02/04/how-to-make-the-fluffiest-grass-with-three-js/"
                    target="_blank"
                    >Fluffy grass with Three.js tutorial - Codrops</a
                  >
                </div>
                <div class="credit-item">
                  <a
                    href="https://github.com/AT010303/StylizedTree"
                    target="_blank"
                    >https://github.com/AT010303/StylizedTree</a
                  >
                </div>
                <div class="credit-item">
                  <a href="https://www.blender.org/" target="_blank">Blender</a>
                  - 3D modeling software
                </div>
                <div class="credit-item">
                  <a href="https://www.gimp.org/" target="_blank">GIMP</a> -
                  Image editing
                </div>
                <div class="credit-item">
                  <a
                    href="https://www.rapidtables.com/convert/color/hex-to-rgb.html"
                    target="_blank"
                    >Hex to RGB converter</a
                  >
                </div>
                <div class="credit-item">
                  <a
                    href="https://matheowis.github.io/HDRI-to-CubeMap/"
                    target="_blank"
                    >HDRI to CubeMap converter</a
                  >
                </div>
                <div class="credit-item">
                  <a
                    href="https://vercel.com/docs/project-configuration#project/version"
                    target="_blank"
                    >Vercel deployment documentation</a
                  >
                </div>
                <div class="credit-item">
                  <a href="https://freestylized.com/" target="_blank"
                    >https://freestylized.com/</a
                  >
                </div>
                <div class="credit-item">
                  <a href="https://fontawesome.com/icons" target="_blank"
                    >Font Awesome</a
                  >
                  - Icons
                </div>
                <div class="credit-item">
                  <a
                    href="https://fonts.google.com/specimen/Schoolbell"
                    target="_blank"
                    >Google Fonts - Schoolbell</a
                  >
                </div>
              </div>

              <div class="credit-category">
                <h4 class="credit-title">JavaScript Libraries</h4>
                <div class="credit-item">
                  <strong>Three.js:</strong>
                  <a href="https://threejs.org/" target="_blank"
                    >https://threejs.org/</a
                  >
                  - 3D graphics library
                </div>
                <div class="credit-item">
                  <strong>GSAP:</strong>
                  <a href="https://gsap.com/" target="_blank"
                    >https://gsap.com/</a
                  >
                  - Animation library
                </div>
                <div class="credit-item">
                  <strong>lil-gui:</strong>
                  <a href="https://lil-gui.georgealways.com/" target="_blank"
                    >https://lil-gui.georgealways.com/</a
                  >
                  - Debug interface
                </div>
                <div class="credit-item">
                  <strong>three-perf:</strong>
                  <a
                    href="https://github.com/RenaudRohlinger/three-perf"
                    target="_blank"
                    >https://github.com/RenaudRohlinger/three-perf</a
                  >
                  - Performance monitoring
                </div>
                <div class="credit-item">
                  <strong>Mersenne Twister:</strong>
                  <a
                    href="https://github.com/boo1ean/mersenne-twister"
                    target="_blank"
                    >https://github.com/boo1ean/mersenne-twister</a
                  >
                  - Random number generator
                </div>
                <div class="credit-item">
                  <strong>Vite:</strong>
                  <a href="https://vitejs.dev/" target="_blank"
                    >https://vitejs.dev/</a
                  >
                  - Build tool
                </div>
                <div class="credit-item">
                  <strong>Sass:</strong>
                  <a href="https://sass-lang.com/" target="_blank"
                    >https://sass-lang.com/</a
                  >
                  - CSS preprocessor
                </div>
              </div>

              <div class="version-info">
                <p>Version 1.0.0 | Built with 💜 for the web</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loader Screen -->
    <div id="loader">
      <div class="loader-title">
        <i class="fa-regular fa-square"></i>Elemental Serenity
      </div>
      <div class="loader-progress">
        <div class="loader-progress-bar" id="progress-bar"></div>
      </div>
      <div class="loader-text" id="loader-text">Loading assets...</div>
      <div class="explore-buttons" id="explore-buttons">
        <button
          class="explore-button explore-button-light"
          id="explore-with-music"
        >
          <i class="fas fa-music"></i>
          <span>Explore with Music</span>
        </button>
        <button
          class="explore-button explore-button-dark"
          id="explore-without-music"
        >
          <i class="fas fa-volume-mute"></i>
          <span>Explore in Silence</span>
        </button>
      </div>
    </div>`;

const __moduleFactories = {
  "src/Game/Core/Camera.class.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const THREE = require("three");
const Game_class_1 = require("../Game.class");
const OrbitControls_js_1 = require("three/addons/controls/OrbitControls.js");
class Camera {
    constructor(fov = 25, near = 0.1, far = 200) {
        this.game = Game_class_1.default.getInstance();
        this.canvas = this.game.canvas;
        this.sizes = this.game.sizes;
        this.scene = this.game.scene;
        this.idealRatio = 16 / 9;
        this.ratioOverflow = 0;
        this.initialCameraPosition = null;
        this.adjustedCameraPosition = null;
        this.baseMaxDistance = 35;
        this.setPerspectiveCameraInstance(fov, near, far);
        this.setOrbitControls();
        this.initialCameraPosition = this.cameraInstance.position.clone();
        this.updateCameraForAspectRatio();
    }
    setPerspectiveCameraInstance(fov, near, far) {
        const aspectRatio = this.sizes.width / this.sizes.height;
        this.cameraInstance = new THREE.PerspectiveCamera(fov, aspectRatio, near, far);
        this.cameraInstance.position.set(18.25, 10.69, 27.32);
        this.scene.add(this.cameraInstance);
    }
    setOrbitControls() {
        this.controls = new OrbitControls_js_1.OrbitControls(this.cameraInstance, this.canvas);
        this.controls.enableDamping = true;
        this.controls.enablePan = false;
        this.controls.enableZoom = true;
        this.controls.maxPolarAngle = Math.PI / 2.2;
        this.controls.minPolarAngle = Math.PI / 4;
        this.controls.maxDistance = this.baseMaxDistance;
    }
    updateCameraForAspectRatio() {
        const currentRatio = this.sizes.width / this.sizes.height;
        this.ratioOverflow = Math.max(1, this.idealRatio / currentRatio) - 1;
        const baseDistance = this.initialCameraPosition.length();
        const additionalDistance = baseDistance * this.ratioOverflow * 0.1;
        const direction = this.initialCameraPosition.clone().normalize();
        const newDistance = baseDistance + additionalDistance;
        this.adjustedCameraPosition = direction.multiplyScalar(newDistance);
        this.cameraInstance.position.copy(this.adjustedCameraPosition);
        this.controls.maxDistance = Math.max(this.baseMaxDistance, newDistance);
    }
    resize() {
        const aspectRatio = this.sizes.width / this.sizes.height;
        this.cameraInstance.aspect = aspectRatio;
        this.cameraInstance.updateProjectionMatrix();
        this.updateCameraForAspectRatio();
    }
    update() {
        this.controls.update();
    }
    dispose() {
        this.controls.dispose();
        this.scene.remove(this.cameraInstance);
    }
}
exports.default = Camera;

  },
  "src/Game/Core/Renderer.class.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const THREE = require("three");
const Game_class_1 = require("../Game.class");
const PerformanceMonitor_class_1 = require("../Utils/PerformanceMonitor.class");
const EnvironmentManager_class_1 = require("../World/Managers/EnvironmentManager/EnvironmentManager.class");
class Renderer {
    constructor() {
        this.game = Game_class_1.default.getInstance();
        this.canvas = this.game.canvas;
        this.sizes = this.game.sizes;
        this.scene = this.game.scene;
        this.camera = this.game.camera;
        this.environmentTimeManager = EnvironmentManager_class_1.default.getInstance();
        this.envTime = this.environmentTimeManager.envTime;
        this.renderer = this.game.renderer;
        this.debugGUI = this.game.debug;
        this.isDebugMode = this.game.isDebugMode;
        this.setRendererInstance();
        this.environmentTimeManager.onChange((newValue, oldValue) => {
            this.onEnvTimeChanged(newValue, oldValue);
        });
        this.onGraphicsQualityChanged = this.onGraphicsQualityChanged.bind(this);
        window.addEventListener('graphicsQualityChanged', this.onGraphicsQualityChanged);
    }
    getInitialGraphicsSettings() {
        const defaults = {
            antialias: false,
            shadowMapType: 'PCFShadowMap',
            pixelRatioCap: 2,
        };
        try {
            const savedSettings = localStorage.getItem('gameSettings');
            if (!savedSettings)
                return defaults;
            const settings = JSON.parse(savedSettings);
            const quality = settings.graphicsQuality || 'medium';
            if (quality === 'custom') {
                return {
                    antialias: settings.customAntialias || false,
                    shadowMapType: settings.customShadows || 'PCFShadowMap',
                    pixelRatioCap: settings.customPixelRatio || 2,
                };
            }
            const presetSettings = {
                low: {
                    antialias: false,
                    shadowMapType: 'BasicShadowMap',
                    pixelRatioCap: 2,
                },
                medium: {
                    antialias: false,
                    shadowMapType: 'PCFShadowMap',
                    pixelRatioCap: 2,
                },
                high: {
                    antialias: true,
                    shadowMapType: 'PCFSoftShadowMap',
                    pixelRatioCap: 2,
                },
                ultra: {
                    antialias: true,
                    shadowMapType: 'PCFSoftShadowMap',
                    pixelRatioCap: 3,
                },
            };
            return presetSettings[quality] || defaults;
        }
        catch (error) {
            console.warn('Failed to load graphics settings from localStorage:', error);
            return defaults;
        }
    }
    setRendererInstance() {
        const toneMappingOptions = {
            NoToneMapping: THREE.NoToneMapping,
            LinearToneMapping: THREE.LinearToneMapping,
            ReinhardToneMapping: THREE.ReinhardToneMapping,
            CineonToneMapping: THREE.CineonToneMapping,
            ACESFilmicToneMapping: THREE.ACESFilmicToneMapping,
            AgXToneMapping: THREE.AgXToneMapping,
            NeutralToneMapping: THREE.NeutralToneMapping,
        };
        const graphicsSettings = this.getInitialGraphicsSettings();
        const useAntialias = graphicsSettings.antialias;
        this.rendererInstance = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: useAntialias,
            powerPreference: 'high-performance',
        });
        this.updateToneMapping();
        if (this.isDebugMode) {
            this.debugGUI.add(this.rendererInstance, 'toneMapping', {
                options: toneMappingOptions,
                label: 'Tone Mapping',
                onChange: (toneMappingType) => {
                    this.rendererInstance.toneMapping = toneMappingType;
                },
            }, 'Renderer Settings');
        }
        this.rendererInstance.toneMappingExposure = 1.75;
        this.rendererInstance.shadowMap.enabled = true;
        const shadowMapTypes = {
            BasicShadowMap: THREE.BasicShadowMap,
            PCFShadowMap: THREE.PCFShadowMap,
            PCFSoftShadowMap: THREE.PCFSoftShadowMap,
        };
        this.rendererInstance.shadowMap.type =
            shadowMapTypes[graphicsSettings.shadowMapType] || THREE.PCFShadowMap;
        this.rendererInstance.setSize(this.sizes.width, this.sizes.height);
        this.rendererInstance.setPixelRatio(Math.min(this.sizes.pixelRatio, graphicsSettings.pixelRatioCap));
        if (this.isDebugMode) {
            this.setUpPerformanceMonitor();
        }
    }
    updateToneMapping() {
        this.rendererInstance.toneMapping =
            this.envTime === 'day'
                ? THREE.LinearToneMapping
                : THREE.NeutralToneMapping;
    }
    onEnvTimeChanged(newValue, oldValue) {
        this.envTime = newValue;
        this.updateToneMapping();
    }
    onGraphicsQualityChanged(event) {
        const { quality, settings } = event.detail;
        const shadowMapTypes = {
            BasicShadowMap: THREE.BasicShadowMap,
            PCFShadowMap: THREE.PCFShadowMap,
            PCFSoftShadowMap: THREE.PCFSoftShadowMap,
        };
        if (shadowMapTypes[settings.shadowMapType]) {
            this.rendererInstance.shadowMap.type =
                shadowMapTypes[settings.shadowMapType];
        }
        if (this.sizes && settings.pixelRatioCap) {
            const newPixelRatio = Math.min(this.sizes.pixelRatio, settings.pixelRatioCap);
            this.rendererInstance.setPixelRatio(newPixelRatio);
        }
        localStorage.setItem('graphicsAntialias', settings.antialias.toString());
        localStorage.setItem('graphicsShadowMapType', settings.shadowMapType);
        localStorage.setItem('graphicsPixelRatioCap', settings.pixelRatioCap.toString());
    }
    setUpPerformanceMonitor() {
        this.perf = new PerformanceMonitor_class_1.default(this.rendererInstance);
    }
    resize() {
        this.rendererInstance.setSize(this.sizes.width, this.sizes.height);
        const graphicsSettings = this.getInitialGraphicsSettings();
        this.rendererInstance.setPixelRatio(Math.min(this.sizes.pixelRatio, graphicsSettings.pixelRatioCap));
    }
    update() {
        if (this.perf) {
            this.perf.beginFrame();
        }
        this.rendererInstance.render(this.scene, this.camera.cameraInstance);
        if (this.perf) {
            this.perf.endFrame();
        }
    }
    destroy() {
        this.environmentTimeManager.offChange();
        window.removeEventListener('graphicsQualityChanged', this.onGraphicsQualityChanged);
        this.rendererInstance.dispose();
    }
}
exports.default = Renderer;

  },
  "src/Game/Game.class.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const THREE = require("three");
const Sizes_class_1 = require("./Utils/Sizes.class");
const Time_class_1 = require("./Utils/Time.class");
const Camera_class_1 = require("./Core/Camera.class");
const Renderer_class_1 = require("./Core/Renderer.class");
const World_class_1 = require("./World/World.class");
const DebugGUI_class_1 = require("./Utils/DebugGUI.class");
const AudioManager_class_1 = require("./Utils/AudioManager.class");
const MusicManager_class_1 = require("./Utils/MusicManager.class");
const AmbientSoundManager_class_1 = require("./Utils/AmbientSoundManager.class");
const ToastManager_class_1 = require("./UI/ToastManager.class");
const MusicControlUI_class_1 = require("./UI/MusicControlUI.class");
const LightningButtonUI_class_1 = require("./UI/LightningButtonUI.class");
const EnvironmentManager_class_1 = require("./World/Managers/EnvironmentManager/EnvironmentManager.class");
const SeasonManager_class_1 = require("./World/Managers/SeasonManager/SeasonManager.class");
class Game {
    constructor(canvas, resources, isDebugMode, withMusic = true) {
        if (Game.instance) {
            return Game.instance;
        }
        Game.instance = this;
        this.isDebugMode = isDebugMode;
        this.withMusic = withMusic;
        if (this.isDebugMode) {
            this.debug = new DebugGUI_class_1.default();
        }
        this.canvas = canvas;
        this.resources = resources;
        this.environmentTimeManager = EnvironmentManager_class_1.default.getInstance();
        this.seasonManager = SeasonManager_class_1.default.getInstance();
        this.sizes = new Sizes_class_1.default();
        this.time = new Time_class_1.default();
        this.scene = new THREE.Scene();
        this.camera = new Camera_class_1.default();
        this.renderer = new Renderer_class_1.default();
        this.audioManager = new AudioManager_class_1.default(this.resources);
        this.audioManager.addListenerToCamera(this.camera);
        this.toastManager = new ToastManager_class_1.default();
        this.musicManager = new MusicManager_class_1.default(this.audioManager);
        this.musicControlUI = new MusicControlUI_class_1.default(this.musicManager, this.toastManager);
        this.musicControlUI.setInitialState(this.withMusic);
        this.ambientSoundManager = new AmbientSoundManager_class_1.default(this.environmentTimeManager, this.seasonManager, this.audioManager, this.musicControlUI);
        this.musicManager.on('trackChanged', (track) => {
            this.toastManager.showMusicToast(track.name);
        });
        this.world = new World_class_1.default();
        this.lightningButtonUI = new LightningButtonUI_class_1.default(this.world.lightning);
        if (this.withMusic) {
            this.musicManager.startRandomMusic();
        }
        this.time.on('animate', () => {
            this.update();
        });
        this.sizes.on('resize', () => {
            this.resize();
        });
        if (this.isDebugMode) {
            this.initGUI();
        }
    }
    static getInstance() {
        if (!Game.instance) {
            Game.instance = new Game();
        }
        return Game.instance;
    }
    get envTime() {
        return this.environmentTimeManager.envTime;
    }
    set envTime(value) {
        this.environmentTimeManager.envTime = value;
    }
    resize() {
        this.camera.resize();
        this.renderer.resize();
    }
    update() {
        this.camera.update();
        this.world.update(this.time.delta, this.time.elapsedTime);
        this.renderer.update();
        if (this.ambientSoundManager) {
            this.ambientSoundManager.update();
        }
    }
    initGUI() {
        const envTimeProxy = {
            get time() {
                return Game.instance.environmentTimeManager.envTime;
            },
            set time(value) {
                Game.instance.environmentTimeManager.envTime = value;
            },
        };
        const seasonProxy = {
            get season() {
                return Game.instance.seasonManager.currentSeason;
            },
            set season(value) {
                Game.instance.seasonManager.setSeason(value);
            },
        };
        this.debug.add(envTimeProxy, 'time', {
            options: ['day', 'night'],
            label: 'Time of Day',
            onChange: (value) => {
                this.environmentTimeManager.setTime(value);
            },
        }, 'Environment');
        this.debug.add(seasonProxy, 'season', {
            options: ['spring', 'winter', 'autumn', 'rainy'],
            label: 'Season',
            onChange: (value) => {
                this.seasonManager.setSeason(value);
            },
        }, 'Environment');
        const seasonControls = {
            toggleSeason: () => {
                this.seasonManager.toggle();
            },
        };
        this.debug.add(seasonControls, 'toggleSeason', {
            label: 'Toggle Season',
        }, 'Environment');
        const audioControls = {
            masterVolume: this.audioManager.masterVolume,
            musicVolume: this.audioManager.musicVolume,
            soundVolume: this.audioManager.soundVolume,
            startRandomMusic: () => this.musicManager.startRandomMusic(),
            stopMusic: () => this.musicManager.stopMusic(),
            playMorningPetals: () => this.audioManager.playMusic('morningPetalsMusic'),
            playWindowLight: () => this.audioManager.playMusic('windowLightMusic'),
            playForestDreams: () => this.audioManager.playMusic('forestDreamsMusic'),
            playRain: () => this.audioManager.playSound('rainSound', null, true),
            playFire: () => this.audioManager.playSound('fireBurningSound', null, true),
            playBirds: () => this.audioManager.playSound(this.audioManager.getRandomBirdSound()),
            stopAllSounds: () => {
                Object.keys(this.audioManager.sounds).forEach((soundId) => {
                    if (!soundId.includes('Music')) {
                        this.audioManager.stopSound(soundId);
                    }
                });
            },
        };
        this.debug.add(audioControls, 'masterVolume', {
            min: 0,
            max: 1,
            step: 0.1,
            onChange: (value) => this.audioManager.setMasterVolume(value),
        }, 'Audio');
        this.debug.add(audioControls, 'musicVolume', {
            min: 0,
            max: 1,
            step: 0.1,
            onChange: (value) => this.audioManager.setMusicVolume(value),
        }, 'Audio');
        this.debug.add(audioControls, 'soundVolume', {
            min: 0,
            max: 1,
            step: 0.1,
            onChange: (value) => this.audioManager.setSoundVolume(value),
        }, 'Audio');
        this.debug.add(audioControls, 'startRandomMusic', { label: 'Start Random Music' }, 'Audio');
        this.debug.add(audioControls, 'stopMusic', { label: 'Stop Music' }, 'Audio');
        this.debug.add(audioControls, 'playMorningPetals', { label: 'Play Morning Petals' }, 'Audio');
        this.debug.add(audioControls, 'playWindowLight', { label: 'Play Window Light' }, 'Audio');
        this.debug.add(audioControls, 'playForestDreams', { label: 'Play Forest Dreams' }, 'Audio');
        this.debug.add(audioControls, 'playRain', { label: 'Play Rain (Loop)' }, 'Audio');
        this.debug.add(audioControls, 'playFire', { label: 'Play Fire (Loop)' }, 'Audio');
        this.debug.add(audioControls, 'playBirds', { label: 'Play Random Birds' }, 'Audio');
        this.debug.add(audioControls, 'stopAllSounds', { label: 'Stop All Sounds' }, 'Audio');
        const ambientControls = {
            ambientVolume: this.ambientSoundManager.config.baseVolume,
            stopAllAmbient: () => this.ambientSoundManager.stopAllAmbientSounds(),
            updateAmbient: () => this.ambientSoundManager.updateAmbientSounds(),
        };
        this.debug.add(ambientControls, 'ambientVolume', {
            min: 0,
            max: 1,
            step: 0.1,
            onChange: (value) => {
                this.ambientSoundManager.config.baseVolume = value;
                this.ambientSoundManager.setMasterVolume(1.0);
            },
        }, 'Ambient Sounds');
        this.debug.add(ambientControls, 'stopAllAmbient', { label: 'Stop All Ambient' }, 'Ambient Sounds');
        this.debug.add(ambientControls, 'updateAmbient', { label: 'Update Ambient' }, 'Ambient Sounds');
    }
    destroy() {
        this.sizes.off('resize');
        this.time.off('animate');
        if (this.world) {
            this.world.dispose();
        }
        if (this.ambientSoundManager) {
            this.ambientSoundManager.dispose();
        }
        if (this.musicManager) {
            this.musicManager.stopMusic();
        }
        if (this.audioManager) {
            this.audioManager.dispose();
        }
        if (this.toastManager) {
            this.toastManager.destroy();
        }
        if (this.musicControlUI) {
            this.musicControlUI.destroy();
        }
        if (this.lightningButtonUI) {
            this.lightningButtonUI.destroy();
        }
        this.scene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.geometry.dispose();
                for (const key in child.material) {
                    const value = child.material[key];
                    if (typeof value?.dispose === 'function') {
                        value.dispose();
                    }
                }
            }
            if (child.geometry)
                child.geometry.dispose();
            if (child.material) {
                const mats = Array.isArray(child.material)
                    ? child.material
                    : [child.material];
                mats.forEach((m) => {
                    for (const key in m) {
                        const prop = m[key];
                        if (prop && prop.isTexture)
                            prop.dispose();
                    }
                    m.dispose();
                });
            }
        });
        this.camera.dispose();
        this.renderer.destroy();
        this.time.dispose();
        this.sizes.dispose();
        if (this.debug) {
            this.debug.gui.destroy();
        }
        this.canvas = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.world = null;
        this.debug = null;
        this.audioManager = null;
        this.ambientSoundManager = null;
        this.musicManager = null;
        this.toastManager = null;
        this.musicControlUI = null;
        Game.instance = null;
    }
}
exports.default = Game;

  },
  "src/Game/UI/LightningButtonUI.class.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SeasonManager_class_1 = require("../World/Managers/SeasonManager/SeasonManager.class");
class LightningButtonUI {
    constructor(lightning) {
        this.lightning = lightning;
        this.seasonManager = SeasonManager_class_1.default.getInstance();
        this.wrapper = null;
        this.button = null;
        this.isVisible = false;
        this.init();
        this.setupSeasonListener();
    }
    init() {
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'lightning-btn-wrapper';
        this.button = document.createElement('button');
        this.button.id = 'lightning-strike';
        this.button.className = 'lightning-btn';
        this.button.title = 'Strike Lightning';
        this.button.innerHTML = '<i class="fas fa-bolt"></i>';
        const arcs = document.createElement('div');
        arcs.className = 'electric-arcs';
        arcs.innerHTML = `
      <span class="arc arc-1"></span>
      <span class="arc arc-2"></span>
      <span class="arc arc-3"></span>
      <span class="arc arc-4"></span>
    `;
        this.wrapper.appendChild(this.button);
        this.wrapper.appendChild(arcs);
        const controlPanel = document.getElementById('control-panel');
        if (controlPanel) {
            const musicControl = document.getElementById('music-control');
            if (musicControl) {
                controlPanel.insertBefore(this.wrapper, musicControl);
            }
            else {
                controlPanel.appendChild(this.wrapper);
            }
        }
        this.handleClick = this.handleClick.bind(this);
        this.button.addEventListener('click', this.handleClick);
        this.updateVisibility(this.seasonManager.currentSeason);
    }
    setupSeasonListener() {
        this.handleSeasonChange = this.handleSeasonChange.bind(this);
        this.seasonManager.on('seasonChanged', this.handleSeasonChange);
    }
    handleSeasonChange(newSeason) {
        this.updateVisibility(newSeason);
    }
    updateVisibility(season) {
        const shouldShow = season === 'rainy';
        if (shouldShow && !this.isVisible) {
            this.show();
        }
        else if (!shouldShow && this.isVisible) {
            this.hide();
        }
    }
    show() {
        if (this.wrapper) {
            this.isVisible = true;
            this.wrapper.classList.add('show');
        }
    }
    hide() {
        if (this.wrapper) {
            this.isVisible = false;
            this.wrapper.classList.remove('show');
        }
    }
    handleClick() {
        if (this.lightning) {
            if (navigator.haptic) {
                navigator.haptic('error');
            }
            else if (navigator.vibrate) {
                navigator.vibrate([50, 30, 100, 50, 200]);
            }
            this.wrapper.classList.add('striking');
            setTimeout(() => {
                this.wrapper.classList.remove('striking');
            }, 400);
            this.lightning.manualStrike();
        }
    }
    destroy() {
        if (this.button) {
            this.button.removeEventListener('click', this.handleClick);
        }
        if (this.wrapper) {
            this.wrapper.remove();
        }
        this.seasonManager.off('seasonChanged', this.handleSeasonChange);
    }
}
exports.default = LightningButtonUI;

  },
  "src/Game/UI/MusicControlUI.class.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const consoleStylish_1 = require("../../utils/consoleStylish");
class MusicControlUI {
    constructor(musicManager, toastManager) {
        this.musicManager = musicManager;
        this.toastManager = toastManager;
        this.button = null;
        this.icon = null;
        this.isMusicEnabled = true;
        this.wasPlayingBeforeHide = false;
        this.init();
        this.setupVisibilityHandlers();
    }
    init() {
        this.button = document.getElementById('music-control');
        this.icon = this.button.querySelector('i');
        if (!this.button || !this.icon) {
            console.error('Music control button not found in DOM');
            return;
        }
        this.toggleMusic = this.toggleMusic.bind(this);
        this.button.addEventListener('click', this.toggleMusic);
        setTimeout(() => {
            this.show();
        }, 1000);
    }
    show() {
        if (this.button) {
            this.button.classList.add('show');
        }
    }
    hide() {
        if (this.button) {
            this.button.classList.remove('show');
        }
    }
    toggleMusic() {
        if (navigator.haptic) {
            navigator.haptic([{ intensity: 0.7, sharpness: 0.1 }]);
        }
        else if (navigator.vibrate) {
            navigator.vibrate(10);
        }
        this.isMusicEnabled = !this.isMusicEnabled;
        consoleStylish_1.Console.logAudioToggle(this.isMusicEnabled);
        if (this.isMusicEnabled) {
            this.enableMusic();
        }
        else {
            this.disableMusic();
        }
        this.updateButtonState();
    }
    enableMusic() {
        this.musicManager.resumeMusic();
    }
    disableMusic() {
        this.musicManager.pauseMusic();
        this.toastManager.showToast('Music disabled', 'info', 2000);
    }
    updateButtonState() {
        if (!this.button || !this.icon)
            return;
        if (this.isMusicEnabled) {
            this.button.classList.remove('muted');
            this.button.title = 'Disable Music';
            this.icon.className = 'fas fa-music';
        }
        else {
            this.button.classList.add('muted');
            this.button.title = 'Enable Music';
            this.icon.className = 'fas fa-volume-mute';
        }
    }
    setupVisibilityHandlers() {
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        this.handleWindowBlur = this.handleWindowBlur.bind(this);
        this.handleWindowFocus = this.handleWindowFocus.bind(this);
        this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
        this.handlePageHide = this.handlePageHide.bind(this);
        this.handleUnload = this.handleUnload.bind(this);
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
        window.addEventListener('blur', this.handleWindowBlur);
        window.addEventListener('focus', this.handleWindowFocus);
        window.addEventListener('beforeunload', this.handleBeforeUnload);
        window.addEventListener('pagehide', this.handlePageHide);
        window.addEventListener('unload', this.handleUnload);
    }
    handleVisibilityChange() {
        if (document.hidden) {
            if (this.isMusicEnabled && this.musicManager.isPlaying) {
                this.wasPlayingBeforeHide = true;
                this.musicManager.pauseMusic();
            }
            this.musicManager.audioManager.forceStopAllMusic();
        }
        else {
            if (this.isMusicEnabled && this.wasPlayingBeforeHide) {
                this.wasPlayingBeforeHide = false;
                setTimeout(() => {
                    this.musicManager.resumeMusic();
                }, 500);
            }
        }
    }
    handleWindowBlur() {
        if (this.isMusicEnabled && this.musicManager.isPlaying) {
            this.wasPlayingBeforeHide = true;
            this.musicManager.pauseMusic();
        }
        this.musicManager.audioManager.forceStopAllMusic();
    }
    handleWindowFocus() {
        if (this.isMusicEnabled && this.wasPlayingBeforeHide) {
            this.wasPlayingBeforeHide = false;
            setTimeout(() => {
                this.musicManager.resumeMusic();
            }, 500);
        }
    }
    handleBeforeUnload() {
        this.musicManager.audioManager.forceStopAllMusic();
        this.musicManager.stopMusic();
    }
    handlePageHide() {
        this.musicManager.audioManager.forceStopAllMusic();
        this.musicManager.stopMusic();
    }
    handleUnload() {
        this.musicManager.audioManager.forceStopAllMusic();
    }
    setInitialState(musicEnabled) {
        this.isMusicEnabled = musicEnabled;
        this.updateButtonState();
    }
    isMusicPlaying() {
        return this.isMusicEnabled && this.musicManager.isPlaying;
    }
    destroy() {
        if (this.button) {
            this.button.removeEventListener('click', this.toggleMusic);
        }
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        window.removeEventListener('blur', this.handleWindowBlur);
        window.removeEventListener('focus', this.handleWindowFocus);
        window.removeEventListener('beforeunload', this.handleBeforeUnload);
        window.removeEventListener('pagehide', this.handlePageHide);
        window.removeEventListener('unload', this.handleUnload);
    }
}
exports.default = MusicControlUI;

  },
  "src/Game/UI/ToastManager.class.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ToastManager {
    constructor() {
        this.toastContainer = null;
        this.activeToasts = [];
        this.init();
    }
    init() {
        this.createToastContainer();
    }
    createToastContainer() {
        this.toastContainer = document.createElement('div');
        this.toastContainer.id = 'toast-container';
        this.toastContainer.style.cssText = `
      position: fixed;
      top: 24px;
      left: 24px;
      z-index: 10000;
      pointer-events: none;
      font-family: 'Inter', sans-serif;
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;
        if (document.body) {
            document.body.appendChild(this.toastContainer);
        }
        else {
            document.addEventListener('DOMContentLoaded', () => {
                document.body.appendChild(this.toastContainer);
            });
        }
    }
    getBaseToastStyles() {
        return `
      background: linear-gradient(145deg, #f5f0ec, #ede8e4);
      color: rgba(0, 0, 0, 0.9);
      padding: 14px 18px;
      border-radius: 14px;
      font-size: 0.85rem;
      font-weight: 500;
      letter-spacing: 0.02em;
      display: flex;
      align-items: center;
      gap: 14px;
      transform: translateX(-120%) scale(0.9);
      transition: all 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
      opacity: 0;
      border: 1px solid rgba(0, 0, 0, 0.06);
      box-shadow:
        0 8px 32px rgba(0, 0, 0, 0.1),
        0 2px 8px rgba(0, 0, 0, 0.06),
        inset 0 1px 0 rgba(255, 255, 255, 0.8);
      max-width: 280px;
      min-width: 200px;
      position: relative;
      overflow: hidden;
      backdrop-filter: blur(8px);
    `;
    }
    getIconContainerStyles(gradient) {
        return `
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: ${gradient};
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    `;
    }
    getIconStyles() {
        return `
      font-size: 0.95rem;
      color: rgba(255, 255, 255, 0.95);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    `;
    }
    getLabelStyles() {
        return `
      font-size: 0.7rem;
      color: rgba(0, 0, 0, 0.5);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 600;
      margin-bottom: 3px;
    `;
    }
    getTitleStyles() {
        return `
      font-size: 0.88rem;
      color: rgba(0, 0, 0, 0.85);
      font-weight: 600;
      line-height: 1.3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;
    }
    showMusicToast(trackName) {
        this.clearMusicToasts();
        const toast = document.createElement('div');
        toast.className = 'music-toast';
        toast.style.cssText = this.getBaseToastStyles();
        const iconGradient = 'linear-gradient(145deg, #8b5cf6, #7c3aed)';
        const iconContainer = document.createElement('div');
        iconContainer.style.cssText = this.getIconContainerStyles(iconGradient);
        const icon = document.createElement('i');
        icon.className = 'fas fa-music';
        icon.style.cssText = this.getIconStyles();
        iconContainer.appendChild(icon);
        const textContent = document.createElement('div');
        textContent.style.cssText = `
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    `;
        const label = document.createElement('div');
        label.textContent = 'Now Playing';
        label.style.cssText = this.getLabelStyles();
        const title = document.createElement('div');
        title.textContent = trackName;
        title.style.cssText = this.getTitleStyles();
        const progressBar = document.createElement('div');
        progressBar.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      background: linear-gradient(90deg, #8b5cf6, #7c3aed);
      width: 0%;
      transition: width 4s linear;
      border-radius: 0 0 0 14px;
    `;
        textContent.appendChild(label);
        textContent.appendChild(title);
        toast.appendChild(iconContainer);
        toast.appendChild(textContent);
        toast.appendChild(progressBar);
        this.insertToast(toast);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                toast.style.transform = 'translateX(0) scale(1)';
                toast.style.opacity = '1';
                setTimeout(() => {
                    progressBar.style.width = '100%';
                }, 100);
            });
        });
        setTimeout(() => {
            this.hideToast(toast);
        }, 4000);
        return toast;
    }
    showDayNightToast(timeOfDay) {
        const toast = document.createElement('div');
        toast.className = 'daynight-toast';
        let icon, iconGradient, displayName;
        if (timeOfDay === 'day') {
            icon = 'fas fa-sun';
            iconGradient = 'linear-gradient(145deg, #fbbf24, #f59e0b)';
            displayName = 'Daytime';
        }
        else {
            icon = 'fas fa-moon';
            iconGradient = 'linear-gradient(145deg, #818cf8, #6366f1)';
            displayName = 'Nighttime';
        }
        toast.style.cssText = this.getBaseToastStyles();
        const iconContainer = document.createElement('div');
        iconContainer.style.cssText = this.getIconContainerStyles(iconGradient);
        const iconElement = document.createElement('i');
        iconElement.className = icon;
        iconElement.style.cssText = this.getIconStyles();
        iconContainer.appendChild(iconElement);
        const textContent = document.createElement('div');
        textContent.style.cssText = `
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    `;
        const label = document.createElement('div');
        label.textContent = 'Time Changed';
        label.style.cssText = this.getLabelStyles();
        const title = document.createElement('div');
        title.textContent = displayName;
        title.style.cssText = this.getTitleStyles();
        textContent.appendChild(label);
        textContent.appendChild(title);
        toast.appendChild(iconContainer);
        toast.appendChild(textContent);
        this.insertToast(toast);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                toast.style.transform = 'translateX(0) scale(1)';
                toast.style.opacity = '1';
            });
        });
        setTimeout(() => {
            this.hideToast(toast);
        }, 3000);
        return toast;
    }
    showSeasonToast(season) {
        const toast = document.createElement('div');
        toast.className = 'season-toast';
        let icon, iconGradient, displayName;
        switch (season) {
            case 'spring':
                icon = 'fas fa-seedling';
                iconGradient = 'linear-gradient(145deg, #34d399, #10b981)';
                displayName = 'Blooming Spring';
                break;
            case 'summer':
                icon = 'fas fa-sun';
                iconGradient = 'linear-gradient(145deg, #fbbf24, #f59e0b)';
                displayName = 'Sunny Summer';
                break;
            case 'autumn':
            case 'fall':
                icon = 'fa-brands fa-canadian-maple-leaf';
                iconGradient = 'linear-gradient(145deg, #fb923c, #f97316)';
                displayName = 'Cozy Autumn';
                break;
            case 'winter':
                icon = 'fas fa-snowflake';
                iconGradient = 'linear-gradient(145deg, #60a5fa, #3b82f6)';
                displayName = 'Frosty Winter';
                break;
            default:
                icon = 'fas fa-cloud-rain';
                iconGradient = 'linear-gradient(145deg, #9ca3af, #6b7280)';
                displayName = 'Thundering Rain';
        }
        toast.style.cssText = this.getBaseToastStyles();
        const iconContainer = document.createElement('div');
        iconContainer.style.cssText = this.getIconContainerStyles(iconGradient);
        const iconElement = document.createElement('i');
        iconElement.className = icon;
        iconElement.style.cssText = this.getIconStyles();
        iconContainer.appendChild(iconElement);
        const textContent = document.createElement('div');
        textContent.style.cssText = `
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    `;
        const label = document.createElement('div');
        label.textContent = 'Season Changed';
        label.style.cssText = this.getLabelStyles();
        const title = document.createElement('div');
        title.textContent = displayName;
        title.style.cssText = this.getTitleStyles();
        textContent.appendChild(label);
        textContent.appendChild(title);
        toast.appendChild(iconContainer);
        toast.appendChild(textContent);
        this.insertToast(toast);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                toast.style.transform = 'translateX(0) scale(1)';
                toast.style.opacity = '1';
            });
        });
        setTimeout(() => {
            this.hideToast(toast);
        }, 3000);
        return toast;
    }
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        let iconGradient, icon;
        const isMusicDisabled = message === 'Music disabled';
        if (isMusicDisabled) {
            iconGradient = 'linear-gradient(145deg, #374151, #1f2937)';
            icon = 'fas fa-volume-mute';
        }
        else {
            switch (type) {
                case 'success':
                    iconGradient = 'linear-gradient(145deg, #34d399, #10b981)';
                    icon = 'fas fa-check';
                    break;
                case 'error':
                    iconGradient = 'linear-gradient(145deg, #f87171, #ef4444)';
                    icon = 'fas fa-exclamation';
                    break;
                case 'warning':
                    iconGradient = 'linear-gradient(145deg, #fbbf24, #f59e0b)';
                    icon = 'fas fa-exclamation-triangle';
                    break;
                default:
                    iconGradient = 'linear-gradient(145deg, #60a5fa, #3b82f6)';
                    icon = 'fas fa-info';
            }
        }
        toast.style.cssText = this.getBaseToastStyles();
        const iconContainer = document.createElement('div');
        iconContainer.style.cssText = this.getIconContainerStyles(iconGradient);
        const iconElement = document.createElement('i');
        iconElement.className = icon;
        iconElement.style.cssText = this.getIconStyles();
        iconContainer.appendChild(iconElement);
        const textContent = document.createElement('div');
        textContent.textContent = message;
        textContent.style.cssText = `
      font-size: 0.85rem;
      color: rgba(0, 0, 0, 0.8);
      font-weight: 500;
      flex: 1;
    `;
        toast.appendChild(iconContainer);
        toast.appendChild(textContent);
        this.insertToast(toast);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                toast.style.transform = 'translateX(0) scale(1)';
                toast.style.opacity = '1';
            });
        });
        setTimeout(() => {
            this.hideToast(toast);
        }, duration);
        return toast;
    }
    insertToast(toast) {
        const existingToasts = Array.from(this.toastContainer.children);
        let insertAfter = null;
        for (let i = existingToasts.length - 1; i >= 0; i--) {
            const existingToast = existingToasts[i];
            if (existingToast.className === 'season-toast' ||
                existingToast.className === 'daynight-toast') {
                insertAfter = existingToast;
                break;
            }
        }
        if (insertAfter) {
            this.toastContainer.insertBefore(toast, insertAfter.nextSibling);
        }
        else {
            this.toastContainer.appendChild(toast);
        }
        this.activeToasts.push(toast);
        toast.offsetHeight;
    }
    hideToast(toast) {
        if (!toast || !toast.parentNode)
            return;
        toast.style.transform = 'translateX(-120%) scale(0.9)';
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            this.activeToasts = this.activeToasts.filter((t) => t !== toast);
        }, 450);
    }
    clearMusicToasts() {
        const musicToasts = this.activeToasts.filter((toast) => toast.className === 'music-toast');
        musicToasts.forEach((toast) => this.hideToast(toast));
    }
    clearDayNightToasts() {
        const dayNightToasts = this.activeToasts.filter((toast) => toast.className === 'daynight-toast');
        dayNightToasts.forEach((toast) => this.hideToast(toast));
    }
    clearSeasonToasts() {
        const seasonToasts = this.activeToasts.filter((toast) => toast.className === 'season-toast');
        seasonToasts.forEach((toast) => this.hideToast(toast));
    }
    destroy() {
        if (this.toastContainer && this.toastContainer.parentNode) {
            this.toastContainer.parentNode.removeChild(this.toastContainer);
        }
        this.activeToasts = [];
    }
}
exports.default = ToastManager;

  },
  "src/Game/Utils/AmbientSoundManager.class.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const THREE = require("three");
const EventEmitter_class_js_1 = require("./EventEmitter.class.js");
class AmbientSoundManager extends EventEmitter_class_js_1.default {
    constructor(environmentManager, seasonManager, audioManager, musicControlUI) {
        super();
        this.environmentManager = environmentManager;
        this.seasonManager = seasonManager;
        this.audioManager = audioManager;
        this.musicControlUI = musicControlUI;
        this.config = {
            shortGapMin: 8000,
            shortGapMax: 10000,
            longGapMin: 8000,
            longGapMax: 10000,
            thunderLongGapMin: 8000,
            thunderLongGapMax: 10000,
            baseVolume: 0.8,
            firePosition: new THREE.Vector3(-5.4, 1.0, -6.9),
            lakePosition: new THREE.Vector3(0, 0, 0),
            maxDistance: 35,
        };
        this.activeContinuousSounds = new Set();
        this.scheduledTimers = new Map();
        this.wasAmbientPlayingBeforeHide = false;
        this.isAmbientSoundsPaused = false;
        this.init();
    }
    init() {
        this.bindEvents();
        this.updateAmbientSounds();
    }
    bindEvents() {
        this.environmentManager.onChange(() => {
            this.updateAmbientSounds();
        });
        this.seasonManager.onChange(() => {
            this.updateAmbientSounds();
        });
        if (this.musicControlUI) {
            const originalEnableMusic = this.musicControlUI.enableMusic.bind(this.musicControlUI);
            const originalDisableMusic = this.musicControlUI.disableMusic.bind(this.musicControlUI);
            this.musicControlUI.enableMusic = () => {
                originalEnableMusic();
                this.updateAmbientSounds();
            };
            this.musicControlUI.disableMusic = () => {
                originalDisableMusic();
                this.stopAllAmbientSounds();
            };
        }
        this.setupAmbientVisibilityHandlers();
    }
    setupAmbientVisibilityHandlers() {
        this.handleAmbientVisibilityChange =
            this.handleAmbientVisibilityChange.bind(this);
        this.handleAmbientWindowBlur = this.handleAmbientWindowBlur.bind(this);
        this.handleAmbientWindowFocus = this.handleAmbientWindowFocus.bind(this);
        this.handleAmbientBeforeUnload = this.handleAmbientBeforeUnload.bind(this);
        document.addEventListener('visibilitychange', this.handleAmbientVisibilityChange);
        window.addEventListener('blur', this.handleAmbientWindowBlur);
        window.addEventListener('focus', this.handleAmbientWindowFocus);
        window.addEventListener('beforeunload', this.handleAmbientBeforeUnload);
        window.addEventListener('pagehide', this.handleAmbientBeforeUnload);
        window.addEventListener('unload', this.handleAmbientBeforeUnload);
    }
    handleAmbientVisibilityChange() {
        if (document.hidden) {
            if (this.musicControlUI &&
                this.musicControlUI.isMusicEnabled &&
                this.hasActiveAmbientSounds()) {
                this.wasAmbientPlayingBeforeHide = true;
                this.pauseAmbientSounds();
            }
        }
        else {
            if (this.musicControlUI &&
                this.musicControlUI.isMusicEnabled &&
                this.wasAmbientPlayingBeforeHide) {
                this.wasAmbientPlayingBeforeHide = false;
                setTimeout(() => {
                    this.resumeAmbientSounds();
                }, 500);
            }
        }
    }
    handleAmbientWindowBlur() {
        if (this.musicControlUI &&
            this.musicControlUI.isMusicEnabled &&
            this.hasActiveAmbientSounds()) {
            this.wasAmbientPlayingBeforeHide = true;
            this.pauseAmbientSounds();
        }
    }
    handleAmbientWindowFocus() {
        if (this.musicControlUI &&
            this.musicControlUI.isMusicEnabled &&
            this.wasAmbientPlayingBeforeHide) {
            this.wasAmbientPlayingBeforeHide = false;
            setTimeout(() => {
                this.resumeAmbientSounds();
            }, 500);
        }
    }
    handleAmbientBeforeUnload() {
        this.stopAllAmbientSounds();
    }
    updateAmbientSounds() {
        if (this.musicControlUI && !this.musicControlUI.isMusicEnabled) {
            this.stopAllAmbientSounds();
            return;
        }
        const season = this.seasonManager.currentSeason;
        const timeOfDay = this.environmentManager.envTime;
        this.stopAllAmbientSounds();
        this.handleBirds(season, timeOfDay);
        this.handleCrickets(season, timeOfDay);
        this.handleOwl(season, timeOfDay);
        this.handleRain(season, timeOfDay);
        this.handleThunder(season, timeOfDay);
        this.handleWolf(season, timeOfDay);
        this.handleFire(season, timeOfDay);
        this.handleLakeWaves(season, timeOfDay);
    }
    handleBirds(season, timeOfDay) {
        const shouldPlay = (season === 'autumn' || season === 'spring' || season === 'winter') &&
            timeOfDay === 'day';
        if (shouldPlay) {
            this.scheduleRandomSound('birds', () => this.playRandomBird(), 'short');
        }
    }
    handleCrickets(season, timeOfDay) {
        const shouldPlay = (season === 'autumn' || season === 'spring' || season === 'winter') &&
            timeOfDay === 'night';
        if (shouldPlay) {
            this.playContinuousSound('cricketsSound');
        }
    }
    handleOwl(season, timeOfDay) {
        if (timeOfDay !== 'night')
            return;
        if (season === 'autumn' || season === 'spring' || season === 'rainy') {
            this.scheduleRandomSound('owlHowling', () => this.playOwlHowling(), 'long');
        }
        else if (season === 'winter') {
            this.scheduleRandomSound('owlHooting', () => this.playOwlHooting(), 'long');
        }
    }
    handleRain(season, timeOfDay) {
        const shouldPlay = season === 'rainy';
        if (shouldPlay) {
            this.playContinuousSound('rainSound');
        }
    }
    handleThunder(season, timeOfDay) {
        const shouldPlay = season === 'rainy';
        if (shouldPlay) {
            this.scheduleRandomSound('thunderDistant', () => this.playThunder(), 'thunder');
        }
    }
    playThunderStrike() {
        if (this.musicControlUI &&
            this.musicControlUI.isMusicEnabled &&
            !document.hidden &&
            !this.isAmbientSoundsPaused) {
            this.audioManager.playSound('thunderStrikeSound', this.config.baseVolume * 0.9, false);
        }
    }
    handleWolf(season, timeOfDay) {
        const shouldPlay = timeOfDay === 'night';
        if (shouldPlay) {
            this.scheduleRandomSound('wolf', () => this.playWolf(), 'long');
        }
    }
    handleFire(season, timeOfDay) {
        const shouldPlay = season !== 'rainy';
        if (shouldPlay) {
            this.playContinuousSoundWithDistance('fireBurningSound', this.config.firePosition);
        }
    }
    handleLakeWaves(season, timeOfDay) {
        const shouldPlay = true;
        if (shouldPlay) {
            this.playContinuousSoundWithDistance('lakeWavesSound', this.config.lakePosition);
        }
    }
    playRandomBird() {
        const birdSoundId = this.audioManager.getRandomBirdSound();
        this.audioManager.playSound(birdSoundId, this.config.baseVolume, false);
    }
    playOwlHowling() {
        this.audioManager.playSound('owlHowlingSound', this.config.baseVolume, false);
    }
    playOwlHooting() {
        this.audioManager.playSound('owlHootingSound', this.config.baseVolume, false);
    }
    playThunder() {
        this.audioManager.playSound('thunderDistantSound', this.config.baseVolume * 0.9, false);
    }
    playWolf() {
        this.audioManager.playSound('wolfHowlingSound', this.config.baseVolume * 0.7, false);
    }
    playContinuousSound(soundId) {
        if (!this.activeContinuousSounds.has(soundId)) {
            this.audioManager.playSound(soundId, this.config.baseVolume * 0.7, true);
            this.activeContinuousSounds.add(soundId);
        }
    }
    stopContinuousSound(soundId) {
        if (this.activeContinuousSounds.has(soundId)) {
            this.audioManager.stopSound(soundId);
            this.activeContinuousSounds.delete(soundId);
        }
    }
    playContinuousSoundWithDistance(soundId, soundPosition) {
        if (!this.activeContinuousSounds.has(soundId)) {
            const volume = this.calculateDistanceBasedVolume(soundPosition);
            this.audioManager.playSound(soundId, volume, true);
            this.activeContinuousSounds.add(soundId);
        }
        else {
            this.updateSoundVolume(soundId, soundPosition);
        }
    }
    calculateDistanceBasedVolume(soundPosition) {
        const cameraPosition = this.audioManager.listener.parent.position;
        const distance = cameraPosition.distanceTo(soundPosition);
        const normalizedDistance = Math.min(distance / this.config.maxDistance, 1.0);
        const volume = (1.0 - normalizedDistance) * this.config.baseVolume * 0.7;
        return Math.max(volume, 0);
    }
    updateSoundVolume(soundId, soundPosition) {
        const sound = this.audioManager.sounds[soundId];
        if (sound && sound.isPlaying) {
            const volume = this.calculateDistanceBasedVolume(soundPosition);
            sound.setVolume(volume);
        }
    }
    scheduleRandomSound(soundKey, playFunction, gapType) {
        this.clearTimer(soundKey);
        const delay = this.getRandomDelay(gapType);
        const timerId = setTimeout(() => {
            playFunction();
            this.rescheduleRandomSound(soundKey, playFunction, gapType);
        }, delay);
        this.scheduledTimers.set(soundKey, timerId);
    }
    rescheduleRandomSound(soundKey, playFunction, gapType) {
        if (this.shouldSoundBePlaying(soundKey)) {
            const delay = this.getRandomDelay(gapType);
            const timerId = setTimeout(() => {
                playFunction();
                this.rescheduleRandomSound(soundKey, playFunction, gapType);
            }, delay);
            this.scheduledTimers.set(soundKey, timerId);
        }
    }
    shouldSoundBePlaying(soundKey) {
        const season = this.seasonManager.currentSeason;
        const timeOfDay = this.environmentManager.envTime;
        switch (soundKey) {
            case 'birds':
                return ((season === 'autumn' || season === 'spring' || season === 'winter') &&
                    timeOfDay === 'day');
            case 'owlHowling':
                return ((season === 'autumn' || season === 'spring' || season === 'rainy') &&
                    timeOfDay === 'night');
            case 'owlHooting':
                return season === 'winter' && timeOfDay === 'night';
            case 'thunderDistant':
                return season === 'rainy';
            case 'wolf':
                return timeOfDay === 'night';
            default:
                return false;
        }
    }
    getRandomDelay(gapType) {
        switch (gapType) {
            case 'short':
                return (Math.random() * (this.config.shortGapMax - this.config.shortGapMin) +
                    this.config.shortGapMin);
            case 'long':
                return (Math.random() * (this.config.longGapMax - this.config.longGapMin) +
                    this.config.longGapMin);
            case 'thunder':
                return (Math.random() *
                    (this.config.thunderLongGapMax - this.config.thunderLongGapMin) +
                    this.config.thunderLongGapMin);
            default:
                return this.config.shortGapMin;
        }
    }
    clearTimer(soundKey) {
        if (this.scheduledTimers.has(soundKey)) {
            clearTimeout(this.scheduledTimers.get(soundKey));
            this.scheduledTimers.delete(soundKey);
        }
    }
    stopAllAmbientSounds() {
        this.scheduledTimers.forEach((timerId) => {
            clearTimeout(timerId);
        });
        this.scheduledTimers.clear();
        this.activeContinuousSounds.forEach((soundId) => {
            this.stopContinuousSound(soundId);
        });
        this.activeContinuousSounds.clear();
    }
    setMasterVolume(volume) {
        this.config.baseVolume = Math.max(0, Math.min(1, volume));
    }
    hasActiveAmbientSounds() {
        return (this.activeContinuousSounds.size > 0 || this.scheduledTimers.size > 0);
    }
    pauseAmbientSounds() {
        this.isAmbientSoundsPaused = true;
        this.audioManager.stopAllAmbientSounds();
        this.scheduledTimers.forEach((timerId) => {
            clearTimeout(timerId);
        });
        this.scheduledTimers.clear();
        this.activeContinuousSounds.clear();
    }
    resumeAmbientSounds() {
        this.isAmbientSoundsPaused = false;
        this.updateAmbientSounds();
    }
    update() {
        if (this.activeContinuousSounds.has('fireBurningSound')) {
            this.updateSoundVolume('fireBurningSound', this.config.firePosition);
        }
        if (this.activeContinuousSounds.has('lakeWavesSound')) {
            this.updateSoundVolume('lakeWavesSound', this.config.lakePosition);
        }
    }
    dispose() {
        this.stopAllAmbientSounds();
        document.removeEventListener('visibilitychange', this.handleAmbientVisibilityChange);
        window.removeEventListener('blur', this.handleAmbientWindowBlur);
        window.removeEventListener('focus', this.handleAmbientWindowFocus);
        window.removeEventListener('beforeunload', this.handleAmbientBeforeUnload);
        window.removeEventListener('pagehide', this.handleAmbientBeforeUnload);
        window.removeEventListener('unload', this.handleAmbientBeforeUnload);
    }
}
exports.default = AmbientSoundManager;

  },
  "src/Game/Utils/AudioManager.class.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const THREE = require("three");
const EventEmitter_class_1 = require("./EventEmitter.class");
class AudioManager extends EventEmitter_class_1.default {
    constructor(resourceLoader) {
        super();
        this.resources = resourceLoader;
        this.listener = new THREE.AudioListener();
        this.sounds = {};
        this.currentMusic = null;
        this.masterVolume = 0.5;
        this.musicVolume = 0.5;
        this.soundVolume = 0.5;
        this.init();
    }
    init() {
        this.createAudioObjects();
    }
    createAudioObjects() {
        const audioAssets = [
            'morningPetalsMusic',
            'windowLightMusic',
            'forestDreamsMusic',
            'birds1Sound',
            'birds2Sound',
            'birds3Sound',
            'birds4Sound',
            'cricketsSound',
            'fireBurningSound',
            'owlHowlingSound',
            'owlHootingSound',
            'rainSound',
            'lakeWavesSound',
            'wolfHowlingSound',
            'thunderDistantSound',
            'thunderStrikeSound',
            'clickSound',
            'hoverSound',
        ];
        audioAssets.forEach((assetId) => {
            if (this.resources.items[assetId]) {
                const audio = new THREE.Audio(this.listener);
                audio.setBuffer(this.resources.items[assetId]);
                if (assetId.includes('Music')) {
                    audio.setVolume(this.musicVolume * this.masterVolume);
                }
                else {
                    audio.setVolume(this.soundVolume * this.masterVolume);
                }
                this.sounds[assetId] = audio;
            }
        });
    }
    playMusic(musicId, fadeIn = true, fadeDuration = 2000) {
        if (this.currentMusic && this.currentMusic.isPlaying) {
            this.stopMusic(true, fadeDuration / 2);
        }
        const music = this.sounds[musicId];
        if (!music) {
            console.warn(`Music ${musicId} not found`);
            return;
        }
        this.currentMusic = music;
        music.setLoop(true);
        if (fadeIn) {
            music.setVolume(0);
            music.play();
            this.fadeVolume(music, this.musicVolume * this.masterVolume, fadeDuration);
        }
        else {
            music.setVolume(this.musicVolume * this.masterVolume);
            music.play();
        }
    }
    stopMusic(fadeOut = true, fadeDuration = 1000) {
        if (!this.currentMusic || !this.currentMusic.isPlaying)
            return;
        if (fadeOut) {
            const musicToStop = this.currentMusic;
            this.fadeVolume(this.currentMusic, 0, fadeDuration, () => {
                if (musicToStop && musicToStop.isPlaying) {
                    musicToStop.stop();
                }
                if (this.currentMusic === musicToStop) {
                    this.currentMusic = null;
                }
            });
        }
        else {
            this.currentMusic.stop();
            this.currentMusic = null;
        }
    }
    forceStopAllMusic() {
        if (this.currentMusic) {
            try {
                this.currentMusic.stop();
            }
            catch (e) {
                console.warn('Error stopping current music:', e);
            }
            this.currentMusic = null;
        }
        Object.keys(this.sounds).forEach((soundId) => {
            if (soundId.includes('Music')) {
                const sound = this.sounds[soundId];
                if (sound && sound.isPlaying) {
                    try {
                        sound.stop();
                    }
                    catch (e) {
                        console.warn(`Error stopping ${soundId}:`, e);
                    }
                }
            }
        });
    }
    playSound(soundId, volume = null, loop = false) {
        const sound = this.sounds[soundId];
        if (!sound) {
            console.warn(`Sound ${soundId} not found`);
            return;
        }
        if (sound.isPlaying) {
            sound.stop();
        }
        sound.setLoop(loop);
        sound.setVolume(volume !== null
            ? volume * this.masterVolume
            : this.soundVolume * this.masterVolume);
        sound.play();
        return sound;
    }
    stopSound(soundId) {
        const sound = this.sounds[soundId];
        if (sound && sound.isPlaying) {
            sound.stop();
        }
    }
    stopAllAmbientSounds() {
        const ambientSoundIds = [
            'birds1Sound',
            'birds2Sound',
            'birds3Sound',
            'birds4Sound',
            'cricketsSound',
            'owlHowlingSound',
            'owlHootingSound',
            'rainSound',
            'wolfHowlingSound',
            'thunderDistantSound',
            'fireBurningSound',
            'lakeWavesSound',
        ];
        ambientSoundIds.forEach((soundId) => {
            this.stopSound(soundId);
        });
    }
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        this.updateAllVolumes();
    }
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.currentMusic) {
            this.currentMusic.setVolume(this.musicVolume * this.masterVolume);
        }
    }
    setSoundVolume(volume) {
        this.soundVolume = Math.max(0, Math.min(1, volume));
        this.updateAllVolumes();
    }
    updateAllVolumes() {
        Object.keys(this.sounds).forEach((soundId) => {
            const sound = this.sounds[soundId];
            if (soundId.includes('Music')) {
                sound.setVolume(this.musicVolume * this.masterVolume);
            }
            else {
                sound.setVolume(this.soundVolume * this.masterVolume);
            }
        });
    }
    fadeVolume(audio, targetVolume, duration, onComplete = null) {
        const startVolume = audio.getVolume();
        const volumeDiff = targetVolume - startVolume;
        const startTime = performance.now();
        const fade = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const currentVolume = startVolume + volumeDiff * progress;
            audio.setVolume(currentVolume);
            if (progress < 1) {
                requestAnimationFrame(fade);
            }
            else if (onComplete) {
                onComplete();
            }
        };
        fade();
    }
    addListenerToCamera(camera) {
        camera.cameraInstance.add(this.listener);
    }
    getRandomBirdSound() {
        const birdSounds = [
            'birds1Sound',
            'birds2Sound',
            'birds3Sound',
            'birds4Sound',
        ];
        return birdSounds[Math.floor(Math.random() * birdSounds.length)];
    }
    dispose() {
        Object.values(this.sounds).forEach((sound) => {
            if (sound.isPlaying) {
                sound.stop();
            }
        });
        this.sounds = {};
        this.currentMusic = null;
    }
}
exports.default = AudioManager;

  },
  "src/Game/Utils/DebugGUI.class.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lil_gui_1 = require("lil-gui");
const THREE = require("three");
/**
 * DebugGUI: A wrapper around lil-gui that auto-detects control types and supports:
 *   • Numbers (sliders)
 *   • Booleans (checkboxes)
 *   • Colors (color pickers)
 *   • Enums / string lists (dropdowns)
 *   • Vector2 / Vector3 (grouped axis sliders)
 *
 * ? In main entry point for project
 * ? Add this.debug = new DebugGUI();
 * ? Later on while using anywhere in app use
 * ? this.debug = DebugGUI.getInstance();
 *
 * Usage examples:
 *
 * * Number slider:
 * debug.add(myMat.uniforms.uSpeed, "value", { min: 0, max: 10, step: 0.01, label: "Speed" }, "movement");
 *
 * * Boolean checkbox:
 * debug.add(Material, "wireframe", { label: "Enable Feature" }, "cubeFolder");
 *
 * * Color picker:
 * debug.add(myMat.uniforms.uColor, "value", { color: true, label: "Base Color" }, "cubeFolder");
 *
 * * Enum / dropdown:
 * this.debug.add( this.renderer, "toneMapping", { options: toneMappingOptions, label: "Tone Mapping", onChange: (v) => { this.renderer.toneMapping = v; },}, "Renderer Settings" );
 *
 * * Vector2:
 * debug.add(myObject.position2D, "position", { min: -5, max: 5, step: 0.1, label: "2D Position" }, "transform");
 *
 * * Vector3:
 * debug.add(myObject.position3D, "position", { min: -10, max: 10, step: 0.5, label: "3D Position" }, "transform");
 */
class DebugGUI {
    constructor() {
        if (DebugGUI.instance) {
            return DebugGUI.instance;
        }
        this.gui = null;
        this.folders = new Map();
        this.controllers = new Map();
        DebugGUI.instance = this;
        this._initializeGUI();
    }
    _initializeGUI() {
        this.gui = new lil_gui_1.default();
    }
    addFolder(name) {
        if (!this.folders[name]) {
            this.folders[name] = this.gui.addFolder(name);
        }
        this.folders[name].close();
        return this.folders[name];
    }
    add(targetObject, targetProperty, options = {}, folderName = null) {
        const controllerTarget = folderName ? this.addFolder(folderName) : this.gui;
        const value = targetObject[targetProperty];
        const label = options.label || targetProperty;
        if (value instanceof THREE.Vector2 || value instanceof THREE.Vector3) {
            const vecFolder = controllerTarget.addFolder(label);
            const axes = [
                'x',
                'y',
                value instanceof THREE.Vector3 ? 'z' : null,
            ].filter(Boolean);
            axes.forEach((axis) => {
                const controller = vecFolder
                    .add(value, axis, options.min !== undefined ? options.min : -1, options.max !== undefined ? options.max : 1, options.step !== undefined ? options.step : 0.01)
                    .name(axis);
                if (typeof options.onChange === 'function') {
                    controller.onChange(() => {
                        try {
                            options.onChange(value);
                        }
                        catch (err) {
                            console.warn('DebugGUI: vector onChange threw', err);
                        }
                    });
                }
            });
            return vecFolder;
        }
        const isPlainVec = value && typeof value === 'object' && 'x' in value && 'y' in value;
        if (isPlainVec) {
            const vecFolder = controllerTarget.addFolder(label);
            const axes = ['x', 'y', 'z'].filter((a) => a in value);
            axes.forEach((axis) => {
                const controller = vecFolder
                    .add(value, axis, options.min !== undefined ? options.min : -1, options.max !== undefined ? options.max : 1, options.step !== undefined ? options.step : 0.01)
                    .name(axis);
                if (typeof options.onChange === 'function') {
                    controller.onChange(() => {
                        try {
                            options.onChange(value);
                        }
                        catch (err) {
                            console.warn('DebugGUI: plain-vector onChange threw', err);
                        }
                    });
                }
            });
            return vecFolder;
        }
        if (options.options && typeof options.options === 'object') {
            const controller = controllerTarget.add(targetObject, targetProperty, options.options);
            controller.name(label);
            if (typeof options.onChange === 'function')
                controller.onChange(options.onChange);
            return controller;
        }
        if (typeof value === 'boolean') {
            const controller = controllerTarget
                .add(targetObject, targetProperty)
                .name(label);
            if (typeof options.onChange === 'function')
                controller.onChange(options.onChange);
            return controller;
        }
        const isColor = options.color ||
            value instanceof THREE.Color ||
            typeof value === 'string';
        let controller;
        if (isColor) {
            controller = controllerTarget.addColor(targetObject, targetProperty);
        }
        else {
            controller = controllerTarget.add(targetObject, targetProperty, options.min, options.max, options.step);
        }
        controller.name(label);
        if (typeof options.onChange === 'function')
            controller.onChange(options.onChange);
        return controller;
    }
    static getInstance() {
        if (!DebugGUI.instance) {
            DebugGUI.instance = new DebugGUI();
        }
        return DebugGUI.instance;
    }
    static destroy() {
        if (DebugGUI.instance) {
            if (DebugGUI.instance.gui) {
                DebugGUI.instance.gui.destroy();
            }
            DebugGUI.instance = null;
        }
    }
    setEnabled(enabled) {
        if (this.gui && this.gui.domElement) {
            this.gui.domElement.style.display = enabled ? 'block' : 'none';
        }
    }
}
exports.default = DebugGUI;

  },
  "src/Game/Utils/EventEmitter.class.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class EventEmitter {
    constructor() {
        this.callbacks = {};
        this.callbacks.base = {};
    }
    on(_names, callback) {
        if (typeof _names === 'undefined' || _names === '') {
            console.warn('wrong names');
            return false;
        }
        if (typeof callback === 'undefined') {
            console.warn('wrong callback');
            return false;
        }
        const names = this.resolveNames(_names);
        names.forEach((_name) => {
            const name = this.resolveName(_name);
            if (!(this.callbacks[name.namespace] instanceof Object))
                this.callbacks[name.namespace] = {};
            if (!(this.callbacks[name.namespace][name.value] instanceof Array))
                this.callbacks[name.namespace][name.value] = [];
            this.callbacks[name.namespace][name.value].push(callback);
        });
        return this;
    }
    off(_names) {
        if (typeof _names === 'undefined' || _names === '') {
            console.warn('wrong name');
            return false;
        }
        const names = this.resolveNames(_names);
        names.forEach((_name) => {
            const name = this.resolveName(_name);
            if (name.namespace !== 'base' && name.value === '') {
                delete this.callbacks[name.namespace];
            }
            else {
                if (name.namespace === 'base') {
                    for (const namespace in this.callbacks) {
                        if (this.callbacks[namespace] instanceof Object &&
                            this.callbacks[namespace][name.value] instanceof Array) {
                            delete this.callbacks[namespace][name.value];
                            if (Object.keys(this.callbacks[namespace]).length === 0)
                                delete this.callbacks[namespace];
                        }
                    }
                }
                else if (this.callbacks[name.namespace] instanceof Object &&
                    this.callbacks[name.namespace][name.value] instanceof Array) {
                    delete this.callbacks[name.namespace][name.value];
                    if (Object.keys(this.callbacks[name.namespace]).length === 0)
                        delete this.callbacks[name.namespace];
                }
            }
        });
        return this;
    }
    trigger(_name, ..._args) {
        if (typeof _name === 'undefined' || _name === '') {
            console.warn('wrong name');
            return false;
        }
        let finalResult = null;
        let result = null;
        const args = !(_args instanceof Array) ? [] : _args;
        let name = this.resolveNames(_name);
        name = this.resolveName(name[0]);
        if (name.namespace === 'base') {
            for (const namespace in this.callbacks) {
                if (this.callbacks[namespace] instanceof Object &&
                    this.callbacks[namespace][name.value] instanceof Array) {
                    this.callbacks[namespace][name.value].forEach(function (callback) {
                        result = callback.apply(this, args);
                        if (typeof finalResult === 'undefined') {
                            finalResult = result;
                        }
                    });
                }
            }
        }
        else if (this.callbacks[name.namespace] instanceof Object) {
            if (name.value === '') {
                console.warn('wrong name');
                return this;
            }
            this.callbacks[name.namespace][name.value].forEach(function (callback) {
                result = callback.apply(this, args);
                if (typeof finalResult === 'undefined')
                    finalResult = result;
            });
        }
        return finalResult;
    }
    resolveNames(_names) {
        let names = _names;
        names = names.replace(/[^a-zA-Z0-9 ,/.]/g, '');
        names = names.replace(/[,/]+/g, ' ');
        names = names.split(' ');
        return names;
    }
    resolveName(name) {
        const newName = {};
        const parts = name.split('.');
        newName.original = name;
        newName.value = parts[0];
        newName.namespace = 'base';
        if (parts.length > 1 && parts[1] !== '') {
            newName.namespace = parts[1];
        }
        return newName;
    }
}
exports.default = EventEmitter;

  },
  "src/Game/Utils/Math.class.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ColorInterpolat = exports.FloatInterpolat = exports.Vec3Interpolat = void 0;
exports.saturate = saturate;
exports.inverseLerp = inverseLerp;
exports.clamp = clamp;
exports.remap = remap;
exports.lerp = lerp;
exports.random = random;
const mersennetwister_1 = require("mersennetwister");
const THREE = require("three");
const MT_ = new mersennetwister_1.default(7);
function saturate(v) {
    return Math.min(1, Math.max(0, v));
}
function inverseLerp(a, b, v) {
    return saturate((v - a) / (b - a));
}
function remap(a, b, c, d, v) {
    return c + (d - c) * inverseLerp(a, b, v);
}
function lerp(a, b, t) {
    return a + (b - a) * t;
}
function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
}
function random() {
    return MT_.random();
}
class Interpolant {
    constructor(frames, stride) {
        this.frames = null;
        this.interpolator = null;
        this.resultBuffer = null;
        this.frames = frames;
        const times = [];
        const values = [];
        for (let i = 0; i < frames.length; i++) {
            times.push(frames[i].time);
            values.push(...frames[i].value);
        }
        this.resultBuffer = new Float32Array(stride);
        this.interpolator = new THREE.LinearInterpolant(times, values, stride, this.resultBuffer);
    }
    evaluate(time) {
        this.interpolator.evaluate(time);
        return this.onEvaluate(this.resultBuffer);
    }
    onEvaluate(result) {
        return result;
    }
}
class Vec3Interpolat extends Interpolant {
    constructor(frames) {
        super(frames, 3);
    }
    onEvaluate(result) {
        return new THREE.Vector3(result[0], result[1], result[2]);
    }
}
exports.Vec3Interpolat = Vec3Interpolat;
class FloatInterpolat extends Interpolant {
    constructor(frames) {
        for (let i = 0; i < frames.length; i++) {
            frames[i].value = [frames[i].value];
        }
        super(frames, 1);
    }
    onEvaluate(result) {
        return result[0];
    }
    toTexture() {
        const frames = this.frames;
        const maxFrameTime = frames[frames.length - 1].time;
        let smallestStep = 0.5;
        for (let i = 1; i < frames.length; i++) {
            const stepSize = (frames[i].time - frames[i - 1].time) / maxFrameTime;
            smallestStep = Math.min(smallestStep, stepSize);
        }
        const recommendedSize = Math.ceil(1 / smallestStep);
        const width = recommendedSize + 1;
        const data = new Uint8Array(width * 4);
        for (let i = 0; i < width; i++) {
            const t = i / (width - 1);
            const value = this.evaluate(t * maxFrameTime);
            const byteValue = Math.max(0, Math.min(255, Math.floor(value * 255)));
            data[i * 4 + 0] = byteValue;
            data[i * 4 + 1] = byteValue;
            data[i * 4 + 2] = byteValue;
            data[i * 4 + 3] = 255;
        }
        const dt = new THREE.DataTexture(data, width, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
        dt.minFilter = THREE.LinearFilter;
        dt.magFilter = THREE.LinearFilter;
        dt.wrapS = THREE.ClampToEdgeWrapping;
        dt.wrapT = THREE.ClampToEdgeWrapping;
        dt.generateMipmaps = false;
        dt.needsUpdate = true;
        return dt;
    }
}
exports.FloatInterpolat = FloatInterpolat;
class ColorInterpolat extends Interpolant {
    constructor(frames) {
        for (let i = 0; i < frames.length; i++) {
            frames[i].value = [
                frames[i].value.r,
                frames[i].value.g,
                frames[i].value.b,
            ];
        }
        super(frames, 3);
    }
    onEvaluate(result) {
        return new THREE.Color(result[0], result[1], result[2]);
    }
    toTexture(alphaInterpolant) {
        const frames = this.frames;
        const alphaFrames = alphaInterpolant.frames;
        const maxFrameTime = Math.max(frames[frames.length - 1].time, alphaFrames[alphaFrames.length - 1].time);
        let smallestStep = 0.5;
        for (let i = 1; i < frames.length; i++) {
            const stepSize = (frames[i].time - frames[i - 1].time) / maxFrameTime;
            smallestStep = Math.min(smallestStep, stepSize);
        }
        for (let i = 1; i < alphaFrames.length; i++) {
            const stepSize = (alphaFrames[i].time - alphaFrames[i - 1].time) / maxFrameTime;
            smallestStep = Math.min(smallestStep, stepSize);
        }
        const recommendedSize = Math.ceil(1 / smallestStep);
        const width = recommendedSize + 1;
        const data = new Uint8Array(width * 4);
        for (let i = 0; i < width; i++) {
            const t = i / (width - 1);
            const color = this.evaluate(t * maxFrameTime);
            const alpha = alphaInterpolant.evaluate(t * maxFrameTime);
            data[i * 4 + 0] = Math.max(0, Math.min(255, Math.floor(color.r * 255)));
            data[i * 4 + 1] = Math.max(0, Math.min(255, Math.floor(color.g * 255)));
            data[i * 4 + 2] = Math.max(0, Math.min(255, Math.floor(color.b * 255)));
            data[i * 4 + 3] = Math.max(0, Math.min(255, Math.floor(alpha * 255)));
        }
        const dt = new THREE.DataTexture(data, width, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
        dt.minFilter = THREE.LinearFilter;
        dt.magFilter = THREE.LinearFilter;
        dt.wrapS = THREE.ClampToEdgeWrapping;
        dt.wrapT = THREE.ClampToEdgeWrapping;
        dt.generateMipmaps = false;
        dt.needsUpdate = true;
        return dt;
    }
}
exports.ColorInterpolat = ColorInterpolat;

  },
  "src/Game/Utils/MusicManager.class.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EventEmitter_class_1 = require("./EventEmitter.class");
class MusicManager extends EventEmitter_class_1.default {
    constructor(audioManager) {
        super();
        this.audioManager = audioManager;
        this.musicTracks = [
            { id: 'morningPetalsMusic', name: 'Morning Petals' },
            { id: 'windowLightMusic', name: 'Window Light' },
            { id: 'forestDreamsMusic', name: 'Forest Dreams' },
        ];
        this.currentTrackIndex = -1;
        this.isPlaying = false;
        this.isPaused = false;
        this.fadeInDuration = 2000;
        this.fadeOutDuration = 1000;
        this.trackCheckInterval = null;
        this.pausedTrackId = null;
        this.init();
    }
    init() { }
    startRandomMusic() {
        if (this.isPlaying)
            return;
        this.isPlaying = true;
        this.isPaused = false;
        this.playNextRandomTrack();
    }
    pauseMusic() {
        if (!this.isPlaying)
            return;
        this.isPaused = true;
        this.isPlaying = false;
        if (this.audioManager.currentMusic &&
            this.audioManager.currentMusic.isPlaying) {
            this.pausedTrackId = this.getCurrentTrack()?.id;
            this.audioManager.stopMusic(true, this.fadeOutDuration);
        }
        if (this.trackCheckInterval) {
            clearInterval(this.trackCheckInterval);
            this.trackCheckInterval = null;
        }
    }
    resumeMusic() {
        if (!this.isPaused) {
            this.startRandomMusic();
            return;
        }
        this.isPlaying = true;
        this.isPaused = false;
        if (this.pausedTrackId && this.currentTrackIndex >= 0) {
            const track = this.musicTracks[this.currentTrackIndex];
            if (track && track.id === this.pausedTrackId) {
                this.playTrackWithoutLoop(track);
                this.startTrackMonitoring(track.id);
                return;
            }
        }
        this.playNextRandomTrack();
    }
    stopMusic() {
        this.isPlaying = false;
        this.isPaused = false;
        this.pausedTrackId = null;
        this.audioManager.stopMusic(true, this.fadeOutDuration);
        this.currentTrackIndex = -1;
        if (this.trackCheckInterval) {
            clearInterval(this.trackCheckInterval);
            this.trackCheckInterval = null;
        }
    }
    playNextRandomTrack() {
        if (!this.isPlaying)
            return;
        let nextIndex;
        do {
            nextIndex = Math.floor(Math.random() * this.musicTracks.length);
        } while (nextIndex === this.currentTrackIndex &&
            this.musicTracks.length > 1);
        this.currentTrackIndex = nextIndex;
        const track = this.musicTracks[this.currentTrackIndex];
        this.playTrackWithoutLoop(track);
        this.trigger('trackChanged', {
            name: track.name,
            id: track.id,
        });
        this.startTrackMonitoring(track.id);
    }
    playTrackWithoutLoop(track) {
        if (this.audioManager.currentMusic &&
            this.audioManager.currentMusic.isPlaying) {
            this.audioManager.stopMusic(false);
        }
        const music = this.audioManager.sounds[track.id];
        if (!music) {
            console.warn(`Music ${track.id} not found`);
            return;
        }
        this.audioManager.currentMusic = music;
        music.setLoop(false);
        music.setVolume(0);
        music.play();
        this.audioManager.fadeVolume(music, this.audioManager.musicVolume * this.audioManager.masterVolume, this.fadeInDuration);
    }
    startTrackMonitoring(trackId) {
        if (this.trackCheckInterval) {
            clearInterval(this.trackCheckInterval);
        }
        const audio = this.audioManager.sounds[trackId];
        if (!audio)
            return;
        const duration = audio.buffer ? audio.buffer.duration : 0;
        const startTime = performance.now();
        this.trackCheckInterval = setInterval(() => {
            if (!this.isPlaying) {
                clearInterval(this.trackCheckInterval);
                return;
            }
            const elapsed = (performance.now() - startTime) / 1000;
            if (elapsed >= duration - 0.5 || !audio.isPlaying) {
                clearInterval(this.trackCheckInterval);
                this.trackCheckInterval = null;
                setTimeout(() => {
                    if (this.isPlaying) {
                        this.playNextRandomTrack();
                    }
                }, 1000);
            }
        }, 1000);
    }
    getCurrentTrack() {
        if (this.currentTrackIndex >= 0) {
            return this.musicTracks[this.currentTrackIndex];
        }
        return null;
    }
    addTrack(id, name) {
        this.musicTracks.push({ id, name });
    }
    removeTrack(id) {
        this.musicTracks = this.musicTracks.filter((track) => track.id !== id);
    }
}
exports.default = MusicManager;

  },
  "src/Game/Utils/PerformanceMonitor.class.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const three_perf_1 = require("three-perf");
const DebugGUI_class_1 = require("./DebugGUI.class");
const stats_module_js_1 = require("three/examples/jsm/libs/stats.module.js");
const Game_class_1 = require("../Game.class");
class PerformanceMonitor {
    constructor(renderer) {
        this.game = Game_class_1.default.getInstance();
        this.renderer = renderer;
        this.debugGUI = this.game.debug;
        this.isDebugMode = this.game.isDebugMode;
        this.stats = new three_perf_1.ThreePerf({
            domElement: document.body,
            renderer: this.renderer,
            showGraph: false,
            memory: true,
            anchorX: 'left',
            anchorY: 'top',
        });
        this.statsNative = new stats_module_js_1.default();
        this.statsNative.dom.style.top = '70px';
        document.body.append(this.statsNative.dom);
        if (this.isDebugMode) {
            this.debugGUI.addFolder('Performance');
            this.debugGUI.add(this.stats, 'showGraph', { label: 'Graph' }, 'Performance');
        }
    }
    beginFrame() {
        if (this.stats.enabled)
            this.stats.begin();
    }
    endFrame() {
        if (this.stats.enabled)
            this.stats.end();
        this.statsNative.update();
    }
}
exports.default = PerformanceMonitor;

  },
  "src/Game/Utils/ResourceLoader.class.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GLTFLoader_js_1 = require("three/addons/loaders/GLTFLoader.js");
const DRACOLoader_js_1 = require("three/addons/loaders/DRACOLoader.js");
const HDRLoader_js_1 = require("three/addons/loaders/HDRLoader.js");
const AudioLoader_js_1 = require("three/src/loaders/AudioLoader.js");
const THREE = require("three");
const EventEmitter_class_1 = require("./EventEmitter.class");
class ResourceLoader extends EventEmitter_class_1.default {
    constructor(assets, isDebugMode) {
        super();
        this.sources = assets;
        this.items = {};
        this.sourceByUrl = {};
        this.sources.forEach((src) => {
            const paths = Array.isArray(src.path) ? src.path : [src.path];
            paths.forEach((url) => {
                this.sourceByUrl[url] = src;
            });
            try {
                if (typeof window !== 'undefined') {
                    const abs = new URL(paths[0], window.location.href).href;
                    this.sourceByUrl[abs] = src;
                }
            }
            catch (e) {
                console.error('Error adding source by URL:', e);
            }
        });
        this.toLoad = Object.keys(this.sourceByUrl).length;
        this.loaded = 0;
        this.manager = new THREE.LoadingManager();
        this.manager.onProgress = (_url, itemsLoaded, itemsTotal) => {
            let urlKey;
            if (typeof _url === 'string') {
                urlKey = _url;
            }
            else if (Array.isArray(_url) && _url.length) {
                urlKey = _url[0];
            }
            else if (_url && typeof _url === 'object') {
                urlKey = _url.url || _url.src || JSON.stringify(_url);
            }
            else {
                urlKey = String(_url);
            }
            const src = this.sourceByUrl[urlKey];
            const id = src ? src.id : urlKey;
            const file = typeof urlKey === 'string' && urlKey.indexOf('/') !== -1
                ? urlKey.substring(urlKey.lastIndexOf('/') + 1)
                : urlKey;
            this.loaded = itemsLoaded;
            this.trigger('progress', {
                id: `${id} - ${file}`,
                itemsLoaded,
                itemsTotal,
                percent: (itemsLoaded / itemsTotal) * 100,
            });
        };
        this.manager.onLoad = () => {
            this.trigger('loaded', {
                itemsLoaded: this.toLoad,
                itemsTotal: this.toLoad,
                percent: 100,
            });
        };
        this.manager.onError = (url) => {
            let urlKey;
            if (typeof url === 'string')
                urlKey = url;
            else if (Array.isArray(url) && url.length)
                urlKey = url[0];
            else if (url && typeof url === 'object')
                urlKey = url.url || url.src || JSON.stringify(url);
            else
                urlKey = String(url);
            const src = this.sourceByUrl[urlKey];
            const id = src ? src.id : urlKey;
            this.trigger('error', {
                id,
                url: urlKey,
                itemsLoaded: this.loaded,
                itemsTotal: this.toLoad,
            });
        };
        this.setLoaders();
        this.initLoading();
        if (this.toLoad === 0) {
            setTimeout(() => this.manager.onLoad(), 0);
        }
    }
    setLoaders() {
        this.loaders = {};
        const dracoLoader = new DRACOLoader_js_1.DRACOLoader();
        dracoLoader.setDecoderPath('/draco/');
        this.loaders.dracoLoader = dracoLoader;
        this.loaders.gltfCompressLoader = new GLTFLoader_js_1.GLTFLoader(this.manager);
        this.loaders.gltfCompressLoader.setDRACOLoader(dracoLoader);
        this.loaders.gltfLoader = new GLTFLoader_js_1.GLTFLoader(this.manager);
        this.loaders.textureLoader = new THREE.TextureLoader(this.manager);
        this.loaders.hdriLoader = new HDRLoader_js_1.HDRLoader(this.manager);
        this.loaders.cubeTextureLoader = new THREE.CubeTextureLoader(this.manager);
        this.loaders.audioLoader = new AudioLoader_js_1.AudioLoader(this.manager);
    }
    initLoading() {
        for (const source of this.sources) {
            const { type, path, id } = source;
            const onLoad = (file) => {
                this.items[id] = file;
            };
            const onProgress = undefined;
            switch (type) {
                case 'gltfModelCompressed':
                    this.loaders.gltfCompressLoader.load(path, onLoad, onProgress);
                    break;
                case 'gltfModel':
                    this.loaders.gltfLoader.load(path, onLoad, onProgress);
                    break;
                case 'texture':
                    this.loaders.textureLoader.load(path, onLoad, onProgress);
                    break;
                case 'HDRITexture':
                    this.loaders.hdriLoader.load(path, onLoad, onProgress);
                    break;
                case 'cubeMap':
                    this.loaders.cubeTextureLoader.load(path, onLoad, onProgress);
                    break;
                case 'audio':
                    this.loaders.audioLoader.load(path, onLoad, onProgress);
                    break;
                default:
                    console.warn(`Unknown asset type: ${type}`);
            }
        }
    }
}
exports.default = ResourceLoader;

  },
  "src/Game/Utils/Sizes.class.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EventEmitter_class_1 = require("./EventEmitter.class");
class Sizes extends EventEmitter_class_1.default {
    constructor() {
        super();
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.pixelRatio = Math.min(window.devicePixelRatio, 2);
        this.resizeTimeout = null;
        this._onResize = () => this.handleResizeDebounced();
        window.addEventListener('resize', this._onResize);
    }
    handleResizeDebounced() {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        this.resizeTimeout = setTimeout(() => {
            this.handleResize();
        }, 300);
    }
    handleResize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.pixelRatio = Math.min(window.devicePixelRatio, 2);
        this.trigger('resize');
    }
    dispose() {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        window.removeEventListener('resize', this._onResize);
    }
}
exports.default = Sizes;

  },
  "src/Game/Utils/Time.class.js": function(module, exports, require) {
"use strict";
const __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
const __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
let _Time_rafId;
Object.defineProperty(exports, "__esModule", { value: true });
const EventEmitter_class_1 = require("./EventEmitter.class");
class Time extends EventEmitter_class_1.default {
    constructor() {
        super();
        _Time_rafId.set(this, null);
        this.animate = this.animate.bind(this);
        this.start = performance.now();
        this.current = this.start;
        this.elapsedTime = 0;
        this.delta = 0;
        __classPrivateFieldSet(this, _Time_rafId, window.requestAnimationFrame(this.animate), "f");
    }
    animate() {
        const currentTime = performance.now();
        this.delta = Math.min((currentTime - this.current) / 1000, 0.1);
        this.current = currentTime;
        this.elapsedTime = (this.current - this.start) / 1000;
        this.trigger('animate');
        __classPrivateFieldSet(this, _Time_rafId, window.requestAnimationFrame(this.animate), "f");
    }
    dispose() {
        if (__classPrivateFieldGet(this, _Time_rafId, "f")) {
            window.cancelAnimationFrame(__classPrivateFieldGet(this, _Time_rafId, "f"));
            __classPrivateFieldSet(this, _Time_rafId, null, "f");
        }
    }
}
_Time_rafId = new WeakMap();
exports.default = Time;

  },
  "src/Game/World/Components/Bridge/Bridge.class.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const THREE = require("three");
const Game_class_1 = require("../../../Game.class");
class Bridge {
    constructor() {
        this.game = Game_class_1.default.getInstance();
        this.scene = this.game.scene;
        this.resources = this.game.resources;
        this.debugGUI = this.game.debug;
        this.isDebugMode = this.game.isDebugMode;
        this.addTent();
        if (this.isDebugMode) {
            this.initGUI();
        }
    }
    addTent() {
        this.tentModel = this.resources.items.bridgeModel.scene;
        this.scene.add(this.tentModel);
        this.tentModel.scale.set(0.8, 0.8, 0.85);
        this.tentModel.position.set(-8.0, 1.5, 1.25);
        this.tentModel.rotation.y = Math.PI;
        this.tentModel.rotation.z = Math.PI / 30;
        this.woodColorMultiplier = new THREE.Color(0.55, 0.4, 0.18);
        const woodColorMap = this.resources.items.woodColorTexture;
        const woodNormalMap = this.resources.items.woodNormalTexture;
        const woodAOMap = this.resources.items.woodAOTexture;
        this.tentModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if (child.material.name === 'Material.001') {
                    child.material.map = woodColorMap;
                    child.material.normalMap = woodNormalMap;
                    child.material.aoMap = woodAOMap;
                    child.material.aoMapIntensity = 0.15;
                    child.material.roughness = 1.0;
                    child.material.color = this.woodColorMultiplier;
                }
            }
        });
    }
    initGUI() {
        this.debugGUI.add(this, 'woodColorMultiplier', {
            type: 'color',
            label: 'Wood color',
            onChange: (v) => {
                this.woodColorMultiplier = new THREE.Color(v);
                this.tentModel.traverse((child) => {
                    if (child.isMesh && child.material.name === 'Material.001') {
                        child.material.color = this.woodColorMultiplier;
                    }
                });
            },
        }, 'Wood');
    }
}
exports.default = Bridge;

  },
  "src/Game/World/Components/Bush/Bush.class.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Game_class_1 = require("../../../Game.class");
const THREE = require("three");
const vertex_glsl_1 = require("../../../../Shaders/Materials/bush/vertex.glsl");
const fragment_glsl_1 = require("../../../../Shaders/Materials/bush/fragment.glsl");
const BushManager_class_1 = require("../../Managers/BushManager/BushManager.class");
const EnvironmentManager_class_1 = require("../../Managers/EnvironmentManager/EnvironmentManager.class");
const SeasonManager_class_1 = require("../../Managers/SeasonManager/SeasonManager.class");
class Bush {
    constructor() {
        this.game = Game_class_1.default.getInstance();
        this.scene = this.game.scene;
        this.resources = this.game.resources;
        this.debugGUI = this.game.debug;
        this.keyLight = this.scene.getObjectByName('keyLight');
        this.environmentTimeManager = EnvironmentManager_class_1.default.getInstance();
        this.seasonManager = SeasonManager_class_1.default.getInstance();
        this.currentEnvTime = this.environmentTimeManager.envTime;
        this.currentSeason = this.seasonManager.currentSeason;
        this.isDebugMode = this.game.isDebugMode;
        this.COLOR_PRESETS = this.seasonManager.getColorConfig('bush');
        this.BUSH_DEFINITIONS = [
            { position: [7.3, 1.0, 3], scale: 1.2 },
            { position: [9, 0.2, 4.1], scale: 0.6 },
            { position: [10, 0.3, 0.0], scale: 0.6 },
            { position: [11, 0.1, 1.5], scale: 0.8 },
            { position: [-10, 0.7, -5.5], scale: 1.2 },
            { position: [-12, 1.0, -5.5], scale: 2.0 },
            { position: [-11, 0.2, -8.5], scale: 0.7 },
            { position: [-2, 0.2, -7.5] },
            { position: [8, 0.5, -9.5], scale: 0.6 },
            { position: [-4.0, 0.5, 10.5], scale: 0.7 },
            { position: [0.0, 0.5, 11.5], scale: 0.5 },
            { position: [1.8, 0.2, 9.5], scale: 0.5 },
            { position: [-4, 0.0, -15.5] },
            { position: [-6, 0.0, -15], scale: 0.9 },
            { position: [-9.8, 0.5, 4.5], leafCount: 30, scale: 1.2 },
            { position: [-8.8, 0.5, 8.5], leafCount: 30 },
            { position: [-6.5, 0.1, 8.5], leafCount: 30, scale: 0.8 },
            { position: [12.0, 5.0, -0.2], scale: 0.6, bushType: 'tree' },
            { position: [12.0, 7.0, 1.5], scale: 0.7, bushType: 'tree' },
            { position: [12.5, 5.0, 3.2], scale: 0.7, bushType: 'tree' },
            { position: [13.5, 5.0, 0.5], scale: 0.6, bushType: 'tree' },
            { position: [11.0, 6.0, 2.5], scale: 0.6, bushType: 'tree' },
            { position: [8.1, 6.5, -5.5], scale: 1.0, bushType: 'birch' },
            { position: [8.5, 7.5, -8.5], scale: 1.0, bushType: 'birch' },
            { position: [6.0, 7.5, -7.5], scale: 1.0, bushType: 'birch' },
            { position: [-10.5, 4.5, 0.0], scale: 1.0, bushType: 'tree' },
            { position: [-9.5, 5.0, -2.5], scale: 1.0, bushType: 'tree' },
            { position: [-8, 4.0, -2.5], scale: 1.0, bushType: 'tree' },
            { position: [-7, 3.7, -9.0], scale: 1.0, bushType: 'tree' },
            { position: [-7, 5.0, -11.0], scale: 1.0, bushType: 'tree' },
            { position: [-5, 3.7, -11.0], scale: 1.0, bushType: 'tree' },
            { position: [-10, 6.0, 7.0], scale: 1.0, bushType: 'tree' },
            { position: [-11, 6.0, 5.0], scale: 1.0, bushType: 'tree' },
            { position: [-12, 4.0, 4.0], scale: 1.0, bushType: 'tree' },
            { position: [-12, 6.0, 6.0], scale: 1.0, bushType: 'tree' },
            { position: [-12, 4.0, 7.0], scale: 1.0, bushType: 'tree' },
            { position: [-3.1, 8.0, 10.5], scale: 1.0, bushType: 'birch' },
            { position: [-3.0, 6.0, 10.5], scale: 1.5, bushType: 'birch' },
            { position: [-5.0, 7.5, 11.5], scale: 1.0, bushType: 'birch' },
            { position: [-4.0, 6.0, 12.5], scale: 1.0, bushType: 'birch' },
        ];
        this.init();
        this.environmentTimeManager.onChange((newValue, oldValue) => {
            this.onEnvTimeChanged(newValue, oldValue);
        });
        this.seasonManager.onChange((newSeason, oldSeason) => {
            this.onSeasonChanged(newSeason, oldSeason);
        });
    }
    v3(arr) {
        return new THREE.Vector3(arr[0], arr[1], arr[2]);
    }
    col(arr) {
        return new THREE.Color(arr[0], arr[1], arr[2]);
    }
    getColorMultiplierForType(bushType, envTime) {
        const preset = this.COLOR_PRESETS[envTime];
        if (bushType === 'tree') {
            return preset.treeColorMultiplier;
        }
        else if (bushType === 'birch') {
            return preset.birchColorMultiplier;
        }
        else {
            return preset.colorMultiplier;
        }
    }
    getColorsForBushType(bushType, envTime) {
        const preset = this.COLOR_PRESETS[envTime];
        if (bushType === 'tree') {
            return {
                shadowColor: this.col(preset.treeShadowColor),
                midColor: this.col(preset.treeMidColor),
                highlightColor: this.col(preset.treeHighlightColor),
            };
        }
        else if (bushType === 'birch') {
            return {
                shadowColor: this.col(preset.birchShadowColor),
                midColor: this.col(preset.birchMidColor),
                highlightColor: this.col(preset.birchHighlightColor),
            };
        }
        else {
            return {
                shadowColor: this.col(preset.shadowColor),
                midColor: this.col(preset.midColor),
                highlightColor: this.col(preset.highlightColor),
            };
        }
    }
    getDefaults() {
        const preset = this.COLOR_PRESETS[this.currentEnvTime];
        return {
            leafCount: 45,
            scale: 1.0,
            colorMultiplier: preset.colorMultiplier,
            shadowColor: preset.shadowColor,
            midColor: preset.midColor,
            highlightColor: preset.highlightColor,
        };
    }
    init() {
        this.createMaterial();
        this.samplerMesh = this.prepareSamplerMesh();
        this.bushManager = new BushManager_class_1.BushManager({
            material: this.material,
            samplerMesh: this.samplerMesh,
            maxLeaves: 1755,
        });
        this.spawnFromDefinitions();
        if (this.isDebugMode) {
            this.initGUI();
        }
    }
    createMaterial() {
        const leavesAlphaMap = this.resources.items.leavesAlphaMap;
        const preset = this.COLOR_PRESETS[this.currentEnvTime];
        const fogUniforms = THREE.UniformsUtils.merge([THREE.UniformsLib['fog']]);
        this.material = new THREE.ShaderMaterial({
            side: THREE.DoubleSide,
            fog: true,
            uniforms: {
                ...fogUniforms,
                uTime: { value: 0.0 },
                uLightDirection: {
                    value: this.keyLight ? this.keyLight.position : new THREE.Vector3(),
                },
                uAlphaMap: { value: leavesAlphaMap },
                uShadowColor: { value: this.col(preset.shadowColor) },
                uMidColor: { value: this.col(preset.midColor) },
                uHighlightColor: { value: this.col(preset.highlightColor) },
                uBreezeSpeed: { value: 16.25 },
                uBreezeScale: { value: 6.2 },
                uBreezeStrength: { value: 2.5 },
                uSquallSpeed: { value: 4.02 },
                uSquallScale: { value: 4.3 },
                uSquallStrength: { value: 0.5 },
            },
            vertexShader: vertex_glsl_1.default,
            fragmentShader: fragment_glsl_1.default,
            depthTest: true,
            depthWrite: true,
            transparent: false,
            alphaTest: 0.8,
        });
    }
    prepareSamplerMesh() {
        const model = this.resources.items.BushEmitterModel;
        if (!model) {
            console.warn('BushEmitterModel not found in resources');
            return new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
        }
        const emitterMesh = model.scene.children[0];
        emitterMesh.updateMatrixWorld(true);
        const samplerGeometry = emitterMesh.geometry.clone();
        samplerGeometry.applyMatrix4(emitterMesh.matrixWorld);
        const nonIndexed = samplerGeometry.toNonIndexed();
        return new THREE.Mesh(nonIndexed, new THREE.MeshBasicMaterial());
    }
    spawnFromDefinitions() {
        const d = this.getDefaults();
        this.BUSH_DEFINITIONS.forEach((def) => {
            const bushType = def.bushType || 'default';
            const colors = this.getColorsForBushType(bushType, this.currentEnvTime);
            const colorMultiplier = this.getColorMultiplierForType(bushType, this.currentEnvTime);
            const cfg = {
                position: this.v3(def.position),
                leafCount: def.leafCount ?? d.leafCount,
                scale: def.scale ?? d.scale,
                colorMultiplier: this.col(colorMultiplier),
                shadowColor: colors.shadowColor,
                midColor: colors.midColor || this.col(d.midColor),
                highlightColor: colors.highlightColor || this.col(d.highlightColor),
            };
            this.bushManager.addBush(cfg);
        });
    }
    onEnvTimeChanged(newValue, oldValue) {
        this.currentEnvTime = newValue;
        this.updateColors();
    }
    onSeasonChanged(newSeason, oldSeason) {
        this.currentSeason = newSeason;
        this.COLOR_PRESETS = this.seasonManager.getColorConfig('bush');
        this.updateColors();
    }
    updateColors() {
        const preset = this.COLOR_PRESETS[this.currentEnvTime];
        this.material.uniforms.uShadowColor.value.setRGB(preset.shadowColor[0], preset.shadowColor[1], preset.shadowColor[2]);
        this.material.uniforms.uMidColor.value.setRGB(preset.midColor[0], preset.midColor[1], preset.midColor[2]);
        this.material.uniforms.uHighlightColor.value.setRGB(preset.highlightColor[0], preset.highlightColor[1], preset.highlightColor[2]);
        this.rebuildBushes();
    }
    rebuildBushes() {
        if (!this.bushManager)
            return;
        if (typeof this.bushManager.dispose === 'function') {
            this.bushManager.dispose();
        }
        else if (typeof this.bushManager.clear === 'function') {
            this.bushManager.clear();
        }
        else {
            console.warn('[Bush] BushManager has no dispose/clear method, attempting manual cleanup');
            const bushMeshesToRemove = [];
            this.scene.traverse((child) => {
                if (child.material === this.material) {
                    bushMeshesToRemove.push(child);
                }
            });
            bushMeshesToRemove.forEach((mesh) => {
                this.scene.remove(mesh);
                if (mesh.geometry) {
                    mesh.geometry.dispose();
                }
            });
        }
        this.bushManager = new BushManager_class_1.BushManager({
            material: this.material,
            samplerMesh: this.samplerMesh,
            maxLeaves: 1755,
        });
        this.spawnFromDefinitions();
    }
    initGUI() {
        if (!this.debugGUI)
            return;
        const controls = [
            { uniform: 'uShadowColor', label: 'Bush Color Shadow', type: 'color' },
            { uniform: 'uMidColor', label: 'Bush Color Mid', type: 'color' },
            { uniform: 'uHighlightColor', label: 'Bush Color Light', type: 'color' },
            {
                uniform: 'uBreezeSpeed',
                label: 'Breeze Speed',
                options: { min: 0, max: 20, step: 0.01 },
            },
            {
                uniform: 'uBreezeScale',
                label: 'Breeze Scale',
                options: { min: 0, max: 20, step: 0.01 },
            },
            {
                uniform: 'uBreezeStrength',
                label: 'Breeze Strength',
                options: { min: 0, max: 20, step: 0.01 },
            },
            {
                uniform: 'uSquallSpeed',
                label: 'Squall Speed',
                options: { min: 0, max: 20, step: 0.01 },
            },
            {
                uniform: 'uSquallScale',
                label: 'Squall Scale',
                options: { min: 0, max: 20, step: 0.01 },
            },
            {
                uniform: 'uSquallStrength',
                label: 'Squall Strength',
                options: { min: 0, max: 20, step: 0.01 },
            },
        ];
        controls.forEach((c) => {
            const uniformObj = this.material.uniforms[c.uniform];
            if (!uniformObj)
                return;
            const guiArgs = c.type === 'color'
                ? [uniformObj, 'value', { type: 'color', label: c.label }, 'Bush']
                : [uniformObj, 'value', { ...c.options, label: c.label }, 'Bush'];
            this.debugGUI.add(...guiArgs);
        });
    }
    update() {
        this.material.uniforms.uTime.value += 0.001;
        if (this.bushManager && typeof this.bushManager.update === 'function') {
            this.bushManager.update();
        }
    }
    dispose() {
        this.environmentTimeManager.offChange();
        this.seasonManager.offChange();
        if (this.bushManager && typeof this.bushManager.dispose === 'function') {
            this.bushManager.dispose();
        }
        if (this.material) {
            this.material.dispose();
        }
    }
}
exports.default = Bush;

  },
  "src/Game/World/Components/Camp/Camp.class.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Game_class_1 = require("../../../Game.class");
class Camp {
    constructor() {
        this.game = Game_class_1.default.getInstance();
        this.scene = this.game.scene;
        this.resources = this.game.resources;
        this.addCamp();
    }
    addCamp() {
        this.campModel = this.resources.items.campModel.scene;
        this.scene.add(this.campModel);
        this.campModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }
}
exports.default = Camp;

  },
  "src/Game/World/Components/FallingLeaves/FallingLeaves.class.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const FallingLeavesSystem_class_1 = require("./FallingLeavesSystem.class");
const Game_class_1 = require("../../../Game.class");
class FallingLeaves {
    constructor() {
        this.game = Game_class_1.default.getInstance();
        const leaf = this.game.resources.items.leafModel;
        const leafGeometry = leaf.scene.children[0].geometry;
        const tree1Bounds = {
            yMin: 1.0,
            yMax: 7.5,
            xRange: 6.0,
            zRange: -2.0,
            originX: -4.0,
            originZ: 10,
        };
        const tree2Bounds = {
            yMin: 1.0,
            yMax: 7.5,
            xRange: 6.0,
            zRange: -1.0,
            originX: 4.0,
            originZ: -10,
        };
        this.fallingLeavesSystem_1 = new FallingLeavesSystem_class_1.default(leafGeometry.clone(), tree1Bounds);
        this.fallingLeavesSystem_2 = new FallingLeavesSystem_class_1.default(leafGeometry.clone(), tree2Bounds);
    }
    update(delta) {
        this.fallingLeavesSystem_1.update(delta);
        this.fallingLeavesSystem_2.update(delta);
    }
    dispose() {
        this.fallingLeavesSystem_1.dispose();
        this.fallingLeavesSystem_2.dispose();
    }
}
exports.default = FallingLeaves;

  },
  "src/Game/World/Components/FallingLeaves/FallingLeavesSystem.class.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const THREE = require("three");
const Game_class_1 = require("../../../Game.class");
const SeasonManager_class_1 = require("../../Managers/SeasonManager/SeasonManager.class");
class FallingLeavesSystem {
    constructor(geometry, bounds) {
        this.game = Game_class_1.default.getInstance();
        this.count = 35;
        this.scene = this.game.scene;
        this.bounds = bounds;
        this.seasonManager = SeasonManager_class_1.default.getInstance();
        this.currentSeason = this.seasonManager.currentSeason;
        const leafColor = this.seasonManager.getColorConfig('fallingLeaves').color;
        this.material = new THREE.MeshStandardMaterial({
            color: leafColor,
        });
        this.mesh = new THREE.InstancedMesh(geometry, this.material, this.count);
        this.mesh.castShadow = true;
        this.scene.add(this.mesh);
        this.dummy = new THREE.Object3D();
        this.particles = [];
        for (let i = 0; i < this.count; i++) {
            this.particles.push({
                pos: new THREE.Vector3(),
                vel: new THREE.Vector3(),
                rot: new THREE.Euler(),
                rotSpeed: new THREE.Vector3(),
                scale: 1,
            });
            this.respawn(this.particles[i]);
            this.particles[i].pos.y =
                Math.random() * (bounds.yMax - bounds.yMin) + bounds.yMin;
        }
        this.seasonManager.onChange((newSeason, oldSeason) => {
            this.onSeasonChanged(newSeason, oldSeason);
        });
    }
    onSeasonChanged(newSeason, oldSeason) {
        this.currentSeason = newSeason;
        const leafColor = this.seasonManager.getColorConfig('fallingLeaves').color;
        this.material.color.copy(leafColor);
    }
    respawn(p) {
        p.pos.x = this.bounds.originX + (Math.random() - 0.5) * this.bounds.xRange;
        p.pos.y = this.bounds.yMax - Math.random();
        p.pos.z = this.bounds.originZ + (Math.random() - 0.5) * this.bounds.zRange;
        p.vel.set((Math.random() - 0.2) * 0.05, -(Math.random() * 0.01 + 0.02), (Math.random() - 0.7) * 0.05);
        p.rot.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
        p.rotSpeed.set((Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1);
        p.scale = 0.0;
    }
    update(dt) {
        const cappedDt = Math.min(dt, 0.1);
        for (let i = 0; i < this.count; i++) {
            const p = this.particles[i];
            p.pos.add(p.vel);
            p.rot.x += p.rotSpeed.x;
            p.rot.y += p.rotSpeed.y;
            p.rot.z += p.rotSpeed.z;
            if (p.scale < 0.8) {
                p.scale = THREE.MathUtils.lerp(p.scale, 0.8, Math.min(cappedDt * 2.0, 1.0));
            }
            p.pos.z -= Math.sin(p.pos.y) * 0.001;
            this.dummy.position.copy(p.pos);
            this.dummy.rotation.copy(p.rot);
            const s = p.scale;
            this.dummy.scale.set(s, s, s);
            this.dummy.updateMatrix();
            this.mesh.setMatrixAt(i, this.dummy.matrix);
            if (p.pos.y < 0.0) {
                this.respawn(p);
            }
        }
        this.mesh.instanceMatrix.needsUpdate = true;
    }
    dispose() {
        this.seasonManager.offChange();
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.material.dispose();
    }
}
exports.default = FallingLeavesSystem;

  },
  "src/Game/World/Components/Fire/Fire.class.js": function(module, exports, require) {
"use strict";
const __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
const __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
let _Fire_particleSystem, _Fire_fireMaterial, _Fire_smokeMaterial, _Fire_amberMaterial;
Object.defineProperty(exports, "__esModule", { value: true });
const THREE = require("three");
const Game_class_1 = require("../../../Game.class");
const vertex_glsl_1 = require("../../../../Shaders/Materials/fire/vertex.glsl");
const fragment_glsl_1 = require("../../../../Shaders/Materials/fire/fragment.glsl");
const MATH = require("../../../Utils/Math.class");
const PARTICLES = require("../../Systems/ParticleSystem.class");
const EnvironmentManager_class_1 = require("../../Managers/EnvironmentManager/EnvironmentManager.class");
const SeasonManager_class_1 = require("../../Managers/SeasonManager/SeasonManager.class");
class Fire {
    constructor() {
        _Fire_particleSystem.set(this, null);
        _Fire_fireMaterial.set(this, null);
        _Fire_smokeMaterial.set(this, null);
        _Fire_amberMaterial.set(this, null);
        this.game = Game_class_1.default.getInstance();
        this.scene = this.game.scene;
        this.renderer = this.game.renderer;
        this.camera = this.game.camera;
        this.resources = this.game.resources;
        this.debugGUI = this.game.debug;
        this.environmentTimeManager = EnvironmentManager_class_1.default.getInstance();
        this.seasonManager = SeasonManager_class_1.default.getInstance();
        this.envTime = this.environmentTimeManager.envTime;
        this.currentSeason = this.seasonManager.currentSeason;
        this.smokeAlphaConfig = this.seasonManager.getColorConfig('fire');
        this.flickerTime = 0;
        this.flickerSpeed = 10.0;
        this.flickerAmount = 0.4;
        this.noiseOffset1 = MATH.random() * 100;
        this.noiseOffset2 = MATH.random() * 100;
        this.fireEmitterParams = null;
        this.smokeEmitterParams = null;
        this.amberEmitterParams = null;
        const particleSettings = this.getInitialParticleSettings();
        this.originalFireEmissionRate = particleSettings.fireEmissionRate;
        this.originalAmberEmissionRate = particleSettings.amberEmissionRate;
        this.originalSmokeEmissionRate = particleSettings.smokeEmissionRate;
        this.originalSmokePosition = { x: -5.4, y: 1.9, z: -6.9 };
        this.rainySmokePosition = { x: -5.4, y: 0.6, z: -6.9 };
        this.rainySmokeEmissionRate = 8;
        this.originalSmokeColorStops = [
            { time: 0.0, value: new THREE.Color(0xfff1cc) },
            { time: 0.3, value: new THREE.Color(0xfffbf0) },
            { time: 1.0, value: new THREE.Color(0xffffff) },
        ];
        this.rainySmokeColorStops = [
            { time: 0.0, value: new THREE.Color(0x666666) },
            { time: 0.3, value: new THREE.Color(0x888888) },
            { time: 1.0, value: new THREE.Color(0xaaaaaa) },
        ];
        this._createDefaultStops();
        this.addFire();
        this.fireLightPresent = false;
        this.addFireLighting();
        this.isDebugMode = this.game.isDebugMode;
        if (this.isDebugMode) {
            this.initGUI();
        }
        this.environmentTimeManager.onChange((newValue, oldValue) => {
            this.onEnvTimeChanged(newValue, oldValue);
        });
        this.seasonManager.onChange((newSeason, oldSeason) => {
            this.onSeasonChanged(newSeason, oldSeason);
        });
        this.updateFireEffectsForSeason();
    }
    getInitialParticleSettings() {
        const defaults = {
            fireEmissionRate: 500,
            smokeEmissionRate: 50,
            amberEmissionRate: 30,
        };
        try {
            const savedSettings = localStorage.getItem('gameSettings');
            if (!savedSettings)
                return defaults;
            const settings = JSON.parse(savedSettings);
            const quality = settings.graphicsQuality || 'medium';
            if (quality === 'custom') {
                const customParticles = settings.customParticles || 500;
                return {
                    fireEmissionRate: customParticles,
                    smokeEmissionRate: Math.round(customParticles * 0.1),
                    amberEmissionRate: Math.round(customParticles * 0.06),
                };
            }
            const presetSettings = {
                low: {
                    fireEmissionRate: 350,
                    smokeEmissionRate: 35,
                    amberEmissionRate: 20,
                },
                medium: {
                    fireEmissionRate: 500,
                    smokeEmissionRate: 50,
                    amberEmissionRate: 30,
                },
                high: {
                    fireEmissionRate: 650,
                    smokeEmissionRate: 65,
                    amberEmissionRate: 40,
                },
                ultra: {
                    fireEmissionRate: 800,
                    smokeEmissionRate: 80,
                    amberEmissionRate: 50,
                },
            };
            return presetSettings[quality] || defaults;
        }
        catch (error) {
            console.warn('Failed to load particle settings from localStorage:', error);
            return defaults;
        }
    }
    _createDefaultStops() {
        this.fireSizeStops = [
            { time: 0.0, value: 15 },
            { time: 0.5, value: 60 },
            { time: 1.0, value: 5 },
        ];
        this.fireAlphaStops = [
            { time: 0.0, value: 0.0 },
            { time: 0.2, value: 1.0 },
            { time: 0.8, value: 0.8 },
            { time: 1.0, value: 0.0 },
        ];
        this.fireColorStops = [
            { time: 0.0, value: new THREE.Color(0x946110) },
            { time: 0.3, value: new THREE.Color(0x9f710f) },
            { time: 0.7, value: new THREE.Color(0xfd4700) },
            { time: 1.0, value: new THREE.Color(0xfc0000) },
        ];
        this.fireTwinkleStops = [
            { time: 0.0, value: 0.0 },
            { time: 0.3, value: 0.8 },
            { time: 1.0, value: 1.0 },
        ];
        this.smokeSizeStops = [
            { time: 0.0, value: 15 },
            { time: 0.5, value: 60 },
            { time: 1.0, value: 20 },
        ];
        const smokeAlphaValue = this.smokeAlphaConfig[this.envTime].smokeAlphaSecondStop;
        this.smokeAlphaStops = [
            { time: 0.0, value: 0.0 },
            { time: 0.1, value: smokeAlphaValue },
            { time: 0.55, value: 0.04 },
            { time: 1.0, value: 0.01 },
        ];
        this.smokeColorStops = [
            { time: 0.0, value: new THREE.Color(0xfff1cc) },
            { time: 0.3, value: new THREE.Color(0xfffbf0) },
            { time: 1.0, value: new THREE.Color(0xffffff) },
        ];
        this.smokeTwinkleStops = [
            { time: 0.0, value: 0.0 },
            { time: 1.0, value: 0.0 },
        ];
        this.amberSizeStops = [
            { time: 0.0, value: 0 },
            { time: 0.5, value: 0.75 },
            { time: 1.0, value: 0 },
        ];
        this.amberAlphaStops = [
            { time: 0.0, value: 0.0 },
            { time: 0.1, value: 0.9 },
            { time: 0.7, value: 0.4 },
            { time: 1.0, value: 0.0 },
        ];
        this.amberColorStops = [
            { time: 0.0, value: new THREE.Color(0xff0000) },
            { time: 0.4, value: new THREE.Color(0xff2424) },
            { time: 0.8, value: new THREE.Color(0xffd438) },
            { time: 1.0, value: new THREE.Color(0xff961f) },
        ];
        this.amberTwinkleStops = [
            { time: 0.0, value: 0.0 },
            { time: 0.5, value: 0.5 },
            { time: 1.0, value: 0.3 },
        ];
    }
    addFire() {
        this.createParticleMaterials();
        this.createParticleSystem();
    }
    createParticleMaterials() {
        this.createFireMaterial();
        this.createSmokeMaterial();
        this.createAmberMaterial();
    }
    _buildFireInterpolantsAndTextures() {
        this.fireSizeOverLife = new MATH.FloatInterpolat(this.fireSizeStops.map((s) => ({ time: s.time, value: s.value })));
        this.fireAlphaOverLife = new MATH.FloatInterpolat(this.fireAlphaStops.map((s) => ({ time: s.time, value: s.value })));
        this.fireColorOverLife = new MATH.ColorInterpolat(this.fireColorStops.map((s) => ({ time: s.time, value: s.value })));
        this.fireTwinkleOverLife = new MATH.FloatInterpolat(this.fireTwinkleStops.map((s) => ({ time: s.time, value: s.value })));
        const sizeTex = this.fireSizeOverLife.toTexture();
        const colorTex = this.fireColorOverLife.toTexture(this.fireAlphaOverLife);
        const twinkleTex = this.fireTwinkleOverLife.toTexture();
        if (__classPrivateFieldGet(this, _Fire_fireMaterial, "f")) {
            __classPrivateFieldGet(this, _Fire_fireMaterial, "f").uniforms.uSizeOverLife.value = sizeTex;
            __classPrivateFieldGet(this, _Fire_fireMaterial, "f").uniforms.uColorOverLife.value = colorTex;
            __classPrivateFieldGet(this, _Fire_fireMaterial, "f").uniforms.uTwinkleOverLife.value = twinkleTex;
            sizeTex.needsUpdate = true;
            colorTex.needsUpdate = true;
            twinkleTex.needsUpdate = true;
        }
    }
    _buildSmokeInterpolantsAndTextures() {
        this.smokeSizeOverLife = new MATH.FloatInterpolat(this.smokeSizeStops.map((s) => ({ time: s.time, value: s.value })));
        this.smokeAlphaOverLife = new MATH.FloatInterpolat(this.smokeAlphaStops.map((s) => ({ time: s.time, value: s.value })));
        this.smokeColorOverLife = new MATH.ColorInterpolat(this.smokeColorStops.map((s) => ({ time: s.time, value: s.value })));
        this.smokeTwinkleOverLife = new MATH.FloatInterpolat(this.smokeTwinkleStops.map((s) => ({ time: s.time, value: s.value })));
        const sizeTex = this.smokeSizeOverLife.toTexture();
        const colorTex = this.smokeColorOverLife.toTexture(this.smokeAlphaOverLife);
        const twinkleTex = this.smokeTwinkleOverLife.toTexture();
        if (__classPrivateFieldGet(this, _Fire_smokeMaterial, "f")) {
            __classPrivateFieldGet(this, _Fire_smokeMaterial, "f").uniforms.uSizeOverLife.value = sizeTex;
            __classPrivateFieldGet(this, _Fire_smokeMaterial, "f").uniforms.uColorOverLife.value = colorTex;
            __classPrivateFieldGet(this, _Fire_smokeMaterial, "f").uniforms.uTwinkleOverLife.value = twinkleTex;
            sizeTex.needsUpdate = true;
            colorTex.needsUpdate = true;
            twinkleTex.needsUpdate = true;
        }
    }
    _buildAmberInterpolantsAndTextures() {
        this.amberSizeOverLife = new MATH.FloatInterpolat(this.amberSizeStops.map((s) => ({ time: s.time, value: s.value })));
        this.amberAlphaOverLife = new MATH.FloatInterpolat(this.amberAlphaStops.map((s) => ({ time: s.time, value: s.value })));
        this.amberColorOverLife = new MATH.ColorInterpolat(this.amberColorStops.map((s) => ({ time: s.time, value: s.value })));
        this.amberTwinkleOverLife = new MATH.FloatInterpolat(this.amberTwinkleStops.map((s) => ({ time: s.time, value: s.value })));
        const sizeTex = this.amberSizeOverLife.toTexture();
        const colorTex = this.amberColorOverLife.toTexture(this.amberAlphaOverLife);
        const twinkleTex = this.amberTwinkleOverLife.toTexture();
        if (__classPrivateFieldGet(this, _Fire_amberMaterial, "f")) {
            __classPrivateFieldGet(this, _Fire_amberMaterial, "f").uniforms.uSizeOverLife.value = sizeTex;
            __classPrivateFieldGet(this, _Fire_amberMaterial, "f").uniforms.uColorOverLife.value = colorTex;
            __classPrivateFieldGet(this, _Fire_amberMaterial, "f").uniforms.uTwinkleOverLife.value = twinkleTex;
            sizeTex.needsUpdate = true;
            colorTex.needsUpdate = true;
            twinkleTex.needsUpdate = true;
        }
    }
    createFireMaterial() {
        const fireTexture = this.game.resources.items.fireTexture;
        if (fireTexture) {
            fireTexture.flipY = false;
            fireTexture.needsUpdate = true;
        }
        this._buildFireInterpolantsAndTextures();
        __classPrivateFieldSet(this, _Fire_fireMaterial, new THREE.ShaderMaterial({
            vertexShader: vertex_glsl_1.default,
            fragmentShader: fragment_glsl_1.default,
            uniforms: {
                uTime: { value: 0 },
                uParticleTexture: { value: fireTexture },
                uSizeOverLife: { value: this.fireSizeOverLife.toTexture() },
                uColorOverLife: {
                    value: this.fireColorOverLife.toTexture(this.fireAlphaOverLife),
                },
                uTwinkleOverLife: { value: this.fireTwinkleOverLife.toTexture() },
                uSizeMultiplier: { value: 1.0 },
                uColorTint: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
            },
            depthWrite: false,
            depthTest: true,
            transparent: true,
            blending: THREE.AdditiveBlending,
        }), "f");
        __classPrivateFieldGet(this, _Fire_fireMaterial, "f").uniforms.uSizeOverLife.value.needsUpdate = true;
        __classPrivateFieldGet(this, _Fire_fireMaterial, "f").uniforms.uColorOverLife.value.needsUpdate = true;
        __classPrivateFieldGet(this, _Fire_fireMaterial, "f").uniforms.uTwinkleOverLife.value.needsUpdate = true;
    }
    createSmokeMaterial() {
        const smokeTexture = this.game.resources.items.smokeTexture;
        if (smokeTexture) {
            smokeTexture.flipY = false;
            smokeTexture.needsUpdate = true;
        }
        this._buildSmokeInterpolantsAndTextures();
        __classPrivateFieldSet(this, _Fire_smokeMaterial, new THREE.ShaderMaterial({
            vertexShader: vertex_glsl_1.default,
            fragmentShader: fragment_glsl_1.default,
            uniforms: {
                uTime: { value: 0 },
                uParticleTexture: { value: smokeTexture },
                uSizeOverLife: { value: this.smokeSizeOverLife.toTexture() },
                uColorOverLife: {
                    value: this.smokeColorOverLife.toTexture(this.smokeAlphaOverLife),
                },
                uTwinkleOverLife: { value: this.smokeTwinkleOverLife.toTexture() },
                uSizeMultiplier: { value: 1.0 },
                uColorTint: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
            },
            depthWrite: false,
            depthTest: true,
            transparent: true,
            blending: THREE.NormalBlending,
        }), "f");
        __classPrivateFieldGet(this, _Fire_smokeMaterial, "f").uniforms.uSizeOverLife.value.needsUpdate = true;
        __classPrivateFieldGet(this, _Fire_smokeMaterial, "f").uniforms.uColorOverLife.value.needsUpdate = true;
        __classPrivateFieldGet(this, _Fire_smokeMaterial, "f").uniforms.uTwinkleOverLife.value.needsUpdate = true;
    }
    createAmberMaterial() {
        const amberTexture = this.game.resources.items.particleTexture;
        if (amberTexture) {
            amberTexture.flipY = false;
            amberTexture.needsUpdate = true;
        }
        this._buildAmberInterpolantsAndTextures();
        __classPrivateFieldSet(this, _Fire_amberMaterial, new THREE.ShaderMaterial({
            vertexShader: vertex_glsl_1.default,
            fragmentShader: fragment_glsl_1.default,
            uniforms: {
                uTime: { value: 0 },
                uParticleTexture: { value: amberTexture },
                uSizeOverLife: { value: this.amberSizeOverLife.toTexture() },
                uColorOverLife: {
                    value: this.amberColorOverLife.toTexture(this.amberAlphaOverLife),
                },
                uTwinkleOverLife: { value: this.amberTwinkleOverLife.toTexture() },
                uSizeMultiplier: { value: 1.0 },
                uColorTint: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
            },
            depthWrite: false,
            depthTest: true,
            transparent: true,
            blending: THREE.AdditiveBlending,
        }), "f");
        __classPrivateFieldGet(this, _Fire_amberMaterial, "f").uniforms.uSizeOverLife.value.needsUpdate = true;
        __classPrivateFieldGet(this, _Fire_amberMaterial, "f").uniforms.uColorOverLife.value.needsUpdate = true;
        __classPrivateFieldGet(this, _Fire_amberMaterial, "f").uniforms.uTwinkleOverLife.value.needsUpdate = true;
    }
    createParticleSystem() {
        __classPrivateFieldSet(this, _Fire_particleSystem, new PARTICLES.ParticleSystem(), "f");
        this.createFireEmitter();
        this.createSmokeEmitter();
        this.createAmberEmitter();
    }
    createFireEmitter() {
        const fireEmitterParams = new PARTICLES.EmitterParams();
        fireEmitterParams.shape = new PARTICLES.PointShape();
        fireEmitterParams.shape.position.set(-5.4, 1.0, -6.9);
        fireEmitterParams.shape.positionRadiusVariance = 0.3;
        fireEmitterParams.emissionRate = this.originalFireEmissionRate;
        fireEmitterParams.maxParticles = 500;
        fireEmitterParams.maxEmission = Infinity;
        fireEmitterParams.maxLife = 1;
        fireEmitterParams.gravity = false;
        fireEmitterParams.dragCoefficient = 0.5;
        fireEmitterParams.velocityMagnitude = 0.5;
        fireEmitterParams.velocityMagnitudeVariance = 0;
        fireEmitterParams.rotation = new THREE.Quaternion();
        fireEmitterParams.rotation.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 32);
        fireEmitterParams.rotationAngularVariance = Math.PI / 16;
        const fireRendererParams = new PARTICLES.ParticleRendererParams();
        fireRendererParams.maxParticles = fireEmitterParams.maxParticles;
        fireRendererParams.group = new THREE.Group();
        fireEmitterParams.renderer = new PARTICLES.ParticleRenderer();
        fireEmitterParams.renderer.initialize(__classPrivateFieldGet(this, _Fire_fireMaterial, "f"), fireRendererParams);
        const fireEmitter = new PARTICLES.Emitter(fireEmitterParams);
        this.fireEmitterParams = fireEmitterParams;
        this.fireEmitter = fireEmitter;
        this.fireRendererGroup = fireRendererParams.group;
        __classPrivateFieldGet(this, _Fire_particleSystem, "f").addEmitter(fireEmitter);
        this.scene.add(fireRendererParams.group);
    }
    createSmokeEmitter() {
        const smokeEmitterParams = new PARTICLES.EmitterParams();
        smokeEmitterParams.shape = new PARTICLES.PointShape();
        smokeEmitterParams.shape.position.set(this.originalSmokePosition.x, this.originalSmokePosition.y, this.originalSmokePosition.z);
        smokeEmitterParams.shape.positionRadiusVariance = 0.4;
        smokeEmitterParams.emissionRate = this.originalSmokeEmissionRate;
        smokeEmitterParams.maxParticles = 150;
        smokeEmitterParams.maxEmission = Infinity;
        smokeEmitterParams.maxLife = 3;
        smokeEmitterParams.gravity = false;
        smokeEmitterParams.gravityStrength = -0.3;
        smokeEmitterParams.dragCoefficient = 0.0;
        smokeEmitterParams.velocityMagnitude = 0.8;
        smokeEmitterParams.velocityMagnitudeVariance = 1.0;
        smokeEmitterParams.rotation = new THREE.Quaternion();
        smokeEmitterParams.rotation.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 8);
        smokeEmitterParams.rotationAngularVariance = Math.PI / 8;
        smokeEmitterParams.swirlX = 0.02;
        smokeEmitterParams.swirlZ = 0.01;
        smokeEmitterParams.onUpdate = (particle) => {
            const swirl = Math.sin(particle.life * 2 + particle.id * Math.PI) * 0.5;
            particle.velocity.x += swirl * (smokeEmitterParams.swirlX ?? 0.02);
            particle.velocity.z +=
                Math.cos(particle.life * 2 + particle.id * Math.PI) *
                    (smokeEmitterParams.swirlZ ?? 0.01);
        };
        const smokeRendererParams = new PARTICLES.ParticleRendererParams();
        smokeRendererParams.maxParticles = smokeEmitterParams.maxParticles;
        smokeRendererParams.group = new THREE.Group();
        smokeEmitterParams.renderer = new PARTICLES.ParticleRenderer();
        smokeEmitterParams.renderer.initialize(__classPrivateFieldGet(this, _Fire_smokeMaterial, "f"), smokeRendererParams);
        const smokeEmitter = new PARTICLES.Emitter(smokeEmitterParams);
        this.smokeEmitterParams = smokeEmitterParams;
        this.smokeEmitter = smokeEmitter;
        this.smokeRendererGroup = smokeRendererParams.group;
        __classPrivateFieldGet(this, _Fire_particleSystem, "f").addEmitter(smokeEmitter);
        this.scene.add(smokeRendererParams.group);
    }
    createAmberEmitter() {
        const amberEmitterParams = new PARTICLES.EmitterParams();
        amberEmitterParams.shape = new PARTICLES.PointShape();
        amberEmitterParams.shape.position.set(-5.4, 1.0, -6.9);
        amberEmitterParams.shape.positionRadiusVariance = 0.35;
        amberEmitterParams.emissionRate = this.originalAmberEmissionRate;
        amberEmitterParams.maxParticles = 120;
        amberEmitterParams.maxEmission = Infinity;
        amberEmitterParams.maxLife = 3;
        amberEmitterParams.gravity = true;
        amberEmitterParams.gravityStrength = -0.2;
        amberEmitterParams.dragCoefficient = 2.8;
        amberEmitterParams.velocityMagnitude = 0.12;
        amberEmitterParams.velocityMagnitudeVariance = 0.6;
        amberEmitterParams.rotation = new THREE.Quaternion();
        amberEmitterParams.rotation.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 12);
        amberEmitterParams.rotationAngularVariance = Math.PI / 6;
        amberEmitterParams.onUpdate = (particle) => {
            const drift = Math.sin(particle.life * 3 + particle.id * 0.5) * 0.3;
            particle.velocity.x += drift * 0.01;
            particle.velocity.z +=
                Math.cos(particle.life * 3 + particle.id * 0.5) * 0.005;
        };
        const amberRendererParams = new PARTICLES.ParticleRendererParams();
        amberRendererParams.maxParticles = amberEmitterParams.maxParticles;
        amberRendererParams.group = new THREE.Group();
        amberEmitterParams.renderer = new PARTICLES.ParticleRenderer();
        amberEmitterParams.renderer.initialize(__classPrivateFieldGet(this, _Fire_amberMaterial, "f"), amberRendererParams);
        const amberEmitter = new PARTICLES.Emitter(amberEmitterParams);
        this.amberEmitterParams = amberEmitterParams;
        this.amberEmitter = amberEmitter;
        this.amberRendererGroup = amberRendererParams.group;
        __classPrivateFieldGet(this, _Fire_particleSystem, "f").addEmitter(amberEmitter);
        this.scene.add(amberRendererParams.group);
    }
    addFireLighting() {
        this.fireLightPresent = true;
        this.firelight1OriginalIntensity = 4;
        this.fireLight = new THREE.PointLight(new THREE.Color(0.97, 0.42, 0.106), this.firelight1OriginalIntensity, 4, 2);
        this.fireLight.position.set(-5.5, 1.0, -7.0);
        this.scene.add(this.fireLight);
        this.firelight2OriginalIntensity = 2;
        this.fireLight2 = new THREE.PointLight(new THREE.Color(0.97, 0.5, 0.18), 2.0, 1.0, 2.0);
        this.fireLight2.position.set(-5.5, 0.5, -7.0);
        this.scene.add(this.fireLight2);
    }
    smoothNoise(x) {
        const primary = Math.sin(x);
        const secondary = Math.sin(x * 2.3) * 0.5;
        const tertiary = Math.sin(x * 4.7) * 0.25;
        return (primary + secondary + tertiary) / 1.5;
    }
    initGUI() {
        if (!this.debugGUI)
            return;
        this.debugGUI.add(this.fireLight, 'color', { type: 'color', label: 'Fire light color 1' }, 'Fire');
        this.debugGUI.add(this.fireLight2, 'color', { type: 'color', label: 'Fire light color 2' }, 'Fire');
        this.debugGUI.add(this, 'flickerSpeed', { min: 0.5, max: 40.0, step: 0.1, label: 'Flicker Speed' }, 'Fire');
        this.debugGUI.add(this, 'flickerAmount', { min: 0.0, max: 2.0, step: 0.01, label: 'Flicker Amount' }, 'Fire');
        this.debugGUI
            .add(this, 'firelight1OriginalIntensity', { min: 0, max: 10, step: 0.1, label: 'Light1 Intensity' }, 'Fire')
            .onChange((v) => {
            this.fireLight.intensity = v;
        });
        this.debugGUI
            .add(this, 'firelight2OriginalIntensity', { min: 0, max: 10, step: 0.1, label: 'Light2 Intensity' }, 'Fire')
            .onChange((v) => {
            this.fireLight2.intensity = v;
        });
        if (this.fireEmitterParams) {
            const f = 'Emitters/Fire';
            this.debugGUI.add(this.fireEmitterParams, 'emissionRate', { min: 0, max: 2000, step: 1, label: 'Emission Rate' }, f);
            this.debugGUI.add(this.fireEmitterParams, 'maxParticles', { min: 1, max: 2000, step: 1, label: 'Max Particles' }, f);
            this.debugGUI.add(this.fireEmitterParams, 'maxLife', { min: 0.05, max: 5, step: 0.01, label: 'Particle Life' }, f);
        }
        if (this.smokeEmitterParams) {
            const s = 'Emitters/Smoke';
            this.debugGUI.add(this.smokeEmitterParams, 'emissionRate', { min: 0, max: 500, step: 1, label: 'Emission Rate' }, s);
            this.debugGUI.add(this.smokeEmitterParams, 'maxLife', { min: 0.1, max: 10, step: 0.01, label: 'Particle Life' }, s);
        }
        if (this.amberEmitterParams) {
            const a = 'Emitters/Amber';
            this.debugGUI.add(this.amberEmitterParams, 'emissionRate', { min: 0, max: 500, step: 1, label: 'Emission Rate' }, a);
            this.debugGUI.add(this.amberEmitterParams, 'maxParticles', { min: 1, max: 500, step: 1, label: 'Max Particles' }, a);
            this.debugGUI.add(this.amberEmitterParams, 'maxLife', { min: 0.1, max: 5, step: 0.01, label: 'Particle Life' }, a);
        }
        this._addFireInterpolantGUI();
        this._addSmokeInterpolantGUI();
        this._addAmberInterpolantGUI();
    }
    _addFireInterpolantGUI() {
        const folder = 'Material/Fire';
        this.fireSizeStops.forEach((stop, i) => {
            this.debugGUI
                .add(stop, 'value', { min: 0, max: 200, step: 0.1, label: `Size @ ${stop.time}` }, folder)
                .onChange(() => this._buildFireInterpolantsAndTextures());
        });
        this.fireAlphaStops.forEach((stop, i) => {
            this.debugGUI
                .add(stop, 'value', { min: 0, max: 1, step: 0.01, label: `Alpha @ ${stop.time}` }, folder)
                .onChange(() => this._buildFireInterpolantsAndTextures());
        });
        this.fireColorStops.forEach((stop, i) => {
            const colorObj = { color: `#${stop.value.getHexString()}` };
            this.debugGUI
                .add(colorObj, 'color', { color: true, label: `Color @ ${stop.time}` }, folder)
                .onChange((hex) => {
                stop.value.set(hex);
                this._buildFireInterpolantsAndTextures();
            });
        });
        this.fireTwinkleStops.forEach((stop, i) => {
            this.debugGUI
                .add(stop, 'value', { min: 0, max: 2, step: 0.01, label: `Twinkle @ ${stop.time}` }, folder)
                .onChange(() => this._buildFireInterpolantsAndTextures());
        });
        this.debugGUI.add(__classPrivateFieldGet(this, _Fire_fireMaterial, "f").uniforms.uSizeMultiplier, 'value', { min: 0, max: 3, step: 0.01, label: 'Size Multiplier' }, folder);
        const tintVec = { r: 1.0, g: 1.0, b: 1.0 };
        this.debugGUI
            .add(tintVec, 'r', { min: 0, max: 2, step: 0.01, label: 'Tint R' }, folder)
            .onChange((v) => {
            __classPrivateFieldGet(this, _Fire_fireMaterial, "f").uniforms.uColorTint.value.x = v;
        });
        this.debugGUI
            .add(tintVec, 'g', { min: 0, max: 2, step: 0.01, label: 'Tint G' }, folder)
            .onChange((v) => {
            __classPrivateFieldGet(this, _Fire_fireMaterial, "f").uniforms.uColorTint.value.y = v;
        });
        this.debugGUI
            .add(tintVec, 'b', { min: 0, max: 2, step: 0.01, label: 'Tint B' }, folder)
            .onChange((v) => {
            __classPrivateFieldGet(this, _Fire_fireMaterial, "f").uniforms.uColorTint.value.z = v;
        });
    }
    _addSmokeInterpolantGUI() {
        const folder = 'Material/Smoke';
        this.smokeSizeStops.forEach((stop) => {
            this.debugGUI
                .add(stop, 'value', { min: 0, max: 200, step: 0.1, label: `Size @ ${stop.time}` }, folder)
                .onChange(() => this._buildSmokeInterpolantsAndTextures());
        });
        this.smokeAlphaStops.forEach((stop) => {
            this.debugGUI
                .add(stop, 'value', { min: 0, max: 1, step: 0.01, label: `Alpha @ ${stop.time}` }, folder)
                .onChange(() => this._buildSmokeInterpolantsAndTextures());
        });
        this.smokeColorStops.forEach((stop) => {
            const colorObj = { color: `#${stop.value.getHexString()}` };
            this.debugGUI
                .add(colorObj, 'color', { color: true, label: `Color @ ${stop.time}` }, folder)
                .onChange((hex) => {
                stop.value.set(hex);
                this._buildSmokeInterpolantsAndTextures();
            });
        });
        this.smokeTwinkleStops.forEach((stop) => {
            this.debugGUI
                .add(stop, 'value', { min: 0, max: 2, step: 0.01, label: `Twinkle @ ${stop.time}` }, folder)
                .onChange(() => this._buildSmokeInterpolantsAndTextures());
        });
        this.debugGUI.add(__classPrivateFieldGet(this, _Fire_smokeMaterial, "f").uniforms.uSizeMultiplier, 'value', { min: 0, max: 3, step: 0.01, label: 'Size Multiplier' }, folder);
    }
    _addAmberInterpolantGUI() {
        const folder = 'Material/Amber';
        this.amberSizeStops.forEach((stop) => {
            this.debugGUI
                .add(stop, 'value', { min: 0, max: 100, step: 0.1, label: `Size @ ${stop.time}` }, folder)
                .onChange(() => this._buildAmberInterpolantsAndTextures());
        });
        this.amberAlphaStops.forEach((stop) => {
            this.debugGUI
                .add(stop, 'value', { min: 0, max: 1, step: 0.01, label: `Alpha @ ${stop.time}` }, folder)
                .onChange(() => this._buildAmberInterpolantsAndTextures());
        });
        this.amberColorStops.forEach((stop) => {
            const colorObj = { color: `#${stop.value.getHexString()}` };
            this.debugGUI
                .add(colorObj, 'color', { color: true, label: `Color @ ${stop.time}` }, folder)
                .onChange((hex) => {
                stop.value.set(hex);
                this._buildAmberInterpolantsAndTextures();
            });
        });
        this.amberTwinkleStops.forEach((stop) => {
            this.debugGUI
                .add(stop, 'value', { min: 0, max: 2, step: 0.01, label: `Twinkle @ ${stop.time}` }, folder)
                .onChange(() => this._buildAmberInterpolantsAndTextures());
        });
        this.debugGUI.add(__classPrivateFieldGet(this, _Fire_amberMaterial, "f").uniforms.uSizeMultiplier, 'value', { min: 0, max: 3, step: 0.01, label: 'Size Multiplier' }, folder);
        const tintVec = { r: 1.0, g: 1.0, b: 1.0 };
        this.debugGUI
            .add(tintVec, 'r', { min: 0, max: 2, step: 0.01, label: 'Tint R' }, folder)
            .onChange((v) => {
            __classPrivateFieldGet(this, _Fire_amberMaterial, "f").uniforms.uColorTint.value.x = v;
        });
        this.debugGUI
            .add(tintVec, 'g', { min: 0, max: 2, step: 0.01, label: 'Tint G' }, folder)
            .onChange((v) => {
            __classPrivateFieldGet(this, _Fire_amberMaterial, "f").uniforms.uColorTint.value.y = v;
        });
        this.debugGUI
            .add(tintVec, 'b', { min: 0, max: 2, step: 0.01, label: 'Tint B' }, folder)
            .onChange((v) => {
            __classPrivateFieldGet(this, _Fire_amberMaterial, "f").uniforms.uColorTint.value.z = v;
        });
    }
    onEnvTimeChanged(newValue, oldValue) {
        this.envTime = newValue;
        this.updateSmokeAlpha();
    }
    onSeasonChanged(newSeason, oldSeason) {
        this.currentSeason = newSeason;
        this.smokeAlphaConfig = this.seasonManager.getColorConfig('fire');
        this.updateSmokeAlpha();
        this.updateFireEffectsForSeason();
    }
    updateFireEffectsForSeason() {
        const isRainySeason = this.currentSeason === 'rainy';
        if (this.fireEmitterParams) {
            this.fireEmitterParams.emissionRate = isRainySeason
                ? 0
                : this.originalFireEmissionRate;
        }
        if (this.amberEmitterParams) {
            this.amberEmitterParams.emissionRate = isRainySeason
                ? 0
                : this.originalAmberEmissionRate;
        }
        if (this.smokeEmitterParams) {
            this.smokeEmitterParams.emissionRate = isRainySeason
                ? this.rainySmokeEmissionRate
                : this.originalSmokeEmissionRate;
            const smokePos = isRainySeason
                ? this.rainySmokePosition
                : this.originalSmokePosition;
            this.smokeEmitterParams.shape.position.set(smokePos.x, smokePos.y, smokePos.z);
        }
        this.updateSmokeColorForSeason(isRainySeason);
        if (this.fireRendererGroup) {
            this.fireRendererGroup.visible = !isRainySeason;
        }
        if (this.amberRendererGroup) {
            this.amberRendererGroup.visible = !isRainySeason;
        }
        if (this.fireLight) {
            this.fireLight.visible = !isRainySeason;
        }
        if (this.fireLight2) {
            this.fireLight2.visible = !isRainySeason;
        }
    }
    updateSmokeColorForSeason(isRainySeason) {
        const colorStops = isRainySeason
            ? this.rainySmokeColorStops
            : this.originalSmokeColorStops;
        this.smokeColorStops.forEach((stop, index) => {
            if (colorStops[index]) {
                stop.value.copy(colorStops[index].value);
            }
        });
        this._buildSmokeInterpolantsAndTextures();
    }
    updateSmokeAlpha() {
        if (!this.smokeAlphaStops)
            return;
        const config = this.smokeAlphaConfig[this.envTime];
        this.smokeAlphaStops[1].value = config.smokeAlphaSecondStop;
        this._buildSmokeInterpolantsAndTextures();
    }
    updateParticles(delta, totalTimeElapsed) {
        if (!__classPrivateFieldGet(this, _Fire_particleSystem, "f"))
            return;
        __classPrivateFieldGet(this, _Fire_particleSystem, "f").update(delta, totalTimeElapsed);
    }
    updateFlickerLight(delta) {
        if (!this.fireLightPresent)
            return;
        this.flickerTime += delta;
        if (this.flickerTime > 628) {
            this.flickerTime -= 628;
        }
        const flicker1 = this.smoothNoise(this.flickerTime * this.flickerSpeed + this.noiseOffset1);
        const flicker2 = this.smoothNoise(this.flickerTime * this.flickerSpeed * 1.3 + this.noiseOffset2);
        const combinedFlicker = (flicker1 + flicker2 * 0.5) / 1.5;
        const intensityVariation = this.firelight1OriginalIntensity * this.flickerAmount;
        this.fireLight.intensity =
            this.firelight1OriginalIntensity + combinedFlicker * intensityVariation;
        const positionOffset = Math.sin(this.flickerTime * 2.0) * 0.1;
        this.fireLight.position.y = 1.0 + positionOffset;
        const flicker2Noise = this.smoothNoise(this.flickerTime * this.flickerSpeed * 0.8 + this.noiseOffset2 + 50);
        this.fireLight2.intensity =
            this.firelight2OriginalIntensity + flicker2Noise * this.flickerAmount * 2;
    }
    update(delta, totalTime) {
        this.updateParticles(delta, totalTime);
        this.updateFlickerLight(delta);
        if (__classPrivateFieldGet(this, _Fire_fireMaterial, "f"))
            __classPrivateFieldGet(this, _Fire_fireMaterial, "f").uniforms.uTime.value = totalTime;
        if (__classPrivateFieldGet(this, _Fire_smokeMaterial, "f"))
            __classPrivateFieldGet(this, _Fire_smokeMaterial, "f").uniforms.uTime.value = totalTime;
        if (__classPrivateFieldGet(this, _Fire_amberMaterial, "f"))
            __classPrivateFieldGet(this, _Fire_amberMaterial, "f").uniforms.uTime.value = totalTime;
    }
    dispose() {
        this.environmentTimeManager.offChange();
        this.seasonManager.offChange();
        if (__classPrivateFieldGet(this, _Fire_particleSystem, "f")) {
            __classPrivateFieldGet(this, _Fire_particleSystem, "f").dispose();
        }
        [__classPrivateFieldGet(this, _Fire_fireMaterial, "f"), __classPrivateFieldGet(this, _Fire_smokeMaterial, "f"), __classPrivateFieldGet(this, _Fire_amberMaterial, "f")].forEach((mat) => {
            if (mat)
                mat.dispose();
        });
        [this.fireLight, this.fireLight2].forEach((light) => {
            if (light) {
                light.dispose();
                this.scene.remove(light);
            }
        });
    }
}
_Fire_particleSystem = new WeakMap(), _Fire_fireMaterial = new WeakMap(), _Fire_smokeMaterial = new WeakMap(), _Fire_amberMaterial = new WeakMap();
exports.default = Fire;

  },
  "src/Game/World/Components/FireFlies/FireFlies.class.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const THREE = require("three");
const Game_class_1 = require("../../../Game.class");
const vertex_glsl_1 = require("../../../../Shaders/Materials/fireflies/vertex.glsl");
const fragment_glsl_1 = require("../../../../Shaders/Materials/fireflies/fragment.glsl");
const MATH = require("../../../Utils/Math.class");
const EnvironmentManager_class_1 = require("../../Managers/EnvironmentManager/EnvironmentManager.class");
class FireFlies {
    constructor() {
        this.game = Game_class_1.default.getInstance();
        this.sizes = this.game.sizes;
        this.scene = this.game.scene;
        this.resources = this.game.resources;
        this.environmentTimeManager = EnvironmentManager_class_1.default.getInstance();
        this.envTime = this.environmentTimeManager.envTime;
        this.addFireFlies();
        this.fireFlies.visible = this.environmentTimeManager.isNight();
        this.environmentTimeManager.onChange((newValue, oldValue) => {
            this.onEnvTimeChanged(newValue, oldValue);
        });
    }
    addFireFlies() {
        const particleTexture = this.game.resources.items.particleTextureNoAlpha;
        this.fireFliesMaterial = new THREE.ShaderMaterial({
            vertexShader: vertex_glsl_1.default,
            fragmentShader: fragment_glsl_1.default,
            uniforms: {
                uTime: { value: 0 },
                uResolution: {
                    value: new THREE.Vector2(this.sizes.width, this.sizes.height),
                },
                uTexture: {
                    value: particleTexture,
                },
                uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
                uSize: { value: 10.0 },
            },
            depthWrite: false,
            depthTest: true,
            transparent: true,
            blending: THREE.AdditiveBlending,
        });
        const fireFliesCount = 50;
        const minRadius = 9;
        const maxRadius = 16;
        this.fireFliesGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(fireFliesCount * 3);
        const scales = new Float32Array(fireFliesCount);
        for (let i = 0; i < fireFliesCount; i++) {
            const theta = MATH.random() * Math.PI * 2;
            const rInner2 = minRadius * minRadius;
            const rOuter2 = maxRadius * maxRadius;
            const r = Math.sqrt(MATH.random() * (rOuter2 - rInner2) + rInner2);
            const radialJitter = (MATH.random() - 0.5) * 0.6;
            const finalR = r + radialJitter;
            const x = finalR * Math.cos(theta);
            const z = finalR * Math.sin(theta);
            const y = 1.0 + (MATH.random() - 0.5) * 3.0;
            positions[i * 3 + 0] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
            scales[i] = MATH.random() * 1.0 + 0.5;
        }
        this.fireFliesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.fireFliesGeometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
        this.fireFlies = new THREE.Points(this.fireFliesGeometry, this.fireFliesMaterial);
        this.fireFlies.renderOrder = -1;
        this.scene.add(this.fireFlies);
    }
    onEnvTimeChanged(newValue, oldValue) {
        const isNight = newValue === 'night';
        if (this.fireFlies) {
            this.fireFlies.visible = isNight;
        }
    }
    update(elapsedTime) {
        if (!this.fireFlies || !this.fireFlies.visible)
            return;
        this.fireFliesMaterial.uniforms.uTime.value = elapsedTime;
    }
    dispose() {
        this.environmentTimeManager.offChange();
        if (this.fireFlies) {
            this.scene.remove(this.fireFlies);
            this.fireFliesGeometry.dispose();
            this.fireFliesMaterial.dispose();
        }
    }
}
exports.default = FireFlies;

  },
  "src/Game/World/Components/Fog/Fog.class.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const THREE = require("three");
const Game_class_1 = require("../../../Game.class");
const EnvironmentManager_class_1 = require("../../Managers/EnvironmentManager/EnvironmentManager.class");
const SeasonManager_class_1 = require("../../Managers/SeasonManager/SeasonManager.class");
class Fog {
    constructor(worldSize) {
        this.game = Game_class_1.default.getInstance();
        this.scene = this.game.scene;
        this.environmentTimeManager = EnvironmentManager_class_1.default.getInstance();
        this.seasonManager = SeasonManager_class_1.default.getInstance();
        this.envTime = this.environmentTimeManager.envTime;
        this.currentSeason = this.seasonManager.currentSeason;
        this.debugGUI = this.game.debug;
        this.worldSize = worldSize;
        this.fogNear = 47;
        this.fogFar = 57;
        this.fogColors = this.createFogColorPresets();
        this.initialize();
        this.environmentTimeManager.onChange((newValue) => {
            this.onEnvTimeChanged(newValue);
        });
        this.seasonManager.onChange((newSeason) => {
            this.onSeasonChanged(newSeason);
        });
    }
    createFogColorPresets() {
        return {
            spring: {
                day: new THREE.Color(0.19607843137254902, 0.5098039215686274, 0.803921568627451),
                night: new THREE.Color(0.0, 0.011, 0.039),
            },
            winter: {
                day: new THREE.Color(0.6, 0.702, 0.898),
                night: new THREE.Color(0, 0.007, 0.039),
            },
            autumn: {
                day: new THREE.Color(0.09019607843137255, 0.39215686274509803, 0.45098039215686275),
                night: new THREE.Color(0.0196078431372549, 0.00784313725490196, 0.011764705882352941),
            },
            rainy: {
                day: new THREE.Color(0.133, 0.223, 0.305),
                night: new THREE.Color(0.00392156862745098, 0.011764705882352941, 0.0196078431372549),
            },
        };
    }
    initialize() {
        const color = this.fogColors[this.currentSeason][this.envTime];
        this.scene.fog = new THREE.Fog(color, this.fogNear, this.fogFar);
        if (this.game.isDebugMode) {
            this.initGUI();
        }
    }
    onEnvTimeChanged(newValue) {
        this.envTime = newValue;
        this.updateFogColor();
    }
    onSeasonChanged(newSeason) {
        this.currentSeason = newSeason;
        this.updateFogColor();
    }
    updateFogColor() {
        if (!this.scene.fog)
            return;
        const targetColor = this.fogColors[this.currentSeason][this.envTime];
        this.scene.fog.color.copy(targetColor);
    }
    initGUI() {
        if (!this.debugGUI || !this.scene.fog)
            return;
        this.debugGUI.add(this.scene.fog, 'near', { min: 0, max: 100, step: 0.5, label: 'Fog Near' }, 'Fog');
        this.debugGUI.add(this.scene.fog, 'far', { min: 0, max: 100, step: 0.5, label: 'Fog Far' }, 'Fog');
        this.debugGUI.add(this.scene.fog, 'color', { type: 'color', label: 'Fog Color' }, 'Fog');
    }
    dispose() {
        this.environmentTimeManager.offChange();
        this.seasonManager.offChange();
        this.scene.fog = null;
    }
}
exports.default = Fog;

  },
  "src/Game/World/Components/Ground/Ground.class.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const THREE = require("three");
const Game_class_1 = require("../../../Game.class");
const BiomeManager_class_1 = require("../../Managers/BiomeManager/BiomeManager.class");
const GrassManager_class_1 = require("../../Managers/GrassManager/GrassManager.class");
const BufferGeometryUtils = require("three/addons/utils/BufferGeometryUtils.js");
const EnvironmentManager_class_1 = require("../../Managers/EnvironmentManager/EnvironmentManager.class");
const SeasonManager_class_1 = require("../../Managers/SeasonManager/SeasonManager.class");
const ground_vertex_common_chunk_glsl_1 = require("../../../../Shaders/Chunks/ground/ground.vertex_common_chunk.glsl");
const ground_vertex_begin_chunk_glsl_1 = require("../../../../Shaders/Chunks/ground/ground.vertex_begin_chunk.glsl");
const ground_fragment_common_chunk_glsl_1 = require("../../../../Shaders/Chunks/ground/ground.fragment_common_chunk.glsl");
const ground_fragment_color_chunk_glsl_1 = require("../../../../Shaders/Chunks/ground/ground.fragment_color_chunk.glsl");
const water_vertex_common_chunk_glsl_1 = require("../../../../Shaders/Chunks/water/water.vertex_common_chunk.glsl");
const water_vertex_begin_chunk_glsl_1 = require("../../../../Shaders/Chunks/water/water.vertex_begin_chunk.glsl");
const water_fragment_common_chunk_glsl_1 = require("../../../../Shaders/Chunks/water/water.fragment_common_chunk.glsl");
const water_fragment_color_chunk_glsl_1 = require("../../../../Shaders/Chunks/water/water.fragment_color_chunk.glsl");
class Ground {
    constructor({ groundSize = 11, gridCols = 3, gridRows = 3, gridSpacing = null, gridY = 0.0, } = {}) {
        this.game = Game_class_1.default.getInstance();
        this.scene = this.game.scene;
        this.resources = this.game.resources;
        this.GROUND_SIZE = groundSize;
        this.gridCols = gridCols;
        this.gridRows = gridRows;
        this.gridSpacing = gridSpacing ?? this.GROUND_SIZE;
        this.gridY = gridY;
        this.environmentTimeManager = EnvironmentManager_class_1.default.getInstance();
        this.seasonManager = SeasonManager_class_1.default.getInstance();
        this.envTime = this.environmentTimeManager.envTime;
        this.currentSeason = this.seasonManager.currentSeason;
        this.colorConfig = this.seasonManager.getColorConfig('ground');
        this.debugGUI = this.game.debug;
        this.WORLD_SIZE = this.gridCols * this.GROUND_SIZE;
        this.group = new THREE.Group();
        this.scene.add(this.group);
        this.biomeManager = new BiomeManager_class_1.BiomeManager(this.game, this.WORLD_SIZE);
        this.grassManager = new GrassManager_class_1.GrassManager(this.game, this.biomeManager, this.WORLD_SIZE, this.GROUND_SIZE, this.gridCols, this.gridRows, this.gridSpacing);
        this.setGrid();
        this.addWaterRipples();
        this.isDebugMode = this.game.isDebugMode;
        if (this.isDebugMode) {
            this.initGUI();
        }
        this.environmentTimeManager.onChange((newValue, oldValue) => {
            this.onEnvTimeChanged(newValue, oldValue);
        });
        this.seasonManager.onChange((newSeason, oldSeason) => {
            this.onSeasonChanged(newSeason, oldSeason);
        });
    }
    setGrid() {
        const segments = 1;
        this.gridGeometry = new THREE.PlaneGeometry(this.GROUND_SIZE, this.GROUND_SIZE, segments, segments);
        this.groundMaterial = new THREE.MeshStandardMaterial({
            roughness: 1.0,
            metalness: 0.0,
        });
        const biomeTexture = this.game.resources.items.grassPathDensityDataTexture;
        biomeTexture.wrapS = biomeTexture.wrapT = THREE.ClampToEdgeWrapping;
        const displacementTexture = this.game.resources.items.displacementMap;
        displacementTexture.wrapS = displacementTexture.wrapT =
            THREE.RepeatWrapping;
        const perlinNoise = this.game.resources.items.perlinNoise;
        perlinNoise.wrapS = perlinNoise.wrapT = THREE.RepeatWrapping;
        const groundRockMap = this.game.resources.items.groundRockMap;
        groundRockMap.wrapS = groundRockMap.wrapT = THREE.RepeatWrapping;
        const groundRockAO = this.game.resources.items.groundRockAOMap;
        groundRockAO.wrapS = groundRockAO.wrapT = THREE.RepeatWrapping;
        const colors = this.colorConfig[this.envTime];
        this.customGroundUniforms = {
            uDensityMap: { value: biomeTexture },
            uGroundSize: {
                value: new THREE.Vector3(this.WORLD_SIZE, 0, this.WORLD_SIZE),
            },
            uDisplacementMap: { value: displacementTexture },
            uPerlinNoise: { value: perlinNoise },
            uGroundRockMap: { value: groundRockMap },
            uGroundRockAO: { value: groundRockAO },
            uGroundColorLight: { value: colors.uGroundColorLight.clone() },
            uGroundColorDark: { value: colors.uGroundColorDark.clone() },
            uGroundColorBelowGrass: { value: colors.uGroundColorBelowGrass.clone() },
            uRockColor: { value: colors.uRockColor.clone() },
            uHeightMap: { value: groundRockMap },
            uRockTiling: { value: 6.0 },
            uWaterShallow: { value: colors.uWaterShallow.clone() },
            uWaterDeep: { value: colors.uWaterDeep.clone() },
            uWaterDepthIntensity: { value: 1.0 },
        };
        const configureTexture = (texture, repeat = 1) => {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(repeat, repeat);
            texture.minFilter = THREE.LinearMipmapLinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.anisotropy =
                this.game.renderer.rendererInstance.capabilities.getMaxAnisotropy();
            texture.generateMipmaps = true;
        };
        configureTexture(displacementTexture);
        configureTexture(perlinNoise);
        configureTexture(groundRockMap, this.customGroundUniforms.uRockTiling.value);
        configureTexture(groundRockAO, this.customGroundUniforms.uRockTiling.value);
        this.groundMaterial.onBeforeCompile = (shader) => {
            shader.uniforms = { ...shader.uniforms, ...this.customGroundUniforms };
            shader.vertexShader = shader.vertexShader.replace('#include <common>', ground_vertex_common_chunk_glsl_1.default);
            shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', ground_vertex_begin_chunk_glsl_1.default);
            shader.fragmentShader = shader.fragmentShader.replace('#include <common>', ground_fragment_common_chunk_glsl_1.default);
            shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', ground_fragment_color_chunk_glsl_1.default);
        };
        const geometries = [];
        const cols = 5;
        const rows = 5;
        const spacing = this.gridSpacing;
        const startX = -((cols - 1) / 2) * spacing;
        const startZ = -((rows - 1) / 2) * spacing;
        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                const x = startX + i * spacing;
                const z = startZ + j * spacing;
                const geo = this.gridGeometry.clone();
                geo.rotateX(-Math.PI / 2);
                geo.translate(x, this.gridY, z);
                geometries.push(geo);
            }
        }
        const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries);
        geometries.forEach((g) => g.dispose());
        mergedGeometry.computeVertexNormals();
        const groundMesh = new THREE.Mesh(mergedGeometry, this.groundMaterial);
        groundMesh.receiveShadow = true;
        this.group.add(groundMesh);
    }
    onEnvTimeChanged(newValue, oldValue) {
        this.envTime = newValue;
        this.updateColors();
    }
    onSeasonChanged(newSeason, oldSeason) {
        this.currentSeason = newSeason;
        this.colorConfig = this.seasonManager.getColorConfig('ground');
        this.updateColors();
    }
    updateColors() {
        if (!this.customGroundUniforms)
            return;
        const colors = this.colorConfig[this.envTime];
        this.customGroundUniforms.uGroundColorLight.value.copy(colors.uGroundColorLight);
        this.customGroundUniforms.uGroundColorDark.value.copy(colors.uGroundColorDark);
        this.customGroundUniforms.uGroundColorBelowGrass.value.copy(colors.uGroundColorBelowGrass);
        this.customGroundUniforms.uRockColor.value.copy(colors.uRockColor);
        this.customGroundUniforms.uWaterShallow.value.copy(colors.uWaterShallow);
        this.customGroundUniforms.uWaterDeep.value.copy(colors.uWaterDeep);
    }
    addWaterRipples() {
        this.waterRipplesGeo = new THREE.PlaneGeometry(this.GROUND_SIZE + 0.5, this.GROUND_SIZE + 2, 1, 1);
        this.waterRipplesMat = new THREE.MeshStandardMaterial({
            color: 'black',
            transparent: true,
        });
        const biomeTexture = this.game.resources.items.grassPathDensityDataTexture;
        biomeTexture.wrapS = biomeTexture.wrapT = THREE.ClampToEdgeWrapping;
        const waterDepthTexture = this.game.resources.items.waterDepthMap;
        waterDepthTexture.wrapS = waterDepthTexture.wrapT = THREE.RepeatWrapping;
        const perlinNoise = this.game.resources.items.perlinNoise;
        perlinNoise.wrapS = perlinNoise.wrapT = THREE.RepeatWrapping;
        this.customWaterRipplesUniforms = {
            uTime: { value: 0 },
            uDensityMap: { value: biomeTexture },
            uGroundSize: {
                value: new THREE.Vector3(this.WORLD_SIZE, 0, this.WORLD_SIZE),
            },
            uPerlinNoise: { value: perlinNoise },
            uWaterDepthTexture: { value: waterDepthTexture },
            uRipplesRatio: { value: 0.0 },
            uDensityMaskMin: { value: 0.05 },
            uDensityMaskMax: { value: 0.15 },
            uShoreMaskThreshold: { value: 0.4 },
            uNoiseScale1: { value: 3.0 },
            uNoiseScale2: { value: 5.0 },
            uNoiseSpeed1: { value: 0.5 },
            uNoiseSpeed2: { value: 0.3 },
            uNoiseMix1: { value: 0.6 },
            uNoiseMix2: { value: 0.4 },
            uNoiseDepthInfluence: { value: 0.3 },
            uRippleFrequency: { value: 12.0 },
            uRippleInnerEdge: { value: 0.05 },
            uRippleOuterEdge: { value: 0.4 },
            uBreakupMin: { value: 0.2 },
            uBreakupMax: { value: 0.75 },
            uWaterDepthFade: { value: 0.1 },
            uDiscardThreshold: { value: 0.45 },
            uRippleOpacity: { value: 2.5 },
            uSplashesRatio: { value: 0.0 },
            uSplashesNoiseFrequency: { value: 0.33 },
            uSplashesTimeFrequency: { value: 6.0 },
            uSplashesThickness: { value: 0.3 },
            uSplashesEdgeAttenuationLow: { value: 0.14 },
            uSplashesEdgeAttenuationHigh: { value: 1.0 },
            uSplashesCenterMin: { value: 0.0 },
            uSplashesCenterMax: { value: 0.5 },
            uIceRatio: { value: 0.0 },
            uIceNoiseFrequency: { value: 0.3 },
            uIceColor: { value: new THREE.Color(0.9, 0.95, 1.0) },
        };
        this.waterRipplesMat.onBeforeCompile = (shader) => {
            shader.uniforms = {
                ...shader.uniforms,
                ...this.customWaterRipplesUniforms,
            };
            shader.vertexShader = shader.vertexShader.replace('#include <common>', water_vertex_common_chunk_glsl_1.default);
            shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', water_vertex_begin_chunk_glsl_1.default);
            shader.fragmentShader = shader.fragmentShader.replace('#include <common>', water_fragment_common_chunk_glsl_1.default);
            shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', water_fragment_color_chunk_glsl_1.default);
        };
        this.ripples = new THREE.Mesh(this.waterRipplesGeo, this.waterRipplesMat);
        this.ripples.rotateX(-Math.PI / 2);
        this.ripples.position.set(-0.2, 0.1, 1.3);
        this.scene.add(this.ripples);
    }
    initGUI() {
        this.debugGUI.add(this.customGroundUniforms.uGroundColorLight, 'value', { type: 'color', label: 'Ground Color Light' }, 'Ground');
        this.debugGUI.add(this.customGroundUniforms.uGroundColorDark, 'value', { type: 'color', label: 'Ground Color Dark' }, 'Ground');
        this.debugGUI.add(this.customGroundUniforms.uGroundColorBelowGrass, 'value', { type: 'color', label: 'Ground Color Below Grass' }, 'Ground');
        this.debugGUI.add(this.customGroundUniforms.uRockColor, 'value', { type: 'color', label: 'Ground Rock' }, 'Ground');
        this.debugGUI.add(this.customGroundUniforms.uWaterShallow, 'value', { type: 'color', label: 'Water Shallow' }, 'Water');
        this.debugGUI.add(this.customGroundUniforms.uWaterDeep, 'value', { type: 'color', label: 'Water Deep' }, 'Water');
        this.debugGUI.add(this.customGroundUniforms.uWaterDepthIntensity, 'value', { min: 0.5, max: 3.0, step: 0.1, label: 'Water Depth Intensity' }, 'Water');
        this.debugGUI.add(this.customWaterRipplesUniforms.uRipplesRatio, 'value', { min: 0.0, max: 1.0, step: 0.01, label: 'Ripples Ratio' }, 'Water');
        this.debugGUI.add(this.customWaterRipplesUniforms.uShoreMaskThreshold, 'value', { min: 0.0, max: 1.0, step: 0.01, label: 'Ripple Shore Mask Threshold' }, 'Water');
        this.debugGUI.add(this.customWaterRipplesUniforms.uRippleFrequency, 'value', { min: 1.0, max: 30.0, step: 0.5, label: 'Ripple Frequency' }, 'Water');
        this.debugGUI.add(this.customWaterRipplesUniforms.uRippleOpacity, 'value', { min: 0.0, max: 5.0, step: 0.1, label: 'Ripple Opacity' }, 'Water');
        this.debugGUI.add(this.customWaterRipplesUniforms.uSplashesRatio, 'value', { min: 0.0, max: 1.0, step: 0.01, label: 'Splashes Ratio' }, 'Water Effects');
        this.debugGUI.add(this.customWaterRipplesUniforms.uSplashesNoiseFrequency, 'value', { min: 0.1, max: 2.0, step: 0.01, label: 'Splash Noise Frequency' }, 'Water Effects');
        this.debugGUI.add(this.customWaterRipplesUniforms.uSplashesTimeFrequency, 'value', { min: 0.0, max: 20.0, step: 0.1, label: 'Splash Time Frequency' }, 'Water Effects');
        this.debugGUI.add(this.customWaterRipplesUniforms.uSplashesCenterMin, 'value', { min: 0.0, max: 1.0, step: 0.01, label: 'Splash Center Min' }, 'Water Effects');
        this.debugGUI.add(this.customWaterRipplesUniforms.uSplashesCenterMax, 'value', { min: 0.0, max: 1.0, step: 0.01, label: 'Splash Center Max' }, 'Water Effects');
        this.debugGUI.add(this.customWaterRipplesUniforms.uIceRatio, 'value', { min: 0.0, max: 1.0, step: 0.01, label: 'Ice Ratio' }, 'Water Effects');
        this.debugGUI.add(this.customWaterRipplesUniforms.uIceNoiseFrequency, 'value', { min: 0.1, max: 2.0, step: 0.01, label: 'Ice Noise Frequency' }, 'Water Effects');
        this.debugGUI.add(this.customWaterRipplesUniforms.uIceColor, 'value', { type: 'color', label: 'Ice Color' }, 'Water Effects');
    }
    update() {
        if (this.grassManager) {
            this.grassManager.update();
        }
        this.customWaterRipplesUniforms.uTime.value += 0.001;
        const currentSeason = this.seasonManager.currentSeason;
        if (currentSeason === 'rainy') {
            this.customWaterRipplesUniforms.uRipplesRatio.value =
                THREE.MathUtils.lerp(this.customWaterRipplesUniforms.uRipplesRatio.value, 1.0, 0.05);
            this.customWaterRipplesUniforms.uSplashesRatio.value =
                THREE.MathUtils.lerp(this.customWaterRipplesUniforms.uSplashesRatio.value, 1.0, 0.05);
            this.customWaterRipplesUniforms.uIceRatio.value = THREE.MathUtils.lerp(this.customWaterRipplesUniforms.uIceRatio.value, 0.0, 0.02);
        }
        else if (currentSeason === 'winter') {
            this.customWaterRipplesUniforms.uRipplesRatio.value =
                THREE.MathUtils.lerp(this.customWaterRipplesUniforms.uRipplesRatio.value, 0.0, 0.05);
            this.customWaterRipplesUniforms.uSplashesRatio.value =
                THREE.MathUtils.lerp(this.customWaterRipplesUniforms.uSplashesRatio.value, 0.0, 0.05);
            this.customWaterRipplesUniforms.uIceRatio.value = THREE.MathUtils.lerp(this.customWaterRipplesUniforms.uIceRatio.value, 1.0, 0.05);
        }
        else {
            this.customWaterRipplesUniforms.uRipplesRatio.value =
                THREE.MathUtils.lerp(this.customWaterRipplesUniforms.uRipplesRatio.value, 1.0, 0.05);
            this.customWaterRipplesUniforms.uSplashesRatio.value =
                THREE.MathUtils.lerp(this.customWaterRipplesUniforms.uSplashesRatio.value, 0.0, 0.05);
            this.customWaterRipplesUniforms.uIceRatio.value = THREE.MathUtils.lerp(this.customWaterRipplesUniforms.uIceRatio.value, 0.0, 0.05);
        }
    }
    dispose() {
        this.environmentTimeManager.offChange();
        this.seasonManager.offChange();
        if (this.grassManager) {
            this.grassManager.dispose();
        }
        if (this.gridGeometry)
            this.gridGeometry.dispose();
        if (this.groundMaterial)
            this.groundMaterial.dispose();
        if (this.waterRipplesGeo)
            this.waterRipplesGeo.dispose();
        if (this.waterRipplesMat)
            this.waterRipplesMat.dispose();
        if (this.ripples)
            this.scene.remove(this.ripples);
        this.scene.remove(this.group);
    }
}
exports.default = Ground;

  },
  "src/Game/World/Components/Lighting/Lighting.class.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const THREE = require("three");
const Game_class_1 = require("../../../Game.class");
const EnvironmentManager_class_1 = require("../../Managers/EnvironmentManager/EnvironmentManager.class");
const SeasonManager_class_1 = require("../../Managers/SeasonManager/SeasonManager.class");
class Lighting {
    constructor({ helperEnabled = false } = {}) {
        this.game = Game_class_1.default.getInstance();
        this.scene = this.game.scene;
        this.resources = this.game.resources;
        this.helperEnabled = helperEnabled;
        this.environmentTimeManager = EnvironmentManager_class_1.default.getInstance();
        this.seasonManager = SeasonManager_class_1.default.getInstance();
        this.envTime = this.environmentTimeManager.envTime;
        this.currentSeason = this.seasonManager.currentSeason;
        this.debugGUI = this.game.debug;
        this.lights = {
            key: null,
            fill: null,
            ambient: null,
            rim: null,
            lamp: null,
        };
        this.presets = this.seasonManager.getColorConfig('lighting');
        this.initialize();
        this.isDebugMode = this.game.isDebugMode;
        if (this.isDebugMode) {
            this.initGUI();
        }
        this.environmentTimeManager.onChange((newValue, oldValue) => {
            this.onEnvTimeChanged(newValue, oldValue);
        });
        this.seasonManager.onChange((newSeason, oldSeason) => {
            this.onSeasonChanged(newSeason, oldSeason);
        });
    }
    createLightingPresets() {
        return {
            day: {
                key: {
                    color: 0xfff4e6,
                    intensity: 2.0,
                    position: [-15, 12, 8],
                    castShadow: true,
                },
                fill: {
                    color: 0x87ceeb,
                    intensity: 0.6,
                    position: [10, 5, -6],
                    castShadow: false,
                },
                ambient: {
                    color: 0xfff8f0,
                    intensity: 0.4,
                },
                rim: {
                    color: 0xffd7a3,
                    intensity: 0.3,
                    position: [5, 10, -12],
                    castShadow: false,
                },
                environment: {
                    intensity: 0.3,
                    backgroundIntensity: 1.0,
                    rotationY: 6.64,
                    rotationX: 3.95,
                    rotationZ: 6.27,
                },
                lamp: {
                    color: 0xffe286,
                    intensity: 0,
                    distance: 20,
                    decay: 1.5,
                    position: [2.9, 4.6, -5.5],
                    castShadow: false,
                },
            },
            night: {
                key: {
                    color: 0x3d5a7a,
                    intensity: 1.25,
                    position: [-10, 15, 5],
                    castShadow: true,
                },
                fill: {
                    color: 0x3d5a7a,
                    intensity: 0.15,
                    position: [10, 5, -6],
                    castShadow: false,
                },
                ambient: {
                    color: 0x4a5568,
                    intensity: 0.08,
                },
                rim: {
                    color: 0x7a8faa,
                    intensity: 0.1,
                    position: [5, 10, -12],
                    castShadow: false,
                },
                environment: {
                    intensity: 0.12,
                    backgroundIntensity: 1.0,
                    rotationY: 3.25,
                    rotationX: 4.65,
                    rotationZ: 4.67,
                },
                lamp: {
                    color: 0xffe286,
                    intensity: 5,
                    distance: 20,
                    decay: 1.5,
                    position: [2.9, 4.6, -5.5],
                    castShadow: false,
                },
            },
        };
    }
    initialize() {
        this.createLights();
        this.configureShadows();
        this.setupEnvironment();
        this.applyPreset(this.envTime);
        if (this.helperEnabled) {
            this.addHelpers();
        }
    }
    createLights() {
        this.lights.lamp = new THREE.PointLight();
        this.scene.add(this.lights.lamp);
        this.lights.key = new THREE.DirectionalLight();
        this.lights.key.name = 'keyLight';
        this.scene.add(this.lights.key);
        this.lights.fill = new THREE.DirectionalLight();
        this.lights.fill.name = 'fillLight';
        this.scene.add(this.lights.fill);
        this.lights.ambient = new THREE.AmbientLight();
        this.lights.ambient.name = 'ambientLight';
        this.scene.add(this.lights.ambient);
        this.lights.rim = new THREE.DirectionalLight();
        this.lights.rim.name = 'rimLight';
        this.scene.add(this.lights.rim);
    }
    configureShadows() {
        const shadowSize = 2048;
        const frustumSize = 12;
        this.lights.key.castShadow = true;
        this.lights.key.shadow.mapSize.set(shadowSize, shadowSize);
        this.lights.key.shadow.camera.left = -frustumSize;
        this.lights.key.shadow.camera.right = frustumSize;
        this.lights.key.shadow.camera.top = frustumSize;
        this.lights.key.shadow.camera.bottom = -frustumSize;
        this.lights.key.shadow.camera.near = 0.1;
        this.lights.key.shadow.camera.far = 60;
        this.lights.key.shadow.bias = -0.0001;
        this.lights.key.shadow.normalBias = 0.02;
        this.lights.key.shadow.radius = 2;
    }
    setupEnvironment() {
        this.environmentMap = {
            day: this.resources.items.environmentMapDayTexture,
            night: this.resources.items.environmentMapNightTexture,
            current: null,
            intensity: 0.3,
        };
        this.environmentMap.day.colorSpace = THREE.SRGBColorSpace;
        this.environmentMap.night.colorSpace = THREE.SRGBColorSpace;
    }
    onEnvTimeChanged(newValue, oldValue) {
        this.applyPreset(newValue);
    }
    onSeasonChanged(newSeason, oldSeason) {
        this.currentSeason = newSeason;
        this.presets = this.seasonManager.getColorConfig('lighting');
        this.applyPreset(this.envTime);
    }
    applyPreset(timeOfDay) {
        const preset = this.presets[timeOfDay];
        if (!preset) {
            console.warn(`Lighting preset '${timeOfDay}' not found`);
            return;
        }
        this.envTime = timeOfDay;
        this.lights.lamp.color.setHex(preset.lamp.color);
        this.lights.lamp.intensity = preset.lamp.intensity;
        this.lights.lamp.position.set(...preset.lamp.position);
        this.lights.lamp.castShadow = preset.lamp.castShadow;
        this.lights.lamp.distance = preset.lamp.distance;
        this.lights.lamp.decay = preset.lamp.decay;
        this.lights.key.color.setHex(preset.key.color);
        this.lights.key.intensity = preset.key.intensity;
        this.lights.key.position.set(...preset.key.position);
        this.lights.key.castShadow = preset.key.castShadow;
        this.lights.fill.color.setHex(preset.fill.color);
        this.lights.fill.intensity = preset.fill.intensity;
        this.lights.fill.position.set(...preset.fill.position);
        this.lights.ambient.color.setHex(preset.ambient.color);
        this.lights.ambient.intensity = preset.ambient.intensity;
        this.lights.rim.color.setHex(preset.rim.color);
        this.lights.rim.intensity = preset.rim.intensity;
        this.lights.rim.position.set(...preset.rim.position);
        this.updateEnvironment(timeOfDay, preset.environment);
    }
    updateEnvironment(timeOfDay, envSettings) {
        this.environmentMap.current = this.environmentMap[timeOfDay];
        this.environmentMap.intensity = envSettings.intensity;
        this.scene.environment = this.environmentMap.current;
        this.scene.background = null;
        this.scene.environmentIntensity = envSettings.intensity;
        this.envMapRotationY = envSettings.rotationY;
        this.envMapRotationX = envSettings.rotationX;
        this.envMapRotationZ = envSettings.rotationZ;
        this.scene.environmentRotation.y = this.envMapRotationY;
        this.scene.environmentRotation.x = this.envMapRotationX;
        this.scene.environmentRotation.z = this.envMapRotationZ;
        this.updateMaterials();
    }
    updateMaterials() {
        this.scene.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material) {
                const material = child.material;
                if (material instanceof THREE.MeshStandardMaterial ||
                    material instanceof THREE.MeshPhysicalMaterial) {
                    material.envMap = this.environmentMap.current;
                    material.envMapIntensity = this.environmentMap.intensity;
                    if (material.roughness > 0.6) {
                        material.roughness = 0.75;
                    }
                    material.needsUpdate = true;
                }
                else if (material instanceof THREE.MeshPhongMaterial ||
                    material instanceof THREE.MeshBasicMaterial) {
                    material.envMap = this.environmentMap.current;
                    material.reflectivity = this.envTime === 'day' ? 0.5 : 0.3;
                    material.needsUpdate = true;
                }
            }
        });
    }
    addHelpers() {
        const keyHelper = new THREE.DirectionalLightHelper(this.lights.key, 0.5);
        const fillHelper = new THREE.DirectionalLightHelper(this.lights.fill, 0.5);
        const rimHelper = new THREE.DirectionalLightHelper(this.lights.rim, 0.5);
        const lampHelper = new THREE.PointLightHelper(this.lights.lamp, 0.5);
        this.scene.add(keyHelper, fillHelper, rimHelper, lampHelper);
        this.shadowCameraHelper = new THREE.CameraHelper(this.lights.key.shadow.camera);
        this.scene.add(this.shadowCameraHelper);
    }
    initGUI() {
        if (!this.debugGUI)
            return;
        this.debugGUI.add(this.lights.key, 'color', { type: 'color', label: 'Key Light Color' }, 'Lighting');
        this.debugGUI.add(this.lights.key, 'intensity', { min: 0, max: 5.0, step: 0.05, label: 'Key Light Intensity' }, 'Lighting');
        this.debugGUI.add(this.lights.key.position, 'x', { min: -30, max: 30, step: 0.5, label: 'Key Light Position X' }, 'Lighting');
        this.debugGUI.add(this.lights.key.position, 'y', { min: 0, max: 30, step: 0.5, label: 'Key Light Position Y' }, 'Lighting');
        this.debugGUI.add(this.lights.key.position, 'z', { min: -30, max: 30, step: 0.5, label: 'Key Light Position Z' }, 'Lighting');
        this.debugGUI.add(this.lights.fill, 'color', { type: 'color', label: 'Fill Light Color' }, 'Lighting');
        this.debugGUI.add(this.lights.fill, 'intensity', { min: 0, max: 2.0, step: 0.05, label: 'Fill Light Intensity' }, 'Lighting');
        this.debugGUI.add(this.lights.fill.position, 'x', { min: -30, max: 30, step: 0.5, label: 'Fill Light Position X' }, 'Lighting');
        this.debugGUI.add(this.lights.fill.position, 'y', { min: 0, max: 30, step: 0.5, label: 'Fill Light Position Y' }, 'Lighting');
        this.debugGUI.add(this.lights.fill.position, 'z', { min: -30, max: 30, step: 0.5, label: 'Fill Light Position Z' }, 'Lighting');
        this.debugGUI.add(this.lights.ambient, 'color', { type: 'color', label: 'Ambient Light Color' }, 'Lighting');
        this.debugGUI.add(this.lights.ambient, 'intensity', { min: 0, max: 2.0, step: 0.05, label: 'Ambient Light Intensity' }, 'Lighting');
        this.debugGUI.add(this.lights.rim, 'color', { type: 'color', label: 'Rim Light Color' }, 'Lighting');
        this.debugGUI.add(this.lights.rim, 'intensity', { min: 0, max: 2.0, step: 0.05, label: 'Rim Light Intensity' }, 'Lighting');
        this.debugGUI.add(this.lights.rim.position, 'x', { min: -30, max: 30, step: 0.5, label: 'Rim Light Position X' }, 'Lighting');
        this.debugGUI.add(this.lights.rim.position, 'y', { min: 0, max: 30, step: 0.5, label: 'Rim Light Position Y' }, 'Lighting');
        this.debugGUI.add(this.lights.rim.position, 'z', { min: -30, max: 30, step: 0.5, label: 'Rim Light Position Z' }, 'Lighting');
        this.debugGUI.add(this.environmentMap, 'intensity', {
            min: 0,
            max: 2.0,
            step: 0.05,
            label: 'Environment Intensity',
            onChange: () => this.updateMaterials(),
        }, 'Lighting');
        this.debugGUI.add(this, 'envMapRotationY', {
            min: 0,
            max: 10,
            step: 0.01,
            label: 'Environment Rotation Y',
            onChange: () => {
                this.scene.environmentRotation.y = this.envMapRotationY;
                this.scene.backgroundRotation.y = this.envMapRotationY;
            },
        }, 'Lighting');
        this.debugGUI.add(this, 'envMapRotationX', {
            min: 0,
            max: 10,
            step: 0.01,
            label: 'Environment Rotation X',
            onChange: () => {
                this.scene.environmentRotation.x = this.envMapRotationX;
                this.scene.backgroundRotation.x = this.envMapRotationX;
            },
        }, 'Lighting');
        this.debugGUI.add(this, 'envMapRotationZ', {
            min: 0,
            max: 10,
            step: 0.01,
            label: 'Environment Rotation Z',
            onChange: () => {
                this.scene.environmentRotation.z = this.envMapRotationZ;
                this.scene.backgroundRotation.z = this.envMapRotationZ;
            },
        }, 'Lighting');
    }
    dispose() {
        this.environmentTimeManager.offChange();
        this.seasonManager.offChange();
        Object.values(this.lights).forEach((light) => {
            if (light) {
                light.dispose();
                this.scene.remove(light);
            }
        });
        if (this.shadowCameraHelper) {
            this.scene.remove(this.shadowCameraHelper);
        }
        // Dispose debug helpers
        ['keyHelper', 'fillHelper', 'rimHelper', 'lampHelper'].forEach((key) => {
            if (this[key]) {
                this[key].dispose?.();
                this.scene.remove(this[key]);
            }
        });
        // Dispose environment map textures
        if (this.scene.environment) {
            this.scene.environment.dispose();
            this.scene.environment = null;
        }
    }
}
exports.default = Lighting;

  },
  "src/Game/World/Components/Rain/Rain.class.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RainSystem_class_1 = require("./RainSystem.class");
const Game_class_1 = require("../../../Game.class");
const SeasonManager_class_1 = require("../../Managers/SeasonManager/SeasonManager.class");
class Rain {
    constructor() {
        this.game = Game_class_1.default.getInstance();
        this.seasonManager = SeasonManager_class_1.default.getInstance();
        const rainBounds = {
            yMin: 15.0,
            yMax: 20.0,
            xRange: 40.0,
            zRange: 40.0,
            originX: 0.0,
            originZ: 0.0,
        };
        this.rainSystem = new RainSystem_class_1.default(rainBounds);
        this.seasonManager.onChange((newSeason, oldSeason) => {
            this.onSeasonChanged(newSeason, oldSeason);
        });
        this.updateVisibility();
    }
    onSeasonChanged(newSeason, oldSeason) {
        this.updateVisibility();
    }
    updateVisibility() {
        const isRainySeason = this.seasonManager.currentSeason === 'rainy';
        this.rainSystem.setVisible(isRainySeason);
    }
    update(delta, elapsedTime) {
        this.rainSystem.update(delta, elapsedTime);
    }
    dispose() {
        this.seasonManager.offChange();
        this.rainSystem.dispose();
    }
}
exports.default = Rain;

  },
  "src/Game/World/Components/Rain/RainSystem.class.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const THREE = require("three");
const Game_class_1 = require("../../../Game.class");
const SeasonManager_class_1 = require("../../Managers/SeasonManager/SeasonManager.class");
class RainSystem {
    constructor(bounds) {
        this.game = Game_class_1.default.getInstance();
        this.scene = this.game.scene;
        this.bounds = bounds;
        this.seasonManager = SeasonManager_class_1.default.getInstance();
        this.count = 800;
        this.visible = false;
        this.createRainGeometry();
        this.createRainMaterial();
        this.createRainMesh();
        this.initializeParticles();
    }
    createRainGeometry() {
        this.geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.count * 6);
        const colors = new Float32Array(this.count * 6);
        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }
    createRainMaterial() {
        this.material = new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
        });
    }
    createRainMesh() {
        this.mesh = new THREE.LineSegments(this.geometry, this.material);
        this.mesh.visible = this.visible;
        this.scene.add(this.mesh);
    }
    initializeParticles() {
        this.particles = [];
        for (let i = 0; i < this.count; i++) {
            this.particles.push({
                pos: new THREE.Vector3(),
                vel: new THREE.Vector3(),
                life: 1.0,
                maxLife: 1.0,
                spawnDelay: Math.random() * 2.0,
            });
            this.respawnParticle(this.particles[i]);
            this.particles[i].pos.y =
                this.bounds.yMin +
                    Math.random() * (this.bounds.yMax - this.bounds.yMin + 10);
        }
        this.updateGeometry();
    }
    respawnParticle(particle) {
        particle.pos.x =
            this.bounds.originX + (Math.random() - 0.5) * this.bounds.xRange;
        particle.pos.y = this.bounds.yMax + Math.random() * 5.0;
        particle.pos.z =
            this.bounds.originZ + (Math.random() - 0.5) * this.bounds.zRange;
        particle.vel.set((Math.random() - 0.5) * 0.2, -6.0 - Math.random() * 6.0, (Math.random() - 0.5) * 0.2);
        particle.life = particle.maxLife;
        particle.spawnDelay = 0;
    }
    updateGeometry() {
        const positions = this.geometry.attributes.position.array;
        const colors = this.geometry.attributes.color.array;
        const direction = new THREE.Vector3();
        const rainColor = this.getRainColor();
        for (let i = 0; i < this.count; i++) {
            const particle = this.particles[i];
            const i6 = i * 6;
            if (particle.spawnDelay > 0) {
                positions[i6] = positions[i6 + 3] = 0;
                positions[i6 + 1] = positions[i6 + 4] = -100;
                positions[i6 + 2] = positions[i6 + 5] = 0;
                colors[i6] = colors[i6 + 1] = colors[i6 + 2] = 0;
                colors[i6 + 3] = colors[i6 + 4] = colors[i6 + 5] = 0;
                continue;
            }
            const dropLength = Math.min(particle.vel.length() * 0.08, 0.4);
            direction.copy(particle.vel).normalize();
            positions[i6] = particle.pos.x;
            positions[i6 + 1] = particle.pos.y;
            positions[i6 + 2] = particle.pos.z;
            positions[i6 + 3] = particle.pos.x - direction.x * dropLength;
            positions[i6 + 4] = particle.pos.y - direction.y * dropLength;
            positions[i6 + 5] = particle.pos.z - direction.z * dropLength;
            const baseAlpha = 0.8;
            const fadeAlpha = 0.3;
            colors[i6] = rainColor.r * baseAlpha;
            colors[i6 + 1] = rainColor.g * baseAlpha;
            colors[i6 + 2] = rainColor.b * baseAlpha;
            colors[i6 + 3] = rainColor.r * fadeAlpha;
            colors[i6 + 4] = rainColor.g * fadeAlpha;
            colors[i6 + 5] = rainColor.b * fadeAlpha;
        }
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;
    }
    getRainColor() {
        const season = this.seasonManager.currentSeason;
        switch (season) {
            case 'rainy':
                return new THREE.Color(0.7, 0.8, 0.9);
            case 'winter':
                return new THREE.Color(0.9, 0.9, 1.0);
            case 'autumn':
                return new THREE.Color(0.8, 0.8, 0.9);
            default:
                return new THREE.Color(0.7, 0.8, 0.9);
        }
    }
    setVisible(visible) {
        this.visible = visible;
        if (this.mesh) {
            this.mesh.visible = visible;
        }
    }
    update(delta, elapsedTime) {
        if (!this.visible)
            return;
        const cappedDt = Math.min(delta, 0.2);
        for (let i = 0; i < this.count; i++) {
            const particle = this.particles[i];
            if (particle.spawnDelay > 0) {
                particle.spawnDelay -= cappedDt;
                continue;
            }
            particle.pos.addScaledVector(particle.vel, cappedDt);
            const windStrength = 0.02;
            particle.pos.x +=
                Math.sin(elapsedTime * 1.5 + particle.pos.z * 0.05) *
                    windStrength *
                    cappedDt;
            particle.pos.z +=
                Math.cos(elapsedTime * 1.2 + particle.pos.x * 0.03) *
                    windStrength *
                    cappedDt;
            if (particle.pos.y < -2.0) {
                this.respawnParticle(particle);
                particle.spawnDelay = Math.random() * 0.1;
            }
        }
        this.updateGeometry();
    }
    dispose() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.geometry.dispose();
            this.material.dispose();
        }
    }
}
exports.default = RainSystem;

  },
  "src/Game/World/Components/Rocks/Rocks.class.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Game_class_1 = require("../../../Game.class");
const THREE = require("three");
const EnvironmentManager_class_1 = require("../../Managers/EnvironmentManager/EnvironmentManager.class");
const SeasonManager_class_1 = require("../../Managers/SeasonManager/SeasonManager.class");
const rocks_vertex_common_chunk_glsl_1 = require("../../../../Shaders/Chunks/rocks/rocks.vertex_common_chunk.glsl");
const rocks_vertex_begin_chunk_glsl_1 = require("../../../../Shaders/Chunks/rocks/rocks.vertex_begin_chunk.glsl");
const rocks_fragment_common_chunk_glsl_1 = require("../../../../Shaders/Chunks/rocks/rocks.fragment_common_chunk.glsl");
const rocks_fragment_color_chunk_glsl_1 = require("../../../../Shaders/Chunks/rocks/rocks.fragment_color_chunk.glsl");
class Rocks {
    constructor() {
        this.game = Game_class_1.default.getInstance();
        this.scene = this.game.scene;
        this.resources = this.game.resources;
        this.debugGUI = this.game.debug;
        this.environmentTimeManager = EnvironmentManager_class_1.default.getInstance();
        this.seasonManager = SeasonManager_class_1.default.getInstance();
        this.envTime = this.environmentTimeManager.envTime;
        this.currentSeason = this.seasonManager.currentSeason;
        this.addRocks();
        this.isDebugMode = this.game.isDebugMode;
        if (this.isDebugMode) {
            this.initGUI();
        }
        this.environmentTimeManager.onChange((newValue, oldValue) => {
            this.onEnvTimeChanged(newValue, oldValue);
        });
        this.seasonManager.onChange((newSeason, oldSeason) => {
            this.onSeasonChanged(newSeason, oldSeason);
        });
    }
    onEnvTimeChanged(newValue, oldValue) {
        this.envTime = newValue;
        this.updateColors();
    }
    onSeasonChanged(newSeason, oldSeason) {
        this.currentSeason = newSeason;
        this.updateColors();
    }
    updateColors() {
        const colors = this.seasonManager.getColorConfig('rocks', this.envTime);
        if (!colors || !this.customRockUniforms)
            return;
        this.customRockUniforms.uRockColor1.value.copy(colors.uRockColor1);
        this.customRockUniforms.uRockColor2.value.copy(colors.uRockColor2);
        this.customRockUniforms.uRockColor3.value.copy(colors.uRockColor3);
        this.customRockUniforms.uMossColor1.value.copy(colors.uMossColor1);
        this.customRockUniforms.uMossColor2.value.copy(colors.uMossColor2);
        this.customRockUniforms.uMossColor3.value.copy(colors.uMossColor3);
    }
    addRocks() {
        this.rocksModel = this.resources.items.rocksModel.scene;
        this.scene.add(this.rocksModel);
        this.rocksMaterial = new THREE.MeshStandardMaterial({
            roughness: 1.0,
            metalness: 0,
        });
        this.rocksModel.traverse((child) => {
            if (child.isMesh) {
                child.material = this.rocksMaterial;
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        const displacementTexture = this.game.resources.items.displacementMapBlur;
        displacementTexture.wrapS = displacementTexture.wrapT =
            THREE.RepeatWrapping;
        const perlinNoise = this.game.resources.items.perlinNoise;
        perlinNoise.wrapS = perlinNoise.wrapT = THREE.RepeatWrapping;
        const colors = this.seasonManager.getColorConfig('rocks', this.envTime);
        this.customRockUniforms = {
            uDisplacementMap: { value: displacementTexture },
            uPerlinNoise: { value: perlinNoise },
            uRockColor1: { value: colors.uRockColor1.clone() },
            uRockColor2: { value: colors.uRockColor2.clone() },
            uRockColor3: { value: colors.uRockColor3.clone() },
            uMossColor1: { value: colors.uMossColor1.clone() },
            uMossColor2: { value: colors.uMossColor2.clone() },
            uMossColor3: { value: colors.uMossColor3.clone() },
            uMossNoiseFactor: { value: 1.2 },
            uMossVisibility: { value: 3.0 },
        };
        this.rocksMaterial.onBeforeCompile = (shader) => {
            shader.uniforms = { ...shader.uniforms, ...this.customRockUniforms };
            shader.vertexShader = shader.vertexShader.replace('#include <common>', rocks_vertex_common_chunk_glsl_1.default);
            shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', rocks_vertex_begin_chunk_glsl_1.default);
            shader.fragmentShader = shader.fragmentShader.replace('#include <common>', rocks_fragment_common_chunk_glsl_1.default);
            shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', rocks_fragment_color_chunk_glsl_1.default);
        };
    }
    initGUI() {
        this.debugGUI.add(this.customRockUniforms.uRockColor1, 'value', { type: 'color', label: 'Rock Color Light' }, 'Rock');
        this.debugGUI.add(this.customRockUniforms.uRockColor2, 'value', { type: 'color', label: 'Rock Color Dark' }, 'Rock');
        this.debugGUI.add(this.customRockUniforms.uRockColor3, 'value', { type: 'color', label: 'Rock Color Dark Crevices' }, 'Rock');
        this.debugGUI.add(this.customRockUniforms.uMossColor1, 'value', { type: 'color', label: 'Rock Moss Color' }, 'Rock');
        this.debugGUI.add(this.customRockUniforms.uMossColor2, 'value', { type: 'color', label: 'Rock Moss Color2' }, 'Rock');
        this.debugGUI.add(this.customRockUniforms.uMossColor3, 'value', { type: 'color', label: 'Rock Moss Color3' }, 'Rock');
        this.debugGUI.add(this.customRockUniforms.uMossNoiseFactor, 'value', { min: 0.1, max: 100.0, step: 0.01, label: 'Rock Moss Noise Factor' }, 'Rock');
        this.debugGUI.add(this.customRockUniforms.uMossVisibility, 'value', { min: 0.0, max: 5.0, step: 0.01, label: 'Rock Moss Noise Visibility' }, 'Rock');
    }
    dispose() {
        this.environmentTimeManager.offChange();
        this.seasonManager.offChange();
    }
}
exports.default = Rocks;

  },
  "src/Game/World/Components/Skydome/Skydome.class.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const THREE = require("three");
const Game_class_1 = require("../../../Game.class");
const EnvironmentManager_class_1 = require("../../Managers/EnvironmentManager/EnvironmentManager.class");
const SeasonManager_class_1 = require("../../Managers/SeasonManager/SeasonManager.class");
const vertex_glsl_1 = require("../../../../Shaders/Materials/skydome/vertex.glsl");
const fragment_glsl_1 = require("../../../../Shaders/Materials/skydome/fragment.glsl");
class Skydome {
    constructor() {
        this.game = Game_class_1.default.getInstance();
        this.scene = this.game.scene;
        this.environmentTimeManager = EnvironmentManager_class_1.default.getInstance();
        this.seasonManager = SeasonManager_class_1.default.getInstance();
        this.envTime = this.environmentTimeManager.envTime;
        this.currentSeason = this.seasonManager.currentSeason;
        this.debugGUI = this.game.debug;
        this.skydome = null;
        this.skydomeMaterial = null;
        this.skyColors = this.createSkyColorPresets();
        this.initialize();
        this.environmentTimeManager.onChange((newValue) => {
            this.onEnvTimeChanged(newValue);
        });
        this.seasonManager.onChange((newSeason) => {
            this.onSeasonChanged(newSeason);
        });
    }
    createSkyColorPresets() {
        return {
            spring: {
                day: {
                    zenithColor: new THREE.Color(0.0, 0.35, 0.82),
                    horizonColor: new THREE.Color(0.46, 0.74, 0.93),
                    groundColor: new THREE.Color(0.04, 0.55, 0.65),
                    sunColor: new THREE.Color(0.639, 0.494, 0.058),
                    sunGlowColor: new THREE.Color(1.0, 0.635, 0),
                },
                night: {
                    zenithColor: new THREE.Color(0.02, 0.05, 0.15),
                    horizonColor: new THREE.Color(0.05, 0.1, 0.25),
                    groundColor: new THREE.Color(0.1, 0.15, 0.3),
                    moonColor: new THREE.Color(0.95, 0.95, 1.0),
                    moonGlowColor: new THREE.Color(0x738ec4),
                    starColor: new THREE.Color(1.0, 1.0, 1.0),
                },
            },
            winter: {
                day: {
                    zenithColor: new THREE.Color(0.4, 0.6, 0.9),
                    horizonColor: new THREE.Color(0.8, 0.85, 0.95),
                    groundColor: new THREE.Color(0.9, 0.92, 0.98),
                    sunColor: new THREE.Color(0.95, 0.95, 1.0),
                    sunGlowColor: new THREE.Color(0.8, 0.9, 1.0),
                },
                night: {
                    zenithColor: new THREE.Color(0.01, 0.03, 0.12),
                    horizonColor: new THREE.Color(0.03, 0.08, 0.2),
                    groundColor: new THREE.Color(0.08, 0.12, 0.25),
                    moonColor: new THREE.Color(1.0, 1.0, 1.0),
                    moonGlowColor: new THREE.Color(0.8, 0.9, 1.0),
                    starColor: new THREE.Color(0.9, 0.95, 1.0),
                },
            },
            autumn: {
                day: {
                    zenithColor: new THREE.Color(0.6, 0.4, 0.2),
                    horizonColor: new THREE.Color(0.35, 0.66, 0.72),
                    groundColor: new THREE.Color(1.0, 0.7, 0.4),
                    sunColor: new THREE.Color(0.89, 0.75, 0.06),
                    sunGlowColor: new THREE.Color(0.94, 0.53, 0),
                },
                night: {
                    zenithColor: new THREE.Color(0.08, 0.04, 0.08),
                    horizonColor: new THREE.Color(0.15, 0.08, 0.12),
                    groundColor: new THREE.Color(0.25, 0.15, 0.2),
                    moonColor: new THREE.Color(1, 0.5, 0.21),
                    moonGlowColor: new THREE.Color(0xe5a55d),
                    starColor: new THREE.Color(1.0, 0.9, 0.8),
                },
            },
            rainy: {
                day: {
                    zenithColor: new THREE.Color(0.25, 0.3, 0.4),
                    horizonColor: new THREE.Color(0.4, 0.5, 0.6),
                    groundColor: new THREE.Color(0.5, 0.6, 0.7),
                    sunColor: new THREE.Color(0.7, 0.7, 0.8),
                    sunGlowColor: new THREE.Color(0.6, 0.6, 0.7),
                },
                night: {
                    zenithColor: new THREE.Color(0.03, 0.05, 0.08),
                    horizonColor: new THREE.Color(0.06, 0.1, 0.15),
                    groundColor: new THREE.Color(0.1, 0.15, 0.2),
                    moonColor: new THREE.Color(0.6, 0.7, 0.8),
                    moonGlowColor: new THREE.Color(0.5, 0.6, 0.8),
                    starColor: new THREE.Color(0.7, 0.8, 0.9),
                },
            },
        };
    }
    initialize() {
        this.createSkydome();
        setTimeout(() => {
            this.updateSkyColors();
        }, 0);
    }
    createSkydome() {
        const geometry = new THREE.SphereGeometry(150, 32, 16);
        this.skydomeMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uZenithColor: { value: new THREE.Color(0.2, 0.5, 0.9) },
                uHorizonColor: { value: new THREE.Color(0.7, 0.85, 0.95) },
                uGroundColor: { value: new THREE.Color(0.95, 0.9, 0.85) },
                uSunPosition: { value: new THREE.Vector3(-0.846, -0.085, -1.0) },
                uSunColor: { value: new THREE.Color(1.0, 0.95, 0.8) },
                uSunGlowColor: { value: new THREE.Color(1.0, 0.7, 0.3) },
                uSunSize: { value: 0.005 },
                uSunGlowSize: { value: 0.03386 },
                uSunRayCount: { value: 12.0 },
                uSunRayLength: { value: 0.0352 },
                uSunRaySharpness: { value: 8.0 },
                uMoonPosition: { value: new THREE.Vector3(-0.5, -0.085, -1.0) },
                uMoonColor: { value: new THREE.Color(0.95, 0.95, 1.0) },
                uMoonGlowColor: { value: new THREE.Color(0.7, 0.8, 1.0) },
                uMoonSize: { value: 0.0268665 },
                uMoonGlowSize: { value: 0.0266345 },
                uStarColor: { value: new THREE.Color(1.0, 1.0, 1.0) },
                uStarDensity: { value: 10.0 },
                uStarBrightness: { value: 2.5 },
                uTime: { value: 0 },
                uIsNight: { value: 0.0 },
                uSeason: { value: 0.0 },
                uAtmosphereIntensity: { value: 0.0 },
            },
            vertexShader: vertex_glsl_1.default,
            fragmentShader: fragment_glsl_1.default,
            side: THREE.BackSide,
        });
        this.skydome = new THREE.Mesh(geometry, this.skydomeMaterial);
        this.scene.add(this.skydome);
        if (this.game.isDebugMode) {
            this.initGUI();
        }
    }
    onEnvTimeChanged(newValue) {
        this.envTime = newValue;
        this.updateSkyColors();
    }
    onSeasonChanged(newSeason) {
        this.currentSeason = newSeason;
        this.updateSkyColors();
    }
    updateSkyColors() {
        const colors = this.skyColors[this.currentSeason][this.envTime];
        if (this.skydomeMaterial && this.skydomeMaterial.uniforms) {
            this.skydomeMaterial.uniforms.uZenithColor.value.copy(colors.zenithColor);
            this.skydomeMaterial.uniforms.uHorizonColor.value.copy(colors.horizonColor);
            this.skydomeMaterial.uniforms.uGroundColor.value.copy(colors.groundColor);
            this.skydomeMaterial.uniforms.uIsNight.value =
                this.envTime === 'night' ? 1.0 : 0.0;
            const seasonMap = { spring: 0, winter: 1, autumn: 2, rainy: 3 };
            this.skydomeMaterial.uniforms.uSeason.value =
                seasonMap[this.currentSeason] || 0;
            if (this.envTime === 'day') {
                this.skydomeMaterial.uniforms.uSunColor.value.copy(colors.sunColor);
                this.skydomeMaterial.uniforms.uSunGlowColor.value.copy(colors.sunGlowColor);
            }
            else {
                this.skydomeMaterial.uniforms.uMoonColor.value.copy(colors.moonColor);
                this.skydomeMaterial.uniforms.uMoonGlowColor.value.copy(colors.moonGlowColor);
                this.skydomeMaterial.uniforms.uStarColor.value.copy(colors.starColor);
            }
        }
    }
    update(elapsedTime) {
        if (this.skydomeMaterial && this.skydomeMaterial.uniforms) {
            this.skydomeMaterial.uniforms.uTime.value = elapsedTime;
        }
    }
    initGUI() {
        if (!this.debugGUI ||
            !this.skydomeMaterial ||
            !this.skydomeMaterial.uniforms)
            return;
        const skyFolder = this.debugGUI.addFolder('Skydome');
        skyFolder
            .addColor(this.skydomeMaterial.uniforms.uZenithColor, 'value')
            .name('Zenith Color');
        skyFolder
            .addColor(this.skydomeMaterial.uniforms.uHorizonColor, 'value')
            .name('Horizon Color');
        skyFolder
            .addColor(this.skydomeMaterial.uniforms.uGroundColor, 'value')
            .name('Ground Color');
        skyFolder
            .add(this.skydomeMaterial.uniforms.uIsNight, 'value', 0, 1)
            .name('Night Mode');
        skyFolder
            .add(this.skydomeMaterial.uniforms.uSeason, 'value', 0, 3)
            .name('Season (0=Spring, 1=Winter, 2=Autumn, 3=Rainy)');
        skyFolder
            .add(this.skydomeMaterial.uniforms.uAtmosphereIntensity, 'value', 0, 3.0)
            .name('Atmosphere');
        const sunFolder = skyFolder.addFolder('Sun');
        sunFolder
            .add(this.skydomeMaterial.uniforms.uSunPosition.value, 'x', -1, 1)
            .name('Sun X');
        sunFolder
            .add(this.skydomeMaterial.uniforms.uSunPosition.value, 'y', -1, 1)
            .name('Sun Y');
        sunFolder
            .add(this.skydomeMaterial.uniforms.uSunPosition.value, 'z', -1, 1)
            .name('Sun Z');
        sunFolder
            .addColor(this.skydomeMaterial.uniforms.uSunColor, 'value')
            .name('Sun Color');
        sunFolder
            .addColor(this.skydomeMaterial.uniforms.uSunGlowColor, 'value')
            .name('Sun Glow');
        sunFolder
            .add(this.skydomeMaterial.uniforms.uSunSize, 'value', 0.005, 0.05)
            .name('Sun Size');
        sunFolder
            .add(this.skydomeMaterial.uniforms.uSunGlowSize, 'value', 0.02, 0.2)
            .name('Sun Glow Size');
        sunFolder
            .add(this.skydomeMaterial.uniforms.uSunRayCount, 'value', 4, 24)
            .step(1)
            .name('Ray Count');
        sunFolder
            .add(this.skydomeMaterial.uniforms.uSunRayLength, 'value', 0.01, 0.1)
            .name('Ray Length');
        sunFolder
            .add(this.skydomeMaterial.uniforms.uSunRaySharpness, 'value', 1, 8)
            .name('Ray Sharpness');
        const moonFolder = skyFolder.addFolder('Moon');
        moonFolder
            .add(this.skydomeMaterial.uniforms.uMoonPosition.value, 'x', -1, 1)
            .name('Moon X');
        moonFolder
            .add(this.skydomeMaterial.uniforms.uMoonPosition.value, 'y', -1, 1)
            .name('Moon Y');
        moonFolder
            .add(this.skydomeMaterial.uniforms.uMoonPosition.value, 'z', -1, 1)
            .name('Moon Z');
        moonFolder
            .addColor(this.skydomeMaterial.uniforms.uMoonColor, 'value')
            .name('Moon Color');
        moonFolder
            .addColor(this.skydomeMaterial.uniforms.uMoonGlowColor, 'value')
            .name('Moon Glow');
        moonFolder
            .add(this.skydomeMaterial.uniforms.uMoonSize, 'value', 0.0001, 0.08)
            .name('Moon Size');
        moonFolder
            .add(this.skydomeMaterial.uniforms.uMoonGlowSize, 'value', 0.0005, 0.2)
            .name('Moon Glow Size');
        const starsFolder = skyFolder.addFolder('Stars');
        starsFolder
            .addColor(this.skydomeMaterial.uniforms.uStarColor, 'value')
            .name('Star Color');
        starsFolder
            .add(this.skydomeMaterial.uniforms.uStarDensity, 'value', 0.01, 10.0)
            .name('Star Density');
        starsFolder
            .add(this.skydomeMaterial.uniforms.uStarBrightness, 'value', 0.1, 10.0)
            .name('Star Brightness');
    }
    dispose() {
        this.environmentTimeManager.offChange();
        this.seasonManager.offChange();
        if (this.skydome) {
            this.scene.remove(this.skydome);
            this.skydome.geometry.dispose();
            this.skydomeMaterial.dispose();
        }
    }
}
exports.default = Skydome;

  },
  "src/Game/World/Components/SnowFall/SnowFall.class.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SnowSystem_class_1 = require("./SnowSystem.class");
const Game_class_1 = require("../../../Game.class");
const SeasonManager_class_1 = require("../../Managers/SeasonManager/SeasonManager.class");
class SnowFall {
    constructor() {
        this.game = Game_class_1.default.getInstance();
        this.seasonManager = SeasonManager_class_1.default.getInstance();
        const snowBounds = {
            yMin: 15.0,
            yMax: 20.0,
            xRange: 40.0,
            zRange: 30.0,
            originX: 0.0,
            originZ: 0.0,
        };
        this.snowSystem = new SnowSystem_class_1.default(snowBounds);
        this.seasonManager.onChange((newSeason, oldSeason) => {
            this.onSeasonChanged(newSeason, oldSeason);
        });
        this.updateVisibility();
    }
    onSeasonChanged(newSeason, oldSeason) {
        this.updateVisibility();
    }
    updateVisibility() {
        const isWinterSeason = this.seasonManager.currentSeason === 'winter';
        this.snowSystem.setVisible(isWinterSeason);
    }
    update(delta, elapsedTime) {
        this.snowSystem.update(delta, elapsedTime);
    }
    dispose() {
        this.seasonManager.offChange();
        this.snowSystem.dispose();
    }
}
exports.default = SnowFall;

  },
  "src/Game/World/Components/SnowFall/SnowSystem.class.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const THREE = require("three");
const Game_class_1 = require("../../../Game.class");
const SeasonManager_class_1 = require("../../Managers/SeasonManager/SeasonManager.class");
class SnowSystem {
    constructor(bounds) {
        this.game = Game_class_1.default.getInstance();
        this.scene = this.game.scene;
        this.bounds = bounds;
        this.seasonManager = SeasonManager_class_1.default.getInstance();
        this.count = 600;
        this.visible = false;
        this.createSnowGeometry();
        this.createSnowMaterial();
        this.createSnowMesh();
        this.initializeParticles();
    }
    createSnowGeometry() {
        this.geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.count * 3);
        const colors = new Float32Array(this.count * 3);
        const sizes = new Float32Array(this.count);
        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    }
    createSnowMaterial() {
        const canvas = document.createElement('canvas');
        canvas.width = 8;
        canvas.height = 8;
        const context = canvas.getContext('2d');
        const gradient = context.createRadialGradient(2, 2, 0, 2, 2, 2);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, 4, 4);
        const texture = new THREE.CanvasTexture(canvas);
        this.material = new THREE.PointsMaterial({
            map: texture,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true,
            depthWrite: false,
        });
    }
    createSnowMesh() {
        this.mesh = new THREE.Points(this.geometry, this.material);
        this.mesh.visible = this.visible;
        this.scene.add(this.mesh);
    }
    initializeParticles() {
        this.particles = [];
        for (let i = 0; i < this.count; i++) {
            this.particles.push({
                pos: new THREE.Vector3(),
                vel: new THREE.Vector3(),
                life: 1.0,
                maxLife: 1.0,
                size: 0.1 + Math.random() * 0.2,
                rotationSpeed: (Math.random() - 0.5) * 2.0,
                spawnDelay: Math.random() * 0.1,
            });
            this.respawnParticle(this.particles[i]);
            this.particles[i].pos.y =
                this.bounds.yMin +
                    Math.random() * (this.bounds.yMax - this.bounds.yMin + 15);
        }
        this.updateGeometry();
    }
    respawnParticle(particle) {
        particle.pos.x =
            this.bounds.originX + (Math.random() - 0.5) * this.bounds.xRange;
        particle.pos.y = this.bounds.yMax + Math.random() * 8.0;
        particle.pos.z =
            this.bounds.originZ + (Math.random() - 0.5) * this.bounds.zRange;
        particle.vel.set((Math.random() - 0.5) * 0.5, -0.8 - Math.random() * 1.2, (Math.random() - 0.5) * 0.5);
        particle.life = particle.maxLife;
        particle.spawnDelay = 0;
    }
    updateGeometry() {
        const positions = this.geometry.attributes.position.array;
        const colors = this.geometry.attributes.color.array;
        const sizes = this.geometry.attributes.size.array;
        for (let i = 0; i < this.count; i++) {
            const particle = this.particles[i];
            const i3 = i * 3;
            if (particle.spawnDelay > 0) {
                positions[i3] = 0;
                positions[i3 + 1] = -100;
                positions[i3 + 2] = 0;
                colors[i3] = colors[i3 + 1] = colors[i3 + 2] = 0;
                sizes[i] = 0;
                continue;
            }
            positions[i3] = particle.pos.x;
            positions[i3 + 1] = particle.pos.y;
            positions[i3 + 2] = particle.pos.z;
            const brightness = 0.9 + Math.random() * 0.1;
            colors[i3] = brightness;
            colors[i3 + 1] = brightness;
            colors[i3 + 2] = 1.0;
            sizes[i] = particle.size;
        }
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;
        this.geometry.attributes.size.needsUpdate = true;
    }
    setVisible(visible) {
        this.visible = visible;
        if (this.mesh) {
            this.mesh.visible = visible;
        }
    }
    update(delta, elapsedTime) {
        if (!this.visible)
            return;
        const cappedDt = Math.min(delta, 0.2);
        for (let i = 0; i < this.count; i++) {
            const particle = this.particles[i];
            if (particle.spawnDelay > 0) {
                particle.spawnDelay -= cappedDt;
                continue;
            }
            particle.pos.addScaledVector(particle.vel, cappedDt);
            const swayStrength = 0.3;
            const timeOffset = particle.pos.z * 0.1 + particle.pos.x * 0.05;
            particle.pos.x +=
                Math.sin(elapsedTime * 0.8 + timeOffset) * swayStrength * cappedDt;
            particle.pos.z +=
                Math.cos(elapsedTime * 0.6 + timeOffset) * swayStrength * cappedDt;
            particle.pos.y +=
                Math.sin(elapsedTime * 2.0 + particle.pos.x * 0.1) * 0.05 * cappedDt;
            if (particle.pos.y < -2.0) {
                this.respawnParticle(particle);
                particle.spawnDelay = Math.random() * 0.2;
            }
        }
        this.updateGeometry();
    }
    dispose() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.geometry.dispose();
            this.material.dispose();
        }
    }
}
exports.default = SnowSystem;

  },
  "src/Game/World/Components/Tent/Tent.class.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const THREE = require("three");
const Game_class_1 = require("../../../Game.class");
const EnvironmentManager_class_1 = require("../../Managers/EnvironmentManager/EnvironmentManager.class");
const SeasonManager_class_1 = require("../../Managers/SeasonManager/SeasonManager.class");
class Tent {
    constructor() {
        this.game = Game_class_1.default.getInstance();
        this.scene = this.game.scene;
        this.resources = this.game.resources;
        this.envManager = EnvironmentManager_class_1.default.getInstance();
        this.seasonManager = SeasonManager_class_1.default.getInstance();
        this.currentSeason = this.seasonManager.currentSeason;
        this.lampMeshes = [];
        this.lampConfigs = {
            day: {
                transparent: true,
                opacity: 0.55,
                emissiveIntensity: 0.1,
                castShadow: true,
            },
            night: {
                transparent: false,
                opacity: 1.0,
                emissiveIntensity: 1.0,
                castShadow: false,
            },
        };
        this.init();
    }
    init() {
        this.addTent();
        this.applyLampConfig(this.envManager.envTime);
        this.envManager.onChange((newValue, oldValue) => {
            this.applyLampConfig(newValue);
        });
        this.seasonManager.onChange((newSeason, oldSeason) => {
            this.onSeasonChanged(newSeason, oldSeason);
        });
    }
    onSeasonChanged(newSeason, oldSeason) {
        this.currentSeason = newSeason;
        const lampColor = this.seasonManager.getColorConfig('tent').lampColor;
        this.lampMeshes.forEach((mesh) => {
            mesh.material.emissive.copy(lampColor);
        });
    }
    addTent() {
        this.tentModel = this.resources.items.tentModel.scene;
        this.tentModel.scale.set(1.1, 1.1, 1.1);
        this.tentModel.position.set(2.5, 0.6, -9);
        this.tentModel.rotation.y = -Math.PI / 60;
        this.scene.add(this.tentModel);
        const { woodColorTexture, woodNormalTexture, woodAOTexture } = this.resources.items;
        woodColorTexture.colorSpace = THREE.SRGBColorSpace;
        this.tentModel.traverse((child) => {
            if (!child.isMesh)
                return;
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material.name === 'wood') {
                Object.assign(child.material, {
                    map: woodColorTexture,
                    normalMap: woodNormalTexture,
                    aoMap: woodAOTexture,
                    aoMapIntensity: 0.55,
                    roughness: 1.0,
                    color: null,
                });
            }
            if (child.material.name === 'Lamp glass.001') {
                const lampColor = this.seasonManager.getColorConfig('tent').lampColor;
                child.material = new THREE.MeshStandardMaterial({
                    emissive: lampColor.clone(),
                });
                this.lampMeshes.push(child);
            }
        });
    }
    applyLampConfig(timeKey) {
        const config = this.lampConfigs[timeKey] || this.lampConfigs.day;
        this.lampMeshes.forEach((mesh) => {
            const mat = mesh.material;
            mesh.castShadow = config.castShadow;
            if (mat.transparent !== config.transparent) {
                mat.transparent = config.transparent;
                mat.needsUpdate = true;
            }
            mat.opacity = config.opacity;
            mat.emissiveIntensity = config.emissiveIntensity;
        });
    }
    dispose() {
        this.envManager.offChange();
        this.seasonManager.offChange();
        this.lampMeshes.forEach((mesh) => mesh.material.dispose());
        this.scene.remove(this.tentModel);
    }
}
exports.default = Tent;

  },
  "src/Game/World/Components/TreeTrunks/TreeTrunks.class.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Game_class_1 = require("../../../Game.class");
class Trees {
    constructor() {
        this.game = Game_class_1.default.getInstance();
        this.scene = this.game.scene;
        this.resources = this.game.resources;
        this.debugGUI = this.game.debug;
        this.addTrees();
    }
    addTrees() {
        this.treeModel = this.resources.items.TreeTrunksModel.scene;
        this.scene.add(this.treeModel);
        this.treeModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }
}
exports.default = Trees;

  },
  "src/Game/World/Components/WindLines/Windlines.class.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const THREE = require("three");
const gsap_1 = require("gsap");
const Game_class_1 = require("../../../Game.class");
const vertex_glsl_1 = require("../../../../Shaders/Materials/windLines/vertex.glsl");
const fragment_glsl_1 = require("../../../../Shaders/Materials/windLines/fragment.glsl");
const SeasonManager_class_1 = require("../../Managers/SeasonManager/SeasonManager.class");
class WindLine {
    constructor() {
        this.game = Game_class_1.default.getInstance();
        this.available = true;
        this.seasonManager = SeasonManager_class_1.default.getInstance();
        this.currentSeason = this.seasonManager.currentSeason;
        const geometry = this.createGeometry();
        const windColor = this.seasonManager.getColorConfig('windLines').color;
        this.material = new THREE.ShaderMaterial({
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            uniforms: {
                uThickness: { value: 0.1 },
                uProgress: { value: 0.0 },
                uColor: { value: windColor.clone() },
                uTangent: { value: new THREE.Vector3(0, 1, -1).normalize() },
            },
            vertexShader: vertex_glsl_1.default,
            fragmentShader: fragment_glsl_1.default,
        });
        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.renderOrder = 1;
        this.mesh.position.y = 3;
        this.mesh.visible = false;
        this.game.scene.add(this.mesh);
        this.seasonManager.onChange((newSeason, oldSeason) => {
            this.onSeasonChanged(newSeason, oldSeason);
        });
    }
    onSeasonChanged(newSeason, oldSeason) {
        this.currentSeason = newSeason;
        const windColor = this.seasonManager.getColorConfig('windLines').color;
        this.material.uniforms.uColor.value.copy(windColor);
    }
    createGeometry(length = 11, handlesCount = 4, amplitude = 1, divisions = 30) {
        const geometry = new THREE.BufferGeometry();
        const halfExtent = length / 2;
        const handleSpan = length / (handlesCount - 1);
        const handles = [];
        for (let i = 0; i < handlesCount; i++) {
            handles.push(new THREE.Vector3(0, ((i % 2) - 0.5) * amplitude, -halfExtent + i * handleSpan));
        }
        const curve = new THREE.CatmullRomCurve3(handles);
        const points = curve.getPoints(divisions);
        const vertices = [];
        const indices = [];
        const ratios = [];
        for (let i = 0; i < points.length; i++) {
            const point = points[i];
            const ratio = i / (points.length - 1);
            vertices.push(point.x, point.y, point.z);
            vertices.push(point.x, point.y, point.z);
            ratios.push(ratio);
            ratios.push(ratio);
            if (i < points.length - 1) {
                const base = i * 2;
                indices.push(base, base + 1, base + 2);
                indices.push(base + 1, base + 3, base + 2);
            }
        }
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('ratio', new THREE.Float32BufferAttribute(ratios, 1));
        geometry.setIndex(indices);
        return geometry;
    }
    get thickness() {
        return this.material.uniforms.uThickness.value;
    }
    set thickness(value) {
        this.material.uniforms.uThickness.value = value;
    }
    get progress() {
        return this.material.uniforms.uProgress.value;
    }
    set progress(value) {
        this.material.uniforms.uProgress.value = value;
    }
    dispose() {
        this.seasonManager.offChange();
        this.mesh.geometry.dispose();
        this.material.dispose();
        this.game.scene.remove(this.mesh);
    }
}
class WindLines {
    constructor() {
        this.game = Game_class_1.default.getInstance();
        this.scene = this.game.scene;
        this.intervalRange = { min: 300, max: 2000 };
        this.duration = 4;
        this.translation = 1;
        this.thickness = 0.25;
        this.pool = [new WindLine(), new WindLine(), new WindLine()];
        this.startInterval();
    }
    startInterval() {
        const displayInterval = () => {
            this.display();
            const delay = this.intervalRange.min +
                Math.random() * (this.intervalRange.max - this.intervalRange.min);
            this.intervalTimeout = setTimeout(() => displayInterval(), delay);
        };
        displayInterval();
    }
    display() {
        const windLine = this.pool.find((wl) => wl.available);
        if (!windLine)
            return;
        const angle = this.getWindAngle();
        windLine.mesh.visible = true;
        windLine.available = false;
        windLine.thickness = this.thickness;
        const focusPoint = this.getFocusPoint();
        const radius = this.getOptimalRadius();
        windLine.mesh.position.x = focusPoint.x + (Math.random() - 0.5) * radius;
        windLine.mesh.position.z = focusPoint.z + (Math.random() - 0.5) * radius;
        windLine.mesh.rotation.y = angle;
        gsap_1.default.to(windLine.mesh.position, {
            x: windLine.mesh.position.x + Math.sin(angle) * this.translation,
            z: windLine.mesh.position.z + Math.cos(angle) * this.translation,
            duration: this.duration,
        });
        gsap_1.default.fromTo(windLine.material.uniforms.uProgress, { value: 0 }, {
            value: 1,
            duration: this.duration,
            onComplete: () => {
                windLine.mesh.visible = false;
                windLine.available = true;
            },
        });
    }
    getWindAngle() {
        return Math.PI;
    }
    getFocusPoint() {
        return new THREE.Vector3(0, 0, 0);
    }
    getOptimalRadius() {
        return 25;
    }
    dispose() {
        if (this.intervalTimeout) {
            clearTimeout(this.intervalTimeout);
            this.intervalTimeout = null;
        }
        this.pool.forEach((windLine) => windLine.dispose());
    }
}
exports.default = WindLines;

  },
  "src/Game/World/Managers/BiomeManager/BiomeManager.class.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BiomeManager = void 0;
const THREE = require("three");
class BiomeManager {
    constructor(game, worldSize) {
        this.game = game;
        this.WORLD_SIZE = worldSize;
        this.biomeTexture = null;
        this.biomeData = null;
        this.loadBiomeTexture();
    }
    loadBiomeTexture() {
        this.biomeTexture = this.game.resources.items.grassPathDensityDataTexture;
        this.biomeTexture.minFilter = THREE.NearestFilter;
        this.biomeTexture.magFilter = THREE.NearestFilter;
        this.biomeTexture.generateMipmaps = false;
        this.cacheBiomeData();
    }
    cacheBiomeData() {
        const img = this.biomeTexture.image;
        if (!img || img.naturalWidth === 0) {
            console.warn('Biome texture not loaded yet');
            return;
        }
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        this.biomeData = {
            data: imageData.data,
            width: canvas.width,
            height: canvas.height,
        };
    }
    getGrassDensity(worldX, worldZ) {
        if (!this.biomeData)
            return 1.0;
        const u = worldX / this.WORLD_SIZE + 0.5;
        const v = worldZ / this.WORLD_SIZE + 0.5;
        const pixelX = Math.floor(u * this.biomeData.width);
        const pixelY = Math.floor((1 - v) * this.biomeData.height);
        const clampedX = Math.max(0, Math.min(this.biomeData.width - 1, pixelX));
        const clampedY = Math.max(0, Math.min(this.biomeData.height - 1, pixelY));
        const idx = (clampedY * this.biomeData.width + clampedX) * 4;
        const greenChannelValue = this.biomeData.data[idx + 1];
        return greenChannelValue / 255;
    }
}
exports.BiomeManager = BiomeManager;

  },
  "src/Game/World/Managers/BushManager/BushManager.class.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BushManager = void 0;
const THREE = require("three");
const MeshSurfaceSampler_js_1 = require("three/addons/math/MeshSurfaceSampler.js");
const Game_class_1 = require("../../../Game.class");
const vertex_glsl_1 = require("../../../../Shaders/Materials/bush/vertex.glsl");
const MATH = require("../../../Utils/Math.class");
class BushManager {
    constructor({ material, samplerMesh, maxLeaves = 1000 }) {
        this.game = Game_class_1.default.getInstance();
        this.scene = this.game.scene;
        this.planeGeometry = new THREE.PlaneGeometry(1, 1, 1, 1);
        this.material = material;
        this.samplerMesh = samplerMesh;
        this.maxLeaves = maxLeaves;
        const mulberry32 = (seed) => {
            return function () {
                let t = (seed += 0x6d2b79f5);
                t = Math.imul(t ^ (t >>> 15), t | 1);
                t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
            };
        };
        this.sampler = new MeshSurfaceSampler_js_1.MeshSurfaceSampler(samplerMesh)
            .setRandomGenerator(mulberry32(12345))
            .build();
        this.instancedMesh = new THREE.InstancedMesh(this.planeGeometry, material, maxLeaves);
        const depthUniforms = THREE.UniformsUtils.clone(this.material.uniforms);
        const depthFragment = `#include <packing>
varying vec2 vUv;
uniform sampler2D uAlphaMap;
void main() {
  float a = texture2D(uAlphaMap, vUv).a;
  if (a < 0.8) discard;
  gl_FragColor = packDepthToRGBA( gl_FragCoord.z );
}
`;
        const depthMaterial = new THREE.ShaderMaterial({
            vertexShader: vertex_glsl_1.default,
            fragmentShader: depthFragment,
            uniforms: depthUniforms,
            defines: { USE_INSTANCING: '' },
            side: THREE.DoubleSide,
        });
        this.instancedMesh.customDepthMaterial = depthMaterial;
        this.instancedMesh.customDistanceMaterial = depthMaterial;
        this.instancedMesh.castShadow = true;
        this.instancedMesh.receiveShadow = true;
        this.currentLeafIndex = 0;
        this.bushes = [];
        this.instanceNormals = new Float32Array(maxLeaves * 3);
        this.instanceShadowColors = new Float32Array(maxLeaves * 3);
        this.instanceMidColors = new Float32Array(maxLeaves * 3);
        this.instanceHighlightColors = new Float32Array(maxLeaves * 3);
        this.instanceColorMultiplier = new Float32Array(maxLeaves * 3);
        this.scene.add(this.instancedMesh);
    }
    addBush({ position = new THREE.Vector3(0, 0.0, 0), leafCount = 25, scale = 1.0, randomSeed = null, shadowColor = new THREE.Color(0.01, 0.12, 0.01), midColor = new THREE.Color(0.0, 0.25, 0.015), highlightColor = new THREE.Color(0.25, 0.5, 0.007), colorMultiplier = new THREE.Color(0.73, 0.89, 0.62), }) {
        if (this.currentLeafIndex + leafCount > this.maxLeaves) {
            console.warn('BushManager: Maximum leaf count exceeded');
            return null;
        }
        const startIndex = this.currentLeafIndex;
        const dummy = new THREE.Object3D();
        const positionLocal = new THREE.Vector3();
        const normal = new THREE.Vector3();
        let sampler = this.sampler;
        if (randomSeed !== null) {
            const mulberry32 = (seed) => {
                return function () {
                    let t = (seed += 0x6d2b79f5);
                    t = Math.imul(t ^ (t >>> 15), t | 1);
                    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
                };
            };
            sampler = new MeshSurfaceSampler_js_1.MeshSurfaceSampler(this.samplerMesh)
                .setRandomGenerator(mulberry32(randomSeed))
                .build();
        }
        for (let i = 0; i < leafCount; i++) {
            const instanceIndex = startIndex + i;
            sampler.sample(positionLocal, normal);
            dummy.position.copy(positionLocal).add(position);
            const s = MATH.random() * 0.5 + scale;
            dummy.scale.set(s, s, s);
            dummy.updateMatrix();
            this.instancedMesh.setMatrixAt(instanceIndex, dummy.matrix);
            this.instanceNormals[instanceIndex * 3 + 0] = normal.x;
            this.instanceNormals[instanceIndex * 3 + 1] = normal.y;
            this.instanceNormals[instanceIndex * 3 + 2] = normal.z;
            this.instanceShadowColors[instanceIndex * 3 + 0] = shadowColor.r;
            this.instanceShadowColors[instanceIndex * 3 + 1] = shadowColor.g;
            this.instanceShadowColors[instanceIndex * 3 + 2] = shadowColor.b;
            this.instanceMidColors[instanceIndex * 3 + 0] = midColor.r;
            this.instanceMidColors[instanceIndex * 3 + 1] = midColor.g;
            this.instanceMidColors[instanceIndex * 3 + 2] = midColor.b;
            this.instanceHighlightColors[instanceIndex * 3 + 0] = highlightColor.r;
            this.instanceHighlightColors[instanceIndex * 3 + 1] = highlightColor.g;
            this.instanceHighlightColors[instanceIndex * 3 + 2] = highlightColor.b;
            this.instanceColorMultiplier[instanceIndex * 3 + 0] = colorMultiplier.r;
            this.instanceColorMultiplier[instanceIndex * 3 + 1] = colorMultiplier.g;
            this.instanceColorMultiplier[instanceIndex * 3 + 2] = colorMultiplier.b;
        }
        const bush = {
            position: position.clone(),
            startIndex,
            leafCount,
            scale,
            shadowColor: shadowColor.clone(),
            midColor: midColor.clone(),
            highlightColor: highlightColor.clone(),
        };
        this.bushes.push(bush);
        this.currentLeafIndex += leafCount;
        this.updateMesh();
        return bush;
    }
    updateMesh() {
        this.instancedMesh.geometry.setAttribute('instanceNormal', new THREE.InstancedBufferAttribute(this.instanceNormals, 3));
        this.instancedMesh.geometry.setAttribute('instanceShadowColor', new THREE.InstancedBufferAttribute(this.instanceShadowColors, 3));
        this.instancedMesh.geometry.setAttribute('instanceMidColor', new THREE.InstancedBufferAttribute(this.instanceMidColors, 3));
        this.instancedMesh.geometry.setAttribute('instanceHighlightColor', new THREE.InstancedBufferAttribute(this.instanceHighlightColors, 3));
        this.instancedMesh.geometry.setAttribute('instanceColorMultiplier', new THREE.InstancedBufferAttribute(this.instanceColorMultiplier, 3));
        this.instancedMesh.count = this.currentLeafIndex;
        this.instancedMesh.instanceMatrix.needsUpdate = true;
    }
    updateBushPosition(bushIndex, newPosition) {
        if (bushIndex >= this.bushes.length)
            return;
        const bush = this.bushes[bushIndex];
        const offset = new THREE.Vector3().subVectors(newPosition, bush.position);
        const dummy = new THREE.Object3D();
        const matrix = new THREE.Matrix4();
        for (let i = 0; i < bush.leafCount; i++) {
            const instanceIndex = bush.startIndex + i;
            this.instancedMesh.getMatrixAt(instanceIndex, matrix);
            dummy.position.setFromMatrixPosition(matrix);
            dummy.position.add(offset);
            const scale = new THREE.Vector3();
            matrix.decompose(new THREE.Vector3(), new THREE.Quaternion(), scale);
            dummy.scale.copy(scale);
            dummy.updateMatrix();
            this.instancedMesh.setMatrixAt(instanceIndex, dummy.matrix);
        }
        bush.position.copy(newPosition);
        this.instancedMesh.instanceMatrix.needsUpdate = true;
    }
    removeBush(bushIndex) {
        if (bushIndex >= this.bushes.length)
            return;
        const bush = this.bushes[bushIndex];
        const dummy = new THREE.Object3D();
        dummy.scale.set(0, 0, 0);
        for (let i = 0; i < bush.leafCount; i++) {
            const instanceIndex = bush.startIndex + i;
            dummy.updateMatrix();
            this.instancedMesh.setMatrixAt(instanceIndex, dummy.matrix);
        }
        this.instancedMesh.instanceMatrix.needsUpdate = true;
        this.bushes.splice(bushIndex, 1);
    }
    getBushCount() {
        return this.bushes.length;
    }
    getTotalLeafCount() {
        return this.currentLeafIndex;
    }
    update() {
        if (this.instancedMesh && this.instancedMesh.customDepthMaterial) {
            this.instancedMesh.customDepthMaterial.uniforms.uTime.value =
                this.material.uniforms.uTime.value;
        }
    }
    dispose() {
        this.scene.remove(this.instancedMesh);
        this.instancedMesh.geometry.dispose();
        if (this.instancedMesh.customDepthMaterial) {
            this.instancedMesh.customDepthMaterial.dispose();
        }
    }
}
exports.BushManager = BushManager;

  },
  "src/Game/World/Managers/EnvironmentManager/EnvironmentManager.class.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EventEmitter_class_1 = require("../../../Utils/EventEmitter.class");
class EnvironmentTimeManager extends EventEmitter_class_1.default {
    constructor(initialTime = null) {
        super();
        if (EnvironmentTimeManager.instance) {
            return EnvironmentTimeManager.instance;
        }
        EnvironmentTimeManager.instance = this;
        this.availableTimes = ['day', 'night'];
        this._envTime = initialTime ?? this._getTimeFromLocalHour();
    }
    /**
     * Determines day/night based on user's local time
     * Day: 6:00 AM (6) to 5:59 PM (17)
     * Night: 6:00 PM (18) to 5:59 AM (5)
     */
    _getTimeFromLocalHour() {
        const hour = new Date().getHours();
        return hour >= 6 && hour < 18 ? 'day' : 'night';
    }
    static getInstance() {
        if (!EnvironmentTimeManager.instance) {
            EnvironmentTimeManager.instance = new EnvironmentTimeManager();
        }
        return EnvironmentTimeManager.instance;
    }
    get envTime() {
        return this._envTime;
    }
    set envTime(value) {
        if (!this.availableTimes.includes(value)) {
            console.warn(`Invalid envTime value: ${value}. Must be one of:`, this.availableTimes);
            return;
        }
        const oldValue = this._envTime;
        if (oldValue === value) {
            return;
        }
        this._envTime = value;
        this.trigger('envTimeChanged', value, oldValue);
    }
    toggle() {
        this.envTime = this._envTime === 'day' ? 'night' : 'day';
    }
    setTime(time) {
        this.envTime = time;
    }
    isDay() {
        return this._envTime === 'day';
    }
    isNight() {
        return this._envTime === 'night';
    }
    onChange(callback) {
        this.on('envTimeChanged', callback);
        return this;
    }
    offChange(callback) {
        this.off('envTimeChanged');
        return this;
    }
    reset() {
        this.envTime = this._getTimeFromLocalHour();
    }
}
exports.default = EnvironmentTimeManager;

  },
  "src/Game/World/Managers/GrassManager/GrassManager.class.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GrassManager = void 0;
const THREE = require("three");
const EnvironmentManager_class_1 = require("../EnvironmentManager/EnvironmentManager.class");
const SeasonManager_class_1 = require("../SeasonManager/SeasonManager.class");
const gsap_1 = require("gsap");
const MATH = require("../../../Utils/Math.class");
const grass_vertex_common_chunk_glsl_1 = require("../../../../Shaders/Chunks/grass/grass.vertex_common_chunk.glsl");
const grass_vertex_begin_normal_chunk_glsl_1 = require("../../../../Shaders/Chunks/grass/grass.vertex_begin_normal_chunk.glsl");
const grass_vertex_begin_chunk_glsl_1 = require("../../../../Shaders/Chunks/grass/grass.vertex_begin_chunk.glsl");
const grass_fragment_common_chunk_glsl_1 = require("../../../../Shaders/Chunks/grass/grass.fragment_common_chunk.glsl");
const grass_fragment_color_chunk_glsl_1 = require("../../../../Shaders/Chunks/grass/grass.fragment_color_chunk.glsl");
const vertex_glsl_1 = require("../../../../Shaders/Materials/flowers/vertex.glsl");
const fragment_glsl_1 = require("../../../../Shaders/Materials/flowers/fragment.glsl");
class GrassManager {
    constructor(game, biomeManager, worldSize, tileSize, gridCols, gridRows, gridSpacing) {
        this.game = game;
        this.scene = game.scene;
        this.biomeManager = biomeManager;
        this.environmentTimeManager = EnvironmentManager_class_1.default.getInstance();
        this.seasonManager = SeasonManager_class_1.default.getInstance();
        this.envTime = this.environmentTimeManager.envTime;
        this.currentSeason = this.seasonManager.currentSeason;
        this.debugGUI = this.game.debug;
        this.WORLD_SIZE = worldSize;
        this.TILE_SIZE = tileSize;
        this.gridCols = gridCols;
        this.gridRows = gridRows;
        this.gridSpacing = gridSpacing;
        this.grassSize = 1.185;
        this.GRASS_PER_TILE = this.getInitialGrassDensity();
        this.FLOWERS_PER_TILE = 20;
        this.flowerInstancedMesh = null;
        this.flowerMaterial = null;
        this.sharedGeometry = null;
        this.sharedMaterial = null;
        this.sharedUniforms = null;
        this.grassInstancedMesh = null;
        this.colorConfig = this.seasonManager.getColorConfig('grass');
        this.init();
        this.isDebugMode = this.game.isDebugMode;
        if (this.isDebugMode) {
            this.initGUI();
        }
        this.environmentTimeManager.onChange((newValue, oldValue) => {
            this.onEnvTimeChanged(newValue, oldValue);
        });
        this.seasonManager.onChange((newSeason, oldSeason) => {
            this.onSeasonChanged(newSeason, oldSeason);
        });
    }
    init() {
        this.loadSharedResources();
        this.createAllGrassInSingleMesh();
        this.createFlowers();
    }
    getInitialGrassDensity() {
        const defaultDensity = 12500;
        try {
            const savedSettings = localStorage.getItem('gameSettings');
            if (!savedSettings)
                return defaultDensity;
            const settings = JSON.parse(savedSettings);
            const quality = settings.graphicsQuality || 'medium';
            if (quality === 'custom') {
                return settings.customGrass || defaultDensity;
            }
            const presetDensities = {
                low: 10000,
                medium: 12500,
                high: 25000,
                ultra: 50000,
            };
            return presetDensities[quality] || defaultDensity;
        }
        catch (error) {
            console.warn('Failed to load grass density from localStorage:', error);
            return defaultDensity;
        }
    }
    loadSharedResources() {
        const grassBlade = this.game.resources.items.grassBladeModel;
        grassBlade.scene.traverse((child) => {
            if (child.isMesh) {
                this.sharedGeometry = child.geometry;
                this.sharedGeometry.computeBoundingBox();
            }
        });
        const biomeTexture = this.game.resources.items.grassPathDensityDataTexture;
        const normalTexture = this.game.resources.items.displacedNormalMap;
        normalTexture.wrapS = normalTexture.wrapT = THREE.RepeatWrapping;
        const displacementTexture = this.game.resources.items.displacementMap;
        displacementTexture.wrapS = displacementTexture.wrapT =
            THREE.RepeatWrapping;
        const bb = this.sharedGeometry.boundingBox;
        const bladeMinY = bb ? bb.min.y : 0.0;
        const bladeHeight = bb ? bb.max.y - bb.min.y : 1.0;
        const colors = this.colorConfig[this.envTime];
        this.sharedUniforms = {
            uTime: { value: 0 },
            uDensityMap: { value: biomeTexture },
            uTerrainNormalMap: { value: normalTexture },
            uDisplacementMap: { value: displacementTexture },
            uGroundSize: { value: this.WORLD_SIZE },
            uNormalStrength: { value: 0.3 },
            uTerrainNormalScale: { value: 1.0 },
            uGrassColorDark: { value: colors.dark.clone() },
            uGrassColorLight: { value: colors.light.clone() },
            uShadowColor: { value: colors.shadow.clone() },
            uWindSpeed: { value: 1.5 },
            uWindAmplitude: { value: 1.5 },
            uWindWaveTiling: { value: 1.0 },
            uWindWaveStrength: { value: -0.5 },
            uWindBaseTiling: { value: 0.3 },
            uWindBaseStrength: { value: 1.0 },
            uBladeModelMinY: { value: bladeMinY },
            uBladeModelHeight: { value: Math.max(bladeHeight, 1e-4) },
            uDensityThreshold: { value: 0.9 },
        };
        this.sharedMaterial = this.createGrassMaterial();
    }
    onEnvTimeChanged(newValue, oldValue) {
        this.envTime = newValue;
        this.updateColors();
    }
    onSeasonChanged(newSeason, oldSeason) {
        this.currentSeason = newSeason;
        this.colorConfig = this.seasonManager.getColorConfig('grass');
        this.updateColors();
    }
    updateColors() {
        if (!this.sharedUniforms)
            return;
        const colors = this.colorConfig[this.envTime];
        gsap_1.default.to(this.sharedUniforms.uShadowColor.value, {
            r: colors.shadow.r,
            g: colors.shadow.g,
            b: colors.shadow.b,
            duration: 1,
            ease: 'power2.Out',
        });
        gsap_1.default.to(this.sharedUniforms.uGrassColorDark.value, {
            r: colors.dark.r,
            g: colors.dark.g,
            b: colors.dark.b,
            duration: 1,
            ease: 'power2.Out',
        });
        gsap_1.default.to(this.sharedUniforms.uGrassColorLight.value, {
            r: colors.light.r,
            g: colors.light.g,
            b: colors.light.b,
            duration: 1,
            ease: 'power2.Out',
        });
        if (this.flowerMaterial) {
            this.flowerMaterial.uniforms.uTimeColorAlpha.value =
                colors.flowerVisibility;
        }
    }
    createGrassMaterial() {
        const material = new THREE.MeshStandardMaterial();
        material.onBeforeCompile = (shader) => {
            shader.uniforms = { ...shader.uniforms, ...this.sharedUniforms };
            shader.vertexShader = shader.vertexShader.replace('#include <common>', grass_vertex_common_chunk_glsl_1.default);
            shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', grass_vertex_begin_normal_chunk_glsl_1.default);
            shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', grass_vertex_begin_chunk_glsl_1.default);
            shader.fragmentShader = shader.fragmentShader.replace('#include <common>', grass_fragment_common_chunk_glsl_1.default);
            shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', grass_fragment_color_chunk_glsl_1.default);
        };
        return material;
    }
    createAllGrassInSingleMesh() {
        const cols = this.gridCols;
        const rows = this.gridRows;
        const spacing = this.gridSpacing;
        const startX = -((cols - 1) / 2) * spacing;
        const startZ = -((rows - 1) / 2) * spacing;
        const allPositions = [];
        const allScales = [];
        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                const tileX = startX + i * spacing;
                const tileZ = startZ + j * spacing;
                let tileGrassCount = 0;
                for (let g = 0; g < this.GRASS_PER_TILE; g++) {
                    const localX = MATH.random() * this.TILE_SIZE;
                    const localZ = MATH.random() * this.TILE_SIZE;
                    const worldX = tileX - this.TILE_SIZE / 2 + localX;
                    const worldZ = tileZ - this.TILE_SIZE / 2 + localZ;
                    const density = this.biomeManager.getGrassDensity(worldX, worldZ);
                    if (density >= 0.9) {
                        allPositions.push({ worldX, worldZ });
                        allScales.push(this.grassSize + MATH.random() * 0.5);
                        tileGrassCount++;
                    }
                }
            }
        }
        const totalCount = allPositions.length;
        if (totalCount === 0) {
            console.warn('❌ No grass accepted! Check density threshold.');
            return;
        }
        this.grassInstancedMesh = new THREE.InstancedMesh(this.sharedGeometry, this.sharedMaterial, totalCount);
        this.grassInstancedMesh.receiveShadow = true;
        this.grassInstancedMesh.frustumCulled = false;
        this.grassInstancedMesh.castShadow = false;
        const baseScales = new Float32Array(totalCount);
        const worldPositions = new Float32Array(totalCount * 2);
        const dummy = new THREE.Object3D();
        for (let i = 0; i < totalCount; i++) {
            const { worldX, worldZ } = allPositions[i];
            const scale = allScales[i];
            baseScales[i] = scale;
            worldPositions[i * 2] = worldX;
            worldPositions[i * 2 + 1] = worldZ;
            dummy.position.set(worldX, 0, worldZ);
            dummy.rotation.y = MATH.random() * Math.PI;
            dummy.scale.setScalar(scale);
            dummy.updateMatrix();
            this.grassInstancedMesh.setMatrixAt(i, dummy.matrix);
        }
        this.grassInstancedMesh.instanceMatrix.needsUpdate = true;
        this.grassInstancedMesh.position.set(0, -0.3, 0);
        this.sharedGeometry.setAttribute('aBaseScale', new THREE.InstancedBufferAttribute(baseScales, 1));
        this.sharedGeometry.setAttribute('aWorldPosition', new THREE.InstancedBufferAttribute(worldPositions, 2));
        this.scene.add(this.grassInstancedMesh);
    }
    createFlowers() {
        const texturesArray = [
            this.game.resources.items.flowerTexture1,
            this.game.resources.items.flowerTexture2,
        ];
        if (!texturesArray || texturesArray.length === 0) {
            console.warn('⚠️ Flower textures not found, skipping flowers');
            return;
        }
        const atlasCanvas = document.createElement('canvas');
        const texSize = 256;
        atlasCanvas.width = texSize * 2;
        atlasCanvas.height = texSize;
        const ctx = atlasCanvas.getContext('2d');
        const promises = texturesArray.map((texture, i) => {
            return new Promise((resolve) => {
                const img = texture.image;
                if (img && img.complete) {
                    ctx.drawImage(img, i * texSize, 0, texSize, texSize);
                    resolve();
                }
                else if (img) {
                    img.onload = () => {
                        ctx.drawImage(img, i * texSize, 0, texSize, texSize);
                        resolve();
                    };
                }
            });
        });
        Promise.all(promises).then(() => {
            const atlasTexture = new THREE.CanvasTexture(atlasCanvas);
            atlasTexture.needsUpdate = true;
            this.createFlowersWithAtlas(atlasTexture);
        });
    }
    createFlowersWithAtlas(atlasTexture) {
        const cols = this.gridCols;
        const rows = this.gridRows;
        const spacing = this.gridSpacing;
        const startX = -((cols - 1) / 2) * spacing;
        const startZ = -((rows - 1) / 2) * spacing;
        const flowerPositions = [];
        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                const tileX = startX + i * spacing;
                const tileZ = startZ + j * spacing;
                for (let f = 0; f < this.FLOWERS_PER_TILE; f++) {
                    const localX = MATH.random() * this.TILE_SIZE;
                    const localZ = MATH.random() * this.TILE_SIZE;
                    const worldX = tileX - this.TILE_SIZE / 2 + localX;
                    const worldZ = tileZ - this.TILE_SIZE / 2 + localZ;
                    const density = this.biomeManager.getGrassDensity(worldX, worldZ);
                    if (density >= 0.9) {
                        flowerPositions.push({ worldX, worldZ });
                    }
                }
            }
        }
        const totalFlowers = flowerPositions.length;
        if (totalFlowers === 0) {
            console.warn('❌ No flowers placed!');
            return;
        }
        const alpha = this.colorConfig[this.envTime];
        const fogUniforms = THREE.UniformsUtils.merge([THREE.UniformsLib['fog']]);
        this.flowerMaterial = new THREE.ShaderMaterial({
            fog: true,
            uniforms: {
                ...fogUniforms,
                uTime: { value: 0 },
                uFlowerAtlas: { value: atlasTexture },
                uWindSpeed: { value: 1.5 },
                uWindAmplitude: { value: 0.3 },
                uTimeColorAlpha: { value: alpha.flowerVisibility },
            },
            vertexShader: vertex_glsl_1.default,
            fragmentShader: fragment_glsl_1.default,
            side: THREE.FrontSide,
            alphaTest: 0.5,
            depthWrite: false,
            depthTest: true,
            transparent: true,
        });
        const flowerGeometry = new THREE.PlaneGeometry(0.4, 0.4);
        this.flowerInstancedMesh = new THREE.InstancedMesh(flowerGeometry, this.flowerMaterial, totalFlowers);
        this.flowerInstancedMesh.castShadow = true;
        this.flowerInstancedMesh.receiveShadow = true;
        const texOffsets = new Float32Array(totalFlowers * 2);
        const dummy = new THREE.Object3D();
        for (let i = 0; i < totalFlowers; i++) {
            const { worldX, worldZ } = flowerPositions[i];
            const texIndex = Math.floor(MATH.random() * 3);
            texOffsets[i * 2] = texIndex * 0.5;
            texOffsets[i * 2 + 1] = 0.0;
            const scale = 0.6 + MATH.random() * 0.4;
            const yOffset = MATH.random() * 0.2;
            dummy.position.set(worldX, 0.7 + yOffset, worldZ);
            dummy.scale.set(scale, scale, scale);
            dummy.rotation.set(0, 0, 0);
            dummy.updateMatrix();
            this.flowerInstancedMesh.setMatrixAt(i, dummy.matrix);
        }
        flowerGeometry.setAttribute('aTexOffset', new THREE.InstancedBufferAttribute(texOffsets, 2));
        this.flowerInstancedMesh.instanceMatrix.needsUpdate = true;
        this.scene.add(this.flowerInstancedMesh);
    }
    update() {
        if (this.sharedUniforms) {
            this.sharedUniforms.uTime.value += 0.012;
        }
        if (this.flowerMaterial) {
            this.flowerMaterial.uniforms.uTime.value += 0.016;
        }
    }
    dispose() {
        this.environmentTimeManager.offChange();
        this.seasonManager.offChange();
        if (this.grassInstancedMesh) {
            this.scene.remove(this.grassInstancedMesh);
            this.grassInstancedMesh.dispose();
        }
        if (this.flowerInstancedMesh) {
            this.scene.remove(this.flowerInstancedMesh);
            this.flowerInstancedMesh.dispose();
        }
        if (this.flowerMaterial) {
            this.flowerMaterial.dispose();
        }
        if (this.sharedGeometry) {
            this.sharedGeometry.dispose();
        }
        if (this.sharedMaterial) {
            this.sharedMaterial.dispose();
        }
    }
    regenerateGrass() {
        if (this.grassInstancedMesh) {
            this.scene.remove(this.grassInstancedMesh);
            this.grassInstancedMesh.dispose();
            this.grassInstancedMesh = null;
        }
        if (this.flowerInstancedMesh) {
            this.scene.remove(this.flowerInstancedMesh);
            this.flowerInstancedMesh.dispose();
            this.flowerInstancedMesh = null;
        }
        this.createAllGrassInSingleMesh();
        this.createFlowers();
    }
    initGUI() {
        this.debugGUI.add(this.sharedUniforms.uNormalStrength, 'value', { min: 0, max: 5, step: 0.1, label: 'Normal Strength' }, 'Grass');
        this.debugGUI.add(this.sharedUniforms.uShadowColor, 'value', { type: 'color', label: 'Shadow Color' }, 'Grass');
        this.debugGUI.add(this.sharedUniforms.uGrassColorDark, 'value', { type: 'color', label: 'Grass Color Dark' }, 'Grass');
        this.debugGUI.add(this.sharedUniforms.uGrassColorLight, 'value', { type: 'color', label: 'Grass Color Light' }, 'Grass');
        this.debugGUI.add(this.sharedUniforms.uTerrainNormalScale, 'value', { min: 0, max: 5, step: 0.1, label: 'Terrain Normal Scale' }, 'Grass');
        this.debugGUI.add(this.sharedUniforms.uWindSpeed, 'value', { min: 0, max: 50, step: 0.1, label: 'Wind Speed' }, 'Grass');
        this.debugGUI.add(this.sharedUniforms.uWindAmplitude, 'value', { min: 0, max: 50, step: 0.1, label: 'Wind Amplitude' }, 'Grass');
        this.debugGUI.add(this.sharedUniforms.uWindWaveTiling, 'value', { min: 0, max: 50, step: 0.1, label: 'Wind Wave Tiling' }, 'Grass');
        this.debugGUI.add(this.sharedUniforms.uWindWaveStrength, 'value', { min: -5, max: 5, step: 0.1, label: 'Wind Wave Strength' }, 'Grass');
        this.debugGUI.add(this.sharedUniforms.uWindBaseTiling, 'value', { min: 0, max: 5, step: 0.1, label: 'Wind Base Tiling' }, 'Grass');
        this.debugGUI.add(this.sharedUniforms.uWindBaseStrength, 'value', { min: 0, max: 5, step: 0.1, label: 'Wind Base Strength' }, 'Grass');
    }
}
exports.GrassManager = GrassManager;

  },
  "src/Game/World/Managers/SeasonManager/SeasonManager.class.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EventEmitter_class_1 = require("../../../Utils/EventEmitter.class");
const THREE = require("three");
class SeasonManager extends EventEmitter_class_1.default {
    constructor(initialSeason = 'spring') {
        super();
        if (SeasonManager.instance) {
            return SeasonManager.instance;
        }
        SeasonManager.instance = this;
        this._currentSeason = initialSeason;
        this.availableSeasons = ['spring', 'winter', 'autumn', 'rainy'];
        this.seasonConfigs = this.createSeasonConfigs();
    }
    static getInstance() {
        if (!SeasonManager.instance) {
            SeasonManager.instance = new SeasonManager('spring');
        }
        return SeasonManager.instance;
    }
    createSeasonConfigs() {
        return {
            spring: {
                bush: {
                    day: {
                        shadowColor: [0.003, 0.074, 0.003],
                        midColor: [0.06, 0.23, 0],
                        highlightColor: [0.44, 0.5, 0.0],
                        colorMultiplier: [0.46, 0.65, 0.3],
                        treeShadowColor: [0.03, 0.07, 0.003],
                        treeMidColor: [0.06, 0.23, 0.0],
                        treeHighlightColor: [0.45, 0.55, 0.002],
                        treeColorMultiplier: [0.77, 0.71, 0.35],
                        birchShadowColor: [0.09, 0.03, 0],
                        birchMidColor: [0.2, 0.03, 0],
                        birchHighlightColor: [1, 0.58, 0.1],
                        birchColorMultiplier: [0.68, 0.56, 0.22],
                    },
                    night: {
                        shadowColor: [0.001, 0.03, 0.02],
                        midColor: [0.02, 0.08, 0.05],
                        highlightColor: [0.15, 0.2, 0.15],
                        colorMultiplier: [0.09, 0.13, 0.007],
                        treeShadowColor: [0.01, 0.03, 0.001],
                        treeMidColor: [0.04, 0.1, 0.005],
                        treeHighlightColor: [0.2, 0.25, 0.05],
                        treeColorMultiplier: [0.25, 0.24, 0.001],
                        birchShadowColor: [0.03, 0.015, 0],
                        birchMidColor: [0.08, 0.015, 0],
                        birchHighlightColor: [0.3, 0.17, 0.03],
                        birchColorMultiplier: [0.3, 0.2, 0.01],
                    },
                },
                lighting: {
                    day: {
                        key: {
                            color: 0xfff4e6,
                            intensity: 2.0,
                            position: [-15, 12, 8],
                            castShadow: true,
                        },
                        fill: {
                            color: 0x87ceeb,
                            intensity: 0.6,
                            position: [10, 5, -6],
                            castShadow: false,
                        },
                        ambient: {
                            color: 0xfff8f0,
                            intensity: 0.4,
                        },
                        rim: {
                            color: 0xffd7a3,
                            intensity: 0.3,
                            position: [5, 10, -12],
                            castShadow: false,
                        },
                        environment: {
                            intensity: 0.3,
                            backgroundIntensity: 1.0,
                            rotationY: 6.64,
                            rotationX: 3.95,
                            rotationZ: 6.27,
                        },
                        lamp: {
                            color: 0xffe286,
                            intensity: 0,
                            distance: 20,
                            decay: 1.5,
                            position: [2.9, 4.6, -5.5],
                            castShadow: false,
                        },
                    },
                    night: {
                        key: {
                            color: 0x3d5a7a,
                            intensity: 1.25,
                            position: [-10, 15, 5],
                            castShadow: true,
                        },
                        fill: {
                            color: 0x3d5a7a,
                            intensity: 0.15,
                            position: [10, 5, -6],
                            castShadow: false,
                        },
                        ambient: {
                            color: 0x4a5568,
                            intensity: 0.08,
                        },
                        rim: {
                            color: 0x7a8faa,
                            intensity: 0.1,
                            position: [5, 10, -12],
                            castShadow: false,
                        },
                        environment: {
                            intensity: 0.12,
                            backgroundIntensity: 1.0,
                            rotationY: 3.25,
                            rotationX: 4.65,
                            rotationZ: 4.67,
                        },
                        lamp: {
                            color: 0xffe286,
                            intensity: 10,
                            distance: 20,
                            decay: 1.5,
                            position: [2.9, 4.6, -5.5],
                            castShadow: false,
                        },
                    },
                },
                ground: {
                    day: {
                        uGroundColorLight: new THREE.Color(0.2784, 0.1372, 0.0235),
                        uGroundColorDark: new THREE.Color(0.94, 0.58, 0.22),
                        uGroundColorBelowGrass: new THREE.Color(0.12, 0.15, 0.03),
                        uRockColor: new THREE.Color(1.0, 0.78, 0.47),
                        uWaterShallow: new THREE.Color(1.0, 0.4, 0.0),
                        uWaterDeep: new THREE.Color(0.06, 0.5, 0.51),
                    },
                    night: {
                        uGroundColorLight: new THREE.Color(0.2, 0.1, 0.02),
                        uGroundColorDark: new THREE.Color(0.804, 0.5411, 0.278),
                        uGroundColorBelowGrass: new THREE.Color(0.08, 0.1, 0.02),
                        uRockColor: new THREE.Color(0.7, 0.55, 0.33),
                        uWaterShallow: new THREE.Color(0.52, 0.207, 0.0),
                        uWaterDeep: new THREE.Color(0.03, 0.25, 0.3),
                    },
                },
                grass: {
                    day: {
                        shadow: new THREE.Color(0.01, 0.16, 0.0),
                        dark: new THREE.Color(0.0, 0.29, 0.02),
                        light: new THREE.Color(0.48, 0.68, 0.007),
                        flowerVisibility: 1.0,
                    },
                    night: {
                        shadow: new THREE.Color(0.0023, 0.04, 0.0),
                        dark: new THREE.Color(0.0, 0.23, 0.015),
                        light: new THREE.Color(0.227, 0.31, 0.027),
                        flowerVisibility: 0.15,
                    },
                },
                fire: {
                    day: { smokeAlphaSecondStop: 0.1 },
                    night: { smokeAlphaSecondStop: 0.05 },
                },
                fallingLeaves: {
                    color: new THREE.Color(0xff6f0d),
                },
                windLines: {
                    color: new THREE.Color(0xffffff),
                },
                tent: {
                    lampColor: new THREE.Color(0xffe286),
                },
                rocks: {
                    day: {
                        uRockColor1: new THREE.Color(0.96, 0.86, 0.54),
                        uRockColor2: new THREE.Color(0.97, 0.82, 0.42),
                        uRockColor3: new THREE.Color(0.31, 0.24, 0.06),
                        uMossColor1: new THREE.Color(0.97, 0.82, 0.42),
                        uMossColor2: new THREE.Color(0.97, 0.82, 0.42),
                        uMossColor3: new THREE.Color(0.14, 0.17, 0.003),
                    },
                    night: {
                        uRockColor1: new THREE.Color(0.7, 0.6, 0.35),
                        uRockColor2: new THREE.Color(0.65, 0.55, 0.28),
                        uRockColor3: new THREE.Color(0.2, 0.15, 0.04),
                        uMossColor1: new THREE.Color(0.65, 0.55, 0.28),
                        uMossColor2: new THREE.Color(0.65, 0.55, 0.28),
                        uMossColor3: new THREE.Color(0.08, 0.1, 0.001),
                    },
                },
            },
            winter: {
                bush: {
                    day: {
                        shadowColor: [0.002, 0.04, 0.08],
                        midColor: [0.01, 0.25, 0.16],
                        highlightColor: [0.8, 0.8, 0.8],
                        colorMultiplier: [1, 1, 1],
                        treeShadowColor: [0.01, 0.13, 0.26],
                        treeMidColor: [0.015, 0.28, 0.27],
                        treeHighlightColor: [0.73, 0.75, 0.78],
                        treeColorMultiplier: [0.8, 0.8, 0.8],
                        birchShadowColor: [0.2, 0.09, 0.0],
                        birchMidColor: [0.4, 0.2, 0.0],
                        birchHighlightColor: [0.8, 0.85, 0.9],
                        birchColorMultiplier: [0.7, 0.7, 0.7],
                    },
                    night: {
                        shadowColor: [0.001, 0.02, 0.04],
                        midColor: [0.02, 0.06, 0.12],
                        highlightColor: [0.15, 0.22, 0.35],
                        colorMultiplier: [0.1, 0.15, 0.25],
                        treeShadowColor: [0.01, 0.02, 0.04],
                        treeMidColor: [0.04, 0.08, 0.15],
                        treeHighlightColor: [0.2, 0.3, 0.4],
                        treeColorMultiplier: [0.25, 0.3, 0.4],
                        birchShadowColor: [0.04, 0.05, 0.08],
                        birchMidColor: [0.08, 0.1, 0.15],
                        birchHighlightColor: [0.35, 0.4, 0.5],
                        birchColorMultiplier: [0.3, 0.35, 0.45],
                    },
                },
                lighting: {
                    day: {
                        key: {
                            color: 0xf0f8ff,
                            intensity: 2.0,
                            position: [-15, 12, 8],
                            castShadow: true,
                        },
                        fill: {
                            color: 0xd6e8ff,
                            intensity: 0.6,
                            position: [10, 5, -6],
                            castShadow: false,
                        },
                        ambient: {
                            color: 0xf5faff,
                            intensity: 0.4,
                        },
                        rim: {
                            color: 0xe6f2ff,
                            intensity: 0.3,
                            position: [5, 10, -12],
                            castShadow: false,
                        },
                        environment: {
                            intensity: 0.3,
                            backgroundIntensity: 1.0,
                            rotationY: 6.64,
                            rotationX: 3.95,
                            rotationZ: 6.27,
                        },
                        lamp: {
                            color: 0xffe286,
                            intensity: 0,
                            distance: 20,
                            decay: 1.5,
                            position: [2.9, 4.6, -5.5],
                            castShadow: false,
                        },
                    },
                    night: {
                        key: {
                            color: 0x1a3a5a,
                            intensity: 1.2,
                            position: [-10, 15, 5],
                            castShadow: true,
                        },
                        fill: {
                            color: 0x2a4a6a,
                            intensity: 0.15,
                            position: [10, 5, -6],
                            castShadow: false,
                        },
                        ambient: {
                            color: 0x3a4a5a,
                            intensity: 0.08,
                        },
                        rim: {
                            color: 0x6a8aaa,
                            intensity: 0.1,
                            position: [5, 10, -12],
                            castShadow: false,
                        },
                        environment: {
                            intensity: 0.12,
                            backgroundIntensity: 1.0,
                            rotationY: 3.25,
                            rotationX: 4.65,
                            rotationZ: 4.67,
                        },
                        lamp: {
                            color: 0xffe286,
                            intensity: 10,
                            distance: 20,
                            decay: 1.5,
                            position: [2.9, 4.6, -5.5],
                            castShadow: false,
                        },
                    },
                },
                ground: {
                    day: {
                        uGroundColorLight: new THREE.Color(0.11, 0.39, 0.62),
                        uGroundColorDark: new THREE.Color(0.85, 0.9, 0.95),
                        uGroundColorBelowGrass: new THREE.Color(0.65, 0.7, 0.75),
                        uRockColor: new THREE.Color(0.9, 0.95, 1.0),
                        uWaterShallow: new THREE.Color(0.7, 0.8, 0.95),
                        uWaterDeep: new THREE.Color(0.05, 0.28, 0.5),
                    },
                    night: {
                        uGroundColorLight: new THREE.Color(0.5, 0.55, 0.6),
                        uGroundColorDark: new THREE.Color(0.6, 0.65, 0.75),
                        uGroundColorBelowGrass: new THREE.Color(0.4, 0.45, 0.5),
                        uRockColor: new THREE.Color(0.7, 0.75, 0.85),
                        uWaterShallow: new THREE.Color(0.4, 0.5, 0.7),
                        uWaterDeep: new THREE.Color(0.15, 0.2, 0.4),
                    },
                },
                grass: {
                    day: {
                        shadow: new THREE.Color(0.2, 0.25, 0.29),
                        dark: new THREE.Color(0.9, 0.9, 0.9),
                        light: new THREE.Color(0.13, 0.32, 0.53),
                        flowerVisibility: 0.2,
                    },
                    night: {
                        shadow: new THREE.Color(0.005, 0.04, 0.08),
                        dark: new THREE.Color(0.02, 0.15, 0.25),
                        light: new THREE.Color(0.2, 0.35, 0.5),
                        flowerVisibility: 0.05,
                    },
                },
                fire: {
                    day: { smokeAlphaSecondStop: 0.15 },
                    night: { smokeAlphaSecondStop: 0.08 },
                },
                fallingLeaves: {
                    color: new THREE.Color(0xfd950c),
                },
                windLines: {
                    color: new THREE.Color(0xf0f8ff),
                },
                tent: {
                    lampColor: new THREE.Color(0xffe286),
                },
                rocks: {
                    day: {
                        uRockColor1: new THREE.Color(0.9, 0.95, 1.0),
                        uRockColor2: new THREE.Color(0.85, 0.9, 0.95),
                        uRockColor3: new THREE.Color(0.5, 0.55, 0.6),
                        uMossColor1: new THREE.Color(0.7, 0.8, 0.9),
                        uMossColor2: new THREE.Color(0.65, 0.75, 0.85),
                        uMossColor3: new THREE.Color(0.3, 0.35, 0.4),
                    },
                    night: {
                        uRockColor1: new THREE.Color(0.7, 0.75, 0.8),
                        uRockColor2: new THREE.Color(0.65, 0.7, 0.75),
                        uRockColor3: new THREE.Color(0.35, 0.4, 0.45),
                        uMossColor1: new THREE.Color(0.5, 0.6, 0.7),
                        uMossColor2: new THREE.Color(0.45, 0.55, 0.65),
                        uMossColor3: new THREE.Color(0.2, 0.25, 0.3),
                    },
                },
            },
            autumn: {
                bush: {
                    day: {
                        shadowColor: [0.12, 0.04, 0.001],
                        midColor: [0.35, 0.15, 0.03],
                        highlightColor: [0.95, 0.6, 0.2],
                        colorMultiplier: [0.85, 0.5, 0.25],
                        treeShadowColor: [0.08, 0.05, 0.01],
                        treeMidColor: [0.33, 0.05, 0.004],
                        treeHighlightColor: [0.85, 0.63, 0.0],
                        treeColorMultiplier: [0.9, 0.6, 0.3],
                        birchShadowColor: [0.09, 0.003, 0.004],
                        birchMidColor: [0.21, 0.01, 0.0],
                        birchHighlightColor: [0.8, 0.317, 0.058],
                        birchColorMultiplier: [0.9, 0.3, 0.2],
                    },
                    night: {
                        shadowColor: [0.0384, 0.0128, 0.00032],
                        midColor: [0.112, 0.048, 0.0096],
                        highlightColor: [0.304, 0.192, 0.064],
                        colorMultiplier: [0.272, 0.16, 0.08],
                        treeShadowColor: [0.0256, 0.016, 0.0032],
                        treeMidColor: [0.1056, 0.016, 0.00128],
                        treeHighlightColor: [0.272, 0.2016, 0.0],
                        treeColorMultiplier: [0.288, 0.192, 0.096],
                        birchShadowColor: [0.0288, 0.00096, 0.00128],
                        birchMidColor: [0.0672, 0.0032, 0.0],
                        birchHighlightColor: [0.256, 0.10144, 0.01856],
                        birchColorMultiplier: [0.288, 0.096, 0.064],
                    },
                },
                lighting: {
                    day: {
                        key: {
                            color: 0xffead6,
                            intensity: 2.4,
                            position: [-15, 12, 8],
                            castShadow: true,
                        },
                        fill: {
                            color: 0xff9966,
                            intensity: 0.8,
                            position: [10, 5, -6],
                            castShadow: false,
                        },
                        ambient: {
                            color: 0xfff2e6,
                            intensity: 0.5,
                        },
                        rim: {
                            color: 0xffb366,
                            intensity: 0.4,
                            position: [5, 10, -12],
                            castShadow: false,
                        },
                        environment: {
                            intensity: 0.4,
                            backgroundIntensity: 1.0,
                            rotationY: 6.64,
                            rotationX: 3.95,
                            rotationZ: 6.27,
                        },
                        lamp: {
                            color: 0xffe286,
                            intensity: 0,
                            distance: 20,
                            decay: 1.5,
                            position: [2.9, 4.6, -5.5],
                            castShadow: false,
                        },
                    },
                    night: {
                        key: {
                            color: 0x6b4423,
                            intensity: 0.3,
                            position: [-10, 15, 5],
                            castShadow: true,
                        },
                        fill: {
                            color: 0x5a3d2a,
                            intensity: 0.22,
                            position: [10, 5, -6],
                            castShadow: false,
                        },
                        ambient: {
                            color: 0x4d3a2b,
                            intensity: 0.12,
                        },
                        rim: {
                            color: 0x8b6f47,
                            intensity: 0.15,
                            position: [5, 10, -12],
                            castShadow: false,
                        },
                        environment: {
                            intensity: 0.05,
                            backgroundIntensity: 1.0,
                            rotationY: 3.25,
                            rotationX: 4.65,
                            rotationZ: 4.67,
                        },
                        lamp: {
                            color: 0xffe286,
                            intensity: 10,
                            distance: 20,
                            decay: 1.5,
                            position: [2.9, 4.6, -5.5],
                            castShadow: false,
                        },
                    },
                },
                ground: {
                    day: {
                        uGroundColorLight: new THREE.Color(0.45, 0.28, 0.15),
                        uGroundColorDark: new THREE.Color(0.9, 0.65, 0.4),
                        uGroundColorBelowGrass: new THREE.Color(0.3, 0.2, 0.1),
                        uRockColor: new THREE.Color(0.95, 0.7, 0.5),
                        uWaterShallow: new THREE.Color(1.0, 0.49, 0.16),
                        uWaterDeep: new THREE.Color(0.07, 0.64, 0.72),
                    },
                    night: {
                        uGroundColorLight: new THREE.Color(0.3, 0.2, 0.12),
                        uGroundColorDark: new THREE.Color(0.7, 0.5, 0.35),
                        uGroundColorBelowGrass: new THREE.Color(0.2, 0.15, 0.08),
                        uRockColor: new THREE.Color(0.75, 0.55, 0.4),
                        uWaterShallow: new THREE.Color(0.58, 0.23, 0.0),
                        uWaterDeep: new THREE.Color(0.18, 0.83, 0.86),
                    },
                },
                grass: {
                    day: {
                        shadow: new THREE.Color(0.13, 0.062, 0.0039),
                        dark: new THREE.Color(0.278, 0.019, 0.0),
                        light: new THREE.Color(0.67, 0.498, 0.003),
                        flowerVisibility: 0.9,
                    },
                    night: {
                        shadow: new THREE.Color(0.05, 0.025, 0.01),
                        dark: new THREE.Color(0.15, 0.1, 0.04),
                        light: new THREE.Color(0.4, 0.3, 0.15),
                        flowerVisibility: 0.15,
                    },
                },
                fire: {
                    day: { smokeAlphaSecondStop: 0.08 },
                    night: { smokeAlphaSecondStop: 0.04 },
                },
                fallingLeaves: {
                    color: new THREE.Color(0xff6347),
                },
                windLines: {
                    color: new THREE.Color(0xffead6),
                },
                tent: {
                    lampColor: new THREE.Color(0xffe286),
                },
                rocks: {
                    day: {
                        uRockColor1: new THREE.Color(0.95, 0.75, 0.55),
                        uRockColor2: new THREE.Color(0.9, 0.7, 0.5),
                        uRockColor3: new THREE.Color(0.5, 0.35, 0.2),
                        uMossColor1: new THREE.Color(0.85, 0.6, 0.3),
                        uMossColor2: new THREE.Color(0.8, 0.55, 0.25),
                        uMossColor3: new THREE.Color(0.3, 0.2, 0.1),
                    },
                    night: {
                        uRockColor1: new THREE.Color(0.7, 0.55, 0.4),
                        uRockColor2: new THREE.Color(0.65, 0.5, 0.35),
                        uRockColor3: new THREE.Color(0.35, 0.25, 0.15),
                        uMossColor1: new THREE.Color(0.6, 0.4, 0.2),
                        uMossColor2: new THREE.Color(0.55, 0.35, 0.18),
                        uMossColor3: new THREE.Color(0.2, 0.15, 0.08),
                    },
                },
            },
            rainy: {
                bush: {
                    day: {
                        shadowColor: [0.0, 0.019, 0.019],
                        midColor: [0.011, 0.05, 0.007],
                        highlightColor: [0.102, 0.2, 0.019],
                        colorMultiplier: [0.148, 0.405, 0.094],
                        treeShadowColor: [0.0, 0.019, 0.019],
                        treeMidColor: [0.011, 0.05, 0.007],
                        treeHighlightColor: [0.102, 0.2, 0.019],
                        treeColorMultiplier: [0.148, 0.405, 0.094],
                        birchShadowColor: [0.029, 0.027, 0.0],
                        birchMidColor: [0.061, 0.027, 0.0],
                        birchHighlightColor: [0.19, 0.2, 0.01],
                        birchColorMultiplier: [0.68, 0.56, 0.22],
                    },
                    night: {
                        shadowColor: [0.0, 0.017, 0.005],
                        midColor: [0.004, 0.046, 0.013],
                        highlightColor: [0.029, 0.114, 0.04],
                        colorMultiplier: [0.018, 0.074, 0.002],
                        treeShadowColor: [0.002, 0.017, 0.0],
                        treeMidColor: [0.008, 0.057, 0.002],
                        treeHighlightColor: [0.038, 0.143, 0.013],
                        treeColorMultiplier: [0.048, 0.137, 0.0],
                        birchShadowColor: [0.006, 0.009, 0.0],
                        birchMidColor: [0.015, 0.009, 0.0],
                        birchHighlightColor: [0.14, 0.15, 0],
                        birchColorMultiplier: [0.48, 0.36, 0.02],
                    },
                },
                lighting: {
                    day: {
                        key: {
                            color: 0x24638a,
                            intensity: 0.15,
                            position: [-15, 12, 8],
                            castShadow: true,
                        },
                        fill: {
                            color: 0xb3d9ff,
                            intensity: 0.1,
                            position: [10, 5, -6],
                            castShadow: false,
                        },
                        ambient: {
                            color: 0x243c5c,
                            intensity: 1.5,
                        },
                        rim: {
                            color: 0x255088,
                            intensity: 0.3,
                            position: [5, 10, -12],
                            castShadow: false,
                        },
                        environment: {
                            intensity: 0.15,
                            backgroundIntensity: 1.0,
                            rotationY: 6.64,
                            rotationX: 3.95,
                            rotationZ: 6.27,
                        },
                        lamp: {
                            color: 0xffe286,
                            intensity: 0,
                            distance: 20,
                            decay: 1.5,
                            position: [2.9, 4.6, -5.5],
                            castShadow: false,
                        },
                    },
                    night: {
                        key: {
                            color: 0x0f1f3f,
                            intensity: 1.1,
                            position: [-10, 15, 5],
                            castShadow: true,
                        },
                        fill: {
                            color: 0x1a2a4a,
                            intensity: 0.25,
                            position: [10, 5, -6],
                            castShadow: false,
                        },
                        ambient: {
                            color: 0x2a3a4a,
                            intensity: 0.15,
                        },
                        rim: {
                            color: 0x5a7a9a,
                            intensity: 0.18,
                            position: [5, 10, -12],
                            castShadow: false,
                        },
                        environment: {
                            intensity: 0.1,
                            backgroundIntensity: 1.0,
                            rotationY: 3.25,
                            rotationX: 4.65,
                            rotationZ: 4.67,
                        },
                        lamp: {
                            color: 0xffe286,
                            intensity: 10,
                            distance: 20,
                            decay: 1.5,
                            position: [2.9, 4.6, -5.5],
                            castShadow: false,
                        },
                    },
                },
                ground: {
                    day: {
                        uGroundColorLight: new THREE.Color(0.12, 0.054, 0.0),
                        uGroundColorDark: new THREE.Color(0.93, 0.57, 0.21),
                        uGroundColorBelowGrass: new THREE.Color(0.039, 0.018, 0.0),
                        uRockColor: new THREE.Color(0.6, 0.5, 0.45),
                        uWaterShallow: new THREE.Color(0.47, 0.25, 0.07),
                        uWaterDeep: new THREE.Color(0.058, 0.39, 0.5),
                    },
                    night: {
                        uGroundColorLight: new THREE.Color(0.15, 0.12, 0.1),
                        uGroundColorDark: new THREE.Color(0.4, 0.35, 0.25),
                        uGroundColorBelowGrass: new THREE.Color(0.08, 0.12, 0.06),
                        uRockColor: new THREE.Color(0.45, 0.4, 0.35),
                        uWaterShallow: new THREE.Color(0.3, 0.4, 0.6),
                        uWaterDeep: new THREE.Color(0.08, 0.2, 0.3),
                    },
                },
                grass: {
                    day: {
                        shadow: new THREE.Color(0.039, 0.018, 0.01),
                        dark: new THREE.Color(0.015, 0.12, 0.0),
                        light: new THREE.Color(0, 0.2, 0.031),
                        flowerVisibility: 0.3,
                    },
                    night: {
                        shadow: new THREE.Color(0.002, 0.06, 0.002),
                        dark: new THREE.Color(0.015, 0.25, 0.03),
                        light: new THREE.Color(0.25, 0.45, 0.2),
                        flowerVisibility: 0.2,
                    },
                },
                fire: {
                    day: { smokeAlphaSecondStop: 0.12 },
                    night: { smokeAlphaSecondStop: 0.06 },
                },
                fallingLeaves: {
                    color: new THREE.Color(0x00591c),
                },
                windLines: {
                    color: new THREE.Color(0xf0f4ff),
                },
                tent: {
                    lampColor: new THREE.Color(0xffe286),
                },
                rocks: {
                    day: {
                        uRockColor1: new THREE.Color(0.6, 0.55, 0.5),
                        uRockColor2: new THREE.Color(0.55, 0.5, 0.45),
                        uRockColor3: new THREE.Color(0.25, 0.22, 0.2),
                        uMossColor1: new THREE.Color(0.039, 0.078, 0.0),
                        uMossColor2: new THREE.Color(0.16, 0.25, 0.0),
                        uMossColor3: new THREE.Color(0.0039, 0.19, 0.035),
                    },
                    night: {
                        uRockColor1: new THREE.Color(0.4, 0.38, 0.35),
                        uRockColor2: new THREE.Color(0.35, 0.33, 0.3),
                        uRockColor3: new THREE.Color(0.18, 0.15, 0.12),
                        uMossColor1: new THREE.Color(0.2, 0.45, 0.15),
                        uMossColor2: new THREE.Color(0.18, 0.4, 0.12),
                        uMossColor3: new THREE.Color(0.08, 0.2, 0.05),
                    },
                },
            },
        };
    }
    get currentSeason() {
        return this._currentSeason;
    }
    set currentSeason(value) {
        if (!this.availableSeasons.includes(value)) {
            console.warn(`Invalid season value: ${value}. Must be one of:`, this.availableSeasons);
            return;
        }
        const oldValue = this._currentSeason;
        if (oldValue === value) {
            return;
        }
        this._currentSeason = value;
        this.trigger('seasonChanged', value, oldValue);
    }
    toggle() {
        const currentIndex = this.availableSeasons.indexOf(this._currentSeason);
        const nextIndex = (currentIndex + 1) % this.availableSeasons.length;
        this.currentSeason = this.availableSeasons[nextIndex];
    }
    setSeason(season) {
        this.currentSeason = season;
    }
    getSeasonConfig(season = this._currentSeason) {
        return this.seasonConfigs[season];
    }
    getColorConfig(component, timeOfDay, season = this._currentSeason) {
        const config = this.seasonConfigs[season];
        if (!config || !config[component]) {
            console.warn(`No config found for component: ${component} in season: ${season}`);
            return null;
        }
        if (timeOfDay && config[component][timeOfDay]) {
            return config[component][timeOfDay];
        }
        return config[component];
    }
    onChange(callback) {
        this.on('seasonChanged', callback);
        return this;
    }
    offChange(callback) {
        this.off('seasonChanged');
        return this;
    }
    reset() {
        this.currentSeason = 'spring';
    }
}
exports.default = SeasonManager;

  },
  "src/Game/World/Systems/Lightning.class.js": function(module, exports, require) {
"use strict";
const __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
const __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
let _Lightning_explosionMaterial, _Lightning_activeLightningArcs;
Object.defineProperty(exports, "__esModule", { value: true });
const THREE = require("three");
const Game_class_1 = require("../../Game.class");
const ParticleSystem_class_1 = require("./ParticleSystem.class");
const MATH = require("../../Utils/Math.class");
const vertex_glsl_1 = require("../../../Shaders/Materials/fire/vertex.glsl");
const fragment_glsl_1 = require("../../../Shaders/Materials/fire/fragment.glsl");
const vertex_glsl_2 = require("../../../Shaders/Materials/lightning/vertex.glsl");
const fragment_glsl_2 = require("../../../Shaders/Materials/lightning/fragment.glsl");
class Lightning {
    constructor(particleSystem, groundBounds = null) {
        _Lightning_explosionMaterial.set(this, null);
        _Lightning_activeLightningArcs.set(this, []);
        this.game = Game_class_1.default.getInstance();
        this.particleSystem = particleSystem;
        this.scene = this.game.scene;
        this.baseGroundBounds = groundBounds || {
            minX: -5.5,
            maxX: 5.5,
            minZ: -5.5,
            maxZ: 5.5,
        };
        this.groundBounds = { ...this.baseGroundBounds };
        this.updateBoundsForAspectRatio();
        this.handleResize = this.updateBoundsForAspectRatio.bind(this);
        window.addEventListener('resize', this.handleResize);
        this.nextLightningTime = this.getRandomDelay();
        this.elapsedTime = 0;
        this.cameraShakeDuration = 0.65;
        this.cameraShakeIntensity = 0.85;
        this.cameraShakeFrequency = 25;
        this.cameraShakeDecay = 2.5;
        this.colorA = new THREE.Color(0xff8117);
        this.colorB = new THREE.Color(0xffd500);
        this.intensity = 3;
        this.colorLightningA = new THREE.Color(0x0000ff);
        this.colorLightningB = new THREE.Color(0x00ffff);
        this.explosionParticles = {
            count: 100,
            duration: 1,
            maxLife: 1.3,
            velocityMagnitude: 5.6,
            velocityMagnitudeVariance: 0.5,
            rotationAngularVariance: Math.PI * 2,
            gravity: true,
            gravityStrength: -1.5,
            dragCoefficient: -2.5,
            positionRadiusVariance: 0,
        };
        this._createParticleStops();
        this.setupArc();
        this.createExplosionMaterial();
        this.isDebugMode = this.game.isDebugMode;
        if (this.isDebugMode) {
            this.initGUI();
        }
    }
    _createParticleStops() {
        this.sizeStops = [
            { time: 0.0, value: 0.1 },
            { time: 0.1, value: 0.68 },
            { time: 1.0, value: 0.0 },
        ];
        this.alphaStops = [
            { time: 0.0, value: 1.0 },
            { time: 0.5, value: 0.8 },
            { time: 1.0, value: 0.0 },
        ];
        this.colorStops = [
            { time: 0.0, value: this.colorA.clone() },
            {
                time: 0.5,
                value: new THREE.Color().lerpColors(this.colorA, this.colorB, 0.5),
            },
            { time: 1.0, value: this.colorB.clone() },
        ];
        this.twinkleStops = [
            { time: 0.0, value: 0.8 },
            { time: 0.5, value: 0.5 },
            { time: 1.0, value: 0.2 },
        ];
    }
    _buildInterpolantsAndTextures() {
        this.sizeOverLife = new MATH.FloatInterpolat(this.sizeStops.map((s) => ({ time: s.time, value: s.value })));
        this.alphaOverLife = new MATH.FloatInterpolat(this.alphaStops.map((s) => ({ time: s.time, value: s.value })));
        this.colorOverLife = new MATH.ColorInterpolat(this.colorStops.map((s) => ({ time: s.time, value: s.value })));
        this.twinkleOverLife = new MATH.FloatInterpolat(this.twinkleStops.map((s) => ({ time: s.time, value: s.value })));
        const sizeTex = this.sizeOverLife.toTexture();
        const colorTex = this.colorOverLife.toTexture(this.alphaOverLife);
        const twinkleTex = this.twinkleOverLife.toTexture();
        if (__classPrivateFieldGet(this, _Lightning_explosionMaterial, "f")) {
            __classPrivateFieldGet(this, _Lightning_explosionMaterial, "f").uniforms.uSizeOverLife.value = sizeTex;
            __classPrivateFieldGet(this, _Lightning_explosionMaterial, "f").uniforms.uColorOverLife.value = colorTex;
            __classPrivateFieldGet(this, _Lightning_explosionMaterial, "f").uniforms.uTwinkleOverLife.value = twinkleTex;
            sizeTex.needsUpdate = true;
            colorTex.needsUpdate = true;
            twinkleTex.needsUpdate = true;
        }
    }
    createExplosionMaterial() {
        const particleTexture = this.game.resources.items.particleTexture;
        if (particleTexture) {
            particleTexture.flipY = false;
            particleTexture.needsUpdate = true;
        }
        this._buildInterpolantsAndTextures();
        __classPrivateFieldSet(this, _Lightning_explosionMaterial, new THREE.ShaderMaterial({
            vertexShader: vertex_glsl_1.default,
            fragmentShader: fragment_glsl_1.default,
            uniforms: {
                uTime: { value: 0 },
                uParticleTexture: { value: particleTexture },
                uSizeOverLife: { value: this.sizeOverLife.toTexture() },
                uColorOverLife: {
                    value: this.colorOverLife.toTexture(this.alphaOverLife),
                },
                uTwinkleOverLife: { value: this.twinkleOverLife.toTexture() },
                uSizeMultiplier: { value: 1.0 },
                uColorTint: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
            },
            depthWrite: false,
            depthTest: true,
            transparent: true,
            blending: THREE.AdditiveBlending,
        }), "f");
        __classPrivateFieldGet(this, _Lightning_explosionMaterial, "f").uniforms.uSizeOverLife.value.needsUpdate = true;
        __classPrivateFieldGet(this, _Lightning_explosionMaterial, "f").uniforms.uColorOverLife.value.needsUpdate = true;
        __classPrivateFieldGet(this, _Lightning_explosionMaterial, "f").uniforms.uTwinkleOverLife.value.needsUpdate = true;
    }
    getRandomDelay() {
        return 10 + Math.random() * 10;
    }
    setupArc() {
        this.arc = {
            duration: 3,
            meshes: [],
        };
    }
    createArcMesh(position) {
        const points = [];
        const pointsCount = 15;
        const height = 15;
        const interY = height / (pointsCount - 1);
        for (let i = 0; i < pointsCount; i++) {
            const point = new THREE.Vector3((Math.random() - 0.5) * 1, i * interY, (Math.random() - 0.5) * 1);
            points.push(point);
        }
        const curve = new THREE.CatmullRomCurve3(points);
        const geometry = new THREE.TubeGeometry(curve, 18, 0.07, 8, false);
        const startTime = this.game.time?.elapsedTime ?? performance.now() / 1000;
        const material = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            uniforms: {
                uTime: { value: startTime },
                uStartTime: { value: startTime },
                uDuration: { value: this.arc.duration },
                uColorA: { value: this.colorLightningA },
                uColorB: { value: this.colorLightningB },
                uIntensity: { value: this.intensity },
            },
            vertexShader: vertex_glsl_2.default,
            fragmentShader: fragment_glsl_2.default,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.frustumCulled = false;
        this.scene.add(mesh);
        __classPrivateFieldGet(this, _Lightning_activeLightningArcs, "f").push(mesh);
        return mesh;
    }
    createExplosionParticles(position) {
        const params = new ParticleSystem_class_1.EmitterParams();
        params.maxLife = this.explosionParticles.maxLife;
        params.maxParticles = this.explosionParticles.count;
        params.maxEmission = this.explosionParticles.count;
        params.emissionRate = this.explosionParticles.count;
        params.velocityMagnitude = this.explosionParticles.velocityMagnitude;
        params.velocityMagnitudeVariance =
            this.explosionParticles.velocityMagnitudeVariance;
        params.rotationAngularVariance =
            this.explosionParticles.rotationAngularVariance;
        params.gravity = this.explosionParticles.gravity;
        params.gravityStrength = this.explosionParticles.gravityStrength;
        params.dragCoefficient = this.explosionParticles.dragCoefficient;
        const rendererParams = new ParticleSystem_class_1.ParticleRendererParams();
        rendererParams.maxParticles = this.explosionParticles.count;
        rendererParams.group = new THREE.Group();
        params.renderer = new ParticleSystem_class_1.ParticleRenderer();
        params.renderer.initialize(__classPrivateFieldGet(this, _Lightning_explosionMaterial, "f"), rendererParams);
        const shape = new ParticleSystem_class_1.PointShape();
        shape.position.copy(position);
        shape.positionRadiusVariance =
            this.explosionParticles.positionRadiusVariance;
        params.shape = shape;
        const emitter = new ParticleSystem_class_1.Emitter(params);
        this.particleSystem.addEmitter(emitter);
        this.scene.add(rendererParams.group);
        return emitter;
    }
    triggerCameraShake(strikePosition = null) {
        const camera = this.game.camera.cameraInstance;
        const originalPosition = camera.position.clone();
        const shakeStart = performance.now();
        let shakeDirection = new THREE.Vector3(0, 0, 1);
        if (strikePosition) {
            shakeDirection = new THREE.Vector3()
                .subVectors(strikePosition, camera.position)
                .normalize();
        }
        const shake = () => {
            const elapsed = (performance.now() - shakeStart) / 1000;
            const progress = Math.min(elapsed / this.cameraShakeDuration, 1);
            if (progress < 1) {
                const easeIn = progress < 0.1 ? Math.pow(progress / 0.1, 2) : 1;
                const decayFactor = Math.pow(1 - progress, this.cameraShakeDecay);
                const currentIntensity = this.cameraShakeIntensity * decayFactor * easeIn;
                const time = elapsed * this.cameraShakeFrequency;
                const noise1 = Math.sin(time * 1.0) * 0.6;
                const noise2 = Math.sin(time * 2.3) * 0.3;
                const noise3 = Math.sin(time * 4.7) * 0.1;
                const combinedNoise = noise1 + noise2 + noise3;
                const randomX = (Math.random() - 0.5) * 2;
                const randomY = (Math.random() - 0.5) * 2;
                const randomZ = (Math.random() - 0.5) * 2;
                camera.position.x =
                    originalPosition.x +
                        (randomX + shakeDirection.x * combinedNoise * 0.5) * currentIntensity;
                camera.position.y =
                    originalPosition.y +
                        (randomY + shakeDirection.y * combinedNoise * 0.5) * currentIntensity;
                camera.position.z =
                    originalPosition.z +
                        (randomZ + shakeDirection.z * combinedNoise * 0.5) * currentIntensity;
                requestAnimationFrame(shake);
            }
            else {
                camera.position.copy(originalPosition);
            }
        };
        shake();
    }
    strike(position) {
        const arcMesh = this.createArcMesh(position);
        this.createExplosionParticles(position);
        this.triggerCameraShake(position);
        if (this.game.ambientSoundManager) {
            this.game.ambientSoundManager.playThunderStrike();
        }
        setTimeout(() => {
            this.scene.remove(arcMesh);
            arcMesh.geometry.dispose();
            arcMesh.material.dispose();
            const index = __classPrivateFieldGet(this, _Lightning_activeLightningArcs, "f").indexOf(arcMesh);
            if (index > -1) {
                __classPrivateFieldGet(this, _Lightning_activeLightningArcs, "f").splice(index, 1);
            }
        }, this.arc.duration * 1000);
    }
    strikeRandom() {
        const x = this.groundBounds.minX +
            Math.random() * (this.groundBounds.maxX - this.groundBounds.minX);
        const z = this.groundBounds.minZ +
            Math.random() * (this.groundBounds.maxZ - this.groundBounds.minZ);
        const position = new THREE.Vector3(x, 0, z);
        this.strike(position);
    }
    manualStrike() {
        this.strikeRandom();
    }
    setGroundBounds(bounds) {
        this.baseGroundBounds = { ...bounds };
        this.updateBoundsForAspectRatio();
    }
    updateBoundsForAspectRatio() {
        const sizes = this.game.sizes;
        const aspectRatio = sizes.width / sizes.height;
        const idealRatio = 16 / 9;
        this.groundBounds = { ...this.baseGroundBounds };
        if (aspectRatio < idealRatio) {
            const shrinkFactor = aspectRatio / idealRatio;
            const centerX = (this.baseGroundBounds.minX + this.baseGroundBounds.maxX) / 2;
            const halfWidthX = (this.baseGroundBounds.maxX - this.baseGroundBounds.minX) / 2;
            this.groundBounds.minX = centerX - halfWidthX * shrinkFactor;
            this.groundBounds.maxX = centerX + halfWidthX * shrinkFactor;
            if (aspectRatio < 1) {
                const centerZ = (this.baseGroundBounds.minZ + this.baseGroundBounds.maxZ) / 2;
                const halfWidthZ = (this.baseGroundBounds.maxZ - this.baseGroundBounds.minZ) / 2;
                const zShrink = 0.7 + aspectRatio * 0.3;
                this.groundBounds.minZ = centerZ - halfWidthZ * zShrink;
                this.groundBounds.maxZ = centerZ + halfWidthZ * zShrink;
            }
        }
    }
    isRainySeason() {
        return this.game.seasonManager?.currentSeason === 'rainy';
    }
    update(delta) {
        this.elapsedTime += delta;
        const currentTime = this.game.time?.elapsedTime || performance.now() / 1000;
        if (__classPrivateFieldGet(this, _Lightning_explosionMaterial, "f")) {
            __classPrivateFieldGet(this, _Lightning_explosionMaterial, "f").uniforms.uTime.value = currentTime;
        }
        for (const arc of __classPrivateFieldGet(this, _Lightning_activeLightningArcs, "f")) {
            if (arc.material?.uniforms?.uTime) {
                arc.material.uniforms.uTime.value = currentTime;
            }
        }
        if (this.isRainySeason() && this.elapsedTime >= this.nextLightningTime) {
            this.strikeRandom();
            this.elapsedTime = 0;
            this.nextLightningTime = this.getRandomDelay();
        }
    }
    dispose() {
        window.removeEventListener('resize', this.handleResize);
        if (__classPrivateFieldGet(this, _Lightning_explosionMaterial, "f")) {
            __classPrivateFieldGet(this, _Lightning_explosionMaterial, "f").dispose();
        }
        for (const arc of __classPrivateFieldGet(this, _Lightning_activeLightningArcs, "f")) {
            this.scene.remove(arc);
            arc.geometry.dispose();
            arc.material.dispose();
        }
        __classPrivateFieldSet(this, _Lightning_activeLightningArcs, [], "f");
    }
    initGUI() {
        if (!this.game.debug)
            return;
        const folder = 'Lightning/Explosion Particles';
        this.game.debug.add(this.explosionParticles, 'count', { min: 1, max: 500, step: 1, label: 'Particle Count' }, folder);
        this.game.debug.add(this.explosionParticles, 'maxLife', { min: 0.1, max: 10, step: 0.1, label: 'Max Life' }, folder);
        this.game.debug.add(this.explosionParticles, 'velocityMagnitude', { min: 0, max: 50, step: 0.5, label: 'Velocity Magnitude' }, folder);
        this.game.debug.add(this.explosionParticles, 'velocityMagnitudeVariance', { min: 0, max: 30, step: 0.5, label: 'Velocity Variance' }, folder);
        this.game.debug.add(this.explosionParticles, 'rotationAngularVariance', { min: 0, max: Math.PI * 2, step: 0.1, label: 'Rotation Variance' }, folder);
        this.game.debug.add(this.explosionParticles, 'gravity', { label: 'Gravity Enabled' }, folder);
        this.game.debug.add(this.explosionParticles, 'gravityStrength', { min: -5, max: 5, step: 0.1, label: 'Gravity Strength' }, folder);
        this.game.debug.add(this.explosionParticles, 'dragCoefficient', { min: -5, max: 0, step: 0.1, label: 'Drag Coefficient' }, folder);
        this.game.debug.add(this.explosionParticles, 'positionRadiusVariance', { min: 0, max: 5, step: 0.1, label: 'Position Radius Variance' }, folder);
        const shakeFolder = 'Lightning/Camera Shake';
        this.game.debug.add(this, 'cameraShakeDuration', { min: 0.1, max: 2, step: 0.05, label: 'Duration' }, shakeFolder);
        this.game.debug.add(this, 'cameraShakeIntensity', { min: 0, max: 2, step: 0.05, label: 'Intensity' }, shakeFolder);
        this.game.debug.add(this, 'cameraShakeFrequency', { min: 5, max: 50, step: 1, label: 'Frequency (Hz)' }, shakeFolder);
        this.game.debug.add(this, 'cameraShakeDecay', { min: 0.5, max: 5, step: 0.1, label: 'Decay Curve' }, shakeFolder);
        this._addParticleInterpolantGUI();
    }
    _addParticleInterpolantGUI() {
        const folder = 'Lightning/Material';
        this.sizeStops.forEach((stop) => {
            this.game.debug
                .add(stop, 'value', { min: 0, max: 2, step: 0.01, label: `Size @ ${stop.time}` }, folder)
                .onChange(() => this._buildInterpolantsAndTextures());
        });
        this.alphaStops.forEach((stop) => {
            this.game.debug
                .add(stop, 'value', { min: 0, max: 1, step: 0.01, label: `Alpha @ ${stop.time}` }, folder)
                .onChange(() => this._buildInterpolantsAndTextures());
        });
        this.colorStops.forEach((stop) => {
            const colorObj = { color: `#${stop.value.getHexString()}` };
            this.game.debug
                .add(colorObj, 'color', { color: true, label: `Color @ ${stop.time}` }, folder)
                .onChange((hex) => {
                stop.value.set(hex);
                this._buildInterpolantsAndTextures();
            });
        });
        this.twinkleStops.forEach((stop) => {
            this.game.debug
                .add(stop, 'value', { min: 0, max: 2, step: 0.01, label: `Twinkle @ ${stop.time}` }, folder)
                .onChange(() => this._buildInterpolantsAndTextures());
        });
        this.game.debug.add(__classPrivateFieldGet(this, _Lightning_explosionMaterial, "f").uniforms.uSizeMultiplier, 'value', { min: 0, max: 3, step: 0.01, label: 'Size Multiplier' }, folder);
    }
}
_Lightning_explosionMaterial = new WeakMap(), _Lightning_activeLightningArcs = new WeakMap();
exports.default = Lightning;

  },
  "src/Game/World/Systems/ParticleSystem.class.js": function(module, exports, require) {
"use strict";
const __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
const __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
let _ParticleSystem_emitters, _ParticleRenderer_particlesGeometry, _ParticleRenderer_particleMesh, _ParticleRenderer_material, _ParticleRenderer_lastParticleCount, _PointShape_tempVec, _Emitter_instances, _Emitter_particles, _Emitter_particlePool, _Emitter_emissionTime, _Emitter_numParticlesEmitted, _Emitter_params, _Emitter_dead, _Emitter_tempVec, _Emitter_hasOnCreated, _Emitter_hasOnUpdate, _Emitter_hasOnDestroy, _Emitter_secondsPerParticle, _Emitter_acquireParticle, _Emitter_releaseParticle;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PointShape = exports.EmitterShape = exports.Particle = exports.EmitterParams = exports.Emitter = exports.ParticleRendererParams = exports.ParticleRenderer = exports.ParticleSystem = void 0;
const THREE = require("three");
const MATH = require("../../Utils/Math.class");
const GRAVITY = new THREE.Vector3(0, -0.09, 0);
const DRAG = -0.5;
class ParticleSystem {
    constructor() {
        _ParticleSystem_emitters.set(this, []);
    }
    dispose() {
        for (let i = 0; i < __classPrivateFieldGet(this, _ParticleSystem_emitters, "f").length; i++) {
            __classPrivateFieldGet(this, _ParticleSystem_emitters, "f")[i].dispose();
        }
    }
    get StillActive() {
        for (let i = 0; i < __classPrivateFieldGet(this, _ParticleSystem_emitters, "f").length; i++) {
            if (__classPrivateFieldGet(this, _ParticleSystem_emitters, "f")[i].StillActive) {
                return true;
            }
        }
        return false;
    }
    addEmitter(emitter) {
        __classPrivateFieldGet(this, _ParticleSystem_emitters, "f").push(emitter);
    }
    update(elapsedTime, totalTimeElapsed) {
        for (let i = __classPrivateFieldGet(this, _ParticleSystem_emitters, "f").length - 1; i >= 0; i--) {
            const e = __classPrivateFieldGet(this, _ParticleSystem_emitters, "f")[i];
            if (!e.StillActive) {
                e.dispose();
                __classPrivateFieldGet(this, _ParticleSystem_emitters, "f")[i] = __classPrivateFieldGet(this, _ParticleSystem_emitters, "f")[__classPrivateFieldGet(this, _ParticleSystem_emitters, "f").length - 1];
                __classPrivateFieldGet(this, _ParticleSystem_emitters, "f").pop();
            }
            else {
                e.update(elapsedTime, totalTimeElapsed);
            }
        }
    }
}
exports.ParticleSystem = ParticleSystem;
_ParticleSystem_emitters = new WeakMap();
class ParticleRendererParams {
    constructor() {
        this.maxParticles = 100;
        this.group = new THREE.Group();
    }
}
exports.ParticleRendererParams = ParticleRendererParams;
class ParticleRenderer {
    constructor() {
        _ParticleRenderer_particlesGeometry.set(this, null);
        _ParticleRenderer_particleMesh.set(this, null);
        _ParticleRenderer_material.set(this, null);
        _ParticleRenderer_lastParticleCount.set(this, 0);
    }
    dispose() {
        if (__classPrivateFieldGet(this, _ParticleRenderer_particleMesh, "f")) {
            __classPrivateFieldGet(this, _ParticleRenderer_particleMesh, "f").removeFromParent();
            __classPrivateFieldSet(this, _ParticleRenderer_particleMesh, null, "f");
        }
        if (__classPrivateFieldGet(this, _ParticleRenderer_particlesGeometry, "f")) {
            __classPrivateFieldGet(this, _ParticleRenderer_particlesGeometry, "f").dispose();
            __classPrivateFieldSet(this, _ParticleRenderer_particlesGeometry, null, "f");
        }
        if (__classPrivateFieldGet(this, _ParticleRenderer_material, "f")) {
            __classPrivateFieldGet(this, _ParticleRenderer_material, "f").dispose();
            __classPrivateFieldSet(this, _ParticleRenderer_material, null, "f");
        }
    }
    initialize(material, params) {
        __classPrivateFieldSet(this, _ParticleRenderer_particlesGeometry, new THREE.BufferGeometry(), "f");
        const positions = new Float32Array(params.maxParticles * 3);
        const particleData = new Float32Array(params.maxParticles * 2);
        __classPrivateFieldGet(this, _ParticleRenderer_particlesGeometry, "f").setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        __classPrivateFieldGet(this, _ParticleRenderer_particlesGeometry, "f").setAttribute('particleData', new THREE.Float32BufferAttribute(particleData, 2));
        __classPrivateFieldGet(this, _ParticleRenderer_particlesGeometry, "f").attributes.position.setUsage(THREE.DynamicDrawUsage);
        __classPrivateFieldGet(this, _ParticleRenderer_particlesGeometry, "f").attributes.particleData.setUsage(THREE.DynamicDrawUsage);
        __classPrivateFieldGet(this, _ParticleRenderer_particlesGeometry, "f").boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1000);
        __classPrivateFieldSet(this, _ParticleRenderer_particleMesh, new THREE.Points(__classPrivateFieldGet(this, _ParticleRenderer_particlesGeometry, "f"), material), "f");
        __classPrivateFieldSet(this, _ParticleRenderer_material, material, "f");
        params.group.add(__classPrivateFieldGet(this, _ParticleRenderer_particleMesh, "f"));
    }
    updateFromParticles(particles, totalTimeElapsed) {
        if (!__classPrivateFieldGet(this, _ParticleRenderer_particleMesh, "f"))
            return;
        __classPrivateFieldGet(this, _ParticleRenderer_material, "f").uniforms.uTime.value = totalTimeElapsed;
        const positions = __classPrivateFieldGet(this, _ParticleRenderer_particlesGeometry, "f").attributes.position.array;
        const particleData = __classPrivateFieldGet(this, _ParticleRenderer_particlesGeometry, "f").attributes.particleData.array;
        const count = particles.length;
        for (let i = 0; i < count; i++) {
            const p = particles[i];
            const i3 = i * 3;
            const i2 = i * 2;
            positions[i3] = p.position.x;
            positions[i3 + 1] = p.position.y;
            positions[i3 + 2] = p.position.z;
            particleData[i2] = p.life / p.maxLife;
            particleData[i2 + 1] = p.id;
        }
        __classPrivateFieldGet(this, _ParticleRenderer_particlesGeometry, "f").attributes.position.needsUpdate = true;
        __classPrivateFieldGet(this, _ParticleRenderer_particlesGeometry, "f").attributes.particleData.needsUpdate = true;
        if (count !== __classPrivateFieldGet(this, _ParticleRenderer_lastParticleCount, "f")) {
            __classPrivateFieldGet(this, _ParticleRenderer_particlesGeometry, "f").setDrawRange(0, count);
            __classPrivateFieldGet(this, _ParticleRenderer_particlesGeometry, "f").computeBoundingSphere();
            __classPrivateFieldSet(this, _ParticleRenderer_lastParticleCount, count, "f");
        }
    }
}
exports.ParticleRenderer = ParticleRenderer;
_ParticleRenderer_particlesGeometry = new WeakMap(), _ParticleRenderer_particleMesh = new WeakMap(), _ParticleRenderer_material = new WeakMap(), _ParticleRenderer_lastParticleCount = new WeakMap();
class Particle {
    constructor() {
        this.position = new THREE.Vector3(0, 0, 0);
        this.velocity = new THREE.Vector3();
        this.life = 0;
        this.maxLife = 5;
        this.id = 0;
        this.attachedEmitter = null;
        this.attachedShape = null;
    }
    reset() {
        this.position.set(0, 0, 0);
        this.velocity.set(0, 0, 0);
        this.life = 0;
        this.maxLife = 5;
        this.attachedEmitter = null;
        this.attachedShape = null;
    }
}
exports.Particle = Particle;
class EmitterShape {
    constructor() { }
    emit(particle) {
        particle.position.set(0, 0, 0);
    }
}
exports.EmitterShape = EmitterShape;
class PointShape extends EmitterShape {
    constructor() {
        super();
        this.position = new THREE.Vector3();
        this.positionRadiusVariance = 0;
        _PointShape_tempVec.set(this, new THREE.Vector3());
    }
    emit(particle) {
        particle.position.copy(this.position);
        if (this.positionRadiusVariance > 0) {
            const phi = MATH.random() * Math.PI * 2;
            const theta = MATH.random() * Math.PI;
            const radius = MATH.random() * this.positionRadiusVariance;
            __classPrivateFieldGet(this, _PointShape_tempVec, "f").set(Math.sin(theta) * Math.cos(phi), Math.cos(theta), Math.sin(theta) * Math.sin(phi));
            __classPrivateFieldGet(this, _PointShape_tempVec, "f").multiplyScalar(radius);
            particle.position.add(__classPrivateFieldGet(this, _PointShape_tempVec, "f"));
        }
    }
}
exports.PointShape = PointShape;
_PointShape_tempVec = new WeakMap();
class EmitterParams {
    constructor() {
        this.maxLife = 5;
        this.velocityMagnitude = 0;
        this.velocityMagnitudeVariance = 0;
        this.rotation = new THREE.Quaternion();
        this.rotationAngularVariance = 0;
        this.maxParticles = 100;
        this.maxEmission = 100;
        this.emissionRate = 1;
        this.gravity = false;
        this.gravityStrength = 1;
        this.dragCoefficient = DRAG;
        this.renderer = null;
        this.shape = new PointShape();
        this.onCreated = null;
        this.onUpdate = null;
        this.onDestroy = null;
    }
}
exports.EmitterParams = EmitterParams;
class Emitter {
    constructor(params) {
        _Emitter_instances.add(this);
        _Emitter_particles.set(this, []);
        _Emitter_particlePool.set(this, []);
        _Emitter_emissionTime.set(this, 0);
        _Emitter_numParticlesEmitted.set(this, 0);
        _Emitter_params.set(this, null);
        _Emitter_dead.set(this, false);
        _Emitter_tempVec.set(this, null);
        _Emitter_hasOnCreated.set(this, false);
        _Emitter_hasOnUpdate.set(this, false);
        _Emitter_hasOnDestroy.set(this, false);
        _Emitter_secondsPerParticle.set(this, 0);
        __classPrivateFieldSet(this, _Emitter_params, params, "f");
        __classPrivateFieldSet(this, _Emitter_tempVec, new THREE.Vector3(), "f");
        __classPrivateFieldSet(this, _Emitter_hasOnCreated, typeof params.onCreated === 'function', "f");
        __classPrivateFieldSet(this, _Emitter_hasOnUpdate, typeof params.onUpdate === 'function', "f");
        __classPrivateFieldSet(this, _Emitter_hasOnDestroy, typeof params.onDestroy === 'function', "f");
        __classPrivateFieldSet(this, _Emitter_secondsPerParticle, 1 / params.emissionRate, "f");
        for (let i = 0; i < params.maxParticles; i++) {
            const p = new Particle();
            p.id = MATH.random();
            __classPrivateFieldGet(this, _Emitter_particlePool, "f").push(p);
        }
    }
    dispose() {
        if (__classPrivateFieldGet(this, _Emitter_params, "f").onDestroy) {
            for (let i = 0; i < __classPrivateFieldGet(this, _Emitter_particles, "f").length; ++i) {
                __classPrivateFieldGet(this, _Emitter_params, "f").onDestroy(__classPrivateFieldGet(this, _Emitter_particles, "f")[i]);
            }
        }
        __classPrivateFieldSet(this, _Emitter_particles, [], "f");
        __classPrivateFieldSet(this, _Emitter_particlePool, [], "f");
        if (__classPrivateFieldGet(this, _Emitter_params, "f").renderer) {
            __classPrivateFieldGet(this, _Emitter_params, "f").renderer.dispose();
        }
    }
    get StillActive() {
        if (__classPrivateFieldGet(this, _Emitter_dead, "f")) {
            return false;
        }
        return (__classPrivateFieldGet(this, _Emitter_numParticlesEmitted, "f") < __classPrivateFieldGet(this, _Emitter_params, "f").maxEmission ||
            __classPrivateFieldGet(this, _Emitter_particles, "f").length > 0);
    }
    stop() {
        __classPrivateFieldGet(this, _Emitter_params, "f").maxEmission = 0;
    }
    kill() {
        __classPrivateFieldSet(this, _Emitter_dead, true, "f");
    }
    canCreateParticle() {
        if (__classPrivateFieldGet(this, _Emitter_dead, "f")) {
            return false;
        }
        return (__classPrivateFieldGet(this, _Emitter_emissionTime, "f") >= __classPrivateFieldGet(this, _Emitter_secondsPerParticle, "f") &&
            __classPrivateFieldGet(this, _Emitter_particles, "f").length < __classPrivateFieldGet(this, _Emitter_params, "f").maxParticles &&
            __classPrivateFieldGet(this, _Emitter_numParticlesEmitted, "f") < __classPrivateFieldGet(this, _Emitter_params, "f").maxEmission);
    }
    emitParticle() {
        const p = __classPrivateFieldGet(this, _Emitter_instances, "m", _Emitter_acquireParticle).call(this);
        if (p.id === 0) {
            p.id = MATH.random();
        }
        __classPrivateFieldGet(this, _Emitter_params, "f").shape.emit(p);
        p.maxLife = __classPrivateFieldGet(this, _Emitter_params, "f").maxLife;
        const phi = MATH.random() * 2 * Math.PI;
        const theta = MATH.random() * __classPrivateFieldGet(this, _Emitter_params, "f").rotationAngularVariance;
        p.velocity.set(Math.sin(theta) * Math.cos(phi), Math.cos(theta), Math.sin(theta) * Math.sin(phi));
        const velocity = __classPrivateFieldGet(this, _Emitter_params, "f").velocityMagnitude +
            (MATH.random() * 2 - 1) * __classPrivateFieldGet(this, _Emitter_params, "f").velocityMagnitudeVariance;
        p.velocity.multiplyScalar(velocity);
        p.velocity.applyQuaternion(__classPrivateFieldGet(this, _Emitter_params, "f").rotation);
        if (__classPrivateFieldGet(this, _Emitter_hasOnCreated, "f")) {
            __classPrivateFieldGet(this, _Emitter_params, "f").onCreated(p);
        }
        return p;
    }
    updateEmission(elapsedTime) {
        let _a;
        if (__classPrivateFieldGet(this, _Emitter_dead, "f")) {
            return;
        }
        __classPrivateFieldSet(this, _Emitter_emissionTime, __classPrivateFieldGet(this, _Emitter_emissionTime, "f") + elapsedTime, "f");
        while (this.canCreateParticle()) {
            __classPrivateFieldSet(this, _Emitter_emissionTime, __classPrivateFieldGet(this, _Emitter_emissionTime, "f") - __classPrivateFieldGet(this, _Emitter_secondsPerParticle, "f"), "f");
            __classPrivateFieldSet(this, _Emitter_numParticlesEmitted, (_a = __classPrivateFieldGet(this, _Emitter_numParticlesEmitted, "f"), _a++, _a), "f");
            const particle = this.emitParticle();
            __classPrivateFieldGet(this, _Emitter_particles, "f").push(particle);
        }
    }
    updateParticle(p, elapsedTime) {
        p.life += elapsedTime;
        p.life = Math.min(p.life, p.maxLife);
        if (__classPrivateFieldGet(this, _Emitter_params, "f").gravity) {
            __classPrivateFieldGet(this, _Emitter_tempVec, "f").copy(GRAVITY);
        }
        else {
            __classPrivateFieldGet(this, _Emitter_tempVec, "f").set(0, 0, 0);
        }
        __classPrivateFieldGet(this, _Emitter_tempVec, "f").addScaledVector(p.velocity, -__classPrivateFieldGet(this, _Emitter_params, "f").dragCoefficient);
        __classPrivateFieldGet(this, _Emitter_tempVec, "f").multiplyScalar(__classPrivateFieldGet(this, _Emitter_params, "f").gravityStrength);
        p.velocity.addScaledVector(__classPrivateFieldGet(this, _Emitter_tempVec, "f"), elapsedTime);
        p.position.addScaledVector(p.velocity, elapsedTime);
        if (__classPrivateFieldGet(this, _Emitter_hasOnUpdate, "f")) {
            __classPrivateFieldGet(this, _Emitter_params, "f").onUpdate(p);
        }
        if (p.life >= p.maxLife && __classPrivateFieldGet(this, _Emitter_hasOnDestroy, "f")) {
            __classPrivateFieldGet(this, _Emitter_params, "f").onDestroy(p);
        }
    }
    updateParticles(elapsedTime) {
        for (let i = __classPrivateFieldGet(this, _Emitter_particles, "f").length - 1; i >= 0; i--) {
            const p = __classPrivateFieldGet(this, _Emitter_particles, "f")[i];
            this.updateParticle(p, elapsedTime);
            if (p.life >= p.maxLife) {
                __classPrivateFieldGet(this, _Emitter_instances, "m", _Emitter_releaseParticle).call(this, p);
                __classPrivateFieldGet(this, _Emitter_particles, "f")[i] = __classPrivateFieldGet(this, _Emitter_particles, "f")[__classPrivateFieldGet(this, _Emitter_particles, "f").length - 1];
                __classPrivateFieldGet(this, _Emitter_particles, "f").pop();
            }
        }
    }
    update(elapsedTime, totalTimeElapsed) {
        this.updateEmission(elapsedTime);
        this.updateParticles(elapsedTime);
        if (__classPrivateFieldGet(this, _Emitter_params, "f").renderer) {
            __classPrivateFieldGet(this, _Emitter_params, "f").renderer.updateFromParticles(__classPrivateFieldGet(this, _Emitter_particles, "f"), totalTimeElapsed);
        }
    }
}
exports.Emitter = Emitter;
_Emitter_particles = new WeakMap(), _Emitter_particlePool = new WeakMap(), _Emitter_emissionTime = new WeakMap(), _Emitter_numParticlesEmitted = new WeakMap(), _Emitter_params = new WeakMap(), _Emitter_dead = new WeakMap(), _Emitter_tempVec = new WeakMap(), _Emitter_hasOnCreated = new WeakMap(), _Emitter_hasOnUpdate = new WeakMap(), _Emitter_hasOnDestroy = new WeakMap(), _Emitter_secondsPerParticle = new WeakMap(), _Emitter_instances = new WeakSet(), _Emitter_acquireParticle = function _Emitter_acquireParticle() {
    return __classPrivateFieldGet(this, _Emitter_particlePool, "f").pop() || new Particle();
}, _Emitter_releaseParticle = function _Emitter_releaseParticle(particle) {
    particle.reset();
    __classPrivateFieldGet(this, _Emitter_particlePool, "f").push(particle);
};

  },
  "src/Game/World/World.class.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Game_class_1 = require("../Game.class");
const Lighting_class_1 = require("./Components/Lighting/Lighting.class");
const Skydome_class_1 = require("./Components/Skydome/Skydome.class");
const Ground_class_1 = require("./Components/Ground/Ground.class");
const Tent_class_1 = require("./Components/Tent/Tent.class");
const Bridge_class_1 = require("./Components/Bridge/Bridge.class");
const Windlines_class_1 = require("./Components/WindLines/Windlines.class");
const Rocks_class_1 = require("./Components/Rocks/Rocks.class");
const Bush_class_1 = require("./Components/Bush/Bush.class");
const TreeTrunks_class_1 = require("./Components/TreeTrunks/TreeTrunks.class");
const Camp_class_1 = require("./Components/Camp/Camp.class");
const Fire_class_1 = require("./Components/Fire/Fire.class");
const FireFlies_class_1 = require("./Components/FireFlies/FireFlies.class");
const FallingLeaves_class_1 = require("./Components/FallingLeaves/FallingLeaves.class");
const Rain_class_1 = require("./Components/Rain/Rain.class");
const SnowFall_class_1 = require("./Components/SnowFall/SnowFall.class");
const ParticleSystem_class_1 = require("./Systems/ParticleSystem.class");
const Lightning_class_1 = require("./Systems/Lightning.class");
const Fog_class_1 = require("./Components/Fog/Fog.class");
class World {
    constructor() {
        this.game = Game_class_1.default.getInstance();
        this.scene = this.game.scene;
        this.lighting = new Lighting_class_1.default({
            helperEnabled: false,
        });
        this.skydome = new Skydome_class_1.default();
        this.debugGUI = this.game.debug;
        this.ground = new Ground_class_1.default();
        this.tent = new Tent_class_1.default();
        this.bridge = new Bridge_class_1.default();
        this.windLines = new Windlines_class_1.default();
        this.rocks = new Rocks_class_1.default();
        this.bush = new Bush_class_1.default();
        this.trees = new TreeTrunks_class_1.default();
        this.fallingLeaves = new FallingLeaves_class_1.default();
        this.camp = new Camp_class_1.default();
        this.fire = new Fire_class_1.default();
        this.fireFlies = new FireFlies_class_1.default();
        this.rain = new Rain_class_1.default();
        this.snowFall = new SnowFall_class_1.default();
        this.particleSystem = new ParticleSystem_class_1.ParticleSystem();
        const worldSize = this.ground.WORLD_SIZE;
        const halfSize = worldSize / 2 - 3;
        const groundBounds = {
            minX: -halfSize,
            maxX: halfSize,
            minZ: -halfSize,
            maxZ: halfSize,
        };
        this.lightning = new Lightning_class_1.default(this.particleSystem, groundBounds);
        this.fog = new Fog_class_1.default(worldSize);
        if (this.debugGUI) {
            this.setupDebugUI();
        }
    }
    setupDebugUI() {
        const lightningControls = {
            strikeNow: () => this.lightning.manualStrike(),
        };
        this.debugGUI.add(lightningControls, 'strikeNow', { label: 'Strike Lightning' }, 'Lightning');
    }
    update(delta, elapsedTime) {
        this.ground.update();
        this.bush.update();
        this.skydome.update(delta, elapsedTime);
        this.fire.update(delta, elapsedTime);
        this.fallingLeaves.update(delta);
        this.fireFlies.update(elapsedTime);
        this.rain.update(delta, elapsedTime);
        this.snowFall.update(delta, elapsedTime);
        this.particleSystem.update(delta, elapsedTime);
        this.lightning.update(delta);
    }
    dispose() {
        this.lighting.dispose();
        this.skydome.dispose();
        this.ground.dispose();
        this.tent.dispose();
        this.windLines.dispose();
        this.fallingLeaves.dispose();
        this.fire.dispose();
        this.fireFlies.dispose();
        this.rain.dispose();
        this.snowFall.dispose();
        this.fog.dispose();
        this.lightning.dispose();
        this.particleSystem.dispose();
    }
}
exports.default = World;

  },
  "src/config/assets.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ASSETS = [
    {
        id: 'environmentMapDayTexture',
        type: 'cubeMap',
        path: [
            '/map/day/px.png',
            '/map/day/nx.png',
            '/map/day/py.png',
            '/map/day/ny.png',
            '/map/day/pz.png',
            '/map/day/nz.png',
        ],
    },
    {
        id: 'environmentMapNightTexture',
        type: 'cubeMap',
        path: [
            '/map/night/px.png',
            '/map/night/nx.png',
            '/map/night/py.png',
            '/map/night/ny.png',
            '/map/night/pz.png',
            '/map/night/nz.png',
        ],
    },
    {
        id: 'grassBladeModel',
        type: 'gltfModelCompressed',
        path: ['/models/grass_blade.glb'],
    },
    {
        id: 'grassPathDensityDataTexture',
        type: 'texture',
        path: ['/textures/grass/path_data_rgb_768x768.png'],
    },
    {
        id: 'displacedNormalMap',
        type: 'texture',
        path: ['/textures/grass/displaced_normals_256x256.png'],
    },
    {
        id: 'displacementMap',
        type: 'texture',
        path: ['/textures/grass/displacement_map_256x256.png'],
    },
    {
        id: 'displacementMapBlur',
        type: 'texture',
        path: ['/textures/grass/displacement_map_blur_256x256.png'],
    },
    {
        id: 'perlinNoise',
        type: 'texture',
        path: ['/textures/noises/perlin_noise_256x256.png'],
    },
    {
        id: 'groundRockMap',
        type: 'texture',
        path: ['/textures/ground/rocks_height_256x256.png'],
    },
    {
        id: 'groundRockAOMap',
        type: 'texture',
        path: ['/textures/ground/rocks_ao_256x256.png'],
    },
    {
        id: 'tentModel',
        type: 'gltfModelCompressed',
        path: ['/models/tent.glb'],
    },
    {
        id: 'bridgeModel',
        type: 'gltfModelCompressed',
        path: ['/models/bridge.glb'],
    },
    {
        id: 'waterDepthMap',
        type: 'texture',
        path: ['/textures/water/water_depth_map_256x256.png'],
    },
    {
        id: 'rocksModel',
        type: 'gltfModelCompressed',
        path: ['/models/rocks.glb'],
    },
    {
        id: 'leavesAlphaMap',
        type: 'texture',
        path: ['/textures/bush/leave_alpha_map_256x256.png'],
    },
    {
        id: 'BushEmitterModel',
        type: 'gltfModelCompressed',
        path: ['/models/bushEmitter.glb'],
    },
    {
        id: 'TreeTrunksModel',
        type: 'gltfModelCompressed',
        path: ['/models/treeTrunks.glb'],
    },
    {
        id: 'campModel',
        type: 'gltfModelCompressed',
        path: ['/models/camp.glb'],
    },
    {
        id: 'woodColorTexture',
        type: 'texture',
        path: ['/textures/wood/wood_color_256x256.png'],
    },
    {
        id: 'woodColorTextureR',
        type: 'texture',
        path: ['/textures/wood/wood_color_r_256x256.png'],
    },
    {
        id: 'woodNormalTexture',
        type: 'texture',
        path: ['/textures/wood/wood_normal_256x256.png'],
    },
    {
        id: 'woodAOTexture',
        type: 'texture',
        path: ['/textures/wood/wood_ao_256x256.png'],
    },
    {
        id: 'leafModel',
        type: 'gltfModelCompressed',
        path: ['/models/leaf.glb'],
    },
    {
        id: 'fireTexture',
        type: 'texture',
        path: ['/textures/fire/fire_256x256.png'],
    },
    {
        id: 'smokeTexture',
        type: 'texture',
        path: ['/textures/fire/smoke_256x256.png'],
    },
    {
        id: 'particleTexture',
        type: 'texture',
        path: ['/textures/particles/particle_alpha_map_256x256.png'],
    },
    {
        id: 'particleTextureNoAlpha',
        type: 'texture',
        path: ['/textures/particles/particle_256x256.jpg'],
    },
    {
        id: 'flowerTexture1',
        type: 'texture',
        path: ['/textures/flowers/flower_1_128x128.png'],
    },
    {
        id: 'flowerTexture2',
        type: 'texture',
        path: ['/textures/flowers/flower_2_128x128.png'],
    },
    {
        id: 'morningPetalsMusic',
        type: 'audio',
        path: ['/audio/musics/morning_petals.mp3'],
    },
    {
        id: 'windowLightMusic',
        type: 'audio',
        path: ['/audio/musics/window_light.mp3'],
    },
    {
        id: 'forestDreamsMusic',
        type: 'audio',
        path: ['/audio/musics/forest_dreams.mp3'],
    },
    {
        id: 'birds1Sound',
        type: 'audio',
        path: ['/audio/sounds/birds/birds_1.mp3'],
    },
    {
        id: 'birds2Sound',
        type: 'audio',
        path: ['/audio/sounds/birds/birds_2.mp3'],
    },
    {
        id: 'birds3Sound',
        type: 'audio',
        path: ['/audio/sounds/birds/birds_3.mp3'],
    },
    {
        id: 'birds4Sound',
        type: 'audio',
        path: ['/audio/sounds/birds/birds_4.mp3'],
    },
    {
        id: 'cricketsSound',
        type: 'audio',
        path: ['/audio/sounds/crickets/crickets.mp3'],
    },
    {
        id: 'fireBurningSound',
        type: 'audio',
        path: ['/audio/sounds/fire/fire_burning.mp3'],
    },
    {
        id: 'owlHowlingSound',
        type: 'audio',
        path: ['/audio/sounds/owl/owl_howling.mp3'],
    },
    {
        id: 'owlHootingSound',
        type: 'audio',
        path: ['/audio/sounds/owl/owl_hooting.mp3'],
    },
    {
        id: 'rainSound',
        type: 'audio',
        path: ['/audio/sounds/rain/rain.mp3'],
    },
    {
        id: 'lakeWavesSound',
        type: 'audio',
        path: ['/audio/sounds/waves/lake_waves.mp3'],
    },
    {
        id: 'wolfHowlingSound',
        type: 'audio',
        path: ['/audio/sounds/wolf/wolf_howling.mp3'],
    },
    {
        id: 'thunderDistantSound',
        type: 'audio',
        path: ['/audio/sounds/thunder/distant/thunder_distant.mp3'],
    },
    {
        id: 'thunderStrikeSound',
        type: 'audio',
        path: ['/audio/sounds/thunder/near/thunder_strike.mp3'],
    },
    {
        id: 'clickSound',
        type: 'audio',
        path: ['/audio/sounds/ui_interactions/click.mp3'],
    },
    {
        id: 'hoverSound',
        type: 'audio',
        path: ['/audio/sounds/ui_interactions/hover.mp3'],
    },
];
exports.default = ASSETS;

  },
  "src/main.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Game_class_js_1 = require("./Game/Game.class.js");
const ResourceLoader_class_js_1 = require("./Game/Utils/ResourceLoader.class.js");
const SeasonManager_class_js_1 = require("./Game/World/Managers/SeasonManager/SeasonManager.class.js");
const EnvironmentManager_class_js_1 = require("./Game/World/Managers/EnvironmentManager/EnvironmentManager.class.js");
const assets_js_1 = require("./config/assets.js");
const reveal_js_1 = require("./reveal.js");
const ToastManager_class_js_1 = require("./Game/UI/ToastManager.class.js");
const consoleStylish_js_1 = require("./utils/consoleStylish.js");
const Haptics = {
    buttonTap() {
        if (navigator.haptic) {
            navigator.haptic([{ intensity: 0.7, sharpness: 0.1 }]);
        }
        else if (navigator.vibrate) {
            navigator.vibrate(10);
        }
    },
    thunder() {
        if (navigator.haptic) {
            navigator.haptic('error');
        }
        else if (navigator.vibrate) {
            navigator.vibrate([50, 30, 100, 50, 200]);
        }
    },
};
const isDebugMode = typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('mode') === 'debug';
consoleStylish_js_1.Console.banner({
    title: 'Elemental Serenity',
    subtitle: 'Interactive 3D Nature Experience',
    version: '0.0.0',
});
consoleStylish_js_1.Console.techTable([
    { Layer: 'Build', Technology: 'Vite 6.0', Details: 'ES Modules, HMR' },
    {
        Layer: '3D Engine',
        Technology: 'Three.js 0.182',
        Details: 'WebGLRenderer',
    },
    {
        Layer: 'Animation',
        Technology: 'GSAP 3.14.2',
        Details: 'Tweening & Timelines',
    },
    { Layer: 'Shaders', Technology: 'GLSL', Details: 'vite-plugin-glsl 1.3.1' },
    {
        Layer: 'Debug UI',
        Technology: 'lil-gui 0.21',
        Details: 'Runtime controls (?mode=debug)',
    },
    {
        Layer: 'Perf Monitor',
        Technology: 'three-perf 1.0.11',
        Details: 'FPS & draw calls',
    },
    { Layer: 'Styles', Technology: 'Sass 1.97', Details: 'SCSS preprocessing' },
]);
consoleStylish_js_1.Console.divider('═', 60);
consoleStylish_js_1.Console.info('LOADING', 'Preparing assets...');
consoleStylish_js_1.Console.divider('═', 60);
const loader = document.getElementById('loader');
const progressBar = document.getElementById('progress-bar');
const loaderText = document.getElementById('loader-text');
const exploreButtons = document.getElementById('explore-buttons');
const exploreWithMusic = document.getElementById('explore-with-music');
const exploreWithoutMusic = document.getElementById('explore-without-music');
const loaderTitle = document.querySelector('.loader-title');
const loaderProgress = document.querySelector('.loader-progress-bar');
const shaderCanvas = document.getElementById('shader-overlay');
const seasonMenu = document.getElementById('season-menu');
const seasonButtons = document.querySelectorAll('.season-button');
const dayNightToggle = document.getElementById('daynight-toggle');
const dayNightButtons = document.querySelectorAll('.daynight-button');
const controlPanel = document.getElementById('control-panel');
const pageTitle = document.getElementById('page-title');
const seasonManager = SeasonManager_class_js_1.default.getInstance();
const environmentTimeManager = EnvironmentManager_class_js_1.default.getInstance();
const shaderReveal = new reveal_js_1.default(shaderCanvas);
const setProgressBarWidth = () => {
    const titleWidth = loaderTitle.offsetWidth;
    loaderProgress.style.width = `${titleWidth}px`;
};
window.addEventListener('load', setProgressBarWidth);
setProgressBarWidth();
window.addEventListener('resize', () => {
    setProgressBarWidth();
    shaderReveal.resize();
});
const resources = new ResourceLoader_class_js_1.default(assets_js_1.default);
const getLoadingMessage = (id, itemsLoaded, itemsTotal) => {
    const messages = [
        'Gathering elemental essence',
        'Weaving natural harmonies',
        'Awakening ancient spirits',
        "Channeling earth's energy",
        'Summoning peaceful winds',
        'Collecting forest whispers',
        'Brewing tranquil potions',
        'Painting serene landscapes',
        "Tuning nature's symphony",
        'Crafting mystical elements',
    ];
    const getAssetType = (assetId) => {
        if (assetId.includes('.gltf') || assetId.includes('.glb'))
            return '3D Model';
        if (assetId.includes('.jpg') ||
            assetId.includes('.png') ||
            assetId.includes('.webp'))
            return 'Texture';
        if (assetId.includes('.mp3') ||
            assetId.includes('.wav') ||
            assetId.includes('.ogg'))
            return 'Audio';
        if (assetId.includes('.json'))
            return 'Data';
        if (assetId.includes('.hdr'))
            return 'Environment';
        if (assetId.includes('.bin'))
            return 'Binary Data';
        return 'Asset';
    };
    const messageIndex = Math.floor((itemsLoaded - 1) / Math.max(1, Math.floor(itemsTotal / messages.length)));
    const baseMessage = messages[messageIndex % messages.length];
    const assetType = getAssetType(id);
    const dots = '.'.repeat((itemsLoaded % 4) + 1);
    return `${baseMessage}${dots} ${assetType} (${itemsLoaded}/${itemsTotal})`;
};
resources.on('progress', ({ id, itemsLoaded, itemsTotal, percent }) => {
    progressBar.style.width = `${percent}%`;
    loaderText.innerHTML = getLoadingMessage(id, itemsLoaded, itemsTotal).replace('\n', '<br>');
    if (isDebugMode) {
        console.log(`Loaded asset: "${id}" (${itemsLoaded}/${itemsTotal} — ${percent.toFixed(1)}%)`);
    }
});
resources.on('error', ({ id, url, itemsLoaded, itemsTotal }) => {
    const assetType = id.includes('.gltf') || id.includes('.glb')
        ? '3D Model'
        : id.includes('.jpg') || id.includes('.png')
            ? 'Texture'
            : id.includes('.mp3') || id.includes('.wav')
                ? 'Audio'
                : 'Asset';
    loaderText.innerHTML = `⚠️ Elemental disruption detected...<br>${assetType} failed (${itemsLoaded}/${itemsTotal})`;
    console.error(`❌ Failed to load item named "${id}" at "${url}" (${itemsLoaded}/${itemsTotal} so far)`);
});
resources.on('loaded', () => {
    loaderText.textContent = 'Serenity achieved... Welcome to your sanctuary!';
    if (isDebugMode) {
        if (Object.keys(resources.items).length) {
            console.log('✅ All assets are loaded. Initializing game…!');
        }
        else {
            console.log('☑️ No asset to load. Initializing game…!');
        }
    }
    setTimeout(() => {
        exploreButtons.style.visibility = 'visible';
        setTimeout(() => {
            exploreButtons.classList.add('show');
        }, 100);
    }, 800);
    const startGame = (withMusic = true) => {
        exploreWithMusic.disabled = true;
        exploreWithoutMusic.disabled = true;
        setTimeout(() => {
            const game = new Game_class_js_1.default(document.getElementById('three'), resources, isDebugMode, withMusic);
            window.gameInstance = game;
            consoleStylish_js_1.Console.logGameState(game);
            window.addEventListener('beforeunload', () => {
                game.destroy();
            });
            if (game.musicManager) {
                game.musicManager.on('trackChanged', (track) => {
                    consoleStylish_js_1.Console.logMusicChange('track', track.name);
                });
            }
            window.addEventListener('graphicsQualityChanged', (event) => {
                consoleStylish_js_1.Console.logGraphicsChange(event.detail.quality);
            });
            shaderReveal.start();
            loader.classList.add('hidden');
            setTimeout(() => {
                loader.remove();
                setTimeout(() => {
                    controlPanel.classList.add('show');
                    pageTitle.classList.add('show');
                    initializeSeasonUI();
                    initializeDayNightUI();
                }, 500);
                document.dispatchEvent(new CustomEvent('gameStarted'));
            }, 500);
        }, 200);
    };
    exploreWithMusic.addEventListener('click', () => {
        Haptics.buttonTap();
        startGame(true);
    });
    exploreWithoutMusic.addEventListener('click', () => {
        Haptics.buttonTap();
        startGame(false);
    });
});
const seasonMapping = {
    spring: 'spring',
    autumn: 'autumn',
    winter: 'winter',
    rain: 'rainy',
};
const reverseSeasonMapping = {
    spring: 'spring',
    autumn: 'autumn',
    winter: 'winter',
    rainy: 'rain',
};
const toastManager = new ToastManager_class_js_1.default();
const handleSeasonToggle = (event) => {
    const clickedButton = event.currentTarget;
    const uiSeason = clickedButton.dataset.season;
    const managerSeason = seasonMapping[uiSeason];
    const currentSeason = seasonManager.currentSeason;
    if (currentSeason === managerSeason) {
        return;
    }
    Haptics.buttonTap();
    seasonButtons.forEach((button) => {
        button.classList.remove('active');
    });
    clickedButton.classList.add('active');
    seasonManager.setSeason(managerSeason);
    toastManager.showSeasonToast(managerSeason);
};
seasonButtons.forEach((button) => {
    button.addEventListener('click', handleSeasonToggle);
});
seasonManager.onChange((newSeason, oldSeason) => {
    const uiSeason = reverseSeasonMapping[newSeason];
    seasonButtons.forEach((button) => {
        button.classList.remove('active');
        if (button.dataset.season === uiSeason) {
            button.classList.add('active');
        }
    });
    consoleStylish_js_1.Console.logSeasonChange(newSeason, oldSeason);
    window.dispatchEvent(new CustomEvent('seasonChange', {
        detail: {
            season: newSeason,
            oldSeason: oldSeason,
            config: seasonManager.getSeasonConfig(newSeason),
        },
    }));
});
const initializeSeasonUI = () => {
    const currentSeason = seasonManager.currentSeason;
    const uiSeason = reverseSeasonMapping[currentSeason];
    seasonButtons.forEach((button) => {
        button.classList.remove('active');
        if (button.dataset.season === uiSeason) {
            button.classList.add('active');
        }
    });
};
const handleDayNightToggle = (event) => {
    const clickedButton = event.currentTarget;
    const selectedTime = clickedButton.dataset.time;
    const currentTime = environmentTimeManager.envTime;
    if (currentTime === selectedTime) {
        return;
    }
    Haptics.buttonTap();
    dayNightButtons.forEach((button) => {
        button.classList.remove('active');
    });
    clickedButton.classList.add('active');
    environmentTimeManager.setTime(selectedTime);
    toastManager.showDayNightToast(selectedTime);
};
dayNightButtons.forEach((button) => {
    button.addEventListener('click', handleDayNightToggle);
});
environmentTimeManager.onChange((newTime, oldTime) => {
    dayNightButtons.forEach((button) => {
        button.classList.remove('active');
        if (button.dataset.time === newTime) {
            button.classList.add('active');
        }
    });
    consoleStylish_js_1.Console.logTimeChange(newTime, oldTime);
    window.dispatchEvent(new CustomEvent('timeChange', {
        detail: {
            time: newTime,
            oldTime: oldTime,
        },
    }));
});
const initializeDayNightUI = () => {
    const currentTime = environmentTimeManager.envTime;
    dayNightButtons.forEach((button) => {
        button.classList.remove('active');
        if (button.dataset.time === currentTime) {
            button.classList.add('active');
        }
    });
};

  },
  "src/reveal.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vertex_glsl_1 = require("./Shaders/Materials/reveal/vertex.glsl");
const fragment_glsl_1 = require("./Shaders/Materials/reveal/fragment.glsl");
class ShaderReveal {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl =
            canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!this.gl) {
            console.warn('WebGL not supported, falling back to simple fade');
            return;
        }
        this.program = null;
        this.uniforms = {};
        this.startTime = 0;
        this.duration = 4500;
        this.textDisplayDuration = 7000;
        this.hasStarted = false;
        this.textOverlay = null;
        this.init();
    }
    init() {
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertex_glsl_1.default);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragment_glsl_1.default);
        if (!vertexShader || !fragmentShader)
            return;
        this.program = this.createProgram(vertexShader, fragmentShader);
        if (!this.program)
            return;
        this.uniforms = {
            time: this.gl.getUniformLocation(this.program, 'uTime'),
            progress: this.gl.getUniformLocation(this.program, 'uProgress'),
            resolution: this.gl.getUniformLocation(this.program, 'uResolution'),
        };
        const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
        const positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);
        const positionLocation = this.gl.getAttribLocation(this.program, 'aPosition');
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
        this.resize();
    }
    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Shader compilation error:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        return shader;
    }
    createProgram(vertexShader, fragmentShader) {
        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.error('Program linking error:', this.gl.getProgramInfoLog(program));
            this.gl.deleteProgram(program);
            return null;
        }
        return program;
    }
    resize() {
        if (!this.canvas)
            return;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        if (this.gl) {
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        }
    }
    createTextOverlay() {
        this.textOverlay = document.createElement('div');
        this.textOverlay.innerHTML = `
      <div class="reveal-content">
        <h1 class="reveal-title">A Dream Realized</h1>

        <div class="reveal-description">
          <p class="reveal-line">For as long as I can remember, I've dreamed of creating a quiet digital corner where stylised nature could breathe, seasons freely shifting, days fading into nights, leaves whispering in an invisible breeze.
          <br><br>
          And this project turned that dream into reality, built one shader, one texture, and one late night at a time. Countless tutorials, devlogs, and fellow creators kept me going and reminded me that shared passion multiplies.
          <br><br>
          Thank you for visiting. I hope it brings you a moment of quiet wonder!
          </p>
          <p class="reveal-footer">— Sahil K.</p>
        </div>
      </div>
      <style>
        .reveal-content {
          text-align: center;
          font-family: 'Inter', sans-serif;
          max-width: min(600px, 90vw);
          margin: 0 auto;
          padding: 1rem;
        }

        .reveal-title {
          font-family: 'Schoolbell', sans-serif;
          font-size: clamp(1.8rem, 5vw, 3rem);
          font-weight: 700;
          color: #000;
          margin: 0 0 1.2rem 0;
          opacity: 0;
          transition: opacity 1.2s ease-out;
          line-height: 1.2;
        }

        .reveal-description {
          font-family: 'Inter', sans-serif;
          font-size: clamp(0.8rem, 2.5vw, 1rem);
          line-height: 1.6;
          color: rgba(0, 0, 0, 0.6);
          font-weight: 400;
        }

        .reveal-line {
          margin: 0.2rem 0;
          opacity: 0;
          transition: opacity 0.8s ease-out;
        }

        .reveal-footer {
          margin: 0.8rem 0 0 0;
          font-style: italic;
          opacity: 0;
          transition: opacity 0.8s ease-out;
          text-align: right;
        }

        @media (max-width: 380px) {
          .reveal-content {
            padding: 0.5rem;
          }
          .reveal-title {
            font-size: 1.5rem;
            margin-bottom: 0.8rem;
          }
          .reveal-description {
            font-size: 0.75rem;
            line-height: 1.5;
          }
        }

        @media (max-height: 500px) and (orientation: landscape) {
          .reveal-content {
            max-width: min(700px, 85vw);
          }
          .reveal-title {
            font-size: clamp(1.3rem, 4vh, 1.8rem);
            margin-bottom: 0.5rem;
          }
          .reveal-description {
            font-size: clamp(0.65rem, 2vh, 0.85rem);
            line-height: 1.4;
          }
          .reveal-line br {
            display: none;
          }
          .reveal-line br + br {
            display: inline;
          }
          .reveal-line br + br::before {
            content: ' ';
          }
          .reveal-footer {
            margin-top: 0.5rem;
          }
        }

        @media (max-height: 380px) and (orientation: landscape) {
          .reveal-title {
            font-size: 1.2rem;
            margin-bottom: 0.4rem;
          }
          .reveal-description {
            font-size: 0.6rem;
            line-height: 1.35;
          }
        }

        @media (min-width: 768px) and (min-height: 600px) {
          .reveal-content {
            max-width: 550px;
          }
          .reveal-title {
            font-size: 2.5rem;
            margin-bottom: 1.5rem;
          }
          .reveal-description {
            font-size: 0.95rem;
            line-height: 1.7;
          }
        }

        @media (min-width: 1200px) {
          .reveal-content {
            max-width: 620px;
          }
          .reveal-title {
            font-size: 3rem;
          }
          .reveal-description {
            font-size: 1rem;
            line-height: 1.8;
          }
        }
      </style>
    `;
        this.textOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      height: 100dvh;
      display: flex;
      justify-content: center;
      align-items: center;
      background: #ede8e4;
      z-index: 1001;
      opacity: 1;
      pointer-events: none;
      padding: env(safe-area-inset-top, 1rem) env(safe-area-inset-right, 1rem) env(safe-area-inset-bottom, 1rem) env(safe-area-inset-left, 1rem);
      box-sizing: border-box;
      overflow: hidden;
    `;
        document.body.appendChild(this.textOverlay);
        this.animateTextReveal();
    }
    animateTextReveal() {
        if (!this.textOverlay)
            return;
        setTimeout(() => {
            const title = this.textOverlay.querySelector('.reveal-title');
            if (title) {
                title.style.opacity = '1';
            }
        }, 200);
        setTimeout(() => {
            const line = this.textOverlay.querySelector('.reveal-line');
            if (line) {
                line.style.opacity = '1';
            }
        }, 800);
        setTimeout(() => {
            const footer = this.textOverlay.querySelector('.reveal-footer');
            if (footer) {
                footer.style.opacity = '1';
            }
        }, 1400);
    }
    start() {
        if (this.hasStarted) {
            return;
        }
        this.hasStarted = true;
        this.createTextOverlay();
        if (!this.gl || !this.program) {
            setTimeout(() => {
                this.animateTextExit();
                setTimeout(() => {
                    if (this.textOverlay) {
                        this.textOverlay.style.transition = 'opacity 1s ease-out';
                        this.textOverlay.style.opacity = '0';
                    }
                }, 800);
            }, this.textDisplayDuration - 1000);
            return;
        }
        setTimeout(() => {
            this.animateTextExit();
        }, this.textDisplayDuration - 1200);
        setTimeout(() => {
            this.startRevealAnimation();
        }, this.textDisplayDuration - 400);
    }
    animateTextExit() {
        if (!this.textOverlay)
            return;
        setTimeout(() => {
            const footer = this.textOverlay.querySelector('.reveal-footer');
            if (footer) {
                footer.style.transition = 'opacity 0.4s ease-out';
                footer.style.opacity = '0';
            }
        }, 0);
        setTimeout(() => {
            const line = this.textOverlay.querySelector('.reveal-line');
            if (line) {
                line.style.transition = 'opacity 0.4s ease-out';
                line.style.opacity = '0';
            }
        }, 150);
        setTimeout(() => {
            const title = this.textOverlay.querySelector('.reveal-title');
            if (title) {
                title.style.transition = 'opacity 0.4s ease-out';
                title.style.opacity = '0';
            }
        }, 300);
    }
    startRevealAnimation() {
        if (this.textOverlay) {
            this.textOverlay.style.transition = 'opacity 0.5s ease-out';
            this.textOverlay.style.opacity = '0';
            setTimeout(() => {
                if (this.textOverlay) {
                    this.textOverlay.remove();
                    this.textOverlay = null;
                }
            }, 500);
        }
        this.startTime = performance.now();
        this.animate();
    }
    animate() {
        const currentTime = performance.now();
        const elapsed = currentTime - this.startTime;
        const progress = Math.min(elapsed / this.duration, 1);
        const easeProgress = progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        this.gl.useProgram(this.program);
        this.gl.uniform1f(this.uniforms.time, currentTime * 0.001);
        this.gl.uniform1f(this.uniforms.progress, easeProgress);
        this.gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        if (progress < 1) {
            requestAnimationFrame(() => this.animate());
        }
        else {
            this.finish();
        }
    }
    finish() {
        this.hasStarted = false;
        setTimeout(() => {
            this.canvas.style.display = 'none';
        }, 1500);
    }
    reset() {
        this.hasStarted = false;
        this.canvas.style.display = 'block';
        this.canvas.style.transition = '';
        if (this.textOverlay && this.textOverlay.parentNode) {
            this.textOverlay.parentNode.removeChild(this.textOverlay);
            this.textOverlay = null;
        }
    }
    destroy() {
        this.reset();
    }
}
exports.default = ShaderReveal;

  },
  "src/utils/consoleStylish.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Console = void 0;
const pad = (n) => String(n).padStart(2, '0');
function timeStamp() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
const css = (obj) => Object.entries(obj)
    .map(([k, v]) => `${k}:${v}`)
    .join(';');
function styled(level, label, message) {
    const colors = {
        info: { fg: '#0c4a6e', bg: '#7dd3fc', border: '#38bdf8' },
        success: { fg: '#14532d', bg: '#86efac', border: '#22c55e' },
        warn: { fg: '#713f12', bg: '#fde047', border: '#eab308' },
        error: { fg: '#7f1d1d', bg: '#fca5a5', border: '#ef4444' },
        debug: { fg: '#581c87', bg: '#d8b4fe', border: '#a855f7' },
        perf: { fg: '#164e63', bg: '#67e8f9', border: '#06b6d4' },
    };
    const c = colors[level] || colors.info;
    const tagStyle = css({
        background: `linear-gradient(135deg, ${c.bg} 0%, ${c.border} 100%)`,
        color: c.fg,
        padding: '3px 10px',
        'border-radius': '4px',
        'font-weight': '700',
        'font-size': '11px',
        'text-transform': 'uppercase',
        'letter-spacing': '0.5px',
    });
    const metaStyle = css({
        color: '#64748b',
        'font-size': '10px',
        padding: '0 8px',
        'font-family': 'monospace',
    });
    const msgStyle = css({
        color: '#e2e8f0',
        'font-size': '12px',
        'font-weight': '500',
    });
    console.log(`%c${label}%c ${timeStamp()} %c${message}`, tagStyle, metaStyle, msgStyle);
}
function asciiArt() {
    const art = `
%c███████╗██╗     ███████╗███╗   ███╗███████╗███╗   ██╗████████╗ █████╗ ██╗
%c██╔════╝██║     ██╔════╝████╗ ████║██╔════╝████╗  ██║╚══██╔══╝██╔══██╗██║
%c█████╗  ██║     █████╗  ██╔████╔██║█████╗  ██╔██╗ ██║   ██║   ███████║██║
%c██╔══╝  ██║     ██╔══╝  ██║╚██╔╝██║██╔══╝  ██║╚██╗██║   ██║   ██╔══██║██║
%c███████╗███████╗███████╗██║ ╚═╝ ██║███████╗██║ ╚████║   ██║   ██║  ██║███████╗
%c╚══════╝╚══════╝╚══════╝╚═╝     ╚═╝╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝╚══════╝

%c███████╗███████╗██████╗ ███████╗███╗   ██╗██╗████████╗██╗   ██╗
%c██╔════╝██╔════╝██╔══██╗██╔════╝████╗  ██║██║╚══██╔══╝╚██╗ ██╔╝
%c███████╗█████╗  ██████╔╝█████╗  ██╔██╗ ██║██║   ██║    ╚████╔╝
%c╚════██║██╔══╝  ██╔══██╗██╔══╝  ██║╚██╗██║██║   ██║     ╚██╔╝
%c███████║███████╗██║  ██║███████╗██║ ╚████║██║   ██║      ██║
%c╚══════╝╚══════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝╚═╝   ╚═╝      ╚═╝
`;
    const gradient = [
        'color: #22d3ee; font-weight: bold; font-size: 10px; line-height: 1.2;',
        'color: #2dd4bf; font-weight: bold; font-size: 10px; line-height: 1.2;',
        'color: #34d399; font-weight: bold; font-size: 10px; line-height: 1.2;',
        'color: #4ade80; font-weight: bold; font-size: 10px; line-height: 1.2;',
        'color: #a3e635; font-weight: bold; font-size: 10px; line-height: 1.2;',
        'color: #facc15; font-weight: bold; font-size: 10px; line-height: 1.2;',
        'color: #fb923c; font-weight: bold; font-size: 10px; line-height: 1.2;',
        'color: #f87171; font-weight: bold; font-size: 10px; line-height: 1.2;',
        'color: #fb7185; font-weight: bold; font-size: 10px; line-height: 1.2;',
        'color: #e879f9; font-weight: bold; font-size: 10px; line-height: 1.2;',
        'color: #c084fc; font-weight: bold; font-size: 10px; line-height: 1.2;',
        'color: #a78bfa; font-weight: bold; font-size: 10px; line-height: 1.2;',
    ];
    console.log(art, ...gradient);
}
function banner({ title = 'Elemental Serenity', subtitle = 'Interactive 3D Nature Experience', version = '1.0.0', github = 'https://github.com/SahilK-027/elemental-serenity', } = {}) {
    console.clear();
    asciiArt();
    console.log(`%c✨ ${subtitle} %c v${version}`, css({
        color: '#94a3b8',
        'font-size': '14px',
        'font-weight': '400',
        'padding-left': '4px',
    }), css({
        color: '#475569',
        'font-size': '12px',
        background: '#1e293b',
        padding: '2px 8px',
        'border-radius': '4px',
        'margin-left': '8px',
    }));
    console.log(`%c%c Code on GitHub %c ${github} %c →`, css({
        padding: '4px',
    }), css({
        background: 'linear-gradient(135deg, #6e5494 0%, #24292e 100%)',
        color: '#ffffff',
        'font-size': '12px',
        'font-weight': '700',
        padding: '6px 12px',
        'border-radius': '6px 0 0 6px',
        'text-shadow': '0 1px 2px rgba(0,0,0,0.3)',
    }), css({
        background: 'linear-gradient(135deg, #161b22 0%, #0d1117 100%)',
        color: '#58a6ff',
        'font-size': '11px',
        'font-weight': '500',
        padding: '6px 14px',
        'border-radius': '0',
        'border-top': '1px solid #30363d',
        'border-bottom': '1px solid #30363d',
    }), css({
        background: 'linear-gradient(135deg, #238636 0%, #2ea043 100%)',
        color: '#ffffff',
        'font-size': '12px',
        'font-weight': '700',
        padding: '6px 10px',
        'border-radius': '0 6px 6px 0',
    }));
    console.log('');
}
function section(title, icon = '◆') {
    console.log(`\n%c ${icon} ${title.toUpperCase()} `, css({
        background: 'linear-gradient(90deg, #0f172a 0%, #1e293b 100%)',
        color: '#38bdf8',
        'font-size': '12px',
        'font-weight': '700',
        padding: '6px 16px',
        'border-radius': '4px',
        'border-left': '3px solid #38bdf8',
        'letter-spacing': '1px',
    }));
}
function techTable(techObjectOrArray) {
    section('Tech Stack', '⚡');
    console.table(techObjectOrArray);
}
function groupOpen(title, icon = '') {
    console.group(`%c ${title}`, css({
        color: '#f8fafc',
        'font-weight': '700',
        'font-size': '12px',
        background: 'linear-gradient(90deg, #1e3a5f 0%, #0f172a 100%)',
        padding: '6px 14px',
        'border-radius': '4px',
        'border-left': '3px solid #3b82f6',
    }));
}
function group(title, callback, icon = '📁') {
    console.groupCollapsed(`%c ${icon} ${title}`, css({
        color: '#cbd5e1',
        'font-weight': '600',
        'font-size': '11px',
        background: '#1e293b',
        padding: '4px 12px',
        'border-radius': '4px',
    }));
    try {
        callback();
    }
    finally {
        console.groupEnd();
    }
}
function groupEnd() {
    console.groupEnd();
}
function divider(char = '─', length = 50) {
    console.log(`%c${char.repeat(length)}`, css({ color: '#334155', 'font-size': '10px' }));
}
function keyValue(key, value, color = '#67e8f9') {
    console.log(`%c  ${key}: %c${value}`, css({ color: '#94a3b8', 'font-size': '11px', 'font-weight': '500' }), css({ color, 'font-size': '11px', 'font-weight': '700' }));
}
function credits(links = []) {
    section('Links & Credits', '🔗');
    links.forEach(({ label, url }) => {
        console.log(`%c  ${label}: %c${url}`, css({ color: '#94a3b8', 'font-size': '11px' }), css({
            color: '#60a5fa',
            'font-size': '11px',
            'text-decoration': 'underline',
        }));
    });
}
function perf(label, value, unit = 'ms') {
    styled('perf', 'PERF', `${label}: ${value}${unit}`);
}
function logGameState(game) {
    const renderer = game.renderer?.rendererInstance;
    const seasonManager = game.seasonManager;
    const envTimeManager = game.environmentTimeManager;
    const audioManager = game.audioManager;
    const musicManager = game.musicManager;
    section('Current State', '📊');
    groupOpen('🖥️ Graphics Settings');
    const storedQuality = localStorage.getItem('graphicsQuality') || 'medium';
    const storedPixelRatio = localStorage.getItem('graphicsPixelRatioCap') || '2';
    const storedShadowMap = localStorage.getItem('graphicsShadowMapType') || 'PCFShadowMap';
    const storedAntialias = localStorage.getItem('graphicsAntialias') || 'false';
    keyValue('Quality Preset', storedQuality.toUpperCase(), '#facc15');
    keyValue('Pixel Ratio', `${renderer?.getPixelRatio()?.toFixed(1) || storedPixelRatio} (cap: ${storedPixelRatio})`, '#67e8f9');
    keyValue('Shadow Map', storedShadowMap, '#c084fc');
    keyValue('Antialias', storedAntialias === 'true' ? 'ON' : 'OFF', storedAntialias === 'true' ? '#4ade80' : '#94a3b8');
    keyValue('Power Preference', 'high-performance', '#4ade80');
    if (renderer) {
        const toneMap = renderer.toneMapping;
        const toneMapNames = {
            0: 'None',
            1: 'Linear',
            2: 'Reinhard',
            3: 'Cineon',
            4: 'ACESFilmic',
            6: 'AgX',
            7: 'Neutral',
        };
        keyValue('Tone Mapping', toneMapNames[toneMap] || toneMap, '#fb7185');
        keyValue('Exposure', renderer.toneMappingExposure?.toFixed(2), '#67e8f9');
    }
    groupEnd();
    groupOpen('🌍 World State');
    const currentSeason = seasonManager?.currentSeason || 'unknown';
    const currentTime = envTimeManager?.envTime || 'unknown';
    const seasonColors = {
        spring: '#86efac',
        autumn: '#fdba74',
        winter: '#93c5fd',
        rainy: '#7dd3fc',
    };
    const timeColors = { day: '#fde047', night: '#a78bfa' };
    keyValue('Season', currentSeason.toUpperCase(), seasonColors[currentSeason] || '#94a3b8');
    keyValue('Time of Day', currentTime.toUpperCase(), timeColors[currentTime] || '#94a3b8');
    groupEnd();
    groupOpen('🔊 Audio State');
    const musicEnabled = game.withMusic;
    const masterVol = audioManager?.masterVolume ?? 1;
    const musicVol = audioManager?.musicVolume ?? 0.5;
    const soundVol = audioManager?.soundVolume ?? 0.7;
    keyValue('Music', musicEnabled ? 'ENABLED' : 'DISABLED', musicEnabled ? '#4ade80' : '#f87171');
    keyValue('Master Volume', `${Math.round(masterVol * 100)}%`, '#facc15');
    keyValue('Music Volume', `${Math.round(musicVol * 100)}%`, '#67e8f9');
    keyValue('Sound Volume', `${Math.round(soundVol * 100)}%`, '#c084fc');
    if (musicManager?.currentTrack) {
        keyValue('Now Playing', musicManager.currentTrack.name || 'Unknown', '#4ade80');
    }
    groupEnd();
    groupOpen('💻 Viewport');
    keyValue('Window', `${window.innerWidth} × ${window.innerHeight}`, '#67e8f9');
    keyValue('Device Pixel Ratio', `${window.devicePixelRatio}x`, '#facc15');
    keyValue('Touch Support', navigator.maxTouchPoints > 0 ? 'YES' : 'NO', '#c084fc');
    groupEnd();
    divider('─', 60);
    const debugHintStyle = css({
        color: '#94a3b8',
        'font-size': '11px',
        'font-style': 'italic',
    });
    const debugLinkStyle = css({
        color: '#60a5fa',
        'font-size': '11px',
        'font-weight': '700',
    });
    console.log(`%c💡 Tip: Add %c?mode=debug%c to URL for debug GUI with full controls`, debugHintStyle, debugLinkStyle, debugHintStyle);
    divider('═', 60);
}
function logSeasonChange(newSeason, oldSeason) {
    const seasonEmojis = {
        spring: '🌸',
        autumn: '🍂',
        winter: '❄️',
        rainy: '🌧️',
    };
    const seasonColors = {
        spring: '#86efac',
        autumn: '#fdba74',
        winter: '#93c5fd',
        rainy: '#7dd3fc',
    };
    const emoji = seasonEmojis[newSeason] || '🌍';
    const color = seasonColors[newSeason] || '#94a3b8';
    console.log(`%c${emoji} SEASON%c ${oldSeason?.toUpperCase() || '?'} → ${newSeason.toUpperCase()}`, css({
        background: color,
        color: '#0f172a',
        padding: '3px 10px',
        'border-radius': '4px',
        'font-weight': '700',
        'font-size': '11px',
    }), css({
        color: color,
        'font-size': '12px',
        'font-weight': '600',
        'padding-left': '8px',
    }));
}
function logTimeChange(newTime, oldTime) {
    const timeEmojis = { day: '☀️', night: '🌙' };
    const timeColors = { day: '#fde047', night: '#a78bfa' };
    const emoji = timeEmojis[newTime] || '🕐';
    const color = timeColors[newTime] || '#94a3b8';
    console.log(`%c${emoji} TIME%c ${oldTime?.toUpperCase() || '?'} → ${newTime.toUpperCase()}`, css({
        background: color,
        color: '#0f172a',
        padding: '3px 10px',
        'border-radius': '4px',
        'font-weight': '700',
        'font-size': '11px',
    }), css({
        color: color,
        'font-size': '12px',
        'font-weight': '600',
        'padding-left': '8px',
    }));
}
function logMusicChange(action, trackName = null) {
    const actions = {
        play: { emoji: '▶️', label: 'PLAYING', color: '#4ade80' },
        pause: { emoji: '⏸️', label: 'PAUSED', color: '#facc15' },
        stop: { emoji: '⏹️', label: 'STOPPED', color: '#f87171' },
        skip: { emoji: '⏭️', label: 'SKIPPED', color: '#67e8f9' },
        track: { emoji: '🎵', label: 'TRACK', color: '#c084fc' },
    };
    const { emoji, label, color } = actions[action] || actions.track;
    const msg = trackName ? `${label}: ${trackName}` : label;
    console.log(`%c${emoji} MUSIC%c ${msg}`, css({
        background: color,
        color: '#0f172a',
        padding: '3px 10px',
        'border-radius': '4px',
        'font-weight': '700',
        'font-size': '11px',
    }), css({
        color: color,
        'font-size': '12px',
        'font-weight': '600',
        'padding-left': '8px',
    }));
}
function logAudioToggle(enabled) {
    const emoji = enabled ? '🔊' : '🔇';
    const label = enabled ? 'UNMUTED' : 'MUTED';
    const color = enabled ? '#4ade80' : '#f87171';
    console.log(`%c${emoji} AUDIO%c ${label}`, css({
        background: color,
        color: '#0f172a',
        padding: '3px 10px',
        'border-radius': '4px',
        'font-weight': '700',
        'font-size': '11px',
    }), css({
        color: color,
        'font-size': '12px',
        'font-weight': '600',
        'padding-left': '8px',
    }));
}
function logGraphicsChange(quality) {
    const qualityColors = {
        low: '#f87171',
        medium: '#facc15',
        high: '#4ade80',
        ultra: '#c084fc',
    };
    const color = qualityColors[quality] || '#94a3b8';
    console.log(`%c⚙️ GRAPHICS%c Quality set to ${quality.toUpperCase()}`, css({
        background: color,
        color: '#0f172a',
        padding: '3px 10px',
        'border-radius': '4px',
        'font-weight': '700',
        'font-size': '11px',
    }), css({
        color: color,
        'font-size': '12px',
        'font-weight': '600',
        'padding-left': '8px',
    }));
}
exports.Console = {
    banner,
    section,
    info: (label, msg) => styled('info', label, msg),
    success: (label, msg) => styled('success', label, msg),
    warn: (label, msg) => styled('warn', label, msg),
    error: (label, msg) => styled('error', label, msg),
    debug: (label, msg) => styled('debug', label, msg),
    perf,
    techTable,
    group,
    groupOpen,
    groupEnd,
    divider,
    keyValue,
    credits,
    timeStamp,
    logGameState,
    logSeasonChange,
    logTimeChange,
    logMusicChange,
    logAudioToggle,
    logGraphicsChange,
};

  },
  "src/Shaders/Chunks/grass/grass.fragment_color_chunk.glsl": function(module, exports, require) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = String.raw`#include <color_fragment>

vec4 heightMap = texture2D(uDisplacementMap, vGrassUv * uTerrainNormalScale);
vec3 grassColor = mix(uGrassColorDark, uGrassColorLight, heightMap.r);

float mask = smoothstep(0.2, 0.98, vBladeMask);
mask = pow(mask, 0.5);
float finalMask = clamp(mask, 0.0, 1.0);

grassColor = mix(uShadowColor, grassColor, finalMask);
diffuseColor.rgb = grassColor;
`;
  },
  "src/Shaders/Chunks/grass/grass.fragment_common_chunk.glsl": function(module, exports, require) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = String.raw`#include <common>

uniform sampler2D uDisplacementMap;
uniform vec3 uGrassColorDark;
uniform vec3 uGrassColorLight;
uniform vec3 uShadowColor;
uniform float uTerrainNormalScale;

varying vec2 vGrassUv;
varying float vBladeMask;
`;
  },
  "src/Shaders/Chunks/grass/grass.vertex_begin_chunk.glsl": function(module, exports, require) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = String.raw`#include <begin_vertex>

float angleToCamera = atan(baseWorldPos.z - cameraPosition.z, baseWorldPos.x - cameraPosition.x) - 1.5707963267948966;
transformed.xz = rotateUV(transformed.xz, angleToCamera, vec2(0.0));

float densityCull = step(uDensityThreshold, density);
float finalScale = aBaseScale * densityCull;
transformed *= finalScale;

float localY = position.y;
vBladeMask = clamp((localY - uBladeModelMinY) / uBladeModelHeight, 0.0, 1.0);

if(windMagnitude > 0.001) {
    mat3 bendRotation = rotateAxis(rotationAxis, bendAngle);
    transformed = bendRotation * transformed;
}
`;
  },
  "src/Shaders/Chunks/grass/grass.vertex_begin_normal_chunk.glsl": function(module, exports, require) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = String.raw`vec2 world_Pos_UVs = (aWorldPosition / uGroundSize + 0.5);
vGrassUv = world_Pos_UVs;

float density = texture2D(uDensityMap, world_Pos_UVs).g;

vec2 scaledNormalUVs = world_Pos_UVs * uTerrainNormalScale;
vec3 tangentNormal = (texture2D(uTerrainNormalMap, scaledNormalUVs).rgb * 2.0 - 1.0);

vec3 worldNormal = vec3(0.0, 1.0, 0.0);
vec3 worldTangent = vec3(1.0, 0.0, 0.0);
vec3 worldBitangent = normalize(cross(worldNormal, worldTangent));

mat3 TBN = mat3(worldTangent, worldBitangent, worldNormal);
vec3 terrainNormal = normalize(TBN * tangentNormal);
terrainNormal = normalize(mix(vec3(0.0, 1.0, 0.0), terrainNormal, uNormalStrength));

vec4 baseWorldPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
vec2 windVector = calculateWindVector(baseWorldPos.xyz);

float windMagnitude = length(windVector);
vec3 windDir3D = normalize(vec3(windVector.x, 0.0, windVector.y));
vec3 rotationAxis = cross(windDir3D, vec3(0.0, 1.0, 0.0));

float heightFactor = position.y;
float bendAngle = windMagnitude * heightFactor * heightFactor * 2.0;

if(windMagnitude > 0.001) {
  mat3 bendRotation = rotateAxis(rotationAxis, bendAngle);
  terrainNormal = bendRotation * terrainNormal;
}

#include <beginnormal_vertex>

objectNormal = terrainNormal;
`;
  },
  "src/Shaders/Chunks/grass/grass.vertex_common_chunk.glsl": function(module, exports, require) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = String.raw`#include <common>

attribute float aBaseScale;
attribute vec2 aWorldPosition;

uniform float uTime;
uniform sampler2D uDensityMap;
uniform sampler2D uTerrainNormalMap;
uniform float uGroundSize;
uniform float uNormalStrength;
uniform float uTerrainNormalScale;
uniform float uWindSpeed;
uniform float uWindAmplitude;
uniform float uWindWaveTiling;
uniform float uWindWaveStrength;
uniform float uWindBaseTiling;
uniform float uWindBaseStrength;
uniform float uBladeModelMinY;
uniform float uBladeModelHeight;
uniform float uDensityThreshold;

varying float vBladeMask;

vec2 rotateUV(vec2 uv, float angle, vec2 center) {
    float s = sin(angle);
    float c = cos(angle);
    uv -= center;
    uv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
    uv += center;
    return uv;
}

float noise2D(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float smoothNoise2D(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = noise2D(i);
    float b = noise2D(i + vec2(1.0, 0.0));
    float c = noise2D(i + vec2(0.0, 1.0));
    float d = noise2D(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p, float lacunarity) {
    float value = 0.0;
    float amplitude = 0.5;
    for(int i = 0; i < 1; i++) {
        value += amplitude * smoothNoise2D(p);
        p *= lacunarity;
        amplitude *= 0.5;
    }
    return value;
}

vec2 calculateWindVector(vec3 worldPos) {
    vec2 windWavePos = worldPos.xz * uWindWaveTiling;
    float windWaveTime = uTime * uWindSpeed;
    float wave1 = fbm(windWavePos - vec2(windWaveTime * 0.35, windWaveTime), 3.0);
    float wave2 = fbm(windWavePos - vec2(0.0, windWaveTime * 0.35), 2.0);
    float primaryWave = (wave1 + wave2) * 0.5 * uWindWaveStrength;

    vec2 windBasePos = worldPos.xz * uWindBaseTiling;
    float baseWaveTime = uTime * (uWindSpeed * 0.93);
    float baseWave = fbm(windBasePos - vec2(baseWaveTime, 0.0), 2.0) * uWindBaseStrength;

    float windStrength = (primaryWave + baseWave) * uWindAmplitude;
    vec2 windDir;
    windDir.x = windStrength;
    windDir.y = windStrength * 0.3 * sin(windWaveTime * 0.5);
    return windDir;
}

mat3 rotateAxis(vec3 axis, float angle) {
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    return mat3(oc * axis.x * axis.x + c, oc * axis.x * axis.y - axis.z * s, oc * axis.z * axis.x + axis.y * s, oc * axis.x * axis.y + axis.z * s, oc * axis.y * axis.y + c, oc * axis.y * axis.z - axis.x * s, oc * axis.z * axis.x - axis.y * s, oc * axis.y * axis.z + axis.x * s, oc * axis.z * axis.z + c);
}

varying vec2 vGrassUv;
`;
  },
  "src/Shaders/Chunks/ground/ground.fragment_color_chunk.glsl": function(module, exports, require) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = String.raw`#include <color_fragment>

vec4 heightMap = texture2D(uDisplacementMap, vUv);
vec4 densityMap = texture2D(uDensityMap, vUv);
vec4 perlinNoise = texture2D(uPerlinNoise, vUv * 2.0);
vec4 rockMap = texture2D(uGroundRockMap, vUv * uRockTiling);
float rockAO = texture2D(uGroundRockAO, vUv * uRockTiling).r;

float densityMask = smoothstep(0.01, 1.25, densityMap.g);
vec3 X = mix(perlinNoise.rgb, vec3(1.0), smoothstep(0.9, 1.0, densityMap.g));
float rockMask = smoothstep(0.0, 0.55, X.r);

vec3 groundColor = mix(uGroundColorLight, uGroundColorDark, heightMap.r);
groundColor = mix(groundColor, uGroundColorBelowGrass, densityMask);

vec3 rockColor = rockMap.rgb * uRockColor * mix(1.0, rockAO, 2.0 * rockMask);
groundColor = mix(rockColor, groundColor, rockMask);

float waterMask = densityMap.b;

vec2 waterGrad = vec2(dFdx(waterMask), dFdy(waterMask));
float edgeStrength = length(waterGrad) * 5.0;
float edgeSoftness = smoothstep(0.0, 1.0, edgeStrength);

waterMask = mix(waterMask, waterMask * (1.0 - edgeSoftness * 0.7), min(edgeStrength, 1.0));

vec2 waterCenter = vec2(0.53, 0.535);
float distFromCenter = length(vUv - waterCenter);

float depthGradient = 1.0 - smoothstep(0.0, 0.3, distFromCenter);
depthGradient = pow(depthGradient, uWaterDepthIntensity);

vec3 waterColor = mix(uWaterShallow, uWaterDeep, depthGradient);

groundColor = mix(groundColor, waterColor, waterMask);

diffuseColor.rgb = groundColor;
`;
  },
  "src/Shaders/Chunks/ground/ground.fragment_common_chunk.glsl": function(module, exports, require) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = String.raw`#include <common>
uniform sampler2D uDensityMap;
uniform sampler2D uDisplacementMap;
uniform sampler2D uPerlinNoise;
uniform sampler2D uGroundRockMap;
uniform sampler2D uGroundRockAO;
uniform vec3 uGroundSize;
uniform vec3 uGroundColorLight;
uniform vec3 uGroundColorDark;
uniform vec3 uGroundColorBelowGrass;
uniform vec3 uRockColor;
uniform float uRockTiling;
uniform vec3 uWaterShallow;
uniform vec3 uWaterDeep;
uniform float uWaterDepthIntensity;
varying vec2 vUv;
`;
  },
  "src/Shaders/Chunks/ground/ground.vertex_begin_chunk.glsl": function(module, exports, require) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = String.raw`#include <begin_vertex>

vec4 worldPos = modelMatrix * vec4(position, 1.0);
vec2 heightUv = (worldPos.xz + uGroundSize.xz * 0.5) / uGroundSize.xz;

vUv = heightUv;
`;
  },
  "src/Shaders/Chunks/ground/ground.vertex_common_chunk.glsl": function(module, exports, require) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = String.raw`#include <common>
uniform vec3 uGroundSize;
uniform sampler2D uHeightMap;
uniform sampler2D uPerlinNoise;
uniform float uRockTiling;
varying vec2 vUv;
`;
  },
  "src/Shaders/Chunks/rocks/rocks.fragment_color_chunk.glsl": function(module, exports, require) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = String.raw`#include <color_fragment>

vec4 displacement = texture2D(uDisplacementMap, vUv);
vec4 perlinNoise = texture2D(uPerlinNoise, vUv * 2.0);

vec3 color1 = mix(uRockColor1, uRockColor2, displacement.r);
vec3 color = mix(color1, uRockColor3, perlinNoise.r);
color *= 0.9 + (perlinNoise.r * 0.2);

float upwardFacing = max(0.0, vWorldSpaceNormal.y);
vec3 mossColor1 = mix(uMossColor1, uMossColor2, displacement.r);
vec3 mossColor = mix(mossColor1, uMossColor3, displacement.r);
color = mix(color, mossColor, upwardFacing * (perlinNoise.r / uMossNoiseFactor) * uMossVisibility);

diffuseColor.rgb = color;
`;
  },
  "src/Shaders/Chunks/rocks/rocks.fragment_common_chunk.glsl": function(module, exports, require) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = String.raw`#include <common>
uniform sampler2D uDisplacementMap;
uniform sampler2D uPerlinNoise;
uniform vec3 uRockColor1;
uniform vec3 uRockColor2;
uniform vec3 uRockColor3;
uniform vec3 uMossColor1;
uniform vec3 uMossColor2;
uniform vec3 uMossColor3;
uniform float uMossNoiseFactor;
uniform float uMossVisibility;

varying vec2 vUv;
varying vec3 vWorldSpaceNormal;
`;
  },
  "src/Shaders/Chunks/rocks/rocks.vertex_begin_chunk.glsl": function(module, exports, require) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = String.raw`#include <begin_vertex>
vUv = uv;
vWorldSpaceNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
`;
  },
  "src/Shaders/Chunks/rocks/rocks.vertex_common_chunk.glsl": function(module, exports, require) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = String.raw`#include <common>
varying vec2 vUv;
varying vec3 vWorldSpaceNormal;
`;
  },
  "src/Shaders/Chunks/water/water.fragment_color_chunk.glsl": function(module, exports, require) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = String.raw`#include <color_fragment>

vec4 densityMap = texture2D(uDensityMap, vUv);
vec4 waterDepthMap = texture2D(uWaterDepthTexture, vUv);

float waterDensityMask = smoothstep(uDensityMaskMin, uDensityMaskMax, densityMap.b);
float waterDepth = waterDepthMap.b;

float finalAlpha = 0.0;
vec3 finalColor = vec3(1.0);

float shoreMask = smoothstep(uShoreMaskThreshold, 0.0, waterDepth);
float centerMask = smoothstep(uSplashesCenterMin, uSplashesCenterMax, waterDepth);


if ( uRipplesRatio > 0.001 ) {
float noise1 = texture2D(uPerlinNoise, vUv * uNoiseScale1 + uTime * uNoiseSpeed1).r;
float noise2 = texture2D(uPerlinNoise, vUv * uNoiseScale2 - uTime * uNoiseSpeed2).g;

float combinedNoise = noise1 * uNoiseMix1 + noise2 * uNoiseMix2;
float noisyDepth = waterDepth + combinedNoise * uNoiseDepthInfluence;

float ripplePattern = fract((noisyDepth + uTime) * uRippleFrequency);

float rippleRing = smoothstep(0.0, uRippleInnerEdge, ripplePattern) *
        smoothstep(uRippleOuterEdge, uRippleInnerEdge, ripplePattern);

float breakupMask = smoothstep(uBreakupMin, uBreakupMax, combinedNoise);


rippleRing *= shoreMask * breakupMask;
rippleRing *= smoothstep(0.0, uWaterDepthFade, waterDepth);

finalAlpha = max(finalAlpha, rippleRing*waterDensityMask*uRippleOpacity*uRipplesRatio);
}


if ( uSplashesRatio > 0.001 ) {
vec2 splashUv = vWorldPosition.xz * uSplashesNoiseFrequency;


vec3 splashesVoronoi = voronoi(splashUv, 8.0);
float splashPerlin = texture2D(uPerlinNoise, splashUv * 0.25).r;


float splash = splashesVoronoi.r;


float splashTimeRandom = hash2(vec2(splashesVoronoi.b * 123456.0)) + splashPerlin;
float splashTime = uTime * uSplashesTimeFrequency + splashTimeRandom;
splash = fract(splash-splashTime);


float edgeMultiplier = smoothstep(uSplashesEdgeAttenuationLow, uSplashesEdgeAttenuationHigh, splashesVoronoi.g);
float thickness = uSplashesThickness * edgeMultiplier;
splash = 1.0 - step(thickness, splash);


float splashVisibilityRandom = hash2(vec2(splashesVoronoi.b * 654321.0));
float visible = fract(splashVisibilityRandom + splashPerlin);
visible = step(visible, uSplashesRatio);
splash *= visible;


splash *= centerMask;

finalAlpha = max(finalAlpha, splash*waterDensityMask);


if ( splash > 0.01 ) {
finalColor = mix(finalColor, vec3(1.0), splash*0.8);
}
}


if ( uIceRatio > 0.001 ) {
vec2 iceUv = vWorldPosition.xz * uIceNoiseFrequency;


float iceVoronoi = voronoi(iceUv, 8.0).g;


float iceMask = smoothstep(0.0, uIceRatio, waterDepth);
float ice = step(iceMask, iceVoronoi);

finalAlpha = max(finalAlpha, ice*waterDensityMask*0.9);


if ( ice > 0.01 ) {
vec3 iceColor = uIceColor;
finalColor = mix(finalColor, iceColor, ice*0.7);
}
}


if ( finalAlpha < uDiscardThreshold ) {
discard ;
}

diffuseColor.rgb = finalColor;
diffuseColor.a = finalAlpha;
`;
  },
  "src/Shaders/Chunks/water/water.fragment_common_chunk.glsl": function(module, exports, require) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = String.raw`#include <common>
uniform sampler2D uDensityMap;
uniform sampler2D uPerlinNoise;
uniform sampler2D uWaterDepthTexture;
uniform float uTime;
uniform float uRipplesRatio;
uniform float uDensityMaskMin;
uniform float uDensityMaskMax;
uniform float uShoreMaskThreshold;
uniform float uNoiseScale1;
uniform float uNoiseScale2;
uniform float uNoiseSpeed1;
uniform float uNoiseSpeed2;
uniform float uNoiseMix1;
uniform float uNoiseMix2;
uniform float uNoiseDepthInfluence;
uniform float uRippleFrequency;
uniform float uRippleInnerEdge;
uniform float uRippleOuterEdge;
uniform float uBreakupMin;
uniform float uBreakupMax;
uniform float uWaterDepthFade;
uniform float uDiscardThreshold;
uniform float uRippleOpacity;
uniform float uSplashesRatio;
uniform float uSplashesNoiseFrequency;
uniform float uSplashesTimeFrequency;
uniform float uSplashesThickness;
uniform float uSplashesEdgeAttenuationLow;
uniform float uSplashesEdgeAttenuationHigh;
uniform float uSplashesCenterMin;
uniform float uSplashesCenterMax;
uniform float uIceRatio;
uniform float uIceNoiseFrequency;
uniform vec3 uIceColor;

varying vec2 vUv;
varying vec3 vWorldPosition;


float hash(float n) {
    return fract(sin(n) * 43758.5453123);
}

float hash2(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

vec2 hash22(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453123);
}

vec3 voronoi(vec2 uv, float repeat) {
    vec2 cellId = vec2(0.0);
    uv *= repeat;
    vec2 i = floor(uv);
    vec2 f = fract(uv);
    float minDist = 1.0;
    float minEdge = 1.0;
    vec2 bestId = vec2(0.0);

    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 cell = mod(i + neighbor, repeat);
            vec2 point = hash22(cell);
            vec2 diff = neighbor + point - f;
            float dist = length(diff);

            if (dist < minDist) {
                minEdge = minDist;
                minDist = dist;
                bestId = i + neighbor;
            } else if (dist < minEdge) {
                minEdge = dist;
            }
        }
    }

    cellId = fract(bestId / repeat);
    return vec3(minDist, minEdge - minDist, hash22(cellId).x);
}
`;
  },
  "src/Shaders/Chunks/water/water.vertex_begin_chunk.glsl": function(module, exports, require) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = String.raw`#include <begin_vertex>

vec4 worldPos = modelMatrix * vec4(position, 1.0);
vec2 heightUv = (worldPos.xz + uGroundSize.xz * 0.5) / uGroundSize.xz;

vUv = heightUv;
vWorldPosition = worldPos . xyz;
`;
  },
  "src/Shaders/Chunks/water/water.vertex_common_chunk.glsl": function(module, exports, require) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = String.raw`#include <common>
uniform vec3 uGroundSize;
varying vec2 vUv;
varying vec3 vWorldPosition;
`;
  },
  "src/Shaders/Materials/bush/fragment.glsl": function(module, exports, require) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = String.raw`#include <common>
#include <fog_pars_fragment>

precision highp float;

varying vec3 vInstanceNormal;
varying vec2 vUv;
varying float vWorldY;
varying vec3 vDebugColor;
varying vec3 vInstanceShadowColor;
varying vec3 vInstanceMidColor;
varying vec3 vInstanceHighlightColor;
varying vec3 vInstanceColorMultiplier;

uniform vec3 uLightDirection;
uniform sampler2D uAlphaMap;
uniform vec3 uShadowColor;
uniform vec3 uMidColor;
uniform vec3 uHighlightColor;

vec3 ambientLight(vec3 lightColor, float lightIntensity) {
    return lightColor * lightIntensity;
}

vec3 colorRamp(float t, vec3 shadowColor, vec3 midColor, vec3 highlightColor) {
    if(t < 0.5) {
        return mix(shadowColor, midColor, t * 2.0);
    } else {
        return mix(midColor, highlightColor, (t - 0.5) * 2.0);
    }
}

vec3 colorRampDEBUG(float t) {
    if(t < 0.5) {
        return mix(uShadowColor, uMidColor, t * 2.0);
    } else {
        return mix(uMidColor, uHighlightColor, (t - 0.5) * 2.0);
    }
}

void main() {
    vec3 shadowColor = vInstanceShadowColor;
    vec3 midColor = vInstanceMidColor;
    vec3 highlightColor = vInstanceHighlightColor;

    float alpha = texture2D(uAlphaMap, vUv).a;
    float a = smoothstep(0.4, 0.6, alpha);
    if(a < 0.01) {
        discard;
    }

    vec3 normal = normalize(vInstanceNormal);
    float ndl = dot(normal, normalize(uLightDirection));
    ndl = ndl * 0.6 + 0.4;

    float t = clamp(vWorldY * 0.1 + ndl, 0.0, 1.0);

    vec3 color = colorRamp(t, shadowColor, midColor, highlightColor);
    color *= vInstanceColorMultiplier;

    gl_FragColor = vec4(color, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
}
`;
  },
  "src/Shaders/Materials/bush/vertex.glsl": function(module, exports, require) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = String.raw`#include <common>
#include <fog_pars_vertex>

precision highp float;

attribute vec3 instanceNormal;
attribute vec3 instanceShadowColor;
attribute vec3 instanceMidColor;
attribute vec3 instanceHighlightColor;
attribute vec3 instanceColorMultiplier;

varying vec3 vInstanceShadowColor;
varying vec3 vInstanceMidColor;
varying vec3 vInstanceHighlightColor;
varying vec3 vInstanceColorMultiplier;
varying vec3 vInstanceNormal;
varying vec2 vUv;
varying float vWorldY;
varying vec3 vDebugColor;

uniform float uTime;
uniform float uBreezeSpeed;
uniform float uBreezeScale;
uniform float uBreezeStrength;
uniform float uSquallSpeed;
uniform float uSquallScale;
uniform float uSquallStrength;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
    #include <begin_vertex>
    #include <project_vertex>
    mat4 m = modelMatrix;

    #ifdef USE_INSTANCING
    m = instanceMatrix;
    #endif

    vec3 worldPosition = m[3].xyz;

    float scaleX = length(m[0].xyz);
    float scaleY = length(m[1].xyz);

    vec3 cameraRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);

    vec3 cameraUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);

    float heightMask = clamp(position.y + 0.5, 0.0, 1.0);
    heightMask = pow(heightMask, 1.5);

    vec2 windPos = worldPosition.xz + position.xz;

    float Breeze = noise(windPos * uBreezeScale + uTime * uBreezeSpeed) - 0.5;
    float Squall = noise(windPos * uSquallScale * 0.5 + uTime * uSquallSpeed) - 0.5;

    float wind = (Breeze * uBreezeStrength + Squall * uSquallStrength) * heightMask;

    vec3 windOffset = cameraRight * wind * 0.25 + cameraUp * wind * 0.1;

    vec3 billboardPosition = worldPosition + (cameraRight * position.x * scaleX) + (cameraUp * position.y * scaleY) + windOffset;

    gl_Position = projectionMatrix * viewMatrix * vec4(billboardPosition, 1.0);

    vInstanceNormal = instanceNormal;
    vUv = uv;
    vWorldY = billboardPosition.y;
    vDebugColor = windOffset;
    vInstanceShadowColor = instanceShadowColor;
    vInstanceMidColor = instanceMidColor;
    vInstanceHighlightColor = instanceHighlightColor;
    vInstanceColorMultiplier = instanceColorMultiplier;

    #include <fog_vertex>
}
`;
  },
  "src/Shaders/Materials/fire/fragment.glsl": function(module, exports, require) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = String.raw`uniform sampler2D uParticleTexture;

varying float vAngle;
varying vec4 vColour;

void main() {
    vec2 uv = gl_PointCoord.xy;
    float c = cos(vAngle);
    float s = sin(vAngle);
    mat2 r = mat2(c, s, -s, c);
    uv = (uv - 0.5) * r + 0.5;

    vec4 particleTexture = texture2D(uParticleTexture, uv);
    gl_FragColor = particleTexture * vColour;
}
`;
  },
  "src/Shaders/Materials/fire/vertex.glsl": function(module, exports, require) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = String.raw`attribute vec2 particleData;

uniform sampler2D uSizeOverLife;
uniform sampler2D uColorOverLife;
uniform sampler2D uTwinkleOverLife;
uniform float uTime;

varying float vAngle;
varying vec4 vColour;

void main() {
    float life = particleData.x;
    float id = particleData.y;

    float sizeSample = texture2D(uSizeOverLife, vec2(life, 0.5)).r;
    vec4 colorSample = texture2D(uColorOverLife, vec2(life, 0.5));
    float twinkleSample = texture2D(uTwinkleOverLife, vec2(life, 0.5)).r;
    float twinkle = mix(1.0, sin(uTime * 20.0 + id * 6.28) * 0.5 + 0.5, twinkleSample);

    vec3 mvPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * vec4(mvPosition, 1.0);
    gl_PointSize = (sizeSample * 4000.0 / -mvPosition.z);

    vAngle = 0.0;
    vColour = colorSample;
    vColour.a *= twinkle;
}
`;
  },
  "src/Shaders/Materials/fireflies/fragment.glsl": function(module, exports, require) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = String.raw`uniform float uTime;
uniform vec2 uResolution;
uniform sampler2D uTexture;

varying float vColorMix;

void main() {
    vec2 uv = gl_PointCoord;

    vec4 particlesTexture = texture2D(uTexture, uv);

    float colorMix = vColorMix;

    vec3 color1 = vec3(1.0, 0.67, 0.21);
    vec3 color2 = vec3(0.99, 0.43, 0.0);

    vec3 starColor = mix(color1, color2, colorMix);

    float speed = 20.0;
    float sharpness = 4.0;
    float baseline = 0.7;
    float intensity = 1.8;

    float phase = particlesTexture.g * 6.28318530718;

    float flicker = 0.5 + 0.5 * sin(uTime * speed + phase);

    float brightness = mix(baseline, 1.0, pow(flicker, sharpness)) * intensity;

    starColor *= brightness;

    gl_FragColor = vec4(starColor, particlesTexture.r);
}
`;
  },
  "src/Shaders/Materials/fireflies/vertex.glsl": function(module, exports, require) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = String.raw`uniform float uTime;
uniform vec2 uResolution;
uniform float uPixelRatio;
uniform float uSize;

attribute float aScale;

varying float vColorMix;

vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
    return mod289(((x * 34.0) + 10.0) * x);
}

vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
}

vec3 fade(vec3 t) {
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

float cnoise(vec3 P) {
    vec3 Pi0 = floor(P);
    vec3 Pi1 = Pi0 + vec3(1.0);
    Pi0 = mod289(Pi0);
    Pi1 = mod289(Pi1);
    vec3 Pf0 = fract(P);
    vec3 Pf1 = Pf0 - vec3(1.0);
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz;
    vec4 iz1 = Pi1.zzzz;

    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);

    vec4 gx0 = ixy0 * (1.0 / 7.0);
    vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);

    vec4 gx1 = ixy1 * (1.0 / 7.0);
    vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);

    vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
    vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
    vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
    vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
    vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
    vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
    vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
    vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);

    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
    g000 *= norm0.x;
    g010 *= norm0.y;
    g100 *= norm0.z;
    g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
    g001 *= norm1.x;
    g011 *= norm1.y;
    g101 *= norm1.z;
    g111 *= norm1.w;

    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
    float n111 = dot(g111, Pf1);

    vec3 fade_xyz = fade(Pf0);
    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
    return 2.2 * n_xyz;
}

mat3 rotation3dY(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c);
}

vec3 fbm_vec3(vec3 p, float frequency, float offset) {
    return vec3(cnoise((p + vec3(offset)) * frequency), cnoise((p + vec3(offset + 20.0)) * frequency), cnoise((p + vec3(offset - 30.0)) * frequency));
}

float hash1(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
}

vec3 curlNoise(vec3 p) {
    float e = 0.0125;
    vec3 F = fbm_vec3(p, 1.0, 0.0);
    vec3 Fx = fbm_vec3(p + vec3(e, 0.0, 0.0), 1.0, 0.0);
    vec3 Fy = fbm_vec3(p + vec3(0.0, e, 0.0), 1.0, 0.0);
    vec3 Fz = fbm_vec3(p + vec3(0.0, 0.0, e), 1.0, 0.0);

    vec3 dFdx = (Fx - F) / e;
    vec3 dFdy = (Fy - F) / e;
    vec3 dFdz = (Fz - F) / e;

    vec3 curl = vec3(dFdz.y - dFdy.z, dFdx.z - dFdz.x, dFdy.x - dFdx.y);
    return curl;
}

vec3 rotateAroundAxis(vec3 v, vec3 axis, float angle) {
    axis = normalize(axis + 1e-6);
    float c = cos(angle);
    float s = sin(angle);
    return v * c + cross(axis, v) * s + axis * dot(axis, v) * (1.0 - c);
}

void main() {
    float flowSpeed = 0.2;
    float flowAmplitude = 0.15;
    float driftMagnitude = 1.20;
    float jitterMagnitude = 0.05;

    vec3 pos = position;

    float colorMix = cnoise(pos * 0.3) * 0.5 + 0.5;
    vColorMix = colorMix;

    float phase = hash1(pos) * 6.28318530718;
    float baseSize = (cnoise(pos * 0.45) * 0.5 + 0.5);
    float particleSize = baseSize * 1.1;

    vec3 flowSamplePoint = pos + vec3(uTime * flowSpeed);
    vec3 localFlow = curlNoise(flowSamplePoint);
    vec3 advectedCenter = pos + localFlow * (flowAmplitude * (0.5 + 0.5 * baseSize));

    vec3 seedVec = fbm_vec3(pos * 0.35, 1.0, 10.0);
    float seed = hash1(pos + vec3(7.0));
    vec3 driftDir = normalize(seedVec + vec3(0.001));
    float driftFreq = 0.06 + 0.12 * seed;
    vec3 drift = driftDir * sin(uTime * driftFreq + phase * 0.5) * (driftMagnitude * baseSize);

    vec3 jitterNoise = fbm_vec3(pos * 4.0 + vec3(uTime * 0.45), 2.0, 3.0);
    vec3 jitter = (jitterNoise - 0.5) * (jitterMagnitude * baseSize);

    vec3 particleWorld = advectedCenter + drift + jitter;

    vec4 viewPosition = viewMatrix * vec4((modelMatrix * vec4(particleWorld, 1.0)).xyz, 1.0);
    gl_Position = projectionMatrix * viewPosition;

    float finalSize = uSize * particleSize * aScale * uPixelRatio * 100.0;
    gl_PointSize = finalSize * (1.0 / -viewPosition.z);
}
`;
  },
  "src/Shaders/Materials/flowers/fragment.glsl": function(module, exports, require) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = String.raw`#include <common>
#include <fog_pars_fragment>
uniform sampler2D uFlowerAtlas;
uniform float uTimeColorAlpha;
varying vec2 vUv;

void main() {
    vec4 texColor = texture2D(uFlowerAtlas, vUv);

    if(texColor.a < 0.5)
        discard;
    texColor.a *= uTimeColorAlpha;
    gl_FragColor = texColor;

    #include <fog_fragment>
}
`;
  },
  "src/Shaders/Materials/flowers/vertex.glsl": function(module, exports, require) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = String.raw`#include <common>
#include <fog_pars_vertex>

uniform float uTime;
uniform float uWindSpeed;
uniform float uWindAmplitude;

attribute vec2 aTexOffset;

varying vec2 vUv;

float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    #include <begin_vertex>
    #include <project_vertex>

    vUv = uv * vec2(0.5, 1.0) + aTexOffset;

    vec4 worldPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);

    vec3 cameraRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 cameraUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);

    float windPhase = noise(worldPos.xz) * 6.28318;
    float wind = sin(uTime * uWindSpeed + windPhase) * uWindAmplitude;

    float heightFactor = (position.y + 0.5);
    vec3 windOffset = cameraRight * wind * heightFactor * 0.5;

    vec3 billboardPos = worldPos.xyz + cameraRight * position.x + cameraUp * position.y + windOffset;

    gl_Position = projectionMatrix * viewMatrix * vec4(billboardPos, 1.0);

    #include <fog_vertex>
}
`;
  },
  "src/Shaders/Materials/lightning/fragment.glsl": function(module, exports, require) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = String.raw`uniform float uTime;
uniform float uStartTime;
uniform float uDuration;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uIntensity;

varying vec2 vUv;
varying float vProgress;

void main() {
    float localTime = uTime - uStartTime;
    float timeProgress = clamp(localTime / uDuration, 0.0, 1.0);

    float alpha = 1.0 - timeProgress;

    vec3 mixedColor = mix(uColorA, uColorB, vProgress);

    vec3 finalColor = mixedColor * uIntensity;

    gl_FragColor = vec4(finalColor * 1.3, alpha);
}
`;
  },
  "src/Shaders/Materials/lightning/vertex.glsl": function(module, exports, require) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = String.raw`varying vec2 vUv;
varying float vProgress;

void main() {
    vUv = uv;
    vProgress = position.y / 15.0;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
  },
  "src/Shaders/Materials/reveal/fragment.glsl": function(module, exports, require) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = String.raw`precision mediump float;

uniform float uTime;
uniform float uProgress;
uniform vec2 uResolution;
varying vec2 vUv;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 0.0;

    for(int i = 0; i < 3; i++) {
        value += amplitude * noise(st);
        st *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

void main() {
    vec2 st = vUv;

    float time = uTime * 0.3;
    float n1 = fbm(st * 4.0 + time);
    float n2 = fbm(st * 8.0 - time * 0.7);

    vec2 center = vec2(0.5, 0.5);
    float dist = distance(st, center);

    float radial = 1.0 - smoothstep(0.0, 0.8, dist);

    float pattern = mix(n1, n2, 0.5) * 0.4;
    float reveal = uProgress * 1.2 + pattern - dist * 0.6;

    reveal = smoothstep(0.0, 0.3, reveal);

    float alpha = 1.0 - reveal;
    alpha = smoothstep(0.0, 0.05, alpha);

    vec3 color = vec3(0.929, 0.910, 0.894);

    gl_FragColor = vec4(color, alpha);
}
`;
  },
  "src/Shaders/Materials/reveal/vertex.glsl": function(module, exports, require) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = String.raw`attribute vec2 aPosition;
varying vec2 vUv;

void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;
  },
  "src/Shaders/Materials/skydome/fragment.glsl": function(module, exports, require) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = String.raw`uniform vec3 uZenithColor;
uniform vec3 uHorizonColor;
uniform vec3 uGroundColor;
uniform vec3 uSunPosition;
uniform vec3 uSunColor;
uniform vec3 uSunGlowColor;
uniform float uSunSize;
uniform float uSunGlowSize;
uniform float uSunRayCount;
uniform float uSunRayLength;
uniform float uSunRaySharpness;
uniform vec3 uMoonPosition;
uniform vec3 uMoonColor;
uniform vec3 uMoonGlowColor;
uniform float uMoonSize;
uniform float uMoonGlowSize;
uniform vec3 uStarColor;
uniform float uStarDensity;
uniform float uStarBrightness;
uniform float uTime;
uniform float uIsNight;
uniform float uSeason;
uniform float uAtmosphereIntensity;

varying vec3 vWorldPosition;
varying vec3 vViewDirection;

float hash(vec2 p) {
    p = fract(p * vec2(443.897, 441.423));
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
}

vec2 hash2(vec2 p) {
    return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453123);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);

    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

vec3 animeSun(
    vec3 direction,
    vec3 sunDir,
    vec3 sunColor,
    vec3 glowColor,
    float sunSize,
    float glowSize,
    float rayCount,
    float rayLength,
    float raySharpness
) {
    float sunDot = dot(direction, sunDir);

    if(sunDot < 0.85) {
        float distFromSun = acos(clamp(sunDot, -1.0, 1.0));
        float outerGlow = smoothstep(glowSize * 2.0, 0.0, distFromSun);
        return glowColor * (outerGlow * outerGlow * 0.3) * vec3(1.0, 0.8, 0.6);
    }

    float distFromSun = acos(sunDot);
    vec3 result = vec3(0.0);

    vec3 sunRight = normalize(cross(sunDir, vec3(0.0, 1.0, 0.0)));
    vec3 sunUp = normalize(cross(sunRight, sunDir));
    float sunX = dot(direction - sunDir * sunDot, sunRight);
    float sunY = dot(direction - sunDir * sunDot, sunUp);
    float angle = atan(sunY, sunX);

    float outerGlow = smoothstep(glowSize * 2.0, 0.0, distFromSun);
    result += glowColor * (outerGlow * outerGlow * 0.3) * vec3(1.0, 0.8, 0.6);

    float rayPattern = cos(angle * rayCount) * 0.5 + 0.5;
    rayPattern = pow(rayPattern, raySharpness);
    float rayStart = sunSize * 0.8;
    float rayEnd = sunSize + rayLength;
    float rayMask = smoothstep(rayEnd, rayStart, distFromSun) *
        smoothstep(sunSize * 0.5, rayStart, distFromSun);
    result += mix(sunColor, glowColor, 0.5) * (rayPattern * rayMask * 0.8);

    float midGlow = smoothstep(glowSize, sunSize * 0.5, distFromSun) *
        smoothstep(sunSize * 0.3, sunSize * 0.8, distFromSun);
    float innerGlow = smoothstep(sunSize * 1.5, sunSize * 0.9, distFromSun);
    innerGlow *= innerGlow;

    result += glowColor * midGlow * 0.6;
    result += mix(glowColor, sunColor, 0.7) * innerGlow * 0.5;

    float discMask = smoothstep(sunSize, sunSize * 0.85, distFromSun);
    float discGradient = smoothstep(sunSize, 0.0, distFromSun);
    vec3 discColor = mix(sunColor * 0.95, sunColor * 1.2, discGradient) +
        vec3(0.1, 0.05, 0.0) * (1.0 - discGradient);

    result = mix(result, discColor, discMask);

    float centerHighlight = smoothstep(sunSize * 0.4, 0.0, distFromSun);
    result += vec3(1.0, 0.98, 0.9) * (centerHighlight * centerHighlight * 0.3);

    return result;
}

float stars(vec2 uv, float density) {
    vec2 starUv = uv * 30.0;
    vec2 starId = floor(starUv);
    vec2 starPos = fract(starUv);

    float star = 0.0;

    for(int x = 0; x <= 1; x++) {
        for(int y = 0; y <= 1; y++) {
            vec2 cellId = starId + vec2(float(x), float(y));

            float cellHash = hash(cellId);

            if(cellHash < density * 0.12) {
                vec2 starCenter = fract(sin(cellId * vec2(12.9898, 78.233)) * 43758.5453) * 0.8 + 0.1;
                vec2 starLocalPos = starPos - vec2(float(x), float(y)) - starCenter;
                float dist = length(starLocalPos);

                float brightness = cellHash * 0.5 + 0.5;
                float starSize = 0.025 + brightness * 0.015;

                float starIntensity = max(0.0, 1.0 - dist * (1.0 / starSize));
                star += brightness * starIntensity * starIntensity;
            }
        }
    }

    return min(star, 1.0);
}

void main() {
    vec3 direction = normalize(vWorldPosition);

    float altitude = direction.y;

    vec3 skyColor;

    if(altitude > 0.0) {
        float factor = altitude * altitude * sqrt(altitude);
        skyColor = mix(uHorizonColor, uZenithColor, factor);
    } else {
        float factor = altitude * altitude * altitude;
        skyColor = mix(uHorizonColor, uGroundColor, -factor);
    }

    vec3 finalColor = skyColor;

    if(uIsNight < 0.5) {
        bool showSun = uSeason < 0.5 || (uSeason > 1.5 && uSeason < 2.5);

        if(showSun) {
            vec3 sunDir = normalize(uSunPosition);
            vec3 sunContribution = animeSun(direction, sunDir, uSunColor, uSunGlowColor, uSunSize, uSunGlowSize, uSunRayCount, uSunRayLength, uSunRaySharpness);

            finalColor += sunContribution;
        }
    } else {
        vec3 moonDir = normalize(uMoonPosition);
        float moonDot = dot(direction, moonDir);
        float distFromMoon = acos(clamp(moonDot, -1.0, 1.0));

        float outerGlowRadius = uMoonGlowSize * 3.0;
        float outerGlow = smoothstep(outerGlowRadius, 0.0, distFromMoon);
        outerGlow = outerGlow * outerGlow * outerGlow;
        finalColor += uMoonGlowColor * outerGlow * 0.15;

        float midGlowRadius = uMoonGlowSize * 1.5;
        float midGlow = smoothstep(midGlowRadius, uMoonSize * 0.5, distFromMoon);
        midGlow = midGlow * midGlow;
        finalColor += uMoonGlowColor * midGlow * 0.25;

        float innerHaloStart = uMoonSize * 1.8;
        float innerHaloEnd = uMoonSize * 0.95;
        float innerHalo = smoothstep(innerHaloStart, innerHaloEnd, distFromMoon);
        innerHalo *= smoothstep(uMoonSize * 0.7, uMoonSize * 0.95, distFromMoon);
        vec3 haloColor = mix(uMoonGlowColor, uMoonColor, 0.5);
        finalColor += haloColor * innerHalo * 0.4;

        if(distFromMoon < uMoonSize) {
            float moonMask = smoothstep(uMoonSize, uMoonSize * 0.85, distFromMoon);

            vec2 moonUv = (direction.xy - moonDir.xy) * 20.0;
            float craters = noise(moonUv * 5.0) * 0.3;

            float discGradient = smoothstep(uMoonSize, 0.0, distFromMoon);
            vec3 moonSurface = uMoonColor * (0.75 + craters + discGradient * 0.15);

            finalColor = mix(finalColor, moonSurface, moonMask);

            float centerHighlight = smoothstep(uMoonSize * 0.4, 0.0, distFromMoon);
            centerHighlight = centerHighlight * centerHighlight;
            finalColor += vec3(1.0, 1.0, 0.98) * centerHighlight * 0.15;
        }

        float starVisibility = smoothstep(-0.3, 0.2, direction.y);

        if(starVisibility > 0.01) {
            vec2 starUv = vec2(atan(direction.z, direction.x) * 0.15915 + 0.5, acos(clamp(direction.y, -1.0, 1.0)) * 0.31831);

            float starField = stars(starUv, uStarDensity);
            finalColor += uStarColor * starField * uStarBrightness * starVisibility;
        }
    }

    float atmosphereGlow = 1.0 - abs(altitude);
    atmosphereGlow = atmosphereGlow * atmosphereGlow * atmosphereGlow;
    finalColor += vec3(0.5, 0.7, 1.0) * (atmosphereGlow * 0.1 * uAtmosphereIntensity);

    float timeVariation = sin(uTime * 0.1) * 0.01;
    finalColor += vec3(timeVariation, timeVariation * 0.5, timeVariation * 0.3);

    gl_FragColor = vec4(finalColor, 1.0);
}
`;
  },
  "src/Shaders/Materials/skydome/vertex.glsl": function(module, exports, require) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = String.raw`varying vec3 vWorldPosition;
varying vec3 vViewDirection;

void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = normalize(worldPosition.xyz);
    vViewDirection = normalize(worldPosition.xyz - cameraPosition);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
  },
  "src/Shaders/Materials/windLines/fragment.glsl": function(module, exports, require) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = String.raw`uniform vec3 uColor;
varying float vAlpha;

void main() {
    gl_FragColor = vec4(uColor, vAlpha);
}
`;
  },
  "src/Shaders/Materials/windLines/vertex.glsl": function(module, exports, require) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = String.raw`attribute float ratio;
uniform float uThickness;
uniform float uProgress;
uniform vec3 uTangent;

varying float vAlpha;

void main() {
    float baseThickness = smoothstep(0.0, 1.0, 1.0 - abs(ratio - 0.5) * 2.0);

    float remapedProgress = uProgress * 3.0 - 1.0;
    float progressThickness = smoothstep(0.0, 1.0, 1.0 - abs(ratio - remapedProgress));

    float finalThickness = uThickness * baseThickness * progressThickness;

    float side = mod(float(gl_VertexID), 2.0) - 0.5;

    vec3 offset = uTangent * side * finalThickness;
    vec3 worldPosition = position + offset;

    vAlpha = baseThickness * progressThickness;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPosition, 1.0);
}
`;
  }
};

const __externals = {
  'three': THREE,
  'three/addons/controls/OrbitControls.js': { OrbitControls },
  'three/addons/loaders/GLTFLoader.js': { GLTFLoader },
  'three/addons/loaders/DRACOLoader.js': { DRACOLoader },
  'three/addons/loaders/HDRLoader.js': { HDRLoader },
  'three/addons/math/MeshSurfaceSampler.js': { MeshSurfaceSampler },
  'three/addons/utils/BufferGeometryUtils.js': BufferGeometryUtils,
  'three/examples/jsm/libs/stats.module.js': { default: Stats },
  'three/src/loaders/AudioLoader.js': { AudioLoader: THREE.AudioLoader },
  'gsap': { default: gsap },
  'lil-gui': { default: EmbeddedGUI },
  'mersennetwister': { default: EmbeddedMersenneTwister },
  'three-perf': { ThreePerf: EmbeddedThreePerf },
};

function __normalizePath(input) {
  const parts = input.split('/');
  const out = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return out.join('/');
}

function __createOriginalRuntime() {
  const cache = {};

  function resolve(fromId, request) {
    if (__externals[request]) return request;
    if (!request.startsWith('.')) return request;

    const slash = fromId.lastIndexOf('/');
    const base = slash >= 0 ? fromId.slice(0, slash + 1) : '';
    const normalized = __normalizePath(base + request);
    const candidates = [
      normalized,
      normalized + '.js',
      normalized + '/index.js',
    ];
    for (const candidate of candidates) {
      if (__moduleFactories[candidate]) return candidate;
    }
    throw new Error(`[Elemental Serenity] Cannot resolve "${request}" from "${fromId}"`);
  }

  function load(id, fromId = 'src/main.js') {
    const resolved = resolve(fromId, id);
    if (__externals[resolved]) return __externals[resolved];
    if (cache[resolved]) return cache[resolved].exports;

    const factory = __moduleFactories[resolved];
    if (!factory) throw new Error(`[Elemental Serenity] Module not found: ${resolved}`);

    const module = { exports: {} };
    cache[resolved] = module;
    const localRequire = (request) => load(request, resolved);
    factory(module, module.exports, localRequire);
    return module.exports;
  }

  return {
    start() {
      return load('src/main.js', 'src/main.js');
    },
    clear() {
      Object.keys(cache).forEach((key) => delete cache[key]);
    },
  };
}

function __runOriginalSettingsScript() {
  
        function buttonVibrate() {
          if (navigator.haptic) {
            navigator.haptic([{ intensity: 0.7, sharpness: 0.1 }]);
          } else if (navigator.vibrate) {
            navigator.vibrate(10);
          }
        }
  
        class SettingsManager {
          constructor() {
            this.hamburgerMenu = document.getElementById('hamburger-menu');
            this.settingsModal = document.getElementById('settings-modal');
            this.modalClose = document.getElementById('modal-close');
            this.tabButtons = document.querySelectorAll('.tab-button');
            this.tabContents = document.querySelectorAll('.tab-content');
            this.volumeSlider = document.getElementById('volume-slider');
            this.volumeValue = document.querySelector('.volume-value');
            this.graphicsQuality = document.getElementById('graphics-quality');
  
            const savedSettings = this.loadSettings();
            this.settings = {
              volume: savedSettings.volume || 50,
              graphicsQuality: savedSettings.graphicsQuality || 'medium',
  
              customGrass: savedSettings.customGrass || 12500,
              customParticles: savedSettings.customParticles || 500,
              customShadows: savedSettings.customShadows || 'PCFShadowMap',
              customPixelRatio: savedSettings.customPixelRatio || 2,
              customAntialias: savedSettings.customAntialias || false,
            };
  
            this.previousVolume = undefined;
  
            this.graphicsQuality.value = this.settings.graphicsQuality;
  
            this.volumeSlider.value = this.settings.volume;
            this.volumeValue.textContent = this.settings.volume + '%';
  
            this.presetDetails = document.getElementById('preset-details');
            this.updatePresetDescription(this.settings.graphicsQuality);
  
            this.initCustomGraphicsControls();
  
            this.init();
          }
  
          init() {
            const controlPanel = document.getElementById('control-panel');
            const observer = new MutationObserver((mutations) => {
              mutations.forEach((mutation) => {
                if (
                  mutation.type === 'attributes' &&
                  mutation.attributeName === 'class'
                ) {
                  if (controlPanel.classList.contains('show')) {
                    this.hamburgerMenu.classList.add('show');
  
                    this.initializeVolumeFromGame();
  
                    this.setupMusicControlListener();
                  }
                }
              });
            });
            observer.observe(controlPanel, { attributes: true });
  
            this.hamburgerMenu.addEventListener('click', () => {
              buttonVibrate();
              this.openModal();
            });
            this.modalClose.addEventListener('click', () => {
              buttonVibrate();
              this.closeModal();
            });
            this.settingsModal.addEventListener('click', (e) => {
              if (e.target === this.settingsModal) this.closeModal();
            });
  
            this.tabButtons.forEach((button) => {
              button.addEventListener('click', () => {
                buttonVibrate();
                this.switchTab(button.dataset.tab);
              });
            });
  
            this.volumeSlider.addEventListener('input', (e) => {
              this.settings.volume = parseInt(e.target.value);
              this.volumeValue.textContent = this.settings.volume + '%';
              this.saveSettings();
              this.updateAudioVolume(this.settings.volume / 100);
            });
  
            this.graphicsQuality.addEventListener('change', (e) => {
              const oldQuality = this.settings.graphicsQuality;
              this.settings.graphicsQuality = e.target.value;
              this.saveSettings();
              this.updatePresetDescription(e.target.value);
              this.toggleCustomOptions(e.target.value === 'custom');
  
              if (e.target.value !== 'custom') {
                this.updateGraphicsQuality(e.target.value);
  
                const qualitySettings = this.getQualitySettings();
                const oldSettings =
                  qualitySettings[oldQuality] || this.getCustomSettings();
                const newSettings = qualitySettings[e.target.value];
  
                if (
                  oldSettings &&
                  newSettings &&
                  oldSettings.antialias !== newSettings.antialias
                ) {
                  this.showReloadBanner();
                }
              } else {
                this.applyCustomSettings();
              }
            });
  
            document.addEventListener('keydown', (e) => {
              if (
                e.key === 'Escape' &&
                this.settingsModal.classList.contains('show')
              ) {
                this.closeModal();
              }
            });
          }
  
          setupMusicControlListener() {
            const musicControlButton = document.getElementById('music-control');
            if (musicControlButton) {
              musicControlButton.addEventListener('click', () => {
                setTimeout(() => {
                  this.syncVolumeWithMusicState();
                }, 100);
              });
            }
          }
  
          syncVolumeWithMusicState() {
            if (window.gameInstance && window.gameInstance.musicControlUI) {
              const isMusicEnabled =
                window.gameInstance.musicControlUI.isMusicEnabled;
  
              if (!isMusicEnabled) {
                if (this.settings.volume > 0) {
                  this.previousVolume = this.settings.volume;
                }
                this.settings.volume = 0;
                this.volumeSlider.value = 0;
                this.volumeValue.textContent = '0%';
              } else {
                const volumeToRestore =
                  this.previousVolume !== undefined ? this.previousVolume : 50;
  
                this.settings.volume = volumeToRestore;
                this.volumeSlider.value = volumeToRestore;
                this.volumeValue.textContent = volumeToRestore + '%';
  
                this.updateAudioVolume(volumeToRestore / 100);
  
                this.saveSettings();
  
                this.previousVolume = undefined;
              }
            }
          }
  
          initializeVolumeFromGame() {
            if (window.gameInstance && window.gameInstance.audioManager) {
              const currentVolume = window.gameInstance.audioManager.masterVolume;
              const volumePercent = Math.round(currentVolume * 100);
  
              if (!window.gameInstance.withMusic) {
                this.previousVolume = 50;
                this.settings.volume = 0;
                this.volumeSlider.value = 0;
                this.volumeValue.textContent = '0%';
              } else {
                const initialVolume = volumePercent > 0 ? volumePercent : 50;
                this.settings.volume = initialVolume;
                this.volumeSlider.value = initialVolume;
                this.volumeValue.textContent = initialVolume + '%';
              }
            }
          }
  
          initializeAntialiasFromGame() {
            if (window.gameInstance && window.gameInstance.renderer) {
              const currentAntialias = window.gameInstance.renderer.antialias;
              this.settings.antialias = currentAntialias;
  
              const antialiasToggle = document.getElementById('antialias-toggle');
              if (antialiasToggle) {
                antialiasToggle.checked = currentAntialias;
              }
            }
          }
  
          openModal() {
            this.settingsModal.classList.add('show');
            document.body.style.overflow = 'hidden';
          }
  
          closeModal() {
            this.settingsModal.classList.remove('show');
            document.body.style.overflow = '';
          }
  
          switchTab(tabName) {
            this.tabButtons.forEach((btn) => {
              btn.classList.toggle('active', btn.dataset.tab === tabName);
            });
  
            this.tabContents.forEach((content) => {
              content.classList.toggle('active', content.id === tabName + '-tab');
            });
          }
  
          updateAudioVolume(volume) {
            if (window.gameInstance && window.gameInstance.audioManager) {
              window.gameInstance.audioManager.setMasterVolume(volume);
            }
          }
  
          updateGraphicsQuality(quality) {
            const settings = this.getQualitySettings();
  
            if (window.gameInstance) {
              const gameSettings = settings[quality];
  
              if (
                window.gameInstance.world &&
                window.gameInstance.world.ground &&
                window.gameInstance.world.ground.grassManager
              ) {
                const grassManager =
                  window.gameInstance.world.ground.grassManager;
                grassManager.GRASS_PER_TILE = gameSettings.grassPerTile;
  
                if (typeof grassManager.regenerateGrass === 'function') {
                  grassManager.regenerateGrass();
                }
              }
  
              if (window.gameInstance.world && window.gameInstance.world.fire) {
                const fire = window.gameInstance.world.fire;
                if (fire.fireEmitterParams) {
                  fire.originalFireEmissionRate = gameSettings.fireEmissionRate;
                  fire.fireEmitterParams.emissionRate =
                    gameSettings.fireEmissionRate;
                }
                if (fire.smokeEmitterParams) {
                  fire.originalSmokeEmissionRate = gameSettings.smokeEmissionRate;
                  fire.smokeEmitterParams.emissionRate =
                    gameSettings.smokeEmissionRate;
                }
                if (fire.amberEmitterParams) {
                  fire.originalAmberEmissionRate = gameSettings.amberEmissionRate;
                  fire.amberEmitterParams.emissionRate =
                    gameSettings.amberEmissionRate;
                }
              }
  
              const graphicsChangeEvent = new CustomEvent(
                'graphicsQualityChanged',
                {
                  detail: { quality, settings: gameSettings },
                }
              );
              window.dispatchEvent(graphicsChangeEvent);
            }
          }
  
          loadSettings() {
            try {
              const saved = localStorage.getItem('gameSettings');
              const settings = saved ? JSON.parse(saved) : {};
              return settings;
            } catch (error) {
              return {};
            }
          }
  
          saveSettings() {
            try {
              localStorage.setItem('gameSettings', JSON.stringify(this.settings));
            } catch (error) {
              console.warn('Failed to save settings to localStorage:', error);
            }
          }
  
          getQualitySettings() {
            return {
              low: {
                grassPerTile: 10000,
                fireEmissionRate: 350,
                smokeEmissionRate: 35,
                amberEmissionRate: 20,
                antialias: false,
                shadowMapType: 'BasicShadowMap',
                pixelRatioCap: 2,
              },
              medium: {
                grassPerTile: 12500,
                fireEmissionRate: 500,
                smokeEmissionRate: 50,
                amberEmissionRate: 30,
                antialias: false,
                shadowMapType: 'PCFShadowMap',
                pixelRatioCap: 2,
              },
              high: {
                grassPerTile: 25000,
                fireEmissionRate: 650,
                smokeEmissionRate: 65,
                amberEmissionRate: 40,
                antialias: true,
                shadowMapType: 'PCFSoftShadowMap',
                pixelRatioCap: 2,
              },
              ultra: {
                grassPerTile: 50000,
                fireEmissionRate: 800,
                smokeEmissionRate: 80,
                amberEmissionRate: 50,
                antialias: true,
                shadowMapType: 'PCFSoftShadowMap',
                pixelRatioCap: 3,
              },
            };
          }
  
          getPresetDescriptions() {
            return {
              low: 'Reduced grass density, basic shadows, lower particle effects. \nBest for older devices or battery saving.',
              medium:
                'Balanced grass density, standard shadows, moderate particle effects. \nGood for most devices.',
              high: 'Dense grass, soft shadows, antialiasing enabled, rich particle effects. \nFor capable hardware.',
              ultra:
                'Super high grass density, highest quality shadows, full antialiasing, denser particles. \nOnly For high-end devices.',
              custom:
                'Fine-tune individual settings below to match your hardware and preferences.',
            };
          }
  
          updatePresetDescription(quality) {
            if (this.presetDetails) {
              const descriptions = this.getPresetDescriptions();
              this.presetDetails.textContent =
                descriptions[quality] || descriptions.medium;
            }
          }
  
          initCustomGraphicsControls() {
            this.customOptionsContainer = document.getElementById(
              'custom-graphics-options'
            );
            this.grassSlider = document.getElementById('grass-density');
            this.grassValue = document.getElementById('grass-density-value');
            this.particleSlider = document.getElementById('particle-density');
            this.particleValue = document.getElementById(
              'particle-density-value'
            );
            this.shadowSelect = document.getElementById('shadow-quality');
            this.shadowValue = document.getElementById('shadow-quality-value');
            this.pixelRatioSlider = document.getElementById('pixel-ratio');
            this.pixelRatioValue = document.getElementById('pixel-ratio-value');
            this.antialiasToggle = document.getElementById('antialias-toggle');
  
            if (this.grassSlider) {
              this.grassSlider.value = this.settings.customGrass;
              this.grassValue.textContent =
                this.settings.customGrass.toLocaleString();
            }
            if (this.particleSlider) {
              this.particleSlider.value = this.settings.customParticles;
              this.particleValue.textContent = this.settings.customParticles;
            }
            if (this.shadowSelect) {
              this.shadowSelect.value = this.settings.customShadows;
              this.updateShadowValueLabel(this.settings.customShadows);
            }
            if (this.pixelRatioSlider) {
              this.pixelRatioSlider.value = this.settings.customPixelRatio;
              this.pixelRatioValue.textContent =
                this.settings.customPixelRatio + 'x';
            }
            if (this.antialiasToggle) {
              this.antialiasToggle.checked = this.settings.customAntialias;
            }
  
            if (this.settings.graphicsQuality === 'custom') {
              this.toggleCustomOptions(true);
            }
  
            this.grassSlider?.addEventListener('input', (e) => {
              const value = parseInt(e.target.value);
              this.settings.customGrass = value;
              this.grassValue.textContent = value.toLocaleString();
              this.saveSettings();
              this.applyCustomSettings();
            });
  
            this.particleSlider?.addEventListener('input', (e) => {
              const value = parseInt(e.target.value);
              this.settings.customParticles = value;
              this.particleValue.textContent = value;
              this.saveSettings();
              this.applyCustomSettings();
            });
  
            this.shadowSelect?.addEventListener('change', (e) => {
              this.settings.customShadows = e.target.value;
              this.updateShadowValueLabel(e.target.value);
              this.saveSettings();
              this.applyCustomSettings();
            });
  
            this.pixelRatioSlider?.addEventListener('input', (e) => {
              const value = parseFloat(e.target.value);
              this.settings.customPixelRatio = value;
              this.pixelRatioValue.textContent = value + 'x';
              this.saveSettings();
              this.applyCustomSettings();
            });
  
            this.antialiasToggle?.addEventListener('change', (e) => {
              const oldAntialias = this.settings.customAntialias;
              this.settings.customAntialias = e.target.checked;
              this.saveSettings();
              this.applyCustomSettings();
  
              if (oldAntialias !== e.target.checked) {
                this.showReloadBanner();
              }
            });
          }
  
          updateShadowValueLabel(value) {
            const labels = {
              BasicShadowMap: 'Basic',
              PCFShadowMap: 'Standard',
              PCFSoftShadowMap: 'Soft',
            };
            if (this.shadowValue) {
              this.shadowValue.textContent = labels[value] || 'Standard';
            }
          }
  
          toggleCustomOptions(show) {
            if (this.customOptionsContainer) {
              this.customOptionsContainer.classList.toggle('show', show);
            }
          }
  
          getCustomSettings() {
            return {
              grassPerTile: this.settings.customGrass,
              fireEmissionRate: this.settings.customParticles,
              smokeEmissionRate: Math.round(this.settings.customParticles * 0.1),
              amberEmissionRate: Math.round(this.settings.customParticles * 0.06),
              antialias: this.settings.customAntialias,
              shadowMapType: this.settings.customShadows,
              pixelRatioCap: this.settings.customPixelRatio,
            };
          }
  
          applyCustomSettings() {
            if (this.settings.graphicsQuality !== 'custom') return;
  
            const customSettings = this.getCustomSettings();
  
            if (window.gameInstance) {
              if (
                window.gameInstance.world &&
                window.gameInstance.world.ground &&
                window.gameInstance.world.ground.grassManager
              ) {
                const grassManager =
                  window.gameInstance.world.ground.grassManager;
                grassManager.GRASS_PER_TILE = customSettings.grassPerTile;
                if (typeof grassManager.regenerateGrass === 'function') {
                  grassManager.regenerateGrass();
                }
              }
  
              if (window.gameInstance.world && window.gameInstance.world.fire) {
                const fire = window.gameInstance.world.fire;
                if (fire.fireEmitterParams) {
                  fire.originalFireEmissionRate = customSettings.fireEmissionRate;
                  fire.fireEmitterParams.emissionRate =
                    customSettings.fireEmissionRate;
                }
                if (fire.smokeEmitterParams) {
                  fire.originalSmokeEmissionRate =
                    customSettings.smokeEmissionRate;
                  fire.smokeEmitterParams.emissionRate =
                    customSettings.smokeEmissionRate;
                }
                if (fire.amberEmitterParams) {
                  fire.originalAmberEmissionRate =
                    customSettings.amberEmissionRate;
                  fire.amberEmitterParams.emissionRate =
                    customSettings.amberEmissionRate;
                }
              }
  
              const graphicsChangeEvent = new CustomEvent(
                'graphicsQualityChanged',
                {
                  detail: { quality: 'custom', settings: customSettings },
                }
              );
              window.dispatchEvent(graphicsChangeEvent);
            }
          }
  
          showReloadBanner() {
            const existingBanner = document.getElementById('reload-banner');
            if (existingBanner) {
              existingBanner.remove();
            }
  
            const banner = document.createElement('div');
            banner.id = 'reload-banner';
            banner.innerHTML = `
              <div class="reload-banner-content">
                <div class="reload-banner-icon">
                  <i class="fas fa-cog"></i>
                </div>
                <div class="reload-banner-body">
                  <div class="reload-banner-title">Graphics Settings Changed</div>
                  <p class="reload-banner-text">
                    Switching between Low/Medium and High/Ultra requires a page reload to apply changes.
                  </p>
                  <div class="reload-banner-actions">
                    <button id="reload-now-btn" class="reload-btn reload-btn-primary">
                      <i class="fas fa-redo-alt"></i>
                      Reload Now
                    </button>
                    <button id="dismiss-banner-btn" class="reload-btn reload-btn-secondary">
                      Later
                    </button>
                  </div>
                </div>
                <button class="reload-banner-close" id="banner-close-btn">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            `;
  
            if (!document.getElementById('reload-banner-styles')) {
              const styles = document.createElement('style');
              styles.id = 'reload-banner-styles';
              styles.textContent = `
                #reload-banner {
                  position: fixed;
                  top: 24px;
                  right: 24px;
                  z-index: 10000;
                  animation: bannerSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
  
                @keyframes bannerSlideIn {
                  from {
                    transform: translateX(120%) scale(0.9);
                    opacity: 0;
                  }
                  to {
                    transform: translateX(0) scale(1);
                    opacity: 1;
                  }
                }
  
                @keyframes bannerSlideOut {
                  from {
                    transform: translateX(0) scale(1);
                    opacity: 1;
                  }
                  to {
                    transform: translateX(120%) scale(0.9);
                    opacity: 0;
                  }
                }
  
                #reload-banner.hiding {
                  animation: bannerSlideOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                }
  
                .reload-banner-content {
                  display: flex;
                  gap: 16px;
                  background: linear-gradient(145deg, #f5f0ec, #ede8e4);
                  padding: 18px 20px;
                  border-radius: 16px;
                  border: 1px solid rgba(0, 0, 0, 0.06);
                  box-shadow:
                    0 12px 40px rgba(0, 0, 0, 0.12),
                    0 4px 12px rgba(0, 0, 0, 0.08),
                    inset 0 1px 0 rgba(255, 255, 255, 0.8);
                  max-width: 340px;
                  font-family: 'Inter', sans-serif;
                  position: relative;
                }
  
                .reload-banner-icon {
                  width: 42px;
                  height: 42px;
                  border-radius: 12px;
                  background: linear-gradient(145deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.04));
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  flex-shrink: 0;
                }
  
                .reload-banner-icon i {
                  font-size: 1.1rem;
                  color: rgba(0, 0, 0, 0.7);
                  animation: iconSpin 3s linear infinite;
                }
  
                @keyframes iconSpin {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
  
                .reload-banner-body {
                  flex: 1;
                  min-width: 0;
                }
  
                .reload-banner-title {
                  font-weight: 600;
                  font-size: 0.92rem;
                  color: #000;
                  margin-bottom: 6px;
                  letter-spacing: 0.2px;
                }
  
                .reload-banner-text {
                  margin: 0 0 14px 0;
                  font-size: 0.82rem;
                  color: rgba(0, 0, 0, 0.6);
                  line-height: 1.5;
                }
  
                .reload-banner-actions {
                  display: flex;
                  gap: 10px;
                }
  
                .reload-btn {
                  padding: 9px 16px;
                  border-radius: 10px;
                  font-family: 'Inter', sans-serif;
                  font-size: 0.82rem;
                  font-weight: 500;
                  cursor: pointer;
                  display: flex;
                  align-items: center;
                  gap: 6px;
                  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                  border: 1.5px solid;
                }
  
                .reload-btn-primary {
                  background: linear-gradient(145deg, #1a1a1a, #000);
                  border-color: #000;
                  color: #ede8e4;
                  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                }
  
                .reload-btn-primary:hover {
                  background: linear-gradient(145deg, #333, #1a1a1a);
                  transform: translateY(-2px);
                  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
                }
  
                .reload-btn-primary:active {
                  transform: translateY(0);
                }
  
                .reload-btn-primary i {
                  font-size: 0.75rem;
                }
  
                .reload-btn-secondary {
                  background: transparent;
                  border-color: rgba(0, 0, 0, 0.15);
                  color: rgba(0, 0, 0, 0.7);
                }
  
                .reload-btn-secondary:hover {
                  background: rgba(0, 0, 0, 0.05);
                  border-color: rgba(0, 0, 0, 0.25);
                  color: #000;
                }
  
                .reload-banner-close {
                  position: absolute;
                  top: 10px;
                  right: 10px;
                  width: 28px;
                  height: 28px;
                  border-radius: 50%;
                  border: none;
                  background: transparent;
                  color: rgba(0, 0, 0, 0.4);
                  cursor: pointer;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 0.8rem;
                  transition: all 0.2s ease;
                }
  
                .reload-banner-close:hover {
                  background: rgba(0, 0, 0, 0.08);
                  color: rgba(0, 0, 0, 0.7);
                }
  
                @media (max-width: 480px) {
                  #reload-banner {
                    top: 12px;
                    right: 12px;
                    left: 12px;
                  }
  
                  .reload-banner-content {
                    max-width: none;
                    padding: 16px;
                    gap: 12px;
                  }
  
                  .reload-banner-icon {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                  }
  
                  .reload-banner-icon i {
                    font-size: 1rem;
                  }
  
                  .reload-banner-title {
                    font-size: 0.88rem;
                    padding-right: 24px;
                  }
  
                  .reload-banner-text {
                    font-size: 0.78rem;
                  }
  
                  .reload-btn {
                    padding: 8px 14px;
                    font-size: 0.78rem;
                  }
                }
              `;
              document.head.appendChild(styles);
            }
  
            document.body.appendChild(banner);
  
            const dismissBanner = () => {
              banner.classList.add('hiding');
              setTimeout(() => banner.remove(), 300);
            };
  
            document
              .getElementById('reload-now-btn')
              .addEventListener('click', () => {
                window.location.reload();
              });
  
            document
              .getElementById('dismiss-banner-btn')
              .addEventListener('click', dismissBanner);
  
            document
              .getElementById('banner-close-btn')
              .addEventListener('click', dismissBanner);
  
            setTimeout(() => {
              if (document.getElementById('reload-banner')) {
                dismissBanner();
              }
            }, 10000);
          }
        }
  
        (() => {
          window.settingsManager = new SettingsManager();
  
          const savedQuality = window.settingsManager.settings.graphicsQuality;
          const qualitySettings = window.settingsManager.getQualitySettings();
          const currentSettings = qualitySettings[savedQuality];
  
          if (currentSettings) {
            localStorage.setItem(
              'graphicsAntialias',
              currentSettings.antialias.toString()
            );
            localStorage.setItem(
              'graphicsShadowMapType',
              currentSettings.shadowMapType
            );
            localStorage.setItem(
              'graphicsPixelRatioCap',
              currentSettings.pixelRatioCap.toString()
            );
          }
  
          setTimeout(() => {
            if (window.settingsManager) {
              const currentQuality =
                window.settingsManager.settings.graphicsQuality;
              window.settingsManager.updateGraphicsQuality(currentQuality);
            }
          }, 1000);
        })();
      
}

export default function ElementalSerenity() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // Hide the tool station's top breadcrumb navigation on this immersive full-screen page.
    // We only target semantic/common breadcrumb containers and restore them on unmount.
    const breadcrumbSelectors = [
      'nav[aria-label="breadcrumb"]',
      'nav[aria-label="Breadcrumb"]',
      '[data-slot="breadcrumb"]',
      '[data-breadcrumb]',
      '.breadcrumb',
      '.breadcrumbs',
    ];

    const hiddenBreadcrumbs = Array.from(
      document.querySelectorAll<HTMLElement>(breadcrumbSelectors.join(','))
    ).map((el) => ({
      el,
      display: el.style.display,
      visibility: el.style.visibility,
    }));

    hiddenBreadcrumbs.forEach(({ el }) => {
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('visibility', 'hidden', 'important');
    });

    // Preserve the original CSS globally because the source uses document/body/fixed UI selectors.
    const style = document.createElement('style');
    style.setAttribute('data-elemental-serenity-original', 'true');
    style.textContent = ORIGINAL_CSS;
    document.head.appendChild(style);

    // The original index loads Font Awesome 7 in addition to the CSS @import in the style block.
    const iconLink = document.createElement('link');
    iconLink.rel = 'stylesheet';
    iconLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/css/all.min.css';
    iconLink.integrity = 'sha512-2SwdPD6INVrV/lHTZbO2nodKhrnDdJK9/kg2XD1r9uGqPo1cUbujc+IYdlYdEErWNu69gVcYgdxlmVmzTWnetw==';
    iconLink.crossOrigin = 'anonymous';
    iconLink.referrerPolicy = 'no-referrer';
    document.head.appendChild(iconLink);

    host.innerHTML = ORIGINAL_BODY_HTML;

    const runtime = __createOriginalRuntime();

    try {
      // Match the repository lifecycle: source module first, then DOM-ready settings initialization.
      runtime.start();
      __runOriginalSettingsScript();
    } catch (error) {
      console.error('[Elemental Serenity] startup failed', error);
      const loaderText = document.getElementById('loader-text');
      if (loaderText) {
        loaderText.textContent = 'Elemental Serenity failed to start. Check console and public asset paths.';
      }
    }

    return () => {
      try {
        if (window.gameInstance && typeof window.gameInstance.destroy === 'function') {
          window.gameInstance.destroy();
        }
      } catch (error) {
        console.warn('[Elemental Serenity] cleanup warning', error);
      }

      try {
        if (window.settingsManager) window.settingsManager = null;
        if (window.gameInstance) window.gameInstance = null;
      } catch {}

      runtime.clear();
      host.innerHTML = '';
      style.remove();
      iconLink.remove();

      hiddenBreadcrumbs.forEach(({ el, display, visibility }) => {
        el.style.display = display;
        el.style.visibility = visibility;
      });
    };
  }, []);

  // Tailwind is only used for the host shell; all visual styling inside is the original project CSS.
  return (
    <div
      ref={hostRef}
      className="fixed inset-0 z-[2147483000] overflow-hidden bg-[#ede8e4]"
      data-elemental-serenity-root
    />
  );
}
