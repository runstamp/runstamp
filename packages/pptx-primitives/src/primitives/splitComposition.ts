/**
 * splitComposition — two-panel slide at a configurable ratio.
 *
 * This is LG's bread-and-butter composition (photo ↔ italic-serif body
 * panel at 50/50 or 60/40). The primitive takes two child-region callers
 * that each emit PrimitiveNode[] for their panel; splitComposition itself
 * only computes the two regions and concatenates.
 *
 * Why a callback, not nested primitive calls? Because different callers
 * combine different primitives per panel:
 *   - Bain rare case: table on the left, chart on the right.
 *   - LG title: imageBleed on one side, titleBlock + ribbon label on the
 *     other.
 *   - Editorial scope: imageBleed right, paragraphs + titleBlock left.
 *
 * The panel callbacks receive their own region and the full tokens. They
 * return PrimitiveResult so overflow bubbles up — if either panel overflows,
 * the split reports the worst-case.
 *
 * Directionality: `orientation = "horizontal"` splits left|right (default).
 * `"vertical"` splits top|bottom.
 */

import type { Primitive, PrimitiveResult } from "./primitive.js";
import type { PrimitiveNode, Rect } from "../layout/index.js";
import type { ResolvedTokens } from "../tokens/schema.js";

export interface SplitCompositionInput {
  /** Fraction [0–1] of the region the first panel consumes. */
  ratio?: number;
  /** Axis. Horizontal = left|right split. Vertical = top|bottom. */
  orientation?: "horizontal" | "vertical";
  /** Gap between panels (px). 0 = flush. */
  gap?: number;
  /** Left or top panel builder. Receives its region + tokens. */
  first: (region: Rect, tokens: ResolvedTokens) => PrimitiveResult;
  /** Right or bottom panel builder. */
  second: (region: Rect, tokens: ResolvedTokens) => PrimitiveResult;
}

export const splitComposition: Primitive<SplitCompositionInput> = (input, tokens, region) => {
  const ratio = clamp01(input.ratio ?? 0.5);
  const orientation = input.orientation ?? "horizontal";
  const gap = input.gap ?? 0;

  const [firstRegion, secondRegion] =
    orientation === "horizontal"
      ? splitHorizontal(region, ratio, gap)
      : splitVertical(region, ratio, gap);

  const firstResult = input.first(firstRegion, tokens);
  const secondResult = input.second(secondRegion, tokens);

  const nodes: PrimitiveNode[] = [...firstResult.nodes, ...secondResult.nodes];

  // Worst-case overflow: clipped > paginated > compressed > fit.
  const overflow = worstOverflow(firstResult.overflow, secondResult.overflow);

  return { nodes, overflow };
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function splitHorizontal(r: Rect, ratio: number, gap: number): [Rect, Rect] {
  const firstW = Math.max(0, r.width * ratio - gap / 2);
  const secondW = Math.max(0, r.width - firstW - gap);
  return [
    { left: r.left, top: r.top, width: firstW, height: r.height },
    { left: r.left + firstW + gap, top: r.top, width: secondW, height: r.height },
  ];
}

function splitVertical(r: Rect, ratio: number, gap: number): [Rect, Rect] {
  const firstH = Math.max(0, r.height * ratio - gap / 2);
  const secondH = Math.max(0, r.height - firstH - gap);
  return [
    { left: r.left, top: r.top, width: r.width, height: firstH },
    { left: r.left, top: r.top + firstH + gap, width: r.width, height: secondH },
  ];
}

type Overflow = PrimitiveResult["overflow"];

function overflowRank(o: Overflow): number {
  switch (o.kind) {
    case "fit": return 0;
    case "compressed": return 1;
    case "paginated": return 2;
    case "clipped": return 3;
  }
}

function worstOverflow(a: Overflow, b: Overflow): Overflow {
  return overflowRank(a) >= overflowRank(b) ? a : b;
}
