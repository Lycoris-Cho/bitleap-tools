export interface ButtonPreset {
  id: string
  name: string
  category: string
  description: string
  previewClass: string
  html: string
  css: string
  interaction?: 'hover' | 'click' | 'magnetic'
}

export const buttonPresets: ButtonPreset[] = [
  {
    id: 'slide-fill',
    name: 'Slide Fill',
    category: '填充',
    description: '经典横向填充，干净、稳定，适合主按钮',
    previewClass: 'btn-slide-fill',
    html: `<button class="btn-slide-fill"><span>Hover Me</span></button>`,
    interaction: 'hover',
    css: `.btn-slide-fill{
  isolation:isolate;position:relative;overflow:hidden;
  padding:.78rem 1.9rem;border:1px solid #18181b;border-radius:9999px;
  background:#fff;color:#18181b;font-size:.95rem;font-weight:650;cursor:pointer;
  transition:color .35s ease,transform .25s ease,border-color .35s ease
}
.btn-slide-fill::before{
  content:"";position:absolute;inset:0;z-index:-1;background:#18181b;
  transform:scaleX(0);transform-origin:left center;
  transition:transform .38s cubic-bezier(.22,1,.36,1)
}
.btn-slide-fill:hover{color:#fff;transform:translateY(-1px)}
.btn-slide-fill:hover::before{transform:scaleX(1)}
.btn-slide-fill span{position:relative;z-index:1}`,
  },
  {
    id: 'sweep-fill',
    name: 'Gradient Sweep',
    category: '填充',
    description: '柔和渐变由下向上扫入，比原版更轻盈',
    previewClass: 'btn-sweep-fill',
    html: `<button class="btn-sweep-fill"><span>Hover Me</span></button>`,
    interaction: 'hover',
    css: `.btn-sweep-fill{
  isolation:isolate;position:relative;overflow:hidden;
  padding:.78rem 1.9rem;border:1px solid #c4b5fd;border-radius:9999px;
  background:#fff;color:#5b21b6;font-size:.95rem;font-weight:650;cursor:pointer;
  transition:color .35s ease,border-color .35s ease,transform .25s ease
}
.btn-sweep-fill::before{
  content:"";position:absolute;inset:0;z-index:-1;
  background:linear-gradient(135deg,#8b5cf6,#ec4899);
  transform:translateY(102%);
  transition:transform .4s cubic-bezier(.22,1,.36,1)
}
.btn-sweep-fill:hover{color:#fff;border-color:transparent;transform:translateY(-1px)}
.btn-sweep-fill:hover::before{transform:translateY(0)}
.btn-sweep-fill span{position:relative;z-index:1}`,
  },
  {
    id: 'round-fill',
    name: 'Soft Bloom',
    category: '填充',
    description: '圆形色块从中心扩散，修复原版文字变蓝问题',
    previewClass: 'btn-round-fill',
    html: `<button class="btn-round-fill"><span>Hover Me</span></button>`,
    interaction: 'hover',
    css: `.btn-round-fill{
  isolation:isolate;position:relative;overflow:hidden;
  padding:.78rem 1.9rem;border:1px solid #34d399;border-radius:9999px;
  background:#fff;color:#047857;font-size:.95rem;font-weight:650;cursor:pointer;
  transition:color .35s ease,transform .25s ease
}
.btn-round-fill::before{
  content:"";position:absolute;left:50%;top:50%;z-index:-1;
  width:140%;aspect-ratio:1;border-radius:50%;background:#10b981;
  transform:translate(-50%,-50%) scale(0);
  transition:transform .5s cubic-bezier(.16,1,.3,1)
}
.btn-round-fill:hover{color:#fff;transform:translateY(-1px)}
.btn-round-fill:hover::before{transform:translate(-50%,-50%) scale(1)}
.btn-round-fill span{position:relative;z-index:1}`,
  },
  {
    id: 'cut-reveal',
    name: 'Diagonal Reveal',
    category: '填充',
    description: '保留斜切感，但降低侵略性与跳变',
    previewClass: 'btn-cut-reveal',
    html: `<button class="btn-cut-reveal"><span>Hover Me</span></button>`,
    interaction: 'hover',
    css: `.btn-cut-reveal{
  isolation:isolate;position:relative;overflow:hidden;
  padding:.78rem 1.9rem;border:1px solid #f0abfc;border-radius:9999px;
  background:#fff;color:#a21caf;font-size:.95rem;font-weight:650;cursor:pointer;
  transition:color .35s ease,transform .25s ease
}
.btn-cut-reveal::before{
  content:"";position:absolute;inset:-25%;z-index:-1;background:#c026d3;
  transform:skewX(-18deg) translateX(-115%);
  transition:transform .45s cubic-bezier(.22,1,.36,1)
}
.btn-cut-reveal:hover{color:#fff;transform:translateY(-1px)}
.btn-cut-reveal:hover::before{transform:skewX(-18deg) translateX(0)}
.btn-cut-reveal span{position:relative;z-index:1}`,
  },

  {
    id: 'border-draw',
    name: 'Border Draw',
    category: '边框',
    description: '四边依次描边，保留原有节奏并收紧时长',
    previewClass: 'btn-border-draw',
    html: `<button class="btn-border-draw">Hover Me</button>`,
    interaction: 'hover',
    css: `.btn-border-draw{
  position:relative;padding:.78rem 1.9rem;border:1px solid #e4e4e7;
  border-radius:9999px;background:#fff;color:#18181b;font-size:.95rem;font-weight:650;cursor:pointer
}
.btn-border-draw::before,.btn-border-draw::after{
  content:"";position:absolute;inset:-1px;border-radius:9999px;pointer-events:none;
  border:1px solid transparent;transition:.35s cubic-bezier(.22,1,.36,1)
}
.btn-border-draw::before{border-top-color:#8b5cf6;border-right-color:#8b5cf6;clip-path:inset(0 100% 100% 0)}
.btn-border-draw::after{border-bottom-color:#ec4899;border-left-color:#ec4899;clip-path:inset(100% 0 0 100%)}
.btn-border-draw:hover::before,.btn-border-draw:hover::after{clip-path:inset(0 0 0 0)}`,
  },
  {
    id: 'gradient-border',
    name: 'Aurora Border',
    category: '边框',
    description: '渐变边框缓慢流动，适合展示型 CTA',
    previewClass: 'btn-gradient-border',
    html: `<button class="btn-gradient-border">Hover Me</button>`,
    interaction: 'hover',
    css: `.btn-gradient-border{
  position:relative;padding:.78rem 1.9rem;border:0;border-radius:9999px;
  background:linear-gradient(#fff,#fff) padding-box,
  linear-gradient(90deg,#8b5cf6,#ec4899,#22d3ee,#8b5cf6) border-box;
  border:1px solid transparent;color:#18181b;font-size:.95rem;font-weight:650;cursor:pointer;
  background-size:100% 100%,220% 100%;
  animation:btn-aurora 5s linear infinite;
  transition:transform .25s ease,box-shadow .25s ease
}
.btn-gradient-border:hover{transform:translateY(-2px);box-shadow:0 12px 30px -18px rgba(139,92,246,.55)}
@keyframes btn-aurora{to{background-position:0 0,220% 0}}`,
  },
  {
    id: 'border-shrink',
    name: 'Inset Border',
    category: '边框',
    description: '边框向内收紧，改成更精致的双层框',
    previewClass: 'btn-border-shrink',
    html: `<button class="btn-border-shrink">Hover Me</button>`,
    interaction: 'hover',
    css: `.btn-border-shrink{
  position:relative;padding:.78rem 1.9rem;border:1px solid #27272a;border-radius:9999px;
  background:#fff;color:#18181b;font-size:.95rem;font-weight:650;cursor:pointer
}
.btn-border-shrink::after{
  content:"";position:absolute;inset:4px;border:1px solid transparent;border-radius:9999px;
  transition:inset .3s ease,border-color .3s ease,opacity .3s ease
}
.btn-border-shrink:hover::after{inset:7px;border-color:#a78bfa;opacity:.85}`,
  },

  {
    id: 'lift-up',
    name: 'Lift Up',
    category: '位移',
    description: '保留：最实用的 hover 上浮反馈',
    previewClass: 'btn-lift-up',
    html: `<button class="btn-lift-up">Hover Me</button>`,
    interaction: 'hover',
    css: `.btn-lift-up{
  padding:.78rem 1.9rem;border:0;border-radius:9999px;background:#18181b;color:#fff;
  font-size:.95rem;font-weight:650;cursor:pointer;
  box-shadow:0 6px 18px -12px rgba(0,0,0,.35);
  transition:transform .25s cubic-bezier(.22,1,.36,1),box-shadow .25s ease
}
.btn-lift-up:hover{transform:translateY(-3px);box-shadow:0 18px 34px -18px rgba(0,0,0,.42)}
.btn-lift-up:active{transform:translateY(-1px) scale(.985)}`,
  },
  {
    id: 'tilt-3d',
    name: 'Perspective Tilt',
    category: '位移',
    description: '降低原版夸张倾斜，改为轻微透视',
    previewClass: 'btn-tilt-3d',
    html: `<button class="btn-tilt-3d">Hover Me</button>`,
    interaction: 'hover',
    css: `.btn-tilt-3d{
  padding:.78rem 1.9rem;border:0;border-radius:9999px;color:#fff;
  background:linear-gradient(135deg,#6366f1,#a855f7);
  font-size:.95rem;font-weight:650;cursor:pointer;
  transform:perspective(700px) rotateX(0) rotateY(0);
  transition:transform .32s cubic-bezier(.22,1,.36,1),box-shadow .32s ease
}
.btn-tilt-3d:hover{
  transform:perspective(700px) rotateX(4deg) rotateY(-5deg) translateY(-2px);
  box-shadow:0 18px 34px -20px rgba(99,102,241,.65)
}`,
  },
  {
    id: 'elastic-pop',
    name: 'Elastic Pop',
    category: '位移',
    description: '修复错误的 cubic-bezier 字符并减弱过冲',
    previewClass: 'btn-elastic-pop',
    html: `<button class="btn-elastic-pop">Hover Me</button>`,
    interaction: 'hover',
    css: `.btn-elastic-pop{
  padding:.78rem 1.9rem;border:0;border-radius:9999px;background:#0891b2;color:#fff;
  font-size:.95rem;font-weight:650;cursor:pointer;
  transition:transform .42s cubic-bezier(.34,1.56,.64,1),box-shadow .3s ease
}
.btn-elastic-pop:hover{transform:scale(1.045) translateY(-1px);box-shadow:0 16px 28px -20px rgba(8,145,178,.65)}`,
  },

  {
    id: 'ripple',
    name: 'Ripple',
    category: '点击',
    description: '保留：点击波纹反馈，适合主操作按钮',
    previewClass: 'btn-ripple',
    html: `<button class="btn-ripple">Click Me</button>`,
    interaction: 'click',
    css: `.btn-ripple{
  position:relative;overflow:hidden;padding:.78rem 1.9rem;border:0;border-radius:9999px;
  background:#2563eb;color:#fff;font-size:.95rem;font-weight:650;cursor:pointer
}
.btn-ripple .ripple{
  position:absolute;border-radius:50%;background:rgba(255,255,255,.34);
  transform:scale(0);animation:ripple-effect .58s cubic-bezier(.22,1,.36,1);pointer-events:none
}
@keyframes ripple-effect{to{transform:scale(4);opacity:0}}`,
  },
  {
    id: 'press-squash',
    name: 'Soft Press',
    category: '点击',
    description: '去掉横向压扁，改成更自然的整体按压',
    previewClass: 'btn-press-squash',
    html: `<button class="btn-press-squash">Press Me</button>`,
    interaction: 'click',
    css: `.btn-press-squash{
  padding:.78rem 1.9rem;border:0;border-radius:9999px;background:#ec4899;color:#fff;
  font-size:.95rem;font-weight:650;cursor:pointer;
  transition:transform .12s ease,filter .12s ease
}
.btn-press-squash:active{transform:scale(.965) translateY(1px);filter:brightness(.96)}`,
  },
  {
    id: '3d-push',
    name: 'Soft 3D Push',
    category: '点击',
    description: '保留实体按压感，但减薄阴影避免玩具感',
    previewClass: 'btn-3d-push',
    html: `<button class="btn-3d-push">Press Me</button>`,
    interaction: 'click',
    css: `.btn-3d-push{
  padding:.74rem 1.9rem;border:0;border-radius:9999px;background:#059669;color:#fff;
  font-size:.95rem;font-weight:650;cursor:pointer;box-shadow:0 4px 0 #047857;
  transition:transform .12s ease,box-shadow .12s ease
}
.btn-3d-push:active{transform:translateY(3px);box-shadow:0 1px 0 #047857}`,
  },
  {
    id: 'click-offset-shadow',
    name: 'Offset Press',
    category: '点击',
    description: '保留复古偏移阴影，但收敛为 3px',
    previewClass: 'btn-click-offset-shadow',
    html: `<button class="btn-click-offset-shadow">Click Me</button>`,
    interaction: 'click',
    css: `.btn-click-offset-shadow{
  padding:.76rem 1.9rem;border:1px solid #18181b;border-radius:9999px;background:#fff;color:#18181b;
  font-size:.95rem;font-weight:650;cursor:pointer;box-shadow:3px 3px 0 #18181b;
  transition:transform .12s ease,box-shadow .12s ease
}
.btn-click-offset-shadow:active{transform:translate(2px,2px);box-shadow:1px 1px 0 #18181b}`,
  },
  {
    id: 'click-ring-expand',
    name: 'Ring Expand',
    category: '点击',
    description: '保留：简洁的点击外环扩散',
    previewClass: 'btn-click-ring-expand',
    html: `<button class="btn-click-ring-expand">Click Me</button>`,
    interaction: 'click',
    css: `.btn-click-ring-expand{
  position:relative;padding:.78rem 1.9rem;border:0;border-radius:9999px;background:#db2777;color:#fff;
  font-size:.95rem;font-weight:650;cursor:pointer
}
.btn-click-ring-expand::after{
  content:"";position:absolute;inset:-3px;border:1px solid #db2777;border-radius:inherit;opacity:0
}
.btn-click-ring-expand:active::after{animation:ring-expand .42s cubic-bezier(.22,1,.36,1)}
@keyframes ring-expand{0%{transform:scale(1);opacity:.75}100%{transform:scale(1.22);opacity:0}}`,
  },

  {
    id: 'neon-glow',
    name: 'Soft Neon',
    category: '发光',
    description: '降低多层强光，改成精致霓虹边缘',
    previewClass: 'btn-neon-glow',
    html: `<button class="btn-neon-glow">Glow</button>`,
    interaction: 'hover',
    css: `.btn-neon-glow{
  padding:.78rem 1.9rem;border:1px solid #a855f7;border-radius:9999px;background:#18181b;color:#e9d5ff;
  font-size:.95rem;font-weight:650;cursor:pointer;
  transition:box-shadow .3s ease,transform .25s ease,border-color .3s ease
}
.btn-neon-glow:hover{
  transform:translateY(-1px);border-color:#d8b4fe;
  box-shadow:0 0 0 4px rgba(168,85,247,.08),0 10px 30px -12px rgba(168,85,247,.65)
}`,
  },
  {
    id: 'pulse-ring',
    name: 'Pulse Ring',
    category: '发光',
    description: '保留：低频外圈呼吸，适合状态按钮',
    previewClass: 'btn-pulse-ring',
    html: `<button class="btn-pulse-ring">Pulse</button>`,
    interaction: 'hover',
    css: `.btn-pulse-ring{
  position:relative;padding:.78rem 1.9rem;border:0;border-radius:9999px;background:#10b981;color:#fff;
  font-size:.95rem;font-weight:650;cursor:pointer
}
.btn-pulse-ring::after{
  content:"";position:absolute;inset:-3px;border:1px solid #10b981;border-radius:inherit;
  animation:pulse-ring 1.8s ease-out infinite;pointer-events:none
}
@keyframes pulse-ring{0%{transform:scale(1);opacity:.55}100%{transform:scale(1.2);opacity:0}}`,
  },
  {
    id: 'glow-pulse',
    name: 'Ambient Glow',
    category: '发光',
    description: '把原持续强光改成柔和环境光呼吸',
    previewClass: 'btn-glow-pulse',
    html: `<button class="btn-glow-pulse">Pulse Glow</button>`,
    interaction: 'hover',
    css: `.btn-glow-pulse{
  padding:.78rem 1.9rem;border:0;border-radius:9999px;background:#7c3aed;color:#fff;
  font-size:.95rem;font-weight:650;cursor:pointer;
  animation:glow-breath 2.8s ease-in-out infinite
}
@keyframes glow-breath{
  0%,100%{box-shadow:0 10px 24px -18px rgba(124,58,237,.42)}
  50%{box-shadow:0 12px 34px -14px rgba(124,58,237,.65)}
}`,
  },

  {
    id: 'underline-slide',
    name: 'Underline Slide',
    category: '文字',
    description: '保留：非常适合文字型按钮和导航',
    previewClass: 'btn-underline-slide',
    html: `<button class="btn-underline-slide">Hover Me</button>`,
    interaction: 'hover',
    css: `.btn-underline-slide{
  position:relative;padding:.45rem 0;border:0;background:transparent;color:#18181b;
  font-size:.95rem;font-weight:650;cursor:pointer
}
.btn-underline-slide::after{
  content:"";position:absolute;left:0;bottom:0;width:100%;height:2px;background:#8b5cf6;
  transform:scaleX(0);transform-origin:right center;
  transition:transform .32s cubic-bezier(.22,1,.36,1)
}
.btn-underline-slide:hover::after{transform:scaleX(1);transform-origin:left center}`,
  },

  {
    id: 'magnetic',
    name: 'Magnetic',
    category: '交互',
    description: '鼠标靠近时轻微磁吸，使用 JS 驱动位置',
    previewClass: 'btn-magnetic',
    html: `<button class="btn-magnetic">Magnetic</button>`,
    interaction: 'magnetic',
    css: `.btn-magnetic{
  padding:.78rem 1.9rem;border:1px solid #d4d4d8;border-radius:9999px;background:#fff;color:#18181b;
  font-size:.95rem;font-weight:650;cursor:pointer;
  box-shadow:0 8px 24px -18px rgba(0,0,0,.35);
  transition:transform .18s ease-out,box-shadow .25s ease,border-color .25s ease
}
.btn-magnetic:hover{border-color:#a78bfa;box-shadow:0 14px 30px -20px rgba(109,40,217,.4)}`,
  },
]
