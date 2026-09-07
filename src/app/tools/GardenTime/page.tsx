"use client"

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Breadcrumb } from '@/components/breadcrumb'

type Phase = "day" | "dusk" | "night" | "dawn";
type Season = "spring" | "summer" | "autumn" | "winter";
type StemStage = "stem-base" | "stem-mid" | "stem-tip" | "side-base" | "side-tip";
type LeafTone = "deep" | "sage" | "light" | "olive";
type FlowerKind = "daisy" | "blossom" | "bell" | "star";
type FlowerTone = "ivory" | "blush" | "lilac" | "blue" | "gold";

type StemSegment = {
  id: string;
  d: string;
  width: number;
  stage: StemStage;
  tone?: "main" | "soft";
};

type LeafAttachment = {
  path: string;
  t: number;
  side: 1 | -1;
  scale: number;
  tone: LeafTone;
  pair?: boolean;
  angle?: number;
};

type FlowerAttachment = {
  path: string;
  t: number;
  kind: FlowerKind;
  tone: FlowerTone;
  scale: number;
  angle?: number;
};

type BudAttachment = {
  path: string;
  t: number;
  scale: number;
  angle?: number;
};

type RimVine = {
  id: string;
  d: string;
  width: number;
  curl?: boolean;
};

const CENTER = 500;
const DIAL_RADIUS = 354;
const PLANT_SAFE_RADIUS = 300;
const CYCLE_DURATION = 60;

const PHASE_LABEL: Record<Phase, string> = {
  day: "DAY",
  dusk: "DUSK",
  night: "NIGHT",
  dawn: "DAWN",
};

const PHASE_TIME: Record<Phase, number> = {
  day: 0,
  dusk: 14,
  night: 26,
  dawn: 46,
};

const PHASE_COPY: Record<
  Phase,
  { eyebrow: string; title: string; body: string }
> = {
  day: {
    eyebrow: "01 / MORNING",
    title: "愿今天，也慢慢长成喜欢的样子。",
    body: "光从表盘边缘落进来，枝叶一点点舒展，像那些不用着急抵达的日子。",
  },
  dusk: {
    eyebrow: "02 / EVENING",
    title: "晚风来了，时间也柔软下来。",
    body: "藤蔓轻轻绕过刻度，把白天没说完的话，留给黄昏慢慢听。",
  },
  night: {
    eyebrow: "03 / NIGHT",
    title: "夜深一点，也没关系。",
    body: "月光会替你照亮剩下的路。枝叶安静呼吸，时间只是陪你慢一点。",
  },
  dawn: {
    eyebrow: "04 / DAWN",
    title: "天会亮，花也会再开一次。",
    body: "新的一圈不是重新开始，而是带着昨天留下的温度，继续向前生长。",
  },
};

const SEASON_DURATION = 72;
const SPRING_REBIRTH_START = 64;
const SPRING_LABEL_TIME = 67;

const SEASON_TIME: Record<Season, number> = {
  spring: 0,
  summer: 18,
  autumn: 36,
  winter: 54,
};

const SEASON_LABEL: Record<Season, string> = {
  spring: "春 · SPRING",
  summer: "夏 · SUMMER",
  autumn: "秋 · AUTUMN",
  winter: "冬 · WINTER",
};

const SEASON_NOTE: Record<Season, string> = {
  spring: "风从冬天尽头吹来，叶子一片一片醒来。",
  summer: "枝叶正盛，连时间都染上了绿意。",
  autumn: "有些叶子会离开，也把颜色留给了风。",
  winter: "把热闹收起来，安静等下一次花开。",
};

const SPRING_LEAF_PALETTE = ["#8da182", "#a9b89e", "#6d8564", "#959a72"];
const SUMMER_LEAF_PALETTE = ["#59764f", "#708d60", "#476847", "#81915f"];
const AUTUMN_LEAF_PALETTE = ["#d0a551", "#b9773f", "#c98b45", "#9e6540", "#d5b368"];

const FALLING_LEAVES = [
  { x: 420, y: 344, scale: 0.48, rotate: -18, fill: "#c9974b", drift: -26, fall: 132, spin: -145 },
  { x: 560, y: 350, scale: 0.54, rotate: 22, fill: "#d1ad61", drift: 18, fall: 118, spin: 130 },
  { x: 650, y: 418, scale: 0.46, rotate: 38, fill: "#a96c3d", drift: 28, fall: 136, spin: 165 },
  { x: 344, y: 426, scale: 0.5, rotate: -42, fill: "#bd7d43", drift: -20, fall: 122, spin: -120 },
  { x: 692, y: 520, scale: 0.42, rotate: 16, fill: "#d0a14f", drift: 22, fall: 112, spin: 150 },
  { x: 307, y: 535, scale: 0.44, rotate: -8, fill: "#a96a3d", drift: -28, fall: 128, spin: -155 },
  { x: 606, y: 620, scale: 0.5, rotate: 28, fill: "#c48a47", drift: 16, fall: 106, spin: 125 },
  { x: 408, y: 638, scale: 0.45, rotate: -30, fill: "#d3ae5c", drift: -18, fall: 100, spin: -130 },
  { x: 522, y: 675, scale: 0.4, rotate: 12, fill: "#a66b40", drift: 24, fall: 92, spin: 165 },
  { x: 472, y: 405, scale: 0.38, rotate: -12, fill: "#c9974b", drift: -12, fall: 120, spin: -110 },
  { x: 578, y: 466, scale: 0.36, rotate: 34, fill: "#b7773f", drift: 14, fall: 126, spin: 140 },
  { x: 378, y: 560, scale: 0.38, rotate: -36, fill: "#d1a654", drift: -16, fall: 110, spin: -150 },
];


const ticks = Array.from({ length: 60 }, (_, index) => ({
  rotate: index * 6,
  major: index % 5 === 0,
}));

/**
 * Botanical engine
 *
 * 主枝不是一根等宽 SVG stroke，而是拆成 base / mid / tip 三段。
 * 因此视觉上会真实地从粗到细：
 *
 * gear -> 4.2px -> 2.9px -> 1.55px -> terminal
 *
 * 分枝只允许从 base / mid 的节点出发。
 * 所有 terminal tip 都只允许叶、花或花苞结束，不再继续长树枝。
 */
const stems: StemSegment[] = [
  // North
  { id: "n-base", d: "M500 500 C498 474 493 451 491 430", width: 4.2, stage: "stem-base" },
  { id: "n-mid", d: "M491 430 C489 401 496 378 501 354", width: 2.9, stage: "stem-mid" },
  { id: "n-tip", d: "M501 354 C507 330 508 306 504 286", width: 1.55, stage: "stem-tip" },

  // North East
  { id: "ne-base", d: "M500 500 C519 480 538 462 558 446", width: 4.0, stage: "stem-base" },
  { id: "ne-mid", d: "M558 446 C584 426 606 403 628 383", width: 2.75, stage: "stem-mid" },
  { id: "ne-tip", d: "M628 383 C645 366 661 348 681 331", width: 1.5, stage: "stem-tip" },

  // East
  { id: "e-base", d: "M500 500 C526 493 551 488 576 488", width: 4.1, stage: "stem-base" },
  { id: "e-mid", d: "M576 488 C610 488 640 498 670 500", width: 2.8, stage: "stem-mid" },
  { id: "e-tip", d: "M670 500 C697 503 718 500 741 496", width: 1.5, stage: "stem-tip" },

  // South East
  { id: "se-base", d: "M500 500 C519 518 539 536 558 557", width: 4.0, stage: "stem-base" },
  { id: "se-mid", d: "M558 557 C582 584 603 611 624 636", width: 2.75, stage: "stem-mid" },
  { id: "se-tip", d: "M624 636 C640 654 656 670 675 686", width: 1.5, stage: "stem-tip" },

  // South
  { id: "s-base", d: "M500 500 C504 526 507 550 506 575", width: 4.2, stage: "stem-base" },
  { id: "s-mid", d: "M506 575 C504 607 497 635 493 662", width: 2.9, stage: "stem-mid" },
  { id: "s-tip", d: "M493 662 C488 688 486 710 489 735", width: 1.55, stage: "stem-tip" },

  // South West
  { id: "sw-base", d: "M500 500 C481 519 461 537 442 557", width: 4.0, stage: "stem-base" },
  { id: "sw-mid", d: "M442 557 C418 583 397 610 375 634", width: 2.75, stage: "stem-mid" },
  { id: "sw-tip", d: "M375 634 C359 653 342 670 324 686", width: 1.5, stage: "stem-tip" },

  // West
  { id: "w-base", d: "M500 500 C474 507 449 511 424 511", width: 4.1, stage: "stem-base" },
  { id: "w-mid", d: "M424 511 C391 510 361 500 331 499", width: 2.8, stage: "stem-mid" },
  { id: "w-tip", d: "M331 499 C304 497 282 499 259 504", width: 1.5, stage: "stem-tip" },

  // North West
  { id: "nw-base", d: "M500 500 C481 481 462 462 444 441", width: 4.0, stage: "stem-base" },
  { id: "nw-mid", d: "M444 441 C419 415 398 390 376 366", width: 2.75, stage: "stem-mid" },
  { id: "nw-tip", d: "M376 366 C359 349 344 332 326 316", width: 1.5, stage: "stem-tip" },

  // Secondary branches.
  // Every branch starts from a base/mid node, never from a main terminal tip.
  { id: "n-left-a", d: "M491 430 C470 421 452 409 437 393", width: 1.9, stage: "side-base", tone: "soft" },
  { id: "n-left-b", d: "M437 393 C421 377 407 360 397 342", width: 1.05, stage: "side-tip", tone: "soft" },
  { id: "n-right-a", d: "M501 354 C521 348 538 337 552 322", width: 1.75, stage: "side-base", tone: "soft" },
  { id: "n-right-b", d: "M552 322 C565 308 576 298 590 291", width: 1.0, stage: "side-tip", tone: "soft" },

  { id: "ne-upper-a", d: "M558 446 C571 423 589 405 610 394", width: 1.9, stage: "side-base", tone: "soft" },
  { id: "ne-upper-b", d: "M610 394 C625 384 641 377 658 375", width: 1.05, stage: "side-tip", tone: "soft" },
  { id: "ne-lower-a", d: "M628 383 C646 388 662 398 676 412", width: 1.65, stage: "side-base", tone: "soft" },
  { id: "ne-lower-b", d: "M676 412 C689 425 699 437 707 452", width: 0.95, stage: "side-tip", tone: "soft" },

  { id: "e-up-a", d: "M576 488 C588 469 605 456 625 449", width: 1.9, stage: "side-base", tone: "soft" },
  { id: "e-up-b", d: "M625 449 C642 443 658 443 674 447", width: 1.0, stage: "side-tip", tone: "soft" },
  { id: "e-down-a", d: "M670 500 C687 511 701 523 712 539", width: 1.6, stage: "side-base", tone: "soft" },
  { id: "e-down-b", d: "M712 539 C722 552 730 566 735 581", width: 0.95, stage: "side-tip", tone: "soft" },

  { id: "se-upper-a", d: "M558 557 C577 550 596 553 613 563", width: 1.85, stage: "side-base", tone: "soft" },
  { id: "se-upper-b", d: "M613 563 C628 572 640 584 650 599", width: 1.0, stage: "side-tip", tone: "soft" },
  { id: "se-lower-a", d: "M624 636 C629 655 629 673 625 690", width: 1.6, stage: "side-base", tone: "soft" },
  { id: "se-lower-b", d: "M625 690 C622 703 617 715 609 726", width: 0.9, stage: "side-tip", tone: "soft" },

  { id: "s-right-a", d: "M506 575 C525 587 539 603 548 622", width: 1.9, stage: "side-base", tone: "soft" },
  { id: "s-right-b", d: "M548 622 C556 639 561 655 561 672", width: 1.0, stage: "side-tip", tone: "soft" },
  { id: "s-left-a", d: "M493 662 C474 670 459 681 447 697", width: 1.65, stage: "side-base", tone: "soft" },
  { id: "s-left-b", d: "M447 697 C437 710 429 722 425 736", width: 0.95, stage: "side-tip", tone: "soft" },

  { id: "sw-upper-a", d: "M442 557 C423 550 404 553 387 563", width: 1.85, stage: "side-base", tone: "soft" },
  { id: "sw-upper-b", d: "M387 563 C372 572 360 584 350 599", width: 1.0, stage: "side-tip", tone: "soft" },
  { id: "sw-lower-a", d: "M375 634 C370 653 371 671 376 688", width: 1.6, stage: "side-base", tone: "soft" },
  { id: "sw-lower-b", d: "M376 688 C380 701 386 713 394 724", width: 0.9, stage: "side-tip", tone: "soft" },

  { id: "w-up-a", d: "M424 511 C411 492 394 479 374 472", width: 1.9, stage: "side-base", tone: "soft" },
  { id: "w-up-b", d: "M374 472 C357 466 341 466 325 470", width: 1.0, stage: "side-tip", tone: "soft" },
  { id: "w-down-a", d: "M331 499 C314 510 300 522 289 538", width: 1.6, stage: "side-base", tone: "soft" },
  { id: "w-down-b", d: "M289 538 C279 551 271 565 266 580", width: 0.95, stage: "side-tip", tone: "soft" },

  { id: "nw-upper-a", d: "M444 441 C431 418 413 401 391 389", width: 1.9, stage: "side-base", tone: "soft" },
  { id: "nw-upper-b", d: "M391 389 C376 379 360 372 343 370", width: 1.05, stage: "side-tip", tone: "soft" },
  { id: "nw-lower-a", d: "M376 366 C358 371 342 381 328 395", width: 1.65, stage: "side-base", tone: "soft" },
  { id: "nw-lower-b", d: "M328 395 C315 408 305 421 297 436", width: 0.95, stage: "side-tip", tone: "soft" },
];

/**
 * Leaves no longer have free x/y positions.
 * Every leaf references a real SVG path + percentage along that path.
 * During mount we use getPointAtLength() and the local tangent to place it.
 *
 * Result: the petiole base is mathematically attached to the stem.
 */
const leaves: LeafAttachment[] = [
  { path: "n-base", t: 0.55, side: -1, scale: 0.78, tone: "deep", pair: true },
  { path: "n-mid", t: 0.42, side: 1, scale: 0.74, tone: "sage", pair: true },
  { path: "n-mid", t: 0.78, side: -1, scale: 0.66, tone: "light" },
  { path: "n-tip", t: 0.6, side: 1, scale: 0.58, tone: "sage", pair: true },

  { path: "ne-base", t: 0.46, side: -1, scale: 0.76, tone: "sage", pair: true },
  { path: "ne-mid", t: 0.38, side: 1, scale: 0.7, tone: "deep", pair: true },
  { path: "ne-mid", t: 0.74, side: -1, scale: 0.62, tone: "light" },
  { path: "ne-tip", t: 0.58, side: 1, scale: 0.56, tone: "olive", pair: true },

  { path: "e-base", t: 0.46, side: -1, scale: 0.74, tone: "deep", pair: true },
  { path: "e-mid", t: 0.34, side: 1, scale: 0.68, tone: "sage", pair: true },
  { path: "e-mid", t: 0.72, side: -1, scale: 0.62, tone: "light" },
  { path: "e-tip", t: 0.57, side: 1, scale: 0.55, tone: "sage", pair: true },

  { path: "se-base", t: 0.48, side: 1, scale: 0.76, tone: "sage", pair: true },
  { path: "se-mid", t: 0.4, side: -1, scale: 0.7, tone: "deep", pair: true },
  { path: "se-mid", t: 0.75, side: 1, scale: 0.61, tone: "light" },
  { path: "se-tip", t: 0.56, side: -1, scale: 0.55, tone: "olive", pair: true },

  { path: "s-base", t: 0.52, side: 1, scale: 0.76, tone: "deep", pair: true },
  { path: "s-mid", t: 0.4, side: -1, scale: 0.7, tone: "sage", pair: true },
  { path: "s-mid", t: 0.76, side: 1, scale: 0.61, tone: "light" },
  { path: "s-tip", t: 0.57, side: -1, scale: 0.55, tone: "sage", pair: true },

  { path: "sw-base", t: 0.48, side: -1, scale: 0.76, tone: "sage", pair: true },
  { path: "sw-mid", t: 0.4, side: 1, scale: 0.7, tone: "deep", pair: true },
  { path: "sw-mid", t: 0.75, side: -1, scale: 0.61, tone: "light" },
  { path: "sw-tip", t: 0.56, side: 1, scale: 0.55, tone: "olive", pair: true },

  { path: "w-base", t: 0.46, side: 1, scale: 0.74, tone: "deep", pair: true },
  { path: "w-mid", t: 0.34, side: -1, scale: 0.68, tone: "sage", pair: true },
  { path: "w-mid", t: 0.72, side: 1, scale: 0.62, tone: "light" },
  { path: "w-tip", t: 0.57, side: -1, scale: 0.55, tone: "sage", pair: true },

  { path: "nw-base", t: 0.46, side: 1, scale: 0.76, tone: "sage", pair: true },
  { path: "nw-mid", t: 0.38, side: -1, scale: 0.7, tone: "deep", pair: true },
  { path: "nw-mid", t: 0.74, side: 1, scale: 0.62, tone: "light" },
  { path: "nw-tip", t: 0.58, side: -1, scale: 0.56, tone: "olive", pair: true },

  { path: "n-left-a", t: 0.48, side: 1, scale: 0.62, tone: "sage", pair: true },
  { path: "n-left-b", t: 0.54, side: -1, scale: 0.5, tone: "light" },
  { path: "n-right-a", t: 0.48, side: -1, scale: 0.58, tone: "deep", pair: true },

  { path: "ne-upper-a", t: 0.5, side: -1, scale: 0.6, tone: "sage", pair: true },
  { path: "ne-upper-b", t: 0.55, side: 1, scale: 0.48, tone: "light" },
  { path: "ne-lower-a", t: 0.52, side: 1, scale: 0.55, tone: "olive", pair: true },

  { path: "e-up-a", t: 0.5, side: -1, scale: 0.58, tone: "sage", pair: true },
  { path: "e-up-b", t: 0.52, side: 1, scale: 0.48, tone: "light" },
  { path: "e-down-a", t: 0.5, side: 1, scale: 0.54, tone: "deep", pair: true },

  { path: "se-upper-a", t: 0.5, side: -1, scale: 0.58, tone: "sage", pair: true },
  { path: "se-upper-b", t: 0.52, side: 1, scale: 0.48, tone: "light" },
  { path: "se-lower-a", t: 0.5, side: 1, scale: 0.54, tone: "olive", pair: true },

  { path: "s-right-a", t: 0.5, side: -1, scale: 0.58, tone: "deep", pair: true },
  { path: "s-right-b", t: 0.52, side: 1, scale: 0.48, tone: "sage" },
  { path: "s-left-a", t: 0.5, side: 1, scale: 0.54, tone: "light", pair: true },

  { path: "sw-upper-a", t: 0.5, side: 1, scale: 0.58, tone: "sage", pair: true },
  { path: "sw-upper-b", t: 0.52, side: -1, scale: 0.48, tone: "light" },
  { path: "sw-lower-a", t: 0.5, side: -1, scale: 0.54, tone: "olive", pair: true },

  { path: "w-up-a", t: 0.5, side: 1, scale: 0.58, tone: "sage", pair: true },
  { path: "w-up-b", t: 0.52, side: -1, scale: 0.48, tone: "light" },
  { path: "w-down-a", t: 0.5, side: -1, scale: 0.54, tone: "deep", pair: true },

  { path: "nw-upper-a", t: 0.5, side: 1, scale: 0.6, tone: "sage", pair: true },
  { path: "nw-upper-b", t: 0.55, side: -1, scale: 0.48, tone: "light" },
  { path: "nw-lower-a", t: 0.52, side: -1, scale: 0.55, tone: "olive", pair: true },
];

const flowers: FlowerAttachment[] = [
  { path: "n-tip", t: 1, kind: "daisy", tone: "gold", scale: 0.82 },
  { path: "ne-tip", t: 1, kind: "blossom", tone: "blush", scale: 0.84 },
  { path: "e-tip", t: 1, kind: "star", tone: "blue", scale: 0.8 },
  { path: "se-tip", t: 1, kind: "bell", tone: "lilac", scale: 0.92 },
  { path: "s-tip", t: 1, kind: "blossom", tone: "ivory", scale: 0.86 },
  { path: "sw-tip", t: 1, kind: "daisy", tone: "blush", scale: 0.82 },
  { path: "w-tip", t: 1, kind: "star", tone: "gold", scale: 0.8 },
  { path: "nw-tip", t: 1, kind: "blossom", tone: "lilac", scale: 0.84 },

  { path: "n-left-b", t: 1, kind: "bell", tone: "blue", scale: 0.68 },
  { path: "ne-upper-b", t: 1, kind: "daisy", tone: "ivory", scale: 0.7 },
  { path: "e-up-b", t: 1, kind: "blossom", tone: "blush", scale: 0.72 },
  { path: "se-upper-b", t: 1, kind: "star", tone: "gold", scale: 0.68 },
  { path: "s-right-b", t: 1, kind: "bell", tone: "blush", scale: 0.72 },
  { path: "sw-upper-b", t: 1, kind: "daisy", tone: "lilac", scale: 0.7 },
  { path: "w-up-b", t: 1, kind: "blossom", tone: "blue", scale: 0.72 },
  { path: "nw-upper-b", t: 1, kind: "star", tone: "ivory", scale: 0.68 },
];

const buds: BudAttachment[] = [
  { path: "n-right-b", t: 1, scale: 0.72 },
  { path: "ne-lower-b", t: 1, scale: 0.66 },
  { path: "e-down-b", t: 1, scale: 0.65 },
  { path: "se-lower-b", t: 1, scale: 0.64 },
  { path: "s-left-b", t: 1, scale: 0.66 },
  { path: "sw-lower-b", t: 1, scale: 0.64 },
  { path: "w-down-b", t: 1, scale: 0.65 },
  { path: "nw-lower-b", t: 1, scale: 0.66 },
];

/**
 * Stage 02 — rim coil vines
 *
 * 这次改成你画的那种“缠绕”逻辑：
 * 不是在表盘内外来回穿 S，而是沿着表盘边缘，
 * 以 outside / inside / outside / inside 的节奏，
 * 像一根藤蔓缠在圆环上。
 */
const WRAP_OUTER_RADIUS = DIAL_RADIUS + 14;
const WRAP_INNER_RADIUS = DIAL_RADIUS - 7;

type XYPoint = { x: number; y: number };

function polarPoint(angle: number, radius: number) {
  const rad = (angle * Math.PI) / 180;
  return {
    x: CENTER + Math.cos(rad) * radius,
    y: CENTER - Math.sin(rad) * radius,
  };
}

function extrapolatePoint(a: XYPoint, b: XYPoint) {
  return {
    x: a.x + (a.x - b.x),
    y: a.y + (a.y - b.y),
  };
}

function cubicPathFromCatmull(
  p0: XYPoint,
  p1: XYPoint,
  p2: XYPoint,
  p3: XYPoint,
  tension = 0.92,
) {
  const c1 = {
    x: p1.x + ((p2.x - p0.x) / 6) * tension,
    y: p1.y + ((p2.y - p0.y) / 6) * tension,
  };

  const c2 = {
    x: p2.x - ((p3.x - p1.x) / 6) * tension,
    y: p2.y - ((p3.y - p1.y) / 6) * tension,
  };

  return `M${p1.x.toFixed(1)} ${p1.y.toFixed(1)} C${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
}

function makeSmoothWrapSegments(
  half: 'top' | 'bottom',
  angles: number[],
  radii: number[],
): RimVine[] {
  const pts = angles.map((angle, index) => polarPoint(angle, radii[index] ?? WRAP_OUTER_RADIUS));

  return pts.slice(0, -1).map((_, index) => {
    const p0 = index === 0 ? extrapolatePoint(pts[0], pts[1]) : pts[index - 1];
    const p1 = pts[index];
    const p2 = pts[index + 1];
    const p3 = index + 2 >= pts.length ? extrapolatePoint(pts[pts.length - 1], pts[pts.length - 2]) : pts[index + 2];
    const isFront = index % 2 === 0;

    return {
      id: isFront ? `wrap-${half}-front-${index + 1}` : `wrap-${half}-back-${index + 1}`,
      d: cubicPathFromCatmull(p0, p1, p2, p3, 0.78),
      width: Math.max(1.18, 1.55 - index * 0.035),
    };
  });
}

// 缠绕节奏更贴近表盘：振幅收敛、波峰错开，避免“波浪线”太平均。
const topAngles = [180, 202, 224, 247, 270, 293, 316, 338, 360];
const bottomAngles = [0, 22, 45, 68, 91, 114, 137, 159, 180];

const topRadii = [
  WRAP_OUTER_RADIUS,
  WRAP_INNER_RADIUS + 5,
  WRAP_OUTER_RADIUS + 3,
  WRAP_INNER_RADIUS + 2,
  WRAP_OUTER_RADIUS + 5,
  WRAP_INNER_RADIUS + 4,
  WRAP_OUTER_RADIUS + 2,
  WRAP_INNER_RADIUS + 5,
  WRAP_OUTER_RADIUS,
];

const bottomRadii = [
  WRAP_OUTER_RADIUS,
  WRAP_INNER_RADIUS + 4,
  WRAP_OUTER_RADIUS + 4,
  WRAP_INNER_RADIUS + 2,
  WRAP_OUTER_RADIUS + 5,
  WRAP_INNER_RADIUS + 3,
  WRAP_OUTER_RADIUS + 3,
  WRAP_INNER_RADIUS + 5,
  WRAP_OUTER_RADIUS,
];

const topWrapSegments = makeSmoothWrapSegments('top', topAngles, topRadii);
const bottomWrapSegments = makeSmoothWrapSegments('bottom', bottomAngles, bottomRadii);

const rimVines: RimVine[] = [
  {
    id: 'wrap-r-bridge',
    d: 'M741 496 C777 492 812 492 868 500',
    width: 1.6,
  },
  {
    id: 'wrap-l-bridge',
    d: 'M259 504 C223 508 188 508 132 500',
    width: 1.6,
  },
  ...topWrapSegments,
  ...bottomWrapSegments,
  {
    id: 'wrap-r-curl',
    d: 'M868 500 C883 494 894 482 893 468 C891 454 878 448 867 452 C857 456 854 468 861 478 C866 486 874 489 882 489',
    width: 0.92,
    curl: true,
  },
  {
    id: 'wrap-l-curl',
    d: 'M132 500 C117 507 106 520 107 534 C109 548 122 554 133 549 C143 544 146 532 139 522 C134 514 126 511 118 511',
    width: 0.92,
    curl: true,
  },
];

const rimVineLeaves: LeafAttachment[] = [
  { path: 'wrap-top-front-1', t: 0.46, side: -1, scale: 0.42, tone: 'sage', pair: true },
  { path: 'wrap-top-front-3', t: 0.56, side: 1, scale: 0.4, tone: 'light' },
  { path: 'wrap-top-front-5', t: 0.44, side: -1, scale: 0.43, tone: 'olive', pair: true },
  { path: 'wrap-top-front-7', t: 0.58, side: 1, scale: 0.38, tone: 'deep' },

  { path: 'wrap-bottom-front-1', t: 0.5, side: 1, scale: 0.4, tone: 'sage' },
  { path: 'wrap-bottom-front-3', t: 0.48, side: -1, scale: 0.43, tone: 'light', pair: true },
  { path: 'wrap-bottom-front-5', t: 0.56, side: 1, scale: 0.41, tone: 'olive' },
  { path: 'wrap-bottom-front-7', t: 0.48, side: -1, scale: 0.38, tone: 'deep', pair: true },
];

const rimVineBuds: BudAttachment[] = [
  { path: 'wrap-top-front-3', t: 0.82, scale: 0.46 },
  { path: 'wrap-top-front-7', t: 0.2, scale: 0.44 },
  { path: 'wrap-bottom-front-3', t: 0.24, scale: 0.46 },
  { path: 'wrap-bottom-front-5', t: 0.76, scale: 0.44 },
];

const rimVineFlowers: FlowerAttachment[] = [
  { path: 'wrap-top-front-1', t: 0.72, kind: 'blossom', tone: 'blush', scale: 0.54 },
  { path: 'wrap-top-front-5', t: 0.62, kind: 'daisy', tone: 'gold', scale: 0.52 },
  { path: 'wrap-bottom-front-3', t: 0.62, kind: 'star', tone: 'blue', scale: 0.5 },
  { path: 'wrap-bottom-front-7', t: 0.34, kind: 'blossom', tone: 'lilac', scale: 0.54 },
];

const leafFill: Record<LeafTone, string> = {
  deep: "#6d8564",
  sage: "#8da182",
  light: "#a9b89e",
  olive: "#959a72",
};

const flowerPalette: Record<
  FlowerTone,
  { fill: string; edge: string; center: string }
> = {
  ivory: { fill: "#f2e8d3", edge: "#b9a27e", center: "#b4934e" },
  blush: { fill: "#e7b7ae", edge: "#b77d78", center: "#bd8d55" },
  lilac: { fill: "#c8bbd9", edge: "#9485aa", center: "#c2a45d" },
  blue: { fill: "#adc8d7", edge: "#7899aa", center: "#c3a158" },
  gold: { fill: "#e7cd83", edge: "#b6934f", center: "#8d7140" },
};

const ambientStars = Array.from({ length: 52 }, (_, index) => ({
  x: 3 + ((index * 37) % 94),
  y: 4 + ((index * 61) % 91),
  size: index % 11 === 0 ? 3 : index % 4 === 0 ? 2 : 1,
  opacity: index % 7 === 0 ? 0.82 : 0.45,
}));

const pollen = Array.from({ length: 10 }, (_, index) => ({
  x: 360 + ((index * 71) % 280),
  y: 360 + ((index * 97) % 280),
  r: index % 4 === 0 ? 1.9 : 1.15,
}));

export default function ChronoGardenTool() {
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const cycleTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const seasonTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const growthTimelineRef = useRef<gsap.core.Timeline | null>(null);

  const [phase, setPhase] = useState<Phase>("day");
  const [season, setSeason] = useState<Season>("spring");
  const [paused, setPaused] = useState(false);
  const [cycleSpeed, setCycleSpeed] = useState(1);

  useEffect(() => {
    const root = rootRef.current;
    const svg = svgRef.current;

    if (!root || !svg) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const positionAttachments = () => {
      const holders = Array.from(
        svg.querySelectorAll<SVGGElement>("[data-path]"),
      );

      holders.forEach((holder) => {
        const pathId = holder.dataset.path;
        if (!pathId) return;

        const path = svg.querySelector<SVGPathElement>(`#${pathId}`);
        if (!path) return;

        const t = Math.min(
          1,
          Math.max(0, Number(holder.dataset.t ?? 0)),
        );
        const angleOffset = Number(holder.dataset.angle ?? 0);
        const length = path.getTotalLength();
        const cursor = length * t;
        const point = path.getPointAtLength(cursor);

        const delta = Math.min(2, Math.max(0.5, length * 0.01));
        const before = path.getPointAtLength(Math.max(0, cursor - delta));
        const after = path.getPointAtLength(Math.min(length, cursor + delta));
        const tangent =
          (Math.atan2(after.y - before.y, after.x - before.x) * 180) /
          Math.PI;

        holder.setAttribute(
          "transform",
          `translate(${point.x} ${point.y}) rotate(${tangent + angleOffset})`,
        );
      });
    };

    positionAttachments();

    const reducedQuery = "(prefers-reduced-motion: reduce)";
    const motionMedia = window.matchMedia(reducedQuery);

    const ctx = gsap.context(() => {
      const stemBase = Array.from(
        svg.querySelectorAll<SVGPathElement>(".stem-base"),
      );
      const stemMid = Array.from(
        svg.querySelectorAll<SVGPathElement>(".stem-mid"),
      );
      const stemTip = Array.from(
        svg.querySelectorAll<SVGPathElement>(".stem-tip"),
      );
      const sideBase = Array.from(
        svg.querySelectorAll<SVGPathElement>(".side-base"),
      );
      const sideTip = Array.from(
        svg.querySelectorAll<SVGPathElement>(".side-tip"),
      );
      const rimVineBack = Array.from(
        svg.querySelectorAll<SVGPathElement>(".rim-vine-back"),
      );
      const rimVineFront = Array.from(
        svg.querySelectorAll<SVGPathElement>(".rim-vine-front"),
      );
      const rimVineBridge = Array.from(
        svg.querySelectorAll<SVGPathElement>(".rim-vine-bridge"),
      );
      const rimVineCurl = Array.from(
        svg.querySelectorAll<SVGPathElement>(".rim-vine-curl"),
      );
      const rimVineMain = [
        ...rimVineBridge,
        ...rimVineBack,
        ...rimVineFront,
      ];
      const seasonalLeaves = Array.from(
        svg.querySelectorAll<SVGGElement>(".leaf-grow, .vine-leaf-grow"),
      );
      const autumnDropLeaves = seasonalLeaves.filter(
        (_, index) => index % 3 !== 0,
      );
      const leafBlades = Array.from(
        svg.querySelectorAll<SVGPathElement>(".leaf-blade"),
      );
      const seasonalFlowers = Array.from(
        svg.querySelectorAll<SVGGElement>(".flower-grow, .vine-flower-grow"),
      );
      const seasonalBuds = Array.from(
        svg.querySelectorAll<SVGGElement>(".bud-grow, .vine-bud-grow"),
      );
      const allPlantPaths = [
        ...stemBase,
        ...stemMid,
        ...stemTip,
        ...sideBase,
        ...sideTip,
      ];

      allPlantPaths.forEach((path) => {
        const length = path.getTotalLength();
        gsap.set(path, {
          strokeDasharray: length,
          strokeDashoffset: reducedMotion ? 0 : length,
        });
      });

      [...rimVineMain, ...rimVineCurl].forEach((path) => {
        const length = path.getTotalLength();
        gsap.set(path, {
          strokeDasharray: length,
          strokeDashoffset: reducedMotion ? 0 : length,
        });
      });

      gsap.set(".leaf-grow, .flower-grow, .bud-grow", {
        scale: reducedMotion ? 1 : 0,
        opacity: reducedMotion ? 1 : 0,
      });

      gsap.set(".vine-leaf-grow, .vine-flower-grow, .vine-bud-grow", {
        scale: reducedMotion ? 1 : 0,
        opacity: reducedMotion ? 1 : 0,
      });

      gsap.set(".leaf-grow", {
        transformOrigin: "0px 0px",
      });
      gsap.set(
        ".flower-grow, .bud-grow, .vine-flower-grow, .vine-bud-grow, .vine-leaf-grow",
        {
          transformOrigin: "0px 0px",
        },
      );

      gsap.set(".falling-leaf", {
        opacity: 0,
        x: 0,
        y: 0,
        rotate: 0,
        transformOrigin: "50% 50%",
      });

      gsap.set(".season-pointer", {
        rotate: 0,
        svgOrigin: `${CENTER} ${CENTER}`,
      });

      gsap.set(".dusk-layer, .night-layer, .dawn-layer", { opacity: 0 });
      gsap.set(".ambient-stars", { opacity: 0 });
      gsap.set(".moon-symbol", {
        opacity: 0.26,
        scale: 0.95,
        transformOrigin: "50% 50%",
      });
      gsap.set(".moon-halo", { opacity: 0 });
      gsap.set(root, { color: "#171713" });
      gsap.set(".ui-soft-surface", {
        backgroundColor: "rgba(255,255,255,.28)",
        borderColor: "rgba(23,23,19,.08)",
      });
      gsap.set(".moon-detail", { opacity: 0.58 });

      if (reducedMotion) {
        setPhase("day");
        return;
      }

      gsap.from(".tool-heading", {
        y: 12,
        opacity: 0,
        duration: 0.62,
        ease: "power3.out",
      });

      gsap.from(".artwork", {
        scale: 0.985,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
      });

      gsap.from(".dial", {
        scale: 0.975,
        opacity: 0,
        duration: 1.15,
        ease: "power3.out",
        svgOrigin: `${CENTER} ${CENTER}`,
      });

      gsap.to(".gear-outer", {
        rotate: 360,
        duration: 18,
        repeat: -1,
        ease: "none",
        svgOrigin: `${CENTER} ${CENTER}`,
      });

      gsap.to(".gear-middle", {
        rotate: -360,
        duration: 11.5,
        repeat: -1,
        ease: "none",
        svgOrigin: `${CENTER} ${CENTER}`,
      });

      gsap.to(".gear-inner", {
        rotate: 360,
        duration: 26,
        repeat: -1,
        ease: "none",
        svgOrigin: `${CENTER} ${CENTER}`,
      });

      gsap.to(".sun-top", {
        rotate: 360,
        duration: 44,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      });

      gsap.to(".sun-bottom", {
        rotate: -360,
        duration: 52,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      });

      gsap.to(".moon-a", {
        y: -3,
        duration: 4.2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to(".moon-b", {
        y: 3,
        duration: 4.6,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to(".ambient-star", {
        opacity: 0.22,
        scale: 1.3,
        duration: 1.9,
        stagger: {
          each: 0.045,
          from: "random",
        },
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to(".leaf-sway-even", {
        rotate: 1.3,
        duration: 4.2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        transformOrigin: "0px 0px",
      });

      gsap.to(".leaf-sway-odd", {
        rotate: -1.15,
        duration: 4.8,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        transformOrigin: "0px 0px",
      });

      gsap.to(".flower-sway", {
        rotate: 1.6,
        duration: 5.4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        transformOrigin: "0px 0px",
      });

      gsap.to(".vine-leaf-sway-even", {
        rotate: 0.9,
        duration: 5.6,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        transformOrigin: "0px 0px",
      });

      gsap.to(".vine-leaf-sway-odd", {
        rotate: -0.8,
        duration: 6.2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        transformOrigin: "0px 0px",
      });

      gsap.to(".pollen-dot", {
        y: -8,
        x: 3,
        opacity: 0.42,
        duration: 3.8,
        stagger: {
          each: 0.17,
          from: "random",
        },
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      const growth = gsap.timeline({
        delay: 0.55,
        defaults: { ease: "power1.inOut" },
      });

      growth
        .fromTo(
          ".growth-origin",
          { scale: 0.25, opacity: 0 },
          {
            scale: 1,
            opacity: 0.68,
            duration: 1.15,
            transformOrigin: "50% 50%",
            ease: "power2.out",
          },
        )
        .to(
          stemBase,
          {
            strokeDashoffset: 0,
            duration: 3.5,
            stagger: 0.09,
          },
          "-=0.1",
        )
        .to(
          stemMid,
          {
            strokeDashoffset: 0,
            duration: 3.2,
            stagger: 0.08,
          },
          "-=2.3",
        )
        .to(
          sideBase,
          {
            strokeDashoffset: 0,
            duration: 3.1,
            stagger: 0.055,
          },
          "-=1.8",
        )
        .to(
          stemTip,
          {
            strokeDashoffset: 0,
            duration: 2.8,
            stagger: 0.07,
          },
          "-=2.15",
        )
        .to(
          sideTip,
          {
            strokeDashoffset: 0,
            duration: 2.35,
            stagger: 0.045,
          },
          "-=1.8",
        )
        .to(
          ".leaf-grow",
          {
            scale: 1,
            opacity: 0.94,
            duration: 0.85,
            stagger: 0.04,
            ease: "back.out(1.2)",
          },
          "-=1.65",
        )
        .to(
          ".bud-grow",
          {
            scale: 1,
            opacity: 0.94,
            duration: 0.72,
            stagger: 0.08,
            ease: "back.out(1.25)",
          },
          "-=0.5",
        )
        .to(
          ".flower-grow",
          {
            scale: 1,
            opacity: 0.98,
            duration: 1.15,
            stagger: 0.09,
            ease: "back.out(1.45)",
          },
          "-=0.38",
        )
        .to(
          ".growth-glow",
          {
            opacity: 0.11,
            scale: 1.08,
            duration: 1.5,
            yoyo: true,
            repeat: 1,
            transformOrigin: "50% 50%",
            ease: "sine.inOut",
          },
          "-=0.25",
        )
        .to({}, { duration: 1.15 })
        .to(
          rimVineBridge,
          {
            strokeDashoffset: 0,
            duration: 2.8,
            stagger: 0.35,
            ease: "power1.inOut",
          },
        )
        .to(
          rimVineBack,
          {
            strokeDashoffset: 0,
            duration: 5.6,
            stagger: 0.72,
            ease: "power1.inOut",
          },
          "-=0.8",
        )
        .to(
          rimVineFront,
          {
            strokeDashoffset: 0,
            duration: 5.9,
            stagger: 0.76,
            ease: "power1.inOut",
          },
          "-=4.35",
        )
        .to(
          ".vine-leaf-grow",
          {
            scale: 1,
            opacity: 0.92,
            duration: 0.8,
            stagger: 0.14,
            ease: "back.out(1.2)",
          },
          "-=4.8",
        )
        .to(
          ".vine-bud-grow",
          {
            scale: 1,
            opacity: 0.92,
            duration: 0.75,
            stagger: 0.22,
            ease: "back.out(1.25)",
          },
          "-=2.4",
        )
        .to(
          ".vine-flower-grow",
          {
            scale: 1,
            opacity: 0.96,
            duration: 1.05,
            stagger: 0.28,
            ease: "back.out(1.4)",
          },
          "-=1.6",
        )
        .to(
          rimVineCurl,
          {
            strokeDashoffset: 0,
            duration: 2.4,
            stagger: 0.45,
            ease: "power2.inOut",
          },
          "-=1.2",
        );

      growthTimelineRef.current = growth;

      const seasonCycle = gsap.timeline({
        repeat: -1,
        delay: growth.duration() + 0.9,
        defaults: { ease: "sine.inOut" },
      });

      seasonCycle
        .to({}, { duration: SEASON_DURATION }, 0)
        .to(
          ".season-pointer",
          {
            rotate: 360,
            duration: SEASON_DURATION,
            ease: "none",
            svgOrigin: `${CENTER} ${CENTER}`,
          },
          0,
        )

        // The first run already ends the growth animation in spring.
        // On later loops, the last 8 seconds of winter slowly grow back into spring,
        // so the 72s -> 0s repeat boundary is visually seamless.
        .call(() => setSeason("spring"), [], 0)
        .call(() => setSeason("summer"), [], SEASON_TIME.summer)
        .call(() => setSeason("autumn"), [], SEASON_TIME.autumn)
        .call(() => setSeason("winter"), [], SEASON_TIME.winter)
        .call(() => setSeason("spring"), [], SPRING_LABEL_TIME)

        .set(
          ".falling-leaf",
          {
            opacity: 0,
            x: 0,
            y: 0,
            rotate: 0,
          },
          0,
        )

        // SUMMER — deeper greens, fuller leaves, flowers at their peak.
        .to(
          leafBlades,
          {
            fill: (index) =>
              SUMMER_LEAF_PALETTE[index % SUMMER_LEAF_PALETTE.length],
            duration: 5.2,
            stagger: 0.014,
          },
          SEASON_TIME.summer,
        )
        .to(
          ".plant-path",
          {
            stroke: (_index, target: SVGPathElement) =>
              target.dataset.tone === "soft" ? "#6f8c68" : "#58764f",
            duration: 5.2,
          },
          SEASON_TIME.summer,
        )
        .to(
          ".rim-vine-path",
          {
            stroke: "#647f59",
            duration: 5.2,
          },
          SEASON_TIME.summer,
        )
        .to(
          seasonalLeaves,
          {
            opacity: 1,
            scale: 1.035,
            duration: 4.8,
            stagger: 0.018,
          },
          SEASON_TIME.summer + 0.5,
        )
        .to(
          seasonalFlowers,
          {
            opacity: 1,
            scale: 1.08,
            duration: 4.6,
            stagger: 0.045,
            ease: "back.out(1.2)",
          },
          SEASON_TIME.summer + 0.8,
        )

        // AUTUMN — flowers recede, leaves warm into amber, then begin to fall.
        .to(
          seasonalFlowers,
          {
            opacity: 0.28,
            scale: 0.58,
            duration: 5.4,
            stagger: {
              each: 0.045,
              from: "random",
            },
          },
          SEASON_TIME.autumn,
        )
        .to(
          leafBlades,
          {
            fill: (index) =>
              AUTUMN_LEAF_PALETTE[index % AUTUMN_LEAF_PALETTE.length],
            duration: 5.4,
            stagger: 0.018,
          },
          SEASON_TIME.autumn,
        )
        .to(
          ".plant-path",
          {
            stroke: (_index, target: SVGPathElement) =>
              target.dataset.tone === "soft" ? "#9a825c" : "#7e6f52",
            duration: 5.8,
          },
          SEASON_TIME.autumn,
        )
        .to(
          ".rim-vine-path",
          {
            stroke: "#8b7651",
            duration: 5.8,
          },
          SEASON_TIME.autumn,
        )
        .to(
          autumnDropLeaves,
          {
            opacity: 0.12,
            scale: 0.62,
            duration: 8.2,
            stagger: {
              each: 0.05,
              from: "random",
            },
          },
          SEASON_TIME.autumn + 3,
        )
        .to(
          ".falling-leaf",
          {
            opacity: 0.95,
            duration: 0.55,
            stagger: 0.12,
          },
          SEASON_TIME.autumn + 2.2,
        )
        .to(
          ".falling-leaf",
          {
            x: (index) => FALLING_LEAVES[index]?.drift ?? 0,
            y: (index) => FALLING_LEAVES[index]?.fall ?? 110,
            rotate: (index) => FALLING_LEAVES[index]?.spin ?? 120,
            opacity: 0,
            duration: 7.8,
            stagger: 0.16,
            ease: "power1.in",
          },
          SEASON_TIME.autumn + 2.5,
        )

        // WINTER — the flowers and leaves gradually disappear,
        // leaving only the quiet structure of the branches.
        .to(
          seasonalFlowers,
          {
            opacity: 0,
            scale: 0.18,
            duration: 4.4,
            stagger: 0.035,
          },
          SEASON_TIME.winter,
        )
        .to(
          seasonalBuds,
          {
            opacity: 0,
            scale: 0.28,
            duration: 4,
            stagger: 0.04,
          },
          SEASON_TIME.winter,
        )
        .to(
          seasonalLeaves,
          {
            opacity: 0,
            scale: 0.12,
            duration: 5.8,
            stagger: {
              each: 0.04,
              from: "random",
            },
            ease: "power2.inOut",
          },
          SEASON_TIME.winter,
        )
        .to(
          ".plant-path",
          {
            stroke: (_index, target: SVGPathElement) =>
              target.dataset.tone === "soft" ? "#8a8579" : "#706d64",
            duration: 5.8,
          },
          SEASON_TIME.winter,
        )
        .to(
          ".rim-vine-path",
          {
            stroke: "#767166",
            duration: 5.8,
          },
          SEASON_TIME.winter,
        )

        // LATE WINTER -> EARLY SPRING
        // Instead of snapping at the repeat boundary, spring begins before
        // the pointer reaches the top again: branches warm first, then leaves,
        // then buds, then flowers.
        .set(
          ".falling-leaf",
          {
            opacity: 0,
            x: 0,
            y: 0,
            rotate: 0,
          },
          SPRING_REBIRTH_START,
        )
        .to(
          ".plant-path",
          {
            stroke: (_index, target: SVGPathElement) =>
              target.dataset.tone === "soft" ? "#82977a" : "#748b6b",
            duration: 7.2,
            ease: "sine.inOut",
          },
          SPRING_REBIRTH_START,
        )
        .to(
          ".rim-vine-path",
          {
            stroke: "#7c946f",
            duration: 7.2,
            ease: "sine.inOut",
          },
          SPRING_REBIRTH_START,
        )
        .to(
          leafBlades,
          {
            fill: (index) =>
              SPRING_LEAF_PALETTE[index % SPRING_LEAF_PALETTE.length],
            duration: 5.8,
            stagger: 0.018,
            ease: "sine.inOut",
          },
          SPRING_REBIRTH_START + 0.3,
        )
        .fromTo(
          seasonalLeaves,
          {
            opacity: 0,
            scale: 0.12,
            x: 0,
            y: 0,
            rotate: 0,
          },
          {
            opacity: 0.94,
            scale: 1,
            x: 0,
            y: 0,
            rotate: 0,
            duration: 5.2,
            stagger: {
              each: 0.045,
              from: "random",
            },
            ease: "power2.out",
            immediateRender: false,
          },
          SPRING_REBIRTH_START + 0.7,
        )
        .fromTo(
          seasonalBuds,
          {
            opacity: 0,
            scale: 0.18,
          },
          {
            opacity: 0.94,
            scale: 1,
            duration: 4.2,
            stagger: 0.065,
            ease: "back.out(1.12)",
            immediateRender: false,
          },
          SPRING_REBIRTH_START + 1.8,
        )
        .fromTo(
          seasonalFlowers,
          {
            opacity: 0,
            scale: 0.08,
          },
          {
            opacity: 0.98,
            scale: 1,
            duration: 4.6,
            stagger: 0.065,
            ease: "back.out(1.16)",
            immediateRender: false,
          },
          SPRING_REBIRTH_START + 2.8,
        )
        .to(
          ".growth-glow",
          {
            opacity: 0.085,
            scale: 1.06,
            duration: 2.3,
            yoyo: true,
            repeat: 1,
            transformOrigin: "50% 50%",
            ease: "sine.inOut",
          },
          SPRING_REBIRTH_START + 1.5,
        );

      seasonCycle.timeScale(cycleSpeed);
      seasonTimelineRef.current = seasonCycle;

      const cycle = gsap.timeline({
        repeat: -1,
        defaults: { ease: "sine.inOut" },
      });

      cycle
        .to({}, { duration: CYCLE_DURATION }, 0)
        .to(
          ".main-pointer",
          {
            rotate: 360,
            duration: CYCLE_DURATION,
            ease: "none",
            svgOrigin: `${CENTER} ${CENTER}`,
          },
          0,
        )
        .call(() => setPhase("day"), [], 0)
        .call(() => setPhase("dusk"), [], PHASE_TIME.dusk)
        .call(() => setPhase("night"), [], PHASE_TIME.night)
        .call(() => setPhase("dawn"), [], PHASE_TIME.dawn)
        .call(() => setPhase("day"), [], 56)

        .to(
          ".sunset-orb",
          {
            opacity: 0.72,
            xPercent: 20,
            yPercent: 7,
            duration: 7,
          },
          PHASE_TIME.dusk,
        )
        .to(
          ".dusk-layer",
          {
            opacity: 0.52,
            duration: 7.5,
          },
          PHASE_TIME.dusk,
        )
        .to(
          ".night-layer",
          {
            opacity: 0.22,
            duration: 8.5,
          },
          PHASE_TIME.dusk + 1.5,
        )
        .to(
          ".sun-symbol",
          {
            opacity: 0.48,
            scale: 0.96,
            duration: 6.2,
          },
          PHASE_TIME.dusk + 0.5,
        )
        .to(
          ".moon-symbol",
          {
            opacity: 0.56,
            scale: 0.99,
            duration: 6.2,
          },
          PHASE_TIME.dusk + 1,
        )

        .to(
          ".night-layer",
          {
            opacity: 1,
            duration: 7.5,
          },
          PHASE_TIME.night,
        )
        .to(
          ".dusk-layer",
          {
            opacity: 0.05,
            duration: 6.2,
          },
          PHASE_TIME.night,
        )
        .to(
          ".sunset-orb",
          {
            opacity: 0,
            duration: 6.2,
          },
          PHASE_TIME.night,
        )
        .to(
          ".ambient-stars",
          {
            opacity: 0.96,
            duration: 6,
          },
          PHASE_TIME.night + 0.6,
        )
        .to(
          ".sun-symbol",
          {
            opacity: 0.1,
            scale: 0.9,
            duration: 5.6,
          },
          PHASE_TIME.night,
        )
        .to(
          ".moon-symbol",
          {
            opacity: 1,
            scale: 1.04,
            duration: 5.2,
          },
          PHASE_TIME.night + 0.4,
        )
        .to(
          ".moon-halo",
          {
            opacity: 0.23,
            duration: 5.2,
          },
          PHASE_TIME.night + 0.8,
        )
        .to(
          root,
          {
            color: "#f3f7fb",
            duration: 6.5,
          },
          PHASE_TIME.night,
        )
        .to(
          ".ui-soft-surface",
          {
            backgroundColor: "rgba(14,24,38,.38)",
            borderColor: "rgba(226,236,246,.14)",
            duration: 6.5,
          },
          PHASE_TIME.night,
        )
        .to(
          ".moon-detail",
          {
            opacity: 0.95,
            duration: 5.2,
          },
          PHASE_TIME.night + 0.6,
        )
        .to(
          ".dial-main, .pointer-line, .pointer-ring",
          {
            stroke: "#d5dee7",
            duration: 7,
          },
          PHASE_TIME.night,
        )
        .to(
          ".dial-inner",
          {
            stroke: "#758395",
            duration: 7,
          },
          PHASE_TIME.night,
        )
        .to(
          ".tick-mark",
          {
            stroke: "#aeb9c5",
            duration: 7,
          },
          PHASE_TIME.night,
        )
        .to(
          ".plant-path, .rim-vine-path",
          {
            stroke: "#7e978b",
            duration: 7,
          },
          PHASE_TIME.night,
        )
        .to(
          ".botanical-system",
          {
            opacity: 0.88,
            duration: 7,
          },
          PHASE_TIME.night,
        )
        .to(
          ".gear-night-face",
          {
            fill: "#d7dce0",
            stroke: "#687383",
            duration: 7,
          },
          PHASE_TIME.night,
        )

        .to(
          ".dawn-orb",
          {
            opacity: 0.76,
            xPercent: -17,
            yPercent: -6,
            duration: 5.5,
          },
          PHASE_TIME.dawn,
        )
        .to(
          ".dawn-layer",
          {
            opacity: 0.54,
            duration: 5.5,
          },
          PHASE_TIME.dawn,
        )
        .to(
          ".night-layer",
          {
            opacity: 0,
            duration: 9,
          },
          PHASE_TIME.dawn,
        )
        .to(
          ".ambient-stars",
          {
            opacity: 0,
            duration: 7.5,
          },
          PHASE_TIME.dawn,
        )
        .to(
          ".moon-symbol",
          {
            opacity: 0.26,
            scale: 0.95,
            duration: 6,
          },
          PHASE_TIME.dawn,
        )
        .to(
          ".moon-halo",
          {
            opacity: 0,
            duration: 5,
          },
          PHASE_TIME.dawn,
        )
        .to(
          root,
          {
            color: "#171713",
            duration: 7,
          },
          PHASE_TIME.dawn,
        )
        .to(
          ".ui-soft-surface",
          {
            backgroundColor: "rgba(255,255,255,.28)",
            borderColor: "rgba(23,23,19,.08)",
            duration: 7,
          },
          PHASE_TIME.dawn,
        )
        .to(
          ".moon-detail",
          {
            opacity: 0.58,
            duration: 5.5,
          },
          PHASE_TIME.dawn,
        )
        .to(
          ".sun-symbol",
          {
            opacity: 1,
            scale: 1,
            duration: 6.2,
          },
          PHASE_TIME.dawn + 0.4,
        )
        .to(
          ".dial-main, .pointer-line, .pointer-ring",
          {
            stroke: "#3f3b35",
            duration: 7.5,
          },
          PHASE_TIME.dawn,
        )
        .to(
          ".dial-inner",
          {
            stroke: "#9b958b",
            duration: 7.5,
          },
          PHASE_TIME.dawn,
        )
        .to(
          ".tick-mark",
          {
            stroke: "#4d4942",
            duration: 7.5,
          },
          PHASE_TIME.dawn,
        )
        .to(
          ".plant-path, .rim-vine-path",
          {
            stroke: (_index, target: SVGPathElement) =>
              target.dataset.tone === "soft"
                ? "#82977a"
                : target.dataset.tone === "vine"
                  ? "#7c946f"
                  : "#748b6b",
            duration: 7.5,
          },
          PHASE_TIME.dawn,
        )
        .to(
          ".botanical-system",
          {
            opacity: 1,
            duration: 7.5,
          },
          PHASE_TIME.dawn,
        )
        .to(
          ".gear-night-face",
          {
            fill: "#ede7dc",
            stroke: "#514b43",
            duration: 7.5,
          },
          PHASE_TIME.dawn,
        )
        .to(
          ".dawn-layer",
          {
            opacity: 0,
            duration: 5.2,
          },
          54,
        )
        .to(
          ".dusk-layer",
          {
            opacity: 0,
            duration: 5.2,
          },
          54,
        );

      cycle.timeScale(cycleSpeed);
      cycleTimelineRef.current = cycle;
    }, root);

    const onResize = () => positionAttachments();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      cycleTimelineRef.current = null;
      seasonTimelineRef.current = null;
      growthTimelineRef.current = null;
      ctx.revert();
    };
  }, []);

  useEffect(() => {
    cycleTimelineRef.current?.timeScale(cycleSpeed);
    seasonTimelineRef.current?.timeScale(cycleSpeed);
  }, [cycleSpeed]);

  const toggleCycle = () => {
    const cycle = cycleTimelineRef.current;
    const seasonCycle = seasonTimelineRef.current;
    if (!cycle) return;

    if (cycle.paused()) {
      cycle.resume();
      seasonCycle?.resume();
      setPaused(false);
    } else {
      cycle.pause();
      seasonCycle?.pause();
      setPaused(true);
    }
  };

  const previewPhase = (target: Phase) => {
    const cycle = cycleTimelineRef.current;
    if (!cycle) return;

    cycle.pause();
    seasonTimelineRef.current?.pause();
    setPaused(true);

    gsap.to(cycle, {
      time: PHASE_TIME[target],
      duration: 1.15,
      ease: "power2.inOut",
      overwrite: true,
      onComplete: () => setPhase(target),
    });
  };

  const replayGrowth = () => {
    const svg = svgRef.current;
    const growth = growthTimelineRef.current;
    const seasonCycle = seasonTimelineRef.current;
    if (!svg || !growth) return;

    const paths = Array.from(
      svg.querySelectorAll<SVGPathElement>(
        ".plant-path, .rim-vine-path",
      ),
    );

    paths.forEach((path) => {
      const length = path.getTotalLength();
      gsap.set(path, {
        strokeDasharray: length,
        strokeDashoffset: length,
      });
    });

    gsap.set(
      ".leaf-grow, .flower-grow, .bud-grow, .vine-leaf-grow, .vine-flower-grow, .vine-bud-grow",
      {
        scale: 0,
        opacity: 0,
      },
    );

    gsap.set(".growth-origin", {
      scale: 0.25,
      opacity: 0,
    });

    setSeason("spring");
    seasonCycle?.restart(true);
    growth.restart();
  };

  return (
    <div
      ref={rootRef}
      className="ui-ink relative min-h-[calc(100dvh-4rem)] overflow-hidden bg-[#ddd8cf] text-[#171713]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_43%,#fffdf7_0%,#f3eddf_57%,#ddd8cf_100%)]" />
      <div className="dusk-layer pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(218,151,116,.36)_0%,rgba(176,121,137,.2)_43%,rgba(73,84,111,.18)_100%)] opacity-0" />
      <div className="night-layer pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_47%,rgba(66,103,140,.2),transparent_31%),radial-gradient(circle_at_86%_46%,rgba(66,103,140,.17),transparent_31%),linear-gradient(180deg,#101a2a_0%,#0a1422_50%,#07101a_100%)] opacity-0" />
      <div className="dawn-layer pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(220,153,139,.28)_0%,rgba(236,194,157,.12)_40%,transparent_72%)] opacity-0" />

      <div className="sunset-orb pointer-events-none absolute left-[18%] top-[7%] h-[46vw] w-[46vw] max-h-[620px] max-w-[620px] rounded-full bg-[#e3a06e]/35 opacity-0 blur-[100px]" />
      <div className="dawn-orb pointer-events-none absolute bottom-[2%] left-[20%] h-[42vw] w-[42vw] max-h-[560px] max-w-[560px] rounded-full bg-[#f1c78d]/34 opacity-0 blur-[105px]" />

      <div className="ambient-stars pointer-events-none absolute inset-0 opacity-0">
        {ambientStars.map((star, index) => (
          <span
            key={index}
            className="ambient-star absolute rounded-full bg-[#dce9f7]"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
              boxShadow:
                star.size > 1
                  ? "0 0 9px rgba(182,216,246,.5)"
                  : undefined,
            }}
          />
        ))}
      </div>

      <header className="tool-heading absolute left-4 top-5 z-30 max-w-[390px] sm:left-7 sm:top-7">
        <div className="text-[8px] font-semibold uppercase tracking-[0.24em] text-current/42">
        < Breadcrumb />
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.055em] sm:text-3xl">
          时序花园
        </h1>
        <p className="mt-2 max-w-[350px] text-[10px] font-medium leading-5 text-current/54 sm:text-[11px]">
          让时间慢一点，让光、枝叶和花，陪你走完这一圈。
        </p>
      </header>

      <div className="absolute right-4 top-5 z-30 flex flex-col items-end gap-1.5 sm:right-7 sm:top-7">
        <div className="ui-soft-surface rounded-full border border-current/[0.08] bg-white/28 px-3 py-2 text-[8px] font-semibold tracking-[0.18em] text-current/70 backdrop-blur-xl">
          {PHASE_LABEL[phase]}
        </div>
        <div className="ui-soft-surface rounded-full border border-current/[0.08] bg-white/28 px-3 py-2 text-[8px] font-semibold tracking-[0.14em] text-current/70 backdrop-blur-xl">
          {SEASON_LABEL[season]}
        </div>
      </div>

      <aside className="pointer-events-none absolute right-5 top-1/2 z-20 hidden w-[220px] -translate-y-1/2 text-right lg:block">
        <div className="text-[8px] font-semibold uppercase tracking-[0.22em] text-current/28">
          {PHASE_COPY[phase].eyebrow}
        </div>
        <div className="mt-3 text-[clamp(1.2rem,1.8vw,1.7rem)] font-semibold leading-[1.05] tracking-[-0.045em] text-current/72">
          {PHASE_COPY[phase].title}
        </div>
        <p className="mt-3 ml-auto max-w-[210px] text-[10px] font-medium leading-5 text-current/44">
          {PHASE_COPY[phase].body}
        </p>
        <div className="mt-7 ml-auto h-px w-12 bg-current/12" />
        <div className="mt-4 text-[8px] font-semibold tracking-[0.16em] text-current/38">
          {SEASON_LABEL[season]}
        </div>
        <p className="mt-2 ml-auto max-w-[205px] text-[10px] font-medium leading-5 text-current/44">
          {SEASON_NOTE[season]}
        </p>
      </aside>

      <div className="pointer-events-none absolute bottom-24 left-5 z-20 hidden max-w-[250px] lg:block">
        <div className="h-px w-14 bg-current/12" />
        <p className="mt-4 text-[9px] font-medium leading-5 tracking-[0.03em] text-current/28">
          有些日子不需要走得很快，
          <br />
          只要还有光，还有花在慢慢长，
          <br />
          时间就会变得温柔一点。
        </p>
      </div>

      <main className="relative z-10 flex min-h-[calc(100dvh-4rem)] items-center justify-center px-2 py-20 sm:px-8 sm:py-10">
        <div
          className="artwork relative shrink-0"
          style={{
            width: "min(94vw, 82vh, 980px)",
            height: "min(94vw, 82vh, 980px)",
          }}
        >
          <svg
            ref={svgRef}
            className="h-full w-full overflow-visible"
            viewBox="0 0 1000 1000"
            role="img"
            aria-label="时序花园：机械表盘、自然植物生长、昼夜变化与四季轮转"
          >
            <defs>
              <filter
                id="gearShadow"
                x="-60%"
                y="-60%"
                width="220%"
                height="220%"
              >
                <feDropShadow
                  dx="0"
                  dy="5"
                  stdDeviation="7"
                  floodColor="#5d554a"
                  floodOpacity="0.13"
                />
              </filter>

              <filter
                id="growthGlow"
                x="-120%"
                y="-120%"
                width="340%"
                height="340%"
              >
                <feGaussianBlur stdDeviation="11" />
              </filter>

              <clipPath id="plantClip" clipPathUnits="userSpaceOnUse">
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={PLANT_SAFE_RADIUS}
                />
              </clipPath>

              <clipPath id="rimVineClip" clipPathUnits="userSpaceOnUse">
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r="331"
                />
              </clipPath>
            </defs>

            <g opacity="0.1">
              {Array.from({ length: 12 }).map((_, row) =>
                Array.from({ length: 12 }).map((__, col) => (
                  <circle
                    key={`${row}-${col}`}
                    cx={62 + col * 80}
                    cy={65 + row * 79}
                    r={row % 4 === 0 ? 4.5 : 2.2}
                    fill="none"
                    stroke="#8d877c"
                    strokeWidth="0.75"
                  />
                )),
              )}
            </g>

            <g
              fill="none"
              stroke="#c39b55"
              strokeWidth="1.15"
              opacity="0.42"
            >
              {[
                [276, 155, 8],
                [692, 174, 7],
                [164, 321, 7],
                [835, 341, 7],
                [154, 781, 6],
                [747, 818, 7],
                [878, 710, 6],
              ].map(([x, y, r], index) => (
                <path
                  key={index}
                  d={`M${x} ${y - r} L${x + 2} ${y - 2} L${x + r} ${y} L${x + 2} ${y + 2} L${x} ${y + r} L${x - 2} ${y + 2} L${x - r} ${y} L${x - 2} ${y - 2} Z`}
                />
              ))}
            </g>

            <g className="sun-symbol" transform="translate(500 83)">
              <g className="sun-top">
                <circle
                  cx="0"
                  cy="0"
                  r="19"
                  fill="none"
                  stroke="#b18b42"
                  strokeWidth="2.1"
                />
                {Array.from({ length: 12 }).map((_, index) => (
                  <line
                    key={index}
                    x1="0"
                    y1="-30"
                    x2="0"
                    y2="-41"
                    stroke="#b18b42"
                    strokeWidth="1.9"
                    transform={`rotate(${index * 30})`}
                    opacity="0.75"
                  />
                ))}
              </g>
            </g>

            <g className="sun-symbol" transform="translate(500 918)">
              <g className="sun-bottom">
                <circle
                  cx="0"
                  cy="0"
                  r="17"
                  fill="none"
                  stroke="#b18b42"
                  strokeWidth="2"
                  opacity="0.68"
                />
                {Array.from({ length: 12 }).map((_, index) => (
                  <line
                    key={index}
                    x1="0"
                    y1="-27"
                    x2="0"
                    y2="-37"
                    stroke="#b18b42"
                    strokeWidth="1.7"
                    transform={`rotate(${index * 30})`}
                    opacity="0.58"
                  />
                ))}
              </g>
            </g>

            <MoonMark side="left" />

            <MoonMark side="right" />

            {/* Stage 02 background: these segments pass BEHIND the metal rim */}
            <g className="rim-vine-back-system">
              {rimVines
                .filter((vine) => vine.id.includes("-back-"))
                .map((vine) => (
                  <path
                    key={vine.id}
                    id={vine.id}
                    className="rim-vine-path rim-vine-back"
                    data-tone="vine"
                    d={vine.d}
                    fill="none"
                    stroke="#72886a"
                    strokeWidth={vine.width}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.56"
                  />
                ))}
            </g>

            <g className="dial">
              <circle
                className="dial-main"
                cx={CENTER}
                cy={CENTER}
                r={DIAL_RADIUS}
                fill="rgba(255,255,255,.045)"
                stroke="#3f3b35"
                strokeWidth="2.05"
              />

              <circle
                className="dial-inner"
                cx={CENTER}
                cy={CENTER}
                r={DIAL_RADIUS - 13}
                fill="none"
                stroke="#9b958b"
                strokeWidth="1"
                opacity="0.56"
              />

              {ticks.map((tick, index) => (
                <line
                  key={index}
                  className="tick-mark"
                  x1={CENTER}
                  y1={tick.major ? 134 : 143}
                  x2={CENTER}
                  y2={tick.major ? 166 : 157}
                  stroke="#4d4942"
                  strokeWidth={tick.major ? 3.15 : 1.1}
                  transform={`rotate(${tick.rotate} ${CENTER} ${CENTER})`}
                  opacity={tick.major ? 0.86 : 0.46}
                />
              ))}

              <g className="season-marks" fill="currentColor" opacity="0.34">
                <text x="500" y="205" textAnchor="middle" fontSize="13" fontWeight="600" letterSpacing="2.4">
                  春
                </text>
                <text x="795" y="505" textAnchor="middle" dominantBaseline="middle" fontSize="13" fontWeight="600" letterSpacing="2.4">
                  夏
                </text>
                <text x="500" y="803" textAnchor="middle" fontSize="13" fontWeight="600" letterSpacing="2.4">
                  秋
                </text>
                <text x="205" y="505" textAnchor="middle" dominantBaseline="middle" fontSize="13" fontWeight="600" letterSpacing="2.4">
                  冬
                </text>
              </g>
            </g>

            <g
              className="botanical-system"
              clipPath="url(#plantClip)"
            >
              <circle
                className="growth-glow"
                cx={CENTER}
                cy={CENTER}
                r="74"
                fill="#bdcba5"
                opacity="0"
                filter="url(#growthGlow)"
              />

              {stems.map((stem) => (
                <path
                  key={stem.id}
                  id={stem.id}
                  className={`plant-path ${stem.stage}`}
                  data-tone={stem.tone ?? "main"}
                  d={stem.d}
                  fill="none"
                  stroke={stem.tone === "soft" ? "#82977a" : "#748b6b"}
                  strokeWidth={stem.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={stem.tone === "soft" ? 0.75 : 0.84}
                />
              ))}

              {leaves.map((leaf, index) => (
                <g
                  key={`leaf-${index}`}
                  data-path={leaf.path}
                  data-t={leaf.t}
                  data-angle={leaf.angle ?? 0}
                >
                  <g className="leaf-grow">
                    <g
                      className={
                        index % 2 === 0
                          ? "leaf-sway-even"
                          : "leaf-sway-odd"
                      }
                    >
                      <LeafGlyph leaf={leaf} />
                    </g>
                  </g>
                </g>
              ))}

              {buds.map((bud, index) => (
                <g
                  key={`bud-${index}`}
                  data-path={bud.path}
                  data-t={bud.t}
                  data-angle={bud.angle ?? 0}
                >
                  <g className="bud-grow">
                    <BudGlyph scale={bud.scale} />
                  </g>
                </g>
              ))}

              {flowers.map((flower, index) => (
                <g
                  key={`flower-${index}`}
                  data-path={flower.path}
                  data-t={flower.t}
                  data-angle={flower.angle ?? 0}
                >
                  <g className="flower-grow">
                    <g className="flower-sway">
                      <FlowerGlyph flower={flower} />
                    </g>
                  </g>
                </g>
              ))}

              <g opacity="0.28">
                {pollen.map((dot, index) => (
                  <circle
                    key={index}
                    className="pollen-dot"
                    cx={dot.x}
                    cy={dot.y}
                    r={dot.r}
                    fill="#c7a75d"
                  />
                ))}
              </g>

              <g className="falling-leaves" pointerEvents="none">
                {FALLING_LEAVES.map((leaf, index) => (
                  <g
                    key={`falling-leaf-${index}`}
                    transform={`translate(${leaf.x} ${leaf.y})`}
                  >
                    <g className="falling-leaf">
                      <path
                        d="M0 0 C7 -11 18 -13 25 -4 C20 5 10 8 0 0 Z"
                        fill={leaf.fill}
                        stroke="#8a673f"
                        strokeWidth="0.7"
                        transform={`rotate(${leaf.rotate}) scale(${leaf.scale})`}
                      />
                    </g>
                  </g>
                ))}
              </g>

              <g className="growth-origin">
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r="18"
                  fill="#d8e0bc"
                  opacity="0.2"
                />
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r="4.5"
                  fill="#9eac7b"
                  opacity="0.72"
                />
              </g>
            </g>
            {/* Stage 02 foreground: these segments pass OVER the metal rim */}
            <g className="rim-vine-front-system">
              {rimVines
                .filter(
                  (vine) =>
                    vine.id.includes("-front-") ||
                    vine.id.includes("-curl") ||
                    vine.id.includes("-bridge"),
                )
                .map((vine) => (
                  <path
                    key={vine.id}
                    id={vine.id}
                    className={`rim-vine-path ${
                      vine.id.includes("-bridge")
                        ? "rim-vine-bridge"
                        : vine.curl
                          ? "rim-vine-curl"
                          : "rim-vine-front"
                    }`}
                    data-tone="vine"
                    d={vine.d}
                    fill="none"
                    stroke="#7c946f"
                    strokeWidth={vine.width}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={vine.curl ? 0.7 : 0.8}
                  />
                ))}

              {rimVineLeaves.map((leaf, index) => (
                <g
                  key={`vine-leaf-${index}`}
                  data-path={leaf.path}
                  data-t={leaf.t}
                  data-angle={leaf.angle ?? 0}
                >
                  <g className="vine-leaf-grow">
                    <g
                      className={
                        index % 2 === 0
                          ? "vine-leaf-sway-even"
                          : "vine-leaf-sway-odd"
                      }
                    >
                      <LeafGlyph leaf={leaf} />
                    </g>
                  </g>
                </g>
              ))}

              {rimVineBuds.map((bud, index) => (
                <g
                  key={`vine-bud-${index}`}
                  data-path={bud.path}
                  data-t={bud.t}
                  data-angle={bud.angle ?? 0}
                >
                  <g className="vine-bud-grow">
                    <BudGlyph scale={bud.scale} />
                  </g>
                </g>
              ))}

              {rimVineFlowers.map((flower, index) => (
                <g
                  key={`vine-flower-${index}`}
                  data-path={flower.path}
                  data-t={flower.t}
                  data-angle={flower.angle ?? 0}
                >
                  <g className="vine-flower-grow">
                    <g className="flower-sway">
                      <FlowerGlyph flower={flower} />
                    </g>
                  </g>
                </g>
              ))}
            </g>

            <g className="season-pointer" opacity="0.78">
              <line
                x1={CENTER}
                y1={CENTER}
                x2={CENTER}
                y2="226"
                stroke="#a88a4e"
                strokeWidth="1.55"
                strokeLinecap="round"
              />
              <path
                d="M500 214 L493 229 L507 229 Z"
                fill="#c7aa67"
                stroke="#8e7442"
                strokeWidth="0.9"
              />
              <circle
                cx={CENTER}
                cy="226"
                r="5.2"
                fill="#efe4c6"
                stroke="#9f844d"
                strokeWidth="1.1"
              />
            </g>

            <g className="main-pointer">
              <line
                className="pointer-line"
                x1={CENTER}
                y1={CENTER}
                x2="858"
                y2={CENTER}
                stroke="#3f3b35"
                strokeWidth="2.8"
              />
              <line
                className="pointer-line"
                x1={CENTER}
                y1={CENTER}
                x2="142"
                y2={CENTER}
                stroke="#3f3b35"
                strokeWidth="2.8"
              />

              <circle
                className="pointer-ring"
                cx="858"
                cy={CENTER}
                r="17"
                fill="rgba(245,240,230,.72)"
                stroke="#3f3b35"
                strokeWidth="1.9"
              />
              <circle
                cx="858"
                cy={CENTER}
                r="5.5"
                fill="#4c4842"
              />

              <circle
                className="pointer-ring"
                cx="142"
                cy={CENTER}
                r="17"
                fill="rgba(245,240,230,.72)"
                stroke="#3f3b35"
                strokeWidth="1.9"
              />
              <circle
                cx="142"
                cy={CENTER}
                r="5.5"
                fill="#4c4842"
              />
            </g>

            <g filter="url(#gearShadow)">
              <g className="gear-outer">
                {Array.from({ length: 30 }).map((_, index) => (
                  <rect
                    key={index}
                    x="496"
                    y="424"
                    width="8"
                    height="18"
                    rx="1.5"
                    fill="#5d564d"
                    transform={`rotate(${index * 12} 500 500)`}
                  />
                ))}
                <circle
                  className="gear-night-face"
                  cx={CENTER}
                  cy={CENTER}
                  r="67"
                  fill="#ede7dc"
                  stroke="#514b43"
                  strokeWidth="2.2"
                />
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r="56"
                  fill="none"
                  stroke="#968f84"
                  strokeWidth="1.35"
                />
              </g>

              <g className="gear-middle">
                {Array.from({ length: 18 }).map((_, index) => (
                  <rect
                    key={index}
                    x="497"
                    y="447"
                    width="6"
                    height="12"
                    rx="1.2"
                    fill="#756d62"
                    transform={`rotate(${index * 20} 500 500)`}
                  />
                ))}
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r="42"
                  fill="#e4ddd1"
                  stroke="#5c554c"
                  strokeWidth="2"
                />
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r="31"
                  fill="none"
                  stroke="#91897d"
                  strokeWidth="1.4"
                  strokeDasharray="5 4"
                />
              </g>

              <g className="gear-inner">
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r="17"
                  fill="#c9b889"
                  stroke="#64594b"
                  strokeWidth="1.4"
                />
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r="7"
                  fill="#f5f0e5"
                  stroke="#665d52"
                  strokeWidth="1.1"
                />
              </g>
            </g>
          </svg>
        </div>
      </main>

      <div className="absolute bottom-4 left-1/2 z-30 w-[calc(100%-2rem)] max-w-[720px] -translate-x-1/2 sm:bottom-6">
        <div className="ui-soft-surface rounded-[22px] border border-current/[0.075] bg-white/26 p-2 shadow-[0_18px_60px_-40px_rgba(24,24,20,.35)] backdrop-blur-xl">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="grid flex-1 grid-cols-4 gap-1 rounded-[15px] bg-black/[0.025] p-1">
              {(["day", "dusk", "night", "dawn"] as Phase[]).map(
                (item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => previewPhase(item)}
                    className={`rounded-xl px-2 py-2 text-[8px] font-semibold tracking-[0.13em] transition ${
                      phase === item
                        ? "bg-white/78 text-black/72 shadow-sm"
                        : "text-current/52 hover:bg-white/18 hover:text-current/82"
                    }`}
                  >
                    {PHASE_LABEL[item]}
                  </button>
                ),
              )}
            </div>

            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <div className="flex rounded-full bg-black/[0.025] p-1">
                {[0.75, 1, 1.35].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCycleSpeed(item)}
                    className={`rounded-full px-2.5 py-1.5 text-[8px] font-semibold transition ${
                      cycleSpeed === item
                        ? "bg-white/78 text-black/70 shadow-sm"
                        : "text-current/50 hover:text-current/82"
                    }`}
                    title="昼夜与四季循环速度"
                  >
                    {item}×
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={replayGrowth}
                className="rounded-full border border-current/[0.07] bg-white/36 px-3 py-2 text-[8px] font-semibold tracking-[0.1em] text-current/66 transition hover:bg-white/45"
              >
                REGROW
              </button>

              <button
                type="button"
                onClick={toggleCycle}
                className="rounded-full bg-[#171714] px-3.5 py-2 text-[8px] font-semibold tracking-[0.1em] text-white transition hover:scale-[1.02] active:scale-[0.98]"
              >
                {paused ? "RESUME" : "PAUSE"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MoonMark({ side }: { side: "left" | "right" }) {
  const isLeft = side === "left";
  const x = isLeft ? 80 : 920;
  const mirror = isLeft ? 1 : -1;

  return (
    <g
      className="moon-symbol"
      transform={`translate(${x} 500) scale(${mirror} 1)`}
    >
      <circle
        className="moon-halo"
        cx="16"
        cy="0"
        r="48"
        fill="#7db7e7"
        opacity="0"
      />

      <g className={isLeft ? "moon-a" : "moon-b"}>
        <circle
          cx="13"
          cy="0"
          r="28"
          fill="none"
          stroke="#87a8c2"
          strokeWidth="1"
          opacity="0.18"
        />

        <path
          d="M18 -24 C-2 -20 -13 -3 -7 15 C-1 34 20 38 35 23 C19 27 8 19 5 7 C2 -7 7 -19 18 -24 Z"
          fill="#91aec5"
          stroke="#7598b4"
          strokeWidth="1"
          opacity="0.78"
        />

        <path
          className="moon-detail"
          d="M13 -18 C3 -12 -1 -2 2 8 C5 18 13 23 22 23"
          fill="none"
          stroke="#dce8ef"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.58"
        />

        <circle
          className="moon-detail"
          cx="28"
          cy="-17"
          r="2.4"
          fill="#d5e5ef"
          opacity="0.58"
        />
        <circle
          className="moon-detail"
          cx="39"
          cy="-4"
          r="1.5"
          fill="#d5e5ef"
          opacity="0.42"
        />
        <circle
          className="moon-detail"
          cx="31"
          cy="16"
          r="1.8"
          fill="#d5e5ef"
          opacity="0.46"
        />

        <path
          d="M49 -8 L51 -2 L57 0 L51 2 L49 8 L47 2 L41 0 L47 -2 Z"
          fill="#c9b174"
          opacity="0.5"
        />
      </g>
    </g>
  );
}

function LeafGlyph({ leaf }: { leaf: LeafAttachment }) {
  const direction = leaf.side;
  const pair = leaf.pair ?? false;

  return (
    <g transform={`scale(${leaf.scale})`}>
      <g transform={`rotate(${direction * -43})`}>
        <path
          d="M0 0 C5 -1 10 -4 15 -8"
          fill="none"
          stroke="#718168"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <g transform="translate(15 -8) rotate(-8)">
          <path
            className="leaf-blade"
            d="M0 0 C8 -14 22 -16 33 -6 C27 5 14 9 0 0 Z"
            fill={leafFill[leaf.tone]}
            stroke="#607659"
            strokeWidth="0.8"
          />
          <path
            d="M2 0 C11 -3 20 -5 29 -5"
            fill="none"
            stroke="#5d7155"
            strokeWidth="0.7"
            opacity="0.55"
          />
        </g>
      </g>

      {pair && (
        <g transform={`rotate(${direction * 44}) scale(.88)`}>
          <path
            d="M0 0 C5 1 10 4 15 8"
            fill="none"
            stroke="#718168"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <g transform="translate(15 8) rotate(8) scale(1 -1)">
            <path
              className="leaf-blade"
            d="M0 0 C8 -14 22 -16 33 -6 C27 5 14 9 0 0 Z"
              fill={leafFill[leaf.tone]}
              stroke="#607659"
              strokeWidth="0.8"
            />
            <path
              d="M2 0 C11 -3 20 -5 29 -5"
              fill="none"
              stroke="#5d7155"
              strokeWidth="0.7"
              opacity="0.55"
            />
          </g>
        </g>
      )}
    </g>
  );
}

function BudGlyph({ scale }: { scale: number }) {
  return (
    <g transform={`scale(${scale})`}>
      <path
        d="M0 0 C5 0 9 -1 13 -4"
        fill="none"
        stroke="#75866d"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <g transform="translate(13 -4)">
        <path
          d="M0 0 C-2 -9 3 -16 10 -18 C15 -10 12 -2 4 3 Z"
          fill="#aeb590"
          stroke="#77856d"
          strokeWidth="0.8"
        />
        <path
          d="M2 -2 C6 -6 8 -11 9 -15"
          fill="none"
          stroke="#6f8067"
          strokeWidth="0.7"
        />
      </g>
    </g>
  );
}

function FlowerGlyph({ flower }: { flower: FlowerAttachment }) {
  const colors = flowerPalette[flower.tone];

  return (
    <g transform={`scale(${flower.scale})`}>
      <path
        d="M0 0 C5 0 10 -1 16 -3"
        fill="none"
        stroke="#76886d"
        strokeWidth="1.35"
        strokeLinecap="round"
      />

      <g transform="translate(17 -3)">
        {flower.kind === "daisy" && (
          <>
            {Array.from({ length: 9 }).map((_, index) => (
              <ellipse
                key={index}
                cx="0"
                cy="-10"
                rx="4.6"
                ry="10"
                fill={colors.fill}
                stroke={colors.edge}
                strokeWidth="0.7"
                transform={`rotate(${index * 40})`}
              />
            ))}
            <circle
              cx="0"
              cy="0"
              r="5.2"
              fill={colors.center}
              stroke={colors.edge}
              strokeWidth="0.65"
            />
          </>
        )}

        {flower.kind === "blossom" && (
          <>
            {Array.from({ length: 5 }).map((_, index) => (
              <ellipse
                key={index}
                cx="0"
                cy="-10"
                rx="7"
                ry="11"
                fill={colors.fill}
                stroke={colors.edge}
                strokeWidth="0.7"
                transform={`rotate(${index * 72})`}
              />
            ))}
            <circle
              cx="0"
              cy="0"
              r="4"
              fill={colors.center}
            />
            {Array.from({ length: 5 }).map((_, index) => (
              <circle
                key={index}
                cx="6"
                cy="0"
                r="1.2"
                fill="#f4df9a"
                transform={`rotate(${index * 72})`}
              />
            ))}
          </>
        )}

        {flower.kind === "bell" && (
          <g transform="rotate(18)">
            <path
              d="M-7 -2 C-8 -12 -3 -20 6 -21 C14 -18 18 -10 14 -1 C10 7 4 11 -2 9 C-5 6 -7 2 -7 -2 Z"
              fill={colors.fill}
              stroke={colors.edge}
              strokeWidth="0.85"
            />
            <path
              d="M-2 8 C1 12 5 14 9 11"
              fill="none"
              stroke={colors.edge}
              strokeWidth="1"
              strokeLinecap="round"
            />
            <circle cx="4" cy="5" r="2.3" fill={colors.center} />
          </g>
        )}

        {flower.kind === "star" && (
          <>
            {Array.from({ length: 6 }).map((_, index) => (
              <path
                key={index}
                d="M0 0 C2 -7 4 -13 0 -19 C-4 -13 -2 -7 0 0 Z"
                fill={colors.fill}
                stroke={colors.edge}
                strokeWidth="0.7"
                transform={`rotate(${index * 60})`}
              />
            ))}
            <circle cx="0" cy="0" r="4.4" fill={colors.center} />
          </>
        )}
      </g>
    </g>
  );
}
