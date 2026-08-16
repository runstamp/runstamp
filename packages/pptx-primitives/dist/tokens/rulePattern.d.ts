/**
 * Rule-pattern grammar.
 *
 * A compound rule is a sequence of one or more ruled lines stacked
 * vertically, separated by a gap. The grammar supports the two canonical
 * cases we need to express:
 *
 *   "1px solid #E5E5E5"                           single hairline
 *   "2px solid #000"                              single thick rule
 *   "3px solid #DA291C + 1px solid #CCCCCC gap:1" stacked pair (Bain bar)
 *   "1px solid token:rule"                        color resolved from palette
 *   "none"                                        no rule
 *
 * Grammar:
 *
 *   pattern   = "none" | line ( ws "+" ws line )* ( ws "gap:" number )?
 *   line      = width ws style ws color
 *   width     = number "px"
 *   style     = "solid" | "dashed" | "dotted"
 *   color     = hex | "token:" <roleName>
 *
 * Colors may reference palette roles via "token:<role>" (e.g.,
 * "token:rule", "token:accent"). Primitives resolve these at render time
 * by looking up the ResolvedTokens.palette.
 */
import type { ResolvedTokens } from "./schema.js";
export interface ParsedRuleLine {
    width: number;
    style: "solid" | "dashed" | "dotted";
    color: string;
}
export interface ParsedRulePattern {
    lines: ParsedRuleLine[];
    /** Gap between stacked lines, in px. Ignored for single-line patterns. */
    gap: number;
    /** Total vertical height consumed by the pattern (sum of widths + gaps). */
    totalHeight: number;
}
/** Thrown when a rule pattern is malformed. Callers MUST surface this;
 *  silent fallback to `none` would hide real authoring errors. */
export declare class RulePatternError extends Error {
    readonly pattern: string;
    constructor(message: string, pattern: string);
}
/**
 * Parse a rule pattern string against a resolved palette.
 *
 * Returns `null` for `"none"` (so callers can skip rendering) rather than
 * throwing — "none" is a valid, expected value.
 */
export declare function parseRulePattern(pattern: string, palette: ResolvedTokens["palette"]): ParsedRulePattern | null;
//# sourceMappingURL=rulePattern.d.ts.map