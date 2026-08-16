// src/minRegion.ts — Per-primitive minimum region sizes (12×12 grid, 16:9, default tokens)
//
// These are the empirical floors that the layout-safety pass uses to populate
// `actual` / `minimum` / `remediation` on REGION_TOO_SMALL errors. Values come
// from real-world deck rendering; primitives that grow with content (e.g.
// metricStack scales with metric count) are exposed as functions.
//
// **Not** an authoritative engine constraint — the layout pass still runs and
// will paginate/clip if content overflows. These are the recommended starting
// points an LLM or template author should use before iterating.

import type { CompositionPrimitiveName } from "./composition.js";

export interface RegionSize {
  colSpan: number;
  rowSpan: number;
}

/**
 * Static minimum-region floor. Use {@link minRegionFor} to look up a primitive
 * with optional content-count context (n metrics, n rows, etc.).
 */
export const MIN_REGION_STATIC: Partial<Record<CompositionPrimitiveName, RegionSize>> = {
  titleBlock:     { colSpan: 6, rowSpan: 2 },
  bulletList:     { colSpan: 4, rowSpan: 2 },
  sectionRibbon:  { colSpan: 6, rowSpan: 1 },
  sectionTag:     { colSpan: 2, rowSpan: 1 },
  sourceLine:     { colSpan: 6, rowSpan: 1 },
  textBlock:      { colSpan: 4, rowSpan: 2 },
  calloutBox:     { colSpan: 4, rowSpan: 3 },
  bannerBand:     { colSpan: 12, rowSpan: 2 },
  kpiHero:        { colSpan: 5, rowSpan: 5 },
  comparisonBand: { colSpan: 8, rowSpan: 4 },
  stepTimeline:   { colSpan: 8, rowSpan: 4 },
  waterfallBars:  { colSpan: 8, rowSpan: 5 },
  orgTree:        { colSpan: 8, rowSpan: 6 },
  tombstoneStack: { colSpan: 6, rowSpan: 4 },
  tocTiles:       { colSpan: 8, rowSpan: 4 },
  chartBlock:     { colSpan: 6, rowSpan: 6 },
  quadrantMap:    { colSpan: 6, rowSpan: 6 },
  harveyBall:     { colSpan: 1, rowSpan: 1 },
  chevronArrow:   { colSpan: 4, rowSpan: 2 },
  numberedChip:   { colSpan: 1, rowSpan: 1 },
  diagonalStamp:  { colSpan: 4, rowSpan: 3 },
  legendTable:    { colSpan: 4, rowSpan: 3 },
  pageStamp:      { colSpan: 2, rowSpan: 1 },
};

/**
 * Variable minimum sizes — primitives whose floor depends on content count.
 * `n` is the relevant content count (metrics in a stack, rows in a table,
 * body items in a card, comparison items, steps in a timeline, etc.).
 */
export const MIN_REGION_VARIABLE = {
  metricStack:   (n: number): RegionSize => ({ colSpan: 4, rowSpan: Math.max(2, n + 1) }),
  infoCard:      (bodyItems: number): RegionSize => ({ colSpan: 4, rowSpan: Math.max(6, bodyItems + 4) }),
  matrixTable:   (rows: number, anyCellWraps = false): RegionSize => ({
    colSpan: 12,
    rowSpan: (anyCellWraps ? rows * 2 : rows) + 2,
  }),
} as const;

/**
 * Look up the minimum region for a primitive. Pass `n` (or rows/anyCellWraps
 * for matrixTable) when the primitive's floor scales with content count;
 * otherwise the static floor is returned.
 *
 * Returns null for primitives with no defined floor (`imageBleed`,
 * `connectorLine`, `groupBorder`, `container`).
 */
export function minRegionFor(
  primitive: string,
  context?: { n?: number; anyCellWraps?: boolean },
): RegionSize | null {
  if (primitive === "metricStack") {
    return MIN_REGION_VARIABLE.metricStack(context?.n ?? 3);
  }
  if (primitive === "infoCard") {
    return MIN_REGION_VARIABLE.infoCard(context?.n ?? 2);
  }
  if (primitive === "matrixTable") {
    return MIN_REGION_VARIABLE.matrixTable(context?.n ?? 4, context?.anyCellWraps ?? false);
  }
  const fixed = MIN_REGION_STATIC[primitive as CompositionPrimitiveName];
  return fixed ?? null;
}

/**
 * Build a one-line remediation hint for a REGION_TOO_SMALL error. Used by
 * the layout safety pass to populate PaperErrorIssue.remediation.
 */
export function remediationFor(
  primitive: string,
  actual: { colSpan?: number; rowSpan?: number },
  minimum: RegionSize,
): string {
  const parts: string[] = [];
  if (actual.colSpan !== undefined && actual.colSpan < minimum.colSpan) {
    parts.push(`grow colSpan to ${minimum.colSpan}`);
  }
  if (actual.rowSpan !== undefined && actual.rowSpan < minimum.rowSpan) {
    parts.push(`grow rowSpan to ${minimum.rowSpan}`);
  }
  if (parts.length === 0) {
    return `Reduce content density in this ${primitive}, or split into multiple blocks.`;
  }
  return `${parts.join(" and ")} (current ${actual.colSpan ?? "?"}×${actual.rowSpan ?? "?"}, recommended floor ${minimum.colSpan}×${minimum.rowSpan}).`;
}
