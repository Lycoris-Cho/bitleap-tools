'use client'

/*
 * 海报本体 —— 按**真实尺寸 2560×1440** 布局。
 * 预览时由外层套一个 scale 做视觉缩放，所以导出（toPng）抓到的就是这个原生尺寸的节点，
 * 所见即所得，不需要为导出再写一套 canvas 绘制。
 *
 * 动效这条线：本组件只负责**结构和初始状态**，逐帧的样式由 usePosterMotion 通过
 * data-anim 标记直接写 DOM（不经过 React）。所以这里给每层都打上 data-anim：
 *   char / label / title / footer / decor / orbit / glow / sweep / petal / dust
 * 初始状态取自 buildAnimSample(initialTime)，这样首帧就是对的，驱动接手后不留跳变。
 *
 * 装饰全部是纯 CSS 渐变/边框，没有 backdrop-filter —— 这类效果在 html-to-image
 * 里要么不支持、要么与预览不一致，海报导出必须避开。
 */

import { memo } from 'react'
import { buildAnimSample, dustSeed, fallShapeById, petalSeed } from '../motion'
import { withAlpha } from '../lineup'
import { fillText } from '../presets'
import { POSTER_H, POSTER_W, SAFE, type CharacterItem, type LineupConfig, type MotionConfig } from '../types'
import type { Slot } from '../lineup'

const TITLE_FONT = '"PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif'

/** 颗粒质感：站点里已有的手法（内联 SVG turbulence），不引外部图片 */
const NOISE_URL =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")"

interface Props {
    items: CharacterItem[]
    slots: Slot[]
    cfg: LineupConfig
    motion: MotionConfig
    /** 首帧时刻：服务端/首屏给终态，挂载后再从 0 播入场 */
    initialTime: number
}

/** 单个角色：立绘融合 / 画框卡片共用同一个槽位盒与基线，所以混排也不会散架 */
const CharacterSlot = memo(function CharacterSlot({
    item,
    slot,
    cfg,
    motion,
    sample,
}: {
    item: CharacterItem
    slot: Slot
    cfg: LineupConfig
    motion: MotionConfig
    sample: { dx: number; dy: number; scale: number; opacity: number }
}) {
    const hero = slot.depth === 0
    const isCutout = item.treatment === 'cutout'
    const fadeMask = 'linear-gradient(to top, transparent 0%, rgba(0,0,0,.55) 5%, #000 16%)'

    return (
        // 外层：位置 + 动效（transform/opacity 由驱动写）
        <div
            data-anim="char"
            data-slot={slot.index}
            data-depth={slot.depth}
            data-treatment={item.treatment}
            style={{
                position: 'absolute',
                left: slot.x - slot.w / 2,
                top: slot.y - slot.h,
                width: slot.w,
                height: slot.h,
                zIndex: slot.z,
                transform: `translate3d(${sample.dx}px, ${sample.dy}px, 0) scale(${sample.scale})`,
                opacity: sample.opacity,
            }}
        >
            {/* 内层：用户的"上下微调"独立在这里，免得被逐帧的 transform 覆盖掉 */}
            <div style={{ position: 'relative', width: '100%', height: '100%', transform: `translateY(${item.offsetY}px)` }}>
                {cfg.groundShadow && (
                    <div
                        style={{
                            position: 'absolute',
                            left: '50%',
                            bottom: -slot.h * 0.02,
                            width: slot.w * (isCutout ? 0.72 : 0.84),
                            height: slot.h * 0.07,
                            transform: 'translateX(-50%)',
                            borderRadius: '50%',
                            background: `radial-gradient(closest-side, ${withAlpha(cfg.ink, isCutout ? 0.22 : 0.16)}, transparent 100%)`,
                            filter: 'blur(6px)',
                            zIndex: 0,
                        }}
                    />
                )}

                {isCutout ? (
                    // 用户传的是 blob:/data: 地址，next/image 无法优化这种源，只能用原生 img
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={item.src}
                        alt={item.name}
                        draggable={false}
                        style={{
                            position: 'relative',
                            zIndex: 1,
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            objectPosition: `${item.focal}% 100%`,
                            transform: `scale(${item.scale})`,
                            transformOrigin: '50% 100%',
                            WebkitMaskImage: fadeMask,
                            maskImage: fadeMask,
                            filter: `drop-shadow(0 ${hero ? 26 : 16}px ${hero ? 38 : 26}px ${withAlpha(cfg.ink, 0.18)})`,
                        }}
                    />
                ) : (
                    <div
                        style={{
                            position: 'relative',
                            zIndex: 1,
                            width: '100%',
                            height: '100%',
                            overflow: 'hidden',
                            background: cfg.paperAlt,
                            border: `${hero ? 3 : 2}px solid ${withAlpha(cfg.line, 0.95)}`,
                            boxShadow: `0 ${hero ? 30 : 18}px ${hero ? 50 : 34}px ${withAlpha(cfg.ink, 0.16)}`,
                        }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element -- blob:/data: 源无法交给 next/image */}
                        <img
                            src={item.src}
                            alt={item.name}
                            draggable={false}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                objectPosition: `${item.focal}% 22%`,
                                transform: `scale(${item.scale})`,
                                transformOrigin: '50% 30%',
                            }}
                        />
                        {/* 卡内底部渐隐 + 极淡底色叠加，让不同的图放在一起不打架 */}
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                background: `linear-gradient(to top, ${withAlpha(cfg.paper, 0.92)} 0%, ${withAlpha(cfg.paper, 0)} 26%), linear-gradient(to bottom, ${withAlpha(cfg.ink, 0.06)}, transparent 30%)`,
                            }}
                        />
                        {/* 双色调：只给画框叠，立绘是透明底，叠上去会糊成一块矩形 */}
                        {motion.duotone && (
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: cfg.accent,
                                    mixBlendMode: 'color',
                                    opacity: motion.duotoneAmount * 0.9,
                                }}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    )
})

/** 角色名条：所有人共用一条基线，每人一根竖线连到自己的脚下 */
function LabelColumn({
    slot,
    item,
    cfg,
    sample,
}: {
    slot: Slot
    item: CharacterItem
    cfg: LineupConfig
    sample: { dy: number; opacity: number }
}) {
    const labelY = SAFE.baseline + 56
    return (
        <div
            data-anim="label"
            data-label={slot.index}
            aria-hidden="true"
            style={{
                position: 'absolute',
                left: slot.x,
                top: slot.y,
                zIndex: 60,
                transform: `translate3d(0, ${sample.dy}px, 0)`,
                opacity: sample.opacity,
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: 1,
                    height: Math.max(6, labelY - slot.y),
                    background: `linear-gradient(to bottom, ${withAlpha(cfg.accent, 0.55)}, ${withAlpha(cfg.line, 0.9)})`,
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    left: 0,
                    top: labelY - slot.y,
                    transform: 'translateX(-50%)',
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                }}
            >
                <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: '0.08em', color: cfg.ink, lineHeight: 1.1 }}>
                    {item.name || '未命名'}
                </div>
                {item.tag && <div style={{ marginTop: 4, fontSize: 17, letterSpacing: '0.22em', color: cfg.muted }}>{item.tag}</div>}
            </div>
        </div>
    )
}

export default function PosterStage({ items, slots, cfg, motion, initialTime }: Props) {
    const count = items.length
    const title = fillText(cfg.title, count)
    const subtitle = fillText(cfg.subtitle, count)
    const badge = fillText(cfg.badge, count)
    const series = fillText(cfg.series, count)
    const footer = fillText(cfg.footer, count)

    // 首帧：驱动接手之前先渲染成正确状态，避免从 (0,0) 跳一下
    const s = buildAnimSample(initialTime, slots, motion)
    const charOf = (index: number) => s.chars.find((c) => c.index === index)
    const labelOf = (index: number) => s.labels.find((c) => c.index === index)

    const heroSlot = slots.find((x) => x.depth === 0)

    return (
        <div
            data-poster="stage"
            style={{
                position: 'relative',
                width: POSTER_W,
                height: POSTER_H,
                overflow: 'hidden',
                fontFamily: TITLE_FONT,
                color: cfg.ink,
                background: `linear-gradient(160deg, ${cfg.paper} 0%, ${cfg.paperAlt} 52%, ${cfg.paper} 100%)`,
            }}
        >
            {/* ── 装饰层：网格 / 点阵 / 四角刻度 / 轨道椭圆（整体一起入场） ── */}
            <div
                data-anim="decor"
                style={{ position: 'absolute', inset: 0, opacity: s.decor.opacity, transform: `scale(${s.decor.scale})`, transformOrigin: '50% 55%' }}
            >
                {cfg.showGrid && (
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            opacity: 0.5,
                            backgroundImage: `linear-gradient(${withAlpha(cfg.line, 0.7)} 1px, transparent 1px), linear-gradient(90deg, ${withAlpha(cfg.line, 0.7)} 1px, transparent 1px)`,
                            backgroundSize: '84px 84px',
                        }}
                    />
                )}

                {cfg.showOrbit && (
                    // 这一层单独给轨道旋转用（绕版面中下部的"舞台中心"）
                    <div
                        data-anim="orbit"
                        style={{
                            position: 'absolute',
                            left: '50%',
                            top: '62%',
                            width: 0,
                            height: 0,
                            transform: `rotate(${s.orbit}deg)`,
                        }}
                    >
                        <div
                            style={{
                                position: 'absolute',
                                left: -880,
                                top: -310,
                                width: 1760,
                                height: 620,
                                border: `1px solid ${withAlpha(cfg.line, 0.95)}`,
                                borderRadius: '50%',
                            }}
                        />
                        <div
                            style={{
                                position: 'absolute',
                                left: -1030,
                                top: -380,
                                width: 2060,
                                height: 760,
                                border: `1px solid ${withAlpha(cfg.line, 0.6)}`,
                                borderRadius: '50%',
                            }}
                        />
                    </div>
                )}

                {cfg.showDots && (
                    <div style={{ position: 'absolute', left: 96, top: 108, display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 12 }}>
                        {Array.from({ length: 60 }, (_, i) => (
                            <span key={i} style={{ width: 4, height: 4, borderRadius: 999, background: withAlpha(cfg.accent, 0.5) }} />
                        ))}
                    </div>
                )}

                {cfg.showCorners &&
                    (
                        [
                            { left: 64, top: 64, deg: 0 },
                            { right: 64, top: 64, deg: 90 },
                            { right: 64, bottom: 64, deg: 180 },
                            { left: 64, bottom: 64, deg: 270 },
                        ] as const
                    ).map((pos, i) => (
                        <div
                            key={i}
                            style={{
                                position: 'absolute',
                                left: 'left' in pos ? pos.left : undefined,
                                right: 'right' in pos ? pos.right : undefined,
                                top: 'top' in pos ? pos.top : undefined,
                                bottom: 'bottom' in pos ? pos.bottom : undefined,
                                width: 54,
                                height: 54,
                                transform: `rotate(${pos.deg}deg)`,
                                borderLeft: `2px solid ${withAlpha(cfg.ink, 0.35)}`,
                                borderTop: `2px solid ${withAlpha(cfg.ink, 0.35)}`,
                            }}
                        />
                    ))}
            </div>

            {/* ── 主角背后的光晕（跟着主角的横向位置） ── */}
            {motion.heroGlow && (
                <div
                    data-anim="glow"
                    style={{
                        position: 'absolute',
                        left: (heroSlot?.x ?? POSTER_W / 2) - 620,
                        top: POSTER_H * 0.62 - 430,
                        width: 1240,
                        height: 860,
                        borderRadius: '50%',
                        background: `radial-gradient(closest-side, ${withAlpha(cfg.accent, 0.5)}, ${withAlpha(cfg.accentSoft, 0.22)} 52%, transparent 100%)`,
                        filter: 'blur(28px)',
                        opacity: s.glow.opacity,
                        transform: `scale(${s.glow.scale})`,
                        pointerEvents: 'none',
                    }}
                />
            )}

            {/* ── 浮尘（在人物后面，只是些会闪的小点） ── */}
            {motion.dust && (
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                    {s.dust.map((d) => {
                        const seed = dustSeed(d.i)
                        return (
                            <span
                                key={d.i}
                                data-anim="dust"
                                data-i={d.i}
                                style={{
                                    position: 'absolute',
                                    left: seed.x * POSTER_W,
                                    top: seed.y * POSTER_H,
                                    width: seed.size,
                                    height: seed.size,
                                    borderRadius: 999,
                                    background: cfg.accent,
                                    opacity: d.opacity,
                                    transform: `scale(${d.scale})`,
                                }}
                            />
                        )
                    })}
                </div>
            )}

            {/* ── 人物：z 序由 slot.z 控制，主角在最前 ── */}
            {slots.map((slot) => {
                const item = items[slot.index]
                if (!item) return null
                const sample = charOf(slot.index) ?? { dx: 0, dy: 0, scale: 1, opacity: 1 }
                return <CharacterSlot key={item.id} item={item} slot={slot} cfg={cfg} motion={motion} sample={sample} />
            })}

            {/* ── 名条 ── */}
            {cfg.showLabels &&
                slots.map((slot) => {
                    const item = items[slot.index]
                    if (!item) return null
                    const sample = labelOf(slot.index) ?? { dy: 0, opacity: 1 }
                    return <LabelColumn key={`label-${item.id}`} slot={slot} item={item} cfg={cfg} sample={sample} />
                })}

            {/* ── 标题：压在人物之上，字距从松到紧收拢 ── */}
            <div
                data-anim="title"
                style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 130,
                    textAlign: 'center',
                    transform: `translate3d(0, ${s.title.dy}px, 0)`,
                    opacity: s.title.opacity,
                }}
            >
                <div style={{ fontSize: 22, letterSpacing: '0.42em', color: cfg.muted }}>{badge}</div>
                <div
                    data-anim="title-text"
                    style={{
                        marginTop: 26,
                        fontSize: 104,
                        fontWeight: 800,
                        letterSpacing: `${0.16 + s.title.tracking}em`,
                        textIndent: `${0.16 + s.title.tracking}em`,
                        lineHeight: 1.05,
                    }}
                >
                    {title}
                </div>
                {subtitle && (
                    <div style={{ marginTop: 18, fontSize: 26, letterSpacing: '0.34em', color: cfg.accent }}>{subtitle}</div>
                )}
                <div
                    style={{
                        margin: '34px auto 0',
                        width: 1140,
                        height: 1,
                        background: `linear-gradient(90deg, transparent, ${withAlpha(cfg.line, 1)} 18%, ${withAlpha(cfg.accent, 0.6)} 50%, ${withAlpha(cfg.line, 1)} 82%, transparent)`,
                    }}
                />
            </div>

            {/* ── 底部：系列行 / 条码 / 页脚 ── */}
            <div
                data-anim="footer"
                style={{
                    position: 'absolute',
                    left: SAFE.x0,
                    right: 150,
                    bottom: 70,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    transform: `translate3d(0, ${s.footer.dy}px, 0)`,
                    opacity: s.footer.opacity,
                }}
            >
                <div style={{ fontSize: 24, letterSpacing: '0.2em', color: cfg.muted }}>{series}</div>

                {cfg.showBarcode && (
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 54 }}>
                        {Array.from({ length: 34 }, (_, i) => {
                            // 用下标做伪随机，保证每次渲染与导出完全一致
                            const seed = Math.sin(i * 12.9898) * 43758.5453
                            const r = seed - Math.floor(seed)
                            return (
                                <span
                                    key={i}
                                    style={{
                                        width: r > 0.72 ? 8 : r > 0.42 ? 4 : 2,
                                        height: r > 0.55 ? 54 : 34,
                                        background: withAlpha(cfg.ink, 0.5),
                                    }}
                                />
                            )
                        })}
                    </div>
                )}

                <div style={{ fontSize: 22, letterSpacing: '0.24em', color: cfg.muted }}>{footer}</div>
            </div>

            {/* ── 飘落物：压在人物之前，才有前后层次。形状只用 CSS 画，不加节点 ── */}
            {motion.petals && (
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                    {s.petals.map((p) => {
                        const seed = petalSeed(p.i)
                        const shape = fallShapeById(motion.petalShape)
                        // 主色/副色按下标确定性交替，同一颗每次都是同一色
                        const color = seed.tint > 0.5 ? motion.petalColor2 : motion.petalColor
                        return (
                            <span
                                key={p.i}
                                data-anim="petal"
                                data-i={p.i}
                                style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    width: seed.size,
                                    height: seed.size * shape.aspect,
                                    ...shape.style,
                                    background: `linear-gradient(135deg, ${withAlpha(color, 0.95)}, ${withAlpha(color, 0.55)})`,
                                    opacity: p.opacity,
                                    transform: `translate3d(${p.x}px, ${p.y}px, 0) rotate(${p.rot}deg)`,
                                }}
                            />
                        )
                    })}
                </div>
            )}

            {/* ── 扫光：一条斜向光带掠过画面 ── */}
            {motion.sweep && (
                <div
                    data-anim="sweep"
                    style={{
                        position: 'absolute',
                        top: -POSTER_H * 0.35,
                        left: 0,
                        width: POSTER_W * 0.22,
                        height: POSTER_H * 1.7,
                        background: `linear-gradient(90deg, transparent, ${withAlpha('#ffffff', 0.5)} 45%, ${withAlpha(cfg.accent, 0.25)} 55%, transparent)`,
                        transform: `translate3d(${s.sweep.x * POSTER_W}px, 0, 0) rotate(14deg)`,
                        opacity: s.sweep.opacity,
                        mixBlendMode: 'soft-light',
                        pointerEvents: 'none',
                    }}
                />
            )}

            {/* ── 颗粒质感 ── */}
            {motion.grain && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: NOISE_URL,
                        opacity: motion.grainAmount * 0.5,
                        mixBlendMode: 'overlay',
                        pointerEvents: 'none',
                    }}
                />
            )}

            {/* ── 暗角：最后画，压在所有内容之上，视线收拢到中间 ── */}
            {cfg.vignette && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        pointerEvents: 'none',
                        background: `radial-gradient(120% 96% at 50% 46%, transparent 44%, ${withAlpha(cfg.ink, 0.14)} 100%)`,
                    }}
                />
            )}

            {/* 空状态：没人时给一句提示，免得导出一张空白图 */}
            {count === 0 && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 40,
                        letterSpacing: '0.2em',
                        color: cfg.muted,
                    }}
                >
                    右侧加入角色，这里会变成一张群像
                </div>
            )}
        </div>
    )
}
