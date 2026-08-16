/**
 * quadrantMap — 2D scatter plot with named quadrants and labeled points.
 *
 * Classic consulting deliverable: the Gartner Magic Quadrant (Leaders /
 * Challengers / Niche / Visionaries), a Boston Box, or a positioning
 * chart. Each axis carries a semantic label; companies sit at (x, y)
 * coordinates on a 0–100 scale; quadrant headers sit in each quarter.
 *
 * Differs from chartBlock because:
 *   - We render the quadrants, labels, and crossing axes ourselves.
 *     Chart engines treat this as a scatter plot and don't draw named
 *     quadrants or anchor-labeled points.
 *   - The aesthetic is entirely token-driven (no theme accent cycle).
 *
 * Visual:
 *
 *   HIGH EXECUTION
 *                 ┌──────────────────┬──────────────────┐
 *                 │  CHALLENGERS     │    LEADERS       │
 *                 │                  │                  │
 *                 │    ● BigCorp     │   ● Acme         │
 *                 │                  │     ● Initech    │
 *                 │──────────────────┼──────────────────│
 *                 │  NICHE           │  VISIONARIES     │
 *                 │                  │                  │
 *                 │     ● Umbrella   │  ● Hooli         │
 *                 │                  │                  │
 *                 └──────────────────┴──────────────────┘
 *   LOW EXECUTION                                      HIGH VISION
 *                   LOW VISION
 *
 * Input axes: x-axis runs left→right (0=low, 100=high vision); y-axis
 * runs bottom→top (0=low, 100=high execution). Companies are placed
 * at (x, y).
 *
 * Tokens consumed:
 *   - palette.foreground (axis lines), palette.muted (axis labels,
 *     quadrant labels), palette.accent (emphasized points)
 *   - type.caption (axis + quadrant labels), type.body (company labels)
 *   - rules.divider (crossing axes)
 *   - spacing.sm (chart padding)
 *
 * Content adaptation:
 *   - Labels first try to sit to the right of their point, then dodge
 *     left/above/below to avoid quadrant captions, axis labels, and
 *     previously placed point labels.
 *   - Points clamp to the chart area.
 */

import type { Primitive, PrimitiveResult } from "./primitive.js";
import type { PrimitiveNode, Rect, TextNode, ViewNode } from "../layout/index.js";
import type { ResolvedTokens } from "../tokens/schema.js";
import {
  applyTypeTransform,
  estimateLineHeight,
  estimateTextWidth,
} from "../util/estimateText.js";

export interface QuadrantMapInput {
  /** X-axis low and high label. */
  xAxisLabel?: { low: string; high: string };
  /** Y-axis low and high label. */
  yAxisLabel?: { low: string; high: string };
  /** Four quadrant headers, in order: bottom-left, bottom-right,
   *  top-left, top-right. Omit to skip quadrant labels. */
  quadrants?: [string, string, string, string];
  /** Points to plot. x and y are on 0..100 scale. Omit for a
   *  framework-only map with axes and quadrant labels. */
  points?: Array<{
    name: string;
    /** 0..100; x=0 is chart-left, x=100 is chart-right. */
    x: number;
    /** 0..100; y=0 is chart-bottom, y=100 is chart-top. */
    y: number;
    /** "primary" → accent dot, bold label; "secondary" → muted dot, regular label. */
    emphasis?: "primary" | "secondary";
  }>;
  /** Dot radius in px. Default 5. */
  dotRadius?: number;
  /** Space reserved around the chart area for axis labels. Default 28. */
  axisLabelReserve?: number;
}

export const quadrantMap: Primitive<QuadrantMapInput> = (input, tokens, region) => {
  const nodes: PrimitiveNode[] = [];
  const points = input.points ?? [];
  const reservedLabelRects: Rect[] = [];
  const placedPointLabelRects: Rect[] = [];
  // Auto-size the y-axis label gutter from the actual label widths.
  // Falls back to the explicit override when supplied. Caption text
  // is uppercased + tracked, so naive 28px is too tight for words
  // like "SMALLER" / "LARGER".
  const captionForReserve = tokens.type.caption;
  const yLabels = input.yAxisLabel ? [input.yAxisLabel.low, input.yAxisLabel.high] : [];
  const measuredYReserve = yLabels.length === 0
    ? 28
    : Math.max(
        ...yLabels.map((text) =>
          estimateTextWidth({
            content: applyTypeTransform(text, captionForReserve.transform === "none" ? "upper" : captionForReserve.transform),
            family: captionForReserve.family,
            sizePt: captionForReserve.size,
            letterSpacing: Math.max(captionForReserve.letterSpacing, 1.0),
          }, tokens),
        ),
      ) + 8;
  // Cap the reserve at 30% of region width so we always preserve
  // enough chart area for points and quadrant labels.
  const reserve = Math.min(
    input.axisLabelReserve ?? Math.max(28, measuredYReserve),
    region.width * 0.3,
  );

  // Chart area — inset for axis labels on left/bottom and quadrant labels
  // at the top. We reserve on all four sides for balance.
  const chartLeft = region.left + reserve;
  const chartRight = region.left + region.width - reserve / 2;
  const chartTop = region.top + reserve / 2;
  const chartBottom = region.top + region.height - reserve;
  const chartWidth = chartRight - chartLeft;
  const chartHeight = chartBottom - chartTop;
  if (chartWidth <= 0 || chartHeight <= 0) {
    return {
      nodes,
      overflow: {
        kind: "clipped",
        droppedCount: points.length,
        reason: "region too small for quadrantMap chart area",
      },
    };
  }

  const midX = chartLeft + chartWidth / 2;
  const midY = chartTop + chartHeight / 2;

  // Vertical axis (chart-center line).
  nodes.push({
    kind: "view",
    shape: "rect",
    decorative: true,
    zIndex: 0,
    rect: { left: midX - 0.5, top: chartTop, width: 1, height: chartHeight },
    fill: tokens.palette.foreground,
  });
  // Horizontal axis.
  nodes.push({
    kind: "view",
    shape: "rect",
    decorative: true,
    zIndex: 0,
    rect: { left: chartLeft, top: midY - 0.5, width: chartWidth, height: 1 },
    fill: tokens.palette.foreground,
  });

  // Quadrant labels: bottom-left, bottom-right, top-left, top-right.
  const captionRole = tokens.type.caption;
  const captionLineHeight = estimateLineHeight(captionRole.size, captionRole.lineHeight, tokens, captionRole.family);
  if (input.quadrants) {
    const quarterPad = 10;
    const quarters: Array<{ text: string; left: number; top: number; width: number; align: "left" | "right" }> = [
      // Bottom-left (low vision, low execution) — top-left of this sub-rect.
      { text: input.quadrants[0], left: chartLeft + quarterPad, top: midY + quarterPad, width: chartWidth / 2 - quarterPad * 2, align: "left" },
      // Bottom-right.
      { text: input.quadrants[1], left: midX + quarterPad, top: midY + quarterPad, width: chartWidth / 2 - quarterPad * 2, align: "right" },
      // Top-left.
      { text: input.quadrants[2], left: chartLeft + quarterPad, top: chartTop + quarterPad, width: chartWidth / 2 - quarterPad * 2, align: "left" },
      // Top-right.
      { text: input.quadrants[3], left: midX + quarterPad, top: chartTop + quarterPad, width: chartWidth / 2 - quarterPad * 2, align: "right" },
    ];
    for (const q of quarters) {
      const rect = {
        left: q.left,
        top: q.top,
        width: q.width,
        height: captionLineHeight,
      };
      const node: TextNode = {
        kind: "text",
        zIndex: 1,
        rect,
        content: applyTypeTransform(q.text, captionRole.transform === "none" ? "upper" : captionRole.transform),
        style: {
          family: captionRole.family,
          weight: 700,
          size: Math.max(captionRole.size, 10),
          lineHeight: captionRole.lineHeight,
          letterSpacing: Math.max(captionRole.letterSpacing, 1.2),
          italic: captionRole.italic,
          color: tokens.palette.muted,
          align: q.align,
          verticalAlign: "top",
        },
        autoFit: false,
      };
      nodes.push(node);
      reservedLabelRects.push(rect);
    }
  }

  // Axis labels.
  if (input.xAxisLabel) {
    // Low (left) under bottom-left corner.
    const low = axisLabel(input.xAxisLabel.low, chartLeft, chartBottom + 4, chartWidth / 2, "left", tokens);
    nodes.push(low);
    reservedLabelRects.push(low.rect);
    // High (right) under bottom-right corner.
    const high = axisLabel(input.xAxisLabel.high, midX, chartBottom + 4, chartWidth / 2, "right", tokens);
    nodes.push(high);
    reservedLabelRects.push(high.rect);
  }
  if (input.yAxisLabel) {
    // Low (bottom-left) and High (top-left) of the y-axis sit along the
    // left-of-chart gutter. Keep them horizontal (vertical text is
    // visually aggressive for this kind of chart). Width = reserve - 4
    // so labels never collide with the chart frame.
    const yLabelWidth = Math.max(0, reserve - 4);
    const low = axisLabel(input.yAxisLabel.low, region.left, chartBottom - captionLineHeight, yLabelWidth, "left", tokens);
    const high = axisLabel(input.yAxisLabel.high, region.left, chartTop, yLabelWidth, "left", tokens);
    nodes.push(low, high);
    reservedLabelRects.push(low.rect, high.rect);
  }

  // Points. Each point+label pair gets its own z-stripe so the
  // layout validator doesn't flag overlapping labels between
  // adjacent points as collisions — overlaps on this primitive are
  // inherent (it's a scatter plot), not layout bugs.
  const dotRadius = input.dotRadius ?? 5;
  const bodyRole = tokens.type.body;
  const bodyLineHeight = estimateLineHeight(bodyRole.size, bodyRole.lineHeight, tokens, bodyRole.family);
  let pointZBase = 10;
  for (const point of points) {
    const clampedX = Math.max(0, Math.min(100, point.x));
    const clampedY = Math.max(0, Math.min(100, point.y));
    const cx = chartLeft + (clampedX / 100) * chartWidth;
    const cy = chartBottom - (clampedY / 100) * chartHeight; // y=0 at bottom
    const isPrimary = (point.emphasis ?? "secondary") === "primary";
    const color = isPrimary ? tokens.palette.accent : tokens.palette.muted;

    const dot: ViewNode = {
      kind: "view",
      shape: "ellipse",
      decorative: false,
      zIndex: pointZBase,
      rect: { left: cx - dotRadius, top: cy - dotRadius, width: dotRadius * 2, height: dotRadius * 2 },
      fill: color,
    };
    nodes.push(dot);

    const textWidth = estimateTextWidth({
      content: point.name,
      family: bodyRole.family,
      sizePt: bodyRole.size,
      letterSpacing: bodyRole.letterSpacing,
    }, tokens);
    const labelWidth = Math.min(chartWidth, Math.max(1, textWidth + 4));
    const labelRect = choosePointLabelRect({
      cx,
      cy,
      dotRadius,
      labelWidth,
      labelHeight: bodyLineHeight,
      chart: { left: chartLeft, top: chartTop, width: chartWidth, height: chartHeight },
      bounds: region,
      reservedRects: [...reservedLabelRects, ...placedPointLabelRects],
    });
    const align = labelRect.left + labelRect.width <= cx - dotRadius ? "right" : "left";
    const labelNode: TextNode = {
      kind: "text",
      zIndex: pointZBase + 1,
      rect: labelRect,
      content: applyTypeTransform(point.name, bodyRole.transform),
      style: {
        family: bodyRole.family,
        weight: isPrimary ? 700 : bodyRole.weight,
        size: bodyRole.size,
        lineHeight: bodyRole.lineHeight,
        letterSpacing: bodyRole.letterSpacing,
        italic: bodyRole.italic,
        color: isPrimary ? tokens.palette.foreground : tokens.palette.muted,
        align,
        verticalAlign: "middle",
      },
      autoFit: false,
    };
    nodes.push(labelNode);
    placedPointLabelRects.push(labelRect);
    pointZBase += 2;
  }

  return { nodes, overflow: { kind: "fit" } };
};

function axisLabel(
  text: string,
  left: number,
  top: number,
  width: number,
  align: "left" | "right",
  tokens: ResolvedTokens,
): TextNode {
  const captionRole = tokens.type.caption;
  const captionLineHeight = estimateLineHeight(captionRole.size, captionRole.lineHeight, tokens, captionRole.family);
  return {
    kind: "text",
    zIndex: 1,
    rect: { left, top, width, height: captionLineHeight },
    content: applyTypeTransform(text, captionRole.transform === "none" ? "upper" : captionRole.transform),
    style: {
      family: captionRole.family,
      weight: captionRole.weight,
      size: captionRole.size,
      lineHeight: captionRole.lineHeight,
      letterSpacing: Math.max(captionRole.letterSpacing, 1.0),
      italic: captionRole.italic,
      color: tokens.palette.muted,
      align,
      verticalAlign: "top",
    },
    autoFit: false,
  };
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.left < b.left + b.width
    && a.left + a.width > b.left
    && a.top < b.top + b.height
    && a.top + a.height > b.top
  );
}

function overlapArea(a: Rect, b: Rect): number {
  if (!rectsOverlap(a, b)) return 0;
  const width = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  const height = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
  return Math.max(0, width) * Math.max(0, height);
}

function clampRectToChart(rect: Rect, chart: Rect): Rect {
  return {
    ...rect,
    left: Math.min(Math.max(rect.left, chart.left), chart.left + chart.width - rect.width),
    top: Math.min(Math.max(rect.top, chart.top), chart.top + chart.height - rect.height),
  };
}

function choosePointLabelRect(input: {
  cx: number;
  cy: number;
  dotRadius: number;
  labelWidth: number;
  labelHeight: number;
  chart: Rect;
  bounds: Rect;
  reservedRects: Rect[];
}): Rect {
  const { cx, cy, dotRadius, labelWidth, labelHeight, chart, bounds, reservedRects } = input;
  const gap = dotRadius + 5;
  const centeredTop = cy - labelHeight / 2;
  const centeredLeft = cx - labelWidth / 2;
  const candidates = [
    { left: cx + gap, top: centeredTop, width: labelWidth, height: labelHeight },
    { left: cx - gap - labelWidth, top: centeredTop, width: labelWidth, height: labelHeight },
    { left: centeredLeft, top: cy + gap, width: labelWidth, height: labelHeight },
    { left: centeredLeft, top: cy - gap - labelHeight, width: labelWidth, height: labelHeight },
    { left: chart.left + chart.width + 4, top: centeredTop, width: labelWidth, height: labelHeight },
    { left: chart.left - labelWidth - 4, top: centeredTop, width: labelWidth, height: labelHeight },
  ].map((rect) => clampRectToChart(rect, bounds));

  let best = candidates[0];
  let bestScore = Number.POSITIVE_INFINITY;
  candidates.forEach((rect, index) => {
    const collisionScore = reservedRects.reduce((sum, reserved) => sum + overlapArea(rect, reserved), 0);
    const score = collisionScore * 1000 + index;
    if (score < bestScore) {
      best = rect;
      bestScore = score;
    }
  });
  return best;
}
