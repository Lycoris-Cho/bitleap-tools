export interface InspoSite {
  slug: string
  name: string
  desc: string
  url: string
  category: string
  tags: string[]
  learn: string
  note?: string
}

export const inspoList: InspoSite[] = [
  {
    slug: 'cssda',
    name: 'CSS Design Awards',
    desc: '你最喜欢的 CSS 奖项站，偏重前端实现细节',
    url: 'https://www.cssdesignawards.com',
    category: '奖项型',
    tags: ['动效重', '极简', '可商用'],
    learn: '学纯 CSS 动画、滚动叙事、交互细节',
    note: '适合拆解单页交互，不适合抄整体视觉',
  },
  {
    slug: 'awwwards',
    name: 'Awwwards',
    desc: '电影感、动效、滚动叙事的行业标杆',
    url: 'https://www.awwwards.com',
    category: '奖项型',
    tags: ['动效重', '高对比', '可商用'],
    learn: '学 Hero 区节奏、3D 融合、视差滚动',
  },
  {
    slug: 'mobbin',
    name: 'Mobbin',
    desc: '真实 App 流程截图，学 UI 细节',
    url: 'https://mobbin.com',
    category: 'UI 参考',
    tags: ['极简', 'UI', '可商用'],
    learn: '学真实 App 的导航结构、组件层级',
  },
  {
    slug: 'fwa',
    name: 'FWA',
    desc: '创意与技术双高的互动站点档案馆，大量实验性 Web 体验',
    url: 'https://thefwa.com',
    category: '奖项型',
    tags: ['动效重', '实验性', '可商用'],
    learn: '学 Canvas / WebGL 创意实现、沉浸式叙事',
  },
  {
    slug: 'landingfolio',
    name: 'Landingfolio',
    desc: '高质量落地页与营销页合集，按组件与行业分类',
    url: 'https://www.landingfolio.com',
    category: 'UI 参考',
    tags: ['UI', '高对比', '可商用'],
    learn: '学 CTA 布局、Hero 区文案与视觉结构',
  },
  {
    slug: 'dribbble',
    name: 'Dribbble',
    desc: '全球设计师社区，UI 细节、微交互与组件探索的首选',
    url: 'https://dribbble.com',
    category: 'UI 参考',
    tags: ['UI', '视觉重', '可商用'],
    learn: '学图标、按钮、卡片等微观交互细节',
  },
  {
    slug: 'siteinspire',
    name: 'SiteInspire',
    desc: '按布局、风格、行业筛选的网页设计画廊，偏重排版与结构',
    url: 'https://www.siteinspire.com',
    category: '画廊型',
    tags: ['极简', '排版', '可商用'],
    learn: '学网格系统、留白控制、内容层级',
  },
  {
    slug: 'landbook',
    name: 'Landbook',
    desc: '落地页与设计案例库，强调信息架构与品牌一致性',
    url: 'https://landbook.com',
    category: '画廊型',
    tags: ['极简', '品牌感', '可商用'],
    learn: '学信息层级、品牌色应用、页面节奏',
  },
  {
    slug: 'minimal-gallery',
    name: 'Minimal Gallery',
    desc: '极简主义网页设计精选，用于校准审美与去噪点',
    url: 'https://minimal.gallery',
    category: '画廊型',
    tags: ['极简', '高对比', '可商用'],
    learn: '学克制设计、单色方案、留白哲学',
  },
  {
    slug: 'onepagelove',
    name: 'One Page Love',
    desc: '单页网站与滚动叙事案例库，强调线性阅读体验',
    url: 'https://onepagelove.com',
    category: '单页/落地',
    tags: ['极简', '叙事性', '可商用'],
    learn: '学单页滚动节奏、锚点导航、内容排布',
  },
  {
    slug: 'httpster',
    name: 'HTTPSTER',
    desc: '独立站与实验性网页合集，风格多样，更新频繁',
    url: 'https://httpster.net',
    category: '单页/落地',
    tags: ['实验性', '复古', '可商用'],
    learn: '学非常规布局、字体实验、独立站气质',
  },
  {
    slug: 'brutalist',
    name: 'Brutalist Websites',
    desc: '粗野主义网页设计归档，反主流审美，强调原始网页感',
    url: 'http://brutalistwebsites.com',
    category: '实验型',
    tags: ['粗野主义', '高对比', '实验性'],
    learn: '学反常规布局、无装饰风格、原始 HTML 美学',
    note: '不适合商业项目直接参考，适合拓展审美边界',
  },
  {
    slug: 'gsap',
    name: 'GSAP',
    desc: 'GreenSock 动画平台官网，JS 动画的工业级标准，ScrollTrigger / SplitText 等全插件已免费',
    url: 'https://gsap.com/',
    category: '奖项型', // 或你之后想单独加一个 '动画库' 分类也行
    tags: ['动效重', '高对比', '可商用'],
    learn: '学 Timeline 编排、ScrollTrigger 滚动叙事、SplitText 文字拆解、FLIP 布局动画',
    note: '官网 Demo Hub 可直接看代码思路，配合 Awwwards 拆商业站最佳',
  },
]