import Image from "next/image"

/* ==========================================================================
   站娘 · 半透明背景
   --------------------------------------------------------------------------
   放在工具页那层 `pointer-events-none fixed inset-0 overflow-hidden` 装饰容器里
   （就是原本放柔光和轨道环的那层），用一行 <CharacterBackdrop /> 引入。

   为什么必须放进页面内部、不能写在 tools/layout.tsx 里统一加：
   这些工具页各自在根节点上铺了不透明底色（bg-[#efede6] 之类）。
   而按 CSS 的绘制顺序，定位元素无论 z-index 取多少，都不可能同时
   "压过页面的背景"又"被页面的正文压住" —— 负 z-index 会被不透明底色盖掉，
   z-index:0 又会盖到正文上面。所以只能在页面自己的装饰层里加。
   好消息是这一层已经存在且结构统一（32 个页面完全一致），插入点是稳定的。

   观感：立绘是近白的（采样 #FCF8F7）+ 靛紫裙，multiply 之后白衣融进米色纸面、
   只留裙与线条的淡印；再压一点饱和度，免得在暖调页面上显得发紫。
   mask 两层取交集，让头顶和左侧化开，不会切出一条硬边。
   ========================================================================== */

const MASK = [
    "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.45) 16%, #000 42%, #000 100%)",
    "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.55) 22%, #000 50%, #000 100%)",
].join(", ")

/** 站上的四角星路径（24×24）：和 about 页、BitLeap 海报用的是同一条，别改 */
const STAR_PATH = "M12 0C12.7 6.7 17.3 11.3 24 12C17.3 12.7 12.7 17.3 12 24C11.3 17.3 6.7 12.7 0 12C6.7 11.3 11.3 6.7 12 0Z"

/** 星星配色。三套，按底色选：
      light  工具页暖米底 —— 沿用页面自己的金/墨绿（就是那几颗小圆点的颜色），
             再加两颗靛紫把她和页面串起来；
      dark   工具页近黑底 —— 换浅丁香紫，否则金绿在暗底上全糊；
      violet 首页 —— 那边底色是近白 + 紫色光斑，用她那套紫，既配她也压得住光斑。 */
const STAR_TONES = {
    light: { a: "#b28d48", b: "#52685d", c: "#6967c5" },
    dark: { a: "#c5bae7", b: "#9a93d8", c: "#b9b6e8" },
    violet: { a: "#a78bfa", b: "#8b5cf6", c: "#c9b8e0" },
} as const

export type StarTone = keyof typeof STAR_TONES

/** 星星位置：全部是【立绘框】的百分比，所以跟着立绘一起缩放/换位置，不用管断点。
    坐标都落在这张立绘的透明区（对照 alpha 分带核过）：
    头顶两侧、肩侧、裙摆两侧、腿两侧。万一有偏，也会被她自己挡住（见下面注释）。
    前提：调用方的框必须就是立绘本身的比例（aspect-[1696/2560]），
    否则 object-contain 会留黑边，百分比就对不上立绘的坐标了。 */
const STARS: Array<{ x: number; y: number; size: number; k: "a" | "b" | "c"; o: number; tw: number; delay: number }> = [
    { x: 14, y: 8, size: 13, k: "a", o: 0.44, tw: 3.6, delay: -0.2 },
    { x: 76, y: 6, size: 9, k: "b", o: 0.34, tw: 4.4, delay: -1.1 },
    { x: 8, y: 30, size: 11, k: "a", o: 0.38, tw: 4.1, delay: -2.3 },
    { x: 84, y: 22, size: 8, k: "c", o: 0.3, tw: 5.2, delay: -0.7 },
    { x: 5, y: 60, size: 12, k: "b", o: 0.34, tw: 3.9, delay: -1.6 },
    { x: 82, y: 74, size: 10, k: "a", o: 0.4, tw: 4.6, delay: -3.0 },
    { x: 18, y: 88, size: 12, k: "c", o: 0.32, tw: 5.0, delay: -2.6 },
    { x: 74, y: 90, size: 9, k: "a", o: 0.36, tw: 4.3, delay: -0.9 },
]

/**
 * 站娘周围的四角星。抽成独立组件是因为首页那个站娘不在 CharacterBackdrop 里
 * （首页要多一层整页 z-20 + Hero 的入场/浮空动画），两边各写一遍必然走样 —— 事实上
 * 就出过一次：星星只加在工具页，首页漏了。现在两边都引这个组件。
 *
 * 放在立绘【之前】：立绘带透明通道，星星只在她剪影之外露出来 ——
 * 落在她身上的自然被挡住，所以坐标不用抠得像躲她身体那样精确。
 * 两个坑：
 *   · 别用 transform 居中定位：star-twinkle 动的就是 transform，会被整个覆盖。
 *   · 每颗星的浓淡走 fillOpacity，不能写 opacity —— 关键帧动画的 opacity
 *     优先级高于内联样式，写了也白写（实测被打回 0.45~1，比预期亮一倍）。
 *     写在 fillOpacity 上就能和关键帧相乘：峰值 = 设定值，谷值 = 设定的 45%。
 */
export function CharacterStars({ tone = "light" }: { tone?: StarTone }) {
    const palette = STAR_TONES[tone]
    return (
        <>
            {STARS.map((s, i) => (
                <svg
                    key={i}
                    viewBox="0 0 24 24"
                    width={s.size}
                    height={s.size}
                    aria-hidden
                    className="cb-star absolute"
                    style={
                        {
                            left: `${s.x}%`,
                            top: `${s.y}%`,
                            "--twinkle": `${s.tw}s`,
                            "--twinkle-delay": `${s.delay}s`,
                        } as React.CSSProperties
                    }
                >
                    <path d={STAR_PATH} fill={palette[s.k]} fillOpacity={s.o} />
                </svg>
            ))}
        </>
    )
}

/**
 * 站娘本体（立绘 + 四角星）。**所有出现站娘的地方都用它渲染**，不要在页面里另写一份 ——
 * 这个坑踩过两次：星星只加在工具页、透明度只提了工具页，都是因为首页自己写了一份立绘。
 * 调用方只负责外围的「框」（位置 + 尺寸 + aspect），框里的一切都由这里统一决定。
 *
 * 三套 tone，一次决定混合模式 / 透明度 / 饱和度 / 星星配色：
 *   light  工具页暖米底：multiply。
 *   dark   工具页近黑底：multiply 在近黑上等于没画，换 screen 让亮部自己发光。
 *   violet 首页：近白底 + 紫色光斑，同样 multiply。
 *
 * 【为什么用 multiply】：它能压暗但不能提亮，所以压在白卡黑字上时，
 *   她的浅色部分在纸面上显形、而卡片的黑字依然是黑的 —— 压过正文也不会读不清。
 *
 * 【饱和度是反着调的】——这条踩过坑，别再往回改：
 *   第一版为了"压在暖米底上不发紫"加了 saturate(0.55)，结果整片发灰、
 *   完全没了她原本的颜色（用户原话："整体看起来是灰色的"）。
 *   multiply 本身是保色相的，把颜色砍掉的正是那个滤镜；而透明度又必然把颜色
 *   往底色冲淡。所以正确做法是【预先加浓】：saturate(1.55) 把源色推浓，
 *   再乘上 0.4 的透明度，合成出来才是她本来那个靛紫，而不是一层灰。
 *   实测她裙子 #6967c5 经 saturate(1.55) 变 (102,99,249)，再以 0.4 压在白卡上
 *   得到 (186,185,252) —— 蓝紫通道差 66，颜色明确在。
 *
 * 透明度 0.4（暗底 0.32）：从 0.13 一路提到这里。淡的根源有三层 ——
 *   ① 立绘近白，白衣在白/米底上本来就不显形（这层无解，也不该解，她的白就是白）；
 *   ② 透明度本身；
 *   ③ 工具页的面板是 bg-white/24，再冲淡一层（那层不动，它保正文可读性）。
 */
const FIGURE_TONES = {
    light: { stars: "light", blend: "mix-blend-multiply", opacity: "opacity-[0.4]", saturate: 1.55 },
    dark: { stars: "dark", blend: "mix-blend-screen", opacity: "opacity-[0.32]", saturate: 1.4 },
    violet: { stars: "violet", blend: "mix-blend-multiply", opacity: "opacity-[0.4]", saturate: 1.55 },
} as const

export type FigureTone = keyof typeof FIGURE_TONES

export function CharacterFigure({ tone = "light", sizes }: { tone?: FigureTone; sizes?: string }) {
    const t = FIGURE_TONES[tone]
    return (
        <>
            <CharacterStars tone={t.stars} />
            <Image
                src="/image/BitLeap-l.png"
                alt=""
                aria-hidden
                fill
                sizes={sizes}
                className={`object-contain object-bottom-right ${t.opacity} ${t.blend}`}
                style={
                    {
                        WebkitMaskImage: MASK,
                        maskImage: MASK,
                        WebkitMaskComposite: "source-in",
                        maskComposite: "intersect",
                        filter: `saturate(${t.saturate})`,
                    } as React.CSSProperties
                }
            />
        </>
    )
}

export default function CharacterBackdrop({ className = "", tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
    return (
        <div className={`pointer-events-none absolute inset-0 ${className}`}>
            {/* 高度按容器（= 视口）的百分比给，宽度由 aspect 自动跟出来，不会被拉变形。
                aspect 必须等于立绘本身的比例：框就是立绘，星星的百分比才对得上她。 */}
            <div className="absolute bottom-0 right-[-3%] h-[46%] aspect-[1696/2560] sm:h-[56%] lg:h-[64%]">
                {/* 立绘大、容器高约为视口的 1/2，图宽 ≈ 视口的 27% */}
                <CharacterFigure tone={tone} sizes="(max-width: 640px) 68vw, (max-width: 1024px) 44vw, 30vw" />
            </div>
        </div>
    )
}
