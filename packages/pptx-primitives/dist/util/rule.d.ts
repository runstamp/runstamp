/**
 * Shared helper: emit PrimitiveNode[] for a parsed rule pattern as stacked
 * horizontal hairlines at a given (left, top, width).
 *
 * Used by titleBlock, sectionRibbon, footerChrome, and any other primitive
 * that hosts rule patterns. Returns [] for `"none"` patterns so callers can
 * always splice the result unconditionally.
 */
import type { PrimitiveNode } from "../layout/index.js";
import type { ResolvedTokens } from "../tokens/schema.js";
export interface RuleEmissionResult {
    nodes: PrimitiveNode[];
    /** Total height consumed (px). 0 if pattern is `none`. */
    consumedHeight: number;
}
export declare function emitHorizontalRule(pattern: string, palette: ResolvedTokens["palette"], left: number, top: number, width: number): RuleEmissionResult;
//# sourceMappingURL=rule.d.ts.map