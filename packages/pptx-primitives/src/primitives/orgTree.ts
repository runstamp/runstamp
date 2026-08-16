/**
 * orgTree — 2-level hierarchical tree with connector lines.
 *
 * Root node at top-center, N child nodes across the bottom, connector
 * lines drawn from root → horizontal rail → each child. Used for:
 *   - Market taxonomy trees (e.g., "Retail → Goods / Travel / Local")
 *   - Org charts, team hierarchies
 *   - Decomposition diagrams ("Strategy → three pillars")
 *
 * Visual (3 children):
 *
 *               ┌────────────┐
 *               │    Root    │
 *               └─────┬──────┘
 *                     │
 *         ────────────┼─────────────    ← horizontal rail
 *         │           │             │
 *      ┌──┴──┐     ┌──┴──┐       ┌──┴──┐
 *      │ Ch1 │     │ Ch2 │       │ Ch3 │
 *      └─────┘     └─────┘       └─────┘
 *
 * Deeper trees are caller-composed: render each level in its own region
 * (two orgTree calls stacked) rather than recursing here. This keeps
 * the primitive analytical — you can see exactly what it lays out.
 *
 * Tokens consumed:
 *   - palette.foreground (node borders, text), palette.rule (connectors)
 *   - type.title (root + child titles), type.caption (subtitles)
 *   - spacing.sm (internal node padding)
 *
 * Content adaptation:
 *   - Child boxes share equal width; if `minChildWidth` is set and the
 *     per-child budget falls below it, reports `clipped`.
 *   - Node text wraps within its box.
 */

import type { Primitive, PrimitiveResult } from "./primitive.js";
import type { PrimitiveNode, TextNode, ViewNode } from "../layout/index.js";
import type { ResolvedTokens } from "../tokens/schema.js";
import {
  applyTypeTransform,
  estimateLineCount,
  estimateLineHeight,
} from "../util/estimateText.js";

export interface OrgTreeInput {
  root: { title: string; subtitle?: string };
  children: Array<{ title: string; subtitle?: string; accent?: boolean }>;
  /** Ratio of region.height allocated to the root node. Default 0.28. */
  rootHeightRatio?: number;
  /** Minimum child box width in px. Drop children that can't fit. Default 80. */
  minChildWidth?: number;
  /** Gap between children in px. Default spacing.sm. */
  childGap?: number;
  /** Box fill role for root. Default "foreground" (filled dark box with
   *  accentInverse text). Pass "surface" for an outline-only box. */
  rootFill?: "foreground" | "surface";
}

const BOX_PAD = 10;

export const orgTree: Primitive<OrgTreeInput> = (input, tokens, region) => {
  const nodes: PrimitiveNode[] = [];
  if (input.children.length === 0) {
    // Just the root, centered.
    nodes.push(...renderNode(input.root, tokens, {
      left: region.left + region.width / 4,
      top: region.top + region.height / 3,
      width: region.width / 2,
      height: region.height / 3,
    }, input.rootFill ?? "foreground"));
    return { nodes, overflow: { kind: "fit" } };
  }

  const rootHeightRatio = input.rootHeightRatio ?? 0.28;
  const childGap = input.childGap ?? tokens.spacing.sm;
  const minChildWidth = input.minChildWidth ?? 80;

  // Root box — centered, 50% of region width.
  const rootWidth = Math.min(region.width * 0.5, 280);
  const rootTextHeight = measureNodeTextBlockHeight(input.root, tokens, rootWidth - BOX_PAD * 2);
  const rootHeight = Math.min(
    region.height * 0.48,
    Math.max(region.height * rootHeightRatio, rootTextHeight + BOX_PAD * 2),
  );
  const rootLeft = region.left + (region.width - rootWidth) / 2;
  const rootTop = region.top;

  nodes.push(...renderNode(input.root, tokens, {
    left: rootLeft,
    top: rootTop,
    width: rootWidth,
    height: rootHeight,
  }, input.rootFill ?? "foreground"));

  // Child row — occupies bottom portion of region.
  const connectorGap = Math.max(18, region.height * 0.16);
  const childRowTop = Math.min(
    region.top + rootHeight + connectorGap,
    region.top + region.height * 0.62,
  );
  const childRowHeight = region.height - (childRowTop - region.top);
  const totalGap = childGap * (input.children.length - 1);
  const childWidth = (region.width - totalGap) / input.children.length;

  let droppedCount = 0;
  const visibleChildren = [];
  if (childWidth < minChildWidth) {
    const maxChildren = Math.max(1, Math.floor((region.width + childGap) / (minChildWidth + childGap)));
    droppedCount = input.children.length - maxChildren;
    visibleChildren.push(...input.children.slice(0, maxChildren));
  } else {
    visibleChildren.push(...input.children);
  }
  const visibleChildWidth = visibleChildren.length > 0
    ? (region.width - childGap * (visibleChildren.length - 1)) / visibleChildren.length
    : childWidth;

  // Connector rail: vertical segment from root bottom, horizontal rail,
  // vertical segments to each child top.
  const rootBottomY = rootTop + rootHeight;
  const childTopY = childRowTop;
  const railY = rootBottomY + (childTopY - rootBottomY) / 2;
  const rootCenterX = rootLeft + rootWidth / 2;

  // Vertical segment from root bottom to rail.
  nodes.push({
    kind: "view",
    shape: "rect",
    decorative: true,
    zIndex: 0,
    rect: { left: rootCenterX - 0.5, top: rootBottomY, width: 1, height: railY - rootBottomY },
    fill: tokens.palette.rule,
  });

  // Horizontal rail across children. Extend the rail to the outer
  // edges of the first and last child boxes (not just their centers) —
  // that read cleaner than a rail that stops at mid-box.
  const childCenters = visibleChildren.map((_, i) =>
    region.left + i * (visibleChildWidth + childGap) + visibleChildWidth / 2,
  );
  if (childCenters.length > 1) {
    const railLeft = region.left;
    const railRight = region.left + (visibleChildren.length - 1) * (visibleChildWidth + childGap) + visibleChildWidth;
    nodes.push({
      kind: "view",
      shape: "rect",
      decorative: true,
      zIndex: 0,
      rect: { left: railLeft, top: railY - 0.5, width: railRight - railLeft, height: 1 },
      fill: tokens.palette.rule,
    });
  }

  // Vertical segments from rail to each child top.
  for (const cx of childCenters) {
    nodes.push({
      kind: "view",
      shape: "rect",
      decorative: true,
      zIndex: 0,
      rect: { left: cx - 0.5, top: railY, width: 1, height: childTopY - railY },
      fill: tokens.palette.rule,
    });
  }

  // Child boxes.
  for (let i = 0; i < visibleChildren.length; i++) {
    const child = visibleChildren[i];
    const childLeft = region.left + i * (visibleChildWidth + childGap);
    nodes.push(...renderNode(child, tokens, {
      left: childLeft,
      top: childTopY,
      width: visibleChildWidth,
      height: childRowHeight,
    }, "surface", child.accent));
  }

  const overflow: PrimitiveResult["overflow"] = droppedCount > 0
    ? {
        kind: "clipped",
        droppedCount,
        reason: `${droppedCount} child nodes dropped; per-child budget < minChildWidth`,
      }
    : { kind: "fit" };
  return { nodes, overflow };
};

function renderNode(
  node: { title: string; subtitle?: string },
  tokens: ResolvedTokens,
  rect: { left: number; top: number; width: number; height: number },
  fill: "foreground" | "surface",
  accent?: boolean,
): PrimitiveNode[] {
  const isFilled = fill === "foreground";
  const box: ViewNode = {
    kind: "view",
    shape: "rect",
    decorative: false,
    zIndex: 1,
    rect,
    ...(isFilled
      ? { fill: tokens.palette.foreground }
      : { border: { width: 1, color: tokens.palette.foreground, style: "solid" } }),
    children: [],
  };

  // Accent tick on left edge for highlighted child.
  if (accent) {
    box.children!.push({
      kind: "view",
      shape: "rect",
      decorative: true,
      zIndex: 2,
      rect: { left: 0, top: 0, width: 2, height: rect.height },
      fill: tokens.palette.accent,
    });
  }

  const titleRole = tokens.type.title;
  const captionRole = tokens.type.caption;
  const titleSize = chooseTitleSize(node, tokens, rect.width - BOX_PAD * 2, rect.height);
  const titleLineHeight = compactLineHeight(titleSize, titleRole.lineHeight);
  const titleLineHeightPx = estimateLineHeight(titleSize, titleLineHeight, tokens, titleRole.family);
  const titleLines = estimateLineCount({
    content: node.title,
    family: titleRole.family,
    sizePt: titleSize,
    letterSpacing: titleRole.letterSpacing,
    width: rect.width - BOX_PAD * 2,
  }, tokens);
  const titleHeight = titleLineHeightPx * titleLines;
  const subtitleHeight = node.subtitle
    ? estimateLineHeight(captionRole.size, compactLineHeight(captionRole.size, captionRole.lineHeight), tokens, captionRole.family)
    : 0;
  const textBlockHeight = titleHeight + (subtitleHeight > 0 ? tokens.spacing.xs + subtitleHeight : 0);
  const textTop = Math.max(BOX_PAD, (rect.height - textBlockHeight) / 2);

  const titleNode: TextNode = {
    kind: "text",
    zIndex: 2,
    rect: {
      left: BOX_PAD,
      top: textTop,
      width: rect.width - BOX_PAD * 2,
      height: titleHeight,
    },
    content: applyTypeTransform(node.title, titleRole.transform),
    style: {
      family: titleRole.family,
      weight: titleRole.weight,
      size: titleSize,
      lineHeight: titleLineHeight,
      letterSpacing: titleRole.letterSpacing,
      italic: titleRole.italic,
      color: isFilled ? tokens.palette.accentInverse : tokens.palette.foreground,
      align: "center",
      verticalAlign: "top",
    },
    autoFit: false,
  };
  box.children!.push(titleNode);

  if (node.subtitle) {
    const subNode: TextNode = {
      kind: "text",
      zIndex: 2,
      rect: {
        left: BOX_PAD,
        top: textTop + titleHeight + tokens.spacing.xs,
        width: rect.width - BOX_PAD * 2,
        height: subtitleHeight,
      },
      content: applyTypeTransform(node.subtitle, captionRole.transform),
      style: {
        family: captionRole.family,
        weight: captionRole.weight,
        size: captionRole.size,
        lineHeight: compactLineHeight(captionRole.size, captionRole.lineHeight),
        letterSpacing: captionRole.letterSpacing,
        italic: captionRole.italic,
        color: isFilled ? tokens.palette.accentInverse : tokens.palette.muted,
        align: "center",
        verticalAlign: "top",
      },
      autoFit: false,
    };
    box.children!.push(subNode);
  }

  return [box];
}

function compactLineHeight(size: number, requested: number | undefined): number {
  const natural = size * 1.18;
  return requested === undefined ? natural : Math.min(requested, size * 1.32);
}

function measureNodeTextBlockHeight(
  node: { title: string; subtitle?: string },
  tokens: ResolvedTokens,
  innerWidth: number,
): number {
  const titleRole = tokens.type.title;
  const captionRole = tokens.type.caption;
  const titleSize = Math.min(titleRole.size, 15);
  const titleLineHeight = compactLineHeight(titleSize, titleRole.lineHeight);
  const titleLineHeightPx = estimateLineHeight(titleSize, titleLineHeight, tokens, titleRole.family);
  const titleLines = estimateLineCount({
    content: node.title,
    family: titleRole.family,
    sizePt: titleSize,
    letterSpacing: titleRole.letterSpacing,
    width: innerWidth,
  }, tokens);
  const subtitleHeight = node.subtitle
    ? estimateLineHeight(captionRole.size, compactLineHeight(captionRole.size, captionRole.lineHeight), tokens, captionRole.family)
    : 0;
  return titleLineHeightPx * titleLines + (subtitleHeight > 0 ? tokens.spacing.xs + subtitleHeight : 0);
}

function chooseTitleSize(
  node: { title: string; subtitle?: string },
  tokens: ResolvedTokens,
  innerWidth: number,
  boxHeight: number,
): number {
  const titleRole = tokens.type.title;
  const captionRole = tokens.type.caption;
  const subtitleHeight = node.subtitle
    ? estimateLineHeight(captionRole.size, compactLineHeight(captionRole.size, captionRole.lineHeight), tokens, captionRole.family)
    : 0;
  const maxTitleSize = Math.min(titleRole.size, 15);
  const available = Math.max(8, boxHeight - BOX_PAD * 2 - (subtitleHeight > 0 ? tokens.spacing.xs + subtitleHeight : 0));
  for (let size = maxTitleSize; size >= 9; size -= 1) {
    const lineHeight = compactLineHeight(size, titleRole.lineHeight);
    const lineHeightPx = estimateLineHeight(size, lineHeight, tokens, titleRole.family);
    const lines = estimateLineCount({
      content: node.title,
      family: titleRole.family,
      sizePt: size,
      letterSpacing: titleRole.letterSpacing,
      width: innerWidth,
    }, tokens);
    if (lineHeightPx * lines <= available) return size;
  }
  return 9;
}
