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
import type { Rect } from "../layout/index.js";
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
export declare const splitComposition: Primitive<SplitCompositionInput>;
//# sourceMappingURL=splitComposition.d.ts.map