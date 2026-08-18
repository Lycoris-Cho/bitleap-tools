export interface ButtonPreset {
  id: string
  name: string
  category: string
  description: string
  previewClass: string
  html: string
  css: string
}

export const buttonPresets: ButtonPreset[] = [
  // === 填充动效 ===
  {
    id: 'slide-fill',
    name: 'Slide Fill',
    category: '填充',
    description: 'hover 时背景色从左侧滑入',
    previewClass: 'btn-slide-fill',
    html: `<button class="btn-slide-fill">Hover Me</button>`,
    css: `.btn-slide-fill {
    position: relative;
    padding: 0.75rem 2rem;
    font-size: 1rem;
    font-weight: 600;
    color: #374151;
    background: transparent;
    border: 2px solid #111827;
    border-radius: 0.75rem;
    cursor: pointer;
    overflow: hidden;
    transition: color 0.3s ease;
  }
  .btn-slide-fill::before {
    content: '';
    position: absolute;
    inset: 0;
    background: #111827;
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.3s ease;
    z-index: -1;
  }
  .btn-slide-fill:hover {
    color: #fff;
  }
  .btn-slide-fill:hover::before {
    transform: scaleX(1);
  }`,
  },
  {
    id: 'sweep-fill',
    name: 'Sweep Fill',
    category: '填充',
    description: '背景从下往上扫过',
    previewClass: 'btn-sweep-fill',
    html: `<button class="btn-sweep-fill">Hover Me</button>`,
    css: `.btn-sweep-fill {
    position: relative;
    padding: 0.75rem 2rem;
    font-size: 1rem;
    font-weight: 600;
    color: #374151;
    background: transparent;
    border: 2px solid #8b5cf6;
    border-radius: 0.75rem;
    cursor: pointer;
    overflow: hidden;
    transition: color 0.3s ease;
  }
  .btn-sweep-fill::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, #8b5cf6, #ec4899);
    transform: translateY(100%);
    transition: transform 0.3s ease;
    z-index: -1;
  }
  .btn-sweep-fill:hover {
    color: #fff;
    border-color: transparent;
  }
  .btn-sweep-fill:hover::before {
    transform: translateY(0);
  }`,
  },
  {
    id: 'round-fill',
    name: 'Round Fill',
    category: '填充',
    description: '圆形扩散填充（伪元素 scale）',
    previewClass: 'btn-round-fill',
    html: `<button class="btn-round-fill">Hover Me</button>`,
    css: `.btn-round-fill {
    position: relative;
    padding: 0.75rem 2rem;
    font-size: 1rem;
    font-weight: 600;
    color: #059669;
    background: transparent;
    border: 2px solid #059669;
    border-radius: 9999px;
    cursor: pointer;
    overflow: hidden;
    transition: color 0.4s ease;
  }
  .btn-round-fill::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    background: #059669;
    border-radius: 50%;
    transform: translate(-50%, -50%) scale(0);
    transition: transform 0.4s ease;
    z-index: -1;
  }
  .btn-round-fill:hover {
    color: blue;
  }
  .btn-round-fill:hover::before {
    transform: translate(-50%, -50%) scale(2.5);
  }`,
  },

  // === 边框动效 ===
  {
    id: 'border-draw',
    name: 'Border Draw',
    category: '边框',
    description: 'hover 时边框像画画一样描出来',
    previewClass: 'btn-border-draw',
    html: `<button class="btn-border-draw">Hover Me</button>`,
    css: `.btn-border-draw {
    padding: 0.75rem 2rem;
    font-size: 1rem;
    font-weight: 600;
    color: #111827;
    background: transparent;
    border: 2px solid transparent;
    border-radius: 0.75rem;
    cursor: pointer;
    position: relative;
  }
  .btn-border-draw::before,
  .btn-border-draw::after {
    content: '';
    position: absolute;
    width: 0;
    height: 0;
    border: 2px solid transparent;
    box-sizing: border-box;
  }
  .btn-border-draw::before {
    top: 0; left: 0;
    border-top-color: #111827;
    border-right-color: #111827;
    transition: width 0.2s ease, height 0.2s ease 0.2s;
  }
  .btn-border-draw::after {
    bottom: 0; right: 0;
    border-bottom-color: #111827;
    border-left-color: #111827;
    transition: width 0.2s ease 0.4s, height 0.2s ease 0.6s;
  }
  .btn-border-draw:hover::before,
  .btn-border-draw:hover::after {
    width: 100%;
    height: 100%;
  }`,
  },
  {
    id: 'gradient-border',
    name: 'Gradient Border',
    category: '边框',
    description: '渐变边框旋转流动',
    previewClass: 'btn-gradient-border',
    html: `<button class="btn-gradient-border">Hover Me</button>`,
    css: `.btn-gradient-border {
    padding: 0.75rem 2rem;
    font-size: 1rem;
    font-weight: 600;
    color: #111827;
    background: #fff;
    border: 2px solid transparent;
    border-radius: 0.75rem;
    cursor: pointer;
    position: relative;
    background-clip: padding-box;
  }
  .btn-gradient-border::before {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: 0.85rem;
    background: linear-gradient(90deg, #f59e0b, #ec4899, #8b5cf6, #3b82f6);
    background-size: 300% 100%;
    z-index: -1;
    animation: gradient-shift 4s ease infinite;
  }
  @keyframes gradient-shift {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }`,
  },

  // === 位移 ===
  {
    id: 'lift-up',
    name: 'Lift Up',
    category: '位移',
    description: '上浮 + 阴影加深',
    previewClass: 'btn-lift-up',
    html: `<button class="btn-lift-up">Hover Me</button>`,
    css: `.btn-lift-up {
    padding: 0.75rem 2rem;
    font-size: 1rem;
    font-weight: 600;
    color: #fff;
    background: #111827;
    border: none;
    border-radius: 0.75rem;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  .btn-lift-up:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 25px rgba(0,0,0,0.15);
  }`,
  },
  {
    id: 'tilt-3d',
    name: 'Tilt 3D',
    category: '位移',
    description: '3D 倾斜效果',
    previewClass: 'btn-tilt-3d',
    html: `<button class="btn-tilt-3d">Hover Me</button>`,
    css: `.btn-tilt-3d {
    padding: 0.75rem 2rem;
    font-size: 1rem;
    font-weight: 600;
    color: #fff;
    background: linear-gradient(135deg, #6366f1, #a855f7);
    border: none;
    border-radius: 0.75rem;
    cursor: pointer;
    transition: transform 0.3s ease;
    transform-style: preserve-3d;
    perspective: 1000px;
  }
  .btn-tilt-3d:hover {
    transform: rotateX(8deg) rotateY(-8deg) scale(1.02);
  }`,
  },

  // === 点击反馈 ===
  {
    id: 'ripple',
    name: 'Ripple',
    category: '点击',
    description: '水波纹扩散（JS 辅助）',
    previewClass: 'btn-ripple',
    html: `<button class="btn-ripple">Click Me</button>`,
    css: `.btn-ripple {
    position: relative;
    padding: 0.75rem 2rem;
    font-size: 1rem;
    font-weight: 600;
    color: #fff;
    background: #2563eb;
    border: none;
    border-radius: 0.75rem;
    cursor: pointer;
    overflow: hidden;
  }
  .btn-ripple .ripple {
    position: absolute;
    border-radius: 50%;
    background: rgba(255,255,255,0.4);
    transform: scale(0);
    animation: ripple-effect 0.6s linear;
    pointer-events: none;
  }
  @keyframes ripple-effect {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }`,
  },
  {
    id: 'press-squash',
    name: 'Press Squash',
    category: '点击',
    description: '按下时压扁',
    previewClass: 'btn-press-squash',
    html: `<button class="btn-press-squash">Press Me</button>`,
    css: `.btn-press-squash {
    padding: 0.75rem 2rem;
    font-size: 1rem;
    font-weight: 600;
    color: #fff;
    background: #ec4899;
    border: none;
    border-radius: 0.75rem;
    cursor: pointer;
    transition: transform 0.1s ease;
  }
  .btn-press-squash:active {
    transform: scaleX(0.95) scaleY(0.9);
  }`,
  },

  // === 发光 ===
  {
    id: 'neon-glow',
    name: 'Neon Glow',
    category: '发光',
    description: '霓虹光晕（多层 box-shadow）',
    previewClass: 'btn-neon-glow',
    html: `<button class="btn-neon-glow">Glow</button>`,
    css: `.btn-neon-glow {
    padding: 0.75rem 2rem;
    font-size: 1rem;
    font-weight: 600;
    color: #a855f7;
    background: #111827;
    border: 2px solid #a855f7;
    border-radius: 0.75rem;
    cursor: pointer;
    transition: box-shadow 0.3s ease, text-shadow 0.3s ease;
  }
  .btn-neon-glow:hover {
    box-shadow:
      0 0 5px #a855f7,
      0 0 20px #a855f7,
      0 0 40px #a855f7;
    text-shadow: 0 0 8px #a855f7;
  }`,
  },
  {
    id: 'pulse-ring',
    name: 'Pulse Ring',
    category: '发光',
    description: '外圈脉冲扩散',
    previewClass: 'btn-pulse-ring',
    html: `<button class="btn-pulse-ring">Pulse</button>`,
    css: `.btn-pulse-ring {
    padding: 0.75rem 2rem;
    font-size: 1rem;
    font-weight: 600;
    color: #fff;
    background: #10b981;
    border: none;
    border-radius: 9999px;
    cursor: pointer;
    position: relative;
  }
  .btn-pulse-ring::after {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 9999px;
    border: 2px solid #10b981;
    animation: pulse-ring 1.5s ease-out infinite;
  }
  @keyframes pulse-ring {
    0% { transform: scale(1); opacity: 0.8; }
    100% { transform: scale(1.3); opacity: 0; }
  }`,
  },

  // === 磁性 ===
  {
    id: 'magnetic',
    name: 'Magnetic',
    category: '磁性',
    description: '鼠标靠近时按钮朝鼠标方向偏移（JS 辅助）',
    previewClass: 'btn-magnetic',
    html: `<button class="btn-magnetic">Magnetic</button>`,
    css: `.btn-magnetic {
    padding: 0.75rem 2rem;
    font-size: 1rem;
    font-weight: 600;
    color: #111827;
    background: #f3f4f6;
    border: 2px solid #111827;
    border-radius: 0.75rem;
    cursor: pointer;
    transition: transform 0.15s ease-out;
  }`,
  },

  {
    id: 'border-shrink',
    name: 'Border Shrink',
    category: '边框',
    description: '初始全边框，hover 边框向内收缩消失',
    previewClass: 'btn-border-shrink',
    html: `<button class="btn-border-shrink">Hover Me</button>`,
    css: `.btn-border-shrink {
        padding: 0.75rem 2rem;
        font-size: 1rem;
        font-weight: 600;
        color: #111827;
        background: transparent;
        border: 2px solid #111827;
        border-radius: 0.75rem;
        cursor: pointer;
        position: relative;
      }
      .btn-border-shrink::before {
        content: '';
        position: absolute;
        inset: 0;
        border: 2px solid #111827;
        border-radius: 0.75rem;
        transition: inset 0.3s ease, opacity 0.3s ease;
      }
      .btn-border-shrink:hover::before {
        inset: 6px;
        opacity: 0;
      }`,
  },
  {
    id: 'elastic-pop',
    name: 'Elastic Pop',
    category: '位移',
    description: 'hover 弹性弹簧放大，带回弹过冲效果',
    previewClass: 'btn-elastic-pop',
    html: `<button class="btn-elastic-pop">Hover Me</button>`,
    css: `.btn-elastic-pop {
        padding: 0.75rem 2rem;
        font-size: 1rem;
        font-weight: 600;
        color: #fff;
        background: #0891b2;
        border: none;
        border-radius: 0.75rem;
        cursor: pointer;
        transition: transform 0.4s cubic‑bezier(0.68, -0.55, 0.27, 1.55);
      }
      .btn-elastic-pop:hover {
        transform: scale(1.08);
      }`,
  },
  {
    id: 'shake-tremble',
    name: 'Shake Tremble',
    category: '位移',
    description: 'hover 轻微抖动震动效果',
    previewClass: 'btn-shake-tremble',
    html: `<button class="btn-shake-tremble">Hover Me</button>`,
    css: `.btn-shake-tremble {
        padding: 0.75rem 2rem;
        font-size: 1rem;
        font-weight: 600;
        color: #fff;
        background: #dc2626;
        border: none;
        border-radius: 0.75rem;
        cursor: pointer;
      }
      .btn-shake-tremble:hover {
        animation: shake 0.4s ease-in-out;
      }
      @keyframes shake {
        0%,100%{transform: translateX(0);}
        20%{transform: translateX(-4px);}
        40%{transform: translateX(4px);}
        60%{transform: translateX(-3px);}
        80%{transform: translateX(3px);}
      }`,
  },
  {
    id: '3d-push',
    name: '3D Push',
    category: '点击',
    description: '3D立体按压，模拟实体按钮下陷',
    previewClass: 'btn-3d-push',
    html: `<button class="btn-3d-push">Press Me</button>`,
    css: `.btn-3d-push {
        padding: 0.75rem 2rem;
        font-size: 1rem;
        font-weight: 600;
        color: #fff;
        background: #059669;
        border: none;
        border-radius: 0.75rem;
        cursor: pointer;
        box-shadow: 0 6px 0 #047857;
        transition: all 0.12s ease;
      }
      .btn-3d-push:active {
        transform: translateY(4px);
        box-shadow: 0 2px 0 #047857;
      }`,
  },
  {
    id: 'flash-blink',
    name: 'Flash Blink',
    category: '点击',
    description: '点击瞬间白色闪烁闪屏反馈',
    previewClass: 'btn-flash-blink',
    html: `<button class="btn-flash-blink">Click Me</button>`,
    css: `.btn-flash-blink {
        position: relative;
        padding: 0.75rem 2rem;
        font-size: 1rem;
        font-weight: 600;
        color: #fff;
        background: #4338ca;
        border: none;
        border-radius: 0.75rem;
        cursor: pointer;
        overflow:hidden;
      }
      .btn-flash-blink:active::after {
        content:"";
        position:absolute;
        inset:0;
        background:rgba(255,255,255,0.4);
        animation: flash 0.3s forwards;
      }
      @keyframes flash {
        0%{opacity:1;}
        100%{opacity:0;}
      }`,
  },
  {
    id: 'underline-slide',
    name: 'Underline Slide',
    category: '填充',
    description: '文字下方横线从左滑到右，文字按钮风格',
    previewClass: 'btn-underline-slide',
    html: `<button class="btn-underline-slide">Hover Me</button>`,
    css: `.btn-underline-slide {
        padding: 0.5rem 0;
        font-size: 1rem;
        font-weight: 600;
        color: #111827;
        background: transparent;
        border: none;
        cursor: pointer;
        position:relative;
      }
      .btn-underline-slide::after {
        content:"";
        position:absolute;
        left:0;
        bottom:0;
        width:0;
        height:2px;
        background:#8b5cf6;
        transition: width 0.3s ease;
      }
      .btn-underline-slide:hover::after {
        width:100%;
      }`,
  },
  {
    id: 'cut-reveal',
    name: 'Cut Reveal',
    category: '填充',
    description: '斜向剪切遮罩划入填充',
    previewClass: 'btn-cut-reveal',
    html: `<button class="btn-cut-reveal">Hover Me</button>`,
    css: `.btn-cut-reveal {
        position: relative;
        padding: 0.75rem 2rem;
        font-size: 1rem;
        font-weight: 600;
        color:#111827;
        background:transparent;
        border:2px solid #db2777;
        border-radius:0.75rem;
        cursor:pointer;
        overflow:hidden;
        transition:color 0.3s;
      }
      .btn-cut-reveal::before {
        content:"";
        height:130%;
        width:130%;
        position:absolute;
        inset:0;
        background:#db2777;
        transform: skewX(-20deg) translateX(-110%);
        transition:transform 0.35s ease;
        z-index:-1;
      }
      .btn-cut-reveal:hover {
        color:white;
      }
      .btn-cut-reveal:hover::before {
        transform: skewX(-0deg) translateX(0);
      }`,
  },
  {
    id: 'glow-pulse',
    name: 'Glow Pulse',
    category: '发光',
    description: '持续呼吸脉冲光晕，不需要hover',
    previewClass: 'btn-glow-pulse',
    html: `<button class="btn-glow-pulse">Pulse Glow</button>`,
    css: `.btn-glow-pulse {
        padding: 0.75rem 2rem;
        font-size: 1rem;
        font-weight: 600;
        color: #fff;
        background: #7c3aed;
        border: none;
        border-radius: 0.75rem;
        cursor: pointer;
        animation: glow-breath 2.2s ease-in-out infinite;
      }
      @keyframes glow-breath {
        0%,100% { box-shadow:0 0 8px #7c3aed; }
        50% { box-shadow:0 0 22px #7c3aed,0 0 40px #7c3aed; }
      }`,
  },
  {
    id: 'smoke-fade',
    name: 'Smoke Fade',
    category: '发光',
    description: 'hover 向外多层烟雾弥散淡光',
    previewClass: 'btn-smoke-fade',
    html: `<button class="btn-smoke-fade">Smoke</button>`,
    css: `.btn-smoke-fade {
        padding: 0.75rem 2rem;
        font-size: 1rem;
        font-weight: 600;
        color: #f97316;
        background: #111827;
        border:2px solid #f97316;
        border-radius:0.75rem;
        cursor:pointer;
        transition: box-shadow 0.4s ease;
      }
      .btn-smoke-fade:hover {
        box-shadow:
          0 0 4px #f97316,
          0 0 12px #f97316,
          0 0 30px rgba(249,115,22,0.4),
          0 0 60px rgba(249,115,22,0.2);
      }`,
  },
  // ==========【新增效果结束】==========
  {
    id: 'click-scale-bounce',
    name: 'Click Scale Bounce',
    category: '点击',
    description: '点击弹性缩放回弹，带回弹过冲',
    previewClass: 'btn-click-scale-bounce',
    html: `<button class="btn-click-scale-bounce">Click Me</button>`,
    css: `.btn-click-scale-bounce {
  padding: 0.75rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  background: #2563eb;
  border: none;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: transform 0.25s cubic‑bezier(0.68,‑0.55,0.27,1.55);
}
.btn-click-scale-bounce:active {
  transform: scale(0.92);
}`,
  },
  {
    id: 'click-offset-shadow',
    name: 'Click Offset Shadow',
    category: '点击',
    description: '点击时阴影偏移，模拟按下下沉',
    previewClass: 'btn-click-offset-shadow',
    html: `<button class="btn-click-offset-shadow">Click Me</button>`,
    css: `.btn-click-offset-shadow {
  padding: 0.75rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  background: #f3f4f6;
  border: 2px solid #111827;
  border-radius: 0.75rem;
  cursor: pointer;
  box-shadow: 4px 4px 0 #111827;
  transition: all 0.12s ease;
}
.btn-click-offset-shadow:active {
  transform: translate(2px,2px);
  box-shadow: 2px 2px 0 #111827;
}`,
  },
  {
    id: 'click-inner-flash',
    name: 'Inner Flash',
    category: '点击',
    description: '点击内部颜色瞬间变暗反馈',
    previewClass: 'btn-click-inner-flash',
    html: `<button class="btn-click-inner-flash">Click Me</button>`,
    css: `.btn-click-inner-flash {
  padding: 0.75rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  background: #10b981;
  border: none;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: background-color 0.1s ease;
}
.btn-click-inner-flash:active {
  background-color: #059669;
}`,
  },
  {
    id: 'click-corner-fill',
    name: 'Corner Fill',
    category: '点击',
    description: '点击从两个角向中间填充颜色',
    previewClass: 'btn-click-corner-fill',
    html: `<button class="btn-click-corner-fill">Click Me</button>`,
    css: `.btn-click-corner-fill {
  position: relative;
  padding: 0.75rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  color: #8b5cf6;
  background: transparent;
  border: 2px solid #8b5cf6;
  border-radius: 0.75rem;
  cursor: pointer;
  overflow: hidden;
}
.btn-click-corner-fill::before,
.btn-click-corner-fill::after {
  content:"";
  position:absolute;
  width:53%;
  height:100%;
  background:#8b5cf6;
  z-index:-1;
  transition: transform 0.22s ease;
}
.btn-click-corner-fill::before {
  top:0;
  left:0;
  transform: translateX(-100%);
}
.btn-click-corner-fill::after {
  top:0;
  right:0;
  transform: translateX(100%);
}
.btn-click-corner-fill:active {
  color:#fff;
}
.btn-click-corner-fill:active::before {
  transform: translateX(0);
}
.btn-click-corner-fill:active::after {
  transform: translateX(0);
}`,
  },
  {
    id: 'click-ring-expand',
    name: 'Ring Expand',
    category: '点击',
    description: '点击向外扩散一圈圆环，松开消失',
    previewClass: 'btn-click-ring-expand',
    html: `<button class="btn-click-ring-expand">Click Me</button>`,
    css: `.btn-click-ring-expand {
  position: relative;
  padding: 0.75rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  background: #db2777;
  border: none;
  border-radius: 0.75rem;
  cursor: pointer;
}
.btn-click-ring-expand::after {
  content:"";
  position:absolute;
  inset:-6px;
  border-radius:0.85rem;
  border:2px solid #db2777;
  opacity:0;
}
.btn-click-ring-expand:active::after {
  animation: ring-expand 0.4s ease-out;
}
@keyframes ring-expand {
  0% { transform: scale(1); opacity:1; }
  100% { transform: scale(1.25); opacity:0; }
}`,
  },
  {
    id: 'click-skew-tap',
    name: 'Skew Tap',
    category: '点击',
    description: '点击轻微斜切变形，模拟物理按压',
    previewClass: 'btn-click-skew-tap',
    html: `<button class="btn-click-skew-tap">Click Me</button>`,
    css: `.btn-click-skew-tap {
  padding: 0.75rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  background: #f97316;
  border: none;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: transform 0.15s ease;
}
.btn-click-skew-tap:active {
  transform: skewX(-4deg) scale(0.96);
}`,
  },

]